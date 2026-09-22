import { OUTER_DOOR_OPEN_ANGLE } from './cabinetLayout';
import { cameraRig, currentOverviewPose, type CameraRig, type OverviewPoseName } from './cameraRig';
import { LIGHT_TARGETS, getSceneHandles, setAmbientLevel } from './sceneRegistry';
import { getVaultDoors } from './vaultRegistry';
import { openRotationFor } from '@/components/canvas/HingedPanel';

/**
 * The scroll intro, expressed as a pure function of progress.
 *
 * Written as a mapping rather than a GSAP timeline of tweens on purpose. The
 * canvas mounts asynchronously (it is a client-only dynamic import), so at the
 * moment the ScrollTrigger is created the doors and lights may not exist yet;
 * a timeline built against them would silently animate nothing. Reading the
 * registries on every update also means a resize re-frames the shot correctly
 * mid-scroll, because the poses are solved live from the current aspect.
 *
 * ScrollTrigger still does what it is good at: it drives `p` with `scrub`
 * smoothing. See `<ScrollIntro>`.
 */

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

/** Progress within [start, end], eased so segment joins do not read as kinks. */
function segment(p: number, start: number, end: number): number {
  const t = clamp01((p - start) / (end - start));
  return t * t * (3 - 2 * t); // smoothstep
}

const SEGMENTS: Array<{ from: OverviewPoseName; to: OverviewPoseName; start: number; end: number }> =
  [
    { from: 'intro', to: 'reveal', start: 0, end: 0.38 },
    { from: 'reveal', to: 'approach', start: 0.38, end: 0.72 },
    { from: 'approach', to: 'vault', start: 0.72, end: 1 },
  ];

const LIGHTS_IN = { start: 0.08, end: 0.56 };
const DOORS_OPEN = { start: 0.74, end: 0.985 };

/** Progress past which the lockers become selectable. */
export const VAULT_OPEN_AT = 0.97;
/** Progress at which the title card has fully handed over to the scene. */
export const TITLE_OUT_AT = 0.26;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Camera pose of the intro at progress `p`, without touching the rig.
 *
 * Split out so the story can ask "where would the camera be?" — closing a
 * drawer returns to exactly that frame (see `storySnapshot`).
 */
export function introCameraPose(p: number): CameraRig {
  const active =
    SEGMENTS.find((s) => p < s.end) ?? SEGMENTS[SEGMENTS.length - 1];
  const from = currentOverviewPose(active.from);
  const to = currentOverviewPose(active.to);
  const t = segment(p, active.start, active.end);

  return {
    px: lerp(from.px, to.px, t),
    py: lerp(from.py, to.py, t),
    pz: lerp(from.pz, to.pz, t),
    tx: lerp(from.tx, to.tx, t),
    ty: lerp(from.ty, to.ty, t),
    tz: lerp(from.tz, to.tz, t),
    fov: lerp(from.fov, to.fov, t),
  };
}

export function applyIntroProgress(p: number): void {
  /* -------------------------------------------------------------- camera */
  Object.assign(cameraRig, introCameraPose(p));

  /* -------------------------------------------------------------- lights */
  const lit = segment(p, LIGHTS_IN.start, LIGHTS_IN.end);
  const { keyLight, fillLight } = getSceneHandles();
  if (keyLight) keyLight.intensity = LIGHT_TARGETS.key * lit;
  if (fillLight) fillLight.intensity = LIGHT_TARGETS.fill * lit;
  setAmbientLevel(lit);

  /* --------------------------------------------------------- outer doors */
  const swing = segment(p, DOORS_OPEN.start, DOORS_OPEN.end);
  const doors = getVaultDoors();
  if (doors.left) {
    doors.left.rotation.y = openRotationFor('left', OUTER_DOOR_OPEN_ANGLE) * swing;
  }
  if (doors.right) {
    doors.right.rotation.y = openRotationFor('right', OUTER_DOOR_OPEN_ANGLE) * swing;
  }
}

/** Stage implied by a scroll position. */
export function stageForProgress(p: number): 'intro' | 'approach' | 'vault' {
  if (p >= VAULT_OPEN_AT) return 'vault';
  if (p >= TITLE_OUT_AT) return 'approach';
  return 'intro';
}
