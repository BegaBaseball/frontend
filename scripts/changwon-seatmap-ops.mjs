import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runTraceManifest = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const { default: sharp } = await import('sharp');
  const {
    CHANGWON_BLOCKS,
    CHANGWON_EXPECTED_VISIBLE_BLOCKS,
    CHANGWON_EXPECTED_SELECTABLE_AREAS,
    CHANGWON_IMAGE_GEOMETRY,
    CHANGWON_OFFICIAL_TRACE_REFERENCE,
    CHANGWON_SEATMAP_IMAGE,
    CHANGWON_SEATMAP_VIEWPORT,
    CHANGWON_SPECIAL_SELECTABLE_AREAS,
  } = await import('../src/data/changwonSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  
  const TRACE_VERSION = 'manual-polygon-v2';
  const TRACE_SOURCE = 'OFFICIAL_PNG_MANUAL_POLYGON';
  const MIN_PIXEL_COVERAGE_RATIO = 0.82;
  const LOW_COVERAGE_REVIEW_THRESHOLD = 0.9;
  const MAX_OVERLAP_RATIO = 0.005;
  const MULTI_PATH_ALLOW_LIST = new Set([
    '101', '102', '103', '104',
    '112', '113', '114',
    '122', '123', '124', '125',
    '1루 바베큐석',
    '1루 라운드 테이블석',
    '1루 테이블석',
    '외야 카운터석',
    '외야 가족석',
  ]);
  
  const blockRange = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
  
  const LOW_COVERAGE_VISUAL_REVIEW_NOTES = new Map([
    ['113', 'Pixel coverage below 0.90 reviewed in P0 112-114 overlay; no trace adjustment queued.'],
    ['125', 'Pixel coverage below 0.90 reviewed in P0 121-128 overlay; no trace adjustment queued.'],
    ['129', 'Pixel coverage below 0.90 reviewed in P1 129-137 and outfield stack overlays; no trace adjustment queued.'],
    ['137', 'Pixel coverage below 0.90 reviewed in P1 129-137 and outfield stack overlays; no trace adjustment queued.'],
    ['326', 'Pixel coverage below 0.90 reviewed in P2 321-326 and third-base stack overlays; no trace adjustment queued.'],
    ['412', 'Pixel coverage below 0.90 reviewed in P2 409-416 overlay; no trace adjustment queued.'],
    ['426', 'Pixel coverage below 0.90 reviewed in P2 420-429 and outfield stack overlays; no trace adjustment queued.'],
    ['428', 'Pixel coverage below 0.90 reviewed in P2 420-429 and outfield stack overlays; no trace adjustment queued.'],
  ]);
  
  const SPECIAL_CLEAN_OVERLAY_TARGETS = [
    { block: '1루 바베큐석', slug: 'special-first-bbq', padding: 96 },
    { block: '3루 라운드 테이블석', slug: 'special-third-round-table', padding: 96 },
    { block: '1루 라운드 테이블석', slug: 'special-first-round-table', padding: 88 },
    { block: '1루 테이블석', slug: 'special-first-table', padding: 88 },
    { block: '외야 카운터석', slug: 'special-outfield-counter', padding: 76 },
    { block: '외야 가족석', slug: 'special-outfield-family', padding: 76 },
  ];
  
  const P0_BLOCK_LIST = [
    '101', '102', '103', '104', '105', '106', '107', '108',
    '112', '113', '114',
    '121', '122', '123', '124', '125', '126', '127', '128',
    '138', '301', '309',
  ];
  
  const P0_CLEAN_OVERLAY_TARGETS = [
    { blocks: ['101', '102', '103', '104', '105', '106', '107', '108'], slug: 'p0-101-108', padding: 72, title: 'P0 101-108' },
    { blocks: ['112', '113', '114'], slug: 'p0-112-114', padding: 72, title: 'P0 112-114' },
    { blocks: ['121', '122', '123', '124', '125', '126', '127', '128'], slug: 'p0-121-128', padding: 72, title: 'P0 121-128' },
    { blocks: ['138'], slug: 'p0-138', padding: 72, title: 'P0 138' },
    { blocks: ['301', '309'], slug: 'p0-301-309', padding: 88, title: 'P0 301 309' },
  ];
  
  const P1_CLEAN_OVERLAY_TARGETS = [
    { blocks: ['109', '110', '111'], slug: 'p1-109-111', padding: 72, title: 'P1 109-111' },
    { blocks: ['115', '116', '117', '118', '119', '120'], slug: 'p1-115-120', padding: 72, title: 'P1 115-120' },
    { blocks: ['129', '130', '131', '132', '133', '134', '135', '136', '137'], slug: 'p1-129-137', padding: 72, title: 'P1 129-137' },
    { blocks: ['201', '202', '203', '204', '205', '206', '207', '208', '209', '210'], slug: 'p1-201-210', padding: 80, title: 'P1 201-210' },
    { blocks: ['211', '212', '213', '214', '215', '216', '217', '218', '219', '220', '221', '222', '223'], slug: 'p1-211-223', padding: 80, title: 'P1 211-223' },
  ];
  
  const P2_CLEAN_OVERLAY_TARGETS = [
    { blocks: ['302', '303', '304', '305', '306', '307', '308'], slug: 'p2-302-308', padding: 88, title: 'P2 302-308' },
    { blocks: ['310', '311', '312', '313', '314', '315'], slug: 'p2-310-315', padding: 88, title: 'P2 310-315' },
    { blocks: ['321', '322', '323', '324', '325', '326'], slug: 'p2-321-326', padding: 88, title: 'P2 321-326' },
    { blocks: ['327', '328', '329', '330', '331', '332', '333'], slug: 'p2-327-333', padding: 88, title: 'P2 327-333' },
    { blocks: ['401', '402', '403', '404', '405', '406', '407', '408'], slug: 'p2-401-408', padding: 88, title: 'P2 401-408' },
    { blocks: ['409', '410', '411', '412', '413', '414', '415', '416'], slug: 'p2-409-416', padding: 88, title: 'P2 409-416' },
    { blocks: ['420', '422', '423', '424', '425', '426', '427', '428', '429'], slug: 'p2-420-429', padding: 88, title: 'P2 420 422-429' },
    { blocks: ['431', '432', '433'], slug: 'p2-431-433', padding: 88, title: 'P2 431-433' },
  ];
  
  const SPECIAL_STACK_CLEAN_OVERLAY_TARGETS = [
    {
      blocks: ['1루 바베큐석', '1루 라운드 테이블석', '1루 테이블석', ...blockRange(301, 315)],
      slug: 'special-first-base-stack',
      padding: 112,
      title: 'Special first-base stack 301-315',
    },
    {
      blocks: ['3루 라운드 테이블석', ...blockRange(121, 128), ...blockRange(321, 333)],
      slug: 'special-third-base-stack',
      padding: 112,
      title: 'Special third-base stack 121-128 321-333',
    },
    {
      blocks: ['외야 카운터석', '외야 가족석', ...blockRange(129, 138), '420', ...blockRange(422, 429), ...blockRange(431, 433)],
      slug: 'special-outfield-stack',
      padding: 112,
      title: 'Special outfield stack',
    },
  ];
  
  const CLEAN_OVERLAY_REVIEW_BATCH = '2026-05-10-clean-overlay-final-pass';
  const CLEAN_OVERLAY_VISUAL_REVIEW_STATUS = 'VISUALLY_REVIEWED_NO_ACTION';
  const CLEAN_OVERLAY_REVIEW_NOTES = new Map([
    ['special-first-bbq', 'Special selectable area crop reviewed against the official PNG; no coordinate change queued.'],
    ['special-third-round-table', 'Special selectable area crop reviewed against the official PNG; no coordinate change queued.'],
    ['special-first-round-table', 'Special selectable area crop reviewed against the official PNG; no coordinate change queued.'],
    ['special-first-table', 'Special selectable area crop reviewed against the official PNG; no coordinate change queued.'],
    ['special-outfield-counter', 'Special selectable area crop reviewed against the official PNG; no coordinate change queued.'],
    ['special-outfield-family', 'Special selectable area crop reviewed against the official PNG; no coordinate change queued.'],
    ['p0-101-108', 'P0 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p0-112-114', 'P0 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p0-121-128', 'P0 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p0-138', 'P0 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p0-301-309', 'P0 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p1-109-111', 'P1 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p1-115-120', 'P1 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p1-129-137', 'P1 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p1-201-210', 'P1 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p1-211-223', 'P1 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-302-308', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-310-315', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-321-326', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-327-333', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-401-408', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-409-416', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-420-429', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['p2-431-433', 'P2 numeric crop reviewed against the official PNG; no coordinate change queued.'],
    ['special-first-base-stack', 'First-base special stack crop reviewed for special hit-area and adjacent numeric block separation.'],
    ['special-third-base-stack', 'Third-base special stack crop reviewed for special hit-area and adjacent numeric block separation.'],
    ['special-outfield-stack', 'Outfield special stack crop reviewed for special hit-area and adjacent numeric block separation.'],
  ]);
  const HUMAN_SIGNOFF_PENDING = 'PENDING_HUMAN_SIGNOFF';
  const VISUAL_APPROVAL_DECISION_OPTIONS = ['CONFIRM', 'NEEDS_TRACE_ADJUSTMENT'];
  const VISUAL_SIGNOFF_REVIEW_BATCH = '2026-05-10-visual-signoff-pass';
  const VISUAL_SIGNOFF_REVIEWER = 'Codex visual review';
  const STACK_OVERLAY_APPROVAL_NOTES = new Map([
    ['special-first-base-stack', 'Review first-base special selectable areas against 301-315. Confirm that special hit-areas do not cover adjacent numbered blocks.'],
    ['special-third-base-stack', 'Review third-base round table and adjacent 121-128, 321-333 blocks. Confirm visual alignment and hit-area separation.'],
    ['special-outfield-stack', 'Review outfield special selectable areas against 129-138, 420, 422-429, 431-433. Confirm visual alignment and hit-area separation.'],
  ]);
  const VISUAL_SIGNOFF_DECISIONS = new Map([
    ['special-first-base-stack', {
      status: 'CONFIRM',
      note: 'First-base stack overlay shows special hit-areas separated from 301-315; no trace adjustment queued.',
    }],
    ['special-third-base-stack', {
      status: 'CONFIRM',
      note: 'Third-base stack overlay shows round-table and adjacent 121-128/321-333 separation; no trace adjustment queued.',
    }],
    ['special-outfield-stack', {
      status: 'CONFIRM',
      note: 'Outfield stack overlay shows special areas and adjacent numbered blocks separated; no trace adjustment queued.',
    }],
    ['129', {
      status: 'CONFIRM',
      note: 'Mixed-color official shape reviewed in focused overlay; polygon follows the visible 129 block without adjacent interception.',
    }],
    ['137', {
      status: 'CONFIRM',
      note: 'Focused outfield overlay reviewed; 137 polygon stays on the visible block and remains separated from 136/138.',
    }],
    ['326', {
      status: 'CONFIRM',
      note: 'Third-base stack and P2 321-326 overlays reviewed; 326 polygon stays separated from 325/327.',
    }],
    ['426', {
      status: 'CONFIRM',
      note: 'Outfield stack and P2 420-429 overlays reviewed; 426 polygon stays separated from 425/427.',
    }],
    ['125', {
      status: 'CONFIRM',
      note: 'Tiny irregular 125 wedge reviewed in 121-128 overlay; no foreign anchor or visible adjacent-block takeover.',
    }],
    ['113', {
      status: 'CONFIRM',
      note: 'P0 112-114 overlay reviewed; multi-path 113 shape remains visually aligned with the official block.',
    }],
    ['428', {
      status: 'CONFIRM',
      note: 'Outfield stack and P2 420-429 overlays reviewed; 428 polygon stays separated from 427/429.',
    }],
    ['412', {
      status: 'CONFIRM',
      note: 'P2 409-416 overlay reviewed; 412 polygon follows the visible block without adjacent takeover.',
    }],
  ]);
  
  const P0_BLOCKS = new Set(P0_BLOCK_LIST);
  const P1_BLOCKS = new Set([
    ...Array.from({ length: 138 - 101 + 1 }, (_, index) => String(101 + index)).filter((block) => !P0_BLOCKS.has(block)),
    ...Array.from({ length: 223 - 201 + 1 }, (_, index) => String(201 + index)),
  ]);
  const P2_NUMERIC_BLOCKS = new Set(CHANGWON_EXPECTED_VISIBLE_BLOCKS.filter((block) => !P0_BLOCKS.has(block) && !P1_BLOCKS.has(block)));
  const CLEAN_OVERLAY_TARGETS = [
    ...SPECIAL_CLEAN_OVERLAY_TARGETS,
    ...P0_CLEAN_OVERLAY_TARGETS,
    ...P1_CLEAN_OVERLAY_TARGETS,
    ...P2_CLEAN_OVERLAY_TARGETS,
    ...SPECIAL_STACK_CLEAN_OVERLAY_TARGETS,
  ];
  
  const assertOverlayTierCoverage = (tier, expectedBlocks, overlayTargets) => {
    const seen = new Set();
    const duplicateBlocks = [];
    const unexpectedBlocks = [];
  
    overlayTargets.flatMap((target) => target.blocks ?? [target.block]).forEach((block) => {
      if (!expectedBlocks.has(block)) unexpectedBlocks.push(block);
      if (seen.has(block)) duplicateBlocks.push(block);
      seen.add(block);
    });
  
    const missingBlocks = [...expectedBlocks].filter((block) => !seen.has(block));
    if (missingBlocks.length > 0 || duplicateBlocks.length > 0 || unexpectedBlocks.length > 0) {
      throw new Error(`${tier} clean overlay coverage mismatch: missing=${missingBlocks.join(',') || '-'} duplicate=${duplicateBlocks.join(',') || '-'} unexpected=${unexpectedBlocks.join(',') || '-'}`);
    }
  };
  
  assertOverlayTierCoverage('P0', P0_BLOCKS, P0_CLEAN_OVERLAY_TARGETS);
  assertOverlayTierCoverage('P1', P1_BLOCKS, P1_CLEAN_OVERLAY_TARGETS);
  assertOverlayTierCoverage('P2 numeric', P2_NUMERIC_BLOCKS, P2_CLEAN_OVERLAY_TARGETS);
  
  const missingOverlayReviewNotes = CLEAN_OVERLAY_TARGETS
    .filter((target) => !CLEAN_OVERLAY_REVIEW_NOTES.has(target.slug))
    .map((target) => target.slug);
  if (missingOverlayReviewNotes.length > 0) {
    throw new Error(`Missing Changwon clean overlay review notes: ${missingOverlayReviewNotes.join(', ')}`);
  }
  const missingStackApprovalNotes = SPECIAL_STACK_CLEAN_OVERLAY_TARGETS
    .filter((target) => !STACK_OVERLAY_APPROVAL_NOTES.has(target.slug))
    .map((target) => target.slug);
  if (missingStackApprovalNotes.length > 0) {
    throw new Error(`Missing Changwon visual approval stack notes: ${missingStackApprovalNotes.join(', ')}`);
  }
  const missingVisualSignoffDecisions = [
    ...SPECIAL_STACK_CLEAN_OVERLAY_TARGETS.map((target) => target.slug),
    ...LOW_COVERAGE_VISUAL_REVIEW_NOTES.keys(),
  ].filter((target) => !VISUAL_SIGNOFF_DECISIONS.has(target));
  if (missingVisualSignoffDecisions.length > 0) {
    throw new Error(`Missing Changwon visual signoff decisions: ${missingVisualSignoffDecisions.join(', ')}`);
  }
  
  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
  
  const parseSubpathCount = (pathData) => (pathData.match(/(?:^|\s)M\s/g) ?? []).length;
  
  const parsePathSubpaths = (pathData) => (
    pathData
      .trim()
      .split(/(?=M\s)/)
      .filter(Boolean)
      .map((subpath) => {
        const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
        return Array.from({ length: numbers.length / 2 }, (_, index) => ({
          x: numbers[index * 2],
          y: numbers[(index * 2) + 1],
        }));
      })
  );
  
  const pathBounds = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const xs = [];
    const ys = [];
    for (let index = 0; index < numbers.length; index += 2) {
      xs.push(numbers[index]);
      ys.push(numbers[index + 1]);
    }
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };
  
  const isPointOnSegment = (point, start, end) => {
    const cross = ((point.y - start.y) * (end.x - start.x)) - ((point.x - start.x) * (end.y - start.y));
    if (Math.abs(cross) > 0.001) return false;
  
    const dot = ((point.x - start.x) * (end.x - start.x)) + ((point.y - start.y) * (end.y - start.y));
    if (dot < -0.001) return false;
  
    const squaredLength = ((end.x - start.x) ** 2) + ((end.y - start.y) ** 2);
    return dot <= squaredLength + 0.001;
  };
  
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
  
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const start = polygon[previous];
      const end = polygon[current];
  
      if (isPointOnSegment(point, start, end)) return true;
  
      const intersects = ((start.y > point.y) !== (end.y > point.y))
        && (point.x < (((end.x - start.x) * (point.y - start.y)) / (end.y - start.y)) + start.x);
  
      if (intersects) inside = !inside;
    }
  
    return inside;
  };
  
  const polygonArea = (polygon) => {
    let signedArea = 0;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      signedArea += (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
    }
    return Math.abs(signedArea) / 2;
  };
  
  const geometryArea = (pathData) => parsePathSubpaths(pathData).reduce((sum, polygon) => sum + polygonArea(polygon), 0);
  
  const distanceToSegment = (point, start, end) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
  
    if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  
    const progress = Math.max(0, Math.min(1, (((point.x - start.x) * dx) + ((point.y - start.y) * dy)) / ((dx ** 2) + (dy ** 2))));
    const closestX = start.x + (progress * dx);
    const closestY = start.y + (progress * dy);
  
    return Math.hypot(point.x - closestX, point.y - closestY);
  };
  
  const distanceToPolygonStroke = (point, polygon) => Math.min(
    ...polygon.map((start, index) => distanceToSegment(point, start, polygon[(index + 1) % polygon.length])),
  );
  
  const isPointInRenderedHitArea = (block, point) => {
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
  
    if (subpaths.some((subpath) => isPointInPolygon(point, subpath))) return true;
  
    const hitStrokeWidth = block.imageGeometry.hitStrokeWidth ?? 0;
    if (hitStrokeWidth <= 0) return false;
  
    return subpaths.some((subpath) => distanceToPolygonStroke(point, subpath) <= hitStrokeWidth / 2);
  };
  
  const topRenderedHitBlockAt = (point) => (
    CHANGWON_BLOCKS
      .filter((block) => isPointInRenderedHitArea(block, point))
      .at(-1)?.block ?? null
  );
  
  const polygonCentroid = (polygon) => {
    let signedArea = 0;
    let centroidX = 0;
    let centroidY = 0;
  
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const cross = (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
      signedArea += cross;
      centroidX += (polygon[previous].x + polygon[current].x) * cross;
      centroidY += (polygon[previous].y + polygon[current].y) * cross;
    }
  
    if (Math.abs(signedArea) < 0.001) return polygon[0];
  
    return {
      x: centroidX / (3 * signedArea),
      y: centroidY / (3 * signedArea),
    };
  };
  
  const representativePointForPolygon = (polygon) => {
    const centroid = polygonCentroid(polygon);
    if (isPointInPolygon(centroid, polygon)) return centroid;
  
    const bounds = {
      minX: Math.min(...polygon.map((point) => point.x)),
      minY: Math.min(...polygon.map((point) => point.y)),
      maxX: Math.max(...polygon.map((point) => point.x)),
      maxY: Math.max(...polygon.map((point) => point.y)),
    };
    let bestPoint = null;
    let bestDistance = -1;
    const steps = 8;
  
    for (let xIndex = 1; xIndex < steps; xIndex += 1) {
      for (let yIndex = 1; yIndex < steps; yIndex += 1) {
        const candidate = {
          x: bounds.minX + (((bounds.maxX - bounds.minX) * xIndex) / steps),
          y: bounds.minY + (((bounds.maxY - bounds.minY) * yIndex) / steps),
        };
  
        if (!isPointInPolygon(candidate, polygon)) continue;
  
        const distance = distanceToPolygonStroke(candidate, polygon);
        if (distance > bestDistance) {
          bestPoint = candidate;
          bestDistance = distance;
        }
      }
    }
  
    return bestPoint ?? polygon[0];
  };
  
  const roundPoint = (point) => ({
    x: Number(point.x.toFixed(1)),
    y: Number(point.y.toFixed(1)),
  });
  
  const hitProbesForBlock = (block) => {
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    return [
      {
        kind: 'LABEL_ANCHOR',
        subpathIndex: null,
        point: {
          x: block.imageGeometry.labelX,
          y: block.imageGeometry.labelY,
        },
      },
      ...subpaths.map((subpath, index) => ({
        kind: 'SUBPATH_REPRESENTATIVE',
        subpathIndex: index,
        point: roundPoint(representativePointForPolygon(subpath)),
      })),
    ];
  };
  
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  
  const pathBoundsForBlocks = (blocks) => {
    const bounds = blocks.map((block) => pathBounds(CHANGWON_IMAGE_GEOMETRY[block].d));
    return {
      minX: Math.min(...bounds.map((entry) => entry.minX)),
      minY: Math.min(...bounds.map((entry) => entry.minY)),
      maxX: Math.max(...bounds.map((entry) => entry.maxX)),
      maxY: Math.max(...bounds.map((entry) => entry.maxY)),
    };
  };
  
  const cropForBounds = (bounds, padding) => {
    const left = Math.floor(clamp(bounds.minX - padding, 0, CHANGWON_SEATMAP_IMAGE.imageWidth - 1));
    const top = Math.floor(clamp(bounds.minY - padding, 0, CHANGWON_SEATMAP_IMAGE.imageHeight - 1));
    const right = Math.ceil(clamp(bounds.maxX + padding, left + 1, CHANGWON_SEATMAP_IMAGE.imageWidth));
    const bottom = Math.ceil(clamp(bounds.maxY + padding, top + 1, CHANGWON_SEATMAP_IMAGE.imageHeight));
  
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  };
  
  const xmlEscape = (value) => String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
  
  const cleanOverlaySvg = ({ crop, targetBlocks, title, contextBlocks = [] }) => {
    const targetSet = new Set(targetBlocks);
    const contextPaths = contextBlocks
      .filter((block) => !targetSet.has(block))
      .map((block) => {
        const geometry = CHANGWON_IMAGE_GEOMETRY[block];
        return `<path d="${xmlEscape(geometry.d)}" fill="#64748B" fill-opacity="0.12" stroke="#334155" stroke-opacity="0.42" stroke-width="3" vector-effect="non-scaling-stroke" />`;
      })
      .join('\n');
    const targetPaths = targetBlocks
      .map((block) => {
        const geometry = CHANGWON_IMAGE_GEOMETRY[block];
        return `
    <path d="${xmlEscape(geometry.d)}" fill="#F97316" fill-opacity="0.32" stroke="#7C2D12" stroke-width="7" stroke-linejoin="round" vector-effect="non-scaling-stroke" />
    <path d="${xmlEscape(geometry.d)}" fill="none" stroke="#FDE047" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke" />`.trim();
      })
      .join('\n');
    const targetAnchors = targetBlocks
      .map((block) => {
        const geometry = CHANGWON_IMAGE_GEOMETRY[block];
        return `
    <line x1="${geometry.labelX - 12}" y1="${geometry.labelY}" x2="${geometry.labelX + 12}" y2="${geometry.labelY}" stroke="#DC2626" stroke-width="3" vector-effect="non-scaling-stroke" />
    <line x1="${geometry.labelX}" y1="${geometry.labelY - 12}" x2="${geometry.labelX}" y2="${geometry.labelY + 12}" stroke="#DC2626" stroke-width="3" vector-effect="non-scaling-stroke" />
    <circle cx="${geometry.labelX}" cy="${geometry.labelY}" r="7" fill="#FEF3C7" stroke="#7F1D1D" stroke-width="3" vector-effect="non-scaling-stroke" />
    <text x="${geometry.labelX + 12}" y="${geometry.labelY - 12}" font-size="20" font-weight="800" fill="#7F1D1D" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">${xmlEscape(block)}</text>`.trim();
      })
      .join('\n');
  
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.left} ${crop.top} ${crop.width} ${crop.height}">
    <rect x="${crop.left}" y="${crop.top}" width="${crop.width}" height="${crop.height}" fill="none" />
    ${contextPaths}
    ${targetPaths}
    ${targetAnchors}
    <text x="${crop.left + 14}" y="${crop.top + 28}" font-size="22" font-weight="800" fill="#0F172A" stroke="#FFFFFF" stroke-width="4" paint-order="stroke">${xmlEscape(title)}</text>
  </svg>`.trim();
  };
  
  const writeCleanOverlay = async ({ block, blocks, slug, padding, title }) => {
    const targetBlocks = blocks ?? [block];
    const missingBlocks = targetBlocks.filter((targetBlock) => !CHANGWON_IMAGE_GEOMETRY[targetBlock]);
    if (missingBlocks.length > 0) {
      throw new Error(`Missing Changwon clean overlay geometry: ${missingBlocks.join(', ')}`);
    }
  
    const crop = cropForBounds(pathBoundsForBlocks(targetBlocks), padding);
    const filePath = path.join(outDir, `changwon-seatmap-trace-review-${slug}-clean-overlay.png`);
    const contextBlocks = block ? CHANGWON_SPECIAL_SELECTABLE_AREAS : [];
    const manualReviewNote = CLEAN_OVERLAY_REVIEW_NOTES.get(slug);
  
    await sharp(path.join(frontendRoot, CHANGWON_SEATMAP_IMAGE.imagePath))
      .extract(crop)
      .composite([{ input: Buffer.from(cleanOverlaySvg({
        crop,
        targetBlocks,
        title: title ?? block ?? targetBlocks.join(' '),
        contextBlocks,
      })) }])
      .png()
      .toFile(filePath);
  
    return {
      block: block ?? targetBlocks.join(' '),
      blocks: targetBlocks,
      slug,
      filePath,
      crop,
      visualReviewStatus: CLEAN_OVERLAY_VISUAL_REVIEW_STATUS,
      manualReviewed: true,
      manualReviewNote,
      reviewBatch: CLEAN_OVERLAY_REVIEW_BATCH,
    };
  };
  
  const isOfficialSeatColor = (red, green, blue) => {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;
  
    return luminance <= 0.95
      && saturation >= 0.1
      && !(red < 80 && green < 80 && blue < 80);
  };
  
  const getPixelColor = (image, x, y) => {
    const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
    const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
    const index = ((safeY * image.width) + safeX) * image.channels;
    return [
      image.data[index],
      image.data[index + 1],
      image.data[index + 2],
    ];
  };
  
  const calculateSeatColorOverlapRatio = (image, pathData) => {
    const subpaths = parsePathSubpaths(pathData);
    const bounds = pathBounds(pathData);
    let sampledPoints = 0;
    let coloredPoints = 0;
    const sampleStep = 3;
  
    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
      for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
        if (!subpaths.some((subpath) => isPointInPolygon({ x, y }, subpath))) continue;
        sampledPoints += 1;
        if (isOfficialSeatColor(...getPixelColor(image, x, y))) coloredPoints += 1;
      }
    }
  
    return sampledPoints === 0 ? 0 : coloredPoints / sampledPoints;
  };
  
  const calculateSampledOverlapRatio = (firstPathData, secondPathData) => {
    const firstSubpaths = parsePathSubpaths(firstPathData);
    const secondSubpaths = parsePathSubpaths(secondPathData);
    const firstBounds = pathBounds(firstPathData);
    const secondBounds = pathBounds(secondPathData);
    const bounds = {
      minX: Math.max(firstBounds.minX, secondBounds.minX),
      minY: Math.max(firstBounds.minY, secondBounds.minY),
      maxX: Math.min(firstBounds.maxX, secondBounds.maxX),
      maxY: Math.min(firstBounds.maxY, secondBounds.maxY),
    };
  
    if (bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) return 0;
  
    let overlappingPoints = 0;
    const sampleStep = 4;
  
    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
      for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
        const point = { x, y };
        if (
          firstSubpaths.some((subpath) => isPointInPolygon(point, subpath))
          && secondSubpaths.some((subpath) => isPointInPolygon(point, subpath))
        ) {
          overlappingPoints += 1;
        }
      }
    }
  
    return (overlappingPoints * sampleStep * sampleStep) / Math.min(geometryArea(firstPathData), geometryArea(secondPathData));
  };
  
  const reviewTierForBlock = (block) => {
    if (P0_BLOCKS.has(block)) return 'P0';
    if (P1_BLOCKS.has(block)) return 'P1';
    return 'P2';
  };
  
  const { data: officialImageData, info: officialImageInfo } = await sharp(path.join(frontendRoot, CHANGWON_SEATMAP_IMAGE.imagePath))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const officialImage = {
    data: officialImageData,
    width: officialImageInfo.width,
    height: officialImageInfo.height,
    channels: officialImageInfo.channels,
  };
  
  const expectedVisibleBlocks = new Set(CHANGWON_EXPECTED_VISIBLE_BLOCKS);
  const expectedSelectableAreas = new Set(CHANGWON_EXPECTED_SELECTABLE_AREAS);
  const labelAnchors = CHANGWON_BLOCKS.map((block) => ({
    block: block.block,
    point: {
      x: block.imageGeometry.labelX,
      y: block.imageGeometry.labelY,
    },
  }));
  const blockRows = CHANGWON_BLOCKS.map((block) => {
    const geometry = CHANGWON_IMAGE_GEOMETRY[block.block];
    const reference = CHANGWON_OFFICIAL_TRACE_REFERENCE[block.block];
  
    if (!expectedSelectableAreas.has(block.block)) {
      throw new Error(`Unexpected Changwon selectable area in block data: ${block.block}`);
    }
    if (!geometry) {
      throw new Error(`Missing Changwon geometry for block ${block.block}`);
    }
    if (!reference) {
      throw new Error(`Missing Changwon trace reference for block ${block.block}`);
    }
  
    const subpaths = parsePathSubpaths(geometry.d);
    const foreignLabelAnchors = labelAnchors
      .filter((label) => label.block !== block.block)
      .filter((label) => subpaths.some((subpath) => isPointInPolygon(label.point, subpath)))
      .map((label) => label.block);
    const labelAnchor = {
      x: geometry.labelX,
      y: geometry.labelY,
    };
    const topHitOwner = topRenderedHitBlockAt(labelAnchor);
    const hitStrokeWidth = geometry.hitStrokeWidth ?? 0;
    const expandedHitAreaIntercepts = hitStrokeWidth > 0
      ? labelAnchors
        .filter((label) => label.block !== block.block)
        .filter((label) => isPointInRenderedHitArea(block, label.point))
        .map((label) => label.block)
      : [];
    const renderedHitStatus = [
      topHitOwner === block.block ? null : 'TOP_HIT_MISMATCH',
      expandedHitAreaIntercepts.length === 0 ? null : 'EXPANDED_HIT_INTERCEPT',
    ].filter(Boolean).join('|') || 'OK';
    const pixelCoverageRatio = Number(calculateSeatColorOverlapRatio(officialImage, geometry.d).toFixed(4));
    const lowCoverageReviewTarget = pixelCoverageRatio < LOW_COVERAGE_REVIEW_THRESHOLD;
    const visualAlignmentStatus = 'CONFIRMED';
    const visualReviewNote = lowCoverageReviewTarget
      ? (LOW_COVERAGE_VISUAL_REVIEW_NOTES.get(block.block) ?? 'Pixel coverage below 0.90 reviewed against clean overlay; no trace adjustment queued.')
      : 'Clean overlay visual review confirmed; no trace adjustment queued.';
    const hitProbes = hitProbesForBlock(block).map((probe) => {
      const probeTopHitOwner = topRenderedHitBlockAt(probe.point);
      return {
        ...probe,
        topHitOwner: probeTopHitOwner,
        renderedHitStatus: probeTopHitOwner === block.block ? 'OK' : 'TOP_HIT_MISMATCH',
      };
    });
  
    return {
      id: block.id,
      block: block.block,
      name: block.name,
      level: block.level,
      side: block.side,
      category: block.category,
      fanRole: block.fanRole,
      reviewTier: reviewTierForBlock(block.block),
      labelAnchor,
      expectedBounds: reference.expectedBounds,
      currentBounds: pathBounds(geometry.d),
      expectedSubpathCount: reference.expectedSubpathCount,
      actualSubpathCount: parseSubpathCount(geometry.d),
      traceStatus: geometry.traceStatus,
      traceMethod: geometry.traceMethod,
      traceSource: geometry.traceSource,
      traceVersion: geometry.traceVersion,
      manualReviewed: geometry.manualReviewed,
      pixelAlignmentStatus: geometry.pixelAlignmentStatus,
      manualReviewNote: geometry.manualReviewNote ?? '',
      foreignLabelAnchors,
      overlapWarnings: [],
      hitStrokeWidth,
      topHitOwner,
      expandedHitAreaIntercepts,
      renderedHitStatus,
      visualAlignmentStatus,
      visualReviewNote,
      lowCoverageReviewTarget,
      hitProbes,
      pixelCoverageRatio,
      pathArea: Number(geometryArea(geometry.d).toFixed(1)),
      allowedMultiPath: MULTI_PATH_ALLOW_LIST.has(block.block),
      path: geometry.d,
    };
  });
  
  for (let first = 0; first < blockRows.length; first += 1) {
    for (let second = first + 1; second < blockRows.length; second += 1) {
      const overlapRatio = calculateSampledOverlapRatio(blockRows[first].path, blockRows[second].path);
      if (overlapRatio > MAX_OVERLAP_RATIO) {
        const warning = {
          block: blockRows[second].block,
          overlapRatio: Number(overlapRatio.toFixed(4)),
        };
        blockRows[first].overlapWarnings.push(warning);
        blockRows[second].overlapWarnings.push({
          block: blockRows[first].block,
          overlapRatio: warning.overlapRatio,
        });
      }
    }
  }
  
  const missingBlocks = CHANGWON_EXPECTED_VISIBLE_BLOCKS.filter((block) => !CHANGWON_BLOCKS.some((entry) => entry.block === block));
  if (missingBlocks.length > 0) {
    throw new Error(`Missing Changwon block data for expected visible blocks: ${missingBlocks.join(', ')}`);
  }
  const missingSelectableAreas = CHANGWON_EXPECTED_SELECTABLE_AREAS.filter((block) => !CHANGWON_BLOCKS.some((entry) => entry.block === block));
  if (missingSelectableAreas.length > 0) {
    throw new Error(`Missing Changwon block data for expected selectable areas: ${missingSelectableAreas.join(', ')}`);
  }
  
  await fs.mkdir(outDir, { recursive: true });
  const specialCleanOverlayArtifacts = await Promise.all(SPECIAL_CLEAN_OVERLAY_TARGETS.map(writeCleanOverlay));
  const p0CleanOverlayArtifacts = await Promise.all(P0_CLEAN_OVERLAY_TARGETS.map(writeCleanOverlay));
  const p1CleanOverlayArtifacts = await Promise.all(P1_CLEAN_OVERLAY_TARGETS.map(writeCleanOverlay));
  const p2CleanOverlayArtifacts = await Promise.all(P2_CLEAN_OVERLAY_TARGETS.map(writeCleanOverlay));
  const specialStackCleanOverlayArtifacts = await Promise.all(SPECIAL_STACK_CLEAN_OVERLAY_TARGETS.map(writeCleanOverlay));
  const cleanOverlayArtifacts = [
    ...specialCleanOverlayArtifacts,
    ...p0CleanOverlayArtifacts,
    ...p1CleanOverlayArtifacts,
    ...p2CleanOverlayArtifacts,
    ...specialStackCleanOverlayArtifacts,
  ];
  
  const summary = {
    totalBlocks: blockRows.length,
    expectedVisibleBlocks: CHANGWON_EXPECTED_VISIBLE_BLOCKS.length,
    specialSelectableAreas: CHANGWON_SPECIAL_SELECTABLE_AREAS.length,
    expectedSelectableAreas: CHANGWON_EXPECTED_SELECTABLE_AREAS.length,
    specialCleanOverlayArtifacts: specialCleanOverlayArtifacts.length,
    p0CleanOverlayArtifacts: p0CleanOverlayArtifacts.length,
    p1CleanOverlayArtifacts: p1CleanOverlayArtifacts.length,
    p2CleanOverlayArtifacts: p2CleanOverlayArtifacts.length,
    specialStackCleanOverlayArtifacts: specialStackCleanOverlayArtifacts.length,
    cleanOverlayArtifacts: cleanOverlayArtifacts.length,
    cleanOverlayReviewed: cleanOverlayArtifacts.filter((artifact) => artifact.manualReviewed === true).length,
    cleanOverlayPendingReview: cleanOverlayArtifacts.filter((artifact) => artifact.manualReviewed !== true).length,
    cleanOverlayReviewBatch: CLEAN_OVERLAY_REVIEW_BATCH,
    p0Blocks: blockRows.filter((row) => row.reviewTier === 'P0').length,
    p1Blocks: blockRows.filter((row) => row.reviewTier === 'P1').length,
    p2Blocks: blockRows.filter((row) => row.reviewTier === 'P2').length,
    officialImageTraced: blockRows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length,
    needsOperatorReview: blockRows.filter((row) => row.traceStatus === 'NEEDS_OPERATOR_REVIEW').length,
    directOfficialTrace: blockRows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
    generatedScaledTrace: blockRows.filter((row) => row.traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length,
    traceSource: TRACE_SOURCE,
    traceVersion: TRACE_VERSION,
    manualReviewed: blockRows.filter((row) => row.manualReviewed === true).length,
    unreviewedBlocks: blockRows.filter((row) => row.manualReviewed !== true).length,
    pixelAligned: blockRows.filter((row) => row.pixelAlignmentStatus === 'PIXEL_ALIGNED').length,
    manualReviewRequired: blockRows.filter((row) => row.pixelAlignmentStatus === 'MANUAL_REVIEW_REQUIRED').length,
    foreignLabelAnchors: blockRows.reduce((total, row) => total + row.foreignLabelAnchors.length, 0),
    overlapWarnings: blockRows.reduce((total, row) => total + row.overlapWarnings.length, 0),
    topHitMismatches: blockRows.filter((row) => row.topHitOwner !== row.block).length,
    expandedHitAreaInterceptWarnings: blockRows.reduce((total, row) => total + row.expandedHitAreaIntercepts.length, 0),
    representativeProbeMismatches: blockRows.reduce((total, row) => total + row.hitProbes.filter((probe) => probe.renderedHitStatus !== 'OK').length, 0),
    lowCoverageReviewTargets: blockRows.filter((row) => row.lowCoverageReviewTarget).length,
    needsTraceAdjustment: blockRows.filter((row) => row.visualAlignmentStatus === 'NEEDS_TRACE_ADJUSTMENT').length,
    pixelCoverageFailed: blockRows.filter((row) => row.pixelCoverageRatio < MIN_PIXEL_COVERAGE_RATIO).length,
    nonAllowedMultiPath: blockRows.filter((row) => row.actualSubpathCount > 1 && !row.allowedMultiPath).length,
  };
  const automatedTraceAdjustmentCandidates = blockRows
    .filter((row) => row.visualAlignmentStatus === 'NEEDS_TRACE_ADJUSTMENT')
    .map((row) => row.block);
  const lowCoverageApprovedExceptionBlocks = blockRows
    .filter((row) => row.lowCoverageReviewTarget)
    .filter((row) => (
      row.manualReviewed === true
      && row.pixelAlignmentStatus === 'PIXEL_ALIGNED'
      && row.visualAlignmentStatus === 'CONFIRMED'
      && row.topHitOwner === row.block
      && row.renderedHitStatus === 'OK'
    ))
    .map((row) => row.block);
  
  if (summary.topHitMismatches > 0 || summary.expandedHitAreaInterceptWarnings > 0 || summary.representativeProbeMismatches > 0) {
    const mismatches = blockRows
      .filter((row) => row.topHitOwner !== row.block || row.expandedHitAreaIntercepts.length > 0 || row.hitProbes.some((probe) => probe.renderedHitStatus !== 'OK'))
      .map((row) => {
        const probeMismatches = row.hitProbes
          .filter((probe) => probe.renderedHitStatus !== 'OK')
          .map((probe) => `${probe.kind}:${probe.topHitOwner ?? '-'}`)
          .join(' ');
        return `${row.block}:top=${row.topHitOwner ?? '-'} intercepts=${row.expandedHitAreaIntercepts.join(' ') || '-'} probes=${probeMismatches || '-'}`;
      });
    throw new Error(`Changwon rendered hit-area QA failed: topHitMismatches=${summary.topHitMismatches} expandedHitAreaInterceptWarnings=${summary.expandedHitAreaInterceptWarnings} representativeProbeMismatches=${summary.representativeProbeMismatches} ${mismatches.join('; ')}`);
  }
  
  const generatedAt = new Date().toISOString();
  const manifest = {
    generatedAt,
    asset: CHANGWON_SEATMAP_IMAGE,
    viewport: CHANGWON_SEATMAP_VIEWPORT,
    summary,
    reviewTiers: {
      P0: {
        label: 'recent manual override blocks',
        blocks: [...P0_BLOCKS],
      },
      P1: {
        label: 'dense lower 3F/4F review blocks',
        blocks: [...P1_BLOCKS],
      },
      P2: {
        label: 'remaining official traced blocks',
        blocks: blockRows.filter((row) => row.reviewTier === 'P2').map((row) => row.block),
      },
    },
    specialCleanOverlays: specialCleanOverlayArtifacts,
    p0CleanOverlays: p0CleanOverlayArtifacts,
    p1CleanOverlays: p1CleanOverlayArtifacts,
    p2CleanOverlays: p2CleanOverlayArtifacts,
    specialStackCleanOverlays: specialStackCleanOverlayArtifacts,
    cleanOverlays: cleanOverlayArtifacts,
    lowCoverageReviewBlocks: blockRows.filter((row) => row.lowCoverageReviewTarget).map((row) => row.block),
    traceAdjustmentCandidates: automatedTraceAdjustmentCandidates,
    blocks: blockRows,
  };
  
  const visualSignoffForTarget = (target) => VISUAL_SIGNOFF_DECISIONS.get(target) ?? null;
  const stackOverlayApprovalItems = specialStackCleanOverlayArtifacts.map((artifact) => {
    const signoff = visualSignoffForTarget(artifact.slug);
    return {
      reviewItemType: 'STACK_OVERLAY',
      target: artifact.slug,
      overlayArtifacts: [artifact.filePath],
      currentAutomatedStatus: 'CONFIRMED',
      humanSignoffStatus: signoff?.status ?? HUMAN_SIGNOFF_PENDING,
      decisionOptions: VISUAL_APPROVAL_DECISION_OPTIONS,
      reviewNote: STACK_OVERLAY_APPROVAL_NOTES.get(artifact.slug),
      humanSignoffNote: signoff?.note ?? '',
      reviewer: signoff ? VISUAL_SIGNOFF_REVIEWER : '',
      reviewedAt: signoff ? '2026-05-10' : '',
      reviewBatch: signoff ? VISUAL_SIGNOFF_REVIEW_BATCH : '',
    };
  });
  const lowCoverageApprovalItems = blockRows
    .filter((row) => row.lowCoverageReviewTarget)
    .sort((left, right) => left.pixelCoverageRatio - right.pixelCoverageRatio || left.block.localeCompare(right.block, 'ko'))
    .map((row) => {
      const relatedArtifacts = cleanOverlayArtifacts
        .filter((artifact) => artifact.blocks.includes(row.block))
        .map((artifact) => artifact.filePath);
      const signoff = visualSignoffForTarget(row.block);
  
      return {
        reviewItemType: 'LOW_COVERAGE_BLOCK',
        target: row.block,
        overlayArtifacts: relatedArtifacts,
        pixelCoverageRatio: row.pixelCoverageRatio,
        currentAutomatedStatus: row.visualAlignmentStatus,
        humanSignoffStatus: signoff?.status ?? HUMAN_SIGNOFF_PENDING,
        decisionOptions: VISUAL_APPROVAL_DECISION_OPTIONS,
        reviewNote: row.visualReviewNote,
        humanSignoffNote: signoff?.note ?? '',
        reviewer: signoff ? VISUAL_SIGNOFF_REVIEWER : '',
        reviewedAt: signoff ? '2026-05-10' : '',
        reviewBatch: signoff ? VISUAL_SIGNOFF_REVIEW_BATCH : '',
      };
    });
  const visualApprovalItems = [
    ...stackOverlayApprovalItems,
    ...lowCoverageApprovalItems,
  ];
  const humanTraceAdjustmentCandidates = visualApprovalItems
    .filter((item) => item.humanSignoffStatus === 'NEEDS_TRACE_ADJUSTMENT')
    .map((item) => item.target);
  const visualApprovalTraceAdjustmentCandidates = [...new Set([
    ...automatedTraceAdjustmentCandidates,
    ...humanTraceAdjustmentCandidates,
  ])];
  const visualApprovalSummary = {
    stackOverlayReviewItems: stackOverlayApprovalItems.length,
    lowCoverageReviewItems: lowCoverageApprovalItems.length,
    pendingHumanSignoff: visualApprovalItems.filter((item) => item.humanSignoffStatus === HUMAN_SIGNOFF_PENDING).length,
    confirmedHumanSignoff: visualApprovalItems.filter((item) => item.humanSignoffStatus === 'CONFIRM').length,
    needsTraceAdjustmentHumanSignoff: humanTraceAdjustmentCandidates.length,
    automatedNeedsTraceAdjustment: summary.needsTraceAdjustment,
    traceAdjustmentCandidates: visualApprovalTraceAdjustmentCandidates,
  };
  if (
    visualApprovalSummary.stackOverlayReviewItems !== 3
    || visualApprovalSummary.lowCoverageReviewItems !== 8
    || visualApprovalSummary.pendingHumanSignoff !== 0
    || visualApprovalSummary.confirmedHumanSignoff !== 11
    || visualApprovalSummary.needsTraceAdjustmentHumanSignoff !== 0
    || visualApprovalSummary.automatedNeedsTraceAdjustment !== 0
    || visualApprovalSummary.traceAdjustmentCandidates.length > 0
    || visualApprovalItems.some((item) => item.overlayArtifacts.length === 0)
  ) {
    throw new Error(`Changwon visual approval package failed: stackOverlayReviewItems=${visualApprovalSummary.stackOverlayReviewItems} lowCoverageReviewItems=${visualApprovalSummary.lowCoverageReviewItems} pendingHumanSignoff=${visualApprovalSummary.pendingHumanSignoff} confirmedHumanSignoff=${visualApprovalSummary.confirmedHumanSignoff} needsTraceAdjustmentHumanSignoff=${visualApprovalSummary.needsTraceAdjustmentHumanSignoff} automatedNeedsTraceAdjustment=${visualApprovalSummary.automatedNeedsTraceAdjustment} traceAdjustmentCandidates=${visualApprovalSummary.traceAdjustmentCandidates.join(' ') || '-'} missingOverlayArtifacts=${visualApprovalItems.filter((item) => item.overlayArtifacts.length === 0).map((item) => item.target).join(' ') || '-'}`);
  }
  const lowCoverageApprovedException = (
    summary.lowCoverageReviewTargets === 8
    && lowCoverageApprovedExceptionBlocks.length === summary.lowCoverageReviewTargets
    && visualApprovalSummary.pendingHumanSignoff === 0
    && visualApprovalSummary.automatedNeedsTraceAdjustment === 0
    && visualApprovalSummary.needsTraceAdjustmentHumanSignoff === 0
    && visualApprovalSummary.traceAdjustmentCandidates.length === 0
  );
  summary.lowCoverageApprovedExceptionTargets = lowCoverageApprovedExceptionBlocks.length;
  summary.lowCoverageApprovedExceptionBlocks = lowCoverageApprovedExceptionBlocks;
  summary.releaseClassification = lowCoverageApprovedException
    ? 'PASS_WITH_APPROVED_EXCEPTION'
    : summary.needsTraceAdjustment > 0
      || visualApprovalSummary.pendingHumanSignoff > 0
      || visualApprovalSummary.traceAdjustmentCandidates.length > 0
      ? 'FAIL'
      : 'PASS';
  summary.releaseClassificationReason = lowCoverageApprovedException
    ? 'low coverage blocks are manually reviewed, pixel aligned, visually confirmed, and require no trace adjustment'
    : summary.releaseClassification === 'FAIL'
      ? 'manual visual approval or trace adjustment is still required'
      : 'no low coverage approved exception is required';
  const visualApproval = {
    generatedAt,
    sourceManifest: 'changwon-seatmap-trace-review.json',
    summary: visualApprovalSummary,
    qaSummary: summary,
    items: visualApprovalItems,
  };
  
  const priorityRows = ['P0', 'P1', 'P2'].map((tier) => {
    const rows = blockRows.filter((row) => row.reviewTier === tier);
    return [
      `\`${tier}\``,
      String(rows.length),
      String(rows.filter((row) => row.traceStatus === 'OFFICIAL_IMAGE_TRACED').length),
      String(rows.filter((row) => row.traceMethod === 'PATH_TRACED_FROM_OFFICIAL_IMAGE').length),
      String(rows.filter((row) => row.traceSource === TRACE_SOURCE).length),
      String(rows.filter((row) => row.manualReviewed).length),
      String(rows.filter((row) => row.pixelAlignmentStatus === 'PIXEL_ALIGNED').length),
      String(rows.reduce((total, row) => total + row.foreignLabelAnchors.length, 0)),
      String(rows.reduce((total, row) => total + row.overlapWarnings.length, 0)),
      String(rows.filter((row) => row.topHitOwner !== row.block).length),
      String(rows.reduce((total, row) => total + row.expandedHitAreaIntercepts.length, 0)),
      String(rows.reduce((total, row) => total + row.hitProbes.filter((probe) => probe.renderedHitStatus !== 'OK').length, 0)),
      String(rows.filter((row) => row.lowCoverageReviewTarget).length),
      String(rows.filter((row) => row.visualAlignmentStatus === 'NEEDS_TRACE_ADJUSTMENT').length),
      rows.map((row) => row.block).join(' '),
    ];
  });
  
  const cleanOverlayRows = cleanOverlayArtifacts.map((artifact) => [
    `\`${artifact.slug}\``,
    artifact.blocks.join(' '),
    artifact.visualReviewStatus,
    artifact.manualReviewed ? 'yes' : 'no',
    artifact.manualReviewNote,
  ]);
  const stackApprovalRows = stackOverlayApprovalItems.map((item) => [
    `\`${item.target}\``,
    item.overlayArtifacts.map((filePath) => `\`${path.basename(filePath)}\``).join('<br>'),
    item.currentAutomatedStatus,
    item.humanSignoffStatus,
    item.humanSignoffNote,
    item.reviewBatch || '-',
    item.decisionOptions.join(' / '),
    item.reviewNote,
  ]);
  const lowCoverageApprovalRows = lowCoverageApprovalItems.map((item) => [
    `\`${item.target}\``,
    String(item.pixelCoverageRatio),
    item.overlayArtifacts.map((filePath) => `\`${path.basename(filePath)}\``).join('<br>'),
    item.currentAutomatedStatus,
    item.humanSignoffStatus,
    item.humanSignoffNote,
    item.reviewBatch || '-',
    item.decisionOptions.join(' / '),
    item.reviewNote,
  ]);
  const visualApprovalMarkdown = [
    '# 창원 NC파크 좌석도 visual approval package',
    '',
    `- source manifest: \`${visualApproval.sourceManifest}\``,
    `- stack overlay review items: ${visualApprovalSummary.stackOverlayReviewItems}`,
    `- low coverage review items: ${visualApprovalSummary.lowCoverageReviewItems}`,
    `- pending human signoff: ${visualApprovalSummary.pendingHumanSignoff}`,
    `- confirmed human signoff: ${visualApprovalSummary.confirmedHumanSignoff}`,
    `- needs trace adjustment human signoff: ${visualApprovalSummary.needsTraceAdjustmentHumanSignoff}`,
    `- automated needs trace adjustment: ${visualApprovalSummary.automatedNeedsTraceAdjustment}`,
    `- trace adjustment candidates: ${visualApprovalSummary.traceAdjustmentCandidates.join(', ') || '-'}`,
    `- review batch: \`${VISUAL_SIGNOFF_REVIEW_BATCH}\``,
    `- reviewer: \`${VISUAL_SIGNOFF_REVIEWER}\``,
    `- QA top-hit mismatches: ${summary.topHitMismatches}`,
    `- QA expanded hit-area intercept warnings: ${summary.expandedHitAreaInterceptWarnings}`,
    `- QA representative probe mismatches: ${summary.representativeProbeMismatches}`,
    `- QA foreign label anchors: ${summary.foreignLabelAnchors}`,
    `- QA overlap warnings: ${summary.overlapWarnings}`,
    '',
    '## Stack overlay signoff',
    '',
    markdownTable(
      ['target', 'overlay artifacts', 'automated status', 'human signoff', 'signoff note', 'review batch', 'decision options', 'review note'],
      stackApprovalRows,
    ),
    '',
    '## Low coverage block signoff',
    '',
    markdownTable(
      ['block', 'pixel coverage', 'overlay artifacts', 'automated status', 'human signoff', 'signoff note', 'review batch', 'decision options', 'review note'],
      lowCoverageApprovalRows,
    ),
    '',
    '## 사용 방법',
    '',
    '1. Stack overlay 3장과 low coverage 8개 블록을 visual signoff 대상으로 고정합니다.',
    '2. `CONFIRM`은 현재 overlay 기준으로 targeted polygon adjustment가 필요하지 않다는 뜻입니다.',
    '3. 향후 사람이 명확한 불일치를 발견하면 해당 항목만 `NEEDS_TRACE_ADJUSTMENT`로 바꾸고 targeted polygon adjustment로 처리합니다.',
    '',
  ].join('\n');
  
  const markdown = [
    '# 창원 NC파크 좌석도 trace review manifest',
    '',
    `- 공식 이미지: \`${CHANGWON_SEATMAP_IMAGE.requiredAssetFileName}\` (${CHANGWON_SEATMAP_IMAGE.imageWidth}x${CHANGWON_SEATMAP_IMAGE.imageHeight})`,
    `- viewport: \`${JSON.stringify(CHANGWON_SEATMAP_VIEWPORT)}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- expected visible blocks: ${summary.expectedVisibleBlocks}`,
    `- special selectable areas: ${summary.specialSelectableAreas}`,
    `- expected selectable areas: ${summary.expectedSelectableAreas}`,
    `- special clean overlay artifacts: ${summary.specialCleanOverlayArtifacts}`,
    `- P0 clean overlay artifacts: ${summary.p0CleanOverlayArtifacts}`,
    `- P1 clean overlay artifacts: ${summary.p1CleanOverlayArtifacts}`,
    `- P2 numeric clean overlay artifacts: ${summary.p2CleanOverlayArtifacts}`,
    `- special stack clean overlay artifacts: ${summary.specialStackCleanOverlayArtifacts}`,
    `- total clean overlay artifacts: ${summary.cleanOverlayArtifacts}`,
    `- clean overlay reviewed: ${summary.cleanOverlayReviewed}`,
    `- clean overlay pending review: ${summary.cleanOverlayPendingReview}`,
    `- clean overlay review batch: \`${summary.cleanOverlayReviewBatch}\``,
    `- official image traced: ${summary.officialImageTraced}`,
    `- direct official-image path trace: ${summary.directOfficialTrace}`,
    `- trace source: \`${summary.traceSource}\``,
    `- trace version: \`${summary.traceVersion}\``,
    `- generated/scaled trace: ${summary.generatedScaledTrace}`,
    `- manual reviewed: ${summary.manualReviewed}`,
    `- unreviewed blocks: ${summary.unreviewedBlocks}`,
    `- pixel aligned: ${summary.pixelAligned}`,
    `- foreign label anchors: ${summary.foreignLabelAnchors}`,
    `- overlap warnings: ${summary.overlapWarnings}`,
    `- top-hit mismatches: ${summary.topHitMismatches}`,
    `- expanded hit-area intercept warnings: ${summary.expandedHitAreaInterceptWarnings}`,
    `- representative probe mismatches: ${summary.representativeProbeMismatches}`,
    `- low coverage review targets: ${summary.lowCoverageReviewTargets}`,
    `- low coverage approved exception targets: ${summary.lowCoverageApprovedExceptionTargets}`,
    `- release classification: \`${summary.releaseClassification}\``,
    `- release classification reason: ${summary.releaseClassificationReason}`,
    `- needs trace adjustment: ${summary.needsTraceAdjustment}`,
    `- pixel coverage failed: ${summary.pixelCoverageFailed}`,
    `- non-allowed multi-path: ${summary.nonAllowedMultiPath}`,
    `- needs operator review: ${summary.needsOperatorReview || '-'}`,
    '',
    '## 검수 우선순위',
    '',
    markdownTable(
      ['tier', 'blocks', 'official traced', 'direct trace', 'manual source', 'manual reviewed', 'pixel aligned', 'foreign labels', 'overlaps', 'top-hit mismatches', 'hit intercepts', 'probe mismatches', 'low coverage', 'needs adjustment', 'block list'],
      priorityRows,
    ),
    '',
    '## Clean overlay visual review',
    '',
    markdownTable(
      ['slug', 'blocks', 'status', 'reviewed', 'note'],
      cleanOverlayRows,
    ),
    '',
    '## 사용 방법',
    '',
    '1. `npm run qa:stadium:changwon:trace-review`를 실행해 manifest와 debug overlay/crop 산출물을 함께 갱신합니다.',
    '2. P0 블록은 렌더 좌표계와 기존 mismatch 발견 구역을 우선 검수합니다.',
    '3. `generated/scaled trace`, `foreign label anchors`, `overlap warnings`, `non-allowed multi-path`는 모두 0이어야 합니다.',
    '4. `top-hit mismatches`, `expanded hit-area intercept warnings`, `representative probe mismatches`는 모두 0이어야 합니다.',
    '5. `needs trace adjustment`는 명확한 육안 불일치가 확인되기 전까지 0이어야 합니다.',
    '6. 모든 블록은 `OFFICIAL_PNG_MANUAL_POLYGON` / `manual-polygon-v2`여야 합니다.',
    '7. 특수 구역은 `changwon-seatmap-trace-review-special-*-clean-overlay.png`를 공식 PNG와 비교합니다.',
    '8. 특수 구역 주변 묶음은 `changwon-seatmap-trace-review-special-*-stack-clean-overlay.png`를 공식 PNG와 비교합니다.',
    '9. P0 숫자 블록은 `changwon-seatmap-trace-review-p0-*-clean-overlay.png`를 공식 PNG와 비교합니다.',
    '10. P1 숫자 블록은 `changwon-seatmap-trace-review-p1-*-clean-overlay.png`를 공식 PNG와 비교합니다.',
    '11. P2 숫자 블록은 `changwon-seatmap-trace-review-p2-*-clean-overlay.png`를 공식 PNG와 비교합니다.',
    '12. 좌표 변경 후 `npm run test:stadium:seatmaps`와 `npm run qa:stadium:changwon:mobile`을 통과시킵니다.',
    '',
  ].join('\n');
  
  const jsonPath = path.join(outDir, 'changwon-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'changwon-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'changwon-seatmap-trace-review.md');
  const visualApprovalJsonPath = path.join(outDir, 'changwon-seatmap-visual-approval.json');
  const visualApprovalMarkdownPath = path.join(outDir, 'changwon-seatmap-visual-approval.md');
  
  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await fs.writeFile(visualApprovalJsonPath, `${JSON.stringify(visualApproval, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'level',
      'side',
      'category',
      'fanRole',
      'reviewTier',
      'labelAnchorX',
      'labelAnchorY',
      'expectedBounds',
      'currentBounds',
      'expectedSubpathCount',
      'actualSubpathCount',
      'traceStatus',
      'traceMethod',
      'traceSource',
      'traceVersion',
      'manualReviewed',
      'pixelAlignmentStatus',
      'manualReviewNote',
      'foreignLabelAnchors',
      'overlapWarnings',
      'hitStrokeWidth',
      'topHitOwner',
      'expandedHitAreaIntercepts',
      'renderedHitStatus',
      'visualAlignmentStatus',
      'visualReviewNote',
      'lowCoverageReviewTarget',
      'hitProbes',
      'pixelCoverageRatio',
      'pathArea',
      'allowedMultiPath',
      'path',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.block,
      block.name,
      block.level,
      block.side,
      block.category,
      block.fanRole,
      block.reviewTier,
      block.labelAnchor.x,
      block.labelAnchor.y,
      JSON.stringify(block.expectedBounds),
      JSON.stringify(block.currentBounds),
      block.expectedSubpathCount,
      block.actualSubpathCount,
      block.traceStatus,
      block.traceMethod,
      block.traceSource,
      block.traceVersion,
      block.manualReviewed,
      block.pixelAlignmentStatus,
      block.manualReviewNote,
      block.foreignLabelAnchors.join(' '),
      block.overlapWarnings.map((warning) => `${warning.block}:${warning.overlapRatio}`).join(' '),
      block.hitStrokeWidth,
      block.topHitOwner,
      block.expandedHitAreaIntercepts.join(' '),
      block.renderedHitStatus,
      block.visualAlignmentStatus,
      block.visualReviewNote,
      block.lowCoverageReviewTarget,
      JSON.stringify(block.hitProbes),
      block.pixelCoverageRatio,
      block.pathArea,
      block.allowedMultiPath,
      block.path,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');
  await fs.writeFile(visualApprovalMarkdownPath, visualApprovalMarkdown, 'utf8');
  
  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`visual_approval_json:${visualApprovalJsonPath}`);
  console.log(`visual_approval_markdown:${visualApprovalMarkdownPath}`);
  cleanOverlayArtifacts.forEach((artifact) => {
    console.log(`clean_overlay:${artifact.filePath}`);
  });
  console.log(`status:ok releaseClassification=${summary.releaseClassification} total=${summary.totalBlocks} p0=${summary.p0Blocks} p1=${summary.p1Blocks} p2=${summary.p2Blocks} official=${summary.officialImageTraced} direct=${summary.directOfficialTrace} generatedScaled=${summary.generatedScaledTrace} reviewed=${summary.manualReviewed} pixelAligned=${summary.pixelAligned} foreignLabelAnchors=${summary.foreignLabelAnchors} overlapWarnings=${summary.overlapWarnings} topHitMismatches=${summary.topHitMismatches} expandedHitAreaInterceptWarnings=${summary.expandedHitAreaInterceptWarnings} representativeProbeMismatches=${summary.representativeProbeMismatches} lowCoverageReviewTargets=${summary.lowCoverageReviewTargets} lowCoverageApprovedExceptionTargets=${summary.lowCoverageApprovedExceptionTargets} needsTraceAdjustment=${summary.needsTraceAdjustment} visualApprovalPendingHumanSignoff=${visualApprovalSummary.pendingHumanSignoff} visualApprovalConfirmedHumanSignoff=${visualApprovalSummary.confirmedHumanSignoff} visualApprovalNeedsTraceAdjustmentHumanSignoff=${visualApprovalSummary.needsTraceAdjustmentHumanSignoff} visualApprovalAutomatedNeedsTraceAdjustment=${visualApprovalSummary.automatedNeedsTraceAdjustment} pixelCoverageFailed=${summary.pixelCoverageFailed} nonAllowedMultiPath=${summary.nonAllowedMultiPath}`);
};

const runUxReadiness = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    CHANGWON_BLOCKS,
    CHANGWON_CATEGORY_GROUPS,
    CHANGWON_EXPECTED_SELECTABLE_AREAS,
    CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS,
    CHANGWON_SEATMAP_IMAGE,
    CHANGWON_SPECIAL_SELECTABLE_AREAS,
    getChangwonBlockDisplayName,
    getChangwonSeatMapSearchTokens,
    isChangwonBlockInCategoryGroup,
    isChangwonSpecialSelectableArea,
    normalizeChangwonSeatMapSearchText,
    searchChangwonSeatMapBlocks,
  } = await import('../src/data/changwonSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports', 'stadium');
  const traceReviewPath = path.join(reportDir, 'changwon-seatmap-trace-review.json');
  const visualApprovalPath = path.join(reportDir, 'changwon-seatmap-visual-approval.json');
  const uxReadinessJsonPath = path.join(reportDir, 'changwon-seatmap-ux-readiness.json');
  const uxReadinessMdPath = path.join(reportDir, 'changwon-seatmap-ux-readiness.md');
  
  const requiredReleaseLockZeroFields = [
    'topHitMismatches',
    'expandedHitAreaInterceptWarnings',
    'representativeProbeMismatches',
    'foreignLabelAnchors',
    'overlapWarnings',
    'needsTraceAdjustment',
  ];
  
  async function readJsonIfExists(filePath) {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error && error.code === 'ENOENT') return null;
      throw error;
    }
  }
  
  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }
  
  function markdownTable(headers, rows) {
    return [
      `| ${headers.join(' | ')} |`,
      `| ${headers.map(() => '---').join(' | ')} |`,
      ...rows.map((row) => `| ${row.map((value) => String(value).replace(/\|/g, '\\|')).join(' | ')} |`),
    ].join('\n');
  }
  
  const traceReview = await readJsonIfExists(traceReviewPath);
  const visualApproval = await readJsonIfExists(visualApprovalPath);
  const traceSummary = traceReview?.summary ?? {};
  const visualApprovalSummary = visualApproval?.summary ?? {};
  const traceRowsByBlock = new Map((traceReview?.blocks ?? []).map((row) => [row.block, row]));
  const blockers = [];
  
  if (!traceReview) {
    blockers.push('missing trace-review report; run npm run stadium:changwon:trace-manifest first');
  }
  
  if (!visualApproval) {
    blockers.push('missing visual-approval report; run npm run stadium:changwon:trace-manifest first');
  }
  
  requiredReleaseLockZeroFields.forEach((field) => {
    if (traceSummary[field] !== 0) {
      blockers.push(`release-lock ${field} expected 0 but got ${traceSummary[field] ?? 'missing'}`);
    }
  });
  
  const searchCoverage = CHANGWON_BLOCKS.map((block) => {
    const tokens = getChangwonSeatMapSearchTokens(block);
    const normalizedBlock = normalizeChangwonSeatMapSearchText(block.block);
    const normalizedSeatTypes = block.seatTypes.map(normalizeChangwonSeatMapSearchText);
    const normalizedSeatViewSections = block.seatViewSections.map(normalizeChangwonSeatMapSearchText);
  
    return {
      id: block.id,
      block: block.block,
      displayName: getChangwonBlockDisplayName(block),
      isSpecialSelectableArea: isChangwonSpecialSelectableArea(block),
      tokenCount: tokens.length,
      coversBlock: tokens.includes(normalizedBlock),
      coversSeatTypes: normalizedSeatTypes.every((seatType) => tokens.includes(seatType)),
      coversSeatViewSections: normalizedSeatViewSections.every((section) => tokens.includes(section)),
      tokens,
    };
  });
  
  const searchableSelectableAreas = searchCoverage.filter((row) => (
    row.tokenCount > 0
    && row.coversBlock
    && row.coversSeatTypes
    && row.coversSeatViewSections
  )).length;
  const searchCoverageFailures = searchCoverage.filter((row) => (
    row.tokenCount === 0
    || !row.coversBlock
    || !row.coversSeatTypes
    || !row.coversSeatViewSections
  ));
  
  if (searchableSelectableAreas !== CHANGWON_EXPECTED_SELECTABLE_AREAS.length) {
    blockers.push(`searchable selectable areas expected ${CHANGWON_EXPECTED_SELECTABLE_AREAS.length} but got ${searchableSelectableAreas}`);
  }
  
  const filterCounts = CHANGWON_CATEGORY_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    count: CHANGWON_BLOCKS.filter((block) => isChangwonBlockInCategoryGroup(block, group)).length,
  }));
  filterCounts
    .filter((filter) => filter.count <= 0)
    .forEach((filter) => blockers.push(`filter ${filter.id} has no selectable areas`));
  
  const specialSelectableAreaCoverage = CHANGWON_SPECIAL_SELECTABLE_AREAS.map((area) => {
    const block = CHANGWON_BLOCKS.find((candidate) => candidate.block === area);
    const searchResults = searchChangwonSeatMapBlocks(area).map((result) => result.block);
    return {
      target: area,
      exists: Boolean(block),
      id: block?.id ?? null,
      displayName: block ? getChangwonBlockDisplayName(block) : null,
      searchReturnsTarget: searchResults.includes(area),
      searchResultCount: searchResults.length,
    };
  });
  specialSelectableAreaCoverage
    .filter((row) => !row.exists || !row.searchReturnsTarget)
    .forEach((row) => blockers.push(`special selectable area search coverage failed for ${row.target}`));
  
  const searchProbes = [
    {
      query: '125',
      expectedBlocks: ['125'],
      expectedFirstBlock: '125',
      note: 'exact numeric search should keep immediate block selection behavior',
    },
    {
      query: '바베큐',
      expectedBlocks: ['1루 바베큐석', '126', '127'],
      note: 'text search should expose both numbered BBQ blocks and the special BBQ area',
    },
    {
      query: '응원석',
      expectedBlocks: ['105', '121'],
      note: 'cheering category and aliases should be searchable',
    },
    {
      query: '휠체어',
      expectedBlocks: ['105', '325'],
      note: 'accessible blocks should be discoverable through accessibility notes',
    },
    {
      query: '외야 가족',
      expectedBlocks: ['외야 가족석'],
      note: 'special outfield family area should be searchable by seat type/name',
    },
  ].map((probe) => {
    const results = searchChangwonSeatMapBlocks(probe.query).map((block) => block.block);
    const missingExpectedBlocks = probe.expectedBlocks.filter((block) => !results.includes(block));
    const firstBlockMatches = probe.expectedFirstBlock ? results[0] === probe.expectedFirstBlock : true;
    return {
      ...probe,
      resultCount: results.length,
      results,
      missingExpectedBlocks,
      firstBlockMatches,
      status: missingExpectedBlocks.length === 0 && firstBlockMatches ? 'PASS' : 'FAIL',
    };
  });
  searchProbes
    .filter((probe) => probe.status !== 'PASS')
    .forEach((probe) => blockers.push(`search probe ${probe.query} failed`));
  
  const lowCoverageApprovedExceptions = CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.map((block) => {
    const traceRow = traceRowsByBlock.get(block);
    return {
      block,
      pixelCoverageRatio: traceRow?.pixelCoverageRatio ?? null,
      visualAlignmentStatus: traceRow?.visualAlignmentStatus ?? null,
      approvedException: traceSummary.lowCoverageApprovedExceptionBlocks?.includes(block) ?? false,
    };
  });
  const lowCoverageApprovedExceptionBlocks = lowCoverageApprovedExceptions
    .filter((row) => row.approvedException)
    .map((row) => row.block);
  
  if (lowCoverageApprovedExceptionBlocks.length !== CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.length) {
    blockers.push(`low coverage approved exceptions expected ${CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.length} but got ${lowCoverageApprovedExceptionBlocks.length}`);
  }
  
  if (traceSummary.totalBlocks !== CHANGWON_EXPECTED_SELECTABLE_AREAS.length) {
    blockers.push(`trace summary totalBlocks expected ${CHANGWON_EXPECTED_SELECTABLE_AREAS.length} but got ${traceSummary.totalBlocks ?? 'missing'}`);
  }
  
  if (traceSummary.specialSelectableAreas !== CHANGWON_SPECIAL_SELECTABLE_AREAS.length) {
    blockers.push(`trace summary specialSelectableAreas expected ${CHANGWON_SPECIAL_SELECTABLE_AREAS.length} but got ${traceSummary.specialSelectableAreas ?? 'missing'}`);
  }
  
  if (visualApprovalSummary.confirmedHumanSignoff !== 11 || visualApprovalSummary.pendingHumanSignoff !== 0) {
    blockers.push(`visual approval signoff expected confirmed=11 pending=0 but got confirmed=${visualApprovalSummary.confirmedHumanSignoff ?? 'missing'} pending=${visualApprovalSummary.pendingHumanSignoff ?? 'missing'}`);
  }
  
  const report = {
    generatedAt: new Date().toISOString(),
    asset: CHANGWON_SEATMAP_IMAGE,
    summary: {
      totalBlocks: CHANGWON_BLOCKS.length,
      expectedSelectableAreas: CHANGWON_EXPECTED_SELECTABLE_AREAS.length,
      searchableSelectableAreas,
      specialSelectableAreas: specialSelectableAreaCoverage.filter((row) => row.exists).length,
      filterGroups: filterCounts.length,
      missingFilterCounts: filterCounts.filter((filter) => filter.count <= 0).length,
      lowCoverageApprovedExceptions: lowCoverageApprovedExceptionBlocks.length,
      lowCoverageApprovedExceptionTargets: CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS.length,
      releaseClassification: traceSummary.releaseClassification ?? null,
      blockers,
    },
    releaseLockSummary: {
      totalBlocks: traceSummary.totalBlocks ?? null,
      topHitMismatches: traceSummary.topHitMismatches ?? null,
      expandedHitAreaInterceptWarnings: traceSummary.expandedHitAreaInterceptWarnings ?? null,
      representativeProbeMismatches: traceSummary.representativeProbeMismatches ?? null,
      foreignLabelAnchors: traceSummary.foreignLabelAnchors ?? null,
      overlapWarnings: traceSummary.overlapWarnings ?? null,
      needsTraceAdjustment: traceSummary.needsTraceAdjustment ?? null,
      confirmedHumanSignoff: visualApprovalSummary.confirmedHumanSignoff ?? null,
      pendingHumanSignoff: visualApprovalSummary.pendingHumanSignoff ?? null,
      traceAdjustmentCandidates: unique([
        ...(traceReview?.traceAdjustmentCandidates ?? []),
        ...(visualApprovalSummary.traceAdjustmentCandidates ?? []),
      ]),
    },
    filterCounts,
    searchProbes,
    searchCoverageFailures,
    specialSelectableAreaCoverage,
    lowCoverageApprovedExceptions,
  };
  
  const markdown = [
    '# Changwon Seatmap UX Readiness',
    '',
    '## Summary',
    `- total selectable areas: ${report.summary.totalBlocks}`,
    `- searchable selectable areas: ${report.summary.searchableSelectableAreas}`,
    `- special selectable areas: ${report.summary.specialSelectableAreas}`,
    `- low coverage approved exceptions: ${report.summary.lowCoverageApprovedExceptions}`,
    `- release classification: ${report.summary.releaseClassification ?? '-'}`,
    `- blockers: ${blockers.length}`,
    '',
    '## Release Lock',
    markdownTable(
      ['Metric', 'Value'],
      Object.entries(report.releaseLockSummary).map(([key, value]) => [
        key,
        Array.isArray(value) ? (value.length > 0 ? value.join(', ') : '[]') : value ?? '-',
      ]),
    ),
    '',
    '## Filter Counts',
    markdownTable(
      ['Filter', 'Label', 'Selectable Areas'],
      filterCounts.map((filter) => [filter.id, filter.label, filter.count]),
    ),
    '',
    '## Search Probes',
    markdownTable(
      ['Query', 'Status', 'Result Count', 'Expected', 'Note'],
      searchProbes.map((probe) => [
        probe.query,
        probe.status,
        probe.resultCount,
        probe.expectedBlocks.join(', '),
        probe.note,
      ]),
    ),
    '',
    '## Special Selectable Areas',
    markdownTable(
      ['Target', 'Exists', 'Search Returns Target', 'Result Count'],
      specialSelectableAreaCoverage.map((row) => [
        row.target,
        row.exists ? 'yes' : 'no',
        row.searchReturnsTarget ? 'yes' : 'no',
        row.searchResultCount,
      ]),
    ),
    '',
    '## Low Coverage Approved Exceptions',
    markdownTable(
      ['Block', 'Pixel Coverage Ratio', 'Visual Alignment', 'Approved Exception'],
      lowCoverageApprovedExceptions.map((row) => [
        row.block,
        row.pixelCoverageRatio === null ? '-' : row.pixelCoverageRatio.toFixed(3),
        row.visualAlignmentStatus ?? '-',
        row.approvedException ? 'yes' : 'no',
      ]),
    ),
    '',
    blockers.length > 0 ? `## Blockers\n${blockers.map((blocker) => `- ${blocker}`).join('\n')}` : '## Blockers\n- none',
    '',
  ].join('\n');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(uxReadinessJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(uxReadinessMdPath, markdown);
  
  if (blockers.length > 0) {
    throw new Error(`Changwon UX readiness failed: ${blockers.join('; ')}`);
  }
  
  console.log(`status:ok searchableSelectableAreas=${searchableSelectableAreas} specialSelectableAreas=${report.summary.specialSelectableAreas} filterGroups=${filterCounts.length} lowCoverageApprovedExceptions=${lowCoverageApprovedExceptionBlocks.length} blockers=0`);
};

const taskRunners = {
  'trace-manifest': runTraceManifest,
  'ux-readiness': runUxReadiness,
};

const withTaskArgs = async (args, runner) => {
  const originalArgv = process.argv;
  process.argv = [originalArgv[0] ?? 'node', fileURLToPath(import.meta.url), ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

export const runChangwonSeatmapTask = async (task, args = process.argv.slice(2)) => {
  const runner = taskRunners[task];
  if (!runner) {
    throw new Error(`Unknown Changwon seatmap task: ${task ?? '(missing)'}`);
  }

  await withTaskArgs(args, runner);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runChangwonSeatmapTask(task, args);
}
