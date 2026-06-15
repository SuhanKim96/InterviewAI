# InterviewAI — Project Summary (Fact-Checked)

> All figures and implementation details pulled directly from source files.
> Numbers quoted from JSON results verbatim.
> Items marked **[README claim, unverified]** appear in README.md but were not independently confirmed from code or data files.

---

## 1. One-Line Definition

A full-stack web application that ingests a resume (PDF) and job description, generates tailored interview questions per question type (technical / experience / culture fit), conducts a stateful multi-turn mock interview with rubric-based LLM scoring and conditional follow-up questions, and tracks per-criterion score trends across sessions.

---

## 2. Tech Stack

_Source: `backend/requirements.txt`, `frontend/package.json`, confirmed in service files_

### Backend
| Package | Pinned version |
|---------|---------------|
| fastapi | 0.111.0 |
| uvicorn[standard] | 0.29.0 |
| sqlalchemy | 2.0.30 |
| asyncpg | 0.29.0 |
| pdfplumber | 0.10.4 |
| langchain | 0.2.16 |
| langchain-openai | 0.1.23 |
| langchain-chroma | 0.1.4 |
| langgraph | 0.2.28 |
| chromadb | >=0.5.0,<0.6.0 |
| pydantic-settings | 2.2.1 |

**LLM**: GPT-4o-mini throughout (confirmed in `interview_graph.py`, `evaluator.py`, `question_gen.py`, `session_manager.py`, `routes/ask.py`).  
**Embedding**: `text-embedding-3-small` via `OpenAIEmbeddings` (confirmed in `services/rag.py:8`, `services/rubrics.py:12`).  
**Reranker** (eval only, not in prod): `BAAI/bge-reranker-base` CrossEncoder via `sentence_transformers` — lazy-loaded in `rag.py:86-89` to avoid torch loading at app start.

### Frontend
| Package | Version |
|---------|---------|
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| recharts | ^3.8.1 |
| tailwindcss (via @tailwindcss/vite) | ^4.0.0 |
| vite | ^5.4.0 |

No React Router (routing is manual step-state in App.jsx), no state management library, no i18n library (hand-rolled `strings.js` object).

---

## 3. Database Schema

_Source: `backend/models.py`_

Three SQLAlchemy ORM models, async (`asyncpg` driver):

**`sessions`**

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| company | String(255) | nullable |
| role | String(255) | nullable |
| jd_text | Text | NOT NULL |
| status | String(20) | default "active" |
| difficulty | String(20) | "신입"/"주니어"/"시니어" |
| types_json | Text | JSON array e.g. `["technical","experience"]` |
| total_planned | Integer | count × len(types) |
| language | String(5) | server_default "ko" |
| summary | Text | LLM-generated final report |
| created_at | DateTime | |

**`questions`**

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| session_id | FK → sessions | CASCADE delete |
| category | String(50) | "technical"/"experience"/"culture"/"follow_up" |
| question | Text | NOT NULL |
| intent | Text | interviewer's intent (from question_gen) |
| related_to | Text | resume project name referenced |
| sequence | Integer | nullable — null for follow-up questions |

**`answers`**

| Column | Type | Notes |
|--------|------|-------|
| id | Integer PK | |
| question_id | FK → questions | CASCADE delete |
| answer_text | Text | NOT NULL |
| score_clarity | Integer | 1–5 |
| score_specific | Integer | 1–5 |
| score_technical | Integer | 1–5 |
| strengths | Text | LLM output |
| weaknesses | Text | LLM output |
| improved_answer | Text | LLM output |
| follow_up | Text | follow-up question text |
| rubric_basis | Text | which rubric criteria were applied |

---

## 4. Vector Storage

_Source: `backend/services/rag.py`, `backend/services/rubrics.py`_

Two persistent ChromaDB collections in `./chroma_db/`:

| Collection | Purpose | Filter |
|-----------|---------|--------|
| `documents` | Resume/portfolio chunks for RAG context | `{source, name}` metadata |
| `rubrics` | Scoring rubric documents | `{category, name, language}` metadata |
| `eval_documents` | Eval-only: sample persona resumes | `{source, chunk_index}` metadata |

**Chunking** (documents collection): `RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)` — source: `rag.py:18`.

**Rubric category mapping** (`rubrics.py:6-10`):
```python
CATEGORY_MAP = {
    "technical":  ["technical", "example_technical"],
    "experience": ["experience", "example_experience"],
    "culture":    ["experience"],   # culture questions use experience rubrics
}
```
Culture category deliberately reuses experience rubrics — no separate culture rubric type exists.

**Rubric retrieval** (`rubrics.py:24-38`): Per question category, iterates over mapped rubric categories, runs `similarity_search` per sub-category with `$and` filter `[{category: $eq cat}, {language: $eq language}]`, deduplicates by content, returns up to k=3 total.

---

## 5. Architecture — Full Pipeline

### Document Ingestion

1. PDF upload → `pdfplumber` text extraction → `RecursiveCharacterTextSplitter` (500 chars, 50 overlap) → `OpenAIEmbeddings(text-embedding-3-small)` → ChromaDB `documents` collection.
2. Portfolio text (freeform) → same chunking/embedding pipeline.
3. GitHub URL parsing: **[README claim, unverified]** — no GitHub client code found in `services/`.

### Session Start (`POST /sessions/{id}/start`)

```
JD text → rag.search(jd_text, k=8) → top-8 experience chunks
↓
question_gen.generate(
    types=[first_type], count=1,
    language=body.language
) → GPT-4o-mini (temperature=0.7)
↓
JSON: { "technical": [{question, intent, related_to, category_reason}] }
↓
Question row inserted (sequence=1)
↓
StartResponse(question, total_planned)
```

### Per-Turn Flow (`POST /sessions/{id}/turn`)

Each turn invokes `interview_graph.run_turn()` which runs the compiled LangGraph.

```
answer_text
   │
   ▼
[evaluator_node]  — temperature=0.3
   RAG:
     rag.search(question, k=5)              → experience_chunks (5 chunks)
     rubrics.search_rubrics(question, k=3)  → rubric_chunks (3 docs, filtered by category+language)
   Prompt: system = _COMMON_SYSTEM + _AXIS_INSTRUCTIONS[category]
           user   = question + answer + experience_chunks + rubric_chunks + conversation_history
   Output JSON: {score_clarity, score_specific, score_technical,
                 strengths, weaknesses, improved_answer, rubric_basis}
   │
   ▼
[followup_node]  — temperature=0.6
   Condition: avg(scores) < 4.0  AND  weaknesses.strip() != ""
   If triggered → GPT-4o-mini → {question: "follow-up text"}
   If not       → follow_up = ""  (no LLM call)
   │
   ▼
[orchestrator_node]  — temperature=0.1
   Input: eval scores, strengths/weaknesses, types, types_used_counts,
          remaining budget, conversation_history
   Output: action ∈ {next_technical, next_experience, next_culture, end_session}

   Hard override rules (applied after LLM output):
   1. If remaining > 0 and LLM returns end_session → force next_{types[count % len]}
   2. If action = next_culture but "culture" not in types → replace with next_{types[%]}
   3. If culture in types AND types_used_counts["culture"] == 0 AND remaining > 1 → force next_culture
   │
   ▼ (conditional)
[technical_node / experience_node / culture_node]  — all call question_gen.generate()
   temperature=0.7, k=8 experience chunks from JD query
   Output: {next_question_data: {question, intent, related_to, category}}
   │
   ▼
END
```

### Conversation History Compression (`session_manager.py`)

`VERBATIM_TURNS = 3` (constant at `session_manager.py:12`).

- If total turns ≤ 3: all turns included verbatim as `[Turn N - category]\nQ: ...\nA: ...`.
- If total turns > 3: older turns are compressed to a single summary line:
  - Topics: first 40 chars of each old question, comma-joined.
  - Keywords: regex `[A-Za-z0-9]{4,}` on all old answer text, first 8 unique matches — approximates technical terms.
  - Format: `[이전 요약] N개 이전 질문 주제: {topics}. 주요 키워드: {keywords}.`
  - Last 3 turns appended verbatim after the summary.

### Session Finish (`POST /sessions/{id}/finish`)

All Q&A pulled from DB → formatted as full transcript → GPT-4o-mini (`_REPORT_PROMPT`, temperature=0.3) → 3–5 paragraph plain-text summary: overall impression → specific strengths (with answer citations) → areas for improvement → practice direction.

---

## 6. LLM Prompt Design

### Question Generation (`question_gen.py`)

Temperature: **0.7**.

System prompt defines three question categories with explicit anti-examples and a decision rule:
- **`technical`**: "이 기술이 뭔가?" — tests general knowledge of concepts/principles independent of the candidate's projects.
- **`experience`**: "당신이 뭘 했나?" — must reference a project name from the resume. Experience questions without a named project are prohibited.
- **`culture`**: values, collaboration, conflict resolution, motivation — must reflect JD culture keywords.

Self-classification enforced: output JSON includes `category_reason` field ("GlobaLog에서의 실제 경험을 묻고 있으므로 experience") forcing the LLM to justify its category assignment before finalizing each question.

Additional constraints: prohibits simple definition questions; prefers "why", "trade-off", and "design decision" angles; prohibits technology not mentioned in the JD.

For English mode: `"Respond in English. Generate all questions and descriptions in English.\n\n"` prepended to existing Korean system prompt.

Output JSON per type: `{question, intent, related_to, category_reason}`.

### Evaluator (`evaluator.py`)

Temperature: **0.3**.

Prompt = `_COMMON_SYSTEM` + `_AXIS_INSTRUCTIONS[category]`, concatenated into a single system message.

**`_COMMON_SYSTEM`** (9 rules, both KO and EN versions):
1. Score based on rubric; cite criteria in `rubric_basis`.
2. Constructive: always provide improvement direction alongside weaknesses.
3. `improved_answer` must stay within candidate's stated experience; 2–3 natural spoken sentences; no code/markdown/bullets.
4. If answer has no substantive content (idk, one or two words) → all scores = 1.
5. Scoring basis is concrete content only: specific facts, real examples, numbers, candidate's own actions. **Length, fluency, tone, buzzword count are not scoring criteria.**
6. Long answer with no substance (buzzwords, generalities, platitudes) → 1–2 regardless of length/fluency.
7. `clarity` measures whether the question was actually answered, not fluency. Off-topic → 1–2 even if articulate.
8. Long AND substantive (principle + example + number) → retains high score. Length alone is never penalized.
9. Return JSON only.

**`_AXIS_INSTRUCTIONS`** (per category):
- `technical`: clarity = logical delivery of key point; specific = accuracy of stated technical content (not resume level); technical = depth of understanding of principles/trade-offs/limitations.
- `experience`: clarity = SAR (Situation/Action/Result) structure; specific = concrete numbers, situations, personal role; technical = articulation of outcome and lessons.
- `culture`: clarity = logical expression of value; specific = authenticity/grounding in real experience; technical = alignment with JD's company culture/values.

User prompt contains: question, answer text, top-5 experience chunks, top-3 rubric chunks, last-3-turn history (compressed if longer).

JSON output: `{score_clarity, score_specific, score_technical, strengths, weaknesses, improved_answer, rubric_basis}`.

### Orchestrator (`interview_graph.py`)

Temperature: **0.1** (near-deterministic routing).

Input includes: current category/question, all three scores, strengths/weaknesses, allowed types, types_used_counts dict, remaining question budget, compressed conversation history.

### Follow-up Generator (`interview_graph.py`)

Temperature: **0.6**.

Only called when `avg_score < 4.0 AND weaknesses.strip() != ""` — otherwise the node returns immediately with `follow_up = ""` at zero LLM cost.

Constraints: must only reference the immediately preceding question and answer (not any earlier conversation turn); no repeating already-answered content; prefer "why", "how", "specifically" angles.

---

## 7. Eval Work

### 7a. LLM-Judge Harness (`backend/scripts/eval_judge.py`)

**CLI interface:**
```
python eval_judge.py --n 3 --mode all --label judge_v2 --compare judge_n3
```
- `--n`: number of repeated runs per item (for reliability measurement).
- `--mode`: `all` / `validity` / `reliability`.
- `--compare`: load a previously saved result JSON and print a side-by-side diff.

**Metrics computed** (`eval_judge.py:125-181`):
- **exact_match_rate**: `round(judge_mean) == human_label` (integer comparison after rounding mean of n runs).
- **within_1_rate**: `abs(judge_mean - human) <= 1.0`.
- **pearson_r**: standard Pearson correlation between judge means and human labels across all 50 items per axis.
- **bias**: `mean(judge_i - human_i)` — positive = judge scores higher than human.
- **avg_std**: mean standard deviation across items and axes for n > 1 runs — measures run-to-run consistency.
- **high_variance_items**: items where any axis std > 0.5.

---

**Golden set** (`backend/eval/golden_set.json`): **50 items**

| Category | idk | off_topic | verbose_empty | model | average | Total |
|----------|-----|-----------|---------------|-------|---------|-------|
| technical | 4 | 4 | 4 | 3 | 3 | 18 |
| experience | 4 | 4 | 4 | 2 | 2 | 16 |
| culture | 4 | 4 | 4 | 2 | 2 | 16 |
| **Total** | **12** | **12** | **12** | **7** | **7** | **50** |

All 50 items have human labels. Questions sourced from 6 synthetic persona resumes (`persona_a` through `persona_f`), covering: Python backend, React frontend, ML engineer, data engineer, DevOps/SRE, full-stack.

---

**Experiment 1 — `judge_baseline`** (n_runs=1, temperature=0.3, prompt v1)

| Axis | exact_match | within_±1 | pearson_r | bias | mean_judge | mean_human |
|------|------------|-----------|-----------|------|-----------|-----------|
| clarity | 0.50 | 0.70 | 0.6625 | +0.86 | 2.86 | 2.0 |
| specific | 0.64 | 0.86 | 0.8214 | +0.50 | 2.32 | 1.82 |
| technical | 0.58 | 0.74 | 0.7520 | +0.74 | 2.46 | 1.72 |

verbose_empty mean judge scores (human ground truth ≈ 1–2):

| | clarity | specific | technical |
|-|---------|---------|---------|
| judge | 3.75 | 2.50 | 3.00 |
| human | ~1–2 | ~1–2 | ~1–2 |

**Finding**: verbose_empty items (long, fluent answers with no concrete content) were over-scored by ~1.5–2 points. Also `within_1` clarity was only 70%, indicating frequent ±2 errors on that axis.

---

**Experiment 2 — `judge_n3`** (n_runs=3, same prompts, reliability baseline)

| Axis | exact_match | within_±1 | pearson_r | bias | avg_std |
|------|------------|-----------|-----------|------|---------|
| clarity | 0.52 | 0.68 | 0.6634 | +0.88 | — |
| specific | 0.64 | 0.86 | 0.8211 | +0.5133 | — |
| technical | 0.56 | 0.74 | 0.7511 | +0.7533 | — |
| **all axes** | | | | | **0.044** |

9 high-variance items (std > 0 threshold as coded). verbose_empty barely changed (clarity=3.778, specific=2.583, technical=3.028), confirming the bias is a systematic prompt problem, not sampling variance.

---

**Experiment 3 — `judge_v2`** (n_runs=3, verbose_empty gating rules added)

Prompt additions to `_COMMON_SYSTEM` (4 new rules targeting verbose_empty and off-topic):
- Explicit length-irrelevance: buzzword answers score 1–2 regardless of length.
- Explicit content-only criterion: length, fluency, tone, buzzword count explicitly excluded as scoring criteria.
- Explicit clarity redefinition: "does the question get answered" not "is it well-phrased".
- Off-topic protection: articulate but off-topic answers score 1–2.

| Axis | exact_match | within_±1 | pearson_r | bias | avg_std |
|------|------------|-----------|-----------|------|---------|
| clarity | 0.52 | **0.88** (+18pp) | **0.8678** (+0.205) | **+0.32** (−0.54) | — |
| specific | **0.72** (+8pp) | **0.96** (+10pp) | **0.9152** (+0.094) | **+0.2067** (−0.293) | — |
| technical | **0.72** (+16pp) | **0.90** (+16pp) | **0.8974** (+0.145) | **+0.3933** (−0.347) | — |
| **all axes** | | | | | **0.0346** (−0.0094) |

verbose_empty before → after:

| Axis | n3 (pre-fix) | v2 (post-fix) | Δ |
|------|-------------|--------------|---|
| clarity | 3.778 | 2.389 | −1.389 |
| specific | 2.583 | 1.583 | −1.000 |
| technical | 3.028 | 1.917 | −1.111 |
| **mean across axes** | **3.130** | **1.963** | **−1.167** |

Other answer types were not degraded (idk stayed at 1.0, model stayed at 4.857, off_topic improved slightly).

---

### 7b. Retrieval Eval (`backend/scripts/eval_retrieval.py`)

37 questions generated from 6 sample persona resumes (36 distinct ground-truth chunks).  
Embedding: same `text-embedding-3-small` model as production.  
Reranker (eval only): `BAAI/bge-reranker-base` CrossEncoder, lazy-loaded.

| Config | Initial fetch | Final k | hit_rate | MRR | Δ hit vs baseline k=8 |
|--------|--------------|---------|----------|-----|----------------------|
| baseline | — | 5 | 0.7838 | 0.5910 | −8.11pp |
| **baseline** | — | **8** | **0.8649** | **0.6021** | **(prod)** |
| baseline | — | 12 | 0.8919 | 0.6051 | +2.70pp |
| reranked | 10 | 8 | 0.8919 | 0.6199 | +2.70pp |
| reranked | 15 | 8 | 0.8649 | **0.6289** | 0.00pp |
| reranked | 20 | 8 | 0.8649 | 0.6057 | 0.00pp |

**Decision**: production uses baseline k=8 (hit_rate 86.49%, MRR 0.6021). See Section 9 for rationale.

---

## 8. i18n Implementation

_Source: `frontend/src/strings.js`, `backend/services/evaluator.py`, `backend/services/question_gen.py`, `backend/services/rubrics.py`, `backend/services/interview_graph.py`_

### Frontend

`strings.js` exports `DIFFICULTIES = ['신입', '주니어', '시니어']` (internal backend values) and `T = { ko: {...}, en: {...} }`.

`lang` state in `App.jsx` (`useState('ko')`), toggled via Navbar button, prop-drilled to every component. All user-visible text — including dynamic strings (e.g. `questionOf: (i, total) => \`질문 ${i} / ${total}\``) — goes through `T[lang].key`. No library.

### Backend

`Session.language` (VARCHAR 5, `server_default="ko"`) stored in PostgreSQL.

Propagation path:
```
/start body.language
  → session.language (DB)
  → question_gen.generate(language=body.language)     ← bug fix: was missing

/turn
  → run_turn(language=session.language or "ko")
  → InterviewState["language"]
  → evaluator_node  → evaluate(language=)
  → followup_node   → prompt prefix injection ("Respond in English.\n")
  → orchestrator_node (JSON output only, no language-specific text)
  → interviewer_node → question_gen.generate(language=)

/ask
  → session.language → _PROMPT_EN vs _PROMPT
```

**Evaluator**: separate `_COMMON_SYSTEM` / `_COMMON_SYSTEM_EN` (identical rules, different language), separate `_AXIS_INSTRUCTIONS` / `_AXIS_INSTRUCTIONS_EN`, separate `_USER_TEMPLATE` / `_USER_TEMPLATE_EN`. `_build_prompt(category, language)` selects the full set.

**Question generator**: Korean mode uses the full system prompt as-is. English mode prepends `"Respond in English. Generate all questions and descriptions in English.\n\n"` to the existing Korean system prompt (reuses same structure, avoids maintaining a separate full prompt).

**Rubrics**: ChromaDB filter is `{$and: [{category: {$eq: cat}}, {language: {$eq: language}}]}`. English rubrics (`RUBRICS_EN` in `seed_rubrics.py`) are separate entries; running `seed_rubrics.py` resets the collection and reseeds all ko + en entries.

**Follow-up**: English prefix injected at runtime into the existing Korean prompt template rather than maintaining a separate EN prompt.

---

## 9. Deployment

_Source: `docker-compose.prod.yml`, `.github/workflows/deploy.yml`_

### Docker Compose (prod) — 4 services

| Service | Image | Key config |
|---------|-------|-----------|
| `db` | postgres:16 | healthcheck: `pg_isready -q`, interval 5 s, 10 retries |
| `backend` | ./backend (build) | `DB_URL` injected; mounts `chroma_data` volume |
| `frontend` | ./frontend (build) | Vite static build served by nginx |
| `nginx` | nginx:alpine | Ports 80, 443; mounts `nginx.http.conf` |

Volumes: `postgres_data`, `chroma_data`, `certbot-www`, `certbot-etc`. The `certbot-*` volumes exist (for Let's Encrypt), but the active nginx config is `nginx.http.conf` — HTTPS is prepared but not activated.

Backend connects to db via service hostname `db:5432` (`DB_URL` env var). `env_file: .env` mounts `.env` for `OPENAI_API_KEY` and other secrets.

### CI/CD (`deploy.yml`)

- Trigger: `push` to `main`.
- Runner: `ubuntu-latest`.
- Action: `appleboy/ssh-action@v1.0.3`.
- Remote script (on EC2):
  1. `git pull origin main`
  2. `docker compose -f docker-compose.prod.yml up -d --build`
  3. `docker system prune -f --volumes=false`
  4. Health-check retry loop: 12 iterations × 5 s sleep = 60 s max, polling `http://localhost/api/health`; exits 0 on first success, exits 1 if all 12 fail.
- Secrets: `EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY`.

---

## 10. Key Engineering Decisions

### Reranker measured; not deployed

Best reranker result (fetch-10, rerank-to-8): hit_rate 0.8919 (+2.70pp), MRR 0.6199 (+0.018) vs baseline k=8. However, baseline k=12 achieves the same 0.8919 hit_rate (MRR 0.6051 — slightly lower, but within noise). Adding the reranker requires loading a cross-encoder model (`BAAI/bge-reranker-base`, via `sentence_transformers`) at inference time, adding latency for a +0.018 MRR gain that equivalently can be obtained by a retrieval k increase. Production stays at baseline k=8.

### Prompt engineering over fine-tuning

Verbose_empty gating: 4 rules added to `_COMMON_SYSTEM` moved verbose_empty mean judge score from 3.13 to 1.96 across axes, and moved `within_±1` on clarity from 70% to 88%. This level of improvement from prompt changes alone made fine-tuning unnecessary for the current evaluation requirements.

### verbose_empty gating — root cause and fix

Baseline judge consistently awarded 3–4 points to long, fluent answers that contained only buzzwords or definitions (e.g. "performance and scalability are critical considerations in modern distributed systems…" — no concrete content). The judge was implicitly rewarding fluency and length. Four negative constraints were made explicit in the prompt. After v2, these items now score 1.58–2.39, matching human labels of 1–2.

### conversation history sliding window

Long sessions would overflow prompt context if all prior Q&A were included verbatim. `VERBATIM_TURNS = 3` keeps only the 3 most recent turns verbatim, compressing older turns to a single summary line using: (a) first 40 chars of each old question for topic coverage, and (b) regex `[A-Za-z0-9]{4,}` on old answers to extract likely technical keywords. This is a lightweight heuristic, not LLM-based summarization.

### followup_node cost gate

Follow-up LLM call is skipped when `avg_score >= 4.0` or `weaknesses` is empty — avoiding one GPT-4o-mini call per turn for strong answers, which represent a significant portion of real usage.

### orchestrator hard overrides

The orchestrator LLM runs at temperature 0.1 but its output is still subject to three hard-coded post-processing rules (never end early, never pick a disallowed type, always use culture at least once if in session types). This prevents the LLM from making structurally invalid routing decisions regardless of its output.

---

## Appendix: File Index

| File | Role |
|------|------|
| `backend/models.py` | SQLAlchemy ORM (Session, Question, Answer) |
| `backend/services/rag.py` | ChromaDB `documents` collection + eval store + reranker |
| `backend/services/rubrics.py` | ChromaDB `rubrics` collection, category→rubric-type mapping |
| `backend/services/evaluator.py` | LLM judge: prompts, RAG injection, JSON parse |
| `backend/services/question_gen.py` | Question generation with category self-classification |
| `backend/services/interview_graph.py` | LangGraph 6-node pipeline |
| `backend/services/session_manager.py` | History compression (VERBATIM_TURNS=3), report generation |
| `backend/routes/sessions.py` | /start, /turn, /finish, /report endpoints |
| `backend/routes/ask.py` | Recruiter Q&A endpoint |
| `backend/eval/golden_set.json` | 50-item human-labeled eval set |
| `backend/eval/results/judge_baseline.json` | Baseline evaluator (n_runs=1) |
| `backend/eval/results/judge_n3.json` | Baseline × 3 runs (reliability) |
| `backend/eval/results/judge_v2.json` | v2 evaluator (n_runs=3, gating rules) |
| `backend/eval/results/baseline*.json` | Retrieval hit_rate/MRR at k=5,8,12 |
| `backend/eval/results/reranked_k*.json` | Retrieval with reranker at k_initial=10,15,20 |
| `backend/eval/retrieval_eval.json` | 37-question retrieval ground truth |
| `backend/scripts/eval_judge.py` | Judge harness CLI (--n, --mode, --label, --compare) |
| `backend/scripts/eval_retrieval.py` | Retrieval eval harness |
| `backend/scripts/seed_rubrics.py` | Resets and reseeds ko+en rubrics into ChromaDB |
| `backend/scripts/smoke_test_en.py` | English evaluator smoke test (6 cases) |
| `frontend/src/strings.js` | i18n string table (ko + en), DIFFICULTIES constant |
| `docker-compose.prod.yml` | 4-service production stack |
| `.github/workflows/deploy.yml` | SSH-based CD to EC2 (health-check retry loop) |
