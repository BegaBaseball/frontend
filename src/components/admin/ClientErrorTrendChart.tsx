type ClientErrorTrendPoint = {
  label: string;
  api: number;
  runtime: number;
  feedback: number;
};

interface ClientErrorTrendChartProps {
  chartData: ClientErrorTrendPoint[];
  loading: boolean;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const PADDING = {
  top: 16,
  right: 16,
  bottom: 36,
  left: 36,
};

const SERIES = [
  { key: 'api', label: 'API', stroke: '#38bdf8', fill: 'rgba(56, 189, 248, 0.18)' },
  { key: 'runtime', label: 'Runtime', stroke: '#fb7185', fill: 'rgba(251, 113, 133, 0.18)' },
  { key: 'feedback', label: 'Feedback', stroke: '#fbbf24', fill: 'rgba(251, 191, 36, 0.18)' },
] as const;

export default function ClientErrorTrendChart({
  chartData,
  loading,
}: ClientErrorTrendChartProps) {
  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400">로딩 중...</div>;
  }

  if (chartData.length === 0) {
    return <div className="flex h-full items-center justify-center text-slate-400">표시할 데이터가 없습니다.</div>;
  }

  const innerWidth = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const maxValue = Math.max(
    1,
    ...chartData.flatMap((point) => [point.api, point.runtime, point.feedback]),
  );

  const xForIndex = (index: number) => {
    if (chartData.length === 1) {
      return PADDING.left + innerWidth / 2;
    }

    return PADDING.left + (innerWidth / (chartData.length - 1)) * index;
  };

  const yForValue = (value: number) => (
    PADDING.top + innerHeight - (value / maxValue) * innerHeight
  );

  const tickValues = Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 4) * (4 - index)));

  const buildLinePoints = (key: keyof ClientErrorTrendPoint) => (
    chartData
      .map((point, index) => `${xForIndex(index)},${yForValue(Number(point[key]))}`)
      .join(' ')
  );

  const buildAreaPoints = (key: keyof ClientErrorTrendPoint) => {
    const linePoints = chartData.map((point, index) => `${xForIndex(index)},${yForValue(Number(point[key]))}`);
    const lastX = xForIndex(chartData.length - 1);
    const firstX = xForIndex(0);
    const baselineY = PADDING.top + innerHeight;
    return [`${firstX},${baselineY}`, ...linePoints, `${lastX},${baselineY}`].join(' ');
  };

  return (
    <div className="flex h-full flex-col">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-full w-full">
        <g>
          {tickValues.map((tick) => {
            const y = yForValue(tick);
            return (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={CHART_WIDTH - PADDING.right}
                  y1={y}
                  y2={y}
                  stroke="#1f2937"
                  strokeDasharray="3 3"
                />
                <text
                  x={PADDING.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#94a3b8"
                  fontSize="12"
                >
                  {tick}
                </text>
              </g>
            );
          })}
        </g>

        {SERIES.map((series) => (
          <g key={series.key}>
            <polygon points={buildAreaPoints(series.key)} fill={series.fill} />
            <polyline
              fill="none"
              stroke={series.stroke}
              strokeWidth="2.5"
              points={buildLinePoints(series.key)}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {chartData.map((point, index) => {
              const x = xForIndex(index);
              const y = yForValue(point[series.key]);
              return (
                <circle key={`${series.key}-${point.label}`} cx={x} cy={y} r="3.5" fill={series.stroke}>
                  <title>{`${point.label} · ${series.label}: ${point[series.key]}`}</title>
                </circle>
              );
            })}
          </g>
        ))}

        <g>
          {chartData.map((point, index) => (
              <text
                key={point.label}
                x={xForIndex(index)}
                y={CHART_HEIGHT - 10}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize="12"
              >
                {point.label}
              </text>
          ))}
        </g>
      </svg>

      <div className="mt-3 flex flex-wrap gap-3 text-[14px] text-slate-300">
        {SERIES.map((series) => (
          <div key={series.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: series.stroke }} />
            <span>{series.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
