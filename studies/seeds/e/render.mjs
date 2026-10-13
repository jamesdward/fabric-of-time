// Seed study E: Hachure
//
// The River Avon in true plan, north up. Time runs down the river: the year 230
// at the upstream end, 13 October 2026 at the downstream end. Every year is one
// straight stroke laid across the river, and every day is one mark on it.
// The direction came from a random string; see README.md for how.
//
//   node studies/seeds/e/render.mjs [reading] [seed]
//
// Writes field.png (the days), out.svg, out.png and preview.png beside this file.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { READINGS, reading, f } from '../../lib/core.mjs';
import { corroborate } from '../../03-hold/sketch.mjs';
import { encodePng } from '../../lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const data = load('experiments/01-kingston-test/outputs/data.json');
const river = load('data/river/avon-course.json');
const { spans } = load('data/described-spans.json');
const SEED = readFileSync(join(here, 'seed.txt'), 'utf8').trim();

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const name = args[0] ?? 'models';
const seed = Number(args[1] ?? 7);
if (!READINGS.includes(name)) throw new Error(`unknown reading: ${name}`);
const stem = name === 'models' ? 'out' : `out--${name}`;

// ---- what the string decided -------------------------------------------------
const digits = [...SEED].filter((c) => /\d/.test(c)).join('');
const quarter = (q) => [...SEED.slice(q * 32, q * 32 + 32)].filter((c) => /\d/.test(c)).join('');
const HUE = {
  straw: Number(quarter(0)) / 10, // "595"     -> 59.5
  rose: Number(SEED.match(/\d{4}/)[0]) / 10, // "3425", the only run of digits -> 342.5
  lime: Number(quarter(2).slice(0, 3)), // "073066"  -> 73
  violet: Number(quarter(3).slice(0, 3)), // "26934"   -> 269
  leaf: [...digits].reduce((a, c) => a + Number(c), 0), // digit sum -> 97
};
const DAY_PX = 365 / Number(quarter(2).slice(0, 3)) / 2.5; // 365 = 5 x 73 -> 2 px a day
const CAPITAL = 1.4; // hH, iI: the echo is the same letter, larger

function hsl(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const k = (n) => (n + h / 30) % 12;
  return [0, 8, 4].map((n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))));
}
const css = (c) => `rgb(${c.join(',')})`;

const o = {
  W: 4000,
  margin: 56,
  until: [2026, 10, 13],
  channel: 9, // half-width of the bare water between the two banks, px
  smooth: 760, // metres of river either side used to set a stroke's direction
  lane0: 9,
  laneGap: 6.2,
  fuzzy: 28,
  page: hsl(HUE.violet, 0.42, 0.055),
  strand: {
    river: hsl(HUE.violet, 0.85, 0.8),
    settlement: hsl(HUE.straw, 0.92, 0.6),
    textiles: hsl(HUE.lime, 0.95, 0.47),
    rubber: hsl(HUE.leaf, 0.72, 0.46),
    people: hsl(HUE.straw, 0.5, 0.93),
  },
  rose: hsl(HUE.rose, 0.95, 0.6),
};

const records = data.records;
const [lastYear, lastMonth, lastDay] = o.until;
const DAY = 86400000;
const lastDate = Date.UTC(lastYear, lastMonth - 1, lastDay);
const firstYear = Math.min(...Object.values(spans).map((s) => s.from ?? Infinity), ...records.map((r) => r.year));
const years = lastYear - firstYear + 1;
const half = 183 * DAY_PX + o.channel; // reach of a year's stroke either side of the water

// ---- the river, in metres, then in pixels ------------------------------------
const kx = 111320 * Math.cos((51.347 * Math.PI) / 180), ky = 111132;
const m = river.course.map(([lon, lat]) => [lon * kx, -lat * ky]);
const along = [0];
for (let k = 1; k < m.length; k++) along.push(along[k - 1] + Math.hypot(m[k][0] - m[k - 1][0], m[k][1] - m[k - 1][1]));
const length = along[along.length - 1];
function pointAt(s) {
  s = Math.max(0, Math.min(length, s));
  let lo = 0, hi = along.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (along[mid] <= s) lo = mid; else hi = mid; }
  const t = (s - along[lo]) / (along[hi] - along[lo] || 1);
  return [m[lo][0] + (m[hi][0] - m[lo][0]) * t, m[lo][1] + (m[hi][1] - m[lo][1]) * t];
}
const xsM = m.map((p) => p[0]), ysM = m.map((p) => p[1]);
const box = [Math.min(...xsM), Math.min(...ysM), Math.max(...xsM), Math.max(...ysM)];
const pad = o.margin + half * 0.92;
const scale = (o.W - 2 * pad) / (box[2] - box[0]);
const H = Math.round((box[3] - box[1]) * scale + 2 * pad);
const W = o.W;
const px = ([x, y]) => [(x - box[0]) * scale + pad, (y - box[1]) * scale + pad];

// A year (fractional) -> centre of its stroke on the water, and the unit vector
// pointing to the left bank (south, while the river flows west).
function frame(year) {
  const s = ((year - firstYear) / years) * length;
  const c = px(pointAt(s));
  const a = pointAt(s - o.smooth), b = pointAt(s + o.smooth);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [tx, ty] = [(b[0] - a[0]) / d, (b[1] - a[1]) / d];
  return { c, n: [ty, -tx] };
}
const frames = [];
for (let row = 0; row <= years; row++) frames.push(frame(firstYear + row + 0.5));
const frameAt = (year) => frames[Math.max(0, Math.min(years, Math.round(year - firstYear)))];
const bank = (year, d) => { const { c, n } = frameAt(year); return [c[0] + n[0] * d, c[1] + n[1] * d]; };

// ---- records: spans, lanes, how many describe each year ----------------------
const span = records.map((r) => {
  const s = spans[r.id];
  return { from: s.from ?? firstYear, to: s.to ?? lastYear, open: s.from == null, fuzzyFrom: !!s.fuzzyFrom, fuzzyTo: !!s.fuzzyTo };
});
const lane = [];
const laneEnd = [];
records.map((_, i) => i).sort((a, b) => span[a].from - span[b].from || span[b].to - span[a].to || a - b).forEach((i) => {
  let k = 0;
  while (laneEnd[k] !== undefined && laneEnd[k] + 6 > span[i].from) k++;
  lane[i] = k;
  laneEnd[k] = Math.max(span[i].to, span[i].from + 4);
});
const cover = new Array(years).fill(0);
span.forEach((s) => { for (let y = s.from; y <= s.to; y++) cover[y - firstYear]++; });

// ---- the models' layer -------------------------------------------------------
const links = reading(data, name, seed);
const { held, slack } = corroborate(links);
const pull = new Array(records.length).fill(0);
links.forEach(({ i, j, w }) => { pull[i] += w; pull[j] += w; });
const echo = new Array(years).fill(0); // link strength resting on each year
records.forEach((_, i) => { if (pull[i]) for (let y = span[i].from; y <= span[i].to; y++) echo[y - firstYear] += pull[i]; });
const echoMax = Math.max(1, ...echo);

// ---- ground: one mark per day ------------------------------------------------
const energy = [new Float32Array(W * H), new Float32Array(W * H)]; // [records' bank, models' bank]
function splat(buf, x, y, e) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  if (x0 < 0 || y0 < 0 || x0 + 1 >= W || y0 + 1 >= H) return;
  const at = y0 * W + x0;
  buf[at] += e * (1 - fx) * (1 - fy); buf[at + 1] += e * fx * (1 - fy);
  buf[at + W] += e * (1 - fx) * fy; buf[at + W + 1] += e * fx * fy;
}
// The string opens QlWxZp: capital, small, capital, small. Months alternate the same way.
const beat = [...SEED.slice(0, 12)].map((c) => (/[A-Z]/.test(c) ? 1 : 0.5));
let days = 0;
for (let row = 0; row < years; row++) {
  const year = firstYear + row;
  const { c, n } = frames[row];
  const start = Date.UTC(year, 0, 1);
  const mark = year % 100 === 0 ? 2.6 : year % 10 === 0 ? 1.35 : 1;
  for (let d = 0; ; d++) {
    const time = start + d * DAY;
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || time > lastDate) break;
    days++;
    // 1 January at the tip of the north bank, midsummer at the water, 31 December at the tip of the south
    const side = d < 183 ? -1 : 1;
    const dist = side * (o.channel + Math.abs(d - 182.5) * DAY_PX);
    if (date.getUTCDate() === 1 && d) continue; // the first of each month is left dark: a contour between months
    const lit = side > 0 ? 0.62 + 0.3 * cover[row] : 0.62 + 2.6 * (echo[row] / echoMax);
    const e = beat[date.getUTCMonth()] * mark * lit;
    splat(energy[side > 0 ? 0 : 1], c[0] + n[0] * dist, c[1] + n[1] * dist, e);
    // the stroke runs between neighbouring years too, more faintly, so it reads as a line of days and not a lattice
    const q = frames[row + 1];
    splat(energy[side > 0 ? 0 : 1], (c[0] + q.c[0]) / 2 + ((n[0] + q.n[0]) / 2) * dist, (c[1] + q.c[1]) / 2 + ((n[1] + q.n[1]) / 2) * dist, e * 0.22);
  }
}
const rgba = new Uint8Array(W * H * 4);
const tint = [hsl(HUE.violet, 0.5, 0.62), hsl(HUE.rose, 0.6, 0.6)];
const hot = [hsl(HUE.straw, 0.9, 0.9), hsl(HUE.rose, 0.9, 0.86)];
for (let at = 0; at < W * H; at++) {
  const out = [o.page[0], o.page[1], o.page[2]];
  for (let s = 0; s < 2; s++) {
    const e = energy[s][at];
    if (!e) continue;
    const v = 1 - Math.exp(-e * 0.7);
    const w = Math.pow(v, 1.5);
    for (let ch = 0; ch < 3; ch++) {
      const col = tint[s][ch] + (hot[s][ch] - tint[s][ch]) * w;
      out[ch] += (col - out[ch]) * v;
    }
  }
  rgba[at * 4] = out[0]; rgba[at * 4 + 1] = out[1]; rgba[at * 4 + 2] = out[2]; rgba[at * 4 + 3] = 255;
}
writeFileSync(join(here, `${stem}--field.png`), encodePng(W, H, rgba));

// ---- vectors: straight strokes only (the string has no C, G, g, o or 8) ------
const path = (pts) => pts.map((p, k) => (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('');
const offset = (i) => o.lane0 + o.channel + lane[i] * o.laneGap;
const run = (i, y0, y1, side) => {
  const pts = [];
  const d = side > 0 ? offset(i) : -(o.channel + (offset(i) - o.channel) * CAPITAL);
  for (let y = y0; y <= y1; y++) pts.push(bank(y, d));
  if (pts.length === 1) pts.push(bank(y1 + 1, d));
  return path(pts);
};
const tick = (i, side, reach) => {
  const d = side > 0 ? offset(i) : -(o.channel + (offset(i) - o.channel) * CAPITAL);
  const { n } = frameAt(records[i].year);
  const p = bank(records[i].year, d);
  return `M${f(p[0] - n[0] * reach)} ${f(p[1] - n[1] * reach)}L${f(p[0] + n[0] * reach)} ${f(p[1] + n[1] * reach)}`;
};

let under = '', threads = '', ticks = '', echoes = '', echoTicks = '';
const pullMax = Math.max(1, ...pull);
records.forEach((r, i) => {
  const s = span[i];
  const solidFrom = s.fuzzyFrom || s.open ? Math.min(s.from + o.fuzzy, s.to) : s.from;
  const solidTo = s.fuzzyTo ? Math.max(s.to - o.fuzzy, solidFrom) : s.to;
  const col = css(o.strand[r.strand]);
  under += `<path d="${run(i, s.from, s.to, 1)}"/>`;
  threads += `<path d="${run(i, solidFrom, solidTo, 1)}" stroke="${col}"/>`;
  for (const [a, b] of [[s.from, solidFrom], [solidTo, s.to]])
    if (b > a) threads += `<path d="${run(i, a, b, 1)}" stroke="${col}" stroke-dasharray="2 5"/>`;
  ticks += `<path d="${tick(i, 1, 6.5)}" stroke="${col}"/>`;
  if (pull[i]) {
    const k = pull[i] / pullMax;
    echoes += `<path d="${run(i, s.from, s.to, -1)}" stroke-width="${f(1 + 2.6 * k)}" opacity="${f(0.45 + 0.55 * k)}"/>`;
    echoTicks += `<path d="${tick(i, -1, 8)}"/>`;
  }
});

// Links: the straight way over the land, from echo to echo.
const foot = (i) => bank(records[i].year, -(o.channel + (offset(i) - o.channel) * CAPITAL));
const chord = ({ i, j, w }, bright) => {
  const [a, b] = [foot(i), foot(j)];
  const strands = Math.max(1, Math.round(w)); // one hairline per point of strength
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const [nx, ny] = [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  let out = '';
  for (let k = 0; k < strands; k++) {
    const off = (k - (strands - 1) / 2) * 2.6;
    // hairlines part in the middle and meet at both ends, still straight: two segments each
    const mid = [(a[0] + b[0]) / 2 + nx * off * 2.2, (a[1] + b[1]) / 2 + ny * off * 2.2];
    out += `<path d="${path([a, mid, b])}" stroke-width="${bright ? 1.5 : 0.9}"/>`;
  }
  return out;
};
const faint = slack.map((l) => chord(l, false)).join('');
const strong = held.map((l) => chord(l, true)).join('');

// Century and decade strokes run a little past the fringe on both banks.
let rules = '';
for (let row = 0; row < years; row++) {
  const year = firstYear + row;
  if (year % 100) continue;
  for (const side of [-1, 1]) {
    const a = bank(year, side * (half + 6)), b = bank(year, side * (half + 46));
    rules += `<path d="${path([a, b])}"/>`;
  }
}

// The water: the course itself as OpenStreetMap gives it, vertex to vertex.
const water = path(m.map(px));

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<rect width="100%" height="100%" fill="${css(o.page)}"/>` +
  `<image href="${stem}--field.png" x="0" y="0" width="${W}" height="${H}"/>` +
  `<g fill="none" stroke-linecap="butt" stroke-linejoin="miter">` +
  `<path d="${water}" stroke="${css(o.page)}" stroke-width="${o.channel * 2 - 3}"/>` +
  `<path d="${water}" stroke="${css(hsl(HUE.violet, 0.9, 0.86))}" stroke-width="1.6"/>` +
  `<g stroke="${css(hsl(HUE.violet, 0.5, 0.7))}" stroke-width="1.4" opacity="0.8">${rules}</g>` +
  `<g stroke="${css(o.rose)}" opacity="0.34">${faint}</g>` +
  `<g stroke="${css(o.page)}" stroke-width="5.4" opacity="0.8">${under}</g>` +
  `<g stroke="${css(o.rose)}">${echoes}</g>` +
  `<g stroke-width="3">${threads}</g>` +
  `<g stroke="${css(hsl(HUE.rose, 1, 0.7))}" opacity="0.95">${strong}</g>` +
  `<g stroke-width="3.2">${ticks}</g>` +
  `<g stroke="${css(hsl(HUE.rose, 1, 0.82))}" stroke-width="2.6">${echoTicks}</g>` +
  `</g></svg>`;
writeFileSync(join(here, `${stem}.svg`), svg);

console.log(`${name}: ${days.toLocaleString('en-GB')} days, ${firstYear} to ${o.until.join('-')}`);
console.log(`hues ${JSON.stringify(HUE)}, ${DAY_PX} px a day, ${f((length * scale) / years)} px a year along the water`);
console.log(`${Math.max(...lane) + 1} lanes, ${held.length} held and ${slack.length} slack links, page ${W} x ${H}`);

execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
  '--force-device-scale-factor=1', `--window-size=${W},${H}`, `--screenshot=${join(here, `${stem}.png`)}`,
  'file://' + join(here, `${stem}.svg`)], { stdio: 'ignore' });
if (name === 'models')
  execFileSync('sips', ['-Z', '1600', join(here, 'out.png'), '--out', join(here, 'preview.png')], { stdio: 'ignore' });
