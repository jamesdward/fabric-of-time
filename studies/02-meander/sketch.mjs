// Study 02: Meander
//
// Time as one narrow band of cloth, laid out oldest to newest, then pulled
// into folds wherever the chosen reading links two distant moments.
//
// Mapping (all authored, see studies/README.md):
//   band      the 46 records in date order; length between neighbours grows with
//             the years between them (to the power `gapPower`, so silences stay
//             long without swallowing the page)
//   picks     one coloured band per record
//   stitches  one per link; each draws its two records together until the band
//             lies beside itself there. With no links the band stays straight.
//   The band resists creasing and resists lying on top of itself; everything
//   else about its path comes from the links.

import { PALETTE, mulberry32, reading, byTime, polyline, svgDoc, f } from '../lib/core.mjs';

export const meta = { id: '02-meander', title: 'Meander', width: 1200, height: 1600 };

const DEFAULTS = {
  spacing: 10, // distance between simulated points along the band
  gapPower: 0.6,
  gapScale: 0.9,
  bandWidth: 44,
  threads: 15,
  iterations: 1600,
  attract: 0.02,
  repel: 0.35,
  stiffness: 0.3,
};

function layout(data, links, order, o, rand) {
  const records = data.records;
  const node = []; // node index of each record
  let n = 0;
  order.forEach((i, k) => {
    if (k) n += 2 + Math.round(o.gapScale * Math.pow(records[i].year - records[order[k - 1]].year, o.gapPower));
    node[i] = n;
  });
  const N = n + 1;
  const h = o.spacing;

  // Start as a straight band with a faint seeded sway, so folds have a side to fall to.
  const phase = rand() * Math.PI * 2;
  const waves = 2 + rand() * 2;
  const P = [], Q = [];
  for (let k = 0; k < N; k++) {
    P.push([Math.sin((k / N) * Math.PI * 2 * waves + phase) * 30 + (rand() - 0.5), k * h]);
    Q.push(P[k].slice());
  }

  const skip = Math.ceil((o.bandWidth * 1.6) / h);
  const pair = (a, b, rest, k, mode) => {
    const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1];
    const d = Math.hypot(dx, dy) || 1e-6;
    if ((mode === 'min' && d >= rest) || (mode === 'max' && d <= rest)) return;
    const m = (k * (d - rest)) / d / 2;
    P[a][0] += dx * m; P[a][1] += dy * m;
    P[b][0] -= dx * m; P[b][1] -= dy * m;
  };

  for (let it = 0; it < o.iterations; it++) {
    for (let k = 0; k < N; k++) {
      const vx = (P[k][0] - Q[k][0]) * 0.9, vy = (P[k][1] - Q[k][1]) * 0.9;
      Q[k][0] = P[k][0]; Q[k][1] = P[k][1];
      P[k][0] += vx; P[k][1] += vy;
    }
    for (const { i, j, w } of links) pair(node[i], node[j], o.bandWidth * 1.05, (o.attract * w) / 5, 'max');
    for (let a = 0; a < N; a++)
      for (let b = a + skip; b < N; b++) {
        if (Math.abs(P[a][0] - P[b][0]) > o.bandWidth || Math.abs(P[a][1] - P[b][1]) > o.bandWidth) continue;
        pair(a, b, o.bandWidth, o.repel, 'min');
      }
    for (let pass = 0; pass < 6; pass++) {
      for (let k = 0; k + 1 < N; k++) pair(k, k + 1, h, 1);
      for (let k = 0; k + 2 < N; k++) pair(k, k + 2, 2 * h, o.stiffness, 'min');
      for (let k = 0; k + 6 < N; k++) pair(k, k + 6, 6 * h * 0.8, o.stiffness, 'min');
    }
  }
  return { P, node };
}

export function render(data, { reading: name = 'models', seed = 7, ...overrides } = {}) {
  const o = { ...DEFAULTS, ...overrides };
  const { width: W, height: H } = meta;
  const rand = mulberry32(seed);
  const records = data.records;
  const order = byTime(records);
  const links = reading(data, name, seed);
  const { P, node } = layout(data, links, order, o, rand);

  // Fit the settled band to the page.
  const box = { x0: 130, x1: W - 130, y0: 130, y1: H - 160 };
  const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const [ax, bx, ay, by] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = o.bandWidth;
  const s = Math.min((box.x1 - box.x0) / (bx - ax + pad), (box.y1 - box.y0) / (by - ay + pad), 1.6);
  const C = P.map(([x, y]) => [
    (box.x0 + box.x1) / 2 + (x - (ax + bx) / 2) * s,
    (box.y0 + box.y1) / 2 + (y - (ay + by) / 2) * s,
  ]);
  const half = (o.bandWidth * s) / 2;

  const normal = (k) => {
    const a = C[Math.max(k - 1, 0)], b = C[Math.min(k + 1, C.length - 1)];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / d, (b[0] - a[0]) / d];
  };
  const normals = C.map((_, k) => normal(k));

  let warp = '';
  for (let t = 0; t < o.threads; t++) {
    const off = (t / (o.threads - 1) - 0.5) * 2 * half;
    warp += polyline(C.map((c, k) => [c[0] + normals[k][0] * off, c[1] + normals[k][1] * off]));
  }
  let body = `<g stroke="${PALETTE.warp}" stroke-width="${f(Math.max(0.6, 1.1 * s))}" opacity="0.88">${warp}</g>`;

  let picks = '';
  for (const i of order) {
    let band = '';
    const [nx, ny] = normals[node[i]];
    const r = half + 4 * s;
    for (let n = -1; n <= 1; n++) {
      // three picks side by side along the band; the tangent is the normal turned a quarter
      const cx = C[node[i]][0] + ny * n * 3.6 * s, cy = C[node[i]][1] - nx * n * 3.6 * s;
      band += `<path d="M${f(cx - nx * r)} ${f(cy - ny * r)}L${f(cx + nx * r)} ${f(cy + ny * r)}"/>`;
    }
    picks += `<g stroke="${PALETTE.strand[records[i].strand]}">${band}</g>`;
  }
  body += `<g stroke-width="${f(Math.max(1.6, 2.6 * s))}">${picks}</g>`;

  let stitches = '';
  for (const { i, j, w } of links) {
    const a = C[node[i]], b = C[node[j]];
    stitches += `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke-width="${f(0.5 + w * 0.32)}"/>`;
  }
  body += `<g stroke="${PALETTE.affinity}" opacity="0.92">${stitches}</g>`;

  const label = (k, text) => {
    const [nx, ny] = normals[k];
    return `<text x="${f(C[k][0] + nx * (half + 16))}" y="${f(C[k][1] + ny * (half + 16) + 4)}" text-anchor="middle" stroke="none" ` +
      `font-family="ui-monospace, Menlo, monospace" font-size="12" fill="${PALETTE.warp}" opacity="0.7">${text}</text>`;
  };
  body += label(0, records[order[0]].year) + label(C.length - 1, records[order[order.length - 1]].year);

  return svgDoc(W, H, body, `A FABRIC THROUGH TIME · STUDY 02 MEANDER · ${name.toUpperCase()} · SEED ${seed}`);
}
