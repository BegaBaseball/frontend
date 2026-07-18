import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_SOURCE_PATH = resolve(process.cwd(), '../bega_AI/contracts/ai-stream-v2.openapi.json');
const DEFAULT_CONTRACT_PATH = resolve(process.cwd(), 'contracts/ai-stream-v2.openapi.json');
const DEFAULT_METADATA_PATH = resolve(process.cwd(), 'contracts/ai-stream-v2.metadata.json');

export const computeSha256 = (value) => createHash('sha256').update(value).digest('hex');

const assertLocalPath = (path) => {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) {
    throw new Error('AI stream contract source must be a local filesystem path.');
  }
};

const readSchemaVersion = (contractBytes) => {
  let document;
  try {
    document = JSON.parse(contractBytes.toString('utf8'));
  } catch {
    throw new Error('AI stream contract source must be valid JSON with info.version.');
  }

  if (
    typeof document !== 'object'
    || document === null
    || Array.isArray(document)
    || typeof document.info !== 'object'
    || document.info === null
    || Array.isArray(document.info)
    || typeof document.info.version !== 'string'
    || document.info.version.length === 0
  ) {
    throw new Error('AI stream contract source must include a non-empty info.version.');
  }

  return document.info.version;
};

export const syncAiStreamContract = ({
  sourcePath = DEFAULT_SOURCE_PATH,
  contractPath = DEFAULT_CONTRACT_PATH,
  metadataPath = DEFAULT_METADATA_PATH,
} = {}) => {
  assertLocalPath(sourcePath);
  const contractBytes = readFileSync(resolve(sourcePath));
  const schemaVersion = readSchemaVersion(contractBytes);
  const metadata = {
    source_repository: 'BegaBaseball/AI',
    schema_version: schemaVersion,
    sha256: computeSha256(contractBytes),
  };

  mkdirSync(dirname(resolve(contractPath)), { recursive: true });
  mkdirSync(dirname(resolve(metadataPath)), { recursive: true });
  writeFileSync(resolve(contractPath), contractBytes);
  writeFileSync(resolve(metadataPath), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  return metadata;
};

const parseSourceArg = (args) => {
  const sourceIndex = args.indexOf('--source');
  if (sourceIndex === -1) return DEFAULT_SOURCE_PATH;
  const sourcePath = args[sourceIndex + 1];
  if (!sourcePath) throw new Error('--source requires a local filesystem path.');
  return sourcePath;
};

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const sourcePath = parseSourceArg(process.argv.slice(2));
  const metadata = syncAiStreamContract({ sourcePath });
  process.stdout.write(`Synced AI stream contract sha256=${metadata.sha256}\n`);
}
