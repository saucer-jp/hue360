import { rgbCssToHex } from '../core/color-circle-model.js';

export function normalizeCssColor(colorText) {
  if (!colorText) {
    return '#ffffff';
  }

  if (colorText.startsWith('#')) {
    return colorText.toLowerCase();
  }

  if (colorText.startsWith('rgb')) {
    return rgbCssToHex(colorText);
  }

  return colorText.toLowerCase();
}

export function displayHex(colorText) {
  return normalizeCssColor(colorText).toUpperCase();
}
