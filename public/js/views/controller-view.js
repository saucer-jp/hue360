import { qsa } from '../utils/dom.js';

export function renderController(state, brightnessChips, root) {
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
    const brightness = Number(chip.dataset.brightness);
    const brightnessChip = brightnessChips.find((candidate) => candidate.brightness === brightness);
    chip.classList.toggle('current-brightness', brightnessChip?.isCurrent ?? false);
    chip.classList.toggle('brightness-clash', brightnessChip?.isClashing ?? false);
  });
}
