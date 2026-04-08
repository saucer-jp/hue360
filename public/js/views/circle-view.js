import { el } from '../utils/dom.js';

export function renderCircle(root, circleModel) {
  const existing = root.querySelector('.circle');
  if (existing) {
    existing.remove();
  }

  const circle = el('div', {
    className: 'circle',
    attrs: { 'data-color-space': circleModel.colorSpace },
    styles: {
      position: 'absolute',
      top: `${circleModel.layout.top}px`,
      left: `${circleModel.layout.left}px`,
    },
  });

  circleModel.chips.forEach((chip) => {
    const node = el('span', {
      className: 'chip',
      dataset: {
        chipId: chip.id,
        chipColor: chip.color,
      },
      styles: {
        width: `${chip.size}px`,
        height: `${chip.size}px`,
        backgroundColor: chip.color,
        borderRadius: '4px',
        transform: `rotate(${chip.deg}deg) translate(0, ${chip.radius}px) scale(${chip.scale})`,
      },
    });

    if (chip.isBaseColor) {
      node.classList.add('current-base-color');
    }

    if (chip.isClashing) {
      node.classList.add(circleModel.layout.clashClass);
    }

    circle.append(node);
  });

  root.append(circle);
}
