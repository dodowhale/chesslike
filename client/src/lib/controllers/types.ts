import type { ClassicSubmode } from '@shared/mode';

/**
 * 모드 컨트롤러의 공통 인터페이스. ARCHITECTURE.md §2의 분류를 따른다.
 * 라우트 컴포넌트는 onMount에서 컨트롤러를 생성하고 onCleanup에서 destroy를 호출한다.
 */
export interface SceneController {
  /** 컨트롤러가 가진 모든 리소스(엔진/시계/이벤트 구독)를 해제한다. */
  destroy(): void;
}

/**
 * 클래식 모드 컨트롤러. submode가 'single' 또는 'local'이며, 시계와 종료 처리,
 * 히스토리 자동 저장 등 두 서브모드 공통 흐름을 흡수한다.
 */
export interface ClassicSceneController extends SceneController {
  readonly submode: ClassicSubmode;
  readonly initError: () => string | null;
  /** 힌트는 싱글(vs AI)에서만 지원된다. 로컬멀티는 미구현. */
  requestHint?(): Promise<void>;
  requestUndo(): void;
  resign(): void;
  rematch(): void;
}
