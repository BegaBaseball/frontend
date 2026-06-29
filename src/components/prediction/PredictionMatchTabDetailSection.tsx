import { lazy, Suspense } from 'react';
import { Card } from '../ui/card';
import type { PredictionUserVoteResolutionState } from '../../hooks/predictionHookShared';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import type { Game, GameDetail, VoteStatus, VoteTeam } from '../../types/prediction';
import {
  calculateVotePercentages,
  getGameStatus,
  hasGameDetailProgressData,
  type GameStatusResult,
} from '../../utils/predictionStatus';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionMatchDetailPanel = lazy(() => import('./PredictionMatchDetailPanel'));

interface PredictionMatchTabDetailSectionProps {
  currentDate: string;
  currentGame: Game;
  currentGameId: string;
  currentGameDetail: GameDetail | null;
  currentGameDetailLoading: boolean;
  currentGameDetailRefreshing: boolean;
  currentGameDetailError: string | null;
  currentGameDetailErrorCode: string | null;
  userVote: Record<string, VoteTeam | null>;
  currentUserVoteResolutionState: PredictionUserVoteResolutionState;
  votes: Record<string, VoteStatus>;
  isLoggedIn: boolean;
  isAuthLoading: boolean;
  isVoteActionLocked: boolean;
  predictionRecoveryPath: string;
  canMovePrevDate: boolean;
  canMoveNextDate: boolean;
  isDetailRetryLoading: boolean;
  onVote: (team: VoteTeam, game: Game, isVoteOpen: boolean) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  reloadCurrentGameDetail: (options?: { emitRetryEvent?: boolean }) => void;
}

function PredictionMatchDetailFallback() {
  return (
    <Card className="relative p-4 mb-4 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md rounded-2xl">
      <div className="inline-flex items-center gap-2 text-body text-slate-500 dark:text-white">
        <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
        경기 카드를 준비하고 있습니다.
      </div>
    </Card>
  );
}

export default function PredictionMatchTabDetailSection({
  currentDate,
  currentGame,
  currentGameId,
  currentGameDetail,
  currentGameDetailLoading,
  currentGameDetailRefreshing,
  currentGameDetailError,
  currentGameDetailErrorCode,
  userVote,
  currentUserVoteResolutionState,
  votes,
  isLoggedIn,
  isAuthLoading,
  isVoteActionLocked,
  predictionRecoveryPath,
  canMovePrevDate,
  canMoveNextDate,
  isDetailRetryLoading,
  onVote,
  onPrevDate,
  onNextDate,
  reloadCurrentGameDetail,
}: PredictionMatchTabDetailSectionProps) {
  const currentVotes = votes[currentGameId] || { home: 0, away: 0 };
  const votePercentages = calculateVotePercentages(currentVotes.home, currentVotes.away);
  const hasCurrentGameProgressData = hasGameDetailProgressData(currentGameDetail);
  const hasCurrentGameScores = currentGame.homeScore != null && currentGame.awayScore != null;
  const currentTime = useCurrentTime(60_000);
  const gameStatus: GameStatusResult = getGameStatus(currentGame, currentTime, {
    gameStatus: currentGameDetail?.gameStatus || currentGame.gameStatus,
    gameDate: currentGameDetail?.gameDate || currentGame.gameDate || currentDate,
    startTime: currentGameDetail?.startTime || currentGame.startTime || null,
    homeScore: currentGameDetail?.homeScore ?? currentGame.homeScore ?? null,
    awayScore: currentGameDetail?.awayScore ?? currentGame.awayScore ?? null,
    hasProgressData: hasCurrentGameProgressData || hasCurrentGameScores,
  });
  const { isPastGame, isFutureGame, statusCode } = gameStatus;

  return (
    <Suspense fallback={<PredictionMatchDetailFallback />}>
      <PredictionMatchDetailPanel
        game={currentGame}
        gameDetail={currentGameDetail}
        gameDetailLoading={currentGameDetailLoading}
        gameDetailRefreshing={currentGameDetailRefreshing}
        gameDetailError={currentGameDetailError}
        gameDetailErrorCode={currentGameDetailErrorCode}
        isDetailRetryLoading={isDetailRetryLoading}
        reloadCurrentGameDetail={reloadCurrentGameDetail}
        predictionRecoveryPath={predictionRecoveryPath}
        userVote={userVote[currentGameId]}
        userVoteResolutionState={currentUserVoteResolutionState}
        votePercentages={votePercentages}
        isVoteOpen={gameStatus.isVoteOpen}
        isVoteActionLocked={isVoteActionLocked}
        statusLabel={gameStatus.statusLabel}
        statusCode={statusCode}
        isPastGame={isPastGame}
        isFutureGame={isFutureGame}
        onVote={(team) => onVote(team, currentGame, gameStatus.isVoteOpen)}
        onPrevDate={onPrevDate}
        onNextDate={onNextDate}
        hasPrevDate={canMovePrevDate}
        hasNextDate={canMoveNextDate}
        isLoggedIn={isLoggedIn}
        isAuthLoading={isAuthLoading}
      />
    </Suspense>
  );
}
