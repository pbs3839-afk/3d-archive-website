'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsapConfig';
import { PANEL_BREAKPOINT } from '@/lib/cameraRig';
import { progressAt, totalLength } from '@/lib/chapters';
import { applyStoryProgress, getSpans, setStoryLayout } from '@/lib/storyProgress';
import { useArchiveStore } from '@/store/archiveStore';

interface ScrollIntroProps {
  /** The tall element the story is scrubbed against. */
  trackRef: React.RefObject<HTMLElement | null>;
}

/** The one trigger that scrubs the story. Read by the scroll helpers below. */
let storyTrigger: ScrollTrigger | null = null;

/**
 * Drives the story from the page scroll, and hands the camera over cleanly
 * when a compartment is opened.
 *
 * ScrollTrigger scrubs a single `{ p }` proxy from 0 to 1 across the whole
 * track; everything the scroll touches is a function of `p`, split into
 * chapters by `lib/storyProgress.ts`. Nothing is pinned — the canvas is
 * `position: fixed` underneath a tall, otherwise empty track, which avoids
 * ScrollTrigger's pin-spacing pitfalls entirely and behaves identically on
 * iOS where pinning is least reliable.
 */
export function ScrollIntro({ trackRef }: ScrollIntroProps) {
  const setStage = useArchiveStore((s) => s.setStage);
  const setVaultOpen = useArchiveStore((s) => s.setVaultOpen);
  const setTour = useArchiveStore((s) => s.setTour);
  const stage = useArchiveStore((s) => s.stage);

  const progressRef = useRef({ p: 0 });
  const savedScroll = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // A story that starts halfway through is not a story. Browsers restore
    // the previous scroll position on reload, which lands the user in the
    // middle of the choreography with no idea how they got there.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    /*
     * The track is as long as the chapters, plus the one viewport that is on
     * screen at the end. The table is shorter on a phone (its opening is), so
     * it is rebuilt when the width crosses the breakpoint; the resize observer
     * below then re-measures the trigger.
     */
    const narrow = window.matchMedia(`(max-width: ${PANEL_BREAKPOINT - 1}px)`);
    const layout = () => {
      const spans = setStoryLayout(narrow.matches);
      track.style.height = `${(totalLength(spans) + 1) * 100}vh`;
    };
    layout();
    narrow.addEventListener('change', layout);

    const proxy = progressRef.current;

    const apply = () => {
      const state = useArchiveStore.getState();
      // The click choreography owns the camera in these stages. Bail out
      // BEFORE writing to the rig, not after: a single stray frame of scroll
      // pose is a visible snap.
      if (state.stage === 'locker' || state.stage === 'file') return;

      const story = applyStoryProgress(proxy.p);
      if (story.stage !== state.stage) setStage(story.stage);

      const vaultOpen = story.stage === 'vault' || story.stage === 'tour';
      if (vaultOpen !== state.isVaultOpen) setVaultOpen(vaultOpen);

      setTour(story.tourStop, story.tourReady);
    };

    /*
     * Applied at most once per frame, from the value the frame ends up with.
     *
     * ScrollTrigger reverts its animation to the start while it re-measures —
     * inside enable() and every refresh() — and restores it before returning,
     * firing onUpdate on the way. Applied synchronously, that transient p = 0
     * set the stage back to 'intro' whenever a drawer closed, and the scrub
     * then replayed the whole intro camera. Deferred to the next frame, only
     * the settled value is ever seen.
     */
    let frame = 0;
    const scheduleApply = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };

    const tween = gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
      onUpdate: scheduleApply,
    });

    storyTrigger = tween.scrollTrigger ?? null;

    // Paint the correct first frame even before the user scrolls, and re-frame
    // on refresh (the poses are aspect-dependent).
    apply();
    const onRefresh = scheduleApply;
    ScrollTrigger.addEventListener('refresh', onRefresh);

    /*
     * The trigger is created before the layout has settled: the canvas is a
     * dynamic import, so start/end can be measured against a page that is
     * still one viewport tall. Observing the track and refreshing when its
     * height actually changes fixes that at the source — and covers the
     * height changing at the phone breakpoint. The observer fires once
     * immediately on observe(), which covers the initial measurement.
     */
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(track);

    return () => {
      cancelAnimationFrame(frame);
      narrow.removeEventListener('change', layout);
      observer.disconnect();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      storyTrigger = null;
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [trackRef, setStage, setVaultOpen, setTour]);

  /*
   * Freezing the page while a drawer is open needs two things, and doing only
   * the obvious one breaks the scene.
   *
   * `overflow: hidden` on a scrolled document collapses its scroll position to
   * zero. ScrollTrigger dutifully reports progress 0 and rewinds the entire
   * story underneath the open drawer. So the trigger is DISABLED first, the
   * position is remembered, and on unlock the position is restored before the
   * trigger is switched back on — which leaves the scrubbed progress exactly
   * where the user left it.
   */
  useEffect(() => {
    const locked = stage === 'locker' || stage === 'file';
    const trigger = storyTrigger;
    const root = document.documentElement;

    if (locked) {
      savedScroll.current = window.scrollY;
      trigger?.disable(false);
      root.dataset.scrollLocked = 'true';
      return;
    }

    if (!root.dataset.scrollLocked) return;
    delete root.dataset.scrollLocked;
    // Force the reflow that makes the document scrollable again before
    // restoring the offset, otherwise the scroll is clamped to zero.
    void root.offsetHeight;
    window.scrollTo(0, savedScroll.current);
    // enable(false): keep the progress it was disabled at. The default resets
    // progress to 0 and lets the scrub chase it back up — the intro replayed.
    trigger?.enable(false);
  }, [stage]);

  return null;
}

/** Smooth-scroll the page to overall story progress `progress`. */
function scrollToProgress(progress: number): void {
  const trigger = storyTrigger;
  if (!trigger) return;
  window.scrollTo({
    top: trigger.start + progress * (trigger.end - trigger.start),
    behavior: 'smooth',
  });
}

/**
 * Past the opening to the open vault — the title card's "skip", and the
 * keyboard path past a scroll-only gate. Lands midway through the vault
 * chapter rather than at the end of the page: the tour comes after it.
 *
 * Native smooth scrolling rather than GSAP's ScrollToPlugin: one less plugin.
 */
export function skipIntro(): void {
  const vault = getSpans().find((span) => span.kind === 'vault');
  if (vault) scrollToProgress(progressAt(vault, 0.5));
}

/** To where the tour holds on `lockerId` — the compartment index, in the tour. */
export function scrollToChapter(lockerId: string): void {
  const span = getSpans().find((entry) => entry.lockerId === lockerId);
  if (span) scrollToProgress(progressAt(span, 0.6));
}
