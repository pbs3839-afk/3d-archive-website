import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * One-time GSAP setup, imported by everything that animates.
 *
 * `lagSmoothing(0)` is the important line. GSAP's default is to clamp any
 * frame longer than 500ms down to 33ms, so a long animation does not jump
 * after the tab stalls. For this scene that is exactly backwards: every beat
 * of the choreography is gated on `isCameraMoving`, and the page is a WebGL
 * scene that will occasionally drop a long frame. With smoothing on, a device
 * that stutters turns a 2.3-second open into ten-plus seconds of locked-out
 * UI — the drawer crawls open and clicks do nothing the whole time.
 *
 * Real time is the right clock for a sequence the user is waiting on. Drop
 * frames, not schedule.
 */
gsap.registerPlugin(ScrollTrigger);
gsap.ticker.lagSmoothing(0);

export { gsap, ScrollTrigger };
