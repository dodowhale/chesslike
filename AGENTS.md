# AGENTS.md

본 문서는 이 프로젝트에서 작업하는 모든 AI 에이전트(Claude Code, Codex, Antigravity CLI 등)가 공통으로 참조하는 가이드입니다. 각 CLI별 진입 파일(`CLAUDE.md` 등)은 본 문서를 가리키도록 작성합니다.

## 1. 프로젝트 한눈에

- **이름**: Pixel Chess Roguelike (Chesslike)
- **장르**: 체스 + 로그라이크
- **플랫폼**: Web (Mobile Friendly)
- **한 줄 컨셉**: 정통 체스의 규칙과 로그라이크의 모험을 한 화면에 담은 픽셀 아트 체스 게임
- **언어/지역화**: 한국어 우선, 영어 보조
- **현 상태**: M6+ 마일스톤 구현 완료 단계. SolidJS + Phaser 3 기반 클라이언트, Bun + Hono 기반 백엔드, 공통(shared) 패키지, Stockfish.js 웹 워커 AI 탑재 및 세이브/메타 진행 시스템이 구현 완료됨.

## 2. 최상위 모드 구조 (중요)

| 최상위 모드 | 서브모드 | 식별자 | 룰 |
|---|---|---|---|
| 클래식 | 싱글 (vs AI) | `mode='classic'`, `submode='single'` | FIDE 정규 체스 |
| 클래식 | 로컬멀티 (핫시트) | `mode='classic'`, `submode='local'` | FIDE 정규 체스 |
| 모험 | — | `mode='adventure'` | HP/아이템/노드맵 변형 |

**모드 간 진행도는 완전 독립**. 클래식 ↔ 모험은 데이터·통화·해금 모두 분리. 새 기능 제안 시 이 정책에 위배되지 않는지 먼저 확인.

## 3. 기술 스택

- **Frontend**: SolidJS, Phaser 3, Tailwind CSS
- **Backend**: Bun, Hono, SQLite (Drizzle ORM 예정)
- **Chess**: Stockfish.js (WASM Web Worker), chess.js
- **로컬 저장**: IndexedDB
- **에셋**: Aseprite 기반 32x32 픽셀 아트

자세한 기술 결정은 [docs/SPEC.md](./docs/SPEC.md), 아키텍처는 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) 참조.

## 4. 문서 우선 참조 순서

새로운 작업을 시작할 때 다음 순서로 컨텍스트를 확보하세요.

1. **본 문서(AGENTS.md)** — 프로젝트 전체 개요
2. **[docs/GAME_DESIGN.md](./docs/GAME_DESIGN.md)** — 게임 비전, 타겟, 모드 비교, 진행도 정책
3. **모드별 작업**이면 해당 모드 문서:
   - 클래식 공통: [docs/modes/classic/COMMON.md](./docs/modes/classic/COMMON.md)
   - 클래식 싱글: [docs/modes/classic/SINGLE.md](./docs/modes/classic/SINGLE.md)
   - 클래식 로컬멀티: [docs/modes/classic/LOCAL_MULTI.md](./docs/modes/classic/LOCAL_MULTI.md)
   - 모험: [docs/modes/ADVENTURE.md](./docs/modes/ADVENTURE.md)
4. **타입/데이터 구조**: [docs/SPEC.md](./docs/SPEC.md)
5. **시스템 흐름·모듈 의존성**: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
6. **UI/UX**: [docs/UI_FLOW.md](./docs/UI_FLOW.md)
7. **에셋**: [docs/ASSETS.md](./docs/ASSETS.md)
8. **로드맵**: [docs/TODO.md](./docs/TODO.md) — 마일스톤 M0~M5

## 5. 작업 가이드라인

### 5.1 작성 언어
- 사용자 대화·문서·커밋 메시지는 **한국어 우선**.
- 코드 식별자·타입명·UCI 등 기술 표준 용어는 영어 그대로.

### 5.2 코드 작성 시 (코드 추가될 경우)
- 타입은 `docs/SPEC.md`의 인터페이스 정의와 일치시킬 것. 새 타입 도입 시 SPEC.md도 함께 업데이트.
- 모드 식별자는 항상 `mode: 'classic' | 'adventure'` + `submode: 'single' | 'local'` 패턴 사용.
- 모험 모드 전투 처리(앙파상/승급/보스 페이즈/스테일메이트=패배) 엣지케이스는 [SPEC.md §5](./docs/SPEC.md)의 정의를 따를 것.
- 클래식 모드는 FIDE 룰을 100% 준수. HP/ATK 개념을 클래식에 섞지 말 것.

### 5.3 문서 수정 시
- 모드 구조 등 핵심 결정사항을 바꾸려면 먼저 `docs/superpowers/specs/` 아래의 디자인 스펙(있다면)을 참고하고, 변경 이유를 명확히 합의한 뒤 진행.
- 한 사실이 여러 문서에 중복되면 한 곳에서 정의하고 나머지는 링크. 특히 클래식 두 서브모드 공통 사항은 `COMMON.md`에 두고 SINGLE/LOCAL_MULTI는 차이점만 다룸.

### 5.4 커밋 규칙
- 메시지 첫 줄: 변경 영역 prefix(`docs:`, `feat:`, `fix:`, `refactor:` 등) + 무엇을 했는지
- 본문: **왜** 그렇게 했는지 (배경/근거)
- 사용자가 명시적으로 요청하기 전에는 커밋하지 않음

### 5.5 의존성·환경
- Bun 사용. `npm`/`yarn` 명령으로 대체하지 말 것.
- 보안 민감 파일(`.env`, 자격증명 등) 절대 커밋 금지.
- `.gitignore`에 등재된 디렉토리(예: `.claude/`, `docs/superpowers/`)는 트래킹하지 말 것.

### 5.6 버전 관리 및 릴리즈 규칙
- **버전 업데이트**: 사용자가 명시적으로 릴리즈(Release) 또는 버전 업(Bump up)을 요청할 때만 `client/package.json` 및 필요 시 최상위 `package.json`의 `version` 값을 올립니다. 평소 코드 로직 수정 시에는 절대로 버전을 변경하지 않습니다.
- **버전 범프 규칙 (Semantic Versioning 준수)**: 사용자의 요청 시, 이전 배포 시점 대비 작업의 성격을 고려해 아래의 SemVer 기준에 맞춰 버전을 갱신합니다:
  - **Major (X.0.0)**: 하위 호환성이 완전히 깨지는 구조적 중대 변경 사항이 발생하거나, 대규모 신규 콘텐츠 출시 및 완전히 새로운 마일스톤이 최초 정식 오픈될 경우.
  - **Minor (0.Y.0)**: 하위 호환성이 유지되는 상태에서 새로운 게임 기능 추가(Feat), 대대적인 아키텍처 리팩토링, 캐릭터/아이템 등의 신규 자산 대규모 도입 시.
  - **Patch (0.0.Z)**: 하위 호환성을 유지하며 단순 버그 수정(Fix), UI/UX 미세 조정, 문서 수정(Docs), 사소한 CSS 변경, CI 빌드 설정 수정 등이 일어났을 경우.
- **GitHub Actions 배포 트리거**: GitHub Actions 배포 워크플로우는 `package.json`, `client/package.json` 또는 `.github/workflows/**` 파일이 수정되어 `main`/`master` 브랜치에 푸시될 때만 트리거됩니다. 이를 통해 릴리즈 버전 변경 시에만 명시적으로 GitHub Pages 배포가 실행되도록 통제합니다.
- **버전 표시**: 클라이언트 애플리케이션의 화면 어딘가에 현재 버전이 동적으로 표시되도록 보장합니다. (`client/package.json` 또는 클라이언트 빌드 변수를 활용해 UI에 렌더링)

## 6. 자주 헷갈리는 포인트

| 헷갈림 | 정답 |
|---|---|
| "클래식과 모험은 어떻게 연결되나?" | 연결 없음. 완전 독립 |
| "별의 조각은 클래식 승리로도 적립되나?" | 아니오. 모험 안에서만 |
| "모험에서 스테일메이트는 무승부?" | 아니오. 일반 노드는 **패배**. 보스전만 예외 |
| "보스는 HP로 잡을 수 있나?" | 아니오. 보스 페이즈는 **체크메이트만** 종료 가능 |
| "클래식 싱글에서 무르기 기준?" | 사용자 단독 결정 (옵션·횟수 제한) |
| "클래식 로컬멀티에서 무르기 기준?" | **양측 합의** 필수 |
| "모험 폰 승급 시 장착 아이템은?" | **유지** (슬롯 보존), 스탯만 승급 기물 베이스로 갱신 |

## 7. CLI별 진입 파일

본 프로젝트는 다음 패턴을 따릅니다:

- `CLAUDE.md` → 본 문서(`AGENTS.md`)를 import
- `codex.md` (추가 예정) → 본 문서 참조
- `ANTIGRAVITY.md` → 본 문서(`AGENTS.md`)를 참조

새 CLI를 추가할 때는 그 CLI의 컨벤션을 따르는 진입 파일을 만들고, 본 `AGENTS.md`를 가리키도록 작성하세요. 본 문서는 단일 진실 원천(Single Source of Truth)입니다.
