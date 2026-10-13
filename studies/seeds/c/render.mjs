// Seed study C: Two Banks
//
// A direction derived from the random string in seed.txt (see README.md).
// The River Avon's real course runs across the middle. Every year from 230 to
// 2026 is one ring on each bank, the present at the water and the past further
// out, and the rings forget the river's shape as they age. Each record is
// written twice, once on each bank, as one dash per word. The north bank
// carries one model's links between records and the south bank the other's.
//
//   node studies/seeds/c/render.mjs          writes out.png and preview.png
//
// Deterministic: no randomness anywhere.

import { readFileSync, writeFileSync } from 'node:fs';
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

// ---------------------------------------------------------------- the string
// Everything in this block is read off the string, not chosen.
const digits = [...seed.replace(/\D/g, '')].map(Number); // 21 digits, summing to 100
const numberRuns = seed.match(/\d+/g).filter((n) => n.length === 2).map(Number); // 67, 15, 88
const hexPairs = seed.match(/[0-9a-fA-F]+/g).filter((h) => h.length === 2); // f8 c1 15 c7 C6 d8 B4
const hex3 = (t) => [...t].map((c) => parseInt(c + c, 16));
const byte3 = (k) => hexPairs.slice(k, k + 3).map((h) => parseInt(h, 16));
if (digits.reduce((a, b) => a + b, 0) !== 100) throw new Error('the digits should sum to 100');

const C = {
  ground: numberRuns.slice(0, 3), // rgb(67, 15, 88): the three two-digit numbers
  amber: byte3(0), // #f8c115: the first three two-character hex runs
  ring: byte3(3), // #c7c6d8: the next three
  strand: {
    river: hex3('4dd'), // from the run 4ddee
    people: hex3('CDf'), // from the run CDfa
    settlement: hex3('Dfa'), // from the run CDfa
    textiles: hex3('d67'), // from the run Dd67
    rubber: hex3('b88'), // from the run b88
  },
  pale: hex3('dde'), // from the run 4ddee
};

// The digits as a rhythm exactly one century long: on 8, off 1, on 6, off 7, ...
const rhythm = new Uint8Array(100);
{
  let at = 0;
  digits.forEach((n, k) => {
    for (let q = 0; q < n; q++) rhythm[at++] = k % 2 === 0 ? 1 : 0;
  });
}

// ---------------------------------------------------------------- settings
const o = {
  W: 4000,
  H: 4000,
  latitude: 51.347,
  reachEnd: [-2.2943417, 51.3376327], // the same reach as studies 04 and 05
  lastYear: 2026,
  edge: 46, // px of plain ground beyond the oldest ring, top and bottom
  water: 13, // px between the river's centre and the ring for 2026
  forget: Number(process.env.FORGET ?? 2.2), // smoothing length of a ring = forget x its distance from the river
  levelStep: 4, // px between stored frames
  unit: 2.8, // px of ring per unit of the digit rhythm
  dim: 0.085, // a ring no record speaks of
  bright: 0.62, // added where many do
  rest: 0.34, // how far a ring dims in the rests of the rhythm
  fuzzy: 28, // years of broken spine at a vague end
};

const records = data.records;
const firstYear = Math.min(...Object.values(spans).map((s) => s.from ?? Infinity), ...records.map((r) => r.year));
const years = o.lastYear - firstYear; // 1796 steps back from the present
const { W, H } = o;
const pitch = (H / 2 - o.edge - o.water) / years; // px per year
const dOf = (year) => o.water + (o.lastYear - Math.max(firstYear, Math.min(o.lastYear, year))) * pitch;
const dMax = dOf(firstYear);

// ---------------------------------------------------------------- the river
// Projected to metres, turned so the straight line between its ends lies level
// (north stays up, east stays right), scaled so the reach spans the full width,
// and resampled to one point per pixel of river.
function riverLine() {
  let end = 0, best = Infinity;
  river.course.forEach(([lon, lat], k) => {
    const d = (lon - o.reachEnd[0]) ** 2 + (lat - o.reachEnd[1]) ** 2;
    if (d < best) [best, end] = [d, k];
  });
  const kx = 111320 * Math.cos((o.latitude * Math.PI) / 180), ky = 111132;
  const pts = river.course.slice(0, end + 1).map(([lon, lat]) => [lon * kx, -lat * ky]).reverse(); // west first
  const [a, b] = [pts[0], pts[pts.length - 1]];
  const chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [ux, uy] = [(b[0] - a[0]) / chord, (b[1] - a[1]) / chord];
  const s = W / chord;
  const flat = pts.map(([x, y]) => [((x - a[0]) * ux + (y - a[1]) * uy) * s, (-(x - a[0]) * uy + (y - a[1]) * ux) * s + H / 2]);
  const out = [flat[0]];
  let carry = 0;
  for (let k = 1; k < flat.length; k++) {
    const [p, q] = [flat[k - 1], flat[k]];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    let t = 1 - carry;
    while (t <= len) {
      out.push([p[0] + ((q[0] - p[0]) * t) / len, p[1] + ((q[1] - p[1]) * t) / len]);
      t += 1;
    }
    carry = len - (t - 1);
  }
  return { line: out, metresPerPx: 1 / s, lengthM: out.length / s };
}
const { line, metresPerPx, lengthM } = riverLine();
const M = line.length;

// ---------------------------------------------------------------- the frame
// A place in the picture is (u, d): u along the river, d out from it. The ring
// at distance d is not offset from the river itself but from the river smoothed
// over a length of forget x d, so near rings keep every bend and far rings keep
// almost none. That also stops the rings folding over themselves.
const EXT = 700; // frame kept beyond each end of the reach
const NU = M + 2 * EXT;
const levels = Math.ceil(dMax / o.levelStep) + 2;
const FX = new Float32Array(levels * NU), FY = new Float32Array(levels * NU);
const GX = new Float32Array(levels * NU), GY = new Float32Array(levels * NU); // north-pointing normal
{
  const rMax = Math.ceil(Math.sqrt(4 * (o.forget * levels * o.levelStep) ** 2 + 1) / 2) + 2;
  const PAD = 3 * rMax + EXT + 8;
  const N = M + 2 * PAD;
  const bx = new Float64Array(N), by = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const k = n - PAD;
    if (k < 0) [bx[n], by[n]] = [line[0][0] + k, H / 2];
    else if (k >= M) [bx[n], by[n]] = [line[M - 1][0] + (k - M + 1), H / 2];
    else [bx[n], by[n]] = line[k];
  }
  const pre = new Float64Array(N + 1);
  const box = (src, r) => {
    if (r < 1) return src;
    for (let n = 0; n < N; n++) pre[n + 1] = pre[n] + src[n];
    const dst = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      const lo = Math.max(0, n - r), hi = Math.min(N - 1, n + r);
      dst[n] = (pre[hi + 1] - pre[lo]) / (hi - lo + 1);
    }
    return dst;
  };
  for (let l = 0; l < levels; l++) {
    const sigma = o.forget * l * o.levelStep;
    const r = Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2);
    let sx = bx, sy = by;
    for (let pass = 0; pass < 3; pass++) [sx, sy] = [box(sx, r), box(sy, r)];
    const h = Math.max(2, Math.min(12, r)); // a short baseline keeps the raw river's normals calm
    for (let n = 0; n < NU; n++) {
      const at = n + PAD - EXT;
      const tx = sx[at + h] - sx[at - h], ty = sy[at + h] - sy[at - h];
      const len = Math.hypot(tx, ty) || 1;
      FX[l * NU + n] = sx[at]; FY[l * NU + n] = sy[at];
      GX[l * NU + n] = ty / len; GY[l * NU + n] = -tx / len;
    }
  }
}
// The oldest rings are nearly straight; shift everything so they sit level about the middle.
let lift = 0;
{
  let sum = 0;
  for (let n = 0; n < NU; n++) sum += FY[(levels - 1) * NU + n];
  lift = H / 2 - sum / NU;
}
// (u, d, side) -> pixel. side +1 is the north bank, -1 the south.
function place(u, d, side) {
  const lf = Math.min(levels - 1.001, d / o.levelStep), l = Math.floor(lf), lt = lf - l;
  const uf = Math.max(0, Math.min(NU - 1.001, u + EXT)), n = Math.floor(uf), ut = uf - n;
  const a = l * NU + n, b = a + NU;
  const w00 = (1 - lt) * (1 - ut), w01 = (1 - lt) * ut, w10 = lt * (1 - ut), w11 = lt * ut;
  const mix = (A) => A[a] * w00 + A[a + 1] * w01 + A[b] * w10 + A[b + 1] * w11;
  return [mix(FX) + side * d * mix(GX), mix(FY) + side * d * mix(GY) + lift];
}

// ---------------------------------------------------------------- the canvas
const R = new Float32Array(W * H), G = new Float32Array(W * H), B = new Float32Array(W * H);
const glowS = 4, gw = W / glowS, gh = H / glowS;
const glow = [new Float32Array(gw * gh), new Float32Array(gw * gh), new Float32Array(gw * gh)];

// ground: the string's violet, a little lighter by the water and darker with age
{
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = Math.min(1, Math.abs(y - H / 2) / (H / 2));
      const k = 0.2 + 0.26 * Math.exp(-t * 3.2);
      const at = y * W + x;
      R[at] = C.ground[0] * k; G[at] = C.ground[1] * k; B[at] = C.ground[2] * k;
    }
}

// additive light, for the rings
function light(x, y, c, a) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  if (x0 < 0 || y0 < 0 || x0 >= W - 1 || y0 >= H - 1) return;
  const fx = x - x0, fy = y - y0, at = y0 * W + x0;
  const w = [(1 - fx) * (1 - fy) * a, fx * (1 - fy) * a, (1 - fx) * fy * a, fx * fy * a];
  const idx = [at, at + 1, at + W, at + W + 1];
  for (let q = 0; q < 4; q++) { R[idx[q]] += c[0] * w[q]; G[idx[q]] += c[1] * w[q]; B[idx[q]] += c[2] * w[q]; }
}

// opaque strokes: coverage is gathered per stroke, then laid over once
const scratch = new Float32Array(W * H);
let touched = [];
function seg(x0, y0, x1, y1, w) {
  const r = w / 2 + 1;
  const xa = Math.max(0, Math.floor(Math.min(x0, x1) - r)), xb = Math.min(W - 1, Math.ceil(Math.max(x0, x1) + r));
  const ya = Math.max(0, Math.floor(Math.min(y0, y1) - r)), yb = Math.min(H - 1, Math.ceil(Math.max(y0, y1) + r));
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1e-9;
  for (let y = ya; y <= yb; y++)
    for (let x = xa; x <= xb; x++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * dx + (y - y0) * dy) / l2));
      const cov = w / 2 + 0.5 - Math.hypot(x - x0 - t * dx, y - y0 - t * dy);
      if (cov <= 0) continue;
      const at = y * W + x;
      if (scratch[at] === 0) touched.push(at);
      if (cov > scratch[at]) scratch[at] = Math.min(1, cov);
    }
}
function lay(c, alpha, shine = 0) {
  for (const at of touched) {
    const a = scratch[at] * alpha;
    R[at] += (c[0] - R[at]) * a; G[at] += (c[1] - G[at]) * a; B[at] += (c[2] - B[at]) * a;
    if (shine) {
      const g = Math.floor(((at / W) | 0) / glowS) * gw + Math.floor((at % W) / glowS);
      glow[0][g] += c[0] * a * shine; glow[1][g] += c[1] * a * shine; glow[2][g] += c[2] * a * shine;
    }
    scratch[at] = 0;
  }
  touched = [];
}
function stroke(pts, w, c, alpha, shine = 0) {
  for (let k = 1; k < pts.length; k++) seg(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], w);
  lay(c, alpha, shine);
}
function dot(x, y, r, c, alpha, shine = 0) {
  seg(x, y, x + 0.01, y, r * 2);
  lay(c, alpha, shine);
}

// ---------------------------------------------------------------- the rings
// One per year per bank. A ring is lit, along the river, near the stations of
// the records whose described span includes that year, and left dim elsewhere.
// Its dashes are the string's digits, slid one unit a year, and the slide
// turns round at each century.
const stationOf = stations();
const spread = stationOf.slot * 1.5; // how far along the river a record lights its years
const GRID = 16, cells = Math.ceil(NU / GRID) + 2;
const lit = new Float32Array(cells);
for (let year = o.lastYear; year >= firstYear; year--) {
  const inC = ((year % 100) + 100) % 100;
  if (inC === 1 || inC === 99) continue; // the dark either side of a century ring
  const century = inC === 0, decade = year % 10 === 0;
  const turn = Math.floor(year / 100) % 2 ? 1 : -1;
  lit.fill(0);
  records.forEach((r, i) => {
    const s = spans[r.id];
    const from = s.from ?? firstYear, to = s.to ?? o.lastYear;
    if (year < from || year > to) return;
    // a vague end comes up slowly; a dated end is a hard edge
    let k = 1;
    if (s.fuzzyFrom || s.from == null) k = Math.min(k, (year - from + 1) / o.fuzzy);
    if (s.fuzzyTo) k = Math.min(k, (to - year + 1) / o.fuzzy);
    for (let c = 0; c < cells; c++) {
      const z = (c * GRID - EXT - stationOf[i]) / spread;
      if (z > -3.5 && z < 3.5) lit[c] += k * Math.exp(-0.5 * z * z);
    }
  });
  const d = dOf(year);
  for (const side of [1, -1])
    for (let u = -EXT + 1; u < M + EXT - 1; u += 0.5) {
      const cf = (u + EXT) / GRID, c = Math.floor(cf), L = lit[c] + (lit[c + 1] - lit[c]) * (cf - c);
      const b = o.dim + o.bright * (1 - Math.exp(-L / 2.4));
      let a = century ? b * 1.2 + 0.5 : decade ? b * 1.25 + 0.07 : b;
      if (!century && !decade) {
        const q = Math.floor(u / o.unit + turn * inC);
        if (!rhythm[((q % 100) + 100) % 100]) a *= o.rest;
      }
      const [x, y] = place(u, d, side);
      light(x, y, C.ring, a * 0.5); // two samples per pixel
    }
}

// ---------------------------------------------------------------- the records
// Stations along the river: the twelve places in experiment 01's order (by
// earliest record), each place's records side by side by the start of their
// span. This is an ordering, not geography.
function stations() {
  const station = [];
  const gap = 0.55;
  const slot = M / (records.length + (data.groups.length - 1) * gap + 0.6);
  let at = slot * 0.3;
  data.groups.forEach((group) => {
    records.map((_, i) => i).filter((i) => records[i].site_group === group)
      .sort((p, q) => (spans[records[p].id].from ?? 0) - (spans[records[q].id].from ?? 0) || p - q)
      .forEach((i) => { station[i] = at; at += slot; });
    at += slot * gap;
  });
  station.slot = slot;
  return station;
}
const station = stationOf;
const knot = records.map((r, i) => ({ u: station[i], d: dOf(r.year) }));
const blockW = station.slot * 0.8;

// ---------------------------------------------------------------- the links
// North bank: model A's strengths. South bank: model B's. A link both models
// made is amber on both banks; a link only one made is pale, on its own bank.
// Each hangs from its two records towards the water, lower the stronger it is.
function link(i, j, w, side, agreed) {
  const [p, q] = [knot[i], knot[j]];
  const dm = Math.min(p.d, q.d) * (1 - 0.15 * w) + o.water * 0.5;
  const pts = [];
  const n = Math.ceil((Math.abs(p.u - q.u) + Math.abs(p.d - q.d)) / 3) + 8;
  for (let k = 0; k <= n; k++) {
    const t = k / n, m = 1 - t;
    const u = m * m * m * p.u + 3 * m * m * t * p.u + 3 * m * t * t * q.u + t * t * t * q.u;
    const d = m * m * m * p.d + 3 * m * m * t * dm + 3 * m * t * t * dm + t * t * t * q.d;
    pts.push(place(u, d, side));
  }
  stroke(pts, 0.9 + w * 0.7, agreed ? C.amber : C.pale, (agreed ? 0.3 : 0.38) + w * 0.12, agreed ? 0.5 : 0.45);
}
const judged = data.pairs.filter((p) => p.a + p.b > 0).sort((p, q) => p.a + p.b - (q.a + q.b));
for (const p of judged) {
  if (p.a > 0) link(p.i, p.j, p.a, 1, p.b > 0);
  if (p.b > 0) link(p.i, p.j, p.b, -1, p.a > 0);
}

// Each record, on both banks: a spine for the years it describes, a dash for
// every word of its text (the dash as long as the word), and a knot at the
// year experiment 01 filed it under.
const rowMin = 5.2, letter = 2.7, wordGap = 3.6, tickW = 2.5;
records.forEach((r, i) => {
  const s = spans[r.id];
  const words = r.text.split(/\s+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '').length).filter(Boolean);
  const total = words.reduce((a, w) => a + w * letter + wordGap, 0);
  let dNear = dOf(s.to ?? o.lastYear), dFar = dOf(s.from ?? firstYear);
  let rows = Math.max(Math.ceil(total / blockW), Math.min(words.length, Math.floor((dFar - dNear) / rowMin) + 1));
  if ((rows - 1) * rowMin > dFar - dNear) {
    const mid = (dNear + dFar) / 2, half = ((rows - 1) * rowMin) / 2;
    [dNear, dFar] = [Math.max(o.water + 3, mid - half), Math.max(o.water + 3, mid - half) + 2 * half];
  }
  const rowOf = (k) => words.slice(Math.floor((k * words.length) / rows), Math.floor(((k + 1) * words.length) / rows));
  const col = C.strand[r.strand];
  const u0 = station[i];
  for (const side of [1, -1]) {
    // a quiet dark bed so the dashes read against the rings
    for (let k = 0; k < rows; k++) {
      const d = rows > 1 ? dNear + ((dFar - dNear) * k) / (rows - 1) : (dNear + dFar) / 2;
      const rowLen = rowOf(k).reduce((a, w) => a + w * letter + wordGap, 0);
      const bed = [];
      for (let u = u0 - 4; u <= u0 + 5 + rowLen; u += 2) bed.push(place(u, d, side));
      for (let q = 1; q < bed.length; q++) seg(bed[q - 1][0], bed[q - 1][1], bed[q][0], bed[q][1], Math.min(7, rowMin + 2.4));
    }
    lay(C.ground.map((v) => v * 0.1), 0.72);
    // spine
    const a = dOf(s.to ?? o.lastYear), b = dOf(s.from ?? firstYear);
    const fuzzyA = s.fuzzyTo ? o.fuzzy * pitch : 0, fuzzyB = s.fuzzyFrom || s.from == null ? o.fuzzy * pitch : 0;
    const solid = [];
    for (let d = a + fuzzyA; d <= b - fuzzyB; d += 2) solid.push(place(u0, d, side));
    if (solid.length > 1) stroke(solid, 1.5, col, 0.85);
    for (const [f0, f1] of [[a, a + fuzzyA], [b - fuzzyB, b]])
      for (let d = f0; d < f1; d += 6) { const [x, y] = place(u0, d, side); dot(x, y, 0.9, col, 0.8); }
    // words
    for (let k = 0; k < rows; k++) {
      const d = rows > 1 ? dNear + ((dFar - dNear) * k) / (rows - 1) : (dNear + dFar) / 2;
      let u = u0 + 5;
      for (const word of rowOf(k)) {
        const len = word * letter;
        const pts = [];
        for (let t = 0; t <= len; t += 1.5) pts.push(place(u + t, d, side));
        pts.push(place(u + len, d, side));
        for (let z = 1; z < pts.length; z++) seg(pts[z - 1][0], pts[z - 1][1], pts[z][0], pts[z][1], tickW);
        u += len + wordGap;
      }
    }
    lay(col, 0.96, 0.12);
    const [kx, ky] = place(knot[i].u, knot[i].d, side);
    dot(kx, ky, 7.4, C.ground.map((v) => v * 0.1), 1);
    dot(kx, ky, 5.6, col, 1, 0.9);
    dot(kx, ky, 2.1, C.ground.map((v) => v * 0.1), 1);
  }
});

// ---------------------------------------------------------------- the river
{
  const pts = [];
  for (let u = -EXT + 1; u < M + EXT - 1; u += 1) pts.push(place(u, 0, 1));
  stroke(pts, o.water * 2 - 7, C.ground.map((v) => v * 0.06), 1);
  stroke(pts, 5.2, C.pale, 1, 1.6);
}

// ---------------------------------------------------------------- finish
// glow: three box blurs of the quarter-size shine buffer, added back
function blur(src, r) {
  const tmp = new Float32Array(gw * gh);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < gh; y++) {
      let acc = 0;
      for (let x = -r; x < gw + r; x++) {
        if (x + r < gw) acc += src[y * gw + Math.max(0, x + r)] ?? 0;
        if (x - r - 1 >= 0) acc -= src[y * gw + x - r - 1];
        if (x >= 0 && x < gw) tmp[y * gw + x] = acc / (2 * r + 1);
      }
    }
    for (let x = 0; x < gw; x++) {
      let acc = 0;
      for (let y = -r; y < gh + r; y++) {
        if (y + r < gh) acc += tmp[Math.max(0, y + r) * gw + x] ?? 0;
        if (y - r - 1 >= 0) acc -= tmp[(y - r - 1) * gw + x];
        if (y >= 0 && y < gh) src[y * gw + x] = acc / (2 * r + 1);
      }
    }
  }
}
glow.forEach((g) => blur(g, 5));
const rgba = new Uint8Array(W * H * 4);
const gain = 0.5 / (glowS * glowS);
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const at = y * W + x, g = Math.floor(y / glowS) * gw + Math.floor(x / glowS);
    const edge = 1 - 0.3 * Math.pow(Math.abs(x - W / 2) / (W / 2), 3);
    const tone = (v) => 255 * (1 - Math.exp(-(v * edge) / 170)) * 1.29;
    rgba[at * 4] = Math.min(255, tone(R[at] + glow[0][g] * gain));
    rgba[at * 4 + 1] = Math.min(255, tone(G[at] + glow[1][g] * gain));
    rgba[at * 4 + 2] = Math.min(255, tone(B[at] + glow[2][g] * gain));
    rgba[at * 4 + 3] = 255;
  }
writeFileSync(join(here, 'out.png'), encodePng(W, H, rgba));
execFileSync('sips', ['-Z', '1600', join(here, 'out.png'), '--out', join(here, 'preview.png')], { stdio: 'ignore' });

// fold check: a ring folds where it runs backwards along the river
let folds = 0;
for (let d = o.water; d <= dMax; d += 20)
  for (const side of [1, -1])
    for (let u = 0; u < M - 4; u += 4) {
      const [x0] = place(u, d, side), [x1] = place(u + 4, d, side);
      if (x1 < x0) folds++;
    }

const both = judged.filter((p) => p.a > 0 && p.b > 0).length;
console.log(`${years + 1} years (${firstYear} to ${o.lastYear}), ${pitch.toFixed(3)} px a year, ${(pitch * metresPerPx).toFixed(2)} m of ground a year`);
console.log(`river reach ${(lengthM / 1000).toFixed(1)} km, ${metresPerPx.toFixed(2)} m per px`);
console.log(`links: A ${judged.filter((p) => p.a > 0).length}, B ${judged.filter((p) => p.b > 0).length}, both ${both}`);
console.log(`ring samples running backwards: ${folds}`);
