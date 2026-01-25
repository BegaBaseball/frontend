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
import { useMyPage } from '../hooks/useMyPage';
import { useMediaQuery } from '../hooks/useMediaQuery';

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

  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ marginBottom: '100px' }}>
        {/* 상단 프로필 카드 */}
        <Card className="p-4 md:p-8 mb-8 dark:bg-gray-800 dark:border-gray-700">
          <div className={`${isDesktop ? 'flex items-start justify-between' : 'space-y-6'}`}>
            {/* 프로필 정보 */}
            <div className="flex items-center gap-4 md:gap-6">
              <div className="relative flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
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
              onCancel={() => setViewMode('diary')}
              onSave={handleProfileUpdated}
              onChangePassword={() => setViewMode('changePassword')}
              onAccountSettings={() => setViewMode('accountSettings')}
            />
          )
        }

        {
          viewMode === 'changePassword' && (
            <PasswordChangeSection
              onCancel={() => setViewMode('editProfile')}
              onSuccess={() => setViewMode('diary')}
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
      </div >

      <ChatBot />
    </div >
  );
}