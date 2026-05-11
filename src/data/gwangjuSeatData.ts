// Gwangju-KIA Champions Field seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type GwangjuSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type GwangjuFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type GwangjuLevel = '1F' | '2F' | '3F' | '4F' | '5F' | 'OUTFIELD';
export type GwangjuSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type GwangjuSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';
export type GwangjuTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'NEEDS_OPERATOR_REVIEW';
export type GwangjuTraceMethod = 'PATH_TRACED_FROM_OFFICIAL_IMAGE';
export type GwangjuTraceSource = 'OFFICIAL_PNG_MANUAL_POLYGON';
export type GwangjuPixelAlignmentStatus = 'PIXEL_ALIGNED' | 'MANUAL_REVIEW_REQUIRED';

export interface GwangjuImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
  traceStatus: GwangjuTraceStatus;
  traceMethod: GwangjuTraceMethod;
  traceSource: GwangjuTraceSource;
  traceVersion: string;
  manualReviewed: boolean;
  pixelAlignmentStatus: GwangjuPixelAlignmentStatus;
  manualReviewNote?: string;
}

export interface GwangjuNonSelectableMarkerZone {
  id: string;
  label: string;
  markerLabel: 'M' | 'N';
  cx: number;
  cy: number;
  r: number;
}

export type GwangjuImageGeometryDraft = Omit<GwangjuImageGeometry, 'shortLabel'> & {
  shortLabel?: string;
};

export interface GwangjuPoint {
  x: number;
  y: number;
}

export interface GwangjuBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GwangjuOfficialTraceReference {
  numberAnchor: GwangjuPoint;
  expectedBounds: GwangjuBounds;
  expectedSubpathCount: number;
}

export interface GwangjuSeatMapImage {
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: GwangjuSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface GwangjuSeatMapViewport {
  cropX: number;
  cropWidth: number;
}

export interface GwangjuBlock {
  id: string;
  level: GwangjuLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: GwangjuSide;
  fanRole: GwangjuFanRole;
  sourceConfidence: GwangjuSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: GwangjuImageGeometry;
  accessibilityNote?: string;
}

export interface GwangjuCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface GwangjuViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface GwangjuCategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
  fanRoles?: GwangjuFanRole[] | null;
}

export interface GwangjuOperatorSectionRequirement {
  id: string;
  category: 'K7' | 'AWAY';
  name: string;
  manualReferenceUrl: string;
  coordinateSystem: {
    imageWidth: number;
    imageHeight: number;
  };
  requiredFields: string[];
  status: 'PENDING_OPERATOR_INPUT' | 'READY';
}

export interface GwangjuDerivedOperatorBlockRange {
  id: string;
  label: string;
  sourceRequirementIds: string[];
  officialBlocks: string[];
  displayBlocks: string;
  blockIds: string[];
  filterGroupId: string;
  fanRoles: GwangjuFanRole[] | null;
  aggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY';
  operatorPolygonStatus: 'PENDING_OPERATOR_INPUT';
}

export type GwangjuCoordinateTraceStatus = 'RETRACE_IN_PROGRESS' | 'READY';
export type GwangjuTraceReviewPriority = 'P0' | 'P1' | 'P2';
export type GwangjuTraceReviewMethod = 'OFFICIAL_IMAGE_PIXEL_TRACE' | 'OPERATOR_REQUIRED';

export interface GwangjuTraceReviewRegion {
  id: string;
  label: string;
  priority: GwangjuTraceReviewPriority;
  blockIds: string[];
  method: GwangjuTraceReviewMethod;
  note: string;
}

export interface GwangjuTraceReviewSummary {
  totalBlocks: number;
  officialImageTraced: number;
  needsOperatorReview: number;
  directOfficialTrace: number;
  manualReviewed: number;
  unreviewedBlocks: number;
  pixelAligned: number;
  manualReviewRequired: number;
}

type GwangjuBlockDefinition = Omit<GwangjuBlock, 'imageGeometry' | 'sourceConfidence' | 'sourceNote' | 'seatViewSections'> & {
  sourceConfidence?: GwangjuSourceConfidence;
  sourceNote?: string;
  seatViewSections?: string[];
};

export const GWANGJU_SEATMAP_IMAGE: GwangjuSeatMapImage = {
  imagePath: 'src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png',
  imageWidth: 2200,
  imageHeight: 1159,
  sourceLabel: 'KIA 타이거즈 공식 광주-기아 챔피언스필드 경기장 안내',
  sourceUrl: null,
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'gwangju-kia-seatmap-official-2026.png',
};

export const GWANGJU_MYSEATCHECK_REFERENCE_URL = 'https://myseatcheck.com/%EA%B4%91%EC%A3%BC-kia-%EC%B1%94%ED%94%BC%EC%96%B8%EC%8A%A4%ED%95%84%EB%93%9C/';

export const GWANGJU_SEATMAP_VIEWPORT: GwangjuSeatMapViewport = {
  cropX: 0,
  cropWidth: 1640,
};

export const GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE = true;
export const GWANGJU_OPERATOR_BLOCK_RANGE_REVIEWED_AT = '2026-05-11';
export const GWANGJU_K7_OFFICIAL_BLOCKS = ['107', '108', '109', '110', '111', '118', '119', '120', '121', '122'];
export const GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS = ['107', '108', '109', '110'];
export const GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS = ['118', '119', '120', '121', '122'];

export const GWANGJU_OPERATOR_SECTION_REQUIREMENTS: GwangjuOperatorSectionRequirement[] = [
  {
    id: 'home-k7-seats',
    category: 'K7',
    name: 'K7석',
    manualReferenceUrl: GWANGJU_MYSEATCHECK_REFERENCE_URL,
    coordinateSystem: {
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    },
    requiredFields: ['officialBlocks', 'level', 'side', 'fanRole', 'points', 'labelX', 'labelY', 'shortLabel', 'reviewer', 'reviewedAt'],
    status: 'PENDING_OPERATOR_INPUT',
  },
  {
    id: 'away-cheering-seats',
    category: 'AWAY',
    name: '원정응원석',
    manualReferenceUrl: GWANGJU_MYSEATCHECK_REFERENCE_URL,
    coordinateSystem: {
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
    },
    requiredFields: ['officialBlocks', 'level', 'side', 'fanRole', 'points', 'labelX', 'labelY', 'shortLabel', 'reviewer', 'reviewedAt'],
    status: 'PENDING_OPERATOR_INPUT',
  },
];

export const GWANGJU_PENDING_OPERATOR_SECTIONS: string[] = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
  .filter((section) => section.status === 'PENDING_OPERATOR_INPUT')
  .map((section) => section.name);
export const GWANGJU_SEATMAP_COORDINATES_READY = GWANGJU_PENDING_OPERATOR_SECTIONS.length === 0;
export const GWANGJU_COORDINATE_TRACE_STATUS: GwangjuCoordinateTraceStatus = 'READY';
export const GWANGJU_BASE_TRACE_BLOCK_COUNT = 111;
export const GWANGJU_EXPECTED_TRACE_BLOCK_COUNT = GWANGJU_BASE_TRACE_BLOCK_COUNT
  + (GWANGJU_SEATMAP_COORDINATES_READY ? GWANGJU_OPERATOR_SECTION_REQUIREMENTS.length : 0);
export const GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS = GWANGJU_K7_OFFICIAL_BLOCKS.map((block) => blockId('K7', block));
export const GWANGJU_AWAY_CHEERING_BLOCK_IDS = GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS.map((block) => blockId('K7', block));
export const GWANGJU_HOME_CHEERING_BLOCK_IDS = GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS.map((block) => blockId('K7', block));
export const GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES: GwangjuDerivedOperatorBlockRange[] = [
  {
    id: 'derived-k7-seats',
    label: 'K7석',
    sourceRequirementIds: ['home-k7-seats'],
    officialBlocks: GWANGJU_K7_OFFICIAL_BLOCKS,
    displayBlocks: '107~111, 118~122',
    blockIds: GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
    filterGroupId: 'k7',
    fanRoles: null,
    aggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY',
    operatorPolygonStatus: 'PENDING_OPERATOR_INPUT',
  },
  {
    id: 'derived-away-cheering-seats',
    label: '원정응원석',
    sourceRequirementIds: ['away-cheering-seats'],
    officialBlocks: GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS,
    displayBlocks: '107~110',
    blockIds: GWANGJU_AWAY_CHEERING_BLOCK_IDS,
    filterGroupId: 'away-cheering',
    fanRoles: ['AWAY'],
    aggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY',
    operatorPolygonStatus: 'PENDING_OPERATOR_INPUT',
  },
  {
    id: 'derived-home-cheering-seats',
    label: '홈 응원석',
    sourceRequirementIds: ['home-k7-seats'],
    officialBlocks: GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS,
    displayBlocks: '118~122',
    blockIds: GWANGJU_HOME_CHEERING_BLOCK_IDS,
    filterGroupId: 'home-cheering',
    fanRoles: ['HOME'],
    aggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY',
    operatorPolygonStatus: 'PENDING_OPERATOR_INPUT',
  },
];

export function getGwangjuDerivedOperatorRangesForBlock(blockId: string): GwangjuDerivedOperatorBlockRange[] {
  return GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.filter((range) => range.blockIds.includes(blockId));
}

const GWANGJU_OPERATOR_TRACE_REVIEW_METHOD: GwangjuTraceReviewMethod = GWANGJU_SEATMAP_COORDINATES_READY
  ? 'OFFICIAL_IMAGE_PIXEL_TRACE'
  : 'OPERATOR_REQUIRED';

export const GWANGJU_CATEGORIES: Record<string, GwangjuCategory> = {
  CHAMPION:     { label: '챔피언석',       light: '#C7A04B', dark: '#D8B765', textLight: '#713F12', textDark: '#FEF3C7' },
  CENTRAL_TABLE:{ label: '중앙 테이블석',  light: '#7C3AED', dark: '#9B6AF3', textLight: '#4C1D95', textDark: '#EDE9FE' },
  TABLE:        { label: '테이블석',       light: '#8B5CF6', dark: '#A78BFA', textLight: '#4C1D95', textDark: '#EDE9FE' },
  SKYBOX:       { label: '스카이박스',     light: '#D94695', dark: '#F472B6', textLight: '#831843', textDark: '#FCE7F3' },
  SKY_PICNIC:   { label: '스카이피크닉석', light: '#EC4899', dark: '#F9A8D4', textLight: '#831843', textDark: '#FCE7F3' },
  PARTY:        { label: '4층파티석',      light: '#F59E8B', dark: '#FDA4AF', textLight: '#7F1D1D', textDark: '#FFE4E6' },
  FIVE_TABLE:   { label: '5층 테이블석',   light: '#6D3A8C', dark: '#8B5FBF', textLight: '#3B0764', textDark: '#F3E8FF' },
  K8:           { label: 'K8석',           light: '#F9C74F', dark: '#FACC15', textLight: '#713F12', textDark: '#FEF3C7' },
  K9:           { label: 'K9석',           light: '#315783', dark: '#4D75A4', textLight: '#172554', textDark: '#DBEAFE' },
  K7:           { label: 'K7석',           light: '#EA0029', dark: '#F43F5E', textLight: '#7F1D1D', textDark: '#FECACA' },
  K5:           { label: 'K5석',           light: '#2563EB', dark: '#60A5FA', textLight: '#1E3A8A', textDark: '#DBEAFE' },
  K3:           { label: 'K3석',           light: '#64748B', dark: '#94A3B8', textLight: '#1E293B', textDark: '#F1F5F9' },
  SURPRISE:     { label: '서프라이즈존',   light: '#F97316', dark: '#FB923C', textLight: '#7C2D12', textDark: '#FFEDD5' },
  OUTFIELD:     { label: '외야석',         light: '#16A34A', dark: '#4ADE80', textLight: '#14532D', textDark: '#DCFCE7' },
  BLEACHERS_TABLE: { label: '외야테이블석', light: '#65A30D', dark: '#84CC16', textLight: '#365314', textDark: '#ECFCCB' },
  FAMILY:       { label: '가족/특수석',    light: '#0F766E', dark: '#2DD4BF', textLight: '#134E4A', textDark: '#CCFBF1' },
  AWAY:         { label: '원정응원석',     light: '#F59E0B', dark: '#FBBF24', textLight: '#78350F', textDark: '#FEF3C7' },
  EV:           { label: 'EV석',           light: '#7CA7D9', dark: '#93C5FD', textLight: '#1E3A8A', textDark: '#DBEAFE' },
  ACCESSIBLE:   { label: '휠체어석',       light: '#06B6D4', dark: '#67E8F9', textLight: '#164E63', textDark: '#CFFAFE' },
};

export const GWANGJU_CATEGORY_GROUPS: GwangjuCategoryGroup[] = [
  { id: 'all', label: '전체', cats: null },
  { id: 'premium', label: '프리미엄/특수석', cats: ['CHAMPION', 'CENTRAL_TABLE', 'TABLE', 'SURPRISE', 'FAMILY', 'ACCESSIBLE', 'PARTY', 'SKYBOX', 'SKY_PICNIC'] },
  { id: 'infield', label: '내야석', cats: ['K9', 'K8', 'K7', 'K5'] },
  { id: 'k7', label: 'K7석', cats: ['K7'] },
  { id: 'cheering', label: '응원석', cats: ['K7'], fanRoles: ['HOME', 'AWAY'] },
  { id: 'home-cheering', label: '홈 응원석', cats: ['K7'], fanRoles: ['HOME'] },
  { id: 'away-cheering', label: '원정응원석', cats: ['K7'], fanRoles: ['AWAY'] },
  { id: 'outfield', label: '외야/테이블', cats: ['OUTFIELD', 'BLEACHERS_TABLE', 'FIVE_TABLE'] },
];

export const GWANGJU_VIEW_INFO: Record<string, GwangjuViewInfo> = {
  default: { photos: 0, rating: null },
};

export const GWANGJU_NON_SELECTABLE_MARKER_ZONES: GwangjuNonSelectableMarkerZone[] = [
  { id: 'marker-m-ev-left-upper', label: 'EV marker near 527/528', markerLabel: 'M', cx: 329, cy: 489, r: 19 },
  { id: 'marker-m-ev-left-lower', label: 'EV marker near 518/519', markerLabel: 'M', cx: 331, cy: 872, r: 19 },
  { id: 'marker-m-ev-bottom', label: 'EV marker near 508/509', markerLabel: 'M', cx: 704, cy: 1051, r: 19 },
  { id: 'marker-n-five-table-top', label: '5F table marker near 535', markerLabel: 'N', cx: 528, cy: 231, r: 20 },
  { id: 'marker-n-five-table-left', label: '5F table marker near 524', markerLabel: 'N', cx: 330, cy: 674, r: 20 },
  { id: 'marker-n-five-table-bottom-left', label: '5F table marker near 512/513', markerLabel: 'N', cx: 565, cy: 1026, r: 20 },
  { id: 'marker-n-five-table-bottom-right', label: '5F table marker near 501/502', markerLabel: 'N', cx: 1073, cy: 945, r: 20 },
];

export const GWANGJU_TRACE_REVIEW_REGIONS: GwangjuTraceReviewRegion[] = [
  {
    id: 'infield-numbered',
    label: '1층 숫자 블록 101~113, 116~127',
    priority: 'P0',
    blockIds: [
      ...numberedBlocks(101, 113).map((block) => blockId(infieldTraceCategory(block), block)),
      ...['116', '117'].map((block) => blockId('K9', block)),
      ...numberedBlocks(118, 123).map((block) => blockId(infieldTraceCategory(block), block)),
      ...numberedBlocks(124, 127).map((block) => blockId('K5', block)),
    ],
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    note: '공식 PNG 2200x1159 좌표계에서 visible 1층 숫자 블록을 정적 polygon으로 고정합니다.',
  },
  {
    id: 'sky-picnic-numbered',
    label: '스카이피크닉 S-301~S-335',
    priority: 'P0',
    blockIds: suiteBlocks(301, 335).map((block) => blockId('SKY_PICNIC', block)),
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    note: '공식 PNG 2200x1159 좌표계에서 S-301~S-335를 per-block 정적 polygon으로 고정합니다.',
  },
  {
    id: 'five-table-numbered',
    label: '5층 테이블 501~535',
    priority: 'P0',
    blockIds: numberedBlocks(501, 535).map((block) => blockId('FIVE_TABLE', block)),
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    note: '공식 PNG의 회색 5층 테이블 블록 fill 경계를 기준으로 추출한 per-block polygon입니다.',
  },
  {
    id: 'official-special-sections',
    label: '공식 알파벳 특수 구역 A/B/C/G/H/I/J/K/O/P',
    priority: 'P1',
    blockIds: [
      'champion-seats',
      'central-table-seats',
      'disabled-seats-center',
      'first-surprise-seats',
      'third-surprise-seats',
      'first-family-seats',
      'third-family-seats',
      'first-wheelchair-seats',
      'third-wheelchair-seats',
      'party-seats-first',
      'party-seats-third',
      'skybox-seats',
      'outfield-left-seats',
      'outfield-right-seats',
      'bleachers-table-left',
      'bleachers-table-right',
    ],
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    note: '공식 PNG 2200x1159 좌표계에서 알파벳/O/P visible 구역을 정적 polygon으로 고정합니다.',
  },
  {
    id: 'operator-confirmed-k7-range',
    label: '운영자 확정 K7/원정응원석 번호 블럭',
    priority: 'P2',
    blockIds: GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    note: '운영자 제공 블럭 범위(K7: 107~111, 118~122 / 원정응원석: 107~110)를 기존 공식 PNG 번호 블럭 polygon에 연결합니다.',
  },
  {
    id: 'operator-only-cheering',
    label: 'K7석/원정응원석 독립 polygon',
    priority: 'P2',
    blockIds: GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => section.id),
    method: GWANGJU_OPERATOR_TRACE_REVIEW_METHOD,
    note: GWANGJU_SEATMAP_COORDINATES_READY
      ? '운영자 제공 공식 PNG 좌표가 strict validation과 write guard를 통과한 뒤 active hit-area로 검수합니다.'
      : '운영자 제공 블럭 범위는 기존 공식 PNG 번호 블럭 polygon에 연결합니다. K7/원정응원석 전용 중첩 hit-area는 운영자 polygon 입력 전까지 만들지 않습니다.',
  },
];

const SOURCE_NOTE = 'KIA 타이거즈 공식 광주-기아 챔피언스필드 경기장 안내 이미지의 visible block 경계를 기준으로 둔 선택 hit-area입니다.';
const TRACE_VERSION = 'manual-polygon-v2';
const TRACE_REVIEW_NOTE = '공식 PNG 원본 좌표계(2200x1159)에서 debug overlay와 evidence crop을 대조해 수동 검수한 hit-area입니다.';

export const GWANGJU_TRACE_ANCHOR_TOLERANCE_PX = 2;
export const GWANGJU_TRACE_BOUNDS_TOLERANCE_PX = 0;

type Point = readonly [number, number];

function formatPathNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function polygonPath(points: readonly Point[]): string {
  const [first, ...rest] = points;
  return `M ${formatPathNumber(first[0])} ${formatPathNumber(first[1])} ${rest
    .map(([x, y]) => `L ${formatPathNumber(x)} ${formatPathNumber(y)}`)
    .join(' ')} Z`;
}

function blockGeometry(
  points: readonly Point[],
  labelX: number,
  labelY: number,
  shortLabel: string,
  labelFontSize = 10,
): GwangjuImageGeometryDraft {
  return {
    d: polygonPath(points),
    labelX,
    labelY,
    shortLabel,
    labelFontSize,
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: TRACE_VERSION,
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: TRACE_REVIEW_NOTE,
  };
}

function toId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
}

function blockId(category: string, block: string): string {
  return toId(`${category}-${block}`);
}

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function infieldTraceCategory(block: string): 'K5' | 'K7' | 'K8' | 'K9' {
  const number = Number(block);
  if (GWANGJU_K7_OFFICIAL_BLOCKS.includes(block)) return 'K7';
  if (number <= 106 || number >= 124) return 'K5';
  if (number <= 113 || number <= 117) return 'K9';
  return 'K8';
}

function suiteBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => `S-${start + index}`);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function officialAlias(name: string, blockName: string, categoryLabel: string, officialBlocks: string[], extra: string[] = []) {
  return uniqueStrings([
    blockName,
    `${blockName}블록`,
    ...officialBlocks,
    ...officialBlocks.map((block) => `${block}블록`),
    `광주 ${blockName}`,
    `KIA ${blockName}`,
    name,
    categoryLabel,
    ...extra,
  ]);
}

export function matchesGwangjuFilter(
  block: Pick<GwangjuBlock, 'category' | 'fanRole'>,
  cats: string[] | null,
  fanRoles: GwangjuFanRole[] | null = null,
): boolean {
  const categoryMatches = cats === null || cats.includes(block.category);
  const fanRoleMatches = fanRoles === null || fanRoles.includes(block.fanRole);

  return categoryMatches && fanRoleMatches;
}

export function matchesGwangjuCategoryGroup(
  block: Pick<GwangjuBlock, 'category' | 'fanRole'>,
  group: GwangjuCategoryGroup,
): boolean {
  return matchesGwangjuFilter(block, group.cats, group.fanRoles ?? null);
}

const INFIELD_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'k5-101': blockGeometry([[1068.5, 798.7], [1140, 810], [1103.6, 841.2], [1077.3, 840.6], [1068.5, 838.3]], 1096, 820, '101'),
  'k5-102': blockGeometry([[1011, 807.8], [1014, 800], [1065.5, 798.2], [1065.5, 811.5], [1054, 846], [1018.9, 839.5]], 1038, 820, '102'),
  'k5-103': blockGeometry([[959.7, 826.5], [968, 808], [1006.4, 801.9], [1011.3, 821.5], [1000, 858], [969.4, 851.9]], 990, 832, '103'),
  'k5-104': blockGeometry([[908.5, 841.9], [918, 820], [951.1, 812.6], [961.8, 840.5], [950, 878], [919.3, 870.9]], 938, 852, '104'),
  'k5-105': blockGeometry([[860.5, 853.8], [870, 834], [899.4, 826.4], [911.5, 858.5], [898, 900], [874.3, 892.7]], 890, 870, '105'),
  'k5-106': blockGeometry([[825, 856.1], [828.2, 845.8], [852, 838.9], [866.5, 879.8], [858, 910], [827.9, 915.7]], 845, 886, '106'),
  'k7-107': blockGeometry([[785.5, 902.2], [781.8, 874.3], [790, 848], [808.1, 844.8], [821.5, 847.1], [823.2, 881], [814.4, 911.6]], 805, 888, '107'),
  'k7-108': blockGeometry([[752.5, 931.1], [751.5, 930.8], [736.7, 865.7], [740, 850], [775.3, 848.6], [781.7, 896], [779.6, 905.6]], 760, 894, '108'),
  'k7-109': blockGeometry([[713.8, 934.9], [698.5, 926.2], [710, 854], [730.5, 852.4], [748.4, 930.6]], 725, 902, '109'),
  'k7-110': blockGeometry([[638.3, 919.9], [641.7, 894.5], [650, 854], [697.7, 855.5], [695.1, 925.7], [671.1, 933.2]], 670, 900, '110'),
  'k7-111': blockGeometry([[587.9, 919.6], [580.4, 913.2], [589.8, 848.4], [644.2, 853.3], [635.3, 919.9], [628.4, 923.6]], 610, 892, '111'),
  'k9-112': blockGeometry([[549.2, 915.5], [523.7, 898.9], [523.7, 898.1], [538.3, 840.7], [586.8, 847.8], [584.5, 864.2], [573.8, 912.8]], 555, 884, '112'),
  'k9-113': blockGeometry([[473.2, 891.1], [458.4, 863.3], [460.5, 856.6], [476.3, 832.5], [510.6, 832.5], [535.3, 840.5], [520.5, 898.2], [514.2, 900.3], [481.1, 895]], 500, 870, '113'),
  'k9-116': blockGeometry([[427.7, 726.6], [430.7, 699.3], [530.4, 715.2], [528, 740.4], [482, 761.1], [438, 760.3]], 472, 730, '116'),
  'k9-117': blockGeometry([[424, 695.2], [425.3, 666.5], [539.1, 666.5], [532, 704], [433.8, 696.7]], 480, 680, '117'),
  'k7-118': blockGeometry([[421.4, 663.5], [421, 662.1], [426.6, 628.5], [515.8, 628.5], [552, 632], [544.8, 663.5]], 480, 650, '118'),
  'k7-119': blockGeometry([[424.5, 616.6], [427.3, 594.7], [433.1, 577.6], [434.3, 575.5], [483.4, 581], [559.1, 607.3], [553.9, 625.5], [466.2, 625.5], [424.8, 622.4]], 480, 604, '119'),
  'k7-120': blockGeometry([[440.7, 563], [441.1, 558.9], [446.6, 538.3], [452.4, 526.4], [504.8, 535.3], [579.2, 550.2], [564, 592], [499.1, 583.3]], 496, 558, '120'),
  'k7-121': blockGeometry([[454, 522.1], [456.9, 504.2], [463.1, 487.9], [472.2, 474], [512.3, 481.9], [580.5, 528.4], [583.6, 540.8], [580.3, 547.3]], 506, 508, '121'),
  'k7-122': blockGeometry([[484.7, 459.4], [490.6, 437.3], [495.4, 426.9], [549.1, 438.5], [585.5, 478.8], [583.7, 496], [519.8, 483.4]], 536, 464, '122'),
  'k8-123': blockGeometry([[522.9, 405.1], [523.6, 403.9], [572.8, 406.2], [630.7, 420.7], [606.7, 451], [554.1, 439.6]], 578, 426, '123'),
  'k5-124': blockGeometry([[529.4, 362.5], [538.8, 349.3], [587.3, 363.4], [657.1, 396.6], [642.2, 406.5], [554.9, 402.4], [525.2, 394.5]], 580, 384, '124'),
  'k5-125': blockGeometry([[544.8, 339.8], [551.1, 308.2], [581.5, 315.5], [677.4, 375.5], [672, 388], [605.2, 368.6]], 600, 342, '125'),
  'k5-126': blockGeometry([[553.6, 294.5], [553.4, 279.4], [557.3, 273.3], [560.5, 270.5], [628.7, 279.6], [636.1, 281.8], [646.5, 304.4], [640, 338], [606.2, 327.4]], 615, 318, '126'),
  'k5-127': blockGeometry([[651.8, 308.7], [650.7, 266.5], [671, 245.4], [718, 262], [704, 338], [657, 319.9]], 680, 288, '127'),
};

const SKY_PICNIC_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'sky-picnic-s-301': blockGeometry([[1080.5, 957.8], [1114.6, 954.9], [1109.7, 926.7], [1076.2, 932.4]], 1095, 946, 'S-301', 5),
  'sky-picnic-s-302': blockGeometry([[1044.2, 965.8], [1060.4, 968.6], [1074.3, 966.3], [1077.7, 959.2], [1073.2, 932.9], [1039.9, 938.5]], 1060, 952, 'S-302', 5),
  'sky-picnic-s-303': blockGeometry([[1006.5, 975.3], [1009.8, 976.2], [1036.1, 972.4], [1041.3, 966.6], [1036.9, 938.9], [1002.3, 943.9]], 1022, 958, 'S-303', 5),
  'sky-picnic-s-304': blockGeometry([[966.6, 981.2], [1001.1, 977.4], [1003.5, 975.7], [999.4, 944.3], [963.4, 948.4]], 984, 963, 'S-304', 5),
  'sky-picnic-s-305': blockGeometry([[924.8, 984.4], [963.6, 981.5], [960.4, 948.7], [923.2, 951.4]], 943, 967, 'S-305', 5),
  'sky-picnic-s-306': blockGeometry([[882.9, 985.9], [921.8, 984.6], [920.2, 951.6], [882.1, 952.9]], 902, 969, 'S-306', 5),
  'sky-picnic-s-307': blockGeometry([[840.5, 986.5], [879.9, 986], [879.1, 953], [840.5, 953.5]], 860, 970, 'S-307', 5),
  'sky-picnic-s-308': blockGeometry([[798.3, 954.9], [797.6, 986], [837.5, 986.5], [837.5, 953.5], [801.3, 953.1]], 818, 970, 'S-308', 5),
  'sky-picnic-s-309': blockGeometry([[754.7, 984.6], [794.6, 985.9], [795.3, 955], [789.8, 952.7], [756.3, 951.6]], 775, 969, 'S-309', 5),
  'sky-picnic-s-310': blockGeometry([[711.8, 982.1], [751.7, 984.4], [753.3, 951.4], [714.1, 949.1]], 733, 967, 'S-310', 5),
  'sky-picnic-s-311': blockGeometry([[667.6, 978], [708.9, 981.9], [711.2, 948.9], [671.4, 945.2]], 690, 964, 'S-311', 5),
  'sky-picnic-s-312': blockGeometry([[624.5, 973.1], [664.6, 977.7], [668.4, 944.9], [628.4, 940.3]], 646, 959, 'S-312', 5),
  'sky-picnic-s-313': blockGeometry([[582.2, 967.5], [621.6, 972.7], [625.5, 939.9], [586.8, 934.9]], 604, 954, 'S-313', 5),
  'sky-picnic-s-314': blockGeometry([[538.3, 958.1], [579.2, 967], [583.9, 934.4], [547.6, 926.5]], 562, 948, 'S-314', 5),
  'sky-picnic-s-315': blockGeometry([[495.9, 945.8], [535.4, 957.4], [544.7, 925.8], [505.1, 914.2]], 521, 936, 'S-315', 5),
  'sky-picnic-s-316': blockGeometry([[445.2, 931.3], [462.9, 907.3], [497.5, 916.5], [492.7, 946.2], [492, 948], [444, 935]], 472, 928, 'S-316', 5),
  'sky-picnic-s-317': blockGeometry([[410, 887], [449, 878], [465.6, 898.6], [456.5, 910.9], [433, 923]], 438, 903, 'S-317', 5),
  'sky-picnic-s-318': blockGeometry([[386, 817], [402.2, 825.1], [412.7, 838.4], [426, 868], [403.8, 885.2], [389, 850]], 397, 850, 'S-318', 5),
  'sky-picnic-s-319': blockGeometry([[343, 771], [351.5, 771], [372.9, 772.1], [385.7, 783.5], [391, 801], [365, 817], [348, 810]], 360, 789, 'S-319', 5),
  'sky-picnic-s-320': blockGeometry([[343.6, 767.6], [340, 737], [376.9, 736.2], [372.2, 769], [371.4, 769]], 362, 751, 'S-320', 5),
  'sky-picnic-s-321': blockGeometry([[378.3, 731.5], [338, 733.9], [338, 701], [351, 700.7], [385.9, 701.7], [385.2, 726]], 360, 717, 'S-321', 5),
  'sky-picnic-s-322': blockGeometry([[339, 697.4], [339, 676.2], [379.1, 665], [387, 665], [386, 697], [351.3, 697.7]], 361, 682, 'S-322', 5),
  'sky-picnic-s-323': blockGeometry([[346.3, 644], [388.3, 652.4], [387.1, 659.7], [366, 665.6], [341, 665]], 354, 657, 'S-323', 5),
  'sky-picnic-s-324': blockGeometry([[352.7, 620], [393, 631], [390, 642], [347, 641]], 359, 632, 'S-324', 5),
  'sky-picnic-s-325': blockGeometry([[353.5, 617.1], [358.5, 598.7], [398.1, 610.6], [396, 620], [361.1, 619.2]], 365, 610, 'S-325', 5),
  'sky-picnic-s-326': blockGeometry([[359.3, 595.8], [364.1, 578.2], [403.1, 589.4], [401, 598], [363.6, 597.1]], 371, 590, 'S-326', 5),
  'sky-picnic-s-327': blockGeometry([[369.9, 556.9], [407.6, 570.1], [406, 577], [365, 575]], 377, 569, 'S-327', 5),
  'sky-picnic-s-328': blockGeometry([[376.3, 537], [412.2, 550.2], [411, 555], [371, 553]], 384, 549, 'S-328', 5),
  'sky-picnic-s-329': blockGeometry([[383.7, 517.8], [417.5, 529.6], [416, 535], [378, 532]], 391, 530, 'S-329', 5),
  'sky-picnic-s-330': blockGeometry([[391.4, 497.9], [422.7, 511.8], [422, 514], [386, 512]], 398, 510, 'S-330', 5),
  'sky-picnic-s-331': blockGeometry([[408, 502], [392.7, 495.2], [395, 489], [411.4, 484.6], [429.3, 493.1], [428, 496]], 406, 492, 'S-331', 5),
  'sky-picnic-s-332': blockGeometry([[415.9, 483.4], [400, 475.9], [403, 468], [418.6, 465], [437.2, 475.3], [436, 478]], 415, 473, 'S-332', 5),
  'sky-picnic-s-333': blockGeometry([[423.2, 464.1], [408.5, 455.9], [412, 448], [426.7, 445.9], [445.8, 456.5], [444, 460]], 425, 455, 'S-333', 5),
  'sky-picnic-s-334': blockGeometry([[431.5, 445.1], [417.2, 437.2], [422, 427.1], [458.5, 433.2], [453, 442]], 435, 437, 'S-334', 5),
  'sky-picnic-s-335': blockGeometry([[419.7, 423.7], [410, 410], [453, 410], [463, 426], [437.4, 426.6]], 438, 419, 'S-335', 5),
};

const FIVE_TABLE_TRACE_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'five-table-501': blockGeometry([[1077, 967.5], [1078.1, 965.3], [1083, 962], [1089.8, 960], [1115.1, 957.9], [1117, 966], [1101, 978], [1083, 987], [1077, 970]], 1097, 970, '501', 10),
  'five-table-502': blockGeometry([[1032.9, 980.3], [1038.3, 974.4], [1053.6, 970.4], [1071.9, 973.6], [1073.9, 978.4], [1076, 987], [1063, 997], [1054, 1001], [1040, 1007], [1037, 999]], 1054, 987, '502', 10),
  'five-table-503': blockGeometry([[994.6, 985.5], [1013.7, 980.4], [1025.9, 983.8], [1034, 1008], [1025, 1013], [1017, 1016], [1006, 1020], [997, 1023], [991, 1013], [985.6, 991.6]], 1010, 1001, '503', 10),
  'five-table-504': blockGeometry([[938, 1000.3], [938, 999], [973.9, 989.8], [980.6, 992.6], [981, 993], [988, 1022], [981, 1028], [971, 1031], [964, 1033], [953, 1036], [947.2, 1037]], 963, 1013, '504', 10),
  'five-table-505': blockGeometry([[895, 1009], [931, 1000], [942, 1037], [906, 1048], [901, 1036], [895, 1010]], 919, 1024, '505', 10),
  'five-table-506': blockGeometry([[847, 1018], [888, 1010], [893, 1025], [898, 1047], [884, 1054], [866, 1058], [861, 1059], [855, 1059], [848, 1024]], 873, 1035, '506', 10),
  'five-table-507': blockGeometry([[801, 1033.7], [801, 1026], [830, 1021], [837, 1020], [841, 1024], [846, 1048], [848, 1058], [806, 1067], [803.4, 1062.6]], 825, 1044, '507', 10),
  'five-table-508': blockGeometry([[752, 1065], [754, 1034], [755, 1028], [770, 1027], [794, 1026], [795, 1032], [798, 1056], [799, 1065], [787, 1069], [752, 1069]], 776, 1048, '508', 10),
  'five-table-509': blockGeometry([[700, 1067.6], [700.6, 1062.4], [705, 1034], [706, 1028], [715, 1024], [727, 1025], [738, 1026], [747, 1027], [747, 1070], [727, 1070], [709, 1069], [700, 1068]], 724, 1047, '509', 10),
  'five-table-510': blockGeometry([[654, 1063.2], [655.1, 1050.5], [661, 1016], [699, 1022], [701.2, 1029.2], [698.2, 1056.2], [697, 1064], [685, 1067], [675, 1066], [658, 1064]], 678, 1042, '510', 10),
  'five-table-511': blockGeometry([[605, 1055], [605.1, 1054.4], [613, 1015], [618, 1012], [650, 1016], [655, 1016.8], [653.9, 1029.8], [652, 1041], [649, 1057], [648, 1062], [621, 1059], [609, 1057]], 631, 1038, '511', 10),
  'five-table-512': blockGeometry([[558, 1043], [560, 1032], [564, 1012], [573, 1005], [587, 1007], [600, 1009], [606, 1010], [605, 1030], [601, 1050], [595, 1054], [572, 1050], [561, 1048]], 583, 1030, '512', 10),
  'five-table-513': blockGeometry([[502, 1030], [511, 1007], [516, 995], [546, 999], [551, 1001], [558, 1009], [556.9, 1015.5], [550.5, 1043.8], [543, 1043], [527, 1039], [513, 1035], [503, 1032]], 530, 1018, '513', 10),
  'five-table-514': blockGeometry([[458, 1011], [466, 994], [476, 974], [484, 976], [505, 986], [511, 989], [508, 1001], [499, 1023], [496, 1028], [491, 1027], [486, 1025], [477, 1021], [459, 1012]], 485, 1001, '514', 10),
  'five-table-515': blockGeometry([[417, 987], [420, 982], [440, 954], [461, 962], [471, 969], [455.7, 1004.9], [453.7, 1008.9], [443, 1004], [435, 999]], 445, 980, '515', 10),
  'five-table-516': blockGeometry([[381, 956.2], [383.9, 953], [406, 930], [412.7, 923.3], [414.5, 924.3], [421, 930], [439, 946], [436, 953], [431, 960], [428.3, 963.7], [413.9, 981.8], [409, 981], [399, 974], [389, 966], [381, 958]], 411, 953, '516', 10),
  'five-table-517': blockGeometry([[348, 922.9], [380.2, 896.4], [382, 895], [393, 901], [405, 914], [408.8, 918.7], [408.9, 919.1], [384, 946], [376, 954], [370, 948], [352, 928], [348, 923]], 379, 924, '517', 10),
  'five-table-518': blockGeometry([[319.6, 887.1], [347.2, 869.8], [370.2, 872.5], [381, 886], [359, 908], [346, 918], [340, 915], [333, 906], [321, 890]], 351, 890, '518', 10),
  'five-table-519': blockGeometry([[335.3, 829.8], [344.7, 866], [343, 867], [317, 882], [303, 858], [297.4, 846.8]], 329, 855, '519', 10),
  'five-table-520': blockGeometry([[328.2, 791.4], [337.3, 808.6], [340, 816], [340.6, 819.3], [337.5, 823.5], [327, 828], [310, 835], [295, 841], [281.2, 803.4]], 311, 815, '520', 10),
  'five-table-521': blockGeometry([[272, 759.7], [319.3, 754], [323, 757], [325, 766], [328, 780], [328.7, 783.6], [328.4, 785.2], [319, 788], [281, 798], [278, 793], [272, 762]], 301, 776, '521', 10),
  'five-table-522': blockGeometry([[269, 713], [295, 713], [319, 714], [320, 724], [322, 749], [273, 754], [270, 747], [269, 715]], 296, 734, '522', 10),
  'five-table-523': blockGeometry([[270, 700], [271, 689], [273, 668], [302, 672], [313, 674], [318, 675], [322, 681], [320, 703], [319, 709], [283, 709], [270, 708]], 296, 689, '523', 10),
  'five-table-524': blockGeometry([[274.9, 663.7], [274, 658], [275, 652], [279, 630], [280, 625], [285.7, 623.1], [324, 629.1], [327, 635], [325, 650], [324, 657], [323, 663], [319.3, 669]], 301, 647, '524', 10),
  'five-table-525': blockGeometry([[281, 617], [287, 583], [288, 578], [308.9, 580.6], [316.6, 581.8], [329, 584], [334, 585], [329, 621], [328.8, 622], [326.6, 625.8], [285, 619]], 308, 602, '525', 10),
  'five-table-526': blockGeometry([[289, 569], [290, 563], [292, 553], [295, 539], [297, 533], [340, 541], [335, 581], [328, 580], [293, 574]], 315, 557, '526', 10),
  'five-table-527': blockGeometry([[298.2, 528.1], [303, 509], [307, 495], [310, 486], [339.5, 494], [351.9, 498.2], [343, 536], [316.9, 532.3]], 325, 512, '527', 10),
  'five-table-528': blockGeometry([[314.2, 482.2], [312, 480], [314, 474], [317, 466], [323, 451], [326, 444], [351, 450], [367, 457], [365, 464], [361, 475], [354, 494], [331.6, 488.1]], 340, 468, '528', 10),
  'five-table-529': blockGeometry([[330, 436.2], [330, 435], [333, 428], [345, 404], [348, 399], [356, 399], [365, 404], [365.1, 404], [387.8, 417.4], [382, 429], [370, 452], [341.3, 441.2]], 359, 425, '529', 10),
  'five-table-530': blockGeometry([[352, 392], [368, 368], [375, 358], [403.2, 375.1], [408.1, 378.5], [409, 385], [397, 404], [391, 413], [359.3, 397.1], [356.7, 395.6], [354, 394]], 382, 386, '530', 10),
  'five-table-531': blockGeometry([[379, 353], [400, 323], [407, 323], [417, 329], [424.1, 333.4], [435.9, 341.2], [420, 367], [414, 376], [405, 371], [386, 359], [380, 355]], 408, 349, '531', 10),
  'five-table-532': blockGeometry([[405, 315], [422, 292], [426, 287], [430, 283], [442.6, 290.2], [459.8, 303.1], [444, 331], [439, 337], [425, 329], [407, 318]], 434, 310, '532', 10),
  'five-table-533': blockGeometry([[434, 280], [433, 279], [441, 269], [456, 251], [461, 248], [469.5, 253.1], [487.3, 267.4], [470, 292], [465, 299], [441, 285], [439.3, 284]], 461, 274, '533', 10),
  'five-table-534': blockGeometry([[463, 244], [492, 214], [498, 216], [500.5, 217.5], [511.5, 227.5], [492, 260], [484, 257], [466, 246]], 490, 238, '534', 10),
  'five-table-535': blockGeometry([[497, 210.2], [497, 210], [506, 202], [518, 192], [528, 184], [541, 188], [546, 192], [542, 197], [522, 221], [516, 222], [509, 218], [499.3, 212.3]], 522, 203, '535', 10),
};

export const GWANGJU_IMAGE_GEOMETRY_DRAFTS: Record<string, GwangjuImageGeometryDraft> = {
  ...INFIELD_GEOMETRIES,
  ...SKY_PICNIC_GEOMETRIES,
  ...FIVE_TABLE_TRACE_GEOMETRIES,
  'champion-seats': blockGeometry([[452.8, 777.7], [516.6, 748.8], [548, 746], [584, 802], [524.1, 829.5], [482.9, 829.5], [475.7, 827.8]], 500, 792, 'A', 13),
  'central-table-seats': blockGeometry([[394.6, 810.6], [402, 795.9], [440.1, 773.8], [449.7, 778], [473.8, 830.9], [463.4, 846.7], [438, 858], [429.3, 854.7]], 430, 824, 'B', 13),
  'disabled-seats-center': blockGeometry([[377.5, 772.2], [375.7, 765.5], [379.1, 742.1], [399, 738], [410, 763], [379.1, 773.6]], 390, 755, 'C', 13),
  'first-surprise-seats': blockGeometry([[852.2, 835.7], [839.4, 839.4], [775.6, 836], [738.9, 812.6], [820, 772], [896.8, 781.9], [889.6, 798.3]], 820, 800, 'G', 13),
  'third-surprise-seats': blockGeometry([[588.5, 478.8], [626.7, 430.5], [660, 400], [666, 520], [584.2, 520]], 640, 475, 'G', 13),
  'first-family-seats': blockGeometry([[1032, 888.6], [1067.7, 843.4], [1193.9, 846.2], [1204, 852], [1110, 900], [1055, 897.8]], 1095, 865, 'H', 13),
  'third-family-seats': blockGeometry([[595.7, 156.2], [648, 142], [704, 204], [695.3, 215.9], [637.4, 276], [586, 268], [563.8, 256.5]], 626, 236, 'H', 13),
  'first-wheelchair-seats': blockGeometry([[898.1, 919.2], [913.4, 898.1], [991.7, 886.7], [1006.1, 895], [995.6, 911.8], [987.8, 917.5], [955, 928], [916.2, 932.4]], 945, 910, 'I', 13),
  'third-wheelchair-seats': blockGeometry([[465.3, 305.2], [487.8, 291], [518, 302], [522, 336], [492.4, 347.5], [465, 337.6], [460, 334.7]], 490, 320, 'I', 13),
  'party-seats-first': blockGeometry([[756.5, 935.7], [754.8, 933.1], [782.9, 906.6], [787.6, 906], [825.6, 918.4], [834.2, 929.2], [828.1, 932.9], [770.1, 941.3]], 792, 928, 'J', 13),
  'party-seats-third': blockGeometry([[438.4, 381.1], [452, 350], [480.5, 346.4], [503.6, 354.7], [510, 374], [470, 396], [442.4, 383.9]], 472, 370, 'J', 13),
  'skybox-seats': blockGeometry([[339.2, 832.8], [340, 832], [366, 826], [375.6, 837.7], [374.5, 858.5], [366, 868], [346.8, 862.1]], 356, 848, 'K', 13),
  'outfield-left-seats': blockGeometry([[939.6, 132.7], [1030, 134], [1160, 165], [1212.3, 200.9], [1075.2, 326.2], [1010, 280], [887.7, 238.1]], 1000, 196, 'O', 13),
  'outfield-right-seats': blockGeometry([[1206.9, 547.1], [1168, 382], [1262, 340], [1296, 500], [1294.5, 509]], 1200, 415, 'O', 13),
  'bleachers-table-left': blockGeometry([[710, 120.7], [710, 104], [950.5, 104], [934.2, 137], [724.5, 149.2]], 850, 122, 'P', 13),
  'bleachers-table-right': blockGeometry([[1319.6, 501.4], [1347.1, 489.4], [1306, 736], [1280, 720]], 1300, 645, 'P', 13),
};

export const GWANGJU_IMAGE_GEOMETRY: Record<string, GwangjuImageGeometry> = Object.fromEntries(
  Object.entries(GWANGJU_IMAGE_GEOMETRY_DRAFTS).map(([id, geometry]) => [
    id,
    {
      ...geometry,
      shortLabel: geometry.shortLabel ?? id,
    },
  ]),
);

function pathToSubpaths(pathData: string): GwangjuPoint[][] {
  return pathData
    .trim()
    .split(/(?=M\s)/)
    .filter(Boolean)
    .map((subpath) => {
      const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      return Array.from({ length: numbers.length / 2 }, (_, index) => ({
        x: numbers[index * 2],
        y: numbers[(index * 2) + 1],
      }));
    });
}

function getPathBounds(subpaths: GwangjuPoint[][]): GwangjuBounds {
  const points = subpaths.flat();
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function toOfficialTraceReference(geometry: GwangjuImageGeometry): GwangjuOfficialTraceReference {
  const subpaths = pathToSubpaths(geometry.d);

  return {
    numberAnchor: {
      x: geometry.labelX,
      y: geometry.labelY,
    },
    expectedBounds: getPathBounds(subpaths),
    expectedSubpathCount: subpaths.length,
  };
}

export const GWANGJU_OFFICIAL_TRACE_REFERENCE: Record<string, GwangjuOfficialTraceReference> = Object.fromEntries(
  Object.entries(GWANGJU_IMAGE_GEOMETRY).map(([id, geometry]) => [id, toOfficialTraceReference(geometry)]),
);

function categoryNameSuffix(block: string, category: string): string {
  return `${block} ${GWANGJU_CATEGORIES[category]?.label ?? '좌석'}`;
}

function createPolygonBlock(input: GwangjuBlockDefinition): GwangjuBlock {
  const category = GWANGJU_CATEGORIES[input.category];
  if (!category) {
    throw new Error(`Unknown Gwangju category: ${input.category}`);
  }

  const imageGeometry = GWANGJU_IMAGE_GEOMETRY[input.id];
  if (!imageGeometry) {
    throw new Error(`Missing Gwangju image geometry: ${input.id}`);
  }

  return {
    ...input,
    sourceConfidence: input.sourceConfidence ?? 'OFFICIAL',
    sourceNote: input.sourceNote ?? SOURCE_NOTE,
    seatViewSections: input.seatViewSections ?? officialAlias(input.name, input.block, category.label, input.officialBlocks),
    imageGeometry,
  };
}

const infieldSide = (block: string): GwangjuSide => {
  const number = Number(block.replace(/\D/g, ''));
  if (number <= 113) return 'FIRST_BASE';
  if (number <= 117) return 'CENTER';
  return 'THIRD_BASE';
};

const skyPicnicSide = (block: string): GwangjuSide => {
  const number = Number(block.replace(/\D/g, ''));
  if (number <= 314) return 'FIRST_BASE';
  if (number <= 318) return 'CENTER';
  return 'THIRD_BASE';
};

const fiveTableSide = (block: string): GwangjuSide => {
  const number = Number(block.replace(/\D/g, ''));
  if (number <= 508) return 'FIRST_BASE';
  if (number <= 513) return 'CENTER';
  return 'THIRD_BASE';
};

function blockDefinition(
  category: string,
  block: string,
  level: GwangjuLevel,
  side: GwangjuSide,
  overrides: Partial<Pick<GwangjuBlockDefinition, 'fanRole' | 'sourceNote' | 'seatViewSections'>> = {},
): GwangjuBlockDefinition {
  return {
    id: blockId(category, block),
    level,
    category,
    name: categoryNameSuffix(block, category),
    block,
    officialBlocks: [block],
    side,
    fanRole: 'NEUTRAL',
    ...overrides,
  };
}

function k7FanRole(block: string): GwangjuFanRole {
  if (GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS.includes(block)) return 'AWAY';
  if (GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS.includes(block)) return 'HOME';
  return 'NEUTRAL';
}

function k7SeatViewSections(block: string): string[] {
  const sideAlias = Number(block) <= 111 ? '1루 K7존' : '3루 K7존';
  const cheeringAliases = [
    ...(GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS.includes(block) ? ['원정응원석', '원정 응원석', '원정 K7존'] : []),
    ...(GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS.includes(block) ? ['홈 응원석', 'KIA 홈응원석', '홈 K7존'] : []),
  ];

  return officialAlias(categoryNameSuffix(block, 'K7'), block, GWANGJU_CATEGORIES.K7.label, [block], [
    'K7석',
    'K7존',
    sideAlias,
    ...cheeringAliases,
  ]);
}

function k7BlockDefinition(block: string): GwangjuBlockDefinition {
  return blockDefinition('K7', block, '1F', infieldSide(block), {
    fanRole: k7FanRole(block),
    sourceNote: `${SOURCE_NOTE} 운영자 제공 블럭 범위(K7: 107~111, 118~122 / 원정응원석: 107~110)를 기존 공식 PNG 번호 블럭 polygon에 연결했습니다.`,
    seatViewSections: k7SeatViewSections(block),
  });
}

const NUMBERED_BLOCKS = [
  ...numberedBlocks(101, 106).map((block) => blockDefinition('K5', block, '1F', infieldSide(block))),
  ...numberedBlocks(107, 111).map((block) => k7BlockDefinition(block)),
  ...['112', '113', '116', '117'].map((block) => blockDefinition('K9', block, '1F', infieldSide(block))),
  ...numberedBlocks(118, 122).map((block) => k7BlockDefinition(block)),
  ...numberedBlocks(123, 123).map((block) => blockDefinition('K8', block, '1F', infieldSide(block))),
  ...numberedBlocks(124, 127).map((block) => blockDefinition('K5', block, '1F', infieldSide(block))),
  ...suiteBlocks(301, 335).map((block) => blockDefinition('SKY_PICNIC', block, '3F', skyPicnicSide(block))),
  ...numberedBlocks(501, 535).map((block) => blockDefinition('FIVE_TABLE', block, '5F', fiveTableSide(block))),
];

const SPECIAL_BLOCKS: GwangjuBlockDefinition[] = [
  { id: 'champion-seats', level: '1F', category: 'CHAMPION', name: '챔피언석', block: '챔피언석', officialBlocks: ['챔피언석'], side: 'CENTER', fanRole: 'NEUTRAL', seatViewSections: ['챔피언석', 'Champion Seats', '광주 챔피언석'] },
  { id: 'central-table-seats', level: '1F', category: 'CENTRAL_TABLE', name: '중앙 테이블석', block: '중앙 테이블석', officialBlocks: ['중앙 테이블석'], side: 'CENTER', fanRole: 'NEUTRAL', seatViewSections: ['중앙테이블석', '중앙 테이블석', 'Table Seats'] },
  { id: 'disabled-seats-center', level: '1F', category: 'ACCESSIBLE', name: '장애인지정석', block: '장애인지정석', officialBlocks: ['장애인지정석'], side: 'CENTER', fanRole: 'NEUTRAL', seatViewSections: ['장애인지정석', 'Disabled Seats'], accessibilityNote: '공식 좌석도 C 구역 기준입니다.' },
  { id: 'first-surprise-seats', level: '1F', category: 'SURPRISE', name: '1루 서프라이즈석', block: '1루 서프라이즈석', officialBlocks: ['1루 서프라이즈석'], side: 'FIRST_BASE', fanRole: 'NEUTRAL', seatViewSections: ['서프라이즈석', '1루 서프라이즈석', 'Surprise Seats'] },
  { id: 'third-surprise-seats', level: '1F', category: 'SURPRISE', name: '3루 서프라이즈석', block: '3루 서프라이즈석', officialBlocks: ['3루 서프라이즈석'], side: 'THIRD_BASE', fanRole: 'NEUTRAL', seatViewSections: ['서프라이즈석', '3루 서프라이즈석', 'Surprise Seats'] },
  { id: 'first-family-seats', level: '1F', category: 'FAMILY', name: '1루 타이거즈가족석', block: '1루 타이거즈가족석', officialBlocks: ['1루 타이거즈가족석'], side: 'FIRST_BASE', fanRole: 'NEUTRAL', seatViewSections: ['타이거즈가족석', '1루 타이거즈가족석', 'Tigers Family Seats'] },
  { id: 'third-family-seats', level: '1F', category: 'FAMILY', name: '3루 타이거즈가족석', block: '3루 타이거즈가족석', officialBlocks: ['3루 타이거즈가족석'], side: 'THIRD_BASE', fanRole: 'NEUTRAL', seatViewSections: ['타이거즈가족석', '3루 타이거즈가족석', 'Tigers Family Seats'] },
  { id: 'first-wheelchair-seats', level: '1F', category: 'ACCESSIBLE', name: '1루 휠체어석', block: '1루 휠체어석', officialBlocks: ['1루 휠체어석'], side: 'FIRST_BASE', fanRole: 'NEUTRAL', seatViewSections: ['휠체어석', '1루 휠체어석', 'Wheelchair Seats'], accessibilityNote: '공식 좌석도 I 구역 기준입니다.' },
  { id: 'third-wheelchair-seats', level: '1F', category: 'ACCESSIBLE', name: '3루 휠체어석', block: '3루 휠체어석', officialBlocks: ['3루 휠체어석'], side: 'THIRD_BASE', fanRole: 'NEUTRAL', seatViewSections: ['휠체어석', '3루 휠체어석', 'Wheelchair Seats'], accessibilityNote: '공식 좌석도 I 구역 기준입니다.' },
  { id: 'party-seats-first', level: '4F', category: 'PARTY', name: '1루 4층파티석', block: '1루 4층파티석', officialBlocks: ['1루 4층파티석'], side: 'FIRST_BASE', fanRole: 'NEUTRAL', seatViewSections: ['4층파티석', '1루 4층파티석', 'Party Seats'] },
  { id: 'party-seats-third', level: '4F', category: 'PARTY', name: '3루 4층파티석', block: '3루 4층파티석', officialBlocks: ['3루 4층파티석'], side: 'THIRD_BASE', fanRole: 'NEUTRAL', seatViewSections: ['4층파티석', '3루 4층파티석', 'Party Seats'] },
  { id: 'skybox-seats', level: '4F', category: 'SKYBOX', name: '스카이박스', block: '스카이박스', officialBlocks: ['스카이박스'], side: 'THIRD_BASE', fanRole: 'NEUTRAL', seatViewSections: ['스카이박스', 'Suites', '광주 스카이박스'] },
  { id: 'outfield-left-seats', level: 'OUTFIELD', category: 'OUTFIELD', name: '좌측 외야석', block: '좌측 외야석', officialBlocks: ['외야석'], side: 'OUTFIELD', fanRole: 'NEUTRAL', seatViewSections: ['외야석', '좌측 외야석', 'The Bleachers', '광주 외야석'] },
  { id: 'outfield-right-seats', level: 'OUTFIELD', category: 'OUTFIELD', name: '우측 외야석', block: '우측 외야석', officialBlocks: ['우측 외야석'], side: 'OUTFIELD', fanRole: 'NEUTRAL', seatViewSections: ['외야석', '우측 외야석', 'The Bleachers', '광주 외야석'] },
  { id: 'bleachers-table-left', level: 'OUTFIELD', category: 'BLEACHERS_TABLE', name: '좌측 외야테이블석', block: '좌측 외야테이블석', officialBlocks: ['좌측 외야테이블석'], side: 'OUTFIELD', fanRole: 'NEUTRAL', seatViewSections: ['외야테이블석', '좌측 외야테이블석', 'The Bleachers Table Seats'] },
  { id: 'bleachers-table-right', level: 'OUTFIELD', category: 'BLEACHERS_TABLE', name: '우측 외야테이블석', block: '우측 외야테이블석', officialBlocks: ['우측 외야테이블석'], side: 'OUTFIELD', fanRole: 'NEUTRAL', seatViewSections: ['외야테이블석', '우측 외야테이블석', 'The Bleachers Table Seats'] },
];

export const GWANGJU_BLOCKS: GwangjuBlock[] = [
  ...NUMBERED_BLOCKS,
  ...SPECIAL_BLOCKS,
].map(createPolygonBlock);

function createGwangjuTraceReviewSummary(blocks: GwangjuBlock[]): GwangjuTraceReviewSummary {
  const summary: GwangjuTraceReviewSummary = {
    totalBlocks: blocks.length,
    officialImageTraced: 0,
    needsOperatorReview: 0,
    directOfficialTrace: 0,
    manualReviewed: 0,
    unreviewedBlocks: 0,
    pixelAligned: 0,
    manualReviewRequired: 0,
  };

  blocks.forEach((block) => {
    if (block.imageGeometry.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      summary.officialImageTraced += 1;
    }
    if (block.imageGeometry.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      summary.needsOperatorReview += 1;
    }
    if (block.imageGeometry.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE') {
      summary.directOfficialTrace += 1;
    }
    if (block.imageGeometry.manualReviewed) {
      summary.manualReviewed += 1;
    } else {
      summary.unreviewedBlocks += 1;
    }
    if (block.imageGeometry.pixelAlignmentStatus === 'PIXEL_ALIGNED') {
      summary.pixelAligned += 1;
    }
    if (block.imageGeometry.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED') {
      summary.manualReviewRequired += 1;
    }
  });

  return summary;
}

export const GWANGJU_TRACE_REVIEW_SUMMARY = createGwangjuTraceReviewSummary(GWANGJU_BLOCKS);

export const GWANGJU_SELECTABLE_BLOCKS_READY =
  GWANGJU_COORDINATE_TRACE_STATUS === 'READY'
  && GWANGJU_SEATMAP_IMAGE.assetStatus === 'OFFICIAL'
  && GWANGJU_BLOCKS.length > 0;

export function getGwangjuSideLabel(side: GwangjuSide) {
  switch (side) {
    case 'FIRST_BASE':
      return '1루';
    case 'THIRD_BASE':
      return '3루';
    case 'CENTER':
      return '중앙';
    case 'OUTFIELD':
      return '외야';
    default:
      return '-';
  }
}

export function getGwangjuFanRoleLabel(role: GwangjuFanRole) {
  switch (role) {
    case 'HOME':
      return '홈';
    case 'AWAY':
      return '원정';
    case 'NEUTRAL':
      return '중립';
    default:
      return '-';
  }
}

export function getGwangjuSourceLabel(confidence: GwangjuSourceConfidence) {
  return confidence === 'OFFICIAL' ? '공식 확인' : '운영자 확인 필요';
}
