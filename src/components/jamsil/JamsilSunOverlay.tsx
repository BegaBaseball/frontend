import { polar } from './jamsilGeo';

interface Props {
  cx: number;
  cy: number;
  radius: number;
  sunAngle: number;
  mode?: 'light' | 'dark';
}

// Semi-transparent shadow arc indicating the sun direction
export default function JamsilSunOverlay({ cx, cy, radius, sunAngle, mode = 'light' }: Props) {
  // Shadow falls opposite to the sun — a 120° arc
  const shadowAngle = sunAngle + 180;
  const spread = 60;
  const a1 = shadowAngle - spread;
  const a2 = shadowAngle + spread;

  const outerR = radius * 1.05;
  const p1 = polar(cx, cy, outerR, a1);
  const p2 = polar(cx, cy, outerR, a2);
  const p3 = polar(cx, cy, 0, a2); // center

  const arc = `M ${p1.x} ${p1.y} A ${outerR} ${outerR} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`;

  return (
    <path
      d={arc}
      fill={mode === 'dark' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)'}
      style={{ pointerEvents: 'none' }}
    />
  );
}
