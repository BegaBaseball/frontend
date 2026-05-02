import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deleteAdminNonCanonicalCleanupTracker,
  fetchCoachAutoBriefOpsHealth,
  fetchAdminNonCanonicalCleanupTrackers,
  fetchAdminGameStatusMismatches,
  fetchAdminPlaces,
  fetchAdminStadiums,
  fetchAdminUsers,
  repairAdminGameStatusMismatches,
  fetchReleaseDecisionPresets,
  upsertAdminNonCanonicalCleanupTracker,
} from './admin';

const buildJsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  });

test('fetchAdminUsers는 관리자 검색 쿼리를 same-origin fetch로 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      success: true,
      data: [
        { id: 1, name: 'Admin User', email: 'admin@example.com', role: 'ROLE_USER' },
      ],
    });
  });

  const response = await fetchAdminUsers('admin');

  assert.equal(response[0]?.email, 'admin@example.com');
  assert.match(requestUrl, /\/api\/admin\/users\?search=admin$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('fetchAdminUsers는 403 응답을 관리자 권한 메시지로 변환한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => buildJsonResponse({
    code: 'FORBIDDEN',
    message: 'Forbidden',
  }, 403));

  await assert.rejects(
    () => fetchAdminUsers('admin'),
    {
      message: '관리자 권한이 필요합니다.',
    },
  );
});

test('fetchAdminStadiums는 raw 구장 배열을 그대로 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse([
      {
        stadiumId: 'JAMSIL',
        stadiumName: '잠실야구장',
        team: 'LG',
        lat: 37.512,
        lng: 127.072,
        address: '서울특별시 송파구',
        phone: '02-0000-0000',
      },
    ]);
  });

  const response = await fetchAdminStadiums();

  assert.equal(response[0]?.stadiumId, 'JAMSIL');
  assert.match(requestUrl, /\/api\/stadiums$/);
});

test('fetchAdminPlaces는 raw 장소 배열을 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse([
      {
        id: 101,
        stadiumName: '잠실야구장',
        category: '음식점',
        name: '버거집',
        lat: 37.512,
        lng: 127.072,
      },
    ]);
  });

  const response = await fetchAdminPlaces('JAMSIL');

  assert.equal(response[0]?.name, '버거집');
  assert.match(requestUrl, /\/api\/stadiums\/JAMSIL\/places$/);
});

test('fetchAdminGameStatusMismatches는 날짜 범위를 same-origin fetch query로 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      success: true,
      data: {
        startDate: '2026-03-29',
        endDate: '2026-03-29',
        totalGames: 5,
        mismatchCount: 1,
        nonCanonicalCount: 1,
        mismatches: [
          {
            gameId: '20260329HTSK0',
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
            reasons: ['inning scores present'],
          },
        ],
        nonCanonicalGames: [
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
        ],
      },
    });
  });

  const response = await fetchAdminGameStatusMismatches({
    startDate: '2026-03-29',
    endDate: '2026-03-29',
  });

  assert.equal(response.mismatchCount, 1);
  assert.equal(response.nonCanonicalCount, 1);
  assert.match(requestUrl, /\/api\/admin\/games\/status-mismatches\?startDate=2026-03-29&endDate=2026-03-29$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('repairAdminGameStatusMismatches는 POST query와 빈 JSON body로 dryRun 플래그를 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      success: true,
      data: {
        startDate: '2026-03-29',
        endDate: '2026-03-29',
        dryRun: false,
        totalGames: 5,
        mismatchCount: 1,
        repairedCount: 1,
        nonCanonicalCount: 1,
        mismatches: [],
        repairedGames: [
          {
            gameId: '20260329HTSK0',
            homeScore: 11,
            awayScore: 6,
            gameStatus: 'COMPLETED',
            inningScoreCount: 9,
            synced: true,
            usedInningScores: true,
            winningTeam: 'SSG 랜더스',
            winningScore: 11,
          },
        ],
        nonCanonicalGames: [
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
        ],
      },
    });
  });

  const response = await repairAdminGameStatusMismatches({
    startDate: '2026-03-29',
    endDate: '2026-03-29',
    dryRun: false,
  });

  assert.equal(response.repairedCount, 1);
  assert.equal(response.nonCanonicalCount, 1);
  assert.match(requestUrl, /\/api\/admin\/games\/repair-status-mismatches\?startDate=2026-03-29&endDate=2026-03-29&dryRun=false$/);
  assert.equal(requestInit?.credentials, 'include');
  assert.equal(requestInit?.method, 'POST');
  assert.equal(requestInit?.body, '{}');
});

test('fetchAdminNonCanonicalCleanupTrackers는 same-origin GET으로 tracker 목록을 조회한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      success: true,
      data: [
        {
          startDate: '2026-04-14',
          endDate: '2026-04-14',
          ticketUrl: 'https://tickets.example.com/noncanonical-20260414',
          assignee: 'ops-team',
          status: 'requested',
          note: 'raw team code cleanup requested',
          updatedAt: '2026-04-15T10:00:00',
          gameIds: ['20260414롯데00LG0'],
        },
      ],
    });
  });

  const response = await fetchAdminNonCanonicalCleanupTrackers();

  assert.equal(response[0]?.status, 'requested');
  assert.match(requestUrl, /\/api\/admin\/games\/non-canonical-cleanup-trackers$/);
  assert.equal(requestInit?.credentials, 'include');
});

test('upsertAdminNonCanonicalCleanupTracker는 PUT query와 tracker body를 전달한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return buildJsonResponse({
      success: true,
      data: {
        startDate: '2026-04-14',
        endDate: '2026-04-14',
        ticketUrl: 'https://tickets.example.com/noncanonical-20260414',
        assignee: 'ops-team',
        status: 'requested',
        note: 'raw team code cleanup requested',
        updatedAt: '2026-04-15T10:00:00',
        gameIds: ['20260414롯데00LG0'],
      },
    });
  });

  const response = await upsertAdminNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
    record: {
      ticketUrl: 'https://tickets.example.com/noncanonical-20260414',
      assignee: 'ops-team',
      status: 'requested',
      note: 'raw team code cleanup requested',
      updatedAt: '2026-04-15T09:00:00',
      gameIds: ['20260414롯데00LG0'],
    },
  });

  assert.equal(response.assignee, 'ops-team');
  assert.match(requestUrl, /\/api\/admin\/games\/non-canonical-cleanup-trackers\?startDate=2026-04-14&endDate=2026-04-14$/);
  assert.equal(requestInit?.method, 'PUT');
  assert.equal(requestInit?.body, JSON.stringify({
    ticketUrl: 'https://tickets.example.com/noncanonical-20260414',
    assignee: 'ops-team',
    status: 'requested',
    note: 'raw team code cleanup requested',
    gameIds: ['20260414롯데00LG0'],
  }));
});

test('deleteAdminNonCanonicalCleanupTracker는 DELETE query로 tracker를 삭제한다', async (t) => {
  let requestUrl = '';
  let requestInit: RequestInit | undefined;

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    requestInit = init;

    return new Response(null, { status: 204 });
  });

  await deleteAdminNonCanonicalCleanupTracker({
    startDate: '2026-04-14',
    endDate: '2026-04-14',
  });

  assert.match(requestUrl, /\/api\/admin\/games\/non-canonical-cleanup-trackers\?startDate=2026-04-14&endDate=2026-04-14$/);
  assert.equal(requestInit?.method, 'DELETE');
  assert.equal(requestInit?.credentials, 'include');
});

test('fetchCoachAutoBriefOpsHealth는 window/date query를 AI 운영 health endpoint로 전달한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse({
      window: 'custom',
      date_window: '2026-04-08:2026-04-09',
      generated_at_utc: '2026-04-08T09:00:00Z',
      runbook_path: 'task/operations/coach-auto-brief-prewarm-runbook.md',
      recommended_command: './.venv/bin/python scripts/batch_coach_auto_brief.py',
      summary: {
        loaded_target_count: 12,
        selected_target_count: 2,
        generated_success_count: 0,
        cache_hit_count: 1,
        in_progress_count: 1,
        failed_count: 0,
        unresolved_count: 1,
        completed_count: 1,
        cache_state_breakdown: { COMPLETED: 1, PENDING_WAIT: 1 },
        data_quality_breakdown: { grounded: 1, partial: 1 },
      },
      gate: {
        verdict: 'PASS',
        thresholds: {
          max_unresolved: 2,
          max_failed_locked: 0,
          max_pending_wait: 2,
          max_insufficient_ratio: 0.4,
          min_selected_targets: 0,
          fail_on_missing_report: true,
        },
        failed_locked_count: 0,
        pending_wait_count: 1,
        insufficient_count: 0,
        insufficient_ratio: 0,
        checks: {
          failed: [],
          warnings: [],
        },
      },
      unresolved_targets: [],
      latest_report: null,
    });
  });

  const response = await fetchCoachAutoBriefOpsHealth({
    window: 'custom',
    startDate: '2026-04-08',
    endDate: '2026-04-09',
    sampleSize: 7,
  });

  assert.equal(response.summary.selected_target_count, 2);
  assert.match(
    requestUrl,
    /\/api\/ai\/coach\/auto-brief\/ops\/health\?window=custom&start_date=2026-04-08&end_date=2026-04-09&sample_size=7$/,
  );
});

test('fetchReleaseDecisionPresets는 AI 운영 프리셋 raw 응답을 반환한다', async (t) => {
  let requestUrl = '';

  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestUrl = typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

    return buildJsonResponse([
      {
        scenario: 'release-blocker',
        label: 'Release Blocker',
        task_prompt: 'check blockers',
        seed_paths: ['src'],
        allowed_roots: ['src'],
      },
    ]);
  });

  const response = await fetchReleaseDecisionPresets();

  assert.equal(response[0]?.scenario, 'release-blocker');
  assert.match(requestUrl, /\/api\/ai\/release-decision\/presets$/);
});
