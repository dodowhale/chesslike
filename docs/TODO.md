# Development Roadmap: Pixel Chess Roguelike

> 모드 구조에 맞춘 마일스톤 기반 로드맵. 각 마일스톤은 완료 시 의미 있는 사용자 가치를 제공하도록 구성.

## 진행 요약

| 마일스톤 | 상태 | 커밋 |
|---|---|---|
| **M0** 공통 기반 | ✅ 완료 | `8c6ad2c` |
| **M1** 클래식 공통 + 싱글 | ✅ 완료 | `a813c62` |
| **M2** 클래식 로컬멀티 | ✅ 완료 | `a944da2` |
| **M3** 모험 모드 MVP | ✅ 완료 | `a944da2`, `ebb64b7` |
| **M4** 메타 진행 + 콘텐츠 | ✅ 완료 (요새단/혼돈단은 선택 사항으로 보류) | `a944da2` |
| **M5** 폴리시 | ✅ 완료 (외부 자산 의존 항목은 M6+ 후속) | `ebb64b7` |
| **M6+** 후속 — 외부 자산·확장 | ⏳ 별도 섹션 | — |

## M0: 공통 기반 (Foundation) ✅

- [x] Bun 프로젝트 초기화 (`bun init`)
- [x] Frontend: SolidJS + Vite + Tailwind CSS 설정
- [x] Backend: Hono 기본 서버 — M5에서 스켈레톤 추가 (랭킹·도전과제용 활성화는 M6+)
- [x] Phaser 3 초기화 및 SolidJS 컴포넌트 연동용 Wrapper
- [x] `chess.js` 통합 및 기본 보드 렌더링
- [x] 기본 체스보드(8x8) 타일셋 및 기물 에셋(Placeholder)
- [x] 메인 메뉴 → 클래식/모험 카드 라우팅 골격
- [x] 글로벌 설정(사운드/언어/테마) 저장 구조

## M1: 클래식 공통 + 싱글 ✅

### 클래식 공통
- [x] 시간 제어 시스템 (Bullet/Blitz/Rapid/Classical/무제한/커스텀)
- [x] 종료 조건 처리 (체크메이트/스테일메이트/50수/3회 동형/시간 만료/기권)
- [x] 보드 UI 공통 (좌표·합법 수·라스트 무브·체크 강조)
- [x] 폰 승급 다이얼로그
- [x] 기보 표기(SAN) 및 PGN 내보내기

### 싱글
- [x] Stockfish.js Web Worker 통합 (UCI 프로토콜)
- [x] 난이도 5단계 프리셋 (UCI_Elo + Skill Level 매핑)
- [x] 커스텀 옵션 (ELO/사고시간/Contempt 슬라이더)
- [x] 힌트 기능 (강조 + 횟수 제한)
- [x] 무르기 기능 (옵션, 횟수 제한)
- [x] 분석 모드 (평가바, MultiPV 3, 수 되감기)
- [x] 게임 히스토리 자동 저장 (IndexedDB)

## M2: 클래식 로컬멀티 ✅

- [x] 보드 자동 회전 (옵션 ON/OFF, 200ms 트랜지션, 모션 감소 옵션 반영)
- [x] 무르기 합의 모달 (요청·동의·거부)
- [x] 무승부 제안 모달 (요청·동의·거부)
- [x] 기권 확인 모달
- [x] 상하 시계 위젯 + 차례 인디케이터
- [x] Wake Lock (화면 자동 잠금 방지)
- [x] 우발적 입력 방지 (두 단계 탭) — 드래그·드롭은 M6+
- [x] 다시 두기 시 색 자동 교대 (PGN 헤더에 반영)

## M3: 모험모드 MVP ✅

### 시스템
- [x] 모험 모드 진입 흐름 (캐릭터 선택 → 맵)
- [x] 노드 맵 생성 알고리즘 (Battle/Elite/Shop/Event/Rest/Boss + 가중치)
- [x] 맵 화면 UI (노드 그래프 + SVG 연결선 + 진입 가능 표시)
- [x] HP/ATK 스탯 시스템 (기물별, SPEC §5 베이스 스탯 표 정렬)
- [x] 전투 처리 로직 (AdventureChessManager — M5에서 실제 보드 인터랙션과 연결)
- [x] 앙파상/승급 엣지 케이스 처리 (슬롯 보존)
- [x] 스테일메이트 → 패배 처리 (`evaluateNaturalStatus`)
- [x] 기본 아이템 풀 (Common 10 + Uncommon 5)
- [x] 아이템 슬롯 시스템 (기물별 2슬롯)
- [x] 인벤토리 UI (장착/해제 + 글로벌 모디파이어 칩)

### 1막 콘텐츠
- [x] 기본 캐릭터(Standard) 1종
- [x] 1막 보스 1종 (M5에서 실제 보드 + SPEC §4.2 체크메이트 룰로 정렬)
- [x] Battle/Elite/Shop/Event/Rest 노드 콘텐츠 (각 종류 최소 1개 변형)
- [x] 런 시작 → 보스 클리어 → 런 결과 화면

## M4: 메타 진행 + 추가 콘텐츠 ✅

### 메타 진행
- [x] 별의 조각 시스템 (SPEC §8.1, IndexedDB 영구 저장)
- [x] 메타 진행 화면 `/meta` (해금 트리, 50조각+ 확인 다이얼로그)
- [x] 영구 장식품 (시작 골드 +20, 시작 HP +10, 첫 노드 보상 보장)
- [x] 자동 이어하기 (앱 종료 후 진행 중 런 복구)

### 캐릭터 해금
- [x] 암살자단 (나이트 강화 + 점프 데미지 패시브)
- [x] 신성단 (비숍·킹 강화 + 결속 회복 패시브)
- [ ] (선택) 요새단·혼돈단 — TODO 명시 선택 사항, M6+ 콘텐츠 확장

### 추가 막
- [x] 2막 (8노드 + 막 보스)
- [x] 3막 (8노드 + 최종 보스)

### 콘텐츠 확장
- [x] 아이템 풀 확장 (Rare 5 + Legendary 2, SPEC §6.1 등급 가중치)
- [x] 글로벌 모디파이어 시스템 (4종 풀 + ancient-shrine 이벤트로 획득)
- [x] 이벤트 노드 콘텐츠 확장 (6종 변형, 막별 출현 풀, effects 시퀀스)

## M5: 폴리시 (Polish) ✅

### 모험 모드 정식 보드 (M3 위임 마감)
- [x] AdventureBattle/Boss 실제 보드 인터랙션 (AdventureChessManager 연결)
- [x] BoardScene piece별 HP 바 오버레이
- [x] 캐릭터 패시브 turn-start healPerTurn 실제 발화 + 멱등성 보장
- [x] 보스 페이즈 종료 룰 SPEC §4.2 (체크메이트만, KingHp=0은 약화)
- [x] 페이즈 전환 시 플레이어 HP/items 보존 (SPEC §5.4)

### 비주얼
- [ ] 정식 도트 에셋 적용 — placeholder 유지, **M6+ 외부 자산 작업**
- [ ] 노드 아이콘·보스 스프라이트·캐릭터 초상화 정식 에셋 — M6+
- [x] 아이템 카드 등급별 프레임 CSS (.rarity-* + Legendary pulse)
- [ ] 기물 애니메이션 Phaser Tween — sprite identity 리팩토링 필요, **M6+**
- [ ] 드래그·드롭 입력 지원 — sprite identity 필요, **M6+**

### 오디오
- [x] BGM/SFX 시스템 (AudioManager + Web Audio API placeholder, settings 즉시 반영)
- [ ] 정식 BGM 5트랙 — playBgm noop 대기, **M6+ 외부 자산**
- [ ] 정식 SFX 음원 — Web Audio 사인파 placeholder 대신, **M6+**
- [x] 사운드 볼륨 설정 분리 (BGM/SFX)

### 도전과제 / 랭킹
- [x] 도전과제 데이터 (5종) + `/achievements` 화면
- [x] 첫 보스 클리어 / Rare 3개 / Legendary 보유 등 자동 잠금해제
- [ ] 서버 랭킹 — Hono `/api/leaderboard` 스켈레톤만, SQLite 미연결, **M6+**
- [ ] 사용자 인증 — **M6+**

### 최적화 / 접근성
- [x] 모바일 safe-area + Tailwind responsive 검증
- [x] 모션 감소 옵션 전체 트랜지션 확장 (보드 회전 + 모달 + CSS)
- [x] 한국어/영어 i18n 기본 사전 확장 — 이벤트/아이템/캐릭터 텍스트 다국어는 M6+
- [x] 배포 설정 (vercel.json SPA rewrite + Vite build outputDirectory)
- [ ] 실제 Vercel/Fly.io 배포 검증 — **M6+**

## M6+: 후속 작업 ⏳

코드 측 마일스톤은 M5까지 완료. 다음 항목은 외부 자산·추가 콘텐츠·검증 작업입니다.

### 외부 자산 (디자이너 / 사운드 디자이너 협업)
- [ ] 정식 도트 에셋 — 기물 12종 × 캐릭터 스킨 × 보드 테마 (Default/Forest/Ocean) — placeholder generator로 1차 적용됨(`scripts/generate-piece-placeholders.ts`), 정식 아트워크는 후속
- [x] 막별 보드 테마(Forest/Ocean)에 맞춘 기물 색상 변형 — generator에 character 차원 + BoardScene THEME_COLORS map으로 적용 완료 (직교 시스템)
- [x] 캐릭터별 기물 스킨(암살자단·신성단 등) — generator CHARACTER_PALETTES 3종 + BoardScene 텍스처 키 prefix로 적용 완료 (정규단 아이보리/암살자단 은회색/신성단 금색, 흑은 baseline 공통)
- [x] PromotionDialog 등 UI 아이콘 통일 — generator PNG 활용 완료 (PromotionDialog 4 선택지 + GameOverDialog 승자 K). HeaderBar/AdventureEntry/MainMenu 장식 아이콘은 후속
- [ ] 노드 아이콘 6종 + 보스 스프라이트 3종 (1막/2막/3막)
- [ ] 캐릭터 초상화 (정규단/암살자단/신성단 + 추가)
- [ ] 아이템 아이콘 17종 (Common 10 + Uncommon 5 + Rare 5 + Legendary 2)
- [ ] BGM 5트랙 (메인메뉴/클래식/막별/보스/결과)
- [ ] SFX 패키지 (클릭/무브/캡처/체크/체크메이트/아이템 획득/레벨업 등)

### 코드 — Phaser 보드 인터랙션 강화
- [x] BoardScene을 sprite identity 유지 구조로 리팩토링 (pieceLayer.removeAll 제거)
- [x] 기물 이동 Tween (Idle/Move/Capture 200ms, 모션 감소 시 즉시)
- [ ] 드래그·드롭 입력 (클릭/탭과 공존, 합법수 미리보기)
- [x] HP 바 변화 애니메이션 (데미지 받을 때 시각 피드백)
- [ ] 보스 페이즈 시각 인터스티셜 (페이즈 클리어 → 다음 페이즈 진입 사이 효과)

### 코드 — AI 강화
- [ ] 보스 전용 강한 AI (Stockfish 또는 페이즈별 사전 정의 무브 시퀀스)
- [ ] 일반 모험 AI를 random에서 약한 Stockfish (Skill Level 1~3)로 교체
- [ ] AI 차례 사이에 시각 지연 (사용자가 보스/적 응답을 인지하도록 300~500ms) — Tween 동기화용 250ms는 이미 적용됨, 추가 조정만 남음

### 코드 — 콘텐츠 확장
- [ ] 요새단 캐릭터 (룩 강화 파티, M4 선택 사항)
- [ ] 혼돈단 캐릭터 (랜덤 시작 진형)
- [x] 도전과제 5 → 15 (act2/act3-clear, saints-clear, gold-hoarder, flawless-act1, event-explorer, shop-spender, boss-slayer, rare-trio, legend-trio) — RunStats 누적형 평가 포함
- [x] 통계 화면 `/stats` (총 런/승률/보스 클리어/누적 골드/막별 보스 등) + HeaderBar 📊 활성화
- [x] 이벤트 풀 6 → 15 (goblin-ambush, hermits-blessing, cursed-chest, pilgrims-shrine, wanderers-deal, ravens-warning, forgotten-library, merchants-favor, arena-trial)
- [x] 아이템 풀 Rare 5 → 10, Legendary 2 → 5
- [ ] 캐릭터별 시작 아이템/패시브 다양화

### 코드 — 서버 / 인프라
- [ ] server SQLite + Drizzle 스키마 정의
- [ ] `/api/leaderboard` 랭킹 등록·조회 실제 구현
- [ ] `/api/achievements/verify` 서버 검증 (조작 방지)
- [ ] 사용자 인증 (옵션, 닉네임 기반)
- [ ] Vercel/Fly.io 배포 + 환경변수 (서버는 별도 배포 대상)
- [ ] HistoryEntry 클라우드 동기화 (옵션)

### 코드 — 품질
- [ ] 단위 테스트 (Vitest/Bun test) — ChessManager, AdventureChessManager, MapGenerator, rollItems 가중치 분포
- [ ] E2E 테스트 (Playwright) — 클래식 싱글 5수, 로컬멀티 합의 흐름, 모험 1막 클리어
- [ ] CI (GitHub Actions) — typecheck + test + build
- [ ] 코드 스플릿 — 현재 `ClassicSinglePlay` 1.5MB 청크(Phaser+Stockfish 임포트) 분리
- [ ] 번들 분석 (rollup-plugin-visualizer)
- [ ] Lighthouse 모바일 점수 검증

### 코드 — 모험 UX 보강
- [x] 모험 결과 화면에 막별 통계 (1/2/3막별 완료 노드 + 신규 잠금해제 도전과제 표시)
- [ ] 인벤토리 키보드 단축키
- [ ] 보드 좌측에 행동 로그 패널 (모험 전투에서 데미지/캡처 시각화)
- [ ] 모바일 보드 줌·드래그 (작은 화면에서 기물 클릭 어려움)
- [x] 보드 클릭 영역 확대 (BoardScene 단일 zone + HIT_PAD 12px, 모서리 셀로 외곽 클릭 흡수)

### 문서 / DX
- [ ] 이벤트/아이템/캐릭터 다국어 (현재 한국어 고정 텍스트) — 신규 UI 키 ko/en만 반영, 이벤트/아이템/캐릭터 본문 다국어는 미정
- [x] 도움말 화면 `/help` (룰/조작/접근성) + HeaderBar ❓ 진입점
- [x] dev `__chesslike` 정식화 (`client/src/lib/devApi.ts` + `ChesslikeDevApi` 타입) — 디버그 패널 UI는 후속
- [x] CHANGELOG.md 도입 (Keep-a-Changelog, M0~M5 요약 + Unreleased)

## 참고

- 본 로드맵의 마일스톤 분할 근거는 [docs/superpowers/specs/2026-05-22-docs-enhancement-design.md](./superpowers/specs/2026-05-22-docs-enhancement-design.md) §4.10 참조.
- 각 마일스톤은 의존성을 가진다: M0 → M1 → M2 → M3 → M4 → M5. 단, M1/M2와 M3/M4는 부분 병행 가능.
- M6+ 후속 작업은 외부 자산·콘텐츠 확장·인프라 위주로, 코드 구조는 이미 받아들일 준비가 되어 있음 (AudioManager.playBgm, BoardScene piece sprite, server API placeholder 등).
- M6+ 비주얼·인터랙션 1차(완료)의 디자인 스펙:
  - Sprite identity·Tween — [`docs/superpowers/specs/2026-05-24-phaser-board-sprite-identity-design.md`](./superpowers/specs/2026-05-24-phaser-board-sprite-identity-design.md) *(gitignore — 로컬 노트)*
  - 픽셀 도트 글리프 — [`docs/superpowers/specs/2026-05-24-chess-piece-visuals-design.md`](./superpowers/specs/2026-05-24-chess-piece-visuals-design.md) *(gitignore)*
  - 보드 테마 + 캐릭터 스킨 — [`docs/superpowers/specs/2026-05-25-theme-character-skin-design.md`](./superpowers/specs/2026-05-25-theme-character-skin-design.md) *(gitignore)*
  - 다이얼로그 PNG 통일 — [`docs/superpowers/specs/2026-05-25-cycle-b-dialog-icons-design.md`](./superpowers/specs/2026-05-25-cycle-b-dialog-icons-design.md) *(gitignore)*
