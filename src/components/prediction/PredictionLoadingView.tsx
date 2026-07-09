import { Baseball } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import { Card } from '../ui/card';
import { PREDICTION_SURFACE_CARD_CLASS } from './predictionUiTokens';

interface PredictionLoadingViewProps {
  topNotice: ReactNode | null;
}

export default function PredictionLoadingView({ topNotice }: PredictionLoadingViewProps) {
  return (
    <div className="font-sans">
      {topNotice && (
        <div className="mb-3 flex justify-center sm:justify-end">
          {topNotice}
        </div>
      )}

      <Card className={`${PREDICTION_SURFACE_CARD_CLASS} mb-4 overflow-hidden rounded-2xl p-5`}>
        <div className="flex flex-col items-center text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-spin rounded-full border-2 border-dashed border-emerald-200 motion-reduce:animate-none" />
            <Baseball className="h-14 w-14 animate-spin text-red-600 motion-reduce:animate-none" aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-18 font-extrabold tracking-normal text-slate-950 dark:text-white">
            데이터 워밍업 중...
          </h3>
          <p className="mt-1 text-13 font-semibold leading-relaxed text-slate-500 dark:text-white/70">
            Tip · 경기 시작 전까지 예측을 변경할 수 있어요.
          </p>
        </div>
      </Card>

      <Card className={`${PREDICTION_SURFACE_CARD_CLASS} animate-pulse overflow-hidden rounded-2xl motion-reduce:animate-none`}>
        <div className="h-12 bg-slate-100 dark:bg-secondary/50" />
        <div className="space-y-4 p-5">
          <div className="flex justify-between">
            <div className="flex w-1/3 flex-col items-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-secondary" />
              <div className="h-4 w-20 rounded bg-slate-100 dark:bg-secondary" />
              <div className="h-3 w-16 rounded bg-slate-100 dark:bg-secondary" />
            </div>
            <div className="flex w-1/3 flex-col items-center space-y-2">
              <div className="h-8 w-12 rounded bg-slate-100 dark:bg-secondary" />
              <div className="h-4 w-24 rounded bg-slate-100 dark:bg-secondary" />
            </div>
            <div className="flex w-1/3 flex-col items-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-secondary" />
              <div className="h-4 w-20 rounded bg-slate-100 dark:bg-secondary" />
              <div className="h-3 w-16 rounded bg-slate-100 dark:bg-secondary" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
