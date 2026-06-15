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

_COMMON_SYSTEM_EN = (
    "You are a fair technical interview evaluator. Follow these rules strictly.\n"
    "- Base your scores on the provided rubric; specify in rubric_basis which criteria you applied.\n"
    "- Be constructive: always suggest improvements when pointing out weaknesses.\n"
    "- improved_answer must stay within the candidate's stated experience (do not invent experiences). "
    "2-3 natural spoken sentences only. No code blocks, markdown, or bullet lists.\n"
    "- If the answer contains no substantive content ('I don't know', 'I'm not sure', one or two words, etc.) "
    "score all axes 1.\n"
    "- The only basis for a score is concrete content: specific facts, real examples, numbers, actions the "
    "candidate actually took. Answer length, fluency, confident tone, and buzzword count are NOT scoring criteria.\n"
    "- A long answer with no substance (buzzwords, generalities, platitudes, definitions only) scores 1-2 "
    "regardless of length or fluency.\n"
    "- clarity measures whether the answer actually addresses the question — not whether it is well-phrased. "
    "An off-topic answer scores 1-2 even if articulate.\n"
    "- A long answer that is also substantive (principle + example + number) retains a high score. "
    "Length alone is never penalized.\n"
    "- Return JSON only. No other text."
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

_AXIS_INSTRUCTIONS_EN: dict[str, str] = {
    "technical": (
        "## Scoring Axes\n"
        "- score_clarity (1-5): Clarity — does the answer deliver the key point logically?\n"
        "- score_specific (1-5): Technical accuracy — accuracy of the technical content actually stated. "
        "Evaluate only what the candidate said, not their resume level. No technical content = 1.\n"
        "- score_technical (1-5): Depth — does the answer demonstrate understanding of principles, "
        "trade-offs, and limitations?"
    ),
    "experience": (
        "## Scoring Axes\n"
        "- score_clarity (1-5): Clarity — is the Situation / Action / Result structure clear?\n"
        "- score_specific (1-5): Specificity — are concrete numbers, situations, and the candidate's "
        "own role explicitly stated?\n"
        "- score_technical (1-5): Result — are the outcome and lessons learned clearly articulated?"
    ),
    "culture": (
        "## Scoring Axes\n"
        "- score_clarity (1-5): Clarity — is the candidate's value expressed logically?\n"
        "- score_specific (1-5): Authenticity — is the answer grounded in real experience or a "
        "concrete example?\n"
        "- score_technical (1-5): Value alignment — does the answer align with the company culture "
        "and values apparent in the JD?"
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

_USER_TEMPLATE_EN = (
    "## Question\n{question}\n\n"
    "## Candidate Answer\n{answer_text}\n\n"
    "## Relevant Resume / Experience (reference only)\n{experience_chunks}\n\n"
    "## Evaluation Rubric (score against this)\n{rubric_chunks}\n\n"
    "## Prior Conversation (reference only)\n{conversation_history}\n\n"
    "Consider consistency with prior answers and whether earlier topics warrant deeper exploration.\n\n"
    "Return only the following JSON:\n"
    '{{"score_clarity":1-5,"score_specific":1-5,"score_technical":1-5,'
    '"strengths":"...","weaknesses":"...","improved_answer":"...",'
    '"rubric_basis":"which rubric criteria were applied"}}'
)

_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _build_prompt(category: str, language: str = "ko") -> ChatPromptTemplate:
    if language == "en":
        axis = _AXIS_INSTRUCTIONS_EN.get(category, _AXIS_INSTRUCTIONS_EN["technical"])
        system = f"{_COMMON_SYSTEM_EN}\n\n{axis}"
        user = _USER_TEMPLATE_EN
    else:
        axis = _AXIS_INSTRUCTIONS.get(category, _AXIS_INSTRUCTIONS["technical"])
        system = f"{_COMMON_SYSTEM}\n\n{axis}"
        user = _USER_TEMPLATE
    return ChatPromptTemplate.from_messages([("system", system), ("user", user)])


async def evaluate(
    question: str,
    answer_text: str,
    category: str,
    conversation_history: str = "",
    language: str = "ko",
    client_id: str = "",
) -> dict:
    experience_chunks = rag.search(question, k=5, client_id=client_id or None)
    rubric_chunks = rubrics.search_rubrics(question, category, k=3, language=language)

    prompt = _build_prompt(category, language)
    chain = prompt | _llm

    if language == "en":
        exp_fallback = "No resume content indexed"
        rub_fallback = "No rubric found (run seed_rubrics.py)"
        hist_fallback = "No prior answers"
    else:
        exp_fallback = "검색된 경험 없음"
        rub_fallback = "루브릭 없음 (seed_rubrics.py 실행 필요)"
        hist_fallback = "이전 답변 없음"

    response = await chain.ainvoke({
        "question": question,
        "answer_text": answer_text,
        "experience_chunks": "\n---\n".join(experience_chunks) if experience_chunks else exp_fallback,
        "rubric_chunks": "\n---\n".join(rubric_chunks) if rubric_chunks else rub_fallback,
        "conversation_history": conversation_history or hist_fallback,
    })

    raw = _STRIP_RE.sub("", response.content).strip()
    try:
        decoder = json.JSONDecoder()
        result, _ = decoder.raw_decode(raw.lstrip())
        return result
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM JSON 파싱 실패: {e}\n원본: {raw[:200]}")
