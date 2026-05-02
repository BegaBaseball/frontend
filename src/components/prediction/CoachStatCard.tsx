import { memo } from 'react';
import { DashboardStat } from '../../api/coach';
import {
    PredictionArrowDownRightIcon,
    PredictionArrowUpRightIcon,
    PredictionWarningTriangleIcon,
} from './PredictionShellIcons';

const trendTextClass: Record<DashboardStat['trend'], string> = {
    up: 'text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-700/50',
    down: 'text-red-800 dark:text-red-200 bg-red-50 dark:bg-red-950/40 border-red-200/80 dark:border-red-700/50',
    neutral: 'text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/90 border-slate-200 dark:border-slate-600',
};

const isCriticalClass = 'text-red-800 bg-red-100 dark:text-red-100 dark:bg-red-900/60';

function CoachStatCard({ stat }: { stat: DashboardStat }) {
    const trendLabel = stat.trend === 'up'
        ? '상향'
        : stat.trend === 'down'
            ? '하향'
            : '보통';
    const statusLabel = stat.status === 'good'
        ? '결과 우세'
        : stat.status === 'danger'
            ? '주의 필요'
            : '경계 구간';

    return (
        <div
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors dark:border-slate-700 dark:bg-slate-900/85 sm:p-5"
        >
            <div className="relative z-10 mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <span className="break-keep text-[16px] font-bold leading-snug tracking-wide text-slate-700 dark:text-slate-200">
                    {stat.label}
                </span>
                {stat.is_critical && (
                    <span className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[14px] font-bold ${isCriticalClass}`}>
                        <PredictionWarningTriangleIcon className="h-3.5 w-3.5" />
                        핵심 경고
                    </span>
                )}
            </div>

            <div className="relative z-10 mt-1">
                <span className="block break-keep text-[22px] font-black leading-tight text-slate-950 dark:text-white sm:text-2xl">
                    {stat.value}
                </span>
            </div>

            <div className={`mt-4 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-[16px] font-bold ${trendTextClass[stat.trend]}`}>
                {stat.trend === 'up' && <PredictionArrowUpRightIcon className="h-3.5 w-3.5" />}
                {stat.trend === 'down' && <PredictionArrowDownRightIcon className="h-3.5 w-3.5" />}
                <span>{statusLabel}</span>
            </div>

            <div className="mt-3 text-[16px] font-semibold text-slate-600 dark:text-slate-300">
                흐름: {trendLabel}
            </div>
        </div>
    );
}

export default memo(CoachStatCard);
