import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS } from './daeguCanonicalSeatMap';

const BATCH_BLOCK_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const SPECIAL_ZONE_BATCH_BLOCK_KEYS = ['3루4층', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'MR9'];
const SKY_LOWER_BATCH_BLOCK_KEYS = ['U1', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U19'];
const SKY_BLUE_BATCH_BLOCK_KEYS = ['U2', 'U20', 'U21', 'U22', 'U23', 'U24', 'U25', 'U26', 'U27', 'U28', 'U29', 'U30', 'U31'];
const REMAINING_BATCH_BLOCK_KEYS = ['U3', 'U4', 'U5', 'U6', 'U7', 'U8', 'U9', 'V1', 'V2', 'V3', '외야3루측', '우측외야', '중앙외야'];

const RETRACE_BATCH_SOURCE = readFileSync(
  new URL('../../scripts/daegu-seatmap-canonical-retrace-batch.mjs', import.meta.url),
  'utf8',
);
const PACKAGE_JSON = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const RELEASE_LOCK_SOURCE = readFileSync(
  new URL('../../docs/daegu-seatmap-release-lock.md', import.meta.url),
  'utf8',
);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const RETRACE_BATCH_SCRIPT = 'scripts/daegu-seatmap-canonical-retrace-batch.mjs';
const SKY_UPPER_INPUT_JSON = join('operator-input', 'daegu-seatmap-canonical-sky-upper-retrace-input.json');
const SKY_UPPER_GATE_JSON = join('gate', 'daegu-seatmap-canonical-sky-upper-retrace-gate.json');

function runRetraceBatchScript(args: string[], env: Record<string, string>) {
  return spawnSync(
    process.execPath,
    ['--import', 'tsx', RETRACE_BATCH_SCRIPT, ...args],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: 'utf8',
    },
  );
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T;
}

function collectFailureCodes(report: {
  contractValidation?: { failures?: string[] };
  inputShapeValidation?: { failures?: string[] };
  validations?: Array<{ failures?: string }>;
}): string[] {
  return [
    ...(report.contractValidation?.failures ?? []),
    ...(report.inputShapeValidation?.failures ?? []),
    ...(report.validations ?? []).flatMap((row) => row.failures?.split('|').filter(Boolean) ?? []),
  ];
}

function assertFailureCodes(actualCodes: string[], expectedCodes: string[], fixtureName: string) {
  expectedCodes.forEach((expectedCode) => {
    const hasCode = expectedCode.endsWith(':*')
      ? actualCodes.some((actualCode) => actualCode.startsWith(expectedCode.slice(0, -1)))
      : actualCodes.includes(expectedCode);

    assert.ok(hasCode, `${fixtureName} should fail with ${expectedCode}; actual=${actualCodes.join(',')}`);
  });
}

type DaeguCanonicalRetraceInput = {
  operatorReviewContract?: { markerSeatSplitRequired?: string[] };
  sourceDataWritePerformed?: boolean;
  rows: Array<Record<string, unknown> & {
    blockKey: string;
    operatorDecision: string;
    markerSeatSplitRequired?: boolean;
  }>;
};

test('대구 canonical retrace batch는 pending batch 묶음을 보존한다', () => {
  const expectations = [
    [BATCH_BLOCK_KEYS, 10, ['ACCESSIBLE', 'SKY']],
    [SPECIAL_ZONE_BATCH_BLOCK_KEYS, 11, ['OUTFIELD', 'PARTY', 'VIP']],
    [SKY_LOWER_BATCH_BLOCK_KEYS, 11, ['SKY']],
    [SKY_BLUE_BATCH_BLOCK_KEYS, 13, ['ACCESSIBLE', 'BLUE', 'SKY']],
    [REMAINING_BATCH_BLOCK_KEYS, 13, ['OUTFIELD', 'PARTY', 'SKY', 'TABLE']],
  ] as const;

  expectations.forEach(([blockKeys, expectedLength, expectedCategories]) => {
    const rows = DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.filter((row) => blockKeys.includes(row.blockKey));

    assert.deepEqual(rows.map((row) => row.blockKey), blockKeys);
    assert.equal(rows.length, expectedLength);
    assert.equal(rows.every((row) => row.runtimePolygon === false), true);
    assert.equal(rows.every((row) => row.targetCoordinateSystem === 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096'), true);
    assert.deepEqual([...new Set(rows.flatMap((row) => row.categories))].sort(), [...expectedCategories].sort());
  });
});

test('대구 canonical retrace batch script는 source write 없이 operator-reference 직접 trace 계약을 고정한다', () => {
  [
    'DAEGU_CANONICAL_SKY_UPPER_RETRACE_BATCH_V1',
    'SKY_UPPER_01_10',
    'DAEGU_CANONICAL_SPECIAL_ZONE_RETRACE_BATCH_V1',
    'SPECIAL_ZONE_3F4F_M1_MR9',
    'DAEGU_CANONICAL_SKY_LOWER_RETRACE_BATCH_V1',
    'SKY_LOWER_U1_U19',
    'DAEGU_CANONICAL_SKY_BLUE_RETRACE_BATCH_V1',
    'SKY_BLUE_U2_U20_U31',
    'DAEGU_CANONICAL_REMAINING_RETRACE_BATCH_V1',
    'REMAINING_U3_U9_V1_V3_OUTFIELD',
    'DIRECT_OPERATOR_REFERENCE_TRACE_REQUIRED',
    'SIMPLE_SCALE_OR_COPY_FORBIDDEN',
    'MARKER_SEAT_SPLIT_REQUIRED:09',
    'SOURCE_WRITE_FORBIDDEN',
    'sourceDataWritePerformed: false',
    'generatedReportsAreEvidenceOnly: true',
    'operatorReviewContract',
    'DAEGU_CANONICAL_RETRACE_OPERATOR_REVIEW_CONTRACT_V1',
    'productionPromotionRequiresGateStatus',
    'pendingRowsMayContainDraftGeometryButAreIgnoredUntilApproved',
    'OPERATOR_REVIEW_CONTRACT_REQUIRED',
    'OPERATOR_INPUT_SOURCE_WRITE_CHANGED',
    'BATCH_ROW_COUNT_CHANGED',
    'DAEGU_CANONICAL_RETRACE_REPORT_ROOT',
  ].forEach((literal) => {
    assert.match(RETRACE_BATCH_SOURCE, new RegExp(escapeRegExp(literal)));
  });
});

test('대구 canonical retrace gate는 변조된 operator input fixture를 temp-only로 차단한다', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'daegu-canonical-retrace-gate-'));

  try {
    const baseEnv = {
      DAEGU_CANONICAL_RETRACE_REPORT_ROOT: tempRoot,
    };
    const batchResult = runRetraceBatchScript(['batch', 'SKY_UPPER_01_10'], baseEnv);

    assert.equal(batchResult.status, 0, batchResult.stderr || batchResult.stdout);

    const baseInputPath = join(tempRoot, SKY_UPPER_INPUT_JSON);
    const gateJsonPath = join(tempRoot, SKY_UPPER_GATE_JSON);
    const basePayload = readJsonFile<DaeguCanonicalRetraceInput>(baseInputPath);
    const squarePath = 'M 100 100 L 160 100 L 160 160 L 100 160 Z';
    const fixtures = [
      {
        name: 'missing-contract',
        expectedCodes: ['OPERATOR_REVIEW_CONTRACT_REQUIRED'],
        mutate: (payload: typeof basePayload) => {
          delete payload.operatorReviewContract;
        },
      },
      {
        name: 'source-write-tamper',
        expectedCodes: ['OPERATOR_INPUT_SOURCE_WRITE_CHANGED'],
        mutate: (payload: typeof basePayload) => {
          payload.sourceDataWritePerformed = true;
        },
      },
      {
        name: 'row-missing',
        expectedCodes: ['BATCH_ROW_COUNT_CHANGED:*', 'BATCH_ROW_MISSING:*'],
        mutate: (payload: typeof basePayload) => {
          payload.rows = payload.rows.filter((row) => row.blockKey !== '01');
        },
      },
      {
        name: 'marker-split-contract-drift',
        expectedCodes: ['OPERATOR_REVIEW_CONTRACT_MARKER_SPLIT_CHANGED'],
        mutate: (payload: typeof basePayload) => {
          if (payload.operatorReviewContract) {
            payload.operatorReviewContract.markerSeatSplitRequired = [];
          }
        },
      },
      {
        name: 'approved-missing-fields',
        expectedCodes: [
          'CORRECTED_PATH_REQUIRED_FOR_APPROVED_ROW',
          'CORRECTED_HIT_PATH_REQUIRED_FOR_APPROVED_ROW',
          'CORRECTED_LABEL_REQUIRED_FOR_APPROVED_ROW',
        ],
        mutate: (payload: typeof basePayload) => {
          payload.rows[0].operatorDecision = 'APPROVED';
        },
      },
      {
        name: 'marker-note-required',
        expectedCodes: ['MARKER_SEAT_SPLIT_NOTE_REQUIRED'],
        mutate: (payload: typeof basePayload) => {
          const markerRow = payload.rows.find((row) => row.blockKey === '09');
          assert.ok(markerRow, '09 marker split row should exist');
          Object.assign(markerRow, {
            operatorDecision: 'APPROVED',
            correctedPath: squarePath,
            correctedHitPath: squarePath,
            correctedLabelX: 130,
            correctedLabelY: 130,
            reviewer: 'Daegu fixture smoke',
            reviewedAt: '2026-05-30T00:00:00.000Z',
            operatorNote: '',
          });
        },
      },
    ];

    fixtures.forEach((fixture) => {
      const payload = JSON.parse(JSON.stringify(basePayload)) as typeof basePayload;
      const inputPath = join(tempRoot, `${fixture.name}-input.json`);

      fixture.mutate(payload);
      writeFileSync(inputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

      const gateResult = runRetraceBatchScript(['gate', 'SKY_UPPER_01_10'], {
        ...baseEnv,
        DAEGU_CANONICAL_SKY_UPPER_RETRACE_INPUT: inputPath,
      });

      assert.notEqual(gateResult.status, 0, `${fixture.name} should fail`);

      const gateReport = readJsonFile<{
        status: string;
        summary: { invalidRows: number; sourceDataWritePerformed: boolean };
        contractValidation?: { failures?: string[] };
        inputShapeValidation?: { failures?: string[] };
        validations?: Array<{ failures?: string }>;
      }>(gateJsonPath);
      const failureCodes = collectFailureCodes(gateReport);

      assert.equal(gateReport.status, 'failed', `${fixture.name} gate report should fail`);
      assert.equal(gateReport.summary.sourceDataWritePerformed, false, `${fixture.name} should not write source data`);
      assertFailureCodes(failureCodes, fixture.expectedCodes, fixture.name);
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('대구 canonical retrace gate는 temp-only approved fixture에서만 source preview를 허용한다', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'daegu-canonical-retrace-ready-'));

  try {
    const baseEnv = {
      DAEGU_CANONICAL_RETRACE_REPORT_ROOT: tempRoot,
    };
    const batchResult = runRetraceBatchScript(['batch', 'SKY_UPPER_01_10'], baseEnv);

    assert.equal(batchResult.status, 0, batchResult.stderr || batchResult.stdout);

    const baseInputPath = join(tempRoot, SKY_UPPER_INPUT_JSON);
    const gateJsonPath = join(tempRoot, SKY_UPPER_GATE_JSON);
    const basePayload = readJsonFile<DaeguCanonicalRetraceInput>(baseInputPath);
    const pendingRequireApproved = runRetraceBatchScript(['gate', '--require-approved', 'SKY_UPPER_01_10'], baseEnv);

    assert.notEqual(pendingRequireApproved.status, 0, 'pending rows should fail require-approved gate');

    const pendingGateReport = readJsonFile<{
      status: string;
      summary: { pendingRows: number; approvedRows: number; invalidRows: number; sourceDataWritePerformed: boolean };
    }>(gateJsonPath);

    assert.equal(pendingGateReport.status, 'failed');
    assert.equal(pendingGateReport.summary.pendingRows, 10);
    assert.equal(pendingGateReport.summary.approvedRows, 0);
    assert.equal(pendingGateReport.summary.invalidRows, 0);
    assert.equal(pendingGateReport.summary.sourceDataWritePerformed, false);

    const squarePath = 'M 100 100 L 160 100 L 160 160 L 100 160 Z';
    const approvedPayload = JSON.parse(JSON.stringify(basePayload)) as DaeguCanonicalRetraceInput;
    approvedPayload.rows = approvedPayload.rows.map((row) => ({
      ...row,
      operatorDecision: 'APPROVED',
      correctedPath: squarePath,
      correctedHitPath: squarePath,
      correctedLabelX: 130,
      correctedLabelY: 130,
      reviewer: 'Daegu ready fixture smoke',
      reviewedAt: '2026-05-31T00:00:00.000Z',
      operatorNote: row.markerSeatSplitRequired
        ? 'Marker split confirmed; accessibility marker remains outside selectable canonical seat polygon.'
        : 'Operator-approved temp fixture smoke.',
    }));

    const approvedInputPath = join(tempRoot, 'approved-all-input.json');
    writeFileSync(approvedInputPath, `${JSON.stringify(approvedPayload, null, 2)}\n`, 'utf8');

    [
      ['gate', 'SKY_UPPER_01_10'],
      ['gate', '--require-approved', 'SKY_UPPER_01_10'],
    ].forEach((args) => {
      const gateResult = runRetraceBatchScript(args, {
        ...baseEnv,
        DAEGU_CANONICAL_SKY_UPPER_RETRACE_INPUT: approvedInputPath,
      });

      assert.equal(gateResult.status, 0, gateResult.stderr || gateResult.stdout);

      const gateReport = readJsonFile<{
        status: string;
        summary: { pendingRows: number; approvedRows: number; invalidRows: number; sourceDataWritePerformed: boolean };
        contractValidation?: { failures?: string[] };
        inputShapeValidation?: { failures?: string[] };
        validations?: Array<{ failures?: string }>;
      }>(gateJsonPath);
      const failureCodes = collectFailureCodes(gateReport);

      assert.equal(gateReport.status, 'ready-for-source-preview');
      assert.equal(gateReport.summary.pendingRows, 0);
      assert.equal(gateReport.summary.approvedRows, 10);
      assert.equal(gateReport.summary.invalidRows, 0);
      assert.equal(gateReport.summary.sourceDataWritePerformed, false);
      assert.deepEqual(failureCodes, []);
    });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('대구 canonical retrace package/docs 계약은 통합 batch alias만 노출한다', () => {
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-retrace-batch'],
    'node scripts/stadium-seatmap-ops.mjs daegu canonical-retrace-batch',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-retrace-gate'],
    'node scripts/stadium-seatmap-ops.mjs daegu canonical-retrace-gate',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-retrace-gate:require-approved'],
    'node scripts/stadium-seatmap-ops.mjs daegu canonical-retrace-gate:require-approved',
  );

  [
    'stadium:daegu:canonical-sky-upper-retrace-batch',
    'stadium:daegu:canonical-special-zone-retrace-batch',
    'stadium:daegu:canonical-sky-lower-retrace-batch',
    'stadium:daegu:canonical-sky-blue-retrace-batch',
    'stadium:daegu:canonical-remaining-retrace-batch',
  ].forEach((removedAlias) => {
    assert.equal(PACKAGE_JSON.scripts[removedAlias], undefined, `${removedAlias} should be removed`);
  });

  [
    'Canonical retrace batch (2026-05-27)',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_UPPER_01_10',
    'npm run stadium:daegu:canonical-retrace-gate -- SKY_UPPER_01_10',
    'npm run stadium:daegu:canonical-retrace-batch -- SPECIAL_ZONE_3F4F_M1_MR9',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_LOWER_U1_U19',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_BLUE_U2_U20_U31',
    'npm run stadium:daegu:canonical-retrace-batch -- REMAINING_U3_U9_V1_V3_OUTFIELD',
    'Operator input contract verification (2026-05-30)',
    'reports/stadium/daegu-seatmap-canonical-sky-upper-retrace-batch/operator-input/daegu-seatmap-canonical-sky-upper-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-special-zone-retrace-batch/operator-input/daegu-seatmap-canonical-special-zone-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-sky-lower-retrace-batch/operator-input/daegu-seatmap-canonical-sky-lower-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-sky-blue-retrace-batch/operator-input/daegu-seatmap-canonical-sky-blue-retrace-input.json',
    'reports/stadium/daegu-seatmap-canonical-remaining-retrace-batch/operator-input/daegu-seatmap-canonical-remaining-retrace-input.json',
    'operator input JSON carries `operatorReviewContract`',
    'production promotion requires gate status `ready-for-source-preview`',
    '`contract validation` and `input shape validation` both pass',
    'Gate failure fixture smoke (2026-05-30)',
    'DAEGU_CANONICAL_RETRACE_REPORT_ROOT',
    'missing-contract',
    'source-write-tamper',
    'row-missing',
    'marker-split-contract-drift',
    'approved-missing-fields',
    'marker-note-required',
    'OPERATOR_REVIEW_CONTRACT_REQUIRED',
    'OPERATOR_INPUT_SOURCE_WRITE_CHANGED',
    'BATCH_ROW_MISSING:*',
    'MARKER_SEAT_SPLIT_NOTE_REQUIRED',
    'Gate readiness fixture smoke (2026-05-31)',
    'pending input fails `--require-approved`',
    'approved-all temp input reaches `ready-for-source-preview`',
    'generated retrace batch and gate reports are QA evidence only and must not be staged as PR payload',
  ].forEach((literal) => {
    assert.ok(RELEASE_LOCK_SOURCE.includes(literal), `${literal} should be documented`);
  });
});
