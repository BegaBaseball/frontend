// Daejeon Hanwha Life Ballpark seat data.
// Keep this static: do not add runtime crawling or web-search data collection.

export type DaejeonSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type DaejeonFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type DaejeonLevel = '1F' | '2F' | '3F' | '4F' | 'OUTFIELD';
export type DaejeonSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type DaejeonSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';
export type DaejeonZoneGroup = 'CENTER' | 'INFIELD' | 'OUTFIELD' | 'SPECIAL';
export type DaejeonTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'NEEDS_OPERATOR_REVIEW';
export type DaejeonTraceMethod = 'PATH_TRACED_FROM_OFFICIAL_IMAGE' | 'APPROX_CENTER_RECT' | 'APPROX_INTERPOLATED_POLYLINE';
export type DaejeonSegmentationLevel = 'GROUP' | 'OFFICIAL_BLOCK';

export interface DaejeonImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
}

export interface DaejeonSeatMapImage {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  assetSha256: string;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: DaejeonSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface DaejeonBlockGroup {
  id: string;
  level: DaejeonLevel;
  category: string;
  name: string;
  block: string;
  officialSectionName: string;
  zoneGroup: DaejeonZoneGroup;
  displayPriority: number;
  traceStatus: DaejeonTraceStatus;
  traceMethod: DaejeonTraceMethod;
  officialBlocks: string[];
  side: DaejeonSide;
  fanRole: DaejeonFanRole;
  sourceConfidence: DaejeonSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: DaejeonImageGeometry;
  accessibilityNote?: string;
}

export interface DaejeonBlock extends DaejeonBlockGroup {
  parentId: string;
  parentBlock: string;
  blockCode: string;
  officialBlockLabel: string;
  segmentationLevel: 'OFFICIAL_BLOCK';
  hitAreaD?: string;
  reviewNote?: string;
}

export interface DaejeonManualBlockGeometry extends DaejeonImageGeometry {
  traceStatus: DaejeonTraceStatus;
  traceMethod: DaejeonTraceMethod;
  reviewNote: string;
  hitAreaD?: string;
}

export interface DaejeonCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface DaejeonViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface DaejeonCategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
  sides?: string[] | null;
  levels?: string[] | null;
  filterDimension?: 'grade' | 'position' | 'level';
}

export const DAEJEON_SPLIT_COLOR_BLOCK_IDS = [
] as const;

export function isDaejeonSplitColorBlockId(id: string): boolean {
  return (DAEJEON_SPLIT_COLOR_BLOCK_IDS as readonly string[]).includes(id);
}

export interface DaejeonOfficialSectionGroup {
  id: DaejeonZoneGroup;
  label: string;
  sections: readonly string[];
}

export type DaejeonSectionCoverageStatus = 'REPRESENTATIVE_TRACED' | 'SPLIT_ACROSS_BLOCKS';

export interface DaejeonSectionCoverage {
  officialSectionName: string;
  blockIds: string[];
  status: DaejeonSectionCoverageStatus;
  reviewNote: string;
}

export interface DaejeonTraceReviewParentSummary {
  parentId: string;
  officialSectionName: string;
  name: string;
  block: string;
  totalBlocks: number;
  officialImageTraced: number;
  needsOperatorReview: number;
  reviewNote: string;
}

export interface DaejeonTraceReviewSectionSummary {
  officialSectionName: string;
  totalBlocks: number;
  officialImageTraced: number;
  needsOperatorReview: number;
  coverageStatus: DaejeonSectionCoverageStatus;
  reviewNote: string;
}

export interface DaejeonTraceReviewSummary {
  totalGroups: number;
  totalBlocks: number;
  officialImageTraced: number;
  needsOperatorReview: number;
  pendingByParent: DaejeonTraceReviewParentSummary[];
  pendingByOfficialSection: DaejeonTraceReviewSectionSummary[];
}

export type DaejeonTraceReviewQueuePhase =
  | 'P0_ANCHOR_RETRACE'
  | 'P1_INFIELD_A_RETRACE'
  | 'P2_OUTFIELD_RESERVED_RETRACE';

export interface DaejeonTraceReviewQueueItem {
  sortOrder: number;
  phase: DaejeonTraceReviewQueuePhase;
  priority: number;
  id: string;
  parentId: string;
  officialSectionName: string;
  name: string;
  blockCode: string;
  officialBlockLabel: string;
  traceMethod: DaejeonTraceMethod;
  reviewNote: string;
  reason: string;
  operatorAction: string;
}

export interface DaejeonP2DeduplicatedAlias {
  retiredBlockId: string;
  retiredParentId: string;
  blockCode: string;
  officialSectionName: string;
  canonicalBlockId: string;
  reason: string;
  evidenceCropPath: string;
}

export const DAEJEON_SEATMAP_IMAGE: DaejeonSeatMapImage = {
  imagePath: 'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
  imageWidth: 920,
  imageHeight: 1060,
  assetSha256: '5fbfa5364e4271b814789ea35400966e9c6afea38ee1f3654382e9f1838b4081',
  sourceLabel: '한화 이글스 공식 대전 한화생명볼파크 좌석안내도',
  sourceUrl: 'https://www.hanwhaeagles.co.kr/MN/EP/MNEPPI01.do',
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
};

export const DAEJEON_CATEGORIES: Record<string, DaejeonCategory> = {
  PREMIUM: { label: '프리미엄석', light: '#F37321', dark: '#F58A3D', textLight: '#7C2D12', textDark: '#FFEDD5' },
  TABLE: { label: '테이블석', light: '#334155', dark: '#64748B', textLight: '#0F172A', textDark: '#E2E8F0' },
  CHEERING: { label: '응원석', light: '#FF6A13', dark: '#FF7A2E', textLight: '#7C2D12', textDark: '#FFEDD5' },
  INFIELD: { label: '내야석', light: '#2563EB', dark: '#3B82F6', textLight: '#1E3A8A', textDark: '#DBEAFE' },
  SKY: { label: '스카이박스', light: '#1E3A8A', dark: '#60A5FA', textLight: '#172554', textDark: '#DBEAFE' },
  EXCITING: { label: '풀/카라반', light: '#EF4444', dark: '#F87171', textLight: '#7F1D1D', textDark: '#FECACA' },
  OUTFIELD: { label: '외야석', light: '#22C55E', dark: '#4ADE80', textLight: '#14532D', textDark: '#DCFCE7' },
  SPECIAL: { label: '특수석', light: '#8B5CF6', dark: '#A78BFA', textLight: '#4C1D95', textDark: '#EDE9FE' },
  ACCESSIBLE: { label: '휠체어석', light: '#06B6D4', dark: '#22D3EE', textLight: '#164E63', textDark: '#CFFAFE' },
};

export const DAEJEON_CATEGORY_GROUPS: DaejeonCategoryGroup[] = [
  // 층수별 (level row)
  { id: 'all', label: '전체', cats: null, filterDimension: 'level' },
  { id: 'lv-1f', label: '1층', cats: null, levels: ['1F'], filterDimension: 'level' },
  { id: 'lv-2f', label: '2층', cats: null, levels: ['2F'], filterDimension: 'level' },
  { id: 'lv-3f', label: '3층', cats: null, levels: ['3F'], filterDimension: 'level' },
  { id: 'lv-4f', label: '4층', cats: null, levels: ['4F'], filterDimension: 'level' },
  { id: 'lv-out', label: '외야층', cats: null, levels: ['OUTFIELD'], filterDimension: 'level' },
  // 등급별 (grade row)
  { id: 'cheer', label: '응원석', cats: ['CHEERING'], filterDimension: 'grade' },
  { id: 'premium', label: '프리미엄', cats: ['PREMIUM', 'TABLE'], filterDimension: 'grade' },
  { id: 'table', label: '테이블석', cats: ['TABLE'], filterDimension: 'grade' },
  { id: 'infield', label: '내야석', cats: ['INFIELD'], filterDimension: 'grade' },
  { id: 'sky', label: '스카이박스', cats: ['SKY'], filterDimension: 'grade' },
  { id: 'outfield', label: '외야석', cats: ['OUTFIELD'], filterDimension: 'grade' },
  { id: 'special', label: '특수석', cats: ['SPECIAL', 'EXCITING'], filterDimension: 'grade' },
  { id: 'accessible', label: '휠체어석', cats: ['ACCESSIBLE'], filterDimension: 'grade' },
  // 위치별 (position row)
  { id: 'pos-first', label: '1루 측', cats: null, sides: ['FIRST_BASE'], filterDimension: 'position' },
  { id: 'pos-third', label: '3루 측', cats: null, sides: ['THIRD_BASE'], filterDimension: 'position' },
  { id: 'pos-center', label: '중앙', cats: null, sides: ['CENTER'], filterDimension: 'position' },
  { id: 'pos-out', label: '외야', cats: null, sides: ['OUTFIELD'], filterDimension: 'position' },
];

export const DAEJEON_REQUIRED_OFFICIAL_SECTIONS = [
  '포수 후면석',
  '중앙 지정석',
  '중앙 탁자석',
  '중앙 휠체어석',
  '내야 지정석A',
  '내야 지정석B',
  '스플래쉬 자쿠지(인피니티 풀)',
  '스플래쉬 카라반(인피니티 풀)',
  '내야 휠체어석',
  '내야 탁자석(4층)',
  '카스존(응원단석)',
  '이닝스 VIP 바 & 룸/테라스',
  '스카이박스',
  '외야지정석',
  '밤켈존(잔디석)',
  '외야탁자석',
  '외야 휠체어석',
] as const;

export const DAEJEON_OFFICIAL_SECTION_GROUPS: DaejeonOfficialSectionGroup[] = [
  {
    id: 'CENTER',
    label: '중앙',
    sections: ['포수 후면석', '중앙 지정석', '중앙 탁자석', '중앙 휠체어석'],
  },
  {
    id: 'INFIELD',
    label: '내야',
    sections: ['내야 지정석A', '내야 지정석B', '내야 휠체어석', '내야 탁자석(4층)', '카스존(응원단석)'],
  },
  {
    id: 'OUTFIELD',
    label: '외야',
    sections: ['외야지정석', '밤켈존(잔디석)', '외야탁자석', '외야 휠체어석'],
  },
  {
    id: 'SPECIAL',
    label: '특화',
    sections: ['스플래쉬 자쿠지(인피니티 풀)', '스플래쉬 카라반(인피니티 풀)', '이닝스 VIP 바 & 룸/테라스', '스카이박스'],
  },
];

const FIRST_TABLE_4F_BLOCK_CODES = [
  '301',
  '302',
  '401',
  '402',
  '403',
  '404',
  '405',
  '406',
  '407',
  '408',
  '409',
  '410',
  '411',
  '412',
  '413',
] as const;

const DAEJEON_GROUP_SECTION_COVERAGE: DaejeonSectionCoverage[] = [
  {
    officialSectionName: '포수 후면석',
    blockIds: ['catcher-back-100'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '홈플레이트 바로 뒤 100A-100C 구역을 단일 hit-area로 대표합니다.',
  },
  {
    officialSectionName: '중앙 지정석',
    blockIds: ['central-reserved-100'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '중앙 지정석 100A-100C 상단 띠 영역을 대표합니다.',
  },
  {
    officialSectionName: '중앙 탁자석',
    blockIds: ['central-table-100'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '중앙 하단 탁자석 영역을 좌우 경계 포함 단일 영역으로 대표합니다.',
  },
  {
    officialSectionName: '중앙 휠체어석',
    blockIds: ['central-accessible'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '중앙 하단 휠체어 아이콘 위치를 기준으로 별도 hit-area를 둡니다.',
  },
  {
    officialSectionName: '내야 지정석A',
    blockIds: ['first-infield-a-109-112-201-212', 'third-infield-a-113-120-213-225'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '1루/3루 내야 지정석A를 좌우 2개 hit-area로 분리해 선택성을 높입니다.',
  },
  {
    officialSectionName: '내야 지정석B',
    blockIds: ['first-infield-b-101-108', 'third-infield-b-121-124'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '1루/3루 하단 내야 지정석B를 좌우 2개 hit-area로 분리합니다.',
  },
  {
    officialSectionName: '스플래쉬 자쿠지(인피니티 풀)',
    blockIds: ['splash-jacuzzi-425'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '3루측 425 특화 구역을 공식 라벨 위치에 맞춰 대표합니다.',
  },
  {
    officialSectionName: '스플래쉬 카라반(인피니티 풀)',
    blockIds: ['splash-caravan-426'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '3루측 426 특화 구역을 공식 라벨 위치에 맞춰 대표합니다.',
  },
  {
    officialSectionName: '내야 휠체어석',
    blockIds: ['first-infield-accessible', 'third-infield-accessible'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '1루/3루 내야 휠체어 아이콘 위치를 별도 hit-area로 분리합니다.',
  },
  {
    officialSectionName: '내야 탁자석(4층)',
    blockIds: ['first-table-4f-301-413', 'third-table-4f-414-330'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '4층 내야 탁자석을 1루/3루 방향으로 분리해 큰 영역 선택 오차를 줄입니다.',
  },
  {
    officialSectionName: '카스존(응원단석)',
    blockIds: ['cass-cheering-200'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '1루측 200 응원단석 영역을 공식 카스존 표기 기준으로 대표합니다.',
  },
  {
    officialSectionName: '이닝스 VIP 바 & 룸/테라스',
    blockIds: ['innings-vip-400'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '1루측 400 VIP 영역을 공식 표기 외곽에 맞춰 대표합니다.',
  },
  {
    officialSectionName: '스카이박스',
    blockIds: ['skybox-s01-s37'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '중앙 4층 S01-S37 스카이박스 띠 영역을 단일 hit-area로 대표합니다.',
  },
  {
    officialSectionName: '외야지정석',
    blockIds: ['outfield-reserved-509', 'outfield-reserved-first-301-404', 'outfield-reserved-third-423-330'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '중앙 외야 509와 좌우 외야 지정석을 3개 hit-area로 분리합니다.',
  },
  {
    officialSectionName: '밤켈존(잔디석)',
    blockIds: ['outfield-lawn-500'],
    status: 'REPRESENTATIVE_TRACED',
    reviewNote: '좌측 외야 잔디석 500 영역을 공식 라벨 기준으로 대표합니다.',
  },
  {
    officialSectionName: '외야탁자석',
    blockIds: ['outfield-table-third-501-503', 'outfield-table-first-504-508'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '외야 탁자석을 501-503과 504-508 두 방향으로 분리합니다.',
  },
  {
    officialSectionName: '외야 휠체어석',
    blockIds: ['outfield-accessible-third', 'outfield-accessible-first'],
    status: 'SPLIT_ACROSS_BLOCKS',
    reviewNote: '좌측/우측 외야 휠체어 아이콘 위치를 각각 선택 가능한 영역으로 둡니다.',
  },
];

type Point = readonly [number, number];

const OFFICIAL_SOURCE_NOTE = '한화 이글스 공식 대전 한화생명볼파크 좌석안내도 기준으로 수동 트레이싱한 구역입니다.';

function polygonPath(points: readonly Point[]): string {
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ') + ' Z';
}

function compoundPolygonPath(polygons: readonly (readonly Point[])[]): string {
  return polygons.map((points) => polygonPath(points)).join(' ');
}

function rectPath(x: number, y: number, width: number, height: number): string {
  return polygonPath([
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ]);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function inferZoneGroup(input: { category: string; side: DaejeonSide }): DaejeonZoneGroup {
  if (input.category === 'OUTFIELD' || input.side === 'OUTFIELD') return 'OUTFIELD';
  if (input.category === 'SKY' || input.category === 'SPECIAL' || input.category === 'EXCITING') return 'SPECIAL';
  if (input.side === 'CENTER') return 'CENTER';
  return 'INFIELD';
}

function createSeatViewAliases(name: string, block: string, officialBlocks: string[], extra: string[] = []): string[] {
  return unique([
    name,
    `${name} ${block}`,
    `대전 ${name}`,
    `한화 ${name}`,
    `한화생명볼파크 ${name}`,
    `대전 한화생명볼파크 ${name}`,
    `한화생명 이글스파크 ${name}`,
    `대전 한화생명 이글스파크 ${name}`,
    `이글스파크 ${name}`,
    block,
    `한화 ${block}`,
    `한화생명볼파크 ${block}`,
    `대전 한화생명볼파크 ${block}`,
    `한화생명 이글스파크 ${block}`,
    `대전 한화생명 이글스파크 ${block}`,
    `이글스파크 ${block}`,
    ...officialBlocks,
    ...extra,
  ]);
}

function createBlock(input: Omit<
  DaejeonBlockGroup,
  'officialSectionName' | 'zoneGroup' | 'displayPriority' | 'traceStatus' | 'traceMethod' | 'sourceConfidence' | 'sourceNote' | 'seatViewSections' | 'imageGeometry'
> & {
  officialSectionName?: string;
  zoneGroup?: DaejeonZoneGroup;
  displayPriority?: number;
  traceStatus?: DaejeonTraceStatus;
  traceMethod?: DaejeonTraceMethod;
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
  sourceNote?: string;
  seatViewSections?: string[];
}): DaejeonBlockGroup {
  return {
    id: input.id,
    level: input.level,
    category: input.category,
    name: input.name,
    block: input.block,
    officialSectionName: input.officialSectionName ?? input.name,
    zoneGroup: input.zoneGroup ?? inferZoneGroup(input),
    displayPriority: input.displayPriority ?? 0,
    traceStatus: input.traceStatus ?? 'OFFICIAL_IMAGE_TRACED',
    traceMethod: input.traceMethod ?? 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    officialBlocks: input.officialBlocks,
    side: input.side,
    fanRole: input.fanRole,
    sourceConfidence: 'OFFICIAL',
    sourceNote: input.sourceNote ?? OFFICIAL_SOURCE_NOTE,
    seatViewSections: createSeatViewAliases(input.name, input.block, input.officialBlocks, input.seatViewSections),
    imageGeometry: {
      d: input.d,
      labelX: input.labelX,
      labelY: input.labelY,
      labelRotate: input.labelRotate,
      labelFontSize: input.labelFontSize,
      shortLabel: input.shortLabel,
    },
    accessibilityNote: input.accessibilityNote,
  };
}

export const DAEJEON_BLOCK_GROUPS: DaejeonBlockGroup[] = ([
  createBlock({
    id: 'central-reserved-100',
    level: '1F',
    category: 'PREMIUM',
    name: '중앙 지정석',
    block: '100A-100C',
    officialBlocks: ['중앙 지정석 100A', '중앙 지정석 100B', '중앙 지정석 100C'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    d: polygonPath([[365, 666], [519, 666], [525, 699], [356, 699]]),
    labelX: 442,
    labelY: 683,
    shortLabel: '중앙지정',
  }),
  createBlock({
    id: 'catcher-back-100',
    level: '1F',
    category: 'PREMIUM',
    name: '포수 후면석',
    block: '100A-100C',
    officialBlocks: ['포수 후면석 100A', '포수 후면석 100B', '포수 후면석 100C'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    d: polygonPath([[322, 690], [562, 690], [532, 739], [352, 739]]),
    labelX: 442,
    labelY: 716,
    shortLabel: '포수후면',
  }),
  createBlock({
    id: 'central-table-100',
    level: '1F',
    category: 'TABLE',
    name: '중앙 탁자석',
    block: '100A-100C',
    officialBlocks: ['중앙 탁자석 100A', '중앙 탁자석 100B', '중앙 탁자석 100C'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    d: polygonPath([[282, 746], [600, 746], [640, 804], [527, 840], [360, 840], [244, 804]]),
    labelX: 442,
    labelY: 779,
    shortLabel: '중앙탁자',
  }),
  createBlock({
    id: 'central-accessible',
    level: '1F',
    category: 'ACCESSIBLE',
    name: '중앙 휠체어석',
    block: '중앙',
    officialBlocks: ['중앙 휠체어석'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    accessibilityNote: '공식 좌석안내도에서 중앙 하단 휠체어 아이콘으로 표기된 구역입니다.',
    d: rectPath(431, 814, 31, 30),
    labelX: 446,
    labelY: 829,
    shortLabel: '휠체어',
    labelFontSize: 12,
  }),
  createBlock({
    id: 'first-infield-b-101-108',
    level: '1F',
    category: 'INFIELD',
    name: '내야 지정석B',
    block: '101-108',
    officialBlocks: ['내야 지정석B 101', '내야 지정석B 102', '내야 지정석B 103', '내야 지정석B 104', '내야 지정석B 105', '내야 지정석B 106', '내야 지정석B 107', '내야 지정석B 108'],
    side: 'FIRST_BASE',
    fanRole: 'HOME',
    d: polygonPath([[656, 360], [740, 373], [732, 512], [636, 646], [531, 675], [577, 536]]),
    labelX: 653,
    labelY: 526,
    shortLabel: '101-108',
    labelRotate: -16,
  }),
  createBlock({
    id: 'third-infield-b-121-124',
    level: '1F',
    category: 'INFIELD',
    name: '내야 지정석B',
    block: '121-124',
    officialBlocks: ['내야 지정석B 121', '내야 지정석B 122', '내야 지정석B 123', '내야 지정석B 124'],
    side: 'THIRD_BASE',
    fanRole: 'AWAY',
    d: polygonPath([[143, 358], [232, 382], [304, 538], [354, 674], [247, 646], [157, 517]]),
    labelX: 217,
    labelY: 521,
    shortLabel: '121-124',
    labelRotate: 16,
  }),
  createBlock({
    id: 'first-infield-a-109-112-201-212',
    level: '1F',
    category: 'INFIELD',
    name: '내야 지정석A',
    block: '109-112, 201-212',
    officialBlocks: [
      '내야 지정석A 109',
      '내야 지정석A 110',
      '내야 지정석A 111',
      '내야 지정석A 112',
      '내야 지정석A 201',
      '내야 지정석A 202',
      '내야 지정석A 203',
      '내야 지정석A 204',
      '내야 지정석A 205',
      '내야 지정석A 206',
      '내야 지정석A 207',
      '내야 지정석A 208',
      '내야 지정석A 209',
      '내야 지정석A 210',
      '내야 지정석A 211',
      '내야 지정석A 212',
    ],
    side: 'FIRST_BASE',
    fanRole: 'HOME',
    d: polygonPath([[536, 638], [715, 505], [772, 737], [628, 817], [501, 721]]),
    labelX: 626,
    labelY: 677,
    shortLabel: '109-112',
    labelRotate: -27,
  }),
  createBlock({
    id: 'third-infield-a-113-120-213-225',
    level: '1F',
    category: 'INFIELD',
    name: '내야 지정석A',
    block: '113-120, 213-225',
    officialBlocks: [
      '내야 지정석A 113',
      '내야 지정석A 114',
      '내야 지정석A 115',
      '내야 지정석A 116',
      '내야 지정석A 117',
      '내야 지정석A 118',
      '내야 지정석A 119',
      '내야 지정석A 120',
      '내야 지정석A 213',
      '내야 지정석A 214',
      '내야 지정석A 215',
      '내야 지정석A 216',
      '내야 지정석A 217',
      '내야 지정석A 218',
      '내야 지정석A 219',
      '내야 지정석A 220',
      '내야 지정석A 221',
      '내야 지정석A 222',
      '내야 지정석A 223',
      '내야 지정석A 224',
      '내야 지정석A 225',
    ],
    side: 'THIRD_BASE',
    fanRole: 'AWAY',
    d: polygonPath([[169, 505], [348, 638], [381, 721], [254, 817], [112, 737]]),
    labelX: 260,
    labelY: 676,
    shortLabel: '113-120',
    labelRotate: 27,
  }),
  createBlock({
    id: 'cass-cheering-200',
    level: '2F',
    category: 'CHEERING',
    name: '카스존(응원단석)',
    block: '200',
    officialBlocks: ['카스존(응원단석) 200'],
    side: 'FIRST_BASE',
    fanRole: 'HOME',
    d: polygonPath([[760, 372], [805, 349], [817, 455], [771, 461]]),
    labelX: 788,
    labelY: 411,
    shortLabel: '응원',
    labelRotate: -9,
    seatViewSections: ['응원단석', '카스존', '홈 응원석'],
  }),
  createBlock({
    id: 'first-infield-accessible',
    level: '1F',
    category: 'ACCESSIBLE',
    name: '내야 휠체어석',
    block: '1루 내야',
    officialBlocks: ['내야 휠체어석 1루'],
    side: 'FIRST_BASE',
    fanRole: 'HOME',
    accessibilityNote: '공식 좌석안내도에서 1루 내야 통로의 휠체어 아이콘으로 표기된 구역입니다.',
    d: polygonPath([[690, 583], [725, 570], [736, 607], [704, 625]]),
    labelX: 713,
    labelY: 598,
    shortLabel: '휠체어',
    labelFontSize: 11,
  }),
  createBlock({
    id: 'third-infield-accessible',
    level: '1F',
    category: 'ACCESSIBLE',
    name: '내야 휠체어석',
    block: '3루 내야',
    officialBlocks: ['내야 휠체어석 3루'],
    side: 'THIRD_BASE',
    fanRole: 'AWAY',
    accessibilityNote: '공식 좌석안내도에서 3루 내야 통로의 휠체어 아이콘으로 표기된 구역입니다.',
    d: polygonPath([[149, 582], [184, 568], [197, 607], [164, 625]]),
    labelX: 173,
    labelY: 598,
    shortLabel: '휠체어',
    labelFontSize: 11,
  }),
  createBlock({
    id: 'skybox-s01-s37',
    level: '4F',
    category: 'SKY',
    name: '스카이박스',
    block: 'S01-S37',
    officialBlocks: ['스카이박스 S01-S37'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    d: polygonPath([[202, 735], [683, 735], [686, 792], [584, 830], [443, 848], [302, 831], [199, 792]]),
    labelX: 443,
    labelY: 804,
    shortLabel: '스카이',
  }),
  createBlock({
    id: 'first-table-4f-301-413',
    level: '4F',
    category: 'TABLE',
    name: '내야 탁자석(4층)',
    block: '301-302, 401-413',
    officialBlocks: FIRST_TABLE_4F_BLOCK_CODES.map((blockCode) => `내야 탁자석(4층) ${blockCode}`),
    side: 'FIRST_BASE',
    fanRole: 'HOME',
    d: polygonPath([[790, 458], [875, 490], [783, 767], [608, 907], [513, 879], [648, 802], [746, 684]]),
    labelX: 746,
    labelY: 689,
    shortLabel: '4층탁자',
    labelRotate: -28,
  }),
  createBlock({
    id: 'third-table-4f-414-330',
    level: '4F',
    category: 'TABLE',
    name: '내야 탁자석(4층)',
    block: '414-423, 326-330',
    officialBlocks: ['내야 탁자석(4층) 414-423', '내야 탁자석(4층) 326-330'],
    side: 'THIRD_BASE',
    fanRole: 'AWAY',
    d: polygonPath([[47, 490], [130, 457], [208, 684], [305, 802], [374, 879], [282, 907], [106, 769]]),
    labelX: 142,
    labelY: 689,
    shortLabel: '4층탁자',
    labelRotate: 28,
  }),
  createBlock({
    id: 'innings-vip-400',
    level: '4F',
    category: 'SPECIAL',
    name: '이닝스 VIP 바 & 룸/테라스',
    block: '400',
    officialBlocks: ['이닝스 VIP 바 & 룸/테라스 400'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    d: polygonPath([[837, 532], [873, 546], [852, 625], [820, 613]]),
    labelX: 851,
    labelY: 571,
    shortLabel: 'VIP',
    labelRotate: -77,
  }),
  createBlock({
    id: 'splash-jacuzzi-425',
    level: '4F',
    category: 'EXCITING',
    name: '스플래쉬 자쿠지(인피니티 풀)',
    block: '425',
    officialBlocks: ['스플래쉬 자쿠지(인피니티 풀) 425'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    d: polygonPath([[83, 671], [119, 657], [129, 697], [94, 716]]),
    labelX: 104,
    labelY: 676,
    shortLabel: '자쿠지',
    labelRotate: -17,
  }),
  createBlock({
    id: 'splash-caravan-426',
    level: '4F',
    category: 'EXCITING',
    name: '스플래쉬 카라반(인피니티 풀)',
    block: '426',
    officialBlocks: ['스플래쉬 카라반(인피니티 풀) 426'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    d: polygonPath([[57, 585], [88, 575], [98, 608], [69, 622]]),
    labelX: 83,
    labelY: 595,
    shortLabel: '카라반',
    labelRotate: -17,
  }),
  createBlock({
    id: 'outfield-reserved-509',
    level: 'OUTFIELD',
    category: 'OUTFIELD',
    name: '외야지정석',
    block: '509',
    officialBlocks: ['외야지정석 509'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    d: polygonPath([[353, 12], [557, 12], [600, 45], [312, 45]]),
    labelX: 456,
    labelY: 29,
    shortLabel: '509',
  }),
  createBlock({
    id: 'outfield-lawn-500',
    level: 'OUTFIELD',
    category: 'OUTFIELD',
    name: '밤켈존(잔디석)',
    block: '500',
    officialBlocks: ['밤켈존(잔디석) 500'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    d: polygonPath([[115, 174], [310, 56], [334, 112], [238, 209], [141, 374], [90, 346]]),
    labelX: 201,
    labelY: 169,
    labelRotate: -34,
    shortLabel: '잔디',
    seatViewSections: ['외야 잔디석', '잔디석', '밤켈존'],
  }),
  createBlock({
    id: 'outfield-table-third-501-503',
    level: 'OUTFIELD',
    category: 'OUTFIELD',
    name: '외야탁자석',
    block: '501-503',
    officialBlocks: ['외야탁자석 501', '외야탁자석 502', '외야탁자석 503'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    d: polygonPath([[294, 72], [405, 48], [406, 116], [318, 123]]),
    labelX: 355,
    labelY: 86,
    shortLabel: '501-503',
  }),
  createBlock({
    id: 'outfield-table-first-504-508',
    level: 'OUTFIELD',
    category: 'OUTFIELD',
    name: '외야탁자석',
    block: '504-508',
    officialBlocks: ['외야탁자석 504', '외야탁자석 505', '외야탁자석 506', '외야탁자석 507', '외야탁자석 508'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    d: polygonPath([[503, 48], [626, 73], [676, 150], [613, 201], [502, 118]]),
    labelX: 582,
    labelY: 119,
    labelRotate: 29,
    shortLabel: '504-508',
  }),
  createBlock({
    id: 'outfield-accessible-third',
    level: 'OUTFIELD',
    category: 'ACCESSIBLE',
    name: '외야 휠체어석',
    block: '좌측 외야',
    officialBlocks: ['외야 휠체어석 좌측'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    accessibilityNote: '공식 좌석안내도에서 좌측 외야 통로의 휠체어 아이콘으로 표기된 구역입니다.',
    d: polygonPath([[273, 55], [305, 36], [322, 64], [291, 84]]),
    labelX: 297,
    labelY: 61,
    shortLabel: '휠체어',
    labelFontSize: 11,
  }),
  createBlock({
    id: 'outfield-accessible-first',
    level: 'OUTFIELD',
    category: 'ACCESSIBLE',
    name: '외야 휠체어석',
    block: '우측 외야',
    officialBlocks: ['외야 휠체어석 우측'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    accessibilityNote: '공식 좌석안내도에서 우측 외야 통로의 휠체어 아이콘으로 표기된 구역입니다.',
    d: polygonPath([[803, 425], [832, 419], [840, 450], [811, 459]]),
    labelX: 821,
    labelY: 440,
    shortLabel: '휠체어',
    labelFontSize: 11,
  }),
  createBlock({
    id: 'outfield-reserved-first-301-404',
    level: 'OUTFIELD',
    category: 'OUTFIELD',
    name: '외야지정석',
    block: '301-302, 401-404',
    officialBlocks: [],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    d: polygonPath([[806, 462], [873, 475], [820, 628], [759, 611]]),
    labelX: 817,
    labelY: 544,
    labelRotate: -74,
    shortLabel: '외야',
  }),
  createBlock({
    id: 'outfield-reserved-third-423-330',
    level: 'OUTFIELD',
    category: 'OUTFIELD',
    name: '외야지정석',
    block: '423-424, 327-330',
    officialBlocks: ['외야지정석 424'],
    side: 'OUTFIELD',
    fanRole: 'NEUTRAL',
    d: polygonPath([[50, 486], [119, 465], [161, 611], [97, 632]]),
    labelX: 105,
    labelY: 545,
    labelRotate: 74,
    shortLabel: '외야',
  }),
]).map((block, index) => ({ ...block, displayPriority: index + 1 }));

interface ExpandedOfficialBlock {
  blockCode: string;
  officialBlockLabel: string;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const FALLBACK_BLOCK_CODE_IDS: Record<string, string> = {
  '중앙': 'center',
  '1루 내야': 'first-infield',
  '3루 내야': 'third-infield',
  '좌측 외야': 'left-outfield',
  '우측 외야': 'right-outfield',
};

const MAX_AUTO_NUMERIC_RANGE_BLOCKS = 50;

function isBlockCodeToken(token: string): boolean {
  return /^(?:[A-Z]+\d+[A-Z]?|\d+[A-Z]?)$/.test(token);
}

function expandRangeToken(token: string): string[] | null {
  const numericRange = token.match(/^(\d+)-(\d+)$/);
  if (numericRange) {
    const start = Number(numericRange[1]);
    const end = Number(numericRange[2]);
    if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
      const count = end - start + 1;
      if (count > MAX_AUTO_NUMERIC_RANGE_BLOCKS) {
        throw new Error(`Daejeon seat block range ${token} is too broad for automatic expansion. Use an explicit official block code list.`);
      }
      return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
    }
  }

  const prefixedRange = token.match(/^([A-Z]+)(\d+)-([A-Z]+)(\d+)$/);
  if (prefixedRange && prefixedRange[1] === prefixedRange[3]) {
    const prefix = prefixedRange[1];
    const startText = prefixedRange[2];
    const endText = prefixedRange[4];
    const start = Number(startText);
    const end = Number(endText);
    if (Number.isInteger(start) && Number.isInteger(end) && end >= start) {
      const width = Math.max(startText.length, endText.length);
      return Array.from(
        { length: end - start + 1 },
        (_, index) => `${prefix}${String(start + index).padStart(width, '0')}`,
      );
    }
  }

  const suffixRange = token.match(/^(\d+)([A-Z])-(\d+)([A-Z])$/);
  if (suffixRange && suffixRange[1] === suffixRange[3]) {
    const number = suffixRange[1];
    const start = suffixRange[2].charCodeAt(0);
    const end = suffixRange[4].charCodeAt(0);
    if (end >= start) {
      return Array.from({ length: end - start + 1 }, (_, index) => `${number}${String.fromCharCode(start + index)}`);
    }
  }

  return null;
}

function expandOfficialBlockLabel(group: DaejeonBlockGroup, officialBlockLabel: string): ExpandedOfficialBlock[] {
  const parts = officialBlockLabel.trim().split(/\s+/);
  const token = parts[parts.length - 1] ?? '';
  const prefix = officialBlockLabel.slice(0, officialBlockLabel.length - token.length).trim();
  const expandedRange = expandRangeToken(token);

  if (expandedRange) {
    return expandedRange.map((blockCode) => ({
      blockCode,
      officialBlockLabel: prefix ? `${prefix} ${blockCode}` : blockCode,
    }));
  }

  if (isBlockCodeToken(token)) {
    return [{ blockCode: token, officialBlockLabel }];
  }

  return [{ blockCode: group.block, officialBlockLabel }];
}

function normalizeBlockCode(blockCode: string): string {
  const mapped = FALLBACK_BLOCK_CODE_IDS[blockCode];
  if (mapped) return mapped;

  return blockCode
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'block';
}

function pathToPoints(d: string): Point[] {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
}

function getPathBounds(d: string): Bounds {
  const points = pathToPoints(d);
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

type ManualGeometryMap = Record<string, DaejeonManualBlockGeometry>;
type ManualCenter = readonly [number, number] | readonly [number, number, number];

const MANUAL_TRACED_REVIEW_NOTE = '공식 좌석도 원본 이미지(920x1060)의 실제 색상 셀 외곽을 기준으로 보수적으로 수동 트레이싱했습니다.';
const UNMEASURED_GEOMETRY_REVIEW_NOTE = 'NEEDS_OPERATOR_REVIEW: 공식 PNG에서 직접 path를 측정하기 전까지 정확 좌표로 확정하지 않습니다.';
const UNMEASURED_GEOMETRY_SOURCE_NOTE = 'TODO: 공식 좌석도 원본 이미지에서 직접 측정된 좌표가 아니므로 운영자 재검수 후 선택 영역으로 확정해야 합니다.';

function roundCoordinate(value: number): number {
  return Number(value.toFixed(1));
}

function rotatedRectPoints(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleDegrees = 0,
): Point[] {
  const radians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([x, y]) => [
    roundCoordinate(centerX + (x * cos) - (y * sin)),
    roundCoordinate(centerY + (x * sin) + (y * cos)),
  ] as Point);
}

function manualBlockId(parentId: string, blockCode: string): string {
  return `${parentId}__${normalizeBlockCode(blockCode)}`;
}

function createManualGeometry(input: {
  d: string;
  labelX: number;
  labelY: number;
  shortLabel: string;
  labelRotate?: number;
  labelFontSize?: number;
  traceStatus?: DaejeonTraceStatus;
  traceMethod?: DaejeonTraceMethod;
  reviewNote?: string;
  hitAreaD?: string;
}): DaejeonManualBlockGeometry {
  return {
    d: input.d,
    labelX: roundCoordinate(input.labelX),
    labelY: roundCoordinate(input.labelY),
    labelRotate: input.labelRotate,
    labelFontSize: input.labelFontSize,
    shortLabel: input.shortLabel,
    traceStatus: input.traceStatus ?? 'OFFICIAL_IMAGE_TRACED',
    traceMethod: input.traceMethod ?? 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    reviewNote: input.reviewNote ?? MANUAL_TRACED_REVIEW_NOTE,
    hitAreaD: input.hitAreaD,
  };
}

function addManualRect(
  map: ManualGeometryMap,
  parentId: string,
  blockCode: string,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  angleDegrees = 0,
  labelFontSize = 8,
  shortLabel = blockCode,
  traceMethod: DaejeonTraceMethod = 'APPROX_CENTER_RECT',
): void {
  map[manualBlockId(parentId, blockCode)] = createManualGeometry({
    d: polygonPath(rotatedRectPoints(centerX, centerY, width, height, angleDegrees)),
    labelX: centerX,
    labelY: centerY,
    shortLabel,
    labelRotate: angleDegrees,
    labelFontSize,
    traceStatus: 'NEEDS_OPERATOR_REVIEW',
    traceMethod,
    reviewNote: UNMEASURED_GEOMETRY_REVIEW_NOTE,
  });
}

function addManualPath(
  map: ManualGeometryMap,
  parentId: string,
  blockCode: string,
  points: readonly Point[],
  labelX: number,
  labelY: number,
  options: {
    shortLabel?: string;
    labelRotate?: number;
    labelFontSize?: number;
    traceStatus?: DaejeonTraceStatus;
    traceMethod?: DaejeonTraceMethod;
    reviewNote?: string;
    hitAreaPoints?: readonly Point[];
  } = {},
): void {
  map[manualBlockId(parentId, blockCode)] = createManualGeometry({
    d: polygonPath(points),
    labelX,
    labelY,
    shortLabel: options.shortLabel ?? blockCode,
    labelRotate: options.labelRotate,
    labelFontSize: options.labelFontSize ?? 8,
    traceStatus: options.traceStatus,
    traceMethod: options.traceMethod,
    reviewNote: options.reviewNote,
    hitAreaD: options.hitAreaPoints ? polygonPath(options.hitAreaPoints) : undefined,
  });
}

function addManualCompoundPath(
  map: ManualGeometryMap,
  parentId: string,
  blockCode: string,
  polygons: readonly (readonly Point[])[],
  labelX: number,
  labelY: number,
  options: {
    shortLabel?: string;
    labelRotate?: number;
    labelFontSize?: number;
    traceStatus?: DaejeonTraceStatus;
    traceMethod?: DaejeonTraceMethod;
    reviewNote?: string;
    hitAreaPolygons?: readonly (readonly Point[])[];
  } = {},
): void {
  map[manualBlockId(parentId, blockCode)] = createManualGeometry({
    d: compoundPolygonPath(polygons),
    labelX,
    labelY,
    shortLabel: options.shortLabel ?? blockCode,
    labelRotate: options.labelRotate,
    labelFontSize: options.labelFontSize ?? 8,
    traceStatus: options.traceStatus,
    traceMethod: options.traceMethod,
    reviewNote: options.reviewNote,
    hitAreaD: options.hitAreaPolygons ? compoundPolygonPath(options.hitAreaPolygons) : undefined,
  });
}

function overrideManualLabel(
  map: ManualGeometryMap,
  parentId: string,
  blockCode: string,
  labelX: number,
  labelY: number,
): void {
  const id = manualBlockId(parentId, blockCode);
  const geometry = map[id];
  if (!geometry) {
    throw new Error(`Missing manual Daejeon geometry label override target: ${id}`);
  }

  map[id] = {
    ...geometry,
    labelX,
    labelY,
  };
}

function numericBlockCodes(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function prefixedBlockCodes(prefix: string, start: number, end: number, width = 2): string[] {
  return Array.from(
    { length: end - start + 1 },
    (_, index) => `${prefix}${String(start + index).padStart(width, '0')}`,
  );
}

function interpolatePolyline(anchors: readonly Point[], count: number): Array<{ x: number; y: number; angle: number }> {
  if (anchors.length < 2 || count <= 0) return [];

  const segments = anchors.slice(1).map((point, index) => {
    const from = anchors[index];
    const dx = point[0] - from[0];
    const dy = point[1] - from[1];
    return {
      from,
      to: point,
      dx,
      dy,
      length: Math.hypot(dx, dy),
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
  });
  const totalLength = segments.reduce((total, segment) => total + segment.length, 0);

  return Array.from({ length: count }, (_, index) => {
    const targetDistance = count === 1 ? totalLength / 2 : (totalLength * index) / (count - 1);
    let passedDistance = 0;

    for (const segment of segments) {
      const nextDistance = passedDistance + segment.length;
      if (targetDistance <= nextDistance || segment === segments[segments.length - 1]) {
        const ratio = segment.length === 0 ? 0 : (targetDistance - passedDistance) / segment.length;
        return {
          x: roundCoordinate(segment.from[0] + (segment.dx * ratio)),
          y: roundCoordinate(segment.from[1] + (segment.dy * ratio)),
          angle: roundCoordinate(segment.angle),
        };
      }
      passedDistance = nextDistance;
    }

    const fallback = anchors[anchors.length - 1];
    return { x: fallback[0], y: fallback[1], angle: 0 };
  });
}

function addManualCenters(
  map: ManualGeometryMap,
  parentId: string,
  blockCodes: readonly string[],
  centers: readonly ManualCenter[],
  width: number,
  height: number,
  defaultAngle = 0,
  labelFontSize = 8,
): void {
  blockCodes.forEach((blockCode, index) => {
    const center = centers[index];
    if (!center) return;
    addManualRect(
      map,
      parentId,
      blockCode,
      center[0],
      center[1],
      width,
      height,
      center.length > 2 ? center[2] : defaultAngle,
      labelFontSize,
      blockCode,
      'APPROX_CENTER_RECT',
    );
  });
}

function addManualPolyline(
  map: ManualGeometryMap,
  parentId: string,
  blockCodes: readonly string[],
  anchors: readonly Point[],
  width: number,
  height: number,
  labelFontSize = 8,
  angleOffset = 90,
): void {
  const centers = interpolatePolyline(anchors, blockCodes.length);
  blockCodes.forEach((blockCode, index) => {
    const center = centers[index];
    if (!center) return;
    addManualRect(
      map,
      parentId,
      blockCode,
      center.x,
      center.y,
      width,
      height,
      center.angle + angleOffset,
      labelFontSize,
      blockCode,
      'APPROX_INTERPOLATED_POLYLINE',
    );
  });
}

const UNVERIFIED_MANUAL_PATH_OPTIONS = {
  traceStatus: 'NEEDS_OPERATOR_REVIEW' as const,
  traceMethod: 'APPROX_INTERPOLATED_POLYLINE' as const,
  reviewNote: UNMEASURED_GEOMETRY_REVIEW_NOTE,
};

function createDaejeonManualBlockGeometry(): ManualGeometryMap {
  const map: ManualGeometryMap = {};

  addManualPath(map, 'central-reserved-100', '100A', [[484, 654], [465, 666], [471, 683], [495, 669], [496, 666], [484, 654]], 480, 669, { labelFontSize: 8, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });
  addManualPath(map, 'central-reserved-100', '100B', [[421, 668], [415, 686], [432, 691], [448, 691], [466, 686], [460, 668]], 440, 680, { labelFontSize: 8, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });
  addManualPath(map, 'central-reserved-100', '100C', [[397, 655], [384, 667], [408, 683], [411, 682], [416, 667], [398, 655]], 402, 669, { labelFontSize: 8, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });
  addManualPath(map, 'catcher-back-100', '100A', [[497, 672], [474, 687], [483, 711], [502, 702], [517, 690], [500, 672]], 494, 691, { labelFontSize: 9, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });
  addManualPath(map, 'catcher-back-100', '100B', [[415, 690], [406, 711], [421, 717], [439, 719], [475, 714], [470, 696], [465, 690]], 441, 705, { labelFontSize: 9, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });
  addManualPath(map, 'catcher-back-100', '100C', [[382, 672], [364, 690], [397, 710], [401, 708], [407, 687], [384, 672]], 388, 691, { labelFontSize: 9, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });
  addManualPath(map, 'central-table-100', '100A', [[521, 693], [484, 717], [507, 777], [530, 765], [533, 759], [553, 753], [567, 741], [521, 693]], 522, 735, { labelFontSize: 9 });
  addManualPath(map, 'central-table-100', '100B', [[405, 717], [384, 780], [425, 791], [464, 789], [500, 780], [479, 720], [405, 717]], 441, 757, { labelFontSize: 9 });
  addManualPath(map, 'central-table-100', '100C', [[360, 694], [316, 739], [374, 776], [385, 754], [397, 715], [360, 694]], 361, 735, { labelFontSize: 9 });
  addManualPath(map, 'central-accessible', '중앙', [[425, 787], [456, 787], [462, 800], [453, 811], [431, 811], [422, 800]], 442, 798, { shortLabel: '중앙', labelFontSize: 10, traceStatus: 'OFFICIAL_IMAGE_TRACED', traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE' });

  addManualPath(map, 'first-infield-b-101-108', '101', [[685, 385], [695, 373], [711, 356], [709, 383], [703, 384], [689, 386]], 700, 375, { labelRotate: -18, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '102', [[651, 422], [661, 411], [672, 399], [680, 391], [694, 389], [713, 387], [716, 406], [715, 413], [693, 417], [654, 423]], 687, 406, { labelRotate: -10, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '103', [[613, 463], [637, 436], [644, 429], [647, 428], [709, 420], [724, 420], [727, 444], [726, 453], [673, 471], [648, 468]], 674, 445, { labelRotate: -7, labelFontSize: 9 });
  addManualPath(
    map,
    'first-infield-b-101-108',
    '104',
    [
      [676, 481],
      [678, 463],
      [681, 462],
      [690, 461],
      [710, 459],
      [721, 458],
      [730, 482],
      [723, 497],
      [721, 501],
      [718, 502],
      [711, 499],
      [702, 495],
      [680, 485],
      [676, 483],
    ],
    705,
    487,
    {
      labelRotate: -7,
      labelFontSize: 9,
      reviewNote: '공식 좌석도에서 104 블록은 blue/olive 혼합 영역이 하나로 연결되어 보여 단일 폴리곤으로 재측정했습니다.',
    },
  );
  addManualPath(map, 'first-infield-b-101-108', '105', [[613, 486], [614, 483], [616, 478], [623, 469], [717, 506], [718, 507], [715, 514], [711, 523], [708, 529], [706, 530], [703, 529], [685, 521], [618, 491], [614, 489], [613, 487]], 665, 500, {
    labelRotate: -18,
    labelFontSize: 9,
    reviewNote: '공식 좌석도 원본 이미지(920x1060)에서 104 단일화 후 105 라벨 색상 셀 외곽만 단일 path로 수동 트레이싱했습니다.',
  });
  addManualPath(map, 'first-infield-b-101-108', '106', [[596, 520], [609, 494], [610, 493], [700, 533], [704, 535], [705, 537], [693, 564], [692, 565], [683, 561], [611, 528], [598, 522], [596, 521]], 650, 528, { labelRotate: -18, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '107', [[580, 551], [591, 529], [594, 526], [658, 555], [684, 567], [672, 593], [664, 590], [580, 552]], 631, 559, { labelRotate: -19, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '108', [[571, 568], [576, 559], [579, 557], [659, 593], [676, 601], [666, 625], [661, 633], [642, 620], [583, 579]], 627, 594, { labelRotate: -22, labelFontSize: 9 });
  addManualCenters(map, 'third-infield-b-121-124', ['121', '122', '123', '124'], [
    [209, 486, 5],
    [196, 446, 6],
    [181, 407, 8],
    [165, 371, 12],
  ], 58, 27, 0, 9);
  addManualPath(map, 'third-infield-b-121-124', '121', [[156, 479], [163, 453], [169, 453], [204, 457], [208, 482], [208, 483], [206, 484], [197, 488], [181, 495], [167, 501], [164, 500], [158, 486], [156, 481]], 180, 484, {
    labelRotate: 5,
    labelFontSize: 9,
    reviewNote: '공식 좌석도 원본 이미지(920x1060)에서 121 블록이 인접한 두 색상 셀로 보이더라도 하나의 좌석 블록으로 보이도록 단일 path로 병합해 정밀 재추적했습니다.',
  });
  addManualPath(map, 'third-infield-b-121-124', '122', [[163, 442], [165, 423], [169, 423], [180, 424], [222, 428], [240, 430], [267, 458], [260, 460], [234, 464], [214, 467], [165, 449]], 215, 445, { labelRotate: 6, labelFontSize: 9 });
  addManualPath(map, 'third-infield-b-121-124', '123', [[165, 411], [166, 393], [168, 391], [202, 394], [208, 395], [236, 424], [225, 424], [194, 421], [174, 419], [165, 418]], 197, 409, { labelRotate: 8, labelFontSize: 9 });
  addManualPath(map, 'third-infield-b-121-124', '124', [[167, 384], [168, 371], [171, 355], [181, 365], [203, 389], [202, 390], [172, 387], [167, 386]], 183, 377, { labelRotate: 12, labelFontSize: 9 });

  addManualPath(map, 'first-infield-a-109-112-201-212', '109', [[564, 599], [579, 583], [653, 635], [635, 656]], 610, 626, { labelRotate: -23, labelFontSize: 9 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '110', [[561, 602], [637, 665], [617, 687], [542, 625]], 589.1, 644.6, { labelRotate: -27, labelFontSize: 9 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '111', [[539, 628], [608, 686], [588, 709], [520, 652]], 563.4, 668.1, { labelRotate: -31, labelFontSize: 9 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '112', [[517, 655], [590, 718], [573, 737], [505, 667]], 548.9, 696.5, { labelRotate: -35, labelFontSize: 9 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '201', [[736, 454], [765, 451], [768, 480], [738, 480]], 751.9, 466, { labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '202', [[737, 486], [761, 486], [750, 507], [746, 509], [730, 502]], 743.9, 495.8, { labelRotate: -10, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '203', [[727, 507], [745, 514], [746, 520], [735, 543], [716, 534]], 730.9, 524.1, { labelRotate: -12, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '204', [[713, 539], [733, 547], [720, 577], [700, 569]], 715.6, 557.8, { labelRotate: -14, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '205', [[698, 574], [716, 581], [716, 585], [705, 607], [687, 600]], 693, 593, { labelRotate: -16, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '206', [[669, 638], [685, 604], [704, 613], [687, 651]], 685.4, 626.3, { labelRotate: -18, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '207', [[666, 643], [684, 655], [662, 679], [646, 667]], 663.6, 660.7, { labelRotate: -22, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '208', [[643, 670], [661, 683], [640, 706], [624, 693]], 640.8, 687.3, { labelRotate: -25, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '209', [[600, 720], [620, 696], [637, 709], [615, 733]], 617.5, 714.3, { labelRotate: -28, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '210', [[597, 724], [612, 738], [596, 756], [592, 755], [580, 743]], 595.5, 739.7, { labelRotate: -31, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '211', [[553, 764], [575, 748], [587, 760], [585, 765], [563, 779]], 570, 762.7, { labelRotate: -35, labelFontSize: 8 });
  addManualPath(map, 'first-infield-a-109-112-201-212', '212', [[550, 766], [562, 787], [536, 801], [524, 781]], 542.8, 784, { labelRotate: -38, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '113', [[366, 657], [375, 668], [309, 735], [293, 718]], 333.2, 696.4, { labelRotate: 35, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '114', [[343, 629], [363, 653], [295, 710], [275, 687]], 319.7, 668.9, { labelRotate: 35, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '115', [[253, 660], [321, 602], [340, 625], [273, 682], [271, 682]], 297.5, 641.4, { labelRotate: 31, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '116', [[231, 635], [305, 583], [318, 599], [249, 656]], 275.3, 618.7, { labelRotate: 28, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '117', [[318, 551], [323, 562], [222, 630], [208, 600]], 260.9, 589.6, { labelRotate: 25, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '118', [[202, 568], [210, 560], [302, 520], [314, 544], [294, 555], [216, 590], [212, 589]], 260, 555, { labelRotate: 23, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '119', [[181, 535], [195, 527], [285, 487], [297, 512], [291, 519], [195, 561], [190, 559]], 241, 524, { labelRotate: 21, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '120', [[173, 503], [211, 471], [271, 463], [281, 479], [274, 486], [184, 526]], 220, 500, { labelRotate: 18, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '220', [[167, 581], [168, 579], [208, 571], [228, 591], [214, 608], [189, 615], [178, 604]], 190, 599, { labelRotate: -27, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '213', [[332, 766], [357, 781], [344, 802], [319, 787]], 337.7, 783.6, { labelRotate: -35, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '214', [[290, 764], [308, 747], [329, 765], [315, 783]], 311, 764.5, { labelRotate: -35, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '215', [[274, 737], [278, 730], [286, 724], [300, 739], [300, 742], [288, 753]], 288.3, 738.4, { labelRotate: -35, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '216', [[247, 708], [263, 696], [283, 720], [269, 731], [263, 727]], 265.7, 712.8, { labelRotate: -31, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '217', [[225, 682], [242, 670], [260, 692], [244, 704]], 244, 686.4, { labelRotate: -31, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '218', [[201, 654], [219, 643], [238, 666], [222, 679]], 221.2, 660.4, { labelRotate: -27, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '219', [[184, 610], [200, 603], [215, 636], [198, 648], [182, 613]], 199.5, 625, { labelRotate: -27, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '221', [[152, 545], [172, 537], [184, 565], [164, 574]], 169.1, 555.7, { labelRotate: -22, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '222', [[137, 515], [157, 506], [169, 534], [149, 542]], 154.7, 524.2, { labelRotate: -22, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '223', [[120, 485], [147, 482], [156, 502], [130, 513], [118, 487]], 136.9, 495.5, { labelRotate: -25, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '224', [[124, 461], [127, 458], [147, 460], [146, 477], [122, 480]], 134.1, 468.5, { labelRotate: -25, labelFontSize: 8 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '225', [[127, 431], [149, 433], [147, 455], [127, 452], [125, 449]], 137.9, 443.2, { labelRotate: -25, labelFontSize: 8 });

  addManualPath(map, 'cass-cheering-200', '200', [[730, 396], [755, 376], [759, 374], [761, 384], [767, 444], [758, 446], [740, 448], [731, 412]], 749, 415, { labelRotate: -9, labelFontSize: 9 });
  addManualPath(map, 'first-infield-accessible', '1루 내야', [[690, 583], [725, 570], [736, 607], [704, 625]], 713, 598, { shortLabel: '휠체어', labelFontSize: 10 });
  addManualPath(map, 'third-infield-accessible', '3루 내야', [[149, 582], [167, 576], [183, 619], [164, 625]], 173, 598, { shortLabel: '휠체어', labelFontSize: 10 });

  addManualPolyline(map, 'skybox-s01-s37', prefixedBlockCodes('S', 1, 37), [
    [755, 489],
    [721, 594],
    [669, 704],
    [589, 789],
    [485, 836],
    [374, 837],
    [274, 791],
    [196, 706],
  ], 20, 13, 7, 90);
  ([
    ['S01', [[764, 533], [771, 527], [779, 533], [777, 535], [766, 535]], 772, 531, 198],
    ['S02', [[760, 542], [774, 544], [768, 550], [761, 547]], 767, 546, 198],
    ['S03', [[754, 556], [756, 551], [767, 554], [768, 557], [755, 558]], 761, 554, 198],
    ['S04', [[748, 569], [751, 566], [762, 567], [761, 573], [757, 574]], 755, 570, 198],
    ['S05', [[738, 591], [753, 589], [748, 598], [740, 595]], 746, 593, 198],
    ['S06', [[733, 602], [740, 599], [747, 604], [745, 608], [733, 607]], 740, 603, 205],
    ['S07', [[728, 612], [739, 612], [742, 615], [737, 623], [726, 618]], 734, 618, 205],
    ['S08', [[722, 627], [728, 623], [735, 626], [736, 629], [728, 631], [723, 630]], 729, 627, 205],
    ['S09', [[717, 638], [729, 638], [731, 640], [725, 646], [718, 643]], 724, 642, 205],
    ['S10', [[703, 664], [706, 662], [719, 663], [715, 669], [709, 669]], 711, 665, 205],
    ['S11', [[692, 678], [700, 670], [702, 670], [708, 677], [707, 679]], 700, 675, 205],
    ['S12', [[667, 707], [671, 705], [682, 707], [678, 714], [675, 714]], 675, 709, 205],
    ['S13', [[657, 721], [664, 714], [668, 714], [672, 720], [670, 723]], 664, 718, 223],
    ['S14', [[649, 730], [660, 724], [664, 731], [657, 738]], 657, 731, 223],
    ['S15', [[640, 739], [647, 735], [654, 740], [650, 746], [641, 743]], 647, 740, 223],
    ['S16', [[630, 751], [637, 746], [647, 751], [640, 759], [638, 759]], 639, 752, 223],
    ['S17', [[613, 771], [617, 770], [628, 773], [622, 780], [619, 780], [613, 775]], 621, 775, 223],
    ['S18', [[564, 806], [565, 803], [570, 803], [581, 808], [570, 813]], 573, 808, 246],
    ['S19', [[536, 818], [559, 807], [565, 818], [542, 829]], 556.5, 811.5, 246],
    ['S20', [[522, 825], [534, 820], [538, 830], [533, 833]], 535, 829, 246],
    ['S21', [[511, 831], [516, 828], [528, 833], [526, 836], [516, 839]], 515, 831.5, 246],
    ['S22', [[485, 836], [507, 830], [509, 843], [488, 848]], 506.5, 840.5, 246],
    ['S23', [[467, 841], [480, 839], [482, 850], [476, 850]], 479, 842, 269],
    ['S24', [[458, 841], [465, 841], [471, 852], [459, 852]], 461, 850.5, 269],
    ['S25', [[429, 843], [452, 843], [452, 853], [429, 853]], 441, 848, 269],
    ['S26', [[398, 846], [400, 840], [415, 840], [415, 842], [402, 851], [399, 850]], 401.5, 846, 269],
    ['S27', [[373, 830], [395, 837], [390, 849], [369, 842]], 392, 839.5, 269],
    ['S28', [[352, 835], [363, 828], [367, 828], [366, 837], [362, 840]], 362, 837.5, -65],
    ['S29', [[342, 830], [347, 822], [359, 826], [345, 833]], 345.5, 829.5, -65],
    ['S30', [[327, 822], [338, 817], [342, 820], [336, 829], [327, 824]], 334, 823, -65],
    ['S31', [[316, 817], [323, 809], [332, 812], [332, 815], [320, 820]], 324, 814, -65],
    ['S32', [[294, 802], [301, 794], [310, 801], [295, 804]], 302, 799, -65],
    ['S33', [[272, 785], [279, 777], [281, 777], [289, 785], [273, 787]], 281, 783, -65],
    ['S34', [[261, 773], [274, 771], [275, 774], [267, 780]], 268, 775, -43],
    ['S35', [[236, 745], [246, 739], [252, 746], [238, 747]], 245, 743, -43],
    ['S36', [[220, 725], [229, 720], [234, 726], [223, 729]], 227, 724, -43],
    ['S37', [[170, 666], [178, 661], [184, 668], [172, 670]], 177, 665, -43],
  ] as const).forEach(([blockCode, points, labelX, labelY, labelRotate]) => {
    addManualPath(map, 'skybox-s01-s37', blockCode, points, labelX, labelY, { labelRotate, labelFontSize: 6 });
  });

  addManualPolyline(map, 'first-table-4f-301-413', FIRST_TABLE_4F_BLOCK_CODES, [
    [772, 493],
    [752, 574],
    [712, 675],
    [650, 773],
    [560, 852],
  ], 2.6, 2.6, 5, 90);
  addManualPath(map, 'first-table-4f-301-413', '301', [[767, 467], [784, 456], [791, 454], [793, 487], [782, 487], [768, 478]], 782, 469, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '302', [[780, 491], [796, 491], [795, 500], [791, 508], [776, 501]], 786.4, 499.1, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '401', [[810, 476], [823, 472], [826, 477], [827, 485], [810, 484]], 817, 475, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '402', [[797, 518], [802, 508], [818, 503], [816, 514], [812, 522]], 811, 515, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '403', [[786, 534], [811, 536], [798, 568], [772, 563]], 785, 552, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '404', [[764, 569], [788, 574], [774, 622], [747, 613]], 765, 596, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '405', [[751, 620], [768, 623], [800, 637], [793, 656], [776, 658], [737, 653]], 744, 640, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '406', [[743, 643], [792, 663], [777, 701], [726, 677]], 735, 675, { labelRotate: -18, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '407', [[723, 679], [774, 705], [746, 735], [702, 704]], 715, 710, { labelRotate: -22, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '408', [[676, 733], [700, 707], [744, 739], [721, 765]], 690, 735, { labelRotate: -30, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '409', [[649, 765], [674, 736], [718, 769], [694, 796]], 665, 775, { labelRotate: -34, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '410', [[624, 794], [647, 768], [692, 800], [666, 828]], 630, 790, { labelRotate: -38, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '411', [[594, 818], [621, 797], [665, 832], [635, 864]], 605.9, 811.7, { labelRotate: -42, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '412', [[591, 820], [633, 867], [598, 890], [564, 838]], 583, 831.8, { labelRotate: -42, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '413', [[560, 839], [594, 892], [550, 911], [525, 855]], 560, 852, { labelRotate: -42, labelFontSize: 6 });
  addManualPolyline(map, 'third-table-4f-414-330', numericBlockCodes(414, 423), [
    [500, 874],
    [420, 878],
    [335, 852],
    [260, 795],
    [202, 717],
    [162, 636],
  ], 34, 22, 8, 90);
  addManualPath(map, 'third-table-4f-414-330', '414', [[485, 863], [521, 855], [545, 912], [497, 924]], 500, 874, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '415', [[443, 867], [480, 865], [493, 926], [443, 930]], 450, 876.5, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '416', [[400, 864], [438, 867], [438, 929], [388, 925]], 400.8, 872.1, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '417', [[359, 854], [395, 863], [384, 923], [336, 911]], 350, 880, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '418', [[322, 836], [355, 853], [331, 908], [289, 888]], 325, 875, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '419', [[267, 874], [277, 826], [315, 837], [282, 882]], 289, 837, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '420', [[238, 788], [271, 797], [284, 809], [285, 817], [282, 820], [267, 818], [238, 790]], 263, 805, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '421', [[237, 765], [260, 788], [247, 799], [224, 777]], 241, 783, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '422', [[210, 736], [222, 750], [214, 756], [206, 756], [198, 746]], 212, 754, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '423', [[182, 728], [199, 723], [207, 733], [194, 742]], 195.7, 732.6, { labelFontSize: 8 });
  addManualCenters(map, 'third-table-4f-414-330', numericBlockCodes(326, 330), [
    [151, 647, 76],
    [132, 608, 76],
    [116, 566, 76],
    [103, 523, 76],
    [91, 482, 76],
  ], 30, 22, 0, 8);
  addManualPath(map, 'third-table-4f-414-330', '326', [[144, 620], [156, 617], [162, 623], [169, 650], [160, 654]], 158.3, 635.8, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '327', [[133, 595], [150, 587], [160, 615], [144, 620]], 141, 608, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '328', [[139, 552], [152, 580], [131, 589], [118, 562]], 130, 577, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '329', [[126, 521], [137, 548], [116, 557], [104, 531]], 116, 543, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '330', [[111, 488], [123, 515], [101, 524], [87, 492]], 103, 505, { labelFontSize: 8 });

  addManualPath(map, 'innings-vip-400', '400', [[826, 503], [855, 509], [807, 616], [781, 608]], 814, 560, {
    shortLabel: '400',
    labelRotate: -77,
    labelFontSize: 8,
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
  });
  addManualPath(map, 'splash-jacuzzi-425', '425', [[142, 642], [156, 673], [142, 682], [127, 649]], 143, 663, { shortLabel: '자쿠지', labelRotate: -74, labelFontSize: 8 });
  addManualPath(map, 'splash-caravan-426', '426', [[85, 565], [119, 552], [131, 612], [106, 612]], 109, 589, { shortLabel: '카라반', labelRotate: -73, labelFontSize: 8 });

  addManualPath(map, 'outfield-reserved-509', '509', [[351, 39], [361, 31], [386, 12], [508, 12], [529, 31], [537, 39], [536, 40], [352, 40]], 446, 27, { labelFontSize: 9 });
  addManualPath(map, 'outfield-lawn-500', '500', [[141, 322], [158, 178], [261, 106], [269, 114], [280, 105], [292, 103], [294, 96], [304, 88], [308, 90], [330, 122], [329, 125], [215, 201], [147, 322]], 190, 174, {
    shortLabel: '잔디',
    labelRotate: -34,
    labelFontSize: 9,
  });
  addManualCenters(map, 'outfield-table-third-501-503', numericBlockCodes(501, 503), [
    [325, 82, -20],
    [365, 78, 0],
    [394, 78, 0],
  ], 30, 48, 0, 9);
  addManualCenters(map, 'outfield-table-first-504-508', numericBlockCodes(504, 508), [
    [520, 74, 9],
    [565, 95, 28],
    [603, 130, 32],
    [638, 164, 36],
    [674, 198, 40],
  ], 34, 44, 0, 9);
  addManualPath(map, 'outfield-table-third-501-503', '501', [[309, 85], [322, 76], [333, 74], [335, 76], [338, 80], [351, 99], [354, 104], [353, 106], [335, 118], [333, 119], [312, 90]], 333, 97, { labelRotate: -20, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-third-501-503', '502', [[337, 68], [347, 50], [370, 50], [370, 99], [361, 101], [358, 99], [345, 80]], 358, 73, { labelRotate: 0, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-third-501-503', '503', [[377, 50], [397, 50], [397, 99], [377, 99]], 387, 75, { labelRotate: 0, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-first-504-508', '504', [[484, 50], [511, 50], [511, 60], [495, 98], [494, 99], [484, 99]], 493, 75, { labelRotate: 9, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-first-504-508', '505', [[517, 99], [519, 50], [540, 50], [542, 51], [556, 62], [544, 79], [528, 100], [524, 102]], 532, 73, { labelRotate: 28, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-first-504-508', '506', [[531, 106], [540, 94], [559, 69], [561, 67], [580, 81], [592, 91], [588, 98], [573, 117], [562, 130], [558, 128], [532, 108]], 561, 99, { labelRotate: 28, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-first-504-508', '507', [[568, 134], [574, 126], [581, 117], [592, 103], [596, 98], [600, 97], [624, 116], [627, 119], [624, 123], [600, 153], [596, 157], [571, 138]], 597, 127, { labelRotate: 32, labelFontSize: 9 });
  addManualPath(map, 'outfield-table-first-504-508', '508', [[602, 162], [615, 145], [630, 126], [633, 123], [636, 125], [660, 144], [672, 154], [643, 180], [635, 187], [623, 178]], 636, 156, { labelRotate: 36, labelFontSize: 9 });
  addManualPath(map, 'outfield-accessible-third', '좌측 외야', [[273, 55], [305, 36], [322, 64], [291, 84]], 297, 61, { shortLabel: '휠체어', labelRotate: -28, labelFontSize: 10 });
  addManualPath(map, 'outfield-accessible-first', '우측 외야', [[803, 425], [832, 419], [840, 450], [811, 459]], 821, 440, { shortLabel: '휠체어', labelRotate: -12, labelFontSize: 10 });
  addManualPath(map, 'outfield-reserved-third-423-330', '424', [[146, 685], [147, 684], [151, 681], [157, 677], [158, 677], [164, 683], [173, 693], [180, 701], [180, 703], [179, 704], [169, 712], [164, 707], [148, 689], [146, 686]], 164, 696, {
    labelRotate: 55,
    labelFontSize: 7,
    reviewNote: '공식 좌석도 원본 이미지(920x1060) crop x=100..199, y=630..739에서 424 분홍색 셀의 색상 픽셀 외곽을 기준으로 보수적으로 수동 트레이싱했습니다.',
  });

  overrideManualLabel(map, 'third-table-4f-414-330', '420', 263, 805);
  overrideManualLabel(map, 'third-table-4f-414-330', '328', 130, 577);
  overrideManualLabel(map, 'third-table-4f-414-330', '329', 116, 543);

  return map;
}

export const DAEJEON_MANUAL_BLOCK_GEOMETRY: ManualGeometryMap = createDaejeonManualBlockGeometry();

function createOfficialBlockChildren(group: DaejeonBlockGroup): DaejeonBlock[] {
  const officialBlocks = group.officialBlocks.flatMap((officialBlockLabel) => expandOfficialBlockLabel(group, officialBlockLabel));

  return officialBlocks.map((officialBlock, index) => {
    const id = `${group.id}__${normalizeBlockCode(officialBlock.blockCode)}`;
    const manualGeometry = DAEJEON_MANUAL_BLOCK_GEOMETRY[id];
    if (!manualGeometry) {
      throw new Error(`Missing manual Daejeon seat block geometry: ${id}`);
    }

    const officialBlockLabel = officialBlock.officialBlockLabel;
    const isMeasuredFromOfficialImage = manualGeometry.traceStatus === 'OFFICIAL_IMAGE_TRACED'
      && manualGeometry.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE';

    return {
      ...group,
      id,
      parentId: group.id,
      parentBlock: group.block,
      block: officialBlock.blockCode,
      blockCode: officialBlock.blockCode,
      officialBlockLabel,
      segmentationLevel: 'OFFICIAL_BLOCK',
      displayPriority: (group.displayPriority * 1000) + index + 1,
      traceStatus: manualGeometry.traceStatus,
      traceMethod: manualGeometry.traceMethod,
      sourceConfidence: isMeasuredFromOfficialImage ? group.sourceConfidence : 'UNVERIFIED',
      sourceNote: isMeasuredFromOfficialImage ? group.sourceNote : UNMEASURED_GEOMETRY_SOURCE_NOTE,
      officialBlocks: [officialBlockLabel],
      seatViewSections: createSeatViewAliases(group.name, officialBlock.blockCode, [officialBlockLabel], [
        group.block,
        group.officialSectionName,
        ...group.officialBlocks,
        ...group.seatViewSections,
      ]),
      imageGeometry: manualGeometry,
      hitAreaD: manualGeometry.hitAreaD ?? manualGeometry.d,
      reviewNote: manualGeometry.reviewNote,
    };
  });
}

function disambiguateOfficialBlockLabels(blocks: DaejeonBlock[]): DaejeonBlock[] {
  const labelCounts = blocks.reduce<Record<string, number>>((counts, block) => {
    counts[block.officialBlockLabel] = (counts[block.officialBlockLabel] ?? 0) + 1;
    return counts;
  }, {});

  return blocks.map((block) => {
    if ((labelCounts[block.officialBlockLabel] ?? 0) <= 1) {
      return block;
    }

    const originalOfficialBlockLabel = block.officialBlockLabel;
    const officialBlockLabel = `${originalOfficialBlockLabel} (${getDaejeonSideLabel(block.side)})`;

    return {
      ...block,
      officialBlockLabel,
      officialBlocks: [officialBlockLabel],
      seatViewSections: unique([...block.seatViewSections, originalOfficialBlockLabel, officialBlockLabel]),
    };
  });
}

export const DAEJEON_BLOCKS: DaejeonBlock[] = disambiguateOfficialBlockLabels(
  DAEJEON_BLOCK_GROUPS.flatMap(createOfficialBlockChildren),
);

export const DAEJEON_SECTION_COVERAGE: DaejeonSectionCoverage[] = DAEJEON_GROUP_SECTION_COVERAGE.map((coverage) => {
  const blockIds = coverage.blockIds.flatMap((parentId) => (
    DAEJEON_BLOCKS.filter((block) => block.parentId === parentId).map((block) => block.id)
  ));

  return {
    ...coverage,
    blockIds,
    status: blockIds.length > coverage.blockIds.length ? 'SPLIT_ACROSS_BLOCKS' : coverage.status,
    reviewNote: `${coverage.reviewNote} 공식 블록 번호 단위 child hit-area와 연결됩니다.`,
  };
});

function countTraceStatuses(blocks: DaejeonBlock[]): Record<DaejeonTraceStatus, number> {
  return blocks.reduce<Record<DaejeonTraceStatus, number>>((counts, block) => {
    counts[block.traceStatus] += 1;
    return counts;
  }, {
    OFFICIAL_IMAGE_TRACED: 0,
    NEEDS_OPERATOR_REVIEW: 0,
  });
}

const DAEJEON_TRACE_REVIEW_COUNTS = countTraceStatuses(DAEJEON_BLOCKS);

export const DAEJEON_TRACE_REVIEW_SUMMARY: DaejeonTraceReviewSummary = {
  totalGroups: DAEJEON_BLOCK_GROUPS.length,
  totalBlocks: DAEJEON_BLOCKS.length,
  officialImageTraced: DAEJEON_TRACE_REVIEW_COUNTS.OFFICIAL_IMAGE_TRACED,
  needsOperatorReview: DAEJEON_TRACE_REVIEW_COUNTS.NEEDS_OPERATOR_REVIEW,
  pendingByParent: DAEJEON_BLOCK_GROUPS.map((group) => {
    const blocks = DAEJEON_BLOCKS.filter((block) => block.parentId === group.id);
    const counts = countTraceStatuses(blocks);
    const pendingReviewNote = blocks.find((block) => block.traceStatus === 'NEEDS_OPERATOR_REVIEW')?.reviewNote ?? group.sourceNote;

    return {
      parentId: group.id,
      officialSectionName: group.officialSectionName,
      name: group.name,
      block: group.block,
      totalBlocks: blocks.length,
      officialImageTraced: counts.OFFICIAL_IMAGE_TRACED,
      needsOperatorReview: counts.NEEDS_OPERATOR_REVIEW,
      reviewNote: pendingReviewNote,
    };
  }).filter((summary) => summary.needsOperatorReview > 0),
  pendingByOfficialSection: DAEJEON_SECTION_COVERAGE.map((coverage) => {
    const blockIdSet = new Set(coverage.blockIds);
    const blocks = DAEJEON_BLOCKS.filter((block) => blockIdSet.has(block.id));
    const counts = countTraceStatuses(blocks);

    return {
      officialSectionName: coverage.officialSectionName,
      totalBlocks: blocks.length,
      officialImageTraced: counts.OFFICIAL_IMAGE_TRACED,
      needsOperatorReview: counts.NEEDS_OPERATOR_REVIEW,
      coverageStatus: coverage.status,
      reviewNote: coverage.reviewNote,
    };
  }).filter((summary) => summary.needsOperatorReview > 0),
};

const DAEJEON_TRACE_REVIEW_QUEUE_META: Record<string, {
  phase: DaejeonTraceReviewQueuePhase;
  priority: number;
  reason: string;
  operatorAction: string;
}> = {
  'central-reserved-100': {
    phase: 'P0_ANCHOR_RETRACE',
    priority: 10,
    reason: '중앙 100A-100C 상단 띠는 현재 중심점 기반 임시 rect입니다.',
    operatorAction: '공식 920x1060 PNG에서 중앙 지정석 100A/100B/100C 색상 셀 외곽을 각각 직접 path tracing합니다.',
  },
  'catcher-back-100': {
    phase: 'P0_ANCHOR_RETRACE',
    priority: 20,
    reason: '포수 후면석 100A-100C는 현재 중심점 기반 임시 rect입니다.',
    operatorAction: '공식 920x1060 PNG에서 포수 후면석 100A/100B/100C 실제 색상 셀 외곽을 각각 직접 path tracing합니다.',
  },
  'central-accessible': {
    phase: 'P0_ANCHOR_RETRACE',
    priority: 30,
    reason: '중앙 휠체어석은 현재 중심점 기반 임시 rect입니다.',
    operatorAction: '공식 920x1060 PNG의 중앙 휠체어 아이콘/색상 셀 경계를 직접 측정해 보수 path로 교체합니다.',
  },
  'innings-vip-400': {
    phase: 'P0_ANCHOR_RETRACE',
    priority: 40,
    reason: '400 VIP는 path 형식이지만 공식 400 블록 표시 경계와 일치하지 않는 것으로 검수되었습니다.',
    operatorAction: '공식 920x1060 PNG에서 400 VIP 표시 영역을 직접 재측정하고 기존 보수 hit-area를 실제 표시 path로 교체합니다.',
  },
  'first-infield-a-109-112-201-212': {
    phase: 'P1_INFIELD_A_RETRACE',
    priority: 100,
    reason: '1루 내야 지정석A의 다수 child가 중심점/보간 기반 임시 좌표입니다.',
    operatorAction: '공식 920x1060 PNG에서 110-112와 201-212의 색상 셀을 블록 단위로 직접 path tracing합니다.',
  },
  'third-infield-a-113-120-213-225': {
    phase: 'P1_INFIELD_A_RETRACE',
    priority: 120,
    reason: '3루 내야 지정석A의 다수 child가 중심점/보간 기반 임시 좌표입니다.',
    operatorAction: '공식 920x1060 PNG에서 113-114, 116-119, 213-225의 색상 셀을 블록 단위로 직접 path tracing합니다.',
  },
  'outfield-reserved-first-301-404': {
    phase: 'P2_OUTFIELD_RESERVED_RETRACE',
    priority: 200,
    reason: '1루 외야지정석 child는 현재 중심점 기반 임시 rect이며, 같은 공식 번호가 4층 탁자석 traced 블록과 중복되어 섹션 소유 검수가 필요합니다.',
    operatorAction: '공식 920x1060 PNG에서 301/302/401/402/403/404 색상 셀을 직접 비교하고, 4층 탁자석과 외야지정석 중 어느 구역이 해당 공식 셀을 소유하는지 확정한 뒤 path를 반영합니다.',
  },
  'outfield-reserved-third-423-330': {
    phase: 'P2_OUTFIELD_RESERVED_RETRACE',
    priority: 220,
    reason: '3루 외야지정석 child는 현재 중심점 기반 임시 rect이며, 423/327/328/329/330은 4층 탁자석 traced 블록과 공식 번호가 중복됩니다. 424는 공식 PNG 색상 셀 기반 직접 tracing으로 큐에서 제외했습니다.',
    operatorAction: '공식 920x1060 PNG에서 423/327/328/329/330 색상 셀을 직접 비교하고, 4층 탁자석과 외야지정석 중 어느 구역이 해당 공식 셀을 소유하는지 확정한 뒤 path를 반영합니다.',
  },
};

const DEFAULT_DAEJEON_TRACE_REVIEW_QUEUE_META: {
  phase: DaejeonTraceReviewQueuePhase;
  priority: number;
  reason: string;
  operatorAction: string;
} = {
  phase: 'P2_OUTFIELD_RESERVED_RETRACE',
  priority: 900,
  reason: '공식 PNG 직접 측정 전 pending 상태입니다.',
  operatorAction: '공식 920x1060 PNG에서 해당 블록의 실제 색상 셀 외곽을 직접 path tracing합니다.',
};

export const DAEJEON_TRACE_REVIEW_QUEUE: DaejeonTraceReviewQueueItem[] = DAEJEON_BLOCKS
  .filter((block) => block.traceStatus === 'NEEDS_OPERATOR_REVIEW')
  .map((block) => {
    const meta = DAEJEON_TRACE_REVIEW_QUEUE_META[block.parentId] ?? DEFAULT_DAEJEON_TRACE_REVIEW_QUEUE_META;

    return {
      sortOrder: 0,
      phase: meta.phase,
      priority: meta.priority,
      id: block.id,
      parentId: block.parentId,
      officialSectionName: block.officialSectionName,
      name: block.name,
      blockCode: block.blockCode,
      officialBlockLabel: block.officialBlockLabel,
      traceMethod: block.traceMethod,
      reviewNote: block.reviewNote ?? '',
      reason: meta.reason,
      operatorAction: meta.operatorAction,
    };
  })
  .sort((a, b) => (
    a.priority - b.priority
    || a.parentId.localeCompare(b.parentId)
    || a.id.localeCompare(b.id)
  ))
  .map((item, index) => ({ ...item, sortOrder: index + 1 }));

function sanitizeDaejeonEvidenceFilePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const DAEJEON_P2_DEDUPLICATED_ALIAS_INPUTS = [
  ['outfield-reserved-first-301-404', '301', '외야지정석', 'first-table-4f-301-413__301'],
  ['outfield-reserved-first-301-404', '302', '외야지정석', 'first-table-4f-301-413__302'],
  ['outfield-reserved-first-301-404', '401', '외야지정석', 'first-table-4f-301-413__401'],
  ['outfield-reserved-first-301-404', '402', '외야지정석', 'first-table-4f-301-413__402'],
  ['outfield-reserved-first-301-404', '403', '외야지정석', 'first-table-4f-301-413__403'],
  ['outfield-reserved-first-301-404', '404', '외야지정석', 'first-table-4f-301-413__404'],
  ['outfield-reserved-third-423-330', '327', '외야지정석', 'third-table-4f-414-330__327'],
  ['outfield-reserved-third-423-330', '328', '외야지정석', 'third-table-4f-414-330__328'],
  ['outfield-reserved-third-423-330', '329', '외야지정석', 'third-table-4f-414-330__329'],
  ['outfield-reserved-third-423-330', '330', '외야지정석', 'third-table-4f-414-330__330'],
  ['outfield-reserved-third-423-330', '423', '외야지정석', 'third-table-4f-414-330__423'],
] as const;

function getDaejeonDeduplicatedAliasEvidenceCropPath(index: number, retiredBlockId: string, blockCode: string): string {
  return [
    'daejeon-p2-evidence-crops',
    `${String(index + 1).padStart(2, '0')}-${sanitizeDaejeonEvidenceFilePart(blockCode)}-${sanitizeDaejeonEvidenceFilePart(retiredBlockId)}.png`,
  ].join('/');
}

export const DAEJEON_P2_DEDUPLICATED_ALIASES: DaejeonP2DeduplicatedAlias[] = DAEJEON_P2_DEDUPLICATED_ALIAS_INPUTS
  .map(([retiredParentId, blockCode, officialSectionName, canonicalBlockId], index) => {
    const retiredBlockId = `${retiredParentId}__${normalizeBlockCode(blockCode)}`;

    return {
      retiredBlockId,
      retiredParentId,
      blockCode,
      officialSectionName,
      canonicalBlockId,
      reason: '공식 PNG의 같은 blockCode 셀이 canonical 4층 탁자석 traced 블록으로 존재하므로 외야지정석 중복 child를 운영 geometry에서 제거했습니다.',
      evidenceCropPath: getDaejeonDeduplicatedAliasEvidenceCropPath(index, retiredBlockId, blockCode),
    };
  });

export function findDaejeonDeduplicatedAliasByRetiredBlockId(blockId: string): DaejeonP2DeduplicatedAlias | null {
  return DAEJEON_P2_DEDUPLICATED_ALIASES.find((item) => item.retiredBlockId === blockId) ?? null;
}

export const DAEJEON_VIEW_INFO: Record<string, DaejeonViewInfo> = {
  default: { photos: 0, rating: null, distance: '-', notes: '대전 한화생명볼파크 공식 좌석도 기준 구역입니다.', tags: [] },
  'central-reserved-100': {
    photos: 0,
    rating: null,
    distance: '홈플레이트 후면 중앙',
    notes: '중앙 지정석 100A-100C는 포수 후면석보다 한 단 위에서 내야 전체를 정면으로 보는 구역입니다.',
    tags: ['중앙', '프리미엄석', '홈플레이트', '중립'],
  },
  'catcher-back-100': {
    photos: 0,
    rating: null,
    distance: '홈플레이트 최단거리',
    notes: '포수 후면석 100A-100C는 투구와 타석을 가장 가깝게 보는 중앙 프리미엄 구역입니다.',
    tags: ['중앙', '프리미엄석', '포수 후면', '중립'],
  },
  'central-table-100': {
    photos: 0,
    rating: null,
    distance: '중앙 하단 테이블',
    notes: '중앙 탁자석은 홈플레이트 뒤 하단 테이블 구역으로, 좌석 여유와 정면 시야를 함께 기대하는 영역입니다.',
    tags: ['중앙', '테이블석', '하단', '중립'],
  },
  'central-accessible': {
    photos: 0,
    rating: null,
    distance: '중앙 하단 접근성 구역',
    notes: '중앙 휠체어석은 공식 좌석도 중앙 하단 접근성 아이콘 위치를 기준으로 분리한 구역입니다.',
    tags: ['중앙', '휠체어석', '접근성', '중립'],
  },
  'first-infield-b-101-108': {
    photos: 0,
    rating: null,
    distance: '1루 내야 하단',
    notes: '내야 지정석B 101-108은 1루 홈 응원 방향의 하단 내야 구역입니다.',
    tags: ['내야', '내야석', '1루', '홈 응원'],
  },
  'third-infield-b-121-124': {
    photos: 0,
    rating: null,
    distance: '3루 내야 하단',
    notes: '내야 지정석B 121-124는 3루 원정 응원 방향의 하단 내야 구역입니다.',
    tags: ['내야', '내야석', '3루', '원정 응원'],
  },
  'first-infield-a-109-112-201-212': {
    photos: 0,
    rating: null,
    distance: '1루 내야 중단',
    notes: '내야 지정석A 109-112, 201-212는 1루측 넓은 내야 관람 영역을 대표합니다.',
    tags: ['내야', '내야석', '1루', '홈 응원'],
  },
  'third-infield-a-113-120-213-225': {
    photos: 0,
    rating: null,
    distance: '3루 내야 중단',
    notes: '내야 지정석A 113-120, 213-225는 3루측 넓은 내야 관람 영역을 대표합니다.',
    tags: ['내야', '내야석', '3루', '원정 응원'],
  },
  'cass-cheering-200': {
    photos: 0,
    rating: null,
    distance: '1루 응원단 인근',
    notes: '카스존(응원단석) 200은 1루 홈 응원 흐름과 가까운 응원 특화 구역입니다.',
    tags: ['내야', '응원석', '1루', '홈 응원'],
  },
  'first-infield-accessible': {
    photos: 0,
    rating: null,
    distance: '1루 내야 접근성 구역',
    notes: '1루 내야 휠체어석은 공식 좌석도 1루 내야 접근성 아이콘 위치를 기준으로 분리했습니다.',
    tags: ['내야', '휠체어석', '1루', '접근성'],
  },
  'third-infield-accessible': {
    photos: 0,
    rating: null,
    distance: '3루 내야 접근성 구역',
    notes: '3루 내야 휠체어석은 공식 좌석도 3루 내야 접근성 아이콘 위치를 기준으로 분리했습니다.',
    tags: ['내야', '휠체어석', '3루', '접근성'],
  },
  'skybox-s01-s37': {
    photos: 0,
    rating: null,
    distance: '4층 중앙 박스석',
    notes: '스카이박스 S01-S37은 중앙 4층의 독립 관람 구역을 대표합니다.',
    tags: ['특화', '스카이박스', '4층', '중립'],
  },
  'first-table-4f-301-413': {
    photos: 0,
    rating: null,
    distance: '1루 4층 테이블',
    notes: '내야 탁자석(4층) 301-302, 401-413은 1루측 높은 시점에서 내야와 외야를 함께 보는 테이블 구역입니다.',
    tags: ['내야', '테이블석', '1루', '4층'],
  },
  'third-table-4f-414-330': {
    photos: 0,
    rating: null,
    distance: '3루 4층 테이블',
    notes: '내야 탁자석(4층) 414-423, 326-330은 3루측 높은 시점의 테이블 구역입니다.',
    tags: ['내야', '테이블석', '3루', '4층'],
  },
  'innings-vip-400': {
    photos: 0,
    rating: null,
    distance: '1루 4층 VIP',
    notes: '이닝스 VIP 바 & 룸/테라스 400은 1루측 4층 특화 관람 구역입니다.',
    tags: ['특화', '특수석', '1루', 'VIP'],
  },
  'splash-jacuzzi-425': {
    photos: 0,
    rating: null,
    distance: '3루 4층 인피니티 풀',
    notes: '스플래쉬 자쿠지 425는 3루측 특화 수변 관람 구역입니다.',
    tags: ['특화', '풀/카라반', '3루', '자쿠지'],
  },
  'splash-caravan-426': {
    photos: 0,
    rating: null,
    distance: '3루 4층 카라반',
    notes: '스플래쉬 카라반 426은 3루측 인피니티 풀 인근의 특화 관람 구역입니다.',
    tags: ['특화', '풀/카라반', '3루', '카라반'],
  },
  'outfield-reserved-509': {
    photos: 0,
    rating: null,
    distance: '중앙 외야 상단',
    notes: '외야지정석 509는 중앙 외야 뒤쪽에서 경기장을 넓게 보는 구역입니다.',
    tags: ['외야', '외야석', '중앙 외야', '중립'],
  },
  'outfield-lawn-500': {
    photos: 0,
    rating: null,
    distance: '좌측 외야 잔디석',
    notes: '밤켈존(잔디석) 500은 좌측 외야의 잔디 관람 구역입니다.',
    tags: ['외야', '외야석', '잔디석', '중립'],
  },
  'outfield-table-third-501-503': {
    photos: 0,
    rating: null,
    distance: '좌측 외야 테이블',
    notes: '외야탁자석 501-503은 좌측 외야에서 테이블 좌석으로 관람하는 구역입니다.',
    tags: ['외야', '외야석', '테이블', '중립'],
  },
  'outfield-table-first-504-508': {
    photos: 0,
    rating: null,
    distance: '우측 외야 테이블',
    notes: '외야탁자석 504-508은 우측 외야에서 테이블 좌석으로 관람하는 구역입니다.',
    tags: ['외야', '외야석', '테이블', '중립'],
  },
  'outfield-accessible-third': {
    photos: 0,
    rating: null,
    distance: '좌측 외야 접근성 구역',
    notes: '좌측 외야 휠체어석은 공식 좌석도 좌측 외야 접근성 아이콘 위치를 기준으로 분리했습니다.',
    tags: ['외야', '휠체어석', '접근성', '중립'],
  },
  'outfield-accessible-first': {
    photos: 0,
    rating: null,
    distance: '우측 외야 접근성 구역',
    notes: '우측 외야 휠체어석은 공식 좌석도 우측 외야 접근성 아이콘 위치를 기준으로 분리했습니다.',
    tags: ['외야', '휠체어석', '접근성', '중립'],
  },
  'outfield-reserved-first-301-404': {
    photos: 0,
    rating: null,
    distance: '우측 외야 지정석',
    notes: '외야지정석 301-302, 401-404는 우측 외야 라인 쪽 지정석을 대표합니다.',
    tags: ['외야', '외야석', '우측 외야', '중립'],
  },
  'outfield-reserved-third-423-330': {
    photos: 0,
    rating: null,
    distance: '좌측 외야 지정석',
    notes: '외야지정석 423-424, 327-330은 좌측 외야 라인 쪽 지정석을 대표합니다.',
    tags: ['외야', '외야석', '좌측 외야', '중립'],
  },
};

export function getDaejeonSideLabel(side: DaejeonSide): string {
  if (side === 'FIRST_BASE') return '1루';
  if (side === 'THIRD_BASE') return '3루';
  if (side === 'OUTFIELD') return '외야';
  return '중앙';
}

export function getDaejeonFanRoleLabel(role: DaejeonFanRole): string {
  if (role === 'HOME') return '홈 응원';
  if (role === 'AWAY') return '원정 응원';
  return '중립';
}

export function getDaejeonZoneGroupLabel(zoneGroup: DaejeonZoneGroup): string {
  if (zoneGroup === 'CENTER') return '중앙';
  if (zoneGroup === 'INFIELD') return '내야';
  if (zoneGroup === 'OUTFIELD') return '외야';
  return '특화';
}

export function getDaejeonSourceLabel(confidence: DaejeonSourceConfidence): string {
  return confidence === 'OFFICIAL' ? '공식 확인' : '공식 확인 필요';
}

export function getDaejeonTraceStatusLabel(traceStatus: DaejeonTraceStatus): string {
  return traceStatus === 'OFFICIAL_IMAGE_TRACED' ? '공식 이미지 트레이싱' : '운영자 재검수 필요';
}

export function getDaejeonTraceMethodLabel(traceMethod: DaejeonTraceMethod): string {
  if (traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE') return '공식 이미지 path tracing';
  if (traceMethod === 'APPROX_CENTER_RECT') return '중심점 기반 임시 rect';
  return '보간 경로 기반 임시 rect';
}

export function isDaejeonSelectableSeatBlock(block: DaejeonBlock): boolean {
  return block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
    && block.sourceConfidence === 'OFFICIAL';
}

export function getDaejeonCoverageStatusLabel(status: DaejeonSectionCoverageStatus): string {
  return status === 'REPRESENTATIVE_TRACED' ? '대표 영역 검수' : '분할 영역 검수';
}

export function findDaejeonParentBlockGroup(parentId: string): DaejeonBlockGroup | null {
  return DAEJEON_BLOCK_GROUPS.find((group) => group.id === parentId) ?? null;
}

export function findDaejeonSectionCoverageByBlock(blockId: string): DaejeonSectionCoverage | null {
  return DAEJEON_SECTION_COVERAGE.find((coverage) => coverage.blockIds.includes(blockId)) ?? null;
}

export function getDaejeonViewInfo(block: DaejeonBlock): DaejeonViewInfo {
  return DAEJEON_VIEW_INFO[block.id]
    ?? DAEJEON_VIEW_INFO[block.parentId]
    ?? DAEJEON_VIEW_INFO.default;
}
