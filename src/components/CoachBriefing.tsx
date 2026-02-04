import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Zap } from 'lucide-react';
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
    };
    isPastGame: boolean;
}

export default function CoachBriefing({ game, gameDetail, seasonContext, isPastGame }: CoachBriefingProps) {
    const [displayedMessage, setDisplayedMessage] = useState('');
    const [aiBriefing, setAiBriefing] = useState<{ title: string; message: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const cacheRef = useRef<Map<string, { title: string; message: string }>>(new Map());
    const canCallAI = seasonContext?.canCallAI ?? false;

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
            : briefingLabel;

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
        const homeScore = gameDetail?.homeScore ?? game?.homeScore;
        const awayScore = gameDetail?.awayScore ?? game?.awayScore;
        const scoreLine = (homeScore != null && awayScore != null)
            ? `스코어 ${awayTeamName} ${awayScore}-${homeScore} ${homeTeamName}`
            : '스코어: 미상';
        const baseLines = [
            '너는 야구 해설위원이다. 1~2문장, 문장당 쉼표 1개 이하.',
            '단순 스코어 요약 금지.',
        ];

        const contextLine = `맥락: 순위 ${homeContext?.rank ?? '미상'}위/${awayContext?.rank ?? '미상'}위, 승차 ${homeContext?.gamesBehind ?? '미상'}/${awayContext?.gamesBehind ?? '미상'}, 잔여 ${homeContext?.remainingGames ?? '미상'}/${awayContext?.remainingGames ?? '미상'}경기`;

        return [...baseLines, `경기: ${awayTeamName} vs ${homeTeamName}, ${scoreLine}`, contextLine].join('\n');
    };

    const buildPreviewPrompt = (homeTeamName: string, awayTeamName: string) => (
        `1~2문장, 문장당 쉼표 1개 이하.\n경기: ${awayTeamName} vs ${homeTeamName}\n` +
        `맥락: 순위 ${seasonContext?.home?.rank ?? '미상'}위/${seasonContext?.away?.rank ?? '미상'}위, ` +
        `승차 ${seasonContext?.home?.gamesBehind ?? '미상'}/${seasonContext?.away?.gamesBehind ?? '미상'}, ` +
        `잔여 ${seasonContext?.home?.remainingGames ?? '미상'}/${seasonContext?.away?.remainingGames ?? '미상'}경기`
    );

    useEffect(() => {
        if (!game) {
            setAiBriefing(null);
            setAiLoading(false);
            return;
        }

        if (!canCallAI) {
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
    }, [game?.gameId, isPastGame, canCallAI, seasonContext?.home, seasonContext?.away]);

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
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Card className="mb-6 overflow-hidden border border-emerald-900/40 shadow-xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white relative">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-300/10 rounded-full blur-3xl" />
                </div>

                <div className="p-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-start relative z-10">
                    <div className="flex gap-4 min-w-0">
                        <div className="flex-shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-emerald-100" />
                            </div>
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-emerald-100 border border-white/15 text-[11px] font-semibold">
                                    {briefingLabel}
                                </span>
                                {game && (
                                    <span className="flex items-center gap-1.5 text-[11px] text-emerald-100/80 font-semibold">
                                        <span className="flex h-1.5 w-1.5 relative">
                                            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-70"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-200"></span>
                                        </span>
                                        {aiLoading ? '데이터 분석 중...' : (isPastGame ? '맥락 분석 중' : '실시간 분석 중')}
                                    </span>
                                )}
                            </div>

                            <AnimatePresence mode="wait">
                                <motion.h4
                                    key={activeTitle}
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-lg md:text-xl font-semibold text-white mb-2 leading-tight tracking-tight truncate"
                                >
                                    {activeTitle}
                                </motion.h4>
                            </AnimatePresence>

                            <div className="min-h-[2.5rem]">
                                <p className="text-sm md:text-base text-emerald-50/90 leading-relaxed font-medium">
                                    {displayedMessage}
                                    <motion.span
                                        animate={{ opacity: [1, 0.2, 1] }}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className="inline-block w-1 h-3 bg-emerald-200/80 ml-1 align-middle"
                                    />
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="md:justify-self-end">
                        <CoachAnalysisDialog
                            initialTeam={game?.homeTeam}
                            trigger={
                                <Button className="w-full md:w-auto h-10 bg-emerald-950 hover:bg-emerald-900 text-emerald-50 border border-emerald-700/60 rounded-xl shadow-sm">
                                    <Zap className="w-4 h-4 mr-2 text-emerald-50" />
                                    <span className="text-xs font-semibold">{game ? '상세 분석' : '전력 분석'}</span>
                                </Button>
                            }
                        />
                    </div>
                </div>
            </Card>
        </motion.div>
    );
}
