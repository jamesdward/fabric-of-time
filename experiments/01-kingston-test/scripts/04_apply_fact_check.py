"""Apply the seven wording fixes from the fact-check (fact_check/results.json)
and write the corrected living corpus to data/records.json at the repo root.

The models judged the records BEFORE these fixes (inputs/records_as_judged.json).
The fixes change wording, not substance.
"""
import json
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
ROOT = EXP.parents[1]
R = json.load(open(EXP / "inputs/records_as_judged.json"))

fix = {
    "R08": ("William of Malmesbury saw the church standing in the 1120s",
            "William of Malmesbury reported the church standing in the 1120s"),
    "K06": ("Shots fired from the house killed three people",
            "Shots fired at the crowd killed three people"),
    "K08": ("weavers might work 13 to 17 hours a day for roughly 7s 6d to 10s a week",
            "a working day of 13 to 16 or even 17 hours was not unusual, and weavers put their own pay at roughly 7s 6d to 10s a week"),
    "K13": ("Sales of springs and rings alone", "Output of springs and rings alone"),
    "K20": ("and a plan that year moved Avon's general rubber goods production to the Bradford works",
            "and a plan was made to move Avon's general rubber goods production to the Bradford works"),
    "K21": ("It holds more than 240 volumes, including a nearly complete run of wage books from 1850 to the 1940s, over 3,600 plans",
            "Cataloguing had by then covered more than 240 volumes, including a nearly complete run of wage books from 1850 to the 1940s, and some 3,600 plans"),
    "R06": ("the home farm of Shaftesbury Abbey", "a manor farm of Shaftesbury Abbey"),
}
notes = {
    "R08": "Source says Malmesbury reported the church standing; it doesn't say he saw it. Fixed.",
    "K06": "Source says shots were fired at the crowd, not that they came from the house. Fixed.",
    "K08": "Source says 13 to 16 or even 17 hours; wages are the weavers' own estimates. Fixed.",
    "K13": "Source table is of output, not sales. Fixed.",
    "K20": "Source records the plan but not its date or whether it was carried out. Fixed.",
    "K21": "Counts were partial, mid-cataloguing. Fixed.",
    "R06": "Source says manor farm, not home farm. Fixed.",
}
for r in R:
    r["check"] = "ok"; r["check_note"] = ""
    if r["id"] in fix:
        a, b = fix[r["id"]]
        assert a in r["text"], r["id"]
        r["text"] = r["text"].replace(a, b)
        r["check"] = "fixed"; r["check_note"] = notes[r["id"]]
(ROOT / "data").mkdir(exist_ok=True)
json.dump(R, open(ROOT / "data/records.json", "w"), ensure_ascii=False, indent=0)
print("fixed", sum(r["check"] == "fixed" for r in R))
