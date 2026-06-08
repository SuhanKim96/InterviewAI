from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    db: str


class ErrorResponse(BaseModel):
    detail: str


class DocumentResponse(BaseModel):
    indexed_chunks: int
    github_repos: list[str]
