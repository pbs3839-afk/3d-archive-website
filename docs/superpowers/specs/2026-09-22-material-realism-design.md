# 재질 현실감 (1단계) 설계

- 작성일: 2026-09-22
- 상태: 사용자 검토 대기
- 상위 로드맵: 5단계 중 1단계
  1. **재질 현실감** ← 이 문서
  2. 스크롤 챕터 골격
  3. 금고가 열린 뒤 (서랍 투어 · 기밀 해제 섹션 · 아웃트로)
  4. 캐비닛 열기 강화 (다이얼 · 빗장 · 형광등 순차 점등 · 캐비닛 주위를 도는 카메라)
  5. 프롤로그 (지하 하강 · 보안 검문)

## 1. 목적

"텍스처가 너무 매끈해서 와닿지 않는다"는 피드백을 해결한다. 캐비닛은 **수십 년 쓴 정부 시설의 현역 강철 캐비닛**으로 보여야 한다. 분체 도장에 잔긁힘이 있고, 모서리는 벗겨져 맨 금속이 비치고, 아래쪽엔 얼룩이 있다. 방치된 폐허처럼 보여서는 안 된다.

### 성공 기준

- 금고 전경, 서랍 안, 서류 확대, 세 구도의 전후 캡처에서 표면 요철·긁힘·모서리 마모·틈새 그림자가 눈에 보인다.
- 지금 팔레트(올리브그레이 강철, 앰버 램프)는 그대로다.
- 실행 중 외부 도메인 요청이 0건이다. 텍스처와 환경 반사는 모두 로컬에서 온다.
- 기존 인터랙션과 테스트가 모두 그대로 통과한다.
- 앱 브라우저 패널에서 잰 FPS 하락폭을 보고한다. 목표는 high 단계에서 적용 전의 80% 이상이다.

### 범위 밖

- 서류 카드(종이) 재질
- GLB 모델의 재질. GLB는 자기 재질을 쓴다. 이 작업은 절차적 캐비닛에만 적용된다.
- 조명 배치 변경. 형광등 순차 점등은 4단계에서 다룬다.

## 2. 현재 상태 (문제의 원인)

| 원인 | 근거 |
| --- | --- |
| 텍스처 맵이 하나도 없다 | `materials.tsx`의 재질 11개가 모두 `MeshStandardMaterial({ color, roughness, metalness })`뿐이다 |
| 환경 반사가 없다 | `Environment`가 없어서, 금속이 반사할 대상 없이 플라스틱처럼 보인다 |
| 텍스처를 입혀도 늘어난다 | 모든 부품이 `UNIT_BOX`(1×1×1)를 `scale`로 늘린 것이다. UV가 면마다 0~1이라, 텍스처 밀도가 부품 크기에 따라 제각각이 된다 |
| 틈새가 납작하다 | 서랍 사이 틈, 칸 안쪽 같은 오목한 곳에 차폐 그림자가 없다 |

## 3. 구조

### 3.1 실측 치수 지오메트리 — `src/lib/metricBox.ts` (새 파일)

- `metricBox(w, h, d)`: `BoxGeometry(w, h, d)`를 만들고, 각 면의 UV를 **미터 단위**로 다시 쓴다. ±X 면은 d×h, ±Y 면은 w×d, ±Z 면은 w×h. 치수 키(0.1mm 단위로 반올림)로 캐시해 같은 치수는 같은 지오메트리를 공유한다.
- 추가 속성 `edgeUv`(vec4): 오프셋 없는 면 내부 좌표 (u, v)와 면 크기 (가로, 세로), 단위는 미터. 모서리 마모 셰이더가 "면 가장자리까지의 거리(m)"를 계산하는 데 쓴다.
- UV에는 박스마다 결정적인 의사난수 오프셋을 더한다. 같은 무늬가 격자처럼 반복되는 것을 막기 위해서다. 시드는 치수 키와 선택 인자 `seed`를 합친 것이다. 치수만 쓰면 크기가 같은 서랍 앞면 9개가 전부 같은 무늬가 되기 때문이다. 서랍과 칸은 `column * 10 + row + 1`, 외부 문은 101/102, 문 리브는 201~/301~, 캐비닛 패널은 1~11을 쓴다. 손잡이·명판 같은 작은 부품은 0이다.
- 시그니처: `metricBox(width, height, depth, seed = 0)`. 캐시 키에 seed가 들어간다.
- `metricPlane(w, h)`: 바닥용. 같은 규칙을 평면에 적용한다.

**교체 대상**: `geometry={UNIT_BOX} scale={[w, h, d]}` → `geometry={metricBox(w, h, d)}` (scale 제거)

| 파일 | `geometry={UNIT_BOX}` 메시 수 | 비고 |
| --- | --- | --- |
| `ProceduralCabinet.tsx` | 11 | 전부 교체 |
| `Locker.tsx` | 9 | 칸 벽 5개는 교체, 선택 테두리(glow) 4개는 유지 |
| `Drawer.tsx` | 7 | 전부 교체 |
| `DoorFurniture.tsx` | 6 | 전부 교체 |
| `OuterDoors.tsx` | 3 | 전부 교체 |
| `HingedPanel.tsx` | 1 | 교체 |
| `Room.tsx` | 1 + 평면 1 | 바닥 평면은 `metricPlane`, 벽은 `metricBox` |
| `ArchiveFile.tsx` | 1 | **유지** (서류 카드는 범위 밖) |

교체 대상은 박스 34개와 바닥 평면 1개다.

치수 값은 바꾸지 않으므로 형태와 위치는 그대로다. 레이캐스트 대상 메시도 같다.

### 3.2 텍스처 로딩 — `src/lib/textures.ts` (새 파일)

- 세트 정의: `{ id, realSize(m), maps: { color, normal, roughness } }`
  - `paintedSteel` = `green_metal_rust`, realSize 1.0
  - `concreteFloor` = `concrete_floor_worn_001`, realSize 3.0
  - `plasterWall` = `plastered_wall_04`, realSize 3.2
- `TextureLoader`로 비동기 로드한다. Suspense는 쓰지 않는다. 인트로를 멈추지 않기 위해서다.
- 색 맵은 `SRGBColorSpace`, 노멀·거칠기 맵은 선형 공간이다. `RepeatWrapping`을 쓰고, `repeat = 1 / realSize`로 미터 UV를 실제 크기에 맞춘다.
- 비등방성 필터: high 8, medium 4, low 2.
- 로드에 실패하면 경고만 남기고 단색 재질을 유지한다. 에러로 멈추지 않는다.

### 3.3 마모 재질 — `src/lib/wornMaterial.ts` (새 파일)

`createWornMaterial(options)` → `MeshStandardMaterial` + `onBeforeCompile` 패치.

**옵션**: `tint`, `roughness`, `metalness`, `set`, `edgeWear`(0~1), `grime`(0~1), `detail`(텍스처 요철 강도)

**색**
- 텍스처 색을 채도 약 15%로 낮추고 명암 대비만 남긴 다음, `tint`를 곱한다.
- `green_metal_rust` 원본의 녹색은 드러나지 않고, 지금 팔레트가 유지된다.

**셰이더 추가 두 가지**
1. **모서리 마모**: `edgeUv`로 면 가장자리까지의 거리 d(m)를 구한다. `d < 6mm × edgeWear × 노이즈(0.3~1.7)`인 곳을 맨 금속으로 바꾼다. 색은 `#8d8f88` 쪽으로, 금속성은 0.95로 올리고, 거칠기는 0.3 쪽으로 낮춘다. 노이즈는 셰이더 내부의 값 노이즈를 써서 외부 텍스처가 필요 없다.
2. **아래쪽 때**: 월드 Y가 바닥(`FLOOR_Y`)에서 0.35m 이내면 점점 어둡게(최대 −25%) 하고 거칠기를 올린다. 노이즈로 경계를 흐린다.

**재질별 설정** (지금 11개 재질을 모두 교체한다. 이름과 tint는 유지한다)

| 재질 | 세트 | edgeWear | grime | 비고 |
| --- | --- | --- | --- | --- |
| body, bodyDark, outerDoor, rib | paintedSteel | 0.6 | 0.7 | 문짝·몸체는 마모가 가장 많다 |
| lockerDoor (서랍 면) | paintedSteel | 0.5 | 0.4 | |
| lockerDoorSealed | paintedSteel | 0.3 | 0.9 | 봉인 칸은 먼지 위주 |
| interior | paintedSteel | 0.0 | 0.2 | 안쪽 칸, 요철 약하게 |
| handle | paintedSteel (노멀·거칠기만) | — | — | 반들반들 닳은 맨 금속. 거칠기 0.25~0.4 |
| plate | paintedSteel (노멀·거칠기만) | 0.2 | — | 명판 |
| plinth | paintedSteel | 0.8 | 1.0 | 걸레받이, 바닥과 닿는 곳 |
| floor | concreteFloor | — | — | 바닥 전용 |
| wall (**새 재질**) | plasterWall | — | — | 뒷벽. 지금은 floor 재질을 같이 쓰고 있어 분리한다 |

텍스처가 준비되면 `material.map / normalMap / roughnessMap`을 붙이고 `needsUpdate = true`로 교체한다. 그 전에는 지금의 단색 모습으로 그려진다.

### 3.4 환경 반사 — `Lighting.tsx` 수정

- drei `<Environment resolution={256} frames={1}>` 안에 `<Lightformer>`를 둔다. 천장 형광등 형태의 긴 판 2~3개와 은은한 벽 반사를 만든다.
- **`preset` / `files`는 쓰지 않는다.** `preset`은 실행할 때 외부 CDN에서 HDRI를 받아오기 때문이다.
- 목표 강도는 0.3이다 (`LIGHT_TARGETS.environment`). 어두운 방의 분위기를 유지하기 위해서다. 캡처 비교에서 금속이 여전히 납작하거나 너무 번들거리면 0.2~0.45 범위 안에서 한 번만 조정하고, 최종값을 보고한다.
- **인트로 연동**: 환경 반사는 조명처럼 표면을 밝히므로, 스포트라이트와 함께 어둠에서 올라와야 한다. `applyIntroProgress`가 조명 진행도(`lit`, 0~1)를 `sceneRegistry.setAmbientLevel()`에 넘기고, `Lighting` 안의 `useFrame`이 매 프레임 `scene.environmentIntensity = 0.3 × lit`으로 쓴다.
  - 매 프레임 쓰는 이유: drei `Environment`는 다시 렌더될 때마다 `environmentIntensity`를 기본값 1로 되돌린다(`setEnvProps`). 한 번만 쓰면 어두운 인트로가 갑자기 밝아질 수 있다.
  - 이 때문에 `introTimeline.ts`와 `sceneRegistry.ts`도 수정한다.
- 앰버 램프, 키 조명, 필 조명은 그대로 둔다.

### 3.5 SSAO와 톤매핑 — `Scene.tsx` 수정, 새 파일 `src/components/canvas/PostEffects.tsx`

- `@react-three/postprocessing`의 `<EffectComposer>` + `<N8AO>` + `<ToneMapping mode={ACES_FILMIC}>`
- 품질 단계별 설정

| 단계 | SSAO | 톤매핑 |
| --- | --- | --- |
| high | N8AO `quality="high"`, 전체 해상도 | 후처리에서 ACES 한 번 |
| medium | N8AO `halfRes` | 후처리에서 ACES 한 번 |
| low | 없음 (EffectComposer 자체를 마운트하지 않음) | 지금처럼 렌더러 `toneMapping: ACESFilmicToneMapping` |

- 후처리를 쓰는 동안에는 렌더러의 `toneMapping`을 `NoToneMapping`으로 둔다. 톤매핑이 두 번 적용돼 화면이 탁해지는 것을 막기 위해서다.
- `<AdaptiveDpr>`는 유지한다. N8AO는 해상도 변화를 따라간다.

## 4. 데이터 흐름

```
textures.ts ──(비동기 로드)──> 텍스처 세트 준비 이벤트
      │
materials.tsx: createCabinetMaterials()
      └─ createWornMaterial(...) × 12  ──(준비되면 맵 부착)──> 모든 메시
metricBox.ts ──> 각 컴포넌트의 geometry (미터 UV + edgeUv)
Lighting.tsx ──> Environment(Lightformer) ──> scene.environment
Scene.tsx ──> PostEffects (quality 단계에 따라 마운트)
```

`CabinetMaterialsProvider`와 `useCabinetMaterials()`의 인터페이스는 유지하고, `wall`만 추가한다. 메시 쪽 코드는 geometry만 바뀐다.

## 5. 위험과 대응

| 위험 | 대응 |
| --- | --- |
| 서류 카드가 반투명(`transparent: true`)이라, N8AO가 카드를 무시하고 그 뒤를 어둡게 칠할 수 있다 | 카드가 완전히 나타나면(opacity 1) `transparent = false`로 전환하고, 사라질 때 다시 켠다. 서랍 캡처로 확인한다 |
| `green_metal_rust`의 볼트·녹 자국이 1m마다 규칙적으로 찍혀 보일 수 있다 | 박스별 UV 오프셋으로 반복을 흐린다. 그래도 어색하면 색 맵을 끄고 노멀·거칠기만 쓴다 |
| 텍스처 교체 순간이 깜빡여 보일 수 있다 | 인트로가 어둠에서 시작하고 조명이 서서히 켜지므로, 대부분 조명이 켜지기 전에 교체된다. 스크롤 도중 교체되는 경우만 캡처로 확인한다 |
| 헤드리스 테스트가 느려진다 | 테스트 로직은 geometry·재질과 무관하다. 레이캐스트 검증 스크립트는 scale 대신 geometry 파라미터로 메시를 식별하도록 고친다 |
| 모서리 마모 셰이더가 GLB 메시에 적용될 수 있다 | `edgeUv` 속성이 없으면 마모를 0으로 처리한다(`#ifdef`). GLB 경로는 이 재질을 쓰지 않는다 |

## 6. 파일 변경 요약

- **새 파일**
  - `src/lib/metricBox.ts`
  - `src/lib/textures.ts`
  - `src/lib/wornMaterial.ts`
  - `src/components/canvas/PostEffects.tsx`
  - `public/textures/<세트>/*.jpg` (9개, 약 1.8MB)
- **수정**
  - `materials.tsx` (재질 교체, `wall` 추가)
  - `Scene.tsx` (PostEffects, 톤매핑 분기)
  - `Lighting.tsx` (Environment, 환경 강도 useFrame)
  - `sceneRegistry.ts` (ambient level, `LIGHT_TARGETS.environment`), `introTimeline.ts` (`setAmbientLevel(lit)` 한 줄)
  - `Room.tsx`, `ProceduralCabinet.tsx`, `Locker.tsx`, `SealedLocker.tsx`, `Drawer.tsx`, `DoorFurniture.tsx`, `OuterDoors.tsx`, `HingedPanel.tsx` (geometry 교체, seed 전달)
  - `ArchiveFile.tsx` (투명도 전환)
  - `package.json` (`@react-three/postprocessing`, `postprocessing`, `test:unit` 스크립트)
- **변경 없음**: 카메라, 코레오그래피, 스크롤 구간과 길이, HUD, 데이터, GLB 경로

## 7. 텍스처 출처 (CC0, 출처 표기 불필요)

| 세트 | 파일 (1K JPG) | 출처 URL 접두사 | 크기 |
| --- | --- | --- | --- |
| paintedSteel | `green_metal_rust_diff_1k.jpg`, `_nor_gl_1k.jpg`, `_rough_1k.jpg` | `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/green_metal_rust/` | 207 + 119 + 121 KB |
| concreteFloor | `concrete_floor_worn_001_diff_1k.jpg`, `_nor_gl_1k.jpg`, `_rough_1k.jpg` | `…/1k/concrete_floor_worn_001/` | 116 + 108 + 178 KB |
| plasterWall | `plastered_wall_04_diff_1k.jpg`, `_nor_gl_1k.jpg`, `_rough_1k.jpg` | `…/1k/plastered_wall_04/` | 292 + 417 + 237 KB |

라이선스와 출처는 `public/textures/README.md`에 적어 둔다.

## 8. 검증

1. `tsc --noEmit`, `next lint`
2. 기존 테스트 재실행: `tests/drawer-flow.mjs`, `tests/scroll-probe.mjs`, 탭 가림 레이캐스트, 꺼내기 경로 충돌 검사(`cabinetLayout` 기반이라 영향 없음을 확인)
3. 전후 비교 캡처 (1440×900): 금고 전경, A-01 서랍 안, 서류 확대
4. 네트워크: 페이지 로드부터 서랍·서류를 한 번씩 거칠 때까지 요청 목록을 뽑고, `localhost` 외 도메인이 0건인지 확인
5. FPS: 앱 브라우저 패널에서 `requestAnimationFrame`으로 3초간 프레임을 센다. 금고 전경 기준, 적용 전후를 비교한다
6. 텍스처 로드 실패 시뮬레이션: 텍스처 경로를 막아도 단색으로 정상 작동하고 콘솔 에러가 없는지 확인
