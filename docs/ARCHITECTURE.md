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
  // + AdventureChessManager(도메인 로직 준비)
  // + 노드 진행/인벤토리/HP/골드/별의 조각
  // + advanceAct (1→2→3막)
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
| `meta:progress` | MetaProgress | 모험 영구 |
| `adventure:run` | AdventureRunState | 런 진행 중만 |
| `history:index` | string[] (HistoryEntry ID 최대 200개) | 영구 |
| `history:{id}` | HistoryEntry | 영구 |

## 8. 관련 문서

- [SPEC.md](./SPEC.md) — 타입 정의와 데이터 구조
- [GAME_DESIGN.md](./GAME_DESIGN.md) — 게임 디자인 개요
- [UI_FLOW.md](./UI_FLOW.md) — 사용자 흐름
