# Skill: 체스 규칙 및 변형 전투 로직 검증 (chess_rules_integration)

이 스킬은 게임 코어 엔진 개발자(`game_engine_developer`)가 `chess.js`와 모험 모드만의 독자적인 HP/ATK 전투 판정, 그리고 상태이상 연산을 안전하게 설계하고 검증할 때 사용하는 지침입니다.

## 실행 프로세스

1. **상태 분리**: `chess.js`의 정규 보드 인스턴스와 모험 모드의 스탯(HP, ATK, 상태이상, 장착 아이템 등) 메타데이터를 분리하여 저장하고 고유 기물 ID로 맵핑합니다.
2. **턴 처리 파이프라인**: 
   - 사용자가 기물을 움직였을 때 `chess.js`를 사용해 행마의 FIDE 룰 부합 여부를 검증합니다.
   - 행마가 정당할 경우, 목적지에 적 기물이 있는지 확인합니다.
   - 적 기물이 있을 시 전투 연산(데미지 감쇄, 아이템 효과 적용, 상태이상 부여)을 실행합니다.
   - 전투 처리 후, 기물의 생사 여부에 따라 보드 렌더링 상태를 갱신합니다.
3. **단위 테스트 자동화**: 기물 인터랙션 로직의 오작동을 막기 위해 Vitest 또는 Bun Test를 사용하여 단위 테스트 케이스를 설계합니다.

## 전투 데미지 공식 및 판정 규칙

```typescript
interface DamageInput {
  attacker: PieceStats;
  defender: PieceStats;
  isEnPassant: boolean;
}

export function calculateCombatDamage(input: DamageInput): number {
  const { attacker, defender } = input;
  // 기본 데미지 = 공격력 - 방어력 (최소 1)
  let damage = Math.max(1, attacker.atk - (defender.def || 0));
  
  // 앙파상 등의 특수 판정 버프
  if (input.isEnPassant) {
    damage = Math.floor(damage * 1.5);
  }
  
  return damage;
}
```

## 단위 테스트 예시 패턴

새로운 엔진 로직 작성 시 아래와 같은 구조의 단위 테스트 스펙을 작성하십시오:

```typescript
import { describe, it, expect } from 'vitest';
import { calculateCombatDamage } from './combat';

describe('Combat System', () => {
  it('공격력에서 방어력을 뺀 데미지를 계산해야 합니다.', () => {
    const attacker = { atk: 10, hp: 20 };
    const defender = { atk: 5, hp: 15, def: 3 };
    const damage = calculateCombatDamage({ attacker, defender, isEnPassant: false });
    expect(damage).toBe(7);
  });
});
```
