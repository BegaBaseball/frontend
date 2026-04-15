import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { getMatePartyListQueryOptions } from '../hooks/mateQueryOptions';
import { seedMatePartyQueryData } from '../hooks/mateList';
import { useDebounce } from '../hooks/useDebounce';
import { useAuthProfileSnapshot } from '../store/authStore';
import { useMateStore } from '../store/mateStore';
import type { Party, PartyStatus } from '../types/mate';
import { MATE_SEARCH_DEBOUNCE_MS } from '../utils/constants';
import { SEAT_ICONS } from '../utils/seatIcons';
import { KBO_STADIUMS, SEAT_CATEGORIES, type SeatCategory } from '../utils/stadiumData';
import { buildMateRouteLocationState, getDayOfWeek } from '../utils/mate';
import TeamLogo from './TeamLogo';
import { MatePlusIcon, MateSearchIcon } from './MateIcons';
import { Button } from './ui/button';
import { Input } from './ui/input';

const MateGuidePanelRuntime = lazy(() => import('./MateGuidePanelRuntime'));
const MateResultsRuntime = lazy(() => import('./MateResultsRuntime'));

const MATE_TABS = [
  { key: 'all', label: '전체' },
  { key: 'recruiting', label: '모집 중' },
  { key: 'matched', label: '매칭 완료' },
  { key: 'selling', label: '티켓 판매' },
] as const;

type MateTabKey = typeof MATE_TABS[number]['key'];

const toDateString = (date: Date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return [year, month, day].join('-');
};

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

function MateGuideFallback() {
  return (
    <div className="mb-7 rounded-2xl border border-gray-200/80 bg-white px-4 py-8 text-center text-[16px] text-gray-500 shadow-lg dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-400">
      이용 가이드를 준비하고 있습니다.
    </div>
  );
}

function MateResultsFallback() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[304px] animate-pulse rounded-[24px] border border-gray-200/80 bg-white dark:border-white/10 dark:bg-[#16181c]"
          />
        ))}
      </div>
    </div>
  );
}

export default function Mate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const searchQuery = useMateStore((state) => state.searchQuery);
  const setSearchQuery = useMateStore((state) => state.setSearchQuery);
  const { userFavoriteTeam: favoriteTeam, userId: authUserId } = useAuthProfileSnapshot();
  const favoriteTeamId = favoriteTeam && favoriteTeam !== '없음' ? favoriteTeam : null;
  const [myTeamOnly, setMyTeamOnly] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery || '');
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<MateTabKey>('all');
  const filterSignatureRef = useRef<string | null>(null);
  const debouncedInput = useDebounce(inputValue, MATE_SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    setInputValue(searchQuery || '');
  }, [searchQuery]);

  useEffect(() => {
    setSearchQuery(debouncedInput);
  }, [debouncedInput, setSearchQuery]);

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

  const tabToStatusMap: Record<MateTabKey, PartyStatus | undefined> = {
    all: undefined,
    recruiting: 'PENDING',
    matched: 'MATCHED',
    selling: 'SELLING',
  };
  const selectedStatus = tabToStatusMap[activeTab];
  const dateKey = selectedDate ? toDateString(selectedDate) : '';
  const teamIdFilter = myTeamOnly && favoriteTeamId ? favoriteTeamId : undefined;
  const normalizedSearchQuery = debouncedInput.trim();
  const filterSignature = [
    normalizedSearchQuery,
    dateKey,
    selectedStatus ?? '',
    teamIdFilter ?? '',
  ].join('|');
  const shouldResetPage =
    filterSignatureRef.current !== null
    && filterSignatureRef.current !== filterSignature
    && currentPage !== 0;
  const queryPage = shouldResetPage ? 0 : currentPage;

  useEffect(() => {
    if (filterSignatureRef.current === filterSignature) {
      return;
    }

    filterSignatureRef.current = filterSignature;
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
  }, [currentPage, filterSignature]);

  const pageSize = 9;
  const partyListQuery = useQuery({
    ...getMatePartyListQueryOptions({
      teamId: teamIdFilter,
      page: queryPage,
      size: pageSize,
      status: selectedStatus,
      searchQuery: normalizedSearchQuery || undefined,
      gameDate: dateKey || undefined,
    }),
  });
  const parties = partyListQuery.data?.content ?? [];
  const totalPages = partyListQuery.data?.totalPages ?? 0;
  const isLoading = partyListQuery.isPending && !partyListQuery.data;
  const fetchError = Boolean(partyListQuery.error) && !partyListQuery.data;
  const hasActiveFilters = !!(inputValue.trim() || selectedDate);

  const handlePartyClick = (party: Party) => {
    seedMatePartyQueryData(queryClient, party);
    navigate(`/mate/${party.id}`, {
      state: buildMateRouteLocationState(party),
    });
  };

  const generateDateItems = () => {
    const items = [];
    const today = new Date();
    for (let i = 0; i < 14; i += 1) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      items.push(nextDate);
    }
    return items;
  };

  const dateItems = generateDateItems();

  return (
    <div className="relative min-h-screen bg-gray-50 transition-colors duration-200 dark:bg-[#0a0a0a]">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 pb-24 sm:px-6 sm:pb-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 md:mb-7 md:flex-row md:items-end md:justify-between md:gap-4">
          <div>
            <p className="mb-1 text-[16px] font-bold uppercase tracking-[0.2em] text-gray-500 dark:text-zinc-500">
              Mate Flow
            </p>
            <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
              직관 메이트 찾기
            </h1>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGuideOpen((currentValue) => !currentValue)}
              className="flex-1 rounded-full px-4 text-gray-500 hover:bg-primary/15 hover:text-primary-foreground dark:text-zinc-400 sm:flex-none"
            >
              {isGuideOpen ? '가이드 닫기' : '이용 가이드'}
            </Button>
            <Button
              onClick={() => navigate('/mate/create')}
              className="flex-1 justify-center rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg hover:bg-primary-hover sm:flex-none"
            >
              <MatePlusIcon className="mr-1 h-5 w-5" />
              파티 만들기
            </Button>
          </div>
        </div>

        {isGuideOpen ? (
          <Suspense fallback={<MateGuideFallback />}>
            <MateGuidePanelRuntime onClose={() => setIsGuideOpen(false)} />
          </Suspense>
        ) : null}

        <div className="mb-7 overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex min-w-max items-center gap-2">
            <Button
              variant={selectedDate === null ? 'default' : 'outline'}
              onClick={() => {
                setSelectedDate(null);
                setCurrentPage(0);
              }}
              className={`h-[68px] rounded-2xl px-6 font-bold transition-all ${
                selectedDate === null
                  ? 'border-transparent bg-primary text-primary-foreground shadow-md'
                  : 'border-gray-200/80 bg-white text-gray-500 hover:border-primary/30 hover:text-primary-foreground dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-400'
              }`}
            >
              전체
            </Button>
            <div className="mx-1 h-8 w-px bg-primary/20" />
            {dateItems.map((date, idx) => {
              const isSelected = selectedDate && toDateString(selectedDate) === toDateString(date);
              const isWeekend = date.getDay() === 0 || date.getDay() === 6;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(isSelected ? null : date);
                    setCurrentPage(0);
                  }}
                  aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일 ${getDayOfWeek(toDateString(date))}요일 필터`}
                  className={`flex h-[68px] min-w-[56px] flex-col items-center justify-center rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-transparent bg-primary text-primary-foreground shadow-md'
                      : 'border-gray-200/80 bg-white hover:border-primary/30 dark:border-white/10 dark:bg-[#16181c]'
                  }`}
                >
                  <span className={`mb-1 text-[16px] font-bold ${
                    isSelected
                      ? 'text-primary-foreground'
                      : isWeekend
                        ? 'text-primary/80'
                        : 'text-gray-500 dark:text-zinc-500'
                  }`}
                  >
                    {getDayOfWeek(toDateString(date))}
                  </span>
                  <span className={`text-lg font-bold ${
                    isSelected ? 'text-primary-foreground' : 'text-gray-700 dark:text-zinc-300'
                  }`}
                  >
                    {date.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-7 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1 md:max-w-md">
            <MateSearchIcon className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-500 dark:text-zinc-500" />
            <Input
              type="text"
              placeholder="팀명, 구장, 좌석으로 검색 (예: 삼성 블루존)"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setCurrentPage(0);
              }}
              className="h-12 rounded-2xl border-gray-200/80 bg-white pl-11 text-gray-900 placeholder:text-gray-500 transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/40 dark:border-white/10 dark:bg-[#16181c] dark:text-white dark:placeholder-zinc-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {favoriteTeamId ? (
              <>
                <Button
                  variant="outline"
                  className={`h-10 rounded-full px-4 text-[16px] font-bold transition-colors ${
                    myTeamOnly
                      ? 'border-transparent bg-primary text-primary-foreground'
                      : 'border-gray-200/80 bg-white text-gray-500 hover:border-primary/30 hover:text-primary-foreground dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-400'
                  }`}
                  onClick={() => {
                    setMyTeamOnly(!myTeamOnly);
                    setCurrentPage(0);
                  }}
                >
                  <TeamLogo teamId={favoriteTeamId} size={16} className="mr-2 opacity-90" />
                  내 팀 경기만
                </Button>
                <div className="mx-1 h-5 w-px bg-primary/20" />
              </>
            ) : null}

            {currentStadium ? (
              currentStadium.zones
                .filter((zone) => ['CHEERING', 'TABLE', 'PREMIUM'].includes(zone.category))
                .slice(0, 5)
                .map((zone) => (
                  <Button
                    key={zone.id}
                    variant="outline"
                    className={`h-10 rounded-full px-4 text-[16px] font-bold transition-colors ${
                      inputValue.includes(zone.name)
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-gray-200/80 bg-white text-gray-500 hover:border-primary/30 hover:text-primary-foreground dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-400'
                    }`}
                    onClick={() => toggleSearchQuery(zone.name)}
                  >
                    <span className="mr-1.5 opacity-70">{SEAT_ICONS[zone.category]}</span>
                    {zone.name}
                  </Button>
                ))
            ) : (
              Object.entries(SEAT_CATEGORIES)
                .filter(([key]) => ['CHEERING', 'TABLE', 'PREMIUM', 'EXCITING'].includes(key))
                .map(([key, info]) => (
                  <Button
                    key={key}
                    variant="outline"
                    className={`h-10 rounded-full px-4 text-[16px] font-bold transition-colors ${
                      inputValue.includes(info.label)
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-gray-200/80 bg-white text-gray-500 hover:border-primary/30 hover:text-primary-foreground dark:border-white/10 dark:bg-[#16181c] dark:text-zinc-400'
                    }`}
                    onClick={() => toggleSearchQuery(info.label)}
                  >
                    <span className="mr-1.5 opacity-70">{SEAT_ICONS[key as SeatCategory]}</span>
                    {info.label}
                  </Button>
                ))
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative mb-6 inline-flex h-auto w-full justify-start gap-1 overflow-x-auto rounded-2xl border border-gray-200/70 bg-white p-1.5 scrollbar-hide dark:border-white/5 dark:bg-[#16181c]">
            {MATE_TABS.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <button
                  type="button"
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key);
                    setCurrentPage(0);
                  }}
                  aria-pressed={isActive}
                  className={`relative shrink-0 rounded-xl px-4 py-2.5 text-base font-bold transition-colors duration-300 sm:px-5 ${
                    isActive
                      ? 'text-primary-foreground'
                      : 'bg-transparent text-gray-500 dark:text-zinc-400'
                  }`}
                >
                  {isActive ? (
                    <span className="absolute inset-0 rounded-xl bg-primary shadow-sm" />
                  ) : null}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <Suspense fallback={<MateResultsFallback />}>
            <MateResultsRuntime
              parties={parties}
              totalPages={totalPages}
              queryPage={queryPage}
              activeTab={activeTab}
              authUserId={authUserId}
              isLoading={isLoading}
              fetchError={fetchError}
              hasActiveFilters={hasActiveFilters}
              onRetry={() => {
                void partyListQuery.refetch();
              }}
              onResetFilters={() => {
                setSelectedDate(null);
                setInputValue('');
                setCurrentPage(0);
              }}
              onCreateParty={() => navigate('/mate/create')}
              onPartyClick={handlePartyClick}
              onPageChange={setCurrentPage}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
