# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Interview Coach Agent

## Project Overview
이력서/포트폴리오/JD를 입력받아 맞춤 면접 질문을 생성하고,
답변을 평가(점수+피드백)하며, 성장 추이를 추적하는 웹 앱.
상세 스펙은 SPEC.md 참고.

## Tech Stack
- FastAPI (Python) — Backend
- React (Vite) + Recharts — Frontend
- PostgreSQL (Docker) — 구조화 데이터
- Chroma (로컬 파일 ./chroma_db) — 벡터 DB
- OpenAI GPT-4o mini — LLM
- OpenAI text-embedding-3-small — Embedding
- LangChain — LLM 체인 + RAG

## Commands
- 백엔드 실행 — `cd backend && uvicorn main:app --reload`
- 프론트 실행 — `cd frontend && npm run dev`
- DB 띄우기 — `docker-compose up -d`
- 테스트 — `cd backend && pytest`

## Conventions
- 커밋 메시지 — 영어, `Description` 형식 (첫 글자 대문자, 간결하게)
- 커밋 전 반드시 사용자에게 커밋 메시지를 먼저 보여주고 확인받을 것. 확인 없이 커밋 금지.
- Python — PEP 8 준수, 타입 힌트 사용
- API 응답 — Pydantic 스키마로 검증
- 주석/문서 — 기술 문서는 영어, 설명은 한국어 가능

## Critical Rules
- API 키는 .env에만. .gitignore에 .env, chroma_db/ 반드시 포함.
- LLM JSON 출력은 파싱 전 백틱/머리말 제거 + try/except 필수.
- 외부 호출(OpenAI, GitHub, PDF) 전부 에러 핸들링.
- 한 Phase씩 만들고 검증 후 다음으로. 한 번에 다 만들지 말 것.

## Architecture Notes
- 벡터DB(Chroma) — RAG 검색용 (이력서/포폴/GitHub chunk 저장 및 검색)
- PostgreSQL — 구조화 데이터 (질문/답변/점수/시계열 성장 추적)
- 둘을 의도적으로 분리함. 검색은 Chroma, 기록/집계는 PostgreSQL.
