# 스크롤 챕터 골격 + 서랍 투어 (2단계) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 스크롤 하나로 된 인트로를 챕터 구조로 바꾸고, 금고가 열린 뒤에도 스크롤이 이어지도록 서랍 5개를 하나씩 둘러보는 투어 챕터를 붙인다.

**Architecture:** ScrollTrigger는 지금처럼 1개이고 `p`를 0→1로 스크럽한다. 새 순수 모듈 `chapters.ts`가 `p`를 챕터와 챕터 안 진행도(`local`)로 나누고, `storyProgress.ts`가 챕터별로 장면(카메라·조명·문·서랍 살짝 빼기)을 적용하고 단계를 돌려준다. opening 챕터는 기존 `applyIntroProgress`를 그대로 부르므로 인트로는 변하지 않는다. 같은 계산을 "적용하지 않고" 돌려주는 `storySnapshot`으로, 투어 중 연 서랍을 닫을 때 스크롤이 그릴 바로 그 장면으로 돌아간다.

**Tech Stack:** Next.js 15.5, React ~19.2, @react-three/fiber 9.7, three 0.180, GSAP 3.15 ScrollTrigger, Zustand 5, Playwright(GPU 헤드리스, `tests/browser.mjs`), `node --test`(Node 22.23 타입 스트리핑)

**Spec:** `docs/superpowers/specs/2026-09-22-scroll-chapters-design.md`

## Global Constraints

- **git 작업 금지**: 이 폴더는 git 저장소가 아니다. 각 태스크의 마지막은 "커밋" 대신 **체크포인트**(검증 결과 기록)다.
- **외부 연결 금지**: 새 패키지 설치, 다운로드, 배포, push, 외부 서비스 연결 없음.
- **dev 서버**
  - `preview_start` 이름 `"archive"`(포트 3100)로 띄운다. 모든 브라우저 테스트는 이 서버를 쓴다.
  - dev 서버가 도는 동안 `npm run build`를 실행하거나 `.next`를 지우지 않는다. 빌드 전에 `preview_stop`.
- **편집 도구**: 코드 수정은 Edit/Write 도구로 한다. sed·perl 치환 금지(전례 있음).
- **opening 불변**: opening 챕터 길이는 데스크톱 3.0 / 휴대폰(<768px) 1.8 화면. `applyIntroProgress`의 조명·문 동작과 `stageForProgress`는 바꾸지 않는다. `introTimeline.ts`의 유일한 변경은 Task 3의 카메라 계산 추출이다(동작 동일).
- **챕터 수치(스펙 그대로)**: vault 0.6 화면, 투어 챕터 각 1.0 화면, `TOUR_ARRIVE = 0.35`, 서랍 peek 0.06m(local 0.35→0.5에 나옴, 다음 챕터 local 0→0.35에 들어감), 금고 전경 push-in 3%, 투어 머무름 push-in 4%, 투어 틀 1.7 × 1.1m, 위에서 10°, 가장자리 열 중앙 쪽으로 25%, 카드 가림 비율 0.4(휴대폰 0), 색인 이동 목표 local 0.6, SKIP 목표 vault local 0.5.
- **HUD 문구(스펙 그대로)**: 상태 `DRAWER TOUR — n OF 5`, 안내 `OPEN THE DRAWER · SCROLL TO CONTINUE`, 카드 버튼 `OPEN DRAWER`, 카드 메타 `ACTIVE · 3 DOSSIERS` 형식.
- **범위 밖**: 기밀 해제·아웃트로(3단계), 모바일 최적화(깨지지 않는지만 확인), 재질·모델, `FileTray`·서류 동작.
- **사용자 보고는 한국어로만** 한다.

---

## 스펙과 달라지는 점 (구현 세부, 모두 스펙의 의도 안)

1. `introTimeline.ts`에서 카메라 계산만 `introCameraPose(p)`로 추출한다. opening 끝 3%(단계 `vault`)에서 서랍을 열었다 닫을 때 `storySnapshot`이 opening의 카메라를 "적용 없이" 계산해야 하기 때문이다. `applyIntroProgress`의 결과는 바뀌지 않는다.
2. `buildChapters(narrow, tourIds)`: 서랍 id 목록을 인자로 받는다. `chapters.ts`에 import가 하나도 없어야 Node 단위 테스트에서 바로 불러올 수 있다(`@/` 별칭은 Node가 못 읽는다).
3. 서랍 peek 계산(`drawerPeek`)과 `smoothstep`도 `chapters.ts`에 둔다. 순수 함수라 단위 테스트할 수 있다.
4. `applyStoryProgress`는 단계·`tourStop`·`tourReady`를 **돌려주고**, 스토어 반영은 지금처럼 `ScrollIntro`의 `apply()`가 한다.
5. 클릭 규칙을 `canSelectLocker(state, id)`로 만들어 `Locker.tsx`와 `GltfCabinet.tsx`(GLB 경로, 같은 규칙)가 함께 쓴다.
6. 개발 모드 전용 핸들 `window.__story`를 추가한다(`__archive`와 같은 방식, 프로덕션에서는 없음). 투어 테스트가 챕터 표·카메라 rig·서랍 위치를 읽는 데 쓴다.
7. **경계 연속성 측정 방법**: 스크롤 대신 `__story.apply(p)`로 이야기 함수를 직접 부른다. 스크럽 스무딩이 튐을 흐리게 만들고, 200번 스크롤하면 몇 분이 걸리기 때문이다. 판정은 두 가지다.
   - 모든 챕터 경계 ±1e-7에서 카메라 차이 < 1mm
   - 200단계 스윕에서 각 단계 이동량 ≤ 3 × (앞뒤 단계 중 큰 값) + 1cm
   - 스펙의 "이동 구간 평균의 3배"를 이웃 기준으로 바꾼 이유: 금고→A-01 이동(약 2.6m)이 서랍 사이 이동(약 1m)보다 몇 배 길어서, 전체 평균을 기준으로 삼으면 정상 이동이 튐으로 잡힌다.
8. 서랍 클릭 때의 "툭" 반동(12mm)은 현재 위치에서 시작한다. 투어에서는 서랍이 이미 6cm 나와 있기 때문이다.
9. `CameraController`의 `DRIFT_BY_STAGE`에 `tour: 0.06`을 넣는다(`Record<Stage, number>`라 필수).
10. `scroll-probe`는 고정 비율 대신 챕터마다 한 번씩 샘플링하고, 순서·겹침·에러 문제가 있으면 실패 코드로 끝난다.

## 파일 구조

| 파일 | 책임 | 상태 |
| --- | --- | --- |
| `src/lib/chapters.ts` | 챕터 표, `locate`/`progressAt`/`totalLength`, `drawerPeek`, `smoothstep` (import 없음) | 새 파일 |
| `src/lib/storyProgress.ts` | `applyStoryProgress`, `storySnapshot`, `setStoryLayout`, `getSpans` | 새 파일 |
| `src/components/ui/TourCard.tsx` + `.module.css` | 투어 제목 카드 | 새 파일 |
| `tests/unit/chapters.test.mjs` | 챕터 표 단위 테스트 | 새 파일 |
| `tests/unit/classification.test.mjs` | `highestClassification` 단위 테스트 | 새 파일 |
| `tests/tour-flow.mjs` | 투어 브라우저 테스트 | 새 파일 |
| `src/lib/introTimeline.ts` | `introCameraPose` 추출 | 수정 |
| `src/lib/cameraRig.ts` | `tourCardCoverage`, `tourShot` | 수정 |
| `src/lib/lockerRegistry.ts` | `tourCameraPose` | 수정 |
| `src/store/archiveStore.ts` | `tour` 단계, `tourStop`/`tourReady`/`returnStage`, `setTour`, `canSelectLocker` | 수정 |
| `src/components/ui/ScrollIntro.tsx` | 이야기 적용, 트랙 높이, `skipIntro`/`scrollToChapter` | 수정 |
| `src/components/ui/ArchiveExperience.module.css` | 트랙 고정 높이 삭제 | 수정 |
| `src/components/canvas/CameraController.tsx` | `tour` drift | 수정 |
| `src/hooks/useArchiveNavigation.ts` | 개발용 `__story` 핸들 | 수정 |
| `src/components/canvas/Locker.tsx` | 클릭 규칙, 투어 테두리, 반동 기준 | 수정 |
| `src/components/canvas/GltfCabinet.tsx` | 클릭 규칙 | 수정 |
| `src/lib/choreography.ts` | `closeLocker` 복귀 목표 | 수정 |
| `src/lib/classification.ts` | `highestClassification` | 수정 |
| `src/components/ui/ArchiveHud.tsx` + `.module.css` | 색인(투어에서는 이동), 상태·안내 문구, 현재 항목 표시 | 수정 |
| `src/components/ui/ArchiveExperience.tsx` | `TourCard` 마운트 | 수정 |
| `tests/browser.mjs` | `gotoVault`, `waitForScrollRest` | 수정 |
| `tests/drawer-flow.mjs`, `material-shots.mjs`, `tab-visibility.mjs`, `texture-fallback.mjs` | 금고 가는 방법을 SKIP으로 | 수정 |
| `tests/scroll-probe.mjs` | 챕터별 샘플, 판정 | 수정 |

---

### Task 1: 챕터 표 `chapters.ts` (TDD)

**Files:**
- Create: `src/lib/chapters.ts`
- Test: `tests/unit/chapters.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type ChapterKind = 'opening' | 'vault' | 'tour'`
  - `interface Chapter { id: string; kind: ChapterKind; length: number; lockerId?: string }`
  - `interface ChapterSpan extends Chapter { start: number; end: number }`
  - `interface Located { span: ChapterSpan; index: number; local: number }`
  - `buildChapters(narrow: boolean, tourIds: readonly string[]): ChapterSpan[]`
  - `totalLength(spans: readonly Chapter[]): number`
  - `locate(spans: readonly ChapterSpan[], p: number): Located`
  - `progressAt(span: ChapterSpan, local: number): number`
  - `drawerPeek(spans: readonly ChapterSpan[], p: number, lockerId: string): number`
  - `smoothstep(t: number): number`
  - 상수 `TOUR_ARRIVE = 0.35`, `PEEK_DEPTH = 0.06`, `OPENING_LENGTH`, `VAULT_LENGTH`, `TOUR_LENGTH`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/unit/chapters.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PEEK_DEPTH,
  TOUR_ARRIVE,
  buildChapters,
  drawerPeek,
  locate,
  progressAt,
  totalLength,
} from '../../src/lib/chapters.ts';

const IDS = ['Locker_01', 'Locker_02', 'Locker_03', 'Locker_04', 'Locker_05'];
const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${message}: ${actual} != ${expected}`);

test('chapters run opening, vault, then one tour chapter per drawer in order', () => {
  const spans = buildChapters(false, IDS);
  assert.deepEqual(
    spans.map((span) => span.id),
    ['opening', 'vault', ...IDS.map((id) => `tour-${id}`)],
  );
  assert.deepEqual(spans.slice(2).map((span) => span.lockerId), IDS);
  assert.ok(spans.slice(2).every((span) => span.kind === 'tour'));
});

test('lengths: 8.6 screens wide, 7.4 narrow; the opening keeps the old intro distance', () => {
  const wide = buildChapters(false, IDS);
  const narrow = buildChapters(true, IDS);
  close(totalLength(wide), 8.6, 'wide total');
  close(totalLength(narrow), 7.4, 'narrow total');
  close(wide[0].length, 3.0, 'wide opening (400vh track minus one viewport)');
  close(narrow[0].length, 1.8, 'narrow opening (280vh track minus one viewport)');
  close(wide[0].end, 3.0 / 8.6, 'wide opening end');
  close(narrow[0].end, 1.8 / 7.4, 'narrow opening end');
});

test('spans tile 0..1 with no gaps', () => {
  for (const narrow of [false, true]) {
    const spans = buildChapters(narrow, IDS);
    assert.equal(spans[0].start, 0);
    assert.equal(spans.at(-1).end, 1);
    for (let i = 1; i < spans.length; i += 1) assert.equal(spans[i].start, spans[i - 1].end);
  }
});

test('locate: ends, boundaries and out-of-range progress', () => {
  const spans = buildChapters(false, IDS);
  const top = locate(spans, 0);
  assert.equal(top.span.id, 'opening');
  assert.equal(top.local, 0);
  const end = locate(spans, 1);
  assert.equal(end.span.id, 'tour-Locker_05');
  close(end.local, 1, 'local at p = 1');
  const boundary = locate(spans, spans[1].start);
  assert.equal(boundary.span.id, 'vault');
  close(boundary.local, 0, 'local at a boundary');
  assert.equal(locate(spans, -0.2).span.id, 'opening');
  assert.equal(locate(spans, 1.5).span.id, 'tour-Locker_05');
  assert.equal(locate(spans, 1.5).index, spans.length - 1);
});

test('progressAt is the inverse of locate', () => {
  const spans = buildChapters(false, IDS);
  for (const span of spans) {
    for (const local of [0, TOUR_ARRIVE, 0.5, 0.6, 0.99]) {
      const found = locate(spans, progressAt(span, local));
      assert.equal(found.span.id, span.id, `${span.id} at ${local}`);
      assert.ok(Math.abs(found.local - local) < 1e-9, `${span.id}: local ${found.local} != ${local}`);
    }
  }
});

test('drawerPeek: out while the tour holds on it, back in during the next move', () => {
  const spans = buildChapters(false, IDS);
  const [, vault, a, b] = spans;
  const at = (span, local, id) => drawerPeek(spans, progressAt(span, local), id);

  assert.equal(at(vault, 0.5, 'Locker_01'), 0, 'closed in the vault chapter');
  assert.equal(at(a, 0.2, 'Locker_01'), 0, 'closed while the camera travels to it');
  const sliding = at(a, 0.42, 'Locker_01');
  assert.ok(sliding > 0 && sliding < PEEK_DEPTH, `sliding out: ${sliding}`);
  close(at(a, 0.5, 'Locker_01'), PEEK_DEPTH, 'fully out at local 0.5');
  close(at(a, 0.999, 'Locker_01'), PEEK_DEPTH, 'held to the end of its chapter');

  const early = at(b, 0.1, 'Locker_01');
  const late = at(b, 0.3, 'Locker_01');
  assert.ok(early > late && late > 0, `sliding back in: ${early} then ${late}`);
  close(at(b, TOUR_ARRIVE, 'Locker_01'), 0, 'home once the next drawer is reached');
  assert.equal(at(b, 0.2, 'Locker_02'), 0, 'next drawer still closed during the move');
  assert.equal(at(b, 0.2, 'Locker_03'), 0, 'unrelated drawer untouched');
});

test('drawerPeek is continuous across a boundary, and the last drawer stays out', () => {
  const spans = buildChapters(false, IDS);
  const boundary = spans[3].start; // tour-Locker_01 -> tour-Locker_02
  close(
    drawerPeek(spans, boundary - 1e-9, 'Locker_01'),
    drawerPeek(spans, boundary, 'Locker_01'),
    'no jump at the boundary',
  );
  close(drawerPeek(spans, 1, 'Locker_05'), PEEK_DEPTH, 'E-15 still out at the end of the page');
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:unit`
Expected: `chapters.test.mjs` FAIL, `Cannot find module ... src/lib/chapters.ts`. 기존 9개 테스트는 통과.

- [ ] **Step 3: 구현**

`src/lib/chapters.ts`:

```ts
/**
 * The page's scroll, as a table of chapters.
 *
 * Lengths are in screens (1.0 = one viewport of scrolling). The opening keeps
 * exactly the distance the old single-intro track had — 400vh less the one
 * viewport on screen at the end, 280vh on a phone — which is what keeps its
 * pacing unchanged. After it: a short hold on the open vault, then one chapter
 * per drawer on the tour.
 *
 * Pure and import-free on purpose, so the unit tests can load it under plain
 * Node. The drawer ids come in as an argument for the same reason.
 */

export type ChapterKind = 'opening' | 'vault' | 'tour';

export interface Chapter {
  id: string;
  kind: ChapterKind;
  /** Length in screens. */
  length: number;
  /** Tour chapters only: the drawer this chapter visits. */
  lockerId?: string;
}

export interface ChapterSpan extends Chapter {
  /** Where the chapter starts and ends in overall progress, 0–1. */
  start: number;
  end: number;
}

export interface Located {
  span: ChapterSpan;
  index: number;
  /** Progress within the chapter, 0–1. */
  local: number;
}

export const OPENING_LENGTH = { wide: 3.0, narrow: 1.8 } as const;
export const VAULT_LENGTH = 0.6;
export const TOUR_LENGTH = 1.0;

/** Share of a tour chapter spent travelling to its drawer; the rest holds on it. */
export const TOUR_ARRIVE = 0.35;
/** How far the drawer in focus slides out while the tour holds on it, in metres. */
export const PEEK_DEPTH = 0.06;
/** Chapter progress by which that drawer has finished sliding out. */
const PEEK_OUT_END = 0.5;

function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

export function buildChapters(narrow: boolean, tourIds: readonly string[]): ChapterSpan[] {
  const chapters: Chapter[] = [
    {
      id: 'opening',
      kind: 'opening',
      length: narrow ? OPENING_LENGTH.narrow : OPENING_LENGTH.wide,
    },
    { id: 'vault', kind: 'vault', length: VAULT_LENGTH },
    ...tourIds.map(
      (lockerId): Chapter => ({ id: `tour-${lockerId}`, kind: 'tour', length: TOUR_LENGTH, lockerId }),
    ),
  ];

  const total = totalLength(chapters);
  let cursor = 0;
  return chapters.map((chapter) => {
    const start = cursor / total;
    cursor += chapter.length;
    return { ...chapter, start, end: cursor / total };
  });
}

export function totalLength(chapters: readonly Chapter[]): number {
  return chapters.reduce((sum, chapter) => sum + chapter.length, 0);
}

/** The chapter `p` falls in. A boundary belongs to the chapter it starts. */
export function locate(spans: readonly ChapterSpan[], p: number): Located {
  const clamped = clamp01(p);
  let index = spans.findIndex((span) => clamped < span.end);
  if (index < 0) index = spans.length - 1;
  const span = spans[index];
  return { span, index, local: clamp01((clamped - span.start) / (span.end - span.start)) };
}

/** Overall progress of the point `local` of the way through `span`. */
export function progressAt(span: ChapterSpan, local: number): number {
  return span.start + clamp01(local) * (span.end - span.start);
}

/**
 * How far `lockerId`'s drawer is slid out at `p`, in metres.
 *
 * Out while the tour holds on it; back in while the camera travels on to the
 * next drawer, so the two moves overlap instead of queueing. The last drawer
 * has no next chapter and stays out.
 */
export function drawerPeek(spans: readonly ChapterSpan[], p: number, lockerId: string): number {
  const { span, index, local } = locate(spans, p);
  if (span.kind !== 'tour') return 0;

  if (span.lockerId === lockerId) {
    if (local < TOUR_ARRIVE) return 0;
    return PEEK_DEPTH * smoothstep((local - TOUR_ARRIVE) / (PEEK_OUT_END - TOUR_ARRIVE));
  }

  const previous = spans[index - 1];
  if (previous?.lockerId === lockerId && local < TOUR_ARRIVE) {
    return PEEK_DEPTH * (1 - smoothstep(local / TOUR_ARRIVE));
  }
  return 0;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test:unit`
Expected: 16개 모두 PASS (기존 9 + 새 7).

- [ ] **Step 5: 타입·린트**

Run: `npm run typecheck` 그리고 `npm run lint`
Expected: 에러 0.

- [ ] **Step 6: 체크포인트** — 단위 테스트 결과를 기록한다.

---

### Task 2: 테스트가 SKIP 버튼으로 금고에 가게 하기

지금 테스트 4개가 "맨 아래로 스크롤 = 금고"를 가정한다. 투어가 붙으면 맨 아래는 E-15다. **현재 코드에서 먼저** 바꿔 두면(지금 SKIP은 맨 아래 = 금고로 감), 이 변경만으로 테스트가 그대로 통과하는지 확인할 수 있다.

**Files:**
- Modify: `tests/browser.mjs`
- Modify: `tests/drawer-flow.mjs:11,55-59`, `tests/material-shots.mjs:24,138-140`, `tests/tab-visibility.mjs:14,54-55`, `tests/texture-fallback.mjs:11,30-31`

**Interfaces:**
- Produces: `gotoVault(page): Promise<void>`, `waitForScrollRest(page): Promise<void>` (`tests/browser.mjs`)

- [ ] **Step 1: 헬퍼 추가**

`tests/browser.mjs` 끝에 추가:

```js
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
```

- [ ] **Step 2: `drawer-flow.mjs` 수정**

import 줄을 `import { gotoVault, launchBrowser } from './browser.mjs';`로 바꾸고, 아래 블록을

```js
// Vault
await page.evaluate(() =>
  window.scrollTo(0, document.documentElement.scrollHeight),
);
await page.waitForTimeout(2600);
```

다음으로 바꾼다.

```js
// Vault
await gotoVault(page);
```

- [ ] **Step 3: `material-shots.mjs` 수정**

import 줄을 `import { gotoVault, launchBrowser } from './browser.mjs';`로 바꾸고,

```js
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);
const vault = await inspect();
```

를 다음으로 바꾼다.

```js
await gotoVault(page);
const vault = await inspect();
```

- [ ] **Step 4: `tab-visibility.mjs`, `texture-fallback.mjs` 수정**

두 파일 모두 import 줄을 `import { gotoVault, launchBrowser } from './browser.mjs';`로 바꾸고,

```js
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await page.waitForTimeout(2600);
```

를 `await gotoVault(page);`로 바꾼다.

- [ ] **Step 5: 현재 앱에서 그대로 통과하는지 확인**

`preview_list`로 `archive` 서버가 떠 있는지 보고, 없으면 `preview_start {name: "archive"}`.

Run (각각):
- `node tests/drawer-flow.mjs` → 마지막 beat `esc 2`의 `stage`가 `vault`, `errors` 빈 배열
- `node tests/tab-visibility.mjs` → `PASSED: every tab and stripe visible in all five drawers`
- `node tests/material-shots.mjs --prefix=task2 --check=textures,offline,errors,geometry,environment,tonemap,opaqueCards` → `PASSED: ...` (이 보고서의 `luminance`가 Task 3의 비교 기준)
- `node tests/texture-fallback.mjs` → `PASSED: flat fallback runs the full flow`

- [ ] **Step 6: 체크포인트** — 4개 결과와 `tests/shots/task2-report.json`의 `luminance`를 기록한다.

---

### Task 3: 카메라 자세 — `introCameraPose` 추출, 투어 자세

동작 변화가 없는 준비 작업이다. 투어 자세 함수는 Task 4부터 쓰인다.

**Files:**
- Modify: `src/lib/introTimeline.ts:1-2,50-64`
- Modify: `src/lib/cameraRig.ts` (파일 끝에 추가)
- Modify: `src/lib/lockerRegistry.ts:4` 및 파일 끝에 추가

**Interfaces:**
- Consumes: `fitDistance`, `isPanelBottomSheet`, `CloseFrame`, `PanelAwareShot` (cameraRig.ts 기존)
- Produces:
  - `introCameraPose(p: number): CameraRig` (introTimeline.ts)
  - `tourCardCoverage(): number`, `tourShot(frame: CloseFrame): PanelAwareShot` (cameraRig.ts)
  - `tourCameraPose(id: string): CameraPose | null` (lockerRegistry.ts)

- [ ] **Step 1: `introCameraPose` 추출**

`src/lib/introTimeline.ts` 2번째 줄을

```ts
import { cameraRig, currentOverviewPose, type CameraRig, type OverviewPoseName } from './cameraRig';
```

로 바꾸고, `export function applyIntroProgress(p: number): void {`부터 카메라 블록 끝(`cameraRig.fov = lerp(from.fov, to.fov, t);`)까지를 다음으로 바꾼다.

```ts
/**
 * Camera pose of the intro at progress `p`, without touching the rig.
 *
 * Split out so the story can ask "where would the camera be?" — closing a
 * drawer returns to exactly that frame (see `storySnapshot`).
 */
export function introCameraPose(p: number): CameraRig {
  const active =
    SEGMENTS.find((s) => p < s.end) ?? SEGMENTS[SEGMENTS.length - 1];
  const from = currentOverviewPose(active.from);
  const to = currentOverviewPose(active.to);
  const t = segment(p, active.start, active.end);

  return {
    px: lerp(from.px, to.px, t),
    py: lerp(from.py, to.py, t),
    pz: lerp(from.pz, to.pz, t),
    tx: lerp(from.tx, to.tx, t),
    ty: lerp(from.ty, to.ty, t),
    tz: lerp(from.tz, to.tz, t),
    fov: lerp(from.fov, to.fov, t),
  };
}

export function applyIntroProgress(p: number): void {
  /* -------------------------------------------------------------- camera */
  Object.assign(cameraRig, introCameraPose(p));
```

조명·환경·문 블록과 `stageForProgress`는 그대로 둔다.

- [ ] **Step 2: 카드 영역을 비운 투어 샷 (`cameraRig.ts` 끝에 추가)**

```ts
/**
 * Share of the viewport width the drawer tour's title card covers, on the
 * left. MUST track TourCard.module.css. On a narrow screen the card runs
 * across the top instead, and the drawer is simply centred.
 */
export function tourCardCoverage(): number {
  return isPanelBottomSheet() ? 0 : 0.4;
}

/**
 * The tour's close shot: `frame` fitted into the part of the screen the title
 * card leaves free. `panelAwareShot` mirrored — the card is on the left, so
 * the view slides left and the drawer lands in the middle of the right-hand
 * part.
 */
export function tourShot(frame: CloseFrame): PanelAwareShot {
  const cover = tourCardCoverage();
  const width = frame.width / (1 - cover);
  return {
    distance: fitDistance(width, frame.height, frame.fov, viewportAspect),
    shiftX: -(width * cover) / 2,
    shiftY: 0,
  };
}
```

- [ ] **Step 3: `tourCameraPose` (`lockerRegistry.ts`)**

4번째 줄 import를

```ts
import { closeDistance, closeFrame, panelAwareShot, tourShot, type CloseFrame } from './cameraRig';
```

로 바꾸고, 파일 끝에 추가:

```ts
/**
 * What the tour holds in frame around each drawer: the 0.91 × 0.69 m front
 * and a margin of cabinet round it.
 */
const TOUR_FRAME: CloseFrame = { width: 1.7, height: 1.1, fov: 40 };
/** The tour looks down on each drawer by 10 degrees. */
const TOUR_LOOK_DOWN = (10 * Math.PI) / 180;
/** Share of the way an edge-column shot is drawn toward the cabinet's centre line. */
const TOUR_CENTRE_PULL = 0.25;

/**
 * Camera pose the drawer tour holds on for one drawer.
 *
 * Solved live from the current viewport like every other pose, so a resize
 * re-frames it. The whole view — camera and target together — is slid left so
 * the drawer sits in the middle of the part of the screen the title card
 * leaves free. Same fov as the vault shot, so the move there is pure travel.
 */
export function tourCameraPose(id: string): CameraPose | null {
  const focus = getLockerWorldPosition(id);
  if (!focus) return null;
  const normal = getLockerWorldNormal(id, scratchNormal)?.clone() ?? new Vector3(0, 0, 1);

  const shot = tourShot(TOUR_FRAME);
  const direction = normal
    .clone()
    .multiplyScalar(Math.cos(TOUR_LOOK_DOWN))
    .addScaledVector(UP, Math.sin(TOUR_LOOK_DOWN))
    .normalize();

  const position = focus.clone().addScaledVector(direction, shot.distance);
  // Drift toward the cabinet's centre line so the edge columns are seen
  // slightly from the side, like the drawer shot.
  position.x += (0 - position.x) * TOUR_CENTRE_PULL;

  const shift = new Vector3(shot.shiftX, shot.shiftY, 0);
  return {
    position: position.add(shift),
    target: focus.clone().add(shift),
    fov: TOUR_FRAME.fov,
  };
}
```

- [ ] **Step 4: 타입·린트·단위**

Run: `npm run typecheck`, `npm run lint`, `npm run test:unit`
Expected: 에러 0, 16 PASS.

- [ ] **Step 5: 인트로가 그대로인지 확인**

Run: `node tests/material-shots.mjs --prefix=task3 --check=textures,offline,errors,geometry,environment,tonemap,opaqueCards`
Expected: `PASSED`, `luminance.vault`가 `task2`와 ±0.002 안(같은 장면). `node tests/scroll-probe.mjs`(아직 기존 버전) → 3개 뷰포트 모두 `consoleErrors` 빈 배열.

- [ ] **Step 6: 체크포인트**

---

### Task 4: 투어가 스크롤된다 — 챕터 적용, 스토어, 트랙 길이

이 태스크가 끝나면 금고 뒤로 스크롤이 이어지고, 카메라가 서랍 5개를 차례로 비추며 서랍이 살짝 나온다. 클릭 규칙·닫기 복귀(Task 5)와 카드·색인(Task 6)은 아직이다.

**Files:**
- Modify: `tests/scroll-probe.mjs` (전체 교체)
- Modify: `src/store/archiveStore.ts`
- Create: `src/lib/storyProgress.ts`
- Modify: `src/components/ui/ScrollIntro.tsx` (전체 교체)
- Modify: `src/components/ui/ArchiveExperience.module.css:27-43`
- Modify: `src/components/canvas/CameraController.tsx:20-26`
- Modify: `src/components/ui/ArchiveHud.tsx:8-14`
- Modify: `src/hooks/useArchiveNavigation.ts:1-5,52-68`

**Interfaces:**
- Consumes: Task 1 전부, `introCameraPose`, `tourCameraPose`
- Produces:
  - 스토어: `Stage`에 `'tour'`, `tourStop: string | null`, `tourReady: boolean`, `setTour(stop, ready)`
  - `storyProgress.ts`: `type StoryStage`, `interface StoryState { stage; tourStop; tourReady }`, `interface StorySnapshot { camera: CameraRig; peeks: Record<string, number> }`, `setStoryLayout(narrow): readonly ChapterSpan[]`, `getSpans(): readonly ChapterSpan[]`, `applyStoryProgress(p): StoryState`, `storySnapshot(p?): StorySnapshot`
  - `ScrollIntro.tsx`: `skipIntro(): void`, `scrollToChapter(lockerId: string): void`
  - 개발 모드 `window.__story = { apply, snapshot, spans, rig, lockerPosition(id), drawerZ(id) }`

- [ ] **Step 1: `scroll-probe.mjs`를 챕터 기준으로 교체 (실패하는 테스트)**

`tests/scroll-probe.mjs` 전체를 다음으로 바꾼다.

```js
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
```

- [ ] **Step 2: 실패 확인**

Run: `node tests/scroll-probe.mjs`
Expected: 비정상 종료. `window.__story`가 없어 `Cannot read properties of undefined (reading 'spans')`.

- [ ] **Step 3: 스토어에 `tour` 단계 추가 (`archiveStore.ts`)**

주석 표에 줄을 추가하고 `Stage`를 바꾼다.

```ts
 *   vault     outer doors open, lockers selectable    — scroll owns the camera
 *   tour      the camera visits one drawer at a time  — scroll owns the camera
 *   locker    one locker open, files fanned out       — click owns the camera
 *   file      one dossier in close-up                 — click owns the camera
 */
export type Stage = 'intro' | 'approach' | 'vault' | 'tour' | 'locker' | 'file';
```

`ArchiveState`의 `isCameraMoving` 아래에 추가:

```ts
  /** Drawer of the current tour chapter, travel included; null outside the tour. */
  tourStop: string | null;
  /** True while a tour chapter holds on its drawer. */
  tourReady: boolean;
```

`setCameraMoving` 선언 아래에 추가:

```ts
  /** Commit the tour position. Called every scroll frame; a no-op unless it changed. */
  setTour: (stop: string | null, ready: boolean) => void;
```

초기값 `isCameraMoving: false,` 아래에 `tourStop: null,` `tourReady: false,`를, `setCameraMoving: ...` 구현 아래에 추가:

```ts
  setTour: (tourStop, tourReady) => {
    const state = get();
    if (state.tourStop === tourStop && state.tourReady === tourReady) return;
    set({ tourStop, tourReady });
  },
```

- [ ] **Step 4: `src/lib/storyProgress.ts` 작성**

```ts
import { LOCKERS } from '@/data/archive';
import { cameraRig, currentOverviewPose, type CameraRig } from './cameraRig';
import {
  TOUR_ARRIVE,
  buildChapters,
  drawerPeek,
  locate,
  smoothstep,
  type ChapterSpan,
} from './chapters';
import { applyIntroProgress, introCameraPose, stageForProgress } from './introTimeline';
import { getLockerHandle, tourCameraPose } from './lockerRegistry';

/**
 * The whole scroll, as a pure function of overall progress.
 *
 * The opening chapter IS the old intro: it calls `applyIntroProgress` with the
 * chapter's own progress, so the first part of the page looks and paces
 * exactly as it did. After it the lights stay up and the doors stay open; the
 * camera holds on the vault, then visits each drawer in turn while the drawer
 * it is holding on slides out a few centimetres.
 *
 * Every chapter starts where the previous one ends, so a boundary has nothing
 * to jump. The same maths answers "where should the scene be at p?" without
 * moving anything (`storySnapshot`), which is how closing a drawer returns to
 * exactly the frame the scroll draws next.
 */

export type StoryStage = 'intro' | 'approach' | 'vault' | 'tour';

export interface StoryState {
  stage: StoryStage;
  /** Drawer of the current tour chapter, travel included; null outside the tour. */
  tourStop: string | null;
  /** True while a tour chapter holds on its drawer. */
  tourReady: boolean;
}

export interface StorySnapshot {
  camera: CameraRig;
  /** How far each tour drawer is slid out, by locker id. */
  peeks: Record<string, number>;
}

const TOUR_IDS = LOCKERS.map((locker) => locker.id);

/**
 * How far the camera closes in over a hold, as a share of its distance to
 * the target. Just enough that a held frame never reads as frozen.
 */
const VAULT_PUSH = 0.03;
const TOUR_PUSH = 0.04;

let spans: ChapterSpan[] = buildChapters(false, TOUR_IDS);
let lastProgress = 0;

/** Rebuild the chapter table for the viewport class, and return it. */
export function setStoryLayout(narrow: boolean): readonly ChapterSpan[] {
  spans = buildChapters(narrow, TOUR_IDS);
  return spans;
}

export function getSpans(): readonly ChapterSpan[] {
  return spans;
}

function mix(a: CameraRig, b: CameraRig, t: number): CameraRig {
  return {
    px: a.px + (b.px - a.px) * t,
    py: a.py + (b.py - a.py) * t,
    pz: a.pz + (b.pz - a.pz) * t,
    tx: a.tx + (b.tx - a.tx) * t,
    ty: a.ty + (b.ty - a.ty) * t,
    tz: a.tz + (b.tz - a.tz) * t,
    fov: a.fov + (b.fov - a.fov) * t,
  };
}

/** Move the camera `amount` of the way toward what it is looking at. */
function pushIn(pose: CameraRig, amount: number): CameraRig {
  return {
    ...pose,
    px: pose.px + (pose.tx - pose.px) * amount,
    py: pose.py + (pose.ty - pose.py) * amount,
    pz: pose.pz + (pose.tz - pose.pz) * amount,
  };
}

function tourPose(lockerId: string): CameraRig {
  const pose = tourCameraPose(lockerId);
  if (!pose) return currentOverviewPose('vault');
  return {
    px: pose.position.x,
    py: pose.position.y,
    pz: pose.position.z,
    tx: pose.target.x,
    ty: pose.target.y,
    tz: pose.target.z,
    fov: pose.fov,
  };
}

/** Where the camera rests at the end of chapter `index`. */
function stationEnd(index: number): CameraRig {
  const span = spans[index];
  if (span?.kind === 'tour' && span.lockerId) return pushIn(tourPose(span.lockerId), TOUR_PUSH);
  return pushIn(currentOverviewPose('vault'), VAULT_PUSH);
}

function cameraAt(p: number): CameraRig {
  const { span, index, local } = locate(spans, p);
  if (span.kind === 'opening') return introCameraPose(local);
  if (span.kind === 'vault') return pushIn(currentOverviewPose('vault'), VAULT_PUSH * local);

  if (!span.lockerId) return stationEnd(index - 1);
  const station = tourPose(span.lockerId);
  if (local < TOUR_ARRIVE) {
    return mix(stationEnd(index - 1), station, smoothstep(local / TOUR_ARRIVE));
  }
  return pushIn(station, (TOUR_PUSH * (local - TOUR_ARRIVE)) / (1 - TOUR_ARRIVE));
}

function peeksAt(p: number): Record<string, number> {
  const peeks: Record<string, number> = {};
  for (const id of TOUR_IDS) peeks[id] = drawerPeek(spans, p, id);
  return peeks;
}

/**
 * Put the scene where the scroll says it is, and report the stage and tour
 * position for the caller to commit to the store.
 *
 * Must not run while a drawer is open: the click choreography owns the camera
 * and that drawer then. `<ScrollIntro>` checks before calling.
 */
export function applyStoryProgress(p: number): StoryState {
  lastProgress = p;
  const { span, local } = locate(spans, p);

  // Lights, reflections and the outer doors: the opening animates them, and
  // after it they stay fully up and fully open.
  applyIntroProgress(span.kind === 'opening' ? local : 1);
  Object.assign(cameraRig, cameraAt(p));

  const peeks = peeksAt(p);
  for (const id of TOUR_IDS) {
    const drawer = getLockerHandle(id)?.drawer;
    if (drawer) drawer.position.z = peeks[id];
  }

  if (span.kind === 'opening') {
    return { stage: stageForProgress(local), tourStop: null, tourReady: false };
  }
  if (span.kind === 'vault') return { stage: 'vault', tourStop: null, tourReady: false };
  return { stage: 'tour', tourStop: span.lockerId ?? null, tourReady: local >= TOUR_ARRIVE };
}

/**
 * The scene the scroll would draw at `p` — by default the last progress it
 * applied — without moving anything.
 */
export function storySnapshot(p: number = lastProgress): StorySnapshot {
  return { camera: cameraAt(p), peeks: peeksAt(p) };
}
```

- [ ] **Step 5: `ScrollIntro.tsx` 전체 교체**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger } from '@/lib/gsapConfig';
import { PANEL_BREAKPOINT } from '@/lib/cameraRig';
import { progressAt, totalLength } from '@/lib/chapters';
import { applyStoryProgress, getSpans, setStoryLayout } from '@/lib/storyProgress';
import { useArchiveStore } from '@/store/archiveStore';

interface ScrollIntroProps {
  /** The tall element the story is scrubbed against. */
  trackRef: React.RefObject<HTMLElement | null>;
}

/** The one trigger that scrubs the story. Read by the scroll helpers below. */
let storyTrigger: ScrollTrigger | null = null;

/**
 * Drives the story from the page scroll, and hands the camera over cleanly
 * when a compartment is opened.
 *
 * ScrollTrigger scrubs a single `{ p }` proxy from 0 to 1 across the whole
 * track; everything the scroll touches is a function of `p`, split into
 * chapters by `lib/storyProgress.ts`. Nothing is pinned — the canvas is
 * `position: fixed` underneath a tall, otherwise empty track, which avoids
 * ScrollTrigger's pin-spacing pitfalls entirely and behaves identically on
 * iOS where pinning is least reliable.
 */
export function ScrollIntro({ trackRef }: ScrollIntroProps) {
  const setStage = useArchiveStore((s) => s.setStage);
  const setVaultOpen = useArchiveStore((s) => s.setVaultOpen);
  const setTour = useArchiveStore((s) => s.setTour);
  const stage = useArchiveStore((s) => s.stage);

  const progressRef = useRef({ p: 0 });
  const savedScroll = useRef(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // A story that starts halfway through is not a story. Browsers restore
    // the previous scroll position on reload, which lands the user in the
    // middle of the choreography with no idea how they got there.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    /*
     * The track is as long as the chapters, plus the one viewport that is on
     * screen at the end. The table is shorter on a phone (its opening is), so
     * it is rebuilt when the width crosses the breakpoint; the resize observer
     * below then re-measures the trigger.
     */
    const narrow = window.matchMedia(`(max-width: ${PANEL_BREAKPOINT - 1}px)`);
    const layout = () => {
      const spans = setStoryLayout(narrow.matches);
      track.style.height = `${(totalLength(spans) + 1) * 100}vh`;
    };
    layout();
    narrow.addEventListener('change', layout);

    const proxy = progressRef.current;

    const apply = () => {
      const state = useArchiveStore.getState();
      // The click choreography owns the camera in these stages. Bail out
      // BEFORE writing to the rig, not after: a single stray frame of scroll
      // pose is a visible snap.
      if (state.stage === 'locker' || state.stage === 'file') return;

      const story = applyStoryProgress(proxy.p);
      if (story.stage !== state.stage) setStage(story.stage);

      const vaultOpen = story.stage === 'vault' || story.stage === 'tour';
      if (vaultOpen !== state.isVaultOpen) setVaultOpen(vaultOpen);

      setTour(story.tourStop, story.tourReady);
    };

    /*
     * Applied at most once per frame, from the value the frame ends up with.
     *
     * ScrollTrigger reverts its animation to the start while it re-measures —
     * inside enable() and every refresh() — and restores it before returning,
     * firing onUpdate on the way. Applied synchronously, that transient p = 0
     * set the stage back to 'intro' whenever a drawer closed, and the scrub
     * then replayed the whole intro camera. Deferred to the next frame, only
     * the settled value is ever seen.
     */
    let frame = 0;
    const scheduleApply = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        apply();
      });
    };

    const tween = gsap.to(proxy, {
      p: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.65,
        invalidateOnRefresh: true,
      },
      onUpdate: scheduleApply,
    });

    storyTrigger = tween.scrollTrigger ?? null;

    // Paint the correct first frame even before the user scrolls, and re-frame
    // on refresh (the poses are aspect-dependent).
    apply();
    const onRefresh = scheduleApply;
    ScrollTrigger.addEventListener('refresh', onRefresh);

    /*
     * The trigger is created before the layout has settled: the canvas is a
     * dynamic import, so start/end can be measured against a page that is
     * still one viewport tall. Observing the track and refreshing when its
     * height actually changes fixes that at the source — and covers the
     * height changing at the phone breakpoint. The observer fires once
     * immediately on observe(), which covers the initial measurement.
     */
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(track);

    return () => {
      cancelAnimationFrame(frame);
      narrow.removeEventListener('change', layout);
      observer.disconnect();
      ScrollTrigger.removeEventListener('refresh', onRefresh);
      storyTrigger = null;
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [trackRef, setStage, setVaultOpen, setTour]);

  /*
   * Freezing the page while a drawer is open needs two things, and doing only
   * the obvious one breaks the scene.
   *
   * `overflow: hidden` on a scrolled document collapses its scroll position to
   * zero. ScrollTrigger dutifully reports progress 0 and rewinds the entire
   * story underneath the open drawer. So the trigger is DISABLED first, the
   * position is remembered, and on unlock the position is restored before the
   * trigger is switched back on — which leaves the scrubbed progress exactly
   * where the user left it.
   */
  useEffect(() => {
    const locked = stage === 'locker' || stage === 'file';
    const trigger = storyTrigger;
    const root = document.documentElement;

    if (locked) {
      savedScroll.current = window.scrollY;
      trigger?.disable(false);
      root.dataset.scrollLocked = 'true';
      return;
    }

    if (!root.dataset.scrollLocked) return;
    delete root.dataset.scrollLocked;
    // Force the reflow that makes the document scrollable again before
    // restoring the offset, otherwise the scroll is clamped to zero.
    void root.offsetHeight;
    window.scrollTo(0, savedScroll.current);
    // enable(false): keep the progress it was disabled at. The default resets
    // progress to 0 and lets the scrub chase it back up — the intro replayed.
    trigger?.enable(false);
  }, [stage]);

  return null;
}

/** Smooth-scroll the page to overall story progress `progress`. */
function scrollToProgress(progress: number): void {
  const trigger = storyTrigger;
  if (!trigger) return;
  window.scrollTo({
    top: trigger.start + progress * (trigger.end - trigger.start),
    behavior: 'smooth',
  });
}

/**
 * Past the opening to the open vault — the title card's "skip", and the
 * keyboard path past a scroll-only gate. Lands midway through the vault
 * chapter rather than at the end of the page: the tour comes after it.
 *
 * Native smooth scrolling rather than GSAP's ScrollToPlugin: one less plugin.
 */
export function skipIntro(): void {
  const vault = getSpans().find((span) => span.kind === 'vault');
  if (vault) scrollToProgress(progressAt(vault, 0.5));
}

/** To where the tour holds on `lockerId` — the compartment index, in the tour. */
export function scrollToChapter(lockerId: string): void {
  const span = getSpans().find((entry) => entry.lockerId === lockerId);
  if (span) scrollToProgress(progressAt(span, 0.6));
}
```

- [ ] **Step 6: 트랙 고정 높이 삭제 (`ArchiveExperience.module.css`)**

다음 블록 전체를

```css
/*
 * Scroll runway. Four viewports of empty height: the intro is scrubbed against
 * it while the fixed canvas stays put underneath. Shorter on phones, where a
 * long runway just feels like the page is broken.
 */
.track {
  position: relative;
  z-index: 1;
  height: 400vh;
  pointer-events: none;
}

@media (max-width: 767px) {
  .track {
    height: 280vh;
  }
}
```

다음으로 바꾼다.

```css
/*
 * Scroll runway. Empty on purpose: the story is scrubbed against it while the
 * fixed canvas stays put underneath. Its height comes from the chapter table
 * (lib/chapters.ts) and is set by <ScrollIntro>; the table is shorter on
 * phones, where a long runway just feels like the page is broken.
 */
.track {
  position: relative;
  z-index: 1;
  pointer-events: none;
}
```

- [ ] **Step 7: `tour`가 필요한 두 표 (`CameraController.tsx`, `ArchiveHud.tsx`)**

`CameraController.tsx`의 `DRIFT_BY_STAGE`에서 `vault: 0.08,` 다음 줄에 `tour: 0.06,`를 넣는다.

`ArchiveHud.tsx`의 `STATUS_BY_STAGE`에서 `vault: ...,` 다음 줄에 `tour: 'DRAWER TOUR',`를 넣는다(번호가 붙은 문구는 Task 6).

- [ ] **Step 8: 개발용 `__story` 핸들 (`useArchiveNavigation.ts`)**

import에 추가:

```ts
import { cameraRig } from '@/lib/cameraRig';
import { getLockerHandle, getLockerWorldPosition } from '@/lib/lockerRegistry';
import { applyStoryProgress, getSpans, storySnapshot } from '@/lib/storyProgress';
```

`useDevStoreHandle`을 다음으로 바꾼다.

```ts
/**
 * Expose the store — and the story's own maths — for debugging and the
 * browser tests, in development only.
 *
 * Almost everything interesting here happens in refs, module registries and
 * GSAP timelines, none of which show up in React DevTools. One handle on
 * `window` turns "why did that open?" into a one-line question. `__story`
 * lets the tour test apply a progress directly (no scroll smoothing), read the
 * camera rig, and find a drawer on screen.
 */
export function useDevStoreHandle(): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as typeof window & { __archive?: unknown; __story?: unknown };
    w.__archive = useArchiveStore;
    w.__story = {
      apply: applyStoryProgress,
      snapshot: storySnapshot,
      spans: getSpans,
      rig: cameraRig,
      lockerPosition: (id: string) => getLockerWorldPosition(id),
      drawerZ: (id: string) => getLockerHandle(id)?.drawer.position.z ?? null,
    };
    return () => {
      delete w.__archive;
      delete w.__story;
    };
  }, []);
}
```

- [ ] **Step 9: 타입·린트·단위**

Run: `npm run typecheck`, `npm run lint`, `npm run test:unit`
Expected: 에러 0, 16 PASS.

- [ ] **Step 10: 통과 확인**

Run: `node tests/scroll-probe.mjs`
Expected: `PASSED: the story runs forward ...`. 각 뷰포트 `samples`의 단계가 `intro, approach, vault, tour ×5, tour` 순서이고, `tour-Locker_0N` 샘플의 `tourStop`이 그 서랍이다.

Run: `node tests/drawer-flow.mjs`, `node tests/tab-visibility.mjs`, `node tests/texture-fallback.mjs`, `node tests/material-shots.mjs --prefix=task4 --check=textures,offline,errors,geometry,environment,tonemap,opaqueCards`
Expected: 모두 이전과 같이 통과. (금고 챕터 중간에서는 카메라가 1.5% 다가가 있어, `luminance.vault`가 task2와 조금 다를 수 있다. 보고만 한다.)

`tests/shots/desktop-tour-end.png`, `phone-tour-end.png`를 Read로 열어 E-15 서랍이 화면에 있고 살짝 나와 있는지 본다.

- [ ] **Step 11: 체크포인트** — 이 시점에는 투어 중 서랍 클릭이 안 되는 것이 정상이다(Task 5).

---

### Task 5: 투어 중 클릭 규칙과 닫기 복귀

**Files:**
- Create: `tests/tour-flow.mjs`
- Modify: `src/store/archiveStore.ts`
- Modify: `src/components/canvas/Locker.tsx:17-19,54-61,96-104,121-138`
- Modify: `src/components/canvas/GltfCabinet.tsx:89-120`
- Modify: `src/lib/choreography.ts:3-13,138-167`

**Interfaces:**
- Consumes: `storySnapshot()` (Task 4), `tourStop`/`tourReady` (Task 4), `waitForScrollRest`/`gotoVault` (Task 2), `window.__story` (Task 4)
- Produces:
  - 스토어: `returnStage: 'vault' | 'tour'`, `goBack()`이 `returnStage`로 돌아감, `canSelectLocker(state: ArchiveState, id: string): boolean` (export 함수)

- [ ] **Step 1: 실패하는 테스트 `tests/tour-flow.mjs` 작성**

```js
/**
 * Drawer tour.
 *
 * Scrolls the real page through the tour with a real mouse and real keys, and
 * checks:
 *   holds       at each hold: stage 'tour', the right tourStop, tourReady
 *   pointer     only the drawer in focus answers hover and click
 *   travel      between drawers nothing is ready to open
 *   return      a drawer opened from the tour closes back to the same chapter
 *               and scroll position, its drawer still peeking, with no jump
 *   reverse     scrolling up runs the chapters backwards to the title
 *   continuity  the camera never jumps: at every chapter boundary the pose on
 *               either side matches, and a 200-step sweep has no spike
 *
 * Run:  node tests/tour-flow.mjs      (dev server on :3100)
 */
import { mkdirSync } from 'node:fs';
import { gotoVault, launchBrowser, waitForScrollRest } from './browser.mjs';

const OUT = 'tests/shots';
mkdirSync(OUT, { recursive: true });

const TOUR = [
  { id: 'Locker_01', code: 'A-01', label: 'NORTHERN DIRECTORATE', files: 3 },
  { id: 'Locker_02', code: 'B-04', label: 'MARITIME SECTION', files: 2 },
  { id: 'Locker_03', code: 'C-08', label: 'TECHNICAL RESEARCH', files: 4 },
  { id: 'Locker_04', code: 'D-11', label: 'PERSONNEL SECURITY', files: 3 },
  { id: 'Locker_05', code: 'E-15', label: 'DEEP ARCHIVE', files: 2 },
];
const ORDER = ['intro', 'approach', 'vault', 'tour'];

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
// Keep hold of the camera the room is rendered with (see tab-visibility.mjs):
// post-processing renders its own scenes through the same renderer, and only
// the scene with fog is the room.
await page.addInitScript(() => {
  const hook = new EventTarget();
  hook.addEventListener('observe', (event) => {
    const renderer = event.detail;
    if (!renderer || typeof renderer.render !== 'function' || !renderer.domElement || renderer.__probed) return;
    const render = renderer.render;
    renderer.render = function probed(scene, camera) {
      if (scene.fog) window.__camera = camera;
      return render.call(this, scene, camera);
    };
    renderer.__probed = true;
  });
  window.__THREE_DEVTOOLS__ = hook;
});

const errors = [];
page.on('console', (message) => message.type() === 'error' && errors.push(message.text()));
page.on('pageerror', (error) => errors.push(String(error)));

const failures = [];
const expect = (ok, message) => {
  if (!ok) failures.push(message);
};

const state = () =>
  page.evaluate(() => {
    const s = window.__archive.getState();
    return {
      stage: s.stage,
      tourStop: s.tourStop,
      tourReady: s.tourReady,
      hovered: s.hoveredLocker,
      selected: s.selectedLocker,
      scrollY: Math.round(window.scrollY),
    };
  });

const settle = async () => {
  await page.waitForFunction(() => !window.__archive.getState().isCameraMoving, null, {
    timeout: 15000,
  });
  await page.waitForTimeout(250);
};

/**
 * Scroll (instantly) to `local` within a chapter — named by its drawer id or
 * its kind — and let the scrub catch up.
 */
const scrollInto = async (key, local = 0.6) => {
  await page.evaluate(
    ([k, at]) => {
      const span = window.__story.spans().find((entry) => entry.lockerId === k || entry.kind === k);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.round((span.start + at * (span.end - span.start)) * max));
    },
    [key, local],
  );
  await waitForScrollRest(page);
};

/** Where a drawer's face centre is on screen, and whether the canvas is what is there. */
const screenOf = (lockerId) =>
  page.evaluate((id) => {
    const world = window.__story.lockerPosition(id);
    const camera = window.__camera;
    if (!world || !camera) return null;
    const ndc = world.clone().project(camera);
    const x = Math.round(((ndc.x + 1) / 2) * window.innerWidth);
    const y = Math.round(((1 - ndc.y) / 2) * window.innerHeight);
    const inside = x > 12 && y > 12 && x < window.innerWidth - 12 && y < window.innerHeight - 12;
    return { x, y, onCanvas: inside && document.elementFromPoint(x, y)?.tagName === 'CANVAS' };
  }, lockerId);

const rigPosition = () =>
  page.evaluate(() => {
    const rig = window.__story.rig;
    return [rig.px, rig.py, rig.pz];
  });

await page.goto('http://localhost:3100', { waitUntil: 'networkidle' });
await page.waitForSelector('canvas');
await page.waitForTimeout(3500);
await gotoVault(page);
expect((await state()).stage === 'vault', 'SKIP did not land in the vault');
await page.screenshot({ path: `${OUT}/tour-0-vault.png` });

/* ------------------------------------------------ holds + pointer rule */
let neighboursTried = 0;
for (const [index, stop] of TOUR.entries()) {
  await page.mouse.move(5, 895);
  await scrollInto(stop.id);
  const held = await state();
  expect(
    held.stage === 'tour' && held.tourStop === stop.id && held.tourReady,
    `${stop.code} hold: ${JSON.stringify(held)}`,
  );
  // @card-checks (Task 6)
  await page.screenshot({ path: `${OUT}/tour-${index + 1}-${stop.code}.png` });

  const focus = await screenOf(stop.id);
  expect(focus?.onCanvas, `${stop.code}: drawer in focus is not on screen (${JSON.stringify(focus)})`);
  if (focus?.onCanvas) {
    await page.mouse.move(focus.x, focus.y, { steps: 6 });
    await page.waitForTimeout(300);
    expect((await state()).hovered === stop.id, `${stop.code}: drawer in focus does not answer hover`);
  }

  for (const other of TOUR) {
    if (other.id === stop.id) continue;
    const point = await screenOf(other.id);
    if (!point?.onCanvas) continue;
    neighboursTried += 1;
    await page.mouse.move(point.x, point.y, { steps: 6 });
    await page.waitForTimeout(250);
    const hovered = (await state()).hovered;
    await page.mouse.click(point.x, point.y);
    await page.waitForTimeout(600);
    const after = await state();
    expect(
      hovered === null && after.stage === 'tour' && after.selected === null,
      `${stop.code}: ${other.code} answered the pointer (${JSON.stringify({ hovered, ...after })})`,
    );
  }
}
expect(neighboursTried > 0, 'no neighbouring drawer was on screen to test');

/* ------------------------------------------------ travel: nothing ready */
await page.mouse.move(5, 895);
await scrollInto('Locker_02', 0.15);
const travelling = await state();
expect(
  travelling.stage === 'tour' && travelling.tourStop === 'Locker_02' && !travelling.tourReady,
  `travelling to B-04: ${JSON.stringify(travelling)}`,
);
// @travel-card-check (Task 6)

/* ------------------------------------------------ open from the tour, close back */
await scrollInto('Locker_03');
const before = await state();
const target = await screenOf('Locker_03');
if (!target?.onCanvas) throw new Error(`C-08 not on screen: ${JSON.stringify(target)}`);
await page.mouse.move(target.x, target.y, { steps: 6 });
await page.waitForTimeout(250);
await page.mouse.click(target.x, target.y);
await page.waitForFunction(() => window.__archive.getState().stage === 'locker', null, { timeout: 5000 });
await settle();
await page.screenshot({ path: `${OUT}/tour-open-C-08.png` });
await page.keyboard.press('Escape');
await page.waitForFunction(() => window.__archive.getState().stage === 'tour', null, { timeout: 15000 });
const closedAt = await rigPosition();
await page.waitForTimeout(500);
const settledAt = await rigPosition();
const back = await state();
const drift = Math.hypot(...closedAt.map((value, i) => value - settledAt[i]));
const peek = await page.evaluate(() => window.__story.drawerZ('Locker_03'));
expect(back.tourStop === 'Locker_03' && back.tourReady, `after close: ${JSON.stringify(back)}`);
expect(Math.abs(back.scrollY - before.scrollY) <= 1, `scroll moved on close: ${before.scrollY} → ${back.scrollY}`);
expect(drift < 0.01, `camera moved ${(drift * 100).toFixed(1)} cm after the close`);
expect(Math.abs(peek - 0.06) < 0.002, `C-08 drawer at ${peek} m after close, expected the 0.06 m peek`);

// @card-button-and-index (Task 6)

/* ------------------------------------------------ reverse */
const reverse = [];
for (const stop of [...TOUR].reverse()) {
  await scrollInto(stop.id);
  reverse.push((await state()).stage);
}
for (const [kind, local] of [['vault', 0.5], ['opening', 0.5], ['opening', 0]]) {
  await scrollInto(kind, local);
  reverse.push((await state()).stage);
}
const ranks = reverse.map((stage) => ORDER.indexOf(stage));
expect(
  ranks.every((rank, i) => rank >= 0 && (i === 0 || rank <= ranks[i - 1])) &&
    reverse.at(-1) === 'intro' &&
    reverse.includes('vault'),
  `reverse scroll: ${reverse.join(' → ')}`,
);

/* ------------------------------------------------ continuity (last: moves the scene) */
// Straight through the story maths, without the scrub's smoothing: a jump in
// the function itself is what this looks for.
const continuity = await page.evaluate(() => {
  const { apply, rig, spans } = window.__story;
  const pose = (p) => {
    apply(p);
    return [rig.px, rig.py, rig.pz, rig.tx, rig.ty, rig.tz];
  };
  const gaps = spans()
    .slice(1)
    .map((span) => {
      const before = pose(span.start - 1e-7);
      const after = pose(span.start + 1e-7);
      return { id: span.id, gap: Math.max(...before.map((value, i) => Math.abs(value - after[i]))) };
    });
  const sweep = Array.from({ length: 201 }, (_, i) => pose(i / 200));
  const steps = sweep
    .slice(1)
    .map((next, i) => Math.hypot(next[0] - sweep[i][0], next[1] - sweep[i][1], next[2] - sweep[i][2]));
  return { gaps, steps };
});
const openGaps = continuity.gaps.filter(({ gap }) => gap > 1e-3);
expect(openGaps.length === 0, `camera jumps at a boundary: ${JSON.stringify(openGaps)}`);
const { steps } = continuity;
const spikes = steps
  .map((step, i) => ({ i, step, around: Math.max(steps[i - 1] ?? 0, steps[i + 1] ?? 0) }))
  .filter(({ step, around }) => step > 3 * around + 0.01);
expect(spikes.length === 0, `camera spikes in the sweep: ${JSON.stringify(spikes.slice(0, 5))}`);

await browser.close();
if (errors.length) failures.push(`console errors: ${errors.slice(0, 3).join(' | ')}`);
console.log(
  JSON.stringify(
    {
      neighboursTried,
      reverse,
      closeDriftCm: +(drift * 100).toFixed(2),
      maxBoundaryGap: Math.max(...continuity.gaps.map(({ gap }) => gap)),
      maxStep: +Math.max(...steps).toFixed(3),
    },
    null,
    2,
  ),
);
if (failures.length) {
  console.error(`FAILED\n${failures.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('PASSED: drawer tour');
}
```

`// @...` 주석 세 줄은 Task 6에서 검사 코드로 바꿀 자리다.

- [ ] **Step 2: 실패 확인**

Run: `node tests/tour-flow.mjs`
Expected: 비정상 종료. 투어에서는 아직 서랍이 반응하지 않으므로 `A-01: drawer in focus does not answer hover` 등이 나오고, C-08 클릭 뒤 `stage === 'locker'` 대기가 시간 초과로 멈춘다.

- [ ] **Step 3: 스토어 — 돌아갈 단계와 클릭 규칙 (`archiveStore.ts`)**

`ArchiveState`의 `tourReady` 아래에 추가:

```ts
  /** Where closing a drawer returns to: the stage it was opened from. */
  returnStage: 'vault' | 'tour';
```

`goBack` 주석을 `/** Step back one stage: file -> locker -> vault or tour. Returns the new stage. */`로 바꾼다. 초기값 `tourReady: false,` 아래에 `returnStage: 'vault',`를 넣는다.

`selectLocker`를 다음으로 바꾼다.

```ts
  selectLocker: (id) =>
    set((state) => ({
      stage: 'locker',
      returnStage: state.stage === 'tour' ? 'tour' : 'vault',
      selectedLocker: id,
      selectedFile: null,
      hoveredLocker: null,
      hoveredFile: null,
      isLockerOpen: false,
    })),
```

`goBack`의 `locker` 분기를 다음으로 바꾼다.

```ts
    if (stage === 'locker') {
      const { returnStage } = get();
      set({
        stage: returnStage,
        selectedLocker: null,
        selectedFile: null,
        isLockerOpen: false,
      });
      return returnStage;
    }
```

파일 끝에 추가:

```ts
/**
 * Whether a drawer answers the pointer right now: any live drawer once the
 * vault is open, but in the tour only the one the camera is holding on.
 */
export function canSelectLocker(state: ArchiveState, id: string): boolean {
  if (state.isCameraMoving) return false;
  if (state.stage === 'vault') return state.isVaultOpen;
  if (state.stage === 'tour') return state.tourReady && state.tourStop === id;
  return false;
}
```

- [ ] **Step 4: `Locker.tsx`**

import를 `import { canSelectLocker, useArchiveStore } from '@/store/archiveStore';`로 바꾼다.

```ts
  const interactive = useArchiveStore(
    (s) => s.stage === 'vault' && s.isVaultOpen && !s.isCameraMoving,
  );
```

를 다음으로 바꾼다.

```ts
  const interactive = useArchiveStore((s) => canSelectLocker(s, id));
  /** The tour is holding on this drawer: a faint outline says it opens. */
  const isTourFocus = useArchiveStore(
    (s) => s.stage === 'tour' && s.tourReady && s.tourStop === id,
  );
```

`useFrame` 안의 목표 불투명도 줄을

```ts
    const targetOpacity = isSelected ? 0.6 : highlight ? 0.45 : isTourFocus ? 0.3 : 0;
```

로 바꾼다. `handleClick`의 반동 블록을 다음으로 바꾼다.

```ts
    const drawer = drawerRef.current;
    if (drawer) {
      // From wherever the drawer sits: in the tour it is already peeking out.
      const rest = drawer.position.z;
      gsap.fromTo(
        drawer.position,
        { z: rest },
        {
          z: rest - 0.012,
          duration: 0.1,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
          overwrite: true,
        },
      );
    }
```

- [ ] **Step 5: `GltfCabinet.tsx` (같은 규칙)**

import를 `import { canSelectLocker, useArchiveStore } from '@/store/archiveStore';`로 바꾼다.

```ts
  const interactive = useArchiveStore(
    (s) => s.stage === 'vault' && s.isVaultOpen && !s.isCameraMoving,
  );
```

를 지우고, `lockerIdFor` 함수 바로 아래에 추가:

```ts
  /** The locker under the pointer, if it may be selected right now. */
  const selectableIdFor = (object: Object3D): string | null => {
    const id = lockerIdFor(object);
    return id && canSelectLocker(useArchiveStore.getState(), id) ? id : null;
  };
```

`onPointerOver`와 `onClick` 안의

```ts
        if (!interactive) return;
        const id = lockerIdFor(event.object);
        if (!id) return;
```

를 (두 곳 모두) 다음으로 바꾼다.

```ts
        const id = selectableIdFor(event.object);
        if (!id) return;
```

- [ ] **Step 6: `closeLocker`가 스크롤의 장면으로 돌아가게 (`choreography.ts`)**

import에서 `currentOverviewPose,`를 지우고 `import { storySnapshot } from './storyProgress';`를 추가한다. `closeLocker` 전체를 다음으로 바꾼다.

```ts
/**
 * Files back in, drawer shut, camera back to the scroll's frame.
 *
 * "Back" is wherever the scroll is: the vault overview, or a tour chapter
 * with its drawer peeking out. The targets come from `storySnapshot()` — the
 * same maths the scroll applies the moment it takes over again — so the
 * hand-back has nothing to jump.
 */
export function closeLocker(lockerId: string): Promise<void> {
  const handle = getLockerHandle(lockerId);
  const back = storySnapshot();
  const tl = begin();
  useArchiveStore.getState().setLockerOpen(false);

  const s = speed();

  const tray = getTray();
  if (tray) tl.add(tray.retract(), 0);

  if (handle) {
    tl.to(
      handle.drawer.position,
      { z: back.peeks[lockerId] ?? 0, duration: 0.85 * s, ease: 'power2.inOut' },
      0.34 * s,
    );
    if (handle.interiorLight) {
      tl.to(
        handle.interiorLight,
        { intensity: 0, duration: 0.5 * s, ease: 'power2.out' },
        0.32 * s,
      );
    }
  }

  cameraTo(tl, back.camera, 1.15 * s, 0.4 * s);

  return settle(tl);
}
```

- [ ] **Step 7: 타입·린트·단위**

Run: `npm run typecheck`, `npm run lint`, `npm run test:unit`
Expected: 에러 0, 16 PASS.

- [ ] **Step 8: 통과 확인**

Run: `node tests/tour-flow.mjs`
Expected: `PASSED: drawer tour`, `neighboursTried` ≥ 1, `closeDriftCm` < 1, `maxBoundaryGap` < 0.001.

Run: `node tests/drawer-flow.mjs` (끝 단계 `vault`), `node tests/tab-visibility.mjs` (PASSED), `node tests/scroll-probe.mjs` (PASSED)

- [ ] **Step 9: 체크포인트** — `tour-1-A-01.png` ~ `tour-5-E-15.png`, `tour-open-C-08.png`를 Read로 확인하고 결과를 기록한다.

---

### Task 6: 투어 제목 카드와 HUD

**Files:**
- Modify: `src/lib/classification.ts` (끝에 추가)
- Create: `tests/unit/classification.test.mjs`
- Create: `src/components/ui/TourCard.tsx`, `src/components/ui/TourCard.module.css`
- Modify: `src/components/ui/ArchiveExperience.tsx:10-14,57`
- Modify: `src/components/ui/ArchiveHud.tsx`
- Modify: `src/components/ui/ArchiveHud.module.css` (`.indexItem[data-hovered…]` 규칙 뒤)
- Modify: `tests/tour-flow.mjs` (`// @…` 세 자리)

**Interfaces:**
- Consumes: `tourStop`/`tourReady`/`selectLocker` (스토어), `scrollToChapter` (Task 4), `getLocker`/`LOCKERS` (data)
- Produces: `highestClassification(levels: Iterable<Classification>): Classification | null`, `<TourCard />` (`section[aria-label="Drawer tour"]`, `data-visible`)

- [ ] **Step 1: 실패하는 단위 테스트**

`tests/unit/classification.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highestClassification } from '../../src/lib/classification.ts';

test('highestClassification picks the most sensitive level', () => {
  assert.equal(highestClassification(['CONFIDENTIAL', 'TOP SECRET', 'SECRET']), 'TOP SECRET');
  assert.equal(highestClassification(['RESTRICTED', 'SECRET', 'CONFIDENTIAL']), 'SECRET');
  assert.equal(highestClassification(['RESTRICTED']), 'RESTRICTED');
  assert.equal(highestClassification([]), null);
});
```

Run: `npm run test:unit` → Expected: 이 테스트 FAIL(`highestClassification` is not a function 또는 export 없음).

- [ ] **Step 2: `highestClassification` (`classification.ts` 끝에 추가)**

```ts
/** The most sensitive level among `levels`, or null when there are none. */
export function highestClassification(levels: Iterable<Classification>): Classification | null {
  let highest: Classification | null = null;
  for (const level of levels) {
    if (!highest || STYLES[level].weight > STYLES[highest].weight) highest = level;
  }
  return highest;
}
```

Run: `npm run test:unit` → Expected: 17 PASS.

- [ ] **Step 3: 브라우저 테스트에 카드·색인 검사 추가 (`tour-flow.mjs`)**

`// @card-checks (Task 6)` 줄을 다음으로 바꾼다.

```js
  const card = await page.evaluate(
    () => document.querySelector('section[aria-label="Drawer tour"]')?.innerText ?? '',
  );
  expect(
    card.includes(stop.code) && card.includes(stop.label) && card.includes(`${stop.files} DOSSIERS`),
    `${stop.code}: card reads "${card.replace(/\s+/g, ' ')}"`,
  );
  const status = await page.evaluate(() => document.querySelector('[role="status"]')?.innerText ?? '');
  expect(status.includes(`${index + 1} OF 5`), `${stop.code}: status reads "${status}"`);
```

`// @travel-card-check (Task 6)` 줄을 다음으로 바꾼다.

```js
const travelCard = await page.evaluate(
  () => document.querySelector('section[aria-label="Drawer tour"]')?.dataset.visible ?? 'missing',
);
expect(travelCard === 'false', `tour card while travelling: data-visible=${travelCard}`);
```

`// @card-button-and-index (Task 6)` 줄을 다음으로 바꾼다.

```js
/* ------------------------------------------------ the card's OPEN DRAWER button */
await page.mouse.move(5, 895);
await scrollInto('Locker_04');
const openButton = page.locator('section[aria-label="Drawer tour"] button:has-text("OPEN DRAWER")');
if ((await openButton.count()) === 0) {
  failures.push('no OPEN DRAWER button on the tour card');
} else {
  await openButton.click();
  await page.waitForFunction(
    () => {
      const s = window.__archive.getState();
      return s.stage === 'locker' && s.selectedLocker === 'Locker_04';
    },
    null,
    { timeout: 5000 },
  );
  await settle();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.__archive.getState().stage === 'tour', null, { timeout: 15000 });
  await settle();
}

/* ------------------------------------------------ the index, in the tour, navigates */
await scrollInto('Locker_01');
const indexShown = await page.getAttribute('nav[aria-label="Compartment index"]', 'data-visible');
if (indexShown !== 'true') {
  failures.push(`compartment index hidden in the tour (data-visible=${indexShown})`);
} else {
  await page.click('nav[aria-label="Compartment index"] button:has-text("B-04")');
  await waitForScrollRest(page);
  const indexed = await state();
  const current = await page.evaluate(
    () =>
      document.querySelector('nav[aria-label="Compartment index"] button[data-current="true"]')?.innerText ?? '',
  );
  expect(
    indexed.stage === 'tour' &&
      indexed.tourStop === 'Locker_02' &&
      indexed.tourReady &&
      indexed.selected === null &&
      current.includes('B-04'),
    `index in the tour: ${JSON.stringify(indexed)}, current "${current}"`,
  );
}
```

- [ ] **Step 4: 실패 확인**

Run: `node tests/tour-flow.mjs`
Expected: FAIL. `card reads ""`, `status reads "DRAWER TOUR"`, `tour card while travelling: data-visible=missing`, `no OPEN DRAWER button`, `compartment index hidden in the tour`.

- [ ] **Step 5: `TourCard.tsx`**

```tsx
'use client';

import { useState, type CSSProperties } from 'react';
import { getLocker } from '@/data/archive';
import { classificationColor, highestClassification } from '@/lib/classification';
import { useArchiveStore } from '@/store/archiveStore';
import styles from './TourCard.module.css';

/**
 * The drawer tour's title card.
 *
 * Names the drawer the camera is holding on and offers the keyboard way into
 * it. Mounted always and switched with `data-visible` + `inert`, like the HUD
 * indexes, so it fades rather than pops. The drawer shown only changes while
 * the card is up, so the text never swaps under a fade-out.
 *
 * Sits over the left of the frame, which the tour camera leaves empty for it
 * (`tourCardCoverage` in cameraRig.ts).
 */
export function TourCard() {
  const stage = useArchiveStore((s) => s.stage);
  const tourStop = useArchiveStore((s) => s.tourStop);
  const tourReady = useArchiveStore((s) => s.tourReady);
  const isCameraMoving = useArchiveStore((s) => s.isCameraMoving);
  const selectLocker = useArchiveStore((s) => s.selectLocker);

  const holding = stage === 'tour' && tourReady;
  const [shownId, setShownId] = useState<string | null>(null);
  if (holding && tourStop !== shownId) setShownId(tourStop);

  const locker = getLocker(shownId);
  const visible = holding && Boolean(locker);
  const top = locker
    ? highestClassification(locker.files.map((file) => file.classification))
    : null;

  return (
    <section
      className={styles.root}
      data-visible={visible}
      aria-label="Drawer tour"
      inert={visible ? undefined : true}
    >
      {locker && (
        <>
          <div aria-live="polite">
            <p className={styles.code}>{locker.code}</p>
            <p className={styles.label}>{locker.label}</p>
          </div>
          <p className={styles.meta}>
            {locker.status} · {locker.files.length} DOSSIERS
          </p>
          {top && (
            <p
              className={styles.stamp}
              style={{ '--stamp': classificationColor(top) } as CSSProperties}
            >
              {top}
            </p>
          )}
          <button
            type="button"
            className={styles.open}
            disabled={!visible || isCameraMoving}
            onClick={() => selectLocker(locker.id)}
          >
            OPEN DRAWER
          </button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 6: `TourCard.module.css`**

```css
/*
 * The drawer tour's title card.
 *
 * Left of the frame, below the HUD readout and clear above the compartment
 * index. The tour camera leaves the left 40% of the screen for it — that share
 * is `tourCardCoverage()` in cameraRig.ts, and the two must agree.
 */
.root {
  position: fixed;
  z-index: 30;
  top: clamp(110px, 20vh, 200px);
  left: var(--hud-pad);
  width: min(320px, 30vw);
  padding: 18px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: linear-gradient(
    90deg,
    rgba(6, 7, 8, 0.82),
    rgba(6, 7, 8, 0.5) 75%,
    rgba(6, 7, 8, 0)
  );
  border-left: 1px solid var(--line-strong);
  pointer-events: none;
  opacity: 0;
  transform: translateX(-12px);
  transition: opacity var(--dur-panel) var(--ease-out),
    transform var(--dur-panel) var(--ease-out);
}

.root[data-visible='true'] {
  opacity: 1;
  transform: translateX(0);
  pointer-events: auto;
}

.code {
  margin: 0;
  font-size: 40px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.08em;
  color: var(--amber);
}

.label {
  margin: 8px 0 0;
  font-size: 11px;
  letter-spacing: 0.26em;
  color: var(--ink);
}

.meta {
  margin: 0;
  font-size: 9.5px;
  letter-spacing: 0.24em;
  color: var(--ink-dim);
}

.stamp {
  align-self: flex-start;
  margin: 6px 0 4px;
  padding: 5px 9px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.28em;
  color: var(--stamp);
  border: 1.5px solid var(--stamp);
  transform: rotate(-2deg);
}

.open {
  align-self: flex-start;
  margin-top: 6px;
  padding: 9px 16px;
  font-size: 10px;
  letter-spacing: 0.26em;
  color: var(--ink);
  border: 1px solid var(--line-strong);
  transition: color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out);
}

.open:disabled {
  opacity: 0.4;
  cursor: default;
}

@media (hover: hover) and (pointer: fine) {
  .open:hover:not(:disabled) {
    color: var(--amber);
    border-color: var(--amber);
  }
}

@media (pointer: coarse) {
  .open {
    min-height: 44px;
  }
}

/* Phones: across the top under the readout; the drawer is centred below. */
@media (max-width: 767px) {
  .root {
    top: 96px;
    right: var(--hud-pad);
    width: auto;
    padding: 12px 14px;
    gap: 6px;
  }

  .code {
    font-size: 28px;
  }
}

/* Reduced motion: keep the fade, drop the travel. */
@media (prefers-reduced-motion: reduce) {
  .root,
  .root[data-visible='true'] {
    transform: none;
  }

  .root {
    transition: opacity var(--dur-fast) var(--ease-out);
  }
}
```

- [ ] **Step 7: 카드 마운트 (`ArchiveExperience.tsx`)**

import에 `import { TourCard } from './TourCard';`를 추가하고, `<ArchiveHud />` 다음 줄에 `<TourCard />`를 넣는다.

- [ ] **Step 8: HUD (`ArchiveHud.tsx`)**

import에 `import { scrollToChapter } from './ScrollIntro';`를 추가한다. 컴포넌트 설명 주석 끝에 다음 문단을 붙인다.

```ts
 *
 * In the tour the index navigates instead of opening: a row scrolls to that
 * drawer's chapter, and the tour card's button is what opens it.
```

훅 목록에 `const tourStop = useArchiveStore((s) => s.tourStop);`를 추가하고,

```ts
  const canSelect = stage === 'vault' && !isCameraMoving;
```

를 다음으로 바꾼다.

```ts
  const inTour = stage === 'tour';
  const showIndex = stage === 'vault' || inTour;
  const canSelect = showIndex && !isCameraMoving;
  const tourNumber = LOCKERS.findIndex((entry) => entry.id === tourStop) + 1;
  const status = locker
    ? `${locker.code} · ${locker.label}`
    : inTour && tourNumber > 0
      ? `DRAWER TOUR — ${tourNumber} OF ${LOCKERS.length}`
      : STATUS_BY_STAGE[stage];
```

상태 줄의 `{locker ? `${locker.code} · ${locker.label}` : STATUS_BY_STAGE[stage]}`를 `{status}`로 바꾼다.

Compartment index `nav`의 두 속성을

```tsx
        data-visible={showIndex}
        aria-label="Compartment index"
        inert={showIndex ? undefined : true}
```

로 바꾸고, 그 안 `button`의 `data-hovered` 다음에 두 속성을 추가하며 `onClick`을 바꾼다.

```tsx
                data-current={inTour && tourStop === entry.id}
                aria-current={inTour && tourStop === entry.id ? 'true' : undefined}
                disabled={!canSelect}
                onClick={() => (inTour ? scrollToChapter(entry.id) : selectLocker(entry.id))}
```

(`disabled={!canSelect}`는 원래 있던 줄이다. 중복되지 않게 한 번만 둔다.)

footer의 `SELECT A DOSSIER` 문단 다음에 추가:

```tsx
        <p className={styles.hint} data-visible={inTour}>
          OPEN THE DRAWER · SCROLL TO CONTINUE
        </p>
```

- [ ] **Step 9: 현재 항목 표시 (`ArchiveHud.module.css`)**

`.indexItem[data-hovered='true']:not(:disabled) { … }` 규칙 바로 뒤에 추가:

```css
/* The drawer the tour is holding on. */
.indexItem[data-current='true'] {
  background: rgba(255, 178, 87, 0.12);
  color: var(--ink);
  box-shadow: inset 2px 0 0 var(--amber);
}
```

- [ ] **Step 10: 타입·린트·단위**

Run: `npm run typecheck`, `npm run lint`, `npm run test:unit`
Expected: 에러 0, 17 PASS.

- [ ] **Step 11: 통과 확인**

Run: `node tests/tour-flow.mjs` → `PASSED: drawer tour`
Run: `node tests/scroll-probe.mjs` → `PASSED`. 끝 지점 `overlaps.boxes.tourCard`가 `visible: true`이고 겹치는 쌍이 없다.

- [ ] **Step 12: 체크포인트** — `tour-1-A-01.png` ~ `tour-5-E-15.png`, `phone-tour-end.png`를 Read로 확인한다. 카드가 서랍을 가리지 않는지(데스크톱), 휴대폰에서 깨지지 않는지 본다.

---

### Task 7: 전체 검증, 빌드, 보고

**Files:**
- Modify: `docs/superpowers/specs/2026-09-22-scroll-chapters-design.md:4` (상태 줄)

- [ ] **Step 1: 정적 검사**

Run: `npm run typecheck`, `npm run lint`, `npm run test:unit`
Expected: 에러 0, 17 PASS.

- [ ] **Step 2: 브라우저 테스트 전부**

Run (각각):
- `node tests/scroll-probe.mjs` → PASSED
- `node tests/tour-flow.mjs` → PASSED
- `node tests/drawer-flow.mjs` → 마지막 `stage: vault`, errors 없음
- `node tests/tab-visibility.mjs` → PASSED
- `node tests/material-shots.mjs --prefix=stage2 --check=textures,offline,errors,geometry,environment,tonemap,opaqueCards` → PASSED
- `node tests/texture-fallback.mjs` → PASSED

- [ ] **Step 3: 캡처 확인**

Read로 연다: `desktop-vault.png`, `tour-0-vault.png`, `tour-1-A-01.png` ~ `tour-5-E-15.png`, `tour-open-C-08.png`, `phone-tour-end.png`, `laptop-tour-end.png`.
확인할 것: 서랍이 카드 오른쪽 영역 가운데쯤에 있다, 비추는 서랍에 테두리가 있다, 서랍이 살짝 나와 있다, 가장자리 문이 화면을 막지 않는다, 휴대폰이 깨지지 않는다.

- [ ] **Step 4: 프로덕션 빌드**

`preview_stop`으로 dev 서버를 멈춘 뒤 `npm run build` → Expected: 성공. 끝나면 `preview_start {name: "archive"}`로 다시 띄운다.

- [ ] **Step 5: 스펙 상태 갱신**

`- 상태: 사용자 검토 대기`를 `- 상태: 구현 완료 (2026-09-22)`로 바꾼다.

- [ ] **Step 6: 사용자에게 한국어로 보고**

포함할 것: 무엇이 바뀌었는지, 테스트 결과(숫자), 캡처 몇 장, "스펙과 달라지는 점" 요약, 남은 문제. 브라우저 창에서 직접 스크롤해 보도록 권한다.

---

## Self-Review (작성자 점검 결과)

**스펙 대비 누락 점검**

| 스펙 항목 | 태스크 |
| --- | --- |
| 3.1 챕터 표, API, 길이 합계 | Task 1 |
| 3.2 opening=기존 함수, vault push-in 3%, tour 이동·머무름·push-in 4%, peek, `lastProgress`/`storySnapshot` | Task 4 (peek 수학은 Task 1) |
| 3.3 `tourCameraPose` (1.7×1.1, 10°, 25%, 왼쪽 이동) | Task 3 |
| 3.4 `tour` 단계, `tourStop`/`tourReady`, `setTour` | Task 4 |
| 3.4 `returnStage`, `selectLocker`, `goBack` | Task 5 |
| 3.4 `isVaultOpen`은 vault·tour에서 true | Task 4 (ScrollIntro `apply`) |
| 3.5 클릭 조건, 투어 테두리 0.3, 닫기 복귀(카메라·서랍) | Task 5 |
| 3.6 색인(vault 열기 / tour 이동 local 0.6, 현재 항목 강조), SKIP → vault local 0.5 | Task 4(`skipIntro`, `scrollToChapter`), Task 6(색인 UI) |
| 3.7 투어 카드(위치, 내용, 버튼, 모션 토큰, reduced motion, aria-live) | Task 6 |
| 3.8 상태 줄, 안내 문구 | Task 6 |
| 3.9 트랙 높이, `applyStoryProgress` 호출, 1단계의 rAF 적용·`enable(false)` 유지 | Task 4 |
| 7.1 단위 테스트 | Task 1, Task 6 |
| 7.2 tour-flow (5개 머무름, 클릭 규칙, 열기·닫기 복귀, 색인, 카드 버튼, SKIP, 역행, 경계 연속성) | Task 5, Task 6 |
| 7.3 기존 테스트 전부 | Task 2, 4, 5, 7 |
| 7.4 tsc·lint·단위·빌드 | 모든 태스크, Task 7 |
| 7.5 캡처 | Task 4, 5, 6, 7 |

**자리 표시자 점검**: "TBD/TODO/나중에" 없음. `// @…` 주석 세 줄은 Task 6 Step 3에서 교체할 코드를 전부 적어 두었다.

**이름 일관성**: `tourStop`/`tourReady`/`setTour`/`returnStage`/`canSelectLocker`/`storySnapshot`/`applyStoryProgress`/`setStoryLayout`/`getSpans`/`scrollToChapter`/`skipIntro`/`tourCameraPose`/`tourShot`/`tourCardCoverage`/`introCameraPose`/`drawerPeek`/`highestClassification`이 정의한 태스크와 쓰는 태스크에서 같은 이름·시그니처다. 테스트 선택자 `section[aria-label="Drawer tour"]`, `nav[aria-label="Compartment index"]`, `button[data-current="true"]`, `[role="status"]`가 컴포넌트 코드와 일치한다.
