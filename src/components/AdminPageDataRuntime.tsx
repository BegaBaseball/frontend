import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AdminStats } from '../types/admin';
import { getAdminStatsQueryOptions } from '../hooks/adminStatsQueryOptions';
import type { AdminTabValue } from './admin/adminPageTabs';
import {
  AdminActivityIcon,
  AdminCalendarIcon,
  AdminMessageSquareIcon,
  AdminTrendingUpIcon,
  AdminUsersIcon,
} from './admin/AdminPanelIcons';
import { StatCard } from './admin/StatCard';

const AdminCommunityRuntime = lazy(() => import('./admin/AdminCommunityRuntime'));
const AdminModerationRuntime = lazy(() => import('./admin/AdminModerationRuntime'));
const AdminStadiumsRuntime = lazy(() => import('./admin/AdminStadiumsRuntime'));
const AdminAiOperationsRuntime = lazy(() => import('./admin/AdminAiOperationsRuntime'));

const COMMUNITY_TABS = new Set<AdminTabValue>(['users', 'posts', 'parties']);
const MODERATION_TABS = new Set<AdminTabValue>([
  'reports',
  'gameStatus',
  'clientErrors',
  'seatViews',
  'offseason',
]);
const DEFAULT_ADMIN_STATS: AdminStats = {
  totalUsers: 0,
  totalPosts: 0,
  totalMates: 0,
};

interface AdminPageDataRuntimeProps {
  activeTab: AdminTabValue;
}

export default function AdminPageDataRuntime({ activeTab }: AdminPageDataRuntimeProps) {
  const {
    data: statsData,
    isError: isStatsError,
    refetch: refetchStats,
  } = useQuery(getAdminStatsQueryOptions());
  const stats = statsData ?? DEFAULT_ADMIN_STATS;
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasMountedCommunityRuntime, setHasMountedCommunityRuntime] = useState(
    COMMUNITY_TABS.has(activeTab),
  );
  const [hasMountedModerationRuntime, setHasMountedModerationRuntime] = useState(
    MODERATION_TABS.has(activeTab),
  );
  const [hasMountedStadiumsRuntime, setHasMountedStadiumsRuntime] = useState(activeTab === 'stadiums');
  const [hasMountedAiRuntime, setHasMountedAiRuntime] = useState(activeTab === 'ai');

  const loadStats = useCallback(async () => {
    await refetchStats();
  }, [refetchStats]);

  const statsError = isStatsError ? '통계를 불러오는데 실패했습니다.' : null;
  const displayedError = error ?? statsError;

  useEffect(() => {
    if (COMMUNITY_TABS.has(activeTab)) {
      setHasMountedCommunityRuntime(true);
    }
    if (MODERATION_TABS.has(activeTab)) {
      setHasMountedModerationRuntime(true);
    }
    if (activeTab === 'stadiums') {
      setHasMountedStadiumsRuntime(true);
    }
    if (activeTab === 'ai') {
      setHasMountedAiRuntime(true);
    }
  }, [activeTab]);

  return (
    <>
      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <div className="flex items-center gap-2">
            <AdminActivityIcon className="w-5 h-5" />
            {successMessage}
          </div>
        </div>
      )}

      {displayedError && (
        <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
          <div className="flex items-center gap-2">
            <AdminTrendingUpIcon className="w-5 h-5 rotate-180" />
            {displayedError}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 mb-10 md:grid-cols-2">
        <StatCard icon={AdminUsersIcon} label="전체 사용자" value={stats.totalUsers} color="amber" />
        <div className="grid gap-6">
          <StatCard icon={AdminMessageSquareIcon} label="전체 게시글" value={stats.totalPosts} color="emerald" />
          <StatCard icon={AdminCalendarIcon} label="메이트 모임" value={stats.totalMates} color="sky" />
        </div>
      </div>

      {hasMountedCommunityRuntime && (
        <div className={COMMUNITY_TABS.has(activeTab) ? 'block' : 'hidden'}>
          <Suspense fallback={<div className="mx-6 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">커뮤니티 관리 로딩 중...</div>}>
            <AdminCommunityRuntime
              activeTab={activeTab}
              onErrorChange={setError}
              onSuccessMessageChange={setSuccessMessage}
              refreshStats={loadStats}
            />
          </Suspense>
        </div>
      )}

      {hasMountedModerationRuntime && (
        <div className={MODERATION_TABS.has(activeTab) ? 'block' : 'hidden'}>
          <Suspense fallback={<div className="mx-6 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">모더레이션 패널 로딩 중...</div>}>
            <AdminModerationRuntime
              activeTab={activeTab}
              onErrorChange={setError}
              onSuccessMessageChange={setSuccessMessage}
            />
          </Suspense>
        </div>
      )}

      {hasMountedStadiumsRuntime && (
        <div className={activeTab === 'stadiums' ? 'p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">구장 관리 로딩 중...</div>}>
            <AdminStadiumsRuntime />
          </Suspense>
        </div>
      )}

      {hasMountedAiRuntime && (
        <div className={activeTab === 'ai' ? 'p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">AI 운영 패널 로딩 중...</div>}>
            <AdminAiOperationsRuntime />
          </Suspense>
        </div>
      )}
    </>
  );
}
