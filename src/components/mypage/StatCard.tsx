interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export default function StatCard({ value, label, color = '#2d5f4f' }: StatCardProps) {
  return (
    <div className="text-center">
      <div className="text-2xl mb-1" style={{ fontWeight: 900, color }}>
        {value}
      </div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}