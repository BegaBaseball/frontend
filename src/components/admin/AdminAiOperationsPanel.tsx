import { lazy, Suspense } from 'react';

import {
  Activity,
  Bot,
  ClipboardCopy,
  Download,
  FileSearch,
  FolderOpen,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import type {
  AdminCoachAutoBriefOpsHealth,
  AdminCoachAutoBriefOpsWindow,
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionPreset,
} from '../../types/admin';
import {
  AdminBadge,
  adminNativeSelectClassName,
  confidenceBadgeClass,
  decisionBadgeClass,
  evalStatusBadgeClass,
} from './AdminPanelPrimitives';

const AdminCoachAutoBriefOpsPanelRuntime = lazy(() => import('./AdminCoachAutoBriefOpsPanelRuntime'));

interface AdminAiOperationsPanelProps {
  autoBriefOpsPanel: {
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
  };
  selectedReleasePreset: ReleaseDecisionPreset | null;
  releaseScenarioEvalCases: ReleaseDecisionEvalCase[];
  releaseScenarioArtifacts: ReleaseDecisionArtifactSummary[];
  releasePresets: ReleaseDecisionPreset[];
  releasePresetsLoading: boolean;
  releaseSelectedScenario: string;
  releaseTaskPrompt: string;
  releaseSeedPathsInput: string;
  releaseAllowedRootsInput: string;
  releaseDraftResult: ReleaseDecisionDraftResponse | null;
  releaseDraftLoading: boolean;
  releaseDraftError: string | null;
  releaseCopyState: 'idle' | 'done' | 'error';
  releaseEvalCasesLoading: boolean;
  releaseSelectedCaseId: string;
  releaseEvaluationResult: ReleaseDecisionEvaluateResponse | null;
  releaseEvaluationLoading: boolean;
  releaseEvaluationError: string | null;
  releaseArtifactsLoading: boolean;
  releaseArtifactsError: string | null;
  releaseLoadedArtifact: ReleaseDecisionArtifactRecord | null;
  releaseSaveLoading: boolean;
  releaseSaveMessage: string | null;
  releaseSaveError: string | null;
  releaseArtifactAction: {
    artifactId: string;
    mode: 'load' | 'markdown' | 'json';
  } | null;
  setReleaseTaskPrompt: (value: string) => void;
  setReleaseSeedPathsInput: (value: string) => void;
  setReleaseAllowedRootsInput: (value: string) => void;
  loadReleasePresets: () => void | Promise<void>;
  handleReleaseScenarioChange: (scenario: string) => void;
  handleReleaseDraftGenerate: () => void | Promise<void>;
  loadReleaseEvalCases: () => void | Promise<void>;
  handleReleaseCaseChange: (caseId: string) => void;
  handleReleaseEvaluate: () => void | Promise<void>;
  loadReleaseArtifacts: () => void | Promise<void>;
  handleReleaseArtifactLoad: (artifactId: string) => void | Promise<void>;
  handleReleaseArtifactDownload: (
    artifactId: string,
    mode: 'markdown' | 'json'
  ) => void | Promise<void>;
  handleReleaseMarkdownCopy: () => void | Promise<void>;
  handleReleaseSave: () => void | Promise<void>;
}

export function AdminAiOperationsPanel({
  autoBriefOpsPanel,
  selectedReleasePreset,
  releaseScenarioEvalCases,
  releaseScenarioArtifacts,
  releasePresets,
  releasePresetsLoading,
  releaseSelectedScenario,
  releaseTaskPrompt,
  releaseSeedPathsInput,
  releaseAllowedRootsInput,
  releaseDraftResult,
  releaseDraftLoading,
  releaseDraftError,
  releaseCopyState,
  releaseEvalCasesLoading,
  releaseSelectedCaseId,
  releaseEvaluationResult,
  releaseEvaluationLoading,
  releaseEvaluationError,
  releaseArtifactsLoading,
  releaseArtifactsError,
  releaseLoadedArtifact,
  releaseSaveLoading,
  releaseSaveMessage,
  releaseSaveError,
  releaseArtifactAction,
  setReleaseTaskPrompt,
  setReleaseSeedPathsInput,
  setReleaseAllowedRootsInput,
  loadReleasePresets,
  handleReleaseScenarioChange,
  handleReleaseDraftGenerate,
  loadReleaseEvalCases,
  handleReleaseCaseChange,
  handleReleaseEvaluate,
  loadReleaseArtifacts,
  handleReleaseArtifactLoad,
  handleReleaseArtifactDownload,
  handleReleaseMarkdownCopy,
  handleReleaseSave,
}: AdminAiOperationsPanelProps) {
  const selectedEvalCase =
    releaseScenarioEvalCases.find((item) => item.case_id === releaseSelectedCaseId) ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        <Suspense
          fallback={(
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-12 text-center text-sm text-slate-400">
              Coach auto brief ops 패널 로딩 중...
            </div>
          )}
        >
          <AdminCoachAutoBriefOpsPanelRuntime
            {...autoBriefOpsPanel}
          />
        </Suspense>

        <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-500/10 via-slate-900 to-slate-900 p-5 shadow-lg shadow-fuchsia-500/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <Sparkles className="h-5 w-5 text-fuchsia-300" />
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
              data-testid="admin-ai-refresh-presets"
              disabled={releasePresetsLoading}
              className="text-slate-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
            >
              <RefreshCw
                className={`h-4 w-4 ${releasePresetsLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-1.5">
              <label className="text-sm text-slate-400">시나리오</label>
              <select
                data-testid="admin-ai-scenario-trigger"
                value={releaseSelectedScenario}
                onChange={(e) => handleReleaseScenarioChange(e.target.value)}
                disabled={releasePresetsLoading || releasePresets.length === 0}
                className={adminNativeSelectClassName}
              >
                {!releaseSelectedScenario && (
                  <option value="">
                    {releasePresetsLoading ? '프리셋 로딩 중...' : '시나리오 선택'}
                  </option>
                )}
                {releasePresets.map((preset) => (
                  <option key={preset.scenario} value={preset.scenario}>
                    {preset.scenario}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm text-slate-400">작업 프롬프트</label>
              <Textarea
                value={releaseTaskPrompt}
                onChange={(e) => setReleaseTaskPrompt(e.target.value)}
                rows={5}
                placeholder="프리셋 프롬프트를 덮어쓸 수 있습니다."
                className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm text-slate-400">추가 seed path (줄바꿈)</label>
              <Textarea
                value={releaseSeedPathsInput}
                onChange={(e) => setReleaseSeedPathsInput(e.target.value)}
                rows={4}
                placeholder={'docs/qa/custom-note.md\nreports/custom-summary.json'}
                className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm text-slate-400">추가 allowed root (줄바꿈)</label>
              <Textarea
                value={releaseAllowedRootsInput}
                onChange={(e) => setReleaseAllowedRootsInput(e.target.value)}
                rows={3}
                placeholder={'docs/qa\nreports'}
                className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <Button
              type="button"
              onClick={handleReleaseDraftGenerate}
              data-testid="admin-ai-generate-draft"
              disabled={releaseDraftLoading || releasePresetsLoading || !releaseSelectedScenario}
              className="w-full bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-lg shadow-fuchsia-500/20 hover:from-fuchsia-600 hover:to-pink-700"
            >
              {releaseDraftLoading ? '초안 생성 중...' : 'AI 초안 생성'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center gap-2 text-white">
            <FileSearch className="h-4 w-4 text-fuchsia-300" />
            <h4 className="font-semibold">현재 프리셋 문서 범위</h4>
          </div>
          {selectedReleasePreset ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">Seed Paths</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedReleasePreset.seed_paths.map((path) => (
                    <AdminBadge
                      key={path}
                      className="border-slate-700 bg-slate-800 text-slate-300"
                    >
                      {path}
                    </AdminBadge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">Allowed Roots</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedReleasePreset.allowed_roots.map((path) => (
                    <AdminBadge
                      key={path}
                      className="border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200"
                    >
                      {path}
                    </AdminBadge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              시나리오를 선택하면 기본 문서 범위가 표시됩니다.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-white">
                <Activity className="h-4 w-4 text-emerald-300" />
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
              data-testid="admin-ai-refresh-eval-cases"
              disabled={releaseEvalCasesLoading}
              className="text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-200"
            >
              <RefreshCw
                className={`h-4 w-4 ${releaseEvalCasesLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-1.5">
              <label className="text-sm text-slate-400">평가 케이스</label>
              <select
                data-testid="admin-ai-eval-case-trigger"
                value={releaseSelectedCaseId}
                onChange={(e) => handleReleaseCaseChange(e.target.value)}
                disabled={releaseEvalCasesLoading || releaseScenarioEvalCases.length === 0}
                className={adminNativeSelectClassName}
              >
                {!releaseSelectedCaseId && (
                  <option value="">
                    {releaseEvalCasesLoading
                      ? '평가 케이스 로딩 중...'
                      : releaseScenarioEvalCases.length === 0
                        ? '시나리오용 케이스 없음'
                        : '평가 케이스 선택'}
                  </option>
                )}
                {releaseScenarioEvalCases.map((item) => (
                  <option key={item.case_id} value={item.case_id}>
                    {item.case_id}
                  </option>
                ))}
              </select>
            </div>

            {selectedEvalCase && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm uppercase tracking-wide text-slate-500">
                  Expected Decision
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <AdminBadge className={decisionBadgeClass[selectedEvalCase.expected_decision]}>
                    {selectedEvalCase.expected_decision}
                  </AdminBadge>
                </div>
                <p className="mt-4 text-sm uppercase tracking-wide text-slate-500">
                  Required Keywords
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedEvalCase.required_keywords.map((item) => (
                    <AdminBadge
                      key={item}
                      className="border-slate-700 bg-slate-800 text-slate-300"
                    >
                      {item}
                    </AdminBadge>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={handleReleaseEvaluate}
              data-testid="admin-ai-run-eval"
              disabled={releaseEvaluationLoading || !releaseDraftResult || !releaseSelectedCaseId}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
            >
              {releaseEvaluationLoading ? '평가 실행 중...' : '현재 초안 평가'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-white">
                <Save className="h-4 w-4 text-sky-300" />
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
              data-testid="admin-ai-refresh-artifacts"
              disabled={releaseArtifactsLoading}
              className="text-slate-300 hover:bg-sky-500/10 hover:text-sky-200"
            >
              <RefreshCw
                className={`h-4 w-4 ${releaseArtifactsLoading ? 'animate-spin' : ''}`}
              />
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
                    className={`rounded-xl border px-4 py-4 ${
                      isLoaded
                        ? 'border-sky-500/30 bg-sky-500/5'
                        : 'border-slate-800 bg-slate-950/70'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge className={decisionBadgeClass[artifact.decision]}>
                        {artifact.decision}
                      </AdminBadge>
                      {artifact.eval_status ? (
                        <AdminBadge className={evalStatusBadgeClass[artifact.eval_status]}>
                          {artifact.eval_status}
                        </AdminBadge>
                      ) : (
                        <AdminBadge className="border-0 bg-slate-700 text-slate-300">
                          eval 없음
                        </AdminBadge>
                      )}
                      <span className="text-sm text-slate-500">
                        {new Date(artifact.saved_at_utc).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-sm font-semibold text-white">
                      {artifact.artifact_id}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`admin-ai-load-artifact-${artifact.artifact_id}`}
                        onClick={() => handleReleaseArtifactLoad(artifact.artifact_id)}
                        disabled={isBusy}
                        className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {isBusy && releaseArtifactAction?.mode === 'load'
                          ? '불러오는 중...'
                          : '불러오기'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`admin-ai-download-markdown-${artifact.artifact_id}`}
                        onClick={() =>
                          handleReleaseArtifactDownload(artifact.artifact_id, 'markdown')
                        }
                        disabled={isBusy}
                        className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        MD 다운로드
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        data-testid={`admin-ai-download-json-${artifact.artifact_id}`}
                        onClick={() =>
                          handleReleaseArtifactDownload(artifact.artifact_id, 'json')
                        }
                        disabled={isBusy}
                        className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                      >
                        <Download className="mr-2 h-4 w-4" />
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
                <p className="text-sm uppercase tracking-wide text-slate-500">Decision</p>
                <div className="mt-3 flex items-center gap-2">
                  <AdminBadge className={decisionBadgeClass[releaseDraftResult.result.draft.decision]}>
                    {releaseDraftResult.result.draft.decision}
                  </AdminBadge>
                  <AdminBadge className={confidenceBadgeClass[releaseDraftResult.result.draft.confidence]}>
                    {releaseDraftResult.result.draft.confidence}
                  </AdminBadge>
                </div>
                <p className="mt-4 text-sm text-slate-300">
                  {releaseDraftResult.result.draft.title}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-sm uppercase tracking-wide text-slate-500">Scenario</p>
                <p className="mt-3 text-sm font-semibold text-white">
                  {releaseDraftResult.result.scenario}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  model: {releaseDraftResult.result.model}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-sm uppercase tracking-wide text-slate-500">Evidence</p>
                <p className="mt-3 text-2xl font-semibold text-fuchsia-200">
                  {releaseDraftResult.result.draft.evidence.length}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  generated:{' '}
                  {new Date(releaseDraftResult.result.generated_at_utc).toLocaleString('ko-KR')}
                </p>
                {releaseLoadedArtifact?.artifact_id && (
                  <p className="mt-2 break-all text-sm text-sky-300">
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
                    <AdminBadge className={evalStatusBadgeClass[releaseEvaluationResult.evaluation.status]}>
                      {releaseEvaluationResult.evaluation.status}
                    </AdminBadge>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <AdminBadge className={decisionBadgeClass[releaseEvaluationResult.case.expected_decision]}>
                      expected {releaseEvaluationResult.case.expected_decision}
                    </AdminBadge>
                    <AdminBadge
                      className={
                        releaseEvaluationResult.evaluation.decision_ok
                          ? evalStatusBadgeClass.PASS
                          : evalStatusBadgeClass.FAIL
                      }
                    >
                      decision{' '}
                      {releaseEvaluationResult.evaluation.decision_ok ? 'ok' : 'mismatch'}
                    </AdminBadge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                    <h4 className="text-base font-semibold text-white">Missing Keywords</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(releaseEvaluationResult.evaluation.missing_keywords.length
                        ? releaseEvaluationResult.evaluation.missing_keywords
                        : ['없음']).map((item) => (
                        <AdminBadge
                          key={item}
                          className={
                            item === '없음'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                              : 'border-red-500/20 bg-red-500/10 text-red-200'
                          }
                        >
                          {item}
                        </AdminBadge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                    <h4 className="text-base font-semibold text-white">Missing Sources</h4>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(releaseEvaluationResult.evaluation.missing_sources.length
                        ? releaseEvaluationResult.evaluation.missing_sources
                        : ['없음']).map((item) => (
                        <AdminBadge
                          key={item}
                          className={
                            item === '없음'
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                              : 'border-red-500/20 bg-red-500/10 text-red-200'
                          }
                        >
                          {item}
                        </AdminBadge>
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
                    <p className="mt-1 text-sm text-slate-500">
                      운영 문서에 바로 붙일 수 있는 초안입니다.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReleaseMarkdownCopy}
                      className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                    >
                      <ClipboardCopy className="mr-2 h-4 w-4" />
                      {releaseCopyState === 'done'
                        ? '복사됨'
                        : releaseCopyState === 'error'
                          ? '복사 실패'
                          : '복사'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleReleaseSave}
                      disabled={releaseSaveLoading}
                      className="bg-gradient-to-r from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/20 hover:from-sky-600 hover:to-cyan-700"
                    >
                      <Save className="mr-2 h-4 w-4" />
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
                    {(releaseDraftResult.result.draft.blockers.length
                      ? releaseDraftResult.result.draft.blockers
                      : ['없음']).map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                  <h4 className="text-base font-semibold text-white">Next Actions</h4>
                  <div className="mt-3 space-y-2">
                    {(releaseDraftResult.result.draft.next_actions.length
                      ? releaseDraftResult.result.draft.next_actions
                      : ['없음']).map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-300"
                      >
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
                  <div
                    key={`${item.source}-${index}`}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge className="border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200">
                        {item.source}
                      </AdminBadge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-white">{item.claim}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{item.excerpt}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
            <Bot className="h-12 w-12 text-fuchsia-300" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              AI 운영 초안 대기 중
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              왼쪽에서 시나리오를 선택하고 초안을 생성하면 `GO / NO_GO / PENDING`
              결정, 근거 문서, 후속 작업이 여기 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
