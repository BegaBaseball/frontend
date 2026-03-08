import { Edit, BarChart3, Ticket, UserPlus, Users, Coins } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Skeleton } from './ui/skeleton';
import LoadingSpinner from './LoadingSpinner';
import TeamLogo from './TeamLogo';
import ProfileEditSection from './mypage/ProfileEditSection';
import PasswordChangeSection from './mypage/PasswordChangeSection';
import DiaryViewSection from './mypage/Diaryform';
import MateHistorySection from './mypage/MateHistorySection';
import { useMyPage } from '../hooks/useMyPage';

import { useMediaQuery } from '../hooks/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { getFollowCounts } from '../api/followApi';
import { lazy, Suspense, useState } from 'react';
import UserListModal from './profile/UserListModal';
import { TicketUploadModal } from './ticket/TicketUploadModal';
import { useDiaryStore } from '../store/diaryStore';
import { TicketInfo } from '../api/ticket';
import { ProfileAvatar } from './ui/ProfileAvatar';

const DiaryStatistics = lazy(() => import('./mypage/Diarystatistics'));

export default function MyPage() {
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

  const followTargetUserId = profile?.id || user?.id || 0;
  const canLoadFollowCounts = followTargetUserId > 0;

  const setDate = useDiaryStore((state) => state.setDate);
  const setNewEntry = useDiaryStore((state) => state.setNewEntry);
  const setIsCreateMode = useDiaryStore((state) => state.setIsCreateMode);
  const setIsDialogOpen = useDiaryStore((state) => state.setIsDialogOpen);

  const handleTicketConfirm = (data: TicketInfo) => {
    // 다이어리 상태 설정
    if (data.date) {
      setDate(new Date(data.date));
    }

    setNewEntry({
      date: data.date || new Date().toISOString().split('T')[0],
      gameId: data.gameId ? Number(data.gameId) : undefined,
      stadium: data.stadium || '',
      team: data.homeTeam ? `${data.awayTeam} vs ${data.homeTeam}` : '',
      section: data.section || '',
      row: data.row || '',
      seat: data.seat || '',
    });

    // 다이어리 작성 모드 활성화
    setIsCreateMode(true);
    setIsDialogOpen(true);

    // 뷰 모드 변경
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

  // 팔로워/팔로잉 카운트 조회
  const { data: followCounts } = useQuery({
    queryKey: ['followCounts', followTargetUserId],
    queryFn: () => getFollowCounts(followTargetUserId),
    enabled: canLoadFollowCounts,
  });

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return count.toString();
  };

  const isDesktop = useMediaQuery('(min-width: 966px)');

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-[calc(7rem+env(safe-area-inset-bottom))]">
        {/* 상단 프로필 카드 */}
          <Card className="p-2.5 md:p-4 mb-5 gap-2 dark:bg-card dark:border-border">
            {isProfileLoading ? (
                <div className={`${isDesktop ? 'flex items-start justify-between' : 'space-y-4'}`}>
                {/* 프로필 정보 스켈레톤 */}
                <div className="flex items-center gap-3 md:gap-4">
                  <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full flex-shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-7 w-36" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                {/* 팔로워/팔로잉 스켈레톤 */}
                <div className={`flex items-center gap-4 ${isDesktop ? 'mr-auto ml-12' : 'mt-3'}`}>
                  <div className="text-center space-y-1">
                    <Skeleton className="h-6 w-10 mx-auto" />
                    <Skeleton className="h-4 w-14 mx-auto" />
                  </div>
                  <div className="h-8 w-px bg-gray-200 dark:bg-border" />
                  <div className="text-center space-y-1">
                    <Skeleton className="h-6 w-10 mx-auto" />
                    <Skeleton className="h-4 w-14 mx-auto" />
                  </div>
                </div>
                {/* 버튼 스켈레톤 */}
                <div className={`${isDesktop ? 'flex items-center gap-2' : 'grid grid-cols-2 gap-2'}`}>
                  <Skeleton className="h-10 w-28 rounded-md" />
                  <Skeleton className="h-10 w-28 rounded-md" />
                  <Skeleton className="h-10 w-28 rounded-md" />
                  <Skeleton className="h-10 w-28 rounded-md" />
                </div>
              </div>
            ) : (
              isDesktop ? (
                <div className="grid gap-3">
                  <div className="grid w-full grid-cols-[minmax(0,_1fr)_auto] items-start gap-4">
                    <div className="flex items-end gap-3 min-w-0">
                      <div className="relative flex-shrink-0">
                        <ProfileAvatar
                          src={profileImage}
                          alt={name}
                          fallbackName={name}
                          className="w-20 h-20 md:w-24 md:h-24"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 md:gap-3 mb-1">
                          <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-primary-light">
                            {name}
                          </h2>
                          <div className="flex items-center gap-2">
                            {savedFavoriteTeam !== '없음' && (
                              <div className="w-5 h-5 md:w-6 md:h-6" data-testid="mypage-favorite-team-logo">
                                <TeamLogo team={savedFavoriteTeam} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-0.5">
                          {handle ? (handle.startsWith('@') ? handle : `@${handle}`) : ''}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 mb-1">{email}</p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                            <Coins className="w-3.5 h-3.5 fill-yellow-500 text-yellow-600 dark:text-yellow-400" />
                            {user?.cheerPoints?.toLocaleString() || 0} P
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-nowrap items-center justify-start gap-2.5 row-start-2">
                      <button
                        className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
                        onClick={() => setUserListModal({ isOpen: true, type: 'followers', title: '팔로워' })}
                      >
                        <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                          {formatCount(followCounts?.followerCount || 0)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                          <Users className="w-3.5 h-3.5" />
                          팔로워
                        </span>
                      </button>
                      <div className="h-8 w-px bg-gray-200 dark:bg-border mx-1.5"></div>
                      <button
                        className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
                        onClick={() => setUserListModal({ isOpen: true, type: 'following', title: '팔로잉' })}
                      >
                        <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                          {formatCount(followCounts?.followingCount || 0)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                          <UserPlus className="w-3.5 h-3.5" />
                          팔로잉
                        </span>
                      </button>
                    </div>
                    <div className="col-start-2 row-start-2 flex flex-nowrap items-center justify-end justify-self-end gap-1.5">
                      <Button
                        onClick={() => setViewMode('mateHistory')}
                        className="h-9 px-2.5 gap-1 text-xs flex items-center justify-center whitespace-nowrap bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary"
                      >
                        <Users className="w-4 h-4 flex-shrink-0" />
                        <span>메이트 내역</span>
                      </Button>
                      <Button
                        onClick={handleToggleStats}
                        className="h-9 px-2.5 gap-1 text-xs flex items-center justify-center whitespace-nowrap bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary w-32"
                      >
                        <BarChart3 className="w-4 h-4 flex-shrink-0" />
                        <span>
                          {viewMode === 'stats' ? '다이어리 보기' : '통계 보기'}
                        </span>
                      </Button>
                      <TicketUploadModal
                        onConfirm={handleTicketConfirm}
                        trigger={
                          <Button
                            className="h-9 px-2.5 gap-1 text-xs flex items-center justify-center whitespace-nowrap bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary"
                          >
                            <Ticket className="w-4 h-4 flex-shrink-0" />
                            <span>티켓 등록</span>
                          </Button>
                        }
                      />
                      <Button
                        onClick={() => setViewMode('editProfile')}
                        className="h-9 px-2.5 gap-1 text-xs flex items-center justify-center whitespace-nowrap text-white bg-primary-dark hover:bg-primary"
                      >
                        <Edit className="w-4 h-4 flex-shrink-0" />
                        <span>내 정보 수정</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className={`flex items-start gap-4 flex-wrap`}>
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="relative flex-shrink-0">
                        <ProfileAvatar
                          src={profileImage}
                          alt={name}
                          fallbackName={name}
                          className="w-20 h-20 md:w-24 md:h-24"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 md:gap-3 mb-1">
                          <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-primary-light">
                            {name}
                          </h2>
                          <div className="flex items-center gap-2">
                            {savedFavoriteTeam !== '없음' && (
                              <div className="w-5 h-5 md:w-6 md:h-6" data-testid="mypage-favorite-team-logo">
                                <TeamLogo team={savedFavoriteTeam} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-0.5">
                          {handle ? (handle.startsWith('@') ? handle : `@${handle}`) : ''}
                        </p>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 mb-1">{email}</p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                            <Coins className="w-3.5 h-3.5 fill-yellow-500 text-yellow-600 dark:text-yellow-400" />
                            {user?.cheerPoints?.toLocaleString() || 0} P
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-3 mt-3 justify-start`}>
                    <button
                      className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
                      onClick={() => setUserListModal({ isOpen: true, type: 'followers', title: '팔로워' })}
                    >
                      <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                        {formatCount(followCounts?.followerCount || 0)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                        <Users className="w-3.5 h-3.5" />
                        팔로워
                      </span>
                    </button>
                    <div className="h-8 w-px bg-gray-200 dark:bg-border"></div>
                    <button
                      className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
                      onClick={() => setUserListModal({ isOpen: true, type: 'following', title: '팔로잉' })}
                    >
                      <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                        {formatCount(followCounts?.followingCount || 0)}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                        <UserPlus className="w-3.5 h-3.5" />
                        팔로잉
                      </span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => setViewMode('mateHistory')}
                      className="flex items-center justify-center gap-1.5 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 px-3 whitespace-nowrap text-xs"
                    >
                      <Users className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm md:text-base">메이트 내역</span>
                    </Button>
                    <Button
                      onClick={handleToggleStats}
                      className="flex items-center justify-center gap-1.5 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 px-3 whitespace-nowrap text-xs"
                      >
                      <BarChart3 className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm md:text-base">
                        {viewMode === 'stats' ? '다이어리 보기' : '통계 보기'}
                      </span>
                    </Button>
                    <Button
                      onClick={() => setViewMode('editProfile')}
                      className="flex items-center justify-center gap-1.5 text-white bg-primary-dark hover:bg-primary h-10 px-3 whitespace-nowrap col-span-2 text-xs"
                    >
                      <Edit className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm md:text-base">내 정보 수정</span>
                    </Button>
                    <TicketUploadModal
                      onConfirm={handleTicketConfirm}
                      trigger={
                        <Button
                          className="flex items-center justify-center gap-1.5 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 px-3 whitespace-nowrap col-span-2 text-xs"
                        >
                          <Ticket className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm md:text-base">티켓 등록</span>
                        </Button>
                      }
                    />
                  </div>
                </div>
              )
            )}
        </Card>

        {/* 컨텐츠 영역 */}
        {
          (viewMode === 'editProfile' || viewMode === 'accountSettings' || viewMode === 'blockedUsers') && (
            <ProfileEditSection
              profileImage={profileImage}
              name={name}
              email={email}
              savedFavoriteTeam={savedFavoriteTeam}
              userRole={user?.role}
              userProvider={user?.provider}
              initialBio={user?.bio}
              hasPassword={user?.hasPassword}
              activeSection={
                viewMode === 'accountSettings'
                  ? 'accountSettings'
                  : viewMode === 'blockedUsers'
                    ? 'blockedUsers'
                    : 'profile'
              }
              onSectionChange={(section) => {
                if (section === 'profile') {
                  setViewMode('editProfile');
                } else {
                  setViewMode(section);
                }
              }}
              onCancel={() => setViewMode('diary')}
              onSave={handleProfileUpdated}
              onChangePassword={() => setViewMode('changePassword')}
            />
          )
        }

        {
          viewMode === 'changePassword' && (
            <PasswordChangeSection
              onCancel={() => setViewMode('editProfile')}
              onSuccess={() => setViewMode('diary')}
              hasPassword={user?.hasPassword}
            />
          )
        }

        {viewMode === 'diary' && <DiaryViewSection />}

        {viewMode === 'stats' && (
          <Suspense fallback={<LoadingSpinner size="lg" text="통계를 불러오는 중..." fullScreen={false} />}>
            <DiaryStatistics />
          </Suspense>
        )}

        {viewMode === 'mateHistory' && <MateHistorySection />}

        
      </div >

      {/* User List Modal */}
      {
        user && (
          <UserListModal
            isOpen={userListModal.isOpen}
            onClose={() => setUserListModal(prev => ({ ...prev, isOpen: false }))}
            userId={Number(user.id)}
            type={userListModal.type}
            title={userListModal.title}
          />
        )
      }
    </div >
  );
}
