
import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Search, ChevronRight, ChevronLeft, Calculator, Trophy, Medal, Crown, TrendingUp, Loader2, Info, ChevronDown, Clock, Award } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { Button } from './ui/button';
import { getTeamKoreanName } from '../utils/teamNames';

interface OffSeasonHomeProps {
  selectedDate: Date;
}

interface OffseasonMovement {
  id: number;
  date: string;
  section: string;
  team: string; // teamCode
  player: string;
  remarks: string;
  bigEvent: boolean;
  estimatedAmount: number;
}

const API_BASE_URL = import.meta.env.VITE_NO_API_BASE_URL || 'http://localhost:8080';

// Helper to highlight money string
const formatRemarks = (text: string) => {
  if (!text) return text;
  // Regex for typical money patterns: "nn억", "nnn만원", "nn만달러"
  const parts = text.split(/(\d+(?:,\d+)*\s*(?:억|만\s*원|만\s*달러|달러))/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.match(/(\d+(?:,\d+)*)\s*(?:억|만\s*원|만\s*달러|달러)/)) {
          return <span key={i} className="font-bold text-[#2d5f4f] dark:text-[#4ade80]">{part}</span>;
        }
        return part;
      })}
    </span>
  );
};

export default function OffSeasonHome({ selectedDate }: OffSeasonHomeProps) {
  const navigate = useNavigate();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = useTheme();

  // Data State
  const [movements, setMovements] = useState<OffseasonMovement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Data State (Awards, PostSeason, Rankings)
  interface AwardData { award: string; playerName: string; team: string; stats: string; }
  interface PostSeasonResult { title: string; result: string; detail: string; }
  interface Ranking { rank: number; teamId: string; teamName: string; wins: number; losses: number; draws: number; winRate: string; games: number; }

  const [awards, setAwards] = useState<AwardData[]>([]);
  const [postSeasonResults, setPostSeasonResults] = useState<PostSeasonResult[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);

  // 2026 Season Opening Day
  const openingDay = new Date(2026, 2, 28);
  const diffTime = openingDay.getTime() - new Date().getTime();
  const daysUntilOpening = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch movements
        const movementsRes = await fetch(`${API_BASE_URL}/api/kbo/offseason/movements`);
        if (movementsRes.ok) {
          setMovements(await movementsRes.json());
        }

        // Fetch metadata (awards, postseason)
        const metadataRes = await fetch(`${API_BASE_URL}/api/kbo/offseason/metadata?year=2025`);
        if (metadataRes.ok) {
          const metadata = await metadataRes.json();
          setAwards(metadata.awards || []);
          setPostSeasonResults(metadata.postSeasonResults || []);
        }

        // Fetch rankings
        const rankingsRes = await fetch(`${API_BASE_URL}/api/kbo/rankings/2025`);
        if (rankingsRes.ok) {
          setRankings(await rankingsRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch offseason data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter for 2025 Stove League (Frontend Fail-safe)
  // Even if backend sends all data, we only show recent ones here.
  const stoveLeagueStart = "2024-11-01";
  const recentMovements = movements.filter(m => m.date >= stoveLeagueStart);

  // Filter Big Events (Top 4)
  const bigEvents = recentMovements.filter(m => m.bigEvent).slice(0, 4);

  // Use shared team name utility
  const getTeamName = (code: string) => {
    return getTeamKoreanName(code);
  };

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
                {new Date().toLocaleDateString()} 기준
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

      {/* Stove League Highlight Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-[#2d5f4f] p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">2025 주요 이적 소식</h3>
          <Badge className="ml-2 text-white animate-pulse border-none px-2 md:px-3 text-[10px] md:text-xs" style={{ backgroundColor: '#ef4444' }}>Breaking</Badge>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 md:p-6 border-none bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10 animate-pulse">
                <div className="flex items-start gap-4 md:gap-5">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : bigEvents.length === 0 ? (
          <Card className="p-10 md:p-16 text-center border-none bg-white dark:bg-gray-900 ring-1 ring-black/5 dark:ring-white/10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">아직 등록된 주요 이적 소식이 없습니다.</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">새로운 소식이 등록되면 여기에 표시됩니다.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {bigEvents.map((news, index) => (
              <Card key={news.id} className="p-4 md:p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-none bg-white dark:bg-gray-900 group ring-1 ring-black/5 dark:ring-white/10 relative overflow-hidden">
                {/* Highlight Background Effect */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-400/10 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-150"></div>

                <div className="flex items-start gap-4 md:gap-5 relative z-10">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-full bg-gray-50 border border-gray-100 dark:bg-gray-800 dark:border-gray-700 shadow-sm">
                      <TeamLogo team={getTeamName(news.team)} size={36} className="md:w-11 md:h-11" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                      <Badge className="text-white border-none font-bold text-[10px]" style={{ backgroundColor: '#2d5f4f' }}>{news.section}</Badge>
                      <span className="text-[10px] text-gray-400 font-medium">{news.date}</span>
                    </div>
                    <p className="text-gray-900 dark:text-white text-base md:text-lg font-bold group-hover:text-[#2d5f4f] dark:group-hover:text-[#4ade80] transition-colors line-clamp-1">
                      {news.player} ({getTeamName(news.team)})
                    </p>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                      {formatRemarks(news.remarks)}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Button to Open List Page */}
      <section className="flex justify-center pb-10">
        <Button
          onClick={() => navigate('/offseason/list')}
          className="bg-white dark:bg-gray-800 text-[#2d5f4f] dark:text-[#4ade80] border border-[#2d5f4f]/20 hover:bg-[#2d5f4f]/5 rounded-full px-8 py-6 text-lg font-bold shadow-lg hover:shadow-xl transition-all"
        >
          전체 이적 현황 보러가기 ({movements.length}건)
          <ChevronDown className="w-5 h-5 ml-2 -rotate-90" />
        </Button>
      </section>

      {/* Awards Section (Static) */}
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

      {/* PostSeason Bracket Section */}
      <section>
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <div className="bg-[#2d5f4f] p-1.5 md:p-2 rounded-lg md:rounded-xl">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <h3 className="text-xl md:text-2xl font-black text-[#2d5f4f] dark:text-[#4ade80]">2025 포스트시즌 결과</h3>
        </div>

        <Card className="p-6 md:p-10 overflow-x-auto bg-white dark:bg-gray-900 border-none shadow-xl rounded-2xl md:rounded-3xl ring-1 ring-black/5 dark:ring-white/10">
          <div className="min-w-[800px] flex items-center justify-center relative h-[400px] gap-12">

            {/* WC Stage (Left - Lowest) */}
            <div className="flex flex-col gap-4 relative z-10 translate-y-20">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-gray-400 text-center">와일드카드</span>
                <div className="flex flex-col gap-3 relative">
                  {/* Connector Line for WC: Goes UP to Semi */}
                  <div className="absolute right-[-48px] top-1/2 -translate-y-[1px] w-[48px] h-[2px] bg-gray-300 dark:bg-gray-600"></div>
                  <div className="absolute right-[-48px] top-[-46px] bottom-[50%] w-[2px] bg-gray-300 dark:bg-gray-600"></div>

                  <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-44">
                    <span className="text-sm font-bold text-gray-500 w-8">5위</span>
                    <TeamLogo team="NC" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">NC</span>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-[#2d5f4f] dark:border-[#4ade80] w-44 relative z-10">
                    <span className="text-sm font-bold text-[#2d5f4f] dark:text-[#4ade80] w-8">4위</span>
                    <TeamLogo team="삼성" size={24} />
                    <span className="font-bold text-gray-900 dark:text-white">삼성</span>
                    <Badge className="ml-auto text-[10px] bg-[#2d5f4f]">승</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Semi-PO Stage (Step Up) */}
            <div className="flex flex-col gap-4 relative z-10 translate-y-8">
              <span className="text-xs font-bold text-gray-400 text-center">준플레이오프</span>
              <div className="flex flex-col gap-8 relative">
                {/* Incoming Connector from WC */}
                <div className="absolute left-[-48px] bottom-[26px] w-[48px] h-[2px] bg-[#2d5f4f] dark:bg-[#4ade80]"></div>

                {/* Outgoing Connector to PO */}
                <div className="absolute right-[-48px] top-1/2 -translate-y-[1px] w-[48px] h-[2px] bg-gray-300 dark:bg-gray-600"></div>
                <div className="absolute right-[-48px] top-[-46px] bottom-[50%] w-[2px] bg-gray-300 dark:bg-gray-600"></div>

                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-48">
                  <span className="text-sm font-bold text-gray-500 w-8">3위</span>
                  <TeamLogo team="SSG" size={24} />
                  <span className="font-bold text-gray-900 dark:text-white">SSG</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-[#2d5f4f] dark:border-[#4ade80] w-48">
                  <span className="text-sm font-bold text-[#2d5f4f] dark:text-[#4ade80] w-8">WC</span>
                  <TeamLogo team="삼성" size={24} />
                  <span className="font-bold text-gray-900 dark:text-white">삼성</span>
                  <Badge className="ml-auto text-[10px] bg-[#2d5f4f] text-white">승</Badge>
                </div>
              </div>
            </div>

            {/* PO Stage (Step Up) */}
            <div className="flex flex-col gap-4 relative z-10 -translate-y-4">
              <span className="text-xs font-bold text-gray-400 text-center">플레이오프</span>
              <div className="flex flex-col gap-8 relative">
                {/* Incoming Connector from Semi */}
                <div className="absolute left-[-48px] bottom-[26px] w-[48px] h-[2px] bg-[#2d5f4f] dark:bg-[#4ade80]"></div>

                {/* Outgoing Connector to KS */}
                <div className="absolute right-[-48px] top-1/2 -translate-y-[1px] w-[48px] h-[2px] bg-gray-300 dark:bg-gray-600"></div>
                <div className="absolute right-[-48px] top-[-46px] bottom-[50%] w-[2px] bg-gray-300 dark:bg-gray-600"></div>


                <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border-2 border-[#2d5f4f] dark:border-[#4ade80] w-52">
                  <span className="text-sm font-bold text-[#2d5f4f] dark:text-[#4ade80] w-8">2위</span>
                  <TeamLogo team="한화" size={24} />
                  <span className="font-bold text-gray-900 dark:text-white">한화</span>
                  <Badge className="ml-auto text-[10px] bg-[#2d5f4f] text-white">승</Badge>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-52">
                  <span className="text-sm font-bold text-gray-500 w-8">준PO</span>
                  <TeamLogo team="삼성" size={24} />
                  <span className="font-bold text-gray-900 dark:text-white">삼성</span>
                </div>
              </div>
            </div>

            {/* KS Stage (Highest) */}
            <div className="flex flex-col gap-4 relative z-10 -translate-y-16">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-yellow-500" />
                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 text-center">한국시리즈</span>
              </div>

              <div className="flex flex-col gap-8 relative">
                {/* Incoming Connector from PO */}
                <div className="absolute left-[-48px] bottom-[30px] w-[48px] h-[2px] bg-[#2d5f4f] dark:bg-[#4ade80]"></div>

                <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-[#2d5f4f] to-[#1a3c34] rounded-xl shadow-lg shadow-emerald-900/20 border-none w-60 scale-110">
                  <span className="text-sm font-bold text-emerald-200 w-8">1위</span>
                  <TeamLogo team="LG" size={32} />
                  <span className="font-bold text-white text-lg">LG</span>
                  <Badge className="ml-auto text-[10px] bg-yellow-400 text-black hover:bg-yellow-500">V3</Badge>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 w-60 opacity-70">
                  <span className="text-sm font-bold text-gray-500 w-8">PO</span>
                  <TeamLogo team="한화" size={24} />
                  <span className="font-bold text-gray-900 dark:text-white">한화</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Final Rankings (Static) */}
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
                {rankings.map((team: Ranking) => (
                  <tr key={team.rank} className={`group transition-colors ${team.rank <= 3 ? 'bg-emerald-50/30 dark:bg-emerald-900/5' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/50`}>
                    <td className="py-4 px-4 md:px-6">
                      <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-white shadow-md font-black text-xs md:text-base ${team.rank <= 3 ? 'bg-[#2d5f4f] scale-105' : 'bg-gray-400 dark:bg-gray-700'}`}>
                        {team.rank}
                      </div>
                    </td>
                    <td className="py-4 px-4 md:px-6">
                      <div className="flex items-center gap-2 md:gap-4">
                        <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex-shrink-0">
                          <TeamLogo team={team.teamId} size={24} className="md:w-7 md:h-7" />
                        </div>
                        <span className="text-gray-900 dark:text-white font-bold text-xs md:text-base truncate max-w-[70px] md:max-w-none">
                          {team.teamName}
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