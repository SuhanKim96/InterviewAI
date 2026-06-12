from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import Session, Question, Answer
from schemas import HistoryResponse, AnswerSummary, ScoreTrendPoint

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=HistoryResponse)
async def get_history(session_id: int, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    result = await db.execute(
        select(Answer, Question)
        .join(Question, Answer.question_id == Question.id)
        .where(Question.session_id == session_id)
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
            answer_text=answer.answer_text,
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

    return HistoryResponse(
        answers=answers,
        score_trend=score_trend,
        weak_area=weak_area,
        summary=session.summary,
        company=session.company,
        role=session.role,
    )
