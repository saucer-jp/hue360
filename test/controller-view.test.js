import test from 'node:test';
import assert from 'node:assert/strict';

import { renderController } from '../public/js/views/controller-view.js';
import { createInitialState } from '../public/js/core/state.js';

function createClassList() {
  const values = new Set();

  return {
    contains(token) {
      return values.has(token);
    },
    toggle(token, force) {
      if (force) {
        values.add(token);
        return true;
      }

      values.delete(token);
      return false;
    },
  };
}

function createBrightnessNode(brightness) {
  return {
    dataset: { brightness: String(brightness) },
    classList: createClassList(),
  };
}

test('renderController applies current and clash classes to brightness chips', () => {
  const brightnessNodes = Array.from({ length: 4 }, (_, brightness) => createBrightnessNode(brightness));
  const inputs = [{ dataset: { setting: 'judgeEnabled' }, value: 'false' }];
  const settingValues = [{ dataset: { settingValue: 'brightness' }, textContent: '' }];
  const ownerDocument = {
    querySelectorAll(selector) {
      if (selector === '#brightness .chip') {
        return brightnessNodes;
      }

      return [];
    },
  };
  const root = {
    ownerDocument,
    querySelectorAll(selector) {
      if (selector === '[data-setting]') {
        return inputs;
      }

      if (selector === '[data-setting-value]') {
        return settingValues;
      }

      return [];
    },
  };
  const state = createInitialState({ brightness: 2, judgeEnabled: true });
  const brightnessChips = [
    { brightness: 0, isCurrent: false, isClashing: false },
    { brightness: 1, isCurrent: false, isClashing: true },
    { brightness: 2, isCurrent: true, isClashing: false },
    { brightness: 3, isCurrent: false, isClashing: false },
  ];

  renderController(state, brightnessChips, root);

  assert.equal(inputs[0].value, 'true');
  assert.equal(settingValues[0].textContent, '2');
  assert.equal(brightnessNodes[0].classList.contains('current-brightness'), false);
  assert.equal(brightnessNodes[1].classList.contains('brightness-clash'), true);
  assert.equal(brightnessNodes[2].classList.contains('current-brightness'), true);
  assert.equal(brightnessNodes[2].classList.contains('brightness-clash'), false);
});
