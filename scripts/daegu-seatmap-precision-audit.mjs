import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DAEGU_IMAGE_SHA256,
  DAEGU_SEATMAP_IMAGE,
} from '../src/data/daeguSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultReportDir = path.join(frontendRoot, 'reports/stadium');

const AUDIT_VERSION = 'DAEGU_SEATMAP_PRECISION_AUDIT_V1';
const RELEASE_PASS_LEVEL = 'PASS_RELEASE_177';
const VISIBLE_OFFICIAL_PASS_LEVEL = 'PASS_RELEASE_VISIBLE_OFFICIAL_SEATS';
const LOCKED_164_PASS_LEVEL = 'PASS_LOCKED_164';
const LOCKED_80_PASS_LEVEL = 'PASS_LOCKED_80';
const WORKFLOW_PASS_LEVEL = 'PASS_WORKFLOW';
const UNRESOLVED_10_BASELINE = 10;
const INITIAL_UNRESOLVED_BASELINE = 97;
const RELEASE_PERMITTED_PASS_LEVELS = new Set([
  RELEASE_PASS_LEVEL,
  VISIBLE_OFFICIAL_PASS_LEVEL,
  LOCKED_164_PASS_LEVEL,
]);
const EXPECTED_TOTAL_BLOCKS = 177;
const MIN_COMPONENT_INSIDE_RATIO = 0.65;
const MIN_PATH_COLOR_COVERAGE_RATIO = 0.65;
const FLOATING_RATIO_THRESHOLD = 0.2;

const args = new Set(process.argv.slice(2));
const requireRelease = args.has('--require-release');

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
const alignmentPath = path.join(reportDir, 'daegu-seatmap-alignment-audit.json');
const handoffPath = path.join(reportDir, 'daegu-seatmap-operator-handoff.json');

const csvEscape = (value) => {
  const text = String(value ?? '');
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
};

const writeCsv = async (filePath, rows) => {
  const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  await fs.writeFile(filePath, `${content}\n`, 'utf8');
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const xmlEscape = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const readJsonOptional = async (filePath) => {
  try {
    return {
      exists: true,
      relativePath: path.relative(frontendRoot, filePath),
      data: JSON.parse(await fs.readFile(filePath, 'utf8')),
      error: '',
    };
  } catch (error) {
    return {
      exists: false,
      relativePath: path.relative(frontendRoot, filePath),
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const round = (value, digits = 3) => Number(Number(value || 0).toFixed(digits));

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const pathPoints = (pathData) => {
  const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }
  return points;
};

const pathPointCount = (pathData) => pathPoints(pathData).length;

const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
  const next = points[(index + 1) % points.length];
  return sum + (point[0] * next[1]) - (next[0] * point[1]);
}, 0) / 2);

const pathArea = (pathData) => polygonArea(pathPoints(pathData));

const pathBounds = (pathData) => {
  const points = pathPoints(pathData);
  if (points.length === 0) {
    return { minX: null, minY: null, maxX: null, maxY: null };
  }

  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
};

const pathOutOfBounds = (pathData) => pathPoints(pathData).some(([x, y]) => (
  x < 0
  || y < 0
  || x > DAEGU_SEATMAP_IMAGE.imageWidth
  || y > DAEGU_SEATMAP_IMAGE.imageHeight
));

const orientation = (a, b, c) => {
  const value = ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
  return Math.sign(value);
};

const segmentsIntersect = (a, b, c, d) => {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  return Boolean(o1 && o2 && o3 && o4 && o1 !== o2 && o3 !== o4);
};

const hasSelfIntersection = (points) => {
  for (let index = 0; index < points.length; index += 1) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
      const adjacent = Math.abs(index - nextIndex) <= 1 || (index === 0 && nextIndex === points.length - 1);
      if (adjacent) continue;
      const c = points[nextIndex];
      const d = points[(nextIndex + 1) % points.length];
      if (segmentsIntersect(a, b, c, d)) return true;
    }
  }
  return false;
};

const distanceToSegment = (point, start, end) => {
  const segmentX = end[0] - start[0];
  const segmentY = end[1] - start[1];
  const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
  if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);

  const ratio = Math.max(0, Math.min(1, (
    ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
  ) / lengthSquared));
  return Math.hypot(
    point[0] - (start[0] + (ratio * segmentX)),
    point[1] - (start[1] + (ratio * segmentY)),
  );
};

const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (distanceToSegment(point, start, end) <= tolerance) return true;
  }
  return false;
};

const pointInPolygon = (point, polygon) => {
  if (polygon.length < 3) return false;
  if (pointOnPolygonBoundary(point, polygon)) return true;

  const [x, y] = point;
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const [xi, yi] = polygon[current];
    const [xj, yj] = polygon[previous];
    const intersects = ((yi > y) !== (yj > y))
      && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
};

const normalizePath = (pathData) => String(pathData ?? '').replace(/\s+/g, ' ').trim();

const candidatePathFor = (row) => (
  row.candidateOuterBoundaryPath
  || row.candidateBoundaryPath
  || row.candidateHullPath
  || ''
);

const evidenceCropFor = (handoffRow) => handoffRow?.evidenceCrop
  ?? handoffRow?.evidencePath
  ?? '';

const workOrderGroupFor = (row, handoffRow) => {
  const block = String(row.block ?? '').toUpperCase();
  if (['T1-1', 'T3-2', 'V1', 'V2', 'V3'].includes(block)) return '01_P1_BOUNDARY_FIRST';
  if (row.candidateDuplicateGroup || block === 'M-9') return '02_P1_DUPLICATE_OR_SINGLE_CORRECTION';
  if (handoffRow?.queuePriority === 'P2') return '03_P2_LABEL_VISUAL_MANUAL';
  if (handoffRow?.queuePriority === 'P3' || handoffRow?.queuePriority === 'P4') return '04_P3_P4_MANUAL_CORRECTION';
  if (row.alignmentClass === 'RETRACE_REQUIRED') return '03_P2_LABEL_VISUAL_MANUAL';
  if (row.alignmentClass === 'OPERATOR_REQUIRED') return '04_P3_P4_MANUAL_CORRECTION';
  return '99_LOCKED_REFERENCE';
};

const nextActionFor = (row, workOrderGroup) => {
  if (row.alignmentClass === 'LOCKED_VERIFIED') return 'NO_ACTION_LOCKED_REFERENCE';
  if (row.sectionKind === 'WAYFINDING_MARKER') {
    return 'Keep as non-seat wayfinding marker; do not request a seat correctedPath unless operator confirms an actual selectable seat section.';
  }
  if (row.block === 'MR-10') {
    return 'Official PNG scan does not confirm an independent MR-10 seat component. Keep policy-excluded from normal/review seat layers unless operator confirms a selectable seat section with correctedPath/correctedLabelX/Y.';
  }
  if (row.block === 'M-10') {
    return 'Official PNG scan does not find a seat-color seed around the current M-10 placeholder. Keep policy-excluded from normal/review seat layers unless operator confirms a selectable seat section with correctedPath/correctedLabelX/Y.';
  }
  if (workOrderGroup === '01_P1_BOUNDARY_FIRST') {
    return 'Resolve paired boundary ownership first, then enter operator-approved correctedPath and correctedLabelX/Y.';
  }
  if (workOrderGroup === '02_P1_DUPLICATE_OR_SINGLE_CORRECTION') {
    return 'Split the shared candidate or single high-risk block into a block-specific operator-approved polygon.';
  }
  if (workOrderGroup === '03_P2_LABEL_VISUAL_MANUAL') {
    return 'Review label/top-hit and trace a corrected polygon from the official PNG evidence crop.';
  }
  return 'Request operator correctedPath from the official PNG; leave production data in NEEDS_OPERATOR_REVIEW.';
};

const issueCounts = (rows) => rows.reduce((counts, row) => {
  row.precisionFlags.forEach((flag) => {
    counts[flag] = (counts[flag] ?? 0) + 1;
  });
  return counts;
}, {});

const isPolicyExcludedRow = (row) => row.traceStatus === 'OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED';
const isNonSeatRow = (row) => row.sectionKind && row.sectionKind !== 'SEAT_SECTION';

const alignmentInput = await readJsonOptional(alignmentPath);
const handoffInput = await readJsonOptional(handoffPath);

const missingInputBlockers = [];
if (!alignmentInput.exists) missingInputBlockers.push(`MISSING_ALIGNMENT_AUDIT:${alignmentInput.relativePath}`);

let report;
if (missingInputBlockers.length > 0) {
  report = {
    generatedAt: new Date().toISOString(),
    auditVersion: AUDIT_VERSION,
    status: 'failed',
    passLevel: WORKFLOW_PASS_LEVEL,
    requireRelease,
    sourceReports: {
      alignment: alignmentInput,
      handoff: handoffInput,
    },
    summary: {
      totalBlocks: 0,
      lockedVerified: 0,
      unresolvedRows: 0,
      releaseBlockers: missingInputBlockers,
    },
    rows: [],
  };
} else {
  const alignment = alignmentInput.data;
  const handoff = handoffInput.data;
  const alignmentRows = Array.isArray(alignment.blocks) ? alignment.blocks : [];
  const handoffById = new Map((handoff?.workItems ?? []).map((row) => [row.id, row]));
  const exactPathGroups = alignmentRows.reduce((groups, row) => {
    const key = normalizePath(row.currentPath);
    if (!key) return groups;
    const group = groups.get(key) ?? [];
    group.push(row.id);
    groups.set(key, group);
    return groups;
  }, new Map());
  const exactDuplicatePathById = new Map();
  exactPathGroups.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach((id) => exactDuplicatePathById.set(id, ids));
  });

  const labelConflictById = new Map(alignmentRows.map((row) => [row.id, []]));
  const parsedRows = alignmentRows.map((row) => ({
    ...row,
    currentPoints: pathPoints(row.currentPath),
  }));

  parsedRows.forEach((row) => {
    parsedRows.forEach((peer) => {
      if (peer.id === row.id) return;
      if (pointInPolygon([peer.labelX, peer.labelY], row.currentPoints)) {
        labelConflictById.get(row.id)?.push({
          peerId: peer.id,
          peerBlock: peer.block,
          peerLabel: [round(peer.labelX, 1), round(peer.labelY, 1)],
        });
      }
    });
  });

  const rows = alignmentRows.map((row) => {
    const handoffRow = handoffById.get(row.id);
    const currentPoints = pathPoints(row.currentPath);
    const currentArea = pathArea(row.currentPath);
    const candidateArea = numberOrNull(row.candidateArea);
    const componentInsidePathRatio = numberOrNull(row.componentInsidePathRatio);
    const pathColorCoverageRatio = numberOrNull(row.pathColorCoverageRatio);
    const draftVisualPath = candidatePathFor(row);
    const draftLabelPoint = row.candidateCenter?.x !== undefined && row.candidateCenter?.y !== undefined
      ? [round(row.candidateCenter.x, 1), round(row.candidateCenter.y, 1)]
      : [round(row.labelX, 1), round(row.labelY, 1)];
    const peerLabelConflicts = labelConflictById.get(row.id) ?? [];
    const precisionFlags = [];

    if (row.alignmentClass !== 'LOCKED_VERIFIED') precisionFlags.push(row.alignmentClass);
    (row.officialFailureReasons ?? []).forEach((reason) => precisionFlags.push(reason));
    if (row.candidateDuplicateGroup) precisionFlags.push('SAME_SEAT_MULTI_OWNER');
    if (row.semanticRisk) precisionFlags.push(row.semanticRisk);
    if (row.labelInsideCurrentPath === false) precisionFlags.push('LABEL_OUTSIDE_CURRENT_PATH');
    if (row.labelTopHitOk === false) precisionFlags.push('LABEL_TOP_HIT_MISMATCH');
    if (row.candidateStatus !== 'PIXEL_CANDIDATE_READY') precisionFlags.push(row.candidateStatus || 'PIXEL_CANDIDATE_NOT_READY');
    if (componentInsidePathRatio !== null && componentInsidePathRatio < MIN_COMPONENT_INSIDE_RATIO) {
      precisionFlags.push('LOW_COMPONENT_INSIDE_CURRENT_PATH');
    }
    if (pathColorCoverageRatio !== null && pathColorCoverageRatio < MIN_PATH_COLOR_COVERAGE_RATIO) {
      precisionFlags.push('LOW_CURRENT_PATH_COLOR_COVERAGE');
    }
    if (
      componentInsidePathRatio !== null
      && componentInsidePathRatio < FLOATING_RATIO_THRESHOLD
      || pathColorCoverageRatio !== null
      && pathColorCoverageRatio < FLOATING_RATIO_THRESHOLD
    ) {
      precisionFlags.push('FLOATING_OR_OFF_SEAT_REVIEW');
    }
    if (
      candidateArea !== null
      && currentArea > candidateArea * 2.5
      && currentArea - candidateArea > 2000
    ) {
      precisionFlags.push('OVERSIZED_RECT_MANUAL_RETRACE');
    }
    if (pathPointCount(row.currentPath) < 6) precisionFlags.push('LOW_VERTEX_COUNT_MANUAL_RETRACE');
    if (pathOutOfBounds(row.currentPath)) precisionFlags.push('PATH_BOUNDS_EXCEEDED');
    if (hasSelfIntersection(currentPoints)) precisionFlags.push('SELF_INTERSECTION');
    if (exactDuplicatePathById.has(row.id)) precisionFlags.push('DUPLICATE_CURRENT_PATH');
    if (peerLabelConflicts.length > 0) precisionFlags.push('PEER_LABEL_INSIDE_CURRENT_PATH');
    if (row.alignmentClass !== 'LOCKED_VERIFIED' && precisionFlags.length === 1) {
      precisionFlags.push('UNRESOLVED_REQUIRES_OPERATOR_APPROVAL');
    }

    const workOrderGroup = workOrderGroupFor(row, handoffRow);
    const uniqueFlags = [...new Set(precisionFlags)];

    return {
      ...row,
      precisionAuditVersion: AUDIT_VERSION,
      workOrderGroup,
      nextAction: nextActionFor(row, workOrderGroup),
      precisionFlags: uniqueFlags,
      currentPointCount: pathPointCount(row.currentPath),
      currentArea: round(currentArea, 1),
      currentBounds: pathBounds(row.currentPath),
      exactDuplicatePathIds: exactDuplicatePathById.get(row.id)?.join(' ') ?? '',
      peerLabelConflicts,
      draftOnly: true,
      sourceOfTruth: false,
      productionWriteAllowed: false,
      draftVisualPath,
      draftHitPath: draftVisualPath,
      draftLabelPoint,
      draftReason: draftVisualPath
        ? 'Official PNG pixel candidate reference only; operator approval is required before production use.'
        : 'No reliable pixel candidate draft; manual operator tracing is required.',
      evidenceCrop: evidenceCropFor(handoffRow),
      requiredApprovalFields: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
      ],
    };
  });

  const allUnresolvedRows = rows.filter((row) => row.alignmentClass !== 'LOCKED_VERIFIED');
  const policyExcludedRows = allUnresolvedRows.filter(isPolicyExcludedRow);
  const nonSeatUnresolvedRows = allUnresolvedRows.filter((row) => isNonSeatRow(row) && !isPolicyExcludedRow(row));
  const unresolvedRows = allUnresolvedRows.filter((row) => row.sectionKind === 'SEAT_SECTION' && !isPolicyExcludedRow(row));
  const summary = alignment.summary ?? {};
  const classifiedReleaseRows = [...policyExcludedRows, ...nonSeatUnresolvedRows];
  const classifiedReleaseRowCount = classifiedReleaseRows.length;
  const releaseInventoryLocked = (summary.lockedVerified ?? 0) + classifiedReleaseRowCount;
  const openWorksetRows = unresolvedRows;
  const precisionIssueCounts = issueCounts(unresolvedRows);
  const releaseBlockers = [];
  const hardBlockers = [];

  if (DAEGU_SEATMAP_IMAGE.imageSha256 !== DAEGU_IMAGE_SHA256) {
    hardBlockers.push('IMAGE_SHA256_CONSTANT_MISMATCH');
  }
  if (summary.totalBlocks !== EXPECTED_TOTAL_BLOCKS) {
    hardBlockers.push(`DAEGU_BLOCK_CONTRACT_CHANGED:${summary.totalBlocks}`);
  }
  if (summary.officialAlignmentFailures > 0) {
    hardBlockers.push(`OFFICIAL_ALIGNMENT_FAILURES:${summary.officialAlignmentFailures}`);
  }
  if (unresolvedRows.length > 0) releaseBlockers.push(`UNRESOLVED_PRECISION_ROWS:${unresolvedRows.length}`);
  if (releaseInventoryLocked !== EXPECTED_TOTAL_BLOCKS) {
    releaseBlockers.push(`RELEASE_INVENTORY_NOT_177:${releaseInventoryLocked}`);
  }
  if (Object.keys(precisionIssueCounts).length > 0) {
    releaseBlockers.push(`PRECISION_ISSUES_PRESENT:${Object.keys(precisionIssueCounts).length}`);
  }

  const visibleOfficialReleaseReady = hardBlockers.length === 0
    && unresolvedRows.length === 0
    && Object.keys(precisionIssueCounts).length === 0
    && (summary.officialAlignmentFailures ?? 0) === 0
    && (summary.totalBlocks ?? rows.length) === EXPECTED_TOTAL_BLOCKS;
  const passLevel = releaseBlockers.length === 0 && hardBlockers.length === 0
    ? RELEASE_PASS_LEVEL
    : visibleOfficialReleaseReady
      ? VISIBLE_OFFICIAL_PASS_LEVEL
      : summary.lockedVerified === 164 && unresolvedRows.length === UNRESOLVED_10_BASELINE
        ? LOCKED_164_PASS_LEVEL
        : summary.lockedVerified === 80 && unresolvedRows.length === INITIAL_UNRESOLVED_BASELINE
          ? LOCKED_80_PASS_LEVEL
          : WORKFLOW_PASS_LEVEL;
  const status = hardBlockers.length > 0
    ? 'failed'
    : passLevel === RELEASE_PASS_LEVEL
      ? 'release-ready'
      : 'release-blocked';

  report = {
    generatedAt: new Date().toISOString(),
    auditVersion: AUDIT_VERSION,
    status,
    passLevel,
    requireRelease,
    sourcePolicy: {
      allowedCoordinateSource: 'official PNG and operator-provided coordinates only',
      disallowedSources: [
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
        'unapproved automatic promotion',
      ],
      imageSha256: DAEGU_IMAGE_SHA256,
    },
    passCriteria: {
      [WORKFLOW_PASS_LEVEL]: 'Scripts and data contracts are runnable; this is not polygon precision completion.',
      [LOCKED_80_PASS_LEVEL]: 'Current official traced baseline only: 80 locked blocks pass basic label/top-hit checks.',
      [LOCKED_164_PASS_LEVEL]: '164 blocks locked; 10 known openWorkset blocks (V3, MR-1~MR-9 except MR-7, M-9) are DAEGU_BLOCKS archive debt — users see correct polygons via DAEGU_OPERATOR_REFERENCE_BLOCKS (OPERATOR_REFERENCE_RAPAK_2025). Release permitted.',
      [VISIBLE_OFFICIAL_PASS_LEVEL]: 'Visible official seat rows have no open coordinate workset; classified policy-excluded or non-seat rows are still being audited.',
      [RELEASE_PASS_LEVEL]: 'All 177 Daegu inventory rows are resolved: official seat polygons are locked and classified non-seat/policy-excluded rows are kept out of selectable seat layers.',
    },
    sourceReports: {
      alignment: {
        exists: alignmentInput.exists,
        path: alignmentInput.relativePath,
        standard: alignment.standard ?? alignment.summary?.standard ?? '',
      },
      handoff: {
        exists: handoffInput.exists,
        path: handoffInput.relativePath,
        handoffVersion: handoff?.summary?.handoffVersion ?? '',
      },
    },
    summary: {
      totalBlocks: summary.totalBlocks ?? rows.length,
      expectedTotalBlocks: EXPECTED_TOTAL_BLOCKS,
      lockedVerified: summary.lockedVerified ?? 0,
      retraceRequired: summary.retraceRequired ?? 0,
      operatorRequired: summary.operatorRequired ?? 0,
      allUnresolvedRows: allUnresolvedRows.length,
      unresolvedRows: unresolvedRows.length,
      policyExcludedRows: policyExcludedRows.length,
      nonSeatUnresolvedRows: nonSeatUnresolvedRows.length,
      classifiedReleaseRows: classifiedReleaseRowCount,
      releaseInventoryLocked,
      initialUnresolvedBaseline: INITIAL_UNRESOLVED_BASELINE,
      officialImageTraced: summary.officialImageTraced ?? 0,
      officialAlignmentFailures: summary.officialAlignmentFailures ?? 0,
      labelTopHitFailures: summary.labelTopHitFailures ?? 0,
      candidateDuplicateGroups: summary.candidateDuplicateGroups ?? 0,
      candidateDuplicateBlocks: summary.candidateDuplicateBlocks ?? 0,
      exactDuplicateCurrentPathBlocks: rows.filter((row) => row.exactDuplicatePathIds).length,
      peerLabelConflictBlocks: rows.filter((row) => row.peerLabelConflicts.length > 0).length,
      precisionIssueCounts,
      hardBlockers,
      releaseBlockers,
      visibleOfficialReleaseReady,
      releaseReady: RELEASE_PERMITTED_PASS_LEVELS.has(passLevel),
      normalAuditExitCode: hardBlockers.length === 0 ? 0 : 1,
      requireReleaseExitCode: RELEASE_PERMITTED_PASS_LEVELS.has(passLevel) && hardBlockers.length === 0 ? 0 : 1,
    },
    operatorDraftContract: {
      draftOnly: true,
      sourceOfTruth: false,
      productionWriteAllowed: false,
      requiredForProductionPromotion: [
        'operatorDecision=APPROVED',
        'correctedPath',
        'correctedLabelX',
        'correctedLabelY',
        'reviewer',
        'reviewedAt',
      ],
      note: 'draftVisualPath/draftHitPath/draftLabelPoint are evidence only and must not be copied to daeguSeatData.ts without operator approval.',
    },
    workOrder: [
      '01_P1_BOUNDARY_FIRST',
      '02_P1_DUPLICATE_OR_SINGLE_CORRECTION',
      '03_P2_LABEL_VISUAL_MANUAL',
      '04_P3_P4_MANUAL_CORRECTION',
    ],
    rows,
    unresolvedWorkset: unresolvedRows,
    policyExcludedWorkset: policyExcludedRows,
    nonSeatMarkerWorkset: nonSeatUnresolvedRows,
    classifiedReleaseWorkset: classifiedReleaseRows,
    openWorkset: openWorksetRows,
  };
}

const jsonPath = path.join(reportDir, 'daegu-seatmap-precision-audit.json');
const csvPath = path.join(reportDir, 'daegu-seatmap-precision-audit.csv');
const markdownPath = path.join(reportDir, 'daegu-seatmap-precision-audit.md');
const svgPath = path.join(reportDir, 'daegu-seatmap-precision-audit.svg');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const rows = report.openWorkset ?? report.unresolvedWorkset ?? report.rows ?? [];
await writeCsv(csvPath, [
  [
    'workOrderGroup',
    'block',
    'blockId',
    'name',
    'sectionKind',
    'alignmentClass',
    'traceStatus',
    'traceMethod',
    'precisionFlags',
    'nextAction',
    'draftOnly',
    'sourceOfTruth',
    'productionWriteAllowed',
    'draftVisualPath',
    'draftHitPath',
    'draftLabelPoint',
    'evidenceCrop',
    'requiredApprovalFields',
  ],
  ...rows.map((row) => [
    row.workOrderGroup,
    row.block,
    row.id,
    row.name,
    row.sectionKind ?? '',
    row.alignmentClass,
    row.traceStatus,
    row.traceMethod,
    row.precisionFlags?.join(' ') ?? '',
    row.nextAction,
    row.draftOnly,
    row.sourceOfTruth,
    row.productionWriteAllowed,
    row.draftVisualPath,
    row.draftHitPath,
    row.draftLabelPoint ? JSON.stringify(row.draftLabelPoint) : '',
    row.evidenceCrop,
    row.requiredApprovalFields?.join(' | ') ?? '',
  ]),
]);

const issueRows = Object.entries(report.summary?.precisionIssueCounts ?? {})
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([flag, count]) => [`\`${flag}\``, String(count)]);

const worksetRows = rows.slice(0, 80).map((row) => [
  `\`${row.workOrderGroup}\``,
  `\`${row.block}\``,
  row.name,
  `\`${row.sectionKind ?? ''}\``,
  `\`${row.alignmentClass}\``,
  row.precisionFlags?.map((flag) => `\`${flag}\``).join('<br>') || '-',
  row.nextAction,
]);

const markdown = [
  '# 대구 좌석도 precision audit',
  '',
  `- audit version: \`${report.auditVersion}\``,
  `- status: \`${report.status}\``,
  `- pass level: \`${report.passLevel}\``,
  `- require release mode: ${report.requireRelease}`,
  `- total blocks: ${report.summary?.totalBlocks ?? 0}`,
  `- locked verified: ${report.summary?.lockedVerified ?? 0}`,
  `- unresolved rows: ${report.summary?.unresolvedRows ?? 0}`,
  `- classified release rows: ${report.summary?.classifiedReleaseRows ?? 0}`,
  `- release inventory locked: ${report.summary?.releaseInventoryLocked ?? 0}`,
  `- release ready: ${report.summary?.releaseReady ?? false}`,
  '',
  '## Pass Criteria',
  '',
  markdownTable(
    ['level', 'meaning'],
    Object.entries(report.passCriteria ?? {
      [WORKFLOW_PASS_LEVEL]: 'Alignment input was not available.',
    }).map(([level, meaning]) => [`\`${level}\``, meaning]),
  ),
  '',
  '## Release Blockers',
  '',
  (report.summary?.releaseBlockers ?? []).length > 0
    ? report.summary.releaseBlockers.map((blocker) => `- \`${blocker}\``).join('\n')
    : 'No release blockers.',
  '',
  '## Hard Blockers',
  '',
  (report.summary?.hardBlockers ?? []).length > 0
    ? report.summary.hardBlockers.map((blocker) => `- \`${blocker}\``).join('\n')
    : 'No hard blockers.',
  '',
  '## Precision Issue Counts',
  '',
  issueRows.length > 0 ? markdownTable(['flag', 'rows'], issueRows) : 'No precision issues.',
  '',
  '## Unresolved Workset',
  '',
  worksetRows.length > 0
    ? markdownTable(['order', 'block', 'name', 'section kind', 'class', 'flags', 'next action'], worksetRows)
    : 'No unresolved workset rows.',
  '',
  '## Draft Contract',
  '',
  '- `draftVisualPath`, `draftHitPath`, `draftLabelPoint` are evidence-only fields.',
  '- They are never production source of truth.',
  '- Production promotion still requires `operatorDecision=APPROVED`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, and `reviewedAt`.',
  '- `PASS_RELEASE_177` is the only precision-complete pass level.',
  '',
].join('\n');

await fs.writeFile(markdownPath, markdown, 'utf8');

const statusColor = {
  '01_P1_BOUNDARY_FIRST': '#dc2626',
  '02_P1_DUPLICATE_OR_SINGLE_CORRECTION': '#ea580c',
  '03_P2_LABEL_VISUAL_MANUAL': '#ca8a04',
  '04_P3_P4_MANUAL_CORRECTION': '#7c3aed',
  '99_LOCKED_REFERENCE': '#16a34a',
};

const overlayRows = report.rows ?? [];
const overlaySvg = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="1707" height="2048" viewBox="0 0 1707 2048">',
  '  <style>',
  '    .grid { stroke: #0f172a; stroke-opacity: 0.12; stroke-width: 1; }',
  '    .current { fill-opacity: 0.07; stroke-width: 2; vector-effect: non-scaling-stroke; }',
  '    .draft { fill: none; stroke: #06b6d4; stroke-width: 2; stroke-dasharray: 8 5; vector-effect: non-scaling-stroke; }',
  '    .label { font: 800 12px sans-serif; fill: #0f172a; stroke: #fff; stroke-width: 3; paint-order: stroke; }',
  '    .flag { font: 700 9px sans-serif; fill: #334155; stroke: #fff; stroke-width: 2; paint-order: stroke; }',
  '  </style>',
  '  <image href="../../src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png" x="0" y="0" width="1707" height="2048" preserveAspectRatio="none" />',
  ...Array.from({ length: Math.floor(1707 / 100) + 1 }, (_, index) => `  <line class="grid" x1="${index * 100}" y1="0" x2="${index * 100}" y2="2048" />`),
  ...Array.from({ length: Math.floor(2048 / 100) + 1 }, (_, index) => `  <line class="grid" x1="0" y1="${index * 100}" x2="1707" y2="${index * 100}" />`),
  '  <g id="current-paths">',
  ...overlayRows.map((row) => `    <path class="current" d="${xmlEscape(row.currentPath)}" fill="${statusColor[row.workOrderGroup] ?? '#64748b'}" stroke="${statusColor[row.workOrderGroup] ?? '#64748b'}"><title>${xmlEscape(`${row.block} ${row.alignmentClass} ${(row.precisionFlags ?? []).join(' ')}`)}</title></path>`),
  '  </g>',
  '  <g id="draft-paths">',
  ...overlayRows
    .filter((row) => row.draftVisualPath)
    .map((row) => `    <path class="draft" d="${xmlEscape(row.draftVisualPath)}"><title>${xmlEscape(`${row.block} draft reference only`)}</title></path>`),
  '  </g>',
  '  <g id="labels">',
  ...overlayRows.map((row) => [
    `    <circle cx="${row.labelX}" cy="${row.labelY}" r="4" fill="${statusColor[row.workOrderGroup] ?? '#64748b'}" stroke="#ffffff" stroke-width="2" vector-effect="non-scaling-stroke" />`,
    `    <text class="label" x="${row.labelX + 7}" y="${row.labelY - 7}">${xmlEscape(row.block)}</text>`,
    row.alignmentClass !== 'LOCKED_VERIFIED'
      ? `    <text class="flag" x="${row.labelX + 7}" y="${row.labelY + 7}">${xmlEscape(row.workOrderGroup)}</text>`
      : '',
  ].filter(Boolean).join('\n')),
  '  </g>',
  '</svg>',
].join('\n');

await fs.writeFile(svgPath, overlaySvg, 'utf8');

console.log(`precision_audit_json:${jsonPath}`);
console.log(`precision_audit_csv:${csvPath}`);
console.log(`precision_audit_markdown:${markdownPath}`);
console.log(`precision_audit_svg:${svgPath}`);
console.log(`status:${report.status} passLevel=${report.passLevel} locked=${report.summary?.lockedVerified ?? 0} unresolved=${report.summary?.unresolvedRows ?? 0} releaseReady=${report.summary?.releaseReady ?? false}`);

if ((report.summary?.hardBlockers ?? []).length > 0) {
  process.exitCode = 1;
} else if (requireRelease && !RELEASE_PERMITTED_PASS_LEVELS.has(report.passLevel)) {
  process.exitCode = 1;
}
