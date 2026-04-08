#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_INCIDENT_DATES = ['2026-03-31', '2026-04-04', '2026-04-05', '2026-04-07'];
const KBO_GAME_LIST_URL = 'https://www.koreabaseball.com/ws/Main.asmx/GetKboGameList';
const REQUEST_HEADERS = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
  'User-Agent': (
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ),
  Referer: 'https://www.koreabaseball.com/',
  'X-Requested-With': 'XMLHttpRequest',
};
const LIVE_STATE_CODES = new Set(['2', '5']);
const POSTPONED_KEYWORDS = ['연기', '순연'];

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

const normalizeApiBase = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const candidate = value.trim().replace(/\/+$/, '');
  if (!candidate || !/^https?:\/\//i.test(candidate)) {
    return null;
  }

  try {
    const parsed = new URL(candidate);
    const pathname = parsed.pathname.replace(/\/+$/, '');
    const resolvedPath = !pathname || pathname === '/'
      ? '/api'
      : pathname.endsWith('/api')
        ? pathname
        : `${pathname}/api`;
    return `${parsed.origin}${resolvedPath}`;
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

const normalizeNumber = (value) => (value == null ? null : Number(value));

const normalizeString = (value) => {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized === '' ? null : normalized;
};

const normalizeTime = (value) => {
  const normalized = normalizeString(value);
  if (normalized == null) {
    return null;
  }
  const match = normalized.match(/^(\d{2}:\d{2})/);
  return match ? match[1] : normalized;
};

const buildGameMap = (games) => {
  const map = new Map();
  for (const game of games) {
    if (!game || typeof game !== 'object' || typeof game.gameId !== 'string') {
      continue;
    }
    map.set(game.gameId, game);
  }
  return map;
};

const buildSrId = (date) => {
  let srId = '0,1,3,4,5,7,9';
  if (Number.parseInt(date.slice(0, 4), 10) >= 2021) {
    srId = '0,1,3,4,5,6,7,9';
  }
  if (date.replaceAll('-', '') >= '20241026') {
    srId = '0,1,3,4,5,6,7,8,9';
  }
  return srId;
};

const mapOfficialLeagueType = (seriesId) => {
  const normalizedSeriesId = normalizeNumber(seriesId);
  switch (normalizedSeriesId) {
    case 0:
      return 'REGULAR';
    case 2:
    case 3:
    case 4:
      return 'POSTSEASON';
    case 5:
      return 'KOREAN_SERIES';
    default:
      return 'OFFSEASON';
  }
};

const mapOfficialStatus = (row) => {
  const stateCode = normalizeString(row.GAME_STATE_SC);
  const cancelName = normalizeString(row.CANCEL_SC_NM);
  const homeScore = normalizeNumber(row.B_SCORE_CN);
  const awayScore = normalizeNumber(row.T_SCORE_CN);

  if (
    cancelName != null
    && !cancelName.includes('정상경기')
    && POSTPONED_KEYWORDS.some((keyword) => cancelName.includes(keyword))
  ) {
    return 'CANCELLED';
  }

  if (stateCode === '3') {
    if (homeScore != null && awayScore != null && homeScore === awayScore) {
      return 'DRAW';
    }
    return 'COMPLETED';
  }

  if (stateCode != null && LIVE_STATE_CODES.has(stateCode)) {
    return 'LIVE';
  }

  return 'SCHEDULED';
};

const requestJson = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(options.timeoutMs),
  });

  const rawText = await response.text();
  let payload = null;
  if (rawText) {
    payload = JSON.parse(rawText);
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
};

const fetchOfficialGames = async (date, timeoutMs) => {
  const body = new URLSearchParams({
    leId: '1',
    srId: buildSrId(date),
    date: date.replaceAll('-', ''),
  });

  const response = await requestJson(KBO_GAME_LIST_URL, {
    method: 'POST',
    headers: REQUEST_HEADERS,
    body,
    timeoutMs,
  });

  if (!response.ok) {
    throw new Error(`official KBO status expected=200 actual=${response.status}`);
  }

  if (response.payload?.code !== '100' || !Array.isArray(response.payload?.game)) {
    throw new Error(`official KBO payload invalid code=${response.payload?.code ?? 'unknown'}`);
  }

  return response.payload.game.map((row) => ({
    gameId: String(row.G_ID).trim(),
    gameStatus: mapOfficialStatus(row),
    leagueType: mapOfficialLeagueType(row.SR_ID),
    stadium: normalizeString(row.S_NM),
    time: normalizeTime(row.G_TM),
    homeScore: String(row.GAME_RESULT_CK).trim() === '1' ? normalizeNumber(row.B_SCORE_CN) : null,
    awayScore: String(row.GAME_RESULT_CK).trim() === '1' ? normalizeNumber(row.T_SCORE_CN) : null,
  }));
};

const compareActualGame = (date, endpointLabel, actualGame, officialGame, failures) => {
  if (!actualGame) {
    failures.push(`${date} ${endpointLabel} missing official gameId=${officialGame.gameId}`);
    return;
  }

  if (actualGame.gameStatus !== officialGame.gameStatus) {
    failures.push(
      `${date} ${endpointLabel} gameId=${officialGame.gameId} status mismatch expected=${officialGame.gameStatus} actual=${actualGame.gameStatus}`,
    );
  }

  if (actualGame.leagueType !== officialGame.leagueType) {
    failures.push(
      `${date} ${endpointLabel} gameId=${officialGame.gameId} leagueType mismatch expected=${officialGame.leagueType} actual=${actualGame.leagueType}`,
    );
  }

  if (normalizeNumber(actualGame.homeScore) !== officialGame.homeScore) {
    failures.push(
      `${date} ${endpointLabel} gameId=${officialGame.gameId} homeScore mismatch expected=${officialGame.homeScore} actual=${actualGame.homeScore ?? null}`,
    );
  }

  if (normalizeNumber(actualGame.awayScore) !== officialGame.awayScore) {
    failures.push(
      `${date} ${endpointLabel} gameId=${officialGame.gameId} awayScore mismatch expected=${officialGame.awayScore} actual=${actualGame.awayScore ?? null}`,
    );
  }

  if (normalizeString(actualGame.stadium) !== officialGame.stadium) {
    failures.push(
      `${date} ${endpointLabel} gameId=${officialGame.gameId} stadium mismatch expected=${officialGame.stadium ?? null} actual=${actualGame.stadium ?? null}`,
    );
  }

  if (normalizeTime(actualGame.time) !== officialGame.time) {
    failures.push(
      `${date} ${endpointLabel} gameId=${officialGame.gameId} time mismatch expected=${officialGame.time ?? null} actual=${normalizeTime(actualGame.time) ?? null}`,
    );
  }
};

const compareEndpointGames = (date, endpointLabel, actualGames, officialGames, failures) => {
  if (!Array.isArray(actualGames)) {
    failures.push(`${date} ${endpointLabel} response is not an array`);
    return new Map();
  }

  const actualMap = buildGameMap(actualGames);
  const officialMap = buildGameMap(officialGames);
  const actualGameIds = [...actualMap.keys()].sort();
  const officialGameIds = [...officialMap.keys()].sort();

  if (actualGameIds.length !== officialGameIds.length) {
    failures.push(
      `${date} ${endpointLabel} game count mismatch expected=${officialGameIds.length} actual=${actualGameIds.length}`,
    );
  }

  for (const officialGame of officialGames) {
    compareActualGame(
      date,
      endpointLabel,
      actualMap.get(officialGame.gameId),
      officialGame,
      failures,
    );
  }

  for (const actualGameId of actualGameIds) {
    if (!officialMap.has(actualGameId)) {
      failures.push(`${date} ${endpointLabel} has unexpected gameId=${actualGameId}`);
    }
  }

  return actualMap;
};

const compareCrossEndpoint = (date, homeMap, predictionMap, officialGames, failures) => {
  for (const officialGame of officialGames) {
    const homeGame = homeMap.get(officialGame.gameId);
    const predictionGame = predictionMap.get(officialGame.gameId);
    if (!homeGame || !predictionGame) {
      continue;
    }

    if (homeGame.gameStatus !== predictionGame.gameStatus) {
      failures.push(
        `${date} cross-endpoint gameId=${officialGame.gameId} status mismatch home=${homeGame.gameStatus} prediction=${predictionGame.gameStatus}`,
      );
    }

    if (homeGame.leagueType !== predictionGame.leagueType) {
      failures.push(
        `${date} cross-endpoint gameId=${officialGame.gameId} leagueType mismatch home=${homeGame.leagueType} prediction=${predictionGame.leagueType}`,
      );
    }

    if (normalizeNumber(homeGame.homeScore) !== normalizeNumber(predictionGame.homeScore)) {
      failures.push(
        `${date} cross-endpoint gameId=${officialGame.gameId} homeScore mismatch home=${homeGame.homeScore ?? null} prediction=${predictionGame.homeScore ?? null}`,
      );
    }

    if (normalizeNumber(homeGame.awayScore) !== normalizeNumber(predictionGame.awayScore)) {
      failures.push(
        `${date} cross-endpoint gameId=${officialGame.gameId} awayScore mismatch home=${homeGame.awayScore ?? null} prediction=${predictionGame.awayScore ?? null}`,
      );
    }
  }
};

const resolveSelectedDates = (args) => {
  const rawDates = typeof args.dates === 'string' ? args.dates.trim() : '';
  if (!rawDates) {
    return DEFAULT_INCIDENT_DATES;
  }

  return rawDates
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const apiBase = resolveApiBase(args);
  const timeoutMs = Number.parseInt(args['timeout-ms'] || '15000', 10);
  const reportPath = resolve(process.cwd(), args.report || 'reports/schedule-regression-smoke.json');
  const failures = [];
  const warnings = [];
  const caseReports = [];

  if (!apiBase) {
    failures.push('API base URL이 설정되지 않았습니다. --api-base-url 또는 SMOKE_API_BASE_URL/BACKEND_BASE_URL/VITE_API_BASE_URL 을 지정하세요.');
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs < 1000 || timeoutMs > 120000) {
    failures.push(`timeout-ms 값이 유효하지 않습니다: ${args['timeout-ms'] ?? 'undefined'}`);
  }

  const selectedDates = failures.length === 0 ? resolveSelectedDates(args) : [];

  if (failures.length === 0) {
    for (const date of selectedDates) {
      const dateFailures = [];
      const dateWarnings = [];
      const homeUrl = `${apiBase}/kbo/schedule?date=${encodeURIComponent(date)}`;
      const predictionUrl = `${apiBase}/matches/day?date=${encodeURIComponent(date)}`;
      let officialGames = [];
      let homeStatus = null;
      let predictionStatus = null;
      let homePayload = null;
      let predictionPayload = null;

      try {
        officialGames = await fetchOfficialGames(date, timeoutMs);
      } catch (error) {
        dateFailures.push(`${date} official KBO request failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        const homeResponse = await requestJson(homeUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeoutMs,
        });
        homeStatus = homeResponse.status;
        homePayload = homeResponse.payload;
        if (!homeResponse.ok) {
          dateFailures.push(`${date} home schedule status expected=200 actual=${homeResponse.status}`);
        }
      } catch (error) {
        dateFailures.push(`${date} home schedule request failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        const predictionResponse = await requestJson(predictionUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          timeoutMs,
        });
        predictionStatus = predictionResponse.status;
        predictionPayload = predictionResponse.payload;
        if (!predictionResponse.ok) {
          dateFailures.push(`${date} prediction day status expected=200 actual=${predictionResponse.status}`);
        }
      } catch (error) {
        dateFailures.push(`${date} prediction day request failed: ${error instanceof Error ? error.message : String(error)}`);
      }

      const homeGames = Array.isArray(homePayload)
        ? homePayload.map((game) => ({
          gameId: game.gameId,
          gameStatus: game.gameStatus,
          leagueType: game.leagueType,
          stadium: game.stadium,
          time: game.time,
          homeScore: game.homeScore,
          awayScore: game.awayScore,
        }))
        : null;

      const predictionGames = Array.isArray(predictionPayload?.games)
        ? predictionPayload.games.map((game) => ({
          gameId: game.gameId,
          gameStatus: game.gameStatus,
          leagueType: game.leagueType,
          stadium: game.stadium,
          time: normalizeTime(game.startTime),
          homeScore: game.homeScore,
          awayScore: game.awayScore,
        }))
        : null;

      const homeMap = compareEndpointGames(date, 'home', homeGames, officialGames, dateFailures);
      const predictionMap = compareEndpointGames(date, 'prediction', predictionGames, officialGames, dateFailures);
      compareCrossEndpoint(date, homeMap, predictionMap, officialGames, dateFailures);

      caseReports.push({
        date,
        homeUrl,
        predictionUrl,
        homeStatus,
        predictionStatus,
        officialGameIds: officialGames.map((game) => game.gameId).sort(),
        homeGameIds: homeGames == null ? [] : [...buildGameMap(homeGames).keys()].sort(),
        predictionGameIds: predictionGames == null ? [] : [...buildGameMap(predictionGames).keys()].sort(),
        failures: dateFailures,
        warnings: dateWarnings,
      });

      failures.push(...dateFailures);
      warnings.push(...dateWarnings);
    }
  }

  const report = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    apiBase,
    timeoutMs,
    dates: selectedDates,
    officialSource: KBO_GAME_LIST_URL,
    cases: caseReports,
    failures,
    warnings,
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!report.ok) {
    console.error('Schedule regression smoke failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Schedule regression smoke passed.');
  console.log(`- apiBase: ${apiBase}`);
  console.log(`- checkedDates: ${selectedDates.join(', ')}`);
};

await main();
