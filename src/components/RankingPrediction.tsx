import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RotateCcw, Award, X, GripVertical, LogIn } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import { OptimizedImage } from './common/OptimizedImage';
import firstPlaceImage from '../assets/f552d9266ac817e0c86b657dead0069395c6da11.png';
import { useRankingPrediction } from '../hooks/useRankingPrediction';
import { useDrag, useDrop } from 'react-dnd';
import { Team } from '../store/predictionStore';


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

// Kakao 타입 선언
declare global {
  interface Window {
    Kakao: any;
  }
}

export default function RankingPrediction() {
  const navigate = useNavigate();
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

  // 로그인 안 되어 있으면 로그인 유도 메시지 표시
  if (!isLoggedIn) {
    return (
      <Card className="p-8 md:p-12 text-center bg-white dark:bg-gray-800 border-none shadow-sm">
        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full w-fit mx-auto mb-4">
          <LogIn className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">
          로그인이 필요합니다
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          순위 예측에 참여하려면 로그인해주세요.
        </p>
        <Button
          onClick={() => navigate('/login')}
          className="text-white px-6 py-2"
          style={{ backgroundColor: '#2d5f4f' }}
        >
          로그인하기
        </Button>
      </Card>
    );
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

  const RankingItem = ({ team, index }: { team: Team | null; index: number }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
      type: 'TEAM',
      item: { index },
      canDrag: team !== null && !alreadySaved,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [, drop] = useDrop({
      accept: 'TEAM',
      hover: (item: { index: number }) => {
        if (!ref.current || alreadySaved) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;

        moveTeam(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });

    // Keyboard handler for accessibility
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (alreadySaved || !team) return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'ArrowUp' && index > 0) {
          e.preventDefault();
          moveTeam(index, index - 1);
          // Focus the element at new position after state update
          setTimeout(() => {
            const items = document.querySelectorAll('[data-ranking-item]');
            (items[index - 1] as HTMLElement)?.focus();
          }, 0);
        } else if (e.key === 'ArrowDown' && index < 9) {
          e.preventDefault();
          moveTeam(index, index + 1);
          setTimeout(() => {
            const items = document.querySelectorAll('[data-ranking-item]');
            (items[index + 1] as HTMLElement)?.focus();
          }, 0);
        }
      }
    };

    drag(drop(ref));

    // 가을야구권(1~5위)과 하위권(6~10위) 색상 구분
    const isPostSeasonZone = index < 5;
    const rankBadgeColor = isPostSeasonZone ? '#2d5f4f' : '#9ca3af';

    return (
      <>
        {/* 5위와 6위 사이 포스트시즌 커트라인 표시 */}
        {index === 5 && (
          <div className="flex items-center gap-4 my-4 opacity-80">
            <div className="h-px flex-1 bg-red-400/50 dark:bg-red-500/50 border-t border-dashed border-red-500"></div>
            <span className="text-xs font-bold text-red-500 px-3 py-1 bg-red-50 dark:bg-red-900/20 rounded-full border border-red-200 dark:border-red-800">
              가을야구 진출 (PS)
            </span>
            <div className="h-px flex-1 bg-red-400/50 dark:bg-red-500/50 border-t border-dashed border-red-500"></div>
          </div>
        )}

        <div
          ref={ref}
          data-ranking-item
          tabIndex={team && !alreadySaved ? 0 : -1}
          onKeyDown={handleKeyDown}
          aria-label={team
            ? `${index + 1}위: ${team.name}${!alreadySaved ? '. Ctrl+화살표로 순위 변경' : ''}`
            : `${index + 1}위: 팀 미선택`
          }
          className={`border-2 rounded-xl p-3 transition-all duration-200 ${team
            ? `border-transparent shadow-sm ${!alreadySaved && 'cursor-move hover:scale-[1.01] hover:shadow-md'} ${isPostSeasonZone
              ? 'bg-white dark:bg-gray-800'
              : 'bg-gray-50/80 dark:bg-gray-800/60'
            }`
            : 'border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30'
            } ${isDragging ? 'opacity-40 scale-95' : 'opacity-100'} focus:outline-none focus:ring-2 focus:ring-[#2d5f4f] focus:ring-offset-2`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-sm ${isPostSeasonZone ? 'ring-2 ring-emerald-100 dark:ring-emerald-900' : ''}`}
              style={{ backgroundColor: rankBadgeColor, fontWeight: 900, fontSize: '1.1rem' }}
            >
              {index + 1}
            </div>

            {team ? (
              <div className="flex items-center gap-3 flex-1">
                {!alreadySaved && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100 flex-shrink-0">
                  <TeamLogo team={team.shortName} size={32} />
                </div>
                <span style={{ fontWeight: 700 }} className={`flex-1 ${isPostSeasonZone ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                  {team.name}
                </span>
                {!alreadySaved && (
                  <Button
                    onClick={() => handleRemoveTeam(index)}
                    variant="ghost"
                    size="sm"
                    aria-label={`${team.name} 제거`}
                    className="h-10 w-10 p-0 hover:bg-red-50 dark:hover:bg-red-900/30 group"
                  >
                    <X className="w-5 h-5 text-gray-400 group-hover:text-red-500 transition-colors" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex-1 text-center text-gray-400 dark:text-gray-500 text-sm">
                팀을 선택하세요
              </div>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#2d5f4f] dark:text-emerald-400">순위 확정</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              한번 저장하면 순위 변경이 불가능합니다.<br />
              이대로 순위를 확정하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving} className="dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSave}
              disabled={isSaving}
              className="text-white bg-[#2d5f4f] hover:bg-[#244d40] dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {isSaving ? '저장 중...' : '확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Rankings Area - 왼쪽 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#2d5f4f] dark:text-emerald-400 font-bold text-lg">예상 순위</h2>
            {!alreadySaved && (
              <Button
                onClick={resetRankings}
                className="flex items-center gap-2 border-2 border-[#2d5f4f] text-[#2d5f4f] dark:border-emerald-500 dark:text-emerald-400 dark:bg-transparent hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                variant="outline"
              >
                <RotateCcw className="w-4 h-4" />
                초기화
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {rankings.map((team, index) => (
              <RankingItem key={index} team={team} index={index} />
            ))}
          </div>
        </div>

        {/* Team Selection Area - 오른쪽 */}
        <div className="mt-6 md:mt-[60px]">
          {alreadySaved && (
            <div className="mb-4 px-6 py-8 rounded-lg bg-green-50 dark:bg-green-900/20 text-[#2d5f4f] dark:text-green-400">
              <p className="text-base font-bold text-center">
                저장된 예측입니다
              </p>
            </div>
          )}

          <h2 className="mb-4 text-[#2d5f4f] dark:text-emerald-400 font-bold text-lg">
            팀 선택
            <span className="text-sm text-gray-500 dark:text-gray-400 ml-2 font-normal">
              ({availableTeams.length}/10)
            </span>
          </h2>

          <div className="rounded-xl border-2 border-[#2d5f4f] dark:border-emerald-500 bg-white dark:bg-gray-800 overflow-hidden">
            {availableTeams.length > 0 ? (
              <div className="divide-y dark:divide-gray-700">
                {availableTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    disabled={alreadySaved}
                    className={`w-full p-2 transition-colors text-left ${!alreadySaved && 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      } ${alreadySaved && 'opacity-50 cursor-not-allowed'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 border border-gray-100 flex-shrink-0">
                        <TeamLogo team={team.shortName} size={32} />
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-gray-400">
                <div className="mb-4 mx-auto w-[60px]">
                  <OptimizedImage src={firstPlaceImage} alt="First Place" className="w-full h-auto object-contain" />
                </div>

                <p className="mb-4 text-[#2d5f4f] dark:text-emerald-400 font-black text-2xl">
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
                    className="w-full text-white bg-[#2d5f4f] hover:bg-[#244d40] dark:bg-emerald-600 dark:hover:bg-emerald-700"
                  >
                    예측 완료
                  </Button>
                ) : alreadySaved ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2 border-[#2d5f4f] text-[#2d5f4f] dark:border-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      공유하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleSave}
                      className="w-full text-white bg-[#2d5f4f] hover:bg-[#244d40] dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                      저장하기
                    </Button>
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2 border-[#2d5f4f] text-[#2d5f4f] dark:border-emerald-500 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
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