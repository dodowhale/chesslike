# ANTIGRAVITY.md

이 프로젝트의 에이전트 가이드는 [AGENTS.md](./AGENTS.md)에 통합 정의되어 있습니다. Antigravity CLI는 아래 문서 링크와 참조를 통해 자동으로 본문을 컨텍스트로 로드하거나 최우선 지침으로 삼아야 합니다.

- [AGENTS.md](./AGENTS.md) (단일 진실 원천 - Single Source of Truth)

---

## Antigravity 전용 메모

본 섹션은 Antigravity CLI 특유의 동작 방식(Planning Mode, Artifacts 등)과 관련된 지침을 정의합니다. 프로젝트 공통 비즈니스 로직 및 컨셉은 모두 `AGENTS.md`를 참조하세요.

### 1. Planning Mode & Artifacts
* **계획 우선**: 복잡한 변경이 필요할 경우 코드 수정 전에 [implementation_plan.md](file:///Users/east/.gemini/antigravity-cli/brain/fd276e9e-73bd-4b2a-9d2f-d4cb3a24f31d/implementation_plan.md)를 작성하고, `request_feedback`을 활성화하여 사용자의 명시적인 승인을 얻으세요.
* **작업 추적**: 승인 후 작업 시에는 [task.md](file:///Users/east/.gemini/antigravity-cli/brain/fd276e9e-73bd-4b2a-9d2f-d4cb3a24f31d/task.md)를 활용하여 TODO를 관리하세요.
* **작업 완료 후**: 완료 시에는 변경 사항과 테스트 결과를 요약한 [walkthrough.md](file:///Users/east/.gemini/antigravity-cli/brain/fd276e9e-73bd-4b2a-9d2f-d4cb3a24f31d/walkthrough.md)를 생성 또는 업데이트하세요.
* **경로 주의**: Artifacts는 `/Users/east/.gemini/antigravity-cli/brain/fd276e9e-73bd-4b2a-9d2f-d4cb3a24f31d/` 내에 작성되어야 합니다.

### 2. Antigravity 도구 사용 권장
* **Bun 환경 준수**: 터미널 명령을 제안할 때는 Bun을 사용하세요. (예: `bun run ...`)
* **커밋 규칙**: 사용자가 명시적으로 커밋을 요청하거나 승인하기 전에는 `git commit` 명령을 직접 제안하거나 실행하지 마세요.
* **질문 도구**: 모호한 사용자 기획이나 방향성을 좁혀야 할 경우, `ask_question` 또는 `/grill-me` 슬래시 커맨드 추천을 적극 활용하세요.
