import { useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RotateCcw, Award, X, GripVertical } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { toast } from 'sonner@2.0.3';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { usePredictionStore, Team } from '../store/predictionStore';
import { useEffect } from 'react';
import podiumImage from 'figma:asset/4b5cf234f729d37970ba7ab9c5a1134fcd8e70b6.png';
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

export default function RankingPrediction() {
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);
  const [isPredictionPeriod, setIsPredictionPeriod] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const rankings = usePredictionStore((state) => state.rankings);
  const availableTeams = usePredictionStore((state) => state.availableTeams);
  const isPredictionSaved = usePredictionStore((state) => state.isPredictionSaved);
  const allTeams = usePredictionStore((state) => state.allTeams);
  
  const addTeamToRanking = usePredictionStore((state) => state.addTeamToRanking);
  const removeTeamFromRanking = usePredictionStore((state) => state.removeTeamFromRanking);
  const moveTeam = usePredictionStore((state) => state.moveTeam);
  const resetRankings = usePredictionStore((state) => state.resetRankings);
  const completePrediction = usePredictionStore((state) => state.completePrediction);
  const setRankings = usePredictionStore((state) => state.setRankings);

  // ===== 페이지 로드 시 현재 시즌 & 기존 예측 불러오기 =====
  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);
      
      try {
        // 1. 현재 예측 가능한 시즌 가져오기
        const seasonResponse = await fetch('/api/predictions/ranking/current-season', {
          credentials: 'include'
        });

        if (seasonResponse.ok) {
          const seasonData = await seasonResponse.json();
          setCurrentSeason(seasonData.seasonYear);
          setIsPredictionPeriod(true);

          // 2. 해당 시즌의 기존 예측 확인
          const predictionResponse = await fetch(
            `/api/predictions/ranking?seasonYear=${seasonData.seasonYear}`, 
            { credentials: 'include' }
          );

          if (predictionResponse.ok) {
            const savedPrediction = await predictionResponse.json();
            setAlreadySaved(true);
            
            // ===== 저장된 예측을 화면에 복원 =====
            loadSavedPrediction(savedPrediction.teamIdsInOrder);
            
            toast.info(`${seasonData.seasonYear} 시즌 순위 예측을 불러왔습니다.`);
          } else {
            // 저장된 예측이 없으면 초기화
            resetRankings();
          }
        } else {
          // 예측 불가 기간
          const errorData = await seasonResponse.json();
          setIsPredictionPeriod(false);
          toast.error(errorData.error);
        }
      } catch (error) {
        console.error('초기화 실패:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, []);

  // ===== 저장된 예측을 화면에 복원하는 함수 =====
  const loadSavedPrediction = (teamIdsInOrder: string[]) => {
    console.log('복원할 팀 IDs:', teamIdsInOrder);
    console.log('사용 가능한 전체 팀:', allTeams);
    
    // teamIdsInOrder는 ['두산', '삼성', 'LG', ...] 형태
    // 이걸 Team 객체 배열로 변환
    
    const restoredRankings = teamIdsInOrder.map(teamId => {
      // allTeams에서 해당 팀 찾기
      // shortName으로 매칭 (백엔드에서 shortName을 저장하고 있음)
      const team = allTeams.find(t => 
        t.shortName === teamId || 
        t.name === teamId || 
        t.id === teamId
      );
      
      if (!team) {
        console.warn(`팀을 찾을 수 없습니다: ${teamId}`, {
          availableShortNames: allTeams.map(t => t.shortName),
          availableNames: allTeams.map(t => t.name)
        });
      }
      
      return team || null;
    });

    console.log('복원된 순위:', restoredRankings);

    // Zustand store에 복원된 순위 설정
    if (setRankings) {
      setRankings(restoredRankings);
    }
  };

  const handleTeamClick = (team: Team) => {
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    addTeamToRanking(team);
  };

  const handleRemoveTeam = (index: number) => {
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    removeTeamFromRanking(index);
  };

  const handleCompletePrediction = () => {
    if (isComplete) {
      completePrediction();
      toast.success('순위 예측이 완료되었습니다!');
    }
  };

  const handleSave = () => {
    if (alreadySaved) {
      toast.error('이미 순위 예측을 저장하셨습니다.');
      return;
    }
    setShowSaveDialog(true);
  };

  const confirmSave = async () => {
    if (isSaving || alreadySaved || !currentSeason) return;

    setIsSaving(true);

    try {
      const teamIds = rankings
        .filter(team => team !== null)
        .map(team => team!.shortName);

      const requestBody = {
        seasonYear: currentSeason,
        teamIdsInOrder: teamIds
      };

      const response = await fetch('/api/predictions/ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        toast.success(`${currentSeason} 시즌 예측이 저장되었습니다!`);
        setShowSaveDialog(false);
        setAlreadySaved(true);
      } else if (response.status === 409) {
        const errorData = await response.json();
        toast.error(errorData.error);
        setAlreadySaved(true);
      } else {
        const errorText = await response.text();
        console.error('서버 에러:', errorText);
        toast.error('저장에 실패했습니다.');
      }

    } catch (error) {
      console.error('저장 오류:', error);
      toast.error('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleShare = () => {
    toast.success('공유 기능이 준비 중입니다!');
  };

  const isComplete = rankings.every(team => team !== null);

  // ===== 로딩 중 UI =====
  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
             style={{ borderColor: '#2d5f4f' }}></div>
        <p className="text-gray-600">불러오는 중...</p>
      </div>
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

    drag(drop(ref));

    const backgroundColor = index < 5 ? '#2d5f4f' : '#9ca3af';

    return (
      <div
        ref={ref}
        className={`border-2 rounded-xl p-3 transition-all ${
          team 
            ? `border-transparent bg-white shadow-sm ${!alreadySaved && 'cursor-move'}` 
            : 'border-dashed border-gray-300 bg-gray-50'
        } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor, fontWeight: 900, fontSize: '1.1rem' }}
          >
            {index + 1}
          </div>

          {team ? (
            <div className="flex items-center gap-3 flex-1">
              {!alreadySaved && <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />}
              <TeamLogo team={team.shortName} size={40} />
              <span style={{ fontWeight: 700 }} className="flex-1">{team.name}</span>
              {!alreadySaved && (
                <Button
                  onClick={() => handleRemoveTeam(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-red-50"
                >
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              )}
            </div>
          ) : (
            <div className="flex-1 text-center text-gray-400 text-sm">
              팀을 선택하세요
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DndProvider backend={HTML5Backend}>
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
              <RankingItem key={index} team={team} index={index} />
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