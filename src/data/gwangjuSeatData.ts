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
  visualD?: string;
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
  sides?: string[] | null;
  levels?: string[] | null;
  fanRoles?: GwangjuFanRole[] | null;
  filterDimension?: 'grade' | 'position' | 'level';
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
  aggregateHitArea: 'REUSES_EXISTING_TRACE_ONLY' | 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE';
  operatorPolygonStatus: 'PENDING_OPERATOR_INPUT' | 'OFFICIAL_DERIVED_READY';
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
    status: 'READY',
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
    status: 'READY',
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
    aggregateHitArea: 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE',
    operatorPolygonStatus: 'OFFICIAL_DERIVED_READY',
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
    aggregateHitArea: 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE',
    operatorPolygonStatus: 'OFFICIAL_DERIVED_READY',
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
    operatorPolygonStatus: 'OFFICIAL_DERIVED_READY',
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
  // 층수별 (메인 필터 — 항상 노출)
  { id: 'all',      label: '전체',   cats: null,                                                                                         filterDimension: 'level' },
  { id: 'lv-1f',   label: '1층',    cats: null, levels: ['1F'],                                                                         filterDimension: 'level' },
  { id: 'lv-2f',   label: '2층',    cats: null, levels: ['2F'],                                                                         filterDimension: 'level' },
  { id: 'lv-3f',   label: '3층',    cats: null, levels: ['3F'],                                                                         filterDimension: 'level' },
  { id: 'lv-4f',   label: '4층',    cats: null, levels: ['4F'],                                                                         filterDimension: 'level' },
  { id: 'lv-5f',   label: '5층',    cats: null, levels: ['5F'],                                                                         filterDimension: 'level' },
  { id: 'lv-out',  label: '외야층', cats: null, levels: ['OUTFIELD'],                                                                   filterDimension: 'level' },
  // 등급별 (보조 필터 — 기본 접힘)
  { id: 'premium',       label: '프리미엄/특수석', cats: ['CHAMPION', 'CENTRAL_TABLE', 'TABLE', 'SURPRISE', 'FAMILY', 'ACCESSIBLE', 'PARTY', 'SKYBOX', 'SKY_PICNIC'], filterDimension: 'grade' },
  { id: 'infield',       label: '내야석',          cats: ['K9', 'K8', 'K7', 'K5'],                                                     filterDimension: 'grade' },
  { id: 'k7', label: 'K7석', cats: ['K7'],                                                                        filterDimension: 'grade' },
  { id: 'cheering', label: '응원석', cats: ['K7', 'AWAY'], fanRoles: ['HOME', 'AWAY'],                                    filterDimension: 'grade' },
  { id: 'home-cheering', label: '홈 응원석', cats: ['K7'], fanRoles: ['HOME'],                                           filterDimension: 'grade' },
  { id: 'away-cheering', label: '원정응원석', cats: ['AWAY'], fanRoles: ['AWAY'],                                           filterDimension: 'grade' },
  { id: 'outfield',      label: '외야/테이블',      cats: ['OUTFIELD', 'BLEACHERS_TABLE', 'FIVE_TABLE'],                                filterDimension: 'grade' },
  // 위치별 (보조 필터 — 기본 접힘)
  { id: 'pos-first',  label: '1루 측', cats: null, sides: ['FIRST_BASE'],                                                               filterDimension: 'position' },
  { id: 'pos-third',  label: '3루 측', cats: null, sides: ['THIRD_BASE'],                                                               filterDimension: 'position' },
  { id: 'pos-center', label: '중앙',   cats: null, sides: ['CENTER'],                                                                   filterDimension: 'position' },
  { id: 'pos-out',    label: '외야',   cats: null, sides: ['OUTFIELD'],                                                                 filterDimension: 'position' },
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
      ? '공식 PNG 기준 번호 블럭 polygon을 multi-subpath aggregate로 묶은 K7/원정응원석 hit-area를 필터 전용 layer에서 검수합니다.'
      : '운영자 제공 블럭 범위는 기존 공식 PNG 번호 블럭 polygon에 연결합니다. K7/원정응원석 전용 중첩 hit-area는 운영자 polygon 입력 전까지 만들지 않습니다.',
  },
];

const SOURCE_NOTE = 'KIA 타이거즈 공식 광주-기아 챔피언스필드 경기장 안내 이미지의 visible block 경계를 기준으로 둔 선택 hit-area입니다.';
export const GWANGJU_PREVIOUS_TRACE_VERSION = 'manual-polygon-v86';
export const GWANGJU_FULL_RETRACE_VERSION = 'manual-polygon-v87';
export const GWANGJU_FULL_RETRACE_GENERATION: GwangjuTraceGeneration = 'FULL_ACTIVE_111_RETRACE';
const TRACE_VERSION = GWANGJU_FULL_RETRACE_VERSION;
const TRACE_REVIEW_NOTE = '공식 PNG 원본 좌표계(2200x1159)에서 111개 기본 active block과 K7/AWAY aggregate hit-area를 이미지 정렬 audit와 구역별 workset으로 재검수하고 debug overlay와 evidence crop을 대조해 수동 검수한 hit-area입니다.';

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
    label: 'P2 하단 내야 101~109 및 저마진 K7/K9 경계',
    priority: 'P2',
    blockIds: [
      'k5-101',
      'k5-102',
      'k5-103',
      'k5-104',
      'k5-105',
      'k5-106',
      'k7-107',
      'k7-108',
      'k9-116',
      'k9-117',
      'k7-118',
      'k7-119',
      'k7-120',
      'k7-121',
      'k7-122',
    ],
    acceptanceFocus: [
      'officialBlockMaskRecall',
      'componentIoU',
      'outsideBleedRatio',
      'numbered-seat-color-overlap',
      'label-top-hit',
      'boundary-overlap',
    ],
    note: '업로드 화면에서 확인된 101~109 하단 내야 mismatch와 기존 coverage margin이 낮은 K7 118/119, K9 117 및 인접 K7/K9 경계를 함께 확인합니다.',
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
    label: 'P5 111개 기본 블럭 + K7/AWAY aggregate reference 재고정',
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
      'home-k7-seats',
      'away-cheering-seats',
    ],
    acceptanceFocus: [
      'active-block-count-113',
      'release-ready-v17',
      'derived-k7-away-aggregate-hit-area',
    ],
    note: '전체 111개 기본 polygon과 K7/AWAY filter-only aggregate hit-area의 v6 reference, image-alignment audit, release gate를 최종 확인합니다.',
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
  visualPoints?: readonly Point[],
): GwangjuImageGeometryDraft {
  const retracedPoints = fullRetracePoints(points);
  const visualD = visualPoints ? polygonPath(fullRetracePoints(visualPoints)) : undefined;

  return {
    d: polygonPath(retracedPoints),
    ...(visualD ? { visualD } : {}),
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

const THIRD_BASE_V87_VISUAL_POINTS: Record<string, readonly Point[]> = {
  'k7-121': [[395, 652], [396, 643], [398, 632], [401, 619], [403, 616], [414, 616], [421, 617], [454, 622], [499, 629], [509, 632], [510, 634], [508, 652], [505, 666], [499, 668], [490, 667], [470, 664], [405, 654]],
  'k7-122': [[404, 603], [407, 584], [409, 573], [437, 576], [444, 577], [483, 583], [507, 587], [517, 590], [518, 592], [519, 596], [515, 612], [512, 623], [510, 626], [420, 612], [409, 610], [404, 609]],
  'k8-123': [[411, 565], [414, 548], [416, 539], [419, 526], [420, 522], [425, 507], [431, 491], [436, 479], [442, 467], [444, 464], [448, 464], [453, 466], [465, 472], [494, 487], [521, 501], [537, 510], [543, 514], [536, 539], [520, 571], [516, 578], [513, 582], [504, 581], [470, 576], [421, 568], [414, 566]],
  'k5-124': [[449, 455], [451, 451], [461, 436], [484, 402], [487, 398], [492, 393], [494, 393], [504, 398], [544, 422], [586, 448], [591, 453], [574, 477], [563, 492], [553, 505], [549, 510], [464, 466], [454, 460]],
  'k5-125': [[496, 387], [499, 380], [504, 372], [506, 369], [513, 359], [516, 357], [518, 356], [547, 372], [610, 410], [624, 419], [627, 423], [624, 428], [622, 431], [613, 444], [608, 451], [604, 450], [554, 421], [511, 396], [499, 389]],
  'k5-126': [[520, 324], [521, 322], [526, 317], [532, 317], [543, 318], [629, 370], [652, 384], [651, 388], [646, 397], [644, 400], [635, 413], [627, 412], [618, 407], [597, 395], [558, 372], [523, 351], [520, 349]],
  'k5-127': [[645, 283], [648, 278], [659, 261], [663, 255], [670, 247], [681, 235], [682, 234], [685, 232], [687, 232], [688, 236], [688, 237], [681, 276], [676, 300], [651, 287]],
};

function multiBlockGeometry(
  subpaths: readonly Point[][],
  labelX: number,
  labelY: number,
  shortLabel: string,
  labelFontSize = 10,
  visualSubpaths?: readonly Point[][],
): GwangjuImageGeometryDraft {
  const retracedSubpaths = subpaths.map(fullRetracePoints);
  const visualD = visualSubpaths
    ? visualSubpaths.map((subpath) => polygonPath(fullRetracePoints(subpath))).join(' ')
    : undefined;

  return {
    d: retracedSubpaths.map(polygonPath).join(' '),
    ...(visualD ? { visualD } : {}),
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
  'k5-101': blockGeometry([[1058, 802], [1062, 802], [1069, 803], [1109, 809], [1115, 810], [1115, 812], [1114, 813], [1104, 818], [1093, 822], [1084, 825], [1081, 825], [1067, 823], [1062, 822], [1061, 819], [1058, 806]], 1096, 820, '101'),
  'k5-102': blockGeometry([[1009, 794], [1011, 794], [1036, 798], [1048, 800], [1050, 801], [1051, 803], [1053, 811], [1056, 824], [1057, 830], [1057, 831], [1056, 832], [1030, 838], [1025, 839], [1022, 839], [1019, 838], [1018, 836], [1016, 828], [1009, 799]], 1038, 820, '102'),
  'k5-103': blockGeometry([[961, 791], [966, 790], [972, 789], [975, 789], [982, 790], [995, 792], [1001, 793], [1002, 794], [1006, 810], [1013, 839], [1013, 841], [1005, 906], [1001, 906], [993, 905], [988, 904], [987, 903], [986, 900], [980, 875], [965, 812], [961, 795]], 990, 850, '103'),
  'k5-104': blockGeometry([[918, 806], [920, 805], [924, 804], [953, 797], [956, 797], [957, 800], [960, 812], [975, 875], [979, 892], [982, 905], [982, 908], [981, 909], [977, 910], [955, 915], [946, 917], [943, 917], [942, 913], [924, 836], [918, 810]], 952, 872, '104'),
  'k5-105': blockGeometry([[873, 818], [874, 817], [877, 816], [908, 808], [911, 808], [912, 809], [914, 817], [927, 872], [938, 919], [930, 924], [899, 932], [897, 925], [883, 861], [873, 819]], 906, 884, '105', 10, [[873, 818], [874, 817], [877, 816], [908, 808], [911, 808], [912, 809], [914, 817], [927, 872], [931, 889], [937, 915], [938, 920], [938, 924], [935, 925], [927, 927], [914, 930], [905, 932], [900, 932], [883, 861], [873, 819]]),
  'k5-106': blockGeometry([[829, 829], [830, 828], [849, 823], [865, 819], [867, 819], [868, 822], [871, 834], [876, 855], [894, 931], [894, 934], [892, 935], [884, 937], [867, 941], [858, 943], [856, 943], [855, 942], [851, 926], [830, 837], [829, 832]], 845, 886, '106'),
  'k7-107': blockGeometry([[797, 840], [822, 835], [824, 835], [825, 836], [842, 907], [847, 928], [850, 941], [850, 945], [842, 947], [832, 949], [820, 951], [815, 951], [808, 911], [803, 882], [798, 852], [797, 845]], 820, 895, '107'),
  'k7-108': blockGeometry([[736, 948], [737, 937], [746, 858], [747, 853], [764, 847], [775, 847], [791, 848], [792, 849], [808, 950], [808, 953], [736, 953]], 760, 895, '108'),
  'k7-109': blockGeometry([[695, 943], [708, 873], [711, 857], [712, 852], [713, 848], [719, 848], [734, 850], [741, 851], [742, 852], [742, 853], [733, 928], [730, 952], [729, 953], [728, 953], [719, 952], [704, 950], [697, 949], [695, 948]], 725, 902, '109'),
  'k7-110': blockGeometry([[638.3, 919.9], [641.7, 894.5], [650, 854], [697.7, 855.5], [695.1, 925.7], [671.1, 933.2]], 670, 900, '110'),
  'k7-111': blockGeometry([[605, 931], [608, 915], [613, 889], [619, 858], [623, 838], [624, 834], [627, 834], [650, 838], [650, 848], [648, 860], [644, 882], [636, 924], [635, 936], [611, 936], [605, 935]], 630, 892, '111'),
  'k9-112': blockGeometry([[566, 926], [570, 911], [588, 846], [592, 832], [593, 829], [595, 829], [601, 830], [618, 833], [618, 837], [603, 914], [601, 924], [599, 933], [591, 933], [585, 932], [570, 929], [566, 928]], 586, 884, '112'),
  'k9-113': blockGeometry([[505, 875], [509, 869], [558, 799], [561, 795], [563, 795], [594, 807], [594, 809], [566, 907], [563, 917], [562, 920], [558, 920], [550, 918], [539, 915], [527, 911], [517, 907], [516, 906], [505, 876]], 535, 880, '113'),
  'k9-116': blockGeometry([[388, 711], [397, 697], [405, 697], [473, 701], [489, 702], [498, 703], [501, 739], [501, 740], [500, 741], [493, 743], [454, 753], [426, 760], [416, 760], [414, 748], [414, 742], [410, 738], [388, 728]], 472, 730, '116'),
  'k9-117': blockGeometry([[390, 683], [391, 674], [392, 667], [393, 662], [394, 658], [397, 658], [411, 660], [458, 667], [478, 670], [491, 672], [503, 674], [503, 680], [501, 691], [500, 696], [499, 698], [493, 698], [469, 696], [398, 690], [390, 689]], 480, 680, '117'),
  'k7-118': blockGeometry([[395, 651], [402, 616], [403, 615], [406, 615], [476, 626], [495, 629], [507, 631], [512, 632], [512, 633], [511, 639], [505, 669], [503, 669], [462, 663], [422, 657], [396, 653], [395, 652]], 480, 650, '118'),
  'k7-119': blockGeometry([[404, 606], [407, 588], [410, 573], [415, 573], [422, 574], [517, 589], [520, 590], [520, 592], [514, 622], [513, 626], [509, 626], [470, 620], [412, 611], [406, 610], [404, 609]], 480, 604, '119'),
  'k7-120': blockGeometry([[412, 562], [416, 542], [418, 534], [419, 533], [423, 533], [450, 539], [516, 554], [519, 555], [519, 558], [515, 578], [514, 581], [513, 582], [509, 582], [502, 581], [469, 576], [417, 568], [412, 567]], 496, 558, '120'),
  'k7-121': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k7-121'], 445, 640, '121', 10, THIRD_BASE_V87_VISUAL_POINTS['k7-121']),
  'k7-122': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k7-122'], 456, 598, '122', 10, THIRD_BASE_V87_VISUAL_POINTS['k7-122']),
  'k8-123': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k8-123'], 470, 508, '123', 10, THIRD_BASE_V87_VISUAL_POINTS['k8-123']),
  'k5-124': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k5-124'], 500, 465, '124', 10, THIRD_BASE_V87_VISUAL_POINTS['k5-124']),
  'k5-125': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k5-125'], 546, 391, '125', 10, THIRD_BASE_V87_VISUAL_POINTS['k5-125']),
  'k5-126': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k5-126'], 614, 325, '126', 10, THIRD_BASE_V87_VISUAL_POINTS['k5-126']),
  'k5-127': blockGeometry(THIRD_BASE_V87_VISUAL_POINTS['k5-127'], 668, 269, '127', 10, THIRD_BASE_V87_VISUAL_POINTS['k5-127']),
};

function aggregateGeometryFromDrafts(
  sourceBlockIds: readonly string[],
  labelX: number,
  labelY: number,
  shortLabel: string,
  note: string,
  labelFontSize = 13,
): GwangjuImageGeometryDraft {
  const sourceGeometries = sourceBlockIds.map((id) => {
    const geometry = INFIELD_GEOMETRIES[id];
    if (!geometry) {
      throw new Error(`Missing official traced source geometry for ${id}`);
    }
    return geometry;
  });

  return {
    d: sourceGeometries.map((geometry) => geometry.d).join(' '),
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
    retraceSourcePointCount: sourceGeometries.reduce((total, geometry) => total + geometry.retraceSourcePointCount, 0),
    retracePointCount: sourceGeometries.reduce((total, geometry) => total + geometry.retracePointCount, 0),
    manualReviewed: true,
    pixelAlignmentStatus: 'PIXEL_ALIGNED',
    manualReviewNote: note,
  };
}

const K7_AGGREGATE_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'home-k7-seats': aggregateGeometryFromDrafts(
    GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS,
    820,
    895,
    'K7',
    'K7석은 공식 PNG에서 이미 검수된 107~111, 118~122 번호 블럭 polygon을 multi-subpath aggregate hit-area로 묶습니다.',
    15,
  ),
  'away-cheering-seats': aggregateGeometryFromDrafts(
    GWANGJU_AWAY_CHEERING_BLOCK_IDS,
    820,
    895,
    'AWAY',
    '원정응원석은 공식 PNG에서 이미 검수된 107~110 K7 번호 블럭 polygon을 multi-subpath aggregate hit-area로 묶습니다.',
    13,
  ),
};

const SKY_PICNIC_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'sky-picnic-s-301': blockGeometry([[846, 952], [867, 952], [867, 974], [848, 974], [846, 966]], 856, 963, 'S-301', 6, [[844, 952], [867, 952], [867, 974], [848, 974], [844, 966]]),
  'sky-picnic-s-302': blockGeometry([[822, 957], [845, 957], [845, 978], [824, 978], [822, 970]], 834, 968, 'S-302', 6),
  'sky-picnic-s-303': blockGeometry([[799, 961], [822, 961], [822, 982], [801, 982], [799, 974]], 811, 972, 'S-303', 6),
  'sky-picnic-s-304': blockGeometry([[778, 965], [798, 965], [798, 984], [779, 984], [778, 977]], 788, 975, 'S-304', 6),
  'sky-picnic-s-305': blockGeometry([[756, 975], [757, 957], [777, 957], [777, 963], [776, 983], [775, 984], [758, 984], [756, 976]], 767, 975, 'S-305', 6),
  'sky-picnic-s-306': blockGeometry([[733, 982], [734, 961], [735, 956], [756, 956], [756, 974], [755, 984], [748, 984], [734, 983]], 745, 974, 'S-306', 6),
  'sky-picnic-s-307': blockGeometry([[709, 978], [712, 956], [713, 954], [730, 954], [734, 955], [734, 960], [732, 976], [731, 982], [725, 982], [716, 981], [709, 980]], 721, 972, 'S-307', 6),
  'sky-picnic-s-308': blockGeometry([[687, 974], [689, 952], [712, 952], [712, 955], [710, 970], [709, 977], [707, 979], [701, 979], [693, 978], [687, 977]], 699, 969, 'S-308', 6),
  'sky-picnic-s-309': blockGeometry([[664, 969], [668, 949], [669, 948], [686, 948], [689, 949], [689, 950], [687, 973], [686, 976], [679, 976], [667, 974], [664, 973]], 676, 967, 'S-309', 6),
  'sky-picnic-s-310': blockGeometry([[641, 965], [644, 946], [645, 943], [666, 943], [668, 946], [668, 948], [662, 972], [656, 972], [644, 970], [641, 969]], 653, 962, 'S-310', 6),
  'sky-picnic-s-311': blockGeometry([[618, 961], [620, 945], [621, 940], [632, 940], [639, 941], [644, 942], [644, 945], [639, 969], [636, 969], [629, 968], [623, 967], [618, 966]], 630, 958, 'S-311', 6),
  'sky-picnic-s-312': blockGeometry([[595, 958], [597, 942], [598, 937], [612, 937], [618, 938], [620, 939], [620, 944], [618, 960], [617, 965], [611, 965], [598, 963], [595, 962]], 607, 955, 'S-312', 6),
  'sky-picnic-s-313': blockGeometry([[569, 953], [572, 935], [597, 935], [597, 941], [595, 953], [594, 958], [593, 962], [592, 962], [584, 961], [569, 959]], 584, 952, 'S-313', 6),
  'sky-picnic-s-314': blockGeometry([[536, 952], [539, 942], [543, 930], [544, 929], [566, 929], [571, 930], [572, 931], [572, 934], [568, 958], [564, 958], [538, 953]], 555, 947, 'S-314', 6),
  'sky-picnic-s-315': blockGeometry([[501, 955], [502, 939], [504, 935], [510, 924], [515, 915], [521, 915], [544, 916], [544, 925], [543, 929], [538, 945], [536, 951], [535, 952], [501, 958]], 523, 937, 'S-315', 6),
  'sky-picnic-s-316': blockGeometry([[472, 919], [486, 898], [487, 898], [497, 903], [512, 911], [512, 920], [511, 922], [505, 933], [502, 938], [476, 942], [472, 942]], 492, 920, 'S-316', 6),
  'sky-picnic-s-317': blockGeometry([[452, 885], [456, 880], [463, 880], [479, 892], [482, 895], [482, 903], [481, 905], [471, 920], [452, 922], [452, 909]], 463, 901, 'S-317', 6),
  'sky-picnic-s-318': blockGeometry([[409, 849], [426, 849], [451, 873], [451, 891], [431, 891], [409, 866]], 424, 870, 'S-318', 6),
  'sky-picnic-s-319': blockGeometry([[373, 783], [397, 783], [397, 810], [392, 820], [373, 827], [371, 812]], 389, 792, 'S-319', 6),
  'sky-picnic-s-320': blockGeometry([[364, 752], [389, 752], [392, 759], [388, 779], [366, 779], [364, 772]], 376, 765, 'S-320', 6),
  'sky-picnic-s-321': blockGeometry([[360, 708], [382, 708], [386, 716], [386, 742], [381, 750], [360, 750]], 371, 724, 'S-321', 6),
  'sky-picnic-s-322': blockGeometry([[361, 678], [382, 678], [386, 686], [386, 699], [378, 704], [360, 700], [360, 686]], 374, 688, 'S-322', 6),
  'sky-picnic-s-323': blockGeometry([[367, 656], [387, 656], [391, 662], [391, 670], [384, 674], [364, 674], [364, 668]], 378, 665, 'S-323', 6),
  'sky-picnic-s-324': blockGeometry([[373, 626], [392, 626], [395, 630], [395, 645], [389, 654], [369, 654], [369, 642], [371, 631]], 383, 636, 'S-324', 6),
  'sky-picnic-s-325': blockGeometry([[374, 619], [376, 607], [377, 604], [403, 611], [403, 623], [394, 625], [374, 623]], 385, 613, 'S-325', 6),
  'sky-picnic-s-326': blockGeometry([[378, 596], [379, 590], [380, 585], [382, 583], [407, 590], [407, 602], [382, 601], [378, 599]], 389, 591, 'S-326', 6),
  'sky-picnic-s-327': blockGeometry([[382, 574], [384, 562], [385, 562], [411, 570], [411, 580], [382, 579]], 393, 570, 'S-327', 6),
  'sky-picnic-s-328': blockGeometry([[386, 551], [388, 541], [415, 549], [415, 559], [386, 558]], 397, 549, 'S-328', 6),
  'sky-picnic-s-329': blockGeometry([[390, 532], [392, 524], [393, 521], [418, 528], [418, 532], [397, 535], [390, 536]], 402, 529, 'S-329', 6),
  'sky-picnic-s-330': blockGeometry([[396, 510], [398, 503], [401, 502], [423, 510], [423, 512], [413, 515], [395, 517]], 407, 509, 'S-330', 6),
  'sky-picnic-s-331': blockGeometry([[398, 496], [402, 488], [405, 485], [410, 485], [425, 491], [426, 495], [419, 498], [408, 501], [402, 499], [398, 498]], 412, 493, 'S-331', 6),
  'sky-picnic-s-332': blockGeometry([[406, 477], [409, 469], [412, 465], [417, 465], [435, 474], [435, 477], [426, 481], [415, 482], [408, 479]], 420, 474, 'S-332', 6),
  'sky-picnic-s-333': blockGeometry([[382, 452], [405, 448], [418, 455], [412, 464], [384, 460]], 411, 458, 'S-333', 6),
  'sky-picnic-s-334': blockGeometry([[418, 456], [431, 433], [445, 438], [432, 466]], 430, 445, 'S-334', 6),
  'sky-picnic-s-335': blockGeometry([[430, 410], [444, 404], [467, 416], [456, 431], [431, 424]], 447, 418, 'S-335', 6),
};

const FIVE_TABLE_TRACE_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'five-table-501': blockGeometry([[1114, 952], [1115, 952], [1115, 957], [1116, 957], [1116, 962], [1117, 962], [1117, 966], [1118, 966], [1118, 970], [1117, 970], [1117, 971], [1115, 971], [1115, 972], [1113, 972], [1113, 973], [1111, 973], [1111, 974], [1109, 974], [1109, 975], [1107, 975], [1107, 976], [1106, 976], [1106, 977], [1104, 977], [1104, 978], [1102, 978], [1102, 979], [1100, 979], [1100, 980], [1098, 980], [1098, 981], [1096, 981], [1096, 982], [1094, 982], [1094, 983], [1092, 983], [1092, 984], [1090, 984], [1090, 985], [1088, 985], [1088, 986], [1086, 986], [1086, 987], [1084, 987], [1084, 988], [1081, 988], [1081, 984], [1080, 984], [1080, 980], [1079, 980], [1079, 975], [1078, 975], [1078, 971], [1077, 971], [1077, 967], [1076, 967], [1076, 966], [1078, 966], [1078, 965], [1079, 965], [1079, 964], [1080, 964], [1080, 963], [1084, 963], [1084, 962], [1087, 962], [1087, 961], [1091, 961], [1091, 960], [1094, 960], [1094, 959], [1098, 959], [1098, 958], [1102, 958], [1102, 957], [1105, 957], [1105, 956], [1109, 956], [1109, 955], [1112, 955], [1112, 954], [1114, 954]], 1097, 970, '501', 10),
  'five-table-502': blockGeometry([[1070, 966], [1071, 966], [1071, 967], [1072, 967], [1072, 970], [1073, 970], [1073, 974], [1074, 974], [1074, 979], [1075, 979], [1075, 983], [1076, 983], [1076, 987], [1077, 987], [1077, 992], [1075, 992], [1075, 993], [1072, 993], [1072, 994], [1070, 994], [1070, 995], [1068, 995], [1068, 996], [1066, 996], [1066, 997], [1064, 997], [1064, 998], [1062, 998], [1062, 999], [1059, 999], [1059, 1000], [1057, 1000], [1057, 1001], [1055, 1001], [1055, 1002], [1053, 1002], [1053, 1003], [1050, 1003], [1050, 1004], [1048, 1004], [1048, 1005], [1046, 1005], [1046, 1006], [1043, 1006], [1043, 1007], [1041, 1007], [1041, 1008], [1039, 1008], [1039, 1005], [1038, 1005], [1038, 1000], [1037, 1000], [1037, 995], [1036, 995], [1036, 991], [1035, 991], [1035, 986], [1034, 986], [1034, 981], [1033, 981], [1033, 977], [1032, 977], [1032, 976], [1037, 976], [1037, 975], [1041, 975], [1041, 974], [1045, 974], [1045, 973], [1048, 973], [1048, 972], [1052, 972], [1052, 971], [1056, 971], [1056, 970], [1060, 970], [1060, 969], [1064, 969], [1064, 968], [1067, 968], [1067, 967], [1070, 967]], 1054, 987, '502', 10),
  'five-table-503': blockGeometry([[1024, 978], [1027, 978], [1027, 980], [1028, 980], [1028, 984], [1029, 984], [1029, 988], [1030, 988], [1030, 992], [1031, 992], [1031, 996], [1032, 996], [1032, 1000], [1033, 1000], [1033, 1004], [1034, 1004], [1034, 1008], [1035, 1008], [1035, 1010], [1033, 1010], [1033, 1011], [1031, 1011], [1031, 1012], [1028, 1012], [1028, 1013], [1026, 1013], [1026, 1014], [1023, 1014], [1023, 1015], [1021, 1015], [1021, 1016], [1018, 1016], [1018, 1017], [1015, 1017], [1015, 1018], [1013, 1018], [1013, 1019], [1010, 1019], [1010, 1020], [1007, 1020], [1007, 1021], [1004, 1021], [1004, 1022], [1001, 1022], [1001, 1023], [998, 1023], [998, 1024], [995, 1024], [995, 1025], [994, 1025], [994, 1022], [993, 1022], [993, 1018], [992, 1018], [992, 1014], [991, 1014], [991, 1010], [990, 1010], [990, 1006], [989, 1006], [989, 1002], [988, 1002], [988, 998], [987, 998], [987, 994], [986, 994], [986, 990], [985, 990], [985, 988], [987, 988], [987, 987], [991, 987], [991, 986], [995, 986], [995, 985], [999, 985], [999, 984], [1004, 984], [1004, 983], [1008, 983], [1008, 982], [1012, 982], [1012, 981], [1016, 981], [1016, 980], [1020, 980], [1020, 979], [1024, 979]], 1010, 1001, '503', 10),
  'five-table-504': blockGeometry([[980, 988], [981, 988], [981, 993], [982, 993], [982, 997], [983, 997], [983, 1001], [984, 1001], [984, 1005], [985, 1005], [985, 1009], [986, 1009], [986, 1013], [987, 1013], [987, 1017], [988, 1017], [988, 1022], [989, 1022], [989, 1026], [988, 1026], [988, 1027], [985, 1027], [985, 1028], [982, 1028], [982, 1029], [979, 1029], [979, 1030], [975, 1030], [975, 1031], [972, 1031], [972, 1032], [969, 1032], [969, 1033], [965, 1033], [965, 1034], [961, 1034], [961, 1035], [958, 1035], [958, 1036], [954, 1036], [954, 1037], [950, 1037], [950, 1038], [947, 1038], [947, 1034], [946, 1034], [946, 1030], [945, 1030], [945, 1027], [944, 1027], [944, 1023], [943, 1023], [943, 1019], [942, 1019], [942, 1015], [941, 1015], [941, 1011], [940, 1011], [940, 1007], [939, 1007], [939, 1003], [938, 1003], [938, 999], [941, 999], [941, 998], [945, 998], [945, 997], [949, 997], [949, 996], [953, 996], [953, 995], [957, 995], [957, 994], [961, 994], [961, 993], [965, 993], [965, 992], [970, 992], [970, 991], [974, 991], [974, 990], [978, 990], [978, 989], [980, 989]], 963, 1013, '504', 10),
  'five-table-505': blockGeometry([[933, 999], [934, 999], [934, 1004], [935, 1004], [935, 1008], [936, 1008], [936, 1012], [937, 1012], [937, 1016], [938, 1016], [938, 1020], [939, 1020], [939, 1024], [940, 1024], [940, 1028], [941, 1028], [941, 1032], [942, 1032], [942, 1036], [943, 1036], [943, 1040], [940, 1040], [940, 1041], [936, 1041], [936, 1042], [932, 1042], [932, 1043], [928, 1043], [928, 1044], [924, 1044], [924, 1045], [920, 1045], [920, 1046], [915, 1046], [915, 1047], [911, 1047], [911, 1048], [907, 1048], [907, 1049], [904, 1049], [904, 1046], [903, 1046], [903, 1041], [902, 1041], [902, 1037], [901, 1037], [901, 1033], [900, 1033], [900, 1028], [899, 1028], [899, 1024], [898, 1024], [898, 1020], [897, 1020], [897, 1015], [896, 1015], [896, 1011], [895, 1011], [895, 1009], [898, 1009], [898, 1008], [902, 1008], [902, 1007], [906, 1007], [906, 1006], [911, 1006], [911, 1005], [915, 1005], [915, 1004], [919, 1004], [919, 1003], [923, 1003], [923, 1002], [928, 1002], [928, 1001], [932, 1001], [932, 1000], [933, 1000]], 919, 1024, '505', 10),
  'five-table-506': blockGeometry([[889, 1010], [890, 1010], [890, 1012], [891, 1012], [891, 1016], [892, 1016], [892, 1021], [893, 1021], [893, 1025], [894, 1025], [894, 1029], [895, 1029], [895, 1034], [896, 1034], [896, 1038], [897, 1038], [897, 1043], [898, 1043], [898, 1047], [899, 1047], [899, 1051], [898, 1051], [898, 1052], [894, 1052], [894, 1053], [889, 1053], [889, 1054], [885, 1054], [885, 1055], [881, 1055], [881, 1056], [876, 1056], [876, 1057], [872, 1057], [872, 1058], [867, 1058], [867, 1059], [862, 1059], [862, 1060], [855, 1060], [855, 1057], [854, 1057], [854, 1052], [853, 1052], [853, 1046], [852, 1046], [852, 1041], [851, 1041], [851, 1036], [850, 1036], [850, 1030], [849, 1030], [849, 1025], [848, 1025], [848, 1020], [847, 1020], [847, 1019], [849, 1019], [849, 1018], [854, 1018], [854, 1017], [859, 1017], [859, 1016], [864, 1016], [864, 1015], [869, 1015], [869, 1014], [874, 1014], [874, 1013], [879, 1013], [879, 1012], [884, 1012], [884, 1011], [889, 1011]], 873, 1035, '506', 10),
  'five-table-507': blockGeometry([[837, 1020], [841, 1020], [841, 1023], [842, 1023], [842, 1028], [843, 1028], [843, 1033], [844, 1033], [844, 1038], [845, 1038], [845, 1043], [846, 1043], [846, 1048], [847, 1048], [847, 1053], [848, 1053], [848, 1058], [849, 1058], [849, 1061], [846, 1061], [846, 1062], [840, 1062], [840, 1063], [833, 1063], [833, 1064], [827, 1064], [827, 1065], [820, 1065], [820, 1066], [814, 1066], [814, 1067], [807, 1067], [807, 1068], [804, 1068], [804, 1064], [803, 1064], [803, 1051], [802, 1051], [802, 1038], [801, 1038], [801, 1026], [805, 1026], [805, 1025], [812, 1025], [812, 1024], [818, 1024], [818, 1023], [824, 1023], [824, 1022], [831, 1022], [831, 1021], [837, 1021]], 825, 1044, '507', 10),
  'five-table-508': blockGeometry([[772, 1027], [795, 1027], [795, 1031], [796, 1031], [796, 1039], [797, 1039], [797, 1047], [798, 1047], [798, 1056], [799, 1056], [799, 1064], [800, 1064], [800, 1069], [789, 1069], [789, 1070], [752, 1070], [752, 1064], [753, 1064], [753, 1048], [754, 1048], [754, 1033], [755, 1033], [755, 1028], [772, 1028]], 776, 1048, '508', 10),
  'five-table-509': blockGeometry([[707, 1024], [715, 1024], [715, 1025], [727, 1025], [727, 1026], [738, 1026], [738, 1027], [748, 1027], [748, 1071], [725, 1071], [725, 1070], [708, 1070], [708, 1069], [700, 1069], [700, 1065], [701, 1065], [701, 1061], [704, 1061], [704, 1060], [707, 1060], [707, 1059], [708, 1059], [708, 1058], [709, 1058], [709, 1057], [710, 1057], [710, 1056], [711, 1056], [711, 1054], [712, 1054], [712, 1045], [711, 1045], [711, 1043], [710, 1043], [710, 1042], [709, 1042], [709, 1041], [708, 1041], [708, 1040], [706, 1040], [706, 1039], [705, 1039], [705, 1034], [706, 1034], [706, 1028], [707, 1028]], 724, 1047, '509', 10),
  'five-table-510': blockGeometry([[661, 1018], [665, 1018], [665, 1019], [673, 1019], [673, 1020], [682, 1020], [682, 1021], [691, 1021], [691, 1022], [699, 1022], [699, 1023], [704, 1023], [704, 1027], [703, 1027], [703, 1033], [702, 1033], [702, 1038], [700, 1038], [700, 1039], [696, 1039], [696, 1040], [695, 1040], [695, 1041], [693, 1041], [693, 1042], [692, 1042], [692, 1044], [691, 1044], [691, 1040], [690, 1040], [690, 1039], [689, 1039], [689, 1038], [688, 1038], [688, 1037], [685, 1037], [685, 1038], [684, 1038], [684, 1039], [683, 1039], [683, 1040], [682, 1040], [682, 1046], [683, 1046], [683, 1048], [684, 1048], [684, 1049], [689, 1049], [689, 1048], [690, 1048], [690, 1053], [691, 1053], [691, 1056], [692, 1056], [692, 1057], [693, 1057], [693, 1058], [694, 1058], [694, 1059], [696, 1059], [696, 1060], [698, 1060], [698, 1066], [697, 1066], [697, 1069], [695, 1069], [695, 1068], [684, 1068], [684, 1067], [674, 1067], [674, 1066], [666, 1066], [666, 1065], [657, 1065], [657, 1064], [653, 1064], [653, 1063], [654, 1063], [654, 1057], [655, 1057], [655, 1051], [656, 1051], [656, 1046], [657, 1046], [657, 1040], [658, 1040], [658, 1034], [659, 1034], [659, 1029], [660, 1029], [660, 1023], [661, 1023]], 678, 1042, '510', 10),
  'five-table-511': blockGeometry([[614, 1012], [618, 1012], [618, 1013], [626, 1013], [626, 1014], [634, 1014], [634, 1015], [642, 1015], [642, 1016], [650, 1016], [650, 1017], [657, 1017], [657, 1020], [656, 1020], [656, 1026], [655, 1026], [655, 1031], [654, 1031], [654, 1037], [653, 1037], [653, 1042], [652, 1042], [652, 1048], [651, 1048], [651, 1053], [650, 1053], [650, 1058], [649, 1058], [649, 1063], [648, 1063], [648, 1064], [646, 1064], [646, 1063], [640, 1063], [640, 1062], [633, 1062], [633, 1061], [627, 1061], [627, 1060], [621, 1060], [621, 1059], [615, 1059], [615, 1058], [609, 1058], [609, 1057], [605, 1057], [605, 1055], [606, 1055], [606, 1050], [607, 1050], [607, 1045], [608, 1045], [608, 1039], [609, 1039], [609, 1034], [610, 1034], [610, 1029], [611, 1029], [611, 1024], [612, 1024], [612, 1019], [613, 1019], [613, 1014], [614, 1014]], 631, 1038, '511', 10),
  'five-table-512': blockGeometry([[572, 1005], [574, 1005], [574, 1006], [580, 1006], [580, 1007], [587, 1007], [587, 1008], [593, 1008], [593, 1009], [600, 1009], [600, 1010], [607, 1010], [607, 1011], [609, 1011], [609, 1016], [608, 1016], [608, 1021], [607, 1021], [607, 1026], [606, 1026], [606, 1031], [605, 1031], [605, 1036], [604, 1036], [604, 1041], [603, 1041], [603, 1047], [602, 1047], [602, 1052], [601, 1052], [601, 1055], [595, 1055], [595, 1054], [589, 1054], [589, 1053], [583, 1053], [583, 1052], [577, 1052], [577, 1051], [572, 1051], [572, 1050], [566, 1050], [566, 1049], [560, 1049], [560, 1048], [557, 1048], [557, 1047], [558, 1047], [558, 1042], [559, 1042], [559, 1037], [560, 1037], [560, 1032], [561, 1032], [561, 1027], [562, 1027], [562, 1022], [563, 1022], [563, 1017], [564, 1017], [564, 1012], [565, 1012], [565, 1010], [567, 1010], [567, 1009], [569, 1009], [569, 1008], [571, 1008], [571, 1007], [572, 1007]], 583, 1030, '512', 10),
  'five-table-513': blockGeometry([[517, 992], [519, 992], [519, 993], [523, 993], [523, 994], [527, 994], [527, 995], [531, 995], [531, 996], [534, 996], [534, 997], [538, 997], [538, 998], [542, 998], [542, 999], [546, 999], [546, 1000], [550, 1000], [550, 1001], [552, 1001], [552, 1002], [553, 1002], [553, 1005], [554, 1005], [554, 1006], [555, 1006], [555, 1007], [556, 1007], [556, 1008], [557, 1008], [557, 1009], [559, 1009], [559, 1015], [558, 1015], [558, 1020], [557, 1020], [557, 1025], [556, 1025], [556, 1031], [555, 1031], [555, 1036], [554, 1036], [554, 1041], [553, 1041], [553, 1045], [547, 1045], [547, 1044], [542, 1044], [542, 1043], [538, 1043], [538, 1042], [534, 1042], [534, 1041], [531, 1041], [531, 1040], [527, 1040], [527, 1039], [523, 1039], [523, 1038], [520, 1038], [520, 1037], [517, 1037], [517, 1036], [513, 1036], [513, 1035], [510, 1035], [510, 1034], [506, 1034], [506, 1033], [503, 1033], [503, 1032], [502, 1032], [502, 1030], [503, 1030], [503, 1027], [504, 1027], [504, 1025], [505, 1025], [505, 1022], [506, 1022], [506, 1020], [507, 1020], [507, 1017], [508, 1017], [508, 1015], [509, 1015], [509, 1012], [510, 1012], [510, 1010], [511, 1010], [511, 1007], [512, 1007], [512, 1005], [513, 1005], [513, 1002], [514, 1002], [514, 1000], [515, 1000], [515, 997], [516, 997], [516, 995], [517, 995]], 530, 1018, '513', 10),
  'five-table-514': blockGeometry([[477, 973], [478, 973], [478, 974], [480, 974], [480, 975], [482, 975], [482, 976], [484, 976], [484, 977], [486, 977], [486, 978], [489, 978], [489, 979], [491, 979], [491, 980], [493, 980], [493, 981], [495, 981], [495, 982], [497, 982], [497, 983], [499, 983], [499, 984], [501, 984], [501, 985], [503, 985], [503, 986], [505, 986], [505, 987], [507, 987], [507, 988], [510, 988], [510, 989], [512, 989], [512, 990], [513, 990], [513, 992], [512, 992], [512, 994], [511, 994], [511, 997], [510, 997], [510, 999], [509, 999], [509, 1002], [508, 1002], [508, 1004], [507, 1004], [507, 1007], [506, 1007], [506, 1009], [505, 1009], [505, 1012], [504, 1012], [504, 1014], [503, 1014], [503, 1017], [502, 1017], [502, 1019], [501, 1019], [501, 1022], [500, 1022], [500, 1024], [499, 1024], [499, 1026], [498, 1026], [498, 1029], [494, 1029], [494, 1028], [491, 1028], [491, 1027], [488, 1027], [488, 1026], [486, 1026], [486, 1025], [484, 1025], [484, 1024], [481, 1024], [481, 1023], [479, 1023], [479, 1022], [477, 1022], [477, 1021], [475, 1021], [475, 1020], [473, 1020], [473, 1019], [471, 1019], [471, 1018], [469, 1018], [469, 1017], [467, 1017], [467, 1016], [465, 1016], [465, 1015], [463, 1015], [463, 1014], [461, 1014], [461, 1013], [459, 1013], [459, 1012], [458, 1012], [458, 1011], [459, 1011], [459, 1009], [460, 1009], [460, 1007], [461, 1007], [461, 1004], [462, 1004], [462, 1002], [463, 1002], [463, 1000], [464, 1000], [464, 998], [465, 998], [465, 996], [466, 996], [466, 994], [467, 994], [467, 992], [468, 992], [468, 990], [469, 990], [469, 988], [470, 988], [470, 986], [471, 986], [471, 984], [472, 984], [472, 982], [473, 982], [473, 980], [474, 980], [474, 978], [475, 978], [475, 976], [476, 976], [476, 974], [477, 974]], 485, 1001, '514', 10),
  'five-table-515': blockGeometry([[443, 949], [444, 949], [444, 951], [445, 951], [445, 952], [447, 952], [447, 953], [448, 953], [448, 954], [450, 954], [450, 955], [451, 955], [451, 956], [453, 956], [453, 957], [454, 957], [454, 958], [455, 958], [455, 959], [457, 959], [457, 960], [458, 960], [458, 961], [460, 961], [460, 962], [461, 962], [461, 963], [463, 963], [463, 964], [464, 964], [464, 965], [466, 965], [466, 966], [467, 966], [467, 967], [469, 967], [469, 968], [470, 968], [470, 969], [472, 969], [472, 970], [473, 970], [473, 971], [474, 971], [474, 972], [473, 972], [473, 974], [472, 974], [472, 976], [471, 976], [471, 978], [470, 978], [470, 980], [469, 980], [469, 982], [468, 982], [468, 984], [467, 984], [467, 986], [466, 986], [466, 988], [465, 988], [465, 990], [464, 990], [464, 992], [463, 992], [463, 994], [462, 994], [462, 996], [461, 996], [461, 998], [460, 998], [460, 1000], [459, 1000], [459, 1002], [458, 1002], [458, 1004], [457, 1004], [457, 1006], [456, 1006], [456, 1008], [455, 1008], [455, 1010], [453, 1010], [453, 1009], [450, 1009], [450, 1008], [449, 1008], [449, 1007], [447, 1007], [447, 1006], [445, 1006], [445, 1005], [443, 1005], [443, 1004], [442, 1004], [442, 1003], [440, 1003], [440, 1002], [438, 1002], [438, 1001], [437, 1001], [437, 1000], [435, 1000], [435, 999], [434, 999], [434, 998], [432, 998], [432, 997], [431, 997], [431, 996], [429, 996], [429, 995], [428, 995], [428, 994], [426, 994], [426, 993], [425, 993], [425, 992], [423, 992], [423, 991], [422, 991], [422, 990], [420, 990], [420, 989], [418, 989], [418, 988], [417, 988], [417, 986], [418, 986], [418, 985], [419, 985], [419, 984], [420, 984], [420, 982], [421, 982], [421, 981], [422, 981], [422, 979], [423, 979], [423, 978], [424, 978], [424, 977], [425, 977], [425, 975], [426, 975], [426, 974], [427, 974], [427, 972], [428, 972], [428, 971], [429, 971], [429, 970], [430, 970], [430, 968], [431, 968], [431, 967], [432, 967], [432, 965], [433, 965], [433, 964], [434, 964], [434, 963], [435, 963], [435, 961], [436, 961], [436, 960], [437, 960], [437, 958], [438, 958], [438, 957], [439, 957], [439, 956], [440, 956], [440, 954], [441, 954], [441, 953], [442, 953], [442, 952], [443, 952]], 445, 980, '515', 10),
  'five-table-516': blockGeometry([[413, 923], [414, 923], [414, 924], [415, 924], [415, 925], [416, 925], [416, 926], [417, 926], [417, 927], [418, 927], [418, 928], [419, 928], [419, 929], [420, 929], [420, 930], [421, 930], [421, 931], [423, 931], [423, 932], [424, 932], [424, 933], [425, 933], [425, 934], [426, 934], [426, 935], [427, 935], [427, 936], [428, 936], [428, 937], [429, 937], [429, 938], [430, 938], [430, 939], [431, 939], [431, 940], [433, 940], [433, 941], [434, 941], [434, 942], [435, 942], [435, 943], [436, 943], [436, 944], [437, 944], [437, 945], [438, 945], [438, 946], [439, 946], [439, 947], [441, 947], [441, 948], [440, 948], [440, 950], [439, 950], [439, 951], [438, 951], [438, 952], [437, 952], [437, 954], [436, 954], [436, 955], [435, 955], [435, 957], [434, 957], [434, 958], [433, 958], [433, 959], [432, 959], [432, 961], [431, 961], [431, 962], [430, 962], [430, 963], [429, 963], [429, 965], [428, 965], [428, 966], [427, 966], [427, 968], [426, 968], [426, 969], [425, 969], [425, 970], [424, 970], [424, 972], [423, 972], [423, 973], [422, 973], [422, 974], [421, 974], [421, 976], [420, 976], [420, 977], [419, 977], [419, 979], [418, 979], [418, 980], [417, 980], [417, 981], [416, 981], [416, 983], [415, 983], [415, 984], [412, 984], [412, 983], [411, 983], [411, 982], [409, 982], [409, 981], [408, 981], [408, 980], [406, 980], [406, 979], [405, 979], [405, 978], [403, 978], [403, 977], [402, 977], [402, 976], [401, 976], [401, 975], [399, 975], [399, 974], [398, 974], [398, 973], [397, 973], [397, 972], [395, 972], [395, 971], [394, 971], [394, 970], [393, 970], [393, 969], [392, 969], [392, 968], [390, 968], [390, 967], [389, 967], [389, 966], [388, 966], [388, 965], [387, 965], [387, 964], [386, 964], [386, 963], [385, 963], [385, 962], [384, 962], [384, 961], [383, 961], [383, 960], [382, 960], [382, 959], [381, 959], [381, 958], [380, 958], [380, 957], [381, 957], [381, 956], [382, 956], [382, 955], [383, 955], [383, 954], [384, 954], [384, 953], [385, 953], [385, 952], [386, 952], [386, 951], [387, 951], [387, 950], [388, 950], [388, 949], [389, 949], [389, 948], [390, 948], [390, 947], [391, 947], [391, 946], [392, 946], [392, 945], [393, 945], [393, 944], [394, 944], [394, 943], [395, 943], [395, 942], [396, 942], [396, 941], [397, 941], [397, 940], [398, 940], [398, 939], [399, 939], [399, 938], [400, 938], [400, 937], [401, 937], [401, 936], [402, 936], [402, 935], [403, 935], [403, 933], [404, 933], [404, 932], [405, 932], [405, 931], [406, 931], [406, 930], [407, 930], [407, 929], [408, 929], [408, 928], [409, 928], [409, 927], [410, 927], [410, 926], [411, 926], [411, 925], [412, 925], [412, 924], [413, 924]], 411, 953, '516', 10),
  'five-table-517': blockGeometry([[385, 893], [386, 893], [386, 894], [387, 894], [387, 895], [388, 895], [388, 896], [389, 896], [389, 897], [390, 897], [390, 898], [391, 898], [391, 899], [392, 899], [392, 901], [393, 901], [393, 902], [394, 902], [394, 903], [395, 903], [395, 904], [396, 904], [396, 905], [397, 905], [397, 906], [398, 906], [398, 907], [399, 907], [399, 908], [400, 908], [400, 909], [401, 909], [401, 910], [402, 910], [402, 911], [403, 911], [403, 912], [404, 912], [404, 914], [405, 914], [405, 915], [406, 915], [406, 916], [407, 916], [407, 917], [408, 917], [408, 918], [409, 918], [409, 919], [410, 919], [410, 921], [409, 921], [409, 922], [408, 922], [408, 923], [407, 923], [407, 924], [406, 924], [406, 925], [405, 925], [405, 926], [404, 926], [404, 927], [403, 927], [403, 928], [402, 928], [402, 929], [401, 929], [401, 930], [400, 930], [400, 931], [399, 931], [399, 932], [398, 932], [398, 933], [397, 933], [397, 934], [396, 934], [396, 935], [395, 935], [395, 936], [394, 936], [394, 937], [393, 937], [393, 938], [392, 938], [392, 939], [391, 939], [391, 941], [390, 941], [390, 942], [389, 942], [389, 943], [388, 943], [388, 944], [387, 944], [387, 945], [386, 945], [386, 946], [385, 946], [385, 947], [384, 947], [384, 948], [383, 948], [383, 949], [382, 949], [382, 950], [381, 950], [381, 951], [380, 951], [380, 952], [379, 952], [379, 953], [378, 953], [378, 954], [377, 954], [377, 955], [376, 955], [376, 954], [375, 954], [375, 953], [374, 953], [374, 952], [373, 952], [373, 951], [372, 951], [372, 950], [371, 950], [371, 949], [370, 949], [370, 948], [369, 948], [369, 946], [368, 946], [368, 945], [367, 945], [367, 944], [366, 944], [366, 943], [365, 943], [365, 942], [364, 942], [364, 941], [363, 941], [363, 940], [362, 940], [362, 939], [361, 939], [361, 938], [360, 938], [360, 936], [359, 936], [359, 935], [358, 935], [358, 934], [357, 934], [357, 933], [356, 933], [356, 932], [355, 932], [355, 931], [354, 931], [354, 930], [353, 930], [353, 929], [352, 929], [352, 928], [351, 928], [351, 926], [350, 926], [350, 925], [349, 925], [349, 924], [348, 924], [348, 922], [350, 922], [350, 921], [351, 921], [351, 920], [352, 920], [352, 919], [353, 919], [353, 918], [355, 918], [355, 917], [356, 917], [356, 916], [357, 916], [357, 915], [358, 915], [358, 914], [360, 914], [360, 913], [361, 913], [361, 912], [362, 912], [362, 911], [363, 911], [363, 910], [365, 910], [365, 909], [366, 909], [366, 908], [367, 908], [367, 907], [368, 907], [368, 906], [370, 906], [370, 905], [371, 905], [371, 904], [372, 904], [372, 903], [373, 903], [373, 902], [375, 902], [375, 901], [376, 901], [376, 900], [377, 900], [377, 899], [378, 899], [378, 898], [380, 898], [380, 897], [381, 897], [381, 896], [382, 896], [382, 895], [384, 895], [384, 894], [385, 894]], 379, 924, '517', 10),
  'five-table-518': blockGeometry([[361, 861], [363, 861], [363, 862], [364, 862], [364, 863], [365, 863], [365, 864], [366, 864], [366, 866], [367, 866], [367, 867], [368, 867], [368, 869], [369, 869], [369, 870], [370, 870], [370, 871], [371, 871], [371, 873], [372, 873], [372, 874], [373, 874], [373, 876], [374, 876], [374, 877], [375, 877], [375, 878], [376, 878], [376, 880], [377, 880], [377, 881], [378, 881], [378, 883], [379, 883], [379, 884], [380, 884], [380, 885], [381, 885], [381, 887], [382, 887], [382, 888], [383, 888], [383, 889], [385, 889], [385, 890], [383, 890], [383, 891], [382, 891], [382, 892], [380, 892], [380, 893], [379, 893], [379, 894], [378, 894], [378, 895], [376, 895], [376, 896], [375, 896], [375, 897], [374, 897], [374, 898], [373, 898], [373, 899], [371, 899], [371, 900], [370, 900], [370, 901], [369, 901], [369, 902], [367, 902], [367, 903], [366, 903], [366, 904], [365, 904], [365, 905], [364, 905], [364, 906], [362, 906], [362, 907], [361, 907], [361, 908], [360, 908], [360, 909], [358, 909], [358, 910], [357, 910], [357, 911], [356, 911], [356, 912], [355, 912], [355, 913], [353, 913], [353, 914], [352, 914], [352, 915], [351, 915], [351, 916], [349, 916], [349, 917], [348, 917], [348, 918], [347, 918], [347, 919], [345, 919], [345, 920], [344, 920], [344, 919], [343, 919], [343, 918], [342, 918], [342, 917], [341, 917], [341, 916], [340, 916], [340, 915], [339, 915], [339, 913], [338, 913], [338, 912], [337, 912], [337, 911], [336, 911], [336, 909], [335, 909], [335, 908], [334, 908], [334, 907], [333, 907], [333, 905], [332, 905], [332, 904], [331, 904], [331, 903], [330, 903], [330, 901], [329, 901], [329, 900], [328, 900], [328, 899], [327, 899], [327, 897], [326, 897], [326, 896], [325, 896], [325, 895], [324, 895], [324, 893], [323, 893], [323, 892], [322, 892], [322, 891], [321, 891], [321, 889], [320, 889], [320, 888], [319, 888], [319, 886], [320, 886], [320, 885], [321, 885], [321, 884], [323, 884], [323, 883], [326, 883], [326, 884], [328, 884], [328, 885], [336, 885], [336, 884], [338, 884], [338, 883], [339, 883], [339, 882], [340, 882], [340, 881], [341, 881], [341, 880], [342, 880], [342, 877], [343, 877], [343, 872], [344, 872], [344, 871], [346, 871], [346, 870], [347, 870], [347, 869], [349, 869], [349, 868], [351, 868], [351, 867], [352, 867], [352, 866], [354, 866], [354, 865], [356, 865], [356, 864], [358, 864], [358, 863], [359, 863], [359, 862], [361, 862]], 351, 890, '518', 10),
  'five-table-519': blockGeometry([[341, 827], [345, 827], [345, 829], [346, 829], [346, 831], [347, 831], [347, 833], [348, 833], [348, 835], [349, 835], [349, 837], [350, 837], [350, 838], [351, 838], [351, 840], [352, 840], [352, 842], [353, 842], [353, 844], [354, 844], [354, 846], [355, 846], [355, 848], [356, 848], [356, 850], [357, 850], [357, 852], [358, 852], [358, 854], [359, 854], [359, 856], [360, 856], [360, 857], [362, 857], [362, 858], [359, 858], [359, 859], [358, 859], [358, 860], [356, 860], [356, 861], [354, 861], [354, 862], [352, 862], [352, 863], [351, 863], [351, 864], [349, 864], [349, 865], [347, 865], [347, 866], [345, 866], [345, 867], [344, 867], [344, 868], [341, 868], [341, 867], [340, 867], [340, 866], [339, 866], [339, 865], [338, 865], [338, 864], [336, 864], [336, 863], [327, 863], [327, 864], [325, 864], [325, 865], [324, 865], [324, 866], [323, 866], [323, 867], [322, 867], [322, 869], [321, 869], [321, 873], [320, 873], [320, 874], [321, 874], [321, 879], [322, 879], [322, 880], [321, 880], [321, 881], [319, 881], [319, 882], [318, 882], [318, 883], [316, 883], [316, 882], [315, 882], [315, 880], [314, 880], [314, 878], [313, 878], [313, 876], [312, 876], [312, 874], [311, 874], [311, 872], [310, 872], [310, 870], [309, 870], [309, 868], [308, 868], [308, 866], [307, 866], [307, 864], [306, 864], [306, 863], [305, 863], [305, 861], [304, 861], [304, 859], [303, 859], [303, 857], [302, 857], [302, 855], [301, 855], [301, 853], [300, 853], [300, 851], [299, 851], [299, 849], [298, 849], [298, 847], [297, 847], [297, 845], [299, 845], [299, 844], [301, 844], [301, 843], [304, 843], [304, 842], [306, 842], [306, 841], [309, 841], [309, 840], [311, 840], [311, 839], [314, 839], [314, 838], [316, 838], [316, 837], [319, 837], [319, 836], [321, 836], [321, 835], [324, 835], [324, 834], [326, 834], [326, 833], [329, 833], [329, 832], [331, 832], [331, 831], [334, 831], [334, 830], [336, 830], [336, 829], [339, 829], [339, 828], [341, 828]], 329, 855, '519', 10),
  'five-table-520': blockGeometry([[329, 789], [331, 789], [331, 792], [332, 792], [332, 795], [333, 795], [333, 798], [334, 798], [334, 800], [335, 800], [335, 803], [336, 803], [336, 806], [337, 806], [337, 808], [338, 808], [338, 811], [339, 811], [339, 814], [340, 814], [340, 817], [341, 817], [341, 819], [342, 819], [342, 823], [340, 823], [340, 824], [337, 824], [337, 825], [335, 825], [335, 826], [333, 826], [333, 827], [330, 827], [330, 828], [328, 828], [328, 829], [325, 829], [325, 830], [323, 830], [323, 831], [320, 831], [320, 832], [318, 832], [318, 833], [316, 833], [316, 834], [313, 834], [313, 835], [311, 835], [311, 836], [308, 836], [308, 837], [306, 837], [306, 838], [303, 838], [303, 839], [301, 839], [301, 840], [299, 840], [299, 841], [296, 841], [296, 842], [294, 842], [294, 840], [293, 840], [293, 837], [292, 837], [292, 834], [291, 834], [291, 831], [290, 831], [290, 828], [289, 828], [289, 825], [288, 825], [288, 822], [287, 822], [287, 819], [286, 819], [286, 816], [285, 816], [285, 813], [284, 813], [284, 810], [283, 810], [283, 807], [282, 807], [282, 804], [281, 804], [281, 802], [282, 802], [282, 801], [286, 801], [286, 800], [290, 800], [290, 799], [294, 799], [294, 798], [298, 798], [298, 797], [302, 797], [302, 796], [305, 796], [305, 795], [309, 795], [309, 794], [313, 794], [313, 793], [317, 793], [317, 792], [321, 792], [321, 791], [325, 791], [325, 790], [329, 790]], 311, 815, '520', 10),
  'five-table-521': blockGeometry([[317, 753], [323, 753], [323, 757], [324, 757], [324, 762], [325, 762], [325, 767], [326, 767], [326, 772], [327, 772], [327, 776], [328, 776], [328, 781], [329, 781], [329, 785], [330, 785], [330, 786], [328, 786], [328, 787], [324, 787], [324, 788], [320, 788], [320, 789], [316, 789], [316, 790], [312, 790], [312, 791], [309, 791], [309, 792], [305, 792], [305, 793], [301, 793], [301, 794], [297, 794], [297, 795], [293, 795], [293, 796], [289, 796], [289, 797], [286, 797], [286, 798], [282, 798], [282, 799], [279, 799], [279, 794], [278, 794], [278, 789], [277, 789], [277, 784], [276, 784], [276, 779], [275, 779], [275, 774], [274, 774], [274, 768], [273, 768], [273, 763], [272, 763], [272, 758], [279, 758], [279, 757], [289, 757], [289, 756], [298, 756], [298, 755], [308, 755], [308, 754], [317, 754]], 301, 776, '521', 10),
  'five-table-522': blockGeometry([[269, 713], [299, 713], [299, 714], [320, 714], [320, 726], [321, 726], [321, 748], [322, 748], [322, 750], [312, 750], [312, 751], [303, 751], [303, 752], [293, 752], [293, 753], [284, 753], [284, 754], [275, 754], [275, 755], [271, 755], [271, 751], [270, 751], [270, 719], [269, 719]], 296, 734, '522', 10),
  'five-table-523': blockGeometry([[273, 668], [280, 668], [280, 669], [285, 669], [285, 670], [291, 670], [291, 671], [297, 671], [297, 672], [303, 672], [303, 673], [309, 673], [309, 674], [315, 674], [315, 675], [319, 675], [319, 677], [320, 677], [320, 679], [321, 679], [321, 680], [322, 680], [322, 681], [323, 681], [323, 682], [322, 682], [322, 689], [321, 689], [321, 703], [320, 703], [320, 710], [280, 710], [280, 709], [270, 709], [270, 699], [271, 699], [271, 688], [272, 688], [272, 677], [273, 677]], 296, 689, '523', 10),
  'five-table-524': blockGeometry([[281, 622], [282, 622], [282, 623], [288, 623], [288, 624], [294, 624], [294, 625], [301, 625], [301, 626], [307, 626], [307, 627], [313, 627], [313, 628], [319, 628], [319, 629], [326, 629], [326, 630], [328, 630], [328, 635], [327, 635], [327, 643], [326, 643], [326, 650], [325, 650], [325, 657], [324, 657], [324, 664], [323, 664], [323, 665], [322, 665], [322, 666], [321, 666], [321, 668], [320, 668], [320, 670], [319, 670], [319, 672], [316, 672], [316, 671], [310, 671], [310, 670], [304, 670], [304, 669], [298, 669], [298, 668], [293, 668], [293, 667], [287, 667], [287, 666], [281, 666], [281, 665], [275, 665], [275, 664], [273, 664], [273, 663], [274, 663], [274, 657], [275, 657], [275, 652], [276, 652], [276, 646], [277, 646], [277, 641], [278, 641], [278, 635], [279, 635], [279, 630], [280, 630], [280, 624], [281, 624]], 301, 647, '524', 10),
  'five-table-525': blockGeometry([[289, 577], [290, 577], [290, 578], [296, 578], [296, 579], [302, 579], [302, 580], [307, 580], [307, 581], [313, 581], [313, 582], [319, 582], [319, 583], [325, 583], [325, 584], [330, 584], [330, 585], [335, 585], [335, 587], [334, 587], [334, 594], [333, 594], [333, 600], [332, 600], [332, 607], [331, 607], [331, 614], [330, 614], [330, 621], [329, 621], [329, 627], [326, 627], [326, 626], [320, 626], [320, 625], [314, 625], [314, 624], [308, 624], [308, 623], [303, 623], [303, 622], [297, 622], [297, 621], [291, 621], [291, 620], [285, 620], [285, 619], [281, 619], [281, 617], [282, 617], [282, 612], [283, 612], [283, 606], [284, 606], [284, 601], [285, 601], [285, 595], [286, 595], [286, 589], [287, 589], [287, 583], [288, 583], [288, 578], [289, 578]], 308, 602, '525', 10),
  'five-table-526': blockGeometry([[297, 533], [301, 533], [301, 534], [306, 534], [306, 535], [311, 535], [311, 536], [316, 536], [316, 537], [321, 537], [321, 538], [326, 538], [326, 539], [331, 539], [331, 540], [336, 540], [336, 541], [341, 541], [341, 542], [342, 542], [342, 545], [341, 545], [341, 551], [340, 551], [340, 557], [339, 557], [339, 563], [338, 563], [338, 568], [337, 568], [337, 574], [336, 574], [336, 580], [335, 580], [335, 582], [334, 582], [334, 581], [328, 581], [328, 580], [322, 580], [322, 579], [316, 579], [316, 578], [310, 578], [310, 577], [304, 577], [304, 576], [298, 576], [298, 575], [293, 575], [293, 574], [289, 574], [289, 568], [290, 568], [290, 563], [291, 563], [291, 558], [292, 558], [292, 553], [293, 553], [293, 548], [294, 548], [294, 543], [295, 543], [295, 539], [296, 539], [296, 534], [297, 534]], 315, 557, '526', 10),
  'five-table-527': blockGeometry([[310, 486], [314, 486], [314, 487], [317, 487], [317, 491], [318, 491], [318, 494], [319, 494], [319, 496], [320, 496], [320, 497], [321, 497], [321, 498], [322, 498], [322, 499], [323, 499], [323, 500], [326, 500], [326, 501], [332, 501], [332, 500], [334, 500], [334, 499], [336, 499], [336, 498], [337, 498], [337, 497], [338, 497], [338, 495], [339, 495], [339, 494], [341, 494], [341, 495], [344, 495], [344, 496], [348, 496], [348, 497], [351, 497], [351, 498], [353, 498], [353, 501], [352, 501], [352, 505], [351, 505], [351, 509], [350, 509], [350, 513], [349, 513], [349, 517], [348, 517], [348, 521], [347, 521], [347, 525], [346, 525], [346, 529], [345, 529], [345, 533], [344, 533], [344, 537], [343, 537], [343, 539], [340, 539], [340, 538], [335, 538], [335, 537], [330, 537], [330, 536], [325, 536], [325, 535], [320, 535], [320, 534], [315, 534], [315, 533], [310, 533], [310, 532], [305, 532], [305, 531], [300, 531], [300, 530], [298, 530], [298, 529], [299, 529], [299, 524], [300, 524], [300, 520], [301, 520], [301, 517], [302, 517], [302, 513], [303, 513], [303, 509], [304, 509], [304, 505], [305, 505], [305, 502], [306, 502], [306, 499], [307, 499], [307, 495], [308, 495], [308, 492], [309, 492], [309, 489], [310, 489]], 325, 512, '527', 10),
  'five-table-528': blockGeometry([[328, 440], [329, 440], [329, 441], [331, 441], [331, 442], [333, 442], [333, 443], [336, 443], [336, 444], [338, 444], [338, 445], [340, 445], [340, 446], [343, 446], [343, 447], [345, 447], [345, 448], [347, 448], [347, 449], [349, 449], [349, 450], [352, 450], [352, 451], [354, 451], [354, 452], [356, 452], [356, 453], [359, 453], [359, 454], [361, 454], [361, 455], [363, 455], [363, 456], [366, 456], [366, 457], [368, 457], [368, 459], [367, 459], [367, 462], [366, 462], [366, 464], [365, 464], [365, 467], [364, 467], [364, 470], [363, 470], [363, 473], [362, 473], [362, 475], [361, 475], [361, 478], [360, 478], [360, 481], [359, 481], [359, 483], [358, 483], [358, 486], [357, 486], [357, 489], [356, 489], [356, 492], [355, 492], [355, 494], [354, 494], [354, 496], [353, 496], [353, 495], [350, 495], [350, 494], [346, 494], [346, 493], [343, 493], [343, 492], [340, 492], [340, 486], [339, 486], [339, 484], [338, 484], [338, 483], [337, 483], [337, 481], [335, 481], [335, 480], [334, 480], [334, 479], [331, 479], [331, 478], [327, 478], [327, 479], [324, 479], [324, 480], [322, 480], [322, 481], [321, 481], [321, 482], [320, 482], [320, 483], [319, 483], [319, 485], [316, 485], [316, 484], [313, 484], [313, 483], [312, 483], [312, 480], [313, 480], [313, 477], [314, 477], [314, 474], [315, 474], [315, 471], [316, 471], [316, 469], [317, 469], [317, 466], [318, 466], [318, 463], [319, 463], [319, 461], [320, 461], [320, 458], [321, 458], [321, 456], [322, 456], [322, 453], [323, 453], [323, 451], [324, 451], [324, 449], [325, 449], [325, 446], [326, 446], [326, 444], [327, 444], [327, 442], [328, 442]], 340, 468, '528', 10),
  'five-table-529': blockGeometry([[350, 396], [351, 396], [351, 397], [353, 397], [353, 398], [355, 398], [355, 399], [357, 399], [357, 400], [359, 400], [359, 401], [360, 401], [360, 402], [362, 402], [362, 403], [364, 403], [364, 404], [366, 404], [366, 405], [368, 405], [368, 406], [369, 406], [369, 407], [371, 407], [371, 408], [373, 408], [373, 409], [375, 409], [375, 410], [376, 410], [376, 411], [378, 411], [378, 412], [380, 412], [380, 413], [382, 413], [382, 414], [384, 414], [384, 415], [385, 415], [385, 416], [387, 416], [387, 417], [390, 417], [390, 418], [388, 418], [388, 420], [387, 420], [387, 422], [386, 422], [386, 424], [385, 424], [385, 425], [384, 425], [384, 427], [383, 427], [383, 429], [382, 429], [382, 431], [381, 431], [381, 433], [380, 433], [380, 435], [379, 435], [379, 437], [378, 437], [378, 439], [377, 439], [377, 441], [376, 441], [376, 443], [375, 443], [375, 445], [374, 445], [374, 447], [373, 447], [373, 448], [372, 448], [372, 450], [371, 450], [371, 452], [370, 452], [370, 455], [369, 455], [369, 454], [367, 454], [367, 453], [365, 453], [365, 452], [363, 452], [363, 451], [360, 451], [360, 450], [358, 450], [358, 449], [356, 449], [356, 448], [353, 448], [353, 447], [351, 447], [351, 446], [349, 446], [349, 445], [346, 445], [346, 444], [344, 444], [344, 443], [342, 443], [342, 442], [339, 442], [339, 441], [337, 441], [337, 440], [335, 440], [335, 439], [332, 439], [332, 438], [330, 438], [330, 435], [331, 435], [331, 433], [332, 433], [332, 430], [333, 430], [333, 428], [334, 428], [334, 426], [335, 426], [335, 424], [336, 424], [336, 422], [337, 422], [337, 420], [338, 420], [338, 418], [339, 418], [339, 415], [340, 415], [340, 414], [341, 414], [341, 412], [342, 412], [342, 410], [343, 410], [343, 408], [344, 408], [344, 406], [345, 406], [345, 404], [346, 404], [346, 403], [347, 403], [347, 401], [348, 401], [348, 399], [349, 399], [349, 398], [350, 398]], 359, 425, '529', 10),
  'five-table-530': blockGeometry([[375, 358], [377, 358], [377, 359], [378, 359], [378, 360], [380, 360], [380, 361], [382, 361], [382, 362], [383, 362], [383, 363], [385, 363], [385, 364], [386, 364], [386, 365], [388, 365], [388, 366], [390, 366], [390, 367], [391, 367], [391, 368], [393, 368], [393, 369], [394, 369], [394, 370], [396, 370], [396, 371], [398, 371], [398, 372], [399, 372], [399, 373], [401, 373], [401, 374], [402, 374], [402, 375], [404, 375], [404, 376], [406, 376], [406, 377], [407, 377], [407, 378], [409, 378], [409, 379], [410, 379], [410, 380], [412, 380], [412, 382], [411, 382], [411, 384], [410, 384], [410, 385], [409, 385], [409, 387], [408, 387], [408, 389], [407, 389], [407, 390], [406, 390], [406, 392], [405, 392], [405, 393], [404, 393], [404, 395], [403, 395], [403, 396], [402, 396], [402, 398], [401, 398], [401, 400], [400, 400], [400, 401], [399, 401], [399, 403], [398, 403], [398, 404], [397, 404], [397, 406], [396, 406], [396, 407], [395, 407], [395, 409], [394, 409], [394, 411], [393, 411], [393, 412], [392, 412], [392, 414], [391, 414], [391, 416], [390, 416], [390, 415], [389, 415], [389, 414], [387, 414], [387, 413], [385, 413], [385, 412], [384, 412], [384, 411], [382, 411], [382, 410], [380, 410], [380, 409], [378, 409], [378, 408], [377, 408], [377, 407], [375, 407], [375, 406], [373, 406], [373, 405], [371, 405], [371, 404], [370, 404], [370, 403], [368, 403], [368, 402], [366, 402], [366, 401], [365, 401], [365, 400], [363, 400], [363, 399], [361, 399], [361, 398], [359, 398], [359, 397], [358, 397], [358, 396], [356, 396], [356, 395], [354, 395], [354, 394], [352, 394], [352, 392], [353, 392], [353, 391], [354, 391], [354, 389], [355, 389], [355, 388], [356, 388], [356, 386], [357, 386], [357, 385], [358, 385], [358, 383], [359, 383], [359, 382], [360, 382], [360, 380], [361, 380], [361, 379], [362, 379], [362, 377], [363, 377], [363, 376], [364, 376], [364, 374], [365, 374], [365, 373], [366, 373], [366, 371], [367, 371], [367, 370], [368, 370], [368, 368], [369, 368], [369, 367], [370, 367], [370, 365], [371, 365], [371, 364], [372, 364], [372, 362], [373, 362], [373, 361], [374, 361], [374, 359], [375, 359]], 382, 386, '530', 10),
  'five-table-531': blockGeometry([[402, 321], [405, 321], [405, 322], [406, 322], [406, 323], [408, 323], [408, 324], [410, 324], [410, 325], [411, 325], [411, 326], [413, 326], [413, 327], [414, 327], [414, 328], [416, 328], [416, 329], [418, 329], [418, 330], [419, 330], [419, 331], [421, 331], [421, 332], [423, 332], [423, 333], [424, 333], [424, 334], [426, 334], [426, 335], [427, 335], [427, 336], [429, 336], [429, 337], [431, 337], [431, 338], [432, 338], [432, 339], [434, 339], [434, 340], [436, 340], [436, 341], [438, 341], [438, 342], [436, 342], [436, 344], [435, 344], [435, 345], [434, 345], [434, 347], [433, 347], [433, 348], [432, 348], [432, 350], [431, 350], [431, 352], [430, 352], [430, 353], [429, 353], [429, 355], [428, 355], [428, 356], [427, 356], [427, 358], [426, 358], [426, 359], [425, 359], [425, 361], [424, 361], [424, 363], [423, 363], [423, 364], [422, 364], [422, 366], [421, 366], [421, 367], [420, 367], [420, 369], [419, 369], [419, 370], [418, 370], [418, 372], [417, 372], [417, 374], [416, 374], [416, 375], [415, 375], [415, 378], [414, 378], [414, 377], [413, 377], [413, 376], [412, 376], [412, 375], [410, 375], [410, 374], [409, 374], [409, 373], [407, 373], [407, 372], [405, 372], [405, 371], [404, 371], [404, 370], [402, 370], [402, 369], [401, 369], [401, 368], [399, 368], [399, 367], [397, 367], [397, 366], [396, 366], [396, 365], [394, 365], [394, 364], [393, 364], [393, 363], [391, 363], [391, 362], [389, 362], [389, 361], [388, 361], [388, 360], [386, 360], [386, 359], [385, 359], [385, 358], [383, 358], [383, 357], [382, 357], [382, 356], [380, 356], [380, 355], [379, 355], [379, 353], [380, 353], [380, 352], [381, 352], [381, 350], [382, 350], [382, 349], [383, 349], [383, 348], [384, 348], [384, 346], [385, 346], [385, 345], [386, 345], [386, 343], [387, 343], [387, 342], [388, 342], [388, 340], [389, 340], [389, 339], [390, 339], [390, 338], [391, 338], [391, 336], [392, 336], [392, 335], [393, 335], [393, 333], [394, 333], [394, 332], [395, 332], [395, 330], [396, 330], [396, 329], [397, 329], [397, 328], [398, 328], [398, 326], [399, 326], [399, 325], [400, 325], [400, 323], [401, 323], [401, 322], [402, 322]], 408, 349, '531', 10),
  'five-table-532': blockGeometry([[429, 283], [431, 283], [431, 284], [433, 284], [433, 285], [434, 285], [434, 286], [436, 286], [436, 287], [438, 287], [438, 288], [440, 288], [440, 289], [441, 289], [441, 290], [443, 290], [443, 291], [445, 291], [445, 292], [446, 292], [446, 293], [448, 293], [448, 294], [450, 294], [450, 295], [451, 295], [451, 296], [453, 296], [453, 297], [455, 297], [455, 298], [457, 298], [457, 299], [458, 299], [458, 300], [460, 300], [460, 301], [462, 301], [462, 302], [463, 302], [463, 305], [462, 305], [462, 306], [461, 306], [461, 308], [460, 308], [460, 309], [459, 309], [459, 311], [458, 311], [458, 312], [457, 312], [457, 313], [456, 313], [456, 315], [455, 315], [455, 316], [454, 316], [454, 318], [453, 318], [453, 319], [452, 319], [452, 321], [451, 321], [451, 322], [450, 322], [450, 324], [449, 324], [449, 325], [448, 325], [448, 327], [447, 327], [447, 328], [446, 328], [446, 330], [445, 330], [445, 331], [444, 331], [444, 333], [443, 333], [443, 334], [442, 334], [442, 336], [441, 336], [441, 337], [440, 337], [440, 338], [438, 338], [438, 337], [437, 337], [437, 336], [435, 336], [435, 335], [433, 335], [433, 334], [432, 334], [432, 333], [430, 333], [430, 332], [429, 332], [429, 331], [427, 331], [427, 330], [425, 330], [425, 329], [424, 329], [424, 328], [422, 328], [422, 327], [420, 327], [420, 326], [419, 326], [419, 325], [417, 325], [417, 324], [415, 324], [415, 323], [414, 323], [414, 322], [412, 322], [412, 321], [411, 321], [411, 320], [409, 320], [409, 319], [407, 319], [407, 318], [406, 318], [406, 317], [405, 317], [405, 315], [406, 315], [406, 314], [407, 314], [407, 312], [408, 312], [408, 311], [409, 311], [409, 310], [410, 310], [410, 308], [411, 308], [411, 307], [412, 307], [412, 306], [413, 306], [413, 304], [414, 304], [414, 303], [415, 303], [415, 302], [416, 302], [416, 300], [417, 300], [417, 299], [418, 299], [418, 298], [419, 298], [419, 296], [420, 296], [420, 295], [421, 295], [421, 294], [422, 294], [422, 292], [423, 292], [423, 291], [424, 291], [424, 290], [425, 290], [425, 288], [426, 288], [426, 287], [427, 287], [427, 286], [428, 286], [428, 285], [429, 285]], 434, 310, '532', 10),
  'five-table-533': blockGeometry([[459, 248], [462, 248], [462, 249], [464, 249], [464, 250], [465, 250], [465, 251], [467, 251], [467, 252], [468, 252], [468, 253], [470, 253], [470, 254], [472, 254], [472, 255], [473, 255], [473, 256], [475, 256], [475, 257], [477, 257], [477, 258], [478, 258], [478, 259], [480, 259], [480, 260], [481, 260], [481, 261], [483, 261], [483, 262], [485, 262], [485, 263], [486, 263], [486, 264], [488, 264], [488, 265], [490, 265], [490, 266], [488, 266], [488, 268], [487, 268], [487, 269], [486, 269], [486, 271], [485, 271], [485, 272], [484, 272], [484, 274], [483, 274], [483, 275], [482, 275], [482, 276], [481, 276], [481, 278], [480, 278], [480, 279], [479, 279], [479, 281], [478, 281], [478, 282], [477, 282], [477, 284], [476, 284], [476, 285], [475, 285], [475, 287], [474, 287], [474, 288], [473, 288], [473, 289], [472, 289], [472, 291], [471, 291], [471, 292], [470, 292], [470, 294], [469, 294], [469, 295], [468, 295], [468, 297], [467, 297], [467, 298], [466, 298], [466, 300], [465, 300], [465, 299], [463, 299], [463, 298], [462, 298], [462, 297], [460, 297], [460, 296], [458, 296], [458, 295], [456, 295], [456, 294], [455, 294], [455, 293], [453, 293], [453, 292], [451, 292], [451, 291], [450, 291], [450, 290], [448, 290], [448, 289], [446, 289], [446, 288], [445, 288], [445, 287], [443, 287], [443, 286], [441, 286], [441, 285], [440, 285], [440, 284], [438, 284], [438, 283], [436, 283], [436, 282], [435, 282], [435, 281], [433, 281], [433, 279], [434, 279], [434, 278], [435, 278], [435, 277], [436, 277], [436, 275], [437, 275], [437, 274], [438, 274], [438, 273], [439, 273], [439, 272], [440, 272], [440, 271], [441, 271], [441, 269], [442, 269], [442, 268], [443, 268], [443, 267], [444, 267], [444, 266], [445, 266], [445, 264], [446, 264], [446, 263], [447, 263], [447, 262], [448, 262], [448, 261], [449, 261], [449, 260], [450, 260], [450, 258], [451, 258], [451, 257], [452, 257], [452, 256], [453, 256], [453, 255], [454, 255], [454, 254], [455, 254], [455, 252], [456, 252], [456, 251], [457, 251], [457, 250], [458, 250], [458, 249], [459, 249]], 461, 274, '533', 10),
  'five-table-534': blockGeometry([[492, 214], [495, 214], [495, 215], [497, 215], [497, 216], [499, 216], [499, 217], [500, 217], [500, 218], [502, 218], [502, 219], [504, 219], [504, 220], [505, 220], [505, 221], [507, 221], [507, 222], [509, 222], [509, 223], [511, 223], [511, 224], [512, 224], [512, 225], [514, 225], [514, 226], [516, 226], [516, 227], [517, 227], [517, 229], [518, 229], [518, 230], [515, 230], [515, 231], [514, 231], [514, 233], [513, 233], [513, 234], [512, 234], [512, 235], [511, 235], [511, 237], [510, 237], [510, 238], [509, 238], [509, 239], [508, 239], [508, 241], [507, 241], [507, 242], [506, 242], [506, 243], [505, 243], [505, 245], [504, 245], [504, 246], [503, 246], [503, 247], [502, 247], [502, 249], [501, 249], [501, 250], [500, 250], [500, 251], [499, 251], [499, 253], [498, 253], [498, 254], [497, 254], [497, 255], [496, 255], [496, 257], [495, 257], [495, 258], [494, 258], [494, 259], [493, 259], [493, 261], [492, 261], [492, 262], [491, 262], [491, 261], [489, 261], [489, 260], [488, 260], [488, 259], [486, 259], [486, 258], [484, 258], [484, 257], [483, 257], [483, 256], [481, 256], [481, 255], [479, 255], [479, 254], [478, 254], [478, 253], [476, 253], [476, 252], [474, 252], [474, 251], [473, 251], [473, 250], [471, 250], [471, 249], [469, 249], [469, 248], [468, 248], [468, 247], [466, 247], [466, 246], [465, 246], [465, 245], [463, 245], [463, 244], [464, 244], [464, 242], [465, 242], [465, 241], [466, 241], [466, 240], [467, 240], [467, 239], [468, 239], [468, 238], [469, 238], [469, 237], [470, 237], [470, 236], [471, 236], [471, 235], [472, 235], [472, 234], [473, 234], [473, 233], [474, 233], [474, 232], [475, 232], [475, 231], [476, 231], [476, 230], [477, 230], [477, 229], [478, 229], [478, 228], [479, 228], [479, 227], [480, 227], [480, 226], [481, 226], [481, 225], [482, 225], [482, 224], [483, 224], [483, 223], [484, 223], [484, 222], [485, 222], [485, 221], [486, 221], [486, 220], [487, 220], [487, 219], [488, 219], [488, 218], [489, 218], [489, 217], [490, 217], [490, 216], [491, 216], [491, 215], [492, 215]], 490, 238, '534', 10),
  'five-table-535': blockGeometry([[497, 210.2], [497, 210], [506, 202], [518, 192], [528, 184], [541, 188], [546, 192], [542, 197], [522, 221], [516, 222], [509, 218], [499.3, 212.3]], 522, 203, '535', 10),
};

export const GWANGJU_IMAGE_GEOMETRY_DRAFTS: Record<string, GwangjuImageGeometryDraft> = {
  ...INFIELD_GEOMETRIES,
  ...K7_AGGREGATE_GEOMETRIES,
  ...SKY_PICNIC_GEOMETRIES,
  ...FIVE_TABLE_TRACE_GEOMETRIES,
  'champion-seats': blockGeometry([[461, 756], [515, 740], [517, 740], [518, 741], [559, 793], [559, 794], [558, 796], [553, 803], [536, 826], [527, 838], [523, 843], [512, 831], [497, 815], [487, 802], [475, 783]], 500, 792, 'A', 13),
  'central-table-seats': blockGeometry([[397, 771], [398, 770], [422, 764], [459, 755], [461, 756], [475, 783], [487, 802], [497, 815], [512, 831], [523, 843], [523, 844], [510, 863], [488, 895], [486, 895], [468, 882], [464, 879], [460, 875], [444, 857], [432, 842], [425, 833], [422, 829], [417, 822], [413, 816], [412, 814], [405, 799], [401, 790], [400, 787], [397, 773]], 430, 824, 'B', 13),
  'disabled-seats-center': blockGeometry([[390, 741], [403, 739], [414, 761], [394, 766]], 402, 753, 'C', 13),
  'first-surprise-seats': multiBlockGeometry([
    [[871, 772], [874, 772], [874, 773], [879, 773], [879, 774], [884, 774], [884, 775], [890, 775], [890, 776], [895, 776], [895, 777], [900, 777], [900, 778], [906, 778], [906, 779], [911, 779], [911, 780], [917, 780], [917, 781], [922, 781], [922, 782], [927, 782], [927, 783], [933, 783], [933, 784], [938, 784], [938, 785], [943, 785], [943, 786], [949, 786], [949, 787], [954, 787], [954, 788], [959, 788], [959, 789], [958, 789], [958, 790], [954, 790], [954, 791], [950, 791], [950, 792], [946, 792], [946, 793], [943, 793], [943, 794], [939, 794], [939, 795], [935, 795], [935, 796], [931, 796], [931, 797], [927, 797], [927, 798], [924, 798], [924, 799], [920, 799], [920, 800], [916, 800], [916, 801], [912, 801], [912, 802], [908, 802], [908, 803], [904, 803], [904, 804], [901, 804], [901, 805], [897, 805], [897, 806], [893, 806], [893, 807], [889, 807], [889, 808], [885, 808], [885, 809], [882, 809], [882, 810], [878, 810], [878, 811], [874, 811], [874, 812], [870, 812], [870, 813], [866, 813], [866, 814], [863, 814], [863, 815], [859, 815], [859, 816], [855, 816], [855, 817], [851, 817], [851, 818], [847, 818], [847, 819], [843, 819], [843, 820], [840, 820], [840, 821], [836, 821], [836, 822], [832, 822], [832, 823], [828, 823], [828, 824], [824, 824], [824, 825], [821, 825], [821, 826], [817, 826], [817, 827], [813, 827], [813, 828], [809, 828], [809, 829], [805, 829], [805, 830], [801, 830], [801, 829], [802, 829], [802, 828], [803, 828], [803, 827], [805, 827], [805, 826], [806, 826], [806, 825], [807, 825], [807, 824], [808, 824], [808, 823], [809, 823], [809, 822], [811, 822], [811, 821], [812, 821], [812, 820], [813, 820], [813, 819], [814, 819], [814, 818], [816, 818], [816, 817], [817, 817], [817, 816], [818, 816], [818, 815], [819, 815], [819, 814], [821, 814], [821, 813], [822, 813], [822, 812], [823, 812], [823, 811], [824, 811], [824, 810], [826, 810], [826, 809], [827, 809], [827, 808], [828, 808], [828, 807], [829, 807], [829, 806], [830, 806], [830, 805], [832, 805], [832, 804], [833, 804], [833, 803], [834, 803], [834, 802], [835, 802], [835, 801], [837, 801], [837, 800], [838, 800], [838, 799], [839, 799], [839, 798], [840, 798], [840, 797], [842, 797], [842, 796], [843, 796], [843, 795], [844, 795], [844, 794], [845, 794], [845, 793], [847, 793], [847, 792], [848, 792], [848, 791], [849, 791], [849, 790], [850, 790], [850, 789], [851, 789], [851, 788], [853, 788], [853, 787], [854, 787], [854, 786], [855, 786], [855, 785], [856, 785], [856, 784], [858, 784], [858, 783], [859, 783], [859, 782], [860, 782], [860, 781], [861, 781], [861, 780], [863, 780], [863, 779], [864, 779], [864, 778], [865, 778], [865, 777], [866, 777], [866, 776], [868, 776], [868, 775], [869, 775], [869, 774], [870, 774], [870, 773], [871, 773]],
    [[717, 832], [742, 832], [742, 833], [741, 833], [741, 846], [714, 846], [714, 844], [715, 844], [715, 839], [716, 839], [716, 834], [717, 834]],
    [[763, 832], [765, 832], [765, 833], [789, 833], [789, 835], [790, 835], [790, 846], [791, 846], [791, 848], [786, 848], [786, 847], [764, 847], [764, 833], [763, 833]],
  ], 870, 800, 'G', 13),
  'third-surprise-seats': multiBlockGeometry([
    [[574, 515], [593, 486], [614, 454], [637, 419], [655, 392], [656, 392], [656, 397], [650, 427], [642, 466], [641, 469], [629, 478], [583, 512], [576, 517], [574, 517]],
    [[548, 513], [552, 507], [579, 469], [589, 455], [594, 454], [602, 458], [604, 460], [604, 462], [591, 482], [574, 508], [566, 520], [565, 521], [564, 521], [548, 514]],
    [[515, 581], [530, 550], [540, 530], [541, 530], [557, 537], [557, 538], [550, 553], [540, 574], [535, 584], [534, 585], [529, 585], [516, 583], [515, 582]],
  ], 620, 475, 'G', 13),
  'first-family-seats': blockGeometry([[1123, 812], [1119, 815], [1109, 820], [1095, 825], [1077, 830], [1056, 835], [1034, 840], [1013, 845], [1013, 855], [1013, 860], [1011, 870], [1011, 875], [1009, 880], [1008, 885], [1007, 890], [1010, 904], [1012, 904], [1034, 899], [1115, 892], [1135, 885], [1159, 870], [1173, 860], [1185, 850], [1165, 830], [1161, 825], [1156, 820], [1150, 815], [1129, 812]], 1095, 865, 'H', 13, [[1123, 812], [1119, 815], [1109, 820], [1095, 825], [1077, 830], [1056, 835], [1034, 840], [1013, 845], [1011, 855], [1011, 860], [1009, 870], [1009, 875], [1008, 880], [1008, 885], [1007, 890], [1010, 905], [1012, 905], [1034, 900], [1115, 895], [1135, 885], [1159, 870], [1173, 860], [1185, 850], [1165, 830], [1161, 825], [1156, 820], [1150, 815], [1129, 812]]),
  'third-family-seats': blockGeometry([[668, 158], [666, 159], [646, 171], [642, 174], [637, 177], [617, 192], [614, 195], [610, 198], [607, 201], [603, 204], [600, 207], [601, 210], [611, 216], [610, 219], [607, 222], [569, 279], [573, 282], [579, 285], [599, 297], [605, 300], [615, 306], [620, 307], [622, 307], [623, 306], [649, 267], [660, 264], [654, 261], [662, 249], [665, 246], [667, 243], [676, 234], [680, 231], [683, 228], [687, 225], [689, 219], [689, 216], [691, 210], [691, 207], [692, 204], [692, 198], [688, 192], [687, 189], [683, 183], [682, 180], [678, 174], [677, 171], [673, 165], [672, 162], [670, 159], [670, 158]], 626, 236, 'H', 13),
  'first-wheelchair-seats': blockGeometry([[1106, 893], [1101, 894], [1089, 897], [1076, 900], [1064, 903], [1051, 906], [1039, 909], [1026, 912], [1014, 915], [1001, 918], [989, 921], [981, 924], [980, 927], [958, 930], [960, 936], [960, 939], [961, 942], [962, 944], [967, 944], [976, 942], [988, 939], [1001, 936], [1013, 933], [1026, 930], [1038, 927], [1051, 924], [1063, 921], [1076, 918], [1088, 915], [1101, 912], [1112, 909], [1110, 903], [1110, 900], [1108, 894], [1108, 893]], 1005, 921, 'I', 13),
  'third-wheelchair-seats': multiBlockGeometry([
    [[585, 204], [583, 208], [577, 216], [572, 224], [567, 232], [561, 240], [556, 248], [551, 256], [546, 264], [540, 272], [535, 280], [530, 288], [524, 296], [519, 304], [514, 312], [508, 320], [503, 328], [505, 328], [512, 320], [520, 312], [528, 304], [536, 296], [560, 288], [566, 280], [572, 272], [579, 264], [583, 256], [588, 248], [594, 240], [599, 232], [604, 224], [607, 216], [594, 208], [588, 204]],
    [[438, 359], [472, 304], [486, 288], [508, 299], [494, 326], [452, 361], [438, 362]],
  ], 493, 325, 'I', 13, [
    [[585, 204], [583, 208], [577, 216], [567, 232], [561, 240], [546, 264], [540, 272], [530, 288], [524, 296], [514, 312], [508, 320], [503, 328], [505, 328], [520, 320], [528, 312], [532, 304], [555, 296], [560, 288], [572, 272], [579, 264], [583, 256], [588, 248], [594, 240], [604, 224], [607, 216], [594, 208], [588, 204]],
    [[438, 359], [472, 304], [486, 288], [508, 299], [494, 326], [452, 361], [438, 362]],
  ]),
  'party-seats-first': blockGeometry([[915, 932], [941, 933], [928, 936], [910, 939], [903, 942], [891, 945], [878, 948], [867, 951], [868, 954], [869, 957], [869, 960], [870, 963], [871, 966], [876, 966], [888, 963], [900, 960], [918, 957], [922, 954], [937, 951], [949, 948], [959, 945], [958, 942], [957, 939], [957, 936], [956, 933], [955, 930]], 910, 950, 'J', 13, [[905, 930], [941, 933], [928, 936], [910, 939], [903, 942], [891, 945], [878, 948], [867, 951], [869, 957], [869, 960], [871, 966], [876, 966], [900, 960], [918, 957], [922, 954], [937, 951], [949, 948], [959, 945], [957, 939], [957, 936], [955, 930]]),
  'party-seats-third': blockGeometry([[430, 389], [438, 374], [452, 363], [470, 353], [482, 356], [489, 365], [489, 371], [467, 398], [446, 394]], 474, 366, 'J', 13),
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
  'k5-101': { numberAnchor: { x: 1096, y: 820 }, expectedBounds: { minX: 1058, minY: 802, maxX: 1115, maxY: 825 }, expectedSubpathCount: 1 },
  'k5-102': { numberAnchor: { x: 1038, y: 820 }, expectedBounds: { minX: 1009, minY: 794, maxX: 1057, maxY: 839 }, expectedSubpathCount: 1 },
  'k5-103': { numberAnchor: { x: 990, y: 850 }, expectedBounds: { minX: 961, minY: 789, maxX: 1013, maxY: 906 }, expectedSubpathCount: 1 },
  'k5-104': { numberAnchor: { x: 952, y: 872 }, expectedBounds: { minX: 918, minY: 797, maxX: 982, maxY: 917 }, expectedSubpathCount: 1 },
  'k5-105': { numberAnchor: { x: 906, y: 884 }, expectedBounds: { minX: 873, minY: 808, maxX: 938, maxY: 932 }, expectedSubpathCount: 1 },
  'k5-106': { numberAnchor: { x: 845, y: 886 }, expectedBounds: { minX: 829, minY: 819, maxX: 894, maxY: 943 }, expectedSubpathCount: 1 },
  'k7-107': { numberAnchor: { x: 820, y: 895 }, expectedBounds: { minX: 797, minY: 835, maxX: 850, maxY: 951 }, expectedSubpathCount: 1 },
  'k7-108': { numberAnchor: { x: 760, y: 895 }, expectedBounds: { minX: 736, minY: 847, maxX: 808, maxY: 953 }, expectedSubpathCount: 1 },
  'k7-109': { numberAnchor: { x: 725, y: 902 }, expectedBounds: { minX: 695, minY: 848, maxX: 742, maxY: 953 }, expectedSubpathCount: 1 },
  'k7-110': { numberAnchor: { x: 670, y: 900 }, expectedBounds: { minX: 638.3, minY: 854, maxX: 697.7, maxY: 933.2 }, expectedSubpathCount: 1 },
  'k7-111': { numberAnchor: { x: 630, y: 892 }, expectedBounds: { minX: 605, minY: 834, maxX: 650, maxY: 936 }, expectedSubpathCount: 1 },
  'k9-112': { numberAnchor: { x: 586, y: 884 }, expectedBounds: { minX: 566, minY: 829, maxX: 618, maxY: 933 }, expectedSubpathCount: 1 },
  'k9-113': { numberAnchor: { x: 535, y: 880 }, expectedBounds: { minX: 505, minY: 795, maxX: 594, maxY: 920 }, expectedSubpathCount: 1 },
  'k9-116': { numberAnchor: { x: 472, y: 730 }, expectedBounds: { minX: 388, minY: 697, maxX: 501, maxY: 760 }, expectedSubpathCount: 1 },
  'k9-117': { numberAnchor: { x: 480, y: 680 }, expectedBounds: { minX: 390, minY: 658, maxX: 503, maxY: 698 }, expectedSubpathCount: 1 },
  'k7-118': { numberAnchor: { x: 480, y: 650 }, expectedBounds: { minX: 395, minY: 615, maxX: 512, maxY: 669 }, expectedSubpathCount: 1 },
  'k7-119': { numberAnchor: { x: 480, y: 604 }, expectedBounds: { minX: 404, minY: 573, maxX: 520, maxY: 626 }, expectedSubpathCount: 1 },
  'k7-120': { numberAnchor: { x: 496, y: 558 }, expectedBounds: { minX: 412, minY: 533, maxX: 519, maxY: 582 }, expectedSubpathCount: 1 },
  'k7-121': { numberAnchor: { x: 445, y: 640 }, expectedBounds: { minX: 395, minY: 616, maxX: 510, maxY: 668 }, expectedSubpathCount: 1 },
  'k7-122': { numberAnchor: { x: 456, y: 598 }, expectedBounds: { minX: 404, minY: 573, maxX: 519, maxY: 626 }, expectedSubpathCount: 1 },
  'home-k7-seats': { numberAnchor: { x: 820, y: 895 }, expectedBounds: { minX: 395, minY: 533, maxX: 850, maxY: 953 }, expectedSubpathCount: 10 },
  'away-cheering-seats': { numberAnchor: { x: 820, y: 895 }, expectedBounds: { minX: 638.3, minY: 835, maxX: 850, maxY: 953 }, expectedSubpathCount: 4 },
  'k8-123': { numberAnchor: { x: 470, y: 508 }, expectedBounds: { minX: 411, minY: 464, maxX: 543, maxY: 582 }, expectedSubpathCount: 1 },
  'k5-124': { numberAnchor: { x: 500, y: 465 }, expectedBounds: { minX: 449, minY: 393, maxX: 591, maxY: 510 }, expectedSubpathCount: 1 },
  'k5-125': { numberAnchor: { x: 546, y: 391 }, expectedBounds: { minX: 496, minY: 356, maxX: 627, maxY: 451 }, expectedSubpathCount: 1 },
  'k5-126': { numberAnchor: { x: 614, y: 325 }, expectedBounds: { minX: 520, minY: 317, maxX: 652, maxY: 413 }, expectedSubpathCount: 1 },
  'k5-127': { numberAnchor: { x: 668, y: 269 }, expectedBounds: { minX: 645, minY: 232, maxX: 688, maxY: 300 }, expectedSubpathCount: 1 },
  'sky-picnic-s-301': { numberAnchor: { x: 856, y: 963 }, expectedBounds: { minX: 846, minY: 952, maxX: 867, maxY: 974 }, expectedSubpathCount: 1 },
  'sky-picnic-s-302': { numberAnchor: { x: 834, y: 968 }, expectedBounds: { minX: 822, minY: 957, maxX: 845, maxY: 978 }, expectedSubpathCount: 1 },
  'sky-picnic-s-303': { numberAnchor: { x: 811, y: 972 }, expectedBounds: { minX: 799, minY: 961, maxX: 822, maxY: 982 }, expectedSubpathCount: 1 },
  'sky-picnic-s-304': { numberAnchor: { x: 788, y: 975 }, expectedBounds: { minX: 778, minY: 965, maxX: 798, maxY: 984 }, expectedSubpathCount: 1 },
  'sky-picnic-s-305': { numberAnchor: { x: 767, y: 975 }, expectedBounds: { minX: 756, minY: 957, maxX: 777, maxY: 984 }, expectedSubpathCount: 1 },
  'sky-picnic-s-306': { numberAnchor: { x: 745, y: 974 }, expectedBounds: { minX: 733, minY: 956, maxX: 756, maxY: 984 }, expectedSubpathCount: 1 },
  'sky-picnic-s-307': { numberAnchor: { x: 721, y: 972 }, expectedBounds: { minX: 709, minY: 954, maxX: 734, maxY: 982 }, expectedSubpathCount: 1 },
  'sky-picnic-s-308': { numberAnchor: { x: 699, y: 969 }, expectedBounds: { minX: 687, minY: 952, maxX: 712, maxY: 979 }, expectedSubpathCount: 1 },
  'sky-picnic-s-309': { numberAnchor: { x: 676, y: 967 }, expectedBounds: { minX: 664, minY: 948, maxX: 689, maxY: 976 }, expectedSubpathCount: 1 },
  'sky-picnic-s-310': { numberAnchor: { x: 653, y: 962 }, expectedBounds: { minX: 641, minY: 943, maxX: 668, maxY: 972 }, expectedSubpathCount: 1 },
  'sky-picnic-s-311': { numberAnchor: { x: 630, y: 958 }, expectedBounds: { minX: 618, minY: 940, maxX: 644, maxY: 969 }, expectedSubpathCount: 1 },
  'sky-picnic-s-312': { numberAnchor: { x: 607, y: 955 }, expectedBounds: { minX: 595, minY: 937, maxX: 620, maxY: 965 }, expectedSubpathCount: 1 },
  'sky-picnic-s-313': { numberAnchor: { x: 584, y: 952 }, expectedBounds: { minX: 569, minY: 935, maxX: 597, maxY: 962 }, expectedSubpathCount: 1 },
  'sky-picnic-s-314': { numberAnchor: { x: 555, y: 947 }, expectedBounds: { minX: 536, minY: 929, maxX: 572, maxY: 958 }, expectedSubpathCount: 1 },
  'sky-picnic-s-315': { numberAnchor: { x: 523, y: 937 }, expectedBounds: { minX: 501, minY: 915, maxX: 544, maxY: 958 }, expectedSubpathCount: 1 },
  'sky-picnic-s-316': { numberAnchor: { x: 492, y: 920 }, expectedBounds: { minX: 472, minY: 898, maxX: 512, maxY: 942 }, expectedSubpathCount: 1 },
  'sky-picnic-s-317': { numberAnchor: { x: 463, y: 901 }, expectedBounds: { minX: 452, minY: 880, maxX: 482, maxY: 922 }, expectedSubpathCount: 1 },
  'sky-picnic-s-318': { numberAnchor: { x: 424, y: 870 }, expectedBounds: { minX: 409, minY: 849, maxX: 451, maxY: 891 }, expectedSubpathCount: 1 },
  'sky-picnic-s-319': { numberAnchor: { x: 389, y: 792 }, expectedBounds: { minX: 371, minY: 783, maxX: 397, maxY: 827 }, expectedSubpathCount: 1 },
  'sky-picnic-s-320': { numberAnchor: { x: 376, y: 765 }, expectedBounds: { minX: 364, minY: 752, maxX: 392, maxY: 779 }, expectedSubpathCount: 1 },
  'sky-picnic-s-321': { numberAnchor: { x: 371, y: 724 }, expectedBounds: { minX: 360, minY: 708, maxX: 386, maxY: 750 }, expectedSubpathCount: 1 },
  'sky-picnic-s-322': { numberAnchor: { x: 374, y: 688 }, expectedBounds: { minX: 360, minY: 678, maxX: 386, maxY: 704 }, expectedSubpathCount: 1 },
  'sky-picnic-s-323': { numberAnchor: { x: 378, y: 665 }, expectedBounds: { minX: 364, minY: 656, maxX: 391, maxY: 674 }, expectedSubpathCount: 1 },
  'sky-picnic-s-324': { numberAnchor: { x: 383, y: 636 }, expectedBounds: { minX: 369, minY: 626, maxX: 395, maxY: 654 }, expectedSubpathCount: 1 },
  'sky-picnic-s-325': { numberAnchor: { x: 385, y: 613 }, expectedBounds: { minX: 374, minY: 604, maxX: 403, maxY: 625 }, expectedSubpathCount: 1 },
  'sky-picnic-s-326': { numberAnchor: { x: 389, y: 591 }, expectedBounds: { minX: 378, minY: 583, maxX: 407, maxY: 602 }, expectedSubpathCount: 1 },
  'sky-picnic-s-327': { numberAnchor: { x: 393, y: 570 }, expectedBounds: { minX: 382, minY: 562, maxX: 411, maxY: 580 }, expectedSubpathCount: 1 },
  'sky-picnic-s-328': { numberAnchor: { x: 397, y: 549 }, expectedBounds: { minX: 386, minY: 541, maxX: 415, maxY: 559 }, expectedSubpathCount: 1 },
  'sky-picnic-s-329': { numberAnchor: { x: 402, y: 529 }, expectedBounds: { minX: 390, minY: 521, maxX: 418, maxY: 536 }, expectedSubpathCount: 1 },
  'sky-picnic-s-330': { numberAnchor: { x: 407, y: 509 }, expectedBounds: { minX: 395, minY: 502, maxX: 423, maxY: 517 }, expectedSubpathCount: 1 },
  'sky-picnic-s-331': { numberAnchor: { x: 412, y: 493 }, expectedBounds: { minX: 398, minY: 485, maxX: 426, maxY: 501 }, expectedSubpathCount: 1 },
  'sky-picnic-s-332': { numberAnchor: { x: 420, y: 474 }, expectedBounds: { minX: 406, minY: 465, maxX: 435, maxY: 482 }, expectedSubpathCount: 1 },
  'sky-picnic-s-333': { numberAnchor: { x: 411, y: 458 }, expectedBounds: { minX: 382, minY: 448, maxX: 418, maxY: 464 }, expectedSubpathCount: 1 },
  'sky-picnic-s-334': { numberAnchor: { x: 430, y: 445 }, expectedBounds: { minX: 418, minY: 433, maxX: 445, maxY: 466 }, expectedSubpathCount: 1 },
  'sky-picnic-s-335': { numberAnchor: { x: 447, y: 418 }, expectedBounds: { minX: 430, minY: 404, maxX: 467, maxY: 431 }, expectedSubpathCount: 1 },
  'five-table-501': { numberAnchor: { x: 1097, y: 970 }, expectedBounds: { minX: 1076, minY: 952, maxX: 1118, maxY: 988 }, expectedSubpathCount: 1 },
  'five-table-502': { numberAnchor: { x: 1054, y: 987 }, expectedBounds: { minX: 1032, minY: 966, maxX: 1077, maxY: 1008 }, expectedSubpathCount: 1 },
  'five-table-503': { numberAnchor: { x: 1010, y: 1001 }, expectedBounds: { minX: 985, minY: 978, maxX: 1035, maxY: 1025 }, expectedSubpathCount: 1 },
  'five-table-504': { numberAnchor: { x: 963, y: 1013 }, expectedBounds: { minX: 938, minY: 988, maxX: 989, maxY: 1038 }, expectedSubpathCount: 1 },
  'five-table-505': { numberAnchor: { x: 919, y: 1024 }, expectedBounds: { minX: 895, minY: 999, maxX: 943, maxY: 1049 }, expectedSubpathCount: 1 },
  'five-table-506': { numberAnchor: { x: 873, y: 1035 }, expectedBounds: { minX: 847, minY: 1010, maxX: 899, maxY: 1060 }, expectedSubpathCount: 1 },
  'five-table-507': { numberAnchor: { x: 825, y: 1044 }, expectedBounds: { minX: 801, minY: 1020, maxX: 849, maxY: 1068 }, expectedSubpathCount: 1 },
  'five-table-508': { numberAnchor: { x: 776, y: 1048 }, expectedBounds: { minX: 752, minY: 1027, maxX: 800, maxY: 1070 }, expectedSubpathCount: 1 },
  'five-table-509': { numberAnchor: { x: 724, y: 1047 }, expectedBounds: { minX: 700, minY: 1024, maxX: 748, maxY: 1071 }, expectedSubpathCount: 1 },
  'five-table-510': { numberAnchor: { x: 678, y: 1042 }, expectedBounds: { minX: 653, minY: 1018, maxX: 704, maxY: 1069 }, expectedSubpathCount: 1 },
  'five-table-511': { numberAnchor: { x: 631, y: 1038 }, expectedBounds: { minX: 605, minY: 1012, maxX: 657, maxY: 1064 }, expectedSubpathCount: 1 },
  'five-table-512': { numberAnchor: { x: 583, y: 1030 }, expectedBounds: { minX: 557, minY: 1005, maxX: 609, maxY: 1055 }, expectedSubpathCount: 1 },
  'five-table-513': { numberAnchor: { x: 530, y: 1018 }, expectedBounds: { minX: 502, minY: 992, maxX: 559, maxY: 1045 }, expectedSubpathCount: 1 },
  'five-table-514': { numberAnchor: { x: 485, y: 1001 }, expectedBounds: { minX: 458, minY: 973, maxX: 513, maxY: 1029 }, expectedSubpathCount: 1 },
  'five-table-515': { numberAnchor: { x: 445, y: 980 }, expectedBounds: { minX: 417, minY: 949, maxX: 474, maxY: 1010 }, expectedSubpathCount: 1 },
  'five-table-516': { numberAnchor: { x: 411, y: 953 }, expectedBounds: { minX: 380, minY: 923, maxX: 441, maxY: 984 }, expectedSubpathCount: 1 },
  'five-table-517': { numberAnchor: { x: 379, y: 924 }, expectedBounds: { minX: 348, minY: 893, maxX: 410, maxY: 955 }, expectedSubpathCount: 1 },
  'five-table-518': { numberAnchor: { x: 351, y: 890 }, expectedBounds: { minX: 319, minY: 861, maxX: 385, maxY: 920 }, expectedSubpathCount: 1 },
  'five-table-519': { numberAnchor: { x: 329, y: 855 }, expectedBounds: { minX: 297, minY: 827, maxX: 362, maxY: 883 }, expectedSubpathCount: 1 },
  'five-table-520': { numberAnchor: { x: 311, y: 815 }, expectedBounds: { minX: 281, minY: 789, maxX: 342, maxY: 842 }, expectedSubpathCount: 1 },
  'five-table-521': { numberAnchor: { x: 301, y: 776 }, expectedBounds: { minX: 272, minY: 753, maxX: 330, maxY: 799 }, expectedSubpathCount: 1 },
  'five-table-522': { numberAnchor: { x: 296, y: 734 }, expectedBounds: { minX: 269, minY: 713, maxX: 322, maxY: 755 }, expectedSubpathCount: 1 },
  'five-table-523': { numberAnchor: { x: 296, y: 689 }, expectedBounds: { minX: 270, minY: 668, maxX: 323, maxY: 710 }, expectedSubpathCount: 1 },
  'five-table-524': { numberAnchor: { x: 301, y: 647 }, expectedBounds: { minX: 273, minY: 622, maxX: 328, maxY: 672 }, expectedSubpathCount: 1 },
  'five-table-525': { numberAnchor: { x: 308, y: 602 }, expectedBounds: { minX: 281, minY: 577, maxX: 335, maxY: 627 }, expectedSubpathCount: 1 },
  'five-table-526': { numberAnchor: { x: 315, y: 557 }, expectedBounds: { minX: 289, minY: 533, maxX: 342, maxY: 582 }, expectedSubpathCount: 1 },
  'five-table-527': { numberAnchor: { x: 325, y: 512 }, expectedBounds: { minX: 298, minY: 486, maxX: 353, maxY: 539 }, expectedSubpathCount: 1 },
  'five-table-528': { numberAnchor: { x: 340, y: 468 }, expectedBounds: { minX: 312, minY: 440, maxX: 368, maxY: 496 }, expectedSubpathCount: 1 },
  'five-table-529': { numberAnchor: { x: 359, y: 425 }, expectedBounds: { minX: 330, minY: 396, maxX: 390, maxY: 455 }, expectedSubpathCount: 1 },
  'five-table-530': { numberAnchor: { x: 382, y: 386 }, expectedBounds: { minX: 352, minY: 358, maxX: 412, maxY: 416 }, expectedSubpathCount: 1 },
  'five-table-531': { numberAnchor: { x: 408, y: 349 }, expectedBounds: { minX: 379, minY: 321, maxX: 438, maxY: 378 }, expectedSubpathCount: 1 },
  'five-table-532': { numberAnchor: { x: 434, y: 310 }, expectedBounds: { minX: 405, minY: 283, maxX: 463, maxY: 338 }, expectedSubpathCount: 1 },
  'five-table-533': { numberAnchor: { x: 461, y: 274 }, expectedBounds: { minX: 433, minY: 248, maxX: 490, maxY: 300 }, expectedSubpathCount: 1 },
  'five-table-534': { numberAnchor: { x: 490, y: 238 }, expectedBounds: { minX: 463, minY: 214, maxX: 518, maxY: 262 }, expectedSubpathCount: 1 },
  'five-table-535': { numberAnchor: { x: 522, y: 203 }, expectedBounds: { minX: 497, minY: 184, maxX: 546, maxY: 222 }, expectedSubpathCount: 1 },
  'champion-seats': { numberAnchor: { x: 500, y: 792 }, expectedBounds: { minX: 461, minY: 740, maxX: 559, maxY: 843 }, expectedSubpathCount: 1 },
  'central-table-seats': { numberAnchor: { x: 430, y: 824 }, expectedBounds: { minX: 397, minY: 755, maxX: 523, maxY: 895 }, expectedSubpathCount: 1 },
  'disabled-seats-center': { numberAnchor: { x: 402, y: 753 }, expectedBounds: { minX: 390, minY: 739, maxX: 414, maxY: 766 }, expectedSubpathCount: 1 },
  'first-surprise-seats': { numberAnchor: { x: 870, y: 800 }, expectedBounds: { minX: 714, minY: 772, maxX: 959, maxY: 848 }, expectedSubpathCount: 3 },
  'third-surprise-seats': { numberAnchor: { x: 620, y: 475 }, expectedBounds: { minX: 515, minY: 392, maxX: 656, maxY: 585 }, expectedSubpathCount: 3 },
  'first-family-seats': { numberAnchor: { x: 1095, y: 865 }, expectedBounds: { minX: 1007, minY: 812, maxX: 1185, maxY: 904 }, expectedSubpathCount: 1 },
  'third-family-seats': { numberAnchor: { x: 626, y: 236 }, expectedBounds: { minX: 569, minY: 158, maxX: 692, maxY: 307 }, expectedSubpathCount: 1 },
  'first-wheelchair-seats': { numberAnchor: { x: 1005, y: 921 }, expectedBounds: { minX: 958, minY: 893, maxX: 1112, maxY: 944 }, expectedSubpathCount: 1 },
  'third-wheelchair-seats': { numberAnchor: { x: 493, y: 325 }, expectedBounds: { minX: 438, minY: 204, maxX: 607, maxY: 362 }, expectedSubpathCount: 2 },
  'party-seats-first': { numberAnchor: { x: 910, y: 950 }, expectedBounds: { minX: 867, minY: 930, maxX: 959, maxY: 966 }, expectedSubpathCount: 1 },
  'party-seats-third': { numberAnchor: { x: 474, y: 366 }, expectedBounds: { minX: 430, minY: 353, maxX: 489, maxY: 398 }, expectedSubpathCount: 1 },
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
  {
    id: 'home-k7-seats',
    level: '1F',
    category: 'K7',
    name: 'K7석',
    block: 'K7석',
    officialBlocks: ['K7석'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    sourceNote: `${SOURCE_NOTE} 공식 PNG 기준 107~111, 118~122 번호 블럭 polygon을 필터 전용 aggregate hit-area로 묶었습니다.`,
    seatViewSections: ['K7석', 'K7존', '107~111', '118~122'],
  },
  {
    id: 'away-cheering-seats',
    level: '1F',
    category: 'AWAY',
    name: '원정응원석',
    block: '원정응원석',
    officialBlocks: ['원정응원석'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    sourceNote: `${SOURCE_NOTE} 공식 PNG 기준 107~110 K7 번호 블럭 polygon을 원정응원석 필터 전용 aggregate hit-area로 묶었습니다.`,
    seatViewSections: ['원정응원석', '원정 응원석', '원정 K7존', '107~110'],
  },
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
