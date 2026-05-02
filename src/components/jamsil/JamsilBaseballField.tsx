interface Props {
  cx: number;
  cy: number;
  scale?: number;
  mode?: 'light' | 'dark';
}

export default function JamsilBaseballField({ cx, cy, scale = 1, mode = 'light' }: Props) {
  const r = 90 * scale;
  const home   = { x: cx,           y: cy + r * 0.85 };
  const second = { x: cx,           y: cy - r * 0.85 };
  const first  = { x: cx + r * 0.85, y: cy };
  const third  = { x: cx - r * 0.85, y: cy };
  const mound  = { x: cx,           y: cy + r * 0.05 };

  const grass      = mode === 'dark' ? '#2D5A47' : '#7FC79A';
  const grassLight = mode === 'dark' ? '#3D6E58' : '#A9DCBE';
  const dirt       = mode === 'dark' ? '#A87A3D' : '#E8C792';
  const dirtBorder = mode === 'dark' ? '#704F22' : '#B88A3A';
  const lineColor  = '#FFFFFF';

  const fieldRadius = 95 * scale;
  const fanPath = (
    `M ${home.x} ${home.y} ` +
    `L ${cx - fieldRadius * 0.71} ${cy - fieldRadius * 0.71} ` +
    `A ${fieldRadius} ${fieldRadius} 0 0 1 ${cx + fieldRadius * 0.71} ${cy - fieldRadius * 0.71} Z`
  );
  const diamondPath = `M ${home.x} ${home.y} L ${first.x} ${first.y} L ${second.x} ${second.y} L ${third.x} ${third.y} Z`;
  const innerGrassPath = (
    `M ${cx} ${cy + r * 0.45} L ${cx + r * 0.45} ${cy} L ${cx} ${cy - r * 0.45} L ${cx - r * 0.45} ${cy} Z`
  );

  const gradId = `grass-grad-${mode}`;

  return (
    <g>
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%">
          <stop offset="0%" stopColor={grassLight} />
          <stop offset="100%" stopColor={grass} />
        </radialGradient>
      </defs>

      {/* Outfield fan */}
      <path d={fanPath} fill={`url(#${gradId})`} stroke={mode === 'dark' ? '#1F4032' : '#5BAA7E'} strokeWidth="1.5" />

      {/* Infield dirt diamond */}
      <path d={diamondPath} fill={dirt} stroke={dirtBorder} strokeWidth="1.5" />

      {/* Infield grass */}
      <path d={innerGrassPath} fill={grassLight} opacity="0.85" />

      {/* Foul lines */}
      <line x1={home.x} y1={home.y} x2={cx + fieldRadius * 0.72} y2={cy - fieldRadius * 0.72} stroke={lineColor} strokeWidth="1.8" />
      <line x1={home.x} y1={home.y} x2={cx - fieldRadius * 0.72} y2={cy - fieldRadius * 0.72} stroke={lineColor} strokeWidth="1.8" />

      {/* Base lines */}
      <path d={diamondPath} fill="none" stroke={lineColor} strokeWidth="1.2" strokeOpacity="0.6" />

      {/* Pitcher's mound */}
      <ellipse cx={mound.x} cy={mound.y} rx={10 * scale} ry={8 * scale} fill={dirt} stroke={dirtBorder} strokeWidth="1" />

      {/* Bases */}
      {[first, second, third].map((base, i) => (
        <rect
          key={i}
          x={base.x - 5 * scale}
          y={base.y - 5 * scale}
          width={10 * scale}
          height={10 * scale}
          fill="#f8fafc"
          stroke={dirtBorder}
          strokeWidth="1.5"
          transform={`rotate(45 ${base.x} ${base.y})`}
        />
      ))}

      {/* Home plate (pentagon shape) */}
      <polygon
        points={`${home.x},${home.y - 7 * scale} ${home.x + 6 * scale},${home.y - 3 * scale} ${home.x + 6 * scale},${home.y + 3 * scale} ${home.x - 6 * scale},${home.y + 3 * scale} ${home.x - 6 * scale},${home.y - 3 * scale}`}
        fill="#f8fafc"
        stroke={dirtBorder}
        strokeWidth="1.5"
      />

      {/* Base labels */}
      <text x={cx} y={cy - r * 0.85 - 12 * scale} textAnchor="middle" fontSize={9 * scale} fontWeight="700" fill={mode === 'dark' ? '#94A3B8' : '#64748B'} style={{ pointerEvents: 'none' }}>2루</text>
      <text x={cx + r * 0.85 + 14 * scale} y={cy + 4 * scale} textAnchor="start" fontSize={9 * scale} fontWeight="700" fill={mode === 'dark' ? '#94A3B8' : '#64748B'} style={{ pointerEvents: 'none' }}>1루</text>
      <text x={cx - r * 0.85 - 14 * scale} y={cy + 4 * scale} textAnchor="end" fontSize={9 * scale} fontWeight="700" fill={mode === 'dark' ? '#94A3B8' : '#64748B'} style={{ pointerEvents: 'none' }}>3루</text>
      <text x={cx} y={home.y + 18 * scale} textAnchor="middle" fontSize={10 * scale} fontWeight="800" fill={mode === 'dark' ? '#CBD5E1' : '#334155'} style={{ pointerEvents: 'none' }}>HOME</text>
    </g>
  );
}
