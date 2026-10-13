// Seed study B: Ford
//
// Direction derived from the random string in seed.txt (see README.md).
// The River Avon is drawn once, in plan, across the top. Every year since 230
// is a ripple that has left the river and is still travelling: the present is
// at the water, the oldest year is furthest away. Records lie on the ripple of
// their year; links run along a ripple and then drop through time.
//
//   node studies/seeds/b/render.mjs          writes field.png, out.svg, out.png, preview.png
//   node studies/seeds/b/render.mjs --no-png writes field.png and out.svg only
//
// Deterministic: no randomness is used anywhere.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { reading } from '../../lib/core.mjs';
import { encodePng } from '../../lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const data = load('experiments/01-kingston-test/outputs/data.json');
const river = load('data/river/avon-course.json');
const { spans } = load('data/described-spans.json');
const SEED = readFileSync(join(here, 'seed.txt'), 'utf8').trim();

// ---- decisions that came from the string --------------------------------
const UNIT = 14; // years per character: 128 characters x 14 = 1,792 years
const BANDS = SEED.length; // 128 = 2^7
const cls = [...SEED].map((c) => (/\d/.test(c) ? 'd' : /[A-Z]/.test(c) ? 'U' : 'l'));
const DOUBLINGS = new Set([0, 1, 2, 3, 4, 5, 6].map((k) => UNIT * 2 ** k)); // 14 .. 896 years ago
const INK = {
  dark: [13, 9, 11], // "d"
  white: [242, 236, 222], // "W"
  far: '#ff2b40', // "F": far red, after 761 nm
  farDeep: '#8e0c1c',
};
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');

// ---- layout ---------------------------------------------------------------
const W = 3000, H = 4000;
const PITCH = 1.72; // pixels per year
const NOW = 2026, FIRST = 230;
const YEARS = NOW - FIRST; // 1,796
const RIVER_W = 2560, RIVER_X = 220, RIVER_Y = 455;
const depthOf = (year) => (NOW - year) * PITCH;

// ---- the river, in plan, north up -------------------------------------------
const kx = 111320 * Math.cos((51.347 * Math.PI) / 180), ky = 111132;
const raw = river.course.map(([lon, lat]) => [lon * kx, lat * ky]);
const minX = Math.min(...raw.map((p) => p[0])), maxX = Math.max(...raw.map((p) => p[0]));
const maxY = Math.max(...raw.map((p) => p[1]));
const sc = RIVER_W / (maxX - minX);
const R = raw.map(([x, y]) => [RIVER_X + (x - minX) * sc, RIVER_Y + (maxY - y) * sc]);
const NS = R.length - 1;
const ax = new Float64Array(NS), ay = new Float64Array(NS), bx = new Float64Array(NS), by = new Float64Array(NS), il = new Float64Array(NS);
for (let k = 0; k < NS; k++) {
  ax[k] = R[k][0]; ay[k] = R[k][1];
  bx[k] = R[k + 1][0] - ax[k]; by[k] = R[k + 1][1] - ay[k];
  il[k] = 1 / (bx[k] * bx[k] + by[k] * by[k] || 1);
}
function segD2(k, px, py) {
  const dx = px - ax[k], dy = py - ay[k];
  let t = (dx * bx[k] + dy * by[k]) * il[k];
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const ex = dx - bx[k] * t, ey = dy - by[k] * t;
  return ex * ex + ey * ey;
}
// Distance to the river, the nearest point on it, and the unit direction away from it.
function near(px, py) {
  let best = Infinity, bk = 0;
  for (let k = 0; k < NS; k++) {
    const d2 = segD2(k, px, py);
    if (d2 < best) { best = d2; bk = k; }
  }
  const dx = px - ax[bk], dy = py - ay[bk];
  let t = (dx * bx[bk] + dy * by[bk]) * il[bk];
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const nx = ax[bk] + bx[bk] * t, ny = ay[bk] + by[bk] * t;
  const d = Math.sqrt(best) || 1e-9;
  return { d, nx, ny, gx: (px - nx) / d, gy: (py - ny) / d };
}
const project = (p, D) => { const n = near(p[0], p[1]); return [n.nx + n.gx * D, n.ny + n.gy * D]; };

// ---- records: a lane each ----------------------------------------------------
// Two banks. People and rubber on the north bank, river, settlement and cloth on the south.
const records = data.records;
const NORTH = new Set(['people', 'rubber']);
const GROUP_GAP = 0.6;
// The point in column x that is D pixels from the river, on the given bank (+1 south, -1 north).
function columnPoint(x, D, side) {
  let prev = null;
  for (let y = side > 0 ? H + 900 : -900; side > 0 ? y >= 0 : y <= H; y -= side) {
    const d = near(x, y).d;
    if (d <= D) return prev === null ? [x, y] : [x, y + (side * (D - d)) / (prev - d)];
    prev = d;
  }
  return [x, 0];
}
// Follow the ripples outward from p (away from the river) until depth D; one point per pixel of depth.
function outward(p, D) {
  const out = [];
  let next = Math.floor(near(p[0], p[1]).d) + 1;
  for (let guard = 0; guard < 40000 && next <= D + 1; guard++) {
    const n = near(p[0], p[1]);
    if (n.d >= next) { out.push(p); next++; continue; }
    p = [p[0] + n.gx * 0.5, p[1] + n.gy * 0.5];
  }
  return out;
}
const rec = [];
for (const [side, x0, x1] of [[1, 120, W - 260], [-1, 520, W - 430]]) {
  const order = [];
  data.groups.forEach((g, gi) => {
    records.map((r, i) => i).filter((i) => records[i].site_group === g && NORTH.has(records[i].strand) === side < 0)
      .sort((a, b) => records[a].year - records[b].year || a - b)
      // the oldest record of a place in the middle, later ones alternately to either side
      .reduce((row, i, k) => (k % 2 ? [...row, i] : [i, ...row]), [])
      .reduceRight((row, i) => [...row, i], [])
      .forEach((i) => order.push({ i, gi }));
  });
  const gis = [...new Set(order.map((o) => o.gi))];
  const slots = order.length - 1 + (gis.length - 1) * GROUP_GAP;
  order.forEach(({ i, gi }, k) => {
    const r = records[i], s = spans[r.id];
    const from = s.from ?? FIRST, to = s.to ?? NOW;
    const dFocal = depthOf(r.year);
    const dFrom = depthOf(from), dTo = depthOf(to);
    const x = x0 + ((k + gis.indexOf(gi) * GROUP_GAP) / slots) * (x1 - x0);
    const A = columnPoint(x, dFocal, side);
    const n = near(A[0], A[1]);
    const beyond = outward(A, Math.max(dFrom, dFocal) + 2);
    const base = Math.floor(n.d) + 1;
    const at = (d) => {
      if (d <= n.d || !beyond.length) return [n.nx + n.gx * d, n.ny + n.gy * d];
      return beyond[Math.max(0, Math.min(beyond.length - 1, Math.round(d - base)))];
    };
    if (process.argv.includes('--debug')) console.log(i, r.id, r.year, r.strand, side, A.map(Math.round).join(','));
    rec[i] = { i, r, s, side, from, to, dFocal, dFrom, dTo, at, n, A, deg: 0, words: new Set() };
  });
}

// ---- links: the models' reading, with each model's own strength -----------------
const pairAt = new Map(data.pairs.map((p) => [p.i + ',' + p.j, p]));
const links = reading(data, 'models').map(({ i, j }) => {
  const p = pairAt.get(i + ',' + j) ?? pairAt.get(j + ',' + i);
  const [young, old] = rec[i].dFocal <= rec[j].dFocal ? [i, j] : [j, i];
  for (const w of p.words) { rec[i].words.add(w.toLowerCase()); rec[j].words.add(w.toLowerCase()); }
  rec[i].deg++; rec[j].deg++;
  return { young, old, a: p.a, b: p.b };
});

// ---- the field of ripples (raster) ----------------------------------------------
console.log('ripples...');
const TILE = 16;
const tw = Math.ceil(W / TILE), th = Math.ceil(H / TILE);
// Glow: how strongly the records speak of this year, near this spot.
const GC = 8, gw = Math.ceil(W / GC) + 1, gh = Math.ceil(H / GC) + 1;
const glow = new Float32Array(gw * gh);
const SIGMA = 70;
for (let cy = 0; cy < gh; cy++)
  for (let cx = 0; cx < gw; cx++) {
    const px = cx * GC, py = cy * GC;
    const d = near(px, py).d;
    let g = 0;
    for (const q of rec) {
      const edge = Math.min(d - q.dTo, q.dFrom - d) / 10 + 1; // fades over a few years past each end
      if (edge <= 0) continue;
      const p = q.at(d);
      const e2 = ((px - p[0]) ** 2 + (py - p[1]) ** 2) / (SIGMA * SIGMA);
      if (e2 < 9) g += Math.min(1, edge) * Math.exp(-e2);
    }
    glow[cy * gw + cx] = g;
  }

const cover = new Float32Array(YEARS + 2);
for (const q of rec) for (let k = NOW - q.to; k <= NOW - q.from && k <= YEARS; k++) cover[k]++;
const rgba = new Uint8Array(W * H * 4);
const cand = new Int32Array(NS);
const maxDepth = YEARS * PITCH;
for (let ty = 0; ty < th; ty++)
  for (let tx = 0; tx < tw; tx++) {
    const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
    let dmin = Infinity;
    const ds = new Float64Array(NS);
    for (let k = 0; k < NS; k++) { ds[k] = Math.sqrt(segD2(k, cx, cy)); if (ds[k] < dmin) dmin = ds[k]; }
    let nc = 0;
    const reach = dmin + TILE * 1.5;
    for (let k = 0; k < NS; k++) if (ds[k] <= reach) cand[nc++] = k;
    for (let py = ty * TILE; py < Math.min(H, (ty + 1) * TILE); py++)
      for (let px = tx * TILE; px < Math.min(W, (tx + 1) * TILE); px++) {
        let best = Infinity, bk = 0;
        for (let c = 0; c < nc; c++) { const d2 = segD2(cand[c], px + 0.5, py + 0.5); if (d2 < best) { best = d2; bk = cand[c]; } }
        const d = Math.sqrt(best);
        let v = 0;
        if (d < maxDepth) {
          const ya = d / PITCH, k = Math.floor(ya), fr = ya - k;
          const band = Math.min(BANDS - 1, Math.floor(k / UNIT)), pos = k % UNIT;
          const c = cls[band];
          let hw = c === 'l' ? 0.3 : 0.43, amp = c === 'l' ? 0.75 : 1;
          let lift = 0;
          if (pos === UNIT - 1) amp = 0; // the seam between one character's years and the next
          if (DOUBLINGS.has(k)) { hw = 0.85; amp = 1; lift = 0.55; }
          else if (c === 'd' && amp) {
            // digit bands: the year lines are broken into dots
            const dx = px + 0.5 - ax[bk], dy = py + 0.5 - ay[bk];
            const u = Math.abs(dx) > Math.abs(dy) ? py : px;
            if ((u + k * 3) % 6 >= 3) amp = 0.12;
          }
          const cov = Math.max(0, Math.min(1, 0.5 + hw - Math.abs(fr - 0.5) * PITCH));
          const gx = px / GC, gy = py / GC, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
          const gl = glow[y0 * gw + x0] * (1 - fx) * (1 - fy) + glow[y0 * gw + x0 + 1] * fx * (1 - fy) +
            glow[(y0 + 1) * gw + x0] * (1 - fx) * fy + glow[(y0 + 1) * gw + x0 + 1] * fx * fy;
          const fadeOut = Math.min(1, (maxDepth - d) / 120);
          v = cov * amp * Math.min(1, 0.17 + 0.028 * Math.min(cover[k], 9) + lift + 0.5 * (1 - Math.exp(-gl * 0.9))) * (0.35 + 0.65 * fadeOut);
        }
        const at = (py * W + px) * 4;
        for (let ch = 0; ch < 3; ch++) rgba[at + ch] = Math.round(INK.dark[ch] + (INK.white[ch] - INK.dark[ch]) * v);
        rgba[at + 3] = 255;
      }
  }
writeFileSync(join(here, 'field.png'), encodePng(W, H, rgba));

// ---- vectors -------------------------------------------------------------------
console.log('threads...');
const f = (n) => (Math.round(n * 10) / 10).toString();
const path = (pts) => pts.map((p, k) => (k ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1])).join('');
const white = hex(INK.white), dark = hex(INK.dark);

// Walk along the ripple of depth D from p, `sense` = +1 or -1.
function walk(p, D, sense, step, count) {
  const out = [p];
  for (let k = 0; k < count; k++) {
    const n = near(p[0], p[1]);
    p = project([p[0] - n.gy * sense * step, p[1] + n.gx * sense * step], D);
    out.push(p);
  }
  return out;
}

// Spans: the years a record describes, drawn along its lane. Five strands, five kinds of line.
let spanUnder = '', spanInk = '', fringes = '', fringesFar = '', knots = '';
for (const q of rec) {
  const { r, s } = q;
  const FUZZ = 28 * PITCH;
  const solidOld = s.fuzzyFrom || s.from == null ? Math.max(q.dTo, q.dFrom - FUZZ) : q.dFrom;
  const solidNew = s.fuzzyTo ? Math.min(solidOld, q.dTo + FUZZ) : q.dTo;
  const lanePts = (d0, d1, step) => { const o = []; for (let d = d0; d < d1; d += step) o.push(q.at(d)); o.push(q.at(d1)); return o; };
  const shifted = (pts, offAt) => pts.map((p, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, o = offAt(k);
    return [p[0] - ((b[1] - a[1]) / l) * o, p[1] + ((b[0] - a[0]) / l) * o];
  });
  if (solidOld - solidNew > 1) {
    const pts = lanePts(solidNew, solidOld, 2);
    spanUnder += `<path d="${path(pts)}"/>`;
    if (r.strand === 'river') spanInk += `<path d="${path(shifted(pts, (k) => 3.4 * Math.sin(k / 2.75)))}" stroke-width="2.2"/>`;
    else if (r.strand === 'settlement') spanInk += `<path d="${path(shifted(pts, () => -2.5))}${path(shifted(pts, () => 2.5))}" stroke-width="1.8"/>`;
    else if (r.strand === 'textiles') spanInk += `<path d="${path(shifted(lanePts(solidNew, solidOld, 4.5), (k) => (k % 2 ? 3.8 : -3.8)))}" stroke-width="2" stroke-linejoin="miter"/>`;
    else if (r.strand === 'rubber') spanInk += `<path d="${path(pts)}" stroke-width="5.2" stroke-linecap="butt"/>`;
    else spanInk += `<path d="${path(pts)}" stroke-width="3.8" stroke-dasharray="0.1 7"/>`;
  }
  for (const [d0, d1] of [[solidOld, q.dFrom], [q.dTo, solidNew]])
    if (d1 - d0 > 1) spanInk += `<path d="${path(lanePts(d0, d1, 2))}" stroke-width="1.7" stroke-dasharray="1.5 8" opacity="0.85"/>`;

  // Fringe: the record's own words, one tick each, along the ripple of its year.
  const words = r.text.split(/\s+/).filter(Boolean);
  const TICK = 3.2;
  const slotsN = words.length + words.filter((w) => /[.;:!?]$/.test(w)).length;
  const half = Math.floor(slotsN / 2);
  const left = walk(q.A, q.dFocal, -1, TICK, half + 1), right = walk(q.A, q.dFocal, 1, TICK, slotsN - half + 1);
  const along = [...left.slice(1).reverse(), ...right];
  let slot = 0;
  for (const w of words) {
    const letters = w.replace(/[^A-Za-z0-9]/g, '');
    const p = along[slot++];
    if (/[.;:!?]$/.test(w)) slot++;
    if (!letters.length || !p) continue;
    const n = near(p[0], p[1]);
    const len = Math.min(4 + letters.length * 3, Math.max(2, q.dFocal - 8));
    const d = `M${f(p[0])} ${f(p[1])}L${f(p[0] - n.gx * len)} ${f(p[1] - n.gy * len)}`;
    if (q.words.has(letters.toLowerCase())) fringesFar += `<path d="${d}"/>`;
    else fringes += `<path d="${d}"/>`;
  }
  fringes += `<path d="${path(along.slice(0, slotsN))}" stroke-width="1"/>`;

  // Knot at the focal year: shape by strand, size by how many links touch the record.
  const [x, y] = q.A, k = 5.5 + 1.3 * q.deg;
  const st = `fill="${dark}" stroke="${white}" stroke-width="1.8"`;
  if (r.strand === 'river') knots += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(k)}" ${st}/>`;
  else if (r.strand === 'settlement') knots += `<rect x="${f(x - k)}" y="${f(y - k)}" width="${f(2 * k)}" height="${f(2 * k)}" ${st}/>`;
  else if (r.strand === 'textiles') knots += `<path d="M${f(x)} ${f(y - k * 1.3)}L${f(x + k * 1.3)} ${f(y)}L${f(x)} ${f(y + k * 1.3)}L${f(x - k * 1.3)} ${f(y)}Z" ${st}/>`;
  else if (r.strand === 'rubber') knots += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(k)}" fill="${white}" stroke="${dark}" stroke-width="1.8"/>`;
  else knots += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(k)}" ${st}/><circle cx="${f(x)}" cy="${f(y)}" r="${f(k * 0.36)}" fill="${white}"/>`;
}

// Links: from the younger record, down through time to the older record's year,
// then along that year's ripple to the older record. One strand per model; the
// two cross once, where the thread turns.
let linkUnder = '', linkInk = '';
const usedS = new Map(), usedT = new Map();
const STEP = 3;
// One thread from record `from` to record `to`: through time (and over the water if they
// are on opposite banks) until it meets the ripple of `to`'s year, then along that ripple.
function thread(from, to, ks, kt, ford = true) {
  const D = to.dFocal + 8 + kt * 5;
  let p = from.A;
  if (ks) {
    const lateral = Math.ceil(ks / 2) * 5 * (ks % 2 ? 1 : -1);
    p = walk(from.A, from.dFocal, Math.sign(lateral), Math.abs(lateral), 1)[1];
  }
  const pts = [from.A, p];
  let n = near(p[0], p[1]);
  if (from.side !== to.side && ford) {
    // to the present, and across the water
    for (let d = n.d - STEP; d > -3; d -= STEP) pts.push([n.nx + n.gx * d, n.ny + n.gy * d]);
    p = [n.nx - n.gx * 3, n.ny - n.gy * 3];
    pts.push(p);
    n = near(p[0], p[1]);
  }
  let reached = D;
  if (n.d > D) {
    // towards the present: a straight line to the nearest water
    for (let d = n.d - STEP; d > D; d -= STEP) pts.push([n.nx + n.gx * d, n.ny + n.gy * d]);
    p = [n.nx + n.gx * D, n.ny + n.gy * D];
  } else {
    // away from the present: follow the ripples outward, as far as they go
    let since = 0, mark = n.d, markAt = 0;
    for (let g = 0; g < 30000; g++) {
      n = near(p[0], p[1]);
      if (n.d >= D) break;
      if (g - markAt > 400) { if (n.d - mark < 2) { reached = n.d; break; } mark = n.d; markAt = g; }
      p = [p[0] + n.gx, p[1] + n.gy];
      if (++since >= STEP) { pts.push(p); since = 0; }
    }
    p = project(p, reached);
  }
  pts.push(p);
  const corner = pts.length - 1;
  const n0 = near(p[0], p[1]);
  const guess = Math.sign(-n0.gy * (to.A[0] - p[0]) + n0.gx * (to.A[1] - p[1])) || 1;
  let bestRun = [], miss = Infinity;
  for (const sense of [guess, -guess]) {
    if (miss < 60 && bestRun.length < 40) break;
    let q = p, best = Infinity, bestAt = 0;
    const run = [];
    for (let k = 0; k < (miss < 60 ? bestRun.length : 3200); k++) {
      const m = near(q[0], q[1]);
      q = project([q[0] - m.gy * sense * STEP, q[1] + m.gx * sense * STEP], reached);
      run.push(q);
      const dist = Math.hypot(q[0] - to.A[0], q[1] - to.A[1]);
      if (dist < best) { best = dist; bestAt = k; }
      else if (best < 60 && dist > best + 40) break;
    }
    const better = miss >= 60 ? best < miss : best < 60 && bestAt + 1 < bestRun.length;
    if (better) { miss = best; bestRun = run.slice(0, bestAt + 1); }
  }
  pts.push(...bestRun, to.A);
  return { pts, corner, miss, length: pts.length };
}
let strays = 0;
for (const L of links) {
  const y = rec[L.young], o = rec[L.old];
  // Preferred: leave the younger record and run along the older one's year. If the ripples
  // cannot carry it there (a bay of the river closes over), run it the other way round.
  let t = thread(y, o, usedS.get(L.young) ?? 0, usedT.get(L.old) ?? 0), s0 = L.young, t0 = L.old;
  if (t.miss > 60) {
    const alt = thread(o, y, usedS.get(L.old) ?? 0, usedT.get(L.young) ?? 0);
    if (alt.miss < t.miss) { t = alt; s0 = L.old; t0 = L.young; }
  }
  if (t.miss > 60) {
    // last resort: no ford, the long way round the end of the river
    const alt = thread(y, o, usedS.get(L.young) ?? 0, usedT.get(L.old) ?? 0, false);
    if (alt.miss < t.miss) { t = alt; s0 = L.young; t0 = L.old; }
  }
  usedS.set(s0, (usedS.get(s0) ?? 0) + 1); usedT.set(t0, (usedT.get(t0) ?? 0) + 1);
  if (t.miss > 60) strays++;
  if (process.argv.includes('--debug')) console.log(L.young, L.old, s0 === L.young ? 'fwd' : 'rev', Math.round(t.miss), t.pts.length);
  const { pts, corner } = t;
  // two strands, swapping sides at the corner
  const strand = (sign) => pts.map((pt, k) => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const ends = Math.min(1, k / 3, (pts.length - 1 - k) / 3);
    const off = sign * 2.3 * Math.tanh((corner - k) / 7) * ends;
    return [pt[0] - ((b[1] - a[1]) / l) * off, pt[1] + ((b[0] - a[0]) / l) * off];
  });
  for (const [strength, sign] of [[L.a, 1], [L.b, -1]]) {
    if (!strength) continue;
    const d = path(strand(sign));
    linkUnder += `<path d="${d}" stroke-width="${f(3.4 + strength * 0.55)}"/>`;
    linkInk += `<path d="${d}" stroke-width="${f(0.7 + strength * 0.55)}"/>`;
  }
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<rect width="100%" height="100%" fill="${dark}"/>` +
  `<image href="field.png" x="0" y="0" width="${W}" height="${H}" style="image-rendering:pixelated"/>` +
  `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
  `<g stroke="${dark}" stroke-width="9" opacity="0.6">${spanUnder}</g>` +
  `<g stroke="${white}">${spanInk}</g>` +
  `<g stroke="${dark}" opacity="0.85">${linkUnder}</g>` +
  `<g stroke="${INK.far}">${linkInk}</g>` +
  `<g stroke="${white}" stroke-width="1.7" stroke-linecap="butt">${fringes}</g>` +
  `<g stroke="${INK.far}" stroke-width="2.4" stroke-linecap="butt">${fringesFar}</g>` +
  `<path d="${path(R)}" stroke="${dark}" stroke-width="17"/>` +
  `<path d="${path(R)}" stroke="${white}" stroke-width="7"/>` +
  `</g>${knots}</svg>`;
writeFileSync(join(here, 'out.svg'), svg);
console.log(`${W} x ${H}: ${YEARS} ripples, ${rec.length} records, ${links.length} links (${strays} could not follow the ripples all the way)`);

if (!process.argv.includes('--no-png')) {
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${W},${H}`, `--screenshot=${join(here, 'out.png')}`,
    'file://' + join(here, 'out.svg')], { stdio: 'ignore' });
  execFileSync('sips', ['-Z', '1600', join(here, 'out.png'), '--out', join(here, 'preview.png')], { stdio: 'ignore' });
}
