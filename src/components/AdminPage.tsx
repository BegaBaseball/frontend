// AdminPage.tsx - Stadium Night Theme
import { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Search, Users, MessageSquare, Calendar, Trash2, Shield, Activity, TrendingUp, Eye, X, UserCog, MapPin, Pencil, Plus, Bot, Sparkles, ClipboardCopy, RefreshCw, FileSearch, Save, Download, FolderOpen, Newspaper } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import TeamLogo from './TeamLogo';
import { useAdminData } from '../hooks/useAdminData';
import { useAuthProfileSnapshot } from '../store/authStore';
import { TEAM_DATA } from '../constants/teams';
import { formatDate, formatGameDate, getTimeAgo } from '../utils/formatters';
import { OffseasonMovementAdminPanel } from './admin/OffseasonMovementAdminPanel';
import {
  createPlace,
  updatePlace,
  deletePlace,
  draftReleaseDecision,
  evaluateReleaseDecisionDraft,
  fetchReleaseDecisionArtifactDetail,
  fetchReleaseDecisionArtifacts,
  fetchReleaseDecisionEvalCases,
  fetchReleaseDecisionPresets,
  saveReleaseDecisionArtifact,
  Place,
  PlaceFormData,
} from '../api/admin';
import api from '../api/axios';
import type {
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionPreset,
} from '../types/admin';

// ─── Stadium types (mirrors StadiumDto) ──────────────────────────────────────
interface StadiumDto {
  stadiumId: string;
  stadiumName: string;
  team: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
}

// ─── Place form default ───────────────────────────────────────────────────────
const PLACE_CATEGORIES = [
  '음식점',
  '카페',
  '편의점',
  '주차장',
  '대중교통',
  '숙박',
  '관광명소',
  '기타',
];

const emptyForm = (): PlaceFormData => ({
  name: '',
  category: '',
  description: '',
  address: '',
  phone: '',
  lat: 0,
  lng: 0,
  rating: undefined,
  openTime: '',
  closeTime: '',
});

const parseMultilineEntries = (value: string): string[] =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const decisionBadgeClass: Record<'GO' | 'NO_GO' | 'PENDING', string> = {
  GO: 'bg-emerald-500/20 text-emerald-300 border-0',
  NO_GO: 'bg-red-500/20 text-red-300 border-0',
  PENDING: 'bg-amber-500/20 text-amber-300 border-0',
};

const confidenceBadgeClass: Record<'low' | 'medium' | 'high', string> = {
  low: 'bg-slate-700 text-slate-300 border-0',
  medium: 'bg-sky-500/20 text-sky-300 border-0',
  high: 'bg-violet-500/20 text-violet-300 border-0',
};

const evalStatusBadgeClass: Record<'PASS' | 'FAIL', string> = {
  PASS: 'bg-emerald-500/20 text-emerald-300 border-0',
  FAIL: 'bg-red-500/20 text-red-300 border-0',
};

// Animated counter component
function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

// Stat Card Component with glow effect
function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'amber' | 'emerald' | 'sky';
  delay: number;
}) {
  const colorClasses = {
    amber: {
      glow: 'shadow-amber-500/20',
      border: 'border-amber-500/30',
      bg: 'from-amber-500/10 to-amber-600/5',
      icon: 'text-amber-400',
      text: 'text-amber-300',
    },
    emerald: {
      glow: 'shadow-emerald-500/20',
      border: 'border-emerald-500/30',
      bg: 'from-emerald-500/10 to-emerald-600/5',
      icon: 'text-emerald-400',
      text: 'text-emerald-300',
    },
    sky: {
      glow: 'shadow-sky-500/20',
      border: 'border-sky-500/30',
      bg: 'from-sky-500/10 to-sky-600/5',
      icon: 'text-sky-400',
      text: 'text-sky-300',
    },
  };

  const classes = colorClasses[color];

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl border ${classes.border}
        bg-gradient-to-br ${classes.bg} backdrop-blur-sm
        p-6 shadow-2xl ${classes.glow}
        transform transition-all duration-500 hover:scale-[1.02] hover:shadow-3xl
        animate-fade-in-up
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Diamond pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L60 30L30 60L0 30z' fill='%23fff' fill-opacity='0.4'/%3E%3C/svg%3E")`,
          backgroundSize: '30px 30px',
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase mb-2">
            {label}
          </p>
          <p className={`text-4xl font-black ${classes.text} tracking-tight`}>
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-slate-800/50 ${classes.icon}`}>
          <Icon className="w-7 h-7" />
        </div>
      </div>

      {/* Subtle pulse animation */}
      <div
        className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-3xl ${classes.icon} opacity-20`}
      />
    </div>
  );
}

// Pending role change state for the confirmation dialog
interface PendingRoleChange {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

export default function AdminPage() {
  const {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    users,
    posts,
    mates,
    reports,
    reportsLoading,
    reportFilters,
    selectedReportId,
    selectedReportDetail,
    reportDetailLoading,
    stats,
    loading,
    error,
    successMessage,
    updateReportFilters,
    resetReportFilters,
    openReportDetail,
    closeReportDetail,
    handleDeleteUser,
    handleDeletePost,
    handleDeleteMate,
    handleReportAction,
    handleRoleChange,
  } = useAdminData();

  // Determine if the current logged-in user is a SUPER_ADMIN
  const { userId: currentUserId, userRole } = useAuthProfileSnapshot();
  const isSuperAdmin = userRole === 'ROLE_SUPER_ADMIN';

  const [adminMemo, setAdminMemo] = useState('');

  // Role change confirmation dialog state
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [roleChangeReason, setRoleChangeReason] = useState('');

  // ─── Stadium / Place management state ──────────────────────────────────────
  const [stadiums, setStadiums] = useState<StadiumDto[]>([]);
  const [stadiumsLoading, setStadiumsLoading] = useState(false);
  const [selectedStadiumId, setSelectedStadiumId] = useState<string>('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [stadiumError, setStadiumError] = useState<string | null>(null);

  // ─── AI release decision state ───────────────────────────────────────────
  const [releasePresets, setReleasePresets] = useState<ReleaseDecisionPreset[]>([]);
  const [releasePresetsLoading, setReleasePresetsLoading] = useState(false);
  const [releaseSelectedScenario, setReleaseSelectedScenario] = useState('');
  const [releaseTaskPrompt, setReleaseTaskPrompt] = useState('');
  const [releaseSeedPathsInput, setReleaseSeedPathsInput] = useState('');
  const [releaseAllowedRootsInput, setReleaseAllowedRootsInput] = useState('');
  const [releaseDraftResult, setReleaseDraftResult] = useState<ReleaseDecisionDraftResponse | null>(null);
  const [releaseDraftLoading, setReleaseDraftLoading] = useState(false);
  const [releaseDraftError, setReleaseDraftError] = useState<string | null>(null);
  const [releaseCopyState, setReleaseCopyState] = useState<'idle' | 'done' | 'error'>('idle');
  const [releaseEvalCases, setReleaseEvalCases] = useState<ReleaseDecisionEvalCase[]>([]);
  const [releaseEvalCasesLoading, setReleaseEvalCasesLoading] = useState(false);
  const [releaseSelectedCaseId, setReleaseSelectedCaseId] = useState('');
  const [releaseEvaluationResult, setReleaseEvaluationResult] = useState<ReleaseDecisionEvaluateResponse | null>(null);
  const [releaseEvaluationLoading, setReleaseEvaluationLoading] = useState(false);
  const [releaseEvaluationError, setReleaseEvaluationError] = useState<string | null>(null);
  const [releaseArtifacts, setReleaseArtifacts] = useState<ReleaseDecisionArtifactSummary[]>([]);
  const [releaseArtifactsLoading, setReleaseArtifactsLoading] = useState(false);
  const [releaseArtifactsError, setReleaseArtifactsError] = useState<string | null>(null);
  const [releaseLoadedArtifact, setReleaseLoadedArtifact] = useState<ReleaseDecisionArtifactRecord | null>(null);
  const [releaseSaveLoading, setReleaseSaveLoading] = useState(false);
  const [releaseSaveMessage, setReleaseSaveMessage] = useState<string | null>(null);
  const [releaseSaveError, setReleaseSaveError] = useState<string | null>(null);
  const [releaseArtifactAction, setReleaseArtifactAction] = useState<{
    artifactId: string;
    mode: 'load' | 'markdown' | 'json';
  } | null>(null);

  // Dialog state: null = closed, 'create' = adding, Place = editing
  const [placeDialog, setPlaceDialog] = useState<null | 'create' | Place>(null);
  const [placeForm, setPlaceForm] = useState<PlaceFormData>(emptyForm());
  const [placeSubmitting, setPlaceSubmitting] = useState(false);

  // AlertDialog for delete confirmation
  const [deletingPlaceId, setDeletingPlaceId] = useState<number | null>(null);

  const selectedReleasePreset = releasePresets.find((preset) => preset.scenario === releaseSelectedScenario) ?? null;
  const releaseScenarioEvalCases = releaseEvalCases.filter((item) => item.scenario === releaseSelectedScenario);
  const releaseScenarioArtifacts = releaseArtifacts.filter((item) => item.scenario === releaseSelectedScenario);

  // Load stadiums once on mount
  useEffect(() => {
    setStadiumsLoading(true);
    api.get<StadiumDto[]>('/stadiums')
      .then(({ data }) => {
        setStadiums(data);
        if (data.length > 0) setSelectedStadiumId(data[0].stadiumId);
      })
      .catch(() => setStadiumError('구장 목록을 불러올 수 없습니다.'))
      .finally(() => setStadiumsLoading(false));
  }, []);

  // Load places whenever the selected stadium changes
  const loadPlaces = useCallback(async (stadiumId: string) => {
    if (!stadiumId) return;
    setPlacesLoading(true);
    setStadiumError(null);
    try {
      const { data } = await api.get<Place[]>(`/stadiums/${stadiumId}/places`);
      setPlaces(Array.isArray(data) ? data : []);
    } catch {
      setStadiumError('장소 목록을 불러올 수 없습니다.');
    } finally {
      setPlacesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedStadiumId) loadPlaces(selectedStadiumId);
  }, [selectedStadiumId, loadPlaces]);

  const loadReleasePresets = useCallback(async () => {
    setReleasePresetsLoading(true);
    setReleaseDraftError(null);
    try {
      const presets = await fetchReleaseDecisionPresets();
      setReleasePresets(presets);
      if (!releaseSelectedScenario && presets.length > 0) {
        setReleaseSelectedScenario(presets[0].scenario);
        setReleaseTaskPrompt(presets[0].task_prompt);
      }
    } catch (err) {
      setReleaseDraftError(err instanceof Error ? err.message : 'AI 운영 프리셋을 불러오지 못했습니다.');
    } finally {
      setReleasePresetsLoading(false);
    }
  }, [releaseSelectedScenario]);

  const loadReleaseEvalCases = useCallback(async () => {
    setReleaseEvalCasesLoading(true);
    setReleaseEvaluationError(null);
    try {
      const cases = await fetchReleaseDecisionEvalCases();
      setReleaseEvalCases(cases);
    } catch (err) {
      setReleaseEvaluationError(err instanceof Error ? err.message : 'AI 평가 케이스를 불러오지 못했습니다.');
    } finally {
      setReleaseEvalCasesLoading(false);
    }
  }, []);

  const loadReleaseArtifacts = useCallback(async () => {
    setReleaseArtifactsLoading(true);
    setReleaseArtifactsError(null);
    try {
      const artifacts = await fetchReleaseDecisionArtifacts();
      setReleaseArtifacts(artifacts);
    } catch (err) {
      setReleaseArtifactsError(err instanceof Error ? err.message : 'AI 아티팩트 목록을 불러오지 못했습니다.');
    } finally {
      setReleaseArtifactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ai' && releasePresets.length === 0 && !releasePresetsLoading) {
      loadReleasePresets();
    }
    if (activeTab === 'ai' && releaseEvalCases.length === 0 && !releaseEvalCasesLoading) {
      loadReleaseEvalCases();
    }
    if (activeTab === 'ai' && releaseArtifacts.length === 0 && !releaseArtifactsLoading) {
      loadReleaseArtifacts();
    }
  }, [activeTab, loadReleaseArtifacts, loadReleaseEvalCases, loadReleasePresets, releaseArtifacts.length, releaseArtifactsLoading, releaseEvalCases.length, releaseEvalCasesLoading, releasePresets.length, releasePresetsLoading]);

  useEffect(() => {
    if (releaseScenarioEvalCases.length === 0) {
      setReleaseSelectedCaseId('');
      return;
    }
    if (!releaseScenarioEvalCases.some((item) => item.case_id === releaseSelectedCaseId)) {
      setReleaseSelectedCaseId(releaseScenarioEvalCases[0].case_id);
    }
  }, [releaseScenarioEvalCases, releaseSelectedCaseId]);

  const handleReleaseScenarioChange = (scenario: string) => {
    setReleaseSelectedScenario(scenario);
    const nextPreset = releasePresets.find((preset) => preset.scenario === scenario);
    setReleaseTaskPrompt(nextPreset?.task_prompt ?? '');
    setReleaseDraftResult(null);
    setReleaseEvaluationResult(null);
    setReleaseEvaluationError(null);
    setReleaseDraftError(null);
    setReleaseLoadedArtifact(null);
    setReleaseSaveMessage(null);
    setReleaseSaveError(null);
    setReleaseCopyState('idle');
  };

  const handleReleaseDraftGenerate = async () => {
    if (!releaseSelectedScenario) {
      setReleaseDraftError('시나리오를 먼저 선택하세요.');
      return;
    }

    setReleaseDraftLoading(true);
    setReleaseDraftError(null);
    setReleaseCopyState('idle');

    try {
      const result = await draftReleaseDecision({
        scenario: releaseSelectedScenario,
        task_prompt: releaseTaskPrompt.trim() || undefined,
        seed_paths: parseMultilineEntries(releaseSeedPathsInput),
        allowed_roots: parseMultilineEntries(releaseAllowedRootsInput),
      });
      setReleaseDraftResult(result);
      setReleaseEvaluationResult(null);
      setReleaseEvaluationError(null);
      setReleaseLoadedArtifact(null);
      setReleaseSaveMessage(null);
      setReleaseSaveError(null);
    } catch (err) {
      setReleaseDraftError(err instanceof Error ? err.message : 'AI 초안 생성에 실패했습니다.');
    } finally {
      setReleaseDraftLoading(false);
    }
  };

  const handleReleaseMarkdownCopy = async () => {
    if (!releaseDraftResult?.markdown) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('clipboard-unavailable');
      }
      await navigator.clipboard.writeText(releaseDraftResult.markdown);
      setReleaseCopyState('done');
    } catch {
      setReleaseCopyState('error');
    }
  };

  const applyLoadedArtifact = useCallback((artifact: ReleaseDecisionArtifactRecord) => {
    setReleaseSelectedScenario(artifact.scenario);
    setReleaseTaskPrompt(artifact.task_prompt ?? '');
    setReleaseSeedPathsInput(artifact.seed_paths.join('\n'));
    setReleaseAllowedRootsInput(artifact.allowed_roots.join('\n'));
    setReleaseDraftResult({
      result: artifact.draft_response,
      markdown: artifact.markdown,
    });
    setReleaseEvaluationResult(artifact.evaluation ?? null);
    setReleaseLoadedArtifact(artifact);
    setReleaseCopyState('idle');
    setReleaseSaveError(null);
    setReleaseDraftError(null);
  }, []);

  const handleReleaseSave = async () => {
    if (!releaseDraftResult) {
      setReleaseSaveError('저장할 초안을 먼저 생성하세요.');
      return;
    }

    setReleaseSaveLoading(true);
    setReleaseSaveError(null);
    setReleaseSaveMessage(null);

    try {
      const summary = await saveReleaseDecisionArtifact({
        scenario: releaseSelectedScenario,
        task_prompt: releaseTaskPrompt.trim() || undefined,
        seed_paths: parseMultilineEntries(releaseSeedPathsInput),
        allowed_roots: parseMultilineEntries(releaseAllowedRootsInput),
        draft_response: releaseDraftResult.result,
        markdown: releaseDraftResult.markdown,
        evaluation: releaseEvaluationResult ?? null,
      });
      const detail = await fetchReleaseDecisionArtifactDetail(summary.artifact_id);
      applyLoadedArtifact(detail);
      await loadReleaseArtifacts();
      setReleaseSaveMessage(`아티팩트가 저장되었습니다: ${summary.artifact_id}`);
    } catch (err) {
      setReleaseSaveError(err instanceof Error ? err.message : 'AI 아티팩트 저장에 실패했습니다.');
    } finally {
      setReleaseSaveLoading(false);
    }
  };

  const handleReleaseEvaluate = async () => {
    if (!releaseDraftResult?.result?.draft) {
      setReleaseEvaluationError('평가할 초안을 먼저 생성하세요.');
      return;
    }
    if (!releaseSelectedCaseId) {
      setReleaseEvaluationError('평가 케이스를 먼저 선택하세요.');
      return;
    }

    setReleaseEvaluationLoading(true);
    setReleaseEvaluationError(null);

    try {
      const evaluation = await evaluateReleaseDecisionDraft({
        case_id: releaseSelectedCaseId,
        draft: releaseDraftResult.result.draft,
      });
      setReleaseEvaluationResult(evaluation);
    } catch (err) {
      setReleaseEvaluationError(err instanceof Error ? err.message : 'AI 평가 실행에 실패했습니다.');
    } finally {
      setReleaseEvaluationLoading(false);
    }
  };

  const handleReleaseArtifactLoad = async (artifactId: string) => {
    setReleaseArtifactAction({ artifactId, mode: 'load' });
    setReleaseArtifactsError(null);
    try {
      const detail = await fetchReleaseDecisionArtifactDetail(artifactId);
      applyLoadedArtifact(detail);
      setReleaseSaveMessage(`저장된 아티팩트를 불러왔습니다: ${artifactId}`);
      if (detail.evaluation?.case?.case_id) {
        setReleaseSelectedCaseId(detail.evaluation.case.case_id);
      }
    } catch (err) {
      setReleaseArtifactsError(err instanceof Error ? err.message : 'AI 아티팩트 불러오기에 실패했습니다.');
    } finally {
      setReleaseArtifactAction(null);
    }
  };

  const handleReleaseArtifactDownload = async (
    artifactId: string,
    mode: 'markdown' | 'json'
  ) => {
    setReleaseArtifactAction({ artifactId, mode });
    setReleaseArtifactsError(null);
    try {
      const detail = await fetchReleaseDecisionArtifactDetail(artifactId);
      if (mode === 'markdown') {
        downloadTextFile(`${artifactId}.md`, detail.markdown, 'text/markdown;charset=utf-8');
      } else {
        downloadTextFile(
          `${artifactId}.json`,
          `${JSON.stringify(detail, null, 2)}\n`,
          'application/json;charset=utf-8'
        );
      }
    } catch (err) {
      setReleaseArtifactsError(err instanceof Error ? err.message : 'AI 아티팩트 다운로드에 실패했습니다.');
    } finally {
      setReleaseArtifactAction(null);
    }
  };

  // Open create dialog
  const openCreateDialog = () => {
    setPlaceForm(emptyForm());
    setPlaceDialog('create');
  };

  // Open edit dialog
  const openEditDialog = (place: Place) => {
    setPlaceForm({
      name: place.name,
      category: place.category,
      description: place.description ?? '',
      address: place.address ?? '',
      phone: place.phone ?? '',
      lat: place.lat,
      lng: place.lng,
      rating: place.rating,
      openTime: place.openTime ?? '',
      closeTime: place.closeTime ?? '',
    });
    setPlaceDialog(place);
  };

  // Submit create/edit
  const handlePlaceSubmit = async () => {
    if (!selectedStadiumId) return;
    setPlaceSubmitting(true);
    setStadiumError(null);
    try {
      if (placeDialog === 'create') {
        await createPlace(selectedStadiumId, placeForm);
      } else if (placeDialog && typeof placeDialog === 'object') {
        await updatePlace(placeDialog.id, placeForm);
      }
      setPlaceDialog(null);
      await loadPlaces(selectedStadiumId);
    } catch (err) {
      setStadiumError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setPlaceSubmitting(false);
    }
  };

  // Delete place
  const handleDeletePlace = async () => {
    if (deletingPlaceId == null) return;
    setStadiumError(null);
    try {
      await deletePlace(deletingPlaceId);
      setDeletingPlaceId(null);
      await loadPlaces(selectedStadiumId);
    } catch (err) {
      setStadiumError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  useEffect(() => {
    setAdminMemo(selectedReportDetail?.adminMemo || '');
  }, [selectedReportDetail?.id]);

  const reportStatusLabel: Record<string, string> = {
    PENDING: '대기',
    IN_REVIEW: '검토중',
    RESOLVED: '완료',
    CLOSED: '종결',
  };

  const reportStatusClass: Record<string, string> = {
    PENDING: 'bg-amber-500/20 text-amber-300 border-0',
    IN_REVIEW: 'bg-sky-500/20 text-sky-300 border-0',
    RESOLVED: 'bg-emerald-500/20 text-emerald-300 border-0',
    CLOSED: 'bg-slate-700 text-slate-300 border-0',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 admin-page">
      {/* Background gradient mesh */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-radial from-amber-900/20 via-transparent to-transparent" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-radial from-emerald-900/10 via-transparent to-transparent" />

        {/* Stadium field lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" preserveAspectRatio="none">
          <defs>
            <pattern id="diamond-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 0L100 50L50 100L0 50Z" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#diamond-grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10 animate-fade-in-up">
          <div className="flex items-center gap-4 mb-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-white">
                ADMIN <span className="text-amber-400">CONTROL</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                BEGA Platform Management Dashboard
              </p>
            </div>
          </div>

          {/* Live indicator */}
          <div className="flex items-center gap-2 mt-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-wider">
              Live Monitoring
            </span>
          </div>
        </header>

        {/* Alerts */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 backdrop-blur-sm animate-fade-in-up">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {successMessage}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 backdrop-blur-sm animate-fade-in-up">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 rotate-180" />
              {error}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="amber" delay={100} />
          <StatCard icon={MessageSquare} label="Total Posts" value={stats.totalPosts} color="emerald" delay={200} />
          <StatCard icon={Calendar} label="Mate Gatherings" value={stats.totalMates} color="sky" delay={300} />
        </div>

        {/* Main Content Card */}
        <div
          className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm shadow-2xl overflow-hidden animate-fade-in-up"
          style={{ animationDelay: '400ms' }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="border-b border-slate-800 px-6 pt-6">
              <TabsList className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-800/50 p-1 sm:grid-cols-4 xl:grid-cols-7">
                <TabsTrigger
                  value="users"
                  className="rounded-lg data-[state=active]:bg-amber-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25 transition-all duration-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  유저
                </TabsTrigger>
                <TabsTrigger
                  value="posts"
                  className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 transition-all duration-300"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  게시글
                </TabsTrigger>
                <TabsTrigger
                  value="parties"
                  className="rounded-lg data-[state=active]:bg-sky-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/25 transition-all duration-300"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  메이트
                </TabsTrigger>
                <TabsTrigger
                  value="reports"
                  className="rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 transition-all duration-300"
                >
                  <Search className="w-4 h-4 mr-2" />
                  신고
                </TabsTrigger>
                <TabsTrigger
                  value="offseason"
                  className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 transition-all duration-300"
                >
                  <Newspaper className="w-4 h-4 mr-2" />
                  스토브리그
                </TabsTrigger>
                <TabsTrigger
                  value="stadiums"
                  className="rounded-lg data-[state=active]:bg-violet-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/25 transition-all duration-300"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  구장
                </TabsTrigger>
                <TabsTrigger
                  value="ai"
                  className="rounded-lg data-[state=active]:bg-fuchsia-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-lg data-[state=active]:shadow-fuchsia-500/25 transition-all duration-300"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  AI 운영
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Users Tab */}
            <TabsContent value="users" className="p-6">
              <div className="mb-6">
                <div className="relative max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input
                    placeholder="이메일 또는 이름으로 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-xl focus:ring-amber-500 focus:border-amber-500 transition-all"
                  />
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                        <TableHead className="text-slate-400 font-semibold">이메일</TableHead>
                        <TableHead className="text-slate-400 font-semibold">닉네임</TableHead>
                        <TableHead className="text-slate-400 font-semibold">선호 팀</TableHead>
                        <TableHead className="text-slate-400 font-semibold">가입일</TableHead>
                        <TableHead className="text-slate-400 font-semibold">게시글</TableHead>
                        <TableHead className="text-slate-400 font-semibold">역할</TableHead>
                        {isSuperAdmin && (
                          <TableHead className="text-slate-400 font-semibold">
                            <span className="flex items-center gap-1">
                              <UserCog className="w-4 h-4" />
                              역할 변경
                            </span>
                          </TableHead>
                        )}
                        <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={isSuperAdmin ? 9 : 8} className="text-center py-16 text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            유저가 없습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user, index) => (
                          <TableRow
                            key={user.id}
                            className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                            style={{ animationDelay: `${index * 50}ms` }}
                          >
                            <TableCell className="text-slate-300 font-mono text-sm">{user.id}</TableCell>
                            <TableCell className="text-slate-200">{user.email}</TableCell>
                            <TableCell className="text-slate-200 font-medium">{user.name}</TableCell>
                            <TableCell>
                              {user.favoriteTeam ? (
                                <div className="flex items-center gap-2">
                                  <TeamLogo team={user.favoriteTeam} size={24} />
                                  <span className="text-slate-300">{TEAM_DATA[user.favoriteTeam]?.name || user.favoriteTeam}</span>
                                </div>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">{formatDate(user.createdAt)}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-amber-400 font-semibold text-sm">
                                {user.postCount}
                              </span>
                            </TableCell>
                            <TableCell>
                              {user.role === 'ROLE_SUPER_ADMIN' ? (
                                <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white border-0 shadow-lg shadow-purple-500/20">
                                  최고관리자
                                </Badge>
                              ) : user.role === 'ROLE_ADMIN' ? (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg shadow-amber-500/20">
                                  관리자
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-700 text-slate-300 border-0">
                                  일반
                                </Badge>
                              )}
                            </TableCell>
                            {isSuperAdmin && (
                              <TableCell>
                                {/* SUPER_ADMIN 자신의 역할은 변경 불가 */}
                                {user.id === currentUserId || user.role === 'ROLE_SUPER_ADMIN' ? (
                                  <span className="text-slate-600 text-xs">변경 불가</span>
                                ) : (
                                  <Select
                                    value={user.role}
                                    onValueChange={(nextRole: 'ROLE_ADMIN' | 'ROLE_USER') => {
                                      if (nextRole === user.role) return;
                                      setPendingRoleChange({
                                        userId: user.id,
                                        userName: user.name,
                                        userEmail: user.email,
                                        currentRole: user.role,
                                        targetRole: nextRole,
                                      });
                                      setRoleChangeReason('');
                                    }}
                                  >
                                    <SelectTrigger className="w-[120px] bg-slate-800/60 border-slate-700 text-slate-200 text-xs h-8 rounded-lg focus:ring-amber-500 focus:border-amber-500">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                                      <SelectItem value="ROLE_USER" className="text-xs focus:bg-slate-700 focus:text-slate-100">
                                        일반 사용자
                                      </SelectItem>
                                      <SelectItem value="ROLE_ADMIN" className="text-xs focus:bg-slate-700 focus:text-slate-100">
                                        관리자
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              </TableCell>
                            )}
                            <TableCell className="text-right">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                    disabled={user.role === 'ROLE_ADMIN'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-white">유저를 삭제하시겠습니까?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-400">
                                      이 작업은 되돌릴 수 없습니다. 유저의 모든 데이터가 영구적으로 삭제됩니다.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                      취소
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                                    >
                                      삭제
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Posts Tab */}
            <TabsContent value="posts" className="p-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                      <TableHead className="text-slate-400 font-semibold">팀</TableHead>
                      <TableHead className="text-slate-400 font-semibold">내용</TableHead>
                      <TableHead className="text-slate-400 font-semibold">작성자</TableHead>
                      <TableHead className="text-slate-400 font-semibold">작성 시간</TableHead>
                      <TableHead className="text-slate-400 font-semibold">좋아요</TableHead>
                      <TableHead className="text-slate-400 font-semibold">댓글</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {posts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16 text-slate-500">
                          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          게시글이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      posts.map((post, index) => (
                        <TableRow
                          key={post.id}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <TableCell className="text-slate-300 font-mono text-sm">{post.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TeamLogo team={post.team} size={24} />
                              <span className="text-slate-300">{TEAM_DATA[post.team]?.name || post.team}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-200">{post.content?.slice(0, 40) || '-'}</span>
                              {post.isHot && (
                                <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-[10px] px-1.5 py-0 border-0 animate-pulse">
                                  HOT
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">{post.author}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{getTimeAgo(post.createdAt)}</TableCell>
                          <TableCell>
                            <span className="inline-flex items-center gap-1 text-rose-400">
                              <span className="text-lg">♥</span>
                              <span className="font-semibold">{post.likeCount}</span>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-emerald-400 font-semibold text-sm">
                              {post.commentCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">게시글을 삭제하시겠습니까?</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    이 작업은 되돌릴 수 없습니다. 게시글과 모든 댓글이 영구적으로 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                    취소
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePost(post.id)}
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Parties Tab */}
            <TabsContent value="parties" className="p-6">
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                      <TableHead className="text-slate-400 font-semibold">경기</TableHead>
                      <TableHead className="text-slate-400 font-semibold">제목</TableHead>
                      <TableHead className="text-slate-400 font-semibold">호스트</TableHead>
                      <TableHead className="text-slate-400 font-semibold">경기장</TableHead>
                      <TableHead className="text-slate-400 font-semibold">경기일</TableHead>
                      <TableHead className="text-slate-400 font-semibold">인원</TableHead>
                      <TableHead className="text-slate-400 font-semibold">상태</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16 text-slate-500">
                          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          메이트 모임이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      mates.map((mate, index) => (
                        <TableRow
                          key={mate.id}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <TableCell className="text-slate-300 font-mono text-sm">{mate.id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50">
                              <TeamLogo team={mate.homeTeam} size={20} />
                              <span className="text-slate-500 text-xs font-bold">VS</span>
                              <TeamLogo team={mate.awayTeam} size={20} />
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-slate-200 truncate block">{mate.title}</span>
                          </TableCell>
                          <TableCell className="text-slate-300">{mate.hostName}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{mate.stadium}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{formatGameDate(mate.gameDate)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <div className="flex -space-x-1">
                                {[...Array(Math.min(mate.currentMembers, 3))].map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 border-2 border-slate-900 flex items-center justify-center text-[10px] text-white font-bold"
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </div>
                              <span className="text-slate-400 text-sm ml-1">
                                {mate.currentMembers}/{mate.maxMembers}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`border-0 ${mate.status === 'pending'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : mate.status === 'matched'
                                    ? 'bg-sky-500/20 text-sky-400'
                                    : mate.status === 'selling'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-slate-700/50 text-slate-400'
                                }`}
                            >
                              {mate.status === 'pending' && '모집중'}
                              {mate.status === 'matched' && '매칭완료'}
                              {mate.status === 'selling' && '티켓판매'}
                              {mate.status === 'sold' && '판매완료'}
                              {mate.status === 'completed' && '완료'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">
                                    메이트 모임을 삭제하시겠습니까?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    이 작업은 되돌릴 수 없습니다. 모임과 관련된 모든 데이터가 영구적으로 삭제됩니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                                    취소
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteMate(mate.id)}
                                    className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
                                  >
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="p-6">
              <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-2">
                <select
                  value={reportFilters.status}
                  onChange={(e) => updateReportFilters({ status: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="all">상태 전체</option>
                  <option value="PENDING">PENDING</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
                <select
                  value={reportFilters.reason}
                  onChange={(e) => updateReportFilters({ reason: e.target.value })}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200"
                >
                  <option value="all">사유 전체</option>
                  <option value="SPAM">SPAM</option>
                  <option value="INAPPROPRIATE_CONTENT">INAPPROPRIATE_CONTENT</option>
                  <option value="ABUSIVE_LANGUAGE">ABUSIVE_LANGUAGE</option>
                  <option value="ADVERTISEMENT">ADVERTISEMENT</option>
                  <option value="COPYRIGHT_INFRINGEMENT">COPYRIGHT_INFRINGEMENT</option>
                  <option value="FAKE_INFORMATION">FAKE_INFORMATION</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <Input
                  type="date"
                  value={reportFilters.fromDate}
                  onChange={(e) => updateReportFilters({ fromDate: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200"
                />
                <Input
                  type="date"
                  value={reportFilters.toDate}
                  onChange={(e) => updateReportFilters({ toDate: e.target.value })}
                  className="bg-slate-800/50 border-slate-700 text-slate-200"
                />
                <Button
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={resetReportFilters}
                >
                  필터 초기화
                </Button>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                      <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                      <TableHead className="text-slate-400 font-semibold">사유</TableHead>
                      <TableHead className="text-slate-400 font-semibold">상태</TableHead>
                      <TableHead className="text-slate-400 font-semibold">게시물</TableHead>
                      <TableHead className="text-slate-400 font-semibold">신고자</TableHead>
                      <TableHead className="text-slate-400 font-semibold">접수일</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-right">상세/조치</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportsLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                          신고 목록 로딩 중...
                        </TableCell>
                      </TableRow>
                    ) : reports.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16 text-slate-500">
                          신고 케이스가 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reports.map((report) => (
                        <TableRow
                          key={report.id}
                          className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 cursor-pointer"
                          onClick={() => openReportDetail(report.id)}
                        >
                          <TableCell className="text-slate-300 font-mono text-sm">{report.id}</TableCell>
                          <TableCell className="text-slate-300">{report.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge className={reportStatusClass[report.status || ''] || 'bg-slate-700 text-slate-300 border-0'}>
                              {report.status ? (reportStatusLabel[report.status] || report.status) : '대기'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300 max-w-[260px] truncate">{report.postPreview || '-'}</TableCell>
                          <TableCell className="text-slate-300">{report.reporterHandle || '-'}</TableCell>
                          <TableCell className="text-slate-400 text-sm">{getTimeAgo(report.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-300 hover:text-white hover:bg-slate-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openReportDetail(report.id);
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-300 hover:text-red-200 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReportAction(report.id, 'TAKE_DOWN', '정책 위반 게시물 비공개');
                                }}
                              >
                                비공개
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-slate-300 hover:text-white hover:bg-slate-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReportAction(report.id, 'DISMISS', '검토 결과 위반 아님');
                                }}
                              >
                                기각
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="offseason" className="p-6">
              <OffseasonMovementAdminPanel active={activeTab === 'offseason'} />
            </TabsContent>

            {/* ── Stadium / Place Management Tab ───────────────────────── */}
            <TabsContent value="stadiums" className="p-6">

              {/* Error banner */}
              {stadiumError && (
                <div className="mb-4 p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
                  {stadiumError}
                </div>
              )}

              {/* Top toolbar: stadium selector + add button */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="flex-1">
                  <Select
                    value={selectedStadiumId}
                    onValueChange={(val) => setSelectedStadiumId(val)}
                    disabled={stadiumsLoading}
                  >
                    <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-xl focus:ring-violet-500 focus:border-violet-500">
                      <SelectValue placeholder={stadiumsLoading ? '로딩 중...' : '구장을 선택하세요'} />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                      {stadiums.map((s) => (
                        <SelectItem key={s.stadiumId} value={s.stadiumId} className="focus:bg-slate-700">
                          {s.stadiumName}
                          {s.team ? ` (${s.team})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={openCreateDialog}
                  disabled={!selectedStadiumId}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  장소 추가
                </Button>
              </div>

              {/* Places table */}
              {placesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/50">
                        <TableHead className="text-slate-400 font-semibold">ID</TableHead>
                        <TableHead className="text-slate-400 font-semibold">카테고리</TableHead>
                        <TableHead className="text-slate-400 font-semibold">이름</TableHead>
                        <TableHead className="text-slate-400 font-semibold">주소</TableHead>
                        <TableHead className="text-slate-400 font-semibold">전화</TableHead>
                        <TableHead className="text-slate-400 font-semibold">평점</TableHead>
                        <TableHead className="text-slate-400 font-semibold">영업시간</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-right">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {places.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-16 text-slate-500">
                            <MapPin className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            {selectedStadiumId ? '등록된 장소가 없습니다.' : '구장을 먼저 선택하세요.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        places.map((place, index) => (
                          <TableRow
                            key={place.id}
                            className="border-slate-800 hover:bg-slate-800/30 transition-colors duration-200 animate-fade-in-up"
                            style={{ animationDelay: `${index * 40}ms` }}
                          >
                            <TableCell className="text-slate-300 font-mono text-sm">{place.id}</TableCell>
                            <TableCell>
                              <Badge className="bg-violet-500/20 text-violet-300 border-0">
                                {place.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-200 font-medium">{place.name}</TableCell>
                            <TableCell className="text-slate-400 text-sm max-w-[160px] truncate">
                              {place.address || '-'}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">{place.phone || '-'}</TableCell>
                            <TableCell>
                              {place.rating != null ? (
                                <span className="inline-flex items-center gap-1 text-amber-400 font-semibold text-sm">
                                  {place.rating.toFixed(1)}
                                  <span className="text-amber-500/60">★</span>
                                </span>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">
                              {place.openTime && place.closeTime
                                ? `${place.openTime} ~ ${place.closeTime}`
                                : place.openTime || '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Edit button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditDialog(place)}
                                  className="text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                {/* Delete button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeletingPlaceId(place.id)}
                                  className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 className="w-4 h-4" />
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
            </TabsContent>

            <TabsContent value="ai" className="p-6">
              <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="space-y-6">
                  <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-slate-900 to-slate-900 p-5 shadow-lg shadow-fuchsia-500/10">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-fuchsia-300" />
                          릴리즈 결정 초안 생성
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          운영 문서만 읽어 `GO / NO_GO / PENDING` 초안을 만듭니다.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={loadReleasePresets}
                        disabled={releasePresetsLoading}
                        className="text-slate-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
                      >
                        <RefreshCw className={`w-4 h-4 ${releasePresetsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="grid gap-1.5">
                        <label className="text-sm text-slate-400">시나리오</label>
                        <Select
                          value={releaseSelectedScenario}
                          onValueChange={handleReleaseScenarioChange}
                          disabled={releasePresetsLoading || releasePresets.length === 0}
                        >
                          <SelectTrigger className="bg-slate-800/60 border-slate-700 text-slate-100 rounded-xl">
                            <SelectValue placeholder={releasePresetsLoading ? '프리셋 로딩 중...' : '시나리오 선택'} />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                            {releasePresets.map((preset) => (
                              <SelectItem
                                key={preset.scenario}
                                value={preset.scenario}
                                className="focus:bg-slate-700 focus:text-white"
                              >
                                {preset.scenario}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-1.5">
                        <label className="text-sm text-slate-400">작업 프롬프트</label>
                        <Textarea
                          value={releaseTaskPrompt}
                          onChange={(e) => setReleaseTaskPrompt(e.target.value)}
                          rows={5}
                          placeholder="프리셋 프롬프트를 덮어쓸 수 있습니다."
                          className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <label className="text-sm text-slate-400">추가 seed path (줄바꿈)</label>
                        <Textarea
                          value={releaseSeedPathsInput}
                          onChange={(e) => setReleaseSeedPathsInput(e.target.value)}
                          rows={4}
                          placeholder={'docs/qa/custom-note.md\nreports/custom-summary.json'}
                          className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>

                      <div className="grid gap-1.5">
                        <label className="text-sm text-slate-400">추가 allowed root (줄바꿈)</label>
                        <Textarea
                          value={releaseAllowedRootsInput}
                          onChange={(e) => setReleaseAllowedRootsInput(e.target.value)}
                          rows={3}
                          placeholder={'docs/qa\nreports'}
                          className="bg-slate-800/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                        />
                      </div>

                      <Button
                        type="button"
                        onClick={handleReleaseDraftGenerate}
                        disabled={releaseDraftLoading || releasePresetsLoading || !releaseSelectedScenario}
                        className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white hover:from-fuchsia-600 hover:to-pink-700 shadow-lg shadow-fuchsia-500/20"
                      >
                        {releaseDraftLoading ? '초안 생성 중...' : 'AI 초안 생성'}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                    <div className="flex items-center gap-2 text-white">
                      <FileSearch className="w-4 h-4 text-fuchsia-300" />
                      <h4 className="font-medium">현재 프리셋 문서 범위</h4>
                    </div>
                    {selectedReleasePreset ? (
                      <div className="mt-4 space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Seed Paths</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedReleasePreset.seed_paths.map((path) => (
                              <Badge key={path} className="bg-slate-800 text-slate-300 border-slate-700">
                                {path}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Allowed Roots</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {selectedReleasePreset.allowed_roots.map((path) => (
                              <Badge key={path} className="bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/20">
                                {path}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">시나리오를 선택하면 기본 문서 범위가 표시됩니다.</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-white flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-300" />
                          Deterministic Eval
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          현재 초안을 로컬 채점 규칙으로 검증합니다.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={loadReleaseEvalCases}
                        disabled={releaseEvalCasesLoading}
                        className="text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                      >
                        <RefreshCw className={`w-4 h-4 ${releaseEvalCasesLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="grid gap-1.5">
                        <label className="text-sm text-slate-400">평가 케이스</label>
                        <Select
                          value={releaseSelectedCaseId}
                          onValueChange={(value) => {
                            setReleaseSelectedCaseId(value);
                            setReleaseEvaluationResult(null);
                            setReleaseEvaluationError(null);
                          }}
                          disabled={releaseEvalCasesLoading || releaseScenarioEvalCases.length === 0}
                        >
                          <SelectTrigger className="bg-slate-800/60 border-slate-700 text-slate-100 rounded-xl">
                            <SelectValue
                              placeholder={
                                releaseEvalCasesLoading
                                  ? '평가 케이스 로딩 중...'
                                  : releaseScenarioEvalCases.length === 0
                                    ? '시나리오용 케이스 없음'
                                    : '평가 케이스 선택'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                            {releaseScenarioEvalCases.map((item) => (
                              <SelectItem
                                key={item.case_id}
                                value={item.case_id}
                                className="focus:bg-slate-700 focus:text-white"
                              >
                                {item.case_id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {releaseSelectedCaseId && (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Expected Decision</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Badge className={decisionBadgeClass[releaseScenarioEvalCases.find((item) => item.case_id === releaseSelectedCaseId)?.expected_decision ?? 'PENDING']}>
                              {releaseScenarioEvalCases.find((item) => item.case_id === releaseSelectedCaseId)?.expected_decision}
                            </Badge>
                          </div>
                          <p className="mt-4 text-xs uppercase tracking-wide text-slate-500">Required Keywords</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(releaseScenarioEvalCases.find((item) => item.case_id === releaseSelectedCaseId)?.required_keywords ?? []).map((item) => (
                              <Badge key={item} className="bg-slate-800 text-slate-300 border-slate-700">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button
                        type="button"
                        onClick={handleReleaseEvaluate}
                        disabled={releaseEvaluationLoading || !releaseDraftResult || !releaseSelectedCaseId}
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/20"
                      >
                        {releaseEvaluationLoading ? '평가 실행 중...' : '현재 초안 평가'}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-medium text-white flex items-center gap-2">
                          <Save className="w-4 h-4 text-sky-300" />
                          저장된 아티팩트
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          현재 시나리오 기준으로 수동 저장한 초안 이력입니다.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={loadReleaseArtifacts}
                        disabled={releaseArtifactsLoading}
                        className="text-slate-300 hover:bg-sky-500/10 hover:text-sky-200"
                      >
                        <RefreshCw className={`w-4 h-4 ${releaseArtifactsLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {releaseArtifactsLoading ? (
                        <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-sm text-slate-500">
                          저장된 아티팩트 목록을 불러오는 중입니다.
                        </div>
                      ) : releaseScenarioArtifacts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/70 px-4 py-5 text-sm text-slate-500">
                          현재 시나리오에 저장된 아티팩트가 없습니다.
                        </div>
                      ) : (
                        releaseScenarioArtifacts.map((artifact) => {
                          const isBusy = releaseArtifactAction?.artifactId === artifact.artifact_id;
                          const isLoaded = releaseLoadedArtifact?.artifact_id === artifact.artifact_id;
                          return (
                            <div
                              key={artifact.artifact_id}
                              className={`rounded-xl border px-4 py-4 ${isLoaded ? 'border-sky-500/30 bg-sky-500/5' : 'border-slate-800 bg-slate-950/70'}`}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={decisionBadgeClass[artifact.decision]}>
                                  {artifact.decision}
                                </Badge>
                                {artifact.eval_status ? (
                                  <Badge className={evalStatusBadgeClass[artifact.eval_status]}>
                                    {artifact.eval_status}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-700 text-slate-300 border-0">
                                    eval 없음
                                  </Badge>
                                )}
                                <span className="text-xs text-slate-500">
                                  {new Date(artifact.saved_at_utc).toLocaleString('ko-KR')}
                                </span>
                              </div>
                              <p className="mt-2 break-all text-sm font-medium text-white">{artifact.artifact_id}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleReleaseArtifactLoad(artifact.artifact_id)}
                                  disabled={isBusy}
                                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                >
                                  <FolderOpen className="w-4 h-4 mr-2" />
                                  {isBusy && releaseArtifactAction?.mode === 'load' ? '불러오는 중...' : '불러오기'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleReleaseArtifactDownload(artifact.artifact_id, 'markdown')}
                                  disabled={isBusy}
                                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  MD 다운로드
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleReleaseArtifactDownload(artifact.artifact_id, 'json')}
                                  disabled={isBusy}
                                  className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  JSON 다운로드
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {releaseDraftError && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                      {releaseDraftError}
                    </div>
                  )}
                  {releaseEvaluationError && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                      {releaseEvaluationError}
                    </div>
                  )}
                  {releaseSaveError && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                      {releaseSaveError}
                    </div>
                  )}
                  {releaseArtifactsError && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                      {releaseArtifactsError}
                    </div>
                  )}
                  {releaseSaveMessage && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
                      {releaseSaveMessage}
                    </div>
                  )}

                  {releaseDraftResult ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Decision</p>
                          <div className="mt-3 flex items-center gap-2">
                            <Badge className={decisionBadgeClass[releaseDraftResult.result.draft.decision]}>
                              {releaseDraftResult.result.draft.decision}
                            </Badge>
                            <Badge className={confidenceBadgeClass[releaseDraftResult.result.draft.confidence]}>
                              {releaseDraftResult.result.draft.confidence}
                            </Badge>
                          </div>
                          <p className="mt-4 text-sm text-slate-300">{releaseDraftResult.result.draft.title}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Scenario</p>
                          <p className="mt-3 text-sm font-medium text-white">{releaseDraftResult.result.scenario}</p>
                          <p className="mt-2 text-xs text-slate-500">model: {releaseDraftResult.result.model}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                          <p className="text-xs uppercase tracking-wide text-slate-500">Evidence</p>
                          <p className="mt-3 text-2xl font-semibold text-fuchsia-200">
                            {releaseDraftResult.result.draft.evidence.length}
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            generated: {new Date(releaseDraftResult.result.generated_at_utc).toLocaleString('ko-KR')}
                          </p>
                          {releaseLoadedArtifact?.artifact_id && (
                            <p className="mt-2 break-all text-xs text-sky-300">
                              loaded: {releaseLoadedArtifact.artifact_id}
                            </p>
                          )}
                        </div>
                      </div>

                      {releaseEvaluationResult && (
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <h4 className="text-base font-semibold text-white">Eval Result</h4>
                                <p className="mt-1 text-sm text-slate-500">
                                  case: {releaseEvaluationResult.case.case_id}
                                </p>
                              </div>
                              <Badge className={evalStatusBadgeClass[releaseEvaluationResult.evaluation.status]}>
                                {releaseEvaluationResult.evaluation.status}
                              </Badge>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <Badge className={decisionBadgeClass[releaseEvaluationResult.case.expected_decision]}>
                                expected {releaseEvaluationResult.case.expected_decision}
                              </Badge>
                              <Badge className={releaseEvaluationResult.evaluation.decision_ok ? evalStatusBadgeClass.PASS : evalStatusBadgeClass.FAIL}>
                                decision {releaseEvaluationResult.evaluation.decision_ok ? 'ok' : 'mismatch'}
                              </Badge>
                            </div>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                              <h4 className="text-base font-semibold text-white">Missing Keywords</h4>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(releaseEvaluationResult.evaluation.missing_keywords.length
                                  ? releaseEvaluationResult.evaluation.missing_keywords
                                  : ['없음']).map((item) => (
                                  <Badge
                                    key={item}
                                    className={
                                      item === '없음'
                                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-200 border-red-500/20'
                                    }
                                  >
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                              <h4 className="text-base font-semibold text-white">Missing Sources</h4>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {(releaseEvaluationResult.evaluation.missing_sources.length
                                  ? releaseEvaluationResult.evaluation.missing_sources
                                  : ['없음']).map((item) => (
                                  <Badge
                                    key={item}
                                    className={
                                      item === '없음'
                                        ? 'bg-emerald-500/10 text-emerald-200 border-emerald-500/20'
                                        : 'bg-red-500/10 text-red-200 border-red-500/20'
                                    }
                                  >
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold text-white">Markdown Draft</h4>
                              <p className="mt-1 text-sm text-slate-500">운영 문서에 바로 붙일 수 있는 초안입니다.</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleReleaseMarkdownCopy}
                                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                              >
                                <ClipboardCopy className="w-4 h-4 mr-2" />
                                {releaseCopyState === 'done' ? '복사됨' : releaseCopyState === 'error' ? '복사 실패' : '복사'}
                              </Button>
                              <Button
                                type="button"
                                onClick={handleReleaseSave}
                                disabled={releaseSaveLoading}
                                className="bg-gradient-to-r from-sky-500 to-cyan-600 text-white hover:from-sky-600 hover:to-cyan-700 shadow-lg shadow-sky-500/20"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                {releaseSaveLoading ? '저장 중...' : '저장'}
                              </Button>
                            </div>
                          </div>
                          <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-sm leading-6 text-slate-200">
                            {releaseDraftResult.markdown}
                          </pre>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                            <h4 className="text-base font-semibold text-white">Summary</h4>
                            <p className="mt-3 text-sm leading-6 text-slate-300">
                              {releaseDraftResult.result.draft.summary}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                            <h4 className="text-base font-semibold text-white">Blockers</h4>
                            <div className="mt-3 space-y-2">
                              {(releaseDraftResult.result.draft.blockers.length ? releaseDraftResult.result.draft.blockers : ['없음']).map((item) => (
                                <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                            <h4 className="text-base font-semibold text-white">Next Actions</h4>
                            <div className="mt-3 space-y-2">
                              {(releaseDraftResult.result.draft.next_actions.length ? releaseDraftResult.result.draft.next_actions : ['없음']).map((item) => (
                                <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                        <h4 className="text-base font-semibold text-white">Evidence</h4>
                        <div className="mt-4 grid gap-3">
                          {releaseDraftResult.result.draft.evidence.map((item, index) => (
                            <div key={`${item.source}-${index}`} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-fuchsia-500/10 text-fuchsia-200 border-fuchsia-500/20">
                                  {item.source}
                                </Badge>
                              </div>
                              <p className="mt-3 text-sm font-medium text-white">{item.claim}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-400">{item.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
                      <Bot className="h-12 w-12 text-fuchsia-300" />
                      <h3 className="mt-4 text-lg font-semibold text-white">AI 운영 초안 대기 중</h3>
                      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                        왼쪽에서 시나리오를 선택하고 초안을 생성하면 `GO / NO_GO / PENDING` 결정,
                        근거 문서, 후속 작업이 여기 표시됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

          </Tabs>
        </div>

        {/* ── Place Create / Edit Dialog ────────────────────────────────────── */}
        <Dialog open={placeDialog !== null} onOpenChange={(open) => { if (!open) setPlaceDialog(null); }}>
          <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-violet-400" />
                {placeDialog === 'create' ? '장소 추가' : '장소 수정'}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {placeDialog === 'create'
                  ? `${stadiums.find((s) => s.stadiumId === selectedStadiumId)?.stadiumName ?? ''} 구장에 새 장소를 추가합니다.`
                  : '장소 정보를 수정합니다.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Name */}
              <div className="grid gap-1.5">
                <label className="text-sm text-slate-400">이름 *</label>
                <Input
                  value={placeForm.name}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="장소 이름"
                  className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                />
              </div>

              {/* Category */}
              <div className="grid gap-1.5">
                <label className="text-sm text-slate-400">카테고리 *</label>
                <Select
                  value={placeForm.category}
                  onValueChange={(val) => setPlaceForm((f) => ({ ...f, category: val }))}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-slate-200 rounded-lg">
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    {PLACE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="focus:bg-slate-700">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="grid gap-1.5">
                <label className="text-sm text-slate-400">설명</label>
                <Input
                  value={placeForm.description ?? ''}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="장소 설명"
                  className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                />
              </div>

              {/* Address */}
              <div className="grid gap-1.5">
                <label className="text-sm text-slate-400">주소</label>
                <Input
                  value={placeForm.address ?? ''}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="도로명 주소"
                  className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                />
              </div>

              {/* Phone */}
              <div className="grid gap-1.5">
                <label className="text-sm text-slate-400">전화번호</label>
                <Input
                  value={placeForm.phone ?? ''}
                  onChange={(e) => setPlaceForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="02-1234-5678"
                  className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                />
              </div>

              {/* Lat / Lng */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-400">위도 *</label>
                  <Input
                    type="number"
                    step="any"
                    value={placeForm.lat}
                    onChange={(e) => setPlaceForm((f) => ({ ...f, lat: parseFloat(e.target.value) || 0 }))}
                    placeholder="37.123456"
                    className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-400">경도 *</label>
                  <Input
                    type="number"
                    step="any"
                    value={placeForm.lng}
                    onChange={(e) => setPlaceForm((f) => ({ ...f, lng: parseFloat(e.target.value) || 0 }))}
                    placeholder="126.987654"
                    className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                  />
                </div>
              </div>

              {/* Rating */}
              <div className="grid gap-1.5">
                <label className="text-sm text-slate-400">평점 (0.0 ~ 5.0)</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={placeForm.rating ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPlaceForm((f) => ({ ...f, rating: v === '' ? undefined : parseFloat(v) }));
                  }}
                  placeholder="4.5"
                  className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                />
              </div>

              {/* Open / Close Time */}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-400">오픈 시간</label>
                  <Input
                    value={placeForm.openTime ?? ''}
                    onChange={(e) => setPlaceForm((f) => ({ ...f, openTime: e.target.value }))}
                    placeholder="09:00"
                    className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                  />
                </div>
                <div className="grid gap-1.5">
                  <label className="text-sm text-slate-400">마감 시간</label>
                  <Input
                    value={placeForm.closeTime ?? ''}
                    onChange={(e) => setPlaceForm((f) => ({ ...f, closeTime: e.target.value }))}
                    placeholder="22:00"
                    className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg"
                  />
                </div>
              </div>
            </div>

            {stadiumError && (
              <p className="text-red-400 text-sm mt-1">{stadiumError}</p>
            )}

            <DialogFooter className="mt-2">
              <Button
                variant="ghost"
                onClick={() => setPlaceDialog(null)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                취소
              </Button>
              <Button
                onClick={handlePlaceSubmit}
                disabled={placeSubmitting || !placeForm.name || !placeForm.category}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25"
              >
                {placeSubmitting ? '저장 중...' : (placeDialog === 'create' ? '추가' : '저장')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Place Delete AlertDialog ──────────────────────────────────────── */}
        <AlertDialog
          open={deletingPlaceId !== null}
          onOpenChange={(open) => { if (!open) setDeletingPlaceId(null); }}
        >
          <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">장소를 삭제하시겠습니까?</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                이 작업은 되돌릴 수 없습니다. 해당 장소 정보가 영구적으로 삭제됩니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePlace}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
              >
                삭제
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {selectedReportId && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={closeReportDetail}
              aria-label="상세 패널 닫기"
            />
            <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto">
              <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">신고 케이스 상세</p>
                  <h2 className="text-lg font-bold text-white">Case #{selectedReportId}</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={closeReportDetail}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-5">
                {reportDetailLoading || !selectedReportDetail ? (
                  <div className="text-slate-400">상세 정보를 불러오는 중...</div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">상태</p>
                        <p className="text-slate-200 mt-1">{selectedReportDetail.status || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">사유</p>
                        <p className="text-slate-200 mt-1">{selectedReportDetail.reason || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">신고자</p>
                        <p className="text-slate-200 mt-1">{selectedReportDetail.reporterHandle || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">처리시각</p>
                        <p className="text-slate-200 mt-1">{selectedReportDetail.handledAt ? getTimeAgo(selectedReportDetail.handledAt) : '-'}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 p-3 text-sm">
                      <p className="text-slate-500 mb-1">게시물 미리보기</p>
                      <p className="text-slate-200 whitespace-pre-wrap">{selectedReportDetail.postPreview || '-'}</p>
                    </div>

                    <div className="rounded-lg border border-slate-800 p-3 text-sm space-y-2">
                      <p><span className="text-slate-500">요청 조치:</span> <span className="text-slate-200">{selectedReportDetail.requestedAction || '-'}</span></p>
                      <p><span className="text-slate-500">Appeal 상태:</span> <span className="text-slate-200">{selectedReportDetail.appealStatus || '-'}</span></p>
                      <p><span className="text-slate-500">Appeal 사유:</span> <span className="text-slate-200">{selectedReportDetail.appealReason || '-'}</span></p>
                      <p><span className="text-slate-500">Appeal 횟수:</span> <span className="text-slate-200">{selectedReportDetail.appealCount ?? 0}</span></p>
                      <p><span className="text-slate-500">증빙 URL:</span> <span className="text-slate-200 break-all">{selectedReportDetail.evidenceUrl || '-'}</span></p>
                    </div>

                    <div className="rounded-lg border border-slate-800 p-3">
                      <p className="text-sm text-slate-500 mb-2">관리자 메모</p>
                      <textarea
                        value={adminMemo}
                        onChange={(e) => setAdminMemo(e.target.value)}
                        className="w-full min-h-24 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                        placeholder="조치 근거를 입력하세요."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleReportAction(selectedReportDetail.id, 'TAKE_DOWN', adminMemo)} className="bg-red-600 hover:bg-red-700 text-white">
                        TAKE_DOWN
                      </Button>
                      <Button onClick={() => handleReportAction(selectedReportDetail.id, 'DISMISS', adminMemo)} className="bg-slate-700 hover:bg-slate-600 text-white">
                        DISMISS
                      </Button>
                      <Button onClick={() => handleReportAction(selectedReportDetail.id, 'RESTORE', adminMemo)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        RESTORE
                      </Button>
                      <Button onClick={() => handleReportAction(selectedReportDetail.id, 'REQUIRE_MODIFICATION', adminMemo)} className="bg-amber-600 hover:bg-amber-700 text-white">
                        REQUIRE_MODIFICATION
                      </Button>
                      <Button onClick={() => handleReportAction(selectedReportDetail.id, 'WARNING', adminMemo)} className="col-span-2 bg-sky-600 hover:bg-sky-700 text-white">
                        WARNING
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Role Change Confirmation Dialog */}
        <AlertDialog
          open={pendingRoleChange !== null}
          onOpenChange={(open) => {
            if (!open) setPendingRoleChange(null);
          }}
        >
          <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white flex items-center gap-2">
                <UserCog className="w-5 h-5 text-amber-400" />
                역할 변경 확인
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 space-y-2">
                <span className="block">
                  <span className="text-slate-200 font-medium">{pendingRoleChange?.userName}</span>
                  {' '}({pendingRoleChange?.userEmail}) 의 역할을 변경합니다.
                </span>
                <span className="flex items-center gap-2 text-sm">
                  <Badge className="bg-slate-700 text-slate-300 border-0 text-xs">
                    {pendingRoleChange?.currentRole === 'ROLE_ADMIN' ? '관리자' : '일반 사용자'}
                  </Badge>
                  <span className="text-slate-500">→</span>
                  <Badge
                    className={
                      pendingRoleChange?.targetRole === 'ROLE_ADMIN'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-xs'
                        : 'bg-slate-700 text-slate-300 border-0 text-xs'
                    }
                  >
                    {pendingRoleChange?.targetRole === 'ROLE_ADMIN' ? '관리자' : '일반 사용자'}
                  </Badge>
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="px-1 pb-2">
              <label className="block text-sm text-slate-400 mb-1">변경 사유 (선택)</label>
              <Input
                placeholder="역할 변경 사유를 입력하세요..."
                value={roleChangeReason}
                onChange={(e) => setRoleChangeReason(e.target.value)}
                className="bg-slate-800/50 border-slate-700 text-slate-100 placeholder:text-slate-500 rounded-lg focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel
                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                onClick={() => setPendingRoleChange(null)}
              >
                취소
              </AlertDialogCancel>
              <AlertDialogAction
                className={
                  pendingRoleChange?.targetRole === 'ROLE_ADMIN'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25'
                    : 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border-0 hover:from-slate-500 hover:to-slate-600'
                }
                onClick={async () => {
                  if (!pendingRoleChange) return;
                  await handleRoleChange(
                    pendingRoleChange.userId,
                    pendingRoleChange.targetRole,
                    roleChangeReason || undefined,
                  );
                  setPendingRoleChange(null);
                  setRoleChangeReason('');
                }}
              >
                {pendingRoleChange?.targetRole === 'ROLE_ADMIN' ? '관리자로 승격' : '일반 사용자로 강등'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Footer */}
        <footer className="mt-10 text-center text-slate-600 text-sm">
          <p>BEGA Platform Admin Dashboard v2.0</p>
        </footer>
      </div>
    </div>
  );
}
