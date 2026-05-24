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
| M3 모험 모드 MVP | ✅ 완료 |
| M4 메타 진행 + 추가 콘텐츠 | ✅ 완료 |
| M5 폴리시 | ✅ 완료 (외부 자산은 M6+) |
| M6+ 비주얼·인터랙션 1차 | ✅ Sprite identity·Tween / 픽셀 도트 글리프 / 보드 테마 / 캐릭터 스킨 / 다이얼로그 PNG 통일 |
| M6+ 후속 (외부 자산·콘텐츠·인프라) | ⏳ TODO에 별도 섹션 |

자세한 진행 항목과 M6+ 후속 작업은 [docs/TODO.md](./docs/TODO.md) 참조.

## 🎮 모드별 한눈에 보기

| 모드 | 상대 | 룰 | 세션 길이 | 진행도 |
|---|---|---|---|---|
| 클래식 싱글 | AI (Stockfish) | 정규 체스 | 5~10분 | 없음 |
| 클래식 로컬멀티 | 사람 (핫시트) | 정규 체스 | 5~30분 | 없음 |
| 모험 | AI (스토리 적·보스) | 변형(HP/아이템) | 30~60분/런 | 별의 조각·해금 |

## 🛠 기술 스택

- **Frontend**: SolidJS 1.9, Phaser 3.86, Tailwind CSS 4
- **Runtime**: Bun 1.3 (workspaces: `client/` + `server/` + `shared/`)
- **Backend**: Hono (헬스체크 + 랭킹/도전과제 API 골격, SQLite는 M6+)
- **Chess**: chess.js (룰/PGN), Stockfish 18 lite-single (WASM Web Worker)
- **Storage**: IndexedDB (idb-keyval) + localStorage 백업
- **Audio**: Web Audio API (Web Audio 사인파 SFX placeholder, 정식 BGM/SFX 음원은 M6+)
- **Deploy**: vercel.json SPA rewrite + Vite build outputDirectory

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
├── server/                      # Hono API 스켈레톤 (헬스체크 + 랭킹/도전과제 placeholder)
│   ├── package.json
│   └── src/index.ts
├── scripts/                     # generate-piece-placeholders, copy-stockfish (postinstall)
├── vercel.json                  # 배포 설정 (SPA rewrite + outputDirectory)
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
__chesslike.game.handleSquareClick   // 클래식 보드 클릭 시뮬레이션
__chesslike.bus                      // eventBus 인스턴스
```

production 빌드에서는 자동 제거됩니다.

## 🛣 M6+ 진행 상황

코드 측 모든 마일스톤(M0~M5)은 완료. M6+ 비주얼·인터랙션 1차 작업도 정착되어 다음과 같이 진행되었습니다:

**완료 (M6+ 비주얼·인터랙션 1차)**:
- **Sprite identity·Tween** — `BoardScene`에 `Map<square, PieceSprite>` 도입, `pieceLayer.removeAll(true)` 제거. 기물 이동 200ms `Sine.easeInOut` Tween + 캡처/캐슬링/앙파상/승급 special case + HP 바 width tween + 감소 시 빨간 flash 100ms + AI 응답 250ms 지연 (reduced motion 시 즉시).
- **픽셀 도트 글리프** — `scripts/generate-piece-placeholders.ts`의 5x7 영문자 폰트를 32x32 ASCII 그리드 실루엣으로 교체. `GLYPH_ROW = /^[ .X]{32}$/` 무결성 어설션이 빌드 시점에 잘못된 그리드 차단.
- **보드 테마** — `default`(베이지/우드) / `forest`(잎새 녹) / `ocean`(청록) 3종. 모험 act에 따라 자동 매핑 (1막→default, 2막→forest, 3막→ocean). 클래식은 항상 default.
- **캐릭터별 기물 스킨** — `standard`(아이보리) / `assassins`(은회색) / `saints`(금색) 백 진영 팔레트. 흑은 공통 baseline. 36 PNG `client/public/assets/pieces/{characterId}/{w,b}{K..P}.png`.
- **다이얼로그 PNG 통일** — `PromotionDialog`(4 선택지) / `GameOverDialog`(승자 K) Unicode 글리프 → generator PNG `<img>`. 활성 캐릭터·진영 색 자동 적용.

**잔여 (외부 자산·콘텐츠·인프라 위주)**:
- **외부 자산** — 정식 도트 에셋(노드 아이콘·보스 스프라이트·캐릭터 초상화·아이템 17종), BGM 5트랙, SFX 패키지
- **Phaser 보드 강화** — 드래그·드롭 입력, 보스 페이즈 시각 인터스티셜, HeaderBar/AdventureEntry/MainMenu 장식 아이콘 통일
- **AI 강화** — 보스 전용 강한 AI, 일반 모험 AI를 random에서 약한 Stockfish로
- **콘텐츠 확장** — 요새단/혼돈단 캐릭터, 도전과제 5→20종, 통계 화면, 이벤트/아이템 풀 확장
- **서버 활성화** — SQLite + Drizzle 스키마, 랭킹/도전과제 검증, 인증
- **품질** — 단위·E2E 테스트, CI/CD, 코드 스플릿, Lighthouse 검증
- **배포** — Vercel/Fly.io 환경 검증, server 별도 배포
