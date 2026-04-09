import test from 'node:test';
import assert from 'node:assert/strict';

import { createCircleModel, judgeColor } from '../public/js/core/color-circle-model.js';
import { createInitialState } from '../public/js/core/state.js';

test('createCircleModel builds hueStep * chromaStep chips', () => {
  const state = createInitialState({ hueStep: 10, chromaStep: 3 });
  const model = createCircleModel(state);
  assert.equal(model.chips.length, 30);
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
