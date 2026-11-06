import test from 'node:test';
import assert from 'node:assert/strict';

import { getSharedChroma, hsbToWeb, isSrgbInGamut, oklchToSrgb, oklchToWeb, rgbToWeb, webToHsb, webToOklch, webToRgb } from '../public/js/core/color-math.js';

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

test('webToOklch and oklchToWeb round-trip primary colors', () => {
  assert.equal(oklchToWeb(webToOklch('#ff0000')), '#ff0000');
  assert.equal(oklchToWeb(webToOklch('#00ff00')), '#00ff00');
  assert.equal(oklchToWeb(webToOklch('#0000ff')), '#0000ff');
});

test('oklchToWeb gamut maps high chroma colors into valid hex', () => {
  const web = oklchToWeb({ l: 0.7, c: 0.5, h: 20 });
  assert.match(web, /^#[0-9a-f]{6}$/);
});

test('gamut checks use unclipped RGB and reject non-finite channels', () => {
  assert.equal(isSrgbInGamut(oklchToSrgb({ l: 0.7, c: 0.5, h: 20 })), false);
  assert.equal(isSrgbInGamut({ r: 0.5, g: 0.5, b: 0.5 }), true);
  assert.equal(isSrgbInGamut({ r: NaN, g: 0, b: 0 }), false);
  assert.equal(isSrgbInGamut({ r: 0, g: 0, b: 0 }, 0.0001), false);
});

test('shared chroma retains in-gamut requests and reaches the limiting hue', () => {
  const hues = Array.from({ length: 24 }, (_, index) => index * 15);
  assert.equal(getSharedChroma(0.6, 0.02, hues), 0.02);
  const chroma = getSharedChroma(0.6, 0.4, hues);
  assert.ok(chroma > 0.09 && chroma < 0.2);
  assert.ok(hues.every((h) => isSrgbInGamut(oklchToSrgb({ l: 0.6, c: chroma, h }), 0.0001)));
  assert.ok(hues.some((h) => !isSrgbInGamut(oklchToSrgb({ l: 0.6, c: chroma + 0.0001, h }))));
  assert.ok(getSharedChroma(0.6, 0.4, [0, 180]) > chroma);
});

test('shared chroma handles achromatic endpoints and empty hue sets', () => {
  assert.equal(getSharedChroma(0, 0.4, [0, 120, 240]), 0);
  assert.equal(getSharedChroma(1, 0.4, [0, 120, 240]), 0);
  assert.equal(getSharedChroma(0.6, 0, [0, 120, 240]), 0);
  assert.equal(getSharedChroma(0.6, 0.4, []), 0);
});
