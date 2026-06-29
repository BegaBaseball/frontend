import { lazy, Suspense } from 'react';
import type { PredictionUserVoteResolutionState } from '../../hooks/predictionHookShared';
import type { Game, GameDetail, VoteStatus, VoteTeam } from '../../types/prediction';
import { formatDate } from '../../utils/predictionDates';
import {
  PredictionChevronLeftIcon,
  PredictionChevronRightIcon,
} from './PredictionShellIcons';

const PredictionMatchTabDetailSection = lazy(() => import('./PredictionMatchTabDetailSection'));
const PredictionMatchTabEmptyState = lazy(() => import('./PredictionMatchTabEmptyState'));

interface PredictionMatchTabProps {
  currentDateGames: Game[];
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
        <span className="font-bold text-slate-900 dark:text-white">
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
                  <div className="relative p-4 mb-4 text-center bg-white/90 border border-slate-200/70 shadow-sm dark:bg-card dark:border-border dark:shadow-md rounded-2xl">
                    <div className="inline-flex items-center gap-2 text-body text-slate-500 dark:text-white">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      경기 카드를 준비하고 있습니다.
                    </div>
                  </div>
                )}
              >
                <div key={currentGameId} className="animate-fade-in-up motion-reduce:animate-none">
                  <PredictionMatchTabDetailSection
                    currentDate={currentDate}
                    currentGame={currentGame}
                    currentGameId={currentGameId}
                    currentGameDetail={currentGameDetail}
                    currentGameDetailLoading={currentGameDetailLoading}
                    currentGameDetailRefreshing={currentGameDetailRefreshing}
                    currentGameDetailError={currentGameDetailError}
                    currentGameDetailErrorCode={currentGameDetailErrorCode}
                    userVote={userVote}
                    currentUserVoteResolutionState={currentUserVoteResolutionState}
                    votes={votes}
                    isLoggedIn={isLoggedIn}
                    isAuthLoading={isAuthLoading}
                    isVoteActionLocked={isVoteActionLocked}
                    predictionRecoveryPath={predictionRecoveryPath}
                    canMovePrevDate={canMovePrevDate}
                    canMoveNextDate={canMoveNextDate}
                    isDetailRetryLoading={isDetailRetryLoading}
                    onVote={onVote}
                    onPrevDate={onPrevDate}
                    onNextDate={onNextDate}
                    reloadCurrentGameDetail={reloadCurrentGameDetail}
                  />
                </div>
              </Suspense>
            ) : null}
          </>
        ) : (
          <Suspense
            fallback={(
              <div className="relative flex min-h-[170px] flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md sm:min-h-[210px] md:min-h-[250px]">
                <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100 dark:bg-white/10" />
              </div>
            )}
          >
            <PredictionMatchTabEmptyState
              currentDate={currentDate}
              isToday={isToday}
              nearestNavigationDate={nearestNavigationDate}
              canMovePrevDate={canMovePrevDate}
              canMoveNextDate={canMoveNextDate}
              onPrevDate={onPrevDate}
              onNextDate={onNextDate}
              onNearestNavigation={onNearestNavigation}
            />
          </Suspense>
        )}
      </div>
    </>
  );
}
