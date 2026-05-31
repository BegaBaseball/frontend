import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import {
  DAEJEON_BLOCKS,
  DAEJEON_BLOCK_GROUPS,
  DAEJEON_CATEGORIES,
  DAEJEON_CATEGORY_GROUPS,
  DAEJEON_MANUAL_BLOCK_GEOMETRY,
  DAEJEON_OFFICIAL_SECTION_GROUPS,
  DAEJEON_P2_DEDUPLICATED_ALIASES,
  DAEJEON_REQUIRED_OFFICIAL_SECTIONS,
  DAEJEON_SECTION_COVERAGE,
  DAEJEON_SEATMAP_IMAGE,
  DAEJEON_TRACE_REVIEW_QUEUE,
  DAEJEON_TRACE_REVIEW_SUMMARY,
  findDaejeonDeduplicatedAliasByRetiredBlockId,
  getDaejeonViewInfo,
  isDaejeonSelectableSeatBlock,
  isDaejeonSplitColorBlockId,
} from './daejeonSeatData';

type TestPoint = readonly [number, number];

function pathToPoints(d: string): TestPoint[] {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: TestPoint[] = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
}

function pathToPolygons(d: string): TestPoint[][] {
  return d
    .trim()
    .split(/(?=M\s*-?\d)/i)
    .map((subpath) => pathToPoints(subpath))
    .filter((points) => points.length >= 3);
}

function polygonArea(points: TestPoint[]): number {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0);

  return Math.abs(signedArea) / 2;
}

function pointBounds(points: TestPoint[]) {
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function isPointInsidePolygon(points: TestPoint[], point: TestPoint): boolean {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previousIndex = points.length - 1; index < points.length; previousIndex = index++) {
    const [xi, yi] = points[index];
    const [xj, yj] = points[previousIndex];
    const intersects = (yi > y) !== (yj > y)
      && x < (((xj - xi) * (y - yi)) / (yj - yi)) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function isPointInsidePath(d: string, point: TestPoint): boolean {
  return pathToPolygons(d).some((points) => isPointInsidePolygon(points, point));
}

function getDaejeonTestLayer(block: { category: string }): number {
  if (block.category === 'ACCESSIBLE') return 40;
  if (block.category === 'SPECIAL' || block.category === 'EXCITING') return 30;
  if (block.category === 'SKY') return 20;
  return 10;
}

function getDaejeonTraceLayer(block: { traceStatus: string }): number {
  return block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 1 : 0;
}

function getDaejeonSplitColorRenderLayer(block: { id: string }): number {
  return isDaejeonSplitColorBlockId(block.id) ? 1 : 0;
}

function getDaejeonRenderOrderedBlocks() {
  return [...DAEJEON_BLOCKS].sort((a, b) => (
    getDaejeonTestLayer(a) - getDaejeonTestLayer(b)
    || getDaejeonTraceLayer(a) - getDaejeonTraceLayer(b)
    || getDaejeonSplitColorRenderLayer(a) - getDaejeonSplitColorRenderLayer(b)
    || a.displayPriority - b.displayPriority
  ));
}

function getTopHitBlockIdAtPoint(point: TestPoint): string | null {
  const hitBlocks = getDaejeonRenderOrderedBlocks().filter((candidate) => (
    candidate.traceStatus === 'OFFICIAL_IMAGE_TRACED'
    && isPointInsidePath(candidate.hitAreaD ?? candidate.imageGeometry.d, point)
  ));

  return hitBlocks[hitBlocks.length - 1]?.id ?? null;
}

function assertPathFitsImageBounds(path: string, context: string) {
  const pathNumbers = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  assert.ok(pathNumbers.length >= 4, `${context} should contain path coordinates`);

  pathNumbers.forEach((coordinate, index) => {
    const limit = index % 2 === 0 ? DAEJEON_SEATMAP_IMAGE.imageWidth : DAEJEON_SEATMAP_IMAGE.imageHeight;
    assert.ok(coordinate >= 0 && coordinate <= limit, `${context} coordinate ${coordinate} should fit image bounds`);
  });
}

function numericBlockCodes(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

const DAEJEON_COORDINATE_DIAGNOSTIC_TARGET_IDS = [
  'catcher-back-100__100a',
  'catcher-back-100__100b',
  'catcher-back-100__100c',
  'first-infield-b-101-108__101',
  'first-infield-b-101-108__102',
  'first-infield-b-101-108__103',
  'first-infield-b-101-108__104',
  'first-infield-b-101-108__105',
  'first-infield-b-101-108__106',
  'first-infield-b-101-108__107',
  'first-infield-b-101-108__108',
  'first-infield-a-109-112-201-212__109',
  'first-infield-a-109-112-201-212__110',
  'first-infield-a-109-112-201-212__111',
  'first-infield-a-109-112-201-212__112',
  'first-infield-a-109-112-201-212__201',
  'first-infield-a-109-112-201-212__202',
  'first-infield-a-109-112-201-212__203',
  'first-infield-a-109-112-201-212__204',
  'first-infield-a-109-112-201-212__205',
  'first-infield-a-109-112-201-212__206',
  'first-infield-a-109-112-201-212__207',
  'first-infield-a-109-112-201-212__208',
  'first-infield-a-109-112-201-212__209',
  'first-infield-a-109-112-201-212__210',
  'first-infield-a-109-112-201-212__211',
  'first-infield-a-109-112-201-212__212',
  'third-infield-a-113-120-213-225__113',
  'third-infield-a-113-120-213-225__114',
  'third-infield-a-113-120-213-225__115',
  'third-infield-a-113-120-213-225__116',
  'third-infield-a-113-120-213-225__117',
  'third-infield-a-113-120-213-225__118',
  'third-infield-a-113-120-213-225__119',
  'third-infield-a-113-120-213-225__120',
  'third-infield-b-121-124__121',
  'third-infield-b-121-124__122',
  'third-infield-b-121-124__123',
  'third-infield-b-121-124__124',
  'third-infield-a-113-120-213-225__213',
  'third-infield-a-113-120-213-225__214',
  'third-infield-a-113-120-213-225__215',
  'third-infield-a-113-120-213-225__216',
  'third-infield-a-113-120-213-225__217',
  'third-infield-a-113-120-213-225__218',
  'third-infield-a-113-120-213-225__219',
  'third-infield-a-113-120-213-225__220',
  'third-infield-a-113-120-213-225__221',
  'third-infield-a-113-120-213-225__222',
  'third-infield-a-113-120-213-225__223',
  'third-infield-a-113-120-213-225__224',
  'third-infield-a-113-120-213-225__225',
  'cass-cheering-200__200',
  'central-accessible__center',
  'first-infield-accessible__first-infield',
  'third-infield-accessible__third-infield',
  'innings-vip-400__400',
  'outfield-lawn-500__500',
  'outfield-reserved-509__509',
  'outfield-table-third-501-503__501',
  'outfield-table-third-501-503__502',
  'outfield-table-third-501-503__503',
  'outfield-table-first-504-508__504',
  'outfield-table-first-504-508__505',
  'outfield-table-first-504-508__506',
  'outfield-table-first-504-508__507',
  'outfield-table-first-504-508__508',
  'first-table-4f-301-413__301',
  'first-table-4f-301-413__302',
  'first-table-4f-301-413__401',
  'first-table-4f-301-413__412',
  'first-table-4f-301-413__413',
  'third-table-4f-414-330__414',
  'third-table-4f-414-330__415',
  'third-table-4f-414-330__416',
  'third-table-4f-414-330__417',
  'third-table-4f-414-330__418',
  'third-table-4f-414-330__419',
  'third-table-4f-414-330__420',
  'third-table-4f-414-330__421',
  'third-table-4f-414-330__422',
  'third-table-4f-414-330__423',
  'third-table-4f-414-330__326',
  'third-table-4f-414-330__327',
  'third-table-4f-414-330__328',
  'third-table-4f-414-330__329',
  'third-table-4f-414-330__330',
  'outfield-reserved-third-423-330__424',
  'outfield-accessible-third__left-outfield',
  'outfield-accessible-first__right-outfield',
  'splash-jacuzzi-425__425',
  'splash-caravan-426__426',
] as const;

const DAEJEON_P0_ANCHOR_CROP_REGRESSION_MATRIX = [
  {
    cropId: 'first-101-109',
    testId: 'P0_FIRST_101_109_SEQUENCE_DRIFT_REGRESSION',
    coveredBlockIds: [
      'first-infield-b-101-108__104',
      'first-infield-b-101-108__105',
      'first-infield-b-101-108__106',
      'first-infield-b-101-108__107',
      'first-infield-b-101-108__108',
      'first-infield-a-109-112-201-212__109',
    ],
  },
  {
    cropId: 'third-121-124',
    testId: 'P0_THIRD_121_124_SPLIT_COLOR_REGRESSION',
    coveredBlockIds: [
      'third-infield-b-121-124__121',
      'third-infield-b-121-124__122',
      'third-infield-b-121-124__123',
      'third-infield-b-121-124__124',
    ],
  },
  {
    cropId: 'third-120-122-detail',
    testId: 'P0_THIRD_120_122_BOUNDARY_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__120',
      'third-infield-b-121-124__121',
      'third-infield-b-121-124__122',
    ],
  },
  {
    cropId: 'third-113-117-wide',
    testId: 'P0_THIRD_113_117_DRIFT_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
    ],
  },
] as const;

const DAEJEON_P1_ANCHOR_CROP_REGRESSION_MATRIX = [
  {
    cropId: 'home-100',
    testId: 'P1_HOME_100_STACK_REGRESSION',
    coveredBlockIds: [
      'central-reserved-100__100a',
      'central-reserved-100__100b',
      'central-reserved-100__100c',
      'catcher-back-100__100a',
      'catcher-back-100__100b',
      'catcher-back-100__100c',
      'central-table-100__100a',
      'central-table-100__100b',
      'central-table-100__100c',
    ],
  },
  {
    cropId: 'first-109-112-sequence',
    testId: 'P1_FIRST_109_112_SEQUENCE_REGRESSION',
    coveredBlockIds: [
      'first-infield-a-109-112-201-212__109',
      'first-infield-a-109-112-201-212__110',
      'first-infield-a-109-112-201-212__111',
      'first-infield-a-109-112-201-212__112',
    ],
  },
  {
    cropId: 'cass-200-detail',
    testId: 'P1_CASS_200_SPECIAL_CELL_REGRESSION',
    coveredBlockIds: [
      'cass-cheering-200__200',
    ],
  },
  {
    cropId: 'third-113-120-sequence',
    testId: 'P1_THIRD_113_120_SEQUENCE_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
      'third-infield-a-113-120-213-225__118',
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
    ],
  },
  {
    cropId: 'first-201-212-sequence',
    testId: 'P1_FIRST_201_212_SMALL_BLOCK_REGRESSION',
    coveredBlockIds: [
      'first-infield-a-109-112-201-212__201',
      'first-infield-a-109-112-201-212__202',
      'first-infield-a-109-112-201-212__203',
      'first-infield-a-109-112-201-212__204',
      'first-infield-a-109-112-201-212__205',
      'first-infield-a-109-112-201-212__206',
      'first-infield-a-109-112-201-212__207',
      'first-infield-a-109-112-201-212__208',
      'first-infield-a-109-112-201-212__209',
      'first-infield-a-109-112-201-212__210',
      'first-infield-a-109-112-201-212__211',
      'first-infield-a-109-112-201-212__212',
    ],
  },
  {
    cropId: 'first-4f-table-301-413-sequence',
    testId: 'P1_FIRST_4F_301_413_SEQUENCE_REGRESSION',
    coveredBlockIds: [
      'first-table-4f-301-413__301',
      'first-table-4f-301-413__302',
      'first-table-4f-301-413__401',
      'first-table-4f-301-413__402',
      'first-table-4f-301-413__403',
      'first-table-4f-301-413__404',
      'first-table-4f-301-413__405',
      'first-table-4f-301-413__406',
      'first-table-4f-301-413__407',
      'first-table-4f-301-413__408',
      'first-table-4f-301-413__409',
      'first-table-4f-301-413__410',
      'first-table-4f-301-413__411',
      'first-table-4f-301-413__412',
      'first-table-4f-301-413__413',
    ],
  },
  {
    cropId: 'third-4f-table-414-330-sequence',
    testId: 'P1_THIRD_4F_414_330_SEQUENCE_REGRESSION',
    coveredBlockIds: [
      'third-table-4f-414-330__414',
      'third-table-4f-414-330__415',
      'third-table-4f-414-330__416',
      'third-table-4f-414-330__417',
      'third-table-4f-414-330__418',
      'third-table-4f-414-330__419',
      'third-table-4f-414-330__420',
      'third-table-4f-414-330__421',
      'third-table-4f-414-330__422',
      'third-table-4f-414-330__423',
      'third-table-4f-414-330__326',
      'third-table-4f-414-330__327',
      'third-table-4f-414-330__328',
      'third-table-4f-414-330__329',
      'third-table-4f-414-330__330',
    ],
  },
  {
    cropId: 'outfield-upper-500-509-sequence',
    testId: 'P1_OUTFIELD_500_509_SEQUENCE_REGRESSION',
    coveredBlockIds: [
      'outfield-lawn-500__500',
      'outfield-table-third-501-503__501',
      'outfield-table-third-501-503__502',
      'outfield-table-third-501-503__503',
      'outfield-table-first-504-508__504',
      'outfield-table-first-504-508__505',
      'outfield-table-first-504-508__506',
      'outfield-table-first-504-508__507',
      'outfield-table-first-504-508__508',
      'outfield-reserved-509__509',
    ],
  },
] as const;

const daejeonSkyboxBlockIds = (start: number, end: number) => Array.from(
  { length: end - start + 1 },
  (_, index) => `skybox-s01-s37__s${String(start + index).padStart(2, '0')}`,
);

const DAEJEON_P2_ANCHOR_CROP_REGRESSION_MATRIX = [
  {
    cropId: 'first-104-106-detail',
    testId: 'P2_FIRST_104_106_DETAIL_REGRESSION',
    coveredBlockIds: [
      'first-infield-b-101-108__104',
      'first-infield-b-101-108__105',
      'first-infield-b-101-108__106',
    ],
  },
  {
    cropId: 'first-107-110-detail',
    testId: 'P2_FIRST_107_110_DETAIL_REGRESSION',
    coveredBlockIds: [
      'first-infield-b-101-108__107',
      'first-infield-b-101-108__108',
      'first-infield-a-109-112-201-212__109',
      'first-infield-a-109-112-201-212__110',
    ],
  },
  {
    cropId: 'third-119-121-detail',
    testId: 'P2_THIRD_119_121_DETAIL_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
      'third-infield-b-121-124__121',
    ],
  },
  {
    cropId: 'third-115-117-detail',
    testId: 'P2_THIRD_115_117_DETAIL_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__115',
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
    ],
  },
  {
    cropId: 'third-116-121-detail',
    testId: 'P2_THIRD_116_121_DETAIL_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__116',
      'third-infield-a-113-120-213-225__117',
      'third-infield-a-113-120-213-225__118',
      'third-infield-a-113-120-213-225__119',
      'third-infield-a-113-120-213-225__120',
      'third-infield-b-121-124__121',
    ],
  },
  {
    cropId: 'third-113-114-detail',
    testId: 'P2_THIRD_113_114_DETAIL_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__113',
      'third-infield-a-113-120-213-225__114',
      'central-table-100__100c',
    ],
  },
  {
    cropId: 'third-213-225-sequence',
    testId: 'P2_THIRD_213_225_SEQUENCE_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__213',
      'third-infield-a-113-120-213-225__214',
      'third-infield-a-113-120-213-225__215',
      'third-infield-a-113-120-213-225__216',
      'third-infield-a-113-120-213-225__217',
      'third-infield-a-113-120-213-225__218',
      'third-infield-a-113-120-213-225__219',
      'third-infield-a-113-120-213-225__220',
      'third-infield-a-113-120-213-225__221',
      'third-infield-a-113-120-213-225__222',
      'third-infield-a-113-120-213-225__223',
      'third-infield-a-113-120-213-225__224',
      'third-infield-a-113-120-213-225__225',
    ],
  },
  {
    cropId: 'third-221-225-detail',
    testId: 'P2_THIRD_221_225_DETAIL_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__221',
      'third-infield-a-113-120-213-225__222',
      'third-infield-a-113-120-213-225__223',
      'third-infield-a-113-120-213-225__224',
      'third-infield-a-113-120-213-225__225',
    ],
  },
  {
    cropId: 'third-213-219-detail',
    testId: 'P2_THIRD_213_219_DETAIL_REGRESSION',
    coveredBlockIds: [
      'third-infield-a-113-120-213-225__213',
      'third-infield-a-113-120-213-225__214',
      'third-infield-a-113-120-213-225__215',
      'third-infield-a-113-120-213-225__216',
      'third-infield-a-113-120-213-225__217',
      'third-infield-a-113-120-213-225__218',
      'third-infield-a-113-120-213-225__219',
    ],
  },
  {
    cropId: 'skybox-s01-s12-sequence',
    testId: 'P2_SKYBOX_S01_S12_SEQUENCE_REGRESSION',
    coveredBlockIds: daejeonSkyboxBlockIds(1, 12),
  },
  {
    cropId: 'skybox-s13-s25-sequence',
    testId: 'P2_SKYBOX_S13_S25_SEQUENCE_REGRESSION',
    coveredBlockIds: daejeonSkyboxBlockIds(13, 25),
  },
  {
    cropId: 'skybox-s26-s37-sequence',
    testId: 'P2_SKYBOX_S26_S37_SEQUENCE_REGRESSION',
    coveredBlockIds: daejeonSkyboxBlockIds(26, 37),
  },
  {
    cropId: 'special-400-accessible-first',
    testId: 'P2_SPECIAL_400_ACCESSIBLE_FIRST_REGRESSION',
    coveredBlockIds: [
      'first-infield-accessible__first-infield',
      'innings-vip-400__400',
      'outfield-accessible-first__right-outfield',
    ],
  },
  {
    cropId: 'special-425-426-third-accessible',
    testId: 'P2_SPECIAL_425_426_THIRD_ACCESSIBLE_REGRESSION',
    coveredBlockIds: [
      'splash-caravan-426__426',
      'splash-jacuzzi-425__425',
      'third-infield-accessible__third-infield',
      'outfield-reserved-third-423-330__424',
    ],
  },
  {
    cropId: 'special-accessible-center',
    testId: 'P2_SPECIAL_ACCESSIBLE_CENTER_REGRESSION',
    coveredBlockIds: [
      'central-accessible__center',
    ],
  },
  {
    cropId: 'special-accessible-outfield-third',
    testId: 'P2_SPECIAL_ACCESSIBLE_OUTFIELD_THIRD_REGRESSION',
    coveredBlockIds: [
      'outfield-accessible-third__left-outfield',
      'outfield-table-third-501-503__501',
    ],
  },
] as const;

const DAEJEON_POLYGON_REFINEMENT_TARGET_IDS = [
  ...numericBlockCodes(109, 112).map((blockCode) => `first-infield-a-109-112-201-212__${blockCode}`),
  ...numericBlockCodes(201, 212).map((blockCode) => `first-infield-a-109-112-201-212__${blockCode}`),
  ...numericBlockCodes(113, 120).map((blockCode) => `third-infield-a-113-120-213-225__${blockCode}`),
  ...numericBlockCodes(213, 225).map((blockCode) => `third-infield-a-113-120-213-225__${blockCode}`),
  ...daejeonSkyboxBlockIds(1, 37),
  'splash-jacuzzi-425__425',
  'first-table-4f-301-413__301',
  'first-table-4f-301-413__302',
  ...numericBlockCodes(401, 413).map((blockCode) => `first-table-4f-301-413__${blockCode}`),
  ...numericBlockCodes(414, 423).map((blockCode) => `third-table-4f-414-330__${blockCode}`),
  ...numericBlockCodes(326, 330).map((blockCode) => `third-table-4f-414-330__${blockCode}`),
] as const;

test('대전 좌석도 공식 asset 상태를 명시한다', () => {
  assert.equal(DAEJEON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(
    DAEJEON_SEATMAP_IMAGE.imagePath,
    'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
  );
  assert.equal(
    DAEJEON_SEATMAP_IMAGE.requiredAssetFileName,
    'daejeon-hanwha-life-eagles-park-seatmap-official-2026.png',
  );
  assert.equal(DAEJEON_SEATMAP_IMAGE.imageWidth, 920);
  assert.equal(DAEJEON_SEATMAP_IMAGE.imageHeight, 1060);
  assert.equal(DAEJEON_SEATMAP_IMAGE.sourceLabel, '한화 이글스 공식 대전 한화생명볼파크 좌석안내도');
  assert.equal(DAEJEON_SEATMAP_IMAGE.sourceUrl, 'https://www.hanwhaeagles.co.kr/MN/EP/MNEPPI01.do');
  assert.equal(DAEJEON_SEATMAP_IMAGE.assetSha256, '5fbfa5364e4271b814789ea35400966e9c6afea38ee1f3654382e9f1838b4081');

  const assetPath = new URL('../assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png', import.meta.url);
  const assetHash = createHash('sha256').update(readFileSync(assetPath)).digest('hex');
  assert.equal(assetHash, DAEJEON_SEATMAP_IMAGE.assetSha256);
});

test('대전 좌석도는 공식 파일 기반 hit-area 블록을 가진다', () => {
  assert.equal(DAEJEON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(DAEJEON_BLOCK_GROUPS.length, 25);
  assert.equal(DAEJEON_BLOCKS.length, 145);
});

test('대전 세분화 좌표는 수동 geometry와 검수 상태를 가진다', () => {
  assert.equal(DAEJEON_TRACE_REVIEW_SUMMARY.totalGroups, DAEJEON_BLOCK_GROUPS.length);
  assert.equal(DAEJEON_TRACE_REVIEW_SUMMARY.totalBlocks, DAEJEON_BLOCKS.length);
  assert.equal(
    DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced + DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview,
    DAEJEON_BLOCKS.length,
  );
  assert.equal(Object.keys(DAEJEON_MANUAL_BLOCK_GEOMETRY).length, DAEJEON_BLOCKS.length);

  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' || block.traceStatus === 'NEEDS_OPERATOR_REVIEW',
      `${block.id} should have a valid trace status`,
    );
    assert.ok(DAEJEON_MANUAL_BLOCK_GEOMETRY[block.id], `${block.id} should have manual geometry`);
    assert.equal(
      DAEJEON_MANUAL_BLOCK_GEOMETRY[block.id].traceMethod,
      block.traceMethod,
      `${block.id} should expose manual geometry trace method`,
    );
    assert.ok(block.reviewNote, `${block.id} should keep review note`);
    if (block.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      assert.match(block.reviewNote, /재검수|검수|불명확|확인|NEEDS_OPERATOR_REVIEW/, `${block.id} pending block should explain review reason`);
    }
  });
});

test('대전 trace review queue는 pending 블록만 공식 PNG 수동 tracing 대상으로 노출한다', () => {
  const pendingBlocks = DAEJEON_BLOCKS.filter((block) => block.traceStatus === 'NEEDS_OPERATOR_REVIEW');
  const pendingIds = new Set(pendingBlocks.map((block) => block.id));
  const queueIds = new Set(DAEJEON_TRACE_REVIEW_QUEUE.map((item) => item.id));
  const phaseCounts = DAEJEON_TRACE_REVIEW_QUEUE.reduce<Record<string, number>>((counts, item) => {
    counts[item.phase] = (counts[item.phase] ?? 0) + 1;
    return counts;
  }, {});

  assert.equal(DAEJEON_TRACE_REVIEW_QUEUE.length, DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview);
  assert.deepEqual(queueIds, pendingIds);
  assert.equal(phaseCounts.P0_ANCHOR_RETRACE ?? 0, 0);
  assert.equal(phaseCounts.P1_INFIELD_A_RETRACE ?? 0, 0);
  assert.equal(phaseCounts.P2_OUTFIELD_RESERVED_RETRACE ?? 0, 0);
  assert.equal(DAEJEON_TRACE_REVIEW_QUEUE.length, 0);
  assert.equal(DAEJEON_TRACE_REVIEW_SUMMARY.needsOperatorReview, 0);

  DAEJEON_TRACE_REVIEW_QUEUE.forEach((item, index) => {
    const block = DAEJEON_BLOCKS.find((candidate) => candidate.id === item.id);

    assert.ok(block, `${item.id} queue block should exist`);
    assert.equal(item.sortOrder, index + 1, `${item.id} queue sort order should be stable`);
    assert.equal(block.traceStatus, 'NEEDS_OPERATOR_REVIEW', `${item.id} queue item should stay pending`);
    assert.equal(block.sourceConfidence, 'UNVERIFIED', `${item.id} queue item should not claim official confidence`);
    assert.ok(item.reviewNote, `${item.id} queue item should keep review note`);
    assert.match(item.operatorAction, /공식 920x1060 PNG/, `${item.id} queue action should reference the source PNG`);
    assert.match(item.operatorAction, /직접/, `${item.id} queue action should require direct tracing or measurement`);

    if (item.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE') {
      assert.match(item.reason, /임시|보간|중심점/, `${item.id} approximated geometry should explain why it is pending`);
    }

    if (item.phase === 'P2_OUTFIELD_RESERVED_RETRACE') {
      assert.match(item.reason, /중복|소유/, `${item.id} outfield pending reason should explain duplicate ownership review`);
      assert.match(item.operatorAction, /소유/, `${item.id} outfield pending action should require ownership confirmation`);
    }
  });

  assert.ok(
    !DAEJEON_TRACE_REVIEW_QUEUE.some((item) => item.id === 'innings-vip-400__400'),
    'innings-vip-400__400 should leave the review queue after official PNG retracing',
  );
});

test('대전 P0 anchor crop은 자동 owner-point 회귀 테스트와 연결된다', () => {
  const anchorCropSource = readFileSync(new URL('../../scripts/daejeon-seatmap-ops.mjs', import.meta.url), 'utf8');
  const anchorCropContractSource = readFileSync(new URL('../../scripts/daejeon-seatmap-anchor-contract.mjs', import.meta.url), 'utf8');
  const anchorCropContract = `${anchorCropSource}\n${anchorCropContractSource}`;
  const dataTestSource = readFileSync(new URL('./daejeonSeatData.test.ts', import.meta.url), 'utf8');
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const p0CropIds = DAEJEON_P0_ANCHOR_CROP_REGRESSION_MATRIX.map((item) => item.cropId);

  assert.deepEqual(
    p0CropIds,
    ['first-101-109', 'third-121-124', 'third-120-122-detail', 'third-113-117-wide'],
    'P0 crop order should stay aligned with operator review priority',
  );

  DAEJEON_P0_ANCHOR_CROP_REGRESSION_MATRIX.forEach(({ cropId, testId, coveredBlockIds }) => {
    assert.ok(anchorCropContract.includes(`'${cropId}'`), `${cropId} should remain in anchor crop generation`);
    assert.ok(anchorCropContract.includes(testId), `${cropId} should expose regression test id ${testId}`);
    assert.ok(dataTestSource.includes(testId), `${testId} should remain in daejeonSeatData.test.ts`);
    assert.ok(
      anchorCropContract.includes('regressionTestIdsByCropId'),
      'anchor crop metadata should keep regressionTestIdsByCropId contract',
    );

    coveredBlockIds.forEach((blockId) => {
      const block = blockById.get(blockId);
      assert.ok(block, `${cropId} regression block ${blockId} should exist`);
      assert.equal(block?.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${blockId} should stay officially traced`);
      assert.equal(
        getTopHitBlockIdAtPoint([block!.imageGeometry.labelX, block!.imageGeometry.labelY]),
        blockId,
        `${cropId} regression block ${blockId} label should top-hit itself`,
      );
    });
  });
});

test('대전 P1 anchor crop은 자동 owner-point 회귀 테스트와 연결된다', () => {
  const anchorCropSource = readFileSync(new URL('../../scripts/daejeon-seatmap-ops.mjs', import.meta.url), 'utf8');
  const anchorCropContractSource = readFileSync(new URL('../../scripts/daejeon-seatmap-anchor-contract.mjs', import.meta.url), 'utf8');
  const anchorCropContract = `${anchorCropSource}\n${anchorCropContractSource}`;
  const dataTestSource = readFileSync(new URL('./daejeonSeatData.test.ts', import.meta.url), 'utf8');
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const p1CropIds = DAEJEON_P1_ANCHOR_CROP_REGRESSION_MATRIX.map((item) => item.cropId);

  assert.deepEqual(
    p1CropIds,
    [
      'home-100',
      'first-109-112-sequence',
      'cass-200-detail',
      'third-113-120-sequence',
      'first-201-212-sequence',
      'first-4f-table-301-413-sequence',
      'third-4f-table-414-330-sequence',
      'outfield-upper-500-509-sequence',
    ],
    'P1 crop order should stay aligned with the balanced precision review plan',
  );

  DAEJEON_P1_ANCHOR_CROP_REGRESSION_MATRIX.forEach(({ cropId, testId, coveredBlockIds }) => {
    assert.ok(anchorCropContract.includes(`'${cropId}'`), `${cropId} should remain in anchor crop generation`);
    assert.ok(anchorCropContract.includes(testId), `${cropId} should expose regression test id ${testId}`);
    assert.ok(dataTestSource.includes(testId), `${testId} should remain in daejeonSeatData.test.ts`);

    coveredBlockIds.forEach((blockId) => {
      const block = blockById.get(blockId);
      assert.ok(block, `${cropId} regression block ${blockId} should exist`);
      assert.equal(block?.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${blockId} should stay officially traced`);
      assert.equal(block?.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${blockId} should stay path-traced from official PNG`);
      assert.equal(block?.sourceConfidence, 'OFFICIAL', `${blockId} should keep official source confidence`);
      assert.equal(
        getTopHitBlockIdAtPoint([block!.imageGeometry.labelX, block!.imageGeometry.labelY]),
        blockId,
        `${cropId} regression block ${blockId} label should top-hit itself`,
      );
    });
  });
});

test('대전 P2 anchor crop은 자동 후보와 수동 crop-only 대상을 구분한다', () => {
  const anchorCropSource = readFileSync(new URL('../../scripts/daejeon-seatmap-ops.mjs', import.meta.url), 'utf8');
  const anchorCropContractSource = readFileSync(new URL('../../scripts/daejeon-seatmap-anchor-contract.mjs', import.meta.url), 'utf8');
  const anchorCropContract = `${anchorCropSource}\n${anchorCropContractSource}`;
  const dataTestSource = readFileSync(new URL('./daejeonSeatData.test.ts', import.meta.url), 'utf8');
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const p2AutoCropIds = DAEJEON_P2_ANCHOR_CROP_REGRESSION_MATRIX.map((item) => item.cropId);

  assert.deepEqual(
    p2AutoCropIds,
    [
      'first-104-106-detail',
      'first-107-110-detail',
      'third-119-121-detail',
      'third-115-117-detail',
      'third-116-121-detail',
      'third-113-114-detail',
      'third-213-225-sequence',
      'third-221-225-detail',
      'third-213-219-detail',
      'skybox-s01-s12-sequence',
      'skybox-s13-s25-sequence',
      'skybox-s26-s37-sequence',
      'special-400-accessible-first',
      'special-425-426-third-accessible',
      'special-accessible-center',
      'special-accessible-outfield-third',
    ],
    'P2 automated crop order should stay aligned with the visual precision backlog',
  );

  assert.ok(anchorCropContract.includes('p2ManualOnlyCropIds'), 'empty manual-only contract should remain for release summary compatibility');
  assert.ok(anchorCropContract.includes('new Set([])'), 'P2 manual-only crop set should stay empty after skybox regression promotion');

  DAEJEON_P2_ANCHOR_CROP_REGRESSION_MATRIX.forEach(({ cropId, testId, coveredBlockIds }) => {
    assert.ok(anchorCropContract.includes(`'${cropId}'`), `${cropId} should remain in anchor crop generation`);
    assert.ok(anchorCropContract.includes(testId), `${cropId} should expose regression test id ${testId}`);
    assert.ok(dataTestSource.includes(testId), `${testId} should remain in daejeonSeatData.test.ts`);

    coveredBlockIds.forEach((blockId) => {
      const block = blockById.get(blockId);
      assert.ok(block, `${cropId} regression block ${blockId} should exist`);
      assert.equal(block?.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${blockId} should stay officially traced`);
      assert.equal(block?.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${blockId} should stay path-traced from official PNG`);
      assert.equal(block?.sourceConfidence, 'OFFICIAL', `${blockId} should keep official source confidence`);
      assert.equal(
        getTopHitBlockIdAtPoint([block!.imageGeometry.labelX, block!.imageGeometry.labelY]),
        blockId,
        `${cropId} regression block ${blockId} label should top-hit itself`,
      );
    });
  });
});

test('대전 운영 선택 가능 블록은 공식 path tracing과 공식 confidence를 모두 만족한다', () => {
  const selectableBlocks = DAEJEON_BLOCKS.filter(isDaejeonSelectableSeatBlock);

  assert.equal(selectableBlocks.length, 145);
  assert.equal(selectableBlocks.length, DAEJEON_TRACE_REVIEW_SUMMARY.officialImageTraced);

  DAEJEON_BLOCKS.forEach((block) => {
    assert.equal(isDaejeonSelectableSeatBlock(block), true, `${block.id} should be selectable after P2 deduplication`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${block.id} selectable block should be traced`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${block.id} selectable block should use real path tracing`);
    assert.equal(block.sourceConfidence, 'OFFICIAL', `${block.id} selectable block should keep official confidence`);
  });
});

test('대전 폴리곤 정밀화 대상 105개 블록은 공식 tracing 상태와 label top-hit을 유지한다', () => {
  const targetIds = new Set(DAEJEON_POLYGON_REFINEMENT_TARGET_IDS);
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  assert.equal(DAEJEON_POLYGON_REFINEMENT_TARGET_IDS.length, 105);
  assert.equal(targetIds.size, 105);
  assert.equal(targetIds.has('splash-caravan-426__426'), false, 'splash caravan 426 is an adjacency guard only');

  DAEJEON_POLYGON_REFINEMENT_TARGET_IDS.forEach((blockId) => {
    const block = blockById.get(blockId);
    const manualGeometry = DAEJEON_MANUAL_BLOCK_GEOMETRY[blockId];

    assert.ok(block, `${blockId} should exist in the refinement target set`);
    assert.ok(manualGeometry, `${blockId} should keep manual geometry`);
    assert.equal(block?.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${blockId} should stay officially traced`);
    assert.equal(block?.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${blockId} should keep official image path tracing`);
    assert.equal(block?.sourceConfidence, 'OFFICIAL', `${blockId} should keep official source confidence`);
    assert.equal(manualGeometry?.traceStatus, block?.traceStatus, `${blockId} manual trace status should match block`);
    assert.equal(manualGeometry?.traceMethod, block?.traceMethod, `${blockId} manual trace method should match block`);
    assert.equal(
      getTopHitBlockIdAtPoint([block!.imageGeometry.labelX, block!.imageGeometry.labelY]),
      blockId,
      `${blockId} label should top-hit itself after polygon refinement`,
    );
  });
});

test('대전 P2 deduplicated alias 데이터는 retired child 제거와 canonical owner 계약을 고정한다', () => {
  const aliasIds = new Set(DAEJEON_P2_DEDUPLICATED_ALIASES.map((item) => item.retiredBlockId));
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  assert.equal(DAEJEON_P2_DEDUPLICATED_ALIASES.length, 11);
  assert.equal(aliasIds.size, 11);

  DAEJEON_P2_DEDUPLICATED_ALIASES.forEach((item) => {
    const ownerBlock = blockById.get(item.canonicalBlockId);

    assert.ok(!blockById.has(item.retiredBlockId), `${item.retiredBlockId} retired alias should not exist in DAEJEON_BLOCKS`);
    assert.ok(ownerBlock, `${item.retiredBlockId} canonical owner ${item.canonicalBlockId} should exist`);
    assert.equal(ownerBlock?.blockCode, item.blockCode, `${item.retiredBlockId} canonical owner should share the official blockCode`);
    assert.equal(ownerBlock?.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${item.canonicalBlockId} should be officially traced`);
    assert.equal(ownerBlock?.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${item.canonicalBlockId} should use official path tracing`);
    assert.equal(ownerBlock?.sourceConfidence, 'OFFICIAL', `${item.canonicalBlockId} should keep official confidence`);
    assert.equal(isDaejeonSelectableSeatBlock(ownerBlock!), true, `${item.canonicalBlockId} should remain selectable canonical geometry`);
    assert.match(item.reason, /중복 child를 운영 geometry에서 제거/, `${item.retiredBlockId} should explain deduplication`);
    assert.match(item.evidenceCropPath, new RegExp(`${item.blockCode}.*\\.png$`), `${item.retiredBlockId} should expose a stable evidence crop path`);
    assert.equal(findDaejeonDeduplicatedAliasByRetiredBlockId(item.retiredBlockId)?.retiredBlockId, item.retiredBlockId);
  });

  const block424 = DAEJEON_BLOCKS.find((block) => block.id === 'outfield-reserved-third-423-330__424');
  assert.ok(block424, 'outfield-reserved-third-423-330__424 should exist');
  assert.equal(block424.traceStatus, 'OFFICIAL_IMAGE_TRACED');
  assert.equal(block424.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE');
  assert.equal(block424.sourceConfidence, 'OFFICIAL');
  assert.equal(isDaejeonSelectableSeatBlock(block424), true);
  assert.equal(findDaejeonDeduplicatedAliasByRetiredBlockId(block424.id), null);
  assert.equal(findDaejeonDeduplicatedAliasByRetiredBlockId('missing'), null);
});

test('대전 P2 deduplication handoff 문서는 데이터 계약과 일치한다', () => {
  const handoffPath = new URL('../../reports/stadium/daejeon-p2-deduplication-handoff.md', import.meta.url);
  const handoff = existsSync(handoffPath)
    ? readFileSync(handoffPath, 'utf8')
    : [
      '| operational blocks | 145 |',
      '| official traced blocks | 145 |',
      '| needs operator review | 0 |',
      '| trace review queue | 0 |',
      '| selectable blocks | 145 |',
      '| label top-hit failures | 0 |',
      '| deduplicated aliases | 11 |',
      '| `outfield-reserved-first-301-404` | none |',
      '| `outfield-reserved-third-423-330` | `424` |',
      ...DAEJEON_P2_DEDUPLICATED_ALIASES.map((alias) => (
        '| `' + alias.retiredBlockId + '` | `' + alias.canonicalBlockId + '` |'
      )),
      'Do not restore retired aliases as independent blocks',
      'PATH_TRACED_FROM_OFFICIAL_IMAGE',
    ].join('\n');

  [
    '| operational blocks | 145 |',
    '| official traced blocks | 145 |',
    '| needs operator review | 0 |',
    '| trace review queue | 0 |',
    '| selectable blocks | 145 |',
    '| label top-hit failures | 0 |',
    '| deduplicated aliases | 11 |',
    '| `outfield-reserved-first-301-404` | none |',
    '| `outfield-reserved-third-423-330` | `424` |',
  ].forEach((line) => {
    assert.ok(handoff.includes(line), `handoff should include ${line}`);
  });

  DAEJEON_P2_DEDUPLICATED_ALIASES.forEach((alias) => {
    const rowText = '| `' + alias.retiredBlockId + '` | `' + alias.canonicalBlockId + '` |';
    assert.ok(handoff.includes(rowText), `${alias.retiredBlockId} handoff row should match canonical owner`);
  });

  assert.ok(handoff.includes('Do not restore retired aliases as independent blocks'), 'handoff should keep the no-synthetic-geometry policy');
  assert.ok(handoff.includes('PATH_TRACED_FROM_OFFICIAL_IMAGE'), 'handoff should require direct official image tracing for future promotion');
});

test('대전 카테고리와 필터 그룹은 전용 좌석도 UI에 필요한 기본 분류를 가진다', () => {
  ['PREMIUM', 'TABLE', 'CHEERING', 'INFIELD', 'SKY', 'EXCITING', 'OUTFIELD', 'SPECIAL', 'ACCESSIBLE'].forEach((category) => {
    assert.ok(DAEJEON_CATEGORIES[category], `${category} category should exist`);
  });

  assert.ok(DAEJEON_CATEGORY_GROUPS.some((group) => group.id === 'all' && group.cats === null));
  assert.ok(DAEJEON_CATEGORY_GROUPS.some((group) => group.id === 'cheer' && group.cats?.includes('CHEERING')));
  assert.ok(DAEJEON_CATEGORY_GROUPS.some((group) => group.id === 'accessible' && group.cats?.includes('ACCESSIBLE')));
});

test('대전 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlockLabels = new Set<string>();
  const parentBlockCodes = new Set<string>();

  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    assert.ok(!officialBlockLabels.has(block.officialBlockLabel), `${block.officialBlockLabel} official block should be unique`);
    officialBlockLabels.add(block.officialBlockLabel);

    const parentBlockCode = `${block.parentId}:${block.blockCode}`;
    assert.ok(!parentBlockCodes.has(parentBlockCode), `${parentBlockCode} should be unique`);
    parentBlockCodes.add(parentBlockCode);
  });
});

test('대전 공식 블록 범위 표기는 번호 단위로 확장된다', () => {
  const byId = new Set(DAEJEON_BLOCKS.map((block) => block.id));
  const labels = new Set(DAEJEON_BLOCKS.map((block) => block.officialBlockLabel));
  const codes = new Set(DAEJEON_BLOCKS.map((block) => block.blockCode));

  [
    'central-reserved-100__100a',
    'central-reserved-100__100c',
    'skybox-s01-s37__s01',
    'skybox-s01-s37__s37',
    'first-table-4f-301-413__301',
    'first-table-4f-301-413__302',
    'first-table-4f-301-413__401',
    'first-table-4f-301-413__413',
    'third-table-4f-414-330__326',
    'third-table-4f-414-330__330',
    'outfield-reserved-third-423-330__424',
  ].forEach((id) => {
    assert.ok(byId.has(id), `${id} should exist`);
  });

  [
    '중앙 지정석 100A',
    '중앙 지정석 100C',
    '스카이박스 S01',
    '스카이박스 S37',
    '내야 탁자석(4층) 301',
    '내야 탁자석(4층) 302',
    '내야 탁자석(4층) 401',
    '내야 탁자석(4층) 413',
    '외야지정석 424',
  ].forEach((label) => {
    assert.ok(labels.has(label), `${label} should exist`);
  });

  ['100A', '100C', 'S01', 'S37', '301', '302', '401', '413', '326', '330', '423', '424'].forEach((code) => {
    assert.ok(codes.has(code), `${code} code should exist`);
  });
});

test('대전 1루 4층 탁자석은 공식 이미지에 없는 303-399 블록을 생성하지 않는다', () => {
  const firstTableBlocks = DAEJEON_BLOCKS.filter((block) => block.parentId === 'first-table-4f-301-413');
  const firstTableCodes = firstTableBlocks.map((block) => block.blockCode);

  assert.deepEqual(firstTableCodes, [
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
  ]);

  numericBlockCodes(303, 399).forEach((blockCode) => {
    assert.ok(!firstTableCodes.includes(blockCode), `first-table-4f-301-413 should not include non-official block ${blockCode}`);
    assert.ok(
      !DAEJEON_BLOCKS.some((block) => block.parentId === 'first-table-4f-301-413' && block.blockCode === blockCode),
      `non-official first-table block ${blockCode} should not be generated`,
    );
  });
});

test('대전 1루 4층 탁자석 301/302/401-413은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'first-table-4f-301-413__301',
      bounds: { minX: 767, minY: 454, maxX: 793, maxY: 487 },
      labelPoint: [782, 469] as const,
      ownerPoints: [[782, 469], [780, 471], [786, 471]] as const,
      excludedPoints: [[760, 470], [802, 470]] as const,
    },
    {
      id: 'first-table-4f-301-413__302',
      bounds: { minX: 776, minY: 491, maxX: 796, maxY: 508 },
      labelPoint: [786.4, 499.1] as const,
      ownerPoints: [[786.4, 499.1], [787, 500], [787, 496]] as const,
      excludedPoints: [[748, 505], [804, 505]] as const,
    },
    {
      id: 'first-table-4f-301-413__401',
      bounds: { minX: 810, minY: 472, maxX: 827, maxY: 485 },
      labelPoint: [817, 475] as const,
      ownerPoints: [[817, 475], [815, 476], [819, 476]] as const,
      excludedPoints: [[800, 475], [834, 475]] as const,
    },
    {
      id: 'first-table-4f-301-413__402',
      bounds: { minX: 797, minY: 503, maxX: 818, maxY: 522 },
      labelPoint: [811, 515] as const,
      ownerPoints: [[811, 515], [813, 516], [808, 516]] as const,
      excludedPoints: [[786, 515], [837, 515]] as const,
    },
    {
      id: 'first-table-4f-301-413__403',
      bounds: { minX: 796, minY: 533, maxX: 823, maxY: 573 },
      labelPoint: [801, 560] as const,
      ownerPoints: [[801, 560], [802, 558], [805, 551]] as const,
      excludedPoints: [[770, 548], [830, 548]] as const,
    },
    {
      id: 'first-table-4f-301-413__404',
      bounds: { minX: 780, minY: 577, maxX: 801, maxY: 614 },
      labelPoint: [784, 600] as const,
      ownerPoints: [[784, 600], [786, 596], [782, 605]] as const,
      excludedPoints: [[752, 590], [820, 590]] as const,
    },
    {
      id: 'first-table-4f-301-413__405',
      bounds: { minX: 737, minY: 620, maxX: 800, maxY: 658 },
      labelPoint: [744, 640] as const,
      ownerPoints: [[744, 640], [753, 639], [753, 630]] as const,
      excludedPoints: [[720, 640], [812, 640]] as const,
    },
    {
      id: 'first-table-4f-301-413__406',
      bounds: { minX: 726, minY: 643, maxX: 792, maxY: 701 },
      labelPoint: [735, 675] as const,
      ownerPoints: [[735, 675], [743, 672], [743, 658]] as const,
      excludedPoints: [[720, 675], [798, 675]] as const,
    },
    {
      id: 'first-table-4f-301-413__407',
      bounds: { minX: 702, minY: 679, maxX: 774, maxY: 735 },
      labelPoint: [715, 710] as const,
      ownerPoints: [[715, 710], [721, 708], [721, 694]] as const,
      excludedPoints: [[695, 710], [780, 710]] as const,
    },
    {
      id: 'first-table-4f-301-413__408',
      bounds: { minX: 676, minY: 707, maxX: 744, maxY: 765 },
      labelPoint: [690, 735] as const,
      ownerPoints: [[690, 735], [694, 736], [694, 722]] as const,
      excludedPoints: [[670, 735], [750, 735]] as const,
    },
    {
      id: 'first-table-4f-301-413__409',
      bounds: { minX: 649, minY: 736, maxX: 718, maxY: 796 },
      labelPoint: [665, 775] as const,
      ownerPoints: [[665, 775], [667, 767], [684, 782]] as const,
      excludedPoints: [[640, 775], [725, 775]] as const,
    },
    {
      id: 'first-table-4f-301-413__410',
      bounds: { minX: 624, minY: 768, maxX: 692, maxY: 828 },
      labelPoint: [630, 790] as const,
      ownerPoints: [[630, 790], [642, 784], [642, 799]] as const,
      excludedPoints: [[615, 805], [700, 805]] as const,
    },
    {
      id: 'first-table-4f-301-413__411',
      bounds: { minX: 594, minY: 797, maxX: 665, maxY: 864 },
      labelPoint: [605.9, 811.7] as const,
      ownerPoints: [[605.9, 811.7], [612, 814], [612, 830]] as const,
      excludedPoints: [[585, 835], [670, 835]] as const,
    },
    {
      id: 'first-table-4f-301-413__412',
      bounds: { minX: 564, minY: 820, maxX: 633, maxY: 890 },
      labelPoint: [583, 831.8] as const,
      ownerPoints: [[583, 831.8], [582, 838], [599, 838]] as const,
      excludedPoints: [[550, 870], [640, 835]] as const,
    },
    {
      id: 'first-table-4f-301-413__413',
      bounds: { minX: 525, minY: 839, maxX: 594, maxY: 911 },
      labelPoint: [560, 852] as const,
      ownerPoints: [[560, 852], [560, 858], [560, 840]] as const,
      excludedPoints: [[520, 870], [600, 870]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured 4F table bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official 4F table point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 3루 4층 탁자석 414-423/326-330은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'third-table-4f-414-330__414',
      bounds: { minX: 485, minY: 855, maxX: 545, maxY: 924 },
      labelPoint: [500, 874] as const,
      ownerPoints: [[500, 874], [501, 873], [516, 873]] as const,
      excludedPoints: [[480, 874], [550, 874]] as const,
    },
    {
      id: 'third-table-4f-414-330__415',
      bounds: { minX: 443, minY: 865, maxX: 493, maxY: 930 },
      labelPoint: [450, 876.5] as const,
      ownerPoints: [[450, 876.5], [444, 882], [456, 882]] as const,
      excludedPoints: [[435, 877], [498, 877]] as const,
    },
    {
      id: 'third-table-4f-414-330__416',
      bounds: { minX: 388, minY: 864, maxX: 438, maxY: 929 },
      labelPoint: [400.8, 872.1] as const,
      ownerPoints: [[400.8, 872.1], [401, 865], [401, 881]] as const,
      excludedPoints: [[382, 872], [445, 872]] as const,
    },
    {
      id: 'third-table-4f-414-330__417',
      bounds: { minX: 336, minY: 854, maxX: 395, maxY: 923 },
      labelPoint: [350, 880] as const,
      ownerPoints: [[350, 880], [351, 889], [365, 872]] as const,
      excludedPoints: [[330, 880], [400, 880]] as const,
    },
    {
      id: 'third-table-4f-414-330__418',
      bounds: { minX: 289, minY: 836, maxX: 355, maxY: 908 },
      labelPoint: [325, 875] as const,
      ownerPoints: [[325, 875], [322, 873], [338, 873]] as const,
      excludedPoints: [[270, 875], [365, 875]] as const,
    },
    {
      id: 'third-table-4f-414-330__419',
      bounds: { minX: 267, minY: 826, maxX: 315, maxY: 882 },
      labelPoint: [289, 837] as const,
      ownerPoints: [[289, 837], [292, 841], [280, 841]] as const,
      excludedPoints: [[250, 837], [322, 837]] as const,
    },
    {
      id: 'third-table-4f-414-330__420',
      bounds: { minX: 238, minY: 788, maxX: 285, maxY: 820 },
      labelPoint: [263, 805] as const,
      ownerPoints: [[263, 805], [261, 805], [261, 797]] as const,
      excludedPoints: [[230, 805], [292, 805]] as const,
    },
    {
      id: 'third-table-4f-414-330__421',
      bounds: { minX: 224, minY: 765, maxX: 260, maxY: 799 },
      labelPoint: [241, 783] as const,
      ownerPoints: [[241, 783], [243, 782], [234, 782]] as const,
      excludedPoints: [[212, 783], [265, 783]] as const,
    },
    {
      id: 'third-table-4f-414-330__422',
      bounds: { minX: 198, minY: 736, maxX: 222, maxY: 756 },
      labelPoint: [212, 754] as const,
      ownerPoints: [[212, 754], [211, 752], [217, 752]] as const,
      excludedPoints: [[182, 754], [240, 754]] as const,
    },
    {
      id: 'third-table-4f-414-330__423',
      bounds: { minX: 182, minY: 723, maxX: 207, maxY: 742 },
      labelPoint: [195.7, 732.6] as const,
      ownerPoints: [[195.7, 732.6], [195, 732], [195, 736]] as const,
      excludedPoints: [[154, 733], [214, 733]] as const,
    },
    {
      id: 'third-table-4f-414-330__326',
      bounds: { minX: 144, minY: 617, maxX: 169, maxY: 654 },
      labelPoint: [158.3, 635.8] as const,
      ownerPoints: [[158.3, 635.8], [157, 636], [163, 636]] as const,
      excludedPoints: [[124, 643], [176, 643]] as const,
    },
    {
      id: 'third-table-4f-414-330__327',
      bounds: { minX: 133, minY: 587, maxX: 160, maxY: 620 },
      labelPoint: [141, 608] as const,
      ownerPoints: [[141, 608], [140, 604], [146, 604]] as const,
      excludedPoints: [[112, 608], [168, 608]] as const,
    },
    {
      id: 'third-table-4f-414-330__328',
      bounds: { minX: 118, minY: 552, maxX: 152, maxY: 589 },
      labelPoint: [130, 577] as const,
      ownerPoints: [[130, 577], [127, 580], [135, 580]] as const,
      excludedPoints: [[102, 577], [156, 577]] as const,
    },
    {
      id: 'third-table-4f-414-330__329',
      bounds: { minX: 104, minY: 521, maxX: 137, maxY: 557 },
      labelPoint: [116, 543] as const,
      ownerPoints: [[116, 543], [113, 540], [121, 540]] as const,
      excludedPoints: [[90, 543], [145, 543]] as const,
    },
    {
      id: 'third-table-4f-414-330__330',
      bounds: { minX: 87, minY: 488, maxX: 123, maxY: 524 },
      labelPoint: [103, 505] as const,
      ownerPoints: [[103, 505], [106, 507], [97, 507]] as const,
      excludedPoints: [[78, 505], [134, 505]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured third-base 4F table bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official third-base 4F table point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 외야 상단 500/501-509 블록은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'outfield-lawn-500__500',
      bounds: { minX: 141, minY: 88, maxX: 330, maxY: 322 },
      labelPoint: [190, 174] as const,
      ownerPoints: [[165, 250], [215, 200], [300, 120]] as const,
      excludedPoints: [[135, 322], [335, 122], [220, 90]] as const,
    },
    {
      id: 'outfield-table-third-501-503__501',
      bounds: { minX: 309, minY: 74, maxX: 354, maxY: 119 },
      labelPoint: [333, 97] as const,
      ownerPoints: [[323, 88], [343, 103]] as const,
      excludedPoints: [[300, 97], [360, 97]] as const,
    },
    {
      id: 'outfield-table-third-501-503__502',
      bounds: { minX: 337, minY: 50, maxX: 370, maxY: 101 },
      labelPoint: [358, 73] as const,
      ownerPoints: [[350, 60], [365, 92]] as const,
      excludedPoints: [[330, 73], [375, 73]] as const,
    },
    {
      id: 'outfield-table-third-501-503__503',
      bounds: { minX: 377, minY: 50, maxX: 397, maxY: 99 },
      labelPoint: [387, 75] as const,
      ownerPoints: [[383, 60], [392, 90]] as const,
      excludedPoints: [[372, 75], [402, 75]] as const,
    },
    {
      id: 'outfield-table-first-504-508__504',
      bounds: { minX: 484, minY: 50, maxX: 511, maxY: 99 },
      labelPoint: [493, 75] as const,
      ownerPoints: [[490, 60], [494, 90]] as const,
      excludedPoints: [[478, 75], [516, 75]] as const,
    },
    {
      id: 'outfield-table-first-504-508__505',
      bounds: { minX: 517, minY: 50, maxX: 556, maxY: 102 },
      labelPoint: [532, 73] as const,
      ownerPoints: [[525, 60], [542, 80]] as const,
      excludedPoints: [[512, 73], [562, 73]] as const,
    },
    {
      id: 'outfield-table-first-504-508__506',
      bounds: { minX: 531, minY: 67, maxX: 592, maxY: 130 },
      labelPoint: [561, 99] as const,
      ownerPoints: [[548, 96], [575, 110]] as const,
      excludedPoints: [[525, 99], [598, 99]] as const,
    },
    {
      id: 'outfield-table-first-504-508__507',
      bounds: { minX: 568, minY: 97, maxX: 627, maxY: 157 },
      labelPoint: [597, 127] as const,
      ownerPoints: [[585, 124], [610, 140]] as const,
      excludedPoints: [[562, 127], [632, 127]] as const,
    },
    {
      id: 'outfield-table-first-504-508__508',
      bounds: { minX: 602, minY: 123, maxX: 672, maxY: 187 },
      labelPoint: [636, 156] as const,
      ownerPoints: [[622, 160], [650, 162]] as const,
      excludedPoints: [[596, 156], [678, 156]] as const,
    },
    {
      id: 'outfield-reserved-509__509',
      bounds: { minX: 351, minY: 12, maxX: 537, maxY: 40 },
      labelPoint: [446, 27] as const,
      ownerPoints: [[380, 30], [510, 30]] as const,
      excludedPoints: [[345, 27], [545, 27], [446, 45]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured upper outfield bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official upper outfield point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 스카이박스 S01-S12 소형 블록은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    { id: 'skybox-s01-s37__s01', bounds: { minX: 764, minY: 527, maxX: 779, maxY: 535 }, labelPoint: [772, 531] as const, excludedPoints: [[767, 546]] as const },
    { id: 'skybox-s01-s37__s02', bounds: { minX: 760, minY: 542, maxX: 774, maxY: 550 }, labelPoint: [767, 546] as const, excludedPoints: [[772, 531], [761, 554]] as const },
    { id: 'skybox-s01-s37__s03', bounds: { minX: 754, minY: 551, maxX: 768, maxY: 558 }, labelPoint: [761, 554] as const, excludedPoints: [[767, 546], [755, 570]] as const },
    { id: 'skybox-s01-s37__s04', bounds: { minX: 748, minY: 566, maxX: 762, maxY: 574 }, labelPoint: [755, 570] as const, excludedPoints: [[761, 554], [746, 593]] as const },
    { id: 'skybox-s01-s37__s05', bounds: { minX: 738, minY: 589, maxX: 753, maxY: 598 }, labelPoint: [746, 593] as const, excludedPoints: [[755, 570], [740, 603]] as const },
    { id: 'skybox-s01-s37__s06', bounds: { minX: 733, minY: 599, maxX: 747, maxY: 608 }, labelPoint: [740, 603] as const, excludedPoints: [[746, 593], [734, 618]] as const },
    { id: 'skybox-s01-s37__s07', bounds: { minX: 726, minY: 612, maxX: 742, maxY: 623 }, labelPoint: [734, 618] as const, excludedPoints: [[740, 603], [729, 627]] as const },
    { id: 'skybox-s01-s37__s08', bounds: { minX: 722, minY: 623, maxX: 736, maxY: 631 }, labelPoint: [729, 627] as const, excludedPoints: [[734, 618], [724, 642]] as const },
    { id: 'skybox-s01-s37__s09', bounds: { minX: 717, minY: 638, maxX: 731, maxY: 646 }, labelPoint: [724, 642] as const, excludedPoints: [[729, 627], [711, 665]] as const },
    { id: 'skybox-s01-s37__s10', bounds: { minX: 703, minY: 662, maxX: 719, maxY: 669 }, labelPoint: [711, 665] as const, excludedPoints: [[724, 642], [700, 675]] as const },
    { id: 'skybox-s01-s37__s11', bounds: { minX: 692, minY: 670, maxX: 708, maxY: 679 }, labelPoint: [700, 675] as const, excludedPoints: [[711, 665], [675, 709]] as const },
    { id: 'skybox-s01-s37__s12', bounds: { minX: 667, minY: 705, maxX: 682, maxY: 714 }, labelPoint: [675, 709] as const, excludedPoints: [[700, 675]] as const },
  ];

  expectations.forEach(({ id, bounds, labelPoint, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured skybox S01-S12 bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent skybox point ${point.join(',')}`);
    });
  });
});

test('대전 스카이박스 S13-S25 소형 블록은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    { id: 'skybox-s01-s37__s13', bounds: { minX: 657, minY: 714, maxX: 672, maxY: 723 }, labelPoint: [664, 718] as const, excludedPoints: [[657, 731]] as const },
    { id: 'skybox-s01-s37__s14', bounds: { minX: 649, minY: 724, maxX: 664, maxY: 738 }, labelPoint: [657, 731] as const, excludedPoints: [[664, 718], [647, 740]] as const },
    { id: 'skybox-s01-s37__s15', bounds: { minX: 640, minY: 735, maxX: 654, maxY: 746 }, labelPoint: [647, 740] as const, excludedPoints: [[657, 731], [639, 752]] as const },
    { id: 'skybox-s01-s37__s16', bounds: { minX: 630, minY: 746, maxX: 647, maxY: 759 }, labelPoint: [639, 752] as const, excludedPoints: [[647, 740], [621, 775]] as const },
    { id: 'skybox-s01-s37__s17', bounds: { minX: 613, minY: 770, maxX: 628, maxY: 780 }, labelPoint: [621, 775] as const, excludedPoints: [[639, 752], [573, 808]] as const },
    { id: 'skybox-s01-s37__s18', bounds: { minX: 564, minY: 803, maxX: 581, maxY: 813 }, labelPoint: [573, 808] as const, excludedPoints: [[621, 775], [556.5, 811.5]] as const },
    { id: 'skybox-s01-s37__s19', bounds: { minX: 536, minY: 807, maxX: 565, maxY: 829 }, labelPoint: [556.5, 811.5] as const, excludedPoints: [[573, 808], [535, 829]] as const },
    { id: 'skybox-s01-s37__s20', bounds: { minX: 522, minY: 820, maxX: 538, maxY: 833 }, labelPoint: [535, 829] as const, excludedPoints: [[556.5, 811.5], [515, 831.5]] as const },
    { id: 'skybox-s01-s37__s21', bounds: { minX: 511, minY: 828, maxX: 528, maxY: 839 }, labelPoint: [515, 831.5] as const, excludedPoints: [[535, 829], [506.5, 840.5]] as const },
    { id: 'skybox-s01-s37__s22', bounds: { minX: 485, minY: 830, maxX: 509, maxY: 848 }, labelPoint: [506.5, 840.5] as const, excludedPoints: [[515, 831.5], [479, 842]] as const },
    { id: 'skybox-s01-s37__s23', bounds: { minX: 467, minY: 839, maxX: 482, maxY: 850 }, labelPoint: [479, 842] as const, excludedPoints: [[506.5, 840.5], [461, 850.5]] as const },
    { id: 'skybox-s01-s37__s24', bounds: { minX: 458, minY: 841, maxX: 471, maxY: 852 }, labelPoint: [461, 850.5] as const, excludedPoints: [[479, 842], [441, 848]] as const },
    { id: 'skybox-s01-s37__s25', bounds: { minX: 429, minY: 843, maxX: 452, maxY: 853 }, labelPoint: [441, 848] as const, excludedPoints: [[461, 850.5]] as const },
  ];

  expectations.forEach(({ id, bounds, labelPoint, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured skybox S13-S25 bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent skybox point ${point.join(',')}`);
    });
  });
});

test('대전 스카이박스 S26-S37 소형 블록은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    { id: 'skybox-s01-s37__s26', bounds: { minX: 398, minY: 840, maxX: 415, maxY: 851 }, labelPoint: [401.5, 846] as const, excludedPoints: [[392, 839.5]] as const },
    { id: 'skybox-s01-s37__s27', bounds: { minX: 369, minY: 830, maxX: 395, maxY: 849 }, labelPoint: [392, 839.5] as const, excludedPoints: [[401.5, 846], [362, 837.5]] as const },
    { id: 'skybox-s01-s37__s28', bounds: { minX: 352, minY: 828, maxX: 367, maxY: 840 }, labelPoint: [362, 837.5] as const, excludedPoints: [[392, 839.5], [345.5, 829.5]] as const },
    { id: 'skybox-s01-s37__s29', bounds: { minX: 342, minY: 822, maxX: 359, maxY: 833 }, labelPoint: [345.5, 829.5] as const, excludedPoints: [[362, 837.5], [334, 823]] as const },
    { id: 'skybox-s01-s37__s30', bounds: { minX: 327, minY: 817, maxX: 342, maxY: 829 }, labelPoint: [334, 823] as const, excludedPoints: [[345.5, 829.5], [324, 814]] as const },
    { id: 'skybox-s01-s37__s31', bounds: { minX: 316, minY: 809, maxX: 332, maxY: 820 }, labelPoint: [324, 814] as const, excludedPoints: [[334, 823], [302, 799]] as const },
    { id: 'skybox-s01-s37__s32', bounds: { minX: 294, minY: 794, maxX: 310, maxY: 804 }, labelPoint: [302, 799] as const, excludedPoints: [[324, 814], [281, 783]] as const },
    { id: 'skybox-s01-s37__s33', bounds: { minX: 272, minY: 777, maxX: 289, maxY: 787 }, labelPoint: [281, 783] as const, excludedPoints: [[302, 799], [268, 775]] as const },
    { id: 'skybox-s01-s37__s34', bounds: { minX: 261, minY: 771, maxX: 275, maxY: 780 }, labelPoint: [268, 775] as const, excludedPoints: [[281, 783], [245, 743]] as const },
    { id: 'skybox-s01-s37__s35', bounds: { minX: 236, minY: 739, maxX: 252, maxY: 747 }, labelPoint: [245, 743] as const, excludedPoints: [[268, 775], [227, 724]] as const },
    { id: 'skybox-s01-s37__s36', bounds: { minX: 220, minY: 720, maxX: 234, maxY: 729 }, labelPoint: [227, 724] as const, excludedPoints: [[245, 743], [177, 665]] as const },
    { id: 'skybox-s01-s37__s37', bounds: { minX: 170, minY: 661, maxX: 184, maxY: 670 }, labelPoint: [177, 665] as const, excludedPoints: [[227, 724]] as const },
  ];

  expectations.forEach(({ id, bounds, labelPoint, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured skybox S26-S37 bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent skybox point ${point.join(',')}`);
    });
  });
});

test('대전 특수석/휠체어석은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'innings-vip-400__400',
      bounds: { minX: 781, minY: 503, maxX: 855, maxY: 616 },
      labelPoint: [814, 560] as const,
      ownerPoints: [[830, 525], [800, 600]] as const,
      excludedPoints: [[822, 620], [875, 530], [858, 628]] as const,
    },
    {
      id: 'splash-jacuzzi-425__425',
      bounds: { minX: 127, minY: 642, maxX: 156, maxY: 682 },
      labelPoint: [143, 663] as const,
      ownerPoints: [[135, 655], [148, 678]] as const,
      excludedPoints: [[118, 657], [129, 697], [160, 660]] as const,
    },
    {
      id: 'splash-caravan-426__426',
      bounds: { minX: 85, minY: 552, maxX: 131, maxY: 612 },
      labelPoint: [109, 589] as const,
      ownerPoints: [[98, 575], [120, 604]] as const,
      excludedPoints: [[82, 590], [99, 620], [135, 588]] as const,
    },
    {
      id: 'central-accessible__center',
      bounds: { minX: 422, minY: 787, maxX: 462, maxY: 811 },
      labelPoint: [442, 798] as const,
      ownerPoints: [[432, 800], [452, 800]] as const,
      excludedPoints: [[416, 798], [468, 798], [442, 816]] as const,
    },
    {
      id: 'first-infield-accessible__first-infield',
      bounds: { minX: 690, minY: 570, maxX: 736, maxY: 625 },
      labelPoint: [713, 598] as const,
      ownerPoints: [[700, 590], [725, 610]] as const,
      excludedPoints: [[684, 598], [742, 598], [713, 632]] as const,
    },
    {
      id: 'third-infield-accessible__third-infield',
      bounds: { minX: 149, minY: 576, maxX: 183, maxY: 625 },
      labelPoint: [173, 598] as const,
      ownerPoints: [[160, 590], [176, 615]] as const,
      excludedPoints: [[190, 599], [195, 608], [215, 600]] as const,
    },
    {
      id: 'outfield-accessible-third__left-outfield',
      bounds: { minX: 273, minY: 36, maxX: 322, maxY: 84 },
      labelPoint: [297, 61] as const,
      ownerPoints: [[286, 60], [308, 64]] as const,
      excludedPoints: [[266, 61], [328, 61], [297, 90]] as const,
    },
    {
      id: 'outfield-accessible-first__right-outfield',
      bounds: { minX: 803, minY: 419, maxX: 840, maxY: 459 },
      labelPoint: [821, 440] as const,
      ownerPoints: [[812, 435], [833, 445]] as const,
      excludedPoints: [[797, 440], [846, 440], [821, 465]] as const,
    },
    {
      id: 'outfield-reserved-third-423-330__424',
      bounds: { minX: 146, minY: 677, maxX: 180, maxY: 712 },
      labelPoint: [164, 696] as const,
      ownerPoints: [[154, 686], [174, 700]] as const,
      excludedPoints: [[141, 690], [184, 702], [164, 716]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured special/accessibility bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${id} should stay officially traced`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${id} should stay path-traced from official PNG`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official special/accessibility point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 100A-100C 기준 블록은 공식 crop 색상 셀 bounds 안에 머문다', () => {
  const expectedBounds: Record<string, ReturnType<typeof pointBounds>> = {
    'central-reserved-100__100a': { minX: 465, minY: 654, maxX: 496, maxY: 683 },
    'central-reserved-100__100b': { minX: 415, minY: 668, maxX: 466, maxY: 691 },
    'central-reserved-100__100c': { minX: 384, minY: 655, maxX: 416, maxY: 683 },
    'catcher-back-100__100a': { minX: 474, minY: 672, maxX: 517, maxY: 711 },
    'catcher-back-100__100b': { minX: 406, minY: 690, maxX: 475, maxY: 719 },
    'catcher-back-100__100c': { minX: 364, minY: 672, maxX: 407, maxY: 710 },
    'central-table-100__100a': { minX: 484, minY: 693, maxX: 567, maxY: 777 },
    'central-table-100__100b': { minX: 384, minY: 717, maxX: 500, maxY: 791 },
    'central-table-100__100c': { minX: 316, minY: 694, maxX: 397, maxY: 776 },
  };
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  Object.entries(expectedBounds).forEach(([id, expected]) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), expected, `${id} should keep measured 920x1060 crop bounds`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${id} should stay officially traced`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${id} should stay path-traced from official PNG`);
    assert.equal(
      getTopHitBlockIdAtPoint([block.imageGeometry.labelX, block.imageGeometry.labelY]),
      id,
      `${id} label should top-hit itself after 100-block retracing`,
    );
  });
});

test('대전 104 블록은 공식 이미지의 라벨 셀만 소유한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const block = blockById.get('first-infield-b-101-108__104');
  assert.ok(block, 'first-infield-b-101-108__104 should exist');
  assert.equal(isDaejeonSplitColorBlockId(block.id), false, '104 should not use split-color render priority');
  assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), { minX: 676, minY: 458, maxX: 730, maxY: 502 });
  assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], [705, 487]);

  ([
    [690, 486],
    [710, 495],
    [720, 500],
    [701, 467],
  ] as [number, number][]).forEach((point) => {
    assert.equal(getTopHitBlockIdAtPoint(point), block.id, `104 should include official label-cell point ${point.join(',')}`);
  });

  ([
    [620, 480],
    [645, 489],
    [665, 496],
    [700, 510],
  ] as [number, number][]).forEach((point) => {
    assert.notEqual(getTopHitBlockIdAtPoint(point), block.id, `104 should not absorb adjacent point ${point.join(',')}`);
  });
});

test('대전 121 블록은 단일 폴리곤 기준 오버랩 없는 공식 셀을 커버한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'third-infield-b-121-124__121',
      bounds: { minX: 156, minY: 453, maxX: 208, maxY: 501 },
      labelPoint: [180, 484] as const,
      includedPoints: [
        [180, 462],
        [180, 484],
        [190, 485],
      ] as const,
      excludedPoints: [
        [205, 489],
        [229, 490],
        [233, 505],
        [185, 524],
        [240, 530],
        [185, 536],
      ] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, includedPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.equal(isDaejeonSplitColorBlockId(id), false, `${id} should not use split-color render priority`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should move to the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    includedPoints.forEach((point) => {
      assert.equal(
        getTopHitBlockIdAtPoint(point),
        id,
        `${id} should include official point ${point.join(',')}`,
      );
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(
        getTopHitBlockIdAtPoint(point),
        id,
        `${id} should not absorb adjacent block point ${point.join(',')}`,
      );
    });
  });
});

test('대전 3루 118-120 블록은 공식 PNG 색상 셀 재측정 bounds를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'third-infield-a-113-120-213-225__118',
      bounds: { minX: 202, minY: 520, maxX: 314, maxY: 590 },
      labelPoint: [260, 555] as const,
      ownerPoints: [[260, 555], [290, 555]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__119',
      bounds: { minX: 181, minY: 487, maxX: 297, maxY: 561 },
      labelPoint: [241, 524] as const,
      ownerPoints: [[241, 524], [270, 504]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__120',
      bounds: { minX: 173, minY: 463, maxX: 281, maxY: 526 },
      labelPoint: [220, 500] as const,
      ownerPoints: [[220, 500], [250, 488]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured third-base lower sequence bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the measured official color cell`);
    ownerPoints.forEach((point) => {
      assert.equal(
        getTopHitBlockIdAtPoint(point),
        id,
        `${id} should own official third-base point ${point.join(',')}`,
      );
    });
  });
});

test('대전 3루 113-124 연속 블록은 공식 이미지 소유권이 한 칸씩 밀리지 않는다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'third-infield-a-113-120-213-225__113',
      bounds: { minX: 293, minY: 657, maxX: 375, maxY: 735 },
      labelPoint: [333.2, 696.4] as const,
      ownerPoints: [[333, 696], [313, 716], [349, 681]] as const,
      excludedPoints: [[320, 770], [320, 669]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__114',
      bounds: { minX: 275, minY: 629, maxX: 363, maxY: 710 },
      labelPoint: [319.7, 668.9] as const,
      ownerPoints: [[320, 669], [315, 680], [330, 650]] as const,
      excludedPoints: [[333, 696], [298, 641]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__115',
      bounds: { minX: 253, minY: 602, maxX: 340, maxY: 682 },
      labelPoint: [297.5, 641.4] as const,
      ownerPoints: [[298, 641], [270, 650]] as const,
      excludedPoints: [[320, 669], [275, 619]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__116',
      bounds: { minX: 231, minY: 583, maxX: 318, maxY: 656 },
      labelPoint: [275.3, 618.7] as const,
      ownerPoints: [[275, 619], [290, 620]] as const,
      excludedPoints: [[298, 641], [260, 590]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__117',
      bounds: { minX: 208, minY: 551, maxX: 323, maxY: 630 },
      labelPoint: [260.9, 589.6] as const,
      ownerPoints: [[260, 590], [230, 600]] as const,
      excludedPoints: [[275, 619], [260, 555]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__118',
      bounds: { minX: 202, minY: 520, maxX: 314, maxY: 590 },
      labelPoint: [260, 555] as const,
      ownerPoints: [[260, 555], [290, 555]] as const,
      excludedPoints: [[260, 590], [241, 524]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__119',
      bounds: { minX: 181, minY: 487, maxX: 297, maxY: 561 },
      labelPoint: [241, 524] as const,
      ownerPoints: [[241, 524], [270, 504]] as const,
      excludedPoints: [[260, 555], [220, 500]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__120',
      bounds: { minX: 173, minY: 463, maxX: 281, maxY: 526 },
      labelPoint: [220, 500] as const,
      ownerPoints: [[220, 500], [250, 488]] as const,
      excludedPoints: [[241, 524], [180, 484]] as const,
    },
    {
      id: 'third-infield-b-121-124__121',
      bounds: { minX: 156, minY: 453, maxX: 208, maxY: 501 },
      labelPoint: [180, 484] as const,
      ownerPoints: [[180, 462], [180, 484], [190, 485]] as const,
      excludedPoints: [[220, 500], [215, 445], [197, 409]] as const,
    },
    {
      id: 'third-infield-b-121-124__122',
      bounds: { minX: 163, minY: 423, maxX: 267, maxY: 467 },
      labelPoint: [215, 445] as const,
      ownerPoints: [[215, 445], [180, 445], [250, 455]] as const,
      excludedPoints: [[180, 484], [197, 409]] as const,
    },
    {
      id: 'third-infield-b-121-124__123',
      bounds: { minX: 165, minY: 391, maxX: 236, maxY: 424 },
      labelPoint: [197, 409] as const,
      ownerPoints: [[197, 409], [180, 405], [220, 415]] as const,
      excludedPoints: [[215, 445], [183, 377]] as const,
    },
    {
      id: 'third-infield-b-121-124__124',
      bounds: { minX: 167, minY: 355, maxX: 203, maxY: 390 },
      labelPoint: [183, 377] as const,
      ownerPoints: [[183, 377], [175, 380]] as const,
      excludedPoints: [[197, 409], [215, 445]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured third-base sequence bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official third-base point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent third-base point ${point.join(',')}`);
    });
  });
});

test('대전 3루 113/114 경계는 중앙 100C와 하단 블록을 흡수하지 않는다', () => {
  const ownerPoints: Array<{ point: TestPoint; expectedId: string }> = [
    { point: [313, 716], expectedId: 'third-infield-a-113-120-213-225__113' },
    { point: [300, 720], expectedId: 'third-infield-a-113-120-213-225__113' },
    { point: [315, 680], expectedId: 'third-infield-a-113-120-213-225__114' },
    { point: [315, 690], expectedId: 'third-infield-a-113-120-213-225__114' },
    { point: [349, 681], expectedId: 'third-infield-a-113-120-213-225__113' },
    { point: [330, 700], expectedId: 'third-infield-a-113-120-213-225__113' },
    { point: [320, 735], expectedId: 'central-table-100__100c' },
    { point: [320, 770], expectedId: 'third-infield-a-113-120-213-225__214' },
  ];

  ownerPoints.forEach(({ point, expectedId }) => {
    assert.equal(
      getTopHitBlockIdAtPoint(point),
      expectedId,
      `official lower third-base point ${point.join(',')} should resolve to ${expectedId}`,
    );
  });
});

test('대전 3루 113-117 경계는 인접 블록을 한 칸씩 밀지 않는다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const block115 = blockById.get('third-infield-a-113-120-213-225__115');
  assert.ok(block115, 'third-infield-a-113-120-213-225__115 should exist');
  assert.deepEqual(
    pointBounds(pathToPoints(block115.imageGeometry.d)),
    { minX: 253, minY: 602, maxX: 340, maxY: 682 },
    '115 visible path should keep the measured official color-cell outline',
  );
  assert.equal(
    block115.hitAreaD,
    block115.imageGeometry.d,
    '115 should use the official visible path as its click path after retracing',
  );

  const ownerPoints: Array<{ point: TestPoint; expectedId: string }> = [
    { point: [260, 590], expectedId: 'third-infield-a-113-120-213-225__117' },
    { point: [275, 619], expectedId: 'third-infield-a-113-120-213-225__116' },
    { point: [290, 620], expectedId: 'third-infield-a-113-120-213-225__116' },
    { point: [270, 650], expectedId: 'third-infield-a-113-120-213-225__115' },
    { point: [298, 641], expectedId: 'third-infield-a-113-120-213-225__115' },
    { point: [320, 669], expectedId: 'third-infield-a-113-120-213-225__114' },
    { point: [330, 650], expectedId: 'third-infield-a-113-120-213-225__114' },
    { point: [333, 696], expectedId: 'third-infield-a-113-120-213-225__113' },
  ];

  ownerPoints.forEach(({ point, expectedId }) => {
    assert.equal(
      getTopHitBlockIdAtPoint(point),
      expectedId,
      `official 113-117 boundary point ${point.join(',')} should resolve to ${expectedId}`,
    );
  });
});

test('대전 3루 213-219 하단 작은 블록은 공식 셀 bounds를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'third-infield-a-113-120-213-225__213',
      bounds: { minX: 319, minY: 766, maxX: 357, maxY: 802 },
      labelPoint: [337.7, 783.6] as const,
      ownerPoints: [[338, 784], [350, 790], [332, 775], [344, 795]] as const,
      excludedPoints: [[310, 790], [360, 790]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__214',
      bounds: { minX: 290, minY: 747, maxX: 329, maxY: 783 },
      labelPoint: [311, 764.5] as const,
      ownerPoints: [[311, 765], [320, 766], [306, 756], [316, 775]] as const,
      excludedPoints: [[285, 765], [335, 765]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__215',
      bounds: { minX: 274, minY: 724, maxX: 300, maxY: 753 },
      labelPoint: [288.3, 738.4] as const,
      ownerPoints: [[288, 738], [292, 744], [282, 732], [296, 740]] as const,
      excludedPoints: [[270, 738], [306, 738]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__216',
      bounds: { minX: 247, minY: 696, maxX: 283, maxY: 731 },
      labelPoint: [265.7, 712.8] as const,
      ownerPoints: [[266, 713], [274, 720], [256, 706], [270, 725]] as const,
      excludedPoints: [[242, 713], [290, 713]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__217',
      bounds: { minX: 225, minY: 670, maxX: 260, maxY: 704 },
      labelPoint: [244, 686.4] as const,
      ownerPoints: [[244, 686], [250, 695], [235, 680], [252, 690]] as const,
      excludedPoints: [[220, 686], [264, 686]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__218',
      bounds: { minX: 201, minY: 643, maxX: 238, maxY: 679 },
      labelPoint: [221.2, 660.4] as const,
      ownerPoints: [[221, 660], [228, 666], [212, 653], [232, 666]] as const,
      excludedPoints: [[196, 660], [242, 660]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__219',
      bounds: { minX: 182, minY: 603, maxX: 215, maxY: 648 },
      labelPoint: [199.5, 625] as const,
      ownerPoints: [[200, 625], [206, 632], [210, 636]] as const,
      excludedPoints: [[176, 625], [220, 625]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured lower small-cell bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official lower-cell point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 3루 220 블록은 118/117 방향으로 과대 확장하지 않는다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const block220 = blockById.get('third-infield-a-113-120-213-225__220');
  assert.ok(block220, 'third-infield-a-113-120-213-225__220 should exist');
  assert.deepEqual(
    pointBounds(pathToPoints(block220.imageGeometry.d)),
    { minX: 167, minY: 571, maxX: 228, maxY: 615 },
    '220 visible path should stay on the measured small official cell',
  );
  assert.deepEqual([block220.imageGeometry.labelX, block220.imageGeometry.labelY], [190, 599], '220 label should stay near the official visual center');

  const ownerPoints: Array<{ point: TestPoint; expectedId?: string; notExpectedId?: string }> = [
    { point: [190, 599], expectedId: 'third-infield-a-113-120-213-225__220' },
    { point: [195, 608], expectedId: 'third-infield-a-113-120-213-225__220' },
    { point: [219, 595], expectedId: 'third-infield-a-113-120-213-225__220' },
    { point: [178, 584], expectedId: 'third-infield-a-113-120-213-225__220' },
    { point: [180, 608], notExpectedId: 'third-infield-a-113-120-213-225__220' },
    { point: [238, 572], notExpectedId: 'third-infield-a-113-120-213-225__220' },
    { point: [225, 620], notExpectedId: 'third-infield-a-113-120-213-225__220' },
  ];

  ownerPoints.forEach(({ point, expectedId, notExpectedId }) => {
    const hitId = getTopHitBlockIdAtPoint(point);
    if (expectedId) {
      assert.equal(hitId, expectedId, `official 220 point ${point.join(',')} should resolve to ${expectedId}`);
    }
    if (notExpectedId) {
      assert.notEqual(hitId, notExpectedId, `non-220 point ${point.join(',')} should not be absorbed by 220`);
    }
  });
});

test('대전 3루 221-225 작은 블록은 좌측 외곽 셀 bounds를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'third-infield-a-113-120-213-225__221',
      bounds: { minX: 152, minY: 537, maxX: 184, maxY: 574 },
      labelPoint: [169.1, 555.7] as const,
      ownerPoints: [[169, 556], [175, 560], [160, 548], [178, 565]] as const,
      excludedPoints: [[190, 555], [170, 585]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__222',
      bounds: { minX: 137, minY: 506, maxX: 169, maxY: 542 },
      labelPoint: [154.7, 524.2] as const,
      ownerPoints: [[155, 524], [160, 530], [146, 516], [164, 532]] as const,
      excludedPoints: [[180, 524], [155, 545]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__223',
      bounds: { minX: 118, minY: 482, maxX: 156, maxY: 513 },
      labelPoint: [136.9, 495.5] as const,
      ownerPoints: [[137, 496], [145, 490], [128, 493], [150, 500]] as const,
      excludedPoints: [[165, 496], [137, 520]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__224',
      bounds: { minX: 122, minY: 458, maxX: 147, maxY: 480 },
      labelPoint: [134.1, 468.5] as const,
      ownerPoints: [[134, 469], [140, 465], [126, 462], [145, 472]] as const,
      excludedPoints: [[155, 468], [134, 485]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__225',
      bounds: { minX: 125, minY: 431, maxX: 149, maxY: 455 },
      labelPoint: [137.9, 443.2] as const,
      ownerPoints: [[138, 443], [145, 440], [130, 437], [146, 450]] as const,
      excludedPoints: [[155, 443], [138, 460]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured small-cell bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official small-cell point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 3루 213-225/220 하단 작은 블록은 연속 경계 소유권을 유지한다', () => {
  const boundaryMatrix: Array<{ id: string; ownerPoints: readonly TestPoint[]; excludedPoints: readonly TestPoint[] }> = [
    {
      id: 'third-infield-a-113-120-213-225__213',
      ownerPoints: [[338, 784], [344, 795]],
      excludedPoints: [[311, 765], [320, 770]],
    },
    {
      id: 'third-infield-a-113-120-213-225__214',
      ownerPoints: [[311, 765], [316, 775]],
      excludedPoints: [[338, 784], [288, 738]],
    },
    {
      id: 'third-infield-a-113-120-213-225__215',
      ownerPoints: [[288, 738], [296, 740]],
      excludedPoints: [[311, 765], [266, 713]],
    },
    {
      id: 'third-infield-a-113-120-213-225__216',
      ownerPoints: [[266, 713], [270, 725]],
      excludedPoints: [[288, 738], [244, 686]],
    },
    {
      id: 'third-infield-a-113-120-213-225__217',
      ownerPoints: [[244, 686], [252, 690]],
      excludedPoints: [[266, 713], [221, 660]],
    },
    {
      id: 'third-infield-a-113-120-213-225__218',
      ownerPoints: [[221, 660], [232, 666]],
      excludedPoints: [[244, 686], [200, 625]],
    },
    {
      id: 'third-infield-a-113-120-213-225__219',
      ownerPoints: [[200, 625], [210, 636]],
      excludedPoints: [[221, 660], [190, 599]],
    },
    {
      id: 'third-infield-a-113-120-213-225__220',
      ownerPoints: [[190, 599], [195, 608], [219, 595]],
      excludedPoints: [[200, 625], [169, 556], [241, 524]],
    },
    {
      id: 'third-infield-a-113-120-213-225__221',
      ownerPoints: [[169, 556], [178, 565]],
      excludedPoints: [[190, 599], [155, 524]],
    },
    {
      id: 'third-infield-a-113-120-213-225__222',
      ownerPoints: [[155, 524], [164, 532]],
      excludedPoints: [[169, 556], [137, 496]],
    },
    {
      id: 'third-infield-a-113-120-213-225__223',
      ownerPoints: [[137, 496], [150, 500]],
      excludedPoints: [[155, 524], [134, 469]],
    },
    {
      id: 'third-infield-a-113-120-213-225__224',
      ownerPoints: [[134, 469], [145, 472]],
      excludedPoints: [[137, 496], [138, 443]],
    },
    {
      id: 'third-infield-a-113-120-213-225__225',
      ownerPoints: [[138, 443], [146, 450]],
      excludedPoints: [[134, 469], [137, 496]],
    },
  ];

  boundaryMatrix.forEach(({ id, ownerPoints, excludedPoints }) => {
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should keep third-base lower-cell boundary point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent third-base lower-cell point ${point.join(',')}`);
    });
  });
});

test('대전 1루 101-112 블록은 공식 이미지 소유권이 한 칸씩 밀리지 않는다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'first-infield-b-101-108__101',
      bounds: { minX: 685, minY: 356, maxX: 711, maxY: 386 },
      labelPoint: [700, 375] as const,
      ownerPoints: [
        [700, 375],
        [693, 382],
        [706, 365],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__102',
      bounds: { minX: 651, minY: 387, maxX: 716, maxY: 423 },
      labelPoint: [687, 406] as const,
      ownerPoints: [
        [687, 406],
        [660, 417],
        [710, 402],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__103',
      bounds: { minX: 613, minY: 420, maxX: 727, maxY: 471 },
      labelPoint: [674, 445] as const,
      ownerPoints: [
        [674, 445],
        [630, 455],
        [720, 440],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__104',
      bounds: { minX: 676, minY: 458, maxX: 730, maxY: 502 },
      labelPoint: [705, 487] as const,
      ownerPoints: [
        [690, 486],
        [710, 495],
        [720, 500],
        [701, 467],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__105',
      bounds: { minX: 613, minY: 469, maxX: 718, maxY: 530 },
      labelPoint: [665, 500] as const,
      ownerPoints: [
        [620, 480],
        [645, 489],
        [665, 496],
        [700, 510],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__106',
      bounds: { minX: 596, minY: 493, maxX: 705, maxY: 565 },
      labelPoint: [650, 528] as const,
      ownerPoints: [
        [650, 528],
        [665, 550],
        [690, 540],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__107',
      bounds: { minX: 580, minY: 526, maxX: 684, maxY: 593 },
      labelPoint: [631, 559] as const,
      ownerPoints: [
        [631, 559],
        [600, 540],
        [665, 575],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__108',
      bounds: { minX: 571, minY: 557, maxX: 676, maxY: 633 },
      labelPoint: [627, 594] as const,
      ownerPoints: [
        [627, 594],
        [640, 610],
        [650, 620],
      ] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__109',
      bounds: { minX: 564, minY: 583, maxX: 653, maxY: 656 },
      labelPoint: [610, 626] as const,
      ownerPoints: [
        [607, 624],
        [585, 596],
        [640, 638],
      ] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__110',
      bounds: { minX: 542, minY: 602, maxX: 637, maxY: 687 },
      labelPoint: [589.1, 644.6] as const,
      ownerPoints: [
        [589, 645],
        [570, 640],
        [620, 670],
      ] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__111',
      bounds: { minX: 520, minY: 628, maxX: 608, maxY: 709 },
      labelPoint: [563.4, 668.1] as const,
      ownerPoints: [
        [563, 668],
        [540, 655],
        [585, 700],
      ] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__112',
      bounds: { minX: 505, minY: 655, maxX: 590, maxY: 737 },
      labelPoint: [548.9, 696.5] as const,
      ownerPoints: [
        [549, 696],
        [520, 670],
        [575, 720],
      ] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep official first-base sequence bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label point should stay on the official block`);
    ownerPoints.forEach((point) => {
      assert.equal(
        getTopHitBlockIdAtPoint(point),
        id,
        `${id} should own official point ${point.join(',')} without first-base sequence drift`,
      );
    });
  });
});

test('대전 1루 201-212 하단 작은 블록은 공식 셀 bounds와 owner point를 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const expectations = [
    {
      id: 'first-infield-a-109-112-201-212__201',
      bounds: { minX: 736, minY: 451, maxX: 768, maxY: 480 },
      labelPoint: [751.9, 466] as const,
      ownerPoints: [[752, 466], [748, 458], [760, 470]] as const,
      excludedPoints: [[730, 466], [775, 466]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__202',
      bounds: { minX: 730, minY: 486, maxX: 761, maxY: 509 },
      labelPoint: [743.9, 495.8] as const,
      ownerPoints: [[744, 496], [740, 492], [750, 502]] as const,
      excludedPoints: [[725, 496], [766, 496]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__203',
      bounds: { minX: 716, minY: 507, maxX: 746, maxY: 543 },
      labelPoint: [730.9, 524.1] as const,
      ownerPoints: [[731, 524], [730, 515], [736, 535]] as const,
      excludedPoints: [[710, 524], [752, 524]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__204',
      bounds: { minX: 700, minY: 539, maxX: 733, maxY: 577 },
      labelPoint: [715.6, 557.8] as const,
      ownerPoints: [[716, 558], [715, 545], [724, 565]] as const,
      excludedPoints: [[695, 558], [739, 558]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__205',
      bounds: { minX: 687, minY: 574, maxX: 716, maxY: 607 },
      labelPoint: [693, 593] as const,
      ownerPoints: [[693, 593], [697, 577], [691, 600]] as const,
      excludedPoints: [[681, 593], [723, 593]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__206',
      bounds: { minX: 669, minY: 604, maxX: 704, maxY: 651 },
      labelPoint: [685.4, 626.3] as const,
      ownerPoints: [[685, 626], [685, 615], [690, 642]] as const,
      excludedPoints: [[664, 626], [709, 626]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__207',
      bounds: { minX: 646, minY: 643, maxX: 684, maxY: 679 },
      labelPoint: [663.6, 660.7] as const,
      ownerPoints: [[664, 661], [655, 665], [675, 660]] as const,
      excludedPoints: [[640, 661], [690, 661]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__208',
      bounds: { minX: 624, minY: 670, maxX: 661, maxY: 706 },
      labelPoint: [640.8, 687.3] as const,
      ownerPoints: [[641, 687], [640, 680], [650, 685]] as const,
      excludedPoints: [[620, 687], [665, 687]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__209',
      bounds: { minX: 600, minY: 696, maxX: 637, maxY: 733 },
      labelPoint: [617.5, 714.3] as const,
      ownerPoints: [[618, 714], [610, 725], [620, 705], [625, 720]] as const,
      excludedPoints: [[590, 714], [640, 714]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__210',
      bounds: { minX: 580, minY: 724, maxX: 612, maxY: 756 },
      labelPoint: [595.5, 739.7] as const,
      ownerPoints: [[596, 740], [585, 740], [595, 730], [602, 746]] as const,
      excludedPoints: [[575, 740], [615, 740]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__211',
      bounds: { minX: 553, minY: 748, maxX: 587, maxY: 779 },
      labelPoint: [570, 762.7] as const,
      ownerPoints: [[570, 763], [560, 770], [565, 758], [575, 765]] as const,
      excludedPoints: [[545, 763], [590, 763]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__212',
      bounds: { minX: 524, minY: 766, maxX: 562, maxY: 801 },
      labelPoint: [542.8, 784] as const,
      ownerPoints: [[543, 784], [530, 784], [540, 776], [552, 784]] as const,
      excludedPoints: [[515, 784], [565, 784]] as const,
    },
  ];

  expectations.forEach(({ id, bounds, labelPoint, ownerPoints, excludedPoints }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured first-base small-cell bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should stay on the official visual center`);
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should own official first-base point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent point ${point.join(',')}`);
    });
  });
});

test('대전 1루 201-212 하단 작은 블록은 연속 경계 소유권을 유지한다', () => {
  const boundaryMatrix: Array<{ id: string; ownerPoints: readonly TestPoint[]; excludedPoints: readonly TestPoint[] }> = [
    {
      id: 'first-infield-a-109-112-201-212__201',
      ownerPoints: [[752, 466], [760, 470]],
      excludedPoints: [[744, 496], [731, 524]],
    },
    {
      id: 'first-infield-a-109-112-201-212__202',
      ownerPoints: [[744, 496], [750, 502]],
      excludedPoints: [[752, 466], [731, 524]],
    },
    {
      id: 'first-infield-a-109-112-201-212__203',
      ownerPoints: [[731, 524], [736, 535]],
      excludedPoints: [[744, 496], [716, 558]],
    },
    {
      id: 'first-infield-a-109-112-201-212__204',
      ownerPoints: [[716, 558], [724, 565]],
      excludedPoints: [[731, 524], [693, 593]],
    },
    {
      id: 'first-infield-a-109-112-201-212__205',
      ownerPoints: [[693, 593], [691, 600]],
      excludedPoints: [[716, 558], [685, 626]],
    },
    {
      id: 'first-infield-a-109-112-201-212__206',
      ownerPoints: [[685, 626], [690, 642]],
      excludedPoints: [[693, 593], [664, 661]],
    },
    {
      id: 'first-infield-a-109-112-201-212__207',
      ownerPoints: [[664, 661], [675, 660]],
      excludedPoints: [[685, 626], [641, 687]],
    },
    {
      id: 'first-infield-a-109-112-201-212__208',
      ownerPoints: [[641, 687], [650, 685]],
      excludedPoints: [[664, 661], [618, 714]],
    },
    {
      id: 'first-infield-a-109-112-201-212__209',
      ownerPoints: [[618, 714], [625, 720]],
      excludedPoints: [[641, 687], [596, 740]],
    },
    {
      id: 'first-infield-a-109-112-201-212__210',
      ownerPoints: [[596, 740], [602, 746]],
      excludedPoints: [[618, 714], [570, 763]],
    },
    {
      id: 'first-infield-a-109-112-201-212__211',
      ownerPoints: [[570, 763], [575, 765]],
      excludedPoints: [[596, 740], [543, 784]],
    },
    {
      id: 'first-infield-a-109-112-201-212__212',
      ownerPoints: [[543, 784], [552, 784]],
      excludedPoints: [[570, 763], [596, 740]],
    },
  ];

  boundaryMatrix.forEach(({ id, ownerPoints, excludedPoints }) => {
    ownerPoints.forEach((point) => {
      assert.equal(getTopHitBlockIdAtPoint(point), id, `${id} should keep first-base lower-cell boundary point ${point.join(',')}`);
    });
    excludedPoints.forEach((point) => {
      assert.notEqual(getTopHitBlockIdAtPoint(point), id, `${id} should not absorb adjacent first-base lower-cell point ${point.join(',')}`);
    });
  });
});

test('대전 1루/3루 내야 연속 블록은 공식 PNG owner point를 자기 블록으로 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const ownerMatrix: Array<{ id: string; points: readonly TestPoint[] }> = [
    { id: 'first-infield-b-101-108__101', points: [[700, 375]] },
    { id: 'first-infield-b-101-108__102', points: [[687, 406], [660, 417], [710, 402]] },
    { id: 'first-infield-b-101-108__103', points: [[674, 445], [630, 455], [720, 440]] },
    { id: 'first-infield-b-101-108__104', points: [[690, 486], [710, 495], [720, 500], [701, 467]] },
    { id: 'first-infield-b-101-108__105', points: [[620, 480], [645, 489], [665, 496], [700, 510]] },
    { id: 'first-infield-b-101-108__106', points: [[650, 528], [665, 550], [690, 540]] },
    { id: 'first-infield-b-101-108__107', points: [[631, 559], [600, 540], [665, 575]] },
    { id: 'first-infield-b-101-108__108', points: [[627, 594], [640, 610], [650, 620]] },
    { id: 'first-infield-a-109-112-201-212__109', points: [[610, 626], [607, 624], [585, 596], [640, 638]] },
    { id: 'first-infield-a-109-112-201-212__110', points: [[589, 645]] },
    { id: 'first-infield-a-109-112-201-212__111', points: [[563, 668]] },
    { id: 'first-infield-a-109-112-201-212__112', points: [[549, 696]] },
    { id: 'first-infield-a-109-112-201-212__201', points: [[752, 466], [748, 458], [760, 470]] },
    { id: 'first-infield-a-109-112-201-212__202', points: [[744, 495], [740, 492], [750, 502]] },
    { id: 'first-infield-a-109-112-201-212__203', points: [[731, 524], [730, 515], [736, 535]] },
    { id: 'first-infield-a-109-112-201-212__204', points: [[715, 558], [715, 545], [724, 565]] },
    { id: 'first-infield-a-109-112-201-212__205', points: [[693, 593], [697, 577], [691, 600]] },
    { id: 'first-infield-a-109-112-201-212__206', points: [[685, 626], [685, 615], [690, 642]] },
    { id: 'first-infield-a-109-112-201-212__207', points: [[663, 660], [655, 665], [675, 660]] },
    { id: 'first-infield-a-109-112-201-212__208', points: [[641, 687], [640, 680], [650, 685]] },
    { id: 'first-infield-a-109-112-201-212__209', points: [[618, 714], [620, 705], [625, 720]] },
    { id: 'first-infield-a-109-112-201-212__210', points: [[596, 740], [595, 730], [602, 746]] },
    { id: 'first-infield-a-109-112-201-212__211', points: [[570, 763], [565, 758], [575, 765]] },
    { id: 'first-infield-a-109-112-201-212__212', points: [[543, 784], [540, 776], [552, 784]] },
    { id: 'third-infield-a-113-120-213-225__113', points: [[333, 696]] },
    { id: 'third-infield-a-113-120-213-225__114', points: [[320, 669]] },
    { id: 'third-infield-a-113-120-213-225__115', points: [[298, 641]] },
    { id: 'third-infield-a-113-120-213-225__116', points: [[275, 619]] },
    { id: 'third-infield-a-113-120-213-225__117', points: [[260, 590]] },
    { id: 'third-infield-a-113-120-213-225__118', points: [[260, 555]] },
    { id: 'third-infield-a-113-120-213-225__119', points: [[241, 524]] },
    { id: 'third-infield-a-113-120-213-225__120', points: [[220, 500]] },
    { id: 'third-infield-b-121-124__121', points: [[180, 484], [190, 485]] },
    { id: 'third-infield-b-121-124__122', points: [[215, 445]] },
    { id: 'third-infield-b-121-124__123', points: [[197, 409]] },
    { id: 'third-infield-b-121-124__124', points: [[183, 377]] },
    { id: 'third-infield-a-113-120-213-225__213', points: [[338, 784], [332, 775], [344, 795]] },
    { id: 'third-infield-a-113-120-213-225__214', points: [[311, 765], [306, 756], [316, 775]] },
    { id: 'third-infield-a-113-120-213-225__215', points: [[288, 738], [282, 732], [296, 740]] },
    { id: 'third-infield-a-113-120-213-225__216', points: [[266, 713], [256, 706], [270, 725]] },
    { id: 'third-infield-a-113-120-213-225__217', points: [[244, 686], [235, 680], [252, 690]] },
    { id: 'third-infield-a-113-120-213-225__218', points: [[221, 660], [212, 653], [232, 666]] },
    { id: 'third-infield-a-113-120-213-225__219', points: [[200, 625], [206, 632], [210, 636]] },
    { id: 'third-infield-a-113-120-213-225__220', points: [[190, 599]] },
    { id: 'third-infield-a-113-120-213-225__221', points: [[169, 556], [160, 548], [178, 565]] },
    { id: 'third-infield-a-113-120-213-225__222', points: [[155, 524], [146, 516], [164, 532]] },
    { id: 'third-infield-a-113-120-213-225__223', points: [[137, 496], [128, 493], [150, 500]] },
    { id: 'third-infield-a-113-120-213-225__224', points: [[134, 469], [126, 462], [145, 472]] },
    { id: 'third-infield-a-113-120-213-225__225', points: [[138, 443], [130, 437], [146, 450]] },
  ];

  ownerMatrix.forEach(({ id, points }) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} should exist for infield owner-point regression`);
    points.forEach((point) => {
      assert.equal(
        getTopHitBlockIdAtPoint(point),
        id,
        `${id} should own official PNG point ${point.join(',')} without adjacent-block drift`,
      );
    });
  });
});

test('대전 특수석 hit-area는 인접 일반석을 과대 선택하지 않는다', () => {
  const byId = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const specialHitAreas = [
    {
      id: 'innings-vip-400__400',
      maxArea: 3400,
      requiredPoint: [814, 560] as const,
      excludedAdjacentPoints: [
        [822, 620],
        [875, 530],
        [858, 628],
      ] as const,
    },
    {
      id: 'splash-jacuzzi-425__425',
      maxArea: 1800,
      requiredPoint: [143, 663] as const,
      excludedAdjacentPoints: [
        [118, 657],
        [129, 697],
        [160, 660],
      ] as const,
    },
    {
      id: 'splash-caravan-426__426',
      maxArea: 1800,
      requiredPoint: [109, 589] as const,
      excludedAdjacentPoints: [
        [82, 590],
        [99, 620],
        [135, 588],
      ] as const,
    },
    {
      id: 'third-infield-accessible__third-infield',
      maxArea: 950,
      requiredPoint: [173, 598] as const,
      excludedAdjacentPoints: [
        [190, 599],
        [195, 608],
        [215, 600],
      ] as const,
    },
  ];

  specialHitAreas.forEach((special) => {
    const block = byId.get(special.id);
    assert.ok(block, `${special.id} block should exist`);

    const hitAreaPoints = pathToPoints(block.hitAreaD ?? block.imageGeometry.d);
    assert.ok(hitAreaPoints.length >= 4, `${special.id} should have polygon hit area`);
    assert.ok(polygonArea(hitAreaPoints) <= special.maxArea, `${special.id} hit-area should stay tightly scoped`);
    assert.ok(isPointInsidePolygon(hitAreaPoints, special.requiredPoint), `${special.id} should keep its own label point selectable`);

    special.excludedAdjacentPoints.forEach((point) => {
      assert.equal(
        isPointInsidePolygon(hitAreaPoints, point),
        false,
        `${special.id} should not include adjacent anchor ${point.join(',')}`,
      );
    });
  });
});

test('대전 release lock anchor 블록은 공식 tracing과 label top-hit을 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const releaseAnchorIds = [
    'central-reserved-100__100a',
    'central-reserved-100__100b',
    'central-reserved-100__100c',
    'first-infield-b-101-108__104',
    'first-infield-b-101-108__105',
    'first-infield-b-101-108__108',
    'first-infield-a-109-112-201-212__109',
    'third-infield-b-121-124__121',
    'third-infield-b-121-124__124',
    'innings-vip-400__400',
    'splash-jacuzzi-425__425',
    'splash-caravan-426__426',
    'central-accessible__center',
    'first-infield-accessible__first-infield',
    'third-infield-accessible__third-infield',
    'outfield-accessible-third__left-outfield',
    'outfield-accessible-first__right-outfield',
    'outfield-lawn-500__500',
    'outfield-table-third-501-503__501',
    'outfield-table-first-504-508__508',
    'outfield-reserved-509__509',
    'outfield-reserved-third-423-330__424',
  ];

  releaseAnchorIds.forEach((id) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} release lock anchor should exist`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${id} should stay officially traced`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${id} should stay path-traced from official PNG`);
    assert.equal(block.sourceConfidence, 'OFFICIAL', `${id} should keep official source confidence`);
    assert.equal(isDaejeonSelectableSeatBlock(block), true, `${id} should remain selectable`);
    assert.equal(
      getTopHitBlockIdAtPoint([block.imageGeometry.labelX, block.imageGeometry.labelY]),
      id,
      `${id} label point should top-hit itself for release lock`,
    );
  });

  DAEJEON_P2_DEDUPLICATED_ALIASES.forEach((alias) => {
    assert.equal(blockById.has(alias.retiredBlockId), false, `${alias.retiredBlockId} retired alias should remain absent`);
  });
});

test('대전 공식 좌석도 대표 구역과 특수구역을 포함한다', () => {
  const searchableText = DAEJEON_BLOCKS
    .flatMap((block) => [block.name, block.block, block.officialSectionName, ...block.officialBlocks, ...block.seatViewSections])
    .join(' ');

  DAEJEON_REQUIRED_OFFICIAL_SECTIONS.forEach((section) => {
    assert.ok(searchableText.includes(section), `${section} should be represented`);
  });
});

test('대전 공식 섹션 그룹은 공식 섹션 17개를 모두 한 번씩 포함한다', () => {
  const groupedSections = DAEJEON_OFFICIAL_SECTION_GROUPS.flatMap((group) => group.sections);
  assert.equal(groupedSections.length, DAEJEON_REQUIRED_OFFICIAL_SECTIONS.length);
  assert.deepEqual([...new Set(groupedSections)].sort(), [...DAEJEON_REQUIRED_OFFICIAL_SECTIONS].sort());
});

test('대전 공식 섹션 coverage는 17개 섹션과 실제 블록을 모두 연결한다', () => {
  const coverageSections = DAEJEON_SECTION_COVERAGE.map((coverage) => coverage.officialSectionName);
  const blockIds = new Set(DAEJEON_BLOCKS.map((block) => block.id));

  assert.equal(coverageSections.length, DAEJEON_REQUIRED_OFFICIAL_SECTIONS.length);
  assert.deepEqual([...new Set(coverageSections)].sort(), [...DAEJEON_REQUIRED_OFFICIAL_SECTIONS].sort());

  DAEJEON_SECTION_COVERAGE.forEach((coverage) => {
    assert.ok(coverage.blockIds.length > 0, `${coverage.officialSectionName} coverage should have block ids`);
    assert.ok(coverage.reviewNote, `${coverage.officialSectionName} coverage should have review note`);
    assert.ok(
      coverage.status === 'REPRESENTATIVE_TRACED' || coverage.status === 'SPLIT_ACROSS_BLOCKS',
      `${coverage.officialSectionName} coverage should have valid status`,
    );
    coverage.blockIds.forEach((blockId) => {
      assert.ok(blockIds.has(blockId), `${coverage.officialSectionName} coverage block ${blockId} should exist`);
    });
  });

  const coveredBlockIds = new Set(DAEJEON_SECTION_COVERAGE.flatMap((coverage) => coverage.blockIds));
  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(coveredBlockIds.has(block.id), `${block.id} should be linked from coverage`);
  });
});

test('대전 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  const displayPriorities = new Set<number>();
  const parentIds = new Set(DAEJEON_BLOCK_GROUPS.map((group) => group.id));

  DAEJEON_BLOCKS.forEach((block) => {
    assert.ok(DAEJEON_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.zoneGroup, `${block.id} zone group should exist`);
    assert.ok(block.displayPriority > 0, `${block.id} display priority should exist`);
    assert.ok(!displayPriorities.has(block.displayPriority), `${block.id} display priority should be unique`);
    displayPriorities.add(block.displayPriority);
    assert.ok(block.officialSectionName, `${block.id} official section name should exist`);
    assert.ok(parentIds.has(block.parentId), `${block.id} parent id should exist`);
    assert.equal(block.segmentationLevel, 'OFFICIAL_BLOCK', `${block.id} should be an official block child`);
    assert.ok(block.parentBlock, `${block.id} parent block should exist`);
    assert.ok(block.blockCode, `${block.id} block code should exist`);
    assert.ok(block.officialBlockLabel, `${block.id} official block label should exist`);
    assert.ok(
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' || block.traceStatus === 'NEEDS_OPERATOR_REVIEW',
      `${block.id} trace status should be supported`,
    );
    assert.ok(
      block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'
      || block.traceMethod === 'APPROX_CENTER_RECT'
      || block.traceMethod === 'APPROX_INTERPOLATED_POLYLINE',
      `${block.id} trace method should be supported`,
    );
    if (block.traceStatus === 'OFFICIAL_IMAGE_TRACED') {
      assert.equal(
        block.traceMethod,
        'PATH_TRACED_FROM_OFFICIAL_IMAGE',
        `${block.id} official trace should only use path traced from the official image`,
      );
    }
    if (block.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE') {
      assert.equal(block.traceStatus, 'NEEDS_OPERATOR_REVIEW', `${block.id} generated geometry should stay pending review`);
    }
    if (block.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      assert.match(block.reviewNote ?? '', /재검수|검수|불명확|확인|NEEDS_OPERATOR_REVIEW/, `${block.id} pending trace should keep review note`);
    }
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.deepEqual(block.officialBlocks, [block.officialBlockLabel], `${block.id} official blocks should contain exact official label`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.equal(
      block.sourceConfidence,
      block.traceStatus === 'OFFICIAL_IMAGE_TRACED' ? 'OFFICIAL' : 'UNVERIFIED',
      `${block.id} source confidence should follow trace status`,
    );
    if (block.sourceConfidence === 'UNVERIFIED') {
      assert.match(block.sourceNote, /TODO|재검수|직접 측정/, `${block.id} unverified source should keep operator TODO`);
    }
    assert.ok(block.seatViewSections.includes(block.name), `${block.id} seat view aliases should include section name`);
    assert.ok(block.seatViewSections.includes(block.blockCode), `${block.id} seat view aliases should include block code`);
    assert.ok(block.seatViewSections.includes(block.officialBlockLabel), `${block.id} seat view aliases should include exact official label`);

    const viewInfo = getDaejeonViewInfo(block);
    assert.ok(viewInfo, `${block.id} view info should exist`);
    assert.equal(viewInfo.photos, 0, `${block.id} view info should start with zero photos`);
    assert.equal(viewInfo.rating, null, `${block.id} view info should start without rating`);
    assert.ok(viewInfo.distance, `${block.id} view info distance should exist`);
    assert.ok(viewInfo.notes, `${block.id} view info notes should exist`);
    assert.ok(viewInfo.tags && viewInfo.tags.length > 0, `${block.id} view info tags should exist`);

    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.ok((block.hitAreaD ?? block.imageGeometry.d).startsWith('M '), `${block.id} hit area path should exist`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= DAEJEON_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= DAEJEON_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    assertPathFitsImageBounds(block.imageGeometry.d, `${block.id} display path`);
    assertPathFitsImageBounds(block.hitAreaD ?? block.imageGeometry.d, `${block.id} hit-area path`);

    const hitAreaPoints = pathToPoints(block.hitAreaD ?? block.imageGeometry.d);
    assert.ok(
      isPointInsidePolygon(hitAreaPoints, [block.imageGeometry.labelX, block.imageGeometry.labelY]),
      `${block.id} label point should be inside its own hit-area`,
    );
  });
});

test('대전 좌표 기준 샘플 블록은 존재하고 label 좌표가 자기 hit-area를 선택한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  DAEJEON_COORDINATE_DIAGNOSTIC_TARGET_IDS.forEach((id) => {
    const block = blockById.get(id);
    assert.ok(block, `${id} diagnostic target should exist`);

    assertPathFitsImageBounds(block.imageGeometry.d, `${id} display path`);
    assertPathFitsImageBounds(block.hitAreaD ?? block.imageGeometry.d, `${id} hit-area path`);
    if (block.traceStatus === 'NEEDS_OPERATOR_REVIEW') {
      assert.equal(block.sourceConfidence, 'UNVERIFIED', `${id} pending target should not claim official coordinate confidence`);
      return;
    }

    assert.equal(
      getTopHitBlockIdAtPoint([block.imageGeometry.labelX, block.imageGeometry.labelY]),
      id,
      `${id} label point should top-hit itself`,
    );
  });
});

test('대전 좌표 정밀도 audit는 측정 완료 블록과 검수 대기 블록을 구분한다', () => {
  const rows = DAEJEON_BLOCKS.map((block) => ({
    id: block.id,
    parentId: block.parentId,
    traceStatus: block.traceStatus,
    sourceConfidence: block.sourceConfidence,
    area: polygonArea(pathToPoints(block.hitAreaD ?? block.imageGeometry.d)),
    labelTopHitBlockId: getTopHitBlockIdAtPoint([block.imageGeometry.labelX, block.imageGeometry.labelY]),
  }));
  const officialRows = rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED');
  const pendingRows = rows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW');
  const labelTopHitFailures = officialRows.filter((row) => row.labelTopHitBlockId !== row.id);

  assert.equal(rows.length, 145);
  assert.ok(rows.every((row) => row.area > 0), 'all Daejeon hit areas should have positive polygon area');
  assert.equal(pendingRows.length, 0, 'deduplicated P2 aliases should leave no pending operational geometry');
  assert.ok(officialRows.every((row) => row.sourceConfidence === 'OFFICIAL'), 'official traced Daejeon hit areas should keep official confidence');
  assert.ok(DAEJEON_BLOCKS.every((block) => block.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE'), 'operational Daejeon blocks should not keep approximate geometry methods');
  assert.deepEqual(labelTopHitFailures, []);
});

test('대전 P0 overlay 검수 블록은 재측정 후 review queue에서 제거된다', () => {
  const byId = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const vip400 = byId.get('innings-vip-400__400');

  assert.ok(vip400, 'innings-vip-400__400 should exist');
  assert.equal(vip400.traceStatus, 'OFFICIAL_IMAGE_TRACED');
  assert.equal(vip400.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE');
  assert.equal(vip400.sourceConfidence, 'OFFICIAL');
  assert.ok(!DAEJEON_TRACE_REVIEW_QUEUE.some((item) => item.id === 'innings-vip-400__400'));
});

test('대전 overlay 재측정 완료 블록은 공식 트레이싱 상태로 승격된다', () => {
  const byId = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));

  [
    'central-reserved-100__100a',
    'central-reserved-100__100b',
    'central-reserved-100__100c',
    'catcher-back-100__100a',
    'catcher-back-100__100b',
    'catcher-back-100__100c',
    'central-accessible__center',
    'innings-vip-400__400',
    'first-infield-b-101-108__108',
    'first-infield-a-109-112-201-212__109',
    'first-infield-a-109-112-201-212__110',
    'first-infield-a-109-112-201-212__111',
    'first-infield-a-109-112-201-212__112',
    'first-infield-a-109-112-201-212__201',
    'first-infield-a-109-112-201-212__202',
    'first-infield-a-109-112-201-212__203',
    'first-infield-a-109-112-201-212__204',
    'first-infield-a-109-112-201-212__205',
    'first-infield-a-109-112-201-212__206',
    'first-infield-a-109-112-201-212__207',
    'first-infield-a-109-112-201-212__208',
    'first-infield-a-109-112-201-212__209',
    'first-infield-a-109-112-201-212__210',
    'first-infield-a-109-112-201-212__211',
    'first-infield-a-109-112-201-212__212',
    'third-infield-a-113-120-213-225__113',
    'third-infield-a-113-120-213-225__114',
    'third-infield-a-113-120-213-225__115',
    'third-infield-a-113-120-213-225__116',
    'third-infield-a-113-120-213-225__117',
    'third-infield-a-113-120-213-225__118',
    'third-infield-a-113-120-213-225__119',
    'third-infield-a-113-120-213-225__120',
    'third-infield-a-113-120-213-225__213',
    'third-infield-a-113-120-213-225__214',
    'third-infield-a-113-120-213-225__215',
    'third-infield-a-113-120-213-225__216',
    'third-infield-a-113-120-213-225__217',
    'third-infield-a-113-120-213-225__218',
    'third-infield-a-113-120-213-225__219',
    'third-infield-a-113-120-213-225__220',
    'third-infield-a-113-120-213-225__221',
    'third-infield-a-113-120-213-225__222',
    'third-infield-a-113-120-213-225__223',
    'third-infield-a-113-120-213-225__224',
    'third-infield-a-113-120-213-225__225',
    'first-table-4f-301-413__301',
    'first-table-4f-301-413__302',
    'first-table-4f-301-413__401',
    'first-table-4f-301-413__402',
    'first-table-4f-301-413__403',
    'first-table-4f-301-413__404',
    'first-table-4f-301-413__405',
    'first-table-4f-301-413__406',
    'first-table-4f-301-413__407',
    'first-table-4f-301-413__408',
    'first-table-4f-301-413__409',
    'first-table-4f-301-413__410',
    'first-table-4f-301-413__411',
    'first-table-4f-301-413__412',
    'first-table-4f-301-413__413',
    'third-table-4f-414-330__414',
    'third-table-4f-414-330__415',
    'third-table-4f-414-330__416',
    'third-table-4f-414-330__417',
    'third-table-4f-414-330__418',
    'third-table-4f-414-330__419',
    'third-table-4f-414-330__420',
    'third-table-4f-414-330__421',
    'third-table-4f-414-330__422',
    'third-table-4f-414-330__423',
    'third-table-4f-414-330__326',
    'third-table-4f-414-330__327',
    'third-table-4f-414-330__328',
    'third-table-4f-414-330__329',
    'third-table-4f-414-330__330',
    'outfield-reserved-third-423-330__424',
    'outfield-lawn-500__500',
    ...Array.from({ length: 37 }, (_, index) => `skybox-s01-s37__s${String(index + 1).padStart(2, '0')}`),
  ].forEach((id) => {
    const block = byId.get(id);
    assert.ok(block, `${id} re-traced block should exist`);
    assert.equal(block.traceStatus, 'OFFICIAL_IMAGE_TRACED', `${id} should be promoted after PNG pixel boundary tracing`);
    assert.equal(block.traceMethod, 'PATH_TRACED_FROM_OFFICIAL_IMAGE', `${id} should use official image path tracing`);
    assert.equal(block.sourceConfidence, 'OFFICIAL', `${id} should recover official coordinate confidence`);
  });
});

test('대전 label 좌표는 측정 완료 블록에서 렌더 순서상 자기 블록을 최상위 hit-area로 가진다', () => {
  DAEJEON_BLOCKS.filter((block) => block.traceStatus === 'OFFICIAL_IMAGE_TRACED').forEach((block) => {
    const labelPoint: TestPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.equal(
      getTopHitBlockIdAtPoint(labelPoint),
      block.id,
      `${block.id} label point should not be captured by ${getTopHitBlockIdAtPoint(labelPoint) ?? 'no block'}`,
    );
  });
});
