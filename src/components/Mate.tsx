import { lazy, Suspense } from 'react';

import { useMateListController } from '../hooks/useMateListController';
import { useUIStore } from '../store/uiStore';

const MateListControlsRuntime = lazy(() => import('./MateListControlsRuntime'));
const MateResultsRuntime = lazy(() => import('./MateResultsRuntime'));

function MateResultsFallback() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 xl:gap-5 2xl:gap-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-[304px] rounded-22 border border-gray-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface-raised))]"
          >
            <div className="flex h-full animate-pulse flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-5 w-20 rounded-full bg-muted" />
                  <div className="h-9 w-9 rounded-full bg-muted/70" />
                </div>
                <div className="h-6 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted/70" />
              </div>
              <div className="space-y-3">
                <div className="h-14 rounded-2xl bg-muted/60" />
                <div className="h-10 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MateControlsFallback() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="text-13 font-semibold uppercase tracking-[0.16em] text-primary/70">같이가요</div>
          <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="hidden h-11 w-28 animate-pulse rounded-full bg-muted/70 sm:block" />
      </div>
      <div className="grid gap-[22px] lg:grid-cols-[264px_minmax(0,1fr)]">
        <div className="hidden h-[420px] rounded-2xl border border-border/70 bg-card p-5 lg:block">
          <div className="space-y-4 animate-pulse">
            <div className="h-5 w-28 rounded bg-muted" />
            <div className="h-11 rounded-full bg-muted/70" />
            <div className="h-11 rounded-full bg-muted/70" />
            <div className="h-28 rounded-2xl bg-muted/60" />
          </div>
        </div>
        <MateResultsFallback />
      </div>
    </div>
  );
}

export default function Mate() {
  const controller = useMateListController();
  const mateListViewMode = useUIStore((state) => state.mateListViewMode);
  const effectiveViewMode = controller.isDesktopListLayout ? mateListViewMode : 'grid';

  return (
    <div className="relative min-h-screen bg-gray-50 transition-colors duration-200 dark:bg-background">
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-5 pb-8 sm:px-6 lg:px-8 2xl:max-w-[1440px]">
        <Suspense fallback={<MateControlsFallback />}>
          <MateListControlsRuntime controller={controller}>
            <Suspense fallback={<MateResultsFallback />}>
              <MateResultsRuntime
                parties={controller.parties}
                totalPages={controller.totalPages}
                queryPage={controller.queryPage}
                activeTab={controller.activeTab}
                authUserId={controller.authUserId}
                isLoading={controller.isLoading}
                fetchError={controller.fetchError}
                hasActiveFilters={controller.hasActiveFilters}
                onRetry={controller.handleRetry}
                onResetFilters={controller.handleResetFilters}
                onCreateParty={controller.handleCreatePartyClick}
                onPartyClick={controller.handlePartyClick}
                onFavoriteToggle={controller.handleFavoriteToggle}
                onPageChange={controller.setCurrentPage}
                favoriteUpdatingPartyId={controller.favoriteUpdatingPartyId}
                viewMode={effectiveViewMode}
              />
            </Suspense>
          </MateListControlsRuntime>
        </Suspense>
      </div>
    </div>
  );
}
