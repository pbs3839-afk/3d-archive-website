/**
 * Drawer tour.
 *
 * Scrolls the real page through the tour with a real mouse and real keys, and
 * checks:
 *   holds       at each hold: stage 'tour', the right tourStop, tourReady
 *   pointer     only the drawer in focus answers hover and click
 *   travel      between drawers nothing is ready to open
 *   return      a drawer opened from the tour closes back to the same chapter
 *               and scroll position, its drawer still peeking, with no jump
 *   reverse     scrolling up runs the chapters backwards to the title
 *   continuity  the camera never jumps: at every chapter boundary the pose on
 *               either side matches, and a 200-step sweep has no spike
 *
 * Run:  node tests/tour-flow.mjs      (dev server on :3100)
 */
import { mkdirSync } from 'node:fs';
import { gotoVault, launchBrowser, waitForScrollRest } from './browser.mjs';

const OUT = 'tests/shots';
mkdirSync(OUT, { recursive: true });

const TOUR = [
  { id: 'Locker_01', code: 'A-01', label: 'NORTHERN DIRECTORATE', files: 3 },
  { id: 'Locker_02', code: 'B-04', label: 'MARITIME SECTION', files: 2 },
  { id: 'Locker_03', code: 'C-08', label: 'TECHNICAL RESEARCH', files: 4 },
  { id: 'Locker_04', code: 'D-11', label: 'PERSONNEL SECURITY', files: 3 },
  { id: 'Locker_05', code: 'E-15', label: 'DEEP ARCHIVE', files: 2 },
];
const ORDER = ['intro', 'approach', 'vault', 'tour'];

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
// Keep hold of the camera the room is rendered with (see tab-visibility.mjs):
// post-processing renders its own scenes through the same renderer, and only
// the scene with fog is the room.
await page.addInitScript(() => {
  const hook = new EventTarget();
  hook.addEventListener('observe', (event) => {
    const renderer = event.detail;
    if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement || renderer.__probed) return;
    const render = renderer.render;
    renderer.render = function probed(scene, camera) {
      if (scene.fog) window.__camera = camera;
      return render.call(this, scene, camera);
    };
    renderer.__probed = true;
  });
  window.__THREE_DEVTOOLS__ = hook;
});

const errors = [];
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
page.on('pageerror', (error) => errors.push(String(error)));

const failures = [];
const expect = (ok, message) => {
  if (!ok) failures.push(message);
};

const state = () =>
  page.evaluate(() => {
    const s = window.__archive.getState();
    return {
      stage: s.stage,
      tourStop: s.tourStop,
      tourReady: s.tourReady,
      hovered: s.hoveredLocker,
      selected: s.selectedLocker,
      scrollY: Math.round(window.scrollY),
    };
  });

const settle = async () => {
  await page.waitForFunction(() => !window.__archive.getState().isCameraMoving, null, {
    timeout: 15000,
  });
  await page.waitForTimeout(250);
};

/**
 * Scroll (instantly) to `local` within a chapter — named by its drawer id or
 * its kind — and let the scrub catch up.
 */
const scrollInto = async (key, local = 0.6) => {
  await page.evaluate(
    ([k, at]) => {
      const span = window.__story.spans().find((entry) => entry.lockerId === k || entry.kind === k);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round((span.start + at * (span.end - span.start)) * max));
    },
    [key, local],
  );
  await waitForScrollRest(page);
};

/** Where a drawer's face centre is on screen, and whether the canvas is what is there. */
const screenOf = (lockerId) =>
  page.evaluate((id) => {
    const world = window.__story.lockerPosition(id);
    const camera = window.__camera;
    if (!world || !camera) return null;
    const ndc = world.clone().project(camera);
    const x = Math.round(((ndc.x + 1) / 2) * window.innerWidth);
    const y = Math.round(((1 - ndc.y) / 2) * window.innerHeight);
    const inside = x > 12 && y > 12 && x < window.innerWidth - 12 && y < window.innerHeight - 12;
    return { x, y, onCanvas: inside && document.elementFromPoint(x, y)?.tagName === 'CANVAS' };
  }, lockerId);

const rigPosition = () =>
  page.evaluate(() => {
    const rig = window.__story.rig;
    return [rig.px, rig.py, rig.pz];
  });

await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
await gotoVault(page);
expect((await state()).stage === 'vault', 'SKIP did not land in the vault');
await page.screenshot({ path: `${OUT}/tour-0-vault.png` });

/* ------------------------------------------------ holds + pointer rule */
let neighboursTried = 0;
for (const [index, stop] of TOUR.entries()) {
  await page.mouse.move(5, 895);
  await scrollInto(stop.id);
  const held = await state();
  expect(
    held.stage === 'tour' && held.tourStop === stop.id && held.tourReady,
    `${stop.code} hold: ${JSON.stringify(held)}`,
  );
  // @card-checks (Task 6)
  await page.screenshot({ path: `${OUT}/tour-${index + 1}-${stop.code}.png` });

  const focus = await screenOf(stop.id);
  expect(focus?.onCanvas, `${stop.code}: drawer in focus is not on screen (${JSON.stringify(focus)})`);
  if (focus?.onCanvas) {
    await page.mouse.move(focus.x, focus.y, { steps: 6 });
    await page.waitForTimeout(300);
    expect((await state()).hovered === stop.id, `${stop.code}: drawer in focus does not answer hover`);
  }

  for (const other of TOUR) {
    if (other.id === stop.id) continue;
    const point = await screenOf(other.id);
    if (!point?.onCanvas) continue;
    neighboursTried += 1;
    await page.mouse.move(point.x, point.y, { steps: 6 });
    await page.waitForTimeout(250);
    const hovered = (await state()).hovered;
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(600);
    const after = await state();
    expect(
      hovered === null && after.stage === 'tour' && after.selected === null,
      `${stop.code}: ${other.code} answered the pointer (${JSON.stringify({ hovered, ...after })})`,
    );
  }
}
expect(neighboursTried > 0, 'no neighbouring drawer was on screen to test');

/* ------------------------------------------------ travel: nothing ready */
await page.mouse.move(5, 895);
await scrollInto('Locker_02', 0.15);
const travelling = await state();
expect(
  travelling.stage === 'tour' && travelling.tourStop === 'Locker_02' && !travelling.tourReady,
  `travelling to B-04: ${JSON.stringify(travelling)}`,
);
// @travel-card-check (Task 6)

/* ------------------------------------------------ open from the tour, close back */
await scrollInto('Locker_03');
const before = await state();
const target = await screenOf('Locker_03');
if (!target?.onCanvas) throw new Error(`C-08 not on screen: ${JSON.stringify(target)}`);
await page.mouse.move(target.x, target.y, { steps: 6 });
await page.waitForTimeout(250);
await page.mouse.click(target.x, target.y);
await page.waitForFunction(() => window.__archive.getState().stage === 'locker', null, { timeout: 5000 });
await settle();
await page.screenshot({ path: `${OUT}/tour-open-C-08.png` });
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__archive.getState().stage === 'tour', null, { timeout: 15000 });
const closedAt = await rigPosition();
await page.waitForTimeout(500);
const settledAt = await rigPosition();
const back = await state();
const drift = Math.hypot(...closedAt.map((value, i) => value - settledAt[i]));
const peek = await page.evaluate(() => window.__story.drawerZ('Locker_03'));
expect(back.tourStop === 'Locker_03' && back.tourReady, `after close: ${JSON.stringify(back)}`);
expect(Math.abs(back.scrollY - before.scrollY) <= 1, `scroll moved on close: ${before.scrollY} → ${back.scrollY}`);
expect(drift < 0.01, `camera moved ${(drift * 100).toFixed(1)} cm after the close`);
expect(Math.abs(peek - 0.06) < 0.002, `C-08 drawer at ${peek} m after close, expected the 0.06 m peek`);

// @card-button-and-index (Task 6)

/* ------------------------------------------------ reverse */
const reverse = [];
for (const stop of [...TOUR].reverse()) {
  await scrollInto(stop.id);
  reverse.push((await state()).stage);
}
for (const [kind, local] of [['vault', 0.5], ['opening', 0.5], ['opening', 0]]) {
  await scrollInto(kind, local);
  reverse.push((await state()).stage);
}
const ranks = reverse.map((stage) => ORDER.indexOf(stage));
expect(
  ranks.every((rank, i) => rank >= 0 && (i === 0 || rank <= ranks[i - 1])) &&
    reverse.at(-1) === 'intro' &&
    reverse.includes('vault'),
  `reverse scroll: ${reverse.join(' → ')}`,
);

/* ------------------------------------------------ continuity (last: moves the scene) */
// Straight through the story maths, without the scrub's smoothing: a jump in
// the function itself is what this looks for.
const continuity = await page.evaluate(() => {
  const { apply, rig, spans } = window.__story;
  const pose = (p) => {
    apply(p);
    return [rig.px, rig.py, rig.pz, rig.tx, rig.ty, rig.tz];
  };
  const gaps = spans()
    .slice(1)
    .map((span) => {
      const before = pose(span.start - 1e-7);
      const after = pose(span.start + 1e-7);
      return { id: span.id, gap: Math.max(...before.map((value, i) => Math.abs(value - after[i]))) };
    });
  const sweep = Array.from({ length: 201 }, (_, i) => pose(i / 200));
  const steps = sweep
    .slice(1)
    .map((next, i) => Math.hypot(next[0] - sweep[i][0], next[1] - sweep[i][1], next[2] - sweep[i][2]));
  return { gaps, steps };
});
const openGaps = continuity.gaps.filter(({ gap }) => gap > 1e-3);
expect(openGaps.length === 0, `camera jumps at a boundary: ${JSON.stringify(openGaps)}`);
const { steps } = continuity;
const spikes = steps
  .map((step, i) => ({ i, step, around: Math.max(steps[i - 1] ?? 0, steps[i + 1] ?? 0) }))
  .filter(({ step, around }) => step > 3 * around + 0.01);
expect(spikes.length === 0, `camera spikes in the sweep: ${JSON.stringify(spikes.slice(0, 5))}`);

await browser.close();
if (errors.length) failures.push(`console errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(
  JSON.stringify(
    {
      neighboursTried,
      reverse,
      closeDriftCm: +(drift * 100).toFixed(2),
      maxBoundaryGap: Math.max(...continuity.gaps.map(({ gap }) => gap)),
      maxStep: +Math.max(...steps).toFixed(3),
    },
    null,
    2,
  ),
);
if (failures.length) {
  console.error(`FAILED\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('PASSED: drawer tour');
}
