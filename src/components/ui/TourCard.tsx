'use client';

import { useState, type CSSProperties } from 'react';
import { getLocker } from '@/data/archive';
import { classificationColor, highestClassification } from '@/lib/classification';
import { useArchiveStore } from '@/store/archiveStore';
import styles from './TourCard.module.css';

/**
 * The drawer tour's title card.
 *
 * Names the drawer the camera is holding on and offers the keyboard way into
 * it. Mounted always and switched with `data-visible` + `inert`, like the HUD
 * indexes, so it fades rather than pops. The drawer shown only changes while
 * the card is up, so the text never swaps under a fade-out.
 *
 * Sits over the left of the frame, which the tour camera leaves empty for it
 * (`tourCardCoverage` in cameraRig.ts).
 */
export function TourCard() {
  const stage = useArchiveStore((s) => s.stage);
  const tourStop = useArchiveStore((s) => s.tourStop);
  const tourReady = useArchiveStore((s) => s.tourReady);
  const isCameraMoving = useArchiveStore((s) => s.isCameraMoving);
  const selectLocker = useArchiveStore((s) => s.selectLocker);

  const holding = stage === 'tour' && tourReady;
  const [shownId, setShownId] = useState<string | null>(null);
  if (holding && tourStop !== shownId) setShownId(tourStop);

  const locker = getLocker(shownId);
  const visible = holding && Boolean(locker);
  const top = locker
    ? highestClassification(locker.files.map((file) => file.classification))
    : null;

  return (
    <section
      className={styles.root}
      data-visible={visible}
      aria-label="Drawer tour"
      inert={visible ? undefined : true}
    >
      {locker && (
        <>
          <div aria-live="polite">
            <p className={styles.code}>{locker.code}</p>
            <p className={styles.label}>{locker.label}</p>
          </div>
          <p className={styles.meta}>
            {locker.status} · {locker.files.length} DOSSIERS
          </p>
          {top && (
            <p
              className={styles.stamp}
              style={{ '--stamp': classificationColor(top) } as CSSProperties}
            >
              {top}
            </p>
          )}
          <button
            type="button"
            className={styles.open}
            disabled={!visible || isCameraMoving}
            onClick={() => selectLocker(locker.id)}
          >
            OPEN DRAWER
          </button>
        </>
      )}
    </section>
  );
}
