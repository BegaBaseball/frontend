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
    <div className="min-h-screen bg-white font-sans transition-colors duration-200 dark:bg-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <Card
          data-testid="prediction-empty-state"
          className={`relative flex min-h-[180px] flex-col items-center justify-center rounded-2xl border bg-white/90 p-4 text-center shadow-sm dark:bg-card dark:shadow-md sm:p-5 ${
          isManualDataRequired
            ? 'border-amber-200/80 dark:border-amber-900/50'
            : 'border-rose-200/70 dark:border-rose-900/40'
        }`}
        >
          <EmptyState
            testId="prediction-empty-state-content"
            title={title}
            description={description}
            tone={isManualDataRequired ? 'warning' : 'danger'}
            className="min-h-0 border-0 bg-transparent p-0 shadow-none"
            icon={(
              <PredictionTrendingUpIcon className={`h-7 w-7 ${
                isManualDataRequired
                  ? 'text-amber-600 dark:text-amber-300'
                  : 'text-rose-500 dark:text-rose-300'
              }`}
              />
            )}
            action={(
              <>
                <Button
                  data-testid="prediction-empty-retry"
                  size="touch"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onReloadMatches}
                >
                  목록 다시 불러오기
                </Button>
                <Button
                  size="touch"
                  variant="outline"
                  className="border-border bg-background text-foreground"
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
      </div>
    </div>
  );
}
