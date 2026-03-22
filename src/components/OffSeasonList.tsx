import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    CalendarDays,
    ChevronLeft,
    Filter,
    RefreshCw,
    Search,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import api from '../api/axios';
import { useIsMobile } from '../hooks/use-mobile';
import { getTeamKoreanName } from '../utils/teamNames';
import { OffseasonDesktopTable } from './offseason/OffseasonDesktopTable';
import { OffseasonInsightsPanel } from './offseason/OffseasonInsightsPanel';
import {
    OffseasonEmptyState,
    OffseasonErrorState,
    OffseasonListSkeleton,
} from './offseason/OffseasonListStates';
import { OffseasonMobileCards } from './offseason/OffseasonMobileCards';
import { OffseasonMovementDetailPanel } from './offseason/OffseasonMovementDetailPanel';
import {
    OffseasonMovement,
    SectionFilter,
    SECTION_FILTER_OPTIONS,
    SortOrder,
    SORT_OPTIONS,
    TEAM_FILTER_ALL,
} from './offseason/offseasonListTypes';
import { normalizeOffseasonErrorMessage } from './offseason/offseasonError';
import { formatDateLabel, matchesSectionFilter, toDateValue } from './offseason/offseasonListUtils';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';

const fetchMovements = async (): Promise<OffseasonMovement[]> => {
    try {
        const response = await api.get<OffseasonMovement[]>('/kbo/offseason/movements', {
            skipGlobalErrorHandler: true,
        });

        return response.data;
    } catch (error) {
        throw new Error(normalizeOffseasonErrorMessage(error));
    }
};

export default function OffSeasonList() {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<SortOrder>('latest');
    const [selectedTeam, setSelectedTeam] = useState(TEAM_FILTER_ALL);
    const [selectedSection, setSelectedSection] = useState<SectionFilter>('ALL');
    const [bigOnly, setBigOnly] = useState(false);
    const [selectedMovement, setSelectedMovement] = useState<OffseasonMovement | null>(null);
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

    const openMovementDetail = (movement: OffseasonMovement) => {
        startTransition(() => {
            setSelectedMovement(movement);
        });
    };

    const handleDetailOpenChange = (open: boolean) => {
        if (!open) {
            startTransition(() => {
                setSelectedMovement(null);
            });
        }
    };

    return (
        <div className="min-h-screen bg-[#f4f7f5] pb-24 transition-colors dark:bg-[#09090b]">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 md:gap-8 md:py-10">
                    <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigate('/offseason')}
                      className="group inline-flex items-center gap-2.5 text-zinc-500 transition-colors hover:text-primary dark:text-zinc-400 dark:hover:text-emerald-400"
                    >
                        <div className="rounded-2xl border border-zinc-200 bg-white p-2.5 shadow-sm transition-all group-hover:-translate-x-1 group-hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
                            <ChevronLeft className="h-5 w-5" />
                        </div>
                        <span className="font-bold tracking-tight">스토브리그 홈으로</span>
                    </button>
                </div>

                <section className="relative overflow-hidden rounded-[32px] border border-emerald-200/70 bg-[#173b34] shadow-[0_24px_80px_-32px_rgba(16,37,32,0.9)] dark:border-emerald-950/40 dark:bg-[#173b34]">
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.08]" />
                    <div className="relative grid gap-6 px-6 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
                                <span className="text-[11px] font-black uppercase tracking-[0.22em] text-yellow-200">2025-26 Stove League Tracker</span>
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black leading-none tracking-tight text-white md:text-4xl">
                                    KBO 스토브리그
                                    <br className="sm:hidden" /> 전체 이적 현황
                                </h1>
                                <p className="max-w-2xl text-sm font-medium leading-relaxed text-emerald-100/80 md:text-base">
                                    검색, 팀 필터, 구분 필터를 한 번에 묶어 원하는 선수 이동을 빠르게 좁혀볼 수 있게 정리했습니다.
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-100/75">
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                                    <CalendarDays className="h-3.5 w-3.5" />
                                    최근 업데이트 {latestUpdate}
                                </span>
                                {isFetching && !isLoading && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5">
                                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
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
                                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-100/60">{stat.label}</p>
                                    <p className={`mt-2 text-3xl font-black tracking-tight ${stat.accent}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <Card className="sticky top-4 z-30 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/95 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
                    <div className="space-y-4 p-4 md:p-5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                            <Filter className="h-4 w-4" />
                            탐색 도구
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    placeholder="선수, 구단, 요약, 계약 내용 검색"
                                    className="h-12 rounded-2xl border-zinc-200 bg-zinc-50 pl-12 text-base font-medium shadow-none focus-visible:ring-primary/20 dark:border-zinc-800 dark:bg-zinc-950"
                                    value={searchTerm}
                                    onChange={(event) => setSearchTerm(event.target.value)}
                                />
                            </div>

                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                                <SelectTrigger className="h-12 rounded-2xl border-zinc-200 bg-zinc-50 text-sm font-semibold shadow-none dark:border-zinc-800 dark:bg-zinc-950">
                                    <SelectValue placeholder="팀 선택" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={TEAM_FILTER_ALL}>전체 구단</SelectItem>
                                    {teamOptions.map((teamName) => (
                                        <SelectItem key={teamName} value={teamName}>
                                            {teamName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="grid grid-cols-3 gap-2">
                                {SORT_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setSortOrder(option.value)}
                                        className={`rounded-2xl px-3 py-3 text-sm font-bold transition-colors ${sortOrder === option.value
                                            ? 'bg-primary text-white shadow-sm'
                                            : 'border border-zinc-200 bg-zinc-50 text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
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
                                        className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${selectedSection === option.value
                                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
                                            : 'border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
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
                                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${bigOnly
                                        ? 'bg-yellow-400 text-[#1a3c34]'
                                        : 'border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                                        }`}
                                >
                                    <TrendingUp className="h-4 w-4" />
                                    주요 소식만
                                </button>
                                {hasActiveFilters && (
                                    <Button variant="ghost" onClick={resetFilters} className="rounded-full px-4 text-sm font-bold">
                                        <X className="h-4 w-4" />
                                        초기화
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                                전체 {movements.length}건 중 {filteredList.length}건 표시
                            </span>
                            {activeFilters.map((label) => (
                                <Badge
                                    key={label}
                                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                                >
                                    {label}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </Card>

                {!isLoading && !isError && filteredList.length > 0 && (
                    <OffseasonInsightsPanel movements={filteredList} onSelect={openMovementDetail} />
                )}

                <section className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">이적 타임라인</h2>
                            <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-300">
                                {isMobile ? '모바일 카드 보기' : '데스크톱 테이블 보기'}로 현재 필터 결과를 확인하세요.
                            </p>
                        </div>
                        {!isMobile && (
                            <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                                {sortOrder === 'headline' ? '주요 소식 우선 정렬' : SORT_OPTIONS.find((option) => option.value === sortOrder)?.label}
                            </span>
                        )}
                    </div>

                    {isLoading ? (
                        <OffseasonListSkeleton />
                    ) : isError ? (
                        <OffseasonErrorState error={error} onRetry={() => void refetch()} />
                    ) : filteredList.length === 0 ? (
                        <OffseasonEmptyState
                            hasSearchTerm={Boolean(searchTerm.trim())}
                            hasActiveFilters={hasActiveFilters}
                            onReset={resetFilters}
                        />
                    ) : (
                        <Card className="overflow-visible rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:overflow-hidden">
                            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                                <div className="space-y-1">
                                    <p className="text-sm font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                                        현재 조건에 맞는 이적 {filteredList.length}건
                                    </p>
                                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-300">
                                        선수, 팀, 계약 내용을 같은 구조로 보여주도록 목록을 정리했습니다.
                                    </p>
                                </div>
                                {bigOnly && (
                                    <Badge className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-[11px] font-bold text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
                                        주요 소식 필터 적용
                                    </Badge>
                                )}
                            </div>

                            {isMobile ? (
                                <OffseasonMobileCards movements={filteredList} onSelect={openMovementDetail} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[860px]">
                                        <OffseasonDesktopTable
                                            movements={filteredList}
                                            sortOrder={sortOrder}
                                            onSortChange={setSortOrder}
                                            onSelect={openMovementDetail}
                                        />
                                    </div>
                                </div>
                            )}
                        </Card>
                    )}
                </section>

                <OffseasonMovementDetailPanel
                    movement={selectedMovement}
                    isMobile={isMobile}
                    open={Boolean(selectedMovement)}
                    onOpenChange={handleDetailOpenChange}
                />
            </div>
        </div>
    );
}
