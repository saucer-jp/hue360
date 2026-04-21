import { converter, formatHex } from 'culori';

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

const ILLUMINANT_C = Object.freeze({ x: 0.3101, y: 0.3162 });
const D65 = Object.freeze({ x: 0.3127, y: 0.329 });
const toRgbColor = converter('rgb');

export const MUNSELL_NOTATIONS = Object.freeze([
  '5R 6/16',
  '10R 6/16',
  '5YR 6/16',
  '10YR 8/12',
  '5Y 8/14',
  '10Y 8/10',
  '5GY 7/14',
  '10GY 6/16',
  '5G 6/16',
  '10G 6/16',
  '5BG 6/16',
  '10BG 6/16',
  '5B 6/16',
  '10B 6/16',
  '5PB 6/14',
  '10PB 6/16',
  '5P 6/16',
  '10P 6/16',
  '5RP 6/16',
  '10RP 6/16',
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
  const rgb = toRgbColor({
    mode: 'xyz65',
    x: X,
    y: Y,
    z: Z,
  });

  return {
    r: rgb?.r ?? 0,
    g: rgb?.g ?? 0,
    b: rgb?.b ?? 0,
  };
}

export function srgbToHex({ r, g, b }) {
  return formatHex({
    mode: 'rgb',
    r,
    g,
    b,
  }).toLowerCase();
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
