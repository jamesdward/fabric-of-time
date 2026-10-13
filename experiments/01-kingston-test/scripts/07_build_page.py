"""Inject outputs/data.json into page/template.html to make page/kingston-test-cloth.html,
a single self-contained page (open it in any browser)."""
from pathlib import Path

EXP = Path(__file__).resolve().parents[1]
t = (EXP / "page/template.html").read_text()
d = (EXP / "outputs/data.json").read_text()
assert "/*DATA*/null" in t
html = t.replace("/*DATA*/null", d)
# The published artifact gets a document skeleton added by the host; add one here so the file opens on its own.
if not html.lstrip().lower().startswith("<!doctype"):
    html = ('<!doctype html>\n<html lang="en"><head><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n'
            + html + "\n</body></html>\n")
(EXP / "page/kingston-test-cloth.html").write_text(html)
print("wrote page/kingston-test-cloth.html", len(html), "bytes")
