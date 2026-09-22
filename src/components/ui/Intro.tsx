'use client';

import { ARCHIVE_META } from '@/data/archive';
import { useArchiveStore } from '@/store/archiveStore';
import { skipIntro } from './ScrollIntro';
import styles from './Intro.module.css';

/**
 * The title card.
 *
 * Visibility is driven by `stage`, not by a second ScrollTrigger: the intro
 * already decides where the stage boundaries are, and one source of truth beats
 * two triggers that have to agree.
 */
export function Intro() {
  const stage = useArchiveStore((s) => s.stage);
  const visible = stage === 'intro';

  return (
    <div
      className={styles.root}
      data-visible={visible}
      aria-hidden={!visible}
      inert={!visible ? true : undefined}
    >
      {/* No eyebrow above the heading: the facility number it used to carry is
          already in the HUD readout at top-left, permanently. Repeating it as a
          kicker added a line without adding information. */}
      <div className={styles.frame}>
        <h1 className={styles.title}>
          {ARCHIVE_META.title.split(' ').map((word, index) => (
            <span
              key={word}
              className={styles.word}
              style={{ animationDelay: `${0.15 + index * 0.13}s` }}
            >
              {word}
            </span>
          ))}
        </h1>
        <p className={styles.subtitle}>{ARCHIVE_META.subtitle}</p>

        <div className={styles.rule} />

        <div className={styles.actions}>
          <span className={styles.scrollHint}>
            <span className={styles.scrollBar}>
              <span className={styles.scrollDot} />
            </span>
            SCROLL TO DESCEND
          </span>
          <button type="button" className={styles.skip} onClick={skipIntro}>
            SKIP TO VAULT
          </button>
        </div>
      </div>
    </div>
  );
}
