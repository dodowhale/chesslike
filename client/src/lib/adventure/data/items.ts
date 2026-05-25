import type { Item } from '@shared/adventure';

/**
 * 모험 모드 아이템 풀.
 * - Common 10, Uncommon 5 (기본 등장)
 * - Rare 5, Legendary 2 (M4 메타 해금 후 등장)
 */
export const ITEM_POOL: Item[] = [
  // ---------- Common (10) ----------
  { id: 'iron-shield', name: '강철 방패', rarity: 'common', category: 'stat', description: 'HP +10', modifier: { hp: 10 } },
  { id: 'sharp-blade', name: '날카로운 칼', rarity: 'common', category: 'stat', description: '공격력 +3', modifier: { attack: 3 } },
  { id: 'leather-armor', name: '가죽 갑옷', rarity: 'common', category: 'stat', description: 'HP +6, 공격력 +1', modifier: { hp: 6, attack: 1 } },
  { id: 'healing-herb', name: '치유 약초', rarity: 'common', category: 'effect', description: '턴마다 HP +1', modifier: { healPerTurn: 1 } },
  { id: 'spike-helm', name: '가시 투구', rarity: 'common', category: 'effect', description: '피격 시 반사 +1', modifier: { thornsDamage: 1 } },
  { id: 'oak-staff', name: '오크 지팡이', rarity: 'common', category: 'stat', description: '공격력 +2', modifier: { attack: 2 } },
  { id: 'sturdy-cloak', name: '튼튼한 망토', rarity: 'common', category: 'stat', description: 'HP +8', modifier: { hp: 8 } },
  { id: 'training-band', name: '훈련의 띠', rarity: 'common', category: 'stat', description: 'HP +4, 공격력 +1', modifier: { hp: 4, attack: 1 } },
  { id: 'fang-amulet', name: '엄니 부적', rarity: 'common', category: 'effect', description: '피격 시 반사 +2', modifier: { thornsDamage: 2 } },
  { id: 'minor-potion', name: '약한 회복약', rarity: 'common', category: 'effect', description: '턴마다 HP +2', modifier: { healPerTurn: 2 } },

  // ---------- Uncommon (5) ----------
  // NOTE: 원안은 "나이트 점프 거리 +1"(jumpOver/range modifier)이었으나 chess.js 룰
  //   확장이 필요해 본 사이클에서는 박차 메타포(돌격 + 자기 방어)를 살린 복합
  //   modifier로 재설계. uncommon 등급 안에서 royal-crown(hp20/atk5)·
  //   phoenix-feather(heal5)·thorn-mantle(thorns5)·titan-belt(hp15/atk3) 사이의
  //   차별 포지션: stat + 반사 작은 양을 동시에 주는 균형형.
  { id: 'knight-spurs', name: '기사의 박차', rarity: 'uncommon', category: 'effect', description: 'HP +15, 공격력 +5, 피격 시 반사 +3', modifier: { hp: 15, attack: 5, thornsDamage: 3 } },
  { id: 'royal-crown', name: '왕관', rarity: 'uncommon', category: 'stat', description: 'HP +20, 공격력 +5', modifier: { hp: 20, attack: 5 } },
  { id: 'phoenix-feather', name: '불사조 깃털', rarity: 'uncommon', category: 'effect', description: '턴마다 HP +5', modifier: { healPerTurn: 5 } },
  { id: 'thorn-mantle', name: '가시 망토', rarity: 'uncommon', category: 'effect', description: '피격 시 반사 +5', modifier: { thornsDamage: 5 } },
  { id: 'titan-belt', name: '거인의 허리띠', rarity: 'uncommon', category: 'stat', description: 'HP +15, 공격력 +3', modifier: { hp: 15, attack: 3 } },

  // ---------- Rare (10) — M4 해금 ----------
  { id: 'demon-edge', name: '마검의 날', rarity: 'rare', category: 'stat', description: '공격력 +8', modifier: { attack: 8 } },
  { id: 'aegis-plate', name: '아이기스 판금', rarity: 'rare', category: 'stat', description: 'HP +30', modifier: { hp: 30 } },
  { id: 'ironbark-amulet', name: '강목 부적', rarity: 'rare', category: 'effect', description: '피격 시 반사 +8, 턴마다 HP +3', modifier: { thornsDamage: 8, healPerTurn: 3 } },
  { id: 'storm-glaive', name: '폭풍 글레이브', rarity: 'rare', category: 'stat', description: 'HP +12, 공격력 +6', modifier: { hp: 12, attack: 6 } },
  { id: 'warden-mantle', name: '수호자의 망토', rarity: 'rare', category: 'effect', description: '턴마다 HP +8', modifier: { healPerTurn: 8 } },
  { id: 'runic-gauntlet', name: '룬각인 건틀릿', rarity: 'rare', category: 'stat', description: 'HP +18, 공격력 +4', modifier: { hp: 18, attack: 4 } },
  { id: 'serpent-fang', name: '독사의 송곳니', rarity: 'rare', category: 'effect', description: '공격력 +7, 피격 시 반사 +3', modifier: { attack: 7, thornsDamage: 3 } },
  { id: 'oathkeeper-shield', name: '맹약의 방패', rarity: 'rare', category: 'effect', description: 'HP +24, 턴마다 HP +2', modifier: { hp: 24, healPerTurn: 2 } },
  { id: 'phantom-cloak', name: '환영의 망토', rarity: 'rare', category: 'effect', description: '턴마다 HP +5, 피격 시 반사 +3', modifier: { healPerTurn: 5, thornsDamage: 3 } },
  { id: 'dragon-scale', name: '용비늘 갑옷', rarity: 'rare', category: 'stat', description: 'HP +20, 공격력 +5', modifier: { hp: 20, attack: 5 } },

  // ---------- Legendary (5) — M4 해금, 보스 보상 ----------
  { id: 'crown-of-eternity', name: '영원의 왕관', rarity: 'legendary', category: 'stat', description: 'HP +50, 공격력 +10', modifier: { hp: 50, attack: 10 } },
  { id: 'soul-of-titan', name: '거인의 영혼', rarity: 'legendary', category: 'effect', description: 'HP +25, 공격력 +5, 매 턴 HP +5', modifier: { hp: 25, attack: 5, healPerTurn: 5 } },
  { id: 'worldtree-bough', name: '세계수 가지', rarity: 'legendary', category: 'effect', description: 'HP +35, 턴마다 HP +6', modifier: { hp: 35, healPerTurn: 6 } },
  { id: 'sunforged-blade', name: '햇빛으로 벼린 검', rarity: 'legendary', category: 'stat', description: '공격력 +15', modifier: { attack: 15 } },
  { id: 'eclipse-aegis', name: '식의 방패', rarity: 'legendary', category: 'effect', description: 'HP +40, 피격 시 반사 +10', modifier: { hp: 40, thornsDamage: 10 } },
];

export function getItemById(id: string): Item | undefined {
  return ITEM_POOL.find((i) => i.id === id);
}

/**
 * ADVENTURE.md §6.1 등급 가중치.
 * 어떤 등급이 후보로 제공되었는지에 무관하게 상대 가중치는 SPEC를 따른다.
 */
const RARITY_WEIGHTS: Record<Item['rarity'], number> = {
  common: 60,
  uncommon: 30,
  rare: 9,
  legendary: 1,
};

const RARITY_FALLBACK_ORDER: Item['rarity'][] = [
  'legendary',
  'rare',
  'uncommon',
  'common',
];

/**
 * 등급 추첨 + 풀 내 균등 추첨의 두 단계.
 *
 * - `rarities`: 허용 등급 집합. 메타 해금에 따라 자동으로 잠긴 등급 제외.
 * - `unlockedItemPools`: 'rare-pool'/'legendary-pool' 같은 해금 키 목록.
 * - 등급이 비어있으면 SPEC §3의 "Elite는 Rare+ 보장" 문구에 따라 한 단계 다운그레이드
 *   (legendary→rare→uncommon→common) 폴백.
 */
export function rollItems(
  rng: () => number,
  count: number,
  rarities: Item['rarity'][],
  unlockedItemPools: string[] = [],
): Item[] {
  const allowed = rarities.filter((r) => {
    if (r === 'rare') return unlockedItemPools.includes('rare-pool');
    if (r === 'legendary') return unlockedItemPools.includes('legendary-pool');
    return true;
  });

  const effective: Item['rarity'][] =
    allowed.length > 0 ? allowed : downgrade(rarities, unlockedItemPools);

  const result: Item[] = [];
  const used = new Set<string>();
  let safety = count * 10;
  while (result.length < count && safety-- > 0) {
    const rarity = pickRarity(rng, effective);
    if (!rarity) break;
    const pool = ITEM_POOL.filter((i) => i.rarity === rarity && !used.has(i.id));
    if (pool.length === 0) continue;
    const pick = pool[Math.floor(rng() * pool.length)]!;
    used.add(pick.id);
    result.push(pick);
  }
  return result;
}

function pickRarity(rng: () => number, rarities: Item['rarity'][]): Item['rarity'] | null {
  if (rarities.length === 0) return null;
  const total = rarities.reduce((acc, r) => acc + RARITY_WEIGHTS[r], 0);
  if (total <= 0) return rarities[0]!;
  let roll = rng() * total;
  for (const r of rarities) {
    roll -= RARITY_WEIGHTS[r];
    if (roll <= 0) return r;
  }
  return rarities[rarities.length - 1]!;
}

function downgrade(
  requested: Item['rarity'][],
  unlockedItemPools: string[],
): Item['rarity'][] {
  // 한 단계씩 낮춰서 사용 가능한 가장 가까운 등급을 찾는다.
  for (const tier of RARITY_FALLBACK_ORDER) {
    if (!requested.includes(tier)) continue;
    const lowerIdx = RARITY_FALLBACK_ORDER.indexOf(tier) + 1;
    if (lowerIdx >= RARITY_FALLBACK_ORDER.length) break;
    const fallback = RARITY_FALLBACK_ORDER[lowerIdx]!;
    const fallbackAllowed =
      fallback === 'rare'
        ? unlockedItemPools.includes('rare-pool')
        : fallback === 'legendary'
          ? unlockedItemPools.includes('legendary-pool')
          : true;
    if (fallbackAllowed) return [fallback];
  }
  return ['common'];
}

/**
 * 보스 보상 — SPEC §6.1 + ADVENTURE.md §6.1 "보스 보상".
 * Legendary 풀 해금 시 가중치를 크게 조정해 Legendary 우선 시도(보스 보상이라는 의미 강화).
 */
export function rollBossReward(
  rng: () => number,
  unlockedItemPools: string[],
): Item | undefined {
  // Legendary 해금 → 50% Legendary, 50% Rare(또는 Uncommon 폴백).
  // 해금 안 됨 → Rare 해금 → Rare 70/Uncommon 30. 둘 다 안 됨 → Uncommon.
  if (unlockedItemPools.includes('legendary-pool')) {
    const pickLegend = rng() < 0.5;
    if (pickLegend) {
      const pool = ITEM_POOL.filter((i) => i.rarity === 'legendary');
      if (pool.length > 0) return pool[Math.floor(rng() * pool.length)]!;
    }
  }
  if (unlockedItemPools.includes('rare-pool')) {
    const pickRare = rng() < 0.7;
    if (pickRare) {
      const pool = ITEM_POOL.filter((i) => i.rarity === 'rare');
      if (pool.length > 0) return pool[Math.floor(rng() * pool.length)]!;
    }
  }
  const pool = ITEM_POOL.filter((i) => i.rarity === 'uncommon');
  if (pool.length === 0) return undefined;
  return pool[Math.floor(rng() * pool.length)]!;
}
