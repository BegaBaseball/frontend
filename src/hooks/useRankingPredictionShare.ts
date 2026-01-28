import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchSharedPrediction } from '../api/ranking';
import { restoreTeamsFromIds } from '../utils/ranking';
import { usePredictionStore } from '../store/predictionStore';
import { Team } from '../types/ranking';

export const useRankingPredictionShare = () => {
  const { userId, seasonYear } = useParams();
  const allTeams = usePredictionStore((state) => state.allTeams);

  const [rankings, setRankings] = useState<(Team | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSharedPrediction = async () => {
      if (!userId || !seasonYear) {
        toast.error('잘못된 접근입니다.');
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchSharedPrediction(userId, seasonYear);
        const restoredRankings = restoreTeamsFromIds(data.teamIdsInOrder, allTeams);
        setRankings(restoredRankings);
      } catch (error: any) {
        toast.error(error.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedPrediction();
  }, [userId, seasonYear, allTeams]);

  return {
    userId,
    seasonYear,
    rankings,
    isLoading,
  };
};