// Suwon kt wiz Park seat data. Keep this static: do not add runtime crawling or web-search data collection.

export type SuwonSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type SuwonFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type SuwonLevel = '1F' | '2F' | '3F' | '4F' | '5F' | 'OUTFIELD';
export type SuwonGeometryTraceStatus = 'OFFICIAL_IMAGE_TRACED' | 'DRAFT_APPROXIMATE';
export type SuwonSeatMapPoint = [number, number];

export interface SuwonImageGeometry {
  d: string;
  labelX: number;
  labelY: number;
  labelRotate?: number;
  labelFontSize?: number;
  shortLabel: string;
}

export interface SuwonBlock {
  id: string;
  level: SuwonLevel;
  category: string;
  name: string;
  block: string;
  officialBlocks: string[];
  side: SuwonSide;
  fanRole: SuwonFanRole;
  sourceNote: string;
  seatViewSections: string[];
  imageGeometry: SuwonImageGeometry;
  hitGeometry: SuwonImageGeometry;
  hitPriority: number;
  traceStatus: SuwonGeometryTraceStatus;
}

export interface SuwonCategory {
  label: string;
  light: string;
  dark: string;
  textLight: string;
  textDark: string;
}

type GeometryDraft = Omit<SuwonImageGeometry, 'shortLabel'> & { shortLabel?: string };
type BlockDefinition = Omit<SuwonBlock, 'imageGeometry' | 'hitGeometry' | 'hitPriority' | 'traceStatus'>;
type Point = SuwonSeatMapPoint;

export const SUWON_SEATMAP_IMAGE = {
  imagePath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026.jpg',
  imageWidth: 4290,
  imageHeight: 9679,
  sourceLabel: 'kt wiz 공식 좌석 안내 2026 좌석도(SEAT_MAP_PC, 2026-03-26)',
  sourceUrl: 'https://www.ktwiz.co.kr/ticket/seatmap',
  assetStatus: 'OFFICIAL' as const,
  requiredAssetFileName: 'suwon-kt-seatmap-official-2026.jpg',
  requiredAssetPath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026.jpg',
};

export const SUWON_SEATMAP_VIEWPORT = {
  cropY: 1000,
  cropHeight: 4550,
};

export const SUWON_CATEGORIES: Record<string, SuwonCategory> = {
  GENIE: { label: '지니존/BC카드존', light: '#31343B', dark: '#4B5563', textLight: '#111827', textDark: '#F8FAFC' },
  CENTRAL: { label: '중앙지정석', light: '#8657A5', dark: '#A779C2', textLight: '#4C1D95', textDark: '#F3E8FF' },
  HOME_CHEERING: { label: '1루 응원지정석', light: '#D71920', dark: '#F0444B', textLight: '#7F1D1D', textDark: '#FEE2E2' },
  AWAY_CHEERING: { label: '3루 응원지정석', light: '#C7253A', dark: '#E64B5D', textLight: '#7F1D1D', textDark: '#FFE4E6' },
  INFIELD_RED: { label: '내야지정석', light: '#B91C2B', dark: '#D8424C', textLight: '#7F1D1D', textDark: '#FEE2E2' },
  INFIELD_BLUE: { label: '내야일반석', light: '#52B7CF', dark: '#6BD0E3', textLight: '#164E63', textDark: '#E0F2FE' },
  HIGHFIVE: { label: '하이파이브존', light: '#00A5A8', dark: '#27C3C5', textLight: '#134E4A', textDark: '#CCFBF1' },
  SKYBOX: { label: '스카이박스', light: '#63C8DC', dark: '#7BD9E7', textLight: '#164E63', textDark: '#E0F2FE' },
  SKYZONE: { label: '스카이존', light: '#172142', dark: '#2E3C66', textLight: '#111827', textDark: '#E0E7FF' },
  OUTFIELD_GRASS: { label: '외야 잔디 자유석', light: '#B8D776', dark: '#C7E38B', textLight: '#365314', textDark: '#ECFCCB' },
  OUTFIELD_TABLE: { label: '외야테이블석', light: '#E78AAE', dark: '#F0A3C0', textLight: '#831843', textDark: '#FCE7F3' },
  K_LIVE: { label: 'K-라이브존', light: '#16833A', dark: '#36A65A', textLight: '#14532D', textDark: '#DCFCE7' },
  PUB: { label: '펍/그린존', light: '#666A73', dark: '#818793', textLight: '#1F2937', textDark: '#F1F5F9' },
  KIDS: { label: '키즈랜드 캠핑존', light: '#17A673', dark: '#34C38F', textLight: '#14532D', textDark: '#DCFCE7' },
  ACCESSIBLE: { label: '휠체어석', light: '#FACC15', dark: '#FDE047', textLight: '#713F12', textDark: '#FEF3C7' },
};

export const SUWON_CATEGORY_GROUPS = [
  { id: 'all', label: '전체', cats: null },
  { id: 'cheer', label: '응원석', cats: ['HOME_CHEERING', 'AWAY_CHEERING'] },
  { id: 'infield', label: '내야석', cats: ['GENIE', 'CENTRAL', 'INFIELD_RED', 'INFIELD_BLUE', 'HIGHFIVE'] },
  { id: 'sky', label: '스카이', cats: ['SKYBOX', 'SKYZONE'] },
  { id: 'outfield', label: '외야/특수석', cats: ['OUTFIELD_GRASS', 'OUTFIELD_TABLE', 'K_LIVE', 'PUB', 'KIDS'] },
  { id: 'accessible', label: '휠체어석', cats: ['ACCESSIBLE'] },
] as const;

export const SUWON_VIEW_INFO = {
  default: { photos: 0, rating: null },
};

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function toId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '');
}

function polygonPath(points: Point[]): string {
  const [first, ...rest] = points;
  return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
}

function polygonGeometry(
  shortLabel: string,
  points: Point[],
  labelX: number,
  labelY: number,
  labelRotate = 0,
  labelFontSize = 54,
): GeometryDraft {
  return { d: polygonPath(points), labelX, labelY, labelRotate, labelFontSize, shortLabel };
}

function rotatedRectPoints(cx: number, cy: number, width: number, height: number, angleDeg: number): Point[] {
  const radians = angleDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ].map(([x, y]) => [
    round(cx + (x * cos) - (y * sin)),
    round(cy + (x * sin) + (y * cos)),
  ]);
}

function rectGeometry(shortLabel: string, cx: number, cy: number, width: number, height: number, angle = 0, labelFontSize = 54): GeometryDraft {
  return polygonGeometry(shortLabel, rotatedRectPoints(cx, cy, width, height, angle), cx, cy, angle, labelFontSize);
}

function normalize(vector: Point): Point {
  const length = Math.hypot(vector[0], vector[1]) || 1;
  return [vector[0] / length, vector[1] / length];
}

function rowCellGeometry(shortLabel: string, previous: Point | null, center: Point, next: Point | null, depth: number, labelRotate: number): GeometryDraft {
  const tangentSource: Point = previous && next
    ? [next[0] - previous[0], next[1] - previous[1]]
    : next
      ? [next[0] - center[0], next[1] - center[1]]
      : previous
        ? [center[0] - previous[0], center[1] - previous[1]]
        : [1, 0];
  const tangent = normalize(tangentSource);
  const normal: Point = [-tangent[1], tangent[0]];
  const startDistance = previous ? Math.hypot(center[0] - previous[0], center[1] - previous[1]) / 2 : depth / 2;
  const endDistance = next ? Math.hypot(next[0] - center[0], next[1] - center[1]) / 2 : depth / 2;
  const halfDepth = depth / 2;
  const start: Point = [center[0] - tangent[0] * startDistance, center[1] - tangent[1] * startDistance];
  const end: Point = [center[0] + tangent[0] * endDistance, center[1] + tangent[1] * endDistance];
  return polygonGeometry(shortLabel, [
    [round(start[0] + normal[0] * halfDepth), round(start[1] + normal[1] * halfDepth)],
    [round(end[0] + normal[0] * halfDepth), round(end[1] + normal[1] * halfDepth)],
    [round(end[0] - normal[0] * halfDepth), round(end[1] - normal[1] * halfDepth)],
    [round(start[0] - normal[0] * halfDepth), round(start[1] - normal[1] * halfDepth)],
  ], center[0], center[1], labelRotate);
}

function rowGeometries(blocks: Array<[string, number, number, number?]>, depth: number): Record<string, GeometryDraft> {
  return Object.fromEntries(blocks.map(([block, cx, cy, explicitAngle], index) => {
    const previous = blocks[index - 1] ? [blocks[index - 1][1], blocks[index - 1][2]] as Point : null;
    const center: Point = [cx, cy];
    const next = blocks[index + 1] ? [blocks[index + 1][1], blocks[index + 1][2]] as Point : null;
    const tangentSource: Point = previous && next
      ? [next[0] - previous[0], next[1] - previous[1]]
      : next
        ? [next[0] - center[0], next[1] - center[1]]
        : previous
          ? [center[0] - previous[0], center[1] - previous[1]]
          : [1, 0];
    const labelRotate = explicitAngle ?? round(Math.atan2(tangentSource[1], tangentSource[0]) * 180 / Math.PI);
    return [`suwon-${toId(block)}`, rowCellGeometry(block, previous, center, next, depth, labelRotate)];
  }));
}

const IMAGE_GEOMETRY: Record<string, GeometryDraft> = {
  ...rowGeometries([
    ['101', 3055, 2510], ['102', 2995, 2605], ['103', 2940, 2695], ['104', 2895, 2785],
    ['105', 2840, 2875], ['106', 2795, 2965], ['107', 2745, 3055], ['108', 2690, 3140],
    ['109', 2640, 3225], ['110', 2585, 3310], ['111', 2530, 3390], ['112', 2485, 3485],
    ['113', 2435, 3575], ['114', 2370, 3640, 24], ['115', 2325, 3720, 24],
  ], 118),
  'suwon-116': rectGeometry('116', 2100, 3735, 190, 90, 12),
  'suwon-117': rectGeometry('117', 2005, 3765, 230, 94),
  'suwon-118': rectGeometry('118', 1885, 3735, 190, 90, -12),
  ...rowGeometries([
    ['119', 1650, 3690], ['120', 1605, 3605], ['121', 1565, 3515], ['122', 1530, 3435],
    ['123', 1475, 3400], ['124', 1510, 3300], ['125', 1450, 3210], ['126', 1400, 3120],
    ['127', 1350, 3040], ['128', 1295, 2970], ['129', 1255, 2885], ['130', 1210, 2800],
    ['131', 1165, 2710], ['132', 1120, 2615], ['133', 1040, 2515],
  ], 118),
  ...rowGeometries([
    ['201', 3190, 2585], ['202', 3105, 2695], ['203', 3045, 2790], ['204', 2990, 2875],
    ['205', 2930, 2965], ['206', 2870, 3035], ['207', 2820, 3120], ['208', 2765, 3210],
    ['209', 2705, 3300], ['210', 2655, 3385], ['211', 2595, 3480, 24], ['212', 2545, 3585, 24],
    ['213', 2485, 3675, 24], ['214', 2415, 3760, 24], ['215', 2355, 3845, 24],
  ], 132),
  'suwon-216': rectGeometry('216', 2220, 3890, 260, 135, 12),
  'suwon-217': rectGeometry('217', 2000, 3960, 290, 140),
  'suwon-218': rectGeometry('218', 1765, 3905, 260, 135, -12),
  ...rowGeometries([
    ['219', 1620, 3840], ['220', 1560, 3745], ['221', 1510, 3665], ['222', 1455, 3580],
    ['223', 1405, 3485], ['224', 1360, 3395], ['225', 1310, 3300], ['226', 1260, 3205],
    ['227', 1210, 3115], ['228', 1165, 3020], ['229', 1110, 2930], ['230', 1075, 2860],
    ['231', 1040, 2780], ['232', 1005, 2690], ['233', 930, 2600],
  ], 132),
  'suwon-301': polygonGeometry('301', [[3090, 2864], [3225, 2930], [3162, 3026], [3028, 2958]], 3190, 2950, 24),
  'suwon-302': polygonGeometry('302', [[3036, 2980], [3178, 3052], [3112, 3160], [2966, 3086]], 3130, 3050, 24),
  'suwon-303': polygonGeometry('303', [[2974, 3100], [3122, 3174], [3052, 3285], [2898, 3210]], 3070, 3150, 24),
  'suwon-304': polygonGeometry('304', [[2860, 3168], [3010, 3240], [2940, 3354], [2790, 3280]], 2970, 3235, 24),
  'suwon-305': polygonGeometry('305', [[2810, 3264], [2960, 3338], [2890, 3452], [2738, 3376]], 2920, 3330, 24),
  'suwon-306': polygonGeometry('306', [[2746, 3376], [2894, 3450], [2824, 3564], [2674, 3488]], 2845, 3440, 24),
  'suwon-307': polygonGeometry('307', [[2684, 3488], [2834, 3562], [2762, 3676], [2610, 3600]], 2745, 3570, 24),
  'suwon-308': polygonGeometry('308', [[2622, 3600], [2772, 3674], [2700, 3788], [2548, 3712]], 2680, 3685, 24),
  'suwon-309': polygonGeometry('309', [[2575, 3710], [2730, 3787], [2655, 3898], [2500, 3822]], 2670, 3765, 24),
  'suwon-310': polygonGeometry('310', [[2510, 3810], [2660, 3885], [2588, 4000], [2438, 3922]], 2620, 3880, 24),
  'suwon-311': polygonGeometry('311', [[2445, 3780], [2590, 3850], [2518, 3990], [2370, 3920]], 2540, 3840, 24),
  'suwon-312': polygonGeometry('312', [[2480, 3880], [2640, 3960], [2562, 4100], [2400, 4020]], 2570, 3970, 24),
  'suwon-313': rectGeometry('313', 2190, 4085, 260, 130, 18),
  'suwon-314': rectGeometry('314', 2010, 4190, 290, 130),
  'suwon-315': rectGeometry('315', 1815, 4180, 290, 130),
  'suwon-316': rectGeometry('316', 1620, 4080, 260, 130, -18),
  'suwon-317': polygonGeometry('317', [[1406, 3914], [1520, 3830], [1586, 3917], [1502, 4007], [1451, 3974]], 1445, 3945, -24),
  'suwon-318': polygonGeometry('318', [[1355, 3824], [1469, 3743], [1508, 3806], [1505, 3821], [1403, 3893]], 1360, 3830, -24),
  'suwon-319': polygonGeometry('319', [[1262, 3718], [1382, 3634], [1454, 3724], [1332, 3812]], 1285, 3745, -24),
  'suwon-320': polygonGeometry('320', [[1206, 3628], [1326, 3544], [1398, 3634], [1276, 3720]], 1300, 3635, -24),
  'suwon-321': polygonGeometry('321', [[1150, 3540], [1270, 3456], [1342, 3548], [1222, 3634]], 1245, 3550, -24),
  'suwon-322': polygonGeometry('322', [[1094, 3450], [1214, 3366], [1288, 3458], [1166, 3546]], 1190, 3460, -24),
  'suwon-323': polygonGeometry('323', [[1038, 3362], [1160, 3276], [1234, 3368], [1110, 3456]], 1135, 3370, -24),
  'suwon-324': polygonGeometry('324', [[982, 3272], [1104, 3188], [1178, 3280], [1054, 3368]], 1080, 3280, -24),
  'suwon-325': polygonGeometry('325', [[928, 3182], [1050, 3098], [1124, 3190], [1000, 3278]], 970, 3215, -24),
  'suwon-326': polygonGeometry('326', [[874, 3092], [996, 3008], [1070, 3100], [946, 3188]], 940, 3120, -24),
  'suwon-327': polygonGeometry('327', [[820, 3002], [942, 2918], [1018, 3010], [892, 3100]], 900, 3035, -24),
  'suwon-328': polygonGeometry('328', [[766, 2912], [888, 2828], [964, 2920], [838, 3010]], 860, 2930, -24),
  ...rowGeometries([
    ['401', 3255, 3590, 24], ['402', 3195, 3730, 24], ['403', 3140, 3870, 24], ['404', 3080, 4015, 24],
    ['405', 3020, 4150, 24], ['406', 2940, 4290, 24], ['407', 2860, 4410, 24], ['408', 2760, 4530, 24],
    ['409', 2675, 4620, 18], ['410', 2525, 4690, 10], ['411', 2360, 4760, 5], ['412', 2160, 4800, 2],
    ['413', 2000, 4810], ['414', 1850, 4780, -2], ['415', 1700, 4745, -5], ['416', 1570, 4680, -10],
    ['417', 1450, 4600, -18], ['418', 1260, 4500, -24], ['419', 1060, 4380, -24], ['420', 980, 4280, -24],
    ['421', 920, 4180, -24], ['422', 855, 4080, -24], ['423', 800, 3985, -24], ['424', 750, 3895, -24],
    ['425', 700, 3795, -24], ['426', 650, 3700, -24], ['427', 620, 3600, -24], ['428', 570, 3500, -24],
    ['429', 520, 3400, -24], ['430', 470, 3300, -24], ['431', 420, 3200, -24], ['432', 370, 3100, -24],
  ], 145),
  ...Object.fromEntries(Array.from({ length: 35 }, (_, index) => {
    const block = `SB${index + 1}`;
    const visibleBlock = String(index + 1).padStart(2, '0');
    const rightSide = index < 23;
    const x = rightSide ? 2875 + (index % 6) * 78 : 1040 - ((index - 23) % 6) * 70;
    const y = rightSide ? 1995 + Math.floor(index / 6) * 210 : 3760 + Math.floor((index - 23) / 6) * 210;
    return [`suwon-${toId(block)}`, rectGeometry(visibleBlock, x, y, 130, 92, rightSide ? 18 : -18)];
  })),
  'suwon-genie': polygonGeometry('지니존', [[1810, 3630], [2195, 3630], [2260, 3795], [2145, 3865], [1875, 3865], [1755, 3795]], 2005, 3830, 0, 60),
  'suwon-lf-grass': polygonGeometry('잔디', [[780, 2220], [1250, 1900], [1455, 1825], [1500, 2070], [950, 2380]], 1200, 2075, -14),
  'suwon-rf-grass': polygonGeometry('잔디', [[1840, 1870], [2180, 1910], [2860, 2225], [2700, 2380], [1800, 2080]], 2360, 2080, 12),
  'suwon-7pub': polygonGeometry('7 PUB', [[1520, 1825], [1830, 1820], [1825, 2055], [1540, 2060]], 1685, 1950),
  'suwon-green': polygonGeometry('그린존', [[2800, 2120], [3110, 2310], [3030, 2410], [2760, 2210]], 2935, 2255, 52),
  'suwon-501-508': polygonGeometry('테이블', [[2665, 1510], [3215, 1810], [3335, 1965], [3210, 2110], [2925, 1960], [2730, 1860], [2555, 1760]], 3120, 1835, 24),
  'suwon-k-live': polygonGeometry('K-LIVE', [[2590, 1780], [2910, 1965], [2805, 2070], [2485, 1885]], 2670, 1940, 25),
  'suwon-hite-pub': polygonGeometry('펍', [[3180, 2145], [3385, 2380], [3290, 2470], [3150, 2260]], 3250, 2320, 42),
  'suwon-kids-camp': polygonGeometry('캠핑', [[3310, 2055], [3400, 2130], [3470, 2240], [3520, 2390], [3480, 2490], [3315, 2460], [3345, 2355], [3320, 2250], [3245, 2135]], 3400, 2295, -74),
  'suwon-wiz-garden': polygonGeometry('가든', [[3560, 2350], [3715, 2290], [3780, 2590], [3720, 3005], [3600, 3200], [3360, 3200], [3500, 2810], [3540, 2520]], 3630, 2750, -74),
  'suwon-3b-highfive': polygonGeometry('하이파이브', [[1510, 2870], [1640, 2800], [1780, 3260], [1640, 3290]], 1650, 3045, -66),
  'suwon-1b-highfive': polygonGeometry('하이파이브', [[2330, 2840], [2460, 2920], [2225, 3250], [2115, 3195]], 2300, 3065, 64),
  'suwon-wheel-center': rectGeometry('휠체어', 2000, 4295, 260, 95),
  'suwon-wheel-1b': rectGeometry('휠체어', 2650, 4185, 160, 90),
  'suwon-wheel-3b': rectGeometry('휠체어', 1770, 4190, 160, 90),
};

const TRACED_IDS = new Set([
  ...numberedBlocks(301, 328).map((block) => `suwon-${block}`),
]);

function completeGeometry(id: string, geometry: GeometryDraft): SuwonImageGeometry {
  return {
    ...geometry,
    labelFontSize: geometry.labelFontSize ?? 54,
    shortLabel: geometry.shortLabel ?? id.replace('suwon-', '').toUpperCase(),
  };
}

function priorityFor(id: string): number {
  const numericBlock = id.match(/^suwon-(\d+)$/)?.[1];
  if (numericBlock) {
    const blockNumber = Number(numericBlock);
    if (blockNumber >= 401) return 50;
    if (blockNumber >= 301) return 72;
    if (blockNumber >= 201) return 68;
    return 70;
  }
  if (id.includes('wheel') || id.includes('highfive')) return 90;
  if (id === 'suwon-genie') return 92;
  if (id.includes('grass')) return 10;
  if (/^suwon-sb/.test(id)) return 64;
  return 30;
}

function aliases(name: string, block: string, officialBlocks: string[]): string[] {
  return Array.from(new Set([
    block,
    `${block}블록`,
    ...officialBlocks,
    ...officialBlocks.map((officialBlock) => `${officialBlock}블록`),
    `수원 ${block}`,
    `KT ${block}`,
    `kt wiz ${block}`,
    name,
  ]));
}

function blockDefinition(input: Omit<BlockDefinition, 'sourceNote' | 'seatViewSections'> & Partial<Pick<BlockDefinition, 'sourceNote' | 'seatViewSections'>>): BlockDefinition {
  const officialBlocks = input.officialBlocks.length > 0 ? input.officialBlocks : [input.block];
  return {
    ...input,
    officialBlocks,
    sourceNote: input.sourceNote ?? 'kt wiz 공식 좌석 안내 이미지 기준 정적 좌표입니다.',
    seatViewSections: input.seatViewSections ?? aliases(input.name, input.block, officialBlocks),
  };
}

function numberDefinitions(blocks: string[], level: SuwonLevel, category: string | ((block: string) => string), side: SuwonSide, fanRole: SuwonFanRole): BlockDefinition[] {
  return blocks.map((block) => {
    const blockCategory = typeof category === 'function' ? category(block) : category;
    return blockDefinition({
      id: `suwon-${block}`,
      level,
      category: blockCategory,
      name: `${block} ${SUWON_CATEGORIES[blockCategory].label}`,
      block,
      officialBlocks: [block],
      side,
      fanRole,
    });
  });
}

function firstBaseCategory(block: string): string {
  return ['107', '108', '109', '110', '207', '208', '209', '210'].includes(block) ? 'HOME_CHEERING' : 'INFIELD_RED';
}

function thirdBaseCategory(block: string): string {
  return ['127', '128', '129', '130', '227', '228', '229', '230'].includes(block) ? 'AWAY_CHEERING' : 'INFIELD_RED';
}

function skyboxDefinitions(): BlockDefinition[] {
  return Array.from({ length: 35 }, (_, index) => {
    const block = `SB${index + 1}`;
    const visibleBlock = String(index + 1).padStart(2, '0');
    return blockDefinition({
      id: `suwon-${toId(block)}`,
      level: '4F',
      category: 'SKYBOX',
      name: `${visibleBlock} 스카이박스`,
      block,
      officialBlocks: [`스카이박스 ${visibleBlock}`],
      side: index < 23 ? 'FIRST_BASE' : 'THIRD_BASE',
      fanRole: 'NEUTRAL',
    });
  });
}

const definitions: BlockDefinition[] = [
  ...numberDefinitions(numberedBlocks(101, 113), '1F', firstBaseCategory, 'FIRST_BASE', 'HOME'),
  ...numberDefinitions(numberedBlocks(114, 123), '1F', 'CENTRAL', 'CENTER', 'NEUTRAL'),
  ...numberDefinitions(numberedBlocks(124, 133), '1F', thirdBaseCategory, 'THIRD_BASE', 'AWAY'),
  ...numberDefinitions(numberedBlocks(201, 213), '2F', firstBaseCategory, 'FIRST_BASE', 'HOME'),
  ...numberDefinitions(numberedBlocks(214, 223), '2F', 'CENTRAL', 'CENTER', 'NEUTRAL'),
  ...numberDefinitions(numberedBlocks(224, 233), '2F', thirdBaseCategory, 'THIRD_BASE', 'AWAY'),
  ...numberDefinitions(numberedBlocks(301, 313), '3F', 'INFIELD_BLUE', 'FIRST_BASE', 'HOME'),
  ...numberDefinitions(numberedBlocks(314, 319), '3F', 'CENTRAL', 'CENTER', 'NEUTRAL'),
  ...numberDefinitions(numberedBlocks(320, 328), '3F', 'INFIELD_BLUE', 'THIRD_BASE', 'AWAY'),
  ...numberDefinitions(numberedBlocks(401, 432), '5F', 'SKYZONE', 'OUTFIELD', 'NEUTRAL'),
  ...skyboxDefinitions(),
  blockDefinition({ id: 'suwon-genie', level: '1F', category: 'GENIE', name: '지니존/BC카드존', block: 'GENIE', officialBlocks: ['지니존', 'BC카드존'], side: 'CENTER', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-lf-grass', level: 'OUTFIELD', category: 'OUTFIELD_GRASS', name: '3루 외야 잔디 자유석', block: 'LF-GRASS', officialBlocks: ['3루 외야 잔디 자유석'], side: 'OUTFIELD', fanRole: 'AWAY' }),
  blockDefinition({ id: 'suwon-rf-grass', level: 'OUTFIELD', category: 'OUTFIELD_GRASS', name: '1루 외야 잔디 자유석', block: 'RF-GRASS', officialBlocks: ['1루 외야 잔디 자유석'], side: 'OUTFIELD', fanRole: 'HOME' }),
  blockDefinition({ id: 'suwon-7pub', level: 'OUTFIELD', category: 'PUB', name: '7 PUB', block: '7PUB', officialBlocks: ['7 PUB'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-green', level: 'OUTFIELD', category: 'PUB', name: '그린존', block: 'GREEN', officialBlocks: ['그린존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-501-508', level: 'OUTFIELD', category: 'OUTFIELD_TABLE', name: '외야테이블석', block: '501-508', officialBlocks: numberedBlocks(501, 508), side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-k-live', level: 'OUTFIELD', category: 'K_LIVE', name: 'K-라이브존', block: 'K-LIVE', officialBlocks: ['K-라이브존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-hite-pub', level: 'OUTFIELD', category: 'PUB', name: '하이트펍존', block: 'HITE-PUB', officialBlocks: ['하이트펍존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-kids-camp', level: 'OUTFIELD', category: 'KIDS', name: '키즈랜드 캠핑존', block: 'KIDS-CAMP', officialBlocks: ['키즈랜드 캠핑존'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-wiz-garden', level: 'OUTFIELD', category: 'KIDS', name: '위즈가든', block: 'WIZ-GARDEN', officialBlocks: ['위즈가든'], side: 'OUTFIELD', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-3b-highfive', level: '1F', category: 'HIGHFIVE', name: '3루 하이파이브존', block: '3B-HIGHFIVE', officialBlocks: ['3루 하이파이브존'], side: 'THIRD_BASE', fanRole: 'AWAY' }),
  blockDefinition({ id: 'suwon-1b-highfive', level: '1F', category: 'HIGHFIVE', name: '1루 하이파이브존', block: '1B-HIGHFIVE', officialBlocks: ['1루 하이파이브존'], side: 'FIRST_BASE', fanRole: 'HOME' }),
  blockDefinition({ id: 'suwon-wheel-center', level: '1F', category: 'ACCESSIBLE', name: '중앙 휠체어석', block: 'WHEEL-CENTER', officialBlocks: ['중앙 휠체어석'], side: 'CENTER', fanRole: 'NEUTRAL' }),
  blockDefinition({ id: 'suwon-wheel-1b', level: '1F', category: 'ACCESSIBLE', name: '1루 휠체어석', block: 'WHEEL-1B', officialBlocks: ['1루 휠체어석'], side: 'FIRST_BASE', fanRole: 'HOME' }),
  blockDefinition({ id: 'suwon-wheel-3b', level: '1F', category: 'ACCESSIBLE', name: '3루 휠체어석', block: 'WHEEL-3B', officialBlocks: ['3루 휠체어석'], side: 'THIRD_BASE', fanRole: 'AWAY' }),
];

export const SUWON_BLOCKS: SuwonBlock[] = definitions.map((definition) => {
  const imageGeometry = IMAGE_GEOMETRY[definition.id];
  if (!imageGeometry) {
    throw new Error(`Missing Suwon geometry for ${definition.id}`);
  }
  const geometry = completeGeometry(definition.id, imageGeometry);
  return {
    ...definition,
    imageGeometry: geometry,
    hitGeometry: geometry,
    hitPriority: priorityFor(definition.id),
    traceStatus: TRACED_IDS.has(definition.id) ? 'OFFICIAL_IMAGE_TRACED' : 'DRAFT_APPROXIMATE',
  };
});

export const SUWON_ALIGNMENT_PROBES = [
  { id: 'suwon-301', point: [3190, 2950] as Point, note: '3층 1루 측 재추적 시작 블록' },
  { id: 'suwon-328', point: [860, 2930] as Point, note: '3층 3루 측 재추적 시작 블록' },
  { id: 'suwon-genie', point: [2005, 3830] as Point, note: '중앙 프리미엄 구역' },
  { id: 'suwon-501-508', point: [3120, 1835] as Point, note: '외야테이블석' },
];

export const SUWON_HIT_TEST_PROBES = SUWON_ALIGNMENT_PROBES;

export const SUWON_TRACE_REVIEW_SUMMARY = {
  totalBlocks: SUWON_BLOCKS.length,
  officialImageTraced: SUWON_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
  draftApproximate: SUWON_BLOCKS.filter((block) => block.traceStatus === 'DRAFT_APPROXIMATE').length,
  pendingBlockIds: SUWON_BLOCKS.filter((block) => block.traceStatus === 'DRAFT_APPROXIMATE').map((block) => block.id),
};
