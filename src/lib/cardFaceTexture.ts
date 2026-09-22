import { CanvasTexture, LinearFilter, SRGBColorSpace, type Texture } from 'three';
import { FILE_CARD } from './cabinetLayout';
import { classificationColor } from './classification';
import type { ArchiveFileData } from '@/types/archive';

/**
 * The printed face of a dossier card, drawn once to a canvas.
 *
 * This used to be a drei `<Html transform>` element. That mode shrinks a DOM
 * box to a fraction of a pixel and lets CSS perspective blow it back up, so
 * Chrome rasterises the text at a tiny scale: at best the type came out
 * blocky, and once the card moved close to the camera it stopped painting at
 * all while still reporting a correct layout box. A texture is part of the
 * card's own surface — crisp at any distance, depth-tested against the other
 * cards, and lit with the paper.
 *
 * The readable, selectable, screen-reader-facing copy of the same text lives
 * in the HTML dossier panel; this face is the physical object.
 */

/** Pixel size of the face canvas. Aspect matches FILE_CARD exactly. */
const WIDTH = 1024;
const HEIGHT = Math.round(WIDTH * (FILE_CARD.height / FILE_CARD.width));

const FONT =
  "ui-monospace, 'SFMono-Regular', 'Cascadia Mono', 'Segoe UI Mono', 'Roboto Mono', Menlo, Consolas, monospace";

const cache = new Map<string, CanvasTexture>();

/** A classification colour pushed toward ink: stamped, not glowing. */
function inked(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c * 0.58);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Break `text` into lines no wider than `max`, at most `limit` lines. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  limit: number,
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === limit) break;
  }
  if (line && lines.length < limit) lines.push(line);
  if (lines.length === limit && words.join(' ') !== lines.join(' ')) {
    const last = lines[limit - 1];
    lines[limit - 1] = `${last.replace(/\s+\S*$/, '')}…`;
  }
  return lines;
}

export function cardFaceTexture(file: ArchiveFileData): Texture {
  const cached = cache.get(file.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const padX = 64;
    const top = 92; // below the classification stripe drawn as its own mesh
    const stamp = inked(classificationColor(file.classification));

    // Head row: stamped classification box, date on the right.
    ctx.font = `700 40px ${FONT}`;
    ctx.letterSpacing = '6px';
    ctx.textBaseline = 'middle';
    const label = file.classification;
    const labelW = ctx.measureText(label).width + 40;
    ctx.strokeStyle = stamp;
    ctx.lineWidth = 5;
    ctx.strokeRect(padX, top, labelW, 64);
    ctx.fillStyle = stamp;
    ctx.fillText(label, padX + 20, top + 34);

    ctx.font = `400 40px ${FONT}`;
    ctx.letterSpacing = '4px';
    ctx.fillStyle = '#6b6255';
    ctx.textAlign = 'right';
    ctx.fillText(file.date, WIDTH - padX, top + 34);
    ctx.textAlign = 'left';

    // Codename.
    ctx.font = `700 84px ${FONT}`;
    ctx.letterSpacing = '4px';
    ctx.fillStyle = '#1f1c17';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(file.codename, padX, top + 180);

    // Title, up to two lines.
    ctx.font = `400 40px ${FONT}`;
    ctx.letterSpacing = '1px';
    ctx.fillStyle = '#4a443a';
    wrap(ctx, file.title, WIDTH - padX * 2, 2).forEach((line, i) => {
      ctx.fillText(line, padX, top + 250 + i * 52);
    });

    // Origin, ruled off at the foot of the card.
    const footY = HEIGHT - 70;
    ctx.strokeStyle = 'rgba(90, 80, 62, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padX, footY - 44);
    ctx.lineTo(WIDTH - padX, footY - 44);
    ctx.stroke();
    ctx.font = `400 32px ${FONT}`;
    ctx.letterSpacing = '5px';
    ctx.fillStyle = '#7b7263';
    ctx.fillText(file.origin, padX, footY);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.anisotropy = 8;
  cache.set(file.id, texture);
  return texture;
}
