import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  GWANGJU_BLOCKS,
  GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  GWANGJU_FULL_RETRACE_GENERATION,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_PREVIOUS_TRACE_VERSION,
  GWANGJU_SEATMAP_IMAGE,
} from '../src/data/gwangjuSeatData.ts';
import {
  buildGwangjuSeatMapEditorDataset,
  buildGwangjuSeatMapEditorPatchPayload,
  calculateGwangjuEditorPatchStats,
  geometrySnapshotFromGwangjuPolygons,
  pathToGwangjuEditorPolygons,
  validateGwangjuSeatMapEditorDatasetIssues,
} from '../src/data/gwangjuSeatMapEditorDataset.ts';
import {
  pointInPolygon,
  polygonArea,
} from '../src/utils/seatMapPolygonValidator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const reportDir = path.join(projectRoot, 'reports', 'stadium');
const defaultPatchPath = path.join(reportDir, 'gwangju-precision-v1-editor-patch.json');

function ensureReportDir() {
  fs.mkdirSync(reportDir, { recursive: true });
}

function parseArgs(argv) {
  const [task = 'dataset-summary', ...rest] = argv;
  const options = {
    task,
    patchPath: defaultPatchPath,
    requireInput: false,
    allowSourceWrite: false,
  };

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === '--patch') {
      options.patchPath = path.resolve(projectRoot, rest[index + 1] ?? '');
      index += 1;
    } else if (arg === '--require-input') {
      options.requireInput = true;
    } else if (arg === '--allow-source-write') {
      options.allowSourceWrite = true;
    }
  }

  return options;
}

function writeReport(baseName, report) {
  ensureReportDir();
  const jsonPath = path.join(reportDir, `${baseName}.json`);
  const markdownPath = path.join(reportDir, `${baseName}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, formatMarkdownReport(report));
  return { jsonPath, markdownPath };
}

function formatMarkdownReport(report) {
  const lines = [
    `# ${report.title}`,
    '',
    `- status: \`${report.status}\``,
    `- mapVersion: \`${report.mapVersion}\``,
    `- previousMapVersion: \`${report.previousMapVersion}\``,
    `- activeBlocks: \`${report.activeBlocks}\``,
    `- blockers: \`${report.blockers?.length ?? 0}\``,
    `- warnings: \`${report.warnings?.length ?? 0}\``,
  ];

  if (report.patchPath) {
    lines.push(`- patchPath: \`${report.patchPath}\``);
  }
  if (report.summary) {
    lines.push('', '## Summary', '```json', JSON.stringify(report.summary, null, 2), '```');
  }
  if (report.blockers?.length) {
    lines.push('', '## Blockers', ...report.blockers.map((blocker) => `- ${blocker}`));
  }
  if (report.warnings?.length) {
    lines.push('', '## Warnings', ...report.warnings.map((warning) => `- ${warning}`));
  }
  if (report.nextAction) {
    lines.push('', '## Next Action', report.nextAction);
  }

  return `${lines.join('\n')}\n`;
}

function readPatchPayload(patchPath, requireInput) {
  if (!fs.existsSync(patchPath)) {
    const missing = {
      missingInput: true,
      patchPath,
      blockers: [`PATCH_INPUT_MISSING:${path.relative(projectRoot, patchPath)}`],
    };
    if (requireInput) {
      missing.throwRequired = true;
    }
    return missing;
  }

  return {
    missingInput: false,
    patchPath,
    payload: JSON.parse(fs.readFileSync(patchPath, 'utf8')),
  };
}

function normaliseGeometry(rawGeometry) {
  const visualPolygons = Array.isArray(rawGeometry?.visualPolygons)
    ? rawGeometry.visualPolygons
    : pathToGwangjuEditorPolygons(String(rawGeometry?.visualPath ?? ''));
  const hitPolygons = Array.isArray(rawGeometry?.hitPolygons)
    ? rawGeometry.hitPolygons
    : pathToGwangjuEditorPolygons(String(rawGeometry?.hitPath ?? ''));

  return geometrySnapshotFromGwangjuPolygons({
    visualPolygons,
    hitPolygons,
    labelPoint: rawGeometry?.labelPoint ?? [0, 0],
  });
}

function boundsForPolygons(polygons) {
  const points = polygons.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function pointInAnyPolygon(point, polygons) {
  return polygons.some((polygon) => pointInPolygon(point, polygon));
}

function sampledOverlapRatio(firstPolygons, secondPolygons, step = 8) {
  const firstBounds = boundsForPolygons(firstPolygons);
  const secondBounds = boundsForPolygons(secondPolygons);
  const minX = Math.max(firstBounds.minX, secondBounds.minX);
  const minY = Math.max(firstBounds.minY, secondBounds.minY);
  const maxX = Math.min(firstBounds.maxX, secondBounds.maxX);
  const maxY = Math.min(firstBounds.maxY, secondBounds.maxY);

  if (!Number.isFinite(minX) || minX >= maxX || minY >= maxY) {
    return 0;
  }

  let firstInside = 0;
  let bothInside = 0;
  for (let y = minY; y <= maxY; y += step) {
    for (let x = minX; x <= maxX; x += step) {
      const point = [x, y];
      if (pointInAnyPolygon(point, firstPolygons)) {
        firstInside += 1;
        if (pointInAnyPolygon(point, secondPolygons)) {
          bothInside += 1;
        }
      }
    }
  }

  return firstInside === 0 ? 0 : bothInside / firstInside;
}

function validatePatchPayload(options) {
  const dataset = buildGwangjuSeatMapEditorDataset();
  const input = readPatchPayload(options.patchPath, options.requireInput);
  const blockers = [];
  const warnings = [];

  if (input.missingInput) {
    blockers.push(...input.blockers);
    return {
      title: 'Gwangju precision v1 editor patch validation',
      status: options.requireInput ? 'blocked' : 'waiting-for-input',
      mapVersion: GWANGJU_FULL_RETRACE_VERSION,
      previousMapVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
      activeBlocks: GWANGJU_BLOCKS.length,
      patchPath: input.patchPath,
      summary: {
        expectedPatchType: 'GWANGJU_PRECISION_V1_SECTION_GEOMETRY_PATCH_PREVIEW',
        editorRoute: '/internal/gwangju-seatmap-editor',
        sourceDataWritePerformed: false,
      },
      blockers,
      warnings,
      nextAction: 'Export a JSON patch from /internal/gwangju-seatmap-editor, then rerun this command with --patch <file>.',
    };
  }

  const { payload } = input;
  if (payload?.type !== 'GWANGJU_PRECISION_V1_SECTION_GEOMETRY_PATCH_PREVIEW') {
    blockers.push(`PATCH_TYPE_MISMATCH:${payload?.type ?? 'missing'}`);
  }
  if (payload?.mapVersion !== GWANGJU_FULL_RETRACE_VERSION) {
    blockers.push(`PATCH_MAP_VERSION_MISMATCH:${payload?.mapVersion ?? 'missing'}:expected=${GWANGJU_FULL_RETRACE_VERSION}`);
  }
  if (payload?.previousMapVersion !== GWANGJU_PREVIOUS_TRACE_VERSION) {
    blockers.push(`PATCH_PREVIOUS_VERSION_MISMATCH:${payload?.previousMapVersion ?? 'missing'}:expected=${GWANGJU_PREVIOUS_TRACE_VERSION}`);
  }

  const section = dataset.sections.find((candidate) => candidate.sectionId === payload?.sectionId);
  if (!section) {
    blockers.push(`PATCH_SECTION_MISSING:${payload?.sectionId ?? 'missing'}`);
  }

  let candidatePayload = null;
  let overlapWarnings = [];
  let stats = null;
  if (section && payload?.after) {
    const after = normaliseGeometry(payload.after);
    candidatePayload = buildGwangjuSeatMapEditorPatchPayload(section, dataset, after);
    stats = calculateGwangjuEditorPatchStats(candidatePayload);

    candidatePayload.validation.issues.forEach((issue) => {
      blockers.push(`GEOMETRY_${issue.code}:${issue.sectionId ?? section.sectionId}:${issue.pathKind ?? 'geometry'}`);
    });

    after.visualPolygons.forEach((polygon, index) => {
      const area = polygonArea(polygon);
      if (area < 20) {
        blockers.push(`MINIMUM_AREA_REQUIRED:${section.sectionId}:visual[${index}]:${area.toFixed(2)}`);
      }
    });

    dataset.sections
      .filter((candidate) => candidate.sectionId !== section.sectionId)
      .filter((candidate) => !['home-k7-seats', 'away-cheering-seats'].includes(candidate.sectionId))
      .forEach((candidate) => {
        const ratio = sampledOverlapRatio(after.hitPolygons, candidate.hitPolygons);
        if (ratio > 0.005) {
          overlapWarnings.push({
            sectionId: candidate.sectionId,
            sampledOverlapRatio: Number(ratio.toFixed(4)),
          });
        }
      });

    overlapWarnings = overlapWarnings
      .sort((a, b) => b.sampledOverlapRatio - a.sampledOverlapRatio)
      .slice(0, 20);
    warnings.push(...overlapWarnings.map((warning) => `SAMPLED_OVERLAP:${section.sectionId}/${warning.sectionId}:${warning.sampledOverlapRatio}`));
  }

  return {
    title: 'Gwangju precision v1 editor patch validation',
    status: blockers.length === 0 ? 'passed' : 'blocked',
    mapVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousMapVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    activeBlocks: GWANGJU_BLOCKS.length,
    patchPath: input.patchPath,
    summary: {
      sectionId: payload?.sectionId ?? null,
      officialImage: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
      coordinateSystem: 'SVG_VIEW_BOX',
      validationStatus: candidatePayload?.validation.status ?? 'NOT_RUN',
      highRiskWorksetIds: candidatePayload?.highRiskWorksetIds ?? [],
      geometryStats: stats,
      sampledOverlapWarnings: overlapWarnings,
      officialPngCoverageGate: 'delegated:node scripts/stadium-seatmap-ops.mjs gwangju image-alignment-audit:require-release',
      sourceDataWritePerformed: false,
    },
    blockers,
    warnings,
    nextAction: blockers.length === 0
      ? 'Review the apply-plan report before manually applying a source patch.'
      : 'Fix the editor payload, then rerun validation.',
  };
}

function createDatasetSummaryReport() {
  const dataset = buildGwangjuSeatMapEditorDataset();
  const issues = validateGwangjuSeatMapEditorDatasetIssues(dataset);
  const blockers = issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `${issue.sectionId ?? 'dataset'}:${issue.pathKind ?? 'geometry'}:${issue.code}`);
  const warnings = issues
    .filter((issue) => issue.severity === 'warning')
    .map((issue) => `${issue.sectionId ?? 'dataset'}:${issue.pathKind ?? 'geometry'}:${issue.code}`);

  return {
    title: 'Gwangju precision v1 editor dataset summary',
    status: blockers.length === 0 ? 'passed' : 'blocked',
    mapVersion: dataset.mapVersion,
    previousMapVersion: dataset.previousMapVersion,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    activeBlocks: GWANGJU_BLOCKS.length,
    summary: {
      ...dataset.summary,
      expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      image: dataset.image,
      editorRoute: '/internal/gwangju-seatmap-editor',
      publicNavigationExposed: false,
      sourceDataWritePerformed: false,
    },
    blockers,
    warnings,
    nextAction: blockers.length === 0
      ? 'Use /internal/gwangju-seatmap-editor for manual overlay review and patch export.'
      : 'Fix dataset blockers before exporting editor patches.',
  };
}

function createApplyPlanReport(options) {
  const validationReport = validatePatchPayload(options);
  const blockers = [...(validationReport.blockers ?? [])];
  const warnings = [...(validationReport.warnings ?? [])];

  return {
    ...validationReport,
    title: 'Gwangju precision v1 editor patch apply-plan',
    status: blockers.length === 0 ? 'ready' : validationReport.status,
    summary: {
      ...validationReport.summary,
      sourceDataWriteAllowed: false,
      sourceDataWritePerformed: false,
      guardedWriteCommand: 'npm run stadium:gwangju:precision-editor-patch:write-guard -- --allow-source-write',
      releaseLockImpact: {
        traceVersion: GWANGJU_FULL_RETRACE_VERSION,
        previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
        activeBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      },
    },
    blockers,
    warnings,
    nextAction: blockers.length === 0
      ? 'Manually review bounds delta, run the official image-alignment gate, then apply the TS fragment if accepted.'
      : validationReport.nextAction,
  };
}

function createPostwriteGateReport() {
  const dataset = buildGwangjuSeatMapEditorDataset();
  const issues = validateGwangjuSeatMapEditorDatasetIssues(dataset);
  const traceVersionFailures = GWANGJU_BLOCKS
    .filter((block) => block.imageGeometry.traceVersion !== GWANGJU_FULL_RETRACE_VERSION)
    .map((block) => `${block.id}:${block.imageGeometry.traceVersion}`);
  const previousVersionFailures = GWANGJU_BLOCKS
    .filter((block) => block.imageGeometry.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION)
    .map((block) => `${block.id}:${block.imageGeometry.previousTraceVersion}`);
  const generationFailures = GWANGJU_BLOCKS
    .filter((block) => block.imageGeometry.traceGeneration !== GWANGJU_FULL_RETRACE_GENERATION)
    .map((block) => `${block.id}:${block.imageGeometry.traceGeneration}`);
  const blockers = [
    ...issues.filter((issue) => issue.severity === 'error').map((issue) => `${issue.sectionId ?? 'dataset'}:${issue.pathKind ?? 'geometry'}:${issue.code}`),
    ...traceVersionFailures.map((failure) => `TRACE_VERSION_MISMATCH:${failure}`),
    ...previousVersionFailures.map((failure) => `PREVIOUS_TRACE_VERSION_MISMATCH:${failure}`),
    ...generationFailures.map((failure) => `TRACE_GENERATION_MISMATCH:${failure}`),
  ];

  return {
    title: 'Gwangju precision v1 editor postwrite gate',
    status: blockers.length === 0 ? 'passed' : 'blocked',
    mapVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousMapVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    activeBlocks: GWANGJU_BLOCKS.length,
    summary: {
      expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      datasetIssues: issues.length,
      traceVersionFailures,
      previousVersionFailures,
      generationFailures,
      sourceDataWritePerformed: false,
    },
    blockers,
    warnings: [],
    nextAction: blockers.length === 0
      ? 'Run node --import tsx --test --test-concurrency=1 --test-name-pattern "광주|Gwangju" src/components/StadiumGuideRuntimeSeatMaps.test.ts src/components/gwangju/GwangjuSeatMapEditor.test.tsx src/data/gwangjuSeatData.test.ts and npm run build.'
      : 'Fix postwrite gate blockers before release verification.',
  };
}

function createWriteGuardReport(options) {
  return {
    title: 'Gwangju precision v1 editor source write guard',
    status: options.allowSourceWrite ? 'blocked' : 'blocked',
    mapVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousMapVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    activeBlocks: GWANGJU_BLOCKS.length,
    patchPath: options.patchPath,
    summary: {
      allowSourceWriteFlag: options.allowSourceWrite,
      sourceDataWritePerformed: false,
      reason: 'Editor and CLI apply-plan intentionally do not mutate gwangjuSeatData.ts. Apply accepted TS fragments manually, then run postwrite-gate.',
    },
    blockers: ['SOURCE_WRITE_NOT_IMPLEMENTED_BY_GUARD'],
    warnings: [],
    nextAction: 'Apply the reviewed TS fragment manually and run npm run stadium:gwangju:precision-editor-patch:postwrite-gate.',
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  let report;
  let reportBaseName;

  switch (options.task) {
    case 'dataset-summary':
      report = createDatasetSummaryReport();
      reportBaseName = 'gwangju-precision-v1-editor-dataset';
      break;
    case 'editor-patch-validate':
      report = validatePatchPayload(options);
      reportBaseName = 'gwangju-precision-v1-editor-patch-validation';
      break;
    case 'editor-patch-apply-plan':
      report = createApplyPlanReport(options);
      reportBaseName = 'gwangju-precision-v1-editor-patch-apply-plan';
      break;
    case 'editor-patch-gate':
      report = createApplyPlanReport({ ...options, requireInput: true });
      reportBaseName = 'gwangju-precision-v1-editor-patch-gate';
      break;
    case 'editor-patch-write-guard':
      report = createWriteGuardReport(options);
      reportBaseName = 'gwangju-precision-v1-editor-patch-write-guard';
      break;
    case 'editor-postwrite-gate':
      report = createPostwriteGateReport();
      reportBaseName = 'gwangju-precision-v1-editor-postwrite-gate';
      break;
    default:
      throw new Error(`Unknown Gwangju precision v1 editor task: ${options.task}`);
  }

  const paths = writeReport(reportBaseName, report);
  console.log(JSON.stringify({ status: report.status, reports: paths, blockers: report.blockers?.length ?? 0 }, null, 2));

  if (report.status === 'blocked' && options.requireInput) {
    process.exitCode = 1;
  }
}

main();
