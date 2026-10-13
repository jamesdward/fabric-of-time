"""How much does the cloth change if you remove the models?

Builds the cloth's grid (records x places) three ways, raising the same number of blocks each time:
  models   - the two judges' averaged scores
  keywords - TF-IDF scores, top-N cells
  shuffled - the models' scores after randomly reassigning which record is which (200 draws)
and reports how many raised blocks each shares with the models' cloth.

Reads outputs/data.json.
"""
import json, random
from pathlib import Path
import numpy as np

EXP = Path(__file__).resolve().parents[1]
D = json.load(open(EXP / "outputs/data.json")); R = D["records"]; n = len(R); G = D["groups"]
A = np.zeros((n, n)); B = np.zeros((n, n)); T = np.zeros((n, n))
for p in D["pairs"]:
    i, j = p["i"], p["j"]
    A[i, j] = A[j, i] = p["a"]; B[i, j] = B[j, i] = p["b"]; T[i, j] = T[j, i] = p["t"]
M = (A + B) / 2
cross = lambda i, k: abs(R[i]["year"] - R[k]["year"]) >= 100 and R[i]["source_url"] != R[k]["source_url"]
gi = {g: [k for k in range(n) if R[k]["site_group"] == g] for g in G}

def grid(S):
    out = {}
    for i in range(n):
        for g in G:
            if R[i]["site_group"] == g:
                continue
            out[(i, g)] = max([S[i, k] for k in gi[g] if cross(i, k)] or [0])
    return out

gm = grid(M); lifted = {c for c, v in gm.items() if v > 0}; N = len(lifted)
def top(gr): return set(sorted([c for c, v in gr.items() if v > 0], key=lambda c: -gr[c])[:N])
print("model lifted", N, "keyword overlap", len(top(grid(T)) & lifted))
ov = []
for s in range(200):
    rnd = random.Random(s); p = list(range(n)); rnd.shuffle(p); P = np.array(p)
    ov.append(len(top(grid(M[np.ix_(P, P)])) & lifted))
print("shuffled overlap mean", np.mean(ov), "max", max(ov))
print("sources", len({r["source_url"] for r in R}))
