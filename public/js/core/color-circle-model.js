import { hsbToWeb, rgbToWeb, webToHsb, webToRgb } from './color-math.js';
import { FIXED_COLORS } from '../resources/fixed-color-resources.js';

const LAYOUT = {
  radius: 300,
  chipSize: 30,
  top: 300,
  left: 700,
  clashClass: 'color-clash',
};

const staticCircleCache = new Map();
const darkestBrightnessHsb = webToHsb(FIXED_COLORS.brightness.at(-1));
const CHROMA_MIN_SATURATION_RATIO = 0.12;
const CHROMA_BRIGHTNESS_HEADROOM = 8;

function normalizeHueIndex(index, hueStep) {
  return ((index % hueStep) + hueStep) % hueStep;
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
  const start = webToHsb(startColor);
  const end = webToHsb(endColor);
  const max = {
    h: Math.max(start.h, end.h),
    s: Math.max(start.s, end.s),
    b: Math.max(start.b, end.b),
  };
  const min = {
    h: Math.min(start.h, end.h),
    s: Math.min(start.s, end.s),
    b: Math.min(start.b, end.b),
  };
  const range = { h: 0, s: 0, b: 0 };
  const hsb = { h: 0, s: 0, b: 0 };

  if (max.h - min.h > 180) {
    const wrappedHue = 360 - max.h;
    range.h = (wrappedHue + min.h) * blend;
    if (max.h === start.h) {
      hsb.h = start.h + range.h;
      if (hsb.h >= 360) {
        hsb.h -= 360;
      }
    }
  } else {
    range.h = (max.h - min.h) * blend;
    if (max.h === start.h) {
      hsb.h = start.h - range.h;
    }
  }

  if (max.h === end.h) {
    hsb.h = start.h + range.h;
  }

  range.s = (max.s - min.s) * blend;
  hsb.s = max.s === start.s ? start.s - range.s : start.s + range.s;

  range.b = (max.b - min.b) * blend;
  hsb.b = max.b === start.b ? start.b - range.b : start.b + range.b;

  return hsbToWeb(hsb);
}

function applyFlatBrightness(webColor, state) {
  const hsb = webToHsb(webColor);
  const range = (hsb.b - darkestBrightnessHsb.b) / FIXED_COLORS.brightness.length;
  hsb.b -= range * state.brightness;
  return hsbToWeb(hsb);
}

function applyChroma(webColor, count, state) {
  const hsb = webToHsb(webColor);
  const originalSaturation = hsb.s;
  const range = hsb.s / (state.chromaStep - 1);
  const chromaProgress = (count.chroma - 1) / (state.chromaStep - 1);
  const minimumSaturation = Math.round(originalSaturation * CHROMA_MIN_SATURATION_RATIO * chromaProgress);
  hsb.s = Math.max(minimumSaturation, hsb.s - range * (count.chroma - 1));
  return hsbToWeb(hsb);
}

function applyBrightness(webColor, count, state) {
  const hsb = webToHsb(webColor);
  const endColor = webToHsb(FIXED_COLORS.brightness[state.brightness]);
  const max = Math.max(hsb.b, endColor.b);
  const min = Math.min(hsb.b, endColor.b);
  const range = (max - min) / (state.chromaStep - 1);
  const offset = range * (count.chroma - 1);

  if (max === hsb.b) {
    hsb.b -= offset;
  } else {
    hsb.b += offset;
  }

  const chromaProgress = (count.chroma - 1) / (state.chromaStep - 1);
  const maxBrightness = 255 - Math.round(CHROMA_BRIGHTNESS_HEADROOM * chromaProgress);
  hsb.b = Math.min(hsb.b, maxBrightness);

  return hsbToWeb(hsb);
}

function getWebColor(hueIndex, state, fixedColors, hueCount) {
  const { startIndex, endIndex, blend } = getHueInterpolation(hueIndex, hueCount, fixedColors.length);
  let webColor = blend === 0 ? fixedColors[startIndex] : getBetweenColor(fixedColors[startIndex], fixedColors[endIndex], blend);

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
    kind: 'hsb',
    base: webToHsb(state.baseColor),
    brightnessStep,
    justNoticeableBrightnessDiff: brightnessStep / 255,
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
  let S;
  let B;

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
    S = maxS - minS;
    B = maxB - minB;
  } else {
    const base = analysis.base;
    const target = webToHsb(targetStatus.web);
    const maxH = Math.max(base.h, target.h);
    const minH = Math.min(base.h, target.h);
    const maxS = Math.max(base.s, target.s);
    const minS = Math.min(base.s, target.s);
    const maxB = Math.max(base.b, target.b);
    const minB = Math.min(base.b, target.b);

    H = maxH - minH > 180 ? 360 - maxH + minH : maxH - minH;
    S = (state.chromaStep * (maxS - minS)) / 255;
    B = (analysis.brightnessStep * (maxB - minB)) / 255;
  }

  if ((H > 1 && H <= 25) || (H > 43 && H <= 100)) {
    return false;
  }

  if ((S > 1 && S <= 3) || (S > 5 && S <= 7)) {
    return false;
  }

  if ((B > analysis.justNoticeableBrightnessDiff && B <= 0.5) || (B > 1.5 && B <= 2.5)) {
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
