import type { AdminGameStatusMismatch } from '../types/admin';

export interface AdminGameStatusDateRecommendation {
  gameDate: string;
  mismatchCount: number;
  effectiveStatuses: string[];
}

export const formatInputDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const shiftInputDate = (dateText: string, offsetDays: number) => {
  const [year, month, day] = dateText.split('-').map((value) => Number.parseInt(value, 10));
  const shiftedDate = new Date(year, month - 1, day);
  shiftedDate.setDate(shiftedDate.getDate() + offsetDays);
  return formatInputDate(shiftedDate);
};

export const buildGameStatusDateRecommendations = (
  mismatches: AdminGameStatusMismatch[],
): AdminGameStatusDateRecommendation[] => {
  const grouped = new Map<string, { mismatchCount: number; effectiveStatuses: Set<string> }>();

  mismatches.forEach((mismatch) => {
    const existing = grouped.get(mismatch.gameDate) ?? {
      mismatchCount: 0,
      effectiveStatuses: new Set<string>(),
    };

    existing.mismatchCount += 1;
    if (mismatch.effectiveStatus) {
      existing.effectiveStatuses.add(mismatch.effectiveStatus);
    }

    grouped.set(mismatch.gameDate, existing);
  });

  return [...grouped.entries()]
    .map(([gameDate, summary]) => ({
      gameDate,
      mismatchCount: summary.mismatchCount,
      effectiveStatuses: [...summary.effectiveStatuses].sort(),
    }))
    .sort((left, right) => right.gameDate.localeCompare(left.gameDate));
};
