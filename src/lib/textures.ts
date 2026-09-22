import { NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { grainMean, meanChannel, meanLinearLuminance, meanLinearRgb } from './textureStats';

/**
 * The scanned PBR sets the procedural cabinet is dressed in.
 *
 * All CC0 from Poly Haven (see public/textures/README.md), 1K JPG, served from
 * this site — nothing is fetched from another origin at runtime. `realSize` is
 * the physical width one tile of the scan covers, in metres; with the metric
 * UVs from `metricBox` it sets the grain to its true scale.
 */
export type TextureSetId = 'paintedSteel' | 'concreteFloor' | 'plasterWall';

export const TEXTURE_SETS: Record<TextureSetId, { folder: string; realSize: number }> = {
  paintedSteel: { folder: 'green_metal_rust', realSize: 1.0 },
  concreteFloor: { folder: 'concrete_floor_worn_001', realSize: 3.0 },
  plasterWall: { folder: 'plastered_wall_04', realSize: 3.2 },
};

export interface LoadedTextureSet {
  color: Texture;
  normal: Texture;
  roughness: Texture;
  /** Per-channel mean of the shader's grain from this colour map. Dividing it out keeps the tint. */
  colorMean: [number, number, number];
  /** Mean of the roughness map's green channel, the one three reads. */
  roughnessMean: number;
}

const loader = new TextureLoader();
const requests = new Map<TextureSetId, Promise<LoadedTextureSet>>();
const loaded: Texture[] = [];
let anisotropy = 4;

function urlFor(id: TextureSetId, map: 'diff' | 'nor_gl' | 'rough'): string {
  const { folder } = TEXTURE_SETS[id];
  return `/textures/${folder}/${folder}_${map}_1k.jpg`;
}

function prepare(texture: Texture, id: TextureSetId, srgb: boolean): Texture {
  const repeat = 1 / TEXTURE_SETS[id].realSize;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  loaded.push(texture);
  return texture;
}

/** A 32×32 sample of an image — enough for a mean, cheap enough to take on load. */
function samplePixels(image: CanvasImageSource): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) return new Uint8ClampedArray([128, 128, 128, 255]);
  context.drawImage(image, 0, 0, 32, 32);
  return context.getImageData(0, 0, 32, 32).data;
}

/** Load a set once; every caller shares the same promise and the same textures. */
export function loadTextureSet(id: TextureSetId): Promise<LoadedTextureSet> {
  const existing = requests.get(id);
  if (existing) return existing;

  const request = Promise.all([
    loader.loadAsync(urlFor(id, 'diff')),
    loader.loadAsync(urlFor(id, 'nor_gl')),
    loader.loadAsync(urlFor(id, 'rough')),
  ]).then(([color, normal, roughness]) => {
    const colorPixels = samplePixels(color.image);
    return {
      color: prepare(color, id, true),
      normal: prepare(normal, id, false),
      roughness: prepare(roughness, id, false),
      colorMean: grainMean(meanLinearRgb(colorPixels), meanLinearLuminance(colorPixels)),
      roughnessMean: Math.max(0.05, meanChannel(samplePixels(roughness.image), 1)),
    };
  });

  requests.set(id, request);
  return request;
}

/** Sharper grain at glancing angles, scaled to the device tier. */
export function setTextureAnisotropy(value: number): void {
  anisotropy = value;
  loaded.forEach((texture) => {
    texture.anisotropy = value;
    texture.needsUpdate = true;
  });
}
