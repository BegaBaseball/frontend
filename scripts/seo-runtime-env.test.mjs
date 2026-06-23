import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import {
  formatSeoEnvSource,
  readSeoRuntimeEnvValue,
} from './seo-runtime-env.mjs';

const makeEnvRoots = () => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-env-root-'));
  const frontendRoot = path.join(repoRoot, 'bega_frontend');
  fs.mkdirSync(frontendRoot, { recursive: true });
  return { repoRoot, frontendRoot };
};

test('SEO runtime env prefers process values over file fallback values', () => {
  const { repoRoot, frontendRoot } = makeEnvRoots();
  fs.writeFileSync(
    path.join(frontendRoot, '.env.prod'),
    'VITE_GOOGLE_SITE_VERIFICATION=file-google-token\n',
    'utf-8',
  );

  const result = readSeoRuntimeEnvValue('VITE_GOOGLE_SITE_VERIFICATION', {
    env: { VITE_GOOGLE_SITE_VERIFICATION: 'process-google-token' },
    frontendRoot,
    repoRoot,
  });

  assert.deepEqual(result, {
    value: 'process-google-token',
    source: 'process',
  });
});

test('SEO runtime env reads repo root .env.prod fallback without exposing the value in source labels', () => {
  const { repoRoot, frontendRoot } = makeEnvRoots();
  fs.writeFileSync(
    path.join(repoRoot, '.env.prod'),
    'VITE_NAVER_SITE_VERIFICATION=repo-naver-token\n',
    'utf-8',
  );

  const result = readSeoRuntimeEnvValue('VITE_NAVER_SITE_VERIFICATION', {
    env: {},
    frontendRoot,
    repoRoot,
  });

  assert.equal(result.value, 'repo-naver-token');
  assert.equal(result.source, 'file-fallback');
  assert.equal(formatSeoEnvSource(result.source), '.env/.env.prod fallback');
  assert.equal(formatSeoEnvSource(result.source).includes(result.value), false);
});

test('SEO runtime env does not let frontend development .env override repo root .env.prod', () => {
  const { repoRoot, frontendRoot } = makeEnvRoots();
  fs.writeFileSync(
    path.join(frontendRoot, '.env'),
    'VITE_API_BASE_URL=/api\n',
    'utf-8',
  );
  fs.writeFileSync(
    path.join(repoRoot, '.env.prod'),
    'VITE_API_BASE_URL=https://api.begabaseball.xyz\n',
    'utf-8',
  );

  const result = readSeoRuntimeEnvValue('VITE_API_BASE_URL', {
    env: {},
    frontendRoot,
    repoRoot,
  });

  assert.deepEqual(result, {
    value: 'https://api.begabaseball.xyz',
    source: 'file-fallback',
  });
});
