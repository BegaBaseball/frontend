import type { IncheonBlock } from './incheonSeatData';

export type IncheonFacilityPointKind = 'ENTRANCE' | 'CONCESSION' | 'RESTROOM' | 'ELEVATOR' | 'PARKING' | 'TRANSIT';
export type IncheonOperatorFacilityDataStatus = 'MANUAL_BASEBALL_DATA_REQUIRED' | 'OPERATOR_PROVIDED';

export interface IncheonFacilityPoint {
  id: string;
  kind: IncheonFacilityPointKind;
  label: string;
  dataStatus: 'OPERATOR_PROVIDED';
  sourceDocumentId: string;
  lastUpdatedAt: string;
  note?: string;
}

export interface IncheonBlockVisitGuidance {
  blockId: string;
  recommendedEntrancePointIds: readonly string[];
  nearbyFacilityPointIds: readonly string[];
  cautionNotes: readonly string[];
  sourceDocumentId: string;
  lastUpdatedAt: string;
}

export interface IncheonOperationNotice {
  id: string;
  validFrom: string;
  validTo: string;
  priority: number;
  affectedBlockIds: readonly string[];
  message: string;
  lastUpdatedAt: string;
  sourceDocumentId: string;
}

export interface IncheonOperatorVisitGuidanceResult {
  blockId: string;
  blockLabel: string;
  recommendedEntranceLabel: string;
  nearbyFacilitiesLabel: string;
  operationNoticeLabel: string;
  lastUpdatedAtLabel: string;
  cautionNotes: readonly string[];
  activeNotices: readonly IncheonOperationNotice[];
  operatorDataStatus: IncheonOperatorFacilityDataStatus;
  operatorDataPendingLabel: string;
}

type ClockInput = Date | string;

const MANUAL_REQUIRED = 'MANUAL_BASEBALL_DATA_REQUIRED';
const OPERATOR_DATA_REQUIRED_LABEL = '운영자 제공 자료 필요';
const OPERATOR_DATA_PENDING_VALUE = `${OPERATOR_DATA_REQUIRED_LABEL} · ${MANUAL_REQUIRED}`;

export const INCHEON_OPERATOR_FACILITY_DATA_REQUIREMENT = Object.freeze({
  status: MANUAL_REQUIRED,
  pendingLabel: `운영자 제공 출입구/매점/동선 자료 필요 · ${MANUAL_REQUIRED}`,
});

export const INCHEON_OPERATOR_FACILITY_POINTS: readonly IncheonFacilityPoint[] = [];
export const INCHEON_BLOCK_VISIT_GUIDANCE: readonly IncheonBlockVisitGuidance[] = [];
export const INCHEON_OPERATION_NOTICES: readonly IncheonOperationNotice[] = [];

const KST_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function normalizeKstDate(input: ClockInput = new Date()): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const date = typeof input === 'string' ? new Date(input) : input;
  const parts = KST_DATE_FORMATTER.formatToParts(date).reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function isNoticeActive(notice: IncheonOperationNotice, kstDate: string): boolean {
  return notice.validFrom <= kstDate && kstDate <= notice.validTo;
}

export function selectIncheonActiveOperationNotices(
  notices: readonly IncheonOperationNotice[],
  now: ClockInput = new Date(),
): IncheonOperationNotice[] {
  const kstDate = normalizeKstDate(now);
  return notices
    .filter((notice) => isNoticeActive(notice, kstDate))
    .sort((a, b) => b.priority - a.priority || a.validFrom.localeCompare(b.validFrom) || a.id.localeCompare(b.id));
}

export function getIncheonActiveOperationNotices(now: ClockInput = new Date()): IncheonOperationNotice[] {
  return selectIncheonActiveOperationNotices(INCHEON_OPERATION_NOTICES, now);
}

export function getIncheonOperatorVisitGuidance(
  block: IncheonBlock,
  now: ClockInput = new Date(),
): IncheonOperatorVisitGuidanceResult {
  const blockGuidance = INCHEON_BLOCK_VISIT_GUIDANCE.find((entry) => entry.blockId === block.id);
  const activeNotices = getIncheonActiveOperationNotices(now)
    .filter((notice) => notice.affectedBlockIds.length === 0 || notice.affectedBlockIds.includes(block.id));
  const entrancePoints = blockGuidance?.recommendedEntrancePointIds
    .map((pointId) => INCHEON_OPERATOR_FACILITY_POINTS.find((point) => point.id === pointId))
    .filter((point): point is IncheonFacilityPoint => Boolean(point)) ?? [];
  const facilityPoints = blockGuidance?.nearbyFacilityPointIds
    .map((pointId) => INCHEON_OPERATOR_FACILITY_POINTS.find((point) => point.id === pointId))
    .filter((point): point is IncheonFacilityPoint => Boolean(point)) ?? [];
  const sourceDates = [
    blockGuidance?.lastUpdatedAt,
    ...entrancePoints.map((point) => point.lastUpdatedAt),
    ...facilityPoints.map((point) => point.lastUpdatedAt),
    ...activeNotices.map((notice) => notice.lastUpdatedAt),
  ].filter((date): date is string => Boolean(date));
  const hasOperatorData = Boolean(blockGuidance || entrancePoints.length > 0 || facilityPoints.length > 0 || activeNotices.length > 0);

  return {
    blockId: block.id,
    blockLabel: block.block,
    recommendedEntranceLabel: entrancePoints.length > 0
      ? entrancePoints.map((point) => point.label).join(', ')
      : OPERATOR_DATA_PENDING_VALUE,
    nearbyFacilitiesLabel: facilityPoints.length > 0
      ? facilityPoints.map((point) => point.label).join(', ')
      : OPERATOR_DATA_PENDING_VALUE,
    operationNoticeLabel: activeNotices.length > 0
      ? activeNotices.map((notice) => notice.message).join(' / ')
      : OPERATOR_DATA_PENDING_VALUE,
    lastUpdatedAtLabel: sourceDates.length > 0 ? sourceDates.sort().at(-1) ?? OPERATOR_DATA_PENDING_VALUE : OPERATOR_DATA_PENDING_VALUE,
    cautionNotes: blockGuidance?.cautionNotes ?? [],
    activeNotices,
    operatorDataStatus: hasOperatorData ? 'OPERATOR_PROVIDED' : INCHEON_OPERATOR_FACILITY_DATA_REQUIREMENT.status,
    operatorDataPendingLabel: INCHEON_OPERATOR_FACILITY_DATA_REQUIREMENT.pendingLabel,
  };
}
