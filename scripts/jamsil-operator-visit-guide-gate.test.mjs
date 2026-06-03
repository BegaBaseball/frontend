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
const sourcePath = path.join(frontendRoot, 'src/data/jamsilOperatorVisitGuide.ts');
const foodCandidateReviewPath = path.join(frontendRoot, 'docs/stadium/jamsil-food-candidate-review.csv');
const restroomCandidateReviewPath = path.join(frontendRoot, 'docs/stadium/jamsil-restroom-candidate-review.csv');
const columns = [
  'recordType',
  'stadium',
  'sourceDocumentId',
  'lastUpdatedAt',
  'pointId',
  'kind',
  'label',
  'floor',
  'side',
  'nearSectionIds',
  'locationText',
  'openStatus',
  'accessible',
  'walkingMinutes',
  'verificationStatus',
  'blockId',
  'recommendedEntrancePointIds',
  'nearbyFacilityPointIds',
  'cautionNotes',
  'noticeId',
  'validFrom',
  'validTo',
  'priority',
  'teamContext',
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

const foodOperatorReviewColumns = [
  'operatorFacilityId',
  'operatorNearSectionIds',
  'operatorLocationText',
  'operatorOpenStatus',
  'operatorAccessible',
  'operatorWalkingMinutes',
  'operatorVerificationStatus',
  'reviewerNote',
];

const toCandidateOnlyFoodRow = (row) => {
  const nextRow = { ...row };
  foodOperatorReviewColumns.forEach((column) => {
    nextRow[column] = '';
  });
  return nextRow;
};

const writeFoodCandidateReviewCsv = async (filePath, mutateFirstRow) => {
  const source = await fs.readFile(foodCandidateReviewPath, 'utf8');
  const [header, ...rows] = source.trim().split(/\r?\n/);
  const reviewColumns = header.split(',');
  const nextRows = rows.map((rowText, index) => {
    const rowValues = rowText.split(',');
    const row = toCandidateOnlyFoodRow(Object.fromEntries(reviewColumns.map((column, columnIndex) => [column, rowValues[columnIndex] ?? ''])));
    const nextRow = index === 0 ? mutateFirstRow({ ...row }) : row;
    return reviewColumns.map((column) => csvEscape(nextRow[column])).join(',');
  });

  await fs.writeFile(filePath, `${header}\n${nextRows.join('\n')}\n`, 'utf8');
};

const writeFoodCandidateReviewCsvRows = async (filePath, mutateRowsByIndex) => {
  const source = await fs.readFile(foodCandidateReviewPath, 'utf8');
  const [header, ...rows] = source.trim().split(/\r?\n/);
  const reviewColumns = header.split(',');
  const nextRows = rows.map((rowText, index) => {
    const rowValues = rowText.split(',');
    const row = toCandidateOnlyFoodRow(Object.fromEntries(reviewColumns.map((column, columnIndex) => [column, rowValues[columnIndex] ?? ''])));
    const mutate = mutateRowsByIndex.get(index);
    const nextRow = mutate ? mutate({ ...row }) : row;
    return reviewColumns.map((column) => csvEscape(nextRow[column])).join(',');
  });

  await fs.writeFile(filePath, `${header}\n${nextRows.join('\n')}\n`, 'utf8');
};

const writeCandidateOnlyFoodReviewCsv = async (filePath) => writeFoodCandidateReviewCsvRows(filePath, new Map());

const restroomOperatorReviewColumns = [
  'operatorFacilityId',
  'operatorNearSectionIds',
  'operatorNearGateIds',
  'operatorLocationText',
  'operatorFloor',
  'operatorSide',
  'operatorOpenStatus',
  'operatorAccessible',
  'operatorWalkingMinutes',
  'operatorVerificationStatus',
  'reviewerNote',
];

const toCandidateOnlyRestroomRow = (row) => {
  const nextRow = { ...row };
  restroomOperatorReviewColumns.forEach((column) => {
    nextRow[column] = '';
  });
  return nextRow;
};

const writeRestroomCandidateReviewCsvRows = async (filePath, mutateRowsByIndex) => {
  const source = await fs.readFile(restroomCandidateReviewPath, 'utf8');
  const [header, ...rows] = source.trim().split(/\r?\n/);
  const reviewColumns = header.split(',');
  const nextRows = rows.map((rowText, index) => {
    const rowValues = rowText.split(',');
    const row = toCandidateOnlyRestroomRow(Object.fromEntries(reviewColumns.map((column, columnIndex) => [column, rowValues[columnIndex] ?? ''])));
    const mutate = mutateRowsByIndex.get(index);
    const nextRow = mutate ? mutate({ ...row }, index) : row;
    return reviewColumns.map((column) => csvEscape(nextRow[column])).join(',');
  });

  await fs.writeFile(filePath, `${header}\n${nextRows.join('\n')}\n`, 'utf8');
};

const writeCandidateOnlyRestroomReviewCsv = async (filePath) => writeRestroomCandidateReviewCsvRows(filePath, new Map());

const completeRestroomCandidateRow = (row, index) => {
  const suffix = String(index + 2).padStart(3, '0');
  return {
    ...row,
    operatorFacilityId: `jamsil-facility-restroom-fixture-${suffix}`,
    operatorNearSectionIds: row.candidateNearSectionIds || 'block-101',
    operatorNearGateIds: row.candidateNearGateIds,
    operatorLocationText: row.candidateLocationText || `${row.candidateFacilityName} 운영자 확인 위치`,
    operatorFloor: row.candidateFloor || 'UNKNOWN',
    operatorSide: row.candidateSide || 'UNKNOWN',
    operatorOpenStatus: 'UNKNOWN',
    operatorAccessible: 'UNKNOWN',
    operatorWalkingMinutes: 'UNKNOWN',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
    reviewerNote: 'operator restroom fixture',
  };
};

const fieldSurveyColumns = [
  'blockId',
  'blockLabel',
  'category',
  'level',
  'side',
  'operatorRestroomFacilityId',
  'operatorRestroomLocationText',
  'operatorRestroomFloor',
  'operatorRestroomSide',
  'operatorRestroomAccessible',
  'operatorSectionToRestroomMinutes',
  'operatorRestroomVerificationStatus',
  'operatorGateToSectionMinutes',
  'operatorSectionToFoodMinutes',
  'operatorWalkingVerificationStatus',
  'operatorGateCongestionLevel',
  'operatorConcourseCongestionLevel',
  'operatorFoodQueueLevel',
  'operatorRestroomQueueLevel',
  'operatorCongestionObservedAt',
  'operatorCongestionVerificationStatus',
  'reviewerNote',
];

const buildFieldSurveyRows = async () => {
  const { JAMSIL_BLOCKS } = await import('../src/data/jamsilSeatData.ts');
  return JAMSIL_BLOCKS.map((block) => ({
    blockId: block.id,
    blockLabel: block.block,
    category: block.category,
    level: block.level,
    side: block.side,
  }));
};

const writeFieldSurveyCsv = async (filePath, rows) => {
  const content = [
    fieldSurveyColumns.join(','),
    ...rows.map((row) => fieldSurveyColumns.map((column) => csvEscape(row[column])).join(',')),
  ].join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const completeFieldSurveyRow = (row) => {
  return {
    ...row,
    operatorRestroomFacilityId: 'jamsil-facility-restroom-public-stadium',
    operatorRestroomLocationText: `${row.blockLabel} 인근 운영자 확인 화장실`,
    operatorRestroomFloor: row.level,
    operatorRestroomSide: row.side,
    operatorRestroomAccessible: 'UNKNOWN',
    operatorSectionToRestroomMinutes: 'UNKNOWN',
    operatorRestroomVerificationStatus: 'OPERATOR_CONFIRMED',
    operatorGateToSectionMinutes: 'UNKNOWN',
    operatorSectionToFoodMinutes: 'UNKNOWN',
    operatorWalkingVerificationStatus: 'OPERATOR_CONFIRMED',
    operatorGateCongestionLevel: 'UNKNOWN',
    operatorConcourseCongestionLevel: 'UNKNOWN',
    operatorFoodQueueLevel: 'UNKNOWN',
    operatorRestroomQueueLevel: 'UNKNOWN',
    operatorCongestionObservedAt: '',
    operatorCongestionVerificationStatus: 'OPERATOR_CONFIRMED',
    reviewerNote: 'operator field survey fixture',
  };
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));

const sha256File = async (filePath) => createHash('sha256')
  .update(await fs.readFile(filePath))
  .digest('hex');

const makeTempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'jamsil-operator-gate-'));

const runGate = (task, args = []) => spawnSync(
  process.execPath,
  ['--import', 'tsx', 'scripts/jamsil-seatmap-ops.mjs', task, ...args],
  {
    cwd: frontendRoot,
    encoding: 'utf8',
  },
);

const prepareReadyFoodCandidatePacket = async (outDir) => {
  const readyPath = path.join(outDir, 'ready-food-review.csv');
  const restroomCandidateOnlyPath = path.join(outDir, 'candidate-only-restroom-review.csv');
  await writeFoodCandidateReviewCsv(readyPath, (row) => ({
    ...row,
    operatorFacilityId: 'jamsil-facility-concession-cafe-heeda',
    operatorNearSectionIds: 'block-117;block-118',
    operatorLocationText: '운영자 확인 1층 3루 외부 매점',
    operatorOpenStatus: 'OPEN',
    operatorAccessible: 'UNKNOWN',
    operatorWalkingMinutes: 'UNKNOWN',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
  }));
  await writeCandidateOnlyRestroomReviewCsv(restroomCandidateOnlyPath);

  const commonArgs = [
    '--review',
    readyPath,
    '--out-dir',
    outDir,
    '--source-document-id',
    'jamsil-operator-20260531-food-review',
    '--last-updated-at',
    '2026-05-31',
  ];
  const transfer = runGate('food-candidate-transfer', commonArgs);
  assert.equal(transfer.status, 0, transfer.stderr || transfer.stdout);
  const foodApplyPlan = runGate('food-candidate-apply-plan', commonArgs);
  assert.equal(foodApplyPlan.status, 0, foodApplyPlan.stderr || foodApplyPlan.stdout);

  const transferCsvPath = path.join(outDir, 'jamsil-food-candidate-intake-transfer.csv');
  const template = runGate('operator-template', ['--input', path.join(outDir, 'operator-input.csv'), '--out-dir', outDir]);
  assert.equal(template.status, 0, template.stderr || template.stdout);
  const validate = runGate('operator-validate', ['--input', transferCsvPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const applyPlan = runGate('operator-apply-plan', ['--input', transferCsvPath, '--review', readyPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const handoff = runGate('operator-handoff', [
    '--review',
    readyPath,
    '--restroom-review',
    restroomCandidateOnlyPath,
    '--out-dir',
    outDir,
  ]);
  assert.equal(handoff.status, 0, handoff.stderr || handoff.stdout);

  return { readyPath, restroomCandidateOnlyPath, transferCsvPath };
};

const prepareReadyFoodAndRestroomCandidatePacket = async (outDir) => {
  const food = await prepareReadyFoodCandidatePacket(outDir);
  const restroomReadyPath = path.join(outDir, 'ready-restroom-review.csv');
  await writeRestroomCandidateReviewCsvRows(restroomReadyPath, new Map([
    [0, (row) => ({
      ...completeRestroomCandidateRow(row, 0),
      operatorFacilityId: 'jamsil-facility-restroom-public-stadium',
      operatorNearSectionIds: 'block-117;block-118',
      operatorNearGateIds: 'JAMSIL_GATE_2_1',
      operatorLocationText: '운영자 확인 3루 외곽 화장실',
      operatorFloor: 'OUTSIDE',
      operatorSide: 'THIRD_BASE',
      operatorOpenStatus: '24_HOURS',
      operatorAccessible: 'YES',
      operatorWalkingMinutes: 'UNKNOWN',
    })],
  ]));

  const restroomArgs = [
    '--review',
    restroomReadyPath,
    '--out-dir',
    outDir,
    '--source-document-id',
    'jamsil-operator-20260601-restroom-review',
    '--last-updated-at',
    '2026-06-01',
  ];
  const restroomTransfer = runGate('restroom-candidate-transfer', restroomArgs);
  assert.equal(restroomTransfer.status, 0, restroomTransfer.stderr || restroomTransfer.stdout);
  const restroomApplyPlan = runGate('restroom-candidate-apply-plan', restroomArgs);
  assert.equal(restroomApplyPlan.status, 0, restroomApplyPlan.stderr || restroomApplyPlan.stdout);

  const handoff = runGate('operator-handoff', [
    '--review',
    food.readyPath,
    '--restroom-review',
    restroomReadyPath,
    '--out-dir',
    outDir,
  ]);
  assert.equal(handoff.status, 0, handoff.stderr || handoff.stdout);

  return { ...food, restroomReadyPath };
};

const validRows = () => [
  {
    recordType: 'facility',
    stadium: 'JAMSIL',
    sourceDocumentId: 'jamsil-operator-20260531-valid-guide',
    lastUpdatedAt: '2026-05-31',
    pointId: 'jamsil-facility-entrance-main',
    kind: 'ENTRANCE',
    label: '운영자 제공 1루 출입구',
  },
  {
    recordType: 'facility',
    stadium: 'JAMSIL',
    sourceDocumentId: 'jamsil-operator-20260531-valid-guide',
    lastUpdatedAt: '2026-05-31',
    pointId: 'jamsil-facility-concession-main',
    kind: 'CONCESSION',
    label: '운영자 제공 내야 매점',
    floor: '2',
    side: 'FIRST_BASE',
    nearSectionIds: 'block-101;block-102',
    locationText: '101블록 뒤 콘코스',
    openStatus: 'GAME_DAY_ONLY',
    accessible: 'UNKNOWN',
    walkingMinutes: 'UNKNOWN',
    verificationStatus: 'OPERATOR_CONFIRMED',
  },
  {
    recordType: 'block',
    stadium: 'JAMSIL',
    sourceDocumentId: 'jamsil-operator-20260531-valid-guide',
    lastUpdatedAt: '2026-05-31',
    blockId: 'block-101',
    recommendedEntrancePointIds: 'jamsil-facility-entrance-main',
    nearbyFacilityPointIds: 'jamsil-facility-concession-main',
    cautionNotes: '현장 최종 안내 확인',
  },
  {
    recordType: 'notice',
    stadium: 'JAMSIL',
    sourceDocumentId: 'jamsil-operator-20260531-valid-notice',
    lastUpdatedAt: '2026-05-31',
    noticeId: 'jamsil-operation-notice-20260531-main',
    validFrom: '2026-05-31',
    validTo: '2026-06-01',
    priority: '100',
    teamContext: 'COMMON',
    affectedBlockIds: 'block-101',
    message: '운영자 제공 임시 동선 공지',
  },
];

test('잠실 운영자 입력 게이트는 유효 fixture를 ready_for_manual_apply로 정규화하고 source file을 쓰지 않는다', async () => {
  const outDir = await makeTempDir();
  const inputPath = path.join(outDir, 'valid.csv');
  await writeOperatorCsv(inputPath, validRows());
  const beforeHash = await sha256File(sourcePath);

  const validate = runGate('operator-validate', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-validation.json'));
  assert.equal(validation.status, 'ready_for_manual_apply');
  assert.equal(validation.normalizedData.facilityPoints.length, 2);
  assert.deepEqual(validation.normalizedData.facilityPoints[1].nearSectionIds, ['block-101', 'block-102']);
  assert.equal(validation.normalizedData.facilityPoints[1].openStatus, 'GAME_DAY_ONLY');
  assert.equal(validation.normalizedData.facilityPoints[1].walkingMinutes, 'UNKNOWN');
  assert.equal(validation.normalizedData.blockGuidance.length, 1);
  assert.equal(validation.normalizedData.operationNotices.length, 1);
  assert.equal(validation.normalizedData.operationNotices[0].teamContext, 'COMMON');
  assert.equal(validation.sourceDataWritePerformed, false);

  const applyPlan = runGate('operator-apply-plan', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const plan = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'jamsil-operator-visit-guide-apply-plan.ts-fragment'), 'utf8');

  assert.equal(plan.status, 'ready_for_manual_apply');
  assert.equal(plan.sourceDataWritePerformed, false);
  assert.match(fragment, /JAMSIL_OPERATOR_FACILITY_POINTS/);
  assert.match(fragment, /JAMSIL_BLOCK_VISIT_GUIDANCE/);
  assert.match(fragment, /JAMSIL_OPERATION_NOTICES/);
  assert.match(fragment, /jamsil-facility-entrance-main/);
  assert.match(fragment, /teamContext/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 operator-template placeholder 입력은 waiting_for_operator 상태로 남고 source file을 쓰지 않는다', async () => {
  const outDir = await makeTempDir();
  const inputPath = path.join(outDir, 'placeholder.csv');
  const candidateOnlyPath = path.join(outDir, 'candidate-only-food-review.csv');
  const beforeHash = await sha256File(sourcePath);
  await writeCandidateOnlyFoodReviewCsv(candidateOnlyPath);

  const template = runGate('operator-template', ['--input', inputPath, '--out-dir', outDir]);
  assert.equal(template.status, 0, template.stderr || template.stdout);

  const validate = runGate('operator-validate', ['--input', inputPath, '--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-validation.json'));
  const foodValidation = await readJson(path.join(outDir, 'jamsil-food-candidate-review-validation.json'));
  assert.equal(validation.status, 'waiting_for_operator');
  assert.equal(validation.sourceDataWritePerformed, false);
  assert.equal(foodValidation.status, 'waiting_for_operator');
  assert.equal(foodValidation.sourceDataWritePerformed, false);

  const applyPlan = runGate('operator-apply-plan', ['--input', inputPath, '--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const plan = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'jamsil-operator-visit-guide-apply-plan.ts-fragment'), 'utf8');
  assert.equal(plan.status, 'waiting_for_operator');
  assert.match(fragment, /No operator-provided data is ready/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 operator-validate는 잘못된 운영자 입력을 blocker로 차단한다', async () => {
  const outDir = await makeTempDir();
  const inputPath = path.join(outDir, 'invalid.csv');
  await writeOperatorCsv(inputPath, [
    {
      recordType: 'facility',
      stadium: 'JAMSIL',
      sourceDocumentId: 'jamsil-operator-20260531-invalid-guide',
      lastUpdatedAt: '2026-05-31',
      pointId: 'bad-facility-id',
      kind: 'ENTRANCE',
      label: 'https://example.com forbidden source',
    },
    {
      recordType: 'block',
      stadium: 'JAMSIL',
      sourceDocumentId: 'jamsil-operator-20260531-invalid-guide',
      lastUpdatedAt: '2026-05-31',
      blockId: 'jamsil-unknown',
    },
    {
      recordType: 'block',
      stadium: 'JAMSIL',
      sourceDocumentId: 'jamsil-operator-20260531-invalid-guide',
      lastUpdatedAt: '2026-05-31',
      blockId: 'block-101',
      recommendedEntrancePointIds: 'jamsil-facility-entrance-missing',
    },
    {
      recordType: 'facility',
      stadium: 'JAMSIL',
      sourceDocumentId: 'jamsil-operator-20260531-invalid-guide',
      lastUpdatedAt: '2026-05-31',
      pointId: 'jamsil-facility-concession-missing-detail',
      kind: 'CONCESSION',
      label: '운영자 제공 상세 누락 매점',
    },
    {
      recordType: 'facility',
      stadium: 'JAMSIL',
      sourceDocumentId: 'jamsil-operator-20260531-invalid-guide',
      lastUpdatedAt: '2026-05-31',
      pointId: 'jamsil-facility-shop-mismatch',
      kind: 'MERCH',
      label: '운영자 제공 굿즈샵',
    },
    {
      recordType: 'notice',
      stadium: 'JAMSIL',
      sourceDocumentId: 'jamsil-operator-20260531-invalid-notice',
      lastUpdatedAt: '2026-05-31',
      noticeId: 'bad-notice-id',
      validFrom: '2026-06-01',
      validTo: '2026-05-31',
      priority: 'urgent',
      teamContext: 'UNKNOWN',
      affectedBlockIds: 'block-101',
      message: '운영자 제공 공지',
    },
  ]);

  const validate = runGate('operator-validate', ['--input', inputPath, '--out-dir', outDir]);
  assert.notEqual(validate.status, 0, validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-validation.json'));
  const blockers = validation.blockers.join('\n');

  assert.equal(validation.status, 'blocked');
  assert.match(blockers, /INVALID_FACILITY_POINT_ID/);
  assert.match(blockers, /FORBIDDEN_OPERATOR_DATA/);
  assert.match(blockers, /UNKNOWN_BLOCK_ID/);
  assert.match(blockers, /MISSING_FACILITY_REFERENCE/);
  assert.match(blockers, /INVALID_FACILITY_KIND/);
  assert.match(blockers, /FACILITY_ID_KIND_MISMATCH/);
  assert.match(blockers, /MISSING_FACILITY_DETAIL_FIELD/);
  assert.match(blockers, /INVALID_OPERATION_NOTICE_ID/);
  assert.match(blockers, /INVALID_NOTICE_DATE_RANGE/);
  assert.match(blockers, /INVALID_NOTICE_PRIORITY/);
  assert.match(blockers, /INVALID_TEAM_CONTEXT/);
  assert.equal(validation.sourceDataWritePerformed, false);
});

test('잠실 field-survey-workset은 109개 블록 수집 패킷을 생성하고 source file을 쓰지 않는다', async () => {
  const outDir = await makeTempDir();
  const reviewPath = path.join(outDir, 'jamsil-field-survey-review.csv');
  const beforeHash = await sha256File(sourcePath);

  const worksetRun = runGate('field-survey-workset', ['--review', reviewPath, '--out-dir', outDir]);
  assert.equal(worksetRun.status, 0, worksetRun.stderr || worksetRun.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-field-survey-validation.json'));
  const workset = await readJson(path.join(outDir, 'jamsil-field-survey-workset.json'));
  const reviewCsv = await fs.readFile(reviewPath, 'utf8');
  const worksetCsv = await fs.readFile(path.join(outDir, 'jamsil-field-survey-workset.csv'), 'utf8');
  const worksetMd = await fs.readFile(path.join(outDir, 'jamsil-field-survey-workset.md'), 'utf8');

  assert.equal(validation.status, 'waiting_for_operator');
  assert.equal(validation.review.createdFromTemplate, true);
  assert.equal(workset.status, 'waiting_for_operator');
  assert.equal(workset.sourceDataWritePerformed, false);
  assert.equal(workset.summary.totalRows, 109);
  assert.equal(workset.summary.expectedRows, 109);
  assert.equal(workset.summary.numberedRows, 104);
  assert.equal(workset.summary.specialRows, 5);
  assert.equal(workset.summary.waitingRows, 109);
  assert.equal(workset.summary.blockerCount, 0);
  assert.equal(workset.sourceFile.unchanged, true);
  assert.match(reviewCsv, /accessible-first/);
  assert.match(worksetCsv, /reviewBatchId,rowState,restroomStatus,walkingStatus,congestionStatus,missingOperatorFields,nextAction,blockers/);
  assert.match(worksetMd, /Required Operator Fields/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 field-survey-validate는 일부 화장실 확정 row를 partial_operator_review로 집계한다', async () => {
  const outDir = await makeTempDir();
  const reviewPath = path.join(outDir, 'partial-field-survey.csv');
  const rows = await buildFieldSurveyRows();
  await writeFieldSurveyCsv(reviewPath, rows.map((row, index) => index === 0 ? {
    ...row,
    operatorRestroomFacilityId: 'jamsil-facility-restroom-1f-101',
    operatorRestroomLocationText: '101블록 인근 운영자 확인 화장실',
    operatorRestroomFloor: '1F',
    operatorRestroomSide: 'FIRST_BASE',
    operatorRestroomAccessible: 'UNKNOWN',
    operatorSectionToRestroomMinutes: 'UNKNOWN',
    operatorRestroomVerificationStatus: 'OPERATOR_CONFIRMED',
    reviewerNote: '101 restroom checked',
  } : row));

  const validate = runGate('field-survey-validate', ['--review', reviewPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-field-survey-validation.json'));

  assert.equal(validation.status, 'partial_operator_review');
  assert.equal(validation.summary.totalRows, 109);
  assert.equal(validation.summary.confirmedRestroomRows, 1);
  assert.equal(validation.summary.confirmedWalkingRows, 0);
  assert.equal(validation.summary.confirmedCongestionRows, 0);
  assert.equal(validation.summary.blockerCount, 0);
  assert.ok(validation.rows.some((row) => row.blockId === 'block-101' && row.rowState === 'PARTIAL_OPERATOR_REVIEW'));
});

test('잠실 field-survey-validate는 모든 카테고리 확정 fixture를 ready_for_future_apply_plan으로 집계한다', async () => {
  const outDir = await makeTempDir();
  const reviewPath = path.join(outDir, 'ready-field-survey.csv');
  const rows = await buildFieldSurveyRows();
  await writeFieldSurveyCsv(reviewPath, rows.map(completeFieldSurveyRow));

  const validate = runGate('field-survey-validate', ['--review', reviewPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-field-survey-validation.json'));

  assert.equal(validation.status, 'ready_for_future_apply_plan');
  assert.equal(validation.summary.totalRows, 109);
  assert.equal(validation.summary.confirmedRestroomRows, 109);
  assert.equal(validation.summary.confirmedWalkingRows, 109);
  assert.equal(validation.summary.confirmedCongestionRows, 109);
  assert.equal(validation.summary.completedRows, 109);
  assert.equal(validation.summary.blockerCount, 0);
});

test('잠실 field-survey-validate는 invalid 수집 row를 blocked로 차단한다', async () => {
  const outDir = await makeTempDir();
  const reviewPath = path.join(outDir, 'invalid-field-survey.csv');
  const rows = await buildFieldSurveyRows();
  await writeFieldSurveyCsv(reviewPath, rows.map((row, index) => {
    if (index === 0) {
      return {
        ...row,
        blockId: 'block-999',
        operatorRestroomFacilityId: 'bad-restroom-id',
        operatorSectionToRestroomMinutes: '-1',
        operatorRestroomVerificationStatus: 'OPERATOR_CONFIRMED',
        operatorGateCongestionLevel: 'CRUSHED',
        operatorCongestionObservedAt: '2026-05-31 14:00',
        operatorCongestionVerificationStatus: 'OPERATOR_CONFIRMED',
        reviewerNote: 'https://example.com forbidden',
      };
    }
    if (index === 1) {
      return {
        ...row,
        operatorWalkingVerificationStatus: 'NEEDS_RECHECK',
      };
    }
    if (index === 2) {
      return {
        ...completeFieldSurveyRow(row),
        operatorGateCongestionLevel: 'HIGH',
        operatorCongestionObservedAt: '',
      };
    }
    return row;
  }));

  const validate = runGate('field-survey-validate', ['--review', reviewPath, '--out-dir', outDir]);
  assert.notEqual(validate.status, 0, validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-field-survey-validation.json'));
  const blockers = validation.blockers.join('\n');

  assert.equal(validation.status, 'blocked');
  assert.match(blockers, /FIELD_SURVEY_UNKNOWN_BLOCK_ID/);
  assert.match(blockers, /FIELD_SURVEY_FORBIDDEN_DATA/);
  assert.match(blockers, /FIELD_SURVEY_INVALID_RESTROOM_FACILITY_ID/);
  assert.match(blockers, /FIELD_SURVEY_INVALID_MINUTES/);
  assert.match(blockers, /FIELD_SURVEY_INVALID_CONGESTION_LEVEL/);
  assert.match(blockers, /FIELD_SURVEY_INVALID_CONGESTION_OBSERVED_AT/);
  assert.match(blockers, /FIELD_SURVEY_UNKNOWN_RESTROOM_FACILITY_ID/);
  assert.match(blockers, /FIELD_SURVEY_MISSING_RESTROOM_FIELD/);
  assert.match(blockers, /FIELD_SURVEY_MISSING_CONGESTION_FIELD/);
  assert.match(blockers, /operatorCongestionObservedAt is required when operator-confirmed congestion has LOW\/MEDIUM\/HIGH values/);
  assert.match(blockers, /FIELD_SURVEY_MISSING_REVIEWER_NOTE/);
});

test('잠실 restroom-candidate-review-workset은 14개 화장실 후보 검수 패킷을 생성하고 source file을 쓰지 않는다', async () => {
  const outDir = await makeTempDir();
  const reviewPath = path.join(outDir, 'jamsil-restroom-candidate-review.csv');
  const beforeHash = await sha256File(sourcePath);

  const worksetRun = runGate('restroom-candidate-review-workset', ['--review', reviewPath, '--out-dir', outDir]);
  assert.equal(worksetRun.status, 0, worksetRun.stderr || worksetRun.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-restroom-candidate-review-validation.json'));
  const workset = await readJson(path.join(outDir, 'jamsil-restroom-candidate-review-workset.json'));
  const reviewCsv = await fs.readFile(reviewPath, 'utf8');
  const worksetCsv = await fs.readFile(path.join(outDir, 'jamsil-restroom-candidate-review-workset.csv'), 'utf8');
  const worksetMd = await fs.readFile(path.join(outDir, 'jamsil-restroom-candidate-review-workset.md'), 'utf8');

  assert.equal(validation.status, 'waiting_for_operator');
  assert.equal(validation.review.createdFromTemplate, true);
  assert.equal(workset.status, 'waiting_for_operator');
  assert.equal(workset.sourceDataWritePerformed, false);
  assert.equal(workset.summary.totalRows, 14);
  assert.equal(workset.summary.expectedRows, 14);
  assert.equal(workset.summary.officialRows, 3);
  assert.equal(workset.summary.fieldCollectedRows, 11);
  assert.equal(workset.summary.waitingRows, 14);
  assert.equal(workset.summary.blockerCount, 0);
  assert.equal(workset.sourceFile.unchanged, true);
  assert.match(reviewCsv, /JAMSIL_RESTROOM_3B_OUTER/);
  assert.match(worksetCsv, /reviewBatchId,rowState,missingOperatorFields,nextAction,blockers/);
  assert.match(worksetCsv, /WAITING_FOR_OPERATOR/);
  assert.match(worksetMd, /Candidate Status Summary/);
  assert.match(worksetMd, /2011 historical restroom wait-time/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 restroom-candidate-review-workset은 확정·반려·재확인 row 상태와 다음 액션을 집계한다', async () => {
  const outDir = await makeTempDir();
  const mixedPath = path.join(outDir, 'mixed-restroom-review.csv');
  await writeRestroomCandidateReviewCsvRows(mixedPath, new Map([
    [0, (row) => completeRestroomCandidateRow({
      ...row,
      operatorNearSectionIds: 'block-117;block-118',
      operatorNearGateIds: 'JAMSIL_GATE_2_1',
      operatorLocationText: '운영자 확인 3루 외곽 화장실',
      operatorFloor: 'OUTSIDE',
      operatorSide: 'THIRD_BASE',
      operatorOpenStatus: '24_HOURS',
      operatorAccessible: 'YES',
    }, 0)],
    [1, (row) => ({
      ...row,
      operatorVerificationStatus: 'REJECTED',
      reviewerNote: '운영자 미사용 확인',
    })],
    [2, (row) => ({
      ...row,
      operatorVerificationStatus: 'NEEDS_RECHECK',
      reviewerNote: '위치 재확인 필요',
    })],
  ]));

  const worksetRun = runGate('restroom-candidate-review-workset', ['--review', mixedPath, '--out-dir', outDir]);
  assert.equal(worksetRun.status, 0, worksetRun.stderr || worksetRun.stdout);
  const workset = await readJson(path.join(outDir, 'jamsil-restroom-candidate-review-workset.json'));
  const confirmedRow = workset.rows.find((row) => row.rowState === 'OPERATOR_CONFIRMED');
  const rejectedRow = workset.rows.find((row) => row.rowState === 'REJECTED');
  const needsRecheckRow = workset.rows.find((row) => row.rowState === 'NEEDS_RECHECK');

  assert.equal(workset.status, 'partial_operator_review');
  assert.equal(workset.summary.totalRows, 14);
  assert.equal(workset.summary.confirmedRows, 1);
  assert.equal(workset.summary.rejectedRows, 1);
  assert.equal(workset.summary.needsRecheckRows, 1);
  assert.equal(workset.summary.waitingRows, 11);
  assert.deepEqual(confirmedRow.missingOperatorFields, []);
  assert.match(confirmedRow.nextAction, /future restroom apply-plan/);
  assert.match(rejectedRow.nextAction, /Keep out/);
  assert.match(needsRecheckRow.nextAction, /resolves the recheck/);
});

test('잠실 restroom-candidate-validate는 전체 확정 fixture를 ready_for_future_apply_plan으로 집계한다', async () => {
  const outDir = await makeTempDir();
  const readyPath = path.join(outDir, 'ready-restroom-review.csv');
  const mutators = new Map(Array.from({ length: 14 }, (_, index) => [
    index,
    (row) => completeRestroomCandidateRow(row, index),
  ]));
  await writeRestroomCandidateReviewCsvRows(readyPath, mutators);

  const validate = runGate('restroom-candidate-validate', ['--review', readyPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-restroom-candidate-review-validation.json'));

  assert.equal(validation.status, 'ready_for_future_apply_plan');
  assert.equal(validation.summary.totalRows, 14);
  assert.equal(validation.summary.confirmedRows, 14);
  assert.equal(validation.summary.waitingRows, 0);
  assert.equal(validation.summary.blockerCount, 0);
  assert.equal(validation.confirmedRows.length, 14);
});

test('잠실 restroom-candidate-validate는 invalid 화장실 후보 row를 blocked로 차단한다', async () => {
  const outDir = await makeTempDir();
  const invalidPath = path.join(outDir, 'invalid-restroom-review.csv');
  await writeRestroomCandidateReviewCsvRows(invalidPath, new Map([
    [0, (row) => ({
      ...row,
      candidateFacilityId: 'UNKNOWN_RESTROOM',
      candidateNearSectionIds: 'block-999',
      candidateNearGateIds: 'BAD_GATE',
      candidateLocationText: 'https://example.com forbidden',
      operatorFacilityId: 'bad-restroom-id',
      operatorNearSectionIds: 'block-999',
      operatorNearGateIds: 'BAD_GATE',
      operatorLocationText: '',
      operatorFloor: '',
      operatorSide: '',
      operatorOpenStatus: 'ALWAYS',
      operatorAccessible: 'MAYBE',
      operatorWalkingMinutes: '-2',
      operatorVerificationStatus: 'OPERATOR_CONFIRMED',
    })],
    [1, (row) => ({
      ...row,
      operatorVerificationStatus: 'NEEDS_RECHECK',
    })],
  ]));

  const validate = runGate('restroom-candidate-validate', ['--review', invalidPath, '--out-dir', outDir]);
  assert.notEqual(validate.status, 0, validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-restroom-candidate-review-validation.json'));
  const blockers = validation.blockers.join('\n');

  assert.equal(validation.status, 'blocked');
  assert.match(blockers, /RESTROOM_REVIEW_UNKNOWN_CANDIDATE/);
  assert.match(blockers, /RESTROOM_REVIEW_FORBIDDEN_DATA/);
  assert.match(blockers, /RESTROOM_REVIEW_UNKNOWN_CANDIDATE_NEAR_SECTION_ID/);
  assert.match(blockers, /RESTROOM_REVIEW_INVALID_CANDIDATE_NEAR_GATE_ID/);
  assert.match(blockers, /RESTROOM_REVIEW_INVALID_OPERATOR_FACILITY_ID/);
  assert.match(blockers, /RESTROOM_REVIEW_UNKNOWN_OPERATOR_NEAR_SECTION_ID/);
  assert.match(blockers, /RESTROOM_REVIEW_INVALID_OPERATOR_NEAR_GATE_ID/);
  assert.match(blockers, /RESTROOM_REVIEW_INVALID_OPERATOR_OPEN_STATUS/);
  assert.match(blockers, /RESTROOM_REVIEW_INVALID_OPERATOR_ACCESSIBLE/);
  assert.match(blockers, /RESTROOM_REVIEW_INVALID_OPERATOR_WALKING_MINUTES/);
  assert.match(blockers, /RESTROOM_REVIEW_MISSING_OPERATOR_FIELD/);
  assert.match(blockers, /RESTROOM_REVIEW_MISSING_REVIEWER_NOTE/);
});

test('잠실 restroom-candidate-transfer와 apply-plan은 확정 후보가 없으면 대기 산출물을 생성한다', async () => {
  const outDir = await makeTempDir();
  const candidateOnlyPath = path.join(outDir, 'candidate-only-restroom-review.csv');
  const beforeHash = await sha256File(sourcePath);
  await writeCandidateOnlyRestroomReviewCsv(candidateOnlyPath);

  const transfer = runGate('restroom-candidate-transfer', ['--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(transfer.status, 0, transfer.stderr || transfer.stdout);
  const transferReport = await readJson(path.join(outDir, 'jamsil-restroom-candidate-intake-transfer.json'));
  const transferCsv = await fs.readFile(path.join(outDir, 'jamsil-restroom-candidate-intake-transfer.csv'), 'utf8');

  assert.equal(transferReport.status, 'waiting_for_operator');
  assert.equal(transferReport.sourceDataWritePerformed, false);
  assert.equal(transferReport.summary.confirmedRows, 0);
  assert.equal(transferReport.summary.transferredRows, 0);
  assert.equal(transferCsv.trim(), columns.join(','));

  const applyPlan = runGate('restroom-candidate-apply-plan', ['--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const applyReport = await readJson(path.join(outDir, 'jamsil-restroom-candidate-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'jamsil-restroom-candidate-apply-plan.ts-fragment'), 'utf8');

  assert.equal(applyReport.status, 'waiting_for_operator');
  assert.equal(applyReport.sourceDataWritePerformed, false);
  assert.equal(applyReport.summary.confirmedRows, 0);
  assert.equal(applyReport.summary.candidateFacilityPoints, 0);
  assert.equal(applyReport.summary.affectedBlocks, 0);
  assert.match(fragment, /No operator-confirmed restroom candidates are ready/);
  assert.match(fragment, /JAMSIL_OPERATION_NOTICES remains unchanged/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 restroom-candidate-transfer는 확정 화장실 후보를 operator-validate 가능한 facility row로 변환한다', async () => {
  const outDir = await makeTempDir();
  const readyPath = path.join(outDir, 'ready-restroom-review.csv');
  await writeRestroomCandidateReviewCsvRows(readyPath, new Map([
    [0, (row) => ({
      ...completeRestroomCandidateRow(row, 0),
      operatorFacilityId: 'jamsil-facility-restroom-public-stadium',
      operatorNearSectionIds: 'block-117;block-118',
      operatorNearGateIds: 'JAMSIL_GATE_2_1',
      operatorLocationText: '운영자 확인 3루 외곽 화장실',
      operatorFloor: 'OUTSIDE',
      operatorSide: 'THIRD_BASE',
      operatorOpenStatus: '24_HOURS',
      operatorAccessible: 'YES',
    })],
  ]));

  const missingSource = runGate('restroom-candidate-transfer', ['--review', readyPath, '--out-dir', outDir]);
  assert.notEqual(missingSource.status, 0, missingSource.stdout);
  const blocked = await readJson(path.join(outDir, 'jamsil-restroom-candidate-intake-transfer.json'));
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.blockers.join('\n'), /RESTROOM_TRANSFER_MISSING_SOURCE_DOCUMENT_ID/);
  assert.match(blocked.blockers.join('\n'), /RESTROOM_TRANSFER_MISSING_LAST_UPDATED_AT/);

  const transfer = runGate('restroom-candidate-transfer', [
    '--review',
    readyPath,
    '--out-dir',
    outDir,
    '--source-document-id',
    'jamsil-operator-20260601-restroom-review',
    '--last-updated-at',
    '2026-06-01',
  ]);
  assert.equal(transfer.status, 0, transfer.stderr || transfer.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-restroom-candidate-intake-transfer.json'));
  const transferCsvPath = path.join(outDir, 'jamsil-restroom-candidate-intake-transfer.csv');
  const transferCsv = await fs.readFile(transferCsvPath, 'utf8');

  assert.equal(report.status, 'ready_for_operator_validate');
  assert.equal(report.summary.transferredRows, 1);
  assert.match(transferCsv, /facility,JAMSIL,jamsil-operator-20260601-restroom-review,2026-06-01,jamsil-facility-restroom-public-stadium,RESTROOM,잠실야구장/);

  const validate = runGate('operator-validate', ['--input', transferCsvPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-validation.json'));
  assert.equal(validation.status, 'ready_for_manual_apply');
  assert.equal(validation.normalizedData.facilityPoints.length, 1);
  assert.equal(validation.normalizedData.facilityPoints[0].kind, 'RESTROOM');
  assert.equal(validation.normalizedData.facilityPoints[0].openStatus, '24_HOURS');
});

test('잠실 restroom-candidate-apply-plan은 확정 화장실 후보를 기존 seed와 병합한 수동 fragment로 만든다', async () => {
  const outDir = await makeTempDir();
  const readyPath = path.join(outDir, 'ready-restroom-review.csv');
  await writeRestroomCandidateReviewCsvRows(readyPath, new Map([
    [0, (row) => ({
      ...completeRestroomCandidateRow(row, 0),
      operatorFacilityId: 'jamsil-facility-restroom-public-stadium',
      operatorNearSectionIds: 'block-117;block-118',
      operatorNearGateIds: 'JAMSIL_GATE_2_1',
      operatorLocationText: '운영자 확인 3루 외곽 화장실',
      operatorFloor: 'OUTSIDE',
      operatorSide: 'THIRD_BASE',
      operatorOpenStatus: 'UNKNOWN',
      operatorAccessible: 'YES',
    })],
  ]));

  const missingSource = runGate('restroom-candidate-apply-plan', ['--review', readyPath, '--out-dir', outDir]);
  assert.notEqual(missingSource.status, 0, missingSource.stdout);
  const blocked = await readJson(path.join(outDir, 'jamsil-restroom-candidate-apply-plan.json'));
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.blockers.join('\n'), /RESTROOM_APPLY_MISSING_SOURCE_DOCUMENT_ID/);
  assert.match(blocked.blockers.join('\n'), /RESTROOM_APPLY_MISSING_LAST_UPDATED_AT/);

  const applyPlan = runGate('restroom-candidate-apply-plan', [
    '--review',
    readyPath,
    '--out-dir',
    outDir,
    '--source-document-id',
    'jamsil-operator-20260601-restroom-review',
    '--last-updated-at',
    '2026-06-01',
  ]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-restroom-candidate-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'jamsil-restroom-candidate-apply-plan.ts-fragment'), 'utf8');
  const restroomPoint = report.normalizedData.candidateFacilityPoints[0];
  const affectedBlock = report.normalizedData.blockGuidance.find((guidance) => guidance.blockId === 'block-117');

  assert.equal(report.status, 'ready_for_manual_apply');
  assert.equal(report.summary.confirmedRows, 1);
  assert.equal(report.summary.candidateFacilityPoints, 1);
  assert.equal(report.summary.affectedBlocks, 2);
  assert.equal(restroomPoint.kind, 'RESTROOM');
  assert.deepEqual(restroomPoint.nearSectionIds, ['block-117', 'block-118']);
  assert.ok(affectedBlock.nearbyFacilityPointIds[0] === 'jamsil-facility-restroom-public-stadium');
  assert.ok(affectedBlock.nearbyFacilityPointIds.includes('jamsil-facility-concession-food-002'));
  assert.match(fragment, /jamsil-facility-restroom-public-stadium/);
  assert.match(fragment, /jamsil-facility-concession-food-002/);
  assert.match(fragment, /JAMSIL_OPERATION_NOTICES remains unchanged/);
  assert.doesNotMatch(fragment, /2011년|exit 5 crowd|종합운동장 5번 출구/);
});

test('잠실 food-candidate-validate는 후보-only 작업표를 waiting_for_operator packet으로 생성한다', async () => {
  const outDir = await makeTempDir();
  const candidateOnlyPath = path.join(outDir, 'candidate-only-food-review.csv');
  await writeCandidateOnlyFoodReviewCsv(candidateOnlyPath);

  const validate = runGate('food-candidate-validate', ['--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-food-candidate-review-validation.json'));
  const validationCsv = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-review-validation.csv'), 'utf8');
  const validationMd = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-review-validation.md'), 'utf8');

  assert.equal(validation.status, 'waiting_for_operator');
  assert.equal(validation.sourceDataWritePerformed, false);
  assert.equal(validation.review.totalRows, 57);
  assert.equal(validation.review.expectedRows, 57);
  assert.equal(validation.summary.confirmedRows, 0);
  assert.equal(validation.summary.blockerCount, 0);
  assert.match(validationCsv, /operatorVerificationStatus/);
  assert.match(validationMd, /Jamsil Food Candidate Review Validation/);
});

test('잠실 food-candidate-review-workset은 후보 57개를 zone별 운영자 검수 패킷으로 생성한다', async () => {
  const outDir = await makeTempDir();
  const candidateOnlyPath = path.join(outDir, 'candidate-only-food-review.csv');
  const beforeHash = await sha256File(sourcePath);
  await writeCandidateOnlyFoodReviewCsv(candidateOnlyPath);

  const worksetRun = runGate('food-candidate-review-workset', ['--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(worksetRun.status, 0, worksetRun.stderr || worksetRun.stdout);
  const workset = await readJson(path.join(outDir, 'jamsil-food-candidate-review-workset.json'));
  const worksetCsv = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-review-workset.csv'), 'utf8');
  const worksetMd = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-review-workset.md'), 'utf8');

  assert.equal(workset.status, 'waiting_for_operator');
  assert.equal(workset.sourceDataWritePerformed, false);
  assert.equal(workset.summary.totalRows, 57);
  assert.equal(workset.summary.expectedRows, 57);
  assert.equal(workset.summary.zoneCount, 6);
  assert.equal(workset.summary.waitingRows, 57);
  assert.equal(workset.summary.confirmedRows, 0);
  assert.equal(workset.summary.blockedRows, 0);
  assert.equal(workset.sourceFile.unchanged, true);
  assert.ok(workset.zones.some((zone) => zone.zoneId === 'JAMSIL_FOOD_2F_1B_CONCOURSE'));
  assert.match(worksetCsv, /reviewBatchId,rowState,missingOperatorFields,nextAction/);
  assert.match(worksetCsv, /WAITING_FOR_OPERATOR/);
  assert.match(worksetMd, /Zone Summary/);
  assert.match(worksetMd, /operatorNearSectionIds/);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 food-candidate-review-workset은 확정·반려·재확인 row 상태와 다음 액션을 집계한다', async () => {
  const outDir = await makeTempDir();
  const mixedPath = path.join(outDir, 'mixed-food-review.csv');
  await writeFoodCandidateReviewCsvRows(mixedPath, new Map([
    [0, (row) => ({
      ...row,
      operatorFacilityId: 'jamsil-facility-concession-cafe-heeda',
      operatorNearSectionIds: 'block-117;block-118',
      operatorLocationText: '운영자 확인 1층 3루 외부 매점',
      operatorOpenStatus: 'OPEN',
      operatorAccessible: 'UNKNOWN',
      operatorWalkingMinutes: 'UNKNOWN',
      operatorVerificationStatus: 'OPERATOR_CONFIRMED',
    })],
    [1, (row) => ({
      ...row,
      operatorVerificationStatus: 'REJECTED',
      reviewerNote: '운영자 미입점 확인',
    })],
    [2, (row) => ({
      ...row,
      operatorVerificationStatus: 'NEEDS_RECHECK',
      reviewerNote: '위치 재확인 필요',
    })],
  ]));

  const worksetRun = runGate('food-candidate-review-workset', ['--review', mixedPath, '--out-dir', outDir]);
  assert.equal(worksetRun.status, 0, worksetRun.stderr || worksetRun.stdout);
  const workset = await readJson(path.join(outDir, 'jamsil-food-candidate-review-workset.json'));
  const confirmedRow = workset.rows.find((row) => row.rowState === 'OPERATOR_CONFIRMED');
  const rejectedRow = workset.rows.find((row) => row.rowState === 'REJECTED');
  const needsRecheckRow = workset.rows.find((row) => row.rowState === 'NEEDS_RECHECK');

  assert.equal(workset.status, 'ready_for_operator_intake_transfer');
  assert.equal(workset.summary.totalRows, 57);
  assert.equal(workset.summary.confirmedRows, 1);
  assert.equal(workset.summary.rejectedRows, 1);
  assert.equal(workset.summary.needsRecheckRows, 1);
  assert.equal(workset.summary.waitingRows, 54);
  assert.deepEqual(confirmedRow.missingOperatorFields, []);
  assert.match(confirmedRow.nextAction, /Ready for food-candidate-transfer/);
  assert.deepEqual(rejectedRow.missingOperatorFields, []);
  assert.match(rejectedRow.nextAction, /Keep out of transfer/);
  assert.deepEqual(needsRecheckRow.missingOperatorFields, []);
  assert.match(needsRecheckRow.nextAction, /Keep out of transfer/);
});

test('잠실 food-candidate-transfer는 확정 후보가 없으면 header-only intake CSV를 생성한다', async () => {
  const outDir = await makeTempDir();
  const candidateOnlyPath = path.join(outDir, 'candidate-only-food-review.csv');
  await writeCandidateOnlyFoodReviewCsv(candidateOnlyPath);

  const transfer = runGate('food-candidate-transfer', ['--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(transfer.status, 0, transfer.stderr || transfer.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-food-candidate-intake-transfer.json'));
  const transferCsv = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-intake-transfer.csv'), 'utf8');

  assert.equal(report.status, 'waiting_for_operator');
  assert.equal(report.sourceDataWritePerformed, false);
  assert.equal(report.summary.confirmedRows, 0);
  assert.equal(report.summary.transferredRows, 0);
  assert.equal(transferCsv.trim(), columns.join(','));
});

test('잠실 food-candidate-apply-plan은 확정 후보가 없으면 빈 수동 적용 fragment를 생성한다', async () => {
  const outDir = await makeTempDir();
  const candidateOnlyPath = path.join(outDir, 'candidate-only-food-review.csv');
  await writeCandidateOnlyFoodReviewCsv(candidateOnlyPath);

  const applyPlan = runGate('food-candidate-apply-plan', ['--review', candidateOnlyPath, '--out-dir', outDir]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-food-candidate-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-apply-plan.ts-fragment'), 'utf8');

  assert.equal(report.status, 'waiting_for_operator');
  assert.equal(report.sourceDataWritePerformed, false);
  assert.equal(report.summary.confirmedRows, 0);
  assert.equal(report.summary.candidateFacilityPoints, 0);
  assert.equal(report.summary.affectedBlocks, 0);
  assert.match(fragment, /No operator-confirmed food candidates are ready/);
  assert.match(fragment, /JAMSIL_OPERATION_NOTICES remains unchanged/);
});

test('잠실 food-candidate-validate는 확정 후보 row의 필수 운영자 필드를 검증한다', async () => {
  const outDir = await makeTempDir();
  const readyPath = path.join(outDir, 'ready-food-review.csv');
  await writeFoodCandidateReviewCsv(readyPath, (row) => ({
    ...row,
    operatorFacilityId: 'jamsil-facility-concession-cafe-heeda',
    operatorNearSectionIds: 'block-117;block-118',
    operatorLocationText: '운영자 확인 1층 3루 외부 매점',
    operatorOpenStatus: 'OPEN',
    operatorAccessible: 'UNKNOWN',
    operatorWalkingMinutes: 'UNKNOWN',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
  }));

  const validate = runGate('food-candidate-validate', ['--review', readyPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-food-candidate-review-validation.json'));

  assert.equal(validation.status, 'ready_for_operator_intake_transfer');
  assert.equal(validation.summary.confirmedRows, 1);
  assert.deepEqual(validation.blockers, []);
});

test('잠실 food-candidate-transfer는 확정 후보를 operator-validate 가능한 facility row로 변환한다', async () => {
  const outDir = await makeTempDir();
  const readyPath = path.join(outDir, 'ready-food-review.csv');
  await writeFoodCandidateReviewCsv(readyPath, (row) => ({
    ...row,
    operatorFacilityId: 'jamsil-facility-concession-cafe-heeda',
    operatorNearSectionIds: 'block-117;block-118',
    operatorLocationText: '운영자 확인 1층 3루 외부 매점',
    operatorOpenStatus: 'OPEN',
    operatorAccessible: 'UNKNOWN',
    operatorWalkingMinutes: 'UNKNOWN',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
  }));

  const missingSource = runGate('food-candidate-transfer', ['--review', readyPath, '--out-dir', outDir]);
  assert.notEqual(missingSource.status, 0, missingSource.stdout);
  const blocked = await readJson(path.join(outDir, 'jamsil-food-candidate-intake-transfer.json'));
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.blockers.join('\n'), /FOOD_TRANSFER_MISSING_SOURCE_DOCUMENT_ID/);
  assert.match(blocked.blockers.join('\n'), /FOOD_TRANSFER_MISSING_LAST_UPDATED_AT/);

  const transfer = runGate('food-candidate-transfer', [
    '--review',
    readyPath,
    '--out-dir',
    outDir,
    '--source-document-id',
    'jamsil-operator-20260531-food-review',
    '--last-updated-at',
    '2026-05-31',
  ]);
  assert.equal(transfer.status, 0, transfer.stderr || transfer.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-food-candidate-intake-transfer.json'));
  const transferCsvPath = path.join(outDir, 'jamsil-food-candidate-intake-transfer.csv');
  const transferCsv = await fs.readFile(transferCsvPath, 'utf8');

  assert.equal(report.status, 'ready_for_operator_validate');
  assert.equal(report.summary.transferredRows, 1);
  assert.match(transferCsv, /facility,JAMSIL,jamsil-operator-20260531-food-review,2026-05-31,jamsil-facility-concession-cafe-heeda,CONCESSION,카페희다/);

  const validate = runGate('operator-validate', ['--input', transferCsvPath, '--review', readyPath, '--out-dir', outDir]);
  assert.equal(validate.status, 0, validate.stderr || validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-validation.json'));
  assert.equal(validation.status, 'ready_for_manual_apply');
  assert.equal(validation.normalizedData.facilityPoints.length, 1);
  assert.equal(validation.normalizedData.facilityPoints[0].id, 'jamsil-facility-concession-cafe-heeda');
});

test('잠실 food-candidate-apply-plan은 확정 후보를 기존 seed와 병합한 수동 fragment로 만든다', async () => {
  const outDir = await makeTempDir();
  const readyPath = path.join(outDir, 'ready-food-review.csv');
  await writeFoodCandidateReviewCsv(readyPath, (row) => ({
    ...row,
    operatorFacilityId: 'jamsil-facility-concession-cafe-heeda',
    operatorNearSectionIds: 'block-117;block-118',
    operatorLocationText: '운영자 확인 1층 3루 외부 매점',
    operatorOpenStatus: 'OPEN',
    operatorAccessible: 'UNKNOWN',
    operatorWalkingMinutes: 'UNKNOWN',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
  }));

  const missingSource = runGate('food-candidate-apply-plan', ['--review', readyPath, '--out-dir', outDir]);
  assert.notEqual(missingSource.status, 0, missingSource.stdout);
  const blocked = await readJson(path.join(outDir, 'jamsil-food-candidate-apply-plan.json'));
  assert.equal(blocked.status, 'blocked');
  assert.match(blocked.blockers.join('\n'), /FOOD_APPLY_MISSING_SOURCE_DOCUMENT_ID/);
  assert.match(blocked.blockers.join('\n'), /FOOD_APPLY_MISSING_LAST_UPDATED_AT/);

  const applyPlan = runGate('food-candidate-apply-plan', [
    '--review',
    readyPath,
    '--out-dir',
    outDir,
    '--source-document-id',
    'jamsil-operator-20260531-food-review',
    '--last-updated-at',
    '2026-05-31',
  ]);
  assert.equal(applyPlan.status, 0, applyPlan.stderr || applyPlan.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-food-candidate-apply-plan.json'));
  const fragment = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-apply-plan.ts-fragment'), 'utf8');
  const block117 = report.normalizedData.blockGuidance.find((guidance) => guidance.blockId === 'block-117');
  const block118 = report.normalizedData.blockGuidance.find((guidance) => guidance.blockId === 'block-118');

  assert.equal(report.status, 'ready_for_manual_apply');
  assert.equal(report.sourceDataWritePerformed, false);
  assert.equal(report.summary.candidateFacilityPoints, 1);
  assert.equal(report.summary.affectedBlocks, 2);
  assert.equal(report.operationNoticesUnchanged, true);
  assert.ok(report.normalizedData.facilityPoints.some((point) => point.id === 'jamsil-facility-ticketoffice-main'));
  assert.ok(report.normalizedData.facilityPoints.some((point) => point.id === 'jamsil-facility-concession-cafe-heeda'));
  assert.equal(block117.nearbyFacilityPointIds[0], 'jamsil-facility-concession-cafe-heeda');
  assert.equal(block118.nearbyFacilityPointIds[0], 'jamsil-facility-concession-cafe-heeda');
  assert.ok(block117.nearbyFacilityPointIds.includes('jamsil-facility-ticketoffice-main'));
  assert.match(fragment, /JAMSIL_OPERATOR_FACILITY_POINTS/);
  assert.match(fragment, /JAMSIL_BLOCK_VISIT_GUIDANCE/);
  assert.match(fragment, /jamsil-facility-concession-cafe-heeda/);
  assert.match(fragment, /jamsil-facility-ticketoffice-main/);
  assert.match(fragment, /JAMSIL_OPERATION_NOTICES remains unchanged/);
});

test('잠실 operator-approval은 후보-only handoff를 WAITING_FOR_OPERATOR로 남기고 승인 검증은 실패시킨다', async () => {
  const outDir = await makeTempDir();
  const candidateOnlyPath = path.join(outDir, 'candidate-only-food-review.csv');
  const restroomCandidateOnlyPath = path.join(outDir, 'candidate-only-restroom-review.csv');
  const beforeHash = await sha256File(sourcePath);
  await writeCandidateOnlyFoodReviewCsv(candidateOnlyPath);
  await writeCandidateOnlyRestroomReviewCsv(restroomCandidateOnlyPath);

  const intake = runGate('operator-intake', [
    '--review',
    candidateOnlyPath,
    '--restroom-review',
    restroomCandidateOnlyPath,
    '--out-dir',
    outDir,
  ]);
  assert.equal(intake.status, 0, intake.stderr || intake.stdout);

  const approval = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir]);
  assert.equal(approval.status, 0, approval.stderr || approval.stdout);
  const report = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));
  const markdown = await fs.readFile(path.join(outDir, 'jamsil-operator-visit-guide-approval.md'), 'utf8');

  assert.equal(report.status, 'WAITING_FOR_OPERATOR');
  assert.equal(report.sourceDataWritePerformed, false);
  assert.equal(report.approvedBy, null);
  assert.equal(report.approvedAt, null);
  assert.equal(report.confirmedFoodCandidateRows, 0);
  assert.match(markdown, /WAITING_FOR_OPERATOR/);

  const verify = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--require-approved']);
  assert.notEqual(verify.status, 0, verify.stdout);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 operator-approval은 확정 매점 packet을 승인 대기 후 승인 JSON으로 고정한다', async () => {
  const outDir = await makeTempDir();
  const beforeHash = await sha256File(sourcePath);
  const { restroomCandidateOnlyPath } = await prepareReadyFoodCandidatePacket(outDir);

  const pending = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir]);
  assert.equal(pending.status, 0, pending.stderr || pending.stdout);
  const pendingReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));

  assert.equal(pendingReport.status, 'PENDING_OPERATOR_APPROVAL');
  assert.equal(pendingReport.sourceDataWritePerformed, false);
  assert.equal(pendingReport.confirmedFoodCandidateRows, 1);
  assert.equal(pendingReport.artifactStatuses.handoffJsonStatus, 'ready_for_manual_apply');
  assert.equal(pendingReport.artifactStatuses.foodCandidateReviewJsonStatus, 'ready_for_operator_intake_transfer');
  assert.equal(pendingReport.artifactStatuses.fieldSurveyValidationJsonStatus, 'ready_for_future_apply_plan');
  assert.equal(pendingReport.artifactStatuses.fieldSurveyWorksetJsonStatus, 'ready_for_future_apply_plan');
  assert.equal(pendingReport.fieldSurveyCompletedRows, 109);
  assert.match(pendingReport.handoffJsonHash, /^[a-f0-9]{64}$/);
  assert.match(pendingReport.foodCandidateApplyPlanTsFragmentHash, /^[a-f0-9]{64}$/);
  assert.match(pendingReport.fieldSurveyWorksetCsvHash, /^[a-f0-9]{64}$/);

  const missingApprover = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--approve']);
  assert.notEqual(missingApprover.status, 0, missingApprover.stdout);

  const approve = runGate('operator-approval', [
    '--out-dir',
    outDir,
    '--restroom-review',
    restroomCandidateOnlyPath,
    '--approve',
    '--approved-by',
    'seatmap-operator',
    '--notes',
    '검수 완료',
  ]);
  assert.equal(approve.status, 0, approve.stderr || approve.stdout);
  const approvedReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));
  const approvedMarkdown = await fs.readFile(path.join(outDir, 'jamsil-operator-visit-guide-approval.md'), 'utf8');

  assert.equal(approvedReport.status, 'APPROVED');
  assert.equal(approvedReport.approvedBy, 'seatmap-operator');
  assert.equal(approvedReport.notes, '검수 완료');
  assert.match(approvedReport.approvedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(approvedReport.foodCandidateTransferCsvHash, /^[a-f0-9]{64}$/);
  assert.match(approvedReport.fieldSurveyValidationJsonHash, /^[a-f0-9]{64}$/);
  assert.match(approvedMarkdown, /APPROVED/);
  assert.match(approvedMarkdown, /fieldSurveyCompletedRows/);

  const verify = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--require-approved']);
  assert.equal(verify.status, 0, verify.stderr || verify.stdout);
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 operator-approval은 승인 이후 packet 산출물이 바뀌면 STALE_APPROVAL로 전환한다', async () => {
  const outDir = await makeTempDir();
  const { restroomCandidateOnlyPath } = await prepareReadyFoodCandidatePacket(outDir);

  const approve = runGate('operator-approval', [
    '--out-dir',
    outDir,
    '--restroom-review',
    restroomCandidateOnlyPath,
    '--approve',
    '--approved-by',
    'seatmap-operator',
    '--notes',
    '검수 완료',
  ]);
  assert.equal(approve.status, 0, approve.stderr || approve.stdout);

  await fs.appendFile(
    path.join(outDir, 'jamsil-food-candidate-apply-plan.ts-fragment'),
    '// operator review changed artifact\n',
    'utf8',
  );

  const status = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--status']);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.match(status.stdout, /STALE_APPROVAL/);

  const verify = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--require-approved']);
  assert.notEqual(verify.status, 0, verify.stdout);
  const staleReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));

  assert.equal(staleReport.status, 'STALE_APPROVAL');
  assert.equal(staleReport.staleReason, 'approved operator handoff hash does not match current artifacts');
  assert.match(staleReport.currentArtifactHashes.foodCandidateApplyPlanTsFragmentHash, /^[a-f0-9]{64}$/);
  assert.notEqual(
    staleReport.foodCandidateApplyPlanTsFragmentHash,
    staleReport.currentArtifactHashes.foodCandidateApplyPlanTsFragmentHash,
  );
});

test('잠실 operator-approval은 승인 이후 field-survey 산출물이 바뀌면 STALE_APPROVAL로 전환한다', async () => {
  const outDir = await makeTempDir();
  const { restroomCandidateOnlyPath } = await prepareReadyFoodCandidatePacket(outDir);

  const approve = runGate('operator-approval', [
    '--out-dir',
    outDir,
    '--restroom-review',
    restroomCandidateOnlyPath,
    '--approve',
    '--approved-by',
    'seatmap-operator',
    '--notes',
    '현장 수집 UNKNOWN 검수 포함',
  ]);
  assert.equal(approve.status, 0, approve.stderr || approve.stdout);
  const approvedReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));
  assert.match(approvedReport.fieldSurveyWorksetCsvHash, /^[a-f0-9]{64}$/);

  await fs.appendFile(
    path.join(outDir, 'jamsil-field-survey-workset.csv'),
    '# field survey operator review changed artifact\n',
    'utf8',
  );

  const status = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--status']);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.match(status.stdout, /STALE_APPROVAL/);

  const verify = runGate('operator-approval', ['--restroom-review', restroomCandidateOnlyPath, '--out-dir', outDir, '--require-approved']);
  assert.notEqual(verify.status, 0, verify.stdout);
  const staleReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));

  assert.equal(staleReport.status, 'STALE_APPROVAL');
  assert.match(staleReport.currentArtifactHashes.fieldSurveyWorksetCsvHash, /^[a-f0-9]{64}$/);
  assert.notEqual(
    staleReport.fieldSurveyWorksetCsvHash,
    staleReport.currentArtifactHashes.fieldSurveyWorksetCsvHash,
  );
});

test('잠실 operator-approval은 확정 화장실 packet을 hash 대상에 포함하고 변경 시 STALE_APPROVAL로 전환한다', async () => {
  const outDir = await makeTempDir();
  const beforeHash = await sha256File(sourcePath);
  const { restroomReadyPath } = await prepareReadyFoodAndRestroomCandidatePacket(outDir);

  const pending = runGate('operator-approval', ['--out-dir', outDir, '--restroom-review', restroomReadyPath]);
  assert.equal(pending.status, 0, pending.stderr || pending.stdout);
  const pendingReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));

  assert.equal(pendingReport.status, 'PENDING_OPERATOR_APPROVAL');
  assert.equal(pendingReport.confirmedFoodCandidateRows, 1);
  assert.equal(pendingReport.confirmedRestroomCandidateRows, 1);
  assert.equal(pendingReport.includeRestroomArtifacts, true);
  assert.equal(pendingReport.artifactStatuses.restroomCandidateTransferJsonStatus, 'ready_for_operator_validate');
  assert.equal(pendingReport.artifactStatuses.restroomCandidateApplyPlanJsonStatus, 'ready_for_manual_apply');
  assert.match(pendingReport.restroomCandidateApplyPlanTsFragmentHash, /^[a-f0-9]{64}$/);

  const approve = runGate('operator-approval', [
    '--out-dir',
    outDir,
    '--restroom-review',
    restroomReadyPath,
    '--approve',
    '--approved-by',
    'seatmap-operator',
    '--notes',
    '화장실 후보 1건 검수 완료',
  ]);
  assert.equal(approve.status, 0, approve.stderr || approve.stdout);

  await fs.appendFile(
    path.join(outDir, 'jamsil-restroom-candidate-apply-plan.ts-fragment'),
    '// restroom operator review changed artifact\n',
    'utf8',
  );

  const status = runGate('operator-approval', ['--out-dir', outDir, '--restroom-review', restroomReadyPath, '--status']);
  assert.equal(status.status, 0, status.stderr || status.stdout);
  assert.match(status.stdout, /STALE_APPROVAL/);

  const verify = runGate('operator-approval', ['--out-dir', outDir, '--restroom-review', restroomReadyPath, '--require-approved']);
  assert.notEqual(verify.status, 0, verify.stdout);
  const staleReport = await readJson(path.join(outDir, 'jamsil-operator-visit-guide-approval.json'));

  assert.equal(staleReport.status, 'STALE_APPROVAL');
  assert.match(staleReport.currentArtifactHashes.restroomCandidateApplyPlanTsFragmentHash, /^[a-f0-9]{64}$/);
  assert.notEqual(
    staleReport.restroomCandidateApplyPlanTsFragmentHash,
    staleReport.currentArtifactHashes.restroomCandidateApplyPlanTsFragmentHash,
  );
  assert.equal(await sha256File(sourcePath), beforeHash);
});

test('잠실 food-candidate-validate는 불완전한 확정 후보 row를 blocker로 차단한다', async () => {
  const outDir = await makeTempDir();
  const invalidPath = path.join(outDir, 'invalid-food-review.csv');
  await writeFoodCandidateReviewCsv(invalidPath, (row) => ({
    ...row,
    operatorFacilityId: 'bad-food-id',
    operatorOpenStatus: 'ALWAYS',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
  }));

  const validate = runGate('food-candidate-validate', ['--review', invalidPath, '--out-dir', outDir]);
  assert.notEqual(validate.status, 0, validate.stdout);
  const validation = await readJson(path.join(outDir, 'jamsil-food-candidate-review-validation.json'));
  const blockers = validation.blockers.join('\n');

  assert.equal(validation.status, 'blocked');
  assert.match(blockers, /INVALID_OPERATOR_FACILITY_ID/);
  assert.match(blockers, /MISSING_OPERATOR_NEAR_SECTION_IDS/);
  assert.match(blockers, /MISSING_OPERATOR_LOCATION_TEXT/);
  assert.match(blockers, /INVALID_OPERATOR_OPEN_STATUS/);
  assert.match(blockers, /INVALID_OPERATOR_ACCESSIBLE/);
  assert.match(blockers, /INVALID_OPERATOR_WALKING_MINUTES/);
});

test('잠실 food-candidate-review-workset은 blocked 검증 결과를 JSON/MD에 보존하고 실패한다', async () => {
  const outDir = await makeTempDir();
  const invalidPath = path.join(outDir, 'invalid-food-review.csv');
  await writeFoodCandidateReviewCsv(invalidPath, (row) => ({
    ...row,
    operatorFacilityId: 'bad-food-id',
    operatorOpenStatus: 'ALWAYS',
    operatorVerificationStatus: 'OPERATOR_CONFIRMED',
  }));

  const worksetRun = runGate('food-candidate-review-workset', ['--review', invalidPath, '--out-dir', outDir]);
  assert.notEqual(worksetRun.status, 0, worksetRun.stdout);
  const workset = await readJson(path.join(outDir, 'jamsil-food-candidate-review-workset.json'));
  const worksetMd = await fs.readFile(path.join(outDir, 'jamsil-food-candidate-review-workset.md'), 'utf8');

  assert.equal(workset.status, 'blocked');
  assert.equal(workset.summary.blockerCount, workset.blockers.length);
  assert.ok(workset.rows.some((row) => row.rowState === 'BLOCKED'));
  assert.match(workset.blockers.join('\n'), /FOOD_REVIEW_INVALID_OPERATOR_FACILITY_ID/);
  assert.match(worksetMd, /FOOD_REVIEW_INVALID_OPERATOR_FACILITY_ID/);
});
