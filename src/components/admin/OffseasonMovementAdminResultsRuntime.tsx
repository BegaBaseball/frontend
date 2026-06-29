import { AdminBadge } from './AdminPanelPrimitives';
import { TEAM_DATA } from '../../constants/teams';
import type { AdminOffseasonMovement } from '../../types/admin';
import { formatDate } from '../../utils/formatters';
import { AdminEditIcon, AdminLinkIcon } from './AdminDetailIcons';
import TeamLogo from '../TeamLogo';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
  AdminCalendarIcon,
  AdminTrashIcon,
} from './AdminPanelIcons';

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

const getSectionBadgeClass = (section: string) => {
  if (section.includes('FA')) {
    return 'bg-sky-500/20 text-sky-300 border-0';
  }
  if (section.includes('트레이드')) {
    return 'bg-orange-500/20 text-orange-300 border-0';
  }
  if (section.includes('외국인')) {
    return 'bg-violet-500/20 text-violet-300 border-0';
  }
  if (section.includes('방출') || section.includes('웨이버')) {
    return 'bg-slate-700 text-slate-200 border-0';
  }
  if (section.includes('군')) {
    return 'bg-emerald-500/20 text-emerald-300 border-0';
  }

  return 'bg-slate-700 text-slate-200 border-0';
};

const hasTextValue = (value?: string | null) => Boolean(value?.trim());

const hasStructuredValue = (movement: AdminOffseasonMovement) =>
  Boolean(
    movement.contractTerm?.trim()
      || movement.contractValue?.trim()
      || movement.optionDetails?.trim()
      || movement.counterpartyTeam?.trim()
      || movement.counterpartyDetails?.trim(),
  );

const hasSourceValue = (movement: AdminOffseasonMovement) =>
  Boolean(movement.sourceLabel?.trim() || movement.sourceUrl?.trim());

const formatDateTimeLabel = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const normalized = value.includes('T') ? value : `${value}T00:00`;
  const [datePart, timePart = ''] = normalized.split('T');

  if (!timePart) {
    return formatDate(datePart);
  }

  return `${formatDate(datePart)} ${timePart.slice(0, 5)}`;
};

interface OffseasonMovementAdminResultsRuntimeProps {
  csvReport: CsvImportReport | null;
  movements: AdminOffseasonMovement[];
  filteredMovements: AdminOffseasonMovement[];
  loading: boolean;
  activeQualityOption: QualityOption;
  onOpenEditDialog: (movement: AdminOffseasonMovement) => void;
  onDeleteTargetChange: (movement: AdminOffseasonMovement | null) => void;
}

export default function OffseasonMovementAdminResultsRuntime({
  csvReport,
  movements,
  filteredMovements,
  loading,
  activeQualityOption,
  onOpenEditDialog,
  onDeleteTargetChange,
}: OffseasonMovementAdminResultsRuntimeProps) {
  return (
    <>
      {csvReport && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-caption font-semibold text-sky-200">{csvReport.fileName} 업로드 결과</p>
              <p className="mt-1 text-caption text-slate-300">
                총 {csvReport.totalRows}행 중 등록 {csvReport.createdCount}건, 수정 {csvReport.updatedCount}건,
                실패 {csvReport.failedCount}건
              </p>
            </div>
            <AdminBadge className="border-0 bg-sky-500/15 text-sky-200">CSV Import</AdminBadge>
          </div>
          {csvReport.errors.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <p className="text-caption font-semibold uppercase tracking-[0.18em] text-slate-500">Failed Rows</p>
              <div className="mt-2 space-y-1 text-caption text-slate-300">
                {csvReport.errors.slice(0, 5).map((message) => (
                  <p key={message}>{message}</p>
                ))}
                {csvReport.errors.length > 5 && (
                <p className="text-caption text-slate-500">추가 실패 {csvReport.errors.length - 5}건은 같은 파일을 수정한 뒤 다시 업로드하면 됩니다.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                <TableHead className="text-slate-400 font-semibold">날짜</TableHead>
                <TableHead className="text-slate-400 font-semibold">구분</TableHead>
                <TableHead className="text-slate-400 font-semibold">팀</TableHead>
                <TableHead className="text-slate-400 font-semibold">선수</TableHead>
                <TableHead className="text-slate-400 font-semibold">요약</TableHead>
                <TableHead className="text-slate-400 font-semibold">계약</TableHead>
                <TableHead className="text-slate-400 font-semibold">출처</TableHead>
                <TableHead className="text-slate-400 font-semibold">발표 시각</TableHead>
                <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-16 text-center text-slate-500">
                    <AdminCalendarIcon className="mx-auto mb-3 h-12 w-12 opacity-30" />
                    {movements.length === 0
                      ? '조건에 맞는 스토브리그 이동이 없습니다.'
                      : `${activeQualityOption.label} 조건에 맞는 누락 건이 없습니다.`}
                  </TableCell>
                </TableRow>
              ) : (
                filteredMovements.map((movement, index) => (
                  <TableRow
                    key={movement.id}
                    className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <TableCell className="text-slate-300 text-caption font-semibold">{formatDate(movement.movementDate)}</TableCell>
                    <TableCell>
                      <AdminBadge className={getSectionBadgeClass(movement.section)}>
                        {movement.section}
                      </AdminBadge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={TEAM_DATA[movement.teamCode]?.name || movement.teamCode} size={24} />
                        <div>
                          <p className="text-caption font-semibold text-slate-100">{TEAM_DATA[movement.teamCode]?.fullName || movement.teamCode}</p>
                          <p className="text-caption text-slate-500">{movement.teamCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-caption text-slate-200 font-semibold">{movement.playerName}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="space-y-1">
                        <p className="line-clamp-2 text-caption text-slate-300">
                          {movement.summary?.trim() || movement.details?.trim() || '요약 없음'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {!hasTextValue(movement.summary) && (
                            <AdminBadge className="border-0 bg-amber-500/15 text-12 text-amber-200">요약 없음</AdminBadge>
                          )}
                          {!hasTextValue(movement.details) && (
                            <AdminBadge className="border-0 bg-amber-500/15 text-12 text-amber-200">상세 메모 없음</AdminBadge>
                          )}
                          {!hasStructuredValue(movement) && (
                            <AdminBadge className="border-0 bg-violet-500/15 text-12 text-violet-200">구조화 없음</AdminBadge>
                          )}
                          {!hasSourceValue(movement) && (
                            <AdminBadge className="border-0 bg-sky-500/15 text-12 text-sky-200">출처 없음</AdminBadge>
                          )}
                        </div>
                        {movement.details?.trim() && movement.summary?.trim() && movement.details !== movement.summary && (
                        <p className="line-clamp-1 text-caption text-slate-500">{movement.details}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-caption">
                        <p className="font-semibold text-emerald-300">{movement.contractValue || '-'}</p>
                        <p className="text-slate-500">{movement.contractTerm || movement.optionDetails || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-caption">
                        <p className="text-slate-200">{movement.sourceLabel || '-'}</p>
                        {movement.sourceUrl ? (
                          <a
                            href={movement.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          className="inline-flex items-center gap-1 text-caption text-sky-300 hover:text-sky-200"
                          >
                            <AdminLinkIcon className="h-3 w-3" />
                            원문
                          </a>
                        ) : (
                        <p className="text-caption text-slate-500">링크 없음</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-caption text-slate-400">{formatDateTimeLabel(movement.announcedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`admin-offseason-edit-${movement.id}`}
                          onClick={() => onOpenEditDialog(movement)}
                          className="text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                        >
                          <AdminEditIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`admin-offseason-delete-${movement.id}`}
                          onClick={() => onDeleteTargetChange(movement)}
                          className="text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <AdminTrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
