import type { ReactNode } from 'react';

import TeamLogo from './TeamLogo';
import { ChevronDownIcon, TrendingUpIcon } from './icons/PublicFeatureIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { OffseasonPill } from './offseason/offseasonUi';

type OffseasonMovement = {
  id: number;
  date: string;
  section: string;
  team: string;
  player: string;
  remarks: string;
  isBigEvent: boolean;
  estimatedAmount: number;
};

type OffSeasonHomeNewsRuntimeProps = {
  isLoading: boolean;
  movementsCount: number;
  bigEvents: OffseasonMovement[];
  getTeamName: (code: string) => string;
  formatRemarks: (text: string) => ReactNode;
  onNavigateList: () => void;
};

export default function OffSeasonHomeNewsRuntime({
  isLoading,
  movementsCount,
  bigEvents,
  getTeamName,
  formatRemarks,
  onNavigateList,
}: OffSeasonHomeNewsRuntimeProps) {
  return (
    <>
      <section>
        <div className="mb-6 flex items-center gap-3 md:mb-8">
          <div className="rounded-lg bg-primary p-1.5 md:rounded-xl md:p-2">
            <TrendingUpIcon className="h-5 w-5 text-white md:h-6 md:w-6" />
          </div>
          <h3 className="text-xl font-black text-primary md:text-2xl">2025 주요 이적 소식</h3>
          <OffseasonPill className="ml-2 animate-pulse border-none px-2 py-1 text-[15px] text-white md:px-3 md:text-[15px]" style={{ backgroundColor: '#ef4444' }}>
            Breaking
          </OffseasonPill>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse border-none bg-white p-4 ring-1 ring-black/5 md:p-6 dark:bg-background dark:ring-white/10">
                <div className="flex items-start gap-4 md:gap-5">
                  <div className="h-12 w-12 rounded-full bg-gray-200 md:h-16 md:w-16 dark:bg-secondary" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/4 rounded bg-gray-200 dark:bg-secondary" />
                    <div className="h-5 w-3/4 rounded bg-gray-200 dark:bg-secondary" />
                    <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-secondary" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : bigEvents.length === 0 ? (
          <Card className="border-none bg-white p-6 text-center ring-1 ring-black/5 sm:p-8 md:p-10 dark:bg-background dark:ring-white/10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-card">
              <TrendingUpIcon className="h-8 w-8 text-gray-400 dark:text-white" />
            </div>
            <p className="font-semibold text-gray-500 dark:text-white">아직 등록된 주요 이적 소식이 없습니다.</p>
            <p className="mt-2 text-[15px] text-gray-400 dark:text-white">새로운 소식이 등록되면 여기에 표시됩니다.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
            {bigEvents.map((news) => (
              <Card key={news.id} className="group relative overflow-hidden border-none bg-white p-4 ring-1 ring-black/5 transition-all cursor-pointer hover:-translate-y-1 hover:shadow-xl md:p-6 dark:bg-background dark:ring-white/10">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-20 w-20 rounded-bl-full bg-yellow-400/10 transition-transform group-hover:scale-150" />
                <div className="relative z-10 flex items-start gap-4 md:gap-5">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-100 bg-gray-50 shadow-sm md:h-16 md:w-16 dark:border-border dark:bg-card">
                      <TeamLogo team={getTeamName(news.team)} size={36} className="md:h-11 md:w-11" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex items-center gap-2 md:mb-2">
                      <OffseasonPill className="bg-primary px-2 py-0.5 text-[15px] font-bold text-white">{news.section}</OffseasonPill>
                      <span className="text-[15px] font-semibold text-gray-400 dark:text-white">{news.date}</span>
                    </div>
                    <p className="line-clamp-1 text-base font-bold text-gray-900 transition-colors group-hover:text-primary md:text-lg dark:text-white">
                      {news.player} ({getTeamName(news.team)})
                    </p>
                    <div className="mt-1 line-clamp-1 text-[15px] text-gray-600 dark:text-white">
                      {formatRemarks(news.remarks)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="flex justify-center pb-10">
        <Button
          onClick={onNavigateList}
          className="rounded-full border border-primary/20 bg-white px-6 py-4 text-lg font-bold text-primary shadow-lg transition-all hover:bg-primary/5 hover:shadow-xl sm:px-8 sm:py-6 dark:bg-card"
        >
          전체 이적 현황 보러가기 ({movementsCount}건)
          <ChevronDownIcon className="ml-2 h-5 w-5 -rotate-90" />
        </Button>
      </section>
    </>
  );
}
