type CheerDetailStatsBodyProps = {
  commentCount: number;
  createdAtLabel: string;
  repostedAtLabel: string | null;
  teamName: string;
  views: number;
};

export default function CheerDetailStatsBody({
  commentCount,
  createdAtLabel,
  repostedAtLabel,
  teamName,
  views,
}: CheerDetailStatsBodyProps) {
  return (
    <>
      <div className="rounded-xl border border-[var(--cheer-line-10)] bg-[var(--cheer-chip-bg)] px-2 py-2">
        <div className="flex items-center gap-2">
          <p className="text-body text-slate-500 dark:text-white">응원 구단</p>
          <p className="truncate text-body font-bold text-slate-900 dark:text-white">{teamName}</p>
        </div>
      </div>
      <div className="rounded-xl bg-[var(--cheer-chip-bg)] px-2 py-2">
        <div className="flex items-center justify-between">
          <span className="text-body text-slate-500 dark:text-white">원문 작성</span>
          <span className="max-w-[108px] text-right text-body font-bold text-slate-800 dark:text-white">{createdAtLabel}</span>
        </div>
      </div>
      <div className="rounded-xl bg-[var(--cheer-chip-bg)] px-2 py-2">
        <div className="flex items-center justify-between">
          <span className="text-body text-slate-500 dark:text-white">조회수</span>
          <span className="text-body font-bold text-slate-800 dark:text-white">{views.toLocaleString()}회</span>
        </div>
      </div>
      <div className="rounded-xl bg-[var(--cheer-chip-bg)] px-2 py-2">
        <div className="flex items-center justify-between">
          <span className="text-body text-slate-500 dark:text-white">댓글 수</span>
          <span className="text-body font-bold text-slate-800 dark:text-white">{commentCount.toLocaleString()}개</span>
        </div>
      </div>
      {repostedAtLabel ? (
        <div className="rounded-xl bg-[var(--cheer-chip-bg)] px-2 py-2">
          <div className="flex items-center justify-between">
            <span className="text-body text-slate-500 dark:text-white">공유 시각</span>
            <span className="max-w-[108px] text-right text-body font-bold text-slate-800 dark:text-white">{repostedAtLabel}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
