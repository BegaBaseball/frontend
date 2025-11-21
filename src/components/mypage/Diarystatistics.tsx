import { TrendingUp, BarChart3 } from 'lucide-react';
import { Card } from '../ui/card';
import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import StatCard from './StatCard';
import EmojiStatsCard from './EmojiStatsCard';

export default function DiaryStatistics() {
  const { statistics, emojiStats, isLoading } = useDiaryStatistics();

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          style={{ borderColor: '#2d5f4f' }}
        ></div>
        <p className="text-gray-600">통계를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <>
      {/* 간단한 통계 정보 */}
      <Card className="p-8">
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
          <StatCard value={statistics.totalCount} label="직관 횟수" />
          <StatCard value={statistics.cheerPostCount || 0} label="응원글" />
          <StatCard value={`${statistics.winRate.toFixed(1)}%`} label="승률" />
          <StatCard value={statistics.mateParticipationCount || 0} label="메이트 참여" />
        </div>
      </Card>

      {/* 통계 보기 뷰 */}
      <div className="space-y-8 mt-8">
        {/* 월간 통계 */}
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
            <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>월간 기분 통계</h2>
          </div>

          <EmojiStatsCard stats={emojiStats} />

          <div className="border-t pt-6 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">총 직관 횟수</span>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 900, fontSize: '20px', color: '#2d5f4f' }}>
                  {statistics.monthlyCount || 0}회
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">응원팀 승률</span>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                  {statistics.winRate.toFixed(1)}% ({statistics.totalWins}승{' '}
                  {statistics.totalDraws}무 {statistics.totalLosses}패)
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 연간 통계 */}
        <Card className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-7 h-7" style={{ color: '#2d5f4f' }} />
            <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>연간 직관 통계</h2>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="bg-green-50 p-6 rounded-xl text-center">
              <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                {statistics.yearlyCount || 0}
              </div>
              <div className="text-sm text-gray-600">총 직관 횟수</div>
            </div>
            <div className="bg-green-50 p-6 rounded-xl text-center">
              <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                {statistics.yearlyWins || 0}승
              </div>
              <div className="text-sm text-gray-600">응원팀 승리</div>
            </div>
            <div className="bg-green-50 p-6 rounded-xl text-center">
              <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                {statistics.yearlyWinRate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600">연간 승률</div>
            </div>
          </div>

          <div className="border-t pt-6 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">가장 많이 간 구장</span>
              <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                {statistics.mostVisitedStadium || '없음'} ({statistics.mostVisitedCount || 0}회)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">가장 행복했던 달</span>
              <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                {statistics.happiestMonth || '없음'} (최고 {statistics.happiestCount || 0}회)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700">첫 직관</span>
              <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                {statistics.firstDiaryDate || '없음'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}