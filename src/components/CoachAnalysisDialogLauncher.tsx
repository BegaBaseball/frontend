import { lazy, Suspense, useState } from 'react';
import type { ComponentProps } from 'react';

import { Button } from './ui/button';
import type { CoachAnalysisDialogProps } from './CoachAnalysisDialog';
import { PredictionLoaderIcon, PredictionZapIcon } from './prediction/PredictionShellIcons';

const LazyCoachAnalysisDialog = lazy(() => import('./CoachAnalysisDialog'));

type CoachAnalysisDialogLauncherProps = Omit<CoachAnalysisDialogProps, 'trigger' | 'defaultOpen'> & {
  buttonLabel: string;
  fullWidth?: boolean;
};

function CoachAnalysisTriggerButton({
  buttonLabel,
  disabled = false,
  fullWidth = false,
  onClick,
}: {
  buttonLabel: string;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: ComponentProps<typeof Button>['onClick'];
}) {
  return (
    <Button
      type="button"
      data-testid="coach-analysis-open"
      disabled={disabled}
      onClick={onClick}
      className={`${fullWidth ? 'w-full h-12' : 'w-full md:w-auto h-10'} bg-emerald-950 hover:bg-emerald-900 text-emerald-50 border border-emerald-700/60 rounded-xl shadow-sm disabled:opacity-100`}
    >
      {disabled ? (
        <PredictionLoaderIcon className="w-4 h-4 mr-2 text-emerald-50 animate-spin" />
      ) : (
        <PredictionZapIcon className="w-4 h-4 mr-2 text-emerald-50" />
      )}
      <span className={`${fullWidth ? 'text-15 font-bold' : 'text-body font-semibold'}`}>
        {disabled ? '분석 도구 준비 중...' : buttonLabel}
      </span>
    </Button>
  );
}

export default function CoachAnalysisDialogLauncher({
  buttonLabel,
  fullWidth = false,
  ...dialogProps
}: CoachAnalysisDialogLauncherProps) {
  const [hasRequestedDialog, setHasRequestedDialog] = useState(false);

  if (!hasRequestedDialog) {
    return (
      <CoachAnalysisTriggerButton
        buttonLabel={buttonLabel}
        fullWidth={fullWidth}
        onClick={() => setHasRequestedDialog(true)}
      />
    );
  }

  return (
    <Suspense fallback={<CoachAnalysisTriggerButton buttonLabel={buttonLabel} fullWidth={fullWidth} disabled />}>
      <LazyCoachAnalysisDialog
        {...dialogProps}
        defaultOpen
        trigger={<CoachAnalysisTriggerButton buttonLabel={buttonLabel} fullWidth={fullWidth} />}
      />
    </Suspense>
  );
}
