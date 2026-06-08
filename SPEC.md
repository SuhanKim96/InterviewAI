# Interview Coach Agent — Project Specification

> 이 문서를 Claude Code에 넣고 시작하세요. 한 번에 다 만들지 말고, "Phase 1부터 시작하자"고 지시하세요.

---

## 0. Project Overview

**무엇을 만드나:** 이력서/포트폴리오와 채용공고(JD)를 입력하면, 그 둘에 맞춤형 면접 예상 질문을 생성하고, 사용자의 답변을 평가해 피드백·점수를 주고, 답변 기록을 저장해 성장 추이를 보여주는 웹 앱.

**차별점 (단순 챗봇과 다른 점):**
- 사용자의 실제 이력서/포트폴리오/GitHub를 RAG로 인덱싱해, 질문이 "내 경험"에 근거함
- JD의 요구 기술과 내 경험을 매칭해 질문을 생성 (기술 질문 + 경험 기반 질문)
- 답변 평가 루프 + 시계열 성장 추적

**핵심 사용자:** 구직 중인 개발자 (본인). 신입~주니어 타겟.

---

## 1. Tech Stack

```
Frontend:    React (Vite) + Recharts (성장 그래프)
Backend:     FastAPI (Python)
Database:    PostgreSQL (Docker 컨테이너)
Vector DB:   Chroma (로컬 파일, ./chroma_db)
LLM:         OpenAI GPT-4o mini (질문 생성 / 답변 평가)
Embedding:   OpenAI text-embedding-3-small
Framework:   LangChain (LLM 체인 + RAG)
PDF parsing: pdfplumber 또는 pypdf
GitHub:      GitHub REST API (README + 언어 구성만 가볍게)
Deployment:  로컬 Docker 우선 → 나중에 AWS EC2/RDS (선택)
```

**원칙:** 처음엔 전부 로컬(Docker Compose)에서 개발. AWS 배포는 완성 후 선택사항.

---

## 2. Architecture

```
┌─────────────────────────────────────────────┐
│ React (Vite)                                  │
│  - 문서 업로드 (이력서 PDF, 포트폴리오 텍스트)   │
│  - JD 입력 + 질문 생성 옵션 (난이도/유형/개수)   │
│  - 질문 표시 → 답변 입력                        │
│  - 피드백/점수 표시                            │
│  - 성장 추적 그래프 (Recharts)                  │
└─────────────────────────────────────────────┘
                  ↓ REST API (JSON)
┌─────────────────────────────────────────────┐
│ FastAPI                                       │
│  POST /documents     문서 인덱싱 (RAG)         │
│  POST /questions     JD → 맞춤 질문 생성        │
│  POST /answers       답변 → 피드백+점수         │
│  GET  /history       답변 기록 + 성장 데이터     │
│  GET  /sessions      세션(JD별) 목록            │
└─────────────────────────────────────────────┘
        ↓                          ↓
┌──────────────────┐    ┌────────────────────────┐
│ Chroma (벡터DB)   │    │ PostgreSQL              │
│ - 이력서 chunk     │    │ - sessions (JD별)       │
│ - 포트폴리오 chunk  │    │ - questions             │
│ - GitHub README   │    │ - answers (점수, 피드백) │
└──────────────────┘    └────────────────────────┘
        ↓
┌─────────────────────────────────────────────┐
│ OpenAI API (LLM + Embedding)                  │
└─────────────────────────────────────────────┘
```

**데이터 분리 원칙:**
- 벡터DB(Chroma) = 검색용. 이력서/포폴/GitHub 내용을 의미 기반으로 찾기 위함 (RAG retrieval).
- PostgreSQL = 구조화 데이터. 질문/답변/점수/날짜. 성장 추적은 시계열 조회라 관계형 DB가 적합.

---

## 3. Database Schema (PostgreSQL)

```sql
-- 면접 세션 (JD 하나 = 세션 하나)
CREATE TABLE sessions (
    id          SERIAL PRIMARY KEY,
    company     VARCHAR(255),
    role        VARCHAR(255),
    jd_text     TEXT NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 생성된 질문
CREATE TABLE questions (
    id          SERIAL PRIMARY KEY,
    session_id  INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    category    VARCHAR(50),   -- 'technical' | 'experience' | 'culture'
    question    TEXT NOT NULL,
    intent      TEXT,          -- 이 질문을 왜 묻는지
    related_to  TEXT,          -- JD의 어떤 요구 / 어떤 프로젝트와 연결
    created_at  TIMESTAMP DEFAULT NOW()
);

-- 사용자 답변 + 평가
CREATE TABLE answers (
    id              SERIAL PRIMARY KEY,
    question_id     INTEGER REFERENCES questions(id) ON DELETE CASCADE,
    answer_text     TEXT NOT NULL,
    score_clarity   INTEGER,   -- 1-5 명확성
    score_specific  INTEGER,   -- 1-5 구체성
    score_technical INTEGER,   -- 1-5 기술 정확성
    strengths       TEXT,
    weaknesses      TEXT,
    improved_answer TEXT,      -- LLM이 제안하는 모범 답안
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 4. RAG: Document Indexing

### 처리 대상
1. **이력서 PDF** — pdfplumber로 텍스트 추출
2. **포트폴리오 텍스트** — 직접 붙여넣기 또는 .md 업로드
3. **GitHub 링크** — 이력서/포폴에서 정규식으로 `github.com/{user}/{repo}` 추출

### GitHub 처리 (가볍게)
```
이력서에서 github.com URL 추출
→ GitHub REST API 호출:
   GET /repos/{owner}/{repo}        → description, language, topics
   GET /repos/{owner}/{repo}/readme → README 내용 (base64 디코드)
→ "프로젝트명 + 설명 + 주요 언어 + README 요약"을 하나의 chunk로
```
- 인증: 환경변수 `GITHUB_TOKEN` 있으면 사용 (rate limit 60→5000/hr). 없어도 동작.
- 전체 코드 분석은 하지 않음 (과하고, CLI AI와 차별화 안 됨). README + 언어 구성 정도만.

### Chunking 전략
- 이력서/포폴: 섹션/프로젝트 단위로 분할 (RecursiveCharacterTextSplitter, chunk_size~500, overlap~50)
- 각 chunk 메타데이터: `{ "source": "resume" | "portfolio" | "github", "name": "프로젝트명" }`

### 저장
- 각 chunk → text-embedding-3-small로 embedding → Chroma에 저장 (메타데이터 포함)

---

## 5. Feature: 맞춤 질문 생성

### 흐름
```
1. 사용자가 JD 입력 + 옵션 선택 (난이도, 유형, 개수)
2. LLM으로 JD에서 핵심 요구사항/기술 추출
3. 추출된 키워드로 Chroma에서 관련 이력서/포폴/GitHub chunk 검색 (RAG)
4. [JD 요구사항 + 검색된 내 경험]을 LLM에 전달해 질문 생성
5. 질문을 PostgreSQL의 questions 테이블에 저장 + 프론트로 반환
```

### 질문 2종류
- **기술 질문(technical):** JD의 요구 기술 기반. 예: "Spring의 @Transactional 전파 속성을 설명해보세요."
- **경험 질문(experience):** 내 실제 프로젝트 기반. 예: "GlobaLog에서 외부 환율 API 장애에 어떻게 대응했나요?"

### 커스텀 옵션 (프롬프트에 동적 삽입)
```
난이도:   신입 / 주니어 / 시니어
유형:     기술 / 경험 / 컬처핏 (다중 선택)
개수:     유형별 N개
```

### 출력 포맷 강제 (JSON)
LLM이 반드시 아래 JSON만 반환하도록 프롬프트에 명시. (파싱 후 DB 저장 + React 렌더링)
```json
{
  "technical": [
    { "question": "...", "intent": "왜 묻는지", "related_to": "JD의 어떤 부분" }
  ],
  "experience": [
    { "question": "...", "intent": "왜 묻는지", "related_to": "어떤 프로젝트" }
  ]
}
```

### 프롬프트 설계 노트
- 시스템 역할: "당신은 {company}의 {role} 기술 면접관입니다."
- JD 핵심 요구와 지원자의 실제 경험을 **명시적으로 연결**하라고 지시
- 일반적인 질문 금지, 반드시 JD 또는 이력서 근거가 있는 질문만
- JSON 외 텍스트(머리말/마크다운 백틱) 출력 금지

### 질문 스타일 규칙 (system 프롬프트에 반영)
- 단순 암기 질문(정의 묻기)보다 '왜', '어떻게', 'trade-off'를 묻는 질문 우선.
- 가능하면 회사가 실제 사용하는 제품/기술 스택/도메인 맥락을 질문에 반영.
  단, JD에 드러난 정보를 근거로 하고, 확실하지 않은 정보는 지어내지 않는다.

---

## 6. Feature: 답변 평가

### 흐름
```
1. 사용자가 특정 질문에 답변 입력
2. [질문 + 답변 + 관련 이력서 chunk(RAG)]를 LLM에 전달
3. LLM이 평가 기준에 따라 채점 + 피드백 + 모범답안 생성
4. answers 테이블에 저장
```

### 평가 기준 (프롬프트에 명시)
- **명확성(clarity) 1-5:** 두괄식인가, 핵심이 분명한가
- **구체성(specificity) 1-5:** STAR 구조, 구체적 수치/사례가 있는가
- **기술 정확성(technical) 1-5:** 기술 설명이 정확한가 (경험 질문이면 N/A 가능)

### 출력 포맷 (JSON)
```json
{
  "score_clarity": 4,
  "score_specific": 3,
  "score_technical": 5,
  "strengths": "...",
  "weaknesses": "...",
  "improved_answer": "이렇게 답하면 더 좋습니다: ..."
}
```

### 주의
- 평가는 건설적으로. 약점 지적 시 개선 방향을 반드시 함께 제시.
- 사용자가 모르는 걸 답했을 때, 모범답안은 "사용자의 실제 경험 범위 안에서" 제안 (없는 경험을 지어내라고 하지 않기).

### 동적 Follow-up 질문 (방법 B)

답변 평가 시, 미리 만들어둔 꼬리질문이 아니라 **사용자의 실제 답변을
보고** 더 파고들 가치가 있을 때만 follow-up 질문을 생성한다.

- 답변이 충분/명확하면 follow_up은 빈 문자열("")로 둔다.
- 답변이 모호하거나, 더 깊이 확인할 기술적 지점이 있을 때만 1개 생성.
- 실제 면접관이 답변을 듣고 파고드는 흐름을 모방.

평가 응답 JSON에 follow_up 필드 추가:
```json
{
  "score_clarity": 4,
  "score_specific": 3,
  "score_technical": 5,
  "strengths": "...",
  "weaknesses": "...",
  "improved_answer": "...",
  "follow_up": "꼬리질문 또는 빈 문자열"
}
```

DB: answers 테이블에 follow_up 컬럼(TEXT, nullable) 추가.
주의: 질문 생성(Phase 3)에는 follow_up을 넣지 않는다. follow-up은
오직 답변 평가(Phase 4)에서 동적으로 생성한다.

---

## 7. Feature: 성장 추적

### 흐름
```
1. answers 테이블에서 시간순 점수 조회
2. 카테고리별(명확성/구체성/기술) 평균 점수 추이 계산
3. React에서 Recharts 라인 차트로 시각화
4. 가장 낮은 점수 영역을 "약점"으로 식별 → 그 영역 질문을 더 생성하도록 유도
```

### API
```
GET /history?session_id={id}
→ { answers: [...], score_trend: [{date, clarity, specific, technical}], weak_area: "specificity" }
```

---

## 8. API Endpoints (정리)

```
POST /documents
  body: { resume_pdf (file), portfolio_text (str, optional) }
  → 이력서/포폴/GitHub 인덱싱. returns { indexed_chunks: N, github_repos: [...] }

POST /sessions
  body: { company, role, jd_text }
  → 세션 생성. returns { session_id }

POST /questions
  body: { session_id, difficulty, types: [...], count }
  → 맞춤 질문 생성 + 저장. returns { technical: [...], experience: [...] }

POST /answers
  body: { question_id, answer_text }
  → 답변 평가 + 저장. returns { scores, strengths, weaknesses, improved_answer }

GET /history?session_id={id}
  → 답변 기록 + 성장 추이 + 약점 영역

GET /sessions
  → 세션 목록
```

---

## 9. Project Structure

```
interview-coach/
├── docker-compose.yml        # PostgreSQL 컨테이너
├── .env.example              # OPENAI_API_KEY, GITHUB_TOKEN, DB_URL
├── .gitignore                # .env, chroma_db/, __pycache__ 반드시 포함
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py               # FastAPI 엔트리, 라우터 등록
│   ├── config.py             # 환경변수 로드
│   ├── db.py                 # PostgreSQL 연결 (SQLAlchemy)
│   ├── models.py             # ORM 모델 (sessions, questions, answers)
│   ├── schemas.py            # Pydantic 요청/응답 스키마
│   ├── routes/
│   │   ├── documents.py      # 인덱싱
│   │   ├── sessions.py
│   │   ├── questions.py      # 질문 생성
│   │   └── answers.py        # 답변 평가
│   └── services/
│       ├── pdf_parser.py     # PDF 텍스트 추출
│       ├── github_fetch.py   # GitHub API 호출
│       ├── rag.py            # Chroma 인덱싱 + 검색
│       ├── question_gen.py   # LangChain 질문 생성 체인
│       └── evaluator.py      # LangChain 답변 평가 체인
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── api.js            # 백엔드 호출
        └── components/
            ├── DocumentUpload.jsx
            ├── JDInput.jsx
            ├── QuestionCard.jsx
            ├── AnswerFeedback.jsx
            └── GrowthChart.jsx
```

---

## 10. 개발 순서 (Phase별 — Claude Code에 이 순서대로 시키기)

### Phase 1 — 기반 셋업
- [ ] docker-compose.yml (PostgreSQL) + .env.example + .gitignore
- [ ] FastAPI 기본 구조, DB 연결, ORM 모델 + 테이블 생성
- [ ] 헬스체크 엔드포인트로 DB 연결 확인
- **검증:** `docker-compose up` 후 PostgreSQL 연결 OK, 테이블 생성됨

### Phase 2 — RAG 인덱싱
- [ ] PDF 텍스트 추출 (pdfplumber)
- [ ] GitHub README/언어 가져오기
- [ ] chunking + embedding + Chroma 저장
- [ ] POST /documents 완성
- **검증:** 이력서 업로드 → Chroma에 chunk 저장 확인, 검색 테스트

### Phase 3 — 질문 생성
- [ ] LangChain 질문 생성 체인 (JD 추출 → RAG 검색 → 질문 생성)
- [ ] JSON 출력 파싱 + DB 저장
- [ ] POST /questions 완성
- **검증:** JD 넣으면 내 경험 기반 질문이 JSON으로 나옴

### Phase 4 — 답변 평가
- [ ] LangChain 평가 체인
- [ ] POST /answers 완성, answers 테이블 저장
- **검증:** 답변 입력 → 점수+피드백+모범답안 반환

### Phase 5 — 프론트엔드
- [ ] React: 문서 업로드 → JD 입력 → 질문 표시 → 답변 → 피드백 흐름
- [ ] 질문 옵션 UI (난이도/유형/개수)
- **검증:** 브라우저에서 전체 흐름 동작

### Phase 6 — 성장 추적 + 마무리
- [ ] GET /history + Recharts 그래프
- [ ] 약점 영역 식별 → 해당 영역 질문 추가 생성
- [ ] README, 데모 영상, (선택) AWS 배포
- **검증:** 여러 번 답변 후 성장 그래프 표시

---

## 11. 중요 규칙 (Claude Code에 강조)

1. **API 키 보안:** `.env`에만 저장, `.gitignore`에 `.env`와 `chroma_db/` 반드시 포함. 키를 코드/커밋에 절대 넣지 말 것.
2. **LLM 비용 절감:** 개발 중엔 GPT-4o mini 사용. 프롬프트 캐싱 고려.
3. **JSON 출력 안정성:** LLM이 JSON 외 텍스트를 뱉을 수 있으니, 파싱 전 백틱/머리말 제거 + try/except 처리.
4. **에러 핸들링:** 외부 호출(OpenAI, GitHub, PDF 파싱) 전부 try/except + 명확한 에러 메시지.
5. **한 Phase씩:** 한 번에 다 만들지 말고 Phase 단위로 만들고 검증 후 다음으로.
6. **재현성:** requirements.txt 버전 고정, docker-compose로 환경 통일.

---

## 12. 첫 명령 예시 (Claude Code에 입력)

```
이 스펙으로 Interview Coach Agent를 만들 거야.
Phase 1부터 시작하자. docker-compose.yml(PostgreSQL),
FastAPI 기본 구조, ORM 모델, DB 연결, 헬스체크 엔드포인트까지 만들어줘.
.env.example과 .gitignore도 같이. 다 만들면 검증 방법 알려줘.
```
