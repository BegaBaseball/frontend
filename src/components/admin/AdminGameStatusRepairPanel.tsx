import { useEffect, useMemo, useState } from 'react';

import {
  deleteAdminNonCanonicalCleanupTracker,
  fetchAdminNonCanonicalCleanupTrackers,
  fetchAdminGameStatusMismatches,
  repairAdminGameStatusMismatches,
  upsertAdminNonCanonicalCleanupTracker,
} from '../../api/admin';
import type {
  AdminGameScoreSyncResult,
  AdminGameStatusMismatch,
  AdminGameStatusMismatchBatchResult,
  AdminGameStatusRepairBatchResult,
  AdminNonCanonicalCleanupTrackerEntry,
  AdminNonCanonicalGame,
} from '../../types/admin';
import { cn } from '../../lib/utils';
import {
  buildNonCanonicalCleanupTrackerNote,
  buildNonCanonicalClosureCommand,
  buildNonCanonicalClosureTrackerSyncCommand,
  buildNonCanonicalCleanupTrackerKey,
  buildNonCanonicalGameCleanupDraft,
  buildGameStatusDateRecommendations,
  extractNonCanonicalCleanupArtifactPaths,
  extractNonCanonicalCleanupClosureSync,
  extractNonCanonicalCleanupUserNote,
  formatInputDate,
  parseNonCanonicalCleanupTrackerKey,
  shiftInputDate,
  type AdminNonCanonicalCleanupClosureSync,
  type AdminNonCanonicalCleanupTrackerStatus,
  type AdminGameStatusDateRecommendation,
} from '../../utils/adminGameStatus';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { StatusBadge } from '../ui/status-badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import { getGameStatusBadgeMeta } from '../../utils/statusBadgeMeta';
import {
  AdminAlertTriangleIcon,
  AdminClipboardIcon,
  AdminDownloadIcon,
  AdminRefreshIcon,
  AdminSaveIcon,
} from './AdminDetailIcons';
import { AdminBadge, AdminStatusBadge } from './AdminPanelPrimitives';
import {
  AdminCalendarIcon,
  AdminShieldAlertIcon,
} from './AdminPanelIcons';

const formatRangeLabel = (startDate: string, endDate?: string) =>
  endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;

const formatRangeSlug = (startDate: string, endDate?: string) =>
  endDate && endDate !== startDate ? `${startDate}_to_${endDate}` : startDate;
const predictionGameStatusRunbookPath = 'task/operations/prediction-game-status-repair-runbook.md';
const cleanupStatusLabel: Record<AdminNonCanonicalCleanupTrackerStatus, string> = {
  draft: '초안',
  requested: '요청 완료',
  in_progress: '정제 진행 중',
  done: '정제 완료',
};
const formatTimeLabel = (value: string | null | undefined) => value ? value.slice(0, 5) : '-';

const formatScoreLabel = (homeScore: number | null, awayScore: number | null) => {
  if (homeScore == null && awayScore == null) {
    return '-';
  }

  return `원정 ${awayScore ?? '-'} / 홈 ${homeScore ?? '-'}`;
};

const formatTeamLabel = (homeTeam: string | null | undefined, awayTeam: string | null | undefined) =>
  `원정 ${awayTeam || '-'} / 홈 ${homeTeam || '-'}`;

const escapeCsvCell = (value: string | number | boolean | null | undefined) => {
  const normalized = value == null ? '' : String(value);
  const escaped = normalized.split('"').join('""');

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
};

const buildCsv = (rows: Array<Array<string | number | boolean | null | undefined>>) =>
  rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');

const buildDiagnosisSummaryMessage = (mismatchCount: number, nonCanonicalCount: number) => {
  if (mismatchCount === 0 && nonCanonicalCount === 0) {
    return '선택한 날짜 범위에서 경기 상태 불일치나 비정상 팀 코드 경기가 없습니다.';
  }

  const fragments: string[] = [];
  if (mismatchCount > 0) {
    fragments.push(`불일치 ${mismatchCount}건`);
  }
  if (nonCanonicalCount > 0) {
    fragments.push(`비정상 팀 코드 ${nonCanonicalCount}건`);
  }

  return `${fragments.join(', ')}을 찾았습니다.`;
};

const buildRepairSummaryMessage = (result: AdminGameStatusRepairBatchResult) => {
  if (result.dryRun) {
    return `dry-run 완료: mismatch ${result.mismatchCount}건, 비정상 팀 코드 ${result.nonCanonicalCount}건, 예상 복구 ${result.repairedCount}건`;
  }

  const anomalySuffix = result.nonCanonicalCount > 0
    ? `, 비정상 팀 코드 ${result.nonCanonicalCount}건은 별도 정제가 필요합니다.`
    : '';
  return `실제 복구 완료: ${result.repairedCount}건 반영${anomalySuffix}`;
};

const downloadCsvFile = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

const buildMismatchCsv = (result: AdminGameStatusMismatchBatchResult) => buildCsv([
  [
    'issueType',
    'gameDate',
    'gameId',
    'startTime',
    'rawStatus',
    'normalizedRawStatus',
    'effectiveStatus',
    'homeTeam',
    'awayTeam',
    'homeScore',
    'awayScore',
    'inningScoreCount',
    'hasKnownScore',
    'hasInningScores',
    'reasons',
  ],
  ...result.mismatches.map((mismatch) => [
    'mismatch',
    mismatch.gameDate,
    mismatch.gameId,
    mismatch.startTime,
    mismatch.rawStatus,
    mismatch.normalizedRawStatus,
    mismatch.effectiveStatus,
    '',
    '',
    mismatch.homeScore,
    mismatch.awayScore,
    mismatch.inningScoreCount,
    mismatch.hasKnownScore,
    mismatch.hasInningScores,
    mismatch.reasons.join(' | '),
  ]),
  ...result.nonCanonicalGames.map((game) => [
    'non_canonical',
    game.gameDate,
    game.gameId,
    game.startTime,
    game.rawStatus,
    '',
    '',
    game.homeTeam,
    game.awayTeam,
    game.homeScore,
    game.awayScore,
    '',
    '',
    '',
    game.reasons.join(' | '),
  ]),
]);

const buildRepairedGamesCsv = (result: AdminGameStatusRepairBatchResult) => buildCsv([
  [
    'gameId',
    'gameStatus',
    'homeScore',
    'awayScore',
    'inningScoreCount',
    'synced',
    'usedInningScores',
    'winningTeam',
    'winningScore',
  ],
  ...result.repairedGames.map((game) => [
    game.gameId,
    game.gameStatus,
    game.homeScore,
    game.awayScore,
    game.inningScoreCount,
    game.synced,
    game.usedInningScores,
    game.winningTeam,
    game.winningScore,
  ]),
]);

const buildNonCanonicalGamesCsv = (games: AdminNonCanonicalGame[]) => buildCsv([
  [
    'gameDate',
    'gameId',
    'startTime',
    'rawStatus',
    'homeTeam',
    'awayTeam',
    'homeScore',
    'awayScore',
    'reasons',
  ],
  ...games.map((game) => [
    game.gameDate,
    game.gameId,
    game.startTime,
    game.rawStatus,
    game.homeTeam,
    game.awayTeam,
    game.homeScore,
    game.awayScore,
    game.reasons.join(' | '),
  ]),
]);

function SummaryCard({
  label,
  value,
  accentClassName,
}: {
  label: string;
  value: number | string;
  accentClassName: string;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${accentClassName}`}>
      <p className="text-caption uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-50">{value}</p>
    </div>
  );
}

const formatSavedAtLabel = (value: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')} ${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}`;
};

function MismatchReasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 0) {
    return <span className="text-slate-500">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {reasons.map((reason) => (
        <AdminBadge
          key={reason}
          className="border-amber-500/25 bg-amber-500/10 text-amber-200"
        >
          {reason}
        </AdminBadge>
      ))}
    </div>
  );
}

function AdminGameStatusBadge({ status }: { status: string | null | undefined }) {
  const label = status || '-';
  const meta = getGameStatusBadgeMeta(status, label);

  return (
    <StatusBadge
      label={label}
      tone={meta.tone}
      marker={meta.marker}
      live={meta.live}
      size="xs"
    />
  );
}

function RepairedGameRow({ game }: { game: AdminGameScoreSyncResult }) {
  return (
    <TableRow data-testid={`admin-game-status-repaired-${game.gameId}`} className="border-slate-800/80">
      <TableCell className="font-mono text-caption text-slate-300">{game.gameId}</TableCell>
      <TableCell>
        <AdminGameStatusBadge status={game.gameStatus} />
      </TableCell>
      <TableCell className="text-slate-200">{formatScoreLabel(game.homeScore, game.awayScore)}</TableCell>
      <TableCell className="text-slate-300">{game.inningScoreCount}</TableCell>
      <TableCell className="text-slate-300">{game.usedInningScores ? '이닝합산' : '기존점수'}</TableCell>
      <TableCell className="text-slate-300">{game.winningTeam || '-'}</TableCell>
    </TableRow>
  );
}

function NonCanonicalGameRow({ game }: { game: AdminNonCanonicalGame }) {
  return (
    <TableRow
      data-testid={`admin-game-status-non-canonical-${game.gameId}`}
      className="border-slate-800/80"
    >
      <TableCell className="text-slate-300">{game.gameDate}</TableCell>
      <TableCell className="font-mono text-caption text-slate-300">{game.gameId}</TableCell>
      <TableCell className="text-slate-300">{formatTimeLabel(game.startTime)}</TableCell>
      <TableCell>
        <AdminGameStatusBadge status={game.rawStatus} />
      </TableCell>
      <TableCell className="text-slate-200">{formatTeamLabel(game.homeTeam, game.awayTeam)}</TableCell>
      <TableCell className="text-slate-200">{formatScoreLabel(game.homeScore, game.awayScore)}</TableCell>
      <TableCell className="max-w-xl">
        <MismatchReasons reasons={game.reasons} />
      </TableCell>
    </TableRow>
  );
}

function MismatchDateSuggestionCard({
  recommendation,
  trackerStatus,
  trackerAssignee,
  trackerClosureSync,
  trackerArtifacts,
  active,
  onSelect,
}: {
  recommendation: AdminGameStatusDateRecommendation;
  trackerStatus?: AdminNonCanonicalCleanupTrackerStatus | null;
  trackerAssignee?: string | null;
  trackerClosureSync?: ReturnType<typeof extractNonCanonicalCleanupClosureSync>;
  trackerArtifacts?: ReturnType<typeof extractNonCanonicalCleanupArtifactPaths>;
  active: boolean;
  onSelect: (gameDate: string) => void;
}) {
  const statusSummary = recommendation.effectiveStatuses.join(' / ');
  const issueSummary = recommendation.nonCanonicalCount > 0
    ? `mismatch ${recommendation.mismatchCount}건 / 비정상 팀 코드 ${recommendation.nonCanonicalCount}건`
    : `mismatch ${recommendation.mismatchCount}건`;
  const artifactSummary = [
    trackerArtifacts?.summaryJson ? 'summary' : null,
    trackerArtifacts?.handoffMd ? 'handoff' : null,
  ].filter(Boolean).join(' / ');

  return (
    <button
      type="button"
      data-testid={`admin-game-status-suggestion-${recommendation.gameDate}`}
      onClick={() => onSelect(recommendation.gameDate)}
      className={cn(
        'min-w-[180px] rounded-2xl border px-4 py-3 text-left transition-colors',
        active
          ? 'border-amber-400/50 bg-amber-500/15 text-amber-100'
          : 'border-slate-800 bg-slate-900/70 text-slate-100 hover:border-slate-700 hover:bg-slate-900',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-caption font-semibold">{recommendation.gameDate}</p>
          <p className="mt-1 text-caption text-slate-400">이상 {recommendation.issueCount}건</p>
        </div>
        <AdminBadge className="border-amber-500/25 bg-amber-500/10 text-amber-200">
          추천
        </AdminBadge>
      </div>
      {trackerStatus && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AdminStatusBadge status={trackerStatus} label={cleanupStatusLabel[trackerStatus]} />
          {trackerAssignee && (
            <span className="text-13 text-slate-400">담당: {trackerAssignee}</span>
          )}
        </div>
      )}
      {trackerClosureSync && (
        <p
          data-testid={`admin-game-status-suggestion-closure-${recommendation.gameDate}`}
          className="mt-2 text-13 text-slate-400"
        >
          closure {trackerClosureSync.compareStatus} / remaining {trackerClosureSync.remainingCount ?? '-'}
        </p>
      )}
      {artifactSummary && (
        <p
          data-testid={`admin-game-status-suggestion-artifacts-${recommendation.gameDate}`}
          className="mt-1 text-13 text-slate-500"
        >
          산출물: {artifactSummary}
        </p>
      )}
      <p className="mt-3 text-caption text-slate-300">
        {issueSummary}
      </p>
      <p className="mt-1 text-caption text-slate-400">
        예상 상태: {statusSummary || '상태 mismatch 없음'}
      </p>
    </button>
  );
}

function CleanupArtifactPaths({
  artifacts,
  testIdPrefix,
  onCopyPath,
  onCopyClosureCommand,
  onCopyTrackerSyncCommand,
}: {
  artifacts: ReturnType<typeof extractNonCanonicalCleanupArtifactPaths>;
  testIdPrefix: string;
  onCopyPath: (path: string, label: string) => void;
  onCopyClosureCommand: (command: string) => void;
  onCopyTrackerSyncCommand: (command: string) => void;
}) {
  const closureCommand = buildNonCanonicalClosureCommand(artifacts);
  const trackerSyncCommand = buildNonCanonicalClosureTrackerSyncCommand(artifacts);

  if (!artifacts.summaryJson && !artifacts.handoffMd && !closureCommand && !trackerSyncCommand) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <p className="text-12 font-semibold uppercase tracking-[0.18em] text-slate-500">자동 산출물</p>
      {artifacts.summaryJson && (
        <div className="space-y-1">
          <p className="text-12 text-slate-500">summary</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid={`${testIdPrefix}-summary-path`}
              className="break-all rounded bg-slate-900 px-2 py-1 text-12 text-slate-300"
            >
              {artifacts.summaryJson}
            </code>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              data-testid={`${testIdPrefix}-copy-summary-path`}
              onClick={() => onCopyPath(artifacts.summaryJson!, 'summary')}
            >
              <AdminClipboardIcon className="h-4 w-4" />
              경로 복사
            </Button>
          </div>
        </div>
      )}
      {artifacts.handoffMd && (
        <div className="space-y-1">
          <p className="text-12 text-slate-500">handoff</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid={`${testIdPrefix}-handoff-path`}
              className="break-all rounded bg-slate-900 px-2 py-1 text-12 text-slate-300"
            >
              {artifacts.handoffMd}
            </code>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              data-testid={`${testIdPrefix}-copy-handoff-path`}
              onClick={() => onCopyPath(artifacts.handoffMd!, 'handoff')}
            >
              <AdminClipboardIcon className="h-4 w-4" />
              경로 복사
            </Button>
          </div>
        </div>
      )}
      {closureCommand && (
        <div className="space-y-1">
          <p className="text-12 text-slate-500">closure rerun</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid={`${testIdPrefix}-closure-command`}
              className="break-all rounded bg-slate-900 px-2 py-1 text-12 text-slate-300"
            >
              {closureCommand}
            </code>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              data-testid={`${testIdPrefix}-copy-closure-command`}
              onClick={() => onCopyClosureCommand(closureCommand)}
            >
              <AdminClipboardIcon className="h-4 w-4" />
              명령 복사
            </Button>
          </div>
        </div>
      )}
      {trackerSyncCommand && (
        <div className="space-y-1">
          <p className="text-12 text-slate-500">closure + tracker sync</p>
          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid={`${testIdPrefix}-tracker-sync-command`}
              className="break-all rounded bg-slate-900 px-2 py-1 text-12 text-slate-300"
            >
              {trackerSyncCommand}
            </code>
            <Button
              type="button"
              variant="outline"
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              data-testid={`${testIdPrefix}-copy-tracker-sync-command`}
              onClick={() => onCopyTrackerSyncCommand(trackerSyncCommand)}
            >
              <AdminClipboardIcon className="h-4 w-4" />
              명령 복사
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function CleanupClosureStatus({
  closureSync,
  testIdPrefix,
}: {
  closureSync: ReturnType<typeof extractNonCanonicalCleanupClosureSync>;
  testIdPrefix: string;
}) {
  if (!closureSync) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-12 font-semibold uppercase tracking-[0.18em] text-slate-500">최신 closure</p>
        <AdminStatusBadge
          status={closureSync.compareStatus}
          testId={`${testIdPrefix}-compare-status`}
        />
        {closureSync.trackerStatus && (
          <AdminStatusBadge
            status={closureSync.trackerStatus}
            label={closureSync.trackerStatus}
            testId={`${testIdPrefix}-tracker-status`}
          />
        )}
      </div>
      <p
        data-testid={`${testIdPrefix}-counts`}
        className="text-13 text-slate-300"
      >
        resolved {closureSync.resolvedCount ?? '-'} / remaining {closureSync.remainingCount ?? '-'} / new {closureSync.newCount ?? '-'}
      </p>
      {closureSync.comparedAt && (
        <p
          data-testid={`${testIdPrefix}-compared-at`}
          className="text-12 text-slate-500"
        >
          비교 시각: {closureSync.comparedAt}
        </p>
      )}
    </div>
  );
}

export function AdminGameStatusRepairPanel({ active }: { active: boolean }) {
  const today = formatInputDate();
  const suggestionWindowStartDate = shiftInputDate(today, -13);
  const { confirm } = useConfirmDialog();

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loadingMismatches, setLoadingMismatches] = useState(false);
  const [loadingRepair, setLoadingRepair] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [loadingCleanupTrackers, setLoadingCleanupTrackers] = useState(false);
  const [savingCleanupTracker, setSavingCleanupTracker] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [mismatchResult, setMismatchResult] = useState<AdminGameStatusMismatchBatchResult | null>(null);
  const [repairResult, setRepairResult] = useState<AdminGameStatusRepairBatchResult | null>(null);
  const [recentRecommendations, setRecentRecommendations] = useState<AdminGameStatusDateRecommendation[]>([]);
  const [cleanupTrackers, setCleanupTrackers] = useState<AdminNonCanonicalCleanupTrackerEntry[]>([]);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  const [nonCanonicalCopyState, setNonCanonicalCopyState] = useState<'idle' | 'done' | 'error'>('idle');
  const [cleanupTicketUrl, setCleanupTicketUrl] = useState('');
  const [cleanupAssignee, setCleanupAssignee] = useState('');
  const [cleanupStatus, setCleanupStatus] = useState<AdminNonCanonicalCleanupTrackerStatus>('draft');
  const [cleanupNote, setCleanupNote] = useState('');
  const [cleanupSavedAt, setCleanupSavedAt] = useState<string | null>(null);
  const [cleanupTrackerMessage, setCleanupTrackerMessage] = useState<string | null>(null);

  const runDiagnosis = async ({
    silent = false,
    nextStartDate = startDate,
    nextEndDate = endDate,
  }: {
    silent?: boolean;
    nextStartDate?: string;
    nextEndDate?: string;
  } = {}) => {
    setLoadingMismatches(true);
    setPanelError(null);
    setNonCanonicalCopyState('idle');
    if (!silent) {
      setLastActionMessage(null);
      setRepairResult(null);
    }

    try {
      const result = await fetchAdminGameStatusMismatches({
        startDate: nextStartDate,
        endDate: nextEndDate || undefined,
      });
      setMismatchResult(result);

      if (!silent) {
        setLastActionMessage(buildDiagnosisSummaryMessage(result.mismatchCount, result.nonCanonicalCount));
      }

      return result;
    } catch (error) {
      setPanelError(getApiErrorMessage(error, '경기 상태 진단 결과를 불러오지 못했습니다.'));
      return null;
    } finally {
      setLoadingMismatches(false);
    }
  };

  const loadCleanupTrackers = async () => {
    setLoadingCleanupTrackers(true);

    try {
      const result = await fetchAdminNonCanonicalCleanupTrackers();
      setCleanupTrackers(result);
    } catch (error) {
      setCleanupTrackerMessage(getApiErrorMessage(error, '정제 티켓 추적 이력을 불러오지 못했습니다.'));
    } finally {
      setLoadingCleanupTrackers(false);
    }
  };

  const loadRecentRecommendations = async () => {
    setLoadingSuggestions(true);
    setSuggestionsError(null);

    try {
      const result = await fetchAdminGameStatusMismatches({
        startDate: suggestionWindowStartDate,
        endDate: today,
      });
      setRecentRecommendations(buildGameStatusDateRecommendations({
        mismatches: result.mismatches,
        nonCanonicalGames: result.nonCanonicalGames,
      }));
    } catch (error) {
      setSuggestionsError(getApiErrorMessage(error, '최근 이상 날짜를 불러오지 못했습니다.'));
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const runRepair = async (dryRun: boolean) => {
    if (!dryRun) {
      const accepted = await confirm({
        title: '실제 복구 실행',
        description: `${formatRangeLabel(startDate, endDate || undefined)} 범위의 mismatch 경기만 실제로 복구합니다.`,
        confirmLabel: '복구 실행',
        variant: 'destructive',
      });

      if (!accepted) {
        return;
      }
    }

    setLoadingRepair(true);
    setPanelError(null);
    setLastActionMessage(null);
    setNonCanonicalCopyState('idle');

    try {
      const result = await repairAdminGameStatusMismatches({
        startDate,
        endDate: endDate || undefined,
        dryRun,
      });
      setRepairResult(result);
      setMismatchResult({
        startDate: result.startDate,
        endDate: result.endDate,
        totalGames: result.totalGames,
        mismatchCount: result.mismatchCount,
        mismatches: result.mismatches,
        nonCanonicalCount: result.nonCanonicalCount,
        nonCanonicalGames: result.nonCanonicalGames,
      });
      setLastActionMessage(buildRepairSummaryMessage(result));

      if (!dryRun) {
        const refreshed = await fetchAdminGameStatusMismatches({
          startDate,
          endDate: endDate || undefined,
        });
        setMismatchResult(refreshed);
        void loadRecentRecommendations();
      }
    } catch (error) {
      setPanelError(getApiErrorMessage(error, '경기 상태 진단/복구를 실행하지 못했습니다.'));
    } finally {
      setLoadingRepair(false);
    }
  };

  useEffect(() => {
    if (!active || hasAutoLoaded) {
      return;
    }

    setHasAutoLoaded(true);
    void runDiagnosis({ silent: true });
    void loadRecentRecommendations();
    void loadCleanupTrackers();
  }, [active, hasAutoLoaded]);

  const currentSummary = repairResult ?? mismatchResult;
  const mismatchList: AdminGameStatusMismatch[] = mismatchResult?.mismatches ?? [];
  const nonCanonicalList: AdminNonCanonicalGame[] = mismatchResult?.nonCanonicalGames ?? [];
  const repairedGames = repairResult?.repairedGames ?? [];
  const isBusy = loadingMismatches || loadingRepair;
  const selectedSingleDate = startDate && endDate === startDate ? startDate : null;
  const mismatchDownloadDisabled = !mismatchResult;
  const nonCanonicalDownloadDisabled = nonCanonicalList.length === 0;
  const repairDownloadDisabled = !repairResult || repairResult.repairedGames.length === 0;
  const trackerRangeStartDate = mismatchResult?.startDate ?? startDate;
  const trackerRangeEndDate = mismatchResult?.endDate ?? endDate;
  const cleanupTrackerKey = buildNonCanonicalCleanupTrackerKey(trackerRangeStartDate, trackerRangeEndDate);
  const cleanupTrackerBusy = loadingCleanupTrackers || savingCleanupTracker;
  const allCleanupTrackers = useMemo<Record<string, AdminNonCanonicalCleanupTrackerEntry>>(() => (
    Object.fromEntries(
      cleanupTrackers.map((entry) => [
        buildNonCanonicalCleanupTrackerKey(entry.startDate, entry.endDate),
        entry,
      ]),
    )
  ), [cleanupTrackers]);
  const currentRangeCleanupTracker = allCleanupTrackers[cleanupTrackerKey] ?? null;
  const currentRangeCleanupArtifacts = extractNonCanonicalCleanupArtifactPaths(currentRangeCleanupTracker?.note ?? '');
  const currentRangeCleanupClosureSync = extractNonCanonicalCleanupClosureSync(currentRangeCleanupTracker?.note ?? '');
  const currentRangeCleanupUserNote = extractNonCanonicalCleanupUserNote(currentRangeCleanupTracker?.note ?? '');
  const trackedGameIdsForSave = nonCanonicalList.length > 0
    ? nonCanonicalList.map((game) => game.gameId)
    : currentRangeCleanupTracker?.gameIds ?? [];
  const savedCleanupTrackers = useMemo(() => (
    cleanupTrackers
      .map((record) => ({
        key: buildNonCanonicalCleanupTrackerKey(record.startDate, record.endDate),
        ...parseNonCanonicalCleanupTrackerKey(buildNonCanonicalCleanupTrackerKey(record.startDate, record.endDate)),
        record,
      }))
      .sort((left, right) => right.record.updatedAt.localeCompare(left.record.updatedAt))
  ), [cleanupTrackers]);
  const nonCanonicalCleanupDraft = buildNonCanonicalGameCleanupDraft({
    startDate: trackerRangeStartDate,
    endDate: trackerRangeEndDate,
    runbookPath: predictionGameStatusRunbookPath,
    games: nonCanonicalList,
  });
  const currentTrackedGameIds = currentRangeCleanupTracker?.gameIds ?? [];
  const currentRemainingTrackedGameIds = currentTrackedGameIds.filter((gameId) =>
    nonCanonicalList.some((game) => game.gameId === gameId),
  );
  const currentResolvedTrackedCount = currentTrackedGameIds.length - currentRemainingTrackedGameIds.length;
  const currentNewTrackedCount = nonCanonicalList.filter((game) => !currentTrackedGameIds.includes(game.gameId)).length;
  const currentRangeCleanupProgressMessage = currentRangeCleanupTracker && mismatchResult && currentTrackedGameIds.length > 0
    ? currentRemainingTrackedGameIds.length === 0
      ? `재진단 결과: 저장된 비정상 row ${currentTrackedGameIds.length}건이 모두 해소되었습니다.`
      : `재진단 결과: 저장된 비정상 row ${currentTrackedGameIds.length}건 중 ${currentRemainingTrackedGameIds.length}건 남아 있습니다.`
    : null;
  const currentRangeClosureFallback: AdminNonCanonicalCleanupClosureSync | null = currentRangeCleanupTracker && mismatchResult && currentTrackedGameIds.length > 0
    ? {
      comparedAt: null,
      compareStatus: currentRemainingTrackedGameIds.length === 0 && currentNewTrackedCount === 0 ? 'PASS' : 'FAIL',
      trackerStatus: currentRangeCleanupTracker.status,
      resolvedCount: currentResolvedTrackedCount,
      remainingCount: currentRemainingTrackedGameIds.length,
      newCount: currentNewTrackedCount,
    }
    : null;
  const currentRangeClosureDisplay = currentRangeCleanupClosureSync ?? currentRangeClosureFallback;
  const canMarkCleanupDone = Boolean(
    currentRangeCleanupTracker
    && mismatchResult
    && currentTrackedGameIds.length > 0
    && currentRemainingTrackedGameIds.length === 0
    && cleanupStatus !== 'done',
  );

  useEffect(() => {
    setCleanupTicketUrl(currentRangeCleanupTracker?.ticketUrl ?? '');
    setCleanupAssignee(currentRangeCleanupTracker?.assignee ?? '');
    setCleanupStatus(currentRangeCleanupTracker?.status ?? 'draft');
    setCleanupNote(currentRangeCleanupUserNote);
    setCleanupSavedAt(currentRangeCleanupTracker?.updatedAt ?? null);
  }, [cleanupTrackerKey, currentRangeCleanupTracker, currentRangeCleanupUserNote]);

  useEffect(() => {
    setCleanupTrackerMessage(null);
  }, [cleanupTrackerKey]);

  const handleMismatchCsvDownload = () => {
    if (!mismatchResult) {
      return;
    }

    const filename = `game-status-diagnosis-${formatRangeSlug(
      mismatchResult.startDate,
      mismatchResult.endDate,
    )}.csv`;
    downloadCsvFile(filename, buildMismatchCsv(mismatchResult));
  };

  const handleRepairCsvDownload = () => {
    if (!repairResult || repairResult.repairedGames.length === 0) {
      return;
    }

    const suffix = repairResult.dryRun ? 'dry-run' : 'applied';
    const filename = `game-status-repairs-${formatRangeSlug(
      repairResult.startDate,
      repairResult.endDate,
    )}-${suffix}.csv`;
    downloadCsvFile(filename, buildRepairedGamesCsv(repairResult));
  };

  const handleNonCanonicalCsvDownload = () => {
    if (nonCanonicalList.length === 0) {
      return;
    }

    const filename = `game-status-non-canonical-${formatRangeSlug(
      mismatchResult?.startDate ?? startDate,
      mismatchResult?.endDate ?? endDate,
    )}.csv`;
    downloadCsvFile(filename, buildNonCanonicalGamesCsv(nonCanonicalList));
  };

  const handleNonCanonicalCleanupCopy = async () => {
    if (nonCanonicalList.length === 0) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(nonCanonicalCleanupDraft);
      setNonCanonicalCopyState('done');
    } catch {
      setNonCanonicalCopyState('error');
    }
  };

  const handleArtifactPathCopy = async (path: string, label: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(path);
      setCleanupTrackerMessage(`${label} 경로를 복사했습니다.`);
    } catch {
      setCleanupTrackerMessage(`${label} 경로를 복사하지 못했습니다.`);
    }
  };

  const handleClosureCommandCopy = async (command: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(command);
      setCleanupTrackerMessage('closure 재검증 명령을 복사했습니다.');
    } catch {
      setCleanupTrackerMessage('closure 재검증 명령을 복사하지 못했습니다.');
    }
  };

  const handleTrackerSyncCommandCopy = async (command: string) => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(command);
      setCleanupTrackerMessage('closure + tracker sync 명령을 복사했습니다.');
    } catch {
      setCleanupTrackerMessage('closure + tracker sync 명령을 복사하지 못했습니다.');
    }
  };

  const handleSuggestionSelect = (gameDate: string) => {
    setStartDate(gameDate);
    setEndDate(gameDate);
    setNonCanonicalCopyState('idle');
    void runDiagnosis({
      nextStartDate: gameDate,
      nextEndDate: gameDate,
    });
  };

  const handleSavedTrackerSelect = ({
    nextStartDate,
    nextEndDate,
  }: {
    nextStartDate: string;
    nextEndDate: string;
  }) => {
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setNonCanonicalCopyState('idle');
    void runDiagnosis({
      nextStartDate,
      nextEndDate,
    });
  };

  const handleCleanupTrackerSave = async () => {
    setSavingCleanupTracker(true);
    try {
      const saved = await upsertAdminNonCanonicalCleanupTracker({
        startDate: trackerRangeStartDate,
        endDate: trackerRangeEndDate || undefined,
        record: {
          ticketUrl: cleanupTicketUrl.trim(),
          assignee: cleanupAssignee.trim(),
          status: cleanupStatus,
          note: buildNonCanonicalCleanupTrackerNote({
            userNote: cleanupNote,
            existingNote: currentRangeCleanupTracker?.note ?? '',
          }),
          updatedAt: cleanupSavedAt ?? '',
          gameIds: trackedGameIdsForSave,
        },
      });
      setCleanupTrackers((current) => {
        const next = current.filter((entry) =>
          buildNonCanonicalCleanupTrackerKey(entry.startDate, entry.endDate)
          !== buildNonCanonicalCleanupTrackerKey(saved.startDate, saved.endDate),
        );
        return [saved, ...next].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });
      setCleanupSavedAt(saved.updatedAt);
      setCleanupTrackerMessage('정제 티켓 메모를 저장했습니다.');
    } catch (error) {
      setCleanupTrackerMessage(getApiErrorMessage(error, '정제 티켓 메모를 저장하지 못했습니다.'));
    } finally {
      setSavingCleanupTracker(false);
    }
  };

  const handleCleanupTrackerDone = async () => {
    setSavingCleanupTracker(true);
    try {
      const saved = await upsertAdminNonCanonicalCleanupTracker({
        startDate: trackerRangeStartDate,
        endDate: trackerRangeEndDate || undefined,
        record: {
          ticketUrl: cleanupTicketUrl.trim(),
          assignee: cleanupAssignee.trim(),
          status: 'done',
          note: buildNonCanonicalCleanupTrackerNote({
            userNote: cleanupNote,
            existingNote: currentRangeCleanupTracker?.note ?? '',
          }),
          updatedAt: cleanupSavedAt ?? '',
          gameIds: currentTrackedGameIds,
        },
      });
      setCleanupTrackers((current) => {
        const next = current.filter((entry) =>
          buildNonCanonicalCleanupTrackerKey(entry.startDate, entry.endDate)
          !== buildNonCanonicalCleanupTrackerKey(saved.startDate, saved.endDate),
        );
        return [saved, ...next].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
      });
      setCleanupStatus('done');
      setCleanupSavedAt(saved.updatedAt);
      setCleanupTrackerMessage('정제 완료 상태로 저장했습니다.');
    } catch (error) {
      setCleanupTrackerMessage(getApiErrorMessage(error, '정제 완료 상태를 저장하지 못했습니다.'));
    } finally {
      setSavingCleanupTracker(false);
    }
  };

  const handleCleanupTrackerClear = async () => {
    setSavingCleanupTracker(true);
    try {
      await deleteAdminNonCanonicalCleanupTracker({
        startDate: trackerRangeStartDate,
        endDate: trackerRangeEndDate || undefined,
      });
      setCleanupTrackers((current) => current.filter((entry) =>
        buildNonCanonicalCleanupTrackerKey(entry.startDate, entry.endDate) !== cleanupTrackerKey,
      ));
      setCleanupTicketUrl('');
      setCleanupAssignee('');
      setCleanupStatus('draft');
      setCleanupNote('');
      setCleanupSavedAt(null);
      setCleanupTrackerMessage('정제 티켓 메모를 비웠습니다.');
    } catch (error) {
      setCleanupTrackerMessage(getApiErrorMessage(error, '정제 티켓 메모를 비우지 못했습니다.'));
    } finally {
      setSavingCleanupTracker(false);
    }
  };

  return (
    <div data-testid="admin-game-status-panel" className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-caption font-semibold text-emerald-300">
              <AdminShieldAlertIcon className="h-4 w-4" />
              Prediction 경기 상태 복구
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">경기 상태 mismatch 진단 및 복구</h2>
              <p className="mt-2 max-w-3xl text-caption text-slate-400">
                raw game status와 점수/이닝 데이터가 어긋난 경기, 팀 코드가 비정상인 raw row를 날짜 범위 기준으로 진단하고 dry-run 또는 실제 복구를 바로 실행할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:min-w-[540px]">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-slate-400">
                <AdminCalendarIcon className="h-4 w-4" />
                시작일
              </span>
              <Input
                data-testid="admin-game-status-start-date"
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setNonCanonicalCopyState('idle');
                }}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-caption font-semibold uppercase tracking-[0.18em] text-slate-400">종료일</span>
              <Input
                data-testid="admin-game-status-end-date"
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value);
                  setNonCanonicalCopyState('idle');
                }}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            data-testid="admin-game-status-diagnose"
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
            onClick={() => {
              void runDiagnosis();
            }}
            disabled={isBusy || !startDate}
          >
            <AdminRefreshIcon className={`h-4 w-4 ${loadingMismatches ? 'animate-spin' : ''}`} />
            진단
          </Button>
          <Button
            data-testid="admin-game-status-dry-run"
            variant="outline"
            className="border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
            onClick={() => {
              void runRepair(true);
            }}
            disabled={isBusy || !startDate}
          >
            dry-run
          </Button>
          <Button
            data-testid="admin-game-status-apply"
            variant="destructive"
            className="bg-rose-600 text-white hover:bg-rose-500"
            onClick={() => {
              void runRepair(false);
            }}
            disabled={isBusy || !startDate}
          >
            실제 복구
          </Button>
          <Button
            data-testid="admin-game-status-download-mismatches"
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
            onClick={handleMismatchCsvDownload}
            disabled={isBusy || mismatchDownloadDisabled}
          >
            <AdminDownloadIcon className="h-4 w-4" />
            진단 CSV
          </Button>
          <Button
            data-testid="admin-game-status-download-non-canonical"
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
            onClick={handleNonCanonicalCsvDownload}
            disabled={isBusy || nonCanonicalDownloadDisabled}
          >
            <AdminDownloadIcon className="h-4 w-4" />
            비정상 row CSV
          </Button>
          <Button
            data-testid="admin-game-status-copy-non-canonical-template"
            variant="outline"
            className="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
            onClick={() => {
              void handleNonCanonicalCleanupCopy();
            }}
            disabled={isBusy || nonCanonicalDownloadDisabled}
          >
            <AdminClipboardIcon className="h-4 w-4" />
            {nonCanonicalCopyState === 'done'
              ? '복사됨'
              : nonCanonicalCopyState === 'error'
                ? '복사 실패'
                : '정제 요청 복사'}
          </Button>
          <Button
            data-testid="admin-game-status-download-repairs"
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            onClick={handleRepairCsvDownload}
            disabled={isBusy || repairDownloadDisabled}
          >
            <AdminDownloadIcon className="h-4 w-4" />
            복구 CSV
          </Button>
        </div>

        {lastActionMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-caption text-emerald-200">
            {lastActionMessage}
          </div>
        )}

        {panelError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-caption text-rose-200">
            <AdminAlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{panelError}</span>
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-2 text-slate-100">
            <AdminShieldAlertIcon className="h-4 w-4 text-amber-300" />
            <h3 className="text-15 font-semibold">운영 메모</h3>
          </div>
          <div className="mt-3 space-y-2 text-caption text-slate-400">
            <p>1. `dry-run`으로 mismatch 반영 건수와 비정상 팀 코드 row 수를 먼저 확인합니다.</p>
            <p>2. `정제 요청 복사`는 raw 데이터 정제 티켓 본문으로, `비정상 row CSV`는 첨부 파일로 사용합니다.</p>
            <p>3. `정제 티켓 추적`에 티켓 URL, 담당자, 상태를 남겨 관리자 공용 처리 이력을 서버에 저장합니다.</p>
            <p>4. `실제 복구`는 mismatch만 반영하며, 비정상 팀 코드 row는 별도 정제가 필요합니다.</p>
            {currentRangeCleanupTracker && (
              <p data-testid="admin-game-status-current-tracker-summary">
                현재 범위 저장 상태: {cleanupStatusLabel[currentRangeCleanupTracker.status]}
                {currentRangeCleanupTracker.assignee ? ` / 담당자 ${currentRangeCleanupTracker.assignee}` : ''}
              </p>
            )}
            {currentRangeCleanupProgressMessage && (
              <p data-testid="admin-game-status-current-tracker-progress">
                {currentRangeCleanupProgressMessage}
              </p>
            )}
            <p>
              runbook: <span className="font-mono text-slate-300">{predictionGameStatusRunbookPath}</span>
            </p>
          </div>
        </div>

        {(nonCanonicalList.length > 0 || cleanupSavedAt || cleanupTicketUrl || cleanupAssignee || cleanupNote) && (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-15 font-semibold text-slate-100">정제 티켓 추적</h3>
                <p className="mt-1 text-caption text-slate-400">
                  현재 범위({formatRangeLabel(trackerRangeStartDate, trackerRangeEndDate || undefined)})의 non-canonical row 처리 이력을 관리자 공용 tracker로 서버에 저장합니다.
                </p>
              </div>
              <AdminStatusBadge status={cleanupStatus} label={cleanupStatusLabel[cleanupStatus]} />
            </div>
            {currentRangeCleanupTracker?.ticketUrl && (
              <p className="mt-3 text-caption text-slate-400">
                저장된 티켓:{' '}
                <a
                  data-testid="admin-game-status-ticket-link"
                  href={currentRangeCleanupTracker.ticketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sky-300 underline underline-offset-2"
                >
                  {currentRangeCleanupTracker.ticketUrl}
                </a>
              </p>
            )}
            {currentRangeCleanupTracker?.gameIds.length ? (
              <p className="mt-2 text-13 text-slate-500">
                추적 대상: {currentRangeCleanupTracker.gameIds.join(', ')}
              </p>
            ) : null}
            {currentRangeCleanupProgressMessage && (
              <p
                data-testid="admin-game-status-ticket-progress"
                className="mt-2 text-13 text-slate-400"
              >
                {currentRangeCleanupProgressMessage}
              </p>
            )}
            <div className="mt-3">
              <CleanupClosureStatus
                closureSync={currentRangeClosureDisplay}
                testIdPrefix="admin-game-status-current-closure"
              />
            </div>
            <div className="mt-3">
              <CleanupArtifactPaths
                artifacts={currentRangeCleanupArtifacts}
                testIdPrefix="admin-game-status-current-artifact"
                onCopyPath={handleArtifactPathCopy}
                onCopyClosureCommand={handleClosureCommandCopy}
                onCopyTrackerSyncCommand={handleTrackerSyncCommandCopy}
              />
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-13 font-semibold uppercase tracking-[0.18em] text-slate-400">티켓 URL</span>
                <Input
                  data-testid="admin-game-status-ticket-url"
                  value={cleanupTicketUrl}
                  onChange={(event) => setCleanupTicketUrl(event.target.value)}
                  placeholder="https://tickets.example.com/..."
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-13 font-semibold uppercase tracking-[0.18em] text-slate-400">담당자</span>
                <Input
                  data-testid="admin-game-status-ticket-assignee"
                  value={cleanupAssignee}
                  onChange={(event) => setCleanupAssignee(event.target.value)}
                  placeholder="ops-team"
                  className="border-slate-700 bg-slate-950 text-slate-100"
                />
              </label>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="space-y-2">
                <span className="text-13 font-semibold uppercase tracking-[0.18em] text-slate-400">상태</span>
                <select
                  data-testid="admin-game-status-ticket-status"
                  value={cleanupStatus}
                  onChange={(event) => setCleanupStatus(event.target.value as AdminNonCanonicalCleanupTrackerStatus)}
                  className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  {Object.entries(cleanupStatusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-13 font-semibold uppercase tracking-[0.18em] text-slate-400">메모</span>
                <Textarea
                  data-testid="admin-game-status-ticket-note"
                  value={cleanupNote}
                  onChange={(event) => setCleanupNote(event.target.value)}
                  placeholder="예: 데이터 정제 팀에 raw team code 수정 요청"
                  className="min-h-[88px] border-slate-700 bg-slate-950 text-slate-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canMarkCleanupDone && (
                <Button
                  type="button"
                  data-testid="admin-game-status-ticket-mark-done"
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  onClick={() => {
                    void handleCleanupTrackerDone();
                  }}
                  disabled={cleanupTrackerBusy}
                >
                  정제 완료로 저장
                </Button>
              )}
              <Button
                type="button"
                data-testid="admin-game-status-ticket-save"
                variant="outline"
                className="border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                onClick={() => {
                  void handleCleanupTrackerSave();
                }}
                disabled={cleanupTrackerBusy}
              >
                <AdminSaveIcon className="h-4 w-4" />
                저장
              </Button>
              <Button
                type="button"
                data-testid="admin-game-status-ticket-clear"
                variant="outline"
                className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                onClick={() => {
                  void handleCleanupTrackerClear();
                }}
                disabled={cleanupTrackerBusy}
              >
                초기화
              </Button>
              <span className="text-13 text-slate-500">
                마지막 저장: <span data-testid="admin-game-status-ticket-saved-at" className="text-slate-300">{formatSavedAtLabel(cleanupSavedAt)}</span>
              </span>
            </div>

            {cleanupTrackerMessage && (
              <div
                data-testid="admin-game-status-ticket-message"
                className="mt-4 rounded-2xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-caption text-sky-200"
              >
                {cleanupTrackerMessage}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">최근 이슈 날짜 추천</h3>
            <p className="text-caption text-slate-400">
              최근 14일({suggestionWindowStartDate} ~ {today}) 범위에서 mismatch 또는 비정상 팀 코드 row가 발견된 날짜입니다.
            </p>
          </div>
          <Button
            data-testid="admin-game-status-refresh-suggestions"
            variant="outline"
            className="border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
            onClick={() => {
              void loadRecentRecommendations();
            }}
            disabled={loadingSuggestions}
          >
            <AdminRefreshIcon className={`h-4 w-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
            최근 이슈 재조회
          </Button>
        </div>

        {suggestionsError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-caption text-rose-200">
            <AdminAlertTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{suggestionsError}</span>
          </div>
        )}

        {loadingSuggestions ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-caption text-slate-400">
            최근 이슈 날짜를 확인 중입니다.
          </div>
        ) : recentRecommendations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-caption text-slate-400">
            최근 14일 범위에서 추천할 이상 날짜가 없습니다.
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            {recentRecommendations.map((recommendation) => (
              <MismatchDateSuggestionCard
                key={recommendation.gameDate}
                recommendation={recommendation}
                trackerStatus={allCleanupTrackers[recommendation.gameDate]?.status ?? null}
                trackerAssignee={allCleanupTrackers[recommendation.gameDate]?.assignee ?? null}
                trackerClosureSync={extractNonCanonicalCleanupClosureSync(allCleanupTrackers[recommendation.gameDate]?.note ?? '')}
                trackerArtifacts={extractNonCanonicalCleanupArtifactPaths(allCleanupTrackers[recommendation.gameDate]?.note ?? '')}
                active={selectedSingleDate === recommendation.gameDate}
                onSelect={handleSuggestionSelect}
              />
            ))}
          </div>
        )}
      </section>

      {savedCleanupTrackers.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">저장된 정제 이력</h3>
              <p className="text-caption text-slate-400">
                서버에 저장된 non-canonical 정제 티켓 범위를 다시 불러와 재진단할 수 있습니다.
              </p>
            </div>
            <AdminBadge className="border-slate-700 bg-slate-900 text-slate-200">
              {savedCleanupTrackers.length}개 범위
            </AdminBadge>
          </div>

          <div className="mt-5 space-y-3">
            {savedCleanupTrackers.map(({ key, startDate: savedStartDate, endDate: savedEndDate, record }) => {
              const trackerTestId = key.replace(/[^0-9A-Za-z_-]/g, '-');
              const isCurrentRange = key === cleanupTrackerKey;
              const trackerArtifacts = extractNonCanonicalCleanupArtifactPaths(record.note);
              const trackerClosureSync = extractNonCanonicalCleanupClosureSync(record.note);
              const trackerUserNote = extractNonCanonicalCleanupUserNote(record.note);
              const trackerClosureDisplay = trackerClosureSync ?? (isCurrentRange ? currentRangeClosureDisplay : null);

              return (
                <div
                  key={key}
                  data-testid={`admin-game-status-history-${trackerTestId}`}
                  className={cn(
                    'rounded-2xl border px-4 py-4',
                    isCurrentRange
                      ? 'border-amber-500/30 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60',
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-caption text-slate-100">
                          {formatRangeLabel(savedStartDate, savedEndDate)}
                        </p>
                        <AdminStatusBadge status={record.status} label={cleanupStatusLabel[record.status]} />
                        {record.assignee && (
                          <span className="text-13 text-slate-400">담당: {record.assignee}</span>
                        )}
                      </div>
                      <p className="text-13 text-slate-500">
                        마지막 저장: {formatSavedAtLabel(record.updatedAt)}
                      </p>
                      {record.gameIds.length > 0 && (
                        <p className="text-13 text-slate-400">
                          대상 경기: {record.gameIds.join(', ')}
                        </p>
                      )}
                      {trackerUserNote && (
                        <p className="text-13 text-slate-400">
                          메모: {trackerUserNote}
                        </p>
                      )}
                      {record.ticketUrl && (
                        <a
                          href={record.ticketUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block break-all text-13 text-sky-300 underline underline-offset-2"
                        >
                          {record.ticketUrl}
                        </a>
                      )}
                      <CleanupClosureStatus
                        closureSync={trackerClosureDisplay}
                        testIdPrefix={`admin-game-status-history-closure-${trackerTestId}`}
                      />
                      <CleanupArtifactPaths
                        artifacts={trackerArtifacts}
                        testIdPrefix={`admin-game-status-history-artifact-${trackerTestId}`}
                        onCopyPath={handleArtifactPathCopy}
                        onCopyClosureCommand={handleClosureCommandCopy}
                        onCopyTrackerSyncCommand={handleTrackerSyncCommandCopy}
                      />
                    </div>

                    <Button
                      type="button"
                      data-testid={`admin-game-status-load-history-${trackerTestId}`}
                      variant="outline"
                      className="border-slate-700 bg-slate-950 text-slate-200 hover:bg-slate-800"
                      onClick={() => {
                        handleSavedTrackerSelect({
                          nextStartDate: savedStartDate,
                          nextEndDate: savedEndDate,
                        });
                      }}
                      disabled={isBusy}
                    >
                      이 범위 불러오기
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="대상 경기"
          value={currentSummary?.totalGames ?? 0}
          accentClassName="border-slate-800 bg-slate-900/70"
        />
        <SummaryCard
          label="Mismatch"
          value={currentSummary?.mismatchCount ?? 0}
          accentClassName="border-amber-500/20 bg-amber-500/10"
        />
        <SummaryCard
          label="비정상 팀 코드"
          value={currentSummary?.nonCanonicalCount ?? 0}
          accentClassName="border-rose-500/20 bg-rose-500/10"
        />
        <SummaryCard
          label={repairResult?.dryRun ? '예상 복구' : '복구 반영'}
          value={repairResult?.repairedCount ?? 0}
          accentClassName="border-emerald-500/20 bg-emerald-500/10"
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">진단 결과</h3>
            <p className="text-caption text-slate-400">
              조회 범위: {formatRangeLabel(startDate, endDate || undefined)}
            </p>
          </div>
          {repairResult && (
            <AdminBadge className={repairResult.dryRun ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}>
              {repairResult.dryRun ? 'dry-run 결과' : '복구 결과 반영'}
            </AdminBadge>
          )}
        </div>

        {!mismatchResult ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-caption text-slate-400">
            날짜 범위를 선택한 뒤 진단을 실행하세요.
          </div>
        ) : mismatchList.length === 0 && nonCanonicalList.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-caption text-slate-400">
            선택한 날짜 범위에서 경기 상태 불일치나 비정상 팀 코드 경기가 없습니다.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {mismatchList.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-15 font-semibold text-slate-100">상태 mismatch</h4>
                    <p className="text-13 text-slate-400">
                      점수/이닝 근거와 raw 상태가 어긋난 경기입니다.
                    </p>
                  </div>
                  <AdminBadge className="border-amber-500/25 bg-amber-500/10 text-amber-200">
                    {mismatchList.length}건
                  </AdminBadge>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-900/90">
                      <TableRow className="border-slate-800/80">
                        <TableHead>경기일</TableHead>
                        <TableHead>경기 ID</TableHead>
                        <TableHead>시작</TableHead>
                        <TableHead>raw</TableHead>
                        <TableHead>effective</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead>이닝</TableHead>
                        <TableHead>근거</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mismatchList.map((mismatch) => (
                        <TableRow
                          key={mismatch.gameId}
                          data-testid={`admin-game-status-mismatch-${mismatch.gameId}`}
                          className="border-slate-800/80"
                        >
                          <TableCell className="text-slate-300">{mismatch.gameDate}</TableCell>
                          <TableCell className="font-mono text-caption text-slate-300">{mismatch.gameId}</TableCell>
                          <TableCell className="text-slate-300">{formatTimeLabel(mismatch.startTime)}</TableCell>
                          <TableCell>
                            <AdminGameStatusBadge status={mismatch.normalizedRawStatus || mismatch.rawStatus} />
                          </TableCell>
                          <TableCell>
                            <AdminGameStatusBadge status={mismatch.effectiveStatus} />
                          </TableCell>
                          <TableCell className="text-slate-200">
                            {formatScoreLabel(mismatch.homeScore, mismatch.awayScore)}
                          </TableCell>
                          <TableCell className="text-slate-300">{mismatch.inningScoreCount}</TableCell>
                          <TableCell className="max-w-xl">
                            <MismatchReasons reasons={mismatch.reasons} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-4 text-caption text-slate-400">
                상태 mismatch는 없고 비정상 팀 코드 row만 존재합니다.
              </div>
            )}

            {nonCanonicalList.length > 0 && (
              <div>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-15 font-semibold text-slate-100">비정상 팀 코드 raw row</h4>
                    <p className="text-13 text-slate-400">
                      canonical 팀 코드로 해석되지 않아 prediction/AI 대상에서 제외된 raw row입니다.
                    </p>
                  </div>
                  <AdminBadge className="border-rose-500/25 bg-rose-500/10 text-rose-200">
                    {nonCanonicalList.length}건
                  </AdminBadge>
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-800">
                  <Table>
                    <TableHeader className="bg-slate-900/90">
                      <TableRow className="border-slate-800/80">
                        <TableHead>경기일</TableHead>
                        <TableHead>경기 ID</TableHead>
                        <TableHead>시작</TableHead>
                        <TableHead>raw 상태</TableHead>
                        <TableHead>팀 코드</TableHead>
                        <TableHead>점수</TableHead>
                        <TableHead>근거</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonCanonicalList.map((game) => (
                        <NonCanonicalGameRow key={game.gameId} game={game} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {repairResult && repairResult.repairedGames.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">복구 반영 목록</h3>
              <p className="text-caption text-slate-400">
                {formatRangeLabel(repairResult.startDate, repairResult.endDate)} 범위에서 실제로 반영된 경기입니다.
              </p>
            </div>
            <AdminBadge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200">
              {repairResult.repairedCount}건 반영
            </AdminBadge>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
            <Table>
              <TableHeader className="bg-slate-900/90">
                <TableRow className="border-slate-800/80">
                  <TableHead>경기 ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>점수</TableHead>
                  <TableHead>이닝</TableHead>
                  <TableHead>점수출처</TableHead>
                  <TableHead>승리팀</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairedGames.map((game) => (
                  <RepairedGameRow key={game.gameId} game={game} />
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
