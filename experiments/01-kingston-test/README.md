# Experiment 01: Kingston Mills test cloth

Run on 13 October 2026. The full write-up, results and my thoughts are in the [write-up](WRITEUP.md#2-experiment-01-kingston-mills-test-cloth).

**Question:** Do a model's links between records of Bradford-on-Avon add structure that plain keyword matching and a random shuffle don't?

**Answer, provisionally:** Yes. 28 of 50 links between records a century or more apart came only from the models, and replacing them with keywords moves about half the cloth's raised blocks. The caveats are heavy: paraphrased modern sources, same-family judges, and no true embeddings.

## Pipeline

| Step | How | Output |
|---|---|---|
| Research | two Claude agents with web search (`prompts/research_*.md`) | `research/*_raw.json` |
| Transcribe, add id / year / site group | by hand (Claude) | `inputs/records_as_judged.json` |
| 01 blind corpus | `scripts/01_make_blind_corpus.py` (seed 7) | `inputs/blind_corpus.txt`, `inputs/codes.json` |
| Blind judging | Opus 5.5 and Sonnet 5.5 agents (`prompts/blind_judge.md`) | `judgements/opus.json`, `judgements/sonnet.json` |
| 02 keyword baseline | `scripts/02_keyword_baseline.py` | `outputs/tfidf_sim.npy`, `outputs/keyword_baseline.txt` |
| 03 comparison | `scripts/03_analyse.py` | `outputs/analysis.txt`, `A.npy`, `B.npy`, `why_*.json` |
| Fact-check | three Sonnet 5.5 agents (`prompts/fact_check.md`) | `fact_check/results.json` |
| 04 apply fixes | `scripts/04_apply_fact_check.py` | `../../data/records.json` |
| 05 page data | `scripts/05_build_page_data.py` | `outputs/data.json` |
| 06 cloth overlap | `scripts/06_cloth_overlap.py` | `outputs/cloth_overlap.txt` |
| 07 page | `scripts/07_build_page.py` | `page/kingston-test-cloth.html` |

Run the scripts from this folder, in order. Steps 01 to 07 reproduce every number in the write-up: `outputs/data.json` matches, byte for byte, the data in the published page.

## Known issues

- The public-domain research agent never ran, so there are no original-wording records.
- The models read the records before the seven fact-check fixes.
- The focal years, site groups and thresholds are authored choices; see the [write-up](WRITEUP.md).
