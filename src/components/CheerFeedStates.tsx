import EmptyState from './common/EmptyState';

type FeedTabKey = 'all' | 'popular' | 'following';

interface CheerFeedEmptyStateProps {
  feedTab: FeedTabKey;
  teamColor: string;
  onWriteClick: () => void;
}

interface CheerFeedLoginRequiredStateProps {
  teamColor: string;
  onRequireLogin: () => void;
}

interface CheerFeedErrorStateProps {
  onRetry: () => void;
}

const skeletonRows = [1, 2, 3];

export function CheerFeedLoadingSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-live="polite"
      data-testid="cheer-feed-skeleton"
      className="overflow-hidden rounded-2xl border border-[var(--cheer-line-10)] bg-[var(--cheer-card-bg)] shadow-sm"
    >
      <div className="border-b border-border/70 px-4 py-3 text-13 font-bold text-muted-foreground dark:border-border">
        응원글을 불러오는 중
      </div>
      <div className="divide-y divide-border/70 dark:divide-border">
        {skeletonRows.map((index) => (
          <div
            key={index}
            data-testid="cheer-feed-skeleton-row"
            className="px-4 py-4"
          >
            <div className="flex animate-skeleton-pulse gap-3">
              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="h-3 w-16 rounded bg-muted/80" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-muted" />
                  <div className="h-4 w-5/6 rounded bg-muted" />
                  <div className="h-4 w-4/6 rounded bg-muted/80" />
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="h-4 w-12 rounded bg-muted/80" />
                  <div className="h-4 w-12 rounded bg-muted/80" />
                  <div className="h-4 w-12 rounded bg-muted/80" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheerFeedEmptyState({
  feedTab,
  teamColor,
  onWriteClick,
}: CheerFeedEmptyStateProps) {
  const isFollowing = feedTab === 'following';
  const title = isFollowing ? '팔로우한 유저가 없습니다' : '아직 작성된 응원글이 없습니다.';
  const description = isFollowing
    ? '다른 유저를 팔로우하면 여기에 글이 표시됩니다.'
    : '첫 번째 응원글을 남겨보세요.';

  return (
    <EmptyState
      testId="cheer-feed-empty-state"
      title={title}
      description={description}
      className="border-x-0 border-t-0 bg-transparent shadow-none sm:mx-2 sm:border-x sm:border-t sm:bg-card/60"
      action={isFollowing ? null : (
        <button
          type="button"
          data-testid="cheer-feed-empty-write"
          onClick={onWriteClick}
          className="min-h-11 rounded-full px-6 py-2 text-15 font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
          style={{ backgroundColor: teamColor }}
        >
          첫 글 작성하기
        </button>
      )}
    />
  );
}

export function CheerFeedLoginRequiredState({
  teamColor,
  onRequireLogin,
}: CheerFeedLoginRequiredStateProps) {
  return (
    <EmptyState
      testId="cheer-feed-login-required"
      title="로그인이 필요합니다"
      description="팔로우한 유저의 글을 보려면 로그인해주세요."
      className="border-x-0 border-t-0 bg-transparent shadow-none sm:mx-2 sm:border-x sm:border-t sm:bg-card/60"
      action={(
        <button
          type="button"
          onClick={onRequireLogin}
          className="min-h-11 rounded-full px-6 py-2 text-15 font-bold text-white"
          style={{ backgroundColor: teamColor }}
        >
          로그인하기
        </button>
      )}
    />
  );
}

export function CheerFeedErrorState({ onRetry }: CheerFeedErrorStateProps) {
  return (
    <EmptyState
      testId="cheer-feed-error-state"
      title="데이터를 불러오지 못했습니다"
      description="네트워크 상태를 확인하고 다시 시도해 주세요."
      tone="danger"
      className="border-x-0 border-t-0 shadow-none sm:mx-2 sm:border-x sm:border-t"
      action={(
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-full bg-secondary px-6 py-2 text-15 font-bold text-secondary-foreground transition-colors hover:bg-secondary/80"
        >
          다시 시도
        </button>
      )}
    />
  );
}
