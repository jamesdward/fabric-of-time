# Research prompt: Kingston Mill, textiles and rubber (ran; 24 records)

Run on 13 October 2026 by a Claude Opus 5.5 research agent with web search and fetch. Raw output: `research/kingston_textile_rubber_raw.json`.

---

You are gathering source records for an art-research test about Bradford-on-Avon (Wiltshire, England). Your strand: KINGSTON MILL(S) AND THE TOWN'S TEXTILE AND RUBBER INDUSTRIES, from MODERN sources (heritage listings, museum and archive pages, local history society pages, company histories, academic or industrial-archaeology writing, reputable news, oral history summaries, Grace's Guide, Wikipedia only as a last resort and cross-checked).

Topics to cover (find what you can, don't force it): Kingston House / The Hall and the Hall family clothiers; Kingston Mill as a woollen cloth mill and its earlier history; the decline of the town's cloth trade in the 19th century; Stephen Moulton buying Kingston Mill (c.1848) and making vulcanised india-rubber; links to Charles Goodyear / Thomas Hancock samples; railway springs, buffers and other rubber products; George Spencer, Moulton & Co; Avon Rubber taking over (1950s); the works' closure and redevelopment of the site as housing; other mills in the town (Abbey Mill, Greenland Mill, Church Street mills) and their later uses; weavers' housing; machinery disputes or riots (e.g. 1791); workers, labour and lived experience in either industry; the Wiltshire & Swindon History Centre's Moulton/Avon Rubber archive; Bradford on Avon Museum displays.

Use WebSearch and WebFetch. Aim for 18–24 records, each one fact or a closely linked pair of facts, from varied sources (aim for at least 8 distinct sources).

STRICT RULES:
- These are modern, copyrighted sources: write every record's text as a PARAPHRASE in your own plain words, 25–55 words, no copied phrasing. Do not quote. (If you find a genuinely pre-1929 public-domain text, you may quote ≤60 words verbatim and mark text_kind "verbatim".)
- Every fact must come from a page you actually fetched; never fill gaps from memory. If two sources conflict on a date, say so in "uncertainty".
- date_written = when the source was written/published (year, or "2010s" if only roughly known, or "unknown"). date_described = the time the fact is about (year or range like "1848" or "1840-1860"). Keep them separate.

Return ONLY a JSON array as your final message (no prose before or after), each object:
{"text": "...", "text_kind": "paraphrase" | "verbatim", "strand": "textiles" | "rubber" | "river" | "settlement" | "people", "site": "Kingston Mill" | "Abbey Mill" | "Greenland Mill" | "town-wide" | other site name, "source_title": "...", "source_author": "...", "source_type": short label such as "heritage listing", "museum page", "archive catalogue", "local history society", "company history", "industrial archaeology", "news article", "encyclopedia", "oral history", "source_url": "https://...", "date_written": "...", "date_described": "...", "uncertainty": "..." or ""}
