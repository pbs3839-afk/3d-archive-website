import type { Classification } from '@/types/archive';

/**
 * Colour + weight per classification level.
 * `hex` is shared by the DOM UI and the emissive accent on the 3D card so the
 * two layers never drift apart.
 */
interface ClassificationStyle {
  hex: string;
  /** Emissive strength for the 3D card stripe. */
  emissive: number;
  /** Sort weight — higher is more sensitive. */
  weight: number;
}

const STYLES: Record<Classification, ClassificationStyle> = {
  'TOP SECRET': { hex: '#ff4d3d', emissive: 1.1, weight: 4 },
  SECRET: { hex: '#ffa23a', emissive: 0.9, weight: 3 },
  CONFIDENTIAL: { hex: '#ffd66b', emissive: 0.75, weight: 2 },
  RESTRICTED: { hex: '#7fd4c1', emissive: 0.6, weight: 1 },
};

export function classificationStyle(level: Classification): ClassificationStyle {
  return STYLES[level];
}

export function classificationColor(level: Classification): string {
  return STYLES[level].hex;
}

/** The most sensitive level among `levels`, or null when there are none. */
export function highestClassification(levels: Iterable<Classification>): Classification | null {
  let highest: Classification | null = null;
  for (const level of levels) {
    if (!highest || STYLES[level].weight > STYLES[highest].weight) highest = level;
  }
  return highest;
}
