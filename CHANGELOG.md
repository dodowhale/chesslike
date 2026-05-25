# Changelog

본 프로젝트의 변경 사항을 [Keep a Changelog 1.1.0](https://keepachangelog.com/ko/1.1.0/) 형식으로 기록한다. 버전 체계는 [SemVer 2.0.0](https://semver.org/lang/ko/) — 코드 마일스톤(M0~M5)을 0.x 시리즈로 매핑한다.

## [Unreleased] — M6+ 콘텐츠·UX 패키지

### Added
- 모험 이벤트 풀 6 → 15 (`goblin-ambush`, `hermits-blessing`, `cursed-chest`, `pilgrims-shrine`, `wanderers-deal`, `ravens-warning`, `forgotten-library`, `merchants-favor`, `arena-trial`)
- 아이템 풀 확장: Rare 5 → 10, Legendary 2 → 5
- 도전과제 풀 5 → 15 (act2-clear, act3-clear, saints-clear, gold-hoarder, flawless-act1, event-explorer, shop-spender, boss-slayer, rare-trio, legend-trio)
- 모험 모드 누적 통계 `RunStats` (`shared/adventure.RunStats`, `meta:runStats` kv) — 런 종료 시점 자동 기록
- 통계 화면 `/stats` (총 런/승률/보스 클리어/누적 골드/막별 보스 클리어 등)
- 도움말 화면 `/help` (클래식·모험 룰, 조작, 접근성 안내)
- HeaderBar 진입점: 📊 통계 활성화, ❓ 도움말 신규
- 모험 결과 화면에 막별 진행 요약 + 새로 잠금 해제된 도전과제 카드
- 보드 외곽 클릭 영역 확장 (HIT_PAD 12px) — 모바일 터치 친화
- 신규 i18n 키 ko/en (`menu.help`, `adventure.result.*`, `stats.*`, `help.*`)
- dev `window.__chesslike` 정식 모듈 `client/src/lib/devApi.ts` (`ChesslikeDevApi` 타입 + `installDevApi`)
- 본 문서 — CHANGELOG.md 도입

### Changed
- `BoardScene` 입력 처리: 셀별 `setInteractive` → 단일 zone 기반 입력 + `pixelToSquare` 역산. 인접 셀 hit 우선순위 모호함 제거.
- `evaluateAchievementsOnRunEnd` 시그니처: 누적형 도전과제 평가를 위해 `RunStats` 인자 추가 (옵셔널, 기존 호출처 호환 유지).

### Fixed
- 모험 모드 캡처 실패(damaged) 시 chess.js active color가 swap되지 않아 후속 차례 흐름이 멈추던 버그. `ChessManager.swapTurnOnly()` 추가하고 `AdventureChessManager.tryMove`의 damaged 분기에서 호출하도록 수정 (FEN active color swap + en-passant target 무효화 + halfmove +1, 흑→백 시 fullmove +1).

### Notes
- 본 사이클은 외부 자산(스프라이트/BGM/SFX), 서버 인프라(SQLite/leaderboard/인증), 새 캐릭터(요새단/혼돈단), 테스트 자동화, 드래그·드롭 입력은 제외. 별도 사이클에서 후속.

## [0.5.0] — 2026-05-24 — M5 Polish

### Added
- 모험 모드 정식 보드: `AdventureChessManager` 연결로 Battle/Boss가 실제 보드 인터랙션 사용
- 캐릭터 패시브 `turn-start healPerTurn` 발화 + 멱등성 보장
- 보스 페이즈 SPEC §4.2 룰 적용 (체크메이트만 종료, KingHp=0은 약화)
- 페이즈 전환 시 플레이어 HP/items 보존 (SPEC §5.4)
- BoardScene piece별 HP 바 오버레이 (피해 시 빨간 flash, 색 전이)
- 도전과제 5종 + `/achievements` 화면, 자동 잠금해제 (first-clear / Rare 3 / Legendary 등)
- 한국어/영어 i18n 기본 사전 (메뉴/공통 UI)
- 모바일 safe-area + Tailwind responsive 검증, 모션 감소 옵션 전체 트랜지션 확장
- 배포 골격 (`vercel.json` SPA rewrite + Vite outputDirectory)
- BGM/SFX 시스템 (`AudioManager` placeholder) + 볼륨 분리 설정

### Added (M6+ 1차 비주얼·인터랙션)
- BoardScene sprite identity 리팩토링 (Map 기반 diff, `pieceLayer.removeAll` 제거)
- 기물 이동 Tween 200ms (Idle/Move/Capture), AI 응답 250ms 시각 지연
- 보드 테마 시스템 (default/forest/ocean) — 막별 자동 전환
- 캐릭터별 기물 팔레트 (정규단 아이보리 / 암살자단 은회색 / 신성단 금색) + generator
- 픽셀 도트 글리프 (영문자 → 실루엣) + K/Q/N/B 글리프 폴리시
- HP 바 width tween + 색 전이 + 감소 시 빨간 flash
- PromotionDialog·GameOverDialog 체스 글리프 → PNG 통일

## [0.4.0] — 2026-05-23 — M4 메타 진행 + 콘텐츠

### Added
- 별의 조각 시스템 (SPEC §8.1, IndexedDB 영구 저장)
- 메타 진행 화면 `/meta` (해금 트리, 50조각+ 확인 다이얼로그)
- 영구 장식품 (시작 골드 +20, 시작 HP +10, 첫 노드 보상 보장)
- 자동 이어하기 (앱 종료 후 진행 중 런 복구)
- 캐릭터 해금: 암살자단(나이트 강화 + 점프 데미지 패시브), 신성단(비숍·킹 강화 + 결속 회복)
- 2막 (8노드 + 막 보스), 3막 (8노드 + 최종 보스)
- 아이템 풀 확장 (Rare 5 + Legendary 2, SPEC §6.1 가중치)
- 글로벌 모디파이어 시스템 (4종 풀 + `ancient-shrine` 이벤트 획득)
- 이벤트 노드 콘텐츠 (6종 변형, 막별 출현 풀, effects 시퀀스)

### Notes
- 요새단·혼돈단은 선택 사항으로 M6+ 콘텐츠 확장으로 이관

## [0.3.0] — 2026-05-22 — M3 모험 모드 MVP

### Added
- 모험 모드 진입 흐름 (캐릭터 선택 → 맵)
- 노드 맵 생성 (Battle/Elite/Shop/Event/Rest/Boss + 가중치)
- 맵 화면 UI (노드 그래프 + SVG 연결선 + 진입 가능 표시)
- HP/ATK 스탯 시스템 (기물별, SPEC §5 베이스 스탯 표 정렬)
- 전투 처리 로직 (`AdventureChessManager`)
- 앙파상/승급 엣지 케이스 (슬롯 보존), 스테일메이트 → 패배 (`evaluateNaturalStatus`)
- 기본 아이템 풀 (Common 10 + Uncommon 5), 아이템 슬롯 (기물별 2슬롯)
- 인벤토리 UI (장착/해제 + 글로벌 모디파이어 칩)
- 1막 콘텐츠 (기본 캐릭터 Standard, 1막 보스, Battle/Elite/Shop/Event/Rest 각 1종 이상)

## [0.2.0] — M2 클래식 로컬멀티

### Added
- 보드 자동 회전 (옵션 ON/OFF, 200ms 트랜지션, 모션 감소 옵션 반영)
- 무르기 합의 모달 / 무승부 제안 모달 / 기권 확인 모달
- 상하 시계 위젯 + 차례 인디케이터
- Wake Lock (화면 자동 잠금 방지)
- 우발적 입력 방지 (두 단계 탭)
- 다시 두기 시 색 자동 교대 (PGN 헤더 반영)

## [0.1.0] — M1 클래식 공통 + 싱글

### Added
- 시간 제어 (Bullet/Blitz/Rapid/Classical/무제한/커스텀)
- 종료 조건 처리 (체크메이트/스테일메이트/50수/3회 동형/시간 만료/기권)
- 보드 UI 공통 (좌표·합법 수·라스트 무브·체크 강조)
- 폰 승급 다이얼로그
- 기보 표기(SAN) 및 PGN 내보내기
- Stockfish.js Web Worker (UCI), 난이도 5단계 프리셋, 커스텀 옵션
- 힌트 / 무르기 (옵션·횟수 제한)
- 분석 모드 (평가바, MultiPV 3, 수 되감기)
- 게임 히스토리 자동 저장 (IndexedDB)

## [0.0.1] — M0 공통 기반

### Added
- Bun 프로젝트 초기화, 워크스페이스(client/server/shared)
- Frontend: SolidJS + Vite + Tailwind
- Backend: Hono 기본 서버 (M5에서 placeholder)
- Phaser 3 초기화 및 SolidJS Wrapper, `chess.js` 통합 및 기본 보드 렌더링
- 기본 8x8 보드 타일셋 + 기물 placeholder
- 메인 메뉴 → 클래식/모험 라우팅 골격
- 글로벌 설정(사운드/언어/테마) 저장 구조
