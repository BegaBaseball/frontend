import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthStore } from '../store/authStore';
import { usePredictionStore, Team } from '../store/predictionStore';
import { 
  fetchCurrentSeason, 
  fetchSavedPrediction, 
  saveRankingPrediction 
} from '../api/ranking';
import { 
  restoreTeamsFromIds, 
  isRankingComplete,
  extractTeamIds,
  generateRankingText,
  isKakaoSDKReady,
  initializeKakaoSDK
} from '../utils/ranking';
import { KAKAO_APP_KEY } from '../constants/ranking';

export const useRankingPrediction = () => {
  const navigate = useNavigate();
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAuthLoading = useAuthStore((state) => state.isAuthLoading);
  const userId = useAuthStore((state) => state.user?.id);

  // Local state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);
  const [isPredictionPeriod, setIsPredictionPeriod] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Zustand store
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

  // Kakao SDK 초기화
  useEffect(() => {
    initializeKakaoSDK(KAKAO_APP_KEY);
  }, []);

  // 로그인 체크
  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      toast.error('로그인이 필요한 서비스입니다.');
      navigate('/login');
    }
  }, [isLoggedIn, isAuthLoading, navigate]);

  // 페이지 초기화 (시즌 & 저장된 예측 로드)
  useEffect(() => {
    if (isLoggedIn) {
      initializePage();
    }
  }, [isLoggedIn]);

  const initializePage = async () => {
    setIsLoading(true);
    
    try {
      // 1. 현재 시즌 조회
      const seasonData = await fetchCurrentSeason();
      setCurrentSeason(seasonData.seasonYear);
      setIsPredictionPeriod(true);

      // 2. 저장된 예측 조회
      try {
        const savedPrediction = await fetchSavedPrediction(seasonData.seasonYear);
        setAlreadySaved(true);
        
        // 저장된 예측 복원
        const restoredRankings = restoreTeamsFromIds(savedPrediction.teamIdsInOrder, allTeams);
        if (setRankings) {
          setRankings(restoredRankings);
        }
        
        toast.info(`${seasonData.seasonYear} 시즌 순위 예측을 불러왔습니다.`);
      } catch (error: any) {
        // 저장된 예측이 없으면 초기화
        if (error.message !== 'UNAUTHORIZED') {
          resetRankings();
        }
      }

    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED') {
        toast.error('로그인이 필요한 서비스입니다.');
        navigate('/login');
      } else {
        setIsPredictionPeriod(false);
        toast.error(error.message || '데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 팀 추가
  const handleTeamClick = (team: Team) => {
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    addTeamToRanking(team);
  };

  // 팀 제거
  const handleRemoveTeam = (index: number) => {
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    removeTeamFromRanking(index);
  };

  // 예측 완료
  const handleCompletePrediction = () => {
    if (isComplete) {
      completePrediction();
      toast.success('순위 예측이 완료되었습니다!');
    }
  };

  // 저장 버튼 클릭
  const handleSave = () => {
    if (alreadySaved) {
      toast.error('이미 순위 예측을 저장하셨습니다.');
      return;
    }
    setShowSaveDialog(true);
  };

  // 저장 확인
  const confirmSave = async () => {
    if (isSaving || alreadySaved || !currentSeason) return;

    setIsSaving(true);

    try {
      const teamIds = extractTeamIds(rankings);
      
      await saveRankingPrediction({
        seasonYear: currentSeason,
        teamIdsInOrder: teamIds
      });

      toast.success(`${currentSeason} 시즌 예측이 저장되었습니다!`);
      setShowSaveDialog(false);
      setAlreadySaved(true);

    } catch (error: any) {
      if (error.message.includes('이미')) {
        setAlreadySaved(true);
      }
      toast.error(error.message || '저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  // 카카오톡 공유
  const handleShare = () => {
    if (!isKakaoSDKReady()) {
      toast.error('카카오톡 공유 기능을 불러올 수 없습니다.');
      return;
    }

    if (!isComplete) {
      toast.warning('10개 팀을 모두 배치한 후 공유할 수 있습니다.');
      return;
    }

    if (!userId) {
      toast.error('사용자 정보를 불러올 수 없습니다.');
      return;
    }

    try {
      const rankingText = generateRankingText(rankings);

      const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      const shareUrl = `${baseUrl}/predictions/ranking/share/${userId}/${currentSeason}`;


      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: `${currentSeason} KBO 시즌 순위 예측`,
          description: rankingText,
          imageUrl: `${supabaseUrl}/storage/v1/object/public/public-image/bega.png`,
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '나도 예측하기',
            link: {
              mobileWebUrl: `${baseUrl}/prediction`,
              webUrl: `${baseUrl}/prediction`,
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

  const isComplete = isRankingComplete(rankings);

  return {
    // State
    showSaveDialog,
    setShowSaveDialog,
    isSaving,
    alreadySaved,
    currentSeason,
    isPredictionPeriod,
    isLoading,
    isAuthLoading,
    isLoggedIn,
    userId,
    
    // Store state
    rankings,
    availableTeams,
    isPredictionSaved,
    allTeams,
    
    // Store actions
    moveTeam,
    resetRankings,
    
    // Computed
    isComplete,
    
    // Handlers
    handleTeamClick,
    handleRemoveTeam,
    handleCompletePrediction,
    handleSave,
    confirmSave,
    handleShare,
  };
};