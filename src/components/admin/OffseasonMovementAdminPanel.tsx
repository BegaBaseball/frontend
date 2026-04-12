import { lazy, Suspense, type ChangeEvent, useEffect, useRef, useState } from 'react';
import { CalendarDays, Download, Edit3, Link2, Newspaper, Plus, RefreshCw, Search, Trash2, Upload } from 'lucide-react';

import {
  createAdminOffseasonMovement,
  deleteAdminOffseasonMovement,
  fetchAdminOffseasonMovements,
  updateAdminOffseasonMovement,
} from '../../api/admin';
import { FRANCHISE_TEAM_IDS, TEAM_DATA } from '../../constants/teams';
import { cn } from '../../lib/utils';
import { formatDate } from '../../utils/formatters';
import { AdminBadge } from './AdminPanelPrimitives';
import TeamLogo from '../TeamLogo';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import PlainDialog from '../ui/plain-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import type { AdminOffseasonMovement, AdminOffseasonMovementPayload } from '../../types/admin';

const OffseasonMovementAdminPanelContent = lazy(() => import('./OffseasonMovementAdminPanelContent'));

const ALL_VALUE = 'ALL';
const NONE_VALUE = '__NONE__';
const QUALITY_ALL_VALUE = 'ALL';

type QualityFilterValue =
  | typeof QUALITY_ALL_VALUE
  | 'MISSING_ANY'
  | 'MISSING_SUMMARY'
  | 'MISSING_DETAILS'
  | 'MISSING_SOURCE'
  | 'MISSING_STRUCTURED';

type CsvImportReport = {
  fileName: string;
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
};

const SECTION_OPTIONS = ['FA', '트레이드', '외국인', '방출/웨이버', '군 관련', '기타'];

const CSV_TEMPLATE_HEADERS = [
  'id',
  'movementDate',
  'section',
  'teamCode',
  'playerName',
  'summary',
  'details',
  'contractTerm',
  'contractValue',
  'optionDetails',
  'counterpartyTeam',
  'counterpartyDetails',
  'sourceLabel',
  'sourceUrl',
  'announcedAt',
] as const;

const CSV_HEADER_ALIASES: Record<string, (typeof CSV_TEMPLATE_HEADERS)[number]> = {
  id: 'id',
  movementdate: 'movementDate',
  '이동날짜': 'movementDate',
  section: 'section',
  '구분': 'section',
  teamcode: 'teamCode',
  '팀코드': 'teamCode',
  playername: 'playerName',
  '선수명': 'playerName',
  summary: 'summary',
  '요약': 'summary',
  details: 'details',
  detail: 'details',
  '상세메모': 'details',
  '상세내용': 'details',
  contractterm: 'contractTerm',
  '계약기간': 'contractTerm',
  contractvalue: 'contractValue',
  '계약규모': 'contractValue',
  '계약금액': 'contractValue',
  optiondetails: 'optionDetails',
  '옵션': 'optionDetails',
  counterpartyteam: 'counterpartyTeam',
  '상대구단': 'counterpartyTeam',
  counterpartydetails: 'counterpartyDetails',
  '반대급부': 'counterpartyDetails',
  sourcelabel: 'sourceLabel',
  '출처명': 'sourceLabel',
  sourceurl: 'sourceUrl',
  '출처url': 'sourceUrl',
  announcedat: 'announcedAt',
  '발표시각': 'announcedAt',
};

const TEAM_OPTIONS = FRANCHISE_TEAM_IDS.map((code) => ({
  code,
  name: TEAM_DATA[code]?.name || code,
  fullName: TEAM_DATA[code]?.fullName || code,
}));

const getToday = () => new Date().toISOString().slice(0, 10);

const createEmptyPayload = (): AdminOffseasonMovementPayload => ({
  movementDate: getToday(),
  section: 'FA',
  teamCode: TEAM_OPTIONS[0]?.code || 'LG',
  playerName: '',
  summary: '',
  details: '',
  contractTerm: '',
  contractValue: '',
  optionDetails: '',
  counterpartyTeam: '',
  counterpartyDetails: '',
  sourceLabel: '',
  sourceUrl: '',
  announcedAt: '',
});

const toInputDateTime = (value?: string | null) => {
  if (!value) {
    return '';
  }

  return value.slice(0, 16);
};

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

const normalizePayload = (payload: AdminOffseasonMovementPayload): AdminOffseasonMovementPayload => ({
  ...payload,
  movementDate: payload.movementDate.trim(),
  section: payload.section.trim(),
  teamCode: payload.teamCode.trim().toUpperCase(),
  playerName: payload.playerName.trim(),
  summary: payload.summary?.trim() || '',
  details: payload.details?.trim() || '',
  contractTerm: payload.contractTerm?.trim() || '',
  contractValue: payload.contractValue?.trim() || '',
  optionDetails: payload.optionDetails?.trim() || '',
  counterpartyTeam: payload.counterpartyTeam?.trim() || '',
  counterpartyDetails: payload.counterpartyDetails?.trim() || '',
  sourceLabel: payload.sourceLabel?.trim() || '',
  sourceUrl: payload.sourceUrl?.trim() || '',
  announcedAt: payload.announcedAt?.trim() || '',
});

const movementToPayload = (movement: AdminOffseasonMovement): AdminOffseasonMovementPayload => ({
  movementDate: movement.movementDate,
  section: movement.section,
  teamCode: movement.teamCode,
  playerName: movement.playerName,
  summary: movement.summary || '',
  details: movement.details || '',
  contractTerm: movement.contractTerm || '',
  contractValue: movement.contractValue || '',
  optionDetails: movement.optionDetails || '',
  counterpartyTeam: movement.counterpartyTeam || '',
  counterpartyDetails: movement.counterpartyDetails || '',
  sourceLabel: movement.sourceLabel || '',
  sourceUrl: movement.sourceUrl || '',
  announcedAt: toInputDateTime(movement.announcedAt),
});

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

const adminNativeSelectClassName =
  'h-10 w-full rounded-xl border border-slate-700 bg-slate-800/50 px-3 text-[14px] text-slate-200 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

const adminDialogSelectClassName =
  'h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-[14px] text-slate-100 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60';

const hasTextValue = (value?: string | null) => Boolean(value?.trim());

const hasStructuredValue = (movement: AdminOffseasonMovement | AdminOffseasonMovementPayload) =>
  Boolean(
    movement.contractTerm?.trim() ||
      movement.contractValue?.trim() ||
      movement.optionDetails?.trim() ||
      movement.counterpartyTeam?.trim() ||
      movement.counterpartyDetails?.trim()
  );

const hasSourceValue = (movement: AdminOffseasonMovement | AdminOffseasonMovementPayload) =>
  Boolean(movement.sourceLabel?.trim() || movement.sourceUrl?.trim());

const validatePayload = (payload: AdminOffseasonMovementPayload) => {
  if (!payload.movementDate || !payload.section || !payload.teamCode || !payload.playerName.trim()) {
    return '이동 날짜, 구분, 팀 코드, 선수명은 필수입니다.';
  }

  return null;
};

const normalizeCsvHeader = (header: string) => header.replace(/^\ufeff/, '').trim().replace(/[\s_-]+/g, '').toLowerCase();

const parseCsvRows = (text: string) => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentValue += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentValue);
      currentValue = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      currentRow.push(currentValue);
      rows.push(currentRow);
      currentRow = [];
      currentValue = '';

      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      continue;
    }

    currentValue += char;
  }

  if (currentValue.length > 0 || currentRow.length > 0) {
    currentRow.push(currentValue);
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((cell) => cell.trim().length > 0));
};

const readFileAsText = async (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('CSV 파일을 읽지 못했습니다.'));
    reader.readAsText(file, 'utf-8');
  });

const buildCsvTemplate = () => `${CSV_TEMPLATE_HEADERS.join(',')}\n`;

export function OffseasonMovementAdminPanel({ active }: { active: boolean }) {
  const [movements, setMovements] = useState<AdminOffseasonMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [csvReport, setCsvReport] = useState<CsvImportReport | null>(null);
  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState(ALL_VALUE);
  const [teamFilter, setTeamFilter] = useState(ALL_VALUE);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [qualityFilter, setQualityFilter] = useState<QualityFilterValue>(QUALITY_ALL_VALUE);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<AdminOffseasonMovement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOffseasonMovement | null>(null);
  const [formData, setFormData] = useState<AdminOffseasonMovementPayload>(createEmptyPayload);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const loadMovements = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminOffseasonMovements({
        search: search.trim() || undefined,
        section: sectionFilter !== ALL_VALUE ? sectionFilter : undefined,
        teamCode: teamFilter !== ALL_VALUE ? teamFilter : undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setMovements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '스토브리그 이동 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (active) {
      void loadMovements();
    }
  }, [active]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => setSuccessMessage(null), 3000);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  const resetFilters = async () => {
    setSearch('');
    setSectionFilter(ALL_VALUE);
    setTeamFilter(ALL_VALUE);
    setFromDate('');
    setToDate('');
    setQualityFilter(QUALITY_ALL_VALUE);

    setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminOffseasonMovements();
      setMovements(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '스토브리그 이동 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingMovement(null);
    setFormData(createEmptyPayload());
    setDialogOpen(true);
  };

  const openEditDialog = (movement: AdminOffseasonMovement) => {
    setEditingMovement(movement);
    setFormData(movementToPayload(movement));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingMovement(null);
    setFormData(createEmptyPayload());
  };

  const updateField = (field: keyof AdminOffseasonMovementPayload, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    const payload = normalizePayload(formData);
    const validationMessage = validatePayload(payload);

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingMovement) {
        await updateAdminOffseasonMovement(editingMovement.id, payload);
        setSuccessMessage('스토브리그 이동을 수정했습니다.');
      } else {
        await createAdminOffseasonMovement(payload);
        setSuccessMessage('스토브리그 이동을 등록했습니다.');
      }

      setDialogOpen(false);
      setEditingMovement(null);
      setFormData(createEmptyPayload());
      await loadMovements();
    } catch (err) {
      setError(err instanceof Error ? err.message : '스토브리그 이동 저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await deleteAdminOffseasonMovement(deleteTarget.id);
      setSuccessMessage('스토브리그 이동을 삭제했습니다.');
      setDeleteTarget(null);
      await loadMovements();
    } catch (err) {
      setError(err instanceof Error ? err.message : '스토브리그 이동 삭제에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([buildCsvTemplate()], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'offseason-movements-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setImportingCsv(true);
    setError(null);
    setCsvReport(null);

    try {
      const csvText = await readFileAsText(file);
      const rows = parseCsvRows(csvText);

      if (rows.length < 2) {
        throw new Error('헤더와 데이터 행이 포함된 CSV 파일이 필요합니다.');
      }

      const headers = rows[0].map((header) => CSV_HEADER_ALIASES[normalizeCsvHeader(header)] || header.trim());
      const requiredHeaders: Array<keyof AdminOffseasonMovementPayload> = ['movementDate', 'section', 'teamCode', 'playerName'];
      const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

      if (missingHeaders.length > 0) {
        throw new Error(`필수 헤더가 없습니다: ${missingHeaders.join(', ')}`);
      }

      let createdCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];
      const dataRows = rows.slice(1);

      for (let index = 0; index < dataRows.length; index += 1) {
        const row = dataRows[index];
        const rowNumber = index + 2;
        const rowRecord = headers.reduce<Record<string, string>>((acc, header, headerIndex) => {
          acc[header] = row[headerIndex]?.trim() || '';
          return acc;
        }, {});

        const payload = normalizePayload({
          movementDate: rowRecord.movementDate || '',
          section: rowRecord.section || '',
          teamCode: rowRecord.teamCode || '',
          playerName: rowRecord.playerName || '',
          summary: rowRecord.summary || '',
          details: rowRecord.details || '',
          contractTerm: rowRecord.contractTerm || '',
          contractValue: rowRecord.contractValue || '',
          optionDetails: rowRecord.optionDetails || '',
          counterpartyTeam: rowRecord.counterpartyTeam || '',
          counterpartyDetails: rowRecord.counterpartyDetails || '',
          sourceLabel: rowRecord.sourceLabel || '',
          sourceUrl: rowRecord.sourceUrl || '',
          announcedAt: rowRecord.announcedAt || '',
        });
        const validationMessage = validatePayload(payload);

        if (validationMessage) {
          errors.push(`${rowNumber}행: ${validationMessage}`);
          continue;
        }

        try {
          const rowId = rowRecord.id ? Number(rowRecord.id) : null;

          if (rowRecord.id && (!rowId || Number.isNaN(rowId))) {
            throw new Error('id는 숫자여야 합니다.');
          }

          if (rowId) {
            await updateAdminOffseasonMovement(rowId, payload);
            updatedCount += 1;
          } else {
            await createAdminOffseasonMovement(payload);
            createdCount += 1;
          }
        } catch (err) {
          errors.push(`${rowNumber}행: ${err instanceof Error ? err.message : '업로드에 실패했습니다.'}`);
        }
      }

      setCsvReport({
        fileName: file.name,
        totalRows: dataRows.length,
        createdCount,
        updatedCount,
        failedCount: errors.length,
        errors,
      });

      if (createdCount > 0 || updatedCount > 0) {
        setSuccessMessage(`CSV 업로드를 반영했습니다. 등록 ${createdCount}건, 수정 ${updatedCount}건`);
        await loadMovements();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV 업로드에 실패했습니다.');
    } finally {
      setImportingCsv(false);
      event.target.value = '';
    }
  };

  const summaryCount = movements.filter((movement) => hasTextValue(movement.summary)).length;
  const detailsCount = movements.filter((movement) => hasTextValue(movement.details)).length;
  const structuredCount = movements.filter((movement) => hasStructuredValue(movement)).length;
  const sourcedCount = movements.filter((movement) => hasSourceValue(movement)).length;

  const qualityCounts: Record<QualityFilterValue, number> = {
    ALL: movements.length,
    MISSING_ANY: movements.filter(
      (movement) =>
        !hasTextValue(movement.summary) ||
        !hasTextValue(movement.details) ||
        !hasStructuredValue(movement) ||
        !hasSourceValue(movement)
    ).length,
    MISSING_SUMMARY: movements.filter((movement) => !hasTextValue(movement.summary)).length,
    MISSING_DETAILS: movements.filter((movement) => !hasTextValue(movement.details)).length,
    MISSING_SOURCE: movements.filter((movement) => !hasSourceValue(movement)).length,
    MISSING_STRUCTURED: movements.filter((movement) => !hasStructuredValue(movement)).length,
  };

  const qualityOptions: Array<{ value: QualityFilterValue; label: string; hint: string }> = [
    { value: QUALITY_ALL_VALUE, label: '전체', hint: '현재 서버 조회 결과 전체' },
    { value: 'MISSING_ANY', label: '하나라도 누락', hint: 'summary, details, 출처, 구조화 필드 중 1개 이상 비어 있음' },
    { value: 'MISSING_SUMMARY', label: '요약 없음', hint: '목록 한 줄 요약이 비어 있음' },
    { value: 'MISSING_DETAILS', label: '상세 메모 없음', hint: '상세 패널 원문 메모가 비어 있음' },
    { value: 'MISSING_SOURCE', label: '출처 없음', hint: '출처명과 URL이 모두 비어 있음' },
    { value: 'MISSING_STRUCTURED', label: '구조화 상세 없음', hint: '계약/상대 구단/반대급부 구조화 값이 없음' },
  ];

  const filteredMovements = movements.filter((movement) => {
    switch (qualityFilter) {
      case 'MISSING_ANY':
        return (
          !hasTextValue(movement.summary) ||
          !hasTextValue(movement.details) ||
          !hasStructuredValue(movement) ||
          !hasSourceValue(movement)
        );
      case 'MISSING_SUMMARY':
        return !hasTextValue(movement.summary);
      case 'MISSING_DETAILS':
        return !hasTextValue(movement.details);
      case 'MISSING_SOURCE':
        return !hasSourceValue(movement);
      case 'MISSING_STRUCTURED':
        return !hasStructuredValue(movement);
      default:
        return true;
    }
  });

  const activeQualityOption = qualityOptions.find((option) => option.value === qualityFilter) || qualityOptions[0];

  return (
    <>
      <input
        ref={csvInputRef}
        type="file"
        data-testid="admin-offseason-csv-input"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(event) => void handleCsvImport(event)}
      />
      <Suspense
        fallback={(
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">
            스토브리그 관리 패널 로딩 중...
          </div>
        )}
      >
        <OffseasonMovementAdminPanelContent
          successMessage={successMessage}
          error={error}
          movements={movements}
          filteredMovements={filteredMovements}
          loading={loading}
          importingCsv={importingCsv}
          submitting={submitting}
          csvReport={csvReport}
          search={search}
          sectionFilter={sectionFilter}
          teamFilter={teamFilter}
          fromDate={fromDate}
          toDate={toDate}
          qualityFilter={qualityFilter}
          qualityOptions={qualityOptions}
          activeQualityOption={activeQualityOption}
          qualityCounts={qualityCounts}
          summaryCount={summaryCount}
          detailsCount={detailsCount}
          structuredCount={structuredCount}
          sourcedCount={sourcedCount}
          dialogOpen={dialogOpen}
          editingMovement={editingMovement}
          deleteTarget={deleteTarget}
          formData={formData}
          onSearchChange={setSearch}
          onSectionFilterChange={setSectionFilter}
          onTeamFilterChange={setTeamFilter}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onApplyFilters={() => void loadMovements()}
          onResetFilters={() => void resetFilters()}
          onQualityFilterChange={(value) => setQualityFilter(value as QualityFilterValue)}
          onRefresh={() => void loadMovements()}
          onDownloadCsvTemplate={downloadCsvTemplate}
          onOpenCsvImport={() => csvInputRef.current?.click()}
          onOpenCreateDialog={openCreateDialog}
          onOpenEditDialog={openEditDialog}
          onDeleteTargetChange={setDeleteTarget}
          onDialogClose={closeDialog}
          onUpdateField={updateField}
          onSubmit={() => void handleSubmit()}
          onDelete={() => void handleDelete()}
        />
      </Suspense>
    </>
  );
}
