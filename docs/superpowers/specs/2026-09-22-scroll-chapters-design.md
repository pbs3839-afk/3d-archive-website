# 스크롤 챕터 골격 + 서랍 투어 (2단계) 설계

- 작성일: 2026-09-22
- 상태: 사용자 검토 대기
- 상위 로드맵
  1. 재질 현실감 (완료)
  2. **스크롤 챕터 골격 + 서랍 투어** ← 이 문서. 원래 3단계였던 서랍 투어를 사용자 결정으로 앞당겼다.
  3. 기밀 해제 섹션 · 아웃트로
  4. 캐비닛 열기 강화
  5. 프롤로그

## 1. 목적

금고가 열리면 스크롤이 끝나서, 사이트가 심심하게 느껴진다. 스크롤 하나로 된 인트로를 **챕터가 이어지는 구조**로 바꾸고, 첫 새 챕터로 **서랍 5개를 하나씩 둘러보는 투어**를 넣는다. 3~5단계의 새 구간도 같은 구조 위에 챕터로 추가한다.

### 성공 기준

- 기존 인트로(타이틀 → 접근 → 문 열림)는 **보이는 모습과 스크롤 속도감이 지금과 같다.**
- 금고가 열린 뒤에도 스크롤이 이어진다: 금고 전경 → A-01 → B-04 → C-08 → D-11 → E-15.
- 투어 챕터의 머무름 구간에서는 **비추는 서랍 1개만** 클릭된다(사용자 결정 1번).
- 투어 중 서랍을 열고 닫으면 **같은 챕터, 같은 스크롤 위치**로 돌아온다. 카메라와 서랍이 순간이동하지 않는다.
- 위로 스크롤하면 모든 챕터가 거꾸로 진행된다.
- 기존 테스트가 모두 통과한다(금고로 가는 방법만 SKIP으로 바뀜).

### 범위 밖

- 기밀 해제 섹션, 아웃트로(3단계). 페이지는 E-15 챕터에서 끝난다.
- 모바일 최적화. 휴대폰에서 opening 길이(1.8화면)만 지금대로 유지하고, 투어 카드 배치는 데스크톱 기준이다.
- 캐비닛 모델·재질 변경.

## 2. 현재 구조 (바꿀 부분)

| 항목 | 지금 | 문제 |
| --- | --- | --- |
| 스크롤 | 400vh 트랙(휴대폰 280vh) 하나, ScrollTrigger 1개, p 0→1 | 금고(p ≥ 0.97)에서 끝남 |
| 장면 | `introTimeline.applyIntroProgress(p)`: 카메라·조명·문을 p의 순수 함수로 설정 | 챕터 개념이 없음 |
| 단계 | `intro / approach / vault / locker / file` | 투어 단계가 없음 |
| 서랍 클릭 | `stage === 'vault'`일 때 전부 | 투어 규칙 없음 |
| 서랍 닫기 | 카메라는 항상 `vault` 시점으로, 단계는 항상 `vault`로 | 투어 중에 닫으면 틀린 곳으로 돌아감 |
| 색인 | `vault`에서만 보임, 누르면 바로 열림 | 투어에서 쓸 수 없음 |
| SKIP | 트리거 끝(p = 1)으로 스크롤 | 끝이 이제 E-15임 |

## 3. 설계

### 3.1 챕터 표: `src/lib/chapters.ts` (새 파일, 순수 함수)

길이 단위는 **화면 높이(1.0 = 100vh 스크롤)**다.

| id | 종류 | 길이 (데스크톱 / 휴대폰 <768px) |
| --- | --- | --- |
| `opening` | opening | 3.0 / 1.8 |
| `vault` | vault | 0.6 / 0.6 |
| `tour-Locker_01` … `tour-Locker_05` | tour | 각 1.0 / 1.0 |

- **합계**: 데스크톱 8.6화면, 휴대폰 7.4화면. 트랙 높이 = (합계 + 1) × 100vh.
- 투어 순서는 `LOCKERS` 배열 순서(A-01, B-04, C-08, D-11, E-15)다.
- opening의 3.0 / 1.8은 지금 트랙의 스크롤 거리(400vh − 100vh, 280vh − 100vh)와 같다. **기존 인트로의 속도감을 그대로 유지하는 근거**다.

**API**

```ts
type ChapterKind = 'opening' | 'vault' | 'tour';
interface Chapter { id: string; kind: ChapterKind; length: number; lockerId?: string }
interface ChapterSpan extends Chapter { start: number; end: number } // 전체 p 기준 0~1

buildChapters(narrow: boolean): ChapterSpan[]
locate(spans, p): { span: ChapterSpan; index: number; local: number }  // local: 0~1
totalLength(spans): number
/** 투어 챕터 local에서 머무름 구간인가 (local >= TOUR_ARRIVE) */
TOUR_ARRIVE = 0.35
/** 챕터 안의 특정 local 지점이 전체 p로 어디인가 (스크롤 이동 목표 계산용) */
progressAt(span, local): number
```

### 3.2 장면 함수: `src/lib/storyProgress.ts` (새 파일)

`applyStoryProgress(p)`가 지금의 `applyIntroProgress(p)`를 대체한다.

- **opening**: `applyIntroProgress(local)`을 **그대로 호출**한다(기존 함수는 수정하지 않는다). 단계 = `stageForProgress(local)`(기존 함수).
- **vault**:
  - 조명·환경 반사·문은 `applyIntroProgress(1)`로 "완전히 켜지고 열린" 상태로 둔다.
  - 카메라는 `vault` 시점에서 챕터 동안 거리를 3%만 천천히 좁힌다. 멈춘 화면처럼 보이지 않게 하기 위해서다.
  - 단계 = `vault`.
- **tour**:
  - 조명·문은 vault와 같다.
  - 카메라
    - local 0 ~ `TOUR_ARRIVE`: **이전 역**(금고 전경의 마지막 시점, 또는 앞 서랍의 투어 시점)에서 **이 서랍의 투어 시점**으로 이동한다(smoothstep).
    - 그 이후(머무름): 투어 시점에서 거리를 4% 천천히 좁힌다.
  - 서랍 살짝 빼기(peek)
    - 이 챕터 local 0.35~0.5에서 0 → 0.06m로 나오고, 챕터 끝까지 유지한다.
    - **다음 챕터의 이동 구간**(그 챕터 local 0~0.35)에서 0.06m → 0으로 들어간다.
    - 마지막 챕터(E-15)는 끝까지 나와 있다.
  - 단계 = `tour`, `tourStop` = 이 챕터의 서랍 id(이동 구간 포함), `tourReady` = 머무름 구간인지(local ≥ `TOUR_ARRIVE`).
- 모듈 상태로 **마지막 적용 진행도**(`lastProgress`)를 기억하고, `storySnapshot(p?)`로 그 지점의 **카메라 자세 + 서랍별 peek 값**을 돌려준다. 서랍 닫기 복귀(3.5)에 쓴다.
- 서랍 peek는 `lockerRegistry`의 drawer 객체 `position.z`에 쓴다. 단계가 `locker`/`file`일 때는 쓰지 않는다. 기존 `apply()`가 그 단계에서 아예 빠져나가므로, 연 서랍 애니메이션과 충돌하지 않는다.

### 3.3 투어 카메라: `lockerRegistry.ts`에 `tourCameraPose(lockerId)` 추가

- 서랍 앞면(0.91 × 0.69m)을 중심으로 가로 1.7m × 세로 1.1m 틀을 잡는다. `fitDistance`, 현재 화면 비율 기준이다.
- 방향: 서랍 정면 법선에 위쪽 10°를 섞는다. 가장자리 열(0, 2)은 카메라를 캐비닛 중앙 쪽으로 25% 끌어와 살짝 비스듬히 본다(지금 서랍 시점과 같은 방식).
- **제목 카드가 왼쪽 화면을 덮으므로**, 카메라와 타깃을 함께 왼쪽으로 옮긴다. 서랍이 화면 오른쪽 60% 영역의 가운데에 오게 하는 것이다. 지금 서류 패널에 쓰는 `panelAwareShot`과 같은 원리다.
- 비율이 바뀌면 다음 apply에서 다시 계산된다(기존 intro 포즈와 같은 방식).

### 3.4 단계와 스토어: `archiveStore.ts` 수정

- `Stage`에 `'tour'`를 추가한다. 순서: `intro → approach → vault → tour → (locker → file)`
- 상태 추가
  - `tourStop: string | null`: 현재 투어 챕터의 서랍. 이동 구간에서도 값이 있고, 투어 밖에서는 null이다. 상태 표시(n OF 5)에 쓴다.
  - `tourReady: boolean`: 머무름 구간인지. 클릭 허용과 카드 표시에 쓴다.
  - `returnStage: 'vault' | 'tour'`: 서랍을 열 때의 단계
- `selectLocker`: `returnStage`에 현재 단계를 저장한다(`vault` 또는 `tour`).
- `goBack`(locker → ?): `vault`로 고정하지 않고 `returnStage`로 돌아간다.
- `setTour(stop: string | null, ready: boolean)` 추가. 값이 같으면 set하지 않는다. 스크롤마다 리렌더가 일어나지 않게 하기 위해서다.
- `isVaultOpen`은 `vault`와 `tour`에서 모두 true다.

### 3.5 클릭 규칙과 닫기 복귀

**클릭 가능 조건**: `Locker.tsx`의 `interactive`

```
!isCameraMoving && (
  (stage === 'vault' && isVaultOpen) ||
  (stage === 'tour' && tourReady && tourStop === id)
)
```

- 투어 머무름에서 비추는 서랍은 선택 테두리를 **0.3 불투명도로 계속** 켠다. 클릭할 수 있다는 표시다. hover하면 기존대로 0.45로 올라간다.
- 투어 이동 중(`tourReady` false)에는 아무 서랍도 클릭되지 않는다.

**닫기 복귀**: `choreography.closeLocker` 수정

- 카메라 목표: `currentOverviewPose('vault')` 대신 `storySnapshot()`의 카메라 자세(= 현재 스크롤 위치에서 보여야 할 장면).
- 서랍 목표: `z = 0` 대신 `storySnapshot()`의 그 서랍 peek 값(투어 머무름이면 0.06).
- `useBack`이 애니메이션이 끝난 뒤 `goBack()`을 호출하면 단계는 `returnStage`로 돌아간다. 이어서 스크롤이 다시 켜지고, 다음 프레임의 apply가 같은 값을 쓰므로 순간이동이 없다.

### 3.6 색인과 SKIP

- 색인(`ArchiveHud`)은 `vault`와 `tour`에서 보인다.
  - `vault`: 누르면 **그 서랍을 바로 연다**(지금과 같음).
  - `tour`: 지금 비추는 서랍 항목은 강조한다. 다른 항목을 누르면 **그 서랍 챕터의 머무름 지점(local 0.6)으로 부드럽게 스크롤**한다(`window.scrollTo({ behavior: 'smooth' })`, 열지는 않음).
- 스크롤 목표 계산: `scrollTargetFor(progress)` = 트리거 start + progress × (end − start). `ScrollIntro.tsx`에 두고, 기존 `skipIntro()` 옆에 `scrollToChapter(lockerId)`로 export한다.
- **SKIP TO VAULT**(`skipIntro`): 트리거 끝이 아니라 `vault` 챕터 local 0.5 지점으로 스크롤한다.

### 3.7 투어 제목 카드: `src/components/ui/TourCard.tsx` + `.module.css` (새 파일)

- 보이는 조건: `stage === 'tour' && tourReady`. 기존 HUD처럼 항상 마운트하고, `data-visible`과 `inert`로 전환한다. 내용은 `tourStop`의 서랍이다.
- 위치: 화면 왼쪽, 세로 중앙보다 약간 위. 아래쪽 색인과 겹치지 않게 한다.
- 내용(기존 데이터에서 만듦)
  - `A-01` (크게)
  - `NORTHERN DIRECTORATE`
  - `ACTIVE · 3 DOSSIERS`
  - 최고 등급 도장. 서랍 안 서류들의 분류 중 가장 높은 것이며, `classification.ts`의 등급 순서를 쓴다.
  - **[OPEN DRAWER] 버튼**: `selectLocker(tourStop)`. 키보드로 서랍을 여는 경로다.
- 전환: 기존 모션 토큰(`--dur-*`, `--ease-*`)을 쓴다. reduced motion에서는 페이드만 한다.
- 스크린리더: 코드·이름 줄을 `aria-live="polite"`로 둔다. 챕터가 바뀌면 읽어 준다.

### 3.8 그 밖의 HUD

- 상태 줄(`tour`) = `DRAWER TOUR — n OF 5` (n = `tourStop`의 순번, 이동 구간에서도 표시).
- 하단 안내 문구: `tour`에서 `OPEN THE DRAWER · SCROLL TO CONTINUE`.

### 3.9 트랙 길이: `ScrollIntro.tsx`, `ArchiveExperience.module.css` 수정

- CSS의 고정 높이(400vh / 280vh)를 지운다. `ScrollIntro`가 `buildChapters(narrow)`의 합계로 트랙 높이를 인라인 스타일로 정한다.
- `narrow`(<768px)가 바뀌면 높이를 다시 정한다. 기존 ResizeObserver가 높이 변화를 감지해 `ScrollTrigger.refresh()`를 부른다.
- `apply()`는 `applyIntroProgress(p)` + `stageForProgress(p)` 대신 `applyStoryProgress(p)`를 부른다. 이 함수가 단계·`tourStop`·`tourReady`·`isVaultOpen`을 결정한다. 1단계에서 넣은 "프레임당 한 번 적용"과 `enable(false)`는 그대로 둔다.

## 4. 데이터 흐름

```
스크롤 → ScrollTrigger(1개, scrub 0.65) → proxy.p
  → (다음 프레임) applyStoryProgress(p)
       ├─ chapters.locate(p) → 챕터 · local
       ├─ 장면: 카메라 rig · 조명 · 환경 · 문 · 서랍 peek
       └─ 스토어: stage · tourStop · tourReady · isVaultOpen
  → Locker(클릭 규칙·테두리), ArchiveHud(색인·상태), TourCard(카드)

서랍 클릭 → selectLocker(returnStage 저장) → openLocker (스크롤 잠금)
ESC → closeLocker(목표 = storySnapshot) → goBack(returnStage) → 스크롤 해제
```

## 5. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 기존 인트로 느낌이 바뀜 | opening = 기존 함수 그대로, 길이도 기존 스크롤 거리와 같음. 스크롤 프로브로 기존 구간의 단계 순서를 확인 |
| 챕터 경계에서 카메라가 튐 | 각 투어 챕터는 "이전 역"의 끝 자세에서 출발한다. 테스트로 스크롤을 잘게 나눠 카메라 위치 변화량의 최대값을 잰다 |
| 닫은 뒤 순간이동 | 3.5의 스냅샷 복귀. 닫기 직후와 다음 프레임의 카메라·서랍 위치 차이를 잰다 |
| 기존 테스트가 "맨 아래 = 금고"를 가정 | `tests/browser.mjs`에 `gotoVault(page)`(SKIP 버튼 → `vault` 대기)를 추가하고, material-shots·tab-visibility·drawer-flow·texture-fallback을 바꾼다. scroll-probe의 순서 검사에 `tour`를 추가 |
| 부드러운 스크롤 도중 챕터를 지나치며 서랍이 잠깐씩 빠졌다 들어감 | 의도된 동작(스크롤이 장면을 그대로 반영). 과하면 3단계에서 조정 |
| 휴대폰에서 카드가 서랍을 가림 | 범위 밖(모바일 비우선). 깨지지 않는지만 캡처로 확인 |

## 6. 파일 변경 요약

- **새 파일**
  - `src/lib/chapters.ts`, `src/lib/storyProgress.ts`
  - `src/components/ui/TourCard.tsx`, `TourCard.module.css`
  - `tests/unit/chapters.test.mjs`, `tests/tour-flow.mjs`
- **수정**
  - `src/store/archiveStore.ts` (`tour`, `tourStop`, `tourReady`, `returnStage`)
  - `src/lib/lockerRegistry.ts` (`tourCameraPose`)
  - `src/lib/choreography.ts` (`closeLocker` 복귀 목표)
  - `src/components/ui/ScrollIntro.tsx` (챕터 적용, 트랙 높이, `scrollToChapter`, `skipIntro`)
  - `src/components/ui/ArchiveHud.tsx` (색인 동작, 상태·안내 문구)
  - `src/components/ui/ArchiveExperience.tsx` (`TourCard` 마운트), `ArchiveExperience.module.css` (고정 높이 삭제)
  - `src/components/canvas/Locker.tsx` (클릭 조건, 투어 테두리)
  - `tests/browser.mjs` (`gotoVault`), 기존 테스트 5개
- **변경 없음**: `introTimeline.ts`(opening 챕터가 그대로 호출), 재질, 서랍 안·서류 동작, `FileTray`, 1단계 결과물

## 7. 검증

1. 단위 테스트: `chapters.ts`의 `locate`·`progressAt`·길이 합계·경계값(0, 1, 챕터 경계)·휴대폰 길이
2. `tests/tour-flow.mjs` (GPU 헤드리스, 실제 스크롤·마우스·키보드)
   - 챕터 5개 머무름 지점 각각: `stage === 'tour'`, `tourStop`·`tourReady`가 맞는지, 카드 텍스트가 맞는지
   - 비추는 서랍만 hover·클릭에 반응하는지. 옆 서랍 위치를 클릭해도 열리지 않아야 한다
   - 투어 중 열기 → ESC → 같은 `scrollY`, 같은 `tourStop`, 단계 `tour`. 닫기 직후와 0.5초 뒤의 카메라 위치 차이 < 1cm
   - 색인 클릭(투어) → 해당 챕터로 이동, 열리지 않음 / 카드의 [OPEN DRAWER] → 열림
   - SKIP → `vault`. 위로 스크롤 → `vault` → `intro` 순으로 역행
   - 경계 연속성: 전체 트랙을 200단계로 나눠 스크롤하며 카메라 위치의 단계 간 최대 변화량을 기록한다. 이동 구간 평균의 3배를 넘는 튐이 없어야 한다
3. 기존 테스트 전부: scroll-probe(`intro → approach → vault → tour` 정방향, 겹침 0, 에러 0), drawer-flow, tab-visibility, material-shots(7개 점검), texture-fallback
4. tsc, lint, 단위 테스트, 프로덕션 빌드(dev 서버를 멈춘 뒤)
5. 캡처: 금고 전경, 투어 챕터 5개, 투어 중 연 서랍, 휴대폰 투어 1장
