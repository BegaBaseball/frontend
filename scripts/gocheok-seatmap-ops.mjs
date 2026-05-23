import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runPixelComponents = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { default: zlib } = await import("node:zlib");
  const { fileURLToPath } = await import("node:url");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');
  const imagePath = path.join(
    frontendRoot,
    'src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png',
  );

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const reportPath = path.join(outDir, 'gocheok-seatmap-pixel-components.json');

  const colorRanges = [
    {
      name: 'TABLE',
      label: '테이블석',
      minArea: 300,
      test: (r, g, b) => r < 105 && g < 125 && b > 30 && b > r + 10 && b > g - 25,
    },
    {
      name: 'DIAMOND',
      label: '다이아몬드석',
      minArea: 80,
      test: (r, g, b) => r >= 150 && r <= 255 && g >= 35 && g <= 155 && b >= 80 && b <= 215,
    },
    {
      name: 'SKY_BLUE',
      label: '스카이블루석',
      minArea: 80,
      test: (r, g, b) => r >= 0 && r <= 125 && g >= 105 && g <= 230 && b >= 115 && b <= 255 && b > r + 35 && g > r + 35,
    },
    {
      name: 'BURGUNDY',
      label: '버건디석',
      minArea: 50,
      test: (r, g, b) => r >= 65 && r <= 225 && g <= 125 && b <= 160 && r > g + 15 && r > b + 10,
    },
    {
      name: 'GOLD',
      label: '골드 내야석',
      minArea: 140,
      test: (r, g, b) => r >= 185 && g >= 105 && g <= 210 && b <= 105,
    },
    {
      name: 'OUTFIELD',
      label: '외야 지정석',
      minArea: 50,
      test: (r, g, b) => r >= 55 && r <= 235 && g >= 85 && g <= 245 && b <= 185 && g > b + 5 && r + b < 385,
    },
  ];

  function paethPredictor(left, up, upLeft) {
    const p = left + up - upLeft;
    const pa = Math.abs(p - left);
    const pb = Math.abs(p - up);
    const pc = Math.abs(p - upLeft);
    if (pa <= pb && pa <= pc) return left;
    if (pb <= pc) return up;
    return upLeft;
  }

  async function decodePng(filePath) {
    const buffer = await fs.readFile(filePath);
    const signature = buffer.subarray(0, 8).toString('hex');
    if (signature !== '89504e470d0a1a0a') {
      throw new Error(`Not a PNG file: ${filePath}`);
    }

    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    let interlace = 0;
    const idatChunks = [];

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

    const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
    if (bitDepth !== 8 || channels === 0 || interlace !== 0) {
      throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}`);
    }

    const stride = width * channels;
    const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
    const decoded = Buffer.alloc(width * height * channels);
    let sourceOffset = 0;
    let previous = Buffer.alloc(stride);

    for (let y = 0; y < height; y += 1) {
      const filter = inflated[sourceOffset];
      sourceOffset += 1;
      const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
      sourceOffset += stride;

      for (let index = 0; index < stride; index += 1) {
        const left = index >= channels ? row[index - channels] : 0;
        const up = previous[index];
        const upLeft = index >= channels ? previous[index - channels] : 0;
        if (filter === 1) row[index] = (row[index] + left) & 0xff;
        else if (filter === 2) row[index] = (row[index] + up) & 0xff;
        else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
        else if (filter === 4) row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 0xff;
        else if (filter !== 0) throw new Error(`Unsupported PNG row filter: ${filter}`);
      }

      row.copy(decoded, y * stride);
      previous = row;
    }

    return { width, height, channels, data: decoded };
  }

  function convexHull(points) {
    const sorted = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
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
  }

  function connectedComponents(mask, width, height, minArea) {
    const seen = new Uint8Array(width * height);
    const components = [];
    const queue = [];

    for (let start = 0; start < mask.length; start += 1) {
      if (!mask[start] || seen[start]) continue;

      let area = 0;
      let sumX = 0;
      let sumY = 0;
      let minX = width;
      let maxX = 0;
      let minY = height;
      let maxY = 0;
      const boundaryPoints = [];
      queue.length = 0;
      queue.push(start);
      seen[start] = 1;

      while (queue.length > 0) {
        const current = queue.pop();
        const x = current % width;
        const y = Math.floor(current / width);
        area += 1;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        const neighbors = [
          x > 0 ? current - 1 : -1,
          x < width - 1 ? current + 1 : -1,
          y > 0 ? current - width : -1,
          y < height - 1 ? current + width : -1,
        ];
        if (neighbors.some((next) => next < 0 || !mask[next])) {
          boundaryPoints.push([x, y]);
        }
        for (const next of neighbors) {
          if (next < 0 || seen[next] || !mask[next]) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      if (area >= minArea) {
        components.push({
          area,
          bbox: { minX, minY, maxX, maxY },
          center: {
            x: Number((sumX / area).toFixed(1)),
            y: Number((sumY / area).toFixed(1)),
          },
          hull: convexHull(boundaryPoints),
        });
      }
    }

    components.sort((a, b) => b.area - a.area);
    return components;
  }

  const image = await decodePng(imagePath);
  const report = {
    generatedAt: new Date().toISOString(),
    image: {
      source: path.relative(frontendRoot, imagePath),
      width: image.width,
      height: image.height,
    },
    ranges: {},
  };

  for (const range of colorRanges) {
    const mask = new Uint8Array(image.width * image.height);
    for (let index = 0; index < image.width * image.height; index += 1) {
      const offset = index * image.channels;
      const r = image.data[offset];
      const g = image.data[offset + 1];
      const b = image.data[offset + 2];
      const a = image.channels === 4 ? image.data[offset + 3] : 255;
      if (a > 200 && range.test(r, g, b)) {
        mask[index] = 1;
      }
    }

    report.ranges[range.name] = {
      label: range.label,
      minArea: range.minArea,
      components: connectedComponents(mask, image.width, image.height, range.minArea).slice(0, 120),
    };
  }

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(`pixel_components:${reportPath}`);
};

const runTraceManifest = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { GOCHEOK_BLOCKS, GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS, GOCHEOK_OMITTED_OFFICIAL_BLOCKS, GOCHEOK_SEATMAP_IMAGE, GOCHEOK_TRACE_REVIEW_REGIONS, GOCHEOK_TRACE_REVIEWED_BLOCK_IDS } = await import("../src/data/gocheokSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const pixelComponentsPath = path.join(outDir, 'gocheok-seatmap-pixel-components.json');

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

  const readJsonIfExists = async (filePath) => {
    try {
      return JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  };

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

  const hullPath = (hull) => {
    if (!Array.isArray(hull) || hull.length === 0) return '';
    return `M ${hull.map((point) => point.join(' ')).join(' L ')} Z`;
  };

  const reviewRegionByBlockId = new Map();
  GOCHEOK_TRACE_REVIEW_REGIONS.forEach((region) => {
    region.blockIds.forEach((blockId) => {
      reviewRegionByBlockId.set(blockId, region);
    });
  });

  const reviewedIds = new Set(GOCHEOK_TRACE_REVIEWED_BLOCK_IDS);
  const todoIds = new Set(GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS);
  const pixelComponents = await readJsonIfExists(pixelComponentsPath);

  const nearestCandidateForBlock = (block) => {
    const components = pixelComponents?.ranges?.[block.category]?.components ?? [];
    if (components.length === 0) return null;

    return components
      .map((component) => ({
        component,
        distance: Math.hypot(
          component.center.x - block.imageGeometry.labelX,
          component.center.y - block.imageGeometry.labelY,
        ),
      }))
      .sort((a, b) => a.distance - b.distance)[0] ?? null;
  };

  const blockRows = GOCHEOK_BLOCKS.map((block) => {
    const region = reviewRegionByBlockId.get(block.id);
    const candidate = nearestCandidateForBlock(block);
    const bounds = pathBounds(block.imageGeometry.d);

    return {
      id: block.id,
      block: block.block,
      name: block.name,
      category: block.category,
      level: block.level,
      side: block.side,
      fanRole: block.fanRole,
      reviewRegionId: region?.id ?? 'UNASSIGNED',
      tracePriority: region?.priority ?? 'P5',
      traceMethod: region?.method ?? 'MANUAL_REVIEW_REQUIRED',
      traceStatus: todoIds.has(block.id) ? 'TODO' : reviewedIds.has(block.id) ? 'REVIEWED' : 'PENDING',
      labelX: block.imageGeometry.labelX,
      labelY: block.imageGeometry.labelY,
      label: block.imageGeometry.shortLabel,
      pathBounds: bounds,
      path: block.imageGeometry.d,
      candidateDistance: candidate ? Number(candidate.distance.toFixed(1)) : null,
      candidateArea: candidate?.component.area ?? null,
      candidateCenter: candidate?.component.center ?? null,
      candidateBbox: candidate?.component.bbox ?? null,
      candidateHullPath: hullPath(candidate?.component.hull),
    };
  });

  const regionRows = GOCHEOK_TRACE_REVIEW_REGIONS.map((region) => {
    const activeBlockCount = region.blockIds.filter((id) => GOCHEOK_BLOCKS.some((block) => block.id === id)).length;
    const reviewedBlockCount = region.blockIds.filter((id) => reviewedIds.has(id)).length;
    const todoBlockCount = region.blockIds.filter((id) => todoIds.has(id)).length;
    return {
      id: region.id,
      label: region.label,
      priority: region.priority,
      method: region.method,
      activeBlockCount,
      reviewedBlockCount,
      todoBlockCount,
      note: region.note,
    };
  });

  const summary = {
    totalBlocks: GOCHEOK_BLOCKS.length,
    reviewedBlocks: GOCHEOK_TRACE_REVIEWED_BLOCK_IDS.length,
    todoBlocks: GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS.length,
    omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS.length,
    pendingBlocks: blockRows.filter((row) => row.traceStatus === 'PENDING').length,
    regions: regionRows.length,
    pixelComponentsAvailable: Boolean(pixelComponents),
  };

  const manifest = {
    generatedAt: new Date().toISOString(),
    asset: GOCHEOK_SEATMAP_IMAGE,
    summary,
    reviewRegions: regionRows,
    manualTodoBlockIds: GOCHEOK_GEOMETRY_MANUAL_TODO_BLOCKS,
    omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
    reviewedBlockIds: GOCHEOK_TRACE_REVIEWED_BLOCK_IDS,
    blocks: blockRows,
  };

  const omittedOfficialBlocksTable = GOCHEOK_OMITTED_OFFICIAL_BLOCKS.length > 0
    ? [
        '## 제외된 공식/합성 블록',
        '',
        markdownTable(
          ['block', 'reason', 'review note'],
          GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => [
            `\`${entry.block}\``,
            entry.reason,
            entry.reviewNote,
          ]),
        ),
        '',
      ]
    : [];

  const markdown = [
    '# 고척 스카이돔 좌석도 hit-area trace review manifest',
    '',
    `- 공식 이미지: \`${GOCHEOK_SEATMAP_IMAGE.requiredAssetFileName}\` (${GOCHEOK_SEATMAP_IMAGE.imageWidth}x${GOCHEOK_SEATMAP_IMAGE.imageHeight})`,
    `- image sha256: \`${GOCHEOK_SEATMAP_IMAGE.imageSha256}\``,
    `- total blocks: ${summary.totalBlocks}`,
    `- reviewed blocks: ${summary.reviewedBlocks}`,
    `- pending blocks: ${summary.pendingBlocks}`,
    `- manual TODO blocks: ${summary.todoBlocks || '-'}`,
    `- omitted official/synthetic blocks: ${GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => entry.block).join(', ') || '-'}`,
    `- pixel candidates: ${summary.pixelComponentsAvailable ? '`READY`' : '`MISSING`'}`,
    '',
    '## 검수 구역',
    '',
    markdownTable(
      ['id', 'label', 'priority', 'method', 'active', 'reviewed', 'todo', 'note'],
      regionRows.map((region) => [
        `\`${region.id}\``,
        region.label,
        region.priority,
        region.method,
        String(region.activeBlockCount),
        String(region.reviewedBlockCount),
        String(region.todoBlockCount),
        region.note,
      ]),
    ),
    '',
    ...omittedOfficialBlocksTable,
    '## 사용 방법',
    '',
    '1. `npm run qa:stadium:gocheok:trace-review`를 실행해 manifest, evidence crop, debug overlay screenshot을 생성합니다.',
    '2. CSV의 `candidateHullPath`와 현재 `path`를 비교하고, 공식 PNG 경계가 불명확하면 TODO에 남깁니다.',
    '3. 승인된 블록만 `GOCHEOK_TRACE_REVIEWED_BLOCK_IDS`에 추가합니다.',
    '4. `npm run stadium:gocheok:evidence`로 주요 crop overlay 증빙을 갱신합니다.',
    '5. 좌표 변경 후 `node --import tsx --test src/data/gocheokSeatData.test.ts`로 overlap/bounds/self-intersection을 확인합니다.',
    '',
  ].join('\n');

  await fs.mkdir(outDir, { recursive: true });

  const jsonPath = path.join(outDir, 'gocheok-seatmap-trace-review.json');
  const csvPath = path.join(outDir, 'gocheok-seatmap-trace-review.csv');
  const markdownPath = path.join(outDir, 'gocheok-seatmap-trace-review.md');

  await fs.writeFile(jsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'block',
      'name',
      'category',
      'level',
      'side',
      'fanRole',
      'reviewRegionId',
      'tracePriority',
      'traceMethod',
      'traceStatus',
      'labelX',
      'labelY',
      'label',
      'pathBounds',
      'path',
      'candidateDistance',
      'candidateArea',
      'candidateCenter',
      'candidateBbox',
      'candidateHullPath',
    ],
    ...blockRows.map((block) => [
      block.id,
      block.block,
      block.name,
      block.category,
      block.level,
      block.side,
      block.fanRole,
      block.reviewRegionId,
      block.tracePriority,
      block.traceMethod,
      block.traceStatus,
      block.labelX,
      block.labelY,
      block.label,
      JSON.stringify(block.pathBounds),
      block.path,
      block.candidateDistance ?? '',
      block.candidateArea ?? '',
      block.candidateCenter ? JSON.stringify(block.candidateCenter) : '',
      block.candidateBbox ? JSON.stringify(block.candidateBbox) : '',
      block.candidateHullPath,
    ]),
  ]);
  await fs.writeFile(markdownPath, markdown, 'utf8');

  console.log(`manifest_json:${jsonPath}`);
  console.log(`manifest_csv:${csvPath}`);
  console.log(`manifest_markdown:${markdownPath}`);
  console.log(`status:ok total=${summary.totalBlocks} reviewed=${summary.reviewedBlocks} pending=${summary.pendingBlocks} todo=${summary.todoBlocks}`);
};

const runEvidence = async () => {
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { GOCHEOK_BLOCKS, GOCHEOK_CATEGORIES, GOCHEOK_OMITTED_OFFICIAL_BLOCKS, GOCHEOK_SEATMAP_IMAGE } = await import("../src/data/gocheokSeatData.ts");

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const imagePath = path.join(frontendRoot, GOCHEOK_SEATMAP_IMAGE.imagePath);
  const blocksById = new Map(GOCHEOK_BLOCKS.map((block) => [block.id, block]));

  const rangeBlockIds = (start, end) => (
    Array.from({ length: end - start + 1 }, (_, index) => `gocheok-${start + index}`)
  );

  const xmlEscape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

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

  const intersectsCrop = (bounds, crop) => (
    bounds.maxX >= crop.x
    && bounds.minX <= crop.x + crop.width
    && bounds.maxY >= crop.y
    && bounds.minY <= crop.y + crop.height
  );

  const containsBounds = (bounds, crop) => (
    bounds.minX >= crop.x
    && bounds.maxX <= crop.x + crop.width
    && bounds.minY >= crop.y
    && bounds.maxY <= crop.y + crop.height
  );

  const crops = [
    {
      id: 'top-outfield',
      title: '323-334 and 425-435 top outfield',
      x: 130,
      y: 65,
      width: 420,
      height: 155,
      blockIds: [
        ...rangeBlockIds(323, 334),
        ...rangeBlockIds(425, 435),
      ],
    },
    {
      id: 'right-outfield-335-review',
      title: 'Right outfield 335 omission review',
      x: 420,
      y: 95,
      width: 160,
      height: 150,
      blockIds: [
        'gocheok-334',
        'gocheok-435',
        'gocheok-220',
        'gocheok-221',
        'gocheok-222',
      ],
      note: `Omitted: ${GOCHEOK_OMITTED_OFFICIAL_BLOCKS.map((entry) => entry.block).join(', ') || '-'}`,
    },
    {
      id: 'anchor-overview',
      title: 'Anchor blocks 101/114/401/424/430/412',
      x: 20,
      y: 95,
      width: 610,
      height: 780,
      blockIds: [
        'gocheok-101',
        'gocheok-114',
        'gocheok-401',
        'gocheok-424',
        'gocheok-430',
        'gocheok-412',
      ],
    },
  ];

  const expectedCropIds = new Set(['top-outfield', 'right-outfield-335-review', 'anchor-overview']);
  if (crops.length !== expectedCropIds.size || crops.some((crop) => !expectedCropIds.has(crop.id))) {
    throw new Error(`Unexpected Gocheok evidence crop set: ${crops.map((crop) => crop.id).join(', ')}`);
  }

  const buildOverlaySvg = (crop, blocks) => {
    return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${crop.height}" viewBox="${crop.x} ${crop.y} ${crop.width} ${crop.height}">
    <style>
      .label { font: 700 9px Arial, sans-serif; text-anchor: middle; dominant-baseline: central; fill: #020617; stroke: #ffffff; stroke-width: 2px; paint-order: stroke; }
    </style>
    <rect x="${crop.x + 1}" y="${crop.y + 1}" width="${crop.width - 2}" height="${crop.height - 2}" fill="none" stroke="#0f172a" stroke-width="2" />
    ${blocks.map((block) => {
      const category = GOCHEOK_CATEGORIES[block.category];
      const color = category?.light ?? '#38bdf8';
      return `
    <path d="${xmlEscape(block.imageGeometry.d)}" fill="${color}" fill-opacity="0.38" stroke="#0f172a" stroke-width="1.5" vector-effect="non-scaling-stroke" />
    <text class="label" x="${block.imageGeometry.labelX}" y="${block.imageGeometry.labelY}">${xmlEscape(block.imageGeometry.shortLabel)}</text>`;
    }).join('')}
  </svg>`;
  };

  const buildHeaderSvg = (crop, headerHeight) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width}" height="${headerHeight}" viewBox="0 0 ${crop.width} ${headerHeight}">
    <rect x="0" y="0" width="${crop.width}" height="${headerHeight}" fill="#f8fafc" />
    <text x="8" y="17" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#0f172a">${xmlEscape(crop.title)}</text>
    ${crop.note ? `<text x="8" y="33" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#be123c">${xmlEscape(crop.note)}</text>` : ''}
  </svg>`;

  await fs.mkdir(outDir, { recursive: true });

  const metadata = await sharp(imagePath).metadata();
  if (metadata.width !== GOCHEOK_SEATMAP_IMAGE.imageWidth || metadata.height !== GOCHEOK_SEATMAP_IMAGE.imageHeight) {
    throw new Error(`Unexpected Gocheok image size: ${metadata.width}x${metadata.height}`);
  }

  const outputs = [];

  for (const crop of crops) {
    const blocks = crop.blockIds
      .map((id) => blocksById.get(id))
      .filter(Boolean)
      .filter((block) => intersectsCrop(pathBounds(block.imageGeometry.d), crop));
    const missingBlockIds = crop.blockIds.filter((id) => !blocksById.has(id));
    if (missingBlockIds.length > 0) {
      throw new Error(`${crop.id} evidence crop references missing blocks: ${missingBlockIds.join(', ')}`);
    }
    if (blocks.length === 0) {
      throw new Error(`${crop.id} evidence crop did not include any visible hit-area paths`);
    }
    const clippedBlockIds = blocks
      .filter((block) => !containsBounds(pathBounds(block.imageGeometry.d), crop))
      .map((block) => block.id);
    if (clippedBlockIds.length > 0) {
      throw new Error(`${crop.id} evidence crop clips hit-area paths: ${clippedBlockIds.join(', ')}`);
    }

    const overlay = Buffer.from(buildOverlaySvg(crop, blocks));
    const headerHeight = crop.note ? 42 : 26;
    const header = Buffer.from(buildHeaderSvg(crop, headerHeight));
    const outputPath = path.join(outDir, `gocheok-evidence-${crop.id}.png`);

    const cropBuffer = await sharp(imagePath)
      .extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height })
      .composite([{ input: overlay, left: 0, top: 0 }])
      .png()
      .toBuffer();

    await sharp(cropBuffer)
      .extend({ top: headerHeight, background: '#f8fafc' })
      .composite([{ input: header, left: 0, top: 0 }])
      .png()
      .toFile(outputPath);

    outputs.push({
      id: crop.id,
      title: crop.title,
      path: outputPath,
      crop: {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
      },
      headerHeight,
      blockIds: blocks.map((block) => block.id),
      missingBlockIds,
      omittedOfficialBlocks: GOCHEOK_OMITTED_OFFICIAL_BLOCKS,
    });
  }

  const reportPath = path.join(outDir, 'gocheok-seatmap-evidence-crops.json');
  await fs.writeFile(reportPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    asset: GOCHEOK_SEATMAP_IMAGE,
    outputs,
  }, null, 2)}\n`, 'utf8');

  outputs.forEach((output) => {
    console.log(`evidence_${output.id}:${output.path}`);
  });
  console.log(`evidence_report:${reportPath}`);
};

const TASKS = {
  "pixel-components": runPixelComponents,
  "trace-manifest": runTraceManifest,
  "evidence": runEvidence,
};

export const runGocheokSeatmapTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Gocheok seatmap task: ${task}. Available tasks: ${available}`);
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
  await runGocheokSeatmapTask(task, args);
}
