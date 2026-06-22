import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(frontendRoot, '..');
const reportDir = path.join(frontendRoot, 'reports/stadium');
const outputDir = path.join(repoRoot, 'output/playwright');

const OUTPUT_FILES = {
  json: path.join(reportDir, 'gwangju-seatmap-block-source-duplication-audit.json'),
  csv: path.join(reportDir, 'gwangju-seatmap-block-source-duplication-audit.csv'),
  markdown: path.join(reportDir, 'gwangju-seatmap-block-source-duplication-audit.md'),
};

const AUDIT_VERSION = 'GWANGJU_BLOCK_SOURCE_DUPLICATION_AUDIT_V1';
const SCRIPT_PREFIX = 'gwangju-seatmap';
const ACTIVE_ARTIFACT_PATTERNS = [
  /gwangju.*candidate/i,
  /gwangju.*proposed/i,
  /manual-official-retrace/i,
];
const GWANGJU_BLOCK_ID_TOKEN_PATTERN = /\b(?:k[5789]-\d{3}|sky-picnic-(?:s-\d{3}|L)|five-table-\d{3}|(?:first|third)-(?:family|wheelchair|surprise)-seats|party-seats-(?:first|third)|(?:outfield|bleachers-table)-(?:left|right)-seats|home-k7-seats|away-cheering-seats)\b/g;

const INDEPENDENT_REFERENCE_ROLE_IDS = new Set([
  'core-image-alignment-reference',
]);

const SOURCE_POLICY = {
  coordinateSource: 'official image 2200x1159 only',
  auditedRuntimeSource: 'GWANGJU_BLOCKS[].imageGeometry.d/visualD',
  productionDataFile: 'src/data/gwangjuSeatData.ts',
  disallowedSources: [
    'browser CSS pixels as coordinate source',
    'resized screenshots as coordinate source',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ],
  missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
};

const csvEscape = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const markdownCell = (value) => String(value ?? '-')
  .replaceAll('|', '\\|')
  .replaceAll('\n', '<br>');

const markdownTable = (headers, rows) => [
  `| ${headers.join(' | ')} |`,
  `| ${headers.map(() => '---').join(' | ')} |`,
  ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
].join('\n');

const rel = (filePath) => path.relative(frontendRoot, filePath);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countExactText = (text, token) => {
  const matches = text.match(new RegExp(escapeRegex(token), 'g'));
  return matches?.length ?? 0;
};

const extractGwangjuBlockIdTokens = (text) => Array.from(new Set(text.match(GWANGJU_BLOCK_ID_TOKEN_PATTERN) ?? [])).sort();

const tokenAppearsOnlyAsComponentId = (text, token) => text
  .split('\n')
  .filter((line) => line.includes(token))
  .every((line) => line.includes('componentIds'));

const walkFiles = async (root) => {
  const results = [];
  const walk = async (dir) => {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') return;
      throw error;
    }
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
      } else if (entry.isFile()) {
        results.push(filePath);
      }
    }
  };
  await walk(root);
  return results;
};

const classifyScriptRoles = (relativePath, text) => {
  const roles = [];

  if (relativePath === 'scripts/gwangju-seatmap-core-qa.mjs') {
    if (text.includes('runImageAlignmentAudit')) {
      roles.push({
        id: 'core-image-alignment-reference',
        label: 'core image-alignment official/reference QA',
        independentReference: true,
      });
    }
    if (text.includes('runReviewManifest')) {
      roles.push({
        id: 'core-trace-manifest',
        label: 'core trace manifest/runtime QA',
        independentReference: false,
      });
    }
    if (text.includes('runVisualHitSplitAudit')) {
      roles.push({
        id: 'core-visual-hit-split',
        label: 'visualD/d split runtime QA',
        independentReference: false,
      });
    }
  }

  if (relativePath.endsWith('gwangju-seatmap-evidence-workset-ops.mjs')) {
    roles.push({
      id: 'evidence-workset',
      label: 'evidence/workset/report QA',
      independentReference: false,
    });
  }

  if (relativePath.endsWith('gwangju-seatmap-artifact-scope-audit.mjs')) {
    roles.push({
      id: 'artifact-scope-guard',
      label: 'artifact/archive scope guard',
      independentReference: false,
    });
  }

  if (relativePath.endsWith('gwangju-seatmap-operator-template-ops.mjs')
    || relativePath.endsWith('gwangju-seatmap-operator-intake-write-ops.mjs')) {
    roles.push({
      id: 'operator-input-write',
      label: 'operator input/write guard',
      independentReference: false,
    });
  }

  if (relativePath.endsWith('gwangju-seatmap-release-staging-ops.mjs')) {
    roles.push({
      id: 'release-staging',
      label: 'release/staging guard',
      independentReference: false,
    });
  }

  return roles;
};

const listGwangjuCandidateArtifacts = async () => {
  const candidateRoots = [reportDir, outputDir];
  const files = (await Promise.all(candidateRoots.map(walkFiles))).flat();
  const artifacts = files
    .filter((filePath) => ACTIVE_ARTIFACT_PATTERNS.some((pattern) => pattern.test(path.basename(filePath))))
    .filter((filePath) => path.basename(filePath).toLowerCase().includes('gwangju'))
    .map((filePath) => ({
      path: rel(filePath),
      pattern: ACTIVE_ARTIFACT_PATTERNS.find((pattern) => pattern.test(path.basename(filePath)))?.source ?? null,
      archived: rel(filePath).startsWith('reports/stadium/_archive/'),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  return {
    active: artifacts.filter((artifact) => !artifact.archived),
    archived: artifacts.filter((artifact) => artifact.archived),
  };
};

const duplicateIds = (ids) => {
  const counts = new Map();
  for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));
};

const main = async () => {
  const {
    GWANGJU_BLOCKS,
    GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
    GWANGJU_FULL_RETRACE_VERSION,
    GWANGJU_IMAGE_GEOMETRY,
    GWANGJU_OFFICIAL_TRACE_REFERENCE,
    GWANGJU_PREVIOUS_TRACE_VERSION,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  await fs.mkdir(reportDir, { recursive: true });

  const dataSourcePath = path.join(frontendRoot, 'src/data/gwangjuSeatData.ts');
  const dataSourceText = await fs.readFile(dataSourcePath, 'utf8');
  const scriptFiles = (await walkFiles(path.join(frontendRoot, 'scripts')))
    .filter((filePath) => path.basename(filePath).startsWith(SCRIPT_PREFIX))
    .sort((a, b) => a.localeCompare(b));
  const scriptSources = await Promise.all(scriptFiles.map(async (filePath) => ({
    path: filePath,
    relativePath: rel(filePath),
    text: await fs.readFile(filePath, 'utf8'),
  })));

  const derivedRangeSourceIds = new Map();
  for (const range of GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES ?? []) {
    for (const sourceBlockId of range.sourceBlockIds ?? []) {
      const entries = derivedRangeSourceIds.get(sourceBlockId) ?? [];
      entries.push(range.id);
      derivedRangeSourceIds.set(sourceBlockId, entries);
    }
  }

  const productionIds = GWANGJU_BLOCKS.map((block) => block.id);
  const geometryIds = Object.keys(GWANGJU_IMAGE_GEOMETRY);
  const referenceIds = Object.keys(GWANGJU_OFFICIAL_TRACE_REFERENCE);
  const productionIdSet = new Set(productionIds);
  const scriptTokenReferences = new Map();
  for (const script of scriptSources) {
    for (const token of extractGwangjuBlockIdTokens(script.text)) {
      const entries = scriptTokenReferences.get(token) ?? [];
      entries.push({
        file: script.relativePath,
        occurrenceCount: countExactText(script.text, token),
        roles: classifyScriptRoles(script.relativePath, script.text).map((role) => role.id),
        componentIdOnly: tokenAppearsOnlyAsComponentId(script.text, token),
      });
      scriptTokenReferences.set(token, entries);
    }
  }
  const orphanScriptReferenceRows = [...scriptTokenReferences.entries()]
    .filter(([id]) => !productionIdSet.has(id))
    .map(([id, scripts]) => ({
      id,
      scriptCount: scripts.filter((script) => !script.componentIdOnly && !script.roles.includes('artifact-scope-guard')).length,
      scripts: scripts.filter((script) => !script.componentIdOnly && !script.roles.includes('artifact-scope-guard')),
      status: 'review',
      warning: 'SCRIPT_REFERENCES_NON_ACTIVE_BLOCK_ID',
    }))
    .filter((row) => row.scriptCount > 0)
    .sort((a, b) => b.scriptCount - a.scriptCount || a.id.localeCompare(b.id));
  const productionDuplicateIds = duplicateIds(productionIds);
  const missingGeometryIds = productionIds.filter((id) => !GWANGJU_IMAGE_GEOMETRY[id]);
  const orphanGeometryIds = geometryIds.filter((id) => !productionIds.includes(id));
  const missingReferenceIds = productionIds.filter((id) => !GWANGJU_OFFICIAL_TRACE_REFERENCE[id]);
  const orphanReferenceIds = referenceIds.filter((id) => !productionIds.includes(id));

  const rows = GWANGJU_BLOCKS.map((block) => {
    const geometry = block.imageGeometry;
    const hasSeparateVisualPath = Boolean(geometry.visualD && geometry.visualD !== geometry.d);
    const sourceCodeOccurrences = countExactText(dataSourceText, block.id);
    const scriptOccurrences = scriptSources
      .map((script) => {
        const occurrenceCount = countExactText(script.text, block.id);
        if (occurrenceCount === 0) return null;
        const roles = classifyScriptRoles(script.relativePath, script.text);
        return {
          file: script.relativePath,
          occurrenceCount,
          roles: roles.map((role) => role.id),
          roleLabels: roles.map((role) => role.label),
          independentReferenceRoles: roles
            .filter((role) => role.independentReference || INDEPENDENT_REFERENCE_ROLE_IDS.has(role.id))
            .map((role) => role.id),
        };
      })
      .filter(Boolean);

    const independentReferenceScripts = scriptOccurrences
      .filter((occurrence) => occurrence.independentReferenceRoles.length > 0);
    const candidateScripts = scriptOccurrences
      .filter((occurrence) => occurrence.roles.includes('third-base-candidate-generator'));

    const intentionalRuntimePathSplit = hasSeparateVisualPath;
    const multiIndependentReferenceQa = independentReferenceScripts.length > 1;
    const blockers = [
      ...(missingGeometryIds.includes(block.id) ? ['MISSING_PRODUCTION_GEOMETRY'] : []),
      ...(missingReferenceIds.includes(block.id) ? ['MISSING_TRACE_REFERENCE'] : []),
    ];
    const warnings = [
      ...(intentionalRuntimePathSplit ? ['INTENTIONAL_VISUAL_HIT_SPLIT'] : []),
      ...(multiIndependentReferenceQa ? [`MULTIPLE_INDEPENDENT_QA_REFERENCES:${independentReferenceScripts.map((entry) => entry.file).join('|')}`] : []),
      ...(candidateScripts.length > 0 ? [`CANDIDATE_GENERATOR_REFERENCES_BLOCK:${candidateScripts.map((entry) => entry.file).join('|')}`] : []),
      ...(derivedRangeSourceIds.has(block.id) ? [`DERIVED_OPERATOR_RANGE_REUSES_BLOCK:${derivedRangeSourceIds.get(block.id).join('|')}`] : []),
      ...(sourceCodeOccurrences > 8 ? [`HIGH_DATA_SOURCE_OCCURRENCE_COUNT:${sourceCodeOccurrences}`] : []),
    ];

    return {
      id: block.id,
      name: block.name,
      category: block.category,
      shortLabel: geometry.shortLabel,
      productionPathCount: 1,
      hasSeparateVisualPath,
      runtimePathCount: hasSeparateVisualPath ? 2 : 1,
      traceVersion: geometry.traceVersion,
      sourceCodeOccurrences,
      hasTraceReference: Boolean(GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id]),
      qaScriptCount: scriptOccurrences.length,
      independentReferenceQaScriptCount: independentReferenceScripts.length,
      candidateScriptCount: candidateScripts.length,
      derivedOperatorRanges: derivedRangeSourceIds.get(block.id) ?? [],
      qaScripts: scriptOccurrences.map((entry) => entry.file),
      independentReferenceQaScripts: independentReferenceScripts.map((entry) => entry.file),
      status: blockers.length === 0 ? (warnings.length === 0 ? 'clear' : 'review') : 'blocked',
      blockers,
      warnings,
    };
  });

  const gwangjuCandidateArtifacts = await listGwangjuCandidateArtifacts();
  const activeGwangjuCandidateArtifacts = gwangjuCandidateArtifacts.active;
  const archivedGwangjuCandidateArtifacts = gwangjuCandidateArtifacts.archived;
  const visualHitSplitRows = rows.filter((row) => row.hasSeparateVisualPath);
  const multiIndependentReferenceRows = rows.filter((row) => row.independentReferenceQaScriptCount > 1);
  const candidateReferencedRows = rows.filter((row) => row.candidateScriptCount > 0);
  const blockedRows = rows.filter((row) => row.blockers.length > 0);
  const warningRows = rows.filter((row) => row.warnings.length > 0);
  const reviewRequiredRows = rows.filter((row) => row.warnings.some((warning) => (
    warning.startsWith('MULTIPLE_INDEPENDENT_QA_REFERENCES')
    || warning.startsWith('CANDIDATE_GENERATOR_REFERENCES_BLOCK')
  )));

  const status = productionDuplicateIds.length > 0
    || missingGeometryIds.length > 0
    || orphanGeometryIds.length > 0
    || missingReferenceIds.length > 0
    || orphanReferenceIds.length > 0
    ? 'failed'
    : reviewRequiredRows.length > 0 || activeGwangjuCandidateArtifacts.length > 0 || orphanScriptReferenceRows.length > 0
      ? 'needs_review'
      : 'passed';

  const summary = {
    status,
    activeBlockCount: GWANGJU_BLOCKS.length,
    geometryKeyCount: geometryIds.length,
    traceReferenceKeyCount: referenceIds.length,
    traceVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    productionDuplicateIdCount: productionDuplicateIds.length,
    missingGeometryIdCount: missingGeometryIds.length,
    orphanGeometryIdCount: orphanGeometryIds.length,
    missingTraceReferenceIdCount: missingReferenceIds.length,
    orphanTraceReferenceIdCount: orphanReferenceIds.length,
    visualHitSplitBlockCount: visualHitSplitRows.length,
    multiIndependentReferenceQaBlockCount: multiIndependentReferenceRows.length,
    candidateReferencedBlockCount: candidateReferencedRows.length,
    activeGwangjuCandidateArtifactCount: activeGwangjuCandidateArtifacts.length,
    archivedGwangjuCandidateArtifactCount: archivedGwangjuCandidateArtifacts.length,
    orphanScriptReferencedBlockIdCount: orphanScriptReferenceRows.length,
    blockedRowCount: blockedRows.length,
    reviewRequiredRowCount: reviewRequiredRows.length,
    warningRowCount: warningRows.length,
  };

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status,
    sourcePolicy: SOURCE_POLICY,
    officialImage: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    summary,
    duplicateChecks: {
      productionDuplicateIds,
      missingGeometryIds,
      orphanGeometryIds,
      missingReferenceIds,
      orphanReferenceIds,
    },
    activeGwangjuCandidateArtifacts,
    archivedGwangjuCandidateArtifacts,
    orphanScriptReferenceRows,
    rows,
  };

  const csvHeaders = [
    'id',
    'name',
    'category',
    'shortLabel',
    'runtimePathCount',
    'hasSeparateVisualPath',
    'sourceCodeOccurrences',
    'hasTraceReference',
    'qaScriptCount',
    'independentReferenceQaScriptCount',
    'candidateScriptCount',
    'derivedOperatorRanges',
    'status',
    'warnings',
    'blockers',
    'qaScripts',
  ];
  const csv = [
    csvHeaders.join(','),
    ...rows.map((row) => [
      row.id,
      row.name,
      row.category,
      row.shortLabel,
      row.runtimePathCount,
      row.hasSeparateVisualPath,
      row.sourceCodeOccurrences,
      row.hasTraceReference,
      row.qaScriptCount,
      row.independentReferenceQaScriptCount,
      row.candidateScriptCount,
      row.derivedOperatorRanges.join('|'),
      row.status,
      row.warnings.join('|'),
      row.blockers.join('|'),
      row.qaScripts.join('|'),
    ].map(csvEscape).join(',')),
  ].join('\n');

  const highSignalRows = rows
    .filter((row) => row.status !== 'clear')
    .sort((a, b) => b.independentReferenceQaScriptCount - a.independentReferenceQaScriptCount
      || b.runtimePathCount - a.runtimePathCount
      || a.id.localeCompare(b.id));

  const markdown = [
    '# Gwangju Block Source Duplication Audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${status}\``,
    `- traceVersion: \`${GWANGJU_FULL_RETRACE_VERSION}\``,
    `- active blocks: \`${summary.activeBlockCount}\``,
    `- visual/hit split blocks: \`${summary.visualHitSplitBlockCount}\``,
    `- blocks with 2+ independent QA/reference scripts: \`${summary.multiIndependentReferenceQaBlockCount}\``,
    `- blocks referenced by retrace candidate generator: \`${summary.candidateReferencedBlockCount}\``,
    `- active Gwangju candidate/proposed artifact files: \`${summary.activeGwangjuCandidateArtifactCount}\``,
    `- archived Gwangju candidate/proposed artifact files: \`${summary.archivedGwangjuCandidateArtifactCount}\``,
    `- non-active block ids still referenced by Gwangju scripts: \`${summary.orphanScriptReferencedBlockIdCount}\``,
    `- review-required duplicate/source rows: \`${summary.reviewRequiredRowCount}\``,
    '',
    '## Duplicate Production Checks',
    '',
    markdownTable(
      ['check', 'count', 'ids'],
      [
        ['duplicate GWANGJU_BLOCKS ids', summary.productionDuplicateIdCount, productionDuplicateIds.map((entry) => `${entry.id}(${entry.count})`).join(', ') || 'none'],
        ['missing production geometry', summary.missingGeometryIdCount, missingGeometryIds.join(', ') || 'none'],
        ['orphan geometry keys', summary.orphanGeometryIdCount, orphanGeometryIds.join(', ') || 'none'],
        ['missing trace reference', summary.missingTraceReferenceIdCount, missingReferenceIds.join(', ') || 'none'],
        ['orphan trace reference keys', summary.orphanTraceReferenceIdCount, orphanReferenceIds.join(', ') || 'none'],
      ],
    ),
    '',
    '## Review Rows',
    '',
    markdownTable(
      ['id', 'runtime paths', 'independent QA refs', 'candidate refs', 'derived ranges', 'status', 'warnings'],
      highSignalRows.map((row) => [
        row.id,
        row.runtimePathCount,
        row.independentReferenceQaScriptCount,
        row.candidateScriptCount,
        row.derivedOperatorRanges.join(', ') || '-',
        row.status,
        row.warnings.join('<br>') || '-',
      ]),
    ),
    '',
    '## Non-Active Block IDs Still Referenced By Scripts',
    '',
    orphanScriptReferenceRows.length > 0
      ? markdownTable(
        ['id', 'script count', 'scripts'],
        orphanScriptReferenceRows.map((row) => [
          row.id,
          row.scriptCount,
          row.scripts.map((script) => `${script.file} (${script.roles.join('|') || 'unclassified'})`).join('<br>'),
        ]),
      )
      : 'none',
    '',
    '## Active Candidate/Proposed Artifacts',
    '',
    activeGwangjuCandidateArtifacts.length > 0
      ? markdownTable(
        ['path', 'pattern'],
        activeGwangjuCandidateArtifacts.map((artifact) => [artifact.path, artifact.pattern]),
      )
      : 'none',
    '',
    '## Archived Candidate/Proposed Artifacts',
    '',
    archivedGwangjuCandidateArtifacts.length > 0
      ? markdownTable(
        ['path', 'pattern'],
        archivedGwangjuCandidateArtifacts.map((artifact) => [artifact.path, artifact.pattern]),
      )
      : 'none',
    '',
    '## Policy',
    '',
    '- Runtime 좌석 layer 기준은 `GWANGJU_BLOCKS[].imageGeometry.d/visualD`뿐입니다.',
    '- `visualD`와 `d`가 둘 다 있는 block은 의도된 표시/클릭 분리입니다.',
    '- candidate/retrace 산출물은 production 검수 근거가 아니며, 같은 block에 2개 이상 독립 QA reference가 있으면 다음 좌표 작업 전에 소유권을 하나로 정리해야 합니다.',
    '- 좌표 기준은 공식 이미지 `2200x1159`만 허용합니다.',
    '- 누락 야구 운영 데이터는 `MANUAL_BASEBALL_DATA_REQUIRED` 계약을 유지합니다.',
    '',
  ].join('\n');

  await fs.writeFile(OUTPUT_FILES.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.csv, `${csv}\n`, 'utf8');
  await fs.writeFile(OUTPUT_FILES.markdown, `${markdown}\n`, 'utf8');

  console.log(`status:${status} active_blocks=${summary.activeBlockCount} visual_hit_split=${summary.visualHitSplitBlockCount} multi_qa_reference_blocks=${summary.multiIndependentReferenceQaBlockCount} candidate_artifacts=${summary.activeGwangjuCandidateArtifactCount}`);
  console.log(`report:${OUTPUT_FILES.json}`);
};

await main();
