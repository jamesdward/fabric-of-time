// Study 01: Gather
//
// A plain cloth, gathered by stitches that run across time.
//
// Mapping (all authored, see studies/README.md):
//   warp        twelve places, a block of threads each, left to right by earliest record
//   height      time, oldest at the top; `timeWarp` blends true dates with plain record order
//   picks       one coloured band per record, across its own place only (documented)
//   stitches    one per link in the chosen reading; each pulls its two ends together,
//               harder the stronger the link, and the cloth around them puckers
//   ground weft evenly spaced filler, carries no data

import { PALETTE, mulberry32, reading, byTime, polyline, svgDoc, f } from '../lib/core.mjs';

export const meta = { id: '01-gather', title: 'Gather', width: 1200, height: 1600 };

const DEFAULTS = {
  threadsPerPlace: 13,
  timeWarp: 0.5, // 0 = evenly spaced by record order, 1 = true dates
  pull: 0.46, // share of the gap a strength-5 stitch closes at each end
  reach: 85, // how far a stitch's pucker spreads through the cloth
  maxPull: 150, // longest distance a stitch may drag the cloth
  wobble: 1.1,
};

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

  const links = reading(data, name, seed);
  const pulls = [];
  for (const { i, j, w } of links) {
    const s = (o.pull * w) / 5;
    for (const [a, b] of [[i, j], [j, i]]) {
      let dx = pos[b][0] - pos[a][0];
      let dy = pos[b][1] - pos[a][1];
      const len = Math.hypot(dx, dy) || 1;
      const reachLen = Math.min(len * s, o.maxPull);
      pulls.push({ x: pos[a][0], y: pos[a][1], dx: (dx / len) * reachLen, dy: (dy / len) * reachLen, s });
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
    // Where several stitches share a patch of cloth they share its slack.
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

  let stitches = '';
  for (const { i, j, w } of links) {
    const a = warpPoint(pos[i]);
    const b = warpPoint(pos[j]);
    stitches += `<path d="M${f(a[0])} ${f(a[1])}L${f(b[0])} ${f(b[1])}" stroke-width="${f(0.5 + w * 0.32)}"/>`;
  }
  body += `<g stroke="${PALETTE.affinity}" opacity="0.92">${stitches}</g>`;

  return svgDoc(W, H, body, `A FABRIC THROUGH TIME · STUDY 01 GATHER · ${name.toUpperCase()} · SEED ${seed}`);
}
