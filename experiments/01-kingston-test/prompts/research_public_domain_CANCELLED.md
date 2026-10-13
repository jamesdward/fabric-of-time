# Research prompt: older public-domain texts (CANCELLED, never ran)

This agent was launched on 13 October 2026 but cancelled before it started, so the corpus has no records in their original wording. Rerunning it is the first suggested next step.

---

You are gathering source records for an art-research test about Bradford-on-Avon (Wiltshire, England), focused on Kingston Mill(s) and the town's river, Saxon/early settlement, woollen-cloth and rubber histories. Your strand: OLDER, PUBLIC-DOMAIN WRITTEN SOURCES (first published before 1929), whose original wording can be quoted.

Look for short passages (1–3 sentences, max ~60 words each) about Bradford-on-Avon from texts such as: Domesday Book entry for Bradford (mills, etc.); William of Malmesbury on Aldhelm's little church at Bradford; Anglo-Saxon Chronicle (battle at Bradford, 652); the 1001 charter of Æthelred granting Bradford to Shaftesbury Abbey; John Leland's Itinerary (c.1540s) on Bradford's cloth-making, bridge and river; John Aubrey on Wiltshire clothiers / Bradford; Daniel Defoe's Tour (1720s) on Bradford/West-of-England cloth; Samuel Lewis's Topographical Dictionary (1831/1848) or the Imperial Gazetteer (1870–72) entries; Canon W. H. Jones, "Bradford-on-Avon: a history and description" (1859 / 1907 ed.) — including the Saxon church rediscovery and Kingston House/The Hall and the mills; 19th-century newspapers or directories mentioning Moulton's india-rubber works at Kingston Mill; Wiltshire Archaeological Magazine (19th c.). Good places: archive.org full texts, Wikisource, Project Gutenberg, British History Online (only use BHO for transcriptions of primary sources, not the modern VCH prose), visionofbritain.org.uk for gazetteer text.

Use WebSearch and WebFetch. Aim for 14–20 records. Prefer a spread of dates written (1000s through 1920s) and a spread of strands: river/landscape, settlement/Saxon, textiles, rubber, people/labour. Records about Kingston Mill/Kingston House are especially valuable, but town-wide ones are fine.

STRICT RULES:
- Only quote verbatim from texts first published before 1929. Copy the wording exactly as it appears in the source you fetched (a translation is fine if the translation itself was published before 1929; otherwise paraphrase it and mark text_kind "paraphrase"). Keep each excerpt ≤ 60 words; use "…" for omissions.
- Never invent or "reconstruct" a quotation. If you can't fetch the actual wording, either paraphrase what a reliable page says (text_kind "paraphrase", in your own words, 25–55 words) or skip it.
- date_written = when the text was written/published (e.g. "c.1540", "1859"). date_described = the time the passage is about (e.g. "c.705", "1086", "1540s"). Use year numbers or ranges like "1086" or "1840-1850". Keep these separate.
- Note uncertainty honestly (e.g. disputed dating of the Saxon church).

Return ONLY a JSON array as your final message (no prose before or after), each object:
{"text": "...", "text_kind": "verbatim" | "paraphrase", "strand": "river" | "settlement" | "textiles" | "rubber" | "people", "site": "Kingston Mill" | "Town Bridge" | "St Laurence church" | "Tithe Barn" | "town-wide" | other site name, "source_title": "...", "source_author": "...", "source_type": short label such as "medieval chronicle", "survey", "charter", "travel account", "antiquarian history", "gazetteer", "trade directory", "newspaper", "journal", "source_url": "https://...", "date_written": "...", "date_described": "...", "uncertainty": "..." or ""}
