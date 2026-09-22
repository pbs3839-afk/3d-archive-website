'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsapConfig';
import { applyIntroProgress, stageForProgress } from '@/lib/introTimeline';
import { useArchiveStore } from '@/store/archiveStore';

interface ScrollIntroProps {
  /** The tall element the intro is scrubbed against. */
  trackRef: React.RefObject<HTMLElement | null>;
}

/**
 * Drives the intro from the page scroll, and hands the camera over cleanly
 * when a compartment is opened.
 *
 * ScrollTrigger scrubs a single `{ p }` proxy from 0 to 1; everything the
 * intro touches is a function of `p` (see `lib/introTimeline.ts`). Nothing is
 * pinned — the canvas is `position: fixed` underneath a tall, otherwise empty
 * track, which avoids ScrollTrigger's pin-spacing pitfalls entirely and
 * behaves identically on iOS where pinning is least reliable.
 */
export function ScrollIntro({ trackRef }: ScrollIntroProps) {
  const setStage = useArchiveStore((s) => s.setStage);
  const setVaultOpen = useArchiveStore((s) => s.setVaultOpen);
  const stage = useArchiveStore((s) => s.stage);

  const progressRef = useRef({ p: 0 });
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const savedScroll = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // An intro that starts halfway through is not an intro. Browsers restore
    // the previous scroll position on reload, which lands the user in the
    // middle of the choreography with no idea how they got there.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const proxy = progressRef.current;

    const apply = () => {
      const state = useArchiveStore.getState();
      // The click choreography owns the camera in these stages. Bail out
      // BEFORE writing to the rig, not after: a single stray frame of intro
      // pose is a visible snap.
      if (state.stage === 'locker' || state.stage === 'file') return;

      applyIntroProgress(proxy.p);

      const nextStage = stageForProgress(proxy.p);
      if (nextStage !== state.stage) setStage(nextStage);

      const vaultOpen = nextStage === 'vault';
      if (vaultOpen !== state.isVaultOpen) setVaultOpen(vaultOpen);
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

    triggerRef.current = tween.scrollTrigger ?? null;

    // Paint the correct first frame even before the user scrolls, and re-frame
    // on refresh (the poses are aspect-dependent).
    apply();
    const onRefresh = scheduleApply;
    ScrollTrigger.addEventListener('refresh', onRefresh);

    /*
     * The trigger is created before the layout has settled: the canvas is a
     * dynamic import and the CSS that gives the track its 400vh may not have
     * applied yet, so start/end can be measured against a page that is still
     * one viewport tall. Observing the track and refreshing when its height
     * actually changes fixes that at the source — and keeps working if the
     * runway length ever changes at a breakpoint. The observer fires once
     * immediately on observe(), which covers the initial measurement.
     */
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(track);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      triggerRef.current = null;
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [trackRef, setStage, setVaultOpen]);

  /*
   * Freezing the page while a drawer is open needs two things, and doing only
   * the obvious one breaks the scene.
   *
   * `overflow: hidden` on a document that is scrolled to the bottom collapses
   * its scroll position to zero. ScrollTrigger dutifully reports progress 0
   * and rewinds the entire intro underneath the open drawer. So the trigger is
   * DISABLED first, the position is remembered, and on unlock the position is
   * restored before the trigger is switched back on — which leaves the scrubbed
   * progress exactly where the user left it.
   */
  useEffect(() => {
    const locked = stage === 'locker' || stage === 'file';
    const trigger = triggerRef.current;
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

/**
 * Jump the page to the end of the intro — the HUD's "skip" affordance, and
 * the keyboard path past a scroll-only gate.
 *
 * Native smooth scrolling rather than GSAP's ScrollToPlugin: one less plugin,
 * and it respects the user's reduced-motion setting for free.
 */
export function skipIntro(): void {
  const trigger = ScrollTrigger.getAll()[0];
  if (!trigger) return;
  window.scrollTo({ top: trigger.end, behavior: 'smooth' });
}
