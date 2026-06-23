import { lazy, Suspense } from 'react';

import type { Game, GameDetail } from '../../types/prediction';
import type { CoachAnalysisType, CoachRequestMode } from '../../utils/coachBriefingRequestDescriptor';

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
  analysisType: CoachAnalysisType;
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
  analysisType,
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
        analysisType={analysisType}
        autoEnabled={autoEnabled}
        forceManual={forceManual}
      />
    </Suspense>
  );
}
