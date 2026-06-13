import json
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import settings
from services import rag, rubrics

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.3)

_COMMON_SYSTEM = (
    "당신은 공정한 면접 평가자입니다. 아래 규칙을 반드시 따르세요.\n"
    "- 제공된 루브릭을 근거로 채점하고, rubric_basis에 어떤 기준으로 그 점수를 줬는지 명시하세요.\n"
    "- 평가는 건설적으로: 약점 지적 시 개선 방향을 반드시 함께 제시하세요.\n"
    "- improved_answer는 지원자의 실제 경험 범위 안에서 제안하세요 (없는 경험 지어내기 금지). "
    "면접에서 구두로 말할 수 있는 2-3문장 자연어로만. 코드 블록/마크다운/목록 절대 금지.\n"
    "- 답변에 실질적 내용이 없는 경우('모르겠습니다', '기억이 안 납니다', 한두 단어 등) "
    "모든 점수를 1점으로 채점하세요.\n"
    "- 점수의 근거는 '구체적 내용'뿐이다: 구체적 사실, 실제 예시, 수치, 본인이 실제로 한 행동. "
    "답변의 길이·유창함·자신감 있는 톤·전문 용어 나열은 점수 근거가 아니다.\n"
    "- 길지만 구체적 알맹이가 없으면(버즈워드 나열, 일반론, 당위론, 정의만 반복) "
    "길이·유창함과 무관하게 1~2점으로 채점하세요.\n"
    "- clarity(명확성)는 '질문에 대한 답이 명확한가'를 잰다. '문장이 유창한가'가 아니다. "
    "질문에 실제로 답하지 않으면(동문서답) 표현이 또렷해도 1~2점으로 채점하세요.\n"
    "- 단, 길면서 구체적 내용도 충실하면(원리+예시+수치) 높은 점수를 유지하라. "
    "길이 자체는 벌점 사유가 아니다.\n"
    "- JSON 외 텍스트 출력 금지."
)

_AXIS_INSTRUCTIONS: dict[str, str] = {
    "technical": (
        "## 평가 축\n"
        "- score_clarity (1-5): 답변의 명확성 — 핵심을 논리적으로 전달했는가.\n"
        "- score_specific (1-5): 기술 정확성 — 지원자가 실제로 말한 기술 내용의 정확성. "
        "루브릭·이력서의 기술 수준이 아니라 답변에 담긴 내용만 평가. 기술 내용 없으면 1점.\n"
        "- score_technical (1-5): 깊이 — 원리·트레이드오프·한계를 이해하고 설명했는가."
    ),
    "experience": (
        "## 평가 축\n"
        "- score_clarity (1-5): 답변의 명확성 — 상황·행동·결과 구조가 명확한가.\n"
        "- score_specific (1-5): 구체성 — 실제 수치, 구체적 상황, 본인의 역할이 명시됐는가.\n"
        "- score_technical (1-5): 결과 — 행동의 결과와 학습·성장이 명시됐는가."
    ),
    "culture": (
        "## 평가 축\n"
        "- score_clarity (1-5): 답변의 명확성 — 가치관이 논리적으로 표현됐는가.\n"
        "- score_specific (1-5): 진정성 — 실제 경험이나 구체적 사례에 근거한 답변인가.\n"
        "- score_technical (1-5): 가치관 적합성 — JD에 나타난 회사 가치관·문화와 일치하는가."
    ),
}

_USER_TEMPLATE = (
    "## 질문\n{question}\n\n"
    "## 지원자 답변\n{answer_text}\n\n"
    "## 관련 이력서/경험 (참고용)\n{experience_chunks}\n\n"
    "## 평가 루브릭 (이 기준으로 채점할 것)\n{rubric_chunks}\n\n"
    "## 이전 대화 맥락 (참고용)\n{conversation_history}\n\n"
    "이전 답변과 일관성이 있는지, 이전에 언급한 내용을 더 깊게 탐구할 기회가 있는지 평가에 반영하세요.\n\n"
    "아래 JSON 형식만 반환하세요:\n"
    '{{"score_clarity":1-5,"score_specific":1-5,"score_technical":1-5,'
    '"strengths":"...","weaknesses":"...","improved_answer":"...",'
    '"rubric_basis":"어떤 루브릭 기준으로 채점했는지"}}'
)

_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _build_prompt(category: str) -> ChatPromptTemplate:
    axis = _AXIS_INSTRUCTIONS.get(category, _AXIS_INSTRUCTIONS["technical"])
    system = f"{_COMMON_SYSTEM}\n\n{axis}"
    return ChatPromptTemplate.from_messages([
        ("system", system),
        ("user", _USER_TEMPLATE),
    ])


async def evaluate(question: str, answer_text: str, category: str, conversation_history: str = "") -> dict:
    experience_chunks = rag.search(question, k=5)
    rubric_chunks = rubrics.search_rubrics(question, category, k=3)

    prompt = _build_prompt(category)
    chain = prompt | _llm
    response = await chain.ainvoke({
        "question": question,
        "answer_text": answer_text,
        "experience_chunks": "\n---\n".join(experience_chunks) if experience_chunks else "검색된 경험 없음",
        "rubric_chunks": "\n---\n".join(rubric_chunks) if rubric_chunks else "루브릭 없음 (seed_rubrics.py 실행 필요)",
        "conversation_history": conversation_history or "이전 답변 없음",
    })

    raw = _STRIP_RE.sub("", response.content).strip()
    try:
        decoder = json.JSONDecoder()
        result, _ = decoder.raw_decode(raw.lstrip())
        return result
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM JSON 파싱 실패: {e}\n원본: {raw[:200]}")
