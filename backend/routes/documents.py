from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Annotated

from schemas import DocumentResponse
from services import pdf_parser, github_fetch, rag
from config import settings

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse)
async def index_documents(
    resume_pdf: Annotated[UploadFile | None, File()] = None,
    portfolio_text: Annotated[str | None, Form()] = None,
):
    if not resume_pdf and not portfolio_text:
        raise HTTPException(status_code=400, detail="resume_pdf 또는 portfolio_text 중 하나는 필요합니다.")

    total_chunks = 0
    combined_text = ""

    if resume_pdf:
        try:
            file_bytes = await resume_pdf.read()
            resume_text = pdf_parser.extract_text(file_bytes)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        combined_text += resume_text + "\n"
        total_chunks += rag.index_documents(resume_text, source="resume")

    if portfolio_text:
        combined_text += portfolio_text + "\n"
        total_chunks += rag.index_documents(portfolio_text, source="portfolio")

    github_urls = github_fetch.extract_github_urls(combined_text)
    indexed_repos: list[str] = []
    for owner, repo in github_urls:
        try:
            chunk = github_fetch.fetch_repo_chunk(owner, repo, token=settings.github_token)
            if chunk:
                total_chunks += rag.index_documents(chunk, source="github", name=f"{owner}/{repo}")
                indexed_repos.append(f"{owner}/{repo}")
        except RuntimeError:
            pass

    return DocumentResponse(indexed_chunks=total_chunks, github_repos=indexed_repos)
