import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import LoadingSpinner from './LoadingSpinner';
import { RankingLogInIcon, RankingRotateCcwIcon } from './ranking/RankingPredictionIcons';
import RankingItem from './ranking/RankingItem';
import { useRankingPrediction } from '../hooks/useRankingPrediction';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import {
  PREDICTION_BRAND_TEXT_CLASS,
  PREDICTION_SOFT_CHIP_CLASS,
  PREDICTION_SURFACE_CARD_CLASS,
} from './prediction/predictionUiTokens';

const RankingPredictionSaveDialog = lazy(() => import('./RankingPredictionSaveDialog'));
const RankingPredictionCompletionPanel = lazy(() => import('./RankingPredictionCompletionPanel'));

type RankingPredictionSmokeWindow = Window & {
  Cypress?: unknown;
  __BEGA_PREDICTION_MOBILE_SMOKE_RANKING_SAVE_DIALOG__?: boolean;
};

export default function RankingPrediction() {
  const navigate = useNavigate();
  const [draggedTeamId, setDraggedTeamId] = useState<string | null>(null);
  const [lastMovedTeamId, setLastMovedTeamId] = useState<string | null>(null);
  const [reorderFeedback, setReorderFeedback] = useState<string | null>(null);
  const {
    showSaveDialog,
    setShowSaveDialog,
    isSaving,
    alreadySaved,
    currentSeason,
    isPredictionPeriod,
    isLoading,
    initState,
    initErrorMessage,
    isAuthLoading,
    isLoggedIn,
    rankings,
    availableTeams,
    isPredictionSaved,
    moveTeam,
    resetRankings,
    isComplete,
    handleTeamClick,
    handleRemoveTeam,
    handleCompletePrediction,
    handleSave,
    confirmSave,
    handleShare,
    retryInitialize,
  } = useRankingPrediction();

  useEffect(() => {
    if (initState !== 'ready' || alreadySaved || showSaveDialog) {
      return;
    }

    const typedWindow = window as RankingPredictionSmokeWindow;
    if (typedWindow.Cypress && typedWindow.__BEGA_PREDICTION_MOBILE_SMOKE_RANKING_SAVE_DIALOG__) {
      setShowSaveDialog(true);
    }
  }, [alreadySaved, initState, setShowSaveDialog, showSaveDialog]);

  useEffect(() => {
    if (!lastMovedTeamId && !reorderFeedback) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLastMovedTeamId(null);
      setReorderFeedback(null);
    }, 1800);

    return () => window.clearTimeout(timeoutId);
  }, [lastMovedTeamId, reorderFeedback]);

  const handleMoveTeamToIndex = useCallback((teamId: string, hoverIndex: number) => {
    const fromIndex = rankings.findIndex((rankingTeam) => rankingTeam?.id === teamId);
    if (fromIndex < 0 || fromIndex === hoverIndex) {
      return;
    }

    const team = rankings[fromIndex];
    if (!team) {
      return;
    }

    moveTeam(fromIndex, hoverIndex);
    setLastMovedTeamId(team.id);
    setReorderFeedback(`${team.name} ${hoverIndex + 1}위로 이동했습니다.`);
  }, [rankings, moveTeam]);

  const handleMoveTeamByStep = useCallback((teamId: string, direction: -1 | 1) => {
    const fromIndex = rankings.findIndex((rankingTeam) => rankingTeam?.id === teamId);
    if (fromIndex < 0) {
      return;
    }

    const nextIndex = Math.min(rankings.length - 1, Math.max(0, fromIndex + direction));
    handleMoveTeamToIndex(teamId, nextIndex);
  }, [rankings, handleMoveTeamToIndex]);

  const handleResetRankings = useCallback(() => {
    setDraggedTeamId(null);
    setLastMovedTeamId(null);
    setReorderFeedback(null);
    resetRankings();
  }, [resetRankings]);

  if (isAuthLoading || isLoading) {
    return (
      <LoadingSpinner size="lg" text={isAuthLoading ? '로그인 확인 중...' : '불러오는 중...'} fullScreen={false} />
    );
  }

  if (!isLoggedIn) {
    return (
      <Card
        className={`${PREDICTION_SURFACE_CARD_CLASS} rounded-2xl p-8 text-center md:p-12`}
        data-testid="ranking-root"
      >
        <div className="mx-auto mb-4 w-fit rounded-full bg-emerald-50 p-4 dark:bg-primary/20">
          <RankingLogInIcon className={`${PREDICTION_BRAND_TEXT_CLASS} h-8 w-8`} />
        </div>
        <h3 className="mb-2 text-xl font-extrabold text-slate-950 dark:text-white">
          로그인이 필요합니다
        </h3>
        <p className="mb-6 text-slate-500 dark:text-white/75">
          순위 예측에 참여하려면 로그인해주세요.
        </p>
        <Button
          variant="brand"
          onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
          className="px-6 py-2"
        >
          로그인하기
        </Button>
      </Card>
    );
  }

  if (!isPredictionPeriod) {
    return (
      <Card
        className={`${PREDICTION_SURFACE_CARD_CLASS} rounded-2xl px-5 py-10 text-center sm:px-8 sm:py-16`}
        data-testid="ranking-root"
      >
        <h2 className={`${PREDICTION_BRAND_TEXT_CLASS} mb-3 text-2xl font-extrabold`}>
          순위 예측 종료
        </h2>
        <p className="mx-auto max-w-sm text-body leading-relaxed text-slate-600 dark:text-white/75 sm:text-base">
          순위 예측은 11월 1일부터 5월 31일까지 가능합니다.
        </p>
      </Card>
    );
  }

  if (initState === 'error') {
    return (
      <Card
        className="rounded-2xl border border-amber-200/70 bg-white px-5 py-10 text-center shadow-sm dark:border-border dark:bg-card sm:px-8 sm:py-16"
        data-testid="ranking-root"
      >
        <h2 className={`${PREDICTION_BRAND_TEXT_CLASS} mb-3 text-2xl font-extrabold`} data-testid="ranking-error-state">
          순위 예측을 불러오지 못했습니다
        </h2>
        <p className="mx-auto mb-6 max-w-md text-body leading-relaxed text-slate-600 dark:text-white/75 sm:text-base">
          {initErrorMessage || '잠시 후 다시 시도해주세요.'}
        </p>
        <Button
          variant="brand"
          onClick={() => void retryInitialize()}
          className="px-6 py-2"
        >
          다시 시도
        </Button>
      </Card>
    );
  }

  return (
    <>
      {showSaveDialog ? (
        <Suspense fallback={null}>
          <RankingPredictionSaveDialog
            open={showSaveDialog}
            isSaving={isSaving}
            onClose={() => setShowSaveDialog(false)}
            onConfirm={confirmSave}
          />
        </Suspense>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3" data-testid="ranking-root">
        <div className={`${PREDICTION_SURFACE_CARD_CLASS} rounded-2xl p-4 lg:col-span-2`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`${PREDICTION_BRAND_TEXT_CLASS} text-lg font-extrabold`}>예상 순위</h2>
            {!alreadySaved && (
              <Button
                onClick={handleResetRankings}
                data-testid="ranking-reset-btn"
                className="flex items-center gap-2 border border-emerald-200 bg-white text-primary hover:bg-emerald-50 dark:border-emerald-900/60 dark:bg-card dark:text-primary-light dark:hover:bg-primary/20"
                variant="outline"
              >
                <RankingRotateCcwIcon className="w-4 h-4" />
                초기화
              </Button>
            )}
          </div>

          <div
            aria-live="polite"
            className="mb-3 min-h-6"
            data-testid="ranking-reorder-feedback"
          >
            {reorderFeedback ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-15 font-bold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                {reorderFeedback}
              </p>
            ) : null}
          </div>

          <div className="space-y-2" data-testid="ranking-list">
            {rankings.map((team, index) => (
              <RankingItem
                key={team ? `ranking-team-${team.id}` : `ranking-empty-${index}`}
                team={team}
                index={index}
                alreadySaved={alreadySaved}
                onRemove={handleRemoveTeam}
                onMoveTeamToIndex={handleMoveTeamToIndex}
                onMoveTeamByStep={handleMoveTeamByStep}
                draggedTeamId={draggedTeamId}
                lastMovedTeamId={lastMovedTeamId}
                onDragTeamChange={setDraggedTeamId}
              />
            ))}
          </div>
        </div>

        <div className={`${PREDICTION_SURFACE_CARD_CLASS} rounded-2xl p-4`}>
          {alreadySaved && (
            <div
              className={`${PREDICTION_SOFT_CHIP_CLASS} mb-4 animate-fade-in-up rounded-xl px-6 py-6 shadow-sm motion-reduce:animate-none`}
              data-testid="ranking-saved-badge"
            >
              <p className="text-center text-base font-extrabold">
                저장된 예측입니다
              </p>
            </div>
          )}

          <h2 className={`${PREDICTION_BRAND_TEXT_CLASS} mb-4 text-lg font-extrabold`}>
            팀 선택
            <span className="ml-2 text-body font-semibold text-slate-500 dark:text-white/70">
              ({availableTeams.length}/10)
            </span>
          </h2>

          <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white dark:border-border dark:bg-card">
            {availableTeams.length > 0 ? (
              <div>
                {availableTeams.map((team) => (
                  <button
                    type="button"
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    disabled={alreadySaved}
                    data-testid={`ranking-team-option-${team.id}`}
                    className={`w-full border-b border-slate-100 p-2 text-left transition-[background-color,transform] duration-150 ease-out motion-reduce:transition-none dark:border-border/70 last:border-b-0 ${!alreadySaved && 'hover:translate-x-0.5 hover:bg-emerald-50/70 active:scale-[0.99] motion-reduce:hover:translate-x-0 dark:hover:bg-primary/10'
                      } ${alreadySaved && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50 dark:border-border dark:bg-secondary/40">
                        <TeamLogo team={team.shortName} size={32} />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-slate-400 dark:text-white">
                <Suspense fallback={null}>
                  <RankingPredictionCompletionPanel
                    topTeamShortName={rankings[0]?.shortName}
                    isPredictionSaved={isPredictionSaved}
                    alreadySaved={alreadySaved}
                    onCompletePrediction={handleCompletePrediction}
                    onSave={handleSave}
                    onShare={handleShare}
                  />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
