import { useState, useEffect, useRef } from 'react';
import { OptimizedImage } from './common/OptimizedImage';
import { useNavigate } from 'react-router-dom';
import { KBO_STADIUMS, SEAT_CATEGORIES, SeatCategory } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import { Sun, Cloud, CloudRain } from 'lucide-react'; // Mock Weather Icons
import { motion } from 'framer-motion';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Plus, Users, MapPin, Shield, Star, Search, ChevronLeft, ChevronRight, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';
import TeamLogo, { teamIdToName } from './TeamLogo';
import { Input } from './ui/input';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getTeamColorByAnyKey } from '../constants/teams';
import { api } from '../utils/api';
import { mapBackendPartyToFrontend, formatGameDate, getDayOfWeek } from '../utils/mate';
import { Party, PartyStatus, BadgeType } from '../types/mate';
import { useDebounce } from '../hooks/useDebounce';
import { MATE_SEARCH_DEBOUNCE_MS } from '../utils/constants';

// 날짜를 YYYY-MM-DD 문자열로 변환 (필터 비교용)
const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
};

const isLegacyHostAvatarUrl = (url?: string) => {
  if (!url) return true;
  const normalized = url.toLowerCase();
  return url.startsWith('/assets/')
    || url.startsWith('/src/assets/')
    || url.startsWith('blob:')
    || normalized.includes('/storage/v1/object/');
};

export default function Mate() {
  const navigate = useNavigate();
  const { setSelectedParty, searchQuery, setSearchQuery } = useMateStore();
  const user = useAuthStore((state) => state.user);
  const favoriteTeamId = user?.favoriteTeam && user.favoriteTeam !== '없음' ? user.favoriteTeam : null;
  const [myTeamOnly, setMyTeamOnly] = useState(false);

  // Local input state so the input responds instantly; debounced value is synced to the store
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const debouncedInput = useDebounce(inputValue, MATE_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);

  // Sync debounced input to the Zustand store (triggers API fetch)
  useEffect(() => {
    setSearchQuery(debouncedInput);
    setCurrentPage(0); // Explicitly reset page
  }, [debouncedInput, setSearchQuery]);

  // Helper to detect stadium from query
  const getStadiumFromQuery = (query: string) => {
    if (!query) return null;
    const normalized = query.toLowerCase();
    return Object.values(KBO_STADIUMS).find(stadium =>
      stadium.name.includes(normalized) ||
      stadium.homeTeam.toLowerCase().split('/').some(team => normalized.includes(team.toLowerCase())) ||
      (stadium.id === 'Daegu' && normalized.includes('삼성')) ||
      (stadium.id === 'Jamsil' && (normalized.includes('lg') || normalized.includes('두산'))) ||
      (stadium.id === 'Incheon' && (normalized.includes('ssg') || normalized.includes('sk'))) ||
      (stadium.id === 'Gwangju' && normalized.includes('kia')) ||
      (stadium.id === 'Suwon' && normalized.includes('kt')) ||
      (stadium.id === 'Changwon' && normalized.includes('nc')) ||
      (stadium.id === 'Sajik' && normalized.includes('롯데')) ||
      (stadium.id === 'Gocheok' && normalized.includes('키움')) ||
      (stadium.id === 'Daejeon' && normalized.includes('한화'))
    );
  };

  const currentStadium = getStadiumFromQuery(inputValue || '');

  // Helper for filter toggle (Enhanced)
  const toggleSearchQuery = (keyword: string) => {
    setInputValue((prevInput) => {
      const normalizedInput = prevInput.trim();
      return normalizedInput.includes(keyword)
        ? normalizedInput.replace(keyword, '').replace(/\s+/g, ' ').trim()
        : `${normalizedInput} ${keyword}`.replace(/\s+/g, ' ').trim();
    });
    setCurrentPage(0);
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
  const requestIdRef = useRef(0);

  // 새로운 필터 상태
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [brokenHostAvatarIds, setBrokenHostAvatarIds] = useState<Set<number>>(new Set());

  const pageSize = 9;

  const tabToStatusMap: Record<string, PartyStatus | undefined> = {
    all: undefined,
    recruiting: 'PENDING',
    matched: 'MATCHED',
    selling: 'SELLING',
  };
  const selectedStatus = tabToStatusMap[activeTab];

  // Removed reactive useEffect to prevent double-fetch race conditions
  // setCurrentPage(0) is now handled explicitly in event handlers

  // 컴포넌트 마운트 및 상태 변경 시 파티 목록 불러오기
  useEffect(() => {
    const controller = new AbortController();

    const fetchParties = async () => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setFetchError(false);
      try {
        const dateStr = selectedDate ? toDateString(selectedDate) : undefined;
        const teamIdFilter = myTeamOnly && favoriteTeamId ? favoriteTeamId : undefined;
        const effectiveQuery = debouncedInput.trim();
        const data = await api.getParties(
          teamIdFilter,
          undefined,
          currentPage,
          pageSize,
          selectedStatus,
          effectiveQuery || undefined,
          dateStr,
          controller.signal,
        );

        if (requestId !== requestIdRef.current) return;

        const mappedParties = data.content.map(mapBackendPartyToFrontend);
        setParties(mappedParties);
        setTotalPages(data.totalPages);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('파티 목록 불러오기 오류:', error);
        setFetchError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    void fetchParties();

    return () => {
      controller.abort();
    };
  }, [currentPage, debouncedInput, selectedDate, selectedStatus, retryCount, myTeamOnly, favoriteTeamId]);

  const handlePartyClick = (party: Party) => {
    setSelectedParty(party);
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

  const getBadgeIcon = (badge: BadgeType) => {
    if (badge === 'VERIFIED') return <Shield className="w-3 h-3 text-blue-500" />;
    if (badge === 'TRUSTED') return <Star className="w-3 h-3 text-yellow-500" />;
    return null;
  };

  const hasActiveFilters = !!(inputValue.trim() || selectedDate);

  const emptyMessagesByTab: Record<string, { withFilter: string; withoutFilter: string }> = {
    all: { withFilter: '검색 조건에 맞는 파티가 없습니다', withoutFilter: '아직 개설된 파티가 없습니다' },
    recruiting: { withFilter: '검색 조건에 맞는 모집 중 파티가 없습니다', withoutFilter: '현재 모집 중인 파티가 없습니다' },
    matched: { withFilter: '검색 조건에 맞는 매칭 완료 파티가 없습니다', withoutFilter: '매칭 완료된 파티가 없습니다' },
    selling: { withFilter: '검색 조건에 맞는 티켓 판매 파티가 없습니다', withoutFilter: '티켓 판매 중인 파티가 없습니다' },
  };

  const renderEmptyState = (tabKey: keyof typeof emptyMessagesByTab) => {
    const messages = emptyMessagesByTab[tabKey];
    const isSearchEmpty = hasActiveFilters;
    return (
      <div className="text-center py-24 bg-white dark:bg-card rounded-2xl border border-dashed border-gray-200 dark:border-border">
        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-700 dark:text-gray-200 font-semibold mb-1">
          {isSearchEmpty ? messages.withFilter : messages.withoutFilter}
        </p>
        {isSearchEmpty ? (
          <>
            <p className="text-gray-400 text-sm mb-3">검색어나 날짜 필터를 변경해보세요</p>
            <Button variant="outline" size="sm" className="text-primary border-primary/30" onClick={() => { setSelectedDate(null); setInputValue(''); setCurrentPage(0); }}>
              필터 초기화
            </Button>
          </>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-3">첫 번째 파티를 만들어보세요!</p>
            <Button size="sm" className="bg-primary text-white" onClick={() => navigate('/mate/create')}>
              <Plus className="w-4 h-4 mr-1" /> 파티 만들기
            </Button>
          </>
        )}
      </div>
    );
  };

  const renderPartyGrid = (items: Party[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {items.map(renderPartyCard)}
    </div>
  );

  const renderPagination = () => (
    <div className="flex items-center justify-center gap-4 mt-8">
      <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} size="sm"><ChevronLeft className="w-4 h-4" />이전</Button>
      <span className="text-sm text-gray-500">{currentPage + 1} / {totalPages}</span>
      <Button variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} size="sm">다음<ChevronRight className="w-4 h-4" /></Button>
    </div>
  );

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
    const homeTeamColor = getTeamColorByAnyKey(party.homeTeam);
    const progressPercent = Math.min(100, (party.currentParticipants / party.maxParticipants) * 100);
    const shouldFallbackAvatar = brokenHostAvatarIds.has(party.id) || isLegacyHostAvatarUrl(party.hostProfileImageUrl);
    const hostAvatarSrc = shouldFallbackAvatar ? undefined : party.hostProfileImageUrl;

    return (
      <Card
        key={party.id}
        className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 dark:border-border bg-white dark:bg-card rounded-xl"
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
                <Badge variant="outline" className="flex items-center gap-1 bg-gray-50 text-gray-600 border-gray-200 dark:bg-secondary dark:text-gray-300 dark:border-border whitespace-nowrap">
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
          <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-7xl font-black text-gray-100 dark:text-gray-300/70 -z-10 select-none italic opacity-50">VS</span>

          {/* 홈 팀 */}
          <div className="flex flex-col items-center gap-2 flex-1 z-10 w-1/3">
            <div className="relative transform transition-transform group-hover:scale-105">
              <TeamLogo teamId={party.homeTeam} size={64} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-1 truncate max-w-full">
                {teamIdToName[party.homeTeam.toLowerCase()] || party.homeTeam}
              </span>
              <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-border rounded px-1.5 py-0.5 bg-white dark:bg-card mt-1">HOME</span>
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
              <span className="text-[10px] text-gray-400 border border-gray-200 dark:border-border rounded px-1.5 py-0.5 bg-white dark:bg-card mt-1">AWAY</span>
            </div>
          </div>
        </div>

        {/* 하단: 좌석 및 가격 정보 */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 dark:bg-secondary/70 rounded-lg p-3 mb-3 border border-gray-100 dark:border-border flex justify-between items-center">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="truncate font-semibold">{getZoneName(party.stadium, party.section)}</span>
            </div>

            <div className="flex flex-col items-end">
              {party.status === 'SELLING' && party.price ? (
                <>
                  <span className="text-xs text-gray-400">판매가</span>
                  <span className="text-lg font-black text-primary">
                    {party.price.toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 ml-0.5">원</span>
                  </span>
                </>
              ) : (
                <>
                  <span className="text-lg font-black text-primary">
                    {(party.ticketPrice || 0).toLocaleString()}
                    <span className="text-sm font-normal text-gray-500 ml-0.5">원</span>
                  </span>
                  <span className="text-xs text-gray-400">+ 보증금 1만원</span>
                </>
              )}
            </div>
          </div>

          {/* 호스트 정보 & 참여 인원 Progress Bar */}
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-border pt-3">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 border border-gray-200">
                <AvatarImage
                  src={hostAvatarSrc}
                  className="object-cover"
                  onError={() => {
                    setBrokenHostAvatarIds((prev) => {
                      if (prev.has(party.id)) return prev;
                      const next = new Set(prev);
                      next.add(party.id);
                      return next;
                    });
                  }}
                />
                <AvatarFallback className="text-[10px] bg-primary text-white">
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
                <span className="font-medium text-primary">{party.currentParticipants}</span>
                <span className="text-gray-300">/</span>
                <span>{party.maxParticipants}명</span>
              </div>
              <div className="w-full h-1.5 bg-gray-200 dark:bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
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
    <div className="min-h-screen bg-gray-50 dark:bg-background transition-colors duration-200">
      <OptimizedImage
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 w-full h-24 object-cover object-top z-0 pointer-events-none opacity-30 dark:opacity-10"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* 헤더 영역 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 text-primary">
              직관 메이트 찾기
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-300">함께 응원할 직관 친구를 찾아보세요!</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="text-gray-500 hover:text-primary"
            >
              {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
            </Button>
            <Button
              onClick={() => navigate('/mate/create')}
              className="rounded-full px-5 shadow-lg hover:shadow-xl transition-all bg-primary"
            >
              <Plus className="w-5 h-5 mr-1" />
              파티 만들기
            </Button>
          </div>
        </div>

        {/* 이용 가이드 (Toggle) */}
        {isGuideOpen && (
          <Card className="p-4 mb-6 border bg-[#f0f7f4] dark:bg-card border-primary/20 dark:border-border animate-in slide-in-from-top-2">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="mb-2 font-bold text-primary text-sm">🦺 안전한 직관을 위한 가이드</h3>
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
              onClick={() => { setSelectedDate(null); setCurrentPage(0); }}
              className={selectedDate === null ? 'bg-primary text-white border-transparent' : 'border-gray-300 text-gray-500'}
            >
              전체
            </Button>
            {dateItems.map((date, idx) => {
              const isSelected = selectedDate && toDateString(selectedDate) === toDateString(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              const dateLabel = `${toDateString(date)} ${getDayOfWeek(toDateString(date))}요일${isSelected ? ' (선택됨)' : ''}`;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setSelectedDate(isSelected ? null : date); setCurrentPage(0); }}
                  aria-label={dateLabel}
                  aria-pressed={Boolean(isSelected)}
                  className={`
                                flex flex-col items-center justify-center min-w-[60px] h-[70px] rounded-xl border cursor-pointer transition-all
                                ${isSelected
                      ? 'bg-primary border-primary text-white shadow-md'
                      : 'bg-white dark:bg-card border-gray-200 dark:border-border hover:border-primary hover:bg-gray-50'}
                            `}
                >
                  <span className={`text-xs ${!isSelected && isWeekend ? 'text-red-500' : ''}`}>{getDayOfWeek(toDateString(date))}</span>
                  <span className="text-lg font-bold">{date.getDate()}</span>
                </button>
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              aria-label="파티 검색"
              className="pl-10 h-12 bg-white dark:bg-card border-gray-200 dark:border-border rounded-xl focus:ring-primary focus:border-primary"
            />
          </div>

          {/* 내 팀 경기만 필터 (로그인 + 응원팀 설정 시 표시) */}
          {favoriteTeamId && (
            <Button
              variant={myTeamOnly ? 'default' : 'outline'}
              className={myTeamOnly ? 'bg-primary text-white border-transparent whitespace-nowrap' : 'border-gray-300 text-gray-600 dark:text-gray-300 whitespace-nowrap'}
              onClick={() => { setMyTeamOnly(!myTeamOnly); setCurrentPage(0); }}
            >
              {myTeamOnly ? (
                <><TeamLogo teamId={favoriteTeamId} size="sm" /><span className="ml-1.5">내 팀 경기 중</span></>
              ) : (
                <><TeamLogo teamId={favoriteTeamId} size="sm" /><span className="ml-1.5">내 팀 경기만</span></>
              )}
            </Button>
          )}

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
                    className={`rounded-full whitespace-nowrap transition-colors ${inputValue?.includes(zone.name)
                      ? "bg-primary text-white border-transparent"
                      : "border-gray-300 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary"
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
                    className={`rounded-full whitespace-nowrap transition-colors ${inputValue?.includes(info.label)
                      ? "bg-primary text-white border-transparent"
                      : "border-gray-300 text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary"
                      }`}
                    onClick={() => toggleSearchQuery(info.label)}
                  >
                    {SEAT_ICONS[key as SeatCategory]} {info.label}
                  </Button>
                ))
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(0); }} className="mb-6">
          <TabsList className="bg-gray-100 dark:bg-card p-1 rounded-xl mb-6 inline-flex relative">
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
            <LoadingSpinner size="md" fullScreen={false} />
          ) : fetchError ? (
            <div className="text-center py-24 bg-white dark:bg-card rounded-2xl border border-dashed border-red-200 dark:border-red-900">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-red-400" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">파티 목록을 불러오지 못했습니다</p>
              <p className="text-gray-400 text-sm mt-1">네트워크 연결을 확인하고 다시 시도해주세요</p>
              <Button variant="outline" className="mt-4" onClick={() => setRetryCount((c) => c + 1)}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> 다시 시도
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
                  {parties.length === 0 ? renderEmptyState('all') : (
                    <>
                      {renderPartyGrid(parties)}
                      {totalPages > 1 && renderPagination()}
                    </>
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
                  {parties.length === 0 ? renderEmptyState('recruiting') : (
                    <>
                      {renderPartyGrid(parties)}
                      {totalPages > 1 && renderPagination()}
                    </>
                  )}
                </motion.div>
              </TabsContent>
              <TabsContent value="matched">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {parties.length === 0 ? renderEmptyState('matched') : (
                    <>
                      {renderPartyGrid(parties)}
                      {totalPages > 1 && renderPagination()}
                    </>
                  )}
                </motion.div>
              </TabsContent>
              <TabsContent value="selling">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {parties.length === 0 ? renderEmptyState('selling') : (
                    <>
                      {renderPartyGrid(parties)}
                      {totalPages > 1 && renderPagination()}
                    </>
                  )}
                </motion.div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
