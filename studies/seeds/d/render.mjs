// Seed study D: Bank and Reflection
//
// A direction read out of a random string (see README.md and seed.txt).
// The River Avon's real course, in plan, is a waterline across the page.
// Above it, on a light ground and in straight strokes: what the records say.
// Below it, on a dark ground and in curves: what two models made of them.
//
// Mapping (all of it stated again, with its limits, in README.md):
//   waterline   the Avon's course from OpenStreetMap, north up, true proportions
//   strata      one line per year, a copy of the river moved up (and down) one
//               unit per year back from 13 October 2026; darker the more records
//               describe that year; heavy lines at Fibonacci numbers of years ago
//   stems       one per record, standing on the bank; a bar over the span of
//               years the record describes, a hairline from there to the water
//   blocks      the record's own text, one mark per character, 16 to a row,
//               standing on the year experiment 01 filed it under
//   reflection  the same, mirrored in the water; each block only as bright as
//               the links the models gave it
//   lenses      one per link: model A's arc bows one way, model B's the other,
//               each as heavy as the Fibonacci number of its strength
//
//   node studies/seeds/d/render.mjs [models|none]
//   (none leaves the links out: the removal test, written to out--none.png at 1600 px)

import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mulberry32 } from '../../lib/core.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const data = load('experiments/01-kingston-test/outputs/data.json');
const river = load('data/river/avon-course.json');
const { spans } = load('data/described-spans.json');
const SEED = readFileSync(join(here, 'seed.txt'), 'utf8').trim();
const mode = process.argv[2] ?? 'models';

// ---- decisions taken from the string -------------------------------------
const alphaHue = (ch) => ((ch.toLowerCase().charCodeAt(0) - 97) / 26) * 360;
const GOLDEN = 360 * (1 - 1 / ((1 + Math.sqrt(5)) / 2)); // 137.5 degrees
const FIB = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597];
const COLS = 16; // the string is 128 = 8 rows of 16
const hue = {
  b: alphaHue('b'), // 13.8  the bank
  l: alphaHue('l'), // 152.3 the waterline
  p: alphaHue('p'), // 207.7 the water
  x: alphaHue('x'), // 318.5 the crossings: the models' links
};
// five strands, in the order the corpus first names them, stepped round the
// wheel from b's hue by the golden angle
const strandOrder = [];
for (const r of data.records) if (!strandOrder.includes(r.strand)) strandOrder.push(r.strand);
const strandHue = Object.fromEntries(strandOrder.map((s, k) => [s, (hue.b + k * GOLDEN) % 360]));
let h32 = 2166136261;
for (const ch of SEED) h32 = Math.imul(h32 ^ ch.charCodeAt(0), 16777619) >>> 0;
const rand = mulberry32(h32);

// ---- colour ---------------------------------------------------------------
function oklch(L, C, H) {
  const a = C * Math.cos((H * Math.PI) / 180), b = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return '#' + lin.map((v) => {
    const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, c)) * 255).toString(16).padStart(2, '0');
  }).join('');
}
const C = {
  paper: oklch(0.945, 0.022, hue.b + GOLDEN * 3),
  ink: oklch(0.24, 0.05, hue.p + 50),
  water: oklch(0.17, 0.045, hue.p + 40),
  glint: oklch(0.8, 0.06, hue.p),
  line: oklch(0.74, 0.15, hue.l),
  link: oklch(0.74, 0.21, hue.x),
  linkHot: oklch(0.9, 0.1, hue.x),
};
const bankCol = (s) => oklch(0.52, 0.15, strandHue[s]);
const waterCol = (s) => oklch(0.76, 0.14, strandHue[s]);

// ---- geometry ---------------------------------------------------------------
const NOW = 2026 + 285 / 365; // 13 October 2026
const FIRST = Math.min(...Object.values(spans).map((s) => s.from ?? Infinity));
const T = NOW - FIRST; // years held by the records
const MX = 150, MY = 110, W = 3600;
// The river, unrolled: distance along it runs across the page (upstream at the
// right, as on a north-up map of this reach), and how far it strays north or
// south of the straight line between its ends moves the waterline up or down.
// Same scale both ways, so no slope can pass 45 degrees.
const kx = 111320 * Math.cos((51.347 * Math.PI) / 180), ky = 111132;
const m = river.course.map(([lon, lat]) => [lon * kx, lat * ky]);
const [ea, eb] = [m[0], m.at(-1)];
const chord = Math.hypot(eb[0] - ea[0], eb[1] - ea[1]);
const [ux, uy] = [(eb[0] - ea[0]) / chord, (eb[1] - ea[1]) / chord];
const along = [0];
for (let k = 1; k < m.length; k++) along.push(along[k - 1] + Math.hypot(m[k][0] - m[k - 1][0], m[k][1] - m[k - 1][1]));
const scale = W / along.at(-1);
const north = m.map((q) => ((q[0] - ea[0]) * uy - (q[1] - ea[1]) * ux) * scale);
const top = Math.max(...north);
const raw = m.map((_, k) => [W - along[k] * scale, top - north[k]]).reverse();
// resampled every 3 units and averaged over about 110 m of river, so the corners
// between map nodes do not stack into vertical seams
const STEP = 3, SMOOTH = 4;
const sampled = [];
for (let x = 0, k = 1; x <= W; x += STEP) {
  while (k < raw.length - 1 && raw[k][0] < x) k++;
  const [a, b] = [raw[k - 1], raw[k]];
  sampled.push(a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]));
}
const pts = sampled.map((_, k) => {
  let sum = 0, n = 0;
  for (let j = Math.max(0, k - SMOOTH); j <= Math.min(sampled.length - 1, k + SMOOTH); j++) { sum += sampled[j]; n++; }
  return [k * STEP, sum / n];
});
const AMP = Math.max(...pts.map((q) => q[1]));
const Y0 = MY + T; // page y of the river's northernmost point
const H = MY * 2 + T * 2 + AMP;
const f = (n) => (Math.round(n * 100) / 100).toString();
const riverD = pts.map((q, k) => (k ? 'L' : 'M') + f(q[0]) + ' ' + f(q[1])).join('');
function foot(x) {
  const k = Math.max(0, Math.min(pts.length - 2, Math.floor(x / STEP)));
  return pts[k][1] + (pts[k + 1][1] - pts[k][1]) * (x / STEP - k);
}
const RW = W - MX * 2; // the records stand inside a margin; the river does not stop

// ---- records ----------------------------------------------------------------
const records = data.records;
const order = [];
data.groups.forEach((g, gi) => {
  records.map((r, i) => i).filter((i) => records[i].site_group === g)
    .sort((a, b) => records[a].year - records[b].year || a - b)
    .forEach((i) => order.push({ i, gi }));
});
const GROUP_GAP = 0.618;
const slots = order.length + (data.groups.length - 1) * GROUP_GAP;
const SLOT = RW / slots;
const CELL = Math.min(3.5, (SLOT - 6) / COLS), CH = 5; // windows taller than wide
const X = [], F = [];
order.forEach(({ i, gi }, k) => {
  X[i] = MX + (k + gi * GROUP_GAP + 0.5) * SLOT;
  F[i] = foot(X[i]);
});
const ago = (year) => NOW - year;

// how many records describe each year
const cover = (year) => records.filter((r) => {
  const s = spans[r.id];
  return (s.from ?? -Infinity) <= year && year <= (s.to ?? NOW);
}).length;
const maxCover = Math.max(...Array.from({ length: Math.ceil(T) }, (_, n) => cover(NOW - n)));

// ---- links ------------------------------------------------------------------
const links = mode === 'none' ? [] : data.pairs.filter((p) => p.kw !== null && p.a + p.b > 0);
const heat = records.map(() => 0);
for (const p of links) { heat[p.i] += p.a + p.b; heat[p.j] += p.a + p.b; }
const maxHeat = Math.max(1, ...heat);

// ---- strata -----------------------------------------------------------------
let above = '', below = '';
const reach = Math.ceil(T + AMP + MY + 10);
for (let n = 1; n <= reach; n++) {
  const year = NOW - n;
  const fade = n <= T ? 1 : Math.exp(-(n - T) / 220);
  const c = n <= T ? cover(year) / maxCover : 0;
  const fib = FIB.includes(n);
  const century = Math.floor(year + 1) % 100 === 0 && n <= T;
  if (century && !fib) { rand(); rand(); continue; } // a century is a missing line
  const wt = fib ? 2.3 : 0.42 + 0.3 * c;
  const op = (fib ? 0.85 : 0.13 + 0.62 * Math.sqrt(c)) * fade;
  above += `<use href="#r" y="${f(Y0 - n)}" stroke-width="${f(wt)}" opacity="${f(op)}"/>`;
  // the water breaks each line into glints; longer where more is recorded
  const on = 5 + rand() * 34 + c * 60, off = 4 + rand() * 30;
  below += `<use href="#r" y="${f(Y0 + n)}" stroke-width="${f(fib ? 2 : 0.5 + 0.25 * c)}" opacity="${f((fib ? 0.6 : 0.1 + 0.4 * Math.sqrt(c)) * fade)}"` +
    (fib ? '' : ` stroke-dasharray="${f(on)} ${f(off)}" stroke-dashoffset="${f(rand() * 90)}"`) + '/>';
}

// ---- stems and blocks ---------------------------------------------------------
const cls = (ch) => (/[0-9]/.test(ch) ? 'd' : /[a-z]/.test(ch) ? 'l' : /[A-Z]/.test(ch) ? 'U' : /\s/.test(ch) ? 's' : 'p');
const rect = (x, y, w, h) => `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`;
let stems = '', blocks = '', mirrorStems = '', mirrorBlocks = '', rungs = '', mirrorRungs = '';
const head = []; // where each record's reflection sits, for the links
records.forEach((r, i) => {
  const s = spans[r.id];
  const x = X[i], y0 = F[i] + Y0;
  const nFrom = ago(s.from ?? FIRST), nTo = Math.max(0, ago(s.to ?? NOW));
  const up = (n) => y0 - n, down = (n) => y0 + n;
  const col = bankCol(r.strand), wcol = waterCol(r.strand);
  const glow = 0.16 + 0.84 * Math.sqrt(heat[i] / maxHeat);

  // bank: straight strokes
  const fz = 26;
  const a = s.fuzzyFrom ? nFrom - fz : nFrom, b = s.fuzzyTo ? nTo + fz : nTo;
  stems += `<path d="M${f(x)} ${f(up(0))}V${f(up(nTo))}" stroke="${col}" stroke-width="1" opacity="0.7"/>`;
  if (a > b) stems += `<path d="M${f(x)} ${f(up(b))}V${f(up(a))}" stroke="${col}" stroke-width="5" stroke-linecap="butt"/>`;
  else stems += `<path d="M${f(x - 5)} ${f(up(nTo))}H${f(x + 5)}" stroke="${col}" stroke-width="2"/>`;
  for (const [p, q] of [[nTo, b], [a, nFrom]]) if (q > p) stems += `<path d="M${f(x)} ${f(up(p))}V${f(up(q))}" stroke="${col}" stroke-width="5" stroke-linecap="butt" stroke-dasharray="2 3"/>`;
  if (s.from == null) stems += `<path d="M${f(x)} ${f(up(nFrom))}V${f(up(nFrom + AMP + MY))}" stroke="${col}" stroke-width="3" stroke-linecap="butt" stroke-dasharray="1.5 5"/>`;

  // one rung per year described, lying along that year's line
  const RUNG = 15, [fl, fr] = [foot(x - RUNG), foot(x + RUNG)];
  let rung = '', mRung = '';
  for (let n = Math.ceil(nTo); n <= nFrom; n++) {
    rung += `M${f(x - RUNG)} ${f(fl + Y0 - n)}L${f(x + RUNG)} ${f(fr + Y0 - n)}`;
    if (n % 2) mRung += `M${f(x - RUNG)} ${f(fl + Y0 + n)}L${f(x + RUNG)} ${f(fr + Y0 + n)}`;
  }
  if (rung) rungs += `<path d="${rung}" stroke="${col}"/>`;
  if (mRung) mirrorRungs += `<path d="${mRung}" stroke="${wcol}" opacity="${f(0.12 + 0.5 * glow)}"/>`;

  // water: the same stem, bent by ripples
  const wave = (n) => x + Math.sin(n / 21 + i * 2.4) * Math.min(4, 0.6 + n / 90);
  const wavy = (p, q) => {
    let d = '';
    for (let n = p; n <= q; n += 3) d += (d ? 'L' : 'M') + f(wave(n)) + ' ' + f(down(n));
    return d + 'L' + f(wave(q)) + ' ' + f(down(q));
  };
  mirrorStems += `<path d="${wavy(0, nTo)}" stroke="${wcol}" stroke-width="0.9" opacity="${f(0.25 + 0.5 * glow)}"/>`;
  if (nFrom > nTo) mirrorStems += `<path d="${wavy(nTo, nFrom)}" stroke="${wcol}" stroke-width="3.4" opacity="${f(0.18 + 0.7 * glow)}"/>`;
  if (s.from == null) mirrorStems += `<path d="${wavy(nFrom, nFrom + AMP + MY)}" stroke="${wcol}" stroke-width="2" stroke-dasharray="1.5 6" opacity="${f(0.18 + 0.5 * glow)}"/>`;

  // the block: the record's text, one mark per character
  const text = r.text;
  const rows = Math.ceil(text.length / COLS);
  const bw = COLS * CELL, bh = rows * CH;
  const n0 = ago(r.year); // the block stands on its year
  const bx = x - bw / 2, top = up(n0) - bh;
  let lit = '', tall = '', dot = '', num = '';
  let mLit = '', mNum = '', mFace = '';
  for (let row = 0; row < rows; row++) {
    // mirrored: the row nearest the water stays nearest the water
    const depth = rows - 1 - row;
    const my = down(n0) + depth * CH;
    const shift = Math.sin(depth * 0.55 + i * 1.7) * (0.8 + depth * 0.2) + (wave(n0 + depth * CH) - x);
    mFace += rect(bx + shift - 1.2, my, bw + 2.4, CH * 0.8);
    for (let c = 0; c < COLS; c++) {
      const ch = text[row * COLS + c];
      if (ch === undefined) continue;
      const k = cls(ch);
      const cx = bx + c * CELL, cy = top + row * CH;
      if (k === 'l') lit += rect(cx + 0.6, cy + 1.6, CELL - 1.2, CH - 2.4);
      else if (k === 'U') tall += rect(cx + 0.3, cy + 0.3, CELL - 0.6, CH - 0.6);
      else if (k === 'p') dot += rect(cx + CELL / 2 - 0.6, cy + CH - 2, 1.2, 1.2);
      else if (k === 'd') num += rect(cx + 0.1, cy + 0.9, CELL - 0.2, CH - 1.8);
      if (k === 'l' || k === 'U') mLit += rect(cx + shift + 0.6, my + 0.7, CELL - 1.2, CH * 0.8 - 1.8);
      else if (k === 'd') mNum += rect(cx + shift, my, CELL, CH * 0.8);
    }
  }
  blocks += `<path d="${rect(bx - 1.2, top - 1.2, bw + 2.4, bh + 2.4)}" fill="${col}"/>` +
    `<path d="${lit}${dot}" fill="${C.paper}" opacity="0.92"/><path d="${tall}" fill="${C.paper}"/>` +
    (num ? `<path d="${num}" fill="${C.ink}"/>` : '');
  mirrorBlocks += `<g opacity="${f(glow)}"><path d="${mFace}" fill="${wcol}"/><path d="${mLit}" fill="${C.water}" opacity="0.8"/>` +
    (num ? `<path d="${mNum}" fill="${C.linkHot}"/>` : '') + '</g>';
  head[i] = [wave(n0 + bh / 2), down(n0) + bh / 2];
});

// ---- lenses: the models' links, under the water ---------------------------------
let fills = '', arcs = '', nodes = '';
const used = new Set();
for (const p of links.slice().sort((a, b) => a.a + a.b - (b.a + b.b))) {
  const [P, Q] = head[p.i][0] <= head[p.j][0] ? [head[p.i], head[p.j]] : [head[p.j], head[p.i]];
  const dx = Q[0] - P[0], len = Math.hypot(dx, Q[1] - P[1]);
  // each link hangs in the water like a slack line; model A's hangs deeper than model B's
  const hang = (sag, spread) => {
    const c1 = [P[0] + dx * 0.28, P[1] + (Q[1] - P[1]) * 0.28 + sag + spread];
    const c2 = [P[0] + dx * 0.72, P[1] + (Q[1] - P[1]) * 0.72 + sag + spread];
    return [c1, c2];
  };
  const sagA = 26 + len * 0.2, sagB = 8 + len * 0.07;
  const cub = (c, from, to) => `C${f(c[0][0])} ${f(c[0][1])} ${f(c[1][0])} ${f(c[1][1])} ${f(to[0])} ${f(to[1])}`;
  if (p.a && p.b) {
    const [A, B] = [hang(sagA, 0), hang(sagB, 0)];
    fills += `<path d="M${f(P[0])} ${f(P[1])}${cub(A, P, Q)}${cub([B[1], B[0]], Q, P)}z" opacity="${f(0.02 + 0.006 * (p.a + p.b))}"/>`;
  }
  for (const [w, sag] of [[p.a, sagA], [p.b, sagB]]) {
    if (!w) continue;
    // as many filaments as the Fibonacci number of the strength
    for (let k = 0; k < FIB[w]; k++) {
      const c = hang(sag, (k - (FIB[w] - 1) / 2) * 3.4);
      arcs += `<path d="M${f(P[0])} ${f(P[1])}${cub(c, P, Q)}" opacity="${f(p.a && p.b ? 0.9 : 0.5)}"/>`;
    }
  }
  used.add(p.i); used.add(p.j);
}
for (const i of used) nodes += `<circle cx="${f(head[i][0])}" cy="${f(head[i][1])}" r="${f(2.5 + 5.5 * Math.sqrt(heat[i] / maxHeat))}"/>`;

// ---- page -----------------------------------------------------------------------
const OUT = 4000 / H;
const pw = Math.round(W * OUT), ph = Math.round(H * OUT);
const bank = `M0 ${f(-Y0 - 20)}` + pts.map((q) => 'L' + f(q[0]) + ' ' + f(q[1])).join('') + `L${f(W)} ${f(-Y0 - 20)}z`;
const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(W)} ${f(H)}" width="${pw}" height="${ph}">` +
  `<defs><path id="r" d="${riverD}"/></defs>` +
  `<rect width="100%" height="100%" fill="${C.water}"/>` +
  `<g fill="none" stroke-linejoin="round" stroke-linecap="round">` +
  `<g transform="translate(0 ${f(Y0)})"><path d="${bank}" fill="${C.paper}"/></g>` +
  `<g stroke="${C.ink}">${above}</g><g stroke-width="0.5" stroke-linecap="butt" opacity="0.85">${rungs}</g>${stems}<g stroke="none">${blocks}</g>` +
  `<g stroke="${C.glint}">${below}</g><g stroke-width="0.5" stroke-linecap="butt">${mirrorRungs}</g>${mirrorStems}<g stroke="none">${mirrorBlocks}</g>` +
  `<g fill="${C.link}" stroke="none">${fills}</g><g stroke="${C.link}" stroke-width="0.9">${arcs}</g><g fill="${C.linkHot}" stroke="none">${nodes}</g>` +
  `<use href="#r" y="${f(Y0)}" stroke="${C.line}" stroke-width="6"/>` +
  `</g></svg>`;
writeFileSync(join(here, 'out.svg'), svg);
console.log(`${mode}: ${links.length} links, ${records.length} records, ${Math.round(T)} years, page ${pw} x ${ph}, cell ${CELL.toFixed(2)}`);
console.log('strand hues', Object.entries(strandHue).map(([s, h]) => `${s} ${h.toFixed(1)}`).join(', '));

const name = mode === 'models' ? 'out' : `out--${mode}`;
execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--hide-scrollbars',
  '--force-device-scale-factor=1', `--window-size=${pw},${ph}`, `--screenshot=${join(here, `${name}.png`)}`,
  'file://' + join(here, 'out.svg')], { stdio: 'ignore' });
if (mode !== 'models') execFileSync('sips', ['-Z', '1600', join(here, `${name}.png`)], { stdio: 'ignore' });
if (mode === 'models') {
  execFileSync('sips', ['-Z', '1600', join(here, 'out.png'), '--out', join(here, 'preview.png')], { stdio: 'ignore' });
  // a detail at full size: the mill quarter on the bank and in the water
  const cx = Math.round((X[records.findIndex((r) => r.id === 'K12')]) * OUT), cy = Math.round((Y0 + F[records.findIndex((r) => r.id === 'K12')]) * OUT);
  execFileSync('sips', ['-c', '1100', '1500', '--cropOffset', String(Math.max(0, cy - 550)), String(Math.max(0, cx - 750)), join(here, 'out.png'), '--out', join(here, 'detail.png')], { stdio: 'ignore' });
}
