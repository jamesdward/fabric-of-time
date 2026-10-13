"""Shuffle the records and give each a neutral code, so the judging models
can't infer place, period or source from record IDs or order.

Reads  inputs/records_as_judged.json
Writes inputs/blind_corpus.txt and inputs/codes.json (record id -> blind code)

Seed 7 reproduces the corpus the two models read on 13 October 2026.
Run with --check to compare against the committed files instead of overwriting them.
"""
import json, random, sys
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
R = json.load(open(EXP / "inputs/records_as_judged.json"))

random.seed(7)
order = list(range(len(R)))
random.shuffle(order)
letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
codes, lines = {}, []
for n, i in enumerate(order):
    c = letters[n % 24] + str(n // 24 + 1)
    codes[R[i]["id"]] = c
    lines.append(f"[{c}] {R[i]['text']}")
corpus = "\n\n".join(lines) + "\n"

if "--check" in sys.argv:
    same = (corpus == open(EXP / "inputs/blind_corpus.txt").read()
            and codes == json.load(open(EXP / "inputs/codes.json")))
    print("matches committed corpus:", same)
    sys.exit(0 if same else 1)

open(EXP / "inputs/blind_corpus.txt", "w").write(corpus)
json.dump(codes, open(EXP / "inputs/codes.json", "w"))
print(len(lines), "passages;", sum(len(l.split()) for l in lines), "words")
