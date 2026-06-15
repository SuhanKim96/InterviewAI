import json
import re
from typing import TypedDict

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from config import settings

_STRIP_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)

# 모듈 레벨 LLM — 테스트에서 교체 가능 (replace with RunnableLambda mock)
_orchestrator_llm = None
_followup_llm = None


def _get_orchestrator_llm():
    global _orchestrator_llm
    if _orchestrator_llm is None:
        _orchestrator_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.1)
    return _orchestrator_llm


def _get_followup_llm():
    global _followup_llm
    if _followup_llm is None:
        _followup_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.6)
    return _followup_llm


# ── State ─────────────────────────────────────────────────────────────────────

class InterviewState(TypedDict):
    # 입력: endpoint가 그래프 호출 전 채움
    session_id: int
    jd_text: str
    company: str
    role: str
    difficulty: str
    types: list[str]
    total_planned: int
    main_answered_count: int    # 현재 답변 저장 전 카운트
    conversation_history: str
    current_question: str
    current_category: str       # "technical"|"experience"|"culture"
    answer_text: str

    # 추가 컨텍스트
    types_used_counts: dict     # {"technical": 2, "experience": 1, "culture": 0}
    language: str               # "ko" | "en"
    client_id: str

    # 노드 출력
    eval_result: dict           # followup_node가 follow_up 필드를 추가
    orchestrator_action: str    # "next_technical"|"next_experience"|"next_culture"|"end_session"
    next_question_data: dict | None


# ── Prompts ───────────────────────────────────────────────────────────────────

_ORCHESTRATOR_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "당신은 기술 면접 오케스트레이터입니다. 평가 결과와 맥락을 보고 다음 행동을 JSON으로만 반환하세요.\n\n"
     "## 가능한 행동\n"
     "- next_technical : 기술 개념/원리 질문 ('이 기술이 뭔가?')\n"
     "- next_experience: 지원자 프로젝트 경험 질문 ('당신이 뭘 했나?')\n"
     "- next_culture   : 가치관/협업/동기 질문 (types에 culture 포함 시만)\n"
     "- end_session    : 면접 종료 — 남은 예산이 0일 때만 선택 가능\n\n"
     "## 선택 기준\n"
     "1. 남은 예산이 0이면 → end_session. 0보다 크면 절대 end_session 선택 금지.\n"
     "2. types에 culture가 없으면 → next_culture 선택 불가\n"
     "3. 이전에 같은 카테고리가 연속되면 다른 카테고리 선택\n"
     "4. types에 포함된 카테고리를 균등하게 배분하세요. 사용 횟수가 0인 카테고리를 우선 선택하세요.\n\n"
     '반환 형식: {{"action": "..."}} — 다른 텍스트 절대 금지'),
    ("user",
     "방금 질문 카테고리: {current_category}\n"
     "방금 질문: {current_question}\n\n"
     "평가: 명확성 {score_clarity}/5, 구체성 {score_specific}/5, 기술 {score_technical}/5\n"
     "강점: {strengths}\n"
     "약점: {weaknesses}\n\n"
     "허용 유형: {types}\n"
     "현재 카테고리 사용 횟수: {types_used_counts}\n"
     "남은 주요 질문 예산: {remaining}\n\n"
     "대화 맥락:\n{conversation_history}"),
])

_FOLLOWUP_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "당신은 기술 면접관입니다. 지원자 답변의 약점을 정확히 파고드는 꼬리질문 1개를 생성하세요.\n"
     "- 오직 바로 아래의 [원래 질문]과 [지원자 답변]에만 근거해 꼬리질문을 생성하라.\n"
     "  이전 대화의 다른 주제를 절대 끌어오지 마라.\n"
     "- 이미 답한 내용 반복 금지\n"
     "- '왜', '어떻게', '구체적으로' 중심의 심층 질문\n"
     "- JSON 외 텍스트 절대 금지"),
    ("user",
     "원래 질문: {current_question}\n"
     "지원자 답변: {answer_text}\n"
     "식별된 약점: {weaknesses}\n\n"
     '{{"question":"꼬리질문 텍스트"}}'),
])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_action(raw: str, types: list[str], answered_count: int) -> str:
    valid = {"next_technical", "next_experience", "next_culture", "end_session"}
    try:
        data = json.loads(_STRIP_RE.sub("", raw).strip())
        action = data.get("action", "")
        if action in valid:
            return action
    except Exception:
        pass
    cat = types[answered_count % len(types)]
    return f"next_{cat}"


# ── Node Functions ────────────────────────────────────────────────────────────

async def evaluator_node(state: InterviewState) -> dict:
    from services import evaluator
    result = await evaluator.evaluate(
        question=state["current_question"],
        answer_text=state["answer_text"],
        category=state["current_category"],
        conversation_history=state["conversation_history"],
        language=state.get("language", "ko"),
        client_id=state.get("client_id", ""),
    )
    return {"eval_result": result}


async def followup_node(state: InterviewState) -> dict:
    """약점이 있으면 꼬리질문 텍스트 생성 후 eval_result["follow_up"] 업데이트.
    강한 답변이면 LLM 호출 없이 빈 문자열로 설정."""
    ev = state["eval_result"]
    scores = [s for s in [ev.get("score_clarity"), ev.get("score_specific"), ev.get("score_technical")] if s]
    avg = sum(scores) / len(scores) if scores else 5.0
    weaknesses = ev.get("weaknesses", "").strip()

    if avg >= 4 or not weaknesses:
        return {"eval_result": {**ev, "follow_up": ""}}

    lang = state.get("language", "ko")
    lang_prefix = "Respond in English.\n" if lang == "en" else ""
    prompt = _FOLLOWUP_PROMPT if lang == "ko" else ChatPromptTemplate.from_messages([
        ("system", lang_prefix + _FOLLOWUP_PROMPT.messages[0].prompt.template),
        ("user",   _FOLLOWUP_PROMPT.messages[1].prompt.template),
    ])
    chain = prompt | _get_followup_llm()
    resp = await chain.ainvoke({
        "current_question": state["current_question"],
        "answer_text":      state["answer_text"],
        "weaknesses":       weaknesses,
    })
    raw = _STRIP_RE.sub("", resp.content).strip()
    try:
        data = json.loads(raw)
        follow_up_text = data.get("question", "")
    except json.JSONDecodeError:
        follow_up_text = ""

    return {"eval_result": {**ev, "follow_up": follow_up_text}}


async def orchestrator_node(state: InterviewState) -> dict:
    next_main = state["main_answered_count"] + 1

    if next_main >= state["total_planned"]:
        return {"orchestrator_action": "end_session"}

    ev = state["eval_result"]
    chain = _ORCHESTRATOR_PROMPT | _get_orchestrator_llm()
    remaining = state["total_planned"] - next_main
    types_used_counts = state.get("types_used_counts", {})

    resp = await chain.ainvoke({
        "current_category":    state["current_category"],
        "current_question":    state["current_question"],
        "score_clarity":       ev.get("score_clarity", 0),
        "score_specific":      ev.get("score_specific", 0),
        "score_technical":     ev.get("score_technical", 0),
        "strengths":           ev.get("strengths", ""),
        "weaknesses":          ev.get("weaknesses", ""),
        "types":               ", ".join(state["types"]),
        "types_used_counts":   str(types_used_counts),
        "remaining":           remaining,
        "conversation_history": state["conversation_history"],
    })
    action = _parse_action(resp.content, state["types"], state["main_answered_count"])

    # remaining > 0인데 LLM이 end_session을 반환하면 무시 (total_planned 체크가 종료 권한을 가짐)
    if action == "end_session" and remaining > 0:
        cat = state["types"][state["main_answered_count"] % len(state["types"])]
        action = f"next_{cat}"

    # culture가 types에 없으면 교체
    if action == "next_culture" and "culture" not in state["types"]:
        cat = state["types"][state["main_answered_count"] % len(state["types"])]
        action = f"next_{cat}"

    # culture가 아직 한 번도 안 쓰였으면 강제 (마지막 1개는 제외)
    if (action != "next_culture"
            and "culture" in state["types"]
            and types_used_counts.get("culture", 0) == 0
            and remaining > 1):
        action = "next_culture"

    return {"orchestrator_action": action}


async def _interviewer_node(state: InterviewState, category: str) -> dict:
    from services import question_gen
    result = await question_gen.generate(
        jd_text=state["jd_text"],
        company=state["company"],
        role=state["role"],
        difficulty=state["difficulty"],
        types=[category],
        count=1,
        conversation_history=state["conversation_history"],
        language=state.get("language", "ko"),
        client_id=state.get("client_id", ""),
    )
    items = result.get(category) or next((v for v in result.values() if v), [])
    q = items[0] if items else {
        "question": f"Please prepare the next {category} question." if state.get("language") == "en" else f"다음 {category} 질문을 준비해주세요.",
        "intent": None,
        "related_to": None,
    }
    return {"next_question_data": {**q, "category": category}}


async def technical_node(state: InterviewState) -> dict:
    return await _interviewer_node(state, "technical")


async def experience_node(state: InterviewState) -> dict:
    return await _interviewer_node(state, "experience")


async def culture_node(state: InterviewState) -> dict:
    return await _interviewer_node(state, "culture")


# ── Graph Assembly ────────────────────────────────────────────────────────────

def build_interview_graph():
    builder = StateGraph(InterviewState)

    builder.add_node("evaluator",    evaluator_node)
    builder.add_node("followup",     followup_node)
    builder.add_node("orchestrator", orchestrator_node)
    builder.add_node("technical",    technical_node)
    builder.add_node("experience",   experience_node)
    builder.add_node("culture",      culture_node)

    builder.set_entry_point("evaluator")
    builder.add_edge("evaluator", "followup")      # 항상 followup 거침
    builder.add_edge("followup", "orchestrator")
    builder.add_conditional_edges(
        "orchestrator",
        lambda s: s.get("orchestrator_action", "end_session"),
        {
            "next_technical":  "technical",
            "next_experience": "experience",
            "next_culture":    "culture",
            "end_session":     END,
        },
    )
    for node in ("technical", "experience", "culture"):
        builder.add_edge(node, END)

    return builder.compile()


_graph = build_interview_graph()


# ── Public Entry Point ────────────────────────────────────────────────────────

async def run_turn(session, current_q, answer_text: str, db, language: str = "ko", client_id: str = "") -> tuple[dict, dict | None, bool]:
    """
    sessions.py /turn 엔드포인트에서 호출.
    반환: (eval_result, next_question_data | None, session_complete)
    """
    from services import session_manager

    history_list = await session_manager.build_conversation_history(session.id, db)
    history_str  = session_manager.format_history_for_prompt(history_list)
    main_count   = await session_manager.count_answered_turns(session.id, db)
    types        = json.loads(session.types_json or '["technical","experience"]')

    # 각 카테고리별 사용 횟수 계산
    types_used_counts: dict = {t: 0 for t in types}
    for item in history_list:
        cat = item.get("category", "")
        if cat in types_used_counts:
            types_used_counts[cat] += 1

    state = InterviewState(
        session_id=session.id,
        jd_text=session.jd_text,
        company=session.company or "",
        role=session.role or "",
        difficulty=session.difficulty or "주니어",
        types=types,
        total_planned=session.total_planned or 0,
        main_answered_count=main_count,
        conversation_history=history_str,
        current_question=current_q.question,
        current_category=current_q.category or "technical",
        answer_text=answer_text,
        types_used_counts=types_used_counts,
        language=language,
        client_id=client_id,
        eval_result={},
        orchestrator_action="",
        next_question_data=None,
    )

    output = await _graph.ainvoke(state)
    session_complete = output.get("orchestrator_action") == "end_session"
    return output.get("eval_result", {}), output.get("next_question_data"), session_complete
