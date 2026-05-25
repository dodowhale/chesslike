# Architecture Design: Pixel Chess Roguelike

## 1. System Overview

본 프로젝트는 **Hybrid Component Architecture**를 채택합니다.

- **SolidJS**: 고수준 UI(메뉴, 인벤토리, 다이얼로그) 및 전역 상태 관리.
- **Phaser 3**: 저수준 게임 루프, 렌더링, 물리, 애니메이션 처리.

## 2. Mode Routing

```
┌─────────────────────────────┐
│         Main Menu           │──→ /meta (해금 트리)
└──────────┬─────────┬────────┘
           │         │
           ▼         ▼
    ┌──────────┐  ┌────────────────────┐
    │ Classic  │  │   AdventureRun     │
    │  Scene   │  │    Controller      │
    │Controller│  │  (단일 인스턴스)    │
    │ Base     │  │                    │
    └────┬─────┘  └──────────┬─────────┘
         │                   │
   ┌─────┴──────┐     ┌──────┴──────────────────┐
   ▼            ▼     ▼      ▼     ▼     ▼      ▼
SingleAdapter LocalAdapter Map Battle Event Rest Boss
   │            │           │     │            
   └─stockfish  └─합의모달   └─ AdventureChessManager + Inventory
     Worker     (LocalReq)        + Star Shards + MetaStore
```

### 2.1 컨트롤러 계층 (실 구현)

```ts
abstract class ClassicSceneControllerBase {
  // 공통: 시계(ClockManager) + 종료/히스토리/라이프사이클
  attach(): void;
  destroy(): void;
  rematch(): void;
  abstract requestUndo(): void;
  abstract resign(): void;
  protected abstract preferredOrientation(): Color;
  protected abstract start(): void;
  protected abstract historyPgnContext(): PgnContext;
}

class SingleAdapter extends ClassicSceneControllerBase {
  // + StockfishEngine, 난이도, AI 자동 응답(turn effect),
  // + 힌트(token 검증), 무르기(engine.stop 후 ply 분기), 분석 모드 인지
}

class LocalAdapter extends ClassicSceneControllerBase {
  // + 합의 모달(localRequest), 자동 보드 회전(turn effect),
  // + 색 교대(rematch 시 startingColor 토글)
}

class AdventureRunController {
  // 자체 클래스 (베이스 상속 없음 — 흐름이 클래식과 다름)
  // + AdventureChessManager 인스턴스 (보드 활성화 시)
  // + 노드 진행/인벤토리/HP/골드/별의 조각
  // + advanceAct (1→2→3막) / startNextBossPhase (플레이어 HP 보존)
  // + enterBoardNode(preserve?) / attemptBoardMove / scheduleAiReply
  // + persistRun (IndexedDB)
  static restore(run, meta): AdventureRunController;
}
```

| 컨트롤러 | 역할 | 의존 모듈 |
|---|---|---|
| `ClassicSceneControllerBase` | 시계·종료·히스토리·라이프사이클 공통 흐름 | ClockManager, chess.js, historyRepo |
| `SingleAdapter` | AI 자동 응답·힌트·무르기·분석 | StockfishEngine, SingleDifficulty |
| `LocalAdapter` | 핫시트 합의 흐름·보드 자동 회전·색 교대 | (베이스만으로 충분) |
| `AdventureRunController` | 노드 진행·인벤토리·HP·골드·별의 조각·막 전환 | AdventureChessManager, MapGenerator, ItemSystem, MetaStore(`metaStore.ts`), runPersist |

각 컨트롤러는 SolidJS 컴포넌트 트리 안에서 라우트 컴포넌트가 `onMount`로 생성하고 `onCleanup`에서 `destroy()`를 호출한다. AdventureRunController는 `activeRun` 전역 시그널로 모험 라우트 컴포넌트들이 공유한다.

## 3. Interface (SolidJS ↔ Phaser)

두 레이어는 **SolidJS Store**를 단일 진실의 원천으로 하고, **Event Bus**로 보조한다.

- **Solid → Phaser**: "기물 강화 아이템 사용", "노드 진입" 등 명령 전달
- **Phaser → Solid**: "체력 변화", "전투 종료", "이동 완료" 등 이벤트 전달

### State Synchronization

- **Single Source of Truth**: 게임의 핵심 상태(기물 위치, HP, 인벤토리, 노드 진행)는 SolidJS의 **내장 Store**(`createStore`)에서 유일한 진실의 원천으로 관리.
- **Phaser as View**: Phaser는 게임 로직의 상태를 직접 수정하지 않으며, Store의 변경을 구독(Subscribe)하여 스프라이트 위치 이동, Tween 애니메이션, 이펙트 등 '시각적 렌더링'만 수행.
- **Action Flow**: 유저 상호작용(Phaser Canvas 클릭) → Action 이벤트 발행 → SolidJS Store 업데이트 → 상태 변경 전파 → Phaser 렌더링 업데이트.

## 4. Core Modules

### 4.1 Chess Manager

- `chess.js`를 래핑하여 게임의 논리적 상태(FEN)를 유지.
- 클래식: 표준 합법 수 검증·종료 조건 판정.
- 모험: 합법 수 검증은 동일하나, 공격 판정 시 'HP 감소 → 캡처 여부 결정' 로직을 추가.

### 4.2 AI Engine (Stockfish Worker)

- Main Thread를 방해하지 않도록 **Web Worker** 내에서 Stockfish.js 실행.
- UCI 프로토콜로 통신.

#### UCI 명령어 흐름

```
[Main Thread]                          [Worker]
     │                                    │
     │── postMessage('uci') ─────────────▶│
     │◀────────────── 'uciok' ────────────│
     │                                    │
     │── postMessage('isready') ─────────▶│
     │◀────────────── 'readyok' ──────────│
     │                                    │
     │── 'setoption name UCI_Elo ...' ───▶│
     │── 'position startpos moves ...' ──▶│
     │── 'go movetime 1000' ─────────────▶│
     │◀────────────── 'bestmove e2e4' ────│
```

- 사용처: 클래식 싱글의 사용자 상대, 모험 모드의 적 AI.
- 동시 다중 인스턴스 방지: 한 번에 하나의 'go' 명령만 처리. 이전 명령 진행 중이면 'stop' 후 새 명령.

### 4.3 Stage Generator (Adventure)

- 그래프 기반의 무작위 노드 생성 알고리즘.
- 노드 종류 분포: Battle 60%, Elite 10%, Shop 10%, Event 15%, Rest 5% (보스 외).
- 제약: 같은 행 같은 종류 연속 금지, 막 마지막 직전 노드는 Rest 보장, 1막 첫 노드는 Battle 고정.

### 4.4 Item System (Adventure)

- 아이템 데이터베이스 (JSON) → 등급별 풀 구성.
- 슬롯 관리: 기물별 2슬롯 + 글로벌 모디파이어 인벤토리.
- 효과 적용: `Piece` 스탯 계산 시 장착 아이템 + 글로벌 모디파이어 + 캐릭터 패시브를 합산.

### 4.5 Meta Store (Adventure)

- IndexedDB 기반 영구 저장.
- `MetaProgress` 읽기/쓰기, 별의 조각 적립, 해금 트리 상태 관리.
- 런 종료 시 자동 정산.

## 5. Backend Communication

- **Hono API**: RESTful 엔드포인트를 통해 JSON 기반 데이터 교환.
- **Bun SQLite**: 단일 파일 데이터베이스를 사용하여 빠른 조회 및 저장.
- 게임플레이는 서버 없이 동작 가능 (오프라인 우선).
- 서버 기능: 계정 동기화(옵션), 랭킹, 도전과제 검증.

## 6. Storage Path

| 데이터 | 클라이언트 저장소 | 서버 저장소 |
|---|---|---|
| 진행 중인 런 | IndexedDB | — |
| MetaProgress | IndexedDB | (옵션) SQLite 동기화 |
| GlobalSettings | IndexedDB | (옵션) SQLite 동기화 |
| 기보 히스토리 | IndexedDB | — |
| 랭킹/도전과제 | — | SQLite |

## 7. Module Dependency Graph (실 구현)

```
SolidJS Store (gameStore)
  ├── ui.clock  (← ClassicSceneControllerBase 갱신)
  ├── ui.status (← 종료 전이 호스트)
  ├── ui.localRequest  (← LocalAdapter 합의 흐름)
  ├── ui.aiThinking    (← SingleAdapter)
  ├── adventure (← AdventureRunController)
  └── board (FEN)

metaStore (전역 신호)
  ↑ ensureMetaLoaded / updateMeta
  ├── MainMenu (별의 조각 표시)
  ├── AdventureEntry (캐릭터 잠금 반영)
  └── MetaProgress 화면

ClassicSceneControllerBase
  ├── ChessManager (chess.js 격리)
  ├── ClockManager
  ├── historyRepo (IndexedDB)
  └── gameStore.setOrientation/setClockSnapshot/...

SingleAdapter ──── extends ─── ClassicSceneControllerBase
  └── StockfishEngine (Web Worker) + SingleDifficulty 프리셋

LocalAdapter ──── extends ─── ClassicSceneControllerBase
  └── gameStore.localRequest (합의 모달 호스트)

AdventureRunController
  ├── AdventureChessManager (chess.js + HP/캡처)
  ├── MapGenerator
  ├── data/{items,characters,events,unlocks,globalModifiers}
  ├── runPersist (IndexedDB `adventure:run`)
  └── gameStore.snapshotAdventureRun

Shared
  ├── eventBus (Solid ↔ Phaser, 단방향: cmd:* / 양방향: state:board)
  └── BoardScene (eventBus 구독, 200ms 회전 트랜지션, HP 오버레이는 M5)
```

### 7.1 chess.js 격리

`chess.js`는 도메인 외부로 누출되지 않는다. `client/src/lib/chess/ChessManager.ts` 한 파일에서만 `from 'chess.js'`로 import하며, 외부 코드는 ChessManager가 재export한 `Square`/`PieceSymbol`/`Color` 타입을 사용한다.

### 7.2 IndexedDB 키 네임스페이스

| 키 | 데이터 | 라이프사이클 |
|---|---|---|
| `settings` | GlobalSettings | 앱 전역 |
| `meta:progress` | MetaProgress (totalStarShards, unlockedCharacters, unlockedItemPools, unlockedLocations, permanentBonuses) | 모험 영구 |
| `meta:runStats` | RunStats (totalRuns / totalVictories / totalBossClears / bossClearsByAct / 누적 골드·노드·Legendary·shop) | 모험 영구 (M6+) |
| `adventure:run` | AdventureRunState | 런 진행 중만 |
| `history:index` | string[] (HistoryEntry ID 최대 200개) | 영구 |
| `history:{id}` | HistoryEntry | 영구 |

### 7.3 모험 보드 인터랙션 (M5)

모험 라우트가 BoardScene 클릭을 가로채기 위해 `gameStore.setAdventureClickHandler(handler)`로 콜백을 등록한다. eventBus의 `board:squareClicked`는 항상 단일 진입점(gameStore의 listener)으로 들어와 `mode === 'adventure'`이면 `adventureClickHandler`로 위임하고, 그 외에는 클래식 `handleSquareClick`을 호출한다. 이로써 라우트 전환 race에서 다중 핸들러가 등록되는 문제를 차단한다.

```
[BoardScene pointerup] → eventBus.emit('board:squareClicked', { square })
       ↓
[gameStore listener] — state.mode 분기
       ├─ 'adventure' → adventureClickHandler(square)  // AdventureBattle/Boss
       └─ 그 외      → handleSquareClick(square)        // 클래식 chess.js
```

AdventureBattle/Boss는 `controller.attemptBoardMove(uci)` 호출 → 컨트롤러가 `AdventureChessManager.tryMove`로 SPEC §5.1~5.5(HP 차감 캡처/앙파상/승급/스테일메이트) 처리 → `setAdventureBoardSnapshot(fen, hps)` 단일 batch로 store/BoardScene 갱신. 그 다음 microtask에서 `scheduleAiReply()` 발화.

### 7.4 AudioManager (M5)

`client/src/lib/audio/AudioManager.ts`는 Web Audio API 기반의 SFX (사인파 placeholder) 매니저다. 브라우저 정책상 사용자 제스처 이후에만 `AudioContext`를 만들 수 있어, `main.tsx`가 첫 `pointerdown`/`keydown`에서 `audioManager.init()` 1회 호출한다. `settingsStore`는 `audio.bgmVolume/sfxVolume/muted` 변경 effect로 `applyVolumes()`를 자동 호출하므로, 설정 모달의 슬라이더가 즉시 반영된다.

`playBgm`은 정식 BGM 파일 도입 전까지 의도적 noop이며, M6+ 외부 자산 작업에서 Howler.js 또는 Audio 태그로 활성화한다.

### 7.5 server 워크스페이스 (M5 스켈레톤)

루트 `package.json`의 workspaces에 `server`가 추가됨. `server/src/index.ts`는 Hono로 `/health`, `/api/leaderboard`, `/api/achievements/verify`만 노출하는 골격이다. 클라이언트는 오프라인 우선이라 server는 옵션 의존이며, M6+에서 SQLite + Drizzle 연결과 실제 API 구현이 들어간다. Vite tree-shake는 client 빌드에 hono를 포함하지 않으므로 워크스페이스 추가만으로는 client 번들에 영향이 없다.

### 7.6 Sprite identity·Tween (M6+)

BoardScene은 `sprites: Map<square, PieceSprite>`로 기물 sprite의 identity를 보존한다. PieceSprite는 Phaser Container이고, 안에 piece image와 (모험 모드 한정) HP 바 rect 2개가 자식으로 들어간다. 매 `state:board` emit마다 diff를 계산:

- `lastMove`가 있고 `noPieceAnim`/`instant`가 모두 false면 `applyAnimated` 분기 — 200ms Sine.easeInOut Tween으로 sprite Container를 from→to로 이동. 캡처/앙파상의 victim은 150ms 페이드아웃, 캐슬링은 룩 동시 Tween, 승급은 Tween 완료 후 image texture swap.
- 그 외(리셋/언두/리와인드/회전/보스 페이즈 전환)는 `applyInstant` — 즉시 destroy/spawn/위치 재배치.

`activeTween.complete()`로 새 render가 Tween 도중 들어오면 이전을 즉시 완결한 뒤 새 diff를 적용해 race를 방지한다. Scene SHUTDOWN 시 `tweens.killAll()` + sprite Map 전체 정리.

`LastMove`(`bridge/eventBus.ts`)는 `MoveDescriptor → toRichLastMove(ChessManager)`로 합성된다. 모험 모드는 `AdventureRunController.syncBoard`가 `AdventureMoveResult.lastMove`를 같은 헬퍼로 변환해 store에 전달한다.

HP 바 변화는 `tweenHpBar`로 200ms width tween + 색 보간(>50% 녹/>20% 황/그 외 적). 감소 시 image에 빨간 tint 100ms를 추가해 피격 시각 피드백 제공. 연속 데미지로 인한 jitter 방지를 위해 `tweens.add` 전에 `killTweensOf(hpFg)`로 기존 tween을 취소한다.

AI 응답은 `AdventureRunController.scheduleAiReply`가 `setTimeout(250ms)`로 지연 — Tween이 화면에 보일 시간을 확보. reduced motion 옵션 ON이면 0ms로 단축.

### 7.7 보드 테마·캐릭터 스킨 (M6+)

`BoardRenderState`에 직교 두 필드 `theme: 'default'|'forest'|'ocean'`과 `characterId: 'standard'|'assassins'|'saints'`가 있다. gameStore의 `emitBoard()`가 두 헬퍼로 자동 선택:

- `selectTheme()`: mode='adventure'이면 act 2→forest, 3→ocean, 그 외 default. 클래식은 default.
- `selectCharacter()`: mode='adventure'이면 run.characterId가 assassins/saints면 그대로, 그 외 standard. 클래식은 standard.

BoardScene이 payload 수신 시 두 변화를 별개 분기로 처리:

- **테마 변경**: `drawTilesAndCoords()`만 재호출. sprite Map 영향 없음. `THEME_COLORS` map이 (light, dark) 색을 결정.
- **캐릭터 변경**: 진행 중 Tween을 `complete()`로 종료 → sprite Map 전체 destroy → 이후 orientation/render 분기에서 새 텍스처 키 `${characterId}-${PIECE_KEY[ch]}` 형식으로 sprite 재생성.

두 분기는 독립 — orientation 변경과 동시에 와도 각자 정리 후 render가 새 상태를 그린다.

generator(`scripts/generate-piece-placeholders.ts`)는 character 차원 추가로 36 PNG를 `client/public/assets/pieces/{characterId}/{w,b}{K,Q,R,B,N,P}.png` 디렉토리에 출력한다. `CHARACTER_PALETTES`에 캐릭터별 백 진영 색(wFill/wOutline) 정의, `BLACK_PALETTE`에 흑 진영 공통 baseline. PIECE_GLYPH(32x32 ASCII)는 캐릭터 무관 — 색만 다르다.

BootScene이 36 텍스처 키(`'standard-wK'`/`'assassins-wK'`/`'saints-wK'` 등)를 preload하므로 캐릭터 전환 시 추가 reload 없이 즉시 텍스처 swap 가능.

매핑 매트릭스:

| 모드 | act | theme | characterId |
|---|---|---|---|
| 클래식 (싱글/로컬멀티) | — | default | standard |
| 모험 정규단 | 1/2/3 | default/forest/ocean | standard |
| 모험 암살자단 | 1/2/3 | default/forest/ocean | assassins |
| 모험 신성단 | 1/2/3 | default/forest/ocean | saints |

총 11 조합. 추가 캐릭터·테마는 각 map에 항목 추가만으로 자연스럽게 확장 가능.

### 7.8 다이얼로그 PNG 아이콘 (M6+ Cycle B)

게임 안 sprite와 UI 다이얼로그의 시각 톤을 통일하기 위해 PromotionDialog·GameOverDialog가 generator PNG를 직접 사용한다. gameStore에 export된 헬퍼 `getActiveCharacterId(): CharacterId`(emitBoard의 selectCharacter와 동일 로직 — 한 곳 정의)를 dialogs가 호출.

- **PromotionDialog** (`client/src/components/dialogs/PromotionDialog.tsx`): 4 선택지(Q/R/B/N)에 `<img src="/assets/pieces/${characterId}/${side}${key}.png">`. 폰 색은 `pendingPromotion.to.charAt(1)`로 결정 (rank 8→`'w'`, 1→`'b'` — chess.js promotion 인보컨트가 두 rank만 허용).
- **GameOverDialog** (`client/src/components/dialogs/GameOverDialog.tsx`): `statusEmoji()` 문자열 헬퍼 폐기 → `StatusGlyph` 컴포넌트. winner 케이스(checkmate/resignation/timeout)는 `<img src=".../${winner}K.png">` 96px, 그 외 무승부는 🤝 텍스트 유지. `<Show when={isWinnerStatus(props.status) ? props.status : null}>` 패턴으로 SolidJS reactivity 유지(`const s = props.status`를 컴포넌트 body 최상위에서 읽는 것은 setup 시점 1회만 평가되어 stale).

모든 `<img>`는 `style={{ 'image-rendering': 'pixelated' }}` 인라인 적용으로 픽셀 아트 선명도 보장. Phaser BootScene이 같은 PNG 36개를 preload하지만 SolidJS `<img>`는 별도 DOM request라 브라우저 HTTP 캐시를 공유 — 첫 로드 시 미세한 깜빡임 가능하나 무시 가능.

장식 아이콘(HeaderBar/AdventureEntry/MainMenu의 ♞/♟/♛)은 본 작업 범위 외 — 후속에서 같은 PNG 자산을 활용한 `<PieceIcon>` 재사용 컴포넌트로 통일 예정.

### 7.9 RunStats / 통계·도움말 라우트 (M6+)

모험 누적 통계 `RunStats`(`shared/adventure.ts`)는 `MetaProgress`와 별개의 kv 키 `meta:runStats`에 저장된다. `client/src/lib/storage/runStatsRepo.ts`가 단일 진입점:

- `loadRunStats()` — 기본값으로 보강해서 읽기.
- `saveRunStats(stats)` — 덮어쓰기.
- `recordRunEnd(run, outcome, startingGold)` — 런 종료 시 1회 호출. 보스 클리어를 act별로 카운트하고, "획득 골드"는 `run.gold - startingGold`로 시작 골드 베이스라인을 제외해 누적.
- `recordShopPurchase()` — 현재는 결과 도전과제 평가가 shop **노드 통과**를 카운트하므로 호출처 없음 (후속에서 실제 구매 hook 추가 시 사용).

`AdventureResult.onMount`가 `recordRunEnd` 호출 후 결과 stats를 `evaluateAchievementsOnRunEnd(run, outcome, meta, stats)`로 전달 → 누적형 도전과제(`boss-slayer`, `legend-trio`)가 RunStats 기반으로 평가된다.

라우트:

- `/stats` (`client/src/routes/Stats.tsx`) — `createResource(loadRunStats)`로 비동기 로드. 0건이면 empty hint, 그 외엔 카드 그리드 + 막별 보스 클리어. HeaderBar의 📊 버튼이 진입점(이전 disabled placeholder를 활성화).
- `/help` (`client/src/routes/Help.tsx`) — 클래식 룰/모험 룰/조작/접근성 4섹션 정적 i18n 텍스트. HeaderBar의 ❓ 버튼이 진입점 (신규).

i18n 키는 `stats.*`, `help.*`, `menu.help`, `adventure.result.*`로 ko/en 양립. 기존 이벤트/아이템/캐릭터 본문 다국어는 별도 사이클.

### 7.10 모험 노드 진행 룰 — advanceTo / availableNextNodes / 전투 포기 (M6+)

이전엔 사용자가 보드 화면을 떠날 수 없도록 ← 버튼을 disabled로 막아 노드 진행이 항상 "클리어 후 떠남"으로 보장됐다. M6+에서 진행 중 전투 포기를 허용하면서 다음 두 규칙을 명시화:

1. **클리어 마킹은 `markCurrentNodeCompleted` 단독 책임.** `advanceTo(nextId)`는 `currentNodeId`만 갱신하고 이전 노드의 `isCompleted`를 건드리지 않는다. (이전엔 advanceTo가 진입 시점에 자동 마킹해 포기 후에도 next가 열리는 버그가 있었다.)
2. **`availableNextNodes()`는 `currentNode.isCompleted === true`일 때만 `nextNodes` 반환.** 미완료 상태(전투 포기 등)에서는 사용자가 같은 노드만 재진입할 수 있다 — 즉 다시 시도해 클리어해야 다음으로 진행.

전투 포기 흐름 (`AdventureBattle.tsx` / `AdventureBoss.tsx`):

- 좌상단 ← 버튼은 항상 활성화. 진행 중에는 라벨이 "전투 포기" / "보스전 포기".
- 클릭 → `Modal`로 확인 대화상자 (`계속하기` / `전투 포기`).
- 확인 → `navigate('/adventure/run/map')`. SolidJS 라우트 unmount의 `onCleanup`이 `setAdventureClickHandler(null)` + `controller.leaveBoardNode()` 처리. 노드는 미완료 상태로 남고, 다시 진입 시 `enterBoardNode()`가 새 보드(시작 진형 + HP)로 재시작.
- 비전투 노드(shop/event/rest)는 사용자가 "맵으로" 버튼을 누를 때 `markCurrentNodeCompleted` 호출 — leave 시점 자동 클리어.

### 7.11 ChessManager.swapTurnOnly — 모험 damaged 후 차례 흐름 (M6+)

SPEC §5.1의 "공격 시도 = 한 턴 소비" 정의를 chess.js 위에서 표현하기 위해, `AdventureChessManager.tryMove`의 캡처 실패(`remainingHp > 0`) 분기는 chess.js move를 적용하지 않고 attacker를 원위치한다. 그 결과 chess.js 내부 active color가 swap되지 않아 다음 차례 흐름(`handleBoardClick`의 `chess.turn() !== 'w'` 가드, `scheduleAiReply`의 `turn() !== 'b'` 가드)이 모두 막혀 게임이 정지하던 버그가 있었다.

`ChessManager`에 `swapTurnOnly()` 메서드를 추가해 FEN을 직접 조작:

- active color swap (`w` ↔ `b`)
- en-passant target 무효화 (`-`) — 한 턴 소비됐으므로 권리 소멸
- halfmove clock +1
- 흑→백 swap 시 fullmove number +1

`AdventureChessManager.tryMove`의 damaged 분기에서 `chess.swapTurnOnly()` 호출. `previewMove` / `legalDestinations` / `evaluateNaturalStatus`는 모두 chess.js의 active color를 기반으로 동작하므로 swap 이후엔 새 차례 진영 기준 합법수·종료 평가가 자동으로 정확해진다.

`ChessManager.moves()`는 외부 `moveLog` 길이를 반환하므로 chess.load로 인한 chess.js 내부 history 비움에 영향받지 않는다. `applyTurnStartHeal`의 멱등 키(`${side}:${moves().length}`)도 그대로 유효.

### 7.12 dev `__chesslike` 정식화 (M6+)

기존 `main.tsx`의 ad-hoc 노출(`window.__chesslike = { game, bus }`)을 `client/src/lib/devApi.ts`로 분리해 타입화:

```ts
export interface ChesslikeDevApi {
  game: typeof gameStore;
  bus: typeof eventBus;
  adventure: {
    current(): ReturnType<typeof activeRun>;
    giveItem(itemId: string): boolean;
    addGold(amount: number): boolean;
  };
  stats: { load: typeof loadRunStats; save: typeof saveRunStats };
}
```

`main.tsx`는 `import.meta.env.DEV` 가드 내에서 `import('@/lib/devApi').then(m => m.installDevApi())`로 dynamic import. 프로덕션 번들은 본 모듈을 import하지 않아 자동 tree-shake.

콘솔 사용 예:
```js
__chesslike.adventure.giveItem('crown-of-eternity');
__chesslike.adventure.addGold(100);
await __chesslike.stats.load();
```

별도 디버그 패널 UI는 후속 작업.

## 8. 관련 문서

- [SPEC.md](./SPEC.md) — 타입 정의와 데이터 구조
- [GAME_DESIGN.md](./GAME_DESIGN.md) — 게임 디자인 개요
- [UI_FLOW.md](./UI_FLOW.md) — 사용자 흐름
