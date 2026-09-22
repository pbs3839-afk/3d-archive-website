/**
 * The page's scroll, as a table of chapters.
 *
 * Lengths are in screens (1.0 = one viewport of scrolling). The opening keeps
 * exactly the distance the old single-intro track had — 400vh less the one
 * viewport on screen at the end, 280vh on a phone — which is what keeps its
 * pacing unchanged. After it: a short hold on the open vault, then one chapter
 * per drawer on the tour.
 *
 * Pure and import-free on purpose, so the unit tests can load it under plain
 * Node. The drawer ids come in as an argument for the same reason.
 */

export type ChapterKind = 'opening' | 'vault' | 'tour';

export interface Chapter {
  id: string;
  kind: ChapterKind;
  /** Length in screens. */
  length: number;
  /** Tour chapters only: the drawer this chapter visits. */
  lockerId?: string;
}

export interface ChapterSpan extends Chapter {
  /** Where the chapter starts and ends in overall progress, 0–1. */
  start: number;
  end: number;
}

export interface Located {
  span: ChapterSpan;
  index: number;
  /** Progress within the chapter, 0–1. */
  local: number;
}

export const OPENING_LENGTH = { wide: 3.0, narrow: 1.8 } as const;
export const VAULT_LENGTH = 0.6;
export const TOUR_LENGTH = 1.0;

/** Share of a tour chapter spent travelling to its drawer; the rest holds on it. */
export const TOUR_ARRIVE = 0.35;
/** How far the drawer in focus slides out while the tour holds on it, in metres. */
export const PEEK_DEPTH = 0.06;
/** Chapter progress by which that drawer has finished sliding out. */
const PEEK_OUT_END = 0.5;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function buildChapters(narrow: boolean, tourIds: readonly string[]): ChapterSpan[] {
  const chapters: Chapter[] = [
    {
      id: 'opening',
      kind: 'opening',
      length: narrow ? OPENING_LENGTH.narrow : OPENING_LENGTH.wide,
    },
    { id: 'vault', kind: 'vault', length: VAULT_LENGTH },
    ...tourIds.map(
      (lockerId): Chapter => ({ id: `tour-${lockerId}`, kind: 'tour', length: TOUR_LENGTH, lockerId }),
    ),
  ];

  const total = totalLength(chapters);
  let cursor = 0;
  return chapters.map((chapter) => {
    const start = cursor / total;
    cursor += chapter.length;
    return { ...chapter, start, end: cursor / total };
  });
}

export function totalLength(chapters: readonly Chapter[]): number {
  return chapters.reduce((sum, chapter) => sum + chapter.length, 0);
}

/** The chapter `p` falls in. A boundary belongs to the chapter it starts. */
export function locate(spans: readonly ChapterSpan[], p: number): Located {
  const clamped = clamp01(p);
  let index = spans.findIndex((span) => clamped < span.end);
  if (index < 0) index = spans.length - 1;
  const span = spans[index];
  return { span, index, local: clamp01((clamped - span.start) / (span.end - span.start)) };
}

/** Overall progress of the point `local` of the way through `span`. */
export function progressAt(span: ChapterSpan, local: number): number {
  return span.start + clamp01(local) * (span.end - span.start);
}

/**
 * How far `lockerId`'s drawer is slid out at `p`, in metres.
 *
 * Out while the tour holds on it; back in while the camera travels on to the
 * next drawer, so the two moves overlap instead of queueing. The last drawer
 * has no next chapter and stays out.
 */
export function drawerPeek(spans: readonly ChapterSpan[], p: number, lockerId: string): number {
  const { span, index, local } = locate(spans, p);
  if (span.kind !== 'tour') return 0;

  if (span.lockerId === lockerId) {
    if (local < TOUR_ARRIVE) return 0;
    return PEEK_DEPTH * smoothstep((local - TOUR_ARRIVE) / (PEEK_OUT_END - TOUR_ARRIVE));
  }

  const previous = spans[index - 1];
  if (previous?.lockerId === lockerId && local < TOUR_ARRIVE) {
    return PEEK_DEPTH * (1 - smoothstep(local / TOUR_ARRIVE));
  }
  return 0;
}
