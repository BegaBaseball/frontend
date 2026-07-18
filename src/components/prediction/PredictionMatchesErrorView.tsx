import { Button } from '../ui/button';
import { Card } from '../ui/card';
import EmptyState from '../common/EmptyState';
import { isManualBaseballDataRequiredCode } from '../../utils/errorUtils';
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
  const description = isManualDataRequired
    ? helperText
    : matchesLoadErrorMessage || '서비스 연결이 불안정합니다. 잠시 후 다시 시도해주세요.';

  return (
    <Card
      data-testid="prediction-empty-state"
      className={`relative overflow-hidden rounded-2xl border p-5 text-center shadow-sm dark:bg-card dark:shadow-md sm:p-7 ${
        isManualDataRequired
          ? 'border-amber-200 bg-amber-50/80 dark:border-amber-900/50'
          : 'border-slate-200/70 bg-slate-50 dark:border-border'
      }`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(100,116,139,0.07)_0px,rgba(100,116,139,0.07)_1px,transparent_1px,transparent_13px)]"
      />
      <EmptyState
        testId="prediction-empty-state-content"
        title={isManualDataRequired ? title : '잠시 우천 중단이에요'}
        description={description}
        tone={isManualDataRequired ? 'warning' : 'danger'}
        className="relative min-h-0 border-0 bg-transparent p-0 shadow-none"
        icon={(
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-secondary">
            <PredictionTrendingUpIcon className={`h-7 w-7 ${
              isManualDataRequired
                ? 'text-amber-600 dark:text-amber-300'
                : 'text-slate-500 dark:text-white'
            }`}
            />
          </div>
        )}
        action={(
          <>
            <Button
              data-testid="prediction-empty-retry"
              size="touch"
              variant="brand"
              onClick={onReloadMatches}
            >
              다시 불러오기
            </Button>
            <Button
              size="touch"
              variant="outline"
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-border dark:bg-card dark:text-white"
              onClick={() => {
                window.location.href = predictionRecoveryPath;
              }}
            >
              예측으로 돌아가기
            </Button>
          </>
        )}
      />
    </Card>
  );
}
