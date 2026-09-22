/**
 * Drawer-browsing flow probe.
 *
 * Drives the real interaction with a real mouse and real keys: open a drawer,
 * hover a filed card's tab, click it, then Escape twice. Screenshots each beat
 * and reports state + how long each camera move actually took.
 *
 * Run:  node tests/drawer-flow.mjs      (dev server must be on :3100)
 */
import { mkdirSync } from 'node:fs';
import { launchBrowser } from './browser.mjs';

const OUT = 'tests/shots';
mkdirSync(OUT, { recursive: true });

const browser = await launchBrowser();
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const state = () =>
  page.evaluate(() => {
    const s = window.__archive.getState();
    return {
      stage: s.stage,
      locker: s.selectedLocker,
      file: s.selectedFile,
      hovered: s.hoveredFile,
      open: s.isLockerOpen,
      moving: s.isCameraMoving,
      selectedFile: s.selectedFile,
    };
  });

/** Wait until no timeline owns the camera; return how long that took. */
const settle = async () => {
  const t0 = Date.now();
  await page.waitForFunction(() => !window.__archive.getState().isCameraMoving, {
    timeout: 15000,
  });
  await page.waitForTimeout(250);
  return Date.now() - t0;
};

const log = [];

await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);

// Vault
await page.evaluate(() =>
  window.scrollTo(0, document.documentElement.scrollHeight),
);
await page.waitForTimeout(2600);
log.push({ beat: 'vault', ...(await state()) });
await page.screenshot({ path: `${OUT}/flow-1-vault.png` });

// Open drawer C-08 through the store (the drawer's screen position moves with
// the grid; the index button is the stable, keyboard-equivalent route).
await page.click('nav[aria-label="Compartment index"] button:has-text("C-08")');
await page.waitForFunction(() => window.__archive.getState().stage === 'locker');
const openMs = await settle();
log.push({ beat: 'drawer open', ms: openMs, ...(await state()) });
await page.screenshot({ path: `${OUT}/flow-2-drawer.png` });

// Real mouse hover over the second tab down (ETA), then read who is hovered.
await page.mouse.move(720, 305, { steps: 8 });
await page.waitForTimeout(700);
const hover = await state();
log.push({ beat: 'hover @720,305', ...hover });
await page.screenshot({ path: `${OUT}/flow-3-hover.png` });

// Real click on whatever is under the pointer.
await page.mouse.click(720, 305);
await page.waitForTimeout(100);
const fileMs = await settle();
log.push({ beat: 'file open', ms: fileMs, ...(await state()) });
await page.screenshot({ path: `${OUT}/flow-4-file.png` });

// Escape -> back to the drawer
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
const back1 = await settle();
log.push({ beat: 'esc 1', ms: back1, ...(await state()) });
await page.screenshot({ path: `${OUT}/flow-5-back-to-drawer.png` });

// Escape -> back to the vault
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
const back2 = await settle();
await page.waitForTimeout(400);
log.push({ beat: 'esc 2', ms: back2, ...(await state()) });
await page.screenshot({ path: `${OUT}/flow-6-back-to-vault.png` });

console.log(JSON.stringify({ log, errors: errors.slice(0, 5) }, null, 2));
await browser.close();
