import { LOCKERS } from '@/data/archive';
import { cameraRig, currentOverviewPose, type CameraRig } from './cameraRig';
import {
  TOUR_ARRIVE,
  buildChapters,
  drawerPeek,
  locate,
  smoothstep,
  type ChapterSpan,
} from './chapters';
import { applyIntroProgress, introCameraPose, stageForProgress } from './introTimeline';
import { getLockerHandle, tourCameraPose } from './lockerRegistry';

/**
 * The whole scroll, as a pure function of overall progress.
 *
 * The opening chapter IS the old intro: it calls `applyIntroProgress` with the
 * chapter's own progress, so the first part of the page looks and paces
 * exactly as it did. After it the lights stay up and the doors stay open; the
 * camera holds on the vault, then visits each drawer in turn while the drawer
 * it is holding on slides out a few centimetres.
 *
 * Every chapter starts where the previous one ends, so a boundary has nothing
 * to jump. The same maths answers "where should the scene be at p?" without
 * moving anything (`storySnapshot`), which is how closing a drawer returns to
 * exactly the frame the scroll draws next.
 */

export type StoryStage = 'intro' | 'approach' | 'vault' | 'tour';

export interface StoryState {
  stage: StoryStage;
  /** Drawer of the current tour chapter, travel included; null outside the tour. */
  tourStop: string | null;
  /** True while a tour chapter holds on its drawer. */
  tourReady: boolean;
}

export interface StorySnapshot {
  camera: CameraRig;
  /** How far each tour drawer is slid out, by locker id. */
  peeks: Record<string, number>;
}

const TOUR_IDS = LOCKERS.map((locker) => locker.id);

/**
 * How far the camera closes in over a hold, as a share of its distance to
 * the target. Just enough that a held frame never reads as frozen.
 */
const VAULT_PUSH = 0.03;
const TOUR_PUSH = 0.04;

let spans: ChapterSpan[] = buildChapters(false, TOUR_IDS);
let lastProgress = 0;

/** Rebuild the chapter table for the viewport class, and return it. */
export function setStoryLayout(narrow: boolean): readonly ChapterSpan[] {
  spans = buildChapters(narrow, TOUR_IDS);
  return spans;
}

export function getSpans(): readonly ChapterSpan[] {
  return spans;
}

function mix(a: CameraRig, b: CameraRig, t: number): CameraRig {
  return {
    px: a.px + (b.px - a.px) * t,
    py: a.py + (b.py - a.py) * t,
    pz: a.pz + (b.pz - a.pz) * t,
    tx: a.tx + (b.tx - a.tx) * t,
    ty: a.ty + (b.ty - a.ty) * t,
    tz: a.tz + (b.tz - a.tz) * t,
    fov: a.fov + (b.fov - a.fov) * t,
  };
}

/** Move the camera `amount` of the way toward what it is looking at. */
function pushIn(pose: CameraRig, amount: number): CameraRig {
  return {
    ...pose,
    px: pose.px + (pose.tx - pose.px) * amount,
    py: pose.py + (pose.ty - pose.py) * amount,
    pz: pose.pz + (pose.tz - pose.pz) * amount,
  };
}

function tourPose(lockerId: string): CameraRig {
  const pose = tourCameraPose(lockerId);
  if (!pose) return currentOverviewPose('vault');
  return {
    px: pose.position.x,
    py: pose.position.y,
    pz: pose.position.z,
    tx: pose.target.x,
    ty: pose.target.y,
    tz: pose.target.z,
    fov: pose.fov,
  };
}

/** Where the camera rests at the end of chapter `index`. */
function stationEnd(index: number): CameraRig {
  const span = spans[index];
  if (span?.kind === 'tour' && span.lockerId) return pushIn(tourPose(span.lockerId), TOUR_PUSH);
  return pushIn(currentOverviewPose('vault'), VAULT_PUSH);
}

function cameraAt(p: number): CameraRig {
  const { span, index, local } = locate(spans, p);
  if (span.kind === 'opening') return introCameraPose(local);
  if (span.kind === 'vault') return pushIn(currentOverviewPose('vault'), VAULT_PUSH * local);

  if (!span.lockerId) return stationEnd(index - 1);
  const station = tourPose(span.lockerId);
  if (local < TOUR_ARRIVE) {
    return mix(stationEnd(index - 1), station, smoothstep(local / TOUR_ARRIVE));
  }
  return pushIn(station, (TOUR_PUSH * (local - TOUR_ARRIVE)) / (1 - TOUR_ARRIVE));
}

function peeksAt(p: number): Record<string, number> {
  const peeks: Record<string, number> = {};
  for (const id of TOUR_IDS) peeks[id] = drawerPeek(spans, p, id);
  return peeks;
}

/**
 * Put the scene where the scroll says it is, and report the stage and tour
 * position for the caller to commit to the store.
 *
 * Must not run while a drawer is open: the click choreography owns the camera
 * and that drawer then. `<ScrollIntro>` checks before calling.
 */
export function applyStoryProgress(p: number): StoryState {
  lastProgress = p;
  const { span, local } = locate(spans, p);

  // Lights, reflections and the outer doors: the opening animates them, and
  // after it they stay fully up and fully open.
  applyIntroProgress(span.kind === 'opening' ? local : 1);
  Object.assign(cameraRig, cameraAt(p));

  const peeks = peeksAt(p);
  for (const id of TOUR_IDS) {
    const drawer = getLockerHandle(id)?.drawer;
    if (drawer) drawer.position.z = peeks[id];
  }

  if (span.kind === 'opening') {
    return { stage: stageForProgress(local), tourStop: null, tourReady: false };
  }
  if (span.kind === 'vault') return { stage: 'vault', tourStop: null, tourReady: false };
  return { stage: 'tour', tourStop: span.lockerId ?? null, tourReady: local >= TOUR_ARRIVE };
}

/**
 * The scene the scroll would draw at `p` — by default the last progress it
 * applied — without moving anything.
 */
export function storySnapshot(p: number = lastProgress): StorySnapshot {
  return { camera: cameraAt(p), peeks: peeksAt(p) };
}
