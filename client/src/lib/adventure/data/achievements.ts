/**
 * 모험 모드 도전과제 (M5 placeholder).
 * MetaProgress.unlockedLocations 슬롯에 ID 푸시. 정식 화면/조건 검증은 후속.
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
];

export function findAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
