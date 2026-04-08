import { lazy, startTransition, Suspense, useState } from 'react';

import ViewportDeferred from '../ViewportDeferred';
import { Card } from '../ui/card';
import {
    OffseasonEmptyState,
    OffseasonErrorState,
} from './OffseasonListStates';
import {
    OffseasonMovement,
    SORT_OPTIONS,
    SortOrder,
} from './offseasonListTypes';
import { OffseasonPill } from './offseasonUi';

const OffseasonDesktopTable = lazy(() =>
    import('./OffseasonDesktopTable').then((module) => ({ default: module.OffseasonDesktopTable })),
);
const OffseasonInsightsPanel = lazy(() =>
    import('./OffseasonInsightsPanel').then((module) => ({ default: module.OffseasonInsightsPanel })),
);
const OffseasonMobileCards = lazy(() =>
    import('./OffseasonMobileCards').then((module) => ({ default: module.OffseasonMobileCards })),
);
const OffseasonMovementDetailPanel = lazy(() =>
    import('./OffseasonMovementDetailPanel').then((module) => ({ default: module.OffseasonMovementDetailPanel })),
);

function OffseasonInsightsFallback() {
    return (
        <Card className="rounded-3xl border border-zinc-200 bg-white/80 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
            <div className="space-y-3 animate-pulse">
                <div className="h-4 w-32 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-8 w-64 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="grid gap-3 xl:grid-cols-3">
                    {Array.from({ length: 3 }, (_, index) => (
                        <div key={index} className="h-44 rounded-3xl bg-zinc-100 dark:bg-zinc-950/70" />
                    ))}
                </div>
            </div>
        </Card>
    );
}

function OffseasonListLeafFallback() {
    return (
        <div className="space-y-3 px-4 pb-4 pt-2 md:px-5 md:pb-5">
            <div className="animate-pulse rounded-[28px] border border-zinc-200 bg-zinc-50/80 px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950/70">
                <div className="h-4 w-40 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-3 h-3 w-28 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
                <div
                    key={index}
                    className="animate-pulse rounded-[26px] border border-zinc-200 bg-white px-5 py-6 dark:border-zinc-800 dark:bg-zinc-950/90"
                >
                    <div className="h-5 w-48 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-3 h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    <div className="mt-2 h-3 w-3/4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                </div>
            ))}
        </div>
    );
}

interface OffseasonListContentRuntimeProps {
    filteredList: OffseasonMovement[];
    isLoading: boolean;
    isError: boolean;
    error: unknown;
    onRetry: () => void;
    isMobile: boolean;
    hasSearchTerm: boolean;
    hasActiveFilters: boolean;
    onReset: () => void;
    bigOnly: boolean;
    sortOrder: SortOrder;
    onSortChange: (value: SortOrder) => void;
}

export function OffseasonListContentRuntime({
    filteredList,
    isLoading,
    isError,
    error,
    onRetry,
    isMobile,
    hasSearchTerm,
    hasActiveFilters,
    onReset,
    bigOnly,
    sortOrder,
    onSortChange,
}: OffseasonListContentRuntimeProps) {
    const [selectedMovement, setSelectedMovement] = useState<OffseasonMovement | null>(null);

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
        <>
            {!isLoading && !isError && filteredList.length > 0 && (
                <ViewportDeferred fallback={<OffseasonInsightsFallback />}>
                    <Suspense fallback={<OffseasonInsightsFallback />}>
                        <OffseasonInsightsPanel movements={filteredList} onSelect={openMovementDetail} />
                    </Suspense>
                </ViewportDeferred>
            )}

            <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">이적 타임라인</h2>
                        <p className="mt-1 text-[15px] font-semibold text-zinc-500 dark:text-zinc-300">
                            {isMobile ? '모바일 카드 보기' : '데스크톱 테이블 보기'}로 현재 필터 결과를 확인하세요.
                        </p>
                    </div>
                    {!isMobile && (
                        <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                            {sortOrder === 'headline'
                                ? '주요 소식 우선 정렬'
                                : SORT_OPTIONS.find((option) => option.value === sortOrder)?.label}
                        </span>
                    )}
                </div>

                {isLoading ? (
                    <OffseasonListLeafFallback />
                ) : isError ? (
                    <OffseasonErrorState error={error} onRetry={onRetry} />
                ) : filteredList.length === 0 ? (
                    <OffseasonEmptyState
                        hasSearchTerm={hasSearchTerm}
                        hasActiveFilters={hasActiveFilters}
                        onReset={onReset}
                    />
                ) : (
                    <Card className="overflow-visible rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:overflow-hidden">
                        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                            <div className="space-y-1">
                                <p className="text-[15px] font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                                    현재 조건에 맞는 이적 {filteredList.length}건
                                </p>
                                <p className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-300">
                                    선수, 팀, 계약 내용을 같은 구조로 보여주도록 목록을 정리했습니다.
                                </p>
                            </div>
                            {bigOnly && (
                                <OffseasonPill className="rounded-full border border-yellow-200 bg-yellow-100 px-3 py-1 text-[13px] font-bold text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200">
                                    주요 소식 필터 적용
                                </OffseasonPill>
                            )}
                        </div>

                        <Suspense fallback={<OffseasonListLeafFallback />}>
                            {isMobile ? (
                                <OffseasonMobileCards movements={filteredList} onSelect={openMovementDetail} />
                            ) : (
                                <div className="overflow-x-auto">
                                    <div className="min-w-[860px]">
                                        <OffseasonDesktopTable
                                            movements={filteredList}
                                            sortOrder={sortOrder}
                                            onSortChange={onSortChange}
                                            onSelect={openMovementDetail}
                                        />
                                    </div>
                                </div>
                            )}
                        </Suspense>
                    </Card>
                )}
            </section>

            {selectedMovement && (
                <Suspense fallback={null}>
                    <OffseasonMovementDetailPanel
                        movement={selectedMovement}
                        isMobile={isMobile}
                        open
                        onOpenChange={handleDetailOpenChange}
                    />
                </Suspense>
            )}
        </>
    );
}
