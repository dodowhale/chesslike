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
    starShards: string;
    build: string;
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
    starShards: '별의 조각',
    build: '빌드',
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
};
