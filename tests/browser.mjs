/**
 * One way to launch the test browser.
 *
 * Headless Chromium renders WebGL on SwiftShader (the CPU) by default. With
 * scanned textures, the wear shader and SSAO that runs at about one frame per
 * second at 1440×900 — slow enough that Playwright's "wait until stable"
 * before a click times out. These flags hand WebGL to the real GPU through
 * ANGLE/Direct3D 11; on a machine without one, Chromium falls back to
 * SwiftShader by itself.
 *
 * Set TEST_GPU=0 to force the software renderer (for example to compare
 * against shots captured with it).
 */
import { chromium } from '@playwright/test';

export const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

export function launchBrowser() {
  return chromium.launch({ args: process.env.TEST_GPU === '0' ? [] : GPU_ARGS });
}

/**
 * Let a scroll finish: wait until the page stops moving, then give the scrub
 * (0.65 s of smoothing) time to catch up with it.
 */
export async function waitForScrollRest(page) {
  let last = -1;
  for (let i = 0; i < 80; i += 1) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) break;
    last = y;
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(1200);
}

/**
 * Get to the open vault the way a visitor skips there: the title card's
 * SKIP TO VAULT button. The bottom of the page stops being the vault once the
 * drawer tour follows it.
 */
export async function gotoVault(page) {
  await page.click('button:has-text("SKIP TO VAULT")');
  await page.waitForFunction(() => window.__archive.getState().stage === 'vault', null, {
    timeout: 15000,
  });
  await waitForScrollRest(page);
}
