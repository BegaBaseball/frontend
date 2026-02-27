const args = process.argv.slice(2);
const strict = args.includes('--strict');

const requiredEnvKeys = [
  'VITE_SITE_URL',
];

const recommendedEnvKeys = [
  'VITE_GA4_MEASUREMENT_ID',
  'VITE_GOOGLE_SITE_VERIFICATION',
  'VITE_NAVER_SITE_VERIFICATION',
];

const failures = [];
const warnings = [];
const checks = [];

for (const key of requiredEnvKeys) {
  const value = String(process.env[key] || '').trim();
  if (!value) {
    failures.push(`필수 env 누락: ${key}`);
  } else {
    checks.push(`필수 env 확인: ${key}`);
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
