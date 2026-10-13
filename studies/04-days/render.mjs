// Study 04: Days
//
// Every day that has passed through the town since the earliest record, one
// cell each, with the river's course as the shape of the whole.
//
// Mapping (all authored, see studies/README.md):
//   rows      one per year, oldest at the top; the last row stops at the day of making
//   columns   day of the year, 1 January at the left
//   cell      that day's light at Bradford-on-Avon's latitude: pale for long days,
//             dark for short ones, with the moon's phase lifting the long nights
//   shape     each row is shifted sideways by the River Avon's real course, so
//             time runs down the river, upstream at the top
//   threads   one pulled out at the left edge for each record, in its strand's colour,
//             at the year it describes (the corpus knows the year, not the day)
//
//   node studies/04-days/render.mjs          writes studies/out/04-days.svg and its field PNG
//   node studies/04-days/render.mjs --png    also flattens it to studies/out/04-days.png (needs Chrome)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PALETTE, byTime } from '../lib/core.mjs';
import { encodePng } from '../lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const data = JSON.parse(readFileSync(join(root, 'experiments/01-kingston-test/outputs/data.json'), 'utf8'));
const river = JSON.parse(readFileSync(join(root, 'data/river/avon-course.json'), 'utf8'));

const o = {
  latitude: 51.347,
  until: [2026, 10, 13], // the day this study was made
  cell: 3, // pixels per day, each way
  reachEnd: [-2.2943417, 51.3376327], // where the reach stops, before the river turns north
  page: '#0b0e1a',
  night: [22, 28, 58],
  noon: [236, 226, 198],
  moon: [150, 172, 214],
  moonLift: 0.42,
  margin: 150,
};

const DAY = 86400000;
const records = data.records;
const firstYear = Math.min(...records.map((r) => r.year));
const [lastYear, lastMonth, lastDay] = o.until;
const lastDate = Date.UTC(lastYear, lastMonth - 1, lastDay);
const years = lastYear - firstYear + 1;

// Hours of daylight, from the sun's declination. No refraction, today's axial tilt.
function daylight(dayOfYear) {
  const decl = -23.44 * Math.cos((2 * Math.PI * (dayOfYear + 10)) / 365.2425);
  const cosH = -Math.tan((o.latitude * Math.PI) / 180) * Math.tan((decl * Math.PI) / 180);
  return (24 / Math.PI) * Math.acos(Math.max(-1, Math.min(1, cosH)));
}
const [shortest, longest] = [daylight(355), daylight(172)];

// Lit fraction of the moon, from the mean length of the lunar month counted
// back from the new moon of 6 January 2000. Approximate for the early centuries.
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
  pts.forEach(([x, y], k) => {
    if (k) along.push(along[k - 1] + Math.hypot(x - pts[k - 1][0], y - pts[k - 1][1]));
    across.push(-(x - a[0]) * uy + (y - a[1]) * ux); // map turned so downstream points down
  });
  const length = along[along.length - 1];
  const scale = (years * o.cell) / length;
  const shift = [];
  let k = 0;
  for (let row = 0; row < years; row++) {
    const s = ((row + 0.5) / years) * length;
    while (along[k + 1] < s) k++;
    const t = (s - along[k]) / (along[k + 1] - along[k]);
    shift.push((across[k] + (across[k + 1] - across[k]) * t) * scale);
  }
  return { shift, length, metresPerPixel: 1 / scale };
}

const { shift, length, metresPerPixel } = riverShift();
const minShift = Math.min(...shift);
const xOf = shift.map((s) => Math.round(s - minShift));
const stripW = 366 * o.cell;
const W = Math.max(...xOf) + stripW;
const H = years * o.cell;

const rgba = new Uint8Array(W * H * 4);
let days = 0;
for (let row = 0; row < years; row++) {
  const year = firstYear + row;
  const start = Date.UTC(year, 0, 1);
  for (let n = 0; ; n++) {
    const time = start + n * DAY;
    if (new Date(time).getUTCFullYear() !== year || time > lastDate) break;
    days++;
    const t = Math.pow((daylight(n) - shortest) / (longest - shortest), 1.15);
    const m = o.moonLift * moonlight(time) * (1 - t);
    for (let py = 0; py < o.cell; py++)
      for (let px = 0; px < o.cell; px++) {
        const at = ((row * o.cell + py) * W + xOf[row] + n * o.cell + px) * 4;
        for (let c = 0; c < 3; c++) {
          const base = o.night[c] + (o.noon[c] - o.night[c]) * t;
          rgba[at + c] = Math.round(base + (o.moon[c] - base) * m);
        }
        rgba[at + 3] = 255;
      }
  }
}

const out = join(here, '../out');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, '04-days--field.png'), encodePng(W, H, rgba));

// Vector layer: the records' threads, century marks and colophon.
const pageW = W + o.margin * 2 + 60, pageH = H + o.margin * 2;
const ox = o.margin + 60, oy = o.margin;
const thread = { ...PALETTE.strand, rubber: '#7d7d7d' }; // carbon black would vanish on this ground
const ink = '#c9c2ad';
let marks = '';
const seen = new Map();
for (const i of byTime(records)) {
  const row = records[i].year - firstYear;
  const nth = seen.get(row) ?? 0;
  seen.set(row, nth + 1);
  const x1 = ox + xOf[row] - 10 - nth * 62, y = oy + (row + 0.5) * o.cell;
  marks += `<path d="M${x1} ${y}h-56" stroke="${thread[records[i].strand]}" stroke-width="2.4"/>`;
}
const label = (row, text) =>
  `<text x="${ox + xOf[row] + stripW + 16}" y="${oy + (row + 0.5) * o.cell + 4}">${text}</text>`;
let labels = label(0, firstYear) + label(years - 1, lastYear);
for (let y = Math.ceil((firstYear + 20) / 100) * 100; y < lastYear - 20; y += 100) labels += label(y - firstYear, y);

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pageW} ${pageH}" width="${pageW}" height="${pageH}">` +
  `<rect width="100%" height="100%" fill="${o.page}"/>` +
  `<image href="04-days--field.png" x="${ox}" y="${oy}" width="${W}" height="${H}" style="image-rendering:pixelated"/>` +
  `<g stroke-linecap="round">${marks}</g>` +
  `<g font-family="ui-monospace, Menlo, monospace" font-size="13" letter-spacing="1" fill="${ink}" opacity="0.75">${labels}</g>` +
  `<text x="${pageW / 2}" y="${pageH - 56}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" ` +
  `letter-spacing="1.5" fill="${ink}" opacity="0.6">A FABRIC THROUGH TIME · STUDY 04 DAYS · ${days.toLocaleString('en-GB')} DAYS · ${records.length} RECORDS</text>` +
  `</svg>`;
writeFileSync(join(out, '04-days.svg'), svg);

console.log(`${days.toLocaleString('en-GB')} days in ${years} rows, ${firstYear} to ${o.until.join('-')}`);
console.log(`river reach ${Math.round(length)} m, drawn at ${metresPerPixel.toFixed(2)} m per pixel`);
console.log(`daylight ${shortest.toFixed(2)} h to ${longest.toFixed(2)} h; page ${pageW} x ${pageH}`);

if (process.argv.includes('--png')) {
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${pageW},${pageH}`, `--screenshot=${join(out, '04-days.png')}`,
    'file://' + join(out, '04-days.svg')], { stdio: 'ignore' });
}
