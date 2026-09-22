/**
 * Pixel statistics for texture maps, kept apart from the loader so they can be
 * unit-tested without a DOM.
 */

/** An sRGB-encoded channel (0–1) as linear light — what the GPU decodes a colour map to. */
export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Mean linear luminance of RGBA pixels (0–255) taken from an sRGB colour map. */
export function meanLinearLuminance(rgba: ArrayLike<number>): number {
  const count = Math.floor(rgba.length / 4);
  if (count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < count * 4; i += 4) {
    sum +=
      0.2126 * srgbToLinear(rgba[i] / 255) +
      0.7152 * srgbToLinear(rgba[i + 1] / 255) +
      0.0722 * srgbToLinear(rgba[i + 2] / 255);
  }
  return sum / count;
}

/** Mean linear value of each colour channel of RGBA pixels (0–255) from an sRGB colour map. */
export function meanLinearRgb(rgba: ArrayLike<number>): [number, number, number] {
  const count = Math.floor(rgba.length / 4);
  if (count === 0) return [0, 0, 0];
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < count * 4; i += 4) {
    r += srgbToLinear(rgba[i] / 255);
    g += srgbToLinear(rgba[i + 1] / 255);
    b += srgbToLinear(rgba[i + 2] / 255);
  }
  return [r / count, g / count, b / count];
}

/** Share of a texel's own hue the wear shader keeps in its grain. */
export const GRAIN_HUE = 0.15;

/**
 * Per-channel mean of the shader's grain, `mix(luminance, rgb, GRAIN_HUE)`.
 *
 * Dividing the grain by this makes its average exactly neutral on every
 * channel, so the scan contributes light, dark and local colour variation but
 * never shifts the material's tint. Normalising by luminance alone left the
 * green scan's average hue in: the cabinet came out visibly teal.
 */
export function grainMean(
  rgbMean: [number, number, number],
  luminanceMean: number,
): [number, number, number] {
  return rgbMean.map((channel) =>
    Math.max(0.02, (1 - GRAIN_HUE) * luminanceMean + GRAIN_HUE * channel),
  ) as [number, number, number];
}

/** Mean of one raw channel (0–1), for data maps such as roughness that are sampled undecoded. */
export function meanChannel(rgba: ArrayLike<number>, channel: 0 | 1 | 2): number {
  const count = Math.floor(rgba.length / 4);
  if (count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < count * 4; i += 4) sum += rgba[i + channel] / 255;
  return sum / count;
}
