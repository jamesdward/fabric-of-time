// Study 05: Threads
//
// Study 04's river of days, with the records and their links put back in it.
// No lettering anywhere: gaps part the months, decades and centuries.
//
// Mapping (all authored, see studies/README.md):
//   ground    every day as a dot; rows are years, columns days of the year, the
//             dot larger and paler the longer that day's light at the town's latitude
//   gaps      a dark column between months, a hairline between decades, a wider
//             break between centuries
//   shape     rows shifted sideways by the River Avon's real course
//   threads   one per record, in its strand's colour, running down the river for
//             the whole span of years the record describes; a broken end where the
//             source is vague; a knot at the year experiment 01 filed it under
//   lanes     threads from the same place run side by side (documented kinship)
//   currents  one orange line per link in the chosen reading, drifting across the
//             river from knot to knot; bright if other links back it up, faint if not
//
//   node studies/05-threads/render.mjs [reading] [seed] [--png]
//
// --palette=file.json swaps the colours (see studies/06-colour) and --stem=name the output name.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE, READINGS, reading, f } from '../lib/core.mjs';
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
  page: '#0b0e1a',
  bed: [17, 22, 44], // the strip behind the dots
  night: [52, 62, 104],
  noon: [226, 216, 190],
  moon: [150, 172, 214],
  moonLift: 0.4,
  margin: 170,
  laneGap: 6.5,
  fuzzy: 28, // rows of broken thread at a vague end
};

// Colours. A palette file may replace any of these.
const flag = (key) => process.argv.find((a) => a.startsWith(`--${key}=`))?.split('=').slice(1).join('=');
const ink = {
  strand: { ...PALETTE.strand, rubber: '#8b8b8b', textiles: '#c0452f' },
  affinity: PALETTE.affinity,
  under: o.page, // the dark edge that lifts a thread off the ground
};
if (flag('palette')) {
  const given = JSON.parse(readFileSync(flag('palette'), 'utf8'));
  for (const key of ['page', 'bed', 'night', 'noon', 'moon']) if (given[key]) o[key] = given[key];
  Object.assign(ink, { strand: given.strand, affinity: given.affinity, under: given.under });
}

const DAY = 86400000;
const records = data.records;
const [lastYear, lastMonth, lastDay] = o.until;
const lastDate = Date.UTC(lastYear, lastMonth - 1, lastDay);
const firstYear = Math.min(...Object.values(spans).map((s) => s.from ?? Infinity), ...records.map((r) => r.year));
const years = lastYear - firstYear + 1;

// Rows and columns, with their gaps.
const rowY = [];
let y = 0;
for (let row = 0; row < years; row++) {
  const year = firstYear + row;
  if (row && year % 100 === 0) y += o.centuryGap;
  else if (row && year % 10 === 0) y += o.decadeGap;
  rowY.push(y);
  y += o.cell;
}
const H = y;
const stripW = 366 * o.cell + 11 * o.monthGap;

function daylight(dayOfYear) {
  const decl = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365.2425);
  const cosH = -Math.tan((o.latitude * Math.PI) / 180) * Math.tan((decl * Math.PI) / 180);
  return (24 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, cosH)));
}
const [shortest, longest] = [daylight(355), daylight(172)];

function moonlight(time) {
  const phase = ((time - Date.UTC(2000, 0, 6, 18, 14)) / DAY / 29.530588853) % 1;
  return (1 - Math.cos(2 * Math.PI * phase)) / 2;
}

// The river: distance along it gives the row, distance from the straight line
// between its ends gives the sideways shift. Same scale both ways.
function riverShift() {
  let end = 0, best = Infinity;
  river.course.forEach(([lon, lat], k) => {
    const d = (lon - o.reachEnd[0]) ** 2 + (lat - o.reachEnd[1]) ** 2;
    if (d < best) [best, end] = [d, k];
  });
  const kx = 111320 * Math.cos((o.latitude * Math.PI) / 180), ky = 111132;
  const pts = river.course.slice(0, end + 1).map(([lon, lat]) => [lon * kx, lat * ky]);
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uy] = [(b[0] - a[0]) / chord, (b[1] - a[1]) / chord];
  const along = [0], across = [];
  pts.forEach(([px, py], k) => {
    if (k) along.push(along[k - 1] + Math.hypot(px - pts[k - 1][0], py - pts[k - 1][1]));
    across.push(-(px - a[0]) * uy + (py - a[1]) * ux);
  });
  const length = along[along.length - 1];
  const scale = H / length;
  let k = 0;
  return rowY.map((top) => {
    const s = ((top + o.cell / 2) / H) * length;
    while (along[k + 1] < s) k++;
    const t = (s - along[k]) / (along[k + 1] - along[k]);
    return (across[k] + (across[k + 1] - across[k]) * t) * scale;
  });
}
const shift = riverShift();
const minShift = Math.min(...shift);
const xOf = shift.map((s) => Math.round(s - minShift));
const W = Math.max(...xOf) + stripW;

// Ground: one dot per day.
const rgba = new Uint8Array(W * H * 4);
const put = (px, py, c) => {
  const at = (py * W + px) * 4;
  rgba[at] = c[0]; rgba[at + 1] = c[1]; rgba[at + 2] = c[2]; rgba[at + 3] = 255;
};
let days = 0;
for (let row = 0; row < years; row++) {
  const year = firstYear + row;
  const start = Date.UTC(year, 0, 1);
  for (let py = 0; py < o.cell; py++)
    for (let px = 0; px < stripW; px++) put(xOf[row] + px, rowY[row] + py, o.bed);
  for (let n = 0; ; n++) {
    const time = start + n * DAY;
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || time > lastDate) break;
    days++;
    const t = (daylight(n) - shortest) / (longest - shortest);
    const m = o.moonLift * moonlight(time);
    const colour = [0, 1, 2].map((c) => {
      const base = o.night[c] + (o.noon[c] - o.night[c]) * Math.pow(t, 1.3);
      return Math.round(base + (o.moon[c] - base) * m * (1 - t));
    });
    // dot size follows the light; a fixed per-day scatter softens the steps between sizes
    const scatter = (Math.imul(row * 366 + n, 2654435761) >>> 8) / 16777216;
    const size = 1 + Math.min(2, Math.floor(t * 2.2 + scatter * 0.8));
    const x0 = xOf[row] + n * o.cell + date.getUTCMonth() * o.monthGap;
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) put(x0 + px, rowY[row] + py, colour);
  }
}

const out = join(here, '../out');
mkdirSync(out, { recursive: true });
const stem = flag('stem') ?? `05-threads--${name}--seed${seed}`;
writeFileSync(join(out, `${stem}--field.png`), encodePng(W, H, rgba));

// Threads, knots and currents, as vectors over the ground.
const ox = o.margin, oy = o.margin;
const pageW = W + o.margin * 2, pageH = H + o.margin * 2;
const colour = ink.strand;
const rowOf = (year) => Math.max(0, Math.min(years - 1, year - firstYear));
const at = (row, lane) => [ox + xOf[row] + lane, oy + rowY[row] + o.cell / 2];
const path = (pts) => pts.map((p, k) => (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('');

// Lanes: places left to right in experiment 01's order, their records side by side.
const lane = [];
data.groups.forEach((group, g) => {
  const members = records.map((r, i) => i).filter((i) => records[i].site_group === group)
    .sort((a, b) => (spans[records[a].id].from ?? 0) - (spans[records[b].id].from ?? 0) || a - b);
  const centre = ((g + 0.5) / data.groups.length) * stripW;
  members.forEach((i, k) => (lane[i] = centre + (k - (members.length - 1) / 2) * o.laneGap));
});

let under = '', threads = '', knots = '';
records.forEach((r, i) => {
  const span = spans[r.id];
  const a = rowOf(span.from ?? firstYear), b = rowOf(span.to ?? lastYear);
  const solidFrom = span.fuzzyFrom ? Math.min(a + o.fuzzy, b) : a;
  const solidTo = span.fuzzyTo ? Math.max(b - o.fuzzy, solidFrom) : b;
  const run = (r0, r1) => {
    const pts = [];
    for (let row = r0; row <= r1; row++) pts.push(at(row, lane[i]));
    return path(pts);
  };
  if (solidTo > solidFrom) {
    under += `<path d="${run(solidFrom, solidTo)}"/>`;
    threads += `<path d="${run(solidFrom, solidTo)}" stroke="${colour[r.strand]}"/>`;
  }
  for (const [r0, r1] of [[a, solidFrom], [solidTo, b]])
    if (r1 > r0) threads += `<path d="${run(r0, r1)}" stroke="${colour[r.strand]}" stroke-dasharray="2 7"/>`;
  const [kx, ky] = at(rowOf(r.year), lane[i]);
  knots += `<circle cx="${f(kx)}" cy="${f(ky)}" r="6" fill="${colour[r.strand]}" stroke="${ink.under}" stroke-width="1.6"/>`;
});

const { held, slack } = corroborate(reading(data, name, seed));
const current = ({ i, j }) => {
  const [a, b] = records[i].year <= records[j].year ? [i, j] : [j, i];
  const [r0, r1] = [rowOf(records[a].year), rowOf(records[b].year)];
  const pts = [];
  for (let row = r0; row <= r1; row++) {
    const t = (row - r0) / (r1 - r0 || 1);
    const s = t * t * (3 - 2 * t);
    pts.push(at(row, lane[a] + (lane[b] - lane[a]) * s));
  }
  return path(pts);
};
let faint = '', bright = '';
for (const link of slack) faint += `<path d="${current(link)}" stroke-width="${f(0.8 + link.w * 0.25)}"/>`;
for (const link of held) bright += `<path d="${current(link)}" stroke-width="${f(1.4 + link.w * 0.55)}"/>`;

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}" height="${pageH}">` +
  `<rect width="100%" height="100%" fill="${o.page}"/>` +
  `<image href="${stem}--field.png" x="${ox}" y="${oy}" width="${W}" height="${H}" style="image-rendering:pixelated"/>` +
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
  `<g stroke="${ink.under}" stroke-width="6" opacity="0.75">${under}</g>` +
  `<g stroke-width="3.4">${threads}</g>` +
  `<g stroke="${ink.affinity}" opacity="0.5">${faint}</g>` +
  `<g stroke="${ink.affinity}">${bright}</g>` +
  `</g>${knots}</svg>`;
writeFileSync(join(out, `${stem}.svg`), svg);

console.log(`${name}: ${days.toLocaleString('en-GB')} days, ${firstYear} to ${o.until.join('-')}, ${held.length} held and ${slack.length} slack links`);
console.log(`page ${pageW} x ${pageH}`);

if (process.argv.includes('--png')) {
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${pageW},${pageH}`, `--screenshot=${join(out, `${stem}.png`)}`,
    'file://' + join(out, `${stem}.svg`)], { stdio: 'ignore' });
}
