import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  computeSha256,
  syncAiStreamContract,
} from './sync-ai-stream-contract.mjs';
import { generateAiStreamTypes } from './generate-ai-stream-types.mjs';


test('computeSha256 returns a stable lowercase digest', () => {
  assert.equal(
    computeSha256(Buffer.from('bega-ai-stream-v2')),
    '03d0f311f3b1e21c397845997770f1ed65cd57ef0bd2fa3a871cf9fc41f891c0',
  );
});


test('syncAiStreamContract copies exact bytes and records source metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bega-ai-contract-'));
  const sourcePath = join(directory, 'source.json');
  const contractPath = join(directory, 'vendored.json');
  const metadataPath = join(directory, 'metadata.json');
  const source = Buffer.from('{"openapi":"3.1.0"}\n');
  writeFileSync(sourcePath, source);

  try {
    const metadata = syncAiStreamContract({
      sourcePath,
      contractPath,
      metadataPath,
    });

    assert.deepEqual(readFileSync(contractPath), source);
    assert.equal(metadata.source_repository, 'BegaBaseball/AI');
    assert.equal(metadata.schema_version, '2.0.0');
    assert.equal(metadata.sha256, computeSha256(source));
    assert.deepEqual(
      JSON.parse(readFileSync(metadataPath, 'utf8')),
      metadata,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});


test('syncAiStreamContract rejects network sources', () => {
  assert.throws(
    () => syncAiStreamContract({
      sourcePath: 'https://example.com/ai-stream-v2.openapi.json',
      contractPath: '/tmp/unused-contract.json',
      metadataPath: '/tmp/unused-metadata.json',
    }),
    /local filesystem path/,
  );
});


test('generateAiStreamTypes writes types and detects stale output', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bega-ai-types-'));
  const schemaPath = join(directory, 'schema.json');
  const outputPath = join(directory, 'generated.ts');
  writeFileSync(schemaPath, JSON.stringify({
    openapi: '3.1.0',
    info: { title: 'test', version: '1.0.0' },
    paths: {},
    components: {
      schemas: {
        Ping: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            message: {
              anyOf: [{ type: 'string' }, { type: 'null' }],
              default: null,
            },
          },
        },
      },
    },
  }));

  try {
    generateAiStreamTypes({ schemaPath, outputPath, checkOnly: false });
    const generated = readFileSync(outputPath, 'utf8');
    assert.match(generated, /Ping/);
    assert.match(generated, /message\?: string \| null/);
    generateAiStreamTypes({ schemaPath, outputPath, checkOnly: true });

    writeFileSync(outputPath, 'stale\n');
    assert.throws(
      () => generateAiStreamTypes({ schemaPath, outputPath, checkOnly: true }),
      /out of date/,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
