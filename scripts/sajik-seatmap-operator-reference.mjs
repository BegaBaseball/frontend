import path from 'node:path';
import { fileURLToPath } from 'node:url';

const runOperatorReferenceApprovedGeometryAudit = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const summaryPath = path.join(reportDir, 'operator-reference-approved-dataset-summary.json');
  const imagePath = path.join(frontendRoot, 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png');
  const outputPath = path.join(reportDir, 'operator-reference-approved-geometry-audit.json');

  const WIDTH = 1151;
  const HEIGHT = 1367;

  function pathToPoints(pathData) {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  }

  function pointInPolygon([x, y], polygon) {
    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const [xi, yi] = polygon[index];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function bounds(points) {
    return points.reduce((acc, [x, y]) => ({
      minX: Math.min(acc.minX, x),
      minY: Math.min(acc.minY, y),
      maxX: Math.max(acc.maxX, x),
      maxY: Math.max(acc.maxY, y),
    }), {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    });
  }

  function rgbStats(red, green, blue) {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = max / 255;
    return { max, min, saturation, brightness };
  }

  function isSeatColor(red, green, blue) {
    const { max, min, saturation, brightness } = rgbStats(red, green, blue);
    return saturation >= 0.13 && brightness >= 0.25 && max >= 85 && (max - min) >= 25;
  }

  function isBackgroundOrLine(red, green, blue) {
    const { saturation, brightness } = rgbStats(red, green, blue);
    return (saturation <= 0.12 && brightness >= 0.78)
      || brightness <= 0.20;
  }

  function scoreSection(section, raw, channels) {
    const polygon = pathToPoints(section.visualPath);
    const box = bounds(polygon);
    const startX = Math.max(0, Math.floor(box.minX));
    const endX = Math.min(WIDTH - 1, Math.ceil(box.maxX));
    const startY = Math.max(0, Math.floor(box.minY));
    const endY = Math.min(HEIGHT - 1, Math.ceil(box.maxY));
    let insidePixels = 0;
    let seatColorPixels = 0;
    let backgroundOrLinePixels = 0;

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        if (!pointInPolygon([x + 0.5, y + 0.5], polygon)) continue;
        insidePixels += 1;
        const index = (y * WIDTH + x) * channels;
        const red = raw[index];
        const green = raw[index + 1];
        const blue = raw[index + 2];
        if (isSeatColor(red, green, blue)) seatColorPixels += 1;
        if (isBackgroundOrLine(red, green, blue)) backgroundOrLinePixels += 1;
      }
    }

    const seatColorRatio = insidePixels > 0 ? seatColorPixels / insidePixels : 0;
    const backgroundOrLineRatio = insidePixels > 0 ? backgroundOrLinePixels / insidePixels : 1;
    const issues = [];
    if (insidePixels < 150) issues.push('POLYGON_PIXEL_AREA_TOO_SMALL');
    if (seatColorRatio < 0.58) issues.push('LOW_SEAT_COLOR_COVERAGE');
    if (backgroundOrLineRatio > 0.32) issues.push('HIGH_BACKGROUND_OR_LINE_COVERAGE');
    if (polygon.length > 8) issues.push('EXCESSIVE_VERTEX_COUNT');

    return {
      sectionId: section.sectionId,
      stageId: section.stageId,
      pointCount: polygon.length,
      insidePixels,
      seatColorPixels,
      backgroundOrLinePixels,
      seatColorRatio: Number(seatColorRatio.toFixed(4)),
      backgroundOrLineRatio: Number(backgroundOrLineRatio.toFixed(4)),
      issues,
    };
  }

  async function main() {
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    if (summary.status !== 'PASS_OPERATOR_REFERENCE_DRAFT_SUMMARY') {
      throw new Error(`Geometry audit requires passing summary, got ${summary.status}`);
    }

    const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
    if (info.width !== WIDTH || info.height !== HEIGHT) {
      throw new Error(`Unexpected image size ${info.width}x${info.height}`);
    }

    const sections = summary.sections.map((section) => scoreSection(section, data, info.channels));
    const warningSections = sections.filter((section) => section.issues.length > 0);
    const report = {
      contract: 'SAJIK_OPERATOR_REFERENCE_APPROVED_GEOMETRY_AUDIT_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: 'OPERATOR_REFERENCE_2026',
      mapVersion: summary.mapVersion,
      status: warningSections.length === 0 ? 'PASS_APPROVED_GEOMETRY_AUDIT' : 'WARN_APPROVED_GEOMETRY_AUDIT',
      thresholds: {
        minInsidePixels: 150,
        minSeatColorRatio: 0.58,
        maxBackgroundOrLineRatio: 0.32,
        maxPointCount: 8,
      },
      sectionCount: sections.length,
      warningCount: warningSections.length,
      warningSections,
      sections,
    };

    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`status:${report.status}`);
    console.log(`sections:${report.sectionCount} warnings:${report.warningCount}`);
    console.log(`report:${outputPath}`);
    warningSections.slice(0, 12).forEach((section) => {
      console.log(`warning:${section.stageId}:${section.sectionId}:seat=${section.seatColorRatio}:bg=${section.backgroundOrLineRatio}:${section.issues.join(',')}`);
    });
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceApprovedOverlay = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const summaryPath = path.join(reportDir, 'operator-reference-approved-dataset-summary.json');
  const imagePath = path.join(frontendRoot, 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png');
  const outputSvgPath = path.join(reportDir, 'operator-reference-approved-overlay.svg');
  const outputPngPath = path.join(reportDir, 'operator-reference-approved-overlay.png');

  const WIDTH = 1151;
  const HEIGHT = 1367;

  const CROPS = [
    { id: 'stage01-lower-central-approved', left: 190, top: 1010, width: 780, height: 350 },
    { id: 'stage02-first-base-approved', left: 700, top: 400, width: 440, height: 850 },
    { id: 'stage03-third-base-approved', left: 0, top: 0, width: 500, height: 1280 },
    { id: 'stage04-right-outfield-approved', left: 650, top: 0, width: 501, height: 570 },
  ];

  const STAGE_COLORS = {
    stage01: '#ec4899',
    stage02: '#06b6d4',
    stage03: '#a855f7',
    stage04: '#84cc16',
  };

  function escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function buildSvg(summary, imageDataUrl) {
    const sections = summary.sections.map((section) => {
      const color = STAGE_COLORS[section.stageId] ?? '#38bdf8';
      const [labelX, labelY] = section.labelPoint;
      return [
        `<path d="${escapeXml(section.visualPath)}" fill="${color}" fill-opacity="0.22" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke" />`,
        `<circle cx="${labelX}" cy="${labelY}" r="13" fill="none" stroke="${color}" stroke-width="4" vector-effect="non-scaling-stroke" />`,
        `<text x="${labelX}" y="${labelY + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="700" fill="#111827" stroke="#ffffff" stroke-width="3" paint-order="stroke">${escapeXml(section.sectionId)}</text>`,
      ].join('\n');
    });

    const markers = summary.markerCandidates.map((marker) => {
      const [x, y] = marker.position;
      return [
        `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="#facc15" stroke-width="5" vector-effect="non-scaling-stroke" />`,
        `<circle cx="${x}" cy="${y}" r="5" fill="#facc15" />`,
      ].join('\n');
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <image href="${imageDataUrl}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" />
    <g id="approved-seat-polygons">
  ${sections.join('\n')}
    </g>
    <g id="approved-accessibility-markers">
  ${markers.join('\n')}
    </g>
  </svg>
  `;
  }

  async function main() {
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    if (summary.status !== 'PASS_OPERATOR_REFERENCE_DRAFT_SUMMARY') {
      throw new Error(`Approved overlay requires passing summary, got ${summary.status}`);
    }

    const imageBuffer = await fs.readFile(imagePath);
    const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    const svg = buildSvg(summary, imageDataUrl);

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(outputSvgPath, svg, 'utf8');
    await sharp(Buffer.from(svg)).png().toFile(outputPngPath);

    for (const crop of CROPS) {
      const cropPath = path.join(reportDir, `${crop.id}.png`);
      await sharp(outputPngPath)
        .extract({ left: crop.left, top: crop.top, width: crop.width, height: crop.height })
        .resize({ width: crop.width * 2 })
        .png()
        .toFile(cropPath);
    }

    console.log(`approved-overlay:${path.relative(frontendRoot, outputPngPath)}`);
    console.log(`sections:${summary.sectionCount} markers:${summary.markerCandidateCount}`);
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceApprovedTopologyAudit = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const summaryPath = path.join(reportDir, 'operator-reference-approved-dataset-summary.json');
  const outputPath = path.join(reportDir, 'operator-reference-approved-topology-audit.json');

  const WIDTH = 1151;
  const HEIGHT = 1367;
  const MIN_AREA_PX = 150;
  const MAX_POINT_COUNT = 8;
  const LABEL_TOLERANCE_PX = 1.5;
  const MARKER_TOLERANCE_PX = 2;
  const OVERLAP_SAMPLE_STEP_PX = 2;
  const MAX_BLOCKING_OVERLAP_AREA_PX = 32;
  const MAX_BLOCKING_OVERLAP_RATIO = 0.006;
  const MAX_BLOCKING_HIT_OVERLAP_AREA_PX = 96;
  const MAX_BLOCKING_HIT_OVERLAP_RATIO = 0.018;

  function pathToPoints(pathData) {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  }

  function bounds(points) {
    return points.reduce((acc, [x, y]) => ({
      minX: Math.min(acc.minX, x),
      minY: Math.min(acc.minY, y),
      maxX: Math.max(acc.maxX, x),
      maxY: Math.max(acc.maxY, y),
    }), {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    });
  }

  function boxesOverlap(first, second) {
    return first.minX <= second.maxX
      && first.maxX >= second.minX
      && first.minY <= second.maxY
      && first.maxY >= second.minY;
  }

  function polygonArea(points) {
    const signedArea = points.reduce((area, point, index) => {
      const next = points[(index + 1) % points.length];
      return area + ((point[0] * next[1]) - (next[0] * point[1]));
    }, 0);
    return Math.abs(signedArea / 2);
  }

  function pointInPolygon([x, y], polygon) {
    if (polygon.length < 3) return false;

    let inside = false;
    for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
      const [xi, yi] = polygon[index];
      const [xj, yj] = polygon[previous];
      const intersects = ((yi > y) !== (yj > y))
        && x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi;
      if (intersects) inside = !inside;
    }
    return inside;
  }

  function distanceToSegment(point, start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const segmentLengthSquared = (dx * dx) + (dy * dy);

    if (segmentLengthSquared === 0) {
      return Math.hypot(point[0] - start[0], point[1] - start[1]);
    }

    const t = Math.max(0, Math.min(1, (
      ((point[0] - start[0]) * dx) + ((point[1] - start[1]) * dy)
    ) / segmentLengthSquared));

    return Math.hypot(point[0] - (start[0] + (t * dx)), point[1] - (start[1] + (t * dy)));
  }

  function distanceToPolygon(point, polygon) {
    return polygon.reduce((minimum, polygonPoint, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return Math.min(minimum, distanceToSegment(point, polygonPoint, next));
    }, Number.POSITIVE_INFINITY);
  }

  function pointInsideOrNearPolygon(point, polygon, tolerancePx) {
    return pointInPolygon(point, polygon) || distanceToPolygon(point, polygon) <= tolerancePx;
  }

  function orientation(a, b, c) {
    return ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
  }

  function isPointOnSegment(point, start, end) {
    const epsilon = 0.0001;
    if (Math.abs(orientation(start, end, point)) > epsilon) return false;

    return point[0] >= Math.min(start[0], end[0]) - epsilon
      && point[0] <= Math.max(start[0], end[0]) + epsilon
      && point[1] >= Math.min(start[1], end[1]) - epsilon
      && point[1] <= Math.max(start[1], end[1]) + epsilon;
  }

  function segmentsIntersect(firstStart, firstEnd, secondStart, secondEnd) {
    const firstOrientation = orientation(firstStart, firstEnd, secondStart);
    const secondOrientation = orientation(firstStart, firstEnd, secondEnd);
    const thirdOrientation = orientation(secondStart, secondEnd, firstStart);
    const fourthOrientation = orientation(secondStart, secondEnd, firstEnd);

    if (
      ((firstOrientation > 0 && secondOrientation < 0) || (firstOrientation < 0 && secondOrientation > 0))
      && ((thirdOrientation > 0 && fourthOrientation < 0) || (thirdOrientation < 0 && fourthOrientation > 0))
    ) {
      return true;
    }

    return isPointOnSegment(secondStart, firstStart, firstEnd)
      || isPointOnSegment(secondEnd, firstStart, firstEnd)
      || isPointOnSegment(firstStart, secondStart, secondEnd)
      || isPointOnSegment(firstEnd, secondStart, secondEnd);
  }

  function selfIntersections(points) {
    const intersections = [];
    for (let edgeIndex = 0; edgeIndex < points.length; edgeIndex += 1) {
      const nextPoint = points[(edgeIndex + 1) % points.length];

      for (let compareIndex = edgeIndex + 1; compareIndex < points.length; compareIndex += 1) {
        const isAdjacent = Math.abs(edgeIndex - compareIndex) <= 1
          || (edgeIndex === 0 && compareIndex === points.length - 1);
        if (isAdjacent) continue;

        const compareNextPoint = points[(compareIndex + 1) % points.length];
        if (segmentsIntersect(points[edgeIndex], nextPoint, points[compareIndex], compareNextPoint)) {
          intersections.push([edgeIndex, compareIndex]);
        }
      }
    }
    return intersections;
  }

  function round(value, digits = 4) {
    return Number(value.toFixed(digits));
  }

  function normalizeSection(section) {
    const visualPoints = pathToPoints(section.visualPath);
    const hitPoints = pathToPoints(section.hitPath);
    return {
      ...section,
      points: visualPoints,
      bounds: bounds(visualPoints),
      area: polygonArea(visualPoints),
      visualPoints,
      visualBounds: bounds(visualPoints),
      visualArea: polygonArea(visualPoints),
      hitPoints,
      hitBounds: bounds(hitPoints),
      hitArea: polygonArea(hitPoints),
    };
  }

  function validateSection(section) {
    const issues = [];

    if (section.visualPoints.length < 3) issues.push('MIN_POINT_COUNT_REQUIRED');
    if (section.visualPoints.length > MAX_POINT_COUNT) issues.push('EXCESSIVE_VERTEX_COUNT');
    if (section.visualArea < MIN_AREA_PX) issues.push('NON_ZERO_AREA_REQUIRED');
    if (section.visualPoints.some(([x, y]) => x < 0 || y < 0 || x > WIDTH || y > HEIGHT)) {
      issues.push('POINT_OUT_OF_BOUNDS');
    }
    if (section.hitPoints.length < 3) issues.push('HIT_MIN_POINT_COUNT_REQUIRED');
    if (section.hitPoints.length > MAX_POINT_COUNT) issues.push('HIT_EXCESSIVE_VERTEX_COUNT');
    if (section.hitArea < section.visualArea) issues.push('HIT_AREA_SMALLER_THAN_VISUAL');
    if (section.hitPoints.some(([x, y]) => x < 0 || y < 0 || x > WIDTH || y > HEIGHT)) {
      issues.push('HIT_POINT_OUT_OF_BOUNDS');
    }
    if (section.visualPath !== section.hitPath) {
      const isKnownHitPathExpansionSource = section.hitPathExpansionSource === 'CENTROID_RADIAL_BUFFER_V1'
        || section.hitPathExpansionSource === 'MANUAL_TOUCH_POLYGON_V1';
      if (section.hitPathExpansionPx !== 3 || !isKnownHitPathExpansionSource) {
        issues.push('HITPATH_EXPANSION_METADATA_REQUIRED');
      }
    } else if (section.hitPathExpansionPx !== undefined || section.hitPathExpansionSource !== undefined) {
      issues.push('UNUSED_HITPATH_EXPANSION_METADATA');
    }
    if (!Array.isArray(section.labelPoint) || section.labelPoint.length !== 2) {
      issues.push('MISSING_LABEL_POINT');
    } else if (
      section.labelPoint[0] < 0
      || section.labelPoint[1] < 0
      || section.labelPoint[0] > WIDTH
      || section.labelPoint[1] > HEIGHT
    ) {
      issues.push('LABEL_OUT_OF_BOUNDS');
    } else if (!pointInsideOrNearPolygon(section.labelPoint, section.visualPoints, LABEL_TOLERANCE_PX)) {
      issues.push('LABEL_OUTSIDE_POLYGON');
    }

    if (selfIntersections(section.visualPoints).length > 0) {
      issues.push('SELF_INTERSECTION');
    }
    if (selfIntersections(section.hitPoints).length > 0) {
      issues.push('HIT_SELF_INTERSECTION');
    }

    return issues;
  }

  function markerCoverage(marker, sections) {
    const point = marker.position;
    const owners = sections
      .filter((section) => pointInsideOrNearPolygon(point, section.visualPoints, MARKER_TOLERANCE_PX))
      .map((section) => section.sectionId);

    return {
      markerId: marker.markerId,
      stageId: marker.stageId,
      position: marker.position,
      ownerSectionIds: owners,
      status: owners.length === 1 ? 'PASS' : 'FAIL',
    };
  }

  function labelOwnership(section, sections) {
    const owners = sections
      .filter((candidate) => pointInPolygon(section.labelPoint, candidate.visualPoints))
      .map((candidate) => candidate.sectionId);

    return {
      sectionId: section.sectionId,
      stageId: section.stageId,
      labelPoint: section.labelPoint,
      ownerSectionIds: owners,
      status: owners.length === 1 && owners[0] === section.sectionId ? 'PASS' : 'FAIL',
    };
  }

  function hitLabelOwnership(section, sections) {
    const owners = sections
      .filter((candidate) => pointInPolygon(section.labelPoint, candidate.hitPoints))
      .map((candidate) => candidate.sectionId);

    return {
      sectionId: section.sectionId,
      stageId: section.stageId,
      labelPoint: section.labelPoint,
      ownerSectionIds: owners,
      status: owners.at(-1) === section.sectionId ? 'PASS' : 'FAIL',
    };
  }

  function sampledOverlap(first, second, pathKind = 'visual') {
    const firstBounds = pathKind === 'hit' ? first.hitBounds : first.visualBounds;
    const secondBounds = pathKind === 'hit' ? second.hitBounds : second.visualBounds;
    const firstPoints = pathKind === 'hit' ? first.hitPoints : first.visualPoints;
    const secondPoints = pathKind === 'hit' ? second.hitPoints : second.visualPoints;
    const firstArea = pathKind === 'hit' ? first.hitArea : first.visualArea;
    const secondArea = pathKind === 'hit' ? second.hitArea : second.visualArea;

    if (!boxesOverlap(firstBounds, secondBounds)) {
      return null;
    }

    const minX = Math.max(0, Math.floor(Math.max(firstBounds.minX, secondBounds.minX)));
    const maxX = Math.min(WIDTH - 1, Math.ceil(Math.min(firstBounds.maxX, secondBounds.maxX)));
    const minY = Math.max(0, Math.floor(Math.max(firstBounds.minY, secondBounds.minY)));
    const maxY = Math.min(HEIGHT - 1, Math.ceil(Math.min(firstBounds.maxY, secondBounds.maxY)));

    let overlapSamples = 0;
    for (let y = minY; y <= maxY; y += OVERLAP_SAMPLE_STEP_PX) {
      for (let x = minX; x <= maxX; x += OVERLAP_SAMPLE_STEP_PX) {
        const point = [x + 0.5, y + 0.5];
        if (pointInPolygon(point, firstPoints) && pointInPolygon(point, secondPoints)) {
          overlapSamples += 1;
        }
      }
    }

    if (overlapSamples === 0) {
      return null;
    }

    const overlapAreaPx = overlapSamples * OVERLAP_SAMPLE_STEP_PX * OVERLAP_SAMPLE_STEP_PX;
    const overlapRatio = overlapAreaPx / Math.min(firstArea, secondArea);
    const maxArea = pathKind === 'hit' ? MAX_BLOCKING_HIT_OVERLAP_AREA_PX : MAX_BLOCKING_OVERLAP_AREA_PX;
    const maxRatio = pathKind === 'hit' ? MAX_BLOCKING_HIT_OVERLAP_RATIO : MAX_BLOCKING_OVERLAP_RATIO;
    return {
      firstSectionId: first.sectionId,
      secondSectionId: second.sectionId,
      firstStageId: first.stageId,
      secondStageId: second.stageId,
      pathKind,
      overlapSamples,
      overlapAreaPx: round(overlapAreaPx, 2),
      overlapRatio: round(overlapRatio),
      status: overlapAreaPx <= maxArea || overlapRatio <= maxRatio
        ? 'WARN_SMALL_OVERLAP'
        : 'FAIL_MEANINGFUL_OVERLAP',
    };
  }

  async function main() {
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    if (summary.status !== 'PASS_OPERATOR_REFERENCE_DRAFT_SUMMARY') {
      throw new Error(`Topology audit requires passing summary, got ${summary.status}`);
    }

    const sections = summary.sections.map(normalizeSection);
    const sectionIssues = sections.flatMap((section) => (
      validateSection(section).map((issue) => ({
        sectionId: section.sectionId,
        stageId: section.stageId,
        issue,
      }))
    ));
    const labelOwnershipResults = sections.map((section) => labelOwnership(section, sections));
    const failedLabelOwnership = labelOwnershipResults.filter((result) => result.status !== 'PASS');
    const hitLabelOwnershipResults = sections.map((section) => hitLabelOwnership(section, sections));
    const failedHitLabelOwnership = hitLabelOwnershipResults.filter((result) => result.status !== 'PASS');
    const markerCoverageResults = summary.markerCandidates.map((marker) => markerCoverage(marker, sections));
    const failedMarkerCoverage = markerCoverageResults.filter((result) => result.status !== 'PASS');

    const overlaps = [];
    for (let firstIndex = 0; firstIndex < sections.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < sections.length; secondIndex += 1) {
        const overlap = sampledOverlap(sections[firstIndex], sections[secondIndex]);
        if (overlap) overlaps.push(overlap);
      }
    }
    overlaps.sort((first, second) => second.overlapAreaPx - first.overlapAreaPx);
    const blockingOverlaps = overlaps.filter((overlap) => overlap.status === 'FAIL_MEANINGFUL_OVERLAP');
    const hitOverlaps = [];
    for (let firstIndex = 0; firstIndex < sections.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < sections.length; secondIndex += 1) {
        const overlap = sampledOverlap(sections[firstIndex], sections[secondIndex], 'hit');
        if (overlap) hitOverlaps.push(overlap);
      }
    }
    hitOverlaps.sort((first, second) => second.overlapAreaPx - first.overlapAreaPx);
    const blockingHitOverlaps = hitOverlaps.filter((overlap) => overlap.status === 'FAIL_MEANINGFUL_OVERLAP');
    const hitExpandedSections = sections.filter((section) => section.visualPath !== section.hitPath);

    const blockers = [
      ...sectionIssues.map((issue) => `SECTION_${issue.issue}:${issue.sectionId}`),
      ...failedLabelOwnership.map((result) => `LABEL_OWNERSHIP:${result.sectionId}:${result.ownerSectionIds.join(',') || 'NONE'}`),
      ...failedHitLabelOwnership.map((result) => `HIT_LABEL_OWNERSHIP:${result.sectionId}:${result.ownerSectionIds.join(',') || 'NONE'}`),
      ...failedMarkerCoverage.map((result) => `MARKER_COVERAGE:${result.markerId}:${result.ownerSectionIds.join(',') || 'NONE'}`),
      ...blockingOverlaps.map((overlap) => `OVERLAP:${overlap.firstSectionId}:${overlap.secondSectionId}:${overlap.overlapAreaPx}px`),
      ...blockingHitOverlaps.map((overlap) => `HIT_OVERLAP:${overlap.firstSectionId}:${overlap.secondSectionId}:${overlap.overlapAreaPx}px`),
    ];

    const report = {
      contract: 'SAJIK_OPERATOR_REFERENCE_APPROVED_TOPOLOGY_AUDIT_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: 'OPERATOR_REFERENCE_2026',
      mapVersion: summary.mapVersion,
      status: blockers.length === 0 ? 'PASS_APPROVED_TOPOLOGY_AUDIT' : 'FAIL_APPROVED_TOPOLOGY_AUDIT',
      thresholds: {
        width: WIDTH,
        height: HEIGHT,
        minAreaPx: MIN_AREA_PX,
        maxPointCount: MAX_POINT_COUNT,
        labelTolerancePx: LABEL_TOLERANCE_PX,
        markerTolerancePx: MARKER_TOLERANCE_PX,
        overlapSampleStepPx: OVERLAP_SAMPLE_STEP_PX,
        maxBlockingOverlapAreaPx: MAX_BLOCKING_OVERLAP_AREA_PX,
        maxBlockingOverlapRatio: MAX_BLOCKING_OVERLAP_RATIO,
        maxBlockingHitOverlapAreaPx: MAX_BLOCKING_HIT_OVERLAP_AREA_PX,
        maxBlockingHitOverlapRatio: MAX_BLOCKING_HIT_OVERLAP_RATIO,
      },
      sectionCount: sections.length,
      markerCount: summary.markerCandidates.length,
      hitPathExpansion: summary.hitPathExpansion ?? null,
      hitExpandedSectionCount: hitExpandedSections.length,
      hitExpandedSectionIds: hitExpandedSections.map((section) => section.sectionId),
      sectionIssueCount: sectionIssues.length,
      failedLabelOwnershipCount: failedLabelOwnership.length,
      failedHitLabelOwnershipCount: failedHitLabelOwnership.length,
      failedMarkerCoverageCount: failedMarkerCoverage.length,
      overlapPairCount: overlaps.length,
      blockingOverlapCount: blockingOverlaps.length,
      hitOverlapPairCount: hitOverlaps.length,
      blockingHitOverlapCount: blockingHitOverlaps.length,
      blockers,
      sectionIssues,
      failedLabelOwnership,
      failedHitLabelOwnership,
      failedMarkerCoverage,
      overlapPairs: overlaps,
      hitOverlapPairs: hitOverlaps,
      sections: sections.map((section) => ({
        sectionId: section.sectionId,
        stageId: section.stageId,
        pointCount: section.visualPoints.length,
        hitPointCount: section.hitPoints.length,
        areaPx: round(section.visualArea, 2),
        hitAreaPx: round(section.hitArea, 2),
        hitAreaRatio: round(section.hitArea / section.visualArea, 4),
        hitPathExpanded: section.visualPath !== section.hitPath,
        hitPathExpansionPx: section.hitPathExpansionPx ?? null,
        bounds: {
          minX: round(section.visualBounds.minX, 2),
          minY: round(section.visualBounds.minY, 2),
          maxX: round(section.visualBounds.maxX, 2),
          maxY: round(section.visualBounds.maxY, 2),
        },
        hitBounds: {
          minX: round(section.hitBounds.minX, 2),
          minY: round(section.hitBounds.minY, 2),
          maxX: round(section.hitBounds.maxX, 2),
          maxY: round(section.hitBounds.maxY, 2),
        },
      })),
    };

    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`status:${report.status}`);
    console.log(`sections:${report.sectionCount} markers:${report.markerCount}`);
    console.log(`sectionIssues:${report.sectionIssueCount} labelFailures:${report.failedLabelOwnershipCount} hitLabelFailures:${report.failedHitLabelOwnershipCount} markerFailures:${report.failedMarkerCoverageCount}`);
    console.log(`hitExpanded:${report.hitExpandedSectionCount} overlapPairs:${report.overlapPairCount} blockingOverlaps:${report.blockingOverlapCount} hitOverlapPairs:${report.hitOverlapPairCount} blockingHitOverlaps:${report.blockingHitOverlapCount}`);
    console.log(`report:${outputPath}`);

    report.blockers.slice(0, 12).forEach((blocker) => console.error(`blocker:${blocker}`));
    if (report.status !== 'PASS_APPROVED_TOPOLOGY_AUDIT') {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceDatasetExport = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const defaultSummaryPath = path.join(
    frontendRoot,
    'reports/stadium/sajik-operator-reference-trace/operator-reference-approved-dataset-summary.json',
  );
  const defaultOutputPath = path.join(frontendRoot, 'src/data/sajikOperatorReferenceSeatMapDataset.ts');

  const shouldCheckOnly = process.argv.includes('--check');

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return path.resolve(frontendRoot, process.argv[index + 1]);
  };

  const summaryPath = argValue('--summary', defaultSummaryPath);
  const outputPath = argValue('--out', defaultOutputPath);

  function tsJson(value) {
    return JSON.stringify(value, null, 2);
  }

  const RELATED_SECTION_ID_BY_MARKER_ID = {
    'stage02-wheelchair-01': '137',
    'stage02-wheelchair-02': '127',
    'stage02-wheelchair-03': '125',
    'stage02-wheelchair-04': '135',
    'stage02-wheelchair-05': '124',
    'stage02-wheelchair-06': '133',
    'stage02-wheelchair-07': '123',
    'stage02-wheelchair-08': '122',
    'stage02-wheelchair-09': '132',
    'stage03-wheelchair-01': '325',
    'stage03-wheelchair-02': '335',
    'stage03-wheelchair-03': '324',
    'stage03-wheelchair-04': '333',
    'stage03-wheelchair-05': '323',
  };
  const LINKED_SELECTABLE_MARKER_IDS = new Set([
    'stage02-wheelchair-01',
    'stage02-wheelchair-03',
    'stage02-wheelchair-04',
    'stage02-wheelchair-09',
    'stage03-wheelchair-01',
    'stage03-wheelchair-02',
    'stage03-wheelchair-04',
    'stage03-wheelchair-05',
  ]);

  function buildDatasetFile(summary) {
    const sections = summary.sections.map((section) => ({
      sectionId: section.sectionId,
      visualPath: section.visualPath,
      hitPath: section.hitPath,
      hitPathExpansionPx: section.hitPathExpansionPx,
      hitPathExpansionSource: section.hitPathExpansionSource,
      labelPoint: section.labelPoint,
      geometryVersion: section.geometryVersion,
      traceStatus: section.traceStatus,
      stageId: section.stageId,
      operatorReview: section.operatorReview,
    }));

    const markers = summary.markerCandidates.map((marker) => ({
      markerId: marker.markerId,
      markerType: marker.markerType,
      position: marker.position,
      relatedSectionId: RELATED_SECTION_ID_BY_MARKER_ID[marker.markerId],
      bounds: marker.bounds,
      stageId: marker.stageId,
      source: marker.source,
      componentAreaPx: marker.componentAreaPx,
      markerInteractionStatus: LINKED_SELECTABLE_MARKER_IDS.has(marker.markerId)
        ? 'LINKED_SECTION_SELECTABLE'
        : 'DISPLAY_ONLY',
    }));

    return `import {
    pathToPoints,
    pointInPolygon,
    validateSeatMapPolygonPathIssues,
    type SeatMapPoint,
  } from '../utils/seatMapPolygonValidator';
  import type { SajikFanRole, SajikLevel, SajikSide } from './sajikSeatData';

  export type SajikOperatorReferenceSourceId = 'OPERATOR_REFERENCE_2026';
  export type SajikOperatorReferenceMapVersion = 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';
  export type SajikOperatorReferenceGeometryVersion = 'operator-reference-polygon-v1';
  export type SajikOperatorReferenceTraceStatus = 'OPERATOR_APPROVED';
  export type SajikOperatorReferenceMarkerType = 'WHEELCHAIR';
  export type SajikOperatorReferenceMarkerInteractionStatus = 'DISPLAY_ONLY' | 'LINKED_SECTION_SELECTABLE';
  export type SajikOperatorReferenceStageId = 'stage01' | 'stage02' | 'stage03' | 'stage04';
  export type SajikOperatorReferencePoint = readonly [number, number];

  export interface SajikOperatorReferenceImage {
    path: string;
    width: 1151;
    height: 1367;
    viewBox: '0 0 1151 1367';
    sha256: string;
    sourceStatus: 'OPERATOR_REFERENCE';
  }

  export interface SajikOperatorReferenceOperatorReview {
    reviewer: string;
    reviewedAt: string;
    notes: string;
  }

  interface SajikOperatorReferenceRawSection {
    sectionId: string;
    visualPath: string;
    hitPath: string;
    hitPathExpansionPx?: number;
    hitPathExpansionSource?: 'CENTROID_RADIAL_BUFFER_V1' | 'MANUAL_TOUCH_POLYGON_V1';
    labelPoint: SajikOperatorReferencePoint;
    geometryVersion: SajikOperatorReferenceGeometryVersion;
    traceStatus: SajikOperatorReferenceTraceStatus;
    stageId: SajikOperatorReferenceStageId;
    operatorReview: SajikOperatorReferenceOperatorReview;
  }

  export interface SajikOperatorReferenceDatasetSection extends SajikOperatorReferenceRawSection {
    visualPolygon: SeatMapPoint[];
    hitPolygon: SeatMapPoint[];
  }

  interface SajikOperatorReferenceRawMarker {
    markerId: string;
    markerType: SajikOperatorReferenceMarkerType;
    position: SajikOperatorReferencePoint;
    relatedSectionId: string;
    bounds: {
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    stageId: SajikOperatorReferenceStageId;
    source: 'IMAGE_ANALYSIS_COMPONENT';
    componentAreaPx: number;
    markerInteractionStatus: SajikOperatorReferenceMarkerInteractionStatus;
  }

  export interface SajikOperatorReferenceDatasetMarker extends SajikOperatorReferenceRawMarker {
    enabled: boolean;
  }

  export interface SajikOperatorReferenceSeatMapDataset {
    stadiumId: 'BUSAN_SAJIK';
    sourceId: SajikOperatorReferenceSourceId;
    mapVersion: SajikOperatorReferenceMapVersion;
    coordinateSystem: 'SVG_VIEW_BOX';
    runtimeSelectionEnabled: boolean;
    image: SajikOperatorReferenceImage;
    summary: {
      sections: number;
      markers: number;
      stageCount: number;
    };
    sections: SajikOperatorReferenceDatasetSection[];
    markers: SajikOperatorReferenceDatasetMarker[];
  }

  export interface SajikOperatorReferenceSectionMetadataOverride {
    sectionId: string;
    level: SajikLevel;
    category: string;
    name: string;
    side: SajikSide;
    fanRole: SajikFanRole;
    sourceNote: string;
  }

  export const SAJIK_OPERATOR_REFERENCE_RUNTIME_SELECTION_ENABLED = true;

  export const SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES = ${tsJson([
      {
        sectionId: '323',
        level: '3F',
        category: 'INFIELD_UPPER_3A',
        name: '3루 내야상단석A 323블록',
        side: 'THIRD_BASE',
        fanRole: 'HOME',
        sourceNote: 'Operator reference image에서만 확인되는 323블록입니다. 기존 롯데 공식 960x640 production 좌석도에는 독립 블록으로 렌더링하지 않습니다.',
      },
      {
        sectionId: '322',
        level: '3F',
        category: 'INFIELD_UPPER_3A',
        name: '3루 내야상단석A 322블록',
        side: 'THIRD_BASE',
        fanRole: 'HOME',
        sourceNote: 'Operator reference image에서만 확인되는 322블록입니다. 기존 롯데 공식 960x640 production 좌석도에는 독립 블록으로 렌더링하지 않습니다.',
      },
      {
        sectionId: '921',
        level: 'OUTFIELD',
        category: 'OUTFIELD_1B',
        name: '1루 외야석 921블록',
        side: 'FIRST_BASE',
        fanRole: 'NEUTRAL',
        sourceNote: 'Operator reference image에서만 확인되는 921블록입니다. 기존 롯데 공식 960x640 production 좌석도에는 독립 블록으로 렌더링하지 않습니다.',
      },
    ])} as const satisfies readonly SajikOperatorReferenceSectionMetadataOverride[];

  export const SAJIK_OPERATOR_REFERENCE_IMAGE = ${tsJson({
      path: 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png',
      width: 1151,
      height: 1367,
      viewBox: '0 0 1151 1367',
      sha256: '794d957510240c786f4fce821814afbf01cc1f93fe7ec3ecca23846a8d753f6f',
      sourceStatus: 'OPERATOR_REFERENCE',
    })} as const satisfies SajikOperatorReferenceImage;

  const RAW_SECTIONS = ${tsJson(sections)} as const satisfies readonly SajikOperatorReferenceRawSection[];

  const RAW_MARKERS = ${tsJson(markers)} as const satisfies readonly SajikOperatorReferenceRawMarker[];

  function toSeatMapPoint(point: SajikOperatorReferencePoint): SeatMapPoint {
    return [point[0], point[1]];
  }

  export const SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET: SajikOperatorReferenceSeatMapDataset = {
    stadiumId: 'BUSAN_SAJIK',
    sourceId: 'OPERATOR_REFERENCE_2026',
    mapVersion: 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1',
    coordinateSystem: 'SVG_VIEW_BOX',
    runtimeSelectionEnabled: SAJIK_OPERATOR_REFERENCE_RUNTIME_SELECTION_ENABLED,
    image: SAJIK_OPERATOR_REFERENCE_IMAGE,
    summary: {
      sections: RAW_SECTIONS.length,
      markers: RAW_MARKERS.length,
      stageCount: 4,
    },
    sections: RAW_SECTIONS.map((section) => ({
      ...section,
      visualPolygon: pathToPoints(section.visualPath),
      hitPolygon: pathToPoints(section.hitPath),
    })),
    markers: RAW_MARKERS.map((marker) => ({
      ...marker,
      enabled: marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE',
    })),
  };

  export function validateSajikOperatorReferenceSeatMapDataset(
    dataset: SajikOperatorReferenceSeatMapDataset = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET,
  ): string[] {
    const issues: string[] = [];
    const sectionIds = new Set<string>();

    dataset.sections.forEach((section) => {
      if (sectionIds.has(section.sectionId)) {
        issues.push(\`\${section.sectionId}:DUPLICATE_SECTION_ID\`);
      }
      sectionIds.add(section.sectionId);

      const labelPoint = toSeatMapPoint(section.labelPoint);
      validateSeatMapPolygonPathIssues({
        pathData: section.visualPath,
        width: dataset.image.width,
        height: dataset.image.height,
        labelPoint,
        sectionId: section.sectionId,
        pathKind: 'visualPath',
      }).forEach((issue) => issues.push(\`\${section.sectionId}:visualPath:\${issue.code}\`));
      validateSeatMapPolygonPathIssues({
        pathData: section.hitPath,
        width: dataset.image.width,
        height: dataset.image.height,
        labelPoint,
        sectionId: section.sectionId,
        pathKind: 'hitPath',
      }).forEach((issue) => issues.push(\`\${section.sectionId}:hitPath:\${issue.code}\`));
      if (section.visualPath !== section.hitPath) {
        const isKnownHitPathExpansionSource = section.hitPathExpansionSource === 'CENTROID_RADIAL_BUFFER_V1'
          || section.hitPathExpansionSource === 'MANUAL_TOUCH_POLYGON_V1';
        if (section.hitPathExpansionPx !== 3 || !isKnownHitPathExpansionSource) {
          issues.push(\`\${section.sectionId}:HITPATH_EXPANSION_METADATA_REQUIRED\`);
        }
      } else if (section.hitPathExpansionPx !== undefined || section.hitPathExpansionSource !== undefined) {
        issues.push(\`\${section.sectionId}:UNUSED_HITPATH_EXPANSION_METADATA\`);
      }
    });

    dataset.markers.forEach((marker) => {
      const [x, y] = marker.position;
      if (x < 0 || x > dataset.image.width || y < 0 || y > dataset.image.height) {
        issues.push(\`\${marker.markerId}:MARKER_OUT_OF_BOUNDS\`);
      }
      if (!sectionIds.has(marker.relatedSectionId)) {
        issues.push(\`\${marker.markerId}:RELATED_SECTION_NOT_FOUND\`);
      }
      const containingSections = dataset.sections.filter((section) => pointInPolygon([x, y], section.visualPolygon));
      if (containingSections.length !== 1) {
        issues.push(\`\${marker.markerId}:MARKER_OWNER_COUNT_\${containingSections.length}\`);
      } else if (containingSections[0].sectionId !== marker.relatedSectionId) {
        issues.push(\`\${marker.markerId}:RELATED_SECTION_MISMATCH:\${containingSections[0].sectionId}\`);
      }
      if (marker.markerInteractionStatus === 'DISPLAY_ONLY' && marker.enabled !== false) {
        issues.push(\`\${marker.markerId}:DISPLAY_ONLY_MARKER_MUST_NOT_BE_RUNTIME_ENABLED\`);
      }
      if (marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE' && marker.enabled !== true) {
        issues.push(\`\${marker.markerId}:LINKED_MARKER_MUST_BE_RUNTIME_ENABLED\`);
      }
    });

    if (dataset.runtimeSelectionEnabled !== true) {
      issues.push('dataset:RUNTIME_SELECTION_MUST_BE_ENABLED_FOR_REFERENCE_PREVIEW');
    }

    return issues;
  }
  `;
  }

  async function main() {
    const summary = JSON.parse(await fs.readFile(summaryPath, 'utf8'));
    if (summary.status !== 'PASS_OPERATOR_REFERENCE_DRAFT_SUMMARY') {
      throw new Error(`Operator reference summary must pass before export: ${summary.status}`);
    }

    const generated = buildDatasetFile(summary);
    if (shouldCheckOnly) {
      const current = await fs.readFile(outputPath, 'utf8');
      if (current !== generated) {
        console.error(`Dataset export is stale: ${path.relative(frontendRoot, outputPath)}`);
        process.exitCode = 1;
        return;
      }
      console.log([
        'Sajik operator reference dataset export is current',
        `sections=${summary.sectionCount}`,
        `markers=${summary.markerCandidateCount}`,
        `mapVersion=${summary.mapVersion}`,
      ].join(' '));
      return;
    }

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, generated, 'utf8');
    console.log([
      `Wrote ${path.relative(frontendRoot, outputPath)}`,
      `sections=${summary.sectionCount}`,
      `markers=${summary.markerCandidateCount}`,
      `mapVersion=${summary.mapVersion}`,
    ].join(' '));
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceDraftSummary = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');

  const EXPECTED_SECTION_IDS = [
    '021', '022', '023', '024',
    '031', '032', '033', '034', '041', '044',
    '051', '052', '053', '054', '055', '056', '057',
    '111', '112', '113', '114', '115', '116',
    '121', '122', '123', '124', '125', '126', '127',
    '131', '132', '133', '134', '135', '136', '137', '142', '143',
    '311', '312', '313', '314', '315', '316',
    '321', '322', '323', '324', '325', '326', '327',
    '331', '332', '333', '334', '335', '336', '337', '338', '342', '343',
    '721', '722', '723', '724', '732', '733', '734',
    '921', '922', '923', '924', '925', '931', '932', '933', '934',
  ];

  const HITPATH_EXPANSION_PX = 3;
  const HITPATH_EXPANSION_SOURCE = 'CENTROID_RADIAL_BUFFER_V1';
  const MANUAL_HITPATH_EXPANSION_SOURCE = 'MANUAL_TOUCH_POLYGON_V1';
  const HITPATH_EXPANSION_SECTION_IDS = new Set([
    '024', '023', '022', '044', '034', '033', '032', '031', '041',
    '057', '056', '055', '054', '053', '052', '051',
    '127', '137', '126', '125', '124', '123', '133', '143', '122', '132', '111', '121',
    '116', '136', '115', '135', '114', '134', '113', '112', '131', '142',
    '722', '721', '337', '327', '326', '325', '324', '323', '333', '343', '322', '311', '332', '321',
    '734', '724', '733', '723', '732', '338', '316', '336', '315', '335', '314', '334', '313', '312', '342', '331',
    '925', '924', '923', '922', '921', '934', '933', '932', '931',
  ]);
  const MANUAL_HITPATH_OVERRIDES = {
    '021': 'M 771 1034 L 789 1087 L 734 1111 L 693 1121 L 681 1066 L 736 1049 L 766 1035 L 769 1035 Z',
  };

  const STAGES = [
    {
      id: 'stage01',
      draftFile: 'stage01-approved-dataset-draft-image-reviewed.json',
      candidateFile: 'stage01-lower-central-candidates.json',
      expectedSectionCount: 17,
    },
    {
      id: 'stage02',
      draftFile: 'stage02-approved-dataset-draft-image-reviewed.json',
      candidateFile: 'stage02-first-base-candidates.json',
      expectedSectionCount: 22,
    },
    {
      id: 'stage03',
      draftFile: 'stage03-approved-dataset-draft-image-reviewed.json',
      candidateFile: 'stage03-third-base-candidates.json',
      expectedSectionCount: 30,
    },
    {
      id: 'stage04',
      draftFile: 'stage04-approved-dataset-draft-image-reviewed.json',
      candidateFile: 'stage04-right-outfield-candidates.json',
      expectedSectionCount: 9,
    },
  ];

  function findDuplicates(values) {
    const seen = new Set();
    const duplicates = new Set();
    values.forEach((value) => {
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    });
    return [...duplicates].sort();
  }

  function pathPoints(pathData) {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  }

  function formatPathCoordinate(value) {
    return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(1)));
  }

  function pointsToPath(points) {
    if (points.length === 0) return '';

    const [firstPoint, ...remainingPoints] = points;
    const move = `M ${formatPathCoordinate(firstPoint[0])} ${formatPathCoordinate(firstPoint[1])}`;
    const lines = remainingPoints.map(([x, y]) => `L ${formatPathCoordinate(x)} ${formatPathCoordinate(y)}`);
    return `${[move, ...lines].join(' ')} Z`;
  }

  function centroid(points) {
    const total = points.reduce((acc, [x, y]) => ({
      x: acc.x + x,
      y: acc.y + y,
    }), { x: 0, y: 0 });

    return [total.x / points.length, total.y / points.length];
  }

  function expandedHitPath(section) {
    const manualHitPath = MANUAL_HITPATH_OVERRIDES[section.sectionId];
    if (manualHitPath) {
      return {
        hitPath: manualHitPath,
        hitPathExpansionPx: HITPATH_EXPANSION_PX,
        hitPathExpansionSource: MANUAL_HITPATH_EXPANSION_SOURCE,
      };
    }

    if (!HITPATH_EXPANSION_SECTION_IDS.has(section.sectionId)) {
      return {
        hitPath: section.hitPath,
        hitPathExpansionPx: undefined,
        hitPathExpansionSource: undefined,
      };
    }

    const points = pathPoints(section.visualPath);
    const [centerX, centerY] = centroid(points);
    const expandedPoints = points.map(([x, y]) => {
      const deltaX = x - centerX;
      const deltaY = y - centerY;
      const distance = Math.hypot(deltaX, deltaY) || 1;
      return [
        Math.max(0, Math.min(1151, x + ((deltaX / distance) * HITPATH_EXPANSION_PX))),
        Math.max(0, Math.min(1367, y + ((deltaY / distance) * HITPATH_EXPANSION_PX))),
      ];
    });

    return {
      hitPath: pointsToPath(expandedPoints),
      hitPathExpansionPx: HITPATH_EXPANSION_PX,
      hitPathExpansionSource: HITPATH_EXPANSION_SOURCE,
    };
  }

  function validateSection(section) {
    const issues = [];
    const points = pathPoints(section.visualPath);
    const hitPoints = pathPoints(section.hitPath);

    if (!section.sectionId) issues.push('MISSING_SECTION_ID');
    if (!section.visualPath) issues.push('MISSING_VISUAL_PATH');
    if (!section.hitPath) issues.push('MISSING_HIT_PATH');
    if (!Array.isArray(section.labelPoint) || section.labelPoint.length !== 2) {
      issues.push('MISSING_LABEL_POINT');
    }
    if (points.length < 4) issues.push('POLYGON_REQUIRES_AT_LEAST_4_POINTS');
    if (points.some(([x, y]) => x < 0 || y < 0 || x > 1151 || y > 1367)) {
      issues.push('POLYGON_OUT_OF_BOUNDS');
    }
    if (hitPoints.length < points.length) issues.push('HIT_POLYGON_POINT_COUNT_REGRESSION');
    if (hitPoints.some(([x, y]) => x < 0 || y < 0 || x > 1151 || y > 1367)) {
      issues.push('HIT_POLYGON_OUT_OF_BOUNDS');
    }

    return issues;
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async function main() {
    const issues = [];
    const sections = [];
    const stageSummaries = [];
    const markerCandidates = [];

    for (const stage of STAGES) {
      const draftPath = path.join(reportDir, stage.draftFile);
      const candidatePath = path.join(reportDir, stage.candidateFile);
      const draft = await readJson(draftPath);
      const candidateReport = await readJson(candidatePath);

      if (draft.sectionCount !== stage.expectedSectionCount) {
        issues.push(`${stage.id}: expected ${stage.expectedSectionCount} sections, got ${draft.sectionCount}`);
      }
      if (draft.status !== 'DRAFT_READY_FOR_DATASET_PATCH') {
        issues.push(`${stage.id}: draft status must be DRAFT_READY_FOR_DATASET_PATCH`);
      }

      for (const section of draft.sections ?? []) {
        const hitPathExpansion = expandedHitPath(section);
        const datasetSection = {
          ...section,
          ...hitPathExpansion,
          stageId: stage.id,
        };
        if (datasetSection.hitPathExpansionPx === undefined) {
          delete datasetSection.hitPathExpansionPx;
          delete datasetSection.hitPathExpansionSource;
        }

        const sectionIssues = validateSection(datasetSection);
        sectionIssues.forEach((issue) => issues.push(`${stage.id}:${datasetSection.sectionId ?? 'UNKNOWN'}:${issue}`));
        sections.push({
          ...datasetSection,
        });
      }

      for (const marker of candidateReport.markerCandidates ?? []) {
        markerCandidates.push({
          ...marker,
          stageId: stage.id,
        });
      }

      stageSummaries.push({
        stageId: stage.id,
        sourceStageId: draft.stage?.id ?? null,
        status: draft.status,
        sectionCount: draft.sectionCount,
        expectedSectionCount: stage.expectedSectionCount,
        markerCandidateCount: candidateReport.markerCandidates?.length ?? 0,
        draftFile: stage.draftFile,
        candidateFile: stage.candidateFile,
      });
    }

    const sectionIds = sections.map((section) => section.sectionId);
    const duplicates = findDuplicates(sectionIds);
    const missing = EXPECTED_SECTION_IDS.filter((sectionId) => !sectionIds.includes(sectionId));
    const unexpected = sectionIds.filter((sectionId) => !EXPECTED_SECTION_IDS.includes(sectionId)).sort();

    if (duplicates.length > 0) issues.push(`duplicate sectionIds: ${duplicates.join(', ')}`);
    if (missing.length > 0) issues.push(`missing sectionIds: ${missing.join(', ')}`);
    if (unexpected.length > 0) issues.push(`unexpected sectionIds: ${unexpected.join(', ')}`);
    if (sections.length !== EXPECTED_SECTION_IDS.length) {
      issues.push(`expected ${EXPECTED_SECTION_IDS.length} total sections, got ${sections.length}`);
    }

    const manifest = {
      contract: 'SAJIK_OPERATOR_REFERENCE_APPROVED_DATASET_SUMMARY_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: 'OPERATOR_REFERENCE_2026',
      mapVersion: 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1',
      status: issues.length === 0 ? 'PASS_OPERATOR_REFERENCE_DRAFT_SUMMARY' : 'FAIL_OPERATOR_REFERENCE_DRAFT_SUMMARY',
      expectedSectionCount: EXPECTED_SECTION_IDS.length,
      sectionCount: sections.length,
      markerCandidateCount: markerCandidates.length,
      hitPathExpansion: {
        source: HITPATH_EXPANSION_SOURCE,
        expansionPx: HITPATH_EXPANSION_PX,
        manualSource: MANUAL_HITPATH_EXPANSION_SOURCE,
        sectionIds: [...Object.keys(MANUAL_HITPATH_OVERRIDES), ...HITPATH_EXPANSION_SECTION_IDS],
        centroidSectionIds: [...HITPATH_EXPANSION_SECTION_IDS],
        manualSectionIds: Object.keys(MANUAL_HITPATH_OVERRIDES),
      },
      stageSummaries,
      duplicateSectionIds: duplicates,
      missingSectionIds: missing,
      unexpectedSectionIds: unexpected,
      markerCandidates,
      sections,
      issues,
      note: 'This is an operator-reference dataset summary for the selectable reference preview. The official 960x640 Sajik production map remains the default source.',
    };

    const outputPath = path.join(reportDir, 'operator-reference-approved-dataset-summary.json');
    await fs.writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);

    console.log(`status:${manifest.status}`);
    console.log(`sections:${manifest.sectionCount} expected:${manifest.expectedSectionCount} markers:${manifest.markerCandidateCount}`);
    console.log(`report:${outputPath}`);

    if (issues.length > 0) {
      issues.forEach((issue) => console.error(`issue:${issue}`));
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceImportGateSmoke = async () => {
  const { spawnSync } = await import("node:child_process");
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const importGateScript = path.join(frontendRoot, 'scripts/sajik-seatmap-operator-reference.mjs');
  const templatePath = path.join(reportDir, 'stage01-approval-template.json');

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function approveRow(row) {
    row.operatorDecision = 'APPROVED';
    row.correctedPath = row.candidatePath;
    row.correctedHitPath = row.candidateHitPath;
    row.correctedLabelPoint = row.candidateLabelPoint;
    row.reviewer = 'SMOKE_TEST_OPERATOR';
    row.reviewedAt = '2026-05-19T00:00:00.000Z';
    row.operatorNotes = 'Smoke fixture only; not production approval.';
  }

  function runImportGate({ inputPath, outputPath, draftOutputPath }) {
    return spawnSync(
      process.execPath,
      [
        importGateScript,
        '--input',
        inputPath,
        '--output',
        outputPath,
        '--draft-output',
        draftOutputPath,
      ],
      {
        cwd: frontendRoot,
        encoding: 'utf8',
      },
    );
  }

  function assertCondition(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  async function main() {
    const template = JSON.parse(await fs.readFile(templatePath, 'utf8'));

    const approvedFixture = clone(template);
    approvedFixture.stage.status = 'SMOKE_APPROVED_SAMPLE';
    approvedFixture.rows.forEach((row) => {
      if (['024', '023'].includes(row.sectionId)) approveRow(row);
    });

    const approvedFixturePath = path.join(reportDir, 'stage01-approval-fixture-approved-sample.json');
    const approvedReportPath = path.join(reportDir, 'stage01-import-gate-approved-sample-report.json');
    const approvedDraftPath = path.join(reportDir, 'stage01-approved-dataset-draft-sample.json');
    await fs.writeFile(approvedFixturePath, `${JSON.stringify(approvedFixture, null, 2)}\n`);

    const approvedRun = runImportGate({
      inputPath: approvedFixturePath,
      outputPath: approvedReportPath,
      draftOutputPath: approvedDraftPath,
    });
    if (approvedRun.status !== 0) {
      throw new Error(`Approved fixture should pass import gate.\n${approvedRun.stdout}\n${approvedRun.stderr}`);
    }

    const approvedReport = JSON.parse(await fs.readFile(approvedReportPath, 'utf8'));
    const approvedDraft = JSON.parse(await fs.readFile(approvedDraftPath, 'utf8'));
    assertCondition(approvedReport.status === 'PASS_IMPORT_GATE', 'Approved fixture report must pass.');
    assertCondition(approvedReport.counts.readyToImportRows === 2, 'Approved fixture must produce two ready rows.');
    assertCondition(approvedDraft.status === 'DRAFT_READY_FOR_DATASET_PATCH', 'Approved fixture draft must be ready.');
    assertCondition(approvedDraft.sections.length === 2, 'Approved fixture draft must contain two sections.');

    const failureFixture = clone(template);
    failureFixture.stage.status = 'SMOKE_MISSING_CORRECTED_PATH';
    const failureRow = failureFixture.rows.find((row) => row.sectionId === '024') ?? failureFixture.rows[0];
    approveRow(failureRow);
    failureRow.correctedPath = null;

    const failureFixturePath = path.join(reportDir, 'stage01-approval-fixture-missing-corrected-path.json');
    const failureReportPath = path.join(reportDir, 'stage01-import-gate-missing-corrected-path-report.json');
    const failureDraftPath = path.join(reportDir, 'stage01-approved-dataset-draft-missing-corrected-path.json');
    await fs.writeFile(failureFixturePath, `${JSON.stringify(failureFixture, null, 2)}\n`);

    const failureRun = runImportGate({
      inputPath: failureFixturePath,
      outputPath: failureReportPath,
      draftOutputPath: failureDraftPath,
    });
    if (failureRun.status === 0) {
      throw new Error(`Missing correctedPath fixture should fail import gate.\n${failureRun.stdout}\n${failureRun.stderr}`);
    }

    const failureReport = JSON.parse(await fs.readFile(failureReportPath, 'utf8'));
    assertCondition(failureReport.status === 'FAIL_IMPORT_GATE', 'Failure fixture report must fail.');
    assertCondition(
      failureReport.issues.some((issue) => issue.includes('correctedPath is required')),
      'Failure fixture must report missing correctedPath.',
    );

    console.log('status:PASS_IMPORT_GATE_SMOKE');
    console.log(`approved_fixture:${approvedFixturePath}`);
    console.log(`approved_report:${approvedReportPath}`);
    console.log(`approved_draft:${approvedDraftPath}`);
    console.log(`failure_fixture:${failureFixturePath}`);
    console.log(`failure_report:${failureReportPath}`);
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceImportGate = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const defaultInputPath = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace/stage01-approval-template.json');

  const EXPECTED_CONTRACT = 'SAJIK_OPERATOR_REFERENCE_STAGE01_APPROVAL_TEMPLATE_V1';
  const EXPECTED_MAP_VERSION = 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';
  const EXPECTED_SOURCE_ID = 'OPERATOR_REFERENCE_2026';
  const EXPECTED_VIEW_BOX = '0 0 1151 1367';
  const EXPECTED_SHA256 = '794d957510240c786f4fce821814afbf01cc1f93fe7ec3ecca23846a8d753f6f';

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  function pathCommands(pathData) {
    return String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];
  }

  function pathPoints(pathData) {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  }

  function polygonArea(points) {
    return Math.abs(points.reduce((sum, point, index) => {
      const next = points[(index + 1) % points.length];
      return sum + (point[0] * next[1]) - (next[0] * point[1]);
    }, 0) / 2);
  }

  function boundsForPoints(points) {
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  }

  function distanceToSegment(point, start, end) {
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
  }

  function pointOnPolygonBoundary(point, polygon, tolerance = 1) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  }

  function pointInPolygon(point, polygon) {
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
  }

  function orientation(a, b, c) {
    const value = ((b[1] - a[1]) * (c[0] - b[0])) - ((b[0] - a[0]) * (c[1] - b[1]));
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return b[0] <= Math.max(a[0], c[0])
      && b[0] >= Math.min(a[0], c[0])
      && b[1] <= Math.max(a[1], c[1])
      && b[1] >= Math.min(a[1], c[1]);
  }

  function segmentsIntersect(a, b, c, d) {
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
  }

  function hasSelfIntersection(points) {
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        const adjacent = first === second
          || firstNext === second
          || secondNext === first;
        if (adjacent) continue;
        if (first === 0 && secondNext === 0) continue;
        if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
          return true;
        }
      }
    }
    return false;
  }

  function validateApprovedGeometry(row, pathData, labelPoint, fieldPrefix) {
    const issues = [];
    const commands = pathCommands(pathData);
    const points = pathPoints(pathData);

    if (!pathData) issues.push(`${fieldPrefix}:MISSING_PATH`);
    if (!commands.length || commands[0].toUpperCase() !== 'M') issues.push(`${fieldPrefix}:PATH_MUST_START_WITH_M`);
    if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) issues.push(`${fieldPrefix}:PATH_MUST_HAVE_SINGLE_SUBPATH`);
    if (commands[commands.length - 1]?.toUpperCase() !== 'Z') issues.push(`${fieldPrefix}:PATH_MUST_CLOSE_WITH_Z`);
    if (commands.some((command) => !['M', 'L', 'Z'].includes(command.toUpperCase()))) issues.push(`${fieldPrefix}:PATH_MUST_USE_POLYGON_COMMANDS_ONLY`);
    if (points.length < 4) issues.push(`${fieldPrefix}:POLYGON_REQUIRES_AT_LEAST_4_POINTS`);

    if (points.length >= 3) {
      const bounds = boundsForPoints(points);
      if (bounds.minX < 0 || bounds.minY < 0 || bounds.maxX > 1151 || bounds.maxY > 1367) {
        issues.push(`${fieldPrefix}:POLYGON_OUT_OF_BOUNDS`);
      }
      if (polygonArea(points) < 16) issues.push(`${fieldPrefix}:POLYGON_AREA_TOO_SMALL`);
      if (hasSelfIntersection(points)) issues.push(`${fieldPrefix}:POLYGON_SELF_INTERSECTION`);
      if (!pointInPolygon(labelPoint, points)) issues.push(`${fieldPrefix}:LABEL_POINT_OUTSIDE_POLYGON`);
    }

    return {
      sectionId: row.sectionId,
      path: pathData,
      labelPoint,
      pointCount: points.length,
      areaPx2: Number(polygonArea(points).toFixed(1)),
      issues,
    };
  }

  function normalizeDecision(value) {
    return String(value ?? 'PENDING_REVIEW').trim().toUpperCase();
  }

  function validateTemplateMetadata(template) {
    const issues = [];
    if (template.contract !== EXPECTED_CONTRACT) issues.push(`contract expected ${EXPECTED_CONTRACT}`);
    if (template.sourceId !== EXPECTED_SOURCE_ID) issues.push(`sourceId expected ${EXPECTED_SOURCE_ID}`);
    if (template.mapVersion !== EXPECTED_MAP_VERSION) issues.push(`mapVersion expected ${EXPECTED_MAP_VERSION}`);
    if (template.image?.viewBox !== EXPECTED_VIEW_BOX) issues.push(`image.viewBox expected ${EXPECTED_VIEW_BOX}`);
    if (template.image?.sha256 !== EXPECTED_SHA256) issues.push(`image.sha256 expected ${EXPECTED_SHA256}`);
    if (!Array.isArray(template.rows)) issues.push('rows must be an array');
    return issues;
  }

  async function main() {
    const inputPath = argValue('--input', defaultInputPath);
    const outputPath = argValue(
      '--output',
      path.join(path.dirname(inputPath), 'stage01-import-gate-report.json'),
    );
    const draftOutputPath = argValue(
      '--draft-output',
      path.join(path.dirname(inputPath), 'stage01-approved-dataset-draft.json'),
    );
    const template = JSON.parse(await fs.readFile(inputPath, 'utf8'));
    const issues = validateTemplateMetadata(template);
    const approvedRows = [];
    const pendingRows = [];
    const rejectedRows = [];
    const unknownDecisionRows = [];

    for (const row of template.rows ?? []) {
      const decision = normalizeDecision(row.operatorDecision);
      if (decision === 'APPROVED') {
        approvedRows.push(row);
      } else if (decision === 'PENDING_REVIEW' || decision === 'PENDING') {
        pendingRows.push(row);
      } else if (decision === 'REJECTED' || decision === 'NEEDS_RETRACE') {
        rejectedRows.push(row);
      } else {
        unknownDecisionRows.push(row.sectionId ?? 'UNKNOWN');
        issues.push(`${row.sectionId ?? 'UNKNOWN'} has unsupported operatorDecision ${decision}`);
      }
    }

    const approvedGeometry = [];
    for (const row of approvedRows) {
      const requiredFields = ['correctedPath', 'correctedLabelPoint', 'reviewer', 'reviewedAt'];
      requiredFields.forEach((field) => {
        if (row[field] === null || row[field] === undefined || row[field] === '') {
          issues.push(`${row.sectionId}:${field} is required for APPROVED rows`);
        }
      });

      if (!Array.isArray(row.correctedLabelPoint) || row.correctedLabelPoint.length !== 2) {
        issues.push(`${row.sectionId}:correctedLabelPoint must be [x, y]`);
        continue;
      }

      const visualPath = row.correctedPath;
      const hitPath = row.correctedHitPath || row.correctedPath;
      const visualValidation = validateApprovedGeometry(row, visualPath, row.correctedLabelPoint, 'visualPath');
      const hitValidation = validateApprovedGeometry(row, hitPath, row.correctedLabelPoint, 'hitPath');
      issues.push(...visualValidation.issues.map((issue) => `${row.sectionId}:${issue}`));
      issues.push(...hitValidation.issues.map((issue) => `${row.sectionId}:${issue}`));

      approvedGeometry.push({
        sectionId: row.sectionId,
        visualPath,
        hitPath,
        labelPoint: row.correctedLabelPoint,
        reviewer: row.reviewer,
        reviewedAt: row.reviewedAt,
        operatorNotes: row.operatorNotes ?? null,
        visualAreaPx2: visualValidation.areaPx2,
        hitAreaPx2: hitValidation.areaPx2,
        pointCount: visualValidation.pointCount,
      });
    }

    const report = {
      status: issues.length === 0 ? 'PASS_IMPORT_GATE' : 'FAIL_IMPORT_GATE',
      inputPath,
      outputPath,
      draftOutputPath,
      contract: EXPECTED_CONTRACT,
      sourceId: EXPECTED_SOURCE_ID,
      mapVersion: EXPECTED_MAP_VERSION,
      counts: {
        totalRows: template.rows?.length ?? 0,
        approvedRows: approvedRows.length,
        pendingRows: pendingRows.length,
        rejectedRows: rejectedRows.length,
        unknownDecisionRows: unknownDecisionRows.length,
        readyToImportRows: issues.length === 0 ? approvedRows.length : 0,
      },
      datasetDraftSectionCount: issues.length === 0 ? approvedGeometry.length : 0,
      approvedGeometry,
      issues,
      note: approvedRows.length === 0
        ? 'No APPROVED rows yet. Gate passes metadata/template validation but imports no runtime geometry.'
        : 'Only APPROVED rows with corrected geometry are eligible for a future runtime dataset patch.',
    };

    const approvedDatasetDraft = {
      contract: 'SAJIK_OPERATOR_REFERENCE_APPROVED_DATASET_DRAFT_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: EXPECTED_SOURCE_ID,
      mapVersion: EXPECTED_MAP_VERSION,
      image: template.image,
      stage: template.stage,
      status: issues.length === 0 && approvedGeometry.length > 0
        ? 'DRAFT_READY_FOR_DATASET_PATCH'
        : 'NO_APPROVED_ROWS',
      sectionCount: issues.length === 0 ? approvedGeometry.length : 0,
      sections: issues.length === 0
        ? approvedGeometry.map((geometry) => ({
          sectionId: geometry.sectionId,
          visualPath: geometry.visualPath,
          hitPath: geometry.hitPath,
          labelPoint: geometry.labelPoint,
          geometryVersion: 'operator-reference-polygon-v1',
          traceStatus: 'OPERATOR_APPROVED',
          operatorReview: {
            reviewer: geometry.reviewer,
            reviewedAt: geometry.reviewedAt,
            notes: geometry.operatorNotes,
          },
        }))
        : [],
    };

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.mkdir(path.dirname(draftOutputPath), { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(draftOutputPath, `${JSON.stringify(approvedDatasetDraft, null, 2)}\n`);

    console.log(`status:${report.status}`);
    console.log(`rows:${report.counts.totalRows} approved:${report.counts.approvedRows} pending:${report.counts.pendingRows} ready:${report.counts.readyToImportRows}`);
    console.log(`report:${outputPath}`);
    console.log(`draft:${draftOutputPath}`);

    if (issues.length > 0) {
      issues.forEach((issue) => console.error(`issue:${issue}`));
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceMarkerBoundaryReview = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET, validateSajikOperatorReferenceSeatMapDataset } = await import("../src/data/sajikOperatorReferenceSeatMapDataset.ts");
  const { distanceToPolygon, pointInPolygon } = await import("../src/utils/seatMapPolygonValidator.ts");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportRoot = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const outputDir = path.join(reportRoot, 'marker-boundary-review');
  const reportPath = path.join(reportRoot, 'operator-reference-marker-boundary-review.json');
  const markdownPath = path.join(reportRoot, 'operator-reference-marker-boundary-review.md');
  const imagePath = path.join(frontendRoot, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.path);

  const CONTRACT = 'SAJIK_OPERATOR_REFERENCE_MARKER_BOUNDARY_REVIEW_V1';
  const POINTER_HIT_RADIUS_PX = 26;
  const MIN_RELATED_BOUNDARY_MARGIN_PX = 15;
  const CIRCLE_SAMPLE_STEP_PX = 2;
  const TARGET_MARKER_IDS = [
    'stage02-wheelchair-02',
    'stage02-wheelchair-05',
    'stage02-wheelchair-06',
    'stage02-wheelchair-07',
    'stage02-wheelchair-08',
    'stage03-wheelchair-03',
  ];

  function sorted(values) {
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  function round(value, digits = 2) {
    return Number(value.toFixed(digits));
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function escapeMarkdown(value) {
    return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  }

  function sanitizeFilePart(value) {
    return String(value).replaceAll(/[^A-Za-z0-9_-]/g, '_');
  }

  function relativePath(filePath) {
    return path.relative(frontendRoot, filePath).split(path.sep).join('/');
  }

  function markdownRelativePath(frontendRelativePath) {
    return path.relative(
      path.dirname(markdownPath),
      path.resolve(frontendRoot, frontendRelativePath),
    ).split(path.sep).join('/');
  }

  function polygonBounds(points) {
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    };
  }

  function mergeBounds(boundsList) {
    return boundsList.reduce((acc, bounds) => ({
      minX: Math.min(acc.minX, bounds.minX),
      minY: Math.min(acc.minY, bounds.minY),
      maxX: Math.max(acc.maxX, bounds.maxX),
      maxY: Math.max(acc.maxY, bounds.maxY),
    }), {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    });
  }

  function expandedCrop(bounds, padding = 70) {
    const image = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image;
    const left = Math.max(0, Math.floor(bounds.minX - padding));
    const top = Math.max(0, Math.floor(bounds.minY - padding));
    const right = Math.min(image.width, Math.ceil(bounds.maxX + padding));
    const bottom = Math.min(image.height, Math.ceil(bounds.maxY + padding));
    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  }

  function markerVisualRadius(marker) {
    return Math.max(
      marker.bounds.maxX - marker.bounds.minX,
      marker.bounds.maxY - marker.bounds.minY,
    ) / 2;
  }

  function polygonCircleTouches(polygon, center, radius) {
    if (pointInPolygon(center, polygon)) return true;
    if (distanceToPolygon(center, polygon) <= radius) return true;
    return polygon.some(([x, y]) => Math.hypot(x - center[0], y - center[1]) <= radius);
  }

  function circleTouchSectionIds(sections, marker, radius, polygonKey) {
    return sections
      .filter((section) => polygonCircleTouches(section[polygonKey], marker.position, radius))
      .map((section) => section.sectionId);
  }

  function circleSampleOwnership(sections, marker, radius, polygonKey) {
    const [centerX, centerY] = marker.position;
    const countsBySectionId = new Map();
    let totalSamples = 0;

    for (let y = centerY - radius; y <= centerY + radius; y += CIRCLE_SAMPLE_STEP_PX) {
      for (let x = centerX - radius; x <= centerX + radius; x += CIRCLE_SAMPLE_STEP_PX) {
        if (Math.hypot(x - centerX, y - centerY) > radius) {
          continue;
        }
        totalSamples += 1;
        sections.forEach((section) => {
          if (pointInPolygon([x, y], section[polygonKey])) {
            countsBySectionId.set(section.sectionId, (countsBySectionId.get(section.sectionId) ?? 0) + 1);
          }
        });
      }
    }

    return [...countsBySectionId.entries()]
      .map(([sectionId, samples]) => ({
        sectionId,
        samples,
        coveragePct: round((samples / totalSamples) * 100, 1),
      }))
      .sort((first, second) => second.samples - first.samples || first.sectionId.localeCompare(second.sectionId));
  }

  function nearestSections(sections, marker, limit = 8) {
    return sections
      .map((section) => ({
        sectionId: section.sectionId,
        distancePx: round(distanceToPolygon(marker.position, section.visualPolygon)),
      }))
      .sort((first, second) => first.distancePx - second.distancePx || first.sectionId.localeCompare(second.sectionId))
      .slice(0, limit);
  }

  function recommendationFor({ marker, centerVisualOwnerIds, visualCircleTouchesOtherIds, pointerHitTouchesOtherIds, relatedBoundaryMarginPx }) {
    if (centerVisualOwnerIds.length === 1 && centerVisualOwnerIds[0] !== marker.relatedSectionId) {
      return {
        recommendedOperatorDecision: 'REMAP_RELATED_SECTION',
        reason: `marker center is owned by ${centerVisualOwnerIds[0]}, not ${marker.relatedSectionId}`,
      };
    }

    if (!centerVisualOwnerIds.includes(marker.relatedSectionId)) {
      return {
        recommendedOperatorDecision: 'NEEDS_RETRACE',
        reason: 'marker center is not inside the related section polygon',
      };
    }

    if (visualCircleTouchesOtherIds.length > 0) {
      return {
        recommendedOperatorDecision: 'NEEDS_RETRACE',
        reason: `visual marker circle touches adjacent sections: ${visualCircleTouchesOtherIds.join(', ')}`,
      };
    }

    if (relatedBoundaryMarginPx >= MIN_RELATED_BOUNDARY_MARGIN_PX && pointerHitTouchesOtherIds.length === 0) {
      return {
        recommendedOperatorDecision: 'APPROVE_LINK',
        reason: 'center ownership, boundary margin, and 26px pointer hit checks all pass',
      };
    }

    return {
      recommendedOperatorDecision: 'KEEP_DISPLAY_ONLY',
      reason: [
        relatedBoundaryMarginPx < MIN_RELATED_BOUNDARY_MARGIN_PX
          ? `related boundary margin ${round(relatedBoundaryMarginPx)}px is below ${MIN_RELATED_BOUNDARY_MARGIN_PX}px`
          : '',
        pointerHitTouchesOtherIds.length > 0
          ? `26px hit circle touches adjacent sections: ${pointerHitTouchesOtherIds.join(', ')}`
          : '',
      ].filter(Boolean).join('; '),
    };
  }

  function analyzeMarker(marker, sections) {
    const relatedSection = sections.find((section) => section.sectionId === marker.relatedSectionId);
    const visualRadiusPx = markerVisualRadius(marker);
    const centerVisualOwnerIds = sections
      .filter((section) => pointInPolygon(marker.position, section.visualPolygon))
      .map((section) => section.sectionId);
    const centerHitOwnerIds = sections
      .filter((section) => pointInPolygon(marker.position, section.hitPolygon))
      .map((section) => section.sectionId);
    const visualCircleTouchesIds = circleTouchSectionIds(sections, marker, visualRadiusPx, 'visualPolygon');
    const pointerHitTouchesIds = circleTouchSectionIds(sections, marker, POINTER_HIT_RADIUS_PX, 'hitPolygon');
    const visualCircleTouchesOtherIds = visualCircleTouchesIds.filter((sectionId) => sectionId !== marker.relatedSectionId);
    const pointerHitTouchesOtherIds = pointerHitTouchesIds.filter((sectionId) => sectionId !== marker.relatedSectionId);
    const relatedBoundaryMarginPx = relatedSection
      ? distanceToPolygon(marker.position, relatedSection.visualPolygon)
      : 0;
    const hitCircleCoverage = circleSampleOwnership(sections, marker, POINTER_HIT_RADIUS_PX, 'hitPolygon');
    const nearest = nearestSections(sections, marker);
    const recommendation = recommendationFor({
      marker,
      centerVisualOwnerIds,
      visualCircleTouchesOtherIds,
      pointerHitTouchesOtherIds,
      relatedBoundaryMarginPx,
    });

    return {
      markerId: marker.markerId,
      markerType: marker.markerType,
      markerInteractionStatus: marker.markerInteractionStatus,
      relatedSectionId: marker.relatedSectionId,
      stageId: marker.stageId,
      position: marker.position,
      bounds: marker.bounds,
      visualRadiusPx: round(visualRadiusPx),
      pointerHitRadiusPx: POINTER_HIT_RADIUS_PX,
      centerVisualOwnerIds: sorted(centerVisualOwnerIds),
      centerHitOwnerIds: sorted(centerHitOwnerIds),
      visualCircleTouchesIds: sorted(visualCircleTouchesIds),
      visualCircleTouchesOtherIds: sorted(visualCircleTouchesOtherIds),
      pointerHitTouchesIds: sorted(pointerHitTouchesIds),
      pointerHitTouchesOtherIds: sorted(pointerHitTouchesOtherIds),
      relatedBoundaryMarginPx: round(relatedBoundaryMarginPx),
      hitCircleCoverage,
      nearestSections: nearest,
      blockers: [
        !relatedSection ? 'RELATED_SECTION_MISSING' : '',
        centerVisualOwnerIds.includes(marker.relatedSectionId) ? '' : 'CENTER_NOT_IN_RELATED_SECTION',
        visualCircleTouchesOtherIds.length > 0 ? 'VISUAL_MARKER_TOUCHES_OTHER_SECTION' : '',
        relatedBoundaryMarginPx < MIN_RELATED_BOUNDARY_MARGIN_PX ? 'LOW_RELATED_BOUNDARY_MARGIN' : '',
        pointerHitTouchesOtherIds.length > 0 ? 'POINTER_HIT_RADIUS_TOUCHES_OTHER_SECTION' : '',
      ].filter(Boolean),
      ...recommendation,
    };
  }

  function buildMarkerSvg({ marker, row, sectionsById, imageDataUrl, crop }) {
    const drawSectionIds = sorted(new Set([
      row.relatedSectionId,
      ...row.pointerHitTouchesIds,
      ...row.visualCircleTouchesIds,
      ...row.nearestSections.slice(0, 5).map((section) => section.sectionId),
    ]));
    const sectionPaths = drawSectionIds
      .map((sectionId) => sectionsById.get(sectionId))
      .filter(Boolean)
      .map((section) => {
        const isRelated = section.sectionId === row.relatedSectionId;
        const isPointerConflict = row.pointerHitTouchesOtherIds.includes(section.sectionId);
        const stroke = isRelated ? '#22c55e' : isPointerConflict ? '#ef4444' : '#38bdf8';
        const fill = isRelated ? '#22c55e' : isPointerConflict ? '#ef4444' : '#38bdf8';
        const dash = isRelated ? '' : 'stroke-dasharray="8 5"';
        const [labelX, labelY] = section.labelPoint;
        return [
          `<path d="${escapeXml(section.hitPath)}" fill="${fill}" fill-opacity="${isRelated ? '0.2' : '0.12'}" stroke="${stroke}" stroke-width="${isRelated ? '4' : '3'}" ${dash} vector-effect="non-scaling-stroke" />`,
          `<text x="${labelX}" y="${labelY + 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="800" fill="#111827" stroke="#ffffff" stroke-width="4" paint-order="stroke">${escapeXml(section.sectionId)}</text>`,
        ].join('\n');
      });
    const [x, y] = marker.position;

    return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width * 2}" height="${crop.height * 2}" viewBox="${crop.left} ${crop.top} ${crop.width} ${crop.height}">
    <image href="${imageDataUrl}" x="0" y="0" width="${SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width}" height="${SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height}" />
    <rect x="${crop.left}" y="${crop.top}" width="${crop.width}" height="${crop.height}" fill="none" stroke="#111827" stroke-width="2" vector-effect="non-scaling-stroke" />
    <g id="section-overlays">
  ${sectionPaths.join('\n')}
    </g>
    <g id="marker-overlays">
      <rect x="${marker.bounds.minX}" y="${marker.bounds.minY}" width="${marker.bounds.maxX - marker.bounds.minX}" height="${marker.bounds.maxY - marker.bounds.minY}" fill="none" stroke="#facc15" stroke-width="4" vector-effect="non-scaling-stroke" />
      <circle cx="${x}" cy="${y}" r="${row.pointerHitRadiusPx}" fill="#facc15" fill-opacity="0.16" stroke="#facc15" stroke-width="4" vector-effect="non-scaling-stroke" />
      <circle cx="${x}" cy="${y}" r="${row.visualRadiusPx}" fill="#a3e635" fill-opacity="0.42" stroke="#111827" stroke-width="3" vector-effect="non-scaling-stroke" />
      <path d="M ${x - 12} ${y} L ${x + 12} ${y} M ${x} ${y - 12} L ${x} ${y + 12}" stroke="#ffffff" stroke-width="6" vector-effect="non-scaling-stroke" />
      <path d="M ${x - 12} ${y} L ${x + 12} ${y} M ${x} ${y - 12} L ${x} ${y + 12}" stroke="#111827" stroke-width="2" vector-effect="non-scaling-stroke" />
      <text x="${x}" y="${y - row.pointerHitRadiusPx - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="#111827" stroke="#ffffff" stroke-width="4" paint-order="stroke">${escapeXml(marker.markerId)} → ${escapeXml(marker.relatedSectionId)}</text>
    </g>
  </svg>
  `;
  }

  function buildMarkdown(report) {
    const rows = [
      '# Sajik Operator Reference Marker Boundary Review',
      '',
      `- status: \`${report.status}\``,
      `- targets: \`${report.counts.targets}\``,
      `- recommendations: ${Object.entries(report.counts.recommendations).map(([key, value]) => `\`${key}=${value}\``).join(', ')}`,
      '',
      '| marker | related | recommendation | blockers | coverage | evidence |',
      '| --- | --- | --- | --- | --- | --- |',
    ];

    report.rows.forEach((row) => {
      const coverage = row.hitCircleCoverage
        .slice(0, 4)
        .map((entry) => `${entry.sectionId}:${entry.coveragePct}%`)
        .join(', ');
      rows.push(`| ${[
        escapeMarkdown(row.markerId),
        escapeMarkdown(row.relatedSectionId),
        escapeMarkdown(row.recommendedOperatorDecision),
        escapeMarkdown(row.blockers.join(', ') || 'none'),
        escapeMarkdown(coverage || 'none'),
        row.evidencePng ? `![${escapeMarkdown(row.markerId)}](${escapeMarkdown(markdownRelativePath(row.evidencePng))})` : '',
      ].join(' | ')} |`);
    });

    rows.push('');
    rows.push('Decision values: `APPROVE_LINK`, `KEEP_DISPLAY_ONLY`, `REMAP_RELATED_SECTION`, `NEEDS_RETRACE`.');
    rows.push('This review package is evidence-only. It does not promote display-only markers.');
    return `${rows.join('\n')}\n`;
  }

  async function main() {
    const datasetIssues = validateSajikOperatorReferenceSeatMapDataset(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET);
    const sections = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections;
    const markers = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers;
    const sectionsById = new Map(sections.map((section) => [section.sectionId, section]));
    const markersById = new Map(markers.map((marker) => [marker.markerId, marker]));
    const displayOnlyMarkerIds = sorted(markers
      .filter((marker) => marker.markerInteractionStatus === 'DISPLAY_ONLY')
      .map((marker) => marker.markerId));
    const issues = [
      ...datasetIssues.map((issue) => `DATASET_VALIDATION:${issue}`),
    ];

    if (JSON.stringify(displayOnlyMarkerIds) !== JSON.stringify(TARGET_MARKER_IDS)) {
      issues.push(`DISPLAY_ONLY_MARKER_IDS_CHANGED:${displayOnlyMarkerIds.join(',')}`);
    }

    const imageMetadata = await sharp(imagePath).metadata();
    if (imageMetadata.width !== SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width || imageMetadata.height !== SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height) {
      issues.push(`IMAGE_SIZE_CHANGED:${imageMetadata.width}x${imageMetadata.height}`);
    }

    const imageBuffer = await fs.readFile(imagePath);
    const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    await fs.mkdir(outputDir, { recursive: true });

    const rows = [];
    for (const [index, markerId] of TARGET_MARKER_IDS.entries()) {
      const marker = markersById.get(markerId);
      if (!marker) {
        issues.push(`TARGET_MARKER_MISSING:${markerId}`);
        continue;
      }

      const row = analyzeMarker(marker, sections);
      const relatedSection = sectionsById.get(marker.relatedSectionId);
      const touchSections = [...new Set([
        marker.relatedSectionId,
        ...row.pointerHitTouchesIds,
        ...row.visualCircleTouchesIds,
        ...row.nearestSections.slice(0, 4).map((section) => section.sectionId),
      ])].map((sectionId) => sectionsById.get(sectionId)).filter(Boolean);
      const crop = expandedCrop(mergeBounds([
        marker.bounds,
        ...(relatedSection ? [polygonBounds(relatedSection.hitPolygon)] : []),
        ...touchSections.map((section) => polygonBounds(section.hitPolygon)),
      ]));
      const sequence = String(index + 1).padStart(2, '0');
      const fileBase = `${sequence}-${sanitizeFilePart(marker.markerId)}-${sanitizeFilePart(marker.relatedSectionId)}`;
      const svgPath = path.join(outputDir, `${fileBase}.svg`);
      const pngPath = path.join(outputDir, `${fileBase}.png`);
      const svg = buildMarkerSvg({ marker, row, sectionsById, imageDataUrl, crop });
      await fs.writeFile(svgPath, svg, 'utf8');
      await sharp(Buffer.from(svg)).png().toFile(pngPath);
      rows.push({
        ...row,
        evidenceSvg: relativePath(svgPath),
        evidencePng: relativePath(pngPath),
        crop,
      });
    }

    const recommendationCounts = rows.reduce((acc, row) => {
      acc[row.recommendedOperatorDecision] = (acc[row.recommendedOperatorDecision] ?? 0) + 1;
      return acc;
    }, {});

    const report = {
      contract: CONTRACT,
      stadiumId: 'BUSAN_SAJIK',
      sourceId: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sourceId,
      mapVersion: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.mapVersion,
      status: issues.length === 0 ? 'PASS_MARKER_BOUNDARY_REVIEW_EVIDENCE' : 'FAIL_MARKER_BOUNDARY_REVIEW_EVIDENCE',
      policy: {
        evidenceOnly: true,
        noMarkerPromotionInThisStep: true,
        pointerHitRadiusPx: POINTER_HIT_RADIUS_PX,
        minRelatedBoundaryMarginPx: MIN_RELATED_BOUNDARY_MARGIN_PX,
        circleSampleStepPx: CIRCLE_SAMPLE_STEP_PX,
        decisionValues: ['APPROVE_LINK', 'KEEP_DISPLAY_ONLY', 'REMAP_RELATED_SECTION', 'NEEDS_RETRACE'],
      },
      counts: {
        targets: rows.length,
        displayOnlyMarkers: displayOnlyMarkerIds.length,
        recommendations: recommendationCounts,
        issues: issues.length,
      },
      targetMarkerIds: TARGET_MARKER_IDS,
      displayOnlyMarkerIds,
      outputDir: relativePath(outputDir),
      markdown: relativePath(markdownPath),
      rows,
      issues,
    };

    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(markdownPath, buildMarkdown(report));

    console.log(`status:${report.status}`);
    console.log(`targets:${report.counts.targets} displayOnly:${report.counts.displayOnlyMarkers}`);
    console.log(`recommendations:${Object.entries(recommendationCounts).map(([key, value]) => `${key}=${value}`).join(',') || 'none'}`);
    console.log(`report:${reportPath}`);
    console.log(`review_board:${markdownPath}`);

    report.issues.slice(0, 12).forEach((issue) => console.error(`issue:${issue}`));
    if (report.status !== 'PASS_MARKER_BOUNDARY_REVIEW_EVIDENCE') {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceMarkerLinkReadiness = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET, validateSajikOperatorReferenceSeatMapDataset } = await import("../src/data/sajikOperatorReferenceSeatMapDataset.ts");
  const { distanceToPolygon, pointInPolygon } = await import("../src/utils/seatMapPolygonValidator.ts");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const outputPath = path.join(reportDir, 'operator-reference-marker-link-readiness.json');

  const CONTRACT = 'SAJIK_OPERATOR_REFERENCE_MARKER_LINK_READINESS_V1';
  const POINTER_HIT_RADIUS_PX = 26;
  const MIN_RELATED_BOUNDARY_MARGIN_PX = 15;
  const RECOMMENDED_BATCH_A_LIMIT = 3;

  function sorted(values) {
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  function round(value, digits = 2) {
    return Number(value.toFixed(digits));
  }

  function markerVisualRadius(marker) {
    return Math.max(
      marker.bounds.maxX - marker.bounds.minX,
      marker.bounds.maxY - marker.bounds.minY,
    ) / 2;
  }

  function polygonCircleTouches(polygon, center, radius) {
    if (pointInPolygon(center, polygon)) return true;
    if (distanceToPolygon(center, polygon) <= radius) return true;
    return polygon.some(([x, y]) => Math.hypot(x - center[0], y - center[1]) <= radius);
  }

  function sectionTouchIds(sections, marker, radius) {
    return sections
      .filter((section) => section.sectionId !== marker.relatedSectionId)
      .filter((section) => polygonCircleTouches(section.visualPolygon, marker.position, radius))
      .map((section) => section.sectionId);
  }

  function readinessForMarker(marker, sections) {
    const relatedSection = sections.find((section) => section.sectionId === marker.relatedSectionId);
    const containingVisualSectionIds = sections
      .filter((section) => pointInPolygon(marker.position, section.visualPolygon))
      .map((section) => section.sectionId);
    const containingHitSectionIds = sections
      .filter((section) => pointInPolygon(marker.position, section.hitPolygon))
      .map((section) => section.sectionId);
    const visualRadiusPx = markerVisualRadius(marker);
    const visualCircleTouchesOtherSections = sectionTouchIds(sections, marker, visualRadiusPx);
    const pointerHitTouchesOtherSections = sectionTouchIds(sections, marker, POINTER_HIT_RADIUS_PX);
    const relatedBoundaryMarginPx = relatedSection
      ? distanceToPolygon(marker.position, relatedSection.visualPolygon)
      : 0;
    const centerMatchesRelatedSection = containingVisualSectionIds.length === 1
      && containingVisualSectionIds[0] === marker.relatedSectionId
      && containingHitSectionIds.includes(marker.relatedSectionId);

    const blockers = [];
    if (!relatedSection) blockers.push('RELATED_SECTION_MISSING');
    if (!centerMatchesRelatedSection) blockers.push('CENTER_CONTAINMENT_MISMATCH');
    if (visualCircleTouchesOtherSections.length > 0) blockers.push('VISUAL_MARKER_OVERLAPS_OTHER_SECTION');
    if (relatedBoundaryMarginPx < MIN_RELATED_BOUNDARY_MARGIN_PX) blockers.push('LOW_RELATED_BOUNDARY_MARGIN');
    if (pointerHitTouchesOtherSections.length > 0) blockers.push('POINTER_HIT_RADIUS_TOUCHES_OTHER_SECTION');

    const decision = marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE'
      ? 'ALREADY_LINKED'
      : blockers.length === 0
        ? 'READY_FOR_LINKING'
        : 'NEEDS_BOUNDARY_REVIEW';

    return {
      markerId: marker.markerId,
      relatedSectionId: marker.relatedSectionId,
      markerInteractionStatus: marker.markerInteractionStatus,
      enabled: marker.enabled,
      stageId: marker.stageId,
      position: marker.position,
      bounds: marker.bounds,
      visualRadiusPx: round(visualRadiusPx),
      pointerHitRadiusPx: POINTER_HIT_RADIUS_PX,
      centerMatchesRelatedSection,
      containingVisualSectionIds: sorted(containingVisualSectionIds),
      containingHitSectionIds: sorted(containingHitSectionIds),
      relatedBoundaryMarginPx: round(relatedBoundaryMarginPx),
      visualCircleTouchesOtherSections: sorted(visualCircleTouchesOtherSections),
      pointerHitTouchesOtherSections: sorted(pointerHitTouchesOtherSections),
      blockers,
      decision,
    };
  }

  async function main() {
    const datasetIssues = validateSajikOperatorReferenceSeatMapDataset(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET);
    const markerReadiness = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers.map((marker) => (
      readinessForMarker(marker, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections)
    ));
    const linkedMarkers = markerReadiness.filter((marker) => marker.decision === 'ALREADY_LINKED');
    const readyForLinking = markerReadiness.filter((marker) => marker.decision === 'READY_FOR_LINKING');
    const needsBoundaryReview = markerReadiness.filter((marker) => marker.decision === 'NEEDS_BOUNDARY_REVIEW');
    const structuralIssues = markerReadiness.flatMap((marker) => (
      marker.blockers
        .filter((blocker) => blocker === 'RELATED_SECTION_MISSING' || blocker === 'CENTER_CONTAINMENT_MISMATCH' || blocker === 'VISUAL_MARKER_OVERLAPS_OTHER_SECTION')
        .map((blocker) => `${marker.markerId}:${blocker}`)
    ));
    const issues = [
      ...datasetIssues.map((issue) => `DATASET_VALIDATION:${issue}`),
      ...structuralIssues,
    ];
    const recommendedBatchA = readyForLinking
      .filter((marker) => marker.stageId === 'stage02')
      .slice(0, RECOMMENDED_BATCH_A_LIMIT)
      .map((marker) => ({
        markerId: marker.markerId,
        relatedSectionId: marker.relatedSectionId,
        reason: 'single-section center containment, no visual overlap, no 26px pointer hit conflict',
      }));

    const report = {
      contract: CONTRACT,
      stadiumId: 'BUSAN_SAJIK',
      sourceId: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sourceId,
      mapVersion: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.mapVersion,
      status: issues.length === 0 ? 'PASS_MARKER_LINK_READINESS' : 'FAIL_MARKER_LINK_READINESS',
      policy: {
        operatorApprovalRequiredBeforeLinking: true,
        pointerHitRadiusPx: POINTER_HIT_RADIUS_PX,
        minRelatedBoundaryMarginPx: MIN_RELATED_BOUNDARY_MARGIN_PX,
        displayOnlyMarkersStayDisabledUntilApproved: true,
      },
      counts: {
        totalMarkers: markerReadiness.length,
        linkedSelectableMarkers: linkedMarkers.length,
        displayOnlyMarkers: markerReadiness.length - linkedMarkers.length,
        readyForLinking: readyForLinking.length,
        needsBoundaryReview: needsBoundaryReview.length,
        recommendedBatchA: recommendedBatchA.length,
        issues: issues.length,
      },
      linkedSelectableMarkerIds: linkedMarkers.map((marker) => marker.markerId),
      readyForLinkingMarkerIds: readyForLinking.map((marker) => marker.markerId),
      needsBoundaryReviewMarkerIds: needsBoundaryReview.map((marker) => marker.markerId),
      recommendedBatchA,
      markerReadiness,
      issues,
    };

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`status:${report.status}`);
    console.log(`markers:${report.counts.totalMarkers} linked:${report.counts.linkedSelectableMarkers} ready:${report.counts.readyForLinking} boundaryReview:${report.counts.needsBoundaryReview}`);
    console.log(`recommendedBatchA:${recommendedBatchA.map((marker) => `${marker.markerId}->${marker.relatedSectionId}`).join(',') || 'none'}`);
    console.log(`report:${outputPath}`);

    report.issues.slice(0, 12).forEach((issue) => console.error(`issue:${issue}`));
    if (report.status !== 'PASS_MARKER_LINK_READINESS') {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceMarkerPolicyAudit = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET, validateSajikOperatorReferenceSeatMapDataset } = await import("../src/data/sajikOperatorReferenceSeatMapDataset.ts");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const outputPath = path.join(reportDir, 'operator-reference-marker-policy-audit.json');

  const EXPECTED_MARKER_COUNT = 14;
  const EXPECTED_MARKER_INTERACTION_STATUS = 'DISPLAY_ONLY';
  const EXPECTED_LINKED_SELECTABLE_MARKER_IDS = [
    'stage02-wheelchair-01',
    'stage02-wheelchair-03',
    'stage02-wheelchair-04',
    'stage02-wheelchair-09',
    'stage03-wheelchair-01',
    'stage03-wheelchair-02',
    'stage03-wheelchair-04',
    'stage03-wheelchair-05',
  ];
  const EXPECTED_DISPLAY_ONLY_MARKER_COUNT = EXPECTED_MARKER_COUNT - EXPECTED_LINKED_SELECTABLE_MARKER_IDS.length;

  function sorted(values) {
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  async function main() {
    const issues = [];
    const datasetIssues = validateSajikOperatorReferenceSeatMapDataset(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET);
    const sectionIds = new Set(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.map((section) => section.sectionId));
    const markerIds = new Set();
    const duplicateMarkerIds = [];
    const enabledMarkerIds = [];
    const linkedSelectableMarkerIds = [];
    const displayOnlyMarkerIds = [];
    const outOfBoundsMarkerIds = [];
    const missingRelatedSectionMarkerIds = [];
    const pointOutsideBoundsMarkerIds = [];

    SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers.forEach((marker) => {
      if (markerIds.has(marker.markerId)) {
        duplicateMarkerIds.push(marker.markerId);
      }
      markerIds.add(marker.markerId);

      if (marker.enabled) {
        enabledMarkerIds.push(marker.markerId);
      }
      if (marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE') {
        linkedSelectableMarkerIds.push(marker.markerId);
      }
      if (marker.markerInteractionStatus === EXPECTED_MARKER_INTERACTION_STATUS) {
        displayOnlyMarkerIds.push(marker.markerId);
      }
      const [x, y] = marker.position;
      if (x < 0 || x > SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width || y < 0 || y > SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height) {
        outOfBoundsMarkerIds.push(marker.markerId);
      }
      if (!sectionIds.has(marker.relatedSectionId)) {
        missingRelatedSectionMarkerIds.push(marker.markerId);
      }
      if (x < marker.bounds.minX || x > marker.bounds.maxX || y < marker.bounds.minY || y > marker.bounds.maxY) {
        pointOutsideBoundsMarkerIds.push(marker.markerId);
      }
    });

    if (SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers !== EXPECTED_MARKER_COUNT) {
      issues.push(`MARKER_COUNT_${SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers}_EXPECTED_${EXPECTED_MARKER_COUNT}`);
    }
    if (duplicateMarkerIds.length > 0) {
      issues.push(`DUPLICATE_MARKER_IDS:${sorted(duplicateMarkerIds).join(',')}`);
    }
    if (JSON.stringify(sorted(enabledMarkerIds)) !== JSON.stringify(EXPECTED_LINKED_SELECTABLE_MARKER_IDS)) {
      issues.push(`ENABLED_MARKER_IDS_CHANGED:${sorted(enabledMarkerIds).join(',')}`);
    }
    if (JSON.stringify(sorted(linkedSelectableMarkerIds)) !== JSON.stringify(EXPECTED_LINKED_SELECTABLE_MARKER_IDS)) {
      issues.push(`LINKED_SELECTABLE_MARKER_IDS_CHANGED:${sorted(linkedSelectableMarkerIds).join(',')}`);
    }
    if (displayOnlyMarkerIds.length !== EXPECTED_DISPLAY_ONLY_MARKER_COUNT) {
      issues.push(`DISPLAY_ONLY_MARKER_COUNT_${displayOnlyMarkerIds.length}_EXPECTED_${EXPECTED_DISPLAY_ONLY_MARKER_COUNT}`);
    }
    if (outOfBoundsMarkerIds.length > 0) {
      issues.push(`MARKER_OUT_OF_BOUNDS:${sorted(outOfBoundsMarkerIds).join(',')}`);
    }
    if (missingRelatedSectionMarkerIds.length > 0) {
      issues.push(`MARKER_RELATED_SECTION_MISSING:${sorted(missingRelatedSectionMarkerIds).join(',')}`);
    }
    if (pointOutsideBoundsMarkerIds.length > 0) {
      issues.push(`MARKER_POSITION_OUTSIDE_COMPONENT_BOUNDS:${sorted(pointOutsideBoundsMarkerIds).join(',')}`);
    }
    if (datasetIssues.length > 0) {
      issues.push(...datasetIssues.map((issue) => `DATASET_VALIDATION:${issue}`));
    }

    const report = {
      contract: 'SAJIK_OPERATOR_REFERENCE_MARKER_POLICY_AUDIT_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sourceId,
      mapVersion: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.mapVersion,
      status: issues.length === 0 ? 'PASS_MARKER_POLICY_AUDIT' : 'FAIL_MARKER_POLICY_AUDIT',
      markerPolicy: {
        defaultInteractionStatus: EXPECTED_MARKER_INTERACTION_STATUS,
        seatPolygonLayer: 'EXCLUDED',
        markerLayer: 'DISPLAY_ONLY_WITH_APPROVED_LINKED_SECTION_MARKERS',
        linkedSelectionRequiresOperatorApproval: true,
        linkedSelectionBehavior: 'SELECT_RELATED_SECTION',
      },
      counts: {
        markers: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers,
        displayOnlyMarkers: displayOnlyMarkerIds.length,
        linkedSelectableMarkers: linkedSelectableMarkerIds.length,
        enabledMarkers: enabledMarkerIds.length,
        duplicateMarkerIds: duplicateMarkerIds.length,
        outOfBoundsMarkers: outOfBoundsMarkerIds.length,
        missingRelatedSectionMarkers: missingRelatedSectionMarkerIds.length,
        pointOutsideBoundsMarkers: pointOutsideBoundsMarkerIds.length,
      },
      markerIds: sorted([...markerIds]),
      enabledMarkerIds: sorted(enabledMarkerIds),
      linkedSelectableMarkerIds: sorted(linkedSelectableMarkerIds),
      displayOnlyMarkerIds: sorted(displayOnlyMarkerIds),
      issues,
    };

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`status:${report.status}`);
    console.log(`markers:${report.counts.markers} displayOnly:${report.counts.displayOnlyMarkers} enabled:${report.counts.enabledMarkers}`);
    console.log(`report:${outputPath}`);

    report.issues.slice(0, 12).forEach((issue) => console.error(`issue:${issue}`));
    if (report.status !== 'PASS_MARKER_POLICY_AUDIT') {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferencePromotionReadiness = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SAJIK_DEFAULT_SEATMAP_SOURCE_ID, SAJIK_SEATMAP_SOURCE_REFERENCES } = await import("../src/data/sajikSeatData.ts");
  const { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET, SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES } = await import("../src/data/sajikOperatorReferenceSeatMapDataset.ts");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const topologyReportPath = path.join(reportDir, 'operator-reference-approved-topology-audit.json');
  const traceCoverageCloseoutPath = path.join(reportDir, 'operator-reference-trace-coverage-closeout.json');
  const outputPath = path.join(reportDir, 'operator-reference-promotion-readiness.json');

  const EXPECTED_SECTION_COUNT = 78;
  const EXPECTED_MARKER_COUNT = 14;
  const EXPECTED_TRACE_COVERAGE_REPORT_COUNT = 12;
  const EXPECTED_TRACE_COVERAGE_DECISIONS = {
    LOCK_CURRENT_TRACE: 71,
    LOCK_SIMPLIFIED_TRACE: 3,
    LOCK_CONTINUOUS_MARKER_SPLIT_TRACE: 4,
  };
  const EXPECTED_REFERENCE_ONLY_SECTION_IDS = ['322', '323', '921'];
  const EXPECTED_LINKED_SELECTABLE_MARKER_IDS = [
    'stage02-wheelchair-01',
    'stage02-wheelchair-03',
    'stage02-wheelchair-04',
    'stage02-wheelchair-09',
    'stage03-wheelchair-01',
    'stage03-wheelchair-02',
    'stage03-wheelchair-04',
    'stage03-wheelchair-05',
  ];

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  function sorted(values) {
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  function sameJson(first, second) {
    return JSON.stringify(first) === JSON.stringify(second);
  }

  async function main() {
    const issues = [];
    const topologyReport = await readJson(topologyReportPath);
    const traceCoverageCloseout = await readJson(traceCoverageCloseoutPath);
    const operatorReferenceSource = SAJIK_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'OPERATOR_REFERENCE_2026');
    const officialSource = SAJIK_SEATMAP_SOURCE_REFERENCES.find((source) => source.id === 'LOTTE_OFFICIAL_2026');
    const hitExpandedSections = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.filter((section) => section.visualPath !== section.hitPath);
    const hitExpansionSourceCounts = hitExpandedSections.reduce((acc, section) => {
      const source = section.hitPathExpansionSource ?? 'NONE';
      acc[source] = (acc[source] ?? 0) + 1;
      return acc;
    }, {});
    const referenceOnlySectionIds = sorted(SAJIK_OPERATOR_REFERENCE_SECTION_METADATA_OVERRIDES.map((override) => override.sectionId));
    const enabledMarkerIds = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers
      .filter((marker) => marker.enabled)
      .map((marker) => marker.markerId);
    const displayOnlyMarkerIds = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers
      .filter((marker) => marker.markerInteractionStatus === 'DISPLAY_ONLY')
      .map((marker) => marker.markerId);
    const linkedSelectableMarkerIds = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers
      .filter((marker) => marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE')
      .map((marker) => marker.markerId);

    if (!officialSource || officialSource.polygonStatus !== 'PRODUCTION_INTERACTIVE') {
      issues.push('OFFICIAL_PRODUCTION_SOURCE_MISSING');
    }
    if (SAJIK_DEFAULT_SEATMAP_SOURCE_ID !== 'OPERATOR_REFERENCE_2026') {
      issues.push(`DEFAULT_SOURCE_NOT_OPERATOR_REFERENCE:${SAJIK_DEFAULT_SEATMAP_SOURCE_ID}`);
    }
    if (!operatorReferenceSource) {
      issues.push('OPERATOR_REFERENCE_SOURCE_MISSING');
    } else {
      if (operatorReferenceSource.kind !== 'REFERENCE_IMAGE') {
        issues.push(`OPERATOR_REFERENCE_KIND_CHANGED:${operatorReferenceSource.kind}`);
      }
      if (operatorReferenceSource.assetStatus !== 'OPERATOR_REFERENCE') {
        issues.push(`OPERATOR_REFERENCE_ASSET_STATUS_CHANGED:${operatorReferenceSource.assetStatus}`);
      }
      if (operatorReferenceSource.polygonStatus !== 'PRODUCTION_INTERACTIVE') {
        issues.push(`OPERATOR_REFERENCE_POLYGON_STATUS_CHANGED:${operatorReferenceSource.polygonStatus}`);
      }
    }
    if (!SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.runtimeSelectionEnabled) {
      issues.push('OPERATOR_REFERENCE_RUNTIME_SELECTION_DISABLED');
    }
    if (SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections !== EXPECTED_SECTION_COUNT) {
      issues.push(`SECTION_COUNT_${SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections}_EXPECTED_${EXPECTED_SECTION_COUNT}`);
    }
    if (SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers !== EXPECTED_MARKER_COUNT) {
      issues.push(`MARKER_COUNT_${SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers}_EXPECTED_${EXPECTED_MARKER_COUNT}`);
    }
    if (traceCoverageCloseout.status !== 'PASS_TRACE_COVERAGE_CLOSEOUT') {
      issues.push(`TRACE_COVERAGE_STATUS_${traceCoverageCloseout.status}`);
    }
    if (traceCoverageCloseout.expectedSectionCount !== EXPECTED_SECTION_COUNT) {
      issues.push(`TRACE_COVERAGE_EXPECTED_${traceCoverageCloseout.expectedSectionCount}_EXPECTED_${EXPECTED_SECTION_COUNT}`);
    }
    if (traceCoverageCloseout.datasetSectionCount !== EXPECTED_SECTION_COUNT) {
      issues.push(`TRACE_COVERAGE_DATASET_${traceCoverageCloseout.datasetSectionCount}_EXPECTED_${EXPECTED_SECTION_COUNT}`);
    }
    if (traceCoverageCloseout.coveredSectionCount !== EXPECTED_SECTION_COUNT) {
      issues.push(`TRACE_COVERAGE_COVERED_${traceCoverageCloseout.coveredSectionCount}_EXPECTED_${EXPECTED_SECTION_COUNT}`);
    }
    if (traceCoverageCloseout.reviewReportCount !== EXPECTED_TRACE_COVERAGE_REPORT_COUNT) {
      issues.push(`TRACE_COVERAGE_REPORTS_${traceCoverageCloseout.reviewReportCount}_EXPECTED_${EXPECTED_TRACE_COVERAGE_REPORT_COUNT}`);
    }
    if ((traceCoverageCloseout.missingSectionIds ?? []).length > 0) {
      issues.push(`TRACE_COVERAGE_MISSING:${traceCoverageCloseout.missingSectionIds.join(',')}`);
    }
    if ((traceCoverageCloseout.duplicateSectionIds ?? []).length > 0) {
      issues.push(`TRACE_COVERAGE_DUPLICATE:${traceCoverageCloseout.duplicateSectionIds.join(',')}`);
    }
    if ((traceCoverageCloseout.unexpectedSectionIds ?? []).length > 0) {
      issues.push(`TRACE_COVERAGE_UNEXPECTED:${traceCoverageCloseout.unexpectedSectionIds.join(',')}`);
    }
    if ((traceCoverageCloseout.issues ?? []).length > 0) {
      issues.push(`TRACE_COVERAGE_ISSUES:${traceCoverageCloseout.issues.join(',')}`);
    }
    if (!sameJson(traceCoverageCloseout.decisions, EXPECTED_TRACE_COVERAGE_DECISIONS)) {
      issues.push(`TRACE_COVERAGE_DECISIONS_CHANGED:${JSON.stringify(traceCoverageCloseout.decisions)}`);
    }
    if (hitExpandedSections.length !== EXPECTED_SECTION_COUNT) {
      issues.push(`HIT_EXPANDED_${hitExpandedSections.length}_EXPECTED_${EXPECTED_SECTION_COUNT}`);
    }
    if (JSON.stringify(sorted(enabledMarkerIds)) !== JSON.stringify(EXPECTED_LINKED_SELECTABLE_MARKER_IDS)) {
      issues.push(`ENABLED_MARKER_IDS_CHANGED:${sorted(enabledMarkerIds).join(',')}`);
    }
    if (JSON.stringify(sorted(linkedSelectableMarkerIds)) !== JSON.stringify(EXPECTED_LINKED_SELECTABLE_MARKER_IDS)) {
      issues.push(`LINKED_SELECTABLE_MARKER_IDS_CHANGED:${sorted(linkedSelectableMarkerIds).join(',')}`);
    }
    if (displayOnlyMarkerIds.length !== EXPECTED_MARKER_COUNT - EXPECTED_LINKED_SELECTABLE_MARKER_IDS.length) {
      issues.push(`DISPLAY_ONLY_MARKER_COUNT_${displayOnlyMarkerIds.length}_EXPECTED_${EXPECTED_MARKER_COUNT - EXPECTED_LINKED_SELECTABLE_MARKER_IDS.length}`);
    }
    if (JSON.stringify(referenceOnlySectionIds) !== JSON.stringify(EXPECTED_REFERENCE_ONLY_SECTION_IDS)) {
      issues.push(`REFERENCE_ONLY_SECTION_IDS_CHANGED:${referenceOnlySectionIds.join(',')}`);
    }
    if (topologyReport.status !== 'PASS_APPROVED_TOPOLOGY_AUDIT') {
      issues.push(`TOPOLOGY_STATUS_${topologyReport.status}`);
    }
    if (topologyReport.hitExpandedSectionCount !== EXPECTED_SECTION_COUNT) {
      issues.push(`TOPOLOGY_HIT_EXPANDED_${topologyReport.hitExpandedSectionCount}_EXPECTED_${EXPECTED_SECTION_COUNT}`);
    }
    if (topologyReport.blockingOverlapCount !== 0 || topologyReport.blockingHitOverlapCount !== 0) {
      issues.push(`TOPOLOGY_BLOCKING_OVERLAP:visual=${topologyReport.blockingOverlapCount}:hit=${topologyReport.blockingHitOverlapCount}`);
    }
    if (
      topologyReport.sectionIssueCount !== 0
      || topologyReport.failedLabelOwnershipCount !== 0
      || topologyReport.failedHitLabelOwnershipCount !== 0
      || topologyReport.failedMarkerCoverageCount !== 0
    ) {
      issues.push('TOPOLOGY_OWNERSHIP_OR_MARKER_FAILURE');
    }

    const report = {
      contract: 'SAJIK_OPERATOR_REFERENCE_PRIMARY_SOURCE_READINESS_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: 'OPERATOR_REFERENCE_2026',
      secondarySourceId: 'LOTTE_OFFICIAL_2026',
      mapVersion: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.mapVersion,
      status: issues.length === 0 ? 'PASS_PRIMARY_SOURCE_READINESS' : 'FAIL_PRIMARY_SOURCE_READINESS',
      productionPromotionDecision: 'PRIMARY_SOURCE_ACTIVE',
      manualApprovalStatus: 'APPROVED_BY_OPERATOR_REQUEST',
      autoPromotionAllowed: false,
      technicalPreviewReady: issues.length === 0,
      defaultSourceId: SAJIK_DEFAULT_SEATMAP_SOURCE_ID,
      requiredManualDecisions: [
        'Decide whether the remaining 6 wheelchair image components stay display-only or become linked marker-layer UI.',
        'Decide whether reference-only sections 322, 323, and 921 become production metadata.',
        'Complete visual QA sign-off for operator reference highlight alignment on mobile and desktop.',
      ],
      sourceContract: {
        officialPolygonStatus: officialSource?.polygonStatus ?? null,
        operatorReferenceKind: operatorReferenceSource?.kind ?? null,
        operatorReferenceAssetStatus: operatorReferenceSource?.assetStatus ?? null,
        operatorReferencePolygonStatus: operatorReferenceSource?.polygonStatus ?? null,
        runtimeSelectionEnabled: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.runtimeSelectionEnabled,
      },
      counts: {
        sections: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.sections,
        markers: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.summary.markers,
        displayOnlyMarkers: displayOnlyMarkerIds.length,
        linkedSelectableMarkers: linkedSelectableMarkerIds.length,
        hitExpandedSections: hitExpandedSections.length,
        enabledMarkers: enabledMarkerIds.length,
        referenceOnlySections: referenceOnlySectionIds.length,
      },
      hitExpansionSourceCounts,
      referenceOnlySectionIds,
      enabledMarkerIds,
      linkedSelectableMarkerIds,
      traceCoverage: {
        status: traceCoverageCloseout.status,
        expectedSectionCount: traceCoverageCloseout.expectedSectionCount,
        datasetSectionCount: traceCoverageCloseout.datasetSectionCount,
        coveredSectionCount: traceCoverageCloseout.coveredSectionCount,
        reviewReportCount: traceCoverageCloseout.reviewReportCount,
        missingSectionCount: traceCoverageCloseout.missingSectionIds?.length ?? 0,
        duplicateSectionCount: traceCoverageCloseout.duplicateSectionIds?.length ?? 0,
        unexpectedSectionCount: traceCoverageCloseout.unexpectedSectionIds?.length ?? 0,
        issueCount: traceCoverageCloseout.issues?.length ?? 0,
        decisions: traceCoverageCloseout.decisions,
      },
      topology: {
        status: topologyReport.status,
        hitExpandedSectionCount: topologyReport.hitExpandedSectionCount,
        blockingOverlapCount: topologyReport.blockingOverlapCount,
        blockingHitOverlapCount: topologyReport.blockingHitOverlapCount,
        sectionIssueCount: topologyReport.sectionIssueCount,
        failedLabelOwnershipCount: topologyReport.failedLabelOwnershipCount,
        failedHitLabelOwnershipCount: topologyReport.failedHitLabelOwnershipCount,
        failedMarkerCoverageCount: topologyReport.failedMarkerCoverageCount,
      },
      issues,
    };

    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`status:${report.status}`);
    console.log(`productionPromotionDecision:${report.productionPromotionDecision}`);
    console.log(`autoPromotionAllowed:${report.autoPromotionAllowed}`);
    console.log(`sections:${report.counts.sections} hitExpanded:${report.counts.hitExpandedSections} markers:${report.counts.markers}`);
    console.log(`report:${outputPath}`);

    report.issues.slice(0, 12).forEach((issue) => console.error(`issue:${issue}`));
    if (report.status !== 'PASS_PRIMARY_SOURCE_READINESS') {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceScopeAudit = async () => {
  const { execFile } = await import("node:child_process");
  const { default: fs } = await import("node:fs/promises");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { promisify } = await import("node:util");

  const execFileAsync = promisify(execFile);

  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(scriptDir, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const jsonPath = path.join(reportDir, 'operator-reference-scope-audit.json');
  const markdownPath = path.join(reportDir, 'operator-reference-scope-audit.md');

  const CONTRACT = 'SAJIK_OPERATOR_REFERENCE_SCOPE_AUDIT_V1';
  const SOURCE_ID = 'OPERATOR_REFERENCE_2026';
  const SECONDARY_SOURCE_ID = 'LOTTE_OFFICIAL_2026';
  const MAP_VERSION = 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';

  const expectedIncludedFiles = [
    'src/assets/stadiums/lotte/README.md',
    'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png',
    'src/data/sajikOperatorReferenceSeatMapDataset.ts',
    'src/data/sajikSeatData.ts',
    'src/data/sajikSeatData.test.ts',
    'src/components/sajik/SajikSeatMap.tsx',
    'src/components/sajik/SajikSeatMapSvg.tsx',
    'src/components/sajik/SajikSeatMap.test.ts',    'docs/sajik-seatmap-release-lock.md',
    'docs/sajik-seatmap-pr-packaging-inventory.md',
  ];

  const partialHunkReviewFiles = [
    {
      file: 'package.json',
      reason: 'Package scripts are shared across stadium workstreams; stage only operator-reference script hunks.',
      includeOnly: [
        'stadium:sajik:operator-reference-*',
        'qa:stadium:sajik:operator-reference-approved',
        'qa:stadium:sajik:operator-reference-overlay',
        'qa:stadium:sajik:operator-reference-interactive-preview',
        'qa:stadium:sajik:operator-reference-release',
      ],
      exclude: [
        'stadium:sajik:stage01-*',
        'qa:stadium:sajik:polygon-v2',
        'stadium:daegu:*',
        'qa:stadium:daegu:*',
        'stadium:gwangju:*',
        'qa:stadium:gwangju:*',
        'non-stadium UI/build scripts',
      ],
    },
    {
      file: 'scripts/stadium-ux-audit.mjs',
      reason: 'Browser QA runner is shared; stage only operator-reference overlay and interactive-preview checks.',
      includeOnly: [
        'STADIUM_UX_SAJIK_OPERATOR_REFERENCE_DEBUG_CHECK',
        'STADIUM_UX_SAJIK_OPERATOR_REFERENCE_PREVIEW_CHECK',
        'operator reference source tab selection and marker/section checks',
      ],
      exclude: [
        'non-Sajik stadium QA flow changes',
        'general viewport/click heuristics unrelated to Sajik operator reference',
      ],
    },
    {
      file: 'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
      reason: 'Static seatmap tests are shared; stage only Sajik operator-reference source/default assertions if present.',
      includeOnly: [
        'OPERATOR_REFERENCE_2026 source/default assertions',
        'operator reference package script assertions',
        'operator reference release-lock assertions',
      ],
      exclude: [
        'Daegu/Gwangju/Suwon/Jamsil assertions',
        'common shell migration assertions unrelated to Sajik operator reference',
      ],
    },
  ];

  const buildSupportSeparateFiles = [
    'src/components/CoachBriefing.tsx',
    'src/components/CoachAnalysisDialogLauncher.tsx',
    'src/components/CoachBriefingContentRuntime.tsx',
    'src/components/CoachBriefingContentCardRuntime.tsx',
  ];

  const generatedPrefixes = [
    'dist/',
    'reports/',
    'coverage/',
    'output/',
  ];

  const separatePrefixes = [
    '.claude/',
    'cypress/',
    'docs/',
    'scripts/',
    'src/api/',
    'src/components/',
    'src/data/',
    'src/hooks/',
    'src/seo/',
    'src/shims/',
    'src/types/',
    'src/utils/',
  ];

  // Temporary gwangju probe/audit scripts are excluded as one-off artifacts and cleaned by frontend tmp cleanup.
  const separateExactFiles = [
    'src/index.css',
    'src/data/sajikSeatMapDataset.ts',
  ];

  const forbiddenCommands = [
    'git add .',
    'git add package.json',
    'git add reports dist output',
  ];

  const verificationAfterStaging = [
    'npm run stadium:sajik:operator-reference-scope-audit',
    'npm run qa:stadium:sajik:operator-reference-approved',
    'npm run qa:stadium:sajik:operator-reference-interactive-preview',
    'node --import tsx --test src/data/sajikSeatData.test.ts',
    'node --import tsx --test src/components/sajik/SajikSeatMap.test.ts',
    'git diff --check',
    'npm run build',
  ];

  function normalizePath(filePath) {
    return filePath.replaceAll('\\', '/');
  }

  function parseStatusLine(line) {
    const status = line.slice(0, 2);
    let filePath = line.slice(3).trim();
    if (filePath.includes(' -> ')) {
      filePath = filePath.split(' -> ').at(-1);
    }
    return {
      status,
      file: normalizePath(filePath),
    };
  }

  function sortByFile(first, second) {
    return first.file.localeCompare(second.file);
  }

  function startsWithAny(file, prefixes) {
    return prefixes.some((prefix) => file.startsWith(prefix));
  }

  function isGeneratedFile(file) {
    return startsWithAny(file, generatedPrefixes);
  }

  function isSeparateDirtyWork(file, expectedSet, partialSet, buildSupportSet) {
    if (expectedSet.has(file) || partialSet.has(file) || buildSupportSet.has(file) || isGeneratedFile(file)) {
      return false;
    }
    if (separateExactFiles.includes(file)) {
      return true;
    }
    if (file.startsWith('docs/')) {
      return true;
    }
    if (file.startsWith('scripts/')) {
      return true;
    }
    if (file.startsWith('src/components/sajik/')) {
      return false;
    }
    if (file.startsWith('src/data/sajik')) {
      return false;
    }
    return startsWithAny(file, separatePrefixes);
  }

  async function pathExists(relativePath) {
    try {
      await fs.access(path.join(frontendRoot, relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async function readPackageScripts() {
    const packageJson = JSON.parse(await fs.readFile(path.join(frontendRoot, 'package.json'), 'utf8'));
    return packageJson.scripts ?? {};
  }

  function checkPackageScripts(packageScripts) {
    const checks = [
      [
        'stadium:sajik:operator-reference-scope-audit',
        (value) => value === 'node scripts/sajik-seatmap-operator-reference.mjs operator-reference-scope-audit',
      ],
      [
        'qa:stadium:sajik:operator-reference-approved',
        (value) => /operator-reference-trace-coverage-closeout/.test(value ?? '') && /operator-reference-promotion-readiness/.test(value ?? ''),
      ],
      [
        'qa:stadium:sajik:operator-reference-release',
        (value) => /operator-reference-scope-audit/.test(value ?? '')
          && /operator-reference-approved/.test(value ?? '')
          && /operator-reference-interactive-preview/.test(value ?? ''),
      ],
    ];

    return checks
      .map(([scriptName, predicate]) => {
        const value = packageScripts[scriptName];
        return {
          scriptName,
          present: typeof value === 'string',
          value: value ?? null,
          passed: typeof value === 'string' && predicate(value),
        };
      });
  }

  async function main() {
    const expectedSet = new Set(expectedIncludedFiles);
    const partialSet = new Set(partialHunkReviewFiles.map((entry) => entry.file));
    const buildSupportSet = new Set(buildSupportSeparateFiles);
    const { stdout } = await execFileAsync('git', ['status', '--short', '--untracked-files=all'], { cwd: frontendRoot });
    const dirtyFiles = stdout
      .split('\n')
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .map(parseStatusLine)
      .sort(sortByFile);

    const classified = {
      includedFiles: [],
      partialHunkFiles: [],
      generatedFiles: [],
      buildSupportSeparateFiles: [],
      separateDirtyWorkFiles: [],
      unexpectedDirtyFiles: [],
    };

    dirtyFiles.forEach((entry) => {
      if (expectedSet.has(entry.file)) {
        classified.includedFiles.push(entry);
        return;
      }
      if (partialSet.has(entry.file)) {
        classified.partialHunkFiles.push(entry);
        return;
      }
      if (isGeneratedFile(entry.file)) {
        classified.generatedFiles.push(entry);
        return;
      }
      if (buildSupportSet.has(entry.file)) {
        classified.buildSupportSeparateFiles.push(entry);
        return;
      }
      if (isSeparateDirtyWork(entry.file, expectedSet, partialSet, buildSupportSet)) {
        classified.separateDirtyWorkFiles.push(entry);
        return;
      }
      classified.unexpectedDirtyFiles.push(entry);
    });

    const expectedFileChecks = await Promise.all(expectedIncludedFiles.map(async (file) => ({
      file,
      exists: await pathExists(file),
      dirty: classified.includedFiles.some((entry) => entry.file === file),
    })));
    const missingExpectedIncludedFiles = expectedFileChecks
      .filter((entry) => !entry.exists)
      .map((entry) => entry.file);
    const packageScriptChecks = checkPackageScripts(await readPackageScripts());
    const failedPackageScriptChecks = packageScriptChecks
      .filter((entry) => !entry.passed)
      .map((entry) => entry.scriptName);

    const issues = [
      ...classified.unexpectedDirtyFiles.map((entry) => `UNEXPECTED_DIRTY_FILE:${entry.file}`),
      ...missingExpectedIncludedFiles.map((file) => `MISSING_EXPECTED_INCLUDED_FILE:${file}`),
      ...failedPackageScriptChecks.map((scriptName) => `PACKAGE_SCRIPT_CONTRACT_FAILED:${scriptName}`),
    ];

    const report = {
      contract: CONTRACT,
      status: issues.length === 0 ? 'PASS_OPERATOR_REFERENCE_SCOPE_AUDIT' : 'BLOCKED_OPERATOR_REFERENCE_SCOPE_AUDIT',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: SOURCE_ID,
      secondarySourceId: SECONDARY_SOURCE_ID,
      mapVersion: MAP_VERSION,
      doesNotRunGitAdd: true,
      safeToRunBulkGitAdd: false,
      requiresManualHunkReview: true,
      primaryPayloadCoordinateSystem: {
        width: 1151,
        height: 1367,
        viewBox: '0 0 1151 1367',
      },
      expectedIncludedFiles,
      partialHunkReviewFiles,
      buildSupportSeparateFiles,
      expectedFileChecks,
      packageScriptChecks,
      dirty: classified,
      counts: {
        totalDirtyFiles: dirtyFiles.length,
        includedFiles: classified.includedFiles.length,
        partialHunkFiles: classified.partialHunkFiles.length,
        generatedFiles: classified.generatedFiles.length,
        buildSupportSeparateFiles: classified.buildSupportSeparateFiles.length,
        separateDirtyWorkFiles: classified.separateDirtyWorkFiles.length,
        unexpectedDirtyFiles: classified.unexpectedDirtyFiles.length,
        missingExpectedIncludedFiles: missingExpectedIncludedFiles.length,
        failedPackageScriptChecks: failedPackageScriptChecks.length,
      },
      stagingGuidance: {
        forbiddenCommands,
        includeWholeFiles: expectedIncludedFiles,
        includePartialHunksOnly: partialHunkReviewFiles,
        excludeGeneratedPrefixes: generatedPrefixes,
        excludeSeparateDirtyWork: true,
        verificationAfterStaging,
      },
      issues,
    };

    const markdown = [
      '# Sajik Operator Reference Scope Audit',
      '',
      `- contract: \`${report.contract}\``,
      `- status: \`${report.status}\``,
      `- sourceId: \`${report.sourceId}\``,
      `- mapVersion: \`${report.mapVersion}\``,
      `- safeToRunBulkGitAdd: \`${report.safeToRunBulkGitAdd}\``,
      `- doesNotRunGitAdd: \`${report.doesNotRunGitAdd}\``,
      '',
      '## Counts',
      '',
      `- total dirty files: ${report.counts.totalDirtyFiles}`,
      `- operator reference included files: ${report.counts.includedFiles}`,
      `- partial hunk review files: ${report.counts.partialHunkFiles}`,
      `- generated files: ${report.counts.generatedFiles}`,
      `- build support separate files: ${report.counts.buildSupportSeparateFiles}`,
      `- separate dirty work files: ${report.counts.separateDirtyWorkFiles}`,
      `- unexpected dirty files: ${report.counts.unexpectedDirtyFiles}`,
      `- missing expected included files: ${report.counts.missingExpectedIncludedFiles}`,
      `- failed package script checks: ${report.counts.failedPackageScriptChecks}`,
      '',
      '## Operator Reference Included Files',
      '',
      ...expectedIncludedFiles.map((file) => `- \`${file}\``),
      '',
      '## Partial Hunk Review Files',
      '',
      ...partialHunkReviewFiles.map((entry) => `- \`${entry.file}\`: ${entry.reason}`),
      '',
      '## Generated Files',
      '',
      ...classified.generatedFiles.slice(0, 80).map((entry) => `- \`${entry.status} ${entry.file}\``),
      classified.generatedFiles.length > 80 ? `- ... ${classified.generatedFiles.length - 80} more` : '',
      '',
      '## Separate Dirty Work',
      '',
      ...classified.separateDirtyWorkFiles.slice(0, 120).map((entry) => `- \`${entry.status} ${entry.file}\``),
      classified.separateDirtyWorkFiles.length > 120 ? `- ... ${classified.separateDirtyWorkFiles.length - 120} more` : '',
      '',
      '## Unexpected Dirty Files',
      '',
      ...(classified.unexpectedDirtyFiles.length > 0
        ? classified.unexpectedDirtyFiles.map((entry) => `- \`${entry.status} ${entry.file}\``)
        : ['- none']),
      '',
      '## Staging Guidance',
      '',
      '- Do not run bulk staging commands.',
      ...forbiddenCommands.map((command) => `- Forbidden: \`${command}\``),
      '- Stage `package.json`, `scripts/stadium-ux-audit.mjs`, and `src/components/StadiumGuideRuntimeSeatMaps.test.ts` by reviewed hunk only.',
      '- Exclude `reports/`, `dist/`, and `output/` artifacts from staging unless a release process explicitly requests evidence files.',
      '',
      '## Verification After Staging',
      '',
      ...verificationAfterStaging.map((command) => `- \`${command}\``),
      '',
    ].filter((line) => line !== '').join('\n');

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(markdownPath, `${markdown}\n`);

    console.log(`Sajik operator reference scope audit: ${report.status}`);
    console.log(`Report: ${path.relative(frontendRoot, jsonPath)}`);
    console.log(`unexpected=${report.counts.unexpectedDirtyFiles} generated=${report.counts.generatedFiles} separate=${report.counts.separateDirtyWorkFiles}`);

    if (issues.length > 0) {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceTargetTraceReview = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");
  const { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET, validateSajikOperatorReferenceSeatMapDataset } = await import("../src/data/sajikOperatorReferenceSeatMapDataset.ts");
  const { pathBounds, pathToPoints, pointInPolygon, polygonArea, validateSeatMapPolygonPathIssues } = await import("../src/utils/seatMapPolygonValidator.ts");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportRoot = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const imagePath = path.join(frontendRoot, SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.path);

  const CONTRACT = 'SAJIK_OPERATOR_REFERENCE_TARGET_TRACE_REVIEW_V1';
  const STAGE_REVIEW_CONFIGS = {
    'stage01-pink-inner': {
      stageLabel: 'stage01 pink-inner',
      title: 'Sajik Operator Reference Stage01 Pink Inner Trace Review',
      candidatesFile: 'stage01-lower-central-candidates.json',
      outputDirName: 'stage01-pink-inner-trace-review',
      reportFile: 'operator-reference-stage01-pink-inner-trace-review.json',
      markdownFile: 'operator-reference-stage01-pink-inner-trace-review.md',
      targetSectionIds: ['021', '022', '023', '024', '031', '032', '033', '034', '041', '044'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: ['041', '044'],
    },
    'stage01-red-lower': {
      stageLabel: 'stage01 red-lower',
      title: 'Sajik Operator Reference Stage01 Red Lower Trace Review',
      candidatesFile: 'stage01-lower-central-candidates.json',
      outputDirName: 'stage01-red-lower-trace-review',
      reportFile: 'operator-reference-stage01-red-lower-trace-review.json',
      markdownFile: 'operator-reference-stage01-red-lower-trace-review.md',
      targetSectionIds: ['051', '052', '053', '054', '055', '056', '057'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
    stage02: {
      stageLabel: 'stage02',
      title: 'Sajik Operator Reference Target Trace Review',
      candidatesFile: 'stage02-first-base-candidates.json',
      outputDirName: 'target-trace-review',
      reportFile: 'operator-reference-target-trace-review.json',
      markdownFile: 'operator-reference-target-trace-review.md',
      targetSectionIds: ['127', '133', '143', '132', '142'],
      continuousMarkerSplitSectionIds: ['127'],
    },
    stage03: {
      stageLabel: 'stage03',
      title: 'Sajik Operator Reference Stage03 Target Trace Review',
      candidatesFile: 'stage03-third-base-candidates.json',
      outputDirName: 'stage03-target-trace-review',
      reportFile: 'operator-reference-stage03-target-trace-review.json',
      markdownFile: 'operator-reference-stage03-target-trace-review.md',
      targetSectionIds: ['325', '335', '324', '333', '323'],
      continuousMarkerSplitSectionIds: ['324'],
      simplifiedTraceSectionIds: [],
    },
    'stage03-lower-outer': {
      stageLabel: 'stage03 lower-outer',
      title: 'Sajik Operator Reference Stage03 Lower Outer Trace Review',
      candidatesFile: 'stage03-third-base-candidates.json',
      outputDirName: 'stage03-lower-outer-trace-review',
      reportFile: 'operator-reference-stage03-lower-outer-trace-review.json',
      markdownFile: 'operator-reference-stage03-lower-outer-trace-review.md',
      targetSectionIds: ['314', '334', '343', '322', '321', '331', '342'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
    'stage03-upper-outer': {
      stageLabel: 'stage03 upper-outer',
      title: 'Sajik Operator Reference Stage03 Upper Outer Trace Review',
      candidatesFile: 'stage03-third-base-candidates.json',
      outputDirName: 'stage03-upper-outer-trace-review',
      reportFile: 'operator-reference-stage03-upper-outer-trace-review.json',
      markdownFile: 'operator-reference-stage03-upper-outer-trace-review.md',
      targetSectionIds: ['734', '724', '733', '723', '732', '722', '721', '338', '337', '327'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
    'stage03-middle-inner': {
      stageLabel: 'stage03 middle-inner',
      title: 'Sajik Operator Reference Stage03 Middle Inner Trace Review',
      candidatesFile: 'stage03-third-base-candidates.json',
      outputDirName: 'stage03-middle-inner-trace-review',
      reportFile: 'operator-reference-stage03-middle-inner-trace-review.json',
      markdownFile: 'operator-reference-stage03-middle-inner-trace-review.md',
      targetSectionIds: ['316', '326', '336', '315', '313', '312', '311'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
    'stage03-closeout': {
      stageLabel: 'stage03 closeout',
      title: 'Sajik Operator Reference Stage03 Closeout Trace Review',
      candidatesFile: 'stage03-third-base-candidates.json',
      outputDirName: 'stage03-closeout-trace-review',
      reportFile: 'operator-reference-stage03-closeout-trace-review.json',
      markdownFile: 'operator-reference-stage03-closeout-trace-review.md',
      targetSectionIds: ['332'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
    stage04: {
      stageLabel: 'stage04',
      title: 'Sajik Operator Reference Stage04 Right Outfield Trace Review',
      candidatesFile: 'stage04-right-outfield-candidates.json',
      outputDirName: 'stage04-right-outfield-trace-review',
      reportFile: 'operator-reference-stage04-right-outfield-trace-review.json',
      markdownFile: 'operator-reference-stage04-right-outfield-trace-review.md',
      targetSectionIds: ['925', '934', '924', '933', '923', '932', '922', '931', '921'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: ['923'],
    },
    'stage02-marker-adjacent': {
      stageLabel: 'stage02 marker-adjacent',
      title: 'Sajik Operator Reference Stage02 Marker Adjacent Trace Review',
      candidatesFile: 'stage02-first-base-candidates.json',
      outputDirName: 'stage02-marker-adjacent-trace-review',
      reportFile: 'operator-reference-stage02-marker-adjacent-trace-review.json',
      markdownFile: 'operator-reference-stage02-marker-adjacent-trace-review.md',
      targetSectionIds: ['137', '125', '135', '124', '123', '122'],
      continuousMarkerSplitSectionIds: ['123', '122'],
      simplifiedTraceSectionIds: [],
    },
    'stage02-middle': {
      stageLabel: 'stage02 middle',
      title: 'Sajik Operator Reference Stage02 Middle Trace Review',
      candidatesFile: 'stage02-first-base-candidates.json',
      outputDirName: 'stage02-middle-trace-review',
      reportFile: 'operator-reference-stage02-middle-trace-review.json',
      markdownFile: 'operator-reference-stage02-middle-trace-review.md',
      targetSectionIds: ['116', '126', '136', '115', '114', '134'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
    'stage02-yellow-lower': {
      stageLabel: 'stage02 yellow-lower',
      title: 'Sajik Operator Reference Stage02 Yellow Lower Trace Review',
      candidatesFile: 'stage02-first-base-candidates.json',
      outputDirName: 'stage02-yellow-lower-trace-review',
      reportFile: 'operator-reference-stage02-yellow-lower-trace-review.json',
      markdownFile: 'operator-reference-stage02-yellow-lower-trace-review.md',
      targetSectionIds: ['113', '112', '111', '121', '131'],
      continuousMarkerSplitSectionIds: [],
      simplifiedTraceSectionIds: [],
    },
  };
  const selectedStageId = process.argv.includes('--stage')
    ? process.argv[process.argv.indexOf('--stage') + 1]
    : 'stage02';
  const stageConfig = STAGE_REVIEW_CONFIGS[selectedStageId];
  if (!stageConfig) {
    throw new Error(`Unknown Sajik operator reference target trace review stage: ${selectedStageId}`);
  }
  const candidatesPath = path.join(reportRoot, stageConfig.candidatesFile);
  const outputDir = path.join(reportRoot, stageConfig.outputDirName);
  const reportPath = path.join(reportRoot, stageConfig.reportFile);
  const markdownPath = path.join(reportRoot, stageConfig.markdownFile);
  const TARGET_SECTION_IDS = stageConfig.targetSectionIds;
  const CONTINUOUS_MARKER_SPLIT_SECTION_IDS = new Set(stageConfig.continuousMarkerSplitSectionIds);
  const SIMPLIFIED_TRACE_SECTION_IDS = new Set(stageConfig.simplifiedTraceSectionIds ?? []);
  const MAX_NORMAL_AREA_DELTA_PX2 = 0.5;
  const MAX_NORMAL_BOUNDS_DELTA_PX = 0.5;
  const MAX_POINT_COUNT = 8;
  const MIN_SEAT_COLOR_RATIO = 0.58;
  const MAX_BACKGROUND_OR_LINE_RATIO = 0.32;

  function round(value, digits = 2) {
    return Number(value.toFixed(digits));
  }

  function sorted(values) {
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  function escapeXml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function escapeMarkdown(value) {
    return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  }

  function relativePath(filePath) {
    return path.relative(frontendRoot, filePath).split(path.sep).join('/');
  }

  function markdownRelativePath(frontendRelativePath) {
    return path.relative(
      path.dirname(markdownPath),
      path.resolve(frontendRoot, frontendRelativePath),
    ).split(path.sep).join('/');
  }

  function expandBounds(bounds, padding = 64) {
    const image = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image;
    const left = Math.max(0, Math.floor(bounds.minX - padding));
    const top = Math.max(0, Math.floor(bounds.minY - padding));
    const right = Math.min(image.width, Math.ceil(bounds.maxX + padding));
    const bottom = Math.min(image.height, Math.ceil(bounds.maxY + padding));
    return {
      left,
      top,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    };
  }

  function mergeBounds(boundsList) {
    return boundsList.reduce((acc, bounds) => ({
      minX: Math.min(acc.minX, bounds.minX),
      minY: Math.min(acc.minY, bounds.minY),
      maxX: Math.max(acc.maxX, bounds.maxX),
      maxY: Math.max(acc.maxY, bounds.maxY),
    }), {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    });
  }

  function rgbStats(red, green, blue) {
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = max / 255;
    return { max, min, saturation, brightness };
  }

  function isSeatColor(red, green, blue) {
    const { max, min, saturation, brightness } = rgbStats(red, green, blue);
    return saturation >= 0.13 && brightness >= 0.25 && max >= 85 && (max - min) >= 25;
  }

  function isBackgroundOrLine(red, green, blue) {
    const { saturation, brightness } = rgbStats(red, green, blue);
    return (saturation <= 0.12 && brightness >= 0.78) || brightness <= 0.20;
  }

  function scorePath(pathData, raw, channels) {
    const points = pathToPoints(pathData);
    const bounds = pathBounds(pathData);
    const startX = Math.max(0, Math.floor(bounds.minX));
    const endX = Math.min(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width - 1, Math.ceil(bounds.maxX));
    const startY = Math.max(0, Math.floor(bounds.minY));
    const endY = Math.min(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height - 1, Math.ceil(bounds.maxY));
    let insidePixels = 0;
    let seatColorPixels = 0;
    let backgroundOrLinePixels = 0;

    for (let y = startY; y <= endY; y += 1) {
      for (let x = startX; x <= endX; x += 1) {
        if (!pointInPolygon([x + 0.5, y + 0.5], points)) continue;
        insidePixels += 1;
        const index = (y * SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width + x) * channels;
        const red = raw[index];
        const green = raw[index + 1];
        const blue = raw[index + 2];
        if (isSeatColor(red, green, blue)) seatColorPixels += 1;
        if (isBackgroundOrLine(red, green, blue)) backgroundOrLinePixels += 1;
      }
    }

    const seatColorRatio = insidePixels > 0 ? seatColorPixels / insidePixels : 0;
    const backgroundOrLineRatio = insidePixels > 0 ? backgroundOrLinePixels / insidePixels : 1;
    return {
      insidePixels,
      seatColorPixels,
      backgroundOrLinePixels,
      seatColorRatio: round(seatColorRatio, 4),
      backgroundOrLineRatio: round(backgroundOrLineRatio, 4),
    };
  }

  function boundsDelta(currentBounds, candidateBounds) {
    return {
      minX: round(Math.abs(currentBounds.minX - candidateBounds.minX), 2),
      minY: round(Math.abs(currentBounds.minY - candidateBounds.minY), 2),
      maxX: round(Math.abs(currentBounds.maxX - candidateBounds.maxX), 2),
      maxY: round(Math.abs(currentBounds.maxY - candidateBounds.maxY), 2),
    };
  }

  function maxBoundsDelta(delta) {
    return Math.max(delta.minX, delta.minY, delta.maxX, delta.maxY);
  }

  function pathDataEqual(first, second) {
    return first.trim().replaceAll(/\s+/g, ' ') === second.trim().replaceAll(/\s+/g, ' ');
  }

  function relatedMarkers(sectionId) {
    return SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.markers
      .filter((marker) => marker.relatedSectionId === sectionId)
      .map((marker) => ({
        markerId: marker.markerId,
        position: marker.position,
        markerInteractionStatus: marker.markerInteractionStatus,
        enabled: marker.enabled,
      }));
  }

  function decisionFor({ section, candidate, currentArea, candidateArea, currentBounds, candidateBounds, currentScore }) {
    const delta = boundsDelta(currentBounds, candidateBounds);
    const areaDeltaPx2 = round(Math.abs(currentArea - candidateArea), 2);
    const isExactCandidateLock = pathDataEqual(section.visualPath, candidate.visualPath)
      && areaDeltaPx2 <= MAX_NORMAL_AREA_DELTA_PX2
      && maxBoundsDelta(delta) <= MAX_NORMAL_BOUNDS_DELTA_PX;

    if (isExactCandidateLock) {
      return {
        operatorDecision: 'LOCK_CURRENT_TRACE',
        reason: `current visualPath matches the fresh ${stageConfig.stageLabel} image-analysis candidate`,
      };
    }

    if (CONTINUOUS_MARKER_SPLIT_SECTION_IDS.has(section.sectionId)) {
      return {
        operatorDecision: 'LOCK_CONTINUOUS_MARKER_SPLIT_TRACE',
        reason: 'fresh color component follows wheelchair icon cutout, but marker is separated into marker layer so the seat polygon intentionally stays continuous',
      };
    }

    if (
      SIMPLIFIED_TRACE_SECTION_IDS.has(section.sectionId)
      && currentScore.seatColorRatio >= MIN_SEAT_COLOR_RATIO
      && currentScore.backgroundOrLineRatio <= MAX_BACKGROUND_OR_LINE_RATIO
    ) {
      return {
        operatorDecision: 'LOCK_SIMPLIFIED_TRACE',
        reason: `current visualPath intentionally simplifies the fresh ${stageConfig.stageLabel} candidate while passing pixel coverage thresholds`,
      };
    }

    if (currentScore.seatColorRatio < MIN_SEAT_COLOR_RATIO || currentScore.backgroundOrLineRatio > MAX_BACKGROUND_OR_LINE_RATIO) {
      return {
        operatorDecision: 'NEEDS_COORDINATE_PATCH',
        reason: `current polygon pixel score is below threshold: seat=${currentScore.seatColorRatio}, background=${currentScore.backgroundOrLineRatio}`,
      };
    }

    return {
      operatorDecision: 'NEEDS_COORDINATE_PATCH',
      reason: `current visualPath differs from image-analysis candidate: areaDelta=${areaDeltaPx2}px2, maxBoundsDelta=${maxBoundsDelta(delta)}px`,
    };
  }

  function svgPathOverlay({ sectionId, currentPath, candidatePath, crop, relatedMarkers, backgroundDataUri }) {
    const markerElements = relatedMarkers.map((marker) => {
      const [x, y] = marker.position;
      const linked = marker.markerInteractionStatus === 'LINKED_SECTION_SELECTABLE';
      return `
        <circle cx="${x}" cy="${y}" r="26" fill="${linked ? '#16A34A' : '#64748B'}" fill-opacity="0.08" stroke="${linked ? '#16A34A' : '#64748B'}" stroke-width="2" stroke-dasharray="8 5" />
        <circle cx="${x}" cy="${y}" r="14" fill="#D9E021" fill-opacity="0.7" stroke="#FFFFFF" stroke-width="5" />
        <text x="${x + 18}" y="${y - 18}" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#111827">${escapeXml(marker.markerId)}</text>
      `;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${crop.width * 2}" height="${crop.height * 2}" viewBox="0 0 ${crop.width} ${crop.height}">
    <defs>
      <filter id="label-shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-color="#FFFFFF" flood-opacity="0.9"/>
      </filter>
    </defs>
    <image href="${escapeXml(backgroundDataUri)}" x="0" y="0" width="${crop.width}" height="${crop.height}" />
    <rect x="0" y="0" width="${crop.width}" height="${crop.height}" fill="none" stroke="#111827" stroke-width="1" stroke-opacity="0.4" />
    <g transform="translate(${-crop.left} ${-crop.top})">
      <path d="${escapeXml(candidatePath)}" fill="#EC4899" fill-opacity="0.12" stroke="#EC4899" stroke-width="4" stroke-linejoin="round" />
      <path d="${escapeXml(currentPath)}" fill="#22D3EE" fill-opacity="0.12" stroke="#0891B2" stroke-width="4" stroke-linejoin="round" />
      ${markerElements}
    </g>
    <text x="16" y="28" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#111827" filter="url(#label-shadow)">
      ${escapeXml(sectionId)} current(cyan) vs candidate(pink)
    </text>
  </svg>
  `;
  }

  async function writeEvidenceImage(review) {
    const backgroundBuffer = await sharp(imagePath)
      .extract(review.crop)
      .png()
      .toBuffer();
    const svg = svgPathOverlay({
      ...review,
      backgroundDataUri: `data:image/png;base64,${backgroundBuffer.toString('base64')}`,
    });
    const svgPath = path.join(outputDir, `${review.order}-${review.sectionId}.svg`);
    const pngPath = path.join(outputDir, `${review.order}-${review.sectionId}.png`);
    await fs.writeFile(svgPath, svg);
    await sharp(Buffer.from(svg)).png().toFile(pngPath);
    return {
      svgPath: relativePath(svgPath),
      pngPath: relativePath(pngPath),
    };
  }

  function markdownFor(report) {
    const rows = report.reviews.map((review) => (
      `| ${review.sectionId} | ${review.operatorDecision} | ${review.current.pointCount} | ${review.candidate.pointCount} | ${review.areaDeltaPx2} | ${review.maxBoundsDeltaPx} | ${review.current.pixelScore.seatColorRatio} | ${review.current.pixelScore.backgroundOrLineRatio} | ${escapeMarkdown(review.reason)} | ![](${markdownRelativePath(review.evidence.pngPath)}) |`
    ));

    return [
      `# ${stageConfig.title}`,
      '',
      `- contract: \`${report.contract}\``,
      `- stage: \`${report.stageId}\``,
      `- status: \`${report.status}\``,
      `- targets: \`${report.targetSectionIds.join(', ')}\``,
      `- patch blockers: \`${report.needsCoordinatePatchCount}\``,
      '',
      '| section | decision | current points | candidate points | area delta | max bbox delta | seat ratio | bg/line ratio | reason | evidence |',
      '| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |',
      ...rows,
      '',
      `Legend: cyan is the current production operator-reference polygon; pink is the fresh ${stageConfig.stageLabel} image-analysis candidate.`,
      '',
    ].join('\n');
  }

  async function main() {
    const datasetIssues = validateSajikOperatorReferenceSeatMapDataset(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET);
    const candidatesReport = JSON.parse(await fs.readFile(candidatesPath, 'utf8'));
    const { data, info } = await sharp(imagePath).raw().toBuffer({ resolveWithObject: true });
    const issues = [...datasetIssues.map((issue) => `DATASET:${issue}`)];

    const candidateReportReady = Array.isArray(candidatesReport.missingTargets)
      && candidatesReport.missingTargets.length === 0
      && Array.isArray(candidatesReport.candidates)
      && TARGET_SECTION_IDS.every((sectionId) => (
        candidatesReport.candidates.some((candidate) => (
          candidate.sectionId === sectionId
          && candidate.candidateValidationStatus === 'READY_FOR_OPERATOR_REVIEW'
        ))
      ));
    if (!candidateReportReady) {
      issues.push('CANDIDATE_REPORT_NOT_READY');
    }

    await fs.mkdir(outputDir, { recursive: true });

    const reviews = [];
    for (const [index, sectionId] of TARGET_SECTION_IDS.entries()) {
      const section = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.find((candidateSection) => candidateSection.sectionId === sectionId);
      const candidate = candidatesReport.candidates.find((candidateSection) => candidateSection.sectionId === sectionId);
      if (!section || !candidate) {
        issues.push(`TARGET_MISSING:${sectionId}`);
        continue;
      }

      const currentPoints = pathToPoints(section.visualPath);
      const candidatePoints = pathToPoints(candidate.visualPath);
      const currentArea = polygonArea(currentPoints);
      const candidateArea = polygonArea(candidatePoints);
      const currentBounds = pathBounds(section.visualPath);
      const candidateBounds = pathBounds(candidate.visualPath);
      const delta = boundsDelta(currentBounds, candidateBounds);
      const currentScore = scorePath(section.visualPath, data, info.channels);
      const candidateScore = scorePath(candidate.visualPath, data, info.channels);
      const markers = relatedMarkers(sectionId);
      const { operatorDecision, reason } = decisionFor({
        section,
        candidate,
        currentArea,
        candidateArea,
        currentBounds,
        candidateBounds,
        currentScore,
      });

      const currentValidationIssues = validateSeatMapPolygonPathIssues({
        pathData: section.visualPath,
        width: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width,
        height: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height,
        labelPoint: [...section.labelPoint],
        labelTolerance: 1.5,
        sectionId,
        pathKind: 'visualPath',
      });
      const candidateValidationIssues = validateSeatMapPolygonPathIssues({
        pathData: candidate.visualPath,
        width: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.width,
        height: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.image.height,
        labelPoint: candidate.labelPoint,
        labelTolerance: 1.5,
        sectionId,
        pathKind: 'candidatePath',
      });

      if (currentPoints.length > MAX_POINT_COUNT) {
        issues.push(`CURRENT_POINT_COUNT:${sectionId}:${currentPoints.length}`);
      }
      if (currentValidationIssues.length > 0) {
        issues.push(`CURRENT_VALIDATION:${sectionId}:${currentValidationIssues.map((issue) => issue.code).join(',')}`);
      }
      if (candidateValidationIssues.length > 0) {
        issues.push(`CANDIDATE_VALIDATION:${sectionId}:${candidateValidationIssues.map((issue) => issue.code).join(',')}`);
      }
      if (operatorDecision === 'NEEDS_COORDINATE_PATCH') {
        issues.push(`NEEDS_COORDINATE_PATCH:${sectionId}`);
      }

      const crop = expandBounds(mergeBounds([currentBounds, candidateBounds]));
      const review = {
        order: String(index + 1).padStart(2, '0'),
        sectionId,
        stageId: section.stageId,
        operatorDecision,
        reason,
        currentPath: section.visualPath,
        candidatePath: candidate.visualPath,
        current: {
          pointCount: currentPoints.length,
          areaPx2: round(currentArea, 2),
          bounds: currentBounds,
          pixelScore: currentScore,
        },
        candidate: {
          pointCount: candidatePoints.length,
          areaPx2: round(candidateArea, 2),
          bounds: candidateBounds,
          pixelScore: candidateScore,
        },
        areaDeltaPx2: round(Math.abs(currentArea - candidateArea), 2),
        boundsDeltaPx: delta,
        maxBoundsDeltaPx: round(maxBoundsDelta(delta), 2),
        relatedMarkers: markers,
        crop,
        issues: [
          ...currentValidationIssues.map((issue) => `CURRENT_${issue.code}`),
          ...candidateValidationIssues.map((issue) => `CANDIDATE_${issue.code}`),
        ],
      };
      review.evidence = await writeEvidenceImage(review);
      reviews.push(review);
    }

    const decisions = reviews.reduce((acc, review) => {
      acc[review.operatorDecision] = (acc[review.operatorDecision] ?? 0) + 1;
      return acc;
    }, {});
    const needsCoordinatePatchCount = reviews.filter((review) => review.operatorDecision === 'NEEDS_COORDINATE_PATCH').length;
    const report = {
      contract: CONTRACT,
      stadiumId: 'BUSAN_SAJIK',
      sourceId: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sourceId,
      mapVersion: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.mapVersion,
      stageId: selectedStageId,
      title: stageConfig.title,
      status: issues.length === 0 ? 'PASS_TARGET_TRACE_REVIEW' : 'FAIL_TARGET_TRACE_REVIEW',
      targetSectionIds: TARGET_SECTION_IDS,
      continuousMarkerSplitSectionIds: sorted(CONTINUOUS_MARKER_SPLIT_SECTION_IDS),
      simplifiedTraceSectionIds: sorted(SIMPLIFIED_TRACE_SECTION_IDS),
      thresholds: {
        maxNormalAreaDeltaPx2: MAX_NORMAL_AREA_DELTA_PX2,
        maxNormalBoundsDeltaPx: MAX_NORMAL_BOUNDS_DELTA_PX,
        maxPointCount: MAX_POINT_COUNT,
        minSeatColorRatio: MIN_SEAT_COLOR_RATIO,
        maxBackgroundOrLineRatio: MAX_BACKGROUND_OR_LINE_RATIO,
      },
      decisions,
      needsCoordinatePatchCount,
      reviews,
      issues,
    };

    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(markdownPath, markdownFor(report));

    console.log(`status:${report.status}`);
    console.log(`targets:${reviews.length} decisions:${Object.entries(decisions).map(([key, value]) => `${key}=${value}`).join(',')}`);
    console.log(`patchBlockers:${needsCoordinatePatchCount}`);
    console.log(`report:${reportPath}`);
    console.log(`markdown:${markdownPath}`);
    report.issues.slice(0, 12).forEach((issue) => console.error(`issue:${issue}`));

    if (report.status !== 'PASS_TARGET_TRACE_REVIEW') {
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceTraceCandidates = async () => {
  const { createHash } = await import("node:crypto");
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { default: sharp } = await import("sharp");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');

  const IMAGE_RELATIVE_PATH = 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png';
  const IMAGE_PATH = path.join(frontendRoot, IMAGE_RELATIVE_PATH);
  const OUTPUT_DIR = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const EXPECTED_SHA256 = '794d957510240c786f4fce821814afbf01cc1f93fe7ec3ecca23846a8d753f6f';
  const EXPECTED_WIDTH = 1151;
  const EXPECTED_HEIGHT = 1367;
  const VIEW_BOX = `0 0 ${EXPECTED_WIDTH} ${EXPECTED_HEIGHT}`;
  const MAP_VERSION = 'BUSAN_SAJIK_2026_OPERATOR_REFERENCE_POLYGON_V1';

  const STAGE01_TARGETS = [
    { sectionId: '024', seedPoint: [432, 1080], group: 'inner-top' },
    { sectionId: '023', seedPoint: [530, 1103], group: 'inner-top' },
    { sectionId: '022', seedPoint: [637, 1103], group: 'inner-top' },
    { sectionId: '021', seedPoint: [734, 1078], group: 'inner-top' },
    { sectionId: '044', seedPoint: [313, 1139], group: 'inner-bottom' },
    { sectionId: '034', seedPoint: [418, 1138], group: 'inner-bottom' },
    { sectionId: '033', seedPoint: [526, 1162], group: 'inner-bottom' },
    { sectionId: '032', seedPoint: [643, 1162], group: 'inner-bottom' },
    { sectionId: '031', seedPoint: [750, 1137], group: 'inner-bottom' },
    { sectionId: '041', seedPoint: [856, 1137], group: 'inner-bottom' },
    { sectionId: '057', seedPoint: [309, 1203], group: 'outer-red' },
    { sectionId: '056', seedPoint: [425, 1257], group: 'outer-red' },
    { sectionId: '055', seedPoint: [519, 1281], group: 'outer-red' },
    { sectionId: '054', seedPoint: [586, 1286], group: 'outer-red' },
    { sectionId: '053', seedPoint: [654, 1281], group: 'outer-red' },
    { sectionId: '052', seedPoint: [747, 1256], group: 'outer-red' },
    { sectionId: '051', seedPoint: [861, 1200], group: 'outer-red' },
  ];

  const STAGE02_TARGETS = [
    { sectionId: '127', seedPoint: [1030, 491], group: 'top-marker-adjacent' },
    { sectionId: '137', seedPoint: [1088, 494], group: 'top-marker-adjacent' },
    { sectionId: '116', seedPoint: [977, 600], group: 'upper-inner' },
    { sectionId: '126', seedPoint: [1040, 601], group: 'upper-middle' },
    { sectionId: '136', seedPoint: [1098, 602], group: 'upper-outer' },
    { sectionId: '115', seedPoint: [954, 690], group: 'middle-inner' },
    { sectionId: '125', seedPoint: [1029, 712], group: 'middle-marker-adjacent' },
    { sectionId: '135', seedPoint: [1094, 715], group: 'middle-outer' },
    { sectionId: '114', seedPoint: [933, 768], group: 'middle-inner' },
    { sectionId: '124', seedPoint: [1001, 811], group: 'middle-marker-adjacent' },
    { sectionId: '134', seedPoint: [1065, 832], group: 'middle-outer' },
    { sectionId: '113', seedPoint: [892, 845], group: 'lower-inner' },
    { sectionId: '123', seedPoint: [966, 886], group: 'lower-middle' },
    { sectionId: '133', seedPoint: [999, 932], group: 'lower-marker-adjacent' },
    { sectionId: '143', seedPoint: [1041, 959], group: 'lower-outer' },
    { sectionId: '112', seedPoint: [844, 909], group: 'lower-inner' },
    { sectionId: '122', seedPoint: [904, 967], group: 'lower-marker-adjacent' },
    { sectionId: '132', seedPoint: [930, 1020], group: 'lower-marker-adjacent' },
    { sectionId: '111', seedPoint: [796, 963], group: 'lower-inner' },
    { sectionId: '121', seedPoint: [822, 1035], group: 'yellow-lower' },
    { sectionId: '131', seedPoint: [847, 1088], group: 'yellow-lower' },
    { sectionId: '142', seedPoint: [968, 1078], group: 'lower-outer' },
  ];

  const STAGE03_TARGETS = [
    { sectionId: '734', seedPoint: [361, 98], group: 'upper-outfield' },
    { sectionId: '724', seedPoint: [406, 145], group: 'upper-outfield' },
    { sectionId: '733', seedPoint: [248, 175], group: 'upper-outfield' },
    { sectionId: '723', seedPoint: [284, 222], group: 'upper-outfield' },
    { sectionId: '732', seedPoint: [153, 279], group: 'upper-outfield' },
    { sectionId: '722', seedPoint: [198, 314], group: 'upper-outfield' },
    { sectionId: '338', seedPoint: [97, 380], group: 'upper-purple' },
    { sectionId: '721', seedPoint: [148, 405], group: 'upper-outfield' },
    { sectionId: '337', seedPoint: [64, 490], group: 'upper-purple' },
    { sectionId: '327', seedPoint: [120, 503], group: 'upper-purple' },
    { sectionId: '316', seedPoint: [175, 602], group: 'upper-inner' },
    { sectionId: '326', seedPoint: [112, 604], group: 'upper-middle' },
    { sectionId: '336', seedPoint: [52, 604], group: 'upper-outer' },
    { sectionId: '315', seedPoint: [201, 692], group: 'middle-inner' },
    { sectionId: '325', seedPoint: [126, 717], group: 'middle-marker-adjacent' },
    { sectionId: '335', seedPoint: [59, 718], group: 'middle-marker-adjacent' },
    { sectionId: '314', seedPoint: [225, 770], group: 'middle-inner' },
    { sectionId: '324', seedPoint: [156, 813], group: 'middle-marker-adjacent' },
    { sectionId: '334', seedPoint: [92, 835], group: 'middle-outer' },
    { sectionId: '313', seedPoint: [269, 846], group: 'lower-inner' },
    { sectionId: '323', seedPoint: [197, 890], group: 'lower-marker-adjacent' },
    { sectionId: '312', seedPoint: [317, 910], group: 'lower-inner' },
    { sectionId: '333', seedPoint: [162, 935], group: 'lower-marker-adjacent' },
    { sectionId: '343', seedPoint: [120, 962], group: 'lower-outer' },
    { sectionId: '322', seedPoint: [265, 974], group: 'lower-middle' },
    { sectionId: '311', seedPoint: [367, 964], group: 'lower-inner' },
    { sectionId: '332', seedPoint: [229, 1018], group: 'lower-middle' },
    { sectionId: '321', seedPoint: [343, 1037], group: 'lower-inner' },
    { sectionId: '342', seedPoint: [197, 1081], group: 'lower-outer' },
    { sectionId: '331', seedPoint: [319, 1090], group: 'lower-middle' },
  ];

  const STAGE04_TARGETS = [
    { sectionId: '925', seedPoint: [716, 134], group: 'right-upper-outfield' },
    { sectionId: '934', seedPoint: [832, 123], group: 'right-upper-outfield' },
    { sectionId: '924', seedPoint: [804, 176], group: 'right-upper-outfield' },
    { sectionId: '933', seedPoint: [919, 192], group: 'right-upper-outfield' },
    { sectionId: '923', seedPoint: [882, 236], group: 'right-small-pink' },
    { sectionId: '932', seedPoint: [992, 278], group: 'right-upper-outfield' },
    { sectionId: '922', seedPoint: [949, 312], group: 'right-lower-outfield' },
    { sectionId: '931', seedPoint: [1050, 378], group: 'right-lower-outfield' },
    { sectionId: '921', seedPoint: [1000, 403], group: 'right-lower-outfield' },
  ];

  const STAGE_CONFIGS = {
    stage01: {
      outputPrefix: 'stage01-lower-central',
      groupCropPrefix: 'stage01',
      approvalTemplateFile: 'stage01-approval-template.json',
      stageId: 'stage01-lower-central-small-blocks',
      stageDescription: 'Image-analysis candidates for lower central small blocks on the operator reference Sajik seat map.',
      targets: STAGE01_TARGETS,
      crop: { id: 'all-stage01', left: 190, top: 1010, width: 780, height: 350 },
      groupCrops: [
        { id: 'inner-top', left: 360, top: 1005, width: 450, height: 150 },
        { id: 'inner-bottom', left: 205, top: 1060, width: 760, height: 190 },
        { id: 'outer-red', left: 220, top: 1130, width: 730, height: 230 },
      ],
      matchMaxDistancePx: 58,
      minComponentArea: 1200,
      simplifyEpsilonPx: 2.8,
      mask: {
        saturationMin: 0.22,
        brightnessMin: 0.25,
        brightnessMax: 0.98,
        maxChannelMin: 55,
      },
    },
    stage02: {
      outputPrefix: 'stage02-first-base',
      groupCropPrefix: 'stage02',
      approvalTemplateFile: 'stage02-approval-template.json',
      stageId: 'stage02-first-base-sections',
      stageDescription: 'Image-analysis candidates for first-base side sections on the operator reference Sajik seat map.',
      targets: STAGE02_TARGETS,
      crop: { id: 'all-stage02', left: 700, top: 400, width: 440, height: 850 },
      groupCrops: [
        { id: 'top-marker-adjacent', left: 930, top: 420, width: 210, height: 160 },
        { id: 'upper-middle', left: 880, top: 520, width: 260, height: 250 },
        { id: 'middle-marker-adjacent', left: 820, top: 660, width: 320, height: 290 },
        { id: 'lower-marker-adjacent', left: 750, top: 840, width: 360, height: 280 },
        { id: 'yellow-lower', left: 710, top: 950, width: 260, height: 240 },
        { id: 'lower-outer', left: 880, top: 900, width: 230, height: 310 },
      ],
      matchMaxDistancePx: 74,
      minComponentArea: 900,
      simplifyEpsilonPx: 2.8,
      mask: {
        saturationMin: 0.22,
        brightnessMin: 0.25,
        brightnessMax: 1,
        maxChannelMin: 55,
      },
    },
    stage03: {
      outputPrefix: 'stage03-third-base',
      groupCropPrefix: 'stage03',
      approvalTemplateFile: 'stage03-approval-template.json',
      stageId: 'stage03-third-base-sections',
      stageDescription: 'Image-analysis candidates for third-base side and upper outfield sections on the operator reference Sajik seat map.',
      targets: STAGE03_TARGETS,
      crop: { id: 'all-stage03', left: 0, top: 0, width: 500, height: 1280 },
      groupCrops: [
        { id: 'upper-outfield', left: 0, top: 0, width: 470, height: 570 },
        { id: 'upper-purple', left: 0, top: 300, width: 270, height: 330 },
        { id: 'middle-marker-adjacent', left: 0, top: 620, width: 340, height: 310 },
        { id: 'lower-marker-adjacent', left: 70, top: 820, width: 330, height: 260 },
        { id: 'lower-inner', left: 180, top: 760, width: 250, height: 360 },
        { id: 'lower-outer', left: 0, top: 880, width: 310, height: 360 },
      ],
      matchMaxDistancePx: 74,
      minComponentArea: 900,
      simplifyEpsilonPx: 2.8,
      mask: {
        saturationMin: 0.12,
        brightnessMin: 0.25,
        brightnessMax: 1,
        maxChannelMin: 55,
      },
    },
    stage04: {
      outputPrefix: 'stage04-right-outfield',
      groupCropPrefix: 'stage04',
      approvalTemplateFile: 'stage04-approval-template.json',
      stageId: 'stage04-right-outfield-sections',
      stageDescription: 'Image-analysis candidates for right-side upper outfield sections on the operator reference Sajik seat map.',
      targets: STAGE04_TARGETS,
      crop: { id: 'all-stage04', left: 650, top: 0, width: 501, height: 570 },
      groupCrops: [
        { id: 'right-upper-outfield', left: 650, top: 40, width: 380, height: 260 },
        { id: 'right-small-pink', left: 810, top: 190, width: 160, height: 160 },
        { id: 'right-lower-outfield', left: 900, top: 250, width: 240, height: 250 },
      ],
      matchMaxDistancePx: 74,
      minComponentArea: 900,
      simplifyEpsilonPx: 2.8,
      mask: {
        saturationMin: 0.22,
        brightnessMin: 0.25,
        brightnessMax: 1,
        maxChannelMin: 55,
      },
    },
  };

  const argValue = (name, fallback) => {
    const index = process.argv.indexOf(name);
    if (index === -1 || !process.argv[index + 1]) return fallback;
    return process.argv[index + 1];
  };

  const SELECTED_STAGE_ID = argValue('--stage', 'stage01');
  const STAGE = STAGE_CONFIGS[SELECTED_STAGE_ID];
  if (!STAGE) {
    throw new Error(`Unknown stage: ${SELECTED_STAGE_ID}`);
  }

  const MIN_POLYGON_AREA_PX2 = 16;
  const TEMPLATE_CONTRACT = 'SAJIK_OPERATOR_REFERENCE_STAGE01_APPROVAL_TEMPLATE_V1';

  function colorMask(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    const brightness = max / 255;

    return saturation > STAGE.mask.saturationMin
      && brightness > STAGE.mask.brightnessMin
      && brightness <= STAGE.mask.brightnessMax
      && max > STAGE.mask.maxChannelMin;
  }

  function pointKey(x, y) {
    return `${x},${y}`;
  }

  function parsePointKey(key) {
    const [x, y] = key.split(',').map(Number);
    return [x, y];
  }

  function distance(left, right) {
    return Math.hypot(left[0] - right[0], left[1] - right[1]);
  }

  function polygonArea(points) {
    let area = 0;
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      area += current[0] * next[1] - next[0] * current[1];
    }
    return area / 2;
  }

  function boundsForPoints(points) {
    return {
      minX: Math.min(...points.map(([x]) => x)),
      minY: Math.min(...points.map(([, y]) => y)),
      maxX: Math.max(...points.map(([x]) => x)),
      maxY: Math.max(...points.map(([, y]) => y)),
    };
  }

  function pathCommands(pathData) {
    return String(pathData ?? '').match(/[AaCcHhLlMmQqSsTtVvZz]/g) ?? [];
  }

  function pathPoints(pathData) {
    const numbers = String(pathData ?? '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
    const points = [];
    for (let index = 0; index < numbers.length - 1; index += 2) {
      points.push([numbers[index], numbers[index + 1]]);
    }
    return points;
  }

  function distanceToSegment(point, start, end) {
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
  }

  function pointOnPolygonBoundary(point, polygon, tolerance = 1) {
    for (let index = 0; index < polygon.length; index += 1) {
      const start = polygon[index];
      const end = polygon[(index + 1) % polygon.length];
      if (distanceToSegment(point, start, end) <= tolerance) return true;
    }
    return false;
  }

  function pointInPolygon(point, polygon) {
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
  }

  function orientation(a, b, c) {
    const value = ((b[1] - a[1]) * (c[0] - b[0])) - ((b[0] - a[0]) * (c[1] - b[1]));
    if (Math.abs(value) < 1e-9) return 0;
    return value > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return b[0] <= Math.max(a[0], c[0])
      && b[0] >= Math.min(a[0], c[0])
      && b[1] <= Math.max(a[1], c[1])
      && b[1] >= Math.min(a[1], c[1]);
  }

  function segmentsIntersect(a, b, c, d) {
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
  }

  function selfIntersectionCount(points) {
    let count = 0;
    for (let first = 0; first < points.length; first += 1) {
      const firstNext = (first + 1) % points.length;
      for (let second = first + 1; second < points.length; second += 1) {
        const secondNext = (second + 1) % points.length;
        const adjacent = first === second
          || firstNext === second
          || secondNext === first;
        if (adjacent) continue;
        if (first === 0 && secondNext === 0) continue;
        if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) {
          count += 1;
        }
      }
    }
    return count;
  }

  function validatePolygonCandidate(candidate) {
    const issues = [];
    const commands = pathCommands(candidate.visualPath);
    const points = pathPoints(candidate.visualPath);

    if (!candidate.visualPath) issues.push('MISSING_VISUAL_PATH');
    if (!candidate.hitPath) issues.push('MISSING_HIT_PATH');
    if (!commands.length || commands[0].toUpperCase() !== 'M') issues.push('PATH_MUST_START_WITH_M');
    if (commands.filter((command) => command.toUpperCase() === 'M').length !== 1) issues.push('PATH_MUST_HAVE_SINGLE_SUBPATH');
    if (commands[commands.length - 1]?.toUpperCase() !== 'Z') issues.push('PATH_MUST_CLOSE_WITH_Z');
    if (commands.some((command) => !['M', 'L', 'Z'].includes(command.toUpperCase()))) issues.push('PATH_MUST_USE_POLYGON_COMMANDS_ONLY');
    if (points.length < 4) issues.push('POLYGON_REQUIRES_AT_LEAST_4_POINTS');

    if (points.length >= 3) {
      const bounds = boundsForPoints(points);
      if (bounds.minX < 0 || bounds.minY < 0 || bounds.maxX > EXPECTED_WIDTH || bounds.maxY > EXPECTED_HEIGHT) {
        issues.push('POLYGON_OUT_OF_BOUNDS');
      }

      if (Math.abs(polygonArea(points)) < MIN_POLYGON_AREA_PX2) {
        issues.push('POLYGON_AREA_TOO_SMALL');
      }

      if (selfIntersectionCount(points) > 0) {
        issues.push('POLYGON_SELF_INTERSECTION');
      }

      if (!Array.isArray(candidate.labelPoint) || candidate.labelPoint.length !== 2 || !pointInPolygon(candidate.labelPoint, points)) {
        issues.push('LABEL_POINT_OUTSIDE_POLYGON');
      }
    }

    return {
      status: issues.length === 0 ? 'READY_FOR_OPERATOR_REVIEW' : 'NEEDS_OPERATOR_FIX',
      issues,
    };
  }

  function perpendicularDistance(point, start, end) {
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    if (dx === 0 && dy === 0) return distance(point, start);
    return Math.abs(dy * point[0] - dx * point[1] + end[0] * start[1] - end[1] * start[0]) / Math.hypot(dx, dy);
  }

  function rdp(points, epsilon) {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let index = 1; index < points.length - 1; index += 1) {
      const candidateDistance = perpendicularDistance(points[index], start, end);
      if (candidateDistance > maxDistance) {
        maxDistance = candidateDistance;
        maxIndex = index;
      }
    }

    if (maxDistance <= epsilon) {
      return [start, end];
    }

    const left = rdp(points.slice(0, maxIndex + 1), epsilon);
    const right = rdp(points.slice(maxIndex), epsilon);
    return left.slice(0, -1).concat(right);
  }

  function removeCollinear(points) {
    if (points.length <= 3) return points;

    const cleaned = [];
    for (let index = 0; index < points.length; index += 1) {
      const previous = points[(index - 1 + points.length) % points.length];
      const current = points[index];
      const next = points[(index + 1) % points.length];
      const cross = (current[0] - previous[0]) * (next[1] - current[1]) - (current[1] - previous[1]) * (next[0] - current[0]);
      if (cross !== 0) cleaned.push(current);
    }
    return cleaned;
  }

  function simplifyClosedPolygon(points, epsilon) {
    const withoutDuplicateClose = points.length > 1 && points[0][0] === points[points.length - 1][0] && points[0][1] === points[points.length - 1][1]
      ? points.slice(0, -1)
      : points;
    const cleaned = removeCollinear(withoutDuplicateClose);
    if (cleaned.length <= 8) return cleaned;

    let startIndex = 0;
    for (let index = 1; index < cleaned.length; index += 1) {
      const current = cleaned[index];
      const start = cleaned[startIndex];
      if (current[1] < start[1] || (current[1] === start[1] && current[0] < start[0])) {
        startIndex = index;
      }
    }

    let farIndex = startIndex;
    let farDistance = -1;
    for (let index = 0; index < cleaned.length; index += 1) {
      const candidateDistance = distance(cleaned[startIndex], cleaned[index]);
      if (candidateDistance > farDistance) {
        farDistance = candidateDistance;
        farIndex = index;
      }
    }

    const chainForward = [];
    for (let index = startIndex; index !== farIndex; index = (index + 1) % cleaned.length) {
      chainForward.push(cleaned[index]);
    }
    chainForward.push(cleaned[farIndex]);

    const chainBackward = [];
    for (let index = farIndex; index !== startIndex; index = (index + 1) % cleaned.length) {
      chainBackward.push(cleaned[index]);
    }
    chainBackward.push(cleaned[startIndex]);

    const simplified = rdp(chainForward, epsilon).slice(0, -1).concat(rdp(chainBackward, epsilon).slice(0, -1));
    return removeCollinear(simplified);
  }

  function pathFromPoints(points) {
    const [first, ...rest] = points;
    return `M ${first[0]} ${first[1]} ${rest.map(([x, y]) => `L ${x} ${y}`).join(' ')} Z`;
  }

  function formatPathPretty(pathData) {
    if (!pathData) return null;
    return String(pathData)
      .replace(/\s+/g, ' ')
      .replace(/^M /, 'M ')
      .replace(/ L /g, '\n  L ')
      .replace(/ Z$/, '\nZ');
  }

  function overlayCropPathForGroup(group) {
    return `reports/stadium/sajik-operator-reference-trace/${STAGE.groupCropPrefix}-${group}-overlay-crop.png`;
  }

  function addEdge(edgeMap, start, end) {
    const key = pointKey(start[0], start[1]);
    const list = edgeMap.get(key) ?? [];
    list.push(end);
    edgeMap.set(key, list);
  }

  function popFirstEdge(edgeMap) {
    for (const [key, list] of edgeMap.entries()) {
      const end = list.pop();
      if (list.length === 0) edgeMap.delete(key);
      return { start: parsePointKey(key), end };
    }
    return null;
  }

  function traceComponentLoops(component, idMap, width, height) {
    const edgeMap = new Map();
    const isPixel = (x, y) => x >= 0 && y >= 0 && x < width && y < height && idMap[y * width + x] === component.id;

    for (let y = component.minY; y <= component.maxY; y += 1) {
      for (let x = component.minX; x <= component.maxX; x += 1) {
        if (!isPixel(x, y)) continue;
        if (!isPixel(x, y - 1)) addEdge(edgeMap, [x, y], [x + 1, y]);
        if (!isPixel(x + 1, y)) addEdge(edgeMap, [x + 1, y], [x + 1, y + 1]);
        if (!isPixel(x, y + 1)) addEdge(edgeMap, [x + 1, y + 1], [x, y + 1]);
        if (!isPixel(x - 1, y)) addEdge(edgeMap, [x, y + 1], [x, y]);
      }
    }

    const loops = [];
    while (edgeMap.size > 0) {
      const first = popFirstEdge(edgeMap);
      if (!first) break;

      const loop = [first.start, first.end];
      let current = first.end;
      let guard = 0;

      while (guard < 50000) {
        guard += 1;
        const key = pointKey(current[0], current[1]);
        const candidates = edgeMap.get(key);
        if (!candidates || candidates.length === 0) break;
        const next = candidates.pop();
        if (candidates.length === 0) edgeMap.delete(key);
        loop.push(next);
        current = next;
        if (current[0] === loop[0][0] && current[1] === loop[0][1]) break;
      }

      if (loop.length >= 4) {
        loops.push(loop);
      }
    }

    return loops;
  }

  function candidateFromComponent(target, component, idMap, width, height) {
    const loops = traceComponentLoops(component, idMap, width, height)
      .map((loop) => simplifyClosedPolygon(loop, STAGE.simplifyEpsilonPx))
      .filter((loop) => loop.length >= 4)
      .sort((left, right) => Math.abs(polygonArea(right)) - Math.abs(polygonArea(left)));
    const polygon = loops[0];
    const area = polygon ? Math.abs(polygonArea(polygon)) : 0;

    const candidate = {
      sectionId: target.sectionId,
      group: target.group,
      seedPoint: target.seedPoint,
      component: {
        id: component.id,
        areaPixels: component.area,
        centroid: [Number(component.cx.toFixed(1)), Number(component.cy.toFixed(1))],
        bounds: {
          minX: component.minX,
          minY: component.minY,
          maxX: component.maxX,
          maxY: component.maxY,
        },
        seedDistancePx: Number(distance(target.seedPoint, [component.cx, component.cy]).toFixed(2)),
      },
      visualPath: polygon ? pathFromPoints(polygon) : null,
      hitPath: polygon ? pathFromPoints(polygon) : null,
      labelPoint: [Math.round(component.cx), Math.round(component.cy)],
      polygonPointCount: polygon?.length ?? 0,
      polygonAreaPx2: Number(area.toFixed(1)),
      traceStatus: 'IMAGE_ANALYSIS_CANDIDATE',
      operatorDecision: 'PENDING_REVIEW',
    };
    const validation = validatePolygonCandidate(candidate);
    return {
      ...candidate,
      candidateValidationStatus: validation.status,
      candidateValidationIssues: validation.issues,
    };
  }

  function buildMask(raw, width, height, channels) {
    const mask = new Uint8Array(width * height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * channels;
        if (colorMask(raw[index], raw[index + 1], raw[index + 2])) {
          mask[y * width + x] = 1;
        }
      }
    }

    return mask;
  }

  function findComponents(mask, width, height) {
    const seen = new Uint8Array(width * height);
    const idMap = new Int32Array(width * height);
    idMap.fill(-1);

    const queueX = new Int32Array(width * height);
    const queueY = new Int32Array(width * height);
    const components = [];
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    let componentId = 0;

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const startIndex = y * width + x;
        if (!mask[startIndex] || seen[startIndex]) continue;

        let head = 0;
        let tail = 0;
        let area = 0;
        let minX = x;
        let maxX = x;
        let minY = y;
        let maxY = y;
        let sumX = 0;
        let sumY = 0;

        seen[startIndex] = 1;
        idMap[startIndex] = componentId;
        queueX[tail] = x;
        queueY[tail] = y;
        tail += 1;

        while (head < tail) {
          const currentX = queueX[head];
          const currentY = queueY[head];
          head += 1;
          area += 1;
          sumX += currentX;
          sumY += currentY;
          minX = Math.min(minX, currentX);
          maxX = Math.max(maxX, currentX);
          minY = Math.min(minY, currentY);
          maxY = Math.max(maxY, currentY);

          for (const [dx, dy] of directions) {
            const nextX = currentX + dx;
            const nextY = currentY + dy;
            if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
            const nextIndex = nextY * width + nextX;
            if (!mask[nextIndex] || seen[nextIndex]) continue;
            seen[nextIndex] = 1;
            idMap[nextIndex] = componentId;
            queueX[tail] = nextX;
            queueY[tail] = nextY;
            tail += 1;
          }
        }

        components.push({
          id: componentId,
          area,
          minX,
          minY,
          maxX,
          maxY,
          cx: sumX / area,
          cy: sumY / area,
        });
        componentId += 1;
      }
    }

    return { components, idMap };
  }

  function matchTargets(components) {
    const usableComponents = components.filter((component) => component.area >= STAGE.minComponentArea);
    const assignedComponentIds = new Set();
    const candidates = [];
    const missingTargets = [];

    for (const target of STAGE.targets) {
      const match = usableComponents
        .filter((component) => !assignedComponentIds.has(component.id))
        .map((component) => ({
          component,
          distancePx: distance(target.seedPoint, [component.cx, component.cy]),
        }))
        .filter(({ distancePx }) => distancePx <= STAGE.matchMaxDistancePx)
        .sort((left, right) => left.distancePx - right.distancePx)[0];

      if (!match) {
        missingTargets.push(target);
        continue;
      }

      assignedComponentIds.add(match.component.id);
      candidates.push({ target, component: match.component });
    }

    return { candidates, missingTargets, usableComponentCount: usableComponents.length };
  }

  function colorForGroup(group) {
    if (group === 'outer-red') return '#dc2626';
    if (group.includes('purple')) return '#9333ea';
    if (group.includes('outfield')) return '#84cc16';
    if (group.includes('pink')) return '#ec4899';
    if (group === 'inner-bottom') return '#ec4899';
    if (group.includes('marker-adjacent')) return '#ec4899';
    if (group.includes('yellow')) return '#f59e0b';
    if (group.includes('outer')) return '#2563eb';
    if (group.includes('middle')) return '#0ea5e9';
    if (group.includes('inner')) return '#06b6d4';
    return '#f472b6';
  }

  function markerCandidatesForStage(components) {
    if (!['stage02', 'stage03'].includes(SELECTED_STAGE_ID)) return [];

    return components
      .filter((component) => {
        const width = component.maxX - component.minX;
        const height = component.maxY - component.minY;
        const inStageCrop = component.cx >= STAGE.crop.left
          && component.cx <= STAGE.crop.left + STAGE.crop.width
          && component.cy >= STAGE.crop.top
          && component.cy <= STAGE.crop.top + STAGE.crop.height;
        return inStageCrop
          && component.area >= 450
          && component.area <= 750
          && width >= 20
          && width <= 34
          && height >= 20
          && height <= 34;
      })
      .sort((left, right) => left.cy - right.cy || left.cx - right.cx)
      .map((component, index) => ({
        markerId: `${SELECTED_STAGE_ID}-wheelchair-${String(index + 1).padStart(2, '0')}`,
        markerType: 'WHEELCHAIR',
        source: 'IMAGE_ANALYSIS_COMPONENT',
        position: [Math.round(component.cx), Math.round(component.cy)],
        bounds: {
          minX: component.minX,
          minY: component.minY,
          maxX: component.maxX,
          maxY: component.maxY,
        },
        componentAreaPx: component.area,
        note: 'Marker candidate is recorded separately and is not copied into seat polygon geometry.',
      }));
  }

  function buildOverlaySvg(imageDataUrl, candidates) {
    const paths = candidates.map((candidate) => {
      const color = candidate.candidateValidationStatus === 'READY_FOR_OPERATOR_REVIEW'
        ? colorForGroup(candidate.group)
        : '#f97316';
      const [labelX, labelY] = candidate.labelPoint;
      return [
        `<path d="${candidate.visualPath}" fill="${color}" fill-opacity="0.18" stroke="${color}" stroke-width="4" vector-effect="non-scaling-stroke" />`,
        `<circle cx="${labelX}" cy="${labelY}" r="10" fill="#ffffff" stroke="${color}" stroke-width="3" />`,
        `<text x="${labelX}" y="${labelY + 4}" text-anchor="middle" font-size="18" font-weight="900" fill="#111827">${candidate.sectionId}</text>`,
      ].join('\n');
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="${EXPECTED_WIDTH}" height="${EXPECTED_HEIGHT}" viewBox="${VIEW_BOX}">
    <image href="${imageDataUrl}" width="${EXPECTED_WIDTH}" height="${EXPECTED_HEIGHT}" preserveAspectRatio="none" />
    <rect x="0" y="0" width="${EXPECTED_WIDTH}" height="${EXPECTED_HEIGHT}" fill="none" stroke="#111827" stroke-width="2" />
    ${paths}
  </svg>
  `;
  }

  function buildApprovalTemplate(report) {
    return {
      contract: TEMPLATE_CONTRACT,
      stadiumId: report.stadiumId,
      sourceId: report.sourceId,
      mapVersion: report.mapVersion,
      image: report.image,
      stage: {
        ...report.stage,
        status: 'PENDING_OPERATOR_APPROVAL',
      },
      sourcePolicy: {
        sourceStatus: 'OPERATOR_REFERENCE',
        runtimeEnabledBeforeApproval: false,
        copiedExternalPolygonDataAllowed: false,
        note: 'Fill correctedPath/correctedLabelPoint only after visual operator review of the generated overlay artifacts.',
      },
      markerCandidates: report.markerCandidates ?? [],
      approvalInstructions: [
        'Open candidateOverlayCropPath and candidateAllOverlayCropPath before approving a row.',
        'Set operatorDecision to APPROVED only after the visual boundary and label point are checked against the operator reference image.',
        'Use correctedPath/correctedHitPath/correctedLabelPoint for approved production geometry; candidatePath is a draft only.',
      ],
      rows: report.candidates.map((candidate) => ({
        sectionId: candidate.sectionId,
        group: candidate.group,
        candidatePath: candidate.visualPath,
        candidatePathPretty: formatPathPretty(candidate.visualPath),
        candidateHitPath: candidate.hitPath,
        candidateLabelPoint: candidate.labelPoint,
        candidateBounds: candidate.component.bounds,
        candidatePointCount: candidate.polygonPointCount,
        candidateAreaPx2: candidate.polygonAreaPx2,
        candidateOverlayCropPath: overlayCropPathForGroup(candidate.group),
        candidateAllOverlayCropPath: `reports/stadium/sajik-operator-reference-trace/${STAGE.outputPrefix}-overlay-crop.png`,
        candidateValidationStatus: candidate.candidateValidationStatus,
        candidateValidationIssues: candidate.candidateValidationIssues,
        operatorDecision: 'PENDING_REVIEW',
        correctedPath: null,
        correctedHitPath: null,
        correctedLabelPoint: null,
        reviewer: null,
        reviewedAt: null,
        operatorNotes: null,
      })),
    };
  }

  async function main() {
    const imageBuffer = await fs.readFile(IMAGE_PATH);
    const sha256 = createHash('sha256').update(imageBuffer).digest('hex');
    if (sha256 !== EXPECTED_SHA256) {
      throw new Error(`Unexpected operator reference image hash: ${sha256}`);
    }

    const { data, info } = await sharp(imageBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== EXPECTED_WIDTH || info.height !== EXPECTED_HEIGHT) {
      throw new Error(`Unexpected operator reference size: ${info.width}x${info.height}`);
    }

    const mask = buildMask(data, info.width, info.height, info.channels);
    const { components, idMap } = findComponents(mask, info.width, info.height);
    const { candidates: matchedComponents, missingTargets, usableComponentCount } = matchTargets(components);
    const candidates = matchedComponents.map(({ target, component }) => candidateFromComponent(target, component, idMap, info.width, info.height));
    const markerCandidates = markerCandidatesForStage(components);
    const readyCandidateCount = candidates.filter((candidate) => candidate.candidateValidationStatus === 'READY_FOR_OPERATOR_REVIEW').length;
    const needsOperatorFixCount = candidates.length - readyCandidateCount;

    const status = missingTargets.length === 0 && needsOperatorFixCount === 0
      ? 'PASS_CANDIDATES_READY_FOR_OPERATOR_REVIEW'
      : 'NEEDS_TRACE_REVIEW';

    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    const report = {
      stadiumId: 'BUSAN_SAJIK',
      sourceId: 'OPERATOR_REFERENCE_2026',
      mapVersion: MAP_VERSION,
      image: {
        path: IMAGE_RELATIVE_PATH,
        width: EXPECTED_WIDTH,
        height: EXPECTED_HEIGHT,
        viewBox: VIEW_BOX,
        sha256,
        sourceStatus: 'OPERATOR_REFERENCE',
      },
      stage: {
        id: STAGE.stageId,
        description: STAGE.stageDescription,
        targetCount: STAGE.targets.length,
        candidateCount: candidates.length,
        readyCandidateCount,
        needsOperatorFixCount,
        usableComponentCount,
        status,
      },
      extraction: {
        method: 'saturation-connected-components',
        mask: {
          saturationMin: STAGE.mask.saturationMin,
          brightnessMin: STAGE.mask.brightnessMin,
          brightnessMax: STAGE.mask.brightnessMax,
          maxChannelMin: STAGE.mask.maxChannelMin,
        },
        matchMaxDistancePx: STAGE.matchMaxDistancePx,
        minComponentArea: STAGE.minComponentArea,
        simplifyEpsilonPx: STAGE.simplifyEpsilonPx,
        note: 'Candidates are generated from the local operator-provided image only and must be operator-approved before runtime selection is enabled.',
      },
      missingTargets: missingTargets.map((target) => target.sectionId),
      markerCandidates,
      candidates,
    };

    const jsonPath = path.join(OUTPUT_DIR, `${STAGE.outputPrefix}-candidates.json`);
    await fs.writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

    const approvalTemplate = buildApprovalTemplate(report);
    const templatePath = path.join(OUTPUT_DIR, STAGE.approvalTemplateFile);
    await fs.writeFile(templatePath, `${JSON.stringify(approvalTemplate, null, 2)}\n`);

    const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    const overlaySvg = buildOverlaySvg(imageDataUrl, candidates);
    const svgPath = path.join(OUTPUT_DIR, `${STAGE.outputPrefix}-overlay.svg`);
    const pngPath = path.join(OUTPUT_DIR, `${STAGE.outputPrefix}-overlay.png`);
    const cropPath = path.join(OUTPUT_DIR, `${STAGE.outputPrefix}-overlay-crop.png`);
    await fs.writeFile(svgPath, overlaySvg);
    await sharp(Buffer.from(overlaySvg)).png().toFile(pngPath);
    await sharp(pngPath).extract(STAGE.crop).resize({ width: STAGE.crop.width * 2 }).png().toFile(cropPath);

    const groupCropPaths = [];
    for (const crop of STAGE.groupCrops) {
      const groupCropPath = path.join(OUTPUT_DIR, `${STAGE.groupCropPrefix}-${crop.id}-overlay-crop.png`);
      await sharp(pngPath).extract(crop).resize({ width: crop.width * 2 }).png().toFile(groupCropPath);
      groupCropPaths.push(groupCropPath);
    }

    console.log(`status:${status}`);
    console.log(`targets:${STAGE.targets.length} candidates:${candidates.length} ready:${readyCandidateCount} fix:${needsOperatorFixCount} missing:${missingTargets.length}`);
    console.log(`json:${jsonPath}`);
    console.log(`template:${templatePath}`);
    console.log(`overlay:${pngPath}`);
    console.log(`crop:${cropPath}`);
    groupCropPaths.forEach((groupCropPath) => console.log(`group_crop:${groupCropPath}`));
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceTraceCoverageCloseout = async () => {
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const { SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET, validateSajikOperatorReferenceSeatMapDataset } = await import("../src/data/sajikOperatorReferenceSeatMapDataset.ts");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportRoot = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const reportPath = path.join(reportRoot, 'operator-reference-trace-coverage-closeout.json');
  const markdownPath = path.join(reportRoot, 'operator-reference-trace-coverage-closeout.md');

  const CONTRACT = 'SAJIK_OPERATOR_REFERENCE_TRACE_COVERAGE_CLOSEOUT_V1';
  const TARGET_TRACE_REVIEW_CONTRACT = 'SAJIK_OPERATOR_REFERENCE_TARGET_TRACE_REVIEW_V1';
  const EXPECTED_COVERED_SECTION_COUNT = 78;
  const PASS_STATUS = 'PASS_TRACE_COVERAGE_CLOSEOUT';
  const TARGET_PASS_STATUS = 'PASS_TARGET_TRACE_REVIEW';

  const TRACE_REVIEW_REPORTS = [
    {
      stageId: 'stage01-pink-inner',
      file: 'operator-reference-stage01-pink-inner-trace-review.json',
      expectedSectionIds: ['021', '022', '023', '024', '031', '032', '033', '034', '041', '044'],
    },
    {
      stageId: 'stage01-red-lower',
      file: 'operator-reference-stage01-red-lower-trace-review.json',
      expectedSectionIds: ['051', '052', '053', '054', '055', '056', '057'],
    },
    {
      stageId: 'stage02-target',
      file: 'operator-reference-target-trace-review.json',
      expectedSectionIds: ['127', '133', '143', '132', '142'],
      acceptedReportStageIds: ['stage02'],
    },
    {
      stageId: 'stage02-marker-adjacent',
      file: 'operator-reference-stage02-marker-adjacent-trace-review.json',
      expectedSectionIds: ['137', '125', '135', '124', '123', '122'],
    },
    {
      stageId: 'stage02-middle',
      file: 'operator-reference-stage02-middle-trace-review.json',
      expectedSectionIds: ['116', '126', '136', '115', '114', '134'],
    },
    {
      stageId: 'stage02-yellow-lower',
      file: 'operator-reference-stage02-yellow-lower-trace-review.json',
      expectedSectionIds: ['113', '112', '111', '121', '131'],
    },
    {
      stageId: 'stage03-target',
      file: 'operator-reference-stage03-target-trace-review.json',
      expectedSectionIds: ['325', '335', '324', '333', '323'],
      acceptedReportStageIds: ['stage03'],
    },
    {
      stageId: 'stage03-lower-outer',
      file: 'operator-reference-stage03-lower-outer-trace-review.json',
      expectedSectionIds: ['314', '334', '343', '322', '321', '331', '342'],
    },
    {
      stageId: 'stage03-upper-outer',
      file: 'operator-reference-stage03-upper-outer-trace-review.json',
      expectedSectionIds: ['734', '724', '733', '723', '732', '722', '721', '338', '337', '327'],
    },
    {
      stageId: 'stage03-middle-inner',
      file: 'operator-reference-stage03-middle-inner-trace-review.json',
      expectedSectionIds: ['316', '326', '336', '315', '313', '312', '311'],
    },
    {
      stageId: 'stage03-closeout',
      file: 'operator-reference-stage03-closeout-trace-review.json',
      expectedSectionIds: ['332'],
    },
    {
      stageId: 'stage04-right-outfield',
      file: 'operator-reference-stage04-right-outfield-trace-review.json',
      expectedSectionIds: ['925', '934', '924', '933', '923', '932', '922', '931', '921'],
      acceptedReportStageIds: ['stage04'],
    },
  ];

  function sorted(values) {
    return [...values].sort((first, second) => first.localeCompare(second));
  }

  function addCount(counts, key, delta = 1) {
    counts[key] = (counts[key] ?? 0) + delta;
  }

  function sameStringArray(first, second) {
    return first.length === second.length && first.every((value, index) => value === second[index]);
  }

  function relativePath(filePath) {
    return path.relative(frontendRoot, filePath);
  }

  function markdownRelativePath(filePath) {
    return path.relative(path.dirname(markdownPath), path.join(frontendRoot, filePath));
  }

  function escapeMarkdown(value) {
    return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
  }

  async function readTraceReport(config, issues) {
    const fullPath = path.join(reportRoot, config.file);
    try {
      const report = JSON.parse(await fs.readFile(fullPath, 'utf8'));
      return {
        config,
        path: fullPath,
        report,
      };
    } catch (error) {
      issues.push(`REPORT_MISSING_OR_INVALID:${config.stageId}:${config.file}:${error.message}`);
      return null;
    }
  }

  function markdownFor(report) {
    const stageRows = report.reports.map((entry) => (
      `| ${entry.stageId} | ${entry.file} | ${entry.status} | ${entry.sectionCount} | ${entry.needsCoordinatePatchCount} | ${Object.entries(entry.decisions).map(([key, value]) => `${key}:${value}`).join(', ')} |`
    ));
    const sectionRows = report.sections.map((section) => (
      `| ${section.sectionId} | ${section.datasetStageId} | ${section.reviewStageId} | ${section.operatorDecision} | ${section.currentPointCount} | ${section.candidatePointCount} | ${section.seatColorRatio} | ${section.backgroundOrLineRatio} | [png](${markdownRelativePath(section.evidencePngPath)}) | ${escapeMarkdown(section.reason)} |`
    ));

    return [
      '# Sajik Operator Reference Trace Coverage Closeout',
      '',
      `- contract: \`${report.contract}\``,
      `- status: \`${report.status}\``,
      `- source: \`${report.sourceId}\``,
      `- mapVersion: \`${report.mapVersion}\``,
      `- covered sections: \`${report.coveredSectionCount}/${report.expectedSectionCount}\``,
      `- duplicate sections: \`${report.duplicateSectionIds.length}\``,
      `- missing sections: \`${report.missingSectionIds.length}\``,
      `- unexpected sections: \`${report.unexpectedSectionIds.length}\``,
      `- issues: \`${report.issues.length}\``,
      '',
      '## Stage Reports',
      '',
      '| review stage | report | status | sections | patch blockers | decisions |',
      '| --- | --- | --- | ---: | ---: | --- |',
      ...stageRows,
      '',
      '## Section Coverage',
      '',
      '| section | dataset stage | review stage | decision | current points | candidate points | seat ratio | bg/line ratio | evidence | reason |',
      '| --- | --- | --- | --- | ---: | ---: | ---: | ---: | --- | --- |',
      ...sectionRows,
      '',
    ].join('\n');
  }

  async function main() {
    const issues = validateSajikOperatorReferenceSeatMapDataset(SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET)
      .map((issue) => `DATASET:${issue}`);
    const expectedSectionIds = SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.map((section) => section.sectionId);
    const expectedSectionIdSet = new Set(expectedSectionIds);
    const sectionById = new Map(
      SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sections.map((section) => [section.sectionId, section]),
    );

    if (expectedSectionIds.length !== EXPECTED_COVERED_SECTION_COUNT) {
      issues.push(`EXPECTED_SECTION_COUNT_CHANGED:${expectedSectionIds.length}`);
    }

    const rawReports = [];
    for (const config of TRACE_REVIEW_REPORTS) {
      const loaded = await readTraceReport(config, issues);
      if (loaded) rawReports.push(loaded);
    }

    const coveredBySectionId = new Map();
    const reportSummaries = [];
    const decisionCounts = {};

    rawReports.forEach(({ config, report }) => {
      const reportSectionIds = Array.isArray(report.targetSectionIds) ? report.targetSectionIds : [];
      const reviewSectionIds = Array.isArray(report.reviews)
        ? report.reviews.map((review) => review.sectionId)
        : [];
      const sortedExpectedIds = sorted(config.expectedSectionIds);

      if (report.contract !== TARGET_TRACE_REVIEW_CONTRACT) {
        issues.push(`REPORT_CONTRACT_MISMATCH:${config.stageId}:${report.contract}`);
      }
      if (report.status !== TARGET_PASS_STATUS) {
        issues.push(`REPORT_STATUS_NOT_PASS:${config.stageId}:${report.status}`);
      }
      const acceptedReportStageIds = config.acceptedReportStageIds ?? [config.stageId];
      if (!acceptedReportStageIds.includes(report.stageId)) {
        issues.push(`REPORT_STAGE_ID_MISMATCH:${config.stageId}:${report.stageId}`);
      }
      if (!sameStringArray(sorted(reportSectionIds), sortedExpectedIds)) {
        issues.push(`REPORT_TARGETS_MISMATCH:${config.stageId}:${reportSectionIds.join(',')}`);
      }
      if (!sameStringArray(sorted(reviewSectionIds), sortedExpectedIds)) {
        issues.push(`REPORT_REVIEWS_MISMATCH:${config.stageId}:${reviewSectionIds.join(',')}`);
      }
      if (report.needsCoordinatePatchCount !== 0) {
        issues.push(`REPORT_PATCH_BLOCKERS:${config.stageId}:${report.needsCoordinatePatchCount}`);
      }
      if (Array.isArray(report.issues) && report.issues.length > 0) {
        issues.push(`REPORT_ISSUES:${config.stageId}:${report.issues.join(',')}`);
      }

      const decisions = report.decisions ?? {};
      Object.entries(decisions).forEach(([key, value]) => addCount(decisionCounts, key, value));
      if ((decisions.NEEDS_COORDINATE_PATCH ?? 0) > 0) {
        issues.push(`REPORT_NEEDS_COORDINATE_PATCH:${config.stageId}:${decisions.NEEDS_COORDINATE_PATCH}`);
      }

      reportSummaries.push({
        stageId: config.stageId,
        file: config.file,
        status: report.status,
        sectionCount: reviewSectionIds.length,
        needsCoordinatePatchCount: report.needsCoordinatePatchCount,
        decisions,
      });

      (report.reviews ?? []).forEach((review) => {
        if (!expectedSectionIdSet.has(review.sectionId)) {
          issues.push(`UNEXPECTED_REVIEW_SECTION:${config.stageId}:${review.sectionId}`);
        }
        const existing = coveredBySectionId.get(review.sectionId);
        if (existing) {
          issues.push(`DUPLICATE_REVIEW_SECTION:${review.sectionId}:${existing.reviewStageId}:${config.stageId}`);
        }
        if (review.operatorDecision === 'NEEDS_COORDINATE_PATCH') {
          issues.push(`SECTION_NEEDS_COORDINATE_PATCH:${review.sectionId}:${config.stageId}`);
        }
        if (Array.isArray(review.issues) && review.issues.length > 0) {
          issues.push(`SECTION_REVIEW_ISSUES:${review.sectionId}:${review.issues.join(',')}`);
        }

        const datasetSection = sectionById.get(review.sectionId);
        coveredBySectionId.set(review.sectionId, {
          sectionId: review.sectionId,
          datasetStageId: datasetSection?.stageId ?? null,
          reviewStageId: config.stageId,
          operatorDecision: review.operatorDecision,
          reason: review.reason,
          currentPointCount: review.current?.pointCount ?? null,
          candidatePointCount: review.candidate?.pointCount ?? null,
          areaDeltaPx2: review.areaDeltaPx2,
          maxBoundsDeltaPx: review.maxBoundsDeltaPx,
          seatColorRatio: review.current?.pixelScore?.seatColorRatio ?? null,
          backgroundOrLineRatio: review.current?.pixelScore?.backgroundOrLineRatio ?? null,
          evidencePngPath: review.evidence?.pngPath ?? relativePath(path.join(reportRoot, config.file)),
        });
      });
    });

    const coveredSectionIds = [...coveredBySectionId.keys()];
    const duplicateSectionIds = sorted(issues
      .filter((issue) => issue.startsWith('DUPLICATE_REVIEW_SECTION:'))
      .map((issue) => issue.split(':')[1]));
    const missingSectionIds = sorted(expectedSectionIds.filter((sectionId) => !coveredBySectionId.has(sectionId)));
    const unexpectedSectionIds = sorted(coveredSectionIds.filter((sectionId) => !expectedSectionIdSet.has(sectionId)));
    if (missingSectionIds.length > 0) {
      issues.push(`MISSING_SECTIONS:${missingSectionIds.join(',')}`);
    }
    if (unexpectedSectionIds.length > 0) {
      issues.push(`UNEXPECTED_SECTIONS:${unexpectedSectionIds.join(',')}`);
    }
    if (coveredSectionIds.length !== EXPECTED_COVERED_SECTION_COUNT) {
      issues.push(`COVERED_SECTION_COUNT:${coveredSectionIds.length}`);
    }

    const report = {
      contract: CONTRACT,
      stadiumId: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.stadiumId,
      sourceId: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.sourceId,
      mapVersion: SAJIK_OPERATOR_REFERENCE_SEATMAP_DATASET.mapVersion,
      status: issues.length === 0 ? PASS_STATUS : 'FAIL_TRACE_COVERAGE_CLOSEOUT',
      expectedSectionCount: EXPECTED_COVERED_SECTION_COUNT,
      datasetSectionCount: expectedSectionIds.length,
      coveredSectionCount: coveredSectionIds.length,
      reviewReportCount: TRACE_REVIEW_REPORTS.length,
      missingSectionIds,
      duplicateSectionIds,
      unexpectedSectionIds,
      decisions: decisionCounts,
      reports: reportSummaries,
      sections: sorted(coveredSectionIds).map((sectionId) => coveredBySectionId.get(sectionId)),
      issues,
    };

    await fs.mkdir(reportRoot, { recursive: true });
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    await fs.writeFile(markdownPath, markdownFor(report));

    console.log(`status:${report.status}`);
    console.log(`sections:${report.coveredSectionCount}/${report.expectedSectionCount} reports:${report.reviewReportCount}`);
    console.log(`decisions:${Object.entries(report.decisions).map(([key, value]) => `${key}=${value}`).join(',')}`);
    console.log(`missing:${report.missingSectionIds.length} duplicate:${report.duplicateSectionIds.length} unexpected:${report.unexpectedSectionIds.length}`);
    console.log(`report:${reportPath}`);
    console.log(`markdown:${markdownPath}`);

    if (issues.length > 0) {
      issues.forEach((issue) => console.error(`issue:${issue}`));
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const runOperatorReferenceVisibleSectionAudit = async () => {
  const { createHash } = await import("node:crypto");
  const { promises: fs } = await import("node:fs");
  const { default: path } = await import("node:path");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const frontendRoot = path.resolve(__dirname, '..');
  const reportDir = path.join(frontendRoot, 'reports/stadium/sajik-operator-reference-trace');
  const summaryPath = path.join(reportDir, 'operator-reference-approved-dataset-summary.json');
  const outputPath = path.join(reportDir, 'operator-reference-visible-section-audit.json');
  const imagePath = path.join(frontendRoot, 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png');

  const EXPECTED_IMAGE_SHA256 = '794d957510240c786f4fce821814afbf01cc1f93fe7ec3ecca23846a8d753f6f';
  const EXPECTED_WIDTH = 1151;
  const EXPECTED_HEIGHT = 1367;

  const STAGE_CANDIDATE_FILES = [
    {
      stageId: 'stage01',
      fileName: 'stage01-lower-central-candidates.json',
      description: 'lower central visible sections',
      expectedSectionCount: 17,
    },
    {
      stageId: 'stage02',
      fileName: 'stage02-first-base-candidates.json',
      description: 'first-base visible sections',
      expectedSectionCount: 22,
    },
    {
      stageId: 'stage03',
      fileName: 'stage03-third-base-candidates.json',
      description: 'third-base and left outfield visible sections',
      expectedSectionCount: 30,
    },
    {
      stageId: 'stage04',
      fileName: 'stage04-right-outfield-candidates.json',
      description: 'right outfield visible sections',
      expectedSectionCount: 9,
    },
  ];

  function findDuplicates(values) {
    const seen = new Set();
    const duplicates = new Set();
    values.forEach((value) => {
      if (seen.has(value)) duplicates.add(value);
      seen.add(value);
    });
    return [...duplicates].sort();
  }

  function sortedDifference(left, right) {
    const rightSet = new Set(right);
    return left.filter((value) => !rightSet.has(value)).sort();
  }

  async function readJson(filePath) {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async function main() {
    const issues = [];
    const summary = await readJson(summaryPath);
    const imageBuffer = await fs.readFile(imagePath);
    const imageSha256 = createHash('sha256').update(imageBuffer).digest('hex');

    if (imageSha256 !== EXPECTED_IMAGE_SHA256) {
      issues.push(`IMAGE_SHA256_MISMATCH:${imageSha256}`);
    }
    const approvedSectionIds = (summary.sections ?? []).map((section) => section.sectionId);
    const approvedSectionIdSet = new Set(approvedSectionIds);
    const candidateSectionIds = [];
    const stageReports = [];

    for (const stage of STAGE_CANDIDATE_FILES) {
      const candidateReport = await readJson(path.join(reportDir, stage.fileName));
      const candidates = candidateReport.candidates ?? [];
      const stageCandidateIds = candidates.map((candidate) => candidate.sectionId);
      const missingTargets = candidateReport.missingTargets ?? [];
      const duplicateCandidateIds = findDuplicates(stageCandidateIds);
      const unapprovedCandidateIds = sortedDifference(stageCandidateIds, approvedSectionIds);

      if (candidateReport.image?.sha256 !== EXPECTED_IMAGE_SHA256) {
        issues.push(`${stage.stageId}:IMAGE_SHA256_MISMATCH`);
      }
      if (candidateReport.image?.width !== EXPECTED_WIDTH || candidateReport.image?.height !== EXPECTED_HEIGHT) {
        issues.push(`${stage.stageId}:IMAGE_SIZE_MISMATCH`);
      }
      if (candidates.length !== stage.expectedSectionCount) {
        issues.push(`${stage.stageId}:VISIBLE_CANDIDATE_COUNT_${candidates.length}_EXPECTED_${stage.expectedSectionCount}`);
      }
      if (missingTargets.length > 0) {
        issues.push(`${stage.stageId}:IMAGE_ANALYSIS_MISSING_TARGETS:${missingTargets.join(',')}`);
      }
      if (duplicateCandidateIds.length > 0) {
        issues.push(`${stage.stageId}:DUPLICATE_VISIBLE_CANDIDATES:${duplicateCandidateIds.join(',')}`);
      }
      if (unapprovedCandidateIds.length > 0) {
        issues.push(`${stage.stageId}:VISIBLE_CANDIDATES_NOT_IN_APPROVED_DATASET:${unapprovedCandidateIds.join(',')}`);
      }

      candidateSectionIds.push(...stageCandidateIds);
      stageReports.push({
        stageId: stage.stageId,
        description: stage.description,
        candidateFile: stage.fileName,
        expectedSectionCount: stage.expectedSectionCount,
        candidateCount: candidates.length,
        missingTargetCount: missingTargets.length,
        missingTargets,
        duplicateCandidateIds,
        unapprovedCandidateIds,
        sectionIds: stageCandidateIds,
      });
    }

    const duplicateVisibleSectionIds = findDuplicates(candidateSectionIds);
    const approvedWithoutVisibleCandidateIds = sortedDifference(approvedSectionIds, candidateSectionIds);
    const visibleCandidateWithoutApprovedSectionIds = sortedDifference(candidateSectionIds, approvedSectionIds);

    if (duplicateVisibleSectionIds.length > 0) {
      issues.push(`DUPLICATE_VISIBLE_SECTION_IDS:${duplicateVisibleSectionIds.join(',')}`);
    }
    if (approvedWithoutVisibleCandidateIds.length > 0) {
      issues.push(`APPROVED_WITHOUT_VISIBLE_CANDIDATE:${approvedWithoutVisibleCandidateIds.join(',')}`);
    }
    if (visibleCandidateWithoutApprovedSectionIds.length > 0) {
      issues.push(`VISIBLE_CANDIDATE_WITHOUT_APPROVAL:${visibleCandidateWithoutApprovedSectionIds.join(',')}`);
    }
    if (candidateSectionIds.length !== 78 || approvedSectionIdSet.size !== 78) {
      issues.push(`VISIBLE_APPROVED_COUNT_MISMATCH:candidates=${candidateSectionIds.length}:approved=${approvedSectionIdSet.size}`);
    }

    const report = {
      contract: 'SAJIK_OPERATOR_REFERENCE_VISIBLE_SECTION_AUDIT_V1',
      stadiumId: 'BUSAN_SAJIK',
      sourceId: 'OPERATOR_REFERENCE_2026',
      mapVersion: summary.mapVersion,
      status: issues.length === 0 ? 'PASS_VISIBLE_SECTION_AUDIT' : 'FAIL_VISIBLE_SECTION_AUDIT',
      sourceBasis: 'local image-analysis candidate files generated from the operator reference PNG',
      image: {
        path: 'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png',
        width: EXPECTED_WIDTH,
        height: EXPECTED_HEIGHT,
        sha256: imageSha256,
      },
      expectedVisibleSectionCount: 78,
      visibleCandidateCount: candidateSectionIds.length,
      approvedSectionCount: approvedSectionIdSet.size,
      duplicateVisibleSectionIds,
      approvedWithoutVisibleCandidateIds,
      visibleCandidateWithoutApprovedSectionIds,
      stageReports,
      issues,
      note: 'Grey/unlabeled structural bands in the reference image are intentionally excluded until an operator provides official section labels.',
    };

    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);

    console.log(`status:${report.status}`);
    console.log(`visibleCandidates:${report.visibleCandidateCount} approved:${report.approvedSectionCount} expected:${report.expectedVisibleSectionCount}`);
    console.log(`report:${outputPath}`);
    if (issues.length > 0) {
      issues.forEach((issue) => console.error(`issue:${issue}`));
      process.exitCode = 1;
    }
  }

  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
};

const TASKS = {
  "operator-reference-approved-geometry-audit": runOperatorReferenceApprovedGeometryAudit,
  "operator-reference-approved-overlay": runOperatorReferenceApprovedOverlay,
  "operator-reference-approved-topology-audit": runOperatorReferenceApprovedTopologyAudit,
  "operator-reference-dataset-export": runOperatorReferenceDatasetExport,
  "operator-reference-draft-summary": runOperatorReferenceDraftSummary,
  "operator-reference-import-gate-smoke": runOperatorReferenceImportGateSmoke,
  "operator-reference-import-gate": runOperatorReferenceImportGate,
  "operator-reference-marker-boundary-review": runOperatorReferenceMarkerBoundaryReview,
  "operator-reference-marker-link-readiness": runOperatorReferenceMarkerLinkReadiness,
  "operator-reference-marker-policy-audit": runOperatorReferenceMarkerPolicyAudit,
  "operator-reference-promotion-readiness": runOperatorReferencePromotionReadiness,
  "operator-reference-scope-audit": runOperatorReferenceScopeAudit,
  "operator-reference-target-trace-review": runOperatorReferenceTargetTraceReview,
  "operator-reference-trace-candidates": runOperatorReferenceTraceCandidates,
  "operator-reference-trace-coverage-closeout": runOperatorReferenceTraceCoverageCloseout,
  "operator-reference-visible-section-audit": runOperatorReferenceVisibleSectionAudit,
};

export const runSajikOperatorReferenceTask = async (task, args = process.argv.slice(2)) => {
  const runner = TASKS[task];
  if (!runner) {
    const available = Object.keys(TASKS).sort().join(', ');
    throw new Error(`Unknown Sajik operator-reference task: ${task}. Available tasks: ${available}`);
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
  await runSajikOperatorReferenceTask(task, args);
}
