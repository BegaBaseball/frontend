import { lazy, Suspense, useState } from 'react';
import type { ComponentProps } from 'react';
import { Loader2, Zap } from 'lucide-react';

import { Button } from './ui/button';
import type { CoachAnalysisDialogProps } from './CoachAnalysisDialog';

const LazyCoachAnalysisDialog = lazy(() => import('./CoachAnalysisDialog'));

type CoachAnalysisDialogLauncherProps = Omit<CoachAnalysisDialogProps, 'trigger' | 'defaultOpen'> & {
  buttonLabel: string;
};

function CoachAnalysisTriggerButton({
  buttonLabel,
  disabled = false,
  onClick,
}: {
  buttonLabel: string;
  disabled?: boolean;
  onClick?: ComponentProps<typeof Button>['onClick'];
}) {
  return (
    <Button
      type="button"
      data-testid="coach-analysis-open"
      disabled={disabled}
      onClick={onClick}
      className="w-full md:w-auto h-10 bg-emerald-950 hover:bg-emerald-900 text-emerald-50 border border-emerald-700/60 rounded-xl shadow-sm disabled:opacity-100"
    >
      {disabled ? (
        <Loader2 className="w-4 h-4 mr-2 text-emerald-50 animate-spin" />
      ) : (
        <Zap className="w-4 h-4 mr-2 text-emerald-50" />
      )}
      <span className="text-[15px] font-semibold">
        {disabled ? '분석 도구 준비 중...' : buttonLabel}
      </span>
    </Button>
  );
}

export default function CoachAnalysisDialogLauncher({
  buttonLabel,
  ...dialogProps
}: CoachAnalysisDialogLauncherProps) {
  const [hasRequestedDialog, setHasRequestedDialog] = useState(false);

  if (!hasRequestedDialog) {
    return (
      <CoachAnalysisTriggerButton
        buttonLabel={buttonLabel}
        onClick={() => setHasRequestedDialog(true)}
      />
    );
  }

  return (
    <Suspense fallback={<CoachAnalysisTriggerButton buttonLabel={buttonLabel} disabled />}>
      <LazyCoachAnalysisDialog
        {...dialogProps}
        defaultOpen
        trigger={<CoachAnalysisTriggerButton buttonLabel={buttonLabel} />}
      />
    </Suspense>
  );
}
