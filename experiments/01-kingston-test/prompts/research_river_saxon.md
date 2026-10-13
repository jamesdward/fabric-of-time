# Research prompt: river, crossings and early settlement (ran; 22 records)

Run on 13 October 2026 by a Claude Opus 5.5 research agent with web search and fetch. Raw output: `research/river_saxon_raw.json`.

---

You are gathering source records for an art-research test about Bradford-on-Avon (Wiltshire, England). Your strand: THE RIVER AVON, ITS CROSSINGS AND LANDSCAPE, and EARLY SETTLEMENT / SAXON HISTORY, from MODERN sources (Historic England list entries, English Heritage, archaeology reports or summaries, museum and town council pages, local history society pages, Environment Agency/flood history, canal history pages, reputable news; Wikipedia only as a last resort and cross-checked).

Topics to cover (find what you can): the "broad ford" place-name; the Town Bridge and its chapel/lock-up; Barton Bridge (packhorse bridge); the Tithe Barn and Barton Farm (Shaftesbury Abbey estate); the Saxon church of St Laurence, its disputed dating (Aldhelm c.700 vs 10th–11th c.) and 19th-century rediscovery; the 652 battle; the 1001 grant to Shaftesbury Abbey; the Roman villa excavations (St Laurence School / playing fields site) and later early-medieval reuse; Budbury hillfort; the river's weirs and mill leats, especially at Kingston Mill; the Kennet & Avon Canal and Avoncliff aqueduct; floods; how the river powered or served the cloth and rubber mills.

Use WebSearch and WebFetch. Aim for 16–22 records, each one fact or a closely linked pair of facts, from varied sources (aim for at least 7 distinct sources).

STRICT RULES:
- These are modern, copyrighted sources: write every record's text as a PARAPHRASE in your own plain words, 25–55 words, no copied phrasing. Do not quote.
- Every fact must come from a page you actually fetched; never fill gaps from memory. Where dating is disputed or uncertain, say so in "uncertainty".
- date_written = when the source was written/published (year, or "2010s", or "unknown"). date_described = the time the fact is about (year or range like "c.700-1050"). Keep them separate.

Return ONLY a JSON array as your final message (no prose before or after), each object:
{"text": "...", "text_kind": "paraphrase", "strand": "river" | "settlement" | "textiles" | "rubber" | "people", "site": "Town Bridge" | "Barton Bridge" | "Tithe Barn" | "St Laurence church" | "Kingston Mill" | "Roman villa site" | "Avoncliff" | "town-wide" | other site name, "source_title": "...", "source_author": "...", "source_type": short label such as "heritage listing", "archaeology report", "museum page", "local history society", "council page", "canal history", "news article", "encyclopedia", "source_url": "https://...", "date_written": "...", "date_described": "...", "uncertainty": "..." or ""}
