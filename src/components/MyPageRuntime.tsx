import { useMyPage } from '../hooks/useMyPage';
import { lazy, Suspense, useState } from 'react';
import { useDiaryStore } from '../store/diaryStore';
import { TicketInfo } from '../api/ticket';
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
  } = useMyPage();

  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);
  const effectiveUserProvider = profile?.provider ?? user?.provider;
  const effectiveHasPassword = profile?.hasPassword ?? user?.hasPassword;

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

  return (
    <div className="mypage-season-root">
      <div className="mypage-season-app">
        <Suspense fallback={<aside className="mypage-season-side text-sm text-[#FFFFFF]">프로필을 불러오는 중...</aside>}>
          <MyPageSidebarRuntime
            currentUserId={user?.id ?? null}
            profileImage={profileImage}
            name={name}
            handle={handle}
            savedFavoriteTeam={savedFavoriteTeam}
            cheerPoints={profile?.cheerPoints ?? user?.cheerPoints ?? 0}
            viewMode={viewMode}
            onOpenFollowers={() => openUserListModal('followers', '팔로워')}
            onOpenFollowing={() => openUserListModal('following', '팔로잉')}
            onSetViewMode={setViewMode}
          />
        </Suspense>

        <main className="mypage-season-main">
          <Suspense fallback={null}>
            <MyPageViewRuntime
              viewMode={viewMode}
              profileImage={profileImage}
              name={name}
              email={email}
              savedFavoriteTeam={savedFavoriteTeam}
              cheerPoints={profile?.cheerPoints ?? user?.cheerPoints ?? 0}
              userRole={user?.role}
              userProvider={effectiveUserProvider}
              initialBio={user?.bio}
              hasPassword={effectiveHasPassword}
              selectedDiaryDate={selectedDiaryDate}
              onSetViewMode={setViewMode}
              onProfileUpdated={handleProfileUpdated}
              onOpenTicketUploadModal={openTicketUploadModal}
            />
          </Suspense>
        </main>
      </div>

      {user && hasMountedUserListModal && (
                <Suspense
                  fallback={userListModal.isOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-bold text-white">
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
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-bold text-white">
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
