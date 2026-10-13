// Renders every study under every reading to studies/out/ as SVG, plus a
// four-up comparison sheet per study.
//
//   node studies/render.mjs                 all studies, seed 7
//   node studies/render.mjs 02-meander 11   one study, another seed
//   node studies/render.mjs --png           also write PNGs (needs Google Chrome)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { READINGS, PALETTE } from './lib/core.mjs';
import * as gather from './01-gather/sketch.mjs';
import * as meander from './02-meander/sketch.mjs';
import * as hold from './03-hold/sketch.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, 'out');
const data = JSON.parse(readFileSync(join(here, '../experiments/01-kingston-test/outputs/data.json'), 'utf8'));

const args = process.argv.slice(2);
const png = args.includes('--png');
const [only, seedArg] = args.filter((a) => !a.startsWith('--'));
const seed = Number(seedArg ?? 7);
const chrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function toPng(svgPath, width, height) {
  if (!png) return;
  if (!existsSync(chrome)) throw new Error('--png needs Google Chrome at ' + chrome);
  execFileSync(chrome, ['--headless=new', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--window-size=${width},${height}`, `--screenshot=${svgPath.replace(/\.svg$/, '.png')}`, 'file://' + svgPath],
    { stdio: 'ignore' });
}

mkdirSync(out, { recursive: true });
for (const study of [gather, meander, hold]) {
  const { id, width, height } = study.meta;
  if (only && only !== id) continue;
  const inner = [];
  for (const name of READINGS) {
    const svg = study.render(data, { reading: name, seed });
    const path = join(out, `${id}--${name}--seed${seed}.svg`);
    writeFileSync(path, svg);
    toPng(path, width, height);
    inner.push(svg);
    console.log(path);
  }
  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width * 4} ${height}" width="${width * 2}" height="${height / 2}">` +
    `<rect width="100%" height="100%" fill="${PALETTE.ground}"/>` +
    inner.map((s, k) => s.replace('<svg ', `<svg x="${k * width}" y="0" `)).join('') +
    `</svg>`;
  const sheetPath = join(out, `${id}--compare--seed${seed}.svg`);
  writeFileSync(sheetPath, sheet);
  toPng(sheetPath, width * 2, height / 2);
  console.log(sheetPath);
}
