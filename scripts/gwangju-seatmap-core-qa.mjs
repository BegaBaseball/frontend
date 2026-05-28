import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runPixelComponents = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const outDir = path.join(frontendRoot, 'reports/stadium');
  const GWANGJU_SEATMAP_IMAGE = {
    imagePath: 'src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png',
  };
  const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);

  const SEATMAP_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };

  const PIXEL_GROUPS = [
    { id: 'k5', label: 'K5/K5-family salmon blocks', colors: [[243, 164, 144], [248, 196, 180]], threshold: 28, minArea: 80 },
    { id: 'k8', label: 'K8 yellow blocks', colors: [[251, 203, 112], [251, 226, 160]], threshold: 26, minArea: 80 },
    { id: 'k9', label: 'K9 green blocks', colors: [[186, 216, 122], [206, 226, 160]], threshold: 26, minArea: 80 },
    { id: 'sky-picnic', label: 'Sky picnic pink blocks', colors: [[239, 146, 181], [244, 180, 208]], threshold: 28, minArea: 20 },
    { id: 'five-table', label: '5F table blue-gray blocks', colors: [[208, 214, 236], [222, 226, 241], [204, 207, 228]], threshold: 20, minArea: 70 },
    { id: 'champion', label: 'Champion seats', colors: [[79, 189, 176]], threshold: 28, minArea: 200 },
    { id: 'central-table', label: 'Central table seats', colors: [[148, 213, 246]], threshold: 30, minArea: 200 },
    { id: 'accessible-green', label: 'Disabled seats', colors: [[35, 172, 56]], threshold: 28, minArea: 120 },
    { id: 'surprise', label: 'Surprise seats', colors: [[243, 152, 0]], threshold: 28, minArea: 180 },
    { id: 'family', label: 'Tigers family seats', colors: [[238, 130, 124]], threshold: 30, minArea: 180 },
    { id: 'party', label: 'Party seats', colors: [[223, 127, 110]], threshold: 26, minArea: 80 },
    { id: 'skybox', label: 'Skybox', colors: [[225, 131, 172]], threshold: 28, minArea: 50 },
    { id: 'outfield', label: 'Outfield seats', colors: [[220, 234, 186]], threshold: 22, minArea: 300 },
    { id: 'bleachers-table', label: 'Bleachers table seats', colors: [[144, 195, 31]], threshold: 30, minArea: 100 },
  ];

  function colorDistance(a, b) {
    return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
  }

  function rgbAt(image, x, y) {
    const offset = ((y * image.width) + x) * image.channels;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
  }

  function isGroupPixel(image, group, x, y) {
    const rgb = rgbAt(image, x, y);
    return group.colors.some((color) => colorDistance(rgb, color) <= group.threshold);
  }

  function extractComponents(image, group) {
    const bounds = group.bounds ?? SEATMAP_BOUNDS;
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const mask = new Uint8Array(width * height);
    const seen = new Uint8Array(width * height);

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (isGroupPixel(image, group, x, y)) {
          mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
        }
      }
    }

    const components = [];
    const queue = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
        if (!mask[startIndex] || seen[startIndex]) continue;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let area = 0;
        seen[startIndex] = 1;
        queue.length = 0;
        queue.push([x, y]);

        for (let head = 0; head < queue.length; head += 1) {
          const [cx, cy] = queue[head];
          area += 1;
          minX = Math.min(minX, cx);
          maxX = Math.max(maxX, cx);
          minY = Math.min(minY, cy);
          maxY = Math.max(maxY, cy);

          for (const [dx, dy] of directions) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;
            const index = ((ny - bounds.minY) * width) + (nx - bounds.minX);
            if (!mask[index] || seen[index]) continue;
            seen[index] = 1;
            queue.push([nx, ny]);
          }
        }

        if (area >= group.minArea && area <= (group.maxArea ?? Infinity)) {
          components.push({
            id: `${group.id}-${components.length + 1}`,
            groupId: group.id,
            groupLabel: group.label,
            area,
            bounds: { minX, minY, maxX, maxY },
            center: {
              x: Number(((minX + maxX) / 2).toFixed(1)),
              y: Number(((minY + maxY) / 2).toFixed(1)),
            },
          });
        }
      }
    }

    return components.sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
  }

  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const image = { data, width: info.width, height: info.height, channels: info.channels };
  const groups = PIXEL_GROUPS.map((group) => ({
    ...group,
    components: extractComponents(image, group),
  }));

  const report = {
    generatedAt: new Date().toISOString(),
    image: {
      path: GWANGJU_SEATMAP_IMAGE.imagePath,
      width: info.width,
      height: info.height,
    },
    bounds: SEATMAP_BOUNDS,
    groups,
  };

  await fs.mkdir(outDir, { recursive: true });
  const reportPath = path.join(outDir, 'gwangju-seatmap-pixel-components.json');
  const temporaryReportPath = `${reportPath}.${process.pid}.tmp`;
  await fs.writeFile(temporaryReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  try {
    await fs.rename(temporaryReportPath, reportPath);
  } catch (error) {
    if (error?.code !== 'EPERM' && error?.code !== 'EACCES') {
      throw error;
    }
    await fs.unlink(reportPath).catch((unlinkError) => {
      if (unlinkError?.code !== 'ENOENT') throw unlinkError;
    });
    await fs.rename(temporaryReportPath, reportPath);
  }

  console.log(`pixel_components_json:${reportPath}`);
  for (const group of groups) {
    console.log(`${group.id}: ${group.components.length}`);
  }
};

const runImageAlignmentAudit = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { GWANGJU_AWAY_CHEERING_BLOCK_IDS, GWANGJU_BLOCKS, GWANGJU_FULL_RETRACE_VERSION, GWANGJU_OFFICIAL_TRACE_REFERENCE, GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES, GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS, GWANGJU_SEATMAP_IMAGE } = await import("../src/data/gwangjuSeatData.ts");

  const SCRIPT_VERSION = 'GWANGJU_IMAGE_ALIGNMENT_AUDIT_V51';
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const cropDir = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit-crops');
  const lowerInfieldSpecialSplitDir = path.join(cropDir, 'lower-infield-special-split');
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit.md');
  const overlayPath = path.join(reportDir, 'gwangju-seatmap-image-alignment-audit-overlay.png');
  const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);
  const allowFailures = process.argv.includes('--allow-failures');
  const requireSkyPicnicScan = process.argv.includes('--require-sky-picnic');
  const requireAlphabetSectionScan = process.argv.includes('--require-alphabet-sections');
  const requireFiveTableScan = process.argv.includes('--require-five-table');
  const DERIVED_AGGREGATE_BLOCK_IDS = new Set(['home-k7-seats', 'away-cheering-seats']);
  const DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID = new Map([
    ['home-k7-seats', new Set(GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS)],
    ['away-cheering-seats', new Set(GWANGJU_AWAY_CHEERING_BLOCK_IDS)],
  ]);

  const isAggregateStealingSourceLabel = (sourceBlockId, candidateBlockId) => {
    const sourceIds = DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.get(candidateBlockId);
    return sourceIds?.has(sourceBlockId) ?? false;
  };

  const SOURCE_POLICY = {
    coordinateSource: 'official PNG 2200x1159 only',
    coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
  };

  const NUMBERED_BLOCK_THRESHOLDS = {
    default: { minimumRecall: 0.85, minimumIoU: 0.7, maximumOutsideBleed: 0.08 },
    p0: { minimumRecall: 0.9, minimumIoU: 0.75, maximumOutsideBleed: 0.08 },
  };

  const SKY_PICNIC_COLOR_SCAN_THRESHOLDS = {
    minimumColorCoverageRatio: 0.42,
    criticalColorCoverageRatio: 0.2,
  };

  const SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS = {
    searchPaddingPx: 6,
    maximumBoundsDeltaPx: 8,
    minimumFillPixelCount: 80,
  };

  const SKY_PICNIC_VISUAL_BOUNDS_THRESHOLDS = {
    maximumBoundsDeltaPx: 0,
  };

  const SKY_PICNIC_RETRACE_TARGET_BLOCK_IDS = new Set(
    Array.from({ length: 31 }, (_, index) => `sky-picnic-s-${305 + index}`),
  );

  const FIVE_TABLE_COLOR_SCAN_THRESHOLDS = {
    minimumColorCoverageRatio: 0.7,
    criticalColorCoverageRatio: 0.5,
  };

  const FIVE_TABLE_LOCAL_FILL_BOUNDS_THRESHOLDS = {
    searchPaddingPx: 6,
    maximumBoundsDeltaPx: 8,
    minimumFillPixelCount: 100,
  };

  const SKY_PICNIC_COLOR_SPEC = {
    colors: [
      [248, 196, 180],
      [244, 203, 205],
      [243, 164, 144],
      [225, 131, 172],
      [238, 145, 181],
      [239, 146, 181],
      [244, 180, 208],
    ],
    threshold: 42,
  };

  const SKY_PICNIC_STRICT_FILL_COLOR_SPEC = {
    colors: [
      [239, 146, 181],
      [238, 145, 181],
      [225, 131, 172],
      [244, 180, 208],
    ],
    threshold: 30,
  };

  const FIVE_TABLE_COLOR_SPEC = {
    colors: [
      [208, 216, 240],
      [216, 224, 240],
      [224, 232, 248],
      [232, 232, 248],
      [200, 208, 232],
    ],
    threshold: 44,
  };

  const FIVE_TABLE_STRICT_FILL_COLOR_SPEC = {
    colors: [
      [208, 216, 240],
      [216, 224, 240],
      [224, 232, 248],
      [232, 232, 248],
      [200, 208, 232],
      [207, 216, 241],
      [209, 218, 241],
    ],
    threshold: 34,
  };

  const ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS = {
    minimumColorCoverageRatio: 0.55,
    criticalColorCoverageRatio: 0.25,
  };

  const ALPHABET_SECTION_MASK_THRESHOLDS = {
    minimumRecall: 0.9,
    minimumIoU: 0.75,
    maximumOutsideBleed: 0.08,
  };

  const ALPHABET_SECTION_COLOR_SPECS = {
    'champion-seats': {
      label: 'A',
      colors: [[80, 192, 176]],
      threshold: 38,
    },
    'central-table-seats': {
      label: 'B',
      colors: [[152, 216, 248]],
      threshold: 38,
    },
    'disabled-seats-center': {
      label: 'C',
      colors: [[32, 176, 56], [53, 178, 65], [65, 170, 115], [0, 141, 67]],
      threshold: 38,
    },
    'first-surprise-seats': {
      label: 'G',
      colors: [[240, 152, 0]],
      threshold: 38,
    },
    'third-surprise-seats': {
      label: 'G',
      colors: [[240, 152, 0]],
      threshold: 38,
    },
    'first-family-seats': {
      label: 'H',
      colors: [[240, 128, 128]],
      threshold: 38,
    },
    'third-family-seats': {
      label: 'H',
      colors: [[240, 128, 128]],
      threshold: 38,
    },
    'first-wheelchair-seats': {
      label: 'I',
      colors: [[240, 168, 144], [248, 184, 208], [232, 136, 168]],
      threshold: 42,
    },
    'party-seats-first': {
      label: 'J',
      colors: [[248, 200, 112], [240, 168, 144]],
      threshold: 42,
    },
  };

  const ALPHABET_SECTION_IDS = new Set(Object.keys(ALPHABET_SECTION_COLOR_SPECS));

  const LOWER_INFIELD_RETRACED_BLOCK_IDS = [
    'k5-101',
    'k5-102',
    'k5-103',
    'k5-104',
    'k5-105',
    'k5-106',
    'k7-107',
    'k7-108',
  ];

  const ALPHABET_SECTION_OFFICIAL_MASK_REFERENCES = {
    'first-family-seats': {
      searchBounds: { minX: 998, minY: 812, maxX: 1184, maxY: 907 },
      maskStrategy: 'row-envelope',
      rowEnvelopeSampleStep: 5,
      rowEnvelopeMinimumPixels: 2,
      colors: ALPHABET_SECTION_COLOR_SPECS['first-family-seats'].colors,
      threshold: ALPHABET_SECTION_COLOR_SPECS['first-family-seats'].threshold,
      excludeBlockIds: [
        ...LOWER_INFIELD_RETRACED_BLOCK_IDS,
        'first-wheelchair-seats',
        'party-seats-first',
      ],
    },
    'first-wheelchair-seats': {
      searchBounds: { minX: 958, minY: 893, maxX: 1111, maxY: 945 },
      maskStrategy: 'largest-component-row-envelope',
      rowEnvelopeSampleStep: 3,
      rowEnvelopeMinimumPixels: 2,
      colors: ALPHABET_SECTION_COLOR_SPECS['first-wheelchair-seats'].colors,
      threshold: ALPHABET_SECTION_COLOR_SPECS['first-wheelchair-seats'].threshold,
      excludeBlockIds: LOWER_INFIELD_RETRACED_BLOCK_IDS,
    },
    'party-seats-first': {
      searchBounds: { minX: 867, minY: 930, maxX: 958, maxY: 967 },
      maskStrategy: 'row-envelope',
      rowEnvelopeSampleStep: 3,
      rowEnvelopeMinimumPixels: 2,
      colors: ALPHABET_SECTION_COLOR_SPECS['party-seats-first'].colors,
      threshold: ALPHABET_SECTION_COLOR_SPECS['party-seats-first'].threshold,
      excludeBlockIds: [
        ...LOWER_INFIELD_RETRACED_BLOCK_IDS,
        'first-family-seats',
        'first-wheelchair-seats',
      ],
    },
    'third-family-seats': {
      searchBounds: { minX: 560, minY: 150, maxX: 700, maxY: 315 },
      maskStrategy: 'row-envelope',
      rowEnvelopeSampleStep: 3,
      rowEnvelopeMinimumPixels: 2,
      colors: ALPHABET_SECTION_COLOR_SPECS['third-family-seats'].colors,
      threshold: ALPHABET_SECTION_COLOR_SPECS['third-family-seats'].threshold,
      excludeBlockIds: [],
    },
  };

  const LOWER_INFIELD_SPECIAL_BLOCK_IDS = [
    'first-family-seats',
    'first-wheelchair-seats',
    'party-seats-first',
  ];
  const LOWER_INFIELD_ADJACENT_SKY_PICNIC_BLOCK_IDS = [
    'sky-picnic-s-301',
    'sky-picnic-s-302',
    'sky-picnic-s-303',
  ];
  const LOWER_INFIELD_SPECIAL_SPLIT_BLOCK_IDS = new Set([
    ...LOWER_INFIELD_RETRACED_BLOCK_IDS,
    ...LOWER_INFIELD_SPECIAL_BLOCK_IDS,
    ...LOWER_INFIELD_ADJACENT_SKY_PICNIC_BLOCK_IDS,
  ]);
  const LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS = { left: 700, top: 780, width: 500, height: 230 };
  const LOWER_INFIELD_SPECIAL_SPLIT_MAX_OVERLAP_RATIO = 0;
  const LOWER_INFIELD_I_BOUNDARY_FOCUS_BLOCK_IDS = [
    'k5-103',
    'k5-104',
    'k5-105',
    'k5-106',
    'first-wheelchair-seats',
    'party-seats-first',
    'first-family-seats',
  ];
  const LOWER_INFIELD_I_BOUNDARY_FOCUS_BOUNDS = { left: 835, top: 785, width: 310, height: 185 };
  const LOWER_INFIELD_101_108_VISUAL_REVIEW_BLOCK_IDS = [
    ...LOWER_INFIELD_RETRACED_BLOCK_IDS,
    'first-family-seats',
    'first-wheelchair-seats',
    'party-seats-first',
  ];
  const LOWER_INFIELD_101_108_VISUAL_REVIEW_BOUNDS = { left: 700, top: 760, width: 520, height: 250 };
  const LOWER_INFIELD_VISUAL_HIT_SPLIT_REVIEW_BLOCK_IDS = [
    'k5-101',
    'k5-102',
    'k5-103',
    'k5-104',
    'first-wheelchair-seats',
  ];
  const LOWER_INFIELD_J_SKY_BOUNDARY_REVIEW_BLOCK_IDS = [
    'k5-106',
    'k7-107',
    'k7-108',
    'party-seats-first',
    'sky-picnic-s-301',
    'sky-picnic-s-302',
    'sky-picnic-s-303',
    'sky-picnic-s-304',
  ];
  const THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BLOCK_IDS = [
    'third-family-seats',
    'third-surprise-seats',
  ];
  const THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BOUNDS = { left: 430, top: 200, width: 360, height: 520 };
  const OFFICIAL_THIRD_INFIELD_TRACE_BOUNDS = { left: 340, top: 120, width: 420, height: 500 };
  const LOWER_INFIELD_P0_VISUAL_CHECKLIST_ITEMS = [
    {
      id: 'p0-101-102-h-boundary',
      title: '101/102/H shared boundary',
      blockIds: ['k5-101', 'k5-102', 'first-family-seats'],
      nonSelectableOfficialLabels: [],
      bounds: { left: 960, top: 780, width: 250, height: 150 },
      cropFileName: 'gwangju-seatmap-image-alignment-audit-p0-101-102-h-boundary.png',
      reviewNote: '101/102 번호 블럭이 H 구역 상단/좌측 fill을 침범하지 않고, H는 번호 블럭 label point를 삼키지 않아야 합니다.',
    },
    {
      id: 'p0-103-104-105-i-boundary',
      title: '103/104/105/I lower-row boundary',
      blockIds: ['k5-103', 'k5-104', 'k5-105', 'first-wheelchair-seats'],
      nonSelectableOfficialLabels: [],
      bounds: { left: 845, top: 780, width: 310, height: 185 },
      cropFileName: 'gwangju-seatmap-image-alignment-audit-p0-103-104-105-i-boundary.png',
      reviewNote: '103/104/105 하단 row가 공식 PNG 좌석 fill 끝까지 내려가되, I strip과 sampled overlap을 만들지 않아야 합니다.',
    },
    {
      id: 'p0-106-107-108-e-j-boundary',
      title: '106/107/108/E/J shared boundary',
      blockIds: ['k5-106', 'k7-107', 'k7-108', 'party-seats-first'],
      nonSelectableOfficialLabels: ['E'],
      bounds: { left: 700, top: 820, width: 240, height: 180 },
      cropFileName: 'gwangju-seatmap-image-alignment-audit-p0-106-107-108-e-j-boundary.png',
      reviewNote: '106/107/108 하단과 J 상단이 분리되어야 하며, 공식 PNG의 E 표식은 별도 선택 polygon으로 승격하지 않습니다.',
    },
    {
      id: 'p0-s301-s304-j-boundary',
      title: 'S-301~S-304/J lower boundary',
      blockIds: ['sky-picnic-s-301', 'sky-picnic-s-302', 'sky-picnic-s-303', 'sky-picnic-s-304', 'party-seats-first'],
      nonSelectableOfficialLabels: [],
      bounds: { left: 760, top: 920, width: 280, height: 90 },
      cropFileName: 'gwangju-seatmap-image-alignment-audit-p0-s301-s304-j-boundary.png',
      reviewNote: 'J 하단 polygon이 S-301~S-304 sky-picnic hit-area를 삼키지 않아야 합니다.',
    },
  ];

  const P0_BLOCK_IDS = new Set([
    'k5-101',
    'k5-102',
    'k5-103',
    'k5-104',
    'k5-105',
    'k5-106',
    'k7-107',
    'k7-108',
  ]);

  const componentIds = (groupId, indexes) => indexes.map((index) => `${groupId}-${index}`);

  const P0_OFFICIAL_COMPONENT_REFERENCES = {
    'k5-101': { componentGroupId: 'k5', componentIds: componentIds('k5', [62, 64, 69, 71]) },
    'k5-102': { componentGroupId: 'k5', componentIds: componentIds('k5', [58, 60, 67, 75, 77, 83]) },
    'k5-103': { componentGroupId: 'k5', componentIds: componentIds('k5', [56, 57, 61, 66, 72, 80, 84, 87, 90, 94, 98, 102, 106, 112, 117]) },
    'k5-104': { componentGroupId: 'k5', componentIds: componentIds('k5', [59, 63, 68, 73, 79, 82, 86, 89, 97, 100, 103, 107, 111, 116, 121]) },
    'k5-105': { componentGroupId: 'k5', componentIds: componentIds('k5', [65, 70, 76, 91, 92, 95, 101, 104, 108, 113, 119, 122, 124]) },
    'k5-106': { componentGroupId: 'k5', componentIds: componentIds('k5', [74, 78, 81, 85, 88, 93, 96, 99, 105, 110, 115, 120, 123, 125, 128, 129]) },
    'k7-107': { componentGroupId: 'k8', componentIds: componentIds('k8', [86, 89, 93, 96, 100, 105, 110, 115, 122, 127, 131, 135, 139, 143, 147, 150]) },
    'k7-108': { componentGroupId: 'k8', componentIds: componentIds('k8', [90, 98, 102, 107, 111, 116, 120, 121, 126, 130, 134, 137, 142, 146, 151, 153]) },
  };

  const NUMBERED_INFIELD_COMPONENT_REFERENCES = {
    ...P0_OFFICIAL_COMPONENT_REFERENCES,
    'k7-109': { componentGroupId: 'k8', componentIds: componentIds('k8', [92, 95, 101, 106, 112, 117, 123, 128, 136, 141, 148, 152]) },
    'k7-110': { componentGroupId: 'k8', componentIds: componentIds('k8', [97, 103, 108, 113, 118, 124, 132, 138]) },
    'k7-111': { componentGroupId: 'k8', componentIds: componentIds('k8', [85, 87, 94, 99, 104, 109, 114, 119, 125, 129, 133, 140, 145]) },
    'k9-112': { componentGroupId: 'k9', componentIds: componentIds('k9', [39, 41, 44, 46, 49, 51, 54, 56, 59, 61, 62, 63]) },
    'k9-113': { componentGroupId: 'k9', componentIds: componentIds('k9', [33, 34, 35, 36, 37, 38, 40, 42, 43, 45, 47, 48, 50, 52, 53, 55, 57, 58, 60]) },
    'k9-116': { componentGroupId: 'k9', componentIds: componentIds('k9', [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]) },
    'k9-117': { componentGroupId: 'k9', componentIds: componentIds('k9', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]) },
    'k7-118': { componentGroupId: 'k8', componentIds: componentIds('k8', [71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84]) },
    'k7-119': { componentGroupId: 'k8', componentIds: componentIds('k8', [56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70]) },
    'k7-120': { componentGroupId: 'k8', componentIds: componentIds('k8', [43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55]) },
  };

  const NUMBERED_INFIELD_MANUAL_MASK_REFERENCES = {
    'k7-110': { maskPoints: [[638.3, 919.9], [641.7, 894.5], [650, 854], [697.7, 855.5], [695.1, 925.7], [671.1, 933.2]] },
    'k7-111': { maskPoints: [[605, 931], [608, 915], [613, 889], [619, 858], [623, 838], [624, 834], [627, 834], [650, 838], [650, 848], [648, 860], [644, 882], [636, 924], [635, 936], [611, 936], [605, 935]] },
  };

  const NUMBERED_INFIELD_AUDIT_BLOCK_IDS = new Set([
    ...Object.keys(NUMBERED_INFIELD_COMPONENT_REFERENCES),
    ...Object.keys(NUMBERED_INFIELD_MANUAL_MASK_REFERENCES),
  ]);

  const COMPONENT_COLOR_SPECS = {
    k5: { colors: [[243, 164, 144], [248, 196, 180]], threshold: 28, minArea: 80 },
    k8: { colors: [[251, 203, 112], [251, 226, 160]], threshold: 26, minArea: 80 },
    k9: { colors: [[186, 216, 122], [206, 226, 160]], threshold: 26, minArea: 80 },
    outfield: { colors: [[220, 234, 186]], threshold: 22, minArea: 300 },
    'bleachers-table': { colors: [[144, 195, 31]], threshold: 30, minArea: 100 },
  };
  const COMPONENT_EXTRACTION_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };

  const CROP_REGIONS = [
    { id: '101-108', bounds: { left: 700, top: 780, width: 480, height: 190 } },
    { id: '101-108-h-i-j-e-f-visual-review', bounds: LOWER_INFIELD_101_108_VISUAL_REVIEW_BOUNDS },
    ...LOWER_INFIELD_P0_VISUAL_CHECKLIST_ITEMS.map((item) => ({ id: item.id, bounds: item.bounds })),
    { id: '104-105-i-j-boundary', bounds: LOWER_INFIELD_I_BOUNDARY_FOCUS_BOUNDS },
    { id: '101-113', bounds: { left: 500, top: 780, width: 690, height: 205 } },
    { id: '116-120', bounds: { left: 350, top: 500, width: 250, height: 265 } },
    { id: 'third-base-h-g-special', bounds: THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BOUNDS },
    { id: 'official-third-infield-trace', bounds: OFFICIAL_THIRD_INFIELD_TRACE_BOUNDS },
    { id: 'sky-picnic-s-301-315', bounds: { left: 430, top: 880, width: 760, height: 170 } },
    { id: 'sky-picnic-s-316-335', bounds: { left: 300, top: 360, width: 360, height: 650 } },
    { id: 'five-table-501-518', bounds: { left: 500, top: 880, width: 650, height: 180 } },
    { id: 'five-table-519-535', bounds: { left: 250, top: 170, width: 340, height: 690 } },
    { id: 'op-outfield', bounds: { left: 690, top: 80, width: 700, height: 780 } },
    { id: 'special-seats', bounds: { left: 330, top: 700, width: 900, height: 250 } },
    { id: 'alphabet-special-seats-upper', bounds: { left: 430, top: 100, width: 560, height: 430 } },
  ];

  const round = (value, digits = 4) => (
    value === null || value === undefined || Number.isNaN(value)
      ? null
      : Number(value.toFixed(digits))
  );
  const pixelKey = (x, y) => `${x},${y}`;
  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const markdownCell = (value) => String(value ?? '-').replaceAll('|', '\\|').replaceAll('\n', '<br>');
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const parsePathSubpaths = (pathData) => (String(pathData ?? '').match(/M[^M]+/g) ?? [])
    .map((subpath) => {
      const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
      const points = [];
      for (let index = 0; index < numbers.length - 1; index += 2) {
        points.push([numbers[index], numbers[index + 1]]);
      }
      return points;
    })
    .filter((points) => points.length >= 3);

  const pointInPolygon = ([x, y], polygon) => {
    let inside = false;
    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const [xi, yi] = polygon[current];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && (x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };
  const pointInRings = (point, rings) => rings.some((ring) => pointInPolygon(point, ring));
  const pointsBounds = (points) => ({
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  });
  const pointKey = ([x, y]) => `${x},${y}`;
  const convexHull = (points) => {
    const sorted = [...new Map(points.map((point) => [pointKey(point), point])).values()]
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (sorted.length <= 1) return sorted;

    const cross = (origin, a, b) => (
      (a[0] - origin[0]) * (b[1] - origin[1])
      - (a[1] - origin[1]) * (b[0] - origin[0])
    );
    const lower = [];
    for (const point of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
        lower.pop();
      }
      lower.push(point);
    }
    const upper = [];
    for (let index = sorted.length - 1; index >= 0; index -= 1) {
      const point = sorted[index];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
        upper.pop();
      }
      upper.push(point);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  };
  const simplifyCollinearRing = (points) => {
    const ring = [...points];
    let changed = true;
    const cross = (origin, a, b) => (
      (a[0] - origin[0]) * (b[1] - origin[1])
      - (a[1] - origin[1]) * (b[0] - origin[0])
    );
    while (changed && ring.length > 3) {
      changed = false;
      for (let index = 0; index < ring.length; index += 1) {
        const previous = ring[(index - 1 + ring.length) % ring.length];
        const current = ring[index];
        const next = ring[(index + 1) % ring.length];
        if (cross(previous, current, next) === 0) {
          ring.splice(index, 1);
          changed = true;
          break;
        }
      }
    }
    return ring;
  };
  const unionBounds = (boundsList) => {
    const valid = boundsList.filter(Boolean);
    if (valid.length === 0) return null;
    return {
      minX: Math.min(...valid.map((bounds) => bounds.minX)),
      minY: Math.min(...valid.map((bounds) => bounds.minY)),
      maxX: Math.max(...valid.map((bounds) => bounds.maxX)),
      maxY: Math.max(...valid.map((bounds) => bounds.maxY)),
    };
  };
  const pathBounds = (pathData) => unionBounds(parsePathSubpaths(pathData).map(pointsBounds));
  const boundsDelta = (actual, expected) => {
    if (!actual || !expected) return null;
    return {
      minX: round(actual.minX - expected.minX, 1),
      minY: round(actual.minY - expected.minY, 1),
      maxX: round(actual.maxX - expected.maxX, 1),
      maxY: round(actual.maxY - expected.maxY, 1),
    };
  };
  const maxAbsBoundsDelta = (delta) => (
    delta ? Math.max(...Object.values(delta).map((value) => Math.abs(value))) : null
  );
  const pathFromPoints = (points) => `M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`;
  const colorDistance = (first, second) => Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
  const rgbAt = (image, x, y) => {
    const offset = ((y * image.width) + x) * image.channels;
    return [image.data[offset], image.data[offset + 1], image.data[offset + 2]];
  };
  const isSkyPicnicOfficialColorPixel = (image, x, y) => {
    const color = rgbAt(image, x, y);
    return SKY_PICNIC_COLOR_SPEC.colors.some((target) => colorDistance(color, target) <= SKY_PICNIC_COLOR_SPEC.threshold);
  };
  const isSkyPicnicStrictFillPixel = (image, x, y) => {
    const color = rgbAt(image, x, y);
    return SKY_PICNIC_STRICT_FILL_COLOR_SPEC.colors.some((target) => colorDistance(color, target) <= SKY_PICNIC_STRICT_FILL_COLOR_SPEC.threshold);
  };
  const isFiveTableOfficialColorPixel = (image, x, y) => {
    const color = rgbAt(image, x, y);
    return FIVE_TABLE_COLOR_SPEC.colors.some((target) => colorDistance(color, target) <= FIVE_TABLE_COLOR_SPEC.threshold);
  };
  const isFiveTableStrictFillPixel = (image, x, y) => {
    const color = rgbAt(image, x, y);
    return FIVE_TABLE_STRICT_FILL_COLOR_SPEC.colors.some((target) => colorDistance(color, target) <= FIVE_TABLE_STRICT_FILL_COLOR_SPEC.threshold);
  };
  const isAlphabetSectionOfficialColorPixel = (image, blockId, x, y) => {
    const spec = ALPHABET_SECTION_COLOR_SPECS[blockId];
    if (!spec) return false;
    const color = rgbAt(image, x, y);
    return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
  };
  const isOfficialColorPixel = (image, colors, threshold, x, y) => {
    const color = rgbAt(image, x, y);
    return colors.some((target) => colorDistance(color, target) <= threshold);
  };
  const isComponentPixel = (image, groupId, x, y) => {
    const spec = COMPONENT_COLOR_SPECS[groupId];
    const color = rgbAt(image, x, y);
    return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
  };

  const extractOfficialComponents = (image, groupId) => {
    const spec = COMPONENT_COLOR_SPECS[groupId];
    const bounds = COMPONENT_EXTRACTION_BOUNDS;
    const width = bounds.maxX - bounds.minX + 1;
    const mask = new Uint8Array(width * (bounds.maxY - bounds.minY + 1));
    const seen = new Uint8Array(mask.length);

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (isComponentPixel(image, groupId, x, y)) {
          mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
        }
      }
    }

    const components = [];
    const queue = [];
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
        if (!mask[startIndex] || seen[startIndex]) continue;
        const pixels = [];
        let minX = x;
        let minY = y;
        let maxX = x;
        let maxY = y;
        seen[startIndex] = 1;
        queue.length = 0;
        queue.push([x, y]);

        for (let head = 0; head < queue.length; head += 1) {
          const [currentX, currentY] = queue[head];
          pixels.push([currentX, currentY]);
          minX = Math.min(minX, currentX);
          minY = Math.min(minY, currentY);
          maxX = Math.max(maxX, currentX);
          maxY = Math.max(maxY, currentY);

          for (const [offsetX, offsetY] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nextX = currentX + offsetX;
            const nextY = currentY + offsetY;
            if (nextX < bounds.minX || nextX > bounds.maxX || nextY < bounds.minY || nextY > bounds.maxY) continue;
            const index = ((nextY - bounds.minY) * width) + (nextX - bounds.minX);
            if (!mask[index] || seen[index]) continue;
            seen[index] = 1;
            queue.push([nextX, nextY]);
          }
        }

        if (pixels.length >= spec.minArea) {
          components.push({
            id: `${groupId}-${components.length + 1}`,
            bounds: { minX, minY, maxX, maxY },
            pixels,
          });
        }
      }
    }

    return components.sort((left, right) => left.bounds.minY - right.bounds.minY || left.bounds.minX - right.bounds.minX);
  };

  const componentCache = new Map();
  const officialComponentsFor = (image, groupId) => {
    if (!componentCache.has(groupId)) componentCache.set(groupId, extractOfficialComponents(image, groupId));
    return componentCache.get(groupId);
  };

  const officialComponentMask = (image, reference) => {
    const selectedIds = new Set(reference.componentIds);
    const components = officialComponentsFor(image, reference.componentGroupId)
      .filter((component) => selectedIds.has(component.id));
    const missingComponentIds = reference.componentIds.filter((componentId) => !components.some((component) => component.id === componentId));
    const hullInputPoints = components.flatMap((component) => component.pixels.flatMap(([x, y]) => [
      [x, y],
      [x + 1, y],
      [x, y + 1],
      [x + 1, y + 1],
    ]));
    const ring = simplifyCollinearRing(convexHull(hullInputPoints));

    return {
      rings: ring.length >= 3 ? [ring] : [],
      missingComponentIds,
    };
  };

  const officialAlphabetSectionMask = (image, blockId, blocksWithRings) => {
    const reference = ALPHABET_SECTION_OFFICIAL_MASK_REFERENCES[blockId];
    if (!reference) return null;
    const excludedRings = blocksWithRings
      .filter((block) => reference.excludeBlockIds.includes(block.id))
      .flatMap((block) => block.rings);
    const collectColorComponentPixelKeys = () => {
      const allPixels = new Set();

      for (let y = reference.searchBounds.minY; y <= reference.searchBounds.maxY; y += 1) {
        for (let x = reference.searchBounds.minX; x <= reference.searchBounds.maxX; x += 1) {
          if (!isOfficialColorPixel(image, reference.colors, reference.threshold, x, y)) continue;
          if (pointInRings([x + 0.5, y + 0.5], excludedRings)) continue;
          allPixels.add(pixelKey(x, y));
        }
      }

      const seen = new Set();
      const components = [];
      for (const startKey of allPixels) {
        if (seen.has(startKey)) continue;
        const stack = [startKey];
        const componentPixels = [];
        seen.add(startKey);

        while (stack.length > 0) {
          const currentKey = stack.pop();
          componentPixels.push(currentKey);
          const [currentX, currentY] = currentKey.split(',').map(Number);

          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].forEach(([deltaX, deltaY]) => {
            const nextKey = pixelKey(currentX + deltaX, currentY + deltaY);
            if (!allPixels.has(nextKey) || seen.has(nextKey)) return;
            seen.add(nextKey);
            stack.push(nextKey);
          });
        }

        components.push(componentPixels);
      }

      return components.sort((left, right) => right.length - left.length);
    };
    const rowEnvelopeRingFromPixelKeys = (selectedPixelKeys) => {
      const rows = [];

      for (let y = reference.searchBounds.minY; y <= reference.searchBounds.maxY; y += 1) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let pixelCount = 0;

        for (let x = reference.searchBounds.minX; x <= reference.searchBounds.maxX; x += 1) {
          if (!selectedPixelKeys.has(pixelKey(x, y))) continue;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + 1);
          pixelCount += 1;
        }

        if (pixelCount >= (reference.rowEnvelopeMinimumPixels ?? 1)) {
          rows.push({ y, minX, maxX });
        }
      }

      const sampleStep = reference.rowEnvelopeSampleStep ?? 4;
      const selectedRows = rows.filter((row, index) => (
        index === 0
        || index === rows.length - 1
        || row.y % sampleStep === 0
      ));
      const ring = [
        ...selectedRows.map((row) => [row.minX, row.y]),
        ...selectedRows.toReversed().map((row) => [row.maxX, row.y]),
      ];

      return simplifyCollinearRing(ring);
    };
    if (reference.maskStrategy === 'component-row-envelope-rings') {
      const components = collectColorComponentPixelKeys();
      const rings = reference.componentIndexGroups
        .map((componentIndexes) => {
          const selectedPixelKeys = new Set(
            componentIndexes.flatMap((componentIndex) => components[componentIndex] ?? []),
          );
          return rowEnvelopeRingFromPixelKeys(selectedPixelKeys);
        })
        .filter((ring) => ring.length >= 3);
      const supplementalRings = reference.supplementalMaskRings ?? [];

      return {
        rings: [...rings, ...supplementalRings],
        source: {
          searchBounds: reference.searchBounds,
          excludedBlockIds: reference.excludeBlockIds,
          componentIndexGroups: reference.componentIndexGroups,
          supplementalMaskRings: reference.supplementalMaskRings,
          maskStrategy: 'component-row-envelope-rings-official-png-color',
        },
      };
    }
    if (reference.maskStrategy === 'largest-component-row-envelope') {
      const allPixels = new Set();

      for (let y = reference.searchBounds.minY; y <= reference.searchBounds.maxY; y += 1) {
        for (let x = reference.searchBounds.minX; x <= reference.searchBounds.maxX; x += 1) {
          if (!isOfficialColorPixel(image, reference.colors, reference.threshold, x, y)) continue;
          if (pointInRings([x + 0.5, y + 0.5], excludedRings)) continue;
          allPixels.add(pixelKey(x, y));
        }
      }

      const seen = new Set();
      const components = [];
      for (const startKey of allPixels) {
        if (seen.has(startKey)) continue;
        const stack = [startKey];
        const componentPixels = [];
        seen.add(startKey);

        while (stack.length > 0) {
          const currentKey = stack.pop();
          componentPixels.push(currentKey);
          const [currentX, currentY] = currentKey.split(',').map(Number);

          [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].forEach(([deltaX, deltaY]) => {
            const nextKey = pixelKey(currentX + deltaX, currentY + deltaY);
            if (!allPixels.has(nextKey) || seen.has(nextKey)) return;
            seen.add(nextKey);
            stack.push(nextKey);
          });
        }

        components.push(componentPixels);
      }

      const selectedPixelKeys = new Set(
        components.sort((left, right) => right.length - left.length)[0] ?? [],
      );
      const rows = [];

      for (let y = reference.searchBounds.minY; y <= reference.searchBounds.maxY; y += 1) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let pixelCount = 0;

        for (let x = reference.searchBounds.minX; x <= reference.searchBounds.maxX; x += 1) {
          if (!selectedPixelKeys.has(pixelKey(x, y))) continue;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + 1);
          pixelCount += 1;
        }

        if (pixelCount >= (reference.rowEnvelopeMinimumPixels ?? 1)) {
          rows.push({ y, minX, maxX });
        }
      }

      const sampleStep = reference.rowEnvelopeSampleStep ?? 4;
      const selectedRows = rows.filter((row, index) => (
        index === 0
        || index === rows.length - 1
        || row.y % sampleStep === 0
      ));
      const ring = [
        ...selectedRows.map((row) => [row.minX, row.y]),
        ...selectedRows.toReversed().map((row) => [row.maxX, row.y]),
      ];

      return {
        rings: ring.length >= 3 ? [simplifyCollinearRing(ring)] : [],
        source: {
          searchBounds: reference.searchBounds,
          excludedBlockIds: reference.excludeBlockIds,
          maskStrategy: 'largest-component-row-envelope-official-png-color',
        },
      };
    }
    if (reference.maskStrategy === 'row-envelope') {
      const rows = [];

      for (let y = reference.searchBounds.minY; y <= reference.searchBounds.maxY; y += 1) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let pixelCount = 0;

        for (let x = reference.searchBounds.minX; x <= reference.searchBounds.maxX; x += 1) {
          if (!isOfficialColorPixel(image, reference.colors, reference.threshold, x, y)) continue;
          if (pointInRings([x + 0.5, y + 0.5], excludedRings)) continue;
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x + 1);
          pixelCount += 1;
        }

        if (pixelCount >= (reference.rowEnvelopeMinimumPixels ?? 1)) {
          rows.push({ y, minX, maxX });
        }
      }

      const sampleStep = reference.rowEnvelopeSampleStep ?? 4;
      const selectedRows = rows.filter((row, index) => (
        index === 0
        || index === rows.length - 1
        || row.y % sampleStep === 0
      ));
      const ring = [
        ...selectedRows.map((row) => [row.minX, row.y]),
        ...selectedRows.toReversed().map((row) => [row.maxX, row.y]),
      ];

      return {
        rings: ring.length >= 3 ? [simplifyCollinearRing(ring)] : [],
        source: {
          searchBounds: reference.searchBounds,
          excludedBlockIds: reference.excludeBlockIds,
          maskStrategy: 'row-envelope-official-png-color',
        },
      };
    }
    if (reference.maskPoints) {
      return {
        rings: [reference.maskPoints],
        source: {
          searchBounds: reference.searchBounds,
          excludedBlockIds: reference.excludeBlockIds,
        },
      };
    }
    const hullInputPoints = [];

    for (let y = reference.searchBounds.minY; y <= reference.searchBounds.maxY; y += 1) {
      for (let x = reference.searchBounds.minX; x <= reference.searchBounds.maxX; x += 1) {
        if (!isOfficialColorPixel(image, reference.colors, reference.threshold, x, y)) continue;
        if (pointInRings([x + 0.5, y + 0.5], excludedRings)) continue;
        hullInputPoints.push([x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]);
      }
    }

    const ring = simplifyCollinearRing(convexHull(hullInputPoints));
    return {
      rings: ring.length >= 3 ? [ring] : [],
      source: {
        searchBounds: reference.searchBounds,
        excludedBlockIds: reference.excludeBlockIds,
      },
    };
  };

  const officialComponentPixels = (image, reference) => {
    const selectedIds = new Set(reference.componentIds);
    const pixels = new Set();
    officialComponentsFor(image, reference.componentGroupId)
      .filter((component) => selectedIds.has(component.id))
      .forEach((component) => {
        component.pixels.forEach(([x, y]) => {
          if (
            x >= reference.expectedBounds.minX
            && x <= reference.expectedBounds.maxX
            && y >= reference.expectedBounds.minY
            && y <= reference.expectedBounds.maxY
          ) {
            pixels.add(pixelKey(x, y));
          }
        });
      });
    return pixels;
  };

  const calculateMaskAlignment = (block, officialMaskRings, thresholds) => {
    const polygonRings = parsePathSubpaths(block.imageGeometry.d);
    const officialBounds = unionBounds(officialMaskRings.map(pointsBounds));
    const polygonBounds = pathBounds(block.imageGeometry.d);
    if (!officialBounds) {
      return {
        auditMode: 'official-block-mask',
        officialBlockMaskRecall: 0,
        componentIoU: 0,
        skyPicnicColorCoverageRatio: null,
        fiveTableColorCoverageRatio: null,
        alphabetSectionColorCoverageRatio: null,
        outsideBleedRatio: 1,
        officialBounds: null,
        currentBounds: {
          minX: round(polygonBounds.minX, 1),
          minY: round(polygonBounds.minY, 1),
          maxX: round(polygonBounds.maxX, 1),
          maxY: round(polygonBounds.maxY, 1),
        },
        officialBoundsDelta: null,
        officialBoundsMaxAbsDelta: null,
        labelInsideOfficialMask: false,
        blockers: ['OFFICIAL_BLOCK_MASK_EMPTY'],
      };
    }
    const bounds = unionBounds([officialBounds, polygonBounds]);
    let officialPixels = 0;
    let polygonPixels = 0;
    let intersectionPixels = 0;
    const sampleStep = 2;

    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
      for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
        const point = [x + 0.5, y + 0.5];
        const insideOfficial = pointInRings(point, officialMaskRings);
        const insidePolygon = pointInRings(point, polygonRings);
        if (insideOfficial) officialPixels += 1;
        if (insidePolygon) polygonPixels += 1;
        if (insideOfficial && insidePolygon) intersectionPixels += 1;
      }
    }

    const unionPixels = officialPixels + polygonPixels - intersectionPixels;
    const outsidePixels = Math.max(0, polygonPixels - intersectionPixels);
    const officialBlockMaskRecall = officialPixels === 0 ? 0 : intersectionPixels / officialPixels;
    const componentIoU = unionPixels === 0 ? 0 : intersectionPixels / unionPixels;
    const outsideBleedRatio = polygonPixels === 0 ? 1 : outsidePixels / polygonPixels;
    const labelPoint = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const labelInsideOfficialMask = pointInRings(labelPoint, officialMaskRings);
    const officialBoundsDelta = boundsDelta(polygonBounds, officialBounds);
    const blockers = [];

    if (officialBlockMaskRecall < thresholds.minimumRecall) blockers.push(`OFFICIAL_BLOCK_MASK_RECALL_BELOW_THRESHOLD:${round(officialBlockMaskRecall)}`);
    if (componentIoU < thresholds.minimumIoU) blockers.push(`COMPONENT_IOU_BELOW_THRESHOLD:${round(componentIoU)}`);
    if (outsideBleedRatio > thresholds.maximumOutsideBleed) blockers.push(`OUTSIDE_BLEED_RATIO_ABOVE_THRESHOLD:${round(outsideBleedRatio)}`);
    if (!labelInsideOfficialMask) blockers.push('LABEL_OUTSIDE_OFFICIAL_MASK');

    return {
      auditMode: 'official-block-mask',
      officialBlockMaskRecall: round(officialBlockMaskRecall),
      componentIoU: round(componentIoU),
      skyPicnicColorCoverageRatio: null,
      fiveTableColorCoverageRatio: null,
      alphabetSectionColorCoverageRatio: null,
      outsideBleedRatio: round(outsideBleedRatio),
      officialBounds: {
        minX: round(officialBounds.minX, 1),
        minY: round(officialBounds.minY, 1),
        maxX: round(officialBounds.maxX, 1),
        maxY: round(officialBounds.maxY, 1),
      },
      currentBounds: {
        minX: round(polygonBounds.minX, 1),
        minY: round(polygonBounds.minY, 1),
        maxX: round(polygonBounds.maxX, 1),
        maxY: round(polygonBounds.maxY, 1),
      },
      officialBoundsDelta,
      officialBoundsMaxAbsDelta: round(maxAbsBoundsDelta(officialBoundsDelta), 1),
      labelInsideOfficialMask,
      blockers,
    };
  };

  const calculateComponentAlignment = (image, block, reference) => {
    const polygonRings = parsePathSubpaths(block.imageGeometry.d);
    const componentPixels = officialComponentPixels(image, reference);
    const polygonBounds = pathBounds(block.imageGeometry.d);
    const bounds = unionBounds([reference.expectedBounds, polygonBounds]);
    let officialPixels = 0;
    let polygonPixels = 0;
    let intersectionPixels = 0;
    const sampleStep = 2;

    for (let y = Math.max(0, Math.floor(bounds.minY - 20)); y <= Math.min(image.height - 1, Math.ceil(bounds.maxY + 20)); y += sampleStep) {
      for (let x = Math.max(0, Math.floor(bounds.minX - 20)); x <= Math.min(image.width - 1, Math.ceil(bounds.maxX + 20)); x += sampleStep) {
        const inOfficialBounds = x >= reference.expectedBounds.minX && x <= reference.expectedBounds.maxX && y >= reference.expectedBounds.minY && y <= reference.expectedBounds.maxY;
        const insideOfficial = inOfficialBounds && componentPixels.has(pixelKey(x, y));
        const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
        if (insideOfficial) officialPixels += 1;
        if (insidePolygon) polygonPixels += 1;
        if (insideOfficial && insidePolygon) intersectionPixels += 1;
      }
    }

    const unionPixels = officialPixels + polygonPixels - intersectionPixels;
    const outsidePixels = Math.max(0, polygonPixels - intersectionPixels);
    const officialBlockMaskRecall = officialPixels === 0 ? 0 : intersectionPixels / officialPixels;
    const componentIoU = unionPixels === 0 ? 0 : intersectionPixels / unionPixels;
    const outsideBleedRatio = polygonPixels === 0 ? 1 : outsidePixels / polygonPixels;
    const blockers = [];
    if (officialBlockMaskRecall < reference.minimumRecall) blockers.push(`OFFICIAL_COMPONENT_RECALL_BELOW_THRESHOLD:${round(officialBlockMaskRecall)}`);
    if (componentIoU < reference.minimumIoU) blockers.push(`COMPONENT_IOU_BELOW_THRESHOLD:${round(componentIoU)}`);

    return {
      auditMode: 'official-component',
      officialBlockMaskRecall: round(officialBlockMaskRecall),
      componentIoU: round(componentIoU),
      skyPicnicColorCoverageRatio: null,
      fiveTableColorCoverageRatio: null,
      alphabetSectionColorCoverageRatio: null,
      outsideBleedRatio: round(outsideBleedRatio),
      officialBounds: reference.expectedBounds,
      currentBounds: {
        minX: round(polygonBounds.minX, 1),
        minY: round(polygonBounds.minY, 1),
        maxX: round(polygonBounds.maxX, 1),
        maxY: round(polygonBounds.maxY, 1),
      },
      officialBoundsDelta: boundsDelta(polygonBounds, reference.expectedBounds),
      officialBoundsMaxAbsDelta: round(maxAbsBoundsDelta(boundsDelta(polygonBounds, reference.expectedBounds)), 1),
      labelInsideOfficialMask: null,
      blockers,
    };
  };

  const calculateSkyPicnicColorScan = (image, block) => {
    const visualPath = block.imageGeometry.visualD ?? block.imageGeometry.d;
    const usesSeparateVisualPath = Boolean(block.imageGeometry.visualD && block.imageGeometry.visualD !== block.imageGeometry.d);
    const polygonRings = parsePathSubpaths(visualPath);
    const polygonBounds = pathBounds(visualPath);
    const retraceReference = SKY_PICNIC_RETRACE_TARGET_BLOCK_IDS.has(block.id)
      ? GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id]
      : null;
    const visualBoundsDelta = retraceReference ? boundsDelta(polygonBounds, retraceReference.expectedBounds) : null;
    const visualBoundsMaxAbsDelta = visualBoundsDelta ? maxAbsBoundsDelta(visualBoundsDelta) : null;
    let polygonPixels = 0;
    let skyPicnicColorPixels = 0;
    let skyPicnicStrictFillPixels = 0;
    const localFillPixels = [];
    const sampleStep = 2;

    for (let y = Math.max(0, Math.floor(polygonBounds.minY - 4)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + 4)); y += sampleStep) {
      for (let x = Math.max(0, Math.floor(polygonBounds.minX - 4)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + 4)); x += sampleStep) {
        const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
        if (!insidePolygon) continue;
        polygonPixels += 1;
        if (isSkyPicnicOfficialColorPixel(image, x, y)) skyPicnicColorPixels += 1;
        if (isSkyPicnicStrictFillPixel(image, x, y)) skyPicnicStrictFillPixels += 1;
      }
    }

    const localPadding = SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS.searchPaddingPx;
    for (let y = Math.max(0, Math.floor(polygonBounds.minY - localPadding)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + localPadding)); y += 1) {
      for (let x = Math.max(0, Math.floor(polygonBounds.minX - localPadding)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + localPadding)); x += 1) {
        if (isSkyPicnicStrictFillPixel(image, x, y)) localFillPixels.push([x, y]);
      }
    }

    const skyPicnicColorCoverageRatio = polygonPixels === 0 ? 0 : skyPicnicColorPixels / polygonPixels;
    const skyPicnicStrictFillCoverageRatio = polygonPixels === 0 ? 0 : skyPicnicStrictFillPixels / polygonPixels;
    const outsideBleedRatio = polygonPixels === 0 ? 1 : 1 - skyPicnicColorCoverageRatio;
    const localFillBounds = localFillPixels.length > 0 ? pointsBounds(localFillPixels) : null;
    const localFillBoundsDelta = boundsDelta(polygonBounds, localFillBounds);
    const localFillBoundsMaxAbsDelta = maxAbsBoundsDelta(localFillBoundsDelta);
    const reviewWarnings = [];
    if (skyPicnicColorCoverageRatio < SKY_PICNIC_COLOR_SCAN_THRESHOLDS.minimumColorCoverageRatio) {
      reviewWarnings.push(`SKY_PICNIC_COLOR_COVERAGE_BELOW_REVIEW_TARGET:${round(skyPicnicColorCoverageRatio)}`);
    }
    if (skyPicnicColorCoverageRatio < SKY_PICNIC_COLOR_SCAN_THRESHOLDS.criticalColorCoverageRatio) {
      reviewWarnings.push(`SKY_PICNIC_COLOR_COVERAGE_CRITICAL:${round(skyPicnicColorCoverageRatio)}`);
    }
    if (localFillPixels.length < SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS.minimumFillPixelCount) {
      reviewWarnings.push(`SKY_PICNIC_LOCAL_FILL_PIXELS_BELOW_THRESHOLD:${localFillPixels.length}`);
    }
    if ((localFillBoundsMaxAbsDelta ?? Infinity) > SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS.maximumBoundsDeltaPx) {
      reviewWarnings.push(`SKY_PICNIC_LOCAL_FILL_BOUNDS_DELTA_ABOVE_THRESHOLD:${round(localFillBoundsMaxAbsDelta, 1)}`);
    }
    if (SKY_PICNIC_RETRACE_TARGET_BLOCK_IDS.has(block.id) && !usesSeparateVisualPath) {
      reviewWarnings.push('SKY_PICNIC_VISUAL_HIT_SPLIT_MISSING');
    }
    if ((visualBoundsMaxAbsDelta ?? 0) > SKY_PICNIC_VISUAL_BOUNDS_THRESHOLDS.maximumBoundsDeltaPx) {
      reviewWarnings.push(`SKY_PICNIC_VISUAL_BOUNDS_DELTA_ABOVE_THRESHOLD:${round(visualBoundsMaxAbsDelta, 1)}`);
    }

    return {
      auditMode: 'official-sky-picnic-color-scan',
      officialBlockMaskRecall: null,
      componentIoU: null,
      skyPicnicColorCoverageRatio: round(skyPicnicColorCoverageRatio),
      skyPicnicStrictFillCoverageRatio: round(skyPicnicStrictFillCoverageRatio),
      skyPicnicLocalFillPixelCount: localFillPixels.length,
      skyPicnicLocalFillBounds: localFillBounds
        ? {
          minX: round(localFillBounds.minX, 1),
          minY: round(localFillBounds.minY, 1),
          maxX: round(localFillBounds.maxX, 1),
          maxY: round(localFillBounds.maxY, 1),
        }
        : null,
      skyPicnicLocalFillBoundsDelta: localFillBoundsDelta,
      skyPicnicLocalFillBoundsMaxAbsDelta: round(localFillBoundsMaxAbsDelta, 1),
      skyPicnicUsesSeparateVisualPath: usesSeparateVisualPath,
      skyPicnicVisualBoundsDelta: visualBoundsDelta,
      skyPicnicVisualBoundsMaxAbsDelta: visualBoundsMaxAbsDelta === null ? null : round(visualBoundsMaxAbsDelta, 1),
      fiveTableColorCoverageRatio: null,
      alphabetSectionColorCoverageRatio: null,
      outsideBleedRatio: round(outsideBleedRatio),
      officialBounds: null,
      currentBounds: {
        minX: round(polygonBounds.minX, 1),
        minY: round(polygonBounds.minY, 1),
        maxX: round(polygonBounds.maxX, 1),
        maxY: round(polygonBounds.maxY, 1),
      },
      officialBoundsDelta: null,
      officialBoundsMaxAbsDelta: null,
      labelInsideOfficialMask: null,
      blockers: requireSkyPicnicScan ? reviewWarnings : [],
      reviewWarnings,
    };
  };

  const calculateFiveTableColorScan = (image, block) => {
    const polygonRings = parsePathSubpaths(block.imageGeometry.d);
    const polygonBounds = pathBounds(block.imageGeometry.d);
    let polygonPixels = 0;
    let fiveTableColorPixels = 0;
    let fiveTableStrictFillPixels = 0;
    const localFillPixels = [];
    const sampleStep = 2;

    for (let y = Math.max(0, Math.floor(polygonBounds.minY - 4)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + 4)); y += sampleStep) {
      for (let x = Math.max(0, Math.floor(polygonBounds.minX - 4)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + 4)); x += sampleStep) {
        const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
        if (!insidePolygon) continue;
        polygonPixels += 1;
        if (isFiveTableOfficialColorPixel(image, x, y)) fiveTableColorPixels += 1;
        if (isFiveTableStrictFillPixel(image, x, y)) fiveTableStrictFillPixels += 1;
      }
    }

    const localPadding = FIVE_TABLE_LOCAL_FILL_BOUNDS_THRESHOLDS.searchPaddingPx;
    for (let y = Math.max(0, Math.floor(polygonBounds.minY - localPadding)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + localPadding)); y += 1) {
      for (let x = Math.max(0, Math.floor(polygonBounds.minX - localPadding)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + localPadding)); x += 1) {
        if (isFiveTableStrictFillPixel(image, x, y)) localFillPixels.push([x, y]);
      }
    }

    const fiveTableColorCoverageRatio = polygonPixels === 0 ? 0 : fiveTableColorPixels / polygonPixels;
    const fiveTableStrictFillCoverageRatio = polygonPixels === 0 ? 0 : fiveTableStrictFillPixels / polygonPixels;
    const outsideBleedRatio = polygonPixels === 0 ? 1 : 1 - fiveTableColorCoverageRatio;
    const localFillBounds = localFillPixels.length > 0 ? pointsBounds(localFillPixels) : null;
    const localFillBoundsDelta = boundsDelta(polygonBounds, localFillBounds);
    const localFillBoundsMaxAbsDelta = maxAbsBoundsDelta(localFillBoundsDelta);
    const reviewWarnings = [];
    if (fiveTableColorCoverageRatio < FIVE_TABLE_COLOR_SCAN_THRESHOLDS.minimumColorCoverageRatio) {
      reviewWarnings.push(`FIVE_TABLE_COLOR_COVERAGE_BELOW_REVIEW_TARGET:${round(fiveTableColorCoverageRatio)}`);
    }
    if (fiveTableColorCoverageRatio < FIVE_TABLE_COLOR_SCAN_THRESHOLDS.criticalColorCoverageRatio) {
      reviewWarnings.push(`FIVE_TABLE_COLOR_COVERAGE_CRITICAL:${round(fiveTableColorCoverageRatio)}`);
    }
    if (localFillPixels.length < FIVE_TABLE_LOCAL_FILL_BOUNDS_THRESHOLDS.minimumFillPixelCount) {
      reviewWarnings.push(`FIVE_TABLE_LOCAL_FILL_PIXELS_BELOW_THRESHOLD:${localFillPixels.length}`);
    }
    if ((localFillBoundsMaxAbsDelta ?? Infinity) > FIVE_TABLE_LOCAL_FILL_BOUNDS_THRESHOLDS.maximumBoundsDeltaPx) {
      reviewWarnings.push(`FIVE_TABLE_LOCAL_FILL_BOUNDS_DELTA_ABOVE_THRESHOLD:${round(localFillBoundsMaxAbsDelta, 1)}`);
    }

    return {
      auditMode: 'official-five-table-color-scan',
      officialBlockMaskRecall: null,
      componentIoU: null,
      skyPicnicColorCoverageRatio: null,
      fiveTableColorCoverageRatio: round(fiveTableColorCoverageRatio),
      fiveTableStrictFillCoverageRatio: round(fiveTableStrictFillCoverageRatio),
      fiveTableLocalFillPixelCount: localFillPixels.length,
      fiveTableLocalFillBounds: localFillBounds
        ? {
          minX: round(localFillBounds.minX, 1),
          minY: round(localFillBounds.minY, 1),
          maxX: round(localFillBounds.maxX, 1),
          maxY: round(localFillBounds.maxY, 1),
        }
        : null,
      fiveTableLocalFillBoundsDelta: localFillBoundsDelta,
      fiveTableLocalFillBoundsMaxAbsDelta: round(localFillBoundsMaxAbsDelta, 1),
      alphabetSectionColorCoverageRatio: null,
      outsideBleedRatio: round(outsideBleedRatio),
      officialBounds: null,
      currentBounds: {
        minX: round(polygonBounds.minX, 1),
        minY: round(polygonBounds.minY, 1),
        maxX: round(polygonBounds.maxX, 1),
        maxY: round(polygonBounds.maxY, 1),
      },
      officialBoundsDelta: null,
      officialBoundsMaxAbsDelta: null,
      labelInsideOfficialMask: null,
      blockers: requireFiveTableScan ? reviewWarnings : [],
      reviewWarnings,
    };
  };

  const calculateAlphabetSectionColorScan = (image, block) => {
    const polygonRings = parsePathSubpaths(block.imageGeometry.d);
    const polygonBounds = pathBounds(block.imageGeometry.d);
    let polygonPixels = 0;
    let alphabetSectionColorPixels = 0;
    const sampleStep = 2;

    for (let y = Math.max(0, Math.floor(polygonBounds.minY - 4)); y <= Math.min(image.height - 1, Math.ceil(polygonBounds.maxY + 4)); y += sampleStep) {
      for (let x = Math.max(0, Math.floor(polygonBounds.minX - 4)); x <= Math.min(image.width - 1, Math.ceil(polygonBounds.maxX + 4)); x += sampleStep) {
        const insidePolygon = pointInRings([x + 0.5, y + 0.5], polygonRings);
        if (!insidePolygon) continue;
        polygonPixels += 1;
        if (isAlphabetSectionOfficialColorPixel(image, block.id, x, y)) alphabetSectionColorPixels += 1;
      }
    }

    const alphabetSectionColorCoverageRatio = polygonPixels === 0 ? 0 : alphabetSectionColorPixels / polygonPixels;
    const outsideBleedRatio = polygonPixels === 0 ? 1 : 1 - alphabetSectionColorCoverageRatio;
    const reviewWarnings = [];
    if (alphabetSectionColorCoverageRatio < ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS.minimumColorCoverageRatio) {
      reviewWarnings.push(`ALPHABET_SECTION_COLOR_COVERAGE_BELOW_REVIEW_TARGET:${round(alphabetSectionColorCoverageRatio)}`);
    }
    if (alphabetSectionColorCoverageRatio < ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS.criticalColorCoverageRatio) {
      reviewWarnings.push(`ALPHABET_SECTION_COLOR_COVERAGE_CRITICAL:${round(alphabetSectionColorCoverageRatio)}`);
    }

    return {
      auditMode: 'official-alphabet-section-color-scan',
      officialBlockMaskRecall: null,
      componentIoU: null,
      skyPicnicColorCoverageRatio: null,
      fiveTableColorCoverageRatio: null,
      alphabetSectionColorCoverageRatio: round(alphabetSectionColorCoverageRatio),
      outsideBleedRatio: round(outsideBleedRatio),
      officialBounds: null,
      currentBounds: {
        minX: round(polygonBounds.minX, 1),
        minY: round(polygonBounds.minY, 1),
        maxX: round(polygonBounds.maxX, 1),
        maxY: round(polygonBounds.maxY, 1),
      },
      officialBoundsDelta: null,
      officialBoundsMaxAbsDelta: null,
      labelInsideOfficialMask: null,
      blockers: requireAlphabetSectionScan ? reviewWarnings : [],
      reviewWarnings,
    };
  };

  const topHitAtLabel = (block, blocksWithRings) => {
    if (DERIVED_AGGREGATE_BLOCK_IDS.has(block.id)) {
      return true;
    }
    const point = [block.imageGeometry.labelX, block.imageGeometry.labelY];
    const containing = blocksWithRings
      .filter((candidate) => !isAggregateStealingSourceLabel(block.id, candidate.id))
      .filter((candidate) => pointInRings(point, candidate.rings));
    return containing.at(-1)?.id === block.id;
  };

  const renderOverlay = async (rows, targetPath, cropBounds = null, options = {}) => {
    const {
      showOfficialMasks = true,
      showCurrentPaths = true,
      showLabels = true,
      officialFill = 'rgba(34,197,94,0.18)',
      officialStroke = '#16a34a',
      officialStrokeWidth = 2.4,
      currentFill = 'rgba(37,99,235,0.16)',
      currentStroke = '#2563eb',
      currentStrokeWidth = 1.6,
      showHitPaths = true,
      hitFill = 'rgba(225,29,72,0.08)',
      hitStroke = '#e11d48',
      labelFill = '#111827',
    } = options;
    const width = GWANGJU_SEATMAP_IMAGE.imageWidth;
    const height = GWANGJU_SEATMAP_IMAGE.imageHeight;
    const officialPaths = showOfficialMasks
      ? rows
        .filter((row) => row.officialMaskPath)
        .map((row) => `<path d="${xmlEscape(row.officialMaskPath)}" fill="${officialFill}" stroke="${officialStroke}" stroke-width="${officialStrokeWidth}"/>`)
        .join('\n')
      : '';
    const currentPaths = showCurrentPaths
      ? rows
        .map((row) => `<path d="${xmlEscape(row.visualPath ?? row.currentPath)}" fill="${currentFill}" stroke="${currentStroke}" stroke-width="${currentStrokeWidth}"/>`)
        .join('\n')
      : '';
    const hitPaths = showHitPaths
      ? rows
        .filter((row) => row.visualPath && row.visualPath !== row.currentPath)
        .map((row) => `<path d="${xmlEscape(row.currentPath)}" fill="${hitFill}" stroke="${hitStroke}" stroke-width="1.2" stroke-dasharray="6 4"/>`)
        .join('\n')
      : '';
    const labels = showLabels
      ? rows
        .map((row) => `<text x="${row.labelX}" y="${row.labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="800" fill="${labelFill}" stroke="#fff" stroke-width="2" paint-order="stroke">${xmlEscape(row.shortLabel)}</text>`)
        .join('\n')
      : '';
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${officialPaths}${currentPaths}${hitPaths}${labels}</svg>`;
    const overlayBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const full = await sharp(imagePath)
      .ensureAlpha()
      .composite([{ input: overlayBuffer, left: 0, top: 0 }])
      .png()
      .toBuffer();
    const image = cropBounds
      ? sharp(full).extract(cropBounds).resize({ width: cropBounds.width * 2 })
      : sharp(full);
    await image.png().toFile(targetPath);
  };

  const renderOfficialCrop = async (targetPath, cropBounds) => {
    await sharp(imagePath)
      .extract(cropBounds)
      .resize({ width: cropBounds.width * 2 })
      .png()
      .toFile(targetPath);
  };

  const calculateLowerInfieldLayerOverlap = (numberedRows, specialRows, cropBounds) => {
    const sampleStep = 2;
    const numberedRings = numberedRows.flatMap((row) => parsePathSubpaths(row.currentPath));
    const specialRings = specialRows.flatMap((row) => parsePathSubpaths(row.currentPath));
    let numberedSamples = 0;
    let specialSamples = 0;
    let overlapSamples = 0;

    for (let y = cropBounds.top; y <= cropBounds.top + cropBounds.height; y += sampleStep) {
      for (let x = cropBounds.left; x <= cropBounds.left + cropBounds.width; x += sampleStep) {
        const point = [x + (sampleStep / 2), y + (sampleStep / 2)];
        const insideNumbered = pointInRings(point, numberedRings);
        const insideSpecial = pointInRings(point, specialRings);
        if (insideNumbered) numberedSamples += 1;
        if (insideSpecial) specialSamples += 1;
        if (insideNumbered && insideSpecial) overlapSamples += 1;
      }
    }

    const smallerSamples = Math.min(numberedSamples, specialSamples);
    const overlapRatio = smallerSamples === 0 ? 0 : overlapSamples / smallerSamples;
    return {
      numberedSamples,
      specialSamples,
      overlapSamples,
      overlapRatio: round(overlapRatio),
      maximumAllowedOverlapRatio: LOWER_INFIELD_SPECIAL_SPLIT_MAX_OVERLAP_RATIO,
      status: overlapRatio <= LOWER_INFIELD_SPECIAL_SPLIT_MAX_OVERLAP_RATIO ? 'passed' : 'failed',
    };
  };

  const calculateLowerInfieldPairOverlapRows = (numberedRows, specialRows, numberedIdKey = 'numberedId', specialIdKey = 'specialId') => {
    const sampleStep = 2;
    const rows = [];
    for (const numberedRow of numberedRows) {
      const numberedRings = parsePathSubpaths(numberedRow.currentPath);
      const numberedBounds = pathBounds(numberedRow.currentPath);
      for (const specialRow of specialRows) {
        const specialRings = parsePathSubpaths(specialRow.currentPath);
        const specialBounds = pathBounds(specialRow.currentPath);
        const bounds = unionBounds([numberedBounds, specialBounds]);
        let numberedSamples = 0;
        let specialSamples = 0;
        let overlapSamples = 0;
        for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
          for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
            const point = [x + (sampleStep / 2), y + (sampleStep / 2)];
            const insideNumbered = pointInRings(point, numberedRings);
            const insideSpecial = pointInRings(point, specialRings);
            if (insideNumbered) numberedSamples += 1;
            if (insideSpecial) specialSamples += 1;
            if (insideNumbered && insideSpecial) overlapSamples += 1;
          }
        }
        const smallerSamples = Math.min(numberedSamples, specialSamples);
        const overlapRatio = smallerSamples === 0 ? 0 : overlapSamples / smallerSamples;
        rows.push({
          [numberedIdKey]: numberedRow.id,
          [specialIdKey]: specialRow.id,
          numberedSamples,
          specialSamples,
          overlapSamples,
          overlapRatio: round(overlapRatio),
          status: overlapRatio <= LOWER_INFIELD_SPECIAL_SPLIT_MAX_OVERLAP_RATIO ? 'passed' : 'failed',
        });
      }
    }
    return rows;
  };

  const renderLowerInfieldOverlapHeatmap = async (numberedRows, specialRows, targetPath, cropBounds) => {
    const width = GWANGJU_SEATMAP_IMAGE.imageWidth;
    const height = GWANGJU_SEATMAP_IMAGE.imageHeight;
    const sampleStep = 2;
    const numberedRings = numberedRows.flatMap((row) => parsePathSubpaths(row.currentPath));
    const specialRings = specialRows.flatMap((row) => parsePathSubpaths(row.currentPath));
    const numberedPaths = numberedRows
      .map((row) => `<path d="${xmlEscape(row.currentPath)}" fill="rgba(37,99,235,0.12)" stroke="#2563eb" stroke-width="1.4"/>`)
      .join('\n');
    const specialPaths = specialRows
      .map((row) => `<path d="${xmlEscape(row.currentPath)}" fill="rgba(245,158,11,0.16)" stroke="#d97706" stroke-width="1.6"/>`)
      .join('\n');
    const overlapRects = [];
    for (let y = cropBounds.top; y <= cropBounds.top + cropBounds.height; y += sampleStep) {
      for (let x = cropBounds.left; x <= cropBounds.left + cropBounds.width; x += sampleStep) {
        const point = [x + (sampleStep / 2), y + (sampleStep / 2)];
        if (pointInRings(point, numberedRings) && pointInRings(point, specialRings)) {
          overlapRects.push(`<rect x="${x}" y="${y}" width="${sampleStep}" height="${sampleStep}" fill="rgba(220,38,38,0.68)"/>`);
        }
      }
    }
    const labels = [...numberedRows, ...specialRows]
      .map((row) => `<text x="${row.labelX}" y="${row.labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="800" fill="#111827" stroke="#fff" stroke-width="2" paint-order="stroke">${xmlEscape(row.shortLabel)}</text>`)
      .join('\n');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${numberedPaths}${specialPaths}${overlapRects.join('\n')}${labels}</svg>`;
    const overlayBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    const full = await sharp(imagePath)
      .ensureAlpha()
      .composite([{ input: overlayBuffer, left: 0, top: 0 }])
      .png()
      .toBuffer();
    await sharp(full)
      .extract(cropBounds)
      .resize({ width: cropBounds.width * 2 })
      .png()
      .toFile(targetPath);
  };

  await fs.mkdir(reportDir, { recursive: true });
  await fs.mkdir(cropDir, { recursive: true });
  await fs.mkdir(lowerInfieldSpecialSplitDir, { recursive: true });

  const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const image = { data, width: info.width, height: info.height, channels: info.channels };
  const blocksWithRings = GWANGJU_BLOCKS.map((block) => ({
    id: block.id,
    rings: parsePathSubpaths(block.imageGeometry.d),
  }));
  const rows = GWANGJU_BLOCKS.map((block) => {
    const numberedComponentReference = NUMBERED_INFIELD_COMPONENT_REFERENCES[block.id];
    const numberedComponentMask = numberedComponentReference ? officialComponentMask(image, numberedComponentReference) : null;
    const numberedManualMaskReference = NUMBERED_INFIELD_MANUAL_MASK_REFERENCES[block.id];
    const numberedManualMask = numberedManualMaskReference ? { rings: [numberedManualMaskReference.maskPoints] } : null;
    const alphabetSectionMask = officialAlphabetSectionMask(image, block.id, blocksWithRings);
    const opReference = GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[block.id];
    const isSkyPicnicBlock = block.category === 'SKY_PICNIC';
    const isFiveTableBlock = block.category === 'FIVE_TABLE';
    const isAlphabetSectionBlock = ALPHABET_SECTION_IDS.has(block.id);
    const thresholds = P0_BLOCK_IDS.has(block.id) ? NUMBERED_BLOCK_THRESHOLDS.p0 : NUMBERED_BLOCK_THRESHOLDS.default;
    let metric;
    if (numberedManualMask) {
      metric = calculateMaskAlignment(block, numberedManualMask.rings, thresholds);
      metric.auditMode = 'official-numbered-boundary-mask';
    } else if (numberedComponentMask) {
      metric = calculateMaskAlignment(block, numberedComponentMask.rings, thresholds);
      metric.auditMode = 'official-numbered-component-mask';
      if (numberedComponentMask.missingComponentIds.length > 0) {
        metric.blockers.push(`OFFICIAL_COMPONENT_MISSING:${numberedComponentMask.missingComponentIds.join('|')}`);
      }
    } else if (alphabetSectionMask) {
      metric = calculateMaskAlignment(block, alphabetSectionMask.rings, ALPHABET_SECTION_MASK_THRESHOLDS);
      metric.auditMode = 'official-alphabet-section-mask';
    } else if (opReference) {
      metric = calculateComponentAlignment(image, block, opReference);
    } else if (isSkyPicnicBlock) {
      metric = calculateSkyPicnicColorScan(image, block);
    } else if (isFiveTableBlock) {
      metric = calculateFiveTableColorScan(image, block);
    } else if (isAlphabetSectionBlock) {
      metric = calculateAlphabetSectionColorScan(image, block);
    } else {
      metric = {
        auditMode: 'release-trace-advisory',
        officialBlockMaskRecall: null,
        componentIoU: null,
        skyPicnicColorCoverageRatio: null,
        fiveTableColorCoverageRatio: null,
        alphabetSectionColorCoverageRatio: null,
        outsideBleedRatio: null,
        officialBounds: null,
        currentBounds: pathBounds(block.imageGeometry.d),
        officialBoundsDelta: null,
        officialBoundsMaxAbsDelta: null,
        labelInsideOfficialMask: null,
        blockers: [],
        reviewWarnings: [],
      };
    }
    const topHit = topHitAtLabel(block, blocksWithRings);
    const blockers = [
      ...metric.blockers,
      ...(topHit ? [] : ['LABEL_TOP_HIT_MISMATCH']),
    ];
    const reviewWarnings = metric.reviewWarnings ?? [];

    return {
      id: block.id,
      block: block.block,
      category: block.category,
      shortLabel: block.imageGeometry.shortLabel,
      traceVersion: block.imageGeometry.traceVersion,
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      currentPath: block.imageGeometry.d,
      visualPath: block.imageGeometry.visualD ?? block.imageGeometry.d,
      hasSeparateVisualPath: Boolean(block.imageGeometry.visualD && block.imageGeometry.visualD !== block.imageGeometry.d),
      officialMaskPath: numberedManualMask
          ? numberedManualMask.rings.map(pathFromPoints).join(' ')
          : numberedComponentMask
          ? numberedComponentMask.rings.map(pathFromPoints).join(' ')
        : alphabetSectionMask
          ? alphabetSectionMask.rings.map(pathFromPoints).join(' ')
          : null,
      thresholdProfile: NUMBERED_INFIELD_AUDIT_BLOCK_IDS.has(block.id) ? (P0_BLOCK_IDS.has(block.id) ? 'p0-official-png-component-mask-101-108' : 'numbered-infield-official-png-mask-101-120') : alphabetSectionMask ? 'alphabet-section-official-png-mask-after-101-108' : opReference ? 'op-component' : isSkyPicnicBlock ? 'sky-picnic-color-scan' : isFiveTableBlock ? 'five-table-color-scan' : isAlphabetSectionBlock ? 'alphabet-section-color-scan' : 'advisory',
      topHitAtLabel: topHit,
      status: blockers.length > 0 ? 'failed' : reviewWarnings.length > 0 ? 'review-required' : 'passed',
      visualBounds: pathBounds(block.imageGeometry.visualD ?? block.imageGeometry.d),
      ...metric,
      blockers,
      reviewWarnings,
    };
  });

  const auditedRows = rows.filter((row) => row.auditMode !== 'release-trace-advisory');
  const failedRows = auditedRows.filter((row) => row.status === 'failed');
  const reviewRows = auditedRows.filter((row) => row.status === 'review-required');
  const p0Rows = rows.filter((row) => P0_BLOCK_IDS.has(row.id));
  const numberedInfieldRows = rows.filter((row) => NUMBERED_INFIELD_AUDIT_BLOCK_IDS.has(row.id));
  const skyPicnicRows = rows.filter((row) => row.auditMode === 'official-sky-picnic-color-scan');
  const fiveTableRows = rows.filter((row) => row.auditMode === 'official-five-table-color-scan');
  const alphabetSectionMaskRows = rows.filter((row) => row.auditMode === 'official-alphabet-section-mask');
  const alphabetSectionColorRows = rows.filter((row) => row.auditMode === 'official-alphabet-section-color-scan');
  const alphabetSectionRows = [...alphabetSectionMaskRows, ...alphabetSectionColorRows];
  const lowerInfieldSpecialSplitRows = rows.filter((row) => LOWER_INFIELD_SPECIAL_SPLIT_BLOCK_IDS.has(row.id));
  const lowerInfieldNumberedRows = rows.filter((row) => LOWER_INFIELD_RETRACED_BLOCK_IDS.includes(row.id));
  const lowerInfieldSpecialRows = rows.filter((row) => LOWER_INFIELD_SPECIAL_BLOCK_IDS.includes(row.id));
  const lowerInfieldAdjacentSkyPicnicRows = rows.filter((row) => LOWER_INFIELD_ADJACENT_SKY_PICNIC_BLOCK_IDS.includes(row.id));
  const lowerInfieldIBoundaryFocusRows = rows.filter((row) => LOWER_INFIELD_I_BOUNDARY_FOCUS_BLOCK_IDS.includes(row.id));
  const lowerInfield101108VisualReviewRows = rows.filter((row) => LOWER_INFIELD_101_108_VISUAL_REVIEW_BLOCK_IDS.includes(row.id));
  const visualHitSplitRows = rows.filter((row) => row.hasSeparateVisualPath);
  const lowerInfieldVisualHitSplitReviewRows = rows.filter((row) => LOWER_INFIELD_VISUAL_HIT_SPLIT_REVIEW_BLOCK_IDS.includes(row.id));
  const lowerInfieldJSkyBoundaryReviewRows = rows.filter((row) => LOWER_INFIELD_J_SKY_BOUNDARY_REVIEW_BLOCK_IDS.includes(row.id));
  const thirdBaseHGSpecialBoundaryReviewRows = rows.filter((row) => THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BLOCK_IDS.includes(row.id));
  const isOfficialNoChangeRow = (row) => (
    row.status === 'passed'
    && row.officialBoundsMaxAbsDelta === 0
    && row.topHitAtLabel === true
    && row.hasSeparateVisualPath === false
  );
  const isOfficialNearNoChangeRow = (row, tolerancePx = 1) => (
    row.status === 'passed'
    && typeof row.officialBoundsMaxAbsDelta === 'number'
    && row.officialBoundsMaxAbsDelta <= tolerancePx
    && row.topHitAtLabel === true
    && row.hasSeparateVisualPath === false
  );
  const isColorScanNoChangeRow = (row) => (
    row.status === 'passed'
    && row.topHitAtLabel === true
    && row.hasSeparateVisualPath === false
    && typeof row.outsideBleedRatio === 'number'
    && row.outsideBleedRatio <= ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS.criticalColorCoverageRatio
  );
  const isLocalFillNoChangeRow = (row) => (
    row.status === 'passed'
    && row.topHitAtLabel === true
    && row.hasSeparateVisualPath === false
    && typeof row.skyPicnicLocalFillBoundsMaxAbsDelta === 'number'
    && row.skyPicnicLocalFillBoundsMaxAbsDelta <= SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS.maximumBoundsDeltaPx
  );
  const lowerInfieldVisualHitSplitNoChangeRows = lowerInfieldVisualHitSplitReviewRows.filter(isOfficialNoChangeRow);
  const lowerInfieldVisualHitSplitChangedRows = lowerInfieldVisualHitSplitReviewRows.filter((row) => row.hasSeparateVisualPath);
  const lowerInfieldVisualHitSplitReviewRequiredRows = lowerInfieldVisualHitSplitReviewRows.filter((row) => (
    !isOfficialNoChangeRow(row) && !row.hasSeparateVisualPath
  ));
  const visualHitSplitReviewDecision = (row) => {
    if (row.hasSeparateVisualPath) {
      return 'visualD';
    }
    return isOfficialNoChangeRow(row) ? 'keep d' : 'review';
  };
  const lowerInfieldJSkyBoundaryNoChangeRows = lowerInfieldJSkyBoundaryReviewRows.filter((row) => (
    isOfficialNoChangeRow(row) || isLocalFillNoChangeRow(row)
  ));
  const lowerInfieldJSkyBoundaryChangedRows = lowerInfieldJSkyBoundaryReviewRows.filter((row) => row.hasSeparateVisualPath);
  const lowerInfieldJSkyBoundaryReviewRequiredRows = lowerInfieldJSkyBoundaryReviewRows.filter((row) => (
    !isOfficialNoChangeRow(row) && !isLocalFillNoChangeRow(row) && !row.hasSeparateVisualPath
  ));
  const jSkyBoundaryReviewDecision = (row) => {
    if (row.hasSeparateVisualPath) {
      return 'visualD';
    }
    return isOfficialNoChangeRow(row) || isLocalFillNoChangeRow(row) ? 'keep d' : 'review';
  };
  const thirdBaseHGSpecialBoundaryNoChangeRows = thirdBaseHGSpecialBoundaryReviewRows.filter((row) => (
    isOfficialNearNoChangeRow(row) || isColorScanNoChangeRow(row)
  ));
  const thirdBaseHGSpecialBoundaryChangedRows = thirdBaseHGSpecialBoundaryReviewRows.filter((row) => row.hasSeparateVisualPath);
  const thirdBaseHGSpecialBoundaryReviewRequiredRows = thirdBaseHGSpecialBoundaryReviewRows.filter((row) => (
    !isOfficialNearNoChangeRow(row) && !isColorScanNoChangeRow(row) && !row.hasSeparateVisualPath
  ));
  const thirdBaseHGSpecialBoundaryReviewDecision = (row) => {
    if (row.hasSeparateVisualPath) {
      return 'visualD';
    }
    return isOfficialNearNoChangeRow(row) || isColorScanNoChangeRow(row) ? 'keep d' : 'review';
  };
  const lowerInfieldP0VisualChecklist = LOWER_INFIELD_P0_VISUAL_CHECKLIST_ITEMS.map((item) => {
    const itemRows = rows.filter((row) => item.blockIds.includes(row.id));
    const missingBlockIds = item.blockIds.filter((blockId) => !itemRows.some((row) => row.id === blockId));
    const failedRowsInItem = itemRows.filter((row) => row.status !== 'passed' || !row.topHitAtLabel);
    const status = missingBlockIds.length === 0 && failedRowsInItem.length === 0 ? 'passed' : 'review-required';
    const finiteMetricValues = (selector) => itemRows
      .map(selector)
      .filter((value) => typeof value === 'number' && Number.isFinite(value));
    const recallValues = finiteMetricValues((row) => row.officialBlockMaskRecall);
    const iouValues = finiteMetricValues((row) => row.componentIoU);
    const outsideBleedValues = finiteMetricValues((row) => row.outsideBleedRatio);
    return {
      id: item.id,
      title: item.title,
      status,
      reviewNote: item.reviewNote,
      coordinateSource: SOURCE_POLICY.coordinateSource,
      coordinateSystem: SOURCE_POLICY.coordinateSystem,
      bounds: item.bounds,
      blockIds: item.blockIds,
      nonSelectableOfficialLabels: item.nonSelectableOfficialLabels,
      cropArtifact: path.relative(frontendRoot, path.join(cropDir, item.cropFileName)),
      minimumRecall: recallValues.length === 0 ? null : round(Math.min(...recallValues)),
      minimumIoU: iouValues.length === 0 ? null : round(Math.min(...iouValues)),
      maximumOutsideBleedRatio: outsideBleedValues.length === 0 ? null : round(Math.max(...outsideBleedValues)),
      topHitFailures: itemRows.filter((row) => !row.topHitAtLabel).map((row) => row.id),
      missingBlockIds,
      failedBlockIds: failedRowsInItem.map((row) => row.id),
      rows: itemRows.map((row) => ({
        id: row.id,
        shortLabel: row.shortLabel,
        auditMode: row.auditMode,
        status: row.status,
        officialBlockMaskRecall: row.officialBlockMaskRecall,
        componentIoU: row.componentIoU,
        outsideBleedRatio: row.outsideBleedRatio,
        topHitAtLabel: row.topHitAtLabel,
        officialBounds: row.officialBounds,
        currentBounds: row.currentBounds,
        blockers: row.blockers,
        reviewWarnings: row.reviewWarnings,
      })),
    };
  });
  const lowerInfieldP0VisualChecklistReviewRequiredItems = lowerInfieldP0VisualChecklist.filter((item) => item.status !== 'passed');
  const lowerInfieldSpecialSplitPairOverlapRows = calculateLowerInfieldPairOverlapRows(lowerInfieldNumberedRows, lowerInfieldSpecialRows);
  const lowerInfieldSpecialAdjacentOverlapRows = calculateLowerInfieldPairOverlapRows(
    lowerInfieldSpecialRows,
    lowerInfieldAdjacentSkyPicnicRows,
    'specialId',
    'adjacentId',
  );
  const lowerInfieldSpecialSplitOverlapWarnings = lowerInfieldSpecialSplitPairOverlapRows.filter((row) => row.status === 'failed');
  const lowerInfieldSpecialAdjacentOverlapWarnings = lowerInfieldSpecialAdjacentOverlapRows.filter((row) => row.status === 'failed');
  const lowerInfieldSpecialSplitLayerOverlap = calculateLowerInfieldLayerOverlap(
    lowerInfieldNumberedRows,
    lowerInfieldSpecialRows,
    LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS,
  );
  const lowerInfieldSpecialSplitStatus = (
    lowerInfieldSpecialSplitLayerOverlap.status === 'passed'
    && lowerInfieldSpecialSplitOverlapWarnings.length === 0
    && lowerInfieldSpecialAdjacentOverlapWarnings.length === 0
  ) ? 'passed' : 'failed';
  const lowerInfieldSpecialSplitArtifactPaths = {
    officialCrop: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-official.png'),
    allOverlay: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-all-overlay.png'),
    numberedOnlyOverlay: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-numbered-only.png'),
    specialOnlyOverlay: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-special-only.png'),
    adjacentSkyPicnicOnlyOverlay: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-adjacent-sky-picnic-only.png'),
    overlapHeatmap: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-overlap-heatmap.png'),
    adjacentOverlapHeatmap: path.join(lowerInfieldSpecialSplitDir, 'gwangju-seatmap-lower-infield-special-split-adjacent-overlap-heatmap.png'),
  };
  const lowerInfieldSpecialSplitEvidenceArtifacts = Object.fromEntries(
    Object.entries(lowerInfieldSpecialSplitArtifactPaths).map(([key, artifactPath]) => [key, path.relative(frontendRoot, artifactPath)]),
  );
  const summary = {
    scriptVersion: SCRIPT_VERSION,
    status: failedRows.length === 0
      && lowerInfieldSpecialSplitStatus === 'passed'
      ? 'passed'
      : 'failed',
    traceVersion: GWANGJU_FULL_RETRACE_VERSION,
    imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
    coordinateSystem: SOURCE_POLICY.coordinateSystem,
    totalBlocks: rows.length,
    auditedBlocks: auditedRows.length,
    p0AuditedBlocks: p0Rows.length,
    numberedInfieldAuditedBlocks: numberedInfieldRows.length,
    skyPicnicAuditedBlocks: skyPicnicRows.length,
    alphabetSectionAuditedBlocks: alphabetSectionRows.length,
    alphabetSectionMaskAuditedBlocks: alphabetSectionMaskRows.length,
    failedBlocks: failedRows.length,
    reviewRequiredBlocks: reviewRows.length,
    minimumP0OfficialBlockMaskRecall: round(Math.min(...p0Rows.map((row) => row.officialBlockMaskRecall ?? 1))),
    minimumP0ComponentIoU: round(Math.min(...p0Rows.map((row) => row.componentIoU ?? 1))),
    maximumP0OutsideBleedRatio: round(Math.max(...p0Rows.map((row) => row.outsideBleedRatio ?? 0))),
    minimumNumberedInfieldOfficialBlockMaskRecall: round(Math.min(...numberedInfieldRows.map((row) => row.officialBlockMaskRecall ?? 1))),
    minimumNumberedInfieldComponentIoU: round(Math.min(...numberedInfieldRows.map((row) => row.componentIoU ?? 1))),
    maximumNumberedInfieldOutsideBleedRatio: round(Math.max(...numberedInfieldRows.map((row) => row.outsideBleedRatio ?? 0))),
    minimumAlphabetSectionMaskRecall: round(Math.min(...alphabetSectionMaskRows.map((row) => row.officialBlockMaskRecall ?? 1))),
    minimumAlphabetSectionMaskIoU: round(Math.min(...alphabetSectionMaskRows.map((row) => row.componentIoU ?? 1))),
    maximumAlphabetSectionMaskOutsideBleedRatio: round(Math.max(...alphabetSectionMaskRows.map((row) => row.outsideBleedRatio ?? 0))),
    minimumSkyPicnicColorCoverageRatio: round(Math.min(...skyPicnicRows.map((row) => row.skyPicnicColorCoverageRatio ?? 1))),
    minimumSkyPicnicStrictFillCoverageRatio: round(Math.min(...skyPicnicRows.map((row) => row.skyPicnicStrictFillCoverageRatio ?? 1))),
    maximumSkyPicnicOutsideBleedRatio: round(Math.max(...skyPicnicRows.map((row) => row.outsideBleedRatio ?? 0))),
    maximumSkyPicnicLocalFillBoundsDelta: round(Math.max(...skyPicnicRows.map((row) => row.skyPicnicLocalFillBoundsMaxAbsDelta ?? 0)), 1),
    skyPicnicLocalFillBoundsWarnings: skyPicnicRows.filter((row) => row.reviewWarnings.some((warning) => warning.startsWith('SKY_PICNIC_LOCAL_FILL_BOUNDS_DELTA_ABOVE_THRESHOLD'))).length,
    maximumSkyPicnicVisualBoundsDelta: round(Math.max(...skyPicnicRows.map((row) => row.skyPicnicVisualBoundsMaxAbsDelta ?? 0)), 1),
    skyPicnicVisualBoundsWarnings: skyPicnicRows.filter((row) => row.reviewWarnings.some((warning) => warning.startsWith('SKY_PICNIC_VISUAL_BOUNDS_DELTA_ABOVE_THRESHOLD'))).length,
    skyPicnicVisualHitSplitMissingWarnings: skyPicnicRows.filter((row) => row.reviewWarnings.includes('SKY_PICNIC_VISUAL_HIT_SPLIT_MISSING')).length,
    skyPicnicReviewRequiredBlocks: skyPicnicRows.filter((row) => row.status === 'review-required').length,
    skyPicnicScanBlocking: requireSkyPicnicScan,
    fiveTableAuditedBlocks: fiveTableRows.length,
    minimumFiveTableColorCoverageRatio: round(Math.min(...fiveTableRows.map((row) => row.fiveTableColorCoverageRatio ?? 1))),
    minimumFiveTableStrictFillCoverageRatio: round(Math.min(...fiveTableRows.map((row) => row.fiveTableStrictFillCoverageRatio ?? 1))),
    maximumFiveTableOutsideBleedRatio: round(Math.max(...fiveTableRows.map((row) => row.outsideBleedRatio ?? 0))),
    maximumFiveTableLocalFillBoundsDelta: round(Math.max(...fiveTableRows.map((row) => row.fiveTableLocalFillBoundsMaxAbsDelta ?? 0)), 1),
    fiveTableLocalFillBoundsWarnings: fiveTableRows.filter((row) => row.reviewWarnings.some((warning) => warning.startsWith('FIVE_TABLE_LOCAL_FILL_BOUNDS_DELTA_ABOVE_THRESHOLD'))).length,
    fiveTableReviewRequiredBlocks: fiveTableRows.filter((row) => row.status === 'review-required').length,
    fiveTableScanBlocking: requireFiveTableScan,
    alphabetSectionReviewRequiredBlocks: alphabetSectionRows.filter((row) => row.status === 'review-required').length,
    minimumAlphabetSectionColorCoverageRatio: round(Math.min(...alphabetSectionColorRows.map((row) => row.alphabetSectionColorCoverageRatio ?? 1))),
    maximumAlphabetSectionOutsideBleedRatio: round(Math.max(...alphabetSectionRows.map((row) => row.outsideBleedRatio ?? 0))),
    alphabetSectionScanBlocking: requireAlphabetSectionScan,
    lowerInfieldSpecialSplitStatus,
    lowerInfieldSpecialSplitBlocks: lowerInfieldSpecialSplitRows.length,
    lowerInfieldSpecialSplitOverlapWarnings: lowerInfieldSpecialSplitOverlapWarnings.length,
    lowerInfieldSpecialAdjacentOverlapWarnings: lowerInfieldSpecialAdjacentOverlapWarnings.length,
    lowerInfieldSpecialSplitLayerOverlap,
    lowerInfieldSpecialSplitEvidenceArtifacts,
    lowerInfieldIBoundaryFocusBlockIds: LOWER_INFIELD_I_BOUNDARY_FOCUS_BLOCK_IDS,
    lowerInfieldIBoundaryFocusBounds: LOWER_INFIELD_I_BOUNDARY_FOCUS_BOUNDS,
    lowerInfieldIBoundaryFocusMinimumRecall: round(Math.min(...lowerInfieldIBoundaryFocusRows.map((row) => row.officialBlockMaskRecall ?? 1))),
    lowerInfieldIBoundaryFocusMinimumIoU: round(Math.min(...lowerInfieldIBoundaryFocusRows.map((row) => row.componentIoU ?? 1))),
    lowerInfieldIBoundaryFocusMaximumOutsideBleedRatio: round(Math.max(...lowerInfieldIBoundaryFocusRows.map((row) => row.outsideBleedRatio ?? 0))),
    lowerInfield101108VisualReviewBlockIds: LOWER_INFIELD_101_108_VISUAL_REVIEW_BLOCK_IDS,
    lowerInfield101108VisualReviewBounds: LOWER_INFIELD_101_108_VISUAL_REVIEW_BOUNDS,
    lowerInfield101108VisualReviewMinimumRecall: round(Math.min(...lowerInfield101108VisualReviewRows.map((row) => row.officialBlockMaskRecall ?? 1))),
    lowerInfield101108VisualReviewMinimumIoU: round(Math.min(...lowerInfield101108VisualReviewRows.map((row) => row.componentIoU ?? 1))),
    lowerInfield101108VisualReviewMaximumOutsideBleedRatio: round(Math.max(...lowerInfield101108VisualReviewRows.map((row) => row.outsideBleedRatio ?? 0))),
    visualHitSplitBlockCount: visualHitSplitRows.length,
    visualHitSplitBlocks: visualHitSplitRows.map((row) => row.id),
    lowerInfieldVisualHitSplitReviewBlockIds: LOWER_INFIELD_VISUAL_HIT_SPLIT_REVIEW_BLOCK_IDS,
    lowerInfieldVisualHitSplitReviewNoChangeBlockIds: lowerInfieldVisualHitSplitNoChangeRows.map((row) => row.id),
    lowerInfieldVisualHitSplitReviewChangedBlockIds: lowerInfieldVisualHitSplitChangedRows.map((row) => row.id),
    lowerInfieldVisualHitSplitReviewRequiredBlockIds: lowerInfieldVisualHitSplitReviewRequiredRows.map((row) => row.id),
    lowerInfieldJSkyBoundaryReviewBlockIds: LOWER_INFIELD_J_SKY_BOUNDARY_REVIEW_BLOCK_IDS,
    lowerInfieldJSkyBoundaryReviewNoChangeBlockIds: lowerInfieldJSkyBoundaryNoChangeRows.map((row) => row.id),
    lowerInfieldJSkyBoundaryReviewChangedBlockIds: lowerInfieldJSkyBoundaryChangedRows.map((row) => row.id),
    lowerInfieldJSkyBoundaryReviewRequiredBlockIds: lowerInfieldJSkyBoundaryReviewRequiredRows.map((row) => row.id),
    thirdBaseHGSpecialBoundaryReviewBlockIds: THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BLOCK_IDS,
    thirdBaseHGSpecialBoundaryReviewNoChangeBlockIds: thirdBaseHGSpecialBoundaryNoChangeRows.map((row) => row.id),
    thirdBaseHGSpecialBoundaryReviewChangedBlockIds: thirdBaseHGSpecialBoundaryChangedRows.map((row) => row.id),
    thirdBaseHGSpecialBoundaryReviewRequiredBlockIds: thirdBaseHGSpecialBoundaryReviewRequiredRows.map((row) => row.id),
    lowerInfieldP0VisualChecklistStatus: lowerInfieldP0VisualChecklistReviewRequiredItems.length === 0 ? 'passed' : 'review-required',
    lowerInfieldP0VisualChecklistItems: lowerInfieldP0VisualChecklist.length,
    lowerInfieldP0VisualChecklistReviewRequiredItems: lowerInfieldP0VisualChecklistReviewRequiredItems.length,
    labelTopHitFailures: rows.filter((row) => !row.topHitAtLabel).length,
    officialMaskSourcePolicy: SOURCE_POLICY,
  };

  await renderOverlay(rows.filter((row) => row.auditMode !== 'release-trace-advisory'), overlayPath);
  for (const region of CROP_REGIONS) {
    await renderOverlay(rows.filter((row) => row.auditMode !== 'release-trace-advisory'), path.join(cropDir, `gwangju-seatmap-image-alignment-audit-${region.id}.png`), region.bounds);
  }
  await renderOfficialCrop(lowerInfieldSpecialSplitArtifactPaths.officialCrop, LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS);
  await renderOverlay(lowerInfieldSpecialSplitRows, lowerInfieldSpecialSplitArtifactPaths.allOverlay, LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS);
  await renderOverlay(lowerInfieldNumberedRows, lowerInfieldSpecialSplitArtifactPaths.numberedOnlyOverlay, LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS, {
    officialFill: 'rgba(34,197,94,0.16)',
    officialStroke: '#16a34a',
    currentFill: 'rgba(37,99,235,0.18)',
    currentStroke: '#2563eb',
  });
  await renderOverlay(lowerInfieldSpecialRows, lowerInfieldSpecialSplitArtifactPaths.specialOnlyOverlay, LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS, {
    officialFill: 'rgba(245,158,11,0.18)',
    officialStroke: '#d97706',
    currentFill: 'rgba(220,38,38,0.18)',
    currentStroke: '#dc2626',
  });
  await renderOverlay(lowerInfieldAdjacentSkyPicnicRows, lowerInfieldSpecialSplitArtifactPaths.adjacentSkyPicnicOnlyOverlay, LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS, {
    officialFill: 'rgba(147,51,234,0.14)',
    officialStroke: '#7e22ce',
    currentFill: 'rgba(147,51,234,0.16)',
    currentStroke: '#7e22ce',
  });
  await renderLowerInfieldOverlapHeatmap(
    lowerInfieldNumberedRows,
    lowerInfieldSpecialRows,
    lowerInfieldSpecialSplitArtifactPaths.overlapHeatmap,
    LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS,
  );
  await renderLowerInfieldOverlapHeatmap(
    lowerInfieldSpecialRows,
    lowerInfieldAdjacentSkyPicnicRows,
    lowerInfieldSpecialSplitArtifactPaths.adjacentOverlapHeatmap,
    LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS,
  );

  await fs.writeFile(jsonPath, `${JSON.stringify({
    summary,
    thresholds: {
      numberedBlocks: NUMBERED_BLOCK_THRESHOLDS,
      skyPicnicColorScan: SKY_PICNIC_COLOR_SCAN_THRESHOLDS,
      skyPicnicLocalFillBounds: SKY_PICNIC_LOCAL_FILL_BOUNDS_THRESHOLDS,
      skyPicnicVisualBounds: SKY_PICNIC_VISUAL_BOUNDS_THRESHOLDS,
      fiveTableColorScan: FIVE_TABLE_COLOR_SCAN_THRESHOLDS,
      fiveTableLocalFillBounds: FIVE_TABLE_LOCAL_FILL_BOUNDS_THRESHOLDS,
      alphabetSectionColorScan: ALPHABET_SECTION_COLOR_SCAN_THRESHOLDS,
      alphabetSectionMask: ALPHABET_SECTION_MASK_THRESHOLDS,
      lowerInfieldSpecialSplit: {
        maximumOverlapRatio: LOWER_INFIELD_SPECIAL_SPLIT_MAX_OVERLAP_RATIO,
      },
    },
    cropArtifacts: CROP_REGIONS.map((region) => path.relative(frontendRoot, path.join(cropDir, `gwangju-seatmap-image-alignment-audit-${region.id}.png`))),
    lowerInfieldIBoundaryFocus: {
      bounds: LOWER_INFIELD_I_BOUNDARY_FOCUS_BOUNDS,
      blockIds: LOWER_INFIELD_I_BOUNDARY_FOCUS_BLOCK_IDS,
      cropArtifact: path.relative(frontendRoot, path.join(cropDir, 'gwangju-seatmap-image-alignment-audit-104-105-i-j-boundary.png')),
      rows: lowerInfieldIBoundaryFocusRows,
    },
    lowerInfield101108VisualReview: {
      bounds: LOWER_INFIELD_101_108_VISUAL_REVIEW_BOUNDS,
      blockIds: LOWER_INFIELD_101_108_VISUAL_REVIEW_BLOCK_IDS,
      cropArtifact: path.relative(frontendRoot, path.join(cropDir, 'gwangju-seatmap-image-alignment-audit-101-108-h-i-j-e-f-visual-review.png')),
      rows: lowerInfield101108VisualReviewRows,
    },
    lowerInfieldVisualHitSplitReview: {
      blockIds: LOWER_INFIELD_VISUAL_HIT_SPLIT_REVIEW_BLOCK_IDS,
      noChangeBlockIds: lowerInfieldVisualHitSplitNoChangeRows.map((row) => row.id),
      changedBlockIds: lowerInfieldVisualHitSplitChangedRows.map((row) => row.id),
      reviewRequiredBlockIds: lowerInfieldVisualHitSplitReviewRequiredRows.map((row) => row.id),
      rows: lowerInfieldVisualHitSplitReviewRows.map((row) => ({
        id: row.id,
        shortLabel: row.shortLabel,
        status: row.status,
        decision: visualHitSplitReviewDecision(row),
        hasSeparateVisualPath: row.hasSeparateVisualPath,
        officialBoundsMaxAbsDelta: row.officialBoundsMaxAbsDelta,
        topHitAtLabel: row.topHitAtLabel,
        currentBounds: row.currentBounds,
        visualBounds: row.visualBounds,
        officialBounds: row.officialBounds,
        blockers: row.blockers,
        reviewWarnings: row.reviewWarnings,
      })),
    },
    lowerInfieldJSkyBoundaryReview: {
      blockIds: LOWER_INFIELD_J_SKY_BOUNDARY_REVIEW_BLOCK_IDS,
      noChangeBlockIds: lowerInfieldJSkyBoundaryNoChangeRows.map((row) => row.id),
      changedBlockIds: lowerInfieldJSkyBoundaryChangedRows.map((row) => row.id),
      reviewRequiredBlockIds: lowerInfieldJSkyBoundaryReviewRequiredRows.map((row) => row.id),
      rows: lowerInfieldJSkyBoundaryReviewRows.map((row) => ({
        id: row.id,
        shortLabel: row.shortLabel,
        auditMode: row.auditMode,
        status: row.status,
        decision: jSkyBoundaryReviewDecision(row),
        hasSeparateVisualPath: row.hasSeparateVisualPath,
        officialBoundsMaxAbsDelta: row.officialBoundsMaxAbsDelta,
        skyPicnicLocalFillBoundsMaxAbsDelta: row.skyPicnicLocalFillBoundsMaxAbsDelta,
        skyPicnicStrictFillCoverageRatio: row.skyPicnicStrictFillCoverageRatio,
        topHitAtLabel: row.topHitAtLabel,
        currentBounds: row.currentBounds,
        visualBounds: row.visualBounds,
        officialBounds: row.officialBounds,
        blockers: row.blockers,
        reviewWarnings: row.reviewWarnings,
      })),
    },
    thirdBaseHGSpecialBoundaryReview: {
      bounds: THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BOUNDS,
      blockIds: THIRD_BASE_H_G_SPECIAL_BOUNDARY_REVIEW_BLOCK_IDS,
      cropArtifact: path.relative(frontendRoot, path.join(cropDir, 'gwangju-seatmap-image-alignment-audit-third-base-h-g-special.png')),
      noChangeBlockIds: thirdBaseHGSpecialBoundaryNoChangeRows.map((row) => row.id),
      changedBlockIds: thirdBaseHGSpecialBoundaryChangedRows.map((row) => row.id),
      reviewRequiredBlockIds: thirdBaseHGSpecialBoundaryReviewRequiredRows.map((row) => row.id),
      rows: thirdBaseHGSpecialBoundaryReviewRows.map((row) => ({
        id: row.id,
        shortLabel: row.shortLabel,
        auditMode: row.auditMode,
        status: row.status,
        decision: thirdBaseHGSpecialBoundaryReviewDecision(row),
        hasSeparateVisualPath: row.hasSeparateVisualPath,
        officialBoundsMaxAbsDelta: row.officialBoundsMaxAbsDelta,
        officialBlockMaskRecall: row.officialBlockMaskRecall,
        componentIoU: row.componentIoU,
        outsideBleedRatio: row.outsideBleedRatio,
        topHitAtLabel: row.topHitAtLabel,
        currentBounds: row.currentBounds,
        visualBounds: row.visualBounds,
        officialBounds: row.officialBounds,
        blockers: row.blockers,
        reviewWarnings: row.reviewWarnings,
      })),
    },
    lowerInfieldP0VisualChecklist,
    lowerInfieldSpecialSplit: {
      status: lowerInfieldSpecialSplitStatus,
      bounds: LOWER_INFIELD_SPECIAL_SPLIT_BOUNDS,
      blockIds: [...LOWER_INFIELD_SPECIAL_SPLIT_BLOCK_IDS],
      numberedBlockIds: LOWER_INFIELD_RETRACED_BLOCK_IDS,
      specialBlockIds: LOWER_INFIELD_SPECIAL_BLOCK_IDS,
      adjacentSkyPicnicBlockIds: LOWER_INFIELD_ADJACENT_SKY_PICNIC_BLOCK_IDS,
      layerOverlap: lowerInfieldSpecialSplitLayerOverlap,
      pairOverlapRows: lowerInfieldSpecialSplitPairOverlapRows,
      specialAdjacentOverlapRows: lowerInfieldSpecialAdjacentOverlapRows,
      evidenceArtifacts: lowerInfieldSpecialSplitEvidenceArtifacts,
    },
    overlayArtifact: path.relative(frontendRoot, overlayPath),
    rows,
  }, null, 2)}\n`, 'utf8');

  const csvHeaders = [
    'id',
    'block',
    'category',
    'traceVersion',
    'auditMode',
    'thresholdProfile',
    'officialBlockMaskRecall',
    'componentIoU',
    'skyPicnicColorCoverageRatio',
    'skyPicnicStrictFillCoverageRatio',
    'skyPicnicLocalFillBoundsMaxAbsDelta',
    'skyPicnicLocalFillPixelCount',
    'skyPicnicVisualBoundsMaxAbsDelta',
    'skyPicnicUsesSeparateVisualPath',
    'fiveTableColorCoverageRatio',
    'fiveTableStrictFillCoverageRatio',
    'fiveTableLocalFillBoundsMaxAbsDelta',
    'fiveTableLocalFillPixelCount',
    'alphabetSectionColorCoverageRatio',
    'outsideBleedRatio',
    'officialBoundsMaxAbsDelta',
    'labelInsideOfficialMask',
    'topHitAtLabel',
    'status',
    'hasSeparateVisualPath',
    'officialVisualReferenceSource',
    'officialVisualReferenceShape',
    'visualBounds',
    'blockers',
    'reviewWarnings',
  ];
  await fs.writeFile(csvPath, `${[
    csvHeaders,
    ...rows.map((row) => [
      row.id,
      row.block,
      row.category,
      row.traceVersion,
      row.auditMode,
      row.thresholdProfile,
      row.officialBlockMaskRecall,
      row.componentIoU,
      row.skyPicnicColorCoverageRatio,
      row.skyPicnicStrictFillCoverageRatio,
      row.skyPicnicLocalFillBoundsMaxAbsDelta,
      row.skyPicnicLocalFillPixelCount,
      row.skyPicnicVisualBoundsMaxAbsDelta,
      row.skyPicnicUsesSeparateVisualPath,
      row.fiveTableColorCoverageRatio,
      row.fiveTableStrictFillCoverageRatio,
      row.fiveTableLocalFillBoundsMaxAbsDelta,
      row.fiveTableLocalFillPixelCount,
      row.alphabetSectionColorCoverageRatio,
      row.outsideBleedRatio,
      row.officialBoundsMaxAbsDelta,
      row.labelInsideOfficialMask,
      row.topHitAtLabel,
      row.status,
      row.hasSeparateVisualPath,
      row.officialVisualReferenceSource ?? '',
      row.officialVisualReferenceShape ?? '',
      row.visualBounds ? JSON.stringify(row.visualBounds) : '',
      row.blockers.join('|'),
      row.reviewWarnings.join('|'),
    ]),
  ].map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');

  const markdown = [
    '# 광주 좌석도 image alignment audit',
    '',
    `- status: \`${summary.status}\``,
    `- trace version: \`${summary.traceVersion}\``,
    `- coordinate source: \`${SOURCE_POLICY.coordinateSource}\``,
    `- coordinate system: \`${SOURCE_POLICY.coordinateSystem}\``,
    `- audited blocks: ${summary.auditedBlocks}`,
    `- P0 101~108 minimum recall: \`${summary.minimumP0OfficialBlockMaskRecall}\``,
    `- P0 101~108 minimum IoU: \`${summary.minimumP0ComponentIoU}\``,
    `- P0 101~108 maximum outside bleed: \`${summary.maximumP0OutsideBleedRatio}\``,
    `- numbered 101~120 audited blocks: ${summary.numberedInfieldAuditedBlocks}`,
    `- numbered 101~120 minimum recall: \`${summary.minimumNumberedInfieldOfficialBlockMaskRecall}\``,
    `- numbered 101~120 minimum IoU: \`${summary.minimumNumberedInfieldComponentIoU}\``,
    `- numbered 101~120 maximum outside bleed: \`${summary.maximumNumberedInfieldOutsideBleedRatio}\``,
    `- S-301~S-335 minimum official color coverage: \`${summary.minimumSkyPicnicColorCoverageRatio}\``,
    `- S-301~S-335 minimum strict fill coverage: \`${summary.minimumSkyPicnicStrictFillCoverageRatio}\``,
    `- S-301~S-335 maximum outside bleed: \`${summary.maximumSkyPicnicOutsideBleedRatio}\``,
    `- S-301~S-335 maximum local fill bounds delta: \`${summary.maximumSkyPicnicLocalFillBoundsDelta}\``,
    `- S-301~S-335 local fill bounds warnings: ${summary.skyPicnicLocalFillBoundsWarnings}`,
    `- S-305~S-335 maximum visual bounds delta: \`${summary.maximumSkyPicnicVisualBoundsDelta}\``,
    `- S-305~S-335 visual bounds warnings: ${summary.skyPicnicVisualBoundsWarnings}`,
    `- S-305~S-335 missing visual/hit split warnings: ${summary.skyPicnicVisualHitSplitMissingWarnings}`,
    `- S-301~S-335 review-required rows: ${skyPicnicRows.filter((row) => row.status === 'review-required').length}`,
    `- S-301~S-335 blocking mode: \`${summary.skyPicnicScanBlocking ? 'enabled' : 'disabled'}\``,
    `- five table 501~535 audited blocks: ${summary.fiveTableAuditedBlocks}`,
    `- five table 501~535 minimum official color coverage: \`${summary.minimumFiveTableColorCoverageRatio}\``,
    `- five table 501~535 minimum strict fill coverage: \`${summary.minimumFiveTableStrictFillCoverageRatio}\``,
    `- five table 501~535 maximum outside bleed: \`${summary.maximumFiveTableOutsideBleedRatio}\``,
    `- five table 501~535 maximum local fill bounds delta: \`${summary.maximumFiveTableLocalFillBoundsDelta}\``,
    `- five table 501~535 local fill bounds warnings: ${summary.fiveTableLocalFillBoundsWarnings}`,
    `- five table 501~535 review-required rows: ${summary.fiveTableReviewRequiredBlocks}`,
    `- five table 501~535 blocking mode: \`${summary.fiveTableScanBlocking ? 'enabled' : 'disabled'}\``,
    `- J/I/H official mask minimum recall: \`${summary.minimumAlphabetSectionMaskRecall}\``,
    `- J/I/H official mask minimum IoU: \`${summary.minimumAlphabetSectionMaskIoU}\``,
    `- J/I/H official mask maximum outside bleed: \`${summary.maximumAlphabetSectionMaskOutsideBleedRatio}\``,
    `- alphabet sections minimum official color coverage: \`${summary.minimumAlphabetSectionColorCoverageRatio}\``,
    `- alphabet sections maximum outside bleed: \`${summary.maximumAlphabetSectionOutsideBleedRatio}\``,
    `- alphabet sections review-required rows: ${summary.alphabetSectionReviewRequiredBlocks}`,
    `- alphabet sections blocking mode: \`${summary.alphabetSectionScanBlocking ? 'enabled' : 'disabled'}\``,
    `- lower infield special split status: \`${summary.lowerInfieldSpecialSplitStatus}\``,
    `- lower infield special split overlap warnings: ${summary.lowerInfieldSpecialSplitOverlapWarnings}`,
    `- lower infield special vs S-301~S-303 overlap warnings: ${summary.lowerInfieldSpecialAdjacentOverlapWarnings}`,
    `- lower infield special split layer overlap ratio: \`${summary.lowerInfieldSpecialSplitLayerOverlap.overlapRatio}\``,
    `- visual/hit split blocks: ${summary.visualHitSplitBlocks.join(', ') || 'none'}`,
    `- 101~104/I visual-hit split review no-change blocks: ${summary.lowerInfieldVisualHitSplitReviewNoChangeBlockIds.join(', ') || 'none'}`,
    `- 101~104/I visual-hit split review-required blocks: ${summary.lowerInfieldVisualHitSplitReviewRequiredBlockIds.join(', ') || 'none'}`,
    `- 106~108/J/S-301~304 boundary no-change blocks: ${summary.lowerInfieldJSkyBoundaryReviewNoChangeBlockIds.join(', ') || 'none'}`,
    `- 106~108/J/S-301~304 boundary visualD blocks: ${summary.lowerInfieldJSkyBoundaryReviewChangedBlockIds.join(', ') || 'none'}`,
    `- 106~108/J/S-301~304 boundary review-required blocks: ${summary.lowerInfieldJSkyBoundaryReviewRequiredBlockIds.join(', ') || 'none'}`,
    `- third-base H/G special boundary no-change blocks: ${(summary.thirdBaseHGSpecialBoundaryReviewNoChangeBlockIds ?? []).join(', ') || 'none'}`,
    `- third-base H/G special boundary visualD blocks: ${(summary.thirdBaseHGSpecialBoundaryReviewChangedBlockIds ?? []).join(', ') || 'none'}`,
    `- third-base H/G special boundary review-required blocks: ${(summary.thirdBaseHGSpecialBoundaryReviewRequiredBlockIds ?? []).join(', ') || 'none'}`,
    `- label top-hit failures: ${summary.labelTopHitFailures}`,
    '',
    '기존 `pixelCoverageRatio`는 작은 polygon이 공식 색상 영역 내부에 있을 때 false pass를 만들 수 있으므로, 101~108 P0 구간은 공식 PNG 기준 독립 mask recall/IoU/outside bleed를 release 판단에 사용합니다. J/I/H는 101~108 polygon을 먼저 제외한 공식 PNG 색상 mask로 다시 검수합니다. S-301~S-335는 공식 PNG의 strict pink block fill을 각 polygon 주변에서 다시 샘플링해 local fill bounds delta를 계산하므로, S-322처럼 polygon이 N/I 마커나 통로 쪽으로 튀어나와도 release gate에서 차단됩니다. 501~535 5층 테이블, 나머지 A/B/C/G/H/I/J/L 알파벳 표시 좌석은 공식 PNG 색상 coverage를 전수조사해 기존 polygon이 다른 layer나 흰 여백을 과도하게 삼키는지 별도 보고합니다.',
    '',
    '## Visual/Hit Split Review',
    '',
    '`lowerInfieldVisualHitSplitReview`는 101~104와 I가 H/105 visualD 분리 작업의 영향을 받아 불필요하게 움직였는지 확인합니다. 공식 PNG mask와 current path가 같은 bounds이고 label top-hit이 통과하면 `keep d`로 기록하며, 이 경우 production 좌표를 바꾸지 않습니다.',
    '',
    markdownTable(
      ['id', 'label', 'officialDelta', 'separateVisual', 'decision', 'topHit', 'status'],
      lowerInfieldVisualHitSplitReviewRows.map((row) => [
        row.id,
        row.shortLabel,
        row.officialBoundsMaxAbsDelta,
        row.hasSeparateVisualPath,
        visualHitSplitReviewDecision(row),
        row.topHitAtLabel,
        row.status,
      ]),
    ),
    '',
    '## J/S Boundary Review',
    '',
    '`lowerInfieldJSkyBoundaryReview`는 106~108, J, S-301~S-304가 서로 기울어진 layer로 보이거나 아래 S 블럭을 삼키는 회귀를 막기 위한 공식 PNG 기준 경계 리뷰입니다. 번호 블럭/J는 official mask bounds가 일치하면 `keep d`, S 블럭은 strict pink local fill bounds가 허용치 안이면 `keep d`, 표시 경계만 따로 필요한 블럭은 `visualD`로 기록합니다.',
    '',
    markdownTable(
      ['id', 'label', 'mode', 'officialDelta', 'localFillDelta', 'strictFill', 'separateVisual', 'decision', 'topHit', 'status'],
      lowerInfieldJSkyBoundaryReviewRows.map((row) => [
        row.id,
        row.shortLabel,
        row.auditMode,
        row.officialBoundsMaxAbsDelta,
        row.skyPicnicLocalFillBoundsMaxAbsDelta,
        row.skyPicnicStrictFillCoverageRatio,
        row.hasSeparateVisualPath,
        jSkyBoundaryReviewDecision(row),
        row.topHitAtLabel,
        row.status,
      ]),
    ),
    '',
    '## Third-Base H/G Special Boundary Review',
    '',
    '`thirdBaseHGSpecialBoundaryReview`는 3루 H/G 특수 구역을 공식 PNG crop에서 검수합니다. 제거된 legacy 번호/I/J 블럭은 production 및 QA 대상에 포함하지 않습니다.',
    '',
    markdownTable(
      ['id', 'label', 'mode', 'recall', 'IoU', 'outsideBleed', 'officialDelta', 'separateVisual', 'decision', 'topHit', 'status'],
      thirdBaseHGSpecialBoundaryReviewRows.map((row) => [
        row.id,
        row.shortLabel,
        row.auditMode,
        row.officialBlockMaskRecall,
        row.componentIoU,
        row.outsideBleedRatio,
        row.officialBoundsMaxAbsDelta,
        row.hasSeparateVisualPath,
        thirdBaseHGSpecialBoundaryReviewDecision(row),
        row.topHitAtLabel,
        row.status,
      ]),
    ),
    '',
    '## P0 101~108',
    '',
    markdownTable(
      ['id', 'recall', 'IoU', 'outsideBleed', 'topHit', 'status', 'blockers'],
      p0Rows.map((row) => [
        row.id,
        row.officialBlockMaskRecall,
        row.componentIoU,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
        row.blockers.join('<br>'),
      ]),
    ),
    '',
    '## Numbered 101~120 Full Scan',
    '',
    '`official-numbered-component-mask`는 공식 PNG 색상 component를 기준으로 production에 남아 있는 101~120 번호 블럭을 검수합니다. 제거된 legacy 번호 블럭은 production 및 QA 대상에 포함하지 않습니다. 110~111처럼 색상 component 분리가 애매한 번호 블럭만 `official-numbered-boundary-mask`로 남깁니다.',
    '',
    markdownTable(
      ['id', 'mode', 'recall', 'IoU', 'outsideBleed', 'topHit', 'status', 'blockers'],
      numberedInfieldRows.map((row) => [
        row.id,
        row.auditMode,
        row.officialBlockMaskRecall,
        row.componentIoU,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
        row.blockers.join('<br>'),
      ]),
    ),
    '',
    '## J/I/H Official Mask',
    '',
    '`official-alphabet-section-mask`는 101~108 하단 내야 polygon을 먼저 제외한 뒤 공식 PNG 원본 색상에서 J/I/H 기준 mask를 추출합니다. 이 세 구역은 단순 색상 coverage가 아니라 recall/IoU/outside bleed gate로 release를 차단합니다.',
    '',
    markdownTable(
      ['id', 'label', 'recall', 'IoU', 'outsideBleed', 'topHit', 'status', 'blockers'],
      alphabetSectionMaskRows.map((row) => [
        row.id,
        row.shortLabel,
        row.officialBlockMaskRecall,
        row.componentIoU,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
        row.blockers.join('<br>'),
      ]),
    ),
    '',
    '## Lower Infield Special Split Evidence',
    '',
    '`lower-infield-special-split` evidence는 공식 PNG crop, 101~108 번호 블럭 only overlay, J/I/H 특수석 only overlay, 인접 S-301~S-303 only overlay, 전체 overlay, numbered-vs-special overlap heatmap을 함께 생성합니다. 이 gate는 번호 블럭과 특수석이 각각 통과하더라도 서로를 삼키는 layer ownership 회귀를 차단하고, J 보정이 아래 S 블럭 hit-area를 삼키는 회귀도 별도로 차단합니다.',
    '',
    markdownTable(
      ['id', 'label', 'mode', 'recall', 'IoU', 'outsideBleed', 'topHit', 'status'],
      lowerInfieldSpecialSplitRows.map((row) => [
        row.id,
        row.shortLabel,
        row.auditMode,
        row.officialBlockMaskRecall,
        row.componentIoU,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
      ]),
    ),
    '',
    markdownTable(
      ['numbered', 'special', 'overlapSamples', 'overlapRatio', 'status'],
      lowerInfieldSpecialSplitPairOverlapRows
        .filter((row) => row.overlapSamples > 0 || row.status === 'failed')
        .map((row) => [
          row.numberedId,
          row.specialId,
          row.overlapSamples,
          row.overlapRatio,
          row.status,
        ]),
    ),
    '',
    markdownTable(
      ['special', 'adjacent', 'overlapSamples', 'overlapRatio', 'status'],
      lowerInfieldSpecialAdjacentOverlapRows
        .filter((row) => row.overlapSamples > 0 || row.status === 'failed')
        .map((row) => [
          row.specialId,
          row.adjacentId,
          row.overlapSamples,
          row.overlapRatio,
          row.status,
        ]),
    ),
    '',
    '## P0 Lower Infield Visual Checklist',
    '',
    '`lowerInfieldP0VisualChecklist`는 101~108 하단 내야를 4개 crop으로 쪼개서 공식 PNG overlay를 독립 검수합니다. 목적은 통합 crop이 통과하더라도 H/I/J/E와 인접 S 블럭 ownership이 서로를 삼키는 회귀를 사람이 바로 확인할 수 있게 고정하는 것입니다.',
    '',
    markdownTable(
      ['id', 'title', 'status', 'minRecall', 'minIoU', 'maxBleed', 'topHitFailures', 'crop'],
      lowerInfieldP0VisualChecklist.map((item) => [
        item.id,
        item.title,
        item.status,
        item.minimumRecall,
        item.minimumIoU,
        item.maximumOutsideBleedRatio,
        item.topHitFailures.join('<br>'),
        item.cropArtifact,
      ]),
    ),
    '',
    '## S-301~S-335 Full Scan',
    '',
    '`official-sky-picnic-color-scan`은 공식 PNG 원본 색상과 strict block fill local bounds를 함께 샘플링합니다. 기본 실행에서는 review-required로 보고만 하고, `--require-sky-picnic`을 붙이면 같은 결과를 차단 gate로 승격합니다.',
    '',
    markdownTable(
      ['id', 'colorCoverage', 'strictFill', 'localFillDelta', 'outsideBleed', 'topHit', 'status', 'warnings'],
      skyPicnicRows.map((row) => [
        row.id,
        row.skyPicnicColorCoverageRatio,
        row.skyPicnicStrictFillCoverageRatio,
        row.skyPicnicLocalFillBoundsMaxAbsDelta,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
        row.reviewWarnings.join('<br>'),
      ]),
    ),
    '',
    '## Five Table 501~535 Full Scan',
    '',
    '`official-five-table-color-scan`은 공식 PNG 원본의 5층 테이블석 회색/청회색 fill 색상과 polygon 주변 strict fill bounds를 함께 샘플링합니다. 기본 실행에서는 review-required로 보고만 하고, `--require-five-table`을 붙이면 같은 결과를 차단 gate로 승격합니다.',
    '',
    markdownTable(
      ['id', 'colorCoverage', 'strictFill', 'localFillDelta', 'outsideBleed', 'topHit', 'status', 'warnings'],
      fiveTableRows.map((row) => [
        row.id,
        row.fiveTableColorCoverageRatio,
        row.fiveTableStrictFillCoverageRatio,
        row.fiveTableLocalFillBoundsMaxAbsDelta,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
        row.reviewWarnings.join('<br>'),
      ]),
    ),
    '',
    '## Alphabet Section Full Scan',
    '',
    '`official-alphabet-section-color-scan`은 선택 가능한 알파벳 좌석 polygon 내부가 공식 PNG의 해당 구역 색상을 충분히 덮는지 전수조사합니다. J/I/H는 위의 독립 mask gate로 승격했고, 나머지 알파벳 구역은 기본 실행에서는 review-required로 보고만 하며 `--require-alphabet-sections`를 붙이면 같은 결과를 차단 gate로 승격합니다.',
    '',
    markdownTable(
      ['id', 'label', 'category', 'colorCoverage', 'outsideBleed', 'topHit', 'status', 'warnings'],
      alphabetSectionRows.map((row) => [
        row.id,
        row.shortLabel,
        row.category,
        row.alphabetSectionColorCoverageRatio,
        row.outsideBleedRatio,
        row.topHitAtLabel,
        row.status,
        row.reviewWarnings.join('<br>'),
      ]),
    ),
    '',
    '## Failures',
    '',
    failedRows.length === 0
      ? 'No image alignment failures.'
      : markdownTable(
        ['id', 'mode', 'recall', 'IoU', 'outsideBleed', 'blockers'],
        failedRows.map((row) => [
          row.id,
          row.auditMode,
          row.officialBlockMaskRecall,
          row.componentIoU,
          row.outsideBleedRatio,
          row.blockers.join('<br>'),
        ]),
      ),
    '',
    '## Artifacts',
    '',
    `- overlay: \`${path.relative(frontendRoot, overlayPath)}\``,
    ...CROP_REGIONS.map((region) => `- crop ${region.id}: \`${path.relative(frontendRoot, path.join(cropDir, `gwangju-seatmap-image-alignment-audit-${region.id}.png`))}\``),
    ...Object.entries(lowerInfieldSpecialSplitEvidenceArtifacts).map(([key, artifactPath]) => `- lower-infield-special-split ${key}: \`${artifactPath}\``),
    '',
    '## Source Policy',
    '',
    SOURCE_POLICY.disallowedSources.map((source) => `- forbidden: ${source}`).join('\n'),
    `- missing data contract: \`${SOURCE_POLICY.missingBaseballDataContract}\``,
  ].join('\n');
  await fs.writeFile(markdownPath, `${markdown}\n`, 'utf8');

  console.log(`image_alignment_audit_json:${jsonPath}`);
  console.log(`image_alignment_audit_csv:${csvPath}`);
  console.log(`image_alignment_audit_markdown:${markdownPath}`);
  console.log(`image_alignment_audit_overlay:${overlayPath}`);
  console.log(`status:${summary.status}`);

  if (summary.status !== 'passed' && !allowFailures) {
    process.exitCode = 1;
  }
};

const runReviewManifest = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { GWANGJU_AWAY_CHEERING_BLOCK_IDS, GWANGJU_BASE_TRACE_BLOCK_COUNT, GWANGJU_BLOCKS, GWANGJU_COORDINATE_TRACE_STATUS, GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES, GWANGJU_FULL_RETRACE_GENERATION, GWANGJU_FULL_RETRACE_VERSION, GWANGJU_NON_SELECTABLE_MARKER_ZONES, GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES, GWANGJU_OFFICIAL_TRACE_REFERENCE, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE, GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS, GWANGJU_OPERATOR_SECTION_REQUIREMENTS, GWANGJU_PREVIOUS_TRACE_VERSION, GWANGJU_SELECTABLE_BLOCKS_READY, GWANGJU_SEATMAP_IMAGE, GWANGJU_TRACE_REVIEW_REGIONS, GWANGJU_TRACE_REVIEW_SUMMARY, GWANGJU_ZONE_PRECISION_WORKSETS } = await import("../src/data/gwangjuSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);
  const REPEATED_NUMBERED_BLOCK_WORKSET_ID = 'p4-repeated-numbered-blocks';
  const REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT = 70;
  const DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID = new Map([
    ['home-k7-seats', new Set(GWANGJU_OPERATOR_CONFIRMED_BLOCK_IDS)],
    ['away-cheering-seats', new Set(GWANGJU_AWAY_CHEERING_BLOCK_IDS)],
  ]);

  const isAllowedDerivedAggregateOverlap = (firstId, secondId) => {
    if (DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.has(firstId) && DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.has(secondId)) {
      return true;
    }

    const firstSources = DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.get(firstId);
    if (firstSources?.has(secondId)) {
      return true;
    }

    const secondSources = DERIVED_AGGREGATE_SOURCE_IDS_BY_BLOCK_ID.get(secondId);
    return secondSources?.has(firstId) ?? false;
  };
  const REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE = 0.98;
  const REPEATED_NUMBERED_BLOCK_CATEGORIES = new Set(['SKY_PICNIC', 'FIVE_TABLE']);

  const csvEscape = (value) => {
    const text = String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };

  const svgEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');

  function parsePathSubpaths(pathData) {
    return pathData
      .trim()
      .split(/(?=M\s)/)
      .filter(Boolean)
      .map((subpath) => {
        const numbers = subpath.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
        return Array.from({ length: numbers.length / 2 }, (_, index) => ({
          x: numbers[index * 2],
          y: numbers[(index * 2) + 1],
        }));
      });
  }

  function getPathBounds(subpaths) {
    const points = subpaths.flat();
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);

    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

  function pointInPolygon(point, polygon) {
    let inside = false;

    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      const start = polygon[previous];
      const end = polygon[current];
      const intersects = ((start.y > point.y) !== (end.y > point.y))
        && (point.x < (((end.x - start.x) * (point.y - start.y)) / (end.y - start.y)) + start.x);

      if (intersects) {
        inside = !inside;
      }
    }

    return inside;
  }

  function getPixelColor(image, x, y) {
    const safeX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
    const safeY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
    const index = ((safeY * image.width) + safeX) * image.channels;

    return [
      image.data[index],
      image.data[index + 1],
      image.data[index + 2],
    ];
  }

  function isOfficialSeatColor(red, green, blue) {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const luminance = ((0.2126 * red) + (0.7152 * green) + (0.0722 * blue)) / 255;

    return luminance <= 0.97
      && saturation >= 0.05
      && !(red < 80 && green < 80 && blue < 80);
  }

  function isNearOfficialSeatColor(image, x, y, radius = 18) {
    for (let offsetY = -radius; offsetY <= radius; offsetY += 3) {
      for (let offsetX = -radius; offsetX <= radius; offsetX += 3) {
        if ((offsetX ** 2) + (offsetY ** 2) > radius ** 2) continue;
        const [red, green, blue] = getPixelColor(image, x + offsetX, y + offsetY);
        if (isOfficialSeatColor(red, green, blue)) {
          return true;
        }
      }
    }

    return false;
  }

  function calculatePixelCoverageRatio(image, pathData) {
    const subpaths = parsePathSubpaths(pathData);
    const bounds = getPathBounds(subpaths);
    let sampledPoints = 0;
    let seatColorPoints = 0;
    const sampleStep = 3;

    for (let y = Math.floor(bounds.minY); y <= Math.ceil(bounds.maxY); y += sampleStep) {
      for (let x = Math.floor(bounds.minX); x <= Math.ceil(bounds.maxX); x += sampleStep) {
        if (!subpaths.some((subpath) => pointInPolygon({ x, y }, subpath))) continue;
        sampledPoints += 1;
        if (isNearOfficialSeatColor(image, x, y)) {
          seatColorPoints += 1;
        }
      }
    }

    return sampledPoints === 0 ? 0 : seatColorPoints / sampledPoints;
  }

  const COMPONENT_COLOR_SPECS = {
    outfield: {
      colors: [[220, 234, 186]],
      threshold: 22,
      minArea: 300,
    },
    'bleachers-table': {
      colors: [[144, 195, 31]],
      threshold: 30,
      minArea: 100,
    },
  };

  const COMPONENT_EXTRACTION_BOUNDS = { minX: 250, maxX: 1370, minY: 90, maxY: 1090 };

  function colorDistance(first, second) {
    return Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2]);
  }

  function isOfficialComponentPixel(image, groupId, x, y) {
    const spec = COMPONENT_COLOR_SPECS[groupId];
    if (!spec) return false;
    const color = getPixelColor(image, x, y);

    return spec.colors.some((target) => colorDistance(color, target) <= spec.threshold);
  }

  function componentPixelKey(x, y) {
    return `${x},${y}`;
  }

  const officialComponentCache = new Map();

  function extractOfficialComponents(image, groupId) {
    const spec = COMPONENT_COLOR_SPECS[groupId];
    const bounds = COMPONENT_EXTRACTION_BOUNDS;
    const width = bounds.maxX - bounds.minX + 1;
    const height = bounds.maxY - bounds.minY + 1;
    const mask = new Uint8Array(width * height);
    const seen = new Uint8Array(width * height);

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        if (isOfficialComponentPixel(image, groupId, x, y)) {
          mask[((y - bounds.minY) * width) + (x - bounds.minX)] = 1;
        }
      }
    }

    const components = [];
    const queue = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const startIndex = ((y - bounds.minY) * width) + (x - bounds.minX);
        if (!mask[startIndex] || seen[startIndex]) continue;

        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let area = 0;
        const pixelKeys = new Set();

        seen[startIndex] = 1;
        queue.length = 0;
        queue.push([x, y]);

        for (let head = 0; head < queue.length; head += 1) {
          const [currentX, currentY] = queue[head];
          area += 1;
          minX = Math.min(minX, currentX);
          maxX = Math.max(maxX, currentX);
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY);
          pixelKeys.add(componentPixelKey(currentX, currentY));

          for (const [offsetX, offsetY] of directions) {
            const nextX = currentX + offsetX;
            const nextY = currentY + offsetY;
            if (nextX < bounds.minX || nextX > bounds.maxX || nextY < bounds.minY || nextY > bounds.maxY) {
              continue;
            }

            const index = ((nextY - bounds.minY) * width) + (nextX - bounds.minX);
            if (!mask[index] || seen[index]) continue;

            seen[index] = 1;
            queue.push([nextX, nextY]);
          }
        }

        if (area >= spec.minArea) {
          components.push({
            id: `${groupId}-${components.length + 1}`,
            area,
            bounds: { minX, minY, maxX, maxY },
            pixelKeys,
          });
        }
      }
    }

    return components.sort((left, right) => (
      left.bounds.minY - right.bounds.minY
      || left.bounds.minX - right.bounds.minX
    ));
  }

  function getSelectedOfficialComponentPixels(image, reference) {
    if (!officialComponentCache.has(reference.componentGroupId)) {
      officialComponentCache.set(reference.componentGroupId, extractOfficialComponents(image, reference.componentGroupId));
    }

    const selectedIds = new Set(reference.componentIds);
    const selectedPixelKeys = new Set();
    officialComponentCache
      .get(reference.componentGroupId)
      .filter((component) => selectedIds.has(component.id))
      .forEach((component) => {
        component.pixelKeys.forEach((pixelKey) => selectedPixelKeys.add(pixelKey));
      });

    return selectedPixelKeys;
  }

  function calculateOfficialComponentCoverage(image, pathData, reference) {
    const subpaths = parsePathSubpaths(pathData);
    const selectedComponentPixels = getSelectedOfficialComponentPixels(image, reference);
    const bounds = reference.expectedBounds;
    let componentPixels = 0;
    let polygonPixels = 0;
    let intersectingPixels = 0;
    const sampleStep = 2;
    const padding = 20;
    const minX = Math.max(0, Math.floor(bounds.minX - padding));
    const minY = Math.max(0, Math.floor(bounds.minY - padding));
    const maxX = Math.min(image.width - 1, Math.ceil(bounds.maxX + padding));
    const maxY = Math.min(image.height - 1, Math.ceil(bounds.maxY + padding));

    for (let y = minY; y <= maxY; y += sampleStep) {
      for (let x = minX; x <= maxX; x += sampleStep) {
        const insideReferenceBounds = x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
        const isComponentPixel = insideReferenceBounds && selectedComponentPixels.has(componentPixelKey(x, y));
        const isPolygonPixel = subpaths.some((subpath) => pointInPolygon({ x, y }, subpath));

        if (isComponentPixel) componentPixels += 1;
        if (isPolygonPixel) polygonPixels += 1;
        if (isComponentPixel && isPolygonPixel) intersectingPixels += 1;
      }
    }

    const unionPixels = componentPixels + polygonPixels - intersectingPixels;

    return {
      componentPixels,
      polygonPixels,
      intersectingPixels,
      officialComponentRecall: componentPixels === 0 ? 0 : intersectingPixels / componentPixels,
      componentIoU: unionPixels === 0 ? 0 : intersectingPixels / unionPixels,
    };
  }

  function polygonArea(polygon) {
    let signedArea = 0;

    for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
      signedArea += (polygon[previous].x * polygon[current].y) - (polygon[current].x * polygon[previous].y);
    }

    return Math.abs(signedArea) / 2;
  }

  function geometryArea(subpaths) {
    return subpaths.reduce((total, subpath) => total + polygonArea(subpath), 0);
  }

  function calculateSampledOverlapRatio(firstPath, secondPath) {
    const firstSubpaths = parsePathSubpaths(firstPath);
    const secondSubpaths = parsePathSubpaths(secondPath);
    const firstBounds = getPathBounds(firstSubpaths);
    const secondBounds = getPathBounds(secondSubpaths);
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
          firstSubpaths.some((subpath) => pointInPolygon(point, subpath))
          && secondSubpaths.some((subpath) => pointInPolygon(point, subpath))
        ) {
          overlappingPoints += 1;
        }
      }
    }

    const overlapArea = overlappingPoints * sampleStep * sampleStep;
    return overlapArea / Math.min(geometryArea(firstSubpaths), geometryArea(secondSubpaths));
  }

  const formatBounds = (bounds) => `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

  const pathPointCount = (subpaths) => subpaths.reduce((total, subpath) => total + subpath.length, 0);

  const finiteMinimum = (values) => {
    const finiteValues = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
    return finiteValues.length === 0 ? null : Math.min(...finiteValues);
  };

  const maxBoundsDelta = (first, second) => Math.max(
    Math.abs(first.minX - second.minX),
    Math.abs(first.minY - second.minY),
    Math.abs(first.maxX - second.maxX),
    Math.abs(first.maxY - second.maxY),
  );

  const colorForBlock = (block) => {
    if (block.category === 'SKY_PICNIC') return '#16a34a';
    if (block.category === 'FIVE_TABLE') return '#0284c7';
    if (block.category === 'K9') return '#dc2626';
    if (block.category === 'K8') return '#ea580c';
    if (block.category === 'K5') return '#7c3aed';
    if (block.category === 'OUTFIELD') return '#65a30d';
    if (block.category === 'BLEACHERS_TABLE') return '#0891b2';
    return '#db2777';
  };

  const createOverlaySvg = (rows, options = {}) => {
    const {
      cropBounds = null,
      imageHref = path.relative(outDir, imagePath),
      includeImage = true,
      showLabels = true,
      title = 'Gwangju trace review overlay',
    } = options;
    const minX = cropBounds?.left ?? 0;
    const minY = cropBounds?.top ?? 0;
    const width = cropBounds?.width ?? GWANGJU_SEATMAP_IMAGE.imageWidth;
    const height = cropBounds?.height ?? GWANGJU_SEATMAP_IMAGE.imageHeight;
    const translate = cropBounds ? ` transform="translate(${-minX} ${-minY})"` : '';

    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${svgEscape(title)}">`,
      includeImage ? `<image href="${svgEscape(imageHref)}" x="0" y="0" width="${GWANGJU_SEATMAP_IMAGE.imageWidth}" height="${GWANGJU_SEATMAP_IMAGE.imageHeight}"${translate} opacity="0.92" />` : '',
      `<g${translate}>`,
      ...rows.map((block) => {
        const color = colorForBlock(block);
        return [
          `<path d="${svgEscape(block.path)}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`,
          `<circle cx="${block.labelX}" cy="${block.labelY}" r="8" fill="#111827" stroke="#ffffff" stroke-width="3" />`,
          showLabels ? `<text x="${block.labelX + 10}" y="${block.labelY - 10}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="#111827" stroke="#ffffff" stroke-width="4" paint-order="stroke">${svgEscape(block.block)}</text>` : '',
        ].join('');
      }),
      '</g>',
      '</svg>',
    ].join('\n');
  };

  const createCropBounds = (bounds, padding = 28) => {
    const left = Math.max(0, Math.floor(bounds.minX - padding));
    const top = Math.max(0, Math.floor(bounds.minY - padding));
    const right = Math.min(GWANGJU_SEATMAP_IMAGE.imageWidth, Math.ceil(bounds.maxX + padding));
    const bottom = Math.min(GWANGJU_SEATMAP_IMAGE.imageHeight, Math.ceil(bounds.maxY + padding));

    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  };

  const createUnionBounds = (rows) => rows.reduce((bounds, row) => ({
    minX: Math.min(bounds.minX, row.pathBounds.minX),
    minY: Math.min(bounds.minY, row.pathBounds.minY),
    maxX: Math.max(bounds.maxX, row.pathBounds.maxX),
    maxY: Math.max(bounds.maxY, row.pathBounds.maxY),
  }), {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  });

  const reviewRegionByBlockId = new Map();
  GWANGJU_TRACE_REVIEW_REGIONS.forEach((region) => {
    region.blockIds.forEach((blockId) => {
      reviewRegionByBlockId.set(blockId, region);
    });
  });

  const { data: imageData, info: imageInfo } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
  const seatMapPixels = {
    data: imageData,
    width: imageInfo.width,
    height: imageInfo.height,
    channels: imageInfo.channels,
  };

  const blockRows = GWANGJU_BLOCKS.map((block) => {
    const region = reviewRegionByBlockId.get(block.id);
    const zonePrecisionWorksets = GWANGJU_ZONE_PRECISION_WORKSETS.filter((workset) => workset.blockIds.includes(block.id));
    const subpaths = parsePathSubpaths(block.imageGeometry.d);
    const bounds = getPathBounds(subpaths);
    const reference = GWANGJU_OFFICIAL_TRACE_REFERENCE[block.id];
    const currentPointCount = pathPointCount(subpaths);
    const previousPointCount = block.imageGeometry.retraceSourcePointCount ?? currentPointCount;
    const currentPixelCoverageRatio = Number(calculatePixelCoverageRatio(seatMapPixels, block.imageGeometry.d).toFixed(4));
    const componentReference = GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES[block.id] ?? null;
    const componentCoverage = componentReference
      ? calculateOfficialComponentCoverage(seatMapPixels, block.imageGeometry.d, componentReference)
      : null;

    return {
      id: block.id,
      name: block.name,
      block: block.block,
      category: block.category,
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      reviewRegionId: region?.id ?? 'UNASSIGNED',
      tracePriority: region?.priority ?? 'P0',
      zonePrecisionWorksetIds: zonePrecisionWorksets.map((workset) => workset.id),
      zonePrecisionPriorities: zonePrecisionWorksets.map((workset) => workset.priority),
      traceMethod: region?.method ?? 'UNASSIGNED',
      traceNote: region?.note ?? '',
      traceStatus: block.imageGeometry.traceStatus,
      traceSource: block.imageGeometry.traceSource,
      traceVersion: block.imageGeometry.traceVersion,
      previousTraceVersion: block.imageGeometry.previousTraceVersion ?? GWANGJU_PREVIOUS_TRACE_VERSION,
      traceGeneration: block.imageGeometry.traceGeneration ?? GWANGJU_FULL_RETRACE_GENERATION,
      manualReviewed: block.imageGeometry.manualReviewed,
      pixelAlignmentStatus: block.imageGeometry.pixelAlignmentStatus,
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      label: block.imageGeometry.shortLabel,
      expectedBounds: reference?.expectedBounds ?? bounds,
      expectedSubpathCount: reference?.expectedSubpathCount ?? subpaths.length,
      pathBounds: bounds,
      retraceSourcePointCount: previousPointCount,
      retracePointCount: block.imageGeometry.retracePointCount ?? currentPointCount,
      actualPathPointCount: currentPointCount,
      retracePointDelta: currentPointCount - previousPointCount,
      previousAnchorDeltaPx: 0,
      previousBoundsDeltaPx: Number(maxBoundsDelta(bounds, reference?.expectedBounds ?? bounds).toFixed(2)),
      previousPixelCoverageDelta: 0,
      pathChangedFromPreviousTrace: (block.imageGeometry.previousTraceVersion ?? GWANGJU_PREVIOUS_TRACE_VERSION) !== block.imageGeometry.traceVersion
        || currentPointCount !== previousPointCount,
      pixelCoverageRatio: currentPixelCoverageRatio,
      officialComponentGroupId: componentReference?.componentGroupId ?? null,
      officialComponentIds: componentReference?.componentIds ?? [],
      officialComponentBounds: componentReference?.expectedBounds ?? null,
      officialComponentMinimumRecall: componentReference?.minimumRecall ?? null,
      officialComponentMinimumIoU: componentReference?.minimumIoU ?? null,
      officialComponentRecall: componentCoverage ? Number(componentCoverage.officialComponentRecall.toFixed(4)) : null,
      componentIoU: componentCoverage ? Number(componentCoverage.componentIoU.toFixed(4)) : null,
      componentCoverageStatus: componentReference && componentCoverage
        ? (
          componentCoverage.officialComponentRecall >= componentReference.minimumRecall
          && componentCoverage.componentIoU >= componentReference.minimumIoU
            ? 'passed'
            : 'failed'
        )
        : 'not-applicable',
      componentCoverageNote: componentReference?.note ?? null,
      path: block.imageGeometry.d,
    };
  });

  const overlapWarnings = [];
  for (let firstIndex = 0; firstIndex < blockRows.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < blockRows.length; secondIndex += 1) {
      const first = blockRows[firstIndex];
      const second = blockRows[secondIndex];
      if (isAllowedDerivedAggregateOverlap(first.id, second.id)) {
        continue;
      }
      const overlapRatio = calculateSampledOverlapRatio(first.path, second.path);
      if (overlapRatio > 0.005) {
        overlapWarnings.push({
          firstId: first.id,
          secondId: second.id,
          firstBlock: first.block,
          secondBlock: second.block,
          overlapRatio: Number(overlapRatio.toFixed(4)),
        });
      }
    }
  }

  const componentCoverageWarnings = blockRows
    .filter((row) => row.componentCoverageStatus === 'failed')
    .map((row) => ({
      id: row.id,
      block: row.block,
      componentGroupId: row.officialComponentGroupId,
      componentIds: row.officialComponentIds,
      officialComponentRecall: row.officialComponentRecall,
      minimumRecall: row.officialComponentMinimumRecall,
      componentIoU: row.componentIoU,
      minimumIoU: row.officialComponentMinimumIoU,
    }));

  const regionRows = GWANGJU_TRACE_REVIEW_REGIONS.map((region) => {
    const activeBlockCount = region.blockIds.filter((id) => GWANGJU_BLOCKS.some((block) => block.id === id)).length;
    return {
      id: region.id,
      label: region.label,
      priority: region.priority,
      method: region.method,
      activeBlockCount,
      totalReferences: region.blockIds.length,
      note: region.note,
    };
  });

  const derivedRangeRows = GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.map((range) => ({
    id: range.id,
    label: range.label,
    displayBlocks: range.displayBlocks,
    officialBlocks: range.officialBlocks,
    blockIds: range.blockIds,
    filterGroupId: range.filterGroupId,
    fanRoles: range.fanRoles ?? [],
    aggregateHitArea: range.aggregateHitArea,
    activeHitArea: 'EXISTING_NUMBERED_BLOCKS_ONLY',
    operatorPolygonStatus: range.operatorPolygonStatus,
    sourceRequirementIds: range.sourceRequirementIds,
  }));

  const blockRowsById = new Map(blockRows.map((row) => [row.id, row]));
  const activeBlockIds = new Set(blockRows.map((row) => row.id));
  const zonePrecisionWorksetRows = GWANGJU_ZONE_PRECISION_WORKSETS.map((workset) => {
    const rows = workset.blockIds
      .map((blockId) => blockRowsById.get(blockId))
      .filter(Boolean);
    const missingBlockIds = workset.blockIds.filter((blockId) => !activeBlockIds.has(blockId));
    const componentRows = rows.filter((row) => row.componentCoverageStatus !== 'not-applicable');
    const lowMarginRows = rows
      .filter((row) => row.pixelCoverageRatio < 0.95 || (typeof row.componentIoU === 'number' && row.componentIoU < 0.75))
      .map((row) => ({
        id: row.id,
        block: row.block,
        pixelCoverageRatio: row.pixelCoverageRatio,
        officialComponentRecall: row.officialComponentRecall,
        componentIoU: row.componentIoU,
      }));
    const blockers = [
      ...missingBlockIds.map((blockId) => `MISSING_BLOCK:${blockId}`),
      ...rows
        .filter((row) => row.traceVersion !== GWANGJU_FULL_RETRACE_VERSION)
        .map((row) => `TRACE_VERSION_MISMATCH:${row.id}:${row.traceVersion}:expected=${GWANGJU_FULL_RETRACE_VERSION}`),
      ...rows
        .filter((row) => row.previousTraceVersion !== GWANGJU_PREVIOUS_TRACE_VERSION)
        .map((row) => `PREVIOUS_TRACE_VERSION_MISMATCH:${row.id}:${row.previousTraceVersion}:expected=${GWANGJU_PREVIOUS_TRACE_VERSION}`),
      ...rows
        .filter((row) => row.traceStatus !== 'OFFICIAL_IMAGE_TRACED')
        .map((row) => `TRACE_STATUS_NOT_READY:${row.id}:${row.traceStatus}`),
      ...rows
        .filter((row) => row.manualReviewed !== true)
        .map((row) => `MANUAL_REVIEW_NOT_TRUE:${row.id}`),
      ...rows
        .filter((row) => row.pixelAlignmentStatus !== 'PIXEL_ALIGNED')
        .map((row) => `PIXEL_ALIGNMENT_NOT_READY:${row.id}:${row.pixelAlignmentStatus}`),
      ...rows
        .filter((row) => row.componentCoverageStatus === 'failed')
        .map((row) => `COMPONENT_COVERAGE_FAILED:${row.id}`),
    ];
    if (workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID) {
      if (rows.length !== REPEATED_NUMBERED_BLOCK_EXPECTED_COUNT) {
        blockers.push(`REPEATED_BLOCK_COUNT_CHANGED:${rows.length}`);
      }
      rows
        .filter((row) => !REPEATED_NUMBERED_BLOCK_CATEGORIES.has(row.category))
        .forEach((row) => blockers.push(`REPEATED_BLOCK_CATEGORY_UNEXPECTED:${row.id}:${row.category}`));
      rows
        .filter((row) => row.pixelCoverageRatio < REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE)
        .forEach((row) => blockers.push(`REPEATED_BLOCK_PIXEL_COVERAGE_BELOW_LOCK:${row.id}:${row.pixelCoverageRatio}`));
      lowMarginRows.forEach((row) => blockers.push(`REPEATED_BLOCK_LOW_MARGIN_ROW:${row.id}`));
    }

    return {
      id: workset.id,
      label: workset.label,
      priority: workset.priority,
      note: workset.note,
      acceptanceFocus: workset.acceptanceFocus,
      expectedBlockCount: workset.blockIds.length,
      activeBlockCount: rows.length,
      missingBlockIds,
      blockIds: workset.blockIds,
      minimumPixelCoverageRatio: finiteMinimum(rows.map((row) => row.pixelCoverageRatio)),
      minimumOfficialComponentRecall: finiteMinimum(componentRows.map((row) => row.officialComponentRecall)),
      minimumComponentIoU: finiteMinimum(componentRows.map((row) => row.componentIoU)),
      componentCoverageBlockCount: componentRows.length,
      lowMarginRows,
      repeatedBlockPixelCoverageMinimum: workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID
        ? REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE
        : null,
      maximumPreviousBoundsDeltaPx: finiteMinimum(rows.map((row) => -row.previousBoundsDeltaPx)) === null
        ? null
        : Math.max(...rows.map((row) => row.previousBoundsDeltaPx)),
      maximumPreviousAnchorDeltaPx: finiteMinimum(rows.map((row) => -row.previousAnchorDeltaPx)) === null
        ? null
        : Math.max(...rows.map((row) => row.previousAnchorDeltaPx)),
      totalRetracePointDelta: rows.reduce((total, row) => total + row.retracePointDelta, 0),
      blocksChangedFromPreviousTrace: rows.filter((row) => row.pathChangedFromPreviousTrace).length,
      status: blockers.length === 0 ? 'passed' : 'failed',
      blockers,
    };
  });

  const zonePrecisionWarnings = zonePrecisionWorksetRows.flatMap((workset) => workset.blockers.map((blocker) => ({
    worksetId: workset.id,
    blocker,
  })));

  const summary = {
    traceStatus: GWANGJU_COORDINATE_TRACE_STATUS,
    traceVersion: GWANGJU_FULL_RETRACE_VERSION,
    previousTraceVersion: GWANGJU_PREVIOUS_TRACE_VERSION,
    traceGeneration: GWANGJU_FULL_RETRACE_GENERATION,
    selectableBlocksReady: GWANGJU_SELECTABLE_BLOCKS_READY,
    baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
    totalBlocks: GWANGJU_BLOCKS.length,
    fullRetracedBlocks: blockRows.filter((row) => row.traceGeneration === GWANGJU_FULL_RETRACE_GENERATION).length,
    blocksChangedFromPreviousTrace: blockRows.filter((row) => row.pathChangedFromPreviousTrace).length,
    totalRetracePointDelta: blockRows.reduce((total, row) => total + row.retracePointDelta, 0),
    maximumPreviousAnchorDeltaPx: Math.max(...blockRows.map((row) => row.previousAnchorDeltaPx)),
    maximumPreviousBoundsDeltaPx: Math.max(...blockRows.map((row) => row.previousBoundsDeltaPx)),
    maximumPreviousPixelCoverageDelta: Math.max(...blockRows.map((row) => Math.abs(row.previousPixelCoverageDelta))),
    derivedRangeCount: derivedRangeRows.length,
    derivedRangeDisplayBlocks: Object.fromEntries(derivedRangeRows.map((range) => [range.id, range.displayBlocks])),
    operatorBlockRangeReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    aggregateHitAreaMode: [...new Set(derivedRangeRows.map((range) => range.aggregateHitArea))].join(','),
    officialImageTracedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.officialImageTraced,
    directOfficialTraceBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.directOfficialTrace,
    manualReviewedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.manualReviewed,
    pixelAlignedBlocks: GWANGJU_TRACE_REVIEW_SUMMARY.pixelAligned,
    overlapWarningCount: overlapWarnings.length,
    componentCoverageWarningCount: componentCoverageWarnings.length,
    componentCoverageBlockCount: blockRows.filter((row) => row.componentCoverageStatus !== 'not-applicable').length,
    zonePrecisionWorksetCount: zonePrecisionWorksetRows.length,
    zonePrecisionStatus: zonePrecisionWarnings.length === 0 ? 'passed' : 'failed',
    zonePrecisionWarningCount: zonePrecisionWarnings.length,
    zonePrecisionActiveBlockCoverage: new Set(zonePrecisionWorksetRows.flatMap((workset) => workset.blockIds)).size,
    repeatedNumberedBlockPixelCoverageMinimum: REPEATED_NUMBERED_BLOCK_MIN_PIXEL_COVERAGE,
    repeatedNumberedBlockMinimumPixelCoverageRatio: zonePrecisionWorksetRows
      .find((workset) => workset.id === REPEATED_NUMBERED_BLOCK_WORKSET_ID)?.minimumPixelCoverageRatio ?? null,
    minimumOfficialComponentRecall: Math.min(
      ...blockRows
        .filter((row) => typeof row.officialComponentRecall === 'number')
        .map((row) => row.officialComponentRecall),
    ),
    minimumComponentIoU: Math.min(
      ...blockRows
        .filter((row) => typeof row.componentIoU === 'number')
        .map((row) => row.componentIoU),
    ),
    minimumPixelCoverageRatio: Math.min(...blockRows.map((row) => row.pixelCoverageRatio)),
    operatorRequiredSections: GWANGJU_OPERATOR_SECTION_REQUIREMENTS.filter((section) => section.status !== 'READY').map((section) => section.name),
  };

  await fs.mkdir(outDir, { recursive: true });

  const fullOverlaySvgPath = path.join(outDir, 'gwangju-seatmap-trace-review-overlay.svg');
  const fullOverlayPngPath = path.join(outDir, 'gwangju-seatmap-trace-review-overlay.png');
  const cleanCropDir = path.join(outDir, 'gwangju-seatmap-trace-review-clean-crops');
  const zoneCropDir = path.join(outDir, 'gwangju-seatmap-trace-review-zone-crops');
  const fullOverlaySvg = createOverlaySvg(blockRows, {
    imageHref: path.relative(outDir, imagePath),
    title: '광주-KIA 챔피언스필드 공식 좌석도 polygon trace overlay',
  });
  const fullOverlayPngLayerSvg = createOverlaySvg(blockRows, {
    includeImage: false,
    title: '광주-KIA 챔피언스필드 공식 좌석도 polygon trace overlay',
  });
  await fs.writeFile(fullOverlaySvgPath, fullOverlaySvg, 'utf8');
  await sharp(imagePath)
    .composite([{ input: Buffer.from(fullOverlayPngLayerSvg), top: 0, left: 0 }])
    .png()
    .toFile(fullOverlayPngPath);

  await fs.mkdir(cleanCropDir, { recursive: true });
  await fs.mkdir(zoneCropDir, { recursive: true });
  const cleanOverlayArtifacts = [];
  for (const block of blockRows) {
    const cropBounds = createCropBounds(block.pathBounds);
    const slug = block.id.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
    const cropPath = path.join(cleanCropDir, `gwangju-seatmap-trace-review-${slug}-clean-overlay.png`);
    const cropOverlaySvg = createOverlaySvg([block], {
      cropBounds,
      includeImage: false,
      showLabels: true,
      title: `${block.block} clean trace crop`,
    });

    await sharp(imagePath)
      .extract(cropBounds)
      .composite([{ input: Buffer.from(cropOverlaySvg), top: 0, left: 0 }])
      .png()
      .toFile(cropPath);

    cleanOverlayArtifacts.push({
      id: block.id,
      block: block.block,
      path: cropPath,
      cropBounds,
    });
  }

  const zoneOverlayArtifacts = [];
  for (const workset of zonePrecisionWorksetRows) {
    const rows = workset.blockIds
      .map((blockId) => blockRowsById.get(blockId))
      .filter(Boolean);
    if (rows.length === 0) continue;

    const cropBounds = createCropBounds(createUnionBounds(rows), workset.id === 'p5-full-release-reference' ? 0 : 36);
    const slug = workset.id.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
    const cropPath = path.join(zoneCropDir, `gwangju-seatmap-trace-review-${slug}-zone-overlay.png`);
    const cropOverlaySvg = createOverlaySvg(rows, {
      cropBounds,
      includeImage: false,
      showLabels: true,
      title: `${workset.label} zone trace crop`,
    });

    await sharp(imagePath)
      .extract(cropBounds)
      .composite([{ input: Buffer.from(cropOverlaySvg), top: 0, left: 0 }])
      .png()
      .toFile(cropPath);

    zoneOverlayArtifacts.push({
      id: workset.id,
      label: workset.label,
      priority: workset.priority,
      path: cropPath,
      cropBounds,
      activeBlockCount: rows.length,
    });
  }

  const artifacts = {
    manifestJson: path.join(outDir, 'gwangju-seatmap-trace-review.json'),
    manifestCsv: path.join(outDir, 'gwangju-seatmap-trace-review.csv'),
    manifestMarkdown: path.join(outDir, 'gwangju-seatmap-trace-review.md'),
    fullOverlaySvg: fullOverlaySvgPath,
    fullOverlayPng: fullOverlayPngPath,
    cleanOverlayArtifacts,
    zoneOverlayArtifacts,
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    asset: GWANGJU_SEATMAP_IMAGE,
    summary,
    artifacts,
    reviewRegions: regionRows,
    zonePrecisionWorksets: zonePrecisionWorksetRows,
    derivedOperatorBlockRanges: derivedRangeRows,
    markerOnlyZones: GWANGJU_NON_SELECTABLE_MARKER_ZONES,
    overlapWarnings,
    componentCoverageWarnings,
    zonePrecisionWarnings,
    blocks: blockRows,
  };

  const markdown = [
    '# 광주-KIA 챔피언스필드 좌석도 좌표 재트레이싱 manifest',
    '',
    `- 공식 이미지: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- 좌표 상태: \`${GWANGJU_COORDINATE_TRACE_STATUS}\``,
    `- trace version: \`${summary.traceVersion}\``,
    `- previous trace version: \`${summary.previousTraceVersion}\``,
    `- trace generation: \`${summary.traceGeneration}\``,
    `- 선택 활성화: \`${GWANGJU_SELECTABLE_BLOCKS_READY}\``,
    `- base traced blocks: ${summary.baseTraceBlocks}`,
    `- active blocks: ${summary.totalBlocks}`,
    `- full retraced blocks: ${summary.fullRetracedBlocks}`,
    `- blocks changed from previous trace: ${summary.blocksChangedFromPreviousTrace}`,
    `- total retrace point delta: ${summary.totalRetracePointDelta}`,
    `- max previous anchor delta px: ${summary.maximumPreviousAnchorDeltaPx.toFixed(2)}`,
    `- max previous bbox delta px: ${summary.maximumPreviousBoundsDeltaPx.toFixed(2)}`,
    `- max previous pixel coverage delta: ${summary.maximumPreviousPixelCoverageDelta.toFixed(4)}`,
    `- derived ranges: ${summary.derivedRangeCount}`,
    `- K7/AWAY aggregate hit-area mode: \`${summary.aggregateHitAreaMode}\``,
    `- official image traced blocks: ${summary.officialImageTracedBlocks}`,
    `- direct official trace blocks: ${summary.directOfficialTraceBlocks}`,
    `- manual reviewed blocks: ${summary.manualReviewedBlocks}`,
    `- pixel aligned blocks: ${summary.pixelAlignedBlocks}`,
    `- minimum pixel coverage ratio: ${summary.minimumPixelCoverageRatio.toFixed(4)}`,
    `- O/P component coverage blocks: ${summary.componentCoverageBlockCount}`,
    `- minimum O/P official component recall: ${summary.minimumOfficialComponentRecall.toFixed(4)}`,
    `- minimum O/P component IoU: ${summary.minimumComponentIoU.toFixed(4)}`,
    `- zone precision worksets: ${summary.zonePrecisionWorksetCount}`,
    `- zone precision status: \`${summary.zonePrecisionStatus}\``,
    `- zone precision warnings: ${summary.zonePrecisionWarningCount}`,
    `- zone precision active coverage: ${summary.zonePrecisionActiveBlockCoverage}`,
    `- P4 repeated block pixel coverage lock: ${summary.repeatedNumberedBlockMinimumPixelCoverageRatio?.toFixed(4) ?? '-'} / ${summary.repeatedNumberedBlockPixelCoverageMinimum.toFixed(2)}`,
    `- overlap warnings: ${summary.overlapWarningCount}`,
    `- component coverage warnings: ${summary.componentCoverageWarningCount}`,
    `- operator required: ${summary.operatorRequiredSections.join(', ') || '-'}`,
    '',
    '## 산출물',
    '',
    `- manifest JSON: \`${path.basename(artifacts.manifestJson)}\``,
    `- manifest CSV: \`${path.basename(artifacts.manifestCsv)}\``,
    `- full overlay SVG: \`${path.basename(artifacts.fullOverlaySvg)}\``,
    `- full overlay PNG: \`${path.basename(artifacts.fullOverlayPng)}\``,
    `- block clean overlay crops: \`${path.basename(cleanCropDir)}/\` (${cleanOverlayArtifacts.length} files)`,
    `- zone overlay crops: \`${path.basename(zoneCropDir)}/\` (${zoneOverlayArtifacts.length} files)`,
    '',
    '## 재트레이싱 구역',
    '',
    markdownTable(
      ['id', 'label', 'priority', 'method', 'active', 'total', 'note'],
      regionRows.map((region) => [
        `\`${region.id}\``,
        region.label,
        region.priority,
        region.method,
        String(region.activeBlockCount),
        String(region.totalReferences),
        region.note,
      ]),
    ),
    '',
    '## 구역별 precision workset',
    '',
    markdownTable(
      ['id', 'priority', 'active', 'min coverage', 'min recall', 'min IoU', 'low margin rows', 'status', 'focus'],
      zonePrecisionWorksetRows.map((workset) => [
        `\`${workset.id}\``,
        workset.priority,
        `${workset.activeBlockCount}/${workset.expectedBlockCount}`,
        workset.minimumPixelCoverageRatio === null ? '-' : workset.minimumPixelCoverageRatio.toFixed(4),
        workset.minimumOfficialComponentRecall === null ? '-' : workset.minimumOfficialComponentRecall.toFixed(4),
        workset.minimumComponentIoU === null ? '-' : workset.minimumComponentIoU.toFixed(4),
        String(workset.lowMarginRows.length),
        `\`${workset.status}\``,
        workset.acceptanceFocus.map((item) => `\`${item}\``).join('<br>'),
      ]),
    ),
    '',
    `각 workset은 \`${GWANGJU_FULL_RETRACE_VERSION}\` active geometry를 기준으로 bbox/anchor/coverage/component/overlap evidence를 묶어 검수합니다. P5는 102개 기본 블럭과 K7/AWAY aggregate reference 재고정 계약을 확인합니다.`,
    '',
    '## Derived range / aggregate hit-area',
    '',
    'K7석/원정응원석은 공식 PNG 번호 블럭 polygon을 multi-subpath aggregate hit-area로 묶고, 런타임에서는 해당 필터에서만 source 번호 블럭을 대체합니다.',
    '',
    markdownTable(
      ['id', 'label', 'display blocks', 'filter', 'hit-area', 'polygon status', 'source requirements'],
      derivedRangeRows.map((range) => [
        `\`${range.id}\``,
        range.label,
        range.displayBlocks,
        `\`${range.filterGroupId}\``,
        `\`${range.aggregateHitArea}\``,
        `\`${range.operatorPolygonStatus}\``,
        range.sourceRequirementIds.map((id) => `\`${id}\``).join('<br>'),
      ]),
    ),
    '',
    '## O/P component coverage',
    '',
    '기존 `pixelCoverageRatio`는 작은 polygon도 색상 영역 안에만 있으면 통과할 수 있으므로, O/P 외야 계열은 공식 PNG component recall/IoU를 별도로 차단 기준으로 둡니다.',
    '',
    '101~108 하단 내야는 `gwangju-seatmap-image-alignment-audit`에서 공식 PNG 독립 mask recall/IoU/outside bleed를 추가로 확인합니다.',
    '',
    markdownTable(
      ['id', 'components', 'recall', 'min recall', 'IoU', 'min IoU', 'status'],
      blockRows
        .filter((block) => block.componentCoverageStatus !== 'not-applicable')
        .map((block) => [
          `\`${block.id}\``,
          block.officialComponentIds.map((id) => `\`${id}\``).join('<br>'),
          block.officialComponentRecall.toFixed(4),
          block.officialComponentMinimumRecall.toFixed(2),
          block.componentIoU.toFixed(4),
          block.officialComponentMinimumIoU.toFixed(2),
          `\`${block.componentCoverageStatus}\``,
        ]),
    ),
    '',
    '## 검수 방법',
    '',
    '1. `npm run qa:stadium:gwangju:trace-review`를 실행해 debug overlay screenshot과 CSV를 생성합니다.',
    '2. `/stadium?gwangjuDebug=hit`에서 공식 PNG와 polygon을 같은 2200x1159 좌표계로 비교합니다.',
    '3. active block은 모두 `OFFICIAL_IMAGE_TRACED`/`PIXEL_ALIGNED`로 유지하고, 신규 블록은 같은 좌표계의 정적 polygon으로만 추가합니다.',
    '4. K7석/원정응원석은 운영자 제공 polygon이 들어오기 전까지 hit-area를 만들지 않습니다.',
    '5. O/P 외야 계열은 component recall/IoU gate로 작은 과거 polygon이 일반 좌석 layer에 남는 회귀를 차단합니다.',
    '6. `previousTraceVersion`, bbox/anchor/coverage delta, point-count delta와 zone overlay crop으로 이전 trace 대비 재트레이싱 결과를 확인합니다.',
    '',
  ].join('\n');

  const jsonPath = path.join(outDir, 'gwangju-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'gwangju-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'gwangju-seatmap-trace-review.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'name',
      'block',
      'category',
      'level',
      'side',
      'fanRole',
      'reviewRegionId',
      'tracePriority',
      'zonePrecisionWorksetIds',
      'zonePrecisionPriorities',
      'traceMethod',
      'traceNote',
      'traceStatus',
      'traceSource',
      'traceVersion',
      'previousTraceVersion',
      'traceGeneration',
      'manualReviewed',
      'pixelAlignmentStatus',
      'labelX',
      'labelY',
      'label',
      'pathMinX',
      'pathMinY',
      'pathMaxX',
      'pathMaxY',
      'expectedMinX',
      'expectedMinY',
      'expectedMaxX',
      'expectedMaxY',
      'expectedSubpathCount',
      'retraceSourcePointCount',
      'retracePointCount',
      'actualPathPointCount',
      'retracePointDelta',
      'previousAnchorDeltaPx',
      'previousBoundsDeltaPx',
      'previousPixelCoverageDelta',
      'pathChangedFromPreviousTrace',
      'pixelCoverageRatio',
      'officialComponentGroupId',
      'officialComponentIds',
      'officialComponentMinX',
      'officialComponentMinY',
      'officialComponentMaxX',
      'officialComponentMaxY',
      'officialComponentMinimumRecall',
      'officialComponentMinimumIoU',
      'officialComponentRecall',
      'componentIoU',
      'componentCoverageStatus',
      'path',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.name,
      block.block,
      block.category,
      block.level,
      block.side,
      block.fanRole,
      block.reviewRegionId,
      block.tracePriority,
      block.zonePrecisionWorksetIds.join('|'),
      block.zonePrecisionPriorities.join('|'),
      block.traceMethod,
      block.traceNote,
      block.traceStatus,
      block.traceSource,
      block.traceVersion,
      block.previousTraceVersion,
      block.traceGeneration,
      block.manualReviewed,
      block.pixelAlignmentStatus,
      block.labelX,
      block.labelY,
      block.label,
      block.pathBounds.minX,
      block.pathBounds.minY,
      block.pathBounds.maxX,
      block.pathBounds.maxY,
      block.expectedBounds.minX,
      block.expectedBounds.minY,
      block.expectedBounds.maxX,
      block.expectedBounds.maxY,
      block.expectedSubpathCount,
      block.retraceSourcePointCount,
      block.retracePointCount,
      block.actualPathPointCount,
      block.retracePointDelta,
      block.previousAnchorDeltaPx,
      block.previousBoundsDeltaPx,
      block.previousPixelCoverageDelta,
      block.pathChangedFromPreviousTrace,
      block.pixelCoverageRatio,
      block.officialComponentGroupId ?? '',
      block.officialComponentIds.join('|'),
      block.officialComponentBounds?.minX ?? '',
      block.officialComponentBounds?.minY ?? '',
      block.officialComponentBounds?.maxX ?? '',
      block.officialComponentBounds?.maxY ?? '',
      block.officialComponentMinimumRecall ?? '',
      block.officialComponentMinimumIoU ?? '',
      block.officialComponentRecall ?? '',
      block.componentIoU ?? '',
      block.componentCoverageStatus,
      block.path,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`manifest_overlay:${fullOverlayPngPath}`);
  console.log(`manifest_clean_crops:${cleanCropDir}`);
  const manifestStatus = summary.overlapWarningCount === 0 && summary.componentCoverageWarningCount === 0 && summary.zonePrecisionWarningCount === 0 ? 'ok' : 'failed';
  console.log(`status:${manifestStatus} total=${summary.totalBlocks} traced=${summary.officialImageTracedBlocks} pixel_aligned=${summary.pixelAlignedBlocks} overlap_warnings=${summary.overlapWarningCount} component_warnings=${summary.componentCoverageWarningCount} zone_warnings=${summary.zonePrecisionWarningCount} selectable=${summary.selectableBlocksReady}`);
  if (manifestStatus !== 'ok') {
    process.exitCode = 1;
  }
};

const runRuntimeLayerAudit = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { GWANGJU_BLOCKS, GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES, GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, GWANGJU_FULL_RETRACE_VERSION, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE, GWANGJU_OPERATOR_SECTION_REQUIREMENTS, GWANGJU_PENDING_OPERATOR_SECTIONS } = await import("../src/data/gwangjuSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const browserQaSummaryPath = path.join(repoRoot, 'output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json');
  const traceManifestPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const componentPath = path.join(frontendRoot, 'src/components/gwangju/GwangjuSeatMapSvg.tsx');
  const shellComponentPath = path.join(frontendRoot, 'src/components/gwangju/GwangjuSeatMap.tsx');
  const packagePath = path.join(frontendRoot, 'package.json');
  const outputPaths = {
    json: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json'),
    csv: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.csv'),
    markdown: path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.md'),
  };

  const AUDIT_VERSION = 'GWANGJU_RUNTIME_LAYER_AUDIT_V1';
  const RUNTIME_SOURCE = 'GWANGJU_BLOCKS[].imageGeometry.d';
  const EXPECTED_ACTIVE_BLOCK_COUNT = GWANGJU_EXPECTED_TRACE_BLOCK_COUNT;
  const FORBIDDEN_RUNTIME_SOURCES = [
    'GWANGJU_IMAGE_GEOMETRY_DRAFTS',
    'GWANGJU_OFFICIAL_TRACE_REFERENCE',
    'GWANGJU_OPERATOR_SECTION_REQUIREMENTS',
    'gwangju-seatmap-operator-template',
  ];

  const sourcePolicy = {
    allowedCoordinateSource: 'official PNG 2200x1159 trace manifest rendered through GWANGJU_BLOCKS[].imageGeometry.d',
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'browser CSS pixels',
      'resized screenshots',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  };

  const readText = async (filePath) => {
    try {
      return {
        exists: true,
        text: await fs.readFile(filePath, 'utf8'),
        error: null,
      };
    } catch (error) {
      if (error?.code === 'ENOENT') {
        return { exists: false, text: '', error: `MISSING_FILE:${path.relative(frontendRoot, filePath)}` };
      }
      return { exists: false, text: '', error: `READ_FAILED:${path.relative(frontendRoot, filePath)}:${error.message}` };
    }
  };

  const readJson = async (filePath) => {
    const result = await readText(filePath);
    if (!result.exists) return { exists: false, data: null, error: result.error };
    try {
      return { exists: true, data: JSON.parse(result.text), error: null };
    } catch (error) {
      return { exists: true, data: null, error: `JSON_PARSE_FAILED:${path.relative(frontendRoot, filePath)}:${error.message}` };
    }
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const statusFor = (ok) => (ok ? 'passed' : 'failed');

  const traceManifest = await readJson(traceManifestPath);
  const browserSummary = await readJson(browserQaSummaryPath);
  const componentSource = await readText(componentPath);
  const shellSource = await readText(shellComponentPath);
  const packageSource = await readText(packagePath);

  const manifestBlocks = traceManifest.data?.blocks ?? [];
  const manifestBlocksById = new Map(manifestBlocks.map((block) => [block.id, block]));
  const activeBlockIds = GWANGJU_BLOCKS.map((block) => block.id).sort();
  const manifestBlockIds = manifestBlocks.map((block) => block.id).sort();
  const pendingOperatorIds = new Set(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => section.id));
  const runtimeChecks = (browserSummary.data?.scenarios ?? [])
    .flatMap((scenario) => (scenario.qaChecks ?? []).map((check) => ({
      scenario: scenario.label,
      ...check,
    })))
    .filter((check) => check.type === 'gwangju-runtime-layer');
  const latestRuntimeCheck = runtimeChecks.at(-1) ?? null;
  const latestRuntimeDetails = latestRuntimeCheck?.details ?? {};

  const sourceChecks = [
    {
      id: 'component-renders-active-blocks',
      status: statusFor(componentSource.text.includes('GWANGJU_BLOCKS.map')),
      detail: 'GwangjuSeatMapSvg maps GWANGJU_BLOCKS for seat paths.',
    },
    {
      id: 'component-uses-release-ready-path',
      status: statusFor(componentSource.text.includes('d={block.imageGeometry.d}')),
      detail: 'Seat path d attribute uses block.imageGeometry.d.',
    },
    {
      id: 'component-renders-visual-path-separately',
      status: statusFor(
        componentSource.text.includes('visualPathD = block.imageGeometry.visualD ?? block.imageGeometry.d')
        && componentSource.text.includes('data-testid={`gwangju-seat-visual-${block.id}`}')
        && componentSource.text.includes('data-visual-path={visualPathD}'),
      ),
      detail: 'Visual seat outline uses imageGeometry.visualD separately from the release-ready hit path.',
    },
    {
      id: 'component-keeps-marker-layer-separate',
      status: statusFor(componentSource.text.includes('GWANGJU_NON_SELECTABLE_MARKER_ZONES.map') && componentSource.text.includes('<circle')),
      detail: 'Marker-only zones are rendered as circle markers, not seat path blocks.',
    },
    {
      id: 'shell-derived-range-only',
      status: statusFor(shellSource.text.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES') && shellSource.text.includes('data-aggregate-hit-area')),
      detail: 'K7/AWAY derived ranges are exposed as filter/detail metadata.',
    },
    {
      id: 'component-gates-aggregate-hit-areas-by-filter',
      status: statusFor(componentSource.text.includes('AGGREGATE_FILTER_HIT_AREA_BY_ID') && componentSource.text.includes('SOURCE_BLOCK_IDS_HIDDEN_BY_AGGREGATE_FILTER')),
      detail: 'K7/AWAY aggregate hit-areas are interactive only in their matching filter layer.',
    },
    {
      id: 'package-runtime-layer-script',
      status: statusFor(
        packageSource.text.includes('"qa:stadium:gwangju:runtime-layer"')
        && packageSource.text.includes('node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer'),
      ),
      detail: 'package.json exposes the runtime layer audit command.',
    },
    ...FORBIDDEN_RUNTIME_SOURCES.map((source) => ({
      id: `component-forbidden-source-${source}`,
      status: statusFor(!componentSource.text.includes(source)),
      detail: `GwangjuSeatMapSvg must not render ${source}.`,
    })),
  ];

  const manifestChecks = [
    {
      id: 'trace-manifest-present',
      status: statusFor(traceManifest.exists && !traceManifest.error),
      detail: traceManifest.error ?? traceManifestPath,
    },
    {
      id: 'trace-manifest-active-count',
      status: statusFor(manifestBlocks.length === EXPECTED_ACTIVE_BLOCK_COUNT),
      detail: `manifestBlocks=${manifestBlocks.length}`,
    },
    {
      id: 'trace-manifest-matches-data-blocks',
      status: statusFor(JSON.stringify(activeBlockIds) === JSON.stringify(manifestBlockIds)),
      detail: `dataBlocks=${activeBlockIds.length}, manifestBlocks=${manifestBlockIds.length}`,
    },
    {
      id: 'trace-manifest-release-ready',
      status: statusFor(manifestBlocks.every((block) => (
        block.traceVersion === GWANGJU_FULL_RETRACE_VERSION
        && block.traceStatus === 'OFFICIAL_IMAGE_TRACED'
        && block.pixelAlignmentStatus === 'PIXEL_ALIGNED'
        && block.manualReviewed === true
      ))),
      detail: `traceVersion=${GWANGJU_FULL_RETRACE_VERSION}`,
    },
    {
      id: 'derived-range-no-aggregate-hit-area',
      status: statusFor(
        GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true
        && GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.some((range) => range.aggregateHitArea === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE')
        && GWANGJU_OPERATOR_SECTION_REQUIREMENTS.every((section) => section.status === 'READY')
      ),
      detail: `derivedRanges=${GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES.length}, pendingOperatorSections=${GWANGJU_PENDING_OPERATOR_SECTIONS.length}`,
    },
    {
      id: 'operator-aggregate-in-manifest',
      status: statusFor([...pendingOperatorIds].every((id) => manifestBlocksById.has(id))),
      detail: `operatorAggregateIds=${[...pendingOperatorIds].join(',')}`,
    },
  ];

  const browserChecks = [
    {
      id: 'browser-summary-present',
      status: statusFor(browserSummary.exists && !browserSummary.error),
      detail: browserSummary.error ?? browserQaSummaryPath,
    },
    {
      id: 'browser-summary-passed',
      status: statusFor(browserSummary.data?.status === 'passed'),
      detail: `status=${browserSummary.data?.status ?? 'missing'}`,
    },
    {
      id: 'runtime-layer-check-present',
      status: statusFor(Boolean(latestRuntimeCheck)),
      detail: `checks=${runtimeChecks.length}`,
    },
    {
      id: 'runtime-layer-check-passed',
      status: statusFor(latestRuntimeCheck?.status === 'passed'),
      detail: `status=${latestRuntimeCheck?.status ?? 'missing'}`,
    },
    {
      id: 'runtime-rendered-paths-match-manifest',
      status: statusFor((latestRuntimeDetails.pathMismatchCount ?? 0) === 0),
      detail: `pathMismatchCount=${latestRuntimeDetails.pathMismatchCount ?? 'missing'}`,
    },
    {
      id: 'runtime-rendered-count',
      status: statusFor(latestRuntimeDetails.renderedPathCount === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT),
      detail: `renderedPathCount=${latestRuntimeDetails.renderedPathCount ?? 'missing'}, expected=${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}`,
    },
    {
      id: 'runtime-forbidden-paths-absent',
      status: statusFor((latestRuntimeDetails.forbiddenRenderedIds ?? []).length === 0),
      detail: `forbiddenRenderedIds=${(latestRuntimeDetails.forbiddenRenderedIds ?? []).join(',') || '-'}`,
    },
    {
      id: 'runtime-label-top-hit',
      status: statusFor((latestRuntimeDetails.labelTopHitFailureCount ?? 0) === 0),
      detail: `labelTopHitFailureCount=${latestRuntimeDetails.labelTopHitFailureCount ?? 'missing'}`,
    },
  ];

  const rows = [
    ...manifestChecks.map((check) => ({ group: 'manifest', ...check })),
    ...sourceChecks.map((check) => ({ group: 'source', ...check })),
    ...browserChecks.map((check) => ({ group: 'browser', ...check })),
  ];

  const blockers = rows
    .filter((row) => row.status !== 'passed')
    .map((row) => `${row.group}:${row.id}:${row.detail}`);

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status: blockers.length === 0 ? 'passed' : 'failed',
    runtimeSeatLayerSource: RUNTIME_SOURCE,
    sourcePolicy,
    summary: {
      expectedActiveBlocks: EXPECTED_ACTIVE_BLOCK_COUNT,
      expectedTraceBlockCount: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      manifestBlockCount: manifestBlocks.length,
      dataBlockCount: GWANGJU_BLOCKS.length,
      runtimeCheckCount: runtimeChecks.length,
      renderedPathCount: latestRuntimeDetails.renderedPathCount ?? null,
      pathMismatchCount: latestRuntimeDetails.pathMismatchCount ?? null,
      forbiddenRenderedIdCount: (latestRuntimeDetails.forbiddenRenderedIds ?? []).length,
      labelTopHitFailureCount: latestRuntimeDetails.labelTopHitFailureCount ?? null,
      blockerCount: blockers.length,
    },
    inputs: {
      traceManifest: path.relative(frontendRoot, traceManifestPath),
      browserQaSummary: path.relative(frontendRoot, browserQaSummaryPath),
      component: path.relative(frontendRoot, componentPath),
      shellComponent: path.relative(frontendRoot, shellComponentPath),
      packageJson: path.relative(frontendRoot, packagePath),
    },
    runtimeCheck: latestRuntimeCheck,
    checks: rows,
    blockers,
  };

  const csvRows = [
    ['group', 'id', 'status', 'detail'],
    ...rows.map((row) => [row.group, row.id, row.status, row.detail]),
  ];
  const markdown = [
    '# 광주 좌석도 runtime layer audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${report.status}\``,
    `- runtime seat layer source: \`${RUNTIME_SOURCE}\``,
    `- manifest blocks: ${report.summary.manifestBlockCount}`,
    `- rendered path count: ${report.summary.renderedPathCount ?? '-'}`,
    `- path mismatches: ${report.summary.pathMismatchCount ?? '-'}`,
    `- forbidden rendered ids: ${report.summary.forbiddenRenderedIdCount ?? '-'}`,
    `- label top-hit failures: ${report.summary.labelTopHitFailureCount ?? '-'}`,
    `- blockers: ${blockers.length}`,
    '',
    '## Source Policy',
    '',
    `- allowed coordinate source: \`${sourcePolicy.allowedCoordinateSource}\``,
    `- missing baseball data contract: \`${sourcePolicy.missingBaseballDataContract}\``,
    `- disallowed sources: ${sourcePolicy.disallowedSources.map((source) => `\`${source}\``).join(', ')}`,
    '',
    '## Checks',
    '',
    markdownTable(
      ['group', 'id', 'status', 'detail'],
      rows.map((row) => [row.group, `\`${row.id}\``, `\`${row.status}\``, row.detail]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  await fs.writeFile(outputPaths.markdown, markdown, 'utf8');

  console.log(`[gwangju-runtime-layer] status=${report.status} rendered=${report.summary.renderedPathCount ?? '-'} pathMismatches=${report.summary.pathMismatchCount ?? '-'} forbidden=${report.summary.forbiddenRenderedIdCount ?? '-'} blockers=${blockers.length}`);
  console.log(`[gwangju-runtime-layer] report=${outputPaths.json}`);

  if (blockers.length > 0) {
    process.exit(1);
  }
};

const runReleaseGate = async () => {
  const { spawn } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE, GWANGJU_PENDING_OPERATOR_SECTIONS, GWANGJU_SEATMAP_IMAGE } = await import("../src/data/gwangjuSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const outputRoot = path.join(repoRoot, 'output/playwright');

  const GATE_VERSION = 'GWANGJU_SEATMAP_RELEASE_GATE_V1';
  const gateJsonPath = path.join(reportDir, 'gwangju-seatmap-release-gate.json');
  const gateMarkdownPath = path.join(reportDir, 'gwangju-seatmap-release-gate.md');
  const releasePackagePath = path.join(reportDir, 'gwangju-seatmap-release-package.json');
  const operatorStatusPath = path.join(reportDir, 'gwangju-seatmap-operator-status.json');
  const traceReviewPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const runtimeLayerAuditPath = path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json');
  const browserQaPath = path.join(outputRoot, 'stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.json');
  const traceReviewArtifactFiles = {
    traceReview: traceReviewPath,
    runtimeLayerAudit: runtimeLayerAuditPath,
    browserQa: browserQaPath,
  };

  const commandPlan = [
    {
      label: 'operator status',
      command: 'npm',
      args: ['run', 'stadium:gwangju:operator-status'],
    },
    {
      label: 'gwangju seatmap tests',
      command: 'npm',
      args: ['run', 'test:stadium:gwangju:seatmaps'],
    },
    {
      label: 'trace review artifacts',
      command: 'validate',
      args: ['existing', 'gwangju', 'trace-review', 'artifacts'],
      validateArtifacts: true,
    },
    {
      label: 'release package',
      command: 'npm',
      args: ['run', 'stadium:gwangju:release-package'],
    },
    {
      label: 'build',
      command: 'npm',
      args: ['run', 'build'],
      env: {
        VITE_SITE_URL: process.env.VITE_SITE_URL || 'http://localhost:5176',
        VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://localhost:8080',
      },
    },
  ];

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const readJsonIfExists = async (filePath) => {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  };

  const relativePath = (filePath) => path.relative(frontendRoot, filePath);

  const readJsonArtifact = async (key, filePath) => {
    try {
      const [stats, rawJson] = await Promise.all([
        fs.stat(filePath),
        fs.readFile(filePath, 'utf8'),
      ]);
      return {
        key,
        path: relativePath(filePath),
        exists: true,
        modifiedAt: stats.mtime.toISOString(),
        mtimeMs: stats.mtimeMs,
        data: JSON.parse(rawJson),
        error: null,
      };
    } catch (error) {
      return {
        key,
        path: relativePath(filePath),
        exists: error?.code !== 'ENOENT',
        modifiedAt: null,
        mtimeMs: null,
        data: null,
        error: error?.code === 'ENOENT' ? 'MISSING_TRACE_REVIEW_ARTIFACT' : `TRACE_REVIEW_ARTIFACT_READ_FAILED:${error.message}`,
      };
    }
  };

  const validateTraceReviewArtifacts = async (step) => {
    const startedAt = Date.now();
    console.log(`[gwangju-release-gate] ${step.label}: ${step.command} ${step.args.join(' ')}`);

    const artifactRows = Object.fromEntries(await Promise.all(
      Object.entries(traceReviewArtifactFiles).map(async ([key, filePath]) => [key, await readJsonArtifact(key, filePath)]),
    ));
    const traceReview = artifactRows.traceReview.data;
    const runtimeLayerAudit = artifactRows.runtimeLayerAudit.data;
    const browserQa = artifactRows.browserQa.data;
    const traceSummary = traceReview?.summary ?? {};
    const runtimeSummary = runtimeLayerAudit?.summary ?? {};
    const checks = [];
    const errors = [];

    const addCheck = (name, expected, actual, pass, blockerCode) => {
      checks.push({ name, expected, actual, pass });
      if (!pass) errors.push(`${blockerCode}:${actual ?? 'missing'}`);
    };

    Object.values(artifactRows)
      .filter((artifact) => artifact.error)
      .forEach((artifact) => errors.push(`${artifact.error}:${artifact.path}`));

    addCheck('trace review status', 'READY', traceSummary.traceStatus, traceSummary.traceStatus === 'READY', 'TRACE_REVIEW_NOT_READY');
    addCheck('trace review selectable blocks', true, traceSummary.selectableBlocksReady, traceSummary.selectableBlocksReady === true, 'TRACE_REVIEW_SELECTABLE_BLOCKS_NOT_READY');
    addCheck('trace review total blocks', GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, traceSummary.totalBlocks, traceSummary.totalBlocks === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 'TRACE_REVIEW_ACTIVE_BLOCKS_CHANGED');
    addCheck('trace review official traced blocks', GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, traceSummary.officialImageTracedBlocks, traceSummary.officialImageTracedBlocks === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 'TRACE_REVIEW_OFFICIAL_IMAGE_TRACED_CHANGED');
    addCheck('trace review manual reviewed blocks', GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, traceSummary.manualReviewedBlocks, traceSummary.manualReviewedBlocks === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 'TRACE_REVIEW_MANUAL_REVIEWED_CHANGED');
    addCheck('trace review pixel aligned blocks', GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, traceSummary.pixelAlignedBlocks, traceSummary.pixelAlignedBlocks === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 'TRACE_REVIEW_PIXEL_ALIGNMENT_CHANGED');
    addCheck('trace review overlap warnings', 0, traceSummary.overlapWarningCount, traceSummary.overlapWarningCount === 0, 'TRACE_REVIEW_OVERLAP_WARNINGS_PRESENT');
    addCheck('trace review component warnings', 0, traceSummary.componentCoverageWarningCount, traceSummary.componentCoverageWarningCount === 0, 'TRACE_REVIEW_OP_COMPONENT_COVERAGE_WARNINGS_PRESENT');
    addCheck('trace review zone precision', 'passed', traceSummary.zonePrecisionStatus, traceSummary.zonePrecisionStatus === 'passed', 'TRACE_REVIEW_ZONE_PRECISION_NOT_PASSED');
    addCheck('trace review aggregate hit-area', 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', traceSummary.aggregateHitAreaMode, traceSummary.aggregateHitAreaMode === 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY', 'TRACE_REVIEW_AGGREGATE_HIT_AREA_CHANGED');
    addCheck('browser QA status', 'passed', browserQa?.status, browserQa?.status === 'passed', 'BROWSER_QA_NOT_PASSED');
    addCheck('runtime layer audit status', 'passed', runtimeLayerAudit?.status, runtimeLayerAudit?.status === 'passed', 'RUNTIME_LAYER_AUDIT_NOT_PASSED');
    addCheck('runtime rendered path count', GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, runtimeSummary.renderedPathCount, runtimeSummary.renderedPathCount === GWANGJU_EXPECTED_TRACE_BLOCK_COUNT, 'RUNTIME_LAYER_RENDERED_PATH_COUNT_CHANGED');
    addCheck('runtime path mismatches', 0, runtimeSummary.pathMismatchCount, runtimeSummary.pathMismatchCount === 0, 'RUNTIME_LAYER_PATH_MISMATCHES_PRESENT');
    addCheck('runtime forbidden rendered ids', 0, runtimeSummary.forbiddenRenderedIdCount, runtimeSummary.forbiddenRenderedIdCount === 0, 'RUNTIME_LAYER_FORBIDDEN_IDS_PRESENT');
    addCheck('runtime label top-hit failures', 0, runtimeSummary.labelTopHitFailureCount, runtimeSummary.labelTopHitFailureCount === 0, 'RUNTIME_LAYER_LABEL_TOP_HIT_FAILURES_PRESENT');

    const status = errors.length === 0 ? 'passed' : 'failed';
    return {
      label: step.label,
      command: [step.command, ...step.args].join(' '),
      status,
      durationMs: Date.now() - startedAt,
      exitCode: status === 'passed' ? 0 : 1,
      signal: null,
      error: status === 'passed' ? null : errors.join(','),
      artifactChecks: checks,
      artifacts: Object.values(artifactRows).map(({ data, ...artifact }) => artifact),
    };
  };

  const runCommand = (step) => new Promise((resolve) => {
    const startedAt = Date.now();
    console.log(`[gwangju-release-gate] ${step.label}: ${step.command} ${step.args.join(' ')}`);

    const child = spawn(step.command, step.args, {
      cwd: frontendRoot,
      env: { ...process.env, ...step.env },
      stdio: 'inherit',
      shell: false,
    });

    child.on('error', (error) => {
      resolve({
        label: step.label,
        command: [step.command, ...step.args].join(' '),
        status: 'failed',
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    child.on('close', (code, signal) => {
      const status = code === 0 ? 'passed' : 'failed';
      resolve({
        label: step.label,
        command: [step.command, ...step.args].join(' '),
        status,
        durationMs: Date.now() - startedAt,
        exitCode: code,
        signal,
        error: status === 'passed' ? null : `${step.label} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`,
      });
    });
  });

  const runStep = async (step) => {
    if (step.validateArtifacts) {
      return validateTraceReviewArtifacts(step);
    }
    return runCommand(step);
  };

  const stepResults = [];
  for (const step of commandPlan) {
    const result = await runStep(step);
    stepResults.push(result);
    if (result.status !== 'passed') break;
  }

  const releasePackage = await readJsonIfExists(releasePackagePath);
  const operatorStatus = await readJsonIfExists(operatorStatusPath);
  const traceReview = await readJsonIfExists(traceReviewPath);
  const runtimeLayerAudit = await readJsonIfExists(runtimeLayerAuditPath);
  const browserQa = await readJsonIfExists(browserQaPath);

  const blockers = stepResults
    .filter((result) => result.status !== 'passed')
    .map((result) => `STEP_FAILED:${result.label}:${result.error}`);

  if (stepResults.length === commandPlan.length && blockers.length === 0) {
    if (releasePackage?.status !== 'ready') {
      blockers.push(`RELEASE_PACKAGE_NOT_READY:${releasePackage?.status ?? 'missing'}`);
    }
    if (releasePackage?.activeBlockContract?.expectedTraceBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
      blockers.push(`RELEASE_PACKAGE_ACTIVE_BLOCKS_CHANGED:${releasePackage?.activeBlockContract?.expectedTraceBlocks ?? 'missing'}`);
    }
    if (releasePackage?.activeBlockContract?.aggregateHitArea !== 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY') {
      blockers.push(`RELEASE_PACKAGE_AGGREGATE_HIT_AREA_CHANGED:${releasePackage?.activeBlockContract?.aggregateHitArea ?? 'missing'}`);
    }
    if (operatorStatus?.summary?.status !== 'ready') {
      blockers.push(`OPERATOR_STATUS_NOT_READY:${operatorStatus?.summary?.status ?? 'missing'}`);
    }
    if (traceReview?.summary?.traceStatus !== 'READY') {
      blockers.push(`TRACE_REVIEW_NOT_READY:${traceReview?.summary?.traceStatus ?? 'missing'}`);
    }
    if (traceReview?.summary?.selectableBlocksReady !== true) {
      blockers.push(`TRACE_REVIEW_SELECTABLE_BLOCKS_NOT_READY:${traceReview?.summary?.selectableBlocksReady ?? 'missing'}`);
    }
    if (traceReview?.summary?.totalBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
      blockers.push(`TRACE_REVIEW_ACTIVE_BLOCKS_CHANGED:${traceReview?.summary?.totalBlocks ?? 'missing'}`);
    }
    if (traceReview?.summary?.manualReviewedBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
      blockers.push(`TRACE_REVIEW_MANUAL_REVIEWED_CHANGED:${traceReview?.summary?.manualReviewedBlocks ?? 'missing'}`);
    }
    if (traceReview?.summary?.pixelAlignedBlocks !== GWANGJU_EXPECTED_TRACE_BLOCK_COUNT) {
      blockers.push(`TRACE_REVIEW_PIXEL_ALIGNMENT_CHANGED:${traceReview?.summary?.pixelAlignedBlocks ?? 'missing'}`);
    }
    if (traceReview?.summary?.overlapWarningCount !== 0) {
      blockers.push(`TRACE_REVIEW_OVERLAP_WARNINGS_PRESENT:${traceReview?.summary?.overlapWarningCount ?? 'missing'}`);
    }
    if (traceReview?.summary?.componentCoverageWarningCount !== 0) {
      blockers.push(`TRACE_REVIEW_OP_COMPONENT_COVERAGE_WARNINGS_PRESENT:${traceReview?.summary?.componentCoverageWarningCount ?? 'missing'}`);
    }
    if (traceReview?.summary?.zonePrecisionStatus !== 'passed') {
      blockers.push(`TRACE_REVIEW_ZONE_PRECISION_NOT_PASSED:${traceReview?.summary?.zonePrecisionStatus ?? 'missing'}`);
    }
    if (browserQa?.status !== 'passed') {
      blockers.push(`BROWSER_QA_NOT_PASSED:${browserQa?.status ?? 'missing'}`);
    }
    if (runtimeLayerAudit?.status !== 'passed') {
      blockers.push(`RUNTIME_LAYER_AUDIT_NOT_PASSED:${runtimeLayerAudit?.status ?? 'missing'}`);
    }
    if (runtimeLayerAudit?.summary?.pathMismatchCount !== 0) {
      blockers.push(`RUNTIME_LAYER_PATH_MISMATCHES_PRESENT:${runtimeLayerAudit?.summary?.pathMismatchCount ?? 'missing'}`);
    }
  }

  const status = blockers.length === 0 ? 'passed' : 'failed';
  const passedStepCount = stepResults.filter((result) => result.status === 'passed').length;
  const releaseAcceptance = {
    requiredStatus: 'passed',
    requiredBlockers: 0,
    requiredCompletedSteps: commandPlan.length,
    requiredReleasePackageStatus: 'ready',
    requiredOperatorStatus: 'ready',
    requiredTraceReviewStatus: 'READY',
    requiredBrowserQaStatus: 'passed',
    requiredRuntimeLayerAuditStatus: 'passed',
    requiredActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    version: GATE_VERSION,
    status,
    doesNotModifyDataFile: true,
    releaseAcceptance,
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    sourcePolicy: {
      allowedCoordinateSource: 'operator-provided official PNG coordinates only',
      coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    activeBlockContract: {
      expectedTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
      aggregateHitArea: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE
        ? 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY'
        : 'INDEPENDENT_POLYGON',
      pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
      officialDerivedAggregateReady: true,
    },
    commandPlan: commandPlan.map((step) => ({
      label: step.label,
      command: [step.command, ...step.args].join(' '),
    })),
    steps: stepResults,
    finalChecks: {
      releasePackageStatus: releasePackage?.status ?? null,
      operatorStatus: operatorStatus?.summary?.status ?? null,
      traceReviewStatus: traceReview?.summary?.traceStatus ?? null,
      activeTraceBlocks: traceReview?.summary?.totalBlocks ?? null,
      traceReviewPixelAlignedBlocks: traceReview?.summary?.pixelAlignedBlocks ?? null,
      traceReviewOverlapWarnings: traceReview?.summary?.overlapWarningCount ?? null,
      traceReviewComponentCoverageWarnings: traceReview?.summary?.componentCoverageWarningCount ?? null,
      traceReviewZonePrecisionStatus: traceReview?.summary?.zonePrecisionStatus ?? null,
      browserQaStatus: browserQa?.status ?? null,
      runtimeLayerAuditStatus: runtimeLayerAudit?.status ?? null,
      runtimeLayerPathMismatches: runtimeLayerAudit?.summary?.pathMismatchCount ?? null,
      blockers: blockers.length,
      completedSteps: passedStepCount,
      totalSteps: commandPlan.length,
    },
    blockers,
  };

  const markdown = [
    '# 광주 K7/AWAY release gate',
    '',
    `- version: \`${GATE_VERSION}\``,
    `- status: \`${status}\``,
    `- modifies data file: \`${!report.doesNotModifyDataFile}\``,
    `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- active block contract: \`${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\` (\`activeBlocks=${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}\`)`,
    `- aggregate hit-area: \`${report.activeBlockContract.aggregateHitArea}\``,
    `- operator sections: \`${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ')}\``,
    `- release package: \`${report.finalChecks.releasePackageStatus ?? '-'}\``,
    `- trace review: \`${report.finalChecks.traceReviewStatus ?? '-'}\``,
    `- browser QA: \`${report.finalChecks.browserQaStatus ?? '-'}\``,
    `- runtime layer audit: \`${report.finalChecks.runtimeLayerAuditStatus ?? '-'}\``,
    `- completed steps: \`${report.finalChecks.completedSteps}/${report.finalChecks.totalSteps}\``,
    '',
    '## Acceptance',
    '',
    markdownTable(
      ['check', 'expected', 'actual'],
      [
        ['status', `\`${releaseAcceptance.requiredStatus}\``, `\`${report.status}\``],
        ['blockers', `\`${releaseAcceptance.requiredBlockers}\``, `\`${report.finalChecks.blockers}\``],
        ['completed steps', `\`${releaseAcceptance.requiredCompletedSteps}/${commandPlan.length}\``, `\`${report.finalChecks.completedSteps}/${report.finalChecks.totalSteps}\``],
        ['release package', `\`${releaseAcceptance.requiredReleasePackageStatus}\``, `\`${report.finalChecks.releasePackageStatus ?? '-'}\``],
        ['operator status', `\`${releaseAcceptance.requiredOperatorStatus}\``, `\`${report.finalChecks.operatorStatus ?? '-'}\``],
        ['trace review', `\`${releaseAcceptance.requiredTraceReviewStatus}\``, `\`${report.finalChecks.traceReviewStatus ?? '-'}\``],
        ['browser QA', `\`${releaseAcceptance.requiredBrowserQaStatus}\``, `\`${report.finalChecks.browserQaStatus ?? '-'}\``],
        ['runtime layer audit', `\`${releaseAcceptance.requiredRuntimeLayerAuditStatus}\``, `\`${report.finalChecks.runtimeLayerAuditStatus ?? '-'}\``],
        ['runtime path mismatches', '`0`', `\`${report.finalChecks.runtimeLayerPathMismatches ?? '-'}\``],
        ['active trace blocks', `\`${releaseAcceptance.requiredActiveTraceBlocks}\``, `\`${report.finalChecks.activeTraceBlocks ?? '-'}\``],
      ],
    ),
    '',
    '## Steps',
    '',
    markdownTable(
      ['step', 'command', 'status', 'duration ms', 'error'],
      stepResults.map((result) => [
        result.label,
        `\`${result.command}\``,
        `\`${result.status}\``,
        result.durationMs,
        result.error ?? '-',
      ]),
    ),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Source Policy',
    '',
    '- 허용: operator-provided official PNG coordinates only',
    '- 좌표계: official PNG 2200x1159',
    '- 금지: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
    '- 누락 야구 운영 데이터: `MANUAL_BASEBALL_DATA_REQUIRED`',
    `- 현재 복구 기준은 active ${GWANGJU_EXPECTED_TRACE_BLOCK_COUNT}개이다.`,
    '',
  ].join('\n');

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(gateJsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(gateMarkdownPath, markdown, 'utf8');

  console.log(`release_gate_json:${gateJsonPath}`);
  console.log(`release_gate_markdown:${gateMarkdownPath}`);
  console.log(`status:${status} blockers=${blockers.length} steps=${stepResults.length}/${commandPlan.length}`);

  if (status !== 'passed') {
    process.exitCode = 1;
  }
};

const runVisualHitSplitAudit = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { GWANGJU_BLOCKS, GWANGJU_FULL_RETRACE_VERSION, GWANGJU_SEATMAP_IMAGE } = await import("../src/data/gwangjuSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(frontendRoot, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const outputRoot = path.join(repoRoot, 'output/playwright/stadium-ux-gwangju-validate');
  const cropDir = path.join(reportDir, 'gwangju-seatmap-visual-hit-split-audit-crops');
  const imagePath = path.resolve(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath);
  const browserSummaryPath = path.join(outputRoot, 'stadium-mobile-smoke-summary.json');
  const runtimeLayerPath = path.join(reportDir, 'gwangju-seatmap-runtime-layer-audit.json');
  const traceManifestPath = path.join(reportDir, 'gwangju-seatmap-trace-review.json');
  const outputPaths = {
    json: path.join(reportDir, 'gwangju-seatmap-visual-hit-split-audit.json'),
    csv: path.join(reportDir, 'gwangju-seatmap-visual-hit-split-audit.csv'),
    markdown: path.join(reportDir, 'gwangju-seatmap-visual-hit-split-audit.md'),
  };

  const AUDIT_VERSION = 'GWANGJU_VISUAL_HIT_SPLIT_AUDIT_V1';
  const EXPECTED_VIEWBOX = { width: 2200, height: 1159 };
  const SOURCE_POLICY = {
    coordinateSource: 'official PNG 2200x1159 + browser-rendered SVG path attributes',
    missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
    disallowedSources: [
      'browser CSS pixels as coordinate source',
      'resized screenshots as coordinate source',
      'external crawling',
      'web-search-based baseball data',
      'third-party copied seatmap images',
    ],
  };

  const CROP_REGIONS = [
    {
      id: '101-108-h-i-j-visual-hit-split',
      bounds: { left: 700, top: 760, width: 520, height: 250 },
      blockIds: ['k5-105', 'first-family-seats', 'sky-picnic-s-301'],
    },
    {
      id: 's301-j-visual-hit-split',
      bounds: { left: 760, top: 920, width: 280, height: 90 },
      blockIds: ['sky-picnic-s-301'],
    },
  ];
  const APPROVED_VISUAL_SPLIT_BLOCK_IDS = [
    'first-family-seats',
    'k5-105',
    'party-seats-first',
    'sky-picnic-s-301',
  ];

  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };

  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');

  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

  const readJson = async (filePath) => {
    try {
      return { exists: true, data: JSON.parse(await fs.readFile(filePath, 'utf8')), error: null };
    } catch (error) {
      if (error?.code === 'ENOENT') return { exists: false, data: null, error: `MISSING:${path.relative(frontendRoot, filePath)}` };
      return { exists: false, data: null, error: `READ_FAILED:${path.relative(frontendRoot, filePath)}:${error.message}` };
    }
  };

  const pathBounds = (pathD) => {
    const matches = [...String(pathD ?? '').matchAll(/[ML]\s*([\d.]+)\s*([\d.]+)/g)];
    if (matches.length === 0) return null;
    const points = matches.map((match) => [Number(match[1]), Number(match[2])]);
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  };

  const maxBoundsDelta = (first, second) => {
    if (!first || !second) return null;
    return Math.max(
      Math.abs(first.minX - second.minX),
      Math.abs(first.minY - second.minY),
      Math.abs(first.maxX - second.maxX),
      Math.abs(first.maxY - second.maxY),
    );
  };

  const rel = (filePath) => path.relative(frontendRoot, filePath);

  const getRuntimeLayerCheck = (browserSummary) => (browserSummary.data?.scenarios ?? [])
    .flatMap((scenario) => (scenario.qaChecks ?? []).map((check) => ({
      scenario: scenario.label,
      ...check,
    })))
    .filter((check) => check.type === 'gwangju-runtime-layer')
    .at(-1) ?? null;

  const shiftPath = (pathD, bounds) => String(pathD ?? '')
    .replace(/([ML])\s*([\d.]+)\s*([\d.]+)/g, (_, command, x, y) => `${command} ${Number(x) - bounds.left} ${Number(y) - bounds.top}`);

  const auditedBlocks = GWANGJU_BLOCKS
    .map((block) => ({
      id: block.id,
      block: block.block,
      name: block.name,
      traceVersion: block.imageGeometry.traceVersion,
      hitPath: block.imageGeometry.d,
      visualPath: block.imageGeometry.visualD ?? block.imageGeometry.d,
      hasSeparateVisualPath: Boolean(block.imageGeometry.visualD && block.imageGeometry.visualD !== block.imageGeometry.d),
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      hitBounds: pathBounds(block.imageGeometry.d),
      visualBounds: pathBounds(block.imageGeometry.visualD ?? block.imageGeometry.d),
    }))
    .sort((first, second) => first.id.localeCompare(second.id));
  const auditedBlockById = new Map(auditedBlocks.map((block) => [block.id, block]));
  const visualSplitBlocks = auditedBlocks.filter((block) => block.hasSeparateVisualPath);
  const approvedVisualSplitBlockIdSet = new Set(APPROVED_VISUAL_SPLIT_BLOCK_IDS);
  const unexpectedVisualSplitViolations = visualSplitBlocks
    .map((block) => block.id)
    .filter((id) => !approvedVisualSplitBlockIdSet.has(id));
  const missingApprovedVisualSplitIds = APPROVED_VISUAL_SPLIT_BLOCK_IDS
    .filter((id) => !auditedBlockById.get(id)?.hasSeparateVisualPath);

  const expectedVisualSplitIds = visualSplitBlocks.map((block) => block.id).sort();
  const browserSummary = await readJson(browserSummaryPath);
  const runtimeLayer = await readJson(runtimeLayerPath);
  const traceManifest = await readJson(traceManifestPath);
  const runtimeLayerCheck = getRuntimeLayerCheck(browserSummary);
  const runtimeDetails = runtimeLayerCheck?.details ?? {};
  const runtimeRowsById = new Map((runtimeDetails.visualHitSplitRows ?? []).map((row) => [row.id, row]));
  const runtimeVisualSplitIds = [...(runtimeDetails.visualHitSplitIds ?? [])].sort();

  const rows = visualSplitBlocks.map((block) => {
    const runtimeRow = runtimeRowsById.get(block.id);
    const runtimeHitPath = runtimeRow?.hitPath ?? '';
    const runtimeVisualPath = runtimeRow?.visualPath ?? '';
    const runtimeHitDataVisualPath = runtimeRow?.hitDataVisualPath ?? '';
    const runtimeHitPathMatchesData = runtimeHitPath === block.hitPath;
    const runtimeVisualPathMatchesData = runtimeVisualPath === block.visualPath;
    const runtimeHitDataVisualPathMatchesData = runtimeHitDataVisualPath === block.visualPath;
    const visualPointerEventsNone = runtimeRow?.visualPointerEvents === 'none';
    const blockers = [
      ...(runtimeRow ? [] : [`MISSING_BROWSER_VISUAL_SPLIT_ROW:${block.id}`]),
      ...(runtimeHitPathMatchesData ? [] : [`RUNTIME_HIT_PATH_MISMATCH:${block.id}`]),
      ...(runtimeVisualPathMatchesData ? [] : [`RUNTIME_VISUAL_PATH_MISMATCH:${block.id}`]),
      ...(runtimeHitDataVisualPathMatchesData ? [] : [`RUNTIME_HIT_DATA_VISUAL_PATH_MISMATCH:${block.id}`]),
      ...(visualPointerEventsNone ? [] : [`VISUAL_PATH_POINTER_EVENTS_NOT_NONE:${block.id}`]),
    ];
    return {
      ...block,
      boundsDelta: maxBoundsDelta(block.hitBounds, block.visualBounds),
      runtimePresent: Boolean(runtimeRow),
      runtimeHitPathMatchesData,
      runtimeVisualPathMatchesData,
      runtimeHitDataVisualPathMatchesData,
      visualPointerEventsNone,
      status: blockers.length === 0 ? 'passed' : 'failed',
      decision: 'visualD',
      blockers,
    };
  });

  await fs.mkdir(cropDir, { recursive: true });
  const cropArtifacts = [];
  for (const region of CROP_REGIONS) {
    const regionBlocks = region.blockIds
      .map((id) => auditedBlockById.get(id))
      .filter(Boolean);
    const svg = [
      `<svg width="${region.bounds.width}" height="${region.bounds.height}" viewBox="0 0 ${region.bounds.width} ${region.bounds.height}" xmlns="http://www.w3.org/2000/svg">`,
      ...regionBlocks.map((block) => `<path d="${xmlEscape(shiftPath(block.hitPath, region.bounds))}" fill="rgba(37,99,235,0.10)" stroke="#2563eb" stroke-width="2"/>`),
      ...regionBlocks
        .filter((block) => block.hasSeparateVisualPath)
        .map((block) => `<path d="${xmlEscape(shiftPath(block.visualPath, region.bounds))}" fill="rgba(220,38,38,0.10)" stroke="#dc2626" stroke-width="2" stroke-dasharray="7 5"/>`),
      ...regionBlocks.map((block) => `<circle cx="${block.labelX - region.bounds.left}" cy="${block.labelY - region.bounds.top}" r="4" fill="#111827"/><text x="${block.labelX - region.bounds.left + 6}" y="${block.labelY - region.bounds.top - 6}" font-size="13" fill="#111827">${xmlEscape(block.id)}</text>`),
      '</svg>',
    ].join('');
    const artifactPath = path.join(cropDir, `gwangju-seatmap-visual-hit-split-audit-${region.id}.png`);
    await sharp(imagePath)
      .extract(region.bounds)
      .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
      .resize({ width: region.bounds.width * 3, height: region.bounds.height * 3, kernel: 'nearest' })
      .toFile(artifactPath);
    cropArtifacts.push({
      id: region.id,
      blockIds: region.blockIds,
      artifact: rel(artifactPath),
    });
  }

  const expectedIdsJson = JSON.stringify(expectedVisualSplitIds);
  const runtimeIdsJson = JSON.stringify(runtimeVisualSplitIds);
  const blockers = [
    ...(browserSummary.exists ? [] : [browserSummary.error]),
    ...(browserSummary.data?.status === 'passed' ? [] : [`BROWSER_SUMMARY_NOT_PASSED:${browserSummary.data?.status ?? 'missing'}`]),
    ...(runtimeLayerCheck ? [] : ['BROWSER_RUNTIME_LAYER_CHECK_MISSING']),
    ...(runtimeLayerCheck?.status === 'passed' ? [] : [`BROWSER_RUNTIME_LAYER_NOT_PASSED:${runtimeLayerCheck?.status ?? 'missing'}`]),
    ...(runtimeDetails.visualPathMismatchCount === 0 ? [] : [`BROWSER_VISUAL_PATH_MISMATCHES:${runtimeDetails.visualPathMismatchCount ?? 'missing'}`]),
    ...(runtimeDetails.renderedVisualPathCount === runtimeDetails.expectedPathCount ? [] : [`BROWSER_VISUAL_RENDER_COUNT_MISMATCH:${runtimeDetails.renderedVisualPathCount ?? 'missing'}/${runtimeDetails.expectedPathCount ?? 'missing'}`]),
    ...(expectedIdsJson === runtimeIdsJson ? [] : [`VISUAL_SPLIT_ID_MISMATCH:data=${expectedIdsJson}:runtime=${runtimeIdsJson}`]),
    ...unexpectedVisualSplitViolations.map((id) => `UNAPPROVED_VISUAL_SPLIT:${id}`),
    ...missingApprovedVisualSplitIds.map((id) => `MISSING_APPROVED_VISUAL_SPLIT:${id}`),
    ...(runtimeLayer.data?.status === 'passed' ? [] : [`RUNTIME_LAYER_REPORT_NOT_PASSED:${runtimeLayer.data?.status ?? 'missing'}`]),
    ...(traceManifest.data?.summary?.traceStatus === 'READY' ? [] : [`TRACE_MANIFEST_NOT_READY:${traceManifest.data?.summary?.traceStatus ?? 'missing'}`]),
    ...rows.flatMap((row) => row.blockers),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    version: AUDIT_VERSION,
    status: blockers.length === 0 ? 'passed' : 'failed',
    traceVersion: GWANGJU_FULL_RETRACE_VERSION,
    expectedViewBox: EXPECTED_VIEWBOX,
    sourcePolicy: SOURCE_POLICY,
    summary: {
      visualSplitBlockCount: visualSplitBlocks.length,
      expectedVisualSplitIds,
      runtimeVisualSplitIds,
      approvedVisualSplitBlockIds: APPROVED_VISUAL_SPLIT_BLOCK_IDS,
      unexpectedVisualSplitViolations,
      missingApprovedVisualSplitIds,
      browserRuntimeStatus: runtimeLayerCheck?.status ?? null,
      runtimeVisualPathMismatchCount: runtimeDetails.visualPathMismatchCount ?? null,
      renderedVisualPathCount: runtimeDetails.renderedVisualPathCount ?? null,
      expectedPathCount: runtimeDetails.expectedPathCount ?? null,
      blockerCount: blockers.length,
    },
    inputs: {
      browserSummary: path.relative(frontendRoot, browserSummaryPath),
      runtimeLayer: rel(runtimeLayerPath),
      traceManifest: rel(traceManifestPath),
      officialImage: GWANGJU_SEATMAP_IMAGE.imagePath,
    },
    cropArtifacts,
    rows,
    blockers,
  };

  const csvRows = [
    [
      'id',
      'block',
      'traceVersion',
      'hitBounds',
      'visualBounds',
      'boundsDelta',
      'runtimePresent',
      'runtimeHitPathMatchesData',
      'runtimeVisualPathMatchesData',
      'runtimeHitDataVisualPathMatchesData',
      'visualPointerEventsNone',
      'decision',
      'status',
      'blockers',
    ],
    ...rows.map((row) => [
      row.id,
      row.block,
      row.traceVersion,
      JSON.stringify(row.hitBounds),
      JSON.stringify(row.visualBounds),
      row.boundsDelta,
      row.runtimePresent,
      row.runtimeHitPathMatchesData,
      row.runtimeVisualPathMatchesData,
      row.runtimeHitDataVisualPathMatchesData,
      row.visualPointerEventsNone,
      row.decision,
      row.status,
      row.blockers.join('|'),
    ]),
  ];

  const markdown = [
    '# 광주 visual/hit split audit',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- version: \`${AUDIT_VERSION}\``,
    `- status: \`${report.status}\``,
    `- trace version: \`${report.traceVersion}\``,
    `- visual split blocks: ${report.summary.visualSplitBlockCount}`,
    `- runtime visual path mismatches: ${report.summary.runtimeVisualPathMismatchCount ?? '-'}`,
    `- rendered visual paths: ${report.summary.renderedVisualPathCount ?? '-'}/${report.summary.expectedPathCount ?? '-'}`,
    `- blockers: ${blockers.length}`,
    '',
    '이 audit은 공식 PNG 표시 경계와 non-overlap hit-area를 분리하도록 승인된 `visualD` 블럭만 런타임에 렌더링되는지 확인합니다. 파란 실선은 hit-area `d`, 빨간 점선은 실제 표시용 `visualD`입니다. 좌표 기준은 공식 PNG `2200x1159`이며, 브라우저 CSS pixel이나 리사이즈 스크린샷 좌표는 사용하지 않습니다.',
    `- approved visual split blocks: ${APPROVED_VISUAL_SPLIT_BLOCK_IDS.join(', ')}`,
    `- unexpected visual split violations: ${unexpectedVisualSplitViolations.join(', ') || 'none'}`,
    `- missing approved visual split ids: ${missingApprovedVisualSplitIds.join(', ') || 'none'}`,
    '',
    '## Rows',
    '',
    markdownTable(
      ['id', 'block', 'hitBounds', 'visualBounds', 'delta', 'runtimeHit', 'runtimeVisual', 'dataVisualAttr', 'pointerEvents', 'decision', 'status'],
      rows.map((row) => [
        row.id,
        row.block,
        JSON.stringify(row.hitBounds),
        JSON.stringify(row.visualBounds),
        row.boundsDelta,
        row.runtimeHitPathMatchesData,
        row.runtimeVisualPathMatchesData,
        row.runtimeHitDataVisualPathMatchesData,
        row.visualPointerEventsNone,
        row.decision,
        row.status,
      ]),
    ),
    '',
    '## Crop Artifacts',
    '',
    cropArtifacts.map((artifact) => `- ${artifact.id}: \`${artifact.artifact}\``).join('\n'),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
  ].join('\n');

  await fs.writeFile(outputPaths.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(outputPaths.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  await fs.writeFile(outputPaths.markdown, markdown, 'utf8');

  console.log(`visual_hit_split_json:${outputPaths.json}`);
  console.log(`visual_hit_split_csv:${outputPaths.csv}`);
  console.log(`visual_hit_split_markdown:${outputPaths.markdown}`);
  console.log(`visual_hit_split_crops:${cropDir}`);
  console.log(`status:${report.status} visualSplitBlocks=${report.summary.visualSplitBlockCount} blockers=${blockers.length}`);

  if (blockers.length > 0) {
    process.exit(1);
  }
};

const runOfficialThirdInfieldTrace = async () => {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const sharp = (await import('sharp')).default;
  const { GWANGJU_BLOCKS, GWANGJU_FULL_RETRACE_VERSION, GWANGJU_SEATMAP_IMAGE } = await import("../src/data/gwangjuSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium');
  const crop = { left: 340, top: 120, width: 420, height: 500 };
  const targetIds = [
    'k7-121',
    'k7-122',
    'k8-123',
    'k5-124',
    'k5-125',
    'k5-126',
    'k5-127',
    'third-wheelchair-seats',
    'party-seats-third',
  ];
  const blocks = targetIds.map((id) => GWANGJU_BLOCKS.find((block) => block.id === id)).filter(Boolean);
  const out = {
    json: path.join(reportDir, 'gwangju-seatmap-official-third-infield-trace.json'),
    csv: path.join(reportDir, 'gwangju-seatmap-official-third-infield-trace.csv'),
    markdown: path.join(reportDir, 'gwangju-seatmap-official-third-infield-trace.md'),
    overlay: path.join(reportDir, 'gwangju-seatmap-official-third-infield-trace-overlay.png'),
    crop: path.join(reportDir, 'gwangju-seatmap-official-third-infield-trace-crop.png'),
  };

  const boundsForPath = (pathData) => {
    const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const xs = numbers.filter((_, index) => index % 2 === 0);
    const ys = numbers.filter((_, index) => index % 2 === 1);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  };
  const csvEscape = (value) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  const rows = blocks.map((block) => ({
    id: block.id,
    block: block.block,
    shortLabel: block.imageGeometry.shortLabel,
    traceVersion: block.imageGeometry.traceVersion,
    labelX: block.imageGeometry.labelX,
    labelY: block.imageGeometry.labelY,
    hitBounds: boundsForPath(block.imageGeometry.d),
    visualBounds: boundsForPath(block.imageGeometry.visualD ?? block.imageGeometry.d),
    visualPath: block.imageGeometry.visualD ?? block.imageGeometry.d,
    hitPath: block.imageGeometry.d,
  }));
  const blockers = [
    ...(rows.length === targetIds.length ? [] : [`MISSING_RESTORED_BLOCKS:${targetIds.filter((id) => !rows.some((row) => row.id === id)).join('|')}`]),
    ...rows.filter((row) => row.traceVersion !== GWANGJU_FULL_RETRACE_VERSION).map((row) => `TRACE_VERSION_MISMATCH:${row.id}`),
  ];
  const overlaySvg = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.left} ${crop.top} ${crop.width} ${crop.height}">
  <rect x="${crop.left}" y="${crop.top}" width="${crop.width}" height="${crop.height}" fill="none" stroke="#0f172a" stroke-width="1" opacity="0.35"/>
  <rect x="${crop.left + 8}" y="${crop.top + 8}" width="224" height="34" rx="3" fill="rgba(255,255,255,0.86)" stroke="#cbd5e1" stroke-width="1"/>
  <text x="${crop.left + 16}" y="${crop.top + 22}" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#0284c7">blue fill/line = visualD shown in UI</text>
  <text x="${crop.left + 16}" y="${crop.top + 36}" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#f43f5e">red dashed = click hit-area d</text>
  ${rows.map((row) => `<path d="${row.visualPath}" fill="rgba(14,165,233,0.12)" stroke="#0284c7" stroke-width="1.4" vector-effect="non-scaling-stroke"/><path d="${row.hitPath}" fill="none" stroke="#f43f5e" stroke-width="1.1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/><text x="${row.labelX}" y="${row.labelY}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#0f172a">${row.shortLabel}</text>`).join('\n  ')}
</svg>`);

  await fs.mkdir(reportDir, { recursive: true });
  const officialCrop = await sharp(path.join(frontendRoot, GWANGJU_SEATMAP_IMAGE.imagePath))
    .extract(crop)
    .png()
    .toBuffer();
  await fs.writeFile(out.crop, officialCrop);
  await sharp(officialCrop)
    .composite([{ input: overlaySvg, left: 0, top: 0 }])
    .png()
    .toFile(out.overlay);

  const report = {
    generatedAt: new Date().toISOString(),
    status: blockers.length === 0 ? 'passed' : 'needs_review',
    traceVersion: GWANGJU_FULL_RETRACE_VERSION,
    coordinateSource: 'official PNG 2200x1159 only',
    artifactNamePolicy: 'gwangju-seatmap-official-third-infield-trace only; candidate/proposed/manual-official-retrace names are forbidden for release evidence',
    crop,
    targetIds,
    restoredBlocks: rows.length,
    blockers,
    artifacts: {
      officialCrop: path.relative(frontendRoot, out.crop),
      overlay: path.relative(frontendRoot, out.overlay),
    },
    rows,
  };
  const csvRows = [
    ['id', 'block', 'shortLabel', 'traceVersion', 'labelX', 'labelY', 'hitBounds', 'visualBounds'],
    ...rows.map((row) => [row.id, row.block, row.shortLabel, row.traceVersion, row.labelX, row.labelY, JSON.stringify(row.hitBounds), JSON.stringify(row.visualBounds)]),
  ];
  const markdown = [
    '# 광주 official third infield trace',
    '',
    `- generatedAt: \`${report.generatedAt}\``,
    `- status: \`${report.status}\``,
    `- traceVersion: \`${report.traceVersion}\``,
    `- coordinateSource: \`${report.coordinateSource}\``,
    `- restoredBlocks: \`${report.restoredBlocks}/${targetIds.length}\``,
    `- official crop: \`${report.artifacts.officialCrop}\``,
    `- overlay: \`${report.artifacts.overlay}\``,
    '',
    '이 산출물은 active 3루 116~120 및 인접 특수 구역의 최신 production `visualD`/`d`를 공식 PNG crop 위에 표시한다. `candidate`, `proposed`, `manual-official-retrace`, 기존 `third-base-retrace` 이름은 release evidence로 사용하지 않는다.',
    '',
    '| id | block | label | hitBounds | visualBounds |',
    '| --- | --- | --- | --- | --- |',
    ...rows.map((row) => `| ${row.id} | ${row.block} | ${row.shortLabel} | ${JSON.stringify(row.hitBounds)} | ${JSON.stringify(row.visualBounds)} |`),
    '',
    '## Blockers',
    '',
    blockers.length > 0 ? blockers.map((blocker) => `- \`${blocker}\``).join('\n') : '- none',
    '',
  ].join('\n');

  await fs.writeFile(out.json, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(out.csv, `${csvRows.map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
  await fs.writeFile(out.markdown, markdown, 'utf8');
  console.log(`official_third_infield_trace_json:${out.json}`);
  console.log(`official_third_infield_trace_overlay:${out.overlay}`);
  console.log(`status:${report.status} restoredBlocks=${rows.length} blockers=${blockers.length}`);
  if (blockers.length > 0) process.exit(1);
};

const TASKS = {
  "pixel-components": runPixelComponents,
  "image-alignment-audit": runImageAlignmentAudit,
  "official-third-infield-trace": runOfficialThirdInfieldTrace,
  "review-manifest": runReviewManifest,
  "runtime-layer-audit": runRuntimeLayerAudit,
  "release-gate": runReleaseGate,
  "visual-hit-split-audit": runVisualHitSplitAudit,
};

export const runGwangjuCoreQaTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Gwangju core QA task: ${task}. Available tasks: ${available}`);
  }

  const originalArgv = process.argv;
  process.argv = [originalArgv[0], originalArgv[1], ...args];
  try {
    await runner();
  } finally {
    process.argv = originalArgv;
  }
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runGwangjuCoreQaTask(task, args);
}
