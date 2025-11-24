import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import TeamLogo from './TeamLogo';
import { toast } from 'sonner@2.0.3';

interface Team {
  shortName: string;
  name: string;
}

export default function RankingPredictionShare() {
  const { userId, seasonYear } = useParams();
  const [rankings, setRankings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allTeams] = useState<Team[]>([ 
    // 여기에 전체 팀 데이터 복사 (predictionStore에서 가져오거나)
    { shortName: '두산', name: '두산 베어스' },
    { shortName: '삼성', name: '삼성 라이온즈' },
    // ... 나머지 팀들
  ]);

  useEffect(() => {
    const loadSharedPrediction = async () => {
      try {
        const response = await fetch(
          `/api/predictions/ranking/share/${userId}/${seasonYear}`
        );

        if (response.ok) {
          const data = await response.json();
          setRankings(data.teamIdsInOrder);
        } else {
          toast.error('예측을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('로드 실패:', error);
        toast.error('데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    loadSharedPrediction();
  }, [userId, seasonYear]);

  if (isLoading) {
    return <div className="text-center py-20">로딩중...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#2d5f4f' }}>
        {seasonYear} 시즌 순위 예측
      </h1>

      <div className="space-y-2">
        {rankings.map((teamId, index) => {
          const team = allTeams.find(t => t.shortName === teamId);
          if (!team) return null;

          return (
            <div
              key={index}
              className="border-2 rounded-xl p-3 bg-white shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
                  style={{
                    backgroundColor: index < 5 ? '#2d5f4f' : '#9ca3af',
                    fontWeight: 900,
                    fontSize: '1.1rem'
                  }}
                >
                  {index + 1}
                </div>
                <TeamLogo team={team.shortName} size={40} />
                <span style={{ fontWeight: 700 }}>{team.name}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}