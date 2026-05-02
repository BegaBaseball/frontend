import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  SUWON_ALIGNMENT_PROBES,
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

function numberedBlocks(start: number, end: number): string[] {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function pathPoints(d: string): Point[] {
  const coordinates = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: Point[] = [];
  for (let index = 0; index < coordinates.length - 1; index += 2) {
    points.push([coordinates[index], coordinates[index + 1]]);
  }
  return points;
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

function polygonArea(points: Point[]): number {
  return Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);
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
    .sort((a, b) => a.hitPriority - b.hitPriority)
    .forEach((block) => {
      const polygon = pathPoints(block.hitGeometry.d);
      if (polygon.length >= 3 && pointInPolygon(point, polygon)) {
        topBlock = block;
      }
    });

  return topBlock;
}

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

      assert.ok(pointInPolygon([block.imageGeometry.labelX, block.imageGeometry.labelY], pathPoints(block.imageGeometry.d)), `${block.id} label should remain inside visual geometry`);
      assert.ok(directHits >= Math.ceil(probes.length / 2), `${block.id} should be directly selectable across its visual geometry`);
      assert.ok(hitArea / visualArea <= 1.4, `${block.id} hit geometry should stay close to visual geometry`);
    });
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

  assert.deepEqual(mismatchIds, [...expectedMismatchIds].sort());
  mismatchIds.forEach((id) => {
    assert.ok(SUWON_HIT_GEOMETRY_EXCEPTION_NOTES[id], `${id} hit geometry exception should explain the overlap reason`);
  });
});

test('수원 선택 불능 후보 블록은 대표 hit 좌표에서 자기 자신으로 해석된다', () => {
  [
    'suwon-204',
    'suwon-205',
    'suwon-206',
    'suwon-213',
    'suwon-311',
    'suwon-312',
    'suwon-313',
  ].forEach((id) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.id === id);
    assert.ok(block, `${id} should exist`);
    assert.equal(topHitBlockAt([block.hitGeometry.labelX, block.hitGeometry.labelY])?.id, id, `${id} should be topmost at its hit label`);
  });
});

test('수원 대표 QA probe 좌표는 기대 블록으로 해석된다', () => {
  assert.ok(SUWON_HIT_TEST_PROBES.length >= 20, 'Suwon QA probes should cover at least 20 representative sections');

  SUWON_HIT_TEST_PROBES.forEach((probe) => {
    assert.equal(topHitBlockAt(probe.point)?.id, probe.id, `${probe.note} should resolve to ${probe.id}`);
  });
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
    '328': { x: [815, 905], y: [2885, 2975] },
    '401': { x: [3210, 3305], y: [3540, 3645] },
    '432': { x: [330, 420], y: [3050, 3150] },
    GENIE: { x: [1995, 2115], y: [3780, 3865] },
    'WHEEL-CENTER': { x: [1940, 2060], y: [4240, 4350] },
    '501-508': { x: [3060, 3185], y: [1770, 1900] },
  };

  Object.entries(expectedBounds).forEach(([blockName, bounds]) => {
    const block = SUWON_BLOCKS.find((candidate) => candidate.block === blockName);
    assert.ok(block, `${blockName} should exist`);
    assert.ok(block.imageGeometry.labelX >= bounds.x[0] && block.imageGeometry.labelX <= bounds.x[1], `${blockName} label x should stay near official image block`);
    assert.ok(block.imageGeometry.labelY >= bounds.y[0] && block.imageGeometry.labelY <= bounds.y[1], `${blockName} label y should stay near official image block`);
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
  assert.ok(!source.includes('...SUWON_MIGRATED_IMAGE_GEOMETRY_DRAFTS'), 'Suwon production geometry should not merge migrated 1000px fallback data');
  assert.ok(source.includes('officialRowCellGeometries'), 'Suwon numeric geometry should use official-image row cell polygons');
  assert.ok(source.includes('SUWON_IMAGE_GEOMETRY_DRAFTS'), 'Suwon geometry should be backed by static geometry drafts');
  assert.ok(source.includes('hitGeometry'), 'Suwon geometry should expose static hit geometry');
  assert.ok(source.includes('OFFICIAL_IMAGE_TRACED'), 'Suwon geometry should expose official image trace status');
});
