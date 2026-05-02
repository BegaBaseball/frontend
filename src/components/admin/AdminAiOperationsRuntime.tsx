import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import {
  fetchCoachAutoBriefOpsHealth,
} from '../../api/admin';
import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
} from '../../types/admin';
const AdminAiOperationsPanelRuntime = lazy(() => import('./AdminAiOperationsPanelRuntime'));

const toDateInputValue = (value: Date): string => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DEFAULT_AUTO_BRIEF_START_DATE = toDateInputValue(new Date());
const DEFAULT_AUTO_BRIEF_END_DATE = DEFAULT_AUTO_BRIEF_START_DATE;

export default function AdminAiOperationsRuntime() {
  const [autoBriefOpsHealth, setAutoBriefOpsHealth] = useState<AdminCoachAutoBriefOpsHealth | null>(null);
  const [autoBriefOpsLoading, setAutoBriefOpsLoading] = useState(false);
  const [autoBriefOpsError, setAutoBriefOpsError] = useState<string | null>(null);
  const [autoBriefOpsWindow, setAutoBriefOpsWindow] = useState<AdminCoachAutoBriefOpsWindow>('today');
  const [autoBriefOpsStartDate, setAutoBriefOpsStartDate] = useState(DEFAULT_AUTO_BRIEF_START_DATE);
  const [autoBriefOpsEndDate, setAutoBriefOpsEndDate] = useState(DEFAULT_AUTO_BRIEF_END_DATE);
  const [autoBriefOpsCommandCopyState, setAutoBriefOpsCommandCopyState] =
    useState<'idle' | 'done' | 'error'>('idle');

  const runAutoBriefOpsHealthFetch = useCallback(async (request: {
    window: AdminCoachAutoBriefOpsWindow;
    startDate?: string;
    endDate?: string;
  }) => {
    setAutoBriefOpsLoading(true);
    setAutoBriefOpsError(null);
    try {
      const health = await fetchCoachAutoBriefOpsHealth({
        window: request.window,
        startDate: request.startDate,
        endDate: request.endDate,
      });
      setAutoBriefOpsHealth(health);
      setAutoBriefOpsCommandCopyState('idle');
    } catch (error) {
      setAutoBriefOpsError(
        error instanceof Error ? error.message : 'Coach auto brief 운영 상태를 불러오지 못했습니다.',
      );
    } finally {
      setAutoBriefOpsLoading(false);
    }
  }, []);

  useEffect(() => {
    void runAutoBriefOpsHealthFetch({
      window: 'today',
      startDate: DEFAULT_AUTO_BRIEF_START_DATE,
      endDate: DEFAULT_AUTO_BRIEF_END_DATE,
    });
  }, [runAutoBriefOpsHealthFetch]);

  const handleAutoBriefOpsWindowChange = (window: AdminCoachAutoBriefOpsWindow) => {
    setAutoBriefOpsWindow(window);
    setAutoBriefOpsCommandCopyState('idle');
    if (window !== 'custom') {
      void runAutoBriefOpsHealthFetch({
        window,
        startDate: autoBriefOpsStartDate,
        endDate: autoBriefOpsEndDate,
      });
    }
  };

  const handleAutoBriefOpsRefresh = async () => {
    await runAutoBriefOpsHealthFetch({
      window: autoBriefOpsWindow,
      startDate: autoBriefOpsStartDate,
      endDate: autoBriefOpsEndDate,
    });
  };

  const handleAutoBriefOpsApplyCustomWindow = async () => {
    await runAutoBriefOpsHealthFetch({
      window: 'custom',
      startDate: autoBriefOpsStartDate,
      endDate: autoBriefOpsEndDate,
    });
  };

  const handleAutoBriefOpsCopyCommand = async () => {
    if (!autoBriefOpsHealth?.recommended_command) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(autoBriefOpsHealth.recommended_command);
      setAutoBriefOpsCommandCopyState('done');
    } catch {
      setAutoBriefOpsCommandCopyState('error');
    }
  };

  const autoBriefOpsPanel = useMemo(() => ({
    health: autoBriefOpsHealth,
    loading: autoBriefOpsLoading,
    error: autoBriefOpsError,
    selectedWindow: autoBriefOpsWindow,
    startDate: autoBriefOpsStartDate,
    endDate: autoBriefOpsEndDate,
    commandCopyState: autoBriefOpsCommandCopyState,
    onWindowChange: handleAutoBriefOpsWindowChange,
    onStartDateChange: setAutoBriefOpsStartDate,
    onEndDateChange: setAutoBriefOpsEndDate,
    onRefresh: handleAutoBriefOpsRefresh,
    onApplyCustomWindow: handleAutoBriefOpsApplyCustomWindow,
    onCopyCommand: handleAutoBriefOpsCopyCommand,
  }), [
    autoBriefOpsCommandCopyState,
    autoBriefOpsEndDate,
    autoBriefOpsError,
    autoBriefOpsHealth,
    autoBriefOpsLoading,
    autoBriefOpsStartDate,
    autoBriefOpsWindow,
  ]);

  return (
    <Suspense
      fallback={(
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">
          AI 운영 패널 로딩 중...
        </div>
      )}
    >
      <AdminAiOperationsPanelRuntime
        autoBriefOpsPanel={autoBriefOpsPanel}
      />
    </Suspense>
  );
}
