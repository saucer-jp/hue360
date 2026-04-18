import { hsbToWeb, oklchToWeb, rgbToWeb, webToHsb, webToOklch, webToRgb } from './color-math.js';
import { FIXED_COLORS } from '../resources/fixed-color-resources.js';

const LAYOUT = {
  radius: 300,
  chipSize: 30,
  top: 300,
  left: 700,
  clashClass: 'color-clash',
};

const staticCircleCache = new Map();
const brightnessLevels = FIXED_COLORS.brightness.map(webToOklch);
const darkestBrightnessOklch = brightnessLevels.at(-1);
const CHROMA_MIN_RATIO = 0.12;
const LIGHTNESS_HEADROOM = 8 / 255;
const OKLCH_MAX_CHROMA = 0.4;
const LIGHTNESS_SCALE = 10;

function normalizeHueIndex(index, hueStep) {
  return ((index % hueStep) + hueStep) % hueStep;
}

function normalizeHueAngle(hue) {
  return ((hue ?? 0) % 360 + 360) % 360;
}

function getCircularHueDiff(startHue, endHue) {
  const diff = Math.abs(normalizeHueAngle(startHue) - normalizeHueAngle(endHue));
  return Math.min(diff, 360 - diff);
}

function interpolateHue(startHue, endHue, blend) {
  const normalizedStart = normalizeHueAngle(startHue);
  const normalizedEnd = normalizeHueAngle(endHue);
  const diff = ((normalizedEnd - normalizedStart + 540) % 360) - 180;
  return normalizeHueAngle(normalizedStart + diff * blend);
}

export function getBaseSelection(state) {
  if (!state.baseColor && state.baseColorId == null) {
    return {
      selectedChipId: null,
      selectedHueIndex: null,
      selectedChromaIndex: null,
      rotationOffset: 0,
    };
  }

  const selectedChromaIndex = Math.max(0, Math.min(state.baseChromaIndex ?? 0, state.chromaStep - 1));
  if (typeof state.baseHueAngle !== 'number') {
    const fallbackChipId = state.baseColorId ?? null;
    const fallbackHueIndex = fallbackChipId == null ? null : normalizeHueIndex(fallbackChipId, state.hueStep);

    return {
      selectedChipId: fallbackChipId,
      selectedHueIndex: fallbackHueIndex,
      selectedChromaIndex,
      rotationOffset: 0,
    };
  }

  const stepAngle = 360 / state.hueStep;
  const selectedHueIndex = normalizeHueIndex(Math.round(state.baseHueAngle / stepAngle), state.hueStep);
  const rotationOffset = state.baseHueAngle - selectedHueIndex * stepAngle;

  return {
    selectedChipId: selectedChromaIndex * state.hueStep + selectedHueIndex,
    selectedHueIndex,
    selectedChromaIndex,
    rotationOffset,
  };
}

export function getHueInterpolation(hueIndex, hueCount, colorCount) {
  const rawPosition = (hueIndex / hueCount) * colorCount;
  const position = rawPosition % colorCount;
  const startIndex = Math.floor(position);
  const endIndex = (startIndex + 1) % colorCount;
  const blend = position - startIndex;

  return {
    startIndex,
    endIndex,
    blend,
  };
}

function getBetweenColor(startColor, endColor, blend) {
  const start = webToOklch(startColor);
  const end = webToOklch(endColor);

  return oklchToWeb({
    l: start.l + (end.l - start.l) * blend,
    c: start.c + (end.c - start.c) * blend,
    h: interpolateHue(start.h, end.h, blend),
  });
}

function getBetweenColorByHsb(startColor, endColor, blend) {
  const start = webToHsb(startColor);
  const end = webToHsb(endColor);

  return hsbToWeb({
    h: interpolateHue(start.h, end.h, blend),
    s: start.s + (end.s - start.s) * blend,
    b: start.b + (end.b - start.b) * blend,
  });
}

function applyFlatBrightness(webColor, state) {
  const oklch = webToOklch(webColor);
  const range = (oklch.l - darkestBrightnessOklch.l) / FIXED_COLORS.brightness.length;
  oklch.l = Math.max(0, oklch.l - range * state.brightness);
  return oklchToWeb(oklch);
}

function applyChroma(webColor, count, state) {
  const oklch = webToOklch(webColor);
  const originalChroma = oklch.c;
  const range = oklch.c / (state.chromaStep - 1);
  const chromaProgress = (count.chroma - 1) / (state.chromaStep - 1);
  const minimumChroma = originalChroma * CHROMA_MIN_RATIO * chromaProgress;
  oklch.c = Math.max(minimumChroma, oklch.c - range * (count.chroma - 1));
  return oklchToWeb(oklch);
}

function applyBrightness(webColor, count, state) {
  const oklch = webToOklch(webColor);
  const endColor = brightnessLevels[state.brightness];
  const max = Math.max(oklch.l, endColor.l);
  const min = Math.min(oklch.l, endColor.l);
  const range = (max - min) / (state.chromaStep - 1);
  const offset = range * (count.chroma - 1);

  if (max === oklch.l) {
    oklch.l -= offset;
  } else {
    oklch.l += offset;
  }

  const chromaProgress = (count.chroma - 1) / (state.chromaStep - 1);
  const maxLightness = 1 - LIGHTNESS_HEADROOM * chromaProgress;
  oklch.l = Math.min(oklch.l, maxLightness);

  return oklchToWeb(oklch);
}

function getWebColor(hueIndex, state, fixedColors, hueCount) {
  const { startIndex, endIndex, blend } = getHueInterpolation(hueIndex, hueCount, fixedColors.length);
  let webColor;

  if (blend === 0) {
    webColor = fixedColors[startIndex];
  } else if (state.colorSpace === 'rgb') {
    webColor = getBetweenColorByHsb(fixedColors[startIndex], fixedColors[endIndex], blend);
  } else {
    webColor = getBetweenColor(fixedColors[startIndex], fixedColors[endIndex], blend);
  }

  const count = {
    chroma: Math.floor(hueIndex / hueCount) + 1,
  };

  webColor = applyFlatBrightness(webColor, state);
  webColor = applyChroma(webColor, count, state);
  return applyBrightness(webColor, count, state);
}

export function createColorStatuses(state) {
  const fixedColors = FIXED_COLORS[state.colorSpace];
  const total = state.hueStep * state.chromaStep;
  const result = [];

  for (let index = 0; index < total; index += 1) {
    const hueIndex = index % state.hueStep;
    const chromaIndex = Math.floor(index / state.hueStep);
    const web = getWebColor(index, state, fixedColors, state.hueStep);
    result.push({
      id: index,
      web,
      rgb: webToRgb(web),
      hsb: webToHsb(web),
      oklch: webToOklch(web),
      stepNum: {
        hue: hueIndex + 1,
        chroma: chromaIndex + 1,
        brightness: state.brightness,
      },
    });
  }

  return result;
}

export function createChipStatuses(state) {
  const total = state.hueStep * state.chromaStep;
  const result = [];
  let hueCount = 1;
  let chromaCount = 1;

  for (let index = 0; index < total; index += 1) {
    const hueIndex = index % state.hueStep;
    result.push({
      id: index,
      deg: (360 / state.hueStep) * hueIndex,
      radius: LAYOUT.radius - (LAYOUT.radius * 2 - (LAYOUT.chipSize + 2) * (chromaCount - 1)),
      scale: 1,
      chipSize: LAYOUT.chipSize,
    });

    if (hueCount === state.hueStep) {
      hueCount = 1;
      chromaCount += 1;
    } else {
      hueCount += 1;
    }
  }

  return result;
}

function createBaseAnalysis(colorStatuses, state) {
  const brightnessStep = 10;
  const { selectedChipId } = getBaseSelection(state);
  const baseStatus = selectedChipId == null ? null : colorStatuses[selectedChipId];

  if (!baseStatus) {
    return null;
  }

  if (state.colorSpace === 'munsell' || state.colorSpace === 'rgb+') {
    return {
      kind: 'step',
      base: {
        stepHue: baseStatus.stepNum.hue,
        stepChroma: baseStatus.stepNum.chroma,
        stepBrightness: (state.baseColorBrightness * 10) / brightnessStep,
      },
      brightnessStep,
      justNoticeableBrightnessDiff: 0.1,
    };
  }

  return {
    kind: 'oklch',
    base: baseStatus.oklch,
    brightnessStep,
    justNoticeableLightnessDiff: brightnessStep / 255,
  };
}

export function judgeColor(colorStatuses, state, id, baseAnalysis = null) {
  const { selectedChipId } = getBaseSelection(state);
  if (selectedChipId == null || !state.judgeEnabled) {
    return true;
  }

  const targetStatus = colorStatuses[id];
  const analysis = baseAnalysis ?? createBaseAnalysis(colorStatuses, state);

  if (!targetStatus || !analysis) {
    return true;
  }

  let H;
  let C;
  let L;

  if (analysis.kind === 'step') {
    const base = {
      h: analysis.base.stepHue,
      s: analysis.base.stepChroma,
      b: analysis.base.stepBrightness,
    };
    const target = {
      h: targetStatus.stepNum.hue,
      s: targetStatus.stepNum.chroma,
      b: targetStatus.stepNum.brightness,
    };

    const maxH = (Math.max(base.h, target.h) - 1) * (360 / state.hueStep);
    const minH = (Math.min(base.h, target.h) - 1) * (360 / state.hueStep);
    const maxS = (Math.max(base.s, target.s) * 14) / state.chromaStep;
    const minS = (Math.min(base.s, target.s) * 14) / state.chromaStep;
    const maxB = (Math.max(base.b, target.b) * 10) / analysis.brightnessStep;
    const minB = (Math.min(base.b, target.b) * 10) / analysis.brightnessStep;

    H = maxH - minH > 180 ? 360 - maxH + minH : maxH - minH;
    C = maxS - minS;
    L = maxB - minB;
  } else {
    const base = analysis.base;
    const target = targetStatus.oklch;

    H = getCircularHueDiff(base.h, target.h);
    C = (state.chromaStep * Math.abs(base.c - target.c)) / OKLCH_MAX_CHROMA;
    L = LIGHTNESS_SCALE * Math.abs(base.l - target.l);
  }

  if ((H > 1 && H <= 25) || (H > 43 && H <= 100)) {
    return false;
  }

  if ((C > 1 && C <= 3) || (C > 5 && C <= 7)) {
    return false;
  }

  if ((L > analysis.justNoticeableLightnessDiff && L <= 0.5) || (L > 1.5 && L <= 2.5)) {
    return false;
  }

  return true;
}

function createStaticKey(state) {
  return [state.colorSpace, state.hueStep, state.chromaStep, state.brightness].join(':');
}

function getStaticCircleData(state) {
  const cacheKey = createStaticKey(state);
  if (staticCircleCache.has(cacheKey)) {
    return staticCircleCache.get(cacheKey);
  }

  const staticData = {
    colorStatuses: createColorStatuses(state),
    chipStatuses: createChipStatuses(state),
  };

  staticCircleCache.set(cacheKey, staticData);
  return staticData;
}

export function createCircleModel(state) {
  const staticKey = createStaticKey(state);
  const { colorStatuses, chipStatuses } = getStaticCircleData(state);
  const { selectedChipId, rotationOffset } = getBaseSelection(state);
  const baseAnalysis = createBaseAnalysis(colorStatuses, state);

  const chips = colorStatuses.map((colorStatus, index) => {
    const chipStatus = chipStatuses[index];
    const isClashing = !judgeColor(colorStatuses, state, index, baseAnalysis);

    return {
      id: index,
      color: colorStatus.web,
      deg: chipStatus.deg + rotationOffset,
      radius: chipStatus.radius,
      scale: chipStatus.scale,
      size: chipStatus.chipSize,
      isBaseColor: selectedChipId === index,
      isClashing,
    };
  });

  return {
    chips,
    colorStatuses,
    layout: LAYOUT,
    colorSpace: state.colorSpace,
    selectedChipId,
    staticKey,
  };
}

export function rgbCssToHex(rgbText) {
  const channels = rgbText.match(/\d+/g);
  if (!channels) {
    return rgbText.toLowerCase();
  }

  return rgbToWeb({
    r: Number(channels[0]),
    g: Number(channels[1]),
    b: Number(channels[2]),
  });
}
