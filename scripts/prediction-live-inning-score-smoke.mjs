#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const MANUAL_BASEBALL_DATA_REQUIRED = 'MANUAL_BASEBALL_DATA_REQUIRED';

const parseArgs = (argv) => {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = 'true';
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
};

const printHelp = () => {
  console.log(`Prediction live inning score smoke

Required:
  --api-base-url <url>   Backend base URL or /api URL. Env: SMOKE_API_BASE_URL, BACKEND_BASE_URL, VITE_API_BASE_URL
  --game-id <id>         Target gameId. Env: SMOKE_GAME_ID

Optional assertion:
  --inning <n>           Inning to verify. Env: SMOKE_INNING
  --team-side <home|away>
  --expected-runs <n>    Poll until the inning cell reaches this value.
  --require-change       Fail if the first live sample already matches expected-runs.

Other:
  --timeout-ms <n>       Default: 15000
  --poll-interval-ms <n> Default: 5000
  --auth-token <token>   Sends Authorization and cookie hints when the target requires auth.
  --report <path>        Default: reports/prediction-live-inning-score-smoke.json

Example:
  npm run smoke:prediction:live-inning:prod -- \\
    --api-base-url http://localhost:18080 \\
    --game-id 20260612HHLT0 \\
    --inning 1 --team-side home --expected-runs 2 --require-change
`);
};

const normalizeApiBase = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const candidate = value.trim().replace(/\/+$/, '');
  if (!candidate) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(candidate)
    ? candidate
    : `http://${candidate}`;

  try {
    const parsed = new URL(withProtocol);
    const rawPath = parsed.pathname.replace(/\/+$/, '');
    const path = !rawPath || rawPath === '/'
      ? '/api'
      : rawPath.endsWith('/api')
        ? rawPath
        : `${rawPath}/api`;
    return `${parsed.origin}${path}`;
  } catch {
    return null;
  }
};

const resolveApiBase = (args) => (
  normalizeApiBase(args['api-base-url'])
  || normalizeApiBase(process.env.SMOKE_API_BASE_URL)
  || normalizeApiBase(process.env.BACKEND_BASE_URL)
  || normalizeApiBase(process.env.VITE_API_BASE_URL)
);

const readString = (...values) => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
};

const parseInteger = (value, { min = Number.MIN_SAFE_INTEGER, fallback = null } = {}) => {
  if (value == null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
};

const readBoolean = (value) => {
  if (value == null) {
    return false;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const normalizeTeamSide = (value) => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'home' || normalized === 'away') {
    return normalized;
  }
  return '';
};

const buildHeaders = (authToken) => {
  const headers = {
    Accept: 'application/json',
  };
  if (authToken) {
    headers.Authorization = authToken.startsWith('Bearer ')
      ? authToken
      : `Bearer ${authToken}`;
    headers.Cookie = `Authorization=${authToken.replace(/^Bearer\s+/i, '')}`;
  }
  return headers;
};

const formatError = (error) => {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause && typeof error.cause === 'object'
    ? error.cause
    : null;
  const details = [];
  if (cause?.code) {
    details.push(`code=${cause.code}`);
  }
  if (cause?.address) {
    details.push(`address=${cause.address}`);
  }
  if (cause?.port) {
    details.push(`port=${cause.port}`);
  }

  return details.length > 0
    ? `${error.message} (${details.join(', ')})`
    : error.message;
};

const withTimeout = async (promise, timeoutMs, label) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await promise(controller.signal);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw new Error(`${label} failed: ${formatError(error)}`);
  } finally {
    clearTimeout(timeout);
  }
};

const fetchJson = async (url, headers, timeoutMs) => (
  withTimeout(async (signal) => {
    const response = await fetch(url, { headers, signal });
    const rawText = await response.text();
    let body = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = null;
    }
    return {
      ok: response.ok,
      status: response.status,
      body,
      rawText,
    };
  }, timeoutMs, url)
);

const sleep = (ms) => new Promise((resolveSleep) => {
  setTimeout(resolveSleep, ms);
});

const toNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const readInning = (score) => (
  toNumber(score?.inning ?? score?.inningNo ?? score?.inning_no ?? score?.inningNumber ?? score?.inning_number)
);

const readTeamSide = (score) => (
  String(score?.teamSide ?? score?.team_side ?? score?.side ?? '').trim().toLowerCase()
);

const readRuns = (score) => (
  toNumber(score?.runs ?? score?.run ?? score?.score ?? score?.r)
);

const findInningCell = (inningScores, inning, teamSide) => {
  if (!Array.isArray(inningScores) || !inning || !teamSide) {
    return null;
  }
  return inningScores.find((score) => (
    readInning(score) === inning && readTeamSide(score) === teamSide
  )) || null;
};

const sumRuns = (inningScores, teamSide) => {
  if (!Array.isArray(inningScores)) {
    return null;
  }
  return inningScores
    .filter((score) => readTeamSide(score) === teamSide)
    .reduce((sum, score) => sum + (readRuns(score) ?? 0), 0);
};

const summarizeSnapshot = (snapshot, assertion) => {
  const inningScores = Array.isArray(snapshot?.inningScores) ? snapshot.inningScores : [];
  const cell = assertion
    ? findInningCell(inningScores, assertion.inning, assertion.teamSide)
    : null;
  return {
    gameId: snapshot?.gameId ?? null,
    gameStatus: snapshot?.gameStatus ?? null,
    homeScore: snapshot?.homeScore ?? null,
    awayScore: snapshot?.awayScore ?? null,
    currentInning: snapshot?.currentInning ?? null,
    currentInningHalf: snapshot?.currentInningHalf ?? null,
    lastEventSeq: snapshot?.lastEventSeq ?? null,
    lastUpdatedAt: snapshot?.lastUpdatedAt ?? null,
    eventCount: Array.isArray(snapshot?.events) ? snapshot.events.length : null,
    inningScoreCount: inningScores.length,
    homeInningTotal: sumRuns(inningScores, 'home'),
    awayInningTotal: sumRuns(inningScores, 'away'),
    assertedCellRuns: cell ? readRuns(cell) : null,
  };
};

const writeReport = (reportPath, report) => {
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.h) {
    printHelp();
    return;
  }

  const apiBase = resolveApiBase(args);
  const gameId = readString(args['game-id'], process.env.SMOKE_GAME_ID);
  const authToken = readString(args['auth-token'], process.env.SMOKE_AUTH_TOKEN);
  const inning = parseInteger(args.inning ?? process.env.SMOKE_INNING, { min: 1, fallback: null });
  const teamSide = normalizeTeamSide(args['team-side'] ?? process.env.SMOKE_TEAM_SIDE);
  const expectedRuns = parseInteger(args['expected-runs'] ?? process.env.SMOKE_EXPECTED_RUNS, {
    min: 0,
    fallback: null,
  });
  const requireChange = readBoolean(args['require-change'] ?? process.env.SMOKE_REQUIRE_CHANGE);
  const timeoutMs = parseInteger(args['timeout-ms'] ?? process.env.SMOKE_TIMEOUT_MS, {
    min: 1000,
    fallback: 15000,
  });
  const pollIntervalMs = parseInteger(args['poll-interval-ms'] ?? process.env.SMOKE_POLL_INTERVAL_MS, {
    min: 500,
    fallback: 5000,
  });
  const reportPath = resolve(process.cwd(), args.report || 'reports/prediction-live-inning-score-smoke.json');
  const headers = buildHeaders(authToken);
  const failures = [];
  const warnings = [];
  const samples = [];
  let relay = null;

  if (!apiBase) {
    failures.push('API base URL이 설정되지 않았습니다.');
  }
  if (!gameId) {
    failures.push('gameId가 설정되지 않았습니다.');
  }
  if (expectedRuns !== null && (!inning || !teamSide)) {
    failures.push('--expected-runs 검증에는 --inning 과 --team-side 가 필요합니다.');
  }

  const liveUrl = apiBase && gameId
    ? `${apiBase}/matches/${encodeURIComponent(gameId)}/live?limit=50`
    : null;
  const relayUrl = apiBase && gameId
    ? `${apiBase}/matches/${encodeURIComponent(gameId)}/live-relay?limit=50`
    : null;
  const assertion = expectedRuns === null ? null : { inning, teamSide, expectedRuns, requireChange };

  const report = {
    ok: false,
    checkedAt: new Date().toISOString(),
    apiBase,
    gameId,
    liveUrl,
    relayUrl,
    assertion,
    timeoutMs,
    pollIntervalMs,
    samples,
    relay,
    failures,
    warnings,
  };

  if (failures.length > 0) {
    writeReport(reportPath, report);
    console.error('Prediction live inning score smoke failed.');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  const fetchLiveSnapshot = async () => {
    const response = await fetchJson(liveUrl, headers, Math.min(timeoutMs, 10000));
    if (!response.ok) {
      const code = response.body?.code || response.body?.error?.code || null;
      throw new Error(`/live returned status=${response.status}${code ? ` code=${code}` : ''}`);
    }
    if (!response.body || typeof response.body !== 'object' || Array.isArray(response.body)) {
      throw new Error('/live response body is not an object.');
    }
    if (!Array.isArray(response.body.inningScores)) {
      throw new Error('/live response does not include inningScores array.');
    }
    return response.body;
  };

  try {
    if (relayUrl) {
      try {
        const relayResponse = await fetchJson(relayUrl, headers, Math.min(timeoutMs, 10000));
        relay = {
          status: relayResponse.status,
          code: relayResponse.body?.code || relayResponse.body?.error?.code || null,
          eventCount: Array.isArray(relayResponse.body?.events) ? relayResponse.body.events.length : null,
          manualRequired: relayResponse.status === 409
            && (relayResponse.body?.code || relayResponse.body?.error?.code) === MANUAL_BASEBALL_DATA_REQUIRED,
        };
        report.relay = relay;
        if (relay.manualRequired) {
          warnings.push('문자중계 relay는 MANUAL_BASEBALL_DATA_REQUIRED 이지만 score/inning smoke는 계속 진행합니다.');
        } else if (!relayResponse.ok) {
          warnings.push(`/live-relay returned status=${relayResponse.status}; score/inning smoke는 계속 진행합니다.`);
        }
      } catch (error) {
        relay = {
          status: null,
          code: null,
          eventCount: null,
          manualRequired: false,
          error: formatError(error),
        };
        report.relay = relay;
        warnings.push(`/live-relay check failed: ${formatError(error)}; score/inning smoke는 계속 진행합니다.`);
      }
    }

    const startedAt = Date.now();
    const initialSnapshot = await fetchLiveSnapshot();
    const initialSummary = summarizeSnapshot(initialSnapshot, assertion);
    samples.push({
      sampledAt: new Date().toISOString(),
      elapsedMs: 0,
      snapshot: initialSummary,
    });

    if (!assertion) {
      report.ok = true;
      writeReport(reportPath, report);
      console.log('Prediction live inning score smoke passed.');
      console.log(`- liveUrl: ${liveUrl}`);
      console.log(`- inningScoreCount: ${initialSummary.inningScoreCount}`);
      console.log(`- relayStatus: ${relay?.status ?? 'not_checked'}${relay?.manualRequired ? ' (manual required, non-blocking)' : ''}`);
      return;
    }

    if (requireChange && initialSummary.assertedCellRuns === expectedRuns) {
      throw new Error(
        `asserted cell already matched expected-runs on first sample `
        + `(inning=${inning}, teamSide=${teamSide}, runs=${expectedRuns}).`,
      );
    }

    let finalSummary = initialSummary;
    while (Date.now() - startedAt <= timeoutMs) {
      if (finalSummary.assertedCellRuns === expectedRuns) {
        report.ok = true;
        writeReport(reportPath, report);
        console.log('Prediction live inning score smoke passed.');
        console.log(`- liveUrl: ${liveUrl}`);
        console.log(`- ${teamSide} ${inning}회 runs=${expectedRuns}`);
        console.log(`- samples: ${samples.length}`);
        console.log(`- relayStatus: ${relay?.status ?? 'not_checked'}${relay?.manualRequired ? ' (manual required, non-blocking)' : ''}`);
        return;
      }

      await sleep(Math.min(pollIntervalMs, Math.max(500, timeoutMs - (Date.now() - startedAt))));
      const nextSnapshot = await fetchLiveSnapshot();
      finalSummary = summarizeSnapshot(nextSnapshot, assertion);
      samples.push({
        sampledAt: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        snapshot: finalSummary,
      });
    }

    throw new Error(
      `expected inning cell did not update within ${timeoutMs}ms `
      + `(inning=${inning}, teamSide=${teamSide}, expected=${expectedRuns}, actual=${finalSummary.assertedCellRuns ?? 'missing'}).`,
    );
  } catch (error) {
    failures.push(formatError(error));
    report.ok = false;
    writeReport(reportPath, report);
    console.error('Prediction live inning score smoke failed.');
    failures.forEach((failure) => console.error(`- ${failure}`));
    warnings.forEach((warning) => console.warn(`- warning: ${warning}`));
    process.exitCode = 1;
  }
};

await main();
