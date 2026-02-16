import { Edit, BarChart3, Ticket, UserPlus, Users, Coins } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import TeamLogo from './TeamLogo';
import ProfileEditSection from './mypage/ProfileEditSection';
import PasswordChangeSection from './mypage/PasswordChangeSection';
import AccountSettingsSection from './mypage/AccountSettingsSection';
import DiaryViewSection from './mypage/Diaryform';
import DiaryStatistics from './mypage/Diarystatistics';
import MateHistorySection from './mypage/MateHistorySection';
import BlockedUsersSection from './mypage/BlockedUsersSection';
import { useMyPage } from '../hooks/useMyPage';

import { useMediaQuery } from '../hooks/useMediaQuery';
import { useQuery } from '@tanstack/react-query';
import { getFollowCounts } from '../api/followApi';
import { useState } from 'react';
import UserListModal from './profile/UserListModal';
import { TicketUploadModal } from './ticket/TicketUploadModal';
import { useDiaryStore } from '../store/diaryStore';
import { TicketInfo } from '../api/ticket';
import { ProfileAvatar } from './ui/ProfileAvatar';

export default function MyPage() {
  const {
    isLoggedIn,
    user,
    profileImage,
    name,
    handle,
    email,
    savedFavoriteTeam,
    viewMode,
    setViewMode,
    handleProfileUpdated,

    handleToggleStats,
  } = useMyPage();

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
    queryKey: ['followCounts', user?.id],
    queryFn: () => getFollowCounts(Number(user!.id)),
    enabled: !!user?.id,
  });

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    }
    return count.toString();
  };

  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
        {/* 상단 프로필 카드 */}
          <Card className="p-4 md:p-8 mb-8 dark:bg-card dark:border-border">
            <div className={`${isDesktop ? 'flex items-start justify-between' : 'space-y-6'}`}>
            {/* 프로필 정보 */}
              <div className="flex items-center gap-4 md:gap-6">
                <div className="relative flex-shrink-0">
                  <ProfileAvatar
                    src={profileImage}
                    alt="Profile"
                    className="w-20 h-20 md:w-24 md:h-24"
                  />
              </div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-primary-light">
                    {name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {savedFavoriteTeam !== '없음' && (
                      <div className="w-5 h-5 md:w-6 md:h-6">
                        <TeamLogo team={savedFavoriteTeam} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-300 mb-1">{handle ? (handle.startsWith('@') ? handle : `@${handle}`) : ''}</p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 mb-2">{email}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                    <Coins className="w-3.5 h-3.5 fill-yellow-500 text-yellow-600 dark:text-yellow-400" />
                    {user?.cheerPoints?.toLocaleString() || 0} P
                  </span>
                </div>
              </div>
            </div>

            {/* 팔로워/팔로잉 카운트 (데스크탑: 우측, 모바일: 아래) */}
            <div className={`flex items-center gap-6 ${isDesktop ? 'mr-auto ml-12' : 'mt-4 justify-start'}`}>
              <button
                className="text-center group cursor-pointer"
                onClick={() => setUserListModal({ isOpen: true, type: 'followers', title: '팔로워' })}
              >
                <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                  {formatCount(followCounts?.followerCount || 0)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1 group-hover:text-primary transition-colors">
                  <Users className="w-3.5 h-3.5" />
                  팔로워
                </span>
              </button>
              <div className="h-8 w-px bg-gray-200 dark:bg-border"></div>
              <button
                className="text-center group cursor-pointer"
                onClick={() => setUserListModal({ isOpen: true, type: 'following', title: '팔로잉' })}
              >
                <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                  {formatCount(followCounts?.followingCount || 0)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1 group-hover:text-primary transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  팔로잉
                </span>
              </button>
            </div>



            {/* 버튼들 */}
            <div className={`${isDesktop ? 'flex items-center gap-3' : 'grid grid-cols-2 gap-3'}`}>


              <Button
                onClick={() => setViewMode('mateHistory')}
                className="flex items-center justify-center gap-2 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 md:h-11 px-4 whitespace-nowrap"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">메이트 내역</span>
              </Button>
              <Button
                onClick={handleToggleStats}
                className="flex items-center justify-center gap-2 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 md:h-11 px-4 whitespace-nowrap"
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">
                  {viewMode === 'stats' ? '다이어리 보기' : '통계 보기'}
                </span>
              </Button>

              <Button
                onClick={() => setViewMode('editProfile')}
                className={`flex items-center justify-center gap-2 text-white bg-primary-dark hover:bg-primary h-10 md:h-11 px-4 whitespace-nowrap ${!isDesktop ? 'col-span-2' : ''}`}
              >
                <Edit className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">내 정보 수정</span>
              </Button>

              <TicketUploadModal
                onConfirm={handleTicketConfirm}
                onTicketAnalyzed={(data) => console.log('Analyzed Ticket:', data)}
                trigger={
                  <Button
                    className={`flex items-center justify-center gap-2 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 md:h-11 px-4 whitespace-nowrap ${!isDesktop ? 'col-span-2' : ''}`}
                  >
                    <Ticket className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm md:text-base">티켓 등록</span>
                  </Button>
                }
              />
            </div>
          </div>
        </Card>

        {/* 컨텐츠 영역 */}
        {
          viewMode === 'editProfile' && (
            <ProfileEditSection
              profileImage={profileImage}
              name={name}
              email={email}
              savedFavoriteTeam={savedFavoriteTeam}
              userRole={user?.role}
              userProvider={user?.provider}
              initialBio={user?.bio}
              hasPassword={user?.hasPassword}
              onCancel={() => setViewMode('diary')}
              onSave={handleProfileUpdated}
              onChangePassword={() => setViewMode('changePassword')}
              onAccountSettings={() => setViewMode('accountSettings')}
              onBlockedUsers={() => setViewMode('blockedUsers')}
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

        {viewMode === 'stats' && <DiaryStatistics />}

        {viewMode === 'mateHistory' && <MateHistorySection />}

        {
          viewMode === 'accountSettings' && (
            <AccountSettingsSection
              userProvider={user?.provider}
              onCancel={() => setViewMode('editProfile')}
            />
          )
        }

        {
          viewMode === 'blockedUsers' && (
            <div className="max-w-3xl mx-auto">
              <BlockedUsersSection />
              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setViewMode('editProfile')}>
                  돌아가기
                </Button>
              </div>
            </div>
          )
        }
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
