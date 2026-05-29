# Skill: IndexedDB 오프라인 저장소 및 동기화 설계 (indexeddb_offline_sync)

이 스킬은 백엔드 및 데이터베이스 개발자(`backend_developer`)가 브라우저 환경에서 IndexedDB를 활용해 게임 진행도를 오프라인-퍼스트 상태로 관리하고, Hono API 서버와 데이터 충돌 없이 동기화하는 상태 관리 로직을 구축할 때 사용하는 지침입니다.

## 실행 프로세스

1. **스키마 버전 정의**: 데이터 구조 변경 시 안정적으로 IndexedDB 스키마를 마이그레이션할 수 있도록 구조를 설정합니다. (Dexie.js 등을 활용하여 데이터베이스 인스턴스를 선언하는 것이 효율적입니다.)
2. **오프라인-퍼스트 쓰기**: 게임 데이터 변경(재화 획득, 노드 클리어 등) 시 로컬 IndexedDB에 먼저 즉시 트랜잭션으로 기록합니다.
3. **백그라운드 동기화 (Sync)**:
   - 네트워크 연결 여부를 확인하고 연결된 경우 변경 로그(Change Log)나 최종 저장 타임스탬프를 기반으로 Hono API 서버와 통신합니다.
   - 데이터 충돌 발생 시 최종 작성일(LWW - Last Write Wins) 전략 또는 서버 검증(Server-Authored) 우선 원칙을 적용해 상태 일관성을 유지합니다.

## 데이터 설계 패턴 (Dexie.js 기반 예시)

```typescript
import Dexie, { type Table } from 'dexie';

export interface GameSave {
  id?: number;
  userId: string;
  mode: 'classic' | 'adventure';
  currentStage: number;
  unlockedPieces: string[];
  gold: number;
  lastUpdated: number;
  isSynced: number; // 0: 로컬 전용, 1: 동기화 완료
}

class ChesslikeDatabase extends Dexie {
  gameSaves!: Table<GameSave>;

  constructor() {
    super('ChesslikeDatabase');
    this.version(1).stores({
      gameSaves: '++id, userId, mode, lastUpdated, isSynced'
    });
  }
}

export const db = new ChesslikeDatabase();
```

## 서버 동기화 알고리즘

데이터 동기화 요청을 수행할 때는 다음과 같은 로직을 작성합니다.

```typescript
export async function syncLocalSavesToServer(userId: string) {
  // 1. 서버로 보낼 필요가 있는 미동기화 로컬 데이터를 조회
  const unsyncedSaves = await db.gameSaves
    .where('userId')
    .equals(userId)
    .filter(save => save.isSynced === 0)
    .toArray();

  if (unsyncedSaves.length === 0) return;

  try {
    // 2. Hono API 서버에 벌크 업로드 요청
    const response = await fetch(`/api/save/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, saves: unsyncedSaves })
    });

    if (response.ok) {
      // 3. 성공 시 로컬 상태를 '동기화 완료'로 마킹
      await db.transaction('rw', db.gameSaves, async () => {
        for (const save of unsyncedSaves) {
          if (save.id) {
            await db.gameSaves.update(save.id, { isSynced: 1 });
          }
        }
      });
    }
  } catch (error) {
    console.error('동기화 실패:', error);
  }
}
```
