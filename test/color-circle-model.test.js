import test from 'node:test';
import assert from 'node:assert/strict';

import { createCircleModel, getBaseSelection, getHueInterpolation, judgeColor } from '../public/js/core/color-circle-model.js';
import { hsbToWeb, oklchToWeb, webToHsb, webToOklch } from '../public/js/core/color-math.js';
import { FIXED_COLORS } from '../public/js/resources/fixed-color-resources.js';
import { createInitialState } from '../public/js/core/state.js';

test('createCircleModel builds hueStep * chromaStep chips', () => {
  const state = createInitialState({ hueStep: 10, chromaStep: 3 });
  const model = createCircleModel(state);
  assert.equal(model.chips.length, 30);
  assert.equal(model.brightnessChips.length, 10);
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

test('rgb interpolates fixed anchors in HSB space for in-between hues', () => {
  const state = createInitialState({ colorSpace: 'rgb', hueStep: 40, chromaStep: 3 });
  const model = createCircleModel(state);
  const interpolated = model.colorStatuses[1].web.toLowerCase();
  const start = webToHsb(FIXED_COLORS.rgb[0]);
  const end = webToHsb(FIXED_COLORS.rgb[1]);
  const hueDiff = ((end.h - start.h + 540) % 360) - 180;
  const expected = hsbToWeb({
    h: (start.h + hueDiff * 0.5 + 360) % 360,
    s: start.s + (end.s - start.s) * 0.5,
    b: start.b + (end.b - start.b) * 0.5,
  }).toLowerCase();
  const oklchInterpolated = oklchToWeb({
    l: (webToOklch(FIXED_COLORS.rgb[0]).l + webToOklch(FIXED_COLORS.rgb[1]).l) / 2,
    c: (webToOklch(FIXED_COLORS.rgb[0]).c + webToOklch(FIXED_COLORS.rgb[1]).c) / 2,
    h: (start.h + hueDiff * 0.5 + 360) % 360,
  }).toLowerCase();

  assert.equal(interpolated, expected);
  assert.notEqual(interpolated, oklchInterpolated);
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

test('judgeColor uses step-based hue, chroma, and brightness ranges for rgb mode', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 0,
    baseColor: '#ff0000',
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: true,
  });
  const baseAnalysis = {
    kind: 'step',
    base: { stepHue: 1, stepChroma: 1, stepBrightness: 0 },
    brightnessStep: 10,
    justNoticeableBrightnessDiff: 0.1,
  };
  const colorStatuses = [
    { id: 0, web: '#ff0000', oklch: { h: 0, c: 0.15, l: 0.5 }, stepNum: { hue: 1, chroma: 1, brightness: 0 } },
    { id: 1, web: '#ff3300', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 2, chroma: 1, brightness: 0 } },
    { id: 2, web: '#ff0000', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 1, chroma: 2, brightness: 0 } },
    { id: 3, web: '#ff6666', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 1, chroma: 1, brightness: 2 } },
    { id: 4, web: '#00ffff', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 10, chroma: 7, brightness: 0 } },
  ];

  assert.equal(judgeColor(colorStatuses, state, 1, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 2, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 3, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 4, baseAnalysis), true);
});

test('rgb keeps all chips visible when judgeEnabled is false', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 3,
    baseColor: FIXED_COLORS.rgb[3],
    baseHueAngle: (360 / 20) * 3,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: false,
  });
  const model = createCircleModel(state);

  assert.equal(model.chips.every((chip) => chip.isClashing === false), true);
  assert.equal(model.brightnessChips.every((chip) => chip.isClashing === false), true);
});

test('brightness chips stay visible when no base color is selected', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 7 }));

  assert.equal(model.brightnessChips.every((chip) => chip.isClashing === false), true);
});

test('brightness chips use judge results for each brightness candidate', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    brightness: 2,
    baseColorId: 0,
    baseColor: FIXED_COLORS.rgb[0],
    baseHueAngle: 0,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: true,
  });
  const model = createCircleModel(state);
  const currentChip = model.brightnessChips.find((chip) => chip.isCurrent);

  assert.equal(currentChip?.brightness, 2);
  assert.equal(currentChip?.isClashing, true);
  assert.equal(model.brightnessChips.some((chip) => chip.isClashing), true);
  assert.equal(model.brightnessChips.some((chip) => !chip.isClashing), true);
});

test('rgb judge-visible distribution matches rgb+ under the same step-based selection', () => {
  const sharedSelection = {
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 7,
    baseHueAngle: (360 / 20) * 7,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: true,
  };
  const rgbModel = createCircleModel(
    createInitialState({
      ...sharedSelection,
      colorSpace: 'rgb',
      baseColor: FIXED_COLORS.rgb[7],
    })
  );
  const rgbPlusModel = createCircleModel(
    createInitialState({
      ...sharedSelection,
      colorSpace: 'rgb+',
      baseColor: FIXED_COLORS['rgb+'][7],
    })
  );
  const countVisibleByRing = (model) =>
    Array.from({ length: sharedSelection.chromaStep }, (_, ring) =>
      model.chips.slice(ring * sharedSelection.hueStep, (ring + 1) * sharedSelection.hueStep).filter((chip) => !chip.isClashing)
        .length
    );

  assert.deepEqual(countVisibleByRing(rgbModel), countVisibleByRing(rgbPlusModel));
});
