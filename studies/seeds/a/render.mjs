// Seed study A: Shores
//
// Direction derived from the random string in seed.txt (see README.md).
//
// The River Avon's real course is left undrawn, a black void across the frame.
// Time recedes from it on both banks as a harmonic field: the present is the
// water's edge and follows every bend, the year 230 is the flat top and bottom
// edge of the picture. Each year is one shoreline. The north (upper) bank
// carries one model's reading of the records, the south (lower) bank the other's.
//
//   node studies/seeds/a/render.mjs
//
// Deterministic: no randomness is used anywhere.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from '../../lib/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const data = load('experiments/01-kingston-test/outputs/data.json');
const river = load('data/river/avon-course.json');
const { spans } = load('data/described-spans.json');
const seed = readFileSync(join(here, 'seed.txt'), 'utf8').trim();

// ---------------------------------------------------------------- from the string
const DIGITS = [...seed].filter((c) => /[0-9]/.test(c)).map(Number); // 24 of them
const hex = (h) => {
  const c = [...h.slice(0, 3)].map((ch) => parseInt(ch + ch, 16) / 255);
  return c.map((x) => x ** 2.2); // to linear light
};
// The six runs of three or more hexadecimal characters in the string, read as
// CSS colours, in the order they appear.
const C = {
  EcFd: hex('EcF'), // #EcFd pale lilac
  '36D': hex('36D'), // bright blue
  '26A': hex('26A'), // deep blue
  B898: hex('B89'), // #B898 dusty rose
  '97A': hex('97A'), // muted violet
  f3a: hex('f3a'), // magenta
};
const STRAND = {
  river: C['36D'],
  settlement: C.B898,
  textiles: C['97A'],
  rubber: C['26A'],
  people: C.EcFd,
};
const LINK = C.f3a;

// ---------------------------------------------------------------- settings
const o = {
  W: 4000,
  H: 1920,
  frame: [0.075, 0.992], // part of the course's west-east extent shown
  riverY: 0.5, // where the middle of the river's north-south extent sits
  now: 2026.78, // 13 October 2026
  first: 230, // earliest year any span names
  a0: 60, // time warp: years near the present get more room
  p: 0.5,
  TW: 4000,
  TH: 2000,
  vMargin: 0.055,
  placeGap: 2.6, // lanes of space between places
  thread: 2.2,
  fuzzy: 0.03,
};
const { W, H } = o;
const SPAN = o.now - o.first;
const den = (SPAN + o.a0) ** o.p - o.a0 ** o.p;
const ageOf = (u) => (u * den + o.a0 ** o.p) ** (1 / o.p) - o.a0;
const uOf = (age) => ((Math.max(0, Math.min(SPAN, age)) + o.a0) ** o.p - o.a0 ** o.p) / den;
const uYear = (year) => uOf(o.now - year);

// ---------------------------------------------------------------- the river
const kx = 111320 * Math.cos((51.347 * Math.PI) / 180), ky = 111132;
const m0 = river.course.map(([lon, lat]) => [lon * kx, lat * ky]);
// Turn the map so the river's general line (a least-squares fit) runs level.
// North ends up a few degrees clockwise of straight up.
const turn = (() => {
  const n = m0.length, ax = m0.reduce((s, q) => s + q[0], 0) / n, ay = m0.reduce((s, q) => s + q[1], 0) / n;
  let sxx = 0, sxy = 0;
  for (const [x, y] of m0) (sxx += (x - ax) ** 2), (sxy += (x - ax) * (y - ay));
  return Math.atan2(sxy, sxx);
})();
const m = m0.map(([x, y]) => [x * Math.cos(turn) + y * Math.sin(turn), -x * Math.sin(turn) + y * Math.cos(turn)]);
const mx0 = Math.min(...m.map((q) => q[0])), mx1 = Math.max(...m.map((q) => q[0]));
const fx0 = mx0 + (mx1 - mx0) * o.frame[0], fx1 = mx0 + (mx1 - mx0) * o.frame[1];
const inFrame = m.filter((q) => q[0] >= fx0 && q[0] <= fx1).map((q) => q[1]);
const myMid = (Math.min(...inFrame) + Math.max(...inFrame)) / 2;
const scale = W / (fx1 - fx0); // px per metre, same both ways
let course = m.map(([x, y]) => [(x - fx0) * scale, H * o.riverY - (y - myMid) * scale]);
// Two rounds of corner-cutting, so the mapped centreline's vertices (about one
// every 35 m) do not show as kinks in the bank.
for (let round = 0; round < 2; round++) {
  const next = [course[0]];
  for (let k = 1; k < course.length; k++) {
    const [a, b] = [course[k - 1], course[k]];
    next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
  }
  next.push(course[course.length - 1]);
  course = next;
}
console.error(`turned ${((turn * 180) / Math.PI).toFixed(1)} degrees, ${(1 / scale).toFixed(2)} m per px`);

function riverMask(w, h, f) {
  const mask = new Uint8Array(w * h); // 0 river, 1 north, 2 south
  const riv = new Uint8Array(w * h);
  for (let k = 1; k < course.length; k++) {
    const [ax, ay] = course[k - 1], [bx, by] = course[k];
    const n = Math.ceil(Math.hypot(bx - ax, by - ay) / f * 4) + 1;
    for (let t = 0; t <= n; t++) {
      const x = (ax + ((bx - ax) * t) / n) / f, y = (ay + ((by - ay) * t) / n) / f;
      // a 2x2 footprint keeps the line closed to 4-connected flood fill
      const x0 = Math.floor(x - 0.5), y0 = Math.floor(y - 0.5);
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++) {
          const xx = x0 + dx, yy = y0 + dy;
          if (xx >= 0 && xx < w && yy >= 0 && yy < h) riv[yy * w + xx] = 1;
        }
    }
  }
  const fill = (start, label) => {
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      if (riv[i] || mask[i]) continue;
      mask[i] = label;
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
    }
  };
  fill(Math.floor(w / 2), 1);
  if (mask[(h - 1) * w + Math.floor(w / 2)] === 1) throw new Error('river does not part the frame');
  fill((h - 1) * w + Math.floor(w / 2), 2);
  return mask;
}

// ---------------------------------------------------------------- the two fields
// u: harmonic, 0 on the river, 1 on the top edge (north) and bottom edge (south),
//    no flow through the left and right edges. Its level lines are the years.
// v: its conjugate on each bank: 0 on the left edge, 1 on the right, no flow
//    through the river or the far edge. Its level lines run from the far past
//    to the water, and never merge.
function sweepU(u, mask, w, h, omega) {
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = row + x, l = mask[i];
      if (!l || (l === 1 && y === 0) || (l === 2 && y === h - 1)) continue;
      const a = x > 0 ? u[i - 1] : u[i + 1], b = x < w - 1 ? u[i + 1] : u[i - 1];
      u[i] += omega * ((a + b + u[i - w] + u[i + w]) * 0.25 - u[i]);
    }
  }
}
function sweepV(v, mask, w, h, omega) {
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 1; x < w - 1; x++) {
      const i = row + x, l = mask[i];
      if (!l) continue;
      let s = 0, n = 0;
      if (mask[i - 1] === l) (s += v[i - 1]), n++;
      if (mask[i + 1] === l) (s += v[i + 1]), n++;
      if (y > 0 && mask[i - w] === l) (s += v[i - w]), n++;
      if (y < h - 1 && mask[i + w] === l) (s += v[i + w]), n++;
      if (n) v[i] += omega * (s / n - v[i]);
    }
  }
}
function prolong(coarse, cmask, cw, ch, mask, w, h, out, sameBank) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, l = mask[i];
      if (!l) continue;
      const fx = Math.max(0, Math.min(cw - 1, (x + 0.5) / 2 - 0.5)), fy = Math.max(0, Math.min(ch - 1, (y + 0.5) / 2 - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(cw - 1, x0 + 1), y1 = Math.min(ch - 1, y0 + 1);
      const tx = fx - x0, ty = fy - y0;
      let s = 0, ws = 0;
      for (const [cx, cy, wt] of [[x0, y0, (1 - tx) * (1 - ty)], [x1, y0, tx * (1 - ty)], [x0, y1, (1 - tx) * ty], [x1, y1, tx * ty]]) {
        const ci = cy * cw + cx;
        if (sameBank ? cmask[ci] !== l : cmask[ci] && cmask[ci] !== l) continue;
        s += coarse[ci] * wt;
        ws += wt;
      }
      if (ws > 1e-6) out[i] = s / ws;
    }
}
function solve() {
  const cache = join(tmpdir(), `fabric-seed-a-smooth2-${W}x${H}-${o.frame.join('-')}-${o.riverY}.bin`);
  if (existsSync(cache)) {
    const buf = readFileSync(cache);
    const n = W * H;
    const f32 = new Float32Array(buf.buffer, buf.byteOffset, n * 2);
    return { u: f32.slice(0, n), v: f32.slice(n), mask: riverMask(W, H, 1), w: W, h: H };
  }
  const levels = [8, 4, 2, 1], iters = [4000, 900, 300, 110];
  let prev = null;
  for (let k = 0; k < levels.length; k++) {
    const f = levels[k], w = W / f, h = H / f;
    const mask = riverMask(w, h, f);
    const u = new Float32Array(w * h), v = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        v[i] = x / (w - 1);
        u[i] = mask[i] ? ((mask[i] === 1 && y === 0) || (mask[i] === 2 && y === h - 1) ? 1 : 0.5) : 0;
      }
    if (prev) {
      prolong(prev.u, prev.mask, prev.w, prev.h, mask, w, h, u, false);
      prolong(prev.v, prev.mask, prev.w, prev.h, mask, w, h, v, true);
      for (let y = 0; y < h; y++) {
        v[y * w] = 0;
        v[y * w + w - 1] = 1;
      }
      for (let x = 0; x < w; x++) {
        if (mask[x] === 1) u[x] = 1;
        if (mask[(h - 1) * w + x] === 2) u[(h - 1) * w + x] = 1;
      }
    }
    const omega = k === 0 ? 1.985 : k === 1 ? 1.95 : 1.9;
    for (let it = 0; it < iters[k]; it++) {
      sweepU(u, mask, w, h, omega);
      sweepV(v, mask, w, h, omega);
    }
    console.error(`solved 1/${f}`);
    prev = { u, v, mask, w, h };
  }
  // The solved fields are kept in the system temp folder to save two minutes on a re-run.
  const both = new Float32Array(W * H * 2);
  both.set(prev.u, 0);
  both.set(prev.v, W * H);
  writeFileSync(cache, Buffer.from(both.buffer));
  return prev;
}

// ---------------------------------------------------------------- the records, laid out
const records = data.records;
const N = records.length;
const placeOf = (r) => data.groups.indexOf(r.site_group);
const order = records.map((_, i) => i).sort((a, b) => placeOf(records[a]) - placeOf(records[b]) || records[a].year - records[b].year || a - b);
const laneV = new Float64Array(N);
{
  let pos = 0, last = -1;
  const at = [];
  for (const i of order) {
    const g = placeOf(records[i]);
    if (last >= 0) pos += g === last ? 1 : 1 + o.placeGap;
    at.push(pos);
    last = g;
  }
  order.forEach((i, k) => (laneV[i] = o.vMargin + ((1 - 2 * o.vMargin) * at[k]) / pos));
}
const rec = records.map((r, i) => {
  const s = spans[r.id] ?? { from: r.year, to: r.year };
  return {
    v: laneV[i],
    u: uYear(r.year),
    uFrom: s.from == null ? 1 : uYear(s.from),
    uTo: s.to == null ? 0 : uYear(s.to),
    open: s.from == null,
    fuzzyFrom: !!s.fuzzyFrom,
    fuzzyTo: !!s.fuzzyTo,
    col: STRAND[r.strand],
  };
});

// ---------------------------------------------------------------- texture drawing
// Each bank has a flat chart in (v, u). It is drawn here and bent onto the
// bank by the two fields.
function makeTexture() {
  const { TW, TH } = o;
  const rgb = new Float32Array(TW * TH * 3);
  const cov = new Float32Array(TW * TH);
  let touched = [];
  const seg = (ax, ay, bx, by, r) => {
    const x0 = Math.max(0, Math.floor(Math.min(ax, bx) - r - 1)), x1 = Math.min(TW - 1, Math.ceil(Math.max(ax, bx) + r + 1));
    const y0 = Math.max(0, Math.floor(Math.min(ay, by) - r - 1)), y1 = Math.min(TH - 1, Math.ceil(Math.max(ay, by) + r + 1));
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-9;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
        const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
        const c = Math.max(0, Math.min(1, r + 0.5 - d));
        const i = y * TW + x;
        if (c > cov[i]) {
          if (cov[i] === 0) touched.push(i);
          cov[i] = c;
        }
      }
  };
  const flush = (col, k, fade) => {
    for (const i of touched) {
      const a = cov[i] * k * (fade ? fade(i % TW, Math.floor(i / TW)) : 1);
      rgb[i * 3] += col[0] * a;
      rgb[i * 3 + 1] += col[1] * a;
      rgb[i * 3 + 2] += col[2] * a;
      cov[i] = 0;
    }
    touched = [];
  };
  const X = (v) => v * (TW - 1), Y = (u) => u * (TH - 1);
  return {
    rgb,
    line(v0, u0, v1, u1, r, col, k, fade) {
      seg(X(v0), Y(u0), X(v1), Y(u1), r);
      flush(col, k, fade);
    },
    path(pts, r, col, k, fade) {
      for (let q = 1; q < pts.length; q++) seg(X(pts[q - 1][0]), Y(pts[q - 1][1]), X(pts[q][0]), Y(pts[q][1]), r);
      flush(col, k, fade);
    },
    X,
    Y,
  };
}

function drawBank(model) {
  const T = makeTexture();
  // Underneath everything: every pair of records that shares distinctive
  // words, as a hairline, brighter the more they share. The same on both banks.
  for (const p of data.pairs) {
    if (p.t < 0.035) continue;
    const a = rec[p.i], b = rec[p.j];
    const pts = [];
    for (let k = 0; k <= 80; k++) {
      const t = k / 80, e = t * t * (3 - 2 * t);
      pts.push([a.v + (b.v - a.v) * e, a.u + (b.u - a.u) * t]);
    }
    T.path(pts, 0.35, C['36D'], Math.min(1, p.t / 0.2) * 0.5);
  }
  // Then the model's links, so the threads sit over them.
  const links = data.pairs.filter((p) => p[model] > 0).sort((p, q) => p[model] - q[model]);
  for (const p of links) {
    const a = rec[p.i], b = rec[p.j], w = p[model];
    const dv = b.v - a.v;
    const reach = Math.abs(dv) * 0.55;
    const lean = (b.u - a.u) * 0.28 * Math.min(1, Math.abs(b.u - a.u) / (Math.abs(dv) * 2 + 1e-6));
    const sgn = dv >= 0 ? 1 : -1;
    const c1 = [a.v + sgn * reach, a.u + lean], c2 = [b.v - sgn * reach, b.u - lean];
    const pts = [];
    for (let k = 0; k <= 160; k++) {
      const t = k / 160, s = 1 - t;
      pts.push([
        s * s * s * a.v + 3 * s * s * t * c1[0] + 3 * s * t * t * c2[0] + t * t * t * b.v,
        s * s * s * a.u + 3 * s * s * t * c1[1] + 3 * s * t * t * c2[1] + t * t * t * b.u,
      ]);
    }
    T.path(pts, 0.5 + w * 0.5, LINK, 0.22 + w * 0.2);
    if (w >= 4) T.path(pts, 5 + w, LINK, 0.06); // strong links glow
  }
  // Threads: the span of years each record describes.
  for (const r of rec) {
    const lo = Math.min(r.uFrom, r.uTo), hi = Math.max(r.uFrom, r.uTo);
    const dash = (x, y) => (Math.floor(y / 7) % 2 ? 0 : 1);
    const bodyLo = r.fuzzyTo ? Math.min(hi, lo + o.fuzzy) : lo, bodyHi = r.fuzzyFrom ? Math.max(bodyLo, hi - o.fuzzy) : hi;
    if (bodyHi > bodyLo) T.line(r.v, bodyLo, r.v, bodyHi, o.thread, r.col, 0.8);
    if (r.fuzzyTo && bodyLo > lo) T.line(r.v, lo, r.v, bodyLo, o.thread, r.col, 0.8, dash);
    if (r.fuzzyFrom && hi > bodyHi) T.line(r.v, bodyHi, r.v, hi, o.thread, r.col, 0.8, dash);
    // The year the record is filed under lights its own shoreline, far along
    // the bank in both directions, and leaves a bead on the thread.
    const reach = 0.3;
    const fade = (x) => {
      const q = Math.abs(x - T.X(r.v)) / T.X(reach);
      return Math.exp(-q * 5) * 0.85 + Math.exp(-((q * 14) ** 2)) * 1.4;
    };
    T.line(r.v - reach, r.u, r.v + reach, r.u, 0.9, r.col, 1.5, fade);
    T.line(r.v, r.u, r.v, r.u, 5.5, r.col, 1.6);
    T.line(r.v, r.u, r.v, r.u, 2.2, [1, 1, 1], 1.2);
  }
  return T.rgb;
}

// ---------------------------------------------------------------- render
function render() {
  const { u, v, mask } = solve();
  // chamfer distance to the river, in pixels
  const dist = new Float32Array(W * H).fill(1e9);
  for (let i = 0; i < W * H; i++) if (!mask[i]) dist[i] = 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + 1);
      if (y > 0) {
        d = Math.min(d, dist[i - W] + 1);
        if (x > 0) d = Math.min(d, dist[i - W - 1] + 1.4142);
        if (x < W - 1) d = Math.min(d, dist[i - W + 1] + 1.4142);
      }
      dist[i] = d;
    }
  for (let y = H - 1; y >= 0; y--)
    for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x;
      let d = dist[i];
      if (x < W - 1) d = Math.min(d, dist[i + 1] + 1);
      if (y < H - 1) {
        d = Math.min(d, dist[i + W] + 1);
        if (x > 0) d = Math.min(d, dist[i + W - 1] + 1.4142);
        if (x < W - 1) d = Math.min(d, dist[i + W + 1] + 1.4142);
      }
      dist[i] = d;
    }

  const tex = [null, drawBank('a'), drawBank('b')];
  console.error('textures drawn');
  const { TW, TH } = o;
  const img = new Float32Array(W * H * 3);
  const recent = C['36D'], old = C['97A'], pale = C.EcFd;
  const sub = [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]];

  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x, l = mask[i];
      if (!l) continue;
      const ok = (j) => mask[j] === l;
      // gradients from same-bank neighbours
      const xl = x > 0 && ok(i - 1) ? i - 1 : i, xr = x < W - 1 && ok(i + 1) ? i + 1 : i;
      const yu = y > 0 && ok(i - W) ? i - W : i, yd = y < H - 1 && ok(i + W) ? i + W : i;
      const ux = xr === xl ? 0 : (u[xr] - u[xl]) / (xr - xl), uy = yd === yu ? 0 : (u[yd] - u[yu]) / ((yd - yu) / W);
      const vx = xr === xl ? 0 : (v[xr] - v[xl]) / (xr - xl), vy = yd === yu ? 0 : (v[yd] - v[yu]) / ((yd - yu) / W);
      const d = dist[i];
      const water = Math.max(0, Math.min(1, (d - 11) / 5)); // the river is left dark
      if (water <= 0) continue;
      let r = 0, g = 0, b = 0;
      for (const [sx, sy] of sub) {
        const uu = Math.max(0, Math.min(1, u[i] + ux * sx + uy * sy));
        const vv = Math.max(0, Math.min(1, v[i] + vx * sx + vy * sy));
        const age = ageOf(uu), year = o.now - age;
        // ground: one line per year, its brightness the string's digits, a
        // 24-year swell; a dark break at every century
        const dAge = (den / o.p) * (age + o.a0) ** (1 - o.p); // years per unit u
        const pxPerYear = 1 / Math.max(1e-9, Math.hypot(ux, uy) * dAge);
        const yf = Math.floor(year), fr = year - yf;
        const dg = DIGITS[((yf % 24) + 24) % 24] / 9;
        const dgNext = DIGITS[(((yf + 1) % 24) + 24) % 24] / 9;
        const swell = dg + (dgNext - dg) * fr;
        const crisp = Math.max(0, Math.min(1, (pxPerYear - 1.6) / 2.2));
        const lineShape = Math.max(0, 1 - Math.abs(fr - 0.5) / 0.3); // triangle, a line per year
        const line = crisp * lineShape * (0.12 + 1.7 * dg * dg) + (1 - crisp) * (0.04 + 0.6 * swell * swell);
        const cy = ((year % 100) + 100) % 100;
        const gapW = Math.max(1.4, 2.6 / pxPerYear); // years; at least ~2.6 px
        const century = Math.max(0, Math.min(1, Math.min(cy, 100 - cy) / (gapW * 0.5) - 0.6));
        const k = age / SPAN;
        const depth = 0.07 + 0.93 * Math.exp(-k * 3.4);
        const gl = line * century * depth * 0.16;
        r += (recent[0] * (1 - k) + old[0] * k) * gl * 2.2;
        g += (recent[1] * (1 - k) + old[1] * k) * gl * 2.2;
        b += (recent[2] * (1 - k) + old[2] * k) * gl * 2.2;
        // the bank's chart, bent onto it
        const tx = vv * (TW - 1), ty = uu * (TH - 1);
        const x0 = Math.min(TW - 2, Math.floor(tx)), y0 = Math.min(TH - 2, Math.floor(ty));
        const ax = tx - x0, ay = ty - y0;
        const t = tex[l], j = (y0 * TW + x0) * 3;
        const w00 = (1 - ax) * (1 - ay), w10 = ax * (1 - ay), w01 = (1 - ax) * ay, w11 = ax * ay;
        r += (t[j] * w00 + t[j + 3] * w10 + t[j + TW * 3] * w01 + t[j + TW * 3 + 3] * w11) * (0.4 + 0.6 * century);
        g += (t[j + 1] * w00 + t[j + 4] * w10 + t[j + TW * 3 + 1] * w01 + t[j + TW * 3 + 4] * w11) * (0.4 + 0.6 * century);
        b += (t[j + 2] * w00 + t[j + 5] * w10 + t[j + TW * 3 + 2] * w01 + t[j + TW * 3 + 5] * w11) * (0.4 + 0.6 * century);
      }
      // the present: a pale edge to the water
      const edge = Math.exp(-(((d - 17) / 4) ** 2)) * 0.16 + Math.exp(-d / 70) * 0.03;
      img[i * 3] = (r / 4 + pale[0] * edge) * water;
      img[i * 3 + 1] = (g / 4 + pale[1] * edge) * water;
      img[i * 3 + 2] = (b / 4 + pale[2] * edge) * water;
    }
  console.error('bent');
  return img;
}

// A soft bloom, so bright threads and links breathe into the dark around them.
function bloom(img, radius, amount) {
  const f = 4, w = W / f, h = H / f;
  let small = new Float32Array(w * h * 3);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const j = (Math.floor(y / f) * w + Math.floor(x / f)) * 3, i = (y * W + x) * 3;
      small[j] += img[i] / 16;
      small[j + 1] += img[i + 1] / 16;
      small[j + 2] += img[i + 2] / 16;
    }
  const box = (src, horizontal) => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) {
          let s = 0, n = 0;
          for (let k = -radius; k <= radius; k++) {
            const xx = horizontal ? x + k : x, yy = horizontal ? y : y + k;
            if (xx < 0 || xx >= w || yy < 0 || yy >= h) continue;
            s += src[(yy * w + xx) * 3 + c];
            n++;
          }
          out[(y * w + x) * 3 + c] = s / n;
        }
    return out;
  };
  for (let pass = 0; pass < 3; pass++) small = box(box(small, true), false);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const fx = Math.max(0, Math.min(w - 1.001, (x + 0.5) / f - 0.5)), fy = Math.max(0, Math.min(h - 1.001, (y + 0.5) / f - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
      const i = (y * W + x) * 3;
      for (let c = 0; c < 3; c++) {
        const j = (y0 * w + x0) * 3 + c;
        const s = small[j] * (1 - ax) * (1 - ay) + small[j + 3] * ax * (1 - ay) + small[j + w * 3] * (1 - ax) * ay + small[j + w * 3 + 3] * ax * ay;
        img[i + c] += s * amount;
      }
    }
}

const img = render();
bloom(img, 6, 0.42);
const rgba = new Uint8Array(W * H * 4);
const base = [0.0035, 0.0045, 0.011]; // near-black, a little blue
for (let i = 0; i < W * H; i++) {
  for (let c = 0; c < 3; c++) {
    const lin = 1 - Math.exp(-(img[i * 3 + c] * 1.25 + base[c])); // soft shoulder
    rgba[i * 4 + c] = Math.round(255 * Math.min(1, lin) ** (1 / 2.2));
  }
  rgba[i * 4 + 3] = 255;
}
writeFileSync(join(here, 'out.png'), encodePng(W, H, rgba));
execFileSync('sips', ['-Z', '1600', join(here, 'out.png'), '--out', join(here, 'preview.png')], { stdio: 'ignore' });
console.error('wrote out.png and preview.png');
