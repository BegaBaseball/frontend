import React, { Fragment, ReactNode, Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Card } from '../ui/card';
import { StatusBadge } from '../ui/status-badge';
import TeamLogo from '../TeamLogo';
import { useTheme } from '../../hooks/useTheme';
import type { PredictionUserVoteResolutionState } from '../../hooks/predictionHookShared';
import {
  Game,
  VoteTeam,
  GameDetail,
} from '../../types/prediction';
import { GAME_TIME } from '../../constants/prediction';
import { getTeamColorByAnyKey, getFullTeamName } from '../../constants/teams';
import type { GameStatusCode } from '../../utils/prediction';
import {
  getInningTeamNameStyle,
  getTeamLabelTextStyle,
  getTopScoreTextStyle,
} from '../../utils/advancedMatchCardStyles';
import {
  buildInningRows,
  formatTime,
  toNumericScore,
} from '../../utils/inningScoreParser';
import { resolvePredictionResultLabel } from '../../utils/predictionResultLabel';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { getGameStatusBadgeMeta } from '../../utils/statusBadgeMeta';
import type { AdvancedMatchCardContentRuntimeProps } from './AdvancedMatchCardContentRuntime';
import {
  PredictionChevronLeftIcon,
  PredictionChevronRightIcon,
  PredictionClockIcon,
  PredictionLoaderIcon,
} from './PredictionShellIcons';

const AdvancedMatchCardContentRuntime = lazy(() => import('./AdvancedMatchCardContentRuntime'));
const PredictionVotePanel = lazy(() => import('./PredictionVotePanel'));

interface AdvancedMatchCardProps {
  game: Game;
  gameDetail?: GameDetail | null;
  gameDetailLoading?: boolean;
  gameDetailRefreshing?: boolean;
  gameDetailError?: string | null;
  gameDetailErrorCode?: string | null;
  gameDetailActions?: ReactNode;
  userVote: 'home' | 'away' | null | undefined;
  userVoteResolutionState?: PredictionUserVoteResolutionState;
  votePercentages: { homePercentage: number; awayPercentage: number; totalVotes: number };
  isVoteOpen: boolean;
  isVoteActionLocked?: boolean;
  statusLabel: string;
  statusCode: GameStatusCode;
  onVote: (team: VoteTeam) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  hasPrevDate: boolean;
  hasNextDate: boolean;
  coachBriefing?: ReactNode;
}

const surfaceTransitionStyle = {
  transition: 'background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
};

const AdvancedMatchCard = React.memo(function AdvancedMatchCard({
  game,
  gameDetail,
  gameDetailLoading = false,
  gameDetailRefreshing = false,
  gameDetailError = null,
  gameDetailErrorCode = null,
  gameDetailActions,
  userVote,
  userVoteResolutionState = 'resolved',
  votePercentages,
  isVoteOpen,
  isVoteActionLocked = false,
  statusLabel,
  statusCode,
  onVote,
  onPrevDate,
  onNextDate,
  hasPrevDate,
  hasNextDate,
  coachBriefing,
}: AdvancedMatchCardProps) {
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark'
    || theme === 'dark'
    || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  // 애니메이션을 위한 상태 관리
  const [countedScores, setCountedScores] = useState({ away: 0, home: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const scoreBoxRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setIsVisible(false);
    setCountedScores({ away: 0, home: 0 });
  }, [game.gameId]);

  useEffect(() => {
    const node = scoreBoxRef.current;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    const rect = node.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 0;
    const isInView = rect.top < viewportHeight * 0.9 && rect.bottom > 0;

    if (isInView) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
          observerRef.current = null;
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -30% 0px' }
    );

    observerRef.current = observer;
    observer.observe(node);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [game.gameId]);

  const stadiumLabel = formatStadiumDisplayName(gameDetail?.stadiumName || gameDetail?.stadium || game.stadium);
  const startTimeLabel = gameDetail?.startTime || null;
  const homePitcherName = gameDetail?.homePitcher || game.homePitcher?.name || '발표 전';
  const awayPitcherName = gameDetail?.awayPitcher || game.awayPitcher?.name || '발표 전';

  const inningRows = buildInningRows(game, gameDetail);

  const inningKeys = Object.keys(inningRows)
    .map(Number)
    .sort((a, b) => a - b);
  const hasDetailedInningScores = Object.keys(inningRows).length > 0;
  const inningTotals = Object.values(inningRows).reduce(
    (acc, score) => ({
      away: acc.away + (score.away ?? 0),
      home: acc.home + (score.home ?? 0),
    }),
    { away: 0, home: 0 }
  );

  const awayColor = getTeamColorByAnyKey(game.awayTeam);
  const homeColor = getTeamColorByAnyKey(game.homeTeam);
  const awayTeamName = getFullTeamName(game.awayTeam);
  const homeTeamName = getFullTeamName(game.homeTeam);
  const awayTeamNameStyle = getInningTeamNameStyle(awayColor, isDarkMode);
  const homeTeamNameStyle = getInningTeamNameStyle(homeColor, isDarkMode);
  const topAwayScoreStyle = getTopScoreTextStyle(awayColor, isDarkMode);
  const topHomeScoreStyle = getTopScoreTextStyle(homeColor, isDarkMode);
  const awayTeamLabelTextStyle = getTeamLabelTextStyle(awayColor, isDarkMode);
  const homeTeamLabelTextStyle = getTeamLabelTextStyle(homeColor, isDarkMode);
  const matchDateValue = gameDetail?.gameDate || game.gameDate;
  const matchDateLabel = matchDateValue ? matchDateValue.replace(/-/g, '.') : '';
  const formattedStartTime = formatTime(startTimeLabel) || GAME_TIME;
  const matchMetaParts = [matchDateLabel, stadiumLabel, formattedStartTime].filter(Boolean);
  const resolvedAwayScore = toNumericScore(gameDetail?.awayScore ?? game.awayScore);
  const resolvedHomeScore = toNumericScore(gameDetail?.homeScore ?? game.homeScore);
  const awayScoreValue = resolvedAwayScore ?? (hasDetailedInningScores ? inningTotals.away : undefined);
  const homeScoreValue = resolvedHomeScore ?? (hasDetailedInningScores ? inningTotals.home : undefined);
  const hasGameScore = awayScoreValue != null && homeScoreValue != null;
  const awayScoreForDisplay = hasGameScore ? awayScoreValue : '-';
  const homeScoreForDisplay = hasGameScore ? homeScoreValue : '-';
  const awayAnimatedScore = awayScoreValue ?? 0;
  const homeAnimatedScore = homeScoreValue ?? 0;
  const lastInning = inningKeys.length > 0 ? Math.max(...inningKeys) : 9;
  const hasDetailedScores = hasGameScore || Object.keys(inningRows).length > 0;
  const winnerLabel = resolvePredictionResultLabel({
    statusCode,
    awayScore: awayScoreValue,
    homeScore: homeScoreValue,
    awayTeamName,
    homeTeamName,
  });
  const isPostponedStatus = statusCode === 'POSTPONED';
  const isCancelledStatus = statusCode === 'CANCELLED';
  const isPostponedOrCancelled = isPostponedStatus || isCancelledStatus;
  const isScheduledLayout = statusCode === 'SCHEDULED' && !hasDetailedScores;
  const shouldHideResultSections = isScheduledLayout || isPostponedOrCancelled;
  const scheduledStateLabel = isPostponedStatus
    ? '경기 연기'
    : isCancelledStatus
      ? '경기 취소'
      : '경기 시작 예정';
  const showStatusBadge = isPostponedOrCancelled || isScheduledLayout;
  const matchStatusLabel = isPostponedOrCancelled
    ? scheduledStateLabel
    : (statusCode === 'COMPLETED' || statusCode === 'DRAW') && lastInning
      ? `경기 종료 (${lastInning}회)`
      : statusLabel;
  const isScoreboardLoading = gameDetailLoading && !hasDetailedScores;

  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const startAway = 0;
    const startHome = 0;
    let frameId = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextAway = Math.round(startAway + (awayAnimatedScore - startAway) * progress);
      const nextHome = Math.round(startHome + (homeAnimatedScore - startHome) * progress);
      setCountedScores({ away: nextAway, home: nextHome });
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [awayAnimatedScore, homeAnimatedScore, game.gameId, isVisible]);

  const votePanel = (isVoteOpen || isPostponedOrCancelled) ? (
    <Suspense
      fallback={(
        <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-5 text-center text-body text-slate-500 shadow-sm dark:border-border dark:bg-secondary/30 dark:text-white">
          <span className="inline-flex items-center gap-2">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            투표 영역을 준비하고 있습니다.
          </span>
        </div>
      )}
    >
      <PredictionVotePanel
        game={game}
        userVote={userVote}
        userVoteResolutionState={userVoteResolutionState}
        votePercentages={votePercentages}
        isDarkMode={isDarkMode}
        isVoteOpen={isVoteOpen}
        isVoteActionLocked={isVoteActionLocked}
        isPostponedOrCancelled={isPostponedOrCancelled}
        onVote={onVote}
      />
    </Suspense>
  ) : null;

  const contentRuntimeProps: AdvancedMatchCardContentRuntimeProps = {
    game,
    gameDetail,
    gameDetailLoading,
    gameDetailRefreshing,
    gameDetailError,
    gameDetailErrorCode,
    gameDetailActions,
    coachBriefing,
    votePanel,
    awayColor,
    homeColor,
    awayTeamName,
    homeTeamName,
    awayPitcherName,
    homePitcherName,
    awayScoreForDisplay,
    homeScoreForDisplay,
    isDarkMode,
    isPostponedOrCancelled,
    isCancelledStatus,
    statusCode,
    shouldHideResultSections,
    isScoreboardLoading,
    inningRows,
  };

  return (
    <Card
      className="overflow-hidden border border-slate-200/70 shadow-lg bg-white/90 dark:border-border dark:bg-card dark:shadow-xl transition-colors duration-300 mb-6 rounded-2xl"
      data-vote-resolution={userVoteResolutionState}
    >
      <div className="p-4 md:p-6">
        <div
          className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white/90 shadow-sm dark:border-border dark:bg-card dark:shadow-md"
          style={surfaceTransitionStyle}
        >
          <div
            className="relative overflow-hidden rounded-t-2xl px-3.5 pt-10 pb-8 text-white sm:px-4 sm:pt-12 sm:pb-10"
            style={{
              background: `linear-gradient(110deg, ${awayColor} 50%, ${homeColor} 50%)`,
            }}
          >
            {/* Navigation Buttons (Desktop) */}
            <div className="hidden md:block">
              <button
                type="button"
                onClick={onPrevDate}
                disabled={!hasPrevDate}
                aria-label="이전 날짜 보기"
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              >
                <PredictionChevronLeftIcon size={32} />
              </button>
              <button
                type="button"
                onClick={onNextDate}
                disabled={!hasNextDate}
                aria-label="다음 날짜 보기"
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
              >
                <PredictionChevronRightIcon size={32} />
              </button>
            </div>

            <div className="relative flex justify-center">
              {showStatusBadge && (
                <StatusBadge
                  data-testid="prediction-status-badge"
                  {...getGameStatusBadgeMeta(statusCode, scheduledStateLabel)}
                  size="md"
                  className={`absolute top-0 backdrop-blur ${isScheduledLayout ? 'text-sky-700 dark:text-sky-300' : ''}`}
                  style={surfaceTransitionStyle}
                />
              )}
              <div
                className={`absolute ${showStatusBadge ? 'top-8' : 'top-0'} max-w-[calc(100%-1.75rem)] rounded-full bg-black/30 px-2.5 py-1 text-body font-bold leading-tight backdrop-blur sm:px-3 sm:text-body`}
                style={surfaceTransitionStyle}
              >
                <span className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5">
                  {matchMetaParts.length > 0 ? matchMetaParts.map((part, index) => (
                    <Fragment key={`${part}-${index}`}>
                      {index > 0 ? <span className="text-white/60">|</span> : null}
                      <span className="whitespace-nowrap">{part}</span>
                    </Fragment>
                  )) : '경기 정보'}
                </span>
              </div>
            </div>
            <div className={`relative flex items-end justify-between gap-2.5 sm:gap-3 ${showStatusBadge ? 'mt-14' : 'mt-9 sm:mt-10'}`}>
              <div className="flex w-[29%] flex-col items-center text-center sm:w-[30%]">
                <div
                  className="flex h-12 w-12 items-center justify-center text-xl font-black drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] sm:h-14 sm:w-14"
                  style={surfaceTransitionStyle}
                >
                  <TeamLogo team={game.awayTeam} size={40} className="h-10 w-10 sm:h-11 sm:w-11" />
                </div>
                <div className="mt-2 break-keep text-body leading-tight" style={awayTeamLabelTextStyle}>
                  {awayTeamName}
                </div>
                <div className="text-body text-white/80">AWAY</div>
              </div>
              <div
                ref={scoreBoxRef}
                className="relative -mb-2 w-[42%] rounded-xl border border-white/50 bg-white/80 px-2.5 py-2.5 text-center text-gray-900 shadow-2xl backdrop-blur-md dark:border-white/20 dark:bg-black/30 dark:text-white sm:w-[40%] sm:px-3 sm:py-3"
                style={{
                  ...surfaceTransitionStyle,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'scale(1)' : 'scale(0.92)',
                  transition: 'opacity 350ms ease-out, transform 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
                  willChange: 'transform, opacity',
                }}
              >
                {isScheduledLayout ? (
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <span className="h-px w-8 bg-gray-300 dark:bg-gray-600" />
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-body font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      <PredictionClockIcon className="h-3 w-3" />
                      경기 시작 예정
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-1.5 text-[1.8rem] font-extrabold sm:gap-2 sm:text-3xl">
                      <span style={topAwayScoreStyle}>{hasGameScore ? countedScores.away : '-'}</span>
                      <span className="text-gray-300 dark:text-white">:</span>
                      <span style={topHomeScoreStyle}>{hasGameScore ? countedScores.home : '-'}</span>
                    </div>
                    <div className="mt-1 text-body font-bold text-gray-500 dark:text-white sm:text-body">{matchStatusLabel}</div>
                    {winnerLabel ? (
                      <div
                        data-testid="prediction-result-label"
                        className={`mt-1 text-body font-bold ${
                          winnerLabel === '무승부'
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-slate-600 dark:text-white'
                        }`}
                      >
                        {winnerLabel}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
              <div className="flex w-[29%] flex-col items-center text-center sm:w-[30%]">
                <div
                  className="flex h-12 w-12 items-center justify-center text-xl font-black drop-shadow-[0_6px_10px_rgba(0,0,0,0.25)] sm:h-14 sm:w-14"
                  style={surfaceTransitionStyle}
                >
                  <TeamLogo team={game.homeTeam} size={40} className="h-10 w-10 sm:h-11 sm:w-11" />
                </div>
                <div className="mt-2 break-keep text-body leading-tight" style={homeTeamLabelTextStyle}>
                  {homeTeamName}
                </div>
                <div className="text-body text-white/80">HOME</div>
              </div>
            </div>
          </div>

          <Suspense
            fallback={(
              <div className="px-4 py-6">
                <div className="flex items-center justify-center rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-5 text-body text-gray-500 dark:border-border dark:bg-secondary/40 dark:text-white">
                  <span className="inline-flex items-center gap-2">
                    <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
                    경기 상세 섹션을 준비하고 있습니다.
                  </span>
                </div>
              </div>
            )}
          >
            <AdvancedMatchCardContentRuntime {...contentRuntimeProps} />
          </Suspense>
        </div>
      </div>
    </Card>
  );
});

export default AdvancedMatchCard;
