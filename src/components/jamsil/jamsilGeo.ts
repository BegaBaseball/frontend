// Polar-coordinate geometry helpers for the arc-sector seat map

export function deg2rad(d: number): number {
  return (d * Math.PI) / 180;
}

// angle: 0 = up (toward 2nd base), positive = clockwise
export function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = deg2rad(angleDeg - 90);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

// SVG arc sector path (donut slice) from inner to outer radius
export function arcSectorPath(
  cx: number, cy: number,
  rIn: number, rOut: number,
  a1: number, a2: number,
): string {
  const p1 = polar(cx, cy, rOut, a1);
  const p2 = polar(cx, cy, rOut, a2);
  const p3 = polar(cx, cy, rIn, a2);
  const p4 = polar(cx, cy, rIn, a1);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return (
    `M ${p1.x} ${p1.y} ` +
    `A ${rOut} ${rOut} 0 ${large} 1 ${p2.x} ${p2.y} ` +
    `L ${p3.x} ${p3.y} ` +
    `A ${rIn} ${rIn} 0 ${large} 0 ${p4.x} ${p4.y} Z`
  );
}
