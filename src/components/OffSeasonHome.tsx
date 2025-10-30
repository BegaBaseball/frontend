import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, TrendingUp, Award, Clock } from 'lucide-react';
import TeamLogo from './TeamLogo';

interface OffSeasonHomeProps {
  selectedDate: Date;
}

export default function OffSeasonHome({ selectedDate }: OffSeasonHomeProps) {
  // 2026 시즌 개막일 계산
  const openingDay = new Date(2026, 2, 22); // 2026년 3월 22일
  const diffTime = openingDay.getTime() - selectedDate.getTime();
  const daysUntilOpening = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const stoveLeagueNews = [
    {
      category: '이적',
      team: 'LG',
      title: 'OO 선수 FA 계약',
      date: '2025.11.15'
    },
    {
      category: '우승팀',
      team: 'KT',
      title: '챔피언 퍼레이드',
      date: '2025.11.12'
    },
    {
      category: '구단',
      team: 'NC',
      title: '신인 드래프트',
      date: '2025.11.18'
    },
    {
      category: '감독',
      team: 'SSG',
      title: 'OO 신임 감독 선임',
      date: '2025.11.20'
    }
  ];

  const awards = [
    {
      award: 'MVP',
      playerName: '홍길동',
      team: 'LG',
      stats: '타율 .347, 38홈런, 120타점'
    },
    {
      award: '신인왕',
      playerName: '김철수',
      team: 'KT',
      stats: '14승 6패, 평균자책점 3.45'
    },
    {
      award: '타격왕',
      playerName: '이영희',
      team: 'SSG',
      stats: '타율 .358, 144안타'
    },
    {
      award: '홈런왕',
      playerName: '박민수',
      team: 'NC',
      stats: '45홈런, 115타점'
    },
    {
      award: '승리왕',
      playerName: '최승리',
      team: '두산',
      stats: '18승 7패, 평균자책점 2.98'
    },
    {
      award: '세이브왕',
      playerName: '강마무리',
      team: '기아',
      stats: '38세이브, 평균자책점 1.89'
    }
  ];

  const postSeasonResults = [
    {
      title: '우승',
      result: 'KT 위즈',
      detail: '한국시리즈 4-2 승'
    },
    {
      title: '준우승',
      result: 'SSG 랜더스',
      detail: '한국시리즈 2-4 패'
    },
    {
      title: '플레이오프',
      result: 'LG 트윈스',
      detail: 'PO 2-3 패'
    },
    {
      title: '와일드카드',
      result: 'NC 다이노스',
      detail: 'WC 2-1 승'
    }
  ];

  const finalRankings = [
    { rank: 1, team: 'LG 트윈스', logo: 'LG', games: '144', wins: '85', losses: '55', draws: '4', winRate: '0.607' },
    { rank: 2, team: 'KT 위즈', logo: 'KT', games: '144', wins: '83', losses: '57', draws: '4', winRate: '0.593' },
    { rank: 3, team: 'SSG 랜더스', logo: 'SSG', games: '144', wins: '75', losses: '65', draws: '4', winRate: '0.536' },
    { rank: 4, team: 'NC 다이노스', logo: 'NC', games: '144', wins: '74', losses: '68', draws: '2', winRate: '0.521' },
    { rank: 5, team: '두산 베어스', logo: '두산', games: '144', wins: '72', losses: '69', draws: '3', winRate: '0.511' },
    { rank: 6, team: '기아 타이거즈', logo: '기아', games: '144', wins: '70', losses: '71', draws: '3', winRate: '0.496' },
    { rank: 7, team: '삼성 라이온즈', logo: '삼성', games: '144', wins: '68', losses: '73', draws: '3', winRate: '0.482' },
    { rank: 8, team: '롯데 자이언츠', logo: '롯데', games: '144', wins: '65', losses: '76', draws: '3', winRate: '0.461' },
    { rank: 9, team: '한화 이글스', logo: '한화', games: '144', wins: '60', losses: '81', draws: '3', winRate: '0.426' },
    { rank: 10, team: '키움 히어로즈', logo: '키움', games: '144', wins: '58', losses: '83', draws: '3', winRate: '0.411' }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl" style={{ backgroundColor: '#2d5f4f' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
        </div>
        <div className="px-8 py-12 relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white text-3xl mb-2" style={{ fontWeight: 900 }}>2025-26 스토브리그</h2>
              <p className="text-white/80">다가오는 시즌을 준비하는 시간</p>
            </div>
            <div className="text-white text-right">
              <div className="text-sm text-white/80 mb-1">비시즌</div>
              <div className="text-2xl" style={{ fontWeight: 900 }}>
                {selectedDate.getFullYear()}.{selectedDate.getMonth() + 1}.{selectedDate.getDate()}(토)
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Countdown Card */}
      <Card className="overflow-hidden border-0 shadow-xl">
        <div className="text-center py-16 px-6 relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
          <div className="absolute inset-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full"></div>
          </div>
          <div className="relative z-10">
            <Clock className="w-16 h-16 mx-auto mb-6 text-white/80" />
            <h3 className="text-2xl mb-6 text-white" style={{ fontWeight: 900 }}>
              2026 시즌 개막까지
            </h3>
            <div className="inline-block px-12 py-6 rounded-2xl mb-6" style={{ backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
              <div className="text-7xl text-white" style={{ fontWeight: 900 }}>
                D-{daysUntilOpening}
              </div>
            </div>
            <p className="text-white/90 text-lg">2026년 3월 22일 개막 예정</p>
          </div>
        </div>
      </Card>

      {/* Stove League NOW */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5" style={{ color: '#2d5f4f' }} />
          <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>스토브리그 NOW</h3>
          <Badge className="ml-2 text-white" style={{ backgroundColor: '#ef4444' }}>LIVE</Badge>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {stoveLeagueNews.map((news, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-opacity-100" style={{ borderColor: index === 0 ? '#2d5f4f' : '#e5e7eb' }}>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <TeamLogo team={news.team} size={48} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge 
                      className="text-white"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      {news.category}
                    </Badge>
                    <span className="text-xs text-gray-500">{news.date}</span>
                  </div>
                  <p className="text-gray-900" style={{ fontWeight: 600 }}>{news.title}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Awards Section */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-5 h-5" style={{ color: '#2d5f4f' }} />
          <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>2025 시즌 시상식 결과</h3>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {awards.map((award, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow border-0">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg" 
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    <Trophy className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h4 className="mb-1" style={{ fontWeight: 900, color: '#2d5f4f' }}>{award.award}</h4>
                    <p className="text-gray-900" style={{ fontWeight: 600 }}>{award.playerName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                  <TeamLogo team={award.team} size={28} />
                  <span className="text-sm" style={{ color: '#2d5f4f', fontWeight: 600 }}>
                    {award.team}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{award.stats}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Post Season Results */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5" style={{ color: '#2d5f4f' }} />
          <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>2025 포스트시즌 주요 결과</h3>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {postSeasonResults.map((result, index) => (
            <Card 
              key={index} 
              className="p-6 text-center hover:shadow-xl transition-all border-2 hover:-translate-y-1"
              style={{ 
                borderColor: index === 0 ? '#2d5f4f' : '#e5e7eb',
                backgroundColor: index === 0 ? '#f0f9f6' : 'white'
              }}
            >
              <div className="mb-4">
                <Badge 
                  className="text-white text-sm px-4 py-1" 
                  style={{ backgroundColor: index === 0 ? '#2d5f4f' : index === 1 ? '#6b7280' : '#9ca3af' }}
                >
                  {result.title}
                </Badge>
              </div>
              <p className="mb-2 text-lg" style={{ fontWeight: 900, color: index === 0 ? '#2d5f4f' : '#1f2937' }}>
                {result.result}
              </p>
              <p className="text-sm text-gray-600">{result.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Final Rankings */}
      <section>
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5" style={{ color: '#2d5f4f' }} />
          <h3 style={{ fontWeight: 900, color: '#2d5f4f' }}>2025 시즌 최종 순위</h3>
        </div>

        <Card className="overflow-hidden shadow-lg border-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2" style={{ backgroundColor: '#2d5f4f', borderColor: '#2d5f4f' }}>
                  <th className="text-left py-4 px-6 text-white" style={{ fontWeight: 700 }}>순위</th>
                  <th className="text-left py-4 px-6 text-white" style={{ fontWeight: 700 }}>팀명</th>
                  <th className="text-center py-4 px-6 text-white" style={{ fontWeight: 700 }}>경기</th>
                  <th className="text-center py-4 px-6 text-white" style={{ fontWeight: 700 }}>승</th>
                  <th className="text-center py-4 px-6 text-white" style={{ fontWeight: 700 }}>패</th>
                  <th className="text-center py-4 px-6 text-white" style={{ fontWeight: 700 }}>무</th>
                  <th className="text-center py-4 px-6 text-white" style={{ fontWeight: 700 }}>승률</th>
                  <th className="text-center py-4 px-6 text-white" style={{ fontWeight: 700 }}>게임차</th>
                </tr>
              </thead>
              <tbody>
                {finalRankings.map((team, index) => {
                  const gameDiff = index === 0 ? '-' : ((parseFloat(finalRankings[0].winRate) - parseFloat(team.winRate)) * 144 / 2).toFixed(1);
                  return (
                    <tr 
                      key={team.rank} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                      style={{ backgroundColor: team.rank <= 3 ? '#f9fafb' : 'white' }}
                    >
                      <td className="py-5 px-6">
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white shadow-sm"
                          style={{ 
                            backgroundColor: team.rank <= 5 ? '#2d5f4f' : '#9ca3af',
                            fontWeight: 900 
                          }}
                        >
                          {team.rank}
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-3">
                          <TeamLogo team={team.logo} size={32} />
                          <span style={{ fontWeight: team.rank <= 5 ? 700 : 400 }}>
                            {team.team}
                          </span>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-center text-gray-600">{team.games}</td>
                      <td className="py-5 px-6 text-center" style={{ color: '#2d5f4f', fontWeight: 700 }}>{team.wins}</td>
                      <td className="py-5 px-6 text-center text-gray-600">{team.losses}</td>
                      <td className="py-5 px-6 text-center text-gray-600">{team.draws}</td>
                      <td className="py-5 px-6 text-center text-lg" style={{ color: '#2d5f4f', fontWeight: 900 }}>{team.winRate}</td>
                      <td className="py-5 px-6 text-center text-gray-600">{gameDiff}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
