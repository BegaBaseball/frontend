export type SeatMapPoint = [number, number];

export interface SeatMapBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface SeatMapPolygonValidationOptions {
  pathData: string;
  width: number;
  height: number;
  minPointCount?: number;
  labelPoint?: SeatMapPoint;
  labelTolerance?: number;
  sectionId?: string;
  pathKind?: string;
}

export type SeatMapPolygonValidationSeverity = 'error' | 'warning';

export type SeatMapPolygonIssueCode =
  | 'SINGLE_CLOSED_MLZ_PATH_REQUIRED'
  | 'MIN_POINT_COUNT_REQUIRED'
  | 'NON_ZERO_AREA_REQUIRED'
  | 'SELF_INTERSECTION'
  | 'POINT_OUT_OF_BOUNDS'
  | 'LABEL_OUT_OF_BOUNDS'
  | 'LABEL_OUTSIDE_POLYGON'
  | 'HIT_POLYGON_TOO_SMALL';

export interface SeatMapPolygonValidationIssue {
  code: SeatMapPolygonIssueCode;
  severity: SeatMapPolygonValidationSeverity;
  sectionId?: string;
  pathKind?: string;
  message: string;
}

const polygonIssueMessages: Record<SeatMapPolygonIssueCode, string> = {
  SINGLE_CLOSED_MLZ_PATH_REQUIRED: 'Path must be a single closed M/L/Z polygon.',
  MIN_POINT_COUNT_REQUIRED: 'Polygon must have at least the minimum point count.',
  NON_ZERO_AREA_REQUIRED: 'Polygon area must be greater than zero.',
  SELF_INTERSECTION: 'Polygon edges must not self-intersect.',
  POINT_OUT_OF_BOUNDS: 'Polygon coordinates must stay within the image bounds.',
  LABEL_OUT_OF_BOUNDS: 'Label point must stay within the image bounds.',
  LABEL_OUTSIDE_POLYGON: 'Label point must be inside or near the polygon.',
  HIT_POLYGON_TOO_SMALL: 'Hit polygon area must meet the minimum visual area ratio.',
};

export function pathToPoints(pathData: string): SeatMapPoint[] {
  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  const points: SeatMapPoint[] = [];

  for (let index = 0; index < numbers.length - 1; index += 2) {
    points.push([numbers[index], numbers[index + 1]]);
  }

  return points;
}

function formatPathCoordinate(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

export function pointsToPath(points: SeatMapPoint[]): string {
  if (points.length === 0) {
    return '';
  }

  const [firstPoint, ...remainingPoints] = points;
  const move = `M ${formatPathCoordinate(firstPoint[0])} ${formatPathCoordinate(firstPoint[1])}`;
  const lines = remainingPoints.map(([x, y]) => `L ${formatPathCoordinate(x)} ${formatPathCoordinate(y)}`);
  return `${[move, ...lines].join(' ')} Z`;
}

export function pathSubpathCount(pathData: string): number {
  return (pathData.match(/(?:^|\s)M\s/g) ?? []).length || 1;
}

export function pathBounds(pathData: string): SeatMapBounds {
  const points = pathToPoints(pathData);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function polygonArea(points: SeatMapPoint[]): number {
  const signedArea = points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + ((point[0] * next[1]) - (next[0] * point[1]));
  }, 0);

  return Math.abs(signedArea / 2);
}

export function pointInPolygon(point: SeatMapPoint, polygon: SeatMapPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }

  const [x, y] = point;
  let inside = false;

  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [xi, yi] = polygon[index];
    const [xj, yj] = polygon[previous];
    const intersects = ((yi > y) !== (yj > y))
      && x < (((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON)) + xi;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

export function distanceToSegment(point: SeatMapPoint, start: SeatMapPoint, end: SeatMapPoint): number {
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

export function distanceToPolygon(point: SeatMapPoint, polygon: SeatMapPoint[]): number {
  return polygon.reduce((minimum, polygonPoint, index) => {
    const next = polygon[(index + 1) % polygon.length];
    return Math.min(minimum, distanceToSegment(point, polygonPoint, next));
  }, Number.POSITIVE_INFINITY);
}

export function pointInsideOrNearPolygon(point: SeatMapPoint, polygon: SeatMapPoint[], tolerance = 1): boolean {
  return pointInPolygon(point, polygon) || distanceToPolygon(point, polygon) <= tolerance;
}

export function orientation(a: SeatMapPoint, b: SeatMapPoint, c: SeatMapPoint): number {
  return ((b[0] - a[0]) * (c[1] - a[1])) - ((b[1] - a[1]) * (c[0] - a[0]));
}

export function isPointOnSegment(point: SeatMapPoint, start: SeatMapPoint, end: SeatMapPoint): boolean {
  const epsilon = 0.0001;
  if (Math.abs(orientation(start, end, point)) > epsilon) {
    return false;
  }

  return point[0] >= Math.min(start[0], end[0]) - epsilon
    && point[0] <= Math.max(start[0], end[0]) + epsilon
    && point[1] >= Math.min(start[1], end[1]) - epsilon
    && point[1] <= Math.max(start[1], end[1]) + epsilon;
}

export function segmentsIntersect(
  firstStart: SeatMapPoint,
  firstEnd: SeatMapPoint,
  secondStart: SeatMapPoint,
  secondEnd: SeatMapPoint,
): boolean {
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

export function isSingleClosedPolygonPath(pathData: string): boolean {
  return /^M\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?(?:\sL\s-?\d+(?:\.\d+)?\s-?\d+(?:\.\d+)?)+\sZ$/.test(pathData);
}

export function polygonSelfIntersections(points: SeatMapPoint[]): Array<[number, number]> {
  const intersections: Array<[number, number]> = [];

  points.forEach((point, edgeIndex) => {
    const nextPoint = points[(edgeIndex + 1) % points.length];

    for (let compareIndex = edgeIndex + 1; compareIndex < points.length; compareIndex += 1) {
      const isAdjacent = Math.abs(edgeIndex - compareIndex) <= 1
        || (edgeIndex === 0 && compareIndex === points.length - 1);
      if (isAdjacent) {
        continue;
      }

      const comparePoint = points[compareIndex];
      const compareNextPoint = points[(compareIndex + 1) % points.length];
      if (segmentsIntersect(point, nextPoint, comparePoint, compareNextPoint)) {
        intersections.push([edgeIndex, compareIndex]);
      }
    }
  });

  return intersections;
}

export function hasSelfIntersection(points: SeatMapPoint[]): boolean {
  return polygonSelfIntersections(points).length > 0;
}

export function validateSeatMapPolygonPath({
  pathData,
  width,
  height,
  minPointCount = 3,
  labelPoint,
  labelTolerance = 1,
}: SeatMapPolygonValidationOptions): string[] {
  return validateSeatMapPolygonPathIssues({
    pathData,
    width,
    height,
    minPointCount,
    labelPoint,
    labelTolerance,
  }).map((issue) => issue.code);
}

export function validateSeatMapPolygonPathIssues({
  pathData,
  width,
  height,
  minPointCount = 3,
  labelPoint,
  labelTolerance = 1,
  sectionId,
  pathKind,
}: SeatMapPolygonValidationOptions): SeatMapPolygonValidationIssue[] {
  const issueCodes: SeatMapPolygonIssueCode[] = [];
  const points = pathToPoints(pathData);

  if (!isSingleClosedPolygonPath(pathData)) {
    issueCodes.push('SINGLE_CLOSED_MLZ_PATH_REQUIRED');
  }
  if (points.length < minPointCount) {
    issueCodes.push('MIN_POINT_COUNT_REQUIRED');
  }
  if (polygonArea(points) <= 0) {
    issueCodes.push('NON_ZERO_AREA_REQUIRED');
  }
  if (hasSelfIntersection(points)) {
    issueCodes.push('SELF_INTERSECTION');
  }

  points.forEach(([x, y]) => {
    if (x < 0 || x > width || y < 0 || y > height) {
      issueCodes.push('POINT_OUT_OF_BOUNDS');
    }
  });

  if (labelPoint) {
    const [labelX, labelY] = labelPoint;
    if (labelX < 0 || labelX > width || labelY < 0 || labelY > height) {
      issueCodes.push('LABEL_OUT_OF_BOUNDS');
    }
    if (!pointInsideOrNearPolygon(labelPoint, points, labelTolerance)) {
      issueCodes.push('LABEL_OUTSIDE_POLYGON');
    }
  }

  return Array.from(new Set(issueCodes)).map((code) => ({
    code,
    severity: 'error',
    sectionId,
    pathKind,
    message: polygonIssueMessages[code],
  }));
}
