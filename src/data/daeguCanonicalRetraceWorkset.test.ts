import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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
  ].forEach((literal) => {
    assert.match(RETRACE_BATCH_SOURCE, new RegExp(escapeRegExp(literal)));
  });
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
    'generated retrace batch and gate reports are QA evidence only and must not be staged as PR payload',
  ].forEach((literal) => {
    assert.ok(RELEASE_LOCK_SOURCE.includes(literal), `${literal} should be documented`);
  });
});
