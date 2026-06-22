const MATE_GUEST_SAMPLES = [
  {
    title: '잠실 주말 경기 같이 보기',
    meta: 'LG vs 두산 · 1루 네이비석',
    tag: '모집 중',
  },
  {
    title: '고척 첫 직관 메이트',
    meta: '키움 홈경기 · 외야 응원석',
    tag: '초보 환영',
  },
] as const;

export default function MateGuestSampleList() {
  return (
    <div
      data-testid="mate-guest-sample-list"
      className="mx-auto mt-6 grid max-w-2xl gap-3 text-left sm:grid-cols-2"
      aria-label="같이가요 샘플 파티"
    >
      {MATE_GUEST_SAMPLES.map((sample) => (
        <article
          key={sample.title}
          data-testid="mate-guest-sample-card"
          className="rounded-2xl border border-gray-200/80 bg-gray-50 px-4 py-3.5 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[12px] font-black text-primary">
            {sample.tag}
          </span>
          <h2 className="mt-3 text-[15px] font-black leading-5 text-gray-900 dark:text-white">
            {sample.title}
          </h2>
          <p className="mt-1 text-sm font-bold leading-5 text-gray-500 dark:text-white">
            {sample.meta}
          </p>
        </article>
      ))}
    </div>
  );
}
