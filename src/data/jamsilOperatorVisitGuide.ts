import type { JamsilBlock } from './jamsilSeatData';

export type JamsilFacilityPointKind = 'ENTRANCE' | 'CONCESSION' | 'RESTROOM' | 'ELEVATOR' | 'PARKING' | 'TRANSIT';
export type JamsilOperatorFacilityDataStatus = 'MANUAL_BASEBALL_DATA_REQUIRED' | 'OPERATOR_PROVIDED';
export type JamsilOperatorTeamContext = 'COMMON' | 'LG' | 'DOOSAN';

export interface JamsilFacilityPoint {
  id: string;
  kind: JamsilFacilityPointKind;
  label: string;
  dataStatus: 'OPERATOR_PROVIDED';
  sourceDocumentId: string;
  lastUpdatedAt: string;
  note?: string;
}

export interface JamsilBlockVisitGuidance {
  blockId: string;
  recommendedEntrancePointIds: readonly string[];
  nearbyFacilityPointIds: readonly string[];
  cautionNotes: readonly string[];
  sourceDocumentId: string;
  lastUpdatedAt: string;
}

export interface JamsilOperationNotice {
  id: string;
  validFrom: string;
  validTo: string;
  priority: number;
  teamContext: JamsilOperatorTeamContext;
  affectedBlockIds: readonly string[];
  message: string;
  lastUpdatedAt: string;
  sourceDocumentId: string;
}

export interface JamsilOperatorVisitGuidanceResult {
  blockId: string;
  blockLabel: string;
  teamContextLabel: string;
  recommendedEntranceLabel: string;
  nearbyFacilitiesLabel: string;
  operationNoticeLabel: string;
  lastUpdatedAtLabel: string;
  cautionNotes: readonly string[];
  activeNotices: readonly JamsilOperationNotice[];
  operatorDataStatus: JamsilOperatorFacilityDataStatus;
  operatorDataPendingLabel: string;
}

type ClockInput = Date | string;

const MANUAL_REQUIRED = 'MANUAL_BASEBALL_DATA_REQUIRED';
const OPERATOR_DATA_REQUIRED_LABEL = '운영자 제공 자료 필요';
const OPERATOR_DATA_PENDING_VALUE = `${OPERATOR_DATA_REQUIRED_LABEL} · ${MANUAL_REQUIRED}`;

export const JAMSIL_OPERATOR_FACILITY_DATA_REQUIREMENT = Object.freeze({
  status: MANUAL_REQUIRED,
  pendingLabel: '운영자 제공 출입구/매점/동선 자료 필요 · MANUAL_BASEBALL_DATA_REQUIRED',
});

export const JAMSIL_OPERATOR_FACILITY_POINTS: readonly JamsilFacilityPoint[] = [];
export const JAMSIL_BLOCK_VISIT_GUIDANCE: readonly JamsilBlockVisitGuidance[] = [];
export const JAMSIL_OPERATION_NOTICES: readonly JamsilOperationNotice[] = [];

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

function isNoticeActive(notice: JamsilOperationNotice, kstDate: string): boolean {
  return notice.validFrom <= kstDate && kstDate <= notice.validTo;
}

function getTeamContextLabel(teamContext: JamsilOperatorTeamContext): string {
  if (teamContext === 'LG') return 'LG 경기 운영자 자료';
  if (teamContext === 'DOOSAN') return '두산 경기 운영자 자료';
  return '잠실 공통 운영자 자료';
}

export function selectJamsilActiveOperationNotices(
  notices: readonly JamsilOperationNotice[],
  now: ClockInput = new Date(),
): JamsilOperationNotice[] {
  const kstDate = normalizeKstDate(now);
  return notices
    .filter((notice) => isNoticeActive(notice, kstDate))
    .sort((a, b) => b.priority - a.priority || a.validFrom.localeCompare(b.validFrom) || a.id.localeCompare(b.id));
}

export function getJamsilActiveOperationNotices(now: ClockInput = new Date()): JamsilOperationNotice[] {
  return selectJamsilActiveOperationNotices(JAMSIL_OPERATION_NOTICES, now);
}

export function getJamsilOperatorVisitGuidance(
  block: JamsilBlock,
  now: ClockInput = new Date(),
  teamContext: JamsilOperatorTeamContext = 'COMMON',
): JamsilOperatorVisitGuidanceResult {
  const blockGuidance = JAMSIL_BLOCK_VISIT_GUIDANCE.find((entry) => entry.blockId === block.id);
  const activeNotices = getJamsilActiveOperationNotices(now)
    .filter((notice) => (
      notice.teamContext === 'COMMON' || notice.teamContext === teamContext
    ))
    .filter((notice) => notice.affectedBlockIds.length === 0 || notice.affectedBlockIds.includes(block.id));
  const entrancePoints = blockGuidance?.recommendedEntrancePointIds
    .map((pointId) => JAMSIL_OPERATOR_FACILITY_POINTS.find((point) => point.id === pointId))
    .filter((point): point is JamsilFacilityPoint => Boolean(point)) ?? [];
  const facilityPoints = blockGuidance?.nearbyFacilityPointIds
    .map((pointId) => JAMSIL_OPERATOR_FACILITY_POINTS.find((point) => point.id === pointId))
    .filter((point): point is JamsilFacilityPoint => Boolean(point)) ?? [];
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
    teamContextLabel: getTeamContextLabel(teamContext),
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
    operatorDataStatus: hasOperatorData ? 'OPERATOR_PROVIDED' : JAMSIL_OPERATOR_FACILITY_DATA_REQUIREMENT.status,
    operatorDataPendingLabel: JAMSIL_OPERATOR_FACILITY_DATA_REQUIREMENT.pendingLabel,
  };
}
