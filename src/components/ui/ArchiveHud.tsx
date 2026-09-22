'use client';

import { ARCHIVE_META, LOCKERS, getLocker } from '@/data/archive';
import { useBack } from '@/hooks/useArchiveNavigation';
import { useArchiveStore } from '@/store/archiveStore';
import { scrollToChapter } from './ScrollIntro';
import styles from './ArchiveHud.module.css';

const STATUS_BY_STAGE = {
  intro: 'STANDBY',
  approach: 'DESCENDING',
  vault: 'VAULT OPEN — SELECT COMPARTMENT',
  tour: 'DRAWER TOUR',
  locker: 'COMPARTMENT OPEN',
  file: 'DOSSIER ON SCREEN',
} as const;

/**
 * Everything the user needs that is not a 3D object.
 *
 * The compartment index is not decoration: the 3D lockers are the primary way
 * in, but they are unreachable by keyboard and fiddly on a small screen, so
 * the same five targets exist here as real focusable buttons. Escape and the
 * BACK button cover the way out.
 *
 * In the tour the index navigates instead of opening: a row scrolls to that
 * drawer's chapter, and the tour card's button is what opens it.
 */
export function ArchiveHud() {
  const stage = useArchiveStore((s) => s.stage);
  const selectedLocker = useArchiveStore((s) => s.selectedLocker);
  const isCameraMoving = useArchiveStore((s) => s.isCameraMoving);
  const hoveredLocker = useArchiveStore((s) => s.hoveredLocker);
  const setHoveredLocker = useArchiveStore((s) => s.setHoveredLocker);
  const selectLocker = useArchiveStore((s) => s.selectLocker);
  const selectFile = useArchiveStore((s) => s.selectFile);
  const isLockerOpen = useArchiveStore((s) => s.isLockerOpen);
  const hoveredFile = useArchiveStore((s) => s.hoveredFile);
  const setHoveredFile = useArchiveStore((s) => s.setHoveredFile);
  const tourStop = useArchiveStore((s) => s.tourStop);
  const back = useBack();

  const inTour = stage === 'tour';
  const showIndex = stage === 'vault' || inTour;
  const canSelect = showIndex && !isCameraMoving;
  const canGoBack = stage === 'locker' || stage === 'file';
  const locker = getLocker(selectedLocker);
  const showDossiers = stage === 'locker' && Boolean(locker);
  const tourNumber = LOCKERS.findIndex((entry) => entry.id === tourStop) + 1;
  const status = locker
    ? `${locker.code} · ${locker.label}`
    : inTour && tourNumber > 0
      ? `DRAWER TOUR — ${tourNumber} OF ${LOCKERS.length}`
      : STATUS_BY_STAGE[stage];

  return (
    <div className={styles.root}>
      <header className={styles.readout}>
        <span className={styles.brand}>{ARCHIVE_META.title}</span>
        <span className={styles.meta}>{ARCHIVE_META.facility}</span>
        <span className={styles.meta}>{ARCHIVE_META.clearance}</span>
      </header>

      <div className={styles.status} role="status" aria-live="polite">
        <span className={styles.dot} data-active={stage !== 'intro'} />
        {status}
      </div>

      <nav
        className={styles.index}
        data-visible={showIndex}
        aria-label="Compartment index"
        inert={showIndex ? undefined : true}
      >
        <p className={styles.indexTitle}>COMPARTMENT INDEX</p>
        <ul className={styles.indexList}>
          {LOCKERS.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                className={styles.indexItem}
                data-hovered={hoveredLocker === entry.id}
                data-current={inTour && tourStop === entry.id}
                aria-current={inTour && tourStop === entry.id ? 'true' : undefined}
                disabled={!canSelect}
                onClick={() => (inTour ? scrollToChapter(entry.id) : selectLocker(entry.id))}
                onMouseEnter={() => setHoveredLocker(entry.id)}
                onMouseLeave={() => setHoveredLocker(null)}
                onFocus={() => setHoveredLocker(entry.id)}
                onBlur={() => setHoveredLocker(null)}
              >
                <span className={styles.indexCode}>{entry.code}</span>
                <span className={styles.indexLabel}>{entry.label}</span>
                <span className={styles.indexCount}>
                  {String(entry.files.length).padStart(2, '0')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Mounted unconditionally, like the compartment index above it.
          Conditional mounting gave this panel no starting style, so it popped
          in and vanished while its sibling faded — and it skipped `inert`,
          leaving hidden buttons in the tab order. */}
      <nav
        className={styles.index}
        data-visible={showDossiers}
        aria-label="Dossier index"
        inert={showDossiers ? undefined : true}
      >
        <p className={styles.indexTitle}>DOSSIER INDEX</p>
        <ul className={styles.indexList}>
          {locker?.files.map((file, index) => (
            <li key={file.id}>
              <button
                type="button"
                className={styles.indexItem}
                data-hovered={hoveredFile === file.id}
                disabled={!isLockerOpen || isCameraMoving}
                onClick={() => selectFile(file.id)}
                onFocus={() => setHoveredFile(file.id)}
                onBlur={() => setHoveredFile(null)}
                onMouseEnter={() => setHoveredFile(file.id)}
                onMouseLeave={() => setHoveredFile(null)}
              >
                <span className={styles.indexCode}>{String(index + 1).padStart(2, '0')}</span>
                <span className={styles.indexLabel}>{file.codename}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.back}
          data-visible={canGoBack}
          disabled={!canGoBack || isCameraMoving}
          onClick={back}
        >
          <span aria-hidden="true">←</span> BACK
          <kbd className={styles.kbd}>ESC</kbd>
        </button>

        <p className={styles.hint} data-visible={stage === 'vault'}>
          SELECT A COMPARTMENT
        </p>
        <p className={styles.hint} data-visible={stage === 'locker'}>
          SELECT A DOSSIER
        </p>
        <p className={`${styles.hint} ${styles.hintTour}`} data-visible={inTour}>
          OPEN THE DRAWER · SCROLL TO CONTINUE
        </p>
      </div>
    </div>
  );
}
