import { useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, TrendingUp, Users, Zap } from 'lucide-react';
import { Game } from '../types/prediction';
import { TEAM_DATA } from '../constants/teams';
import CoachAnalysisDialog from './CoachAnalysisDialog';

interface CoachBriefingProps {
    game: Game | null;
    votePercentages: { homePercentage: number; awayPercentage: number };
    totalVotes: number;
    isToday: boolean;
}

export default function CoachBriefing({ game, votePercentages, totalVotes, isToday }: CoachBriefingProps) {
    const briefing = useMemo(() => {
        if (!game) {
            return {
                title: "오늘의 경기 분석",
                message: "예정된 경기가 없습니다. 다른 날짜를 확인해보세요!",
                type: "neutral"
            };
        }

        const homeTeam = TEAM_DATA[game.homeTeam]?.name || game.homeTeam;
        const awayTeam = TEAM_DATA[game.awayTeam]?.name || game.awayTeam;

        // Simple Rule Engine for Briefing
        if (votePercentages.homePercentage >= 70) {
            return {
                title: "압도적인 홈팀 우세!",
                message: `팬 10명 중 7명이 ${homeTeam}의 승리를 예상하고 있습니다. ${awayTeam}의 반격이 가능할까요?`,
                type: "home-favored"
            };
        } else if (votePercentages.awayPercentage >= 70) {
            return {
                title: "원정팀의 기세가 무섭습니다",
                message: `${awayTeam} 승리 예측이 압도적입니다. ${homeTeam} 홈 팬들의 응원이 절실합니다!`,
                type: "away-favored"
            };
        } else if (Math.abs(votePercentages.homePercentage - votePercentages.awayPercentage) < 10) {
            return {
                title: "치열한 접전 예상!",
                message: "예측이 팽팽합니다. 오늘 경기의 승패는 불펜 싸움에서 갈릴 가능성이 높습니다.",
                type: "tight"
            };
        } else {
            const favored = votePercentages.homePercentage > votePercentages.awayPercentage ? homeTeam : awayTeam;
            return {
                title: `${favored} 우세 예상`,
                message: `데이터와 팬심 모두 ${favored}의 승리를 가리키고 있습니다.`,
                type: "normal"
            };
        }
    }, [game, votePercentages]);

    return (
        <Card className="mb-6 overflow-hidden border-none shadow-xl bg-primary dark:bg-primary-dark relative group">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/10 transition-colors duration-500" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

            <div className="p-6 flex flex-col sm:flex-row items-center gap-6 relative z-10">
                {/* Persona Icon */}
                <div className="flex-shrink-0 relative">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg ring-4 ring-[#2d5f4f]/30">
                        <Sparkles className="w-8 h-8 text-yellow-300 fill-yellow-300/20" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full p-1.5 border-2 border-[#1a3c32] shadow-sm">
                        <TrendingUp className="w-3.5 h-3.5 text-white" />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] uppercase tracking-wider font-bold">
                            AI 코치 리포트
                        </span>
                        {game && (
                            <span className="flex items-center gap-1 text-[10px] text-white/60 font-medium">
                                <span className="w-1 h-1 rounded-full bg-green-400 animate-pulse" />
                                실시간 분석 중
                            </span>
                        )}
                    </div>

                    <h4 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-sm">
                        {briefing.title}
                    </h4>

                    <p className="text-sm md:text-base text-gray-200 leading-relaxed font-medium">
                        {briefing.message}
                    </p>
                </div>

                {/* Right Side Actions */}
                <div className="flex flex-col gap-2 items-end">
                    {/* Stat Badge - Only show when game exists */}
                    {game && (
                        <div className="hidden sm:flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-xl p-4 min-w-[100px] border border-white/5">
                            <div className="flex items-center gap-1.5 mb-1 text-white/50">
                                <Users className="w-3.5 h-3.5" />
                                <span className="text-xs font-medium">참여</span>
                            </div>
                            <span className="text-xl font-black text-white tabular-nums tracking-tight">
                                {totalVotes.toLocaleString()}
                            </span>
                        </div>
                    )}

                    {/* Desktop Button - Always visible */}
                    <div className="hidden sm:block w-full min-w-[120px]">
                        <CoachAnalysisDialog
                            initialTeam={game?.homeTeam}
                            trigger={
                                <Button size="sm" className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md transition-all hover:scale-105 active:scale-95">
                                    <Zap className="w-3.5 h-3.5 mr-1.5 text-yellow-300" />
                                    <span className="text-xs">{game ? '상세 분석' : '전력 분석'}</span>
                                </Button>
                            }
                        />
                    </div>
                </div>
            </div>

            {/* Mobile Button (Full Width at bottom) - Always visible */}
            <div className="sm:hidden px-6 pb-6 pt-0 relative z-10">
                <CoachAnalysisDialog
                    initialTeam={game?.homeTeam}
                    trigger={
                        <Button className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-md h-10 transition-all active:scale-95">
                            <Zap className="w-4 h-4 mr-2 text-yellow-300" />
                            {game ? 'AI 상세 리포트 보기' : 'AI 팀 전력 분석'}
                        </Button>
                    }
                />
            </div>
        </Card>
    );
}
