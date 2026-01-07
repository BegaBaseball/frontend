import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Trophy, TrendingUp, Award, Clock, ChevronLeft } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

interface OffSeasonHomeProps {
  selectedDate: Date;
}

export default function OffSeasonHome({ selectedDate }: OffSeasonHomeProps) {
  // 2026 시즌 개막일 계산
  const openingDay = new Date(2026, 2, 28); // 2026년 3월 28일
  const diffTime = openingDay.getTime() - selectedDate.getTime();
  const daysUntilOpening = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const navigate = useNavigate();
  const { theme } = useTheme();

  const stoveLeagueNews = [
    { category: '이적', team: 'KT', title: '김현수 선수 FA 계약 3년 50억', date: '2025.11.25' },
    { category: '이적', team: '한화', title: '강백호 선수 FA 계약', date: '2025.11.22' },
    { category: '이적', team: '두산', title: '박찬호 선수 FA 계약', date: '2025.11.08' },
    { category: '코치', team: 'WO', title: '박병호 선수 은퇴 후 선임 코치', date: '2025.11.04' },
  ];

  const awards = [
    { award: 'MVP', playerName: '코디 폰세', team: '한화', stats: `17승 1패 평균자책점 1.89` },
    { award: '신인상', playerName: '안현민', team: 'KT', stats: '타율 .334 22홈런 80타점' },
    { award: '홈런상', playerName: '르윈 디아즈', team: '삼성', stats: '역대 최초 50홈런 158타점' },
    { award: '홀드상', playerName: '노경은', team: 'SSG', stats: '77경기 35홀드 최고령 홀드 갱신' },
    { award: '도루상', playerName: '박해민', team: 'LG', stats: '6월 역대 최초 12시즌 연속 20도루' },
    { award: '타율상', playerName: '양의지', team: '두산', stats: '타율 .337 3번째 포수 타격왕' },
  ];

  const postSeasonResults = [
    { title: '한국시리즈 우승', result: 'LG 트윈스', detail: '한화 이글스 KS 4-1 승' },
    { title: '플레이오프', result: '한화 이글스', detail: '삼성 라이온즈 PO 3-2 승' },
    { title: '준플레이오프', result: '삼성 라이온즈', detail: 'SSG 랜더스 준PO 2-3 승' },
    { title: '와일드카드', result: '삼성 라이온즈', detail: 'NC 다이노스 WC 1-1 승' }
  ];

  const finalRankings = [
    { rank: 1, team: 'LG 트윈스', logo: 'LG', games: '144', wins: '85', losses: '56', draws: '3', winRate: '0.603' },
    { rank: 2, team: '한화 이글스', logo: '한화', games: '144', wins: '83', losses: '57', draws: '4', winRate: '0.593' },
    { rank: 3, team: 'SSG 랜더스', logo: 'SSG', games: '144', wins: '75', losses: '65', draws: '4', winRate: '0.536' },
    { rank: 4, team: '삼성 라이온즈', logo: '삼성', games: '144', wins: '74', losses: '68', draws: '2', winRate: '0.521' },
    { rank: 5, team: 'NC 다이노스', logo: 'NC', games: '144', wins: '71', losses: '67', draws: '6', winRate: '0.514' },
    { rank: 6, team: 'KT 위즈', logo: 'KT', games: '144', wins: '71', losses: '68', draws: '5', winRate: '0.511' },
    { rank: 7, team: '롯데 자이언츠', logo: '롯데', games: '144', wins: '66', losses: '72', draws: '6', winRate: '0.478' },
    { rank: 8, team: 'KIA 타이거즈', logo: 'HT', games: '144', wins: '65', losses: '75', draws: '4', winRate: '0.464' },
    { rank: 9, team: '두산 베어스', logo: '두산', games: '144', wins: '61', losses: '77', draws: '6', winRate: '0.442' },
    { rank: 10, team: '키움 히어로즈', logo: '키움', games: '144', wins: '47', losses: '93', draws: '4', winRate: '0.336' }
  ];

  return (
    <div className="space-y-8 md:space-y-12 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors px-4 py-6 md:p-8">
      <button
          onClick={() => navigate('/home')}
          className="text-sm mb-2 flex items-center gap-2 group transition-all border-2 px-4 py-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
      >
          <span className="w-6 h-6 rounded-full bg-[#2d5f4f]/10 dark:bg-[#4ade80]/10 flex items-center justify-center transition-all group-hover:scale-110">
              <ChevronLeft className="w-4 h-4" />
          </span>
          <span className="group-hover:underline font-bold dark:text-[#4ade80]">메인페이지로 돌아가기</span>
      </button>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-xl border-none" style={{ backgroundColor: '#2d5f4f' }}>
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('/grid-pattern.svg')] bg-center"></div>
        <div className="px-6 py-10 md:px-8 md:py-12 relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <Badge className="bg-yellow-400 text-gray-900 mb-3 md:mb-4 hover:bg-yellow-500 border-none font-bold">2025-26 스토브리그</Badge>
              <h2 className="text-white text-2xl md:text-4xl mb-2" style={{ fontWeight: 900 }}>스토브리그 하이라이트</h2>
              <p className="text-emerald-100/80 text-base md:text-lg">다가오는 새로운 시즌을 준비하는 뜨거운 기록들</p>
            </div>
            <div className="text-white md:text-right bg-black/20 p-3 md:p-4 rounded-xl md:rounded-2xl backdrop-blur-sm border border-white/10 w-fit">
              <div className="text-[10px] md:text-xs text-white/60 mb-1 uppercase tracking-wider font-bold">OFF-SEASON STATUS</div>
              <div className="text-lg md:text-2xl font-black">
                {selectedDate.getFullYear()}.{selectedDate.getMonth() + 1}.{selectedDate.getDate()}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Countdown Card */}
      <Card className="overflow-hidden shadow-2xl bg-white dark:bg-gray-900 border-none rounded-2xl md:rounded-3xl">
        <div className="text-center py-12 md:py-16 px-6 relative overflow-hidden bg-gradient-to-br from-[#1a3c34] to-[#2d5f4f]">
          <div className="absolute inset-0 opacity-10">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[500px] md:h-[500px] bg-white rounded-full blur-3xl"></div>
          </div>
          <div className="relative z-10">
            <div className="bg-white/10 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
                <Clock className="w-8 h-8 md:w-10 md:h-10 text-yellow-400 animate-pulse" />
            </div>
            <h3 className="text-xl md:text-3xl mb-6 md:mb-8 text-white font-black tracking-tight">
              2026 시즌 개막까지
            </h3>
            <div className="inline-block px-8 py-4 md:px-12 md:py-8 rounded-[30px] md:rounded-[40px] mb-6 md:mb-8 shadow-2xl border border-white/20" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
              <div className="text-5xl md:text-8xl text-white font-black tracking-tighter">
                D-{daysUntilOpening}
              </div>
            </div>
            <p className="text-emerald-100/90 text-base md:text-xl font-medium">2026년 3월 28일 개막 예정 ⚾</p>
          </div>
        </div>
      </Card>

      {/* Stove League NOW */}
      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-[#2d5f4f] p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">스토브리그 NOW</h3>
          <Badge className="ml-2 text-white animate-pulse border-none px-2 md:px-3 text-[10px] md:text-xs" style={{ backgroundColor: '#ef4444' }}>LIVE</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {stoveLeagueNews.map((news, index) => (
            <Card key={index} className="p-4 md:p-6 hover:shadow-xl transition-all cursor-pointer border-none bg-white dark:bg-gray-900 group ring-1 ring-black/5 dark:ring-white/10">
              <div className="flex items-start gap-4 md:gap-5">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 shadow-sm">
                    <TeamLogo team={news.team} size={36} className="md:w-11 md:h-11" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                    <Badge className="text-white border-none font-bold text-[10px]" style={{ backgroundColor: '#2d5f4f' }}>{news.category}</Badge>
                    <span className="text-[10px] text-gray-400 font-medium">{news.date}</span>
                  </div>
                  <p className="text-gray-900 dark:text-white text-base md:text-lg font-bold group-hover:text-[#2d5f4f] dark:group-hover:text-[#4ade80] transition-colors line-clamp-2">{news.title}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Awards Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-[#2d5f4f] p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Award className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">시상식 결과</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {awards.map((award, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-all border-none bg-white dark:bg-gray-900 group ring-1 ring-black/5 dark:ring-white/10">
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-xl md:rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm transition-transform group-hover:rotate-6">
                    <TeamLogo team={award.team} size={36} className="md:w-11 md:h-11" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[10px] md:text-xs font-black text-[#2d5f4f] dark:text-[#4ade80] uppercase tracking-wider mb-0.5 md:mb-1">{award.award}</h4>
                    <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{award.playerName}</p>
                  </div>
                </div>
                <div className="pt-3 md:pt-4 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">{award.stats}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Post Season Results */}
      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-[#2d5f4f] p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">PS 주요 결과</h3>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {postSeasonResults.map((result, index) => (
            <Card
              key={index}
              className={`p-4 md:p-6 text-center hover:shadow-2xl transition-all border-none hover:-translate-y-1 ring-1 ${
                index === 0
                  ? 'bg-gradient-to-b from-white to-green-50 dark:from-gray-900 dark:to-green-900/10 ring-[#2d5f4f]/30 col-span-2 md:col-span-1'
                  : 'bg-white dark:bg-gray-900 ring-black/5 dark:ring-white/10'
              }`}
            >
              <div className="mb-3 md:mb-4">
                <Badge className={`text-white text-[9px] md:text-xs px-2 md:px-4 py-0.5 md:py-1 border-none font-bold ${index === 0 ? 'bg-[#2d5f4f]' : index === 1 ? 'bg-gray-600' : 'bg-gray-400'}`}>
                  {result.title}
                </Badge>
              </div>
              <p className={`mb-1 md:mb-2 text-base md:text-xl font-black ${index === 0 ? 'text-[#2d5f4f] dark:text-[#4ade80]' : 'text-gray-900 dark:text-white'}`}>
                {result.result}
              </p>
              <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 font-medium">{result.detail}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Final Rankings */}
      <section className="pb-10">
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-[#2d5f4f] p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">최종 순위</h3>
        </div>

        <Card className="overflow-hidden shadow-2xl border-none bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#2d5f4f] dark:bg-[#1a3c34]">
                  <th className="py-4 px-4 md:px-6 text-white font-bold uppercase text-[10px] md:text-xs">순위</th>
                  <th className="py-4 px-4 md:px-6 text-white font-bold uppercase text-[10px] md:text-xs">팀명</th>
                  <th className="py-4 px-4 md:px-6 text-white font-bold uppercase text-[10px] md:text-xs text-center hidden sm:table-cell">경기</th>
                  <th className="py-4 px-4 md:px-6 text-white font-bold uppercase text-[10px] md:text-xs text-center">승/패</th>
                  <th className="py-4 px-4 md:px-6 text-white font-bold uppercase text-[10px] md:text-xs text-center">승률</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {finalRankings.map((team, index) => (
                    <tr key={team.rank} className={`group transition-colors ${team.rank <= 3 ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                      <td className="py-4 px-4 md:px-6">
                        <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-white shadow-md font-black text-xs md:text-base ${team.rank <= 3 ? 'bg-[#2d5f4f] scale-105' : 'bg-gray-400 dark:bg-gray-700'}`}>
                          {team.rank}
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6">
                        <div className="flex items-center gap-2 md:gap-4">
                          <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex-shrink-0">
                            <TeamLogo team={team.logo} size={24} className="md:w-7 md:h-7" />
                          </div>
                          <span className="text-gray-900 dark:text-white font-bold text-xs md:text-base truncate max-w-[70px] md:max-w-none">
                            {team.team}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6 text-center text-gray-600 dark:text-gray-400 text-xs hidden sm:table-cell">{team.games}</td>
                      <td className="py-4 px-4 md:px-6 text-center">
                        <div className="flex flex-col md:flex-row items-center justify-center gap-0 md:gap-1.5">
                            <span className="text-emerald-600 dark:text-[#4ade80] font-bold text-xs md:text-sm">{team.wins}승</span>
                            <span className="text-rose-600 dark:text-rose-400 font-bold text-xs md:text-sm">{team.losses}패</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 md:px-6 text-center font-black text-gray-900 dark:text-white text-xs md:text-lg tabular-nums">{team.winRate}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}