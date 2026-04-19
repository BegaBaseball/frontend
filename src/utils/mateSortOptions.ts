import type { MatePartySortBy, MatePartySortDir } from '../types/mate';

export type MateSortOptionKey = 'latest' | 'dDay' | 'popular';

export interface MateSortOption {
  key: MateSortOptionKey;
  label: string;
  description: string;
  sortBy: MatePartySortBy;
  sortDir: MatePartySortDir;
}

export const MATE_SORT_OPTIONS: MateSortOption[] = [
  {
    key: 'latest',
    label: '최신순',
    description: '새로 열린 파티 먼저',
    sortBy: 'createdAt',
    sortDir: 'desc',
  },
  {
    key: 'dDay',
    label: '경기 임박순',
    description: '가까운 경기 날짜 먼저',
    sortBy: 'gameDate',
    sortDir: 'asc',
  },
  {
    key: 'popular',
    label: '인기순',
    description: '참여 인원이 많은 파티 먼저',
    sortBy: 'currentParticipants',
    sortDir: 'desc',
  },
];
