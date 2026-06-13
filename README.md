# InterviewAI

AI-powered Korean technical interview coaching — upload your resume, practice with a multi-agent interviewer, and get rubric-grounded feedback with growth tracking.

_In Korean_: [README_KOR.md](README_KOR.md)

---

## Overview

InterviewAI takes your resume, portfolio, GitHub repositories, and a job description, then conducts a full mock interview session:

1. **Document ingestion** — PDF, plain text, or GitHub repos are chunked and embedded into ChromaDB via RAG
2. **Question generation** — questions are grounded in your actual experience and the JD, categorized as technical / experience / culture-fit
3. **Multi-turn interview** — a LangGraph agent graph evaluates each answer, generates targeted follow-up questions for weak responses, and decides the next question category
4. **Rubric-based scoring** — category-aware axes (e.g., technical: clarity + accuracy + depth; culture-fit: clarity + authenticity + value alignment)
5. **Session report** — LLM-generated summary with per-question scores and a growth trend chart

---

## Live Demo

`http://<EIP>`

<!-- screenshot placeholder -->

---

## Key Features

- **RAG-grounded questions** — questions cite your actual projects and the target JD; generic questions are explicitly rejected by the generation prompt
- **LangGraph multi-agent graph (6 nodes)** — `evaluator → followup → orchestrator → [technical | experience | culture]`; the orchestrator balances category distribution and enforces question budget
- **Adaptive follow-up** — `followup_node` generates a targeted follow-up only when the mean score < 4 **and** weaknesses are detected; strong answers skip it
- **Category-aware evaluation** — each category uses different scoring axes:
  - `technical`: clarity, technical accuracy, depth
  - `experience`: clarity, specificity, result
  - `culture`: clarity, authenticity, value-fit
- **Conversational context management** — the last 3 turns are kept verbatim; older turns are compressed into a keyword + topic summary (`VERBATIM_TURNS = 3` in `session_manager.py`) so the model stays context-aware without blowing the context window
- **Growth tracking** — per-session overall score trend, lowest-scoring question highlight, and inter-session history

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | OpenAI GPT-4o-mini |
| Embeddings | OpenAI text-embedding-3-small |
| Agent orchestration | LangGraph 0.2.28 |
| RAG / Vector store | LangChain 0.2.16 + ChromaDB ≥ 0.5.0 |
| Backend | FastAPI 0.111.0 + SQLAlchemy 2.0.30 (async) + asyncpg |
| Relational DB | PostgreSQL 16 |
| Frontend | React 18.3 + Vite 5.4 + Tailwind CSS 4 + Recharts 3.8 |
| Infrastructure | Docker Compose + nginx (Alpine) |
| Eval only | sentence-transformers / BAAI/bge-reranker-base |

---

## Architecture

### LangGraph Agent Graph

```
User answer
     │
     ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────────┐
│  evaluator  │────▶│   followup   │────▶│    orchestrator     │
│  (scoring)  │     │ (follow-up Q)│     │ (next category /    │
└─────────────┘     └──────────────┘     │   end session)      │
                                          └──────┬──────────────┘
                              ┌──────────────────┼──────────────────┐
                              ▼                  ▼                  ▼
                        ┌──────────┐      ┌──────────┐      ┌──────────┐
                        │technical │      │experience│      │ culture  │
                        └──────────┘      └──────────┘      └──────────┘
```

### RAG Pipeline

```
User documents (PDF / GitHub / text)
           │  chunk + embed (text-embedding-3-small)
           ▼
      ChromaDB  ◀── "documents" collection (production)
           │         "eval_documents" collection (eval only, isolated)
           │  similarity_search(k=5)
           ▼
   evaluator.py / question_gen.py  ◀── rubric retrieval ("rubrics" collection)
           │
           ▼
     LangGraph graph ──▶ FastAPI ──▶ React frontend
```

### Session Context Management

```python
# session_manager.py
VERBATIM_TURNS = 3          # last N turns kept as-is in the prompt
# older turns → keyword extraction + topic summary string
```

---

## Evaluation & Engineering Decisions

This project includes an offline eval harness to measure both retrieval quality and LLM judge reliability — not just to validate, but to drive concrete prompt and architecture decisions.

### (a) Retrieval Evaluation

**Setup**
- 6 synthetic developer personas (backend Python, frontend React, ML engineer, data engineer, DevOps/SRE, full-stack) → 37 chunks, indexed as `eval_documents` (isolated from production `documents`)
- LLM-generated interview questions per chunk; explicit chunk IDs (`{persona_stem}_chunk_{i}`) for deterministic matching
- Metrics: **Hit-rate@k**, **MRR**

**Baseline — vector search (text-embedding-3-small)**

| k | Hit-rate | MRR |
|---|---|---|
| 5 | 78.4% | 0.591 |
| **8** | **86.5%** | **0.602** |
| 12 | 89.2% | 0.605 |

**Reranker experiment — BAAI/bge-reranker-base (cross-encoder, multilingual)**

Vector retrieves `k_initial` candidates; reranker re-scores; top-8 returned.

| k_initial | Hit-rate@8 | MRR | Δ MRR | Baseline misses covered |
|---|---|---|---|---|
| 10 | 89.2% | 0.620 | +0.018 | 1/5 |
| **15** | **86.5%** | **0.629** | **+0.027** | **3/5** |
| 20 | 86.5% | 0.606 | +0.004 | 3/5 |

With 37 total chunks, `k_initial=20` retrieves > 50% of the corpus — inflating apparent recall without proving reranker quality. MRR delta and miss coverage are the meaningful signal. `k_initial=15` gives the best combination.

**Decision**: +0.027 MRR improvement does not justify adding a 278 MB cross-encoder to the serving path (first-call latency, memory overhead). **Reranker is eval-only; production uses vector search.**

---

### (b) LLM Judge Evaluation

**Setup**
- 50-item golden set: 18 technical + 16 experience + 16 culture-fit
- Answer types weighted toward edge cases: `no-answer` × 12, `off-topic` × 12, `verbose-empty` × 12, `model` × 7, `average` × 7
- Reference labels (1–5 per axis) from human review
- 3 runs per item (n=150 calls) for reliability measurement
- Metrics: exact-match rate, ±1 tolerance rate, Pearson r, mean bias (judge − human)

**Before (`judge_n3`)**

| Axis | Exact | ±1 | Pearson r | Bias |
|---|---|---|---|---|
| clarity | 52% | 68% | 0.663 | **+0.88** |
| specific | 64% | 86% | 0.821 | +0.51 |
| technical | 56% | 74% | 0.751 | +0.75 |

Edge-case judge scores (reference labels all ≈ 1):

| Answer type | clarity | specific | technical |
|---|---|---|---|
| no-answer | **1.00** ✓ | **1.00** ✓ | **1.00** ✓ |
| off-topic | 2.11 | 1.28 | 1.58 |
| **verbose-empty** | **3.78** ✗ | **2.58** ✗ | **3.03** ✗ |
| model | 4.86 ✓ | 4.86 ✓ | 4.86 ✓ |

**Finding**: `verbose-empty` answers — long, fluent, but content-free — received clarity 3.78. The judge was rewarding fluency and length rather than substance. No-answer detection was already perfect (an explicit prompt rule was already in place).

**Fix** — four gating rules added to `_COMMON_SYSTEM` in `evaluator.py`:
1. Score basis = concrete facts, examples, numbers, actual actions only; length / fluency / tone are not scoring criteria
2. Long answers with no substance (buzzwords, generalities, definitions only) → 1–2 regardless of length
3. Clarity = "did the answer address the question?", not "was the answer well-phrased?"; off-topic answers → 1–2 even if articulate
4. Long *and* substantive (principle + example + number) → retain high scores; length is not penalized

**After (`judge_v2`)**

| Axis | Exact | ±1 | Pearson r | Bias |
|---|---|---|---|---|
| clarity | 52% | **88%** | **0.868** | **+0.32** |
| specific | 72% | **96%** | **0.915** | +0.21 |
| technical | 72% | **90%** | **0.897** | +0.39 |

Edge-case scores after fix:

| Answer type | Axis | Before | After | Δ |
|---|---|---|---|---|
| verbose-empty | clarity | 3.78 | **2.39** | −1.39 |
| verbose-empty | specific | 2.58 | **1.58** | −1.00 |
| verbose-empty | technical | 3.03 | **1.92** | −1.11 |
| off-topic | clarity | 2.11 | **1.44** | −0.67 |
| no-answer | clarity | 1.00 | **1.00** | 0.00 ✓ |
| model | clarity | 4.86 | **4.86** | 0.00 ✓ |

Reliability (avg std across all items, n=3): **0.044 → 0.035**.

---

### (c) Reproducing Evaluations

```bash
cd backend
pip install -r requirements-eval.txt   # sentence-transformers (eval only)

# Retrieval eval
python scripts/build_eval_index.py
python scripts/generate_eval_set.py
python scripts/eval_retrieval.py --k 8
python scripts/eval_retrieval.py --k 8 --method reranked --sweep --compare baseline

# Judge eval
python scripts/eval_judge.py --n 3 --label judge_v2 --compare judge_n3
```

---

## Repository Structure

```
InterviewAI/
├── backend/
│   ├── services/
│   │   ├── evaluator.py          # category-aware LLM judge (3 axis sets)
│   │   ├── interview_graph.py    # LangGraph 6-node agent graph
│   │   ├── question_gen.py       # RAG + JD-grounded question generation
│   │   ├── rag.py                # ChromaDB search (production + eval)
│   │   ├── rubrics.py            # rubric retrieval
│   │   └── session_manager.py    # context compression (VERBATIM_TURNS=3)
│   ├── routes/
│   │   ├── sessions.py           # /start /turn /finish /report
│   │   ├── ask.py                # clarification Q&A endpoint
│   │   ├── history.py            # session history
│   │   └── documents.py          # document ingestion
│   ├── eval/
│   │   ├── golden_set.json       # 50-item judge eval golden set
│   │   ├── retrieval_eval.json   # 37-item retrieval golden set
│   │   ├── sample_resumes/       # 6 synthetic developer personas
│   │   └── results/              # eval result JSONs (committed)
│   ├── scripts/
│   │   ├── eval_judge.py
│   │   ├── eval_retrieval.py
│   │   ├── build_eval_index.py
│   │   ├── generate_eval_set.py
│   │   └── seed_rubrics.py
│   ├── requirements.txt
│   └── requirements-eval.txt     # sentence-transformers (eval only, not in Docker image)
├── frontend/src/components/
├── nginx/
│   ├── nginx.http.conf
│   └── nginx.https.conf
├── docker-compose.yml
└── docker-compose.prod.yml
```

---

## Setup / Quick Start

### Environment variables

```bash
cp .env.example .env
# fill in:
OPENAI_API_KEY=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=
DB_URL=
```

### Production (Docker Compose)

```bash
docker compose -f docker-compose.prod.yml up -d --build
# Services: PostgreSQL 16, FastAPI backend, Vite frontend, nginx (:80/:443)
```

### Local development

```bash
# Backend
cd backend
pip install -r requirements.txt
python scripts/seed_rubrics.py      # one-time rubric seeding
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Notes

- **Reranker is eval-only.** `BAAI/bge-reranker-base` is in `requirements-eval.txt` and is not installed in the production Docker image. `_get_reranker()` in `rag.py` uses a lazy import so the app starts cleanly without it.
- The `eval_documents` ChromaDB collection is fully isolated from the production `documents` collection. Eval scripts never read or write user data.
