# Production deploy: run these BEFORE deploying new code
#   docker compose exec db psql -U $POSTGRES_USER $POSTGRES_DB \
#     -c "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'ko';"
#   docker compose exec backend python scripts/seed_rubrics.py
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.rubrics import index_rubric, _rubric_store

# ── Korean rubrics ─────────────────────────────────────────────────────────────

RUBRICS_KO = [
    (
        "technical",
        "technical_rubric",
        """[기술 개념 답변 루브릭]

명확성 (1-5):
- 5: 두괄식으로 핵심 개념을 먼저 말하고, 원리까지 설명
- 3: 개념은 맞지만 설명 순서가 뒤섞이거나 핵심이 늦게 등장
- 1: 개념 자체가 불분명하거나 부정확

구체성 (1-5):
- 5: 실제 코드 예시나 본인 프로젝트 적용 사례가 있음
- 3: 개념 설명은 있으나 예시가 추상적
- 1: 정의만 나열, 예시 없음

기술 정확성 (1-5):
- 5: 원리, trade-off, 예외 상황까지 정확하게 설명
- 3: 대체로 맞으나 일부 오류 또는 중요한 edge case 누락
- 1: 핵심 개념이 틀림

우선순위: '왜 그런가', '어떻게 동작하는가', 'trade-off는 무엇인가'를 묻는 질문에
단순 정의 암기 답변(1점)보다 원리 기반 설명(5점)을 높이 평가할 것."""
    ),
    (
        "example_technical",
        "good_example_technical",
        """[기술 답변 좋은 예시 — few-shot]

질문: "FastAPI와 Django의 차이점과 FastAPI를 선택한 이유를 설명하세요."

좋은 답변:
"FastAPI는 비동기(async/await) 기반이라 I/O 집약 작업에서 Django보다 처리량이 높습니다.
저희 프로젝트는 외부 API를 동시에 10개 호출해야 했는데, Django로는 순차 처리라
평균 응답이 3초였지만 FastAPI로 asyncio.gather()를 쓰니 0.8초로 줄었습니다.
trade-off로는 Django의 ORM, Admin, 인증 같은 배터리가 없어서 직접 구현해야 했습니다.
그래서 내부 서비스 API처럼 기능이 제한적인 곳에 FastAPI가 적합하다고 봅니다."

평가 포인트: 두괄식, 실제 수치(3초→0.8초), trade-off 명시, 적합한 사용 맥락 제시 → 5점"""
    ),
    (
        "example_technical",
        "bad_example_technical",
        """[기술 답변 나쁜 예시 — few-shot]

질문: "FastAPI와 Django의 차이점과 FastAPI를 선택한 이유를 설명하세요."

나쁜 답변:
"FastAPI는 빠르고 Django는 무겁습니다. FastAPI가 요즘 유행해서 선택했습니다."

평가 포인트:
- 명확성 1점: '빠르다'의 근거(비동기, 타입 힌트) 없음
- 구체성 1점: 본인 경험 사례 전혀 없음
- 기술 정확성 2점: 틀리지는 않지만 원리 설명 전무
- 개선 방향: 왜 빠른지(async I/O), 본인 프로젝트에서 어떤 수치를 얻었는지, trade-off 추가"""
    ),
    (
        "experience",
        "star_rubric",
        """[경험/행동 질문 STAR 루브릭]

STAR 구조 평가:
- Situation (상황): 맥락과 배경이 구체적인가? (언제, 어디서, 팀 규모 등)
- Task (과제): 본인의 역할과 책임이 명확한가?
- Action (행동): 본인이 직접 한 행동이 구체적인가? (단순 '팀이 했다' 금지)
- Result (결과): 수치화된 결과가 있는가? (성능 X%, 사용자 수 N명 등)

명확성 (1-5):
- 5: STAR 순서로 명확하게 전달, 두괄식(결과 먼저 언급)이면 가점
- 3: 내용은 있지만 구조가 흐트러짐
- 1: 상황 나열만 하고 Action/Result 없음

구체성 (1-5):
- 5: 수치, 기간, 본인 기여 비율이 명확
- 3: 정성적 설명만 있고 수치 없음
- 1: '열심히 했다' 수준

감점 요소: 팀 전체의 성과를 본인 것처럼 표현, 결과 없이 행동만 나열"""
    ),
    (
        "example_experience",
        "good_example_experience",
        """[경험 답변 좋은 예시 — few-shot]

질문: "팀 프로젝트에서 기술적 갈등을 해결한 경험을 말해주세요."

좋은 답변:
"(Result 먼저) 결국 배포 일정을 지키면서 기술 부채도 0으로 마무리했습니다.
(Situation) 4인 팀에서 백엔드 리드를 맡았는데, 팀원이 빠른 개발을 위해
ORM 없이 raw SQL만 쓰자고 했고 저는 유지보수성 때문에 SQLAlchemy를 선호했습니다.
(Task) 2주 남은 마감 안에 합의점을 찾아야 했습니다.
(Action) 두 방식으로 같은 기능을 프로토타입 만들어 성능(응답 시간)과
코드 줄 수를 비교했고, SQLAlchemy가 응답 5ms 느리지만 코드량이 40% 줄었습니다.
데이터를 보고 팀원이 SQLAlchemy에 동의했고, raw SQL 필요 부분만 하이브리드로 처리했습니다."

평가 포인트: Result 먼저, 본인 Action 명확, 수치(5ms, 40%) 포함 → 5점"""
    ),
    (
        "example_experience",
        "bad_example_experience",
        """[경험 답변 나쁜 예시 — few-shot]

질문: "팀 프로젝트에서 기술적 갈등을 해결한 경험을 말해주세요."

나쁜 답변:
"팀원과 기술 선택에서 의견이 달랐는데 서로 이야기해서 잘 해결했습니다.
팀워크가 중요하다는 걸 배웠습니다."

평가 포인트:
- 구체성 1점: Action이 '이야기했다'로 끝, 본인이 무엇을 했는지 불명확
- 결과 없음: '잘 해결됐다'는 정성적 표현만
- STAR 미충족: Situation/Task/Action/Result 모두 부실
- 개선 방향: 어떤 기술 갈등이었는지, 본인이 어떤 데이터/근거로 설득했는지,
  결과적으로 어떤 성과가 있었는지 수치와 함께 구체적으로 작성"""
    ),
]

# ── English rubrics ────────────────────────────────────────────────────────────

RUBRICS_EN = [
    (
        "technical",
        "technical_rubric_en",
        """[Technical Concept Answer Rubric]

Clarity (1-5):
- 5: Leads with the key concept, then explains the underlying principle
- 3: Concept is correct but the explanation is disorganised or the main point comes late
- 1: The concept itself is unclear or inaccurate

Technical Accuracy (1-5):
- 5: Real code example or a personal project application is included
- 3: Concept is explained but examples remain abstract
- 1: Definitions only, no examples

Depth (1-5):
- 5: Principles, trade-offs, and edge cases all accurately explained
- 3: Mostly correct but minor errors or important edge cases missing
- 1: Core concept is wrong

Priority: For questions asking 'why', 'how', or 'what are the trade-offs',
score rote-definition answers low (1) and principle-based explanations high (5)."""
    ),
    (
        "example_technical",
        "good_example_technical_en",
        """[Good Technical Answer Example — few-shot]

Question: "Explain the difference between FastAPI and Django and why you chose FastAPI."

Good answer:
"FastAPI is async-first, so it handles I/O-intensive work with higher throughput than Django.
In our project we needed to call 10 external APIs concurrently; with Django's synchronous processing
average response time was 3 seconds, but switching to FastAPI with asyncio.gather() brought it
down to 0.8 seconds.
The trade-off is that Django's batteries—ORM, Admin, built-in auth—are absent, so you have to
build those yourself. For that reason FastAPI fits best when the API surface is limited,
like an internal microservice."

Scoring: direct opening, concrete numbers (3s → 0.8s), explicit trade-off, appropriate use-case → 5 points"""
    ),
    (
        "example_technical",
        "bad_example_technical_en",
        """[Poor Technical Answer Example — few-shot]

Question: "Explain the difference between FastAPI and Django and why you chose FastAPI."

Poor answer:
"FastAPI is fast and Django is heavy. FastAPI is trendy so I chose it."

Scoring:
- Clarity 1: no basis for 'fast' (async I/O, type hints not mentioned)
- Technical Accuracy 1: no personal experience cited
- Depth 2: not wrong, but zero explanation of principles
- How to improve: explain WHY it's fast (async I/O), share numbers from your own project,
  add trade-offs"""
    ),
    (
        "experience",
        "star_rubric_en",
        """[Behavioural / Experience Question STAR Rubric]

STAR structure:
- Situation: Is the context specific? (when, where, team size, etc.)
- Task: Is your role and responsibility clear?
- Action: Are YOUR actions concrete? ('The team did X' is not enough)
- Result: Is the outcome quantified? (performance X%, users N, etc.)

Clarity (1-5):
- 5: STAR structure is clear; leading with Result is a bonus
- 3: Content exists but structure is messy
- 1: Only lists the situation; no Action or Result

Specificity (1-5):
- 5: Numbers, timeframes, and personal contribution are explicit
- 3: Qualitative description only, no numbers
- 1: 'I worked hard' level

Deductions: attributing team results to yourself; describing actions without any outcome"""
    ),
    (
        "example_experience",
        "good_example_experience_en",
        """[Good Experience Answer Example — few-shot]

Question: "Tell me about a time you resolved a technical conflict within a team."

Good answer:
"(Result first) We shipped on schedule with zero tech debt left over.
(Situation) I was the backend lead on a 4-person team. A teammate wanted to use raw SQL
for speed; I preferred SQLAlchemy for maintainability.
(Task) We had two weeks until the deadline and needed to reach agreement quickly.
(Action) I built prototypes of the same feature in both approaches and compared response
time and line count. SQLAlchemy was 5 ms slower but cut the codebase by 40%.
The data convinced my teammate, and we adopted a hybrid approach—SQLAlchemy everywhere
except the few hot paths where raw SQL was justified."

Scoring: leads with Result, personal Action explicit, numbers (5 ms, 40%) → 5 points"""
    ),
    (
        "example_experience",
        "bad_example_experience_en",
        """[Poor Experience Answer Example — few-shot]

Question: "Tell me about a time you resolved a technical conflict within a team."

Poor answer:
"We disagreed on the tech choice but talked it through and resolved it.
I learned that teamwork is important."

Scoring:
- Specificity 1: Action is 'talked it through'—personal contribution unclear
- No Result: 'resolved it' is qualitative only
- STAR unmet: Situation / Task / Action / Result all superficial
- How to improve: name the technology dispute, explain what data or argument you used
  to persuade, state the quantifiable outcome"""
    ),
]


def main() -> None:
    print("루브릭 컬렉션 초기화 후 ko + en 재시드...")
    _rubric_store.reset_collection()

    all_rubrics = [(cat, name, text, "ko") for cat, name, text in RUBRICS_KO] + \
                  [(cat, name, text, "en") for cat, name, text in RUBRICS_EN]

    for category, name, text, lang in all_rubrics:
        index_rubric(text, category=category, name=name, language=lang)
        print(f"  ✓ [{lang}] {name}")

    print(f"\n완료: {len(all_rubrics)}개 루브릭 인덱싱 (ko={len(RUBRICS_KO)}, en={len(RUBRICS_EN)})")


if __name__ == "__main__":
    main()
