import test from 'node:test';
import assert from 'node:assert/strict';

import { hsbToWeb, rgbToWeb, webToHsb, webToRgb } from '../public/js/core/color-math.js';

test('webToRgb and rgbToWeb round-trip six digit values', () => {
  const rgb = webToRgb('#1a2b3c');
  assert.deepEqual(rgb, { r: 26, g: 43, b: 60 });
  assert.equal(rgbToWeb(rgb), '#1a2b3c');
});

test('webToRgb expands short hex values', () => {
  assert.deepEqual(webToRgb('#abc'), { r: 170, g: 187, b: 204 });
});

test('webToHsb and hsbToWeb round-trip primary colors', () => {
  assert.equal(hsbToWeb(webToHsb('#ff0000')), '#ff0000');
  assert.equal(hsbToWeb(webToHsb('#00ff00')), '#00ff00');
  assert.equal(hsbToWeb(webToHsb('#0000ff')), '#0000ff');
});
