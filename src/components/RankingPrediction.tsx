import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RotateCcw, LogIn } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { OptimizedImage } from './common/OptimizedImage';
import LoadingSpinner from './LoadingSpinner';
import PlainDialog from './ui/plain-dialog';
import RankingItem from './ranking/RankingItem';
import firstPlaceImage from '../assets/f552d9266ac817e0c86b657dead0069395c6da11.png';
import { useRankingPrediction } from '../hooks/useRankingPrediction';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';

export default function RankingPrediction() {
  const navigate = useNavigate();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const {
    showSaveDialog,
    setShowSaveDialog,
    isSaving,
    alreadySaved,
    currentSeason,
    isPredictionPeriod,
    isLoading,
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
  } = useRankingPrediction();

  // 로딩 중 UI
  if (isAuthLoading || isLoading) {
    return (
      <LoadingSpinner size="lg" text={isAuthLoading ? '로그인 확인 중...' : '불러오는 중...'} fullScreen={false} />
    );
  }

  // 로그인 안 되어 있으면 로그인 유도 메시지 표시
  if (!isLoggedIn) {
    return (
      <Card className="p-8 md:p-12 text-center bg-white dark:bg-card border border-gray-200 dark:border-border shadow-sm">
        <div className="bg-gray-100 dark:bg-card p-4 rounded-full w-fit mx-auto mb-4">
          <LogIn className="w-8 h-8 text-gray-400 dark:text-gray-300" />
        </div>
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-100 mb-2">
          로그인이 필요합니다
        </h3>
        <p className="text-gray-500 dark:text-gray-200 mb-6">
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

  // 예측 불가 기간 UI
  if (!isPredictionPeriod) {
    return (
      <Card className="rounded-2xl border border-slate-200/70 bg-white/90 px-5 py-10 text-center shadow-sm dark:bg-card dark:border-border sm:px-8 sm:py-16">
        <h2 className="mb-3 text-2xl font-bold text-primary">
          순위 예측 종료
        </h2>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-600 dark:text-gray-300 sm:text-base">
          순위 예측은 11월 1일부터 5월 31일까지 가능합니다.
        </p>
      </Card>
    );
  }

  return (
    <>
      <PlainDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        title={<span className="text-primary">순위 확정</span>}
        description={(
          <>
            한번 저장하면 순위 변경이 불가능합니다.<br />
            이대로 순위를 확정하시겠습니까?
          </>
        )}
        className="dark:bg-card dark:border-border"
        footer={(
          <>
            <Button
              type="button"
              variant="outline"
              disabled={isSaving}
              onClick={() => setShowSaveDialog(false)}
              className="text-gray-700 dark:text-gray-100 border border-border/60 dark:border-border/80 bg-background dark:bg-card hover:bg-gray-100 dark:hover:bg-primary/10"
            >
              취소
            </Button>
            <Button
              type="button"
              onClick={confirmSave}
              disabled={isSaving}
              className="text-white bg-primary-dark hover:bg-primary"
            >
              {isSaving ? '저장 중...' : '확인'}
            </Button>
          </>
        )}
      >
        <div />
      </PlainDialog>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Rankings Area - 왼쪽 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-primary font-bold text-lg">예상 순위</h2>
            {!alreadySaved && (
              <Button
                onClick={resetRankings}
                className="flex items-center gap-2 border-2 border-primary text-primary dark:border-primary dark:text-primary dark:bg-transparent hover:bg-primary/10 dark:hover:bg-primary/20"
                variant="outline"
              >
                <RotateCcw className="w-4 h-4" />
                초기화
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {rankings.map((team, index) => (
              <RankingItem
                key={index}
                team={team}
                index={index}
                alreadySaved={alreadySaved}
                onRemove={handleRemoveTeam}
                onMove={moveTeam}
                draggedIndex={draggedIndex}
                onDragIndexChange={setDraggedIndex}
              />
            ))}
          </div>
        </div>

        {/* Team Selection Area - 오른쪽 */}
        <div className="mt-6 md:mt-[60px]">
          {alreadySaved && (
            <div className="mb-4 px-6 py-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-primary dark:text-primary">
              <p className="text-base font-bold text-center">
                저장된 예측입니다
              </p>
            </div>
          )}

          <h2 className="mb-4 text-primary font-bold text-lg">
            팀 선택
            <span className="text-sm text-gray-500 dark:text-gray-300 ml-2 font-normal">
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
                    className={`w-full p-2 transition-colors text-left border-b border-gray-100 dark:border-border/70 last:border-b-0 ${!alreadySaved && 'hover:bg-gray-50 dark:hover:bg-primary/10'
                      } ${alreadySaved && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-card border border-gray-100 dark:border-border flex-shrink-0">
                        <TeamLogo team={team.shortName} size={32} />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-gray-400 dark:text-gray-300">
                <div className="mb-4 mx-auto w-[60px]">
                  <OptimizedImage src={firstPlaceImage} alt="First Place" className="w-full h-auto object-contain" />
                </div>

                <p className="mb-4 text-primary font-black text-2xl">
                  1위
                </p>

                {rankings[0] && (
                  <div className="mb-6 flex justify-center">
                    <TeamLogo team={rankings[0].shortName} size={140} />
                  </div>
                )}

                <p className="text-sm mb-4">모든 팀이 배치되었습니다!</p>

                {!isPredictionSaved && !alreadySaved ? (
                  <Button
                    onClick={handleCompletePrediction}
                    className="w-full text-white bg-primary-dark hover:bg-primary"
                  >
                    예측 완료
                  </Button>
                ) : alreadySaved ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2 border-primary text-primary dark:border-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                    >
                      공유하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleSave}
                      className="w-full text-white bg-primary-dark hover:bg-primary"
                    >
                      저장하기
                    </Button>
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2 border-primary text-primary dark:border-primary dark:text-primary hover:bg-primary/10 dark:hover:bg-primary/20"
                    >
                      공유하기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
