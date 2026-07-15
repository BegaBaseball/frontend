import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  assertGeneratedTypesMatch,
  assertSchemaSourceExists,
  resolveSchemaSource,
} from './openapi-types-lib.mjs';

const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const schemaSource = resolveSchemaSource();
const outputPath = resolve(process.cwd(), 'src/api/generated/openapi.ts');
const binPath = resolve(process.cwd(), 'node_modules/.bin/openapi-typescript');

const runGenerator = (targetPath) => {
  try {
    assertSchemaSourceExists(schemaSource);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  mkdirSync(dirname(targetPath), { recursive: true });
  const result = spawnSync(binPath, [schemaSource, '--output', targetPath], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status ?? 1);
  }
};

if (!checkOnly) {
  runGenerator(outputPath);
  process.stdout.write(`Generated OpenAPI types: ${outputPath}\n`);
  process.exit(0);
}

const tempDir = mkdtempSync(resolve(tmpdir(), 'bega-openapi-'));
const tempPath = resolve(tempDir, 'openapi.ts');

try {
  runGenerator(tempPath);
  const current = readFileSync(outputPath, 'utf8');
  const generated = readFileSync(tempPath, 'utf8');

  try {
    assertGeneratedTypesMatch(current, generated);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  process.stdout.write('OpenAPI generated types are up to date.\n');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
