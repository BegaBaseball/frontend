// Gwangju-KIA Champions Field seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type GwangjuSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type GwangjuFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type GwangjuLevel = '1F' | '2F' | '3F' | '4F' | '5F' | 'OUTFIELD';
export type GwangjuSourceConfidence = 'OFFICIAL' | 'UNVERIFIED';
export type GwangjuSeatMapAssetStatus = 'OFFICIAL' | 'MANUAL_BASEBALL_DATA_REQUIRED';

export interface GwangjuImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
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

export type GwangjuCoordinateTraceStatus = 'RETRACE_IN_PROGRESS' | 'READY';
export type GwangjuTraceReviewPriority = 'P0' | 'P1' | 'P2';
export type GwangjuTraceReviewMethod = 'GENERATED_ROTATED_BOX' | 'OFFICIAL_IMAGE_PIXEL_TRACE' | 'APPROXIMATE_MANUAL_POLYGON' | 'OPERATOR_REQUIRED';

export interface GwangjuTraceReviewRegion {
  id: string;
  label: string;
  priority: GwangjuTraceReviewPriority;
  blockIds: string[];
  method: GwangjuTraceReviewMethod;
  note: string;
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
    requiredFields: ['officialBlocks', 'side', 'fanRole', 'points', 'labelX', 'labelY', 'shortLabel'],
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
    requiredFields: ['officialBlocks', 'side', 'fanRole', 'points', 'labelX', 'labelY', 'shortLabel'],
    status: 'PENDING_OPERATOR_INPUT',
  },
];

export const GWANGJU_PENDING_OPERATOR_SECTIONS: string[] = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
  .filter((section) => section.status === 'PENDING_OPERATOR_INPUT')
  .map((section) => section.name);
export const GWANGJU_SEATMAP_COORDINATES_READY = GWANGJU_PENDING_OPERATOR_SECTIONS.length === 0;
export const GWANGJU_COORDINATE_TRACE_STATUS: GwangjuCoordinateTraceStatus = 'RETRACE_IN_PROGRESS';

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
  { id: 'infield', label: '내야석', cats: ['K9', 'K8', 'K5'] },
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
      ...numberedBlocks(101, 113).map((block) => blockId(Number(block) <= 107 ? 'K5' : Number(block) <= 111 ? 'K8' : 'K9', block)),
      ...['116', '117'].map((block) => blockId('K9', block)),
      ...numberedBlocks(118, 123).map((block) => blockId('K8', block)),
      ...numberedBlocks(124, 127).map((block) => blockId('K5', block)),
    ],
    method: 'APPROXIMATE_MANUAL_POLYGON',
    note: '현재 polygon은 공식 PNG의 곡선 경계를 실제로 따라 딴 좌표가 아니라 시각 기준으로 보정한 초안입니다.',
  },
  {
    id: 'sky-picnic-numbered',
    label: '스카이피크닉 S-301~S-335',
    priority: 'P0',
    blockIds: suiteBlocks(301, 335).map((block) => blockId('SKY_PICNIC', block)),
    method: 'GENERATED_ROTATED_BOX',
    note: '현재 hit-area는 center/angle 기반 rotated box입니다. 공식 PNG의 실제 pink block 경계를 per-block polygon으로 재트레이싱해야 합니다.',
  },
  {
    id: 'five-table-numbered',
    label: '5층 테이블 501~535',
    priority: 'P0',
    blockIds: numberedBlocks(501, 535).map((block) => blockId('FIVE_TABLE', block)),
    method: 'OFFICIAL_IMAGE_PIXEL_TRACE',
    note: '공식 PNG의 회색 5층 테이블 블록 fill 경계를 기준으로 추출한 per-block polygon입니다. 전체 선택 재활성화 전 overlay 검수 대상입니다.',
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
    method: 'APPROXIMATE_MANUAL_POLYGON',
    note: '특수 구역은 번호 블록을 침범하지 않도록 줄인 초안이라 실제 색상 영역보다 작거나 위치가 다를 수 있습니다.',
  },
  {
    id: 'operator-only-cheering',
    label: 'K7석/원정응원석',
    priority: 'P2',
    blockIds: GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => section.id),
    method: 'OPERATOR_REQUIRED',
    note: '공식 PNG에서 직접 블록 경계를 확인할 수 없어 운영자 polygon 입력 전까지 hit-area를 만들지 않습니다.',
  },
];

const SOURCE_NOTE = 'KIA 타이거즈 공식 광주-기아 챔피언스필드 경기장 안내 이미지의 visible block 경계를 기준으로 둔 선택 hit-area입니다.';

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
  };
}

function orientedBox(cx: number, cy: number, width: number, height: number, angleDeg: number): Point[] {
  const radians = (angleDeg * Math.PI) / 180;
  const tx = Math.cos(radians);
  const ty = Math.sin(radians);
  const nx = -ty;
  const ny = tx;
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  return [
    [cx - tx * halfWidth - nx * halfHeight, cy - ty * halfWidth - ny * halfHeight],
    [cx + tx * halfWidth - nx * halfHeight, cy + ty * halfWidth - ny * halfHeight],
    [cx + tx * halfWidth + nx * halfHeight, cy + ty * halfWidth + ny * halfHeight],
    [cx - tx * halfWidth + nx * halfHeight, cy - ty * halfWidth + ny * halfHeight],
  ];
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

const INFIELD_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'k5-101': blockGeometry([[1062, 806], [1116, 822], [1108, 858], [1048, 842]], 1084, 828, '101'),
  'k5-102': blockGeometry([[1018, 803], [1062, 806], [1048, 842], [1000, 858]], 1040, 828, '102'),
  'k5-103': blockGeometry([[966, 808], [1018, 803], [1000, 858], [944, 877]], 990, 840, '103'),
  'k5-104': blockGeometry([[912, 816], [966, 808], [944, 877], [890, 895]], 940, 855, '104'),
  'k5-105': blockGeometry([[860, 826], [912, 816], [890, 895], [838, 912]], 887, 872, '105'),
  'k5-106': blockGeometry([[810, 836], [860, 826], [838, 912], [790, 928]], 835, 886, '106'),
  'k5-107': blockGeometry([[760, 846], [810, 836], [790, 928], [735, 944]], 780, 890, '107'),
  'k8-108': blockGeometry([[704, 834], [760, 846], [735, 944], [675, 946]], 724, 888, '108'),
  'k8-109': blockGeometry([[648, 837], [704, 834], [675, 946], [620, 944]], 670, 904, '109'),
  'k8-110': blockGeometry([[592, 832], [648, 837], [620, 944], [565, 936]], 614, 900, '110'),
  'k8-111': blockGeometry([[542, 826], [592, 832], [565, 936], [515, 925]], 558, 894, '111'),
  'k9-112': blockGeometry([[505, 823], [542, 826], [515, 925], [470, 900]], 520, 875, '112'),
  'k9-113': blockGeometry([[455, 790], [505, 823], [470, 900], [430, 865]], 465, 845, '113'),
  'k9-116': blockGeometry([[386, 694], [515, 694], [510, 755], [382, 752]], 432, 728, '116'),
  'k9-117': blockGeometry([[394, 640], [530, 648], [515, 694], [386, 694]], 445, 670, '117'),
  'k8-118': blockGeometry([[412, 606], [545, 616], [530, 648], [394, 640]], 450, 632, '118'),
  'k8-119': blockGeometry([[424, 558], [565, 572], [545, 616], [412, 606]], 458, 590, '119'),
  'k8-120': blockGeometry([[438, 510], [585, 526], [565, 572], [424, 558]], 468, 542, '120'),
  'k8-121': blockGeometry([[455, 462], [606, 480], [585, 526], [438, 510]], 485, 495, '121'),
  'k8-122': blockGeometry([[474, 414], [628, 436], [606, 480], [455, 462]], 508, 452, '122'),
  'k8-123': blockGeometry([[500, 360], [656, 390], [628, 436], [474, 414]], 532, 408, '123'),
  'k5-124': blockGeometry([[500, 360], [656, 390], [620, 450], [474, 414]], 560, 402, '124'),
  'k5-125': blockGeometry([[548, 276], [675, 328], [672, 368], [520, 320]], 585, 332, '125'),
  'k5-126': blockGeometry([[548, 276], [685, 292], [675, 360], [560, 330]], 620, 320, '126'),
  'k5-127': blockGeometry([[648, 238], [696, 260], [676, 328], [625, 310]], 668, 288, '127'),
};

const SKY_PICNIC_GEOMETRY_CENTERS: Array<[string, number, number, number]> = [
  ['S-301', 864, 950, -8],
  ['S-302', 840, 954, -7],
  ['S-303', 816, 957, -6],
  ['S-304', 792, 960, -5],
  ['S-305', 768, 962, -4],
  ['S-306', 744, 964, -3],
  ['S-307', 720, 965, -2],
  ['S-308', 696, 965, 0],
  ['S-309', 672, 964, 2],
  ['S-310', 648, 962, 4],
  ['S-311', 624, 958, 6],
  ['S-312', 600, 954, 8],
  ['S-313', 576, 949, 10],
  ['S-314', 552, 943, 12],
  ['S-315', 528, 935, 18],
  ['S-316', 504, 924, 30],
  ['S-317', 480, 906, 42],
  ['S-318', 444, 882, 58],
  ['S-319', 392, 844, 68],
  ['S-320', 360, 798, 78],
  ['S-321', 352, 748, 86],
  ['S-322', 350, 704, 90],
  ['S-323', 364, 666, 92],
  ['S-324', 368, 634, 96],
  ['S-325', 374, 604, 99],
  ['S-326', 380, 575, 101],
  ['S-327', 386, 548, 103],
  ['S-328', 392, 521, 105],
  ['S-329', 398, 495, 107],
  ['S-330', 404, 470, 109],
  ['S-331', 410, 445, 111],
  ['S-332', 418, 421, 113],
  ['S-333', 426, 397, 115],
  ['S-334', 436, 374, 117],
  ['S-335', 446, 352, 119],
];

function generatedGeometry(
  category: string,
  block: string,
  points: readonly Point[],
  labelX: number,
  labelY: number,
  labelFontSize = 10,
): [string, GwangjuImageGeometryDraft] {
  return [blockId(category, block), blockGeometry(points, labelX, labelY, block, labelFontSize)];
}

const SKY_PICNIC_GEOMETRIES = Object.fromEntries(
  SKY_PICNIC_GEOMETRY_CENTERS.map(([block, cx, cy, angle]) => generatedGeometry(
    'SKY_PICNIC',
    block,
    orientedBox(cx, cy, 25, 27, angle),
    cx,
    cy,
    5,
  )),
);

const FIVE_TABLE_TRACE_GEOMETRIES: Record<string, GwangjuImageGeometryDraft> = {
  'five-table-501': blockGeometry([[1077, 966], [1083, 962], [1114, 953], [1117, 966], [1101, 978], [1083, 987], [1077, 970]], 1097, 970, '501', 10),
  'five-table-502': blockGeometry([[1032, 976], [1063, 968], [1071, 967], [1076, 987], [1063, 997], [1054, 1001], [1040, 1007], [1037, 999]], 1054, 987, '502', 10),
  'five-table-503': blockGeometry([[985, 988], [1019, 979], [1024, 978], [1034, 1008], [1025, 1013], [1017, 1016], [1006, 1020], [997, 1023], [991, 1013], [985, 989]], 1010, 1001, '503', 10),
  'five-table-504': blockGeometry([[938, 999], [977, 989], [981, 993], [988, 1022], [981, 1028], [971, 1031], [964, 1033], [953, 1036], [947, 1037], [938, 1002]], 963, 1013, '504', 10),
  'five-table-505': blockGeometry([[895, 1009], [931, 1000], [942, 1037], [906, 1048], [901, 1036], [895, 1010]], 919, 1024, '505', 10),
  'five-table-506': blockGeometry([[847, 1018], [888, 1010], [893, 1025], [898, 1047], [884, 1054], [866, 1058], [861, 1059], [855, 1059], [848, 1024]], 873, 1035, '506', 10),
  'five-table-507': blockGeometry([[801, 1026], [830, 1021], [837, 1020], [841, 1024], [846, 1048], [848, 1058], [806, 1067], [803, 1062], [801, 1035]], 825, 1044, '507', 10),
  'five-table-508': blockGeometry([[752, 1065], [754, 1034], [755, 1028], [770, 1027], [794, 1026], [795, 1032], [798, 1056], [799, 1065], [787, 1069], [752, 1069]], 776, 1048, '508', 10),
  'five-table-509': blockGeometry([[700, 1066], [705, 1034], [706, 1028], [715, 1024], [727, 1025], [738, 1026], [747, 1027], [747, 1070], [727, 1070], [709, 1069], [700, 1068]], 724, 1047, '509', 10),
  'five-table-510': blockGeometry([[653, 1063], [654, 1057], [661, 1016], [699, 1022], [702, 1032], [697, 1064], [685, 1067], [675, 1066], [658, 1064]], 678, 1042, '510', 10),
  'five-table-511': blockGeometry([[605, 1055], [613, 1015], [618, 1012], [650, 1016], [656, 1017], [652, 1041], [649, 1057], [648, 1062], [621, 1059], [609, 1057]], 631, 1038, '511', 10),
  'five-table-512': blockGeometry([[558, 1043], [560, 1032], [564, 1012], [573, 1005], [587, 1007], [600, 1009], [606, 1010], [605, 1030], [601, 1050], [595, 1054], [572, 1050], [561, 1048]], 583, 1030, '512', 10),
  'five-table-513': blockGeometry([[502, 1030], [511, 1007], [516, 995], [546, 999], [551, 1001], [558, 1009], [552, 1044], [543, 1043], [527, 1039], [513, 1035], [503, 1032]], 530, 1018, '513', 10),
  'five-table-514': blockGeometry([[458, 1011], [466, 994], [476, 974], [484, 976], [505, 986], [511, 989], [508, 1001], [499, 1023], [496, 1028], [491, 1027], [486, 1025], [477, 1021], [459, 1012]], 485, 1001, '514', 10),
  'five-table-515': blockGeometry([[417, 987], [420, 982], [440, 954], [461, 962], [471, 969], [454, 1009], [443, 1004], [435, 999]], 445, 980, '515', 10),
  'five-table-516': blockGeometry([[381, 956], [406, 930], [413, 923], [421, 930], [439, 946], [436, 953], [431, 960], [415, 982], [409, 981], [399, 974], [389, 966], [381, 958]], 411, 953, '516', 10),
  'five-table-517': blockGeometry([[348, 922], [358, 914], [382, 895], [393, 901], [405, 914], [409, 919], [384, 946], [376, 954], [370, 948], [352, 928], [348, 923]], 379, 924, '517', 10),
  'five-table-518': blockGeometry([[319, 886], [347, 869], [361, 861], [381, 886], [359, 908], [346, 918], [340, 915], [333, 906], [321, 890]], 351, 890, '518', 10),
  'five-table-519': blockGeometry([[297, 845], [321, 835], [341, 827], [347, 832], [358, 853], [355, 860], [343, 867], [317, 882], [303, 858], [297, 846]], 329, 855, '519', 10),
  'five-table-520': blockGeometry([[281, 802], [286, 800], [317, 792], [329, 789], [336, 805], [340, 816], [341, 822], [327, 828], [310, 835], [295, 841], [281, 803]], 311, 815, '520', 10),
  'five-table-521': blockGeometry([[272, 758], [280, 757], [318, 753], [323, 757], [325, 766], [328, 780], [329, 785], [319, 788], [281, 798], [278, 793], [272, 762]], 301, 776, '521', 10),
  'five-table-522': blockGeometry([[269, 713], [295, 713], [319, 714], [320, 724], [322, 749], [273, 754], [270, 747], [269, 715]], 296, 734, '522', 10),
  'five-table-523': blockGeometry([[270, 700], [271, 689], [273, 668], [302, 672], [313, 674], [318, 675], [322, 681], [320, 703], [319, 709], [283, 709], [270, 708]], 296, 689, '523', 10),
  'five-table-524': blockGeometry([[274, 658], [275, 652], [279, 630], [280, 625], [286, 623], [293, 624], [312, 627], [324, 629], [327, 635], [325, 650], [324, 657], [323, 663], [318, 671], [275, 664]], 301, 647, '524', 10),
  'five-table-525': blockGeometry([[281, 617], [287, 583], [288, 578], [312, 581], [329, 584], [334, 585], [329, 621], [328, 626], [285, 619]], 308, 602, '525', 10),
  'five-table-526': blockGeometry([[289, 569], [290, 563], [292, 553], [295, 539], [297, 533], [340, 541], [335, 581], [328, 580], [293, 574]], 315, 557, '526', 10),
  'five-table-527': blockGeometry([[298, 529], [303, 509], [307, 495], [310, 486], [347, 496], [352, 498], [343, 536], [301, 530]], 325, 512, '527', 10),
  'five-table-528': blockGeometry([[312, 480], [314, 474], [317, 466], [323, 451], [326, 444], [351, 450], [367, 457], [365, 464], [361, 475], [354, 494], [316, 484]], 340, 468, '528', 10),
  'five-table-529': blockGeometry([[330, 435], [333, 428], [345, 404], [348, 399], [356, 399], [365, 404], [381, 413], [388, 417], [382, 429], [370, 452], [330, 437]], 359, 425, '529', 10),
  'five-table-530': blockGeometry([[352, 392], [368, 368], [375, 358], [408, 378], [409, 385], [397, 404], [391, 413], [359, 397], [354, 394]], 382, 386, '530', 10),
  'five-table-531': blockGeometry([[379, 353], [400, 323], [407, 323], [417, 329], [430, 337], [436, 341], [420, 367], [414, 376], [405, 371], [386, 359], [380, 355]], 408, 349, '531', 10),
  'five-table-532': blockGeometry([[405, 315], [422, 292], [426, 287], [430, 283], [444, 291], [461, 301], [444, 331], [439, 337], [425, 329], [407, 318]], 434, 310, '532', 10),
  'five-table-533': blockGeometry([[433, 279], [441, 269], [456, 251], [461, 248], [471, 254], [489, 265], [470, 292], [465, 299], [441, 285], [436, 282]], 461, 274, '533', 10),
  'five-table-534': blockGeometry([[463, 244], [492, 214], [498, 216], [513, 225], [492, 260], [484, 257], [466, 246]], 490, 238, '534', 10),
  'five-table-535': blockGeometry([[497, 210], [506, 202], [518, 192], [528, 184], [541, 188], [546, 192], [542, 197], [522, 221], [516, 222], [509, 218], [497, 211]], 522, 203, '535', 10),
};

export const GWANGJU_IMAGE_GEOMETRY_DRAFTS: Record<string, GwangjuImageGeometryDraft> = {
  ...INFIELD_GEOMETRIES,
  ...SKY_PICNIC_GEOMETRIES,
  ...FIVE_TABLE_TRACE_GEOMETRIES,
  'champion-seats': blockGeometry([[450, 730], [555, 710], [625, 795], [560, 850], [475, 815]], 535, 785, 'A', 13),
  'central-table-seats': blockGeometry([[365, 785], [405, 805], [392, 840], [358, 820]], 380, 812, 'B', 13),
  'disabled-seats-center': blockGeometry([[366, 724], [410, 708], [428, 754], [382, 772]], 394, 744, 'C', 13),
  'first-surprise-seats': blockGeometry([[760, 790], [955, 790], [890, 852], [742, 870]], 850, 808, 'G', 13),
  'third-surprise-seats': blockGeometry([[606, 372], [695, 302], [666, 462], [602, 514]], 652, 415, 'G', 13),
  'first-family-seats': blockGeometry([[1090, 830], [1165, 852], [1084, 918], [1030, 890]], 1095, 865, 'H', 13),
  'third-family-seats': blockGeometry([[540, 168], [642, 130], [704, 205], [650, 285], [584, 270], [512, 242]], 626, 236, 'H', 13),
  'first-wheelchair-seats': blockGeometry([[875, 890], [1012, 868], [1028, 904], [890, 936]], 945, 905, 'I', 13),
  'third-wheelchair-seats': blockGeometry([[456, 286], [540, 326], [520, 366], [430, 328]], 486, 326, 'I', 13),
  'party-seats-first': blockGeometry([[720, 900], [984, 878], [1002, 912], [736, 932]], 840, 913, 'J', 13),
  'party-seats-third': blockGeometry([[455, 340], [530, 290], [545, 325], [470, 390]], 500, 340, 'J', 13),
  'skybox-seats': blockGeometry([[300, 860], [334, 860], [342, 892], [306, 890]], 322, 876, 'K', 13),
  'outfield-left-seats': blockGeometry([[690, 130], [990, 100], [1245, 185], [1218, 335], [1118, 385], [982, 278], [712, 208]], 1000, 236, 'O', 13),
  'outfield-right-seats': blockGeometry([[1168, 382], [1308, 320], [1368, 502], [1312, 790], [1160, 775], [1224, 620]], 1245, 560, 'O', 13),
  'bleachers-table-left': blockGeometry([[710, 104], [1000, 104], [985, 134], [710, 150]], 850, 122, 'P', 13),
  'bleachers-table-right': blockGeometry([[1326, 466], [1352, 460], [1306, 736], [1280, 720]], 1316, 596, 'P', 13),
};

const GWANGJU_IMAGE_GEOMETRY: Record<string, GwangjuImageGeometry> = Object.fromEntries(
  Object.entries(GWANGJU_IMAGE_GEOMETRY_DRAFTS).map(([id, geometry]) => [
    id,
    {
      ...geometry,
      shortLabel: geometry.shortLabel ?? id,
    },
  ]),
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

function blockDefinition(category: string, block: string, level: GwangjuLevel, side: GwangjuSide): GwangjuBlockDefinition {
  return {
    id: blockId(category, block),
    level,
    category,
    name: categoryNameSuffix(block, category),
    block,
    officialBlocks: [block],
    side,
    fanRole: 'NEUTRAL',
  };
}

const NUMBERED_BLOCKS = [
  ...numberedBlocks(101, 107).map((block) => blockDefinition('K5', block, '1F', infieldSide(block))),
  ...numberedBlocks(108, 111).map((block) => blockDefinition('K8', block, '1F', infieldSide(block))),
  ...['112', '113', '116', '117'].map((block) => blockDefinition('K9', block, '1F', infieldSide(block))),
  ...numberedBlocks(118, 123).map((block) => blockDefinition('K8', block, '1F', infieldSide(block))),
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
