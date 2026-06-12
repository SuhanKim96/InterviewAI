import json
import re

from fastapi import APIRouter, HTTPException, Depends
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from db import get_db
from models import Session
from schemas import AskRequest, AskResponse

router = APIRouter(prefix="/ask", tags=["ask"])

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.7)
_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "당신은 {company}의 {role} 채용 담당자입니다. "
               "지원자의 질문에 실제 회사 담당자처럼 자연스럽게 답하세요. "
               "JD에 드러난 정보를 활용하되 확실하지 않은 정보는 지어내지 마세요.\n"
               "지원자 질문이 현재 면접 질문의 의도/범위 확인일 경우, "
               "질문이 무엇을 묻는지만 2~3문장으로 간략히 설명하라. "
               "면접 질문의 답변 내용을 절대 알려주지 마라. "
               "역질문의 목적은 답변을 알려주는 것이 아니라 질문의 맥락과 범위를 명확히 하는 것이다.\n"
               "JSON 외 텍스트 출력 금지."),
    ("user",
     "## 채용공고 (JD)\n{jd_text}\n\n"
     "## 현재 면접 질문\n{current_interview_question}\n\n"
     "## 지원자 질문\n{question}\n\n"
     '아래 JSON 형식만 반환하세요:\n{{"answer":"담당자 답변"}}')
])


@router.post("", response_model=AskResponse)
async def ask_interviewer(body: AskRequest, db: AsyncSession = Depends(get_db)):
    session = await db.get(Session, body.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")
    try:
        chain = _PROMPT | _llm
        response = await chain.ainvoke({
            "company": session.company or "회사",
            "role": session.role or "개발자",
            "jd_text": session.jd_text,
            "current_interview_question": body.current_interview_question or "정보 없음",
            "question": body.question,
        })
        raw = _STRIP_RE.sub("", response.content).strip()
        data = json.loads(raw)
        return AskResponse(answer=data.get("answer", ""))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
