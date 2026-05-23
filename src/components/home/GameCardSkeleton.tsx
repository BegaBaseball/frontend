import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const GAME_CARD_MIN_HEIGHT = 'min-h-[168px] lg:min-h-[104px]';

export const GameCardSkeleton = () => (
    <Card
        className={`overflow-hidden ${GAME_CARD_MIN_HEIGHT} rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card`}
    >
        <CardContent className="flex h-full flex-col gap-3 p-3 sm:p-4 lg:hidden">
            <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-5 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-6 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <Skeleton className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
                        <div className="min-w-0 space-y-2">
                            <Skeleton className="h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
                            <Skeleton className="h-3 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                        </div>
                    </div>
                    <Skeleton className="h-8 w-10 rounded-md bg-gray-200 dark:bg-white/10" />
                </div>
                <Skeleton className="mx-auto h-6 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                    <Skeleton className="h-8 w-10 rounded-md bg-gray-200 dark:bg-white/10" />
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                        <div className="min-w-0 space-y-2">
                            <Skeleton className="ml-auto h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
                            <Skeleton className="ml-auto h-3 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                        </div>
                        <Skeleton className="h-9 w-9 rounded-full bg-gray-200 dark:bg-white/10" />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-white/8">
                <Skeleton className="h-4 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-7 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
        </CardContent>
        <CardContent className="hidden h-full grid-cols-[5.5rem_minmax(0,1.25fr)_5rem_minmax(0,1.25fr)_minmax(8rem,0.85fr)_7.5rem] items-center gap-4 p-4 lg:grid">
            <div className="space-y-2">
                <Skeleton className="h-5 w-14 rounded-full bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-5 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                    <div className="min-w-0 space-y-2">
                        <Skeleton className="h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
                        <Skeleton className="h-3 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                    </div>
                </div>
                <Skeleton className="h-10 w-12 rounded-md bg-gray-200 dark:bg-white/10" />
            </div>
            <Skeleton className="mx-auto h-6 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
            <div className="flex min-w-0 items-center justify-end gap-4">
                <Skeleton className="h-10 w-12 rounded-md bg-gray-200 dark:bg-white/10" />
                <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
                    <div className="min-w-0 space-y-2">
                        <Skeleton className="h-5 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
                        <Skeleton className="h-3 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-white/10" />
                </div>
            </div>
            <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-3 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
            <div className="flex flex-col items-end gap-2">
                <Skeleton className="h-6 w-20 rounded-full bg-gray-200 dark:bg-white/10" />
                <Skeleton className="h-6 w-24 rounded-full bg-gray-200 dark:bg-white/10" />
            </div>
        </CardContent>
    </Card>
);
