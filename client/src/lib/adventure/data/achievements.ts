/**
 * 모험 모드 도전과제.
 * - MetaProgress.unlockedLocations 슬롯에 달성 시 ID push.
 * - 단일 런 데이터로 평가 가능한 항목과, 누적 RunStats가 필요한 항목으로 나뉜다.
 */
export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  reward: number; // 별의 조각
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-clear',
    name: '첫 1막 클리어',
    description: '첫 런으로 1막 보스를 클리어한다.',
    reward: 20,
  },
  {
    id: 'no-undo-run',
    name: '무르기 없는 런',
    description: '무르기를 한 번도 사용하지 않고 1막 보스를 클리어.',
    reward: 30,
  },
  {
    id: 'assassins-clear',
    name: '암살자단으로 클리어',
    description: '암살자단 캐릭터로 1막 보스를 클리어.',
    reward: 25,
  },
  {
    id: 'saints-clear',
    name: '신성단으로 클리어',
    description: '신성단 캐릭터로 어느 막이든 보스를 클리어.',
    reward: 25,
  },
  {
    id: 'item-collector',
    name: '아이템 수집가',
    description: '한 런에서 Rare 등급 아이템 3개를 보유.',
    reward: 25,
  },
  {
    id: 'legendary-find',
    name: '전설의 발견',
    description: 'Legendary 등급 아이템을 처음 획득.',
    reward: 40,
  },
  {
    id: 'act2-clear',
    name: '2막 보스 클리어',
    description: '한 런에서 2막 보스를 클리어한다.',
    reward: 30,
  },
  {
    id: 'act3-clear',
    name: '최종 보스 처치',
    description: '한 런에서 3막 최종 보스를 클리어한다.',
    reward: 50,
  },
  {
    id: 'gold-hoarder',
    name: '황금 비축',
    description: '런 종료 시점에 골드 200 이상 보유.',
    reward: 20,
  },
  {
    id: 'flawless-act1',
    name: '무결한 1막',
    description: '1막 보스 클리어 시 어떤 기물도 잃지 않는다.',
    reward: 35,
  },
  {
    id: 'event-explorer',
    name: '탐험가',
    description: '한 런에서 이벤트 노드 3회 통과.',
    reward: 15,
  },
  {
    id: 'shop-spender',
    name: '큰손 손님',
    description: '한 런에서 상점 누적 구매 3회.',
    reward: 15,
  },
  {
    id: 'boss-slayer',
    name: '보스 사냥꾼',
    description: '누적 보스 클리어 3회 (모든 막 합산).',
    reward: 30,
  },
  {
    id: 'rare-trio',
    name: '희귀 삼위일체',
    description: '한 런에서 서로 다른 Rare 아이템 3종 보유.',
    reward: 25,
  },
  {
    id: 'legend-trio',
    name: '전설의 수집가',
    description: '누적 Legendary 아이템 3개 획득.',
    reward: 40,
  },
];

export function findAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
