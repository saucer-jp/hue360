const BRADFORD_MATRIX = Object.freeze([
  Object.freeze([0.8951, 0.2664, -0.1614]),
  Object.freeze([-0.7502, 1.7135, 0.0367]),
  Object.freeze([0.0389, -0.0685, 1.0296]),
]);

const BRADFORD_INVERSE = Object.freeze([
  Object.freeze([0.9869929, -0.1470543, 0.1599627]),
  Object.freeze([0.4323053, 0.5183603, 0.0492912]),
  Object.freeze([-0.0085287, 0.0400428, 0.9684867]),
]);

const XYZ_TO_SRGB_MATRIX = Object.freeze([
  Object.freeze([3.2406, -1.5372, -0.4986]),
  Object.freeze([-0.9689, 1.8758, 0.0415]),
  Object.freeze([0.0557, -0.204, 1.057]),
]);

const ILLUMINANT_C = Object.freeze({ x: 0.3101, y: 0.3162 });
const D65 = Object.freeze({ x: 0.3127, y: 0.329 });

export const MUNSELL_NOTATIONS = Object.freeze([
  '5R 6/14',
  '10R 5/16',
  '5YR 7/14',
  '10YR 8/12',
  '5Y 8/14',
  '10Y 8/10',
  '5GY 6/10',
  '10GY 7/10',
  '5G 7/10',
  '10G 7/10',
  '5BG 5/10',
  '10BG 5/10',
  '5B 6/10',
  '10B 5/12',
  '5PB 5/12',
  '10PB 6/10',
  '5P 5/12',
  '10P 6/10',
  '5RP 6/12',
  '10RP 5/14',
]);

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));
}

function multiplyMatrices(left, right) {
  return left.map((row) =>
    right[0].map((_, columnIndex) => row.reduce((sum, value, index) => sum + value * right[index][columnIndex], 0))
  );
}

function whitePointToXyz({ x, y }) {
  return [x / y, 1, (1 - x - y) / y];
}

function normalizeNotationToken(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
}

function createNotationKey(hue, value, chroma) {
  return `${hue} ${normalizeNotationToken(value)}/${normalizeNotationToken(chroma)}`;
}

export function parseMunsellRenotation(text) {
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const [, ...dataRows] = rows;
  const lookup = new Map();

  for (const row of dataRows) {
    const [hue, value, chroma, x, y, Y] = row.split(/\s+/);
    lookup.set(createNotationKey(hue, value, chroma), {
      hue,
      value: normalizeNotationToken(value),
      chroma: normalizeNotationToken(chroma),
      x: Number(x),
      y: Number(y),
      Y: Number(Y) / 100,
    });
  }

  return lookup;
}

export function xyYToXyz({ x, y, Y }) {
  if (y === 0) {
    return { X: 0, Y, Z: 0 };
  }

  return {
    X: (x * Y) / y,
    Y,
    Z: ((1 - x - y) * Y) / y,
  };
}

export function adaptXyzIlluminantCToD65({ X, Y, Z }) {
  const sourceWhite = multiplyMatrixVector(BRADFORD_MATRIX, whitePointToXyz(ILLUMINANT_C));
  const targetWhite = multiplyMatrixVector(BRADFORD_MATRIX, whitePointToXyz(D65));
  const scale = [
    [targetWhite[0] / sourceWhite[0], 0, 0],
    [0, targetWhite[1] / sourceWhite[1], 0],
    [0, 0, targetWhite[2] / sourceWhite[2]],
  ];
  const adaptation = multiplyMatrices(BRADFORD_INVERSE, multiplyMatrices(scale, BRADFORD_MATRIX));
  const [adaptedX, adaptedY, adaptedZ] = multiplyMatrixVector(adaptation, [X, Y, Z]);

  return {
    X: adaptedX,
    Y: adaptedY,
    Z: adaptedZ,
  };
}

export function xyzToSrgb({ X, Y, Z }) {
  const [r, g, b] = multiplyMatrixVector(XYZ_TO_SRGB_MATRIX, [X, Y, Z]);

  return {
    r,
    g,
    b,
  };
}

function encodeSrgbChannel(channel) {
  const clipped = Math.max(0, Math.min(1, channel));
  if (clipped <= 0.0031308) {
    return 12.92 * clipped;
  }

  return 1.055 * clipped ** (1 / 2.4) - 0.055;
}

export function srgbToHex({ r, g, b }) {
  const toHex = (value) => Math.round(encodeSrgbChannel(value) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function convertNotationToHex(notation, renotationLookup) {
  const record = renotationLookup.get(notation);
  if (!record) {
    throw new Error(`Missing Munsell renotation data for ${notation}`);
  }

  const xyz = xyYToXyz(record);
  const adapted = adaptXyzIlluminantCToD65(xyz);
  const srgb = xyzToSrgb(adapted);

  return srgbToHex(srgb);
}

export function generateMunsellHexes(renotationText, notations = MUNSELL_NOTATIONS) {
  const renotationLookup = parseMunsellRenotation(renotationText);
  return notations.map((notation) => ({
    notation,
    hex: convertNotationToHex(notation, renotationLookup),
  }));
}
