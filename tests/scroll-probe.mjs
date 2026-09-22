/**
 * Scroll + layout probe.
 *
 * Written to answer two specific claims with measurements rather than
 * impressions: that scrolling runs in the wrong direction, and that sections
 * overlap. Both are checked at desktop and phone sizes.
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

/** Read the store plus the live camera rig the scroll intro drives. */
const readState = async (page) =>
  page.evaluate(() => {
    const s = window.__archive?.getState?.();
    return {
      stage: s?.stage ?? null,
      vaultOpen: s?.isVaultOpen ?? null,
      scrollY: Math.round(window.scrollY),
      maxScroll: Math.round(
        document.documentElement.scrollHeight - window.innerHeight,
      ),
      // The camera's distance from the cabinet is the observable the intro
      // actually animates; it must fall monotonically as the user scrolls in.
      cameraZ: (() => {
        const c = document.querySelector('canvas');
        return c ? Number(c.dataset.probeZ ?? NaN) : NaN;
      })(),
    };
  });

/**
 * The rig is a module-local object, so expose its Z through the canvas
 * dataset from inside a rAF tick rather than reaching into the bundle.
 */
const installProbe = async (page) =>
  page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;
    const tick = () => {
      // three stores the camera on the R3F root; read it off the WebGL context
      // owner instead by sampling what the canvas last rendered from.
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
  const samples = [];
  const steps = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
  for (const t of steps) {
    await page.evaluate((frac) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round(max * frac));
    }, t);
    await page.waitForTimeout(1100); // scrub smoothing is 0.65s
    samples.push({ t, ...(await readState(page)) });
  }

  /* ------------------------------------------------ 2. section overlap */
  // Everything on top of the canvas is a fixed overlay; "sections" here are
  // the HUD regions. Overlap between two that are meant to be visible at the
  // same time is the bug worth reporting.
  const overlaps = await page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel);
    const named = {
      readout: pick('header'),
      status: pick('[role="status"]'),
      compartmentIndex: pick('nav[aria-label="Compartment index"]'),
      dossierIndex: pick('nav[aria-label="Dossier index"]'),
      panel: pick('aside[aria-label^="Dossier"]'),
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
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });

  await page.screenshot({ path: `${OUT}/${vp.name}-vault.png` });

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
