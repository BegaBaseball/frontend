import TeamLogo from './TeamLogo';
import RankingItem from './ranking/RankingItem';
import { useRankingPredictionShare } from '../hooks/useRankingPredictionShare';

export default function RankingPredictionShare() {
  const { seasonYear, rankings, isLoading } = useRankingPredictionShare();

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" 
             style={{ borderColor: '#2d5f4f' }}></div>
        <p className="text-gray-600">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6 text-center" style={{ color: '#2d5f4f' }}>
          {seasonYear} KBO 시즌 순위 예측
        </h1>

        <div className="space-y-2">
          {rankings.map((team, index) => (
            <RankingItem
              key={index}
              team={team}
              index={index}
              alreadySaved={true} // 공유된 예측은 수정 불가
              onRemove={() => {}} // 동작 안함
              onMove={() => {}}   // 동작 안함
            />
          ))}
        </div>

        <div className="mt-8 text-center">
          <a 
            href="/prediction"
            className="inline-block px-6 py-3 text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#2d5f4f', fontWeight: 700 }}
          >
            나도 예측하기
          </a>
        </div>
      </div>
    </div>
  );
}