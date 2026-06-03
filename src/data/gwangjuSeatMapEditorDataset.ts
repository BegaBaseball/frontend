import {
  GWANGJU_BLOCKS,
  GWANGJU_CATEGORIES,
  GWANGJU_FULL_RETRACE_GENERATION,
  GWANGJU_FULL_RETRACE_VERSION,
  GWANGJU_OFFICIAL_TRACE_REFERENCE,
  GWANGJU_PREVIOUS_TRACE_VERSION,
  GWANGJU_SEATMAP_IMAGE,
  type GwangjuBlock,
  type GwangjuFanRole,
  type GwangjuLevel,
  type GwangjuPixelAlignmentStatus,
  type GwangjuSide,
  type GwangjuTraceGeneration,
  type GwangjuTraceMethod,
  type GwangjuTraceSource,
  type GwangjuTraceStatus,
} from './gwangjuSeatData';
import {
  pathToPoints,
  pointInsideOrNearPolygon,
  pointsToPath,
  polygonArea,
  validateSeatMapPolygonPathIssues,
  type SeatMapPoint,
  type SeatMapPolygonValidationIssue,
  type SeatMapPolygonValidationSeverity,
} from '../utils/seatMapPolygonValidator';

export interface GwangjuSeatMapEditorDatasetImage {
  path: string;
  width: number;
  height: number;
  viewBox: string;
  sourceLabel: string;
  sourceUrl: string | null;
  requiredAssetFileName: string;
}

export interface GwangjuSeatMapEditorSection {
  sectionId: string;
  sectionName: string;
  blockId: string;
  officialBlocks: string[];
  seatCategory: string;
  seatCategoryLabel: string;
  level: GwangjuLevel;
  side: GwangjuSide;
  fanRole: GwangjuFanRole;
  color: string;
  visualPath: string;
  hitPath: string;
  visualPolygons: SeatMapPoint[][];
  hitPolygons: SeatMapPoint[][];
  labelPoint: SeatMapPoint;
  enabled: boolean;
  traceStatus: GwangjuTraceStatus;
  traceMethod: GwangjuTraceMethod;
  traceSource: GwangjuTraceSource;
  traceVersion: string;
  previousTraceVersion: string;
  traceGeneration: GwangjuTraceGeneration;
  manualReviewed: boolean;
  pixelAlignmentStatus: GwangjuPixelAlignmentStatus;
  highRiskWorksetIds: string[];
  officialReference: (typeof GWANGJU_OFFICIAL_TRACE_REFERENCE)[keyof typeof GWANGJU_OFFICIAL_TRACE_REFERENCE] | null;
}

export interface GwangjuSeatMapEditorDataset {
  stadiumId: 'gwangju-kia';
  mapVersion: typeof GWANGJU_FULL_RETRACE_VERSION;
  previousMapVersion: typeof GWANGJU_PREVIOUS_TRACE_VERSION;
  coordinateSystem: 'SVG_VIEW_BOX';
  image: GwangjuSeatMapEditorDatasetImage;
  summary: {
    totalSections: number;
    enabledSections: number;
    highRiskSections: number;
    derivedAggregateSections: number;
  };
  sections: GwangjuSeatMapEditorSection[];
}

export type GwangjuSeatMapEditorDatasetIssueCode =
  | SeatMapPolygonValidationIssue['code']
  | 'DUPLICATE_SECTION_ID'
  | 'LABEL_OUTSIDE_ALL_HIT_POLYGONS'
  | 'VISUAL_HIT_SUBPATH_COUNT_MISMATCH'
  | 'OFFICIAL_REFERENCE_SUBPATH_COUNT_MISMATCH'
  | 'OFFICIAL_REFERENCE_BOUNDS_MISMATCH'
  | 'TRACE_VERSION_MISMATCH'
  | 'PREVIOUS_TRACE_VERSION_MISMATCH';

export interface GwangjuSeatMapEditorDatasetValidationIssue {
  code: GwangjuSeatMapEditorDatasetIssueCode;
  severity: SeatMapPolygonValidationSeverity;
  sectionId?: string;
  pathKind?: string;
  message: string;
}

export interface GwangjuSeatMapEditorPatchGeometry {
  visualPath: string;
  hitPath: string;
  labelPoint: SeatMapPoint;
  visualPolygons: SeatMapPoint[][];
  hitPolygons: SeatMapPoint[][];
}

export interface GwangjuSeatMapEditorPatchPayload {
  type: 'GWANGJU_PRECISION_V1_SECTION_GEOMETRY_PATCH_PREVIEW';
  stadiumId: GwangjuSeatMapEditorDataset['stadiumId'];
  mapVersion: typeof GWANGJU_FULL_RETRACE_VERSION;
  previousMapVersion: typeof GWANGJU_PREVIOUS_TRACE_VERSION;
  traceGeneration: typeof GWANGJU_FULL_RETRACE_GENERATION;
  sectionId: string;
  blockId: string;
  highRiskWorksetIds: string[];
  before: GwangjuSeatMapEditorPatchGeometry;
  after: GwangjuSeatMapEditorPatchGeometry;
  validation: {
    status: 'PASS' | 'FAIL';
    issueCount: number;
    issues: GwangjuSeatMapEditorDatasetValidationIssue[];
  };
}

const OFFICIAL_IMAGE_VIEW_BOX = `0 0 ${GWANGJU_SEATMAP_IMAGE.imageWidth} ${GWANGJU_SEATMAP_IMAGE.imageHeight}`;
const DERIVED_AGGREGATE_SECTION_IDS = new Set(['home-k7-seats', 'away-cheering-seats']);
const HIDDEN_POLYGON_STROKE_SECTION_IDS = new Set([
  'k7-121',
  'k7-122',
  'k8-123',
  'k5-124',
  'k5-125',
  'k5-126',
  'k5-127',
]);
const TOLERATED_CURRENT_SOURCE_SELF_INTERSECTION_IDS = new Set([
  'k5-125',
  'sky-picnic-s-321',
  'sky-picnic-s-330',
]);
const BOUNDS_TOLERANCE_PX = 0.5;
const SKY_PICNIC_VISUAL_REFERENCE_PATTERN = /^sky-picnic-s-(30[5-9]|31\d|32\d|33[0-5])$/;

function escapeTsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatPointForTs(point: SeatMapPoint): string {
  return `[${point[0]}, ${point[1]}]`;
}

function formatPolygonsForTs(polygons: SeatMapPoint[][]): string {
  return `[${polygons.map((polygon) => `[${polygon.map(formatPointForTs).join(', ')}]`).join(', ')}]`;
}

function splitPathSubpaths(pathData: string): string[] {
  return pathData.match(/M\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?(?:\sL\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?)+\sZ/g) ?? [];
}

export function pathToGwangjuEditorPolygons(pathData: string): SeatMapPoint[][] {
  const subpaths = splitPathSubpaths(pathData);
  return (subpaths.length > 0 ? subpaths : [pathData])
    .map((subpath) => pathToPoints(subpath))
    .filter((points) => points.length > 0);
}

export function gwangjuEditorPolygonsToPath(polygons: SeatMapPoint[][]): string {
  return polygons.map(pointsToPath).join(' ');
}

function labelPointForBlock(block: GwangjuBlock): SeatMapPoint {
  return [block.imageGeometry.labelX, block.imageGeometry.labelY];
}

function highRiskWorksetIdsForBlock(block: GwangjuBlock): string[] {
  const worksets: string[] = [];

  if (/^k[578]-12[1-7]$/.test(block.id)) {
    worksets.push('third-infield-121-127');
  }
  if (['third-wheelchair-seats', 'party-seats-third', 'sky-picnic-L'].includes(block.id)) {
    worksets.push('alphabet-i-j-l');
  }
  if (block.id.startsWith('sky-picnic-s-')) {
    worksets.push('sky-picnic-s-301-335');
  }
  if (block.id.startsWith('five-table-')) {
    worksets.push('five-table-501-535');
  }
  if (DERIVED_AGGREGATE_SECTION_IDS.has(block.id)) {
    worksets.push('derived-aggregate');
  }
  if (HIDDEN_POLYGON_STROKE_SECTION_IDS.has(block.id)) {
    worksets.push('hidden-stroke-121-127');
  }

  return worksets;
}

function boundsForPolygons(polygons: SeatMapPoint[][]) {
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

function boundsMatch(
  actual: ReturnType<typeof boundsForPolygons>,
  expected: NonNullable<GwangjuSeatMapEditorSection['officialReference']>['expectedBounds'],
): boolean {
  return Math.abs(actual.minX - expected.minX) <= BOUNDS_TOLERANCE_PX
    && Math.abs(actual.minY - expected.minY) <= BOUNDS_TOLERANCE_PX
    && Math.abs(actual.maxX - expected.maxX) <= BOUNDS_TOLERANCE_PX
    && Math.abs(actual.maxY - expected.maxY) <= BOUNDS_TOLERANCE_PX;
}

function sectionFromBlock(block: GwangjuBlock): GwangjuSeatMapEditorSection {
  const category = GWANGJU_CATEGORIES[block.category];
  const visualPath = block.imageGeometry.visualD ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.d;

  return {
    sectionId: block.id,
    sectionName: block.name,
    blockId: block.block,
    officialBlocks: block.officialBlocks,
    seatCategory: block.category,
    seatCategoryLabel: category?.label ?? block.category,
    level: block.level,
    side: block.side,
    fanRole: block.fanRole,
    color: category?.light ?? '#64748B',
    visualPath,
    hitPath,
    visualPolygons: pathToGwangjuEditorPolygons(visualPath),
    hitPolygons: pathToGwangjuEditorPolygons(hitPath),
    labelPoint: labelPointForBlock(block),
    enabled: true,
    traceStatus: block.imageGeometry.traceStatus,
    traceMethod: block.imageGeometry.traceMethod,
    traceSource: block.imageGeometry.traceSource,
    traceVersion: block.imageGeometry.traceVersion,
    previousTraceVersion: block.imageGeometry.previousTraceVersion,
    traceGeneration: block.imageGeometry.traceGeneration,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    highRiskWorksetIds: highRiskWorksetIdsForBlock(block),
    officialReference: GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id] ?? null,
  };
}

export function buildGwangjuSeatMapEditorDataset(blocks: readonly GwangjuBlock[] = GWANGJU_BLOCKS): GwangjuSeatMapEditorDataset {
  const sections = blocks.map(sectionFromBlock);

  return {
    stadiumId: 'gwangju-kia',
    mapVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousMapVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    coordinateSystem: 'SVG_VIEW_BOX',
    image: {
      path: GWANGJU_SEATMAP_IMAGE.imagePath,
      width: GWANGJU_SEATMAP_IMAGE.imageWidth,
      height: GWANGJU_SEATMAP_IMAGE.imageHeight,
      viewBox: OFFICIAL_IMAGE_VIEW_BOX,
      sourceLabel: GWANGJU_SEATMAP_IMAGE.sourceLabel,
      sourceUrl: GWANGJU_SEATMAP_IMAGE.sourceUrl,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    summary: {
      totalSections: sections.length,
      enabledSections: sections.filter((section) => section.enabled).length,
      highRiskSections: sections.filter((section) => section.highRiskWorksetIds.length > 0).length,
      derivedAggregateSections: sections.filter((section) => DERIVED_AGGREGATE_SECTION_IDS.has(section.sectionId)).length,
    },
    sections,
  };
}

export function validateGwangjuSeatMapEditorSectionGeometry(
  section: Pick<GwangjuSeatMapEditorSection, 'sectionId' | 'visualPath' | 'hitPath' | 'visualPolygons' | 'hitPolygons' | 'labelPoint' | 'traceVersion' | 'previousTraceVersion' | 'officialReference'>,
  image: GwangjuSeatMapEditorDatasetImage,
  options: { enforceOfficialReference?: boolean } = {},
): GwangjuSeatMapEditorDatasetValidationIssue[] {
  const issues: GwangjuSeatMapEditorDatasetValidationIssue[] = [];
  const pathEntries = [
    ['visualPath', section.visualPath],
    ['hitPath', section.hitPath],
  ] as const;

  pathEntries.forEach(([pathKind, pathData]) => {
    splitPathSubpaths(pathData).forEach((subpath, subpathIndex) => {
      const pathIssues = validateSeatMapPolygonPathIssues({
        pathData: subpath,
        width: image.width,
        height: image.height,
        minPointCount: 3,
        sectionId: section.sectionId,
        pathKind: `${pathKind}[${subpathIndex}]`,
      }).filter((issue) => (
        issue.code !== 'SELF_INTERSECTION'
        || !TOLERATED_CURRENT_SOURCE_SELF_INTERSECTION_IDS.has(section.sectionId)
      ));
      issues.push(...pathIssues);
    });
  });

  if (!section.hitPolygons.some((polygon) => pointInsideOrNearPolygon(section.labelPoint, polygon, 1))) {
    issues.push({
      code: 'LABEL_OUTSIDE_ALL_HIT_POLYGONS',
      severity: 'error',
      sectionId: section.sectionId,
      pathKind: 'labelPoint',
      message: 'Label point must be inside at least one hit polygon subpath.',
    });
  }
  if (section.traceVersion !== GWANGJU_FULL_RETRACE_VERSION) {
    issues.push({
      code: 'TRACE_VERSION_MISMATCH',
      severity: 'error',
      sectionId: section.sectionId,
      message: `Trace version must be ${GWANGJU_FULL_RETRACE_VERSION}.`,
    });
  }
  if (section.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION) {
    issues.push({
      code: 'PREVIOUS_TRACE_VERSION_MISMATCH',
      severity: 'error',
      sectionId: section.sectionId,
      message: `Previous trace version must be ${GWANGJU_PREVIOUS_TRACE_VERSION}.`,
    });
  }
  if (options.enforceOfficialReference !== false && section.officialReference) {
    const referencePolygons = SKY_PICNIC_VISUAL_REFERENCE_PATTERN.test(section.sectionId)
      ? section.visualPolygons
      : section.hitPolygons;
    const referencePathKind = SKY_PICNIC_VISUAL_REFERENCE_PATTERN.test(section.sectionId)
      ? 'visualPath'
      : 'hitPath';
    const bounds = boundsForPolygons(referencePolygons);
    if (referencePolygons.length !== section.officialReference.expectedSubpathCount) {
      issues.push({
        code: 'OFFICIAL_REFERENCE_SUBPATH_COUNT_MISMATCH',
        severity: 'error',
        sectionId: section.sectionId,
        pathKind: referencePathKind,
        message: 'Reference subpath count must match the locked official trace reference.',
      });
    }
    if (!boundsMatch(bounds, section.officialReference.expectedBounds)) {
      issues.push({
        code: 'OFFICIAL_REFERENCE_BOUNDS_MISMATCH',
        severity: 'error',
        sectionId: section.sectionId,
        pathKind: referencePathKind,
        message: 'Reference bounds must match the locked official trace reference bounds.',
      });
    }
  }

  return issues;
}

export function validateGwangjuSeatMapEditorDatasetIssues(
  dataset: GwangjuSeatMapEditorDataset,
): GwangjuSeatMapEditorDatasetValidationIssue[] {
  const issues: GwangjuSeatMapEditorDatasetValidationIssue[] = [];
  const sectionIds = new Set<string>();

  dataset.sections.forEach((section) => {
    if (sectionIds.has(section.sectionId)) {
      issues.push({
        code: 'DUPLICATE_SECTION_ID',
        severity: 'error',
        sectionId: section.sectionId,
        message: 'Section ids must be unique.',
      });
    }
    sectionIds.add(section.sectionId);
    issues.push(...validateGwangjuSeatMapEditorSectionGeometry(section, dataset.image));
  });

  return issues;
}

export function validateGwangjuSeatMapEditorDataset(dataset: GwangjuSeatMapEditorDataset): string[] {
  return validateGwangjuSeatMapEditorDatasetIssues(dataset)
    .map((issue) => `${issue.sectionId ?? 'dataset'}${issue.pathKind ? `:${issue.pathKind}` : ''}:${issue.code}`);
}

export function geometrySnapshotForGwangjuSection(section: GwangjuSeatMapEditorSection): GwangjuSeatMapEditorPatchGeometry {
  return {
    visualPath: section.visualPath,
    hitPath: section.hitPath,
    labelPoint: section.labelPoint,
    visualPolygons: section.visualPolygons,
    hitPolygons: section.hitPolygons,
  };
}

export function geometrySnapshotFromGwangjuPolygons({
  visualPolygons,
  hitPolygons,
  labelPoint,
}: {
  visualPolygons: SeatMapPoint[][];
  hitPolygons: SeatMapPoint[][];
  labelPoint: SeatMapPoint;
}): GwangjuSeatMapEditorPatchGeometry {
  return {
    visualPath: gwangjuEditorPolygonsToPath(visualPolygons),
    hitPath: gwangjuEditorPolygonsToPath(hitPolygons),
    labelPoint,
    visualPolygons,
    hitPolygons,
  };
}

export function buildGwangjuSeatMapEditorPatchPayload(
  section: GwangjuSeatMapEditorSection,
  dataset: GwangjuSeatMapEditorDataset,
  after: GwangjuSeatMapEditorPatchGeometry = geometrySnapshotForGwangjuSection(section),
): GwangjuSeatMapEditorPatchPayload {
  const issues = validateGwangjuSeatMapEditorSectionGeometry({
    sectionId: section.sectionId,
    visualPath: after.visualPath,
    hitPath: after.hitPath,
    visualPolygons: after.visualPolygons,
    hitPolygons: after.hitPolygons,
    labelPoint: after.labelPoint,
    traceVersion: section.traceVersion,
    previousTraceVersion: section.previousTraceVersion,
    officialReference: section.officialReference,
  }, dataset.image, { enforceOfficialReference: false });

  return {
    type: 'GWANGJU_PRECISION_V1_SECTION_GEOMETRY_PATCH_PREVIEW',
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    previousMapVersion: dataset.previousMapVersion,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    sectionId: section.sectionId,
    blockId: section.blockId,
    highRiskWorksetIds: section.highRiskWorksetIds,
    before: geometrySnapshotForGwangjuSection(section),
    after,
    validation: {
      status: issues.length === 0 ? 'PASS' : 'FAIL',
      issueCount: issues.length,
      issues,
    },
  };
}

export function formatGwangjuSeatMapEditorPatchTsFragment(payload: GwangjuSeatMapEditorPatchPayload): string {
  return [
    `// ${payload.mapVersion} ${payload.sectionId} geometry patch preview`,
    '// Apply manually only after validation.status is PASS and CLI apply-plan reports no blockers.',
    '{',
    `  sectionId: '${escapeTsString(payload.sectionId)}',`,
    `  blockId: '${escapeTsString(payload.blockId)}',`,
    `  highRiskWorksetIds: ${JSON.stringify(payload.highRiskWorksetIds)},`,
    '  imageGeometry: {',
    `    visualPath: '${escapeTsString(payload.after.visualPath)}',`,
    `    hitPath: '${escapeTsString(payload.after.hitPath)}',`,
    `    labelPoint: ${formatPointForTs(payload.after.labelPoint)} as const,`,
    `    visualPolygons: ${formatPolygonsForTs(payload.after.visualPolygons)} as const,`,
    `    hitPolygons: ${formatPolygonsForTs(payload.after.hitPolygons)} as const,`,
    '  },',
    '}',
  ].join('\n');
}

export function calculateGwangjuEditorPatchStats(payload: GwangjuSeatMapEditorPatchPayload) {
  const beforeVisualPointCount = payload.before.visualPolygons.reduce((total, polygon) => total + polygon.length, 0);
  const afterVisualPointCount = payload.after.visualPolygons.reduce((total, polygon) => total + polygon.length, 0);
  const beforeBounds = boundsForPolygons(payload.before.visualPolygons);
  const afterBounds = boundsForPolygons(payload.after.visualPolygons);

  return {
    visualPointDelta: afterVisualPointCount - beforeVisualPointCount,
    beforeVisualArea: payload.before.visualPolygons.reduce((total, polygon) => total + polygonArea(polygon), 0),
    afterVisualArea: payload.after.visualPolygons.reduce((total, polygon) => total + polygonArea(polygon), 0),
    beforeBounds,
    afterBounds,
    boundsDelta: {
      minX: afterBounds.minX - beforeBounds.minX,
      minY: afterBounds.minY - beforeBounds.minY,
      maxX: afterBounds.maxX - beforeBounds.maxX,
      maxY: afterBounds.maxY - beforeBounds.maxY,
    },
  };
}
