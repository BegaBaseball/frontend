const GAME_CARD_MIN_HEIGHT = 'min-h-[168px] lg:min-h-[104px]';
const SKELETON_BLOCK_CLASS = 'animate-pulse rounded-md bg-gray-200 dark:bg-white/10';

function SkeletonBlock({ className }: { className: string }) {
    return <div className={`${SKELETON_BLOCK_CLASS} ${className}`} />;
}

export const GameCardSkeleton = () => (
    <div
        className={`overflow-hidden ${GAME_CARD_MIN_HEIGHT} rounded-xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-card`}
    >
        <div className="flex h-full flex-col gap-3 p-3 sm:p-4 lg:hidden">
            <div className="flex items-center justify-between gap-2">
                <SkeletonBlock className="h-5 w-16 rounded-full" />
                <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                    <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <SkeletonBlock className="h-9 w-9 rounded-full" />
                        <div className="min-w-0 space-y-2">
                            <SkeletonBlock className="h-5 w-20 rounded-full" />
                            <SkeletonBlock className="h-3 w-24 rounded-full" />
                        </div>
                    </div>
                    <SkeletonBlock className="h-8 w-10" />
                </div>
                <SkeletonBlock className="mx-auto h-6 w-16 rounded-full" />
                <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2 dark:border-white/8 dark:bg-white/[0.025]">
                    <SkeletonBlock className="h-8 w-10" />
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
                        <div className="min-w-0 space-y-2">
                            <SkeletonBlock className="ml-auto h-5 w-20 rounded-full" />
                            <SkeletonBlock className="ml-auto h-3 w-24 rounded-full" />
                        </div>
                        <SkeletonBlock className="h-9 w-9 rounded-full" />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-2 dark:border-white/8">
                <SkeletonBlock className="h-4 w-24 rounded-full" />
                <SkeletonBlock className="h-7 w-20 rounded-full" />
            </div>
        </div>
        <div className="hidden h-full grid-cols-home-game-card items-center gap-4 p-4 lg:grid">
            <div className="space-y-2">
                <SkeletonBlock className="h-5 w-14 rounded-full" />
                <SkeletonBlock className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex min-w-0 items-center justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-center gap-4">
                    <SkeletonBlock className="h-10 w-10 rounded-full" />
                    <div className="min-w-0 space-y-2">
                        <SkeletonBlock className="h-5 w-20 rounded-full" />
                        <SkeletonBlock className="h-3 w-24 rounded-full" />
                    </div>
                </div>
                <SkeletonBlock className="h-10 w-12" />
            </div>
            <SkeletonBlock className="mx-auto h-6 w-10 rounded-full" />
            <div className="flex min-w-0 items-center justify-end gap-4">
                <SkeletonBlock className="h-10 w-12" />
                <div className="flex min-w-0 flex-1 items-center justify-end gap-4">
                    <div className="min-w-0 space-y-2">
                        <SkeletonBlock className="h-5 w-20 rounded-full" />
                        <SkeletonBlock className="h-3 w-24 rounded-full" />
                    </div>
                    <SkeletonBlock className="h-10 w-10 rounded-full" />
                </div>
            </div>
            <div className="space-y-2">
                <SkeletonBlock className="h-4 w-24 rounded-full" />
                <SkeletonBlock className="h-3 w-20 rounded-full" />
            </div>
            <div className="flex flex-col items-end gap-2">
                <SkeletonBlock className="h-6 w-20 rounded-full" />
                <SkeletonBlock className="h-6 w-24 rounded-full" />
            </div>
        </div>
    </div>
);
