import { lazy, Suspense } from 'react';

import { FRANCHISE_TEAM_IDS, TEAM_DATA } from '../../constants/teams';
import { cn } from '../../lib/utils';
import type { AdminOffseasonMovement, AdminOffseasonMovementPayload } from '../../types/admin';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  AdminDownloadIcon,
  AdminPlusIcon,
  AdminRefreshIcon,
  AdminUploadIcon,
} from './AdminDetailIcons';
import {
  AdminNewspaperIcon,
  AdminSearchIcon,
} from './AdminPanelIcons';

const ALL_VALUE = 'ALL';

const SECTION_OPTIONS = ['FA', '트레이드', '외국인', '방출/웨이버', '군 관련', '기타'];

const TEAM_OPTIONS = FRANCHISE_TEAM_IDS.map((code) => ({
  code,
  name: TEAM_DATA[code]?.name || code,
  fullName: TEAM_DATA[code]?.fullName || code,
}));

const adminNativeSelectClassName =
  'h-10 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 text-[14px] text-slate-200 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

type CsvImportReport = {
  fileName: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
};

type QualityOption = {
  value: string;
  label: string;
  hint: string;
};

const OffseasonMovementAdminDialogs = lazy(() => import('./OffseasonMovementAdminDialogs'));
const OffseasonMovementAdminResultsRuntime = lazy(() => import('./OffseasonMovementAdminResultsRuntime'));

interface OffseasonMovementAdminPanelContentProps {
  successMessage: string | null;
  error: string | null;
  movements: AdminOffseasonMovement[];
  filteredMovements: AdminOffseasonMovement[];
  loading: boolean;
  importingCsv: boolean;
  submitting: boolean;
  csvReport: CsvImportReport | null;
  search: string;
  sectionFilter: string;
  teamFilter: string;
  fromDate: string;
  toDate: string;
  qualityFilter: string;
  qualityOptions: QualityOption[];
  activeQualityOption: QualityOption;
  qualityCounts: Record<string, number>;
  summaryCount: number;
  detailsCount: number;
  structuredCount: number;
  sourcedCount: number;
  dialogOpen: boolean;
  editingMovement: AdminOffseasonMovement | null;
  deleteTarget: AdminOffseasonMovement | null;
  formData: AdminOffseasonMovementPayload;
  onSearchChange: (value: string) => void;
  onSectionFilterChange: (value: string) => void;
  onTeamFilterChange: (value: string) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onQualityFilterChange: (value: string) => void;
  onRefresh: () => void;
  onDownloadCsvTemplate: () => void;
  onOpenCsvImport: () => void;
  onOpenCreateDialog: () => void;
  onOpenEditDialog: (movement: AdminOffseasonMovement) => void;
  onDeleteTargetChange: (movement: AdminOffseasonMovement | null) => void;
  onDialogClose: () => void;
  onUpdateField: (field: keyof AdminOffseasonMovementPayload, value: string) => void;
  onSubmit: () => void;
  onDelete: () => void;
}

export default function OffseasonMovementAdminPanelContent({
  successMessage,
  error,
  movements,
  filteredMovements,
  loading,
  importingCsv,
  submitting,
  csvReport,
  search,
  sectionFilter,
  teamFilter,
  fromDate,
  toDate,
  qualityFilter,
  qualityOptions,
  activeQualityOption,
  qualityCounts,
  summaryCount,
  detailsCount,
  structuredCount,
  sourcedCount,
  dialogOpen,
  editingMovement,
  deleteTarget,
  formData,
  onSearchChange,
  onSectionFilterChange,
  onTeamFilterChange,
  onFromDateChange,
  onToDateChange,
  onApplyFilters,
  onResetFilters,
  onQualityFilterChange,
  onRefresh,
  onDownloadCsvTemplate,
  onOpenCsvImport,
  onOpenCreateDialog,
  onOpenEditDialog,
  onDeleteTargetChange,
  onDialogClose,
  onUpdateField,
  onSubmit,
  onDelete,
}: OffseasonMovementAdminPanelContentProps) {
  const shouldRenderDialogs = dialogOpen || Boolean(deleteTarget);

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[14px] text-emerald-300">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 p-5 shadow-lg shadow-emerald-500/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <AdminNewspaperIcon className="h-5 w-5 text-emerald-300" />
                스토브리그 이동 관리
              </h3>
              <p className="mt-1 text-[14px] leading-relaxed text-slate-400">
                공개 `/offseason/list`에 노출되는 이동 데이터와 구조화 상세 필드를 여기서 직접 관리합니다.
              </p>
            </div>
            <Button
              type="button"
              onClick={onRefresh}
              data-testid="admin-offseason-refresh"
              disabled={loading}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <AdminRefreshIcon className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-slate-500">Visible Rows</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-white">{filteredMovements.length}</p>
              <p className="mt-1 text-[14px] text-slate-500">원본 조회 결과 {movements.length}건</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-slate-500">Summary Filled</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-emerald-300">{summaryCount}</p>
              <p className="mt-1 text-[14px] text-slate-500">미입력 {qualityCounts.MISSING_SUMMARY}건</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-slate-500">Source Linked</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-sky-300">{sourcedCount}</p>
              <p className="mt-1 text-[14px] text-slate-500">미입력 {qualityCounts.MISSING_SOURCE}건</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-[14px] font-semibold uppercase tracking-[0.18em] text-slate-500">Structured Coverage</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-[14px] font-semibold text-slate-200">구조화 상세 입력</p>
              <p className="mt-2 text-2xl font-black text-violet-300">{structuredCount}</p>
              <p className="mt-1 text-[14px] text-slate-500">계약 기간, 금액, 옵션, 상대 구단, 반대급부 중 1개 이상</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-[14px] font-semibold text-slate-200">운영 메모</p>
              <p className="mt-2 text-[14px] leading-relaxed text-slate-400">
                `summary`는 표와 카드에 노출되고, `details`는 상세 패널 원문 메모로 사용됩니다.
              </p>
              <p className="mt-2 text-[14px] text-slate-500">상세 메모 입력 {detailsCount}건 · 미입력 {qualityCounts.MISSING_DETAILS}건</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_180px_180px_180px_180px_auto]">
          <div className="relative">
            <AdminSearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              data-testid="admin-offseason-search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="선수명, 요약, 계약 조건, 출처 검색"
              className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl"
            />
          </div>
          <select
            data-testid="admin-offseason-section-trigger"
            value={sectionFilter}
            onChange={(event) => onSectionFilterChange(event.target.value)}
            className={adminNativeSelectClassName}
          >
            <option value={ALL_VALUE}>구분 전체</option>
            {SECTION_OPTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          <select
            data-testid="admin-offseason-team-trigger"
            value={teamFilter}
            onChange={(event) => onTeamFilterChange(event.target.value)}
            className={adminNativeSelectClassName}
          >
            <option value={ALL_VALUE}>팀 전체</option>
            {TEAM_OPTIONS.map((team) => (
              <option key={team.code} value={team.code}>
                {team.fullName}
              </option>
            ))}
          </select>
          <Input
            type="date"
            data-testid="admin-offseason-from-date"
            value={fromDate}
            onChange={(event) => onFromDateChange(event.target.value)}
            className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl"
          />
          <Input
            type="date"
            data-testid="admin-offseason-to-date"
            value={toDate}
            onChange={(event) => onToDateChange(event.target.value)}
            className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl"
          />
          <div className="flex gap-2">
            <Button type="button" data-testid="admin-offseason-apply-filters" onClick={onApplyFilters} className="bg-sky-500 text-slate-950 hover:bg-sky-400">
              조회
            </Button>
            <Button type="button" data-testid="admin-offseason-reset-filters" variant="outline" onClick={onResetFilters} className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
              초기화
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
          <p className="text-[14px] text-slate-400">
            조회 결과 <span className="font-semibold text-white">{movements.length}</span>건 중
            품질 보기 <span className="font-semibold text-emerald-300">{activeQualityOption.label}</span> 적용 후
            <span className="ml-1 font-semibold text-white">{filteredMovements.length}</span>건 표시
          </p>
            <p className="mt-1 text-[14px] text-slate-500">{activeQualityOption.hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              data-testid="admin-offseason-download-template"
              onClick={onDownloadCsvTemplate}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <AdminDownloadIcon className="mr-2 h-4 w-4" />
              템플릿 CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              data-testid="admin-offseason-import-csv"
              onClick={onOpenCsvImport}
              disabled={importingCsv}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <AdminUploadIcon className="mr-2 h-4 w-4" />
              {importingCsv ? '업로드 중' : 'CSV 업로드'}
            </Button>
            <Button
              type="button"
              data-testid="admin-offseason-open-create"
              onClick={onOpenCreateDialog}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400"
            >
              <AdminPlusIcon className="mr-2 h-4 w-4" />
              이동 추가
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {qualityOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onQualityFilterChange(option.value)}
                className={cn(
                  'rounded-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800',
                  qualityFilter === option.value && 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15',
                )}
              >
                {option.label}
                <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[12px] font-semibold text-slate-400">
                  {qualityCounts[option.value]}
                </span>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-[14px] text-slate-500">
            날짜, 구분, 팀 조회로 먼저 범위를 좁힌 뒤 품질 보기로 `요약`, `상세 메모`, `출처`, `구조화 상세` 누락 건만 따로 볼 수 있습니다.
            CSV는 `id`를 채우면 수정, 비워두면 신규 등록으로 처리합니다.
          </p>
        </div>
      </div>

      <Suspense
        fallback={(
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          </div>
        )}
      >
        <OffseasonMovementAdminResultsRuntime
          csvReport={csvReport}
          movements={movements}
          filteredMovements={filteredMovements}
          loading={loading}
          activeQualityOption={activeQualityOption}
          onOpenEditDialog={onOpenEditDialog}
          onDeleteTargetChange={onDeleteTargetChange}
        />
      </Suspense>

      {shouldRenderDialogs ? (
        <Suspense fallback={null}>
          <OffseasonMovementAdminDialogs
            dialogOpen={dialogOpen}
            editingMovement={editingMovement}
            deleteTarget={deleteTarget}
            submitting={submitting}
            formData={formData}
            onDialogClose={onDialogClose}
            onDeleteTargetChange={onDeleteTargetChange}
            onUpdateField={onUpdateField}
            onSubmit={onSubmit}
            onDelete={onDelete}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
