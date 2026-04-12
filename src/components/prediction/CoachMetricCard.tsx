import { memo } from 'react';
import { AlertTriangle, CheckCircle, Minus } from 'lucide-react';
import { CoachMetric } from '../../api/coach';

const trendLabel: Record<CoachMetric['trend'], string> = {
    up: '상승',
    down: '하락',
    neutral: '보통',
};

function CoachMetricCard({ data }: { data: CoachMetric }) {
    const { category, name, value, description, risk_level, trend } = data;

    // Color Styles based on Risk Level
    const styles = {
        0: {
            bg: 'bg-red-50 dark:bg-red-950/20',
            border: 'border-red-200/70 dark:border-red-900/40',
            text: 'text-red-700 dark:text-red-300',
            iconColor: 'text-red-700 dark:text-red-400',
            bar: 'bg-red-500',
            dot: 'bg-red-500',
            icon: AlertTriangle
        },
        1: {
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            border: 'border-amber-200/70 dark:border-amber-900/40',
            text: 'text-amber-700 dark:text-amber-300',
            iconColor: 'text-amber-700 dark:text-amber-300',
            bar: 'bg-amber-500',
            dot: 'bg-amber-500',
            icon: Minus
        },
        2: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
            border: 'border-emerald-200/70 dark:border-emerald-900/40',
            text: 'text-emerald-700 dark:text-emerald-300',
            iconColor: 'text-emerald-700 dark:text-emerald-300',
            bar: 'bg-emerald-500',
            dot: 'bg-emerald-500',
            icon: CheckCircle
        }
    }[risk_level];

    const progressClass = trend === 'up'
        ? 'text-emerald-600 dark:text-emerald-300'
        : trend === 'down'
            ? 'text-red-600 dark:text-red-300'
            : styles.text;
    const Icon = styles.icon;
    const statusLabel = risk_level === 0 ? '주의 변수' : risk_level === 1 ? '경계 구간' : '우세 근거';

    return (
        <div
            className={`relative flex h-full flex-col overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} p-5`}
        >
            <div className={`pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full opacity-10 blur-2xl ${styles.dot}`} />

            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-1.5">
                    <span className={`rounded border border-current px-1.5 py-0.5 text-[16px] font-bold tracking-wide uppercase ${styles.text}`}>
                        {category}
                    </span>
                    <span className={`rounded-full ${styles.iconColor}`}>
                        <Icon className="h-3.5 w-3.5" />
                    </span>
                </div>
                    <div className={`rounded-full px-2.5 py-1 text-[16px] font-bold ${progressClass}`}>
                    {trendLabel[trend]}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10">
                {value ? (
                    <>
                        <p className="text-[16px] font-bold text-gray-500 dark:text-gray-300">{name}</p>
                        <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{value}</p>
                    </>
                ) : (
                        <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{name}</p>
                )}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-white/70 p-3 text-[16px] shadow-sm dark:bg-black/20">
                <div className="flex items-center justify-between font-bold tracking-wide text-gray-500 dark:text-gray-300">
                    <span>해석 포인트</span>
                    <span className={styles.text}>{statusLabel}</span>
                </div>
                <div className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1 text-[16px] font-bold ${progressClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                    <span>{trendLabel[trend]}</span>
                </div>
            </div>

            {/* Description */}
            {description && description.length > 0 && (
                <div className="relative z-10 mt-4 border-t border-gray-200/60 pt-3 dark:border-border/30">
                    <p className="text-[16px] text-gray-600 dark:text-gray-300 leading-relaxed">
                        {description}
                    </p>
                </div>
            )}
        </div>
    );
}

export default memo(CoachMetricCard);
