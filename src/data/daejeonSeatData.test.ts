import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

const DAEJEON_P2_ANCHOR_CROP_REGRESSION_MATRIX = [
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
  const anchorCropSource = readFileSync(new URL('../../scripts/daejeon-anchor-review-crops.mjs', import.meta.url), 'utf8');
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
  const anchorCropSource = readFileSync(new URL('../../scripts/daejeon-anchor-review-crops.mjs', import.meta.url), 'utf8');
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
  const anchorCropSource = readFileSync(new URL('../../scripts/daejeon-anchor-review-crops.mjs', import.meta.url), 'utf8');
  const anchorCropContractSource = readFileSync(new URL('../../scripts/daejeon-seatmap-anchor-contract.mjs', import.meta.url), 'utf8');
  const anchorCropContract = `${anchorCropSource}\n${anchorCropContractSource}`;
  const dataTestSource = readFileSync(new URL('./daejeonSeatData.test.ts', import.meta.url), 'utf8');
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const p2AutoCropIds = DAEJEON_P2_ANCHOR_CROP_REGRESSION_MATRIX.map((item) => item.cropId);

  assert.deepEqual(
    p2AutoCropIds,
    [
      'first-107-110-detail',
      'third-119-121-detail',
      'third-115-117-detail',
      'third-113-114-detail',
      'third-213-225-sequence',
      'third-221-225-detail',
      'third-213-219-detail',
      'special-400-accessible-first',
      'special-425-426-third-accessible',
      'special-accessible-center',
      'special-accessible-outfield-third',
    ],
    'P2 automated crop order should stay aligned with the visual precision backlog',
  );

  [
    'skybox-s01-s12-sequence',
    'skybox-s13-s25-sequence',
    'skybox-s26-s37-sequence',
  ].forEach((cropId) => {
    assert.ok(anchorCropContract.includes(`'${cropId}'`), `${cropId} should remain in anchor crop generation`);
    assert.ok(anchorCropContract.includes('p2ManualOnlyCropIds'), `${cropId} should be covered by the manual-only contract`);
    assert.ok(anchorCropContract.includes('MANUAL_CROP_ONLY'), `${cropId} should expose manual crop-only review mode`);
  });

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
  const handoff = readFileSync(handoffPath, 'utf8');

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
      bounds: { minX: 766, minY: 451, maxX: 795, maxY: 489 },
      labelPoint: [782, 469] as const,
      ownerPoints: [[772, 480], [790, 460]] as const,
      excludedPoints: [[760, 470], [802, 470]] as const,
    },
    {
      id: 'first-table-4f-301-413__302',
      bounds: { minX: 754, minY: 491, maxX: 798, maxY: 523 },
      labelPoint: [777, 505] as const,
      ownerPoints: [[765, 515], [790, 500]] as const,
      excludedPoints: [[748, 505], [804, 505]] as const,
    },
    {
      id: 'first-table-4f-301-413__401',
      bounds: { minX: 806, minY: 461, maxX: 828, maxY: 493 },
      labelPoint: [817, 475] as const,
      ownerPoints: [[810, 485], [825, 470]] as const,
      excludedPoints: [[800, 475], [834, 475]] as const,
    },
    {
      id: 'first-table-4f-301-413__402',
      bounds: { minX: 792, minY: 498, maxX: 830, maxY: 532 },
      labelPoint: [811, 515] as const,
      ownerPoints: [[805, 520], [815, 520], [797, 525]] as const,
      excludedPoints: [[786, 515], [837, 515]] as const,
    },
    {
      id: 'first-table-4f-301-413__403',
      bounds: { minX: 774, minY: 531, maxX: 824, maxY: 574 },
      labelPoint: [790, 546] as const,
      ownerPoints: [[805, 540], [785, 565]] as const,
      excludedPoints: [[770, 548], [830, 548]] as const,
    },
    {
      id: 'first-table-4f-301-413__404',
      bounds: { minX: 758, minY: 572, maxX: 814, maxY: 623 },
      labelPoint: [777, 588] as const,
      ownerPoints: [[785, 590], [770, 600], [795, 615]] as const,
      excludedPoints: [[752, 590], [820, 590]] as const,
    },
    {
      id: 'first-table-4f-301-413__405',
      bounds: { minX: 730, minY: 619, maxX: 805, maxY: 660 },
      labelPoint: [744, 640] as const,
      ownerPoints: [[760, 630], [790, 650]] as const,
      excludedPoints: [[720, 640], [812, 640]] as const,
    },
    {
      id: 'first-table-4f-301-413__406',
      bounds: { minX: 727, minY: 644, maxX: 792, maxY: 701 },
      labelPoint: [735, 675] as const,
      ownerPoints: [[755, 670], [775, 690]] as const,
      excludedPoints: [[720, 675], [798, 675]] as const,
    },
    {
      id: 'first-table-4f-301-413__407',
      bounds: { minX: 703, minY: 680, maxX: 775, maxY: 736 },
      labelPoint: [715, 710] as const,
      ownerPoints: [[730, 700], [750, 725]] as const,
      excludedPoints: [[695, 710], [780, 710]] as const,
    },
    {
      id: 'first-table-4f-301-413__408',
      bounds: { minX: 677, minY: 707, maxX: 744, maxY: 765 },
      labelPoint: [690, 735] as const,
      ownerPoints: [[705, 725], [720, 750]] as const,
      excludedPoints: [[670, 735], [750, 735]] as const,
    },
    {
      id: 'first-table-4f-301-413__409',
      bounds: { minX: 650, minY: 739, maxX: 719, maxY: 797 },
      labelPoint: [665, 775] as const,
      ownerPoints: [[680, 770], [690, 790]] as const,
      excludedPoints: [[640, 775], [725, 775]] as const,
    },
    {
      id: 'first-table-4f-301-413__410',
      bounds: { minX: 624, minY: 768, maxX: 693, maxY: 829 },
      labelPoint: [630, 790] as const,
      ownerPoints: [[650, 795], [670, 815]] as const,
      excludedPoints: [[615, 805], [700, 805]] as const,
    },
    {
      id: 'first-table-4f-301-413__411',
      bounds: { minX: 594, minY: 797, maxX: 665, maxY: 865 },
      labelPoint: [605.9, 811.7] as const,
      ownerPoints: [[625, 820], [640, 845]] as const,
      excludedPoints: [[585, 835], [670, 835]] as const,
    },
    {
      id: 'first-table-4f-301-413__412',
      bounds: { minX: 564, minY: 820, maxX: 633, maxY: 890 },
      labelPoint: [583, 831.8] as const,
      ownerPoints: [[600, 845], [615, 870]] as const,
      excludedPoints: [[550, 870], [640, 835]] as const,
    },
    {
      id: 'first-table-4f-301-413__413',
      bounds: { minX: 526, minY: 839, maxX: 595, maxY: 912 },
      labelPoint: [560, 852] as const,
      ownerPoints: [[550, 870], [580, 890]] as const,
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
      bounds: { minX: 485, minY: 855, maxX: 546, maxY: 924 },
      labelPoint: [500, 874] as const,
      ownerPoints: [[520, 880], [535, 910]] as const,
      excludedPoints: [[480, 874], [550, 874]] as const,
    },
    {
      id: 'third-table-4f-414-330__415',
      bounds: { minX: 443, minY: 865, maxX: 492, maxY: 929 },
      labelPoint: [450, 876.5] as const,
      ownerPoints: [[470, 880], [485, 915]] as const,
      excludedPoints: [[435, 877], [498, 877]] as const,
    },
    {
      id: 'third-table-4f-414-330__416',
      bounds: { minX: 388, minY: 864, maxX: 439, maxY: 930 },
      labelPoint: [400.8, 872.1] as const,
      ownerPoints: [[415, 890], [430, 915]] as const,
      excludedPoints: [[382, 872], [445, 872]] as const,
    },
    {
      id: 'third-table-4f-414-330__417',
      bounds: { minX: 336, minY: 854, maxX: 395, maxY: 924 },
      labelPoint: [350, 880] as const,
      ownerPoints: [[360, 865], [380, 900]] as const,
      excludedPoints: [[330, 880], [400, 880]] as const,
    },
    {
      id: 'third-table-4f-414-330__418',
      bounds: { minX: 278, minY: 835, maxX: 360, maxY: 911 },
      labelPoint: [325, 875] as const,
      ownerPoints: [[310, 855], [340, 900]] as const,
      excludedPoints: [[270, 875], [365, 875]] as const,
    },
    {
      id: 'third-table-4f-414-330__419',
      bounds: { minX: 257, minY: 823, maxX: 316, maxY: 883 },
      labelPoint: [289, 837] as const,
      ownerPoints: [[285, 840], [295, 845], [270, 870], [280, 860]] as const,
      excludedPoints: [[250, 837], [322, 837]] as const,
    },
    {
      id: 'third-table-4f-414-330__420',
      bounds: { minX: 235, minY: 787, maxX: 286, maxY: 821 },
      labelPoint: [263, 805] as const,
      ownerPoints: [[245, 800], [275, 815]] as const,
      excludedPoints: [[230, 805], [292, 805]] as const,
    },
    {
      id: 'third-table-4f-414-330__421',
      bounds: { minX: 218, minY: 763, maxX: 260, maxY: 800 },
      labelPoint: [241, 783] as const,
      ownerPoints: [[230, 775], [250, 790]] as const,
      excludedPoints: [[212, 783], [265, 783]] as const,
    },
    {
      id: 'third-table-4f-414-330__422',
      bounds: { minX: 188, minY: 736, maxX: 234, maxY: 774 },
      labelPoint: [212, 754] as const,
      ownerPoints: [[205, 750], [215, 760], [225, 755], [195, 760]] as const,
      excludedPoints: [[182, 754], [240, 754]] as const,
    },
    {
      id: 'third-table-4f-414-330__423',
      bounds: { minX: 160, minY: 706, maxX: 209, maxY: 759 },
      labelPoint: [184, 733] as const,
      ownerPoints: [[170, 720], [195, 748]] as const,
      excludedPoints: [[154, 733], [214, 733]] as const,
    },
    {
      id: 'third-table-4f-414-330__326',
      bounds: { minX: 130, minY: 616, maxX: 170, maxY: 664 },
      labelPoint: [151, 643] as const,
      ownerPoints: [[140, 630], [145, 640], [155, 645]] as const,
      excludedPoints: [[124, 643], [176, 643]] as const,
    },
    {
      id: 'third-table-4f-414-330__327',
      bounds: { minX: 119, minY: 586, maxX: 161, maxY: 626 },
      labelPoint: [141, 608] as const,
      ownerPoints: [[130, 595], [152, 618]] as const,
      excludedPoints: [[112, 608], [168, 608]] as const,
    },
    {
      id: 'third-table-4f-414-330__328',
      bounds: { minX: 109, minY: 554, maxX: 151, maxY: 595 },
      labelPoint: [130, 577] as const,
      ownerPoints: [[125, 570], [135, 580], [145, 585]] as const,
      excludedPoints: [[102, 577], [156, 577]] as const,
    },
    {
      id: 'third-table-4f-414-330__329',
      bounds: { minX: 96, minY: 520, maxX: 139, maxY: 561 },
      labelPoint: [116, 543] as const,
      ownerPoints: [[105, 532], [130, 552]] as const,
      excludedPoints: [[90, 543], [145, 543]] as const,
    },
    {
      id: 'third-table-4f-414-330__330',
      bounds: { minX: 84, minY: 483, maxX: 127, maxY: 525 },
      labelPoint: [103, 505] as const,
      ownerPoints: [[92, 495], [115, 515]] as const,
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
      bounds: { minX: 126, minY: 641, maxX: 158, maxY: 687 },
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
  assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), { minX: 676, minY: 474, maxX: 730, maxY: 502 });
  assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], [705, 487]);

  [
    [690, 486],
    [710, 495],
    [720, 500],
  ].forEach((point) => {
    assert.equal(getTopHitBlockIdAtPoint(point), block.id, `104 should include official label-cell point ${point.join(',')}`);
  });

  [
    [620, 480],
    [650, 478],
    [665, 496],
    [700, 510],
  ].forEach((point) => {
    assert.notEqual(getTopHitBlockIdAtPoint(point), block.id, `104 should not absorb adjacent point ${point.join(',')}`);
  });
});

test('대전 split-color 121 블록은 공식 이미지의 두 색상 셀 선택 영역을 포함한다', () => {
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
    assert.ok(isDaejeonSplitColorBlockId(id), `${id} should be registered as split-color`);
    assert.deepEqual(pointBounds(pathToPoints(block.imageGeometry.d)), bounds, `${id} should keep measured split-color bounds`);
    assert.deepEqual([block.imageGeometry.labelX, block.imageGeometry.labelY], labelPoint, `${id} label should move to the official visual center`);
    assert.equal(getTopHitBlockIdAtPoint(labelPoint), id, `${id} label should top-hit itself`);
    includedPoints.forEach((point) => {
      assert.equal(
        getTopHitBlockIdAtPoint(point),
        id,
        `${id} should include split-color official point ${point.join(',')}`,
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
      bounds: { minX: 202, minY: 520, maxX: 315, maxY: 591 },
      labelPoint: [260, 555] as const,
      ownerPoints: [[260, 555], [290, 555]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__119',
      bounds: { minX: 181, minY: 487, maxX: 298, maxY: 562 },
      labelPoint: [241, 524] as const,
      ownerPoints: [[241, 524], [270, 504]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__120',
      bounds: { minX: 173, minY: 463, maxX: 282, maxY: 527 },
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
    { minX: 253, minY: 603, maxX: 339, maxY: 682 },
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
      bounds: { minX: 319, minY: 766, maxX: 356, maxY: 801 },
      labelPoint: [337.7, 783.6] as const,
      ownerPoints: [[338, 784], [350, 790], [332, 775], [344, 795]] as const,
      excludedPoints: [[310, 790], [360, 790]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__214',
      bounds: { minX: 292, minY: 748, maxX: 327, maxY: 782 },
      labelPoint: [311, 764.5] as const,
      ownerPoints: [[311, 765], [320, 766], [306, 756], [316, 775]] as const,
      excludedPoints: [[285, 765], [335, 765]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__215',
      bounds: { minX: 274, minY: 724, maxX: 301, maxY: 754 },
      labelPoint: [288.3, 738.4] as const,
      ownerPoints: [[288, 738], [292, 744], [282, 732], [296, 740]] as const,
      excludedPoints: [[270, 738], [306, 738]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__216',
      bounds: { minX: 249, minY: 696, maxX: 283, maxY: 730 },
      labelPoint: [265.7, 712.8] as const,
      ownerPoints: [[266, 713], [274, 720], [256, 706], [270, 725]] as const,
      excludedPoints: [[242, 713], [290, 713]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__217',
      bounds: { minX: 227, minY: 671, maxX: 258, maxY: 704 },
      labelPoint: [244, 686.4] as const,
      ownerPoints: [[244, 686], [250, 695], [235, 680], [252, 690]] as const,
      excludedPoints: [[220, 686], [264, 686]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__218',
      bounds: { minX: 202, minY: 644, maxX: 236, maxY: 678 },
      labelPoint: [221.2, 660.4] as const,
      ownerPoints: [[221, 660], [228, 666], [212, 653], [232, 666]] as const,
      excludedPoints: [[196, 660], [242, 660]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__219',
      bounds: { minX: 183, minY: 604, maxX: 214, maxY: 647 },
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
    { minX: 164, minY: 570, maxX: 229, maxY: 616 },
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
      bounds: { minX: 152, minY: 538, maxX: 183, maxY: 573 },
      labelPoint: [169.1, 555.7] as const,
      ownerPoints: [[169, 556], [175, 560], [160, 548], [178, 565]] as const,
      excludedPoints: [[190, 555], [170, 585]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__222',
      bounds: { minX: 138, minY: 507, maxX: 168, maxY: 541 },
      labelPoint: [154.7, 524.2] as const,
      ownerPoints: [[155, 524], [160, 530], [146, 516], [164, 532]] as const,
      excludedPoints: [[180, 524], [155, 545]] as const,
    },
    {
      id: 'third-infield-a-113-120-213-225__223',
      bounds: { minX: 119, minY: 481, maxX: 155, maxY: 512 },
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
      bounds: { minX: 126, minY: 432, maxX: 149, maxY: 455 },
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

test('대전 1루 101-109 블록은 공식 이미지 소유권이 한 칸씩 밀리지 않는다', () => {
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
      bounds: { minX: 676, minY: 474, maxX: 730, maxY: 502 },
      labelPoint: [705, 487] as const,
      ownerPoints: [
        [690, 486],
        [710, 495],
        [720, 500],
      ] as const,
    },
    {
      id: 'first-infield-b-101-108__105',
      bounds: { minX: 596, minY: 467, maxX: 717, maxY: 530 },
      labelPoint: [650, 510] as const,
      ownerPoints: [
        [620, 480],
        [650, 478],
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
      bounds: { minX: 543, minY: 603, maxX: 637, maxY: 688 },
      labelPoint: [599, 633] as const,
      ownerPoints: [
        [599, 633],
        [565, 605],
        [620, 650],
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
      bounds: { minX: 731, minY: 486, maxX: 760, maxY: 509 },
      labelPoint: [743.9, 495.8] as const,
      ownerPoints: [[744, 496], [740, 492], [750, 502]] as const,
      excludedPoints: [[725, 496], [766, 496]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__203',
      bounds: { minX: 716, minY: 507, maxX: 746, maxY: 542 },
      labelPoint: [730.9, 524.1] as const,
      ownerPoints: [[731, 524], [730, 515], [736, 535]] as const,
      excludedPoints: [[710, 524], [752, 524]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__204',
      bounds: { minX: 701, minY: 539, maxX: 733, maxY: 577 },
      labelPoint: [715.6, 557.8] as const,
      ownerPoints: [[716, 558], [715, 545], [724, 565]] as const,
      excludedPoints: [[695, 558], [739, 558]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__205',
      bounds: { minX: 687, minY: 574, maxX: 717, maxY: 608 },
      labelPoint: [693, 593] as const,
      ownerPoints: [[693, 593], [697, 576], [691, 600]] as const,
      excludedPoints: [[681, 593], [723, 593]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__206',
      bounds: { minX: 670, minY: 605, maxX: 703, maxY: 650 },
      labelPoint: [685.4, 626.3] as const,
      ownerPoints: [[685, 626], [685, 615], [690, 642]] as const,
      excludedPoints: [[664, 626], [709, 626]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__207',
      bounds: { minX: 648, minY: 644, maxX: 684, maxY: 679 },
      labelPoint: [663.6, 660.7] as const,
      ownerPoints: [[664, 661], [655, 665], [675, 660]] as const,
      excludedPoints: [[640, 661], [690, 661]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__208',
      bounds: { minX: 626, minY: 671, maxX: 659, maxY: 706 },
      labelPoint: [640.8, 687.3] as const,
      ownerPoints: [[641, 687], [640, 680], [650, 685]] as const,
      excludedPoints: [[620, 687], [665, 687]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__209',
      bounds: { minX: 601, minY: 697, maxX: 636, maxY: 732 },
      labelPoint: [617.5, 714.3] as const,
      ownerPoints: [[618, 714], [610, 725], [620, 705], [625, 720]] as const,
      excludedPoints: [[590, 714], [640, 714]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__210',
      bounds: { minX: 581, minY: 724, maxX: 613, maxY: 755 },
      labelPoint: [595.5, 739.7] as const,
      ownerPoints: [[596, 740], [585, 740], [595, 730], [602, 746]] as const,
      excludedPoints: [[575, 740], [615, 740]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__211',
      bounds: { minX: 554, minY: 749, maxX: 586, maxY: 778 },
      labelPoint: [570, 762.7] as const,
      ownerPoints: [[570, 763], [560, 770], [565, 758], [575, 765]] as const,
      excludedPoints: [[545, 763], [590, 763]] as const,
    },
    {
      id: 'first-infield-a-109-112-201-212__212',
      bounds: { minX: 525, minY: 768, maxX: 561, maxY: 801 },
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

test('대전 1루/3루 내야 연속 블록은 공식 PNG owner point를 자기 블록으로 유지한다', () => {
  const blockById = new Map(DAEJEON_BLOCKS.map((block) => [block.id, block]));
  const ownerMatrix: Array<{ id: string; points: readonly TestPoint[] }> = [
    { id: 'first-infield-b-101-108__101', points: [[700, 375]] },
    { id: 'first-infield-b-101-108__102', points: [[687, 406], [660, 417], [710, 402]] },
    { id: 'first-infield-b-101-108__103', points: [[674, 445], [630, 455], [720, 440]] },
    { id: 'first-infield-b-101-108__104', points: [[690, 486], [710, 495], [720, 500]] },
    { id: 'first-infield-b-101-108__105', points: [[620, 480], [650, 478], [665, 496], [700, 510]] },
    { id: 'first-infield-b-101-108__106', points: [[650, 528], [665, 550], [690, 540]] },
    { id: 'first-infield-b-101-108__107', points: [[631, 559], [600, 540], [665, 575]] },
    { id: 'first-infield-b-101-108__108', points: [[627, 594], [640, 610], [650, 620]] },
    { id: 'first-infield-a-109-112-201-212__109', points: [[599, 633], [565, 605], [620, 650]] },
    { id: 'first-infield-a-109-112-201-212__110', points: [[589, 645]] },
    { id: 'first-infield-a-109-112-201-212__111', points: [[563, 668]] },
    { id: 'first-infield-a-109-112-201-212__112', points: [[549, 696]] },
    { id: 'first-infield-a-109-112-201-212__201', points: [[752, 466], [748, 458], [760, 470]] },
    { id: 'first-infield-a-109-112-201-212__202', points: [[744, 495], [740, 492], [750, 502]] },
    { id: 'first-infield-a-109-112-201-212__203', points: [[731, 524], [730, 515], [736, 535]] },
    { id: 'first-infield-a-109-112-201-212__204', points: [[715, 558], [715, 545], [724, 565]] },
    { id: 'first-infield-a-109-112-201-212__205', points: [[693, 593], [697, 576], [691, 600]] },
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
