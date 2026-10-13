# Blind judging prompt

Sent word for word, on 13 October 2026, to two separate agents with no other project context:

- Claude Opus 5.5 → `judgements/opus.json`
- Claude Sonnet 5.5 → `judgements/sonnet.json`

Each agent could read only `inputs/blind_corpus.txt` (46 shuffled passages with neutral codes).

---

Read the file /home/claude/work/blind_corpus.txt with the Read tool. It contains 46 short passages, each with a code in square brackets. Do not use any other tools, files or the web, and do not try to work out what project this is for.

For every passage, list up to 4 OTHER passages it is most strongly related to. Give each a strength from 1 (faint) to 5 (strong) and a reason of at most 8 words.

Do not count a resemblance if it rests only on: the same place or building, the same named person or organisation, or the same historical period. Any other kind of resemblance counts. If a passage has nothing that meets this, list fewer or none — don't pad.

Your final message must be ONLY valid JSON, no prose, with all 46 codes as keys:
{"A1": [["C2", 4, "reason"], ["F1", 2, "reason"]], "B1": [], ...}

---

## Notes

- The exclusion rule (not same place, person/organisation or period) is an authored framing. It steers the models towards thematic affinity and away from documented continuity. A different rule would give a different cloth.
- Sonnet listed a few pairs the rule should have excluded ("Same 652 battle"). The century rule drops most of these.
- The eight-word reasons are generated text, not a view of how either model decided.
