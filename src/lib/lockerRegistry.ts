import type { Object3D, PointLight } from 'three';
import { Vector3 } from 'three';
import { filedCardPose } from './cabinetLayout';
import { closeDistance, closeFrame, panelAwareShot, tourShot, type CloseFrame } from './cameraRig';

/**
 * The seam that makes the GLB swap a non-event.
 *
 * Whoever renders a locker — the procedural fallback today, a GLB node
 * tomorrow — registers the Object3Ds that make it up. The camera controller
 * and the animation choreographer then ask this registry for nodes and world
 * transforms instead of recomputing layout maths, so they keep working even if
 * the Blender model uses different proportions, pivots or units.
 */
export interface LockerHandle {
  /** Origin sits on the locker's closed face, +Z facing out of the cabinet. */
  root: Object3D;
  /** The drawer. Translating this along its local +Z pulls it open. */
  drawer: Object3D;
  interiorLight: PointLight | null;
}

const handles = new Map<string, LockerHandle>();

export function registerLocker(id: string, handle: LockerHandle | null): void {
  if (handle) {
    handles.set(id, handle);
  } else {
    handles.delete(id);
  }
}

export function getLockerHandle(id: string | null): LockerHandle | undefined {
  return id ? handles.get(id) : undefined;
}

const scratchNormal = new Vector3();

/** World position of a locker's face centre, or null if it has not mounted. */
export function getLockerWorldPosition(
  id: string,
  target = new Vector3(),
): Vector3 | null {
  const handle = handles.get(id);
  if (!handle) return null;
  handle.root.updateWorldMatrix(true, false);
  return target.setFromMatrixPosition(handle.root.matrixWorld);
}

/** Outward-facing normal of a locker (its local +Z in world space). */
export function getLockerWorldNormal(
  id: string,
  target = new Vector3(),
): Vector3 | null {
  const handle = handles.get(id);
  if (!handle) return null;
  handle.root.updateWorldMatrix(true, false);
  return target.set(0, 0, 1).transformDirection(handle.root.matrixWorld).normalize();
}

export interface CameraPose {
  position: Vector3;
  target: Vector3;
  fov: number;
}

const UP = new Vector3(0, 1, 0);

/**
 * Place a camera so that `focus` sits at exactly `distance`, offset off-axis
 * by `tilt` (a fraction of the distance, upward).
 *
 * The distance has to be measured to the thing being FRAMED, not to some
 * nearby landmark. Solving a stand-off that frames the fan and then measuring
 * it from the locker face instead put the camera most of a metre too close and
 * blew the cards off both edges of the screen.
 */
function poseAround(
  focus: Vector3,
  normal: Vector3,
  distance: number,
  tilt: number,
): { position: Vector3; target: Vector3 } {
  const direction = normal.clone().addScaledVector(UP, tilt).normalize();
  return {
    position: focus.clone().addScaledVector(direction, distance),
    target: focus.clone(),
  };
}

/**
 * Angle the locker shot looks down from, in radians above the horizon.
 *
 * The hanging tabs clear the drawer front at any angle; what this buys is the
 * view down into the file past them. Steeper shows more of each card behind
 * the one in front, flatter reads more like a cabinet and less like a drawer.
 * 60 degrees keeps a tab-and-a-half of each card visible.
 */
const LOOK_DOWN = 1.047;

/**
 * Camera pose that looks down into an open drawer.
 *
 * The shot frames the filed cards, not the cabinet: the viewer is standing
 * over a pulled-out drawer reading tabs, which is what the interaction now
 * asks them to do.
 */
export function lockerCameraPose(id: string): CameraPose | null {
  const position = getLockerWorldPosition(id);
  if (!position) return null;
  const normal = getLockerWorldNormal(id, scratchNormal)?.clone() ?? new Vector3(0, 0, 1);

  const frame = closeFrame('locker');
  const count = 4; // deepest file stack; framing the worst case keeps it stable
  const mid = filedCardPose(Math.max(0, (count - 1) * 0.62));

  const focus = position
    .clone()
    .addScaledVector(normal, mid.position[2])
    .addScaledVector(UP, mid.position[1]);

  const distance = closeDistance(frame);
  const direction = normal
    .clone()
    .multiplyScalar(Math.cos(LOOK_DOWN))
    .addScaledVector(UP, Math.sin(LOOK_DOWN))
    .normalize();

  const cameraPosition = focus.clone().addScaledVector(direction, distance);
  // Drift toward the cabinet's centre line so the shot is angled, not flat.
  cameraPosition.x += (0 - cameraPosition.x) * 0.3;

  return { position: cameraPosition, target: focus, fov: frame.fov };
}

/**
 * Camera pose for a single card sitting in the fan above a locker.
 *
 * The dossier panel opens at the same time and covers part of the viewport —
 * the right side on a wide screen, the bottom on a narrow one. Centring the
 * card in the *viewport* would therefore centre it underneath the panel, so
 * the whole view is translated (camera and target together, which slides the
 * framing without skewing the shot) to centre the card in what is left.
 */
export function fileCameraPose(
  lockerId: string,
  cardOffset: Vector3,
): CameraPose | null {
  const lockerPosition = getLockerWorldPosition(lockerId);
  if (!lockerPosition) return null;
  const normal = getLockerWorldNormal(lockerId, scratchNormal)?.clone() ?? new Vector3(0, 0, 1);

  const frame = closeFrame('file');
  const shot = panelAwareShot(frame);
  const cardWorld = lockerPosition.clone().add(cardOffset);
  const pose = poseAround(cardWorld, normal, shot.distance, 0.08);

  const shift = new Vector3(shot.shiftX, shot.shiftY, 0);
  pose.position.add(shift);
  pose.target.add(shift);

  return { position: pose.position, target: pose.target, fov: frame.fov };
}

/**
 * What the tour holds in frame around each drawer: the 0.91 × 0.69 m front
 * and a margin of cabinet round it.
 */
const TOUR_FRAME: CloseFrame = { width: 1.7, height: 1.1, fov: 40 };
/** The tour looks down on each drawer by 10 degrees. */
const TOUR_LOOK_DOWN = (10 * Math.PI) / 180;
/** Share of the way an edge-column shot is drawn toward the cabinet's centre line. */
const TOUR_CENTRE_PULL = 0.25;

/**
 * Camera pose the drawer tour holds on for one drawer.
 *
 * Solved live from the current viewport like every other pose, so a resize
 * re-frames it. The whole view — camera and target together — is slid left so
 * the drawer sits in the middle of the part of the screen the title card
 * leaves free. Same fov as the vault shot, so the move there is pure travel.
 */
export function tourCameraPose(id: string): CameraPose | null {
  const focus = getLockerWorldPosition(id);
  if (!focus) return null;
  const normal = getLockerWorldNormal(id, scratchNormal)?.clone() ?? new Vector3(0, 0, 1);

  const shot = tourShot(TOUR_FRAME);
  const direction = normal
    .clone()
    .multiplyScalar(Math.cos(TOUR_LOOK_DOWN))
    .addScaledVector(UP, Math.sin(TOUR_LOOK_DOWN))
    .normalize();

  const position = focus.clone().addScaledVector(direction, shot.distance);
  // Drift toward the cabinet's centre line so the edge columns are seen
  // slightly from the side, like the drawer shot.
  position.x += (0 - position.x) * TOUR_CENTRE_PULL;

  const shift = new Vector3(shot.shiftX, shot.shiftY, 0);
  return {
    position: position.add(shift),
    target: focus.clone().add(shift),
    fov: TOUR_FRAME.fov,
  };
}

