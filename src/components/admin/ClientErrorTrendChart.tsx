import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

export default function ClientErrorTrendChart({
  chartData,
  loading,
}: ClientErrorTrendChartProps) {
  if (loading) {
    return <div className="flex h-full items-center justify-center text-slate-400">로딩 중...</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="apiArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="runtimeArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fb7185" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="feedbackArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="label" stroke="#94a3b8" />
        <YAxis stroke="#94a3b8" />
        <Tooltip
          contentStyle={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '0.75rem',
            color: '#e2e8f0',
          }}
          labelStyle={{ color: '#f8fafc' }}
        />
        <Legend />
        <Area type="monotone" dataKey="api" stroke="#38bdf8" fill="url(#apiArea)" strokeWidth={2} />
        <Area type="monotone" dataKey="runtime" stroke="#fb7185" fill="url(#runtimeArea)" strokeWidth={2} />
        <Area type="monotone" dataKey="feedback" stroke="#fbbf24" fill="url(#feedbackArea)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
