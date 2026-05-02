import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { fetchAdminStats } from '../api/admin';
import type { AdminStats } from '../types/admin';
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

interface AdminPageDataRuntimeProps {
  activeTab: AdminTabValue;
}

export default function AdminPageDataRuntime({ activeTab }: AdminPageDataRuntimeProps) {
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalMates: 0,
  });
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
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (loadError) {
      console.error('통계 조회 오류:', loadError);
      setError('통계를 불러오는데 실패했습니다.');
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

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
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 backdrop-blur-sm animate-fade-in-up">
          <div className="flex items-center gap-2">
            <AdminActivityIcon className="w-5 h-5" />
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 backdrop-blur-sm animate-fade-in-up">
          <div className="flex items-center gap-2">
            <AdminTrendingUpIcon className="w-5 h-5 rotate-180" />
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard icon={AdminUsersIcon} label="Total Users" value={stats.totalUsers} color="amber" delay={100} />
        <StatCard icon={AdminMessageSquareIcon} label="Total Posts" value={stats.totalPosts} color="emerald" delay={200} />
        <StatCard icon={AdminCalendarIcon} label="Mate Gatherings" value={stats.totalMates} color="sky" delay={300} />
      </div>

      {hasMountedCommunityRuntime && (
        <div className={COMMUNITY_TABS.has(activeTab) ? 'block' : 'hidden'}>
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400 mx-6">커뮤니티 관리 로딩 중...</div>}>
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
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400 mx-6">모더레이션 패널 로딩 중...</div>}>
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
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">구장 관리 로딩 중...</div>}>
            <AdminStadiumsRuntime />
          </Suspense>
        </div>
      )}

      {hasMountedAiRuntime && (
        <div className={activeTab === 'ai' ? 'p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">AI 운영 패널 로딩 중...</div>}>
            <AdminAiOperationsRuntime />
          </Suspense>
        </div>
      )}
    </>
  );
}
