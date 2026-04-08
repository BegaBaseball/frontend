import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { useMyPage } from '../hooks/useMyPage';
import { lazy, Suspense, useState } from 'react';
import { useDiaryStore } from '../store/diaryStore';
import { TicketInfo } from '../api/ticket';

const MyPageProfileCardRuntime = lazy(() => import('./mypage/MyPageProfileCardRuntime'));
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
    handleProfileUpdated,
    handleToggleStats,
    isLoading: isProfileLoading,
  } = useMyPage();

  const setPendingDraft = useDiaryStore((state) => state.setPendingDraft);

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

    setViewMode('diary');
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

  const profileCardFallback = (
    <Card className="p-2.5 md:p-4 mb-5 gap-2 dark:bg-card dark:border-border">
      <div className="space-y-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full flex-shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 rounded-md col-span-2" />
          <Skeleton className="h-10 rounded-md col-span-2" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        <Suspense fallback={profileCardFallback}>
          <MyPageProfileCardRuntime
            isProfileLoading={isProfileLoading}
            currentUserId={user?.id ?? null}
            profileImage={profileImage}
            name={name}
            handle={handle}
            email={email}
            savedFavoriteTeam={savedFavoriteTeam}
            cheerPoints={user?.cheerPoints ?? 0}
            isStatsView={viewMode === 'stats'}
            onOpenFollowers={() => openUserListModal('followers', '팔로워')}
            onOpenFollowing={() => openUserListModal('following', '팔로잉')}
            onOpenMateHistory={() => setViewMode('mateHistory')}
            onToggleStats={handleToggleStats}
            onOpenTicketUploadModal={openTicketUploadModal}
            onOpenEditProfile={() => setViewMode('editProfile')}
          />
        </Suspense>

        <Suspense fallback={null}>
          <MyPageViewRuntime
            viewMode={viewMode}
            profileImage={profileImage}
            name={name}
            email={email}
            savedFavoriteTeam={savedFavoriteTeam}
            userRole={user?.role}
            userProvider={user?.provider}
            initialBio={user?.bio}
            hasPassword={user?.hasPassword}
            onSetViewMode={setViewMode}
            onProfileUpdated={handleProfileUpdated}
          />
        </Suspense>
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
