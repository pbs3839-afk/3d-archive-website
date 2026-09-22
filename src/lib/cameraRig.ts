import { gsap } from './gsapConfig';
import { CABINET, CABINET_CENTER_Y, PLINTH_HEIGHT } from './cabinetLayout';

/**
 * The camera's single source of truth.
 *
 * Nothing in this project touches `camera.position` directly. Every animation
 * — the scroll intro, the locker zoom, the file close-up — tweens this plain
 * object, and `<CameraController>` copies it onto the real camera once per
 * frame. That is what keeps scroll-driven and click-driven motion from
 * fighting over the same transform, which is the usual way these scenes fall
 * apart.
 */
export interface CameraRig {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
}

export type OverviewPoseName = 'intro' | 'reveal' | 'approach' | 'vault';

interface OverviewSpec {
  /** Metres of cabinet that must be visible across the frame. */
  frameWidth: number;
  /** Metres that must be visible top to bottom. */
  frameHeight: number;
  py: number;
  ty: number;
  fov: number;
}

/**
 * The cabinet's real vertical extent: plinth, body, and the cornice that
 * overhangs the top.
 */
export const CABINET_VISUAL_HEIGHT = PLINTH_HEIGHT + CABINET.height + 0.05;

/**
 * Frame height that leaves `margin` metres of clear space above AND below the
 * cabinet.
 *
 * The margin is the number worth authoring; the frame height is arithmetic.
 * Writing the heights directly is how the vault pose ended up at 2.95 against
 * a 2.72m cabinet — 11cm of headroom, which the aim offset then spent, and the
 * cornice cropped off the top edge of every landscape viewport.
 */
const withMargin = (margin: number): number =>
  CABINET_VISUAL_HEIGHT + margin * 2;

/**
 * The wide shots are specified as "how much must be visible", not as a fixed
 * Z. A 3.24m-wide cabinet simply does not fit a portrait phone at the distance
 * that frames it on a desktop, so the distance is solved per viewport instead.
 * On a narrow screen `frameWidth` also shrinks: cropping the cabinet's outer
 * edges keeps it a decent size on screen, which reads far better than a
 * correctly-framed but postage-stamp-sized cabinet.
 *
 * `ty` sits a hair below the cabinet's centre so it seats slightly high in
 * frame, leaving the lower third to the compartment index. Pushing that offset
 * further drives the cornice into the HUD readout.
 */
const OVERVIEW: Record<OverviewPoseName, OverviewSpec> = {
  intro: {
    frameWidth: 9,
    frameHeight: withMargin(1.84),
    py: 1.78,
    ty: CABINET_CENTER_Y,
    fov: 34,
  },
  reveal: {
    frameWidth: 5.6,
    frameHeight: withMargin(0.94),
    py: 1.66,
    ty: CABINET_CENTER_Y,
    fov: 36,
  },
  approach: {
    frameWidth: 4.5,
    frameHeight: withMargin(0.54),
    py: 1.54,
    ty: CABINET_CENTER_Y - 0.02,
    fov: 38,
  },
  vault: {
    frameWidth: 4,
    frameHeight: withMargin(0.34),
    py: 1.48,
    ty: CABINET_CENTER_Y - 0.02,
    fov: 40,
  },
};

/** Narrow viewports frame less of the cabinet's width, on purpose. */
function widthBudget(frameWidth: number, aspect: number): number {
  if (aspect < 0.75) return Math.min(frameWidth, 2.5);
  if (aspect < 1.2) return Math.min(frameWidth, 3.3);
  return frameWidth;
}

/** Distance at which `frameWidth` x `frameHeight` both fit the given frustum. */
export function fitDistance(
  frameWidth: number,
  frameHeight: number,
  fovDeg: number,
  aspect: number,
): number {
  const vHalf = (fovDeg * Math.PI) / 360;
  const tanV = Math.tan(vHalf);
  const tanH = tanV * aspect;

  const forHeight = frameHeight / 2 / tanV;
  const forWidth = frameWidth / 2 / tanH;
  return Math.max(forHeight, forWidth);
}

export function overviewPose(name: OverviewPoseName, aspect: number): CameraRig {
  const spec = OVERVIEW[name];
  const safeAspect = Number.isFinite(aspect) && aspect > 0.2 ? aspect : 1.7;
  const distance = fitDistance(
    widthBudget(spec.frameWidth, safeAspect),
    spec.frameHeight,
    spec.fov,
    safeAspect,
  );

  return {
    px: 0,
    py: spec.py,
    pz: CABINET.depth / 2 + distance,
    tx: 0,
    ty: spec.ty,
    tz: 0,
    fov: spec.fov,
  };
}

/**
 * Current canvas size, published by `<CameraController>`.
 *
 * Kept here rather than in the Zustand store because the scroll timeline and
 * the choreography are plain modules that need it synchronously while building
 * tweens; routing it through React state would make every resize a render.
 */
let viewportAspect = 1.7;
let viewportWidth = 1280;
let viewportHeight = 753;

export function setViewportSize(width: number, height: number): void {
  if (!(width > 0) || !(height > 0)) return;
  viewportWidth = width;
  viewportHeight = height;
  viewportAspect = width / height;
}

export function getViewportAspect(): number {
  return viewportAspect;
}

/**
 * Where the dossier panel sits. MUST match the `max-width: 767px` query in
 * FileDetailPanel.module.css.
 *
 * The camera has to shift the card out from under the panel, which means it
 * has to know which edge the panel is on. Deriving that from the aspect ratio
 * instead of the width is subtly wrong and produces a shot that is confidently
 * framed in the wrong direction: at 791x914 the aspect says "portrait" while
 * the CSS is still rendering a right-hand rail, so the card gets nudged up and
 * stays hidden behind the panel.
 */
export const PANEL_BREAKPOINT = 768;

export function isPanelBottomSheet(): boolean {
  return viewportWidth < PANEL_BREAKPOINT;
}

/**
 * How much of the viewport the open dossier panel hides, as a fraction per
 * axis. These MUST track the sizes in FileDetailPanel.module.css.
 *
 * Framing the card and then nudging it sideways is not enough: on a viewport
 * only a little wider than the breakpoint the frame is barely wider than the
 * card, so the nudge pushes it straight off the other edge. The frame itself
 * has to be widened by the panel's share, which is what `closeFrameFor` below
 * does with these numbers.
 */
export function panelCoverage(): { x: number; y: number } {
  if (isPanelBottomSheet()) {
    return { x: 0, y: Math.min(0.64, 560 / viewportHeight) };
  }
  return { x: Math.min(430, viewportWidth * 0.4) / viewportWidth, y: 0 };
}

/** The pose for `name` at the current viewport. */
export function currentOverviewPose(name: OverviewPoseName): CameraRig {
  return overviewPose(name, viewportAspect);
}

/** Live rig, seeded with a sensible desktop framing before the canvas mounts. */
export const cameraRig: CameraRig = overviewPose('intro', 1.7);

/** Stop whatever is currently animating the rig before taking it over. */
export function seizeRig(): void {
  gsap.killTweensOf(cameraRig);
}

/**
 * Close shots are framed the same way the wide ones are: by what must be
 * visible, not by a fixed distance. A hard-coded stand-off that looks right on
 * a 16:9 monitor crops the file fan off both sides of a portrait phone.
 *
 * The locker frame has to hold the open drawer *and* the fan of cards above
 * it; the file frame just holds one card with margin.
 */
export const CLOSE_FRAMES = {
  locker: {
    // Holds one drawer's filed cards seen from above: 0.58 of card width plus
    // margin, and the depth of the stack foreshortened by the look-down angle.
    landscape: { width: 1.35, height: 0.8, fov: 42 },
    portrait: { width: 0.95, height: 0.95, fov: 42 },
  },
  file: {
    landscape: { width: 0.95, height: 0.62, fov: 38 },
    portrait: { width: 0.78, height: 0.58, fov: 38 },
  },
} as const;

export interface CloseFrame {
  width: number;
  height: number;
  fov: number;
}

export function closeFrame(kind: 'locker' | 'file'): CloseFrame {
  const set = CLOSE_FRAMES[kind];
  return viewportAspect < 1 ? set.portrait : set.landscape;
}

/** Distance that fits `frame` at the current viewport. */
export function closeDistance(frame: CloseFrame): number {
  return fitDistance(frame.width, frame.height, frame.fov, viewportAspect);
}

export interface PanelAwareShot {
  distance: number;
  /** World-space offset to apply to BOTH camera and target. */
  shiftX: number;
  shiftY: number;
}

/**
 * Solve a close shot that has to live beside the open dossier panel.
 *
 * The subject must fill the part of the frame the panel is NOT covering, so
 * the frame is inflated by the panel's share and then the whole view is slid
 * by half of that share. Camera and target move together, which translates the
 * framing without skewing the shot into a weird off-axis angle.
 */
export function panelAwareShot(frame: CloseFrame): PanelAwareShot {
  const cover = panelCoverage();
  const width = frame.width / Math.max(0.35, 1 - cover.x);
  const height = frame.height / Math.max(0.35, 1 - cover.y);

  return {
    distance: fitDistance(width, height, frame.fov, viewportAspect),
    shiftX: (width * cover.x) / 2,
    shiftY: (-height * cover.y) / 2,
  };
}
