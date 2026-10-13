// Study 03: Hold
//
// The cloth of study 01, but a link only takes tension when other links back
// it up. A link is "held" when its two records are both linked to some third
// record. Held links are drawn taut and gather the cloth; three records that
// all hold each other are woven shut. Every other link hangs slack and moves
// nothing.
//
// Mapping (all authored, see studies/README.md):
//   warp, height, picks   as study 01
//   slack threads         links with no third record in common
//   taut threads          held links; only these pull the cloth
//   woven patches         triangles of mutually linked records, cross-hatched

import { PALETTE, mulberry32, reading, byTime, polyline, svgDoc, f } from '../lib/core.mjs';

export const meta = { id: '03-hold', title: 'Hold', width: 1200, height: 1600 };

const DEFAULTS = {
  threadsPerPlace: 13,
  timeWarp: 0.5,
  pull: 0.4,
  reach: 85,
  maxPull: 110,
  wobble: 1.1,
  slack: 0.13, // how far a slack thread bows, as a share of its length
  hatch: 5,
};

// Splits links into held and slack, and lists the triangles among them.
export function corroborate(links) {
  const near = new Map();
  for (const { i, j } of links)
    for (const [a, b] of [[i, j], [j, i]]) near.set(a, (near.get(a) ?? new Set()).add(b));
  const held = [], slack = [], triangles = [];
  for (const link of links) {
    const shared = [...near.get(link.i)].filter((k) => near.get(link.j).has(k));
    (shared.length ? held : slack).push(link);
    for (const k of shared) if (k > link.i && k > link.j) triangles.push([link.i, link.j, k]);
  }
  return { held, slack, triangles };
}

export function render(data, { reading: name = 'models', seed = 7, ...overrides } = {}) {
  const o = { ...DEFAULTS, ...overrides };
  const { width: W, height: H } = meta;
  const rand = mulberry32(seed);
  const box = { x0: 120, x1: W - 120, y0: 120, y1: H - 150 };

  const records = data.records;
  const order = byTime(records);
  const nThreads = data.groups.length * o.threadsPerPlace;
  const pitch = (box.x1 - box.x0) / (nThreads - 1);
  const years = records.map((r) => r.year);
  const [yMin, yMax] = [Math.min(...years), Math.max(...years)];

  const pos = [];
  order.forEach((i, rank) => {
    const g = data.groups.indexOf(records[i].site_group);
    const linear = (records[i].year - yMin) / (yMax - yMin);
    const even = rank / (order.length - 1);
    const u = o.timeWarp * linear + (1 - o.timeWarp) * even;
    pos[i] = [box.x0 + (g + 0.5) * o.threadsPerPlace * pitch - pitch / 2, box.y0 + u * (box.y1 - box.y0)];
  });

  const { held, slack, triangles } = corroborate(reading(data, name, seed));

  const pulls = [];
  for (const { i, j, w } of held) {
    const s = (o.pull * w) / 5;
    for (const [a, b] of [[i, j], [j, i]]) {
      const dx = pos[b][0] - pos[a][0], dy = pos[b][1] - pos[a][1];
      const len = Math.hypot(dx, dy) || 1;
      const reachLen = Math.min(len * s, o.maxPull);
      pulls.push({ x: pos[a][0], y: pos[a][1], dx: (dx / len) * reachLen, dy: (dy / len) * reachLen });
    }
  }
  const k2 = 1 / (2 * o.reach * o.reach);
  const warpPoint = ([x, y]) => {
    let dx = 0, dy = 0, total = 0;
    for (const p of pulls) {
      const g = Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) * k2);
      dx += g * p.dx;
      dy += g * p.dy;
      total += g;
    }
    const share = total > 1 ? 1 / total : 1;
    return [x + dx * share, y + dy * share];
  };

  const step = 6;
  let body = '';

  let ground = '';
  const rows = Math.round((box.y1 - box.y0) / (pitch * 2));
  for (let r = 0; r <= rows; r++) {
    const y = box.y0 + (r / rows) * (box.y1 - box.y0);
    const pts = [];
    for (let x = box.x0; x <= box.x1 + 0.01; x += step) pts.push(warpPoint([x, y]));
    ground += polyline(pts);
  }
  body += `<g stroke="${PALETTE.warp}" stroke-width="0.5" opacity="0.32">${ground}</g>`;

  let warp = '';
  for (let t = 0; t < nThreads; t++) {
    const x = box.x0 + t * pitch;
    const phase = rand() * Math.PI * 2;
    const freq = 0.004 + rand() * 0.004;
    const pts = [];
    for (let y = box.y0; y <= box.y1 + 0.01; y += step)
      pts.push(warpPoint([x + Math.sin(y * freq + phase) * o.wobble, y]));
    warp += polyline(pts);
  }
  body += `<g stroke="${PALETTE.warp}" stroke-width="1.15" opacity="0.9">${warp}</g>`;

  let picks = '';
  for (const i of order) {
    const [cx, cy] = pos[i];
    const half = (o.threadsPerPlace * pitch) / 2;
    let band = '';
    for (let n = -2; n <= 2; n++) {
      const pts = [];
      for (let x = cx - half; x <= cx + half + 0.01; x += step / 2) pts.push(warpPoint([x, cy + n * 2.4]));
      band += polyline(pts);
    }
    picks += `<g stroke="${PALETTE.strand[records[i].strand]}">${band}</g>`;
  }
  body += `<g stroke-width="2.3">${picks}</g>`;

  let loose = '';
  for (const { i, j } of slack) {
    const [a, b] = [warpPoint(pos[i]), warpPoint(pos[j])];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const side = rand() < 0.5 ? -1 : 1;
    // bow sideways and sag a little, like a thread left unfastened
    const cx = (a[0] + b[0]) / 2 - dy * o.slack * side;
    const cy = (a[1] + b[1]) / 2 + dx * o.slack * side + Math.hypot(dx, dy) * o.slack * 0.6;
    loose += `<path d="M${f(a[0])} ${f(a[1])}Q${f(cx)} ${f(cy)} ${f(b[0])} ${f(b[1])}"/>`;
  }
  body += `<g stroke="${PALETTE.affinity}" stroke-width="0.7" opacity="0.6">${loose}</g>`;

  let woven = '';
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  for (const tri of triangles) {
    const [A, B, C] = tri.map((i) => warpPoint(pos[i]));
    for (const [p, q, r] of [[A, B, C], [B, C, A]]) {
      const base = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      const heightTo = Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])) / base;
      const n = Math.max(2, Math.round(heightTo / o.hatch));
      for (let k = 1; k < n; k++) woven += polyline([lerp(p, r, k / n), lerp(q, r, k / n)]);
    }
  }
  body += `<g stroke="${PALETTE.affinity}" stroke-width="0.6" opacity="0.75">${woven}</g>`;

  let taut = '';
  for (const { i, j, w } of held) {
    const a = warpPoint(pos[i]), b = warpPoint(pos[j]);
    taut += `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke-width="${f(1 + w * 0.4)}"/>`;
  }
  body += `<g stroke="${PALETTE.affinity}">${taut}</g>`;

  return svgDoc(W, H, body, `A FABRIC THROUGH TIME · STUDY 03 HOLD · ${name.toUpperCase()} · SEED ${seed}`);
}
