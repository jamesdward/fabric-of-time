"""Package records, scores, reasons and shared keywords into outputs/data.json for the page.

Display text comes from the corrected corpus (data/records.json); the keyword scores and
shared words are computed on the text the models read (inputs/records_as_judged.json).
Also prints the cloth's level counts (0 = no link ... 3 = strong) for the model reading.
"""
import json
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

EXP = Path(__file__).resolve().parents[1]
ROOT = EXP.parents[1]
R = json.load(open(ROOT / "data/records.json"))
RJ = json.load(open(EXP / "inputs/records_as_judged.json")); n = len(R)
A = np.load(EXP / "outputs/A.npy"); B = np.load(EXP / "outputs/B.npy")
wa = json.load(open(EXP / "outputs/why_opus.json")); wb = json.load(open(EXP / "outputs/why_sonnet.json"))

vec = TfidfVectorizer(stop_words="english", sublinear_tf=True)
X = vec.fit_transform([r["text"] for r in RJ]); voc = np.array(vec.get_feature_names_out())
T = (X @ X.T).toarray(); np.fill_diagonal(T, 0)
Xd = X.toarray()
def cross(i, j): return abs(R[i]["year"] - R[j]["year"]) >= 100 and R[i]["source_url"] != R[j]["source_url"]
Xp = [(i, j) for i in range(n) for j in range(i + 1, n) if cross(i, j)]
rank = {p: k + 1 for k, p in enumerate(sorted(Xp, key=lambda p: -T[p]))}

pairs = []
for i in range(n):
    for j in range(i + 1, n):
        a, b, t = int(A[i, j]), int(B[i, j]), float(T[i, j])
        if a == 0 and b == 0 and t == 0:
            continue
        prod = Xd[i] * Xd[j]
        top = [voc[k] for k in np.argsort(-prod)[:4] if prod[k] > 0]
        key = f"{i}-{j}"
        pairs.append({"i": i, "j": j, "a": a, "b": b, "t": round(t, 3), "wa": wa.get(key, [""])[0],
                      "wb": wb.get(key, [""])[0], "words": top, "kw": rank.get((i, j))})

groups = {}
for r in R:
    groups.setdefault(r["site_group"], []).append(r["year"])
order = sorted([g for g in groups if g != "Town-wide"], key=lambda g: min(groups[g])) + ["Town-wide"]
keep = ["id", "year", "site_group", "site", "text", "strand", "source_title", "source_author", "source_type",
        "source_url", "date_written", "date_described", "uncertainty", "check", "check_note"]
data = {"records": [{k: r[k] for k in keep} for r in R], "groups": order, "pairs": pairs, "ncross": len(Xp)}
json.dump(data, open(EXP / "outputs/data.json", "w"), ensure_ascii=False, separators=(",", ":"))
print(order); print(len(pairs), "pairs; bytes", len(json.dumps(data)))

M = (A + B) / 2
gi = {g: [k for k in range(n) if R[k]["site_group"] == g] for g in order}
lv = [0, 0, 0, 0]
for i in range(n):
    for g in order:
        if R[i]["site_group"] == g:
            continue
        v = max([M[i, k] for k in gi[g] if cross(i, k)] or [0])
        lv[3 if v >= 3 else 2 if v >= 2 else 1 if v > 0 else 0] += 1
print("cell levels 0..3:", lv)
