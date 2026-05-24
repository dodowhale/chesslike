# Technical Specification: Pixel Chess Roguelike

## 1. Tech Stack Decision

### Frontend: SolidJS + Phaser.js
- **Why SolidJS?**: 리액트의 Virtual DOM 오버헤드가 없으며, 컴파일 타임 반응성을 제공하여 게임 UI(체력 바, 애니메이션 피드백) 연산이 매우 빠릅니다. Phaser와의 연동 시 상태 동기화가 더 직관적입니다.
- **Rendering**: Phaser 3 (Canvas/WebGL) — 게임 월드 및 기물 애니메이션 담당.
- **State Management**: Solid-JS Signals & Stores — 게임의 전역 상태(기물 위치, 플레이어 스탯) 관리.

### Backend: Bun + Hono
- **Runtime**: Bun (빠른 시작 속도 및 내장 TypeScript 지원)
- **Framework**: Hono (초경량 프레임워크, 로컬 개발 및 배포 최적화)
- **Database**: SQLite (Bun 내장 지원 활용, 세이브 데이터 및 랭킹 관리)

### AI & Logic
- **Chess Engine**: Stockfish.js — **Web Worker**에서 구동. 클래식 싱글의 AI 대전과 모험 모드 적 AI 양쪽에서 사용.
- **Logic Library**: chess.js — 체스 룰(합법 수, 앙파상, 캐슬링) 검증 및 FEN/PGN 처리.
- **로컬 저장**: IndexedDB (모험 메타 진행·기보 히스토리·설정)

## 2. Mode Structure

| 최상위 모드 | 서브모드 | 식별자 |
|---|---|---|
| 클래식 | 싱글 | `mode='classic'`, `submode='single'` |
| 클래식 | 로컬멀티 | `mode='classic'`, `submode='local'` |
| 모험 | — | `mode='adventure'` |

모드 간 진행도는 완전 독립. 자세한 정책은 [GAME_DESIGN.md §7](./GAME_DESIGN.md#7-진행도-정책) 참조.

## 3. Architecture Overview

- **Client-Side Heavy**: 대부분의 게임 로직(체스 룰, 모험 모드 노드 진행, 전투 처리)은 브라우저에서 실행.
- **API Server (선택)**: 랭킹·도전과제·계정 동기화에만 사용. 게임플레이는 오프라인 가능.
- **Asset Pipeline**: Aseprite 등을 활용한 2D 도트 에셋 (32x32 기준).

자세한 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md) 참조.

## 4. Data Structure (Core)

### 4.1 Mode & Configs

```typescript
type Mode = 'classic' | 'adventure';
type ClassicSubmode = 'single' | 'local';

interface ClassicTimeControl {
  kind: 'preset' | 'custom' | 'unlimited';
  preset?: 'bullet' | 'blitz' | 'rapid' | 'classical';
  initialSec?: number;   // custom
  incrementSec?: number; // custom
}

interface SingleModeConfig {
  difficulty: 'novice' | 'amateur' | 'intermediate' | 'advanced' | 'master' | 'custom';
  elo?: number;          // custom일 때 600~3000
  thinkMs?: number;      // custom일 때 100~5000
  contempt?: number;     // custom일 때 -100~+100
  hintsEnabled: boolean;
  undoLimit: number;     // -1이면 무제한, 0이면 비활성
  timeControl: ClassicTimeControl;
  playerColor: 'w' | 'b' | 'random';
}

interface LocalMultiConfig {
  timeControl: ClassicTimeControl;
  autoRotateBoard: boolean;
  allowUndo: boolean;       // 양측 합의 시 무르기
  allowDrawOffer: boolean;
}

interface ClassicConfig {
  submode: ClassicSubmode;
  single?: SingleModeConfig;
  local?: LocalMultiConfig;
}
```

### 4.2 Adventure: Pieces, Items, Modifiers

```typescript
interface Modifier {
  hp?: number;
  attack?: number;
  range?: number;
  jumpOver?: boolean;       // 다른 기물 위를 점프 가능
  healPerTurn?: number;
  thornsDamage?: number;
}

interface Item {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  category: 'stat' | 'effect' | 'passive';
  description: string;
  modifier: Modifier;
}

interface PieceLoadout {
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  side: 'w' | 'b';
  startingSquare: string;   // e.g. 'e1'
  baseStatsOverride?: { hp?: number; attack?: number };
  startingItems?: Item[];
}

interface Piece {
  id: string;
  type: 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
  side: 'w' | 'b';
  hp: number;
  maxHp: number;
  attack: number;
  items: Item[];            // 최대 2슬롯
}

interface Passive {
  id: string;
  name: string;
  description: string;
  trigger: 'turn-start' | 'turn-end' | 'on-capture' | 'on-captured' | 'on-castle' | 'always';
  effect: Modifier;
}
```

### 4.3 Adventure: Character, Map, Run

```typescript
interface Character {
  id: string;
  name: string;
  description: string;
  startingPieces: PieceLoadout[];
  passives: Passive[];      // 캐릭터 고유 패시브
  startingItems: Item[];
  isUnlocked: boolean;
  unlockCost?: number;      // 별의 조각
}

interface MapNode {
  id: string;
  type: 'battle' | 'elite' | 'boss' | 'shop' | 'event' | 'rest';
  act: 1 | 2 | 3;
  isCompleted: boolean;
  nextNodes: string[];      // 다음 이동 가능한 노드 ID 목록
}

interface AdventureRunState {
  characterId: string;
  act: 1 | 2 | 3;
  currentNodeId: string;
  map: MapNode[];           // 현재 막의 노드 그래프
  pieces: Piece[];
  inventory: Item[];        // 미장착 아이템
  globalModifiers: Modifier[];
  gold: number;
  starShardsThisRun: number; // 런 종료 시 MetaProgress.totalStarShards로 합산
}

interface MetaProgress {
  totalStarShards: number;
  unlockedCharacters: string[];
  /** 개별 아이템 ID 해금 (추후 캐릭터별 시작 아이템 등에 사용). */
  unlockedItems: string[];
  /** 아이템 풀 키 해금 ('rare-pool' / 'legendary-pool'). */
  unlockedItemPools: string[];
  unlockedLocations: string[];
  permanentBonuses: {
    startGold?: number;
    startHpBonus?: number;
    firstNodeRewardGuaranteed?: boolean;
  };
}
```

### 4.4 Game State (Root)

```typescript
interface GameState {
  mode?: Mode;              // 메인 메뉴 등 모드 미결정 상태에서는 undefined
  classic?: ClassicConfig;
  adventure?: AdventureRunState;
  board: string;            // FEN string
  turn: 'w' | 'b';
}
```

런타임 별도 저장:
- `MetaProgress` — 모험 모드 영구 진행
- `GlobalSettings` — 사운드/언어/테마 등 앱 전체
- `HistoryEntry` — 게임 종료 시 자동 저장(클래식·모험 공통 슬롯)

### 4.5 Runtime UI/Adventure Misc

```typescript
/** 클래식 모드 한정 시계 스냅샷. 컨트롤러가 매 frame마다 store에 기록. */
interface ClockSnapshot {
  whiteMs: number;
  blackMs: number;
  turn: 'w' | 'b';
  running: boolean;
  flagged?: 'w' | 'b';
  unlimited: boolean;
}

/** 로컬멀티 핫시트 합의 요청(무르기/무승부/기권). */
interface LocalRequest {
  kind: 'undo' | 'draw' | 'resign';
  requestedBy: 'w' | 'b';
}

/** 게임 종료 시 자동 저장되는 히스토리 항목. */
interface HistoryEntry {
  id: string;            // makeId() — Date+random
  createdAt: number;
  mode: 'classic' | 'adventure';
  submode?: 'single' | 'local';
  difficulty?: string;   // single: 난이도 키 / adventure: 캐릭터 ID
  playerColor?: 'w' | 'b';
  result: string;        // '1-0' | '0-1' | '1/2-1/2' | '*'
  resultDetail: string;  // GameStatus.kind 또는 'victory'/'defeat'
  pgn: string;           // chess.js가 출력한 SAN PGN(모험은 빈 문자열)
  movesCount: number;
}
```

## 5. Combat & Edge Cases (Adventure Mode)

### 5.1 일반 전투 처리

- 이동 시 도착 칸에 적 기물이 있으면 캡처 시도:
  - 데미지 = `attacker.attack` (글로벌 모디파이어/패시브 적용 후)
  - `defender.hp -= damage`
  - `defender.hp <= 0` → 캡처 성공, attacker가 그 칸 차지
  - `defender.hp > 0` → attacker는 원위치, defender만 HP 감소

### 5.2 앙파상 (En Passant)

- 이동 타겟(`to`) 칸이 아닌, **스쳐 지나간 폰의 실제 좌표**를 추적하여 해당 폰의 HP 차감.
- HP가 0이 되면 캡처 처리, 0보다 크면 폰만 살아남음.

### 5.3 폰 승급 (Promotion)

- 폰이 끝 열에 도달하여 승급할 경우, **잔여 HP/장착 아이템과 무관하게 승급 기물의 베이스 스탯으로 완전 갱신**.
- 단, 폰의 슬롯에 장착된 아이템은 승급 기물에 그대로 이어짐 (슬롯 보존).

### 5.4 보스 페이즈 전환

- 보스의 HP가 0이 되어도 페이즈가 끝나지 않음. 보스 기물의 능력이 약화될 뿐.
- 페이즈 종료 조건은 **체크메이트만**.
- 페이즈 전환 시 보스의 기물 구성·능력이 갱신되며, 플레이어의 기물 HP는 유지 (아이템도 유지).

### 5.5 스테일메이트

- 클래식: 무승부
- 모험: **패배 처리** (런을 압박하는 디자인 선택). 단, 보스전에서는 양측 모두 진행 불가 시 무승부 인정 — 보스가 스테일메이트 됐다면 플레이어 승, 플레이어가 스테일메이트 됐다면 패.

### 5.6 캐릭터 패시브 트리거

- 트리거 시점에 따라 매 턴(`turn-start`/`turn-end`), 캡처 시(`on-capture`/`on-captured`), 캐슬링 시(`on-castle`), 항상 적용(`always`)으로 분류.
- 여러 패시브가 동시에 트리거될 경우 캐릭터 정의 순서대로 적용.

## 6. Storage & Persistence

| 데이터 | 저장 위치 | 키 | 동기화 |
|---|---|---|---|
| 진행 중인 런 (AdventureRunState) | IndexedDB | `adventure:run` | 로컬만 |
| MetaProgress | IndexedDB | `meta:progress` | 옵션: 서버 동기화 |
| GlobalSettings | IndexedDB + localStorage 백업 | `settings` | 옵션: 서버 동기화 |
| 기보 히스토리 (HistoryEntry) | IndexedDB | `history:index` + `history:{id}` | 로컬만 |
| 랭킹·도전과제 | 서버 (SQLite) | — | 필수 (서버 기능 사용 시) |

IndexedDB는 `idb-keyval` 라이브러리를 거쳐 접근하며, localStorage 백업이 자동 적용된다(quota 부족이거나 비공개 모드 환경 대비).

## 7. 관련 문서

- [GAME_DESIGN.md](./GAME_DESIGN.md) — 게임 디자인 개요
- [ARCHITECTURE.md](./ARCHITECTURE.md) — 시스템 아키텍처
- [모드별 상세 문서](./modes/) — COMMON/SINGLE/LOCAL_MULTI/ADVENTURE
