# Asset Specification: Pixel Chess Roguelike

## 1. Visual Style

- **Style**: 16-bit Pixel Art (Cute & Vibrant)
- **Palette**: 명확한 색 대비를 가진 파스텔톤 또는 레트로 팔레트.
- **Tile Size**: 32x32 pixels (Base grid).

## 2. Asset Grouping

에셋은 적용 범위에 따라 그루핑한다.

| 그룹 | 범위 |
|---|---|
| **Global** | 모든 화면 공통 (메뉴, 설정, 사운드) |
| **Classic Common** | 클래식 두 서브모드 공통 (보드, 정규 기물, 평가바) |
| **Classic Single** | 싱글 전용 (사이드 패널, 분석 모드 요소) |
| **Classic Local** | 로컬멀티 전용 (상하 시계, 차례 인디케이터) |
| **Adventure** | 모험 전용 (노드 아이콘, 보스, 캐릭터, 아이템 카드) |

## 3. Global

### Fonts
- **DungGeunMo** 또는 **Galmuri** 등 한글 가독성 좋은 비트맵 폰트.
- 영문 보조 폰트는 동일 톤의 픽셀 폰트.

### UI Primitives
- 9-slice 스케일링 가능한 픽셀 아트 버튼 테두리
- 다이얼로그/모달 프레임
- 토글·슬라이더·드롭다운 (픽셀 스타일)

### SFX (글로벌)
- 메뉴 진입/이탈
- 버튼 클릭/호버
- 알림음

## 4. Classic Common

### Pieces (White & Black, 정규 16종)
- **King**: 왕관 강조, 위엄
- **Queen**: 화려한 장식
- **Rook**: 단단한 성벽
- **Bishop**: 고전적인 사제 모자
- **Knight**: 귀여운 말 머리
- **Pawn**: 작고 아기자기한 병사
- *애니메이션*: Idle, Move, Capture (각 4~8프레임). 클래식에서는 Hit/Death 불필요.

### Boards
- 기본 체커보드 (Wood, Marble, Grass 등 테마별 변형 3종 이상)
- 좌표 표기 (a~h, 1~8) 오버레이
- 합법 수 하이라이트 점/원 마커

### Common UI
- 평가바 (수직, 흑백 그라데이션)
- 기보 패널 배경
- 일시정지/설정 아이콘

### SFX (Classic Common)
- 기물 이동 (딱딱 소리)
- 캡처 (단단한 타격음)
- 체크 (경고음)
- 체크메이트 (강조음)
- 캐슬링 / 승급 (특수음)

## 5. Classic Single

- 사이드 패널 레이아웃(평가바·기보·옵션)
- 힌트 강조 마커 (제안 수 표시용)
- 분석 모드 UI 요소 (MultiPV 화살표, 평가치 라벨)

## 6. Classic Local

- 상하 시계 위젯 (큰 숫자, 잔여 시간 색상 변화)
- 차례 인디케이터 (현재 차례 강조 바)
- 보드 회전 애니메이션 (200ms 트랜지션)
- 무르기/무승부 제안 모달

## 7. Adventure

### Map Icons (노드 종류별)
- ⚔ Battle
- 🛡 Elite (강조된 보더)
- 🛒 Shop
- ❔ Event
- 🛏 Rest
- 👑 Boss (애니메이션 idle)

총 6종. 잠긴 노드, 완료된 노드, 현재 위치 등 상태별 변형 포함.

### Bosses (3종)
- 1막 보스: 적당한 위협감의 디자인
- 2막 보스: 다단계 페이즈 표현 가능한 디자인
- 최종 보스: 비주얼적 임팩트 강조
- *애니메이션*: Idle, Attack, Phase Transition, Defeat

### Characters
- **암살자단**: 다크 톤, 나이트 강조
- **신성단**: 화이트/골드 톤, 비숍·킹 강조
- 캐릭터 초상화 (선택 화면용, 64x64 또는 96x96)
- 추가 캐릭터 해금 슬롯 (placeholder + ?)

### Item Cards
- 등급별 카드 프레임 4종 (Common 회색 / Uncommon 초록 / Rare 파랑 / Legendary 보라)
- 카테고리별 아이콘 (스탯/효과/패시브)
- 아이템 일러스트 (각 아이템 16x16 또는 32x32)

### Backgrounds
- 막별 배경 3종 (1막: 숲 / 2막: 던전 / 3막: 하늘성)
- 노드 진입 시 줌인 효과용 레이어 분리

### SFX (Adventure 전용)
- 아이템 획득 (반짝이는 소리)
- 노드 진입
- 보스 등장 (드라마틱)
- HP 감소 (둔탁한 충격)
- 캐릭터 사망 (런 종료 신호)
- 별의 조각 적립 (반짝)

## 8. Audio

### BGM
- **Global**: 메인메뉴 (잔잔한 chiptune)
- **Classic**: 평온한 대국 BGM (1~2곡)
- **Adventure**:
  - 막별 BGM 3곡 (분위기 차등: 숲 → 던전 → 하늘성)
  - 보스 전용 BGM 3곡
  - 결과 화면 BGM (승리/패배)

### Voice (옵션)
- 한국어 시스템 사운드 (체크/메이트 알림)
- 캐릭터 보이스 (선택 시 짧은 멘트, 옵션)

## 9. Current Placeholder Implementation (M6+ 1차)

정식 외부 도트 자산 도입 전 단계로, `scripts/generate-piece-placeholders.ts`가 빌드 타임에 PNG를 생성하는 placeholder 시스템이 정착되어 있다. 현재 구조:

### 9.1 기물 sprite (36 PNG)

- 32x32 PNG, 투명 배경, RGBA8.
- 디렉토리: `client/public/assets/pieces/{characterId}/{side}{type}.png`
  - characterId ∈ `standard` | `assassins` | `saints`
  - side ∈ `w` | `b`
  - type ∈ `K` | `Q` | `R` | `B` | `N` | `P`
  - 총 3 × 2 × 6 = 36 PNG
- 같은 글리프(`PIECE_GLYPH` 32x32 ASCII 그리드)에 캐릭터별 색 팔레트를 적용해 출력한다. 흑 진영은 캐릭터 무관 baseline 색.

### 9.2 캐릭터별 색 팔레트

| characterId | wFill | wOutline |
|---|---|---|
| `standard` | `#f5e9d3` 옅은 아이보리 | `#2a2017` 다크 브라운 |
| `assassins` | `#a8a8b8` 어두운 은회색 | `#1a1a22` 블랙 |
| `saints` | `#f5d97c` 금색 | `#7a5511` 어두운 황금 |

흑 진영 공통:
- `bFill`: `#2f231a` 짙은 우드
- `bOutline`: `#7a5a40` mid 브라운

### 9.3 보드 테마 (BoardScene 런타임)

기물 PNG와 직교 — 보드 칸 색만 변경. `client/src/lib/phaser/scenes/BoardScene.ts`의 `THEME_COLORS` map에서 정의:

| theme | LIGHT 칸 | DARK 칸 |
|---|---|---|
| `default` | `#f0d9b5` | `#b58863` |
| `forest` | `#d4e09b` | `#5b8a3a` |
| `ocean` | `#cce6e8` | `#3e7a8b` |

모험 모드 막에 따라 자동 매핑: 1막=default, 2막=forest, 3막=ocean. 클래식=default.

### 9.4 글리프 무결성

generator에 `const GLYPH_ROW = /^[ .X]{32}$/` 정규식 어설션이 있어 빌드 시점에 잘못된 길이(31줄, 33-char 줄) 또는 비표준 문자(탭, 전각 공백 등)를 차단한다. 글리프 행 끝의 trailing space는 의미 있는 픽셀(투명)이라 에디터의 `trim-trailing-whitespace` 옵션이 켜져 있으면 손상 가능 — 본 파일 상단에 NOTE 코멘트로 명시되어 있음.

### 9.5 UI 컴포넌트에서 PNG 활용

다이얼로그 컴포넌트가 같은 PNG 자산을 `<img>`로 직접 참조 — `PromotionDialog`는 폰 승급 4 선택지에, `GameOverDialog`는 승자 K 표시에. 자세한 흐름은 ARCHITECTURE §7.8 참조.

### 9.6 정식 자산 전환

위 구조는 정식 외부 도트 자산 도입 시에도 그대로 활용 가능:
- 경로/크기/디렉토리 동일 — 파일 교체만으로 generator 폐기 가능
- 캐릭터별 색 분기는 정식 도트에서 캐릭터별 sprite sheet로 자연스럽게 확장
- 보드 테마는 BoardScene 상수라 외부 자산과 무관 (정식 보드 텍스처 도입 시 분기)

## 10. Production Pipeline

- **저작 도구**: Aseprite (스프라이트), GarageBand/BFXR (SFX)
- **포맷**:
  - 이미지: PNG (트루컬러, 알파)
  - 스프라이트시트: Aseprite JSON + PNG
  - 오디오: OGG (BGM), WAV (짧은 SFX)
- **저장소 구조**:
  ```
  assets/
  ├── pieces/           # Classic Common
  ├── boards/           # Classic Common
  ├── ui/
  │   ├── global/
  │   ├── classic-single/
  │   └── classic-local/
  ├── adventure/
  │   ├── map-icons/
  │   ├── bosses/
  │   ├── characters/
  │   ├── items/
  │   └── backgrounds/
  ├── sfx/
  │   ├── global/
  │   ├── classic/
  │   └── adventure/
  └── bgm/
  ```

## 11. Delivery Spec — 디자이너 / 사운드 디자이너 발주용 정밀 스펙

본 섹션은 외부 디자이너·사운드 디자이너에게 발주할 때 한 페이지에서 모든 수치·팔레트·포맷을 확인할 수 있도록 정리한 표다. **모든 값은 실 코드(`scripts/generate-piece-placeholders.ts`, `client/src/lib/phaser/scenes/BoardScene.ts`, `client/src/lib/audio/AudioManager.ts`)에서 추출**된 수치이며, 변경 시 본 문서와 코드를 함께 업데이트할 것.

### 11.1 공통 규약

| 항목 | 값 |
|---|---|
| 픽셀 아트 기준 그리드 | 32×32 |
| 이미지 포맷 | PNG (RGBA8, 비트심도 8, 무손실) |
| 배경 | **완전 투명** (alpha=0) |
| 색공간 | sRGB |
| 안티앨리어싱 | **금지** — 인접 픽셀 보간 없는 hard-edge 도트 |
| 파일명 규약 | 소문자 + 케밥 케이스, 확장자 `.png`/`.ogg`/`.wav` |
| 렌더 측 | Phaser `image-rendering: pixelated` 강제 + `setDisplaySize`로 정수 배율 스케일 |

### 11.2 기물 (12종 × 캐릭터 3 = 36 PNG)

| 항목 | 값 |
|---|---|
| 캔버스 사이즈 | **32×32 px** (필수, 변경 불가 — BootScene이 키 기준으로 preload) |
| 실 표시 사이즈 | **52×52 px** (보드 TILE 56 - 여백 4, Phaser가 자동 스케일 ×1.625) |
| 디렉토리 | `client/public/assets/pieces/{characterId}/{side}{type}.png` |
| 파일명 | `{w,b}{K,Q,R,B,N,P}.png` (예: `wK.png`, `bN.png`) |
| 셀 안 배치 | 32×32 중앙 정렬, 상하 여백은 글리프 무게중심에 맞춰 자율 (현재 placeholder는 하단 절반에 무게 집중 — 보드 위 "서 있는" 느낌) |
| 알파 | 글리프 외곽은 완전 투명, 외곽선/채움은 단색 (반투명 metaphor 금지) |
| 애니메이션 | **현 MVP는 정적 1프레임만 사용**. Tween은 Phaser가 sprite 자체를 이동/페이드로 처리. 정식 자산에서 Idle/Move/Capture 추가 프레임 도입 시 별도 sprite-sheet 발주 (스펙 후속 사이클) |

#### 캐릭터별 백 진영 팔레트

| characterId | wFill (채움) | wOutline (외곽선) | 특징 |
|---|---|---|---|
| `standard` | `#f5e9d3` | `#2a2017` | 옅은 아이보리 / 다크 브라운 |
| `assassins` | `#a8a8b8` | `#1a1a22` | 은회색 / 블랙 — 어두운 톤 |
| `saints` | `#f5d97c` | `#7a5511` | 금색 / 어두운 황금 — 신성한 톤 |

#### 흑 진영 공통 (모든 캐릭터 동일)

| 항목 | 값 |
|---|---|
| bFill | `#2f231a` 짙은 우드 |
| bOutline | `#7a5a40` mid 브라운 |

> **2색 제약**: 현재 placeholder는 채움 1색 + 외곽선 1색의 **2색 글리프**다. 정식 자산은 같은 32×32 안에서 색 수를 3~5색까지 확장 가능 (하이라이트·그림자 추가). 단, 캐릭터 식별성을 위해 베이스 톤(아이보리/은회색/금색)은 유지.

### 11.3 보드 (3 테마)

| 항목 | 값 |
|---|---|
| 1셀 사이즈 | 56×56 px (BoardScene `TILE` 상수) |
| 보드 전체 | 448×448 px (8×TILE), MARGIN 24px 양옆 |
| 표시 방식 | 단색 rectangle (텍스처 아님 — 정식 아트 도입 시 sprite로 교체) |

| theme | LIGHT 칸 | DARK 칸 | 적용 |
|---|---|---|---|
| `default` | `#f0d9b5` | `#b58863` | 클래식 + 모험 1막 |
| `forest` | `#d4e09b` | `#5b8a3a` | 모험 2막 |
| `ocean` | `#cce6e8` | `#3e7a8b` | 모험 3막 |

추후 보드 텍스처(나무결/대리석/풀 등)를 도입할 경우, **타일 단위 256×256 px** (4×스케일) 무손실 PNG로 발주 — Phaser가 자동 다운스케일.

### 11.4 보드 오버레이 마커 (런타임 색 — 자산 불요)

마커는 모두 코드에서 알파 블렌딩 rectangle/circle로 그리지만, 정식 아트 디자인 시 톤 매칭에 참고:

| 마커 | hex | alpha | 용도 |
|---|---|---|---|
| `HIGHLIGHT` | `#6dd47e` | 0.7 (도트) | 합법 수 표시 |
| `SELECTED` | `#ffd23f` | 0.5 | 선택된 칸 |
| `LAST_MOVE` | `#f4a261` | 0.35 | 마지막 무브 from/to |
| `CHECK` | `#ff5050` | 0.4 | 체크당한 킹 칸 |
| `HINT` | `#4dabf7` | 0.8 (스트로크) | 힌트 from/to 링 |

### 11.5 노드 아이콘 (6종 × 4 상태)

`AdventureMap.tsx`가 현재 이모지(`⚔☠💰❓🏕👑`)로 표시 — 정식 자산이 PNG로 대체.

| 항목 | 값 |
|---|---|
| 캔버스 사이즈 | **48×48 px** (지표 표시용. 코너에 ✓ 등 상태 배지가 들어가도 여유) |
| 디렉토리 (제안) | `client/public/assets/adventure/map-icons/{nodeType}.png` |
| nodeType | `battle` / `elite` / `shop` / `event` / `rest` / `boss` |
| 상태 변형 | 한 PNG에 모두 X — 코드에서 alpha/border로 상태 표시. 자산은 **베이스 1장 + (optional) 잠금 X 표시 1장**만 |
| 배경 | 투명 |
| 외곽 톤 | UI 보더(#475569 slate-700, #a78bfa purple-400)와 색 충돌 피하기 — 너무 진한 단색보다 미드톤 권장 |

### 11.6 보스 스프라이트 (3종)

| 항목 | 값 |
|---|---|
| 캔버스 사이즈 | **96×96 px** (보스 화면 헤더 + 인터스티셜에서 표시) |
| 디렉토리 | `client/public/assets/adventure/bosses/act{1,2,3}.png` |
| 막별 톤 | 1막 숲 → 자연/거대 동물 / 2막 던전 → 골렘·언데드 / 3막 하늘성 → 신성·기계 |
| 애니메이션 | 정식 사이클에서 Idle 4프레임 + Defeat 4프레임 sprite-sheet (96×96 frames × 8). 본 사이클은 **Idle 1프레임만** 우선 발주 |
| 배경 | 투명 |

### 11.7 캐릭터 초상화 (3종 + 미해금 슬롯)

`AdventureEntry`의 캐릭터 선택 카드에 표시.

| 항목 | 값 |
|---|---|
| 캔버스 사이즈 | **96×96 px** (Retina 대비 가능하면 ×2 = 192×192 옵션) |
| 디렉토리 | `client/public/assets/adventure/characters/{characterId}.png` |
| characterId | `standard` / `assassins` / `saints` (현재 풀 3종) + 미해금 자리에 `locked.png` 1장 |
| 배경 | 투명 또는 캐릭터 톤 원형 후광 (디자이너 재량) |
| 톤 매칭 | 각 캐릭터의 기물 wFill(11.2 표) 톤을 강조 — 한눈에 같은 진영임을 인식 |

### 11.8 아이템 아이콘 (현재 풀 30종)

| 등급 | 개수 (현 풀) | 권장 톤 |
|---|---|---|
| Common | 10 | 회색 ~ 베이지 (`#9ca3af` ~ `#d4c5a0`) |
| Uncommon | 5 | 초록 (`#4ade80` ~ `#22c55e`) |
| Rare | 10 | 파랑 ~ 사이안 (`#60a5fa` ~ `#22d3ee`) |
| Legendary | 5 | 자주·금색 (`#c084fc` + `#fbbf24` 빛 효과) |

| 항목 | 값 |
|---|---|
| 캔버스 사이즈 | **32×32 px** (인벤토리/상점 카드 안) |
| 디렉토리 | `client/public/assets/adventure/items/{itemId}.png` |
| itemId | `client/src/lib/adventure/data/items.ts`의 `id` 그대로 (예: `iron-shield.png`, `crown-of-eternity.png`) |
| 배경 | 투명 |
| 등급 프레임 | 자산 안에 그리지 말 것 — 코드의 `.rarity-*` CSS가 카드 보더로 처리 |

#### 현재 풀 itemId 전수 (참고 — 실제 발주는 items.ts 최신본 기준)

`iron-shield`, `sharp-blade`, `leather-armor`, `healing-herb`, `spike-helm`, `oak-staff`, `sturdy-cloak`, `training-band`, `fang-amulet`, `minor-potion` (Common 10)
`knight-spurs`, `royal-crown`, `phoenix-feather`, `thorn-mantle`, `titan-belt` (Uncommon 5)
`demon-edge`, `aegis-plate`, `ironbark-amulet`, `storm-glaive`, `warden-mantle`, `runic-gauntlet`, `serpent-fang`, `oathkeeper-shield`, `phantom-cloak`, `dragon-scale` (Rare 10)
`crown-of-eternity`, `soul-of-titan`, `worldtree-bough`, `sunforged-blade`, `eclipse-aegis` (Legendary 5)

### 11.9 배경 (막별 3종)

| 항목 | 값 |
|---|---|
| 사이즈 | **480×270 px** (16:9 픽셀 아트 — 디자이너가 도트 톤 유지 위해 채택. CSS `object-fit: cover` + `image-rendering: pixelated`로 확대) |
| 디렉토리 | `client/public/assets/adventure/backgrounds/act{1,2,3}.png` |
| 톤 | 1막 숲 (녹/갈) / 2막 던전 (석/암회) / 3막 하늘성 (청/금) |
| 레이어 분리 (옵션) | 전경/중경/원경 PNG 3장 (parallax용). 미적용 시 단일 PNG |
| 압축 | PNG 무손실 우선. 용량 부담 시 WebP 대체 (Phaser 6.0+ 지원) |

### 11.10 BGM (5트랙)

| 항목 | 값 |
|---|---|
| 포맷 | OGG Vorbis (1순위) + MP3 (Safari iOS 폴백) |
| 비트레이트 | OGG q=5 (~160kbps) / MP3 192kbps |
| 채널 | 스테레오 |
| 샘플레이트 | 44.1 kHz |
| 루프 | seamless loop 가능하도록 fade-in/out 없이 정확한 마디 단위 종결 |
| 디렉토리 | `client/public/assets/bgm/{key}.ogg` (+`.mp3`) |

| key | 권장 길이 (loop) | 분위기 |
|---|---|---|
| `menu` | 60~90초 | 잔잔한 chiptune, 메인메뉴 대기 |
| `classic` | 90~120초 | 평온한 대국, 집중 방해 X |
| `adventure-act1` | 60~90초 | 숲의 모험 — 밝고 가벼움 |
| `adventure-act2` | 60~90초 | 던전 — 무게감, 긴장 |
| `adventure-act3` | 90~120초 | 하늘성 — 웅장, 신성 |
| `boss` | 60~90초 | 위협적, 드라마틱 (모든 막 보스 공통 또는 막별 변형) |
| `result-victory` / `result-defeat` | 20~30초 (one-shot, no loop) | 승리/패배 임팩트 |

> **AudioManager 호출 매핑**: `audioManager.playBgm('menu' | 'classic' | 'adventure' | 'boss' | 'result')` 키 기준. 정식 도입 시 `playBgm`은 Howler.js 또는 `<audio>` 태그로 교체되며, 위 키를 그대로 사용.

### 11.11 SFX

| 항목 | 값 |
|---|---|
| 포맷 | WAV (편집 원본) + OGG (배포본). Phaser는 둘 다 지원 |
| 채널 | 모노 (위치감 불요 — UI/보드 SFX 모두) |
| 샘플레이트 | 44.1 kHz |
| 비트심도 | WAV 16-bit |
| 디렉토리 | `client/public/assets/sfx/{category}/{key}.ogg` |
| volume 정규화 | -3 dBFS 피크 권장 (코드의 SFX gain 0.3~0.4와 합성해 클리핑 회피) |

#### 길이 권장치 — 현재 AudioManager placeholder 동작과 매칭

| key | 카테고리 | 길이 (ms) | 톤 가이드 |
|---|---|---|---|
| `click` | global | **80~100** | 짧은 사인파 880Hz 풍 — 메뉴/버튼 |
| `move` | classic | **100~150** | 폰 무브 — 나무 딸깍 또는 부드러운 trigangle wave 440→220Hz |
| `capture` | classic | **150~250** | 단단한 타격 — sawtooth 180→90Hz, 약간의 노이즈 leyer |
| `check` | classic | 200~300 | 경고 톤 — high pitch (1.2kHz~) 짧게 |
| `checkmate` | classic | 400~600 | 게임 종료 강조 — 하강 모티프 3음 |
| `castle` | classic | 150~200 | 룩 동시 이동 — `move` + 메탈릭 추가 |
| `promotion` | classic | 300~400 | 승급 fanfare — 상승 모티프 |
| `item-pickup` | adventure | 200~300 | 반짝 (high frequency sparkle, 0.5~1초 reverb tail 허용) |
| `node-enter` | adventure | 150~250 | 진입 swoosh |
| `boss-appear` | adventure | 800~1200 | 드라마틱 (intro stinger, BGM 위에 겹쳐도 무해) |
| `hp-damage` | adventure | 100~200 | 둔탁 — low frequency thump |
| `character-defeat` | adventure | 600~1000 | 게임오버 — sad motif |
| `star-shard` | adventure | 200~400 | 반짝 high (item-pickup 보다 더 청량) |

> **호출 매핑**: 현재 `AudioManager`는 `playClick / playMove / playCapture`만 정식 메서드. 정식 SFX 도입 시 각 메서드 안에서 사인파 생성을 `new Audio(...)` 또는 Howler `sound.play()`로 교체. 추가 SFX(check/checkmate/item-pickup 등)는 메서드를 추가하고 호출처(`AdventureChessManager.tryMove` 후, `AdventureBattle.finalize`, `AdventureResult.onMount` 등)에 hook을 끼움.

### 11.12 검수 체크리스트 (디자이너용)

발주 전·완성품 인수 시 양측 다음을 확인:

- [ ] 모든 PNG 캔버스 사이즈가 본 §11 표와 정확히 일치 (32×32 / 48×48 / 96×96 / 1920×1080)
- [ ] 배경 alpha=0 (반투명 흰색 픽셀 없음)
- [ ] 안티앨리어싱 부재 — 외곽선 단색
- [ ] 캐릭터 식별성 — 기물 sprite의 wFill 톤이 §11.2 캐릭터별 색에 가까운 톤
- [ ] 아이템 itemId가 [items.ts](../client/src/lib/adventure/data/items.ts)의 id와 정확히 일치 (오타 시 런타임 로드 실패)
- [ ] BGM는 loop 시 끊김 없음 (waveform editor에서 양 끝점 검수)
- [ ] SFX 피크 -3 dBFS 이하, 클리핑 없음
- [ ] 파일명 소문자 + 케밥 케이스
- [ ] OGG는 q=5 또는 192kbps 이상, MP3 폴백 동봉

### 11.13 정식 자산 도입 상태 (2026-05-25 1차)

ASSETS.md §11 발주 스펙에 기반해 사용자가 1차 정식 자산을 도입. 사이즈·디렉토리·파일명 모두 스펙 부합 (배경만 480×270로 디자이너 재량 채택). 풀과 1:1 매칭 검증 완료.

| 카테고리 | 발주 수 | 도입 수 | 위치 | 상태 |
|---|---|---|---|---|
| 기물 36 PNG | 36 | 36 | `client/public/assets/pieces/{characterId}/{side}{type}.png` | ✅ placeholder 교체 |
| 노드 아이콘 | 6 | 6 | `client/public/assets/adventure/nodes/{battle,elite,shop,event,rest,boss}.png` | ✅ UI 통합 완료 |
| 보스 스프라이트 | 3 | 3 | `client/public/assets/adventure/bosses/act{1,2,3}.png` | ✅ UI 통합 완료 |
| 캐릭터 초상화 | 3+1 | 4 | `client/public/assets/adventure/characters/{standard,assassins,saints,locked}.png` | ✅ UI 통합 완료 |
| 아이템 아이콘 | 30 | 30 | `client/public/assets/adventure/items/{itemId}.png` | ✅ UI 통합 완료 |
| 막별 배경 | 3 | 3 | `client/public/assets/adventure/backgrounds/act{1,2,3}.png` | ✅ UI 통합 완료 |
| BGM | 7 트랙 | 0 | `client/public/assets/bgm/` | ⏳ 사운드 디자이너 발주 대기 |
| SFX | 13 키 | 0 | `client/public/assets/sfx/` | ⏳ 사운드 디자이너 발주 대기 |

**generator 가드**: 기물 placeholder generator(`scripts/generate-piece-placeholders.ts`)는 동일 경로에 PNG를 출력하므로 `bun run gen:placeholders`를 실행하면 정식 자산이 덮어쓰여진다. 정식 자산 도입 후에는 generator 실행 금지. `pieces_old/`에 1차 placeholder를 보존했고 .gitignore로 추적은 안 함 — 필요 시 복구만 가능.

**코드 통합 상태**: 본 사이클에서 노드 아이콘, 보스 수호자 정보창, 캐릭터 초상화, 아이템 아이콘, 막별 배경 PNG 자산의 UI 통합을 전면 완료함. 기물 PNG는 BootScene preload를 통해 즉시 보드에 반영됨. BGM/SFX 음원의 실 장착은 사운드 디자이너 발주 및 자산 도입 완료 후 진행 예정.

### 11.14 색 톤 일관성 가이드

UI 코드의 Tailwind 팔레트(slate/amber/emerald/purple)와 충돌하지 않도록:

- **slate-700 ~ slate-900** (`#334155` ~ `#0f172a`) — 카드/모달 보더·배경. 자산 외곽선이 이 톤과 너무 비슷하면 보이지 않음
- **amber-300/400** (`#fcd34d` / `#fbbf24`) — 별의 조각, 현재 노드 강조. saints 캐릭터 톤과 일부 겹침 — 의도된 친근감
- **emerald-400** (`#34d399`) — 도전과제 잠금해제. Uncommon 등급 톤과 일치
- **purple-400/500** (`#a78bfa` / `#8b5cf6`) — 다음 진입 가능 노드. Legendary 등급 톤과 일치
- **red-400/500** (`#f87171` / `#ef4444`) — HP 위험, 패배. CHECK 마커 톤

