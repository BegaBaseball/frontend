import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const imageRelativePath = 'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png';
const imagePath = process.env.DAEGU_OPERATOR_REFERENCE_IMAGE
  ? path.resolve(process.env.DAEGU_OPERATOR_REFERENCE_IMAGE)
  : path.join(frontendRoot, imageRelativePath);
const outputDir = path.join(frontendRoot, 'reports/stadium/daegu-operator-reference-trace');
const traceRegion = {
  x: 0,
  y: 0,
  width: 4096,
  height: 3260,
};
const minComponentArea = Number(process.env.DAEGU_OPERATOR_REFERENCE_MIN_AREA ?? 1200);
const hullSimplifyTolerance = Number(process.env.DAEGU_OPERATOR_REFERENCE_SIMPLIFY_TOLERANCE ?? 3);
const hitExpansionPx = Number(process.env.DAEGU_OPERATOR_REFERENCE_HIT_EXPANSION_PX ?? 8);

const colorClasses = [
  null,
  { id: 'PINK', stroke: '#EC4899', label: 'pink/magenta seats' },
  { id: 'DARK_RED', stroke: '#B91C1C', label: 'dark red seats' },
  { id: 'RED', stroke: '#EF4444', label: 'red seats' },
  { id: 'ORANGE', stroke: '#F97316', label: 'orange seats' },
  { id: 'YELLOW', stroke: '#FACC15', label: 'yellow seats' },
  { id: 'LIME', stroke: '#A3E635', label: 'lime seats' },
  { id: 'GREEN', stroke: '#22C55E', label: 'green seats' },
  { id: 'TEAL', stroke: '#14B8A6', label: 'teal seats' },
  { id: 'CYAN', stroke: '#38BDF8', label: 'cyan seats' },
  { id: 'BLUE', stroke: '#2563EB', label: 'blue seats' },
  { id: 'PURPLE', stroke: '#A855F7', label: 'purple seats' },
  { id: 'OTHER', stroke: '#F8FAFC', label: 'other saturated seats' },
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function rgbToHsv(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, max === 0 ? 0 : delta / max, max / 255];
}

function classifyPixel(r, g, b, a, x, y) {
  if (a < 48 || y < traceRegion.y || y > traceRegion.y + traceRegion.height) return 0;

  const [h, s, v] = rgbToHsv(r, g, b);
  if (s < 0.18 || v < 0.25) return 0;

  if (h >= 315 && h < 350) return 1;
  if (h < 10 || h >= 350) return v < 0.65 ? 2 : 3;
  if (h < 42) return 4;
  if (h < 66) return 5;
  if (h < 100) return 6;
  if (h < 150) return 7;
  if (h < 185) return 8;
  if (h < 210) return 9;
  if (h < 250) return 10;
  if (h < 315) return 11;
  return 12;
}

function cross(origin, a, b) {
  return (a[0] - origin[0]) * (b[1] - origin[1]) - (a[1] - origin[1]) * (b[0] - origin[0]);
}

function convexHull(points) {
  if (points.length <= 1) return points;

  const unique = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (unique.length <= 2) return unique;

  const lower = [];
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }

  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy));
}

function simplifyOpenPolyline(points, tolerance) {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;
  for (let current = 1; current < points.length - 1; current += 1) {
    const distance = distanceToSegment(points[current], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      index = current;
      maxDistance = distance;
    }
  }

  if (maxDistance > tolerance) {
    const left = simplifyOpenPolyline(points.slice(0, index + 1), tolerance);
    const right = simplifyOpenPolyline(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[points.length - 1]];
}

function simplifyClosedPolygon(points, tolerance) {
  if (points.length <= 4) return points;

  const closed = [...points, points[0]];
  const simplified = simplifyOpenPolyline(closed, tolerance);
  const withoutClosure = simplified.slice(0, -1);
  return withoutClosure.length >= 3 ? withoutClosure : points;
}

function expandPolygon(points, center, amount, width, height) {
  return points.map(([x, y]) => {
    const dx = x - center[0];
    const dy = y - center[1];
    const length = Math.hypot(dx, dy) || 1;
    return [
      Math.max(0, Math.min(width, Math.round(x + (dx / length) * amount))),
      Math.max(0, Math.min(height, Math.round(y + (dy / length) * amount))),
    ];
  });
}

function pointsToPath(points) {
  return `M ${points.map(([x, y]) => `${Math.round(x)} ${Math.round(y)}`).join(' L ')} Z`;
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildSvg({ components, imageHref, width, height }) {
  const rows = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '  <rect width="100%" height="100%" fill="#050505" />',
    `  <image href="${imageHref}" x="0" y="0" width="${width}" height="${height}" opacity="0.78" />`,
    '  <g fill="none" stroke-width="5" vector-effect="non-scaling-stroke">',
  ];

  components.forEach((component) => {
    rows.push(`    <path d="${component.draftVisualPath}" stroke="${component.stroke}" opacity="0.95" />`);
  });

  rows.push('  </g>');
  rows.push('  <g font-family="Arial, sans-serif" font-size="24" font-weight="900" text-anchor="middle" dominant-baseline="middle">');
  components.forEach((component) => {
    rows.push(`    <text x="${Math.round(component.labelPoint[0])}" y="${Math.round(component.labelPoint[1])}" fill="${component.stroke}" stroke="#050505" stroke-width="5" paint-order="stroke">${component.draftId}</text>`);
  });
  rows.push('  </g>');
  rows.push('</svg>');
  return `${rows.join('\n')}\n`;
}

async function main() {
  const imageBuffer = await fs.readFile(imagePath);
  const imageSha256 = sha256(imageBuffer);
  const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;

  const classIds = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const classPixelCounts = Object.fromEntries(colorClasses.filter(Boolean).map((colorClass) => [colorClass.id, 0]));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const classId = classifyPixel(data[offset], data[offset + 1], data[offset + 2], data[offset + 3], x, y);
      classIds[y * width + x] = classId;
      if (classId) classPixelCounts[colorClasses[classId].id] += 1;
    }
  }

  const queue = new Int32Array(width * height);
  const components = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      const classId = classIds[startIndex];
      if (!classId || visited[startIndex]) continue;

      let head = 0;
      let tail = 0;
      queue[tail] = startIndex;
      tail += 1;
      visited[startIndex] = 1;

      let area = 0;
      let minX = x;
      let minY = y;
      let maxX = x;
      let maxY = y;
      let sumX = 0;
      let sumY = 0;
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      const boundaryPoints = [];

      while (head < tail) {
        const index = queue[head];
        head += 1;
        const cx = index % width;
        const cy = Math.floor(index / width);
        const offset = index * 4;

        area += 1;
        sumX += cx;
        sumY += cy;
        sumR += data[offset];
        sumG += data[offset + 1];
        sumB += data[offset + 2];
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        let isBoundary = false;
        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) {
            isBoundary = true;
            continue;
          }
          const neighborIndex = ny * width + nx;
          if (classIds[neighborIndex] !== classId) {
            isBoundary = true;
            continue;
          }
          if (!visited[neighborIndex]) {
            visited[neighborIndex] = 1;
            queue[tail] = neighborIndex;
            tail += 1;
          }
        }
        if (isBoundary) boundaryPoints.push([cx, cy]);
      }

      if (area < minComponentArea) continue;

      const centroid = [sumX / area, sumY / area];
      const hull = simplifyClosedPolygon(convexHull(boundaryPoints), hullSimplifyTolerance);
      if (hull.length < 3) continue;
      const hitPolygon = expandPolygon(hull, centroid, hitExpansionPx, width, height);
      const colorClass = colorClasses[classId];
      const riskFlags = ['AUTO_COMPONENT_TRACE_DRAFT', 'OPERATOR_APPROVAL_REQUIRED'];
      if (maxY > traceRegion.y + traceRegion.height - 40) riskFlags.push('TRACE_REGION_BOTTOM_EDGE_NEAR_LEGEND');
      if (hull.length <= 4) riskFlags.push('SIMPLE_HULL_REVIEW');

      components.push({
        classId,
        colorClass: colorClass.id,
        colorClassLabel: colorClass.label,
        stroke: colorClass.stroke,
        area,
        bounds: {
          minX,
          minY,
          maxX,
          maxY,
          width: maxX - minX + 1,
          height: maxY - minY + 1,
        },
        averageColor: {
          r: Math.round(sumR / area),
          g: Math.round(sumG / area),
          b: Math.round(sumB / area),
        },
        labelPoint: [Number(centroid[0].toFixed(1)), Number(centroid[1].toFixed(1))],
        visualPolygon: hull,
        hitPolygon,
        draftVisualPath: pointsToPath(hull),
        draftHitPath: pointsToPath(hitPolygon),
        riskFlags,
        operatorDecision: 'PENDING',
      });
    }
  }

  components.sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX || b.area - a.area);
  components.forEach((component, index) => {
    component.draftId = `RAPAK_REF_${String(index + 1).padStart(3, '0')}`;
  });

  const summaryByColorClass = {};
  components.forEach((component) => {
    summaryByColorClass[component.colorClass] = (summaryByColorClass[component.colorClass] ?? 0) + 1;
  });

  const report = {
    status: 'draft-ready',
    generatedAt: new Date().toISOString(),
    source: {
      imagePath: path.relative(frontendRoot, imagePath),
      imageWidth: width,
      imageHeight: height,
      viewBox: `0 0 ${width} ${height}`,
      imageSha256,
      sourceId: 'OPERATOR_REFERENCE_RAPAK_2025',
      coordinateSystem: 'SOURCE_IMAGE_PIXEL',
    },
    policy: {
      productionWriteAllowed: false,
      canonicalDaeguOfficialPngUnchanged: true,
      operatorApprovalRequired: true,
      note: 'This report traces the user-provided 4096x4096 operator reference image only. It does not update DAEGU_BLOCKS.',
    },
    traceConfig: {
      traceRegion,
      minComponentArea,
      hullSimplifyTolerance,
      hitExpansionPx,
      alphaThreshold: 48,
      saturationThreshold: 0.18,
      valueThreshold: 0.25,
    },
    summary: {
      componentCount: components.length,
      classPixelCounts,
      summaryByColorClass,
    },
    components,
  };

  await fs.mkdir(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'daegu-operator-reference-trace.json');
  const csvPath = path.join(outputDir, 'daegu-operator-reference-trace.csv');
  const mdPath = path.join(outputDir, 'daegu-operator-reference-trace.md');
  const svgPath = path.join(outputDir, 'daegu-operator-reference-trace.svg');
  const pngPath = path.join(outputDir, 'daegu-operator-reference-trace.png');

  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(csvPath, [
    ['draftId', 'colorClass', 'area', 'minX', 'minY', 'maxX', 'maxY', 'labelX', 'labelY', 'pointCount', 'riskFlags', 'draftVisualPath'].map(csvEscape).join(','),
    ...components.map((component) => [
      component.draftId,
      component.colorClass,
      component.area,
      component.bounds.minX,
      component.bounds.minY,
      component.bounds.maxX,
      component.bounds.maxY,
      component.labelPoint[0],
      component.labelPoint[1],
      component.visualPolygon.length,
      component.riskFlags.join('|'),
      component.draftVisualPath,
    ].map(csvEscape).join(',')),
  ].join('\n') + '\n');

  const relativeImageHref = path.relative(outputDir, imagePath).replaceAll(path.sep, '/');
  const overlaySvg = buildSvg({ components, imageHref: relativeImageHref, width, height });
  await fs.writeFile(svgPath, overlaySvg);
  await sharp(Buffer.from(overlaySvg)).png().toFile(pngPath);
  await fs.writeFile(mdPath, [
    '# 대구 operator reference polygon trace draft',
    '',
    `- status: \`${report.status}\``,
    `- source: \`${report.source.imagePath}\``,
    `- coordinate system: \`${report.source.viewBox}\``,
    `- image sha256: \`${report.source.imageSha256}\``,
    `- production write allowed: \`${report.policy.productionWriteAllowed}\``,
    `- component count: \`${report.summary.componentCount}\``,
    `- trace region: \`x=${traceRegion.x}, y=${traceRegion.y}, width=${traceRegion.width}, height=${traceRegion.height}\``,
    '',
    '## Color Class Counts',
    '',
    ...Object.entries(summaryByColorClass)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([colorClass, count]) => `- \`${colorClass}\`: ${count}`),
    '',
    '## Outputs',
    '',
    `- JSON: \`${path.relative(frontendRoot, jsonPath)}\``,
    `- CSV: \`${path.relative(frontendRoot, csvPath)}\``,
    `- SVG overlay: \`${path.relative(frontendRoot, svgPath)}\``,
    `- PNG overlay: \`${path.relative(frontendRoot, pngPath)}\``,
    '',
    '## Policy',
    '',
    '이 산출물은 업로드된 4096x4096 operator reference 이미지의 자동 polygon draft다.',
    '`DAEGU_BLOCKS`와 기존 공식 PNG release lock은 변경하지 않는다.',
    'production 반영은 block name 매핑과 operator approval row가 채워진 뒤 별도 단계에서만 허용한다.',
    '',
  ].join('\n'));

  console.log(`operator_reference_trace_json:${jsonPath}`);
  console.log(`operator_reference_trace_csv:${csvPath}`);
  console.log(`operator_reference_trace_markdown:${mdPath}`);
  console.log(`operator_reference_trace_svg:${svgPath}`);
  console.log(`operator_reference_trace_png:${pngPath}`);
  console.log(`status:${report.status} components=${components.length} sourceSha256=${imageSha256}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
