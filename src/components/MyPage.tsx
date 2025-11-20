import React, { useState, useEffect } from 'react';
import { Edit, BarChart3, Users, User } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import ChatBot from './ChatBot';
import TeamLogo from './TeamLogo';
import { useAuthStore } from '../store/authStore';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import { useNavigationStore } from '../store/navigationStore';

// 분리된 컴포넌트들
import ProfileEditSection from './mypage/ProfileEditSection';
import DiaryViewSection from './mypage/Diaryform';
import DiaryStatistics from './mypage/Diarystatistics';
import MateHistorySection from './mypage/MateHistorySection';

const API_URL = import.meta.env.VITE_API_BASE_URL;

type ViewMode = 'diary' | 'stats' | 'editProfile' | 'mateHistory';

export default function MyPage() {
  const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  
  // MyPage는 오직 프로필 정보와 뷰 모드만 관리
  const [viewMode, setViewMode] = useState<ViewMode>('diary');
  const [profileImage, setProfileImage] = useState(DEFAULT_PROFILE_IMAGE);
  const [name, setName] = useState('로딩 중...');
  const [email, setEmail] = useState('loading@...');
  const [savedFavoriteTeam, setSavedFavoriteTeam] = useState('없음');
  const user = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);

  // 프로필 정보만 가져오기
  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/mypage`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const apiResponse = await response.json();
        if (apiResponse.data) {
          const profileDto = apiResponse.data;
          setName(profileDto.name || '알 수 없음');
          setEmail(profileDto.email || '알 수 없음');
          setSavedFavoriteTeam(profileDto.favoriteTeam || '없음');
          if (profileDto.profileImageUrl) {
            setProfileImage(profileDto.profileImageUrl);
          }
        }
      }
    } catch (err) {
      console.error('프로필 불러오기 오류:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigateToLogin();
      return;
    }
    fetchUserProfile();
  }, [isLoggedIn, navigateToLogin]);

  const handleProfileUpdated = () => {
    setViewMode('diary');
    fetchUserProfile(); // 프로필만 다시 불러오기
  };

  if (!isLoggedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 상단 프로필 카드 */}
        <Card className="p-8 mb-8">
          <div className="flex items-start justify-between">
            {/* 프로필 정보 */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gray-200 overflow-hidden">
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 style={{ color: '#2d5f4f' }}>{name}</h2>
                  <div className="flex items-center gap-2">
                    {savedFavoriteTeam !== '없음' && (
                      <div className="w-6 h-6">
                        <TeamLogo team={savedFavoriteTeam} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 mb-1">{name}</p>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
            </div>

            {/* 버튼들 */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setViewMode('mateHistory')}
                className="flex items-center gap-2 bg-white border-2 hover:bg-gray-50"
                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
              >
                <Users className="w-4 h-4" />
                메이트 내역
              </Button>
              <Button
                onClick={() => setViewMode('editProfile')}
                className="flex items-center gap-2 bg-white border-2 hover:bg-gray-50"
                style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
              >
                <Edit className="w-4 h-4" />
                내 정보 수정
              </Button>
              
              <Button
                onClick={() => setViewMode(viewMode === 'stats' ? 'diary' : 'stats')}
                className="flex items-center gap-2 text-white"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                <BarChart3 className="w-4 h-4" />
                {viewMode === 'stats' ? '다이어리 보기' : '통계 보기'}
              </Button>
            </div>
          </div>

          {/* 
            통계 카드는 DiaryStatistics 컴포넌트 안에서 표시 
            여기서는 제거!
          */}
        </Card>

        {/* 컨텐츠 영역 - 각 컴포넌트가 자기 데이터를 알아서 fetch */}
        {viewMode === 'editProfile' && (
          <ProfileEditSection
            profileImage={profileImage}
            name={name}
            email={email}
            savedFavoriteTeam={savedFavoriteTeam}
            userRole={user?.role}
            onCancel={() => setViewMode('diary')}
            onSave={(data) => {
              setViewMode('diary');
              fetchUserProfile();
            }}
          />
        )}

        {viewMode === 'diary' && (
          <DiaryViewSection />
        )}

        {viewMode === 'stats' && (
          <DiaryStatistics />
        )}

        {viewMode === 'mateHistory' && (
          <MateHistorySection />
        )}
      </div>
      
      <ChatBot />
    </div>
  );
}