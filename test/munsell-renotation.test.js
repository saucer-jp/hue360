import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  adaptXyzIlluminantCToD65,
  convertNotationToHex,
  generateMunsellHexes,
  MUNSELL_NOTATIONS,
  parseMunsellRenotation,
  srgbToHex,
  xyYToXyz,
  xyzToSrgb,
} from '../public/js/core/munsell-renotation.js';
import { FIXED_COLORS } from '../public/js/resources/fixed-color-resources.js';

const renotationText = readFileSync(new URL('../scripts/data/munsell-renotation-real.dat', import.meta.url), 'utf8');

test('parseMunsellRenotation indexes notation rows from RIT real.dat', () => {
  const lookup = parseMunsellRenotation(renotationText);
  assert.deepEqual(lookup.get('5R 6/14'), {
    hue: '5R',
    value: '6',
    chroma: '14',
    x: 0.502,
    y: 0.3212,
    Y: 0.3005,
  });
});

test('xyY to XYZ and Bradford adaptation keep representative values in range', () => {
  const xyz = xyYToXyz({ x: 0.502, y: 0.3212, Y: 0.3005 });
  const adapted = adaptXyzIlluminantCToD65(xyz);
  const srgb = xyzToSrgb(adapted);

  assert.ok(xyz.X > 0 && xyz.Z > 0);
  assert.ok(adapted.X > 0 && adapted.Z > 0);
  assert.equal(srgbToHex(srgb), '#fa6163');
});

test('generateMunsellHexes reproduces the fixed munsell anchors from renotation data', () => {
  const generated = generateMunsellHexes(renotationText);

  assert.equal(generated.length, MUNSELL_NOTATIONS.length);
  assert.deepEqual(
    generated.map((entry) => entry.notation),
    MUNSELL_NOTATIONS
  );
  assert.deepEqual(
    generated.map((entry) => entry.hex),
    FIXED_COLORS.munsell
  );
});

test('convertNotationToHex converts representative notation values into stable hex colors', () => {
  const lookup = parseMunsellRenotation(renotationText);

  assert.equal(convertNotationToHex('5R 6/14', lookup), '#fa6163');
  assert.equal(convertNotationToHex('5Y 8/14', lookup), '#efc800');
  assert.equal(convertNotationToHex('10BG 5/10', lookup), '#008fa0');
});
