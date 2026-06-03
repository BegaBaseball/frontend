import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const sourcePath = path.join(frontendRoot, 'src/data/gocheokOperatorVisitGuide.ts');
const columns = [
  'recordType',
  'stadium',
  'sourceDocumentId',
  'lastUpdatedAt',
  'pointId',
  'kind',
  'label',
  'blockId',
  'recommendedEntrancePointIds',
  'nearbyFacilityPointIds',
  'cautionNotes',
  'noticeId',
  'validFrom',
  'validTo',
  'priority',
  'affectedBlockIds',
  'message',
];

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeOperatorCsv = async (filePath, rows) => {
  const content = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sha256File = async (filePath) => createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

const makeTempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'gocheok-operator-gate-'));

const runGate = (task, args = []) => spawnSync(
  process.execPath,
  ['--import', 'tsx', 'scripts/gocheok-seatmap-ops.mjs', task, ...args],
  {
    cwd: frontendRoot,
    encoding: 'utf8',
  },
);

const validRows = () => [
  {
    recordType: 'facility',
    stadium: 'GOCHEOK',
    sourceDocumentId: 'gocheok-operator-20260529-valid-guide',
    lastUpdatedAt: '2026-05-29',
    pointId: 'gocheok-facility-entrance-main',
    kind: 'ENTRANCE',
    label: '운영자 제공 1루 출입구',
  },
  {
    recordType: 'facility',
    stadium: 'GOCHEOK',
    sourceDocumentId: 'gocheok-operator-20260529-valid-guide',
    lastUpdatedAt: '2026-05-29',
    pointId: 'gocheok-facility-concession-main',
    kind: 'CONCESSION',
    label: '운영자 제공 내야 매점',
  },
  {
    recordType: 'facility',
    stadium: 'GOCHEOK',
    sourceDocumentId: 'gocheok-operator-20260529-valid-guide',
    lastUpdatedAt: '2026-05-29',
    pointId: 'gocheok-facility-shop-heroes-shop',
    kind: 'SHOP',
    label: '히어로즈샵',
  },
  {
    recordType: 'block',
    stadium: 'GOCHEOK',
    sourceDocumentId: 'gocheok-operator-20260529-valid-guide',
    lastUpdatedAt: '2026-05-29',
    blockId: 'gocheok-d04',
    recommendedEntrancePointIds: 'gocheok-facility-entrance-main',
    nearbyFacilityPointIds: 'gocheok-facility-concession-main',
    cautionNotes: '현장 최종 안내 확인',
  },
  {
    recordType: 'notice',
    stadium: 'GOCHEOK',
    sourceDocumentId: 'gocheok-operator-20260529-valid-notice',
    lastUpdatedAt: '2026-05-29',
    noticeId: 'gocheok-operation-notice-20260529-main',
    validFrom: '2026-05-29',
    validTo: '2026-05-30',
    priority: '100',
    affectedBlockIds: 'gocheok-d04',
    message: '운영자 제공 임시 동선 공지',
  },
];

test('고척 운영자 입력 게이트는 유효 fixture를 ready_for_manual_apply로 정규화하고 source file을 쓰지 않는다', async () => {
  const outDir = await makeTempDir();
  const inputPath = path.join(outDir, 'valid.csv');
  await writeOperatorCsv(inputPath, validRows());
  const beforeHash = await sha256File(sourcePath);

  const validate = runGate('operator-validate', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'gocheok-operator-visit-guide-validation.json'));
  assert.equal(validation.status, 'ready_for_manual_apply');
  assert.equal(validation.normalizedData.facilityPoints.length, 3);
  assert.equal(validation.normalizedData.blockGuidance.length, 1);
  assert.equal(validation.normalizedData.operationNotices.length, 1);
  assert.equal(validation.sourceDataWritePerformed, false);

  const applyPlan = runGate('operator-apply-plan', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const plan = await readJson(path.join(outDir, 'gocheok-operator-visit-guide-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'gocheok-operator-visit-guide-apply-plan.ts-fragment'), 'utf8');

  assert.equal(plan.status, 'ready_for_manual_apply');
  assert.equal(plan.sourceDataWritePerformed, false);
  assert.match(fragment, /GOCHEOK_OPERATOR_FACILITY_POINTS/);
  assert.match(fragment, /GOCHEOK_BLOCK_VISIT_GUIDANCE/);
  assert.match(fragment, /GOCHEOK_OPERATION_NOTICES/);
  assert.match(fragment, /gocheok-facility-entrance-main/);
  assert.match(fragment, /gocheok-facility-shop-heroes-shop/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('고척 operator-template placeholder 입력은 waiting_for_operator 상태로 남고 source file을 쓰지 않는다', async () => {
  const outDir = await makeTempDir();
  const inputPath = path.join(outDir, 'placeholder.csv');
  const beforeHash = await sha256File(sourcePath);

  const template = runGate('operator-template', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(template.status, 0, template.stderr || template.stdout);

  const validate = runGate('operator-validate', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'gocheok-operator-visit-guide-validation.json'));
  assert.equal(validation.status, 'waiting_for_operator');
  assert.equal(validation.sourceDataWritePerformed, false);

  const applyPlan = runGate('operator-apply-plan', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const plan = await readJson(path.join(outDir, 'gocheok-operator-visit-guide-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'gocheok-operator-visit-guide-apply-plan.ts-fragment'), 'utf8');
  assert.equal(plan.status, 'waiting_for_operator');
  assert.match(fragment, /No operator-provided data is ready/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('고척 operator-validate는 잘못된 운영자 입력을 blocker로 차단한다', async () => {
  const outDir = await makeTempDir();
  const inputPath = path.join(outDir, 'invalid.csv');
  await writeOperatorCsv(inputPath, [
    {
      recordType: 'facility',
      stadium: 'GOCHEOK',
      sourceDocumentId: 'gocheok-operator-20260529-invalid-guide',
      lastUpdatedAt: '2026-05-29',
      pointId: 'bad-facility-id',
      kind: 'ENTRANCE',
      label: 'https://example.com forbidden source',
    },
    {
      recordType: 'block',
      stadium: 'GOCHEOK',
      sourceDocumentId: 'gocheok-operator-20260529-invalid-guide',
      lastUpdatedAt: '2026-05-29',
      blockId: 'gocheok-unknown',
    },
    {
      recordType: 'block',
      stadium: 'GOCHEOK',
      sourceDocumentId: 'gocheok-operator-20260529-invalid-guide',
      lastUpdatedAt: '2026-05-29',
      blockId: 'gocheok-d04',
      recommendedEntrancePointIds: 'gocheok-facility-entrance-missing',
    },
    {
      recordType: 'facility',
      stadium: 'GOCHEOK',
      sourceDocumentId: 'gocheok-operator-20260529-invalid-guide',
      lastUpdatedAt: '2026-05-29',
      pointId: 'gocheok-facility-concession-shop-mismatch',
      kind: 'SHOP',
      label: '운영자 제공 굿즈샵',
    },
    {
      recordType: 'notice',
      stadium: 'GOCHEOK',
      sourceDocumentId: 'gocheok-operator-20260529-invalid-notice',
      lastUpdatedAt: '2026-05-29',
      noticeId: 'bad-notice-id',
      validFrom: '2026-05-30',
      validTo: '2026-05-29',
      priority: 'urgent',
      affectedBlockIds: 'gocheok-d04',
      message: '운영자 제공 공지',
    },
  ]);

  const validate = runGate('operator-validate', ['--input', inputPath, '--out-dir', outDir]);
  assert.notEqual(validate.status, 0, validate.stdout);
  const validation = await readJson(path.join(outDir, 'gocheok-operator-visit-guide-validation.json'));
  const blockers = validation.blockers.join('\n');

  assert.equal(validation.status, 'blocked');
  assert.match(blockers, /INVALID_FACILITY_POINT_ID/);
  assert.match(blockers, /FORBIDDEN_OPERATOR_DATA/);
  assert.match(blockers, /UNKNOWN_BLOCK_ID/);
  assert.match(blockers, /MISSING_FACILITY_REFERENCE/);
  assert.match(blockers, /FACILITY_ID_KIND_MISMATCH/);
  assert.match(blockers, /INVALID_OPERATION_NOTICE_ID/);
  assert.match(blockers, /INVALID_NOTICE_DATE_RANGE/);
  assert.match(blockers, /INVALID_NOTICE_PRIORITY/);
  assert.equal(validation.sourceDataWritePerformed, false);
});
