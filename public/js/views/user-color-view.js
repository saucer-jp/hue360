import { displayHex } from '../utils/color-format.js';
import { el } from '../utils/dom.js';

function createRemoveButton(action, dataset = {}, label = '') {
  const button = el('span', {
    className: 'remove-btn',
    attrs: { 'data-action': action },
    dataset,
  });

  if (label) {
    button.append(el('em', { text: label }));
  }

  return button;
}

function createTryPaintingUrl(state) {
  if (!state.baseColor) {
    return 'http://prog4designer.github.com/paint-hands-on/';
  }

  const colors = [state.baseColor, ...state.selectedColors]
    .map((color) => color.slice(1))
    .join(',');

  return `http://prog4designer.github.com/paint-hands-on/#ec=${colors}`;
}

function createColorCodeItem(label, value) {
  const item = el('li');
  item.append(el('span', { className: 'chip', styles: { backgroundColor: value } }));
  item.append(el('span', { className: 'key', text: `${label}: ` }));
  item.append(el('span', { className: 'val', text: displayHex(value) }));
  return item;
}

export function renderUserColorPanels(userColorRoot, printRoot, state) {
  userColorRoot.replaceChildren();

  if (state.baseColor) {
    const baseColor = el('span', {
      className: 'selected-color base-color',
      styles: { backgroundColor: state.baseColor },
    });

    baseColor.append(
      el('span', {
        className: 'print-user-color',
        text: 'Print User Color',
        attrs: { 'data-action': 'print' },
      }),
    );

    const tryPainting = el('span', { className: 'try-painting' });
    tryPainting.append(
      el('a', {
        text: 'Try Painting',
        attrs: {
          href: createTryPaintingUrl(state),
          target: 'new',
          rel: 'noreferrer',
        },
      }),
    );
    baseColor.append(tryPainting);
    baseColor.append(createRemoveButton('clear-all', {}, 'All Clear'));
    userColorRoot.append(baseColor);
  }

  state.selectedColors.forEach((color, index) => {
    userColorRoot.append(
      el('span', {
        className: 'selected-color sub-color',
        dataset: { index },
        styles: { backgroundColor: color },
      }),
    );

    userColorRoot.lastElementChild.append(createRemoveButton('remove-sub-color', { index }));
  });

  printRoot.replaceChildren();
  if (!state.printVisible || !state.baseColor) {
    return;
  }

  const list = el('ul');
  list.append(createColorCodeItem('bgColor', state.backgroundColor));
  list.append(createColorCodeItem('baseColor', state.baseColor));
  state.selectedColors.forEach((color) => {
    list.append(createColorCodeItem('subColor', color));
  });

  printRoot.append(list);
  printRoot.append(createRemoveButton('clear-print'));
}
