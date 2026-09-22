import { cameraRig } from './cameraRig';
import { fileOffsetFor } from './fileLayout';
import { fileCameraPose, lockerCameraPose } from './lockerRegistry';
import { getTray } from './trayRegistry';
import { useArchiveStore } from '@/store/archiveStore';

/** Return false while an existing transition still owns the cards and camera. */
export function reframeSelection(): boolean {
  const { stage, selectedLocker, selectedFile, isCameraMoving, isLockerOpen } =
    useArchiveStore.getState();
  if (isCameraMoving) return false;
  if (!selectedLocker || !isLockerOpen) return true;

  const offset = selectedFile ? fileOffsetFor(selectedLocker, selectedFile) : null;
  const pose = stage === 'file' && offset
    ? fileCameraPose(selectedLocker, offset)
    : lockerCameraPose(selectedLocker);
  if (!pose) return true;

  getTray()?.relayout();
  Object.assign(cameraRig, {
    px: pose.position.x, py: pose.position.y, pz: pose.position.z,
    tx: pose.target.x, ty: pose.target.y, tz: pose.target.z,
    fov: pose.fov,
  });
  return true;
}
