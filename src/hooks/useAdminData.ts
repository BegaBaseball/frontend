// hooks/useAdminData.ts
import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query'; // Added
import {
  fetchAdminStats,
  fetchAdminUsers,
  deleteAdminUser,
  fetchAdminPosts,
  deleteAdminPost,
  fetchAdminMates,
  deleteAdminMate,
} from '../api/admin';
import { AdminUser, AdminStats, AdminPost, AdminMate } from '../types/admin';
// import { useCheerStore } from '../store/cheerStore'; // Removed

export const useAdminData = () => {
  // const { removePostFromState } = useCheerStore(); // Removed
  const queryClient = useQueryClient(); // Added

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [mates, setMates] = useState<AdminMate[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalPosts: 0,
    totalMates: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

      // 목록 새로고침
      loadUsers(searchTerm || undefined);
      loadStats();

      // 3초 후 성공 메시지 제거
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

      // Store에서도 삭제 -> Invalidate Queries
      // removePostFromState(postId);
      queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });

      // 목록에서도 삭제
      setPosts(prev => prev.filter(p => p.id !== postId));

      // 통계 갱신
      loadStats();

      // 3초 후 성공 메시지 제거
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
    } catch (err) {
      console.error('메이트 조회 오류:', err);
      setError('메이트를 불러오는데 실패했습니다.');
    }
  };

  // 메이트 삭제
  const handleDeleteMate = async (mateId: number) => {
    try {
      await deleteAdminMate(mateId);
      setSuccessMessage('메이트 모임이 삭제되었습니다.');

      // 목록에서도 삭제
      setMates(prev => prev.filter(m => m.id !== mateId));

      // 통계 갱신
      loadStats();

      // 3초 후 성공 메시지 제거
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('메이트 삭제 오류:', err);
      setError('메이트 삭제에 실패했습니다.');
    }
  };

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === 'users') {
        loadUsers(searchTerm || undefined);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, activeTab]);

  // 초기 데이터 로드
  useEffect(() => {
    loadStats();
    loadUsers();
    loadPosts();
    loadMates();
  }, []);

  return {
    // 상태
    searchTerm,
    setSearchTerm,
    activeTab,
    setActiveTab,
    users,
    posts,
    mates,
    stats,
    loading,
    error,
    successMessage,

    // 액션
    handleDeleteUser,
    handleDeletePost,
    handleDeleteMate,
  };
};