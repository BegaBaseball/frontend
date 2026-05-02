import { Card, CardContent } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const GAME_CARD_MIN_HEIGHT = 'min-h-[240px]';

export const GameCardSkeleton = () => (
    <Card
        className={`overflow-hidden ${GAME_CARD_MIN_HEIGHT} rounded-2xl border border-slate-200/90 dark:border-white/12 shadow-sm bg-gradient-to-b from-white via-white to-slate-50 dark:from-secondary/80 dark:via-secondary/70 dark:to-secondary/55`}
    >
        <CardContent className="p-6 h-full flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-4 w-1/3 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-6 w-12 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
            <div className="flex justify-between items-center py-2">
                <Skeleton className="h-14 w-14 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-8 w-16 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
                <Skeleton className="h-14 w-14 rounded-2xl bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
            <div className="pt-2">
                <Skeleton className="h-4 w-5/6 rounded-full bg-slate-200/80 dark:bg-slate-700/80" />
            </div>
        </CardContent>
    </Card>
);
