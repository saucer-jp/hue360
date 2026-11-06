import { getSharedChroma, hsbToWeb, oklchToWeb, rgbToWeb, webToHsb, webToOklch, webToRgb } from './color-math.js';
import { FIXED_COLORS } from '../resources/fixed-color-resources.js';

const LAYOUT = {
  radius: 300,
  chipSize: 30,
  top: 300,
  left: 700,
  clashClass: 'color-clash',
};

const staticCircleCache = new Map();
const CHROMA_MIN_RATIO = 0.12;
// 明部は共通Cと色相別上限の差を90%戻し、暗部は色相間の彩度差を抑える。
const CHROMA_RECOVERY = 0.9;
const DARK_CHROMA_GAIN_RATIO = 0.5;
const DARK_CHROMA_LIGHTNESS = 0.45;
const FULL_CHROMA_LIGHTNESS = 0.65;
const DARKEST_OUTER_LIGHTNESS = 0.36;
const DARKEST_INNER_LIGHTNESS = 0.3;
const LIGHTNESS_HEADROOM = 8 / 255;
const OKLCH_MAX_CHROMA = 0.4;
const LIGHTNESS_SCALE = 10;
// 純色付近だけ明るさの一致を緩める。黄色は明るく、赤・青は少し暗くして色域を活かす。
const PRIMARY_TONE_BOOSTS = [
  { hue: webToOklch('#ff0000').h, radius: 24, lightnessShift: -0.04 },
  { hue: webToOklch('#ffff00').h, radius: 30, lightnessShift: 0.14 },
  { hue: webToOklch('#0000ff').h, radius: 40, lightnessShift: -0.045 },
];
const colorProfiles = Object.fromEntries(['munsell', 'rgb', 'rgb+'].map((colorSpace) => {
  const anchors = FIXED_COLORS[colorSpace].map(webToOklch);
  return [colorSpace, {
    anchors,
    lightness: anchors.reduce((sum, color) => sum + color.l, 0) / anchors.length,
  }];
}));

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

function getBetweenColorByHsb(startColor, endColor, blend) {
  const start = webToHsb(startColor);
  const end = webToHsb(endColor);

  return hsbToWeb({
    h: interpolateHue(start.h, end.h, blend),
    s: start.s + (end.s - start.s) * blend,
    b: start.b + (end.b - start.b) * blend,
  });
}

function smoothWeight(value) {
  const progress = Math.max(0, Math.min(1, value));
  return progress ** 2 * (3 - 2 * progress);
}

function getPrimaryToneBoost(hue, lightness, chroma, brightnessWeight) {
  const primary = PRIMARY_TONE_BOOSTS.find(({ hue: center, radius }) => getCircularHueDiff(hue, center) < radius);
  if (!primary || brightnessWeight === 0) return { l: 0, c: 0 };

  const weight = smoothWeight(1 - getCircularHueDiff(hue, primary.hue) / primary.radius) * brightnessWeight;
  const targetLightness = lightness + primary.lightnessShift * weight;
  const originalLimit = getSharedChroma(lightness, OKLCH_MAX_CHROMA, [hue]);
  let best = { l: lightness, c: originalLimit };
  const consider = (l) => {
    const c = getSharedChroma(l, OKLCH_MAX_CHROMA, [hue]);
    if (c > best.c) best = { l, c };
    return c;
  };
  consider(targetLightness);
  let lower = Math.min(lightness, targetLightness);
  let upper = Math.max(lightness, targetLightness);
  // 色域の頂点を越えて彩度が下がらないよう、許容する明度幅の中だけを探索する。
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const left = lower + (upper - lower) / 3;
    const right = upper - (upper - lower) / 3;
    if (consider(left) < consider(right)) lower = left;
    else upper = right;
  }
  return {
    l: best.l - lightness,
    c: best.c - originalLimit + Math.max(0, originalLimit - chroma) * weight,
  };
}

function enhancePrimaryTones(hues, rings, brightness) {
  // 明度0で最大、4以降は補正なし。低明度の彩度上限と黒に潰れない終点を維持する。
  const brightnessWeight = 1 - smoothWeight(brightness / 4);
  const boosts = hues.map((hue, index) =>
    getPrimaryToneBoost(hue, rings[0].l, rings[0].chromas[index], brightnessWeight),
  );
  let previousChromas;
  return rings.map((tone, ring) => {
    const radialWeight = (1 - ring / (rings.length - 1)) ** 2;
    const lightnesses = boosts.map((boost) => tone.l + boost.l * radialWeight);
    const chromas = boosts.map((boost, index) => getSharedChroma(
      lightnesses[index],
      Math.min(tone.chromas[index] + boost.c * radialWeight, previousChromas?.[index] ?? Infinity),
      [hues[index]],
    ));
    previousChromas = chromas;
    return { ...tone, lightnesses, chromas };
  });
}

export function createCircleTones(state) {
  const fixedColors = FIXED_COLORS[state.colorSpace];
  const profile = colorProfiles[state.colorSpace];
  const hues = Array.from({ length: state.hueStep }, (_, hueIndex) => {
    const { startIndex, endIndex, blend } = getHueInterpolation(hueIndex, state.hueStep, fixedColors.length);
    if (blend === 0) {
      return profile.anchors[startIndex].h;
    }
    if (state.colorSpace === 'rgb') {
      // RGBの色相配列は従来のHSB補間から取り出し、トーンとは分けて扱う。
      return webToOklch(getBetweenColorByHsb(fixedColors[startIndex], fixedColors[endIndex], blend)).h;
    }
    return interpolateHue(profile.anchors[startIndex].h, profile.anchors[endIndex].h, blend);
  });

  const brightnessProgress = state.brightness / (FIXED_COLORS.brightness.length - 1);
  const rings = [];
  let outerChromaLimits;
  let previousChromas;

  for (let ring = 0; ring < state.chromaStep; ring += 1) {
    const progress = ring / (state.chromaStep - 1);
    const brightestLightness = Math.min(
      profile.lightness + (1 - profile.lightness) * progress,
      1 - LIGHTNESS_HEADROOM * progress,
    );
    const darkestLightness = DARKEST_OUTER_LIGHTNESS
      + (DARKEST_INNER_LIGHTNESS - DARKEST_OUTER_LIGHTNESS) * progress;
    // 黒を終点にせず、色を判別できる暗色から最明色までを9等分する。
    const lightness = brightestLightness + (darkestLightness - brightestLightness) * brightnessProgress;
    const l = webToOklch(oklchToWeb({ l: lightness, c: 0, h: 0 })).l;
    if (ring === 0) {
      outerChromaLimits = hues.map((hue) => getSharedChroma(l, OKLCH_MAX_CHROMA, [hue]));
    }
    const chromaRatio = 1 - (1 - CHROMA_MIN_RATIO) * progress;
    const availableChromas = ring === 0 ? outerChromaLimits : hues.map((hue, index) =>
      getSharedChroma(l, outerChromaLimits[index] * chromaRatio, [hue]),
    );
    const c = Math.min(...availableChromas);
    const recoveryProgress = Math.max(0, Math.min(1,
      (l - DARK_CHROMA_LIGHTNESS) / (FULL_CHROMA_LIGHTNESS - DARK_CHROMA_LIGHTNESS),
    ));
    const recoveryWeight = recoveryProgress ** 2 * (3 - 2 * recoveryProgress);
    const chromas = availableChromas.map((available, index) => {
      const gain = (available - c) * CHROMA_RECOVERY;
      // 暗部の上限は共通Cの1.5倍。色相に依存しない制限を明部へ滑らかに解除する。
      const darkGain = Math.min(gain, c * DARK_CHROMA_GAIN_RATIO);
      const recovered = Math.min(
        c + darkGain * (1 - recoveryWeight) + gain * recoveryWeight,
        previousChromas?.[index] ?? Infinity,
      );
      // 青付近ではCの補間点が色域外に出る場合があるため、復元後にも確認する。
      return getSharedChroma(l, recovered, [hues[index]]);
    });
    previousChromas = chromas;
    rings.push({ l, c, chromas });
  }

  return { hues, rings: enhancePrimaryTones(hues, rings, state.brightness) };
}

export function createColorStatuses(state) {
  const { hues, rings } = createCircleTones(state);
  const total = state.hueStep * state.chromaStep;
  const result = [];

  for (let index = 0; index < total; index += 1) {
    const hueIndex = index % state.hueStep;
    const chromaIndex = Math.floor(index / state.hueStep);
    const tone = rings[chromaIndex];
    const web = oklchToWeb({ l: tone.lightnesses[hueIndex], c: tone.chromas[hueIndex], h: hues[hueIndex] });
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

  if (state.colorSpace === 'munsell' || state.colorSpace === 'rgb' || state.colorSpace === 'rgb+') {
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

function judgeTargetStatus(state, targetStatus, baseAnalysis = null) {
  if (!targetStatus) {
    return true;
  }

  const analysis = baseAnalysis;
  if (!state.judgeEnabled || !analysis) {
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

export function judgeColor(colorStatuses, state, id, baseAnalysis = null) {
  const { selectedChipId } = getBaseSelection(state);
  if (selectedChipId == null || !state.judgeEnabled) {
    return true;
  }

  const targetStatus = colorStatuses[id];
  const analysis = baseAnalysis ?? createBaseAnalysis(colorStatuses, state);
  return judgeTargetStatus(state, targetStatus, analysis);
}

function createBrightnessChips(state, selectedChipId, baseAnalysis) {
  if (selectedChipId == null || !state.judgeEnabled || !baseAnalysis) {
    return FIXED_COLORS.brightness.map((color, brightness) => ({
      brightness,
      color,
      isCurrent: brightness === state.brightness,
      isClashing: false,
    }));
  }

  return FIXED_COLORS.brightness.map((color, brightness) => {
    const brightnessState = {
      ...state,
      brightness,
    };
    // 段数による判定では、10候補分の全色生成は不要。
    const targetStatus = baseAnalysis.kind === 'step'
      ? { stepNum: {
        hue: selectedChipId % state.hueStep + 1,
        chroma: Math.floor(selectedChipId / state.hueStep) + 1,
        brightness,
      } }
      : createColorStatuses(brightnessState)[selectedChipId];

    return {
      brightness,
      color,
      isCurrent: brightness === state.brightness,
      isClashing: !judgeTargetStatus(state, targetStatus, baseAnalysis),
    };
  });
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
    brightnessChips: createBrightnessChips(state, selectedChipId, baseAnalysis),
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
