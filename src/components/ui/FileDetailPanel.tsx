'use client';

import { useEffect, useRef } from 'react';
import { getFile, getLocker } from '@/data/archive';
import { useBack } from '@/hooks/useArchiveNavigation';
import { classificationStyle } from '@/lib/classification';
import { useArchiveStore } from '@/store/archiveStore';
import styles from './FileDetailPanel.module.css';

/**
 * The dossier itself.
 *
 * Plain DOM rather than anything in the canvas: this is the one surface with
 * real prose on it, so it needs to be selectable, zoomable, screen-readable and
 * legible at any pixel ratio. The 3D close-up behind it is the atmosphere; this
 * is the content.
 */
export function FileDetailPanel() {
  const stage = useArchiveStore((s) => s.stage);
  const selectedLocker = useArchiveStore((s) => s.selectedLocker);
  const selectedFile = useArchiveStore((s) => s.selectedFile);
  const selectFile = useArchiveStore((s) => s.selectFile);
  const isCameraMoving = useArchiveStore((s) => s.isCameraMoving);
  const back = useBack();
  const panelRef = useRef<HTMLDivElement>(null);

  const open = stage === 'file';
  const locker = getLocker(selectedLocker);
  const file = getFile(selectedLocker, selectedFile);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open, selectedFile]);

  if (!locker || !file) {
    return <aside className={styles.root} data-open={false} aria-hidden="true" />;
  }

  const index = locker.files.findIndex((entry) => entry.id === file.id);
  const previous = index > 0 ? locker.files[index - 1] : null;
  const next = index < locker.files.length - 1 ? locker.files[index + 1] : null;
  const style = classificationStyle(file.classification);

  return (
    <aside
      ref={panelRef}
      className={styles.root}
      data-open={open}
      tabIndex={-1}
      aria-label={`Dossier ${file.codename}`}
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <div className={styles.banner} style={{ color: style.hex }}>
        <span className={styles.bannerText}>{file.classification}</span>
        <span className={styles.bannerRule} style={{ background: style.hex }} />
        <span className={styles.bannerText}>{file.classification}</span>
      </div>

      <div className={styles.body}>
        <p className={styles.ref}>
          {locker.code} / {String(index + 1).padStart(2, '0')} OF{' '}
          {String(locker.files.length).padStart(2, '0')}
        </p>

        <h2 className={styles.codename}>{file.codename}</h2>
        <p className={styles.title}>{file.title}</p>

        <dl className={styles.entries}>
          <div className={styles.row}>
            <dt>DATE</dt>
            <dd>{file.date}</dd>
          </div>
          <div className={styles.row}>
            <dt>ORIGIN</dt>
            <dd>{file.origin}</dd>
          </div>
          {file.entries.map((entry) => (
            <div key={entry.label} className={styles.row}>
              <dt>{entry.label}</dt>
              <dd>{entry.value}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.summary}>{file.summary}</p>

        {file.redactedLines > 0 && (
          <div className={styles.redacted} aria-label="Redacted content">
            {Array.from({ length: file.redactedLines }, (_, i) => (
              <span
                key={i}
                className={styles.redactedBar}
                style={{ width: `${58 + ((i * 37) % 40)}%` }}
              />
            ))}
            <span className={styles.redactedNote}>
              {file.redactedLines} PARAGRAPH
              {file.redactedLines === 1 ? '' : 'S'} WITHHELD
            </span>
          </div>
        )}
      </div>

      <footer className={styles.footer}>
        <button
          type="button"
          className={styles.nav}
          disabled={!previous || isCameraMoving}
          onClick={() => previous && selectFile(previous.id)}
        >
          ← PREV
        </button>
        <button type="button" className={styles.close} onClick={back}>
          CLOSE
          <kbd className={styles.kbd}>ESC</kbd>
        </button>
        <button
          type="button"
          className={styles.nav}
          disabled={!next || isCameraMoving}
          onClick={() => next && selectFile(next.id)}
        >
          NEXT →
        </button>
      </footer>
    </aside>
  );
}
