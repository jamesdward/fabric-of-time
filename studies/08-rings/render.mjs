// Study 08: Rings
//
// The river motif set aside for the town itself. Each place grows rings on a
// plan of Bradford-on-Avon, one ring per year, but only for the years that
// some record describes it. The present is at each place's centre and the
// deep past is the widest ring, so the same radius is the same year everywhere.
//
// Mapping (all authored, see studies/README.md):
//   plan      today's buildings, roads and water from OpenStreetMap, faint
//   rings     drawn as threads: concentric lines round each located place, one for
//             every few years recorded there, alternating between the place's colour
//             and the strand colours of its records, shared out as wedges when several
//             records describe the same years. The plan shows between the threads.
//   overlap   where two places' rings cover the same ground, their threads cross like
//             hatching, and at each crossing the one on top alternates, as in plain
//             weave. (--overlap=stack lays the more recent year on top instead.)
//   gaps      a missing thread at every century
//   town-wide records, which have no single place, are each a fine dashed circle
//             around the middle of the located places, at the radius of their year
//   tracks    the links of the chosen reading, in the paper's colour, leaving each
//             record's ring on the side that faces the other record
//
//   node studies/08-rings/render.mjs [reading] [seed] [--png] [--overlap=stack]

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { READINGS, reading, f } from '../lib/core.mjs';
import { corroborate } from '../03-hold/sketch.mjs';
import { encodePng } from '../lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const data = load('experiments/01-kingston-test/outputs/data.json');
const { spans } = load('data/described-spans.json');
const { places } = load('data/places.json');
const plan = load('data/town/plan.json');

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const name = args[0] ?? 'models';
const seed = Number(args[1] ?? 7);
if (!READINGS.includes(name)) throw new Error(`unknown reading: ${name}`);

const o = {
  width: 4000,
  margin: 160,
  until: 2026,
  maxRadius: 600, // the earliest year, in pixels from a place's centre
  threadPitch: 6, // pixels from one thread to the next, about 18 years
  threadWidth: 2.6,
  paper: '#f5ecc2',
  ink: '#111314',
  place: ['#f05a30', '#1c4286', '#f8b6ba', '#00978d', '#fcb315', '#6450a1',
    '#f37f94', '#88c540', '#006eb8', '#a84122', '#78cdd0', '#a1a39a'],
  strand: { river: '#5b82b3', settlement: '#c5a56e', textiles: '#cc1335', rubber: '#111314', people: '#fff204' },
};

const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
const records = data.records;
const firstYear = Math.min(...Object.values(spans).map((s) => s.from ?? Infinity), ...records.map((r) => r.year));
const yearSpan = o.until - firstYear;

// Projection: the located places plus room for their widest rings, metres turned to pixels, north up.
const pts = Object.values(places);
const pad = 0.0042; // about 300 m
const [west, south, east, north] = [Math.min(...pts.map((p) => p.lon)) - pad * 1.6, Math.min(...pts.map((p) => p.lat)) - pad,
  Math.max(...pts.map((p) => p.lon)) + pad * 1.6, Math.max(...pts.map((p) => p.lat)) + pad];
const latMid = (south + north) / 2;
const kx = 111320 * Math.cos((latMid * Math.PI) / 180), ky = 111132;
const inner = o.width - 2 * o.margin;
const scale = inner / ((east - west) * kx);
const height = Math.round(((north - south) * ky) * scale) + 2 * o.margin;
const project = ([lon, lat]) => [o.margin + (lon - west) * kx * scale, o.margin + (north - lat) * ky * scale];
const W = o.width, H = height;

// Each place: centre in pixels, colour, and its records.
const groupIndex = Object.fromEntries(data.groups.map((g, k) => [g, k]));
const sites = data.groups.map((group, k) => {
  const at = places[group];
  return {
    group,
    colour: rgb(o.place[k]),
    centre: at ? project([at.lon, at.lat]) : null,
    list: records.map((_, i) => i).filter((i) => records[i].site_group === group),
  };
});
const located = sites.filter((s) => s.centre);
const middle = [0, 1].map((a) => located.reduce((n, s) => n + s.centre[a], 0) / located.length);
for (const s of sites) if (!s.centre) Object.assign(s, { centre: middle, town: true });

const radiusOf = (year) => ((o.until - year) / yearSpan) * o.maxRadius;
const yearAt = (r) => o.until - (r / o.maxRadius) * yearSpan;
const active = (i, year) => {
  const s = spans[records[i].id];
  return (s.from ?? firstYear) <= year && year <= (s.to ?? o.until);
};
const strandRgb = Object.fromEntries(Object.entries(o.strand).map(([k, v]) => [k, rgb(v)]));
const paper = rgb(o.paper);

// What one place lays down at a pixel, or null where it has nothing recorded.
// Its rings are drawn as threads: concentric lines `threadPitch` apart, each one
// `threadWidth` wide, alternating between the place's colour and the colour of
// the strand recorded at that angle. A century loses its thread, leaving a gap.
function threadAt(site, x, y) {
  const dx = x - site.centre[0], dy = y - site.centre[1];
  const r = Math.hypot(dx, dy);
  if (r > o.maxRadius + o.threadWidth) return null;
  const k = Math.round(r / o.threadPitch); // the nearest thread
  const cover = Math.min(1, Math.max(0, o.threadWidth / 2 + 0.5 - Math.abs(r - k * o.threadPitch)));
  if (!cover) return null;
  const from = yearAt((k + 0.5) * o.threadPitch), to = yearAt((k - 0.5) * o.threadPitch);
  if (Math.floor(from / 100) !== Math.floor(to / 100)) return null; // this thread straddles a century
  const year = Math.floor(yearAt(k * o.threadPitch));
  const here = site.list.filter((i) => active(i, year));
  if (!here.length) return null;
  const turn = (Math.atan2(dy, dx) / (2 * Math.PI) + 1.25) % 1; // 0 at north, clockwise
  const record = here[Math.min(here.length - 1, Math.floor(turn * here.length))];
  return { c: k % 2 ? strandRgb[records[record].strand] : site.colour, cover, r, k };
}

const stack = process.argv.includes('--overlap=stack');
const rgba = new Uint8Array(W * H * 4);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const hits = [];
    for (const site of sites) {
      if (site.town) continue;
      const hit = threadAt(site, x, y);
      if (hit) hits.push(hit);
    }
    if (!hits.length) continue;
    // where threads of two places cross, which one lies on top alternates from one
    // crossing to the next, as in plain weave (or, with --overlap=stack, the more recent)
    const pick = stack || hits.length === 1
      ? hits.reduce((a, b) => (b.r < a.r ? b : a))
      : hits[hits.reduce((n, h) => n + h.k, 0) % hits.length];
    const c = pick.c;
    const at = (y * W + x) * 4;
    rgba[at] = c[0]; rgba[at + 1] = c[1]; rgba[at + 2] = c[2];
    rgba[at + 3] = Math.round(255 * Math.max(...hits.map((h) => h.cover)));
  }

const out = join(here, '../out');
mkdirSync(out, { recursive: true });
const stem = `08-rings--${name}--seed${seed}${stack ? '--stack' : ''}`;
writeFileSync(join(out, `${stem}--field.png`), encodePng(W, H, rgba));

// The plan, faint, over the paper and under the rings' gaps.
const path = (pts) => pts.map((p, k) => (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('');
const lines = (list) => list.map((pts) => `<path d="${path(pts.map(project))}"/>`).join('');
const fills = (list) => list.map((pts) => `<path d="${path(pts.map(project))}Z"/>`).join('');

// Links: each end sits on its record's ring, on the side facing the other end.
const knot = (i, toward) => {
  const s = sites[groupIndex[records[i].site_group]];
  const r = radiusOf(records[i].year);
  let ang = Math.atan2(toward[1] - s.centre[1], toward[0] - s.centre[0]);
  if (!Number.isFinite(ang) || Math.hypot(toward[0] - s.centre[0], toward[1] - s.centre[1]) < 1) ang = -Math.PI / 2;
  return [s.centre[0] + Math.cos(ang) * r, s.centre[1] + Math.sin(ang) * r];
};
const track = ({ i, j }, k) => {
  const si = sites[groupIndex[records[i].site_group]], sj = sites[groupIndex[records[j].site_group]];
  if (si === sj) {
    // same place: a radial track between the two years, at an angle set by the link's order
    const ang = -Math.PI / 2 + k * 2.39996; // golden angle, so tracks spread round
    const [a, b] = [radiusOf(records[i].year), radiusOf(records[j].year)];
    const p = (r) => [si.centre[0] + Math.cos(ang) * r, si.centre[1] + Math.sin(ang) * r];
    return `M${f(p(a)[0])} ${f(p(a)[1])}L${f(p(b)[0])} ${f(p(b)[1])}`;
  }
  const a = knot(i, sj.centre), b = knot(j, si.centre);
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const bend = 0.18;
  const c = [mid[0] - (b[1] - a[1]) * bend, mid[1] + (b[0] - a[0]) * bend];
  return `M${f(a[0])} ${f(a[1])}Q${f(c[0])} ${f(c[1])} ${f(b[0])} ${f(b[1])}`;
};
const town = sites.find((s) => s.town);
const townRings = town.list.map((i) => `<circle cx="${f(town.centre[0])}" cy="${f(town.centre[1])}" r="${f(radiusOf(records[i].year))}"/>`).join('');

const { held, slack } = corroborate(reading(data, name, seed));
const links = [...held.map((l) => ({ ...l, held: true })), ...slack];
const thin = links.map((l, k) => (l.held ? '' : `<path d="${track(l, k)}"/>`)).join('');
const wide = links.map((l, k) => (l.held ? `<path d="${track(l, k)}"/>` : '')).join('');

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<rect width="100%" height="100%" fill="${o.paper}"/>` +
  `<g fill="${o.ink}" opacity="0.07">${fills(plan.water)}</g>` +
  `<g fill="none" stroke="${o.ink}" stroke-linejoin="round" stroke-linecap="round">` +
  `<g stroke-width="0.9" opacity="0.3">${fills(plan.buildings)}</g>` +
  `<g stroke-width="1.2" opacity="0.3">${lines(plan.roads)}</g>` +
  `<g stroke-width="1.6" opacity="0.35" stroke-dasharray="9 5">${lines(plan.rail)}</g>` +
  `<g stroke-width="2.6" opacity="0.4">${lines(plan.rivers)}</g></g>` +
  `<image href="${stem}--field.png" width="${W}" height="${H}" style="image-rendering:pixelated"/>` +
  `<g fill="none" stroke="${o.ink}" stroke-width="2" stroke-dasharray="4 8" opacity="0.6">${townRings}</g>` +
  `<g fill="none" stroke-linecap="round">` +
  `<g stroke="${o.ink}" opacity="0.45"><g stroke-width="4.5">${thin}</g><g stroke-width="10">${wide}</g></g>` +
  `<g stroke="${o.paper}"><g stroke-width="2.6">${thin}</g><g stroke-width="7">${wide}</g></g></g>` +
  `</svg>`;
writeFileSync(join(out, `${stem}.svg`), svg);
console.log(`${name}: ${W} x ${H}, ${located.length} located places, ${held.length} held and ${slack.length} slack links`);

if (process.argv.includes('--png')) {
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${W},${H}`, `--screenshot=${join(out, `${stem}.png`)}`,
    'file://' + join(out, `${stem}.svg`)], { stdio: 'ignore' });
}
