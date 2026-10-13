# Fact-check prompt

Run on 13 October 2026 by three separate Claude Sonnet 5.5 agents with web fetch, each taking a third of the records (positions 0–15, 16–30, 31–45). Results: `fact_check/results.json`. Fixes applied by `scripts/04_apply_fact_check.py`.

---

Fact-check source records. Read /home/claude/records.json (a JSON array). Check ONLY the records at array positions 0–15 (the first 16). For each one, WebFetch its source_url and check every factual claim in its "text" (names, dates, numbers, places) against what that page actually says. Don't use your own memory as evidence. If a page won't load, say so and don't guess.

Reply with ONLY a JSON array, one object per record checked: {"id": "...", "status": "ok" | "minor" | "wrong" | "unreachable", "note": "≤30 words: what differs from the source, or empty if ok"}. "minor" = small slip (a rounded number, slightly different wording of a date); "wrong" = a claim the source does not support or contradicts.
