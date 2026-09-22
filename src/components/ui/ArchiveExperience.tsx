'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  useDevStoreHandle,
  useEscapeToGoBack,
} from '@/hooks/useArchiveNavigation';
import { useDeviceProfile } from '@/hooks/useDeviceProfile';
import { ArchiveHud } from './ArchiveHud';
import { FileDetailPanel } from './FileDetailPanel';
import { Intro } from './Intro';
import { ScrollIntro, skipIntro } from './ScrollIntro';
import { TourCard } from './TourCard';
import styles from './ArchiveExperience.module.css';

/**
 * Composition root.
 *
 * The canvas is `position: fixed` and the scroll intro is scrubbed against a
 * tall, empty track laid over it. Nothing is pinned, which keeps the layout
 * predictable on iOS where ScrollTrigger's pinning is least reliable.
 *
 * Client component because the canvas is a `ssr: false` dynamic import —
 * WebGL has nothing to render on the server, and shipping it to the client
 * only after hydration keeps three out of the initial HTML payload.
 */
const Scene = dynamic(() => import('@/components/canvas/Scene'), {
  ssr: false,
  loading: () => <div className={styles.booting}>INITIALISING ARCHIVE…</div>,
});

export function ArchiveExperience() {
  useDeviceProfile();
  useEscapeToGoBack();
  useDevStoreHandle();

  const trackRef = useRef<HTMLDivElement>(null);

  return (
    <main className={styles.root}>
      <button type="button" className="srOnlyFocusable" onClick={skipIntro}>
        Skip intro and open the vault
      </button>

      <div className={styles.canvasLayer}>
        <Scene />
      </div>

      <div className={styles.vignette} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      {/* Scroll runway. Empty on purpose — the choreography lives in 3D. */}
      <div ref={trackRef} className={styles.track} aria-hidden="true" />

      <ScrollIntro trackRef={trackRef} />
      <Intro />
      <ArchiveHud />
      <TourCard />
      <FileDetailPanel />
    </main>
  );
}
