import { KBO_STADIUMS, type SeatCategory, type StadiumZone } from '../../utils/stadiumData';

export type SectionType =
  | 'home'
  | 'away'
  | 'premium'
  | 'outfield'
  | 'table'
  | 'infield'
  | 'sky'
  | 'exciting'
  | 'family'
  | 'accessible';

export type StadiumSectionCategory =
  | 'PREMIUM'
  | 'TABLE'
  | 'INFIELD'
  | 'OUTFIELD'
  | 'CHEERING'
  | 'AWAY'
  | 'SKY'
  | 'FAMILY'
  | 'ACCESSIBLE'
  | 'EXCITING';

export type StadiumSectionSide = 'FIRST_BASE' | 'THIRD_BASE' | 'CENTER' | 'OUTFIELD';
export type StadiumFanRole = 'HOME' | 'AWAY' | 'NEUTRAL';
export type StadiumSectionLevel = '1F' | '2F' | '3F' | '4F';
export type StadiumSectionLabelMode = 'always' | 'desktop' | 'activeOnly' | 'hidden';

export interface Point {
  x: number;
  y: number;
}

export interface SeatSection {
  id: string;
  name: string;
  type: SectionType;
  category?: StadiumSectionCategory;
  side?: StadiumSectionSide;
  fanRole?: StadiumFanRole;
  level?: StadiumSectionLevel;
  d: string;
  hitPoints?: string;
  hitPath?: string;
  labelX: number;
  labelY: number;
  labelFontSize?: number;
  labelMode?: StadiumSectionLabelMode;
  shortLabel: string;
  description: string;
  viewHint: string;
  seatViewSections: string[];
  aliases?: string[];
  viewKey?: string;
  labelRotate?: number;
  legacyName?: string;
}

export interface ThemeConfig {
  bg: string;
  soft: string;
  hover: string;
  border: string;
  text: string;
  label: string;
}

export interface StadiumFieldLayout {
  grassPath: string;
  infieldPath: string;
  homePlatePath: string;
  foulLinePaths: string[];
  homePlate: Point;
  firstBase: Point;
  secondBase: Point;
  thirdBase: Point;
  mound: Point;
  baseSize?: number;
}

export interface StadiumLayout {
  id: string;
  presetId: StadiumSeatMapPresetId;
  name: string;
  label: string;
  notice: string;
  viewBox: string;
  matchers: string[];
  isFallback: boolean;
  shellPaths: string[];
  field: StadiumFieldLayout;
  sections: SeatSection[];
}

interface SectorGeometryOptions {
  labelAngle?: number;
  labelRadius?: number;
  labelRotate?: number;
}

export interface SectorSpec extends SectorGeometryOptions {
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
}

interface SeatSectionTemplate extends Omit<SeatSection, 'd' | 'hitPoints' | 'labelX' | 'labelY' | 'labelRotate' | 'seatViewSections'> {
  id: SeatSectionId;
  geometry: SectorSpec;
  createGeometry?: (preset: SeatMapPreset, geometry: SectorSpec) => SeatSectionGeometry;
}

export interface SeatMapPreset {
  id: StadiumSeatMapPresetId;
  label: string;
  matchers: string[];
  stadiumConfigKey?: string;
  centerX: number;
  centerY: number;
  fieldRadius: number;
  fieldStartAngle: number;
  fieldEndAngle: number;
  shell: SectorSpec;
  innerRim: SectorSpec;
  sectionOverrides?: Partial<Record<SeatSectionId, Partial<SectorSpec>>>;
}

export interface SeatMapGeometry {
  shellPath: string;
  innerRimPath: string;
  fieldPath: string;
  fieldLeftFoulLinePath: string;
  fieldRightFoulLinePath: string;
  sections: SeatSection[];
}

export type StadiumSeatMapPresetId =
  | 'default'
  | 'jamsil'
  | 'incheon'
  | 'daegu'
  | 'gwangju'
  | 'suwon'
  | 'changwon'
  | 'sajik'
  | 'gocheok'
  | 'daejeon';

type SeatSectionId =
  | 'outfield-left'
  | 'outfield-center'
  | 'outfield-right'
  | 'home-cheering'
  | 'third-table'
  | 'central-premium'
  | 'first-table'
  | 'away-cheering';

type SeatSectionGeometry = Pick<SeatSection, 'd' | 'hitPath' | 'hitPoints' | 'labelX' | 'labelY' | 'labelRotate'>;

const SEAT_MAP_CENTER_X = 400;
const SEAT_MAP_CENTER_Y = 430;
const DEFAULT_FIELD_RADIUS = 232;
const DEFAULT_FIELD_START_ANGLE = -54;
const DEFAULT_FIELD_END_ANGLE = 54;

const FIRST_BASE_CHEERING_OVERRIDES: Partial<Record<SeatSectionId, Partial<SectorSpec>>> = {
  'home-cheering': { startAngle: 82, endAngle: 108 },
  'away-cheering': { startAngle: -108, endAngle: -82 },
};

const THIRD_BASE_CHEERING_OVERRIDES: Partial<Record<SeatSectionId, Partial<SectorSpec>>> = {
  'home-cheering': { startAngle: -108, endAngle: -82 },
  'away-cheering': { startAngle: 82, endAngle: 108 },
};

const SECTION_ZONE_CATEGORIES: Partial<Record<SeatSectionId, SeatCategory[]>> = {
  'outfield-left': ['OUTFIELD'],
  'outfield-center': ['OUTFIELD'],
  'outfield-right': ['OUTFIELD'],
  'home-cheering': ['CHEERING'],
  'third-table': ['TABLE'],
  'central-premium': ['PREMIUM'],
  'first-table': ['TABLE'],
};

const SECTION_GENERIC_SEAT_VIEW_ALIASES: Partial<Record<SeatSectionId, string[]>> = {
  'outfield-left': ['좌측 외야', '외야석', '외야 일반석'],
  'outfield-center': ['중앙 외야', '외야석', '외야 일반석'],
  'outfield-right': ['우측 외야', '외야석', '외야 일반석'],
  'home-cheering': ['홈 응원', '홈 응원석', '응원석', '응원지정석'],
  'third-table': ['3루 테이블', '3루 테이블석', '테이블석'],
  'central-premium': ['중앙 프리미엄', '중앙 프리미엄석', '프리미엄석', '포수 후면', '중앙 테이블석'],
  'first-table': ['1루 테이블', '1루 테이블석', '테이블석'],
  'away-cheering': ['원정 응원', '원정 응원석', '원정석', '어웨이 응원', '방문팀 응원'],
};

export const TYPE_COLORS: Record<SectionType, ThemeConfig> = {
  home: { bg: '#4db6ac', soft: '#e0f2f1', hover: '#b2dfdb', border: '#26a69a', text: '#004d40', label: '홈 응원석' },
  away: { bg: '#ec407a', soft: '#fce4ec', hover: '#f8bbd0', border: '#d81b60', text: '#880e4f', label: '원정 응원석' },
  premium: { bg: '#f2a51a', soft: '#fff8e1', hover: '#ffe082', border: '#ffca28', text: '#8a5a00', label: '프리미엄/테이블' },
  outfield: { bg: '#6f7f91', soft: '#f1f3f5', hover: '#dee2e6', border: '#94a3b8', text: '#334155', label: '외야석' },
  table: { bg: '#8b5cf6', soft: '#ede9fe', hover: '#ddd6fe', border: '#7c3aed', text: '#4c1d95', label: '테이블석' },
  infield: { bg: '#3b82f6', soft: '#dbeafe', hover: '#bfdbfe', border: '#2563eb', text: '#1e3a8a', label: '내야석' },
  sky: { bg: '#64748b', soft: '#e2e8f0', hover: '#cbd5e1', border: '#475569', text: '#1e293b', label: '상단석' },
  exciting: { bg: '#f97316', soft: '#ffedd5', hover: '#fed7aa', border: '#ea580c', text: '#7c2d12', label: '익사이팅석' },
  family: { bg: '#22c55e', soft: '#dcfce7', hover: '#bbf7d0', border: '#16a34a', text: '#14532d', label: '가족석' },
  accessible: { bg: '#06b6d4', soft: '#cffafe', hover: '#a5f3fc', border: '#0891b2', text: '#164e63', label: '휠체어석' },
};

export const CATEGORY_COLORS: Record<StadiumSectionCategory, ThemeConfig> = {
  PREMIUM: { bg: '#f2a51a', soft: '#fff8e1', hover: '#ffe082', border: '#ffca28', text: '#8a5a00', label: '프리미엄석' },
  TABLE: { bg: '#8b5cf6', soft: '#ede9fe', hover: '#ddd6fe', border: '#7c3aed', text: '#4c1d95', label: '테이블석' },
  INFIELD: { bg: '#3b82f6', soft: '#dbeafe', hover: '#bfdbfe', border: '#2563eb', text: '#1e3a8a', label: '내야석' },
  OUTFIELD: { bg: '#6f7f91', soft: '#f1f3f5', hover: '#dee2e6', border: '#94a3b8', text: '#334155', label: '외야석' },
  CHEERING: { bg: '#4db6ac', soft: '#e0f2f1', hover: '#b2dfdb', border: '#26a69a', text: '#004d40', label: '홈 응원석' },
  AWAY: { bg: '#ec407a', soft: '#fce4ec', hover: '#f8bbd0', border: '#d81b60', text: '#880e4f', label: '원정 응원석' },
  SKY: { bg: '#64748b', soft: '#e2e8f0', hover: '#cbd5e1', border: '#475569', text: '#1e293b', label: '상단석' },
  FAMILY: { bg: '#22c55e', soft: '#dcfce7', hover: '#bbf7d0', border: '#16a34a', text: '#14532d', label: '가족석' },
  ACCESSIBLE: { bg: '#06b6d4', soft: '#cffafe', hover: '#a5f3fc', border: '#0891b2', text: '#164e63', label: '휠체어석' },
  EXCITING: { bg: '#f97316', soft: '#ffedd5', hover: '#fed7aa', border: '#ea580c', text: '#7c2d12', label: '익사이팅석' },
};

const CATEGORY_TO_SECTION_TYPE: Record<StadiumSectionCategory, SectionType> = {
  PREMIUM: 'premium',
  TABLE: 'table',
  INFIELD: 'infield',
  OUTFIELD: 'outfield',
  CHEERING: 'home',
  AWAY: 'away',
  SKY: 'sky',
  FAMILY: 'family',
  ACCESSIBLE: 'accessible',
  EXCITING: 'exciting',
};

const FALLBACK_SECTION_CATEGORY: Record<SeatSectionId, StadiumSectionCategory> = {
  'outfield-left': 'OUTFIELD',
  'outfield-center': 'OUTFIELD',
  'outfield-right': 'OUTFIELD',
  'home-cheering': 'CHEERING',
  'third-table': 'TABLE',
  'central-premium': 'PREMIUM',
  'first-table': 'TABLE',
  'away-cheering': 'AWAY',
};

const FALLBACK_SECTION_SIDE: Partial<Record<SeatSectionId, StadiumSectionSide>> = {
  'outfield-left': 'OUTFIELD',
  'outfield-center': 'OUTFIELD',
  'outfield-right': 'OUTFIELD',
  'third-table': 'THIRD_BASE',
  'central-premium': 'CENTER',
  'first-table': 'FIRST_BASE',
};

const FALLBACK_SECTION_FAN_ROLE: Record<SeatSectionId, StadiumFanRole> = {
  'outfield-left': 'NEUTRAL',
  'outfield-center': 'NEUTRAL',
  'outfield-right': 'NEUTRAL',
  'home-cheering': 'HOME',
  'third-table': 'NEUTRAL',
  'central-premium': 'NEUTRAL',
  'first-table': 'NEUTRAL',
  'away-cheering': 'AWAY',
};

export function getSectionTheme(section: Pick<SeatSection, 'category' | 'type'>) {
  return section.category ? CATEGORY_COLORS[section.category] : TYPE_COLORS[section.type];
}

function resolveFallbackSectionSide(sectionId: SeatSectionId, labelX: number, centerX: number): StadiumSectionSide {
  const fixedSide = FALLBACK_SECTION_SIDE[sectionId];

  if (fixedSide) {
    return fixedSide;
  }

  return labelX >= centerX ? 'FIRST_BASE' : 'THIRD_BASE';
}

function formatSvgNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): Point {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function formatPathPoint(point: Point) {
  return `${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`;
}

function formatPolygonPoint(point: Point) {
  return `${formatSvgNumber(point.x)},${formatSvgNumber(point.y)}`;
}

function createSectorPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? '1' : '0';

  return [
    `M ${formatPathPoint(outerStart)}`,
    `A ${formatSvgNumber(outerRadius)} ${formatSvgNumber(outerRadius)} 0 ${largeArcFlag} 1 ${formatPathPoint(outerEnd)}`,
    `L ${formatPathPoint(innerEnd)}`,
    `A ${formatSvgNumber(innerRadius)} ${formatSvgNumber(innerRadius)} 0 ${largeArcFlag} 0 ${formatPathPoint(innerStart)}`,
    'Z',
  ].join(' ');
}

function createFanPath(centerX: number, centerY: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(centerX, centerY, radius, startAngle);
  const end = polarToCartesian(centerX, centerY, radius, endAngle);
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? '1' : '0';

  return [
    `M ${formatSvgNumber(centerX)} ${formatSvgNumber(centerY)}`,
    `L ${formatPathPoint(start)}`,
    `A ${formatSvgNumber(radius)} ${formatSvgNumber(radius)} 0 ${largeArcFlag} 1 ${formatPathPoint(end)}`,
    'Z',
  ].join(' ');
}

function createLinePath(start: Point, end: Point) {
  return `M ${formatPathPoint(start)} L ${formatPathPoint(end)}`;
}

function createSectorHitPoints(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const segmentCount = Math.max(4, Math.ceil(Math.abs(endAngle - startAngle) / 10));
  const angleStep = (endAngle - startAngle) / segmentCount;
  const outerPoints = Array.from({ length: segmentCount + 1 }, (_, index) =>
    polarToCartesian(centerX, centerY, outerRadius, startAngle + angleStep * index),
  );
  const innerPoints = Array.from({ length: segmentCount + 1 }, (_, index) =>
    polarToCartesian(centerX, centerY, innerRadius, endAngle - angleStep * index),
  );

  return [...outerPoints, ...innerPoints].map(formatPolygonPoint).join(' ');
}

function createSectorGeometry(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  options: SectorGeometryOptions = {},
): SeatSectionGeometry {
  const labelAngle = options.labelAngle ?? (startAngle + endAngle) / 2;
  const labelRadius = options.labelRadius ?? (innerRadius + outerRadius) / 2;
  const labelPoint = polarToCartesian(centerX, centerY, labelRadius, labelAngle);
  const d = createSectorPath(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle);
  const geometry: SeatSectionGeometry = {
    d,
    hitPath: d,
    hitPoints: createSectorHitPoints(centerX, centerY, innerRadius, outerRadius, startAngle, endAngle),
    labelX: Number(labelPoint.x.toFixed(2)),
    labelY: Number(labelPoint.y.toFixed(2)),
  };

  if (options.labelRotate !== undefined) {
    geometry.labelRotate = options.labelRotate;
  }

  return geometry;
}

function createCentralPremiumGeometry(
  centerX: number,
  centerY: number,
  geometry: SectorSpec,
): SeatSectionGeometry {
  const scale = geometry.outerRadius / 124;
  const point = (offsetX: number, offsetY: number): Point => ({
    x: centerX + offsetX * scale,
    y: centerY + offsetY * scale,
  });
  const pathPoint = (offsetX: number, offsetY: number) => formatPathPoint(point(offsetX, offsetY));
  const hitOffsets = [
    [-62, 0],
    [-96, 48],
    [-70, 80],
    [-36, 96],
    [0, 98],
    [36, 96],
    [70, 80],
    [96, 48],
    [62, 0],
    [42, 22],
    [20, 34],
    [0, 38],
    [-20, 34],
    [-42, 22],
  ];

  const d = [
    `M ${pathPoint(-62, 0)}`,
    `C ${pathPoint(-44, 22)} ${pathPoint(-22, 34)} ${pathPoint(0, 38)}`,
    `C ${pathPoint(22, 34)} ${pathPoint(44, 22)} ${pathPoint(62, 0)}`,
    `L ${pathPoint(96, 48)}`,
    `C ${pathPoint(70, 80)} ${pathPoint(36, 96)} ${pathPoint(0, 98)}`,
    `C ${pathPoint(-36, 96)} ${pathPoint(-70, 80)} ${pathPoint(-96, 48)}`,
    'Z',
  ].join(' ');

  return {
    d,
    hitPath: d,
    hitPoints: hitOffsets.map(([offsetX, offsetY]) => formatPolygonPoint(point(offsetX, offsetY))).join(' '),
    labelX: Number(centerX.toFixed(2)),
    labelY: Number((centerY + 66 * scale).toFixed(2)),
  };
}

const SECTION_TEMPLATES: SeatSectionTemplate[] = [
  {
    id: 'outfield-left',
    name: '좌측 외야석',
    type: 'outfield',
    geometry: { innerRadius: 248, outerRadius: 335, startAngle: -78, endAngle: -29 },
    shortLabel: '좌측 외야',
    description: '외야 전경과 홈런 타구를 넓게 볼 수 있는 구역입니다.',
    viewHint: '경기 전체 흐름보다 외야 플레이와 응원 분위기를 가볍게 즐기기 좋습니다.',
  },
  {
    id: 'outfield-center',
    name: '중앙 외야석',
    type: 'outfield',
    geometry: { innerRadius: 248, outerRadius: 335, startAngle: -27, endAngle: 27 },
    shortLabel: '중앙 외야',
    description: '중견수 방향에서 구장 전체를 한눈에 조망하는 좌석입니다.',
    viewHint: '타구 방향과 수비 위치를 넓게 확인하고 싶을 때 어울립니다.',
  },
  {
    id: 'outfield-right',
    name: '우측 외야석',
    type: 'outfield',
    geometry: { innerRadius: 248, outerRadius: 335, startAngle: 29, endAngle: 78 },
    shortLabel: '우측 외야',
    description: '외야 응원과 구장 분위기를 여유 있게 느낄 수 있는 구역입니다.',
    viewHint: '가격 부담을 줄이면서 야구장 분위기를 즐기는 관람에 적합합니다.',
  },
  {
    id: 'home-cheering',
    name: '홈 응원석',
    type: 'home',
    geometry: { innerRadius: 160, outerRadius: 242, startAngle: -108, endAngle: -82 },
    shortLabel: '홈 응원',
    description: '응원단과 가까운 홈 팬 중심 구역입니다.',
    viewHint: '응원가와 단체 응원을 적극적으로 즐기고 싶은 관람객에게 맞습니다.',
  },
  {
    id: 'third-table',
    name: '3루 테이블석',
    type: 'premium',
    geometry: { innerRadius: 160, outerRadius: 242, startAngle: -80, endAngle: -54 },
    shortLabel: '3루 테이블',
    description: '내야를 가까이 보면서 음식과 짐을 두기 편한 좌석입니다.',
    viewHint: '편안한 관람과 대화가 필요한 동행 관람에 좋습니다.',
  },
  {
    id: 'central-premium',
    name: '중앙 프리미엄석',
    type: 'premium',
    geometry: { innerRadius: 54, outerRadius: 124, startAngle: 144, endAngle: 216, labelRadius: 96 },
    createGeometry: (preset, geometry) => createCentralPremiumGeometry(preset.centerX, preset.centerY, geometry),
    shortLabel: '중앙 프리미엄',
    description: '홈플레이트와 가장 가까운 중앙 시야 중심 좌석입니다.',
    viewHint: '투구, 타격, 포수 움직임을 세밀하게 보고 싶을 때 적합합니다.',
    legacyName: 'Home Table',
  },
  {
    id: 'first-table',
    name: '1루 테이블석',
    type: 'premium',
    geometry: { innerRadius: 160, outerRadius: 242, startAngle: 54, endAngle: 80 },
    shortLabel: '1루 테이블',
    description: '1루 측 내야를 가까이서 즐길 수 있는 쾌적한 테이블석입니다.',
    viewHint: '음식을 즐기며 편안하게 경기에 집중하고 싶을 때 좋습니다.',
  },
  {
    id: 'away-cheering',
    name: '원정 응원석',
    type: 'away',
    geometry: { innerRadius: 160, outerRadius: 242, startAngle: 82, endAngle: 108 },
    shortLabel: '원정 응원',
    description: '열정적인 원정 팬들이 모여 응원하는 구역입니다.',
    viewHint: '원정팀의 짜릿한 승리와 열띤 응원 문화를 함께하고 싶을 때 추천합니다.',
  },
];

const DEFAULT_SEAT_MAP_PRESET: SeatMapPreset = {
  id: 'default',
  label: '공통 안내도',
  matchers: [],
  centerX: SEAT_MAP_CENTER_X,
  centerY: SEAT_MAP_CENTER_Y,
  fieldRadius: DEFAULT_FIELD_RADIUS,
  fieldStartAngle: DEFAULT_FIELD_START_ANGLE,
  fieldEndAngle: DEFAULT_FIELD_END_ANGLE,
  shell: { innerRadius: 244, outerRadius: 360, startAngle: -108, endAngle: 108 },
  innerRim: { innerRadius: 236, outerRadius: 334, startAngle: -104, endAngle: 104 },
  sectionOverrides: THIRD_BASE_CHEERING_OVERRIDES,
};

const STADIUM_SEAT_MAP_PRESETS: SeatMapPreset[] = [
  {
    ...DEFAULT_SEAT_MAP_PRESET,
    id: 'jamsil',
    label: '잠실 블록 단위 안내도',
    matchers: ['JAMSIL', '잠실', '서울잠실'],
    stadiumConfigKey: 'Jamsil',
  },
  {
    id: 'incheon',
    label: '랜더스필드형 안내도',
    matchers: ['INCHEON', 'SSG', '문학', '인천', '랜더스'],
    stadiumConfigKey: 'Incheon',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 226,
    fieldStartAngle: -54,
    fieldEndAngle: 54,
    shell: { innerRadius: 238, outerRadius: 352, startAngle: -108, endAngle: 108 },
    innerRim: { innerRadius: 230, outerRadius: 326, startAngle: -104, endAngle: 104 },
    sectionOverrides: FIRST_BASE_CHEERING_OVERRIDES,
  },
  {
    id: 'daegu',
    label: '라이온즈파크형 안내도',
    matchers: ['DAEGU', 'SAMSUNG', '대구', '삼성', '라이온즈'],
    stadiumConfigKey: 'Daegu',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 228,
    fieldStartAngle: -55,
    fieldEndAngle: 55,
    shell: { innerRadius: 244, outerRadius: 352, startAngle: -108, endAngle: 108 },
    innerRim: { innerRadius: 236, outerRadius: 326, startAngle: -104, endAngle: 104 },
    sectionOverrides: {
      ...THIRD_BASE_CHEERING_OVERRIDES,
      'outfield-left': { startAngle: -82, endAngle: -31 },
      'outfield-center': { startAngle: -29, endAngle: 29 },
      'outfield-right': { startAngle: 31, endAngle: 82 },
      'home-cheering': { startAngle: -108, endAngle: -82 },
      'away-cheering': { startAngle: 82, endAngle: 108 },
    },
  },
  {
    id: 'gwangju',
    label: '챔피언스필드형 안내도',
    matchers: ['GWANGJU', 'KIA', '광주', '기아', '챔피언스'],
    stadiumConfigKey: 'Gwangju',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 226,
    fieldStartAngle: -54,
    fieldEndAngle: 54,
    shell: { innerRadius: 242, outerRadius: 348, startAngle: -106, endAngle: 106 },
    innerRim: { innerRadius: 234, outerRadius: 322, startAngle: -102, endAngle: 102 },
    sectionOverrides: THIRD_BASE_CHEERING_OVERRIDES,
  },
  {
    id: 'suwon',
    label: '위즈파크형 안내도',
    matchers: ['SUWON', 'KTWIZ', 'KT', 'kt wiz', '수원', '수원KT위즈파크', '수원 kt wiz 파크', '위즈', '위즈파크'],
    stadiumConfigKey: 'Suwon',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 222,
    fieldStartAngle: -53,
    fieldEndAngle: 53,
    shell: { innerRadius: 236, outerRadius: 342, startAngle: -104, endAngle: 104 },
    innerRim: { innerRadius: 228, outerRadius: 318, startAngle: -100, endAngle: 100 },
    sectionOverrides: {
      ...FIRST_BASE_CHEERING_OVERRIDES,
      'outfield-left': { innerRadius: 240, outerRadius: 318, startAngle: -74, endAngle: -27 },
      'outfield-center': { innerRadius: 240, outerRadius: 318, startAngle: -25, endAngle: 25 },
      'outfield-right': { innerRadius: 240, outerRadius: 318, startAngle: 27, endAngle: 74 },
    },
  },
  {
    id: 'changwon',
    label: 'NC파크형 안내도',
    matchers: ['CHANGWON', 'NCPARK', 'NC', 'NC파크', '창원', '창원NC파크', '다이노스'],
    stadiumConfigKey: 'Changwon',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 230,
    fieldStartAngle: -55,
    fieldEndAngle: 55,
    shell: { innerRadius: 244, outerRadius: 354, startAngle: -108, endAngle: 108 },
    innerRim: { innerRadius: 236, outerRadius: 328, startAngle: -104, endAngle: 104 },
    sectionOverrides: FIRST_BASE_CHEERING_OVERRIDES,
  },
  {
    id: 'sajik',
    label: '사직형 안내도',
    matchers: ['SAJIK', 'LOTTE', '사직', '부산', '롯데'],
    stadiumConfigKey: 'Sajik',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 232,
    fieldStartAngle: -55,
    fieldEndAngle: 55,
    shell: { innerRadius: 246, outerRadius: 358, startAngle: -108, endAngle: 108 },
    innerRim: { innerRadius: 238, outerRadius: 332, startAngle: -104, endAngle: 104 },
    sectionOverrides: {
      'outfield-left': { startAngle: -80, endAngle: -30 },
      'outfield-center': { startAngle: -28, endAngle: 28 },
      'outfield-right': { startAngle: 30, endAngle: 80 },
    },
  },
  {
    id: 'gocheok',
    label: '스카이돔형 안내도',
    matchers: ['GOCHEOK', 'KIWOOM', '고척', '키움', '스카이돔'],
    stadiumConfigKey: 'Gocheok',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 216,
    fieldStartAngle: -51,
    fieldEndAngle: 51,
    shell: { innerRadius: 232, outerRadius: 340, startAngle: -100, endAngle: 100 },
    innerRim: { innerRadius: 224, outerRadius: 314, startAngle: -96, endAngle: 96 },
    sectionOverrides: {
      'outfield-left': { innerRadius: 238, outerRadius: 316, startAngle: -72, endAngle: -25 },
      'outfield-center': { innerRadius: 238, outerRadius: 316, startAngle: -23, endAngle: 23 },
      'outfield-right': { innerRadius: 238, outerRadius: 316, startAngle: 25, endAngle: 72 },
      'home-cheering': { innerRadius: 162, outerRadius: 230, startAngle: -100, endAngle: -78 },
      'third-table': { innerRadius: 162, outerRadius: 230, startAngle: -76, endAngle: -56 },
      'first-table': { innerRadius: 162, outerRadius: 230, startAngle: 56, endAngle: 76 },
      'away-cheering': { innerRadius: 162, outerRadius: 230, startAngle: 78, endAngle: 100 },
    },
  },
  {
    id: 'daejeon',
    label: '이글스파크형 안내도',
    matchers: ['DAEJEON', 'HANWHA', '대전', '한화', '이글스'],
    stadiumConfigKey: 'Daejeon',
    centerX: SEAT_MAP_CENTER_X,
    centerY: SEAT_MAP_CENTER_Y,
    fieldRadius: 224,
    fieldStartAngle: -53,
    fieldEndAngle: 53,
    shell: { innerRadius: 238, outerRadius: 346, startAngle: -106, endAngle: 106 },
    innerRim: { innerRadius: 230, outerRadius: 320, startAngle: -102, endAngle: 102 },
    sectionOverrides: {
      'central-premium': { innerRadius: 44, outerRadius: 120, startAngle: 138, endAngle: 222 },
    },
  },
];

function normalizeStadiumKey(value: string) {
  return value.toLowerCase().replace(/[\s\-_/()·.]/g, '');
}

export function resolveStadiumSeatMapPreset(stadiumId?: string | null, stadiumName?: string | null) {
  const key = normalizeStadiumKey([stadiumId, stadiumName].filter(Boolean).join(' '));
  const preset = STADIUM_SEAT_MAP_PRESETS.find((candidate) =>
    candidate.matchers.some((matcher) => key.includes(normalizeStadiumKey(matcher))),
  );

  return preset ?? DEFAULT_SEAT_MAP_PRESET;
}

export function resolveStadiumSeatMapPresetMeta(stadiumId?: string | null, stadiumName?: string | null) {
  const layout = resolveStadiumLayout(stadiumId, stadiumName);

  return {
    id: layout.presetId,
    label: layout.label,
    isDefault: layout.presetId === DEFAULT_SEAT_MAP_PRESET.id,
    isFallback: layout.isFallback,
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function createLayoutSection(
  section: Omit<SeatSection, 'type' | 'hitPoints' | 'seatViewSections'> & {
    category: StadiumSectionCategory;
    aliases?: string[];
    hitPoints?: string;
  },
): SeatSection {
  const aliases = uniqueStrings([
    section.name,
    section.shortLabel,
    ...(section.aliases ?? []),
  ]);

  const fanRole = section.fanRole ?? (section.category === 'CHEERING' ? 'HOME' : section.category === 'AWAY' ? 'AWAY' : 'NEUTRAL');

  return {
    ...section,
    type: CATEGORY_TO_SECTION_TYPE[section.category],
    fanRole,
    hitPath: section.hitPath ?? section.d,
    aliases,
    seatViewSections: aliases,
  };
}

const JAMSIL_LAYOUT: StadiumLayout = {
  id: 'jamsil',
  presetId: 'jamsil',
  name: '서울잠실야구장',
  label: '잠실 블록 단위 안내도',
  notice: '잠실 전용 좌석도 로딩 전 fallback입니다',
  viewBox: '0 0 800 560',
  matchers: ['JAMSIL', '잠실', '서울잠실'],
  isFallback: false,
  shellPaths: [
    'M 56 486 C 66 286 176 110 320 62 C 372 44 428 44 480 62 C 624 110 734 286 744 486 L 678 466 C 662 300 566 168 462 128 C 424 114 376 114 338 128 C 234 168 138 300 122 466 Z',
    'M 116 466 C 132 308 222 176 338 128 C 376 112 424 112 462 128 C 578 176 668 308 684 466',
  ],
  field: {
    grassPath: 'M 400 432 L 136 428 C 148 258 252 140 400 116 C 548 140 652 258 664 428 Z',
    infieldPath: 'M 400 426 L 306 334 L 400 242 L 494 334 Z',
    homePlatePath: 'M 400 424 L 413 434 L 408 449 L 392 449 L 387 434 Z',
    foulLinePaths: ['M 400 432 L 136 428', 'M 400 432 L 664 428'],
    homePlate: { x: 400, y: 432 },
    firstBase: { x: 494, y: 334 },
    secondBase: { x: 400, y: 242 },
    thirdBase: { x: 306, y: 334 },
    mound: { x: 400, y: 348 },
    baseSize: 14,
  },
  sections: [
    createLayoutSection({
      id: 'jamsil-navy-third',
      name: '3루 네이비석',
      category: 'SKY',
      side: 'THIRD_BASE',
      level: '3F',
      d: 'M 72 474 C 84 316 154 178 276 94 L 316 158 C 234 216 186 328 176 454 Z',
      labelX: 178,
      labelY: 280,
      labelRotate: -28,
      labelFontSize: 14,
      shortLabel: '3루 네이비',
      description: '3루 상단에서 그라운드 전체를 내려다보는 구역입니다.',
      viewHint: '경기 흐름과 수비 위치를 넓게 확인하기 좋습니다.',
      aliases: ['네이비석', '3루 네이비', '상단석'],
      viewKey: 'jamsil-navy-third-base',
    }),
    createLayoutSection({
      id: 'jamsil-navy-center',
      name: '중앙 네이비석',
      category: 'SKY',
      side: 'CENTER',
      level: '3F',
      d: 'M 286 88 C 350 54 450 54 514 88 L 486 150 C 430 130 370 130 314 150 Z',
      labelX: 400,
      labelY: 108,
      labelFontSize: 14,
      shortLabel: '중앙 네이비',
      description: '중앙 상단에서 홈플레이트와 외야를 함께 보는 구역입니다.',
      viewHint: '높은 시야에서 경기 전체 구도를 확인하기 좋습니다.',
      aliases: ['네이비석', '중앙 네이비', '상단석'],
      viewKey: 'jamsil-navy-center',
    }),
    createLayoutSection({
      id: 'jamsil-navy-first',
      name: '1루 네이비석',
      category: 'SKY',
      side: 'FIRST_BASE',
      level: '3F',
      d: 'M 524 94 C 646 178 716 316 728 474 L 624 454 C 614 328 566 216 484 158 Z',
      labelX: 622,
      labelY: 280,
      labelRotate: 28,
      labelFontSize: 14,
      shortLabel: '1루 네이비',
      description: '1루 상단에서 그라운드 전체를 내려다보는 구역입니다.',
      viewHint: '내야 움직임과 외야 타구를 균형 있게 보기 좋습니다.',
      aliases: ['네이비석', '1루 네이비', '상단석'],
      viewKey: 'jamsil-navy-first-base',
    }),
    createLayoutSection({
      id: 'jamsil-outfield-left',
      name: '좌측 외야석',
      category: 'OUTFIELD',
      side: 'OUTFIELD',
      d: 'M 182 452 C 194 326 240 226 320 162 L 346 220 C 294 266 260 348 252 426 Z',
      labelX: 220,
      labelY: 326,
      labelRotate: -32,
      labelFontSize: 12,
      shortLabel: '좌측 외야',
      description: '좌측 외야에서 외야 수비와 홈런 타구를 볼 수 있는 구역입니다.',
      viewHint: '가격 부담을 줄이면서 구장 분위기를 즐기기 좋습니다.',
      aliases: ['외야 일반석', '좌측 외야', '외야석'],
      viewKey: 'jamsil-outfield-left',
    }),
    createLayoutSection({
      id: 'jamsil-outfield-center',
      name: '중앙 외야석',
      category: 'OUTFIELD',
      side: 'OUTFIELD',
      d: 'M 326 164 C 374 142 426 142 474 164 L 456 224 C 420 210 380 210 344 224 Z',
      labelX: 400,
      labelY: 184,
      labelFontSize: 14,
      shortLabel: '중앙 외야',
      description: '중견수 뒤쪽에서 구장 전체를 정면으로 보는 구역입니다.',
      viewHint: '외야 응원과 넓은 조망을 함께 느낄 수 있습니다.',
      aliases: ['외야 일반석', '중앙 외야', '외야석'],
      viewKey: 'jamsil-outfield-center',
    }),
    createLayoutSection({
      id: 'jamsil-outfield-right',
      name: '우측 외야석',
      category: 'OUTFIELD',
      side: 'OUTFIELD',
      d: 'M 480 162 C 560 226 606 326 618 452 L 548 426 C 540 348 506 266 454 220 Z',
      labelX: 580,
      labelY: 326,
      labelRotate: 32,
      labelFontSize: 12,
      shortLabel: '우측 외야',
      description: '우측 외야에서 외야 수비와 구장 분위기를 볼 수 있는 구역입니다.',
      viewHint: '가볍게 야구장을 즐기는 관람에 어울립니다.',
      aliases: ['외야 일반석', '우측 외야', '외야석'],
      viewKey: 'jamsil-outfield-right',
    }),
    createLayoutSection({
      id: 'jamsil-red-third',
      name: '3루 레드석',
      category: 'INFIELD',
      side: 'THIRD_BASE',
      level: '2F',
      d: 'M 206 320 C 240 276 276 242 320 218 L 350 262 C 316 286 290 320 270 360 Z',
      labelX: 292,
      labelY: 312,
      labelRotate: -28,
      labelFontSize: 12,
      labelMode: 'always',
      shortLabel: '3루 레드',
      description: '3루 내야 중단에서 경기와 응원 분위기를 함께 보는 구역입니다.',
      viewHint: '내야 플레이와 응원석 분위기를 균형 있게 즐기기 좋습니다.',
      aliases: ['레드석', '3루 레드', '내야석'],
      viewKey: 'jamsil-red-third-base',
    }),
    createLayoutSection({
      id: 'jamsil-red-first',
      name: '1루 레드석',
      category: 'INFIELD',
      side: 'FIRST_BASE',
      level: '2F',
      d: 'M 480 218 C 524 242 560 276 594 320 L 530 360 C 510 320 484 286 450 262 Z',
      labelX: 508,
      labelY: 312,
      labelRotate: 28,
      labelFontSize: 12,
      labelMode: 'always',
      shortLabel: '1루 레드',
      description: '1루 내야 중단에서 경기와 응원 분위기를 함께 보는 구역입니다.',
      viewHint: '내야 플레이를 놓치지 않으면서 관람하기 좋습니다.',
      aliases: ['레드석', '1루 레드', '내야석'],
      viewKey: 'jamsil-red-first-base',
    }),
    createLayoutSection({
      id: 'jamsil-blue-third',
      name: '3루 블루석',
      category: 'INFIELD',
      side: 'THIRD_BASE',
      level: '1F',
      d: 'M 142 456 C 152 400 176 352 206 320 L 270 360 C 248 396 236 430 232 466 Z',
      labelX: 186,
      labelY: 418,
      labelRotate: -18,
      labelFontSize: 11,
      labelMode: 'always',
      shortLabel: '3루 블루',
      description: '3루 내야 하단에서 베이스 주변 플레이를 가까이 보는 구역입니다.',
      viewHint: '라인 타구와 주루 플레이를 가까운 각도로 볼 수 있습니다.',
      aliases: ['블루석', '3루 블루', '내야석'],
      viewKey: 'jamsil-blue-third-base',
    }),
    createLayoutSection({
      id: 'jamsil-blue-first',
      name: '1루 블루석',
      category: 'INFIELD',
      side: 'FIRST_BASE',
      level: '1F',
      d: 'M 594 320 C 624 352 648 400 658 456 L 568 466 C 564 430 552 396 530 360 Z',
      labelX: 614,
      labelY: 418,
      labelRotate: 18,
      labelFontSize: 11,
      labelMode: 'always',
      shortLabel: '1루 블루',
      description: '1루 내야 하단에서 베이스 주변 플레이를 가까이 보는 구역입니다.',
      viewHint: '타자 주자와 1루 수비 움직임을 가까운 각도로 볼 수 있습니다.',
      aliases: ['블루석', '1루 블루', '내야석'],
      viewKey: 'jamsil-blue-first-base',
    }),
    createLayoutSection({
      id: 'jamsil-table-third',
      name: '3루 테이블석',
      category: 'TABLE',
      side: 'THIRD_BASE',
      level: '1F',
      d: 'M 236 420 L 272 358 L 334 398 L 292 456 Z',
      labelX: 284,
      labelY: 410,
      labelRotate: 34,
      labelFontSize: 12,
      labelMode: 'desktop',
      shortLabel: '3루 테이블',
      description: '3루 내야 하단에 위치한 테이블 좌석입니다.',
      viewHint: '음식과 짐을 두고 편하게 관람하기 좋습니다.',
      aliases: ['테이블석', '3루 테이블', '보라색'],
      viewKey: 'jamsil-table-third-base',
    }),
    createLayoutSection({
      id: 'jamsil-table-first',
      name: '1루 테이블석',
      category: 'TABLE',
      side: 'FIRST_BASE',
      level: '1F',
      d: 'M 528 358 L 564 420 L 508 456 L 466 398 Z',
      labelX: 516,
      labelY: 410,
      labelRotate: -34,
      labelFontSize: 12,
      labelMode: 'desktop',
      shortLabel: '1루 테이블',
      description: '1루 내야 하단에 위치한 테이블 좌석입니다.',
      viewHint: '편안한 관람과 동행 대화가 필요한 관람에 좋습니다.',
      aliases: ['테이블석', '1루 테이블', '보라색'],
      viewKey: 'jamsil-table-first-base',
    }),
    createLayoutSection({
      id: 'jamsil-exciting-third',
      name: '3루 익사이팅존',
      category: 'EXCITING',
      side: 'THIRD_BASE',
      level: '1F',
      d: 'M 292 350 L 332 388 L 386 426 L 370 448 L 312 404 L 276 368 Z',
      labelX: 333,
      labelY: 394,
      labelRotate: 38,
      labelFontSize: 12,
      labelMode: 'activeOnly',
      shortLabel: '3루 익사이팅',
      description: '3루 파울라인 가까이에서 그라운드 눈높이를 느끼는 구역입니다.',
      viewHint: '강한 타구와 파울볼에 주의가 필요한 가까운 좌석입니다.',
      aliases: ['익사이팅존', '3루 익사이팅'],
      viewKey: 'jamsil-exciting-third-base',
    }),
    createLayoutSection({
      id: 'jamsil-exciting-first',
      name: '1루 익사이팅존',
      category: 'EXCITING',
      side: 'FIRST_BASE',
      level: '1F',
      d: 'M 468 388 L 508 350 L 524 368 L 488 404 L 430 448 L 414 426 Z',
      labelX: 467,
      labelY: 394,
      labelRotate: -38,
      labelFontSize: 12,
      labelMode: 'activeOnly',
      shortLabel: '1루 익사이팅',
      description: '1루 파울라인 가까이에서 그라운드 눈높이를 느끼는 구역입니다.',
      viewHint: '선수 움직임이 가깝지만 파울볼 주의가 필요한 좌석입니다.',
      aliases: ['익사이팅존', '1루 익사이팅'],
      viewKey: 'jamsil-exciting-first-base',
    }),
    createLayoutSection({
      id: 'jamsil-home-cheering',
      name: '홈 응원석',
      category: 'CHEERING',
      side: 'THIRD_BASE',
      fanRole: 'HOME',
      level: '1F',
      d: 'M 118 468 L 232 438 L 276 492 L 152 526 Z',
      labelX: 198,
      labelY: 484,
      labelRotate: -10,
      labelFontSize: 14,
      shortLabel: '홈 응원',
      description: '홈 팬 응원단상과 가까운 응원 중심 구역입니다.',
      viewHint: '응원가와 단체 응원을 적극적으로 즐기고 싶을 때 적합합니다.',
      aliases: ['오렌지석', '응원석', '응원단상', '홈 응원'],
      viewKey: 'jamsil-cheering-home',
    }),
    createLayoutSection({
      id: 'jamsil-away-cheering',
      name: '원정 응원석',
      category: 'AWAY',
      side: 'FIRST_BASE',
      fanRole: 'AWAY',
      level: '1F',
      d: 'M 568 438 L 682 468 L 648 526 L 524 492 Z',
      labelX: 602,
      labelY: 484,
      labelRotate: 10,
      labelFontSize: 14,
      shortLabel: '원정 응원',
      description: '원정 팬들이 모여 응원하는 구역입니다.',
      viewHint: '원정팀 응원 분위기를 가까이 느끼고 싶을 때 어울립니다.',
      aliases: ['원정석', '원정 응원', '방문팀 응원'],
      viewKey: 'jamsil-cheering-away',
    }),
    createLayoutSection({
      id: 'jamsil-premium-center',
      name: '중앙 프리미엄석',
      category: 'PREMIUM',
      side: 'CENTER',
      level: '1F',
      d: 'M 330 452 C 350 486 376 502 400 504 C 424 502 450 486 470 452 L 438 430 C 428 446 414 456 400 458 C 386 456 372 446 362 430 Z',
      labelX: 400,
      labelY: 474,
      labelFontSize: 14,
      shortLabel: '중앙 프리미엄',
      description: '홈플레이트 바로 뒤 중앙 시야에 가까운 프리미엄 구역입니다.',
      viewHint: '투구와 타격을 정면에서 세밀하게 보고 싶을 때 적합합니다.',
      aliases: ['프리미엄석', '중앙 프리미엄', '포수 후면'],
      viewKey: 'jamsil-premium-home-plate',
    }),
  ],
};

const EXACT_STADIUM_LAYOUTS = [JAMSIL_LAYOUT];

function zoneText(zone: StadiumZone) {
  return [zone.id, zone.name, zone.description, ...zone.keywords].filter(Boolean).join(' ');
}

function isCentralPremiumZone(zone: StadiumZone) {
  const text = zoneText(zone);

  return zone.category === 'PREMIUM' || (zone.category === 'TABLE' && /중앙|포수|홈\s*플레이트|탁자/.test(text));
}

function resolveHomeCheeringSide(preset: SeatMapPreset) {
  const homeGeometry = {
    ...SECTION_TEMPLATES.find((section) => section.id === 'home-cheering')?.geometry,
    ...preset.sectionOverrides?.['home-cheering'],
  };

  if (
    typeof homeGeometry.startAngle !== 'number'
    || typeof homeGeometry.endAngle !== 'number'
  ) {
    return 'left';
  }

  return (homeGeometry.startAngle + homeGeometry.endAngle) / 2 > 0 ? 'right' : 'left';
}

function zoneAliases(zone: StadiumZone) {
  return uniqueStrings([zone.name, ...zone.keywords]);
}

function resolveZoneAliasesForSection(preset: SeatMapPreset, sectionId: SeatSectionId) {
  const stadiumConfig = preset.stadiumConfigKey ? KBO_STADIUMS[preset.stadiumConfigKey] : null;

  if (!stadiumConfig) {
    return [];
  }

  if (sectionId === 'central-premium') {
    return stadiumConfig.zones.filter(isCentralPremiumZone).flatMap(zoneAliases);
  }

  if (sectionId === 'away-cheering') {
    const awayBase = resolveHomeCheeringSide(preset) === 'right' ? '3루' : '1루';

    return [
      `${awayBase} 원정`,
      `${awayBase} 원정석`,
      `${awayBase} 원정 응원`,
      `${awayBase} 내야`,
    ];
  }

  const categories = SECTION_ZONE_CATEGORIES[sectionId];
  if (!categories) {
    return [];
  }

  return stadiumConfig.zones
    .filter((zone) => categories.includes(zone.category))
    .flatMap(zoneAliases);
}

function resolveSeatViewSections(preset: SeatMapPreset, section: SeatSectionTemplate) {
  return uniqueStrings([
    section.name,
    section.shortLabel,
    ...(SECTION_GENERIC_SEAT_VIEW_ALIASES[section.id] ?? []),
    ...resolveZoneAliasesForSection(preset, section.id),
    section.legacyName ?? '',
  ]);
}

export function createSeatMapGeometry(preset: SeatMapPreset): SeatMapGeometry {
  const fieldStartPoint = polarToCartesian(preset.centerX, preset.centerY, preset.fieldRadius, preset.fieldStartAngle);
  const fieldEndPoint = polarToCartesian(preset.centerX, preset.centerY, preset.fieldRadius, preset.fieldEndAngle);
  const sections = SECTION_TEMPLATES.map((section) => {
    const geometry = {
      ...section.geometry,
      ...preset.sectionOverrides?.[section.id],
    };
    const sectionGeometry = section.createGeometry
      ? section.createGeometry(preset, geometry)
      : createSectorGeometry(
        preset.centerX,
        preset.centerY,
        geometry.innerRadius,
        geometry.outerRadius,
        geometry.startAngle,
        geometry.endAngle,
        geometry,
      );
    const sectionBase = {
      id: section.id,
      name: section.name,
      type: section.type,
      category: FALLBACK_SECTION_CATEGORY[section.id],
      side: resolveFallbackSectionSide(section.id, sectionGeometry.labelX, preset.centerX),
      fanRole: FALLBACK_SECTION_FAN_ROLE[section.id],
      shortLabel: section.shortLabel,
      description: section.description,
      viewHint: section.viewHint,
      legacyName: section.legacyName,
      seatViewSections: resolveSeatViewSections(preset, section),
      aliases: resolveSeatViewSections(preset, section),
      viewKey: `${preset.id}-${section.id}`,
    };

    return {
      ...sectionBase,
      ...sectionGeometry,
    };
  });

  return {
    shellPath: createSectorPath(
      preset.centerX,
      preset.centerY,
      preset.shell.innerRadius,
      preset.shell.outerRadius,
      preset.shell.startAngle,
      preset.shell.endAngle,
    ),
    innerRimPath: createSectorPath(
      preset.centerX,
      preset.centerY,
      preset.innerRim.innerRadius,
      preset.innerRim.outerRadius,
      preset.innerRim.startAngle,
      preset.innerRim.endAngle,
    ),
    fieldPath: createFanPath(preset.centerX, preset.centerY, preset.fieldRadius, preset.fieldStartAngle, preset.fieldEndAngle),
    fieldLeftFoulLinePath: createLinePath({ x: preset.centerX, y: preset.centerY }, fieldStartPoint),
    fieldRightFoulLinePath: createLinePath({ x: preset.centerX, y: preset.centerY }, fieldEndPoint),
    sections,
  };
}

function createGenericStadiumLayout(preset: SeatMapPreset): StadiumLayout {
  const geometry = createSeatMapGeometry(preset);

  return {
    id: preset.id === 'default' ? 'generic' : preset.id,
    presetId: preset.id,
    name: preset.id === 'default' ? '공통 구장' : preset.label,
    label: preset.id === 'default' ? '개략 좌석 안내도' : `${preset.label} (개략)`,
    notice: '실제 예매 좌석도와 다를 수 있습니다',
    viewBox: '40 18 720 540',
    matchers: preset.matchers,
    isFallback: true,
    shellPaths: [geometry.shellPath, geometry.innerRimPath],
    field: {
      grassPath: geometry.fieldPath,
      infieldPath: 'M 400 428 L 318 348 L 400 268 L 482 348 Z',
      homePlatePath: 'M 400 424 L 412 434 L 407 448 L 393 448 L 388 434 Z',
      foulLinePaths: [geometry.fieldLeftFoulLinePath, geometry.fieldRightFoulLinePath],
      homePlate: { x: 400, y: 428 },
      firstBase: { x: 482, y: 348 },
      secondBase: { x: 400, y: 268 },
      thirdBase: { x: 318, y: 348 },
      mound: { x: 400, y: 354 },
      baseSize: 14,
    },
    sections: geometry.sections,
  };
}

export function resolveStadiumLayout(stadiumId?: string | null, stadiumName?: string | null): StadiumLayout {
  const key = normalizeStadiumKey([stadiumId, stadiumName].filter(Boolean).join(' '));
  const exactLayout = EXACT_STADIUM_LAYOUTS.find((layout) =>
    layout.matchers.some((matcher) => key.includes(normalizeStadiumKey(matcher))),
  );

  if (exactLayout) {
    return exactLayout;
  }

  return createGenericStadiumLayout(resolveStadiumSeatMapPreset(stadiumId, stadiumName));
}
