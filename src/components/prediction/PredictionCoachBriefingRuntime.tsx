import { lazy, Suspense } from 'react';

import type { Game, GameDetail } from '../../types/prediction';
import type { CoachRequestMode } from '../../utils/prediction';

const CoachBriefing = lazy(() => import('../CoachBriefing'));

type SeasonTeamContext = {
  rank: number;
  gamesBehind: number;
  remainingGames: number;
} | null;

type PredictionCoachBriefingRuntimeProps = {
  game: Game;
  gameDetail: GameDetail | null;
  seasonContext: {
    home: SeasonTeamContext;
    away: SeasonTeamContext;
    canCallAI: boolean;
  };
  requestMode: CoachRequestMode;
  autoEnabled: boolean;
  forceManual: boolean;
  isPastGame: boolean;
  isFutureGame: boolean;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
};

export default function PredictionCoachBriefingRuntime({
  game,
  gameDetail,
  seasonContext,
  requestMode,
  autoEnabled,
  forceManual,
  isPastGame,
  isFutureGame,
  isLoggedIn,
  isAuthLoading,
}: PredictionCoachBriefingRuntimeProps) {
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
        requestMode={requestMode}
        autoEnabled={autoEnabled}
        forceManual={forceManual}
      />
    </Suspense>
  );
}
