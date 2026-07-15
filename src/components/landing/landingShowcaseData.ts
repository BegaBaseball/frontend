import type { TeamKey } from './landingAssets';

export interface TickerItem {
  firstTeam: TeamKey;
  firstLabel: string;
  score: string;
  secondTeam: TeamKey;
  secondLabel: string;
  status: string;
  tone: 'finished' | 'live' | 'scheduled' | 'extra';
}

export const TEAM_ORDER: TeamKey[] = ['lg', 'doosan', 'kia', 'samsung', 'ssg', 'lotte', 'kt', 'nc', 'hanwha', 'kiwoom'];

export const TEAM_LABELS: Record<TeamKey, string> = {
  lg: 'LG',
  doosan: '두산',
  kia: 'KIA',
  samsung: '삼성',
  ssg: 'SSG',
  lotte: '롯데',
  kt: 'KT',
  nc: 'NC',
  hanwha: '한화',
  kiwoom: '키움',
};

export const TICKER_ITEMS: TickerItem[] = [
  { firstTeam: 'kia', firstLabel: 'KIA', score: '5 : 3', secondTeam: 'samsung', secondLabel: '삼성', status: '경기종료', tone: 'finished' },
  { firstTeam: 'lg', firstLabel: 'LG', score: '4 : 2', secondTeam: 'doosan', secondLabel: '두산', status: 'LIVE 7회', tone: 'live' },
  { firstTeam: 'ssg', firstLabel: 'SSG', score: '18:30', secondTeam: 'lotte', secondLabel: '롯데', status: '예정', tone: 'scheduled' },
  { firstTeam: 'kt', firstLabel: 'KT', score: '2 : 2', secondTeam: 'nc', secondLabel: 'NC', status: '연장 10회', tone: 'extra' },
  { firstTeam: 'hanwha', firstLabel: '한화', score: '18:30', secondTeam: 'kiwoom', secondLabel: '키움', status: '예정', tone: 'scheduled' },
];

export type LandingFeatureNumber = '01' | '02' | '03' | '04' | '05' | '06';

export const LANDING_FEATURE_LABELS: Record<LandingFeatureNumber, string> = {
  '01': '경기 데이터',
  '02': '승리예측',
  '03': '응원글',
  '04': '같이가요',
  '05': '구장가이드',
  '06': '직관일기',
};

export interface LandingFeatureCopy {
  title: string;
  description: string;
}

export const LANDING_PRIMARY_FEATURE_COPY: Record<'01' | '02' | '03', LandingFeatureCopy> = {
  '01': {
    title: '오늘의 KBO,\n점수부터 순위까지 실시간',
    description: '경기가 흐르는 대로 점수가 굴러갑니다. 오늘의 경기 일정과 실시간 스코어, 팀 순위와 기록을 한 화면에서 확인하세요.',
  },
  '02': {
    title: '감이 아니라 데이터로\n오늘 경기를 읽다',
    description: 'AI 코치가 선발 투수, 최근 흐름, 상대 전적을 종합해 승리 확률을 계산합니다. 경기 전 예측에 참여하고 팬들의 선택과 비교해보세요.',
  },
  '03': {
    title: '우리 팀의 순간을\n팬들과 함께 외치다',
    description: '끝내기 홈런의 흥분을 혼자 삼키지 마세요. 팀별 피드에서 응원글을 올리고, 좋아요와 팔로우로 같은 팀 팬들과 연결됩니다.',
  },
};

export const LANDING_SECONDARY_FEATURE_COPY: Record<'04' | '05' | '06', LandingFeatureCopy> = {
  '04': {
    title: '혼자 가는 직관은\n이제 그만',
    description: '같은 경기에 가는 팬끼리 파티를 만들어 매칭됩니다. 신청하고, 호스트의 승인을 받고, 채팅방에서 만날 약속을 잡으세요.',
  },
  '05': {
    title: '처음 가는 구장도\n단골처럼',
    description: '9개 KBO 구장의 좌석 뷰, 구장 먹거리, 교통편까지. 직관 전에 미리 확인하고 최고의 자리를 찾아보세요.',
  },
  '06': {
    title: '나의 직관 기록이\n쌓여가는 즐거움',
    description: '다녀온 경기를 승 · 무 · 패 태그와 한 줄 소감으로 기록하세요. 시즌이 끝나면 나만의 직관 승률이 남습니다.',
  },
};

export const LANDING_MATE_DATA = {
  team: 'lg' as TeamKey,
  matchup: 'LG vs 두산 · 잠실',
  status: '모집 중',
  details: ['2025.10.26(일) 18:30', '2/4명', '3루 응원석'],
  steps: ['신청', '승인', '채팅'],
  depositCopy: '경기 당일 체크인으로 보증금을 환불받으세요',
};

export const LANDING_STADIUM_CHIPS = [
  '잠실',
  '고척',
  '문학',
  '수원',
  '대전',
  '대구',
  '사직',
  '창원',
  '광주',
] as const;

export interface LandingStadiumStat {
  value: string;
  label: string;
}

export const LANDING_STADIUM_DATA = {
  imageAlt: '잠실야구장',
  venue: '잠실야구장 · 서울종합운동장',
  stats: [
    { value: '25,000', label: '좌석' },
    { value: '32', label: '먹거리' },
    { value: '2호선', label: '교통' },
  ] satisfies LandingStadiumStat[],
};

export interface LandingDiaryResult {
  label: '승' | '무' | '패';
  tone: 'win' | 'draw' | 'loss';
}

export const LANDING_DIARY_DATA = {
  heading: '나의 10월 직관',
  summary: '10회 · 승률 0.700',
  results: [
    { label: '승', tone: 'win' },
    { label: '승', tone: 'win' },
    { label: '패', tone: 'loss' },
    { label: '승', tone: 'win' },
    { label: '무', tone: 'draw' },
    { label: '승', tone: 'win' },
    { label: '승', tone: 'win' },
    { label: '패', tone: 'loss' },
    { label: '승', tone: 'win' },
    { label: '승', tone: 'win' },
  ] satisfies LandingDiaryResult[],
  quoteDate: '10.26(일) 잠실',
  quoteResult: '승',
  quote: '끝내기 직관. 목이 쉬었지만 후회는 없다',
};

export interface LandingGameStanding {
  rank: number;
  team: TeamKey;
  label: string;
  rate: string;
  barWidth: string;
}

export const LANDING_GAME_DATA = {
  liveLabel: 'LIVE · 7회말 · 잠실',
  homeTeam: 'lg' as TeamKey,
  homeLabel: 'LG',
  awayTeam: 'doosan' as TeamKey,
  awayLabel: '두산',
  scoreRoll: [3, 4, 5],
  awayScore: 2,
  inningStates: [true, true, true, true, true, true, false, false, false],
  standingsLabel: '팀 순위',
  standings: [
    { rank: 1, team: 'lg', label: 'LG', rate: '0.618', barWidth: '88%' },
    { rank: 2, team: 'kia', label: 'KIA', rate: '0.577', barWidth: '80%' },
    { rank: 3, team: 'hanwha', label: '한화', rate: '0.563', barWidth: '76%' },
  ] satisfies LandingGameStanding[],
};

export const LANDING_PREDICTION_DATA = {
  heading: '오늘의 승리 확률',
  badge: 'AI 코치',
  firstTeam: 'lg' as TeamKey,
  firstLabel: 'LG',
  firstProbability: 64,
  secondTeam: 'doosan' as TeamKey,
  secondLabel: '두산',
  secondProbability: 36,
  facts: ['선발 ERA 2.84', '최근 10경기 7승', '상대 전적 9:5'],
};

export interface LandingCheerPost {
  team: 'lg' | 'kia';
  avatarLabel: string;
  author: string;
  handle: string;
  time: string;
  body: string;
  likes: number;
  comments: number;
  liked: boolean;
  followLabel?: string;
}

export const LANDING_CHEER_POSTS: readonly LandingCheerPost[] = [
  {
    team: 'lg',
    avatarLabel: '직',
    author: '직관러버',
    handle: '@lg_twins_fan',
    time: '21:42',
    body: '9회말 끝내기라니. 오늘 잠실 온 보람 있다 진짜',
    likes: 128,
    comments: 24,
    liked: true,
    followLabel: '팔로우',
  },
  {
    team: 'kia',
    avatarLabel: '호',
    author: '호랑이의심장',
    handle: '@tigers_v12',
    time: '21:10',
    body: '선발 7이닝 무실점, 다음 등판도 믿는다',
    likes: 86,
    comments: 11,
    liked: false,
  },
];

export interface LandingRetroLeaderboardEntry {
  rank: number;
  handle: string;
  rate: string;
  tone: 'leader' | 'highlight' | 'muted';
}

export const LANDING_OFFSEASON_DATA = {
  label: '시즌이 끝나도',
  title: '야구는 겨울에도 계속됩니다',
  description: '오프시즌엔 스토브리그 인사이트로, 그리고 시즌 기록을 겨루는 복고풍 리더보드로.',
  insight: {
    label: 'OFFSEASON INSIGHT',
    title: '스토브리그의 모든 소식,\n데이터로 정리해드립니다',
    description: 'FA 이적 · 신인 드래프트 · 스프링캠프 리포트까지, 겨울에도 팬심이 식지 않도록.',
    chips: ['FA 트래커', '캠프 리포트'],
  },
  retro: {
    label: 'RETRO MODE',
    title: '8-bit 리더보드에서\n시즌 기록을 겨루세요',
    description: '직관 승률 · 예측 적중률 랭킹. 픽셀 야구장에서 만나요.',
    leaderboard: [
      { rank: 1, handle: 'TIGERS_V12', rate: '.712', tone: 'leader' },
      { rank: 2, handle: 'JIKGWAN_LOVER', rate: '.700', tone: 'highlight' },
      { rank: 3, handle: 'BEGA_FAN_01', rate: '.685', tone: 'muted' },
    ] satisfies LandingRetroLeaderboardEntry[],
  },
};

export interface LandingStartGuideStep {
  number: 1 | 2 | 3;
  title: string;
  description: string;
}

export const LANDING_START_GUIDE: readonly LandingStartGuideStep[] = [
  {
    number: 1,
    title: '응원 팀을 고르세요',
    description: '10개 구단 중 내 팀을 선택하면 피드와 일정이 우리 팀 중심으로 정렬됩니다.',
  },
  {
    number: 2,
    title: '오늘 경기를 확인하세요',
    description: '실시간 스코어와 AI 승리 확률을 보고, 경기 전 예측에 참여해보세요.',
  },
  {
    number: 3,
    title: '직관을 기록하세요',
    description: '같이가요로 메이트를 만나고, 다녀온 경기는 직관일기에 남기세요.',
  },
];

export const LANDING_CLOSING_COPY = {
  title: '야구팬의 하루가\n전부 BEGA 안에 있습니다',
  description: '실시간 경기 정보부터 함께 갈 메이트까지,\n시즌의 모든 순간을 함께하세요.',
};
