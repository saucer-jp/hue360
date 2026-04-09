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
  appState = updateSetting(appState, setting, normalizedValue);
  renderControllerSection();
  renderCircleSection();
}

nodes.controller.addEventListener('change', (event) => {
  const select = event.target.closest('select[data-setting]');
  if (!select) {
    return;
  }

  applyControllerValue(select.dataset.setting, select.value);
});

delegate(nodes.brightness, 'click', '.chip', (_, chip) => {
  appState = setBrightness(appState, Number(chip.dataset.brightness));
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
    appState = setBaseColor(appState, {
      color: chipColor,
      chipId: Number(chip.dataset.chipId),
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
