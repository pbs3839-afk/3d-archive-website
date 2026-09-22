import type gsap from 'gsap';

/**
 * How the choreographer reaches the file cards.
 *
 * `<FileTray>` knows the card refs and their target poses; the choreographer
 * knows when in the sequence they should move. Rather than leak refs upward,
 * the tray publishes timeline factories and the choreographer nests the
 * returned timelines inside its own — so the whole open/close sequence stays a
 * single GSAP timeline with one set of easing and one completion callback.
 */
export interface TrayController {
  /** Cards stand up out of the drawer floor into their filed positions. */
  deploy: () => gsap.core.Timeline;
  /** Cards lie back down flat before the drawer shuts. */
  retract: () => gsap.core.Timeline;
  /** Lift one card clear of the file; everything else settles back. */
  raise: (fileId: string) => gsap.core.Timeline;
  /** Put every card back in the file. */
  lower: () => gsap.core.Timeline;
  /** Snap to current poses with no animation, after a viewport change. */
  relayout: () => void;
}

let controller: TrayController | null = null;

export function registerTray(next: TrayController | null): void {
  controller = next;
}

export function getTray(): TrayController | null {
  return controller;
}
