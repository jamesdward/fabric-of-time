// Shared pieces for the studies: palette, seeded randomness, the four readings
// of the relationship structure, and small SVG helpers. No dependencies.

export const PALETTE = {
  ground: '#ece5d6',
  warp: '#1d2745',
  // Interpretive affinities get a colour no dye in the town's past could make,
  // so they never pass for documented structure.
  affinity: '#ff4a1c',
  strand: {
    river: '#5f8591',
    settlement: '#b89a5e',
    textiles: '#8f3b2c',
    rubber: '#161616',
    people: '#d2a531',
  },
};

export const READINGS = ['models', 'keywords', 'shuffled', 'none'];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(list, rand) {
  const a = list.slice();
  for (let k = a.length - 1; k > 0; k--) {
    const m = Math.floor(rand() * (k + 1));
    [a[k], a[m]] = [a[m], a[k]];
  }
  return a;
}

// Experiment 01's century rule: a link only counts between records at least
// 100 years apart that come from different web pages.
function crossPairs(records) {
  const out = [];
  for (let i = 0; i < records.length; i++)
    for (let j = i + 1; j < records.length; j++)
      if (Math.abs(records[i].year - records[j].year) >= 100 && records[i].source_url !== records[j].source_url)
        out.push([i, j]);
  return out;
}

// Links as [{i, j, w}] with w in (0, 5]. Every reading hands out the same
// multiset of strengths, so only where the links fall differs.
//   models    the two blind judges' strengths, averaged
//   keywords  the same strengths given to the top TF-IDF pairs, by rank
//   shuffled  the same strengths given to random eligible pairs
//   none      no links
export function reading(data, name, seed = 7) {
  const model = data.pairs
    .filter((p) => p.kw !== null && p.a + p.b > 0)
    .map((p) => ({ i: p.i, j: p.j, w: (p.a + p.b) / 2 }))
    .sort((p, q) => q.w - p.w);
  if (name === 'models') return model;
  if (name === 'none') return [];
  const strengths = model.map((p) => p.w);
  if (name === 'keywords') {
    return data.pairs
      .filter((p) => p.kw !== null && p.kw <= strengths.length)
      .sort((p, q) => p.kw - q.kw)
      .map((p, k) => ({ i: p.i, j: p.j, w: strengths[k] }));
  }
  if (name === 'shuffled') {
    const rand = mulberry32(seed * 7919 + 1);
    const picked = shuffle(crossPairs(data.records), rand).slice(0, strengths.length);
    const ws = shuffle(strengths, rand);
    return picked.map(([i, j], k) => ({ i, j, w: ws[k] }));
  }
  throw new Error(`unknown reading: ${name}`);
}

// Record indices, oldest first. Ties keep corpus order.
export function byTime(records) {
  return records.map((_, i) => i).sort((a, b) => records[a].year - records[b].year || a - b);
}

export const f = (n) => (Math.round(n * 10) / 10).toString();

export function polyline(points, attrs = '') {
  let d = '';
  for (let k = 0; k < points.length; k++) d += (k ? 'L' : 'M') + f(points[k][0]) + ' ' + f(points[k][1]);
  return `<path d="${d}" ${attrs}/>`;
}

export function svgDoc(width, height, body, colophon) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="${PALETTE.ground}"/>` +
    `<g fill="none" stroke-linecap="round" stroke-linejoin="round">${body}</g>` +
    `<text x="${width / 2}" y="${height - 44}" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" ` +
    `font-size="13" letter-spacing="1.5" fill="${PALETTE.warp}" opacity="0.6">${colophon}</text>` +
    `</svg>`
  );
}
