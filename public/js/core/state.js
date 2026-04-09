export function createInitialState(overrides = {}) {
  return {
    colorSpace: 'munsell',
    hueStep: 20,
    chromaStep: 7,
    brightness: 0,
    judgeEnabled: true,
    baseColor: null,
    baseColorId: null,
    baseHueAngle: null,
    baseChromaIndex: null,
    baseColorBrightness: null,
    selectedColors: [],
    backgroundColor: '#ffffff',
    printVisible: false,
    ...overrides,
  };
}

export function updateSetting(state, key, value) {
  return {
    ...state,
    [key]: value,
  };
}

export function setBrightness(state, brightness) {
  return {
    ...state,
    brightness,
  };
}

export function setBaseColor(state, payload) {
  return {
    ...state,
    baseColor: payload.color,
    baseColorId: payload.chipId,
    baseHueAngle: payload.hueAngle,
    baseChromaIndex: payload.chromaIndex,
    baseColorBrightness: payload.brightness,
    selectedColors: [],
    printVisible: false,
  };
}

export function addSelectedColor(state, color) {
  return {
    ...state,
    selectedColors: [...state.selectedColors, color],
  };
}

export function removeSelectedColor(state, index) {
  return {
    ...state,
    selectedColors: state.selectedColors.filter((_, currentIndex) => currentIndex !== index),
  };
}

export function removeLastSelectedColor(state) {
  if (state.selectedColors.length === 0) {
    return state;
  }

  return {
    ...state,
    selectedColors: state.selectedColors.slice(0, -1),
  };
}

export function clearSelection(state) {
  return {
    ...state,
    baseColor: null,
    baseColorId: null,
    baseHueAngle: null,
    baseChromaIndex: null,
    baseColorBrightness: null,
    selectedColors: [],
    printVisible: false,
  };
}

export function setBackgroundColor(state, backgroundColor) {
  return {
    ...state,
    backgroundColor,
  };
}

export function setPrintVisible(state, printVisible) {
  return {
    ...state,
    printVisible,
  };
}
