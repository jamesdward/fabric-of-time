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

## Colour

Authored, not derived from data. Indigo warp on an undyed ground. Record bands by strand: river (blue-grey), settlement (stone), textiles (madder red), rubber (carbon black), people (weld yellow). The models' affinities are a synthetic orange that sits outside that palette, so the interpretive layer can't be mistaken for the documented one.

## What these first two show, and don't

Written by Claude on 13 October 2026, straight after making them.

- **Both pass the removal test trivially.** With no links, Gather is a flat cloth and Meander is a straight strip.
- **Neither clearly passes the shuffled test.** In both, the shuffled version is as lively as the models' version. Nearly every record gets a stitch under every reading, so the cloth puckers everywhere either way; what changes is direction and which moments touch. A viewer can't yet see the difference between a meaningful link and an arbitrary one. That is the main thing to fix in the grammar.
- **Gather's crescents are fold-overs,** where the cloth is dragged past itself. They are the most striking marks and they come from the pull settings, not from any particular link.
- **Meander can't satisfy most of its links.** 50 links on one band is too many to bring every pair together, so many stitches stay stretched across the knot, and the band overlaps itself in places despite the rule against it.
- **All of experiment 01's caveats carry over:** a small corpus of modern paraphrases, judges from one model family, authored focal years and site groups.
- **Claude chose both grammars and wrote the code.** By the thesis's own standard that is not the AI contribution that matters, and the mappings are James's to keep, change or throw out.

Things to try next: fewer, stronger links (only those both models agreed on); letting link strength alone decide what is visible, so weak links leave the cloth nearly flat; pulling only across time in Gather so places stay as straight warp; a Meander with documented same-place links as a second kind of stitch.
