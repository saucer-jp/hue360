import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addSelectedColor,
  clearSelection,
  createInitialState,
  removeLastSelectedColor,
  removeSelectedColor,
  setBackgroundColor,
  setBaseColor,
  setPrintVisible,
  syncBaseColorSelection,
} from '../public/js/core/state.js';

test('setBaseColor resets selection state for a new base color', () => {
  const initial = createInitialState({ selectedColors: ['#111111'], printVisible: true });
  const next = setBaseColor(initial, {
    color: '#abcdef',
    chipId: 4,
    hueAngle: 72,
    chromaIndex: 1,
    brightness: 2,
  });

  assert.equal(next.baseColor, '#abcdef');
  assert.equal(next.baseColorId, 4);
  assert.equal(next.baseHueAngle, 72);
  assert.equal(next.baseChromaIndex, 1);
  assert.equal(next.baseColorBrightness, 2);
  assert.deepEqual(next.selectedColors, []);
  assert.equal(next.printVisible, false);
});

test('selected color updates keep the array compact', () => {
  let state = createInitialState();
  state = addSelectedColor(state, '#111111');
  state = addSelectedColor(state, '#222222');
  state = addSelectedColor(state, '#333333');
  state = removeSelectedColor(state, 1);

  assert.deepEqual(state.selectedColors, ['#111111', '#333333']);

  state = removeLastSelectedColor(state);
  assert.deepEqual(state.selectedColors, ['#111111']);
});

test('clearSelection preserves unrelated state while clearing chosen colors', () => {
  let state = createInitialState({
    baseColor: '#ffffff',
    baseColorId: 1,
    baseHueAngle: 18,
    baseChromaIndex: 0,
    baseColorBrightness: 4,
    selectedColors: ['#111111'],
  });
  state = setBackgroundColor(state, '#123456');
  state = setPrintVisible(state, true);
  state = clearSelection(state);

  assert.equal(state.backgroundColor, '#123456');
  assert.equal(state.baseColor, null);
  assert.equal(state.baseHueAngle, null);
  assert.equal(state.baseChromaIndex, null);
  assert.deepEqual(state.selectedColors, []);
  assert.equal(state.printVisible, false);
});

test('syncBaseColorSelection can preserve the committed base color across brightness changes', () => {
  const initial = createInitialState({
    hueStep: 20,
    baseColor: '#abcdef',
    baseColorId: 4,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    brightness: 3,
  });
  const next = syncBaseColorSelection(
    initial,
    {
      id: 4,
      web: '#778899',
    },
    { preserveCommittedColor: true },
  );

  assert.equal(next.baseColor, '#abcdef');
  assert.equal(next.baseColorId, 4);
  assert.equal(next.baseChromaIndex, 0);
  assert.equal(next.brightness, 3);
});
