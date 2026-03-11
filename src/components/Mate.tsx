import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { KBO_STADIUMS, SEAT_CATEGORIES, SeatCategory } from '../utils/stadiumData';
import { SEAT_ICONS } from '../utils/seatIcons';
import { Sun, Cloud, CloudRain } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Plus,
  Users,
  Shield,
  Star,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useMateStore } from '../store/mateStore';
import { useAuthProfileSnapshot } from '../store/authStore';
import LoadingSpinner from './LoadingSpinner';
import TeamLogo, { resolveTeamDisplayName } from './TeamLogo';
import { Input } from './ui/input';
import { ProfileAvatar } from './ui/ProfileAvatar';
import { api } from '../utils/api';
import { mapBackendPartyToFrontend, formatGameDate, formatHostAverageRating, getDayOfWeek, getHostAverageRating } from '../utils/mate';
import { Party, PartyStatus, BadgeType } from '../types/mate';
import { useDebounce } from '../hooks/useDebounce';
import { MATE_SEARCH_DEBOUNCE_MS } from '../utils/constants';

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
  return (
    url.startsWith('/assets/')
    || url.startsWith('/src/assets/')
    || url.startsWith('blob:')
    || normalized.includes('/storage/v1/object/')
  );
};

export default function Mate() {
  const navigate = useNavigate();
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);
  const searchQuery = useMateStore((state) => state.searchQuery);
  const setSearchQuery = useMateStore((state) => state.setSearchQuery);
  const { userFavoriteTeam: favoriteTeam } = useAuthProfileSnapshot();
  const favoriteTeamId = favoriteTeam && favoriteTeam !== '없음' ? favoriteTeam : null;
  const [myTeamOnly, setMyTeamOnly] = useState(false);

  const [inputValue, setInputValue] = useState(searchQuery || '');
  const debouncedInput = useDebounce(inputValue, MATE_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery(debouncedInput);
  }, [debouncedInput, setSearchQuery]);

  const getStadiumFromQuery = (query: string) => {
    if (!query) return null;
    const normalized = query.toLowerCase();
    return Object.values(KBO_STADIUMS).find((stadium) =>
      stadium.name.includes(normalized)
      || stadium.homeTeam.toLowerCase().split('/').some((team) => normalized.includes(team.toLowerCase()))
      || (stadium.id === 'Daegu' && normalized.includes('삼성'))
      || (stadium.id === 'Jamsil' && (normalized.includes('lg') || normalized.includes('두산')))
      || (stadium.id === 'Incheon' && (normalized.includes('ssg') || normalized.includes('sk')))
      || (stadium.id === 'Gwangju' && normalized.includes('kia'))
      || (stadium.id === 'Suwon' && normalized.includes('kt'))
      || (stadium.id === 'Changwon' && normalized.includes('nc'))
      || (stadium.id === 'Sajik' && normalized.includes('롯데'))
      || (stadium.id === 'Gocheok' && normalized.includes('키움'))
      || (stadium.id === 'Daejeon' && normalized.includes('한화'))
    );
  };

  const currentStadium = getStadiumFromQuery(inputValue || '');

  const toggleSearchQuery = (keyword: string) => {
    setInputValue((prevInput) => {
      const normalizedInput = prevInput.trim();
      return normalizedInput.includes(keyword)
        ? normalizedInput.replace(keyword, '').replace(/\s+/g, ' ').trim()
        : `${normalizedInput} ${keyword}`.replace(/\s+/g, ' ').trim();
    });
    setCurrentPage(0);
  };

  const getWeatherIcon = (dateStr: string) => {
    const hash = dateStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const weatherTypes = [
      <Sun className="w-3.5 h-3.5 text-amber-400" />,
      <Cloud className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-400" />,
      <Sun className="w-3.5 h-3.5 text-amber-400" />,
      <CloudRain className="w-3.5 h-3.5 text-blue-400" />,
    ];
    return weatherTypes[hash % 4];
  };

  const getZoneName = (stadiumName: string, sectionName: string) => {
    const stadium = Object.values(KBO_STADIUMS).find((s) => stadiumName.includes(s.name) || s.name.includes(stadiumName));
    if (stadium) {
      const zone = stadium.zones.find((z) => z.keywords.some((k) => sectionName.includes(k)));
      if (zone) return zone.name;
    }
    return sectionName;
  };

  const [parties, setParties] = useState<Party[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const requestIdRef = useRef(0);
  const filterSignatureRef = useRef<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [activeTab, setActiveTab] = useState('all');
  const [brokenHostAvatarIds] = useState<Set<number>>(new Set());

  const pageSize = 9;

  const tabToStatusMap: Record<string, PartyStatus | undefined> = {
    all: undefined,
    recruiting: 'PENDING',
    matched: 'MATCHED',
    selling: 'SELLING',
  };
  const selectedStatus = tabToStatusMap[activeTab];

  useEffect(() => {
    const controller = new AbortController();
    const dateKey = selectedDate ? toDateString(selectedDate) : '';
    const teamKey = myTeamOnly && favoriteTeamId ? favoriteTeamId : '';
    const filterSignature = [
      debouncedInput.trim(),
      dateKey,
      selectedStatus ?? '',
      teamKey,
    ].join('|');

    if (
      filterSignatureRef.current !== null
      && filterSignatureRef.current !== filterSignature
      && currentPage !== 0
    ) {
      filterSignatureRef.current = filterSignature;
      setCurrentPage(0);
      return () => {
        controller.abort();
      };
    }

    filterSignatureRef.current = filterSignature;

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
        const isAbortError =
          (error instanceof DOMException && error.name === 'AbortError')
          || (error instanceof Error && error.name === 'AbortError');
        if (isAbortError) return;
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

  const getBadgeIcon = (badge: BadgeType) => {
    if (badge === 'VERIFIED') return <Shield className="w-3.5 h-3.5 text-primary" />;
    if (badge === 'TRUSTED') return <Star className="w-3.5 h-3.5 text-primary" />;
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
      <div className="text-center py-20 bg-white dark:bg-[#16181c] rounded-2xl border border-gray-200/70 dark:border-white/5">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-500 dark:text-zinc-600" />
        <p className="text-gray-900 dark:text-zinc-200 font-medium mb-2">
          {isSearchEmpty ? messages.withFilter : messages.withoutFilter}
        </p>
        {isSearchEmpty ? (
          <>
            <p className="text-gray-500 dark:text-zinc-500 text-sm mb-6">검색어나 날짜 필터를 변경해보세요</p>
            <Button
              variant="outline"
              size="sm"
              className="text-primary border-primary/25 bg-primary/10 hover:bg-primary/15"
              onClick={() => {
                setSelectedDate(null);
                setInputValue('');
                setCurrentPage(0);
              }}
            >
              필터 초기화
            </Button>
          </>
        ) : (
          <>
            <p className="text-gray-500 dark:text-zinc-500 text-sm mb-6">첫 번째 파티를 만들어보세요!</p>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground font-bold hover:bg-primary-hover"
              onClick={() => navigate('/mate/create')}
            >
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
    <div className="flex items-center justify-center gap-4 mt-10 mb-8">
      <Button
        variant="outline"
        className="border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#16181c] text-gray-700 dark:text-zinc-300 hover:bg-primary/15 hover:text-primary-foreground"
        onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
        disabled={currentPage === 0}
        size="sm"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />이전
      </Button>
      <span className="text-sm font-medium text-gray-500 dark:text-zinc-400">
        {currentPage + 1} <span className="text-gray-600 dark:text-zinc-600 mx-1">/</span> {totalPages}
      </span>
      <Button
        variant="outline"
        className="border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#16181c] text-gray-700 dark:text-zinc-300 hover:bg-primary/15 hover:text-primary-foreground"
        onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={currentPage === totalPages - 1}
        size="sm"
      >
        다음<ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );

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
    const progressPercent = Math.min(100, (party.currentParticipants / party.maxParticipants) * 100);
    const shouldFallbackAvatar = brokenHostAvatarIds.has(party.id) || isLegacyHostAvatarUrl(party.hostProfileImageUrl);
    const hostAvatarSrc = shouldFallbackAvatar ? undefined : party.hostProfileImageUrl;
    const zoneName = getZoneName(party.stadium, party.section);

    const amount = party.status === 'SELLING' && party.price ? party.price : (party.ticketPrice || 0);
    const flowLabel = party.status === 'SELLING' ? '판매 티켓' : '직거래 베타';

    const ticketTrustLabel = party.ticketVerified ? '티켓 인증' : '인증 전';
    const hostBadgeIcon = getBadgeIcon(party.hostBadge);
    const hostAverageRating = getHostAverageRating(party);
    const hostReviewLabel = formatHostAverageRating(party);

    const getCombinedStatusBadge = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const target = new Date(party.gameDate);
      target.setHours(0, 0, 0, 0);
      const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const dDayStr = diff === 0 ? 'D-Day' : diff < 0 ? '' : `D-${diff}`;

      let statusConfig = { label: '마감', bg: 'bg-primary/8', text: 'text-primary/80', border: 'border-primary/20' };

      if (party.status === 'PENDING') {
        statusConfig = { label: '모집 중', bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30' };
      } else if (party.status === 'SELLING') {
        statusConfig = { label: '티켓 판매', bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30' };
      } else if (party.status === 'MATCHED') {
        statusConfig = { label: '매칭 완료', bg: 'bg-primary/12', text: 'text-primary', border: 'border-primary/30' };
      }

      return (
        <div className={`flex items-center rounded-md border ${statusConfig.border} ${statusConfig.bg} px-2.5 py-1`}>
          {dDayStr && <span className={`text-[10px] font-bold ${statusConfig.text} mr-1.5 pr-1.5 border-r border-current/30`}>{dDayStr}</span>}
          <span className={`text-[11px] font-bold ${statusConfig.text}`}>{statusConfig.label}</span>
        </div>
      );
    };

    return (
      <Card
        key={party.id}
        className="group relative cursor-pointer overflow-hidden rounded-[24px] border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#16181c] transition-all duration-300 hover:-translate-y-1 hover:border-primary/20 dark:hover:border-white/20 hover:shadow-[0_8px_30px_rgba(15,23,42,0.12)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] flex flex-col"
        onClick={() => handlePartyClick(party)}
      >
        <div className="p-4 flex-1 flex flex-col">
          {/* Header Badges */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="flex items-center gap-1.5 border-gray-200/80 bg-primary/5 dark:border-white/10 text-gray-700 dark:text-zinc-300 px-2.5 py-1">
                <span className="font-mono text-[11px]">{formatGameDate(party.gameDate)}</span>
                {getWeatherIcon(party.gameDate)}
              </Badge>
              <Badge variant="outline" className="border-gray-200/80 bg-primary/5 dark:border-white/10 text-gray-700 dark:text-zinc-300 px-2.5 py-1 text-[11px]">
                {party.stadium}
              </Badge>
            </div>
            {getCombinedStatusBadge()}
          </div>

          {/* Main Title & Price */}
          <div className="mb-5">
            <div className="flex justify-between items-start gap-4 mb-1">
              <h3 className="text-[22px] font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{zoneName}</h3>
              <span className="text-xl font-bold text-gray-900 dark:text-white shrink-0">
                {amount.toLocaleString()}
                <span className="text-sm font-medium text-gray-500 dark:text-zinc-500 ml-0.5">원</span>
              </span>
            </div>
            <p className="text-[13px] text-gray-500 dark:text-zinc-400 line-clamp-1">{party.section}</p>
          </div>

          {/* VS Block (간결하게 변경) */}
          <div className="flex items-center justify-between bg-gray-100 dark:bg-black/30 rounded-2xl p-3.5 mb-5 border border-gray-200 dark:border-white/5">
            <div className="flex flex-col items-center gap-2 w-[40%]">
              <TeamLogo teamId={party.homeTeam} size={44} className="drop-shadow-md" />
              <span className="text-[12px] font-bold text-gray-700 dark:text-zinc-300 truncate w-full text-center">
                {resolveTeamDisplayName(party.homeTeam)}
              </span>
            </div>
            <div className="text-sm font-black italic text-primary bg-primary/5 px-2 py-1 rounded">VS</div>
            <div className="flex flex-col items-center gap-2 w-[40%]">
              <TeamLogo teamId={party.awayTeam} size={44} className="drop-shadow-md" />
              <span className="text-[12px] font-bold text-gray-700 dark:text-zinc-300 truncate w-full text-center">
                {resolveTeamDisplayName(party.awayTeam)}
              </span>
            </div>
          </div>

          {/* Info Rows (아이콘 기반) */}
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-2 px-1 mb-4">
            <div className="flex items-center gap-2 text-[13px]">
              <Shield className={`w-4 h-4 ${party.ticketVerified ? 'text-primary' : 'text-gray-500 dark:text-zinc-500'}`} />
              <span className={party.ticketVerified ? 'text-primary' : 'text-gray-500 dark:text-zinc-500'}>{ticketTrustLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Star className={`w-4 h-4 ${hostAverageRating === null ? 'text-gray-400 dark:text-zinc-500' : 'text-primary'}`} />
              <span className={hostAverageRating === null ? 'text-gray-500 dark:text-zinc-500' : 'text-gray-700 dark:text-zinc-300'}>{hostReviewLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-gray-700 dark:text-zinc-300">{party.currentParticipants} <span className="text-gray-500 dark:text-zinc-500 mx-0.5">/</span> {party.maxParticipants}명</span>
            </div>
            <div className="flex items-center gap-2 text-[13px]">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary h-5 px-1.5 text-[10px] font-normal">
                {flowLabel}
              </Badge>
            </div>
          </div>

          {/* Bottom Host Area */}
          <div className="mt-auto pt-3 border-t border-gray-200 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ProfileAvatar
                src={hostAvatarSrc}
                alt={party.hostName}
                fallbackName={party.hostName}
                width={32}
                height={32}
                className="ring-1 ring-gray-200 dark:ring-white/10"
              />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-zinc-200 flex items-center gap-1.5">
                  {party.hostName} {hostBadgeIcon}
                </span>
                <span className="text-[11px] text-gray-500 dark:text-zinc-500">상세 정보 확인</span>
              </div>
            </div>

            {/* Progress Bar */}
              <div className="w-20">
              <div className="mb-1.5 flex justify-end text-[11px] font-bold text-primary">
                {progressPercent}%
              </div>
              <div className="h-1.5 w-full bg-gray-200 dark:bg-black/50 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="relative min-h-screen bg-gray-50 dark:bg-[#0a0a0a] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        
        {/* 헤더 영역 */}
        <div className="mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500 mb-1">
              Mate Flow
            </p>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              직관 메이트 찾기
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGuideOpen(!isGuideOpen)}
              className="text-gray-500 dark:text-zinc-400 hover:text-primary-foreground hover:bg-primary/15 rounded-full px-4"
            >
              {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
            </Button>
            <Button
              onClick={() => navigate('/mate/create')}
              className="rounded-full px-5 bg-primary text-primary-foreground font-bold hover:bg-primary-hover shadow-lg"
            >
              <Plus className="w-5 h-5 mr-1" strokeWidth={2.5} />
              파티 만들기
            </Button>
          </div>
        </div>

        {/* 이용 가이드 (Toggle) */}
        {isGuideOpen && (
            <Card className="mb-7 animate-in slide-in-from-top-2 border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#16181c] p-5 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
              <h3 className="mb-3 text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary" /> 안전한 직관을 위한 체크포인트
                </h3>
                <ul className="space-y-2 text-sm text-gray-500 dark:text-zinc-400">
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 dark:text-zinc-600">•</span> 거래 방식과 취소 규칙을 먼저 확인하세요.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 dark:text-zinc-600">•</span> 티켓 인증 여부와 호스트 평점을 함께 확인하세요.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gray-600 dark:text-zinc-600">•</span> 승인 후에는 채팅에서 만남 시간과 장소를 먼저 확정하세요.
                  </li>
                </ul>
              </div>
              <Button variant="ghost" size="icon" className="text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-white hover:bg-primary/15" onClick={() => setIsGuideOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        )}

        {/* 날짜 필터 (명확한 박스형 디자인으로 텍스트 깨짐 방지) */}
        <div className="mb-7 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-2 min-w-max items-center">
                <Button
                  variant={selectedDate === null ? 'default' : 'outline'}
                  onClick={() => { setSelectedDate(null); setCurrentPage(0); }}
                  className={`rounded-2xl h-[68px] px-6 font-bold transition-all ${
                    selectedDate === null
                  ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                  : 'bg-white dark:bg-[#16181c] border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-primary-foreground hover:border-primary/30'
                  }`}
                >
              전체
            </Button>
            <div className="w-px h-8 bg-primary/20 mx-1"></div>
            {dateItems.map((date, idx) => {
              const isSelected = selectedDate && toDateString(selectedDate) === toDateString(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setSelectedDate(isSelected ? null : date); setCurrentPage(0); }}
                  aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${getDayOfWeek(toDateString(date))}요일 필터`}
                  className={`flex flex-col items-center justify-center min-w-[56px] h-[68px] rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-transparent shadow-md'
                      : 'bg-white dark:bg-[#16181c] border-gray-200/80 dark:border-white/10 hover:border-primary/30'
                  }`}
                >
                <span className={`text-[11px] font-medium mb-1 ${isSelected ? 'text-primary-foreground' : isWeekend ? 'text-primary/80' : 'text-gray-500 dark:text-zinc-500'}`}>
                    {getDayOfWeek(toDateString(date))}
                  </span>
                  <span className={`text-lg font-bold ${isSelected ? 'text-primary-foreground' : 'text-gray-700 dark:text-zinc-300'}`}>
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 검색 및 퀵 필터 */}
        <div className="flex flex-col md:flex-row gap-3 mb-7">
          <div className="relative flex-1 md:max-w-md">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-zinc-500" />
            <Input
              type="text"
              placeholder="팀명, 구장, 좌석으로 검색 (예: 삼성 블루존)"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="pl-11 h-12 bg-white dark:bg-[#16181c] border-gray-200/80 dark:border-white/10 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder-zinc-500 rounded-2xl focus:ring-1 focus:ring-primary/40 focus:border-primary/50 transition-all"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide items-center">
            {favoriteTeamId && (
              <>
                <Button
                  variant="outline"
                  className={`rounded-full h-10 px-4 text-sm font-medium transition-colors ${
                    myTeamOnly ? 'bg-primary text-primary-foreground border-transparent' : 'bg-white dark:bg-[#16181c] border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-primary-foreground hover:border-primary/30'
                  }`}
                  onClick={() => { setMyTeamOnly(!myTeamOnly); setCurrentPage(0); }}
                >
                  <TeamLogo teamId={favoriteTeamId} size={16} className="mr-2 opacity-90" />
                  내 팀 경기만
                </Button>
                <div className="w-px h-5 bg-primary/20 mx-1"></div>
              </>
            )}

            {currentStadium ? (
              currentStadium.zones
                .filter((zone) => ['CHEERING', 'TABLE', 'PREMIUM'].includes(zone.category))
                .slice(0, 5)
                .map((zone) => (
                  <Button
                    key={zone.id}
                    variant="outline"
                    className={`rounded-full h-10 px-4 text-sm font-medium transition-colors ${
                      inputValue?.includes(zone.name) ? 'bg-primary text-primary-foreground border-transparent' : 'bg-white dark:bg-[#16181c] border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-primary-foreground hover:border-primary/30'
                    }`}
                    onClick={() => toggleSearchQuery(zone.name)}
                  >
                    <span className="mr-1.5 opacity-70">{SEAT_ICONS[zone.category]}</span> {zone.name}
                  </Button>
                ))
            ) : (
              Object.entries(SEAT_CATEGORIES)
                .filter(([key]) => ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING'].includes(key))
                .map(([key, info]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className={`rounded-full h-10 px-4 text-sm font-medium transition-colors ${
                      inputValue?.includes(info.label) ? 'bg-primary text-primary-foreground border-transparent' : 'bg-white dark:bg-[#16181c] border-gray-200/80 dark:border-white/10 text-gray-500 dark:text-zinc-400 hover:text-primary-foreground hover:border-primary/30'
                    }`}
                    onClick={() => toggleSearchQuery(info.label)}
                  >
                    <span className="mr-1.5 opacity-70">{SEAT_ICONS[key as SeatCategory]}</span> {info.label}
                  </Button>
                ))
            )}
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(0); }} className="mb-6">
          <TabsList className="bg-white dark:bg-[#16181c] border border-gray-200/70 dark:border-white/5 p-1.5 rounded-2xl mb-6 inline-flex relative h-auto">
            {['all', 'recruiting', 'matched', 'selling'].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
            className="relative rounded-xl px-5 py-2.5 text-sm font-medium transition-colors duration-300 data-[state=active]:text-primary-foreground text-gray-500 dark:text-zinc-400 bg-transparent"
              >
                {activeTab === tab && (
                  <motion.span
                    layoutId="activeTabMate"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
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

          {/* 상태 렌더링 */}
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <LoadingSpinner size="md" fullScreen={false} />
            </div>
          ) : fetchError ? (
            <div className="text-center py-16 bg-white dark:bg-[#16181c] rounded-2xl border border-dashed border-primary/30">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-primary" />
              <p className="text-gray-900 dark:text-zinc-200 font-medium">파티 목록을 불러오지 못했습니다</p>
              <p className="text-gray-500 dark:text-zinc-500 text-sm mt-1">네트워크 연결을 확인하고 다시 시도해주세요</p>
              <Button variant="outline" className="mt-5 border-primary/20 bg-primary/10 text-primary hover:bg-primary/15" onClick={() => setRetryCount((c) => c + 1)}>
                <RefreshCw className="w-4 h-4 mr-2" /> 다시 시도
              </Button>
            </div>
          ) : (
            <>
              {['all', 'recruiting', 'matched', 'selling'].map((tab) => (
                <TabsContent key={tab} value={tab} className="space-y-4 m-0">
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                    {parties.length === 0 ? renderEmptyState(tab as keyof typeof emptyMessagesByTab) : (
                      <>
                        {renderPartyGrid(parties)}
                        {totalPages > 1 && renderPagination()}
                      </>
                    )}
                  </motion.div>
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}
