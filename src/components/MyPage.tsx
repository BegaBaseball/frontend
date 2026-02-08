import { Edit, BarChart3, Users, User, Coins } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import ChatBot from './ChatBot';
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
import { useState, useEffect } from 'react';
import UserListModal from './profile/UserListModal';
import { UserPlus } from 'lucide-react';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';

export default function MyPage() {
  const {
    isLoggedIn,
    user,
    profileImage,
    name,
    handle,
    email,
    savedFavoriteTeam,
    isLoading,
    viewMode,
    setViewMode,
    handleProfileUpdated,

    handleToggleStats,
  } = useMyPage();

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

  // 이미지 에러 핸들링
  const [imgSrc, setImgSrc] = useState<string | null>(profileImage);

  // 프로필 이미지가 변경되면 상태 업데이트
  useEffect(() => {
    setImgSrc(profileImage);
  }, [profileImage]);

  const handleImageError = () => {
    // 1. 현재 이미지가 기본 이미지가 아니라면 -> 기본 이미지로 변경
    if (imgSrc !== DEFAULT_PROFILE_IMAGE) {
      setImgSrc(DEFAULT_PROFILE_IMAGE);
    }
    // 2. 이미 기본 이미지인데도 에러가 났다면 (혹은 기본 이미지 로드 실패) -> 아예 아이콘으로
    else {
      setImgSrc(null);
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
        {/* 상단 프로필 카드 */}
        <Card className="p-4 md:p-8 mb-8 dark:bg-gray-800 dark:border-gray-700">
          <div className={`${isDesktop ? 'flex items-start justify-between' : 'space-y-6'}`}>
            {/* 프로필 정보 */}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-10 h-10 md:w-12 md:h-12 text-gray-400 dark:text-gray-600" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <h2 className="text-xl md:text-2xl font-bold" style={{ color: '#2d5f4f' }}>
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
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-1">{handle ? (handle.startsWith('@') ? handle : `@${handle}`) : ''}</p>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mb-2">{email}</p>
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
                <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-[#2d5f4f] transition-colors">
                  {formatCount(followCounts?.followerCount || 0)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 group-hover:text-[#2d5f4f] transition-colors">
                  <Users className="w-3.5 h-3.5" />
                  팔로워
                </span>
              </button>
              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700"></div>
              <button
                className="text-center group cursor-pointer"
                onClick={() => setUserListModal({ isOpen: true, type: 'following', title: '팔로잉' })}
              >
                <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-[#2d5f4f] transition-colors">
                  {formatCount(followCounts?.followingCount || 0)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 group-hover:text-[#2d5f4f] transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  팔로잉
                </span>
              </button>
            </div>



            {/* 버튼들 */}
            <div className={`${isDesktop ? 'flex items-center gap-3' : 'grid grid-cols-2 gap-3'}`}>


              <Button
                onClick={() => setViewMode('mateHistory')}
                className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 hover:bg-gray-50 dark:hover:bg-gray-700 h-10 md:h-11 px-4 whitespace-nowrap"
                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">메이트 내역</span>
              </Button>
              <Button
                onClick={handleToggleStats}
                className="flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 hover:bg-gray-50 dark:hover:bg-gray-700 h-10 md:h-11 px-4 whitespace-nowrap"
                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">
                  {viewMode === 'stats' ? '다이어리 보기' : '통계 보기'}
                </span>
              </Button>

              <Button
                onClick={() => setViewMode('editProfile')}
                className={`flex items-center justify-center gap-2 text-white h-10 md:h-11 px-4 whitespace-nowrap ${!isDesktop ? 'col-span-2' : ''}`}
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <Edit className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm md:text-base">내 정보 수정</span>
              </Button>
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

      <ChatBot />

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