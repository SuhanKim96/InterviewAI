import json
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import settings
from services import rag, rubrics

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.3)

_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "당신은 공정한 기술 면접 평가자입니다. 아래 규칙을 반드시 따르세요.\n"
     "- 제공된 루브릭을 근거로 채점하고, rubric_basis에 어떤 기준으로 그 점수를 줬는지 명시하세요.\n"
     "- 평가는 건설적으로: 약점 지적 시 개선 방향을 반드시 함께 제시하세요.\n"
     "- improved_answer는 지원자의 실제 경험 범위 안에서 제안하세요 (없는 경험 지어내기 금지).\n"
     "- follow_up: 답변이 모호하거나 더 깊이 확인할 기술적 지점이 있으면 꼬리질문 1개, "
     "답변이 충분하면 빈 문자열(\"\").\n"
     "- JSON 외 텍스트 출력 금지."),
    ("user",
     "## 질문\n{question}\n\n"
     "## 지원자 답변\n{answer_text}\n\n"
     "## 관련 이력서/경험 (참고용)\n{experience_chunks}\n\n"
     "## 평가 루브릭 (이 기준으로 채점할 것)\n{rubric_chunks}\n\n"
     "아래 JSON 형식만 반환하세요:\n"
     '{{"score_clarity":1-5,"score_specific":1-5,"score_technical":1-5,'
     '"strengths":"...","weaknesses":"...","improved_answer":"...",'
     '"follow_up":"꼬리질문 or 빈 문자열","rubric_basis":"어떤 루브릭 기준으로 채점했는지"}}')
])

_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


async def evaluate(question: str, answer_text: str, category: str) -> dict:
    experience_chunks = rag.search(question, k=5)
    rubric_chunks = rubrics.search_rubrics(question, category, k=3)

    chain = _PROMPT | _llm
    response = await chain.ainvoke({
        "question": question,
        "answer_text": answer_text,
        "experience_chunks": "\n---\n".join(experience_chunks) if experience_chunks else "검색된 경험 없음",
        "rubric_chunks": "\n---\n".join(rubric_chunks) if rubric_chunks else "루브릭 없음 (seed_rubrics.py 실행 필요)",
    })

    raw = _STRIP_RE.sub("", response.content).strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM JSON 파싱 실패: {e}\n원본: {raw[:200]}")
