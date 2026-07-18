import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  assertGeneratedTypesMatch,
  assertSchemaSourceExists,
  resolveSchemaSource,
} from './openapi-types-lib.mjs';

test('resolveSchemaSource uses the committed backend contract by default', () => {
  const cwd = resolve('/workspace', 'bega_frontend');

  assert.equal(
    resolveSchemaSource({ cwd, env: {} }),
    resolve(cwd, '../bega_backend/BEGA_PROJECT/contracts/openapi.json'),
  );
});

test('resolveSchemaSource preserves an explicit runtime URL override', () => {
  assert.equal(
    resolveSchemaSource({
      cwd: '/workspace/bega_frontend',
      env: { OPENAPI_SCHEMA_URL: ' http://127.0.0.1:18080/v3/api-docs ' },
    }),
    'http://127.0.0.1:18080/v3/api-docs',
  );
});

test('assertSchemaSourceExists fails closed for a missing canonical file', () => {
  const tempDir = mkdtempSync(resolve(tmpdir(), 'bega-openapi-source-'));
  const missingPath = resolve(tempDir, 'missing.json');

  try {
    assert.throws(
      () => assertSchemaSourceExists(missingPath),
      /Backend OpenAPI contract not found/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test('assertSchemaSourceExists accepts explicit HTTP sources without local file checks', () => {
  assert.doesNotThrow(() => assertSchemaSourceExists('https://example.com/v3/api-docs'));
});

test('assertGeneratedTypesMatch accepts identical output and rejects drift', () => {
  assert.doesNotThrow(() => assertGeneratedTypesMatch('generated\n', 'generated\n'));
  assert.throws(
    () => assertGeneratedTypesMatch('current\n', 'generated\n'),
    /OpenAPI generated types are out of date/,
  );
});
