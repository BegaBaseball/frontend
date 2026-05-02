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

export interface AdminNonCanonicalCleanupArtifactPaths {
  summaryJson: string | null;
  handoffMd: string | null;
}

export interface AdminNonCanonicalCleanupClosureSync {
  comparedAt: string | null;
  compareStatus: 'PASS' | 'FAIL' | 'UNKNOWN';
  trackerStatus: string | null;
  resolvedCount: number | null;
  remainingCount: number | null;
  newCount: number | null;
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

const extractLastNotePath = (note: string, fieldName: 'summary_json' | 'handoff_md') => {
  const matches = [...note.matchAll(new RegExp(`^- ${fieldName}:\\s*(.+)$`, 'gm'))];
  if (matches.length === 0) {
    return null;
  }

  const candidate = matches[matches.length - 1]?.[1]?.trim();
  return candidate ? candidate : null;
};

export const extractNonCanonicalCleanupArtifactPaths = (note: string): AdminNonCanonicalCleanupArtifactPaths => ({
  summaryJson: extractLastNotePath(note, 'summary_json'),
  handoffMd: extractLastNotePath(note, 'handoff_md'),
});

const extractArtifactDir = (path: string | null) => {
  if (!path) {
    return null;
  }

  const normalized = path.trim();
  const lastSlashIndex = normalized.lastIndexOf('/');
  if (lastSlashIndex <= 0) {
    return null;
  }

  return normalized.slice(0, lastSlashIndex);
};

const shellQuote = (value: string) => `'${value.replace(/'/g, "'\\''")}'`;

const findFirstSystemLineIndex = (lines: string[]) => lines.findIndex((line) => (
  /^\[closure-sync /.test(line)
  || /^- (summary_json|handoff_md):/.test(line)
));

export const buildNonCanonicalClosureCommand = (artifacts: AdminNonCanonicalCleanupArtifactPaths) => {
  const artifactDir = extractArtifactDir(artifacts.summaryJson) ?? extractArtifactDir(artifacts.handoffMd);
  if (!artifactDir) {
    return null;
  }

  return [
    'DATABASE_URL=<DATABASE_URL> \\',
    'bash scripts/report_prediction_noncanonical_closure.sh \\',
    `  --artifact-dir ${shellQuote(artifactDir)} \\`,
    '  --fail-on-unresolved',
  ].join('\n');
};

export const buildNonCanonicalClosureTrackerSyncCommand = (artifacts: AdminNonCanonicalCleanupArtifactPaths) => {
  const artifactDir = extractArtifactDir(artifacts.summaryJson) ?? extractArtifactDir(artifacts.handoffMd);
  if (!artifactDir) {
    return null;
  }

  return [
    'DATABASE_URL=<DATABASE_URL> \\',
    'TRACKER_BASE_URL=<TRACKER_BASE_URL> \\',
    'TRACKER_ORIGIN=<TRACKER_ORIGIN> \\',
    'TRACKER_ADMIN_EMAIL=<ADMIN_EMAIL> \\',
    "TRACKER_ADMIN_PASSWORD='<ADMIN_PASSWORD>' \\",
    'bash scripts/report_prediction_noncanonical_closure.sh \\',
    `  --artifact-dir ${shellQuote(artifactDir)} \\`,
    '  --fail-on-unresolved \\',
    '  --sync-tracker \\',
    '  --tracker-base-url "$TRACKER_BASE_URL" \\',
    '  --tracker-origin "$TRACKER_ORIGIN" \\',
    '  --tracker-admin-email "$TRACKER_ADMIN_EMAIL" \\',
    '  --tracker-admin-password "$TRACKER_ADMIN_PASSWORD"',
  ].join('\n');
};

export const extractNonCanonicalCleanupClosureSync = (note: string): AdminNonCanonicalCleanupClosureSync | null => {
  const matches = [
    ...note.matchAll(
      /\[closure-sync ([^\]]+)\][^\n\r]*?compare=(PASS|FAIL|UNKNOWN)\s+tracker=([^\s]+)\s+resolved=(\d+)\s+remaining=(\d+)\s+new=(\d+)/g,
    ),
  ];
  if (matches.length === 0) {
    return null;
  }

  const latest = matches[matches.length - 1];
  return {
    comparedAt: latest?.[1]?.trim() || null,
    compareStatus: (latest?.[2]?.trim() as AdminNonCanonicalCleanupClosureSync['compareStatus']) || 'UNKNOWN',
    trackerStatus: latest?.[3]?.trim() || null,
    resolvedCount: latest?.[4] ? Number.parseInt(latest[4], 10) : null,
    remainingCount: latest?.[5] ? Number.parseInt(latest[5], 10) : null,
    newCount: latest?.[6] ? Number.parseInt(latest[6], 10) : null,
  };
};

export const extractNonCanonicalCleanupUserNote = (note: string): string => {
  const lines = note.split(/\r?\n/);
  const firstSystemLineIndex = findFirstSystemLineIndex(lines);

  const keptLines = (firstSystemLineIndex >= 0 ? lines.slice(0, firstSystemLineIndex) : lines).slice();
  while (keptLines.length > 0 && keptLines[keptLines.length - 1].trim() === '') {
    keptLines.pop();
  }

  return keptLines.join('\n').trim();
};

export const extractNonCanonicalCleanupSystemNote = (note: string): string => {
  const lines = note.split(/\r?\n/);
  const firstSystemLineIndex = findFirstSystemLineIndex(lines);
  if (firstSystemLineIndex < 0) {
    return '';
  }

  return lines.slice(firstSystemLineIndex).join('\n').trim();
};

export const buildNonCanonicalCleanupTrackerNote = ({
  userNote,
  existingNote,
}: {
  userNote: string;
  existingNote: string;
}) => {
  const trimmedUserNote = userNote.trim();
  const systemNote = extractNonCanonicalCleanupSystemNote(existingNote);

  if (trimmedUserNote && systemNote) {
    return `${trimmedUserNote}\n${systemNote}`;
  }

  return trimmedUserNote || systemNote;
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
