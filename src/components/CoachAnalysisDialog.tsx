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
import { TEAM_LIST, TEAM_NAME_TO_ID, getRandomTeamName, TEAM_DATA } from '../constants/teams';
import { useTheme } from '../hooks/useTheme';
import TeamLogo from './TeamLogo';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animation Variants ---
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
} as const;

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

// --- Metric Card Component ---
const MetricCard = ({ data }: { data: CoachMetric }) => {
    const { category, name, value, description, risk_level, trend } = data;

    // Color Styles based on Risk Level
    const styles = {
        0: {
            bg: 'bg-red-50/80 dark:bg-red-950/20',
            border: 'border-red-200/50 dark:border-red-900/30',
            text: 'text-red-700 dark:text-red-400',
            bar: 'bg-red-500',
            shadow: 'rgba(239, 68, 68, 0.4)',
            icon: AlertTriangle
        },
        1: {
            bg: 'bg-amber-50/80 dark:bg-amber-950/20',
            border: 'border-amber-200/50 dark:border-amber-900/30',
            text: 'text-amber-700 dark:text-amber-400',
            bar: 'bg-amber-500',
            shadow: 'rgba(245, 158, 11, 0.4)',
            icon: Minus
        },
        2: {
            bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
            border: 'border-emerald-200/50 dark:border-emerald-900/30',
            text: 'text-emerald-700 dark:text-emerald-400',
            bar: 'bg-emerald-500',
            shadow: 'rgba(16, 185, 129, 0.4)',
            icon: CheckCircle
        }
    }[risk_level];

    const progressWidth = risk_level === 0 ? '85%' : risk_level === 1 ? '50%' : '90%';

    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
            className={`relative p-5 rounded-2xl border ${styles.border} ${styles.bg} backdrop-blur-sm flex flex-col h-full transition-all group overflow-hidden`}
        >
            <div className={`absolute top-0 right-0 w-24 h-24 ${styles.bar} opacity-[0.03] rounded-full blur-2xl -translate-y-1/2 translate-x-1/2`} />

            {/* Header */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black ${styles.text} uppercase tracking-widest border border-current px-1.5 py-0.5 rounded`}>
                        {category}
                    </span>
                </div>
                {trend !== 'neutral' && (
                    <div className={`flex items-center gap-0.5 text-[10px] font-black px-2.5 py-1 rounded-full bg-white/80 dark:bg-black/40 shadow-sm ${styles.text}`}>
                        {trend === 'up' ? '▲ 상승' : '▼ 하락'}
                    </div>
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10">
                {value ? (
                    <>
                        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 truncate tracking-tight">{name}</p>
                        <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter mt-1">{value}</p>
                    </>
                ) : (
                    <p className="text-lg font-black text-gray-900 dark:text-white mt-2 tracking-tight">{name}</p>
                )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mt-5 relative z-10">
                <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest opacity-70">
                    <span>리그 평균 대비 지표</span>
                    <span className={styles.text}>{risk_level === 0 ? '주의' : risk_level === 2 ? '최상' : '안정'}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: progressWidth }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                        className={`h-full ${styles.bar} rounded-full`}
                        style={{ boxShadow: `0 0 8px ${styles.shadow}` }}
                    />
                </div>
            </div>

            {/* Description */}
            {description && description.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-700/30 relative z-10">
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium break-keep">
                        {description}
                    </p>
                </div>
            )}
        </motion.div>
    );
};

// --- Dashboard Stat Card ---
const StatCard = ({ stat }: { stat: DashboardStat }) => {
    return (
        <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.12)" }}
            className="bg-white/5 rounded-2xl p-5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all group relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[10px] font-black text-emerald-200/50 uppercase tracking-[0.2em]">{stat.label}</span>
                {stat.is_critical && (
                    <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="p-1.5 rounded-full bg-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                    >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    </motion.div>
                )}
            </div>
            <div className="flex items-baseline gap-2 mt-1 relative z-10">
                <span className="text-3xl font-black text-white tracking-tighter group-hover:text-emerald-300 transition-colors">{stat.value}</span>
            </div>
            <div className={`text-[11px] font-extrabold mt-4 py-1.5 px-3 rounded-xl w-fit flex items-center gap-2 border relative z-10 ${stat.trend === 'up' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                stat.trend === 'down' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' :
                    'bg-white/5 border-white/10 text-gray-300'
                }`}>
                {stat.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
                {stat.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
                {stat.status}
            </div>
        </motion.div>
    );
};

// --- Main Component ---
interface CoachAnalysisDialogProps {
    trigger?: React.ReactNode;
    initialTeam?: string;
}

export default function CoachAnalysisDialog({ trigger, initialTeam }: CoachAnalysisDialogProps) {
    const { user } = useAuthStore();
    const { theme } = useTheme();

    const getInitialTeamName = (teamId?: string) => {
        if (!teamId) return getRandomTeamName();
        // Try to match ID to full name from TEAM_DATA
        const data = TEAM_DATA[teamId];
        if (data && data.fullName !== '없음') return data.fullName;
        // Fallback for names that might already be full or short
        return TEAM_LIST.find(t => t.includes(teamId)) || teamId;
    };

    const [isOpen, setIsOpen] = useState(false);
    const [selectedTeam, setSelectedTeam] = useState<string>(getInitialTeamName(initialTeam));
    const [focus, setFocus] = useState<string[]>(['recent_form']);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<CoachAnalyzeResponse | null>(null);
    const [analysisStep, setAnalysisStep] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedTeam(getInitialTeamName(initialTeam));
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
        setAnalysisStep('인공지능 보안 모듈 활성화 중...');
        setResult(null);

        const steps = [
            '구단별 실시간 기밀 데이터 수집 중...',
            '해당 팀 투구/타격 기저 데이터 분석 중...',
            '최근 페이스 및 컨디션 로직 연산 중...',
            '상대 팀 데이터 매칭 및 확률 계산 중...',
            '최종 전략 전술 시나리오 생성 중...'
        ];

        let i = 0;
        const interval = setInterval(() => {
            if (i < steps.length) {
                setAnalysisStep(steps[i]);
                i++;
            } else {
                clearInterval(interval);
            }
        }, 800);

        try {
            // Streaming Implementation
            await analyzeTeam({
                team_id: TEAM_NAME_TO_ID[selectedTeam] || selectedTeam,
                focus: focus,
            }, (currentText) => {
                // Real-time update
                setResult({ answer: currentText });
            }).then(finalResult => {
                setResult(finalResult);
            });

        } catch (error) {
            console.error(error);
            setResult({ error: '분석 중 오류가 발생했습니다.' });
        } finally {
            setLoading(false);
            setAnalysisStep('');
            clearInterval(interval);
        }
    };

    const toggleFocus = (id: string) => {
        setFocus(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const getAnalysisData = () => {
        if (result?.data) return result.data;

        // Priority 1: Use structuredData from meta event (pre-parsed by backend)
        if (result?.structuredData) {
            const structured = result.structuredData;
            return {
                dashboard: {
                    headline: structured.headline || 'AI 분석 리포트',
                    context: structured.detailed_markdown || '데이터를 기반으로 분석된 팀 상태입니다.',
                    sentiment: structured.sentiment || 'neutral',
                    stats: structured.key_metrics?.map(m => ({
                        label: m.label,
                        value: m.value,
                        status: m.status,
                        trend: m.trend,
                        is_critical: m.is_critical
                    })) || []
                },
                metrics: structured.key_metrics?.map(m => ({
                    category: '핵심지표',
                    name: m.label,
                    value: m.value,
                    description: '',
                    risk_level: m.status === 'danger' ? 0 : m.status === 'warning' ? 1 : 2,
                    trend: m.trend
                })) || [],
                detailed_analysis: structured.detailed_markdown || '',
                coach_note: structured.coach_note || ''
            };
        }

        if (!result?.raw_answer && !(result as any)?.answer) return null;

        const raw = result?.data ? JSON.stringify(result.data) : (result?.raw_answer || (result as any)?.answer || "");

        try {
            const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                if (parsed.dashboard) return parsed;

                // Handle CoachResponse schema (headline, sentiment, etc.)
                if (parsed.headline) {
                    return {
                        dashboard: {
                            headline: parsed.headline,
                            context: parsed.detailed_markdown || '',
                            sentiment: parsed.sentiment || 'neutral',
                            stats: parsed.key_metrics?.map((m: any) => ({
                                label: m.label,
                                value: m.value,
                                status: m.status,
                                trend: m.trend,
                                is_critical: m.is_critical
                            })) || []
                        },
                        metrics: parsed.key_metrics?.map((m: any) => ({
                            category: '핵심지표',
                            name: m.label,
                            value: m.value,
                            description: '',
                            risk_level: m.status === 'danger' ? 0 : m.status === 'warning' ? 1 : 2,
                            trend: m.trend
                        })) || [],
                        detailed_analysis: parsed.detailed_markdown || '',
                        coach_note: parsed.coach_note || ''
                    };
                }
            }
        } catch (e) {
            console.warn("Fallback JSON parse failed", e);
        }

        const rawHeadline = raw.match(/### (.*)/)?.[1] || "AI 분석 리포트";
        const headline = rawHeadline.replace(/[\*_~\[\]]/g, '').trim();
        const context = raw.match(/## 🔍 AI 시즌 요약\n([\s\S]*?)\n\n/)?.[1]?.trim() || "데이터를 기반으로 분석된 팀 상태입니다.";

        return {
            dashboard: {
                headline,
                context,
                sentiment: (raw.includes('🚨') || raw.includes('▼')) ? 'negative' : 'positive' as const,
                stats: []
            },
            metrics: [],
            detailed_analysis: raw,
            coach_note: "기존 형식의 데이터가 감지되었습니다. 상세 리포트를 참고해주세요."
        };
    };

    const analysisData = getAnalysisData();

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white border-0 hover:from-emerald-700 hover:to-emerald-800 shadow-lg shadow-emerald-500/20 px-8 h-12 rounded-full font-bold tracking-tight">
                        <Zap className="w-4 h-4 fill-white" />
                        AI 코치 상세 분석
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-[#0a0a0a] border-none shadow-[0_32px_128px_-16px_rgba(0,0,0,0.5)] p-0">
                {/* Custom Header with Team Color Accent */}
                <DialogHeader className="p-8 pb-12 bg-[#2d5f4f] text-white shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    <DialogTitle className="flex items-center gap-3 text-2xl font-black text-white relative z-10 tracking-tight">
                        <motion.div
                            animate={{ rotate: [0, 15, 0, -15, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                        >
                            <Sparkles className="w-7 h-7 text-yellow-300 fill-yellow-300/20" />
                        </motion.div>
                        AI 코치 · 딥 스카우팅
                    </DialogTitle>
                    <DialogDescription className="text-emerald-100/70 font-bold uppercase tracking-[0.2em] text-[11px] relative z-10 mt-2 ml-1">
                        {selectedTeam} 전략 및 지표 분석 중
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 bg-gray-50/50 dark:bg-black/40 -mt-6 rounded-t-3xl relative z-20">
                    {/* Team Selection Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6"
                    >
                        <div className="flex items-center justify-between px-1">
                            <Label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2d5f4f]"></span>
                                분석 대상 팀 선택
                            </Label>
                        </div>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            {TEAM_LIST.slice(1).map((teamName) => {
                                const isSelected = selectedTeam === teamName;
                                return (
                                    <motion.button
                                        key={teamName}
                                        type="button"
                                        whileHover={{ y: -2 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedTeam(teamName)}
                                        className={`
                                            relative flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 border
                                            ${isSelected
                                                ? 'bg-white dark:bg-gray-800 border-[#2d5f4f]/30 shadow-xl shadow-[#2d5f4f]/10 scale-105 ring-2 ring-[#2d5f4f]'
                                                : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                            }
                                        `}
                                    >
                                        <div className="w-12 h-12 mb-3 relative flex items-center justify-center">
                                            <TeamLogo team={teamName} size={48} className={`w-full h-full transition-all duration-500 ${isSelected ? 'scale-110 drop-shadow-md' : 'opacity-60 grayscale-[0.5]'}`} />
                                        </div>
                                        <span className={`text-[11px] font-black tracking-tight ${isSelected ? 'text-[#2d5f4f] dark:text-[#4ade80]' : 'text-gray-500'}`}>
                                            {teamName}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Focus Points Section */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="space-y-6"
                    >
                        <Label className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 px-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                            분석 집중 항목
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {focusOptions.map((opt) => {
                                const isActive = focus.includes(opt.id);
                                return (
                                    <motion.div
                                        key={opt.id}
                                        whileHover={{ x: 3 }}
                                        onClick={() => toggleFocus(opt.id)}
                                        className={`
                                            flex items-start gap-4 p-5 rounded-2xl cursor-pointer transition-all border
                                            ${isActive
                                                ? 'bg-white dark:bg-emerald-950/10 border-[#2d5f4f]/30 shadow-lg shadow-[#2d5f4f]/5 ring-1 ring-[#2d5f4f]'
                                                : 'bg-white dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'
                                            }
                                        `}
                                    >
                                        <div className={`p-3 rounded-xl transition-colors ${isActive ? 'bg-[#2d5f4f] text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                            <opt.icon className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className={`font-black text-sm mb-1 tracking-tight ${isActive ? 'text-[#2d5f4f] dark:text-[#4ade80]' : 'text-gray-700 dark:text-gray-300'}`}>
                                                {opt.label}
                                            </p>
                                            <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                                                {opt.desc}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Action Button Section with Matrix Scanning Effect */}
                    <div className="relative group p-1">
                        <AnimatePresence>
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 z-10 rounded-2xl bg-[#2d5f4f]/20 pointer-events-none overflow-hidden"
                                >
                                    <motion.div
                                        animate={{ top: ['-10%', '110%'] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 right-0 h-[20%] bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent"
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <Button
                            onClick={handleAnalyze}
                            disabled={loading}
                            className="w-full bg-[#2d5f4f] hover:bg-[#1a3c32] text-white h-16 text-xl font-black rounded-2xl shadow-2xl shadow-[#2d5f4f]/30 transition-all active:scale-[0.98] group overflow-hidden relative"
                        >
                            <span className="absolute inset-0 bg-white/5 translate-y-16 group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                            {loading ? (
                                <div className="flex items-center gap-4 relative z-10">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Loader2 className="h-6 w-6 text-yellow-300" />
                                    </motion.div>
                                    <span className="text-lg font-bold tracking-tight animate-pulse">{analysisStep}</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 relative z-10 px-4">
                                    <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300 transition-transform group-hover:scale-125 group-hover:rotate-12" />
                                    <span className="uppercase tracking-widest">AI 시뮬레이션 실행</span>
                                </div>
                            )}
                        </Button>
                    </div>

                    {/* Results Presentation (AnimatePresence for smooth swap) */}
                    <AnimatePresence mode="wait">
                        {analysisData && (
                            <motion.div
                                key="analysis-results"
                                variants={containerVariants}
                                initial="hidden"
                                animate="visible"
                                className="space-y-8 pb-10"
                            >
                                {/* A. Diagnosis Dashboard - Visual Masterpiece */}
                                {(() => {
                                    const isPositive = analysisData.dashboard.sentiment === 'positive';
                                    return (
                                        <motion.div
                                            variants={itemVariants}
                                            className="bg-gradient-to-br from-[#1a3c32] to-[#0a0f0d] p-10 rounded-3xl shadow-2xl text-white relative overflow-hidden border border-white/5"
                                        >
                                            {/* Immersive background effects */}
                                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none opacity-40" />
                                            <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                                            <div className="relative z-10">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                                                    <div className="flex items-center gap-3 text-yellow-400 font-black uppercase tracking-[0.3em] text-[10px]">
                                                        <Sparkles className="w-5 h-5 animate-pulse" />
                                                        STRATEGIC ANALYSIS ALPHA-VER 3.0
                                                    </div>
                                                    <motion.div
                                                        animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                        className={`self-start sm:self-auto px-4 py-2 rounded-full ${isPositive ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-red-500/20 border-red-500/40 text-red-300'} border text-[10px] font-black tracking-widest uppercase flex items-center gap-2`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                                                        {isPositive ? '최상 상태' : '위기 예보'}
                                                    </motion.div>
                                                </div>

                                                <div className="mb-12">
                                                    <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tighter mb-6 flex items-center gap-4">
                                                        {isPositive ? <Trophy className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] shrink-0" /> : <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 shrink-0" />}
                                                        <span className="truncate">{analysisData.dashboard.headline}</span>
                                                    </h3>
                                                    <div className="w-20 h-1.5 bg-yellow-400 rounded-full mb-6 shadow-[0_0_12px_#facc15]" />
                                                    <p className="text-emerald-50/80 text-lg sm:text-xl leading-relaxed max-w-2xl font-bold tracking-tight">
                                                        {analysisData.dashboard.context}
                                                    </p>
                                                </div>

                                                {analysisData.dashboard.stats.length > 0 && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                        {analysisData.dashboard.stats.map((stat: DashboardStat, idx: number) => (
                                                            <StatCard key={idx} stat={stat} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    );
                                })()}

                                {/* B. Metrics Grid with Sections */}
                                <div className="space-y-12">
                                    {/* Critical Factors Section */}
                                    {analysisData.metrics.filter((m: CoachMetric) => m.risk_level === 0).length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-10 h-10 rounded-2xl bg-red-100/80 dark:bg-red-950/30 flex items-center justify-center border border-red-200/50 dark:border-red-800/20">
                                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                                                        주요 핵심 변수
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider -mt-0.5">즉각적인 확인이 필요한 주요 지표</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                {analysisData.metrics.filter((m: CoachMetric) => m.risk_level === 0).map((item: CoachMetric, idx: number) => (
                                                    <MetricCard key={`risk-${idx}`} data={item} />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Positive/Strategic Factors Section */}
                                    {analysisData.metrics.filter((m: CoachMetric) => m.risk_level !== 0).length > 0 && (
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 px-2">
                                                <div className="w-10 h-10 rounded-2xl bg-emerald-100/80 dark:bg-emerald-950/30 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/20">
                                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest">
                                                        전략적 강점 자산
                                                    </h4>
                                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider -mt-0.5">성리를 위해 활용해야 할 핵심 강점</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                                {analysisData.metrics.filter((m: CoachMetric) => m.risk_level !== 0).map((item: CoachMetric, idx: number) => (
                                                    <MetricCard key={`norm-${idx}`} data={item} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* C. Detailed Report & Coach Note - Glassmorphic Panels */}
                                <motion.div variants={itemVariants} className="space-y-6 pt-6">
                                    <div className="flex items-center gap-3 px-2">
                                        <BarChart3 className="w-5 h-5 text-[#2d5f4f]" />
                                        <span className="font-black text-gray-800 dark:text-gray-100 uppercase tracking-widest text-sm">인공지능 심층 분석 리포트</span>
                                    </div>

                                    {analysisData.detailed_analysis && (
                                        <div className="bg-white/80 dark:bg-[#121212] rounded-3xl p-8 border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeRaw]}
                                                components={{
                                                    p: ({ children }) => <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 font-medium">{children}</p>,
                                                    li: ({ children }) => <li className="text-sm text-gray-600 dark:text-gray-400 ml-5 list-disc mb-2 pl-2 font-medium">{children}</li>,
                                                    strong: ({ children }) => <strong className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{children}</strong>,
                                                    h3: ({ children }) => <h3 className="text-base font-black text-gray-900 dark:text-white mb-4 mt-6 border-b border-gray-100 dark:border-white/5 pb-2">{children}</h3>
                                                }}
                                            >
                                                {analysisData.detailed_analysis}
                                            </ReactMarkdown>
                                        </div>
                                    )}

                                    {analysisData.coach_note && (
                                        <motion.div
                                            whileHover={{ scale: 1.01 }}
                                            className="relative pl-6 py-8 pr-10 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-3xl border-l-8 border-emerald-500 mt-8 group"
                                        >
                                            <div className="absolute -top-4 left-6 bg-emerald-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg tracking-widest uppercase">
                                                <Bot className="w-3.5 h-3.5" /> 코치의 한마디
                                            </div>
                                            <div className="text-emerald-900/90 dark:text-emerald-100/90 text-sm font-bold leading-relaxed italic">
                                                <ReactMarkdown rehypePlugins={[rehypeRaw]}>{analysisData.coach_note}</ReactMarkdown>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>

                                {/* D. Footer - Technical Signature */}
                                {result?.tool_calls && (
                                    <motion.div variants={itemVariants} className="pt-10 flex flex-col items-center gap-3">
                                        <div className="h-px w-24 bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
                                        <div className="text-[9px] font-black text-gray-400 uppercase tracking-[0.4em] opacity-50">
                                            THE COACH AI CORE ENGINE v2.5.8-STABLE
                                        </div>
                                        <div className="text-[8px] text-gray-300 dark:text-gray-600 uppercase font-bold tracking-widest">
                                            데이터 상호 참조: {result.tool_calls.length}개 노드 · 연산 검증: 완료
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </DialogContent>
        </Dialog>
    );
}
