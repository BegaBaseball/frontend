// hooks/useRankingPrediction.ts
import { useState, useEffect } from 'react';
import { usePredictionStore } from '../store/predictionStore';
import { 
  fetchCurrentSeason, 
  fetchSavedPrediction, 
  saveRankingPrediction 
} from '../api/ranking';
import { restoreTeamsFromIds } from '../utils/ranking'; 
import { toast } from 'sonner';

export const useRankingPrediction = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [alreadySaved, setAlreadySaved] = useState(false);
  const [currentSeason, setCurrentSeason] = useState<number | null>(null);
  const [isPredictionPeriod, setIsPredictionPeriod] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Zustand Store
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

  // ========== 초기화 ==========
  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    setIsLoading(true);

    try {
      // 1. 현재 시즌 조회
      const seasonData = await fetchCurrentSeason();
      setCurrentSeason(seasonData.seasonYear);
      setIsPredictionPeriod(true);

      // 2. 저장된 예측 조회
      const savedPrediction = await fetchSavedPrediction(seasonData.seasonYear);

      if (savedPrediction) {
        setAlreadySaved(true);
        loadSavedPrediction(savedPrediction.teamIdsInOrder);
        toast.info(`${seasonData.seasonYear} 시즌 순위 예측을 불러왔습니다.`);
      } else {
        resetRankings();
      }
    } catch (error: any) {
      console.error('초기화 실패:', error);
      setIsPredictionPeriod(false);
      toast.error(error.message || '예측 정보를 불러올 수 없습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // ========== 저장된 예측 복원 ==========
  const loadSavedPrediction = (teamIdsInOrder: string[]) => {
    console.log('복원할 팀 IDs:', teamIdsInOrder);
    console.log('사용 가능한 전체 팀:', allTeams);

    const restoredRankings = restoreTeamsFromIds(teamIdsInOrder, allTeams);
    console.log('복원된 순위:', restoredRankings);

    if (setRankings) {
      setRankings(restoredRankings);
    }
  };

  // ========== 팀 클릭 ==========
  const handleTeamClick = (team: any) => {
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    addTeamToRanking(team);
  };

  // ========== 팀 제거 ==========
  const handleRemoveTeam = (index: number) => {
    if (alreadySaved) {
      toast.warning('이미 저장된 예측은 수정할 수 없습니다.');
      return;
    }
    removeTeamFromRanking(index);
  };

  // ========== 예측 완료 ==========
  const handleCompletePrediction = () => {
    if (isComplete) {
      completePrediction();
      toast.success('순위 예측이 완료되었습니다!');
    }
  };

  // ========== 저장 다이얼로그 열기 ==========
  const handleSave = () => {
    if (alreadySaved) {
      toast.error('이미 순위 예측을 저장하셨습니다.');
      return;
    }
    setShowSaveDialog(true);
  };

  // ========== 저장 확정 ==========
  const confirmSave = async () => {
    if (isSaving || alreadySaved || !currentSeason) return;

    setIsSaving(true);

    try {
      const teamIds = rankings
        .filter((team) => team !== null)
        .map((team) => team!.shortName);

      // ✅ 이제 정상 작동
      await saveRankingPrediction(currentSeason, teamIds);

      toast.success(`${currentSeason} 시즌 예측이 저장되었습니다!`);
      setShowSaveDialog(false);
      setAlreadySaved(true);
    } catch (error: any) {
      console.error('저장 오류:', error);
      
      if (error.message.includes('이미')) {
        toast.error(error.message);
        setAlreadySaved(true);
      } else {
        toast.error('저장에 실패했습니다.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // ========== 공유 ==========
  const handleShare = () => {
    toast.success('공유 기능이 준비 중입니다!');
  };

  // ========== Computed Values ==========
  const isComplete = rankings.every((team) => team !== null);

  return {
    // State
    isLoading,
    isSaving,
    alreadySaved,
    currentSeason,
    isPredictionPeriod,
    showSaveDialog,
    setShowSaveDialog,

    // Store
    rankings,
    availableTeams,
    isPredictionSaved,
    allTeams,
    moveTeam,
    resetRankings,

    // Handlers
    handleTeamClick,
    handleRemoveTeam,
    handleCompletePrediction,
    handleSave,
    confirmSave,
    handleShare,

    // Computed
    isComplete,
  };
};