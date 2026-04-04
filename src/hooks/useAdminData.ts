// hooks/useAdminData.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminStats,
  fetchAdminUsers,
  deleteAdminUser,
  fetchAdminPosts,
  deleteAdminPost,
  fetchAdminMates,
  deleteAdminMate,
  fetchAdminReportDetail,
  fetchAdminReports,
  fetchAdminSeatViewDetail,
  fetchAdminSeatViews,
  handleAdminSeatView,
  handleAdminReport,
  promoteToAdmin,
  demoteToUser,
} from '../api/admin';
import {
  AdminUser,
  AdminStats,
  AdminPost,
  AdminMate,
  AdminReport,
  AdminReportFilters,
  AdminSeatView,
  AdminSeatViewFilters,
} from '../types/admin';

type AdminReportAction = 'TAKE_DOWN' | 'REQUIRE_MODIFICATION' | 'WARNING' | 'DISMISS' | 'RESTORE';

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

export const useAdminData = () => {
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [mates, setMates] = useState<AdminMate[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [seatViews, setSeatViews] = useState<AdminSeatView[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalMates: 0,
  });

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

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [matesLoaded, setMatesLoaded] = useState(false);
  const lastLoadedUsersSearchRef = useRef<string | undefined>(undefined);

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

  // 통계 조회
  const loadStats = async () => {
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      console.error('통계 조회 오류:', err);
      setError('통계를 불러오는데 실패했습니다.');
    }
  };

  // 유저 목록 조회
  const loadUsers = async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAdminUsers(search);
      setUsers(data);
      setUsersLoaded(true);
      lastLoadedUsersSearchRef.current = search;
    } catch (err) {
      console.error('유저 조회 오류:', err);
      setError(err instanceof Error ? err.message : '유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 유저 삭제
  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteAdminUser(userId);
      setSuccessMessage('유저가 삭제되었습니다.');
      loadUsers(searchTerm || undefined);
      loadStats();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('유저 삭제 오류:', err);
      setError('유저 삭제에 실패했습니다.');
    }
  };

  // 게시글 목록 조회
  const loadPosts = async () => {
    try {
      const data = await fetchAdminPosts();
      setPosts(data);
      setPostsLoaded(true);
    } catch (err) {
      console.error('게시글 조회 오류:', err);
      setError('게시글을 불러오는데 실패했습니다.');
    }
  };

  // 게시글 삭제
  const handleDeletePost = async (postId: number) => {
    try {
      await deleteAdminPost(postId);
      setSuccessMessage('게시글이 삭제되었습니다.');
      queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      loadStats();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('게시글 삭제 오류:', err);
      setError('게시글 삭제에 실패했습니다.');
    }
  };

  // 메이트 목록 조회
  const loadMates = async () => {
    try {
      const data = await fetchAdminMates();
      setMates(data);
      setMatesLoaded(true);
    } catch (err) {
      console.error('메이트 조회 오류:', err);
      setError('메이트를 불러오는데 실패했습니다.');
    }
  };

  // 역할 변경 (SUPER_ADMIN 전용)
  const handleRoleChange = async (userId: number, targetRole: 'ROLE_ADMIN' | 'ROLE_USER', reason?: string) => {
    try {
      if (targetRole === 'ROLE_ADMIN') {
        await promoteToAdmin(userId, reason);
        setSuccessMessage('사용자를 관리자로 승격했습니다.');
      } else {
        await demoteToUser(userId, reason);
        setSuccessMessage('사용자를 일반 사용자로 강등했습니다.');
      }
      // 목록 갱신하여 변경된 역할 반영
      await loadUsers(searchTerm || undefined);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('역할 변경 오류:', err);
      setError(err instanceof Error ? err.message : '역할 변경에 실패했습니다.');
      setTimeout(() => setError(null), 4000);
    }
  };

  // 메이트 삭제
  const handleDeleteMate = async (mateId: number) => {
    try {
      await deleteAdminMate(mateId);
      setSuccessMessage('메이트 모임이 삭제되었습니다.');
      setMates((prev) => prev.filter((m) => m.id !== mateId));
      loadStats();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('메이트 삭제 오류:', err);
      setError('메이트 삭제에 실패했습니다.');
    }
  };

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setError(null);
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
    } catch (err) {
      console.error('신고 조회 오류:', err);
      setError('신고 목록을 불러오는데 실패했습니다.');
    } finally {
      setReportsLoading(false);
    }
  }, [reportFilters]);

  const openReportDetail = async (reportId: number) => {
    setSelectedReportId(reportId);
    setReportDetailLoading(true);
    try {
      const detail = await fetchAdminReportDetail(reportId);
      setSelectedReportDetail(detail);
    } catch (err) {
      console.error('신고 상세 조회 오류:', err);
      setError('신고 상세를 불러오는데 실패했습니다.');
    } finally {
      setReportDetailLoading(false);
    }
  };

  const closeReportDetail = () => {
    setSelectedReportId(null);
    setSelectedReportDetail(null);
  };

  const refreshSelectedReportDetail = useCallback(async () => {
    if (!selectedReportId) return;
    setReportDetailLoading(true);
    try {
      const detail = await fetchAdminReportDetail(selectedReportId);
      setSelectedReportDetail(detail);
    } catch (err) {
      console.error('신고 상세 재조회 오류:', err);
      setError('신고 상세를 갱신하지 못했습니다.');
    } finally {
      setReportDetailLoading(false);
    }
  }, [selectedReportId]);

  const handleReportAction = async (
    reportId: number,
    action: AdminReportAction,
    adminMemo?: string
  ) => {
    try {
      await handleAdminReport(reportId, { action, adminMemo });
      setSuccessMessage('신고 케이스가 처리되었습니다.');
      await loadReports();
      if (selectedReportId === reportId) {
        await refreshSelectedReportDetail();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('신고 처리 오류:', err);
      setError('신고 처리에 실패했습니다.');
    }
  };

  const loadSeatViews = useCallback(async () => {
    setSeatViewsLoading(true);
    setError(null);
    try {
      const data = await fetchAdminSeatViews({
        moderationStatus: seatViewFilters.moderationStatus !== 'all' ? seatViewFilters.moderationStatus : undefined,
        stadium: seatViewFilters.stadium || undefined,
        aiSuggestedLabel: seatViewFilters.aiSuggestedLabel !== 'all' ? seatViewFilters.aiSuggestedLabel : undefined,
        adminLabel: seatViewFilters.adminLabel !== 'all' ? seatViewFilters.adminLabel : undefined,
        ticketVerified: seatViewFilters.ticketVerified === 'all'
          ? undefined
          : seatViewFilters.ticketVerified === 'verified',
      });
      setSeatViews(data);
    } catch (err) {
      console.error('시야뷰 후보 조회 오류:', err);
      setError('시야뷰 후보를 불러오는데 실패했습니다.');
    } finally {
      setSeatViewsLoading(false);
    }
  }, [seatViewFilters]);

  const openSeatViewDetail = async (seatViewId: number) => {
    setSelectedSeatViewId(seatViewId);
    setSeatViewDetailLoading(true);
    try {
      const detail = await fetchAdminSeatViewDetail(seatViewId);
      setSelectedSeatViewDetail(detail);
    } catch (err) {
      console.error('시야뷰 후보 상세 조회 오류:', err);
      setError('시야뷰 후보 상세를 불러오는데 실패했습니다.');
    } finally {
      setSeatViewDetailLoading(false);
    }
  };

  const closeSeatViewDetail = () => {
    setSelectedSeatViewId(null);
    setSelectedSeatViewDetail(null);
  };

  const refreshSelectedSeatViewDetail = useCallback(async () => {
    if (!selectedSeatViewId) return;
    setSeatViewDetailLoading(true);
    try {
      const detail = await fetchAdminSeatViewDetail(selectedSeatViewId);
      setSelectedSeatViewDetail(detail);
    } catch (err) {
      console.error('시야뷰 후보 상세 재조회 오류:', err);
      setError('시야뷰 후보 상세를 갱신하지 못했습니다.');
    } finally {
      setSeatViewDetailLoading(false);
    }
  }, [selectedSeatViewId]);

  const handleSeatViewAction = async (
    seatViewId: number,
    payload: {
      adminLabel: 'SEAT_VIEW' | 'TICKET' | 'OTHER' | 'INAPPROPRIATE';
      moderationStatus: 'APPROVED' | 'REJECTED';
      adminMemo?: string;
    }
  ) => {
    try {
      await handleAdminSeatView(seatViewId, payload);
      setSuccessMessage('시야뷰 후보가 처리되었습니다.');
      await loadSeatViews();
      if (selectedSeatViewId === seatViewId) {
        await refreshSelectedSeatViewDetail();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('시야뷰 후보 처리 오류:', err);
      setError('시야뷰 후보 처리에 실패했습니다.');
    }
  };

  // 검색어 디바운싱
  useEffect(() => {
    if (activeTab !== 'users') {
      return undefined;
    }

    const normalizedSearch = searchTerm || undefined;
    if (normalizedSearch === lastLoadedUsersSearchRef.current) {
      return undefined;
    }

    const timer = setTimeout(() => {
      loadUsers(normalizedSearch);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  // 초기 데이터 로드
  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && !usersLoaded) {
      loadUsers(searchTerm || undefined);
      return;
    }

    if (activeTab === 'posts' && !postsLoaded) {
      loadPosts();
      return;
    }

    if (activeTab === 'parties' && !matesLoaded) {
      loadMates();
    }
  }, [activeTab, matesLoaded, postsLoaded, searchTerm, usersLoaded]);

  // 신고 탭 필터 반영 조회
  useEffect(() => {
    if (activeTab === 'reports') {
      loadReports();
    }
  }, [activeTab, loadReports]);

  useEffect(() => {
    if (activeTab === 'seatViews') {
      loadSeatViews();
    }
  }, [activeTab, loadSeatViews]);

  return {
    // 상태
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

    // 액션
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
  };
};
