from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_db
from models import Session
from schemas import SessionCreate, SessionResponse, SessionListItem

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
    return [SessionListItem(id=s.id, company=s.company, role=s.role, created_at=s.created_at) for s in sessions]
