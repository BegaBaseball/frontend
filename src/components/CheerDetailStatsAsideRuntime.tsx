import { lazy, Suspense, useState } from 'react';
import type { CSSProperties } from 'react';
import { cn } from '../lib/utils';
import { ChevronDownIcon, MegaphoneIcon } from './icons/CheerFlowIcons';

const LazyCheerDetailStatsBody = lazy(() => import('./CheerDetailStatsBody'));

interface CheerDetailStatsAsideRuntimeProps {
    commentCount: number;
    createdAtLabel: string;
    detailAccent: string;
    primaryBorderStyle: CSSProperties;
    repostedAtLabel: string | null;
    teamName: string;
    views: number;
}

export default function CheerDetailStatsAsideRuntime({
    commentCount,
    createdAtLabel,
    detailAccent,
    primaryBorderStyle,
    repostedAtLabel,
    teamName,
    views,
}: CheerDetailStatsAsideRuntimeProps) {
    const [isStatsOpen, setIsStatsOpen] = useState(false);

    return (
        <aside>
            <div
                className="rounded-2xl border bg-[var(--cheer-sub-card)] p-2.5 shadow-sm backdrop-blur-sm"
                style={primaryBorderStyle}
            >
                <button
                    type="button"
                    onClick={() => setIsStatsOpen((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-md py-0.5 text-left"
                    aria-label="응원 현황 토글"
                    aria-expanded={isStatsOpen}
                    aria-controls="cheer-detail-stats"
                >
                    <div className="flex items-center gap-1.5 text-body font-bold" style={{ color: detailAccent }}>
                        <MegaphoneIcon className="h-3.5 w-3.5" />
                        <span>응원 현황</span>
                    </div>
                    <ChevronDownIcon
                        className={cn(
                            'h-3.5 w-3.5 text-slate-500 transition-transform duration-200 lg:hidden',
                            isStatsOpen && 'rotate-180'
                        )}
                    />
                </button>
                <div
                    id="cheer-detail-stats"
                    className={cn(
                        'mt-2 space-y-1.5 lg:block',
                        isStatsOpen ? 'block' : 'hidden'
                    )}
                >
                    <Suspense
                        fallback={(
                            <>
                                {[1, 2, 3].map((item) => (
                                    <div
                                        key={item}
                                        className="h-[44px] animate-skeleton-pulse rounded-xl bg-[var(--cheer-chip-bg)]"
                                    />
                                ))}
                            </>
                        )}
                    >
                        <LazyCheerDetailStatsBody
                            commentCount={commentCount}
                            createdAtLabel={createdAtLabel}
                            repostedAtLabel={repostedAtLabel}
                            teamName={teamName}
                            views={views}
                        />
                    </Suspense>
                </div>
            </div>
        </aside>
    );
}
