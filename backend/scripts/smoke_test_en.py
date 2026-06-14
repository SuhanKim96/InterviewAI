"""English evaluator smoke test — run: cd backend && python scripts/smoke_test_en.py"""
import sys
import os
import asyncio

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.evaluator import evaluate

CASES = [
    ("no-answer",     "technical",
     "I don't know.",
     "Explain the difference between threading and multiprocessing in Python."),
    ("model",         "technical",
     ("Python's GIL prevents true parallel execution of Python bytecode across threads, "
      "so threading is useful mainly for I/O-bound work (network calls, file reads) where threads "
      "release the GIL while waiting. Multiprocessing spawns separate OS processes, each with its "
      "own GIL, so CPU-bound tasks can run truly in parallel. In a data pipeline I worked on, "
      "switching from threads to processes for a CPU-intensive transformation step cut wall-clock "
      "time from 40 s to 12 s on an 8-core machine. The trade-off is higher memory overhead and "
      "the need to serialise data across process boundaries via pickle."),
     "Explain the difference between threading and multiprocessing in Python."),
    ("verbose-empty", "technical",
     ("Performance and scalability are critical considerations in modern distributed systems. "
      "When designing high-throughput architectures, engineers must evaluate numerous factors "
      "including concurrency models, resource utilisation, and system bottlenecks. "
      "Threading and multiprocessing both represent powerful paradigms for achieving parallelism, "
      "each with distinct characteristics that make them suitable for different scenarios in "
      "enterprise-grade applications."),
     "Explain the difference between threading and multiprocessing in Python."),
    ("no-answer",     "experience",
     "I haven't had that experience.",
     "Describe a time you resolved a technical conflict within a team."),
    ("model",         "experience",
     ("In a 4-person backend team we disagreed on whether to use raw SQL or SQLAlchemy for a "
      "new service. I prototyped the same feature both ways, measured response time (5 ms difference) "
      "and compared line counts (SQLAlchemy was 40% fewer lines). I presented the data in a 15-minute "
      "demo; the team agreed on SQLAlchemy everywhere except two hot-path queries. We shipped on "
      "schedule and the codebase has been easier to extend since."),
     "Describe a time you resolved a technical conflict within a team."),
    ("verbose-empty", "culture",
     ("I strongly believe in a growth mindset and continuous learning. As a developer, I think "
      "collaboration, transparency, and innovation are the most important values. I always strive "
      "to improve myself and contribute positively to the team culture. I'm passionate about "
      "delivering high-quality software and making a meaningful impact on the product."),
     "What values are most important to you as a developer?"),
]


async def main() -> None:
    print(f"{'Label':<18} {'clarity':>7} {'specific':>8} {'technical':>9} {'avg':>5}")
    print("-" * 52)
    for label, category, answer, question in CASES:
        result = await evaluate(
            question=question,
            answer_text=answer,
            category=category,
            language="en",
        )
        c = result["score_clarity"]
        s = result["score_specific"]
        tech = result["score_technical"]
        avg = (c + s + tech) / 3
        print(f"[{label:<16}] {c:>7} {s:>8} {tech:>9} {avg:>5.1f}")

    print("\nExpected: no-answer ≈ 1, model ≈ 4-5, verbose-empty ≤ 2")


if __name__ == "__main__":
    asyncio.run(main())
