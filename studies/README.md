# Studies

Small generative sketches, in the spirit of a daily-sketch practice: each one tries a single way of turning the relationship structure into form. They are studies, not finished works.

Every study draws from the same data, the output of [experiment 01](../experiments/01-kingston-test/): 46 records of Bradford-on-Avon and the links between them. Each can be drawn under four readings of those links, which hand out the same 50 strengths to different pairs of records:

| Reading | Where the links fall |
|---|---|
| `models` | where two models, reading blind, judged records to be related |
| `keywords` | on the pairs sharing the most distinctive words |
| `shuffled` | on random eligible pairs |
| `none` | nowhere |

This is the thesis's removal test and shuffled control, built in from the start. If a study looks as good shuffled as it does under the models, its form isn't yet carrying the relationships.

## Running

No dependencies. Node 20 or later.

```
npm run render                           # every study, every reading, SVG and PNG into studies/out/
node studies/render.mjs 02-meander 11    # one study, seed 11, SVG only
npm run serve                            # then open http://localhost:4173/studies/
```

The page lets you switch study, reading and seed, and save the SVG. Output is line work only, so the SVGs can go to a pen plotter as they are. PNG export uses Google Chrome on macOS.

`studies/out/` is not committed. Renders worth keeping are copied to `studies/selected/`.

## 01 Gather

![Gather under the models' reading](selected/01-gather--models--seed7.png)

A plain cloth, gathered by stitches that run across time.

- **Warp:** the twelve places, a block of 13 threads each, ordered left to right by earliest record.
- **Height:** time, oldest at the top. Positions are half true dates and half plain record order (`timeWarp: 0.5`), so the long early silences show without crushing the 1800s into a sliver.
- **Coloured bands:** one per record, across its own place only. This is the documented layer.
- **Orange stitches:** one per link. Each pulls its two ends towards each other, harder for a stronger link, and the cloth around them puckers. Where stitches crowd, they share the slack.
- **Ground weft:** evenly spaced filler. It carries no data.

![Gather under all four readings](selected/01-gather--compare--seed7.png)

*Models, keywords, shuffled, none.*

## 02 Meander

![Meander under the models' reading](selected/02-meander--models--seed7.png)

Time as one narrow band of cloth, laid out oldest to newest, then pulled into folds wherever a reading links two distant moments. The ends are marked 350 and 2020.

- **Band:** the 46 records in date order. The length between neighbours grows with the years between them (to the power 0.6).
- **Coloured bands:** one per record.
- **Orange stitches:** one per link, drawing its two records together until the band lies beside itself.
- The band resists creasing and resists lying on top of itself. Everything else about its path comes from the links. With no links it stays a straight strip: time as sequence only.

![Meander under all four readings](selected/02-meander--compare--seed7.png)

*Models, keywords, shuffled, none.*

## 03 Hold

![Hold under the models' reading](selected/03-hold--models--seed7.png)

Made in answer to the weakness of the first two: under them, a shuffled reading looked as lively as the models' one. Here a link only takes tension when other links back it up.

- **Warp, height, coloured bands:** as study 01.
- **Held links:** a link is held when its two records are both linked to some third record. Held links are drawn taut and are the only ones that gather the cloth.
- **Woven patches:** three records that all hold each other are cross-hatched shut.
- **Slack threads:** every other link hangs loose and moves nothing.

![Hold under all four readings](selected/03-hold--compare--seed7.png)

*Models, keywords, shuffled, none.*

Why this separates the readings: links that mean something tend to agree with each other, and random ones rarely do.

| Reading | Held links, of 50 | Triangles |
|---|---|---|
| Models | 16 | 7 |
| Keywords | 6 | 2 |
| Shuffled, seed 7 (shown) | 0 | 0 |
| Shuffled, average of 1,000 draws | 5.0 | 1.7 (200 draws) |

Seed 7 is a kind draw for this comparison: it happens to have no held links at all. A typical shuffle has a few, so a typical shuffled cloth shows one or two small tucks. 7 of the 1,000 shuffles had 16 or more held links, the models' figure.

What it shows about the models' reading, which is less flattering:

- **Six of the seven woven patches join settlement records to settlement records,** and the seventh joins three river records. The cloth is held together in the early centuries and along the river, and nowhere else. No patch crosses strands.
- **34 of the models' 50 links stay inside one strand** (a shuffle averages 9.4, and never passed 17 in 1,000 draws). The judges never saw the strand labels, so they found the strands again on their own. That is evidence they read the records sensibly. It also means they mostly did not do what the thesis hoped for, which is to connect across the categories the project started with. Only 16 links cross strands.

## Colour

Authored, not derived from data. Indigo warp on an undyed ground. Record bands by strand: river (blue-grey), settlement (stone), textiles (madder red), rubber (carbon black), people (weld yellow). The models' affinities are a synthetic orange that sits outside that palette, so the interpretive layer can't be mistaken for the documented one.

## What these first two show, and don't

Written by Claude on 13 October 2026, straight after making the first two. Study 03 came from the second point.

- **Both pass the removal test trivially.** With no links, Gather is a flat cloth and Meander is a straight strip.
- **Neither clearly passes the shuffled test.** In both, the shuffled version is as lively as the models' version. Nearly every record gets a stitch under every reading, so the cloth puckers everywhere either way; what changes is direction and which moments touch. A viewer can't yet see the difference between a meaningful link and an arbitrary one. That is the main thing to fix in the grammar.
- **Gather's crescents are fold-overs,** where the cloth is dragged past itself. They are the most striking marks and they come from the pull settings, not from any particular link.
- **Meander can't satisfy most of its links.** 50 links on one band is too many to bring every pair together, so many stitches stay stretched across the knot, and the band overlaps itself in places despite the rule against it.
- **All of experiment 01's caveats carry over:** a small corpus of modern paraphrases, judges from one model family, authored focal years and site groups.
- **Claude chose both grammars and wrote the code.** By the thesis's own standard that is not the AI contribution that matters, and the mappings are James's to keep, change or throw out.

Things to try next: fewer, stronger links (only those both models agreed on); letting link strength alone decide what is visible, so weak links leave the cloth nearly flat; pulling only across time in Gather so places stay as straight warp; a Meander with documented same-place links as a second kind of stitch.

## James's response to the first three (13 October 2026)

> its nice [...] it doesnt emote anything tough and perhaps is taking fabric too literally. When I think about the amount of time, years, months, days, minutes and seconds that has passed through just this town and how it evolved and shifted with the time it fills me with awe and a desire to explore, to unpick and unravel each thread to find out where it goes and why. these visuals are lovely but they dont convey a sense of place or really even time. I am intrigued but im not in awe.

## 04 Days

Made in answer to that response. It drops the cloth and tries one thing: the scale of time, in this place.

![Days](selected/04-days.png)

Every day from the start of 350, the year of the earliest record, to 13 October 2026, the day it was made: 612,433 days.

- **Rows:** one per year, oldest at the top. The last row stops partway, at the day of making.
- **Columns:** the day of the year, 1 January at the left.
- **Each cell:** that day's light at Bradford-on-Avon's latitude. Long days are pale and short days dark, so the bright band down the middle is every summer and the dark edges every winter. In the long nights the moon's phase lifts the dark a little, which makes the fine slanting grain.
- **The shape:** each row is shifted sideways by the River Avon's real course, so time runs down the river with upstream at the top. One pixel is 2.28 metres of river.
- **The threads at the left edge:** one for each of the 46 records, in its strand's colour, at the year it describes.

![Detail around 1300](selected/04-days--detail.png)

Run it with `node studies/04-days/render.mjs --png`. It is a raster image, so it is not in the browser viewer yet. Printed at one millimetre per day it would be 37 cm across the days and 1.68 m tall.

Notes and limits:

- **It uses none of the models' links.** By the thesis's removal test it fails outright; nothing in it came from an AI reading of the records. It is a test of whether scale alone carries feeling, before the relationships are brought back in.
- **The records know a year, not a day,** and the year is the single focal year chosen in experiment 01. A thread marks a year's row and nothing finer.
- **The light is calculated, not recorded.** Day length comes from latitude and the date, with today's tilt of the Earth and no weather. The moon uses the average lunar month counted back from 2000, so its phase drifts from the true one in the early centuries. Dates use today's calendar throughout, not the one in use at the time.
- **The reach of river is Claude's choice:** 11.5 km of the Avon from about 51.353°N 2.176°W down to 51.338°N 2.294°W, stopping before the river turns north. James knows where the town's river begins and ends better than a bounding box does.
- **The river's shape is slightly stretched,** because rows follow distance along the river, not a straight map axis.
- River course from OpenStreetMap (`data/river/avon-course.json`), © OpenStreetMap contributors, under the Open Database Licence.
