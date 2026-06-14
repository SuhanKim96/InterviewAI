import json
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from config import settings
from services import rag

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.7)

_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "당신은 {company}의 {role} 기술 면접관입니다. 아래 지시를 반드시 따르세요.\n\n"

     "## 질문 카테고리 정의 (엄격히 구분할 것)\n\n"

     "[technical] — '이 기술이 무엇인가/어떻게 동작하나'\n"
     "- 특정 기술·개념의 원리, 동작 방식, 일반 지식을 묻는 질문\n"
     "- 지원자의 프로젝트와 무관하게 '그 기술 자체'를 아는지 확인\n"
     "- 예: 'FastAPI의 비동기 처리가 동기 대비 어떤 이점이 있나요?'\n"
     "- 예: 'JWT 인증에서 토큰 만료를 어떻게 다루나요?'\n"
     "- [이것이 아님] 특정 프로젝트에서 무엇을 했는지 묻는 것\n\n"

     "[experience] — '당신이 무엇을 했나/어떤 결정을 내렸나/어떤 문제를 풀었나'\n"
     "- 지원자의 실제 프로젝트 경험에서 출발하는 질문\n"
     "- 반드시 이력서에서 검색된 프로젝트명을 질문 문장 안에 명시할 것\n"
     "- 예: 'GlobaLog에서 외부 환율 API 장애 시 어떻게 대응했나요?'\n"
     "- 예: 'Stock Overflow 개발 당시 모델 서버 통합에서 가장 어려웠던 점은?'\n"
     "- [이것이 아님] 일반적인 기술 지식을 묻는 것\n\n"

     "[대조 예시 — 같은 주제라도 관점이 다름]\n"
     "- technical: 'BigDecimal이 부동소수점 오차를 막는 원리는?' (개념)\n"
     "- experience: 'GlobaLog에서 금융 정밀도 문제를 어떻게 해결했나요?' (경험)\n\n"

     "판별 기준: '이 기술이 뭔가?' → technical / '당신이 뭘 했나?' → experience\n\n"

     "[culture] — '이 조직/팀에서 어떻게 일하나/무엇을 중요시하나/왜 지원했나'\n"
     "- 가치관, 협업 방식, 갈등 해결, 동기, 성장 의지를 묻는 질문\n"
     "- JD에 언급된 팀 문화/가치관 키워드를 반영할 것\n"
     "- 예: '팀 내 의견 충돌 상황에서 어떻게 해결했나요?'\n"
     "- [이것이 아님] 기술 개념이나 프로젝트 세부 사항을 묻는 것\n\n"

     "## 대화 맥락 기반 질문 생성\n"
     "이전 답변이 있다면, 이미 다룬 주제를 반복하지 말고 드러난 강점을 더 파고들거나 "
     "약점을 보완할 수 있는 질문을 우선하세요.\n\n"

     "## 추가 규칙\n"
     "- JD 또는 지원자의 실제 경험에 근거한 질문만 생성. 근거 없는 일반 질문 금지.\n"
     "- experience 질문은 프로젝트명 없이 생성하지 마세요.\n"
     "- technical 질문은 JD에 명시된 핵심 기술 스택 또는 이력서의 주요 기술(프레임워크, 아키텍처, 패턴)에 집중하세요. "
     "세부 라이브러리 클래스(BigDecimal, Optional 등)나 단순 정의 질문 금지.\n"
     "- 단순 암기 질문(정의 묻기)보다 '왜', '어떻게', 'trade-off', '설계 결정' 관점의 질문 우선.\n"
     "- 가능하면 {company}가 실제 사용하는 기술 스택에 대한 질문도 포함하세요. "
     "단, JD에 명시된 기술만. 확실하지 않으면 지어내지 마세요.\n"
     "- JSON 외 텍스트(마크다운 백틱, 설명 문장 등) 출력 금지."),

    ("user",
     "## 채용공고 (JD)\n{jd_text}\n\n"
     "## 지원자 경험 (이력서/포트폴리오에서 검색된 내용)\n{experience_chunks}\n\n"
     "## 질문 생성 옵션\n"
     "- 난이도: {difficulty}\n"
     "- 생성할 유형: {types}\n"
     "- 유형별 질문 수: {count}개\n\n"
     "## 이전 대화 맥락\n{conversation_history}\n\n"
     "category_reason을 먼저 작성한 후 질문을 생성하세요 (분류 근거 명시).\n"
     "아래 JSON 형식만 반환하세요:\n"
     '{{"technical":[{{"question":"...","intent":"...","related_to":"...","category_reason":"이 기술 개념을 묻고 프로젝트와 무관하므로 technical"}}],'
     '"experience":[{{"question":"...","intent":"...","related_to":"프로젝트명","category_reason":"GlobaLog에서의 실제 경험을 묻고 있으므로 experience"}}]}}')
])

_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


async def generate(
    jd_text: str,
    company: str,
    role: str,
    difficulty: str,
    types: list[str],
    count: int,
    conversation_history: str = "",
    language: str = "ko",
) -> dict[str, list[dict]]:
    chunks = rag.search(jd_text, k=8)
    experience_chunks = "\n---\n".join(chunks) if chunks else ("No resume content indexed" if language == "en" else "검색된 경험 없음")

    # For English, prepend a language instruction to the existing prompt
    if language == "en":
        en_instruction = (
            "Respond in English. Generate all questions and descriptions in English.\n\n"
        )
        prompt = ChatPromptTemplate.from_messages([
            ("system", en_instruction + _PROMPT.messages[0].prompt.template),
            ("user", _PROMPT.messages[1].prompt.template),
        ])
    else:
        prompt = _PROMPT

    chain = prompt | _llm
    response = await chain.ainvoke({
        "company": company or ("Company" if language == "en" else "회사"),
        "role": role or ("Developer" if language == "en" else "개발자"),
        "jd_text": jd_text,
        "experience_chunks": experience_chunks,
        "difficulty": difficulty,
        "types": ", ".join(types),
        "count": count,
        "conversation_history": conversation_history or ("No prior answers" if language == "en" else "이전 답변 없음"),
    })

    raw = _STRIP_RE.sub("", response.content).strip()
    try:
        decoder = json.JSONDecoder()
        result, _ = decoder.raw_decode(raw.lstrip())
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM JSON 파싱 실패: {e}\n원본: {raw[:200]}")

    for key in ("technical", "experience", "culture"):
        if key not in result:
            result[key] = []

    return result
