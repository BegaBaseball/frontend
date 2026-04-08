import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchRankingSnapshot } from '../../api/rankings';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import type { RankingSnapshot } from '../../types/home';
import type { Game, GameDetail, VoteTeam } from '../../types/prediction';
import type { GameStatusCode } from '../../utils/predictionStatus';
import { resolveCoachBriefingPolicy } from '../../utils/predictionCoachPolicy';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const LazyAdvancedMatchCard = lazy(() => import('./AdvancedMatchCard'));
const PredictionCoachBriefingRuntime = lazy(() => import('./PredictionCoachBriefingRuntime'));
const PredictionComboAnimationRuntime = lazy(() => import('./PredictionComboAnimationRuntime'));
const TOTAL_SEASON_GAMES = 144;
const COACH_BRIEFING_REVEAL_DELAY_MS = 450;

interface PredictionMatchDetailPanelProps {
  game: Game;
  gameDetail: GameDetail | null;
  gameDetailLoading: boolean;
  gameDetailRefreshing: boolean;
  gameDetailError: string | null;
  isDetailRetryLoading: boolean;
  reloadCurrentGameDetail: (options?: { emitRetryEvent?: boolean }) => void;
  predictionRecoveryPath: string;
  userVote: VoteTeam | null;
  votePercentages: {
    homePercentage: number;
    awayPercentage: number;
    totalVotes: number;
  };
  isVoteOpen: boolean;
  isVoteActionLocked: boolean;
  statusLabel: string;
  statusCode: GameStatusCode;
  isPastGame: boolean;
  isFutureGame: boolean;
  onVote: (team: VoteTeam) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  hasPrevDate: boolean;
  hasNextDate: boolean;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
}

export default function PredictionMatchDetailPanel({
  game,
  gameDetail,
  gameDetailLoading,
  gameDetailRefreshing,
  gameDetailError,
  isDetailRetryLoading,
  reloadCurrentGameDetail,
  predictionRecoveryPath,
  userVote,
  votePercentages,
  isVoteOpen,
  isVoteActionLocked,
  statusLabel,
  statusCode,
  isPastGame,
  isFutureGame,
  onVote,
  onPrevDate,
  onNextDate,
  hasPrevDate,
  hasNextDate,
  isLoggedIn,
  isAuthLoading,
}: PredictionMatchDetailPanelProps) {
  const shouldRenderComboAnimation = useLeaderboardStore((state) => state.showComboAnimation);
  const hideComboAnimation = useLeaderboardStore((state) => state.hideCombo);
  const [rankingSnapshot, setRankingSnapshot] = useState<RankingSnapshot | null>(null);
  const [shouldRenderCoachBriefing, setShouldRenderCoachBriefing] = useState(false);

  useEffect(() => {
    hideComboAnimation();
  }, [game.gameId, hideComboAnimation]);

  const rankingSnapshotDate = useMemo(() => {
    const referenceDate = gameDetail?.gameDate || game.gameDate;
    if (!referenceDate) {
      return null;
    }

    const parsed = new Date(referenceDate);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [game.gameDate, gameDetail?.gameDate]);

  const seasonYear = useMemo(
    () => rankingSnapshotDate?.getFullYear() ?? new Date().getFullYear(),
    [rankingSnapshotDate],
  );

  useEffect(() => {
    let cancelled = false;
    setRankingSnapshot(null);

    void fetchRankingSnapshot(rankingSnapshotDate ? { date: rankingSnapshotDate } : { seasonYear })
      .then((snapshot) => {
        if (!cancelled) {
          setRankingSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRankingSnapshot({
            rankingSeasonYear: seasonYear,
            rankingSourceMessage: '순위 데이터를 불러오지 못했습니다.',
            isOffSeason: false,
            rankings: [],
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rankingSnapshotDate, seasonYear]);

  useEffect(() => {
    setShouldRenderCoachBriefing(false);

    if (!rankingSnapshot) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderCoachBriefing(true);
    }, COACH_BRIEFING_REVEAL_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [game.gameId, rankingSnapshot]);

  const rankingByTeamId = useMemo(() => {
    const map = new Map<string, { rank: number; gamesBehind?: number; games: number }>();
    (rankingSnapshot?.rankings ?? []).forEach((team) => {
      map.set(team.teamId, {
        rank: team.rank,
        gamesBehind: team.gamesBehind,
        games: team.games,
      });
    });
    return map;
  }, [rankingSnapshot?.rankings]);

  const buildTeamContext = (teamId?: string) => {
    if (!teamId) {
      return null;
    }

    const ranking = rankingByTeamId.get(teamId);
    if (!ranking || ranking.gamesBehind == null) {
      return null;
    }

    const remainingGames = Math.max(0, TOTAL_SEASON_GAMES - ranking.games);
    if (!Number.isFinite(remainingGames)) {
      return null;
    }

    return {
      rank: ranking.rank,
      gamesBehind: ranking.gamesBehind,
      remainingGames,
    };
  };

  const seasonContext = useMemo(() => {
    const homeSeasonContext = buildTeamContext(game.homeTeam);
    const awaySeasonContext = buildTeamContext(game.awayTeam);
    const canCallAI = !!homeSeasonContext && !!awaySeasonContext;
    const maxGamesBehind = canCallAI
      ? Math.max(homeSeasonContext.gamesBehind, awaySeasonContext.gamesBehind)
      : null;
    const minRemainingGames = canCallAI
      ? Math.min(homeSeasonContext.remainingGames, awaySeasonContext.remainingGames)
      : null;
    const isPostseasonGame = game.leagueType === 'POST';
    const isMeaningfulGame = !!canCallAI
      && (
        (maxGamesBehind != null && maxGamesBehind <= 2)
        || (minRemainingGames != null && minRemainingGames <= 20)
      );

    return {
      home: homeSeasonContext,
      away: awaySeasonContext,
      isPostseasonGame,
      canCallAI,
      isMeaningfulGame,
      maxGamesBehind,
      minRemainingGames,
    };
  }, [game.awayTeam, game.homeTeam, game.leagueType, rankingByTeamId]);

  const coachBriefingPolicy = useMemo(
    () => resolveCoachBriefingPolicy({
      hasSelectedGame: true,
      canCallAI: !!seasonContext.canCallAI,
      isScheduledGame: statusCode === 'SCHEDULED',
      isCoachStateEnabledForAuto:
        statusCode === 'SCHEDULED' || statusCode === 'LIVE' || statusCode === 'COMPLETED',
      isPostseasonGame: !!seasonContext.isPostseasonGame,
      isMeaningfulGame: !!seasonContext.isMeaningfulGame,
    }),
    [seasonContext.canCallAI, seasonContext.isMeaningfulGame, seasonContext.isPostseasonGame, statusCode],
  );

  const gameDetailActions = gameDetailError ? (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={isDetailRetryLoading}
        data-testid="prediction-detail-error-retry-btn"
        className="min-h-10 border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-400/60 dark:text-amber-100 dark:hover:bg-amber-800/30"
        onClick={() => reloadCurrentGameDetail({ emitRetryEvent: true })}
      >
        <span className="inline-flex items-center gap-1.5">
          {isDetailRetryLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          다시 시도
        </span>
      </Button>
      <Link
        to={predictionRecoveryPath}
        className="min-h-10 px-3 inline-flex items-center justify-center rounded-md border border-amber-300/70 text-amber-900 hover:bg-amber-100 dark:border-amber-300/60 dark:text-amber-100 dark:hover:bg-amber-800/30"
      >
        예측으로 돌아가기
      </Link>
    </>
  ) : null;

  return (
    <div className="font-sans">
      <Suspense
        fallback={(
          <Card className="relative p-4 mb-4 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md rounded-2xl">
            <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              경기 카드를 준비하고 있습니다.
            </div>
          </Card>
        )}
      >
        <LazyAdvancedMatchCard
          key={game.gameId}
          game={game}
          gameDetail={gameDetail}
          gameDetailLoading={gameDetailLoading}
          gameDetailRefreshing={gameDetailRefreshing}
          gameDetailError={gameDetailError}
          gameDetailActions={gameDetailActions}
        userVote={userVote}
        votePercentages={votePercentages}
        isVoteOpen={isVoteOpen}
        isVoteActionLocked={isVoteActionLocked}
        statusLabel={statusLabel}
          statusCode={statusCode}
          onVote={onVote}
          onPrevDate={onPrevDate}
          onNextDate={onNextDate}
          hasPrevDate={hasPrevDate}
          hasNextDate={hasNextDate}
          coachBriefing={(
            shouldRenderCoachBriefing ? (
              <Suspense fallback={null}>
                <PredictionCoachBriefingRuntime
                  game={game}
                  gameDetail={gameDetail}
                  seasonContext={seasonContext}
                  requestMode={coachBriefingPolicy.requestMode}
                  autoEnabled={coachBriefingPolicy.autoEnabled && coachBriefingPolicy.requestMode === 'auto_brief'}
                  forceManual={coachBriefingPolicy.forceManual}
                  isPastGame={isPastGame}
                  isFutureGame={isFutureGame}
                  isLoggedIn={isLoggedIn}
                  isAuthLoading={isAuthLoading}
                />
              </Suspense>
            ) : null
          )}
        />
      </Suspense>

      {shouldRenderComboAnimation ? (
        <Suspense fallback={null}>
          <PredictionComboAnimationRuntime />
        </Suspense>
      ) : null}
    </div>
  );
}
