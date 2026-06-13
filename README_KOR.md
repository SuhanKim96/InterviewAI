# InterviewAI

이력서와 채용공고를 넣으면 멀티에이전트 AI 면접관이 실제 면접처럼 질문하고, 루브릭 기반으로 채점하고, 성장 리포트를 만들어주는 한국어 기술 면접 코칭 웹앱.

_In English_: [README.md](README.md)

---

## 개요

사용자 문서(이력서 PDF, GitHub 레포, JD)를 RAG로 인덱싱한 뒤, 6개 노드로 구성된 LangGraph 에이전트 그래프가 면접을 진행한다.

**흐름**

1. 문서 업로드 → ChromaDB에 청크 임베딩 저장
2. JD + 이력서 기반 맞춤 질문 생성 (기술 / 경험 / 컬처핏)
3. 멀티턴 면접 — 답변 평가 → 꼬리질문 생성 → 다음 질문 카테고리 결정
4. 카테고리별 루브릭 채점 (기술: 명확성·기술정확성·깊이 / 경험: 명확성·구체성·결과 / 컬처: 명확성·진정성·가치관적합성)
5. 세션 종료 후 LLM 종합 리포트 + 성장 추이 차트

---

## Live Demo

`http://<EIP>`

<!-- 스크린샷 자리 -->

---

## 주요 기능

- **RAG 기반 질문 생성** — 실제 이력서 프로젝트와 JD를 근거로 질문. 프롬프트 단에서 일반적 암기 질문을 명시적으로 배제
- **LangGraph 멀티에이전트 (6 노드)** — `evaluator → followup → orchestrator → [technical | experience | culture]`. orchestrator가 카테고리 균형 조정과 질문 예산 관리를 담당
- **선택적 꼬리질문** — 평균 점수 < 4 **이고** 약점이 감지됐을 때만 followup_node 실행. 강한 답변은 꼬리질문 없이 통과
- **카테고리별 평가 축** — 기술·경험·컬처핏마다 다른 채점 기준 적용
- **대화 맥락 압축** — 최근 3턴은 그대로, 이전 턴은 키워드 + 주제 요약으로 압축 (`VERBATIM_TURNS = 3` in `session_manager.py`). 컨텍스트 초과 없이 대화 흐름 유지
- **성장 기록** — 세션별 종합 점수 추이, 최저 점수 질문 하이라이트, 히스토리 조회

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| LLM | OpenAI GPT-4o-mini |
| 임베딩 | OpenAI text-embedding-3-small |
| 에이전트 오케스트레이션 | LangGraph 0.2.28 |
| RAG / 벡터 DB | LangChain 0.2.16 + ChromaDB ≥ 0.5.0 |
| 백엔드 | FastAPI 0.111.0 + SQLAlchemy 2.0.30 (async) + asyncpg |
| 관계형 DB | PostgreSQL 16 |
| 프론트엔드 | React 18.3 + Vite 5.4 + Tailwind CSS 4 + Recharts 3.8 |
| 인프라 | Docker Compose + nginx (Alpine) |
| Eval 전용 | sentence-transformers / BAAI/bge-reranker-base |

---

## 아키텍처

### LangGraph 에이전트 그래프

```
사용자 답변
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  evaluator  │────▶│   followup   │────▶│    orchestrator     │
│  (채점)     │     │ (꼬리질문)   │     │ (다음 카테고리 /    │
└─────────────┘     └──────────────┘     │  세션 종료 결정)    │
                                          └──────┬──────────────┘
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                        ┌──────────┐      ┌──────────┐      ┌──────────┐
                        │technical │      │experience│      │ culture  │
                        └──────────┘      └──────────┘      └──────────┘
```

### RAG 파이프라인

```
사용자 문서 (PDF / GitHub / 텍스트)
           │  청크 분할 + 임베딩 (text-embedding-3-small)
           ▼
      ChromaDB  ◀── "documents" 컬렉션 (프로덕션)
           │         "eval_documents" 컬렉션 (eval 전용, 격리)
           │  similarity_search(k=5)
           ▼
   evaluator.py / question_gen.py  ◀── rubric 검색 ("rubrics" 컬렉션)
           │
           ▼
     LangGraph 그래프 ──▶ FastAPI ──▶ React 프론트엔드
```

### 세션 컨텍스트 관리

```python
# session_manager.py
VERBATIM_TURNS = 3          # 최근 N턴은 원문 그대로
# 이전 턴 → 키워드 추출 + 주제 요약 문자열로 압축
```

---

## 평가 (Evaluation) & 설계 결정

단순 기능 검증이 아니라, 측정 결과를 직접 아키텍처·프롬프트 결정에 반영한다는 원칙으로 구축했다.

### (a) Retrieval Evaluation

**셋업**
- 6명의 가상 개발자 페르소나 (Python 백엔드, React 프론트엔드, ML 엔지니어, 데이터 엔지니어, DevOps/SRE, 풀스택) → 37개 청크
- `eval_documents` 컬렉션에 인덱싱 (프로덕션 `documents`와 완전 분리)
- LLM으로 청크당 면접 질문 1개 역생성; 청크 ID 명시적 부여 (`{페르소나명}_chunk_{i}`)
- 지표: **Hit-rate@k**, **MRR**

**벡터 검색 baseline (text-embedding-3-small)**

| k | Hit-rate | MRR |
|---|---|---|
| 5 | 78.4% | 0.591 |
| **8** | **86.5%** | **0.602** |
| 12 | 89.2% | 0.605 |

**Reranker 실험 — BAAI/bge-reranker-base (cross-encoder, 다국어)**

벡터 검색으로 `k_initial`개 후보 추출 → reranker 재정렬 → 상위 8개 반환.

| k_initial | Hit-rate@8 | MRR | Δ MRR | Baseline miss 커버 |
|---|---|---|---|---|
| 10 | 89.2% | 0.620 | +0.018 | 1/5 |
| **15** | **86.5%** | **0.629** | **+0.027** | **3/5** |
| 20 | 86.5% | 0.606 | +0.004 | 3/5 |

전체 청크가 37개뿐이라 `k_initial=20`은 전체의 54%를 후보로 올리는 셈 — hit-rate 수치가 reranker 효과가 아닌 candidate recall 증가 때문에 올라갈 수 있다. MRR 델타와 miss 커버 수가 실질 지표다. `k_initial=15`가 두 지표 모두에서 가장 좋다.

**결정**: Δ MRR +0.027 개선이 278 MB 모델을 서빙 경로에 추가하는 지연·메모리 비용을 정당화하지 않는다. **Reranker는 eval 전용; 프로덕션은 벡터 검색만 사용.**

---

### (b) LLM Judge Evaluation

**셋업**
- 50개 골든셋: technical 18개 + experience 16개 + culture 16개
- 답변 유형: `no-answer` × 12, `off-topic` × 12, `verbose-empty` × 12, `model` × 7, `average` × 7 — 엣지 케이스 비중을 높게 설계
- 축별 점수 1~5, 사람이 검토한 reference 라벨
- 항목당 3회 반복 평가 (n=150 LLM 호출) — reliability 측정
- 지표: exact-match, ±1 허용 일치율, Pearson r, bias (judge − human)

**수정 전 (`judge_n3`)**

| 축 | Exact | ±1 | Pearson r | Bias |
|---|---|---|---|---|
| clarity | 52% | 68% | 0.663 | **+0.88** |
| specific | 64% | 86% | 0.821 | +0.51 |
| technical | 56% | 74% | 0.751 | +0.75 |

엣지 케이스 judge 점수 (reference ≈ 1점):

| 답변 유형 | clarity | specific | technical |
|---|---|---|---|
| no-answer | **1.00** ✓ | **1.00** ✓ | **1.00** ✓ |
| off-topic | 2.11 | 1.28 | 1.58 |
| **verbose-empty** | **3.78** ✗ | **2.58** ✗ | **3.03** ✗ |
| model | 4.86 ✓ | 4.86 ✓ | 4.86 ✓ |

**발견**: verbose-empty — 길고 유창하지만 알맹이 없는 답변 — 에 clarity 3.78점을 줬다. judge가 문장의 유창함과 길이를 품질 신호로 오해한 것. no-answer 탐지는 기존 프롬프트 규칙 덕분에 이미 완벽.

**수정**: `evaluator.py` `_COMMON_SYSTEM`에 게이팅 규칙 4개 추가
1. 점수 근거 = 구체적 사실·예시·수치·실제 행동. 길이·유창함·톤·전문용어 나열은 근거 아님
2. 버즈워드 나열·일반론·당위론·정의만 반복하면 길이와 무관하게 1~2점
3. clarity = "질문에 답했는가", "문장이 유창한가"가 아님. 동문서답이면 표현이 또렷해도 1~2점
4. 길면서 구체적이면 (원리+예시+수치) 높은 점수 유지. 길이 자체는 감점 사유 아님

**수정 후 (`judge_v2`)**

| 축 | Exact | ±1 | Pearson r | Bias |
|---|---|---|---|---|
| clarity | 52% | **88%** | **0.868** | **+0.32** |
| specific | 72% | **96%** | **0.915** | +0.21 |
| technical | 72% | **90%** | **0.897** | +0.39 |

엣지 케이스 before/after:

| 답변 유형 | 축 | 수정 전 | 수정 후 | Δ |
|---|---|---|---|---|
| verbose-empty | clarity | 3.78 | **2.39** | −1.39 |
| verbose-empty | specific | 2.58 | **1.58** | −1.00 |
| verbose-empty | technical | 3.03 | **1.92** | −1.11 |
| off-topic | clarity | 2.11 | **1.44** | −0.67 |
| no-answer | clarity | 1.00 | **1.00** | 0.00 ✓ |
| model | clarity | 4.86 | **4.86** | 0.00 ✓ |

Reliability (항목별 std 평균, n=3): **0.044 → 0.035**.

---

### (c) Eval 재현 명령어

```bash
cd backend
pip install -r requirements-eval.txt   # sentence-transformers (eval 전용)

# Retrieval eval
python scripts/build_eval_index.py
python scripts/generate_eval_set.py
python scripts/eval_retrieval.py --k 8
python scripts/eval_retrieval.py --k 8 --method reranked --sweep --compare baseline

# Judge eval
python scripts/eval_judge.py --n 3 --label judge_v2 --compare judge_n3
```

---

## 디렉터리 구조

```
InterviewAI/
├── backend/
│   ├── services/
│   │   ├── evaluator.py          # 카테고리별 LLM judge (3가지 축 세트)
│   │   ├── interview_graph.py    # LangGraph 6 노드 에이전트 그래프
│   │   ├── question_gen.py       # RAG + JD 기반 질문 생성
│   │   ├── rag.py                # ChromaDB 검색 (프로덕션 + eval)
│   │   ├── rubrics.py            # 루브릭 검색
│   │   └── session_manager.py    # 컨텍스트 압축 (VERBATIM_TURNS=3)
│   ├── routes/
│   │   ├── sessions.py           # /start /turn /finish /report
│   │   ├── ask.py                # 면접관에게 질문 엔드포인트
│   │   ├── history.py            # 세션 히스토리
│   │   └── documents.py          # 문서 업로드/인덱싱
│   ├── eval/
│   │   ├── golden_set.json       # judge eval 골든셋 50개
│   │   ├── retrieval_eval.json   # retrieval eval 골든셋 37개
│   │   ├── sample_resumes/       # 가상 개발자 페르소나 6개
│   │   └── results/              # eval 결과 JSON (커밋됨)
│   ├── scripts/
│   │   ├── eval_judge.py
│   │   ├── eval_retrieval.py
│   │   ├── build_eval_index.py
│   │   ├── generate_eval_set.py
│   │   └── seed_rubrics.py
│   ├── requirements.txt
│   └── requirements-eval.txt     # sentence-transformers (eval 전용, Docker 이미지 미포함)
├── frontend/src/components/
├── nginx/
│   ├── nginx.http.conf
│   └── nginx.https.conf
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## 셋업 / 빠른 시작

### 환경 변수

```bash
cp .env.example .env
# 아래 값 채워넣기:
OPENAI_API_KEY=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DB_URL=
```

### 프로덕션 (Docker Compose)

```bash
docker compose -f docker-compose.prod.yml up -d --build
# PostgreSQL 16, FastAPI 백엔드, Vite 빌드, nginx (:80/:443)
```

### 로컬 개발

```bash
# 백엔드
cd backend
pip install -r requirements.txt
python scripts/seed_rubrics.py      # 최초 1회 루브릭 시딩
uvicorn main:app --reload

# 프론트엔드
cd frontend
npm install
npm run dev
```

---

## 참고

- **Reranker는 eval 전용.** `BAAI/bge-reranker-base`는 `requirements-eval.txt`에만 있고 프로덕션 Docker 이미지에 포함되지 않는다. `rag.py`의 `_get_reranker()`는 lazy import라 앱 기동 시 오류 없이 동작한다.
- `eval_documents` ChromaDB 컬렉션은 프로덕션 `documents` 컬렉션과 완전히 분리되어 있다. eval 스크립트는 사용자 데이터를 읽거나 쓰지 않는다.
