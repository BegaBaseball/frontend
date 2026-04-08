import { lazy, Suspense, useCallback, useEffect, useState } from 'react';

import {
  fetchAdminReportDetail,
  fetchAdminReports,
  fetchAdminSeatViewDetail,
  fetchAdminSeatViews,
  handleAdminReport,
  handleAdminSeatView,
} from '../../api/admin';
import type {
  AdminReport,
  AdminReportFilters,
  AdminSeatView,
  AdminSeatViewFilters,
} from '../../types/admin';
import type { AdminTabValue } from './adminPageTabs';

const OffseasonMovementAdminPanel = lazy(() =>
  import('./OffseasonMovementAdminPanel').then((module) => ({
    default: module.OffseasonMovementAdminPanel,
  })),
);
const ClientErrorAdminPanel = lazy(() =>
  import('./ClientErrorAdminPanel').then((module) => ({ default: module.ClientErrorAdminPanel })),
);
const AdminReportsPanel = lazy(() =>
  import('./AdminReportsPanel').then((module) => ({ default: module.AdminReportsPanel })),
);
const AdminGameStatusRepairPanel = lazy(() =>
  import('./AdminGameStatusRepairPanel').then((module) => ({
    default: module.AdminGameStatusRepairPanel,
  })),
);
const AdminSeatViewsPanel = lazy(() =>
  import('./AdminSeatViewsPanel').then((module) => ({ default: module.AdminSeatViewsPanel })),
);
const AdminReportDetailDrawer = lazy(() => import('./AdminReportDetailDrawer'));
const AdminSeatViewDetailDrawer = lazy(() => import('./AdminSeatViewDetailDrawer'));

type AdminReportAction =
  | 'TAKE_DOWN'
  | 'REQUIRE_MODIFICATION'
  | 'WARNING'
  | 'DISMISS'
  | 'RESTORE';

const DEFAULT_REPORT_FILTERS: AdminReportFilters = {
  status: 'all',
  reason: 'all',
  fromDate: '',
  toDate: '',
};

const DEFAULT_SEAT_VIEW_FILTERS: AdminSeatViewFilters = {
  moderationStatus: 'all',
  stadium: '',
  aiSuggestedLabel: 'all',
  adminLabel: 'all',
  ticketVerified: 'all',
};

interface AdminModerationRuntimeProps {
  activeTab: AdminTabValue;
  onErrorChange: (next: string | null) => void;
  onSuccessMessageChange: (next: string | null) => void;
}

export default function AdminModerationRuntime({
  activeTab,
  onErrorChange,
  onSuccessMessageChange,
}: AdminModerationRuntimeProps) {
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [seatViews, setSeatViews] = useState<AdminSeatView[]>([]);
  const [reportFilters, setReportFilters] = useState<AdminReportFilters>(DEFAULT_REPORT_FILTERS);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const [selectedReportDetail, setSelectedReportDetail] = useState<AdminReport | null>(null);
  const [reportDetailLoading, setReportDetailLoading] = useState(false);
  const [seatViewFilters, setSeatViewFilters] = useState<AdminSeatViewFilters>(DEFAULT_SEAT_VIEW_FILTERS);
  const [seatViewsLoading, setSeatViewsLoading] = useState(false);
  const [selectedSeatViewId, setSelectedSeatViewId] = useState<number | null>(null);
  const [selectedSeatViewDetail, setSelectedSeatViewDetail] = useState<AdminSeatView | null>(null);
  const [seatViewDetailLoading, setSeatViewDetailLoading] = useState(false);
  const [adminMemo, setAdminMemo] = useState('');
  const [hasMountedGameStatusRuntime, setHasMountedGameStatusRuntime] = useState(
    activeTab === 'gameStatus',
  );

  const updateReportFilters = (next: Partial<AdminReportFilters>) => {
    setReportFilters((prev) => ({ ...prev, ...next }));
  };

  const resetReportFilters = () => {
    setReportFilters(DEFAULT_REPORT_FILTERS);
  };

  const updateSeatViewFilters = (next: Partial<AdminSeatViewFilters>) => {
    setSeatViewFilters((prev) => ({ ...prev, ...next }));
  };

  const resetSeatViewFilters = () => {
    setSeatViewFilters(DEFAULT_SEAT_VIEW_FILTERS);
  };

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    onErrorChange(null);
    try {
      const data = await fetchAdminReports({
        status: reportFilters.status !== 'all' ? reportFilters.status : undefined,
        reason: reportFilters.reason !== 'all' ? reportFilters.reason : undefined,
        fromDate: reportFilters.fromDate || undefined,
        toDate: reportFilters.toDate || undefined,
        page: 0,
        size: 100,
      });
      setReports(data.content || []);
    } catch (error) {
      console.error('신고 조회 오류:', error);
      onErrorChange('신고 목록을 불러오는데 실패했습니다.');
    } finally {
      setReportsLoading(false);
    }
  }, [onErrorChange, reportFilters]);

  const openReportDetail = async (reportId: number) => {
    setSelectedReportId(reportId);
    setReportDetailLoading(true);
    try {
      const detail = await fetchAdminReportDetail(reportId);
      setSelectedReportDetail(detail);
    } catch (error) {
      console.error('신고 상세 조회 오류:', error);
      onErrorChange('신고 상세를 불러오는데 실패했습니다.');
    } finally {
      setReportDetailLoading(false);
    }
  };

  const closeReportDetail = () => {
    setSelectedReportId(null);
    setSelectedReportDetail(null);
  };

  const refreshSelectedReportDetail = useCallback(async () => {
    if (!selectedReportId) {
      return;
    }

    setReportDetailLoading(true);
    try {
      const detail = await fetchAdminReportDetail(selectedReportId);
      setSelectedReportDetail(detail);
    } catch (error) {
      console.error('신고 상세 재조회 오류:', error);
      onErrorChange('신고 상세를 갱신하지 못했습니다.');
    } finally {
      setReportDetailLoading(false);
    }
  }, [onErrorChange, selectedReportId]);

  const handleReportAction = async (
    reportId: number,
    action: AdminReportAction,
    nextAdminMemo?: string,
  ) => {
    try {
      await handleAdminReport(reportId, { action, adminMemo: nextAdminMemo });
      onSuccessMessageChange('신고 케이스가 처리되었습니다.');
      await loadReports();
      if (selectedReportId === reportId) {
        await refreshSelectedReportDetail();
      }
      window.setTimeout(() => onSuccessMessageChange(null), 3000);
    } catch (error) {
      console.error('신고 처리 오류:', error);
      onErrorChange('신고 처리에 실패했습니다.');
    }
  };

  const loadSeatViews = useCallback(async () => {
    setSeatViewsLoading(true);
    onErrorChange(null);
    try {
      const data = await fetchAdminSeatViews({
        moderationStatus:
          seatViewFilters.moderationStatus !== 'all'
            ? seatViewFilters.moderationStatus
            : undefined,
        stadium: seatViewFilters.stadium || undefined,
        aiSuggestedLabel:
          seatViewFilters.aiSuggestedLabel !== 'all'
            ? seatViewFilters.aiSuggestedLabel
            : undefined,
        adminLabel:
          seatViewFilters.adminLabel !== 'all' ? seatViewFilters.adminLabel : undefined,
        ticketVerified:
          seatViewFilters.ticketVerified === 'all'
            ? undefined
            : seatViewFilters.ticketVerified === 'verified',
      });
      setSeatViews(data);
    } catch (error) {
      console.error('시야뷰 후보 조회 오류:', error);
      onErrorChange('시야뷰 후보를 불러오는데 실패했습니다.');
    } finally {
      setSeatViewsLoading(false);
    }
  }, [onErrorChange, seatViewFilters]);

  const openSeatViewDetail = async (seatViewId: number) => {
    setSelectedSeatViewId(seatViewId);
    setSeatViewDetailLoading(true);
    try {
      const detail = await fetchAdminSeatViewDetail(seatViewId);
      setSelectedSeatViewDetail(detail);
    } catch (error) {
      console.error('시야뷰 후보 상세 조회 오류:', error);
      onErrorChange('시야뷰 후보 상세를 불러오는데 실패했습니다.');
    } finally {
      setSeatViewDetailLoading(false);
    }
  };

  const closeSeatViewDetail = () => {
    setSelectedSeatViewId(null);
    setSelectedSeatViewDetail(null);
  };

  const refreshSelectedSeatViewDetail = useCallback(async () => {
    if (!selectedSeatViewId) {
      return;
    }

    setSeatViewDetailLoading(true);
    try {
      const detail = await fetchAdminSeatViewDetail(selectedSeatViewId);
      setSelectedSeatViewDetail(detail);
    } catch (error) {
      console.error('시야뷰 후보 상세 재조회 오류:', error);
      onErrorChange('시야뷰 후보 상세를 갱신하지 못했습니다.');
    } finally {
      setSeatViewDetailLoading(false);
    }
  }, [onErrorChange, selectedSeatViewId]);

  const handleSeatViewAction = async (
    seatViewId: number,
    payload: {
      adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
      moderationStatus: 'APPROVED' | 'REJECTED';
      adminMemo?: string;
    },
  ) => {
    try {
      await handleAdminSeatView(seatViewId, payload);
      onSuccessMessageChange('시야뷰 후보가 처리되었습니다.');
      await loadSeatViews();
      if (selectedSeatViewId === seatViewId) {
        await refreshSelectedSeatViewDetail();
      }
      window.setTimeout(() => onSuccessMessageChange(null), 3000);
    } catch (error) {
      console.error('시야뷰 후보 처리 오류:', error);
      onErrorChange('시야뷰 후보 처리에 실패했습니다.');
    }
  };

  useEffect(() => {
    if (selectedReportDetail) {
      setAdminMemo(selectedReportDetail.adminMemo || '');
    }
  }, [selectedReportDetail]);

  useEffect(() => {
    if (selectedSeatViewDetail) {
      setAdminMemo(selectedSeatViewDetail.adminMemo || '');
    }
  }, [selectedSeatViewDetail]);

  useEffect(() => {
    if (activeTab === 'reports') {
      void loadReports();
    }
  }, [activeTab, loadReports]);

  useEffect(() => {
    if (activeTab === 'seatViews') {
      void loadSeatViews();
    }
  }, [activeTab, loadSeatViews]);

  useEffect(() => {
    if (activeTab === 'gameStatus') {
      setHasMountedGameStatusRuntime(true);
    }
  }, [activeTab]);

  return (
    <>
      {activeTab === 'reports' && (
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
        <div className={activeTab === 'gameStatus' ? 'p-6' : 'hidden'}>
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">경기 복구 패널 로딩 중...</div>}>
            <AdminGameStatusRepairPanel active={activeTab === 'gameStatus'} />
          </Suspense>
        </div>
      )}

      {activeTab === 'clientErrors' && (
        <div className="p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">클라이언트 에러 관제 로딩 중...</div>}>
            <ClientErrorAdminPanel active />
          </Suspense>
        </div>
      )}

      {activeTab === 'seatViews' && (
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

      {activeTab === 'offseason' && (
        <div className="p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">스토브리그 관리 로딩 중...</div>}>
            <OffseasonMovementAdminPanel active />
          </Suspense>
        </div>
      )}

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
    </>
  );
}
