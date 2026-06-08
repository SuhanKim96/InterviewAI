from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import Question, Answer
from schemas import AnswerRequest, AnswerResponse
from services import evaluator

router = APIRouter(prefix="/answers", tags=["answers"])


@router.post("", response_model=AnswerResponse)
async def create_answer(body: AnswerRequest, db: AsyncSession = Depends(get_db)):
    question = await db.get(Question, body.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="질문을 찾을 수 없습니다.")

    try:
        result = await evaluator.evaluate(
            question=question.question,
            answer_text=body.answer_text,
            category=question.category or "experience",
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    answer = Answer(
        question_id=question.id,
        answer_text=body.answer_text,
        score_clarity=result.get("score_clarity"),
        score_specific=result.get("score_specific"),
        score_technical=result.get("score_technical"),
        strengths=result.get("strengths"),
        weaknesses=result.get("weaknesses"),
        improved_answer=result.get("improved_answer"),
        follow_up=result.get("follow_up") or "",
        rubric_basis=result.get("rubric_basis"),
    )
    db.add(answer)
    await db.commit()
    await db.refresh(answer)

    return AnswerResponse(
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
