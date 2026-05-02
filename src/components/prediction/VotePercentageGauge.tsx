interface VotePercentageGaugeProps {
  awayColor: string;
  homeColor: string;
  awayTeamName: string;
  homeTeamName: string;
  awayVotes: number;
  homeVotes: number;
  awayPercent: number;
  homePercent: number;
  cheeringCaption: string;
  cheeringTotal: number;
}

export function VotePercentageGauge({
  awayColor,
  homeColor,
  awayTeamName,
  homeTeamName,
  awayVotes,
  homeVotes,
  awayPercent,
  homePercent,
  cheeringCaption,
  cheeringTotal,
}: VotePercentageGaugeProps) {
  return (
    <div className="my-5 px-2.5">
      <div className="mb-2 flex items-end justify-between gap-3 max-sm:items-start max-sm:gap-2">
        <div className="min-w-0 flex-1 text-left">
          <div className="mb-0.5 truncate text-[1rem] font-bold text-gray-400 max-sm:text-[0.92rem]">
            {awayTeamName} 응원
          </div>
          <div className="flex flex-wrap items-baseline justify-start gap-1 max-sm:flex-col max-sm:items-start max-sm:gap-0.5">
            <span
              className="text-[1.2rem] font-extrabold leading-none max-sm:text-[1rem]"
              style={{ color: awayColor, fontVariantNumeric: 'tabular-nums' }}
            >
              {awayVotes.toLocaleString()}
            </span>
            <span className="text-[1.02rem] leading-none opacity-70 max-sm:text-[0.92rem]">
              ({awayPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
        <div
          aria-hidden
          className="animate-pulse text-[1.2rem] pb-[5px]"
          style={{ animationDuration: '2s' }}
        >
          🔥
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="mb-0.5 truncate text-[1rem] font-bold text-gray-400 max-sm:text-[0.92rem]">
            {homeTeamName} 응원
          </div>
          <div className="flex flex-wrap items-baseline justify-end gap-1 max-sm:flex-col max-sm:items-end max-sm:gap-0.5">
            <span
              className="text-[1.2rem] font-extrabold leading-none max-sm:text-[1rem]"
              style={{ color: homeColor, fontVariantNumeric: 'tabular-nums' }}
            >
              {homeVotes.toLocaleString()}
            </span>
            <span className="text-[1.02rem] leading-none opacity-70 max-sm:text-[0.92rem]">
              ({homePercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
      <div
        className="relative flex h-4 overflow-hidden rounded-[20px]"
        style={{ background: '#2a2d35', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)' }}
      >
        <div
          className="relative h-full transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${awayPercent}%`, background: awayColor }}
        />
        <div
          className="absolute top-0 z-[2] h-full w-1 -translate-x-1/2 skew-x-[-20deg] bg-white transition-[left] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ left: `${awayPercent}%`, boxShadow: '0 0 10px rgba(255,255,255,0.5)' }}
        />
        <div
          className="relative h-full transition-[width] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: `${homePercent}%`, background: homeColor }}
        />
      </div>
      <div data-testid="cheering-gauge-caption" className="mt-2 text-center text-[16px] text-gray-500 dark:text-gray-300">
        {cheeringCaption}: {cheeringTotal.toLocaleString()}명
      </div>
    </div>
  );
}
