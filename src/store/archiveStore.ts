'use client';

import { create } from 'zustand';

/**
 * Where the experience currently is. The stage drives what the camera owns,
 * whether the page scrolls, and what the HUD offers.
 *
 *   intro     title card, cabinet in darkness         — scroll owns the camera
 *   approach  cabinet revealed, camera moving in      — scroll owns the camera
 *   vault     outer doors open, lockers selectable    — scroll owns the camera
 *   tour      the camera visits one drawer at a time  — scroll owns the camera
 *   locker    one locker open, files fanned out       — click owns the camera
 *   file      one dossier in close-up                 — click owns the camera
 */
export type Stage = 'intro' | 'approach' | 'vault' | 'tour' | 'locker' | 'file';

/** Rendering budget, resolved once from the device. */
export type QualityTier = 'high' | 'medium' | 'low';

export interface ArchiveState {
  stage: Stage;

  selectedLocker: string | null;
  selectedFile: string | null;
  hoveredLocker: string | null;
  hoveredFile: string | null;

  /** True once the locker doors have finished swinging open. */
  isLockerOpen: boolean;
  /** True once the outer doors have finished swinging open. */
  isVaultOpen: boolean;
  /** True while any camera timeline is running — suppresses input. */
  isCameraMoving: boolean;
  /** Drawer of the current tour chapter, travel included; null outside the tour. */
  tourStop: string | null;
  /** True while a tour chapter holds on its drawer. */
  tourReady: boolean;

  quality: QualityTier;
  /** Coarse pointer (touch). Hover affordances are dropped when true. */
  isTouch: boolean;
  prefersReducedMotion: boolean;

  setStage: (stage: Stage) => void;
  selectLocker: (id: string) => void;
  selectFile: (id: string) => void;
  /** Step back one stage: file -> locker -> vault. Returns the new stage. */
  goBack: () => Stage;
  setHoveredLocker: (id: string | null) => void;
  setHoveredFile: (id: string | null) => void;
  setLockerOpen: (open: boolean) => void;
  setVaultOpen: (open: boolean) => void;
  setCameraMoving: (moving: boolean) => void;
  /** Commit the tour position. Called every scroll frame; a no-op unless it changed. */
  setTour: (stop: string | null, ready: boolean) => void;
  setDeviceProfile: (profile: {
    quality: QualityTier;
    isTouch: boolean;
    prefersReducedMotion: boolean;
  }) => void;
}

export const useArchiveStore = create<ArchiveState>((set, get) => ({
  stage: 'intro',

  selectedLocker: null,
  selectedFile: null,
  hoveredLocker: null,
  hoveredFile: null,

  isLockerOpen: false,
  isVaultOpen: false,
  isCameraMoving: false,
  tourStop: null,
  tourReady: false,

  quality: 'high',
  isTouch: false,
  prefersReducedMotion: false,

  setStage: (stage) => set({ stage }),

  selectLocker: (id) =>
    set({
      stage: 'locker',
      selectedLocker: id,
      selectedFile: null,
      hoveredLocker: null,
      hoveredFile: null,
      isLockerOpen: false,
    }),

  selectFile: (id) => set({ stage: 'file', selectedFile: id, hoveredFile: null }),

  goBack: () => {
    const { stage } = get();
    if (stage === 'file') {
      set({ stage: 'locker', selectedFile: null });
      return 'locker';
    }
    if (stage === 'locker') {
      set({
        stage: 'vault',
        selectedLocker: null,
        selectedFile: null,
        isLockerOpen: false,
      });
      return 'vault';
    }
    return stage;
  },

  setHoveredLocker: (hoveredLocker) => set({ hoveredLocker }),
  setHoveredFile: (hoveredFile) => set({ hoveredFile }),
  setLockerOpen: (isLockerOpen) => set({ isLockerOpen }),
  setVaultOpen: (isVaultOpen) => set({ isVaultOpen }),
  setCameraMoving: (isCameraMoving) => set({ isCameraMoving }),
  setTour: (tourStop, tourReady) => {
    const state = get();
    if (state.tourStop === tourStop && state.tourReady === tourReady) return;
    set({ tourStop, tourReady });
  },
  setDeviceProfile: ({ quality, isTouch, prefersReducedMotion }) =>
    set({ quality, isTouch, prefersReducedMotion }),
}));

