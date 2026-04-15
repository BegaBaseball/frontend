import { type ComponentType, type SVGProps } from 'react';
import {
    CoachAnalysisData,
    CoachMetric,
    CoachRiskItem,
    DashboardStat,
} from '../../api/coach';
import CoachStatCard from './CoachStatCard';
import CoachMetricCard from './CoachMetricCard';
import {
    PredictionBarChartIcon,
    PredictionCheckCircleIcon,
    PredictionCrosshairIcon,
    PredictionEyeIcon,
    PredictionGavelIcon,
    PredictionHelpCircleIcon,
    PredictionRadarIcon,
    PredictionTrophyIcon,
    PredictionWarningTriangleIcon,
} from './PredictionShellIcons';

interface CoachAnalysisResultViewProps {
    analysisData: CoachAnalysisData | null;
}

interface InsightSectionProps {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    title: string;
    items: string[];
}

function InsightSection({ icon: Icon, title, items }: InsightSectionProps) {
    if (items.length === 0) {
        return null;
    }

    return (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2">
                <Icon aria-hidden="true" className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h4>
            </div>
            <div className="space-y-2">
                {items.map((item, idx) => (
                    <p key={`${title}-${idx}`} className="text-[16px] leading-relaxed text-gray-700 dark:text-gray-300">
                        {item}
                    </p>
                ))}
            </div>
        </div>
    );
}

function RiskSection({ risks, isReviewMode }: { risks: CoachRiskItem[]; isReviewMode: boolean }) {
    if (risks.length === 0) {
        return null;
    }

    const levelClassName = (level: CoachRiskItem['level']) => {
        if (level === 0) {
            return 'border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300';
        }
        if (level === 1) {
            return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300';
        }
        return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <PredictionWarningTriangleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
                <div>
                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">리스크 관리 포인트</h4>
                    <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
                        {isReviewMode ? '실제 결과에 영향을 준 위험 구간입니다.' : '경기 전개에서 즉시 확인이 필요한 구간입니다.'}
                    </p>
                </div>
            </div>
            <div className="space-y-3">
                {risks.map((risk, idx) => (
                    <div
                        key={`risk-${idx}`}
                        className={`rounded-xl border p-4 text-[16px] leading-relaxed shadow-sm ${levelClassName(risk.level)}`}
                    >
                        <p className="mb-1 text-[16px] font-bold uppercase opacity-80">{risk.area}</p>
                        <p>{risk.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function CoachAnalysisResultView({ analysisData }: CoachAnalysisResultViewProps) {
    if (!analysisData) return null;

    const isReviewMode = analysisData.game_status_bucket === 'COMPLETED';
    const isPositive = analysisData.dashboard.sentiment === 'positive';
    const criticalFactors = analysisData.metrics.filter((metric: CoachMetric) => metric.risk_level === 0);
    const strategicFactors = analysisData.metrics.filter((metric: CoachMetric) => metric.risk_level !== 0);
    const hasAnyMetric = criticalFactors.length > 0 || strategicFactors.length > 0;
    const hasDetailedReport = Boolean(analysisData.detailed_analysis) || Boolean(analysisData.coach_note);

    return (
        <div
            role="article"
            className="space-y-8 pb-10"
        >
            <div
                className={`rounded-2xl border p-6 sm:p-8 shadow-sm ${
                    isPositive
                        ? 'border-emerald-200/80 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                        : 'border-red-200/80 bg-red-50/40 dark:border-red-900/40 dark:bg-red-950/20'
                }`}
            >
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[16px] font-bold ${
                    isPositive
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                }`}>
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {isPositive ? '우세 신호' : '주의 신호'}
                </span>

                <div className="mt-5 mb-8">
                    <h3 className="mb-4 flex items-center gap-3 text-xl font-bold leading-tight text-gray-900 dark:text-white sm:text-2xl">
                        {isPositive ? (
                            <PredictionTrophyIcon aria-hidden="true" className="h-8 w-8 shrink-0 text-emerald-500" />
                        ) : (
                            <PredictionWarningTriangleIcon aria-hidden="true" className="h-8 w-8 shrink-0 text-red-500" />
                        )}
                        <span>{analysisData.dashboard.headline}</span>
                    </h3>
                    <p className="text-[16px] font-bold leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
                        {analysisData.dashboard.context}
                    </p>
                </div>

                {analysisData.dashboard.stats.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {analysisData.dashboard.stats.map((stat: DashboardStat, idx: number) => (
                            <CoachStatCard key={idx} stat={stat} />
                        ))}
                    </div>
                )}
            </div>

            {(analysisData.verdict || analysisData.analysis_summary) && (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-3 flex items-center gap-3">
                                <div className="rounded-xl bg-gray-100 p-2 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                                    <PredictionGavelIcon aria-hidden="true" className="h-4 w-4" />
                                </div>
                            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{isReviewMode ? '결과 진단' : '코치 판단'}</h4>
                        </div>
                        <p className="text-base font-bold leading-relaxed text-gray-900 dark:text-white">
                            {analysisData.verdict || analysisData.analysis_summary}
                        </p>
                    </div>

                    {analysisData.analysis_summary && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <div className="mb-3 flex items-center gap-3">
                                <div className="rounded-xl bg-gray-100 p-2 text-gray-700 dark:bg-gray-900/40 dark:text-gray-200">
                                    <PredictionRadarIcon aria-hidden="true" className="h-4 w-4" />
                                </div>
                                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{isReviewMode ? '경기 요약' : '한 줄 요약'}</h4>
                            </div>
                            <p className="text-[16px] leading-relaxed text-gray-700 dark:text-gray-300">
                                {analysisData.analysis_summary}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {hasAnyMetric && (
                <div className="space-y-10">
                    {criticalFactors.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <PredictionWarningTriangleIcon aria-hidden="true" className="h-5 w-5 text-red-500" />
                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{isReviewMode ? '결과를 가른 변수' : '즉시 확인할 변수'}</h4>
                                    <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
                                        {isReviewMode ? '실제 경기 흐름에 가장 큰 영향을 준 항목입니다.' : '경기 흐름에 가장 큰 영향을 줄 수 있는 항목입니다.'}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {criticalFactors.map((item: CoachMetric, idx: number) => (
                                    <CoachMetricCard key={`risk-${idx}`} data={item} />
                                ))}
                            </div>
                        </div>
                    )}

                    {strategicFactors.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <PredictionCheckCircleIcon aria-hidden="true" className="h-5 w-5 text-emerald-500" />
                                <div>
                                    <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{isReviewMode ? '결과로 이어진 우위 지표' : '우위 근거 지표'}</h4>
                                    <p className="mt-0.5 text-[16px] text-gray-500 dark:text-gray-400">
                                        {isReviewMode ? '실제 결과로 연결된 강점이 보인 항목입니다.' : '지속적으로 관리할 수 있는 장점이 보이는 항목입니다.'}
                                    </p>
                                </div>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {strategicFactors.map((item: CoachMetric, idx: number) => (
                                    <CoachMetricCard key={`norm-${idx}`} data={item} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
                <InsightSection
                    icon={PredictionBarChartIcon}
                    title={isReviewMode ? '결과를 가른 이유' : '왜 중요한가'}
                    items={analysisData.why_it_matters}
                />
                <InsightSection
                    icon={PredictionCrosshairIcon}
                    title={isReviewMode ? '실제 전환점' : '승부 스윙 포인트'}
                    items={analysisData.swing_factors}
                />
                <InsightSection
                    icon={PredictionEyeIcon}
                    title={isReviewMode ? '다시 볼 장면' : '체크 포인트'}
                    items={analysisData.watch_points}
                />
                <InsightSection
                    icon={PredictionHelpCircleIcon}
                    title="불확실성"
                    items={analysisData.uncertainty}
                />
                <InsightSection
                    icon={PredictionCheckCircleIcon}
                    title={isReviewMode ? '잘 풀린 지점' : '강점 유지 포인트'}
                    items={analysisData.strengths}
                />
                <InsightSection
                    icon={PredictionWarningTriangleIcon}
                    title={isReviewMode ? '흔들린 지점' : '약점 관리 포인트'}
                    items={analysisData.weaknesses}
                />
            </div>

            <RiskSection risks={analysisData.risks} isReviewMode={isReviewMode} />

            {hasDetailedReport && (
                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                        <PredictionBarChartIcon aria-hidden="true" className="h-5 w-5 text-blue-500" />
                        <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">상세 리포트</h4>
                    </div>

                    {analysisData.detailed_analysis && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <p className="whitespace-pre-line text-[16px] leading-relaxed text-gray-700 dark:text-gray-300">
                                {analysisData.detailed_analysis}
                            </p>
                        </div>
                    )}

                    {analysisData.coach_note && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                            <p className="mb-1 text-[16px] font-bold text-gray-900 dark:text-gray-100">코치의 한마디</p>
                            <p className="whitespace-pre-line text-[16px] leading-relaxed text-gray-700 dark:text-gray-300">
                                {analysisData.coach_note}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
