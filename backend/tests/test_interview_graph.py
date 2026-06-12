"""
Stage C 그래프 구조 검증.
새 구조: evaluator → followup → orchestrator → [next_*|end_session]
followup_node는 항상 실행 — 약점 있으면 eval_result["follow_up"] 생성, 없으면 ""
"""
import pytest
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

import services.interview_graph as ig

# ── mock 헬퍼 ─────────────────────────────────────────────────────────────────

def make_llm_mock(content: str):
    async def invoke(messages, **kwargs):
        return AIMessage(content=content)
    return RunnableLambda(invoke)


def make_state(**overrides):
    base = dict(
        session_id=1, jd_text="JD", company="카카오", role="백엔드",
        difficulty="주니어", types=["technical", "experience"],
        total_planned=4, main_answered_count=0,
        types_used_counts={"technical": 0, "experience": 0},
        conversation_history="이전 답변 없음",
        current_question="FastAPI의 비동기 처리를 설명해주세요.",
        current_category="technical",
        answer_text="FastAPI는 async/await를 사용합니다.",
        eval_result={}, orchestrator_action="", next_question_data=None,
    )
    base.update(overrides)
    return base


STRONG_EVAL = {
    "score_clarity": 5, "score_specific": 5, "score_technical": 5,
    "strengths": "명확하고 구체적", "weaknesses": "",
    "improved_answer": "", "rubric_basis": "",
}
WEAK_EVAL = {
    "score_clarity": 1, "score_specific": 1, "score_technical": 1,
    "strengths": "", "weaknesses": "설명이 너무 추상적이고 구체적 예시 없음",
    "improved_answer": "", "rubric_basis": "",
}
GOOD_QUESTION = {"question": "다음 질문", "intent": "의도", "related_to": "관련", "category_reason": "C"}


@pytest.fixture(autouse=True)
def reset_llm_singletons():
    ig._orchestrator_llm = None
    ig._followup_llm = None
    yield
    ig._orchestrator_llm = None
    ig._followup_llm = None


# ── 케이스 1: 강한 답변 → 다음 주요 질문 + follow_up 없음 ─────────────────────

async def test_strong_answer_routes_to_next_question_no_followup():
    """avg >= 4 → followup_node가 LLM 없이 follow_up="" → 다음 주요 질문"""
    ig._orchestrator_llm = make_llm_mock('{"action": "next_technical"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [GOOD_QUESTION], "experience": []}
         )):
        result = await ig._graph.ainvoke(make_state())

    assert result["orchestrator_action"] == "next_technical"
    assert result["next_question_data"] is not None
    assert result["eval_result"].get("follow_up") == ""   # LLM 없이 빈 문자열


# ── 케이스 2: 약한 답변 → follow_up 텍스트 생성 + 다음 주요 질문 ────────────────

async def test_weak_answer_generates_followup_text_then_next_question():
    """avg < 4 → followup_node가 follow_up 텍스트 생성 → 다음 주요 질문으로 진행"""
    ig._orchestrator_llm = make_llm_mock('{"action": "next_experience"}')
    ig._followup_llm = make_llm_mock('{"question": "더 구체적으로 설명해주세요."}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=WEAK_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [], "experience": [GOOD_QUESTION]}
         )):
        result = await ig._graph.ainvoke(make_state())

    # follow_up 텍스트가 eval_result에 들어있어야 함
    assert result["eval_result"].get("follow_up") == "더 구체적으로 설명해주세요."
    # 다음 질문은 main 카테고리 (follow_up 카테고리 아님)
    assert result["next_question_data"] is not None
    assert result["next_question_data"]["category"] in ("technical", "experience", "culture")
    # orchestrator_action은 next_* (ask_followup 없음)
    assert result["orchestrator_action"] in ("next_technical", "next_experience", "next_culture")


# ── 케이스 3: 예산 소진 → end_session ───────────────────────────────────────────

async def test_session_ends_at_total_planned():
    """main_answered_count + 1 >= total_planned → end_session"""
    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)):
        result = await ig._graph.ainvoke(make_state(total_planned=3, main_answered_count=2))

    assert result["orchestrator_action"] == "end_session"
    assert result["next_question_data"] is None


# ── 케이스 4: culture가 types에 없을 때 차단 ──────────────────────────────────────

async def test_culture_blocked_when_not_in_types():
    """types에 culture 없는데 LLM이 next_culture 반환 → round-robin 폴백"""
    ig._orchestrator_llm = make_llm_mock('{"action": "next_culture"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [GOOD_QUESTION], "experience": []}
         )):
        result = await ig._graph.ainvoke(make_state(types=["technical", "experience"]))

    assert result["orchestrator_action"] in ("next_technical", "next_experience")
    assert result["orchestrator_action"] != "next_culture"


# ── 케이스 5: ask_followup 응답 → round-robin 폴백 ────────────────────────────────

async def test_ask_followup_not_valid_falls_back():
    """오케스트레이터가 ask_followup 반환 → valid set에 없으므로 round-robin 폴백"""
    ig._orchestrator_llm = make_llm_mock('{"action": "ask_followup"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [GOOD_QUESTION], "experience": []}
         )):
        result = await ig._graph.ainvoke(make_state())

    # ask_followup은 valid set에 없으므로 round-robin 폴백
    assert result["orchestrator_action"] in ("next_technical", "next_experience")


# ── _parse_action 단위 테스트 ──────────────────────────────────────────────────

def test_parse_action_valid():
    assert ig._parse_action('{"action": "next_technical"}', ["technical"], 0) == "next_technical"
    assert ig._parse_action('{"action": "end_session"}', ["technical"], 0) == "end_session"


def test_parse_action_ask_followup_invalid():
    """ask_followup은 더 이상 valid하지 않음 → round-robin"""
    assert ig._parse_action('{"action": "ask_followup"}', ["technical", "experience"], 0) == "next_technical"


def test_parse_action_fallback():
    assert ig._parse_action("garbage!", ["technical", "experience"], 0) == "next_technical"
    assert ig._parse_action("garbage!", ["technical", "experience"], 1) == "next_experience"
