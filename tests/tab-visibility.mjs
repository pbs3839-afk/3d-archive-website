/**
 * Tab visibility regression.
 *
 * Opens every live drawer and casts rays from the camera to three points along
 * each visible tab label and classification stripe. Any box mesh in the way —
 * cabinet or another card — counts as hiding it. Then raises the rear card,
 * puts it back, and checks the drawer view is restored.
 *
 * Meshes are tested against their own geometry bounding box, so this works for
 * unit boxes scaled per mesh and for metric boxes alike.
 *
 * Run:  node tests/tab-visibility.mjs        (dev server on :3100)
 */
import { gotoVault, launchBrowser } from './browser.mjs';

const DRAWERS = [
  ['A-01', 'alpha'],
  ['B-04', 'delta'],
  ['C-08', 'zeta'],
  ['D-11', 'kappa'],
  ['E-15', 'nu'],
];

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  const hook = new EventTarget();
  hook.addEventListener('observe', (event) => {
    const renderer = event.detail;
    if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement || renderer.__probed) return;
    const render = renderer.render;
    renderer.render = function probed(scene, camera) {
      // Post-processing renders full-screen scenes through the same renderer;
      // only the room (the scene with fog) and its camera are the ones to test.
      if (scene.fog) {
        window.__camera = camera;
        window.__scene = scene;
      }
      return render.call(this, scene, camera);
    };
    renderer.__probed = true;
  });
  window.__THREE_DEVTOOLS__ = hook;
});
const errors = [];
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
page.on('pageerror', (error) => errors.push(String(error)));
const settle = () =>
  page.waitForFunction(() => !window.__archive.getState().isCameraMoving, null, { timeout: 15000 });

await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
await gotoVault(page);

const failures = [];
for (const [code, rearFile] of DRAWERS) {
  await page.click(`nav[aria-label="Compartment index"] button:has-text("${code}")`);
  await page.waitForFunction(() => window.__archive.getState().stage === 'locker');
  await settle();
  await page.waitForTimeout(700);
  await page.mouse.move(5, 895);
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const camera = window.__camera;
    const Vector = camera.position.constructor;
    const blockers = [];
    window.__scene.traverse((object) => {
      if (!object.isMesh || !object.visible || object.geometry.type !== 'BoxGeometry') return;
      const material = object.material;
      if (material.transparent && material.opacity < 0.05) return;
      if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
      blockers.push(object);
    });
    const targets = [];
    window.__scene.traverse((object) => {
      if (!object.isMesh || !object.visible) return;
      const label = Math.abs(object.scale.x - 0.26) < 1e-3 && Math.abs(object.scale.y - 0.045) < 1e-3;
      const stripe = Math.abs(object.scale.x - 0.54) < 1e-3 && Math.abs(object.scale.y - 0.016) < 1e-3;
      if (label || stripe) targets.push(object);
    });
    let hidden = 0;
    for (const target of targets) {
      for (const u of [-0.4, 0, 0.4]) {
        const point = target.localToWorld(new Vector(u, 0, 0));
        const origin = camera.position.clone();
        const direction = point.clone().sub(origin);
        const reach = direction.length();
        direction.normalize();
        const blocked = blockers.some((mesh) => {
          mesh.updateWorldMatrix(true, false);
          const inverse = mesh.matrixWorld.clone().invert();
          const o = origin.clone().applyMatrix4(inverse);
          const d = origin.clone().add(direction).applyMatrix4(inverse).sub(o);
          const { min, max } = mesh.geometry.boundingBox;
          let near = -Infinity;
          let far = Infinity;
          for (const axis of ['x', 'y', 'z']) {
            if (Math.abs(d[axis]) < 1e-12) {
              if (o[axis] < min[axis] || o[axis] > max[axis]) return false;
              continue;
            }
            let t1 = (min[axis] - o[axis]) / d[axis];
            let t2 = (max[axis] - o[axis]) / d[axis];
            if (t1 > t2) [t1, t2] = [t2, t1];
            near = Math.max(near, t1);
            far = Math.min(far, t2);
          }
          return near <= far && near > 0 && near < reach - 0.012;
        });
        if (blocked) hidden += 1;
      }
    }
    return { targets: targets.length, hidden };
  });

  await page.evaluate((id) => window.__archive.getState().selectFile(id), rearFile);
  await page.waitForTimeout(100);
  await settle();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(100);
  await settle();
  const stage = await page.evaluate(() => window.__archive.getState().stage);

  console.log(`${code}: targets ${result.targets}, hidden rays ${result.hidden}, after raise+lower: ${stage}`);
  if (result.targets === 0 || result.hidden > 0 || stage !== 'locker') failures.push(code);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__archive.getState().stage === 'vault');
  await settle();
  await page.waitForTimeout(400);
}

await browser.close();
if (errors.length) failures.push(`console errors: ${errors.slice(0, 3).join(' | ')}`);
if (failures.length) {
  console.error(`FAILED: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('PASSED: every tab and stripe visible in all five drawers');
}
