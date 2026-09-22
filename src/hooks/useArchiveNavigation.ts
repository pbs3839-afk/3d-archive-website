'use client';

import { useCallback, useEffect } from 'react';
import { cameraRig } from '@/lib/cameraRig';
import { closeFile, closeLocker } from '@/lib/choreography';
import { getLockerHandle, getLockerWorldPosition } from '@/lib/lockerRegistry';
import { applyStoryProgress, getSpans, storySnapshot } from '@/lib/storyProgress';
import { useArchiveStore } from '@/store/archiveStore';

/**
 * Stepping back, from anywhere.
 *
 * The exit animation runs to completion *before* the state changes. If the
 * state changed first, `<FileTray>` would unmount and the cards would vanish
 * instead of sliding back into the locker.
 *
 * Reads the store imperatively so the returned callback is stable and never
 * closes over a stale stage.
 */
export function useBack(): () => void {
  return useCallback(() => {
    const { stage, selectedLocker, isCameraMoving, goBack } =
      useArchiveStore.getState();

    if (isCameraMoving || !selectedLocker) return;

    if (stage === 'file') {
      void closeFile(selectedLocker).then(goBack);
      return;
    }
    if (stage === 'locker') {
      void closeLocker(selectedLocker).then(goBack);
    }
  }, []);
}

/** Escape steps back one stage — the keyboard equivalent of the HUD button. */
export function useEscapeToGoBack(): void {
  const back = useBack();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      const { stage } = useArchiveStore.getState();
      if (stage !== 'locker' && stage !== 'file') return;
      event.preventDefault();
      back();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [back]);
}

/**
 * Expose the store — and the story's own maths — for debugging and the
 * browser tests, in development only.
 *
 * Almost everything interesting here happens in refs, module registries and
 * GSAP timelines, none of which show up in React DevTools. One handle on
 * `window` turns "why did that open?" into a one-line question. `__story`
 * lets the tour test apply a progress directly (no scroll smoothing), read the
 * camera rig, and find a drawer on screen.
 */
export function useDevStoreHandle(): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as typeof window & { __archive?: unknown; __story?: unknown };
    w.__archive = useArchiveStore;
    w.__story = {
      apply: applyStoryProgress,
      snapshot: storySnapshot,
      spans: getSpans,
      rig: cameraRig,
      lockerPosition: (id: string) => getLockerWorldPosition(id),
      drawerZ: (id: string) => getLockerHandle(id)?.drawer.position.z ?? null,
    };
    return () => {
      delete w.__archive;
      delete w.__story;
    };
  }, []);
}
