from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Annotated

from schemas import DocumentResponse
from services import pdf_parser, github_fetch, rag
from config import settings

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("", response_model=DocumentResponse)
async def index_documents(
    pdfs: Annotated[list[UploadFile], File()] = [],
    portfolio_text: Annotated[str | None, Form()] = None,
):
    if not pdfs and not portfolio_text:
        raise HTTPException(status_code=400, detail="PDF 또는 포트폴리오 텍스트 중 하나는 필요합니다.")

    total_chunks = 0
    combined_text = ""
    indexed_files: list[str] = []

    for i, pdf in enumerate(pdfs):
        try:
            file_bytes = await pdf.read()
            text = pdf_parser.extract_text(file_bytes)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        source = "resume" if i == 0 else "portfolio_pdf"
        combined_text += text + "\n"
        total_chunks += rag.index_documents(text, source=source, name=pdf.filename or source)
        indexed_files.append(pdf.filename or source)

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

    return DocumentResponse(indexed_chunks=total_chunks, indexed_files=indexed_files, github_repos=indexed_repos)
