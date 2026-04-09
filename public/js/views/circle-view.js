import { el } from '../utils/dom.js';

function createCircleNode(circleModel) {
  return el('div', {
    className: 'circle',
    attrs: { 'data-color-space': circleModel.colorSpace },
    styles: {
      position: 'absolute',
      top: `${circleModel.layout.top}px`,
      left: `${circleModel.layout.left}px`,
    },
  });
}

function createChipNode(chip, clashClass) {
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

  node.classList.toggle('current-base-color', chip.isBaseColor);
  node.classList.toggle(clashClass, chip.isClashing);

  return node;
}

function updateChipNode(node, chip, clashClass) {
  node.dataset.chipId = String(chip.id);
  node.dataset.chipColor = chip.color;
  node.style.width = `${chip.size}px`;
  node.style.height = `${chip.size}px`;
  node.style.backgroundColor = chip.color;
  node.style.transform = `rotate(${chip.deg}deg) translate(0, ${chip.radius}px) scale(${chip.scale})`;
  node.classList.toggle('current-base-color', chip.isBaseColor);
  node.classList.toggle(clashClass, chip.isClashing);
}

export function createCircleRenderer(root) {
  let circle = null;
  let chipNodes = [];
  let lastStructureKey = null;

  return function renderCircle(circleModel) {
    const structureKey = circleModel.staticKey;

    if (!circle || structureKey !== lastStructureKey) {
      circle?.remove();
      circle = createCircleNode(circleModel);
      chipNodes = [];

      const fragment = document.createDocumentFragment();
      circleModel.chips.forEach((chip) => {
        const node = createChipNode(chip, circleModel.layout.clashClass);
        chipNodes.push(node);
        fragment.append(node);
      });

      circle.append(fragment);
      root.append(circle);
      lastStructureKey = structureKey;
      return;
    }

    circle.dataset.colorSpace = circleModel.colorSpace;

    circleModel.chips.forEach((chip, index) => {
      updateChipNode(chipNodes[index], chip, circleModel.layout.clashClass);
    });
  };
}
