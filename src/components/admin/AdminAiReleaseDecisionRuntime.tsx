import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  draftReleaseDecision,
  evaluateReleaseDecisionDraft,
  fetchReleaseDecisionArtifactDetail,
  fetchReleaseDecisionArtifacts,
  fetchReleaseDecisionEvalCases,
  fetchReleaseDecisionPresets,
  saveReleaseDecisionArtifact,
} from '../../api/admin';
import type {
  ReleaseDecisionArtifactRecord,
  ReleaseDecisionArtifactSummary,
  ReleaseDecisionDraftResponse,
  ReleaseDecisionEvalCase,
  ReleaseDecisionEvaluateResponse,
  ReleaseDecisionPreset,
} from '../../types/admin';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  AdminBadge,
  AdminStatusBadge,
  adminNativeSelectClassName,
  confidenceBadgeClass,
} from './AdminPanelPrimitives';
import {
  AdminClipboardIcon,
  AdminDownloadIcon,
  AdminFileSearchIcon,
  AdminFolderOpenIcon,
  AdminRefreshIcon,
  AdminSaveIcon,
  AdminSparklesIcon,
} from './AdminDetailIcons';
import {
  AdminActivityIcon,
  AdminBotIcon,
} from './AdminPanelIcons';

interface AdminAiReleaseDecisionRuntimeProps {
  autoBriefPanel: ReactNode;
}

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

export default function AdminAiReleaseDecisionRuntime({
  autoBriefPanel,
}: AdminAiReleaseDecisionRuntimeProps) {
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
  const [releaseEvaluationResult, setReleaseEvaluationResult] =
    useState<ReleaseDecisionEvaluateResponse | null>(null);
  const [releaseEvaluationLoading, setReleaseEvaluationLoading] = useState(false);
  const [releaseEvaluationError, setReleaseEvaluationError] = useState<string | null>(null);
  const [releaseArtifacts, setReleaseArtifacts] = useState<ReleaseDecisionArtifactSummary[]>([]);
  const [releaseArtifactsLoading, setReleaseArtifactsLoading] = useState(false);
  const [releaseArtifactsError, setReleaseArtifactsError] = useState<string | null>(null);
  const [releaseLoadedArtifact, setReleaseLoadedArtifact] =
    useState<ReleaseDecisionArtifactRecord | null>(null);
  const [releaseSaveLoading, setReleaseSaveLoading] = useState(false);
  const [releaseSaveMessage, setReleaseSaveMessage] = useState<string | null>(null);
  const [releaseSaveError, setReleaseSaveError] = useState<string | null>(null);
  const [releaseArtifactAction, setReleaseArtifactAction] = useState<{
    artifactId: string;
    mode: 'load' | 'markdown' | 'json';
  } | null>(null);

  const selectedReleasePreset = useMemo(
    () => releasePresets.find((preset) => preset.scenario === releaseSelectedScenario) ?? null,
    [releasePresets, releaseSelectedScenario],
  );
  const releaseScenarioEvalCases = useMemo(
    () => releaseEvalCases.filter((item) => item.scenario === releaseSelectedScenario),
    [releaseEvalCases, releaseSelectedScenario],
  );
  const releaseScenarioArtifacts = useMemo(
    () => releaseArtifacts.filter((item) => item.scenario === releaseSelectedScenario),
    [releaseArtifacts, releaseSelectedScenario],
  );
  const selectedEvalCase =
    releaseScenarioEvalCases.find((item) => item.case_id === releaseSelectedCaseId) ?? null;

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
    } catch (error) {
      setReleaseDraftError(
        error instanceof Error ? error.message : 'AI 운영 프리셋을 불러오지 못했습니다.',
      );
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
    } catch (error) {
      setReleaseEvaluationError(
        error instanceof Error ? error.message : 'AI 평가 케이스를 불러오지 못했습니다.',
      );
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
    } catch (error) {
      setReleaseArtifactsError(
        error instanceof Error ? error.message : 'AI 아티팩트 목록을 불러오지 못했습니다.',
      );
    } finally {
      setReleaseArtifactsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (releasePresets.length === 0 && !releasePresetsLoading) {
      void loadReleasePresets();
    }
    if (releaseEvalCases.length === 0 && !releaseEvalCasesLoading) {
      void loadReleaseEvalCases();
    }
    if (releaseArtifacts.length === 0 && !releaseArtifactsLoading) {
      void loadReleaseArtifacts();
    }
  }, [
    loadReleaseArtifacts,
    loadReleaseEvalCases,
    loadReleasePresets,
    releaseArtifacts.length,
    releaseArtifactsLoading,
    releaseEvalCases.length,
    releaseEvalCasesLoading,
    releasePresets.length,
    releasePresetsLoading,
  ]);

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
    } catch (error) {
      setReleaseDraftError(error instanceof Error ? error.message : 'AI 초안 생성에 실패했습니다.');
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
    } catch (error) {
      setReleaseSaveError(error instanceof Error ? error.message : 'AI 아티팩트 저장에 실패했습니다.');
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
    } catch (error) {
      setReleaseEvaluationError(error instanceof Error ? error.message : 'AI 평가 실행에 실패했습니다.');
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
    } catch (error) {
      setReleaseArtifactsError(
        error instanceof Error ? error.message : 'AI 아티팩트 불러오기에 실패했습니다.',
      );
    } finally {
      setReleaseArtifactAction(null);
    }
  };

  const handleReleaseArtifactDownload = async (
    artifactId: string,
    mode: 'markdown' | 'json',
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
          'application/json;charset=utf-8',
        );
      }
    } catch (error) {
      setReleaseArtifactsError(
        error instanceof Error ? error.message : 'AI 아티팩트 다운로드에 실패했습니다.',
      );
    } finally {
      setReleaseArtifactAction(null);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="space-y-6">
        {autoBriefPanel}

        <div className="rounded-2xl border border-amber-500/20 bg-slate-900/90 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
                <AdminSparklesIcon className="h-5 w-5 text-amber-300" />
                릴리즈 결정 초안 생성
              </h3>
              <p className="mt-1 text-caption text-slate-400">
                운영 문서만 읽어 `GO / NO_GO / PENDING` 초안을 만듭니다.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={loadReleasePresets}
              data-testid="admin-ai-refresh-presets"
              disabled={releasePresetsLoading}
              className="text-slate-300 hover:bg-amber-500/10 hover:text-amber-200"
            >
              <AdminRefreshIcon
                className={`h-4 w-4 ${releasePresetsLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid gap-1.5">
              <label className="text-caption text-slate-400">시나리오</label>
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
              <label className="text-caption text-slate-400">작업 프롬프트</label>
              <Textarea
                value={releaseTaskPrompt}
                onChange={(e) => setReleaseTaskPrompt(e.target.value)}
                rows={5}
                placeholder="프리셋 프롬프트를 덮어쓸 수 있습니다."
                className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-caption text-slate-400">추가 seed path (줄바꿈)</label>
              <Textarea
                value={releaseSeedPathsInput}
                onChange={(e) => setReleaseSeedPathsInput(e.target.value)}
                rows={4}
                placeholder={'docs/qa/custom-note.md\nreports/custom-summary.json'}
                className="border-slate-700 bg-slate-800/60 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-caption text-slate-400">추가 allowed root (줄바꿈)</label>
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
              className="w-full bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {releaseDraftLoading ? '초안 생성 중...' : 'AI 초안 생성'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-center gap-2 text-white">
            <AdminFileSearchIcon className="h-4 w-4 text-amber-300" />
            <h4 className="font-semibold">현재 프리셋 문서 범위</h4>
          </div>
          {selectedReleasePreset ? (
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-caption uppercase tracking-wide text-slate-500">Seed Paths</p>
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
                <p className="text-caption uppercase tracking-wide text-slate-500">Allowed Roots</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedReleasePreset.allowed_roots.map((path) => (
                    <AdminBadge
                      key={path}
                      className="border-amber-500/20 bg-amber-500/10 text-amber-200"
                    >
                      {path}
                    </AdminBadge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-caption text-slate-500">
              시나리오를 선택하면 기본 문서 범위가 표시됩니다.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-white">
                <AdminActivityIcon className="h-4 w-4 text-emerald-300" />
                Deterministic Eval
              </h4>
              <p className="mt-1 text-caption text-slate-500">
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
              <AdminRefreshIcon
                className={`h-4 w-4 ${releaseEvalCasesLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-1.5">
              <label className="text-caption text-slate-400">평가 케이스</label>
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
                <p className="text-caption uppercase tracking-wide text-slate-500">
                  Expected Decision
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <AdminStatusBadge status={selectedEvalCase.expected_decision} />
                </div>
                <p className="mt-4 text-caption uppercase tracking-wide text-slate-500">
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
              className="w-full bg-emerald-500 text-slate-950 shadow-sm hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500"
            >
              {releaseEvaluationLoading ? '평가 실행 중...' : '현재 초안 평가'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="flex items-center gap-2 font-semibold text-white">
                <AdminSaveIcon className="h-4 w-4 text-sky-300" />
                저장된 아티팩트
              </h4>
              <p className="mt-1 text-caption text-slate-500">
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
              <AdminRefreshIcon
                className={`h-4 w-4 ${releaseArtifactsLoading ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>

          <div className="mt-4 space-y-3">
            {releaseArtifactsLoading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-5 text-caption text-slate-500">
                저장된 아티팩트 목록을 불러오는 중입니다.
              </div>
            ) : releaseScenarioArtifacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/70 px-4 py-5 text-caption text-slate-500">
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
                      <AdminStatusBadge status={artifact.decision} />
                      {artifact.eval_status ? (
                        <AdminStatusBadge status={artifact.eval_status} />
                      ) : (
                        <AdminBadge className="border-0 bg-slate-700 text-slate-300">
                          eval 없음
                        </AdminBadge>
                      )}
                      <span className="text-caption text-slate-500">
                        {new Date(artifact.saved_at_utc).toLocaleString('ko-KR')}
                      </span>
                    </div>
                    <p className="mt-2 break-all text-caption font-semibold text-white">
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
                        <AdminFolderOpenIcon className="mr-2 h-4 w-4" />
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
                        <AdminDownloadIcon className="mr-2 h-4 w-4" />
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
                        <AdminDownloadIcon className="mr-2 h-4 w-4" />
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
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-caption text-red-300">
            {releaseDraftError}
          </div>
        )}
        {releaseEvaluationError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-caption text-red-300">
            {releaseEvaluationError}
          </div>
        )}
        {releaseSaveError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-caption text-red-300">
            {releaseSaveError}
          </div>
        )}
        {releaseArtifactsError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-caption text-red-300">
            {releaseArtifactsError}
          </div>
        )}
        {releaseSaveMessage && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-caption text-emerald-300">
            {releaseSaveMessage}
          </div>
        )}

        {releaseDraftResult ? (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-caption uppercase tracking-wide text-slate-500">Decision</p>
                <div className="mt-3 flex items-center gap-2">
                  <AdminStatusBadge status={releaseDraftResult.result.draft.decision} />
                  <AdminBadge className={confidenceBadgeClass[releaseDraftResult.result.draft.confidence]}>
                    {releaseDraftResult.result.draft.confidence}
                  </AdminBadge>
                </div>
                <p className="mt-4 text-caption text-slate-300">
                  {releaseDraftResult.result.draft.title}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-caption uppercase tracking-wide text-slate-500">Scenario</p>
                <p className="mt-3 text-caption font-semibold text-white">
                  {releaseDraftResult.result.scenario}
                </p>
                <p className="mt-2 text-caption text-slate-500">
                  model: {releaseDraftResult.result.model}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                <p className="text-caption uppercase tracking-wide text-slate-500">Evidence</p>
                <p className="mt-3 text-2xl font-semibold text-amber-200">
                  {releaseDraftResult.result.draft.evidence.length}
                </p>
                <p className="mt-2 text-caption text-slate-500">
                  generated:{' '}
                  {new Date(releaseDraftResult.result.generated_at_utc).toLocaleString('ko-KR')}
                </p>
                {releaseLoadedArtifact?.artifact_id && (
                  <p className="mt-2 break-all text-caption text-sky-300">
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
                      <p className="mt-1 text-caption text-slate-500">
                        case: {releaseEvaluationResult.case.case_id}
                      </p>
                    </div>
                    <AdminStatusBadge status={releaseEvaluationResult.evaluation.status} />
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <AdminStatusBadge
                      status={releaseEvaluationResult.case.expected_decision}
                      label={`expected ${releaseEvaluationResult.case.expected_decision}`}
                    />
                    <AdminStatusBadge
                      status={releaseEvaluationResult.evaluation.decision_ok ? 'PASS' : 'FAIL'}
                      label={`decision ${releaseEvaluationResult.evaluation.decision_ok ? 'ok' : 'mismatch'}`}
                    />
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
                    <p className="mt-1 text-caption text-slate-500">
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
                      <AdminClipboardIcon className="mr-2 h-4 w-4" />
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
                      className="bg-amber-500 text-slate-950 shadow-sm hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-500"
                    >
                      <AdminSaveIcon className="mr-2 h-4 w-4" />
                      {releaseSaveLoading ? '저장 중...' : '저장'}
                    </Button>
                  </div>
                </div>
                <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-caption leading-6 text-slate-200">
                  {releaseDraftResult.markdown}
                </pre>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5">
                  <h4 className="text-base font-semibold text-white">Summary</h4>
                  <p className="mt-3 text-caption leading-6 text-slate-300">
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
                        className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-caption text-slate-300"
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
                        className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-caption text-slate-300"
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
                      <AdminBadge className="border-slate-700 bg-slate-800 text-slate-300">
                        {item.source}
                      </AdminBadge>
                    </div>
                    <p className="mt-3 text-caption font-semibold text-white">{item.claim}</p>
                    <p className="mt-2 text-caption leading-6 text-slate-400">{item.excerpt}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
            <AdminBotIcon className="h-12 w-12 text-amber-300" />
            <h3 className="mt-4 text-lg font-semibold text-white">
              AI 운영 초안 대기 중
            </h3>
            <p className="mt-2 max-w-xl text-caption leading-6 text-slate-500">
              왼쪽에서 시나리오를 선택하고 초안을 생성하면 `GO / NO_GO / PENDING`
              결정, 근거 문서, 후속 작업이 여기 표시됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
