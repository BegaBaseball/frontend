import { useState, useEffect } from 'react';
import { OptimizedImage } from './common/OptimizedImage';
import { useNavigate } from 'react-router-dom';
import { KBO_STADIUMS, SEAT_CATEGORIES, SeatCategory, StadiumZone } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import { Sun, Cloud, CloudRain, CloudLightning } from 'lucide-react'; // Mock Weather Icons
import { motion, AnimatePresence } from 'framer-motion';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Plus, Users, MapPin, Calendar, Shield, Star, Search, TrendingUp, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import TeamLogo, { teamIdToName } from './TeamLogo';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import ChatBot from './ChatBot';
import { useAuthStore } from '../store/authStore';
import { TEAM_COLORS_MAP } from '../utils/constants';
import { api } from '../utils/api';
import { mapBackendPartyToFrontend, formatGameDate, getDayOfWeek } from '../utils/mate';
import { Party } from '../types/mate';
import { cn } from '../lib/utils'; // Assuming this exists, or I will use standard template literal

// 날짜를 YYYY-MM-DD 문자열로 변환 (필터 비교용)
const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

export default function Mate() {
  const navigate = useNavigate();
  const { setSelectedParty, searchQuery, setSearchQuery } = useMateStore();
  const currentUser = useAuthStore((state) => state.user);

  // Helper to detect stadium from query
  const getStadiumFromQuery = (query: string) => {
    if (!query) return null;
    const normalized = query.toLowerCase();
    return Object.values(KBO_STADIUMS).find(stadium =>
      stadium.name.includes(normalized) ||
      stadium.homeTeam.toLowerCase().split('/').some(team => normalized.includes(team.toLowerCase())) ||
      (stadium.id === 'Daegu' && normalized.includes('삼성')) ||
      (stadium.id === 'Jamsil' && (normalized.includes('lg') || normalized.includes('두산'))) ||
      (stadium.id === 'Incheon' && normalized.includes('ssg')) ||
      (stadium.id === 'Gwangju' && normalized.includes('kia')) ||
      (stadium.id === 'Suwon' && normalized.includes('kt')) ||
      (stadium.id === 'Changwon' && normalized.includes('nc')) ||
      (stadium.id === 'Sajik' && normalized.includes('롯데')) ||
      (stadium.id === 'Gocheok' && normalized.includes('키움')) ||
      (stadium.id === 'Daejeon' && normalized.includes('한화'))
    );
  };

  const currentStadium = getStadiumFromQuery(searchQuery || '');

  // Helper for filter toggle (Enhanced)
  const toggleSearchQuery = (keyword: string) => {
    // If query already contains this keyword, remove it
    if (searchQuery?.includes(keyword)) {
      setSearchQuery(searchQuery.replace(keyword, '').trim());
    } else {
      // Append to existing query or set as new
      setSearchQuery(searchQuery ? `${searchQuery} ${keyword}` : keyword);
    }
  };

  // Mock Weather Generator based on date
  const getWeatherIcon = (dateStr: string) => {
    const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const weatherTypes = [
      <Sun className="w-4 h-4 text-orange-400" />,
      <Cloud className="w-4 h-4 text-gray-400" />,
      <Sun className="w-4 h-4 text-orange-400" />,
      <CloudRain className="w-4 h-4 text-blue-400" />
    ];
    return weatherTypes[hash % 4];
  };

  // D-Day Calculator
  const getDDayBadge = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return <Badge className="bg-red-600 animate-pulse">D-Day</Badge>;
    if (diff < 0) return null;
    if (diff <= 3) return <Badge className="bg-orange-500">D-{diff}</Badge>;
    return <Badge variant="secondary" className="bg-gray-200 text-gray-600">D-{diff}</Badge>;
  };

  // Helper: Resolve Zone Name
  const getZoneName = (stadiumName: string, sectionName: string) => {
    // Find stadium
    const stadium = Object.values(KBO_STADIUMS).find(s => stadiumName.includes(s.name) || s.name.includes(stadiumName));
    if (stadium) {
      const zone = stadium.zones.find(z => z.keywords.some(k => sectionName.includes(k)));
      if (zone) return zone.name;
    }
    return sectionName; // Fallback
  };

  // 상태 변경
  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // 새로운 필터 상태
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');

  const pageSize = 9;

  // 컴포넌트 마운트 및 상태 변경 시 파티 목록 불러오기
  useEffect(() => {
    const fetchParties = async () => {
      setIsLoading(true);
      setFetchError(false);
      try {
        const dateStr = selectedDate ? toDateString(selectedDate) : undefined;
        const data = await api.getParties(undefined, undefined, currentPage, pageSize, searchQuery, dateStr);
        const mappedParties = data.content.map(mapBackendPartyToFrontend);
        setParties(mappedParties);
        setTotalPages(data.totalPages);
        setTotalElements(data.totalElements);
      } catch (error) {
        console.error('파티 목록 불러오기 오류:', error);
        setFetchError(true);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchParties();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [currentPage, searchQuery, selectedDate, retryCount]);

  const handlePartyClick = (party: Party) => {
    setSelectedParty(party);
    localStorage.setItem('selectedParty', JSON.stringify(party));
    navigate(`/mate/${party.id}`);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; textColor: string; tooltip: string }> = {
      PENDING: { label: '모집 중', color: '#dcfce7', textColor: '#166534', tooltip: '모집 중 - 참여 신청 가능' },
      MATCHED: { label: '매칭 성공', color: '#f3f4f6', textColor: '#374151', tooltip: '매칭 완료 - 모든 자리가 찼습니다' },
      FAILED: { label: '매칭 실패', color: '#fee2e2', textColor: '#991b1b', tooltip: '매칭 실패 - 모집 기간이 종료되었습니다' },
      SELLING: { label: '티켓 판매', color: '#ffedd5', textColor: '#9a3412', tooltip: '티켓 판매 중 - 호스트가 티켓을 판매합니다' },
      SOLD: { label: '판매 완료', color: '#f3f4f6', textColor: '#6b7280', tooltip: '판매 완료' },
      CHECKED_IN: { label: '체크인 완료', color: '#ede9fe', textColor: '#5b21b6', tooltip: '체크인 완료 - 참여자 전원 도착' },
      COMPLETED: { label: '관람 완료', color: '#f3f4f6', textColor: '#4b5563', tooltip: '관람 완료' },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge style={{ backgroundColor: config.color, color: config.textColor, border: 'none' }} className="font-medium cursor-help">
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const getBadgeIcon = (badge: string) => {
    if (badge === 'verified') return <Shield className="w-3 h-3 text-blue-500" />;
    if (badge === 'trusted') return <Star className="w-3 h-3 text-yellow-500" />;
    return null;
  };

  // 탭 별 필터링은 여전히 필요함 (보여주기 용)
  const pendingParties = parties.filter((p) => p.status === 'PENDING');
  const matchedParties = parties.filter((p) => p.status === 'MATCHED');
  const sellingParties = parties.filter((p) => p.status === 'SELLING');

  // 날짜 아이템 생성 (오늘부터 2주간)
  const generateDateItems = () => {
    const items = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      items.push(d);
    }
    return items;
  };

  const dateItems = generateDateItems();

  const renderPartyCard = (party: Party) => {
    const homeTeamColor = TEAM_COLORS_MAP[party.homeTeam.toLowerCase()] || '#2d5f4f';
    const progressPercent = Math.min(100, (party.currentParticipants / party.maxParticipants) * 100);

    return (
      <Card
        key={party.id}
        className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-xl"
        style={{ border: `4px solid ${homeTeamColor}` }} // Dynamic Team Color Border
        onClick={() => handlePartyClick(party)}
      >
        {/* Dynamic Background Tint on Hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
          style={{ backgroundColor: homeTeamColor }}
        ></div>

        {/* 상단: 날짜/구장 뱃지 & 상태 */}
        <div className="p-4 pb-0 flex justify-between items-start mb-2 flex-wrap gap-y-2">
          <div className="flex flex-col gap-1 w-full relative">
            <div className="flex justify-between items-center w-full">
              <div className="flex gap-2 items-center flex-wrap">
                <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 whitespace-nowrap">
                  {formatGameDate(party.gameDate)}
                  {getWeatherIcon(party.gameDate)}
                </Badge>
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800 truncate max-w-[120px]">
                  {party.stadium}
                </Badge>
              </div>
              {/* D-Day & Status */}
              <div className="flex items-center gap-2">
                {getDDayBadge(party.gameDate)}
                {getStatusBadge(party.status)}
              </div>
            </div>
          </div>
        </div>

        {/* 중앙: 대결 구도 (VS) 개선 */}
        <div className="px-6 py-5 flex items-center justify-between relative">
          {/* 배경에 VS 워터마크 */}
          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-7xl font-black text-gray-100 dark:text-gray-800/50 -z-10 select-none italic opacity-50">VS</span>

          {/* 홈 팀 */}
          <div className="flex flex-col items-center gap-2 flex-1 z-10 w-1/3">
            <div className="relative transform transition-transform group-hover:scale-105">
              <TeamLogo teamId={party.homeTeam} size={64} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1 truncate max-w-full">
                {teamIdToName[party.homeTeam.toLowerCase()] || party.homeTeam}
              </span>
              <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 mt-1">HOME</span>
            </div>
          </div>

          {/* VS 텍스트 */}
          <div className="flex flex-col items-center px-1 z-10">
            <span
              className="text-2xl font-black italic leading-none"
              style={{ color: homeTeamColor }}
            >
              VS
            </span>
          </div>

          {/* 어웨이 팀 */}
          <div className="flex flex-col items-center gap-2 flex-1 z-10 w-1/3">
            <div className="relative transform transition-transform group-hover:scale-105">
              <TeamLogo teamId={party.awayTeam} size={64} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1 truncate max-w-full">
                {teamIdToName[party.awayTeam.toLowerCase()] || party.awayTeam}
              </span>
              <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 bg-white dark:bg-gray-800 mt-1">AWAY</span>
            </div>
          </div>
        </div>

        {/* 하단: 좌석 및 가격 정보 */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3 border border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
              <MapPin className="w-4 h-4 text-[#2d5f4f]" />
              <span className="truncate font-semibold">{getZoneName(party.stadium, party.section)}</span>
            </div>

            <div className="flex flex-col items-end">
              {party.status === 'SELLING' && party.price ? (
                <>
                  <span className="text-xs text-gray-400">판매가</span>
                  <span className="text-lg font-black text-[#2d5f4f] dark:text-[#4ade80]">
                    {party.price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 ml-0.5">원</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-black text-[#2d5f4f] dark:text-[#4ade80]">
                    {(party.ticketPrice || 0).toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 ml-0.5">원</span>
                  </span>
                  <span className="text-xs text-gray-400">+ 보증금 1만원</span>
                </>
              )}
            </div>
          </div>

          {/* 호스트 정보 & 참여 인원 Progress Bar */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-gray-200">
                <AvatarImage src={party.hostProfileImageUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-[10px] bg-[#2d5f4f] text-white">
                  {party.hostName.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-500">{party.hostName}</span>
              <div className="flex items-center text-xs text-yellow-500">
                <Star className="w-3 h-3 fill-current mr-0.5" />
                {party.hostRating}
              </div>
            </div>

            {/* Participant Progress */}
            <div className="flex flex-col items-end gap-1 w-24">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span className="font-medium text-[#2d5f4f]">{party.currentParticipants}</span>
                <span className="text-gray-300">/</span>
                <span>{party.maxParticipants}명</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#2d5f4f] transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30 dark:opacity-10"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* 헤더 영역 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 style={{ color: '#2d5f4f' }} className="text-2xl font-bold mb-1">
              직관 메이트 찾기
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">함께 응원할 직관 친구를 찾아보세요!</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="text-gray-500 hover:text-[#2d5f4f]"
            >
              {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
            </Button>
            <Button
              onClick={() => navigate('/mate/create')}
              className="rounded-full px-5 shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <Plus className="w-5 h-5 mr-1" />
              파티 만들기
            </Button>
          </div>
        </div>

        {/* 이용 가이드 (Toggle) */}
        {isGuideOpen && (
          <Card className="p-4 mb-6 border bg-[#f0f7f4] dark:bg-[#1f4438]/20 border-[#2d5f4f]/20 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="mb-2 font-bold text-[#2d5f4f] text-sm">🦺 안전한 직관을 위한 가이드</h3>
                <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
                  <li>• <strong>보증금 제도:</strong> 노쇼 방지를 위해 소정의 보증금이 있을 수 있습니다.</li>
                  <li>• <strong>티켓 인증:</strong> 티켓 판매글은 예매 내역 인증 마크를 확인하세요.</li>
                  <li>• <strong>매너 응원:</strong> 상대 팀 비방이나 과격한 언행은 삼가주세요.</li>
                </ul>
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsGuideOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}

        {/* 날짜 필터 (가로 스크롤) */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            <Button
              variant={selectedDate === null ? 'default' : 'outline'}
              onClick={() => setSelectedDate(null)}
              className={selectedDate === null ? 'bg-[#2d5f4f] text-white border-transparent' : 'border-gray-300 text-gray-500'}
            >
              전체
            </Button>
            {dateItems.map((date, idx) => {
              const isSelected = selectedDate && toDateString(selectedDate) === toDateString(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(isSelected ? null : date)}
                  className={`
                                flex flex-col items-center justify-center min-w-[60px] h-[70px] rounded-xl border cursor-pointer transition-all
                                ${isSelected
                      ? 'bg-[#2d5f4f] border-[#2d5f4f] text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-[#2d5f4f] hover:bg-gray-50'}
                            `}
                >
                  <span className={`text-xs ${!isSelected && isWeekend ? 'text-red-500' : ''}`}>{getDayOfWeek(toDateString(date))}</span>
                  <span className="text-lg font-bold">{date.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 검색 및 퀵 필터 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="팀명, 구장, 좌석으로 검색해 보세요 (예: 삼성 블루존)"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-[#2d5f4f] focus:border-[#2d5f4f]"
            />
          </div>

          {/* Dynamic Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide max-w-full md:max-w-2xl">
            {currentStadium ? (
              // Stadium Recognized: Show specific zones
              currentStadium.zones
                .filter(zone => ['CHEERING', 'TABLE', 'PREMIUM'].includes(zone.category)) // Show popular ones first
                .slice(0, 5)
                .map(zone => (
                  <Button
                    key={zone.id}
                    variant="outline"
                    className={`rounded-full whitespace-nowrap transition-colors ${searchQuery?.includes(zone.name)
                      ? "bg-[#2d5f4f] text-white border-transparent"
                      : "border-gray-300 text-gray-600 dark:text-gray-300 hover:border-[#2d5f4f] hover:text-[#2d5f4f]"
                      }`}
                    onClick={() => toggleSearchQuery(zone.name)}
                  >
                    {SEAT_ICONS[zone.category]} {zone.name}
                  </Button>
                ))
            ) : (
              // No Stadium: Show generic categories
              Object.entries(SEAT_CATEGORIES)
                .filter(([key]) => ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING'].includes(key))
                .map(([key, info]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className={`rounded-full whitespace-nowrap transition-colors ${searchQuery?.includes(info.label)
                      ? "bg-[#2d5f4f] text-white border-transparent"
                      : "border-gray-300 text-gray-600 dark:text-gray-300 hover:border-[#2d5f4f] hover:text-[#2d5f4f]"
                      }`}
                    onClick={() => toggleSearchQuery(info.label)}
                  >
                    {SEAT_ICONS[key as SeatCategory]} {info.label}
                  </Button>
                ))
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 inline-flex relative">
            {['all', 'recruiting', 'matched', 'selling'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-300 data-[state=active]:text-white text-gray-500 hover:text-[#166534] bg-transparent"
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#166534] shadow-sm rounded-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {tab === 'all' && '전체'}
                  {tab === 'recruiting' && '모집 중'}
                  {tab === 'matched' && '매칭 완료'}
                  {tab === 'selling' && '티켓 판매'}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* 공통 상태 처리 (로딩, 에러, 빈 결과) */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#2d5f4f] mx-auto opacity-80"></div>
            </div>
          ) : fetchError ? (
            <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-red-200 dark:border-red-900">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">파티 목록을 불러오지 못했습니다</p>
              <p className="text-gray-400 text-sm mt-1">네트워크 연결을 확인하고 다시 시도해주세요</p>
              <Button variant="outline" className="mt-4" onClick={() => setRetryCount((c) => c + 1)}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> 다시 시도
              </Button>
            </div>
          ) : parties.length === 0 ? (
            <div className="text-center py-24 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 font-medium">조건에 맞는 파티가 없습니다</p>
              <Button variant="link" className="text-[#2d5f4f]" onClick={() => { setSelectedDate(null); setSearchQuery(''); }}>
                조건 초기화
              </Button>
            </div>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {parties.map(renderPartyCard)}
                  </div>
                  {/* 페이징 (기존 유지) */}
                  {!searchQuery && !selectedDate && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} size="sm"><ChevronLeft className="w-4 h-4" />이전</Button>
                      <span className="text-sm text-gray-500">{currentPage + 1} / {totalPages}</span>
                      <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} size="sm">다음<ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  )}
                </motion.div>
              </TabsContent>

              <TabsContent value="recruiting">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {pendingParties.map(renderPartyCard)}
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="matched">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {matchedParties.map(renderPartyCard)}
                  </div>
                </motion.div>
              </TabsContent>
              <TabsContent value="selling">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {sellingParties.map(renderPartyCard)}
                  </div>
                </motion.div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>

      <ChatBot />
    </div>
  );
}