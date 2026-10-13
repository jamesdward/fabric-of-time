// Study 06: Colour
//
// Study 05, Threads, redrawn in four-colour combinations from Sanzo Wada's
// A Dictionary of Colour Combinations. Nothing about the form changes.
//
// How a combination's four colours are given their jobs (authored):
//   darkest    the page, and the dark edge under each thread
//   lightest   the long days at the middle of the river
//   of the two left, the more vivid one is the models' currents and the other
//   is the records' threads. The five strands are steps from that thread colour
//   towards the lightest, and short days are the darkest lifted a little.
//   Add L to a number (56L) to put it on the lightest colour as the page instead.
//
//   node studies/06-colour/render.mjs                 the default set, as a sheet
//   node studies/06-colour/render.mjs 78 56L 13       these combinations

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const out = join(here, '../out');
const { combinations } = JSON.parse(readFileSync(join(root, 'data/colour/wada-four.json'), 'utf8'));
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const picks = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['78', '5', '31', '85', '13', '49', '91', '103', '63', '56L'];

const rgb = (hex) => [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
const light = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const vivid = (c) => Math.max(...c) - Math.min(...c);

function palette(colours, lightPage) {
  const byLight = colours.map(rgb).sort((a, b) => light(a) - light(b));
  const [dark, pale] = [byLight[0], byLight[3]];
  const [current, thread] = byLight.slice(1, 3).sort((a, b) => vivid(b) - vivid(a));
  return {
    page: hex(lightPage ? pale : dark),
    bed: mix(dark, pale, lightPage ? 0.12 : 0.1),
    night: mix(dark, pale, 0.32),
    noon: lightPage ? mix(pale, dark, 0.06) : pale,
    moon: mix(pale, thread, 0.5),
    strand: {
      river: hex(thread),
      textiles: hex(mix(thread, pale, 0.28)),
      settlement: hex(mix(thread, pale, 0.52)),
      people: hex(mix(thread, pale, 0.8)),
      rubber: hex(mix(thread, dark, 0.4)),
    },
    affinity: hex(current),
    under: hex(dark),
  };
}

const [pw, ph, gap, perRow] = [600, 1574, 30, 5];
mkdirSync(out, { recursive: true });
const panels = [];
for (const pick of picks) {
  const n = parseInt(pick, 10);
  const lightPage = /L$/i.test(pick);
  const combo = combinations.find((c) => c.n === n);
  if (!combo) throw new Error(`no combination ${pick}`);
  const stem = `06-colour--${String(n).padStart(3, '0')}${lightPage ? 'L' : ''}`;
  const file = join(out, `${stem}.palette.json`);
  writeFileSync(file, JSON.stringify(palette(combo.colours, lightPage)));
  execFileSync('node', [join(here, '../05-threads/render.mjs'), 'models', '7', '--png', `--palette=${file}`, `--stem=${stem}`]);
  // shrink with sips first: its filter keeps the dot grain from banding
  execFileSync('sips', ['-Z', String(ph), join(out, `${stem}.png`), '--out', join(out, `${stem}--small.png`)], { stdio: 'ignore' });
  panels.push(`${stem}--small.png`);
  console.log(stem, combo.colours.join(' '));
}

// A sheet of all of them, five to a row. The gaps are neutral grey, not a palette colour.
const rows = Math.ceil(panels.length / perRow);
const cols = Math.min(panels.length, perRow);
const [W, H] = [cols * (pw + gap) + gap, rows * (ph + gap) + gap];
const sheet =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
  `<rect width="100%" height="100%" fill="#8a8a86"/>` +
  panels.map((p, k) => `<image href="${p}" x="${gap + (k % perRow) * (pw + gap)}" y="${gap + Math.floor(k / perRow) * (ph + gap)}" ` +
    `width="${pw}" height="${ph}" preserveAspectRatio="xMidYMid slice"/>`).join('') +
  `</svg>`;
writeFileSync(join(out, '06-colour--sheet.svg'), sheet);
execFileSync(chrome, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`,
  `--screenshot=${join(out, '06-colour--sheet.png')}`, 'file://' + join(out, '06-colour--sheet.svg')], { stdio: 'ignore' });
console.log('sheet', W, 'x', H);
