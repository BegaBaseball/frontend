import { cn } from '../lib/utils';
import type { Game as HomeGame } from '../types/home';
import TeamLogo from './TeamLogo';
import CheerHot from './CheerHot';

interface CheerSidebarPanelsProps {
    teamLogoId?: string;
    teamLabel: string;
    teamName: string;
    teamId: string;
    isTeamMetadataLoading: boolean;
    isTeamMetadataError: boolean;
    onRefetchTeamMetadata: () => void;
    teamDescription: string;
    isGamesLoading: boolean;
    isGamesError: boolean;
    onRefetchGames: () => void;
    featuredGame: HomeGame | null;
    onGoPrediction: () => void;
}

export default function CheerSidebarPanels({
    teamLogoId,
    teamLabel,
    teamName,
    teamId,
    isTeamMetadataLoading,
    isTeamMetadataError,
    onRefetchTeamMetadata,
    teamDescription,
    isGamesLoading,
    isGamesError,
    onRefetchGames,
    featuredGame,
    onGoPrediction,
}: CheerSidebarPanelsProps) {
    return (
        <div className="flex w-full flex-col gap-4">
            <div className="rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-secondary">
                        <TeamLogo teamId={teamLogoId} team={teamLabel} size={48} />
                    </div>
                    <div>
                        <p className="text-[16px] font-semibold text-[#0F172A] dark:text-white">팀 정보 요약</p>
                        <p className="text-[16px] font-semibold text-[#64748B] dark:text-gray-300">{teamName}</p>
                    </div>
                </div>
                {teamId === 'all' ? (
                <p className="mt-3 text-[16px] leading-relaxed text-[#64748B] dark:text-gray-300 font-semibold">
                    모든 팀의 흐름을 한 번에 확인하세요.
                </p>
                ) : isTeamMetadataLoading ? (
                    <div className="mt-3 space-y-2">
                        <div className="h-4 w-full rounded bg-slate-100 dark:bg-secondary" />
                        <div className="h-4 w-4/5 rounded bg-slate-100 dark:bg-secondary" />
                        <div className="h-4 w-3/5 rounded bg-slate-100 dark:bg-secondary" />
                    </div>
                ) : isTeamMetadataError ? (
                        <div className="mt-3 rounded-xl bg-red-50 px-3 py-3 text-[16px] text-[#64748B] dark:bg-secondary/70 dark:text-gray-300">
                        <p>팀 요약 정보를 불러오지 못했습니다.</p>
                        <p className="mt-1 text-[16px] text-slate-500 dark:text-slate-300 font-semibold">
                            네트워크 상태를 확인하고 다시 시도해 주세요
                        </p>
                        <button
                            type="button"
                            onClick={onRefetchTeamMetadata}
                                className="mt-3 w-full rounded-full border border-red-200 px-3 py-2 text-[16px] font-semibold text-red-600 hover:bg-red-100 dark:border-border dark:text-red-300 dark:hover:bg-secondary"
                        >
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <p className="mt-3 text-[16px] leading-relaxed text-[#64748B] dark:text-gray-300 font-semibold">{teamDescription}</p>
                )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card">
                    <p className="text-[16px] font-semibold text-[#0F172A] dark:text-white">오늘 경기</p>
                {isGamesLoading ? (
                    <div className="mt-3 space-y-3">
                        <div className="h-4 w-32 rounded bg-slate-100 dark:bg-secondary" />
                        <div className="h-12 rounded bg-slate-100 dark:bg-secondary" />
                        <div className="h-9 w-full rounded-full bg-slate-100 dark:bg-secondary" />
                    </div>
                ) : isGamesError ? (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-[16px] text-[#64748B] dark:bg-secondary/70 dark:text-gray-300">
                        경기 정보를 불러오지 못했습니다.
                        <button
                            type="button"
                            onClick={onRefetchGames}
                            className="mt-3 w-full rounded-full border border-slate-200 py-2 text-[16px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-border dark:text-gray-200 dark:hover:bg-secondary"
                        >
                            다시 시도
                        </button>
                    </div>
                ) : featuredGame ? (
                    <div className="mt-3 space-y-3">
                        <div className="flex items-center justify-between text-[16px] font-semibold text-slate-500 dark:text-gray-300">
                            <span>{featuredGame.stadium}</span>
                            <span>{featuredGame.time}</span>
                        </div>
                        <div className="rounded-xl border border-slate-100 px-3 py-3 dark:border-border">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <TeamLogo team={featuredGame.awayTeam} size={28} />
                                    <span className="text-[16px] font-semibold text-[#0F172A] dark:text-white">
                                        {featuredGame.awayTeam}
                                    </span>
                                </div>
                                    <span className="text-[16px] font-semibold text-slate-400">vs</span>
                                <div className="flex items-center gap-2">
                                    <TeamLogo team={featuredGame.homeTeam} size={28} />
                                    <span className="text-[16px] font-semibold text-[#0F172A] dark:text-white">
                                        {featuredGame.homeTeam}
                                    </span>
                                </div>
                            </div>
                            {(featuredGame.gameStatus === 'PLAYING' || featuredGame.gameStatus === 'COMPLETED') &&
                                featuredGame.homeScore !== undefined &&
                                featuredGame.awayScore !== undefined && (
                                    <div className="mt-3 flex items-center justify-center gap-6 text-lg font-bold text-[#0F172A] dark:text-white">
                                        <span>{featuredGame.awayScore}</span>
                                        <span className="text-base text-slate-400">:</span>
                                        <span>{featuredGame.homeScore}</span>
                                    </div>
                                )}
                            <div className="mt-3 flex items-center justify-center">
                                <span
                                    className={cn(
                                        'rounded-full px-3 py-1 text-[16px] font-semibold',
                                        featuredGame.gameStatus === 'PLAYING'
                                    ? 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-secondary dark:text-gray-200'
                                    )}
                                >
                                    {featuredGame.gameStatus === 'PLAYING' ? 'LIVE' : featuredGame.gameStatusKr || '예정'}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            className="w-full rounded-full border border-slate-200 py-2 text-[16px] font-semibold text-[#0F172A] hover:bg-slate-50 dark:border-border dark:text-white dark:hover:bg-secondary"
                            onClick={onGoPrediction}
                        >
                            경기 상세 보기
                        </button>
                    </div>
                ) : (
                    <div className="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-[16px] text-[#64748B] dark:bg-secondary/70 dark:text-gray-300">
                        오늘 예정된 경기가 없습니다.
                    </div>
                )}
            </div>

            <CheerHot />
        </div>
    );
}
