import { lazy, Suspense, type ReactNode } from 'react';

import { Card } from './ui/card';
import type { Ranking } from '../types/home';
import { ChevronLeftIcon, ClockIcon } from './icons/OffseasonIcons';
import { OffseasonPill } from './offseason/offseasonUi';

type AwardData = {
  award: string;
  playerName: string;
  team: string;
  stats: string;
};

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

type OffSeasonHomePrimaryRuntimeProps = {
  isLoading: boolean;
  daysUntilOpening: number;
  statusDateLabel: string;
  movementsCount: number;
  bigEvents: OffseasonMovement[];
  awards: AwardData[];
  rankings: Ranking[];
  isLargeScreen: boolean;
  getTeamName: (code: string) => string;
  formatRemarks: (text: string) => ReactNode;
  onNavigateHome: () => void;
  onNavigateList: () => void;
};

const OffSeasonHomeHighlightsRuntime = lazy(() => import('./OffSeasonHomeHighlightsRuntime'));
const OffSeasonHomeNewsRuntime = lazy(() => import('./OffSeasonHomeNewsRuntime'));

export default function OffSeasonHomePrimaryRuntime({
  isLoading,
  daysUntilOpening,
  statusDateLabel,
  movementsCount,
  bigEvents,
  awards,
  rankings,
  isLargeScreen,
  getTeamName,
  formatRemarks,
  onNavigateHome,
  onNavigateList,
}: OffSeasonHomePrimaryRuntimeProps) {
  const highlightsFallback = (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
        <Card className="h-52 animate-pulse border-none bg-white ring-1 ring-black/5 dark:bg-background dark:ring-white/10" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
          {[1, 2].map((index) => (
            <Card
              key={`offseason-award-fallback-${index}`}
              className="h-28 animate-pulse border-none bg-white ring-1 ring-black/5 dark:bg-background dark:ring-white/10"
            />
          ))}
        </div>
      </div>
      <Card className="h-96 animate-pulse border border-gray-200 bg-white dark:border-border dark:bg-card" />
      <Card className="h-72 animate-pulse border border-gray-200 bg-white dark:border-border dark:bg-card" />
    </div>
  );

  const newsFallback = (
    <section>
      <div className="mb-6 flex items-center gap-3 md:mb-8">
        <div className="rounded-lg bg-primary p-1.5 md:rounded-xl md:p-2">
          <div className="h-5 w-5 rounded bg-white/30 md:h-6 md:w-6" />
        </div>
        <div className="h-8 w-56 animate-pulse rounded bg-white/60 dark:bg-card" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((index) => (
          <Card
            key={`offseason-news-fallback-${index}`}
            className="h-36 animate-pulse border-none bg-white ring-1 ring-black/5 md:h-40 dark:bg-background dark:ring-white/10"
          />
        ))}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen space-y-8 bg-gray-50 px-4 py-6 transition-colors sm:px-6 md:space-y-12 md:px-6 md:py-8 dark:bg-background">
      <button
        type="button"
        onClick={onNavigateHome}
        className="mb-2 flex min-h-11 items-center gap-2 rounded-full border-2 border-primary px-4 py-1.5 text-15 text-primary transition-all hover:bg-gray-100 group dark:hover:bg-gray-800"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10/10 transition-all group-hover:scale-110">
          <ChevronLeftIcon className="h-4 w-4" />
        </span>
        <span className="font-bold group-hover:underline">메인페이지로 돌아가기</span>
      </button>

      <section className="relative overflow-hidden rounded-2xl border-none bg-primary shadow-xl md:rounded-3xl">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-20 pointer-events-none" />
        <div className="relative z-10 px-4 py-6 sm:px-6 sm:py-8 md:px-8 md:py-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <OffseasonPill className="mb-3 border-none bg-yellow-400 px-3 py-1 text-15 font-bold text-gray-900 dark:text-white md:mb-4">2025-26 스토브리그</OffseasonPill>
              <h2 className="mb-2 text-2xl text-white md:text-4xl" style={{ fontWeight: 900 }}>스토브리그 하이라이트</h2>
              <p className="text-base text-emerald-100/80 md:text-lg">다가오는 새로운 시즌을 준비하는 뜨거운 기록들</p>
            </div>
            <div className="w-fit rounded-xl border border-white/10 bg-black/20 p-3 text-white backdrop-blur-sm md:rounded-2xl md:p-4 md:text-right">
              <div className="mb-1 text-13 font-semibold text-white/65 md:text-15">오프시즌 상태</div>
              <div className="text-lg font-black md:text-2xl">
                {statusDateLabel} 기준
              </div>
            </div>
          </div>
        </div>
      </section>

      <Card className="overflow-hidden rounded-2xl border-none bg-white shadow-2xl md:rounded-3xl dark:bg-background">
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1a3c34] to-primary px-4 py-8 text-center sm:px-6 sm:py-10 md:px-6 md:py-12">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white blur-3xl md:h-[500px] md:w-[500px]" />
          </div>
          <div className="relative z-10">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-md md:h-20 md:w-20">
              <ClockIcon className="h-8 w-8 animate-pulse text-yellow-400 md:h-10 md:w-10" />
            </div>
            <h3 className="mb-6 text-xl text-white md:mb-8 md:text-3xl font-black tracking-tight">
              2026 시즌 개막까지
            </h3>
            <div className="mb-6 inline-block rounded-30 border border-white/20 px-6 py-3 shadow-2xl sm:px-8 sm:py-4 md:mb-8 md:rounded-40 md:px-12 md:py-8" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div className="text-5xl font-black tracking-tighter text-white md:text-8xl">
                D-{daysUntilOpening}
              </div>
            </div>
            <p className="text-base font-semibold text-emerald-100/90 md:text-xl">2026년 3월 28일 개막 예정 ⚾</p>
          </div>
        </div>
      </Card>

      <Suspense fallback={newsFallback}>
        <OffSeasonHomeNewsRuntime
          isLoading={isLoading}
          movementsCount={movementsCount}
          bigEvents={bigEvents}
          getTeamName={getTeamName}
          formatRemarks={formatRemarks}
          onNavigateList={onNavigateList}
        />
      </Suspense>

      <Suspense fallback={highlightsFallback}>
        <OffSeasonHomeHighlightsRuntime
          awards={awards}
          rankings={rankings}
          isLargeScreen={isLargeScreen}
        />
      </Suspense>
    </div>
  );
}
