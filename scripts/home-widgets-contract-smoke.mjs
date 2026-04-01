#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

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

const buildKstDate = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const read = (type) => parts.find((part) => part.type === type)?.value;
  return `${read('year')}-${read('month')}-${read('day')}`;
};

const isRankingSnapshot = (value) => (
  !!value
  && typeof value === 'object'
  && typeof value.rankingSeasonYear === 'number'
  && typeof value.rankingSourceMessage === 'string'
  && typeof value.isOffSeason === 'boolean'
  && Array.isArray(value.rankings)
);

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const apiBase = resolveApiBase(args);
  const date = typeof args.date === 'string' && args.date.trim()
    ? args.date.trim()
    : buildKstDate();
  const reportPath = resolve(process.cwd(), args.report || 'reports/home-widgets-contract-smoke.json');
  const failures = [];
  const warnings = [];

  if (!apiBase) {
    failures.push('API base URL이 설정되지 않았습니다. --api-base-url 또는 SMOKE_API_BASE_URL/BACKEND_BASE_URL/VITE_API_BASE_URL 을 지정하세요.');
  }

  const requestUrl = apiBase
    ? `${apiBase}/home/widgets?date=${encodeURIComponent(date)}`
    : null;

  let status = null;
  let payload = null;
  let responseKeys = [];

  if (requestUrl) {
    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: 'application/json',
        },
      });
      status = response.status;
      const rawText = await response.text();
      try {
        payload = rawText ? JSON.parse(rawText) : null;
      } catch {
        failures.push(`응답 본문이 JSON 이 아닙니다. status=${response.status}`);
      }

      if (!response.ok) {
        failures.push(`상태코드가 비정상입니다. expected=200 actual=${response.status}`);
      }
    } catch (error) {
      failures.push(`요청 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    responseKeys = Object.keys(payload).sort();
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    if (requestUrl && failures.length === 0) {
      failures.push('응답 본문이 객체가 아닙니다.');
    }
  } else {
    if (!Array.isArray(payload.hotCheerPosts)) {
      failures.push('hotCheerPosts 배열이 없습니다.');
    }
    if (!Array.isArray(payload.featuredMates)) {
      failures.push('featuredMates 배열이 없습니다.');
    }
    if (!isRankingSnapshot(payload.rankingSnapshot)) {
      failures.push('rankingSnapshot 계약이 누락되었거나 불완전합니다.');
    }
    if (
      payload.rankingSnapshot == null
      && typeof payload.rankingSeasonYear === 'number'
      && Array.isArray(payload.rankings)
    ) {
      warnings.push('구계약 응답 징후를 감지했습니다. top-level ranking 필드는 존재하지만 rankingSnapshot 이 없습니다.');
    }
  }

  const report = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    apiBase,
    requestUrl,
    date,
    status,
    responseKeys,
    failures,
    warnings,
  };

  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (!report.ok) {
    console.error('Home widgets contract smoke failed.');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    for (const warning of warnings) {
      console.error(`- warning: ${warning}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('Home widgets contract smoke passed.');
  console.log(`- requestUrl: ${requestUrl}`);
  if (warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`- warning: ${warning}`);
    }
  }
};

await main();
