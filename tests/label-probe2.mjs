import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);
await page.click('nav[aria-label="Compartment index"] button:has-text("C-08")');
await page.waitForFunction(() => { const s = window.__archive.getState(); return s.isLockerOpen && !s.isCameraMoving; });
await page.evaluate(() => window.__archive.getState().selectFile('eta'));
await page.waitForTimeout(300);
await page.waitForFunction(() => !window.__archive.getState().isCameraMoving);
await page.waitForTimeout(500);
const out = await page.evaluate(() => {
  const card = document.querySelector('[class*=ArchiveFile_card]');
  const r = card.getBoundingClientRect();
  const cx = r.x + r.width / 2, cy = r.y + r.height / 2;
  const top = document.elementFromPoint(cx, cy);
  const chain = [];
  let el = card;
  while (el && el !== document.body) {
    const cs = getComputedStyle(el);
    chain.push(`${el.tagName}.${String(el.className).slice(0,24)} bf=${cs.backfaceVisibility} ts=${cs.transformStyle} persp=${cs.perspective} pos=${cs.position} z=${cs.zIndex}`);
    el = el.parentElement;
  }
  return { centre: [Math.round(cx), Math.round(cy)], topmost: `${top?.tagName}.${String(top?.className).slice(0,40)}`, chain };
});
console.log(JSON.stringify(out, null, 2));
await page.evaluate(() => { document.querySelector('canvas').style.visibility = 'hidden'; });
await page.waitForTimeout(200);
await page.screenshot({ path: 'tests/shots/label-no-canvas.png' });
await browser.close();
