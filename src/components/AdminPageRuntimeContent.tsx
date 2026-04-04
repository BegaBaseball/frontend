import { lazy, Suspense, useEffect, useState } from 'react';

import './AdminPage.css';
import { Search, Users, MessageSquare, Calendar, Activity, TrendingUp, MapPin, Bot, Newspaper, Camera, Bug, ShieldAlert } from 'lucide-react';
import { useAdminData } from '../hooks/useAdminData';
import { useAuthProfileSnapshot } from '../store/authStore';
import { StatCard } from './admin/StatCard';

const UsersAdminPanel = lazy(() =>
  import('./admin/UsersAdminPanel').then((module) => ({ default: module.UsersAdminPanel })),
);
const PostsAdminPanel = lazy(() =>
  import('./admin/PostsAdminPanel').then((module) => ({ default: module.PostsAdminPanel })),
);
const MatesAdminPanel = lazy(() =>
  import('./admin/MatesAdminPanel').then((module) => ({ default: module.MatesAdminPanel })),
);
const OffseasonMovementAdminPanel = lazy(() =>
  import('./admin/OffseasonMovementAdminPanel').then((module) => ({ default: module.OffseasonMovementAdminPanel })),
);
const ClientErrorAdminPanel = lazy(() =>
  import('./admin/ClientErrorAdminPanel').then((module) => ({ default: module.ClientErrorAdminPanel })),
);
const AdminReportsPanel = lazy(() =>
  import('./admin/AdminReportsPanel').then((module) => ({ default: module.AdminReportsPanel })),
);
const AdminGameStatusRepairPanel = lazy(() =>
  import('./admin/AdminGameStatusRepairPanel').then((module) => ({ default: module.AdminGameStatusRepairPanel })),
);
const AdminSeatViewsPanel = lazy(() =>
  import('./admin/AdminSeatViewsPanel').then((module) => ({ default: module.AdminSeatViewsPanel })),
);
const AdminRoleChangeDialogContent = lazy(() => import('./admin/AdminRoleChangeDialogContent'));
const AdminReportDetailDrawer = lazy(() => import('./admin/AdminReportDetailDrawer'));
const AdminSeatViewDetailDrawer = lazy(() => import('./admin/AdminSeatViewDetailDrawer'));
const AdminStadiumsRuntime = lazy(() => import('./admin/AdminStadiumsRuntime'));
const AdminAiOperationsRuntime = lazy(() => import('./admin/AdminAiOperationsRuntime'));

const adminTabItems = [
  { value: 'users', label: '유저', icon: Users, activeClassName: 'bg-amber-500 text-slate-900 shadow-lg shadow-amber-500/25', testId: 'admin-tab-users' },
  { value: 'posts', label: '게시글', icon: MessageSquare, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25' },
  { value: 'parties', label: '메이트', icon: Calendar, activeClassName: 'bg-sky-500 text-slate-900 shadow-lg shadow-sky-500/25' },
  { value: 'reports', label: '신고', icon: Search, activeClassName: 'bg-red-500 text-slate-900 shadow-lg shadow-red-500/25', testId: 'admin-tab-reports' },
  { value: 'gameStatus', label: '경기 복구', icon: ShieldAlert, activeClassName: 'bg-orange-500 text-slate-900 shadow-lg shadow-orange-500/25', testId: 'admin-tab-game-status' },
  { value: 'clientErrors', label: '클라이언트 에러', icon: Bug, activeClassName: 'bg-rose-500 text-slate-900 shadow-lg shadow-rose-500/25', testId: 'admin-tab-client-errors' },
  { value: 'seatViews', label: '시야뷰', icon: Camera, activeClassName: 'bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/25', testId: 'admin-tab-seat-views' },
  { value: 'offseason', label: '스토브리그', icon: Newspaper, activeClassName: 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/25', testId: 'admin-tab-offseason' },
  { value: 'stadiums', label: '구장', icon: MapPin, activeClassName: 'bg-violet-500 text-slate-900 shadow-lg shadow-violet-500/25', testId: 'admin-tab-stadiums' },
  { value: 'ai', label: 'AI 운영', icon: Bot, activeClassName: 'bg-fuchsia-500 text-slate-900 shadow-lg shadow-fuchsia-500/25', testId: 'admin-tab-ai' },
] as const;

type AdminTabValue = (typeof adminTabItems)[number]['value'];

interface PendingRoleChange {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

export default function AdminPageRuntimeContent() {
  const {
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    users,
    posts,
    mates,
    reports,
    seatViews,
    reportsLoading,
    seatViewsLoading,
    reportFilters,
    seatViewFilters,
    selectedReportId,
    selectedReportDetail,
    reportDetailLoading,
    selectedSeatViewId,
    selectedSeatViewDetail,
    seatViewDetailLoading,
    stats,
    loading,
    error,
    successMessage,
    updateReportFilters,
    resetReportFilters,
    updateSeatViewFilters,
    resetSeatViewFilters,
    openReportDetail,
    closeReportDetail,
    openSeatViewDetail,
    closeSeatViewDetail,
    handleDeleteUser,
    handleDeletePost,
    handleDeleteMate,
    handleReportAction,
    handleSeatViewAction,
    handleRoleChange,
  } = useAdminData();

  const { userId: currentUserId, userRole } = useAuthProfileSnapshot();
  const isSuperAdmin = userRole === 'ROLE_SUPER_ADMIN';

  const [adminMemo, setAdminMemo] = useState('');
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [roleChangeReason, setRoleChangeReason] = useState('');

  const activeAdminTab = adminTabItems.some((item) => item.value === activeTab)
    ? activeTab as AdminTabValue
    : 'users';
  const [hasMountedStadiumsRuntime, setHasMountedStadiumsRuntime] = useState(activeAdminTab === 'stadiums');
  const [hasMountedAiRuntime, setHasMountedAiRuntime] = useState(activeAdminTab === 'ai');
  const [hasMountedGameStatusRuntime, setHasMountedGameStatusRuntime] = useState(activeAdminTab === 'gameStatus');

  const handleRoleChangeConfirm = async () => {
    if (!pendingRoleChange) {
      return;
    }

    await handleRoleChange(
      pendingRoleChange.userId,
      pendingRoleChange.targetRole,
      roleChangeReason || undefined,
    );
    setPendingRoleChange(null);
    setRoleChangeReason('');
  };

  useEffect(() => {
    setAdminMemo(selectedReportDetail?.adminMemo || '');
  }, [selectedReportDetail?.id]);

  useEffect(() => {
    if (selectedSeatViewDetail) {
      setAdminMemo(selectedSeatViewDetail.adminMemo || '');
    }
  }, [selectedSeatViewDetail]);

  useEffect(() => {
    if (activeAdminTab === 'stadiums') {
      setHasMountedStadiumsRuntime(true);
    }
    if (activeAdminTab === 'ai') {
      setHasMountedAiRuntime(true);
    }
    if (activeAdminTab === 'gameStatus') {
      setHasMountedGameStatusRuntime(true);
    }
  }, [activeAdminTab]);

  return (
    <>
      {successMessage && (
        <div className="mb-6 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 backdrop-blur-sm animate-fade-in-up">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {successMessage}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 backdrop-blur-sm animate-fade-in-up">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 rotate-180" />
            {error}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="amber" delay={100} />
        <StatCard icon={MessageSquare} label="Total Posts" value={stats.totalPosts} color="emerald" delay={200} />
        <StatCard icon={Calendar} label="Mate Gatherings" value={stats.totalMates} color="sky" delay={300} />
      </div>

      <div
        className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-sm shadow-2xl overflow-hidden animate-fade-in-up"
        style={{ animationDelay: '400ms' }}
      >
        <div className="border-b border-slate-800 px-6 pt-6">
          <div className="grid w-full grid-cols-3 gap-1 rounded-xl bg-slate-800/50 p-1 sm:grid-cols-5 xl:grid-cols-10">
            {adminTabItems.map((item) => {
              const { value, label, icon: Icon, activeClassName } = item;
              const isActive = activeAdminTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  data-testid={'testId' in item ? item.testId : undefined}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(value)}
                  className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm transition-all duration-300 ${
                    isActive
                      ? activeClassName
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {activeAdminTab === 'users' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">유저 관리 로딩 중...</div>}>
              <UsersAdminPanel
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                users={users.map((user) => ({
                  ...user,
                  favoriteTeam: user.favoriteTeam ?? undefined,
                }))}
                loading={loading}
                isSuperAdmin={isSuperAdmin}
                currentUserId={currentUserId}
                handleDeleteUser={handleDeleteUser}
                setPendingRoleChange={setPendingRoleChange}
                setRoleChangeReason={setRoleChangeReason}
              />
            </Suspense>
          </div>
        )}

        {activeAdminTab === 'posts' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">게시글 관리 로딩 중...</div>}>
              <PostsAdminPanel posts={posts} handleDeletePost={handleDeletePost} />
            </Suspense>
          </div>
        )}

        {activeAdminTab === 'parties' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">메이트 관리 로딩 중...</div>}>
              <MatesAdminPanel mates={mates} handleDeleteMate={handleDeleteMate} />
            </Suspense>
          </div>
        )}

        {activeAdminTab === 'reports' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">신고 관리 로딩 중...</div>}>
              <AdminReportsPanel
                reportFilters={reportFilters}
                reportsLoading={reportsLoading}
                reports={reports}
                updateReportFilters={updateReportFilters}
                resetReportFilters={resetReportFilters}
                openReportDetail={openReportDetail}
                handleReportAction={handleReportAction}
              />
            </Suspense>
          </div>
        )}

        {hasMountedGameStatusRuntime && (
          <div className={activeAdminTab === 'gameStatus' ? 'p-6' : 'hidden'}>
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">경기 복구 패널 로딩 중...</div>}>
              <AdminGameStatusRepairPanel active={activeAdminTab === 'gameStatus'} />
            </Suspense>
          </div>
        )}

        {activeAdminTab === 'clientErrors' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">클라이언트 에러 관제 로딩 중...</div>}>
              <ClientErrorAdminPanel active />
            </Suspense>
          </div>
        )}

        {activeAdminTab === 'seatViews' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">시야뷰 관리 로딩 중...</div>}>
              <AdminSeatViewsPanel
                seatViewFilters={seatViewFilters}
                seatViewsLoading={seatViewsLoading}
                seatViews={seatViews}
                updateSeatViewFilters={updateSeatViewFilters}
                resetSeatViewFilters={resetSeatViewFilters}
                openSeatViewDetail={openSeatViewDetail}
                handleSeatViewAction={handleSeatViewAction}
              />
            </Suspense>
          </div>
        )}

        {activeAdminTab === 'offseason' && (
          <div className="p-6">
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">스토브리그 관리 로딩 중...</div>}>
              <OffseasonMovementAdminPanel active />
            </Suspense>
          </div>
        )}

        {hasMountedStadiumsRuntime && (
          <div className={activeAdminTab === 'stadiums' ? 'p-6' : 'hidden'}>
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">구장 관리 로딩 중...</div>}>
              <AdminStadiumsRuntime />
            </Suspense>
          </div>
        )}

        {hasMountedAiRuntime && (
          <div className={activeAdminTab === 'ai' ? 'p-6' : 'hidden'}>
            <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">AI 운영 패널 로딩 중...</div>}>
              <AdminAiOperationsRuntime />
            </Suspense>
          </div>
        )}
      </div>

      {selectedReportId && (
        <Suspense fallback={null}>
          <AdminReportDetailDrawer
            selectedReportId={selectedReportId}
            selectedReportDetail={selectedReportDetail}
            reportDetailLoading={reportDetailLoading}
            adminMemo={adminMemo}
            setAdminMemo={setAdminMemo}
            closeReportDetail={closeReportDetail}
            handleReportAction={handleReportAction}
          />
        </Suspense>
      )}

      {selectedSeatViewId && (
        <Suspense fallback={null}>
          <AdminSeatViewDetailDrawer
            selectedSeatViewId={selectedSeatViewId}
            selectedSeatViewDetail={selectedSeatViewDetail}
            seatViewDetailLoading={seatViewDetailLoading}
            adminMemo={adminMemo}
            setAdminMemo={setAdminMemo}
            closeSeatViewDetail={closeSeatViewDetail}
            handleSeatViewAction={handleSeatViewAction}
          />
        </Suspense>
      )}

      {pendingRoleChange !== null && (
        <Suspense fallback={null}>
          <AdminRoleChangeDialogContent
            open
            pendingRoleChange={pendingRoleChange}
            roleChangeReason={roleChangeReason}
            setRoleChangeReason={setRoleChangeReason}
            onOpenChange={(open) => {
              if (!open) {
                setPendingRoleChange(null);
              }
            }}
            onConfirm={handleRoleChangeConfirm}
          />
        </Suspense>
      )}

      <footer className="mt-10 text-center text-slate-600 text-sm">
        <p>BEGA Platform Admin Dashboard v2.0</p>
      </footer>
    </>
  );
}
