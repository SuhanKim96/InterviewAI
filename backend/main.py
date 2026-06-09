from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from db import engine, Base
from schemas import HealthResponse
from routes import documents, sessions, questions, answers, history
import models  # noqa: F401 — registers ORM models with Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE answers ADD COLUMN IF NOT EXISTS follow_up TEXT"))
        await conn.execute(text("ALTER TABLE answers ADD COLUMN IF NOT EXISTS rubric_basis TEXT"))
    yield


app = FastAPI(title="Interview Coach API", lifespan=lifespan)
app.include_router(documents.router)
app.include_router(sessions.router)
app.include_router(questions.router)
app.include_router(answers.router)
app.include_router(history.router)


@app.get("/health", response_model=HealthResponse)
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "ok", "db": f"error: {e}"}
