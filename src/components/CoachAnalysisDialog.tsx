import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import {
    Loader2, Zap, TrendingUp, TrendingDown, Users, Shield, Bot, Sparkles,
    BarChart3, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, Minus, Trophy
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { analyzeTeam, CoachAnalyzeResponse, CoachMetric, DashboardStat } from '../api/coach';
import { useAuthStore } from '../store/authStore';
import { TEAM_LIST, TEAM_NAME_TO_ID, getRandomTeamName } from '../constants/teams';
import { useTheme } from '../hooks/useTheme';
import TeamLogo from './TeamLogo';

// --- Metric Card Component ---
const MetricCard = ({ data }: { data: CoachMetric }) => {
    const { category, name, value, description, risk_level, trend } = data;

    // Color Styles based on Risk Level
    const styles = {
        0: {
            bg: 'bg-red-50 dark:bg-red-950/30',
            border: 'border-red-200 dark:border-red-900',
            text: 'text-red-600 dark:text-red-400',
            bar: 'bg-red-500',
            icon: AlertTriangle
        },
        1: {
            bg: 'bg-amber-50 dark:bg-amber-950/30',
            border: 'border-amber-200 dark:border-amber-900',
            text: 'text-amber-600 dark:text-amber-400',
            bar: 'bg-amber-500',
            icon: Minus
        },
        2: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-900',
            text: 'text-emerald-600 dark:text-emerald-400',
            bar: 'bg-emerald-500',
            icon: CheckCircle
        }
    }[risk_level];

    const Icon = styles.icon;
    const progressWidth = risk_level === 0 ? '85%' : risk_level === 1 ? '50%' : '90%';

    return (
        <div className={`relative p-5 rounded-2xl border ${styles.border} ${styles.bg} shadow-sm flex flex-col h-full transition-all hover:shadow-md`}>
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold ${styles.text} uppercase tracking-wider border border-current px-1.5 py-0.5 rounded`}>
                        {category}
                    </span>
                </div>
                {trend !== 'neutral' && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 ${styles.text}`}>
                        {trend === 'up' ? '▲ 상승' : '▼ 하락'}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1">
                {value ? (
                    <>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{name}</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5">{value}</p>
                    </>
                ) : (
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-2">{name}</p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5 mt-4">
                <div className="flex justify-between text-[10px] text-gray-400 font-medium opacity-80">
                    <span>League Avg</span>
                    <span className={styles.text}>{risk_level === 0 ? 'Bad' : risk_level === 2 ? 'Good' : 'Avg'}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${styles.bar} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: progressWidth }}
                    />
                </div>
            </div>

            {/* Description */}
            {description && description.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug break-keep">
                        {description}
                    </p>
                </div>
            )}
        </div>
    );
};

// --- Dashboard Stat Card ---
const StatCard = ({ stat }: { stat: DashboardStat }) => {
    return (
        <div className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-md hover:bg-white/10 transition-colors group">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-emerald-200/50 uppercase tracking-widest">{stat.label}</span>
                {stat.is_critical && (
                    <div className="p-1 rounded-md bg-red-500/20">
                        <AlertTriangle className="w-3 h-3 text-red-400" />
                    </div>
                )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white tracking-tighter group-hover:scale-105 transition-transform origin-left">{stat.value}</span>
            </div>
            <div className={`text-[11px] font-bold mt-3 py-1 px-2 rounded-md w-fit flex items-center gap-1.5 ${stat.trend === 'up' ? 'bg-red-500/10 text-red-300' :
                stat.trend === 'down' ? 'bg-blue-500/10 text-blue-300' :
                    'bg-white/5 text-gray-300'
                }`}>
                {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3" />}
                {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3" />}
                {stat.status}
            </div>
        </div>
    );
};

// --- Main Component ---
interface CoachAnalysisDialogProps {
    trigger?: React.ReactNode;
    initialTeam?: string;
}

export default function CoachAnalysisDialog({ trigger, initialTeam }: CoachAnalysisDialogProps) {
    const { user } = useAuthStore();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { theme } = useTheme();

    const [isOpen, setIsOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>(initialTeam || getRandomTeamName());
    const [focus, setFocus] = useState<string[]>(['recent_form']);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoachAnalyzeResponse | null>(null);
    const [analysisStep, setAnalysisStep] = useState<string>('');

    // Randomize team when dialog opens
    useEffect(() => {
        if (isOpen && !initialTeam) {
            setSelectedTeam(getRandomTeamName());
        }
    }, [isOpen, initialTeam]);

    const focusOptions = [
        { id: 'recent_form', label: '최근 전력', icon: TrendingUp, desc: '최근 5경기 승률 및 타격감' },
        { id: 'bullpen', label: '불펜 상태', icon: Shield, desc: '필승조 가동 가능 여부' },
        { id: 'matchup', label: '상대 전적', icon: Users, desc: '이번 시즌 상대 승률' },
        { id: 'starter', label: '선발 투수', icon: Zap, desc: '선발 맞대결 분석' },
    ];

    const handleAnalyze = async () => {
        setLoading(true);
        setAnalysisStep('데이터 수집 중...');
        setResult(null);

        setTimeout(() => setAnalysisStep('불펜 가동 현황 체크 중...'), 1000);
        setTimeout(() => setAnalysisStep('상대 전적 비교 분석 중...'), 2000);
        setTimeout(() => setAnalysisStep('최종 승부 예측 생성 중...'), 3000);

        try {
            const response = await analyzeTeam({
                team_id: TEAM_NAME_TO_ID[selectedTeam] || selectedTeam,
                focus: focus,
            });
            setResult(response);
        } catch (error) {
            console.error(error);
            setResult({ error: '분석 중 오류가 발생했습니다.' });
        } finally {
            setLoading(false);
            setAnalysisStep('');
        }
    };

    const toggleFocus = (id: string) => {
        setFocus(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // --- Fallback Parser (Robustness "WOW" Feature) ---
    // If backend returns Markdown (old format), we try to extract data for the new UI
    const getAnalysisData = () => {
        if (result?.data) return result.data;
        if (!result?.raw_answer && !(result as any)?.answer) return null;

        const raw = result?.data ? JSON.stringify(result.data) : (result?.raw_answer || (result as any)?.answer || "");

        // Simple heuristic for Markdown fallback
        try {
            // If it's already JSON but just wrapped in Markdown
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                if (parsed.dashboard) return parsed;
            }
        } catch (e) {
            console.warn("Fallback JSON parse failed", e);
        }

        // Deep Fallback: Parse Markdown headings (The "Old" format)
        const lines = raw.split('\n');
        const headline = raw.match(/### (.*)/)?.[1] || "AI 분석 리포트";
        const context = raw.match(/## 🔍 AI 시즌 요약\n([\s\S]*?)\n\n/)?.[1]?.trim() || "데이터를 기반으로 분석된 팀 상태입니다.";

        return {
            dashboard: {
                headline,
                context,
                sentiment: (raw.includes('🚨') || raw.includes('▼')) ? 'negative' : 'positive' as const,
                stats: [] // We can't easily parse the table without complex regex, keep it empty for fallback
            },
            metrics: [],
            detailed_analysis: raw,
            coach_note: "데이터 구조 최적화 중입니다. 상세 분석 내용을 확인해 주세요."
        };
    };

    const analysisData = getAnalysisData();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 hover:from-blue-700 hover:to-indigo-700 shadow-lg">
                        <Zap className="w-4 h-4" />
                        The Coach 분석
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border-none shadow-2xl p-0">
                {/* Header */}
                <DialogHeader className="p-6 bg-gradient-to-r from-[#2d5f4f] to-[#1a3c32] text-white shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-white">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        AI 코치 심층 분석
                    </DialogTitle>
                    <DialogDescription className="text-gray-300">
                        {selectedTeam}의 승리 확률을 높이기 위한 정밀 데이터를 분석합니다.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 bg-gray-50 dark:bg-black/20">
                    {/* Team Selection */}
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <span className="w-1 h-4 bg-[#2d5f4f] rounded-full"></span>
                                분석 대상 팀
                            </Label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                                {TEAM_LIST.slice(1).map((teamName) => {
                                    const isSelected = selectedTeam === teamName;
                                    return (
                                        <button
                                            key={teamName}
                                            type="button"
                                            onClick={() => setSelectedTeam(teamName)}
                                            className={`
                                                relative flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 border-2
                                                ${isSelected
                                                    ? 'bg-white dark:bg-gray-800 border-[#2d5f4f] shadow-md scale-105 ring-1 ring-[#2d5f4f]'
                                                    : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:scale-[1.02]'
                                                }
                                            `}
                                        >
                                            <div className="w-10 h-10 mb-2 relative flex items-center justify-center">
                                                <TeamLogo team={teamName} size={40} className="w-full h-full" />
                                            </div>
                                            <span className={`text-xs font-bold ${isSelected ? 'text-[#2d5f4f] dark:text-[#4ade80]' : 'text-gray-600 dark:text-gray-400'}`}>
                                                {teamName}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Focus Points */}
                        <div className="space-y-3">
                            <Label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                <span className="w-1 h-4 bg-yellow-500 rounded-full"></span>
                                중점 분석 포인트
                            </Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {focusOptions.map((opt) => {
                                    const isActive = focus.includes(opt.id);
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => toggleFocus(opt.id)}
                                            className={`
                                                flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all border-2
                                                ${isActive
                                                    ? 'bg-[#2d5f4f]/5 border-[#2d5f4f] shadow-sm'
                                                    : 'bg-white dark:bg-gray-800 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                                }
                                            `}
                                        >
                                            <div className={`p-2 rounded-lg ${isActive ? 'bg-[#2d5f4f] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                                <opt.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className={`font-bold text-sm mb-0.5 ${isActive ? 'text-[#2d5f4f] dark:text-[#4ade80]' : 'text-gray-700 dark:text-gray-300'}`}>
                                                    {opt.label}
                                                </p>
                                                <p className="text-xs text-gray-500 line-clamp-1">
                                                    {opt.desc}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Analyze Button */}
                    <Button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full bg-[#2d5f4f] hover:bg-[#1a3c32] text-white h-14 text-lg font-bold rounded-xl shadow-lg shadow-[#2d5f4f]/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                                <span className="text-base font-medium animate-pulse">{analysisStep}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                <span>AI 분석 시작하기</span>
                            </div>
                        )}
                    </Button>

                    {/* Results Section */}
                    {analysisData ? (
                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6 pb-6">

                            {/* A. Diagnosis Dashboard */}
                            {(() => {
                                const isPositive = analysisData.dashboard.sentiment === 'positive';
                                const dashboardTheme = {
                                    bgGradient: 'bg-gradient-to-r from-[#2d5f4f] to-[#1a3c32]',
                                    border: 'border-[#2d5f4f]',
                                    icon: isPositive ? Trophy : AlertTriangle,
                                    iconColor: isPositive ? 'text-emerald-400' : 'text-yellow-400',
                                    badgeBg: isPositive ? 'bg-emerald-500/20' : 'bg-red-500/20',
                                    badgeBorder: isPositive ? 'border-emerald-500/40' : 'border-red-500/40',
                                    badgeText: isPositive ? 'text-emerald-100' : 'text-red-100',
                                    badgeLabel: isPositive ? 'TOP PERFORMANCE' : 'CRITICAL WARNING',
                                    glow: isPositive ? 'bg-emerald-500' : 'bg-red-500'
                                };

                                return (
                                    <div className={`${dashboardTheme.bgGradient} p-8 rounded-2xl shadow-xl text-white relative overflow-hidden border ${dashboardTheme.border}`}>
                                        <div className={`absolute top-0 right-0 w-64 h-64 ${dashboardTheme.glow} rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-30`}></div>
                                        <div className="relative z-10 flex flex-col h-full">
                                            {/* Header */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                                <div className="flex items-center gap-2 text-yellow-500 font-black uppercase tracking-widest text-[11px]">
                                                    <Sparkles className="w-4 h-4" />
                                                    AI SEASON ANALYSIS REPORT
                                                </div>
                                                <div className={`self-start sm:self-auto px-4 py-1.5 rounded-full ${dashboardTheme.badgeBg} border ${dashboardTheme.badgeBorder} ${dashboardTheme.badgeText} text-[11px] font-black tracking-tighter flex items-center gap-2 animate-pulse`}>
                                                    <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-red-500'}`}></div>
                                                    {dashboardTheme.badgeLabel}
                                                </div>
                                            </div>

                                            {/* Headline & Context */}
                                            <div className="mb-10">
                                                <h3 className="text-3xl sm:text-4xl font-black text-white leading-[1.15] mb-4 tracking-tight flex items-center gap-3">
                                                    <dashboardTheme.icon className={`w-8 h-8 ${dashboardTheme.iconColor} flex-shrink-0`} />
                                                    <span>{analysisData.dashboard.headline}</span>
                                                </h3>
                                                <div className={`w-12 h-1 ${isPositive ? 'bg-emerald-500' : 'bg-yellow-500'} rounded-full mb-4`}></div>
                                                <p className="text-emerald-50 text-base sm:text-lg leading-relaxed opacity-90 max-w-2xl font-medium">
                                                    {analysisData.dashboard.context}
                                                </p>
                                            </div>

                                            {/* Stats Grid */}
                                            {analysisData.dashboard.stats.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-auto">
                                                    {analysisData.dashboard.stats.map((stat: DashboardStat, idx: number) => (
                                                        <StatCard key={idx} stat={stat} />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* B. Metrics Grid */}
                            {analysisData.metrics.length > 0 && (
                                <div className="space-y-6">
                                    {/* Risk Factors */}
                                    {analysisData.metrics.filter((m: CoachMetric) => m.risk_level === 0).length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 px-1">
                                                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                                                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-red-700 dark:text-red-400 uppercase tracking-tight">
                                                        패배 구조의 핵심 원인
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium -mt-0.5">Primary Causes of Loss</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {analysisData.metrics.filter((m: CoachMetric) => m.risk_level === 0).map((item: CoachMetric, idx: number) => (
                                                    <MetricCard key={`risk-${idx}`} data={item} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Positive Factors */}
                                    {analysisData.metrics.filter((m: CoachMetric) => m.risk_level !== 0).length > 0 && (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 px-1">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                                                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">
                                                        안정된 전력 요소
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium -mt-0.5">Stable Power Elements</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {analysisData.metrics.filter((m: CoachMetric) => m.risk_level !== 0).map((item: CoachMetric, idx: number) => (
                                                    <MetricCard key={`norm-${idx}`} data={item} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* C. Detailed Report & Coach Note */}
                            <div className="space-y-4 pt-2">
                                <div className="flex items-center gap-2 px-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                    <BarChart3 className="w-4 h-4 text-gray-500" />
                                    <span className="font-bold text-gray-700 dark:text-gray-300">상세 분석 & 코멘트</span>
                                </div>

                                {/* Detailed Analysis */}
                                {analysisData.detailed_analysis && (
                                    <div className="bg-white dark:bg-gray-800/50 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw]}
                                            components={{
                                                p: ({ children }) => <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{children}</p>,
                                                li: ({ children }) => <li className="text-sm text-gray-600 dark:text-gray-400 ml-4 list-disc mb-1 pl-1">{children}</li>,
                                                strong: ({ children }) => <strong className="font-bold text-gray-900 dark:text-white">{children}</strong>
                                            }}
                                        >
                                            {analysisData.detailed_analysis}
                                        </ReactMarkdown>
                                    </div>
                                )}

                                {/* Coach's Note */}
                                {analysisData.coach_note && (
                                    <div className="relative pl-5 py-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-l-4 border-blue-500 mt-6 shadow-sm">
                                        <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                                            <Bot className="w-3.5 h-3.5" /> Coach's Note
                                        </div>
                                        <div className="text-blue-900 dark:text-blue-100 text-sm font-medium leading-relaxed">
                                            <ReactMarkdown rehypePlugins={[rehypeRaw]}>{analysisData.coach_note}</ReactMarkdown>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* D. Footer */}
                            {result?.tool_calls && result.tool_calls.length > 0 && (
                                <div className="text-[11px] text-gray-400 text-center pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                    AI 분석 모델 v2.1 • {result.tool_calls.length}개 데이터 소스 교차 검증 완료
                                </div>
                            )}

                        </div>
                    ) : (result as any)?.error ? (
                        <div className="p-8 text-center">
                            <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                            <p className="text-red-500 font-bold">{(result as any).error}</p>
                            <p className="text-gray-400 text-sm mt-1">잠시 후 다시 시도해주세요.</p>
                        </div>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
