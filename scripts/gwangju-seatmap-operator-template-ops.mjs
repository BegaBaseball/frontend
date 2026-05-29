import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runOperatorTemplate = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultOutDir = path.join(frontendRoot, 'reports/stadium');
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
  const jsonPath = path.join(outDir, 'gwangju-seatmap-operator-template.json');
  const markdownPath = path.join(outDir, 'gwangju-seatmap-operator-template.md');
  
  const emptyOperatorInput = () => ({
    officialBlocks: [],
    level: null,
    side: null,
    fanRole: null,
    points: [],
    labelX: null,
    labelY: null,
    shortLabel: null,
    reviewer: null,
    reviewedAt: null,
    operatorNote: null,
  });
  
  const normalizePreservedOperatorInput = (operatorInput) => {
    if (!operatorInput || typeof operatorInput !== 'object' || Array.isArray(operatorInput)) {
      return emptyOperatorInput();
    }
  
    return {
      officialBlocks: Array.isArray(operatorInput.officialBlocks) ? operatorInput.officialBlocks : [],
      level: operatorInput.level ?? null,
      side: operatorInput.side ?? null,
      fanRole: operatorInput.fanRole ?? null,
      points: Array.isArray(operatorInput.points) ? operatorInput.points : [],
      labelX: operatorInput.labelX ?? null,
      labelY: operatorInput.labelY ?? null,
      shortLabel: operatorInput.shortLabel ?? null,
      reviewer: operatorInput.reviewer ?? null,
      reviewedAt: operatorInput.reviewedAt ?? null,
      operatorNote: operatorInput.operatorNote ?? null,
    };
  };
  
  const readExistingTemplate = async () => {
    try {
      return JSON.parse(await fs.readFile(jsonPath, 'utf8'));
    } catch {
      return null;
    }
  };
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`),
  ].join('\n');
  
  const existingTemplate = await readExistingTemplate();
  const preservedInputsById = new Map(
    (Array.isArray(existingTemplate?.sections) ? existingTemplate.sections : [])
      .filter((section) => section?.id && section?.operatorInput)
      .map((section) => [section.id, normalizePreservedOperatorInput(section.operatorInput)]),
  );
  
  const operatorSections = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
    .filter((section) => section.status === 'PENDING_OPERATOR_INPUT')
    .map((section) => ({
      id: section.id,
      category: section.category,
      name: section.name,
      status: section.status,
      coordinateSystem: section.coordinateSystem,
      requiredFields: section.requiredFields,
      sourcePolicy: {
        allowedSource: 'operator-provided official PNG coordinates only',
        disallowedSources: [
          'browser CSS pixels',
          'resized screenshots',
          'external crawling',
          'web-search-based baseball data',
          'third-party copied seatmap images',
        ],
      },
      operatorInput: preservedInputsById.get(section.id) ?? emptyOperatorInput(),
    }));
  
  const template = {
    generatedAt: new Date().toISOString(),
    contract: 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1',
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
    preservedOperatorInputSections: operatorSections
      .filter((section) => preservedInputsById.has(section.id))
      .map((section) => section.id),
    coordinateRules: [
      'Use the original official PNG coordinate system only: 2200x1159.',
      'Record polygon points as [x, y] pairs in clockwise or counter-clockwise order.',
      'Record level as one of 1F, 2F, 3F, 4F, 5F, OUTFIELD.',
      'Keep K7 and away cheering sections inactive until this template is filled and reviewed.',
      'Regenerating this template preserves operatorInput values by section id.',
      'Do not infer or auto-repair missing baseball data from external web sources.',
    ],
    sections: operatorSections,
  };
  
  const markdown = [
    '# 광주 K7/원정응원석 운영자 polygon 입력 템플릿',
    '',
    `- 공식 이미지: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- 입력 대기 구역: ${GWANGJU_PENDING_OPERATOR_SECTIONS.join(', ') || '-'}`,
    '- 좌표 기준: 공식 PNG 원본 좌표계만 사용합니다.',
    '- 금지: 브라우저 CSS 픽셀, 리사이즈된 스크린샷, 외부 크롤링/웹 검색 기반 보정, third-party 이미지 복사',
    '- 재생성 안전성: 기존 `operatorInput` 값은 section id 기준으로 보존합니다.',
    '',
    '## 입력 필드',
    '',
    markdownTable(
      ['section', 'category', 'required fields'],
      operatorSections.map((section) => [
        section.name,
        section.category,
        section.requiredFields.map((field) => `\`${field}\``).join(', '),
      ]),
    ),
    '',
    '## JSON 작성 규칙',
    '',
    '1. `operatorInput.points`에 공식 PNG 좌표계의 polygon `[x, y]` 배열을 넣습니다.',
    '2. `operatorInput.labelX`, `operatorInput.labelY`는 polygon 내부의 label anchor로 넣습니다.',
    '3. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채웁니다.',
    '4. 운영자 검수 전까지 실제 hit-area 데이터로 승격하지 않습니다.',
    '',
  ].join('\n');
  
  await fs.mkdir(outDir, { recursive: true });
  
  await fs.writeFile(jsonPath, `${JSON.stringify(template, null, 2)}\n`, 'utf8');
  await fs.writeFile(markdownPath, markdown, 'utf8');
  
  console.log(`operator_template_json:${jsonPath}`);
  console.log(`operator_template_markdown:${markdownPath}`);
  console.log(`status:ok pending=${operatorSections.length}`);
};

const runOperatorTemplateValidate = async () => {
  const { default: crypto } = await import('node:crypto');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BLOCKS,
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template.json');
  
  const VALIDATION_VERSION = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1';
  const TEMPLATE_CONTRACT = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1';
  const MIN_POLYGON_AREA = 16;
  const ACTIVE_OVERLAP_WARNING_THRESHOLD = 0.005;
  const CANDIDATE_OVERLAP_FAILURE_THRESHOLD = 0.005;
  const SAMPLE_STEP = 4;
  const VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD']);
  const VALID_SIDES = new Set(['FIRST_BASE', 'THIRD_BASE', 'CENTER', 'OUTFIELD']);
  const VALID_FAN_ROLES = new Set(['HOME', 'AWAY', 'NEUTRAL']);
  const REQUIRED_SOURCE_POLICY_TERMS = [
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
  ];
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const hasFlag = (name) => process.argv.includes(name);
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  
  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');
  
  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  
  const pointFromTuple = (value) => {
    if (!Array.isArray(value) || value.length !== 2) return null;
    const x = numberOrNull(value[0]);
    const y = numberOrNull(value[1]);
    if (x === null || y === null) return null;
    return [x, y];
  };
  
  const pathPoints = (pathData) => {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  };
  
  const polygonArea = (points) => Math.abs(points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];
    return sum + (point[0] * next[1]) - (next[0] * point[1]);
  }, 0) / 2);
  
  const boundsForPoints = (points) => ({
    minX: Math.min(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxX: Math.max(...points.map(([x]) => x)),
    maxY: Math.max(...points.map(([, y]) => y)),
  });
  
  const distanceToSegment = (point, start, end) => {
    const segmentX = end[0] - start[0];
    const segmentY = end[1] - start[1];
    const lengthSquared = (segmentX * segmentX) + (segmentY * segmentY);
    if (lengthSquared === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  
    const ratio = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * segmentX) + ((point[1] - start[1]) * segmentY)
    ) / lengthSquared));
    return Math.hypot(
      point[0] - (start[0] + (ratio * segmentX)),
      point[1] - (start[1] + (ratio * segmentY)),
    );
  };
  
  const pointOnPolygonBoundary = (point, polygon, tolerance = 0.75) => {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  };
  
  const pointInPolygon = (point, polygon) => {
    if (polygon.length < 3) return false;
    if (pointOnPolygonBoundary(point, polygon)) return true;
  
    const [x, y] = point;
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
  
  const orientation = (a, b, c) => {
    const value = ((b[1] - a[1]) * (c[0] - b[0])) - ((b[0] - a[0]) * (c[1] - b[1]));
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  };
  
  const onSegment = (a, b, c) => (
    b[0] <= Math.max(a[0], c[0])
    && b[0] >= Math.min(a[0], c[0])
    && b[1] <= Math.max(a[1], c[1])
    && b[1] >= Math.min(a[1], c[1])
  );
  
  const segmentsIntersect = (a, b, c, d) => {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(a, c, b)) return true;
    if (o2 === 0 && onSegment(a, d, b)) return true;
    if (o3 === 0 && onSegment(c, a, d)) return true;
    if (o4 === 0 && onSegment(c, b, d)) return true;
    return false;
  };
  
  const hasSelfIntersection = (points) => {
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        const adjacent = first === second
          || firstNext === second
          || secondNext === first;
        if (adjacent) continue;
        if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
          return true;
        }
      }
    }
    return false;
  };
  
  const sampledOverlapRatio = (aPoints, bPoints) => {
    if (aPoints.length < 3 || bPoints.length < 3) return 0;
    const aBounds = boundsForPoints(aPoints);
    const bBounds = boundsForPoints(bPoints);
    const minX = Math.max(aBounds.minX, bBounds.minX);
    const minY = Math.max(aBounds.minY, bBounds.minY);
    const maxX = Math.min(aBounds.maxX, bBounds.maxX);
    const maxY = Math.min(aBounds.maxY, bBounds.maxY);
    if (minX >= maxX || minY >= maxY) return 0;
  
    let overlapSamples = 0;
    for (let y = minY; y <= maxY; y += SAMPLE_STEP) {
      for (let x = minX; x <= maxX; x += SAMPLE_STEP) {
        if (pointInPolygon([x, y], aPoints) && pointInPolygon([x, y], bPoints)) {
          overlapSamples += 1;
        }
      }
    }
  
    const overlapArea = overlapSamples * SAMPLE_STEP * SAMPLE_STEP;
    return overlapArea / Math.max(1, Math.min(polygonArea(aPoints), polygonArea(bPoints)));
  };
  
  const activeBlockPolygons = GWANGJU_BLOCKS.map((block) => ({
    id: block.id,
    name: block.name,
    points: pathPoints(block.imageGeometry.d),
  }));
  
  const activeBlocksContainingPoint = (point) => activeBlockPolygons
    .filter((block) => pointInPolygon(point, block.points))
    .map((block) => block.id);
  
  const activeBlockOverlapWarnings = (points) => activeBlockPolygons
    .map((block) => ({
      blockId: block.id,
      ratio: sampledOverlapRatio(points, block.points),
    }))
    .filter((row) => row.ratio > ACTIVE_OVERLAP_WARNING_THRESHOLD)
    .map((row) => `ACTIVE_BLOCK_OVERLAP_REQUIRES_Z_ORDER_REVIEW:${row.blockId}:${row.ratio.toFixed(4)}`);
  
  const normalizeOperatorInput = (operatorInput = {}) => ({
    officialBlocks: Array.isArray(operatorInput.officialBlocks)
      ? operatorInput.officialBlocks.map((value) => String(value).trim()).filter(Boolean)
      : [],
    level: String(operatorInput.level ?? '').trim(),
    side: String(operatorInput.side ?? '').trim(),
    fanRole: String(operatorInput.fanRole ?? '').trim(),
    points: Array.isArray(operatorInput.points) ? operatorInput.points : [],
    labelX: numberOrNull(operatorInput.labelX),
    labelY: numberOrNull(operatorInput.labelY),
    shortLabel: String(operatorInput.shortLabel ?? '').trim(),
    reviewer: String(operatorInput.reviewer ?? '').trim(),
    reviewedAt: String(operatorInput.reviewedAt ?? '').trim(),
    operatorNote: String(operatorInput.operatorNote ?? '').trim(),
  });
  
  const hasAnyOperatorInput = (input) => (
    input.officialBlocks.length > 0
    || input.level
    || input.side
    || input.fanRole
    || input.points.length > 0
    || input.labelX !== null
    || input.labelY !== null
    || input.shortLabel
    || input.reviewer
    || input.reviewedAt
    || input.operatorNote
  );
  
  const validatePolygon = (points) => {
    const reasons = [];
    if (points.length < 3) reasons.push('POINTS_REQUIRE_AT_LEAST_THREE_VERTICES');
    if (points.some((point) => point === null)) reasons.push('POINTS_MUST_BE_NUMERIC_XY_TUPLES');
    const numericPoints = points.filter(Boolean);
    if (numericPoints.some(([x, y]) => x < 0 || y < 0 || x > GWANGJU_SEATMAP_IMAGE.imageWidth || y > GWANGJU_SEATMAP_IMAGE.imageHeight)) {
      reasons.push('POINTS_OUTSIDE_OFFICIAL_IMAGE_BOUNDS');
    }
    if (numericPoints.length >= 3 && polygonArea(numericPoints) < MIN_POLYGON_AREA) {
      reasons.push('POLYGON_AREA_TOO_SMALL');
    }
    if (numericPoints.length >= 4 && hasSelfIntersection(numericPoints)) {
      reasons.push('POLYGON_SELF_INTERSECTION');
    }
    return {
      reasons,
      points: numericPoints,
      area: numericPoints.length >= 3 ? polygonArea(numericPoints) : 0,
      bounds: numericPoints.length >= 3 ? boundsForPoints(numericPoints) : null,
    };
  };
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const strict = hasFlag('--strict');
  
  const template = await readJson(inputPath);
  const inputSha256 = await sha256File(inputPath);
  const expectedRequirements = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
    .filter((section) => section.status === 'PENDING_OPERATOR_INPUT');
  const requirementById = new Map(expectedRequirements.map((section) => [section.id, section]));
  const sectionIds = (template.sections ?? []).map((section) => String(section.id ?? '').trim());
  const duplicateSectionIds = sectionIds.filter((id, index) => id && sectionIds.indexOf(id) !== index);
  const duplicateSectionIdSet = new Set(duplicateSectionIds);
  const unknownSectionIds = sectionIds.filter((id) => id && !requirementById.has(id));
  const missingSectionIds = expectedRequirements
    .map((section) => section.id)
    .filter((id) => !sectionIds.includes(id));
  
  const templateReasons = [];
  if (template.contract !== TEMPLATE_CONTRACT) templateReasons.push('CONTRACT_MISMATCH');
  if (template.asset?.imageWidth !== GWANGJU_SEATMAP_IMAGE.imageWidth) templateReasons.push('ASSET_WIDTH_MISMATCH');
  if (template.asset?.imageHeight !== GWANGJU_SEATMAP_IMAGE.imageHeight) templateReasons.push('ASSET_HEIGHT_MISMATCH');
  if (template.asset?.requiredAssetFileName !== GWANGJU_SEATMAP_IMAGE.requiredAssetFileName) {
    templateReasons.push('ASSET_FILENAME_MISMATCH');
  }
  if (missingSectionIds.length > 0) templateReasons.push(`MISSING_OPERATOR_SECTIONS:${missingSectionIds.join(' ')}`);
  if (unknownSectionIds.length > 0) templateReasons.push(`UNKNOWN_OPERATOR_SECTIONS:${unknownSectionIds.join(' ')}`);
  if (duplicateSectionIds.length > 0) templateReasons.push(`DUPLICATE_OPERATOR_SECTIONS:${duplicateSectionIds.join(' ')}`);
  
  const candidateRows = (template.sections ?? [])
    .filter((section) => requirementById.has(String(section.id ?? '').trim()))
    .map((section) => {
      const id = String(section.id ?? '').trim();
      const requirement = requirementById.get(id);
      const reasons = [];
      const warnings = [];
  
      if (duplicateSectionIdSet.has(id)) reasons.push('DUPLICATE_SECTION_ID');
      if (section.category !== requirement.category) reasons.push('CATEGORY_MISMATCH');
      if (section.name !== requirement.name) reasons.push('SECTION_NAME_MISMATCH');
      if (section.coordinateSystem?.imageWidth !== GWANGJU_SEATMAP_IMAGE.imageWidth) {
        reasons.push('COORDINATE_SYSTEM_WIDTH_MISMATCH');
      }
      if (section.coordinateSystem?.imageHeight !== GWANGJU_SEATMAP_IMAGE.imageHeight) {
        reasons.push('COORDINATE_SYSTEM_HEIGHT_MISMATCH');
      }
      if (section.sourcePolicy?.allowedSource !== 'operator-provided official PNG coordinates only') {
        reasons.push('SOURCE_POLICY_ALLOWED_SOURCE_MISMATCH');
      }
      REQUIRED_SOURCE_POLICY_TERMS.forEach((term) => {
        if (!section.sourcePolicy?.disallowedSources?.includes(term)) {
          reasons.push(`SOURCE_POLICY_MISSING_DISALLOWED_TERM:${term}`);
        }
      });
  
      const operatorInput = normalizeOperatorInput(section.operatorInput);
      const pending = !hasAnyOperatorInput(operatorInput);
      let polygonValidation = {
        reasons: [],
        points: [],
        area: 0,
        bounds: null,
      };
      let labelInsidePolygon = null;
      let activeLabelConflicts = [];
  
      if (pending) {
        if (strict) reasons.push('OPERATOR_INPUT_PENDING');
      } else {
        if (operatorInput.officialBlocks.length === 0) reasons.push('OFFICIAL_BLOCKS_REQUIRED');
        if (!VALID_LEVELS.has(operatorInput.level)) reasons.push('LEVEL_REQUIRED_OR_INVALID');
        if (!VALID_SIDES.has(operatorInput.side)) reasons.push('SIDE_REQUIRED_OR_INVALID');
        if (!VALID_FAN_ROLES.has(operatorInput.fanRole)) reasons.push('FAN_ROLE_REQUIRED_OR_INVALID');
        if (!operatorInput.shortLabel) reasons.push('SHORT_LABEL_REQUIRED');
        if (!operatorInput.reviewer) reasons.push('REVIEWER_REQUIRED');
        if (!operatorInput.reviewedAt) reasons.push('REVIEWED_AT_REQUIRED');
        if (operatorInput.reviewedAt && Number.isNaN(Date.parse(operatorInput.reviewedAt))) {
          reasons.push('REVIEWED_AT_NOT_PARSEABLE');
        }
  
        polygonValidation = validatePolygon(operatorInput.points.map(pointFromTuple));
        reasons.push(...polygonValidation.reasons);
  
        if (operatorInput.labelX === null || operatorInput.labelY === null) {
          reasons.push('LABEL_COORDINATES_REQUIRED');
        } else if (
          operatorInput.labelX < 0
          || operatorInput.labelY < 0
          || operatorInput.labelX > GWANGJU_SEATMAP_IMAGE.imageWidth
          || operatorInput.labelY > GWANGJU_SEATMAP_IMAGE.imageHeight
        ) {
          reasons.push('LABEL_OUTSIDE_OFFICIAL_IMAGE_BOUNDS');
        } else if (polygonValidation.points.length >= 3) {
          const labelPoint = [operatorInput.labelX, operatorInput.labelY];
          labelInsidePolygon = pointInPolygon(labelPoint, polygonValidation.points);
          if (!labelInsidePolygon) reasons.push('LABEL_OUTSIDE_POLYGON');
          activeLabelConflicts = activeBlocksContainingPoint(labelPoint);
          if (activeLabelConflicts.length > 0) {
            warnings.push(`LABEL_OVERLAPS_ACTIVE_BLOCK_REQUIRES_Z_ORDER_REVIEW:${activeLabelConflicts.join(' ')}`);
          }
        }
  
        if (polygonValidation.points.length >= 3) {
          warnings.push(...activeBlockOverlapWarnings(polygonValidation.points));
        }
      }
  
      return {
        id,
        name: requirement.name,
        category: requirement.category,
        pending,
        validForPromotion: !pending && reasons.length === 0,
        reasons,
        warnings,
        officialBlocks: operatorInput.officialBlocks,
        level: operatorInput.level,
        side: operatorInput.side,
        fanRole: operatorInput.fanRole,
        shortLabel: operatorInput.shortLabel,
        reviewer: operatorInput.reviewer,
        reviewedAt: operatorInput.reviewedAt,
        pointCount: polygonValidation.points.length,
        polygonArea: Number(polygonValidation.area.toFixed(2)),
        bounds: polygonValidation.bounds,
        labelX: operatorInput.labelX,
        labelY: operatorInput.labelY,
        labelInsidePolygon,
        activeLabelConflicts,
        points: polygonValidation.points,
      };
    });
  
  for (let first = 0; first < candidateRows.length; first += 1) {
    for (let second = first + 1; second < candidateRows.length; second += 1) {
      const firstRow = candidateRows[first];
      const secondRow = candidateRows[second];
      const sharedOfficialBlocks = firstRow.officialBlocks
        .filter((officialBlock) => secondRow.officialBlocks.includes(officialBlock));
  
      if (!firstRow.pending && !secondRow.pending && sharedOfficialBlocks.length > 0) {
        firstRow.reasons.push(`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP:${secondRow.id}:${sharedOfficialBlocks.join(' ')}`);
        secondRow.reasons.push(`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP:${firstRow.id}:${sharedOfficialBlocks.join(' ')}`);
        firstRow.validForPromotion = false;
        secondRow.validForPromotion = false;
      }
  
      if (firstRow.points.length < 3 || secondRow.points.length < 3) continue;
      const overlapRatio = sampledOverlapRatio(firstRow.points, secondRow.points);
      if (overlapRatio > CANDIDATE_OVERLAP_FAILURE_THRESHOLD) {
        firstRow.reasons.push(`OPERATOR_SECTION_OVERLAP:${secondRow.id}:${overlapRatio.toFixed(4)}`);
        secondRow.reasons.push(`OPERATOR_SECTION_OVERLAP:${firstRow.id}:${overlapRatio.toFixed(4)}`);
        firstRow.validForPromotion = false;
        secondRow.validForPromotion = false;
      }
    }
  }
  
  const invalidRows = candidateRows.filter((row) => row.reasons.length > 0);
  const pendingRows = candidateRows.filter((row) => row.pending);
  const summaryStatus = templateReasons.length > 0 || invalidRows.length > 0
    ? 'failed'
    : pendingRows.length > 0
      ? 'pending'
      : 'ready';
  const summary = {
    validationVersion: VALIDATION_VERSION,
    input: path.relative(frontendRoot, inputPath),
    inputSha256,
    strict,
    status: summaryStatus,
    expectedSections: expectedRequirements.length,
    totalSections: candidateRows.length,
    pendingSections: pendingRows.length,
    validPromotionSections: candidateRows.filter((row) => row.validForPromotion).length,
    invalidSections: invalidRows.length,
    warningSections: candidateRows.filter((row) => row.warnings.length > 0).length,
    templateReasons,
  };
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    acceptanceGate: {
      coordinateSystem: `${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight}`,
      nonAutomaticPromotion: true,
      requiredAfterDataDiff: [
        'npm run test:stadium:seatmaps',
        'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
        'npm run build',
      ],
      note: 'This validator does not modify gwangjuSeatData.ts. It only verifies operator-provided K7/AWAY coordinates before a reviewed data diff.',
    },
    sections: candidateRows.map(({ points, ...row }) => row),
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-template-validation.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-template-validation.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-template-validation.md');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'name',
      'category',
      'pending',
      'validForPromotion',
      'reasons',
      'warnings',
      'officialBlocks',
      'level',
      'side',
      'fanRole',
      'shortLabel',
      'pointCount',
      'polygonArea',
      'labelX',
      'labelY',
      'labelInsidePolygon',
      'reviewer',
      'reviewedAt',
    ],
    ...candidateRows.map((row) => [
      row.id,
      row.name,
      row.category,
      row.pending,
      row.validForPromotion,
      row.reasons,
      row.warnings,
      row.officialBlocks,
      row.level,
      row.side,
      row.fanRole,
      row.shortLabel,
      row.pointCount,
      row.polygonArea,
      row.labelX,
      row.labelY,
      row.labelInsidePolygon,
      row.reviewer,
      row.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 operator template validation',
    '',
    `- validation version: \`${VALIDATION_VERSION}\``,
    `- input: \`${summary.input}\``,
    `- input sha256: \`${summary.inputSha256}\``,
    `- strict: \`${summary.strict}\``,
    `- status: \`${summary.status}\``,
    `- expected sections: ${summary.expectedSections}`,
    `- total sections: ${summary.totalSections}`,
    `- pending sections: ${summary.pendingSections}`,
    `- valid promotion sections: ${summary.validPromotionSections}`,
    `- invalid sections: ${summary.invalidSections}`,
    `- warning sections: ${summary.warningSections}`,
    '',
    '## Template Gate',
    '',
    summary.templateReasons.length
      ? summary.templateReasons.map((reason) => `- \`${reason}\``).join('\n')
      : 'No template-level failures.',
    '',
    '## Section Results',
    '',
    markdownTable(
      ['section', 'pending', 'valid', 'reasons', 'warnings'],
      candidateRows.map((row) => [
        `\`${row.name}\``,
        `\`${row.pending}\``,
        `\`${row.validForPromotion}\``,
        row.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        row.warnings.map((warning) => `\`${warning}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Promotion Gate',
    '',
    '1. 이 검증은 `gwangjuSeatData.ts`를 수정하지 않습니다.',
    '2. `validForPromotion=true`인 구역만 별도 data diff로 승격할 수 있습니다.',
    '3. 좌표는 공식 PNG 원본 2200x1159 기준만 허용합니다.',
    '4. 승격 후에는 `npm run test:stadium:seatmaps`, `node scripts/stadium-seatmap-ops.mjs gwangju trace-review`, `npm run build`를 다시 통과해야 합니다.',
    '',
  ].join('\n'), 'utf8');
  
  console.log(`operator_template_validation_json:${jsonPath}`);
  console.log(`operator_template_validation_csv:${csvPath}`);
  console.log(`operator_template_validation_markdown:${markdownPath}`);
  console.log(`status:${summary.status} sections=${summary.totalSections} pending=${summary.pendingSections} valid=${summary.validPromotionSections} invalid=${summary.invalidSections}`);
  
  if (summary.status === 'failed') {
    process.exitCode = 1;
  }
};

const runOperatorTemplateApplyPlan = async () => {
  const { default: crypto } = await import('node:crypto');
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  const defaultInputPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template.json');
  const defaultValidationPath = path.join(defaultReportDir, 'gwangju-seatmap-operator-template-validation.json');
  
  const APPLY_PLAN_VERSION = 'GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1';
  const REQUIRED_VALIDATION_VERSION = 'GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1';
  const VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD']);
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const hasFlag = (name) => process.argv.includes(name);
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
  
  const sha256File = async (filePath) => crypto
    .createHash('sha256')
    .update(await fs.readFile(filePath))
    .digest('hex');
  
  const numberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };
  
  const formatNumber = (value) => (
    Number.isInteger(value) ? String(value) : Number(value).toFixed(1).replace(/\.0$/, '')
  );
  
  const formatPoints = (points) => {
    if (!Array.isArray(points) || points.length === 0) return '[]';
    return `[\n${points.map((point) => `    [${formatNumber(point[0])}, ${formatNumber(point[1])}]`).join(',\n')},\n  ]`;
  };
  
  const normalizeOperatorInput = (operatorInput = {}) => ({
    officialBlocks: Array.isArray(operatorInput.officialBlocks)
      ? operatorInput.officialBlocks.map((value) => String(value).trim()).filter(Boolean)
      : [],
    level: String(operatorInput.level ?? '').trim(),
    side: String(operatorInput.side ?? '').trim(),
    fanRole: String(operatorInput.fanRole ?? '').trim(),
    points: Array.isArray(operatorInput.points) ? operatorInput.points : [],
    labelX: numberOrNull(operatorInput.labelX),
    labelY: numberOrNull(operatorInput.labelY),
    shortLabel: String(operatorInput.shortLabel ?? '').trim(),
    reviewer: String(operatorInput.reviewer ?? '').trim(),
    reviewedAt: String(operatorInput.reviewedAt ?? '').trim(),
    operatorNote: String(operatorInput.operatorNote ?? '').trim(),
  });
  
  const buildSeatViewSections = (name, shortLabel, officialBlocks) => Array.from(new Set([
    name,
    shortLabel,
    ...officialBlocks,
    ...officialBlocks.map((block) => `${block}블록`),
    `광주 ${name}`,
    `KIA ${name}`,
  ].filter(Boolean)));
  
  const buildGeometrySnippet = (section, input) => [
    `  '${section.id}': blockGeometry(`,
    `  ${formatPoints(input.points)},`,
    `  ${formatNumber(input.labelX)},`,
    `  ${formatNumber(input.labelY)},`,
    `  ${JSON.stringify(input.shortLabel)},`,
    '),',
  ].join('\n');
  
  const buildBlockDefinitionSnippet = (section, input) => {
    const level = VALID_LEVELS.has(input.level) ? input.level : '<MANUAL_BASEBALL_DATA_REQUIRED_LEVEL>';
    const seatViewSections = buildSeatViewSections(section.name, input.shortLabel, input.officialBlocks);
  
    return [
      `  // MANUAL_BASEBALL_DATA_REQUIRED: confirm level before adding this block to SPECIAL_BLOCKS.`,
      `  { id: '${section.id}', level: '${level}', category: '${section.category}', name: '${section.name}', block: '${section.name}', officialBlocks: ${JSON.stringify(input.officialBlocks)}, side: '${input.side}', fanRole: '${input.fanRole}', seatViewSections: ${JSON.stringify(seatViewSections)} },`,
    ].join('\n');
  };
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const inputPath = path.resolve(frontendRoot, argValue('--input', defaultInputPath));
  const validationPath = path.resolve(frontendRoot, argValue('--validation', defaultValidationPath));
  const requireReady = hasFlag('--require-ready');
  
  const template = await readJson(inputPath);
  const validation = await readJson(validationPath);
  const inputSha256 = await sha256File(inputPath);
  const requirementById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.id, section]));
  const templateSectionById = new Map((template.sections ?? []).map((section) => [String(section.id ?? '').trim(), section]));
  const validationSections = validation.sections ?? [];
  
  const blockers = [];
  if (validation.summary?.validationVersion !== REQUIRED_VALIDATION_VERSION) {
    blockers.push('VALIDATION_VERSION_MISMATCH');
  }
  if (validation.summary?.inputSha256 !== inputSha256) {
    blockers.push('VALIDATION_INPUT_SHA256_MISMATCH');
  }
  if (validation.summary?.status === 'failed') {
    blockers.push('VALIDATION_STATUS_FAILED');
  }
  if (requireReady && validation.summary?.status !== 'ready') {
    blockers.push('VALIDATION_STATUS_NOT_READY');
  }
  
  const rows = validationSections.map((validationRow) => {
    const requirement = requirementById.get(validationRow.id);
    const templateSection = templateSectionById.get(validationRow.id);
    const operatorInput = normalizeOperatorInput(templateSection?.operatorInput);
    const rowBlockers = [];
  
    if (!requirement) rowBlockers.push('UNKNOWN_OPERATOR_REQUIREMENT');
    if (!templateSection) rowBlockers.push('TEMPLATE_SECTION_NOT_FOUND');
    if (validationRow.pending) rowBlockers.push('OPERATOR_INPUT_PENDING');
    if (validationRow.validForPromotion !== true) rowBlockers.push('SECTION_NOT_VALID_FOR_PROMOTION');
    if (validationRow.validForPromotion === true && !VALID_LEVELS.has(operatorInput.level)) {
      rowBlockers.push('LEVEL_MANUAL_BASEBALL_DATA_REQUIRED');
    }
  
    const validForDataDiff = validationRow.validForPromotion === true && rowBlockers.length === 0;
    return {
      id: validationRow.id,
      name: validationRow.name,
      category: validationRow.category,
      pending: validationRow.pending,
      validForPromotion: validationRow.validForPromotion,
      validForDataDiff,
      rowBlockers,
      manualDataRequired: rowBlockers.filter((blocker) => blocker.includes('MANUAL_BASEBALL_DATA_REQUIRED')),
      reviewer: operatorInput.reviewer,
      reviewedAt: operatorInput.reviewedAt,
      officialBlocks: operatorInput.officialBlocks,
      level: operatorInput.level,
      side: operatorInput.side,
      fanRole: operatorInput.fanRole,
      shortLabel: operatorInput.shortLabel,
      labelX: operatorInput.labelX,
      labelY: operatorInput.labelY,
      pointCount: operatorInput.points.length,
      geometrySnippet: validationRow.validForPromotion === true && requirement
        ? buildGeometrySnippet(requirement, operatorInput)
        : '',
      blockDefinitionSnippet: validationRow.validForPromotion === true && requirement
        ? buildBlockDefinitionSnippet(requirement, operatorInput)
        : '',
    };
  });
  
  const validDataDiffRows = rows.filter((row) => row.validForDataDiff);
  const manualDataRequiredRows = rows.filter((row) => row.manualDataRequired.length > 0);
  const pendingRows = rows.filter((row) => row.pending);
  
  let status = 'ready';
  if (blockers.length > 0) {
    status = 'blocked';
  } else if (pendingRows.length > 0 || validation.summary?.status === 'pending') {
    status = 'pending';
  } else if (manualDataRequiredRows.length > 0) {
    status = 'manual-data-required';
  }
  
  const summary = {
    applyPlanVersion: APPLY_PLAN_VERSION,
    status,
    requireReady,
    input: path.relative(frontendRoot, inputPath),
    inputSha256,
    validation: path.relative(frontendRoot, validationPath),
    validationStatus: validation.summary?.status ?? '',
    asset: {
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    totalSections: rows.length,
    pendingSections: pendingRows.length,
    validPromotionSections: rows.filter((row) => row.validForPromotion).length,
    validDataDiffSections: validDataDiffRows.length,
    manualDataRequiredSections: manualDataRequiredRows.length,
    blockers,
    requiredPostApplyGate: [
      'npm run test:stadium:seatmaps',
      'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
      'npm run build',
    ],
  };
  
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    policy: {
      doesNotModifyDataFile: true,
      missingBaseballDataContract: 'MANUAL_BASEBALL_DATA_REQUIRED',
      allowedCoordinateSource: 'operator-provided official PNG coordinates only',
      disallowedSources: [
        'browser CSS pixels',
        'resized screenshots',
        'external crawling',
        'web-search-based baseball data',
        'third-party copied seatmap images',
      ],
    },
    rows,
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-template-apply-plan.md');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'name',
      'category',
      'pending',
      'validForPromotion',
      'validForDataDiff',
      'rowBlockers',
      'manualDataRequired',
      'officialBlocks',
      'level',
      'side',
      'fanRole',
      'shortLabel',
      'pointCount',
      'labelX',
      'labelY',
      'reviewer',
      'reviewedAt',
    ],
    ...rows.map((row) => [
      row.id,
      row.name,
      row.category,
      row.pending,
      row.validForPromotion,
      row.validForDataDiff,
      row.rowBlockers,
      row.manualDataRequired,
      row.officialBlocks,
      row.level,
      row.side,
      row.fanRole,
      row.shortLabel,
      row.pointCount,
      row.labelX,
      row.labelY,
      row.reviewer,
      row.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 operator apply plan',
    '',
    `- apply plan version: \`${APPLY_PLAN_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- require ready: \`${summary.requireReady}\``,
    `- input: \`${summary.input}\``,
    `- input sha256: \`${summary.inputSha256}\``,
    `- validation: \`${summary.validation}\``,
    `- validation status: \`${summary.validationStatus}\``,
    `- pending sections: ${summary.pendingSections}`,
    `- valid promotion sections: ${summary.validPromotionSections}`,
    `- valid data diff sections: ${summary.validDataDiffSections}`,
    `- manual data required sections: ${summary.manualDataRequiredSections}`,
    '',
    '## Gate',
    '',
    '1. 이 스크립트는 `gwangjuSeatData.ts`를 수정하지 않습니다.',
    '2. validation report의 `inputSha256`이 현재 template input과 다르면 차단합니다.',
    '3. 좌표는 공식 PNG 원본 2200x1159 기준만 허용합니다.',
    '4. level 등 승격에 필요한 야구 운영 데이터가 비어 있으면 `MANUAL_BASEBALL_DATA_REQUIRED`로 남깁니다.',
    '5. data diff 반영 후에는 `npm run test:stadium:seatmaps`, `node scripts/stadium-seatmap-ops.mjs gwangju trace-review`, `npm run build`를 다시 통과해야 합니다.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No plan-level blockers.',
    '',
    '## Section Results',
    '',
    markdownTable(
      ['section', 'pending', 'valid promotion', 'valid data diff', 'blockers', 'manual data'],
      rows.map((row) => [
        `\`${row.name}\``,
        `\`${row.pending}\``,
        `\`${row.validForPromotion}\``,
        `\`${row.validForDataDiff}\``,
        row.rowBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
        row.manualDataRequired.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Geometry Candidates',
    '',
    rows.some((row) => row.geometrySnippet)
      ? rows.filter((row) => row.geometrySnippet).map((row) => [
        `### ${row.name}`,
        '',
        '```ts',
        row.geometrySnippet,
        '',
        row.blockDefinitionSnippet,
        '```',
      ].join('\n')).join('\n\n')
      : 'No validated operator geometry candidates.',
    '',
  ].join('\n'), 'utf8');
  
  console.log(`operator_template_apply_plan_json:${jsonPath}`);
  console.log(`operator_template_apply_plan_csv:${csvPath}`);
  console.log(`operator_template_apply_plan_markdown:${markdownPath}`);
  console.log(`status:${summary.status} pending=${summary.pendingSections} validPromotion=${summary.validPromotionSections} validDataDiff=${summary.validDataDiffSections}`);
  
  if (summary.status === 'blocked' || (requireReady && summary.status !== 'ready')) {
    process.exitCode = 1;
  }
};

const runOperatorHandoff = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  
  const HANDOFF_VERSION = 'GWANGJU_OPERATOR_HANDOFF_V1';
  const REQUIRED_REPORTS = {
    traceReview: 'gwangju-seatmap-trace-review.json',
    operatorTemplate: 'gwangju-seatmap-operator-template.json',
    validation: 'gwangju-seatmap-operator-template-validation.json',
    applyPlan: 'gwangju-seatmap-operator-template-apply-plan.json',
  };
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const readJsonReport = async (reportDir, fileName) => {
    const filePath = path.join(reportDir, fileName);
    try {
      return {
        exists: true,
        filePath,
        relativePath: path.relative(frontendRoot, filePath),
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: false,
        filePath,
        relativePath: path.relative(frontendRoot, filePath),
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const reports = Object.fromEntries(await Promise.all(
    Object.entries(REQUIRED_REPORTS).map(async ([key, fileName]) => [key, await readJsonReport(reportDir, fileName)]),
  ));
  
  const requirementsById = new Map(GWANGJU_OPERATOR_SECTION_REQUIREMENTS.map((section) => [section.id, section]));
  const templateSections = reports.operatorTemplate.data?.sections ?? [];
  const validationRowsById = new Map((reports.validation.data?.sections ?? []).map((row) => [row.id, row]));
  const applyPlanRowsById = new Map((reports.applyPlan.data?.rows ?? []).map((row) => [row.id, row]));
  const missingReports = Object.values(reports)
    .filter((report) => !report.exists)
    .map((report) => report.relativePath);
  
  const workItems = templateSections.map((section) => {
    const requirement = requirementsById.get(section.id);
    const validationRow = validationRowsById.get(section.id) ?? {};
    const applyPlanRow = applyPlanRowsById.get(section.id) ?? {};
    const operatorInput = section.operatorInput ?? {};
    const pending = validationRow.pending !== false;
    const requiredActions = pending
      ? [
        'Fill operatorInput.points with official PNG 2200x1159 polygon points.',
        'Fill operatorInput.labelX and operatorInput.labelY inside the polygon.',
        'Fill officialBlocks, level, side, fanRole, shortLabel, reviewer, reviewedAt.',
        'Run node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict.',
        'Run node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready.',
      ]
      : [
        'Review validation warnings before data diff.',
        'Promote only validForDataDiff=true rows.',
      ];
  
    return {
      id: section.id,
      name: section.name,
      category: section.category,
      manualReferenceUrl: requirement?.manualReferenceUrl ?? '',
      coordinateSystem: section.coordinateSystem,
      requiredFields: section.requiredFields,
      pending,
      validationReasons: validationRow.reasons ?? [],
      validationWarnings: validationRow.warnings ?? [],
      validForPromotion: validationRow.validForPromotion === true,
      validForDataDiff: applyPlanRow.validForDataDiff === true,
      applyPlanBlockers: applyPlanRow.rowBlockers ?? [],
      manualDataRequired: applyPlanRow.manualDataRequired ?? [],
      operatorInputSnapshot: {
        officialBlocks: operatorInput.officialBlocks ?? [],
        level: operatorInput.level ?? null,
        side: operatorInput.side ?? null,
        fanRole: operatorInput.fanRole ?? null,
        pointCount: Array.isArray(operatorInput.points) ? operatorInput.points.length : 0,
        labelX: operatorInput.labelX ?? null,
        labelY: operatorInput.labelY ?? null,
        shortLabel: operatorInput.shortLabel ?? null,
        reviewer: operatorInput.reviewer ?? null,
        reviewedAt: operatorInput.reviewedAt ?? null,
      },
      requiredActions,
    };
  });
  
  const summary = {
    handoffVersion: HANDOFF_VERSION,
    status: missingReports.length > 0 ? 'blocked' : workItems.some((item) => item.pending) ? 'pending' : 'ready',
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    activeTraceBlocks: reports.traceReview.data?.summary?.totalBlocks ?? reports.traceReview.data?.summary?.totalBlocks,
    officialImageTracedBlocks: reports.traceReview.data?.summary?.officialImageTracedBlocks ?? reports.traceReview.data?.summary?.officialImageTraced,
    pixelAlignedBlocks: reports.traceReview.data?.summary?.pixelAlignedBlocks ?? reports.traceReview.data?.summary?.pixelAligned,
    overlapWarnings: reports.traceReview.data?.summary?.overlapWarningCount ?? 0,
    operatorSections: workItems.length,
    pendingSections: workItems.filter((item) => item.pending).length,
    validPromotionSections: workItems.filter((item) => item.validForPromotion).length,
    validDataDiffSections: workItems.filter((item) => item.validForDataDiff).length,
    missingReports,
  };
  
  const handoff = {
    generatedAt: new Date().toISOString(),
    summary,
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
    artifacts: {
      officialAsset: GWANGJU_SEATMAP_IMAGE.imagePath,
      traceReviewJson: reports.traceReview.relativePath,
      traceReviewMarkdown: path.join('reports/stadium', 'gwangju-seatmap-trace-review.md'),
      traceReviewOverlay: path.join('reports/stadium', 'gwangju-seatmap-trace-review-overlay.png'),
      traceReviewCleanCrops: path.join('reports/stadium', 'gwangju-seatmap-trace-review-clean-crops'),
      operatorTemplateJson: reports.operatorTemplate.relativePath,
      operatorTemplateMarkdown: path.join('reports/stadium', 'gwangju-seatmap-operator-template.md'),
      validationJson: reports.validation.relativePath,
      validationMarkdown: path.join('reports/stadium', 'gwangju-seatmap-operator-template-validation.md'),
      applyPlanJson: reports.applyPlan.relativePath,
      applyPlanMarkdown: path.join('reports/stadium', 'gwangju-seatmap-operator-template-apply-plan.md'),
    },
    requiredCommands: [
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:gate',
      'npm run stadium:gwangju:operator-status',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict',
      'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready',
      'npm run test:stadium:seatmaps',
      'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
      'npm run build',
    ],
    workItems,
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-handoff.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-handoff.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-handoff.md');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(handoff, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'name',
      'category',
      'pending',
      'validForPromotion',
      'validForDataDiff',
      'requiredFields',
      'applyPlanBlockers',
      'manualDataRequired',
      'pointCount',
      'labelX',
      'labelY',
      'reviewer',
      'reviewedAt',
    ],
    ...workItems.map((item) => [
      item.id,
      item.name,
      item.category,
      item.pending,
      item.validForPromotion,
      item.validForDataDiff,
      item.requiredFields,
      item.applyPlanBlockers,
      item.manualDataRequired,
      item.operatorInputSnapshot.pointCount,
      item.operatorInputSnapshot.labelX,
      item.operatorInputSnapshot.labelY,
      item.operatorInputSnapshot.reviewer,
      item.operatorInputSnapshot.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 운영자 handoff',
    '',
    `- handoff version: \`${summary.handoffVersion}\``,
    `- status: \`${summary.status}\``,
    `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- active traced blocks: ${summary.activeTraceBlocks ?? '-'}`,
    `- pixel aligned blocks: ${summary.pixelAlignedBlocks ?? '-'}`,
    `- overlap warnings: ${summary.overlapWarnings}`,
    `- operator sections: ${summary.operatorSections}`,
    `- pending sections: ${summary.pendingSections}`,
    `- valid data diff sections: ${summary.validDataDiffSections}`,
    '',
    '## Source Policy',
    '',
    '- 허용: operator-provided official PNG coordinates only',
    '- 좌표계: official PNG 2200x1159',
    '- 금지: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
    '- 누락 야구 운영 데이터: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '',
    '## Artifacts',
    '',
    Object.entries(handoff.artifacts)
      .map(([label, artifactPath]) => `- ${label}: \`${artifactPath}\``)
      .join('\n'),
    '',
    '## Required Commands',
    '',
    handoff.requiredCommands.map((command) => `- \`${command}\``).join('\n'),
    '',
    '## Work Items',
    '',
    markdownTable(
      ['section', 'pending', 'valid promotion', 'valid data diff', 'required fields', 'blockers'],
      workItems.map((item) => [
        `\`${item.name}\``,
        `\`${item.pending}\``,
        `\`${item.validForPromotion}\``,
        `\`${item.validForDataDiff}\``,
        item.requiredFields.map((field) => `\`${field}\``).join(', '),
        item.applyPlanBlockers.map((blocker) => `\`${blocker}\``).join('<br>') || '-',
      ]),
    ),
    '',
    '## Operator Steps',
    '',
    '1. `gwangju-seatmap-operator-template.json`에서 각 work item의 `operatorInput`을 채웁니다.',
    '2. `points`, `labelX`, `labelY`는 official PNG 원본 2200x1159 좌표만 사용합니다.',
    '3. `officialBlocks`, `level`, `side`, `fanRole`, `shortLabel`, `reviewer`, `reviewedAt`을 함께 채웁니다.',
    '4. `validate:strict`와 `apply-plan:require-ready`를 통과한 구역만 data diff로 승격합니다.',
    '5. `npm run stadium:gwangju:operator-status`로 pending/ready 상태를 확인합니다.',
    '6. `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply`로 dry-run 보고서를 확인합니다.',
    '7. `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke`와 `node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready`를 통과한 뒤 `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write`를 실행합니다.',
    '8. write 후에는 `node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate`를 통과시킵니다.',
    '',
  ].join('\n'), 'utf8');
  
  console.log(`operator_handoff_json:${jsonPath}`);
  console.log(`operator_handoff_csv:${csvPath}`);
  console.log(`operator_handoff_markdown:${markdownPath}`);
  console.log(`status:${summary.status} operatorSections=${summary.operatorSections} pending=${summary.pendingSections} validDataDiff=${summary.validDataDiffSections}`);
  
  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const runOperatorStatus = async () => {
  const { default: fs } = await import('node:fs/promises');
  const { default: path } = await import('node:path');
  const {
    fileURLToPath
  } = await import('node:url');
  const {
    GWANGJU_BASE_TRACE_BLOCK_COUNT,
    GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES,
    GWANGJU_EXPECTED_TRACE_BLOCK_COUNT,
    GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    GWANGJU_OPERATOR_SECTION_REQUIREMENTS,
    GWANGJU_PENDING_OPERATOR_SECTIONS,
    GWANGJU_SEATMAP_IMAGE,
  } = await import('../src/data/gwangjuSeatData.ts');

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const defaultReportDir = path.join(frontendRoot, 'reports/stadium');
  
  const STATUS_VERSION = 'GWANGJU_OPERATOR_STATUS_V1';
  const REQUIRED_REPORTS = {
    traceReview: 'gwangju-seatmap-trace-review.json',
    operatorTemplate: 'gwangju-seatmap-operator-template.json',
    validation: 'gwangju-seatmap-operator-template-validation.json',
    applyPlan: 'gwangju-seatmap-operator-template-apply-plan.json',
    handoff: 'gwangju-seatmap-operator-handoff.json',
  };
  
  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };
  
  const csvEscape = (value) => {
    const text = Array.isArray(value) ? value.join(' ') : String(value ?? '');
    if (!/[",\n]/.test(text)) return text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  
  const writeCsv = async (filePath, rows) => {
    const content = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    await fs.writeFile(filePath, `${content}\n`, 'utf8');
  };
  
  const markdownCell = (value) => String(value ?? '-')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
  
  const markdownTable = (headers, rows) => [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(markdownCell).join(' | ')} |`),
  ].join('\n');
  
  const readJsonReport = async (reportDir, fileName) => {
    const filePath = path.join(reportDir, fileName);
    try {
      return {
        exists: true,
        filePath,
        relativePath: path.relative(frontendRoot, filePath),
        data: JSON.parse(await fs.readFile(filePath, 'utf8')),
        error: null,
      };
    } catch (error) {
      return {
        exists: false,
        filePath,
        relativePath: path.relative(frontendRoot, filePath),
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };
  
  const numberOrZero = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  
  const boolOrFalse = (value) => value === true;
  
  const reportDir = path.resolve(frontendRoot, argValue('--report-dir', defaultReportDir));
  const reports = Object.fromEntries(await Promise.all(
    Object.entries(REQUIRED_REPORTS).map(async ([key, fileName]) => [key, await readJsonReport(reportDir, fileName)]),
  ));
  
  const missingReports = Object.values(reports)
    .filter((report) => !report.exists)
    .map((report) => report.relativePath);
  
  const traceSummary = reports.traceReview.data?.summary ?? {};
  const validationSummary = reports.validation.data?.summary ?? {};
  const applyPlanSummary = reports.applyPlan.data?.summary ?? {};
  const handoffSummary = reports.handoff.data?.summary ?? {};
  const validationRowsById = new Map((reports.validation.data?.sections ?? []).map((row) => [row.id, row]));
  const applyPlanRowsById = new Map((reports.applyPlan.data?.rows ?? []).map((row) => [row.id, row]));
  const handoffItemsById = new Map((reports.handoff.data?.workItems ?? []).map((item) => [item.id, item]));
  const templateSectionsById = new Map((reports.operatorTemplate.data?.sections ?? []).map((section) => [section.id, section]));
  const validationRows = reports.validation.data?.sections ?? [];
  const strictPendingOnlyValidationFailure = validationSummary.status === 'failed'
    && validationSummary.strict === true
    && (validationSummary.templateReasons ?? []).length === 0
    && validationRows.length > 0
    && validationRows
      .filter((row) => (row.reasons ?? []).length > 0)
      .every((row) => (row.reasons ?? []).every((reason) => reason === 'OPERATOR_INPUT_PENDING'));
  const operatorRequirements = GWANGJU_OPERATOR_SECTION_REQUIREMENTS
    .filter((section) => section.status === 'PENDING_OPERATOR_INPUT');
  const coordinatesAlreadyReady = GWANGJU_PENDING_OPERATOR_SECTIONS.length === 0;
  
  const workItems = operatorRequirements.map((requirement) => {
    const templateSection = templateSectionsById.get(requirement.id) ?? {};
    const validationRow = validationRowsById.get(requirement.id) ?? {};
    const applyPlanRow = applyPlanRowsById.get(requirement.id) ?? {};
    const handoffItem = handoffItemsById.get(requirement.id) ?? {};
    const operatorInput = templateSection.operatorInput ?? {};
    const pending = validationRow.pending !== false || handoffItem.pending !== false;
    const validForPromotion = validationRow.validForPromotion === true || handoffItem.validForPromotion === true;
    const validForDataDiff = applyPlanRow.validForDataDiff === true || handoffItem.validForDataDiff === true;
    const reasons = [
      ...(validationRow.reasons ?? []),
      ...(applyPlanRow.rowBlockers ?? []),
      ...(handoffItem.applyPlanBlockers ?? []),
    ];
  
    if (pending && !reasons.includes('OPERATOR_INPUT_PENDING')) {
      reasons.push('OPERATOR_INPUT_PENDING');
    }
    if (!validForDataDiff && !reasons.includes('NO_VALID_DATA_DIFF')) {
      reasons.push('NO_VALID_DATA_DIFF');
    }
  
    return {
      id: requirement.id,
      name: requirement.name,
      category: requirement.category,
      pending,
      validForPromotion,
      validForDataDiff,
      reasons: Array.from(new Set(reasons)),
      warnings: Array.from(new Set([
        ...(validationRow.warnings ?? []),
        ...(handoffItem.validationWarnings ?? []),
      ])),
      requiredFields: requirement.requiredFields,
      officialBlocks: operatorInput.officialBlocks ?? handoffItem.operatorInputSnapshot?.officialBlocks ?? [],
      level: operatorInput.level ?? handoffItem.operatorInputSnapshot?.level ?? null,
      side: operatorInput.side ?? handoffItem.operatorInputSnapshot?.side ?? null,
      fanRole: operatorInput.fanRole ?? handoffItem.operatorInputSnapshot?.fanRole ?? null,
      pointCount: Array.isArray(operatorInput.points)
        ? operatorInput.points.length
        : numberOrZero(handoffItem.operatorInputSnapshot?.pointCount),
      labelX: operatorInput.labelX ?? handoffItem.operatorInputSnapshot?.labelX ?? null,
      labelY: operatorInput.labelY ?? handoffItem.operatorInputSnapshot?.labelY ?? null,
      reviewer: operatorInput.reviewer ?? handoffItem.operatorInputSnapshot?.reviewer ?? null,
      reviewedAt: operatorInput.reviewedAt ?? handoffItem.operatorInputSnapshot?.reviewedAt ?? null,
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
  const overlappingDerivedRangePairs = [];
  for (let leftIndex = 0; leftIndex < derivedRangeRows.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < derivedRangeRows.length; rightIndex += 1) {
      const left = derivedRangeRows[leftIndex];
      const right = derivedRangeRows[rightIndex];
      const sharedOfficialBlocks = left.officialBlocks
        .filter((officialBlock) => right.officialBlocks.includes(officialBlock));
  
      if (sharedOfficialBlocks.length > 0) {
        overlappingDerivedRangePairs.push({
          left: left.id,
          right: right.id,
          sharedOfficialBlocks,
        });
      }
    }
  }
  const promotionModelWarnings = overlappingDerivedRangePairs.map((pair) => (
    `DERIVED_RANGE_OFFICIAL_BLOCK_OVERLAP_IS_FILTER_ONLY:${pair.left}:${pair.right}:${pair.sharedOfficialBlocks.join(' ')}`
  ));
  
  const activeTraceBlocks = numberOrZero(traceSummary.totalBlocks ?? handoffSummary.activeTraceBlocks);
  const officialImageTracedBlocks = numberOrZero(
    traceSummary.officialImageTracedBlocks ?? handoffSummary.officialImageTracedBlocks,
  );
  const pixelAlignedBlocks = numberOrZero(traceSummary.pixelAlignedBlocks ?? handoffSummary.pixelAlignedBlocks);
  const overlapWarnings = numberOrZero(traceSummary.overlapWarningCount ?? handoffSummary.overlapWarnings);
  const operatorSections = operatorRequirements.length;
  const pendingSections = workItems.filter((item) => item.pending).length;
  const validDataDiffSections = workItems.filter((item) => item.validForDataDiff).length;
  const expectedTraceBlocks = GWANGJU_EXPECTED_TRACE_BLOCK_COUNT;
  
  const blockers = [];
  missingReports.forEach((reportPath) => blockers.push(`MISSING_REPORT:${reportPath}`));
  if (reports.traceReview.exists && activeTraceBlocks !== expectedTraceBlocks) {
    blockers.push(`TRACE_ACTIVE_BLOCK_COUNT_CHANGED:${activeTraceBlocks}`);
  }
  if (reports.traceReview.exists && officialImageTracedBlocks !== expectedTraceBlocks) {
    blockers.push(`TRACE_OFFICIAL_IMAGE_TRACED_INCOMPLETE:${officialImageTracedBlocks}`);
  }
  if (reports.traceReview.exists && pixelAlignedBlocks !== expectedTraceBlocks) {
    blockers.push(`TRACE_PIXEL_ALIGNMENT_INCOMPLETE:${pixelAlignedBlocks}`);
  }
  if (reports.traceReview.exists && overlapWarnings > 0) {
    blockers.push(`TRACE_OVERLAP_WARNINGS_PRESENT:${overlapWarnings}`);
  }
  if (reports.validation.exists && validationSummary.status === 'failed' && !strictPendingOnlyValidationFailure) {
    blockers.push('VALIDATION_STATUS_FAILED');
  }
  if (reports.validation.exists && numberOrZero(validationSummary.invalidSections) > 0 && !strictPendingOnlyValidationFailure) {
    blockers.push(`VALIDATION_INVALID_SECTIONS:${validationSummary.invalidSections}`);
  }
  if (reports.applyPlan.exists && applyPlanSummary.status === 'blocked') {
    blockers.push('APPLY_PLAN_STATUS_BLOCKED');
  }
  (applyPlanSummary.blockers ?? []).forEach((blocker) => blockers.push(`APPLY_PLAN_BLOCKER:${blocker}`));
  if (reports.handoff.exists && handoffSummary.status === 'blocked') {
    blockers.push('HANDOFF_STATUS_BLOCKED');
  }
  
  const pendingReasons = [];
  if (!coordinatesAlreadyReady) {
    if (reports.validation.exists && boolOrFalse(validationSummary.strict) !== true) {
      pendingReasons.push('STRICT_VALIDATION_NOT_RUN');
    }
    if (reports.validation.exists && validationSummary.status !== 'ready') {
      pendingReasons.push(`STRICT_VALIDATION_NOT_READY:${validationSummary.status ?? 'missing'}`);
    }
    if (strictPendingOnlyValidationFailure) {
      pendingReasons.push('STRICT_VALIDATION_PENDING_OPERATOR_INPUT');
    }
    if (pendingSections > 0) pendingReasons.push(`OPERATOR_INPUT_PENDING:${pendingSections}`);
    if (validDataDiffSections === 0) pendingReasons.push('NO_VALID_DATA_DIFF_SECTIONS');
    if (reports.handoff.exists && handoffSummary.status !== 'ready') {
      pendingReasons.push(`HANDOFF_NOT_READY:${handoffSummary.status ?? 'missing'}`);
    }
    workItems
      .filter((item) => item.pending)
      .forEach((item) => pendingReasons.push(`${item.id}:OPERATOR_INPUT_PENDING`));
  }
  
  const status = blockers.length > 0 ? 'blocked' : pendingReasons.length > 0 ? 'pending' : 'ready';
  
  const summary = {
    statusVersion: STATUS_VERSION,
    status,
    doesNotModifyDataFile: true,
    coordinatesAlreadyReady,
    asset: {
      imagePath: GWANGJU_SEATMAP_IMAGE.imagePath,
      imageWidth: GWANGJU_SEATMAP_IMAGE.imageWidth,
      imageHeight: GWANGJU_SEATMAP_IMAGE.imageHeight,
      requiredAssetFileName: GWANGJU_SEATMAP_IMAGE.requiredAssetFileName,
    },
    baseTraceBlocks: GWANGJU_BASE_TRACE_BLOCK_COUNT,
    activeTraceBlocks,
    expectedTraceBlocks,
    derivedRangeCount: derivedRangeRows.length,
    derivedRangeDisplayBlocks: Object.fromEntries(derivedRangeRows.map((range) => [range.id, range.displayBlocks])),
    operatorBlockRangeReusesExistingTrace: GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE,
    promotionModelWarnings,
    officialImageTracedBlocks,
    pixelAlignedBlocks,
    overlapWarnings,
    operatorSections,
    pendingSections,
    validPromotionSections: workItems.filter((item) => item.validForPromotion).length,
    validDataDiffSections,
    validationStrict: validationSummary.strict === true,
    validationStatus: validationSummary.status ?? '',
    applyPlanStatus: applyPlanSummary.status ?? '',
    handoffStatus: handoffSummary.status ?? '',
    missingReports,
    blockers,
    pendingReasons: Array.from(new Set(pendingReasons)),
  };
  
  const statusReport = {
    generatedAt: new Date().toISOString(),
    summary,
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
    reports: Object.fromEntries(Object.entries(reports).map(([key, report]) => [
      key,
      {
        path: report.relativePath,
        exists: report.exists,
        error: report.error,
      },
    ])),
    nextCommands: {
      regenerateHandoff: 'npm run stadium:gwangju:operator-handoff',
      strictValidation: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict',
      requireReadyApplyPlan: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready',
      writeSmoke: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke',
      writeGuard: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard',
      requireReadyWriteGuard: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready',
      dryRunApply: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply',
      writeApply: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write',
      postWriteGate: 'node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate',
      postDataDiffGate: [
        'npm run test:stadium:seatmaps',
        'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
        'npm run build',
      ],
    },
    pendingOperatorSections: GWANGJU_PENDING_OPERATOR_SECTIONS,
    derivedRanges: derivedRangeRows,
    workItems,
  };
  
  const jsonPath = path.join(reportDir, 'gwangju-seatmap-operator-status.json');
  const csvPath = path.join(reportDir, 'gwangju-seatmap-operator-status.csv');
  const markdownPath = path.join(reportDir, 'gwangju-seatmap-operator-status.md');
  
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(jsonPath, `${JSON.stringify(statusReport, null, 2)}\n`, 'utf8');
  await writeCsv(csvPath, [
    [
      'id',
      'name',
      'category',
      'pending',
      'validForPromotion',
      'validForDataDiff',
      'reasons',
      'warnings',
      'requiredFields',
      'pointCount',
      'labelX',
      'labelY',
      'reviewer',
      'reviewedAt',
    ],
    ...workItems.map((item) => [
      item.id,
      item.name,
      item.category,
      item.pending,
      item.validForPromotion,
      item.validForDataDiff,
      item.reasons,
      item.warnings,
      item.requiredFields,
      item.pointCount,
      item.labelX,
      item.labelY,
      item.reviewer,
      item.reviewedAt,
    ]),
  ]);
  await fs.writeFile(markdownPath, [
    '# 광주 K7/원정응원석 operator status',
    '',
    `- status version: \`${STATUS_VERSION}\``,
    `- status: \`${summary.status}\``,
    `- modifies data file: \`${!summary.doesNotModifyDataFile}\``,
    `- coordinates already ready: \`${summary.coordinatesAlreadyReady}\``,
    `- official PNG: \`${GWANGJU_SEATMAP_IMAGE.requiredAssetFileName}\` (${GWANGJU_SEATMAP_IMAGE.imageWidth}x${GWANGJU_SEATMAP_IMAGE.imageHeight})`,
    `- base traced blocks: ${summary.baseTraceBlocks}`,
    `- active traced blocks: ${summary.activeTraceBlocks}`,
    `- expected traced blocks: ${summary.expectedTraceBlocks}`,
    `- derived range count: ${summary.derivedRangeCount}`,
    `- K7/AWAY aggregate hit-area mode: \`${GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE ? 'REUSES_EXISTING_TRACE_ONLY' : 'INDEPENDENT_POLYGON'}\``,
    `- official traced blocks: ${summary.officialImageTracedBlocks}`,
    `- pixel aligned blocks: ${summary.pixelAlignedBlocks}`,
    `- overlap warnings: ${summary.overlapWarnings}`,
    `- operator sections: ${summary.operatorSections}`,
    `- pending sections: ${summary.pendingSections}`,
    `- valid data diff sections: ${summary.validDataDiffSections}`,
    `- strict validation: \`${summary.validationStrict}\``,
    `- validation status: \`${summary.validationStatus || '-'}\``,
    `- apply plan status: \`${summary.applyPlanStatus || '-'}\``,
    `- handoff status: \`${summary.handoffStatus || '-'}\``,
    '',
    '## Source Policy',
    '',
    '- 허용: operator-provided official PNG coordinates only',
    '- 좌표계: official PNG 2200x1159',
    '- 금지: browser CSS pixels, resized screenshots, external crawling, web-search-based baseball data, third-party copied seatmap images',
    '- 누락 야구 운영 데이터: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '',
    '## Derived Ranges',
    '',
    'K7석/원정응원석/홈 응원석은 운영자 polygon 승격 전까지 active block 111개를 유지하고 기존 번호 블럭 hit-area만 재사용합니다.',
    '서로 겹치는 derived range는 필터/배지 모델에서만 허용되며, 같은 official block을 공유하는 독립 polygon 승격 입력은 validation에서 차단합니다.',
    '',
    markdownTable(
      ['range', 'display blocks', 'filter', 'active hit-area', 'polygon status', 'source requirements'],
      derivedRangeRows.map((range) => [
        `\`${range.label}\``,
        range.displayBlocks,
        `\`${range.filterGroupId}\``,
        `\`${range.aggregateHitArea}\``,
        `\`${range.operatorPolygonStatus}\``,
        range.sourceRequirementIds.map((id) => `\`${id}\``).join('<br>'),
      ]),
    ),
    '',
    '## Promotion Model Warnings',
    '',
    summary.promotionModelWarnings.length > 0
      ? summary.promotionModelWarnings.map((warning) => `- \`${warning}\``).join('\n')
      : 'No promotion model warnings.',
    '',
    '## Blockers',
    '',
    summary.blockers.length > 0 ? summary.blockers.map((blocker) => `- \`${blocker}\``).join('\n') : 'No blocking failures.',
    '',
    '## Pending Reasons',
    '',
    summary.pendingReasons.length > 0
      ? summary.pendingReasons.map((reason) => `- \`${reason}\``).join('\n')
      : 'No pending reasons.',
    '',
    '## Work Items',
    '',
    markdownTable(
      ['section', 'pending', 'valid promotion', 'valid data diff', 'reasons', 'point count', 'reviewer'],
      workItems.map((item) => [
        `\`${item.name}\``,
        `\`${item.pending}\``,
        `\`${item.validForPromotion}\``,
        `\`${item.validForDataDiff}\``,
        item.reasons.map((reason) => `\`${reason}\``).join('<br>') || '-',
        item.pointCount,
        item.reviewer || '-',
      ]),
    ),
    '',
    '## Commands',
    '',
    '- `npm run stadium:gwangju:operator-handoff`',
    '- `npm run stadium:gwangju:operator-status`',
    '- `node scripts/stadium-seatmap-ops.mjs gwangju operator-template:validate:strict`',
    '- `node scripts/stadium-seatmap-ops.mjs gwangju operator-template:apply-plan:require-ready`',
    '- `npm run test:stadium:seatmaps`',
    '- `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply`',
    '- `node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write`',
    '- `node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate`',
    '- `node scripts/stadium-seatmap-ops.mjs gwangju trace-review`',
    '- `npm run build`',
    '',
  ].join('\n'), 'utf8');
  
  console.log(`operator_status_json:${jsonPath}`);
  console.log(`operator_status_csv:${csvPath}`);
  console.log(`operator_status_markdown:${markdownPath}`);
  console.log(`status:${summary.status} pending=${summary.pendingSections} validDataDiff=${summary.validDataDiffSections} blockers=${summary.blockers.length}`);
  
  if (summary.status === 'blocked') {
    process.exitCode = 1;
  }
};

const taskRunners = {
  'operator-template': runOperatorTemplate,
  'operator-template-validate': runOperatorTemplateValidate,
  'operator-template-apply-plan': runOperatorTemplateApplyPlan,
  'operator-handoff': runOperatorHandoff,
  'operator-status': runOperatorStatus,
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

export const runGwangjuOperatorTemplateTask = async (task, args = process.argv.slice(2)) => {
  const runner = taskRunners[task];
  if (!runner) {
    throw new Error(`Unknown Gwangju operator-template task: ${task ?? '(missing)'}`);
  }

  await withTaskArgs(args, runner);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [task, ...args] = process.argv.slice(2);
  await runGwangjuOperatorTemplateTask(task, args);
}
