import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { Card } from '../ui/card';
import { useDiaryStore } from '../../store/diaryStore';
import worstEmoji from 'figma:asset/7642c88659d68a93b809e39f4c56d9c284123115.png';
import fullEmoji from 'figma:asset/691ca553a888de6b3262d9c3c63d03f37db27b4a.png';
import bestEmoji from 'figma:asset/19b0bb1cde805dc5d6e6af053a4bd1622a1a4fad.png';
import angryEmoji from 'figma:asset/01cb53a9197c5457e6d7dd7460bdf1cd27b5440b.png';
import happyEmoji from 'figma:asset/e2bd5a0f58df48e435d03f049811638d849de606.png';
import type { DiaryStatistics } from '../../store/diaryStore';

type ViewMode = 'diary' | 'stats';
export default function DiaryStatistics() {
  const { diaryEntries, cheerPostCount, mateParticipationCount } = useDiaryStore();
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState<DiaryStatistics>({
      totalCount: 0,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      winRate: 0,
      monthlyCount: 0,
      yearlyCount: 0,
      yearlyWins: 0,
      yearlyWinRate: 0,
      mostVisitedStadium: null,
      mostVisitedCount: 0,
      happiestMonth: null,
      happiestCount: 0,
      firstDiaryDate: null,
      cheerPostCount: 0,
      mateParticipationCount: 0,
    });

  const emojiStats = useMemo(() => {
    const stats = {
      최악: 0,
      배부름: 0,
      최고: 0,
      분노: 0,
      즐거움: 0
    };
    
    diaryEntries.forEach(entry => {
      if (entry.emojiName && entry.emojiName in stats) {
        stats[entry.emojiName as keyof typeof stats]++;
      }
    });
    
    return [
      { name: '최악', emoji: worstEmoji, count: stats.최악 },
      { name: '배부름', emoji: fullEmoji, count: stats.배부름 },
      { name: '최고', emoji: bestEmoji, count: stats.최고 },
      { name: '분노', emoji: angryEmoji, count: stats.분노 },
      { name: '즐거움', emoji: happyEmoji, count: stats.즐거움 }
    ];
  }, [diaryEntries]);

  const totalEmojiCount = emojiStats.reduce((sum, item) => sum + item.count, 0);
  
  useEffect(() => {
      const fetchStatistics = async () => {
        try {
          setLoading(true);
          const response = await fetch('/api/diary/statistics', {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });
  
          if(!response.ok) {
            throw new Error('통계 조회 실패');
          }
          const data: DiaryStatistics = await response.json();
          setStatistics(data);
        } catch(error) {
          alert('통계를 불러오는데 실패했습니다.')
        } finally {
          setLoading(false);
        }
      };
      fetchStatistics();
    }, [diaryEntries, cheerPostCount, mateParticipationCount]);

  return (

    <>
         {/* Card 시작 */}
        <Card className="p-8">
            {/* 간단한 통계 정보 */}
            <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                <div className="text-center">
                    <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                        {statistics.totalCount}
                    </div>
                    <div className="text-sm text-gray-600">직관 횟수</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                        {statistics?.cheerPostCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">응원글</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                        {statistics.winRate.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">승률</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                        {statistics.mateParticipationCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">메이트 참여</div>
                </div>
            </div>
        </Card> 
        {/* Card 끝 */}

        {/* 통계 보기 뷰 */}
            <div className="space-y-8 mt-8">
                {/* 월간 통계 */}
                <Card className="p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <TrendingUp className="w-7 h-7" style={{ color: '#2d5f4f' }} />
                        <h2 style={{ color: '#2d5f4f', fontWeight: 900 }}>월간 기분 통계</h2>
                    </div>

                    <div className="flex items-center justify-around mb-6">
                        {emojiStats.map((item, index) => (
                            <div key={index} className="text-center">
                                <img src={item.emoji} alt={item.name} className="w-20 h-20 mx-auto mb-2 object-contain" />
                                <div className="text-2xl mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                    {item.count}
                                </div>
                                <div className="text-sm text-gray-600">{item.name}</div>
                            </div>
                        ))}
                    </div>

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
                                    {statistics?.winRate?.toFixed(1) || 0}% ({statistics?.totalWins || 0}승 {statistics?.totalDraws || 0}무 {statistics?.totalLosses || 0}패)
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
                                {statistics?.yearlyCount || 0}
                            </div>
                            <div className="text-sm text-gray-600">총 직관 횟수</div>
                        </div>
                        <div className="bg-green-50 p-6 rounded-xl text-center">
                            <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                {statistics?.yearlyWins || 0}승
                            </div>
                            <div className="text-sm text-gray-600">응원팀 승리</div>
                        </div>
                        <div className="bg-green-50 p-6 rounded-xl text-center">
                            <div className="text-3xl mb-2" style={{ fontWeight: 900, color: '#2d5f4f' }}>
                                {statistics?.yearlyWinRate?.toFixed(1) || 0}%
                            </div>
                            <div className="text-sm text-gray-600">연간 승률</div>
                        </div>
                    </div>

                    <div className="border-t pt-6 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">가장 많이 간 구장</span>
                            <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                {statistics?.mostVisitedStadium || '없음'} ({statistics?.mostVisitedCount || 0}회)
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">가장 행복했던 달</span>
                            <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                {statistics?.happiestMonth || '없음'} (최고 {statistics?.happiestCount || 0}회)
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-700">첫 직관</span>
                            <span style={{ fontWeight: 700, color: '#2d5f4f' }}>
                                {statistics?.firstDiaryDate || null}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>
    </>
  );



}