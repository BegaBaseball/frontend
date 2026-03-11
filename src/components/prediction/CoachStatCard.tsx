import { motion } from 'framer-motion';
import { AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { DashboardStat } from '../../api/coach';

const trendTextClass: Record<DashboardStat['trend'], string> = {
    up: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/80 dark:border-emerald-900/40',
    down: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200/80 dark:border-red-900/40',
    neutral: 'text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
};

const isCriticalClass = 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-950/30';

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            ease: "easeOut"
        }
    }
} as const;

export default function CoachStatCard({ stat }: { stat: DashboardStat }) {
    const trendLabel = stat.trend === 'up'
        ? '상향'
        : stat.trend === 'down'
            ? '하향'
            : '보통';
    const statusLabel = stat.status === 'good'
        ? '우세'
        : stat.status === 'danger'
            ? '주의'
            : '경계';

    return (
        <motion.div
            variants={itemVariants}
            className="rounded-2xl border bg-white p-5 shadow-sm transition-colors dark:bg-gray-900"
        >
            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-sm font-semibold tracking-wide text-gray-600 dark:text-gray-300 uppercase">
                    {stat.label}
                </span>
                {stat.is_critical && (
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${isCriticalClass}`}>
                        <AlertTriangle className="w-3.5 h-3.5 mr-1" />주의
                    </span>
                )}
            </div>

            <div className="flex items-baseline gap-2 mt-1 relative z-10">
                <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                </span>
            </div>

            <div className={`mt-4 inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${trendTextClass[stat.trend]}`}>
                {stat.trend === 'up' && <ArrowUpRight className="h-3.5 w-3.5" />}
                {stat.trend === 'down' && <ArrowDownRight className="h-3.5 w-3.5" />}
                <span>{statusLabel}</span>
            </div>

            <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {trendLabel} 추세
            </div>
        </motion.div>
    );
}
