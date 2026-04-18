import test from 'node:test';
import assert from 'node:assert/strict';

import { createCircleModel, getBaseSelection, getHueInterpolation, judgeColor } from '../public/js/core/color-circle-model.js';
import { FIXED_COLORS } from '../public/js/resources/fixed-color-resources.js';
import { createInitialState } from '../public/js/core/state.js';

test('createCircleModel builds hueStep * chromaStep chips', () => {
  const state = createInitialState({ hueStep: 10, chromaStep: 3 });
  const model = createCircleModel(state);
  assert.equal(model.chips.length, 30);
});

test('fixed color resources expose expected color spaces and step counts', () => {
  assert.deepEqual(Object.keys(FIXED_COLORS), ['munsell', 'rgb', 'rgb+', 'brightness']);
  assert.equal(FIXED_COLORS.munsell.length, 20);
  assert.equal(FIXED_COLORS.rgb.length, 20);
  assert.equal(FIXED_COLORS['rgb+'].length, 20);
  assert.equal(FIXED_COLORS.brightness.length, 10);
});

test('munsell uses the 20 fixed anchors directly when hueStep is 20', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'munsell', hueStep: 20, chromaStep: 3 }));
  const firstRing = model.colorStatuses.slice(0, 20).map((chip) => chip.web.toLowerCase());

  assert.deepEqual(firstRing, FIXED_COLORS.munsell.map((color) => color.toLowerCase()));
});

test('rgb uses the 20 fixed anchors directly when hueStep is 20', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 3 }));
  const firstRing = model.colorStatuses.slice(0, 20).map((chip) => chip.web.toLowerCase());

  assert.deepEqual(firstRing, FIXED_COLORS.rgb.map((color) => color.toLowerCase()));
});

test('rgb+ uses the 20 fixed anchors directly when hueStep is 20', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'rgb+', hueStep: 20, chromaStep: 3 }));
  const firstRing = model.colorStatuses.slice(0, 20).map((chip) => chip.web.toLowerCase());

  assert.deepEqual(firstRing, FIXED_COLORS['rgb+'].map((color) => color.toLowerCase()));
});

test('judgeColor returns a boolean for representative base/target chips', () => {
  const state = createInitialState({
    colorSpace: 'munsell',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 0,
    baseColor: '#c7243a',
    baseColorBrightness: 0,
  });
  const model = createCircleModel(state);
  assert.equal(typeof judgeColor(model.colorStatuses, state, 5), 'boolean');
  assert.equal(typeof judgeColor(model.colorStatuses, state, 40), 'boolean');
});

test('createCircleModel reuses static data for identical structural inputs', () => {
  const first = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 7, brightness: 2 }));
  const second = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 7, brightness: 2 }));

  assert.equal(first.staticKey, second.staticKey);
  assert.equal(first.colorStatuses, second.colorStatuses);
});

test('createCircleModel supports non-decimal hue steps', () => {
  const state = createInitialState({ colorSpace: 'rgb', hueStep: 17, chromaStep: 4 });
  const model = createCircleModel(state);

  assert.equal(model.chips.length, 68);
  assert.ok(model.chips.every((chip) => /^#[0-9a-f]{6}$/i.test(chip.color)));
});

test('createCircleModel supports full chroma range', () => {
  const low = createCircleModel(createInitialState({ hueStep: 17, chromaStep: 3 }));
  const high = createCircleModel(createInitialState({ hueStep: 17, chromaStep: 10 }));

  assert.equal(low.chips.length, 51);
  assert.equal(high.chips.length, 170);
});

test('getHueInterpolation keeps blend within a single segment across full rotations', () => {
  const samples = [0, 1, 8, 16, 19, 20, 21, 40, 99];

  for (const hueIndex of samples) {
    const { startIndex, endIndex, blend } = getHueInterpolation(hueIndex, 20, 10);
    assert.ok(startIndex >= 0 && startIndex < 10);
    assert.ok(endIndex >= 0 && endIndex < 10);
    assert.ok(blend >= 0 && blend < 1, `blend out of range for hueIndex=${hueIndex}: ${blend}`);
  }
});

test('same spoke keeps a stable hue family across chroma rings', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'munsell', hueStep: 20, chromaStep: 7 }));
  const spokeIndex = 0;
  const spokeHues = Array.from({ length: 7 }, (_, ring) => model.colorStatuses[ring * 20 + spokeIndex].oklch.h);
  const circularDiffs = spokeHues.slice(1).map((hue, index) => {
    const prev = spokeHues[index];
    const diff = Math.abs(hue - prev);
    return Math.min(diff, 360 - diff);
  });

  assert.ok(circularDiffs.every((diff) => diff < 20), `spoke hue drift too large: ${spokeHues.join(', ')}`);
});

test('base selection keeps the chosen hue angle stable when hueStep changes', () => {
  const initialState = createInitialState({
    hueStep: 20,
    chromaStep: 7,
    baseColor: '#5d639e',
    baseColorId: 7,
    baseHueAngle: 126,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
  });
  const nextState = {
    ...initialState,
    hueStep: 22,
  };

  const baseSelection = getBaseSelection(nextState);
  const model = createCircleModel(nextState);
  const baseChip = model.chips[baseSelection.selectedChipId];

  assert.equal(baseSelection.selectedChipId, 8);
  assert.ok(Math.abs(baseChip.deg - 126) < 0.000001, `expected anchored angle 126, got ${baseChip.deg}`);
  assert.equal(model.selectedChipId, baseSelection.selectedChipId);
  assert.equal(baseChip.isBaseColor, true);
});

test('palest chroma ring keeps slight color instead of collapsing to pure white', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    const state = createInitialState({
      colorSpace,
      hueStep: 20,
      chromaStep: 7,
      brightness: 0,
    });
    const model = createCircleModel(state);
    const palestRing = model.colorStatuses.slice((state.chromaStep - 1) * state.hueStep);

    assert.ok(
      palestRing.every((chip) => chip.web.toLowerCase() !== '#ffffff'),
      `${colorSpace} palest ring still contains pure white: ${palestRing.map((chip) => chip.web).join(', ')}`
    );
  }
});

test('judgeColor uses OKLCH hue, chroma, and lightness ranges for rgb mode', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 0,
    baseColor: '#ff0000',
    baseChromaIndex: 0,
    judgeEnabled: true,
  });
  const baseAnalysis = {
    kind: 'oklch',
    base: { h: 0, c: 0.15, l: 0.5 },
    brightnessStep: 10,
    justNoticeableLightnessDiff: 10 / 255,
  };
  const colorStatuses = [
    { id: 0, web: '#ff0000', oklch: baseAnalysis.base, stepNum: { hue: 1, chroma: 1, brightness: 0 } },
    { id: 1, web: '#ff3300', oklch: { h: 20, c: 0.15, l: 0.5 }, stepNum: { hue: 2, chroma: 1, brightness: 0 } },
    { id: 2, web: '#ff0000', oklch: { h: 0, c: 0.25, l: 0.5 }, stepNum: { hue: 1, chroma: 2, brightness: 0 } },
    { id: 3, web: '#ff6666', oklch: { h: 0, c: 0.15, l: 0.54 }, stepNum: { hue: 1, chroma: 1, brightness: 0 } },
    { id: 4, web: '#00ffff', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 10, chroma: 4, brightness: 0 } },
  ];

  assert.equal(judgeColor(colorStatuses, state, 1, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 2, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 3, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 4, baseAnalysis), true);
});
