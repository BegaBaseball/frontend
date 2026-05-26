import {
  SAJIK_BLOCKS,
  SAJIK_CATEGORIES,
  SAJIK_SEATMAP_IMAGE,
  type SajikBlock,
  type SajikImageGeometry,
  type SajikSeatMapImage,
} from './sajikSeatData';
import {
  SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET,
  SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES,
  type SajikOperatorReferenceDatasetMarker,
  type SajikOperatorReferenceDatasetSection,
} from './sajikOperatorReferenceSeatMapDataset';
import {
  validateSeatMapPolygonPathIssues,
  type SeatMapPoint,
} from '../utils/seatMapPolygonValidator';

export const SAJIK_CANONICAL_SEATMAP_SOURCE_ID = 'SAJIK_CANONICAL_2026';
export const SAJIK_CANONICAL_MAP_VERSION = 'BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1';
export const SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS = ['323', '322', '921'] as const;

export type SajikCanonicalSourceId = typeof SAJIK_CANONICAL_SEATMAP_SOURCE_ID;

export type SajikCanonicalBlock = SajikBlock & {
  canonicalSourceId: SajikCanonicalSourceId;
  operatorReferenceSectionId: string;
};

export type SajikCanonicalLegacyAliasBlock = SajikBlock & {
  canonicalSourceId: 'LEGACY_OFFICIAL_PNG_ALIAS_ONLY';
  canonicalAliasReason: 'OPERATOR_REFERENCE_POLYGON_MISSING';
};

export interface SajikCanonicalAccessibilityMarkerAlias {
  id: string;
  markerId: string;
  name: string;
  block: string;
  officialBlocks: string[];
  markerType: 'WHEELCHAIR';
  sectionKind: 'ACCESSIBILITY_MARKER';
  canonicalSourceId: 'CANONICAL_ACCESSIBILITY_MARKER_ALIAS';
  canonicalAliasReason: 'OFFICIAL_PNG_WHEELCHAIR_MARKER_ALIAS';
  runtimePolygon: false;
  sourceNote: string;
}

export interface SajikCanonicalSeatMapSummary {
  sourceId: SajikCanonicalSourceId;
  mapVersion: typeof SAJIK_CANONICAL_MAP_VERSION;
  activeBlocks: number;
  activeSeatSections: number;
  accessibilityMarkers: number;
  linkedAccessibilityMarkers: number;
  legacyAliasOnlyBlocks: number;
  legacyAccessibilityMarkerAliases: number;
  operatorOnlyBlocks: number;
}

export const SAJIK_CANONICAL_SEATMAP_IMAGE: SajikSeatMapImage = {
  stadiumId: 'BUSAN_SAJIK',
  mapVersion: SAJIK_CANONICAL_MAP_VERSION,
  imagePath: 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp',
  imageWidth: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width,
  imageHeight: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height,
  viewBox: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.viewBox,
  imageSha256: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.sha256,
  sourceLabel: 'Operator-provided reference image, 2026-05-19',
  sourceUrl: null,
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'sajik-seatmap-operator-reference-2026.webp',
};

const blockBySectionId = new Map<string, SajikBlock>();
SAJIK_BLOCKS.forEach((block) => {
  blockBySectionId.set(block.block, block);
  block.officialBlocks.forEach((officialBlock) => {
    blockBySectionId.set(officialBlock, block);
  });
});

const overrideBySectionId = new Map(
  SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES.map((override) => [override.sectionId, override]),
);

function canonicalImageGeometryFromSection(
  section: SajikOperatorReferenceDatasetSection,
  fallback?: SajikBlock,
): SajikImageGeometry {
  const [labelX, labelY] = section.labelPoint;

  return {
    d: section.visualPath,
    visualPath: section.visualPath,
    hitPath: section.hitPath,
    labelX,
    labelY,
    labelPoint: [labelX, labelY],
    labelRotate: fallback?.imageGeometry.labelRotate,
    labelFontSize: fallback?.imageGeometry.labelFontSize ?? 12,
    shortLabel: section.sectionId,
    geometryVersion: 'manual-polygon-v2',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: 'manual-polygon-v2',
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: 'Canonical Sajik runtime polygon traced on the operator-reference 1151x1367 image.',
  };
}

function canonicalBlockFromOperatorSection(section: SajikOperatorReferenceDatasetSection): SajikCanonicalBlock {
  const existingBlock = blockBySectionId.get(section.sectionId);
  const override = overrideBySectionId.get(section.sectionId);
  const [labelX, labelY] = section.labelPoint;

  if (existingBlock) {
    return {
      ...existingBlock,
      block: section.sectionId,
      officialBlocks: Array.from(new Set([section.sectionId, ...existingBlock.officialBlocks])),
      traceStatus: 'OFFICIAL_IMAGE_TRACED',
      reviewNote: 'Canonical Sajik runtime polygon uses the operator-reference 1151x1367 image.',
      mapInteractionStatus: 'MAP_SELECTABLE',
      sourceNote: `${existingBlock.sourceNote} Canonical 좌표는 operator-reference 1151x1367 이미지 기준입니다.`,
      sectionKind: 'SEAT_SECTION',
      markerType: undefined,
      imageGeometry: canonicalImageGeometryFromSection(section, existingBlock),
      canonicalSourceId: SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
      operatorReferenceSectionId: section.sectionId,
    };
  }

  if (!override) {
    throw new Error(`Missing Sajik canonical metadata override for operator-reference section ${section.sectionId}`);
  }

  const categoryLabel = SAJIK_CATEGORIES[override.category]?.label ?? override.name;

  return {
    id: `sajik-canonical-${section.sectionId}`,
    level: override.level,
    category: override.category,
    name: override.name,
    block: section.sectionId,
    officialBlocks: [section.sectionId],
    side: override.side,
    fanRole: override.fanRole,
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    reviewNote: 'Canonical Sajik runtime polygon uses the operator-reference 1151x1367 image.',
    displayPriority: 10000 + Number(section.sectionId.replace(/\D/g, '') || 0),
    mapInteractionStatus: 'MAP_SELECTABLE',
    sourceConfidence: 'OFFICIAL',
    sourceNote: `${override.sourceNote} Canonical selectable block으로 승격된 operator-reference 검증 polygon입니다.`,
    seatViewSections: [
      `sajik-canonical-${section.sectionId}`,
      override.name,
      section.sectionId,
      `${section.sectionId}블록`,
      categoryLabel,
      '사직',
      '사직야구장',
      '부산 사직야구장',
      '롯데',
      '롯데 자이언츠',
    ],
    sectionKind: 'SEAT_SECTION',
    imageGeometry: canonicalImageGeometryFromSection(section),
    canonicalSourceId: SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
    operatorReferenceSectionId: section.sectionId,
  };
}

const operatorReferenceSectionIds = new Set(
  SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.map((section) => section.sectionId),
);

export const SAJIK_CANONICAL_BLOCKS: SajikCanonicalBlock[] = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections
  .map(canonicalBlockFromOperatorSection)
  .sort((left, right) => left.displayPriority - right.displayPriority);

export const SAJIK_CANONICAL_BLOCK_BY_SECTION_ID = new Map<string, SajikCanonicalBlock>();
SAJIK_CANONICAL_BLOCKS.forEach((block) => {
  SAJIK_CANONICAL_BLOCK_BY_SECTION_ID.set(block.block, block);
  block.officialBlocks.forEach((officialBlock) => {
    SAJIK_CANONICAL_BLOCK_BY_SECTION_ID.set(officialBlock, block);
  });
});

export const SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS: SajikCanonicalLegacyAliasBlock[] = SAJIK_BLOCKS
  .filter((block) => !operatorReferenceSectionIds.has(block.block) && block.sectionKind !== 'ACCESSIBILITY_MARKER')
  .map((block) => ({
    ...block,
    mapInteractionStatus: 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE',
    sectionKind: 'ALIAS_ONLY',
    canonicalSourceId: 'LEGACY_OFFICIAL_PNG_ALIAS_ONLY',
    canonicalAliasReason: 'OPERATOR_REFERENCE_POLYGON_MISSING',
  }));

export const SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES: SajikCanonicalAccessibilityMarkerAlias[] = SAJIK_BLOCKS
  .filter((block) => !operatorReferenceSectionIds.has(block.block) && block.sectionKind === 'ACCESSIBILITY_MARKER')
  .map((block) => ({
    id: `sajik-canonical-marker-alias-${block.block}`,
    markerId: block.block,
    name: block.name,
    block: block.block,
    officialBlocks: block.officialBlocks,
    markerType: 'WHEELCHAIR',
    sectionKind: 'ACCESSIBILITY_MARKER',
    canonicalSourceId: 'CANONICAL_ACCESSIBILITY_MARKER_ALIAS',
    canonicalAliasReason: 'OFFICIAL_PNG_WHEELCHAIR_MARKER_ALIAS',
    runtimePolygon: false,
    sourceNote: '기존 공식 PNG의 휠체어석 pseudo-block은 canonical seat polygon이 아니라 marker alias로만 보존합니다.',
  }));

export const SAJIK_CANONICAL_ACCESSIBILITY_MARKERS: SajikOperatorReferenceDatasetMarker[] = (
  SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers
);

export const SAJIK_CANONICAL_SEATMAP_SUMMARY: SajikCanonicalSeatMapSummary = {
  sourceId: SAJIK_CANONICAL_SEATMAP_SOURCE_ID,
  mapVersion: SAJIK_CANONICAL_MAP_VERSION,
  activeBlocks: SAJIK_CANONICAL_BLOCKS.length,
  activeSeatSections: SAJIK_CANONICAL_BLOCKS.filter((block) => block.sectionKind === 'SEAT_SECTION').length,
  accessibilityMarkers: SAJIK_CANONICAL_ACCESSIBILITY_MARKERS.length,
  linkedAccessibilityMarkers: SAJIK_CANONICAL_ACCESSIBILITY_MARKERS.filter((marker) => marker.enabled).length,
  legacyAliasOnlyBlocks: SAJIK_CANONICAL_LEGACY_ALIAS_ONLY_BLOCKS.length,
  legacyAccessibilityMarkerAliases: SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.length,
  operatorOnlyBlocks: SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS.length,
};

function validateCanonicalPath(
  block: SajikCanonicalBlock,
  pathKind: 'visualPath' | 'hitPath',
  labelPoint: SeatMapPoint,
): string[] {
  const pathData = pathKind === 'visualPath'
    ? block.imageGeometry.visualPath
    : block.imageGeometry.hitPath;
  if (!pathData) return [`${block.block}:${pathKind}:MISSING_PATH`];

  return validateSeatMapPolygonPathIssues({
    pathData,
    width: SAJIK_CANONICAL_SEATMAP_IMAGE.imageWidth,
    height: SAJIK_CANONICAL_SEATMAP_IMAGE.imageHeight,
    labelPoint,
    sectionId: block.block,
    pathKind,
  }).map((issue) => `${block.block}:${pathKind}:${issue.code}`);
}

export function validateSajikCanonicalSeatMap(): string[] {
  const issues: string[] = [];
  const sectionIds = new Set<string>();

  SAJIK_CANONICAL_BLOCKS.forEach((block) => {
    if (sectionIds.has(block.block)) {
      issues.push(`${block.block}:DUPLICATE_CANONICAL_SECTION_ID`);
    }
    sectionIds.add(block.block);

    if (block.canonicalSourceId !== SAJIK_CANONICAL_SEATMAP_SOURCE_ID) {
      issues.push(`${block.block}:INVALID_CANONICAL_SOURCE`);
    }
    if (block.mapInteractionStatus !== 'MAP_SELECTABLE') {
      issues.push(`${block.block}:CANONICAL_BLOCK_NOT_SELECTABLE`);
    }
    if (block.sectionKind !== 'SEAT_SECTION') {
      issues.push(`${block.block}:CANONICAL_BLOCK_NOT_SEAT_SECTION`);
    }

    const labelPoint = block.imageGeometry.labelPoint;
    if (!labelPoint) {
      issues.push(`${block.block}:MISSING_LABEL_POINT`);
      return;
    }

    issues.push(...validateCanonicalPath(block, 'visualPath', labelPoint));
    issues.push(...validateCanonicalPath(block, 'hitPath', labelPoint));
  });

  SAJIK_CANONICAL_OPERATOR_ONLY_SECTION_IDS.forEach((sectionId) => {
    if (!sectionIds.has(sectionId)) {
      issues.push(`${sectionId}:OPERATOR_ONLY_CANONICAL_BLOCK_MISSING`);
    }
  });

  SAJIK_CANONICAL_ACCESSIBILITY_MARKERS.forEach((marker) => {
    const [x, y] = marker.position;
    if (x < 0 || x > SAJIK_CANONICAL_SEATMAP_IMAGE.imageWidth || y < 0 || y > SAJIK_CANONICAL_SEATMAP_IMAGE.imageHeight) {
      issues.push(`${marker.markerId}:MARKER_OUT_OF_BOUNDS`);
    }
    if (!sectionIds.has(marker.relatedSectionId)) {
      issues.push(`${marker.markerId}:RELATED_CANONICAL_BLOCK_MISSING`);
    }
  });

  const markerAliasIds = new Set<string>();
  SAJIK_CANONICAL_ACCESSIBILITY_MARKER_ALIASES.forEach((marker) => {
    if (markerAliasIds.has(marker.markerId)) {
      issues.push(`${marker.markerId}:DUPLICATE_ACCESSIBILITY_MARKER_ALIAS`);
    }
    markerAliasIds.add(marker.markerId);
    if (marker.runtimePolygon !== false) {
      issues.push(`${marker.markerId}:ACCESSIBILITY_MARKER_ALIAS_HAS_RUNTIME_POLYGON`);
    }
  });

  return issues;
}

export const SAJIK_CANONICAL_SOURCE_POLICY = {
  activeRuntimeCoordinateSource: 'OPERATOR_REFERENCE_2026 image coordinates only',
  legacyOfficialImage: SAJIK_SEATMAP_IMAGE.imagePath,
  legacyOfficialImageRuntimeRole: 'historical QA/reference only',
  canonicalImage: SAJIK_CANONICAL_SEATMAP_IMAGE.imagePath,
  missingOperatorImageBlockPolicy: 'legacy alias only; no runtime polygon until operator-reference trace exists',
  legacyOfficialWheelchairMarkerPolicy: 'canonical marker alias only; no seat polygon runtime source',
} as const;
