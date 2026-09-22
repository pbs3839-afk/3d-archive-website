/**
 * Texture fallback.
 *
 * Every /textures/ request is answered 404. The archive must still render and
 * run the whole drawer flow on flat materials. The browser's own "Failed to
 * load resource" lines and the [wornMaterial] warnings are expected; any
 * other console error, or any page error, is a failure.
 *
 * Run:  node tests/texture-fallback.mjs      (dev server on :3100)
 */
import { gotoVault, launchBrowser } from './browser.mjs';

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.route('**/textures/**', (route) => route.fulfill({ status: 404, body: '' }));

const errors = [];
const warnings = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
  if (message.type() === 'warning') warnings.push(message.text());
});
page.on('pageerror', (error) => errors.push(String(error)));
const settle = () =>
  page.waitForFunction(() => !window.__archive.getState().isCameraMoving, null, { timeout: 15000 });

await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
await gotoVault(page);
await page.click('nav[aria-label="Compartment index"] button:has-text("A-01")');
await page.waitForFunction(() => window.__archive.getState().stage === 'locker');
await settle();
await page.evaluate(() => window.__archive.getState().selectFile('alpha'));
await page.waitForTimeout(100);
await settle();
await page.screenshot({ path: 'tests/shots/fallback-file.png' });
await page.keyboard.press('Escape');
await page.waitForTimeout(100);
await settle();
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__archive.getState().stage === 'vault');
await settle();
const stage = await page.evaluate(() => window.__archive.getState().stage);
await browser.close();

const unexpected = errors.filter((text) => !text.includes('Failed to load resource'));
const warned = warnings.some((text) => text.includes('[wornMaterial]'));
console.log(JSON.stringify({ stage, unexpected, warned, missingFiles: errors.length - unexpected.length }, null, 2));
if (stage !== 'vault' || unexpected.length > 0 || !warned) {
  console.error('FAILED: fallback path is not clean');
  process.exitCode = 1;
} else {
  console.log('PASSED: flat fallback runs the full flow');
}
