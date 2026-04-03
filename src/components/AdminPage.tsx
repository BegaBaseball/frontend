// AdminPage.tsx - Stadium Night Theme
import { lazy, Suspense, useState, useEffect, useCallback } from 'react';

import './AdminPage.css';
import { Button } from './ui/button';
import { Search, Users, MessageSquare, Calendar, Shield, Activity, TrendingUp, X, MapPin, Bot, Newspaper, Camera, Bug } from 'lucide-react';
import { useAdminData } from '../hooks/useAdminData';
import { useAuthProfileSnapshot } from '../store/authStore';
import { getTimeAgo } from '../utils/formatters';
import { StatCard } from './admin/StatCard';
import {
  createPlace,
  fetchAdminPlaces,
  fetchAdminStadiums,
  updatePlace,
  deletePlace,
  draftReleaseDecision,
  evaluateReleaseDecisionDraft,
  fetchReleaseDecisionArtifactDetail,
  fetchReleaseDecisionArtifacts,
  fetchReleaseDecisionEvalCases,
  fetchReleaseDecisionPresets,
  saveReleaseDecisionArtifact,
  AdminStadium,
  Place,
  PlaceFormData,
} from '../api/admin';
import type {
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionPreset,
} from '../types/admin';

const UsersAdminPanel = lazy(() =>
  import('./admin/UsersAdminPanel').then((module) => ({ default: module.UsersAdminPanel })),
);
const PostsAdminPanel = lazy(() =>
  import('./admin/PostsAdminPanel').then((module) => ({ default: module.PostsAdminPanel })),
);
const MatesAdminPanel = lazy(() =>
  import('./admin/MatesAdminPanel').then((module) => ({ default: module.MatesAdminPanel })),
);
const OffseasonMovementAdminPanel = lazy(() =>
  import('./admin/OffseasonMovementAdminPanel').then((module) => ({ default: module.OffseasonMovementAdminPanel })),
);
const ClientErrorAdminPanel = lazy(() =>
  import('./admin/ClientErrorAdminPanel').then((module) => ({ default: module.ClientErrorAdminPanel })),
);
const AdminReportsPanel = lazy(() =>
  import('./admin/AdminReportsPanel').then((module) => ({ default: module.AdminReportsPanel })),
);
const AdminSeatViewsPanel = lazy(() =>
  import('./admin/AdminSeatViewsPanel').then((module) => ({ default: module.AdminSeatViewsPanel })),
);
const AdminPlaceDialogContent = lazy(() => import('./admin/AdminPlaceDialogContent'));
const AdminDeletePlaceDialogContent = lazy(() => import('./admin/AdminDeletePlaceDialogContent'));
const AdminRoleChangeDialogContent = lazy(() => import('./admin/AdminRoleChangeDialogContent'));
const AdminStadiumsPanel = lazy(() =>
  import('./admin/AdminStadiumsPanel').then((module) => ({ default: module.AdminStadiumsPanel })),
);
const AdminAiOperationsPanel = lazy(() =>
  import('./admin/AdminAiOperationsPanel').then((module) => ({ default: module.AdminAiOperationsPanel })),
);

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

const adminTabItems = [
  { value: 'users', label: '유저', icon: Users, activeClassName: 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25', testId: 'admin-tab-users' },
  { value: 'posts', label: '게시글', icon: MessageSquare, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' },
  { value: 'parties', label: '메이트', icon: Calendar, activeClassName: 'bg-sky-500 text-slate-900 shadow-lg shadow-sky-500/25' },
  { value: 'reports', label: '신고', icon: Search, activeClassName: 'bg-red-500 text-slate-900 shadow-lg shadow-red-500/25', testId: 'admin-tab-reports' },
  { value: 'clientErrors', label: '클라이언트 에러', icon: Bug, activeClassName: 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-500/25', testId: 'admin-tab-client-errors' },
  { value: 'seatViews', label: '시야뷰', icon: Camera, activeClassName: 'bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/25', testId: 'admin-tab-seat-views' },
  { value: 'offseason', label: '스토브리그', icon: Newspaper, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25', testId: 'admin-tab-offseason' },
  { value: 'stadiums', label: '구장', icon: MapPin, activeClassName: 'bg-violet-500 text-slate-900 shadow-lg shadow-violet-500/25', testId: 'admin-tab-stadiums' },
  { value: 'ai', label: 'AI 운영', icon: Bot, activeClassName: 'bg-fuchsia-500 text-slate-900 shadow-lg shadow-fuchsia-500/25', testId: 'admin-tab-ai' },
] as const;

type AdminTabValue = (typeof adminTabItems)[number]['value'];

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
    seatViews,
    reportsLoading,
    seatViewsLoading,
    reportFilters,
    seatViewFilters,
    selectedReportId,
    selectedReportDetail,
    reportDetailLoading,
    selectedSeatViewId,
    selectedSeatViewDetail,
    seatViewDetailLoading,
    stats,
    loading,
    error,
    successMessage,
    updateReportFilters,
    resetReportFilters,
    updateSeatViewFilters,
    resetSeatViewFilters,
    openReportDetail,
    closeReportDetail,
    openSeatViewDetail,
    closeSeatViewDetail,
    handleDeleteUser,
    handleDeletePost,
    handleDeleteMate,
    handleReportAction,
    handleSeatViewAction,
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
  const [stadiums, setStadiums] = useState<AdminStadium[]>([]);
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
  const activeAdminTab = adminTabItems.some((item) => item.value === activeTab)
    ? activeTab as AdminTabValue
    : 'users';

  // Load stadiums once on mount
  useEffect(() => {
    setStadiumsLoading(true);
    fetchAdminStadiums()
      .then((data) => {
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
      const data = await fetchAdminPlaces(stadiumId);
      setPlaces(data);
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

  const handleReleaseCaseChange = (caseId: string) => {
    setReleaseSelectedCaseId(caseId);
    setReleaseEvaluationResult(null);
    setReleaseEvaluationError(null);
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

  const handleRoleChangeConfirm = async () => {
    if (!pendingRoleChange) {
      return;
    }

    await handleRoleChange(
      pendingRoleChange.userId,
      pendingRoleChange.targetRole,
      roleChangeReason || undefined,
    );
    setPendingRoleChange(null);
    setRoleChangeReason('');
  };

  useEffect(() => {
    setAdminMemo(selectedReportDetail?.adminMemo || '');
  }, [selectedReportDetail?.id]);

  useEffect(() => {
    if (selectedSeatViewDetail) {
      setAdminMemo(selectedSeatViewDetail.adminMemo || '');
    }
  }, [selectedSeatViewDetail]);

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
          <div className="border-b border-slate-800 px-6 pt-6">
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-800/50 p-1 sm:grid-cols-5 xl:grid-cols-9">
              {adminTabItems.map(({ value, label, icon: Icon, activeClassName, testId }) => {
                const isActive = activeAdminTab === value;
                return (
                  <button
                    key={value}
                    type="button"
                    data-testid={testId}
                    aria-pressed={isActive}
                    onClick={() => setActiveTab(value)}
                    className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                      isActive
                        ? activeClassName
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

            {/* Users Tab */}
            {activeAdminTab === 'users' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">유저 관리 로딩 중...</div>}>
                <UsersAdminPanel
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  users={users}
                  loading={loading}
                  isSuperAdmin={isSuperAdmin}
                  currentUserId={currentUserId}
                  handleDeleteUser={handleDeleteUser}
                  setPendingRoleChange={setPendingRoleChange}
                  setRoleChangeReason={setRoleChangeReason}
                />
              </Suspense>
            </div>
            )}

            {/* Posts Tab */}
            {activeAdminTab === 'posts' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">게시글 관리 로딩 중...</div>}>
                <PostsAdminPanel posts={posts} handleDeletePost={handleDeletePost} />
              </Suspense>
            </div>
            )}

            {/* Parties Tab */}
            {activeAdminTab === 'parties' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">메이트 관리 로딩 중...</div>}>
                <MatesAdminPanel mates={mates} handleDeleteMate={handleDeleteMate} />
              </Suspense>
            </div>
            )}

            {activeAdminTab === 'reports' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">신고 관리 로딩 중...</div>}>
                <AdminReportsPanel
                  reportFilters={reportFilters}
                  reportsLoading={reportsLoading}
                  reports={reports}
                  updateReportFilters={updateReportFilters}
                  resetReportFilters={resetReportFilters}
                  openReportDetail={openReportDetail}
                  handleReportAction={handleReportAction}
                />
              </Suspense>
            </div>
            )}

            {activeAdminTab === 'clientErrors' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">클라이언트 에러 관제 로딩 중...</div>}>
                <ClientErrorAdminPanel active />
              </Suspense>
            </div>
            )}

            {activeAdminTab === 'seatViews' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">시야뷰 관리 로딩 중...</div>}>
                <AdminSeatViewsPanel
                  seatViewFilters={seatViewFilters}
                  seatViewsLoading={seatViewsLoading}
                  seatViews={seatViews}
                  updateSeatViewFilters={updateSeatViewFilters}
                  resetSeatViewFilters={resetSeatViewFilters}
                  openSeatViewDetail={openSeatViewDetail}
                  handleSeatViewAction={handleSeatViewAction}
                />
              </Suspense>
            </div>
            )}

            {activeAdminTab === 'offseason' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">스토브리그 관리 로딩 중...</div>}>
                <OffseasonMovementAdminPanel active />
              </Suspense>
            </div>
            )}

            {/* ── Stadium / Place Management Tab ───────────────────────── */}
            {activeAdminTab === 'stadiums' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">구장 관리 로딩 중...</div>}>
                <AdminStadiumsPanel
                  stadiumError={stadiumError}
                  selectedStadiumId={selectedStadiumId}
                  stadiumsLoading={stadiumsLoading}
                  stadiums={stadiums}
                  placesLoading={placesLoading}
                  places={places}
                  setSelectedStadiumId={setSelectedStadiumId}
                  openCreateDialog={openCreateDialog}
                  openEditDialog={openEditDialog}
                  setDeletingPlaceId={setDeletingPlaceId}
                />
              </Suspense>
            </div>
            )}

            {activeAdminTab === 'ai' && (
            <div className="p-6">
              <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">AI 운영 패널 로딩 중...</div>}>
                <AdminAiOperationsPanel
                  selectedReleasePreset={selectedReleasePreset}
                  releaseScenarioEvalCases={releaseScenarioEvalCases}
                  releaseScenarioArtifacts={releaseScenarioArtifacts}
                  releasePresets={releasePresets}
                  releasePresetsLoading={releasePresetsLoading}
                  releaseSelectedScenario={releaseSelectedScenario}
                  releaseTaskPrompt={releaseTaskPrompt}
                  releaseSeedPathsInput={releaseSeedPathsInput}
                  releaseAllowedRootsInput={releaseAllowedRootsInput}
                  releaseDraftResult={releaseDraftResult}
                  releaseDraftLoading={releaseDraftLoading}
                  releaseDraftError={releaseDraftError}
                  releaseCopyState={releaseCopyState}
                  releaseEvalCasesLoading={releaseEvalCasesLoading}
                  releaseSelectedCaseId={releaseSelectedCaseId}
                  releaseEvaluationResult={releaseEvaluationResult}
                  releaseEvaluationLoading={releaseEvaluationLoading}
                  releaseEvaluationError={releaseEvaluationError}
                  releaseArtifactsLoading={releaseArtifactsLoading}
                  releaseArtifactsError={releaseArtifactsError}
                  releaseLoadedArtifact={releaseLoadedArtifact}
                  releaseSaveLoading={releaseSaveLoading}
                  releaseSaveMessage={releaseSaveMessage}
                  releaseSaveError={releaseSaveError}
                  releaseArtifactAction={releaseArtifactAction}
                  setReleaseTaskPrompt={setReleaseTaskPrompt}
                  setReleaseSeedPathsInput={setReleaseSeedPathsInput}
                  setReleaseAllowedRootsInput={setReleaseAllowedRootsInput}
                  loadReleasePresets={loadReleasePresets}
                  handleReleaseScenarioChange={handleReleaseScenarioChange}
                  handleReleaseDraftGenerate={handleReleaseDraftGenerate}
                  loadReleaseEvalCases={loadReleaseEvalCases}
                  handleReleaseCaseChange={handleReleaseCaseChange}
                  handleReleaseEvaluate={handleReleaseEvaluate}
                  loadReleaseArtifacts={loadReleaseArtifacts}
                  handleReleaseArtifactLoad={handleReleaseArtifactLoad}
                  handleReleaseArtifactDownload={handleReleaseArtifactDownload}
                  handleReleaseMarkdownCopy={handleReleaseMarkdownCopy}
                  handleReleaseSave={handleReleaseSave}
                />
              </Suspense>
            </div>
            )}
        </div>

        {placeDialog !== null && (
          <Suspense fallback={null}>
            <AdminPlaceDialogContent
              open
              mode={placeDialog === 'create' ? 'create' : 'edit'}
              stadiumName={stadiums.find((stadium) => stadium.stadiumId === selectedStadiumId)?.stadiumName ?? ''}
              categories={PLACE_CATEGORIES}
              stadiumError={stadiumError}
              placeForm={placeForm}
              setPlaceForm={setPlaceForm}
              placeSubmitting={placeSubmitting}
              onOpenChange={(open) => { if (!open) setPlaceDialog(null); }}
              onSubmit={handlePlaceSubmit}
            />
          </Suspense>
        )}

        {deletingPlaceId !== null && (
          <Suspense fallback={null}>
            <AdminDeletePlaceDialogContent
              open
              onOpenChange={(open) => { if (!open) setDeletingPlaceId(null); }}
              onConfirm={handleDeletePlace}
            />
          </Suspense>
        )}

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

        {selectedSeatViewId && (
          <div className="fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/50"
              onClick={closeSeatViewDetail}
              aria-label="시야뷰 상세 패널 닫기"
            />
            <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-slate-900 border-l border-slate-700 shadow-2xl overflow-y-auto">
              <div className="sticky top-0 z-10 px-5 py-4 border-b border-slate-700 bg-slate-900/95 backdrop-blur flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">시야뷰 후보 상세</p>
                  <h2 className="text-lg font-bold text-white">Seat View #{selectedSeatViewId}</h2>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" onClick={closeSeatViewDetail}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-5 space-y-5">
                {seatViewDetailLoading || !selectedSeatViewDetail ? (
                  <div className="text-slate-400">상세 정보를 불러오는 중...</div>
                ) : (
                  <>
                    <img
                      src={selectedSeatViewDetail.photoUrl}
                      alt="시야뷰 상세"
                      className="w-full rounded-2xl border border-slate-800 object-cover max-h-[320px]"
                    />

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">상태</p>
                        <p className="text-slate-200 mt-1">{selectedSeatViewDetail.moderationStatus || '미제출'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">관리자 라벨</p>
                        <p className="text-slate-200 mt-1">{selectedSeatViewDetail.adminLabel || '-'}</p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">AI 추천</p>
                        <p className="text-slate-200 mt-1">
                          {selectedSeatViewDetail.aiSuggestedLabel || '-'}
                          {selectedSeatViewDetail.aiConfidence != null && ` (${Math.round(selectedSeatViewDetail.aiConfidence * 100)}%)`}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-800 p-3">
                        <p className="text-slate-500">티켓 인증</p>
                        <p className="text-slate-200 mt-1">{selectedSeatViewDetail.ticketVerified ? '완료' : '미인증'}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 p-3 text-sm space-y-2">
                      <p><span className="text-slate-500">구장:</span> <span className="text-slate-200">{selectedSeatViewDetail.stadium}</span></p>
                      <p><span className="text-slate-500">좌석:</span> <span className="text-slate-200">{[selectedSeatViewDetail.section, selectedSeatViewDetail.block, selectedSeatViewDetail.seatRow, selectedSeatViewDetail.seatNumber].filter(Boolean).join(' / ') || '-'}</span></p>
                      <p><span className="text-slate-500">업로드 타입:</span> <span className="text-slate-200">{selectedSeatViewDetail.sourceType}</span></p>
                      <p><span className="text-slate-500">리워드 지급:</span> <span className="text-slate-200">{selectedSeatViewDetail.rewardGranted ? '완료' : '미지급'}</span></p>
                      <p><span className="text-slate-500">AI 사유:</span> <span className="text-slate-200 whitespace-pre-wrap">{selectedSeatViewDetail.aiReason || '-'}</span></p>
                    </div>

                    <div className="rounded-lg border border-slate-800 p-3">
                      <p className="text-sm text-slate-500 mb-2">관리자 메모</p>
                      <textarea
                        value={adminMemo}
                        onChange={(e) => setAdminMemo(e.target.value)}
                        className="w-full min-h-24 rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                        placeholder="분류 근거를 입력하세요."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                          adminLabel: 'SEAT_VIEW',
                          moderationStatus: 'APPROVED',
                          adminMemo,
                        })}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        승인
                      </Button>
                      <Button
                        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                          adminLabel: 'TICKET',
                          moderationStatus: 'REJECTED',
                          adminMemo,
                        })}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        TICKET
                      </Button>
                      <Button
                        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                          adminLabel: 'OTHER',
                          moderationStatus: 'REJECTED',
                          adminMemo,
                        })}
                        className="bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        OTHER
                      </Button>
                      <Button
                        onClick={() => handleSeatViewAction(selectedSeatViewDetail.id, {
                          adminLabel: 'INAPPROPRIATE',
                          moderationStatus: 'REJECTED',
                          adminMemo,
                        })}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        INAPPROPRIATE
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {pendingRoleChange !== null && (
          <Suspense fallback={null}>
            <AdminRoleChangeDialogContent
              open
              pendingRoleChange={pendingRoleChange}
              roleChangeReason={roleChangeReason}
              setRoleChangeReason={setRoleChangeReason}
              onOpenChange={(open) => {
                if (!open) {
                  setPendingRoleChange(null);
                }
              }}
              onConfirm={handleRoleChangeConfirm}
            />
          </Suspense>
        )}

        {/* Footer */}
        <footer className="mt-10 text-center text-slate-600 text-sm">
          <p>BEGA Platform Admin Dashboard v2.0</p>
        </footer>
      </div>
    </div>
  );
}
