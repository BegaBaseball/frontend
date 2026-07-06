import { lazy, Suspense, useState } from 'react';

import { TicketInfo } from '../api/ticket';
import { useMyPage } from '../hooks/useMyPage';
import { useDiaryStore } from '../store/diaryStore';
import './mypage/MyPageSeason.css';

const MyPageSidebarRuntime = lazy(() => import('./mypage/MyPageSidebarRuntime'));
const MyPageViewRuntime = lazy(() => import('./mypage/MyPageViewRuntime'));
const UserListModal = lazy(() => import('./profile/UserListModal'));
const TicketUploadModal = lazy(() =>
  import('./ticket/TicketUploadModal').then((module) => ({ default: module.TicketUploadModal })),
);

export default function MyPageRuntime() {
  const {
    isLoggedIn,
    user,
    profile,
    profileImage,
    name,
    handle,
    email,
    savedFavoriteTeam,
    viewMode,
    setViewMode,
    selectedDiaryDate,
    handleProfileUpdated,
    isLoading: isProfileLoading,
  } = useMyPage();

  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const cheerPoints = profile?.cheerPoints ?? user?.cheerPoints ?? 0;
  const effectiveUserProvider = profile?.provider ?? user?.provider;
  const effectiveHasPassword = profile?.hasPassword ?? user?.hasPassword;
  const effectiveBio = profile?.bio ?? user?.bio;

  const handleTicketConfirm = (data: TicketInfo) => {
    setPendingDraft({
      date: data.date || new Date().toISOString().split('T')[0],
      gameId: data.gameId ? Number(data.gameId) : undefined,
      stadium: data.stadium || '',
      team: data.homeTeam ? `${data.awayTeam} vs ${data.homeTeam}` : '',
      section: data.section || '',
      seatRow: data.row || '',
      seatNumber: data.seat || '',
    });

    setViewMode('diaryEditor', { date: data.date || new Date().toISOString().split('T')[0] });
  };

  const [userListModal, setUserListModal] = useState<{
    isOpen: boolean;
    type: 'followers' | 'following';
    title: string;
  }>({
    isOpen: false,
    type: 'followers',
    title: '',
  });
  const [hasMountedUserListModal, setHasMountedUserListModal] = useState(false);
  const [hasMountedTicketUploadModal, setHasMountedTicketUploadModal] = useState(false);
  const [isTicketUploadOpen, setIsTicketUploadOpen] = useState(false);

  const openUserListModal = (type: 'followers' | 'following', title: string) => {
    setHasMountedUserListModal(true);
    setUserListModal({ isOpen: true, type, title });
  };

  const openTicketUploadModal = () => {
    setHasMountedTicketUploadModal(true);
    setIsTicketUploadOpen(true);
  };

  if (!isLoggedIn) {
    return null;
  }

  const sidebarFallback = (
    <aside className="mypage-season-side" aria-label="마이페이지 사이드바 로딩" aria-busy="true">
      <div className="mypage-season-id">
        <span className="mypage-season-skeleton mypage-season-sidebar-avatar" />
        <div className="mypage-season-id-copy">
          <span className="mypage-season-skeleton mypage-season-sidebar-title" />
          <span className="mypage-season-skeleton mypage-season-sidebar-subtitle" />
        </div>
      </div>
      <div className="mypage-season-nav">
        <span className="mypage-season-skeleton mypage-season-sidebar-nav-item" />
        <span className="mypage-season-skeleton mypage-season-sidebar-nav-item" />
        <span className="mypage-season-skeleton mypage-season-sidebar-nav-item" />
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground transition-colors duration-200">
      <div className="mypage-season-root">
        <div className="mx-auto w-full min-w-0 max-w-[1240px] px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
          <div className="mypage-season-app" data-testid="mypage-prototype-shell">
            <Suspense fallback={sidebarFallback}>
              <MyPageSidebarRuntime
                isProfileLoading={isProfileLoading}
                currentUserId={user?.id ?? profile?.id ?? null}
                profileImage={profileImage}
                name={name}
                handle={handle}
                savedFavoriteTeam={savedFavoriteTeam}
                cheerPoints={cheerPoints}
                viewMode={viewMode}
                onOpenFollowers={() => openUserListModal('followers', '팔로워')}
                onOpenFollowing={() => openUserListModal('following', '팔로잉')}
                onSetViewMode={setViewMode}
              />
            </Suspense>

            <main className="mypage-season-main">
              <div className="mypage-season-view-scope">
                <Suspense fallback={null}>
                  <MyPageViewRuntime
                    viewMode={viewMode}
                    profileImage={profileImage}
                    name={name}
                    email={email}
                    savedFavoriteTeam={savedFavoriteTeam}
                    cheerPoints={cheerPoints}
                    userRole={user?.role}
                    userProvider={effectiveUserProvider}
                    initialBio={effectiveBio}
                    hasPassword={effectiveHasPassword}
                    selectedDiaryDate={selectedDiaryDate}
                    onSetViewMode={setViewMode}
                    onProfileUpdated={handleProfileUpdated}
                    onOpenTicketUploadModal={openTicketUploadModal}
                  />
                </Suspense>
              </div>
            </main>
          </div>
        </div>
      </div>

      {user && hasMountedUserListModal && (
        <Suspense
          fallback={userListModal.isOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-semibold text-white">
              목록을 불러오는 중...
            </div>
          ) : null}
        >
          <UserListModal
            isOpen={userListModal.isOpen}
            onClose={() => setUserListModal((prev) => ({ ...prev, isOpen: false }))}
            userHandle={user.handle || ''}
            type={userListModal.type}
            title={userListModal.title}
            useCurrentUser
          />
        </Suspense>
      )}
      {hasMountedTicketUploadModal && (
        <Suspense
          fallback={isTicketUploadOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-semibold text-white">
              티켓 등록 모달을 불러오는 중...
            </div>
          ) : null}
        >
          <TicketUploadModal
            open={isTicketUploadOpen}
            onOpenChange={setIsTicketUploadOpen}
            onConfirm={handleTicketConfirm}
            trigger={null}
          />
        </Suspense>
      )}
    </div>
  );
}
