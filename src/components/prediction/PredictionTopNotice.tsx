import { Link } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { PredictionLoaderIcon } from './PredictionShellIcons';

export type PredictionTopNoticeKind = 'RUN' | 'FUTURE' | 'ERROR' | 'END' | 'INFO';

interface PredictionTopNoticeProps {
  kind: PredictionTopNoticeKind;
  currentDateIndex: number;
  pastRangeLoadState: string;
  pastRangeLoadErrorMessage: string | null;
  futureRangeLoadState: string;
  futureRangeLoadErrorMessage: string | null;
  canLoadMorePast: boolean;
  canLoadMoreFuture: boolean;
  hasPastNavigation: boolean;
  isCurrentVotePartial: boolean;
  currentVotePartialReason: string | null;
  voteStatusError: string | null;
  isVoteRetryLoading: boolean;
  isRunBannerDismissed: boolean;
  isRunInProgress: boolean;
  runProgressMessage: string | null;
  deepLinkNotice: string | null;
  predictionRecoveryPath: string;
  onRetryLoadMorePastMatches: () => void;
  onRetryLoadMoreFutureMatches: () => void;
  onRetryVoteStatus: () => void;
  onRetryPartialVoteStatus: () => void;
  onDismissRunProgressBanner: () => void;
  onResumeRunProgressBanner: () => void;
}

const noticeCardBaseClass = 'w-full max-w-[22rem] gap-2 p-3 pointer-events-auto';

const renderRetryLabel = (isLoading: boolean, label: string) => (
  <span className="inline-flex items-center gap-1.5">
    {isLoading ? <PredictionLoaderIcon className="h-3.5 w-3.5 animate-spin" /> : null}
    {label}
  </span>
);

export default function PredictionTopNotice({
  kind,
  currentDateIndex,
  pastRangeLoadState,
  pastRangeLoadErrorMessage,
  futureRangeLoadState,
  futureRangeLoadErrorMessage,
  canLoadMorePast,
  canLoadMoreFuture,
  hasPastNavigation,
  isCurrentVotePartial,
  currentVotePartialReason,
  voteStatusError,
  isVoteRetryLoading,
  isRunInProgress,
  isRunBannerDismissed,
  runProgressMessage,
  deepLinkNotice,
  predictionRecoveryPath,
  onRetryLoadMorePastMatches,
  onRetryLoadMoreFutureMatches,
  onRetryVoteStatus,
  onRetryPartialVoteStatus,
  onDismissRunProgressBanner,
  onResumeRunProgressBanner,
}: PredictionTopNoticeProps) {
  const showRunProgressBanner = isRunInProgress && !isRunBannerDismissed;
  const isPastRetryLoading = pastRangeLoadState === 'loading';
  const isFutureRetryLoading = futureRangeLoadState === 'loading';

  if (kind === 'RUN' && showRunProgressBanner) {
    return (
      <Card className={`${noticeCardBaseClass} border border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-700/50 dark:bg-emerald-950/40 dark:text-emerald-100`}>
        <div className="flex flex-wrap items-center gap-3">
          <PredictionLoaderIcon className="h-4 w-4 animate-spin" />
          <p className="text-[16px] font-bold">{runProgressMessage}</p>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="min-h-11 border-emerald-300/70 hover:bg-emerald-100 dark:border-emerald-600/70 dark:hover:bg-emerald-900/40"
              onClick={onDismissRunProgressBanner}
            >
              백그라운드로 계산
            </Button>
            <Button
              size="sm"
              className="min-h-11 bg-emerald-900 text-white hover:bg-emerald-800 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
              onClick={onResumeRunProgressBanner}
            >
              지금 계속
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (kind === 'FUTURE') {
    if (futureRangeLoadState === 'loading') {
      return (
        <Card className={`${noticeCardBaseClass} border border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-100`}>
          <div className="inline-flex items-center gap-2 text-[16px] font-bold">
            <PredictionLoaderIcon className="h-3.5 w-3.5 animate-spin" />
            {futureRangeLoadErrorMessage || '다음 경기 탐색 중입니다.'}
          </div>
        </Card>
      );
    }

    return (
      <Card className={`${noticeCardBaseClass} border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-100`}>
        <p className="mb-2 text-[16px] font-bold">
          {futureRangeLoadErrorMessage || '미래 구간 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="sm"
            disabled={isFutureRetryLoading}
            className="min-h-11 bg-rose-900 text-white hover:bg-rose-800 dark:bg-rose-400 dark:text-rose-950 dark:hover:bg-rose-300"
            onClick={onRetryLoadMoreFutureMatches}
          >
            {renderRetryLabel(isFutureRetryLoading, '예정 경기 다시 불러오기')}
          </Button>
          <Link
            to={predictionRecoveryPath}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-rose-300/70 px-3 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
          >
            예측으로 돌아가기
          </Link>
        </div>
      </Card>
    );
  }

  if (kind === 'ERROR') {
    if (voteStatusError) {
      return (
        <Card className={`${noticeCardBaseClass} border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-100`}>
          <p className="mb-2 text-[16px] font-bold">투표 집계 조회 실패: {voteStatusError}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              disabled={isVoteRetryLoading}
              className="min-h-11 bg-rose-900 text-white hover:bg-rose-800 dark:bg-rose-400 dark:text-rose-950 dark:hover:bg-rose-300"
              onClick={onRetryVoteStatus}
            >
              {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
            </Button>
            <Link
              to={predictionRecoveryPath}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-rose-200 px-3 text-rose-900 hover:bg-rose-100 dark:border-rose-300/70 dark:text-rose-100 dark:hover:bg-rose-900/40"
            >
              예측으로 돌아가기
            </Link>
          </div>
        </Card>
      );
    }

    return (
      <Card className={`${noticeCardBaseClass} border border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-700/40 dark:bg-rose-900/30 dark:text-rose-100`}>
        <p className="mb-2 text-[16px] font-bold">
          이전 경기 조회 실패: {pastRangeLoadErrorMessage || '잠시 후 다시 시도해 주세요.'}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="sm"
            disabled={isPastRetryLoading}
            className="min-h-11 bg-rose-900 text-white hover:bg-rose-800 dark:bg-rose-400 dark:text-rose-950 dark:hover:bg-rose-300"
            onClick={onRetryLoadMorePastMatches}
          >
            {renderRetryLabel(isPastRetryLoading, '이전 경기 다시 불러오기')}
          </Button>
          <Link
            to={predictionRecoveryPath}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-rose-300/70 px-3 text-rose-900 hover:bg-rose-100 dark:border-rose-300/60 dark:text-rose-100 dark:hover:bg-rose-800/30"
          >
            예측으로 돌아가기
          </Link>
        </div>
      </Card>
    );
  }

  if (kind === 'END') {
    const isPastEnd = currentDateIndex === 0 && !canLoadMorePast && pastRangeLoadState === 'end';

    return (
      <Card className={`${noticeCardBaseClass} border border-slate-200 bg-slate-50 text-slate-700 dark:border-border dark:bg-card dark:text-white`}>
          <p className="text-[16px] font-bold">
          {isPastEnd
            ? (pastRangeLoadErrorMessage || '더 이상 이전 경기가 없습니다.')
            : (futureRangeLoadErrorMessage || '더 이상 예정 경기가 없습니다.')}
        </p>
      </Card>
    );
  }

  if (kind === 'INFO') {
    if (deepLinkNotice) {
      return (
        <Card className={`${noticeCardBaseClass} border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-100`}>
          <div className="text-[16px]">{deepLinkNotice}</div>
        </Card>
      );
    }

    if (currentDateIndex === 0 && pastRangeLoadState === 'loading') {
      return (
        <Card className={`${noticeCardBaseClass} border border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-700/40 dark:bg-sky-900/30 dark:text-sky-100`}>
          <div className="inline-flex items-center gap-2 text-[16px] font-bold">
            <PredictionLoaderIcon className="h-3.5 w-3.5 animate-spin" />
            이전 경기 탐색 중입니다.
          </div>
        </Card>
      );
    }

    if (isCurrentVotePartial) {
      return (
        <Card
          data-testid="prediction-partial-result-notice"
          className={`${noticeCardBaseClass} border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/40 dark:bg-amber-900/30 dark:text-amber-100`}
        >
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-200/80 px-2 py-0.5 text-[16px] font-bold text-amber-900 dark:bg-amber-800/70 dark:text-amber-100">
              부분 결과
            </span>
            <p className="text-[16px] font-bold">투표 집계가 일부만 도착했습니다.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              disabled={isVoteRetryLoading}
              data-testid="prediction-partial-retry-btn"
              className="min-h-11 bg-amber-800 text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
              onClick={onRetryPartialVoteStatus}
            >
              {renderRetryLabel(isVoteRetryLoading, '투표 집계 다시 시도')}
            </Button>
            <span className="inline-flex items-center text-[16px] text-amber-800/80 dark:text-amber-100/80">
              사유: {currentVotePartialReason || 'unknown'}
            </span>
          </div>
        </Card>
      );
    }

    return null;
  }

  return null;
}
