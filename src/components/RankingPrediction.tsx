import { Button } from './ui/button';
import { RotateCcw } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import RankingItem from './ranking/RankingItem';
import firstPlaceImage from 'figma:asset/f552d9266ac817e0c86b657dead0069395c6da11.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useRankingPrediction } from '../hooks/useRankingPrediction';

// Kakao 타입 선언
declare global {
  interface Window {
    Kakao: any;
  }
}

export default function RankingPrediction() {
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
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
             style={{ borderColor: '#2d5f4f' }}></div>
        <p className="text-gray-600">
          {isAuthLoading ? '로그인 확인 중...' : '불러오는 중...'}
        </p>
      </div>
    );
  }

  // 로그인 안 되어 있으면 아무것도 렌더링 안함
  if (!isLoggedIn) {
    return null;
  }

  // 예측 불가 기간 UI
  if (!isPredictionPeriod) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold mb-4" style={{ color: '#2d5f4f' }}>
          순위 예측 종료
        </h2>
        <p className="text-gray-600">
          순위 예측은 11월 1일부터 5월 31일까지 가능합니다.
        </p>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {/* 저장 확인 다이얼로그 */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#2d5f4f' }}>순위 확정</AlertDialogTitle>
            <AlertDialogDescription>
              한번 저장하면 순위 변경이 불가능합니다.<br />
              이대로 순위를 확정하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSave}
              disabled={isSaving}
              className="text-white"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              {isSaving ? '저장 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rankings Area - 왼쪽 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#2d5f4f' }}>예상 순위</h2>
            {!alreadySaved && (
              <Button
                onClick={resetRankings}
                className="flex items-center gap-2 border-2"
                variant="outline"
                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
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
              />
            ))}
          </div>
        </div>

        {/* Team Selection Area - 오른쪽 */}
        <div style={{ marginTop: '60px' }}>
          {alreadySaved && (
            <div className="mb-4 px-6 py-8 rounded-lg" style={{ backgroundColor: '#f0f9f4', color: '#2d5f4f' }}>
              <p className="text-base font-bold text-center">
                저장된 예측입니다 
              </p>
            </div>
          )}

          <h2 className="mb-4" style={{ color: '#2d5f4f' }}>
            팀 선택
            <span className="text-sm text-gray-500 ml-2">
              ({availableTeams.length}/10)
            </span>
          </h2>

          <div className="rounded-xl border-2 bg-white overflow-hidden" style={{ borderColor: '#2d5f4f' }}>
            {availableTeams.length > 0 ? (
              <div className="divide-y">
                {availableTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    disabled={alreadySaved}
                    className={`w-full p-2 transition-colors text-left ${
                      !alreadySaved && 'hover:bg-gray-50'
                    } ${alreadySaved && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <TeamLogo team={team.shortName} size={32} />
                      <span style={{ fontWeight: 600 }}>{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-gray-400">
                <div className="mb-4 mx-auto" style={{ width: '60px' }}>
                  <img src={firstPlaceImage} alt="First Place" className="w-full h-auto object-contain" />
                </div>
                
                <p className="mb-4" style={{ color: '#2d5f4f', fontWeight: 900, fontSize: '1.5rem' }}>
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
                    className="w-full text-white"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    예측 완료
                  </Button>
                ) : alreadySaved ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2"
                      style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                    >
                      공유하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleSave}
                      className="w-full text-white"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      저장하기
                    </Button>
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2"
                      style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
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
    </DndProvider>
  );
}