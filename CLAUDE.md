# CLAUDE.md

이 프로젝트의 에이전트 가이드는 [AGENTS.md](./AGENTS.md)에 통합 정의되어 있습니다. Claude Code는 아래 import 라인을 통해 자동으로 본문을 컨텍스트에 로드합니다.

@AGENTS.md

---

## Claude Code 전용 메모

본 섹션은 Claude Code 특유의 동작·관습에만 해당하는 내용을 둡니다. 프로젝트 공통 가이드는 모두 `AGENTS.md`로 옮기세요(다른 CLI와의 단일 진실 원천 유지).

- 본 저장소에서 새 기능·문서를 만들 때는 `AGENTS.md §4`의 문서 우선 참조 순서를 따르세요.
- `docs/superpowers/`는 `.gitignore`로 무시됩니다. 디자인 스펙·작업 노트는 그 디렉토리에서 작업하되 커밋되지 않도록 유의하세요.
- 사용자가 명시적으로 요청하기 전까지는 커밋하지 마세요.
