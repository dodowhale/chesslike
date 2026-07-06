# Changelog

본 프로젝트의 변경 사항을 [Keep a Changelog 1.1.0](https://keepachangelog.com/ko/1.1.0/) 형식으로 기록한다. 버전 체계는 [SemVer 2.0.0](https://semver.org/lang/ko/) — 코드 마일스톤(M0~M5)을 0.x 시리즈로 매핑한다.

## [Unreleased] — M6+ 콘텐츠·UX 패키지

### Added
- 글로벌 리더보드 시스템 추가: Bun built-in SQLite를 이용한 `server` DB 및 `/api/leaderboard` (GET/POST), `/api/achievements/verify` (POST) API 구현.
- 글로벌 리더보드 프론트엔드 연동: `client/src/lib/platform/serverApi.ts` 모듈 생성, `/stats` 화면에서 로컬/글로벌 리더보드 탭 분리 제공, 게임 종료(`/adventure/result`) 시 닉네임을 입력하여 랭킹 및 도전과제를 서버로 전송할 수 있는 제출 폼 추가.
- 모험 이벤트 풀 6 → 15 (`goblin-ambush`, `hermits-blessing`, `cursed-chest`, `pilgrims-shrine`, `wanderers-deal`, `ravens-warning`, `forgotten-library`, `merchants-favor`, `arena-trial`)
- 아이템 풀 확장: Rare 5 → 10, Legendary 2 → 5
- 도전과제 풀 5 → 15 (act2-clear, act3-clear, saints-clear, gold-hoarder, flawless-act1, event-explorer, shop-spender, boss-slayer, rare-trio, legend-trio)
- 모험 모드 누적 통계 `RunStats` (`shared/adventure.RunStats`, `meta:runStats` kv) — 런 종료 시점 자동 기록
- 통계 화면 `/stats` (총 런/승률/보스 클리어/누적 골드/막별 보스 클리어 등)
- 도움말 화면 `/help` (클래식·모험 룰, 조작, 접근성 안내)
- HeaderBar 진입점: 📊 통계 활성화, ❓ 도움말 신규
- 모험 결과 화면에 막별 진행 요약 + 새로 잠금 해제된 도전과제 카드
- 보드 외곽 클릭 영역 확장 (HIT_PAD 12px) — 모바일 터치 친화
- 신규 i18n 키 ko/en (`menu.help`, `adventure.result.*`, `stats.*`, `help.*`, `achievements.*`, `meta.*`, `difficulty.*`, `classicOptions.*`) 및 오프라인 상태 대응 키 추가.
- 오프라인 모드(PWA 최적화) 지원 개선: 네트워크 또는 백엔드 서버가 구동 중이지 않은 오프라인 환경에서도 게임 결과가 로컬에 정상 보존(IndexedDB)되도록 랭킹 등록 실패 및 오프라인 상태(navigator.onLine) 감지 대응 UI(등록 비활성화 및 로컬 보존 안내 경고)를 AdventureResult.tsx에 추가하였으며, Stats.tsx의 글로벌 랭킹 화면에 서버 연결 실패 시 재시도 버튼과 친절한 오프라인 폴백 UI를 적용함.
- dev `window.__chesslike` 정식 모듈 `client/src/lib/devApi.ts` (`ChesslikeDevApi` 타입 + `installDevApi`)
- 본 문서 — CHANGELOG.md 도입
- 정식 외부 자산 1차 도입 (ASSETS.md §11 발주 스펙 기준): 기물 36 PNG(placeholder generator 출력물 → 정식 도트 아트워크 교체), 노드 아이콘 6종 (`adventure/nodes/{battle,elite,shop,event,rest,boss}.png` 48×48), 보스 스프라이트 3종 (`adventure/bosses/act{1,2,3}.png` 96×96), 캐릭터 초상화 4종 (`adventure/characters/{standard,assassins,saints,locked}.png` 96×96), 아이템 아이콘 30종 (`adventure/items/{itemId}.png` 32×32 — 풀과 1:1 매칭), 막별 배경 3종 (`adventure/backgrounds/act{1,2,3}.png` 480×270). 기물 PNG는 BootScene이 같은 경로 preload라 즉시 보드에 반영, 나머지(노드/보스/캐릭터/아이템/배경)는 UI 통합 후속 사이클 대기.

### Changed
- `BoardScene` 입력 처리: 셀별 `setInteractive` → 단일 zone 기반 입력 + `pixelToSquare` 역산. 인접 셀 hit 우선순위 모호함 제거.
- `evaluateAchievementsOnRunEnd` 시그니처: 누적형 도전과제 평가를 위해 `RunStats` 인자 추가 (옵셔널, 기존 호출처 호환 유지).
- 에이전트 가이드 템플릿화: `ANTIGRAVITY.md` 내의 하드코딩된 특정 대화 세션 ID를 `<conversation-id>` 템플릿으로 변경하여 여러 세션에서 범용적으로 유효하도록 수정.

### Fixed
- 모험 모드 킹의 액티브 스킬 '왕의 진노'의 공격력 증가 버프가 턴 시작 즉시 제거되어 한 번도 공격에 적용되지 못하던 버그를 `tempAtkBonusTurns` 카운터를 도입하여 본인의 다음 턴 공격이 완료될 때까지 정상 유지되도록 수정.
- 모험 모드 캡처 실패(damaged) 시 chess.js active color가 swap되지 않아 후속 차례 흐름이 멈추던 버그. `ChessManager.swapTurnOnly()` 추가하고 `AdventureChessManager.tryMove`의 damaged 분기에서 호출하도록 수정 (FEN active color swap + en-passant target 무효화 + halfmove +1, 흑→백 시 fullmove +1).
- 모험 Battle/Boss 화면의 좌상단 ← 버튼이 outcome 결정 전까지 disabled 상태라 사용자가 전투를 떠날 수 없던 문제. 버튼을 항상 활성화하고, 진행 중에는 "전투 포기" 확인 모달을 표시 후 맵으로 이동 (노드는 미완료로 남아 재진입 가능, 보드는 초기 진형으로 재시작). 보스도 동일 패턴.
- 전투 포기 후 맵에서 다음 스테이지 노드가 잘못 진입 가능해지던 버그. 원인: `AdventureRunController.availableNextNodes`가 currentNode의 isCompleted를 보지 않고 nextNodes를 그대로 반환했고, `advanceTo`가 진입 시점에 이전 노드를 자동으로 isCompleted=true 마킹해 markCurrentNodeCompleted 호출 없이도 다음이 열렸음. 수정: `availableNextNodes`는 currentNode.isCompleted=true일 때만 next 반환, `advanceTo`의 자동 마킹 제거 (실제 클리어 마킹은 markCurrentNodeCompleted가 단독 책임).
- 보스 king HP=0 직후 게임이 정지하던 버그. 원인: `AdventureChessManager.tryMove`가 king을 일반 capture 분기로 처리해 HP 0 이하 시 `chess.tryMove`로 실제 캡처를 시도했으나 chess.js가 king 캡처를 합법수로 인정하지 않아 무브가 fail → `attemptBoardMove`가 syncBoard/scheduleAiReply 없이 종료 → AI 응답 안 옴. 수정: `defender.type==='k'`이면 항상 damaged 분기 + HP 0 clamp + `swapTurnOnly`로 차례만 넘김. SPEC §4.2 "보스 KingHp=0은 약화의 자리표, 페이즈 종료는 체크메이트만"을 정확히 반영. 일반 노드 적 king은 `checkBoardEndCondition`의 `blackKingHp<=0` 분기로 즉시 종료됨.
- 보스에서 사용자가 체크메이트를 만들어도 페이즈가 종료되지 않던 버그. 원인: `AdventureSceneController.checkBoardEndCondition`의 winner 계산이 정 반대(`turnAfterMove==='w'?'b':'w'`)였고, 호출처에서 `turnAfterMove` 인자의 의미가 일관되지 않아(attemptBoardMove의 'w' vs scheduleAiReply 무브-없음 분기의 'b') 사용자 무브로 만든 흑 체크메이트가 winner='b' → `finalize('defeat')`로 잘못 흘렀음. 보스는 KingHp 분기가 없어 isCheckmate 경로만 사용하므로 증상이 보스에서 두드러졌고 일반 노드는 KingHp<=0 분기에 가려져 있었음. 수정: `chess.turn()`(체크메이트당한 진영=loser) 기반으로 winner를 직접 계산, `turnAfterMove` 인자 제거.
- 정의만 있고 실제로는 작동하지 않던 modifier들 정리. **변경 전**: `thornsDamage`(반사 아이템 7종 + 글로벌 1종), `healPerTurn`(아이템 측), `jumpOver`/`range`(knight-spurs)가 어디서도 처리되지 않아 사용자가 장착해도 효과 없음. **수정**: (a) `thornsDamage` 실 구현 — `AdventureChessManager.tryMove`의 damaged/captured 양쪽에서 `effectiveThornsDamage(defender, globalMods)`를 attacker.hp에서 차감 (본 사이클은 min 1 clamp, 상호 사망은 후속). (b) `healPerTurn` 아이템 합산 — `applyTurnStartHeal`이 각 piece의 장착·글로벌을 추가 합산. 캐릭터 패시브 healPerTurn은 그대로 합산. (c) `knight-spurs` 재설계 — chess.js 룰 확장이 필요한 jumpOver/range를 본 사이클에서 빼고, "박차 = 돌격 + 자기 방어" 메타포에 맞춰 `{ hp: 15, attack: 5, thornsDamage: 3 }` 복합 modifier로 변경. description "HP +15, 공격력 +5, 피격 시 반사 +3". uncommon 등급 안에서 royal-crown(hp20/atk5)·phoenix-feather(heal5)·thorn-mantle(thorns5)·titan-belt(hp15/atk3) 사이의 차별 포지션(stat + 작은 반사). 정식 점프 거리 +1 확장은 후속. (d) 반사 아이템 description "피격 시 반사 +X" 형식으로 통일(spike-helm·fang-amulet·thorn-mantle·ironbark-amulet·serpent-fang·phantom-cloak·eclipse-aegis). AdventureInventory의 jumpOver/range chip 제거 — 작동 안 하는 효과를 사용자에게 노출하지 않음.
- 클라이언트 빌드 및 타입 오류 수정: `bun-types` 누락으로 인한 `bun:test` 임포트 오류(`TS2307`) 및 strict 옵션 하의 MapGenerator.test.ts 내 index reference `undefined` 가능성 오류(`TS2532`, `TS2322`)를 해결하여 `bun run typecheck` 및 `bun run build` 빌드 파이프라인을 완전 복구함.
- 보안성 강화: 로컬 개발 시 생성될 수 있는 SQLite DB 파일들(`*.db`, `*.db-journal`, `*.db-wal`, `*.db-shm`)이 Git에 추적되지 않도록 루트 `.gitignore`에 무시 룰을 추가함.


### Notes
- 본 사이클은 외부 자산 1차 도입(기물 + 노드/보스/캐릭터/아이템/배경 PNG)까지 포함. **BGM/SFX 음원**, 서버 인프라(SQLite/leaderboard/인증), 새 캐릭터(요새단/혼돈단), 테스트 자동화, 드래그·드롭 입력, 자산의 UI 통합(노드 아이콘·보스·캐릭터 초상화·아이템 카드·배경)은 별도 사이클에서 후속.
- **generator 가드**: `scripts/generate-piece-placeholders.ts`는 정식 자산과 같은 경로에 출력하므로 정식 자산 도입 후에는 `bun run gen:placeholders` 실행 금지. 1차 placeholder는 `client/public/assets/pieces_old/`에 보존(gitignore 적용 — 추적 X, 로컬 복구용).

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
