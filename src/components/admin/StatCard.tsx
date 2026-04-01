import { AnimatedNumber } from './AnimatedNumber';

export function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'amber' | 'emerald' | 'sky';
  delay: number;
}) {
  const colorClasses = {
    amber: {
      glow: 'shadow-amber-500/20',
      border: 'border-amber-500/30',
      bg: 'from-amber-500/10 to-amber-600/5',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    emerald: {
      glow: 'shadow-emerald-500/20',
      border: 'border-emerald-500/30',
      bg: 'from-emerald-500/10 to-emerald-600/5',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
    },
    sky: {
      glow: 'shadow-sky-500/20',
      border: 'border-sky-500/30',
      bg: 'from-sky-500/10 to-sky-600/5',
      icon: 'text-sky-400',
      text: 'text-sky-300',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${classes.border}
        bg-gradient-to-br ${classes.bg} backdrop-blur-sm
        p-6 shadow-2xl ${classes.glow}
        transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl
        animate-fade-in-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Diamond pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='%23fff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-2">
            {label}
          </p>
          <p className={`text-4xl font-black ${classes.text} tracking-tight`}>
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/50 ${classes.icon}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>

      {/* Subtle pulse animation */}
      <div
        className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl ${classes.icon} opacity-20`}
      />
    </div>
  );
}
