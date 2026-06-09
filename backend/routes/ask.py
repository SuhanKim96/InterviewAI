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
               "JD에 드러난 정보를 활용하되 확실하지 않은 정보는 지어내지 마세요. "
               "JSON 외 텍스트 출력 금지."),
    ("user",
     "## 채용공고 (JD)\n{jd_text}\n\n"
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
            "question": body.question,
        })
        raw = _STRIP_RE.sub("", response.content).strip()
        data = json.loads(raw)
        return AskResponse(answer=data.get("answer", ""))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
