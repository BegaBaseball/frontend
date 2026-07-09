import { AnimatedNumber } from './AnimatedNumber';

const adminFieldLabelClassName =
  'text-caption font-semibold text-slate-400';

export function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'amber' | 'emerald' | 'sky';
}) {
  const colorClasses = {
    amber: {
      border: 'border-amber-500/30',
      surface: 'bg-amber-500/10',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    emerald: {
      border: 'border-emerald-500/30',
      surface: 'bg-emerald-500/10',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
    },
    sky: {
      border: 'border-sky-500/30',
      surface: 'bg-sky-500/10',
      icon: 'text-sky-400',
      text: 'text-sky-300',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border ${classes.border}
        ${classes.surface}
        p-6 shadow-lg
        transition-[border-color,box-shadow] duration-150 hover:shadow-xl
      `}
    >
      <div className="relative flex items-start justify-between">
        <div>
          <p className={`mb-2 ${adminFieldLabelClassName}`}>
            {label}
          </p>
          <p className={`text-3xl font-black ${classes.text} tracking-tight`}>
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/50 ${classes.icon}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
}
