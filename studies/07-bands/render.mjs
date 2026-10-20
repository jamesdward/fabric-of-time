// Study 07: Bands
//
// The river of days again, on pale paper, in flat bright colour. The days
// themselves now carry the records, so there are no separate threads.
//
// Mapping (all authored, see studies/README.md):
//   ground    every day is still one square; rows are years, columns days of the year,
//             and the river's course shifts each row. The shorter days are drawn a
//             little smaller, so the paper shows through at the winter edges.
//   bands     in each year, the row is shared out among the places that have a record
//             describing that year, in proportion to how many. A place keeps its
//             left-to-right order and its colour for the whole piece.
//   weave     inside a band every other square takes the colour of a strand (river,
//             settlement, textiles, rubber, people) of the records there, so each
//             block is two colours mixed by the eye: place as warp, strand as weft.
//   knots     each record, at the year experiment 01 filed it under
//   tracks    the links of the chosen reading, drawn in the paper's colour as if a
//             thread had been pulled out; wide if other links back it up
//
//   node studies/07-bands/render.mjs [reading] [seed] [--png]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { READINGS, reading, f } from '../lib/core.mjs';
import { DAY, daylight, yearRows, riverShift } from '../lib/days.mjs';
import { corroborate } from '../03-hold/sketch.mjs';
import { encodePng } from '../lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const data = load('experiments/01-kingston-test/outputs/data.json');
const river = load('data/river/avon-course.json');
const { spans } = load('data/described-spans.json');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const name = args[0] ?? 'models';
const seed = Number(args[1] ?? 7);
if (!READINGS.includes(name)) throw new Error(`unknown reading: ${name}`);

const o = {
  latitude: 51.347,
  until: [2026, 10, 13],
  cell: 4,
  monthGap: 4,
  decadeGap: 1,
  centuryGap: 9,
  reachEnd: [-2.2943417, 51.3376327],
  margin: 170,
  paper: '#f5ecc2',
  ink: '#111314',
  // Every colour below is one that appears in Wada's combinations (data/colour/wada-four.json),
  // though this set is not one of his combinations.
  place: ['#f05a30', '#1c4286', '#f8b6ba', '#00978d', '#fcb315', '#6450a1',
    '#f37f94', '#88c540', '#006eb8', '#a84122', '#78cdd0', '#a1a39a'],
  strand: { river: '#5b82b3', settlement: '#c5a56e', textiles: '#cc1335', rubber: '#111314', people: '#fff204' },
};

const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
const records = data.records;
const [lastYear, lastMonth, lastDay] = o.until;
const lastDate = Date.UTC(lastYear, lastMonth - 1, lastDay);
const firstYear = Math.min(...Object.values(spans).map((s) => s.from ?? Infinity), ...records.map((r) => r.year));
const years = lastYear - firstYear + 1;

const { rowY, height: H } = yearRows(firstYear, lastYear, o);
const xOf = riverShift(river.course, rowY, H, o);
const stripW = 366 * o.cell + 11 * o.monthGap;
const W = Math.max(...xOf) + stripW;
const [shortest, longest] = [daylight(355, o.latitude), daylight(172, o.latitude)];

// Which records describe each year, grouped by place.
const placeOf = records.map((r) => data.groups.indexOf(r.site_group));
const active = (i, year) => {
  const s = spans[records[i].id];
  return (s.from ?? firstYear) <= year && year <= (s.to ?? lastYear);
};

// For one year: each place's share of the days, as [place, firstDay, lastDay, records there].
function bands(year, daysInYear) {
  const here = data.groups.map(() => []);
  records.forEach((_, i) => active(i, year) && here[placeOf[i]].push(i));
  const total = here.reduce((n, list) => n + list.length, 0);
  const out = [];
  let seen = 0;
  here.forEach((list, place) => {
    if (!list.length) return;
    const from = Math.round((seen / total) * daysInYear);
    seen += list.length;
    out.push({ place, from, to: Math.round((seen / total) * daysInYear) - 1, list });
  });
  return out;
}

const rgba = new Uint8Array(W * H * 4);
const put = (px, py, c) => {
  const at = (py * W + px) * 4;
  rgba[at] = c[0]; rgba[at + 1] = c[1]; rgba[at + 2] = c[2]; rgba[at + 3] = 255;
};
const placeRgb = o.place.map(rgb);
const strandRgb = Object.fromEntries(Object.entries(o.strand).map(([k, v]) => [k, rgb(v)]));
const dayX = (n, month) => n * o.cell + month * o.monthGap;

let days = 0;
const bandsOf = [];
for (let row = 0; row < years; row++) {
  const year = firstYear + row;
  const start = Date.UTC(year, 0, 1);
  const daysInYear = Math.round((Date.UTC(year + 1, 0, 1) - start) / DAY);
  const list = bands(year, daysInYear);
  bandsOf.push({ list, daysInYear });
  let b = 0;
  for (let n = 0; n < daysInYear; n++) {
    const time = start + n * DAY;
    if (time > lastDate) break;
    days++;
    while (b < list.length - 1 && n > list[b].to) b++;
    const band = list[b];
    if (!band) continue;
    // every other square is the place; the rest take turns among the strands recorded there
    const weft = (n + row) % 2 === 1;
    const colour = weft
      ? strandRgb[records[band.list[((n + row) >> 1) % band.list.length]].strand]
      : placeRgb[band.place];
    const t = (daylight(n, o.latitude) - shortest) / (longest - shortest);
    const size = t < 0.38 ? 3 : 4;
    const x0 = xOf[row] + dayX(n, new Date(time).getUTCMonth());
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) put(x0 + px, rowY[row] + py, colour);
  }
}

const out = join(here, '../out');
mkdirSync(out, { recursive: true });
const stem = `07-bands--${name}--seed${seed}`;
writeFileSync(join(out, `${stem}--field.png`), encodePng(W, H, rgba));

// Knots and tracks, as vectors over the ground.
const ox = o.margin, oy = o.margin;
const pageW = W + o.margin * 2, pageH = H + o.margin * 2;
const rowOf = (year) => Math.max(0, Math.min(years - 1, year - firstYear));

// Where a record sits across the river in a given row: inside its place's band.
function across(i, row) {
  const { list, daysInYear } = bandsOf[row];
  const band = list.find((b) => b.place === placeOf[i]);
  let day;
  if (band) {
    const k = Math.max(0, band.list.indexOf(i));
    day = band.from + ((k + 0.5) / band.list.length) * (band.to - band.from + 1);
  } else {
    // its place has no record for this year: stand where the band would open
    const next = list.find((b) => b.place > placeOf[i]);
    day = next ? next.from : daysInYear;
  }
  return dayX(day, Math.min(11, Math.floor((day / daysInYear) * 12)));
}
const at = (row, x) => [ox + xOf[row] + x, oy + rowY[row] + o.cell / 2];
const path = (pts) => pts.map((p, k) => (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('');

const knotAt = records.map((r, i) => {
  const row = rowOf(r.year);
  return { row, x: across(i, row) };
});

const { held, slack } = corroborate(reading(data, name, seed));
const track = ({ i, j }) => {
  const [a, b] = knotAt[i].row <= knotAt[j].row ? [knotAt[i], knotAt[j]] : [knotAt[j], knotAt[i]];
  const pts = [];
  for (let row = a.row; row <= b.row; row++) {
    const t = (row - a.row) / (b.row - a.row || 1);
    pts.push(at(row, a.x + (b.x - a.x) * t * t * (3 - 2 * t)));
  }
  return path(pts);
};
const thin = slack.map((l) => `<path d="${track(l)}"/>`).join('');
const wide = held.map((l) => `<path d="${track(l)}"/>`).join('');
const knots = knotAt.map(({ row, x }) => {
  const [cx, cy] = at(row, x);
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="7"/>`;
}).join('');

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}" height="${pageH}">` +
  `<rect width="100%" height="100%" fill="${o.paper}"/>` +
  `<image href="${stem}--field.png" x="${ox}" y="${oy}" width="${W}" height="${H}" style="image-rendering:pixelated"/>` +
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
  `<g stroke="${o.ink}" opacity="0.45"><g stroke-width="4.5">${thin}</g><g stroke-width="10">${wide}</g></g>` +
  `<g stroke="${o.paper}"><g stroke-width="2.6">${thin}</g><g stroke-width="7">${wide}</g></g>` +
  `</g><g fill="${o.paper}" stroke="${o.ink}" stroke-width="2.4">${knots}</g></svg>`;
writeFileSync(join(out, `${stem}.svg`), svg);

console.log(`${name}: ${days.toLocaleString('en-GB')} days, ${firstYear} to ${o.until.join('-')}, ${held.length} held and ${slack.length} slack links`);
console.log(`page ${pageW} x ${pageH}`);

if (process.argv.includes('--png')) {
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${pageW},${pageH}`, `--screenshot=${join(out, `${stem}.png`)}`,
    'file://' + join(out, `${stem}.svg`)], { stdio: 'ignore' });
}
