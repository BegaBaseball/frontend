export type MateSeatFilterCategory = 'CHEERING' | 'TABLE' | 'PREMIUM' | 'EXCITING';

export interface MateSeatFilterOption {
  id: string;
  label: string;
  category: MateSeatFilterCategory;
}

interface MateSeatFilterStadium {
  id: string;
  name: string;
  teamAliases: string[];
  seatOptions: MateSeatFilterOption[];
}

export const DEFAULT_MATE_SEAT_FILTER_OPTIONS: MateSeatFilterOption[] = [
  { id: 'CHEERING', label: '응원석', category: 'CHEERING' },
  { id: 'TABLE', label: '테이블석', category: 'TABLE' },
  { id: 'PREMIUM', label: '프리미엄', category: 'PREMIUM' },
  { id: 'EXCITING', label: '익사이팅', category: 'EXCITING' },
];

const MATE_SEAT_FILTER_STADIUMS: MateSeatFilterStadium[] = [
  {
    id: 'Jamsil',
    name: '서울잠실야구장',
    teamAliases: ['lg', 'doosan', '두산'],
    seatOptions: [
      { id: 'orange', label: '오렌지석', category: 'CHEERING' },
      { id: 'red', label: '레드석', category: 'CHEERING' },
      { id: 'premium', label: '프리미엄석', category: 'PREMIUM' },
      { id: 'table', label: '테이블석', category: 'TABLE' },
    ],
  },
  {
    id: 'Incheon',
    name: '인천SSG랜더스필드',
    teamAliases: ['ssg', 'sk'],
    seatOptions: [
      { id: 'eusseuk', label: '으쓱이존', category: 'CHEERING' },
      { id: 'live', label: '라이브존', category: 'PREMIUM' },
      { id: 'table', label: '테이블석', category: 'TABLE' },
    ],
  },
  {
    id: 'Daegu',
    name: '대구 삼성 라이온즈파크',
    teamAliases: ['samsung', '삼성'],
    seatOptions: [
      { id: 'blue', label: '블루존', category: 'CHEERING' },
      { id: 'vip', label: 'VIP석', category: 'PREMIUM' },
      { id: 'table', label: '테이블석 (지브로존)', category: 'TABLE' },
    ],
  },
  {
    id: 'Gwangju',
    name: '광주기아챔피언스필드',
    teamAliases: ['kia'],
    seatOptions: [
      { id: 'k7', label: 'K7석', category: 'CHEERING' },
      { id: 'champion', label: '챔피언석', category: 'PREMIUM' },
      { id: 'central_table', label: '중앙 테이블석', category: 'TABLE' },
    ],
  },
  {
    id: 'Suwon',
    name: '수원KT위즈파크',
    teamAliases: ['kt'],
    seatOptions: [
      { id: 'cheer', label: '응원지정석', category: 'CHEERING' },
      { id: 'genie', label: '지니존 / BC카드존', category: 'PREMIUM' },
    ],
  },
  {
    id: 'Changwon',
    name: '창원NC파크',
    teamAliases: ['nc'],
    seatOptions: [
      { id: 'inner_cheer', label: '내야 응원석', category: 'CHEERING' },
      { id: 'premium_table', label: '프리미엄 테이블석', category: 'PREMIUM' },
    ],
  },
  {
    id: 'Sajik',
    name: '사직야구장',
    teamAliases: ['lotte', '롯데'],
    seatOptions: [
      { id: 'inner_field', label: '내야 필드석', category: 'CHEERING' },
      { id: 'central_table', label: '중앙 탁자석', category: 'TABLE' },
      { id: 'wide_table', label: '와이드/일반 테이블석', category: 'TABLE' },
    ],
  },
  {
    id: 'Gocheok',
    name: '고척스카이돔',
    teamAliases: ['kiwoom', '키움'],
    seatOptions: [
      { id: 'burgundy', label: '버건디석', category: 'CHEERING' },
      { id: 'diamond', label: '다이아몬드 클럽', category: 'PREMIUM' },
      { id: 'gold', label: '골드 내야석', category: 'TABLE' },
    ],
  },
  {
    id: 'Daejeon',
    name: '대전 한화생명볼파크',
    teamAliases: ['hanwha', '한화'],
    seatOptions: [
      { id: 'vip', label: 'VIP 프리미엄석', category: 'PREMIUM' },
      { id: 'home_plate', label: '홈 플레이트 테이블석', category: 'PREMIUM' },
      { id: 'central_table', label: '중앙 탁자석', category: 'TABLE' },
      { id: 'inner_lower', label: '내야 하단 지정석', category: 'CHEERING' },
    ],
  },
];

export const resolveMateSeatFilterOptions = (query: string): MateSeatFilterOption[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return DEFAULT_MATE_SEAT_FILTER_OPTIONS;
  }

  const stadium = MATE_SEAT_FILTER_STADIUMS.find((candidate) => (
    candidate.name.includes(normalizedQuery)
    || candidate.teamAliases.some((alias) => normalizedQuery.includes(alias))
  ));

  return stadium?.seatOptions ?? DEFAULT_MATE_SEAT_FILTER_OPTIONS;
};
