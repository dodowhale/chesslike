# Pixel Chess Roguelike

아기자기한 2D 도트 그래픽과 체스 시스템을 결합한 게임. 정통 체스와 로그라이크 모험을 한 화면에서 즐길 수 있습니다.

## 🚀 개요

- **장르**: 체스 + 로그라이크
- **플랫폼**: Web (Mobile Friendly)
- **두 가지 최상위 모드**:
  - 🏛 **클래식**: FIDE 정규 체스 룰을 따르는 정통 모드
    - **싱글**: Stockfish 기반 AI와 5단계 난이도(+ 커스텀 ELO) 대전
    - **로컬멀티**: 한 디바이스에서 2인 핫시트 대국
  - ⚔️ **모험**: HP·아이템·노드 맵으로 변주된 체스 로그라이크
    - Slay the Spire 식 분기 진행, 영구사망 + 메타 진행 해금
    - 테마 캐릭터(암살자단·신성단 등)와 등급형 아이템 시스템

## 🎮 모드별 한눈에 보기

| 모드 | 상대 | 룰 | 세션 길이 | 진행도 |
|---|---|---|---|---|
| 클래식 싱글 | AI (Stockfish) | 정규 체스 | 5~10분 | 없음 |
| 클래식 로컬멀티 | 사람 (핫시트) | 정규 체스 | 5~30분 | 없음 |
| 모험 | AI (스토리 적·보스) | 변형(HP/아이템) | 30~60분/런 | 별의 조각·해금 |

## 🛠 기술 스택

- **Frontend**: SolidJS, Phaser 3, Tailwind CSS
- **Backend**: Bun, Hono, SQLite (Drizzle ORM 예정)
- **Chess**: Stockfish.js (WASM Web Worker), chess.js

## 📂 프로젝트 구조

```text
.
├── client/           # SolidJS + Phaser 3 소스 코드
├── server/           # Bun + Hono 서버 소스 코드
├── shared/           # 공통 타입 정의 및 상수
├── docs/             # 기획 및 기술 문서
└── assets/           # 도트 이미지, 사운드 에셋 소스
```

## 📖 문서 바로가기

### 게임 디자인
- [게임 디자인 (GAME_DESIGN.md)](./docs/GAME_DESIGN.md) — 비전·타겟·모드 구조·진행도 정책
- [UI 흐름 (UI_FLOW.md)](./docs/UI_FLOW.md) — 메인메뉴부터 결과 화면까지

### 모드별 상세
- [클래식 공통 (modes/classic/COMMON.md)](./docs/modes/classic/COMMON.md)
- [클래식 싱글 (modes/classic/SINGLE.md)](./docs/modes/classic/SINGLE.md)
- [클래식 로컬멀티 (modes/classic/LOCAL_MULTI.md)](./docs/modes/classic/LOCAL_MULTI.md)
- [모험 (modes/ADVENTURE.md)](./docs/modes/ADVENTURE.md)

### 기술 문서
- [기술 스펙 (SPEC.md)](./docs/SPEC.md)
- [아키텍처 (ARCHITECTURE.md)](./docs/ARCHITECTURE.md)
- [에셋 명세 (ASSETS.md)](./docs/ASSETS.md)
- [개발 로드맵 (TODO.md)](./docs/TODO.md)

## 🏃 시작하기 (개발 예정)

```bash
# 의존성 설치
bun install

# 클라이언트 실행
cd client && bun dev

# 서버 실행
cd server && bun dev
```
