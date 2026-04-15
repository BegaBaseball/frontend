import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import type {
  LoadVoteStatusOptions,
  PredictionErrorOverlayState,
  PredictionUserVoteResolutionState,
} from '../../hooks/predictionHookShared';
import type { Game, GameDetail, MatchBounds, VoteStatus, VoteTeam } from '../../types/prediction';
import type { PredRecoveryAction } from '../../types/predictionFlow';
import { Card } from '../ui/card';
import type { PredictionMatchVoteControllerRenderState } from './PredictionMatchVoteController';
import { PredictionLoaderIcon } from './PredictionShellIcons';

const PredictionMatchInteractiveContentRuntime = lazy(
  () => import('./PredictionMatchInteractiveContentRuntime'),
);

export type PredictionMatchInteractiveViewProps = {
  currentGame: Game | null;
  currentDateGames: Game[];
  currentDate: string;
  currentDayNavigationMeta: { prevDate: string | null; nextDate: string | null } | null;
  votes: Record<string, VoteStatus>;
  userVote: Record<string, VoteTeam | null>;
  currentUserVoteResolutionState: PredictionUserVoteResolutionState;
  currentGameDetail: GameDetail | null;
  currentGameDetailLoading: boolean;
  currentGameDetailRefreshing: boolean;
  isAuthLoading: boolean;
  allDatesData: Array<{ date: string; games: Game[] }>;
  currentDateIndex: number;
  currentGameDetailError: string | null;
  deepLinkNotice: string | null;
  voteStatusError: string | null;
  voteStatusLoading: boolean;
  isCurrentVotePartial: boolean;
  currentVotePartialReason: string | null;
  goToPreviousDate: () => void;
  goToNextDate: () => void;
  goToDate: (date: string) => Promise<void> | void;
  reloadMatches: () => void;
  isLoggedIn: boolean;
  matchesLoadState: 'idle' | 'ready' | 'error';
  matchesLoadErrorMessage: string | null;
  pastRangeLoadState: 'idle' | 'loading' | 'ready' | 'error' | 'end';
  pastRangeLoadErrorMessage: string | null;
  futureRangeLoadState: 'idle' | 'loading' | 'ready' | 'error' | 'end';
  futureRangeLoadErrorMessage: string | null;
  canLoadMorePast: boolean;
  canLoadMoreFuture: boolean;
  matchBounds: MatchBounds | null;
  reloadCurrentVoteStatus: (options?: LoadVoteStatusOptions) => void;
  reloadCurrentGameDetail: () => void;
  predictionErrorOverlay: PredictionErrorOverlayState | null;
  handlePredictionErrorOverlayAction: (action: PredRecoveryAction) => void | Promise<void>;
  closePredictionErrorOverlay: () => void;
  retryLoadMorePastMatches: () => void;
  retryLoadMoreFutureMatches: () => void;
  pendingVoteAction: unknown;
  isQueueVoteLocked: boolean;
  loading: boolean;
  currentGameId?: string;
  voteControllerState?: PredictionMatchVoteControllerRenderState;
  onQueueVoteAction: (team: VoteTeam, game: Game, isVoteOpen: boolean) => void;
  onRequireLoginForVote: () => void;
};

export default function PredictionMatchInteractiveView({
  pendingVoteAction,
  isQueueVoteLocked,
  voteControllerState,
  currentGameId,
  currentUserVoteResolutionState,
  onQueueVoteAction,
  onRequireLoginForVote,
  ...rest
}: PredictionMatchInteractiveViewProps) {
  const immediateVoteLockRef = useRef(false);
  const voteLockReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [optimisticVoteLock, setOptimisticVoteLock] = useState(false);

  const isRunInProgress = voteControllerState?.isRunInProgress ?? false;
  const isVoteActionLocked = Boolean(pendingVoteAction) || isRunInProgress;
  const effectiveVoteActionLocked = isVoteActionLocked || isQueueVoteLocked || optimisticVoteLock;

  const clearVoteLockReleaseTimer = useCallback(() => {
    if (voteLockReleaseTimerRef.current) {
      clearTimeout(voteLockReleaseTimerRef.current);
      voteLockReleaseTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isVoteActionLocked) {
      clearVoteLockReleaseTimer();
      return;
    }

    if (!optimisticVoteLock) {
      return;
    }

    clearVoteLockReleaseTimer();
    voteLockReleaseTimerRef.current = setTimeout(() => {
      immediateVoteLockRef.current = false;
      setOptimisticVoteLock(false);
      voteLockReleaseTimerRef.current = null;
    }, 500);

    return () => {
      clearVoteLockReleaseTimer();
    };
  }, [clearVoteLockReleaseTimer, isVoteActionLocked, optimisticVoteLock]);

  useEffect(() => () => {
    clearVoteLockReleaseTimer();
  }, [clearVoteLockReleaseTimer]);

  useEffect(() => {
    clearVoteLockReleaseTimer();
    immediateVoteLockRef.current = false;
    setOptimisticVoteLock(false);
  }, [clearVoteLockReleaseTimer, currentGameId]);

  const handleVote = useCallback((team: VoteTeam, game: Game, isVoteOpen: boolean) => {
    if (currentUserVoteResolutionState === 'unknown-auth') {
      onRequireLoginForVote();
      return;
    }

    if (immediateVoteLockRef.current || effectiveVoteActionLocked) {
      return;
    }

    immediateVoteLockRef.current = true;
    setOptimisticVoteLock(true);

    if (voteControllerState) {
      void voteControllerState.handleVote(team, game, isVoteOpen);
      return;
    }

    onQueueVoteAction(team, game, isVoteOpen);
  }, [
    currentUserVoteResolutionState,
    effectiveVoteActionLocked,
    onQueueVoteAction,
    onRequireLoginForVote,
    voteControllerState,
  ]);

  return (
    <Suspense
      fallback={(
        <Card className="relative mb-4 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="inline-flex items-center gap-2 text-[16px] text-slate-500 dark:text-gray-300">
            <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
            경기 화면을 준비하고 있습니다.
          </div>
        </Card>
      )}
    >
      <PredictionMatchInteractiveContentRuntime
        {...rest}
        currentGameId={currentGameId}
        currentUserVoteResolutionState={currentUserVoteResolutionState}
        pendingVoteAction={pendingVoteAction}
        isQueueVoteLocked={isQueueVoteLocked}
        voteControllerState={voteControllerState}
        effectiveVoteActionLocked={effectiveVoteActionLocked}
        onVote={handleVote}
        onRequireLoginForVote={onRequireLoginForVote}
      />
    </Suspense>
  );
}
