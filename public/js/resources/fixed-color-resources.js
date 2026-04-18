// 色相環生成で使う基準色と明度ステップの固定値をまとめる。
export const FIXED_COLORS = Object.freeze({
  munsell: Object.freeze([
    '#d14c5d', // 5R 6/14
    '#d66742', // 10R 5/16
    '#d98a1a', // 5YR 7/14
    '#de9f00', // 10YR 8/12
    '#f1d100', // 5Y 8.5/14
    '#d4e100', // 10Y 8/10
    '#9ad400', // 5GY 6/10
    '#58c61b', // 10GY 7/10
    '#00b06a', // 5G 7/10
    '#00ab86', // 10G 7/10
    '#00a6a0', // 5BG 5/10
    '#009eb8', // 10BG 5/10
    '#3694cb', // 5B 6/10
    '#5b88d3', // 10B 5/12
    '#7d79d0', // 5PB 5/12
    '#9b71c8', // 10PB 6/10
    '#b166be', // 5P 5/12
    '#c15aae', // 10P 6/10
    '#cc5591', // 5RP 6/12
    '#d04f73', // 10RP 5/14
  ]),
  rgb: Object.freeze([
    '#FF0000',
    '#FF9900',
    '#CCFF00',
    '#33FF00',
    '#00FF66',
    '#00FFFF',
    '#0066FF',
    '#3300FF',
    '#CC00FF',
    '#FF0099',
  ]),
  'rgb+': Object.freeze([
    '#FF0022',
    '#FFA700',
    '#FFE600',
    '#CAFF00',
    '#00FF8C',
    '#00C8FF',
    '#00A9FF',
    '#0018FF',
    '#FF00BA',
    '#FF0055',
  ]),
  brightness: Object.freeze([
    '#FFFFFF',
    '#E3E3E3',
    '#C6C6C6',
    '#AAAAAA',
    '#8E8E8E',
    '#717171',
    '#555555',
    '#393939',
    '#1C1C1C',
    '#000000',
  ]),
});
