from datetime import datetime
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    db: str


class ErrorResponse(BaseModel):
    detail: str


class DocumentResponse(BaseModel):
    indexed_chunks: int
    indexed_files: list[str]
    github_repos: list[str]


class DocumentSource(BaseModel):
    source: str
    name: str


class DocumentListResponse(BaseModel):
    sources: list[DocumentSource]
    total_chunks: int


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
    status: str = "active"


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


class AnswerSummary(BaseModel):
    id: int
    question: str
    category: str | None
    answer_text: str | None = None
    score_clarity: int | None
    score_specific: int | None
    score_technical: int | None
    overall: float | None = None
    created_at: datetime


class ScoreTrendPoint(BaseModel):
    label: str
    clarity: float | None
    specific: float | None
    technical: float | None
    overall: float | None = None
    category: str | None = None


class HistoryResponse(BaseModel):
    answers: list[AnswerSummary]
    score_trend: list[ScoreTrendPoint]
    weak_area: str | None
    summary: str | None = None
    company: str | None = None
    role: str | None = None


class FollowUpRequest(BaseModel):
    original_question: str
    follow_up_question: str
    answer_text: str


class FollowUpResponse(BaseModel):
    comment: str


class AskRequest(BaseModel):
    session_id: int
    question: str
    current_interview_question: str = ""


class AskResponse(BaseModel):
    answer: str


# ── Stage A: 세션 턴 기반 면접 ────────────────────────────────

class SessionStartRequest(BaseModel):
    difficulty: str = "주니어"
    types: list[str] = ["technical", "experience"]
    count: int = 3
    language: str = "ko"


class TurnQuestion(BaseModel):
    id: int
    sequence: int
    category: str | None
    question: str
    intent: str | None
    related_to: str | None


class StartResponse(BaseModel):
    question: TurnQuestion
    total_planned: int


class TurnRequest(BaseModel):
    answer_text: str


class TurnResponse(BaseModel):
    evaluation: AnswerResponse
    next_question: TurnQuestion | None
    session_complete: bool


class ReportResponse(BaseModel):
    session_id: int
    company: str | None
    role: str | None
    status: str
    summary: str | None
    answers: list[AnswerSummary]
    score_trend: list[ScoreTrendPoint]
    weak_area: str | None
