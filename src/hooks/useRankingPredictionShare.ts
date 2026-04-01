import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchSharedPrediction } from '../api/rankingPublic';
import { restoreTeamsFromIds } from '../utils/ranking';
import { usePredictionStore } from '../store/predictionStore';
import { Team } from '../types/ranking';
import { getApiErrorMessage } from '../utils/errorUtils';

export const useRankingPredictionShare = () => {
  const { shareId, seasonYear } = useParams();
  const allTeams = usePredictionStore((state) => state.allTeams);

  const [rankings, setRankings] = useState<(Team | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSharedPrediction = async () => {
      if (!shareId || !seasonYear) {
        toast.error('잘못된 접근입니다.');
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchSharedPrediction(shareId, seasonYear);
        const restoredRankings = restoreTeamsFromIds(data.teamIdsInOrder, allTeams);
        setRankings(restoredRankings);
      } catch (error: unknown) {
        toast.error(getApiErrorMessage(error, '데이터를 불러오는데 실패했습니다.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedPrediction();
  }, [shareId, seasonYear, allTeams]);

  return {
    shareId,
    seasonYear,
    rankings,
    isLoading,
  };
};
