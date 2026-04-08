import {
  AlertTriangle,
  CalendarDays,
  ClipboardCopy,
  RefreshCw,
} from 'lucide-react';

import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
} from '../../types/admin';
import { Button } from '../ui/button';
import { AdminBadge, adminNativeSelectClassName } from './AdminPanelPrimitives';

interface AdminCoachAutoBriefOpsPanelProps {
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
}

const formatCount = (value?: number) => value ?? 0;

const cacheStateTone = (cacheState: string): string => {
  const normalized = cacheState.toUpperCase();
  if (normalized === 'FAILED_LOCKED') {
    return 'border-red-500/30 bg-red-500/10 text-red-200';
  }
  if (normalized === 'PENDING_WAIT' || normalized === 'PENDING') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
  if (normalized === 'FAILED') {
    return 'border-orange-500/30 bg-orange-500/10 text-orange-200';
  }
  if (normalized === 'MISSING' || normalized === 'UNAVAILABLE') {
    return 'border-slate-600 bg-slate-800 text-slate-200';
  }
  return 'border-slate-600 bg-slate-800 text-slate-200';
};

const qualityTone = (dataQuality: string): string => {
  const normalized = dataQuality.toLowerCase();
  if (normalized === 'grounded') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
  }
  if (normalized === 'partial') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  }
  if (normalized === 'insufficient') {
    return 'border-red-500/30 bg-red-500/10 text-red-200';
  }
  return 'border-slate-600 bg-slate-800 text-slate-200';
};

export function AdminCoachAutoBriefOpsPanel({
  health,
  loading,
  error,
  selectedWindow,
  startDate,
  endDate,
  commandCopyState,
  onWindowChange,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  onApplyCustomWindow,
  onCopyCommand,
}: AdminCoachAutoBriefOpsPanelProps) {
  const summary = health?.summary;
  const latestReport = health?.latest_report;
  const failedLockedCount = summary?.cache_state_breakdown?.FAILED_LOCKED ?? 0;
  const pendingWaitCount = (summary?.cache_state_breakdown?.PENDING_WAIT ?? 0)
    + (summary?.cache_state_breakdown?.PENDING ?? 0);
  const insufficientCount = summary?.data_quality_breakdown?.insufficient ?? 0;

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 p-5 shadow-lg shadow-amber-500/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
            <AlertTriangle className="h-5 w-5 text-amber-300" />
            Coach Auto Brief Ops
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            unresolved cache, quality 상태, 최근 prewarm report를 한 번에 확인합니다.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={onRefresh}
          data-testid="admin-ai-auto-brief-refresh"
          disabled={loading}
          className="text-slate-300 hover:bg-amber-500/10 hover:text-amber-200"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="mt-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
          <div className="grid gap-1.5">
            <label className="text-sm text-slate-400">조회 window</label>
            <select
              data-testid="admin-ai-auto-brief-window-trigger"
              value={selectedWindow}
              onChange={(event) => onWindowChange(event.target.value as AdminCoachAutoBriefOpsWindow)}
              className={adminNativeSelectClassName}
            >
              <option value="today">today</option>
              <option value="tomorrow">tomorrow</option>
              <option value="custom">custom</option>
            </select>
          </div>

          {selectedWindow === 'custom' ? (
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-1.5 text-sm text-slate-400">
                시작일
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => onStartDateChange(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </label>
              <label className="grid gap-1.5 text-sm text-slate-400">
                종료일
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => onEndDateChange(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </label>
              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={onApplyCustomWindow}
                  data-testid="admin-ai-auto-brief-apply-custom"
                  disabled={loading || !startDate || !endDate}
                  className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400"
                >
                  적용
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-400">
              <CalendarDays className="h-4 w-4 text-amber-300" />
              {health?.date_window ?? '선택된 window를 불러오는 중입니다.'}
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-500">Unresolved</p>
            <p className="mt-3 text-2xl font-semibold text-amber-200">
              {formatCount(summary?.unresolved_count)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              selected {formatCount(summary?.selected_target_count)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-500">FAILED_LOCKED</p>
            <p className="mt-3 text-2xl font-semibold text-red-200">{failedLockedCount}</p>
            <p className="mt-2 text-sm text-slate-500">운영 재예열 필요</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-500">PENDING_WAIT</p>
            <p className="mt-3 text-2xl font-semibold text-amber-200">{pendingWaitCount}</p>
            <p className="mt-2 text-sm text-slate-500">대기/재확인 상태</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-500">Insufficient</p>
            <p className="mt-3 text-2xl font-semibold text-red-200">{insufficientCount}</p>
            <p className="mt-2 text-sm text-slate-500">근거 부족 브리핑</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-white">권장 prewarm 명령</h4>
                <p className="mt-1 text-sm text-slate-500">
                  unresolved 우선 예열용 기본 명령입니다.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={onCopyCommand}
                data-testid="admin-ai-auto-brief-copy-command"
                disabled={!health?.recommended_command}
                className="text-slate-300 hover:bg-amber-500/10 hover:text-amber-200"
              >
                <ClipboardCopy className="mr-2 h-4 w-4" />
                {commandCopyState === 'done' ? '복사됨' : commandCopyState === 'error' ? '복사 실패' : '명령 복사'}
              </Button>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-300">
              {health?.recommended_command ?? 'health 응답을 불러오면 권장 명령이 표시됩니다.'}
            </pre>
            <p className="mt-3 text-sm text-slate-500">
              runbook: <span className="font-mono text-slate-300">{health?.runbook_path ?? 'task/operations/coach-auto-brief-prewarm-runbook.md'}</span>
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <h4 className="font-semibold text-white">최신 report</h4>
            {latestReport ? (
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <p className="break-all font-mono text-xs text-slate-400">{latestReport.path}</p>
                <p>finished: {latestReport.run_finished_at ?? '-'}</p>
                <p>date window: {latestReport.date_window ?? '-'}</p>
                <div className="flex flex-wrap gap-2">
                  <AdminBadge className="border-sky-500/30 bg-sky-500/10 text-sky-200">
                    completed {latestReport.completed_count}
                  </AdminBadge>
                  <AdminBadge className="border-amber-500/30 bg-amber-500/10 text-amber-200">
                    unresolved {latestReport.unresolved_count}
                  </AdminBadge>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                저장된 auto_brief report가 아직 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-4 w-4 text-amber-300" />
            <h4 className="font-semibold">최근 unresolved 경기</h4>
          </div>
          {(health?.unresolved_targets.length ?? 0) > 0 ? (
            <div className="mt-4 space-y-3">
              {health?.unresolved_targets.map((item) => (
                <div
                  key={item.cache_key}
                  data-testid={`admin-ai-auto-brief-unresolved-${item.game_id}`}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminBadge className={cacheStateTone(item.cache_state)}>
                      {item.cache_state}
                    </AdminBadge>
                    <AdminBadge className={qualityTone(item.data_quality)}>
                      {item.data_quality}
                    </AdminBadge>
                    <span className="text-sm text-slate-500">
                      {item.game_date} {item.away_team_id}@{item.home_team_id}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-white">
                    {item.headline || `${item.away_team_id} vs ${item.home_team_id}`}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    {item.reason ?? '상세 사유 없음'} · {item.stage_label} · {item.game_status_bucket}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-slate-500">
                    {item.cache_key}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              data-testid="admin-ai-auto-brief-unresolved-empty"
              className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
            >
              현재 window 기준 unresolved 대상이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
