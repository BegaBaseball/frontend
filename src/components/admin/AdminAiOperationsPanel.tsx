import { lazy, Suspense } from 'react';

import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
} from '../../types/admin';

const AdminCoachAutoBriefOpsPanelRuntime = lazy(() => import('./AdminCoachAutoBriefOpsPanelRuntime'));
const AdminAiReleaseDecisionRuntime = lazy(() => import('./AdminAiReleaseDecisionRuntime'));

export interface AdminAiOperationsPanelProps {
  autoBriefOpsPanel: {
    health: AdminCoachAutoBriefOpsHealth | null;
    loading: boolean;
    error: string | null;
    selectedWindow: AdminCoachAutoBriefOpsWindow;
    startDate: string;
    endDate: string;
    commandCopyState: 'idle' | 'done' | 'error';
    onWindowChange: (value: AdminCoachAutoBriefOpsWindow) => void;
    onStartDateChange: (value: string) => void;
    onEndDateChange: (value: string) => void;
    onRefresh: () => void | Promise<void>;
    onApplyCustomWindow: () => void | Promise<void>;
    onCopyCommand: () => void | Promise<void>;
  };
}

export function AdminAiOperationsPanel({
  autoBriefOpsPanel,
}: AdminAiOperationsPanelProps) {
  const autoBriefPanel = (
    <Suspense
      fallback={(
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-[14px] text-slate-400">
          Coach auto brief ops 패널 로딩 중...
        </div>
      )}
    >
      <AdminCoachAutoBriefOpsPanelRuntime {...autoBriefOpsPanel} />
    </Suspense>
  );

  return (
    <Suspense
      fallback={(
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          {autoBriefPanel}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">
            AI 릴리즈 결정 패널 로딩 중...
          </div>
        </div>
      )}
    >
      <AdminAiReleaseDecisionRuntime autoBriefPanel={autoBriefPanel} />
    </Suspense>
  );
}
