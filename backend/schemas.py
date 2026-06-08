from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    db: str


class ErrorResponse(BaseModel):
    detail: str
