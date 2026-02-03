import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { Game, GameDetail } from '../types/prediction';
import { TEAM_DATA, TEAM_NAME_TO_ID } from '../constants/teams';
import CoachAnalysisDialog from './CoachAnalysisDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { analyzeTeam } from '../api/coach';

interface CoachBriefingProps {
    game: Game | null;
    gameDetail?: GameDetail | null;
    seasonContext?: {
        home: { rank: number; gamesBehind: number; remainingGames: number } | null;
        away: { rank: number; gamesBehind: number; remainingGames: number } | null;
        canCallAI: boolean;
        isMeaningfulGame: boolean;
    };
    totalVotes: number;
    isPastGame: boolean;
}

export default function CoachBriefing({ game, gameDetail, seasonContext, totalVotes, isPastGame }: CoachBriefingProps) {
    const [displayedMessage, setDisplayedMessage] = useState('');
    const [aiBriefing, setAiBriefing] = useState<{ title: string; message: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const cacheRef = useRef<Map<string, { title: string; message: string }>>(new Map());
    const canCallAI = seasonContext?.canCallAI ?? false;
    const isMeaningfulGame = seasonContext?.isMeaningfulGame ?? false;

    const briefingLabel = 'AI 분석 내용';

    const isMeaningfulMessage = (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return false;
        if (trimmed.length < 12) return false;
        if (/^\*\*\[.*\]\*\*$/.test(trimmed)) return false;
        if (/핵심\s*변수|승부\s*포인트|요약/.test(trimmed)) return false;

        const commaCount = (trimmed.match(/[,，]/g) || []).length;
        if (commaCount > 2) return false;

        const sentenceSplit = trimmed.split(/[.!?]/).filter((part) => part.trim().length > 0);
        if (sentenceSplit.length > 2) return false;

        return true;
    };

    const parseAiBriefing = (rawText: string) => {
        const lines = rawText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean);

        const titleIndex = lines.findIndex(line => line.startsWith('### '));
        const title = titleIndex >= 0
            ? lines[titleIndex].replace(/^###\s+/, '').replace(/[\*_~\[\]]/g, '').trim()
            : 'AI 코치 리포트';

        const message = lines.slice(titleIndex + 1).find(line => {
            if (line.startsWith('##') || line.startsWith('###')) return false;
            if (line.startsWith('|') || line.startsWith(':---')) return false;
            return true;
        }) || 'AI 분석 데이터를 준비 중입니다.';

        if (!isMeaningfulMessage(message)) {
            return null;
        }

        return { title, message };
    };

    const fallbackMessage = 'AI 분석 내용을 준비하지 못했습니다.';

    const buildPastPrompt = (homeTeamName: string, awayTeamName: string) => {
        const homeContext = seasonContext?.home;
        const awayContext = seasonContext?.away;
        const minContextReady = !!homeContext && !!awayContext;
        const homeScore = gameDetail?.homeScore ?? game?.homeScore;
        const awayScore = gameDetail?.awayScore ?? game?.awayScore;
        const scoreLine = (homeScore != null && awayScore != null)
            ? `스코어: ${awayTeamName} ${awayScore} - ${homeScore} ${homeTeamName}`
            : '스코어: 미상';
        const baseLines = [
            `너는 야구 해설위원이다. 지난 경기의 의미를 1~2문장으로 해설하라.`,
            `문장당 쉼표는 1개 이하, 과장 없이 진중한 분석 톤을 유지해라.`,
            `단순 스코어 요약은 금지다.`,
        ];

        if (!minContextReady || !isMeaningfulGame) {
            baseLines.push('판도를 논하기엔 이르다는 표현을 포함해라.');
        }

        const contextLines = [
            `경기: ${awayTeamName} vs ${homeTeamName}`,
            scoreLine,
            `맥락: 홈팀 순위 ${homeContext?.rank ?? '미상'}위, 승차 ${homeContext?.gamesBehind ?? '미상'}, 잔여 ${homeContext?.remainingGames ?? '미상'}경기`,
            `맥락: 원정팀 순위 ${awayContext?.rank ?? '미상'}위, 승차 ${awayContext?.gamesBehind ?? '미상'}, 잔여 ${awayContext?.remainingGames ?? '미상'}경기`,
            `의미도: ${isMeaningfulGame ? '높음' : '보통 이하'}`,
        ];

        return [...baseLines, ...contextLines].join('\n');
    };

    const buildPreviewPrompt = (homeTeamName: string, awayTeamName: string) => (
        `${homeTeamName} vs ${awayTeamName} 경기의 핵심 변수와 승부 포인트를 2문장으로 요약해줘.`
    );

    useEffect(() => {
        if (!game) {
            setAiBriefing(null);
            setAiLoading(false);
            return;
        }

        if (isPastGame && !canCallAI) {
            setAiBriefing(null);
            setAiLoading(false);
            return;
        }

        const cacheKey = `${game.gameId}-${isPastGame ? 'past' : 'preview'}`;
        const cached = cacheRef.current.get(cacheKey);
        if (cached) {
            setAiBriefing(cached);
            setAiLoading(false);
            return;
        }

        let active = true;
        const homeTeamName = TEAM_DATA[game.homeTeam]?.fullName || game.homeTeam;
        const awayTeamName = TEAM_DATA[game.awayTeam]?.fullName || game.awayTeam;
        const teamId = TEAM_NAME_TO_ID[homeTeamName] || game.homeTeam;
        const questionOverride = isPastGame
            ? buildPastPrompt(homeTeamName, awayTeamName)
            : buildPreviewPrompt(homeTeamName, awayTeamName);

        setAiBriefing(null);
        setAiLoading(true);
        analyzeTeam({
            team_id: teamId,
            focus: ['matchup', 'recent_form'],
            game_id: game.gameId,
            question_override: questionOverride,
        })
            .then((response) => {
                if (!active) return;
                const rawText = response.answer || response.raw_answer || '';
                if (!rawText) {
                    setAiBriefing(null);
                    return;
                }
                const parsed = parseAiBriefing(rawText);
                if (parsed) {
                    cacheRef.current.set(cacheKey, parsed);
                    setAiBriefing(parsed);
                } else {
                    setAiBriefing(null);
                }
            })
            .catch(() => {
                if (active) {
                    setAiBriefing(null);
                }
            })
            .finally(() => {
                if (active) {
                    setAiLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, [game?.gameId, isPastGame, canCallAI, isMeaningfulGame, seasonContext?.home, seasonContext?.away]);

    const activeTitle = aiBriefing?.title ?? briefingLabel;
    const activeMessage = aiLoading
        ? 'AI가 분석 중입니다. 잠시만 기다려주세요.'
        : (aiBriefing?.message ?? fallbackMessage);

    // Typewriter effect
    useEffect(() => {
        setDisplayedMessage('');
        let i = 0;
        const message = activeMessage;
        const timer = setInterval(() => {
            setDisplayedMessage(message.substring(0, i));
            i++;
            if (i > message.length) clearInterval(timer);
        }, 30);
        return () => clearInterval(timer);
    }, [activeMessage]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
        >
            <Card className="mb-6 overflow-hidden border border-white/10 shadow-2xl bg-gradient-to-br from-[#2d5f4f]/90 to-[#1a3c32]/95 backdrop-blur-xl relative group">
                {/* Background Sparkle Animations */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1],
                            rotate: [0, 45, 0]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                        className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl"
                    />
                    <motion.div
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.05, 0.1, 0.05],
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear", delay: 2 }}
                        className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/10 rounded-full blur-2xl"
                    />
                </div>

                <div className="p-6 flex flex-col sm:flex-row items-center gap-6 relative z-10 font-sans">
                    {/* Pulsing Persona Icon */}
                    <div className="flex-shrink-0 relative">
                        <motion.div
                            animate={{
                                boxShadow: ["0 0 0 0px rgba(253, 224, 71, 0)", "0 0 0 12px rgba(253, 224, 71, 0.1)", "0 0 0 0px rgba(253, 224, 71, 0)"]
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center shadow-lg ring-4 ring-black/5"
                        >
                            <Sparkles className="w-8 h-8 text-yellow-300 fill-yellow-300/20" />
                        </motion.div>
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.8, 1]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -bottom-0.5 -right-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1.5 border-2 border-[#1a3c32] shadow-md"
                        >
                            <TrendingUp className="w-3.5 h-3.5 text-white" />
                        </motion.div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 text-center sm:text-left">
                        <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                            <motion.span
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] uppercase tracking-wider font-extrabold"
                            >
                                {briefingLabel}
                            </motion.span>
                            {game && (
                                <span className="flex items-center gap-1.5 text-[10px] text-emerald-300/70 font-bold uppercase tracking-widest">
                                    <span className="flex h-1.5 w-1.5 relative">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    {aiLoading ? '데이터 분석 중...' : (isPastGame ? '맥락 분석 중' : '실시간 분석 중')}
                                </span>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.h4
                                key={activeTitle}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-xl md:text-2xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-md truncate"
                            >
                                {activeTitle}
                            </motion.h4>
                        </AnimatePresence>

                        <div className="min-h-[3rem]">
                            <p className="text-sm md:text-base text-emerald-50/90 leading-relaxed font-semibold">
                                {displayedMessage}
                                <motion.span
                                    animate={{ opacity: [1, 0, 1] }}
                                    transition={{ duration: 0.8, repeat: Infinity }}
                                    className="inline-block w-1 h-4 bg-yellow-400 ml-1 align-middle"
                                />
                            </p>
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="flex flex-col gap-3 items-end">
                        {game && (
                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                className="hidden sm:flex flex-col items-center justify-center bg-black/40 backdrop-blur-md rounded-2xl p-4 min-w-[110px] border border-white/10 shadow-inner"
                            >
                                <div className="flex items-center gap-1.5 mb-1 text-emerald-300/60">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">팬 참여도</span>
                                </div>
                                <span className="text-xl font-black text-white tabular-nums tracking-tighter">
                                    {totalVotes.toLocaleString()}
                                </span>
                            </motion.div>
                        )}

                        <div className="hidden sm:block w-full min-w-[130px]">
                            <CoachAnalysisDialog
                                initialTeam={game?.homeTeam}
                                trigger={
                                    <Button size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md rounded-xl py-5 transition-all hover:shadow-[0_0_20px_rgba(253,224,71,0.2)] active:scale-95 group">
                                        <Zap className="w-4 h-4 mr-2 text-yellow-300 fill-yellow-300 group-hover:scale-125 transition-transform" />
                                        <span className="text-xs font-bold uppercase tracking-tight">{game ? '상세 분석' : '전력 분석'}</span>
                                    </Button>
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile Button */}
                <div className="sm:hidden px-6 pb-6 pt-0 relative z-10">
                    <CoachAnalysisDialog
                        initialTeam={game?.homeTeam}
                        trigger={
                            <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md h-12 rounded-xl transition-all active:scale-95">
                                <Zap className="w-4 h-4 mr-2 text-yellow-300 fill-yellow-300" />
                                <span className="font-bold">{game ? 'AI 상세 리포트 보기' : '팀 전력 상세 분석'}</span>
                            </Button>
                        }
                    />
                </div>

                {/* Scanning Line Animation */}
                <motion.div
                    animate={{
                        top: ["-10%", "110%"]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent z-20 pointer-events-none"
                />
            </Card>
        </motion.div>
    );
}
