/**
 * Material realism probe.
 *
 * Captures the vault, the A-01 drawer and the raised ALPHA dossier at
 * 1440×900, writes the mean luminance of each shot to a JSON report, and —
 * with --check — asserts that the material work is wired up.
 *
 * Checks:
 *   textures     all nine texture files answered 200 and worn materials carry maps
 *   offline      no request left localhost (data:/blob: excepted)
 *   errors       no console error or page error
 *   geometry     no worn-material mesh is still a unit box/plane stretched by scale
 *   environment  scene.environment exists; intensity 0 at the top, 0.3 at the vault
 *   tonemap      tone mapping applied once (renderer NoToneMapping unless tier is low)
 *   opaqueCards  filed cards at full opacity are not transparent
 *
 * Run:  node tests/material-shots.mjs --prefix=baseline
 *       node tests/material-shots.mjs --prefix=after --check=textures,offline,errors
 * The dev server must be on :3100.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { gotoVault, launchBrowser } from './browser.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value = ''] = arg.replace(/^--/, '').split('=');
    return [key, value];
  }),
);
const PREFIX = args.prefix || 'after';
const CHECKS = new Set((args.check || '').split(',').filter(Boolean));
const OUT = 'tests/shots';
mkdirSync(OUT, { recursive: true });

const TEXTURE_FILES = ['green_metal_rust', 'concrete_floor_worn_001', 'plastered_wall_04'].flatMap(
  (set) => ['diff', 'nor_gl', 'rough'].map((map) => `/textures/${set}/${set}_${map}_1k.jpg`),
);
const LOCAL = new Set(['localhost', '127.0.0.1']);

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

// Three.js announces its renderer to devtools; keep hold of it and of the
// archive scene it renders. Post-processing renders its own full-screen
// scenes through the same renderer, so only the scene with fog — the room —
// is kept.
await page.addInitScript(() => {
  const hook = new EventTarget();
  hook.addEventListener('observe', (event) => {
    const renderer = event.detail;
    if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement || renderer.__probed) return;
    const render = renderer.render;
    renderer.render = function probed(scene, camera) {
      window.__gl = this;
      if (scene.fog) window.__scene = scene;
      return render.call(this, scene, camera);
    };
    renderer.__probed = true;
  });
  window.__THREE_DEVTOOLS__ = hook;
});

const errors = [];
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
page.on('pageerror', (error) => errors.push(String(error)));
const external = [];
page.on('request', (request) => {
  const url = new URL(request.url());
  if (url.protocol === 'data:' || url.protocol === 'blob:') return;
  if (!LOCAL.has(url.hostname)) external.push(request.url());
});
const textureStatus = {};
page.on('response', (response) => {
  const { pathname } = new URL(response.url());
  if (TEXTURE_FILES.includes(pathname)) textureStatus[pathname] = response.status();
});

const settle = () =>
  page.waitForFunction(() => !window.__archive.getState().isCameraMoving, null, { timeout: 15000 });

const inspect = () =>
  page.evaluate(() => {
    const scene = window.__scene;
    const gl = window.__gl;
    const worn = new Set();
    const textured = new Set();
    let stretched = 0;
    let cards = 0;
    let transparentCards = 0;
    scene.traverse((object) => {
      if (!object.isMesh) return;
      const material = object.material;
      if (material?.userData?.worn) {
        worn.add(material);
        if (material.map || material.normalMap) textured.add(material);
        const p = object.geometry.parameters || {};
        const unitBox = object.geometry.type === 'BoxGeometry' && p.width === 1 && p.height === 1 && p.depth === 1;
        const unitPlane = object.geometry.type === 'PlaneGeometry' && p.width === 1 && p.height === 1;
        const scaled = object.scale.x !== 1 || object.scale.y !== 1 || object.scale.z !== 1;
        if ((unitBox || unitPlane) && scaled) stretched += 1;
      }
      const isCard = Math.abs(object.scale.x - 0.58) < 1e-3 && Math.abs(object.scale.y - 0.345) < 1e-3;
      if (isCard && material.opacity > 0.99) {
        cards += 1;
        if (material.transparent) transparentCards += 1;
      }
    });
    return {
      wornMaterials: worn.size,
      texturedMaterials: textured.size,
      stretched,
      cards,
      transparentCards,
      environment: Boolean(scene.environment),
      envIntensity: +scene.environmentIntensity.toFixed(3),
      toneMapping: gl.toneMapping,
      quality: window.__archive.getState().quality,
    };
  });

/** Screenshot, then the mean luminance (0–1) of what was captured. */
const shot = async (name) => {
  const buffer = await page.screenshot({ path: `${OUT}/${PREFIX}-${name}.png` });
  return page.evaluate(async (base64) => {
    const blob = await (await fetch(`data:image/png;base64,${base64}`)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const data = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    return +(sum / (data.length / 4) / 255).toFixed(4);
  }, buffer.toString('base64'));
};

await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
const atTop = await inspect();

await gotoVault(page);
const vault = await inspect();
const luminance = { vault: await shot('vault') };

await page.click('nav[aria-label="Compartment index"] button:has-text("A-01")');
await page.waitForFunction(() => window.__archive.getState().stage === 'locker');
await settle();
await page.waitForTimeout(600);
await page.mouse.move(5, 895);
await page.waitForTimeout(300);
const drawer = await inspect();
luminance.drawer = await shot('drawer');

await page.evaluate(() => window.__archive.getState().selectFile('alpha'));
await page.waitForTimeout(100);
await settle();
await page.waitForTimeout(400);
luminance.file = await shot('file');

await page.keyboard.press('Escape');
await page.waitForTimeout(100);
await settle();
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__archive.getState().stage === 'vault');
await settle();

const report = { prefix: PREFIX, luminance, atTop, vault, drawer, textureStatus, external, errors };
writeFileSync(`${OUT}/${PREFIX}-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

const failures = [];
const check = (name, ok, detail) => {
  if (CHECKS.has(name) && !ok) failures.push(`${name}: ${detail}`);
};
check(
  'textures',
  TEXTURE_FILES.every((file) => textureStatus[file] === 200) && vault.texturedMaterials > 0,
  JSON.stringify({ textureStatus, textured: vault.texturedMaterials }),
);
check('offline', external.length === 0, external.slice(0, 5).join(', '));
check('errors', errors.length === 0, errors.slice(0, 5).join(' | '));
check('geometry', vault.stretched === 0 && drawer.stretched === 0, `stretched: vault ${vault.stretched}, drawer ${drawer.stretched}`);
check(
  'environment',
  vault.environment && atTop.envIntensity === 0 && Math.abs(vault.envIntensity - 0.3) < 0.02,
  JSON.stringify({ top: atTop.envIntensity, vault: vault.envIntensity, environment: vault.environment }),
);
check(
  'tonemap',
  vault.quality === 'low' ? vault.toneMapping === 4 : vault.toneMapping === 0,
  `quality ${vault.quality}, renderer toneMapping ${vault.toneMapping}`,
);
check('opaqueCards', drawer.cards > 0 && drawer.transparentCards === 0, `${drawer.transparentCards}/${drawer.cards} full-opacity cards still transparent`);

await browser.close();
if (failures.length) {
  console.error(`FAILED\n${failures.join('\n')}`);
  process.exitCode = 1;
} else if (CHECKS.size) {
  console.log(`PASSED: ${[...CHECKS].join(', ')}`);
}
