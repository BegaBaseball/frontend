import {
  DAEGU_CANONICAL_MAP_VERSION,
  DAEGU_CANONICAL_SEATMAP_SOURCE_ID,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256,
  DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME,
  DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
  type DaeguBlock,
  isDaeguNormalSelectableSeat,
} from './daeguSeatData';
import {
  DAEGU_CANONICAL_BLOCK_DECISIONS,
  DAEGU_CANONICAL_OPERATOR_SOURCE_ID,
  DAEGU_CANONICAL_OFFICIAL_SOURCE_ID,
  normalizeDaeguCanonicalBlockKey,
  type DaeguCanonicalBlockDecision,
} from './daeguCanonicalBlockDecision';
import { validateSeatMapPolygonPath } from '../utils/seatMapPolygonValidator';

export type DaeguCanonicalSourceId = typeof DAEGU_CANONICAL_SEATMAP_SOURCE_ID;
export type DaeguCanonicalCandidateRuntimeSourceId = typeof DAEGU_CANONICAL_OPERATOR_SOURCE_ID;

export type DaeguCanonicalBlock = DaeguBlock & {
  canonicalSourceId: DaeguCanonicalSourceId;
  canonicalInputSourceId: DaeguCanonicalCandidateRuntimeSourceId;
  canonicalBlockKey: string;
  canonicalDecisionStatus: 'CANONICAL_OPERATOR_FROM_OVERLAP' | 'CANONICAL_OPERATOR_ONLY';
};

export interface DaeguCanonicalPendingOperatorTrace {
  id: string;
  blockKey: string;
  sourceSectionIds: string[];
  sourceBlockLabels: string[];
  names: string[];
  categories: string[];
  sectionKinds: string[];
  sourceCoordinateSystem: 'SAMSUNG_OFFICIAL_2026_1707x2048';
  targetCoordinateSystem: 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096';
  canonicalSourceId: 'PENDING_OPERATOR_TRACE';
  runtimePolygon: false;
  nextAction: string;
}

export interface DaeguCanonicalMarkerAlias {
  id: string;
  blockKey: string;
  blockLabels: string[];
  sectionIds: string[];
  sectionKinds: string[];
  canonicalSourceId: 'CANONICAL_MARKER_ALIAS';
  runtimePolygon: false;
  aliasReason: 'MARKER_OR_WAYFINDING_NOT_SEAT_POLYGON' | 'MARKER_SEPARATED_FROM_CANONICAL_SEAT_POLYGON';
}

export interface DaeguCanonicalBlockedUnconfirmed {
  id: string;
  blockKey: string;
  blockLabels: string[];
  sectionIds: string[];
  canonicalSourceId: 'BLOCKED_UNCONFIRMED';
  runtimePolygon: false;
  nextAction: string;
}

export interface DaeguCanonicalSeatMapSummary {
  sourceId: DaeguCanonicalSourceId;
  mapVersion: typeof DAEGU_CANONICAL_MAP_VERSION;
  coordinateSource: 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096';
  activeSelectableBlocks: number;
  targetSelectableBlocks: number;
  pendingOperatorTraceBlocks: number;
  overlapOperatorBlocks: number;
  operatorOnlyBlocks: number;
  markerAliases: number;
  blockedUnconfirmedBlocks: number;
  mixedCoordinateRuntimePolygons: number;
}

export const DAEGU_CANONICAL_SEATMAP_IMAGE = {
  stadiumId: 'DAEGU_SAMSUNG_LIONS_PARK',
  mapVersion: DAEGU_CANONICAL_MAP_VERSION,
  imagePath: `src/assets/stadiums/samsung/${DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME}`,
  imageWidth: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width,
  imageHeight: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height,
  viewBox: '0 0 4096 4096',
  imageSha256: DAEGU_OPERATOR_REFERENCE_RAPAK_2025_IMAGE_SHA256,
  sourceLabel: 'Operator-provided enhanced transparent RaPak reference image',
  sourceUrl: null,
  assetStatus: 'CANONICAL',
  requiredAssetFileName: DAEGU_OPERATOR_REFERENCE_RAPAK_2025_REQUIRED_ASSET_FILE_NAME,
} as const;

export const DAEGU_CANONICAL_SEATMAP_VIEWPORT = DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT;

const operatorBlockById = new Map(DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block) => [block.id, block]));

function canonicalBlockFromDecision(decision: DaeguCanonicalBlockDecision): DaeguCanonicalBlock | null {
  if (decision.canonicalSourceId !== DAEGU_CANONICAL_OPERATOR_SOURCE_ID || !decision.canonicalSectionId) {
    return null;
  }

  const sourceBlock = operatorBlockById.get(decision.canonicalSectionId);
  if (!sourceBlock) {
    throw new Error(`Missing Daegu operator-reference block for canonical decision ${decision.blockKey}:${decision.canonicalSectionId}`);
  }

  return {
    ...sourceBlock,
    sourceNote: `${sourceBlock.sourceNote} DAEGU_CANONICAL_2026 runtime polygon으로 승격되었습니다.`,
    reviewNote: `${sourceBlock.reviewNote} canonicalDecision=${decision.decisionStatus}; canonicalBlockKey=${decision.blockKey}.`,
    canonicalSourceId: DAEGU_CANONICAL_SEATMAP_SOURCE_ID,
    canonicalInputSourceId: DAEGU_CANONICAL_OPERATOR_SOURCE_ID,
    canonicalBlockKey: decision.blockKey,
    canonicalDecisionStatus: decision.decisionStatus === 'CANONICAL_OPERATOR_ONLY'
      ? 'CANONICAL_OPERATOR_ONLY'
      : 'CANONICAL_OPERATOR_FROM_OVERLAP',
  };
}

function pendingTraceFromDecision(decision: DaeguCanonicalBlockDecision): DaeguCanonicalPendingOperatorTrace {
  return {
    id: `daegu-canonical-pending-operator-trace-${decision.blockKey.toLowerCase()}`,
    blockKey: decision.blockKey,
    sourceSectionIds: decision.sectionIds,
    sourceBlockLabels: decision.blockLabels,
    names: decision.names,
    categories: decision.categories,
    sectionKinds: decision.sectionKinds,
    sourceCoordinateSystem: 'SAMSUNG_OFFICIAL_2026_1707x2048',
    targetCoordinateSystem: 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096',
    canonicalSourceId: 'PENDING_OPERATOR_TRACE',
    runtimePolygon: false,
    nextAction: 'Trace this block directly on the 4096 operator-reference image and approve corrected path/hitPath/labelPoint before promoting it into DAEGU_CANONICAL_2026.',
  };
}

function markerAliasFromDecision(decision: DaeguCanonicalBlockDecision): DaeguCanonicalMarkerAlias | null {
  const hasMarkerOrWayfinding = decision.sectionKinds.some((kind) => kind !== 'SEAT_SECTION');
  if (!hasMarkerOrWayfinding && !decision.markerAliasSeparationRequired) {
    return null;
  }

  return {
    id: `daegu-canonical-marker-alias-${decision.blockKey.toLowerCase()}`,
    blockKey: decision.blockKey,
    blockLabels: decision.blockLabels,
    sectionIds: decision.sectionIds,
    sectionKinds: decision.sectionKinds,
    canonicalSourceId: 'CANONICAL_MARKER_ALIAS',
    runtimePolygon: false,
    aliasReason: decision.markerAliasSeparationRequired
      ? 'MARKER_SEPARATED_FROM_CANONICAL_SEAT_POLYGON'
      : 'MARKER_OR_WAYFINDING_NOT_SEAT_POLYGON',
  };
}

function blockedUnconfirmedFromDecision(decision: DaeguCanonicalBlockDecision): DaeguCanonicalBlockedUnconfirmed {
  return {
    id: `daegu-canonical-blocked-unconfirmed-${decision.blockKey.toLowerCase()}`,
    blockKey: decision.blockKey,
    blockLabels: decision.blockLabels,
    sectionIds: decision.sectionIds,
    canonicalSourceId: 'BLOCKED_UNCONFIRMED',
    runtimePolygon: false,
    nextAction: 'Keep out of selectable canonical runtime until independent component evidence is operator-approved.',
  };
}

export const DAEGU_CANONICAL_BLOCKS: DaeguCanonicalBlock[] = DAEGU_CANONICAL_BLOCK_DECISIONS
  .map(canonicalBlockFromDecision)
  .filter((block): block is DaeguCanonicalBlock => block !== null)
  .sort((left, right) => left.canonicalBlockKey.localeCompare(right.canonicalBlockKey));

export const DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS: DaeguCanonicalPendingOperatorTrace[] = DAEGU_CANONICAL_BLOCK_DECISIONS
  .filter((decision) => decision.decisionStatus === 'PENDING_OPERATOR_TRACE' || decision.decisionStatus === 'CANONICAL_OFFICIAL_ONLY')
  .map(pendingTraceFromDecision)
  .sort((left, right) => left.blockKey.localeCompare(right.blockKey));

export const DAEGU_CANONICAL_MARKER_ALIASES: DaeguCanonicalMarkerAlias[] = DAEGU_CANONICAL_BLOCK_DECISIONS
  .map(markerAliasFromDecision)
  .filter((alias): alias is DaeguCanonicalMarkerAlias => alias !== null)
  .sort((left, right) => left.blockKey.localeCompare(right.blockKey));

export const DAEGU_CANONICAL_BLOCKED_UNCONFIRMED_BLOCKS: DaeguCanonicalBlockedUnconfirmed[] = DAEGU_CANONICAL_BLOCK_DECISIONS
  .filter((decision) => decision.decisionStatus === 'BLOCKED_UNCONFIRMED')
  .map(blockedUnconfirmedFromDecision)
  .sort((left, right) => left.blockKey.localeCompare(right.blockKey));

export const DAEGU_CANONICAL_SEATMAP_SUMMARY: DaeguCanonicalSeatMapSummary = {
  sourceId: DAEGU_CANONICAL_SEATMAP_SOURCE_ID,
  mapVersion: DAEGU_CANONICAL_MAP_VERSION,
  coordinateSource: 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096',
  activeSelectableBlocks: DAEGU_CANONICAL_BLOCKS.length,
  targetSelectableBlocks: DAEGU_CANONICAL_BLOCKS.length + DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.length,
  pendingOperatorTraceBlocks: DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.length,
  overlapOperatorBlocks: DAEGU_CANONICAL_BLOCKS.filter((block) => block.canonicalDecisionStatus === 'CANONICAL_OPERATOR_FROM_OVERLAP').length,
  operatorOnlyBlocks: DAEGU_CANONICAL_BLOCKS.filter((block) => block.canonicalDecisionStatus === 'CANONICAL_OPERATOR_ONLY').length,
  markerAliases: DAEGU_CANONICAL_MARKER_ALIASES.length,
  blockedUnconfirmedBlocks: DAEGU_CANONICAL_BLOCKED_UNCONFIRMED_BLOCKS.length,
  mixedCoordinateRuntimePolygons: DAEGU_CANONICAL_BLOCKS.filter((block) => block.imageGeometry.traceSource !== 'OPERATOR_REFERENCE_RAPAK_2025').length,
};

export function validateDaeguCanonicalSeatMap(): string[] {
  const issues: string[] = [];
  const blockKeys = new Set<string>();
  const sectionIds = new Set<string>();

  DAEGU_CANONICAL_BLOCKS.forEach((block) => {
    const blockKey = normalizeDaeguCanonicalBlockKey(block.block);
    if (blockKeys.has(blockKey)) {
      issues.push(`${block.block}:DUPLICATE_CANONICAL_BLOCK_KEY`);
    }
    blockKeys.add(blockKey);

    if (sectionIds.has(block.id)) {
      issues.push(`${block.id}:DUPLICATE_CANONICAL_SECTION_ID`);
    }
    sectionIds.add(block.id);

    if (block.canonicalSourceId !== DAEGU_CANONICAL_SEATMAP_SOURCE_ID) {
      issues.push(`${block.block}:INVALID_CANONICAL_SOURCE`);
    }
    if (block.imageGeometry.traceSource !== 'OPERATOR_REFERENCE_RAPAK_2025') {
      issues.push(`${block.block}:MIXED_COORDINATE_RUNTIME_POLYGON`);
    }
    if (!isDaeguNormalSelectableSeat(block)) {
      issues.push(`${block.block}:CANONICAL_BLOCK_NOT_SELECTABLE`);
    }
    if (block.sectionKind !== 'SEAT_SECTION') {
      issues.push(`${block.block}:CANONICAL_BLOCK_NOT_SEAT_SECTION`);
    }

    const labelPoint = block.imageGeometry.labelPoint ?? [
      block.imageGeometry.labelX,
      block.imageGeometry.labelY,
    ];
    const paths = [
      ['visualPath', block.imageGeometry.visualPath ?? block.imageGeometry.d],
      ['hitPath', block.imageGeometry.hitPath ?? block.imageGeometry.visualPath ?? block.imageGeometry.d],
    ] as const;

    paths.forEach(([pathKind, pathData]) => {
      validateSeatMapPolygonPath({
        pathData,
        width: DAEGU_CANONICAL_SEATMAP_IMAGE.imageWidth,
        height: DAEGU_CANONICAL_SEATMAP_IMAGE.imageHeight,
        labelPoint,
        labelTolerance: 6,
        sectionId: block.id,
        pathKind,
      }).forEach((issue) => {
        issues.push(`${block.block}:${pathKind}:${issue}`);
      });
    });
  });

  DAEGU_CANONICAL_PENDING_OPERATOR_TRACE_BLOCKS.forEach((row) => {
    if (row.runtimePolygon !== false) {
      issues.push(`${row.blockKey}:PENDING_OPERATOR_TRACE_HAS_RUNTIME_POLYGON`);
    }
    if (row.sourceCoordinateSystem !== 'SAMSUNG_OFFICIAL_2026_1707x2048') {
      issues.push(`${row.blockKey}:INVALID_PENDING_SOURCE_COORDINATE_SYSTEM`);
    }
    if (row.targetCoordinateSystem !== 'OPERATOR_REFERENCE_RAPAK_2025_4096x4096') {
      issues.push(`${row.blockKey}:INVALID_PENDING_TARGET_COORDINATE_SYSTEM`);
    }
  });

  [...DAEGU_CANONICAL_MARKER_ALIASES, ...DAEGU_CANONICAL_BLOCKED_UNCONFIRMED_BLOCKS].forEach((row) => {
    if (row.runtimePolygon !== false) {
      issues.push(`${row.blockKey}:NON_SEAT_CANONICAL_ROW_HAS_RUNTIME_POLYGON`);
    }
  });

  if (DAEGU_CANONICAL_SEATMAP_SUMMARY.activeSelectableBlocks !== 130) {
    issues.push(`SUMMARY_ACTIVE_SELECTABLE_EXPECTED_130:${DAEGU_CANONICAL_SEATMAP_SUMMARY.activeSelectableBlocks}`);
  }
  if (DAEGU_CANONICAL_SEATMAP_SUMMARY.pendingOperatorTraceBlocks !== 58) {
    issues.push(`SUMMARY_PENDING_OPERATOR_TRACE_EXPECTED_58:${DAEGU_CANONICAL_SEATMAP_SUMMARY.pendingOperatorTraceBlocks}`);
  }
  if (DAEGU_CANONICAL_SEATMAP_SUMMARY.targetSelectableBlocks !== 188) {
    issues.push(`SUMMARY_TARGET_SELECTABLE_EXPECTED_188:${DAEGU_CANONICAL_SEATMAP_SUMMARY.targetSelectableBlocks}`);
  }

  return issues;
}

export const DAEGU_CANONICAL_SOURCE_POLICY = {
  activeRuntimeCoordinateSource: 'OPERATOR_REFERENCE_RAPAK_2025 4096x4096 image coordinates only',
  activeRuntimeSourceId: DAEGU_CANONICAL_SEATMAP_SOURCE_ID,
  legacyOfficialImageRuntimeRole: 'historical QA/reference only',
  legacyOperatorReferenceRuntimeRole: 'historical source rows used by canonical builder only',
  pendingOfficialOnlyPolicy: 'PENDING_OPERATOR_TRACE; no runtime polygon until traced and approved on the 4096 operator-reference image',
  markerAliasPolicy: 'marker/wayfinding/accessibility rows stay outside selectable seat polygon runtime',
} as const;
