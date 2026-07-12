import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const baselineScriptPath = path.join(scriptDir, 'cwv-baseline.mjs');

const writeMockFetchModule = (filePath) => {
  writeFileSync(filePath, `
import { appendFileSync } from 'node:fs';

const status = Number(process.env.CWV_BASELINE_MOCK_STATUS || 200);
const fieldMode = process.env.CWV_BASELINE_MOCK_FIELD || 'url';
const cruxStatus = Number(process.env.CWV_BASELINE_MOCK_CRUX_STATUS || 200);
const cruxUrlStatus = Number(process.env.CWV_BASELINE_MOCK_CRUX_URL_STATUS || cruxStatus);
const cruxOriginStatus = Number(process.env.CWV_BASELINE_MOCK_CRUX_ORIGIN_STATUS || cruxStatus);
const cruxErrorMessage = process.env.CWV_BASELINE_MOCK_CRUX_ERROR_MESSAGE || 'Mock CrUX API error';
const lcp = Number(process.env.CWV_BASELINE_MOCK_LCP || 1200);
const inp = Number(process.env.CWV_BASELINE_MOCK_INP || 80);
const cls = Number(process.env.CWV_BASELINE_MOCK_CLS || 1);
const labCls = Number(process.env.CWV_BASELINE_MOCK_LAB_CLS || 0.01);
const responsePayload = {
  id: 'https://example.test/home',
  ...(fieldMode === 'none' ? {} : {
    loadingExperience: {
      metrics: {
        LARGEST_CONTENTFUL_PAINT_MS: { percentile: lcp, category: 'FAST' },
        INTERACTION_TO_NEXT_PAINT: { percentile: inp, category: 'FAST' },
        CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: cls, category: 'FAST' },
      },
    },
  }),
  lighthouseResult: {
    categories: {
      performance: { score: 0.98 },
    },
    audits: {
      'largest-contentful-paint': { numericValue: lcp, displayValue: String(lcp) + ' ms' },
      'interaction-to-next-paint': { numericValue: inp, displayValue: String(inp) + ' ms' },
      'cumulative-layout-shift': { numericValue: labCls, displayValue: String(labCls) },
    },
  },
};

globalThis.fetch = async (url, options = {}) => {
  const requestUrl = String(url);
  const requestBody = typeof options.body === 'string' ? options.body : '';
  appendFileSync(
    process.env.CWV_BASELINE_REQUEST_LOG,
    requestUrl + (requestBody ? ' ' + requestBody : '') + '\\n',
    'utf8',
  );

  if (requestUrl.includes('chromeuxreport.googleapis.com')) {
    const parsedRequestBody = requestBody ? JSON.parse(requestBody) : {};
    const responseStatus = parsedRequestBody.origin ? cruxOriginStatus : cruxUrlStatus;
    return {
      ok: responseStatus >= 200 && responseStatus < 300,
      status: responseStatus,
      headers: {
        get: () => null,
      },
      json: async () => responseStatus >= 200 && responseStatus < 300
        ? ({
          record: {
            key: parsedRequestBody,
            metrics: {
              largest_contentful_paint: { percentiles: { p75: lcp } },
              interaction_to_next_paint: { percentiles: { p75: inp } },
              cumulative_layout_shift: { percentiles: { p75: String(labCls) } },
            },
            collectionPeriod: {
              firstDate: { year: 2026, month: 6, day: 13 },
              lastDate: { year: 2026, month: 7, day: 10 },
            },
          },
        })
        : ({
          error: {
            code: responseStatus,
            status: responseStatus === 403 ? 'PERMISSION_DENIED' : 'UNKNOWN',
            message: cruxErrorMessage,
          },
        }),
    };
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => null,
    },
    json: async () => responsePayload,
  };
};
`, 'utf8');
};

const createFixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'cwv-baseline-test-'));
  const jsonPath = path.join(root, 'cwv-baseline.json');
  const markdownPath = path.join(root, 'cwv-baseline.md');
  const requestLogPath = path.join(root, 'requests.log');
  const mockFetchPath = path.join(root, 'mock-fetch.mjs');

  mkdirSync(root, { recursive: true });
  writeFileSync(requestLogPath, '', 'utf8');
  writeMockFetchModule(mockFetchPath);

  return {
    root,
    jsonPath,
    markdownPath,
    requestLogPath,
    mockFetchPath,
  };
};

const runBaseline = (fixture, env = {}, extraArgs = [], options = {}) => {
  const siteUrlArgs = options.siteUrl === null
    ? []
    : ['--site-url', options.siteUrl || 'https://example.test'];
  const childEnv = {
    ...process.env,
    PAGESPEED_API_KEY: '',
    PSI_API_KEY: '',
    CRUX_API_KEY: '',
    VITE_SITE_URL: '',
    NODE_OPTIONS: `--import=${pathToFileURL(fixture.mockFetchPath).href}`,
    CWV_BASELINE_REQUEST_LOG: fixture.requestLogPath,
    PAGESPEED_RETRY_COUNT: '0',
    ...env,
  };

  return spawnSync(process.execPath, [
    baselineScriptPath,
    ...siteUrlArgs,
    '--json',
    fixture.jsonPath,
    '--markdown',
    fixture.markdownPath,
    '--retry-count',
    '0',
    ...extraArgs,
  ], {
    cwd: frontendRoot,
    env: childEnv,
    encoding: 'utf8',
  });
};

test('cwv baseline default route set covers core public journeys', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.deepEqual(report.routes, ['/', '/home', '/prediction', '/cheer', '/mate']);
  assert.equal(report.results.length, 10);
  assert.equal(requestLog.trim().split('\n').length, 10);
  assert.match(markdown, /- Routes: \/, \/home, \/prediction, \/cheer, \/mate/);
  assert.match(markdown, /- Strategies: mobile, desktop/);
});

test('cwv baseline routes can be overridden for focused field checks', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
  }, ['--routes', '/prediction,/mate/']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));

  assert.deepEqual(report.routes, ['/prediction', '/mate']);
  assert.deepEqual(
    report.results.map((record) => `${record.route}:${record.strategy}`),
    [
      '/prediction:mobile',
      '/prediction:desktop',
      '/mate:mobile',
      '/mate:desktop',
    ],
  );
});

test('cwv baseline reports warning status when PageSpeed is unavailable', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '429',
    PAGESPEED_API_KEY: 'test-secret-key',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.equal(report.ok, true);
  assert.equal(report.reportStatus, 'warning');
  assert.equal(report.warnings.length, 10);
  assert.equal(report.results.every((record) => record.status === 'warning'), true);
  assert.equal(report.results.every((record) => !record.requestUrl.includes('test-secret-key')), true);
  assert.match(requestLog, /key=test-secret-key/);
  assert.match(markdown, /- Result: WARNING/);
  assert.doesNotMatch(markdown, /test-secret-key/);
});

test('cwv baseline reports pass status when all PageSpeed calls return good metrics', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.equal(report.ok, true);
  assert.equal(report.reportStatus, 'pass');
  assert.equal(report.warnings.length, 0);
  assert.equal(report.results.every((record) => record.metricSource === 'field-url'), true);
  assert.equal(report.results.every((record) => record.officialAssessment === 'pass'), true);
  assert.equal(report.results.every((record) => record.strictAssessment === 'pass'), true);
  assert.match(markdown, /- Result: PASS/);
});

test('cwv baseline gate fails when PageSpeed is unavailable', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '429',
    PAGESPEED_API_KEY: 'test-secret-key',
  }, ['--fail-on-warning']);

  assert.equal(result.status, 1);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.equal(report.ok, true);
  assert.equal(report.reportStatus, 'warning');
  assert.equal(report.failOnWarning, true);
  assert.equal(report.warnings.length, 10);
  assert.match(markdown, /- Mode: gate \(warnings fail\)/);
  assert.match(result.stderr, /gate failed/);
});

test('cwv baseline gate requires PageSpeed API key when configured', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
  }, ['--require-api-key', '--fail-on-warning']);

  assert.equal(result.status, 1);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.equal(report.reportStatus, 'warning');
  assert.equal(report.requireApiKey, true);
  assert.equal(report.results.length, 0);
  assert.equal(requestLog, '');
  assert.ok(report.warnings.some((warning) => warning.includes('PAGESPEED_API_KEY')));
});

test('cwv baseline gate requires a Google API key for direct CrUX when configured', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
  }, ['--require-api-key', '--require-crux-api-key', '--fail-on-warning']);

  assert.equal(result.status, 1);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.equal(report.reportStatus, 'warning');
  assert.equal(report.requireCruxApiKey, true);
  assert.equal(report.results.length, 0);
  assert.equal(requestLog, '');
  assert.ok(report.warnings.some((warning) => warning.includes('CRUX_API_KEY')));
});

test('cwv baseline reuses the PageSpeed key for CrUX when the key allows both APIs', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_FIELD: 'none',
    PAGESPEED_API_KEY: 'shared-google-api-key',
  }, ['--require-api-key', '--require-crux-api-key', '--require-field-data', '--fail-on-warning']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.equal(report.cruxApiKeyConfigured, true);
  assert.equal(report.cruxApiKeySource, 'process-pagespeed-fallback');
  assert.equal(report.results.every((record) => record.metricSource === 'field-crux-url'), true);
  assert.match(requestLog, /chromeuxreport\.googleapis\.com\/v1\/records:queryRecord\?key=shared-google-api-key/);
  assert.doesNotMatch(JSON.stringify(report), /shared-google-api-key/);
  assert.doesNotMatch(markdown, /shared-google-api-key/);
});

test('cwv baseline can read field gate config from an explicit env file without reporting secrets', () => {
  const fixture = createFixture();
  const envFilePath = path.join(fixture.root, 'prod.env');
  writeFileSync(envFilePath, [
    'VITE_SITE_URL=https://field.example.test',
    'export PSI_API_KEY="env-file-secret-key"',
  ].join('\n'), 'utf8');

  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
  }, [
    '--env-file',
    envFilePath,
    '--require-api-key',
    '--require-crux-api-key',
    '--require-field-data',
    '--fail-on-warning',
  ], { siteUrl: null });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.equal(report.siteUrl, 'https://field.example.test');
  assert.equal(report.siteUrlSource, 'env-file');
  assert.equal(report.pagespeedApiKeyConfigured, true);
  assert.equal(report.pagespeedApiKeySource, 'env-file');
  assert.equal(report.cruxApiKeyConfigured, true);
  assert.equal(report.cruxApiKeySource, 'env-file-pagespeed-fallback');
  assert.equal(report.envFileConfigured, true);
  assert.match(requestLog, /key=env-file-secret-key/);
  assert.match(requestLog, /chromeuxreport\.googleapis\.com\/v1\/records:queryRecord\?key=env-file-secret-key/);
  assert.match(requestLog, /url=https%3A%2F%2Ffield\.example\.test%2F/);
  assert.doesNotMatch(JSON.stringify(report), /env-file-secret-key/);
  assert.doesNotMatch(markdown, /env-file-secret-key/);
  assert.match(markdown, /- PageSpeed API Key Source: env-file/);
});

test('cwv baseline gate requires field data when configured', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_FIELD: 'none',
    CWV_BASELINE_MOCK_CRUX_URL_STATUS: '404',
    CWV_BASELINE_MOCK_CRUX_ORIGIN_STATUS: '404',
    PAGESPEED_API_KEY: 'test-secret-key',
  }, ['--require-api-key', '--require-field-data', '--fail-on-warning']);

  assert.equal(result.status, 1);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.equal(report.reportStatus, 'warning');
  assert.equal(report.requireApiKey, true);
  assert.equal(report.requireFieldData, true);
  assert.equal(report.results.every((record) => record.metricSource === 'lab'), true);
  assert.equal(report.results.every((record) => record.cruxSource === 'not-found-url-origin'), true);
  assert.equal(report.results.every((record) => record.cruxAttempts === 2), true);
  assert.equal(report.warnings.filter((warning) => warning.includes('field 데이터 필수 모드')).length, 10);
  assert.match(result.stdout, /crux=not-found-url-origin, cruxAttempts=2/);
  assert.match(markdown, /\| not-found-url-origin \(2\) \|/);
});

test('cwv baseline gate passes when keyed PageSpeed field data meets strict SLOs', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_CRUX_URL_STATUS: '404',
    CWV_BASELINE_MOCK_CRUX_ORIGIN_STATUS: '404',
    PAGESPEED_API_KEY: 'test-secret-key',
  }, ['--require-api-key', '--require-field-data', '--fail-on-warning']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');

  assert.equal(report.reportStatus, 'pass');
  assert.equal(report.failOnWarning, true);
  assert.equal(report.requireApiKey, true);
  assert.equal(report.requireFieldData, true);
  assert.equal(report.results.every((record) => record.metricSource === 'field-url'), true);
  assert.match(markdown, /- Require Field Data: yes/);
});

test('cwv baseline prefers explicit CrUX URL field data while retaining PageSpeed lab diagnostics', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_FIELD: 'none',
    PAGESPEED_API_KEY: 'pagespeed-secret-key',
    CRUX_API_KEY: 'crux-secret-key',
  }, ['--require-api-key', '--require-crux-api-key', '--require-field-data', '--fail-on-warning']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const markdown = readFileSync(fixture.markdownPath, 'utf8');
  const requestLog = readFileSync(fixture.requestLogPath, 'utf8');

  assert.equal(report.reportStatus, 'pass');
  assert.equal(report.cruxApiKeyConfigured, true);
  assert.equal(report.cruxApiKeySource, 'process');
  assert.equal(report.requireCruxApiKey, true);
  assert.equal(report.results.every((record) => record.metricSource === 'field-crux-url'), true);
  assert.equal(report.results.every((record) => record.performanceScore === 98), true);
  assert.match(requestLog, /chromeuxreport\.googleapis\.com\/v1\/records:queryRecord\?key=crux-secret-key/);
  assert.match(requestLog, /"formFactor":"PHONE"/);
  assert.match(requestLog, /"formFactor":"DESKTOP"/);
  assert.match(requestLog, /www\.googleapis\.com\/pagespeedonline\/v5\/runPagespeed/);
  assert.doesNotMatch(JSON.stringify(report), /crux-secret-key|pagespeed-secret-key/);
  assert.doesNotMatch(markdown, /crux-secret-key|pagespeed-secret-key/);
  assert.match(markdown, /- CrUX API Key: configured/);
});

test('cwv baseline falls back to one cached CrUX origin request per form factor', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_FIELD: 'none',
    CWV_BASELINE_MOCK_CRUX_URL_STATUS: '404',
    CWV_BASELINE_MOCK_CRUX_ORIGIN_STATUS: '200',
    PAGESPEED_API_KEY: 'pagespeed-secret-key',
    CRUX_API_KEY: 'crux-secret-key',
  }, ['--require-api-key', '--require-field-data', '--fail-on-warning']);

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const requests = readFileSync(fixture.requestLogPath, 'utf8').trim().split('\n');
  const cruxRequests = requests.filter((request) => request.includes('chromeuxreport.googleapis.com'));
  const originRequests = cruxRequests.filter((request) => request.includes('"origin"'));

  assert.equal(report.results.every((record) => record.metricSource === 'field-crux-origin'), true);
  assert.equal(report.results.every((record) => record.cruxSource === 'field-crux-origin'), true);
  assert.equal(cruxRequests.length, 12);
  assert.equal(originRequests.length, 2);
});

test('cwv baseline records one actionable warning for a fatal CrUX permission error', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_FIELD: 'none',
    CWV_BASELINE_MOCK_CRUX_STATUS: '403',
    CWV_BASELINE_MOCK_CRUX_ERROR_MESSAGE: 'Chrome UX Report API is disabled for this project (crux-secret-key)',
    PAGESPEED_API_KEY: 'pagespeed-secret-key',
    CRUX_API_KEY: 'crux-secret-key',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const requests = readFileSync(fixture.requestLogPath, 'utf8').trim().split('\n');
  const cruxRequests = requests.filter((request) => request.includes('chromeuxreport.googleapis.com'));
  const cruxWarnings = report.warnings.filter((warning) => warning.includes('CrUX API'));

  assert.equal(cruxRequests.length, 1);
  assert.equal(cruxWarnings.length, 1);
  assert.match(cruxWarnings[0], /PERMISSION_DENIED/);
  assert.match(cruxWarnings[0], /Chrome UX Report API is disabled for this project/);
  assert.doesNotMatch(JSON.stringify(report), /crux-secret-key|pagespeed-secret-key/);
});

test('cwv baseline stops after a fatal CrUX origin fallback error', () => {
  const fixture = createFixture();
  const result = runBaseline(fixture, {
    CWV_BASELINE_MOCK_STATUS: '200',
    CWV_BASELINE_MOCK_FIELD: 'none',
    CWV_BASELINE_MOCK_CRUX_URL_STATUS: '404',
    CWV_BASELINE_MOCK_CRUX_ORIGIN_STATUS: '403',
    PAGESPEED_API_KEY: 'pagespeed-secret-key',
    CRUX_API_KEY: 'crux-secret-key',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = JSON.parse(readFileSync(fixture.jsonPath, 'utf8'));
  const requests = readFileSync(fixture.requestLogPath, 'utf8').trim().split('\n');
  const cruxRequests = requests.filter((request) => request.includes('chromeuxreport.googleapis.com'));
  const cruxWarnings = report.warnings.filter((warning) => warning.includes('CrUX API'));

  assert.equal(cruxRequests.length, 2);
  assert.equal(cruxWarnings.length, 1);
  assert.match(cruxWarnings[0], /PERMISSION_DENIED/);
});
