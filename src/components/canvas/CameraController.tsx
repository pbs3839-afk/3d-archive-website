'use client';

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector2, Vector3 } from 'three';
import { cameraRig, setViewportSize } from '@/lib/cameraRig';
import { reframeSelection } from '@/lib/reframeSelection';
import { ScrollTrigger } from '@/lib/gsapConfig';
import { useArchiveStore, type Stage } from '@/store/archiveStore';

/**
 * How far the camera drifts with the pointer, per stage.
 *
 * A locked-off camera makes a still frame look like a screenshot. A few
 * centimetres of parallax is enough to read as a held shot rather than a
 * freeze — and it has to shrink as the camera closes in, because the same
 * offset that is barely visible across the whole cabinet swings wildly when
 * the frame is one index card wide.
 */
const DRIFT_BY_STAGE: Record<Stage, number> = {
  intro: 0.14,
  approach: 0.1,
  vault: 0.08,
  tour: 0.06,
  locker: 0.045,
  file: 0.018,
};

/**
 * The only thing in the app that writes to the camera.
 *
 * Reads `cameraRig` once per frame and applies it. Because every animation
 * tweens the rig instead of the camera, the scroll intro and the click
 * choreography can hand control back and forth without ever producing a jump.
 * Parallax is added here, on top of the rig, so it never contaminates the
 * poses the timelines animate between.
 */
export function CameraController() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const isTouch = useArchiveStore((s) => s.isTouch);
  const prefersReducedMotion = useArchiveStore((s) => s.prefersReducedMotion);
  const stage = useArchiveStore((s) => s.stage);

  const target = useRef(new Vector3());
  const drift = useRef(new Vector2());
  const needsReframe = useRef(false);

  // Publish the aspect so the pose solver and the file layout can react to the
  // viewport without going through React state.
  useEffect(() => {
    setViewportSize(size.width, size.height);
    needsReframe.current = true;
  }, [size.width, size.height]);

  const driftAmount = isTouch || prefersReducedMotion ? 0 : DRIFT_BY_STAGE[stage];

  useFrame((state, delta) => {
    if (needsReframe.current && reframeSelection()) {
      needsReframe.current = false;
      ScrollTrigger.refresh();
    }
    camera.position.set(cameraRig.px, cameraRig.py, cameraRig.pz);

    // Ease toward the pointer rather than tracking it, so a flick of the mouse
    // reads as the camera settling, not snapping.
    const k = 1 - Math.exp(-delta * 2.6);
    drift.current.x += (state.pointer.x * driftAmount - drift.current.x) * k;
    drift.current.y += (state.pointer.y * driftAmount * 0.55 - drift.current.y) * k;
    camera.position.x += drift.current.x;
    camera.position.y += drift.current.y;

    target.current.set(cameraRig.tx, cameraRig.ty, cameraRig.tz);
    camera.lookAt(target.current);

    if (camera instanceof PerspectiveCamera && camera.fov !== cameraRig.fov) {
      camera.fov = cameraRig.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
