import { CanvasTexture, LinearFilter, SRGBColorSpace, Texture } from 'three';

/**
 * Tiny canvas-drawn stencil plates (locker codes, SEALED marks).
 *
 * Fifteen `<Html>` overlays for fifteen door plates would cost fifteen DOM
 * subtrees kept in sync with the camera every frame. A 160x80 canvas texture
 * costs 12KB of VRAM and renders as part of the mesh, so the plates stay
 * crisp and free. HTML is reserved for the text that actually needs to be
 * selectable and accessible: the file cards and the detail panel.
 */

const cache = new Map<string, CanvasTexture>();

interface StencilOptions {
  width?: number;
  height?: number;
  color?: string;
  background?: string;
  fontSize?: number;
  letterSpacing?: number;
}

export function stencilTexture(
  text: string,
  options: StencilOptions = {},
): Texture {
  const {
    width = 384,
    height = 192,
    color = '#d8d2bd',
    background = '#00000000',
    fontSize = 92,
    letterSpacing = 8,
  } = options;

  const key = `${text}|${width}|${height}|${color}|${background}|${fontSize}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    if (background !== '#00000000') {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.fillStyle = color;
    ctx.font = `700 ${fontSize}px "Courier New", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${letterSpacing}px`;
    ctx.fillText(text, width / 2, height / 2 + 2);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  cache.set(key, texture);
  return texture;
}

