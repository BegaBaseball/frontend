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
  { id: 'all', label: '전체', cats: null },
  { id: 'cheer', label: '응원석', cats: ['CHEERING'] },
  { id: 'premium', label: '프리미엄', cats: ['PREMIUM', 'TABLE'] },
  { id: 'infield', label: '내야석', cats: ['INFIELD'] },
  { id: 'sky', label: '스카이', cats: ['SKY'] },
  { id: 'outfield', label: '외야석', cats: ['OUTFIELD'] },
  { id: 'special', label: '특수석', cats: ['SPECIAL', 'EXCITING'] },
  { id: 'accessible', label: '휠체어석', cats: ['ACCESSIBLE'] },
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
    `이글스파크 ${name}`,
    block,
    ...officialBlocks,
    ...extra,
  ]);
}

function createBlock(input: Omit<
  DaejeonBlockGroup,
  'officialSectionName' | 'zoneGroup' | 'displayPriority' | 'traceStatus' | 'sourceConfidence' | 'sourceNote' | 'seatViewSections' | 'imageGeometry'
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
    officialBlocks: ['외야지정석 301-302', '외야지정석 401-404'],
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
    officialBlocks: ['외야지정석 423-424', '외야지정석 327-330'],
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

function createDaejeonManualBlockGeometry(): ManualGeometryMap {
  const map: ManualGeometryMap = {};

  addManualCenters(map, 'central-reserved-100', ['100A', '100B', '100C'], [
    [515, 682],
    [442, 682],
    [369, 682],
  ], 48, 24, 0, 9);
  addManualCenters(map, 'catcher-back-100', ['100A', '100B', '100C'], [
    [523, 716],
    [442, 720],
    [361, 716],
  ], 58, 28, 0, 9);
  addManualPath(map, 'central-table-100', '100A', [[494, 747], [600, 747], [639, 804], [527, 839], [507, 804]], 575, 815, { labelFontSize: 9 });
  addManualPath(map, 'central-table-100', '100B', [[386, 747], [494, 747], [527, 839], [360, 839], [386, 804]], 442, 802, { labelFontSize: 9 });
  addManualPath(map, 'central-table-100', '100C', [[282, 747], [386, 747], [360, 839], [245, 804]], 341, 783, { labelFontSize: 9 });
  addManualRect(map, 'central-accessible', '중앙', 446, 829, 28, 24, 0, 11, '중앙');

  addManualPath(map, 'first-infield-b-101-108', '101', [[685, 385], [695, 373], [711, 356], [709, 383], [703, 384], [689, 386]], 700, 375, { labelRotate: -18, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '102', [[651, 422], [661, 411], [672, 399], [680, 391], [694, 389], [713, 387], [716, 406], [715, 413], [693, 417], [654, 423]], 687, 406, { labelRotate: -10, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '103', [[613, 463], [637, 436], [644, 429], [647, 428], [709, 420], [724, 420], [727, 444], [726, 453], [673, 471], [648, 468]], 674, 445, { labelRotate: -7, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '104', [[613, 486], [616, 478], [619, 471], [620, 469], [623, 469], [668, 476], [673, 477], [717, 506], [718, 507], [711, 523], [708, 529], [706, 530], [685, 521], [618, 491]], 665, 497, { labelRotate: -12, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '105', [[596, 520], [608, 496], [612, 494], [700, 533], [705, 537], [693, 564], [690, 564], [609, 527]], 650, 528, { labelRotate: -18, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '106', [[580, 551], [591, 529], [594, 526], [658, 555], [684, 567], [672, 593], [664, 590], [580, 552]], 631, 559, { labelRotate: -19, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '107', [[571, 568], [576, 559], [579, 557], [659, 593], [676, 601], [666, 625], [661, 633], [642, 620], [583, 579]], 627, 594, { labelRotate: -22, labelFontSize: 9 });
  addManualPath(map, 'first-infield-b-101-108', '108', [[565, 598], [579, 583], [653, 637], [641, 644], [640, 652], [634, 657], [566, 602]], 591, 620, { labelRotate: -24, labelFontSize: 9 });
  addManualCenters(map, 'third-infield-b-121-124', ['121', '122', '123', '124'], [
    [209, 486, 5],
    [196, 446, 6],
    [181, 407, 8],
    [165, 371, 12],
  ], 58, 27, 0, 9);
  addManualPath(map, 'third-infield-b-121-124', '121', [[162, 472], [163, 453], [169, 453], [204, 457], [204, 463], [203, 470], [198, 471], [192, 472], [167, 476], [163, 476]], 197, 469, { labelRotate: 5, labelFontSize: 9 });
  addManualPath(map, 'third-infield-b-121-124', '122', [[163, 442], [165, 423], [169, 423], [180, 424], [222, 428], [240, 430], [267, 458], [260, 460], [234, 464], [214, 467], [165, 449]], 215, 445, { labelRotate: 6, labelFontSize: 9 });
  addManualPath(map, 'third-infield-b-121-124', '123', [[165, 411], [166, 393], [168, 391], [202, 394], [208, 395], [236, 424], [225, 424], [194, 421], [174, 419], [165, 418]], 197, 409, { labelRotate: 8, labelFontSize: 9 });
  addManualPath(map, 'third-infield-b-121-124', '124', [[167, 384], [168, 371], [171, 355], [181, 365], [203, 389], [202, 390], [172, 387], [167, 386]], 183, 377, { labelRotate: 12, labelFontSize: 9 });

  addManualCenters(map, 'first-infield-a-109-112-201-212', ['109', '110', '111', '112'], [
    [617, 676, -23],
    [588, 722, -27],
    [557, 760, -31],
    [521, 795, -35],
  ], 58, 31, 0, 9);
  addManualPath(map, 'first-infield-a-109-112-201-212', '109', [[543, 624], [563, 603], [635, 662], [637, 667], [617, 688]], 617, 676, { labelRotate: -23, labelFontSize: 9 });
  addManualPolyline(map, 'first-infield-a-109-112-201-212', numericBlockCodes(201, 212), [
    [768, 443],
    [734, 535],
    [689, 635],
    [628, 734],
    [535, 821],
  ], 34, 18, 8, 90);
  addManualCenters(map, 'third-infield-a-113-120-213-225', numericBlockCodes(113, 120), [
    [369, 776, 35],
    [331, 738, 31],
    [301, 697, 28],
    [274, 654, 25],
    [249, 609, 23],
    [226, 564, 21],
    [204, 519, 18],
    [181, 478, 15],
  ], 58, 30, 0, 9);
  addManualPath(map, 'third-infield-a-113-120-213-225', '115', [[253, 660], [319, 604], [324, 606], [339, 624], [335, 629], [289, 668], [272, 681], [268, 678]], 298, 641, { labelRotate: 28, labelFontSize: 9 });
  addManualPath(map, 'third-infield-a-113-120-213-225', '120', [[190, 530], [232, 510], [286, 490], [302, 516], [260, 540], [198, 565]], 241, 524, { labelRotate: 15, labelFontSize: 9 });
  addManualPolyline(map, 'third-infield-a-113-120-213-225', numericBlockCodes(213, 225), [
    [394, 815],
    [330, 766],
    [278, 696],
    [235, 610],
    [194, 508],
    [142, 397],
  ], 34, 18, 8, 90);

  addManualPath(map, 'cass-cheering-200', '200', [[730, 396], [755, 376], [759, 374], [761, 384], [767, 444], [758, 446], [740, 448], [731, 412]], 749, 415, { labelRotate: -9, labelFontSize: 9 });
  addManualPath(map, 'first-infield-accessible', '1루 내야', [[690, 583], [725, 570], [736, 607], [704, 625]], 713, 598, { shortLabel: '휠체어', labelFontSize: 10 });
  addManualPath(map, 'third-infield-accessible', '3루 내야', [[149, 582], [184, 568], [197, 607], [164, 625]], 173, 598, { shortLabel: '휠체어', labelFontSize: 10 });

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
    ['S01', [[764, 533], [770, 526], [780, 532], [777, 536], [776, 534], [767, 536]], 772, 531, 198],
    ['S02', [[760, 542], [768, 541], [768, 543], [775, 544], [768, 551], [766, 548], [761, 548]], 767, 546, 198],
    ['S03', [[754, 556], [757, 554], [756, 551], [760, 550], [760, 552], [767, 553], [769, 557], [755, 559]], 761, 554, 198],
    ['S04', [[748, 569], [751, 565], [752, 567], [755, 565], [763, 567], [762, 573], [758, 575]], 755, 570, 198],
    ['S05', [[738, 591], [754, 588], [748, 599], [740, 596]], 746, 593, 198],
    ['S06', [[733, 602], [739, 598], [748, 604], [745, 609], [744, 606], [740, 606], [739, 609], [738, 606], [733, 608]], 740, 603, 205],
    ['S07', [[727, 616], [730, 613], [740, 614], [742, 617], [739, 619], [740, 622], [736, 623], [734, 620], [729, 620]], 734, 618, 205],
    ['S08', [[722, 627], [728, 622], [732, 626], [735, 625], [737, 629], [728, 632], [728, 630], [723, 631]], 729, 627, 205],
    ['S09', [[717, 638], [729, 637], [732, 640], [725, 647], [723, 644], [718, 644]], 724, 642, 205],
    ['S10', [[703, 664], [706, 661], [708, 663], [720, 662], [716, 670], [710, 670]], 711, 665, 205],
    ['S11', [[692, 678], [700, 670], [703, 670], [707, 676], [709, 675], [707, 680]], 700, 675, 205],
    ['S12', [[667, 707], [672, 704], [673, 708], [682, 706], [683, 709], [679, 712], [680, 714], [676, 715]], 675, 709, 205],
    ['S13', [[656, 720], [658, 721], [664, 713], [669, 714], [673, 719], [670, 724], [668, 721], [659, 723]], 664, 718, 223],
    ['S14', [[649, 730], [652, 727], [658, 730], [660, 729], [658, 724], [661, 724], [661, 730], [665, 729], [665, 732], [657, 739]], 657, 731, 223],
    ['S15', [[640, 739], [647, 734], [653, 740], [655, 739], [655, 742], [650, 747], [648, 742], [641, 744]], 647, 740, 223],
    ['S16', [[630, 751], [637, 745], [638, 751], [641, 749], [645, 751], [647, 746], [648, 752], [641, 757], [641, 760], [638, 760]], 639, 752, 223],
    ['S17', [[613, 771], [617, 769], [619, 772], [628, 771], [629, 773], [624, 777], [625, 779], [620, 781], [613, 775]], 621, 775, 223],
    ['S18', [[564, 806], [565, 803], [570, 802], [572, 804], [570, 808], [578, 806], [582, 808], [570, 814]], 573, 808, 246],
    ['S19', [[537, 819], [543, 816], [544, 822], [552, 822], [552, 814], [548, 816], [548, 812], [558, 807], [564, 817], [564, 820], [559, 822], [559, 816], [554, 814], [554, 824], [545, 828], [541, 828]], 556.5, 811.5, 246],
    ['S20', [[522, 825], [535, 819], [534, 822], [539, 830], [533, 834], [531, 825], [527, 828], [526, 825], [523, 827]], 535, 829, 246],
    ['S21', [[511, 831], [515, 827], [519, 830], [518, 834], [528, 832], [529, 835], [516, 840]], 515, 831.5, 246],
    ['S22', [[485, 837], [490, 835], [492, 843], [503, 843], [504, 835], [495, 837], [495, 834], [504, 831], [509, 834], [508, 838], [511, 842], [489, 849]], 506.5, 840.5, 246],
    ['S23', [[467, 841], [481, 838], [483, 851], [476, 850], [479, 848], [476, 842], [472, 844]], 479, 842, 269],
    ['S24', [[458, 841], [466, 840], [466, 843], [462, 844], [465, 847], [462, 848], [465, 851], [470, 849], [472, 852], [459, 853]], 461, 850.5, 269],
    ['S25', [[429, 843], [453, 843], [453, 853], [429, 854]], 441, 848, 269],
    ['S26', [[398, 846], [400, 845], [399, 839], [416, 840], [415, 843], [403, 842], [404, 847], [402, 848], [405, 852], [399, 850]], 401.5, 846, 269],
    ['S27', [[370, 839], [375, 830], [381, 834], [394, 836], [395, 840], [389, 849], [382, 845], [386, 843], [388, 845], [390, 837], [376, 836], [373, 844]], 392, 839.5, 269],
    ['S28', [[352, 835], [363, 835], [361, 833], [364, 831], [363, 828], [368, 828], [368, 835], [363, 841]], 362, 837.5, -65],
    ['S29', [[342, 830], [347, 821], [360, 826], [348, 827], [349, 832], [346, 834]], 345.5, 829.5, -65],
    ['S30', [[326, 821], [336, 823], [339, 820], [337, 816], [343, 819], [337, 830], [327, 825]], 334, 823, -65],
    ['S31', [[316, 817], [323, 808], [333, 812], [333, 816], [323, 814], [321, 821]], 324, 814, -65],
    ['S32', [[294, 802], [300, 793], [311, 800], [310, 802], [300, 800], [299, 805], [295, 805]], 302, 799, -65],
    ['S33', [[272, 785], [279, 777], [282, 777], [290, 786], [279, 785], [277, 789], [274, 789]], 281, 783, -65],
    ['S34', [[261, 773], [267, 771], [272, 773], [273, 769], [276, 774], [267, 781]], 268, 775, -43],
    ['S35', [[236, 745], [247, 738], [246, 740], [254, 747], [241, 746], [238, 748]], 245, 743, -43],
    ['S36', [[220, 725], [229, 719], [235, 727], [225, 727], [223, 730]], 227, 724, -43],
    ['S37', [[170, 666], [178, 660], [185, 669], [175, 668], [172, 671]], 177, 665, -43],
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
  addManualPath(map, 'first-table-4f-301-413', '301', [[766, 461], [791, 451], [795, 489], [766, 489]], 782, 469, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '302', [[766, 491], [798, 491], [790, 523], [754, 519]], 777, 505, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '401', [[806, 461], [828, 462], [828, 493], [806, 490]], 817, 475, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '402', [[798, 498], [830, 500], [823, 532], [792, 527]], 811, 515, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '403', [[787, 531], [824, 533], [812, 574], [774, 568]], 790, 546, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '404', [[775, 572], [814, 577], [799, 623], [758, 616]], 777, 588, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '405', [[745, 619], [805, 628], [792, 660], [730, 653], [738, 635]], 744, 640, { labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '406', [[727, 675], [741, 644], [792, 662], [778, 701], [727, 678]], 735, 675, { labelRotate: -18, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '407', [[703, 703], [722, 683], [721, 681], [725, 680], [775, 706], [773, 705], [774, 707], [747, 736]], 715, 710, { labelRotate: -22, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '408', [[677, 732], [701, 707], [744, 739], [720, 765], [677, 735]], 690, 735, { labelRotate: -30, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '409', [[650, 764], [675, 739], [719, 770], [693, 797]], 665, 775, { labelRotate: -34, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '410', [[624, 794], [648, 768], [693, 801], [666, 829]], 630, 790, { labelRotate: -38, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '411', [[594, 818], [622, 797], [665, 832], [635, 865]], 605.9, 811.7, { labelRotate: -42, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '412', [[564, 838], [592, 820], [633, 867], [597, 890]], 583, 831.8, { labelRotate: -42, labelFontSize: 6 });
  addManualPath(map, 'first-table-4f-301-413', '413', [[526, 855], [561, 839], [595, 893], [550, 912]], 560, 852, { labelRotate: -42, labelFontSize: 6 });
  addManualPolyline(map, 'third-table-4f-414-330', numericBlockCodes(414, 423), [
    [500, 874],
    [420, 878],
    [335, 852],
    [260, 795],
    [202, 717],
    [162, 636],
  ], 34, 22, 8, 90);
  addManualPath(map, 'third-table-4f-414-330', '414', [[485, 864], [521, 855], [546, 912], [521, 921], [497, 924]], 500, 874, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '415', [[443, 869], [481, 865], [492, 927], [443, 929]], 450, 876.5, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '416', [[388, 924], [400, 864], [439, 867], [439, 930], [409, 929]], 400.8, 872.1, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '417', [[336, 909], [360, 854], [395, 864], [385, 924], [348, 916], [336, 912]], 350, 880, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '418', [[317, 835], [360, 848], [337, 911], [278, 893], [294, 851]], 325, 875, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '419', [[268, 823], [316, 837], [294, 854], [282, 883], [257, 876], [281, 846], [266, 841]], 289, 837, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '420', [[238, 787], [283, 800], [286, 821], [252, 818], [235, 803]], 263, 805, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '421', [[221, 763], [260, 775], [256, 800], [218, 787]], 241, 783, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '422', [[194, 736], [234, 748], [228, 774], [188, 761]], 212, 754, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '423', [[166, 706], [207, 718], [209, 744], [178, 759], [160, 735]], 184, 733, { labelFontSize: 8 });
  addManualCenters(map, 'third-table-4f-414-330', numericBlockCodes(326, 330), [
    [151, 647, 76],
    [132, 608, 76],
    [116, 566, 76],
    [103, 523, 76],
    [91, 482, 76],
  ], 30, 22, 0, 8);
  addManualPath(map, 'third-table-4f-414-330', '326', [[130, 623], [160, 616], [170, 650], [137, 664]], 151, 643, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '327', [[119, 592], [150, 586], [161, 616], [128, 626]], 141, 608, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '328', [[109, 561], [140, 554], [151, 586], [119, 595]], 130, 577, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '329', [[96, 527], [128, 520], [139, 552], [106, 561]], 116, 543, { labelFontSize: 8 });
  addManualPath(map, 'third-table-4f-414-330', '330', [[84, 489], [116, 483], [127, 514], [95, 525], [87, 511]], 103, 505, { labelFontSize: 8 });

  addManualPath(map, 'innings-vip-400', '400', [[838, 500], [866, 510], [846, 608], [818, 598]], 851, 571, {
    shortLabel: 'VIP',
    labelRotate: -77,
    labelFontSize: 8,
    traceStatus: 'NEEDS_OPERATOR_REVIEW',
    reviewNote: 'NEEDS_OPERATOR_REVIEW: 현재 path는 과대 선택 회피용 보수 hit-area에 가깝고 공식 400 블록 표시 경계와 일치하지 않아 재측정이 필요합니다.',
  });
  addManualPath(map, 'splash-jacuzzi-425', '425', [[83, 671], [119, 657], [129, 697], [94, 716]], 104, 676, { shortLabel: '자쿠지', labelRotate: -17, labelFontSize: 8 });
  addManualPath(map, 'splash-caravan-426', '426', [[57, 585], [88, 575], [98, 608], [69, 622]], 83, 595, { shortLabel: '카라반', labelRotate: -17, labelFontSize: 8 });

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
  addManualCenters(map, 'outfield-reserved-first-301-404', ['301', '302', '401', '402', '403', '404'], [
    [814, 421, -75],
    [813, 463, -75],
    [855, 424, -75],
    [842, 468, -75],
    [829, 512, -75],
    [814, 555, -75],
  ], 30, 24, 0, 8);
  addManualCenters(map, 'outfield-reserved-third-423-330', ['423', '424', '327', '328', '329', '330'], [
    [119, 742, 75],
    [102, 704, 75],
    [137, 651, 75],
    [120, 608, 75],
    [105, 565, 75],
    [91, 522, 75],
  ], 30, 23, 0, 8);

  overrideManualLabel(map, 'first-infield-a-109-112-201-212', '205', 695, 599);
  overrideManualLabel(map, 'first-infield-a-109-112-201-212', '209', 624, 737);
  overrideManualLabel(map, 'first-infield-a-109-112-201-212', '211', 566, 792);
  overrideManualLabel(map, 'third-infield-a-113-120-213-225', '113', 370, 775);
  overrideManualLabel(map, 'third-infield-a-113-120-213-225', '116', 276, 654);
  overrideManualLabel(map, 'third-infield-a-113-120-213-225', '120', 241, 524);
  overrideManualLabel(map, 'third-table-4f-414-330', '420', 263, 805);
  overrideManualLabel(map, 'third-table-4f-414-330', '328', 130, 577);
  overrideManualLabel(map, 'third-table-4f-414-330', '329', 116, 543);
  overrideManualLabel(map, 'outfield-reserved-third-423-330', '424', 107, 709);

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
      hitAreaD: manualGeometry.d,
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
