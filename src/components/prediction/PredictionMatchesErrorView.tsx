import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { isManualBaseballDataRequiredCode, MANUAL_BASEBALL_DATA_REQUIRED_CODE } from '../../utils/errorUtils';
import { PredictionTrendingUpIcon } from './PredictionShellIcons';

interface PredictionMatchesErrorViewProps {
  matchesLoadErrorMessage: string | null;
  matchesLoadErrorCode: string | null;
  predictionRecoveryPath: string;
  onReloadMatches: () => void;
}

export default function PredictionMatchesErrorView({
  matchesLoadErrorMessage,
  matchesLoadErrorCode,
  predictionRecoveryPath,
  onReloadMatches,
}: PredictionMatchesErrorViewProps) {
  const isManualDataRequired = isManualBaseballDataRequiredCode(matchesLoadErrorCode);
  const title = isManualDataRequired
    ? '야구 데이터 준비가 필요합니다'
    : '예측 경기 데이터를 불러오지 못했습니다.';
  const helperText = isManualDataRequired
    ? '운영자가 데이터를 제공하면 다시 확인할 수 있습니다.'
    : '잠시 후 다시 시도하거나 새로고침해 주세요.';

  return (
    <div className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Card className={`relative flex min-h-[120px] flex-col items-center justify-center rounded-2xl border bg-white/90 p-4 text-center shadow-sm dark:bg-card dark:shadow-md sm:min-h-[170px] sm:p-5 md:min-h-[190px] ${
          isManualDataRequired
            ? 'border-amber-200/80 dark:border-amber-900/50'
            : 'border-rose-200/70 dark:border-rose-900/40'
        }`}
        >
          <div className={`mb-4 rounded-full p-4 dark:bg-card ${
            isManualDataRequired ? 'bg-amber-100' : 'bg-rose-100'
          }`}
          >
            <PredictionTrendingUpIcon className={`h-8 w-8 ${
              isManualDataRequired
                ? 'text-amber-600 dark:text-amber-300'
                : 'text-rose-500 dark:text-rose-300'
            }`}
            />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-800 dark:text-gray-100">
            {title}
          </h3>
          <p className="text-slate-500 dark:text-gray-300">
            {matchesLoadErrorMessage || '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.'}
          </p>
          {isManualDataRequired ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 font-mono text-xs font-bold text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
              {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
            </p>
          ) : null}
          <p className="mt-2 text-[16px] text-slate-400 dark:text-gray-400">
            {helperText}
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
