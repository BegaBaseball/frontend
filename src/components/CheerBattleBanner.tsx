import { motion } from 'framer-motion';
import { RefreshCw, WifiOff, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { useCheerBattle } from '../hooks/useCheerBattle';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import {
    normalizeHexColor,
    getContrastText,
    toRgba,
} from '../utils/teamColors';

interface CheerBattleBannerProps {
    gameId: string;
    /** Short team code used for TeamLogo + label, e.g. 'LG' */
    homeTeamId: string;
    awayTeamId: string;
    className?: string;
}

/** Derives a display name from a short team code, e.g. 'KIA' -> 'KIA' */
function teamLabel(teamId: string): string {
    return TEAM_DATA[teamId]?.name ?? teamId;
}

function formatSyncAge(timestamp: number): string {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${seconds}초 전`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}분 전`;
}

/**
 * CheerBattleBanner
 *
 * Displayed at the top of the Cheer feed when today's featured game has a valid gameId.
 * Shows live vote percentages for home/away teams and lets authenticated users
 * spend 1 cheer point to cast a vote via WebSocket.
 */
export default function CheerBattleBanner({
    gameId,
    homeTeamId,
    awayTeamId,
    className,
}: CheerBattleBannerProps) {
    const {
        myVote,
        isLoadingStatus,
        isVoting,
        vote,
        homeVotes,
        awayVotes,
        totalVotes,
        homePercent,
        awayPercent,
        connectionStatus,
        reconnectAttempts,
        lastStatusSyncAt,
        reconnect,
        error,
    } = useCheerBattle({ gameId, homeTeamId, awayTeamId });

    const homeColor = normalizeHexColor(TEAM_DATA[homeTeamId]?.color);
    const awayColor = normalizeHexColor(TEAM_DATA[awayTeamId]?.color);

    const homeContrastText = getContrastText(homeColor);
    const awayContrastText = getContrastText(awayColor);

    const voted = myVote !== null;
    const canVote = connectionStatus === 'connected';
    const showConnectionWarning = connectionStatus === 'reconnecting' || connectionStatus === 'offline';
    const connectionStatusText = isLoadingStatus
        ? '집계 중...'
        : connectionStatus === 'connecting'
            ? '실시간 연결 중...'
            : connectionStatus === 'reconnecting'
                ? `재연결 중 (${Math.max(1, reconnectAttempts)}회)`
                    : connectionStatus === 'offline'
                        ? '오프라인'
                        : `총 ${totalVotes.toLocaleString()}명 참여`;
    const fallbackSyncText = lastStatusSyncAt
        ? `최근 임시 집계 ${formatSyncAge(lastStatusSyncAt)}`
        : '임시 집계 데이터 대기 중';

    const handleVote = (teamId: string) => {
        if (voted || isVoting) return;
        if (!canVote) {
            reconnect();
            return;
        }
        vote(teamId);
    };

    return (
        <div
            data-testid="cheer-battle-banner"
            className={cn(
                'mx-4 mt-4 mb-2 rounded-2xl border border-slate-200 dark:border-border overflow-hidden',
                'bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-border">
                <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" aria-hidden="true" />
                    <span className="text-[12px] font-bold text-[#0F172A] dark:text-white tracking-wide uppercase">
                        오늘의 응원 배틀
                    </span>
                </div>
                <span data-testid="cheer-battle-status" className="text-[11px] text-slate-400 dark:text-gray-400">
                    {connectionStatusText}
                </span>
            </div>

            {showConnectionWarning && (
                <div
                    data-testid="cheer-battle-warning"
                    className="flex items-center justify-between gap-2 border-b border-amber-200/60 bg-amber-50/70 px-4 py-2 text-[11px] text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200"
                >
                    <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1.5">
                            <WifiOff className="h-3.5 w-3.5" />
                            {error || '실시간 연결이 불안정합니다. 자동 재연결 중입니다.'}
                        </span>
                        <span
                            data-testid="cheer-battle-fallback-sync"
                            className="pl-5 text-[10px] text-amber-700/80 dark:text-amber-200/80"
                        >
                            {fallbackSyncText}
                        </span>
                    </div>
                    <button
                        type="button"
                        data-testid="cheer-battle-reconnect-btn"
                        onClick={reconnect}
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white/80 px-2.5 py-1 font-semibold text-amber-700 hover:bg-white dark:border-amber-700 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-950/40"
                    >
                        <RefreshCw className="h-3 w-3" />
                        다시 연결
                    </button>
                </div>
            )}

            {/* Main battle area */}
            <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                    {/* Away team vote button */}
                    <VoteButton
                        teamId={awayTeamId}
                        color={awayColor}
                        contrastText={awayContrastText}
                        isSelected={myVote === awayTeamId}
                        isOtherSelected={voted && myVote !== awayTeamId}
                        isDisabled={voted || isVoting || !canVote}
                        onClick={() => handleVote(awayTeamId)}
                        percent={awayPercent}
                        voteCount={awayVotes}
                        side="away"
                    />

                    {/* VS divider */}
                    <div className="flex flex-col items-center shrink-0 gap-1">
                        <span className="text-[11px] font-black text-slate-300 dark:text-slate-600">VS</span>
                        {!voted && (
                            <span className="text-[10px] text-slate-400 dark:text-gray-500 text-center whitespace-nowrap">
                                {canVote ? '1포인트' : '연결 대기'}
                            </span>
                        )}
                    </div>

                    {/* Home team vote button */}
                    <VoteButton
                        teamId={homeTeamId}
                        color={homeColor}
                        contrastText={homeContrastText}
                        isSelected={myVote === homeTeamId}
                        isOtherSelected={voted && myVote !== homeTeamId}
                        isDisabled={voted || isVoting || !canVote}
                        onClick={() => handleVote(homeTeamId)}
                        percent={homePercent}
                        voteCount={homeVotes}
                        side="home"
                    />
                </div>

                {/* Progress bar */}
                <div className="mt-4 relative h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-secondary">
                    {/* Away portion (left) */}
                    <motion.div
                        className="absolute left-0 top-0 h-full rounded-l-full"
                        style={{ backgroundColor: awayColor }}
                        initial={{ width: '50%' }}
                        animate={{ width: `${awayPercent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    {/* Home portion (right) */}
                    <motion.div
                        className="absolute right-0 top-0 h-full rounded-r-full"
                        style={{ backgroundColor: homeColor }}
                        initial={{ width: '50%' }}
                        animate={{ width: `${homePercent}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                </div>

                {/* Percent labels */}
                <div className="mt-1.5 flex items-center justify-between">
                    <span
                        className="text-[12px] font-bold tabular-nums"
                        style={{ color: awayColor }}
                    >
                        {awayPercent}%
                    </span>
                    {voted ? (
                        <span className="text-[11px] text-slate-400 dark:text-gray-400">
                            투표 완료
                        </span>
                    ) : (
                        <span className="text-[11px] text-slate-400 dark:text-gray-400">
                            {canVote ? '팀을 선택하세요' : '연결 복구 중'}
                        </span>
                    )}
                    <span
                        className="text-[12px] font-bold tabular-nums"
                        style={{ color: homeColor }}
                    >
                        {homePercent}%
                    </span>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-component: individual team vote button
// ---------------------------------------------------------------------------
interface VoteButtonProps {
    teamId: string;
    color: string;
    contrastText: string;
    isSelected: boolean;
    isOtherSelected: boolean;
    isDisabled: boolean;
    onClick: () => void;
    percent: number;
    voteCount: number;
    side: 'home' | 'away';
}

function VoteButton({
    teamId,
    color,
    contrastText,
    isSelected,
    isOtherSelected,
    isDisabled,
    onClick,
    percent,
    voteCount,
    side,
}: VoteButtonProps) {
    const softBg = toRgba(color, 0.1);
    const softBorder = toRgba(color, 0.3);

    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={isDisabled}
            aria-pressed={isSelected}
            aria-label={`${teamLabel(teamId)} 응원 투표`}
            whileHover={!isDisabled ? { scale: 1.03 } : {}}
            whileTap={!isDisabled ? { scale: 0.97 } : {}}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={cn(
                'flex-1 flex flex-col items-center gap-2 rounded-xl py-3 px-2 border transition-all duration-200',
                isSelected && 'ring-2',
                isOtherSelected && 'opacity-40',
                !isDisabled && 'cursor-pointer',
                isDisabled && !isSelected && 'cursor-default'
            )}
            style={{
                backgroundColor: isSelected ? softBg : 'transparent',
                borderColor: isSelected ? softBorder : 'transparent',
                borderWidth: isSelected ? '1.5px' : '1.5px',
                // Subtle hover handled by motion
            }}
        >
            <div
                className={cn(
                    'relative rounded-full p-1.5 transition-all duration-200',
                    isSelected ? 'shadow-md' : ''
                )}
                style={{
                    backgroundColor: isSelected ? color : softBg,
                }}
            >
                <TeamLogo
                    teamId={teamId}
                    team={teamLabel(teamId)}
                    size={36}
                />
                {isSelected && (
                    <span
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shadow"
                        style={{ backgroundColor: color, color: contrastText }}
                    >
                        V
                    </span>
                )}
            </div>

            <div className="flex flex-col items-center gap-0.5">
                <span className="text-[12px] font-bold text-[#0F172A] dark:text-white leading-none">
                    {teamLabel(teamId)}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-gray-400 tabular-nums">
                    {voteCount.toLocaleString()}표
                </span>
            </div>

            {/* Not-yet-voted call-to-action indicator */}
            {!isSelected && !isOtherSelected && (
                <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: softBg, color }}
                >
                    {side === 'away' ? '원정' : '홈'}
                </span>
            )}
        </motion.button>
    );
}
