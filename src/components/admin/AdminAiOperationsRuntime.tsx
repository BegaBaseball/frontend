import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { AdminAiOperationsPanel } from './AdminAiOperationsPanel';

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

export default function AdminAiOperationsRuntime() {
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
  );
}
