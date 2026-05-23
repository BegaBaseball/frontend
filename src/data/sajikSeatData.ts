// Sajik Baseball Stadium seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type SajikSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type SajikFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type SajikLevel = '1F' | '2F' | '3F' | 'OUTFIELD';
export type SajikSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type SajikSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';
export type SajikTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'NEEDS_OPERATOR_REVIEW';
export type SajikTraceMethod = 'PATH_TRACED_FROM_OFFICIAL_IMAGE';
export type SajikTraceSource = 'OFFICIAL_PNG_MANUAL_POLYGON';
export type SajikTraceVersion = 'manual-polygon-v2';
export type SajikPixelAlignmentStatus = 'PIXEL_ALIGNED' | 'MANUAL_REVIEW_REQUIRED';
export type SajikMapInteractionStatus = 'MAP_SELECTABLE' | 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE';
export type SajikMarkerType = 'WHEELCHAIR';
export type SajikSectionKind = 'SEAT_SECTION' | 'ACCESSIBILITY_MARKER' | 'ALIAS_ONLY';
export type SajikMapVersion =
  | 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2'
  | 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2_HIRES_DISPLAY_V1'
  | 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';
export type SajikSeatMapPoint = [number, number];
export type SajikSeatMapSourceId = 'LOTTE_OFFICIAL_2026' | 'OPERATOR_REFERENCE_2026';
export type SajikSeatMapSourceKind = 'INTERACTIVE_SEATMAP' | 'REFERENCE_IMAGE';
export type SajikSeatMapSourceStatus = 'OFFICIAL' | 'OPERATOR_REFERENCE';

export interface SajikImageGeometry {
  d: string;
  visualPath?: string;
  hitPath?: string;
  labelX: number;
  labelY: number;
  labelPoint?: SajikSeatMapPoint;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
  alignmentSeedPoint?: SajikTracePoint;
  geometryVersion?: SajikTraceVersion;
  traceMethod: SajikTraceMethod;
  traceSource: SajikTraceSource;
  traceVersion: SajikTraceVersion;
  manualReviewed: boolean;
  pixelAlignmentStatus: SajikPixelAlignmentStatus;
  manualReviewNote: string;
}

export interface SajikTracePoint {
  x: number;
  y: number;
}

export interface SajikTraceBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SajikOfficialTraceReference {
  numberAnchor: SajikTracePoint;
  expectedBounds: SajikTraceBounds;
  expectedSubpathCount: number;
  expectedPointCount: number;
  expectedArea: number;
}

export interface SajikSeatMapImage {
  stadiumId: 'BUSAN_SAJIK';
  mapVersion: SajikMapVersion;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  viewBox: string;
  imageSha256: string;
  renderImagePath?: string;
  renderImageSha256?: string;
  renderImageNaturalWidth?: number;
  renderImageNaturalHeight?: number;
  renderImageSourceUrl?: string;
  renderImageSourceLabel?: string;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: SajikSeatMapAssetStatus;
  requiredAssetFileName: string;
}

export interface SajikSeatMapSourceReference {
  id: SajikSeatMapSourceId;
  label: string;
  kind: SajikSeatMapSourceKind;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  viewBox: string;
  imageSha256: string;
  sourceLabel: string;
  sourceUrl: string | null;
  assetStatus: SajikSeatMapSourceStatus;
  mapVersion: SajikMapVersion;
  polygonStatus: 'PRODUCTION_INTERACTIVE' | 'REFERENCE_ONLY_PENDING_TRACE' | 'REFERENCE_INTERACTIVE_PREVIEW_READY';
}

export interface SajikBlock {
  id: string;
  level: SajikLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: SajikSide;
  fanRole: SajikFanRole;
  traceStatus: SajikTraceStatus;
  reviewNote: string;
  displayPriority: number;
  mapInteractionStatus: SajikMapInteractionStatus;
  sourceConfidence: SajikSourceConfidence;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: SajikImageGeometry;
  accessibilityNote?: string;
  markerType?: SajikMarkerType;
  sectionKind?: SajikSectionKind;
}

export interface SajikCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

export interface SajikViewInfo {
  photos: number;
  rating: number | null;
  distance?: string;
  notes?: string;
  tags?: string[];
}

export interface SajikCategoryGroup {
  id: string;
  label: string;
  cats: string[] | null;
  sides?: string[] | null;
  levels?: string[] | null;
  filterDimension?: 'grade' | 'position' | 'level';
}

type SajikBlockDefinition = Omit<
  SajikBlock,
  'sourceConfidence' | 'sourceNote' | 'seatViewSections' | 'traceStatus' | 'reviewNote' | 'imageGeometry' | 'mapInteractionStatus'
> & {
  imageGeometry: Omit<SajikImageGeometry, 'traceMethod' | 'traceSource' | 'traceVersion' | 'manualReviewed' | 'pixelAlignmentStatus' | 'manualReviewNote'> & Partial<Pick<SajikImageGeometry, 'traceMethod' | 'traceSource' | 'traceVersion' | 'manualReviewed' | 'pixelAlignmentStatus' | 'manualReviewNote'>>;
  seatViewSections?: string[];
  parentLabel?: string;
  traceStatus?: SajikTraceStatus;
  reviewNote?: string;
};

export interface SajikTraceReviewSummary {
  totalBlocks: number;
  mapSelectable: number;
  aliasOnlyOfficialPngBlockNotVisible: number;
  officialImageTraced: number;
  needsOperatorReview: number;
  directOfficialTrace: number;
  manualReviewed: number;
  unreviewedBlocks: number;
  pixelAligned: number;
  manualReviewRequired: number;
}

export type SajikGuideIntent =
  | 'all'
  | 'home_cheer'
  | 'away_third'
  | 'center_table'
  | 'outfield'
  | 'accessible';

export interface SajikBlockMatch {
  block: SajikBlock;
  reasons: string[];
  score: number;
}

export const SAJIK_REFERENCE_URL = 'https://www.giantsclub.com/html/?pcode=340';
export const SAJIK_STADIUM_ID = 'BUSAN_SAJIK';
export const SAJIK_MAP_VERSION = 'BUSAN_SAJIK_2026_MANUAL_POLYGON_V2';
export const SAJIK_VIEW_BOX = '0 0 960 640';
export const SAJIK_IMAGE_SHA256 = 'd943cef6e4c86530c9568e3d50d43303aab3f0102a19dc76f828547c79a20b13';
export const SAJIK_OPERATOR_REFERENCE_MAP_VERSION = 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';
export const SAJIK_OPERATOR_REFERENCE_VIEW_BOX = '0 0 1151 1367';
export const SAJIK_OPERATOR_REFERENCE_IMAGE_SHA256 = 'b82d84a827c9b8aed64d8c0355e59e57fc00d54495d501e1fbd5a7866e304db0';

export const SAJIK_SEATMAP_IMAGE: SajikSeatMapImage = {
  stadiumId: SAJIK_STADIUM_ID,
  mapVersion: SAJIK_MAP_VERSION,
  imagePath: 'src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp',
  imageWidth: 960,
  imageHeight: 640,
  viewBox: SAJIK_VIEW_BOX,
  imageSha256: SAJIK_IMAGE_SHA256,
  sourceLabel: '롯데자이언츠 공식 좌석안내 2026 시즌',
  sourceUrl: SAJIK_REFERENCE_URL,
  assetStatus: 'OFFICIAL',
  requiredAssetFileName: 'sajik-lotte-seatmap-official-2026.webp',
};

export const SAJIK_SEATMAP_SOURCE_REFERENCES: SajikSeatMapSourceReference[] = [
  {
    id: 'OPERATOR_REFERENCE_2026',
    label: '기준 좌석도',
    kind: 'REFERENCE_IMAGE',
    imagePath: 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp',
    imageWidth: 1151,
    imageHeight: 1367,
    viewBox: SAJIK_OPERATOR_REFERENCE_VIEW_BOX,
    imageSha256: SAJIK_OPERATOR_REFERENCE_IMAGE_SHA256,
    sourceLabel: 'Operator-provided reference image, 2026-05-19',
    sourceUrl: null,
    assetStatus: 'OPERATOR_REFERENCE',
    mapVersion: SAJIK_OPERATOR_REFERENCE_MAP_VERSION,
    polygonStatus: 'PRODUCTION_INTERACTIVE',
  },
  {
    id: 'LOTTE_OFFICIAL_2026',
    label: '공식 이미지',
    kind: 'INTERACTIVE_SEATMAP',
    imagePath: SAJIK_SEATMAP_IMAGE.imagePath,
    imageWidth: SAJIK_SEATMAP_IMAGE.imageWidth,
    imageHeight: SAJIK_SEATMAP_IMAGE.imageHeight,
    viewBox: SAJIK_SEATMAP_IMAGE.viewBox,
    imageSha256: SAJIK_SEATMAP_IMAGE.imageSha256,
    sourceLabel: SAJIK_SEATMAP_IMAGE.sourceLabel,
    sourceUrl: SAJIK_SEATMAP_IMAGE.sourceUrl,
    assetStatus: 'OFFICIAL',
    mapVersion: SAJIK_SEATMAP_IMAGE.mapVersion,
    polygonStatus: 'PRODUCTION_INTERACTIVE',
  },
];

export const SAJIK_DEFAULT_SEATMAP_SOURCE_ID: SajikSeatMapSourceId = 'OPERATOR_REFERENCE_2026';

export const SAJIK_CATEGORIES: Record<string, SajikCategory> = {
  AVENUEL: { label: '에비뉴엘석', light: '#C0007A', dark: '#EC4899', textLight: '#831843', textDark: '#FCE7F3' },
  CENTRAL_TABLE: { label: '중앙탁자석', light: '#E45D61', dark: '#F87171', textLight: '#7F1D1D', textDark: '#FEE2E2' },
  WIDE_TABLE: { label: '메디힐석 (와이드탁자석)', light: '#27B5E8', dark: '#67E8F9', textLight: '#164E63', textDark: '#CFFAFE' },
  CHEER_TABLE: { label: '네이버 클립존 (응원탁자석)', light: '#F7C843', dark: '#FDE047', textLight: '#713F12', textDark: '#FEF3C7' },
  INFIELD_TABLE: { label: '내야탁자석', light: '#C6D72F', dark: '#D9F99D', textLight: '#365314', textDark: '#ECFCCB' },
  GROUP_3B: { label: '쓰리디홀딩스존 (3루단체석)', light: '#95439A', dark: '#D8B4FE', textLight: '#581C87', textDark: '#F3E8FF' },
  CAMPING: { label: '로노존 (외야 클램핑존)', light: '#D9C5CF', dark: '#F5D0FE', textLight: '#4A044E', textDark: '#FAE8FF' },
  EVERYTIME: { label: '정관장 에브리타임존', light: '#F1EA7A', dark: '#FEF08A', textLight: '#713F12', textDark: '#FEF3C7' },
  PREMIUM_3B: { label: '3루 프리미엄석', light: '#0E8845', dark: '#4ADE80', textLight: '#14532D', textDark: '#DCFCE7' },
  CENTRAL_UPPER: { label: '중앙상단석', light: '#BA111B', dark: '#F0444B', textLight: '#7F1D1D', textDark: '#FEE2E2' },
  CENTRAL_UPPER_TABLE: { label: '중앙상단탁자석', light: '#0C4A73', dark: '#38BDF8', textLight: '#0C4A6E', textDark: '#E0F2FE' },
  INFIELD_FIELD_1B: { label: '1루 내야필드석', light: '#2F87C7', dark: '#60A5FA', textLight: '#172554', textDark: '#DBEAFE' },
  INFIELD_UPPER_1B: { label: '1루 내야상단석', light: '#0B4973', dark: '#38BDF8', textLight: '#0C4A6E', textDark: '#E0F2FE' },
  INFIELD_FIELD_3A: { label: '3루 내야필드석A', light: '#F2D42E', dark: '#FACC15', textLight: '#713F12', textDark: '#FEF3C7' },
  INFIELD_FIELD_3B: { label: '3루 내야필드석B', light: '#F59E0B', dark: '#FBBF24', textLight: '#7C2D12', textDark: '#FFEDD5' },
  INFIELD_UPPER_3A: { label: '3루 내야상단석A', light: '#B77853', dark: '#D99A73', textLight: '#7C2D12', textDark: '#FFEDD5' },
  INFIELD_UPPER_3B: { label: '3루 내야상단석B', light: '#8D2439', dark: '#BE4560', textLight: '#881337', textDark: '#FFE4E6' },
  OUTFIELD_1B: { label: '1루 외야석', light: '#557A2A', dark: '#84CC16', textLight: '#365314', textDark: '#ECFCCB' },
  OUTFIELD_3B: { label: '3루 외야석', light: '#557A2A', dark: '#84CC16', textLight: '#365314', textDark: '#ECFCCB' },
  ACCESSIBLE: { label: '휠체어석', light: '#0EA5A4', dark: '#2DD4BF', textLight: '#134E4A', textDark: '#CCFBF1' },
};

export const SAJIK_CATEGORY_GROUPS: SajikCategoryGroup[] = [
  // 층수별 (메인 필터 — 항상 노출)
  { id: 'all',      label: '전체',   cats: null,                                                                              filterDimension: 'level' },
  { id: 'lv-1f',   label: '1층',    cats: null, levels: ['1F'],                                                              filterDimension: 'level' },
  { id: 'lv-2f',   label: '2층',    cats: null, levels: ['2F'],                                                              filterDimension: 'level' },
  { id: 'lv-3f',   label: '3층',    cats: null, levels: ['3F'],                                                              filterDimension: 'level' },
  { id: 'lv-out',  label: '외야층', cats: null, levels: ['OUTFIELD'],                                                        filterDimension: 'level' },
  // 등급별 (보조 필터 — 기본 접힘)
  { id: 'cheer',      label: '응원/필드',  cats: ['CHEER_TABLE', 'INFIELD_FIELD_1B', 'INFIELD_FIELD_3A', 'INFIELD_FIELD_3B'],  filterDimension: 'grade' },
  { id: 'table',      label: '탁자석',     cats: ['CENTRAL_TABLE', 'WIDE_TABLE', 'INFIELD_TABLE', 'EVERYTIME', 'CENTRAL_UPPER_TABLE'], filterDimension: 'grade' },
  { id: 'upper',      label: '상단석',     cats: ['CENTRAL_UPPER', 'INFIELD_UPPER_1B', 'INFIELD_UPPER_3A', 'INFIELD_UPPER_3B'], filterDimension: 'grade' },
  { id: 'outfield',   label: '외야/특수석', cats: ['OUTFIELD_1B', 'OUTFIELD_3B', 'CAMPING', 'GROUP_3B', 'PREMIUM_3B', 'AVENUEL'], filterDimension: 'grade' },
  { id: 'accessible', label: '휠체어석',   cats: ['ACCESSIBLE'],                                                              filterDimension: 'grade' },
  // 위치별 (보조 필터 — 기본 접힘)
  { id: 'pos-first',  label: '1루 측', cats: null, sides: ['FIRST_BASE'],                                                    filterDimension: 'position' },
  { id: 'pos-third',  label: '3루 측', cats: null, sides: ['THIRD_BASE'],                                                    filterDimension: 'position' },
  { id: 'pos-center', label: '중앙',   cats: null, sides: ['CENTER'],                                                        filterDimension: 'position' },
  { id: 'pos-out',    label: '외야',   cats: null, sides: ['OUTFIELD'],                                                      filterDimension: 'position' },
];

export const SAJIK_VIEW_INFO: Record<string, SajikViewInfo> = {
  default: { photos: 0, rating: null },
};

export const SAJIK_REQUIRED_OFFICIAL_SECTIONS = [
  '1루 내야필드석',
  '3루 내야필드석A',
  '중앙탁자석',
  '메디힐석 (와이드탁자석)',
  '네이버 클립존 (응원탁자석)',
  '중앙상단석',
  '1루 외야석',
  '3루 외야석',
  '휠체어석',
] as const;

const OFFICIAL_SOURCE_NOTE = '롯데자이언츠 공식 좌석안내 2026 시즌 사직야구장 구역별 안내 이미지에서 수동 trace한 블럭입니다.';
const MANUAL_POLYGON_TRACE_REVIEW_NOTE = '공식 좌석도 원본 이미지(960x640)의 블럭 색상 영역을 기준으로 수동 polygon trace한 hit-area입니다.';
const PIXEL_ALIGNMENT_REVIEW_REQUIRED_NOTE = '공식 PNG에서 대응되는 좌석 색상 블럭이 확인되지 않아 운영 데이터 호환용 hit-area로만 보존한 블럭입니다.';
export const SAJIK_TRACE_SOURCE: SajikTraceSource = 'OFFICIAL_PNG_MANUAL_POLYGON';
export const SAJIK_TRACE_VERSION: SajikTraceVersion = 'manual-polygon-v2';
export const SAJIK_TRACE_ANCHOR_TOLERANCE_PX = 2;
export const SAJIK_TRACE_BOUNDS_TOLERANCE_PX = 0;
export const SAJIK_TRACE_AREA_TOLERANCE_PX2 = 0.05;
export const SAJIK_ALIGNMENT_MIN_COMPONENT_INSIDE_RATIO = 0.9;
export const SAJIK_ALIGNMENT_MIN_PATH_COLOR_COVERAGE_RATIO = 0.75;
export const SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS = [
  '011',
  '903',
] as const;
export const SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS = SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS;
export const SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS = [
  '011',
  '903',
] as const;
export const SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS = [
  '121',
  '122',
  '123',
  '124',
  '125',
  '131',
  '132',
  '133',
  '134',
  '135',
  '142',
  '143',
] as const;
export const SAJIK_THIN_ALIGNMENT_DILATION_TOLERANCE_PX = 1.5;
export const SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DILATED_RATIO = 0.025;
export const SAJIK_THIN_ALIGNMENT_MAX_OUTSIDE_DISTANCE_PX = 3;

const SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCK_SET = new Set<string>(SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS);
const SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCK_SET = new Set<string>(SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS);

function blockAliases(block: SajikBlockDefinition) {
  const categoryLabel = SAJIK_CATEGORIES[block.category]?.label;
  const baseAliases = [
    block.id,
    block.name,
    block.block,
    block.block ? `${block.block}블록` : null,
    categoryLabel,
    block.parentLabel,
    ...block.officialBlocks,
    ...block.officialBlocks.map((officialBlock) => `${officialBlock}블록`),
    '사직',
    '사직야구장',
    '부산 사직야구장',
    '롯데',
    '롯데 자이언츠',
  ];

  return Array.from(new Set([...baseAliases, ...(block.seatViewSections ?? [])].map((alias) => alias?.trim()).filter(Boolean) as string[]));
}

function createSajikBlock(block: SajikBlockDefinition): SajikBlock {
  const { parentLabel: _parentLabel, ...publicBlock } = block;
  const pixelAlignmentStatus = block.imageGeometry.pixelAlignmentStatus
    ?? (SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCK_SET.has(block.block) ? 'MANUAL_REVIEW_REQUIRED' : 'PIXEL_ALIGNED');
  const mapInteractionStatus = SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCK_SET.has(block.block)
    ? 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
    : 'MAP_SELECTABLE';
  const traceVersion = block.imageGeometry.traceVersion ?? SAJIK_TRACE_VERSION;
  const visualPath = block.imageGeometry.visualPath ?? block.imageGeometry.d;
  const hitPath = block.imageGeometry.hitPath ?? visualPath;
  const labelPoint = block.imageGeometry.labelPoint ?? ([block.imageGeometry.labelX, block.imageGeometry.labelY] as SajikSeatMapPoint);
  const markerType = block.markerType ?? (block.category === 'ACCESSIBLE' ? 'WHEELCHAIR' : undefined);
  const sectionKind = block.sectionKind
    ?? (mapInteractionStatus === 'ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE'
      ? 'ALIAS_ONLY'
      : markerType === 'WHEELCHAIR'
        ? 'ACCESSIBILITY_MARKER'
        : 'SEAT_SECTION');
  return {
    ...publicBlock,
    mapInteractionStatus,
    markerType,
    sectionKind,
    imageGeometry: {
      ...block.imageGeometry,
      visualPath,
      hitPath,
      labelPoint,
      geometryVersion: block.imageGeometry.geometryVersion ?? traceVersion,
      traceMethod: block.imageGeometry.traceMethod ?? 'PATH_TRACED_FROM_OFFICIAL_IMAGE',
      traceSource: block.imageGeometry.traceSource ?? SAJIK_TRACE_SOURCE,
      traceVersion,
      manualReviewed: block.imageGeometry.manualReviewed ?? true,
      pixelAlignmentStatus,
      manualReviewNote: block.imageGeometry.manualReviewNote
        ?? (pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED' ? PIXEL_ALIGNMENT_REVIEW_REQUIRED_NOTE : MANUAL_POLYGON_TRACE_REVIEW_NOTE),
    },
    traceStatus: block.traceStatus ?? 'OFFICIAL_IMAGE_TRACED',
    reviewNote: block.reviewNote ?? MANUAL_POLYGON_TRACE_REVIEW_NOTE,
    sourceConfidence: 'OFFICIAL',
    sourceNote: OFFICIAL_SOURCE_NOTE,
    seatViewSections: blockAliases(block),
  };
}

const SAJIK_BLOCK_DEFINITIONS: SajikBlockDefinition[] = [
  {
    id: 'sajik-camping-338',
    level: 'OUTFIELD',
    category: 'CAMPING',
    name: '로노존 (외야 클램핑존) 338블록',
    block: '338',
    officialBlocks: ['338'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 1,
    imageGeometry: {
      d: 'M 484 152 L 486 150 L 499 142 L 502 142 L 507 144 L 515 152 L 517 156 L 517 160 L 506 170 L 502 170 L 497 166 L 489 158 Z',
      labelX: 506,
      labelY: 148,
      labelRotate: -24,
      labelFontSize: 9,
      shortLabel: '338',
      alignmentSeedPoint: { x: 500, y: 142 },
    },
    seatViewSections: ['738', '738블록', '3루 외야석 738블록'],
  },
  {
    id: 'sajik-outfield-3b-732',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 732블록',
    block: '732',
    officialBlocks: ['732'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 2,
    imageGeometry: {
      d: 'M 535 118 L 536 117 L 544 113 L 551 110 L 561 106 L 579 100 L 583 99 L 584 99 L 587 108 L 592 126 L 592 128 L 550 143 L 549 143 L 548 142 L 545 137 L 539 126 Z',
      labelX: 562,
      labelY: 122,
      labelRotate: -8,
      labelFontSize: 9,
      shortLabel: '732',
    },
  },
  {
    id: 'sajik-outfield-3b-733',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 733블록',
    block: '733',
    officialBlocks: ['733'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 3,
    imageGeometry: {
      d: 'M 590 97 L 640 89 L 643 120 L 597 127 L 589 101 Z',
      labelX: 617,
      labelY: 116,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '733',
    },
  },
  {
    id: 'sajik-outfield-3b-734',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 734블록',
    block: '734',
    officialBlocks: ['734'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 4,
    imageGeometry: {
      d: 'M 645 89 L 650 88 L 694 89 L 695 90 L 693 119 L 647 120 Z',
      labelX: 675,
      labelY: 116,
      labelRotate: 6,
      labelFontSize: 9,
      shortLabel: '734',
    },
  },
  {
    id: 'sajik-outfield-3b-721',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 721블록',
    block: '721',
    officialBlocks: ['721'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 5,
    imageGeometry: {
      d: 'M 507 176 L 510 173 L 522 164 L 531 158 L 536 155 L 545 150 L 547 149 L 549 152 L 558 168 L 559 170 L 559 171 L 558 172 L 525 194 L 523 194 L 507 177 Z',
      labelX: 534,
      labelY: 172,
      labelRotate: -18,
      labelFontSize: 9,
      shortLabel: '721',
    },
  },
  {
    id: 'sajik-outfield-3b-722',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 722블록',
    block: '722',
    officialBlocks: ['722'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 6,
    imageGeometry: {
      d: 'M 552 147 L 568 140 L 594 132 L 601 157 L 564 170 L 552 150 Z',
      labelX: 575,
      labelY: 149,
      labelRotate: -8,
      labelFontSize: 9,
      shortLabel: '722',
    },
  },
  {
    id: 'sajik-outfield-3b-723',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 723블록',
    block: '723',
    officialBlocks: ['723'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 7,
    imageGeometry: {
      d: 'M 598 131 L 635 124 L 644 124 L 645 149 L 605 156 Z',
      labelX: 625,
      labelY: 145,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '723',
    },
  },
  {
    id: 'sajik-outfield-3b-724',
    level: 'OUTFIELD',
    category: 'OUTFIELD_3B',
    name: '3루 외야석 724블록',
    block: '724',
    officialBlocks: ['724'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 8,
    imageGeometry: {
      d: 'M 647 124 L 648 123 L 694 123 L 703 124 L 710 125 L 716 126 L 726 128 L 730 129 L 730 131 L 725 147 L 723 153 L 721 153 L 651 148 L 650 147 L 649 145 L 648 137 Z',
      labelX: 682,
      labelY: 147,
      labelRotate: 8,
      labelFontSize: 9,
      shortLabel: '724',
    },
  },
  {
    id: 'sajik-outfield-1b-925',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 925블록',
    block: '925',
    officialBlocks: ['925'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 9,
    imageGeometry: {
      d: 'M 780 174 L 793 156 L 798 157 L 820 174 L 804 192 L 801 192 L 780 177 Z',
      labelX: 807,
      labelY: 176,
      labelRotate: 28,
      labelFontSize: 9,
      shortLabel: '925',
    },
  },
  {
    id: 'sajik-outfield-1b-935',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 935블록',
    block: '935',
    officialBlocks: ['935'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 10,
    imageGeometry: {
      d: 'M 812 128 L 815 128 L 839 144 L 843 149 L 824 170 L 821 170 L 796 152 Z',
      labelX: 820,
      labelY: 145,
      labelRotate: 32,
      labelFontSize: 9,
      shortLabel: '935',
    },
  },
  {
    id: 'sajik-outfield-1b-924',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 924블록',
    block: '924',
    officialBlocks: ['924'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 11,
    imageGeometry: {
      d: 'M 806 194 L 822 177 L 825 177 L 850 205 L 830 221 L 806 196 Z',
      labelX: 829,
      labelY: 203,
      labelRotate: 28,
      labelFontSize: 9,
      shortLabel: '924',
    },
  },
  {
    id: 'sajik-outfield-1b-934',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 934블록',
    block: '934',
    officialBlocks: ['934'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 12,
    imageGeometry: {
      d: 'M 826 172 L 845 151 L 847 151 L 876 182 L 876 184 L 853 202 L 826 174 Z',
      labelX: 848,
      labelY: 181,
      labelRotate: 31,
      labelFontSize: 9,
      shortLabel: '934',
    },
  },
  {
    id: 'sajik-outfield-1b-923',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 923블록',
    block: '923',
    officialBlocks: ['923'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 13,
    imageGeometry: {
      d: 'M 839 218 L 853 208 L 870 233 L 873 242 L 851 253 L 833 225 Z',
      labelX: 849,
      labelY: 236,
      labelRotate: 21,
      labelFontSize: 9,
      shortLabel: '923',
    },
  },
  {
    id: 'sajik-outfield-1b-933',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 933블록',
    block: '933',
    officialBlocks: ['933'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 14,
    imageGeometry: {
      d: 'M 857 205 L 880 187 L 896 211 L 902 226 L 879 239 L 877 239 L 857 207 Z',
      labelX: 873,
      labelY: 217,
      labelRotate: 24,
      labelFontSize: 9,
      shortLabel: '933',
    },
  },
  {
    id: 'sajik-outfield-1b-922',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 922블록',
    block: '922',
    officialBlocks: ['922'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 15,
    imageGeometry: {
      d: 'M 853 256 L 860 252 L 873 245 L 875 245 L 876 249 L 877 251 L 879 257 L 880 262 L 878 264 L 862 271 L 859 272 L 858 272 L 857 270 L 853 258 Z',
      labelX: 860,
      labelY: 269,
      labelRotate: 11,
      labelFontSize: 9,
      shortLabel: '922',
    },
  },
  {
    id: 'sajik-outfield-1b-932',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 932블록',
    block: '932',
    officialBlocks: ['932'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 16,
    imageGeometry: {
      d: 'M 881 241 L 902 230 L 905 231 L 910 247 L 910 251 L 888 261 L 885 261 L 879 244 Z',
      labelX: 887,
      labelY: 257,
      labelRotate: 13,
      labelFontSize: 9,
      shortLabel: '932',
    },
  },
  {
    id: 'sajik-outfield-1b-931',
    level: 'OUTFIELD',
    category: 'OUTFIELD_1B',
    name: '1루 외야석 931블록',
    block: '931',
    officialBlocks: ['931'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 17,
    imageGeometry: {
      d: 'M 889 305 L 915 300 L 912 325 L 887 327 Z',
      labelX: 899,
      labelY: 310,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '931',
    },
  },
  {
    id: 'sajik-group-3b-337',
    level: '2F',
    category: 'GROUP_3B',
    name: '쓰리디홀딩스존 (3루단체석) 337블록',
    block: '337',
    officialBlocks: ['337'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 18,
    imageGeometry: {
      d: 'M 438 203 L 444 194 L 447 190 L 455 180 L 480 155 L 491 166 L 500 176 L 463 219 L 462 219 L 458 217 L 438 205 Z',
      labelX: 468,
      labelY: 178,
      labelRotate: -27,
      labelFontSize: 9,
      shortLabel: '337',
    },
  },
  {
    id: 'sajik-group-3b-327',
    level: '2F',
    category: 'GROUP_3B',
    name: '쓰리디홀딩스존 (3루단체석) 327블록',
    block: '327',
    officialBlocks: ['327'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 19,
    imageGeometry: {
      d: 'M 468 218 L 484 197 L 504 179 L 521 197 L 521 199 L 490 235 L 487 235 L 467 223 Z',
      labelX: 491,
      labelY: 216,
      labelRotate: -24,
      labelFontSize: 9,
      shortLabel: '327',
    },
  },
  {
    id: 'sajik-infield-field-3b-336',
    level: '1F',
    category: 'INFIELD_FIELD_3B',
    name: '3루 내야필드석B 336블록',
    block: '336',
    officialBlocks: ['336'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 20,
    imageGeometry: {
      d: 'M 435 209 L 441 211 L 461 223 L 450 248 L 423 234 Z',
      labelX: 435,
      labelY: 230,
      labelRotate: -25,
      labelFontSize: 9,
      shortLabel: '336',
    },
  },
  {
    id: 'sajik-infield-field-3b-326',
    level: '1F',
    category: 'INFIELD_FIELD_3B',
    name: '3루 내야필드석B 326블록',
    block: '326',
    officialBlocks: ['326'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 21,
    imageGeometry: {
      d: 'M 457 240 L 464 226 L 487 239 L 478 260 L 454 250 Z',
      labelX: 469,
      labelY: 247,
      labelRotate: -20,
      labelFontSize: 9,
      shortLabel: '326',
    },
  },
  {
    id: 'sajik-infield-upper-3a-335',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 335블록',
    block: '335',
    officialBlocks: ['335'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 22,
    imageGeometry: {
      d: 'M 402 292 L 403 287 L 406 276 L 408 270 L 409 269 L 411 269 L 415 270 L 437 277 L 440 278 L 441 279 L 441 282 L 440 293 L 439 303 L 408 297 L 404 296 L 402 295 Z',
      labelX: 421,
      labelY: 286,
      labelRotate: -12,
      labelFontSize: 9,
      shortLabel: '335',
    },
  },
  {
    id: 'sajik-infield-field-3a-325',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 325블록',
    block: '325',
    officialBlocks: ['325'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 23,
    imageGeometry: {
      d: 'M 446 275 L 447 270 L 449 262 L 452 253 L 457 255 L 475 263 L 475 265 L 471 280 L 470 282 L 468 282 L 457 279 L 450 277 L 447 276 Z',
      labelX: 446.5,
      labelY: 274,
      labelRotate: -9,
      labelFontSize: 9,
      shortLabel: '325',
    },
  },
  {
    id: 'sajik-infield-upper-3a-334',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 334블록',
    block: '334',
    officialBlocks: ['334'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 24,
    imageGeometry: {
      d: 'M 398 322 L 399 311 L 400 304 L 401 300 L 404 300 L 419 303 L 421 304 L 432 356 L 432 358 L 399 357 L 398 354 Z',
      labelX: 413,
      labelY: 306,
      labelRotate: -5,
      labelFontSize: 9,
      shortLabel: '334',
    },
  },
  {
    id: 'sajik-infield-upper-3a-324',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 324블록',
    block: '324',
    officialBlocks: ['324'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 25,
    imageGeometry: {
      d: 'M 444 288 L 450 282 L 470 287 L 469 309 L 444 305 Z',
      labelX: 448,
      labelY: 305,
      labelRotate: -3,
      labelFontSize: 9,
      shortLabel: '324',
    },
  },
  {
    id: 'sajik-infield-upper-3a-343',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 343블록',
    block: '343',
    officialBlocks: ['343'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 26,
    imageGeometry: {
      d: 'M 400 307 L 422 307 L 433 358 L 399 358 L 398 354 Z',
      labelX: 413,
      labelY: 336,
      labelRotate: 3,
      labelFontSize: 9,
      shortLabel: '343',
    },
  },
  {
    id: 'sajik-infield-upper-3a-333',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 333블록',
    block: '333',
    officialBlocks: ['333'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 27,
    imageGeometry: {
      d: 'M 444 308 L 469 313 L 477 357 L 473 358 L 454 358 L 448 339 L 444 316 Z',
      labelX: 449,
      labelY: 335,
      labelRotate: 3,
      labelFontSize: 9,
      shortLabel: '333',
    },
  },
  {
    id: 'sajik-infield-upper-3a-342',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 342블록',
    block: '342',
    officialBlocks: ['342'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 28,
    imageGeometry: {
      d: 'M 399 361 L 409 361 L 434 362 L 447 388 L 452 416 L 450 417 L 444 418 L 437 419 L 421 421 L 417 421 L 414 416 L 410 408 L 407 400 L 405 394 L 404 390 L 401 377 L 399 363 Z',
      labelX: 420,
      labelY: 374,
      labelRotate: 10,
      labelFontSize: 9,
      shortLabel: '342',
    },
  },
  {
    id: 'sajik-infield-upper-3a-332',
    level: '3F',
    category: 'INFIELD_UPPER_3A',
    name: '3루 내야상단석A 332블록',
    block: '332',
    officialBlocks: ['332'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 29,
    imageGeometry: {
      d: 'M 457 362 L 468 361 L 478 361 L 487 379 L 487 381 L 475 384 L 470 385 L 468 385 L 464 379 L 458 367 L 457 364 Z',
      labelX: 465,
      labelY: 377,
      labelRotate: 11,
      labelFontSize: 9,
      shortLabel: '332',
      alignmentSeedPoint: { x: 465, y: 378 },
    },
  },
  {
    id: 'sajik-infield-upper-3b-331',
    level: '3F',
    category: 'INFIELD_UPPER_3B',
    name: '3루 내야상단석B 331블록',
    block: '331',
    officialBlocks: ['331'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 30,
    imageGeometry: {
      d: 'M 441 395 L 446 394 L 451 394 L 467 415 L 467 416 L 466 419 L 465 419 L 460 418 L 451 409 L 443 399 L 441 396 Z',
      labelX: 450,
      labelY: 407,
      labelRotate: 22,
      labelFontSize: 9,
      shortLabel: '331',
      alignmentSeedPoint: { x: 450, y: 407 },
    },
  },
  {
    id: 'sajik-infield-upper-3b-321',
    level: '3F',
    category: 'INFIELD_UPPER_3B',
    name: '3루 내야상단석B 321블록',
    block: '321',
    officialBlocks: ['321'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 31,
    imageGeometry: {
      d: 'M 471 389 L 492 385 L 506 403 L 490 409 L 486 409 L 471 391 Z',
      labelX: 488,
      labelY: 401,
      labelRotate: 21,
      labelFontSize: 9,
      shortLabel: '321',
      alignmentSeedPoint: { x: 488, y: 403 },
    },
  },
  {
    id: 'sajik-infield-field-3a-316',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 316블록',
    block: '316',
    officialBlocks: ['316'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 32,
    imageGeometry: {
      d: 'M 483 255 L 500 225 L 505 221 L 512 239 L 516 274 L 496 268 L 481 262 Z',
      labelX: 502,
      labelY: 246,
      labelRotate: -14,
      labelFontSize: 9,
      shortLabel: '316',
    },
  },
  {
    id: 'sajik-infield-field-3a-315',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 315블록',
    block: '315',
    officialBlocks: ['315'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 33,
    imageGeometry: {
      d: 'M 479 265 L 517 279 L 519 295 L 474 284 Z',
      labelX: 491,
      labelY: 278,
      labelRotate: -8,
      labelFontSize: 9,
      shortLabel: '315',
    },
  },
  {
    id: 'sajik-infield-field-3a-314',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 314블록',
    block: '314',
    officialBlocks: ['314'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 34,
    imageGeometry: {
      d: 'M 472 296 L 473 289 L 474 288 L 475 288 L 512 297 L 516 298 L 519 299 L 520 305 L 521 312 L 521 316 L 518 316 L 510 315 L 496 313 L 478 310 L 473 309 L 472 308 Z',
      labelX: 488,
      labelY: 309,
      labelRotate: -3,
      labelFontSize: 9,
      shortLabel: '314',
    },
  },
  {
    id: 'sajik-infield-field-3a-313',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 313블록',
    block: '313',
    officialBlocks: ['313'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 35,
    imageGeometry: {
      d: 'M 472 313 L 473 313 L 480 314 L 520 320 L 522 321 L 523 327 L 525 341 L 526 349 L 526 351 L 521 352 L 505 354 L 496 355 L 486 356 L 481 356 L 480 354 L 477 345 L 475 337 L 473 326 L 472 319 Z',
      labelX: 491,
      labelY: 342,
      labelRotate: 3,
      labelFontSize: 9,
      shortLabel: '313',
    },
  },
  {
    id: 'sajik-infield-field-3a-312',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 312블록',
    block: '312',
    officialBlocks: ['312'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 36,
    imageGeometry: {
      d: 'M 483 360 L 528 356 L 529 371 L 497 380 L 492 380 L 483 362 Z',
      labelX: 501,
      labelY: 373,
      labelRotate: 11,
      labelFontSize: 9,
      shortLabel: '312',
    },
  },
  {
    id: 'sajik-infield-field-3a-311',
    level: '1F',
    category: 'INFIELD_FIELD_3A',
    name: '3루 내야필드석A 311블록',
    block: '311',
    officialBlocks: ['311'],
    side: 'THIRD_BASE',
    fanRole: 'HOME',
    displayPriority: 37,
    imageGeometry: {
      d: 'M 496 383 L 530 375 L 532 393 L 510 402 L 496 386 Z',
      labelX: 520,
      labelY: 392,
      labelRotate: 18,
      labelFontSize: 9,
      shortLabel: '311',
      alignmentSeedPoint: { x: 520, y: 392 },
    },
  },
  {
    id: 'sajik-central-upper-057',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 057블록',
    block: '057',
    officialBlocks: ['057'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 38,
    imageGeometry: {
      d: 'M 421 425 L 458 421 L 476 439 L 439 449 L 421 428 Z',
      labelX: 452,
      labelY: 430,
      labelRotate: 11,
      labelFontSize: 9,
      shortLabel: '057',
    },
  },
  {
    id: 'sajik-central-upper-056',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 056블록',
    block: '056',
    officialBlocks: ['056'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 39,
    imageGeometry: {
      d: 'M 443 452 L 481 442 L 507 460 L 506 462 L 475 479 L 472 479 L 443 455 Z',
      labelX: 487,
      labelY: 459,
      labelRotate: 17,
      labelFontSize: 9,
      shortLabel: '056',
    },
  },
  {
    id: 'sajik-central-upper-055',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 055블록',
    block: '055',
    officialBlocks: ['055'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 40,
    imageGeometry: {
      d: 'M 477 481 L 495 471 L 506 465 L 510 463 L 513 463 L 526 470 L 529 472 L 529 473 L 526 476 L 502 495 L 498 495 L 494 493 L 487 489 L 482 486 L 479 484 Z',
      labelX: 486,
      labelY: 484,
      labelRotate: 14,
      labelFontSize: 9,
      shortLabel: '055',
    },
  },
  {
    id: 'sajik-central-upper-054',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 054블록',
    block: '054',
    officialBlocks: ['054'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 41,
    imageGeometry: {
      d: 'M 505 496 L 520 484 L 529 477 L 533 474 L 534 474 L 540 477 L 567 488 L 566 491 L 549 512 L 548 513 L 544 513 L 523 506 L 513 502 L 506 499 L 505 498 Z',
      labelX: 532,
      labelY: 496,
      labelRotate: 8,
      labelFontSize: 9,
      shortLabel: '054',
    },
  },
  {
    id: 'sajik-central-upper-053',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 053블록',
    block: '053',
    officialBlocks: ['053'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 42,
    imageGeometry: {
      d: 'M 553 513 L 555 510 L 571 490 L 574 490 L 592 496 L 592 497 L 582 520 L 579 520 L 564 517 L 556 515 L 553 514 Z',
      labelX: 575,
      labelY: 508,
      labelRotate: 2,
      labelFontSize: 9,
      shortLabel: '053',
    },
  },
  {
    id: 'sajik-central-upper-052',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 052블록',
    block: '052',
    officialBlocks: ['052'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 43,
    imageGeometry: {
      d: 'M 586 520 L 588 515 L 596 497 L 599 497 L 631 503 L 635 504 L 635 511 L 633 525 L 632 526 L 617 526 L 607 525 L 598 524 L 591 523 L 586 522 Z',
      labelX: 612,
      labelY: 513,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '052',
    },
  },
  {
    id: 'sajik-central-upper-051',
    level: '3F',
    category: 'CENTRAL_UPPER',
    name: '중앙상단석 051블록',
    block: '051',
    officialBlocks: ['051'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 44,
    imageGeometry: {
      d: 'M 636 525 L 638 511 L 639 505 L 640 504 L 641 504 L 656 505 L 666 506 L 666 523 L 662 524 L 652 525 Z',
      labelX: 651,
      labelY: 512,
      labelRotate: -4,
      labelFontSize: 9,
      shortLabel: '051',
    },
  },
  {
    id: 'sajik-central-upper-table-044',
    level: '2F',
    category: 'CENTRAL_UPPER_TABLE',
    name: '중앙상단탁자석 044블록',
    block: '044',
    officialBlocks: ['044'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 45,
    imageGeometry: {
      d: 'M 465 423 L 466 422 L 475 422 L 494 440 L 498 443 L 498 444 L 496 446 L 492 446 L 490 445 L 482 439 L 477 435 L 470 429 Z',
      labelX: 480,
      labelY: 433,
      labelRotate: 16,
      labelFontSize: 9,
      shortLabel: '044',
    },
  },
  {
    id: 'sajik-central-upper-table-034',
    level: '2F',
    category: 'CENTRAL_UPPER_TABLE',
    name: '중앙상단탁자석 034블록',
    block: '034',
    officialBlocks: ['034'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 46,
    imageGeometry: {
      d: 'M 490 412 L 509 406 L 546 437 L 545 444 L 539 450 L 533 448 L 503 426 Z',
      labelX: 496,
      labelY: 414,
      labelRotate: 14,
      labelFontSize: 9,
      shortLabel: '034',
    },
  },
  {
    id: 'sajik-central-upper-table-024',
    level: '2F',
    category: 'CENTRAL_UPPER_TABLE',
    name: '중앙상단탁자석 024블록',
    block: '024',
    officialBlocks: ['024'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 47,
    imageGeometry: {
      d: 'M 497 410 L 499 409 L 508 406 L 544 435 L 545 436 L 544 443 L 538 449 L 536 449 L 528 444 L 525 442 L 518 437 L 514 434 L 503 425 L 497 419 Z',
      labelX: 535,
      labelY: 432,
      labelRotate: 8,
      labelFontSize: 9,
      shortLabel: '024',
      alignmentSeedPoint: { x: 535, y: 432 },
    },
  },
  {
    id: 'sajik-central-table-033',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 033블록',
    block: '033',
    officialBlocks: ['033'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 48,
    imageGeometry: {
      d: 'M 473 416 L 482 414 L 486 414 L 532 451 L 534 453 L 529 458 L 528 458 L 521 454 L 516 451 L 504 443 L 500 440 L 491 433 L 475 420 Z',
      labelX: 525,
      labelY: 455,
      labelRotate: 13,
      labelFontSize: 9,
      shortLabel: '033',
    },
  },
  {
    id: 'sajik-central-table-032',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 032블록',
    block: '032',
    officialBlocks: ['032'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 53.5,
    imageGeometry: {
      d: 'M 569 464 L 570 462 L 572 459 L 575 455 L 577 453 L 579 453 L 582 454 L 584 455 L 598 464 L 599 465 L 596 471 L 595 472 L 592 472 L 584 470 L 575 467 L 570 465 Z',
      hitPath: 'M 572 464 L 605 467 L 608 473 L 604 494 L 568 491 L 569 473 Z',
      labelX: 588,
      labelY: 466,
      labelRotate: 6,
      labelFontSize: 9,
      shortLabel: '032',
    },
  },
  {
    id: 'sajik-central-table-031',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 031블록',
    block: '031',
    officialBlocks: ['031'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 50,
    imageGeometry: {
      d: 'M 600 484 L 638 484 L 666 486 L 666 493 L 656 493 L 641 492 L 600 491 Z',
      labelX: 636,
      labelY: 488,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '031',
    },
  },
  {
    id: 'sajik-central-table-023',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 023블록',
    block: '023',
    officialBlocks: ['023'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 51,
    imageGeometry: {
      d: 'M 542 451 L 548 445 L 550 445 L 570 455 L 570 458 L 568 460 L 566 463 L 562 463 L 553 459 L 543 453 L 542 452 Z',
      labelX: 557,
      labelY: 455,
      labelRotate: 8,
      labelFontSize: 9,
      shortLabel: '023',
    },
  },
  {
    id: 'sajik-central-table-022',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 022블록',
    block: '022',
    officialBlocks: ['022'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 52,
    imageGeometry: {
      d: 'M 577 453 L 585 455 L 600 465 L 599 468 L 597 472 L 596 473 L 592 473 L 588 472 L 569 465 L 570 462 L 573 458 Z',
      labelX: 589,
      labelY: 462,
      labelRotate: 4,
      labelFontSize: 9,
      shortLabel: '022',
    },
  },
  {
    id: 'sajik-central-table-021',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 021블록',
    block: '021',
    officialBlocks: ['021'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 53,
    imageGeometry: {
      d: 'M 599 473 L 603 466 L 624 465 L 626 465 L 665 469 L 666 469 L 666 482 L 662 482 L 658 483 L 655 482 L 641 482 L 625 480 L 613 478 L 603 476 L 600 475 Z',
      labelX: 636,
      labelY: 474,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '021',
    },
  },
  {
    id: 'sajik-avenuel-013',
    level: '1F',
    category: 'AVENUEL',
    name: '에비뉴엘석 013블록',
    block: '013',
    officialBlocks: ['013'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 54,
    imageGeometry: {
      d: 'M 548 439 L 550 436 L 553 433 L 554 433 L 572 441 L 576 443 L 576 445 L 574 448 L 572 452 L 570 452 L 565 450 L 563 449 L 552 443 L 549 440 Z',
      labelX: 562,
      labelY: 442,
      labelRotate: 8,
      labelFontSize: 9,
      shortLabel: '013',
      alignmentSeedPoint: { x: 552, y: 438 },
    },
  },
  {
    id: 'sajik-avenuel-012',
    level: '1F',
    category: 'AVENUEL',
    name: '에비뉴엘석 012블록',
    block: '012',
    officialBlocks: ['012'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 55,
    imageGeometry: {
      d: 'M 589 454 L 592 449 L 593 448 L 596 448 L 621 456 L 624 457 L 624 459 L 622 461 L 620 465 L 618 465 L 609 463 L 595 459 L 589 457 Z',
      labelX: 616,
      labelY: 456,
      labelRotate: 5,
      labelFontSize: 9,
      shortLabel: '012',
      alignmentSeedPoint: { x: 615, y: 459 },
    },
  },
  {
    id: 'sajik-avenuel-011',
    level: '1F',
    category: 'AVENUEL',
    name: '에비뉴엘석 011블록',
    block: '011',
    officialBlocks: ['011'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 56,
    imageGeometry: {
      d: 'M 623 466 L 666 468 L 666 492 L 620 489 L 620 469 Z',
      labelX: 644,
      labelY: 479,
      labelRotate: 3,
      labelFontSize: 9,
      shortLabel: '011',
      alignmentSeedPoint: { x: 643, y: 477 },
    },
  },
  {
    id: 'sajik-infield-field-1b-111',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 111블록',
    block: '111',
    officialBlocks: ['111'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 57,
    imageGeometry: {
      d: 'M 669 447 L 673 445 L 680 442 L 690 438 L 691 441 L 693 450 L 695 460 L 695 462 L 693 463 L 682 464 L 670 464 L 669 463 Z',
      labelX: 682,
      labelY: 453,
      labelRotate: -3,
      labelFontSize: 9,
      shortLabel: '111',
    },
  },
  {
    id: 'sajik-infield-field-1b-112',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 112블록',
    block: '112',
    officialBlocks: ['112'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 58,
    imageGeometry: {
      d: 'M 695 436 L 698 434 L 730 419 L 731 419 L 752 447 L 752 448 L 747 450 L 729 456 L 721 458 L 712 460 L 700 462 L 699 459 L 695 441 Z',
      labelX: 721,
      labelY: 442,
      labelRotate: -6,
      labelFontSize: 9,
      shortLabel: '112',
    },
  },
  {
    id: 'sajik-infield-field-1b-113',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 113블록',
    block: '113',
    officialBlocks: ['113'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 59,
    imageGeometry: {
      d: 'M 735 417 L 736 416 L 765 401 L 769 399 L 789 411 L 797 416 L 800 418 L 801 419 L 800 420 L 793 425 L 790 427 L 775 436 L 764 442 L 758 445 L 756 445 L 753 442 L 749 437 L 743 429 L 738 422 L 736 419 Z',
      labelX: 766,
      labelY: 421,
      labelRotate: -17,
      labelFontSize: 9,
      shortLabel: '113',
    },
  },
  {
    id: 'sajik-infield-field-1b-114',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 114블록',
    block: '114',
    officialBlocks: ['114'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 60,
    imageGeometry: {
      d: 'M 774 397 L 775 396 L 780 393 L 790 388 L 792 388 L 795 389 L 820 400 L 820 401 L 817 405 L 813 409 L 806 415 L 803 415 L 778 400 L 775 398 Z',
      labelX: 798,
      labelY: 401,
      labelRotate: -28,
      labelFontSize: 9,
      shortLabel: '114',
    },
  },
  {
    id: 'sajik-infield-field-1b-115',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 115블록',
    block: '115',
    officialBlocks: ['115'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 61,
    imageGeometry: {
      d: 'M 796 385 L 797 384 L 800 382 L 809 377 L 815 374 L 817 374 L 835 380 L 835 382 L 831 388 L 825 396 L 824 397 L 823 397 L 809 391 L 800 387 Z',
      labelX: 817,
      labelY: 385,
      labelRotate: -28,
      labelFontSize: 9,
      shortLabel: '115',
    },
  },
  {
    id: 'sajik-infield-field-1b-116',
    level: '1F',
    category: 'INFIELD_FIELD_1B',
    name: '1루 내야필드석 116블록',
    block: '116',
    officialBlocks: ['116'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 62,
    imageGeometry: {
      d: 'M 821 371 L 827 367 L 833 364 L 844 360 L 846 360 L 845 363 L 840 373 L 838 376 L 837 376 L 832 375 L 824 372 Z',
      labelX: 835,
      labelY: 369,
      labelRotate: -25,
      labelFontSize: 9,
      shortLabel: '116',
    },
  },
  {
    id: 'sajik-infield-upper-1b-121',
    level: '3F',
    category: 'CHEER_TABLE',
    name: '네이버 클립존 (응원탁자석) 121블록',
    block: '121',
    officialBlocks: ['121'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 63,
    imageGeometry: {
      d: 'M 670 469 L 676 469 L 676 468 L 691 468 L 691 467 L 697 467 L 698 468 L 698 472 L 699 472 L 699 477 L 700 477 L 700 480 L 699 481 L 689 482 L 670 482 Z',
      labelX: 684,
      labelY: 475,
      labelRotate: -2,
      labelFontSize: 9,
      shortLabel: '121',
    },
  },
  {
    id: 'sajik-infield-upper-1b-122',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 122블록',
    block: '122',
    officialBlocks: ['122'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 64,
    imageGeometry: {
      d: 'M 701 466 L 753 452 L 756 452 L 758 454 L 760 464 L 762 465 L 756 467 L 742 472 L 735 474 L 727 476 L 718 478 L 713 478 L 711 470 L 705 470 L 702 473 L 701 469 Z',
      labelX: 733,
      labelY: 465,
      labelRotate: -6,
      labelFontSize: 9,
      shortLabel: '122',
    },
  },
  {
    id: 'sajik-infield-upper-1b-123',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 123블록',
    block: '123',
    officialBlocks: ['123'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 65,
    imageGeometry: {
      d: 'M 759 449 L 804 422 L 807 422 L 809 423 L 811 425 L 814 434 L 813 435 L 804 441 L 793 448 L 778 456 L 770 460 L 769 460 L 761 452 Z',
      labelX: 789,
      labelY: 441,
      labelRotate: -15,
      labelFontSize: 9,
      shortLabel: '123',
    },
  },
  {
    id: 'sajik-infield-upper-1b-124',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 124블록',
    block: '124',
    officialBlocks: ['124'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 66,
    imageGeometry: {
      d: 'M 809 418 L 824 403 L 827 403 L 840 408 L 842 409 L 842 410 L 831 421 L 825 426 L 822 426 L 815 422 L 810 419 Z',
      labelX: 816,
      labelY: 418,
      labelRotate: -28,
      labelFontSize: 9,
      shortLabel: '124',
    },
  },
  {
    id: 'sajik-infield-upper-1b-125',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 125블록',
    block: '125',
    officialBlocks: ['125'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 67,
    imageGeometry: {
      d: 'M 828 399 L 830 396 L 839 383 L 840 382 L 843 382 L 858 385 L 859 386 L 859 387 L 858 389 L 854 395 L 848 403 L 846 405 L 843 405 L 835 402 L 830 400 Z',
      labelX: 842,
      labelY: 394,
      labelRotate: -28,
      labelFontSize: 9,
      shortLabel: '125',
    },
  },
  {
    id: 'sajik-infield-upper-1b-126',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 126블록',
    block: '126',
    officialBlocks: ['126'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 68,
    imageGeometry: {
      d: 'M 843 377 L 850 362 L 852 359 L 872 359 L 872 363 L 866 375 L 865 376 L 860 375 L 857 380 L 853 380 L 844 378 Z',
      labelX: 857,
      labelY: 371,
      labelRotate: -20,
      labelFontSize: 9,
      shortLabel: '126',
    },
  },
  {
    id: 'sajik-infield-upper-1b-127',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 127블록',
    block: '127',
    officialBlocks: ['127'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 69,
    imageGeometry: {
      d: 'M 854 352 L 859 335 L 860 334 L 877 332 L 881 332 L 881 334 L 879 342 L 878 345 L 877 347 L 867 354 L 854 354 Z',
      labelX: 858,
      labelY: 344,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '127',
    },
  },
  {
    id: 'sajik-infield-upper-1b-131',
    level: '3F',
    category: 'CHEER_TABLE',
    name: '네이버 클립존 (응원탁자석) 131블록',
    block: '131',
    officialBlocks: ['131'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 70,
    imageGeometry: {
      d: 'M 666 484 L 694 483 L 703 484 L 704 491 L 700 493 L 674 493 L 666 491 Z',
      labelX: 683,
      labelY: 489,
      labelRotate: -2,
      labelFontSize: 9,
      shortLabel: '131',
    },
  },
  {
    id: 'sajik-infield-upper-1b-132',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 132블록',
    block: '132',
    officialBlocks: ['132'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 71,
    imageGeometry: {
      d: 'M 705 483 L 732 478 L 733 478 L 733 484 L 731 484 L 727 483 L 724 487 L 719 489 L 713 490 L 706 490 L 705 486 Z',
      labelX: 713,
      labelY: 485,
      labelRotate: -2,
      labelFontSize: 9,
      shortLabel: '132',
    },
  },
  {
    id: 'sajik-infield-upper-1b-133',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 133블록',
    block: '133',
    officialBlocks: ['133'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 72,
    imageGeometry: {
      d: 'M 772 464 L 779 460 L 790 454 L 798 450 L 799 450 L 803 453 L 803 455 L 802 456 L 793 461 L 777 469 L 775 469 L 772 465 Z',
      labelX: 787,
      labelY: 460,
      labelRotate: -12,
      labelFontSize: 9,
      shortLabel: '133',
    },
  },
  {
    id: 'sajik-infield-upper-1b-134',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 134블록',
    block: '134',
    officialBlocks: ['134'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 73,
    imageGeometry: {
      d: 'M 828 429 L 829 428 L 847 411 L 848 411 L 863 416 L 864 418 L 860 422 L 846 437 L 845 438 L 843 438 L 835 433 L 830 431 L 828 430 Z',
      labelX: 844,
      labelY: 424,
      labelRotate: -28,
      labelFontSize: 9,
      shortLabel: '134',
    },
  },
  {
    id: 'sajik-infield-upper-1b-135',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 135블록',
    block: '135',
    officialBlocks: ['135'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 74,
    imageGeometry: {
      d: 'M 856 400 L 857 398 L 863 389 L 865 387 L 868 387 L 879 389 L 884 390 L 880 396 L 875 403 L 873 407 L 870 411 L 868 413 L 864 413 L 860 411 L 859 410 Z',
      labelX: 869,
      labelY: 400,
      labelRotate: -28,
      labelFontSize: 9,
      shortLabel: '135',
    },
  },
  {
    id: 'sajik-infield-upper-1b-136',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 136블록',
    block: '136',
    officialBlocks: ['136'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 75,
    imageGeometry: {
      d: 'M 868 382 L 869 379 L 876 364 L 878 360 L 900 360 L 900 361 L 897 368 L 896 370 L 891 379 L 888 384 L 887 385 L 883 385 L 871 383 Z',
      labelX: 884,
      labelY: 372,
      labelRotate: -16,
      labelFontSize: 9,
      shortLabel: '136',
    },
  },
  {
    id: 'sajik-infield-upper-1b-137',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 137블록',
    block: '137',
    officialBlocks: ['137'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 76,
    imageGeometry: {
      d: 'M 880 354 L 886 332 L 887 331 L 905 329 L 911 329 L 911 333 L 910 337 L 907 347 L 905 350 L 904 348 L 897 347 L 895 350 L 894 355 L 880 356 Z',
      labelX: 895,
      labelY: 342,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '137',
    },
  },
  {
    id: 'sajik-central-table-041',
    level: '1F',
    category: 'CENTRAL_TABLE',
    name: '중앙탁자석 041블록',
    block: '041',
    officialBlocks: ['041'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 77,
    seatViewSections: ['141', '141블록'],
    parentLabel: '141',
    imageGeometry: {
      d: 'M 620 496 L 621 492 L 627 492 L 656 495 L 655 502 L 641 501 L 632 500 L 624 499 L 620 498 Z',
      labelX: 640,
      labelY: 499,
      labelRotate: 1,
      labelFontSize: 9,
      shortLabel: '041',
    },
  },
  {
    id: 'sajik-infield-upper-1b-142',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 142블록',
    block: '142',
    officialBlocks: ['142'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 78,
    imageGeometry: {
      d: 'M 671 506 L 708 494 L 774 475 L 777 478 L 782 483 L 782 485 L 776 488 L 758 497 L 749 501 L 734 507 L 713 514 L 702 517 L 690 520 L 675 523 L 671 523 Z',
      labelX: 725,
      labelY: 506,
      labelRotate: -3,
      labelFontSize: 9,
      shortLabel: '142',
    },
  },
  {
    id: 'sajik-infield-upper-1b-143',
    level: '3F',
    category: 'INFIELD_UPPER_1B',
    name: '1루 내야상단석 143블록',
    block: '143',
    officialBlocks: ['143'],
    side: 'FIRST_BASE',
    fanRole: 'AWAY',
    displayPriority: 79,
    imageGeometry: {
      d: 'M 779 473 L 834 438 L 835 438 L 839 440 L 840 441 L 835 446 L 828 452 L 823 456 L 811 465 L 793 477 L 788 480 L 786 481 L 781 476 Z',
      labelX: 795,
      labelY: 471,
      labelRotate: -14,
      labelFontSize: 9,
      shortLabel: '143',
    },
  },
  {
    id: 'sajik-everytime-914',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 914블록',
    block: '914',
    officialBlocks: ['914'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 80,
    imageGeometry: {
      d: 'M 850 272 L 883 268 L 884 286 L 846 291 L 846 278 Z',
      labelX: 862,
      labelY: 280,
      labelRotate: 6,
      labelFontSize: 9,
      shortLabel: '914',
      alignmentSeedPoint: { x: 862, y: 280 },
    },
  },
  {
    id: 'sajik-everytime-913',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 913블록',
    block: '913',
    officialBlocks: ['913'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 81,
    imageGeometry: {
      d: 'M 859 293 L 863 292 L 871 289 L 882 286 L 884 286 L 885 292 L 885 300 L 882 301 L 865 304 L 862 304 L 859 302 L 859 294 Z',
      labelX: 861,
      labelY: 298,
      labelRotate: 7,
      labelFontSize: 9,
      shortLabel: '913',
    },
  },
  {
    id: 'sajik-everytime-912',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 912블록',
    block: '912',
    officialBlocks: ['912'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 82,
    imageGeometry: {
      d: 'M 861 293 L 885 285 L 886 288 L 886 301 L 868 305 L 862 305 Z',
      labelX: 879,
      labelY: 302,
      labelRotate: 3,
      labelFontSize: 9,
      shortLabel: '912',
    },
  },
  {
    id: 'sajik-everytime-911',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 911블록',
    block: '911',
    officialBlocks: ['911'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 83,
    imageGeometry: {
      d: 'M 861 293 L 863 292 L 871 289 L 882 286 L 884 286 L 885 292 L 885 300 L 882 301 L 865 304 L 862 304 L 861 294 Z',
      labelX: 874,
      labelY: 296,
      labelRotate: 0,
      labelFontSize: 9,
      shortLabel: '911',
    },
  },
  {
    id: 'sajik-everytime-903',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 903블록',
    block: '903',
    officialBlocks: ['903'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 84,
    imageGeometry: {
      d: 'M 886 266 L 888 264 L 899 259 L 909 255 L 911 255 L 912 258 L 913 264 L 913 271 L 912 272 L 894 278 L 888 278 L 887 274 L 886 269 Z',
      labelX: 899,
      labelY: 267,
      labelRotate: 9,
      labelFontSize: 9,
      shortLabel: '903',
      alignmentSeedPoint: { x: 895, y: 262 },
    },
  },
  {
    id: 'sajik-everytime-902',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 902블록',
    block: '902',
    officialBlocks: ['902'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 85,
    imageGeometry: {
      d: 'M 886 265 L 909 255 L 912 255 L 914 264 L 914 273 L 892 280 L 888 280 Z',
      labelX: 903,
      labelY: 274,
      labelRotate: 6,
      labelFontSize: 9,
      shortLabel: '902',
    },
  },
  {
    id: 'sajik-everytime-901',
    level: '2F',
    category: 'EVERYTIME',
    name: '정관장 에브리타임존 901블록',
    block: '901',
    officialBlocks: ['901'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 86,
    imageGeometry: {
      d: 'M 888 284 L 911 276 L 915 276 L 916 296 L 889 301 Z',
      labelX: 903,
      labelY: 291,
      labelRotate: 2,
      labelFontSize: 9,
      shortLabel: '901',
    },
  },
  {
    id: 'sajik-accessible-휠체어석-3루',
    level: '1F',
    category: 'ACCESSIBLE',
    name: '휠체어석 3루',
    block: '휠체어석-3루',
    officialBlocks: ['휠체어석-3루'],
    side: 'THIRD_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 87,
    imageGeometry: {
      d: 'M 452 253 L 476 263 L 471 283 L 467 283 L 446 276 Z',
      hitPath: 'M 452 253 L 476 263 L 471 283 L 467 283 L 449 276 Z',
      labelX: 454,
      labelY: 276,
      labelRotate: 0,
      labelFontSize: 7,
      shortLabel: '휠체어석-3루',
    },
    accessibilityNote: '공식 좌석도에 휠체어석 아이콘으로 표시된 구역입니다.',
  },
  {
    id: 'sajik-accessible-휠체어석-중앙',
    level: '1F',
    category: 'ACCESSIBLE',
    name: '휠체어석 중앙',
    block: '휠체어석-중앙',
    officialBlocks: ['휠체어석-중앙'],
    side: 'CENTER',
    fanRole: 'NEUTRAL',
    displayPriority: 88,
    imageGeometry: {
      d: 'M 513 404 L 530 397 L 533 397 L 534 404 L 529 418 L 524 416 L 513 406 Z',
      labelX: 530,
      labelY: 407,
      labelRotate: 0,
      labelFontSize: 7,
      shortLabel: '휠체어석-중앙',
    },
    accessibilityNote: '공식 좌석도에 휠체어석 아이콘으로 표시된 구역입니다.',
  },
  {
    id: 'sajik-accessible-휠체어석-1루',
    level: '1F',
    category: 'ACCESSIBLE',
    name: '휠체어석 1루',
    block: '휠체어석-1루',
    officialBlocks: ['휠체어석-1루'],
    side: 'FIRST_BASE',
    fanRole: 'NEUTRAL',
    displayPriority: 89,
    imageGeometry: {
      d: 'M 826 539 L 828 537 L 833 536 L 838 539 L 839 546 L 836 550 L 827 549 L 825 545 Z',
      labelX: 833,
      labelY: 543,
      labelRotate: 0,
      labelFontSize: 7,
      shortLabel: '휠체어석-1루',
    },
    accessibilityNote: '공식 좌석도에 휠체어석 아이콘으로 표시된 구역입니다.',
  },
];

export const SAJIK_BLOCKS: SajikBlock[] = SAJIK_BLOCK_DEFINITIONS.map(createSajikBlock);

export const SAJIK_OFFICIAL_TRACE_REFERENCE: Record<string, SajikOfficialTraceReference> = {
  '338': { numberAnchor: { x: 506, y: 148 }, expectedBounds: { minX: 484, minY: 142, maxX: 517, maxY: 170 }, expectedSubpathCount: 1, expectedPointCount: 12, expectedArea: 573 },
  '732': { numberAnchor: { x: 562, y: 122 }, expectedBounds: { minX: 535, minY: 99, maxX: 592, maxY: 143 }, expectedSubpathCount: 1, expectedPointCount: 16, expectedArea: 1527.5 },
  '733': { numberAnchor: { x: 617, y: 116 }, expectedBounds: { minX: 589, minY: 89, maxX: 643, maxY: 127 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 1530.5 },
  '734': { numberAnchor: { x: 675, y: 116 }, expectedBounds: { minX: 645, minY: 88, maxX: 695, maxY: 120 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 1489 },
  '721': { numberAnchor: { x: 534, y: 172 }, expectedBounds: { minX: 507, minY: 149, maxX: 559, maxY: 194 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 1208 },
  '722': { numberAnchor: { x: 575, y: 149 }, expectedBounds: { minX: 552, minY: 132, maxX: 601, maxY: 170 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 1126 },
  '723': { numberAnchor: { x: 625, y: 145 }, expectedBounds: { minX: 598, minY: 124, maxX: 645, maxY: 156 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 1134.5 },
  '724': { numberAnchor: { x: 682, y: 147 }, expectedBounds: { minX: 647, minY: 123, maxX: 730, maxY: 153 }, expectedSubpathCount: 1, expectedPointCount: 16, expectedArea: 2099.5 },
  '925': { numberAnchor: { x: 807, y: 176 }, expectedBounds: { minX: 780, minY: 156, maxX: 820, maxY: 192 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 810 },
  '935': { numberAnchor: { x: 820, y: 145 }, expectedBounds: { minX: 796, minY: 128, maxX: 843, maxY: 170 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1091.5 },
  '924': { numberAnchor: { x: 829, y: 203 }, expectedBounds: { minX: 806, minY: 177, maxX: 850, maxY: 221 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 990 },
  '934': { numberAnchor: { x: 848, y: 181 }, expectedBounds: { minX: 826, minY: 151, maxX: 876, maxY: 202 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1316 },
  '923': { numberAnchor: { x: 849, y: 236 }, expectedBounds: { minX: 833, minY: 208, maxX: 873, maxY: 253 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 975 },
  '933': { numberAnchor: { x: 873, y: 217 }, expectedBounds: { minX: 857, minY: 187, maxX: 902, maxY: 239 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1282.5 },
  '922': { numberAnchor: { x: 862, y: 268 }, expectedBounds: { minX: 853, minY: 245, maxX: 880, maxY: 272 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 456.5 },
  '932': { numberAnchor: { x: 887, y: 257 }, expectedBounds: { minX: 879, minY: 230, maxX: 910, maxY: 261 }, expectedSubpathCount: 1, expectedPointCount: 8, expectedArea: 613 },
  '931': { numberAnchor: { x: 899, y: 310 }, expectedBounds: { minX: 887, minY: 300, maxX: 915, maxY: 327 }, expectedSubpathCount: 1, expectedPointCount: 4, expectedArea: 590.5 },
  '337': { numberAnchor: { x: 468, y: 178 }, expectedBounds: { minX: 438, minY: 155, maxX: 500, maxY: 219 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 1879.5 },
  '327': { numberAnchor: { x: 491, y: 216 }, expectedBounds: { minX: 467, minY: 179, maxX: 521, maxY: 235 }, expectedSubpathCount: 1, expectedPointCount: 8, expectedArea: 1515.5 },
  '336': { numberAnchor: { x: 435, y: 230 }, expectedBounds: { minX: 423, minY: 209, maxX: 461, maxY: 248 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 839.5 },
  '326': { numberAnchor: { x: 469, y: 247 }, expectedBounds: { minX: 454, minY: 226, maxX: 487, maxY: 260 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 652 },
  '335': { numberAnchor: { x: 421, y: 286 }, expectedBounds: { minX: 402, minY: 269, maxX: 441, maxY: 303 }, expectedSubpathCount: 1, expectedPointCount: 16, expectedArea: 969 },
  '325': { numberAnchor: { x: 446.5, y: 274 }, expectedBounds: { minX: 446, minY: 253, maxX: 475, maxY: 282 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 562.5 },
  '334': { numberAnchor: { x: 413, y: 306 }, expectedBounds: { minX: 398, minY: 300, maxX: 432, maxY: 358 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 1567.5 },
  '324': { numberAnchor: { x: 448, y: 305 }, expectedBounds: { minX: 444, minY: 282, maxX: 470, maxY: 309 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 573 },
  '343': { numberAnchor: { x: 413, y: 336 }, expectedBounds: { minX: 398, minY: 307, maxX: 433, maxY: 358 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 1455.5 },
  '333': { numberAnchor: { x: 449, y: 335 }, expectedBounds: { minX: 444, minY: 308, maxX: 477, maxY: 358 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1190.5 },
  '342': { numberAnchor: { x: 420, y: 374 }, expectedBounds: { minX: 399, minY: 361, maxX: 452, maxY: 421 }, expectedSubpathCount: 1, expectedPointCount: 17, expectedArea: 2331 },
  '332': { numberAnchor: { x: 465, y: 377 }, expectedBounds: { minX: 457, minY: 361, maxX: 487, maxY: 385 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 497.5 },
  '331': { numberAnchor: { x: 450, y: 407 }, expectedBounds: { minX: 441, minY: 394, maxX: 467, maxY: 419 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 263 },
  '321': { numberAnchor: { x: 488, y: 401 }, expectedBounds: { minX: 471, minY: 385, maxX: 506, maxY: 409 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 489 },
  '316': { numberAnchor: { x: 502, y: 246 }, expectedBounds: { minX: 481, minY: 221, maxX: 516, maxY: 274 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1047 },
  '315': { numberAnchor: { x: 491, y: 278 }, expectedBounds: { minX: 474, minY: 265, maxX: 519, maxY: 295 }, expectedSubpathCount: 1, expectedPointCount: 4, expectedArea: 745 },
  '314': { numberAnchor: { x: 488, y: 309 }, expectedBounds: { minX: 472, minY: 288, maxX: 521, maxY: 316 }, expectedSubpathCount: 1, expectedPointCount: 16, expectedArea: 943.5 },
  '313': { numberAnchor: { x: 491, y: 342 }, expectedBounds: { minX: 472, minY: 313, maxX: 526, maxY: 356 }, expectedSubpathCount: 1, expectedPointCount: 19, expectedArea: 1836.5 },
  '312': { numberAnchor: { x: 501, y: 373 }, expectedBounds: { minX: 483, minY: 356, maxX: 529, maxY: 380 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 781.5 },
  '311': { numberAnchor: { x: 520, y: 392 }, expectedBounds: { minX: 496, minY: 375, maxX: 532, maxY: 402 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 607 },
  '057': { numberAnchor: { x: 452, y: 430 }, expectedBounds: { minX: 421, minY: 421, maxX: 476, maxY: 449 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 930 },
  '056': { numberAnchor: { x: 487, y: 459 }, expectedBounds: { minX: 443, minY: 442, maxX: 507, maxY: 479 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1314.5 },
  '055': { numberAnchor: { x: 486, y: 484 }, expectedBounds: { minX: 477, minY: 463, maxX: 529, maxY: 495 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 887.5 },
  '054': { numberAnchor: { x: 532, y: 496 }, expectedBounds: { minX: 505, minY: 474, maxX: 567, maxY: 513 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 1390 },
  '053': { numberAnchor: { x: 575, y: 508 }, expectedBounds: { minX: 553, minY: 490, maxX: 592, maxY: 520 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 727 },
  '052': { numberAnchor: { x: 612, y: 513 }, expectedBounds: { minX: 586, minY: 497, maxX: 635, maxY: 526 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 1116 },
  '051': { numberAnchor: { x: 651, y: 512 }, expectedBounds: { minX: 636, minY: 504, maxX: 666, maxY: 525 }, expectedSubpathCount: 1, expectedPointCount: 10, expectedArea: 564 },
  '044': { numberAnchor: { x: 480, y: 433 }, expectedBounds: { minX: 465, minY: 422, maxX: 498, maxY: 446 }, expectedSubpathCount: 1, expectedPointCount: 12, expectedArea: 264.5 },
  '034': { numberAnchor: { x: 496, y: 414 }, expectedBounds: { minX: 490, minY: 406, maxX: 546, maxY: 450 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 1007 },
  '024': { numberAnchor: { x: 535, y: 432 }, expectedBounds: { minX: 497, minY: 406, maxX: 545, maxY: 449 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 929.5 },
  '033': { numberAnchor: { x: 525, y: 455 }, expectedBounds: { minX: 473, minY: 414, maxX: 534, maxY: 458 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 718.5 },
  '032': { numberAnchor: { x: 588, y: 466 }, expectedBounds: { minX: 569, minY: 453, maxX: 599, maxY: 472 }, expectedSubpathCount: 1, expectedPointCount: 16, expectedArea: 334.5 },
  '031': { numberAnchor: { x: 636, y: 488 }, expectedBounds: { minX: 600, minY: 484, maxX: 666, maxY: 493 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 497 },
  '023': { numberAnchor: { x: 557, y: 455 }, expectedBounds: { minX: 542, minY: 445, maxX: 570, maxY: 463 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 276.5 },
  '022': { numberAnchor: { x: 589, y: 462 }, expectedBounds: { minX: 569, minY: 453, maxX: 600, maxY: 473 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 365 },
  '021': { numberAnchor: { x: 636, y: 474 }, expectedBounds: { minX: 599, minY: 465, maxX: 666, maxY: 483 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 902.5 },
  '013': { numberAnchor: { x: 562, y: 442 }, expectedBounds: { minX: 548, minY: 433, maxX: 576, maxY: 452 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 275.5 },
  '012': { numberAnchor: { x: 616, y: 456 }, expectedBounds: { minX: 589, minY: 448, maxX: 624, maxY: 465 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 337.5 },
  '011': { numberAnchor: { x: 644, y: 479 }, expectedBounds: { minX: 620, minY: 466, maxX: 666, maxY: 492 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 1079.5 },
  '111': { numberAnchor: { x: 682, y: 453 }, expectedBounds: { minX: 669, minY: 438, maxX: 695, maxY: 464 }, expectedSubpathCount: 1, expectedPointCount: 12, expectedArea: 526 },
  '112': { numberAnchor: { x: 721, y: 442 }, expectedBounds: { minX: 695, minY: 419, maxX: 752, maxY: 462 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 1513.5 },
  '113': { numberAnchor: { x: 766, y: 421 }, expectedBounds: { minX: 735, minY: 399, maxX: 801, maxY: 445 }, expectedSubpathCount: 1, expectedPointCount: 20, expectedArea: 1640 },
  '114': { numberAnchor: { x: 798, y: 401 }, expectedBounds: { minX: 774, minY: 388, maxX: 820, maxY: 415 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 670 },
  '115': { numberAnchor: { x: 817, y: 385 }, expectedBounds: { minX: 796, minY: 374, maxX: 835, maxY: 397 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 510.5 },
  '116': { numberAnchor: { x: 835, y: 369 }, expectedBounds: { minX: 821, minY: 360, maxX: 846, maxY: 376 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 197.5 },
  '121': { numberAnchor: { x: 684, y: 475 }, expectedBounds: { minX: 670, minY: 467, maxX: 700, maxY: 482 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 401 },
  '122': { numberAnchor: { x: 733, y: 465 }, expectedBounds: { minX: 701, minY: 452, maxX: 762, maxY: 478 }, expectedSubpathCount: 1, expectedPointCount: 16, expectedArea: 839.5 },
  '123': { numberAnchor: { x: 789, y: 441 }, expectedBounds: { minX: 759, minY: 422, maxX: 814, maxY: 460 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 874 },
  '124': { numberAnchor: { x: 816, y: 418 }, expectedBounds: { minX: 809, minY: 403, maxX: 842, maxY: 426 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 423.5 },
  '125': { numberAnchor: { x: 842, y: 394 }, expectedBounds: { minX: 828, minY: 382, maxX: 859, maxY: 405 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 438 },
  '126': { numberAnchor: { x: 857, y: 371 }, expectedBounds: { minX: 843, minY: 359, maxX: 872, maxY: 380 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 420.5 },
  '127': { numberAnchor: { x: 858, y: 344 }, expectedBounds: { minX: 854, minY: 332, maxX: 881, maxY: 354 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 431.5 },
  '131': { numberAnchor: { x: 683, y: 489 }, expectedBounds: { minX: 666, minY: 483, maxX: 704, maxY: 493 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 345 },
  '132': { numberAnchor: { x: 713, y: 485 }, expectedBounds: { minX: 705, minY: 478, maxX: 733, maxY: 490 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 200.5 },
  '133': { numberAnchor: { x: 787, y: 460 }, expectedBounds: { minX: 772, minY: 450, maxX: 803, maxY: 469 }, expectedSubpathCount: 1, expectedPointCount: 12, expectedArea: 228 },
  '134': { numberAnchor: { x: 844, y: 424 }, expectedBounds: { minX: 828, minY: 411, maxX: 864, maxY: 438 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 501.5 },
  '135': { numberAnchor: { x: 869, y: 400 }, expectedBounds: { minX: 856, minY: 387, maxX: 884, maxY: 413 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 443.5 },
  '136': { numberAnchor: { x: 884, y: 372 }, expectedBounds: { minX: 868, minY: 360, maxX: 900, maxY: 385 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 534.5 },
  '137': { numberAnchor: { x: 895, y: 342 }, expectedBounds: { minX: 880, minY: 329, maxX: 911, maxY: 356 }, expectedSubpathCount: 1, expectedPointCount: 14, expectedArea: 562.5 },
  '041': { numberAnchor: { x: 640, y: 499 }, expectedBounds: { minX: 620, minY: 492, maxX: 656, maxY: 502 }, expectedSubpathCount: 1, expectedPointCount: 9, expectedArea: 256.5 },
  '142': { numberAnchor: { x: 725, y: 506 }, expectedBounds: { minX: 671, minY: 475, maxX: 782, maxY: 523 }, expectedSubpathCount: 1, expectedPointCount: 15, expectedArea: 2053.5 },
  '143': { numberAnchor: { x: 795, y: 471 }, expectedBounds: { minX: 779, minY: 438, maxX: 840, maxY: 481 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 642.5 },
  '914': { numberAnchor: { x: 862, y: 280 }, expectedBounds: { minX: 846, minY: 268, maxX: 884, maxY: 291 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 676 },
  '913': { numberAnchor: { x: 861, y: 298 }, expectedBounds: { minX: 859, minY: 286, maxX: 885, maxY: 304 }, expectedSubpathCount: 1, expectedPointCount: 12, expectedArea: 347.5 },
  '912': { numberAnchor: { x: 879, y: 302 }, expectedBounds: { minX: 861, minY: 285, maxX: 886, maxY: 305 }, expectedSubpathCount: 1, expectedPointCount: 6, expectedArea: 360.5 },
  '911': { numberAnchor: { x: 874, y: 296 }, expectedBounds: { minX: 861, minY: 286, maxX: 885, maxY: 304 }, expectedSubpathCount: 1, expectedPointCount: 11, expectedArea: 322.5 },
  '903': { numberAnchor: { x: 899, y: 267 }, expectedBounds: { minX: 886, minY: 255, maxX: 913, maxY: 278 }, expectedSubpathCount: 1, expectedPointCount: 13, expectedArea: 433 },
  '902': { numberAnchor: { x: 903, y: 274 }, expectedBounds: { minX: 886, minY: 255, maxX: 914, maxY: 280 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 484 },
  '901': { numberAnchor: { x: 903, y: 291 }, expectedBounds: { minX: 888, minY: 276, maxX: 916, maxY: 301 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 522 },
  '휠체어석-3루': { numberAnchor: { x: 454, y: 276 }, expectedBounds: { minX: 446, minY: 253, maxX: 476, maxY: 283 }, expectedSubpathCount: 1, expectedPointCount: 5, expectedArea: 587.5 },
  '휠체어석-중앙': { numberAnchor: { x: 530, y: 407 }, expectedBounds: { minX: 513, minY: 397, maxX: 534, maxY: 418 }, expectedSubpathCount: 1, expectedPointCount: 7, expectedArea: 261 },
  '휠체어석-1루': { numberAnchor: { x: 833, y: 543 }, expectedBounds: { minX: 825, minY: 536, maxX: 839, maxY: 550 }, expectedSubpathCount: 1, expectedPointCount: 8, expectedArea: 153 },
};

function createSajikTraceReviewSummary(blocks: SajikBlock[]): SajikTraceReviewSummary {
  return blocks.reduce<SajikTraceReviewSummary>((summary, block) => {
    summary.totalBlocks += 1;
    if (block.mapInteractionStatus === 'MAP_SELECTABLE') {
      summary.mapSelectable += 1;
    } else {
      summary.aliasOnlyOfficialPngBlockNotVisible += 1;
    }
    if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      summary.officialImageTraced += 1;
    } else {
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
    } else {
      summary.manualReviewRequired += 1;
    }
    return summary;
  }, {
    totalBlocks: 0,
    mapSelectable: 0,
    aliasOnlyOfficialPngBlockNotVisible: 0,
    officialImageTraced: 0,
    needsOperatorReview: 0,
    directOfficialTrace: 0,
    manualReviewed: 0,
    unreviewedBlocks: 0,
    pixelAligned: 0,
    manualReviewRequired: 0,
  });
}

export const SAJIK_TRACE_REVIEW_SUMMARY = createSajikTraceReviewSummary(SAJIK_BLOCKS);

const SIDE_LABELS: Record<SajikSide, string> = {
  FIRST_BASE: '1루',
  THIRD_BASE: '3루',
  CENTER: '중앙',
  OUTFIELD: '외야',
};

const FAN_ROLE_LABELS: Record<SajikFanRole, string> = {
  HOME: '홈 응원',
  AWAY: '원정 응원',
  NEUTRAL: '중립',
};

const SOURCE_LABELS: Record<SajikSourceConfidence, string> = {
  OFFICIAL: '공식 확인',
  UNVERIFIED: '공식 확인 필요',
};

const TRACE_STATUS_LABELS: Record<SajikTraceStatus, string> = {
  OFFICIAL_IMAGE_TRACED: '공식 이미지 트레이싱',
  NEEDS_OPERATOR_REVIEW: '운영자 재검수 필요',
};

export function getSajikSideLabel(side: SajikSide): string {
  return SIDE_LABELS[side];
}

export function getSajikFanRoleLabel(fanRole: SajikFanRole): string {
  return FAN_ROLE_LABELS[fanRole];
}

export function getSajikSourceLabel(sourceConfidence: SajikSourceConfidence): string {
  return SOURCE_LABELS[sourceConfidence];
}

export function getSajikTraceStatusLabel(traceStatus: SajikTraceStatus): string {
  return TRACE_STATUS_LABELS[traceStatus];
}

export function getSajikSeatViewAliases(block: SajikBlock): string[] {
  const categoryLabel = SAJIK_CATEGORIES[block.category]?.label;
  const aliases = [
    '사직',
    '사직야구장',
    '부산 사직야구장',
    '롯데',
    '롯데 자이언츠',
    block.name,
    block.block,
    block.block ? `${block.block}블록` : null,
    categoryLabel,
    ...block.officialBlocks,
    ...block.officialBlocks.map((officialBlock) => `${officialBlock}블록`),
    ...block.seatViewSections,
  ];

  return Array.from(new Set(
    aliases
      .map((alias) => alias?.trim())
      .filter((alias): alias is string => Boolean(alias)),
  ));
}

function normalizeSajikGuideSearch(value: string): string {
  return value.toLowerCase().replace(/[\s\-_/()·.]/g, '');
}

function getSajikGuideSearchAliases(block: SajikBlock): string[] {
  const categoryLabel = SAJIK_CATEGORIES[block.category]?.label;
  return getSajikSeatViewAliases(block).concat([
    block.id,
    block.name,
    block.block,
    categoryLabel ?? '',
    getSajikSideLabel(block.side),
    getSajikFanRoleLabel(block.fanRole),
    block.level,
  ]);
}

function getSajikGuideIntentReasons(intent: SajikGuideIntent, block: SajikBlock): string[] {
  const category = SAJIK_CATEGORIES[block.category];
  const reasons: string[] = [];

  if (intent === 'all') {
    reasons.push('전체');
  }
  if (intent === 'home_cheer' && block.fanRole === 'HOME') {
    reasons.push('홈 응원');
  }
  if (intent === 'away_third' && (block.fanRole === 'AWAY' || block.side === 'THIRD_BASE')) {
    reasons.push(block.fanRole === 'AWAY' ? '원정 응원' : '3루');
  }
  if (
    intent === 'center_table'
    && (
      block.side === 'CENTER'
      || block.category.includes('TABLE')
      || Boolean(category?.label.includes('탁자'))
    )
  ) {
    reasons.push(block.side === 'CENTER' ? '중앙' : '탁자석');
  }
  if (
    intent === 'outfield'
    && (
      block.level === 'OUTFIELD'
      || block.side === 'OUTFIELD'
      || block.category.startsWith('OUTFIELD')
      || block.category === 'CAMPING'
    )
  ) {
    reasons.push('외야');
  }
  if (intent === 'accessible' && (block.category === 'ACCESSIBLE' || Boolean(block.accessibilityNote))) {
    reasons.push('휠체어석');
  }

  return Array.from(new Set(reasons));
}

function getSajikGuideSearchScore(block: SajikBlock, normalizedQuery: string): number {
  if (!normalizedQuery) {
    return 0;
  }

  const aliases = getSajikGuideSearchAliases(block)
    .map(normalizeSajikGuideSearch)
    .filter(Boolean);

  if (!aliases.some((alias) => alias.includes(normalizedQuery))) {
    return -1;
  }

  if (normalizeSajikGuideSearch(block.block) === normalizedQuery) {
    return 30;
  }
  if (block.officialBlocks.some((officialBlock) => normalizeSajikGuideSearch(officialBlock) === normalizedQuery)) {
    return 26;
  }
  if (aliases.some((alias) => alias === normalizedQuery)) {
    return 22;
  }
  return 12;
}

export function getSajikGuideMatches(
  intent: SajikGuideIntent,
  query: string,
  blocks: SajikBlock[] = SAJIK_BLOCKS,
): SajikBlockMatch[] {
  const normalizedQuery = normalizeSajikGuideSearch(query.trim());

  return blocks
    .map((block) => {
      const intentReasons = getSajikGuideIntentReasons(intent, block);
      const matchesIntent = intent === 'all' || intentReasons.length > 0;
      if (!matchesIntent) {
        return null;
      }

      const searchScore = getSajikGuideSearchScore(block, normalizedQuery);
      if (searchScore < 0) {
        return null;
      }

      const reasons = intentReasons.length > 0 ? intentReasons : ['검색'];
      if (normalizedQuery) {
        reasons.push('검색 일치');
      }

      return {
        block,
        reasons: Array.from(new Set(reasons)),
        score: (intent === 'all' ? 0 : 40) + searchScore + Math.max(0, 120 - block.displayPriority) / 100,
      };
    })
    .filter((match): match is SajikBlockMatch => Boolean(match))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.block.displayPriority - right.block.displayPriority;
    });
}
