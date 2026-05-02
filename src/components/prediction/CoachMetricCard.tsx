import { memo } from 'react';
import { CoachMetric } from '../../api/coach';
import {
    PredictionCheckCircleIcon,
    PredictionMinusIcon,
    PredictionWarningTriangleIcon,
} from './PredictionShellIcons';

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
            icon: PredictionWarningTriangleIcon
        },
        1: {
            bg: 'bg-amber-50 dark:bg-amber-950/20',
            border: 'border-amber-200/70 dark:border-amber-900/40',
            text: 'text-amber-700 dark:text-amber-300',
            iconColor: 'text-amber-700 dark:text-amber-300',
            bar: 'bg-amber-500',
            dot: 'bg-amber-500',
            icon: PredictionMinusIcon
        },
        2: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/20',
            border: 'border-emerald-200/70 dark:border-emerald-900/40',
            text: 'text-emerald-700 dark:text-emerald-300',
            iconColor: 'text-emerald-700 dark:text-emerald-300',
            bar: 'bg-emerald-500',
            dot: 'bg-emerald-500',
            icon: PredictionCheckCircleIcon
        }
    }[risk_level];

    const progressClass = trend === 'up'
        ? 'text-emerald-600 dark:text-emerald-300'
        : trend === 'down'
            ? 'text-red-600 dark:text-red-300'
            : styles.text;
    const Icon = styles.icon;
    const statusLabel = risk_level === 0 ? '주의 필요' : risk_level === 1 ? '경계 구간' : '우세 근거';

    return (
        <div
            className={`relative flex h-full flex-col overflow-hidden rounded-2xl border ${styles.border} ${styles.bg} p-4 sm:p-5`}
        >
            <div className={`pointer-events-none absolute top-0 right-0 h-24 w-24 rounded-full opacity-10 blur-2xl ${styles.dot}`} />

            {/* Header */}
            <div className="relative z-10 mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className={`rounded border border-current px-1.5 py-0.5 text-[15px] font-bold tracking-wide ${styles.text}`}>
                        {category}
                    </span>
                    <span className={`rounded-full ${styles.iconColor}`}>
                        <Icon className="h-3.5 w-3.5" />
                    </span>
                </div>
                <div className={`w-fit shrink-0 rounded-full px-2.5 py-1 text-[15px] font-bold ${progressClass}`}>
                    {trendLabel[trend]}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10">
                {value ? (
                    <>
                        <p className="break-keep text-[16px] font-bold leading-snug text-gray-600 dark:text-gray-200">{name}</p>
                        <p className="mt-1 break-keep text-xl font-black leading-tight text-gray-950 dark:text-white">{value}</p>
                    </>
                ) : (
                    <p className="mt-2 break-keep text-lg font-black leading-tight text-gray-950 dark:text-white">{name}</p>
                )}
            </div>

            <div className="mt-5 space-y-2 rounded-2xl bg-white/80 p-3 text-[16px] shadow-sm dark:bg-slate-950/40">
                <div className="flex flex-col gap-1 font-bold tracking-wide text-gray-600 dark:text-gray-200 sm:flex-row sm:items-center sm:justify-between">
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
                    <p className="break-keep text-[16px] leading-relaxed text-gray-700 dark:text-gray-200">
                        {description}
                    </p>
                </div>
            )}
        </div>
    );
}

export default memo(CoachMetricCard);
