/**
 * Where is the raised card's printed label actually rendered?
 * Opens a drawer, selects a file, then reports the label element's box,
 * styles and the chain of wrapper transforms drei applied to it.
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);
await page.click('nav[aria-label="Compartment index"] button:has-text("C-08")');
await page.waitForFunction(() => {
  const s = window.__archive.getState();
  return s.isLockerOpen && !s.isCameraMoving;
});
await page.evaluate(() => window.__archive.getState().selectFile('eta'));
await page.waitForTimeout(300);
await page.waitForFunction(() => !window.__archive.getState().isCameraMoving);
await page.waitForTimeout(500);

const report = await page.evaluate(() => {
  const card = document.querySelector('[class*=ArchiveFile_card]');
  if (!card) return { found: false };
  const r = card.getBoundingClientRect();
  const chain = [];
  let el = card;
  for (let i = 0; i < 6 && el; i += 1) {
    const cs = getComputedStyle(el);
    chain.push({
      tag: el.tagName,
      cls: String(el.className).slice(0, 40),
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      zIndex: cs.zIndex,
      transform: cs.transform.slice(0, 60),
    });
    el = el.parentElement;
  }
  return {
    found: true,
    box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    text: card.textContent.slice(0, 60),
    chain,
  };
});
console.log(JSON.stringify(report, null, 2));
await page.screenshot({ path: 'tests/shots/label-probe.png' });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'tests/shots/label-probe-late.png' });
await browser.close();
