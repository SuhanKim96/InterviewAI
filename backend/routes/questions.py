from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import Session, Question
from schemas import QuestionRequest, QuestionResponse, QuestionItem
from services import question_gen

router = APIRouter(prefix="/questions", tags=["questions"])


@router.post("", response_model=QuestionResponse)
async def create_questions(body: QuestionRequest, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    try:
        generated = await question_gen.generate(
            jd_text=session.jd_text,
            company=session.company or "",
            role=session.role or "",
            difficulty=body.difficulty,
            types=body.types,
            count=body.count,
        )
    except ValueError as e:
        raise HTTPException(status_code=502, detail=str(e))

    technical: list[QuestionItem] = []
    experience: list[QuestionItem] = []

    for category, items in [("technical", generated.get("technical", [])),
                             ("experience", generated.get("experience", []))]:
        for item in items:
            q = Question(
                session_id=session.id,
                category=category,
                question=item.get("question", ""),
                intent=item.get("intent"),
                related_to=item.get("related_to"),
            )
            db.add(q)
            await db.flush()
            qi = QuestionItem(id=q.id, question=q.question, intent=q.intent, related_to=q.related_to)
            if category == "technical":
                technical.append(qi)
            else:
                experience.append(qi)

    await db.commit()
    return QuestionResponse(technical=technical, experience=experience)
