import { AlertCircle, RefreshCw, Search, X } from 'lucide-react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { normalizeOffseasonErrorMessage } from './offseasonError';

export function OffseasonListSkeleton() {
    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={`summary-${index}`} className="h-24 rounded-3xl bg-zinc-200/80 dark:bg-zinc-800/70" />
                ))}
            </div>
            <Card className="overflow-hidden rounded-3xl border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-3 p-5">
                    {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton key={`row-${index}`} className="h-20 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/70" />
                    ))}
                </div>
            </Card>
        </div>
    );
}

export function OffseasonErrorState({
    error,
    onRetry,
}: {
    error: unknown;
    onRetry: () => void;
}) {
    const message = normalizeOffseasonErrorMessage(error);

    return (
        <Card className="rounded-3xl border border-red-200 bg-red-50/60 p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
            <div className="mx-auto flex max-w-md flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-red-500 shadow-sm dark:bg-zinc-900">
                    <AlertCircle className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">이적 현황을 가져오지 못했습니다.</h3>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-300">{message}</p>
                </div>
                <Button onClick={onRetry} className="rounded-full px-5">
                    <RefreshCw className="h-4 w-4" />
                    다시 시도
                </Button>
            </div>
        </Card>
    );
}

export function OffseasonEmptyState({
    hasSearchTerm,
    hasActiveFilters,
    onReset,
}: {
    hasSearchTerm: boolean;
    hasActiveFilters: boolean;
    onReset: () => void;
}) {
    return (
        <Card className="rounded-3xl border-2 border-dashed border-zinc-200 bg-white/70 p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800">
                    <Search className="h-7 w-7" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">조건에 맞는 이동이 없습니다.</h3>
                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-300">
                        {hasSearchTerm
                            ? '검색어를 조금 넓게 잡거나 팀과 구분 필터를 다시 선택해 주세요.'
                            : '필터 조건을 조정하면 더 많은 이적 내역을 확인할 수 있습니다.'}
                    </p>
                </div>
                {hasActiveFilters && (
                    <Button variant="outline" onClick={onReset} className="rounded-full px-5">
                        <X className="h-4 w-4" />
                        필터 초기화
                    </Button>
                )}
            </div>
        </Card>
    );
}
