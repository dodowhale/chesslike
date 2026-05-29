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

/** 모험 도전과제 정의 (M5). */
interface AchievementDef {
  id: string;            // 'first-clear' | 'no-undo-run' | 'assassins-clear' | 'item-collector' | 'legendary-find' …
  name: string;
  description: string;
  reward: number;        // 별의 조각
}
```

도전과제 잠금해제 ID는 `MetaProgress.unlockedLocations` 배열에 누적된다(필드명이 "장소" 함의이지만 SPEC §4.3 이후 도전과제도 함께 수용하기로 결정). `evaluateAchievementsOnRunEnd(run, outcome, meta)`는 모험 런 종료 시점에 조건을 평가해 새로 충족된 도전과제를 반환하며, 호출처는 `meta.unlockedLocations.push` + `meta.totalStarShards += reward`로 합산한다.

### 4.4 비주얼·인터랙션 타입 (M6+, 시각 시스템)

게임 데이터 타입은 아니지만 BoardScene/UI가 공유하는 비주얼 식별자(자세한 흐름은 ARCHITECTURE §7.6~§7.8 참조):

```ts
// client/src/lib/phaser/bridge/eventBus.ts
export type LastMoveKind = 'normal' | 'capture' | 'castling' | 'en-passant' | 'promotion';
export interface LastMove {
  from: string; to: string; kind: LastMoveKind;
  rookFrom?: string; rookTo?: string;
  victimSquare?: string;          // en-passant 시 캡처되는 폰의 실제 칸
  promotedTo?: string;             // promotion 시 'q'|'r'|'b'|'n'
  capturedKey?: string;            // 캡처된 sprite의 PIECE_KEY (예: 'bP')
}
export type BoardTheme = 'default' | 'forest' | 'ocean';
export type CharacterId = 'standard' | 'assassins' | 'saints';
```

`BoardRenderState`(eventBus.ts)에 `lastMove?: LastMove`, `theme?: BoardTheme`, `characterId?: CharacterId`가 옵셔널 필드로 들어가며, gameStore의 `emitBoard()`가 mode/act/run.characterId로 자동 결정해 전달한다. `Character.id`(§4.1)와 `CharacterId` 두 타입이 의도적으로 분리되어 있는데, `CharacterId`는 sprite/PNG 디렉토리 식별자 (값 집합은 동일하지만 비주얼 시스템과 게임 데이터 모델을 격리).

## 5. Combat & Edge Cases (Adventure Mode)

### 5.1 일반 전투 처리 (결사의 캡처 & 양방향 피해)

- 이동 타겟 칸에 적 기물이 존재할 경우, FIDE 정규 행마에 맞춰 **캡처가 무조건 먼저 성공**한다 (방어자는 즉시 보드에서 제거).
- 캡처 완료 시 데미지 및 반격 데미지 정산:
  - 공격자 피해량: `attacker.hp -= defender.attack`
  - 만약 `attacker.hp <= 0`이 되면, 공격 기물 역시 사망하여 보드에서 즉시 제거된다 (`chess.remove(square)` 호출하여 해당 칸을 빈칸 처리).
  - 킹이 직접 캡처를 가해 반격 피해로 `king.hp <= 0`이 될 경우 게임은 즉시 패배로 종료된다.
- **기물 소실에 따른 킹 전가 피해**:
  - 아군 기물이 캡처당해 보드에서 제거되거나, 반격 데미지로 자멸할 때 플레이어 킹의 HP가 감소한다.
  - 피해량 공식: `playerKing.hp -= losePenalty(pieceType)` (폰: 2, 나이트/비숍: 5, 룩: 8, 퀸: 12).

### 5.2 앙파상 (En Passant)

- 앙파상 이동 시, 대상 폰은 즉시 캡처되어 제거된다.
- 앙파상을 행한 폰은 대상 폰의 ATK만큼 반격 피해를 입으며, `hp <= 0`이 되면 앙파상 최종 도달 칸(`to`)에서 사망하여 제거된다.

### 5.3 폰 승급 (Promotion)

- 폰이 끝 열에 도달해 승급할 경우, 최대 HP와 현재 HP 모두 승급된 기물의 베이스 HP로 100% 갱신(회복)된다.
- 승급한 기물의 공격력 역시 해당 기물의 베이스 ATK로 갱신된다.
- 폰 슬롯에 장착되어 있던 아이템은 승급한 기물로 그대로 유지(슬롯 보존)되며, 승급된 기물의 베이스 스탯에 아이템의 modifier가 즉시 합산되어 적용된다.

### 5.4 보스 페이즈 전환

- 보스의 HP가 0이 되어도 페이즈가 끝나지 않는다 (스탯/이동 범위가 디버프 처리될 뿐이다).
- 페이즈 종료 및 다음 페이즈 진입 조건은 오직 **체크메이트**뿐이다.
- 보스 킹이 체크메이트되어 페이즈가 전환될 때 보드는 부분 리셋(재배치)된다:
  - 플레이어의 살아남은 기물들은 현재의 HP/아이템을 유지한 채 플레이어의 시작 영역(1~2열)으로 재배치된다.
  - 보스는 다음 페이즈의 기물 레이아웃 FEN으로 보스 영역(7~8열)에 새로운 킹과 함께 재생성되어 배치된다.
  - 보드 FEN 상태는 이 재배치된 상태로 갱신되며, 차례는 백의 턴으로 초기화된다.

### 5.5 스테일메이트 (Stalemate)

- 클래식: 무승부.
- 모험:
  - **일반 노드**: 플레이어의 차례에 합법 수가 없을 시 **패배** 처리 (런 종료).
  - **보스전**: 보스의 차례에 합법 수가 없을 때(보스가 스테일메이트당함)는 플레이어의 **페이즈 클리어(또는 승리)**로 처리하며, 플레이어의 차례에 합법 수가 없을 때는 플레이어의 패배로 처리한다.

### 5.6 클래식 모드 기물 부족 시간패 무효 (FIDE 6.9조)

- 플레이어의 시간이 만료되었을 때, 상대방에게 체크메이트를 가할 수 있는 최소한의 합법적인 기물 조합이 남아있지 않다면(예: 킹 단독, 킹+비숍 1기, 킹+나이트 1기만 잔존), 시간이 만료된 플레이어는 패배하지 않고 **무승부** 처리된다.
- 이를 위해 `ClockManager`에서 시간 만료 이벤트 수신 시, 보드 FEN을 파싱하여 상대 기물 구성을 평가한 후 무승부 여부를 판별한다.


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
