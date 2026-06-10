import json
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models import Question, Answer

VERBATIM_TURNS = 3

_llm = ChatOpenAI(model="gpt-4o-mini", api_key=settings.openai_api_key, temperature=0.3)

_REPORT_PROMPT = ChatPromptTemplate.from_messages([
    ("system",
     "당신은 기술 면접 코치입니다. 아래 면접 대화를 바탕으로 "
     "지원자에게 도움이 되는 종합 피드백 리포트를 한국어로 작성하세요.\n"
     "- 3~5 문단으로 구성\n"
     "- 전반적 인상 → 구체적 강점(답변 예시 인용) → 개선 필요 영역 → 연습 방향 순서\n"
     "- 건설적이고 구체적으로. 막연한 격려 금지.\n"
     "- 마크다운 없이 평문으로."),
    ("user",
     "## 면접 정보\n회사: {company} / 포지션: {role}\n\n"
     "## 전체 Q&A 내역\n{conversation}\n\n"
     "종합 리포트를 작성하세요.")
])


async def build_conversation_history(session_id: int, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(Question.sequence, Question.question, Question.category, Answer.answer_text)
        .join(Answer, Answer.question_id == Question.id)
        .where(Question.session_id == session_id)
        .where(Question.sequence.is_not(None))
        .order_by(Question.sequence)
    )
    rows = result.all()
    return [
        {"sequence": r.sequence, "question": r.question, "category": r.category, "answer": r.answer_text}
        for r in rows
    ]


def format_history_for_prompt(history: list[dict]) -> str:
    if not history:
        return "이전 답변 없음"

    def _format_turn(turn: dict) -> str:
        return f"[Turn {turn['sequence']} - {turn['category'] or 'unknown'}]\nQ: {turn['question']}\nA: {turn['answer']}"

    if len(history) <= VERBATIM_TURNS:
        return "\n\n".join(_format_turn(t) for t in history)

    old_turns = history[:-VERBATIM_TURNS]
    recent_turns = history[-VERBATIM_TURNS:]

    topics = ", ".join(t["question"][:40] for t in old_turns)
    keywords_raw = " ".join(t["answer"] for t in old_turns)
    # 단순 키워드 추출: 영문/숫자로 이루어진 단어 중 4자 이상
    kw_candidates = re.findall(r"[A-Za-z0-9]{4,}", keywords_raw)
    keywords = ", ".join(dict.fromkeys(kw_candidates[:8]))

    summary = f"[이전 요약] {len(old_turns)}개 이전 질문 주제: {topics}. 주요 키워드: {keywords}."
    recent = "\n\n".join(_format_turn(t) for t in recent_turns)
    return f"{summary}\n\n{recent}"


async def get_next_sequence(session_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.max(Question.sequence))
        .where(Question.session_id == session_id)
        .where(Question.sequence.is_not(None))
    )
    max_seq = result.scalar()
    return (max_seq or 0) + 1


async def count_answered_turns(session_id: int, db: AsyncSession) -> int:
    result = await db.execute(
        select(func.count(Answer.id))
        .join(Question, Answer.question_id == Question.id)
        .where(Question.session_id == session_id)
        .where(Question.sequence.is_not(None))
    )
    return result.scalar() or 0


async def generate_report_summary(
    session_id: int,
    db: AsyncSession,
    company: str | None,
    role: str | None,
) -> str:
    history = await build_conversation_history(session_id, db)
    if not history:
        return "답변 내역이 없어 리포트를 생성할 수 없습니다."

    conversation = "\n\n".join(
        f"[Q{t['sequence']} - {t['category']}]\n질문: {t['question']}\n답변: {t['answer']}"
        for t in history
    )

    chain = _REPORT_PROMPT | _llm
    response = await chain.ainvoke({
        "company": company or "미입력",
        "role": role or "미입력",
        "conversation": conversation,
    })
    return response.content.strip()
