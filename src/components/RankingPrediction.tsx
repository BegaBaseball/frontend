import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import LoadingSpinner from './LoadingSpinner';
import { LogInIcon, RotateCcwIcon } from './icons/PublicFeatureIcons';
import RankingItem from './ranking/RankingItem';
import { useRankingPrediction } from '../hooks/useRankingPrediction';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';

const RankingPredictionSaveDialog = lazy(() => import('./RankingPredictionSaveDialog'));
const RankingPredictionCompletionPanel = lazy(() => import('./RankingPredictionCompletionPanel'));

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
        className="p-8 md:p-12 text-center bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm"
        data-testid="ranking-root"
      >
        <div className="bg-gray-100 dark:bg-card p-4 rounded-full w-fit mx-auto mb-4">
          <LogInIcon className="w-8 h-8 text-gray-400 dark:text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-700 dark:text-white mb-2">
          로그인이 필요합니다
        </h3>
        <p className="text-gray-500 dark:text-white mb-6">
          순위 예측에 참여하려면 로그인해주세요.
        </p>
        <Button
          onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
          className="text-white bg-primary-dark hover:bg-primary px-6 py-2"
        >
          로그인하기
        </Button>
      </Card>
    );
  }

  if (!isPredictionPeriod) {
    return (
      <Card
        className="rounded-2xl border border-slate-200/70 bg-white/90 px-5 py-10 text-center shadow-sm dark:bg-card dark:border-border sm:px-8 sm:py-16"
        data-testid="ranking-root"
      >
        <h2 className="mb-3 text-2xl font-bold text-primary">
          순위 예측 종료
        </h2>
        <p className="mx-auto max-w-sm text-[16px] leading-relaxed text-gray-600 dark:text-white sm:text-base">
          순위 예측은 11월 1일부터 5월 31일까지 가능합니다.
        </p>
      </Card>
    );
  }

  if (initState === 'error') {
    return (
      <Card
        className="rounded-2xl border border-amber-200/70 bg-white/90 px-5 py-10 text-center shadow-sm dark:bg-card dark:border-border sm:px-8 sm:py-16"
        data-testid="ranking-root"
      >
        <h2 className="mb-3 text-2xl font-bold text-primary" data-testid="ranking-error-state">
          순위 예측을 불러오지 못했습니다
        </h2>
        <p className="mx-auto mb-6 max-w-md text-[16px] leading-relaxed text-gray-600 dark:text-white sm:text-base">
          {initErrorMessage || '잠시 후 다시 시도해주세요.'}
        </p>
        <Button
          onClick={() => void retryInitialize()}
          className="text-white bg-primary-dark hover:bg-primary px-6 py-2"
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

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-testid="ranking-root">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-primary font-bold text-lg">예상 순위</h2>
            {!alreadySaved && (
              <Button
                onClick={handleResetRankings}
                data-testid="ranking-reset-btn"
                className="flex items-center gap-2 border-2 border-primary text-primary dark:border-primary dark:text-primary dark:bg-transparent hover:bg-primary/10 dark:hover:bg-primary/20"
                variant="outline"
              >
                <RotateCcwIcon className="w-4 h-4" />
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
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[15px] font-bold text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200">
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

        <div className="mt-6 md:mt-[60px]">
          {alreadySaved && (
            <div
              className="mb-4 px-6 py-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-primary dark:text-primary"
              data-testid="ranking-saved-badge"
            >
              <p className="text-base font-bold text-center">
                저장된 예측입니다
              </p>
            </div>
          )}

          <h2 className="mb-4 text-primary font-bold text-lg">
            팀 선택
            <span className="text-[16px] text-gray-500 dark:text-white ml-2 font-semibold">
              ({availableTeams.length}/10)
            </span>
          </h2>

          <div className="rounded-xl border-2 border-primary dark:border-primary bg-white dark:bg-card overflow-hidden">
            {availableTeams.length > 0 ? (
              <div>
                {availableTeams.map((team) => (
                  <button
                    type="button"
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    disabled={alreadySaved}
                    data-testid={`ranking-team-option-${team.id}`}
                    className={`w-full p-2 transition-colors text-left border-b border-gray-100 dark:border-border/70 last:border-b-0 ${!alreadySaved && 'hover:bg-gray-50 dark:hover:bg-primary/10'
                      } ${alreadySaved && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-card border border-gray-100 dark:border-border flex-shrink-0">
                        <TeamLogo team={team.shortName} size={32} />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-gray-400 dark:text-white">
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
