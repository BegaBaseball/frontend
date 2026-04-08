import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLeaderboardStore } from '../../store/leaderboardStore';
import type { Game, GameDetail, VoteTeam } from '../../types/prediction';
import type { GameStatusCode } from '../../utils/predictionStatus';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const LazyAdvancedMatchCard = lazy(() => import('./AdvancedMatchCard'));
const PredictionCoachBriefingRuntime = lazy(() => import('./PredictionCoachBriefingRuntime'));
const PredictionComboAnimationRuntime = lazy(() => import('./PredictionComboAnimationRuntime'));

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
            <Suspense fallback={null}>
              <PredictionCoachBriefingRuntime
                game={game}
                gameDetail={gameDetail}
                statusCode={statusCode}
                isPastGame={isPastGame}
                isFutureGame={isFutureGame}
                isLoggedIn={isLoggedIn}
                isAuthLoading={isAuthLoading}
              />
            </Suspense>
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
