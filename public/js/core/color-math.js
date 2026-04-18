import { converter, formatHex, toGamut } from '../lib/culori.min.mjs';

const toOklchColor = converter('oklch');
const toRgbColor = converter('rgb');
const clampToRgb = toGamut('rgb', 'oklch', null);
const RGB_EPSILON = 0.000001;

function normalizeHue(hue) {
  return ((hue ?? 0) % 360 + 360) % 360;
}

export function webToRgb(web) {
  const normalized = web.startsWith('#') ? web.slice(1) : web;

  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

export function rgbToWeb(rgb) {
  const toHex = (value) => Math.round(value).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

export function webToOklch(web) {
  const color = toOklchColor(web);
  if (!color) {
    return { l: 0, c: 0, h: 0 };
  }

  return {
    l: color.l ?? 0,
    c: color.c ?? 0,
    h: normalizeHue(color.h),
  };
}

export function oklchToWeb(oklch) {
  const color = {
    mode: 'oklch',
    l: Math.max(0, Math.min(1, oklch.l ?? 0)),
    c: Math.max(0, oklch.c ?? 0),
    h: normalizeHue(oklch.h),
    alpha: oklch.alpha,
  };
  const rgb = toRgbColor(color);
  const shouldPreserveRgb =
    rgb &&
    rgb.r >= -RGB_EPSILON &&
    rgb.r <= 1 + RGB_EPSILON &&
    rgb.g >= -RGB_EPSILON &&
    rgb.g <= 1 + RGB_EPSILON &&
    rgb.b >= -RGB_EPSILON &&
    rgb.b <= 1 + RGB_EPSILON;
  const output = shouldPreserveRgb ? rgb : clampToRgb(color);

  return formatHex(output).toLowerCase();
}

export function webToHsb(web) {
  const rgb = webToRgb(web);
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  let hue = 0;

  if (max !== min) {
    if (max === rgb.r) {
      hue = Math.round((60 * (rgb.g - rgb.b)) / (max - min));
    } else if (max === rgb.g) {
      hue = Math.round((60 * (rgb.b - rgb.r)) / (max - min) + 120);
    } else {
      hue = Math.round((60 * (rgb.r - rgb.g)) / (max - min) + 240);
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    h: hue,
    s: max === 0 ? 0 : Math.round(((max - min) / max) * 255),
    b: max,
  };
}

export function hsbToWeb(hsb) {
  let { h, s, b } = hsb;

  if (s === 0) {
    return rgbToWeb({ r: b, g: b, b });
  }

  h %= 360;
  s /= 255;

  const index = Math.floor(h / 60) % 6;
  const fraction = h / 60 - index;
  const p = b * (1 - s);
  const q = b * (1 - fraction * s);
  const t = b * (1 - (1 - fraction) * s);

  switch (index) {
    case 0:
      return rgbToWeb({ r: b, g: t, b: p });
    case 1:
      return rgbToWeb({ r: q, g: b, b: p });
    case 2:
      return rgbToWeb({ r: p, g: b, b: t });
    case 3:
      return rgbToWeb({ r: p, g: q, b });
    case 4:
      return rgbToWeb({ r: t, g: p, b });
    default:
      return rgbToWeb({ r: b, g: p, b: q });
  }
}
