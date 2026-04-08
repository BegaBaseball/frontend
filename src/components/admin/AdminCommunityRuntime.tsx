import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  deleteAdminMate,
  deleteAdminPost,
  deleteAdminUser,
  demoteToUser,
  fetchAdminMates,
  fetchAdminPosts,
  fetchAdminUsers,
  promoteToAdmin,
} from '../../api/admin';
import type { AdminMate, AdminPost, AdminUser } from '../../types/admin';
import { useAuthProfileSnapshot } from '../../store/authStore';
import type { AdminTabValue } from './adminPageTabs';

const UsersAdminPanel = lazy(() =>
  import('./UsersAdminPanel').then((module) => ({ default: module.UsersAdminPanel })),
);
const PostsAdminPanel = lazy(() =>
  import('./PostsAdminPanel').then((module) => ({ default: module.PostsAdminPanel })),
);
const MatesAdminPanel = lazy(() =>
  import('./MatesAdminPanel').then((module) => ({ default: module.MatesAdminPanel })),
);
const AdminRoleChangeDialogContent = lazy(() => import('./AdminRoleChangeDialogContent'));

interface PendingRoleChange {
  userId: number;
  userName: string;
  userEmail: string;
  currentRole: string;
  targetRole: 'ROLE_ADMIN' | 'ROLE_USER';
}

interface AdminCommunityRuntimeProps {
  activeTab: AdminTabValue;
  onErrorChange: (next: string | null) => void;
  onSuccessMessageChange: (next: string | null) => void;
  refreshStats: () => Promise<void>;
}

export default function AdminCommunityRuntime({
  activeTab,
  onErrorChange,
  onSuccessMessageChange,
  refreshStats,
}: AdminCommunityRuntimeProps) {
  const queryClient = useQueryClient();
  const { userId: currentUserId, userRole } = useAuthProfileSnapshot();
  const isSuperAdmin = userRole === 'ROLE_SUPER_ADMIN';

  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [mates, setMates] = useState<AdminMate[]>([]);
  const [loading, setLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [matesLoaded, setMatesLoaded] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [roleChangeReason, setRoleChangeReason] = useState('');
  const lastLoadedUsersSearchRef = useRef<string | undefined>(undefined);

  const loadUsers = async (search?: string) => {
    setLoading(true);
    onErrorChange(null);

    try {
      const data = await fetchAdminUsers(search);
      setUsers(data);
      setUsersLoaded(true);
      lastLoadedUsersSearchRef.current = search;
    } catch (error) {
      console.error('유저 조회 오류:', error);
      onErrorChange(error instanceof Error ? error.message : '유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    onErrorChange(null);
    try {
      const data = await fetchAdminPosts();
      setPosts(data);
      setPostsLoaded(true);
    } catch (error) {
      console.error('게시글 조회 오류:', error);
      onErrorChange('게시글을 불러오는데 실패했습니다.');
    }
  };

  const loadMates = async () => {
    onErrorChange(null);
    try {
      const data = await fetchAdminMates();
      setMates(data);
      setMatesLoaded(true);
    } catch (error) {
      console.error('메이트 조회 오류:', error);
      onErrorChange('메이트를 불러오는데 실패했습니다.');
    }
  };

  const clearSuccessMessageLater = () => {
    window.setTimeout(() => onSuccessMessageChange(null), 3000);
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteAdminUser(userId);
      onSuccessMessageChange('유저가 삭제되었습니다.');
      void loadUsers(searchTerm || undefined);
      void refreshStats();
      clearSuccessMessageLater();
    } catch (error) {
      console.error('유저 삭제 오류:', error);
      onErrorChange('유저 삭제에 실패했습니다.');
    }
  };

  const handleDeletePost = async (postId: number) => {
    try {
      await deleteAdminPost(postId);
      onSuccessMessageChange('게시글이 삭제되었습니다.');
      void queryClient.invalidateQueries({ queryKey: ['cheer-posts'] });
      setPosts((prev) => prev.filter((post) => post.id !== postId));
      void refreshStats();
      clearSuccessMessageLater();
    } catch (error) {
      console.error('게시글 삭제 오류:', error);
      onErrorChange('게시글 삭제에 실패했습니다.');
    }
  };

  const handleDeleteMate = async (mateId: number) => {
    try {
      await deleteAdminMate(mateId);
      onSuccessMessageChange('메이트 모임이 삭제되었습니다.');
      setMates((prev) => prev.filter((mate) => mate.id !== mateId));
      void refreshStats();
      clearSuccessMessageLater();
    } catch (error) {
      console.error('메이트 삭제 오류:', error);
      onErrorChange('메이트 삭제에 실패했습니다.');
    }
  };

  const handleRoleChange = async (
    userId: number,
    targetRole: 'ROLE_ADMIN' | 'ROLE_USER',
    reason?: string,
  ) => {
    try {
      if (targetRole === 'ROLE_ADMIN') {
        await promoteToAdmin(userId, reason);
        onSuccessMessageChange('사용자를 관리자로 승격했습니다.');
      } else {
        await demoteToUser(userId, reason);
        onSuccessMessageChange('사용자를 일반 사용자로 강등했습니다.');
      }
      await loadUsers(searchTerm || undefined);
      clearSuccessMessageLater();
    } catch (error) {
      console.error('역할 변경 오류:', error);
      onErrorChange(error instanceof Error ? error.message : '역할 변경에 실패했습니다.');
      window.setTimeout(() => onErrorChange(null), 4000);
    }
  };

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
    if (activeTab !== 'users') {
      return undefined;
    }

    const normalizedSearch = searchTerm || undefined;
    if (normalizedSearch === lastLoadedUsersSearchRef.current) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadUsers(normalizedSearch);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    if (activeTab === 'users' && !usersLoaded) {
      void loadUsers(searchTerm || undefined);
      return;
    }

    if (activeTab === 'posts' && !postsLoaded) {
      void loadPosts();
      return;
    }

    if (activeTab === 'parties' && !matesLoaded) {
      void loadMates();
    }
  }, [activeTab, matesLoaded, postsLoaded, searchTerm, usersLoaded]);

  return (
    <>
      {activeTab === 'users' && (
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

      {activeTab === 'posts' && (
        <div className="p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">게시글 관리 로딩 중...</div>}>
            <PostsAdminPanel posts={posts} handleDeletePost={handleDeletePost} />
          </Suspense>
        </div>
      )}

      {activeTab === 'parties' && (
        <div className="p-6">
          <Suspense fallback={<div className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-16 text-center text-slate-400">메이트 관리 로딩 중...</div>}>
            <MatesAdminPanel mates={mates} handleDeleteMate={handleDeleteMate} />
          </Suspense>
        </div>
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
    </>
  );
}
