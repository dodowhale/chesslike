# Skill: Phaser 3와 SolidJS 상태 공유 (phaser_solidjs_bridge)

이 스킬은 프론트엔드 UI & 그래픽스 아키텍트(`frontend_architect`)가 Phaser 3 캔버스 영역 내의 드래그/클릭 상태, 렌더링 주기와 SolidJS 웹 컴포넌트 간의 데이터 전달 및 상태 관리를 효율적으로 동기화할 때 사용하는 지침입니다.

## 상태 연동 핵심 원칙

1. **단방향 데이터 흐름 권장**: 
   - 웹 애플리케이션의 핵심 데이터(재화, 선택된 노드, 인벤토리 등)는 SolidJS의 Store/Signal에서 관리합니다.
   - Phaser 3 씬(Scene)은 SolidJS의 반응형 데이터를 관찰하거나, 이벤트 기반으로 씬에 그려진 기물의 렌더링 상태를 갱신합니다.
2. **이벤트 버스(Event Bus) 사용**:
   - 게임판에서 일어나는 이벤트(기물 이동 클릭, 드래그 완료, 공격 애니메이션 종료 등)는 Phaser에서 전역 이벤트 버스를 통해 SolidJS로 발행(Emit)합니다.
   - SolidJS 컴포넌트는 이를 구독(Subscribe)하여 HUD 수치를 업데이트하거나 팝업을 엽니다.

## 브릿지 인터페이스 설계 패턴

```typescript
import { EventEmitter } from 'eventemitter3';

// Phaser와 SolidJS 간의 글로벌 통신을 위한 이벤트 버스
export const gameEventBus = new EventEmitter();

export const GAME_EVENTS = {
  PIECE_SELECTED: 'PIECE_SELECTED',
  MOVE_EXECUTED: 'MOVE_EXECUTED',
  COMBAT_TRIGGERED: 'COMBAT_TRIGGERED',
  SCENE_READY: 'SCENE_READY',
};

// Phaser 씬 내부 사용 예시
class GameScene extends Phaser.Scene {
  onPieceClick(piece: ChessPieceSprite) {
    // SolidJS 측에 클릭된 기물의 상세 정보를 송신
    gameEventBus.emit(GAME_EVENTS.PIECE_SELECTED, {
      id: piece.id,
      type: piece.type,
      hp: piece.hp,
      atk: piece.atk,
    });
  }
}
```

```tsx
// SolidJS 컴포넌트 사용 예시
import { createSignal, onMount, onCleanup } from 'solid-js';
import { gameEventBus, GAME_EVENTS } from './gameEventBus';

export function GameHUD() {
  const [selectedPiece, setSelectedPiece] = createSignal<any>(null);

  onMount(() => {
    const handlePieceSelection = (pieceData: any) => {
      setSelectedPiece(pieceData);
    };

    gameEventBus.on(GAME_EVENTS.PIECE_SELECTED, handlePieceSelection);
    
    onCleanup(() => {
      gameEventBus.off(GAME_EVENTS.PIECE_SELECTED, handlePieceSelection);
    });
  });

  return (
    <div>
      {selectedPiece() ? (
        <div class="hud-panel neon-border">
          <h3>{selectedPiece().type.toUpperCase()}</h3>
          <p>HP: {selectedPiece().hp} | ATK: {selectedPiece().atk}</p>
        </div>
      ) : (
        <p>기물을 선택하세요.</p>
      )}
    </div>
  );
}
```
