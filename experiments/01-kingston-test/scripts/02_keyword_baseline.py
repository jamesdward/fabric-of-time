"""Keyword baseline: TF-IDF cosine similarity between every pair of records,
on the same text the models read. Common English words are removed.

Reads  inputs/records_as_judged.json
Writes outputs/tfidf_sim.npy and prints the top pairs that pass the century rule.
"""
import json
from pathlib import Path
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

EXP = Path(__file__).resolve().parents[1]
R = json.load(open(EXP / "inputs/records_as_judged.json"))
(EXP / "outputs").mkdir(exist_ok=True)

X = TfidfVectorizer(stop_words="english", sublinear_tf=True, min_df=1).fit_transform([r["text"] for r in R])
S = (X @ X.T).toarray()
np.fill_diagonal(S, 0)
np.save(EXP / "outputs/tfidf_sim.npy", S)

ids = [r["id"] for r in R]
def cross(i, j):  # the century rule: >=100 years apart and from different pages
    return abs(R[i]["year"] - R[j]["year"]) >= 100 and R[i]["source_url"] != R[j]["source_url"]

pairs = [(S[i, j], ids[i], ids[j]) for i in range(len(R)) for j in range(i + 1, len(R)) if cross(i, j)]
pairs.sort(reverse=True)
for s, a, b in pairs[:12]:
    print(round(s, 3), a, b)
print(len(pairs), "cross-period cross-source pairs of", len(R) * (len(R) - 1) // 2)
