import { useMemo } from 'react';

import { buildPredictionRecoveryPath } from '../../utils/predictionDeepLink';
import type { PredictionTopNoticeKind } from './PredictionTopNotice';
import PredictionTopNotice from './PredictionTopNotice';

type PredictionMatchScheduleTopNoticeRuntimeProps = {
  kind: PredictionTopNoticeKind;
  currentDateIndex: number;
  currentDate: string;
  currentGameId?: string;
  pastRangeLoadState: string;
  pastRangeLoadErrorMessage: string | null;
  futureRangeLoadState: string;
  futureRangeLoadErrorMessage: string | null;
  canLoadMorePast: boolean;
  canLoadMoreFuture: boolean;
  hasPastNavigation: boolean;
  deepLinkNotice: string | null;
  onRetryLoadMorePastMatches: () => void;
  onRetryLoadMoreFutureMatches: () => void;
};

export default function PredictionMatchScheduleTopNoticeRuntime({
  kind,
  currentDateIndex,
  currentDate,
  currentGameId,
  pastRangeLoadState,
  pastRangeLoadErrorMessage,
  futureRangeLoadState,
  futureRangeLoadErrorMessage,
  canLoadMorePast,
  canLoadMoreFuture,
  hasPastNavigation,
  deepLinkNotice,
  onRetryLoadMorePastMatches,
  onRetryLoadMoreFutureMatches,
}: PredictionMatchScheduleTopNoticeRuntimeProps) {
  const predictionRecoveryPath = useMemo(() => buildPredictionRecoveryPath({
    currentDate,
    currentGameId,
  }), [currentDate, currentGameId]);

  const shellPastRangeErrorMessage = useMemo(() => {
    if (!pastRangeLoadErrorMessage) {
      return null;
    }

    if (pastRangeLoadState !== 'error') {
      return pastRangeLoadErrorMessage;
    }

    return pastRangeLoadErrorMessage.includes('이전 경기 조회')
      ? pastRangeLoadErrorMessage
      : `이전 경기 조회 실패: ${pastRangeLoadErrorMessage}`;
  }, [pastRangeLoadErrorMessage, pastRangeLoadState]);

  const shellFutureRangeErrorMessage = useMemo(() => {
    if (!futureRangeLoadErrorMessage) {
      return null;
    }

    if (futureRangeLoadState !== 'error') {
      return futureRangeLoadErrorMessage;
    }

    return futureRangeLoadErrorMessage.includes('미래 구간 조회')
      ? futureRangeLoadErrorMessage
      : `미래 구간 조회 실패: ${futureRangeLoadErrorMessage}`;
  }, [futureRangeLoadErrorMessage, futureRangeLoadState]);

  return (
    <PredictionTopNotice
      kind={kind}
      currentDateIndex={currentDateIndex}
      pastRangeLoadState={pastRangeLoadState}
      pastRangeLoadErrorMessage={shellPastRangeErrorMessage}
      futureRangeLoadState={futureRangeLoadState}
      futureRangeLoadErrorMessage={shellFutureRangeErrorMessage}
      canLoadMorePast={canLoadMorePast}
      canLoadMoreFuture={canLoadMoreFuture}
      hasPastNavigation={hasPastNavigation}
      isCurrentVotePartial={false}
      currentVotePartialReason={null}
      voteStatusError={null}
      isVoteRetryLoading={false}
      isRunInProgress={false}
      isRunBannerDismissed={false}
      runProgressMessage={null}
      deepLinkNotice={deepLinkNotice}
      predictionRecoveryPath={predictionRecoveryPath}
      onRetryLoadMorePastMatches={onRetryLoadMorePastMatches}
      onRetryLoadMoreFutureMatches={onRetryLoadMoreFutureMatches}
      onRetryVoteStatus={() => {}}
      onRetryPartialVoteStatus={() => {}}
      onDismissRunProgressBanner={() => {}}
      onResumeRunProgressBanner={() => {}}
    />
  );
}
