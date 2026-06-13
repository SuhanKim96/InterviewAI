import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import asyncio
import json
import math
from collections import defaultdict
from pathlib import Path
from dotenv import load_dotenv

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

from services.evaluator import evaluate, _llm  # _llm for temperature metadata

GOLDEN_PATH = Path(__file__).parent.parent / "eval" / "golden_set.json"
RESULTS_DIR = Path(__file__).parent.parent / "eval" / "results"

AXES = ["score_clarity", "score_specific", "score_technical"]


# ── Statistics helpers ────────────────────────────────────────────────────────

def _mean(vals: list[float]) -> float | None:
    return sum(vals) / len(vals) if vals else None


def _std(vals: list[float]) -> float | None:
    if len(vals) < 2:
        return None
    m = _mean(vals)
    return math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    n = len(xs)
    if n < 2:
        return None
    mx, my = _mean(xs), _mean(ys)
    num = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    denom = math.sqrt(sum((x - mx) ** 2 for x in xs) * sum((y - my) ** 2 for y in ys))
    return round(num / denom, 4) if denom > 1e-9 else None


# ── Core evaluation ───────────────────────────────────────────────────────────

async def run_item(item: dict) -> dict:
    result = await evaluate(
        question=item["question"],
        answer_text=item["answer"],
        category=item["category"],
    )
    return {ax: result.get(ax) for ax in AXES}


async def run_all(items: list[dict], n: int) -> list[dict]:
    results = []
    total = len(items) * n
    done = 0
    for item in items:
        runs = []
        for _ in range(n):
            run = await run_item(item)
            runs.append(run)
            done += 1
            print(f"  [{done}/{total}] {item['id']}", end="\r")
        results.append({"id": item["id"], "runs": runs})
    print()
    return results


# ── Metric computation ────────────────────────────────────────────────────────

def compute_reliability(per_item_results: list[dict], golden: list[dict]) -> dict:
    id_to_meta = {d["id"]: d for d in golden}
    per_item = []
    all_stds: list[float] = []
    max_std_val = -1.0
    max_std_item = None

    for res in per_item_results:
        item = id_to_meta[res["id"]]
        stds = {}
        for ax in AXES:
            vals = [r[ax] for r in res["runs"] if r.get(ax) is not None]
            s = _std(vals)
            stds[f"std_{ax.split('_', 1)[1]}"] = round(s, 4) if s is not None else None
            if s is not None:
                all_stds.append(s)
                if s > max_std_val:
                    max_std_val = s
                    max_std_item = res["id"]

        mean_scores = {}
        for ax in AXES:
            vals = [r[ax] for r in res["runs"] if r.get(ax) is not None]
            m = _mean(vals)
            mean_scores[f"mean_{ax.split('_', 1)[1]}"] = round(m, 3) if m is not None else None

        per_item.append({
            "id": res["id"],
            "category": item["category"],
            "answer_type": item["answer_type"],
            **mean_scores,
            **stds,
            "runs": res["runs"],
        })

    avg_std = round(_mean(all_stds), 4) if all_stds else None
    high_var = [p["id"] for p in per_item
                if any(p.get(f"std_{ax.split('_', 1)[1]}", 0) or 0 > 0.5 for ax in AXES)]

    return {
        "avg_std": avg_std,
        "max_std_item": max_std_item,
        "high_variance_items": high_var,
        "per_item": per_item,
    }


def compute_validity(per_item_results: list[dict], golden: list[dict]) -> dict | None:
    id_to_item = {d["id"]: d for d in golden}
    labeled = [r for r in per_item_results
                if all(id_to_item[r["id"]]["human_labels"].get(ax) is not None for ax in AXES)]
    if not labeled:
        return None

    per_axis: dict[str, dict] = {}
    for ax in AXES:
        judge_scores, human_scores, diffs = [], [], []
        for res in labeled:
            item = id_to_item[res["id"]]
            h = item["human_labels"][ax]
            j_vals = [r[ax] for r in res["runs"] if r.get(ax) is not None]
            if not j_vals:
                continue
            j = _mean(j_vals)
            judge_scores.append(j)
            human_scores.append(h)
            diffs.append(j - h)

        n = len(judge_scores)
        exact = sum(1 for j, h in zip(judge_scores, human_scores) if round(j) == h)
        within1 = sum(1 for d in diffs if abs(d) <= 1)
        ax_short = ax.split("_", 1)[1]
        per_axis[ax_short] = {
            "n": n,
            "exact_match_rate": round(exact / n, 4),
            "within_1_rate": round(within1 / n, 4),
            "pearson_r": _pearson(judge_scores, human_scores),
            "bias": round(_mean(diffs), 4) if diffs else None,
            "mean_judge": round(_mean(judge_scores), 3) if judge_scores else None,
            "mean_human": round(_mean(human_scores), 3) if human_scores else None,
        }

    # per answer_type: mean judge score per axis
    by_type: dict[str, dict] = defaultdict(lambda: defaultdict(list))
    for res in labeled:
        item = id_to_item[res["id"]]
        atype = item["answer_type"]
        for ax in AXES:
            j_vals = [r[ax] for r in res["runs"] if r.get(ax) is not None]
            if j_vals:
                by_type[atype][ax].append(_mean(j_vals))

    per_answer_type = {}
    for atype, ax_data in sorted(by_type.items()):
        per_answer_type[atype] = {
            ax.split("_", 1)[1]: round(_mean(vals), 3) if vals else None
            for ax, vals in ax_data.items()
        }

    return {
        "n_labeled": len(labeled),
        "per_axis": per_axis,
        "per_answer_type": per_answer_type,
    }


# ── Output ────────────────────────────────────────────────────────────────────

def print_reliability(rel: dict) -> None:
    print(f"\n── Reliability ──────────────────────────────")
    print(f"  평균 std:          {rel['avg_std']}")
    print(f"  가장 불안정한 항목: {rel['max_std_item']}")
    if rel["high_variance_items"]:
        print(f"  std > 0.5 항목:    {rel['high_variance_items']}")

    print(f"\n  {'ID':<22} {'std_clarity':>11} {'std_specific':>12} {'std_technical':>13}")
    print("  " + "-" * 60)
    for p in rel["per_item"]:
        sc = p.get("std_clarity") or "-"
        ss = p.get("std_specific") or "-"
        st = p.get("std_technical") or "-"
        print(f"  {p['id']:<22} {str(sc):>11} {str(ss):>12} {str(st):>13}")


def print_validity(val: dict | None) -> None:
    if val is None:
        print("\n── Validity ─────────────────────────────────")
        print("  human_labels 없음 — validity 측정 불가")
        return

    print(f"\n── Validity  (n={val['n_labeled']}개 라벨) ──────────────────")
    print(f"\n  {'축':<14} {'exact':>7} {'±1':>7} {'pearson_r':>10} {'bias':>7} {'mean_judge':>11} {'mean_human':>11}")
    print("  " + "-" * 68)
    for ax, m in val["per_axis"].items():
        print(f"  {ax:<14} {m['exact_match_rate']:>7.1%} {m['within_1_rate']:>7.1%}"
              f" {str(m['pearson_r'] or '-'):>10} {str(m['bias'] or '-'):>7}"
              f" {str(m['mean_judge'] or '-'):>11} {str(m['mean_human'] or '-'):>11}")

    print(f"\n  엣지 케이스 유형별 judge 평균 점수")
    print(f"  {'유형':<16} {'clarity':>8} {'specific':>9} {'technical':>10}")
    print("  " + "-" * 46)
    for atype, scores in val["per_answer_type"].items():
        c = scores.get("clarity", "-")
        s = scores.get("specific", "-")
        t = scores.get("technical", "-")
        print(f"  {atype:<16} {str(c):>8} {str(s):>9} {str(t):>10}")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main_async(args: argparse.Namespace) -> None:
    golden = json.loads(Path(args.golden).read_text(encoding="utf-8"))
    print(f"golden_set: {len(golden)}개 / n={args.n} / mode={args.mode}")

    per_item_results = await run_all(golden, n=args.n)

    reliability = compute_reliability(per_item_results, golden)
    validity = compute_validity(per_item_results, golden) if args.mode in ("all", "validity") else None

    try:
        temperature = _llm.temperature
    except Exception:
        temperature = None

    output = {
        "label": args.label,
        "evaluator_temperature": temperature,
        "n_runs": args.n,
        "n_items": len(golden),
        "n_labeled": sum(
            1 for d in golden
            if all(d["human_labels"].get(ax) is not None for ax in AXES)
        ),
        "validity": validity if args.mode in ("all", "validity") else None,
        "reliability": reliability if args.mode in ("all", "reliability") else None,
    }

    if args.mode in ("all", "validity"):
        print_validity(validity)
    if args.mode in ("all", "reliability"):
        print_reliability(reliability)

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    out = RESULTS_DIR / f"{args.label}.json"
    out.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n저장 → {out}")


def main() -> None:
    parser = argparse.ArgumentParser(description="LLM Judge eval harness")
    parser.add_argument("--n", type=int, default=1, help="반복 평가 횟수 (기본 1)")
    parser.add_argument("--mode", choices=["all", "validity", "reliability"], default="all")
    parser.add_argument("--label", default="judge_baseline")
    parser.add_argument("--golden", default=str(GOLDEN_PATH))
    args = parser.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
