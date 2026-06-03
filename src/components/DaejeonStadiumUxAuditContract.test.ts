import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const projectRoot = process.cwd();
const auditSource = fs.readFileSync(
  path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
  'utf8',
);

const requiredProblemBlockIds = [
  'central-table-100__100a',
  'central-table-100__100b',
  'central-table-100__100c',
  'first-infield-b-101-108__104',
  'first-infield-b-101-108__105',
  'first-infield-b-101-108__106',
  'first-infield-b-101-108__107',
  'first-infield-b-101-108__108',
  'first-infield-a-109-112-201-212__109',
  'first-infield-a-109-112-201-212__110',
  'third-infield-a-113-120-213-225__116',
  'third-infield-a-113-120-213-225__117',
  'third-infield-a-113-120-213-225__118',
  'third-infield-a-113-120-213-225__119',
  'third-infield-a-113-120-213-225__120',
  'third-infield-b-121-124__121',
  'third-infield-b-121-124__122',
];

const requiredHitAreaContractBlockIds = [
  ...requiredProblemBlockIds,
  'outfield-reserved-509__509',
  'splash-jacuzzi-425__425',
  'splash-caravan-426__426',
];

const requiredRepresentativeCoordinateChecks = [
  { blockId: 'central-table-100__100a', code: '100A' },
  { blockId: 'central-table-100__100b', code: '100B' },
  { blockId: 'central-table-100__100c', code: '100C' },
  { blockId: 'first-infield-b-101-108__104', code: '104' },
  { blockId: 'first-infield-b-101-108__105', code: '105' },
  { blockId: 'first-infield-b-101-108__106', code: '106' },
  { blockId: 'first-infield-b-101-108__107', code: '107' },
  { blockId: 'first-infield-b-101-108__108', code: '108' },
  { blockId: 'first-infield-a-109-112-201-212__109', code: '109' },
  { blockId: 'first-infield-a-109-112-201-212__110', code: '110' },
  { blockId: 'third-infield-a-113-120-213-225__115', code: '115' },
  { blockId: 'third-infield-a-113-120-213-225__116', code: '116' },
  { blockId: 'third-infield-a-113-120-213-225__117', code: '117' },
  { blockId: 'third-infield-a-113-120-213-225__118', code: '118' },
  { blockId: 'third-infield-a-113-120-213-225__119', code: '119' },
  { blockId: 'third-infield-a-113-120-213-225__120', code: '120' },
  { blockId: 'third-infield-b-121-124__121', code: '121' },
  { blockId: 'third-infield-b-121-124__122', code: '122' },
  { blockId: 'third-infield-b-121-124__124', code: '124' },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractStringArray(source: string, variableName: string): string[] {
  const match = source.match(new RegExp(`const\\s+${variableName}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
  assert.ok(match, `${variableName} should be declared as a const array`);

  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1]);
}

function assertIncludesAll(actual: string[], expected: string[], label: string): void {
  const missing = expected.filter((value) => !actual.includes(value));
  assert.deepEqual(missing, [], `${label} is missing required Daejeon block ids`);
}

function assertRepresentativeCoordinateEntry(blockId: string, code: string): void {
  const pattern = new RegExp(
    `\\{\\s*blockId:\\s*'${escapeRegExp(blockId)}',\\s*code:\\s*'${escapeRegExp(code)}'\\s*\\}`,
  );
  assert.match(
    auditSource,
    pattern,
    `representativeCoordinateBlockChecks should include ${blockId} (${code})`,
  );
}

test('Daejeon UX audit keeps hover and selected hit-area checks for corrected blocks', () => {
  const blockIds = extractStringArray(auditSource, 'daejeonHoverSelectedContractBlockIds');

  assertIncludesAll(blockIds, requiredHitAreaContractBlockIds, 'daejeonHoverSelectedContractBlockIds');
  assert.ok(
    auditSource.includes('for (const blockId of daejeonHoverSelectedContractBlockIds)'),
    'Daejeon hit-area contract should run through the explicit block id list',
  );
  assert.ok(
    auditSource.includes('await verifyDaejeonHitAreaContract(blockId);'),
    'Daejeon hit-area contract should verify every listed block id',
  );
});

test('Daejeon UX audit keeps label top-hit boundary sweep for corrected blocks', () => {
  const blockIds = extractStringArray(auditSource, 'requiredBoundaryIds');

  assertIncludesAll(blockIds, requiredProblemBlockIds, 'requiredBoundaryIds');
});

test('Daejeon UX audit keeps representative coordinate clicks for corrected blocks', () => {
  for (const check of requiredRepresentativeCoordinateChecks) {
    assertRepresentativeCoordinateEntry(check.blockId, check.code);
  }
});
