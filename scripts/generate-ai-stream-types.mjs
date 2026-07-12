import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { computeSha256 } from './sync-ai-stream-contract.mjs';

const DEFAULT_SCHEMA_PATH = resolve(process.cwd(), 'contracts/ai-stream-v2.openapi.json');
const DEFAULT_METADATA_PATH = resolve(process.cwd(), 'contracts/ai-stream-v2.metadata.json');
const DEFAULT_OUTPUT_PATH = resolve(process.cwd(), 'src/api/generated/aiStreamV2.ts');
const GENERATOR_PATH = resolve(process.cwd(), 'node_modules/.bin/openapi-typescript');

const generateTo = (schemaPath, outputPath) => {
  mkdirSync(dirname(outputPath), { recursive: true });
  const result = spawnSync(
    GENERATOR_PATH,
    [
      resolve(schemaPath),
      '--output',
      resolve(outputPath),
      '--default-non-nullable',
      'false',
    ],
    { encoding: 'utf8', stdio: 'pipe' },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'openapi-typescript failed');
  }
};

export const generateAiStreamTypes = ({
  schemaPath = DEFAULT_SCHEMA_PATH,
  metadataPath = DEFAULT_METADATA_PATH,
  outputPath = DEFAULT_OUTPUT_PATH,
  checkOnly = false,
} = {}) => {
  if (!checkOnly) {
    generateTo(schemaPath, outputPath);
    return;
  }

  const directory = mkdtempSync(resolve(tmpdir(), 'bega-ai-stream-types-'));
  const temporaryOutput = resolve(directory, 'aiStreamV2.ts');
  try {
    const metadata = JSON.parse(readFileSync(resolve(metadataPath), 'utf8'));
    const actualSha256 = computeSha256(readFileSync(resolve(schemaPath)));
    if (metadata.sha256 !== actualSha256) {
      throw new Error(
        'AI stream contract metadata SHA-256 does not match the vendored contract.',
      );
    }
    generateTo(schemaPath, temporaryOutput);
    const current = readFileSync(resolve(outputPath), 'utf8');
    const generated = readFileSync(temporaryOutput, 'utf8');
    if (current !== generated) {
      throw new Error(
        'Generated AI stream types are out of date. Run npm run api:ai-stream:types.',
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const checkOnly = process.argv.slice(2).includes('--check');
  generateAiStreamTypes({ checkOnly });
  process.stdout.write(
    checkOnly
      ? 'Generated AI stream types are current.\n'
      : `Generated AI stream types: ${DEFAULT_OUTPUT_PATH}\n`,
  );
}
