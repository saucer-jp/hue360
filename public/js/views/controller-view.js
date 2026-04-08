import { qsa } from '../utils/dom.js';

export function renderController(state, root) {
  qsa('select[data-setting]', root).forEach((select) => {
    const key = select.dataset.setting;
    if (key === 'judgeEnabled') {
      select.value = String(state.judgeEnabled);
    } else {
      select.value = String(state[key]);
    }
  });

  qsa('#brightness .chip', root.ownerDocument).forEach((chip) => {
    chip.classList.toggle('current-brightness', Number(chip.dataset.brightness) === state.brightness);
  });
}
