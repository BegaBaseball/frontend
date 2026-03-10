import { type ChangeEvent, useEffect, useRef, useState } from 'react';
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
import TeamLogo from '../TeamLogo';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Textarea } from '../ui/textarea';
import type { AdminOffseasonMovement, AdminOffseasonMovementPayload } from '../../types/admin';

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
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
        <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 p-5 shadow-lg shadow-emerald-500/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Newspaper className="h-5 w-5 text-emerald-300" />
                스토브리그 이동 관리
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">
                공개 `/offseason/list`에 노출되는 이동 데이터와 구조화 상세 필드를 여기서 직접 관리합니다.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void loadMovements()}
              disabled={loading}
              className="bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Visible Rows</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-white">{filteredMovements.length}</p>
              <p className="mt-1 text-xs text-slate-500">원본 조회 결과 {movements.length}건</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Summary Filled</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-emerald-300">{summaryCount}</p>
              <p className="mt-1 text-xs text-slate-500">미입력 {qualityCounts.MISSING_SUMMARY}건</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source Linked</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-sky-300">{sourcedCount}</p>
              <p className="mt-1 text-xs text-slate-500">미입력 {qualityCounts.MISSING_SOURCE}건</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Structured Coverage</p>
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm font-semibold text-slate-200">구조화 상세 입력</p>
              <p className="mt-2 text-2xl font-black text-violet-300">{structuredCount}</p>
              <p className="mt-1 text-xs text-slate-500">계약 기간, 금액, 옵션, 상대 구단, 반대급부 중 1개 이상</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
              <p className="text-sm font-semibold text-slate-200">운영 메모</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                `summary`는 표와 카드에 노출되고, `details`는 상세 패널 원문 메모로 사용됩니다.
              </p>
              <p className="mt-2 text-xs text-slate-500">상세 메모 입력 {detailsCount}건 · 미입력 {qualityCounts.MISSING_DETAILS}건</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_180px_180px_180px_180px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="선수명, 요약, 계약 조건, 출처 검색"
              className="pl-10 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl"
            />
          </div>
          <Select value={sectionFilter} onValueChange={setSectionFilter}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl">
              <SelectValue placeholder="구분 전체" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectItem value={ALL_VALUE}>구분 전체</SelectItem>
              {SECTION_OPTIONS.map((section) => (
                <SelectItem key={section} value={section}>
                  {section}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl">
              <SelectValue placeholder="팀 전체" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectItem value={ALL_VALUE}>팀 전체</SelectItem>
              {TEAM_OPTIONS.map((team) => (
                <SelectItem key={team.code} value={team.code}>
                  {team.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
            className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl"
          />
          <Input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
            className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl"
          />
          <div className="flex gap-2">
            <Button type="button" onClick={() => void loadMovements()} className="bg-sky-500 text-slate-950 hover:bg-sky-400">
              조회
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters} className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
              초기화
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">
              조회 결과 <span className="font-semibold text-white">{movements.length}</span>건 중
              품질 보기 <span className="font-semibold text-emerald-300">{activeQualityOption.label}</span> 적용 후
              <span className="ml-1 font-semibold text-white">{filteredMovements.length}</span>건 표시
            </p>
            <p className="mt-1 text-xs text-slate-500">{activeQualityOption.hint}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => void handleCsvImport(event)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={downloadCsvTemplate}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <Download className="mr-2 h-4 w-4" />
              템플릿 CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => csvInputRef.current?.click()}
              disabled={importingCsv}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importingCsv ? '업로드 중' : 'CSV 업로드'}
            </Button>
            <Button
              type="button"
              onClick={openCreateDialog}
              className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 hover:from-emerald-400 hover:to-cyan-400"
            >
              <Plus className="mr-2 h-4 w-4" />
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
                onClick={() => setQualityFilter(option.value)}
                className={cn(
                  'rounded-full border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800',
                  qualityFilter === option.value && 'border-emerald-400/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15'
                )}
              >
                {option.label}
                <span className="rounded-full bg-slate-950/80 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                  {qualityCounts[option.value]}
                </span>
              </Button>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            날짜, 구분, 팀 조회로 먼저 범위를 좁힌 뒤 품질 보기로 `요약`, `상세 메모`, `출처`, `구조화 상세` 누락 건만 따로 볼 수 있습니다.
            CSV는 `id`를 채우면 수정, 비워두면 신규 등록으로 처리합니다.
          </p>
        </div>
      </div>

      {csvReport && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-sky-200">{csvReport.fileName} 업로드 결과</p>
              <p className="mt-1 text-sm text-slate-300">
                총 {csvReport.totalRows}행 중 등록 {csvReport.createdCount}건, 수정 {csvReport.updatedCount}건,
                실패 {csvReport.failedCount}건
              </p>
            </div>
            <Badge className="border-0 bg-sky-500/15 text-sky-200">CSV Import</Badge>
          </div>
          {csvReport.errors.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Failed Rows</p>
              <div className="mt-2 space-y-1 text-sm text-slate-300">
                {csvReport.errors.slice(0, 5).map((message) => (
                  <p key={message}>{message}</p>
                ))}
                {csvReport.errors.length > 5 && (
                  <p className="text-xs text-slate-500">추가 실패 {csvReport.errors.length - 5}건은 같은 파일을 수정한 뒤 다시 업로드하면 됩니다.</p>
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
                    <CalendarDays className="mx-auto mb-3 h-12 w-12 opacity-30" />
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
                    <TableCell className="text-slate-300 text-sm font-medium">{formatDate(movement.movementDate)}</TableCell>
                    <TableCell>
                      <Badge className={getSectionBadgeClass(movement.section)}>
                        {movement.section}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={TEAM_DATA[movement.teamCode]?.name || movement.teamCode} size={24} />
                        <div>
                          <p className="text-sm font-medium text-slate-100">{TEAM_DATA[movement.teamCode]?.fullName || movement.teamCode}</p>
                          <p className="text-xs text-slate-500">{movement.teamCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-200 font-medium">{movement.playerName}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <div className="space-y-1">
                        <p className="line-clamp-2 text-sm text-slate-300">
                          {movement.summary?.trim() || movement.details?.trim() || '요약 없음'}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {!hasTextValue(movement.summary) && (
                            <Badge className="border-0 bg-amber-500/15 text-[11px] text-amber-200">요약 없음</Badge>
                          )}
                          {!hasTextValue(movement.details) && (
                            <Badge className="border-0 bg-amber-500/15 text-[11px] text-amber-200">상세 메모 없음</Badge>
                          )}
                          {!hasStructuredValue(movement) && (
                            <Badge className="border-0 bg-violet-500/15 text-[11px] text-violet-200">구조화 없음</Badge>
                          )}
                          {!hasSourceValue(movement) && (
                            <Badge className="border-0 bg-sky-500/15 text-[11px] text-sky-200">출처 없음</Badge>
                          )}
                        </div>
                        {movement.details?.trim() && movement.summary?.trim() && movement.details !== movement.summary && (
                          <p className="line-clamp-1 text-xs text-slate-500">{movement.details}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p className="font-medium text-emerald-300">{movement.contractValue || '-'}</p>
                        <p className="text-slate-500">{movement.contractTerm || movement.optionDetails || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <p className="text-slate-200">{movement.sourceLabel || '-'}</p>
                        {movement.sourceUrl ? (
                          <a
                            href={movement.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200"
                          >
                            <Link2 className="h-3 w-3" />
                            원문
                          </a>
                        ) : (
                          <p className="text-xs text-slate-500">링크 없음</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-400">{formatDateTimeLabel(movement.announcedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(movement)}
                          className="text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(movement)}
                          className="text-slate-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingMovement(null);
            setFormData(createEmptyPayload());
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-slate-950 text-slate-100 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingMovement ? '스토브리그 이동 수정' : '스토브리그 이동 추가'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              `summary`는 목록에, `details`는 상세 패널 원문 메모에 노출됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">이동 날짜</p>
                <Input
                  type="date"
                  value={formData.movementDate}
                  onChange={(event) => updateField('movementDate', event.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">구분</p>
                <Select value={formData.section} onValueChange={(value) => updateField('section', value)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    {SECTION_OPTIONS.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">팀 코드</p>
                <Select value={formData.teamCode} onValueChange={(value) => updateField('teamCode', value)}>
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    {TEAM_OPTIONS.map((team) => (
                      <SelectItem key={team.code} value={team.code}>
                        {team.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">선수명</p>
                <Input
                  value={formData.playerName}
                  onChange={(event) => updateField('playerName', event.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  placeholder="예: 홍길동"
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">요약</p>
                <Textarea
                  value={formData.summary}
                  onChange={(event) => updateField('summary', event.target.value)}
                  className="min-h-[96px] bg-slate-900 border-slate-700 text-slate-100"
                  placeholder="예: 4년 총액 80억에 원소속팀 잔류"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">상세 메모</p>
                <Textarea
                  value={formData.details}
                  onChange={(event) => updateField('details', event.target.value)}
                  className="min-h-[96px] bg-slate-900 border-slate-700 text-slate-100"
                  placeholder="계약 조건이나 공시 문구를 조금 더 길게 입력"
                />
              </div>
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">계약 기간</p>
                  <Input
                    value={formData.contractTerm}
                    onChange={(event) => updateField('contractTerm', event.target.value)}
                    className="bg-slate-950 border-slate-700 text-slate-100"
                    placeholder="4년"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">계약 규모</p>
                  <Input
                    value={formData.contractValue}
                    onChange={(event) => updateField('contractValue', event.target.value)}
                    className="bg-slate-950 border-slate-700 text-slate-100"
                    placeholder="4년 80억"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">옵션</p>
                  <Input
                    value={formData.optionDetails}
                    onChange={(event) => updateField('optionDetails', event.target.value)}
                    className="bg-slate-950 border-slate-700 text-slate-100"
                    placeholder="옵션 5억 포함"
                  />
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr_0.8fr_1fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">상대 구단</p>
                <Select
                  value={formData.counterpartyTeam || NONE_VALUE}
                  onValueChange={(value) => updateField('counterpartyTeam', value === NONE_VALUE ? '' : value)}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-slate-100">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectItem value={NONE_VALUE}>없음</SelectItem>
                    {TEAM_OPTIONS.map((team) => (
                      <SelectItem key={team.code} value={team.code}>
                        {team.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">반대급부</p>
                <Input
                  value={formData.counterpartyDetails}
                  onChange={(event) => updateField('counterpartyDetails', event.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  placeholder="예: 보상선수 없음 / 2대1 트레이드"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">출처명</p>
                <Input
                  value={formData.sourceLabel}
                  onChange={(event) => updateField('sourceLabel', event.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  placeholder="구단 발표"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">발표 시각</p>
                <Input
                  type="datetime-local"
                  value={formData.announcedAt}
                  onChange={(event) => updateField('announcedAt', event.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.2fr_1.8fr]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">출처 URL</p>
                <Input
                  value={formData.sourceUrl}
                  onChange={(event) => updateField('sourceUrl', event.target.value)}
                  className="bg-slate-900 border-slate-700 text-slate-100"
                  placeholder="https://..."
                />
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">미리보기</p>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className={getSectionBadgeClass(formData.section)}>{formData.section || '구분 없음'}</Badge>
                    <span className="text-sm text-slate-400">{TEAM_DATA[formData.teamCode]?.fullName || formData.teamCode}</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{formData.playerName || '선수명'}</p>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {formData.summary?.trim() || formData.details?.trim() || '요약을 입력하면 카드와 표에 이렇게 노출됩니다.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              취소
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting} className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              {submitting ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  저장 중
                </>
              ) : (
                <>
                  {editingMovement ? <Edit3 className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                  {editingMovement ? '수정 저장' : '이동 등록'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="border-slate-800 bg-slate-950 text-slate-100">
          <AlertDialogHeader>
            <AlertDialogTitle>스토브리그 이동 삭제</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {deleteTarget
                ? `${deleteTarget.playerName} · ${TEAM_DATA[deleteTarget.teamCode]?.fullName || deleteTarget.teamCode} 이동 정보를 삭제합니다.`
                : '선택한 이동 정보를 삭제합니다.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-500 text-white hover:bg-red-400"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
