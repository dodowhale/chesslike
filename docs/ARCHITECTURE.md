# Architecture Design: Pixel Chess Roguelike

## 1. System Overview

본 프로젝트는 **Hybrid Component Architecture**를 채택합니다.

- **SolidJS**: 고수준 UI(메뉴, 인벤토리, 다이얼로그) 및 전역 상태 관리.
- **Phaser 3**: 저수준 게임 루프, 렌더링, 물리, 애니메이션 처리.

## 2. Mode Routing

```
┌─────────────────────────────┐
│         Main Menu           │
└──────────┬─────────┬────────┘
           │         │
           ▼         ▼
    ┌──────────┐  ┌────────────────────┐
    │ Classic  │  │     Adventure      │
    │  Scene   │  │      Scene         │
    │Controller│  │     Controller     │
    └────┬─────┘  └──────────┬─────────┘
         │                   │
   ┌─────┴──────┐    ┌───────┼──────────┐
   ▼            ▼    ▼       ▼          ▼
SingleAdapter LocalAdapter MapScene BattleScene EventScene
   │            │       │       │           │
   └─stockfish  └─Timer └──── chess.js + ItemSystem + MetaStore
     Worker
```

| 컨트롤러 | 역할 | 의존 모듈 |
|---|---|---|
| `ClassicSceneController` | submode 분기 (`SingleAdapter` / `LocalAdapter`), 시계, 종료 처리 | chess.js, Timer, (싱글) stockfishWorker |
| `AdventureSceneController` | 노드 라우팅, 전투/이벤트/상점/휴식/보스 씬 전환 | chess.js, MapGenerator, ItemSystem, MetaStore, stockfishWorker |

각 컨트롤러는 SolidJS 컴포넌트 트리 안에서 Phaser 인스턴스 위에 얹어진다.

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

## 7. Module Dependency Graph

```
ClassicSceneController
  ├── chess.js
  ├── Timer
  └── (singleAdapter) → stockfishWorker

AdventureSceneController
  ├── chess.js
  ├── MapGenerator
  ├── ItemSystem
  ├── MetaStore (→ IndexedDB)
  └── stockfishWorker

Shared
  ├── SolidJS Store
  ├── Event Bus
  └── PhaserBridge (Solid ↔ Phaser)
```

## 8. 관련 문서

- [SPEC.md](./SPEC.md) — 타입 정의와 데이터 구조
- [GAME_DESIGN.md](./GAME_DESIGN.md) — 게임 디자인 개요
- [UI_FLOW.md](./UI_FLOW.md) — 사용자 흐름
