import json
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import settings
from services import rag

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.7)

_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "당신은 {company}의 {role} 기술 면접관입니다. 아래 지시를 반드시 따르세요.\n"
               "- JD 또는 지원자의 실제 경험에 근거한 질문만 생성하세요. 근거 없는 일반 질문 금지.\n"
               "- 경험 질문은 반드시 지원자의 실제 프로젝트에서 가져오세요.\n"
               "- 단순 암기 질문(정의 묻기)보다 '왜', '어떻게', 'trade-off'를 묻는 질문을 우선하세요.\n"
               "- 가능하면 {company}가 실제로 사용하는 제품, 기술 스택, 도메인 맥락을 질문에 반영하세요. "
               "JD에 드러난 회사의 기술/제품을 활용하되, 확실하지 않은 정보는 지어내지 마세요.\n"
               "- JSON 외 텍스트 (마크다운 백틱, 설명 문장 등) 출력 금지."),
    ("user",
     "## 채용공고 (JD)\n{jd_text}\n\n"
     "## 지원자 경험 (이력서/포트폴리오에서 검색된 내용)\n{experience_chunks}\n\n"
     "## 질문 생성 옵션\n"
     "- 난이도: {difficulty}\n"
     "- 생성할 유형: {types}\n"
     "- 유형별 질문 수: {count}개\n\n"
     "아래 JSON 형식만 반환하세요:\n"
     '{{"technical":[{{"question":"...","intent":"...","related_to":"..."}}],'
     '"experience":[{{"question":"...","intent":"...","related_to":"..."}}]}}')
])

_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


async def generate(
    jd_text: str,
    company: str,
    role: str,
    difficulty: str,
    types: list[str],
    count: int,
) -> dict[str, list[dict]]:
    chunks = rag.search(jd_text, k=8)
    experience_chunks = "\n---\n".join(chunks) if chunks else "검색된 경험 없음"

    chain = _PROMPT | _llm
    response = await chain.ainvoke({
        "company": company or "회사",
        "role": role or "개발자",
        "jd_text": jd_text,
        "experience_chunks": experience_chunks,
        "difficulty": difficulty,
        "types": ", ".join(types),
        "count": count,
    })

    raw = _STRIP_RE.sub("", response.content).strip()
    try:
        result = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM JSON 파싱 실패: {e}\n원본: {raw[:200]}")

    for key in ("technical", "experience"):
        if key not in result:
            result[key] = []

    return result
