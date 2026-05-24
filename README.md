# Pixel Chess Roguelike

아기자기한 2D 도트 그래픽과 체스 시스템을 결합한 게임. 정통 체스와 로그라이크 모험을 한 화면에서 즐길 수 있습니다.

## 🚀 개요

- **장르**: 체스 + 로그라이크
- **플랫폼**: Web (Mobile Friendly)
- **두 가지 최상위 모드**:
  - 🏛 **클래식**: FIDE 정규 체스 룰을 따르는 정통 모드
    - **싱글**: Stockfish 기반 AI와 5단계 난이도(+ 커스텀 ELO) 대전
    - **로컬멀티**: 한 디바이스에서 2인 핫시트 대국 (보드 자동 회전, 합의 모달)
  - ⚔️ **모험**: HP·아이템·노드 맵으로 변주된 체스 로그라이크
    - Slay the Spire 식 분기 진행 (Battle/Elite/Shop/Event/Rest/Boss)
    - 영구사망 + 메타 진행(별의 조각) 해금
    - 테마 캐릭터(정규단·암살자단·신성단)와 등급형 아이템(Common~Legendary)

## 📊 현재 진행 상태

| 마일스톤 | 상태 |
|---|---|
| M0 공통 기반 | ✅ 완료 |
| M1 클래식 공통 + 싱글 | ✅ 완료 |
| M2 클래식 로컬멀티 | ✅ 완료 |
| M3 모험 모드 MVP | ✅ 완료 (실제 보드 전투는 M5로 위임) |
| M4 메타 진행 + 추가 콘텐츠 | ✅ 완료 |
| M5 폴리시 | ⏳ 진행 예정 |

자세한 진행 항목은 [docs/TODO.md](./docs/TODO.md) 참조.

## 🎮 모드별 한눈에 보기

| 모드 | 상대 | 룰 | 세션 길이 | 진행도 |
|---|---|---|---|---|
| 클래식 싱글 | AI (Stockfish) | 정규 체스 | 5~10분 | 없음 |
| 클래식 로컬멀티 | 사람 (핫시트) | 정규 체스 | 5~30분 | 없음 |
| 모험 | AI (스토리 적·보스) | 변형(HP/아이템) | 30~60분/런 | 별의 조각·해금 |

## 🛠 기술 스택

- **Frontend**: SolidJS 1.9, Phaser 3.86, Tailwind CSS 4
- **Runtime**: Bun 1.3 (workspaces: `client/` + `shared/`)
- **Backend**: Hono + SQLite (M5/M6 옵션)
- **Chess**: chess.js (룰/PGN), Stockfish 18 lite-single (WASM Web Worker)
- **Storage**: IndexedDB (idb-keyval) + localStorage 백업

## 📂 프로젝트 구조

```text
.
├── client/                      # SolidJS + Phaser 3
│   ├── public/
│   │   ├── assets/pieces/       # 기물 placeholder PNG (32x32, M5에서 정식)
│   │   └── stockfish/           # Stockfish WASM (postinstall로 복사)
│   ├── src/
│   │   ├── routes/              # 화면(MainMenu, ClassicSingle*, Adventure*, MetaProgress)
│   │   ├── components/          # UI 컴포넌트(menu/board/dialogs/phaser/ui)
│   │   ├── store/               # gameStore, settingsStore, adventureStore, metaStore
│   │   ├── lib/
│   │   │   ├── chess/           # ChessManager, AdventureChessManager, Clock, Stockfish, 난이도
│   │   │   ├── controllers/     # ClassicSceneControllerBase + Adapters, AdventureRunController
│   │   │   ├── adventure/       # MapGenerator, data/{items,characters,events,unlocks,globalModifiers}
│   │   │   ├── phaser/          # Phaser 팩토리/씬/eventBus
│   │   │   ├── platform/        # useWakeLock 등
│   │   │   ├── storage/         # kv, settingsRepo, historyRepo
│   │   │   └── i18n/            # ko/en 사전
│   │   └── styles/
├── shared/src/                  # 모드/타입 정의 (Mode, Classic, Adventure, GameState, ClockSnapshot, GlobalSettings)
├── scripts/                     # generate-piece-placeholders, copy-stockfish (postinstall)
└── docs/                        # 기획·기술 문서
```

## 📖 문서 바로가기

### 게임 디자인
- [게임 디자인 (GAME_DESIGN.md)](./docs/GAME_DESIGN.md) — 비전·타겟·모드 구조·진행도 정책
- [UI 흐름 (UI_FLOW.md)](./docs/UI_FLOW.md) — 라우트 매핑 + 화면 전이

### 모드별 상세
- [클래식 공통 (modes/classic/COMMON.md)](./docs/modes/classic/COMMON.md)
- [클래식 싱글 (modes/classic/SINGLE.md)](./docs/modes/classic/SINGLE.md)
- [클래식 로컬멀티 (modes/classic/LOCAL_MULTI.md)](./docs/modes/classic/LOCAL_MULTI.md)
- [모험 (modes/ADVENTURE.md)](./docs/modes/ADVENTURE.md)

### 기술 문서
- [기술 스펙 (SPEC.md)](./docs/SPEC.md) — 타입 정의 + IndexedDB 키 + 전투 엣지케이스
- [아키텍처 (ARCHITECTURE.md)](./docs/ARCHITECTURE.md) — 컨트롤러 추상화 + 모듈 의존
- [에셋 명세 (ASSETS.md)](./docs/ASSETS.md)
- [개발 로드맵 (TODO.md)](./docs/TODO.md)

## 🏃 시작하기

```bash
# 1. 의존성 설치 (postinstall로 Stockfish WASM이 자동 복사됨)
bun install

# 2. 개발 서버
bun run dev
# → http://localhost:5180

# 3. 타입 체크
bun run typecheck

# 4. 프로덕션 빌드
bun run build

# 5. (선택) placeholder 기물 PNG 재생성
bun run gen:placeholders
```

> ⚠️ **Kakao 내부 네트워크 환경**: 글로벌 `~/.npmrc`에 사내 레지스트리가 설정되어 있으면 `bun install`이 멈출 수 있습니다. 본 저장소의 `.npmrc`가 `registry.npmjs.org`를 명시적으로 오버라이드합니다.

## 🧪 dev 편의

개발 모드에서 `window.__chesslike`로 store/eventBus에 접근 가능:

```js
__chesslike.game.gameStore           // 게임 상태 (board, turn, ui, adventure)
__chesslike.game.handleSquareClick   // 보드 클릭 시뮬레이션
__chesslike.bus                      // eventBus 인스턴스
```

production 빌드에서는 자동 제거됩니다.
