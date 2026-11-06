import test from 'node:test';
import assert from 'node:assert/strict';

import { createCircleModel, createCircleTones, createColorStatuses, getBaseSelection, getHueInterpolation, judgeColor } from '../public/js/core/color-circle-model.js';
import { getSharedChroma, hsbToWeb, isSrgbInGamut, oklchToSrgb, oklchToWeb, webToHsb, webToOklch, webToRgb } from '../public/js/core/color-math.js';
import { FIXED_COLORS } from '../public/js/resources/fixed-color-resources.js';
import { createInitialState } from '../public/js/core/state.js';

test('createCircleModel builds hueStep * chromaStep chips', () => {
  const state = createInitialState({ hueStep: 10, chromaStep: 3 });
  const model = createCircleModel(state);
  assert.equal(model.chips.length, 30);
  assert.equal(model.brightnessChips.length, 10);
});

test('fixed color resources expose expected color spaces and step counts', () => {
  assert.deepEqual(Object.keys(FIXED_COLORS), ['munsell', 'rgb', 'rgb+', 'brightness']);
  assert.equal(FIXED_COLORS.munsell.length, 20);
  assert.equal(FIXED_COLORS.rgb.length, 20);
  assert.equal(FIXED_COLORS['rgb+'].length, 20);
  assert.equal(FIXED_COLORS.brightness.length, 10);
});

function hueDifference(a, b) {
  const difference = Math.abs(a - b) % 360;
  return Math.min(difference, 360 - difference);
}

test('anchor hues stay intact outside the adjusted Munsell transitions', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    const state = createInitialState({ colorSpace, hueStep: 20 });
    const tones = createCircleTones(state);
    const firstRing = createColorStatuses(state).slice(0, 20);
    const anchorHues = FIXED_COLORS[colorSpace].map((color) => webToOklch(color).h);
    anchorHues.forEach((hue, index) => {
      const adjusted = (hue > 40 && hue < 160) || hue > 210 || hue < 20;
      if (colorSpace !== 'munsell' || !adjusted) assert.equal(tones.hues[index], hue);
    });
    firstRing.forEach((chip, index) => {
      assert.ok(hueDifference(chip.oklch.h, tones.hues[index]) < 1);
      assert.ok(Math.abs(chip.oklch.l - tones.rings[0].lightnesses[index]) < 0.003);
      assert.ok(Math.abs(chip.oklch.c - tones.rings[0].chromas[index]) < 0.003);
    });
  }
});

test('Munsell gives blue more steps and keeps the cyan-to-blue transition gradual', () => {
  for (const hueStep of [42, 100]) {
    const state = createInitialState({ hueStep, chromaStep: 10, saturation: 100 });
    const colors = createColorStatuses(state);
    const { hues } = createCircleTones(state);
    const blueCount = hues.filter((hue) => hue >= 250 && hue < 280).length;
    const cyanCount = hues.filter((hue) => hue >= 210 && hue < 250).length;
    assert.ok(blueCount >= hueStep * 0.09, 'blue receives a visible span of the wheel');
    assert.ok(cyanCount <= hueStep * 0.1, 'light blue no longer dominates the transition');
    for (let ring = 0; ring < state.chromaStep; ring += 1) {
      for (let index = 1; index < hueStep; index += 1) {
        if (hues[index] < 210 || hues[index - 1] > 290) continue;
        assert.ok(hues[index] > hues[index - 1], 'transition does not reverse hue order');
        const a = colors[ring * hueStep + index - 1].oklch;
        const b = colors[ring * hueStep + index].oklch;
        const delta = Math.hypot(
          a.l - b.l,
          a.c * Math.cos(a.h * Math.PI / 180) - b.c * Math.cos(b.h * Math.PI / 180),
          a.c * Math.sin(a.h * Math.PI / 180) - b.c * Math.sin(b.h * Math.PI / 180),
        );
        assert.ok(delta < 4.3 / hueStep, `${hueStep}/${ring}/${index}: abrupt blue transition (${delta})`);
      }
    }
  }
});

test('Munsell hue positions stay fixed across brightness saturation and subdivision changes', () => {
  const state = createInitialState({ hueStep: 100 });
  const reference = createCircleTones(state).hues;
  for (const brightness of [0, 3, 6, 9]) {
    for (const saturation of [0, 25, 50, 75, 100]) {
      assert.deepEqual(createCircleTones({ ...state, brightness, saturation, chromaStep: 10 }).hues, reference);
    }
  }
  const coarse = createCircleTones({ ...state, hueStep: 20 }).hues;
  coarse.forEach((hue, index) => assert.ok(hueDifference(hue, reference[index * 5]) < 1e-9));
});

test('Munsell pink and yellow transitions have gradual color changes on every ring', () => {
  for (const hueStep of [42, 100]) {
    const state = createInitialState({ hueStep, chromaStep: 10, saturation: 100 });
    const colors = createColorStatuses(state);
    for (const { start, end, limit } of [
      { start: 0.07, end: 0.41, limit: 2.7 },
      { start: 0.78, end: 1, limit: 3.1 },
    ]) {
      for (let ring = 0; ring < state.chromaStep; ring += 1) {
        for (let index = Math.ceil(start * hueStep); index < end * hueStep; index += 1) {
          const a = colors[ring * hueStep + index - 1].oklch;
          const b = colors[ring * hueStep + index].oklch;
          const delta = Math.hypot(
            a.l - b.l,
            a.c * Math.cos(a.h * Math.PI / 180) - b.c * Math.cos(b.h * Math.PI / 180),
            a.c * Math.sin(a.h * Math.PI / 180) - b.c * Math.sin(b.h * Math.PI / 180),
          );
          assert.ok(delta < limit / hueStep, `${hueStep}/${ring}/${index}: abrupt pink/yellow transition (${delta})`);
        }
      }
    }
  }
});

test('Munsell hue order stays continuous across the pink-to-red zero-degree boundary', () => {
  for (const hueStep of [10, 17, 20, 42, 100]) {
    const { hues } = createCircleTones(createInitialState({ hueStep }));
    let total = 0;
    hues.forEach((hue, index) => {
      const delta = (hues[(index + 1) % hueStep] - hue + 360) % 360;
      assert.ok(delta > 0 && delta < 90, `${hueStep}/${index}: hue reversal or discontinuity`);
      total += delta;
    });
    assert.ok(Math.abs(total - 360) < 1e-9, 'complete one ordered turn');
  }
});

test('rgb derives intermediate hues from HSB interpolation before tone matching', () => {
  const state = createInitialState({ colorSpace: 'rgb', hueStep: 40, chromaStep: 3 });
  const model = createCircleModel(state);
  const interpolated = model.colorStatuses[1].web.toLowerCase();
  const start = webToHsb(FIXED_COLORS.rgb[0]);
  const end = webToHsb(FIXED_COLORS.rgb[1]);
  const hueDiff = ((end.h - start.h + 540) % 360) - 180;
  const expected = hsbToWeb({
    h: (start.h + hueDiff * 0.5 + 360) % 360,
    s: start.s + (end.s - start.s) * 0.5,
    b: start.b + (end.b - start.b) * 0.5,
  }).toLowerCase();
  const expectedHue = webToOklch(expected).h;
  assert.equal(createCircleTones(state).hues[1], expectedHue);
  assert.ok(hueDifference(webToOklch(interpolated).h, expectedHue) < 1);
});

test('ring lightness stays independent of hue count and selection state', () => {
  const state = createInitialState({ brightness: 3, chromaStep: 7 });
  const reference = createCircleTones(state).rings.map(({ l }) => l);
  for (const hueStep of [10, 17, 20, 42, 100]) {
    assert.deepEqual(createCircleTones({ ...state, hueStep }).rings.map(({ l }) => l), reference);
  }
  const selected = { ...state, baseColor: '#abcdef', baseColorId: 4, baseHueAngle: 31, judgeEnabled: false, backgroundColor: '#000000' };
  assert.deepEqual(createColorStatuses(selected), createColorStatuses(state));
});

test('vivid rings stay in gamut with bounded tone variation and descending spoke chroma', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const hueStep of [10, 17, 20, 42, 100]) {
      for (const chromaStep of [3, 7, 10]) {
        for (let brightness = 0; brightness < 10; brightness += 1) {
          const state = createInitialState({ colorSpace, hueStep, chromaStep, brightness, saturation: 100 });
          const { hues, rings } = createCircleTones(state);
          const colors = createColorStatuses(state);
          rings.forEach((tone, ringIndex) => {
            const label = `${colorSpace}/${hueStep}/${chromaStep}/${brightness}/${ringIndex}`;
            const row = colors.slice(ringIndex * hueStep, (ringIndex + 1) * hueStep);
            const tolerance = 0.005;
            const lightnesses = row.map((color) => color.oklch.l);
            const uniform = brightness >= 6 || ringIndex === chromaStep - 1;
            assert.ok(Math.max(...lightnesses) - Math.min(...lightnesses) <= (uniform ? tolerance : 0.425), `${label}: lightness spread`);
            assert.ok(lightnesses.every((value, index) => Math.abs(value - tone.lightnesses[index]) <= tolerance), `${label}: lightness target`);
            row.forEach((color, hueIndex) => {
              const target = { l: tone.lightnesses[hueIndex], c: tone.chromas[hueIndex], h: hues[hueIndex] };
              if (ringIndex > 0) {
                assert.ok(target.c <= rings[ringIndex - 1].chromas[hueIndex], `${label}: chroma rises inward`);
              }
              assert.ok(isSrgbInGamut(oklchToSrgb(target)), `${label}: pre-encoding gamut`);
              assert.ok(Math.abs(color.oklch.c - target.c) <= tolerance, `${label}: chroma rounding`);
              assert.ok(color.oklch.l >= 0.295, `${label}: too close to black`);
              assert.notEqual(color.web, '#000000');
              assert.equal(color.web, oklchToWeb(target));
              assert.deepEqual(color.rgb, webToRgb(color.web));
              assert.deepEqual(color.hsb, webToHsb(color.web));
              assert.deepEqual(color.oklch, webToOklch(color.web));
            });
          });
          if (brightness === 9) {
            assert.ok(colors.every((color) => color.oklch.c > 0.004), 'darkest palette retains tint');
            assert.ok(colors.every((color) => color.oklch.l <= 0.365), 'darkest palette remains dark');
          }
        }
      }
    }
  }
});

test('bright outer colors retain most of each hue gamut', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const brightness of [0, 1]) {
      const state = createInitialState({ colorSpace, brightness, saturation: 100 });
      const { hues, rings } = createCircleTones(state);
      const outer = rings[0];
      const limits = hues.map((hue, index) => getSharedChroma(outer.lightnesses[index], 0.4, [hue]));
      const commonChroma = outer.c;
      outer.chromas.forEach((chroma, index) => {
        assert.ok(chroma >= commonChroma);
        assert.ok(chroma >= limits[index] * 0.9, 'retain at least 90% of the available outer chroma');
        assert.ok(chroma <= limits[index] + 1e-7, 'stay within the gamut search precision');
      });
      const colors = createColorStatuses(state).slice(0, state.hueStep);
      const meanChroma = colors.reduce((sum, color) => sum + color.oklch.c, 0) / colors.length;
      assert.ok(meanChroma > commonChroma * 1.25, `${colorSpace}/${brightness}: recover visible saturation`);
      const lightnesses = colors.map((color) => color.oklch.l);
      assert.ok(Math.max(...lightnesses) - Math.min(...lightnesses) < 0.425);
    }
  }
});

test('pure reds blues and especially yellows gain chroma within limited lightness shifts', () => {
  const primaries = [
    { hex: '#ff0000', minShift: -0.111, maxShift: -0.075 },
    { hex: '#ffff00', minShift: 0.22, maxShift: 0.241 },
    { hex: '#0000ff', minShift: -0.181, maxShift: -0.17 },
  ];
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    const state = createInitialState({ colorSpace, hueStep: 100, chromaStep: 7, saturation: 100 });
    const { hues, rings } = createCircleTones(state);
    const colors = createColorStatuses(state);
    const outer = rings[0];
    primaries.forEach(({ hex, minShift, maxShift }) => {
      const targetHue = webToOklch(hex).h;
      const index = hues.reduce((best, hue, i) => hueDifference(hue, targetHue) < hueDifference(hues[best], targetHue) ? i : best, 0);
      const unboostedLimit = getSharedChroma(outer.l, 0.4, [hues[index]]);
      const unboostedChroma = outer.c + (unboostedLimit - outer.c) * 0.9;
      const shift = outer.lightnesses[index] - outer.l;
      assert.ok(outer.chromas[index] > unboostedChroma * 1.18, `${colorSpace}/${hex}: visible chroma gain`);
      assert.ok(shift >= minShift && shift <= maxShift, `${colorSpace}/${hex}: bounded lightness shift`);
      assert.ok(hueDifference(colors[index].oklch.h, hues[index]) < 1, 'keep the original hue');
      if (hex === '#ffff00') {
        assert.ok(colors[index].rgb.r > 240 && colors[index].rgb.g > 240 && colors[index].rgb.b < 10, 'yellow reaches a vivid near-primary color');
      }
    });
    hues.forEach((hue, index) => {
      if (hue < 150 || hue > 210) return;
      assert.ok(Math.abs(outer.lightnesses[index] - outer.l) <= 0.081, 'other hues use a smaller lightness allowance');
      const limit = getSharedChroma(outer.l, 0.4, [hue]);
      assert.ok(outer.chromas[index] > (outer.c + (limit - outer.c) * 0.9) * 1.08, 'greens and cyans also gain vividness');
    });
  }
});

test('primary tone variation fades inward and disappears on the dark side', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    let previousOuterVariation = Infinity;
    for (let brightness = 0; brightness < 10; brightness += 1) {
      const { rings } = createCircleTones(createInitialState({ colorSpace, hueStep: 100, chromaStep: 10, brightness, saturation: 100 }));
      const variations = rings.map((tone) => Math.max(...tone.lightnesses) - Math.min(...tone.lightnesses));
      assert.ok(variations[0] <= previousOuterVariation, 'tone matching increases as the palette gets darker');
      previousOuterVariation = variations[0];
      variations.forEach((variation, index) => {
        if (index > 0) assert.ok(variation <= variations[index - 1] + 1e-9, 'inner rings stay more uniform');
        if (brightness >= 6 || index === rings.length - 1) assert.equal(variation, 0);
      });
    }
  }
});

test('zero saturation produces one neutral gray per ring without changing brightness endpoints', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const brightness of [0, 4, 9]) {
      const state = createInitialState({ colorSpace, brightness, saturation: 0, chromaStep: 7 });
      const { rings } = createCircleTones(state);
      const colors = createColorStatuses(state);
      rings.forEach((tone, ring) => {
        const row = colors.slice(ring * state.hueStep, (ring + 1) * state.hueStep);
        assert.equal(new Set(row.map((color) => color.web)).size, 1);
        assert.ok(tone.chromas.every((chroma) => chroma === 0));
        row.forEach(({ rgb, oklch, web }) => {
          assert.equal(rgb.r, rgb.g);
          assert.equal(rgb.g, rgb.b);
          assert.ok(Math.abs(oklch.l - tone.l) < 0.003);
          assert.notEqual(web, '#000000');
          assert.notEqual(web, '#ffffff');
        });
      });
    }
  }
});

test('lower saturation improves lightness and relative chroma uniformity while remaining in gamut', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const brightness of [0, 3, 7, 9]) {
      const state = createInitialState({ colorSpace, brightness, hueStep: 42, chromaStep: 7, saturation: 100 });
      let previous;
      for (const saturation of [100, 75, 50, 25, 1, 0]) {
        const { hues, rings } = createCircleTones({ ...state, saturation });
        rings.forEach((tone, ring) => {
          const spread = Math.max(...tone.lightnesses) - Math.min(...tone.lightnesses);
          const chromaSpread = Math.max(...tone.chromas) - Math.min(...tone.chromas);
          const minimumChroma = Math.min(...tone.chromas);
          const relativeSpread = minimumChroma === 0 ? 0 : chromaSpread / minimumChroma;
          if (previous) {
            const prior = previous[ring];
            assert.ok(spread <= prior.spread + 1e-9);
            assert.ok(relativeSpread <= prior.relativeSpread + 1e-6, 'improve uniformity beyond merely scaling every chroma');
          }
          tone.chromas.forEach((chroma, index) => {
            const target = { l: tone.lightnesses[index], c: chroma, h: hues[index] };
            assert.ok(isSrgbInGamut(oklchToSrgb(target)));
            if (previous) assert.ok(chroma <= previous[ring].chromas[index] + 1e-9, 'lower slider never increases chroma');
            if (ring > 0) assert.ok(chroma <= rings[ring - 1].chromas[index], 'chroma does not rise inward');
          });
        });
        previous = rings.map((tone) => ({
          chromas: tone.chromas,
          spread: Math.max(...tone.lightnesses) - Math.min(...tone.lightnesses),
          relativeSpread: Math.min(...tone.chromas) === 0 ? 0 : (Math.max(...tone.chromas) - Math.min(...tone.chromas)) / Math.min(...tone.chromas),
        }));
      }
      const high = createCircleTones(state).rings;
      const half = createCircleTones({ ...state, saturation: 50 }).rings;
      half.forEach((tone, ring) => {
        const highSpread = Math.max(...high[ring].chromas) - Math.min(...high[ring].chromas);
        const halfSpread = Math.max(...tone.chromas) - Math.min(...tone.chromas);
        assert.ok(halfSpread <= highSpread * 0.43 + 1e-6, 'half saturation still reduces chroma differences');
        const highLightnessSpread = Math.max(...high[ring].lightnesses) - Math.min(...high[ring].lightnesses);
        const halfLightnessSpread = Math.max(...tone.lightnesses) - Math.min(...tone.lightnesses);
        assert.ok(halfLightnessSpread <= highLightnessSpread * 0.57 + 1e-9);
      });
    }
  }
});

test('upper saturation steps retain vividness and fade gently from the maximum', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const brightness of [0, 3, 7]) {
      const state = createInitialState({ colorSpace, brightness, hueStep: 100 });
      const averageChroma = (saturation) => {
        const outer = createCircleTones({ ...state, saturation }).rings[0];
        return outer.chromas.reduce((sum, chroma) => sum + chroma, 0) / state.hueStep;
      };
      const full = averageChroma(100);
      assert.ok(averageChroma(99) >= full * 0.999, 'no jump when leaving 100%');
      assert.ok(averageChroma(95) >= full * 0.99);
      assert.ok(averageChroma(90) >= full * 0.97, '90% retains nearly all outer chroma');
      assert.ok(averageChroma(75) >= full * 0.85, '75% stays vivid');
      assert.ok(averageChroma(50) >= full * 0.58, 'midpoint retains more than half the chroma');
      assert.ok(averageChroma(25) < full * 0.45, 'lower settings still reach muted tones');
    }
  }
});

test('saturation is part of the palette cache and restoring it restores the same colors', () => {
  const state = createInitialState({ saturation: 100 });
  const full = createCircleModel(state);
  const low = createCircleModel({ ...state, saturation: 25 });
  assert.notEqual(full.staticKey, low.staticKey);
  assert.notDeepEqual(full.colorStatuses, low.colorStatuses);
  assert.equal(full.chips.length, low.chips.length);
  assert.deepEqual(createCircleModel(state).colorStatuses, full.colorStatuses);
});

test('dark rings cap chroma outliers while retaining hue and visible tint', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const hueStep of [17, 42, 100]) {
      for (const brightness of [7, 8, 9]) {
        const state = createInitialState({ colorSpace, hueStep, brightness, chromaStep: 10, saturation: 100 });
        const { hues, rings } = createCircleTones(state);
        const colors = createColorStatuses(state);
        rings.forEach((tone, ringIndex) => {
          if (tone.l > 0.45) return;
          tone.chromas.forEach((chroma) => {
            assert.ok(chroma <= tone.c * 1.5 + 1e-9, 'dark chroma stays within 1.5 times the common tone');
          });
          const row = colors.slice(ringIndex * hueStep, (ringIndex + 1) * hueStep);
          const chromas = row.map((color) => color.oklch.c);
          assert.ok(Math.max(...chromas) - Math.min(...chromas) <= tone.c * 0.5 + 0.005);
          row.forEach((color, hueIndex) => {
            assert.ok(color.oklch.c > 0.004, 'keep dark colors tinted');
            assert.ok(hueDifference(color.oklch.h, hues[hueIndex]) < 20, 'do not rotate blue into another hue');
          });
        });
        const outer = rings[0];
        const unlimited = hues.map((hue) => getSharedChroma(outer.l, 0.4, [hue]));
        const previousSpread = (Math.max(...unlimited) - Math.min(...unlimited)) * 0.9;
        const spread = Math.max(...outer.chromas) - Math.min(...outer.chromas);
        assert.ok(spread < previousSpread * 0.35, 'substantially reduce the low-lightness chroma gap');
        const meanChroma = outer.chromas.reduce((sum, chroma) => sum + chroma, 0) / hueStep;
        assert.ok(meanChroma > outer.c * 1.15, 'retain some saturation recovery');
      }
    }
  }
});

test('base brightness divides the nonblack range evenly and all colors darken monotonically', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const chromaStep of [3, 7, 10]) {
      const states = Array.from({ length: 10 }, (_, brightness) => createInitialState({ colorSpace, chromaStep, brightness, saturation: 100 }));
      const palettes = states.map(createColorStatuses);
      const tones = states.map(createCircleTones);
      tones.forEach(({ rings }, brightness) => rings.forEach((tone, ringIndex) => {
        const bright = tones[0].rings[ringIndex].l;
        const dark = tones[9].rings[ringIndex].l;
        const expected = bright + (dark - bright) * brightness / 9;
        assert.ok(Math.abs(tone.l - expected) < 0.004, 'neutral HEX rounding stays close to equal intervals');
      }));
      for (let brightness = 1; brightness < 10; brightness += 1) {
        palettes[brightness].forEach((color, index) => {
          assert.ok(color.oklch.l < palettes[brightness - 1][index].oklch.l, 'every brightness step gets darker');
          assert.ok(hueDifference(color.oklch.h, palettes[brightness - 1][index].oklch.h) < 20, 'keep the hue family at low lightness');
        });
      }
    }
  }
});

test('judgeColor returns a boolean for representative base/target chips', () => {
  const state = createInitialState({
    colorSpace: 'munsell',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 0,
    baseColor: '#c7243a',
    baseColorBrightness: 0,
  });
  const model = createCircleModel(state);
  assert.equal(typeof judgeColor(model.colorStatuses, state, 5), 'boolean');
  assert.equal(typeof judgeColor(model.colorStatuses, state, 40), 'boolean');
});

test('createCircleModel reuses static data for identical structural inputs', () => {
  const first = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 7, brightness: 2 }));
  const second = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 7, brightness: 2 }));

  assert.equal(first.staticKey, second.staticKey);
  assert.equal(first.colorStatuses, second.colorStatuses);
});

test('createCircleModel supports non-decimal hue steps', () => {
  const state = createInitialState({ colorSpace: 'rgb', hueStep: 17, chromaStep: 4 });
  const model = createCircleModel(state);

  assert.equal(model.chips.length, 68);
  assert.ok(model.chips.every((chip) => /^#[0-9a-f]{6}$/i.test(chip.color)));
});

test('createCircleModel supports full chroma range', () => {
  const low = createCircleModel(createInitialState({ hueStep: 17, chromaStep: 3 }));
  const high = createCircleModel(createInitialState({ hueStep: 17, chromaStep: 10 }));

  assert.equal(low.chips.length, 51);
  assert.equal(high.chips.length, 170);
});

test('getHueInterpolation keeps blend within a single segment across full rotations', () => {
  const samples = [0, 1, 8, 16, 19, 20, 21, 40, 99];

  for (const hueIndex of samples) {
    const { startIndex, endIndex, blend } = getHueInterpolation(hueIndex, 20, 10);
    assert.ok(startIndex >= 0 && startIndex < 10);
    assert.ok(endIndex >= 0 && endIndex < 10);
    assert.ok(blend >= 0 && blend < 1, `blend out of range for hueIndex=${hueIndex}: ${blend}`);
  }
});

test('same spoke keeps a stable hue family across chroma rings', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'munsell', hueStep: 20, chromaStep: 7 }));
  const spokeIndex = 0;
  const spokeHues = Array.from({ length: 7 }, (_, ring) => model.colorStatuses[ring * 20 + spokeIndex].oklch.h);
  const circularDiffs = spokeHues.slice(1).map((hue, index) => {
    const prev = spokeHues[index];
    const diff = Math.abs(hue - prev);
    return Math.min(diff, 360 - diff);
  });

  assert.ok(circularDiffs.every((diff) => diff < 20), `spoke hue drift too large: ${spokeHues.join(', ')}`);
});

test('base selection keeps the chosen hue angle stable when hueStep changes', () => {
  const initialState = createInitialState({
    hueStep: 20,
    chromaStep: 7,
    baseColor: '#5d639e',
    baseColorId: 7,
    baseHueAngle: 126,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
  });
  const nextState = {
    ...initialState,
    hueStep: 22,
  };

  const baseSelection = getBaseSelection(nextState);
  const model = createCircleModel(nextState);
  const baseChip = model.chips[baseSelection.selectedChipId];

  assert.equal(baseSelection.selectedChipId, 8);
  assert.ok(Math.abs(baseChip.deg - 126) < 0.000001, `expected anchored angle 126, got ${baseChip.deg}`);
  assert.equal(model.selectedChipId, baseSelection.selectedChipId);
  assert.equal(baseChip.isBaseColor, true);
});

test('palest chroma ring keeps slight color instead of collapsing to pure white', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    const state = createInitialState({
      colorSpace,
      hueStep: 20,
      chromaStep: 7,
      brightness: 0,
    });
    const model = createCircleModel(state);
    const palestRing = model.colorStatuses.slice((state.chromaStep - 1) * state.hueStep);

    assert.ok(
      palestRing.every((chip) => chip.web.toLowerCase() !== '#ffffff'),
      `${colorSpace} palest ring still contains pure white: ${palestRing.map((chip) => chip.web).join(', ')}`
    );
  }
});

test('judgeColor uses step-based hue, chroma, and brightness ranges for rgb mode', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 0,
    baseColor: '#ff0000',
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: true,
  });
  const baseAnalysis = {
    kind: 'step',
    base: { stepHue: 1, stepChroma: 1, stepBrightness: 0 },
    brightnessStep: 10,
    justNoticeableBrightnessDiff: 0.1,
  };
  const colorStatuses = [
    { id: 0, web: '#ff0000', oklch: { h: 0, c: 0.15, l: 0.5 }, stepNum: { hue: 1, chroma: 1, brightness: 0 } },
    { id: 1, web: '#ff3300', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 2, chroma: 1, brightness: 0 } },
    { id: 2, web: '#ff0000', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 1, chroma: 2, brightness: 0 } },
    { id: 3, web: '#ff6666', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 1, chroma: 1, brightness: 2 } },
    { id: 4, web: '#00ffff', oklch: { h: 150, c: 0.35, l: 0.62 }, stepNum: { hue: 10, chroma: 7, brightness: 0 } },
  ];

  assert.equal(judgeColor(colorStatuses, state, 1, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 2, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 3, baseAnalysis), false);
  assert.equal(judgeColor(colorStatuses, state, 4, baseAnalysis), true);
});

test('rgb keeps all chips visible when judgeEnabled is false', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 3,
    baseColor: FIXED_COLORS.rgb[3],
    baseHueAngle: (360 / 20) * 3,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: false,
  });
  const model = createCircleModel(state);

  assert.equal(model.chips.every((chip) => chip.isClashing === false), true);
  assert.equal(model.brightnessChips.every((chip) => chip.isClashing === false), true);
});

test('brightness chips stay visible when no base color is selected', () => {
  const model = createCircleModel(createInitialState({ colorSpace: 'rgb', hueStep: 20, chromaStep: 7 }));

  assert.equal(model.brightnessChips.every((chip) => chip.isClashing === false), true);
});

test('brightness chips use judge results for each brightness candidate', () => {
  const state = createInitialState({
    colorSpace: 'rgb',
    hueStep: 20,
    chromaStep: 7,
    brightness: 2,
    baseColorId: 0,
    baseColor: FIXED_COLORS.rgb[0],
    baseHueAngle: 0,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: true,
  });
  const model = createCircleModel(state);
  const currentChip = model.brightnessChips.find((chip) => chip.isCurrent);

  assert.equal(currentChip?.brightness, 2);
  assert.equal(currentChip?.isClashing, true);
  assert.equal(model.brightnessChips.some((chip) => chip.isClashing), true);
  assert.equal(model.brightnessChips.some((chip) => !chip.isClashing), true);
});

test('brightness step shortcut agrees with judging fully generated candidates', () => {
  for (const colorSpace of ['munsell', 'rgb', 'rgb+']) {
    for (const baseColorBrightness of [0, 3, 9]) {
      const state = createInitialState({
        colorSpace, hueStep: 17, chromaStep: 7, brightness: 4,
        baseColor: '#abcdef', baseColorId: 89, baseHueAngle: 4 * 360 / 17,
        baseChromaIndex: 5, baseColorBrightness,
      });
      const model = createCircleModel(state);
      model.brightnessChips.forEach((chip) => {
        const candidates = createColorStatuses({ ...state, brightness: chip.brightness });
        assert.equal(chip.isClashing, !judgeColor(candidates, state, model.selectedChipId));
      });
    }
  }
});

test('rgb judge-visible distribution matches rgb+ under the same step-based selection', () => {
  const sharedSelection = {
    hueStep: 20,
    chromaStep: 7,
    baseColorId: 7,
    baseHueAngle: (360 / 20) * 7,
    baseChromaIndex: 0,
    baseColorBrightness: 0,
    judgeEnabled: true,
  };
  const rgbModel = createCircleModel(
    createInitialState({
      ...sharedSelection,
      colorSpace: 'rgb',
      baseColor: FIXED_COLORS.rgb[7],
    })
  );
  const rgbPlusModel = createCircleModel(
    createInitialState({
      ...sharedSelection,
      colorSpace: 'rgb+',
      baseColor: FIXED_COLORS['rgb+'][7],
    })
  );
  const countVisibleByRing = (model) =>
    Array.from({ length: sharedSelection.chromaStep }, (_, ring) =>
      model.chips.slice(ring * sharedSelection.hueStep, (ring + 1) * sharedSelection.hueStep).filter((chip) => !chip.isClashing)
        .length
    );

  assert.deepEqual(countVisibleByRing(rgbModel), countVisibleByRing(rgbPlusModel));
});
