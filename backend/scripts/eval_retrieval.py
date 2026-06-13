import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import json
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from services.rag import search_eval, search_eval_reranked

EVAL_JSON = Path(__file__).parent.parent / "eval" / "retrieval_eval.json"
RESULTS_DIR = Path(__file__).parent.parent / "eval" / "results"


def run_eval(k: int, method: str, k_initial: int) -> dict:
    eval_set = json.loads(EVAL_JSON.read_text(encoding="utf-8"))
    n = len(eval_set)

    hits = 0
    reciprocal_ranks: list[float] = []
    per_question: list[dict] = []

    for item in eval_set:
        question = item["question"]
        gt_id = item["ground_truth_chunk_id"]

        if method == "reranked":
            results = search_eval_reranked(question, k=k, k_initial=k_initial)
        else:
            results = search_eval(question, k=k)

        chunk_ids = [r[0] for r in results]

        if gt_id in chunk_ids:
            rank = chunk_ids.index(gt_id) + 1
            hits += 1
            reciprocal_ranks.append(1.0 / rank)
        else:
            rank = None
            reciprocal_ranks.append(0.0)

        per_question.append({
            "question": question,
            "ground_truth_chunk_id": gt_id,
            "source": item.get("source", ""),
            "rank": rank,
            "hit": rank is not None,
            "retrieved_ids": chunk_ids,
        })

    return {
        "method": method,
        "k": k,
        "k_initial": k_initial if method == "reranked" else None,
        "n_questions": n,
        "hit_rate": round(hits / n, 4),
        "mrr": round(sum(reciprocal_ranks) / n, 4),
        "hits": hits,
        "per_question": per_question,
    }


def save_result(metrics: dict, label: str) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out = RESULTS_DIR / f"{label}.json"
    data = {k: v for k, v in metrics.items() if k != "per_question"}
    data["per_question"] = metrics["per_question"]
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return out


def load_compare(label: str) -> dict | None:
    path = RESULTS_DIR / f"{label}.json"
    if not path.exists():
        print(f"[경고] 비교 파일 없음: {path}")
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def print_single(metrics: dict, compare: dict | None) -> None:
    k = metrics["k"]
    ki = metrics.get("k_initial")
    ki_str = f" (k_initial={ki})" if ki else ""
    print(f"\n=== Retrieval 평가 결과: {metrics['method']}{ki_str}, k={k} ===")
    print(f"Hit-rate@{k} : {metrics['hit_rate']:.1%}  ({metrics['hits']}/{metrics['n_questions']})")
    print(f"MRR         : {metrics['mrr']:.4f}")

    if compare:
        d_hr = metrics["hit_rate"] - compare["hit_rate"]
        d_mrr = metrics["mrr"] - compare["mrr"]
        sign_hr = "+" if d_hr >= 0 else ""
        sign_mrr = "+" if d_mrr >= 0 else ""
        print(f"\nvs baseline — Δ Hit-rate: {sign_hr}{d_hr:.1%}  /  Δ MRR: {sign_mrr}{d_mrr:.4f}")

    misses = [q for q in metrics["per_question"] if not q["hit"]]
    if misses:
        print(f"\nMiss ({len(misses)}개):")
        for m in misses:
            print(f"  [{m['source']}] {m['question'][:65]}...")
            print(f"    gt={m['ground_truth_chunk_id']}")
            print(f"    retrieved={m['retrieved_ids'][:3]}")

    if compare:
        baseline_misses = [q for q in compare["per_question"] if not q["hit"]]
        current_hit_ids = {
            q["ground_truth_chunk_id"]
            for q in metrics["per_question"] if q["hit"]
        }
        print(f"\nBaseline miss {len(baseline_misses)}개 커버 여부:")
        for bm in baseline_misses:
            covered = bm["ground_truth_chunk_id"] in current_hit_ids
            mark = "✓" if covered else "✗"
            print(f"  {mark} [{bm['source']}] {bm['question'][:65]}...")


def print_sweep(sweep_results: list[dict], compare: dict | None) -> None:
    k = sweep_results[0]["k"]
    if compare:
        b_hr = compare["hit_rate"]
        b_mrr = compare["mrr"]
        baseline_misses = [q for q in compare["per_question"] if not q["hit"]]
        n_miss = len(baseline_misses)
        baseline_miss_ids = {q["ground_truth_chunk_id"] for q in baseline_misses}
        print(f"\n=== k_initial Sweep: reranked, k={k}  "
              f"(baseline: {b_hr:.1%} / MRR {b_mrr:.4f}) ===\n")
    else:
        print(f"\n=== k_initial Sweep: reranked, k={k} ===\n")

    header = f"{'k_initial':^10}│{'Hit-rate':^11}│{'MRR':^8}"
    if compare:
        header += f"│{'Δ hit-rate':^11}│{'Δ MRR':^9}│{'Miss 커버':^10}"
    print(header)
    print("─" * len(header))

    for m in sweep_results:
        ki = m["k_initial"]
        hr_s = f"{m['hit_rate']:.1%}"
        mrr_s = f"{m['mrr']:.4f}"
        if compare:
            d_hr = m["hit_rate"] - b_hr
            d_mrr = m["mrr"] - b_mrr
            current_hit_ids = {q["ground_truth_chunk_id"] for q in m["per_question"] if q["hit"]}
            covered = sum(1 for mid in baseline_miss_ids if mid in current_hit_ids)
            dhr_s = f"{'+' if d_hr >= 0 else ''}{d_hr:.1%}"
            dmrr_s = f"{'+' if d_mrr >= 0 else ''}{d_mrr:.4f}"
            cover_s = f"{covered}/{n_miss}"
            row = (f"{ki:^10}│{hr_s:^11}│{mrr_s:^8}│"
                   f"{dhr_s:^11}│{dmrr_s:^9}│{cover_s:^10}")
        else:
            row = f"{ki:^10}│{hr_s:^11}│{mrr_s:^8}"
        print(row)

    if compare:
        print(f"\n※ hit-rate는 k_initial 증가 시 candidate recall 상승으로 자동 올라감")
        print(f"  진짜 재정렬 효과: Δ MRR + Baseline miss 커버 수로 판단하세요.")

        best_mrr = max(sweep_results, key=lambda x: x["mrr"])
        best_miss = max(
            sweep_results,
            key=lambda x: sum(
                1 for mid in baseline_miss_ids
                if mid in {q["ground_truth_chunk_id"] for q in x["per_question"] if q["hit"]}
            )
        )
        print(f"\n→ Δ MRR 최대: k_initial={best_mrr['k_initial']}  (MRR {best_mrr['mrr']:.4f})")
        print(f"→ Miss 커버 최대: k_initial={best_miss['k_initial']}")

        # 상세 miss 분석 (가장 높은 k_initial 기준)
        best = sweep_results[-1]
        best_hits = {q["ground_truth_chunk_id"] for q in best["per_question"] if q["hit"]}
        print(f"\nBaseline miss {n_miss}개 커버 여부 (k_initial={best['k_initial']} 기준):")
        for bm in baseline_misses:
            mark = "✓" if bm["ground_truth_chunk_id"] in best_hits else "✗"
            print(f"  {mark} [{bm['source']}] {bm['question'][:65]}...")


def main() -> None:
    parser = argparse.ArgumentParser(description="RAG retrieval 평가")
    parser.add_argument("--k", type=int, default=8)
    parser.add_argument("--method", choices=["vector", "reranked"], default="vector")
    parser.add_argument("--k_initial", type=int, default=20,
                        help="reranked 시 초기 후보 수 (기본 20)")
    parser.add_argument("--sweep", action="store_true",
                        help="k_initial=[10,15,20] 자동 순회")
    parser.add_argument("--label", default=None,
                        help="결과 파일 라벨 (기본: method_k{k_initial} 또는 baseline)")
    parser.add_argument("--compare", default=None,
                        help="비교할 기존 결과 파일 라벨 (예: baseline)")
    args = parser.parse_args()

    compare = load_compare(args.compare) if args.compare else None

    if args.sweep:
        if args.method != "reranked":
            print("--sweep은 --method reranked와 함께 사용하세요.")
            return

        print(f"Sweep 시작: k_initial=[10, 15, 20], k={args.k} ...")
        # reranker 첫 호출 시 모델 로드 (한 번만)
        sweep_results = []
        for ki in [10, 15, 20]:
            print(f"  k_initial={ki} 평가 중...")
            m = run_eval(k=args.k, method="reranked", k_initial=ki)
            label = f"reranked_k{ki}"
            out = save_result(m, label)
            print(f"    → {out.name} 저장")
            sweep_results.append(m)

        print_sweep(sweep_results, compare)

    else:
        label = args.label or (
            "baseline" if args.method == "vector"
            else f"reranked_k{args.k_initial}"
        )
        print(f"{args.method} 평가 중... (k={args.k}"
              + (f", k_initial={args.k_initial}" if args.method == "reranked" else "")
              + f", {EVAL_JSON.name})")
        metrics = run_eval(k=args.k, method=args.method, k_initial=args.k_initial)
        out = save_result(metrics, label)
        print_single(metrics, compare)
        print(f"\n저장 → {out}")


if __name__ == "__main__":
    main()
