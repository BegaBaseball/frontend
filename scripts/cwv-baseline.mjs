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
const DEFAULT_ROUTES = ['/', '/home', '/prediction', '/cheer', '/mate'];
const parseRoutes = (rawValue) => String(rawValue || DEFAULT_ROUTES.join(','))
  .split(',')
  .map((routePath) => normalizePath(routePath.trim()))
  .filter(Boolean);
const parseBooleanFlag = (argName, envName) => {
  const rawValue = argMap.get(argName) ?? process.env[envName];
  if (rawValue === undefined) {
    return false;
  }

  return /^(1|true|yes|y)$/i.test(String(rawValue).trim());
};

const warnings = [];
const configuredEnvFilePath = String(argMap.get('--env-file') || process.env.CWV_BASELINE_ENV_FILE || '').trim();

const parseEnvFile = (filePath) => {
  if (!filePath) {
    return {};
  }
  if (!fs.existsSync(filePath)) {
    warnings.push(`[config] CWV env file not found: ${filePath}`);
    return {};
  }

  return fs.readFileSync(filePath, 'utf-8')
    .split(/\r?\n/)
    .reduce((env, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        return env;
      }

      const normalizedLine = line.startsWith('export ') ? line.slice('export '.length).trim() : line;
      const separatorIndex = normalizedLine.indexOf('=');
      if (separatorIndex <= 0) {
        return env;
      }

      const key = normalizedLine.slice(0, separatorIndex).trim();
      let value = normalizedLine.slice(separatorIndex + 1).trim();
      const quote = value[0];
      if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
        value = value.slice(1, -1);
      }

      return { ...env, [key]: value };
    }, {});
};

const envFilePath = configuredEnvFilePath ? path.resolve(process.cwd(), configuredEnvFilePath) : '';
const envFileValues = parseEnvFile(envFilePath);

const readConfigValue = (keys) => {
  for (const { key, source, value } of keys) {
    const normalizedValue = String(value || '').trim();
    if (normalizedValue) {
      return { value: normalizedValue, source, key };
    }
  }
  return { value: '', source: 'missing', key: null };
};

const siteUrlConfig = readConfigValue([
  { key: '--site-url', source: 'cli', value: argMap.get('--site-url') },
  { key: 'VITE_SITE_URL', source: 'process', value: process.env.VITE_SITE_URL },
  { key: 'VITE_SITE_URL', source: 'env-file', value: envFileValues.VITE_SITE_URL },
  { key: 'defaultSiteUrl', source: 'default', value: defaultSiteUrl },
]);
const apiKeyConfig = readConfigValue([
  { key: '--api-key', source: 'cli', value: argMap.get('--api-key') },
  { key: 'PAGESPEED_API_KEY', source: 'process', value: process.env.PAGESPEED_API_KEY },
  { key: 'PSI_API_KEY', source: 'process', value: process.env.PSI_API_KEY },
  { key: 'PAGESPEED_API_KEY', source: 'env-file', value: envFileValues.PAGESPEED_API_KEY },
  { key: 'PSI_API_KEY', source: 'env-file', value: envFileValues.PSI_API_KEY },
]);
const cruxApiKeyConfig = readConfigValue([
  { key: '--crux-api-key', source: 'cli', value: argMap.get('--crux-api-key') },
  { key: 'CRUX_API_KEY', source: 'process', value: process.env.CRUX_API_KEY },
  { key: 'CRUX_API_KEY', source: 'env-file', value: envFileValues.CRUX_API_KEY },
  {
    key: apiKeyConfig.key,
    source: `${apiKeyConfig.source}-pagespeed-fallback`,
    value: apiKeyConfig.value,
  },
]);

const siteUrl = normalizeSiteUrl(siteUrlConfig.value);
const jsonPath = path.resolve(process.cwd(), argMap.get('--json') || 'reports/cwv-baseline.json');
const markdownPath = path.resolve(process.cwd(), argMap.get('--markdown') || 'reports/cwv-baseline.md');
const timeoutMs = Number(argMap.get('--timeout-ms') || 30000);
const pagespeedApiKey = apiKeyConfig.value;
const cruxApiKey = cruxApiKeyConfig.value;
const retryCount = Math.max(0, Number(argMap.get('--retry-count') || process.env.PAGESPEED_RETRY_COUNT || 1));
const retryDelayMs = Math.max(0, Number(argMap.get('--retry-delay-ms') || process.env.PAGESPEED_RETRY_DELAY_MS || 2500));
const failOnWarning = parseBooleanFlag('--fail-on-warning', 'CWV_BASELINE_FAIL_ON_WARNING');
const requireApiKey = parseBooleanFlag('--require-api-key', 'CWV_BASELINE_REQUIRE_API_KEY');
const requireCruxApiKey = parseBooleanFlag('--require-crux-api-key', 'CWV_BASELINE_REQUIRE_CRUX_API_KEY');
const requireFieldData = parseBooleanFlag('--require-field-data', 'CWV_BASELINE_REQUIRE_FIELD_DATA');

const routes = parseRoutes(argMap.get('--routes') || process.env.CWV_BASELINE_ROUTES);
const strategies = ['mobile', 'desktop'];
const checks = [];
const results = [];
const ALLOWED_ERROR_KINDS = new Set(['network', 'timeout', 'http', 'payload', 'config']);
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
const CRUX_FATAL_HTTP_STATUSES = new Set([401, 403]);
const CWV_TARGETS = {
  lcp: {
    label: 'LCP',
    officialGood: 2500,
    strictGood: 1800,
    poorAt: 4000,
    unit: 'ms',
  },
  inp: {
    label: 'INP',
    officialGood: 200,
    strictGood: 100,
    poorAt: 500,
    unit: 'ms',
  },
  cls: {
    label: 'CLS',
    officialGood: 0.1,
    strictGood: 0.05,
    poorAt: 0.25,
    unit: 'score',
  },
};
const FIELD_METRIC_IDS = {
  lcp: 'LARGEST_CONTENTFUL_PAINT_MS',
  inp: 'INTERACTION_TO_NEXT_PAINT',
  cls: 'CUMULATIVE_LAYOUT_SHIFT_SCORE',
};
const CRUX_METRIC_IDS = {
  lcp: 'largest_contentful_paint',
  inp: 'interaction_to_next_paint',
  cls: 'cumulative_layout_shift',
};
const CRUX_FORM_FACTORS = {
  mobile: 'PHONE',
  desktop: 'DESKTOP',
};
const LAB_AUDIT_IDS = {
  lcp: 'largest-contentful-paint',
  inp: 'interaction-to-next-paint',
  cls: 'cumulative-layout-shift',
};
const getErrorMessage = (error) => (error instanceof Error ? error.message : String(error));
const sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs));

const redactUrl = (value) => {
  try {
    const url = new URL(value);
    if (url.searchParams.has('key')) {
      url.searchParams.set('key', '<redacted>');
    }
    return url.toString();
  } catch {
    return String(value).replace(/([?&]key=)[^&]+/i, '$1<redacted>');
  }
};

const redactSecrets = (value) => [pagespeedApiKey, cruxApiKey]
  .filter(Boolean)
  .reduce((redactedValue, secret) => redactedValue.split(secret).join('<redacted>'), String(value || ''));

const readGoogleApiErrorDetail = async (response, attempts) => {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Some Google API failures have an empty or non-JSON response body.
  }

  const status = typeof payload?.error?.status === 'string' ? payload.error.status.trim() : '';
  const message = typeof payload?.error?.message === 'string' ? payload.error.message.trim() : '';
  const detail = [
    `HTTP ${response.status} after ${attempts} attempt(s)`,
    status,
    message,
  ].filter(Boolean).join(': ');

  return redactSecrets(detail);
};

const parseRetryAfterMs = (response) => {
  const retryAfter = response.headers.get('retry-after');
  if (!retryAfter) {
    return null;
  }

  const retrySeconds = Number(retryAfter);
  if (Number.isFinite(retrySeconds) && retrySeconds >= 0) {
    return retrySeconds * 1000;
  }

  const retryAt = Date.parse(retryAfter);
  if (Number.isFinite(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return null;
};

const fetchWithTimeout = async (url, options = {}, apiLabel = 'Pagespeed') => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      headers: {
        'user-agent': 'bega-cwv-baseline/1.0',
        ...options.headers,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`${apiLabel} API 요청 타임아웃(${timeoutMs}ms)`);
      timeoutError.kind = 'timeout';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const fetchPagespeed = async (requestUrl, routeLabel, strategy) => {
  for (let attemptIndex = 0; attemptIndex <= retryCount; attemptIndex += 1) {
    const response = await fetchWithTimeout(requestUrl);
    const attempts = attemptIndex + 1;
    const canRetry = RETRYABLE_HTTP_STATUSES.has(response.status) && attemptIndex < retryCount;
    if (!canRetry) {
      return { response, attempts };
    }

    const retryAfterMs = parseRetryAfterMs(response);
    const delayMs = retryAfterMs ?? retryDelayMs * attempts;
    checks.push(
      `[${routeLabel} | ${strategy}] HTTP ${response.status} 재시도 ${attempts}/${retryCount} (${delayMs}ms 대기)`,
    );
    await sleep(delayMs);
  }

  throw new Error('Pagespeed API 재시도 상태 처리 오류');
};

const fetchCrux = async (requestUrl, requestBody, routeLabel, strategy) => {
  for (let attemptIndex = 0; attemptIndex <= retryCount; attemptIndex += 1) {
    const response = await fetchWithTimeout(requestUrl, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }, 'CrUX');
    const attempts = attemptIndex + 1;
    const canRetry = RETRYABLE_HTTP_STATUSES.has(response.status) && attemptIndex < retryCount;
    if (!canRetry) {
      return { response, attempts };
    }

    const retryAfterMs = parseRetryAfterMs(response);
    const delayMs = retryAfterMs ?? retryDelayMs * attempts;
    checks.push(
      `[${routeLabel} | ${strategy}] CrUX HTTP ${response.status} 재시도 ${attempts}/${retryCount} (${delayMs}ms 대기)`,
    );
    await sleep(delayMs);
  }

  throw new Error('CrUX API 재시도 상태 처리 오류');
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
const formatCruxWarning = (routeLabel, strategy, kind, targetUrl, message) => (
  `[${routeLabel} | ${strategy}] CrUX API ${kind} 오류 (${targetUrl}): ${message}`
);

const formatMetricValue = (metricKey, value) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  if (metricKey === 'cls') {
    return value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '.0');
  }

  if (metricKey === 'lcp' && value >= 1000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${Math.round(value)} ms`;
};

const normalizeFieldMetricValue = (metricKey, rawValue) => {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
    return null;
  }

  return metricKey === 'cls' ? rawValue / 100 : rawValue;
};

const withTargetAssessment = (metricKey, metric) => {
  const target = CWV_TARGETS[metricKey];
  const numericValue = typeof metric.numericValue === 'number' && Number.isFinite(metric.numericValue)
    ? metric.numericValue
    : null;
  const officialPass = numericValue === null ? null : numericValue <= target.officialGood;
  const strictPass = numericValue === null ? null : numericValue <= target.strictGood;
  const targetStatus = numericValue === null
    ? 'unavailable'
    : strictPass
      ? 'strict-good'
      : officialPass
        ? 'official-good'
        : numericValue <= target.poorAt
          ? 'needs-improvement'
          : 'poor';

  return {
    ...metric,
    numericValue,
    displayValue: metric.displayValue || formatMetricValue(metricKey, numericValue),
    officialGood: target.officialGood,
    strictGood: target.strictGood,
    officialPass,
    strictPass,
    targetStatus,
  };
};

const readLabMetric = (metricKey, audits) => {
  const metric = audits?.[LAB_AUDIT_IDS[metricKey]];
  if (!metric) {
    return withTargetAssessment(metricKey, {
      numericValue: null,
      displayValue: '-',
      source: 'unavailable',
      category: null,
    });
  }

  return withTargetAssessment(metricKey, {
    numericValue: typeof metric.numericValue === 'number' ? metric.numericValue : null,
    displayValue: metric.displayValue || '-',
    source: 'lab',
    category: null,
  });
};

const readFieldMetric = (metricKey, experience, source) => {
  const metric = experience?.metrics?.[FIELD_METRIC_IDS[metricKey]];
  if (!metric) {
    return null;
  }

  const numericValue = normalizeFieldMetricValue(metricKey, metric.percentile);
  return withTargetAssessment(metricKey, {
    numericValue,
    displayValue: formatMetricValue(metricKey, numericValue),
    source,
    category: typeof metric.category === 'string' ? metric.category : null,
  });
};

const readCruxMetric = (metricKey, fieldData) => {
  const metric = fieldData?.record?.metrics?.[CRUX_METRIC_IDS[metricKey]];
  const rawValue = metric?.percentiles?.p75;
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return null;
  }
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return withTargetAssessment(metricKey, {
    numericValue,
    displayValue: formatMetricValue(metricKey, numericValue),
    source: fieldData.source,
    category: null,
  });
};

const selectMetric = (metricKey, fieldData, payload, audits) => (
  readCruxMetric(metricKey, fieldData)
  ?? readFieldMetric(metricKey, payload?.loadingExperience, 'field-url')
  ?? readFieldMetric(metricKey, payload?.originLoadingExperience, 'field-origin')
  ?? readLabMetric(metricKey, audits)
);

const cruxOriginRequests = new Map();
let cruxFatalError = null;

const queryCruxRecord = async ({ routeLabel, strategy, identifier, identifierType }) => {
  const apiUrl = new URL('https://chromeuxreport.googleapis.com/v1/records:queryRecord');
  apiUrl.searchParams.set('key', cruxApiKey);
  const requestUrl = apiUrl.toString();
  const reportRequestUrl = redactUrl(requestUrl);
  const requestBody = {
    [identifierType]: identifier,
    formFactor: CRUX_FORM_FACTORS[strategy],
    metrics: Object.values(CRUX_METRIC_IDS),
  };

  try {
    const { response, attempts } = await fetchCrux(requestUrl, requestBody, routeLabel, strategy);
    if (response.status === 404) {
      return { record: null, attempts, requestUrl: reportRequestUrl, notFound: true, error: false };
    }
    if (!response.ok) {
      const detail = await readGoogleApiErrorDetail(response, attempts);
      const fatal = CRUX_FATAL_HTTP_STATUSES.has(response.status);
      warnings.push(
        formatCruxWarning(routeLabel, strategy, 'http', reportRequestUrl, detail),
      );
      return {
        record: null,
        attempts,
        requestUrl: reportRequestUrl,
        notFound: false,
        error: true,
        fatal,
      };
    }

    const payload = await response.json();
    if (!payload?.record?.metrics) {
      warnings.push(
        formatCruxWarning(routeLabel, strategy, 'payload', reportRequestUrl, 'record.metrics 누락'),
      );
      return { record: null, attempts, requestUrl: reportRequestUrl, notFound: false, error: true };
    }

    return { record: payload.record, attempts, requestUrl: reportRequestUrl, notFound: false, error: false };
  } catch (error) {
    const errorKind = inferErrorKind(error);
    warnings.push(
      formatCruxWarning(routeLabel, strategy, errorKind, reportRequestUrl, getErrorMessage(error)),
    );
    return { record: null, attempts: 0, requestUrl: reportRequestUrl, notFound: false, error: true };
  }
};

const getCruxFieldData = async (targetUrl, routeLabel, strategy) => {
  if (!cruxApiKey) {
    return null;
  }
  if (cruxFatalError) {
    return {
      ...cruxFatalError,
      record: null,
      attempts: 0,
      source: 'skipped-fatal-error',
      collectionPeriod: null,
    };
  }

  const urlResult = await queryCruxRecord({
    routeLabel,
    strategy,
    identifier: targetUrl,
    identifierType: 'url',
  });
  if (urlResult.record) {
    return {
      ...urlResult,
      source: 'field-crux-url',
      collectionPeriod: urlResult.record.collectionPeriod ?? null,
    };
  }
  if (urlResult.error) {
    if (urlResult.fatal) {
      cruxFatalError = urlResult;
    }
    return {
      ...urlResult,
      source: urlResult.fatal ? 'fatal-error' : 'error',
      collectionPeriod: null,
    };
  }

  const origin = new URL(targetUrl).origin;
  const cacheKey = `${origin}:${strategy}`;
  if (!cruxOriginRequests.has(cacheKey)) {
    cruxOriginRequests.set(cacheKey, queryCruxRecord({
      routeLabel,
      strategy,
      identifier: origin,
      identifierType: 'origin',
    }));
  }
  const originResult = await cruxOriginRequests.get(cacheKey);
  if (!originResult.record) {
    if (originResult.fatal) {
      cruxFatalError = originResult;
    }
    return {
      ...originResult,
      attempts: urlResult.attempts + originResult.attempts,
      source: originResult.error
        ? originResult.fatal ? 'fatal-error' : 'error'
        : 'not-found-url-origin',
      collectionPeriod: null,
    };
  }

  return {
    ...originResult,
    attempts: urlResult.attempts + originResult.attempts,
    source: 'field-crux-origin',
    collectionPeriod: originResult.record.collectionPeriod ?? null,
  };
};

const getAssessmentStatus = (metrics, key) => {
  if (metrics.some((metric) => metric[key] === false)) {
    return 'review';
  }
  if (metrics.every((metric) => metric[key] === true)) {
    return 'pass';
  }
  return 'unknown';
};

const collectMetricSources = (metrics) => (
  Array.from(new Set(metrics.map((metric) => metric.source || 'unavailable'))).join(', ')
);

const appendMetricTargetWarnings = (record) => {
  for (const metricKey of ['lcp', 'inp', 'cls']) {
    const metric = record[metricKey];
    if (metric.officialPass === false) {
      warnings.push(
        `[${record.route} | ${record.strategy}] ${CWV_TARGETS[metricKey].label} 공식 Good 초과: ${metric.displayValue} > ${formatMetricValue(metricKey, metric.officialGood)} (${metric.source})`,
      );
    }
    if (metric.strictPass === false) {
      warnings.push(
        `[${record.route} | ${record.strategy}] ${CWV_TARGETS[metricKey].label} 내부 SLO 초과: ${metric.displayValue} > ${formatMetricValue(metricKey, metric.strictGood)} (${metric.source})`,
      );
    }
  }
};

const cloneResult = (record) => ({
  ...record,
  lcp: { ...record.lcp },
  inp: { ...record.inp },
  cls: { ...record.cls },
});

const getReportStatus = (ok, reportResults) => {
  if (!ok) {
    return 'fail';
  }
  if (
    warnings.length > 0
    || reportResults.some((record) => record.status !== 'ok')
  ) {
    return 'warning';
  }
  return 'pass';
};

const createReport = ({ ok, errorMessage = null }) => {
  const reportResults = results.map(cloneResult);
  return {
    ok,
    reportStatus: getReportStatus(ok, reportResults),
    checkedAt: new Date().toISOString(),
    siteUrl,
    siteUrlSource: siteUrlConfig.source,
    timeoutMs,
    pagespeedApiKeyConfigured: pagespeedApiKey.length > 0,
    pagespeedApiKeySource: pagespeedApiKey ? apiKeyConfig.source : 'missing',
    cruxApiKeyConfigured: cruxApiKey.length > 0,
    cruxApiKeySource: cruxApiKey ? cruxApiKeyConfig.source : 'missing',
    envFileConfigured: Boolean(configuredEnvFilePath),
    retryCount,
    retryDelayMs,
    failOnWarning,
    requireApiKey,
    requireCruxApiKey,
    requireFieldData,
    routes: [...routes],
    strategies: [...strategies],
    checks: [...checks],
    warnings: [...warnings],
    results: reportResults,
    ...(errorMessage ? { errorMessage } : {}),
  };
};

const measureRoute = async (routePath, strategy) => {
  const normalizedPath = normalizePath(routePath);
  const routeLabel = normalizedPath;
  const targetUrl = normalizedPath === '/' ? siteUrl : `${siteUrl}${normalizedPath}`;
  const apiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  apiUrl.searchParams.set('url', targetUrl);
  apiUrl.searchParams.set('strategy', strategy);
  apiUrl.searchParams.set('category', 'performance');
  if (pagespeedApiKey) {
    apiUrl.searchParams.set('key', pagespeedApiKey);
  }
  const requestUrl = apiUrl.toString();
  const reportRequestUrl = redactUrl(requestUrl);

  const record = {
    route: normalizedPath,
    strategy,
    targetUrl,
    requestUrl: reportRequestUrl,
    status: 'ok',
    performanceScore: null,
    lcp: withTargetAssessment('lcp', { numericValue: null, displayValue: '-', source: 'unavailable', category: null }),
    inp: withTargetAssessment('inp', { numericValue: null, displayValue: '-', source: 'unavailable', category: null }),
    cls: withTargetAssessment('cls', { numericValue: null, displayValue: '-', source: 'unavailable', category: null }),
    metricSource: 'unavailable',
    officialAssessment: 'unknown',
    strictAssessment: 'unknown',
    rawFinalUrl: null,
    errorKind: null,
    httpStatus: null,
    attempts: 0,
    cruxSource: cruxApiKey ? 'unavailable' : 'not-configured',
    cruxCollectionPeriod: null,
    cruxAttempts: 0,
    cruxRequestUrl: null,
    error: null,
  };

  try {
    const cruxFieldData = await getCruxFieldData(targetUrl, routeLabel, strategy);
    if (cruxFieldData) {
      record.cruxSource = cruxFieldData.source;
      record.cruxCollectionPeriod = cruxFieldData.collectionPeriod;
      record.cruxAttempts = cruxFieldData.attempts;
      record.cruxRequestUrl = cruxFieldData.requestUrl;
    }
    const { response, attempts } = await fetchPagespeed(requestUrl, routeLabel, strategy);
    record.attempts = attempts;
    if (!response.ok) {
      record.status = 'warning';
      record.errorKind = 'http';
      record.httpStatus = response.status;
      record.error = `HTTP ${response.status}`;
      warnings.push(
        formatWarning(routeLabel, strategy, 'http', record.requestUrl, `HTTP ${response.status} after ${attempts} attempt(s)`),
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
    record.lcp = selectMetric('lcp', cruxFieldData, payload, audits);
    record.inp = selectMetric('inp', cruxFieldData, payload, audits);
    record.cls = selectMetric('cls', cruxFieldData, payload, audits);
    const selectedMetrics = [record.lcp, record.inp, record.cls];
    record.metricSource = collectMetricSources(selectedMetrics);
    record.officialAssessment = getAssessmentStatus(selectedMetrics, 'officialPass');
    record.strictAssessment = getAssessmentStatus(selectedMetrics, 'strictPass');
    record.rawFinalUrl = payload?.id || null;

    if (
      requireFieldData
      && selectedMetrics.some((metric) => !String(metric.source || '').startsWith('field-'))
    ) {
      warnings.push(
        `[${routeLabel} | ${strategy}] field 데이터 필수 모드에서 lab/unavailable metric source 감지: ${record.metricSource}`,
      );
    }

    checks.push(
      `[${routeLabel} | ${strategy}] 측정 완료 (attempts=${record.attempts}, crux=${record.cruxSource}, cruxAttempts=${record.cruxAttempts}, source=${record.metricSource}, official=${record.officialAssessment}, strict=${record.strictAssessment})`,
    );
    appendMetricTargetWarnings(record);
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
    `- Result: ${report.reportStatus.toUpperCase()}`,
    `- Checked At: ${report.checkedAt}`,
    `- Site URL: ${report.siteUrl}`,
    `- Site URL Source: ${report.siteUrlSource}`,
    `- Timeout: ${report.timeoutMs}ms`,
    `- PageSpeed API Key: ${report.pagespeedApiKeyConfigured ? 'configured' : 'not configured'}`,
    `- PageSpeed API Key Source: ${report.pagespeedApiKeySource}`,
    `- CrUX API Key: ${report.cruxApiKeyConfigured ? 'configured' : 'not configured'}`,
    `- CrUX API Key Source: ${report.cruxApiKeySource}`,
    `- Env File: ${report.envFileConfigured ? 'configured' : 'not configured'}`,
    `- Routes: ${report.routes.join(', ')}`,
    `- Strategies: ${report.strategies.join(', ')}`,
    `- Retry: ${report.retryCount} retry(s), base delay ${report.retryDelayMs}ms`,
    `- Mode: ${report.failOnWarning ? 'gate (warnings fail)' : 'warning-only'}`,
    `- Require API Key: ${report.requireApiKey ? 'yes' : 'no'}`,
    `- Require CrUX API Key: ${report.requireCruxApiKey ? 'yes' : 'no'}`,
    `- Require Field Data: ${report.requireFieldData ? 'yes' : 'no'}`,
    `- Note: ${report.failOnWarning ? '게이트 모드이며 warning 이상은 실패로 처리합니다.' : '경고 레벨 리포트이며 차단 기준은 적용하지 않습니다.'}`,
    `- Official Good: LCP <= ${formatMetricValue('lcp', CWV_TARGETS.lcp.officialGood)}, INP <= ${formatMetricValue('inp', CWV_TARGETS.inp.officialGood)}, CLS <= ${formatMetricValue('cls', CWV_TARGETS.cls.officialGood)}`,
    `- Internal SLO: LCP <= ${formatMetricValue('lcp', CWV_TARGETS.lcp.strictGood)}, INP <= ${formatMetricValue('inp', CWV_TARGETS.inp.strictGood)}, CLS <= ${formatMetricValue('cls', CWV_TARGETS.cls.strictGood)}`,
    '',
    '| Route | Strategy | CrUX | Source | Score | LCP | INP | CLS | Official | Strict SLO | Status |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |',
  ];

  for (const record of report.results) {
    lines.push(
      `| ${record.route} | ${record.strategy} | ${record.cruxSource} (${record.cruxAttempts}) | ${record.metricSource} | ${record.performanceScore ?? '-'} | ${record.lcp.displayValue} | ${record.inp.displayValue} | ${record.cls.displayValue} | ${record.officialAssessment} | ${record.strictAssessment} | ${record.status} |`,
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
  let hasBlockingConfigError = false;
  if (requireApiKey && !pagespeedApiKey) {
    warnings.push('[config] PAGESPEED_API_KEY 또는 PSI_API_KEY가 필요합니다.');
    hasBlockingConfigError = true;
  }
  if (requireCruxApiKey && !cruxApiKey) {
    warnings.push('[config] CRUX_API_KEY 또는 CrUX API가 허용된 PageSpeed API 키가 필요합니다.');
    hasBlockingConfigError = true;
  }

  if (!hasBlockingConfigError) {
    for (const routePath of routes) {
      for (const strategy of strategies) {
        results.push(await measureRoute(routePath, strategy));
      }
    }
  }

  const report = createReport({ ok: true });
  writeReportFiles(report);

  console.log(`[cwv:baseline] ${report.reportStatus.toUpperCase()} (${failOnWarning ? 'gate' : 'warning-only'} mode)`);
  for (const check of checks) {
    console.log(`- ${check}`);
  }
  for (const warning of warnings) {
    console.log(`- WARN: ${warning}`);
  }
  console.log(`[cwv:baseline] json: ${jsonPath}`);
  console.log(`[cwv:baseline] markdown: ${markdownPath}`);

  if (failOnWarning && report.reportStatus !== 'pass') {
    console.error(`[cwv:baseline] gate failed: reportStatus=${report.reportStatus}`);
    process.exit(1);
  }
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
