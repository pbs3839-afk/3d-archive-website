'use client';

import { useEffect } from 'react';
import { useArchiveStore, type QualityTier } from '@/store/archiveStore';

interface NavigatorWithMemory extends Navigator {
  deviceMemory?: number;
}

/**
 * Resolve a rendering budget once, on mount.
 *
 * Deliberately coarse: the goal is to decide shadows / pixel ratio / rib
 * detail, not to benchmark. `<PerformanceMonitor>` in the scene handles the
 * runtime half of this by dropping DPR when frames get expensive.
 */
function resolveQuality(): QualityTier {
  if (typeof window === 'undefined') return 'high';

  const nav = navigator as NavigatorWithMemory;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;

  if (memory <= 3 || cores <= 3) return 'low';
  if (coarsePointer || narrow || memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}

export function useDeviceProfile(): void {
  const setDeviceProfile = useArchiveStore((s) => s.setDeviceProfile);

  useEffect(() => {
    const touchQuery = window.matchMedia('(pointer: coarse)');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const sync = () => {
      setDeviceProfile({
        quality: resolveQuality(),
        isTouch: touchQuery.matches,
        prefersReducedMotion: motionQuery.matches,
      });
    };

    sync();
    touchQuery.addEventListener('change', sync);
    motionQuery.addEventListener('change', sync);
    return () => {
      touchQuery.removeEventListener('change', sync);
      motionQuery.removeEventListener('change', sync);
    };
  }, [setDeviceProfile]);
}

/** Max device pixel ratio per tier — the single biggest fill-rate lever. */
export const DPR_BY_TIER: Record<QualityTier, [number, number]> = {
  high: [1, 2],
  medium: [1, 1.5],
  low: [0.75, 1],
};

export const SHADOW_MAP_BY_TIER: Record<QualityTier, number> = {
  high: 1024,
  medium: 512,
  low: 0, // shadows off
};
