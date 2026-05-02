import assert from 'node:assert/strict';
import test from 'node:test';

import type { AdminGameStatusMismatch, AdminNonCanonicalGame } from '../types/admin';
import {
  buildNonCanonicalCleanupTrackerNote,
  buildNonCanonicalClosureCommand,
  buildNonCanonicalClosureTrackerSyncCommand,
  buildNonCanonicalCleanupTrackerKey,
  buildNonCanonicalGameCleanupDraft,
  buildGameStatusDateRecommendations,
  clearNonCanonicalCleanupTracker,
  extractNonCanonicalCleanupArtifactPaths,
  extractNonCanonicalCleanupClosureSync,
  extractNonCanonicalCleanupSystemNote,
  extractNonCanonicalCleanupUserNote,
  formatInputDate,
  loadAllNonCanonicalCleanupTrackers,
  loadNonCanonicalCleanupTracker,
  parseNonCanonicalCleanupTrackerKey,
  saveNonCanonicalCleanupTracker,
  shiftInputDate,
} from './adminGameStatus';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

const setWindowLocalStorage = (localStorage: ReturnType<typeof createStorage>) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: {
      localStorage,
    } as Window & { localStorage: typeof localStorage },
  });
};

test('formatInputDate는 Date를 yyyy-mm-dd 문자열로 만든다', () => {
  const result = formatInputDate(new Date(2026, 3, 4));

  assert.equal(result, '2026-04-04');
});

test('shiftInputDate는 날짜를 일 단위로 이동한다', () => {
  const result = shiftInputDate('2026-04-04', -13);

  assert.equal(result, '2026-03-22');
});

test('buildGameStatusDateRecommendations는 날짜별 mismatch를 묶고 최신순으로 정렬한다', () => {
  const mismatches: AdminGameStatusMismatch[] = [
    {
      gameId: 'GAME-1',
      gameDate: '2026-03-29',
      startTime: '14:00:00',
      rawStatus: 'SCHEDULED',
      normalizedRawStatus: 'SCHEDULED',
      effectiveStatus: 'COMPLETED',
      homeScore: 11,
      awayScore: 6,
      inningScoreCount: 9,
      hasKnownScore: true,
      hasInningScores: true,
      reasons: ['inning_scores_present'],
    },
    {
      gameId: 'GAME-2',
      gameDate: '2026-03-29',
      startTime: '17:00:00',
      rawStatus: 'SCHEDULED',
      normalizedRawStatus: 'SCHEDULED',
      effectiveStatus: 'DRAW',
      homeScore: 3,
      awayScore: 3,
      inningScoreCount: 9,
      hasKnownScore: true,
      hasInningScores: false,
      reasons: ['score_present'],
    },
    {
      gameId: 'GAME-3',
      gameDate: '2026-03-26',
      startTime: '18:30:00',
      rawStatus: 'SCHEDULED',
      normalizedRawStatus: 'SCHEDULED',
      effectiveStatus: 'LIVE',
      homeScore: 1,
      awayScore: 0,
      inningScoreCount: 3,
      hasKnownScore: true,
      hasInningScores: true,
      reasons: ['inning_scores_present'],
    },
  ];

  const nonCanonicalGames: AdminNonCanonicalGame[] = [
    {
      gameId: 'BROKEN-1',
      gameDate: '2026-03-29',
      startTime: '12:00:00',
      rawStatus: 'SCHEDULED',
      homeTeam: '0LG',
      awayTeam: '롯데0',
      homeScore: null,
      awayScore: null,
      reasons: ['non_canonical_home_team', 'non_canonical_away_team'],
    },
  ];

  const result = buildGameStatusDateRecommendations({
    mismatches,
    nonCanonicalGames,
  });

  assert.deepEqual(result, [
    {
      gameDate: '2026-03-29',
      mismatchCount: 2,
      nonCanonicalCount: 1,
      issueCount: 3,
      effectiveStatuses: ['COMPLETED', 'DRAW'],
    },
    {
      gameDate: '2026-03-26',
      mismatchCount: 1,
      nonCanonicalCount: 0,
      issueCount: 1,
      effectiveStatuses: ['LIVE'],
    },
  ]);
});

test('buildNonCanonicalGameCleanupDraft는 운영 전달용 정제 요청 텍스트를 만든다', () => {
  const games: AdminNonCanonicalGame[] = [
    {
      gameId: '20260329BROKEN',
      gameDate: '2026-03-29',
      startTime: '12:00:00',
      rawStatus: 'SCHEDULED',
      homeTeam: '0LG',
      awayTeam: '롯데0',
      homeScore: null,
      awayScore: null,
      reasons: ['non_canonical_home_team', 'non_canonical_away_team'],
    },
  ];

  const result = buildNonCanonicalGameCleanupDraft({
    startDate: '2026-03-29',
    endDate: '2026-03-29',
    runbookPath: 'task/operations/prediction-game-status-repair-runbook.md',
    games,
  });

  assert.match(result, /\[Prediction 비정상 팀 코드 raw row 정제 요청\]/);
  assert.match(result, /조회 범위: 2026-03-29/);
  assert.match(result, /비정상 row 수: 1건/);
  assert.match(result, /20260329BROKEN/);
  assert.match(result, /원정 롯데0 \/ 홈 0LG/);
  assert.match(result, /task\/operations\/prediction-game-status-repair-runbook\.md/);
});

test('extractNonCanonicalCleanupArtifactPaths는 tracker note에서 최신 summary와 handoff 경로를 추출한다', () => {
  const note = [
    '[closure-sync 2026-04-17 12:15:23 KST] compare=FAIL tracker=in_progress resolved=0 remaining=3 new=0',
    '- summary_json: /tmp/old-summary.json',
    '',
    '[closure-sync 2026-04-17 17:33:09 KST] compare=FAIL tracker=in_progress resolved=0 remaining=3 new=0',
    '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
    '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
  ].join('\n');

  assert.deepEqual(extractNonCanonicalCleanupArtifactPaths(note), {
    summaryJson: '/tmp/noncanonical-summary-2026-04-14.json',
    handoffMd: '/tmp/noncanonical-handoff-2026-04-14.md',
  });
});

test('extractNonCanonicalCleanupClosureSync는 tracker note에서 최신 closure-sync 상태를 추출한다', () => {
  const note = [
    '[closure-sync 2026-04-17 12:15:23 KST] compare=FAIL tracker=in_progress resolved=0 remaining=3 new=0',
    '- summary_json: /tmp/old-summary.json',
    '',
    '[closure-sync 2026-04-17 18:01:44 KST] compare=PASS tracker=done resolved=3 remaining=0 new=0',
    '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
    '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
  ].join('\n');

  assert.deepEqual(extractNonCanonicalCleanupClosureSync(note), {
    comparedAt: '2026-04-17 18:01:44 KST',
    compareStatus: 'PASS',
    trackerStatus: 'done',
    resolvedCount: 3,
    remainingCount: 0,
    newCount: 0,
  });
});

test('extractNonCanonicalCleanupUserNote는 closure-sync 시스템 로그를 제외한 사용자 메모만 남긴다', () => {
  const note = [
    'raw team code 정제 요청 전달',
    '운영 티켓 #42 확인 필요',
    '',
    '[closure-sync 2026-04-17 18:01:44 KST] compare=PASS tracker=done resolved=3 remaining=0 new=0',
    '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
    '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
  ].join('\n');

  assert.equal(
    extractNonCanonicalCleanupUserNote(note),
    ['raw team code 정제 요청 전달', '운영 티켓 #42 확인 필요'].join('\n'),
  );
});

test('extractNonCanonicalCleanupSystemNote는 closure-sync 시스템 로그 블록만 추출한다', () => {
  const note = [
    'raw team code 정제 요청 전달',
    '운영 티켓 #42 확인 필요',
    '',
    '[closure-sync 2026-04-17 18:01:44 KST] compare=PASS tracker=done resolved=3 remaining=0 new=0',
    '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
    '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
  ].join('\n');

  assert.equal(
    extractNonCanonicalCleanupSystemNote(note),
    [
      '[closure-sync 2026-04-17 18:01:44 KST] compare=PASS tracker=done resolved=3 remaining=0 new=0',
      '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
      '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
    ].join('\n'),
  );
});

test('buildNonCanonicalCleanupTrackerNote는 사용자 메모 저장 시 기존 system suffix를 보존한다', () => {
  const merged = buildNonCanonicalCleanupTrackerNote({
    userNote: 'raw team code 정제 요청 전달\n운영 티켓 #42 확인 필요',
    existingNote: [
      '이전 메모',
      '',
      '[closure-sync 2026-04-17 18:01:44 KST] compare=PASS tracker=done resolved=3 remaining=0 new=0',
      '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
      '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
    ].join('\n'),
  });

  assert.equal(
    merged,
    [
      'raw team code 정제 요청 전달',
      '운영 티켓 #42 확인 필요',
      '[closure-sync 2026-04-17 18:01:44 KST] compare=PASS tracker=done resolved=3 remaining=0 new=0',
      '- summary_json: /tmp/noncanonical-summary-2026-04-14.json',
      '- handoff_md: /tmp/noncanonical-handoff-2026-04-14.md',
    ].join('\n'),
  );
});

test('buildNonCanonicalClosureCommand는 artifact dir 기준 재검증 명령을 만든다', () => {
  const command = buildNonCanonicalClosureCommand({
    summaryJson: '/tmp/noncanonical-bundle-2026-04-14-live/noncanonical-summary-2026-04-14.json',
    handoffMd: '/tmp/noncanonical-bundle-2026-04-14-live/noncanonical-handoff-2026-04-14.md',
  });

  assert.equal(command, [
    'DATABASE_URL=<DATABASE_URL> \\',
    'bash scripts/report_prediction_noncanonical_closure.sh \\',
    "  --artifact-dir '/tmp/noncanonical-bundle-2026-04-14-live' \\",
    '  --fail-on-unresolved',
  ].join('\n'));
});

test('buildNonCanonicalClosureTrackerSyncCommand는 closure와 tracker sync 명령을 함께 만든다', () => {
  const command = buildNonCanonicalClosureTrackerSyncCommand({
    summaryJson: '/tmp/noncanonical-bundle-2026-04-14-live/noncanonical-summary-2026-04-14.json',
    handoffMd: '/tmp/noncanonical-bundle-2026-04-14-live/noncanonical-handoff-2026-04-14.md',
  });

  assert.equal(command, [
    'DATABASE_URL=<DATABASE_URL> \\',
    'TRACKER_BASE_URL=<TRACKER_BASE_URL> \\',
    'TRACKER_ORIGIN=<TRACKER_ORIGIN> \\',
    'TRACKER_ADMIN_EMAIL=<ADMIN_EMAIL> \\',
    "TRACKER_ADMIN_PASSWORD='<ADMIN_PASSWORD>' \\",
    'bash scripts/report_prediction_noncanonical_closure.sh \\',
    "  --artifact-dir '/tmp/noncanonical-bundle-2026-04-14-live' \\",
    '  --fail-on-unresolved \\',
    '  --sync-tracker \\',
    '  --tracker-base-url "$TRACKER_BASE_URL" \\',
    '  --tracker-origin "$TRACKER_ORIGIN" \\',
    '  --tracker-admin-email "$TRACKER_ADMIN_EMAIL" \\',
    '  --tracker-admin-password "$TRACKER_ADMIN_PASSWORD"',
  ].join('\n'));
});

test('non-canonical cleanup tracker는 범위별로 저장하고 불러온다', () => {
  const localStorage = createStorage();
  setWindowLocalStorage(localStorage);

  assert.equal(buildNonCanonicalCleanupTrackerKey('2026-04-14', '2026-04-14'), '2026-04-14');
  assert.equal(buildNonCanonicalCleanupTrackerKey('2026-04-09', '2026-04-14'), '2026-04-09:2026-04-14');
  assert.deepEqual(parseNonCanonicalCleanupTrackerKey('2026-04-14'), {
    startDate: '2026-04-14',
    endDate: '2026-04-14',
  });
  assert.deepEqual(parseNonCanonicalCleanupTrackerKey('2026-04-09:2026-04-14'), {
    startDate: '2026-04-09',
    endDate: '2026-04-14',
  });
  assert.equal(loadNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
  }), null);

  saveNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
    record: {
      ticketUrl: 'https://tickets.example.com/cleanup-14',
      assignee: 'ops-team',
      status: 'requested',
      note: 'raw team code cleanup requested',
      updatedAt: '2026-04-14T15:00:00.000Z',
      gameIds: ['20260414롯데00LG0'],
    },
  });

  assert.deepEqual(loadNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
  }), {
    ticketUrl: 'https://tickets.example.com/cleanup-14',
    assignee: 'ops-team',
    status: 'requested',
    note: 'raw team code cleanup requested',
    updatedAt: '2026-04-14T15:00:00.000Z',
    gameIds: ['20260414롯데00LG0'],
  });
  assert.deepEqual(loadAllNonCanonicalCleanupTrackers(), {
    '2026-04-14': {
      ticketUrl: 'https://tickets.example.com/cleanup-14',
      assignee: 'ops-team',
      status: 'requested',
      note: 'raw team code cleanup requested',
      updatedAt: '2026-04-14T15:00:00.000Z',
      gameIds: ['20260414롯데00LG0'],
    },
  });

  clearNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
  });

  assert.equal(loadNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
  }), null);
});
