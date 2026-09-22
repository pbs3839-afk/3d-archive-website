import { Vector3 } from 'three';
import { getLocker } from '@/data/archive';
import { raisedCardPose } from './cabinetLayout';

/**
 * Offset of the SELECTED card from its locker's closed face.
 *
 * The selected card is the raised one — lifted clear of the drawer and turned
 * square to the camera — so this reports where it ends up, not where it sits
 * while filed. Deriving it from the same `raisedCardPose` the tray animates to
 * keeps the close-up framed on the card rather than on where it used to be.
 */
export function fileOffsetFor(
  lockerId: string,
  fileId: string,
): Vector3 | null {
  const locker = getLocker(lockerId);
  if (!locker) return null;

  const index = locker.files.findIndex((file) => file.id === fileId);
  if (index < 0) return null;

  return new Vector3(...raisedCardPose(index).position);
}
