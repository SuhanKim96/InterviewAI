from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from db import engine, Base
from schemas import HealthResponse
import models  # noqa: F401 — registers ORM models with Base


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Interview Coach API", lifespan=lifespan)


@app.get("/health", response_model=HealthResponse)
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "ok", "db": f"error: {e}"}
