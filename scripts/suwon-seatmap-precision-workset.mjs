import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BLOCKS,
  SUWON_BROWSER_QA_PROBES,
  SUWON_HIT_GEOMETRY_EXCEPTION_NOTES,
} from '../src/data/suwonSeatData.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const sourceManifestPath = path.join(reportDir, 'suwon-seatmap-visual-review.json');
const worksetJsonPath = path.join(reportDir, 'suwon-seatmap-precision-workset.json');
const worksetMarkdownPath = path.join(reportDir, 'suwon-seatmap-precision-workset.md');

const EXPECTED_WORKSET_BLOCKS = 176;
const EXPECTED_REVIEW_GROUPS = 8;

const REQUIRED_P0_BLOCK_IDS = [
  'suwon-lf-grass',
  'suwon-rf-grass',
  'suwon-7pub',
  'suwon-k-live',
  'suwon-green',
  'suwon-501-508',
  'suwon-hite-pub',
  'suwon-kids-camp',
  'suwon-wiz-garden',
];

const REQUIRED_P1_BLOCK_IDS = [
  'suwon-3b-highfive',
  'suwon-1b-highfive',
  ...Array.from({ length: 11 }, (_, index) => `suwon-${205 + index}`),
];

const REQUIRED_P2_BLOCK_IDS = [
  'suwon-216',
  'suwon-217',
  'suwon-218',
  'suwon-313',
  'suwon-314',
  'suwon-315',
  'suwon-316',
  'suwon-genie',
  'suwon-wheel-center',
  'suwon-wheel-1b',
  'suwon-wheel-3b',
];

const REVIEW_GROUP_LABELS = new Map([
  ['infield-1f', '1층 내야/응원/중앙'],
  ['infield-2f', '2층 내야 잔여 구역'],
  ['infield-3f', '3층 내야/중앙'],
  ['center-accessible', '지니존/휠체어석'],
  ['outfield-special', '외야 특수석/잔디석'],
  ['highfive', '하이파이브존'],
  ['section-205-215', '205-215 내야 경계'],
  ['skybox-skyzone', '스카이박스/스카이존'],
]);

const WORKSET_PRIORITY_DEFINITIONS = [
  {
    id: 'P0',
    label: '외야 특수석/잔디석',
    objective: '큰 polygon과 인접 특수석 경계가 많은 상단 외야 구역을 우선 육안 재검수합니다.',
    blockIds: REQUIRED_P0_BLOCK_IDS,
    candidateStatus: 'manual-retrace-candidate',
  },
  {
    id: 'P1',
    label: '하이파이브존/205-215',
    objective: '공식 이미지 선과 조금만 밀려도 눈에 띄는 하이파이브존과 205-215 사선 구역을 우선 검수합니다.',
    blockIds: REQUIRED_P1_BLOCK_IDS,
    candidateStatus: 'manual-retrace-candidate',
  },
  {
    id: 'P2',
    label: '중앙 하단/휠체어/지니존',
    objective: '기존 클릭 충돌을 줄인 중앙 하단 구역을 visual polygon 기준으로 재확인합니다.',
    blockIds: REQUIRED_P2_BLOCK_IDS,
    candidateStatus: 'manual-retrace-candidate',
  },
];

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const blockById = new Map(SUWON_BLOCKS.map((block) => [block.id, block]));
const browserProbeCountById = new Map();
const alignmentProbeCountById = new Map();

SUWON_BROWSER_QA_PROBES.forEach((probe) => {
  browserProbeCountById.set(probe.id, (browserProbeCountById.get(probe.id) ?? 0) + 1);
});

SUWON_ALIGNMENT_PROBES.forEach((probe) => {
  alignmentProbeCountById.set(probe.id, (alignmentProbeCountById.get(probe.id) ?? 0) + 1);
});

function numericBlockNumber(id) {
  const match = id.match(/^suwon-(\d+)$/);
  return match ? Number(match[1]) : null;
}

function isSkyboxOrSkyzone(id) {
  return /^suwon-sb\d+$/.test(id) || /^suwon-4\d\d$/.test(id);
}

function classifyDefaultPriority(id) {
  if (isSkyboxOrSkyzone(id)) {
    return {
      priority: 'LOCKED',
      candidateStatus: 'locked-review-reference',
      reviewFocus: 'SB compact hit-area와 401-432 스카이존은 현재 release gate 계약으로 잠겨 있어 회귀 감시 대상으로 유지합니다.',
    };
  }

  const blockNumber = numericBlockNumber(id);
  if (blockNumber && ((blockNumber >= 101 && blockNumber <= 204) || (blockNumber >= 219 && blockNumber <= 312) || (blockNumber >= 317 && blockNumber <= 328))) {
    return {
      priority: 'P3',
      candidateStatus: 'baseline-sweep',
      reviewFocus: '1층/2층/3층 숫자 블록은 overlay 기반 미세 보정 후보만 선별합니다.',
    };
  }

  return {
    priority: 'LOCKED',
    candidateStatus: 'locked-review-reference',
    reviewFocus: '현재 release gate와 probe 계약을 유지하며 사람이 발견한 mismatch가 있을 때만 targeted adjustment를 엽니다.',
  };
}

function blockRowFromVisualRow(row, priorityDefinition) {
  const block = blockById.get(row.id);
  const fallback = classifyDefaultPriority(row.id);
  return {
    priority: priorityDefinition?.id ?? fallback.priority,
    candidateStatus: priorityDefinition?.candidateStatus ?? fallback.candidateStatus,
    groupId: row.groupId,
    groupLabel: REVIEW_GROUP_LABELS.get(row.groupId) ?? row.groupId,
    id: row.id,
    block: row.block,
    name: row.name,
    category: row.category,
    pointCount: row.pointCount,
    area: row.area,
    bounds: row.bounds,
    browserQaProbes: row.browserQaProbes ?? browserProbeCountById.get(row.id) ?? 0,
    alignmentProbes: row.alignmentProbes ?? alignmentProbeCountById.get(row.id) ?? 0,
    reviewFlags: row.reviewFlags ?? [],
    approvalFlags: row.approvalFlags ?? [],
    visualHitSplitApproved: Boolean(row.visualHitSplitApproved),
    hitExceptionNote: SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[row.id] ?? '',
    officialBlocks: block?.officialBlocks ?? [],
    reviewFocus: priorityDefinition?.objective ?? fallback.reviewFocus,
  };
}

function sortRows(rows) {
  return [...rows].sort((a, b) => {
    const aNumber = numericBlockNumber(a.id);
    const bNumber = numericBlockNumber(b.id);
    if (a.priority !== b.priority) return a.priority.localeCompare(b.priority);
    if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
    return a.id.localeCompare(b.id);
  });
}

const sourceManifest = JSON.parse(await fs.readFile(sourceManifestPath, 'utf8'));
const sourceRows = sourceManifest.rows ?? [];
const sourceRowsById = new Map(sourceRows.map((row) => [row.id, row]));
const assignedRowsById = new Map();
const priorityRows = [];

for (const priorityDefinition of WORKSET_PRIORITY_DEFINITIONS) {
  for (const id of priorityDefinition.blockIds) {
    const row = sourceRowsById.get(id);
    if (!row) continue;
    const worksetRow = blockRowFromVisualRow(row, priorityDefinition);
    assignedRowsById.set(id, worksetRow);
    priorityRows.push(worksetRow);
  }
}

for (const row of sourceRows) {
  if (assignedRowsById.has(row.id)) continue;
  const worksetRow = blockRowFromVisualRow(row);
  assignedRowsById.set(row.id, worksetRow);
  priorityRows.push(worksetRow);
}

const sortedRows = sortRows(priorityRows);
const worksetRowCounts = new Map();
sortedRows.forEach((row) => {
  worksetRowCounts.set(row.id, (worksetRowCounts.get(row.id) ?? 0) + 1);
});

const requiredP0MissingRows = REQUIRED_P0_BLOCK_IDS.filter((id) => !assignedRowsById.has(id));
const requiredP1MissingRows = REQUIRED_P1_BLOCK_IDS.filter((id) => !assignedRowsById.has(id));
const missingWorksetRows = SUWON_BLOCKS
  .filter((block) => !assignedRowsById.has(block.id))
  .map((block) => ({
    id: block.id,
    block: block.block,
    name: block.name,
    category: block.category,
  }));
const duplicateWorksetIds = [...worksetRowCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([id]) => id)
  .sort((a, b) => a.localeCompare(b));

const priorityOrder = ['P0', 'P1', 'P2', 'P3', 'LOCKED'];
const worksets = priorityOrder.map((priority) => {
  const rows = sortedRows.filter((row) => row.priority === priority);
  const configured = WORKSET_PRIORITY_DEFINITIONS.find((definition) => definition.id === priority);
  const locked = priority === 'LOCKED';
  return {
    priority,
    label: configured?.label ?? (locked ? '검토 완료/회귀 감시' : '1층/2층/3층 숫자 블록 sweep'),
    objective: configured?.objective ?? (locked
      ? '스카이박스/스카이존처럼 이미 release gate로 잠긴 구역은 수정 후보와 분리해 회귀 감시합니다.'
      : '전체 좌표 재작성 없이 overlay 기반 미세 보정 후보만 선별합니다.'),
    candidateStatus: locked ? 'locked-review-reference' : (configured?.candidateStatus ?? 'baseline-sweep'),
    blockIds: rows.map((row) => row.id),
    rows,
  };
});

const generatedAt = new Date().toISOString();
const summary = {
  sourceManifestStatus: sourceManifest.status,
  reviewGroups: sourceManifest.summary?.reviewGroups ?? 0,
  expectedWorksetBlocks: EXPECTED_WORKSET_BLOCKS,
  worksetBlocks: assignedRowsById.size,
  candidateBlocks: sortedRows.filter((row) => row.priority !== 'LOCKED').length,
  lockedReviewBlocks: sortedRows.filter((row) => row.priority === 'LOCKED').length,
  p0Blocks: sortedRows.filter((row) => row.priority === 'P0').length,
  p1Blocks: sortedRows.filter((row) => row.priority === 'P1').length,
  p2Blocks: sortedRows.filter((row) => row.priority === 'P2').length,
  p3Blocks: sortedRows.filter((row) => row.priority === 'P3').length,
  missingWorksetBlocks: missingWorksetRows.length,
  duplicateWorksetBlocks: duplicateWorksetIds.length,
  requiredP0MissingBlocks: requiredP0MissingRows.length,
  requiredP1MissingBlocks: requiredP1MissingRows.length,
  visualReviewUnresolvedMismatchBlocks: sourceManifest.summary?.unresolvedVisualHitMismatchBlocks ?? 0,
  visualReviewApprovedSplitBlocks: sourceManifest.summary?.approvedVisualHitSplitBlocks ?? 0,
};

const failures = [
  sourceManifest.status === 'generated' ? '' : 'source visual review manifest is not generated',
  summary.reviewGroups === EXPECTED_REVIEW_GROUPS ? '' : 'source visual review group count mismatch',
  summary.worksetBlocks === EXPECTED_WORKSET_BLOCKS ? '' : 'workset block coverage mismatch',
  summary.missingWorksetBlocks === 0 ? '' : 'missing workset blocks',
  summary.duplicateWorksetBlocks === 0 ? '' : 'duplicate workset blocks',
  summary.requiredP0MissingBlocks === 0 ? '' : 'missing required P0 blocks',
  summary.requiredP1MissingBlocks === 0 ? '' : 'missing required P1 blocks',
  summary.visualReviewUnresolvedMismatchBlocks === 0 ? '' : 'source visual review has unresolved visual/hit mismatch blocks',
].filter(Boolean);

const manifest = {
  generatedAt,
  status: failures.length === 0 ? 'generated' : 'failed',
  sourceManifest: path.relative(frontendRoot, sourceManifestPath),
  summary,
  worksets,
  rows: sortedRows,
  missingWorksetRows,
  duplicateWorksetIds,
  requiredP0MissingRows,
  requiredP1MissingRows,
  failures,
};

const markdown = [
  '# Suwon Seatmap Precision Workset',
  '',
  `- Generated at: ${manifest.generatedAt}`,
  `- Status: ${manifest.status}`,
  `- source manifest: \`${manifest.sourceManifest}\``,
  `- review groups: ${manifest.summary.reviewGroups}`,
  `- expected workset blocks: ${manifest.summary.expectedWorksetBlocks}`,
  `- workset blocks: ${manifest.summary.worksetBlocks}`,
  `- candidate blocks: ${manifest.summary.candidateBlocks}`,
  `- locked review blocks: ${manifest.summary.lockedReviewBlocks}`,
  `- P0 blocks: ${manifest.summary.p0Blocks}`,
  `- P1 blocks: ${manifest.summary.p1Blocks}`,
  `- P2 blocks: ${manifest.summary.p2Blocks}`,
  `- P3 blocks: ${manifest.summary.p3Blocks}`,
  `- missing workset blocks: ${manifest.summary.missingWorksetBlocks}`,
  `- duplicate workset blocks: ${manifest.summary.duplicateWorksetBlocks}`,
  `- required P0 missing blocks: ${manifest.summary.requiredP0MissingBlocks}`,
  `- required P1 missing blocks: ${manifest.summary.requiredP1MissingBlocks}`,
  '',
  '## Worksets',
  '',
  markdownTable(
    ['priority', 'label', 'status', 'blocks', 'objective'],
    worksets.map((workset) => [workset.priority, workset.label, workset.candidateStatus, workset.blockIds.length, workset.objective]),
  ),
  '',
  ...worksets.flatMap((workset) => [
    `## ${workset.priority} ${workset.label}`,
    '',
    markdownTable(
      ['group', 'id', 'block', 'name', 'points', 'area', 'bounds', 'browser probes', 'alignment probes', 'flags'],
      workset.rows.map((row) => [
        row.groupLabel,
        row.id,
        row.block,
        row.name,
        row.pointCount,
        row.area,
        row.bounds ? `${row.bounds.x},${row.bounds.y} ${row.bounds.width}x${row.bounds.height}` : '',
        row.browserQaProbes,
        row.alignmentProbes,
        [...row.reviewFlags, ...row.approvalFlags].join(' ') || row.candidateStatus,
      ]),
    ),
    '',
  ]),
  '## Failures',
  '',
  failures.length > 0 ? failures.map((failure) => `- ${failure}`).join('\n') : 'No failures.',
  '',
].join('\n');

await fs.mkdir(reportDir, { recursive: true });
await fs.writeFile(worksetJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await fs.writeFile(worksetMarkdownPath, markdown, 'utf8');

console.log(`precision_workset_json:${worksetJsonPath}`);
console.log(`precision_workset_markdown:${worksetMarkdownPath}`);
console.log(`status:${manifest.status} worksetBlocks=${manifest.summary.worksetBlocks} candidateBlocks=${manifest.summary.candidateBlocks} lockedReviewBlocks=${manifest.summary.lockedReviewBlocks}`);

if (manifest.status !== 'generated') {
  failures.forEach((failure) => {
    console.error(`precision workset failure: ${failure}`);
  });
  process.exit(1);
}
