export interface I18nDict {
  app: { title: string; subtitle: string };
  menu: {
    classic: string;
    classicDesc: string;
    adventure: string;
    adventureDesc: string;
    settings: string;
    achievements: string;
    stats: string;
    help: string;
    starShards: string;
    build: string;
    meta: string;
  };
  classic: {
    title: string;
    single: string;
    singleDesc: string;
    local: string;
    localDesc: string;
    inProgress: string;
    back: string;
  };
  adventure: {
    title: string;
    inProgress: string;
    back: string;
    characterSelect: string;
    characterSelectDesc: string;
    resumeRun: string;
    resume: string;
    discard: string;
    locked: string;
    map: string;
    inventory: string;
    gold: string;
    abandon: string;
    result: {
      victory: string;
      defeat: string;
      completedNodes: string;
      remainingGold: string;
      thisRunShards: string;
      byActHeading: string;
      actUnreached: string;
      newAchievements: string;
      nextRun: string;
      mainMenu: string;
      leaderboardTitle: string;
      registerSuccess: string;
      nicknamePlaceholder: string;
      registering: string;
      register: string;
      enterNicknameError: string;
      serverError: string;
      offlineModeNotice: string;
      serverOfflineError: string;
    };
  };
  settings: {
    title: string;
    audio: string;
    bgm: string;
    sfx: string;
    muted: string;
    locale: string;
    theme: string;
    boardSkin: string;
    pieceSkin: string;
    accessibility: string;
    reducedMotion: string;
    notation: string;
    notationSan: string;
    notationSanKr: string;
    close: string;
  };
  stats: {
    title: string;
    emptyHint: string;
    totalRuns: string;
    totalVictories: string;
    winRate: string;
    bossClears: string;
    bossClearsByAct: string;
    goldEarned: string;
    nodesCompleted: string;
    legendaries: string;
    shopPurchases: string;
    back: string;
    leaderboardTitle: string;
    rank: string;
    nickname: string;
    character: string;
    progress: string;
    score: string;
    noLeaderboard: string;
    act1Boss: string;
    act2Boss: string;
    act3Boss: string;
    refresh: string;
    loading: string;
    offlineMode: string;
    retry: string;
  };
  help: {
    title: string;
    classicHeading: string;
    classicBody: string;
    adventureHeading: string;
    adventureBody: string;
    controlsHeading: string;
    controlsBody: string;
    accessibilityHeading: string;
    accessibilityBody: string;
    back: string;
  };
  achievements: {
    title: string;
    back: string;
    hint: string;
    achieved: string;
  };
  meta: {
    title: string;
    back: string;
    starShards: string;
    loading: string;
    categories: {
      character: string;
      item: string;
      bonus: string;
    };
    unlocked: string;
    unlock: string;
    purchasing: string;
    insufficient: string;
    confirmTitle: string;
    confirmBody: string;
    cancel: string;
  };
  characters: {
    standard: string;
    standardDesc: string;
    assassins: string;
    assassinsDesc: string;
    saints: string;
    saintsDesc: string;
  };
  difficulty: {
    novice: string;
    noviceDesc: string;
    amateur: string;
    amateurDesc: string;
    intermediate: string;
    intermediateDesc: string;
    advanced: string;
    advancedDesc: string;
    master: string;
    masterDesc: string;
    custom: string;
    customDesc: string;
  };
  classicOptions: {
    timeControl: string;
    presets: {
      bullet: string;
      blitz: string;
      rapid: string;
      classical: string;
    };
    unlimited: string;
    custom: string;
    initialSec: string;
    incrementSec: string;
    hotseatHeading: string;
    rotateBoard: string;
    allowUndo: string;
    allowDrawOffer: string;
    cancel: string;
    startGame: string;
    difficultyHeading: string;
    colorHeading: string;
    colorWhite: string;
    colorBlack: string;
    colorRandom: string;
    auxHeading: string;
    enableHints: string;
    undoCount: string;
    undoUnlimited: string;
    undoDisabled: string;
    seconds: string;
  };
}

export const ko: I18nDict = {
  app: {
    title: '픽셀 체스 로그라이크',
    subtitle: '정통 체스와 모험을 한 화면에',
  },
  menu: {
    classic: '클래식',
    classicDesc: 'FIDE 규정 체스 — 싱글/로컬멀티',
    adventure: '모험',
    adventureDesc: 'HP·아이템·노드맵 로그라이크',
    settings: '설정',
    achievements: '도전과제',
    stats: '통계',
    help: '도움말',
    starShards: '별의 조각',
    build: '빌드',
    meta: '메타 진행',
  },
  classic: {
    title: '클래식',
    single: '싱글',
    singleDesc: 'AI 대전 (Stockfish 기반)',
    local: '로컬멀티',
    localDesc: '한 디바이스 2인 핫시트',
    inProgress: '준비 중 — 다음 마일스톤에서 작업합니다.',
    back: '뒤로',
  },
  adventure: {
    title: '모험',
    inProgress: '준비 중 — M3 마일스톤에서 작업합니다.',
    back: '뒤로',
    characterSelect: '캐릭터 선택',
    characterSelectDesc:
      '한 번의 런으로 보스 클리어를 목표로 합니다. 별의 조각으로 다음 런이 점점 강화됩니다.',
    resumeRun: '진행 중인 런',
    resume: '이어하기',
    discard: '폐기',
    locked: '잠김 (메타 진행에서 해금)',
    map: '맵',
    inventory: '인벤토리',
    gold: '골드',
    abandon: '런 포기',
    result: {
      victory: '런 성공 — 보스 클리어',
      defeat: '런 실패',
      completedNodes: '완료 노드',
      remainingGold: '잔여 골드',
      thisRunShards: '이번 런 별의 조각',
      byActHeading: '막별 진행',
      actUnreached: '미도달',
      newAchievements: '새로 잠금 해제된 도전과제',
      nextRun: '다음 런',
      mainMenu: '메인 메뉴',
      leaderboardTitle: '🌐 글로벌 랭킹 등록',
      registerSuccess: '✅ 랭킹에 성공적으로 등록되었습니다!',
      nicknamePlaceholder: '닉네임 입력 (최대 10자)',
      registering: '등록 중...',
      register: '등록',
      enterNicknameError: '닉네임을 입력해주세요.',
      serverError: '서버 등록에 실패했습니다.',
      offlineModeNotice: '현재 오프라인 모드입니다. 서버와 연결할 수 없어 랭킹 등록이 비활성화되었습니다. (진행 상황과 도전과제는 로컬에 안전하게 저장되었습니다.)',
      serverOfflineError: '서버 연결에 실패했습니다. 오프라인 모드로 자동 전환되며, 게임 결과는 로컬에 정상 보존되었습니다.',
    },
  },
  settings: {
    title: '설정',
    audio: '사운드',
    bgm: 'BGM 볼륨',
    sfx: 'SFX 볼륨',
    muted: '음소거',
    locale: '언어',
    theme: '테마',
    boardSkin: '보드 스킨',
    pieceSkin: '기물 스킨',
    accessibility: '접근성',
    reducedMotion: '모션 감소',
    notation: '기보 표기',
    notationSan: 'SAN',
    notationSanKr: 'SAN + 한국기원',
    close: '닫기',
  },
  stats: {
    title: '통계',
    emptyHint: '아직 완료된 모험 런이 없습니다. 런을 한 번 끝내면 여기에 누적 통계가 쌓입니다.',
    totalRuns: '총 런 수',
    totalVictories: '승리 수',
    winRate: '승률',
    bossClears: '보스 클리어',
    bossClearsByAct: '막별 보스 클리어',
    goldEarned: '획득 골드 합계',
    nodesCompleted: '완료한 노드 합계',
    legendaries: '획득한 Legendary',
    shopPurchases: '상점 통과 수',
    back: '메인 메뉴',
    leaderboardTitle: '글로벌 리더보드',
    rank: '순위',
    nickname: '닉네임',
    character: '캐릭터',
    progress: '달성 막',
    score: '완료 노드',
    noLeaderboard: '등록된 랭킹 데이터가 없습니다.',
    act1Boss: '1막 (Act 1 Boss)',
    act2Boss: '2막 (Act 2 Boss)',
    act3Boss: '3막 (Final Boss)',
    refresh: '🔄 새로고침',
    loading: '랭킹 데이터 로딩 중...',
    offlineMode: '오프라인 모드: 서버와 연결할 수 없습니다.',
    retry: '다시 시도',
  },
  help: {
    title: '도움말',
    classicHeading: '클래식 모드',
    classicBody:
      'FIDE 정규 체스 규칙을 그대로 따릅니다. 체크메이트·스테일메이트·50수·3회 동형·시간 만료·기권으로 종료됩니다. 싱글은 Stockfish AI와 대전하며 무르기를 사용자 판단으로 사용할 수 있습니다. 로컬멀티는 같은 디바이스에서 두 명이 번갈아 두며, 무르기·무승부 제안은 상대 동의가 필요합니다.',
    adventureHeading: '모험 모드',
    adventureBody:
      '기물마다 HP·ATK가 있고, 아이템·노드맵·캐릭터 패시브로 변형된 체스 전투가 이어집니다. 일반 노드에서 스테일메이트는 패배이고, 보스 노드는 체크메이트로만 종료됩니다. 런 종료 시 별의 조각이 메타로 합산되어 다음 런이 강화됩니다.',
    controlsHeading: '조작',
    controlsBody:
      '보드 셀을 탭/클릭해 기물을 선택하고, 강조된 칸으로 이동합니다. 폰이 끝줄에 닿으면 승급 다이얼로그가 열립니다. 모바일에서는 한 손 조작을 고려해 셀 외곽까지 클릭이 가능하도록 영역이 약간 확장됩니다.',
    accessibilityHeading: '접근성',
    accessibilityBody:
      '설정에서 모션 감소 옵션을 켜면 보드 회전·기물 이동·다이얼로그 트랜지션이 즉시 적용됩니다. BGM/SFX 볼륨을 개별 조절할 수 있고, 언어(한국어/영어)와 기보 표기(SAN / SAN + 한국기원)도 변경 가능합니다.',
    back: '메인 메뉴',
  },
  achievements: {
    title: '도전과제',
    back: '메인 메뉴',
    hint: '모험 런 종료 시 자동으로 조건을 평가합니다.',
    achieved: '달성 ✓',
  },
  meta: {
    title: '메타 진행',
    back: '메인 메뉴',
    starShards: '별의 조각',
    loading: '메타 진행 로딩 중…',
    categories: {
      character: '캐릭터',
      item: '아이템 풀',
      bonus: '영구 장식품',
    },
    unlocked: '해금됨',
    unlock: '잠금해제',
    purchasing: '구매 중…',
    insufficient: '조각 부족',
    confirmTitle: '잠금해제 확인',
    confirmBody: '{name}을(를) ⭐ {cost}조각으로 해금합니다.',
    cancel: '취소',
  },
  characters: {
    standard: '정규단',
    standardDesc: 'FIDE 표준 8x8 진형. 균형 잡힌 시작 — 모험 모드 입문에 적합.',
    assassins: '암살자단',
    assassinsDesc: '나이트 강화 파티. 두 나이트가 HP·ATK + 점프 확장 보너스를 받는다.',
    saints: '신성단',
    saintsDesc: '비숍·킹 강화 + 결속 패시브. 매 턴 킹 HP +1 회복.',
  },
  difficulty: {
    novice: '초보',
    noviceDesc: '체스를 막 배운 상대 (ELO 1000)',
    amateur: '아마추어',
    amateurDesc: '동네 클럽 수준 (ELO 1300)',
    intermediate: '중급',
    intermediateDesc: '꽤 잘 두는 상대 (ELO 1600)',
    advanced: '상급',
    advancedDesc: '강자 (ELO 2000)',
    master: '마스터',
    masterDesc: '최강 (ELO 2500)',
    custom: '커스텀',
    customDesc: '직접 ELO/시간 지정',
  },
  classicOptions: {
    timeControl: '시간 제어',
    presets: {
      bullet: '불릿 (1분)',
      blitz: '블리츠 (3분 + 2초)',
      rapid: '래피드 (10분 + 5초)',
      classical: '클래시컬 (30분)',
    },
    unlimited: '무제한',
    custom: '커스텀',
    initialSec: '초기 시간',
    incrementSec: '증분',
    hotseatHeading: '핫시트 옵션',
    rotateBoard: '차례마다 보드 자동 회전',
    allowUndo: '무르기 허용 (양측 합의)',
    allowDrawOffer: '무승부 제안 허용',
    cancel: '취소',
    startGame: '게임 시작',
    difficultyHeading: '난이도',
    colorHeading: '플레이어 색상',
    colorWhite: '백',
    colorBlack: '흑',
    colorRandom: '랜덤',
    auxHeading: '보조 기능',
    enableHints: '힌트 사용',
    undoCount: '무르기 허용 횟수',
    undoUnlimited: '무제한',
    undoDisabled: '비활성',
    seconds: '초',
  },
};
