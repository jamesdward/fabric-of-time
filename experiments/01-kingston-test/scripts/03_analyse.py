"""Compare the two models' blind judgements with each other and with the keyword baseline.

Reads  inputs/records_as_judged.json, inputs/codes.json, judgements/opus.json,
       judgements/sonnet.json, outputs/tfidf_sim.npy
Writes outputs/A.npy (Opus scores), outputs/B.npy (Sonnet scores),
       outputs/why_opus.json, outputs/why_sonnet.json (reasons keyed "i-j")
Prints agreement figures and every cross-century link (tee it into outputs/analysis.txt).

A judge's score for a pair is the larger of the two directions (A listing B, or B listing A).
"""
import json
from pathlib import Path
import numpy as np

EXP = Path(__file__).resolve().parents[1]
R = json.load(open(EXP / "inputs/records_as_judged.json")); n = len(R)
ids = [r["id"] for r in R]; ix = {k: i for i, k in enumerate(ids)}
codes = json.load(open(EXP / "inputs/codes.json")); c2id = {c: i for i, c in codes.items()}

def load(fn):
    J = json.load(open(fn)); M = np.zeros((n, n)); why = {}
    for c, lst in J.items():
        a = ix[c2id[c]]
        for b_c, s, reason in lst:
            b = ix[c2id[b_c]]
            if s > M[a, b]:
                M[a, b] = M[b, a] = max(M[a, b], s)
            why.setdefault(tuple(sorted((a, b))), []).append(reason)
    return M, why

A, wa = load(EXP / "judgements/opus.json")
B, wb = load(EXP / "judgements/sonnet.json")
T = np.load(EXP / "outputs/tfidf_sim.npy")
pairs = [(i, j) for i in range(n) for j in range(i + 1, n)]
def cross(i, j): return abs(R[i]["year"] - R[j]["year"]) >= 100 and R[i]["source_url"] != R[j]["source_url"]

sa = {p for p in pairs if A[p] > 0}; sb = {p for p in pairs if B[p] > 0}
print("opus pairs", len(sa), "sonnet pairs", len(sb), "shared", len(sa & sb), "jaccard", round(len(sa & sb) / len(sa | sb), 2))
sa3 = {p for p in sa if A[p] >= 3}; sb3 = {p for p in sb if B[p] >= 3}
print("strong(>=3) opus", len(sa3), "sonnet", len(sb3), "shared", len(sa3 & sb3))
M = (A + B) / 2
X = [p for p in pairs if cross(*p)]
mx = [p for p in X if M[p] > 0]
print("cross pairs", len(X), "model-linked cross pairs", len(mx), "both judges", sum(1 for p in mx if A[p] > 0 and B[p] > 0))
N = len(mx)
tk = sorted(X, key=lambda p: -T[p])[:N]
print("keyword top-N overlap with model cross pairs:", len(set(tk) & set(mx)), "of", N)
print("random expectation:", round(N * N / len(X), 1))
same = sum(1 for p in mx if R[p[0]]["site_group"] == R[p[1]]["site_group"])
print("same site group", same, "different", N - same)
order = sorted(X, key=lambda q: -T[q])
for p in sorted(mx, key=lambda p: (-M[p], -abs(R[p[0]]["year"] - R[p[1]]["year"]))):
    i, j = p; rk = order.index(p) + 1
    print(f"{M[p]:.1f} A{int(A[p])} B{int(B[p])} kwrank {rk:3d}/{len(X)} {ids[i]}({R[i]['year']}) {ids[j]}({R[j]['year']}) | {wa.get(p, ['-'])[0]} | {wb.get(p, ['-'])[0]}")

np.save(EXP / "outputs/A.npy", A); np.save(EXP / "outputs/B.npy", B)
json.dump({f"{a}-{b}": v for (a, b), v in wa.items()}, open(EXP / "outputs/why_opus.json", "w"))
json.dump({f"{a}-{b}": v for (a, b), v in wb.items()}, open(EXP / "outputs/why_sonnet.json", "w"))
