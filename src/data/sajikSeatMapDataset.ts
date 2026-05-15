import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_SEATMAP_IMAGE,
  type SajikBlock,
  type SajikFanRole,
  type SajikLevel,
  type SajikMapInteractionStatus,
  type SajikMarkerType,
  type SajikPixelAlignmentStatus,
  type SajikSectionKind,
  type SajikSide,
  type SajikTraceMethod,
  type SajikTraceSource,
  type SajikTraceVersion,
} from './sajikSeatData';
import {
  pathToPoints,
  pointsToPath,
  polygonArea,
  validateSeatMapPolygonPathIssues,
  type SeatMapPoint,
  type SeatMapPolygonValidationIssue,
  type SeatMapPolygonValidationSeverity,
} from '../utils/seatMapPolygonValidator';

export interface SajikSeatMapDatasetImage {
  path: string;
  width: number;
  height: number;
  viewBox: string;
  sha256: string;
  sourceLabel: string;
  sourceUrl: string | null;
}

export interface SajikSeatMapDatasetSection {
  sectionId: string;
  sectionName: string;
  blockId: string;
  officialBlocks: string[];
  seatCategory: string;
  seatCategoryLabel: string;
  level: SajikLevel;
  floor: number | null;
  side: SajikSide;
  fanRole: SajikFanRole;
  color: string;
  visualPath: string;
  hitPath: string;
  visualPolygon: SeatMapPoint[];
  hitPolygon: SeatMapPoint[];
  labelPoint: SeatMapPoint;
  enabled: boolean;
  mapInteractionStatus: SajikMapInteractionStatus;
  sectionKind: SajikSectionKind;
  markerType?: SajikMarkerType;
  geometryVersion?: SajikTraceVersion;
  traceMethod: SajikTraceMethod;
  traceSource: SajikTraceSource;
  traceVersion: SajikTraceVersion;
  manualReviewed: boolean;
  pixelAlignmentStatus: SajikPixelAlignmentStatus;
  displayPriority: number;
  hitPathExpansionCandidate: boolean;
}

export interface SajikSeatMapDatasetMarker {
  markerId: string;
  type: SajikMarkerType;
  position: SeatMapPoint;
  relatedSectionId: string;
  relatedBlockId: string;
  enabled: boolean;
}

export interface SajikSeatMapDataset {
  stadiumId: typeof SAJIK_SEATMAP_IMAGE.stadiumId;
  mapVersion: typeof SAJIK_SEATMAP_IMAGE.mapVersion;
  coordinateSystem: 'SVG_VIEW_BOX';
  image: SajikSeatMapDatasetImage;
  summary: {
    totalSections: number;
    enabledSections: number;
    aliasOnlySections: number;
    markers: number;
  };
  sections: SajikSeatMapDatasetSection[];
  markers: SajikSeatMapDatasetMarker[];
}

export type SajikSeatMapDatasetIssueCode =
  | SeatMapPolygonValidationIssue['code']
  | 'DUPLICATE_SECTION_ID'
  | 'HIT_POLYGON_TOO_SMALL'
  | 'MARKER_RELATED_SECTION_MISSING'
  | 'MARKER_OUT_OF_BOUNDS';

export interface SajikSeatMapDatasetValidationIssue {
  code: SajikSeatMapDatasetIssueCode;
  severity: SeatMapPolygonValidationSeverity;
  sectionId?: string;
  markerId?: string;
  pathKind?: string;
  message: string;
}

export interface SajikSeatMapSectionPatchGeometry {
  visualPath: string;
  hitPath: string;
  labelPoint: SeatMapPoint;
  visualPolygon: SeatMapPoint[];
  hitPolygon: SeatMapPoint[];
}

export interface SajikSeatMapSectionPatchPayload {
  type: 'SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW';
  stadiumId: typeof SAJIK_SEATMAP_IMAGE.stadiumId;
  mapVersion: typeof SAJIK_SEATMAP_IMAGE.mapVersion;
  sectionId: string;
  blockId: string;
  enabled: boolean;
  sectionKind: SajikSectionKind;
  markerType?: SajikMarkerType;
  before: SajikSeatMapSectionPatchGeometry;
  after: SajikSeatMapSectionPatchGeometry;
  validation: {
    status: 'PASS' | 'FAIL';
    issueCount: number;
    issues: SajikSeatMapDatasetValidationIssue[];
  };
}

export const SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS = [
  '012',
  '013',
  '021',
  '022',
  '023',
  '031',
  '032',
  '033',
  '041',
  '044',
  '121',
  '122',
  '123',
  '124',
  '125',
  '131',
  '132',
  '133',
  '134',
  '135',
  '142',
  '143',
] as const;

const hitPathExpansionCandidateSectionIds = new Set<string>(SAJIK_HITPATH_EXPANSION_CANDIDATE_SECTION_IDS);
const HIT_POLYGON_MIN_VISUAL_AREA_RATIO = 0.75;

function escapeTsString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function formatPointForTs(point: SeatMapPoint): string {
  return `[${point[0]}, ${point[1]}]`;
}

const floorByLevel: Record<SajikLevel, number | null> = {
  '1F': 1,
  '2F': 2,
  '3F': 3,
  OUTFIELD: null,
};

function labelPointForBlock(block: SajikBlock): SeatMapPoint {
  return block.imageGeometry.labelPoint ?? [block.imageGeometry.labelX, block.imageGeometry.labelY];
}

function sectionFromBlock(block: SajikBlock): SajikSeatMapDatasetSection {
  const category = SAJIK_CATEGORIES[block.category];
  const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.hitPath ?? visualPath;

  return {
    sectionId: block.block,
    sectionName: block.name,
    blockId: block.id,
    officialBlocks: block.officialBlocks,
    seatCategory: block.category,
    seatCategoryLabel: category?.label ?? block.category,
    level: block.level,
    floor: floorByLevel[block.level],
    side: block.side,
    fanRole: block.fanRole,
    color: category?.light ?? '#64748B',
    visualPath,
    hitPath,
    visualPolygon: pathToPoints(visualPath),
    hitPolygon: pathToPoints(hitPath),
    labelPoint: labelPointForBlock(block),
    enabled: block.mapInteractionStatus === 'MAP_SELECTABLE',
    mapInteractionStatus: block.mapInteractionStatus,
    sectionKind: block.sectionKind ?? (block.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
      ? 'ALIAS_ONLY'
      : block.markerType === 'WHEELCHAIR'
        ? 'ACCESSIBILITY_MARKER'
        : 'SEAT_SECTION'),
    markerType: block.markerType,
    geometryVersion: block.imageGeometry.geometryVersion,
    traceMethod: block.imageGeometry.traceMethod,
    traceSource: block.imageGeometry.traceSource,
    traceVersion: block.imageGeometry.traceVersion,
    manualReviewed: block.imageGeometry.manualReviewed,
    pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
    displayPriority: block.displayPriority,
    hitPathExpansionCandidate: hitPathExpansionCandidateSectionIds.has(block.block),
  };
}

function markerFromBlock(block: SajikBlock): SajikSeatMapDatasetMarker | null {
  if (!block.markerType) {
    return null;
  }

  return {
    markerId: `sajik-${block.markerType.toLowerCase()}-${block.block}`,
    type: block.markerType,
    position: labelPointForBlock(block),
    relatedSectionId: block.block,
    relatedBlockId: block.id,
    enabled: block.mapInteractionStatus === 'MAP_SELECTABLE',
  };
}

export function buildSajikSeatMapDataset(blocks: SajikBlock[] = SAJIK_BLOCKS): SajikSeatMapDataset {
  const sections = blocks.map(sectionFromBlock).sort((left, right) => left.displayPriority - right.displayPriority);
  const markers = blocks.map(markerFromBlock).filter((marker): marker is SajikSeatMapDatasetMarker => Boolean(marker));

  return {
    stadiumId: SAJIK_SEATMAP_IMAGE.stadiumId,
    mapVersion: SAJIK_SEATMAP_IMAGE.mapVersion,
    coordinateSystem: 'SVG_VIEW_BOX',
    image: {
      path: SAJIK_SEATMAP_IMAGE.imagePath,
      width: SAJIK_SEATMAP_IMAGE.imageWidth,
      height: SAJIK_SEATMAP_IMAGE.imageHeight,
      viewBox: SAJIK_SEATMAP_IMAGE.viewBox,
      sha256: SAJIK_SEATMAP_IMAGE.imageSha256,
      sourceLabel: SAJIK_SEATMAP_IMAGE.sourceLabel,
      sourceUrl: SAJIK_SEATMAP_IMAGE.sourceUrl,
    },
    summary: {
      totalSections: sections.length,
      enabledSections: sections.filter((section) => section.enabled).length,
      aliasOnlySections: sections.filter((section) => section.mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE').length,
      markers: markers.length,
    },
    sections,
    markers,
  };
}

export function validateSajikSeatMapDataset(dataset: SajikSeatMapDataset): string[] {
  return validateSajikSeatMapDatasetIssues(dataset).map(formatSajikSeatMapDatasetIssue);
}

export function formatSajikSeatMapDatasetIssue(issue: SajikSeatMapDatasetValidationIssue): string {
  const target = issue.sectionId ?? issue.markerId ?? 'dataset';
  const pathKind = issue.pathKind ? `:${issue.pathKind}` : '';
  return `${target}${pathKind}:${issue.code}`;
}

export function validateSajikSeatMapDatasetIssues(dataset: SajikSeatMapDataset): SajikSeatMapDatasetValidationIssue[] {
  const structuredIssues: SajikSeatMapDatasetValidationIssue[] = [];
  const sectionIds = new Set<string>();

  dataset.sections.forEach((section) => {
    if (sectionIds.has(section.sectionId)) {
      structuredIssues.push({
        code: 'DUPLICATE_SECTION_ID',
        severity: 'error',
        sectionId: section.sectionId,
        message: 'Section ids must be unique.',
      });
    }
    sectionIds.add(section.sectionId);

    structuredIssues.push(...validateSajikSeatMapSectionGeometry(section, dataset.image));
  });

  dataset.markers.forEach((marker) => {
    if (!sectionIds.has(marker.relatedSectionId)) {
      structuredIssues.push({
        code: 'MARKER_RELATED_SECTION_MISSING',
        severity: 'error',
        markerId: marker.markerId,
        sectionId: marker.relatedSectionId,
        message: 'Marker must point to an exported section.',
      });
    }
    const [x, y] = marker.position;
    if (x < 0 || x > dataset.image.width || y < 0 || y > dataset.image.height) {
      structuredIssues.push({
        code: 'MARKER_OUT_OF_BOUNDS',
        severity: 'error',
        markerId: marker.markerId,
        sectionId: marker.relatedSectionId,
        message: 'Marker position must stay within the image bounds.',
      });
    }
  });

  return structuredIssues;
}

export function geometrySnapshotForSection(section: SajikSeatMapDatasetSection): SajikSeatMapSectionPatchGeometry {
  return {
    visualPath: section.visualPath,
    hitPath: section.hitPath,
    labelPoint: section.labelPoint,
    visualPolygon: pathToPoints(section.visualPath),
    hitPolygon: pathToPoints(section.hitPath),
  };
}

export function geometrySnapshotFromPolygons({
  visualPolygon,
  hitPolygon,
  labelPoint,
}: {
  visualPolygon: SeatMapPoint[];
  hitPolygon: SeatMapPoint[];
  labelPoint: SeatMapPoint;
}): SajikSeatMapSectionPatchGeometry {
  return {
    visualPath: pointsToPath(visualPolygon),
    hitPath: pointsToPath(hitPolygon),
    labelPoint,
    visualPolygon,
    hitPolygon,
  };
}

export function validateSajikSeatMapSectionGeometry(
  section: Pick<SajikSeatMapDatasetSection, 'sectionId' | 'visualPath' | 'hitPath' | 'labelPoint'>,
  image: SajikSeatMapDatasetImage,
): SajikSeatMapDatasetValidationIssue[] {
  const issues = ([
    ['visualPath', section.visualPath],
    ['hitPath', section.hitPath],
  ] as const).flatMap(([pathKind, pathData]) => (
    validateSeatMapPolygonPathIssues({
      pathData,
      width: image.width,
      height: image.height,
      labelPoint: section.labelPoint,
      labelTolerance: 1,
      sectionId: section.sectionId,
      pathKind,
    })
  ));

  const visualArea = polygonArea(pathToPoints(section.visualPath));
  const hitArea = polygonArea(pathToPoints(section.hitPath));
  if (
    visualArea > 0
    && hitArea > 0
    && hitArea < visualArea * HIT_POLYGON_MIN_VISUAL_AREA_RATIO
  ) {
    issues.push({
      code: 'HIT_POLYGON_TOO_SMALL',
      severity: 'error',
      sectionId: section.sectionId,
      pathKind: 'hitPath',
      message: `Hit polygon area must be at least ${Math.round(HIT_POLYGON_MIN_VISUAL_AREA_RATIO * 100)}% of visual polygon area.`,
    });
  }

  return issues;
}

export function buildSajikSeatMapSectionPatchPayload(
  section: SajikSeatMapDatasetSection,
  dataset: SajikSeatMapDataset,
  after: SajikSeatMapSectionPatchGeometry = geometrySnapshotForSection(section),
): SajikSeatMapSectionPatchPayload {
  const afterSection = {
    sectionId: section.sectionId,
    visualPath: after.visualPath,
    hitPath: after.hitPath,
    labelPoint: after.labelPoint,
  };
  const issues = validateSajikSeatMapSectionGeometry(afterSection, dataset.image);

  return {
    type: 'SAJIK_SECTION_GEOMETRY_PATCH_PREVIEW',
    stadiumId: dataset.stadiumId,
    mapVersion: dataset.mapVersion,
    sectionId: section.sectionId,
    blockId: section.blockId,
    enabled: section.enabled,
    sectionKind: section.sectionKind,
    markerType: section.markerType,
    before: geometrySnapshotForSection(section),
    after,
    validation: {
      status: issues.length === 0 ? 'PASS' : 'FAIL',
      issueCount: issues.length,
      issues,
    },
  };
}

export function formatSajikSeatMapSectionPatchTsFragment(payload: SajikSeatMapSectionPatchPayload): string {
  const markerTypeLine = payload.markerType ? `  markerType: '${payload.markerType}',\n` : '';

  return [
    `// ${payload.mapVersion} ${payload.sectionId} geometry patch preview`,
    '// Apply manually only after validation.status is PASS.',
    '{',
    `  sectionId: '${escapeTsString(payload.sectionId)}',`,
    `  blockId: '${escapeTsString(payload.blockId)}',`,
    `  sectionKind: '${payload.sectionKind}',`,
    `${markerTypeLine}  imageGeometry: {`,
    `    visualPath: '${escapeTsString(payload.after.visualPath)}',`,
    `    hitPath: '${escapeTsString(payload.after.hitPath)}',`,
    `    labelPoint: ${formatPointForTs(payload.after.labelPoint)} as const,`,
    '  },',
    '}',
  ].join('\n');
}
