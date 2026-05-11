import type { CategoryType } from '../types/stadium';

export type IncheonVisitQuickActionKind = 'seatmap' | 'category';

export interface IncheonVisitQuickAction {
  id: string;
  label: string;
  description: string;
  actionLabel: string;
  kind: IncheonVisitQuickActionKind;
  category?: CategoryType;
}

export const INCHEON_STADIUM_GUIDE_ALIASES = [
  'INCHEON',
  'SSG',
  '문학',
  '인천',
  '랜더스',
] as const;

export const INCHEON_VISIT_QUICK_ACTIONS: IncheonVisitQuickAction[] = [
  {
    id: 'seatmap',
    label: '좌석 먼저',
    description: '블록과 실제 시야 후보를 먼저 좁힙니다.',
    actionLabel: '좌석도 보기',
    kind: 'seatmap',
  },
  {
    id: 'food',
    label: '먹거리',
    description: '입장 전후 식사 후보를 확인합니다.',
    actionLabel: '먹거리 보기',
    kind: 'category',
    category: 'food',
  },
  {
    id: 'delivery',
    label: '배달픽업',
    description: '픽업 동선이 필요한 주문을 확인합니다.',
    actionLabel: '픽업 보기',
    kind: 'category',
    category: 'delivery',
  },
  {
    id: 'store',
    label: '편의점',
    description: '주변 편의점 후보를 확인합니다.',
    actionLabel: '편의점 보기',
    kind: 'category',
    category: 'store',
  },
  {
    id: 'parking',
    label: '주차',
    description: '차량 방문 전 주차 후보를 확인합니다.',
    actionLabel: '주차장 보기',
    kind: 'category',
    category: 'parking',
  },
];

function normalizeIncheonVisitGuideKey(value: string): string {
  return value.toLowerCase().replace(/[\s\-_/()·.]/g, '');
}

export function isIncheonStadium(stadiumId?: string | null, stadiumName?: string | null): boolean {
  const key = normalizeIncheonVisitGuideKey([stadiumId, stadiumName].filter(Boolean).join(' '));

  if (!key) {
    return false;
  }

  return INCHEON_STADIUM_GUIDE_ALIASES.some((alias) => key.includes(normalizeIncheonVisitGuideKey(alias)));
}
