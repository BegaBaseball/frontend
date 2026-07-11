import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { publicGet } from '../api/publicClient';
import {
    CalendarDaysIcon,
    ChevronLeftIcon,
    FilterIcon,
    RefreshIcon,
    SearchIcon,
    SparklesIcon,
    TrendingUpIcon,
    XIcon,
} from './icons/OffseasonIcons';
import { useIsMobile } from '../hooks/use-mobile';
import { getTeamKoreanName } from '../utils/teamNames';
import {
    OffseasonMovement,
    SectionFilter,
    SECTION_FILTER_OPTIONS,
    SortOrder,
    SORT_OPTIONS,
    TEAM_FILTER_ALL,
} from './offseason/offseasonListTypes';
import { OffseasonPill } from './offseason/offseasonUi';
import { normalizeOffseasonErrorMessage } from './offseason/offseasonError';
import { formatDateLabel, matchesSectionFilter, toDateValue } from './offseason/offseasonListUtils';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';

const OffseasonListContentRuntime = lazy(() =>
    import('./offseason/OffseasonListContentRuntime').then((module) => ({ default: module.OffseasonListContentRuntime })),
);

const fetchMovements = async (): Promise<OffseasonMovement[]> => {
    try {
        return await publicGet<OffseasonMovement[]>('/kbo/offseason/movements');
    } catch (error) {
        throw new Error(normalizeOffseasonErrorMessage(error));
    }
};

function OffseasonListContentFallback() {
    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                <div className="space-y-3 animate-pulse">
                    <div className="h-4 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="h-8 w-64 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="grid gap-3 xl:grid-cols-3">
                        {Array.from({ length: 3 }, (_, index) => (
                            <div key={`insight-${index}`} className="h-44 rounded-3xl bg-zinc-100 dark:bg-zinc-950/70" />
                        ))}
                    </div>
                </div>
            </div>
            <div className="animate-pulse rounded-28 border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                <div className="h-4 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 h-3 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="animate-pulse rounded-26 border border-zinc-200 bg-white px-5 py-6 dark:border-zinc-800 dark:bg-zinc-950/90"
                >
                    <div className="h-5 w-48 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-3 h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-2 h-3 w-3/4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                </div>
            ))}
        </div>
    );
}

export default function OffSeasonList() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
    const [selectedTeam, setSelectedTeam] = useState(TEAM_FILTER_ALL);
    const [selectedSection, setSelectedSection] = useState<SectionFilter>('ALL');
    const [bigOnly, setBigOnly] = useState(false);
    const deferredSearchTerm = useDeferredValue(searchTerm);
    const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
    const {
        data: movements = [],
        isLoading,
        isError,
        error,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ['offseason-movements'],
        queryFn: fetchMovements,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 1,
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const teamOptions = useMemo(() => {
        return Array.from(
            new Set(
                movements
                    .map((item) => getTeamKoreanName(item.team))
                    .filter(Boolean),
            ),
        ).sort((a, b) => a.localeCompare(b, 'ko'));
    }, [movements]);

    const filteredList = useMemo(() => {
        const filtered = movements.filter((item) => {
            const teamName = getTeamKoreanName(item.team);
            const matchesSearch = !normalizedSearchTerm || [
                item.player,
                item.team,
                teamName,
                item.section,
                item.summary,
                item.remarks,
                item.contractTerm,
                item.contractValue,
                item.optionDetails,
                item.counterpartyTeam,
                item.counterpartyDetails,
                item.sourceLabel,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()
                .includes(normalizedSearchTerm);

            const matchesTeam = selectedTeam === TEAM_FILTER_ALL || teamName === selectedTeam;
            const matchesSection = matchesSectionFilter(item.section, selectedSection);
            const matchesBigOnly = !bigOnly || item.isBigEvent;

            return matchesSearch && matchesTeam && matchesSection && matchesBigOnly;
        });

        return filtered.sort((a, b) => {
            const amountDiff = (b.estimatedAmount ?? 0) - (a.estimatedAmount ?? 0);
            const dateDiff = toDateValue(b.date) - toDateValue(a.date);

            if (sortOrder === 'amount') {
                return amountDiff || dateDiff;
            }

            if (sortOrder === 'headline') {
                if (a.isBigEvent !== b.isBigEvent) {
                    return a.isBigEvent ? -1 : 1;
                }

                return amountDiff || dateDiff;
            }

            return dateDiff || amountDiff;
        });
    }, [movements, normalizedSearchTerm, selectedTeam, selectedSection, bigOnly, sortOrder]);

    const stats = useMemo(() => {
        return {
            total: movements.length,
            visible: filteredList.length,
            fa: movements.filter((item) => matchesSectionFilter(item.section, 'FA')).length,
            big: movements.filter((item) => item.isBigEvent).length,
        };
    }, [movements, filteredList.length]);

    const latestUpdate = useMemo(() => {
        if (!movements.length) {
            return '업데이트 예정';
        }

        const latestMovement = movements.reduce((latest, item) => {
            if (!latest || toDateValue(item.date) > toDateValue(latest.date)) {
                return item;
            }

            return latest;
        }, movements[0]);

        return formatDateLabel(latestMovement.date);
    }, [movements]);

    const activeFilters = useMemo(() => {
        const filters: string[] = [];

        if (searchTerm.trim()) {
            filters.push(`검색: ${searchTerm.trim()}`);
        }
        if (selectedTeam !== TEAM_FILTER_ALL) {
            filters.push(`팀: ${selectedTeam}`);
        }
        if (selectedSection !== 'ALL') {
            const label = SECTION_FILTER_OPTIONS.find((option) => option.value === selectedSection)?.label;
            if (label) {
                filters.push(`구분: ${label}`);
            }
        }
        if (bigOnly) {
            filters.push('주요 소식만');
        }
        if (sortOrder !== 'latest') {
            const label = SORT_OPTIONS.find((option) => option.value === sortOrder)?.label;
            if (label) {
                filters.push(`정렬: ${label}`);
            }
        }

        return filters;
    }, [searchTerm, selectedTeam, selectedSection, bigOnly, sortOrder]);

    const hasActiveFilters = activeFilters.length > 0;

    const resetFilters = () => {
        setSearchTerm('');
        setSortOrder('latest');
        setSelectedTeam(TEAM_FILTER_ALL);
        setSelectedSection('ALL');
        setBigOnly(false);
    };

    return (
        <div className="min-h-screen bg-[#f4f7f5] pb-24 transition-colors dark:bg-[#000000]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:gap-8 md:py-10">
                    <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigate('/offseason')}
                      className="group inline-flex items-center gap-2.5 text-zinc-500 transition-colors hover:text-primary dark:text-white dark:hover:text-emerald-400"
                    >
                        <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-sm transition-all group-hover:-translate-x-1 group-hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                            <ChevronLeftIcon className="h-5 w-5" />
                        </div>
                        <span className="font-bold tracking-tight">스토브리그 홈으로</span>
                    </button>
                </div>

                <section className="relative overflow-hidden rounded-32 border border-emerald-200/70 bg-[#173b34] shadow-[0_24px_80px_-32px_rgba(16,37,32,0.9)] dark:border-emerald-950/40 dark:bg-[#173b34]">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.08]" />
                    <div className="relative grid gap-6 px-6 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                                <SparklesIcon className="h-3.5 w-3.5 text-yellow-300" />
                                <span className="text-caption font-black uppercase tracking-[0.22em] text-yellow-200">2025-26 Stove League Tracker</span>
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black leading-none tracking-tight text-white md:text-4xl">
                                    KBO 스토브리그
                                    <br className="sm:hidden" /> 전체 이적 현황
                                </h1>
                                <p className="max-w-2xl text-15 font-semibold leading-relaxed text-emerald-100/80 md:text-base">
                                    검색, 팀 필터, 구분 필터를 한 번에 묶어 원하는 선수 이동을 빠르게 좁혀볼 수 있게 정리했습니다.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-caption font-semibold text-emerald-100/75">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                                    <CalendarDaysIcon className="h-3.5 w-3.5" />
                                    최근 업데이트 {latestUpdate}
                                </span>
                                {isFetching && !isLoading && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                                        <RefreshIcon className="h-3.5 w-3.5 animate-spin" />
                                        새 데이터 확인 중
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: '전체 이동', value: stats.total, accent: 'text-white' },
                                { label: '현재 표시', value: stats.visible, accent: 'text-yellow-300' },
                                { label: 'FA 계약', value: stats.fa, accent: 'text-blue-200' },
                                { label: '주요 소식', value: stats.big, accent: 'text-emerald-200' },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="rounded-3xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm"
                                >
                                <p className="text-caption font-black uppercase tracking-[0.18em] text-emerald-100/60">{stat.label}</p>
                                    <p className={`mt-2 text-3xl font-black tracking-tight ${stat.accent}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <Card className="sticky top-4 z-30 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
                    <div className="space-y-4 p-4 md:p-5">
                        <div className="flex items-center gap-2 text-caption font-bold uppercase tracking-[0.18em] text-zinc-400">
                            <FilterIcon className="h-4 w-4" />
                            탐색 도구
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    placeholder="선수, 구단, 요약, 계약 내용 검색"
                                    className="h-12 rounded-2xl border-zinc-200 bg-zinc-50 pl-12 text-base font-semibold shadow-none focus-visible:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>

                            <select
                                aria-label="팀 필터"
                                className="h-12 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-15 font-semibold shadow-none outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950"
                                value={selectedTeam}
                                onChange={(event) => setSelectedTeam(event.target.value)}
                            >
                                <option value={TEAM_FILTER_ALL}>전체 구단</option>
                                {teamOptions.map((teamName) => (
                                    <option key={teamName} value={teamName}>
                                        {teamName}
                                    </option>
                                ))}
                            </select>

                            <div className="grid grid-cols-3 gap-2">
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSortOrder(option.value)}
                                        className={`rounded-2xl px-3 py-3 text-15 font-bold transition-colors ${sortOrder === option.value
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:text-zinc-100'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex flex-wrap gap-2">
                                {SECTION_FILTER_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSelectedSection(option.value)}
                                        className={`rounded-full px-4 py-2 text-15 font-bold transition-colors ${selectedSection === option.value
                                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-white'
                                            : 'border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:text-zinc-100'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setBigOnly((prev) => !prev)}
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-15 font-bold transition-colors ${bigOnly
                                        ? 'bg-yellow-400 text-[#1a3c34]'
                                        : 'border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:hover:text-zinc-100'
                                        }`}
                                >
                                    <TrendingUpIcon className="h-4 w-4" />
                                    주요 소식만
                                </button>
                                {hasActiveFilters && (
                                        <Button variant="ghost" onClick={resetFilters} className="rounded-full px-4 text-15 font-bold">
                                        <XIcon className="h-4 w-4" />
                                        초기화
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-caption font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-white">
                                전체 {movements.length}건 중 {filteredList.length}건 표시
                            </span>
                            {activeFilters.map((label) => (
                                <OffseasonPill
                                    key={label}
                                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-caption font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                >
                                    {label}
                                </OffseasonPill>
                            ))}
                        </div>
                    </div>
                </Card>

                <Suspense fallback={<OffseasonListContentFallback />}>
                    <OffseasonListContentRuntime
                        filteredList={filteredList}
                        isLoading={isLoading}
                        isError={isError}
                        error={error}
                        onRetry={() => void refetch()}
                        isMobile={isMobile}
                        hasSearchTerm={Boolean(searchTerm.trim())}
                        hasActiveFilters={hasActiveFilters}
                        onReset={resetFilters}
                        bigOnly={bigOnly}
                        sortOrder={sortOrder}
                        onSortChange={setSortOrder}
                    />
                </Suspense>
            </div>
        </div>
    );
}
