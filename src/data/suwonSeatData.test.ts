import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_CATEGORIES,
  SUWON_HIT_TEST_PROBES,
  SUWON_HIT_GEOMETRY_EXCEPTION_NOTES,
  SUWON_IMAGE_GEOMETRY_DRAFTS,
  SUWON_SEATMAP_IMAGE,
  SUWON_SEATMAP_VIEWPORT,
  SUWON_TRACE_REVIEW_SUMMARY,
} from './suwonSeatData';

type Point = [number, number];

interface ImagePixelData {
  data: Buffer;
  width: number;
  height: number;
  channels: number;
}

interface PixelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface PixelReviewTarget {
  id: string;
  seed: Point;
  tolerance: number;
  mode: 'connected' | 'bounded';
  reviewBounds?: PixelBounds;
  expectedBounds: PixelBounds;
  minPixelCount: number;
  minInsideRatio: number;
  maxPathToPixelAreaRatio: number;
  maxBoundsOverflow: number;
}

function imageDimensions(filePath: string): { width: number; height: number } {
  const buffer = fs.readFileSync(filePath);

  if (buffer.toString('ascii', 1, 4) === 'PNG') {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          width: buffer.readUInt16BE(offset + 7),
          height: buffer.readUInt16BE(offset + 5),
        };
      }
      offset += 2 + length;
    }
  }

  throw new Error(`${filePath} should be a PNG or JPEG image`);
}

async function readOfficialSuwonSeatmapPixels(): Promise<ImagePixelData> {
  const { data, info } = await sharp(SUWON_SEATMAP_IMAGE.imagePath)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels,
  };
}

function pixelOffset(image: ImagePixelData, x: number, y: number): number {
  return ((y * image.width) + x) * image.channels;
}

function getPixelColor(image: ImagePixelData, point: Point): [number, number, number] {
  const x = Math.max(0, Math.min(image.width - 1, Math.round(point[0])));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(point[1])));
  const offset = pixelOffset(image, x, y);

  return [
    image.data[offset],
    image.data[offset + 1],
    image.data[offset + 2],
  ];
}

function isClosePixelColor(image: ImagePixelData, x: number, y: number, color: [number, number, number], tolerance: number): boolean {
  const offset = pixelOffset(image, x, y);

  return Math.abs(image.data[offset] - color[0]) <= tolerance
    && Math.abs(image.data[offset + 1] - color[1]) <= tolerance
    && Math.abs(image.data[offset + 2] - color[2]) <= tolerance;
}

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

const STABLE_HIT_LABEL_BLOCK_IDS = [
  'suwon-201',
  'suwon-204',
  'suwon-205',
  'suwon-206',
  'suwon-213',
  'suwon-311',
  'suwon-312',
  'suwon-313',
];

function pathPoints(d: string): Point[] {
  const coordinates = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let index = 0; index < coordinates.length - 1; index += 2) {
    points.push([coordinates[index], coordinates[index + 1]]);
  }
  return points;
}

function assertDeepFrozen(value: unknown, path = 'root', seen = new WeakSet<object>()) {
  if (typeof value !== 'object' || value === null) {
    return;
  }

  assert.equal(Object.isFrozen(value), true, `${path} should be frozen`);

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      assertDeepFrozen(item as object, `${path}[${index}]`, seen);
    });
    return;
  }

  Object.entries(value).forEach(([key, item]) => {
    assertDeepFrozen(item as object, `${path}.${key}`, seen);
  });
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  const [x, y] = point;
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersects) inside = !inside;
  }

  return inside;
}

function centroid(points: Point[]): Point {
  return [
    points.reduce((sum, point) => sum + point[0], 0) / points.length,
    points.reduce((sum, point) => sum + point[1], 0) / points.length,
  ];
}

function probeKey(id: string, point: Point): string {
  return `${id}:${point[0]},${point[1]}`;
}

function snapshotSuwonSeatFixture() {
  const blocksSnapshot = SUWON_BLOCKS
    .map((block) => ({
      ...block,
      officialBlocks: [...block.officialBlocks],
      seatViewSections: [...block.seatViewSections],
      imageGeometry: { ...block.imageGeometry },
      hitGeometry: { ...block.hitGeometry },
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((block) => ({
      ...block,
      imageGeometry: { ...block.imageGeometry, shortLabel: block.imageGeometry.shortLabel },
      hitGeometry: { ...block.hitGeometry, shortLabel: block.hitGeometry.shortLabel },
    }));

  const alignmentProbeSnapshot = SUWON_ALIGNMENT_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  const browserQaProbeSnapshot = SUWON_BROWSER_QA_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  const hitTestProbeSnapshot = SUWON_HIT_TEST_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  return JSON.stringify({
    blocks: blocksSnapshot,
    alignmentProbes: alignmentProbeSnapshot,
    browserQaProbes: browserQaProbeSnapshot,
    hitTestProbes: hitTestProbeSnapshot,
  });
}

function suwonFixtureSignature() {
  return createHash('sha256').update(snapshotSuwonSeatFixture()).digest('hex');
}

const SUWON_RELEASE_LOCK_FIXTURE_SIGNATURE = '4b6c7bd784bb18cad7fcdbc5ffb12f78daabf968d691647b69456b3bd74aeeaf';

function splitProbeKeysByBlock(probeKeys: Set<string>): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  probeKeys.forEach((key) => {
    const [id, point] = key.split(':', 2);
    const points = grouped.get(id) ?? [];
    points.push(point);
    grouped.set(id, points);
  });

  grouped.forEach((points) => {
    points.sort();
  });

  return grouped;
}

function formatProbeDiffByBlock(diffByBlock: Map<string, string[]>): string {
  return Array.from(diffByBlock.entries())
    .map(([id, points]) => `${id}:[${points.join(', ')}]`)
    .sort((a, b) => a.localeCompare(b))
    .join('; ');
}

function diffSet(a: Set<string>, b: Set<string>) {
  const missing = Array.from(a).filter((value) => !b.has(value)).sort();
  const extra = Array.from(b).filter((value) => !a.has(value)).sort();
  return { missing, extra };
}

function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);
}

function polygonBounds(points: Point[]): PixelBounds {
  return {
    minX: Math.min(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxX: Math.max(...points.map((point) => point[0])),
    maxY: Math.max(...points.map((point) => point[1])),
  };
}

function maxBoundsOverflow(inner: PixelBounds, outer: PixelBounds): number {
  return Math.max(
    Math.max(0, inner.minX - outer.minX),
    Math.max(0, inner.minY - outer.minY),
    Math.max(0, outer.maxX - inner.maxX),
    Math.max(0, outer.maxY - inner.maxY),
  );
}

function assertNearBounds(actual: PixelBounds, expected: PixelBounds, tolerance: number, message: string) {
  assert.ok(Math.abs(actual.minX - expected.minX) <= tolerance, `${message} minX expected ${expected.minX} actual ${actual.minX}`);
  assert.ok(Math.abs(actual.minY - expected.minY) <= tolerance, `${message} minY expected ${expected.minY} actual ${actual.minY}`);
  assert.ok(Math.abs(actual.maxX - expected.maxX) <= tolerance, `${message} maxX expected ${expected.maxX} actual ${actual.maxX}`);
  assert.ok(Math.abs(actual.maxY - expected.maxY) <= tolerance, `${message} maxY expected ${expected.maxY} actual ${actual.maxY}`);
}

function hitProbePoints(d: string, label: Point): Point[] {
  const points = pathPoints(d);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const probes: Point[] = [label, centroid(points)];

  for (let xIndex = 1; xIndex <= 3; xIndex += 1) {
    for (let yIndex = 1; yIndex <= 3; yIndex += 1) {
      const point: Point = [
        minX + ((maxX - minX) * xIndex) / 4,
        minY + ((maxY - minY) * yIndex) / 4,
      ];
      if (pointInPolygon(point, points)) probes.push(point);
    }
  }

  return probes;
}

function visualProbePoints(block: (typeof SUWON_BLOCKS)[number]): Point[] {
  return hitProbePoints(block.imageGeometry.d, [block.imageGeometry.labelX, block.imageGeometry.labelY]);
}

function topHitBlockAt(point: Point) {
  let topBlock: (typeof SUWON_BLOCKS)[number] | null = null;

  [...SUWON_BLOCKS]
    .sort((a, b) => (
      (a.hitPriority - b.hitPriority)
      || (polygonArea(pathPoints(b.hitGeometry.d)) - polygonArea(pathPoints(a.hitGeometry.d)))
    ))
    .forEach((block) => {
      const polygon = pathPoints(block.hitGeometry.d);
      if (polygon.length >= 3 && pointInPolygon(point, polygon)) {
        topBlock = block;
      }
    });

  return topBlock;
}

type VisualProbeExpectation = { id: string; point: Point; note?: string };

function suwonBlock(id: string): (typeof SUWON_BLOCKS)[number] {
  const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
  assert.ok(block, `${id} should exist`);
  return block;
}

function assertVisualLabelContracts(ids: string[]) {
  ids.forEach((id) => {
    const block = suwonBlock(id);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    assert.ok(pointInPolygon(label, pathPoints(block.imageGeometry.d)), `${id} label should stay inside visual polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} visual label should resolve to itself`);
  });
}

function assertVisualEdgeProbes(probes: VisualProbeExpectation[]) {
  probes.forEach(({ id, point, note }) => {
    const block = suwonBlock(id);
    const context = note ? `${note}: ` : '';
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${context}${point.join(',')} should stay inside ${id} visual polygon`);
    assert.equal(topHitBlockAt(point)?.id, id, `${context}${point.join(',')} should resolve to ${id}`);
  });
}

function assertExcludedVisualProbes(probes: VisualProbeExpectation[]) {
  probes.forEach(({ id, point, note }) => {
    const block = suwonBlock(id);
    assert.ok(!pointInPolygon(point, pathPoints(block.imageGeometry.d)), note ?? `${point.join(',')} should stay outside ${id}`);
    assert.notEqual(topHitBlockAt(point)?.id, id, note ?? `${point.join(',')} should not resolve to ${id}`);
  });
}

function collectBoundedOfficialPixels(image: ImagePixelData, target: PixelReviewTarget, color: [number, number, number]) {
  assert.ok(target.reviewBounds, `${target.id} should provide review bounds for bounded pixel review`);
  const pixels: Point[] = [];
  const bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  for (let y = target.reviewBounds.minY; y <= target.reviewBounds.maxY; y += 1) {
    for (let x = target.reviewBounds.minX; x <= target.reviewBounds.maxX; x += 1) {
      if (!isClosePixelColor(image, x, y, color, target.tolerance)) continue;
      pixels.push([x, y]);
      bounds.minX = Math.min(bounds.minX, x);
      bounds.minY = Math.min(bounds.minY, y);
      bounds.maxX = Math.max(bounds.maxX, x);
      bounds.maxY = Math.max(bounds.maxY, y);
    }
  }

  return { pixels, bounds };
}

function collectConnectedOfficialPixels(image: ImagePixelData, target: PixelReviewTarget, color: [number, number, number]) {
  const seedX = Math.round(target.seed[0]);
  const seedY = Math.round(target.seed[1]);
  const start = (seedY * image.width) + seedX;
  const seen = new Uint8Array(image.width * image.height);
  const queue = [start];
  const pixels: Point[] = [];
  const bounds = {
    minX: seedX,
    minY: seedY,
    maxX: seedX,
    maxY: seedY,
  };
  seen[start] = 1;

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const x = current % image.width;
    const y = Math.floor(current / image.width);
    if (!isClosePixelColor(image, x, y, color, target.tolerance)) continue;

    pixels.push([x, y]);
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);

    ([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]] as Point[]).forEach(([nextX, nextY]) => {
      if (nextX < 0 || nextY < 0 || nextX >= image.width || nextY >= image.height) return;
      const next = (nextY * image.width) + nextX;
      if (seen[next]) return;
      seen[next] = 1;
      if (isClosePixelColor(image, nextX, nextY, color, target.tolerance)) {
        queue.push(next);
      }
    });
  }

  return { pixels, bounds };
}

const SUWON_SPECIAL_PIXEL_REVIEW_TARGETS: PixelReviewTarget[] = [
  {
    id: 'suwon-lf-grass',
    seed: [1700, 1900],
    tolerance: 32,
    mode: 'connected',
    expectedBounds: { minX: 1032, minY: 1825, maxX: 1850, maxY: 2379 },
    minPixelCount: 180000,
    minInsideRatio: 0.98,
    maxPathToPixelAreaRatio: 1.14,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-rf-grass',
    seed: [2585, 2085],
    tolerance: 32,
    mode: 'bounded',
    reviewBounds: { minX: 2187, minY: 1867, maxX: 2874, maxY: 2307 },
    expectedBounds: { minX: 2187, minY: 1867, maxX: 2874, maxY: 2307 },
    minPixelCount: 145000,
    minInsideRatio: 0.94,
    maxPathToPixelAreaRatio: 1.1,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-501-508',
    seed: [3091, 1770],
    tolerance: 30,
    mode: 'connected',
    expectedBounds: { minX: 2756, minY: 1501, maxX: 3429, maxY: 2055 },
    minPixelCount: 130000,
    minInsideRatio: 0.98,
    maxPathToPixelAreaRatio: 1.16,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-7pub',
    seed: [2030, 1930],
    tolerance: 24,
    mode: 'connected',
    expectedBounds: { minX: 1853, minY: 1807, maxX: 2174, maxY: 2059 },
    minPixelCount: 63000,
    minInsideRatio: 0.98,
    maxPathToPixelAreaRatio: 1.26,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-green',
    seed: [2940, 2228],
    tolerance: 30,
    mode: 'bounded',
    reviewBounds: { minX: 2765, minY: 2046, maxX: 3095, maxY: 2377 },
    expectedBounds: { minX: 2765, minY: 2046, maxX: 3095, maxY: 2377 },
    minPixelCount: 65000,
    minInsideRatio: 0.84,
    maxPathToPixelAreaRatio: 1.08,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-k-live',
    seed: [2750, 1840],
    tolerance: 28,
    mode: 'connected',
    expectedBounds: { minX: 2668, minY: 1757, maxX: 2989, maxY: 1990 },
    minPixelCount: 28000,
    minInsideRatio: 0.98,
    maxPathToPixelAreaRatio: 1.12,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-hite-pub',
    seed: [3260, 2240],
    tolerance: 28,
    mode: 'connected',
    expectedBounds: { minX: 3197, minY: 2145, maxX: 3417, maxY: 2455 },
    minPixelCount: 21000,
    minInsideRatio: 0.94,
    maxPathToPixelAreaRatio: 1.25,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-kids-camp',
    seed: [3370, 2180],
    tolerance: 28,
    mode: 'connected',
    expectedBounds: { minX: 3300, minY: 2034, maxX: 3596, maxY: 2487 },
    minPixelCount: 45000,
    minInsideRatio: 0.97,
    maxPathToPixelAreaRatio: 1.18,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-wiz-garden',
    seed: [3700, 2450],
    tolerance: 28,
    mode: 'connected',
    expectedBounds: { minX: 3422, minY: 2305, maxX: 3755, maxY: 3316 },
    minPixelCount: 120000,
    minInsideRatio: 0.98,
    maxPathToPixelAreaRatio: 1.18,
    maxBoundsOverflow: 8,
  },
  {
    id: 'suwon-3b-highfive',
    seed: [1600, 3220],
    tolerance: 28,
    mode: 'connected',
    expectedBounds: { minX: 1368, minY: 2815, maxX: 1657, maxY: 3274 },
    minPixelCount: 26000,
    minInsideRatio: 0.95,
    maxPathToPixelAreaRatio: 1.25,
    maxBoundsOverflow: 4,
  },
  {
    id: 'suwon-1b-highfive',
    seed: [2520, 3220],
    tolerance: 34,
    mode: 'connected',
    expectedBounds: { minX: 2458, minY: 2815, maxX: 2747, maxY: 3274 },
    minPixelCount: 25000,
    minInsideRatio: 0.975,
    maxPathToPixelAreaRatio: 1.34,
    maxBoundsOverflow: 4,
  },
];

test('수원 좌석도 공식 asset 상태를 명시한다', () => {
  assert.equal(SUWON_SEATMAP_IMAGE.assetStatus, 'OFFICIAL');
  assert.equal(SUWON_SEATMAP_IMAGE.imagePath, 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.jpg');
  assert.equal(SUWON_SEATMAP_IMAGE.draftAssetFileName, 'suwon-kt-seatmap-official-2026.png');
  assert.equal(SUWON_SEATMAP_IMAGE.requiredAssetFileName, 'suwon-kt-seatmap-official-2026@2x.jpg');
  assert.equal(SUWON_SEATMAP_IMAGE.requiredAssetPath, 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.jpg');
  assert.ok(SUWON_SEATMAP_IMAGE.imageWidth >= SUWON_SEATMAP_IMAGE.minimumOfficialImageWidth);
  assert.ok(SUWON_SEATMAP_IMAGE.imageHeight >= SUWON_SEATMAP_IMAGE.minimumOfficialImageHeight);
  assert.equal(SUWON_SEATMAP_IMAGE.imageWidth, 4290);
  assert.equal(SUWON_SEATMAP_IMAGE.imageHeight, 9679);
  assert.equal(SUWON_SEATMAP_IMAGE.sourceUrl, 'https://www.ktwiz.co.kr/ticket/seatmap');
  assert.ok(SUWON_SEATMAP_IMAGE.sourceLabel);

  const assetPath = path.resolve(process.cwd(), SUWON_SEATMAP_IMAGE.imagePath);
  assert.ok(fs.existsSync(assetPath), 'Suwon official source image should exist');
  assert.deepEqual(imageDimensions(assetPath), { width: SUWON_SEATMAP_IMAGE.imageWidth, height: SUWON_SEATMAP_IMAGE.imageHeight });

  const requiredAssetPath = path.resolve(process.cwd(), SUWON_SEATMAP_IMAGE.requiredAssetPath);
  assert.ok(fs.existsSync(requiredAssetPath), 'High-res official Suwon source should be present');
  const requiredDimensions = imageDimensions(requiredAssetPath);
  assert.ok(requiredDimensions.width >= SUWON_SEATMAP_IMAGE.minimumOfficialImageWidth, 'High-res official Suwon source should meet minimum width');
  assert.ok(requiredDimensions.height >= SUWON_SEATMAP_IMAGE.minimumOfficialImageHeight, 'High-res official Suwon source should meet minimum height');
  assert.ok(SUWON_SEATMAP_VIEWPORT.cropY >= 0);
  assert.ok(SUWON_SEATMAP_VIEWPORT.cropHeight > 0);
  assert.ok(SUWON_SEATMAP_VIEWPORT.cropY + SUWON_SEATMAP_VIEWPORT.cropHeight <= SUWON_SEATMAP_IMAGE.imageHeight);
});

test('수원 블록 데이터는 중복 id와 중복 공식 블록을 갖지 않는다', () => {
  const ids = new Set<string>();
  const officialBlocks = new Set<string>();

  SUWON_BLOCKS.forEach((block) => {
    assert.ok(!ids.has(block.id), `${block.id} id should be unique`);
    ids.add(block.id);

    block.officialBlocks.forEach((officialBlock) => {
      assert.ok(!officialBlocks.has(officialBlock), `${officialBlock} official block should be unique`);
      officialBlocks.add(officialBlock);
    });
  });
});

test('수원 블록과 공식 이미지 geometry draft는 1:1로 연결된다', () => {
  const blockIds = new Set(SUWON_BLOCKS.map((block) => block.id));
  const geometryIds = new Set(Object.keys(SUWON_IMAGE_GEOMETRY_DRAFTS));

  assert.deepEqual(blockIds, geometryIds);
  SUWON_BLOCKS.forEach((block) => {
    const draft = SUWON_IMAGE_GEOMETRY_DRAFTS[block.id];
    assert.ok(draft, `${block.id} should have a static image geometry draft`);
    assert.equal(block.imageGeometry.d, draft.imageGeometry.d, `${block.id} should use the static image geometry path`);
    assert.equal(block.imageGeometry.labelX, draft.imageGeometry.labelX, `${block.id} should use the static image label x`);
    assert.equal(block.imageGeometry.labelY, draft.imageGeometry.labelY, `${block.id} should use the static image label y`);
    assert.equal(block.hitGeometry.d, draft.hitGeometry.d, `${block.id} should use the static hit geometry path`);
    assert.equal(block.hitGeometry.labelX, draft.hitGeometry.labelX, `${block.id} should use the static hit label x`);
    assert.equal(block.hitGeometry.labelY, draft.hitGeometry.labelY, `${block.id} should use the static hit label y`);
    assert.equal(block.hitPriority, draft.hitPriority, `${block.id} should use the static hit priority`);
    assert.equal(block.traceStatus, draft.traceStatus, `${block.id} should expose its geometry trace status`);
  });
});

test('수원 블록 데이터는 지도 렌더링과 시야 사진 연결에 필요한 필드를 가진다', () => {
  SUWON_BLOCKS.forEach((block) => {
    assert.ok(SUWON_CATEGORIES[block.category], `${block.id} category should be defined`);
    assert.ok(block.side, `${block.id} side should exist`);
    assert.ok(block.level, `${block.id} level should exist`);
    assert.ok(block.fanRole, `${block.id} fan role should exist`);
    assert.ok(block.sourceConfidence, `${block.id} source confidence should exist`);
    assert.ok(block.sourceNote, `${block.id} source note should exist`);
    assert.ok(block.officialBlocks.length > 0, `${block.id} official blocks should exist`);
    assert.ok(block.seatViewSections.length > 0, `${block.id} seat view aliases should exist`);
    assert.ok(block.imageGeometry.d.startsWith('M '), `${block.id} image geometry path should exist`);
    assert.ok((block.imageGeometry.d.match(/L /g)?.length ?? 0) >= 3, `${block.id} image geometry should use traced polygon/path data`);
    assert.ok(block.imageGeometry.shortLabel, `${block.id} image label should exist`);
    assert.ok(block.imageGeometry.labelX >= 0 && block.imageGeometry.labelX <= SUWON_SEATMAP_IMAGE.imageWidth, `${block.id} label x should fit image bounds`);
    assert.ok(block.imageGeometry.labelY >= 0 && block.imageGeometry.labelY <= SUWON_SEATMAP_IMAGE.imageHeight, `${block.id} label y should fit image bounds`);
    assert.ok(block.hitGeometry.d.startsWith('M '), `${block.id} hit geometry path should exist`);
    assert.ok((block.hitGeometry.d.match(/L /g)?.length ?? 0) >= 3, `${block.id} hit geometry should use polygon/path data`);
    assert.ok(block.hitGeometry.shortLabel, `${block.id} hit label should exist`);
    assert.ok(block.hitGeometry.labelX >= 0 && block.hitGeometry.labelX <= SUWON_SEATMAP_IMAGE.imageWidth, `${block.id} hit label x should fit image bounds`);
    assert.ok(block.hitGeometry.labelY >= 0 && block.hitGeometry.labelY <= SUWON_SEATMAP_IMAGE.imageHeight, `${block.id} hit label y should fit image bounds`);
    assert.ok(Number.isInteger(block.hitPriority) && block.hitPriority >= 1, `${block.id} hit priority should be explicit`);
    assert.ok(block.traceStatus === 'OFFICIAL_IMAGE_TRACED' || block.traceStatus === 'DRAFT_APPROXIMATE', `${block.id} trace status should be explicit`);

    const pathNumbers = block.imageGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(pathNumbers.length >= 4, `${block.id} image geometry should contain path coordinates`);
    pathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? SUWON_SEATMAP_IMAGE.imageWidth : SUWON_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} path coordinate ${coordinate} should fit image bounds`);
    });

    const hitPathNumbers = block.hitGeometry.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    assert.ok(hitPathNumbers.length >= 4, `${block.id} hit geometry should contain path coordinates`);
    hitPathNumbers.forEach((coordinate, index) => {
      const limit = index % 2 === 0 ? SUWON_SEATMAP_IMAGE.imageWidth : SUWON_SEATMAP_IMAGE.imageHeight;
      assert.ok(coordinate >= 0 && coordinate <= limit, `${block.id} hit path coordinate ${coordinate} should fit image bounds`);
    });
  });
});

test('수원 geometry trace review summary는 draft 좌표를 과장하지 않는다', () => {
  assert.equal(SUWON_TRACE_REVIEW_SUMMARY.totalBlocks, SUWON_BLOCKS.length);
  assert.equal(
    SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced + SUWON_TRACE_REVIEW_SUMMARY.draftApproximate,
    SUWON_TRACE_REVIEW_SUMMARY.totalBlocks,
  );
  assert.equal(SUWON_TRACE_REVIEW_SUMMARY.draftApproximate, 0, 'Suwon geometry should not ship draft trace work');
  assert.equal(SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced, SUWON_BLOCKS.length);
  assert.deepEqual(SUWON_TRACE_REVIEW_SUMMARY.pendingBlockIds, []);
  assert.deepEqual(SUWON_TRACE_REVIEW_SUMMARY.pendingByCategory, []);
});

test('수원 좌석도 release lock fingerprint는 geometry/QA 계약을 고정한다', () => {
  const skyboxIds = numberedBlocks(1, 35).map((blockName) => `suwon-sb${blockName}`);
  const sortedSkyboxIds = [...skyboxIds].sort((a, b) => a.localeCompare(b));
  const visualHitMismatchIds = SUWON_BLOCKS
    .filter((block) => block.imageGeometry.d !== block.hitGeometry.d)
    .map((block) => block.id)
    .sort((a, b) => a.localeCompare(b));
  const hitExceptionIds = Object.keys(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES);
  const hitExceptionIdSet = new Set(hitExceptionIds);
  const approvedVisualHitSplitIds = visualHitMismatchIds
    .filter((id) => hitExceptionIdSet.has(id))
    .sort((a, b) => a.localeCompare(b));
  const unresolvedVisualHitMismatchIds = visualHitMismatchIds
    .filter((id) => !hitExceptionIdSet.has(id))
    .sort((a, b) => a.localeCompare(b));
  const unusedHitExceptionIds = hitExceptionIds
    .filter((id) => !visualHitMismatchIds.includes(id))
    .sort((a, b) => a.localeCompare(b));

  assert.equal(suwonFixtureSignature(), SUWON_RELEASE_LOCK_FIXTURE_SIGNATURE);
  assert.equal(SUWON_BLOCKS.length, 176);
  assert.equal(SUWON_BLOCKS.filter((block) => /^suwon-\d+$/.test(block.id)).length, 126);
  assert.equal(SUWON_BLOCKS.filter((block) => /^suwon-sb\d+$/.test(block.id)).length, 35);
  assert.equal(SUWON_BLOCKS.filter((block) => /^suwon-4\d\d$/.test(block.id)).length, 32);
  assert.equal(SUWON_BLOCKS.filter((block) => !/^suwon-(\d+|sb\d+)$/.test(block.id)).length, 15);
  assert.equal(SUWON_ALIGNMENT_PROBES.length, 556);
  assert.equal(SUWON_BROWSER_QA_PROBES.length, 176);
  assert.equal(SUWON_HIT_TEST_PROBES.length, 732);
  assert.deepEqual(visualHitMismatchIds, sortedSkyboxIds);
  assert.deepEqual(approvedVisualHitSplitIds, sortedSkyboxIds);
  assert.deepEqual(unresolvedVisualHitMismatchIds, []);
  assert.deepEqual(Object.keys(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES), skyboxIds);
  assert.deepEqual(unusedHitExceptionIds, []);
  assert.equal(SUWON_TRACE_REVIEW_SUMMARY.officialImageTraced, 176);
  assert.equal(SUWON_TRACE_REVIEW_SUMMARY.draftApproximate, 0);
});

test('수원 좌석도 release lock 문서는 최종 검수 계약을 고정한다', () => {
  const packageSource = fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8');
  const releaseGateSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/suwon-seatmap-release-gate.mjs'), 'utf8');
  const visualReviewSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/suwon-seatmap-visual-review.mjs'), 'utf8');
  const precisionWorksetSource = fs.readFileSync(path.resolve(process.cwd(), 'scripts/suwon-seatmap-precision-workset.mjs'), 'utf8');
  const releaseLockSource = fs.readFileSync(path.resolve(process.cwd(), 'docs/suwon-seatmap-release-lock.md'), 'utf8');

  [
    'suwon-kt-seatmap-official-2026@2x.jpg',
    '공식 이미지 좌표계: `4290x9679`',
    'cropY=1000',
    'cropHeight=4550',
    '`SUWON_BLOCKS.length === 176`',
    '`totalBlocks=176`',
    '`numericBlocks=126`',
    '`skyboxBlocks=35`',
    '`skyzoneBlocks=32`',
    '`specialSelectableAreas=15`',
    '`officialImageTraced=176`',
    '`draftApproximate=0`',
    '`pendingBlockIds=[]`',
    '`browserQaProbes=176`',
    '`alignmentProbes=556`',
    '`hitTestProbes=732`',
    '`visualHitMismatchBlocks=35`',
    '`approvedVisualHitSplitBlocks=35`',
    '`unresolvedVisualHitMismatchBlocks=0`',
    '`hitGeometryExceptions=35`',
    '`unusedHitGeometryExceptionNotes=0`',
    '`releaseFixtureFingerprint=4b6c7bd784bb18cad7fcdbc5ffb12f78daabf968d691647b69456b3bd74aeeaf`',
    '`officialAssetSha256=a66c73dcf2a228015b51bd3627ed2288340410369bbaeebedb236c5630877627`',
    'reports/stadium/suwon-seatmap-release-gate.json',
    'reports/stadium/suwon-seatmap-release-gate.md',
    'reports/stadium/suwon-seatmap-visual-review.json',
    'reports/stadium/suwon-seatmap-visual-review.md',
    'reports/stadium/suwon-seatmap-precision-workset.json',
    'reports/stadium/suwon-seatmap-precision-workset.md',
    'reports/stadium/suwon-infield-1f-overlay.svg',
    'reports/stadium/suwon-infield-2f-overlay.svg',
    'reports/stadium/suwon-infield-3f-overlay.svg',
    'reports/stadium/suwon-center-accessible-overlay.svg',
    'reports/stadium/suwon-outfield-special-overlay.svg',
    'reports/stadium/suwon-highfive-overlay.svg',
    'reports/stadium/suwon-205-215-overlay.svg',
    'reports/stadium/suwon-skybox-skyzone-overlay.svg',
    '`suwon-lf-grass`는 공식 이미지의 3루 외야 잔디 자유석 connected green component 전체를 단일 선택 구역으로 유지하므로 large visual area를 승인한다.',
    '`suwon-lf-grass` 승인 bounds 기준은 공식 픽셀 검수 `1032,1825-1850,2379`',
    '`reviewedBlocks=176`',
    '`missingReviewBlocks=0`',
    '`duplicateReviewBlocks=0`',
    '`approvedVisualHitSplitBlocks=35`',
    '`unresolvedVisualHitMismatchBlocks=0`',
    '`largeVisualAreaBlocks=0`',
    '`approvedLargeVisualAreaBlocks=1`',
    '`worksetBlocks=176`',
    '`candidateBlocks=109`',
    '`lockedReviewBlocks=67`',
    '`p0Blocks=9`',
    '`p1Blocks=13`',
    '`p2Blocks=11`',
    '`p3Blocks=76`',
    '`missingWorksetBlocks=0`',
    '`duplicateWorksetBlocks=0`',
    '`requiredP0MissingBlocks=0`',
    '`requiredP1MissingBlocks=0`',
    'P0은 외야 특수석/잔디석 9개',
    'P1은 하이파이브존 2개와 `205-215` 11개',
    '기본 화면에서는 image-geometry-overlays polygon 면적을 상시 노출하지 않는다.',
    '`?suwonDebug=1`',
    '스카이박스 SB1-SB35만 visual polygon과 별도 compact hit polygon을 가진다.',
    '승인된 visual/hit split은 `SB1-SB35` compact hit-area만 허용',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.',
    'node --import tsx scripts/suwon-seatmap-visual-review.mjs',
    'npm run stadium:suwon:visual-review',
    'npm run stadium:suwon:precision-workset',
    'npm run qa:stadium:suwon:visual-review',
    'node --import tsx scripts/suwon-seatmap-release-gate.mjs',
    'npm run qa:stadium:suwon:release-lock',
    'node --import tsx --test src/data/suwonSeatData.test.ts',
    'npm run test:stadium:seatmaps',
    'npm run qa:stadium:suwon:mobile',
    'npm run qa:stadium:suwon:full',
    'npm run build',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  assert.ok(packageSource.includes('"qa:stadium:suwon:release-lock": "node --import tsx scripts/suwon-seatmap-release-gate.mjs"'));
  assert.ok(packageSource.includes('"stadium:suwon:visual-review": "node --import tsx scripts/suwon-seatmap-visual-review.mjs"'));
  assert.ok(packageSource.includes('"stadium:suwon:precision-workset": "npm run stadium:suwon:visual-review && node --import tsx scripts/suwon-seatmap-precision-workset.mjs"'));
  assert.ok(packageSource.includes('"qa:stadium:suwon:visual-review": "npm run stadium:suwon:visual-review && npm run qa:stadium:suwon:release-lock"'));
  [
    'EXPECTED_RELEASE_FIXTURE_FINGERPRINT',
    'EXPECTED_OFFICIAL_ASSET_SHA256',
    'visual/hit mismatch ids are skybox only',
    'approved visual/hit split ids are skybox only',
    'unresolved visual/hit mismatch ids are empty',
    'hit exception notes are all used by visual/hit splits',
    'release lock document includes release gate script',
    'release lock document includes visual review script',
    'visual review artifact contract',
    'visual review full coverage contract',
    'visual review split approval contract',
    'visual review large-area approval contract',
    'precision workset artifact contract',
    'precision workset full coverage contract',
    'precision workset priority contract',
    'suwon-seatmap-release-gate.json',
    'suwon-seatmap-release-gate.md',
  ].forEach((requiredText) => {
    assert.ok(releaseGateSource.includes(requiredText), `release gate should include ${requiredText}`);
  });

  [
    'suwon-seatmap-visual-review.json',
    'suwon-seatmap-visual-review.md',
    'APPROVED_LARGE_VISUAL_AREA',
    'APPROVED_LARGE_VISUAL_AREA_NOTES',
    'approvedLargeVisualAreaBlocks',
    'largeVisualAreaBlocks',
    'APPROVED_VISUAL_HIT_SPLIT',
    'UNRESOLVED_VISUAL_HIT_MISMATCH',
    'approvedVisualHitSplitBlocks',
    'unresolvedVisualHitMismatchBlocks',
    'approvedVisualHitSplitRows',
    'unresolvedVisualHitMismatchRows',
    'visualHitSplitApprovalNote',
    'EXPECTED_REVIEWED_BLOCKS',
    'missingReviewRows',
    'missingReviewBlocks',
    'duplicateReviewBlocks',
    'suwon-infield-1f-overlay.svg',
    'suwon-infield-2f-overlay.svg',
    'suwon-infield-3f-overlay.svg',
    'suwon-center-accessible-overlay.svg',
    'suwon-outfield-special-overlay.svg',
    'suwon-highfive-overlay.svg',
    'suwon-205-215-overlay.svg',
    'suwon-skybox-skyzone-overlay.svg',
    'SUWON_BROWSER_QA_PROBES',
    'SUWON_ALIGNMENT_PROBES',
    'visualHitMismatch',
    'suwon-lf-grass',
    'suwon-rf-grass',
    'suwon-1b-highfive',
    'suwon-3b-highfive',
    'infield-1f',
    'infield-2f',
    'infield-3f',
    'center-accessible',
    'section-205-215',
    'skybox-skyzone',
    'Array.from({ length: 33 }',
    'Array.from({ length: 4 }',
    'Array.from({ length: 18 }',
    'Array.from({ length: 28 }',
    'Array.from({ length: 11 }',
    'Array.from({ length: 35 }',
    'Array.from({ length: 32 }',
  ].forEach((requiredText) => {
    assert.ok(visualReviewSource.includes(requiredText), `visual review should include ${requiredText}`);
  });

  [
    'suwon-seatmap-precision-workset.json',
    'suwon-seatmap-precision-workset.md',
    'EXPECTED_WORKSET_BLOCKS',
    'EXPECTED_REVIEW_GROUPS',
    'REQUIRED_P0_BLOCK_IDS',
    'REQUIRED_P1_BLOCK_IDS',
    'REQUIRED_P2_BLOCK_IDS',
    'WORKSET_PRIORITY_DEFINITIONS',
    'missingWorksetRows',
    'missingWorksetBlocks',
    'duplicateWorksetBlocks',
    'requiredP0MissingBlocks',
    'requiredP1MissingBlocks',
    'candidateBlocks',
    'lockedReviewBlocks',
    'P0',
    'P1',
    'P2',
    'P3',
    'LOCKED',
    'suwon-lf-grass',
    'suwon-rf-grass',
    'suwon-7pub',
    'suwon-k-live',
    'suwon-green',
    'suwon-501-508',
    'suwon-hite-pub',
    'suwon-kids-camp',
    'suwon-wiz-garden',
    'suwon-3b-highfive',
    'suwon-1b-highfive',
    'Array.from({ length: 11 }',
  ].forEach((requiredText) => {
    assert.ok(precisionWorksetSource.includes(requiredText), `precision workset should include ${requiredText}`);
  });
});

test('수원 visual label 좌표는 hover hit target에서 자기 자신으로 해석된다', () => {
  SUWON_BLOCKS.forEach((block) => {
    assert.equal(
      topHitBlockAt([block.imageGeometry.labelX, block.imageGeometry.labelY])?.id,
      block.id,
      `${block.id} visual label hover should resolve to itself`,
    );
  });
});

test('수원 숫자 블록 visual geometry는 절반 이상의 대표 지점에서 직접 선택된다', () => {
  SUWON_BLOCKS
    .filter((block) => /^suwon-\d+$/.test(block.id))
    .forEach((block) => {
      const probes = visualProbePoints(block);
      const directHits = probes.filter((point) => topHitBlockAt(point)?.id === block.id).length;
      const visualArea = polygonArea(pathPoints(block.imageGeometry.d));
      const hitArea = polygonArea(pathPoints(block.hitGeometry.d));
      const hasDocumentedHitException = Boolean(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[block.id]);

      assert.ok(pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)), `${block.id} label should remain inside visual geometry`);
      assert.ok(
        hasDocumentedHitException ? directHits >= 1 : directHits >= Math.ceil(probes.length / 2),
        `${block.id} should be directly selectable across its visual geometry`,
      );
      assert.ok(hitArea / visualArea <= 1.4, `${block.id} hit geometry should stay close to visual geometry`);
    });
});

test('수원 좌석 데이터는 freeze로 불변성을 유지해야 한다', () => {
  assertDeepFrozen(SUWON_BLOCKS, 'SUWON_BLOCKS');
  assertDeepFrozen(SUWON_ALIGNMENT_PROBES, 'SUWON_ALIGNMENT_PROBES');
  assertDeepFrozen(SUWON_BROWSER_QA_PROBES, 'SUWON_BROWSER_QA_PROBES');
  assertDeepFrozen(SUWON_HIT_TEST_PROBES, 'SUWON_HIT_TEST_PROBES');
});

test('수원 hit-area 우선순위는 모든 블록에 실제 선택 가능한 지점을 제공한다', () => {
  SUWON_BLOCKS.forEach((block) => {
    const probes = hitProbePoints(block.hitGeometry.d, [block.hitGeometry.labelX, block.hitGeometry.labelY]);
    const hasSelectablePoint = probes.some((point) => topHitBlockAt(point)?.id === block.id);
    assert.ok(hasSelectablePoint, `${block.id} should have at least one topmost hit point`);
  });
});

test('수원 hit geometry는 겹침 해결이 필요한 블록만 visual geometry와 다르게 둔다', () => {
  const expectedMismatchIds = new Set(Object.keys(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES));
  const mismatchIds = SUWON_BLOCKS
    .filter((block) => block.imageGeometry.d !== block.hitGeometry.d)
    .map((block) => block.id)
    .sort();
  const unexpectedMismatchIds = mismatchIds.filter((id) => !/^suwon-sb\d+$/.test(id));

  assert.deepEqual(mismatchIds, [...expectedMismatchIds].sort());
  assert.deepEqual(unexpectedMismatchIds, [], 'Only skybox blocks should keep compact hit geometry separate from visual geometry');
  mismatchIds.forEach((id) => {
    assert.ok(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[id], `${id} hit geometry exception should explain the overlap reason`);
  });
  expectedMismatchIds.forEach((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} hit geometry exception should reference an existing block`);
    assert.notEqual(block.imageGeometry.d, block.hitGeometry.d, `${id} documented hit exception should have a separate hit polygon`);
  });
});

test('수원 hit geometry 예외 문서는 SB1-SB35 스카이박스만 명시한다', () => {
  const sourcePath = path.resolve(process.cwd(), 'src/data/suwonSeatData.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const expectedSkyboxIds = numberedBlocks(1, 35).map((block) => `suwon-sb${block}`);
  const noteIds = Object.keys(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES);

  assert.ok(source.includes('const SKYBOX_HIT_GEOMETRY_EXCEPTION_NOTES'), 'Suwon skybox hit exception notes should use an explicit map');
  assert.ok(!source.includes('Object.keys(officialSkyboxGeometries).map'), 'Suwon skybox hit exception notes should not be generated from visual geometry keys');
  assert.ok(!source.includes('Object.entries(officialSkyboxGeometries).map'), 'Suwon skybox hit exception notes should not be generated from visual geometry entries');
  assert.deepEqual(noteIds, expectedSkyboxIds);
  noteIds.forEach((id) => {
    assert.match(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[id], /스카이박스/);
    assert.match(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[id], /compact hit-area/);
  });
});

test('수원 중앙 하단/휠체어/지니존은 visual polygon을 그대로 hit polygon으로 사용한다', () => {
  [
    ...numberedBlocks(216, 218).map((blockName) => `suwon-${blockName}`),
    ...numberedBlocks(313, 316).map((blockName) => `suwon-${blockName}`),
    'suwon-genie',
    'suwon-wheel-center',
    'suwon-wheel-1b',
    'suwon-wheel-3b',
  ].forEach((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.equal(block.hitGeometry.d, block.imageGeometry.d, `${id} hit polygon should match the visual polygon`);
    assert.equal(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[block.id], undefined, `${id} should not keep a compact hit exception`);
    assert.equal(topHitBlockAt([block.imageGeometry.labelX, block.imageGeometry.labelY])?.id, block.id, `${id} label should resolve through the visual polygon`);
  });
});

test('수원 숫자 블록 hit geometry 예외는 명시 문서화된 블록만 허용한다', () => {
  const undocumentedNumericMismatchIds = SUWON_BLOCKS
    .filter((block) => /^suwon-\d+$/.test(block.id))
    .filter((block) => block.imageGeometry.d !== block.hitGeometry.d)
    .filter((block) => !SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[block.id])
    .map((block) => block.id)
    .sort();

  assert.deepEqual(undocumentedNumericMismatchIds, []);
});

test('수원 선택 불능 후보 블록은 대표 hit 좌표 계약과 일치한다', () => {
  const expected = new Set(STABLE_HIT_LABEL_BLOCK_IDS);
  const actual = new Set<string>();
  const mismatches: string[] = [];

  STABLE_HIT_LABEL_BLOCK_IDS.forEach((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);

    const topBlockId = topHitBlockAt([block.hitGeometry.labelX, block.hitGeometry.labelY])?.id;
    if (topBlockId) {
      actual.add(topBlockId);
    }
    if (topBlockId !== id) {
      mismatches.push(`${id} => ${topBlockId ?? 'none'}`);
    }
  });

  const { missing, extra } = diffSet(expected, actual);
  assert.equal(
    missing.length,
    0,
    `Suwon fallback hit-label blocks missing from actual hit results: ${missing.join(', ')}`,
  );
  assert.equal(
    extra.length,
    0,
    `Suwon fallback hit-label resolution returned unexpected blocks: ${extra.join(', ')}`,
  );
  assert.equal(
    mismatches.length,
    0,
    `Suwon fallback hit-label contract mismatch details: ${mismatches.join(', ')}`,
  );
});

test('수원 대표 QA probe 좌표는 기대 블록으로 해석된다', () => {
  assert.ok(SUWON_HIT_TEST_PROBES.length >= 20, 'Suwon QA probes should cover at least 20 representative sections');
  const mismatched: string[] = [];

  SUWON_HIT_TEST_PROBES.forEach((probe) => {
    const hit = topHitBlockAt(probe.point)?.id;
    if (hit !== probe.id) {
      mismatched.push(`${probe.id}:${probe.point.join(',')} => ${hit ?? 'none'}`);
    }
  });

  assert.equal(mismatched.length, 0, `Representative QA probes should resolve to their intended ids. mismatched: ${mismatched.join(', ')}`);
});

test('수원 Playwright 대표 좌표는 정적 hit probe 계약과 동기화된다', () => {
  assert.ok(SUWON_BROWSER_QA_PROBES.length >= 25, 'Suwon browser QA should cover representative clickable sections');
  const hitProbeKeys = new Set(SUWON_HIT_TEST_PROBES.map((probe) => `${probe.id}:${probe.point.join(',')}`));

  SUWON_BROWSER_QA_PROBES.forEach((probe) => {
    assert.ok(hitProbeKeys.has(`${probe.id}:${probe.point.join(',')}`), `${probe.id} browser QA point should be part of static hit probes`);
    assert.equal(topHitBlockAt(probe.point)?.id, probe.id, `${probe.note} should resolve to ${probe.id}`);
  });
});

test('수원 Playwright audit 좌표는 데이터 대표 probe와 같은 계약을 사용한다', () => {
  const auditPath = path.resolve(process.cwd(), 'scripts/stadium-ux-audit.mjs');
  const auditSource = fs.readFileSync(auditPath, 'utf8');
  const auditProbeKeys = new Set<string>();
  const auditProbePattern = /\{[^}]*id:\s*'([^']+)'[^}]*point:\s*\[\s*(\d+),\s*(\d+)\s*\]/g;
  let match: RegExpExecArray | null;

  while ((match = auditProbePattern.exec(auditSource)) !== null) {
    if (match[1].startsWith('suwon-')) {
      auditProbeKeys.add(`${match[1]}:${match[2]},${match[3]}`);
    }
  }

  const expectedProbeKeys = new Set(SUWON_BROWSER_QA_PROBES.map((probe) => `${probe.id}:${probe.point.join(',')}`));
  const { missing, extra } = diffSet(expectedProbeKeys, auditProbeKeys);
  const missingByBlock = splitProbeKeysByBlock(new Set(missing));
  const extraByBlock = splitProbeKeysByBlock(new Set(extra));

  assert.equal(missing.length, 0, `Suwon Playwright audit probe keys missing from output: ${missing.join(', ')}`);
  assert.equal(extra.length, 0, `Suwon Playwright audit output contains unexpected probe keys: ${extra.join(', ')}`);
  assert.equal(
    missingByBlock.size,
    0,
    `Suwon Playwright audit probe block diff (missing): ${formatProbeDiffByBlock(missingByBlock)}`,
  );
  assert.equal(
    extraByBlock.size,
    0,
    `Suwon Playwright audit probe block diff (extra): ${formatProbeDiffByBlock(extraByBlock)}`,
  );
});

test('수원 Playwright audit는 overlay 비노출과 active/debug 노출 계약을 검증한다', () => {
  const auditPath = path.resolve(process.cwd(), 'scripts/stadium-ux-audit.mjs');
  const auditSource = fs.readFileSync(auditPath, 'utf8');

  assert.ok(auditSource.includes('assertSuwonDefaultOverlayHidden'), 'Suwon browser QA should assert default visual polygons are hidden');
  assert.ok(auditSource.includes('assertSuwonDebugOverlayVisible'), 'Suwon browser QA should assert debug visual and hit polygons are visible');
  assert.ok(auditSource.includes('assertSuwonActiveOverlayOnly'), 'Suwon browser QA should assert selected blocks are the only active visual polygons');
  assert.ok(auditSource.includes('verifySuwonActiveOverlayContract'), 'Suwon browser QA should select representative active overlay blocks');
  assert.ok(auditSource.includes("'suwon-rf-grass'"), 'Suwon active overlay QA should cover an outfield grass block');
  assert.ok(auditSource.includes("'suwon-sb35'"), 'Suwon active overlay QA should cover a skybox block');
  assert.ok(auditSource.includes("'suwon-432'"), 'Suwon active overlay QA should cover a skyzone block');
  assert.ok(auditSource.includes("'suwon-1b-highfive'"), 'Suwon active overlay QA should cover a highfive block');
});

test('StadiumGuideRuntime 경로 모듈 임포트 후에도 수원 좌표 데이터가 불변이다', async () => {
  const baseline = suwonFixtureSignature();

  await Promise.all([
    import('../components/stadiumSeatMapRegistry.tsx'),
    import('../components/stadiumSeatMap/SeatMapRuntimeShell.tsx'),
  ]);

  assert.equal(suwonFixtureSignature(), baseline, 'Suwon seat fixture should remain unchanged after runtime module imports');
});

test('수원 alignment probe 좌표는 시각 geometry 안에 있다', () => {
  assert.ok(SUWON_ALIGNMENT_PROBES.length >= 20, 'Suwon alignment probes should cover representative visual sections');

  SUWON_ALIGNMENT_PROBES.forEach((probe) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === probe.id);
    assert.ok(block, `${probe.id} should exist`);
    assert.ok(probe.point[0] >= 0 && probe.point[0] <= SUWON_SEATMAP_IMAGE.imageWidth, `${probe.id} probe x should fit image bounds`);
    assert.ok(probe.point[1] >= 0 && probe.point[1] <= SUWON_SEATMAP_IMAGE.imageHeight, `${probe.id} probe y should fit image bounds`);
    assert.ok(pointInPolygon(probe.point, pathPoints(block.imageGeometry.d)), `${probe.note} should be inside ${probe.id} visual geometry`);
  });
});

test('수원 외야 잔디 자유석은 좌우 단일 block definition만 노출한다', () => {
  const grassBlocks = SUWON_BLOCKS.filter((block) => block.category === 'OUTFIELD_GRASS');

  assert.deepEqual(grassBlocks.map((block) => block.id), ['suwon-lf-grass', 'suwon-rf-grass']);
  assert.deepEqual(grassBlocks.map((block) => block.officialBlocks), [
    ['3루 외야 잔디 자유석'],
    ['1루 외야 잔디 자유석'],
  ]);
});

test('수원 외야 잔디 자유석 visual polygon은 상단 특수석과 겹치지 않는다', () => {
  const lfGrass = SUWON_BLOCKS.find((candidate) => candidate.id === 'suwon-lf-grass');
  const rfGrass = SUWON_BLOCKS.find((candidate) => candidate.id === 'suwon-rf-grass');
  const sevenPub = SUWON_BLOCKS.find((candidate) => candidate.id === 'suwon-7pub');
  const green = SUWON_BLOCKS.find((candidate) => candidate.id === 'suwon-green');
  assert.ok(lfGrass, 'suwon-lf-grass should exist');
  assert.ok(rfGrass, 'suwon-rf-grass should exist');
  assert.ok(sevenPub, 'suwon-7pub should exist');
  assert.ok(green, 'suwon-green should exist');

  const lfPolygon = pathPoints(lfGrass.imageGeometry.d);
  const rfPolygon = pathPoints(rfGrass.imageGeometry.d);
  const sevenPubPolygon = pathPoints(sevenPub.imageGeometry.d);
  const greenPolygon = pathPoints(green.imageGeometry.d);

  assert.deepEqual(polygonBounds(lfPolygon), { minX: 1032, maxX: 1850, minY: 1825, maxY: 2379 }, 'left outfield grass should stay within the approved official green component bounds');
  assert.deepEqual(polygonBounds(rfPolygon), { minX: 2187, maxX: 2874, minY: 1867, maxY: 2307 }, 'right outfield grass should stay within the approved official green component bounds');
  assert.deepEqual(polygonBounds(sevenPubPolygon), { minX: 1853, maxX: 2174, minY: 1807, maxY: 2059 }, '7 PUB should stay within the approved official gray component bounds');
  assert.ok(polygonArea(lfPolygon) >= 190000, 'left outfield grass should keep the full official grass body size');
  assert.ok(polygonArea(lfPolygon) <= 205000, 'left outfield grass approved large area should stay inside official connected grass bounds');
  assert.ok(polygonArea(rfPolygon) >= 150000, 'right outfield grass should keep the official grass body size');
  assert.ok(polygonArea(sevenPubPolygon) >= 74000 && polygonArea(sevenPubPolygon) <= 76000, '7 PUB/위즈테라스는 공식 중앙 회색 블록 크기 안에 유지된다');

  ([[1350, 2140], [1200, 2250], [1538, 1900], [1615, 1920], [1700, 2060], [1760, 1900]] as Point[]).forEach((point) => {
    assert.ok(pointInPolygon(point, lfPolygon), `left grass body probe ${point.join(',')} should remain inside grass`);
  });
  ([[2250, 1930], [2645, 1945], [2705, 1960], [2795, 2010], [2585, 2085], [2700, 2180]] as Point[]).forEach((point) => {
    assert.ok(pointInPolygon(point, rfPolygon), `right grass body probe ${point.join(',')} should remain inside grass`);
  });
  ([[1915, 1860], [2030, 1930], [2150, 1845], [2140, 2025]] as Point[]).forEach((point) => {
    assert.ok(pointInPolygon(point, sevenPubPolygon), `7 PUB probe ${point.join(',')} should remain inside 7 PUB`);
    assert.ok(!pointInPolygon(point, lfPolygon), `7 PUB probe ${point.join(',')} should not be swallowed by left grass`);
    assert.ok(!pointInPolygon(point, rfPolygon), `7 PUB probe ${point.join(',')} should not be swallowed by right grass`);
  });
  ([[2940, 2228], [2980, 2235]] as Point[]).forEach((point) => {
    assert.ok(pointInPolygon(point, greenPolygon), `green zone probe ${point.join(',')} should remain inside green zone`);
    assert.ok(!pointInPolygon(point, rfPolygon), `green zone probe ${point.join(',')} should not be swallowed by right grass`);
  });
});

test('수원 외야/특수석 브라우저 대표 좌표는 전체 특수 구역을 포함한다', () => {
  const expectedOutfieldIds = [
    'suwon-lf-grass',
    'suwon-rf-grass',
    'suwon-501-508',
    'suwon-7pub',
    'suwon-green',
    'suwon-k-live',
    'suwon-hite-pub',
    'suwon-kids-camp',
    'suwon-wiz-garden',
  ];
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => expectedOutfieldIds.includes(probe.id))
    .map((probe) => probe.id);

  assert.deepEqual(browserProbeIds, expectedOutfieldIds);
});

test('수원 외야/하이파이브 정밀화 구역은 저정밀 polygon으로 회귀하지 않는다', () => {
  const expectedMinimumPointCounts: Record<string, number> = {
    'suwon-rf-grass': 50,
    'suwon-501-508': 50,
    'suwon-k-live': 50,
    'suwon-1b-highfive': 40,
  };

  Object.entries(expectedMinimumPointCounts).forEach(([id, minPointCount]) => {
    const block = suwonBlock(id);
    const pointCount = pathPoints(block.imageGeometry.d).length;

    assert.ok(pointCount >= minPointCount, `${id} should keep explicit official-image tracing points. Actual: ${pointCount}`);
  });
});

test('수원 외야/특수석 visual polygon은 공식 이미지 색상 픽셀 component와 정렬된다', async () => {
  const image = await readOfficialSuwonSeatmapPixels();

  SUWON_SPECIAL_PIXEL_REVIEW_TARGETS.forEach((target) => {
    const block = suwonBlock(target.id);
    const color = getPixelColor(image, target.seed);
    const review = target.mode === 'connected'
      ? collectConnectedOfficialPixels(image, target, color)
      : collectBoundedOfficialPixels(image, target, color);
    const polygon = pathPoints(block.imageGeometry.d);
    const polygonPixelCount = polygonArea(polygon);
    const insidePixelCount = review.pixels.filter((pixel) => pointInPolygon(pixel, polygon)).length;
    const insideRatio = insidePixelCount / review.pixels.length;
    const pathToPixelAreaRatio = polygonPixelCount / review.pixels.length;
    const overflow = maxBoundsOverflow(target.expectedBounds, polygonBounds(polygon));

    assert.ok(review.pixels.length >= target.minPixelCount, `${target.id} official color pixel sample should remain large enough`);
    assertNearBounds(review.bounds, target.expectedBounds, 2, `${target.id} official color pixel bounds`);
    assert.ok(
      insideRatio >= target.minInsideRatio,
      `${target.id} should contain official color pixels. Actual ratio: ${insideRatio.toFixed(4)}`,
    );
    assert.ok(
      pathToPixelAreaRatio <= target.maxPathToPixelAreaRatio,
      `${target.id} polygon should not overrun official color pixels. Actual ratio: ${pathToPixelAreaRatio.toFixed(4)}`,
    );
    assert.ok(
      overflow <= target.maxBoundsOverflow,
      `${target.id} polygon bounds should stay near official color bounds. Actual overflow: ${overflow}`,
    );
  });
});

test('수원 좌측 외야 특수석 경계는 서로 침범하지 않는다', () => {
  const expectedIds = ['suwon-lf-grass', 'suwon-7pub'];
  const expectedEdgeProbes: VisualProbeExpectation[] = [
    { id: 'suwon-lf-grass', point: [1125, 2250] },
    { id: 'suwon-lf-grass', point: [1460, 2090] },
    { id: 'suwon-lf-grass', point: [1538, 1900] },
    { id: 'suwon-lf-grass', point: [1615, 1920] },
    { id: 'suwon-lf-grass', point: [1760, 1900] },
    { id: 'suwon-lf-grass', point: [1775, 2045] },
    { id: 'suwon-7pub', point: [1915, 1860] },
    { id: 'suwon-7pub', point: [2030, 1930] },
    { id: 'suwon-7pub', point: [2150, 1845] },
    { id: 'suwon-7pub', point: [2140, 2025] },
    { id: 'suwon-7pub', point: [1859, 1900] },
    { id: 'suwon-7pub', point: [1870, 1825] },
    { id: 'suwon-7pub', point: [2160, 2040] },
  ];
  const excludedVisualProbes: VisualProbeExpectation[] = [
    { id: 'suwon-lf-grass', point: [1915, 1860], note: '3루 외야 잔디 자유석은 7 PUB/위즈테라스 좌측 회색 블록을 먹지 않는다' },
    { id: 'suwon-lf-grass', point: [2030, 1930], note: '3루 외야 잔디 자유석은 7 PUB/위즈테라스 중앙 회색 블록을 먹지 않는다' },
    { id: 'suwon-lf-grass', point: [1700, 1800], note: '3루 외야 잔디 자유석은 상단 검은 통로를 먹지 않는다' },
    { id: 'suwon-lf-grass', point: [1855, 1900], note: '3루 외야 잔디 자유석은 7 PUB 좌측 검은 경계 밖으로 확장되지 않는다' },
    { id: 'suwon-lf-grass', point: [1855, 2050], note: '3루 외야 잔디 자유석은 7 PUB 우측 하단 회색 경계를 먹지 않는다' },
    { id: 'suwon-lf-grass', point: [1450, 2400], note: '3루 외야 잔디 자유석은 하단 통로로 분리되어 보이지 않는다' },
    { id: 'suwon-7pub', point: [2030, 1785], note: '7 PUB은 GATE 1-1 하단 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-7pub', point: [2030, 2085], note: '7 PUB은 외야 잔디석 하단 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-7pub', point: [2188, 1930], note: '7 PUB은 1루 외야 잔디 자유석 좌측 경계를 먹지 않는다' },
    { id: 'suwon-7pub', point: [1538, 1900], note: '7 PUB은 3루 외야 잔디 자유석 상단 곡선을 먹지 않는다' },
    { id: 'suwon-7pub', point: [1615, 1920], note: '7 PUB은 3루 외야 잔디 자유석 상단 몸통을 먹지 않는다' },
    { id: 'suwon-7pub', point: [1760, 1900], note: '7 PUB은 3루 외야 잔디 자유석 우측 상단 몸통을 먹지 않는다' },
    { id: 'suwon-7pub', point: [1775, 2045], note: '7 PUB은 3루 외야 잔디 자유석 우측 몸통을 먹지 않는다' },
    { id: 'suwon-7pub', point: [2250, 1930], note: '7 PUB은 1루 외야 잔디 자유석 좌측 몸통을 먹지 않는다' },
    { id: 'suwon-7pub', point: [2585, 2085], note: '7 PUB은 1루 외야 잔디 자유석 중앙 몸통을 먹지 않는다' },
  ];

  assertVisualLabelContracts(expectedIds);
  assertVisualEdgeProbes(expectedEdgeProbes);
  assertExcludedVisualProbes(excludedVisualProbes);
});

test('수원 우측 상단 외야 특수석 경계는 서로 침범하지 않는다', () => {
  const expectedIds = ['suwon-rf-grass', 'suwon-501-508', 'suwon-green', 'suwon-k-live'];
  const expectedEdgeProbes: VisualProbeExpectation[] = [
    { id: 'suwon-rf-grass', point: [2250, 1930] },
    { id: 'suwon-rf-grass', point: [2645, 1945] },
    { id: 'suwon-rf-grass', point: [2705, 1960] },
    { id: 'suwon-rf-grass', point: [2795, 2010] },
    { id: 'suwon-rf-grass', point: [2585, 2085] },
    { id: 'suwon-rf-grass', point: [2850, 2065] },
    { id: 'suwon-rf-grass', point: [2820, 2075] },
    { id: 'suwon-rf-grass', point: [2700, 2180] },
    { id: 'suwon-501-508', point: [2875, 1525] },
    { id: 'suwon-501-508', point: [2825, 1600] },
    { id: 'suwon-501-508', point: [2880, 1630] },
    { id: 'suwon-501-508', point: [3030, 1725] },
    { id: 'suwon-501-508', point: [3150, 1800] },
    { id: 'suwon-501-508', point: [3275, 1905] },
    { id: 'suwon-501-508', point: [3190, 1970] },
    { id: 'suwon-501-508', point: [3385, 1890] },
    { id: 'suwon-501-508', point: [3250, 2035] },
    { id: 'suwon-501-508', point: [2910, 1540] },
    { id: 'suwon-green', point: [2875, 2160] },
    { id: 'suwon-green', point: [2940, 2228] },
    { id: 'suwon-green', point: [3000, 2265] },
    { id: 'suwon-green', point: [3060, 2225] },
    { id: 'suwon-green', point: [3040, 2215] },
    { id: 'suwon-green', point: [2960, 2340] },
    { id: 'suwon-green', point: [2860, 2310] },
    { id: 'suwon-green', point: [3000, 2305] },
    { id: 'suwon-green', point: [2888, 2355] },
    { id: 'suwon-k-live', point: [2720, 1835] },
    { id: 'suwon-k-live', point: [2725, 1785] },
    { id: 'suwon-k-live', point: [2685, 1840] },
    { id: 'suwon-k-live', point: [2750, 1840] },
    { id: 'suwon-k-live', point: [2850, 1900] },
    { id: 'suwon-k-live', point: [2960, 1900] },
    { id: 'suwon-k-live', point: [2920, 1950] },
    { id: 'suwon-k-live', point: [2980, 1910] },
    { id: 'suwon-k-live', point: [2930, 1970] },
  ];
  const excludedVisualProbes: VisualProbeExpectation[] = [
    { id: 'suwon-501-508', point: [2827, 1871], note: '외야테이블석은 K-라이브존 대표 영역을 먹지 않는다' },
    { id: 'suwon-501-508', point: [2720, 1835], note: '외야테이블석은 K-라이브존 좌측 몸통을 먹지 않는다' },
    { id: 'suwon-501-508', point: [3000, 1460], note: '외야테이블석은 5F 상단 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-501-508', point: [3460, 1900], note: '외야테이블석은 우측 푸드카트 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-501-508', point: [3000, 1990], note: '외야테이블석은 K-라이브존 하단 통로를 먹지 않는다' },
    { id: 'suwon-k-live', point: [2825, 1600], note: 'K-라이브존은 외야테이블석 501 좌측 상단을 먹지 않는다' },
    { id: 'suwon-k-live', point: [3030, 1725], note: 'K-라이브존은 외야테이블석 502 내부를 먹지 않는다' },
    { id: 'suwon-k-live', point: [3190, 1970], note: 'K-라이브존은 외야테이블석 505 하단을 먹지 않는다' },
    { id: 'suwon-k-live', point: [3000, 1905], note: 'K-라이브존은 우측 3F 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-k-live', point: [2940, 2010], note: 'K-라이브존은 하단 3F 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-rf-grass', point: [2827, 1871], note: '1루 외야 잔디 자유석은 K-라이브존 대표 영역을 먹지 않는다' },
    { id: 'suwon-rf-grass', point: [2720, 1835], note: '1루 외야 잔디 자유석은 K-라이브존 좌측 몸통을 먹지 않는다' },
    { id: 'suwon-rf-grass', point: [3091, 1770], note: '1루 외야 잔디 자유석은 외야테이블석 대표 영역을 먹지 않는다' },
    { id: 'suwon-rf-grass', point: [3030, 1725], note: '1루 외야 잔디 자유석은 외야테이블석 502 내부를 먹지 않는다' },
    { id: 'suwon-501-508', point: [2645, 1945], note: '외야테이블석은 1루 외야 잔디 자유석 상단 곡선을 먹지 않는다' },
    { id: 'suwon-k-live', point: [2795, 2010], note: 'K-라이브존은 1루 외야 잔디 자유석 우측 상단 몸통을 먹지 않는다' },
    { id: 'suwon-rf-grass', point: [2940, 2228], note: '1루 외야 잔디 자유석은 그린존 중앙을 먹지 않는다' },
    { id: 'suwon-rf-grass', point: [3060, 2225], note: '1루 외야 잔디 자유석은 그린존 우측 상단 곡선을 먹지 않는다' },
    { id: 'suwon-green', point: [2850, 2065], note: '그린존은 1루 외야 잔디 자유석 공유 경계 안쪽을 먹지 않는다' },
    { id: 'suwon-green', point: [2700, 2180], note: '그린존은 1루 외야 잔디 자유석 우측 곡선을 먹지 않는다' },
    { id: 'suwon-green', point: [2644, 2083], note: '그린존은 1루 외야 잔디 자유석 중앙을 먹지 않는다' },
    { id: 'suwon-green', point: [3095, 2255], note: '그린존은 우측 통로 방향으로 과확장되지 않는다' },
    { id: 'suwon-green', point: [2960, 2405], note: '그린존은 하단 통로 방향으로 과확장되지 않는다' },
    { id: 'suwon-k-live', point: [2605, 1780], note: 'K-라이브존은 좌측 3F 통로 영역까지 확장되지 않는다' },
    { id: 'suwon-k-live', point: [2620, 1830], note: 'K-라이브존은 좌측 검은 통로까지 확장되지 않는다' },
  ];

  assertVisualLabelContracts(expectedIds);
  assertVisualEdgeProbes(expectedEdgeProbes);
  assertExcludedVisualProbes(excludedVisualProbes);
  assert.deepEqual(polygonBounds(pathPoints(suwonBlock('suwon-rf-grass').imageGeometry.d)), { minX: 2187, maxX: 2874, minY: 1867, maxY: 2307 }, '1루 외야 잔디 자유석은 공식 녹색 component bounds 안에 유지된다');
  assert.deepEqual(polygonBounds(pathPoints(suwonBlock('suwon-501-508').imageGeometry.d)), { minX: 2756, maxX: 3428, minY: 1501, maxY: 2055 }, '외야테이블석은 공식 분홍 component bounds 안에 유지된다');
  assert.deepEqual(polygonBounds(pathPoints(suwonBlock('suwon-k-live').imageGeometry.d)), { minX: 2668, maxX: 2989, minY: 1757, maxY: 1990 }, 'K-라이브존은 공식 갈색 component bounds 안에 유지된다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-501-508')!.imageGeometry.d)) < 170000, '외야테이블석은 공식 분홍 영역보다 크게 확장되지 않는다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-k-live')!.imageGeometry.d)) < 38000, 'K-라이브존은 공식 갈색 블록보다 크게 확장되지 않는다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-green')!.imageGeometry.d)) < 70000, '그린존은 1루 외야 잔디석 경계를 과도하게 먹지 않는다');
});

test('수원 우측 하단 특수석 경계는 서로 침범하지 않는다', () => {
  const expectedIds = ['suwon-hite-pub', 'suwon-kids-camp', 'suwon-wiz-garden'];
  const expectedEdgeProbes: VisualProbeExpectation[] = [
    { id: 'suwon-hite-pub', point: [3260, 2240] },
    { id: 'suwon-hite-pub', point: [3330, 2290] },
    { id: 'suwon-hite-pub', point: [3350, 2390] },
    { id: 'suwon-hite-pub', point: [3385, 2400] },
    { id: 'suwon-hite-pub', point: [3375, 2425] },
    { id: 'suwon-hite-pub', point: [3390, 2450] },
    { id: 'suwon-kids-camp', point: [3370, 2180] },
    { id: 'suwon-kids-camp', point: [3510, 2220] },
    { id: 'suwon-kids-camp', point: [3480, 2300] },
    { id: 'suwon-kids-camp', point: [3550, 2360] },
    { id: 'suwon-kids-camp', point: [3525, 2410] },
    { id: 'suwon-kids-camp', point: [3565, 2470] },
    { id: 'suwon-kids-camp', point: [3588, 2480] },
    { id: 'suwon-kids-camp', point: [3454, 2452] },
    { id: 'suwon-wiz-garden', point: [3643, 2350] },
    { id: 'suwon-wiz-garden', point: [3700, 2450] },
    { id: 'suwon-wiz-garden', point: [3735, 2650] },
    { id: 'suwon-wiz-garden', point: [3660, 2800] },
    { id: 'suwon-wiz-garden', point: [3600, 3150] },
    { id: 'suwon-wiz-garden', point: [3580, 3230] },
    { id: 'suwon-wiz-garden', point: [3556, 3310] },
    { id: 'suwon-wiz-garden', point: [3510, 3230] },
  ];
  const excludedVisualProbes: VisualProbeExpectation[] = [
    { id: 'suwon-hite-pub', point: [3480, 2300], note: '하이트펍존은 키즈랜드 캠핑존 중앙을 먹지 않는다' },
    { id: 'suwon-hite-pub', point: [3310, 2345], note: '하이트펍존은 좌측 하단 검은 통로를 먹지 않는다' },
    { id: 'suwon-hite-pub', point: [3350, 2440], note: '하이트펍존은 하단 4F 통로를 먹지 않는다' },
    { id: 'suwon-hite-pub', point: [3420, 2376], note: '하이트펍존은 우측 4F 회색 통로를 먹지 않는다' },
    { id: 'suwon-hite-pub', point: [3390, 2485], note: '하이트펍존은 공식 갈색 영역 아래 검은 통로를 먹지 않는다' },
    { id: 'suwon-hite-pub', point: [3315, 2600], note: '하이트펍존은 공식 갈색 영역 아래 통로를 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3330, 2290], note: '키즈랜드 캠핑존은 하이트펍존 중앙을 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3385, 2320], note: '키즈랜드 캠핑존은 좌측 4F 통로를 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3700, 2450], note: '키즈랜드 캠핑존은 위즈가든 상단을 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3620, 2380], note: '키즈랜드 캠핑존은 우측 위즈가든 사이 통로를 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3460, 2520], note: '키즈랜드 캠핑존은 하단 4F 통로를 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3428, 2400], note: '키즈랜드 캠핑존은 좌측 하단 검은 통로를 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3365, 2220], note: '키즈랜드 캠핑존은 좌측 회색 통로를 먹지 않는다' },
    { id: 'suwon-kids-camp', point: [3605, 2488], note: '키즈랜드 캠핑존은 우측 위즈가든/통로 경계를 먹지 않는다' },
    { id: 'suwon-wiz-garden', point: [3480, 2300], note: '위즈가든은 키즈랜드 캠핑존 중앙을 먹지 않는다' },
    { id: 'suwon-wiz-garden', point: [3620, 2380], note: '위즈가든은 키즈랜드 캠핑존 사이 통로를 먹지 않는다' },
    { id: 'suwon-wiz-garden', point: [3765, 2600], note: '위즈가든은 우측 1F 도로 영역까지 확장되지 않는다' },
    { id: 'suwon-wiz-garden', point: [3640, 3190], note: '위즈가든은 우측 하단 검은 통로를 먹지 않는다' },
    { id: 'suwon-wiz-garden', point: [3730, 3315], note: '위즈가든은 우측 하단 도로 끝까지 확장되지 않는다' },
    { id: 'suwon-wiz-garden', point: [3510, 3800], note: '위즈가든은 GATE 1루 매표소 안내 영역을 먹지 않는다' },
    { id: 'suwon-wiz-garden', point: [3500, 4245], note: '위즈가든은 하단 통로까지 확장되지 않는다' },
    { id: 'suwon-wiz-garden', point: [3625, 2440], note: '위즈가든은 상단 좌측 회색 통로를 먹지 않는다' },
    { id: 'suwon-wiz-garden', point: [3425, 3246], note: '위즈가든은 하단 좌측 검은 통로를 먹지 않는다' },
  ];

  assertVisualLabelContracts(expectedIds);
  assertVisualEdgeProbes(expectedEdgeProbes);
  assertExcludedVisualProbes(excludedVisualProbes);
  assert.deepEqual(polygonBounds(pathPoints(suwonBlock('suwon-hite-pub').imageGeometry.d)), { minX: 3197, maxX: 3417, minY: 2145, maxY: 2455 }, '하이트펍존은 공식 갈색 component bounds 안에 유지된다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-hite-pub')!.imageGeometry.d)) < 31000, '하이트펍존은 공식 갈색 영역보다 크게 확장되지 않는다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-kids-camp')!.imageGeometry.d)) < 60000, '키즈랜드 캠핑존은 좌측 통로까지 확장되지 않는다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-wiz-garden')!.imageGeometry.d)) < 145000, '위즈가든은 우측 하단 통로까지 확장되지 않는다');
});

test('수원 공식 좌석도 주요 블록과 특수 구역을 포함한다', () => {
  const officialBlocks = new Set(SUWON_BLOCKS.flatMap((block) => block.officialBlocks));
  const requiredOfficialBlocks = [
    ...numberedBlocks(101, 133),
    ...numberedBlocks(201, 233),
    ...numberedBlocks(301, 328),
    ...numberedBlocks(401, 432),
    ...numberedBlocks(501, 508),
    ...numberedBlocks(1, 35).map((block) => `스카이박스 ${block.padStart(2, '0')}`),
    '지니존',
    'BC카드존',
    '7 PUB',
    '그린존',
    'K-라이브존',
    '키즈랜드 캠핑존',
    '위즈가든',
    '중앙 휠체어석',
    '1루 휠체어석',
    '3루 휠체어석',
  ];

  assert.ok(SUWON_BLOCKS.length >= 150, 'Suwon official seat map should expose block-level hit areas');
  requiredOfficialBlocks.forEach((officialBlock) => {
    assert.ok(officialBlocks.has(officialBlock), `${officialBlock} should exist`);
  });

  assert.ok(SUWON_BLOCKS.some((block) => block.category === 'HOME_CHEERING'), 'home cheering section should exist');
  assert.ok(SUWON_BLOCKS.some((block) => block.category === 'AWAY_CHEERING'), 'away cheering section should exist');
  assert.ok(SUWON_BLOCKS.some((block) => block.category === 'GENIE'), 'premium section should exist');
  assert.ok(SUWON_BLOCKS.some((block) => block.category === 'OUTFIELD_TABLE'), 'outfield table section should exist');
  assert.ok(SUWON_BLOCKS.some((block) => block.category === 'ACCESSIBLE'), 'accessible seating should exist');
});

test('수원 공식 이미지에 없는 구 블록 범위는 노출하지 않는다', () => {
  const unavailableOfficialBlocks = [
    ...numberedBlocks(134, 136),
    ...numberedBlocks(234, 236),
    ...numberedBlocks(329, 332),
  ];
  const exposedBlocks = new Set(SUWON_BLOCKS.map((block) => block.block));
  const exposedOfficialBlocks = new Set(SUWON_BLOCKS.flatMap((block) => block.officialBlocks));

  unavailableOfficialBlocks.forEach((block) => {
    assert.ok(!exposedBlocks.has(block), `${block} should not be exposed as a selectable Suwon block`);
    assert.ok(!exposedOfficialBlocks.has(block), `${block} should not be exposed as an official Suwon block`);
  });
});

test('수원 대표 블록 label 좌표는 공식 이미지의 기대 구역 안에 있다', () => {
  const expectedBounds: Record<string, { x: [number, number]; y: [number, number] }> = {
    '109': { x: [2600, 2685], y: [3180, 3270] },
    '129': { x: [1210, 1300], y: [2840, 2930] },
    '114': { x: [2325, 2415], y: [3595, 3685] },
    '123': { x: [1510, 1600], y: [3325, 3405] },
    '201': { x: [3140, 3240], y: [2535, 2635] },
    '229': { x: [1060, 1160], y: [2880, 2980] },
    '301': { x: [3140, 3240], y: [2900, 3000] },
    '328': { x: [930, 990], y: [2895, 2965] },
    '401': { x: [3315, 3400], y: [3515, 3595] },
    '432': { x: [500, 585], y: [3090, 3170] },
    GENIE: { x: [1995, 2115], y: [3780, 3865] },
    'WHEEL-CENTER': { x: [2260, 2390], y: [4110, 4290] },
    '501-508': { x: [3060, 3185], y: [1770, 1900] },
  };

  Object.entries(expectedBounds).forEach(([blockName, bounds]) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.ok(block.imageGeometry.labelX >= bounds.x[0] && block.imageGeometry.labelX <= bounds.x[1], `${blockName} label x should stay near official image block`);
    assert.ok(block.imageGeometry.labelY >= bounds.y[0] && block.imageGeometry.labelY <= bounds.y[1], `${blockName} label y should stay near official image block`);
  });
});

test('수원 101-133 1층 연속 구역은 전체 브라우저 QA 좌표와 경계 probe를 가진다', () => {
  const expectedFirstFloorIds = numberedBlocks(101, 133).map((block) => `suwon-${block}`);
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => /^suwon-1\d\d$/.test(probe.id))
    .map((probe) => probe.id);
  const expectedAnchors: Record<string, Point> = {
    '101': [3045, 2510],
    '102': [2997, 2596],
    '103': [2949, 2682],
    '104': [2901, 2769],
    '105': [2853, 2855],
    '106': [2806, 2941],
    '107': [2757, 3028],
    '108': [2709, 3115],
    '109': [2661, 3201],
    '110': [2613, 3276],
    '111': [2546, 3367],
    '112': [2504, 3454],
    '113': [2456, 3541],
    '114': [2407, 3628],
    '115': [2365, 3709],
    '116': [2230, 3700],
    '117': [2058, 3766],
    '118': [1885, 3700],
    '119': [1750, 3706],
    '120': [1708, 3627],
    '121': [1660, 3540],
    '122': [1612, 3453],
    '123': [1564, 3365],
    '124': [1516, 3279],
    '125': [1467, 3192],
    '126': [1422, 3105],
    '127': [1359, 3023],
    '128': [1309, 2941],
    '129': [1261, 2854],
    '130': [1213, 2768],
    '131': [1166, 2682],
    '132': [1118, 2596],
    '133': [1070, 2510],
  };
  const expectedEdgeProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-109', point: [2648, 3220] },
    { id: 'suwon-110', point: [2615, 3298] },
    { id: 'suwon-115', point: [2355, 3715] },
    { id: 'suwon-116', point: [2292, 3668] },
    { id: 'suwon-118', point: [1920, 3735] },
    { id: 'suwon-119', point: [1755, 3718] },
    { id: 'suwon-123', point: [1540, 3370] },
    { id: 'suwon-124', point: [1500, 3295] },
    { id: 'suwon-125', point: [1455, 3210] },
    { id: 'suwon-126', point: [1410, 3118] },
    { id: 'suwon-127', point: [1350, 3045] },
    { id: 'suwon-128', point: [1285, 2955] },
    { id: 'suwon-129', point: [1235, 2870] },
    { id: 'suwon-130', point: [1200, 2785] },
    { id: 'suwon-131', point: [1150, 2700] },
  ];

  assert.deepEqual(browserProbeIds, expectedFirstFloorIds);

  Object.entries(expectedAnchors).forEach(([blockName, [expectedX, expectedY]]) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.ok(pathPoints(block.imageGeometry.d).length >= 6, `${blockName} visual polygon should be explicitly traced with at least 6 points`);
    assert.ok(Math.abs(block.imageGeometry.labelX - expectedX) <= 2, `${blockName} label x should follow official digit center`);
    assert.ok(Math.abs(block.imageGeometry.labelY - expectedY) <= 2, `${blockName} label y should follow official digit center`);
    assert.ok(
      pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)),
      `${blockName} label should stay inside its refined visual polygon`,
    );
    assert.equal(topHitBlockAt([block.imageGeometry.labelX, block.imageGeometry.labelY])?.id, block.id, `${blockName} label should resolve to its block`);
  });

  expectedEdgeProbes.forEach(({ id, point }) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
  });
});

test('수원 201-215 2층 1루 연속 구역은 전체 브라우저 QA 좌표와 경계 probe를 가진다', () => {
  const expectedSecondFloorIds = numberedBlocks(201, 215).map((block) => `suwon-${block}`);
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => /^suwon-2(?:0[1-9]|1[0-5])$/.test(probe.id))
    .map((probe) => probe.id);
  const expectedAnchors: Record<string, Point> = {
    '201': [3210, 2618],
    '202': [3173, 2710],
    '203': [3133, 2802],
    '204': [3031, 2851],
    '205': [2987, 2938],
    '206': [2922, 3015],
    '207': [2872, 3104],
    '208': [2832, 3187],
    '209': [2777, 3279],
    '210': [2738, 3368],
    '211': [2691, 3460],
    '212': [2641, 3548],
    '213': [2597, 3637],
    '214': [2544, 3721],
    '215': [2492, 3813],
  };
  const expectedP1Bounds: Record<string, PixelBounds> = {
    '205': { minX: 2924, maxX: 3049, minY: 2873, maxY: 3003 },
    '206': { minX: 2866, maxX: 2994, minY: 2958, maxY: 3085 },
    '207': { minX: 2818, maxX: 2937, minY: 3044, maxY: 3172 },
    '208': { minX: 2750, maxX: 2914, minY: 3109, maxY: 3266 },
    '209': { minX: 2695, maxX: 2859, minY: 3201, maxY: 3358 },
    '210': { minX: 2680, maxX: 2804, minY: 3305, maxY: 3443 },
    '211': { minX: 2624, maxX: 2757, minY: 3397, maxY: 3529 },
    '212': { minX: 2575, maxX: 2708, minY: 3481, maxY: 3617 },
    '213': { minX: 2535, maxX: 2660, minY: 3568, maxY: 3705 },
    '214': { minX: 2477, maxX: 2611, minY: 3656, maxY: 3792 },
    '215': { minX: 2427, maxX: 2560, minY: 3743, maxY: 3891 },
  };
  const expectedP1AreaRanges: Record<string, [number, number]> = {
    '205': [8700, 9000],
    '206': [8400, 8700],
    '207': [7900, 8200],
    '208': [13400, 13800],
    '209': [13400, 13800],
    '210': [10300, 10650],
    '211': [8750, 9050],
    '212': [9000, 9300],
    '213': [8150, 8450],
    '214': [9100, 9400],
    '215': [9700, 10050],
  };
  const expectedEdgeProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-201', point: [3276, 2623] },
    { id: 'suwon-201', point: [3143, 2604] },
    { id: 'suwon-202', point: [3110, 2678] },
    { id: 'suwon-202', point: [3238, 2768] },
    { id: 'suwon-203', point: [3060, 2765] },
    { id: 'suwon-203', point: [3210, 2868] },
    { id: 'suwon-204', point: [3020, 2888] },
    { id: 'suwon-205', point: [2969, 2918] },
    { id: 'suwon-205', point: [3020, 2950] },
    { id: 'suwon-206', point: [2890, 3020] },
    { id: 'suwon-206', point: [2965, 3020] },
    { id: 'suwon-207', point: [2825, 3120] },
    { id: 'suwon-207', point: [2895, 3125] },
    { id: 'suwon-208', point: [2810, 3190] },
    { id: 'suwon-208', point: [2860, 3220] },
    { id: 'suwon-209', point: [2760, 3275] },
    { id: 'suwon-209', point: [2820, 3310] },
    { id: 'suwon-210', point: [2700, 3340] },
    { id: 'suwon-210', point: [2760, 3400] },
    { id: 'suwon-211', point: [2645, 3465] },
    { id: 'suwon-211', point: [2720, 3480] },
    { id: 'suwon-212', point: [2605, 3550] },
    { id: 'suwon-212', point: [2675, 3560] },
    { id: 'suwon-213', point: [2555, 3640] },
    { id: 'suwon-213', point: [2625, 3660] },
    { id: 'suwon-214', point: [2505, 3730] },
    { id: 'suwon-214', point: [2580, 3740] },
    { id: 'suwon-215', point: [2460, 3820] },
    { id: 'suwon-215', point: [2520, 3840] },
    { id: 'suwon-215', point: [2470, 3845] },
    { id: 'suwon-216', point: [2388, 3860] },
  ];

  assert.deepEqual(browserProbeIds, expectedSecondFloorIds);

  Object.entries(expectedAnchors).forEach(([blockName, [expectedX, expectedY]]) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    const polygon = pathPoints(block.imageGeometry.d);
    assert.ok(polygon.length >= 6, `${blockName} visual polygon should be explicitly traced with at least 6 points`);
    assert.ok(Math.abs(block.imageGeometry.labelX - expectedX) <= 2, `${blockName} label x should follow official digit center`);
    assert.ok(Math.abs(block.imageGeometry.labelY - expectedY) <= 2, `${blockName} label y should follow official digit center`);
    assert.ok(
      pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], polygon),
      `${blockName} label should stay inside its refined visual polygon`,
    );
    assert.equal(topHitBlockAt([block.imageGeometry.labelX, block.imageGeometry.labelY])?.id, block.id, `${blockName} label should resolve to its block`);

    if (expectedP1Bounds[blockName]) {
      assert.deepEqual(polygonBounds(polygon), expectedP1Bounds[blockName], `${blockName} visual polygon should keep official 205-215 diagonal bounds`);
      const [minArea, maxArea] = expectedP1AreaRanges[blockName];
      const area = polygonArea(polygon);
      assert.ok(area >= minArea && area <= maxArea, `${blockName} visual polygon area should stay in official 205-215 band. Actual: ${area}`);
    }
  });

  expectedEdgeProbes.forEach(({ id, point }) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
  });
});

test('수원 219-233 2층 3루 연속 구역은 전체 브라우저 QA 좌표와 경계 probe를 가진다', () => {
  const expectedSecondFloorIds = numberedBlocks(219, 233).map((block) => `suwon-${block}`);
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => {
      const blockNumber = Number(probe.id.replace('suwon-', ''));
      return blockNumber >= 219 && blockNumber <= 233;
    })
    .map((probe) => probe.id);
  const expectedAnchors: Record<string, Point> = {
    '219': [1620, 3817],
    '220': [1569, 3724],
    '221': [1520, 3639],
    '222': [1472, 3549],
    '223': [1424, 3461],
    '224': [1360, 3395],
    '225': [1310, 3300],
    '226': [1260, 3205],
    '227': [1210, 3115],
    '228': [1165, 3020],
    '229': [1110, 2930],
    '230': [1075, 2860],
    '231': [1040, 2780],
    '232': [1005, 2690],
    '233': [930, 2600],
  };
  const expectedEdgeProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-219', point: [1585, 3815] },
    { id: 'suwon-219', point: [1640, 3820] },
    { id: 'suwon-220', point: [1530, 3730] },
    { id: 'suwon-220', point: [1600, 3730] },
    { id: 'suwon-221', point: [1485, 3640] },
    { id: 'suwon-221', point: [1545, 3650] },
    { id: 'suwon-222', point: [1435, 3555] },
    { id: 'suwon-222', point: [1500, 3560] },
    { id: 'suwon-223', point: [1390, 3468] },
    { id: 'suwon-223', point: [1458, 3470] },
    { id: 'suwon-224', point: [1325, 3395] },
    { id: 'suwon-224', point: [1390, 3405] },
    { id: 'suwon-225', point: [1275, 3305] },
    { id: 'suwon-225', point: [1340, 3310] },
    { id: 'suwon-226', point: [1225, 3210] },
    { id: 'suwon-226', point: [1295, 3210] },
    { id: 'suwon-227', point: [1180, 3125] },
    { id: 'suwon-227', point: [1245, 3130] },
    { id: 'suwon-228', point: [1130, 3030] },
    { id: 'suwon-228', point: [1200, 3030] },
    { id: 'suwon-229', point: [1085, 2935] },
    { id: 'suwon-229', point: [1150, 2940] },
    { id: 'suwon-230', point: [1045, 2860] },
    { id: 'suwon-230', point: [1110, 2865] },
    { id: 'suwon-231', point: [1005, 2795] },
    { id: 'suwon-231', point: [1065, 2775] },
    { id: 'suwon-232', point: [960, 2700] },
    { id: 'suwon-232', point: [1020, 2670] },
    { id: 'suwon-233', point: [885, 2605] },
    { id: 'suwon-233', point: [970, 2585] },
  ];

  assert.deepEqual(browserProbeIds, expectedSecondFloorIds);

  Object.entries(expectedAnchors).forEach(([blockName, [expectedX, expectedY]]) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.ok(pathPoints(block.imageGeometry.d).length >= 6, `${blockName} visual polygon should remain explicitly traced`);
    assert.ok(Math.abs(block.imageGeometry.labelX - expectedX) <= 2, `${blockName} label x should follow official digit center`);
    assert.ok(Math.abs(block.imageGeometry.labelY - expectedY) <= 2, `${blockName} label y should follow official digit center`);
    assert.ok(
      pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)),
      `${blockName} label should stay inside its refined visual polygon`,
    );
    assert.equal(topHitBlockAt([block.imageGeometry.labelX, block.imageGeometry.labelY])?.id, block.id, `${blockName} label should resolve to its block`);
  });

  expectedEdgeProbes.forEach(({ id, point }) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
  });
});

test('수원 116-118 BC카드존은 대표 좌표와 경계 probe로 회귀 고정된다', () => {
  const expectedBcIds = ['suwon-116', 'suwon-117', 'suwon-118'];
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => expectedBcIds.includes(probe.id))
    .map((probe) => probe.id);
  const expectedProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-116', point: [2230, 3700] },
    { id: 'suwon-117', point: [2058, 3766] },
    { id: 'suwon-118', point: [1885, 3700] },
    { id: 'suwon-116', point: [2292, 3668] },
    { id: 'suwon-116', point: [2238, 3750] },
    { id: 'suwon-116', point: [2188, 3730] },
    { id: 'suwon-117', point: [2058, 3732] },
    { id: 'suwon-117', point: [1990, 3780] },
    { id: 'suwon-117', point: [2132, 3780] },
    { id: 'suwon-118', point: [1850, 3655] },
    { id: 'suwon-118', point: [1920, 3735] },
    { id: 'suwon-118', point: [1950, 3775] },
  ];

  assert.deepEqual(browserProbeIds, expectedBcIds);

  expectedBcIds.forEach((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.equal(block.hitGeometry.d, block.imageGeometry.d, `${id} should use its refined visual polygon as hit polygon`);
    assert.ok(pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)), `${id} label should stay inside visual polygon`);
  });

  expectedProbes.forEach(({ id, point }) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
  });
});

test('수원 중앙/2층 저정밀 후보는 공식 색상 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-115': { minPoints: 30, minArea: 6000, maxArea: 8000 },
    'suwon-117': { minPoints: 40, minArea: 9500, maxArea: 11500 },
    'suwon-118': { minPoints: 40, minArea: 13000, maxArea: 15500 },
    'suwon-119': { minPoints: 30, minArea: 5800, maxArea: 7600 },
    'suwon-226': { minPoints: 30, minArea: 15000, maxArea: 17500 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const polygon = pathPoints(suwonBlock(id).imageGeometry.d);
    const area = polygonArea(polygon);

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined multi-point polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced color bounds. Actual: ${area}`);
  });
});

test('수원 301-328 3층 연속 구역은 공식 숫자 중심선과 맞는다', () => {
  const expectedThirdFloorIds = numberedBlocks(301, 328).map((block) => `suwon-${block}`);
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => {
      const blockNumber = Number(probe.id.replace('suwon-', ''));
      return blockNumber >= 301 && blockNumber <= 328;
    })
    .map((probe) => probe.id);
  const expectedAnchors: Record<string, Point> = {
    '301': [3157, 2931],
    '302': [3115, 3018],
    '303': [3080, 3118],
    '304': [3031, 3206],
    '305': [2976, 3295],
    '306': [2933, 3382],
    '307': [2880, 3465],
    '308': [2827, 3556],
    '309': [2779, 3644],
    '310': [2730, 3728],
    '311': [2680, 3821],
    '312': [2621, 3919],
    '313': [2454, 4068],
    '314': [2201, 4167],
    '315': [1917, 4164],
    '316': [1655, 4074],
    '317': [1498, 3923],
    '318': [1438, 3821],
    '319': [1388, 3732],
    '320': [1334, 3642],
    '321': [1287, 3554],
    '322': [1239, 3468],
    '323': [1180, 3384],
    '324': [1131, 3297],
    '325': [1083, 3208],
    '326': [1042, 3116],
    '327': [1004, 3023],
    '328': [960, 2930],
  };

  assert.deepEqual(browserProbeIds, expectedThirdFloorIds);

  Object.entries(expectedAnchors).forEach(([blockName, [expectedX, expectedY]]) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.ok(pathPoints(block.imageGeometry.d).length >= 6, `${blockName} visual polygon should remain explicitly traced`);
    assert.ok(Math.abs(block.imageGeometry.labelX - expectedX) <= 2, `${blockName} label x should follow official digit center`);
    assert.ok(Math.abs(block.imageGeometry.labelY - expectedY) <= 2, `${blockName} label y should follow official digit center`);
    assert.ok(
      pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)),
      `${blockName} label should stay inside its refined visual polygon`,
    );
    assert.equal(topHitBlockAt([block.imageGeometry.labelX, block.imageGeometry.labelY])?.id, block.id, `${blockName} label should resolve to its block`);
  });
});

test('수원 301-328 3층 경계 probe는 기대 블록으로 해석된다', () => {
  const expectedProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-301', point: [3168, 2965] },
    { id: 'suwon-302', point: [3128, 3000] },
    { id: 'suwon-303', point: [3066, 3088] },
    { id: 'suwon-304', point: [3028, 3188] },
    { id: 'suwon-306', point: [2920, 3350] },
    { id: 'suwon-307', point: [2860, 3425] },
    { id: 'suwon-308', point: [2805, 3508] },
    { id: 'suwon-310', point: [2728, 3770] },
    { id: 'suwon-313', point: [2488, 3990] },
    { id: 'suwon-314', point: [2265, 4120] },
    { id: 'suwon-315', point: [2015, 4160] },
    { id: 'suwon-316', point: [1720, 4070] },
    { id: 'suwon-317', point: [1535, 3905] },
    { id: 'suwon-318', point: [1420, 3810] },
    { id: 'suwon-319', point: [1365, 3735] },
    { id: 'suwon-320', point: [1315, 3650] },
    { id: 'suwon-321', point: [1265, 3560] },
    { id: 'suwon-322', point: [1215, 3470] },
    { id: 'suwon-323', point: [1160, 3387] },
    { id: 'suwon-324', point: [1115, 3300] },
    { id: 'suwon-325', point: [1068, 3215] },
    { id: 'suwon-326', point: [1025, 3125] },
    { id: 'suwon-327', point: [980, 3030] },
    { id: 'suwon-328', point: [940, 2965] },
  ];

  expectedProbes.forEach(({ id, point }) => {
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
  });
});

test('수원 SB1-SB35 스카이박스는 명시 compact hit polygon과 전체 브라우저 QA 좌표를 가진다', () => {
  const sourcePath = path.resolve(process.cwd(), 'src/data/suwonSeatData.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  const expectedSkyboxIds = numberedBlocks(1, 35).map((block) => `suwon-sb${block}`);
  const skyboxBlocks = expectedSkyboxIds.map((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    return block;
  });
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => /^suwon-sb\d+$/.test(probe.id))
    .map((probe) => probe.id);

  assert.ok(source.includes('const SKYBOX_HIT_GEOMETRIES'), 'Suwon skybox hit geometry should use an explicit compact polygon map');
  assert.ok(!source.includes('SKYBOX_COMPACT_HIT_GEOMETRIES'), 'Suwon skybox hit geometry should not retain generated compact hit geometry');
  assert.ok(!source.includes('Object.entries(officialSkyboxGeometries).map'), 'Suwon skybox hit geometry should not be generated from visual geometry entries');
  assert.ok(!source.includes('rectGeometry('), 'Suwon skybox hit geometry should not use rectangle helpers');
  assert.deepEqual(browserProbeIds, expectedSkyboxIds);

  skyboxBlocks.forEach((block) => {
    assert.ok(block.imageGeometry.d !== block.hitGeometry.d, `${block.id} should keep compact hit geometry separate from visual geometry`);
    assert.ok(pathPoints(block.imageGeometry.d).length >= 6, `${block.id} visual polygon should remain explicitly traced beyond a 4-point rough block`);
    assert.ok(pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)), `${block.id} label should stay inside visual polygon`);
    assert.ok(pointInPolygon([block.hitGeometry.labelX, block.hitGeometry.labelY], pathPoints(block.hitGeometry.d)), `${block.id} hit label should stay inside compact hit polygon`);
    assert.equal(topHitBlockAt([block.hitGeometry.labelX, block.hitGeometry.labelY])?.id, block.id, `${block.id} compact hit label should resolve to itself`);
  });
});

test('수원 401-432 스카이존은 전체 브라우저 QA 좌표와 경계 probe를 가진다', () => {
  const expectedSkyzoneIds = numberedBlocks(401, 432).map((block) => `suwon-${block}`);
  const skyzoneBlocks = expectedSkyzoneIds.map((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    return block;
  });
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => /^suwon-4\d\d$/.test(probe.id))
    .map((probe) => probe.id);
  const expectedEdgeProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-401', point: [3322, 3526] },
    { id: 'suwon-401', point: [3268, 3575] },
    { id: 'suwon-401', point: [3390, 3655] },
    { id: 'suwon-401', point: [3440, 3548] },
    { id: 'suwon-402', point: [3246, 3674] },
    { id: 'suwon-402', point: [3210, 3695] },
    { id: 'suwon-402', point: [3315, 3790] },
    { id: 'suwon-402', point: [3370, 3685] },
    { id: 'suwon-403', point: [3180, 3800] },
    { id: 'suwon-403', point: [3125, 3845] },
    { id: 'suwon-403', point: [3250, 3930] },
    { id: 'suwon-403', point: [3305, 3835] },
    { id: 'suwon-404', point: [3106, 3942] },
    { id: 'suwon-404', point: [3065, 3975] },
    { id: 'suwon-404', point: [3188, 4058] },
    { id: 'suwon-404', point: [3235, 3958] },
    { id: 'suwon-405', point: [3042, 4067] },
    { id: 'suwon-405', point: [3000, 4095] },
    { id: 'suwon-405', point: [3115, 4200] },
    { id: 'suwon-405', point: [3175, 4088] },
    { id: 'suwon-406', point: [2970, 4196] },
    { id: 'suwon-406', point: [2912, 4245] },
    { id: 'suwon-406', point: [3030, 4338] },
    { id: 'suwon-406', point: [3095, 4235] },
    { id: 'suwon-407', point: [2873, 4343] },
    { id: 'suwon-407', point: [2828, 4368] },
    { id: 'suwon-407', point: [2935, 4468] },
    { id: 'suwon-407', point: [3015, 4368] },
    { id: 'suwon-408', point: [2777, 4460] },
    { id: 'suwon-408', point: [2735, 4500] },
    { id: 'suwon-408', point: [2804, 4595] },
    { id: 'suwon-408', point: [2865, 4545] },
    { id: 'suwon-409', point: [2645, 4561] },
    { id: 'suwon-409', point: [2580, 4585] },
    { id: 'suwon-409', point: [2645, 4705] },
    { id: 'suwon-409', point: [2780, 4615] },
    { id: 'suwon-410', point: [2496, 4637] },
    { id: 'suwon-410', point: [2425, 4650] },
    { id: 'suwon-410', point: [2470, 4780] },
    { id: 'suwon-410', point: [2615, 4715] },
    { id: 'suwon-411', point: [2338, 4688] },
    { id: 'suwon-411', point: [2267, 4800] },
    { id: 'suwon-411', point: [2445, 4785] },
    { id: 'suwon-412', point: [2184, 4717] },
    { id: 'suwon-412', point: [2072, 4775] },
    { id: 'suwon-412', point: [2164, 4850] },
    { id: 'suwon-412', point: [2244, 4810] },
    { id: 'suwon-413', point: [1943, 4718] },
    { id: 'suwon-413', point: [1915, 4835] },
    { id: 'suwon-413', point: [2048, 4830] },
    { id: 'suwon-414', point: [1824, 4705] },
    { id: 'suwon-414', point: [1760, 4800] },
    { id: 'suwon-414', point: [1888, 4835] },
    { id: 'suwon-415', point: [1710, 4673] },
    { id: 'suwon-415', point: [1610, 4755] },
    { id: 'suwon-415', point: [1715, 4810] },
    { id: 'suwon-415', point: [1765, 4690] },
    { id: 'suwon-416', point: [1573, 4615] },
    { id: 'suwon-416', point: [1470, 4695] },
    { id: 'suwon-416', point: [1570, 4758] },
    { id: 'suwon-416', point: [1630, 4640] },
    { id: 'suwon-417', point: [1445, 4537] },
    { id: 'suwon-417', point: [1338, 4600] },
    { id: 'suwon-417', point: [1440, 4680] },
    { id: 'suwon-418', point: [1365, 4459] },
    { id: 'suwon-418', point: [1275, 4532] },
    { id: 'suwon-418', point: [1305, 4580] },
    { id: 'suwon-418', point: [1400, 4475] },
    { id: 'suwon-419', point: [1271, 4329] },
    { id: 'suwon-419', point: [1135, 4355] },
    { id: 'suwon-419', point: [1262, 4410] },
    { id: 'suwon-419', point: [1295, 4375] },
    { id: 'suwon-420', point: [1188, 4238] },
    { id: 'suwon-420', point: [1088, 4268] },
    { id: 'suwon-420', point: [1116, 4332] },
    { id: 'suwon-420', point: [1205, 4242] },
    { id: 'suwon-421', point: [1142, 4146] },
    { id: 'suwon-421', point: [1042, 4184] },
    { id: 'suwon-421', point: [1070, 4242] },
    { id: 'suwon-421', point: [1168, 4172] },
    { id: 'suwon-422', point: [1093, 4056] },
    { id: 'suwon-422', point: [992, 4093] },
    { id: 'suwon-422', point: [1020, 4156] },
    { id: 'suwon-422', point: [1120, 4082] },
    { id: 'suwon-423', point: [1041, 3965] },
    { id: 'suwon-423', point: [940, 4000] },
    { id: 'suwon-423', point: [970, 4065] },
    { id: 'suwon-423', point: [1065, 3978] },
    { id: 'suwon-424', point: [994, 3873] },
    { id: 'suwon-424', point: [892, 3910] },
    { id: 'suwon-424', point: [922, 3975] },
    { id: 'suwon-424', point: [1020, 3894] },
    { id: 'suwon-425', point: [943, 3782] },
    { id: 'suwon-425', point: [840, 3816] },
    { id: 'suwon-425', point: [870, 3880] },
    { id: 'suwon-425', point: [975, 3805] },
    { id: 'suwon-426', point: [894, 3686] },
    { id: 'suwon-426', point: [790, 3720] },
    { id: 'suwon-426', point: [822, 3790] },
    { id: 'suwon-426', point: [922, 3708] },
    { id: 'suwon-427', point: [843, 3592] },
    { id: 'suwon-427', point: [738, 3626] },
    { id: 'suwon-427', point: [770, 3695] },
    { id: 'suwon-427', point: [876, 3614] },
    { id: 'suwon-428', point: [791, 3499] },
    { id: 'suwon-428', point: [685, 3530] },
    { id: 'suwon-428', point: [718, 3600] },
    { id: 'suwon-428', point: [825, 3520] },
    { id: 'suwon-429', point: [750, 3419] },
    { id: 'suwon-429', point: [630, 3430] },
    { id: 'suwon-429', point: [666, 3505] },
    { id: 'suwon-429', point: [775, 3428] },
    { id: 'suwon-430', point: [707, 3341] },
    { id: 'suwon-430', point: [575, 3330] },
    { id: 'suwon-430', point: [613, 3405] },
    { id: 'suwon-430', point: [720, 3330] },
    { id: 'suwon-431', point: [630, 3245] },
    { id: 'suwon-431', point: [520, 3230] },
    { id: 'suwon-431', point: [560, 3310] },
    { id: 'suwon-431', point: [670, 3230] },
    { id: 'suwon-432', point: [580, 3100] },
    { id: 'suwon-432', point: [472, 3145] },
    { id: 'suwon-432', point: [506, 3210] },
    { id: 'suwon-432', point: [615, 3125] },
  ];

  assert.deepEqual(browserProbeIds, expectedSkyzoneIds);

  skyzoneBlocks.forEach((block) => {
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    assert.ok(pointInPolygon(label, pathPoints(block.imageGeometry.d)), `${block.id} label should stay inside visual polygon`);
    assert.ok(pathPoints(block.imageGeometry.d).length >= 6, `${block.id} visual polygon should stay refined beyond a 4-point skyzone block`);
    assert.equal(topHitBlockAt(label)?.id, block.id, `${block.id} visual label should resolve to itself`);
  });

  expectedEdgeProbes.forEach(({ id, point }) => {
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
  });
});

test('수원 401/403/404/406/407 스카이존은 공식 남색 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-401': { minPoints: 34, minArea: 22000, maxArea: 24000 },
    'suwon-403': { minPoints: 34, minArea: 21000, maxArea: 23000 },
    'suwon-404': { minPoints: 32, minArea: 20000, maxArea: 22000 },
    'suwon-406': { minPoints: 34, minArea: 22500, maxArea: 24500 },
    'suwon-407': { minPoints: 34, minArea: 21500, maxArea: 23500 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const block = suwonBlock(id);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined official-color skyzone polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced blue bounds. Actual: ${area}`);
    assert.equal(block.imageGeometry.d, block.hitGeometry.d, `${id} should not need compact hit geometry after visual retracing`);
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside the refined skyzone polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} label should resolve to itself`);
  });
});

test('수원 402/405/409/410/412 스카이존은 공식 남색 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-402': { minPoints: 34, minArea: 19800, maxArea: 21000 },
    'suwon-405': { minPoints: 36, minArea: 21600, maxArea: 22800 },
    'suwon-409': { minPoints: 35, minArea: 24700, maxArea: 25900 },
    'suwon-410': { minPoints: 34, minArea: 24500, maxArea: 25700 },
    'suwon-412': { minPoints: 30, minArea: 25900, maxArea: 27100 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const block = suwonBlock(id);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined official-color skyzone polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced blue bounds. Actual: ${area}`);
    assert.equal(block.imageGeometry.d, block.hitGeometry.d, `${id} should not need compact hit geometry after visual retracing`);
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside the refined skyzone polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} label should resolve to itself`);
  });
});

test('수원 408/411/413/414/417 스카이존은 공식 남색 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-408': { minPoints: 36, minArea: 22000, maxArea: 24500 },
    'suwon-411': { minPoints: 30, minArea: 23500, maxArea: 25500 },
    'suwon-413': { minPoints: 28, minArea: 19500, maxArea: 21500 },
    'suwon-414': { minPoints: 30, minArea: 19500, maxArea: 21500 },
    'suwon-417': { minPoints: 30, minArea: 19000, maxArea: 21000 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const block = suwonBlock(id);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined official-color skyzone polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced blue bounds. Actual: ${area}`);
    assert.equal(block.imageGeometry.d, block.hitGeometry.d, `${id} should not need compact hit geometry after visual retracing`);
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside the refined skyzone polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} label should resolve to itself`);
  });
});

test('수원 415/416/418/419/420 스카이존은 공식 남색 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-415': { minPoints: 31, minArea: 20400, maxArea: 21600 },
    'suwon-416': { minPoints: 34, minArea: 20300, maxArea: 21500 },
    'suwon-418': { minPoints: 32, minArea: 15800, maxArea: 16900 },
    'suwon-419': { minPoints: 24, minArea: 11500, maxArea: 12500 },
    'suwon-420': { minPoints: 25, minArea: 10100, maxArea: 11100 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const block = suwonBlock(id);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined official-color skyzone polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced blue bounds. Actual: ${area}`);
    assert.equal(block.imageGeometry.d, block.hitGeometry.d, `${id} should not need compact hit geometry after visual retracing`);
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside the refined skyzone polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} label should resolve to itself`);
  });
});

test('수원 421/422/424/426/427 스카이존은 공식 남색 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-421': { minPoints: 24, minArea: 10800, maxArea: 11800 },
    'suwon-422': { minPoints: 26, minArea: 11000, maxArea: 12000 },
    'suwon-424': { minPoints: 26, minArea: 11400, maxArea: 12400 },
    'suwon-426': { minPoints: 28, minArea: 11900, maxArea: 12900 },
    'suwon-427': { minPoints: 28, minArea: 12100, maxArea: 13100 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const block = suwonBlock(id);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined official-color skyzone polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced blue bounds. Actual: ${area}`);
    assert.equal(block.imageGeometry.d, block.hitGeometry.d, `${id} should not need compact hit geometry after visual retracing`);
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside the refined skyzone polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} label should resolve to itself`);
  });
});

test('수원 423/425/428-432 스카이존은 공식 남색 외곽 다점 polygon으로 유지된다', () => {
  const expectedGeometryContracts: Record<string, { minPoints: number; minArea: number; maxArea: number }> = {
    'suwon-423': { minPoints: 25, minArea: 10700, maxArea: 11700 },
    'suwon-425': { minPoints: 22, minArea: 11200, maxArea: 12300 },
    'suwon-428': { minPoints: 25, minArea: 11900, maxArea: 13000 },
    'suwon-429': { minPoints: 28, minArea: 12600, maxArea: 13600 },
    'suwon-430': { minPoints: 27, minArea: 12800, maxArea: 13900 },
    'suwon-431': { minPoints: 28, minArea: 13000, maxArea: 14100 },
    'suwon-432': { minPoints: 27, minArea: 12000, maxArea: 13000 },
  };

  Object.entries(expectedGeometryContracts).forEach(([id, contract]) => {
    const block = suwonBlock(id);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];

    assert.ok(polygon.length >= contract.minPoints, `${id} should remain a refined official-color skyzone polygon`);
    assert.ok(area >= contract.minArea && area <= contract.maxArea, `${id} area should stay near official traced blue bounds. Actual: ${area}`);
    assert.equal(block.imageGeometry.d, block.hitGeometry.d, `${id} should not need compact hit geometry after visual retracing`);
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside the refined skyzone polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} label should resolve to itself`);
  });
});

test('수원 401-432 스카이존은 더 이상 rough 8-10점 polygon을 사용하지 않는다', () => {
  numberedBlocks(401, 432).forEach((blockNumber) => {
    const id = `suwon-${blockNumber}`;
    const pointCount = pathPoints(suwonBlock(id).imageGeometry.d).length;

    assert.ok(pointCount >= 20, `${id} should keep a refined multi-point skyzone polygon. Actual: ${pointCount}`);
  });
});

test('수원 1루/3루 하이파이브존은 공식 이미지의 상단 색상 띠로 제한된다', () => {
  const expectedHighfiveIds = ['suwon-3b-highfive', 'suwon-1b-highfive'];
  const browserProbeIds = SUWON_BROWSER_QA_PROBES
    .filter((probe) => expectedHighfiveIds.includes(probe.id))
    .map((probe) => probe.id);
  const expectedProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-3b-highfive', point: [1400, 2860] },
    { id: 'suwon-3b-highfive', point: [1500, 3040] },
    { id: 'suwon-3b-highfive', point: [1600, 3220] },
    { id: 'suwon-3b-highfive', point: [1600, 3260] },
    { id: 'suwon-1b-highfive', point: [2700, 2860] },
    { id: 'suwon-1b-highfive', point: [2600, 3040] },
    { id: 'suwon-1b-highfive', point: [2520, 3220] },
    { id: 'suwon-1b-highfive', point: [2508, 3260] },
  ];
  const excludedVisualProbes: VisualProbeExpectation[] = [
    { id: 'suwon-3b-highfive', point: [1348, 2870], note: '3루 하이파이브존은 좌측 검은 통로까지 확장되지 않는다' },
    { id: 'suwon-3b-highfive', point: [1644, 3292], note: '3루 하이파이브존은 하단 3루 덕아웃 흰 영역을 먹지 않는다' },
    { id: 'suwon-3b-highfive', point: [1600, 3400], note: '3루 하이파이브존은 하단 숫자 블록/휠체어석 방향으로 길게 확장되지 않는다' },
    { id: 'suwon-3b-highfive', point: [1650, 3700], note: '3루 하이파이브존은 119-123 하단 구역을 먹지 않는다' },
    { id: 'suwon-3b-highfive', point: [1455, 3210], note: '3루 하이파이브존은 125 숫자 블록 안쪽을 먹지 않는다' },
    { id: 'suwon-1b-highfive', point: [2752, 2846], note: '1루 하이파이브존은 상단 우측 검은 통로까지 확장되지 않는다' },
    { id: 'suwon-1b-highfive', point: [2482, 3278], note: '1루 하이파이브존은 하단 1루 덕아웃 흰 영역을 먹지 않는다' },
    { id: 'suwon-1b-highfive', point: [2450, 3400], note: '1루 하이파이브존은 하단 숫자 블록/휠체어석 방향으로 길게 확장되지 않는다' },
    { id: 'suwon-1b-highfive', point: [2400, 3800], note: '1루 하이파이브존은 115/215 하단 구역을 먹지 않는다' },
    { id: 'suwon-1b-highfive', point: [2648, 3220], note: '1루 하이파이브존은 109 숫자 블록 안쪽을 먹지 않는다' },
  ];

  assert.deepEqual(browserProbeIds, expectedHighfiveIds);

  expectedHighfiveIds.forEach((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    const polygon = pathPoints(block.imageGeometry.d);
    const area = polygonArea(polygon);
    const bounds = polygonBounds(polygon);
    const expectedBounds = id === 'suwon-3b-highfive'
      ? { minX: 1368, maxX: 1657, minY: 2815, maxY: 3273 }
      : { minX: 2458, maxX: 2747, minY: 2817, maxY: 3273 };

    assert.deepEqual(bounds, expectedBounds, `${id} should stay inside the official high-five color component bounds`);
    assert.ok(area > 32000, `${id} should keep the official high-five color band selectable`);
    assert.ok(area < 34000, `${id} should not regress to an overextended vertical strip`);
    assert.ok(polygon.length >= 6, `${id} visual polygon should stay explicitly traced beyond a 5-point rough strip`);
    const label: Point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    assert.ok(pointInPolygon(label, polygon), `${id} label should stay inside visual polygon`);
    assert.equal(topHitBlockAt(label)?.id, id, `${id} visual label should resolve to itself`);
  });

  expectedProbes.forEach(({ id, point }) => {
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
  });

  assertExcludedVisualProbes(excludedVisualProbes);
});

test('수원 216-218/지니존/휠체어석 중앙 하단 경계 probe는 기대 블록으로 해석된다', () => {
  const expectedP2Bounds: Record<string, PixelBounds> = {
    'suwon-216': { minX: 2179, maxX: 2491, minY: 3727, maxY: 4028 },
    'suwon-217': { minX: 1879, maxX: 2238, minY: 3838, maxY: 4054 },
    'suwon-218': { minX: 1623, maxX: 1937, minY: 3727, maxY: 4030 },
    'suwon-313': { minX: 2311, maxX: 2581, minY: 3943, maxY: 4180 },
    'suwon-314': { minX: 2061, maxX: 2340, minY: 4071, maxY: 4262 },
    'suwon-315': { minX: 1742, maxX: 2042, minY: 4067, maxY: 4254 },
    'suwon-316': { minX: 1515, maxX: 1795, minY: 3943, maxY: 4197 },
    'suwon-genie': { minX: 1788, maxX: 2228, minY: 3792, maxY: 3858 },
    'suwon-wheel-center': { minX: 2300, maxX: 2379, minY: 4163, maxY: 4267 },
    'suwon-wheel-1b': { minX: 2730, maxX: 2868, minY: 4084, maxY: 4187 },
    'suwon-wheel-3b': { minX: 1764, maxX: 1843, minY: 4163, maxY: 4267 },
  };
  const expectedP2AreaRanges: Record<string, [number, number]> = {
    'suwon-216': [50000, 51050],
    'suwon-217': [55500, 56500],
    'suwon-218': [49000, 50000],
    'suwon-313': [34500, 35550],
    'suwon-314': [38500, 39500],
    'suwon-315': [38500, 39500],
    'suwon-316': [34800, 35600],
    'suwon-genie': [25000, 26000],
    'suwon-wheel-center': [5100, 5400],
    'suwon-wheel-1b': [7300, 7550],
    'suwon-wheel-3b': [4800, 5100],
  };
  const expectedProbes: Array<{ id: string; point: Point }> = [
    { id: 'suwon-216', point: [2325, 3887] },
    { id: 'suwon-217', point: [2058, 3954] },
    { id: 'suwon-218', point: [1790, 3888] },
    { id: 'suwon-genie', point: [2005, 3830] },
    { id: 'suwon-genie', point: [1815, 3820] },
    { id: 'suwon-genie', point: [2184, 3850] },
    { id: 'suwon-genie', point: [2210, 3825] },
    { id: 'suwon-217', point: [2005, 3940] },
    { id: 'suwon-217', point: [2058, 3868] },
    { id: 'suwon-216', point: [2335, 3745] },
    { id: 'suwon-216', point: [2210, 3860] },
    { id: 'suwon-216', point: [2240, 3900] },
    { id: 'suwon-217', point: [2185, 3950] },
    { id: 'suwon-216', point: [2400, 3970] },
    { id: 'suwon-216', point: [2450, 3930] },
    { id: 'suwon-216', point: [2296, 4010] },
    { id: 'suwon-218', point: [1840, 3940] },
    { id: 'suwon-218', point: [1818, 3775] },
    { id: 'suwon-218', point: [1815, 3860] },
    { id: 'suwon-218', point: [1662, 3930] },
    { id: 'suwon-218', point: [1858, 4025] },
    { id: 'suwon-217', point: [1950, 3960] },
    { id: 'suwon-217', point: [2103, 4045] },
    { id: 'suwon-217', point: [2058, 4040] },
    { id: 'suwon-218', point: [1780, 4000] },
    { id: 'suwon-313', point: [2549, 4085] },
    { id: 'suwon-313', point: [2380, 4170] },
    { id: 'suwon-313', point: [2388, 4155] },
    { id: 'suwon-314', point: [2130, 4240] },
    { id: 'suwon-314', point: [2265, 4200] },
    { id: 'suwon-315', point: [1970, 4240] },
    { id: 'suwon-315', point: [1818, 4080] },
    { id: 'suwon-316', point: [1619, 4130] },
    { id: 'suwon-316', point: [1724, 4188] },
    { id: 'suwon-wheel-center', point: [2340, 4180] },
    { id: 'suwon-wheel-center', point: [2325, 4198] },
    { id: 'suwon-wheel-center', point: [2308, 4215] },
    { id: 'suwon-wheel-center', point: [2360, 4225] },
    { id: 'suwon-wheel-center', point: [2320, 4240] },
    { id: 'suwon-wheel-3b', point: [1805, 4180] },
    { id: 'suwon-wheel-3b', point: [1775, 4188] },
    { id: 'suwon-wheel-3b', point: [1820, 4225] },
    { id: 'suwon-wheel-3b', point: [1790, 4240] },
    { id: 'suwon-315', point: [1850, 4150] },
    { id: 'suwon-315', point: [1858, 4180] },
    { id: 'suwon-wheel-1b', point: [2828, 4124] },
    { id: 'suwon-wheel-1b', point: [2795, 4120] },
    { id: 'suwon-wheel-1b', point: [2830, 4140] },
    { id: 'suwon-wheel-1b', point: [2850, 4125] },
  ];
  const excludedVisualProbes: VisualProbeExpectation[] = [
    { id: 'suwon-genie', point: [2005, 3860], note: '지니존은 217 상단 녹색 블록을 먹지 않는다' },
    { id: 'suwon-genie', point: [1815, 3860], note: '지니존은 218 하단 녹색 블록을 먹지 않는다' },
    { id: 'suwon-genie', point: [2184, 3860], note: '지니존은 216 상단 녹색 블록을 먹지 않는다' },
    { id: 'suwon-genie', point: [2210, 3860], note: '지니존은 216 하단 녹색 블록을 먹지 않는다' },
    { id: 'suwon-genie', point: [2058, 3862], note: '지니존은 하단 네이버클럽존 경계 밖으로 확장되지 않는다' },
    { id: 'suwon-216', point: [2240, 4060], note: '216은 하단 KT존 검은 통로를 먹지 않는다' },
    { id: 'suwon-216', point: [2428, 4070], note: '216은 313 방향 하단 통로까지 확장되지 않는다' },
    { id: 'suwon-216', point: [2296, 4040], note: '216은 하단 KT존 검은 띠까지 확장되지 않는다' },
    { id: 'suwon-217', point: [2050, 4110], note: '217은 하단 KT존 검은 통로를 먹지 않는다' },
    { id: 'suwon-217', point: [2240, 4020], note: '217은 216 사이 검은 분리선을 먹지 않는다' },
    { id: 'suwon-218', point: [1760, 4000], note: '218은 하단 좌측 검은 통로를 먹지 않는다' },
    { id: 'suwon-218', point: [1818, 4050], note: '218은 하단 KT존 검은 띠까지 확장되지 않는다' },
    { id: 'suwon-313', point: [2340, 4198], note: '313은 중앙 휠체어석 핀을 먹지 않는다' },
    { id: 'suwon-314', point: [2340, 4215], note: '314는 중앙 휠체어석 핀을 먹지 않는다' },
    { id: 'suwon-314', point: [2360, 4225], note: '314는 중앙 휠체어석 우측 하단 핀을 먹지 않는다' },
    { id: 'suwon-315', point: [1804, 4215], note: '315는 3루 휠체어석 핀을 먹지 않는다' },
    { id: 'suwon-315', point: [1820, 4225], note: '315는 3루 휠체어석 우측 하단 핀을 먹지 않는다' },
    { id: 'suwon-316', point: [1804, 4215], note: '316은 3루 휠체어석 핀을 먹지 않는다' },
    { id: 'suwon-wheel-center', point: [2265, 4200], note: '중앙 휠체어석은 314 경계 안쪽을 먹지 않는다' },
    { id: 'suwon-wheel-center', point: [2388, 4155], note: '중앙 휠체어석은 313 경계 안쪽을 먹지 않는다' },
    { id: 'suwon-wheel-center', point: [2340, 4290], note: '중앙 휠체어석은 하단 시설 아이콘을 먹지 않는다' },
    { id: 'suwon-wheel-3b', point: [1858, 4180], note: '3루 휠체어석은 315 경계 안쪽을 먹지 않는다' },
    { id: 'suwon-wheel-3b', point: [1804, 4290], note: '3루 휠체어석은 하단 시설 아이콘을 먹지 않는다' },
    { id: 'suwon-wheel-1b', point: [2600, 4060], note: '1루 휠체어석은 313 하단 통로 방향을 먹지 않는다' },
    { id: 'suwon-wheel-1b', point: [2680, 4070], note: '1루 휠체어석은 312 하단 통로 방향을 먹지 않는다' },
    { id: 'suwon-wheel-1b', point: [2825, 4200], note: '1루 휠체어석은 하단 통로/시설 영역을 먹지 않는다' },
    { id: 'suwon-wheel-1b', point: [2875, 4140], note: '1루 휠체어석은 우측 블루 블록까지 확장되지 않는다' },
  ];

  expectedProbes.forEach(({ id, point }) => {
    assert.equal(topHitBlockAt(point)?.id, id, `${point.join(',')} should resolve to ${id}`);
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.ok(pointInPolygon(point, pathPoints(block.imageGeometry.d)), `${point.join(',')} should stay inside ${id} visual polygon`);
  });

  assertExcludedVisualProbes(excludedVisualProbes);
  Object.entries(expectedP2Bounds).forEach(([id, expectedBounds]) => {
    const polygon = pathPoints(suwonBlock(id).imageGeometry.d);
    const [minArea, maxArea] = expectedP2AreaRanges[id];
    const area = polygonArea(polygon);

    assert.deepEqual(polygonBounds(polygon), expectedBounds, `${id} visual polygon should stay in the official P2 component bounds`);
    assert.ok(area >= minArea && area <= maxArea, `${id} visual polygon area should stay in official P2 band. Actual: ${area}`);
  });
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-216')!.imageGeometry.d)) < 56000, '216은 하단 검은 통로까지 과대 확장되지 않는다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-217')!.imageGeometry.d)) < 65000, '217은 KT존 검은 띠까지 과대 확장되지 않는다');
  assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === 'suwon-218')!.imageGeometry.d)) < 56000, '218은 하단 검은 통로까지 과대 확장되지 않는다');
  ['suwon-313', 'suwon-314', 'suwon-315', 'suwon-316'].forEach((id) => {
    assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === id)!.imageGeometry.d)) < 40000, `${id}는 공식 핑크 블록 밖으로 과대 확장되지 않는다`);
  });
  ['suwon-wheel-center', 'suwon-wheel-1b', 'suwon-wheel-3b'].forEach((id) => {
    assert.ok(polygonArea(pathPoints(SUWON_BLOCKS.find((block) => block.id === id)!.imageGeometry.d)) < 8000, `${id}는 E/V 핀 크기를 넘지 않는다`);
  });
});

test('수원 지니존 visual polygon은 중앙 하단 띠 영역으로 제한된다', () => {
  const genie = SUWON_BLOCKS.find((candidate) => candidate.id === 'suwon-genie');
  assert.ok(genie, 'suwon-genie should exist');

  const geniePolygon = pathPoints(genie.imageGeometry.d);
  assert.ok(polygonArea(geniePolygon) < 40000, 'suwon-genie should stay as a narrow center band');

  ([[2005, 3830], [1900, 3835], [2184, 3850]] as Point[]).forEach((point) => {
    assert.ok(pointInPolygon(point, geniePolygon), `${point.join(',')} should stay inside genie visual polygon`);
    assert.equal(topHitBlockAt(point)?.id, 'suwon-genie', `${point.join(',')} should resolve to suwon-genie`);
  });

  ([[2005, 3860], [2240, 3900], [2005, 3940], [1840, 3940], [2058, 3954]] as Point[]).forEach((point) => {
    assert.ok(!pointInPolygon(point, geniePolygon), `${point.join(',')} should not be swallowed by genie visual polygon`);
  });
});

test('수원 좌석도 production 데이터는 타원형 근사 생성 경로를 사용하지 않는다', () => {
  const sourcePath = path.resolve(process.cwd(), 'src/data/suwonSeatData.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.ok(!source.includes('SEATMAP_ELLIPSE'), 'Suwon geometry should not use ellipse approximation anchors');
  assert.ok(!source.includes('createArcGroup'), 'Suwon geometry should not use arc group generation');
  assert.ok(!source.includes('SUWON_OFFICIAL_IMAGE_TRANSFORM'), 'Suwon production geometry should not retain 1000px migration transforms');
  assert.ok(!source.includes('SUWON_IMAGE_GEOMETRY_BASE_DRAFTS'), 'Suwon production geometry should not retain 1000px seed geometry');
  assert.ok(!source.includes('SUWON_MIGRATED_IMAGE_GEOMETRY_DRAFTS'), 'Suwon production geometry should not retain migrated fallback geometry');
  assert.ok(!source.includes('linearGeometries'), 'Suwon production geometry should not retain linear approximation helpers');
  assert.ok(!source.includes('pointGeometries'), 'Suwon production geometry should not retain point approximation helpers');
  assert.ok(!source.includes('skyboxGeometry('), 'Suwon skybox visual polygons should not use generated rectangles');
  assert.ok(!source.includes('Array.from({ length: 35 }'), 'Suwon skybox blocks should not be generated from a positional range');
  assert.ok(!source.includes('...SUWON_MIGRATED_IMAGE_GEOMETRY_DRAFTS'), 'Suwon production geometry should not merge migrated 1000px fallback data');
  assert.ok(!source.includes('officialRowCellGeometries'), 'Suwon numeric visual geometry should not use generated row-cell polygons');
  assert.ok(!source.includes('rowCellGeometry'), 'Suwon numeric visual geometry should not retain row-cell helper code');
  assert.ok(source.includes('const officialImageGeometries'), 'Suwon visual geometry should use explicit official-image polygon coordinates');
  const explicitGeometryBlock = source.slice(
    source.indexOf('const officialImageGeometries'),
    source.indexOf('const IMAGE_GEOMETRY'),
  );
  assert.ok(!explicitGeometryBlock.includes('rectGeometry('), 'Suwon visual geometry should not use rectangle helpers');
  assert.ok(source.includes('const officialSkyboxGeometries'), 'Suwon skybox geometry should use explicit official-image coordinates');
  assert.ok(source.includes('...officialSkyboxGeometries'), 'Suwon image geometry should include the explicit skybox geometry record');
  assert.ok(source.includes('SUWON_IMAGE_GEOMETRY_DRAFTS'), 'Suwon geometry should be backed by static geometry drafts');
  assert.ok(source.includes('hitGeometry'), 'Suwon geometry should expose static hit geometry');
  assert.ok(source.includes('OFFICIAL_IMAGE_TRACED'), 'Suwon geometry should expose official image trace status');
});

test('수원 SVG 컴포넌트는 공식 이미지와 overlay를 단일 좌표계에서 렌더링한다', () => {
  const componentPath = path.resolve(process.cwd(), 'src/components/suwon/SuwonSeatMapSvg.tsx');
  const source = fs.readFileSync(componentPath, 'utf8');

  assert.ok(!source.includes('<img'), 'Suwon renderer should not use a separate img element');
  assert.ok(source.includes('<svg'), 'Suwon renderer should render a single SVG root');
  assert.ok(source.includes('data-testid="suwon-seatmap-svg"'), 'Suwon SVG should expose QA test id');
  assert.ok(!source.includes('role="img"'), 'Suwon SVG root should not hide interactive hit-area buttons behind an image role');
  assert.ok(source.includes('aria-label="수원 kt 위즈 파크 좌석도 구역 선택"'), 'Suwon SVG should describe the interactive seat map');
  assert.ok(source.includes('viewBox={`0 ${cropY} ${imageWidth} ${cropHeight}`}'), 'Suwon SVG viewBox should encode the crop directly');
  assert.ok(source.includes('aspectRatio: `${imageWidth} / ${cropHeight}`'), 'Suwon wrapper should use cropped image aspect ratio');
  assert.ok(source.includes('<image'), 'Suwon renderer should draw the official seatmap inside the SVG');
  assert.ok(source.includes('href={seatMapImageUrl}'), 'Suwon image should use the resolved official asset URL');
  assert.ok(source.includes('width={imageWidth}'), 'Suwon image should use the official coordinate width');
  assert.ok(source.includes('height={imageHeight}'), 'Suwon image should use the official coordinate height');
  assert.ok(source.includes('data-layer="seatmap-content"'), 'Suwon zoom should wrap image and overlay in one content group');
  assert.ok(source.includes('data-testid="suwon-seatmap-transform-layer"'), 'Suwon transform layer should wrap the whole SVG');
  assert.ok(source.includes('transform: `translate3d(${effectivePan.x}px, ${effectivePan.y}px, 0) scale(${zoom})`'), 'Suwon transform layer should move image and overlay together');
  assert.ok(source.includes('getScreenCTM()'), 'Suwon debug coordinates should use the real SVG screen transform');
  assert.ok(source.includes('data-zoom={zoom.toFixed(2)}'), 'Suwon debug metadata should expose current zoom');
  assert.ok(source.includes('data-pan-x={effectivePan.x.toFixed(1)}'), 'Suwon debug metadata should expose current pan x');
  assert.ok(source.includes('data-layer="image-geometry-overlays"'), 'Suwon visual geometry layer should be explicit');
  assert.ok(source.includes('data-layer="hit-targets"'), 'Suwon hit target layer should be explicit');
  assert.ok(source.includes("strokeDasharray={showDebug ? '5 4' : undefined}"), 'Suwon debug mode should render hit geometry as dashed paths');
  assert.ok(source.includes("pointerEvents={isFiltered ? 'none' : 'fill'}"), 'Filtered Suwon hit targets should not block pointer events');
  assert.ok(!source.includes('fill="transparent"'), 'Suwon hit targets should keep a painted low-opacity fill for elementFromPoint hit testing');
  assert.ok(source.includes('const fillOpacity = isFiltered ? 0 : active ? 0.12 : showDebug ? 0.18 : 0'), 'Suwon visual polygons should be hidden outside active/debug states');
  assert.ok(source.includes("const stroke = active ? '#facc15' : showDebug ? (category?.dark ?? '#0284c7') : 'transparent'"), 'Suwon visual outlines should be hidden outside active/debug states');
  assert.ok(source.includes('const strokeWidth = active ? 4 : showDebug ? 4 : 0'), 'Suwon visual outlines should not render by default');
  assert.ok(source.includes('fillOpacity={isFiltered ? 0 : showDebug ? 0.08 : 0.001}'), 'Suwon hit target fill should stay nearly transparent outside debug mode');
  assert.ok(source.includes("style={{ cursor: isFiltered ? 'default' : 'pointer' }}"), 'Suwon hit targets should expose a consistent pointer cursor');
  assert.ok(source.includes('aria-label={block.name}'), 'Suwon hit targets should keep accessible names for Playwright and keyboard users');
  assert.ok(source.includes('polygonArea(b.hitGeometry.d) - polygonArea(a.hitGeometry.d)'), 'Suwon hit render order should put larger same-priority areas below smaller ones');
});

test('수원 좌석도 런타임은 필터 상태와 출처 캡션을 노출한다', () => {
  const componentPath = path.resolve(process.cwd(), 'src/components/suwon/SuwonSeatMap.tsx');
  const filterPath = path.resolve(process.cwd(), 'src/components/stadiumSeatMap/SeatMapFilterBar.tsx');
  const attributionPath = path.resolve(process.cwd(), 'src/components/stadiumSeatMap/SeatMapAttribution.tsx');
  const selectionStatePath = path.resolve(process.cwd(), 'src/components/stadiumSeatMap/useSeatMapSelectionState.ts');
  const source = fs.readFileSync(componentPath, 'utf8');
  const filterSource = fs.readFileSync(filterPath, 'utf8');
  const attributionSource = fs.readFileSync(attributionPath, 'utf8');
  const selectionStateSource = fs.readFileSync(selectionStatePath, 'utf8');

  assert.ok(source.includes('SeatMapFilterBar') && filterSource.includes('aria-pressed={active}'), 'Suwon filter buttons should expose pressed state for QA and accessibility');
  assert.ok(source.includes('SeatMapAttribution') && source.includes('sourceLabel: SUWON_SEATMAP_IMAGE.sourceLabel') && attributionSource.includes("source.prefixLabel ?? '좌석 배치 기준:'"), 'Suwon source caption should align with other stadium seat maps');
  assert.ok(selectionStateSource.includes('setSelected(null)') && selectionStateSource.includes('sectionIsVisible(selected)'), 'Suwon filter changes should close stale selected details through the shared selection state hook');
  assert.ok(selectionStateSource.includes('setHover(null)') && selectionStateSource.includes('sectionIsVisible(hoveredSection)'), 'Suwon filter changes should close stale hovered details through the shared selection state hook');
});
