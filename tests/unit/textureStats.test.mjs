import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  grainMean,
  meanChannel,
  meanLinearLuminance,
  meanLinearRgb,
  srgbToLinear,
} from '../../src/lib/textureStats.ts';

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-4, `${message}: ${actual} != ${expected}`);

test('srgbToLinear matches the sRGB transfer curve', () => {
  close(srgbToLinear(0), 0, 'black');
  close(srgbToLinear(1), 1, 'white');
  close(srgbToLinear(128 / 255), 0.21586, 'mid grey');
  close(srgbToLinear(0.04), 0.04 / 12.92, 'linear toe');
});

test('meanLinearLuminance averages decoded luminance over pixels', () => {
  const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
  close(meanLinearLuminance(pixels), 0.5, 'white + black');
  close(meanLinearLuminance(new Uint8ClampedArray([128, 128, 128, 255])), 0.21586, 'mid grey');
  assert.equal(meanLinearLuminance(new Uint8ClampedArray([])), 0);
});

test('meanChannel reads one raw channel', () => {
  const pixels = new Uint8ClampedArray([0, 128, 0, 255, 0, 255, 0, 255]);
  close(meanChannel(pixels, 1), (128 / 255 + 1) / 2, 'green');
  close(meanChannel(pixels, 0), 0, 'red');
});

test('meanLinearRgb decodes and averages each channel', () => {
  const pixels = new Uint8ClampedArray([255, 0, 128, 255, 255, 0, 0, 255]);
  const [r, g, b] = meanLinearRgb(pixels);
  close(r, 1, 'red');
  close(g, 0, 'green');
  close(b, 0.21586 / 2, 'blue');
});

test('grainMean is the mean of the shader grain, per channel', () => {
  // The shader keeps 15% of the texel's own hue: grain = mix(lum, rgb, 0.15).
  // Its mean per channel is the same mix of the means, so dividing by it
  // brings the average back to exactly neutral.
  const [r, g, b] = grainMean([0.2, 0.4, 0.1], 0.33);
  close(r, 0.85 * 0.33 + 0.15 * 0.2, 'red');
  close(g, 0.85 * 0.33 + 0.15 * 0.4, 'green');
  close(b, 0.85 * 0.33 + 0.15 * 0.1, 'blue');
  assert.deepEqual(grainMean([0, 0, 0], 0), [0.02, 0.02, 0.02], 'floored so a black map cannot divide by zero');
});
