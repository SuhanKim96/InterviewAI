import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import Session, Question, Answer
from schemas import (
    SessionCreate, SessionResponse, SessionListItem,
    SessionStartRequest, StartResponse, TurnQuestion,
    TurnRequest, TurnResponse, AnswerResponse,
    ReportResponse, AnswerSummary, ScoreTrendPoint,
)
from services import session_manager, interview_graph, question_gen

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionResponse)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)):
    session = Session(company=body.company, role=body.role, jd_text=body.jd_text)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionResponse(session_id=session.id)


@router.get("", response_model=list[SessionListItem])
async def list_sessions(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Session).order_by(Session.created_at.desc()))
    sessions = result.scalars().all()
    return [
        SessionListItem(id=s.id, company=s.company, role=s.role, created_at=s.created_at, status=s.status or "active")
        for s in sessions
    ]


@router.post("/{session_id}/start", response_model=StartResponse)
async def start_session(session_id: int, body: SessionStartRequest, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    existing = await db.execute(
        select(func.count(Question.id))
        .where(Question.session_id == session_id)
        .where(Question.sequence.is_not(None))
    )
    if (existing.scalar() or 0) > 0:
        raise HTTPException(status_code=409, detail="이미 시작된 세션입니다.")

    total_planned = body.count * len(body.types)
    session.difficulty = body.difficulty
    session.types_json = json.dumps(body.types)
    session.total_planned = total_planned
    session.language = body.language
    await db.flush()

    first_category = body.types[0]
    result = await question_gen.generate(
        jd_text=session.jd_text,
        company=session.company or "",
        role=session.role or "",
        difficulty=body.difficulty,
        types=[first_category],
        count=1,
        conversation_history="",
        language=body.language or "ko",
    )

    q_data = (result.get(first_category) or [])
    if not q_data:
        # fallback: try the other key
        for v in result.values():
            if v:
                q_data = v
                break
    if not q_data:
        raise HTTPException(status_code=500, detail="질문 생성에 실패했습니다.")

    qd = q_data[0]
    question = Question(
        session_id=session_id,
        category=first_category,
        question=qd["question"],
        intent=qd.get("intent"),
        related_to=qd.get("related_to"),
        sequence=1,
    )
    db.add(question)
    await db.commit()
    await db.refresh(question)

    return StartResponse(
        question=TurnQuestion(
            id=question.id,
            sequence=question.sequence,
            category=question.category,
            question=question.question,
            intent=question.intent,
            related_to=question.related_to,
        ),
        total_planned=total_planned,
    )


@router.post("/{session_id}/turn", response_model=TurnResponse)
async def submit_turn(session_id: int, body: TurnRequest, db: AsyncSession = Depends(get_db)):
    # ── DB 로드 ──────────────────────────────────────────────────────────────
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="이미 완료된 세션입니다.")

    result = await db.execute(
        select(Question)
        .where(Question.session_id == session_id)
        .where(Question.sequence.is_not(None))
        .order_by(Question.sequence.desc())
        .limit(1)
    )
    current_q = result.scalar_one_or_none()
    if not current_q:
        raise HTTPException(status_code=409, detail="먼저 /start로 세션을 시작하세요.")

    if (await db.execute(select(Answer).where(Answer.question_id == current_q.id).limit(1))).scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 답변된 질문입니다.")

    # ── 그래프 실행 ───────────────────────────────────────────────────────────
    try:
        eval_result, next_q_data, session_complete = await interview_graph.run_turn(
            session=session, current_q=current_q,
            answer_text=body.answer_text, db=db,
            language=session.language or "ko",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"그래프 실행 오류: {e}")

    # ── DB 저장 ──────────────────────────────────────────────────────────────
    answer = Answer(
        question_id=current_q.id,
        answer_text=body.answer_text,
        score_clarity=eval_result.get("score_clarity"),
        score_specific=eval_result.get("score_specific"),
        score_technical=eval_result.get("score_technical"),
        strengths=eval_result.get("strengths"),
        weaknesses=eval_result.get("weaknesses"),
        improved_answer=eval_result.get("improved_answer"),
        follow_up=eval_result.get("follow_up"),
        rubric_basis=eval_result.get("rubric_basis"),
    )
    db.add(answer)
    await db.flush()
    await db.refresh(answer)

    evaluation_response = AnswerResponse(
        id=answer.id,
        score_clarity=answer.score_clarity,
        score_specific=answer.score_specific,
        score_technical=answer.score_technical,
        strengths=answer.strengths,
        weaknesses=answer.weaknesses,
        improved_answer=answer.improved_answer,
        follow_up=answer.follow_up,
        rubric_basis=answer.rubric_basis,
    )

    if session_complete or not next_q_data:
        await db.commit()
        return TurnResponse(evaluation=evaluation_response, next_question=None, session_complete=True)

    next_seq = await session_manager.get_next_sequence(session_id, db)
    next_question = Question(
        session_id=session_id,
        category=next_q_data["category"],
        question=next_q_data["question"],
        intent=next_q_data.get("intent"),
        related_to=next_q_data.get("related_to"),
        sequence=next_seq,
    )
    db.add(next_question)
    await db.commit()
    await db.refresh(next_question)

    return TurnResponse(
        evaluation=evaluation_response,
        next_question=TurnQuestion(
            id=next_question.id,
            sequence=next_question.sequence,
            category=next_question.category,
            question=next_question.question,
            intent=next_question.intent,
            related_to=next_question.related_to,
        ),
        session_complete=False,
    )


@router.post("/{session_id}/finish", response_model=ReportResponse)
async def finish_session(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    if session.status == "completed":
        raise HTTPException(status_code=409, detail="이미 완료된 세션입니다.")

    summary = await session_manager.generate_report_summary(session_id, db, session.company, session.role)
    session.status = "completed"
    session.summary = summary
    await db.commit()

    return await _build_report_response(session, db)


@router.get("/{session_id}/report", response_model=ReportResponse)
async def get_report(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    return await _build_report_response(session, db)


async def _build_report_response(session: Session, db: AsyncSession) -> ReportResponse:
    result = await db.execute(
        select(Answer, Question)
        .join(Question, Answer.question_id == Question.id)
        .where(Question.session_id == session.id)
        .order_by(Answer.created_at)
    )
    rows = result.all()

    answers: list[AnswerSummary] = []
    score_trend: list[ScoreTrendPoint] = []

    for i, (answer, question) in enumerate(rows):
        scores = [s for s in [answer.score_clarity, answer.score_specific, answer.score_technical] if s is not None]
        overall = round(sum(scores) / len(scores), 2) if scores else None

        answers.append(AnswerSummary(
            id=answer.id,
            question=question.question,
            category=question.category,
            score_clarity=answer.score_clarity,
            score_specific=answer.score_specific,
            score_technical=answer.score_technical,
            overall=overall,
            created_at=answer.created_at,
        ))
        score_trend.append(ScoreTrendPoint(
            label=f"Q{i + 1}",
            clarity=float(answer.score_clarity) if answer.score_clarity is not None else None,
            specific=float(answer.score_specific) if answer.score_specific is not None else None,
            technical=float(answer.score_technical) if answer.score_technical is not None else None,
            overall=overall,
            category=question.category,
        ))

    weak_area: str | None = None

    return ReportResponse(
        session_id=session.id,
        company=session.company,
        role=session.role,
        status=session.status or "active",
        summary=session.summary,
        answers=answers,
        score_trend=score_trend,
        weak_area=weak_area,
    )
