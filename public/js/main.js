import { createCircleModel } from './core/color-circle-model.js';
import {
  addSelectedColor,
  clearSelection,
  createInitialState,
  removeLastSelectedColor,
  removeSelectedColor,
  setBackgroundColor,
  setBaseColor,
  setBrightness,
  setPrintVisible,
  updateSetting,
} from './core/state.js';
import { normalizeCssColor } from './utils/color-format.js';
import { delegate, qs } from './utils/dom.js';
import { getUserInfo } from './utils/user-agent.js';
import { renderController } from './views/controller-view.js';
import { createCircleRenderer } from './views/circle-view.js';
import { renderUserColorPanels } from './views/user-color-view.js';

const nodes = {
  body: document.body,
  controller: qs('#controller'),
  colorCircle: qs('#colorCircle'),
  brightness: qs('#brightness'),
  userColor: qs('#userColor'),
  print: qs('#print'),
};

const userInfo = getUserInfo();
nodes.body.classList.add(...userInfo.info);

let appState = createInitialState({
  backgroundColor: normalizeCssColor(getComputedStyle(nodes.body).backgroundColor),
});

const renderCircle = createCircleRenderer(nodes.colorCircle);

function syncBaseColor(state) {
  if (!state.baseColor) {
    return state;
  }

  const circleModel = createCircleModel(state);
  const selectedChipId = circleModel.selectedChipId;
  const selectedStatus = selectedChipId == null ? null : circleModel.colorStatuses[selectedChipId];
  if (!selectedStatus) {
    return state;
  }

  return {
    ...state,
    baseColorId: selectedChipId,
    baseColor: selectedStatus.web,
    baseChromaIndex: Math.floor(selectedChipId / state.hueStep),
  };
}

function renderBodySection() {
  nodes.body.style.backgroundColor = appState.backgroundColor;
}

function renderControllerSection() {
  renderController(appState, nodes.controller);
}

function renderCircleSection() {
  renderCircle(createCircleModel(appState));
}

function renderUserColorSection() {
  renderUserColorPanels(nodes.userColor, nodes.print, appState);
}

function renderApp() {
  renderBodySection();
  renderControllerSection();
  renderCircleSection();
  renderUserColorSection();
}

function applyControllerValue(setting, value) {
  const normalizedValue =
    setting === 'judgeEnabled' ? value === 'true' : Number.isNaN(Number(value)) ? value : Number(value);
  let nextState = updateSetting(appState, setting, normalizedValue);
  if (setting !== 'judgeEnabled') {
    nextState = syncBaseColor(nextState);
  }

  appState = nextState;
  renderControllerSection();
  renderCircleSection();
}

function handleControllerInput(event) {
  const control = event.target.closest('[data-setting]');
  if (!control) {
    return;
  }

  applyControllerValue(control.dataset.setting, control.value);
}

nodes.controller.addEventListener('change', handleControllerInput);
nodes.controller.addEventListener('input', handleControllerInput);

delegate(nodes.brightness, 'click', '.chip', (event, chip) => {
  if (event.shiftKey) {
    appState = setBackgroundColor(appState, normalizeCssColor(getComputedStyle(chip).backgroundColor));
    renderBodySection();
    if (appState.printVisible) {
      renderUserColorSection();
    }
    return;
  }

  appState = syncBaseColor(setBrightness(appState, Number(chip.dataset.brightness)));
  renderControllerSection();
  renderCircleSection();
});

delegate(nodes.colorCircle, 'click', '.circle .chip', (event, chip) => {
  const chipColor = chip.dataset.chipColor;

  if (event.shiftKey) {
    appState = setBackgroundColor(appState, chipColor);
    renderBodySection();
    if (appState.printVisible) {
      renderUserColorSection();
    }
    return;
  }

  if (!appState.baseColor) {
    const chipId = Number(chip.dataset.chipId);
    appState = setBaseColor(appState, {
      color: chipColor,
      chipId,
      hueAngle: (360 / appState.hueStep) * (chipId % appState.hueStep),
      chromaIndex: Math.floor(chipId / appState.hueStep),
      brightness: appState.brightness,
    });
    renderCircleSection();
    renderUserColorSection();
    return;
  }

  appState = addSelectedColor(appState, chipColor);
  renderUserColorSection();
});

delegate(nodes.userColor, 'click', '[data-action]', (_, actionNode) => {
  switch (actionNode.dataset.action) {
    case 'print':
      appState = setPrintVisible(appState, true);
      renderUserColorSection();
      return;
    case 'clear-all':
      appState = clearSelection(appState);
      renderCircleSection();
      renderUserColorSection();
      return;
    case 'remove-sub-color':
      appState = removeSelectedColor(appState, Number(actionNode.dataset.index));
      renderUserColorSection();
      return;
    default:
      return;
  }
});

delegate(nodes.print, 'click', '[data-action="clear-print"]', () => {
  appState = setPrintVisible(appState, false);
  renderUserColorSection();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Backspace') {
    return;
  }

  if (appState.selectedColors.length === 0) {
    return;
  }

  event.preventDefault();
  appState = removeLastSelectedColor(appState);
  renderUserColorSection();
});

renderApp();
