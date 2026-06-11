"""
Stage C 1단계 검증: interview_graph.py의 StateGraph 구조 및 분기 테스트.
실제 LLM은 RunnableLambda mock으로 교체해 API 비용 없이 실행.
"""
import pytest
from unittest.mock import AsyncMock, patch
from langchain_core.messages import AIMessage
from langchain_core.runnables import RunnableLambda

import services.interview_graph as ig

# ── LLM mock 헬퍼 ─────────────────────────────────────────────────────────────

def make_llm_mock(content: str):
    """RunnableLambda로 LangChain chain과 호환되는 LLM mock 생성."""
    async def invoke(messages, **kwargs):
        return AIMessage(content=content)
    return RunnableLambda(invoke)


# ── 공통 state 빌더 ───────────────────────────────────────────────────────────

def make_state(**overrides):
    base = dict(
        session_id=1, jd_text="JD 내용", company="카카오", role="백엔드",
        difficulty="주니어", types=["technical", "experience"],
        total_planned=4, main_answered_count=0,
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
    "improved_answer": "", "follow_up": "", "rubric_basis": "",
}
WEAK_EVAL = {
    "score_clarity": 1, "score_specific": 1, "score_technical": 1,
    "strengths": "", "weaknesses": "설명이 너무 추상적이고 구체적 예시 없음",
    "improved_answer": "", "follow_up": "", "rubric_basis": "",
}
GOOD_QUESTION = {"question": "다음 질문", "intent": "의도", "related_to": "관련", "category_reason": "C"}


# ── 각 테스트 전 모듈 레벨 LLM 초기화 ─────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_llm_singletons():
    ig._orchestrator_llm = None
    ig._followup_llm = None
    yield
    ig._orchestrator_llm = None
    ig._followup_llm = None


# ── 케이스 1: 강한 답변 → 다음 주요 질문 ─────────────────────────────────────

async def test_strong_answer_routes_to_next_question():
    """점수 5/5/5 → orchestrator next_technical → next_question_data 존재"""
    ig._orchestrator_llm = make_llm_mock('{"action": "next_technical"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [GOOD_QUESTION], "experience": []}
         )):
        result = await ig._graph.ainvoke(make_state())

    assert result["orchestrator_action"] == "next_technical"
    assert result["next_question_data"] is not None
    assert result["next_question_data"]["category"] == "technical"


# ── 케이스 2: 약한 답변 → 꼬리질문 ──────────────────────────────────────────

async def test_weak_answer_routes_to_followup():
    """점수 1/1/1 → orchestrator ask_followup → follow_up 카테고리 질문 반환"""
    ig._orchestrator_llm = make_llm_mock('{"action": "ask_followup"}')
    ig._followup_llm = make_llm_mock('{"question":"더 구체적으로 설명해주세요.","intent":"구체성 향상"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=WEAK_EVAL)):
        result = await ig._graph.ainvoke(make_state())

    assert result["orchestrator_action"] == "ask_followup"
    assert result["next_question_data"] is not None
    assert result["next_question_data"]["category"] == "follow_up"
    assert "구체" in result["next_question_data"]["question"]


# ── 케이스 3: 예산 소진 → 강제 종료 (LLM 호출 없음) ─────────────────────────

async def test_session_ends_at_total_planned():
    """main_answered_count + 1 >= total_planned → 하드 리밋 end_session (LLM 불필요)"""
    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)):
        result = await ig._graph.ainvoke(make_state(total_planned=3, main_answered_count=2))

    assert result["orchestrator_action"] == "end_session"
    assert result["next_question_data"] is None


# ── 케이스 4: 연속 꼬리질문 방지 ─────────────────────────────────────────────

async def test_no_consecutive_followups():
    """current_category가 follow_up일 때 ask_followup LLM 응답 → round-robin으로 교체"""
    # LLM이 ask_followup을 원해도 안전장치가 block해야 함
    ig._orchestrator_llm = make_llm_mock('{"action": "ask_followup"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=WEAK_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [GOOD_QUESTION], "experience": []}
         )):
        result = await ig._graph.ainvoke(
            make_state(current_category="follow_up", main_answered_count=1)
        )

    # ask_followup이 차단되어 technical 또는 experience로 라우팅
    assert result["orchestrator_action"] in ("next_technical", "next_experience")
    assert result["next_question_data"] is not None
    assert result["next_question_data"]["category"] != "follow_up"


# ── 케이스 5: culture가 types에 없을 때 차단 ──────────────────────────────────

async def test_culture_blocked_when_not_in_types():
    """types에 culture 없는데 LLM이 next_culture 반환 → round-robin 폴백"""
    ig._orchestrator_llm = make_llm_mock('{"action": "next_culture"}')

    with patch("services.evaluator.evaluate", new=AsyncMock(return_value=STRONG_EVAL)), \
         patch("services.question_gen.generate", new=AsyncMock(
             return_value={"technical": [GOOD_QUESTION], "experience": []}
         )):
        result = await ig._graph.ainvoke(
            make_state(types=["technical", "experience"])  # culture 없음
        )

    assert result["orchestrator_action"] in ("next_technical", "next_experience")
    assert result["orchestrator_action"] != "next_culture"


# ── 보너스: _parse_action 헬퍼 단위 테스트 ────────────────────────────────────

def test_parse_action_valid():
    assert ig._parse_action('{"action": "next_technical"}', ["technical"], 0) == "next_technical"
    assert ig._parse_action('{"action": "ask_followup"}', ["technical"], 0) == "ask_followup"
    assert ig._parse_action('{"action": "end_session"}', ["technical"], 0) == "end_session"


def test_parse_action_invalid_round_robin_fallback():
    assert ig._parse_action("garbage!", ["technical", "experience"], 0) == "next_technical"
    assert ig._parse_action("garbage!", ["technical", "experience"], 1) == "next_experience"
    assert ig._parse_action("{}", ["technical", "experience"], 2) == "next_technical"


def test_parse_action_wrapped_json():
    assert ig._parse_action('```json\n{"action": "next_experience"}\n```', ["technical", "experience"], 0) == "next_experience"
