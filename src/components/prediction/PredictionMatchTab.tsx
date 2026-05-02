import { lazy, Suspense } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import type { PredictionUserVoteResolutionState } from '../../hooks/predictionHookShared';
import type { Game, GameDetail, VoteStatus, VoteTeam } from '../../types/prediction';
import {
  calculateVotePercentages,
  getGameStatus,
  hasGameDetailProgressData,
  type GameStatusResult,
} from '../../utils/predictionStatus';
import { formatDate } from '../../utils/predictionDates';
import {
  PredictionChevronLeftIcon,
  PredictionChevronRightIcon,
  PredictionLoaderIcon,
  PredictionTrendingUpIcon,
} from './PredictionShellIcons';

const PredictionMatchDetailPanel = lazy(() => import('./PredictionMatchDetailPanel'));

interface PredictionMatchTabProps {
  currentDateGames: Game[];
  selectedGame: number;
  currentDate: string;
  currentGame: Game | null;
  currentGameId: string | undefined;
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
  shouldRenderMatchCard: boolean;
  isVoteActionLocked: boolean;
  predictionRecoveryPath: string;
  canMovePrevDate: boolean;
  canMoveNextDate: boolean;
  isDetailRetryLoading: boolean;
  nearestNavigationDate: { date: string; isPast: boolean } | null;
  isToday: boolean;
  onVote: (team: VoteTeam, game: Game, isVoteOpen: boolean) => void;
  onPrevDate: () => void;
  onNextDate: () => void;
  onNearestNavigation: () => void;
  onSelectGame: (gameIndex: number) => void;
  reloadCurrentGameDetail: (options?: { emitRetryEvent?: boolean }) => void;
}

export default function PredictionMatchTab({
  currentDateGames,
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
  shouldRenderMatchCard,
  isVoteActionLocked,
  predictionRecoveryPath,
  canMovePrevDate,
  canMoveNextDate,
  isDetailRetryLoading,
  nearestNavigationDate,
  isToday,
  onVote,
  onPrevDate,
  onNextDate,
  onNearestNavigation,
  reloadCurrentGameDetail,
}: PredictionMatchTabProps) {
  const currentVotes = currentGameId ? votes[currentGameId] || { home: 0, away: 0 } : { home: 0, away: 0 };
  const votePercentages = calculateVotePercentages(currentVotes.home, currentVotes.away);
  const hasCurrentGameProgressData = hasGameDetailProgressData(currentGameDetail);
  const hasCurrentGameScores = currentGame?.homeScore != null && currentGame?.awayScore != null;
  const gameStatus: GameStatusResult = getGameStatus(currentGame, new Date(), {
    gameStatus: currentGameDetail?.gameStatus || currentGame?.gameStatus,
    gameDate: currentGameDetail?.gameDate || currentGame?.gameDate || currentDate,
    startTime: currentGameDetail?.startTime || currentGame?.startTime || null,
    homeScore: currentGameDetail?.homeScore ?? currentGame?.homeScore ?? null,
    awayScore: currentGameDetail?.awayScore ?? currentGame?.awayScore ?? null,
    hasProgressData: hasCurrentGameProgressData || hasCurrentGameScores,
  });
  const { isToday: isCurrentDateToday, isPastGame, isFutureGame, statusCode } = gameStatus;

  return (
    <>
      <div className="flex md:hidden items-center justify-between mb-3 px-4">
        <button
          type="button"
          onClick={onPrevDate}
          disabled={!canMovePrevDate}
          aria-label="이전 날짜 보기"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30"
        >
          <PredictionChevronLeftIcon size={24} className="text-emerald-600 dark:text-emerald-300" />
        </button>
        <span className="font-bold text-slate-900 dark:text-gray-100">
          {formatDate(currentDate)}
        </span>
        <button
          type="button"
          onClick={onNextDate}
          disabled={!canMoveNextDate}
          aria-label="다음 날짜 보기"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30"
        >
          <PredictionChevronRightIcon size={24} className="text-emerald-600 dark:text-emerald-300" />
        </button>
      </div>

      <div className="w-full">
        {currentDateGames.length > 0 ? (
          <>
            {shouldRenderMatchCard && currentGame && currentGameId ? (
              <Suspense
                fallback={(
                  <Card className="relative p-4 mb-4 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md rounded-2xl">
                    <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-gray-300">
                      <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
                      경기 카드를 준비하고 있습니다.
                    </div>
                  </Card>
                )}
              >
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
                  userVote={currentGameId ? userVote[currentGameId] : null}
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
            ) : null}
          </>
        ) : (
          <Card className="relative p-4 sm:p-6 md:p-7 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md flex flex-col items-center justify-center min-h-[170px] sm:min-h-[210px] md:min-h-[250px] rounded-2xl">
            <div className="hidden md:block">
              <button
                type="button"
                onClick={onPrevDate}
                disabled={!canMovePrevDate}
                aria-label="이전 날짜 보기"
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
              >
                <PredictionChevronLeftIcon size={36} />
              </button>
              <button
                type="button"
                onClick={onNextDate}
                disabled={!canMoveNextDate}
                aria-label="다음 날짜 보기"
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 dark:text-gray-300 transition-colors"
              >
                <PredictionChevronRightIcon size={36} />
              </button>
            </div>

            <div className="bg-slate-100 dark:bg-card p-4 rounded-full mb-4">
              <PredictionTrendingUpIcon className="w-8 h-8 text-slate-400 dark:text-gray-300" />
            </div>
            <div className="mb-4">
              <p className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-1">
                {formatDate(currentDate)}
              </p>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-2">
              {isCurrentDateToday || isToday ? '오늘은 예정된 경기가 없습니다.' : '예정된 경기 일정이 없습니다.'}
            </h3>
            <p className="text-slate-500 dark:text-gray-300">
              {nearestNavigationDate
                ? `가장 가까운 경기일은 ${formatDate(nearestNavigationDate.date)}입니다. ${nearestNavigationDate.isPast ? '이전' : '다음'} 날짜로 이동해 확인해보세요!`
                : '다른 날짜를 확인해보세요!'}
            </p>
            {nearestNavigationDate ? (
              <Button
                type="button"
                variant="outline"
                data-testid="prediction-empty-nearest-date-btn"
                className="mt-3 min-h-10 border-emerald-200 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-400/30 dark:text-emerald-200 dark:hover:bg-emerald-500/10"
                onClick={onNearestNavigation}
              >
                {nearestNavigationDate.isPast ? '가장 가까운 이전 경기 보기' : '가장 가까운 다음 경기 보기'}
              </Button>
            ) : null}
          </Card>
        )}
      </div>
    </>
  );
}
