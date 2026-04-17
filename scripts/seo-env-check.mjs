import { loadEnv } from 'vite';

const loadedEnv = loadEnv('production', process.cwd(), '');
for (const [key, value] of Object.entries(loadedEnv)) {
  if (process.env[key] == null || String(process.env[key]).trim() === '') {
    process.env[key] = value;
  }
}

const args = process.argv.slice(2);
const strict = args.includes('--strict');

const LOOPBACK_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0:0:0:0:0:0:0:1',
]);

const requiredEnvKeys = [
  'VITE_SITE_URL',
  'VITE_API_BASE_URL',
];

const recommendedEnvKeys = [
  'VITE_GA4_MEASUREMENT_ID',
  'VITE_GOOGLE_SITE_VERIFICATION',
  'VITE_NAVER_SITE_VERIFICATION',
];

const failures = [];
const warnings = [];
const checks = [];

const PLACEHOLDER_PATTERNS = [
  /replace-with-real/i,
  /replace[-_]me/i,
  /placeholder/i,
  /example/i,
  /google-site-verification-token/i,
  /naver-site-verification-token/i,
  /^g-xxxxxxxxxx$/i,
];

const normalizeHost = (host) =>
  String(host || '')
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .trim()
    .toLowerCase();

const isLoopbackHost = (host) => LOOPBACK_HOSTS.has(normalizeHost(host));

const looksLikePlaceholder = (value) =>
  PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(String(value || '').trim()));

const parseAbsoluteUrl = (label, value) => {
  try {
    const parsed = new URL(value);
    if (!/^https?:$/i.test(parsed.protocol)) {
      failures.push(`${label}는 http(s) 절대 URL이어야 합니다: ${value}`);
      return null;
    }
    return parsed;
  } catch {
    failures.push(`${label}는 유효한 절대 URL이어야 합니다: ${value}`);
    return null;
  }
};

for (const key of requiredEnvKeys) {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    failures.push(`필수 env 누락: ${key}`);
  } else {
    checks.push(`필수 env 확인: ${key}`);
  }
}

const siteUrlValue = String(process.env.VITE_SITE_URL || '').trim();
const apiBaseValue = String(process.env.VITE_API_BASE_URL || '').trim();

const siteUrl = siteUrlValue ? parseAbsoluteUrl('VITE_SITE_URL', siteUrlValue) : null;
const siteHostIsLoopback = siteUrl ? isLoopbackHost(siteUrl.hostname) : false;

if (siteUrl) {
  checks.push(`VITE_SITE_URL host 확인: ${siteUrl.host}`);
  if (!siteHostIsLoopback && siteUrl.protocol !== 'https:') {
    warnings.push(`공개 배포 기준 VITE_SITE_URL은 HTTPS 권장: ${siteUrlValue}`);
  }
}

if (apiBaseValue) {
  const apiBaseIsAbsolute = /^https?:\/\//i.test(apiBaseValue);
  if (!apiBaseIsAbsolute && !siteHostIsLoopback) {
    failures.push('공개 preview/prod 빌드에서는 VITE_API_BASE_URL에 상대 경로를 사용할 수 없습니다.');
  } else if (apiBaseIsAbsolute) {
    const apiBaseUrl = parseAbsoluteUrl('VITE_API_BASE_URL', apiBaseValue);
    if (apiBaseUrl) {
      checks.push(`VITE_API_BASE_URL host 확인: ${apiBaseUrl.host}`);
    }
  } else {
    checks.push(`로컬/loopback 빌드에서 상대 API base 허용: ${apiBaseValue}`);
  }
}

for (const key of recommendedEnvKeys) {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    if (strict) {
      failures.push(`strict 모드 권장 env 누락: ${key}`);
    } else {
      warnings.push(`권장 env 누락: ${key}`);
    }
  } else if (looksLikePlaceholder(value)) {
    if (strict) {
      failures.push(`strict 모드 placeholder env 감지: ${key}`);
    } else {
      warnings.push(`placeholder env 감지: ${key}`);
    }
  } else {
    checks.push(`권장 env 확인: ${key}`);
  }
}

if (failures.length > 0) {
  console.error(`[seo:env:check] FAILED (strict=${strict ? 'on' : 'off'})`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`[seo:env:check] PASSED (strict=${strict ? 'on' : 'off'})`);
for (const check of checks) {
  console.log(`- ${check}`);
}
for (const warning of warnings) {
  console.log(`- WARN: ${warning}`);
}
