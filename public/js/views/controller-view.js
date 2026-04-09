import { qsa } from '../utils/dom.js';

export function renderController(state, root) {
  qsa('[data-setting]', root).forEach((input) => {
    const key = input.dataset.setting;
    if (key === 'judgeEnabled') {
      input.value = String(state.judgeEnabled);
    } else {
      input.value = String(state[key]);
    }
  });

  qsa('[data-setting-value]', root).forEach((valueNode) => {
    const key = valueNode.dataset.settingValue;
    valueNode.textContent = String(state[key]);
  });

  qsa('#brightness .chip', root.ownerDocument).forEach((chip) => {
    chip.classList.toggle('current-brightness', Number(chip.dataset.brightness) === state.brightness);
  });
}
