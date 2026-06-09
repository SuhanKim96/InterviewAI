import json
import re

from fastapi import APIRouter, HTTPException
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import settings
from schemas import FollowUpRequest, FollowUpResponse

router = APIRouter(prefix="/follow-up", tags=["follow-up"])

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.5)
_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "당신은 기술 면접관입니다. 지원자의 꼬리질문 답변에 2~3문장으로 건설적인 피드백을 주세요. "
               "JSON 외 텍스트 출력 금지."),
    ("user",
     "## 원래 질문\n{original_question}\n\n"
     "## 꼬리질문\n{follow_up_question}\n\n"
     "## 지원자 답변\n{answer_text}\n\n"
     '아래 JSON 형식만 반환하세요:\n{{"comment":"2~3문장 피드백"}}')
])


@router.post("", response_model=FollowUpResponse)
async def evaluate_follow_up(body: FollowUpRequest):
    try:
        chain = _PROMPT | _llm
        response = await chain.ainvoke({
            "original_question": body.original_question,
            "follow_up_question": body.follow_up_question,
            "answer_text": body.answer_text,
        })
        raw = _STRIP_RE.sub("", response.content).strip()
        data = json.loads(raw)
        return FollowUpResponse(comment=data.get("comment", ""))
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
