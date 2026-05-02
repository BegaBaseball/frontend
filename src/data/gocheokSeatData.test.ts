import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inflateSync } from 'node:zlib';
import {
  GOCHEOK_BLOCKS,
  GOCHEOK_CATEGORIES,
  GOCHEOK_FACILITY_GUIDE,
  GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS,
  GOCHEOK_IMAGE_GEOMETRY_DRAFTS,
  GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
  GOCHEOK_OFFICIAL_REFERENCES,
  GOCHEOK_SEATMAP_IMAGE,
  GOCHEOK_SEATMAP_VIEW_BOX,
  GOCHEOK_TRACE_REVIEW_REGIONS,
  GOCHEOK_TRACE_REVIEWED_BLOCK_IDS,
} from './gocheokSeatData';

interface DecodedPng {
  width: number;
  height: number;
  channels: 3 | 4;
  data: Buffer;
}

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function parsePathPoints(path: string): Array<[number, number]> {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Array<[number, number]> = [];
  for (let index = 0; index < values.length; index += 2) {
    points.push([values[index], values[index + 1]]);
  }
  return points;
}

function pointOnSegment(point: [number, number], start: [number, number], end: [number, number]): boolean {
  const [px, py] = point;
  const [sx, sy] = start;
  const [ex, ey] = end;
  const cross = (px - sx) * (ey - sy) - (py - sy) * (ex - sx);
  if (Math.abs(cross) > 0.001) return false;
  const minX = Math.min(sx, ex) - 0.001;
  const maxX = Math.max(sx, ex) + 0.001;
  const minY = Math.min(sy, ey) - 0.001;
  const maxY = Math.max(sy, ey) + 0.001;
  return px >= minX && px <= maxX && py >= minY && py <= maxY;
}

function pointInPolygon(point: [number, number], polygon: Array<[number, number]>): boolean {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const start = polygon[previous];
    const end = polygon[current];
    if (pointOnSegment(point, start, end)) return true;

    const [px, py] = point;
    const [x1, y1] = start;
    const [x2, y2] = end;
    const intersects = y1 > py !== y2 > py && px < ((x2 - x1) * (py - y1)) / (y2 - y1) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
}

function isSamePoint(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001;
}

function orientation(a: [number, number], b: [number, number], c: [number, number]): number {
  const value = (b[1] - a[1]) * (c[0] - b[0]) - (b[0] - a[0]) * (c[1] - b[1]);
  if (Math.abs(value) < 0.001) return 0;
  return value > 0 ? 1 : 2;
}

function segmentsIntersect(a1: [number, number], a2: [number, number], b1: [number, number], b2: [number, number]): boolean {
  const o1 = orientation(a1, a2, b1);
  const o2 = orientation(a1, a2, b2);
  const o3 = orientation(b1, b2, a1);
  const o4 = orientation(b1, b2, a2);

  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && pointOnSegment(b1, a1, a2)) return true;
  if (o2 === 0 && pointOnSegment(b2, a1, a2)) return true;
  if (o3 === 0 && pointOnSegment(a1, b1, b2)) return true;
  if (o4 === 0 && pointOnSegment(a2, b1, b2)) return true;
  return false;
}

function hasSelfIntersection(polygon: Array<[number, number]>): boolean {
  for (let first = 0; first < polygon.length; first += 1) {
    const firstStart = polygon[first];
    const firstEnd = polygon[(first + 1) % polygon.length];
    for (let second = first + 1; second < polygon.length; second += 1) {
      if (Math.abs(first - second) <= 1) continue;
      if (first === 0 && second === polygon.length - 1) continue;

      const secondStart = polygon[second];
      const secondEnd = polygon[(second + 1) % polygon.length];
      const sharesEndpoint = [firstStart, firstEnd].some((point) => isSamePoint(point, secondStart) || isSamePoint(point, secondEnd));
      if (sharesEndpoint) continue;

      if (segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd)) return true;
    }
  }
  return false;
}

function assertInRange(value: number, min: number, max: number, message: string) {
  assert.ok(value >= min && value <= max, `${message}: expected ${value} to be between ${min} and ${max}`);
}

function readPngDimensions(buffer: Buffer): { width: number; height: number } {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'official seat map should be a PNG');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function paethPredictor(left: number, up: number, upLeft: number): number {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

function decodePng(buffer: Buffer): DecodedPng {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'official seat map should be a PNG');

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : null;
  assert.ok(channels, `unsupported PNG color type: ${colorType}`);
  assert.equal(bitDepth, 8, 'official PNG should use 8-bit channels');
  assert.equal(interlace, 0, 'official PNG should not use interlace');

  const bytesPerPixel = channels;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const decoded = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;

    for (let index = 0; index < stride; index += 1) {
      const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0;
      const up = previous[index];
      const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] : 0;
      if (filter === 1) row[index] = (row[index] + left) & 0xff;
      else if (filter === 2) row[index] = (row[index] + up) & 0xff;
      else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 0xff;
      else assert.equal(filter, 0, `unsupported PNG row filter: ${filter}`);
    }

    row.copy(decoded, y * stride);
    previous = row;
  }

  return { width, height, channels, data: decoded };
}

function isGocheokSeatPixel(category: string, r: number, g: number, b: number): boolean {
  if (category === 'TABLE') return r < 105 && g < 125 && b > 30 && b > r + 10 && b > g - 25;
  if (category === 'DIAMOND') return r >= 150 && r <= 255 && g >= 35 && g <= 155 && b >= 80 && b <= 215;
  if (category === 'SKY_BLUE') return r >= 0 && r <= 125 && g >= 105 && g <= 230 && b >= 115 && b <= 255 && b > r + 35 && g > r + 35;
  if (category === 'BURGUNDY') return r >= 65 && r <= 225 && g <= 125 && b <= 160 && r > g + 15 && r > b + 10;
  if (category === 'GOLD') return r >= 185 && g >= 105 && g <= 210 && b <= 105;
  if (category === 'OUTFIELD') return r >= 55 && r <= 235 && g >= 85 && g <= 245 && b <= 185 && g > b + 5 && r + b < 385;
  return false;
}

function calculateSeatColorOverlapRatio(image: DecodedPng, category: string, path: string): number {
  const polygon = parsePathPoints(path);
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map(([x]) => x))));
  const maxX = Math.min(image.width - 1, Math.ceil(Math.max(...polygon.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map(([, y]) => y))));
  const maxY = Math.min(image.height - 1, Math.ceil(Math.max(...polygon.map(([, y]) => y))));
  let polygonPixels = 0;
  let seatPixels = 0;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (!pointInPolygon([x + 0.5, y + 0.5], polygon)) continue;
      polygonPixels += 1;
      const offset = (y * image.width + x) * image.channels;
      if (isGocheokSeatPixel(category, image.data[offset], image.data[offset + 1], image.data[offset + 2])) {
        seatPixels += 1;
      }
    }
  }

  return polygonPixels > 0 ? seatPixels / polygonPixels : 0;
}

test('고척 좌석도 공식 asset 상태를 명시한다', () => {
  assert.equal(GOCHEOK_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(GOCHEOK_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png');
  assert.equal(GOCHEOK_SEATMAP_IMAGE.requiredAssetFileName, 'gocheok-kiwoom-seatmap-official-2026.png');
  assert.equal(GOCHEOK_SEATMAP_IMAGE.imageWidth, 653);
  assert.equal(GOCHEOK_SEATMAP_IMAGE.imageHeight, 960);
  assert.equal(GOCHEOK_SEATMAP_VIEW_BOX, '0 0 653 960');
  assert.equal(GOCHEOK_SEATMAP_IMAGE.imageSha256, 'c3e44086682b21f23179cf438fab4f6bd9bcc9b92152bb572f0887b5f122f528');
  assert.ok(GOCHEOK_SEATMAP_IMAGE.sourceLabel);
  assert.equal(GOCHEOK_SEATMAP_IMAGE.sourceUrl, 'https://www.sisul.or.kr/open_content/skydome/introduce/seat.jsp');
  assert.match(GOCHEOK_SEATMAP_IMAGE.sourceLabel, /서울시설공단/);
});

test('고척 공식 PNG 파일은 geometry 좌표계 기준 asset과 일치한다', () => {
  const asset = readFileSync(new URL('../assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png', import.meta.url));
  const dimensions = readPngDimensions(asset);
  const sha256 = createHash('sha256').update(asset).digest('hex');

  assert.deepEqual(dimensions, {
    width: GOCHEOK_SEATMAP_IMAGE.imageWidth,
    height: GOCHEOK_SEATMAP_IMAGE.imageHeight,
  });
  assert.equal(sha256, GOCHEOK_SEATMAP_IMAGE.imageSha256, 'official PNG changed; re-run gocheokDebug QA and update geometry/hash together');
});

test('고척 공식 참고 정보는 좌석배치도와 시설현황을 분리해 제공한다', () => {
  const seatMapReference = GOCHEOK_OFFICIAL_REFERENCES.find((reference) => reference.id === 'SEATMAP');
  const facilityReference = GOCHEOK_OFFICIAL_REFERENCES.find((reference) => reference.id === 'FACILITY');

  assert.equal(GOCHEOK_OFFICIAL_REFERENCES.length, 2);
  assert.ok(seatMapReference);
  assert.equal(seatMapReference.kind, 'SEATMAP');
  assert.equal(seatMapReference.sourceUrl, GOCHEOK_SEATMAP_IMAGE.sourceUrl);
  assert.deepEqual(seatMapReference.imagePaths, [GOCHEOK_SEATMAP_IMAGE.imagePath]);

  assert.ok(facilityReference);
  assert.equal(facilityReference.kind, 'FACILITY_GUIDE');
  assert.equal(facilityReference.sourceUrl, 'https://www.sisul.or.kr/open_content/skydome/introduce/facility.jsp');
  assert.equal(facilityReference.imagePaths.length, 6);
  assert.ok(facilityReference.imagePaths.every((imagePath) => imagePath.startsWith('src/assets/stadiums/kiwoom/gocheok-sisul-facility-')));
});

test('고척 시설현황 guide는 공식 정적 안내 정보이며 좌석 hit-area와 분리된다', () => {
  const guide = GOCHEOK_FACILITY_GUIDE;

  assert.equal(guide.sourceUrl, 'https://www.sisul.or.kr/open_content/skydome/introduce/facility.jsp');
  assert.match(guide.sourceLabel, /서울시설공단/);
  assert.match(guide.usage, /문화 및 집회시설/);
  assert.match(guide.scale, /지하2층, 지상4층/);
  assert.equal(guide.totalSeats, 16601);
  assert.equal(guide.parkingSpaces, 484);
  assert.deepEqual(guide.ancillaryFacilities, ['축구장 1면', '풋살장 2면', '보행광장', '간이무대', '전기차충전소']);
  assert.equal(guide.overviewImages.length, 1);
  assert.equal(guide.entranceImages.length, 2);
  assert.equal(guide.floorImages.length, 3);
  assert.ok(guide.openLicenseLabel.includes('공공누리'));
  assert.ok(guide.implementationNote.includes('정적 공식 안내 자료'));
  assert.equal('imageGeometry' in (guide as Record<string, unknown>), false);
});

test('고척 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  GOCHEOK_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('고척 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  GOCHEOK_BLOCKS.forEach((block) => {
    assert.ok(GOCHEOK_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.fanRole, `${block.id} fan role should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.ok((block.imageGeometry.d.match(/L /g)?.length ?? 0) >= 3, `${block.id} image geometry should use polygon path data`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= GOCHEOK_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= GOCHEOK_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? GOCHEOK_SEATMAP_IMAGE.imageWidth : GOCHEOK_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });

    const polygon = parsePathPoints(block.imageGeometry.d);
    assert.equal(hasSelfIntersection(polygon), false, `${block.id} image geometry should not self-intersect`);
    assert.ok(
      pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], polygon),
      `${block.id} label point should stay inside its hit-area polygon`,
    );
  });
});

test('고척 블록 geometry는 정적 공식 이미지 좌표 map에서만 공급된다', () => {
  const geometryIds = new Set(Object.keys(GOCHEOK_IMAGE_GEOMETRY_DRAFTS));
  const blockIds = new Set(GOCHEOK_BLOCKS.map((block) => block.id));

  assert.equal(geometryIds.size, blockIds.size);
  GOCHEOK_BLOCKS.forEach((block) => {
    const draft = GOCHEOK_IMAGE_GEOMETRY_DRAFTS[block.id];
    assert.ok(draft, `${block.id} should have static image geometry`);
    assert.equal(block.imageGeometry.d, draft.d, `${block.id} should use the static geometry path`);
    assert.equal(block.imageGeometry.labelX, draft.labelX, `${block.id} should use the static label x`);
    assert.equal(block.imageGeometry.labelY, draft.labelY, `${block.id} should use the static label y`);
    assert.equal(block.imageGeometry.labelFontSize, draft.labelFontSize, `${block.id} should use the static label size`);
    assert.equal(block.imageGeometry.shortLabel, draft.shortLabel, `${block.id} should use the static short label`);
  });

  Object.keys(GOCHEOK_IMAGE_GEOMETRY_DRAFTS).forEach((id) => {
    assert.ok(blockIds.has(id), `${id} should map to an existing block`);
  });

  const source = readFileSync(new URL('./gocheokSeatData.ts', import.meta.url), 'utf8');
  assert.equal(source.includes('rectPath('), false);
  assert.equal(source.includes('arcBlocks('), false);
  assert.equal(source.includes('lineBlocks('), false);
});

test('고척 수동 보정 TODO 목록은 실제 블록 id만 참조한다', () => {
  const blockIds = new Set(GOCHEOK_BLOCKS.map((block) => block.id));
  const todoIds = new Set<string>();

  GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS.forEach((id) => {
    assert.ok(blockIds.has(id), `${id} should map to an existing Gocheok block`);
    assert.ok(!todoIds.has(id), `${id} should not be duplicated in the manual geometry TODO list`);
    assert.ok(!GOCHEOK_TRACE_REVIEWED_BLOCK_IDS.includes(id), `${id} should not be marked reviewed while it is in the manual TODO list`);
    todoIds.add(id);
  });
});

test('고척 omitted official block 목록은 합성 hit-area 생성을 막는다', () => {
  const officialBlocks = new Set(GOCHEOK_BLOCKS.flatMap((block) => block.officialBlocks));
  const omittedBlocks = new Set<string>();

  GOCHEOK_OMITTED_OFFICIAL_BLOCKS.forEach((entry) => {
    assert.ok(entry.block, 'omitted official block should include block');
    assert.ok(entry.reason, `${entry.block} should include omission reason`);
    assert.ok(entry.reviewNote, `${entry.block} should include review note`);
    assert.ok(!omittedBlocks.has(entry.block), `${entry.block} should not be duplicated in omitted official blocks`);
    assert.equal(officialBlocks.has(entry.block), false, `${entry.block} should not have a synthesized hit-area`);
    omittedBlocks.add(entry.block);
  });
});

test('고척 trace review metadata는 전체 블록을 검수 구역에 배정한다', () => {
  const blockIds = new Set(GOCHEOK_BLOCKS.map((block) => block.id));
  const assignedIds = new Set<string>();
  const reviewedIds = new Set(GOCHEOK_TRACE_REVIEWED_BLOCK_IDS);
  const todoIds = new Set(GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS);

  assert.ok(GOCHEOK_TRACE_REVIEW_REGIONS.length >= 6, 'Gocheok trace review should be grouped by review priority');
  GOCHEOK_TRACE_REVIEW_REGIONS.forEach((region) => {
    assert.ok(region.id, 'trace review region should have id');
    assert.ok(region.label, `${region.id} should have label`);
    assert.ok(region.note, `${region.id} should have note`);
    assert.ok(region.blockIds.length > 0, `${region.id} should include block ids`);
    region.blockIds.forEach((id) => {
      assert.ok(blockIds.has(id), `${id} should map to an existing Gocheok block`);
      assert.ok(!assignedIds.has(id), `${id} should not be duplicated across trace review regions`);
      assignedIds.add(id);
    });
  });

  assert.equal(assignedIds.size, blockIds.size, 'all Gocheok blocks should be assigned to one trace review region');
  GOCHEOK_BLOCKS.forEach((block) => {
    assert.ok(reviewedIds.has(block.id) || todoIds.has(block.id), `${block.id} should be reviewed or marked as manual TODO`);
  });
  assert.equal(reviewedIds.size + todoIds.size, blockIds.size, 'reviewed and TODO metadata should cover active Gocheok blocks exactly');
});

test('고척 reviewed trace 블록은 공식 PNG 좌석 색상과 충분히 겹친다', () => {
  const asset = readFileSync(new URL('../assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png', import.meta.url));
  const image = decodePng(asset);
  const reviewedIds = new Set<string>();
  const tableIds = GOCHEOK_BLOCKS.filter((block) => block.category === 'TABLE').map((block) => block.id);

  tableIds.forEach((id) => {
    assert.ok(GOCHEOK_TRACE_REVIEWED_BLOCK_IDS.includes(id), `${id} table geometry should be marked as reviewed`);
  });

  GOCHEOK_TRACE_REVIEWED_BLOCK_IDS.forEach((id) => {
    assert.ok(!reviewedIds.has(id), `${id} should not be duplicated in reviewed trace ids`);
    reviewedIds.add(id);

    const block = GOCHEOK_BLOCKS.find((item) => item.id === id);
    assert.ok(block, `${id} should map to an existing Gocheok block`);
    const overlapRatio = calculateSeatColorOverlapRatio(image, block.category, block.imageGeometry.d);
    assert.ok(
      overlapRatio >= 0.5,
      `${id} reviewed geometry should overlap official colored seat pixels. Actual ratio: ${overlapRatio.toFixed(2)}`,
    );
  });
});

test('고척 공식 좌석도 주요 블록 그룹을 포함한다', () => {
  const officialBlocks = new Set(GOCHEOK_BLOCKS.flatMap((block) => block.officialBlocks));
  const requiredOfficialBlocks = [
    ...Array.from({ length: 7 }, (_, index) => `D0${index + 1}`),
    ...Array.from({ length: 7 }, (_, index) => `T0${index + 1}`),
    'T11',
    'T12',
    'T13',
    'T15',
    'T16',
    'T17',
    ...Array.from({ length: 9 }, (_, index) => `S0${index + 1}`),
    ...Array.from({ length: 8 }, (_, index) => `S${index + 10}`),
    ...numberedBlocks(101, 114),
    ...numberedBlocks(201, 210),
    ...numberedBlocks(301, 321),
    ...numberedBlocks(401, 435),
    ...numberedBlocks(115, 132),
    ...numberedBlocks(211, 222),
    ...numberedBlocks(323, 334),
  ];

  assert.ok(GOCHEOK_BLOCKS.length >= 150, 'Gocheok official seat map should expose block-level hit areas');
  requiredOfficialBlocks.forEach((officialBlock) => {
    assert.ok(officialBlocks.has(officialBlock), `${officialBlock} should exist`);
  });
  assert.equal(officialBlocks.has('T14'), false, 'T14 should not be synthesized without a visible official block');
  GOCHEOK_OMITTED_OFFICIAL_BLOCKS.forEach((entry) => {
    assert.equal(officialBlocks.has(entry.block), false, `${entry.block} should not be synthesized without a visible official block`);
  });

  assert.ok(GOCHEOK_BLOCKS.some((block) => block.category === 'DIAMOND'), 'diamond section should exist');
  assert.ok(GOCHEOK_BLOCKS.some((block) => block.category === 'BURGUNDY'), 'burgundy section should exist');
  assert.ok(GOCHEOK_BLOCKS.some((block) => block.category === 'OUTFIELD'), 'outfield section should exist');
});

test('고척 대표 anchor 블록 label 좌표는 공식 이미지 좌석 영역에 고정된다', () => {
  const expectedBounds: Record<string, { x: [number, number]; y: [number, number] }> = {
    'gocheok-d04': { x: [314, 326], y: [652, 665] },
    'gocheok-t07': { x: [192, 204], y: [599, 612] },
    'gocheok-t06': { x: [220, 232], y: [639, 652] },
    'gocheok-t05': { x: [256, 268], y: [668, 681] },
    'gocheok-t04': { x: [312, 328], y: [675, 690] },
    'gocheok-t03': { x: [372, 384], y: [668, 681] },
    'gocheok-t02': { x: [407, 420], y: [639, 652] },
    'gocheok-t01': { x: [436, 448], y: [599, 612] },
    'gocheok-t17': { x: [174, 185], y: [613, 624] },
    'gocheok-t16': { x: [204, 215], y: [656, 667] },
    'gocheok-t15': { x: [242, 254], y: [687, 698] },
    'gocheok-t13': { x: [386, 398], y: [687, 698] },
    'gocheok-t12': { x: [425, 436], y: [656, 667] },
    'gocheok-t11': { x: [456, 467], y: [613, 624] },
    'gocheok-s01': { x: [480, 492], y: [635, 647] },
    'gocheok-s02': { x: [468, 480], y: [644, 656] },
    'gocheok-s03': { x: [459, 471], y: [654, 666] },
    'gocheok-s04': { x: [453, 465], y: [664, 676] },
    'gocheok-s05': { x: [442, 454], y: [674, 686] },
    'gocheok-s06': { x: [431, 443], y: [684, 696] },
    'gocheok-s07': { x: [419, 431], y: [695, 707] },
    'gocheok-s08': { x: [405, 417], y: [706, 718] },
    'gocheok-s17': { x: [124, 136], y: [599, 611] },
    'gocheok-s16': { x: [137, 149], y: [619, 631] },
    'gocheok-s15': { x: [161, 173], y: [642, 654] },
    'gocheok-s14': { x: [170, 182], y: [654, 666] },
    'gocheok-s13': { x: [178, 190], y: [666, 678] },
    'gocheok-s12': { x: [187, 199], y: [678, 690] },
    'gocheok-s11': { x: [198, 210], y: [689, 701] },
    'gocheok-s10': { x: [210, 222], y: [698, 710] },
    'gocheok-s09': { x: [218, 230], y: [713, 725] },
    'gocheok-101': { x: [540, 562], y: [410, 434] },
    'gocheok-114': { x: [78, 100], y: [410, 434] },
    'gocheok-301': { x: [574, 592], y: [534, 552] },
    'gocheok-321': { x: [64, 84], y: [558, 580] },
    'gocheok-401': { x: [586, 608], y: [564, 590] },
    'gocheok-412': { x: [326, 348], y: [820, 841] },
    'gocheok-424': { x: [32, 54], y: [564, 590] },
    'gocheok-425': { x: [156, 181], y: [126, 149] },
    'gocheok-430': { x: [306, 331], y: [102, 118] },
    'gocheok-431': { x: [358, 371], y: [90, 103] },
    'gocheok-432': { x: [381, 393], y: [91, 104] },
    'gocheok-433': { x: [407, 420], y: [99, 112] },
    'gocheok-435': { x: [460, 484], y: [126, 150] },
    'gocheok-323': { x: [158, 170], y: [156, 168] },
    'gocheok-324': { x: [203, 215], y: [138, 150] },
    'gocheok-325': { x: [227, 239], y: [130, 143] },
    'gocheok-326': { x: [239, 251], y: [124, 136] },
    'gocheok-327': { x: [278, 290], y: [120, 132] },
    'gocheok-328': { x: [302, 314], y: [120, 132] },
    'gocheok-329': { x: [327, 339], y: [120, 132] },
    'gocheok-330': { x: [351, 363], y: [122, 134] },
    'gocheok-331': { x: [375, 387], y: [126, 138] },
    'gocheok-116': { x: [118, 128], y: [274, 284] },
    'gocheok-117': { x: [124, 136], y: [261, 273] },
    'gocheok-118': { x: [138, 150], y: [243, 255] },
    'gocheok-119': { x: [154, 166], y: [230, 242] },
    'gocheok-121': { x: [218, 226], y: [202, 211] },
    'gocheok-131': { x: [515, 530], y: [276, 288] },
    'gocheok-132': { x: [530, 544], y: [292, 304] },
    'gocheok-332': { x: [400, 412], y: [130, 143] },
    'gocheok-333': { x: [424, 436], y: [138, 150] },
    'gocheok-334': { x: [459, 472], y: [153, 166] },
  };

  Object.entries(expectedBounds).forEach(([id, bounds]) => {
    const block = GOCHEOK_BLOCKS.find((item) => item.id === id);
    assert.ok(block, `${id} should exist`);
    assertInRange(block.imageGeometry.labelX, bounds.x[0], bounds.x[1], `${id} label x`);
    assertInRange(block.imageGeometry.labelY, bounds.y[0], bounds.y[1], `${id} label y`);
  });
});
