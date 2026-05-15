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
export type GwangjuTraceGeneration = 'FULL_ACTIVE_111_RETRACE';

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
  previousTraceVersion: string;
  traceGeneration: GwangjuTraceGeneration;
  retraceSourcePointCount: number;
  retracePointCount: number;
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

export interface GwangjuOfficialComponentCoverageReference {
  componentGroupId: 'outfield' | 'bleachers-table';
  componentIds: string[];
  expectedBounds: GwangjuBounds;
  minimumRecall: number;
  minimumIoU: number;
  note: string;
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

export type GwangjuZonePrecisionPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5';

export interface GwangjuZonePrecisionWorkset {
  id: string;
  label: string;
  priority: GwangjuZonePrecisionPriority;
  blockIds: string[];
  acceptanceFocus: string[];
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
export const GWANGJU_PREVIOUS_TRACE_VERSION = 'manual-polygon-v4';
export const GWANGJU_FULL_RETRACE_VERSION = 'manual-polygon-v5';
export const GWANGJU_FULL_RETRACE_GENERATION: GwangjuTraceGeneration = 'FULL_ACTIVE_111_RETRACE';
const TRACE_VERSION = GWANGJU_FULL_RETRACE_VERSION;
const TRACE_REVIEW_NOTE = '공식 PNG 원본 좌표계(2200x1159)에서 111개 active block 전체를 구역별 workset으로 재검수하고 debug overlay와 evidence crop을 대조해 수동 검수한 hit-area입니다.';

export const GWANGJU_TRACE_ANCHOR_TOLERANCE_PX = 2;
export const GWANGJU_TRACE_BOUNDS_TOLERANCE_PX = 0;
export const GWANGJU_OP_COMPONENT_COVERAGE_MIN_RECALL = 0.78;
export const GWANGJU_OP_COMPONENT_COVERAGE_MIN_IOU = 0.62;
export const GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_RECALL = 0.9;
export const GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_IOU = 0.86;
export const GWANGJU_BLEACHERS_TABLE_COMPONENT_COVERAGE_RELEASE_MIN_IOU = 0.9;

export const GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES: Record<string, GwangjuOfficialComponentCoverageReference> = {
  'outfield-left-seats': {
    componentGroupId: 'outfield',
    componentIds: ['outfield-1'],
    expectedBounds: { minX: 887, minY: 132, maxX: 1208, maxY: 303 },
    minimumRecall: GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_RECALL,
    minimumIoU: GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_IOU,
    note: '좌측 O 외야석은 공식 PNG의 outfield-1 connected component를 기준으로 P 외야테이블/필드색 혼입을 제외한 coverage를 검증합니다.',
  },
  'outfield-right-seats': {
    componentGroupId: 'outfield',
    componentIds: ['outfield-3'],
    expectedBounds: { minX: 1184, minY: 341, maxX: 1333, maxY: 838 },
    minimumRecall: GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_RECALL,
    minimumIoU: GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_IOU,
    note: '우측 O 외야석은 공식 PNG pixel component outfield-3 하단까지 포함해야 합니다.',
  },
  'bleachers-table-left': {
    componentGroupId: 'bleachers-table',
    componentIds: ['bleachers-table-1', 'bleachers-table-2'],
    expectedBounds: { minX: 714, minY: 102, maxX: 981, maxY: 145 },
    minimumRecall: GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_RECALL,
    minimumIoU: GWANGJU_BLEACHERS_TABLE_COMPONENT_COVERAGE_RELEASE_MIN_IOU,
    note: '좌측 P 외야테이블석은 공식 PNG bright-green table components 1~2를 따라야 합니다.',
  },
  'bleachers-table-right': {
    componentGroupId: 'bleachers-table',
    componentIds: ['bleachers-table-3', 'bleachers-table-4'],
    expectedBounds: { minX: 1247, minY: 465, maxX: 1338, maxY: 777 },
    minimumRecall: GWANGJU_OP_COMPONENT_COVERAGE_RELEASE_MIN_RECALL,
    minimumIoU: GWANGJU_BLEACHERS_TABLE_COMPONENT_COVERAGE_RELEASE_MIN_IOU,
    note: '우측 P 외야테이블석은 공식 PNG bright-green curved strip components 3~4를 따라야 합니다.',
  },
};

export const GWANGJU_ZONE_PRECISION_WORKSETS: GwangjuZonePrecisionWorkset[] = [
  {
    id: 'p1-op-outfield-component',
    label: 'P1 O/P 외야 component 정밀화',
    priority: 'P1',
    blockIds: [
      'outfield-left-seats',
      'outfield-right-seats',
      'bleachers-table-left',
      'bleachers-table-right',
    ],
    acceptanceFocus: [
      'officialComponentRecall',
      'componentIoU',
      'nested-hit-area-blocked',
    ],
    note: 'O/P 외야 계열은 공식 PNG component recall/IoU gate로 작은 legacy polygon 회귀를 차단합니다.',
  },
  {
    id: 'p2-lower-infield-low-margin',
    label: 'P2 하단 내야 저마진 K7/K9 경계',
    priority: 'P2',
    blockIds: [
      'k9-116',
      'k9-117',
      'k7-118',
      'k7-119',
      'k7-120',
      'k7-121',
      'k7-122',
    ],
    acceptanceFocus: [
      'numbered-seat-color-overlap',
      'label-top-hit',
      'boundary-overlap',
    ],
    note: '현재 coverage margin이 낮은 K7 118/119, K9 117과 인접 K7/K9 경계를 함께 확인합니다.',
  },
  {
    id: 'p3-official-special-sections',
    label: 'P3 공식 특수석',
    priority: 'P3',
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
    ],
    acceptanceFocus: [
      'special-seat-color-overlap',
      'numbered-label-containment',
      'marker-only-separation',
    ],
    note: 'SURPRISE/FAMILY/CHAMPION/ACCESSIBLE/PARTY/SKYBOX/CENTRAL_TABLE 계열 특수석을 공식 PNG visible 경계 기준으로 확인합니다.',
  },
  {
    id: 'p4-repeated-numbered-blocks',
    label: 'P4 SKY_PICNIC/FIVE_TABLE 반복 블럭',
    priority: 'P4',
    blockIds: [
      ...suiteBlocks(301, 335).map((block) => blockId('SKY_PICNIC', block)),
      ...numberedBlocks(501, 535).map((block) => blockId('FIVE_TABLE', block)),
    ],
    acceptanceFocus: [
      'batch-anchor-consistency',
      'bbox-reference-lock',
      'repeat-block-pixel-coverage-lock',
      'repeat-block-overlap',
    ],
    note: 'SKY_PICNIC 35개와 FIVE_TABLE 35개 반복 블럭은 anchor/bbox/reference 일관성과 높은 공식 좌석 색상 overlap을 함께 검수합니다.',
  },
  {
    id: 'p5-full-release-reference',
    label: 'P5 111개 전체 reference 재고정',
    priority: 'P5',
    blockIds: [
      ...numberedBlocks(101, 106).map((block) => blockId('K5', block)),
      ...numberedBlocks(107, 111).map((block) => blockId('K7', block)),
      ...['112', '113', '116', '117'].map((block) => blockId('K9', block)),
      ...numberedBlocks(118, 122).map((block) => blockId('K7', block)),
      blockId('K8', '123'),
      ...numberedBlocks(124, 127).map((block) => blockId('K5', block)),
      ...suiteBlocks(301, 335).map((block) => blockId('SKY_PICNIC', block)),
      ...numberedBlocks(501, 535).map((block) => blockId('FIVE_TABLE', block)),
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
    acceptanceFocus: [
      'active-block-count-111',
      'release-ready-v5',
      'derived-k7-away-only',
    ],
    note: '전체 111개 active polygon의 v5 reference, derived K7/AWAY 계약, release gate를 최종 확인합니다.',
  },
];

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

function midpoint(start: Point, end: Point): Point {
  return [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
  ];
}

function fullRetracePoints(points: readonly Point[]): Point[] {
  return points.flatMap((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    return [point, midpoint(point, nextPoint)];
  });
}

function blockGeometry(
  points: readonly Point[],
  labelX: number,
  labelY: number,
  shortLabel: string,
  labelFontSize = 10,
): GwangjuImageGeometryDraft {
  const retracedPoints = fullRetracePoints(points);

  return {
    d: polygonPath(retracedPoints),
    labelX,
    labelY,
    shortLabel,
    labelFontSize,
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: TRACE_VERSION,
    previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    retraceSourcePointCount: points.length,
    retracePointCount: retracedPoints.length,
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: TRACE_REVIEW_NOTE,
  };
}

function multiBlockGeometry(
  subpaths: readonly Point[][],
  labelX: number,
  labelY: number,
  shortLabel: string,
  labelFontSize = 10,
): GwangjuImageGeometryDraft {
  const retracedSubpaths = subpaths.map(fullRetracePoints);

  return {
    d: retracedSubpaths.map(polygonPath).join(' '),
    labelX,
    labelY,
    shortLabel,
    labelFontSize,
    traceStatus: 'OFFICIAL_IMAGE_TRACED',
    traceMethod: 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    traceSource: 'OFFICIAL_PNG_MANUAL_POLYGON',
    traceVersion: TRACE_VERSION,
    previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    retraceSourcePointCount: subpaths.reduce((total, subpath) => total + subpath.length, 0),
    retracePointCount: retracedSubpaths.reduce((total, subpath) => total + subpath.length, 0),
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
  'k7-111': blockGeometry([[605, 931], [608, 915], [613, 889], [619, 858], [623, 838], [624, 834], [627, 834], [650, 838], [650, 848], [648, 860], [644, 882], [636, 924], [635, 936], [611, 936], [605, 935]], 630, 892, '111'),
  'k9-112': blockGeometry([[566, 926], [570, 911], [588, 846], [592, 832], [593, 829], [595, 829], [601, 830], [618, 833], [618, 837], [603, 914], [601, 924], [599, 933], [591, 933], [585, 932], [570, 929], [566, 928]], 586, 884, '112'),
  'k9-113': blockGeometry([[505, 875], [509, 869], [558, 799], [561, 795], [563, 795], [594, 807], [594, 809], [566, 907], [563, 917], [562, 920], [558, 920], [550, 918], [539, 915], [527, 911], [517, 907], [516, 906], [505, 876]], 535, 880, '113'),
  'k9-116': blockGeometry([[388, 711], [397, 697], [405, 697], [473, 701], [489, 702], [498, 703], [501, 739], [501, 740], [500, 741], [493, 743], [454, 753], [426, 760], [416, 760], [414, 748], [414, 742], [410, 738], [388, 728]], 472, 730, '116'),
  'k9-117': blockGeometry([[390, 683], [391, 674], [392, 667], [393, 662], [394, 658], [397, 658], [411, 660], [458, 667], [478, 670], [491, 672], [503, 674], [503, 680], [501, 691], [500, 696], [499, 698], [493, 698], [469, 696], [398, 690], [390, 689]], 480, 680, '117'),
  'k7-118': blockGeometry([[395, 651], [402, 616], [403, 615], [406, 615], [476, 626], [495, 629], [507, 631], [512, 632], [512, 633], [511, 639], [505, 669], [503, 669], [462, 663], [422, 657], [396, 653], [395, 652]], 480, 650, '118'),
  'k7-119': blockGeometry([[404, 606], [407, 588], [410, 573], [415, 573], [422, 574], [517, 589], [520, 590], [520, 592], [514, 622], [513, 626], [509, 626], [470, 620], [412, 611], [406, 610], [404, 609]], 480, 604, '119'),
  'k7-120': blockGeometry([[412, 562], [416, 542], [418, 534], [419, 533], [423, 533], [450, 539], [516, 554], [519, 555], [519, 558], [515, 578], [514, 581], [513, 582], [509, 582], [502, 581], [469, 576], [417, 568], [412, 567]], 496, 558, '120'),
  'k7-121': blockGeometry([[454, 521], [456, 507], [457, 503], [459, 497], [462, 489], [463, 487], [467, 481], [471, 477], [474, 477], [505, 480], [510, 481], [513, 482], [515, 483], [521, 487], [540, 500], [542, 502], [544, 514], [544, 515], [540, 527], [536, 537], [535, 538], [531, 538], [456, 523], [454, 522]], 506, 508, '121'),
  'k7-122': blockGeometry([[485, 456], [492, 435], [493, 433], [495, 430], [497, 428], [503, 428], [540, 436], [549, 438], [555, 444], [574, 465], [576, 468], [576, 471], [570, 480], [563, 489], [561, 491], [556, 491], [530, 486], [520, 484], [508, 476], [486, 461], [485, 460]], 536, 464, '122'),
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
  'five-table-501': blockGeometry([[1114, 953], [1117, 969], [1081, 987], [1076, 966]], 1097, 970, '501', 10),
  'five-table-502': blockGeometry([[1070, 966], [1076, 991], [1039, 1007], [1032, 976]], 1054, 987, '502', 10),
  'five-table-503': blockGeometry([[1026, 978], [1034, 1009], [994, 1024], [985, 988]], 1010, 1001, '503', 10),
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
  'five-table-518': blockGeometry([[319, 886], [320, 885], [356, 864], [362, 861], [364, 863], [367, 867], [375, 878], [380, 885], [382, 888], [382, 890], [351, 914], [347, 917], [344, 919], [341, 916], [334, 907], [322, 891], [320, 888]], 351, 890, '518', 10),
  'five-table-519': blockGeometry([[297, 845], [329, 832], [339, 828], [342, 827], [344, 827], [361, 857], [320, 880], [316, 882], [311, 873], [297, 846]], 329, 855, '519', 10),
  'five-table-520': blockGeometry([[330, 789], [341, 822], [294, 841], [281, 802]], 311, 815, '520', 10),
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
  'five-table-534': blockGeometry([[492, 214], [510, 223], [517, 229], [491, 261], [463, 244]], 490, 238, '534', 10),
  'five-table-535': blockGeometry([[497, 210.2], [497, 210], [506, 202], [518, 192], [528, 184], [541, 188], [546, 192], [542, 197], [522, 221], [516, 222], [509, 218], [499.3, 212.3]], 522, 203, '535', 10),
};

export const GWANGJU_IMAGE_GEOMETRY_DRAFTS: Record<string, GwangjuImageGeometryDraft> = {
  ...INFIELD_GEOMETRIES,
  ...SKY_PICNIC_GEOMETRIES,
  ...FIVE_TABLE_TRACE_GEOMETRIES,
  'champion-seats': blockGeometry([[461, 756], [515, 740], [517, 740], [518, 741], [559, 793], [559, 794], [558, 796], [553, 803], [536, 826], [527, 838], [523, 843], [512, 831], [497, 815], [487, 802], [475, 783]], 500, 792, 'A', 13),
  'central-table-seats': blockGeometry([[397, 771], [398, 770], [422, 764], [459, 755], [461, 756], [475, 783], [487, 802], [497, 815], [512, 831], [523, 843], [523, 844], [510, 863], [488, 895], [486, 895], [468, 882], [464, 879], [460, 875], [444, 857], [432, 842], [425, 833], [422, 829], [417, 822], [413, 816], [412, 814], [405, 799], [401, 790], [400, 787], [397, 773]], 430, 824, 'B', 13),
  'disabled-seats-center': blockGeometry([[377.5, 772.2], [375.7, 765.5], [379.1, 742.1], [399, 738], [410, 763], [379.1, 773.6]], 390, 755, 'C', 13),
  'first-surprise-seats': blockGeometry([[714, 844], [716, 834], [717, 832], [871, 772], [874, 772], [917, 780], [949, 786], [959, 788], [959, 789], [958, 790], [791, 848], [786, 848], [714, 846]], 870, 800, 'G', 13),
  'third-surprise-seats': blockGeometry([[646, 404], [642, 409], [639, 414], [636, 419], [633, 424], [629, 429], [626, 434], [623, 439], [619, 444], [616, 449], [613, 454], [610, 459], [606, 464], [603, 469], [600, 474], [596, 479], [593, 484], [590, 489], [587, 494], [583, 499], [580, 504], [577, 509], [573, 514], [573, 515], [576, 515], [577, 514], [584, 509], [591, 504], [597, 499], [604, 494], [611, 489], [618, 484], [624, 479], [631, 474], [638, 469], [642, 464], [643, 459], [644, 454], [645, 449], [646, 444], [647, 439], [648, 434], [649, 429], [650, 424], [651, 419], [652, 414], [653, 409], [654, 404]], 620, 475, 'G', 13),
  'first-family-seats': blockGeometry([[1032, 888.6], [1067.7, 843.4], [1193.9, 846.2], [1204, 852], [1110, 900], [1055, 897.8]], 1095, 865, 'H', 13),
  'third-family-seats': blockGeometry([[604, 202], [598, 207], [609, 217], [599, 232], [589, 247], [579, 262], [572, 272], [588, 266], [637, 270], [645, 272], [659, 252], [677, 232], [688, 222], [692, 202], [669, 157], [642, 172], [621, 187]], 626, 236, 'H', 13),
  'first-wheelchair-seats': blockGeometry([[898.1, 919.2], [913.4, 898.1], [991.7, 886.7], [1006.1, 895], [995.6, 911.8], [987.8, 917.5], [955, 928], [916.2, 932.4]], 945, 910, 'I', 13),
  'third-wheelchair-seats': blockGeometry([[465.3, 305.2], [487.8, 291], [518, 302], [522, 336], [492.4, 347.5], [465, 337.6], [460, 334.7]], 490, 320, 'I', 13),
  'party-seats-first': blockGeometry([[756.5, 935.7], [754.8, 933.1], [782.9, 906.6], [787.6, 906], [825.6, 918.4], [834.2, 929.2], [828.1, 932.9], [770.1, 941.3]], 792, 928, 'J', 13),
  'party-seats-third': blockGeometry([[438.4, 381.1], [452, 350], [480.5, 346.4], [503.6, 354.7], [510, 374], [470, 396], [442.4, 383.9]], 472, 370, 'J', 13),
  'skybox-seats': multiBlockGeometry([
    [[345, 826], [349, 824], [352, 823], [353, 824], [358, 833], [368, 852], [367, 853], [361, 856], [360, 855], [358, 852], [347, 831], [345, 827]],
    [[364, 860], [365, 859], [370, 856], [373, 860], [386, 878], [388, 881], [389, 883], [389, 884], [387, 886], [384, 888], [383, 888], [370, 870], [365, 863], [364, 861]],
  ], 356, 848, 'K', 13),
  'outfield-left-seats': blockGeometry([[1060, 132], [1060, 133], [1062, 133], [1062, 134], [1065, 134], [1065, 135], [1067, 135], [1067, 136], [1070, 136], [1070, 137], [1072, 137], [1072, 138], [1074, 138], [1074, 139], [1077, 139], [1077, 140], [1079, 140], [1079, 141], [1081, 141], [1081, 142], [1083, 142], [1083, 143], [1086, 143], [1086, 144], [1088, 144], [1088, 145], [1090, 145], [1090, 146], [1092, 146], [1092, 147], [1094, 147], [1094, 148], [1096, 148], [1096, 149], [1098, 149], [1098, 150], [1100, 150], [1100, 151], [1102, 151], [1102, 152], [1104, 152], [1104, 153], [1106, 153], [1106, 154], [1108, 154], [1108, 155], [1110, 155], [1110, 156], [1112, 156], [1112, 157], [1114, 157], [1114, 158], [1116, 158], [1116, 159], [1117, 159], [1117, 160], [1119, 160], [1119, 161], [1121, 161], [1121, 162], [1123, 162], [1123, 163], [1125, 163], [1125, 164], [1126, 164], [1126, 165], [1128, 165], [1128, 166], [1130, 166], [1130, 167], [1131, 167], [1131, 168], [1133, 168], [1133, 169], [1135, 169], [1135, 170], [1136, 170], [1136, 171], [1138, 171], [1138, 172], [1140, 172], [1140, 173], [1141, 173], [1141, 174], [1143, 174], [1143, 175], [1144, 175], [1144, 176], [1146, 176], [1146, 177], [1147, 177], [1147, 178], [1149, 178], [1149, 179], [1151, 179], [1151, 180], [1152, 180], [1152, 181], [1154, 181], [1154, 182], [1155, 182], [1155, 183], [1157, 183], [1157, 184], [1158, 184], [1158, 185], [1159, 185], [1159, 186], [1161, 186], [1161, 187], [1162, 187], [1162, 188], [1164, 188], [1164, 189], [1165, 189], [1165, 190], [1167, 190], [1167, 191], [1168, 191], [1168, 192], [1169, 192], [1169, 193], [1171, 193], [1171, 194], [1172, 194], [1172, 195], [1173, 195], [1173, 196], [1175, 196], [1175, 197], [1176, 197], [1176, 198], [1178, 198], [1178, 199], [1179, 199], [1179, 200], [1180, 200], [1180, 201], [1181, 201], [1181, 202], [1183, 202], [1183, 203], [1184, 203], [1184, 204], [1185, 204], [1185, 205], [1187, 205], [1187, 206], [1188, 206], [1188, 207], [1189, 207], [1189, 208], [1190, 208], [1190, 209], [1192, 209], [1192, 210], [1193, 210], [1193, 211], [1194, 211], [1194, 212], [1195, 212], [1195, 213], [1197, 213], [1197, 214], [1198, 214], [1198, 215], [1199, 215], [1199, 216], [1200, 216], [1200, 217], [1201, 217], [1201, 218], [1203, 218], [1203, 219], [1204, 219], [1204, 220], [1205, 220], [1205, 221], [1206, 221], [1206, 222], [1207, 222], [1207, 223], [1208, 223], [1208, 224], [1209, 224], [1209, 225], [1208, 225], [1208, 226], [1207, 226], [1207, 227], [1206, 227], [1206, 228], [1205, 228], [1205, 229], [1204, 229], [1204, 230], [1203, 230], [1203, 231], [1202, 231], [1202, 232], [1201, 232], [1201, 233], [1200, 233], [1200, 234], [1199, 234], [1199, 235], [1198, 235], [1198, 236], [1196, 236], [1196, 237], [1195, 237], [1195, 238], [1194, 238], [1194, 239], [1193, 239], [1193, 240], [1192, 240], [1192, 241], [1191, 241], [1191, 242], [1190, 242], [1190, 243], [1189, 243], [1189, 244], [1188, 244], [1188, 245], [1187, 245], [1187, 246], [1186, 246], [1186, 247], [1185, 247], [1185, 248], [1184, 248], [1184, 249], [1182, 249], [1182, 250], [1181, 250], [1181, 251], [1180, 251], [1180, 252], [1179, 252], [1179, 253], [1178, 253], [1178, 254], [1177, 254], [1177, 255], [1176, 255], [1176, 256], [1175, 256], [1175, 257], [1174, 257], [1174, 258], [1173, 258], [1173, 259], [1172, 259], [1172, 260], [1171, 260], [1171, 261], [1169, 261], [1169, 262], [1168, 262], [1168, 263], [1167, 263], [1167, 264], [1166, 264], [1166, 265], [1165, 265], [1165, 266], [1164, 266], [1164, 267], [1163, 267], [1163, 268], [1162, 268], [1162, 269], [1161, 269], [1161, 270], [1160, 270], [1160, 271], [1159, 271], [1159, 272], [1158, 272], [1158, 273], [1156, 273], [1156, 274], [1155, 274], [1155, 275], [1154, 275], [1154, 276], [1153, 276], [1153, 277], [1152, 277], [1152, 278], [1151, 278], [1151, 279], [1150, 279], [1150, 280], [1149, 280], [1149, 281], [1148, 281], [1148, 282], [1147, 282], [1147, 283], [1146, 283], [1146, 284], [1145, 284], [1145, 285], [1143, 285], [1143, 286], [1142, 286], [1142, 287], [1141, 287], [1141, 288], [1140, 288], [1140, 289], [1139, 289], [1139, 290], [1138, 290], [1138, 291], [1137, 291], [1137, 292], [1136, 292], [1136, 293], [1135, 293], [1135, 294], [1134, 294], [1134, 295], [1133, 295], [1133, 296], [1132, 296], [1132, 297], [1130, 297], [1130, 298], [1129, 298], [1129, 299], [1128, 299], [1128, 300], [1127, 300], [1127, 301], [1126, 301], [1126, 302], [1125, 302], [1125, 303], [1124, 303], [1124, 304], [1123, 304], [1123, 303], [1122, 303], [1122, 302], [1121, 302], [1121, 301], [1120, 301], [1120, 300], [1119, 300], [1119, 299], [1118, 299], [1118, 298], [1117, 298], [1117, 297], [1115, 297], [1115, 296], [1114, 296], [1114, 295], [1113, 295], [1113, 294], [1112, 294], [1112, 293], [1111, 293], [1111, 292], [1110, 292], [1110, 291], [1109, 291], [1109, 290], [1107, 290], [1107, 289], [1106, 289], [1106, 288], [1105, 288], [1105, 287], [1104, 287], [1104, 286], [1103, 286], [1103, 285], [1101, 285], [1101, 284], [1100, 284], [1100, 283], [1099, 283], [1099, 282], [1098, 282], [1098, 281], [1096, 281], [1096, 280], [1095, 280], [1095, 279], [1094, 279], [1094, 278], [1092, 278], [1092, 277], [1091, 277], [1091, 276], [1090, 276], [1090, 275], [1089, 275], [1089, 274], [1087, 274], [1087, 273], [1086, 273], [1086, 272], [1084, 272], [1084, 271], [1083, 271], [1083, 270], [1082, 270], [1082, 269], [1080, 269], [1080, 268], [1079, 268], [1079, 267], [1077, 267], [1077, 266], [1076, 266], [1076, 265], [1074, 265], [1074, 264], [1073, 264], [1073, 263], [1072, 263], [1072, 262], [1070, 262], [1070, 261], [1068, 261], [1068, 260], [1067, 260], [1067, 259], [1065, 259], [1065, 258], [1064, 258], [1064, 257], [1062, 257], [1062, 256], [1061, 256], [1061, 255], [1059, 255], [1059, 254], [1057, 254], [1057, 253], [1056, 253], [1056, 252], [1054, 252], [1054, 251], [1052, 251], [1052, 250], [1051, 250], [1051, 249], [1049, 249], [1049, 248], [1047, 248], [1047, 247], [1045, 247], [1045, 246], [1044, 246], [1044, 245], [1042, 245], [1042, 244], [1040, 244], [1040, 243], [1038, 243], [1038, 242], [1036, 242], [1036, 241], [1034, 241], [1034, 240], [1032, 240], [1032, 239], [1030, 239], [1030, 238], [1028, 238], [1028, 237], [1026, 237], [1026, 236], [1024, 236], [1024, 235], [1022, 235], [1022, 234], [1020, 234], [1020, 233], [1018, 233], [1018, 232], [1016, 232], [1016, 231], [1014, 231], [1014, 230], [1011, 230], [1011, 229], [1009, 229], [1009, 228], [1007, 228], [1007, 227], [1005, 227], [1005, 226], [1002, 226], [1002, 225], [1000, 225], [1000, 224], [997, 224], [997, 223], [995, 223], [995, 222], [992, 222], [992, 221], [990, 221], [990, 220], [987, 220], [987, 219], [984, 219], [984, 218], [981, 218], [981, 217], [978, 217], [978, 216], [975, 216], [975, 215], [972, 215], [972, 214], [969, 214], [969, 213], [966, 213], [966, 212], [963, 212], [963, 211], [960, 211], [960, 210], [956, 210], [956, 209], [952, 209], [952, 208], [949, 208], [949, 207], [945, 207], [945, 206], [941, 206], [941, 205], [936, 205], [936, 204], [932, 204], [932, 203], [927, 203], [927, 202], [922, 202], [922, 201], [917, 201], [917, 200], [911, 200], [911, 199], [905, 199], [905, 198], [897, 198], [897, 197], [889, 197], [889, 196], [887, 196], [887, 146], [888, 146], [888, 143], [887, 143], [887, 139], [888, 139], [888, 136], [887, 136], [887, 133], [888, 133], [888, 132], [899, 132], [899, 133], [900, 133], [900, 134], [911, 134], [911, 135], [920, 135], [920, 136], [929, 136], [929, 137], [936, 137], [936, 138], [943, 138], [943, 139], [949, 139], [949, 140], [954, 140], [954, 141], [959, 141], [959, 142], [964, 142], [964, 143], [968, 143], [968, 144], [973, 144], [973, 142], [972, 142], [972, 141], [968, 141], [968, 140], [964, 140], [964, 139], [959, 139], [959, 138], [954, 138], [954, 137], [948, 137], [948, 136], [942, 136], [942, 135], [935, 135], [935, 134], [928, 134], [928, 133], [920, 133], [920, 132]], 1085, 190, 'O', 13),
  'outfield-right-seats': blockGeometry([[1294, 341], [1295, 341], [1295, 343], [1296, 343], [1296, 345], [1297, 345], [1297, 347], [1298, 347], [1298, 349], [1299, 349], [1299, 352], [1300, 352], [1300, 354], [1301, 354], [1301, 356], [1302, 356], [1302, 359], [1303, 359], [1303, 361], [1304, 361], [1304, 363], [1305, 363], [1305, 366], [1306, 366], [1306, 368], [1307, 368], [1307, 371], [1308, 371], [1308, 373], [1309, 373], [1309, 376], [1310, 376], [1310, 379], [1311, 379], [1311, 381], [1312, 381], [1312, 384], [1313, 384], [1313, 387], [1314, 387], [1314, 390], [1315, 390], [1315, 393], [1316, 393], [1316, 396], [1317, 396], [1317, 399], [1318, 399], [1318, 402], [1319, 402], [1319, 405], [1320, 405], [1320, 408], [1321, 408], [1321, 412], [1322, 412], [1322, 415], [1323, 415], [1323, 419], [1324, 419], [1324, 423], [1325, 423], [1325, 426], [1326, 426], [1326, 430], [1327, 430], [1327, 435], [1328, 435], [1328, 439], [1329, 439], [1329, 443], [1330, 443], [1330, 448], [1331, 448], [1331, 453], [1332, 453], [1332, 459], [1333, 459], [1333, 464], [1334, 464], [1334, 465], [1330, 465], [1330, 466], [1326, 466], [1326, 467], [1322, 467], [1322, 468], [1321, 468], [1321, 472], [1322, 472], [1322, 480], [1323, 480], [1323, 491], [1324, 491], [1324, 512], [1325, 512], [1325, 535], [1324, 535], [1324, 557], [1323, 557], [1323, 569], [1322, 569], [1322, 578], [1321, 578], [1321, 586], [1320, 586], [1320, 593], [1319, 593], [1319, 599], [1318, 599], [1318, 605], [1317, 605], [1317, 610], [1316, 610], [1316, 616], [1315, 616], [1315, 620], [1314, 620], [1314, 625], [1313, 625], [1313, 627], [1314, 627], [1314, 628], [1313, 628], [1313, 629], [1312, 629], [1312, 631], [1311, 631], [1311, 635], [1312, 635], [1312, 636], [1311, 636], [1311, 637], [1310, 637], [1310, 641], [1309, 641], [1309, 645], [1308, 645], [1308, 648], [1307, 648], [1307, 651], [1306, 651], [1306, 655], [1305, 655], [1305, 658], [1304, 658], [1304, 661], [1303, 661], [1303, 664], [1302, 664], [1302, 667], [1301, 667], [1301, 670], [1300, 670], [1300, 673], [1299, 673], [1299, 675], [1298, 675], [1298, 678], [1297, 678], [1297, 681], [1296, 681], [1296, 683], [1295, 683], [1295, 686], [1294, 686], [1294, 688], [1293, 688], [1293, 691], [1292, 691], [1292, 693], [1291, 693], [1291, 695], [1290, 695], [1290, 698], [1289, 698], [1289, 700], [1288, 700], [1288, 702], [1287, 702], [1287, 704], [1286, 704], [1286, 706], [1285, 706], [1285, 708], [1284, 708], [1284, 711], [1283, 711], [1283, 713], [1282, 713], [1282, 715], [1281, 715], [1281, 716], [1280, 716], [1280, 718], [1279, 718], [1279, 720], [1278, 720], [1278, 722], [1277, 722], [1277, 724], [1276, 724], [1276, 726], [1275, 726], [1275, 728], [1274, 728], [1274, 729], [1273, 729], [1273, 731], [1272, 731], [1272, 733], [1271, 733], [1271, 735], [1270, 735], [1270, 736], [1269, 736], [1269, 738], [1268, 738], [1268, 740], [1267, 740], [1267, 741], [1266, 741], [1266, 743], [1265, 743], [1265, 744], [1264, 744], [1264, 746], [1263, 746], [1263, 748], [1262, 748], [1262, 749], [1261, 749], [1261, 751], [1260, 751], [1260, 752], [1259, 752], [1259, 754], [1258, 754], [1258, 755], [1257, 755], [1257, 757], [1256, 757], [1256, 758], [1255, 758], [1255, 759], [1254, 759], [1254, 761], [1253, 761], [1253, 762], [1252, 762], [1252, 764], [1251, 764], [1251, 765], [1250, 765], [1250, 766], [1249, 766], [1249, 768], [1248, 768], [1248, 769], [1247, 769], [1247, 770], [1246, 770], [1246, 772], [1247, 772], [1247, 773], [1249, 773], [1249, 774], [1250, 774], [1250, 775], [1251, 775], [1251, 776], [1253, 776], [1253, 777], [1254, 777], [1254, 778], [1256, 778], [1256, 780], [1255, 780], [1255, 781], [1254, 781], [1254, 782], [1253, 782], [1253, 784], [1252, 784], [1252, 785], [1251, 785], [1251, 786], [1250, 786], [1250, 788], [1249, 788], [1249, 789], [1248, 789], [1248, 790], [1247, 790], [1247, 792], [1246, 792], [1246, 793], [1245, 793], [1245, 794], [1244, 794], [1244, 795], [1243, 795], [1243, 797], [1242, 797], [1242, 798], [1241, 798], [1241, 799], [1240, 799], [1240, 800], [1239, 800], [1239, 801], [1238, 801], [1238, 803], [1237, 803], [1237, 804], [1236, 804], [1236, 805], [1235, 805], [1235, 806], [1234, 806], [1234, 807], [1233, 807], [1233, 809], [1232, 809], [1232, 810], [1231, 810], [1231, 811], [1230, 811], [1230, 812], [1229, 812], [1229, 813], [1228, 813], [1228, 814], [1227, 814], [1227, 815], [1226, 815], [1226, 817], [1225, 817], [1225, 818], [1224, 818], [1224, 819], [1223, 819], [1223, 820], [1222, 820], [1222, 821], [1221, 821], [1221, 822], [1220, 822], [1220, 823], [1219, 823], [1219, 824], [1218, 824], [1218, 825], [1217, 825], [1217, 826], [1216, 826], [1216, 827], [1215, 827], [1215, 828], [1214, 828], [1214, 829], [1213, 829], [1213, 831], [1212, 831], [1212, 832], [1211, 832], [1211, 833], [1210, 833], [1210, 834], [1209, 834], [1209, 835], [1208, 835], [1208, 836], [1207, 836], [1207, 837], [1206, 837], [1206, 838], [1205, 838], [1205, 839], [1203, 839], [1203, 838], [1202, 838], [1202, 837], [1200, 837], [1200, 836], [1199, 836], [1199, 835], [1198, 835], [1198, 834], [1196, 834], [1196, 833], [1195, 833], [1195, 832], [1194, 832], [1194, 831], [1192, 831], [1192, 830], [1191, 830], [1191, 829], [1190, 829], [1190, 828], [1188, 828], [1188, 827], [1187, 827], [1187, 826], [1185, 826], [1185, 825], [1184, 825], [1184, 822], [1185, 822], [1185, 821], [1186, 821], [1186, 820], [1187, 820], [1187, 819], [1188, 819], [1188, 818], [1189, 818], [1189, 816], [1190, 816], [1190, 815], [1191, 815], [1191, 814], [1192, 814], [1192, 813], [1193, 813], [1193, 812], [1194, 812], [1194, 810], [1195, 810], [1195, 809], [1196, 809], [1196, 808], [1197, 808], [1197, 807], [1198, 807], [1198, 805], [1199, 805], [1199, 804], [1200, 804], [1200, 803], [1201, 803], [1201, 801], [1202, 801], [1202, 800], [1203, 800], [1203, 799], [1204, 799], [1204, 798], [1205, 798], [1205, 796], [1206, 796], [1206, 795], [1207, 795], [1207, 794], [1208, 794], [1208, 792], [1209, 792], [1209, 791], [1210, 791], [1210, 790], [1211, 790], [1211, 788], [1212, 788], [1212, 787], [1213, 787], [1213, 785], [1214, 785], [1214, 784], [1215, 784], [1215, 783], [1216, 783], [1216, 781], [1217, 781], [1217, 780], [1218, 780], [1218, 778], [1219, 778], [1219, 777], [1220, 777], [1220, 775], [1221, 775], [1221, 774], [1222, 774], [1222, 772], [1223, 772], [1223, 771], [1224, 771], [1224, 769], [1225, 769], [1225, 768], [1226, 768], [1226, 766], [1227, 766], [1227, 765], [1228, 765], [1228, 764], [1229, 764], [1229, 763], [1230, 763], [1230, 760], [1231, 760], [1231, 759], [1232, 759], [1232, 757], [1233, 757], [1233, 755], [1234, 755], [1234, 754], [1235, 754], [1235, 752], [1236, 752], [1236, 750], [1237, 750], [1237, 749], [1238, 749], [1238, 747], [1239, 747], [1239, 745], [1240, 745], [1240, 743], [1241, 743], [1241, 742], [1242, 742], [1242, 740], [1243, 740], [1243, 738], [1244, 738], [1244, 736], [1245, 736], [1245, 735], [1246, 735], [1246, 733], [1247, 733], [1247, 731], [1248, 731], [1248, 729], [1249, 729], [1249, 727], [1250, 727], [1250, 725], [1251, 725], [1251, 723], [1252, 723], [1252, 721], [1253, 721], [1253, 719], [1254, 719], [1254, 717], [1255, 717], [1255, 715], [1256, 715], [1256, 713], [1257, 713], [1257, 711], [1258, 711], [1258, 709], [1259, 709], [1259, 706], [1260, 706], [1260, 704], [1261, 704], [1261, 702], [1262, 702], [1262, 700], [1263, 700], [1263, 697], [1264, 697], [1264, 695], [1265, 695], [1265, 692], [1266, 692], [1266, 689], [1267, 689], [1267, 687], [1268, 687], [1268, 683], [1266, 683], [1266, 682], [1263, 682], [1263, 681], [1260, 681], [1260, 680], [1258, 680], [1258, 679], [1255, 679], [1255, 678], [1252, 678], [1252, 677], [1249, 677], [1249, 676], [1247, 676], [1247, 675], [1244, 675], [1244, 674], [1242, 674], [1242, 673], [1239, 673], [1239, 672], [1237, 672], [1237, 671], [1234, 671], [1234, 670], [1232, 670], [1232, 669], [1229, 669], [1229, 668], [1226, 668], [1226, 667], [1224, 667], [1224, 666], [1221, 666], [1221, 665], [1219, 665], [1219, 664], [1217, 664], [1217, 661], [1218, 661], [1218, 658], [1219, 658], [1219, 654], [1220, 654], [1220, 650], [1221, 650], [1221, 646], [1222, 646], [1222, 642], [1223, 642], [1223, 638], [1224, 638], [1224, 633], [1225, 633], [1225, 628], [1226, 628], [1226, 622], [1227, 622], [1227, 616], [1228, 616], [1228, 609], [1229, 609], [1229, 601], [1230, 601], [1230, 591], [1231, 591], [1231, 575], [1232, 575], [1232, 547], [1231, 547], [1231, 531], [1230, 531], [1230, 521], [1229, 521], [1229, 513], [1228, 513], [1228, 506], [1227, 506], [1227, 500], [1226, 500], [1226, 494], [1225, 494], [1225, 489], [1224, 489], [1224, 485], [1223, 485], [1223, 480], [1222, 480], [1222, 476], [1221, 476], [1221, 472], [1220, 472], [1220, 468], [1219, 468], [1219, 465], [1218, 465], [1218, 461], [1217, 461], [1217, 458], [1216, 458], [1216, 454], [1215, 454], [1215, 451], [1214, 451], [1214, 448], [1213, 448], [1213, 445], [1212, 445], [1212, 442], [1211, 442], [1211, 440], [1210, 440], [1210, 437], [1209, 437], [1209, 434], [1208, 434], [1208, 432], [1207, 432], [1207, 429], [1206, 429], [1206, 427], [1205, 427], [1205, 424], [1204, 424], [1204, 422], [1203, 422], [1203, 419], [1202, 419], [1202, 417], [1201, 417], [1201, 415], [1200, 415], [1200, 413], [1199, 413], [1199, 410], [1198, 410], [1198, 408], [1197, 408], [1197, 406], [1196, 406], [1196, 404], [1195, 404], [1195, 402], [1194, 402], [1194, 400], [1193, 400], [1193, 398], [1192, 398], [1192, 396], [1191, 396], [1191, 394], [1190, 394], [1190, 392], [1191, 392], [1191, 391], [1193, 391], [1193, 390], [1195, 390], [1195, 389], [1197, 389], [1197, 388], [1199, 388], [1199, 387], [1201, 387], [1201, 386], [1203, 386], [1203, 385], [1205, 385], [1205, 384], [1207, 384], [1207, 383], [1209, 383], [1209, 382], [1211, 382], [1211, 381], [1213, 381], [1213, 380], [1215, 380], [1215, 379], [1217, 379], [1217, 378], [1219, 378], [1219, 377], [1222, 377], [1222, 376], [1224, 376], [1224, 375], [1226, 375], [1226, 374], [1228, 374], [1228, 373], [1230, 373], [1230, 372], [1232, 372], [1232, 371], [1234, 371], [1234, 370], [1236, 370], [1236, 369], [1238, 369], [1238, 368], [1240, 368], [1240, 367], [1242, 367], [1242, 366], [1244, 366], [1244, 365], [1246, 365], [1246, 364], [1248, 364], [1248, 363], [1250, 363], [1250, 362], [1252, 362], [1252, 361], [1254, 361], [1254, 360], [1257, 360], [1257, 359], [1259, 359], [1259, 358], [1261, 358], [1261, 357], [1263, 357], [1263, 356], [1265, 356], [1265, 355], [1267, 355], [1267, 354], [1269, 354], [1269, 353], [1271, 353], [1271, 352], [1273, 352], [1273, 351], [1275, 351], [1275, 350], [1277, 350], [1277, 349], [1279, 349], [1279, 348], [1281, 348], [1281, 347], [1283, 347], [1283, 346], [1285, 346], [1285, 345], [1287, 345], [1287, 344], [1290, 344], [1290, 343], [1292, 343], [1292, 342], [1294, 342]], 1275, 420, 'O', 13),
  'bleachers-table-left': multiBlockGeometry([
    [[880, 102], [917, 102], [917, 103], [934, 103], [934, 104], [945, 104], [945, 105], [954, 105], [954, 106], [961, 106], [961, 107], [967, 107], [967, 108], [973, 108], [973, 109], [978, 109], [978, 110], [982, 110], [982, 113], [981, 113], [981, 116], [980, 116], [980, 119], [979, 119], [979, 122], [978, 122], [978, 126], [977, 126], [977, 129], [976, 129], [976, 130], [973, 130], [973, 129], [969, 129], [969, 128], [964, 128], [964, 127], [959, 127], [959, 126], [954, 126], [954, 125], [948, 125], [948, 124], [941, 124], [941, 123], [933, 123], [933, 122], [923, 122], [923, 121], [909, 121], [909, 120], [866, 120], [866, 119], [868, 119], [868, 118], [869, 118], [869, 117], [870, 117], [870, 116], [871, 116], [871, 115], [872, 115], [872, 113], [873, 113], [873, 104], [872, 104], [872, 103], [880, 103]],
    [[841, 105], [850, 105], [850, 113], [851, 113], [851, 115], [852, 115], [852, 116], [853, 116], [853, 117], [854, 117], [854, 118], [855, 118], [855, 119], [857, 119], [857, 120], [862, 120], [862, 121], [847, 121], [847, 122], [836, 122], [836, 123], [826, 123], [826, 124], [818, 124], [818, 125], [811, 125], [811, 126], [804, 126], [804, 127], [798, 127], [798, 128], [792, 128], [792, 129], [786, 129], [786, 130], [781, 130], [781, 131], [776, 131], [776, 132], [771, 132], [771, 133], [766, 133], [766, 134], [762, 134], [762, 135], [757, 135], [757, 136], [753, 136], [753, 137], [749, 137], [749, 138], [745, 138], [745, 139], [741, 139], [741, 140], [737, 140], [737, 141], [734, 141], [734, 142], [730, 142], [730, 143], [727, 143], [727, 144], [723, 144], [723, 145], [720, 145], [720, 146], [718, 146], [718, 145], [717, 145], [717, 143], [716, 143], [716, 141], [715, 141], [715, 138], [714, 138], [714, 137], [715, 137], [715, 136], [718, 136], [718, 135], [721, 135], [721, 134], [723, 134], [723, 133], [726, 133], [726, 132], [729, 132], [729, 131], [732, 131], [732, 130], [735, 130], [735, 129], [738, 129], [738, 128], [741, 128], [741, 127], [744, 127], [744, 126], [747, 126], [747, 125], [750, 125], [750, 124], [754, 124], [754, 123], [757, 123], [757, 122], [760, 122], [760, 121], [764, 121], [764, 120], [768, 120], [768, 119], [772, 119], [772, 118], [776, 118], [776, 117], [780, 117], [780, 116], [784, 116], [784, 115], [788, 115], [788, 114], [793, 114], [793, 113], [798, 113], [798, 112], [803, 112], [803, 111], [808, 111], [808, 110], [814, 110], [814, 109], [819, 109], [819, 108], [826, 108], [826, 107], [833, 107], [833, 106], [841, 106]]
  ], 900, 116, 'P', 13),
  'bleachers-table-right': multiBlockGeometry([
    [[1333, 465], [1334, 465], [1334, 470], [1335, 470], [1335, 477], [1336, 477], [1336, 486], [1337, 486], [1337, 498], [1338, 498], [1338, 516], [1339, 516], [1339, 547], [1338, 547], [1338, 565], [1337, 565], [1337, 576], [1336, 576], [1336, 585], [1335, 585], [1335, 592], [1334, 592], [1334, 599], [1333, 599], [1333, 605], [1332, 605], [1332, 610], [1331, 610], [1331, 615], [1330, 615], [1330, 620], [1329, 620], [1329, 624], [1328, 624], [1328, 623], [1325, 623], [1325, 622], [1321, 622], [1321, 623], [1318, 623], [1318, 624], [1316, 624], [1316, 625], [1315, 625], [1315, 626], [1314, 626], [1314, 623], [1315, 623], [1315, 619], [1316, 619], [1316, 614], [1317, 614], [1317, 609], [1318, 609], [1318, 603], [1319, 603], [1319, 597], [1320, 597], [1320, 591], [1321, 591], [1321, 583], [1322, 583], [1322, 575], [1323, 575], [1323, 565], [1324, 565], [1324, 552], [1325, 552], [1325, 495], [1324, 495], [1324, 483], [1323, 483], [1323, 474], [1322, 474], [1322, 468], [1325, 468], [1325, 467], [1329, 467], [1329, 466], [1333, 466]],
    [[1311, 638], [1312, 638], [1312, 640], [1313, 640], [1313, 641], [1314, 641], [1314, 642], [1315, 642], [1315, 643], [1316, 643], [1316, 644], [1317, 644], [1317, 645], [1320, 645], [1320, 646], [1323, 646], [1323, 648], [1322, 648], [1322, 652], [1321, 652], [1321, 655], [1320, 655], [1320, 658], [1319, 658], [1319, 661], [1318, 661], [1318, 664], [1317, 664], [1317, 667], [1316, 667], [1316, 670], [1315, 670], [1315, 673], [1314, 673], [1314, 676], [1313, 676], [1313, 678], [1312, 678], [1312, 681], [1311, 681], [1311, 684], [1310, 684], [1310, 686], [1309, 686], [1309, 689], [1308, 689], [1308, 691], [1307, 691], [1307, 694], [1306, 694], [1306, 696], [1305, 696], [1305, 698], [1304, 698], [1304, 701], [1303, 701], [1303, 703], [1302, 703], [1302, 705], [1301, 705], [1301, 707], [1300, 707], [1300, 709], [1299, 709], [1299, 711], [1298, 711], [1298, 714], [1297, 714], [1297, 716], [1296, 716], [1296, 718], [1295, 718], [1295, 720], [1294, 720], [1294, 722], [1293, 722], [1293, 723], [1292, 723], [1292, 725], [1291, 725], [1291, 727], [1290, 727], [1290, 729], [1289, 729], [1289, 731], [1288, 731], [1288, 733], [1287, 733], [1287, 734], [1286, 734], [1286, 736], [1285, 736], [1285, 738], [1284, 738], [1284, 740], [1283, 740], [1283, 741], [1282, 741], [1282, 743], [1281, 743], [1281, 745], [1280, 745], [1280, 746], [1279, 746], [1279, 748], [1278, 748], [1278, 750], [1277, 750], [1277, 751], [1276, 751], [1276, 753], [1275, 753], [1275, 754], [1274, 754], [1274, 756], [1273, 756], [1273, 757], [1272, 757], [1272, 759], [1271, 759], [1271, 760], [1270, 760], [1270, 762], [1269, 762], [1269, 763], [1268, 763], [1268, 764], [1267, 764], [1267, 766], [1266, 766], [1266, 767], [1265, 767], [1265, 769], [1264, 769], [1264, 770], [1263, 770], [1263, 771], [1262, 771], [1262, 773], [1261, 773], [1261, 774], [1260, 774], [1260, 775], [1259, 775], [1259, 776], [1258, 776], [1258, 777], [1257, 777], [1257, 778], [1255, 778], [1255, 777], [1254, 777], [1254, 776], [1253, 776], [1253, 775], [1251, 775], [1251, 774], [1250, 774], [1250, 773], [1248, 773], [1248, 772], [1247, 772], [1247, 770], [1248, 770], [1248, 769], [1249, 769], [1249, 767], [1250, 767], [1250, 766], [1251, 766], [1251, 765], [1252, 765], [1252, 763], [1253, 763], [1253, 762], [1254, 762], [1254, 761], [1255, 761], [1255, 759], [1256, 759], [1256, 758], [1257, 758], [1257, 756], [1258, 756], [1258, 755], [1259, 755], [1259, 753], [1260, 753], [1260, 752], [1261, 752], [1261, 750], [1262, 750], [1262, 749], [1263, 749], [1263, 747], [1264, 747], [1264, 746], [1265, 746], [1265, 744], [1266, 744], [1266, 743], [1267, 743], [1267, 741], [1268, 741], [1268, 739], [1269, 739], [1269, 738], [1270, 738], [1270, 736], [1271, 736], [1271, 734], [1272, 734], [1272, 733], [1273, 733], [1273, 731], [1274, 731], [1274, 729], [1275, 729], [1275, 727], [1276, 727], [1276, 725], [1277, 725], [1277, 724], [1278, 724], [1278, 722], [1279, 722], [1279, 720], [1280, 720], [1280, 718], [1281, 718], [1281, 716], [1282, 716], [1282, 714], [1283, 714], [1283, 712], [1284, 712], [1284, 710], [1285, 710], [1285, 708], [1286, 708], [1286, 706], [1287, 706], [1287, 704], [1288, 704], [1288, 701], [1289, 701], [1289, 699], [1290, 699], [1290, 697], [1291, 697], [1291, 695], [1292, 695], [1292, 692], [1293, 692], [1293, 690], [1294, 690], [1294, 688], [1295, 688], [1295, 685], [1296, 685], [1296, 683], [1297, 683], [1297, 680], [1298, 680], [1298, 677], [1299, 677], [1299, 675], [1300, 675], [1300, 672], [1301, 672], [1301, 669], [1302, 669], [1302, 666], [1303, 666], [1303, 663], [1304, 663], [1304, 660], [1305, 660], [1305, 657], [1306, 657], [1306, 654], [1307, 654], [1307, 650], [1308, 650], [1308, 647], [1309, 647], [1309, 643], [1310, 643], [1310, 640], [1311, 640]]
  ], 1318, 645, 'P', 13),
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

export const GWANGJU_OFFICIAL_TRACE_REFERENCE: Record<string, GwangjuOfficialTraceReference> = {
  'k5-101': { numberAnchor: { x: 1096, y: 820 }, expectedBounds: { minX: 1068.5, minY: 798.7, maxX: 1140, maxY: 841.2 }, expectedSubpathCount: 1 },
  'k5-102': { numberAnchor: { x: 1038, y: 820 }, expectedBounds: { minX: 1011, minY: 798.2, maxX: 1065.5, maxY: 846 }, expectedSubpathCount: 1 },
  'k5-103': { numberAnchor: { x: 990, y: 832 }, expectedBounds: { minX: 959.7, minY: 801.9, maxX: 1011.3, maxY: 858 }, expectedSubpathCount: 1 },
  'k5-104': { numberAnchor: { x: 938, y: 852 }, expectedBounds: { minX: 908.5, minY: 812.6, maxX: 961.8, maxY: 878 }, expectedSubpathCount: 1 },
  'k5-105': { numberAnchor: { x: 890, y: 870 }, expectedBounds: { minX: 860.5, minY: 826.4, maxX: 911.5, maxY: 900 }, expectedSubpathCount: 1 },
  'k5-106': { numberAnchor: { x: 845, y: 886 }, expectedBounds: { minX: 825, minY: 838.9, maxX: 866.5, maxY: 915.7 }, expectedSubpathCount: 1 },
  'k7-107': { numberAnchor: { x: 805, y: 888 }, expectedBounds: { minX: 781.8, minY: 844.8, maxX: 823.2, maxY: 911.6 }, expectedSubpathCount: 1 },
  'k7-108': { numberAnchor: { x: 760, y: 894 }, expectedBounds: { minX: 736.7, minY: 848.6, maxX: 781.7, maxY: 931.1 }, expectedSubpathCount: 1 },
  'k7-109': { numberAnchor: { x: 725, y: 902 }, expectedBounds: { minX: 698.5, minY: 852.4, maxX: 748.4, maxY: 934.9 }, expectedSubpathCount: 1 },
  'k7-110': { numberAnchor: { x: 670, y: 900 }, expectedBounds: { minX: 638.3, minY: 854, maxX: 697.7, maxY: 933.2 }, expectedSubpathCount: 1 },
  'k7-111': { numberAnchor: { x: 630, y: 892 }, expectedBounds: { minX: 605, minY: 834, maxX: 650, maxY: 936 }, expectedSubpathCount: 1 },
  'k9-112': { numberAnchor: { x: 586, y: 884 }, expectedBounds: { minX: 566, minY: 829, maxX: 618, maxY: 933 }, expectedSubpathCount: 1 },
  'k9-113': { numberAnchor: { x: 535, y: 880 }, expectedBounds: { minX: 505, minY: 795, maxX: 594, maxY: 920 }, expectedSubpathCount: 1 },
  'k9-116': { numberAnchor: { x: 472, y: 730 }, expectedBounds: { minX: 388, minY: 697, maxX: 501, maxY: 760 }, expectedSubpathCount: 1 },
  'k9-117': { numberAnchor: { x: 480, y: 680 }, expectedBounds: { minX: 390, minY: 658, maxX: 503, maxY: 698 }, expectedSubpathCount: 1 },
  'k7-118': { numberAnchor: { x: 480, y: 650 }, expectedBounds: { minX: 395, minY: 615, maxX: 512, maxY: 669 }, expectedSubpathCount: 1 },
  'k7-119': { numberAnchor: { x: 480, y: 604 }, expectedBounds: { minX: 404, minY: 573, maxX: 520, maxY: 626 }, expectedSubpathCount: 1 },
  'k7-120': { numberAnchor: { x: 496, y: 558 }, expectedBounds: { minX: 412, minY: 533, maxX: 519, maxY: 582 }, expectedSubpathCount: 1 },
  'k7-121': { numberAnchor: { x: 506, y: 508 }, expectedBounds: { minX: 454, minY: 477, maxX: 544, maxY: 538 }, expectedSubpathCount: 1 },
  'k7-122': { numberAnchor: { x: 536, y: 464 }, expectedBounds: { minX: 485, minY: 428, maxX: 576, maxY: 491 }, expectedSubpathCount: 1 },
  'k8-123': { numberAnchor: { x: 578, y: 426 }, expectedBounds: { minX: 522.9, minY: 403.9, maxX: 630.7, maxY: 451 }, expectedSubpathCount: 1 },
  'k5-124': { numberAnchor: { x: 580, y: 384 }, expectedBounds: { minX: 525.2, minY: 349.3, maxX: 657.1, maxY: 406.5 }, expectedSubpathCount: 1 },
  'k5-125': { numberAnchor: { x: 600, y: 342 }, expectedBounds: { minX: 544.8, minY: 308.2, maxX: 677.4, maxY: 388 }, expectedSubpathCount: 1 },
  'k5-126': { numberAnchor: { x: 615, y: 318 }, expectedBounds: { minX: 553.4, minY: 270.5, maxX: 646.5, maxY: 338 }, expectedSubpathCount: 1 },
  'k5-127': { numberAnchor: { x: 680, y: 288 }, expectedBounds: { minX: 650.7, minY: 245.4, maxX: 718, maxY: 338 }, expectedSubpathCount: 1 },
  'sky-picnic-s-301': { numberAnchor: { x: 1095, y: 946 }, expectedBounds: { minX: 1076.2, minY: 926.7, maxX: 1114.6, maxY: 957.8 }, expectedSubpathCount: 1 },
  'sky-picnic-s-302': { numberAnchor: { x: 1060, y: 952 }, expectedBounds: { minX: 1039.9, minY: 932.9, maxX: 1077.7, maxY: 968.6 }, expectedSubpathCount: 1 },
  'sky-picnic-s-303': { numberAnchor: { x: 1022, y: 958 }, expectedBounds: { minX: 1002.3, minY: 938.9, maxX: 1041.3, maxY: 976.2 }, expectedSubpathCount: 1 },
  'sky-picnic-s-304': { numberAnchor: { x: 984, y: 963 }, expectedBounds: { minX: 963.4, minY: 944.3, maxX: 1003.5, maxY: 981.2 }, expectedSubpathCount: 1 },
  'sky-picnic-s-305': { numberAnchor: { x: 943, y: 967 }, expectedBounds: { minX: 923.2, minY: 948.7, maxX: 963.6, maxY: 984.4 }, expectedSubpathCount: 1 },
  'sky-picnic-s-306': { numberAnchor: { x: 902, y: 969 }, expectedBounds: { minX: 882.1, minY: 951.6, maxX: 921.8, maxY: 985.9 }, expectedSubpathCount: 1 },
  'sky-picnic-s-307': { numberAnchor: { x: 860, y: 970 }, expectedBounds: { minX: 840.5, minY: 953, maxX: 879.9, maxY: 986.5 }, expectedSubpathCount: 1 },
  'sky-picnic-s-308': { numberAnchor: { x: 818, y: 970 }, expectedBounds: { minX: 797.6, minY: 953.1, maxX: 837.5, maxY: 986.5 }, expectedSubpathCount: 1 },
  'sky-picnic-s-309': { numberAnchor: { x: 775, y: 969 }, expectedBounds: { minX: 754.7, minY: 951.6, maxX: 795.3, maxY: 985.9 }, expectedSubpathCount: 1 },
  'sky-picnic-s-310': { numberAnchor: { x: 733, y: 967 }, expectedBounds: { minX: 711.8, minY: 949.1, maxX: 753.3, maxY: 984.4 }, expectedSubpathCount: 1 },
  'sky-picnic-s-311': { numberAnchor: { x: 690, y: 964 }, expectedBounds: { minX: 667.6, minY: 945.2, maxX: 711.2, maxY: 981.9 }, expectedSubpathCount: 1 },
  'sky-picnic-s-312': { numberAnchor: { x: 646, y: 959 }, expectedBounds: { minX: 624.5, minY: 940.3, maxX: 668.4, maxY: 977.7 }, expectedSubpathCount: 1 },
  'sky-picnic-s-313': { numberAnchor: { x: 604, y: 954 }, expectedBounds: { minX: 582.2, minY: 934.9, maxX: 625.5, maxY: 972.7 }, expectedSubpathCount: 1 },
  'sky-picnic-s-314': { numberAnchor: { x: 562, y: 948 }, expectedBounds: { minX: 538.3, minY: 926.5, maxX: 583.9, maxY: 967 }, expectedSubpathCount: 1 },
  'sky-picnic-s-315': { numberAnchor: { x: 521, y: 936 }, expectedBounds: { minX: 495.9, minY: 914.2, maxX: 544.7, maxY: 957.4 }, expectedSubpathCount: 1 },
  'sky-picnic-s-316': { numberAnchor: { x: 472, y: 928 }, expectedBounds: { minX: 444, minY: 907.3, maxX: 497.5, maxY: 948 }, expectedSubpathCount: 1 },
  'sky-picnic-s-317': { numberAnchor: { x: 438, y: 903 }, expectedBounds: { minX: 410, minY: 878, maxX: 465.6, maxY: 923 }, expectedSubpathCount: 1 },
  'sky-picnic-s-318': { numberAnchor: { x: 397, y: 850 }, expectedBounds: { minX: 386, minY: 817, maxX: 426, maxY: 885.2 }, expectedSubpathCount: 1 },
  'sky-picnic-s-319': { numberAnchor: { x: 360, y: 789 }, expectedBounds: { minX: 343, minY: 771, maxX: 391, maxY: 817 }, expectedSubpathCount: 1 },
  'sky-picnic-s-320': { numberAnchor: { x: 362, y: 751 }, expectedBounds: { minX: 340, minY: 736.2, maxX: 376.9, maxY: 769 }, expectedSubpathCount: 1 },
  'sky-picnic-s-321': { numberAnchor: { x: 360, y: 717 }, expectedBounds: { minX: 338, minY: 700.7, maxX: 385.9, maxY: 733.9 }, expectedSubpathCount: 1 },
  'sky-picnic-s-322': { numberAnchor: { x: 361, y: 682 }, expectedBounds: { minX: 339, minY: 665, maxX: 387, maxY: 697.7 }, expectedSubpathCount: 1 },
  'sky-picnic-s-323': { numberAnchor: { x: 354, y: 657 }, expectedBounds: { minX: 341, minY: 644, maxX: 388.3, maxY: 665.6 }, expectedSubpathCount: 1 },
  'sky-picnic-s-324': { numberAnchor: { x: 359, y: 632 }, expectedBounds: { minX: 347, minY: 620, maxX: 393, maxY: 642 }, expectedSubpathCount: 1 },
  'sky-picnic-s-325': { numberAnchor: { x: 365, y: 610 }, expectedBounds: { minX: 353.5, minY: 598.7, maxX: 398.1, maxY: 620 }, expectedSubpathCount: 1 },
  'sky-picnic-s-326': { numberAnchor: { x: 371, y: 590 }, expectedBounds: { minX: 359.3, minY: 578.2, maxX: 403.1, maxY: 598 }, expectedSubpathCount: 1 },
  'sky-picnic-s-327': { numberAnchor: { x: 377, y: 569 }, expectedBounds: { minX: 365, minY: 556.9, maxX: 407.6, maxY: 577 }, expectedSubpathCount: 1 },
  'sky-picnic-s-328': { numberAnchor: { x: 384, y: 549 }, expectedBounds: { minX: 371, minY: 537, maxX: 412.2, maxY: 555 }, expectedSubpathCount: 1 },
  'sky-picnic-s-329': { numberAnchor: { x: 391, y: 530 }, expectedBounds: { minX: 378, minY: 517.8, maxX: 417.5, maxY: 535 }, expectedSubpathCount: 1 },
  'sky-picnic-s-330': { numberAnchor: { x: 398, y: 510 }, expectedBounds: { minX: 386, minY: 497.9, maxX: 422.7, maxY: 514 }, expectedSubpathCount: 1 },
  'sky-picnic-s-331': { numberAnchor: { x: 406, y: 492 }, expectedBounds: { minX: 392.7, minY: 484.6, maxX: 429.3, maxY: 502 }, expectedSubpathCount: 1 },
  'sky-picnic-s-332': { numberAnchor: { x: 415, y: 473 }, expectedBounds: { minX: 400, minY: 465, maxX: 437.2, maxY: 483.4 }, expectedSubpathCount: 1 },
  'sky-picnic-s-333': { numberAnchor: { x: 425, y: 455 }, expectedBounds: { minX: 408.5, minY: 445.9, maxX: 445.8, maxY: 464.1 }, expectedSubpathCount: 1 },
  'sky-picnic-s-334': { numberAnchor: { x: 435, y: 437 }, expectedBounds: { minX: 417.2, minY: 427.1, maxX: 458.5, maxY: 445.1 }, expectedSubpathCount: 1 },
  'sky-picnic-s-335': { numberAnchor: { x: 438, y: 419 }, expectedBounds: { minX: 410, minY: 410, maxX: 463, maxY: 426.6 }, expectedSubpathCount: 1 },
  'five-table-501': { numberAnchor: { x: 1097, y: 970 }, expectedBounds: { minX: 1076, minY: 953, maxX: 1117, maxY: 987 }, expectedSubpathCount: 1 },
  'five-table-502': { numberAnchor: { x: 1054, y: 987 }, expectedBounds: { minX: 1032, minY: 966, maxX: 1076, maxY: 1007 }, expectedSubpathCount: 1 },
  'five-table-503': { numberAnchor: { x: 1010, y: 1001 }, expectedBounds: { minX: 985, minY: 978, maxX: 1034, maxY: 1024 }, expectedSubpathCount: 1 },
  'five-table-504': { numberAnchor: { x: 963, y: 1013 }, expectedBounds: { minX: 938, minY: 989.8, maxX: 988, maxY: 1037 }, expectedSubpathCount: 1 },
  'five-table-505': { numberAnchor: { x: 919, y: 1024 }, expectedBounds: { minX: 895, minY: 1000, maxX: 942, maxY: 1048 }, expectedSubpathCount: 1 },
  'five-table-506': { numberAnchor: { x: 873, y: 1035 }, expectedBounds: { minX: 847, minY: 1010, maxX: 898, maxY: 1059 }, expectedSubpathCount: 1 },
  'five-table-507': { numberAnchor: { x: 825, y: 1044 }, expectedBounds: { minX: 801, minY: 1020, maxX: 848, maxY: 1067 }, expectedSubpathCount: 1 },
  'five-table-508': { numberAnchor: { x: 776, y: 1048 }, expectedBounds: { minX: 752, minY: 1026, maxX: 799, maxY: 1069 }, expectedSubpathCount: 1 },
  'five-table-509': { numberAnchor: { x: 724, y: 1047 }, expectedBounds: { minX: 700, minY: 1024, maxX: 747, maxY: 1070 }, expectedSubpathCount: 1 },
  'five-table-510': { numberAnchor: { x: 678, y: 1042 }, expectedBounds: { minX: 654, minY: 1016, maxX: 701.2, maxY: 1067 }, expectedSubpathCount: 1 },
  'five-table-511': { numberAnchor: { x: 631, y: 1038 }, expectedBounds: { minX: 605, minY: 1012, maxX: 655, maxY: 1062 }, expectedSubpathCount: 1 },
  'five-table-512': { numberAnchor: { x: 583, y: 1030 }, expectedBounds: { minX: 558, minY: 1005, maxX: 606, maxY: 1054 }, expectedSubpathCount: 1 },
  'five-table-513': { numberAnchor: { x: 530, y: 1018 }, expectedBounds: { minX: 502, minY: 995, maxX: 558, maxY: 1043.8 }, expectedSubpathCount: 1 },
  'five-table-514': { numberAnchor: { x: 485, y: 1001 }, expectedBounds: { minX: 458, minY: 974, maxX: 511, maxY: 1028 }, expectedSubpathCount: 1 },
  'five-table-515': { numberAnchor: { x: 445, y: 980 }, expectedBounds: { minX: 417, minY: 954, maxX: 471, maxY: 1008.9 }, expectedSubpathCount: 1 },
  'five-table-516': { numberAnchor: { x: 411, y: 953 }, expectedBounds: { minX: 381, minY: 923.3, maxX: 439, maxY: 981.8 }, expectedSubpathCount: 1 },
  'five-table-517': { numberAnchor: { x: 379, y: 924 }, expectedBounds: { minX: 348, minY: 895, maxX: 408.9, maxY: 954 }, expectedSubpathCount: 1 },
  'five-table-518': { numberAnchor: { x: 351, y: 890 }, expectedBounds: { minX: 319, minY: 861, maxX: 382, maxY: 919 }, expectedSubpathCount: 1 },
  'five-table-519': { numberAnchor: { x: 329, y: 855 }, expectedBounds: { minX: 297, minY: 827, maxX: 361, maxY: 882 }, expectedSubpathCount: 1 },
  'five-table-520': { numberAnchor: { x: 311, y: 815 }, expectedBounds: { minX: 281, minY: 789, maxX: 341, maxY: 841 }, expectedSubpathCount: 1 },
  'five-table-521': { numberAnchor: { x: 301, y: 776 }, expectedBounds: { minX: 272, minY: 754, maxX: 328.7, maxY: 798 }, expectedSubpathCount: 1 },
  'five-table-522': { numberAnchor: { x: 296, y: 734 }, expectedBounds: { minX: 269, minY: 713, maxX: 322, maxY: 754 }, expectedSubpathCount: 1 },
  'five-table-523': { numberAnchor: { x: 296, y: 689 }, expectedBounds: { minX: 270, minY: 668, maxX: 322, maxY: 709 }, expectedSubpathCount: 1 },
  'five-table-524': { numberAnchor: { x: 301, y: 647 }, expectedBounds: { minX: 274, minY: 623.1, maxX: 327, maxY: 669 }, expectedSubpathCount: 1 },
  'five-table-525': { numberAnchor: { x: 308, y: 602 }, expectedBounds: { minX: 281, minY: 578, maxX: 334, maxY: 625.8 }, expectedSubpathCount: 1 },
  'five-table-526': { numberAnchor: { x: 315, y: 557 }, expectedBounds: { minX: 289, minY: 533, maxX: 340, maxY: 581 }, expectedSubpathCount: 1 },
  'five-table-527': { numberAnchor: { x: 325, y: 512 }, expectedBounds: { minX: 298.2, minY: 486, maxX: 351.9, maxY: 536 }, expectedSubpathCount: 1 },
  'five-table-528': { numberAnchor: { x: 340, y: 468 }, expectedBounds: { minX: 312, minY: 444, maxX: 367, maxY: 494 }, expectedSubpathCount: 1 },
  'five-table-529': { numberAnchor: { x: 359, y: 425 }, expectedBounds: { minX: 330, minY: 399, maxX: 387.8, maxY: 452 }, expectedSubpathCount: 1 },
  'five-table-530': { numberAnchor: { x: 382, y: 386 }, expectedBounds: { minX: 352, minY: 358, maxX: 409, maxY: 413 }, expectedSubpathCount: 1 },
  'five-table-531': { numberAnchor: { x: 408, y: 349 }, expectedBounds: { minX: 379, minY: 323, maxX: 435.9, maxY: 376 }, expectedSubpathCount: 1 },
  'five-table-532': { numberAnchor: { x: 434, y: 310 }, expectedBounds: { minX: 405, minY: 283, maxX: 459.8, maxY: 337 }, expectedSubpathCount: 1 },
  'five-table-533': { numberAnchor: { x: 461, y: 274 }, expectedBounds: { minX: 433, minY: 248, maxX: 487.3, maxY: 299 }, expectedSubpathCount: 1 },
  'five-table-534': { numberAnchor: { x: 490, y: 238 }, expectedBounds: { minX: 463, minY: 214, maxX: 517, maxY: 261 }, expectedSubpathCount: 1 },
  'five-table-535': { numberAnchor: { x: 522, y: 203 }, expectedBounds: { minX: 497, minY: 184, maxX: 546, maxY: 222 }, expectedSubpathCount: 1 },
  'champion-seats': { numberAnchor: { x: 500, y: 792 }, expectedBounds: { minX: 461, minY: 740, maxX: 559, maxY: 843 }, expectedSubpathCount: 1 },
  'central-table-seats': { numberAnchor: { x: 430, y: 824 }, expectedBounds: { minX: 397, minY: 755, maxX: 523, maxY: 895 }, expectedSubpathCount: 1 },
  'disabled-seats-center': { numberAnchor: { x: 390, y: 755 }, expectedBounds: { minX: 375.7, minY: 738, maxX: 410, maxY: 773.6 }, expectedSubpathCount: 1 },
  'first-surprise-seats': { numberAnchor: { x: 870, y: 800 }, expectedBounds: { minX: 714, minY: 772, maxX: 959, maxY: 848 }, expectedSubpathCount: 1 },
  'third-surprise-seats': { numberAnchor: { x: 620, y: 475 }, expectedBounds: { minX: 573, minY: 404, maxX: 654, maxY: 515 }, expectedSubpathCount: 1 },
  'first-family-seats': { numberAnchor: { x: 1095, y: 865 }, expectedBounds: { minX: 1032, minY: 843.4, maxX: 1204, maxY: 900 }, expectedSubpathCount: 1 },
  'third-family-seats': { numberAnchor: { x: 626, y: 236 }, expectedBounds: { minX: 572, minY: 157, maxX: 692, maxY: 272 }, expectedSubpathCount: 1 },
  'first-wheelchair-seats': { numberAnchor: { x: 945, y: 910 }, expectedBounds: { minX: 898.1, minY: 886.7, maxX: 1006.1, maxY: 932.4 }, expectedSubpathCount: 1 },
  'third-wheelchair-seats': { numberAnchor: { x: 490, y: 320 }, expectedBounds: { minX: 460, minY: 291, maxX: 522, maxY: 347.5 }, expectedSubpathCount: 1 },
  'party-seats-first': { numberAnchor: { x: 792, y: 928 }, expectedBounds: { minX: 754.8, minY: 906, maxX: 834.2, maxY: 941.3 }, expectedSubpathCount: 1 },
  'party-seats-third': { numberAnchor: { x: 472, y: 370 }, expectedBounds: { minX: 438.4, minY: 346.4, maxX: 510, maxY: 396 }, expectedSubpathCount: 1 },
  'skybox-seats': { numberAnchor: { x: 356, y: 848 }, expectedBounds: { minX: 345, minY: 823, maxX: 389, maxY: 888 }, expectedSubpathCount: 2 },
  'outfield-left-seats': { numberAnchor: { x: 1085, y: 190 }, expectedBounds: { minX: 887, minY: 132, maxX: 1209, maxY: 304 }, expectedSubpathCount: 1 },
  'outfield-right-seats': { numberAnchor: { x: 1275, y: 420 }, expectedBounds: { minX: 1184, minY: 341, maxX: 1334, maxY: 839 }, expectedSubpathCount: 1 },
  'bleachers-table-left': { numberAnchor: { x: 900, y: 116 }, expectedBounds: { minX: 714, minY: 102, maxX: 982, maxY: 146 }, expectedSubpathCount: 2 },
  'bleachers-table-right': { numberAnchor: { x: 1318, y: 645 }, expectedBounds: { minX: 1247, minY: 465, maxX: 1339, maxY: 778 }, expectedSubpathCount: 2 },
};

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
