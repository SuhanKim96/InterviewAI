from datetime import datetime
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    db: str


class ErrorResponse(BaseModel):
    detail: str


class DocumentResponse(BaseModel):
    indexed_chunks: int
    github_repos: list[str]


class SessionCreate(BaseModel):
    company: str | None = None
    role: str | None = None
    jd_text: str


class SessionResponse(BaseModel):
    session_id: int


class SessionListItem(BaseModel):
    id: int
    company: str | None
    role: str | None
    created_at: datetime


class QuestionItem(BaseModel):
    id: int
    question: str
    intent: str | None
    related_to: str | None


class QuestionRequest(BaseModel):
    session_id: int
    difficulty: str = "주니어"
    types: list[str] = ["technical", "experience"]
    count: int = 3


class QuestionResponse(BaseModel):
    technical: list[QuestionItem]
    experience: list[QuestionItem]


class AnswerRequest(BaseModel):
    question_id: int
    answer_text: str


class AnswerResponse(BaseModel):
    id: int
    score_clarity: int | None
    score_specific: int | None
    score_technical: int | None
    strengths: str | None
    weaknesses: str | None
    improved_answer: str | None
    follow_up: str | None
    rubric_basis: str | None
