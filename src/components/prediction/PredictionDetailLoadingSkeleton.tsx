const skeletonBlockClassName = 'animate-pulse rounded-md bg-slate-200/80 dark:bg-secondary/70';

export default function PredictionDetailLoadingSkeleton() {
  return (
    <section
      aria-hidden="true"
      data-testid="prediction-detail-loading-skeleton"
      className="min-h-[148px] rounded-xl border border-slate-200/70 bg-slate-50/70 px-4 py-4 dark:border-border dark:bg-secondary/25"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-lg border border-slate-200/60 bg-white/70 px-3.5 py-3 dark:border-border dark:bg-card/45">
            <div className={`${skeletonBlockClassName} h-3 w-16`} />
            <div className={`${skeletonBlockClassName} mt-3 h-4 w-full`} />
            <div className={`${skeletonBlockClassName} mt-2 h-4 w-2/3`} />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 rounded-lg border border-slate-200/60 bg-white/60 px-3 py-3 dark:border-border dark:bg-card/35">
        <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className={`${skeletonBlockClassName} h-3.5`} />
          ))}
        </div>
        <div className="grid grid-cols-[1.2fr_repeat(4,1fr)] gap-2">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className={`${skeletonBlockClassName} h-3.5`} />
          ))}
        </div>
      </div>
    </section>
  );
}
