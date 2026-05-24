import { createSignal } from 'solid-js';
import type { AdventureRunController } from '@/lib/controllers/AdventureSceneController';

/**
 * 진행 중인 모험 런의 controller 인스턴스 핸들. 라우트 화면들이 공유한다.
 * 새 런 시작 시 setActiveRun으로 교체하고, 런 종료 시 undefined로 정리.
 */
const [active, setActive] = createSignal<AdventureRunController | undefined>();

export const activeRun = active;
export function setActiveRun(c: AdventureRunController | undefined): void {
  setActive(c);
}
