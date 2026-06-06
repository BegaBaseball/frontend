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
  'skybox-s01-s37__s01',
  'skybox-s01-s37__s31',
  'first-table-4f-301-413__301',
  'first-table-4f-301-413__302',
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
  { blockId: 'first-table-4f-301-413__301', code: '301' },
  { blockId: 'first-table-4f-301-413__302', code: '302' },
  { blockId: 'skybox-s01-s37__s31', code: 'S31' },
];

const requiredExactSearchDetailContracts = [
  { term: '301', blockId: 'first-table-4f-301-413__301', detail: '내야 탁자석(4층)', block: '301', level: '4F' },
  { term: '302', blockId: 'first-table-4f-301-413__302', detail: '내야 탁자석(4층)', block: '302', level: '4F' },
  { term: 'S01', blockId: 'skybox-s01-s37__s01', detail: '스카이박스', block: 'S01', level: '4F' },
  { term: 'S31', blockId: 'skybox-s01-s37__s31', detail: '스카이박스', block: 'S31', level: '4F' },
];

const requiredSmallBlockEdgeSamples = [
  { blockId: 'first-table-4f-301-413__301', points: ['[778, 463]', '[801, 482]', '[781, 488]'] },
  { blockId: 'first-table-4f-301-413__302', points: ['[756, 514]', '[798, 506]', '[782, 528]'] },
];

const requiredSkyboxSweepBlockIds = Array.from({ length: 31 }, (_, index) => (
  `skybox-s01-s37__s${String(index + 1).padStart(2, '0')}`
));

const requiredSkyboxClickDetailContracts = [
  { blockId: 'skybox-s01-s37__s01', block: 'S01' },
  { blockId: 'skybox-s01-s37__s12', block: 'S12' },
  { blockId: 'skybox-s01-s37__s13', block: 'S13' },
  { blockId: 'skybox-s01-s37__s25', block: 'S25' },
  { blockId: 'skybox-s01-s37__s26', block: 'S26' },
  { blockId: 'skybox-s01-s37__s31', block: 'S31' },
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

function assertExactSearchDetailEntry(contract: typeof requiredExactSearchDetailContracts[number]): void {
  const pattern = new RegExp(
    `\\{\\s*term:\\s*'${escapeRegExp(contract.term)}',\\s*blockId:\\s*'${escapeRegExp(contract.blockId)}',\\s*detail:\\s*'${escapeRegExp(contract.detail)}',\\s*block:\\s*'${escapeRegExp(contract.block)}',\\s*level:\\s*'${escapeRegExp(contract.level)}'\\s*\\}`,
  );
  assert.match(
    auditSource,
    pattern,
    `daejeonExactSearchDetailContracts should include ${contract.term} -> ${contract.blockId}`,
  );
}

function assertSkyboxClickDetailEntry(blockId: string, block: string): void {
  const pattern = new RegExp(
    `\\{\\s*blockId:\\s*'${escapeRegExp(blockId)}',\\s*detail:\\s*'스카이박스',\\s*block:\\s*'${escapeRegExp(block)}',\\s*level:\\s*'4F'\\s*\\}`,
  );
  assert.match(
    auditSource,
    pattern,
    `daejeonSkyboxClickDetailContracts should include ${blockId} (${block})`,
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

test('Daejeon UX audit keeps exact search/detail contracts for 301/302 and skybox edges', () => {
  assert.ok(
    auditSource.includes('const daejeonExactSearchDetailContracts = ['),
    'Daejeon exact search detail contract list should stay explicit',
  );
  assert.ok(
    auditSource.includes('await verifyDaejeonExactSearchDetailContract(contract);'),
    'Daejeon exact search detail contracts should be executed',
  );

  for (const contract of requiredExactSearchDetailContracts) {
    assertExactSearchDetailEntry(contract);
  }
});

test('Daejeon UX audit keeps small-block edge hover/click contracts', () => {
  assert.ok(
    auditSource.includes('const readDaejeonTopHitAtSvgPoint = async'),
    'Daejeon edge QA should read SVG top-hit at the sample point',
  );
  assert.ok(
    auditSource.includes('const verifyDaejeonEdgeHoverClickContract = async'),
    'Daejeon edge QA should verify hover and click from edge samples',
  );
  assert.ok(
    auditSource.includes('const daejeonSmallBlockEdgeHitContracts = ['),
    'Daejeon 301/302 edge hit contracts should stay explicit',
  );

  for (const contract of requiredSmallBlockEdgeSamples) {
    assert.ok(
      auditSource.includes(`blockId: '${contract.blockId}'`),
      `${contract.blockId} edge contract should be present`,
    );
    for (const point of contract.points) {
      assert.ok(
        auditSource.includes(point),
        `${contract.blockId} edge contract should include ${point}`,
      );
    }
  }
});

test('Daejeon UX audit keeps S01-S31 skybox runtime hit-area lock', () => {
  const blockIds = extractStringArray(auditSource, 'daejeonSkyboxHitAreaSweepBlockIds');

  assertIncludesAll(blockIds, requiredSkyboxSweepBlockIds, 'daejeonSkyboxHitAreaSweepBlockIds');
  assert.ok(
    auditSource.includes('const readDaejeonSkyboxTransparentEdgeSamples = async'),
    'Daejeon skybox QA should compute transparent edge samples in the browser SVG',
  );
  assert.ok(
    auditSource.includes('daejeonSkyboxEdgeSampleRows.length !== 31'),
    'Daejeon skybox QA should fail if the S01-S31 sweep count changes',
  );
  assert.ok(
    auditSource.includes('const daejeonS31ExcludedPointContracts = ['),
    'Daejeon S31 should keep explicit S32 excluded-point contracts',
  );
  assert.ok(auditSource.includes("[302, 799]"), 'Daejeon S31 should exclude S32 label point');
  assert.ok(auditSource.includes("[300, 800.3]"), 'Daejeon S31 should exclude S32 center point');

  for (const contract of requiredSkyboxClickDetailContracts) {
    assertSkyboxClickDetailEntry(contract.blockId, contract.block);
  }
});
