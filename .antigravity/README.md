# Antigravity CLI Config & Directory

이 디렉토리는 Antigravity CLI 에이전트가 작동할 때 필요한 추가 설정 및 서브에이전트 정의 등을 영구적으로 보관하기 위한 폴더입니다.

## 폴더 구조

- `agents/`: 이 프로젝트에서 사용할 수 있는 서브에이전트 정의 파일들이 마크다운(`.md`) 형태로 들어있습니다.
  - [game_designer.md](./agents/game_designer.md): 게임 기획 및 시스템 디자이너 서브에이전트 정의
  - [game_engine_developer.md](./agents/game_engine_developer.md): 게임 코어 엔진 및 전투 로직 개발 에이전트 정의
  - [frontend_architect.md](./agents/frontend_architect.md): SolidJS UI 및 Phaser 3 그래픽스 렌더링 개발 에이전트 정의
  - [backend_developer.md](./agents/backend_developer.md): Bun, Hono API 및 SQLite/IndexedDB 데이터 설계 에이전트 정의
- `skills/`: 서브에이전트가 특정 작업을 표준화된 방법으로 수행하기 위해 로드하여 활용하는 스킬 지침 파일들입니다.
  - [create_design_spec.md](./skills/create_design_spec.md): 기획 사양서 작성 스킬
  - [balance_modeling.md](./skills/balance_modeling.md): 수치 밸런싱 및 데이터 설계 스킬
  - [ui_ux_mapping.md](./skills/ui_ux_mapping.md): UI/UX 와이어프레임 및 화면 설계 스킬
  - [chess_rules_integration.md](./skills/chess_rules_integration.md): 체스 규칙 및 변형 전투 로직 검증 스킬
  - [phaser_solidjs_bridge.md](./skills/phaser_solidjs_bridge.md): Phaser 3와 SolidJS 상태 공유 가이드
  - [indexeddb_offline_sync.md](./skills/indexeddb_offline_sync.md): IndexedDB 오프라인 저장소 및 동기화 설계 스킬

## 에이전트 주의사항

Antigravity CLI가 새로운 대화 세션을 시작할 때, `agents/` 디렉토리 아래의 에이전트 정의 파일을 읽어 필요한 서브에이전트를 `define_subagent` 도구를 사용해 사전에 동적으로 초기화할 것을 권장합니다.
이를 통해 세션이 만료되거나 재생성되더라도 동일한 프롬프트와 역할의 서브에이전트를 연속성 있게 활용할 수 있습니다.
