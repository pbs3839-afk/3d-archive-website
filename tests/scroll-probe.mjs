/**
 * Scroll + layout probe.
 *
 * Answers two questions with measurements rather than impressions, at desktop,
 * laptop and phone sizes: does the story only ever run forward as the page
 * scrolls down (intro → approach → vault → tour, each tour chapter on its own
 * drawer), and do any two HUD elements that are visible together overlap.
 * Exits non-zero on either, or on any console error.
 *
 * Run:  node tests/scroll-probe.mjs
 * The dev server must already be running on :3100.
 */
import { mkdirSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';

const URL = 'http://localhost:3100';
const OUT = 'tests/shots';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'phone', width: 390, height: 844 },
];
const ORDER = ['intro', 'approach', 'vault', 'tour'];

/** Read the store plus the live camera the scroll drives. */
const readState = async (page) =>
  page.evaluate(() => {
    const s = window.__archive?.getState?.();
    return {
      stage: s?.stage ?? null,
      tourStop: s?.tourStop ?? null,
      vaultOpen: s?.isVaultOpen ?? null,
      scrollY: Math.round(window.scrollY),
      maxScroll: Math.round(document.documentElement.scrollHeight - window.innerHeight),
      cameraZ: (() => {
        const c = document.querySelector('canvas');
        return c ? Number(c.dataset.probeZ ?? NaN) : NaN;
      })(),
    };
  });

/**
 * The camera lives on the R3F root; publish its Z through the canvas dataset
 * from a rAF tick rather than reaching into the bundle.
 */
const installProbe = async (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const tick = () => {
      const r3f = canvas.__r3f ?? canvas.parentElement?.__r3f;
      const cam = r3f?.root?.getState?.().camera;
      if (cam) canvas.dataset.probeZ = String(cam.position.z.toFixed(3));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return true;
  });

const results = [];

for (const vp of VIEWPORTS) {
  const browser = await launchBrowser();
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });

  const consoleErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()));
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { timeout: 30000 });
  await page.waitForTimeout(3500);
  const probeOk = await installProbe(page);
  await page.waitForTimeout(400);

  /* ------------------------------------------------ 1. scroll direction */
  // One sample in every chapter, in page order, plus both ends.
  const targets = await page.evaluate(() => {
    const spans = window.__story.spans();
    const at = (span, local) => span.start + local * (span.end - span.start);
    return [
      { name: 'top', p: 0 },
      ...spans.map((span) => ({ name: span.id, p: at(span, span.kind === 'tour' ? 0.6 : 0.5) })),
      { name: 'end', p: 1 },
    ];
  });
  const samples = [];
  for (const target of targets) {
    await page.evaluate((p) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round(max * p));
    }, target.p);
    await page.waitForTimeout(1100); // scrub smoothing is 0.65s
    samples.push({ name: target.name, ...(await readState(page)) });
    if (target.name === 'vault') await page.screenshot({ path: `${OUT}/${vp.name}-vault.png` });
  }

  /* ------------------------------------------------ 2. section overlap */
  // Measured at the end of the page: the last tour chapter, where the most
  // HUD is on screen at once.
  const overlaps = await page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel);
    const named = {
      readout: pick('header'),
      status: pick('[role="status"]'),
      compartmentIndex: pick('nav[aria-label="Compartment index"]'),
      dossierIndex: pick('nav[aria-label="Dossier index"]'),
      panel: pick('aside[aria-label^="Dossier"]'),
      tourCard: pick('section[aria-label="Drawer tour"]'),
    };
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        visible: cs.opacity !== '0' && cs.visibility !== 'hidden' && r.width > 0,
      };
    };
    const boxes = Object.fromEntries(
      Object.entries(named).map(([k, v]) => [k, box(v)]),
    );
    const hit = (a, b) =>
      a && b && a.visible && b.visible &&
      a.x < b.x + b.w && b.x < a.x + a.w &&
      a.y < b.y + b.h && b.y < a.y + a.h;

    const pairs = [];
    const keys = Object.keys(boxes);
    for (let i = 0; i < keys.length; i += 1) {
      for (let j = i + 1; j < keys.length; j += 1) {
        if (hit(boxes[keys[i]], boxes[keys[j]])) pairs.push(`${keys[i]} ∩ ${keys[j]}`);
      }
    }
    return {
      boxes,
      overlappingVisiblePairs: pairs,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });

  await page.screenshot({ path: `${OUT}/${vp.name}-tour-end.png` });

  /* ---------------------------------------- 3. open a drawer and re-check */
  await page.evaluate(() => window.__archive.getState().selectLocker('Locker_03'));
  await page.waitForFunction(
    () => {
      const s = window.__archive.getState();
      return s.isLockerOpen && !s.isCameraMoving;
    },
    { timeout: 15000 },
  ).catch(() => {});
  await page.waitForTimeout(600);
  const lockerOverlaps = await page.evaluate(() => {
    const a = document.querySelector('nav[aria-label="Compartment index"]');
    const b = document.querySelector('nav[aria-label="Dossier index"]');
    const vis = (el) => el && getComputedStyle(el).opacity !== '0';
    return { compartmentVisible: vis(a), dossierVisible: vis(b) };
  });
  await page.screenshot({ path: `${OUT}/${vp.name}-locker.png` });

  results.push({
    viewport: vp,
    probeOk,
    samples,
    overlaps,
    lockerOverlaps,
    consoleErrors: consoleErrors.slice(0, 5),
  });

  await browser.close();
}

console.log(JSON.stringify(results, null, 2));

const failures = [];
for (const result of results) {
  const name = result.viewport.name;
  const stages = result.samples.map((sample) => sample.stage);
  const ranks = stages.map((stage) => ORDER.indexOf(stage));
  if (ranks.some((rank, i) => rank < 0 || (i > 0 && rank < ranks[i - 1]))) {
    failures.push(`${name}: stages out of order: ${stages.join(' → ')}`);
  }
  const missing = ORDER.filter((stage) => !stages.includes(stage));
  if (missing.length) failures.push(`${name}: never reached ${missing.join(', ')}`);
  for (const sample of result.samples) {
    if (sample.name.startsWith('tour-') && sample.tourStop !== sample.name.slice('tour-'.length)) {
      failures.push(`${name}: ${sample.name} held on ${sample.tourStop}`);
    }
  }
  if (result.overlaps.overlappingVisiblePairs.length) {
    failures.push(`${name}: overlapping ${result.overlaps.overlappingVisiblePairs.join(', ')}`);
  }
  if (result.overlaps.horizontalOverflow) failures.push(`${name}: horizontal overflow`);
  if (result.consoleErrors.length) failures.push(`${name}: console errors ${result.consoleErrors.join(' | ')}`);
}
if (failures.length) {
  console.error(`FAILED\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('PASSED: the story runs forward with no overlaps and no errors at every viewport');
}
