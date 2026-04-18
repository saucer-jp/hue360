import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { generateMunsellHexes } from '../public/js/core/munsell-renotation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.resolve(__dirname, 'data/munsell-renotation-real.dat');
const targetPath = path.resolve(__dirname, '../public/js/resources/fixed-color-resources.js');

const renotationText = await readFile(dataPath, 'utf8');
const generated = generateMunsellHexes(renotationText);
const resourceText = await readFile(targetPath, 'utf8');

const generatedLines = generated.map(({ notation, hex }) => `    '${hex}', // ${notation}`).join('\n');
const nextResourceText = resourceText.replace(
  /munsell: Object\.freeze\(\[\n[\s\S]*?\n  \]\),/,
  `munsell: Object.freeze([\n${generatedLines}\n  ]),`
);

if (nextResourceText === resourceText) {
  throw new Error('Failed to update munsell fixed colors block.');
}

await writeFile(targetPath, nextResourceText);
console.log(`Updated ${generated.length} munsell fixed colors from ${path.basename(dataPath)}.`);
