import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { PredictionTrendingUpIcon } from './PredictionShellIcons';

interface PredictionMatchesErrorViewProps {
  matchesLoadErrorMessage: string | null;
  predictionRecoveryPath: string;
  onReloadMatches: () => void;
}

export default function PredictionMatchesErrorView({
  matchesLoadErrorMessage,
  predictionRecoveryPath,
  onReloadMatches,
}: PredictionMatchesErrorViewProps) {
  return (
    <div className="min-h-screen bg-white transition-colors duration-200 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Card className="relative flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-rose-200/70 bg-white/90 p-4 text-center shadow-sm dark:border-rose-900/40 dark:bg-card dark:shadow-md sm:min-h-[170px] sm:p-5 md:min-h-[190px]">
          <div className="mb-4 rounded-full bg-rose-100 p-4 dark:bg-card">
            <PredictionTrendingUpIcon className="h-8 w-8 text-rose-500 dark:text-rose-300" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-800 dark:text-gray-100">
            예측 경기 데이터를 불러오지 못했습니다.
          </h3>
          <p className="text-slate-500 dark:text-gray-300">
            {matchesLoadErrorMessage || '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
          </p>
          <p className="mt-2 text-sm text-slate-400 dark:text-gray-400">
            잠시 후 다시 시도하거나 새로고침해 주세요.
          </p>
          <Button
            size="sm"
            className="mt-4 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            onClick={onReloadMatches}
          >
            목록 다시 불러오기
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 border-rose-300/70 bg-white text-rose-600 dark:text-rose-300"
            onClick={() => {
              window.location.href = predictionRecoveryPath;
            }}
          >
            예측으로 돌아가기
          </Button>
        </Card>
      </div>
    </div>
  );
}
