import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS } from './daeguCanonicalSeatMap';

const BATCH_BLOCK_KEYS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
const SPECIAL_ZONE_BATCH_BLOCK_KEYS = ['3루4층', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'MR9'];

const RETRACE_BATCH_SOURCE = readFileSync(
  new URL('../../scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs', import.meta.url),
  'utf8',
);
const PACKAGE_JSON = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const RELEASE_LOCK_SOURCE = readFileSync(
  new URL('../../docs/daegu-seatmap-release-lock.md', import.meta.url),
  'utf8',
);

test('대구 canonical SKY 상단 retrace batch는 pending 01~10만 대상으로 한다', () => {
  const rows = DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.filter((row) => BATCH_BLOCK_KEYS.includes(row.blockKey));

  assert.deepEqual(rows.map((row) => row.blockKey), BATCH_BLOCK_KEYS);
  assert.equal(rows.length, 10);
  assert.equal(rows.every((row) => row.runtimePolygon === false), true);
  assert.equal(rows.every((row) => row.targetCoordinateSystem === 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096'), true);
  assert.equal(rows.every((row) => row.sourceCoordinateSystem === 'SAMSUNG_OFFICIAL_2026_1707x2048'), true);

  const markerSplitRow = rows.find((row) => row.blockKey === '09');
  assert.ok(markerSplitRow);
  assert.deepEqual(markerSplitRow.sectionKinds, ['ACCESSIBILITY_MARKER', 'SEAT_SECTION']);
  assert.deepEqual(markerSplitRow.categories, ['ACCESSIBLE', 'SKY']);
});

test('대구 canonical special zone retrace batch는 pending table/VIP/outfield 11개만 대상으로 한다', () => {
  const rows = DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.filter((row) => SPECIAL_ZONE_BATCH_BLOCK_KEYS.includes(row.blockKey));

  assert.deepEqual(rows.map((row) => row.blockKey), SPECIAL_ZONE_BATCH_BLOCK_KEYS);
  assert.equal(rows.length, 11);
  assert.equal(rows.every((row) => row.runtimePolygon === false), true);
  assert.equal(rows.every((row) => row.targetCoordinateSystem === 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096'), true);
  assert.equal(rows.every((row) => row.sectionKinds.length === 1 && row.sectionKinds[0] === 'SEAT_SECTION'), true);
  assert.deepEqual([...new Set(rows.flatMap((row) => row.categories))].sort(), ['OUTFIELD', 'PARTY', 'VIP']);
});

test('대구 canonical retrace batch script는 source write 없이 operator-reference 직접 trace 계약을 고정한다', () => {
  [
    'DAEGU_CANONICAL_SKY_UPPER_RETRACE_BATCH_V1',
    'SKY_UPPER_01_10',
    'DAEGU_CANONICAL_SPECIAL_ZONE_RETRACE_BATCH_V1',
    'SPECIAL_ZONE_3F4F_M1_MR9',
    'DIRECT_OPERATOR_REFERENCE_TRACE_REQUIRED',
    'SIMPLE_SCALE_OR_COPY_FORBIDDEN',
    'MARKER_SEAT_SPLIT_REQUIRED:09',
    'CORRECTED_PATH_REQUIRED_FOR_APPROVED_ROW',
    'CORRECTED_HIT_PATH_REQUIRED_FOR_APPROVED_ROW',
    'CORRECTED_LABEL_REQUIRED_FOR_APPROVED_ROW',
    'SOURCE_WRITE_FORBIDDEN',
    'PASS_TARGET_188_REMAINS_PENDING',
    'sourceDataWritePerformed: false',
    'generatedReportsAreEvidenceOnly: true',
    'daegu-seatmap-canonical-sky-upper-retrace-batch',
    'daegu-seatmap-canonical-sky-upper-retrace',
    'daegu-seatmap-canonical-special-zone-retrace-batch',
    'daegu-seatmap-canonical-special-zone-retrace',
  ].forEach((literal) => {
    assert.match(RETRACE_BATCH_SOURCE, new RegExp(literal.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  });
});

test('대구 canonical retrace package/docs 계약은 generated report를 evidence-only로 유지한다', () => {
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-sky-upper-retrace-batch'],
    'node --import tsx scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs batch',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-sky-upper-retrace-gate'],
    'node --import tsx scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs gate',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-sky-upper-retrace-gate:require-approved'],
    'node --import tsx scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs gate --require-approved',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-special-zone-retrace-batch'],
    'node --import tsx scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs batch SPECIAL_ZONE_3F4F_M1_MR9',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-special-zone-retrace-gate'],
    'node --import tsx scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs gate SPECIAL_ZONE_3F4F_M1_MR9',
  );
  assert.equal(
    PACKAGE_JSON.scripts['stadium:daegu:canonical-special-zone-retrace-gate:require-approved'],
    'node --import tsx scripts/daegu-seatmap-canonical-sky-upper-retrace-batch.mjs gate SPECIAL_ZONE_3F4F_M1_MR9 --require-approved',
  );

  [
    'Canonical SKY upper retrace batch (2026-05-27)',
    'SKY_UPPER_01_10',
    'reports/stadium/daegu-seatmap-canonical-sky-upper-retrace-batch/',
    'marker/seat split row: `09`',
    'simple scale/copy from `1707x2048` official PNG to `4096x4096` operator reference is forbidden',
    'source data write performed: `false`',
    'generated SKY upper batch and gate reports are QA evidence only and must not be staged as PR payload',
    'Canonical special zone retrace batch (2026-05-27)',
    'SPECIAL_ZONE_3F4F_M1_MR9',
    'reports/stadium/daegu-seatmap-canonical-special-zone-retrace-batch/',
    'marker/seat split rows: `0`',
    'generated special-zone batch and gate reports are QA evidence only and must not be staged as PR payload',
  ].forEach((literal) => {
    assert.ok(RELEASE_LOCK_SOURCE.includes(literal), `${literal} should be documented`);
  });
});
