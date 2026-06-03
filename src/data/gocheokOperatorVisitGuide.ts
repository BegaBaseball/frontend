import {
  GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT,
  type GocheokBlock,
} from './gocheokSeatData';

export type GocheokFacilityPointKind = 'ENTRANCE' | 'CONCESSION' | 'RESTROOM' | 'ELEVATOR' | 'PARKING' | 'TRANSIT' | 'SHOP';

export interface GocheokFacilityPoint {
  id: string;
  kind: GocheokFacilityPointKind;
  label: string;
  dataStatus: 'OPERATOR_PROVIDED';
  sourceDocumentId: string;
  lastUpdatedAt: string;
  note?: string;
}

export interface GocheokBlockVisitGuidance {
  blockId: string;
  recommendedEntrancePointIds: readonly string[];
  nearbyFacilityPointIds: readonly string[];
  cautionNotes: readonly string[];
  sourceDocumentId: string;
  lastUpdatedAt: string;
}

export interface GocheokOperationNotice {
  id: string;
  validFrom: string;
  validTo: string;
  priority: number;
  affectedBlockIds: readonly string[];
  message: string;
  lastUpdatedAt: string;
  sourceDocumentId: string;
}

export interface GocheokOperatorVisitGuidanceResult {
  blockId: string;
  blockLabel: string;
  recommendedEntranceLabel: string;
  nearbyFacilitiesLabel: string;
  operationNoticeLabel: string;
  lastUpdatedAtLabel: string;
  cautionNotes: readonly string[];
  activeNotices: readonly GocheokOperationNotice[];
  operatorDataStatus: 'MANUAL_BASEBALL_DATA_REQUIRED' | 'OPERATOR_PROVIDED';
  operatorDataPendingLabel: string;
}

type ClockInput = Date | string;

const MANUAL_REQUIRED = GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT.status;
const OPERATOR_DATA_REQUIRED_LABEL = '운영자 제공 자료 필요';
const OPERATOR_DATA_PENDING_VALUE = `${OPERATOR_DATA_REQUIRED_LABEL} · ${MANUAL_REQUIRED}`;

export const GOCHEOK_OPERATOR_FACILITY_POINTS: readonly GocheokFacilityPoint[] = [
  {
    id: 'gocheok-facility-entrance-a-home',
    kind: 'ENTRANCE',
    label: 'A 홈 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-b-home',
    kind: 'ENTRANCE',
    label: 'B 홈 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-d-away',
    kind: 'ENTRANCE',
    label: 'D 원정 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-e-away',
    kind: 'ENTRANCE',
    label: 'E 원정 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-f-outfield',
    kind: 'ENTRANCE',
    label: 'F 외야 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-g-outfield',
    kind: 'ENTRANCE',
    label: 'G 외야 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-internal-1-30',
    kind: 'ENTRANCE',
    label: '내부통로 1-30번대 게이트',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-vip',
    kind: 'ENTRANCE',
    label: 'VIP 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-entrance-skybox',
    kind: 'ENTRANCE',
    label: '스카이박스 출입문',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-elevator-accessible',
    kind: 'ELEVATOR',
    label: '장애인 엘리베이터',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-transit-infield-ticket-office',
    kind: 'TRANSIT',
    label: '내야 매표소',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-transit-outfield-ticket-office',
    kind: 'TRANSIT',
    label: '외야 매표소',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-concession-2f',
    kind: 'CONCESSION',
    label: '2F 매점',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-concession-3f',
    kind: 'CONCESSION',
    label: '3F 매점',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-concession-4f',
    kind: 'CONCESSION',
    label: '4F 매점',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-concession-convenience-store',
    kind: 'CONCESSION',
    label: '편의점',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-concession-food-court',
    kind: 'CONCESSION',
    label: '푸드코트 계열 공간',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
  {
    id: 'gocheok-facility-shop-heroes-shop',
    kind: 'SHOP',
    label: '히어로즈샵',
    dataStatus: 'OPERATOR_PROVIDED',
    sourceDocumentId: 'gocheok-operator-20260530-user-provided-summary',
    lastUpdatedAt: '2026-05-30',
  },
];
export const GOCHEOK_BLOCK_VISIT_GUIDANCE: readonly GocheokBlockVisitGuidance[] = [];
export const GOCHEOK_OPERATION_NOTICES: readonly GocheokOperationNotice[] = [];

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

function isNoticeActive(notice: GocheokOperationNotice, kstDate: string): boolean {
  return notice.validFrom <= kstDate && kstDate <= notice.validTo;
}

export function selectGocheokActiveOperationNotices(
  notices: readonly GocheokOperationNotice[],
  now: ClockInput = new Date(),
): GocheokOperationNotice[] {
  const kstDate = normalizeKstDate(now);
  return notices
    .filter((notice) => isNoticeActive(notice, kstDate))
    .sort((a, b) => b.priority - a.priority || a.validFrom.localeCompare(b.validFrom) || a.id.localeCompare(b.id));
}

export function getGocheokActiveOperationNotices(now: ClockInput = new Date()): GocheokOperationNotice[] {
  return selectGocheokActiveOperationNotices(GOCHEOK_OPERATION_NOTICES, now);
}

export function getGocheokOperatorVisitGuidance(
  block: GocheokBlock,
  now: ClockInput = new Date(),
): GocheokOperatorVisitGuidanceResult {
  const blockGuidance = GOCHEOK_BLOCK_VISIT_GUIDANCE.find((entry) => entry.blockId === block.id);
  const activeNotices = getGocheokActiveOperationNotices(now)
    .filter((notice) => notice.affectedBlockIds.length === 0 || notice.affectedBlockIds.includes(block.id));
  const entrancePoints = blockGuidance?.recommendedEntrancePointIds
    .map((pointId) => GOCHEOK_OPERATOR_FACILITY_POINTS.find((point) => point.id === pointId))
    .filter((point): point is GocheokFacilityPoint => Boolean(point)) ?? [];
  const facilityPoints = blockGuidance?.nearbyFacilityPointIds
    .map((pointId) => GOCHEOK_OPERATOR_FACILITY_POINTS.find((point) => point.id === pointId))
    .filter((point): point is GocheokFacilityPoint => Boolean(point)) ?? [];
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
    operatorDataStatus: hasOperatorData ? 'OPERATOR_PROVIDED' : MANUAL_REQUIRED,
    operatorDataPendingLabel: GOCHEOK_OPERATOR_FACILITY_DATA_REQUIREMENT.pendingLabel,
  };
}
