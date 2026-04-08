import { lazy, Suspense, useEffect, useMemo, useState } from 'react';

import { fetchRankingSnapshot } from '../../api/rankings';
import type { RankingSnapshot } from '../../types/home';
import type { Game, GameDetail } from '../../types/prediction';
import type { GameStatusCode } from '../../utils/predictionStatus';
import { resolveCoachBriefingPolicy } from '../../utils/predictionCoachPolicy';

const CoachBriefing = lazy(() => import('../CoachBriefing'));

type PredictionCoachBriefingRuntimeProps = {
  game: Game;
  gameDetail: GameDetail | null;
  statusCode: GameStatusCode;
  isPastGame: boolean;
  isFutureGame: boolean;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
};

const TOTAL_SEASON_GAMES = 144;

export default function PredictionCoachBriefingRuntime({
  game,
  gameDetail,
  statusCode,
  isPastGame,
  isFutureGame,
  isLoggedIn,
  isAuthLoading,
}: PredictionCoachBriefingRuntimeProps) {
  const [rankingSnapshot, setRankingSnapshot] = useState<RankingSnapshot | null>(null);
  const [shouldRenderBriefing, setShouldRenderBriefing] = useState(false);

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
    setShouldRenderBriefing(false);

    const timerId = window.setTimeout(() => {
      setShouldRenderBriefing(true);
    }, 450);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [game.gameId]);

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

  if (!rankingSnapshot || !shouldRenderBriefing) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <CoachBriefing
        game={game}
        gameDetail={gameDetail}
        seasonContext={seasonContext}
        isPastGame={isPastGame}
        isFutureGame={isFutureGame}
        isLoggedIn={isLoggedIn}
        isAuthLoading={isAuthLoading}
        requestMode={coachBriefingPolicy.requestMode}
        autoEnabled={coachBriefingPolicy.autoEnabled && coachBriefingPolicy.requestMode === 'auto_brief'}
        forceManual={coachBriefingPolicy.forceManual}
      />
    </Suspense>
  );
}
