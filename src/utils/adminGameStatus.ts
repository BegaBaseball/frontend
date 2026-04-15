import type {
  AdminGameStatusMismatch,
  AdminNonCanonicalCleanupTrackerRecord,
  AdminNonCanonicalCleanupTrackerStatus,
  AdminNonCanonicalGame,
} from '../types/admin';

export type {
  AdminNonCanonicalCleanupTrackerRecord,
  AdminNonCanonicalCleanupTrackerStatus,
} from '../types/admin';

export interface AdminGameStatusDateRecommendation {
  gameDate: string;
  mismatchCount: number;
  nonCanonicalCount: number;
  issueCount: number;
  effectiveStatuses: string[];
}

const NON_CANONICAL_CLEANUP_TRACKER_STORAGE_KEY = 'admin-game-status-non-canonical-tracker:v1';

export const formatInputDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const shiftInputDate = (dateText: string, offsetDays: number) => {
  const [year, month, day] = dateText.split('-').map((value) => Number.parseInt(value, 10));
  const shiftedDate = new Date(year, month - 1, day);
  shiftedDate.setDate(shiftedDate.getDate() + offsetDays);
  return formatInputDate(shiftedDate);
};

const formatRangeLabel = (startDate: string, endDate?: string) =>
  endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;

const formatTimeLabel = (value: string | null | undefined) => value ? value.slice(0, 5) : '-';

const formatScoreLabel = (homeScore: number | null, awayScore: number | null) => {
  if (homeScore == null && awayScore == null) {
    return '-';
  }

  return `원정 ${awayScore ?? '-'} / 홈 ${homeScore ?? '-'}`;
};

const formatTeamLabel = (homeTeam: string | null | undefined, awayTeam: string | null | undefined) =>
  `원정 ${awayTeam || '-'} / 홈 ${homeTeam || '-'}`;

const getLocalStorage = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const readCleanupTrackerStore = (): Record<string, AdminNonCanonicalCleanupTrackerRecord> => {
  const storage = getLocalStorage();
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(NON_CANONICAL_CLEANUP_TRACKER_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, AdminNonCanonicalCleanupTrackerRecord> : {};
  } catch {
    return {};
  }
};

const writeCleanupTrackerStore = (store: Record<string, AdminNonCanonicalCleanupTrackerRecord>) => {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }

  storage.setItem(NON_CANONICAL_CLEANUP_TRACKER_STORAGE_KEY, JSON.stringify(store));
};

export const loadAllNonCanonicalCleanupTrackers = () => readCleanupTrackerStore();

export const buildNonCanonicalCleanupTrackerKey = (startDate: string, endDate?: string) =>
  endDate && endDate !== startDate ? `${startDate}:${endDate}` : startDate;

export const parseNonCanonicalCleanupTrackerKey = (key: string) => {
  const [startDate, endDate] = key.split(':');
  return {
    startDate,
    endDate: endDate || startDate,
  };
};

export const buildNonCanonicalGameCleanupDraft = ({
  startDate,
  endDate,
  runbookPath,
  games,
}: {
  startDate: string;
  endDate?: string;
  runbookPath: string;
  games: AdminNonCanonicalGame[];
}) => [
  '[Prediction 비정상 팀 코드 raw row 정제 요청]',
  `- 조회 범위: ${formatRangeLabel(startDate, endDate)}`,
  `- 비정상 row 수: ${games.length}건`,
  `- runbook: ${runbookPath}`,
  '',
  '정제 대상 raw row:',
  ...games.flatMap((game, index) => [
    `${index + 1}. ${game.gameId}`,
    `   - 경기일: ${game.gameDate}`,
    `   - 시작: ${formatTimeLabel(game.startTime)}`,
    `   - raw 상태: ${game.rawStatus || '-'}`,
    `   - 팀 코드: ${formatTeamLabel(game.homeTeam, game.awayTeam)}`,
    `   - 점수: ${formatScoreLabel(game.homeScore, game.awayScore)}`,
    `   - 근거: ${game.reasons.length > 0 ? game.reasons.join(', ') : '-'}`,
  ]),
  '',
  '요청 사항:',
  '- canonical 팀 코드 기준으로 raw row 정정',
  '- 정정 후 prediction 경기 상태 진단/복구를 다시 실행할지 확인',
].join('\n');

export const loadNonCanonicalCleanupTracker = ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate?: string;
}) => {
  const store = readCleanupTrackerStore();
  return store[buildNonCanonicalCleanupTrackerKey(startDate, endDate)] ?? null;
};

export const saveNonCanonicalCleanupTracker = ({
  startDate,
  endDate,
  record,
}: {
  startDate: string;
  endDate?: string;
  record: AdminNonCanonicalCleanupTrackerRecord;
}) => {
  const store = readCleanupTrackerStore();
  store[buildNonCanonicalCleanupTrackerKey(startDate, endDate)] = record;
  writeCleanupTrackerStore(store);
};

export const clearNonCanonicalCleanupTracker = ({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate?: string;
}) => {
  const store = readCleanupTrackerStore();
  delete store[buildNonCanonicalCleanupTrackerKey(startDate, endDate)];
  writeCleanupTrackerStore(store);
};

export const buildGameStatusDateRecommendations = (
  {
    mismatches,
    nonCanonicalGames = [],
  }: {
    mismatches: AdminGameStatusMismatch[];
    nonCanonicalGames?: AdminNonCanonicalGame[];
  },
): AdminGameStatusDateRecommendation[] => {
  const grouped = new Map<string, {
    mismatchCount: number;
    nonCanonicalCount: number;
    effectiveStatuses: Set<string>;
  }>();

  mismatches.forEach((mismatch) => {
    const existing = grouped.get(mismatch.gameDate) ?? {
      mismatchCount: 0,
      nonCanonicalCount: 0,
      effectiveStatuses: new Set<string>(),
    };

    existing.mismatchCount += 1;
    if (mismatch.effectiveStatus) {
      existing.effectiveStatuses.add(mismatch.effectiveStatus);
    }

    grouped.set(mismatch.gameDate, existing);
  });

  nonCanonicalGames.forEach((game) => {
    const existing = grouped.get(game.gameDate) ?? {
      mismatchCount: 0,
      nonCanonicalCount: 0,
      effectiveStatuses: new Set<string>(),
    };

    existing.nonCanonicalCount += 1;
    grouped.set(game.gameDate, existing);
  });

  return [...grouped.entries()]
    .map(([gameDate, summary]) => ({
      gameDate,
      mismatchCount: summary.mismatchCount,
      nonCanonicalCount: summary.nonCanonicalCount,
      issueCount: summary.mismatchCount + summary.nonCanonicalCount,
      effectiveStatuses: [...summary.effectiveStatuses].sort(),
    }))
    .sort((left, right) => right.gameDate.localeCompare(left.gameDate));
};
