import fs from 'node:fs';
import path from 'node:path';
import { siteUrl as defaultSiteUrl } from './seo-policy.mjs';

const args = process.argv.slice(2);
const argMap = new Map();
for (let index = 0; index < args.length; index += 1) {
  const key = args[index];
  if (!key.startsWith('--')) {
    continue;
  }
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    argMap.set(key, 'true');
    continue;
  }
  argMap.set(key, value);
  index += 1;
}

const normalizeSiteUrl = (value) => String(value || '').trim().replace(/\/+$/, '');
const normalizePath = (value) => {
  if (!value || value === '/') {
    return '/';
  }
  return `/${String(value).replace(/^\/+/, '').replace(/\/+$/, '')}`;
};

const siteUrl = normalizeSiteUrl(argMap.get('--site-url') || process.env.VITE_SITE_URL || defaultSiteUrl);
const jsonPath = path.resolve(process.cwd(), argMap.get('--json') || 'reports/cwv-baseline.json');
const markdownPath = path.resolve(process.cwd(), argMap.get('--markdown') || 'reports/cwv-baseline.md');
const timeoutMs = Number(argMap.get('--timeout-ms') || 30000);

const routes = ['/', '/home', '/cheer'];
const strategies = ['mobile', 'desktop'];
const warnings = [];
const checks = [];
const results = [];
const ALLOWED_ERROR_KINDS = new Set(['network', 'timeout', 'http', 'payload', 'config']);
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));

const fetchWithTimeout = async (url) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: {
        'user-agent': 'bega-cwv-baseline/1.0',
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Pagespeed API 요청 타임아웃(${timeoutMs}ms)`);
      timeoutError.kind = 'timeout';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const normalizeErrorKind = (kind, fallback = 'payload') => (
  ALLOWED_ERROR_KINDS.has(kind) ? kind : fallback
);

const inferErrorKind = (error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof error?.kind === 'string') {
    return normalizeErrorKind(error.kind, 'payload');
  }
  if (/timed? out|타임아웃|abort/i.test(message)) {
    return 'timeout';
  }
  if (/fetch failed|network|econnrefused|enotfound|eai_again|eperm/i.test(message)) {
    return 'network';
  }
  return 'payload';
};

const formatWarning = (routeLabel, strategy, kind, targetUrl, message) => (
  `[${routeLabel} | ${strategy}] Pagespeed API ${kind} 오류 (${targetUrl}): ${message}`
);

const readMetric = (audits, id) => {
  const metric = audits?.[id];
  if (!metric) {
    return { numericValue: null, displayValue: '-' };
  }
  return {
    numericValue: typeof metric.numericValue === 'number' ? metric.numericValue : null,
    displayValue: metric.displayValue || '-',
  };
};

const cloneResult = (record) => ({
  ...record,
  lcp: { ...record.lcp },
  inp: { ...record.inp },
  cls: { ...record.cls },
});

const createReport = ({ ok, errorMessage = null }) => ({
  ok,
  checkedAt: new Date().toISOString(),
  siteUrl,
  timeoutMs,
  routes: [...routes],
  strategies: [...strategies],
  checks: [...checks],
  warnings: [...warnings],
  results: results.map(cloneResult),
  ...(errorMessage ? { errorMessage } : {}),
});

const measureRoute = async (routePath, strategy) => {
  const normalizedPath = normalizePath(routePath);
  const routeLabel = normalizedPath;
  const targetUrl = normalizedPath === '/' ? siteUrl : `${siteUrl}${normalizedPath}`;
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  apiUrl.searchParams.set('url', targetUrl);
  apiUrl.searchParams.set('strategy', strategy);
  apiUrl.searchParams.set('category', 'performance');

  const record = {
    route: normalizedPath,
    strategy,
    targetUrl,
    requestUrl: apiUrl.toString(),
    status: 'ok',
    performanceScore: null,
    lcp: { numericValue: null, displayValue: '-' },
    inp: { numericValue: null, displayValue: '-' },
    cls: { numericValue: null, displayValue: '-' },
    rawFinalUrl: null,
    errorKind: null,
    httpStatus: null,
    error: null,
  };

  try {
    const response = await fetchWithTimeout(apiUrl.toString());
    if (!response.ok) {
      record.status = 'warning';
      record.errorKind = 'http';
      record.httpStatus = response.status;
      record.error = `HTTP ${response.status}`;
      warnings.push(
        formatWarning(routeLabel, strategy, 'http', record.requestUrl, `HTTP ${response.status}`),
      );
      return record;
    }

    const payload = await response.json();
    const lighthouse = payload?.lighthouseResult;
    const categories = lighthouse?.categories;
    const audits = lighthouse?.audits;

    if (!lighthouse || !categories?.performance || !audits) {
      record.status = 'warning';
      record.errorKind = 'payload';
      record.error = 'Lighthouse payload missing';
      warnings.push(
        formatWarning(routeLabel, strategy, 'payload', record.requestUrl, 'Lighthouse payload 누락'),
      );
      return record;
    }

    const performanceScore = categories.performance.score;
    record.performanceScore = typeof performanceScore === 'number'
      ? Number((performanceScore * 100).toFixed(0))
      : null;
    record.lcp = readMetric(audits, 'largest-contentful-paint');
    record.inp = readMetric(audits, 'interaction-to-next-paint');
    record.cls = readMetric(audits, 'cumulative-layout-shift');
    record.rawFinalUrl = payload?.id || null;

    checks.push(`[${routeLabel} | ${strategy}] 측정 완료`);
    return record;
  } catch (error) {
    const errorKind = inferErrorKind(error);
    record.status = 'warning';
    record.errorKind = errorKind;
    record.error = error instanceof Error ? error.message : String(error);
    warnings.push(formatWarning(routeLabel, strategy, errorKind, record.requestUrl, record.error));
    return record;
  }
};

const writeReportFiles = (report) => {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const lines = [
    '# CWV Baseline Report',
    '',
    `- Result: ${report.ok ? 'PASS' : 'FAIL'}`,
    `- Checked At: ${report.checkedAt}`,
    `- Site URL: ${report.siteUrl}`,
    `- Timeout: ${report.timeoutMs}ms`,
    `- Note: 경고 레벨 리포트이며 차단 기준은 적용하지 않습니다.`,
    '',
    '| Route | Strategy | Score | LCP | INP | CLS | Status |',
    '| --- | --- | ---: | --- | --- | --- | --- |',
  ];

  for (const record of report.results) {
    lines.push(
      `| ${record.route} | ${record.strategy} | ${record.performanceScore ?? '-'} | ${record.lcp.displayValue} | ${record.inp.displayValue} | ${record.cls.displayValue} | ${record.status} |`,
    );
  }

  if (report.errorMessage) {
    lines.push('', '## Error', `- ${report.errorMessage}`);
  }

  if (report.checks.length > 0) {
    lines.push('', '## Checks');
    for (const check of report.checks) {
      lines.push(`- ${check}`);
    }
  }

  if (report.warnings.length > 0) {
    lines.push('', '## Warnings');
    for (const warning of report.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(markdownPath, `${lines.join('\n')}\n`, 'utf-8');
};

const run = async () => {
  for (const routePath of routes) {
    for (const strategy of strategies) {
      results.push(await measureRoute(routePath, strategy));
    }
  }

  const report = createReport({ ok: true });
  writeReportFiles(report);

  console.log('[cwv:baseline] COMPLETED (warning-only mode)');
  for (const check of checks) {
    console.log(`- ${check}`);
  }
  for (const warning of warnings) {
    console.log(`- WARN: ${warning}`);
  }
  console.log(`[cwv:baseline] json: ${jsonPath}`);
  console.log(`[cwv:baseline] markdown: ${markdownPath}`);
};

run().catch((error) => {
  const errorMessage = getErrorMessage(error);
  const report = createReport({ ok: false, errorMessage });
  writeReportFiles(report);
  console.error(`[cwv:baseline] unexpected error: ${errorMessage}`);
  console.error(`[cwv:baseline] json: ${jsonPath}`);
  console.error(`[cwv:baseline] markdown: ${markdownPath}`);
  process.exit(1);
});
