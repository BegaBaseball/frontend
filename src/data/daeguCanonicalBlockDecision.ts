import {
  DAEGU_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_BLOCKS,
  DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT,
  DAEGU_SEATMAP_IMAGE,
  DAEGU_SEATMAP_VIEWPORT,
  type DaeguBlock,
  isDaeguNormalSelectableSeat,
  isDaeguOfficialUnconfirmedSeat,
} from './daeguSeatData';
import { validateSeatMapPolygonPath } from '../utils/seatMapPolygonValidator';

export const DAEGU_CANONICAL_BLOCK_DECISION_GUARD_VERSION = 'DAEGU_CANONICAL_BLOCK_DECISION_GUARD_V1';
export const DAEGU_CANONICAL_OFFICIAL_SOURCE_ID = 'SAMSUNG_OFFICIAL_2026';
export const DAEGU_CANONICAL_OPERATOR_SOURCE_ID = 'OPERATOR_REFERENCE_RAPAK_2025';

export type DaeguCanonicalCandidateSourceId =
  | typeof DAEGU_CANONICAL_OFFICIAL_SOURCE_ID
  | typeof DAEGU_CANONICAL_OPERATOR_SOURCE_ID;

export type DaeguCanonicalBlockDecisionStatus =
  | 'CANONICAL_OPERATOR_FROM_OVERLAP'
  | 'CANONICAL_OPERATOR_ONLY'
  | 'CANONICAL_OFFICIAL_ONLY'
  | 'PENDING_OPERATOR_TRACE'
  | 'MARKER_OR_ALIAS_ONLY'
  | 'BLOCKED_UNCONFIRMED'
  | 'NO_SELECTABLE_CANONICAL_SOURCE';

export type DaeguCanonicalBlockDecisionFlag =
  | 'ACTIVE_POLYGON_SOURCE_OVERLAP_RESOLVED_TO_OPERATOR'
  | 'BLOCKED_UNCONFIRMED_NO_SELECTABLE_CANONICAL'
  | 'MARKER_ALIAS_SEPARATION_REQUIRED'
  | 'CANONICAL_GEOMETRY_ISSUE';

export interface DaeguCanonicalBlockDecisionInputRow {
  sourceId: DaeguCanonicalCandidateSourceId;
  imageWidth: number;
  imageHeight: number;
  block: DaeguBlock;
  blockKey: string;
  selectable: boolean;
  markerOrAlias: boolean;
  blockedUnconfirmed: boolean;
}

export interface DaeguCanonicalBlockDecision {
  blockKey: string;
  blockLabels: string[];
  sectionIds: string[];
  names: string[];
  categories: string[];
  sectionKinds: string[];
  activeSourceIds: DaeguCanonicalCandidateSourceId[];
  activeSourceCount: number;
  canonicalSourceId: DaeguCanonicalCandidateSourceId | null;
  canonicalSectionId: string | null;
  canonicalBlockLabel: string | null;
  decisionStatus: DaeguCanonicalBlockDecisionStatus;
  markerAliasSeparationRequired: boolean;
  blockedUnconfirmed: boolean;
  geometryIssues: string[];
  flags: DaeguCanonicalBlockDecisionFlag[];
  nextAction: string;
}

export interface DaeguCanonicalBlockDecisionSummary {
  status: 'passed' | 'review-required' | 'failed';
  totalBlockKeys: number;
  canonicalSelectableBlockKeys: number;
  activeCanonicalSelectableBlockKeys: number;
  targetCanonicalSelectableBlockKeys: number;
  operatorOverlapCanonicalBlockKeys: number;
  officialOnlyCanonicalBlockKeys: number;
  pendingOperatorTraceBlockKeys: number;
  operatorOnlyCanonicalBlockKeys: number;
  markerOrAliasOnlyBlockKeys: number;
  blockedUnconfirmedBlockKeys: number;
  markerAliasSeparationRequiredBlockKeys: number;
  geometryIssueBlockKeys: number;
  decisionCounts: Record<string, number>;
  flagCounts: Record<string, number>;
  canonicalSourceCounts: Record<string, number>;
}

export interface DaeguCanonicalBlockDecisionReport {
  generatedAt: string;
  version: typeof DAEGU_CANONICAL_BLOCK_DECISION_GUARD_VERSION;
  status: DaeguCanonicalBlockDecisionSummary['status'];
  policy: typeof DAEGU_CANONICAL_BLOCK_DECISION_POLICY;
  summary: DaeguCanonicalBlockDecisionSummary;
  decisions: DaeguCanonicalBlockDecision[];
}

export const DAEGU_CANONICAL_BLOCK_DECISION_POLICY = {
  purpose: 'Read-only Daegu block-key canonical decision guard before runtime single-source consolidation.',
  overlapDefault: DAEGU_CANONICAL_OPERATOR_SOURCE_ID,
  officialOnlyDefault: 'PENDING_OPERATOR_TRACE',
  operatorOnlyDefault: DAEGU_CANONICAL_OPERATOR_SOURCE_ID,
  markerAliasRowsStayOutOfSelectableLayer: true,
  unconfirmedRowsBlockSelectableCanonical: true,
  generatedReportsAreEvidenceOnly: true,
} as const;

export function normalizeDaeguCanonicalBlockKey(value: string | null | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '')
    .replace(/휠체어/g, '')
    .replace(/장애인석/g, '');
}

function uniqueSorted<T extends string>(values: Array<T | null | undefined>): T[] {
  return [...new Set(values.filter((value): value is T => value !== null && value !== undefined && value !== ''))]
    .map((value) => String(value) as T)
    .sort((a, b) => a.localeCompare(b));
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = getKey(item);
    const rows = groups.get(key) ?? [];
    rows.push(item);
    groups.set(key, rows);
  });
  return groups;
}

function countBy<T>(rows: T[], getKey: (row: T) => string): Record<string, number> {
  return Object.fromEntries(
    [...groupBy(rows, getKey).entries()]
      .map(([key, groupRows]) => [key, groupRows.length])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
  );
}

export function buildDaeguCanonicalBlockDecisionRows(): DaeguCanonicalBlockDecisionInputRow[] {
  type DaeguCanonicalBlockDecisionSourceRow = Pick<
    DaeguCanonicalBlockDecisionInputRow,
    'sourceId' | 'imageWidth' | 'imageHeight' | 'block'
  >;

  const sourceRows: DaeguCanonicalBlockDecisionSourceRow[] = [
    ...DAEGU_BLOCKS.map((block): DaeguCanonicalBlockDecisionSourceRow => ({
      sourceId: DAEGU_CANONICAL_OFFICIAL_SOURCE_ID,
      imageWidth: DAEGU_SEATMAP_VIEWPORT.width || DAEGU_SEATMAP_IMAGE.imageWidth,
      imageHeight: DAEGU_SEATMAP_VIEWPORT.height || DAEGU_SEATMAP_IMAGE.imageHeight,
      block,
    })),
    ...DAEGU_OPERATOR_REFERENCE_BLOCKS.map((block): DaeguCanonicalBlockDecisionSourceRow => ({
      sourceId: DAEGU_CANONICAL_OPERATOR_SOURCE_ID,
      imageWidth: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.width,
      imageHeight: DAEGU_OPERATOR_REFERENCE_SEATMAP_VIEWPORT.height,
      block,
    })),
  ];

  return sourceRows.map((row) => ({
    ...row,
    blockKey: normalizeDaeguCanonicalBlockKey(row.block.block),
    selectable: isDaeguNormalSelectableSeat(row.block),
    markerOrAlias: row.block.sectionKind !== 'SEAT_SECTION',
    blockedUnconfirmed: isDaeguOfficialUnconfirmedSeat(row.block),
  }));
}

function validateDaeguCanonicalRowGeometry(row: DaeguCanonicalBlockDecisionInputRow | null): string[] {
  if (!row) return [];

  const labelPoint = row.block.imageGeometry.labelPoint ?? [
    row.block.imageGeometry.labelX,
    row.block.imageGeometry.labelY,
  ];
  const paths = [
    ['visualPath', row.block.imageGeometry.visualPath ?? row.block.imageGeometry.d],
    ['hitPath', row.block.imageGeometry.hitPath ?? row.block.imageGeometry.d],
  ] as const;

  return paths.flatMap(([pathKind, pathData]) => validateSeatMapPolygonPath({
    pathData,
    width: row.imageWidth,
    height: row.imageHeight,
    labelPoint,
    labelTolerance: 6,
    sectionId: row.block.id,
    pathKind,
  }).map((code) => `${pathKind}:${code}`));
}

function chooseDaeguCanonicalRow(
  activeRows: DaeguCanonicalBlockDecisionInputRow[],
  blockedUnconfirmed: boolean,
): DaeguCanonicalBlockDecisionInputRow | null {
  if (blockedUnconfirmed) return null;

  return activeRows.find((row) => row.sourceId === DAEGU_CANONICAL_OPERATOR_SOURCE_ID)
    ?? null;
}

export function buildDaeguCanonicalBlockDecision(
  blockKey: string,
  rows: DaeguCanonicalBlockDecisionInputRow[],
): DaeguCanonicalBlockDecision {
  const activeRows = rows.filter((row) => row.selectable);
  const activeSourceIds = uniqueSorted(activeRows.map((row) => row.sourceId));
  const markerRows = rows.filter((row) => row.markerOrAlias);
  const blockedUnconfirmedRows = rows.filter((row) => row.blockedUnconfirmed);
  const markerAliasSeparationRequired = markerRows.length > 0 && activeRows.length > 0;
  const blockedUnconfirmed = blockedUnconfirmedRows.length > 0;
  const canonicalRow = chooseDaeguCanonicalRow(activeRows, blockedUnconfirmed);
  const geometryIssues = validateDaeguCanonicalRowGeometry(canonicalRow);
  const flags: DaeguCanonicalBlockDecisionFlag[] = [];

  let decisionStatus: DaeguCanonicalBlockDecisionStatus = 'NO_SELECTABLE_CANONICAL_SOURCE';
  let nextAction = 'Keep as marker, alias, or blocked review evidence until a selectable source is approved.';

  if (blockedUnconfirmed) {
    decisionStatus = 'BLOCKED_UNCONFIRMED';
    flags.push('BLOCKED_UNCONFIRMED_NO_SELECTABLE_CANONICAL');
    nextAction = 'Keep out of selectable canonical layer until independent component evidence is operator-approved.';
  } else if (activeSourceIds.length > 1) {
    decisionStatus = 'CANONICAL_OPERATOR_FROM_OVERLAP';
    flags.push('ACTIVE_POLYGON_SOURCE_OVERLAP_RESOLVED_TO_OPERATOR');
    nextAction = 'Use operator-reference polygon as the single canonical candidate and retain official PNG coordinates as historical evidence.';
  } else if (canonicalRow?.sourceId === DAEGU_CANONICAL_OPERATOR_SOURCE_ID) {
    decisionStatus = 'CANONICAL_OPERATOR_ONLY';
    nextAction = 'Keep operator-reference polygon as canonical candidate after metadata and label ownership review.';
  } else if (activeRows.some((row) => row.sourceId === DAEGU_CANONICAL_OFFICIAL_SOURCE_ID)) {
    decisionStatus = 'PENDING_OPERATOR_TRACE';
    nextAction = 'Keep official PNG polygon as historical evidence and trace this block on the 4096 operator-reference image before canonical selectable promotion.';
  } else if (markerRows.length > 0) {
    decisionStatus = 'MARKER_OR_ALIAS_ONLY';
    nextAction = 'Keep outside selectable seat polygon layer and model as marker or alias if needed.';
  }

  if (markerAliasSeparationRequired) flags.push('MARKER_ALIAS_SEPARATION_REQUIRED');
  if (geometryIssues.length > 0) flags.push('CANONICAL_GEOMETRY_ISSUE');

  return {
    blockKey,
    blockLabels: uniqueSorted(rows.map((row) => row.block.block)),
    sectionIds: uniqueSorted(rows.map((row) => row.block.id)),
    names: uniqueSorted(rows.map((row) => row.block.name)),
    categories: uniqueSorted(rows.map((row) => row.block.category)),
    sectionKinds: uniqueSorted(rows.map((row) => row.block.sectionKind)),
    activeSourceIds,
    activeSourceCount: activeSourceIds.length,
    canonicalSourceId: canonicalRow?.sourceId ?? null,
    canonicalSectionId: canonicalRow?.block.id ?? null,
    canonicalBlockLabel: canonicalRow?.block.block ?? null,
    decisionStatus,
    markerAliasSeparationRequired,
    blockedUnconfirmed,
    geometryIssues,
    flags,
    nextAction,
  };
}

export function buildDaeguCanonicalBlockDecisions(
  rows = buildDaeguCanonicalBlockDecisionRows(),
): DaeguCanonicalBlockDecision[] {
  return [...groupBy(rows, (row) => row.blockKey).entries()]
    .map(([blockKey, blockRows]) => buildDaeguCanonicalBlockDecision(blockKey, blockRows))
    .sort((left, right) => left.blockKey.localeCompare(right.blockKey));
}

export function buildDaeguCanonicalBlockDecisionSummary(
  decisions: DaeguCanonicalBlockDecision[],
): DaeguCanonicalBlockDecisionSummary {
  const decisionsWithFlags = decisions.filter((row) => row.flags.length > 0);
  const geometryIssueRows = decisions.filter((row) => row.geometryIssues.length > 0);
  const markerAliasRows = decisions.filter((row) => row.markerAliasSeparationRequired);
  const blockedUnconfirmedRows = decisions.filter((row) => row.blockedUnconfirmed);
  const status = geometryIssueRows.length > 0
    ? 'failed'
    : (markerAliasRows.length > 0 || blockedUnconfirmedRows.length > 0)
      ? 'review-required'
      : 'passed';

  return {
    status,
    totalBlockKeys: decisions.length,
    canonicalSelectableBlockKeys: decisions.filter((row) => row.canonicalSourceId !== null).length,
    activeCanonicalSelectableBlockKeys: decisions.filter((row) => row.canonicalSourceId !== null).length,
    targetCanonicalSelectableBlockKeys: decisions.filter((row) => row.canonicalSourceId !== null || row.decisionStatus === 'PENDING_OPERATOR_TRACE').length,
    operatorOverlapCanonicalBlockKeys: decisions.filter((row) => row.decisionStatus === 'CANONICAL_OPERATOR_FROM_OVERLAP').length,
    officialOnlyCanonicalBlockKeys: decisions.filter((row) => row.decisionStatus === 'CANONICAL_OFFICIAL_ONLY').length,
    pendingOperatorTraceBlockKeys: decisions.filter((row) => row.decisionStatus === 'PENDING_OPERATOR_TRACE').length,
    operatorOnlyCanonicalBlockKeys: decisions.filter((row) => row.decisionStatus === 'CANONICAL_OPERATOR_ONLY').length,
    markerOrAliasOnlyBlockKeys: decisions.filter((row) => row.decisionStatus === 'MARKER_OR_ALIAS_ONLY').length,
    blockedUnconfirmedBlockKeys: blockedUnconfirmedRows.length,
    markerAliasSeparationRequiredBlockKeys: markerAliasRows.length,
    geometryIssueBlockKeys: geometryIssueRows.length,
    decisionCounts: countBy(decisions, (row) => row.decisionStatus),
    flagCounts: countBy(decisionsWithFlags.flatMap((row) => row.flags), (flag) => flag),
    canonicalSourceCounts: countBy(
      decisions.filter((row) => row.canonicalSourceId !== null),
      (row) => row.canonicalSourceId ?? 'NO_CANONICAL_SOURCE',
    ),
  };
}

export const DAEGU_CANONICAL_BLOCK_DECISIONS = buildDaeguCanonicalBlockDecisions();
export const DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY = buildDaeguCanonicalBlockDecisionSummary(
  DAEGU_CANONICAL_BLOCK_DECISIONS,
);

export function buildDaeguCanonicalBlockDecisionReport(
  generatedAt = new Date().toISOString(),
): DaeguCanonicalBlockDecisionReport {
  return {
    generatedAt,
    version: DAEGU_CANONICAL_BLOCK_DECISION_GUARD_VERSION,
    status: DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY.status,
    policy: DAEGU_CANONICAL_BLOCK_DECISION_POLICY,
    summary: DAEGU_CANONICAL_BLOCK_DECISION_SUMMARY,
    decisions: DAEGU_CANONICAL_BLOCK_DECISIONS,
  };
}

export function validateDaeguCanonicalBlockDecisions(
  decisions = DAEGU_CANONICAL_BLOCK_DECISIONS,
): string[] {
  const issues: string[] = [];
  const blockKeys = new Set<string>();

  decisions.forEach((decision) => {
    if (blockKeys.has(decision.blockKey)) {
      issues.push(`${decision.blockKey}:DUPLICATE_CANONICAL_BLOCK_KEY_DECISION`);
    }
    blockKeys.add(decision.blockKey);

    if (decision.geometryIssues.length > 0) {
      issues.push(`${decision.blockKey}:CANONICAL_GEOMETRY_ISSUE`);
    }
    if (decision.blockedUnconfirmed && decision.canonicalSourceId !== null) {
      issues.push(`${decision.blockKey}:BLOCKED_UNCONFIRMED_HAS_CANONICAL_SOURCE`);
    }
    if (decision.markerAliasSeparationRequired && !decision.flags.includes('MARKER_ALIAS_SEPARATION_REQUIRED')) {
      issues.push(`${decision.blockKey}:MARKER_ALIAS_FLAG_MISSING`);
    }
    if (decision.activeSourceCount > 1 && decision.canonicalSourceId !== DAEGU_CANONICAL_OPERATOR_SOURCE_ID) {
      issues.push(`${decision.blockKey}:OVERLAP_NOT_RESOLVED_TO_OPERATOR`);
    }
  });

  return issues;
}
