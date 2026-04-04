import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarDays, Download, RefreshCw, ShieldAlert } from 'lucide-react';

import {
  fetchAdminGameStatusMismatches,
  repairAdminGameStatusMismatches,
} from '../../api/admin';
import type {
  AdminGameScoreSyncResult,
  AdminGameStatusMismatch,
  AdminGameStatusMismatchBatchResult,
  AdminGameStatusRepairBatchResult,
} from '../../types/admin';
import { cn } from '../../lib/utils';
import {
  buildGameStatusDateRecommendations,
  formatInputDate,
  shiftInputDate,
  type AdminGameStatusDateRecommendation,
} from '../../utils/adminGameStatus';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { AdminBadge } from './AdminPanelPrimitives';

const formatRangeLabel = (startDate: string, endDate?: string) =>
  endDate && endDate !== startDate ? `${startDate} ~ ${endDate}` : startDate;

const formatRangeSlug = (startDate: string, endDate?: string) =>
  endDate && endDate !== startDate ? `${startDate}_to_${endDate}` : startDate;

const formatTimeLabel = (value: string | null | undefined) => value ? value.slice(0, 5) : '-';

const formatScoreLabel = (homeScore: number | null, awayScore: number | null) => {
  if (homeScore == null && awayScore == null) {
    return '-';
  }

  return `원정 ${awayScore ?? '-'} / 홈 ${homeScore ?? '-'}`;
};

const statusBadgeClassName = (status: string | null | undefined) => {
  switch (status) {
    case 'LIVE':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'COMPLETED':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'DRAW':
      return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    case 'SCHEDULED':
      return 'bg-slate-700 text-slate-200 border-slate-600';
    default:
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  }
};

const escapeCsvCell = (value: string | number | boolean | null | undefined) => {
  const normalized = value == null ? '' : String(value);
  const escaped = normalized.replaceAll('"', '""');

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
};

const buildCsv = (rows: Array<Array<string | number | boolean | null | undefined>>) =>
  rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(',')).join('\n');

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
    'gameDate',
    'gameId',
    'startTime',
    'rawStatus',
    'normalizedRawStatus',
    'effectiveStatus',
    'homeScore',
    'awayScore',
    'inningScoreCount',
    'hasKnownScore',
    'hasInningScores',
    'reasons',
  ],
  ...result.mismatches.map((mismatch) => [
    mismatch.gameDate,
    mismatch.gameId,
    mismatch.startTime,
    mismatch.rawStatus,
    mismatch.normalizedRawStatus,
    mismatch.effectiveStatus,
    mismatch.homeScore,
    mismatch.awayScore,
    mismatch.inningScoreCount,
    mismatch.hasKnownScore,
    mismatch.hasInningScores,
    mismatch.reasons.join(' | '),
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
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-50">{value}</p>
    </div>
  );
}

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

function RepairedGameRow({ game }: { game: AdminGameScoreSyncResult }) {
  return (
    <TableRow data-testid={`admin-game-status-repaired-${game.gameId}`} className="border-slate-800/80">
      <TableCell className="font-mono text-xs text-slate-300">{game.gameId}</TableCell>
      <TableCell>
        <AdminBadge className={statusBadgeClassName(game.gameStatus)}>
          {game.gameStatus}
        </AdminBadge>
      </TableCell>
      <TableCell className="text-slate-200">{formatScoreLabel(game.homeScore, game.awayScore)}</TableCell>
      <TableCell className="text-slate-300">{game.inningScoreCount}</TableCell>
      <TableCell className="text-slate-300">{game.usedInningScores ? '이닝합산' : '기존점수'}</TableCell>
      <TableCell className="text-slate-300">{game.winningTeam || '-'}</TableCell>
    </TableRow>
  );
}

function MismatchDateSuggestionCard({
  recommendation,
  active,
  onSelect,
}: {
  recommendation: AdminGameStatusDateRecommendation;
  active: boolean;
  onSelect: (gameDate: string) => void;
}) {
  const statusSummary = recommendation.effectiveStatuses.join(' / ');

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
          <p className="text-sm font-semibold">{recommendation.gameDate}</p>
          <p className="mt-1 text-xs text-slate-400">mismatch {recommendation.mismatchCount}건</p>
        </div>
        <AdminBadge className="border-amber-500/25 bg-amber-500/10 text-amber-200">
          추천
        </AdminBadge>
      </div>
      <p className="mt-3 text-xs text-slate-300">
        예상 상태: {statusSummary || '-'}
      </p>
    </button>
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
  const [panelError, setPanelError] = useState<string | null>(null);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [lastActionMessage, setLastActionMessage] = useState<string | null>(null);
  const [mismatchResult, setMismatchResult] = useState<AdminGameStatusMismatchBatchResult | null>(null);
  const [repairResult, setRepairResult] = useState<AdminGameStatusRepairBatchResult | null>(null);
  const [recentRecommendations, setRecentRecommendations] = useState<AdminGameStatusDateRecommendation[]>([]);
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);

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
        setLastActionMessage(
          result.mismatchCount > 0
            ? `불일치 ${result.mismatchCount}건을 찾았습니다.`
            : '선택한 날짜 범위에서 경기 상태 불일치가 없습니다.',
        );
      }

      return result;
    } catch (error) {
      setPanelError(getApiErrorMessage(error, '경기 상태 불일치를 불러오지 못했습니다.'));
      return null;
    } finally {
      setLoadingMismatches(false);
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
      setRecentRecommendations(buildGameStatusDateRecommendations(result.mismatches));
    } catch (error) {
      setSuggestionsError(getApiErrorMessage(error, '최근 mismatch 날짜를 불러오지 못했습니다.'));
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
      });
      setLastActionMessage(
        dryRun
          ? `dry-run 완료: mismatch ${result.mismatchCount}건, 예상 복구 ${result.repairedCount}건`
          : `실제 복구 완료: ${result.repairedCount}건 반영`,
      );

      if (!dryRun) {
        const refreshed = await fetchAdminGameStatusMismatches({
          startDate,
          endDate: endDate || undefined,
        });
        setMismatchResult(refreshed);
        void loadRecentRecommendations();
      }
    } catch (error) {
      setPanelError(getApiErrorMessage(error, '경기 상태 복구를 실행하지 못했습니다.'));
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
  }, [active, hasAutoLoaded]);

  const currentSummary = repairResult ?? mismatchResult;
  const mismatchList: AdminGameStatusMismatch[] = mismatchResult?.mismatches ?? [];
  const repairedGames = repairResult?.repairedGames ?? [];
  const isBusy = loadingMismatches || loadingRepair;
  const selectedSingleDate = startDate && endDate === startDate ? startDate : null;
  const mismatchDownloadDisabled = !mismatchResult;
  const repairDownloadDisabled = !repairResult || repairResult.repairedGames.length === 0;

  const handleMismatchCsvDownload = () => {
    if (!mismatchResult) {
      return;
    }

    const filename = `game-status-mismatches-${formatRangeSlug(
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

  const handleSuggestionSelect = (gameDate: string) => {
    setStartDate(gameDate);
    setEndDate(gameDate);
    void runDiagnosis({
      nextStartDate: gameDate,
      nextEndDate: gameDate,
    });
  };

  return (
    <div data-testid="admin-game-status-panel" className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <ShieldAlert className="h-4 w-4" />
              Prediction 경기 상태 복구
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">경기 상태 mismatch 진단 및 복구</h2>
              <p className="mt-2 max-w-3xl text-sm text-slate-400">
                raw game status와 점수/이닝 데이터가 어긋난 경기를 날짜 범위 기준으로 진단하고, dry-run 또는 실제 복구를 바로 실행할 수 있습니다.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:min-w-[540px]">
            <label className="space-y-2">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                <CalendarDays className="h-4 w-4" />
                시작일
              </span>
              <Input
                data-testid="admin-game-status-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">종료일</span>
              <Input
                data-testid="admin-game-status-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
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
            <RefreshCw className={`h-4 w-4 ${loadingMismatches ? 'animate-spin' : ''}`} />
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
            <Download className="h-4 w-4" />
            mismatch CSV
          </Button>
          <Button
            data-testid="admin-game-status-download-repairs"
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
            onClick={handleRepairCsvDownload}
            disabled={isBusy || repairDownloadDisabled}
          >
            <Download className="h-4 w-4" />
            복구 CSV
          </Button>
        </div>

        {lastActionMessage && (
          <div className="mt-5 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {lastActionMessage}
          </div>
        )}

        {panelError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{panelError}</span>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">최근 mismatch 날짜 추천</h3>
            <p className="text-sm text-slate-400">
              최근 14일({suggestionWindowStartDate} ~ {today}) 범위에서 mismatch가 발견된 날짜입니다.
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
            <RefreshCw className={`h-4 w-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
            최근 추천 재조회
          </Button>
        </div>

        {suggestionsError && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{suggestionsError}</span>
          </div>
        )}

        {loadingSuggestions ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-400">
            최근 mismatch 날짜를 확인 중입니다.
          </div>
        ) : recentRecommendations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-400">
            최근 14일 범위에서 추천할 mismatch 날짜가 없습니다.
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap gap-3">
            {recentRecommendations.map((recommendation) => (
              <MismatchDateSuggestionCard
                key={recommendation.gameDate}
                recommendation={recommendation}
                active={selectedSingleDate === recommendation.gameDate}
                onSelect={handleSuggestionSelect}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
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
          label={repairResult?.dryRun ? '예상 복구' : '복구 반영'}
          value={repairResult?.repairedCount ?? 0}
          accentClassName="border-emerald-500/20 bg-emerald-500/10"
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-white">진단 결과</h3>
            <p className="text-sm text-slate-400">
              조회 범위: {formatRangeLabel(startDate, endDate || undefined)}
            </p>
          </div>
          {repairResult && (
            <AdminBadge className={repairResult.dryRun ? 'border-sky-500/30 bg-sky-500/10 text-sky-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}>
              {repairResult.dryRun ? 'dry-run 결과' : '복구 결과 반영'}
            </AdminBadge>
          )}
        </div>

        {mismatchResult && mismatchList.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-400">
            선택한 날짜 범위에서 경기 상태 불일치가 없습니다.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800">
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
                    <TableCell className="font-mono text-xs text-slate-300">{mismatch.gameId}</TableCell>
                    <TableCell className="text-slate-300">{formatTimeLabel(mismatch.startTime)}</TableCell>
                    <TableCell>
                      <AdminBadge className={statusBadgeClassName(mismatch.normalizedRawStatus || mismatch.rawStatus)}>
                        {mismatch.normalizedRawStatus || mismatch.rawStatus || '-'}
                      </AdminBadge>
                    </TableCell>
                    <TableCell>
                      <AdminBadge className={statusBadgeClassName(mismatch.effectiveStatus)}>
                        {mismatch.effectiveStatus}
                      </AdminBadge>
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
        )}
      </section>

      {repairResult && repairResult.repairedGames.length > 0 && (
        <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-white">복구 반영 목록</h3>
              <p className="text-sm text-slate-400">
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
