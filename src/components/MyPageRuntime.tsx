import { lazy, Suspense, useState } from 'react';

import { TicketInfo } from '../api/ticket';
import { useMyPage } from '../hooks/useMyPage';
import { useDiaryStore } from '../store/diaryStore';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import './mypage/MyPageSeason.css';

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
    selectedDiaryDate,
    handleProfileUpdated,
    handleToggleStats,
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

  const profileCardFallback = (
    <Card className="mb-5 gap-2 p-2.5 dark:bg-card dark:border-border md:p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-3 md:gap-4">
          <Skeleton className="h-20 w-20 flex-shrink-0 rounded-full md:h-24 md:w-24" />
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
          <Skeleton className="col-span-2 h-10 rounded-md" />
          <Skeleton className="col-span-2 h-10 rounded-md" />
        </div>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="mx-auto max-w-[1400px] px-4 py-8 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-8">
        <Suspense fallback={profileCardFallback}>
          <MyPageProfileCardRuntime
            isProfileLoading={isProfileLoading}
            currentUserId={user?.id ?? profile?.id ?? null}
            profileImage={profileImage}
            name={name}
            handle={handle}
            email={email}
            savedFavoriteTeam={savedFavoriteTeam}
            cheerPoints={cheerPoints}
            isStatsView={viewMode === 'stats'}
            onOpenFollowers={() => openUserListModal('followers', '팔로워')}
            onOpenFollowing={() => openUserListModal('following', '팔로잉')}
            onOpenMateHistory={() => setViewMode('mateHistory')}
            onToggleStats={handleToggleStats}
            onOpenTicketUploadModal={openTicketUploadModal}
            onOpenEditProfile={() => setViewMode('editProfile')}
          />
        </Suspense>

        <div className="mypage-season-root mypage-season-view-scope">
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
