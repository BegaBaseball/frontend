interface StatCardProps {
  value: string | number;
  label: string;
  color?: string;
}

export default function StatCard({ value, label, color = 'var(--mp-accent)' }: StatCardProps) {
  return (
    <div className="text-center">
      <div className="text-2xl mb-1" style={{ fontWeight: 900, color }}>
        {value}
      </div>
      <div className="text-body text-muted-foreground">{label}</div>
    </div>
  );
}
