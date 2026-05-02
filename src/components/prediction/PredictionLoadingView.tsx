import type { ReactNode } from 'react';
import { Card } from '../ui/card';

interface PredictionLoadingViewProps {
  topNotice: ReactNode | null;
}

export default function PredictionLoadingView({ topNotice }: PredictionLoadingViewProps) {
  return (
    <div className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-200 p-2 dark:bg-card" />
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200 dark:bg-card" />
        </div>

        <div className="mb-4 flex w-fit animate-pulse rounded-xl bg-slate-200 p-1 dark:bg-card md:rounded-2xl">
          <div className="h-10 w-20 rounded-lg bg-slate-300 dark:bg-card" />
          <div className="ml-1 h-10 w-20 rounded-lg bg-slate-300 dark:bg-card" />
        </div>

        {topNotice && (
          <div className="mb-4 flex justify-center sm:justify-end">
            {topNotice}
          </div>
        )}

        <Card className="mb-4 animate-pulse border border-slate-200/70 bg-white/90 p-4 shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="flex items-center justify-between">
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-card" />
            <div className="flex-1 space-y-2 px-4 text-center">
              <div className="mx-auto h-5 w-32 rounded bg-slate-200 dark:bg-card" />
              <div className="mx-auto h-4 w-48 rounded bg-slate-200 dark:bg-card" />
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-card" />
          </div>
        </Card>

        <Card className="animate-pulse overflow-hidden border border-slate-200/70 bg-white/90 shadow-sm dark:border-border dark:bg-card dark:shadow-md">
          <div className="h-11 bg-slate-200 dark:bg-card" />
          <div className="space-y-4 p-5">
            <div className="flex justify-between">
              <div className="flex w-1/3 flex-col items-center space-y-2">
                <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-card" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-card" />
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-card" />
              </div>
              <div className="flex w-1/3 flex-col items-center space-y-2">
                <div className="h-8 w-12 rounded bg-slate-200 dark:bg-card" />
                <div className="h-4 w-24 rounded bg-slate-200 dark:bg-card" />
              </div>
              <div className="flex w-1/3 flex-col items-center space-y-2">
                <div className="h-16 w-16 rounded-full bg-slate-200 dark:bg-card" />
                <div className="h-4 w-20 rounded bg-slate-200 dark:bg-card" />
                <div className="h-3 w-16 rounded bg-slate-200 dark:bg-card" />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
