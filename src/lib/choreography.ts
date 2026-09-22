import { gsap } from './gsapConfig';
import { Vector3 } from 'three';
import {
  cameraRig,
  seizeRig,
  type CameraRig,
} from './cameraRig';
import { DRAWER_TRAVEL } from './cabinetLayout';
import { fileOffsetFor } from './fileLayout';
import { fileCameraPose, getLockerHandle, lockerCameraPose } from './lockerRegistry';
import { storySnapshot } from './storyProgress';
import { getTray } from './trayRegistry';
import { useArchiveStore } from '@/store/archiveStore';

/**
 * Every multi-step motion in the experience, in one place.
 *
 * Each function returns a promise that settles when its timeline finishes, so
 * callers can `await` a close before committing the state change. The camera
 * is moved only by tweening `cameraRig` (see cameraRig.ts) — never by touching
 * the camera directly.
 */

type Tween = Partial<CameraRig>;

function cameraTo(
  timeline: gsap.core.Timeline,
  pose: Tween,
  duration: number,
  position = 0,
  ease = 'power3.inOut',
) {
  timeline.to(cameraRig, { ...pose, duration, ease }, position);
}

function poseFromVectors(position: Vector3, target: Vector3, fov: number): Tween {
  return {
    px: position.x,
    py: position.y,
    pz: position.z,
    tx: target.x,
    ty: target.y,
    tz: target.z,
    fov,
  };
}

/**
 * Only one choreography runs at a time.
 *
 * Two overlapping timelines fight over the same drawer and the same cards: the
 * second one re-runs the deploy from the stored pose, so the files visibly
 * duck back into the drawer and come out again. That happens for real reasons
 * — an impatient second click, a React 19 StrictMode double-invoke in dev — so
 * the fix belongs here rather than at every call site.
 */
let active: gsap.core.Timeline | null = null;

function begin(): gsap.core.Timeline {
  active?.kill();
  seizeRig();
  useArchiveStore.getState().setCameraMoving(true);
  active = gsap.timeline();
  return active;
}

function settle(timeline: gsap.core.Timeline): Promise<void> {
  return new Promise((resolve) => {
    timeline.eventCallback('onComplete', () => {
      if (active === timeline) active = null;
      useArchiveStore.getState().setCameraMoving(false);
      resolve();
    });
  });
}

/**
 * Drawer lamp levels. Browsing lights the whole file; reading dims it so the
 * lifted sheet is the brightest thing in frame.
 */
const LAMP = { browsing: 0.9, reading: 0.25 } as const;

/** Duration scale — reduced-motion users get the same choreography, faster. */
function speed(): number {
  return useArchiveStore.getState().prefersReducedMotion ? 0.35 : 1;
}

/* ------------------------------------------------------------------ locker */

/**
 * Camera in, drawer out, lamp up, then the files rise out in sequence.
 *
 * Held together as one timeline so the beats cannot drift apart on a slow
 * frame. The drawer uses `back.out` with a small overshoot: a real drawer on
 * runners carries a little past its stop and settles, and that single easing
 * choice does more for the mechanical feel than any amount of extra geometry.
 */
export function openLocker(lockerId: string): Promise<void> {
  const handle = getLockerHandle(lockerId);
  const pose = lockerCameraPose(lockerId);
  if (!handle || !pose) return Promise.resolve();

  const tl = begin();
  const s = speed();

  cameraTo(tl, poseFromVectors(pose.position, pose.target, pose.fov), 1.25 * s, 0);

  tl.to(
    handle.drawer.position,
    {
      z: DRAWER_TRAVEL,
      duration: 1.05 * s,
      ease: 'back.out(1.25)',
    },
    0.48 * s,
  );

  if (handle.interiorLight) {
    tl.to(
      handle.interiorLight,
      { intensity: LAMP.browsing, duration: 0.6 * s, ease: 'power1.out' },
      0.72 * s,
    );
  }

  // The files only come out once the drawer is actually open. The tray is
  // already mounted and registered by now: it registers in a layout effect,
  // and every layout effect in a commit flushes before this passive effect.
  const deployAt = 1.24 * s;
  tl.call(() => useArchiveStore.getState().setLockerOpen(true), undefined, deployAt);

  const tray = getTray();
  if (tray) tl.add(tray.deploy(), deployAt);

  return settle(tl);
}

/**
 * Files back in, drawer shut, camera back to the scroll's frame.
 *
 * "Back" is wherever the scroll is: the vault overview, or a tour chapter
 * with its drawer peeking out. The targets come from `storySnapshot()` — the
 * same maths the scroll applies the moment it takes over again — so the
 * hand-back has nothing to jump.
 */
export function closeLocker(lockerId: string): Promise<void> {
  const handle = getLockerHandle(lockerId);
  const back = storySnapshot();
  const tl = begin();
  useArchiveStore.getState().setLockerOpen(false);

  const s = speed();

  const tray = getTray();
  if (tray) tl.add(tray.retract(), 0);

  if (handle) {
    tl.to(
      handle.drawer.position,
      { z: back.peeks[lockerId] ?? 0, duration: 0.85 * s, ease: 'power2.inOut' },
      0.34 * s,
    );
    if (handle.interiorLight) {
      tl.to(
        handle.interiorLight,
        { intensity: 0, duration: 0.5 * s, ease: 'power2.out' },
        0.32 * s,
      );
    }
  }

  cameraTo(tl, back.camera, 1.15 * s, 0.4 * s);

  return settle(tl);
}

/* -------------------------------------------------------------------- file */

/**
 * Pull the chosen card up out of the file and move in on it.
 *
 * The card leads by a beat: it starts rising before the camera commits, so the
 * move reads as following a card that is already on its way out rather than
 * the camera dragging it along.
 */
export function openFile(lockerId: string, fileId: string): Promise<void> {
  const offset = fileOffsetFor(lockerId, fileId);
  if (!offset) return Promise.resolve();

  const pose = fileCameraPose(lockerId, offset);
  if (!pose) return Promise.resolve();

  const tl = begin();
  const s = speed();

  const tray = getTray();
  if (tray) tl.add(tray.raise(fileId), 0);

  // Bring the drawer lamp down while a single sheet is being read: the file
  // behind drops back and the lifted card, lit by the room's key light alone,
  // becomes the one bright thing in frame.
  const lamp = getLockerHandle(lockerId)?.interiorLight;
  if (lamp) tl.to(lamp, { intensity: LAMP.reading, duration: 0.6 * s, ease: 'power1.out' }, 0.1 * s);

  cameraTo(
    tl,
    poseFromVectors(pose.position, pose.target, pose.fov),
    0.95 * s,
    0.12 * s,
    'power3.out',
  );
  return settle(tl);
}

/** Drop the card back into the file and pull out to the whole drawer. */
export function closeFile(lockerId: string): Promise<void> {
  const pose = lockerCameraPose(lockerId);
  if (!pose) return Promise.resolve();

  const tl = begin();
  const s = speed();

  const tray = getTray();
  if (tray) tl.add(tray.lower(), 0);

  const lamp = getLockerHandle(lockerId)?.interiorLight;
  if (lamp) tl.to(lamp, { intensity: LAMP.browsing, duration: 0.5 * s, ease: 'power1.out' }, 0.2 * s);

  cameraTo(
    tl,
    poseFromVectors(pose.position, pose.target, pose.fov),
    0.9 * s,
    0.1 * s,
    'power3.inOut',
  );
  return settle(tl);
}

