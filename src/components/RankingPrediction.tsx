// RankingPrediction.tsx
import { Button } from './ui/button';
import { RotateCcw, X, GripVertical } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { toast } from 'sonner';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { usePredictionStore, Team } from '../store/predictionStore';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';  
import { useAuthStore } from '../store/authStore';  
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
import { useRankingPrediction } from '../hooks/useRankingPrediction';
import RankingItem from './ranking/RankingItem';

// Kakao 타입 선언 
declare global {
  interface Window {
    Kakao: any;
  }
}

export default function RankingPrediction() {
  const navigate = useNavigate(); 
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn); 
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading); 

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

  // Kakao SDK 초기화 추가 
  useEffect(() => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init('22ca50f15ddc72e9032732884f5d0f28'); 
      console.log('Kakao SDK 초기화 완료:', window.Kakao.isInitialized());
    }
  }, []);

  // 로그인 체크 추가!
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      toast.error('로그인이 필요한 서비스입니다.');
      navigate('/login');
    }
  }, [isLoggedIn, isAuthLoading, navigate]);

  // ===== 페이지 로드 시 현재 시즌 & 기존 예측 불러오기 =====
  useEffect(() => {
    // 로그인 되어있을 때만 데이터 로드
    if (isLoggedIn) {
      const initializePage = async () => {
        setIsLoading(true);
        
        try {
          // 1. 현재 예측 가능한 시즌 가져오기
          const seasonResponse = await fetch('/api/predictions/ranking/current-season', {
            credentials: 'include'
          });

          // 401 에러 = 로그인 안됨
          if (seasonResponse.status === 401) {
            toast.error('로그인이 필요한 서비스입니다.');
            navigate('/login');
            return;
          }

          if (seasonResponse.ok) {
            const seasonData = await seasonResponse.json();
            setCurrentSeason(seasonData.seasonYear);
            setIsPredictionPeriod(true);

            // 2. 해당 시즌의 기존 예측 확인
            const predictionResponse = await fetch(
              `/api/predictions/ranking?seasonYear=${seasonData.seasonYear}`, 
              { credentials: 'include' }
            );

            // 401 에러 처리
            if (predictionResponse.status === 401) {
              toast.error('로그인이 필요한 서비스입니다.');
              navigate('/login');
              return;
            }

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
          toast.error('데이터를 불러오는데 실패했습니다.');
        } finally {
          setIsLoading(false);
        }
      };

      initializePage();
    }
  }, [navigate, isLoggedIn]);

  // ===== 저장된 예측을 화면에 복원하는 함수 =====
  const loadSavedPrediction = (teamIdsInOrder: string[]) => {
    console.log('복원할 팀 IDs:', teamIdsInOrder);
    console.log('사용 가능한 전체 팀:', allTeams);
    
    const restoredRankings = teamIdsInOrder.map(teamId => {
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
  if (!window.Kakao) {
    toast.error('카카오톡 공유 기능을 불러올 수 없습니다.');
    return;
  }

  if (!isComplete) {
    toast.warning('10개 팀을 모두 배치한 후 공유할 수 있습니다.');
    return;
  }

  try {
    // 순위 텍스트 생성
    const rankingText = rankings
      .filter(team => team !== null)
      .map((team, index) => `${index + 1}위: ${team!.name}`)
      .join('\n');

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: `${currentSeason} KBO 시즌 순위 예측`,
        description: rankingText,
        imageUrl: 'https://mud-kage.kakao.com/dn/NTmhS/btqfEUdFAUf/FjKzkZsnoeE4o19klTOVI1/openlink_640x640s.jpg',
        link: {
          mobileWebUrl: window.location.href,
          webUrl: window.location.href,
        },
      },
      buttons: [
        {
          title: '나도 예측하기',
          link: {
            mobileWebUrl: window.location.origin + '/prediction',
            webUrl: window.location.origin + '/prediction',
          },
        },
      ],
    });

    toast.success('카카오톡 공유 창이 열렸습니다!');
  } catch (error) {
    console.error('카카오톡 공유 실패:', error);
    toast.error('카카오톡 공유에 실패했습니다.');
  }
};

  const isComplete = rankings.every(team => team !== null);

  // ===== 로딩 중 UI (로그인 체크 포함) =====
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
              한번 저장하면 순위 변경이 불가능합니다.
              <br />
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
        {/* 왼쪽: 순위 목록 */}
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
                moveTeam={moveTeam}
                onRemove={handleRemoveTeam}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽: 팀 선택 */}
        <div style={{ marginTop: '60px' }}>
          {alreadySaved && (
            <div
              className="mb-4 px-6 py-8 rounded-lg"
              style={{ backgroundColor: '#f0f9f4', color: '#2d5f4f' }}
            >
              <p className="text-base font-bold text-center">저장된 예측입니다</p>
            </div>
          )}

          <h2 className="mb-4" style={{ color: '#2d5f4f' }}>
            팀 선택
            <span className="text-sm text-gray-500 ml-2">
              ({availableTeams.length}/10)
            </span>
          </h2>

          <div
            className="rounded-xl border-2 bg-white overflow-hidden"
            style={{ borderColor: '#2d5f4f' }}
          >
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
                  <img
                    src={firstPlaceImage}
                    alt="First Place"
                    className="w-full h-auto object-contain"
                  />
                </div>

                <p
                  className="mb-4"
                  style={{ color: '#2d5f4f', fontWeight: 900, fontSize: '1.5rem' }}
                >
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
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full border-2"
                    style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                  >
                    공유하기
                  </Button>
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