# Seeded studies

An experiment James asked for on 13 October 2026, after an idea in [Lenny's Newsletter](https://www.lennysnewsletter.com/p/how-to-turn-your-ai-into-a-world): give a model a random string and let the string, not habit, set the creative direction.

Five agents (Claude, Opus 5.5) ran at the same time, each alone in its own folder and unable to see the others. Each was told to:

1. Generate a long, random alphanumeric string using a shell script, before reading anything about the project.
2. Define the creative direction (colour scheme, layout, graphic patterns and so on) based on the string, looking beyond the surface for subpatterns, special numbers, anything that inspires.
3. Use its judgment to bring the direction to life and make it look great.

All five were given the same data (records, links, described spans, river course), James's reactions to studies 01 to 05, a rule against lettering in the image, and an instruction not to imitate the existing studies.

Each folder holds the agent's `seed.txt`, a re-runnable `render.mjs`, and a `README.md` in its own words: what it saw in the string, how that became decisions, the mapping from data to form, and what works and doesn't. Full-size images are not committed; run the script to make them. The previews here are JPEGs made afterwards from each agent's PNG, and the image links in the agents' READMEs were repointed to them. Nothing else in their notes was changed.

| | Title | What the string led to |
|---|---|---|
| [a](a/) | Shores | The river as an undrawn dark void; every year a shoreline around it; one model's links on each bank, in magenta. |
| [b](b/) | Ford | The river as a white map line; every year a ripple spreading from it; three inks only, with red for the links. |
| [c](c/) | Two Banks | Violet and amber; every record drawn twice, mirrored across the river, one model per bank; records as one dash per word. |
| [d](d/) | Bank and Reflection | A pale bank above a waterline holding the records, dark water below holding the models' reading of them. |
| [e](e/) | Hachure | Straight strokes only; the river in true plan with time running along it; links as straight chords over the land. |

![a, Shores](a/preview.jpg)
![b, Ford](b/preview.jpg)
![c, Two Banks](c/preview.jpg)
![d, Bank and Reflection](d/preview.jpg)
![e, Hachure](e/preview.jpg)

## What the experiment showed

Written by Claude (the session that ran the agents), after looking at all five.

- **The five look far more different from each other than studies 01 to 05 do.** Palette, format and mark-making all vary. Read that way, the string did its job.
- **Underneath, they converged.** All five built the picture on the river's line, with the years drawn as lines beside or across it, and four of the five split the picture into two mirrored banks. None of that is in the strings. It comes from the brief, which quoted James liking "the drama from the river", and from all five being the same model.
- **The "patterns" they found are what any random string contains.** Four agents were struck by an even split of capitals and lower case, or by mirrored triples like `JIJ`. A random 128-character string will nearly always have both. The agents read meaning into noise, which is the point of the exercise, but it explains why four of them independently arrived at "reflection".
- **Where the string really decided things was colour.** Hues taken from hex runs and digits gave palettes none of them would have picked: three inks in B, sweet greens and oranges in D, violet and amber in C.
- **Three ideas appeared that the earlier studies lacked,** and each turned up in more than one folder:
  - keeping the two models apart instead of averaging them, so their agreement and disagreement can be seen (A, B, C, D);
  - drawing a record from its own text, one mark per word or character (B, C, D);
  - time running away from the river at right angles, so the present is at the water and the oldest years furthest out (A, B, C).
- **The old weaknesses came along.** Every agent reports that position along the river is the data's order of places, not geography, because the corpus has no coordinates. Most did not run the shuffled control, and those that did say it still looks plausible.
