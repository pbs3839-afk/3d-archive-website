# 재질 현실감 (1단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 매끈한 단색 절차적 캐비닛을, 실사 CC0 텍스처와 절차적 모서리 마모·때, 환경 반사, SSAO로 "오래 쓴 현역 정부 시설 강철 캐비닛"처럼 보이게 만든다.

**Architecture:** 모든 박스를 미터 단위 UV를 가진 캐시 지오메트리(`metricBox`)로 바꾸고, 재질 11개(+`wall`)를 `onBeforeCompile`로 확장한 `MeshStandardMaterial`(`createWornMaterial`)로 교체한다. 텍스처는 비동기로 로드해 준비되면 붙인다. 환경 반사는 씬 안의 Lightformer로 만들고, 강도는 인트로 조명 진행도를 따라간다. SSAO와 톤매핑은 `@react-three/postprocessing`으로, low 단계에서는 끈다.

**Tech Stack:** Next.js 15.5, React ~19.2, @react-three/fiber 9.7.0, @react-three/drei 10.7, three 0.180, GSAP 3.15, Zustand 5, @react-three/postprocessing 3.1 + postprocessing 6.x (새로 설치), Playwright (검증), `node --test` (단위 테스트, Node 22.23 타입 스트리핑)

**Spec:** `docs/superpowers/specs/2026-09-22-material-realism-design.md`

## Global Constraints

- **git 작업 금지**: 이 폴더는 git 저장소가 아니다. CLAUDE.md상 git 작업은 별도 승인이 필요하다. 각 태스크의 마지막은 "커밋" 대신 **"체크포인트"**(검증 결과 기록)다.
- **외부 연결**은 승인된 두 가지만: `dl.polyhaven.org`에서 텍스처 파일 9개 다운로드, npm으로 `@react-three/postprocessing@^3.1.1`과 `postprocessing@^6.36.0` 설치. 배포·push·그 밖의 외부 서비스 연결은 금지.
- **런타임 외부 요청 0건**: 실행 중에는 `localhost` 외의 도메인에서 아무것도 받지 않는다. drei `Environment`의 `preset`/`files`는 사용 금지.
- **팔레트 유지**: 재질의 tint·roughness·metalness는 지금 `materials.tsx` 값을 그대로 쓴다. 재질 표에 적힌 값만 사용한다.
- **버전 고정**: React는 `~19.2.0`을 유지한다(R3F 9.7이 React 19.3 미만을 요구).
- **dev 서버 관리**
  - 서버는 `preview_start` 이름 `"archive"`(포트 3100)로 띄운다.
  - dev 서버가 도는 동안 `.next`를 지우거나 `npm run build`를 실행하지 않는다. 빌드가 필요하면 먼저 `preview_stop`.
- **편집 도구**: 코드 수정은 Edit/Write 도구로 한다. `|`가 들어간 패턴을 perl이나 sed로 치환하면 파일이 망가진 전례가 있다.
- **범위**
  - 서류 카드 재질과 GLB 경로는 범위 밖이다.
  - 카메라, 코레오그래피, 스크롤 구간·길이, HUD, 데이터는 건드리지 않는다. 예외는 `introTimeline.ts`의 `setAmbientLevel(lit)` 한 줄뿐이다.
  - 모바일 최적화는 우선순위가 아니다.
- **튜닝 한도**: N8AO는 `aoRadius` 0.2~0.6, `intensity` 1.5~4 안에서, 환경 강도는 0.2~0.45 안에서, 각각 한 번만 조정할 수 있다. 최종값은 보고서에 적는다.

---

## 파일 구조

| 파일 | 책임 | 상태 |
| --- | --- | --- |
| `src/lib/metricBox.ts` | 미터 UV 박스·평면 지오메트리, `edgeUv` 속성, 캐시, seed | 새 파일 |
| `src/lib/textureStats.ts` | 픽셀 평균 휘도·채널 평균 (DOM 없음, 단위 테스트 대상) | 새 파일 |
| `src/lib/textures.ts` | 텍스처 세트 정의·비동기 로드·anisotropy | 새 파일 |
| `src/lib/wornMaterial.ts` | 마모 재질 팩토리 (셰이더 패치, 텍스처 부착, 실패 시 경고) | 새 파일 |
| `src/components/canvas/PostEffects.tsx` | EffectComposer + N8AO + ToneMapping, 렌더러 톤매핑 전환 | 새 파일 |
| `src/components/canvas/materials.tsx` | 재질 12개 생성(`wall` 추가), 단계별 anisotropy | 수정 |
| `src/components/canvas/{ProceduralCabinet,Locker,SealedLocker,Drawer,DoorFurniture,OuterDoors,HingedPanel,Room}.tsx` | `UNIT_BOX`+scale → `metricBox`, seed 전달 | 수정 |
| `src/components/canvas/Lighting.tsx` | Environment(Lightformer), 환경 강도 useFrame | 수정 |
| `src/lib/sceneRegistry.ts` | ambient level, `LIGHT_TARGETS.environment` | 수정 |
| `src/lib/introTimeline.ts` | `setAmbientLevel(lit)` | 수정 |
| `src/components/canvas/Scene.tsx` | `<PostEffects />` 마운트 | 수정 |
| `src/components/canvas/ArchiveFile.tsx` | 완전히 보이는 카드는 불투명 | 수정 |
| `public/textures/**` | 텍스처 9개 + README(라이선스) | 새 파일 |
| `tests/unit/metricBox.test.mjs`, `tests/unit/textureStats.test.mjs` | 단위 테스트 | 새 파일 |
| `tests/material-shots.mjs` | 전후 캡처·휘도·배선 점검(`--check`) | 새 파일 |
| `tests/tab-visibility.mjs` | 탭 가림 회귀 테스트 (지오메트리 무관) | 새 파일 |
| `tests/texture-fallback.mjs` | 텍스처 404일 때도 정상 작동 | 새 파일 |
| `package.json` | 의존성 2개, `test:unit` 스크립트 | 수정 |

---

### Task 0: 측정 도구와 기준선(baseline)

**Files:**
- Create: `tests/material-shots.mjs`

**Interfaces:**
- Produces:
  - `node tests/material-shots.mjs --prefix=<name> [--check=a,b,...]`
  - 결과물: `tests/shots/<prefix>-{vault,drawer,file}.png`, `tests/shots/<prefix>-report.json`
  - 점검 이름: `textures`, `offline`, `errors`, `geometry`, `environment`, `tonemap`, `opaqueCards`
- 이후 태스크는 이 스크립트를 `--check`로 호출해 "실패하는 테스트 → 구현 → 통과"를 확인한다.

- [ ] **Step 1: dev 서버 확인**

  `preview_list`로 "archive" 서버가 떠 있는지 본다. 없으면 `preview_start {name: "archive"}`.

- [ ] **Step 2: `tests/material-shots.mjs` 작성**

```js
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
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });

// Three.js announces its renderer to devtools; keep hold of it and of whatever it renders.
await page.addInitScript(() => {
  const hook = new EventTarget();
  hook.addEventListener('observe', (event) => {
    const renderer = event.detail;
    if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement || renderer.__probed) return;
    const render = renderer.render;
    renderer.render = function probed(scene, camera) {
      window.__gl = this;
      window.__scene = scene;
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

await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);
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
```

- [ ] **Step 3: 기준선 캡처**

  Run: `node tests/material-shots.mjs --prefix=baseline`

  Expected: 종료 코드 0. `tests/shots/baseline-{vault,drawer,file}.png`와 `baseline-report.json`이 생긴다. `errors: []`, `external: []`.

- [ ] **Step 4: 기준선 FPS (앱 브라우저 패널)**

  브라우저 패널에서 `http://localhost:3100`을 연다. 금고 화면까지 스크롤한 뒤 `javascript_tool`로 실행한다.

```js
window.scrollTo(0, document.documentElement.scrollHeight);
await new Promise((r) => setTimeout(r, 3000));
await new Promise((resolve) => {
  let frames = 0;
  const start = performance.now();
  const tick = () => {
    frames += 1;
    if (performance.now() - start < 3000) requestAnimationFrame(tick);
    else resolve(+(frames / 3).toFixed(1));
  };
  requestAnimationFrame(tick);
});
```

  Expected: 숫자(FPS) 하나. `tests/shots/baseline-fps.txt`에 적는다. 예: `vault 60.0`.

- [ ] **Step 5: 체크포인트**: 기준선 파일 4개(캡처 3장 + report)와 FPS 값이 있다.

---

### Task 1: 텍스처 다운로드와 패키지 설치

**Files:**
- Create: `public/textures/green_metal_rust/*_1k.jpg`, `public/textures/concrete_floor_worn_001/*_1k.jpg`, `public/textures/plastered_wall_04/*_1k.jpg` (각 3개), `public/textures/README.md`
- Modify: `package.json`, `package-lock.json` (npm이 수정)

**Interfaces:**
- Produces: `/textures/<folder>/<folder>_{diff,nor_gl,rough}_1k.jpg` 경로 9개. Task 3의 `TEXTURE_SETS.folder`와 일치해야 한다.

- [ ] **Step 1: 다운로드 (승인된 9개 파일만)**

```bash
cd "/c/Users/kosta1/Desktop/3D 웹사이트 모델링"
for set in green_metal_rust concrete_floor_worn_001 plastered_wall_04; do
  mkdir -p "public/textures/$set"
  for map in diff nor_gl rough; do
    curl -fsSL --max-time 60 -o "public/textures/$set/${set}_${map}_1k.jpg" \
      "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/$set/${set}_${map}_1k.jpg"
  done
done
ls -l public/textures/*/
```

  Expected: 파일 9개. 크기가 대략 다음과 같다(KB).
  - green_metal_rust: 207 / 119 / 121
  - concrete_floor_worn_001: 116 / 108 / 178
  - plastered_wall_04: 292 / 417 / 237

  0바이트이거나 크기가 크게 다르면 중단하고 보고한다.

- [ ] **Step 2: 색 맵 3장을 직접 확인**

  Read 도구로 `*_diff_1k.jpg` 3장을 연다. `green_metal_rust`에서 **볼트·녹 자국이 규칙적인 격자로 두드러지는지** 확인하고 결과를 기록한다. 이 판단은 Task 4 Step 1의 `DOTS` 값을 정한다.
  - 두드러지면: `DOTS = true` (paintedSteel 재질이 색 맵 없이 `maps: 'surface'`만 씀)
  - 아니면: `DOTS = false`

- [ ] **Step 3: `public/textures/README.md` 작성**

```markdown
# Textures

Scanned PBR sets from [Poly Haven](https://polyhaven.com), licensed **CC0**
(public domain — no attribution required). 1K JPG, downloaded 2026-09-22.

| Folder | Asset page | Used for |
| --- | --- | --- |
| `green_metal_rust` | https://polyhaven.com/a/green_metal_rust | Cabinet steel (grain, relief, roughness) |
| `concrete_floor_worn_001` | https://polyhaven.com/a/concrete_floor_worn_001 | Floor |
| `plastered_wall_04` | https://polyhaven.com/a/plastered_wall_04 | Back wall |

Maps per set: `_diff_` (colour, sRGB), `_nor_gl_` (OpenGL normal), `_rough_`
(roughness, read from the green channel). Loaded by `src/lib/textures.ts`.
The colour is desaturated and multiplied into each material's tint in
`src/lib/wornMaterial.ts`, so the originals' hues never show.
```

- [ ] **Step 4: 패키지 설치**

```bash
cd "/c/Users/kosta1/Desktop/3D 웹사이트 모델링"
npm install @react-three/postprocessing@^3.1.1 postprocessing@^6.36.0
npm ls @react-three/postprocessing postprocessing react @react-three/fiber three
```

  Expected: ERESOLVE 없이 설치된다. `react@19.2.x`와 `@react-three/fiber@9.7.0`은 그대로다. ERESOLVE가 나면 `--force`나 `--legacy-peer-deps`를 쓰지 말고 **중단하고 보고**한다.

- [ ] **Step 5: `test:unit` 스크립트 추가** (`package.json`의 `"scripts"`)

```json
    "typecheck": "tsc --noEmit",
    "test:unit": "node --no-warnings --test \"tests/unit/*.test.mjs\""
```

- [ ] **Step 6: 체크포인트**: `npx tsc --noEmit` 통과. 텍스처 파일 9개, README, 패키지 2개가 있다. `DOTS` 판단을 기록했다.

---

### Task 2: 탭 가림 회귀 테스트를 지오메트리 무관하게

지금 쓰는 검증 스크립트는 "단위 박스 + scale"을 전제로 한다. 지오메트리를 바꾸기 **전에**, 두 방식 모두에서 작동하는 회귀 테스트를 먼저 만든다.

**Files:**
- Create: `tests/tab-visibility.mjs`

**Interfaces:**
- Produces: `node tests/tab-visibility.mjs`. 서랍 5개의 탭 글씨·색 띠 28곳이 모두 보이고, 뒤 카드를 꺼냈다 넣은 뒤 `locker`로 돌아오고, 콘솔 에러가 0이면 종료 코드 0.

- [ ] **Step 1: 테스트 작성**

```js
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
import { chromium } from '@playwright/test';

const DRAWERS = [
  ['A-01', 'alpha'],
  ['B-04', 'delta'],
  ['C-08', 'zeta'],
  ['D-11', 'kappa'],
  ['E-15', 'nu'],
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.addInitScript(() => {
  const hook = new EventTarget();
  hook.addEventListener('observe', (event) => {
    const renderer = event.detail;
    if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement || renderer.__probed) return;
    const render = renderer.render;
    renderer.render = function probed(scene, camera) {
      window.__camera = camera;
      window.__scene = scene;
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
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);

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
```

- [ ] **Step 2: 지금 코드에서 실행** (지오메트리 변경 전)

  Run: `node tests/tab-visibility.mjs`

  Expected: `A-01: targets 6, hidden rays 0 …` ~ `E-15: targets 4 …`, 그리고 `PASSED`. 합계 28곳이다. 실패하면 테스트 버그이므로 여기서 고친다.

- [ ] **Step 3: 체크포인트**: PASSED 출력을 기록한다.

---

### Task 3: `metricBox`, `textureStats`, `textures` (TDD)

**Files:**
- Create: `src/lib/metricBox.ts`, `src/lib/textureStats.ts`, `src/lib/textures.ts`
- Test: `tests/unit/metricBox.test.mjs`, `tests/unit/textureStats.test.mjs`

**Interfaces:**
- Produces:
  - `metricBox(width: number, height: number, depth: number, seed?: number): BoxGeometry` (속성 `uv` 미터 단위 + 오프셋, `edgeUv` vec4)
  - `metricPlane(width: number, height: number, seed?: number): PlaneGeometry`
  - `srgbToLinear(v: number): number`, `meanLinearLuminance(rgba: ArrayLike<number>): number`, `meanChannel(rgba: ArrayLike<number>, channel: 0|1|2): number`
  - `type TextureSetId = 'paintedSteel' | 'concreteFloor' | 'plasterWall'`
  - `TEXTURE_SETS`, `interface LoadedTextureSet { color; normal; roughness: Texture; colorMean: number; roughnessMean: number }`
  - `loadTextureSet(id): Promise<LoadedTextureSet>`, `setTextureAnisotropy(value: number): void`
- 주의: `metricBox.ts`와 `textureStats.ts`는 **상대 경로와 `three`만 import**한다. `@/` 별칭을 쓰면 `node --test`에서 풀리지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**: `tests/unit/metricBox.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metricBox, metricPlane } from '../../src/lib/metricBox.ts';

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-5, `${message}: ${actual} != ${expected}`);

test('every face carries its own size in metres in edgeUv', () => {
  const geometry = metricBox(2, 1, 0.5, 7);
  const edge = geometry.getAttribute('edgeUv');
  // +x, -x: depth × height | +y, -y: width × depth | +z, -z: width × height
  const sizes = [[0.5, 1], [0.5, 1], [2, 0.5], [2, 0.5], [2, 1], [2, 1]];
  assert.equal(edge.count, 24);
  for (let i = 0; i < 24; i += 1) {
    const [w, h] = sizes[Math.floor(i / 4)];
    close(edge.getZ(i), w, `face width at vertex ${i}`);
    close(edge.getW(i), h, `face height at vertex ${i}`);
    assert.ok([0, w].some((v) => Math.abs(edge.getX(i) - v) < 1e-5), `u at ${i} is an edge`);
    assert.ok([0, h].some((v) => Math.abs(edge.getY(i) - v) < 1e-5), `v at ${i} is an edge`);
  }
});

test('uv is edgeUv shifted by one offset for the whole box', () => {
  const geometry = metricBox(2, 1, 0.5, 7);
  const uv = geometry.getAttribute('uv');
  const edge = geometry.getAttribute('edgeUv');
  const du = uv.getX(0) - edge.getX(0);
  const dv = uv.getY(0) - edge.getY(0);
  assert.ok(du >= 0 && du < 4 && dv >= 0 && dv < 4, `offset (${du}, ${dv}) within [0, 4)`);
  for (let i = 0; i < uv.count; i += 1) {
    close(uv.getX(i) - edge.getX(i), du, `u offset at ${i}`);
    close(uv.getY(i) - edge.getY(i), dv, `v offset at ${i}`);
  }
});

test('same size and seed share geometry; another seed gets another patch', () => {
  const a = metricBox(0.9, 0.7, 0.026, 11);
  const b = metricBox(0.9, 0.7, 0.026, 11);
  const c = metricBox(0.9, 0.7, 0.026, 12);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.notEqual(a.getAttribute('uv').getX(0), c.getAttribute('uv').getX(0));
});

test('plane uvs are metric and have no edge attribute', () => {
  const plane = metricPlane(46, 46);
  const uv = plane.getAttribute('uv');
  const xs = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
  close(Math.max(...xs) - Math.min(...xs), 46, 'u span');
  assert.equal(plane.getAttribute('edgeUv'), undefined);
});
```

- [ ] **Step 2: 실패하는 테스트 작성**: `tests/unit/textureStats.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meanChannel, meanLinearLuminance, srgbToLinear } from '../../src/lib/textureStats.ts';

const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-4, `${message}: ${actual} != ${expected}`);

test('srgbToLinear matches the sRGB transfer curve', () => {
  close(srgbToLinear(0), 0, 'black');
  close(srgbToLinear(1), 1, 'white');
  close(srgbToLinear(128 / 255), 0.21586, 'mid grey');
  close(srgbToLinear(0.04), 0.04 / 12.92, 'linear toe');
});

test('meanLinearLuminance averages decoded luminance over pixels', () => {
  const pixels = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255]);
  close(meanLinearLuminance(pixels), 0.5, 'white + black');
  close(meanLinearLuminance(new Uint8ClampedArray([128, 128, 128, 255])), 0.21586, 'mid grey');
  assert.equal(meanLinearLuminance(new Uint8ClampedArray([])), 0);
});

test('meanChannel reads one raw channel', () => {
  const pixels = new Uint8ClampedArray([0, 128, 0, 255, 0, 255, 0, 255]);
  close(meanChannel(pixels, 1), (128 / 255 + 1) / 2, 'green');
  close(meanChannel(pixels, 0), 0, 'red');
});
```

- [ ] **Step 3: 실패 확인**

  Run: `npm run test:unit`

  Expected: FAIL. `ERR_MODULE_NOT_FOUND …/src/lib/metricBox.ts`와 `…/textureStats.ts`.

- [ ] **Step 4: `src/lib/metricBox.ts` 구현**

```ts
import { BoxGeometry, BufferAttribute, PlaneGeometry } from 'three';

/**
 * Box and plane geometry with UVs measured in metres.
 *
 * The procedural cabinet used to scale one shared unit cube per mesh. That is
 * cheap, but its UVs run 0–1 on every face whatever the face's size, so a
 * texture laid on it stretches differently on a 3m panel and a 2cm handle.
 * Here each face's UVs are its real extent in metres, and a texture set's
 * `repeat` (1 / its real-world size) turns that into the right grain density.
 *
 * Every box also carries `edgeUv` = (u, v, faceWidth, faceHeight) in metres,
 * without the random offset, so the wear shader can measure how far a
 * fragment is from the edge of its face.
 *
 * Geometry is cached by dimensions and seed: identical parts share one
 * geometry, and `seed` is how two same-sized parts (nine drawer fronts) get
 * different patches of the texture instead of an obvious copy.
 */

/** Largest random UV offset, in metres — larger than every texture set's size. */
const MAX_OFFSET = 4;

const boxes = new Map<string, BoxGeometry>();
const planes = new Map<string, PlaneGeometry>();

function keyFor(dims: number[], seed: number): string {
  return `${dims.map((n) => n.toFixed(4)).join('x')}#${seed}`;
}

/** FNV-1a, folded into two numbers in [0, 1). Deterministic across reloads. */
function hash2(text: string): [number, number] {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const a = (h >>> 0) / 0x100000000;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  const b = (h >>> 0) / 0x100000000;
  return [a, b];
}

export function metricBox(width: number, height: number, depth: number, seed = 0): BoxGeometry {
  const key = keyFor([width, height, depth], seed);
  const cached = boxes.get(key);
  if (cached) return cached;

  const geometry = new BoxGeometry(width, height, depth);
  // BoxGeometry builds its faces in this order, four vertices each:
  // +x, -x (depth × height), +y, -y (width × depth), +z, -z (width × height).
  const faceSizes: Array<[number, number]> = [
    [depth, height],
    [depth, height],
    [width, depth],
    [width, depth],
    [width, height],
    [width, height],
  ];
  const [a, b] = hash2(key);
  const offsetU = a * MAX_OFFSET;
  const offsetV = b * MAX_OFFSET;

  const uv = geometry.getAttribute('uv');
  const edge = new Float32Array(uv.count * 4);
  for (let i = 0; i < uv.count; i += 1) {
    const [faceWidth, faceHeight] = faceSizes[Math.floor(i / 4)];
    const u = uv.getX(i) * faceWidth;
    const v = uv.getY(i) * faceHeight;
    edge.set([u, v, faceWidth, faceHeight], i * 4);
    uv.setXY(i, u + offsetU, v + offsetV);
  }
  uv.needsUpdate = true;
  geometry.setAttribute('edgeUv', new BufferAttribute(edge, 4));

  boxes.set(key, geometry);
  return geometry;
}

/** A plane with metric UVs. No `edgeUv`: a floor has no worn edge. */
export function metricPlane(width: number, height: number, seed = 0): PlaneGeometry {
  const key = keyFor([width, height], seed);
  const cached = planes.get(key);
  if (cached) return cached;

  const geometry = new PlaneGeometry(width, height);
  const [a, b] = hash2(key);
  const uv = geometry.getAttribute('uv');
  for (let i = 0; i < uv.count; i += 1) {
    uv.setXY(i, uv.getX(i) * width + a * MAX_OFFSET, uv.getY(i) * height + b * MAX_OFFSET);
  }
  uv.needsUpdate = true;

  planes.set(key, geometry);
  return geometry;
}
```

- [ ] **Step 5: `src/lib/textureStats.ts` 구현**

```ts
/**
 * Pixel statistics for texture maps, kept apart from the loader so they can be
 * unit-tested without a DOM.
 */

/** An sRGB-encoded channel (0–1) as linear light — what the GPU decodes a colour map to. */
export function srgbToLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Mean linear luminance of RGBA pixels (0–255) taken from an sRGB colour map. */
export function meanLinearLuminance(rgba: ArrayLike<number>): number {
  const count = Math.floor(rgba.length / 4);
  if (count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < count * 4; i += 4) {
    sum +=
      0.2126 * srgbToLinear(rgba[i] / 255) +
      0.7152 * srgbToLinear(rgba[i + 1] / 255) +
      0.0722 * srgbToLinear(rgba[i + 2] / 255);
  }
  return sum / count;
}

/** Mean of one raw channel (0–1), for data maps such as roughness that are sampled undecoded. */
export function meanChannel(rgba: ArrayLike<number>, channel: 0 | 1 | 2): number {
  const count = Math.floor(rgba.length / 4);
  if (count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < count * 4; i += 4) sum += rgba[i + channel] / 255;
  return sum / count;
}
```

- [ ] **Step 6: 테스트 통과 확인**

  Run: `npm run test:unit`

  Expected: `# pass 7`, `# fail 0`

- [ ] **Step 7: `src/lib/textures.ts` 구현**

```ts
import { NoColorSpace, RepeatWrapping, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import { meanChannel, meanLinearLuminance } from './textureStats';

/**
 * The scanned PBR sets the procedural cabinet is dressed in.
 *
 * All CC0 from Poly Haven (see public/textures/README.md), 1K JPG, served from
 * this site — nothing is fetched from another origin at runtime. `realSize` is
 * the physical width one tile of the scan covers, in metres; with the metric
 * UVs from `metricBox` it sets the grain to its true scale.
 */
export type TextureSetId = 'paintedSteel' | 'concreteFloor' | 'plasterWall';

export const TEXTURE_SETS: Record<TextureSetId, { folder: string; realSize: number }> = {
  paintedSteel: { folder: 'green_metal_rust', realSize: 1.0 },
  concreteFloor: { folder: 'concrete_floor_worn_001', realSize: 3.0 },
  plasterWall: { folder: 'plastered_wall_04', realSize: 3.2 },
};

export interface LoadedTextureSet {
  color: Texture;
  normal: Texture;
  roughness: Texture;
  /** Mean linear luminance of the colour map. Dividing it out keeps the tint. */
  colorMean: number;
  /** Mean of the roughness map's green channel, the one three reads. */
  roughnessMean: number;
}

const loader = new TextureLoader();
const requests = new Map<TextureSetId, Promise<LoadedTextureSet>>();
const loaded: Texture[] = [];
let anisotropy = 4;

function urlFor(id: TextureSetId, map: 'diff' | 'nor_gl' | 'rough'): string {
  const { folder } = TEXTURE_SETS[id];
  return `/textures/${folder}/${folder}_${map}_1k.jpg`;
}

function prepare(texture: Texture, id: TextureSetId, srgb: boolean): Texture {
  const repeat = 1 / TEXTURE_SETS[id].realSize;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  loaded.push(texture);
  return texture;
}

/** A 32×32 sample of an image — enough for a mean, cheap enough to take on load. */
function samplePixels(image: CanvasImageSource): Uint8ClampedArray {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  if (!context) return new Uint8ClampedArray([128, 128, 128, 255]);
  context.drawImage(image, 0, 0, 32, 32);
  return context.getImageData(0, 0, 32, 32).data;
}

/** Load a set once; every caller shares the same promise and the same textures. */
export function loadTextureSet(id: TextureSetId): Promise<LoadedTextureSet> {
  const existing = requests.get(id);
  if (existing) return existing;

  const request = Promise.all([
    loader.loadAsync(urlFor(id, 'diff')),
    loader.loadAsync(urlFor(id, 'nor_gl')),
    loader.loadAsync(urlFor(id, 'rough')),
  ]).then(([color, normal, roughness]) => ({
    color: prepare(color, id, true),
    normal: prepare(normal, id, false),
    roughness: prepare(roughness, id, false),
    colorMean: Math.max(0.02, meanLinearLuminance(samplePixels(color.image))),
    roughnessMean: Math.max(0.05, meanChannel(samplePixels(roughness.image), 1)),
  }));

  requests.set(id, request);
  return request;
}

/** Sharper grain at glancing angles, scaled to the device tier. */
export function setTextureAnisotropy(value: number): void {
  anisotropy = value;
  loaded.forEach((texture) => {
    texture.anisotropy = value;
    texture.needsUpdate = true;
  });
}
```

- [ ] **Step 8: 타입 검사**

  Run: `npx tsc --noEmit`

  Expected: 출력 없음(통과).

- [ ] **Step 9: 체크포인트**: `test:unit`에서 7개 통과, tsc 통과.

---

### Task 4: 마모 재질과 `materials.tsx`

**Files:**
- Create: `src/lib/wornMaterial.ts`
- Modify: `src/components/canvas/materials.tsx`
- Test: `tests/material-shots.mjs --check=textures,offline,errors`

**Interfaces:**
- Consumes: `loadTextureSet`, `LoadedTextureSet`, `TextureSetId`, `setTextureAnisotropy` (Task 3), `FLOOR_Y` (`cabinetLayout.ts`)
- Produces:
  - `createWornMaterial(options: WornMaterialOptions): MeshStandardMaterial`
    - 옵션: `{ tint; roughness; metalness; set; maps?: 'full'|'surface'; edgeWear?; grime?; detail? }`
    - 만든 재질에는 `material.userData.worn === true`가 붙는다.
  - `CabinetMaterials`에 `wall: MeshStandardMaterial` 추가

- [ ] **Step 1: 실패 확인**

  Run: `node tests/material-shots.mjs --prefix=t4 --check=textures`

  Expected: 종료 코드 1, `FAILED textures: {"textureStatus":{},"textured":0}`.

- [ ] **Step 2: `src/lib/wornMaterial.ts` 작성**

  이 셰이더 코드는 계획 작성 중 헤드리스 Chromium의 WebGL에서 컴파일되는 것을 확인했다. 확인한 조합은 텍스처 없음 / 텍스처 있음 × `edgeUv` 있는 박스 / 없는 박스이고, 결과는 에러 0에 픽셀 값 정상이었다.

```ts
import { Color, MeshStandardMaterial } from 'three';
import { FLOOR_Y } from './cabinetLayout';
import { loadTextureSet, type LoadedTextureSet, type TextureSetId } from './textures';

/**
 * Service-issue steel that has been in service.
 *
 * A MeshStandardMaterial with three additions, all driven by uniforms so every
 * worn material shares one shader program:
 *
 * 1. Scanned grain. The colour map is reduced to its light and dark (15% of
 *    its own hue kept) and normalised by its mean, then multiplied into the
 *    tint — so the palette stays exactly as designed and only the texture of
 *    the surface changes. Roughness is normalised the same way.
 * 2. Edge wear. Using the per-face `edgeUv` from `metricBox`, paint within a
 *    few millimetres of a face edge chips back to bare steel along a noise
 *    line: brighter, smoother, fully metallic.
 * 3. Grime. The last 35cm above the floor darken and go matte, with a noisy
 *    top edge so it reads as dirt, not a gradient.
 *
 * Before the textures arrive the material renders flat (with wear and grime
 * already on); when they arrive they are attached and the material recompiles.
 * If they never arrive it stays flat and warns once.
 */
export interface WornMaterialOptions {
  tint: string;
  roughness: number;
  metalness: number;
  set: TextureSetId;
  /** 'full' also uses the colour map; 'surface' only the normal and roughness maps. */
  maps?: 'full' | 'surface';
  /** 0–1: how far paint has chipped back from the edges. */
  edgeWear?: number;
  /** 0–1: dirt near the floor. */
  grime?: number;
  /** 0–1: how strongly the scan varies colour, roughness and relief. */
  detail?: number;
}

const BARE_STEEL = '#8d8f88';

const VERTEX_HEADER = /* glsl */ `
attribute vec4 edgeUv;
varying vec4 vWornEdge;
varying vec2 vWornUv;
varying vec3 vWornWorld;
`;

const VERTEX_BODY = /* glsl */ `
vWornEdge = edgeUv;
vWornUv = uv;
vWornWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`;

const FRAGMENT_HEADER = /* glsl */ `
uniform float uWornEdge;
uniform float uWornGrime;
uniform float uWornDetail;
uniform float uWornColorMean;
uniform float uWornRoughMean;
uniform vec3 uWornBare;
uniform float uWornFloorY;
varying vec4 vWornEdge;
varying vec2 vWornUv;
varying vec3 vWornWorld;

float wornHash( vec2 p ) {
  p = fract( p * vec2( 123.34, 456.21 ) );
  p += dot( p, p + 45.32 );
  return fract( p.x * p.y );
}

float wornNoise( vec2 p ) {
  vec2 i = floor( p );
  vec2 f = fract( p );
  vec2 u = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix( wornHash( i ), wornHash( i + vec2( 1.0, 0.0 ) ), u.x ),
    mix( wornHash( i + vec2( 0.0, 1.0 ) ), wornHash( i + vec2( 1.0, 1.0 ) ), u.x ),
    u.y
  );
}
`;

const MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec3 wornTexel = texture2D( map, vMapUv ).rgb;
  float wornLum = dot( wornTexel, vec3( 0.2126, 0.7152, 0.0722 ) );
  vec3 wornGrain = mix( vec3( wornLum ), wornTexel, 0.15 ) / uWornColorMean;
  diffuseColor.rgb *= mix( vec3( 1.0 ), wornGrain, uWornDetail );
#endif
`;

const ROUGHNESS_FRAGMENT = /* glsl */ `
float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
  float wornRough = texture2D( roughnessMap, vRoughnessMapUv ).g / uWornRoughMean;
  roughnessFactor *= mix( 1.0, wornRough, uWornDetail );
#endif
`;

const WEAR_FRAGMENT = /* glsl */ `
// Edge wear: a face without edgeUv (width 0) never wears.
float wornEdgeDist = min(
  min( vWornEdge.x, vWornEdge.z - vWornEdge.x ),
  min( vWornEdge.y, vWornEdge.w - vWornEdge.y )
);
float wornChip = wornNoise( vWornUv * 38.0 ) * 0.7 + wornNoise( vWornUv * 110.0 ) * 0.3;
float wornWidth = 0.006 * uWornEdge * ( 0.3 + 1.4 * wornChip );
float wornMask = vWornEdge.z > 0.0 && wornWidth > 0.0
  ? 1.0 - smoothstep( wornWidth * 0.6, wornWidth, wornEdgeDist )
  : 0.0;
diffuseColor.rgb = mix( diffuseColor.rgb, uWornBare, wornMask );
roughnessFactor = mix( roughnessFactor, 0.32, wornMask );
metalnessFactor = mix( metalnessFactor, 0.95, wornMask );

// Grime: dirt collects in the last 35cm above the floor.
float wornHeight = vWornWorld.y - uWornFloorY
  + ( wornNoise( vWornWorld.xz * 6.0 + vWornWorld.y * 3.0 ) - 0.5 ) * 0.12;
float wornGrimeMask = uWornGrime * ( 1.0 - smoothstep( 0.0, 0.35, wornHeight ) );
diffuseColor.rgb *= 1.0 - 0.25 * wornGrimeMask;
roughnessFactor = mix( roughnessFactor, 1.0, 0.3 * wornGrimeMask );
`;

interface WornUniforms {
  uWornEdge: { value: number };
  uWornGrime: { value: number };
  uWornDetail: { value: number };
  uWornColorMean: { value: number };
  uWornRoughMean: { value: number };
  uWornBare: { value: Color };
  uWornFloorY: { value: number };
}

function attach(
  material: MeshStandardMaterial,
  uniforms: WornUniforms,
  textures: LoadedTextureSet,
  maps: 'full' | 'surface',
  detail: number,
): void {
  if (maps === 'full') {
    material.map = textures.color;
    uniforms.uWornColorMean.value = textures.colorMean;
  }
  material.normalMap = textures.normal;
  material.normalScale.setScalar(0.35 + 0.65 * detail);
  material.roughnessMap = textures.roughness;
  uniforms.uWornRoughMean.value = textures.roughnessMean;
  material.needsUpdate = true;
}

export function createWornMaterial(options: WornMaterialOptions): MeshStandardMaterial {
  const {
    tint,
    roughness,
    metalness,
    set,
    maps = 'full',
    edgeWear = 0,
    grime = 0,
    detail = 1,
  } = options;

  const material = new MeshStandardMaterial({ color: new Color(tint), roughness, metalness });
  material.userData.worn = true;

  const uniforms: WornUniforms = {
    uWornEdge: { value: edgeWear },
    uWornGrime: { value: grime },
    uWornDetail: { value: detail },
    uWornColorMean: { value: 1 },
    uWornRoughMean: { value: 1 },
    uWornBare: { value: new Color(BARE_STEEL) },
    uWornFloorY: { value: FLOOR_Y },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_HEADER}`)
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>\n${VERTEX_BODY}`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_HEADER}`)
      .replace('#include <map_fragment>', MAP_FRAGMENT)
      .replace('#include <roughnessmap_fragment>', ROUGHNESS_FRAGMENT)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\n${WEAR_FRAGMENT}`);
  };

  let disposed = false;
  material.addEventListener('dispose', () => {
    disposed = true;
  });

  loadTextureSet(set)
    .then((textures) => {
      if (!disposed) attach(material, uniforms, textures, maps, detail);
    })
    .catch((error: unknown) => {
      console.warn(`[wornMaterial] "${set}" textures unavailable, keeping the flat material.`, error);
    });

  return material;
}
```

- [ ] **Step 3: `materials.tsx` 수정**

  (a) import 교체: `BoxGeometry, Color, MeshStandardMaterial, PlaneGeometry` → `BoxGeometry, MeshStandardMaterial, PlaneGeometry`로 바꾸고 다음을 추가한다.

```ts
import { setTextureAnisotropy } from '@/lib/textures';
import { createWornMaterial } from '@/lib/wornMaterial';
import { useArchiveStore, type QualityTier } from '@/store/archiveStore';
```

  (b) 파일 상단 주석의 마지막 문단 중 `meshes scale a unit box instead of owning bespoke geometry.` 문장을 다음으로 바꾼다.

```ts
 * down through context. Textured parts use metric-UV geometry from
 * `lib/metricBox`; the unit box and plane below remain for untextured
 * overlays (glow frames, labels, dossier cards).
```

  (c) `CabinetMaterials` 인터페이스의 `floor: MeshStandardMaterial;` 다음 줄에 추가:

```ts
  wall: MeshStandardMaterial;
```

  (d) `const steel = (...) => new MeshStandardMaterial({...});` 블록과 `createCabinetMaterials` 함수 전체를 다음으로 교체한다.

    `PAINT`의 `maps` 값은 Task 1 Step 2의 판단에 따른다. `DOTS = true`면 `'surface'`, `false`면 `'full'`.

```ts
/**
 * How the paint on this cabinet has aged. Colour, roughness and metalness are
 * the original flat-shaded values, unchanged — the scans and the wear shader
 * add surface on top of them, not a new palette.
 */
const PAINT = { set: 'paintedSteel', maps: 'full' } as const;

/**
 * Aged service-issue steel: desaturated olive-grey, high roughness so it
 * catches the key light as a broad sheen rather than a chrome highlight.
 * The reference cabinet is cream enamel; this is the same object re-lit for a
 * dark room — and, with the worn material, one that has been in use for
 * decades: chipped edges on the doors and carcass, grime along the plinth,
 * handles polished smooth.
 */
export function createCabinetMaterials(): CabinetMaterials {
  return {
    body: createWornMaterial({ ...PAINT, tint: '#3e4139', roughness: 0.62, metalness: 0.7, edgeWear: 0.6, grime: 0.7 }),
    bodyDark: createWornMaterial({ ...PAINT, tint: '#24261f', roughness: 0.72, metalness: 0.62, edgeWear: 0.6, grime: 0.7 }),
    outerDoor: createWornMaterial({ ...PAINT, tint: '#474a40', roughness: 0.58, metalness: 0.74, edgeWear: 0.6, grime: 0.7 }),
    rib: createWornMaterial({ ...PAINT, tint: '#50534a', roughness: 0.54, metalness: 0.76, edgeWear: 0.6, grime: 0.7 }),
    lockerDoor: createWornMaterial({ ...PAINT, tint: '#54574b', roughness: 0.56, metalness: 0.72, edgeWear: 0.5, grime: 0.4 }),
    lockerDoorSealed: createWornMaterial({ ...PAINT, tint: '#26281f', roughness: 0.92, metalness: 0.25, edgeWear: 0.3, grime: 0.9 }),
    interior: createWornMaterial({ ...PAINT, tint: '#0f1113', roughness: 0.95, metalness: 0.12, grime: 0.2, detail: 0.5 }),
    handle: createWornMaterial({ set: 'paintedSteel', maps: 'surface', tint: '#9b978a', roughness: 0.34, metalness: 0.95, detail: 0.5 }),
    plate: createWornMaterial({ set: 'paintedSteel', maps: 'surface', tint: '#7d7867', roughness: 0.48, metalness: 0.85, edgeWear: 0.2 }),
    plinth: createWornMaterial({ ...PAINT, tint: '#191b17', roughness: 0.85, metalness: 0.45, edgeWear: 0.8, grime: 1 }),
    floor: createWornMaterial({ set: 'concreteFloor', tint: '#0b0c0d', roughness: 0.94, metalness: 0.25 }),
    wall: createWornMaterial({ set: 'plasterWall', tint: '#0b0c0d', roughness: 0.94, metalness: 0.25 }),
  };
}

/** Texture filtering at glancing angles, per device tier. */
const ANISOTROPY_BY_TIER: Record<QualityTier, number> = { high: 8, medium: 4, low: 2 };
```

  (e) `CabinetMaterialsProvider` 안의 `const materials = useMemo(createCabinetMaterials, []);` 바로 다음에 추가:

```tsx
  const quality = useArchiveStore((s) => s.quality);

  useEffect(() => {
    setTextureAnisotropy(ANISOTROPY_BY_TIER[quality]);
  }, [quality]);
```

- [ ] **Step 4: 통과 확인**

  Run: `npx tsc --noEmit && node tests/material-shots.mjs --prefix=t4 --check=textures,offline,errors`

  Expected: `PASSED: textures, offline, errors`

  셰이더 컴파일 에러가 있으면 `errors`에 `THREE.WebGLProgram: Shader Error`로 잡힌다. 이 경우 전체 메시지를 읽고 해당 GLSL 줄을 고친다.

- [ ] **Step 5: 캡처 확인**

  `tests/shots/t4-vault.png`와 `t4-drawer.png`를 연다. 판단 기준:
  - 표면에 결이 생겼는가
  - 팔레트(올리브그레이)가 유지되는가
  - 녹색 원본 색이 보이지 않는가

  이 단계에서는 박스가 아직 단위 박스라 텍스처가 늘어나 보이는 게 정상이다. Task 5에서 해결한다.

- [ ] **Step 6: 체크포인트**: PASSED 출력과 캡처 소견을 기록한다.

---

### Task 5: 지오메트리 교체 (박스 34개 + 바닥 평면 1개, seed)

**Files:**
- Modify:
  - `src/components/canvas/ProceduralCabinet.tsx`
  - `src/components/canvas/Locker.tsx`
  - `src/components/canvas/SealedLocker.tsx`
  - `src/components/canvas/Drawer.tsx`
  - `src/components/canvas/DoorFurniture.tsx`
  - `src/components/canvas/OuterDoors.tsx`
  - `src/components/canvas/HingedPanel.tsx`
  - `src/components/canvas/Room.tsx`
- Test: `tests/material-shots.mjs --check=geometry,errors`, `tests/tab-visibility.mjs`, `tests/drawer-flow.mjs`

**Interfaces:**
- Consumes: `metricBox`, `metricPlane` (Task 3), `materials.wall` (Task 4)
- Produces:
  - `Drawer` prop `seed?: number` (기본 0)
  - `HingedPanel` prop `seed?: number` (기본 0)
  - `RibbedFace` prop `seed: number`
- 규칙:
  - `geometry={UNIT_BOX} ... scale={[w, h, d]}` → `geometry={metricBox(w, h, d, seed)}`. **`scale` prop은 삭제**하고 나머지 prop(material, raycast, position, castShadow, receiveShadow)은 그대로 둔다.
  - 선택 테두리(Locker의 glow 4개)와 `ArchiveFile`은 건드리지 않는다.

- [ ] **Step 1: 실패 확인**

  Run: `node tests/material-shots.mjs --prefix=t5 --check=geometry`

  Expected: 종료 코드 1, `FAILED geometry: stretched: vault N, drawer M`. N과 M은 0보다 크다. 박스 34개가 모두 로드된 상태라면 30 이상이다.

- [ ] **Step 2: `ProceduralCabinet.tsx`**

  import `UNIT_BOX, useCabinetMaterials`를 `useCabinetMaterials`로 바꾸고 `import { metricBox } from '@/lib/metricBox';`를 추가한다. `<group name="Cabinet_Body">`의 내용 전체를 다음으로 교체한다. seed 1~11은 스펙대로 패널 순서다.

```tsx
      <group name="Cabinet_Body">
        {/* carcass */}
        <mesh
          geometry={metricBox(W, H, S, 1)}
          material={materials.bodyDark}
          raycast={noRaycast}
          position={[0, 0, -D / 2 + S / 2]}
          receiveShadow
        />
        <mesh
          geometry={metricBox(S, H, D, 2)}
          material={materials.body}
          raycast={noRaycast}
          position={[-W / 2 + S / 2, 0, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={metricBox(S, H, D, 3)}
          material={materials.body}
          raycast={noRaycast}
          position={[W / 2 - S / 2, 0, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={metricBox(W, S, D, 4)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, H / 2 - S / 2, 0]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={metricBox(W, S, D, 5)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, -H / 2 + S / 2, 0]}
          receiveShadow
        />

        {/* front lip framing the grid opening */}
        <mesh
          geometry={metricBox(W, lip.horizontal.thickness, 0.04, 6)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, lip.horizontal.centre, lip.z]}
          castShadow
        />
        <mesh
          geometry={metricBox(W, lip.horizontal.thickness, 0.04, 7)}
          material={materials.body}
          raycast={noRaycast}
          position={[0, -lip.horizontal.centre, lip.z]}
          castShadow
        />
        <mesh
          geometry={metricBox(lip.vertical.thickness, lip.vertical.height, 0.04, 8)}
          material={materials.body}
          raycast={noRaycast}
          position={[-lip.vertical.centre, 0, lip.z]}
          castShadow
        />
        <mesh
          geometry={metricBox(lip.vertical.thickness, lip.vertical.height, 0.04, 9)}
          material={materials.body}
          raycast={noRaycast}
          position={[lip.vertical.centre, 0, lip.z]}
          castShadow
        />

        {/* cornice + plinth — the overhangs that give the silhouette weight */}
        <mesh
          geometry={metricBox(W + 0.07, 0.05, D + 0.06, 10)}
          material={materials.bodyDark}
          raycast={noRaycast}
          position={[0, H / 2 + 0.025, 0.01]}
          castShadow
        />
        <mesh
          geometry={metricBox(W - 0.05, PLINTH_HEIGHT, D - 0.03, 11)}
          material={materials.plinth}
          raycast={noRaycast}
          position={[0, -H / 2 - PLINTH_HEIGHT / 2, 0]}
          castShadow
          receiveShadow
        />
      </group>
```

- [ ] **Step 3: `Drawer.tsx`**

  `import { UNIT_BOX } from './materials';`를 `import { metricBox } from '@/lib/metricBox';`로 바꾼다.

  `DrawerProps`의 `hollow?: boolean;` 다음에 추가:

```ts
  /** Picks this drawer's patch of the steel texture; same-sized drawers need different ones. */
  seed?: number;
```

  함수 시그니처의 구조분해를 `{ faceMaterial, bodyMaterial, railMaterial, children, hollow = false, seed = 0 }`로 바꾼다. `return` 블록을 다음으로 교체한다(주석은 원문 유지).

```tsx
  return (
    <group ref={ref}>
      {/* front face — the only part visible when shut */}
      <mesh
        geometry={metricBox(width, height, DRAWER_FACE_THICKNESS, seed)}
        material={faceMaterial}
        position={[0, 0, -DRAWER_FACE_THICKNESS / 2]}
        castShadow
        receiveShadow
      />

      {!hollow && (
        <group position={[0, 0, -DRAWER_FACE_THICKNESS - depth / 2]}>
          {/* floor */}
          <mesh
            geometry={metricBox(inner, DRAWER_WALL, depth, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[0, -height / 2 + DRAWER_WALL / 2, 0]}
            receiveShadow
          />
          {/* sides */}
          <mesh
            geometry={metricBox(DRAWER_WALL, height, depth, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[-width / 2 + DRAWER_WALL / 2, 0, 0]}
          />
          <mesh
            geometry={metricBox(DRAWER_WALL, height, depth, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[width / 2 - DRAWER_WALL / 2, 0, 0]}
          />
          {/* back */}
          <mesh
            geometry={metricBox(inner, height, DRAWER_WALL, seed)}
            material={bodyMaterial}
            raycast={noRaycast}
            position={[0, 0, -depth / 2 + DRAWER_WALL / 2]}
          />
          {/* Hanging rails. The folders' hooks ride on these, which is what
              lets each card's tab stand above the drawer front while its body
              hangs inside the tub. */}
          <mesh
            geometry={metricBox(RAIL, RAIL, depth, seed)}
            material={rail}
            raycast={noRaycast}
            position={[-railX, railY, 0]}
          />
          <mesh
            geometry={metricBox(RAIL, RAIL, depth, seed)}
            material={rail}
            raycast={noRaycast}
            position={[railX, railY, 0]}
          />
        </group>
      )}

      <group position={[0, 0, 0.001]}>{children}</group>
    </group>
  );
```

- [ ] **Step 4: `Locker.tsx`**

  import에 `import { metricBox } from '@/lib/metricBox';`를 추가한다. `UNIT_BOX`는 glow용으로 계속 쓰므로 그대로 둔다.

  `const { id, code, column, row } = definition;` 다음 줄에 추가:

```ts
  /** This compartment's patch of the steel texture (see `metricBox`). */
  const seed = column * 10 + row + 1;
```

  "bay in the carcass" 메시 5개를 다음으로 교체한다.

```tsx
      <mesh
        geometry={metricBox(INNER_W, INNER_H, 0.02, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[0, 0, -LOCKER_DEPTH]}
        receiveShadow
      />
      <mesh
        geometry={metricBox(INNER_W, WALL, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[0, INNER_H / 2, -LOCKER_DEPTH / 2]}
      />
      <mesh
        geometry={metricBox(INNER_W, WALL, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[0, -INNER_H / 2, -LOCKER_DEPTH / 2]}
        receiveShadow
      />
      <mesh
        geometry={metricBox(WALL, INNER_H, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[-INNER_W / 2, 0, -LOCKER_DEPTH / 2]}
      />
      <mesh
        geometry={metricBox(WALL, INNER_H, LOCKER_DEPTH, seed)}
        material={materials.interior}
        raycast={noRaycast}
        position={[INNER_W / 2, 0, -LOCKER_DEPTH / 2]}
      />
```

  `<Drawer ref={drawerRef} ...>`에 `seed={seed}` prop을 추가한다.

- [ ] **Step 5: `SealedLocker.tsx`**: `<Drawer hollow ...>`에 prop을 추가한다.

```tsx
        seed={column * 10 + row + 1}
```

- [ ] **Step 6: `HingedPanel.tsx`**

  `import { UNIT_BOX } from './materials';` → `import { metricBox } from '@/lib/metricBox';`

  `HingedPanelProps`의 `children?: ReactNode;` 다음에 추가:

```ts
  /** Picks this panel's patch of the steel texture (see `metricBox`). */
  seed?: number;
```

  구조분해에 `seed = 0`을 추가하고, 메시를 다음으로 교체한다.

```tsx
        <mesh
          geometry={metricBox(width, height, thickness, seed)}
          material={material}
          position={[panelCentreX, 0, 0]}
          castShadow
          receiveShadow
        />
```

- [ ] **Step 7: `OuterDoors.tsx`**

  import `UNIT_BOX, useCabinetMaterials` → `useCabinetMaterials`로 바꾸고, `import { metricBox } from '@/lib/metricBox';`를 추가한다. `RibbedFace` 전체를 다음으로 교체한다.

```tsx
function RibbedFace({ ribCount, seed }: { ribCount: number; seed: number }) {
  const materials = useCabinetMaterials();

  // The reference cabinet's outer doors are corrugated sheet. Raised vertical
  // ribs read the same way under a raking key light and cost one shared
  // material plus a handful of small boxes.
  const ribs = useMemo(() => {
    const usable = OUTER_DOOR_WIDTH - 0.24;
    const step = usable / (ribCount - 1);
    return Array.from({ length: ribCount }, (_, i) => -usable / 2 + i * step);
  }, [ribCount]);

  const railY = OUTER_DOOR_HEIGHT / 2 - 0.1;

  return (
    <group position={[0, 0, OUTER_DOOR_THICKNESS / 2 + 0.008]}>
      {ribs.map((x, i) => (
        <mesh
          key={x}
          geometry={metricBox(0.052, OUTER_DOOR_HEIGHT - 0.26, 0.016, seed + i)}
          material={materials.rib}
          raycast={noRaycast}
          position={[x, 0, 0]}
          castShadow
        />
      ))}
      <mesh
        geometry={metricBox(OUTER_DOOR_WIDTH - 0.12, 0.05, 0.018, seed + 50)}
        material={materials.rib}
        raycast={noRaycast}
        position={[0, railY, 0]}
      />
      <mesh
        geometry={metricBox(OUTER_DOOR_WIDTH - 0.12, 0.05, 0.018, seed + 51)}
        material={materials.rib}
        raycast={noRaycast}
        position={[0, -railY, 0]}
      />
    </group>
  );
}
```

  `OuterDoor` 안에서 `<HingedPanel ...>`에 `seed={side === 'left' ? 101 : 102}`를 추가한다. `<RibbedFace ribCount={...} />`는 다음으로 바꾼다.

```tsx
      <RibbedFace ribCount={RIB_COUNT_BY_TIER[quality]} seed={side === 'left' ? 201 : 301} />
```

- [ ] **Step 8: `DoorFurniture.tsx`**

  `import { UNIT_BOX, UNIT_PLANE } from './materials';` → `import { UNIT_PLANE } from './materials';`로 바꾸고 `import { metricBox } from '@/lib/metricBox';`를 추가한다. 박스 메시 6개를 바꾼다. 각 메시에서 `geometry`를 다음으로 바꾸고 `scale` 줄을 지운다.

  | 위치 | 새 geometry |
  | --- | --- |
  | DoorHandle "recessed backing plate" | `metricBox(0.036 * scale, 0.11 * scale, 0.008)` |
  | DoorHandle "lever" | `metricBox(0.016 * scale, 0.062 * scale, 0.017)` |
  | DrawerPull lamp (`live &&`) | `metricBox(0.012, 0.012, 0.008)` |
  | DrawerPull "recessed backing plate" | `metricBox(0.27, 0.105, 0.012)` |
  | DrawerPull "card window" | `metricBox(0.235, 0.05, 0.006)` |
  | DrawerPull "grab bar" | `metricBox(0.2, 0.019, 0.019)` |

  예시 (grab bar, 교체 후):

```tsx
      {/* grab bar */}
      <mesh
        geometry={metricBox(0.2, 0.019, 0.019)}
        material={metalMaterial}
        position={[0, -0.028, 0.021]}
        castShadow
      />
```

- [ ] **Step 9: `Room.tsx`**: 파일 전체를 다음으로 교체한다.

```tsx
'use client';

import { CABINET, FLOOR_Y } from '@/lib/cabinetLayout';
import { metricBox, metricPlane } from '@/lib/metricBox';
import { useCabinetMaterials } from './materials';
import { noRaycast } from './noRaycast';

/**
 * The space around the cabinet.
 *
 * Deliberately minimal — a concrete floor to catch the shadow and a plastered
 * back wall to stop the fog reading as empty sky. Every mesh opts out of
 * raycasting so a click on the background can never be mistaken for a click
 * on the cabinet, which is what makes "clickable" legible in a scene this dark.
 */
export function Room() {
  const materials = useCabinetMaterials();

  return (
    <group>
      <mesh
        geometry={metricPlane(46, 46)}
        material={materials.floor}
        raycast={noRaycast}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, FLOOR_Y, 0]}
        receiveShadow
      />

      <mesh
        geometry={metricBox(30, 12, 0.3)}
        material={materials.wall}
        raycast={noRaycast}
        position={[0, 4, -CABINET.depth / 2 - 1.4]}
        receiveShadow
      />
    </group>
  );
}
```

- [ ] **Step 10: 남은 사용처 확인**

  Run: `grep -n "geometry={UNIT_BOX}" src/components/canvas/*.tsx`

  Expected: `ArchiveFile.tsx` 1줄과 `Locker.tsx`의 glow 4줄, 총 5줄만 남는다.

- [ ] **Step 11: 통과 확인**

```bash
npx tsc --noEmit && npx next lint
node tests/material-shots.mjs --prefix=t5 --check=geometry,textures,offline,errors
node tests/tab-visibility.mjs
node tests/drawer-flow.mjs
```

  Expected:
  - tsc·lint 통과
  - `PASSED: geometry, textures, offline, errors`
  - tab-visibility `PASSED`
  - drawer-flow 로그의 마지막 `stage: "vault"`, `errors: []`

- [ ] **Step 12: 캡처 확인**: `t5-vault.png`, `t5-drawer.png`를 본다.
  - 판·손잡이의 결 밀도가 비슷한가(늘어남 없음)
  - 서랍 앞면끼리 무늬가 다른가
  - 모서리 마모가 보이는가
  - 걸레받이 쪽이 더 어두운가

- [ ] **Step 13: 체크포인트**: 모든 출력과 캡처 소견을 기록한다.

---

### Task 6: 환경 반사와 인트로 연동

**Files:**
- Modify: `src/lib/sceneRegistry.ts`, `src/lib/introTimeline.ts`, `src/components/canvas/Lighting.tsx`
- Test: `tests/material-shots.mjs --check=environment,offline,errors`, `tests/scroll-probe.mjs`

**Interfaces:**
- Produces:
  - `setAmbientLevel(level: number): void`, `getAmbientLevel(): number` (sceneRegistry)
  - `LIGHT_TARGETS.environment = 0.3`

- [ ] **Step 1: 실패 확인**

  Run: `node tests/material-shots.mjs --prefix=t6 --check=environment`

  Expected: 종료 코드 1, `FAILED environment: {"top":1,"vault":1,"environment":false}`.

- [ ] **Step 2: `sceneRegistry.ts`**

  `LIGHT_TARGETS`를 교체한다.

```ts
/** Full-brightness targets, so the intro knows what to animate up to. */
export const LIGHT_TARGETS = {
  key: 152,
  fill: 48,
  /** scene.environmentIntensity once the room is fully lit. */
  environment: 0.3,
} as const;

/**
 * How far the intro has brought the room up out of the dark, 0–1.
 *
 * The environment map lights surfaces as well as reflecting in them, so it has
 * to rise with the spots or the "lost in the dark" opening is lit from nowhere.
 * Stored here rather than written straight to the scene because drei's
 * <Environment> resets scene.environmentIntensity whenever it re-renders;
 * `Lighting` re-applies this level every frame instead.
 */
let ambientLevel = 0;

export function setAmbientLevel(level: number): void {
  ambientLevel = level;
}

export function getAmbientLevel(): number {
  return ambientLevel;
}
```

- [ ] **Step 3: `introTimeline.ts`**

  import `LIGHT_TARGETS, getSceneHandles`를 `LIGHT_TARGETS, getSceneHandles, setAmbientLevel`로 바꾼다. lights 블록의 `if (fillLight) …` 다음 줄에 추가:

```ts
  setAmbientLevel(lit);
```

- [ ] **Step 4: `Lighting.tsx`**

  import 추가/수정:

```ts
import { Environment, Lightformer } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { LIGHT_TARGETS, getAmbientLevel, registerSceneHandle } from '@/lib/sceneRegistry';
```

  (기존 `import { registerSceneHandle } from '@/lib/sceneRegistry';`는 위 줄로 대체한다.)

  `Lighting` 함수 위에 추가:

```tsx
/**
 * Holds the environment's strength to the intro's lighting level every frame.
 * Every frame, not once: drei's <Environment> resets the scene's intensity to
 * its own default whenever it re-renders.
 */
function EnvironmentLevel() {
  useFrame(({ scene }) => {
    scene.environmentIntensity = LIGHT_TARGETS.environment * getAmbientLevel();
  });
  return null;
}
```

  JSX의 `<fog …/>` 바로 앞에 추가한다. 천장 형광등 두 개는 `rotation`을 쓴다. drei Lightformer는 `rotation` prop이 없으면 `target`(기본 원점)을 바라보도록 덮어쓰기 때문이다.

```tsx
      {/* Reflections for the steel: a dark service room lit by two ceiling
          tubes, a warm bounce from the key side and a cold wall on the fill
          side — built in-scene from light cards and rendered once. Never a
          `preset`: those fetch an HDRI from a CDN at runtime. */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          form="rect"
          intensity={3}
          color="#e6edf2"
          position={[0, 5, 3]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[6, 0.35, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          color="#e6edf2"
          position={[0, 5, -1]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[6, 0.35, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.2}
          color="#ffe2c4"
          position={[4, 2.5, 5]}
          target={[0, 1.4, 0]}
          scale={[2.5, 2.5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={0.5}
          color="#7d9fc8"
          position={[-6, 2, 2]}
          target={[0, 1.4, 0]}
          scale={[4, 3, 1]}
        />
      </Environment>
      <EnvironmentLevel />
```

- [ ] **Step 5: 통과 확인**

```bash
npx tsc --noEmit && npx next lint
node tests/material-shots.mjs --prefix=t6 --check=environment,geometry,textures,offline,errors
node tests/scroll-probe.mjs
```

  Expected:
  - `PASSED: environment, geometry, textures, offline, errors`
  - scroll-probe: 3개 뷰포트 모두 `consoleErrors: []`, 겹침 0

- [ ] **Step 6: 캡처 확인 (환경 강도 조정은 한 번만)**
  - `t6-vault.png`: 금속에 형광등 반사가 은은하게 보이는가
  - `t6-drawer.png`: 서랍 면이 플라스틱처럼 보이지 않는가
  - 인트로 첫 화면은 여전히 어둠 속인가. `t6-report.json`의 `atTop.envIntensity`가 0이어야 한다(Step 5의 `environment` 점검이 이미 확인한다). 눈으로도 보려면 브라우저 패널에서 페이지 맨 위를 캡처한다.
  - 반사가 너무 약하거나 강하면 `LIGHT_TARGETS.environment`를 0.2~0.45 안에서 **한 번만** 바꾼다. 이 경우 `material-shots.mjs`의 `environment` 점검 기대값(0.3)도 같은 값으로 바꾸고 Step 5를 다시 돌린다.

- [ ] **Step 7: 체크포인트**: 출력, 최종 환경 강도, 캡처 소견을 기록한다.

---

### Task 7: SSAO와 톤매핑

**Files:**
- Create: `src/components/canvas/PostEffects.tsx`
- Modify: `src/components/canvas/Scene.tsx`
- Test: `tests/material-shots.mjs --check=tonemap,errors`, 기준선 대비 휘도 비교

**Interfaces:**
- Consumes: `useArchiveStore` quality (`'high' | 'medium' | 'low'`)
- Produces: `<PostEffects />`. low 단계에서는 `null`이고 렌더러 톤매핑(ACES)을 그대로 둔다.

- [ ] **Step 1: 실패 확인**

  Run: `node tests/material-shots.mjs --prefix=t7 --check=tonemap`

  Expected: 종료 코드 1, `FAILED tonemap: quality high, renderer toneMapping 4`. 헤드리스 품질이 medium으로 잡혀도 같은 형태다.

- [ ] **Step 2: `PostEffects.tsx` 작성**

```tsx
'use client';

import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { EffectComposer, N8AO, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { useArchiveStore } from '@/store/archiveStore';

/**
 * Ambient occlusion — the contact shadow in every seam, gap and recess that a
 * cabinet built from boxes otherwise lacks — and the tone mapping that has to
 * come after it.
 *
 * Tone mapping moves into the composer while it runs, and the renderer's own
 * is switched off: applied in both places the image is mapped twice and goes
 * flat and grey. On the low tier there is no composer at all and the renderer
 * keeps doing it, exactly as before.
 */
export function PostEffects() {
  const quality = useArchiveStore((s) => s.quality);
  const gl = useThree((state) => state.gl);
  const enabled = quality !== 'low';

  useEffect(() => {
    if (!enabled) return;
    gl.toneMapping = NoToneMapping;
    return () => {
      gl.toneMapping = ACESFilmicToneMapping;
    };
  }, [enabled, gl]);

  if (!enabled) return null;

  return (
    <EffectComposer multisampling={quality === 'high' ? 4 : 0} enableNormalPass={false}>
      <N8AO
        aoRadius={0.35}
        distanceFalloff={0.35}
        intensity={2.5}
        quality={quality === 'high' ? 'high' : 'medium'}
        halfRes={quality === 'medium'}
      />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
}
```

- [ ] **Step 3: `Scene.tsx`**

  `import { PostEffects } from './PostEffects';`를 추가한다. `<CameraController />` 다음 줄에 추가:

```tsx
      <PostEffects />
```

- [ ] **Step 4: 통과 확인**

```bash
npx tsc --noEmit && npx next lint
node tests/material-shots.mjs --prefix=t7 --check=tonemap,environment,geometry,textures,offline,errors
node -e "const b=require('./tests/shots/baseline-report.json').luminance,a=require('./tests/shots/t7-report.json').luminance;for(const k of Object.keys(b)){const r=a[k]/b[k];console.log(k,b[k],'->',a[k],'ratio',r.toFixed(2),r>=0.75&&r<=1.25?'OK':'OUT OF RANGE')}"
```

  Expected:
  - `PASSED: tonemap, environment, geometry, textures, offline, errors`
  - 세 구도 모두 휘도 비율 0.75~1.25, `OK`

  범위를 벗어나면 톤매핑이 두 번 적용됐거나(어둡고 탁함) 한 번도 적용되지 않은 것(밝고 쨍함)이다. 먼저 `renderer toneMapping` 값과 `ToneMapping` 효과가 들어갔는지 확인한다.

- [ ] **Step 5: 캡처 확인 (N8AO 조정은 한 번만)**
  - `t7-vault.png`: 서랍 사이 틈, 캐비닛 안쪽 모서리, 걸레받이와 바닥이 닿는 선이 어두워졌는가
  - 앰버 램프·선택 테두리 색이 크게 변하지 않았는가. 이 요소들은 이제 후처리 톤매핑을 거친다.
  - 틈새 그림자가 약하거나 번지면 `aoRadius`(0.2~0.6), `intensity`(1.5~4)를 **한 번만** 조정한다.
  - 서류 카드 뒤쪽이 카드 너머로 비쳐 어두운지 `t7-drawer.png`, `t7-file.png`에서 본다. 소견만 기록하고, 해결은 Task 8에서 한다.

- [ ] **Step 6: 체크포인트**: 출력, 휘도 비율, N8AO 최종값, 캡처 소견을 기록한다.

---

### Task 8: 완전히 보이는 서류 카드는 불투명으로

**Files:**
- Modify: `src/components/canvas/ArchiveFile.tsx`
- Test: `tests/material-shots.mjs --check=opaqueCards`, `tests/tab-visibility.mjs`, `tests/drawer-flow.mjs`

**Interfaces:**
- Consumes: `paper` 재질 (`FileCardHandle.paper`). 트레이 타임라인은 계속 `paper.opacity`를 트윈한다.

- [ ] **Step 1: 실패 확인**

  Run: `node tests/material-shots.mjs --prefix=t8 --check=opaqueCards`

  Expected: 종료 코드 1, `FAILED opaqueCards: 3/3 full-opacity cards still transparent`.

- [ ] **Step 2: `ArchiveFile.tsx`의 `useFrame` 끝에 추가** (`face.opacity += …` 다음 줄)

```ts
    // A card at full opacity is drawn as opaque. The ambient-occlusion pass
    // treats transparent materials separately, and a card left transparent
    // can show the occlusion of whatever hangs behind it. Fading cards stay
    // transparent; the switch happens once each way.
    const opaque = paper.opacity >= 0.999;
    if (paper.transparent === opaque) {
      paper.transparent = !opaque;
      paper.needsUpdate = true;
    }
```

- [ ] **Step 3: 통과 확인**

```bash
npx tsc --noEmit && npx next lint
node tests/material-shots.mjs --prefix=t8 --check=opaqueCards,tonemap,environment,geometry,textures,offline,errors
node tests/tab-visibility.mjs
node tests/drawer-flow.mjs
```

  Expected: 전부 PASSED. drawer-flow의 마지막 `stage: "vault"`, `errors: []`.

- [ ] **Step 4: 캡처 확인**: `t8-drawer.png`에서 카드가 비치지 않는가. 카드가 서랍으로 들어갈 때(opacity 0으로 페이드) 깜빡임이 없는지는 drawer-flow의 `flow-6-back-to-vault.png` 흐름으로 확인한다.

- [ ] **Step 5: 체크포인트**: 출력과 소견을 기록한다.

---

### Task 9: 텍스처 실패 대비, 최종 검증, 보고

**Files:**
- Create: `tests/texture-fallback.mjs`
- Test: 전체

- [ ] **Step 1: `tests/texture-fallback.mjs` 작성**

```js
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
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
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
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);
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
```

- [ ] **Step 2: 실행**

  Run: `node tests/texture-fallback.mjs`

  Expected: `PASSED`, `warned: true`, `missingFiles: 9` 안팎.

- [ ] **Step 3: 전체 검증**

```bash
npx tsc --noEmit && npx next lint && npm run test:unit
node tests/material-shots.mjs --prefix=final --check=textures,offline,errors,geometry,environment,tonemap,opaqueCards
node tests/tab-visibility.mjs
node tests/drawer-flow.mjs
node tests/scroll-probe.mjs
node tests/texture-fallback.mjs
```

  Expected: 전부 통과. 하나라도 실패하면 보고서에 **그대로** 적고, 고친 뒤 다시 돌린다.

- [ ] **Step 4: FPS 비교 (앱 브라우저 패널)**

  Task 0 Step 4와 같은 스크립트로 금고 화면의 FPS를 잰다.
  - 목표: 기준선의 **80% 이상**
  - 미달이면 원인 후보를 하나씩 끄고 측정해 기여도를 보고한다: N8AO `halfRes`, `multisampling` 0, anisotropy 4. 끄는 결정은 사용자에게 맡긴다.

- [ ] **Step 5: 프로덕션 빌드 (선택, dev 서버를 멈춘 뒤)**

  `preview_stop` → `npm run build` → `preview_start {name: "archive"}` 순서다. `.next`를 지우지 않는다.

  Expected: 빌드 성공. 실패하면 로그와 함께 보고한다.

- [ ] **Step 6: 보고서** (사용자에게 한국어로)
  - 기준선 대 최종 캡처 3쌍 (`baseline-*.png` / `final-*.png`)
  - 휘도 비율
  - FPS 전후 (측정한 브라우저와 품질 단계 명시)
  - 최종 튜닝 값: 환경 강도, N8AO `aoRadius`·`intensity`
  - Task 1의 `DOTS` 판단과 그 결과
  - 실패했다가 고친 것, 검증하지 못한 것 (빌드를 생략했다면 그 사실)
  - 다음 단계(2단계: 스크롤 챕터 골격) 제안

---

## Self-Review (작성자 점검 결과)

- **스펙 대비 누락**
  - §3.1 → T3, T5
  - §3.2 → T1, T3
  - §3.3 → T4
  - §3.4 → T6 (인트로 연동 포함)
  - §3.5 → T7
  - §5 위험: 카드 투명도 → T8, 볼트 자국 → T1 Step 2 + T4, 교체 깜빡임 → T6 Step 6·T4 Step 5 캡처, 레이캐스트 스크립트 → T2, GLB의 `edgeUv` 없음 → 셰이더의 `vWornEdge.z > 0.0` 분기(계획 작성 중 WebGL로 검증)
  - §8 검증 1~6 → T9
  - 누락 없음
- **자리표시자**: 없다. 조건부 값(`DOTS`, 튜닝 한도)은 판단 기준과 범위를 명시했다.
- **이름 일관성**
  - `metricBox(width, height, depth, seed)`, `metricPlane(width, height, seed)`
  - `createWornMaterial`, `loadTextureSet`, `setTextureAnisotropy`, `setAmbientLevel`/`getAmbientLevel`
  - `LIGHT_TARGETS.environment`, `userData.worn`
  - 점검 이름 7개가 T0 정의와 T4~T9 사용처에서 일치한다.
