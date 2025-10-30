import React, { useState, useEffect, useCallback } from 'react';
import { Camera, Save, User } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import ChatBot from './ChatBot';
import TeamRecommendationTest from './TeamRecommendationTest';
import TeamLogo from './TeamLogo';
import Navbar from './Navbar';
import { useNavigationStore } from '../store/navigationStore';


const API_URL = 'http://localhost:8080/api/auth/mypage';

const showCustomAlert = (message: string) => {
// 실제 환경에서는 모달 컴포넌트를 띄워야 합니다.
console.log('ALERT:', message);

const alertBox = document.getElementById('custom-alert-box');
  if (alertBox) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden', 'opacity-0');
    alertBox.classList.add('opacity-100');
    setTimeout(() => {
      alertBox.classList.remove('opacity-100');
      alertBox.classList.add('opacity-0');
      setTimeout(() => {
       alertBox.classList.add('hidden');
      }, 500); // Transition duration
    }, 3000);
  }
};

const TEAM_DATA: { [key: string]: { name: string, color: string } } = {
  // DB 약어(Key) : { 표시명(name), 색상(color) }
  '없음': { name: '없음', color: '#9ca3af' },
  'LG': { name: 'LG 트윈스', color: '#C30452' },
  'OB': { name: '두산 베어스', color: '#131230' },
  'SK': { name: 'SSG 랜더스', color: '#CE0E2D' },
  'KT': { name: 'KT 위즈', color: '#000000' },
  'WO': { name: '키움 히어로즈', color: '#570514' }, // 키움 히어로즈 약어 확인 필요
  'NC': { name: 'NC 다이노스', color: '#315288' },
  'SS': { name: '삼성 라이온즈', color: '#074CA1' },
  'LT': { name: '롯데 자이언츠', color: '#041E42' },
  'HT': { name: '기아 타이거즈', color: '#EA0029' },
  'HH': { name: '한화 이글스', color: '#FF6600' },
};

// 가입일 형식 변환 유틸리티 함수
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '정보 없음';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
    return '유효하지 않은 날짜';
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  } catch (e) {
    console.error("날짜 형식 변환 오류:", e);
    return '날짜 오류';
  }
};

export default function MyPage() {
  const navigateToLogin = useNavigationStore((state) => state.navigateToLogin);
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  // name 상태가 닉네임 역할을 수행하도록 통일했습니다.
  const [profileImage, setProfileImage] = useState('https://placehold.co/100x100/374151/ffffff?text=User');
  const [name, setName] = useState('로딩 중...');
  const [email, setEmail] = useState('loading@...');
  const [savedFavoriteTeam, setSavedFavoriteTeam] = useState('없음');
  const [editingFavoriteTeam, setEditingFavoriteTeam] = useState('없음');
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTeamTest, setShowTeamTest] = useState(false);

  // 1. 서버에서 프로필 정보 가져오기 (GET)
const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

      try {
      const MAX_RETRIES = 3;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) { 
        try {
          // API_URL은 /api/auth/mypage 형태를 가정하며 GET 요청입니다.
          const response = await fetch(API_URL, { 
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include', 
          });

          if (response.ok) {
            const apiResponse = await response.json(); 

            if (apiResponse.data) {
                const profileDto = apiResponse.data;
                const initialTeamId = profileDto.favoriteTeam || '없음';

                // DTO 필드를 사용하여 상태 업데이트
                setName(profileDto.name || '알 수 없음'); 
                setEmail(profileDto.email || '알 수 없음');
                setSavedFavoriteTeam(initialTeamId); 
                setEditingFavoriteTeam(initialTeamId);
                setCreatedAt(profileDto.createdAt || null);
                setProfileImage(profileDto.profileImageUrl || 'https://placehold.co/100x100/374151/ffffff?text=User');
                setLoading(false);
                return; // 성공적으로 데이터 로드
              } else {
                // apiResponse.data가 없는 경우 (데이터 로드 실패)
                showCustomAlert(apiResponse.message || '프로필 데이터를 찾을 수 없습니다.');
                throw new Error('API Data Missing Error');
            }
          }

          if (response.status === 401) {
            // 서버로부터 401 응답을 받으면 토큰을 지우고 로그인 페이지로 이동
            showCustomAlert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
            navigateToLogin();
            return;
          }

          if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          } else {
            // API 서버가 작동하지 않을 경우를 대비하여 더미데이터를 설정합니다.
            if (response.status === 404 || response.status === 500) {
              setName('홍길동');
              setEmail('hong.gildong@kbo.com');
              setSavedFavoriteTeam('LG'); // Mock 데이터
              setEditingFavoriteTeam('LG'); // Mock 데이터
              setCreatedAt('2023-08-15T10:00:00Z');
              setProfileImage('https://placehold.co/100x100/374151/ffffff?text=LG+Fan');
              showCustomAlert(`[Mock Data] 서버 응답 오류(${response.status}). 기본 데이터로 표시합니다.`);
            return;
            }
            throw new Error(`Failed to fetch profile after ${MAX_RETRIES} attempts: ${response.statusText}`);
          }

        } catch (innerError) {
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
          } else {
            throw innerError;
          }
        }
      }

    } catch (err) {
      console.error('프로필 로딩 오류:', err);
      setError('프로필 정보를 불러오는 데 실패했습니다. 서버 상태를 확인하세요.');
      // 데이터 로딩 실패 시 Mock 데이터로 대체
      setName('사용자');
      setEmail('user@example.com');
      setSavedFavoriteTeam('LG'); // Mock 데이터
      setEditingFavoriteTeam('LG'); // Mock 데이터
      setCreatedAt('2023-01-01T00:00:00Z');
      setProfileImage('https://placehold.co/100x100/374151/ffffff?text=User');
      showCustomAlert('프로필 로딩 중 통신 오류 발생. Mock 데이터로 대체합니다.');
    } finally {
      setLoading(false);
    }
  }, [navigateToLogin]);

  useEffect(() => {
    fetchUserProfile();
    // 컴포넌트 언마운트 시 로컬 URL 객체 해제
    return () => {
      if (profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }
    };
  }, [fetchUserProfile]);


  // 2. 프로필 이미지 로컬 업로드 미리보기
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // 이전 blob URL 해제
      if (profileImage.startsWith('blob:')) {
        URL.revokeObjectURL(profileImage);
      }

      const imageUrl = URL.createObjectURL(file);
      setProfileImage(imageUrl);
      // 실제 환경에서는 이미지 파일을 서버에 업로드하고 URL을 받아와야 합니다.
      showCustomAlert('이미지 미리보기 적용됨. 저장을 눌러 서버에 반영하세요.');
    }
  };

  // 3. 프로필 정보 저장 (PUT)
const handleSave = async () => {
  setLoading(true);
  setError(null);

  // 닉네임이 비어있는지 확인
  if (!name.trim()) {
    showCustomAlert('이름(닉네임)은 필수로 입력해야 합니다.');
    setLoading(false);
    return;
  }
   
// 요청 본문(Body)의 키를 'name'으로 사용하고 favoriteTeam을 포함
const updatedProfile = {
  name: name.trim(), 
  profileImageUrl: profileImage,
  favoriteTeam: editingFavoriteTeam === '없음' ? null : editingFavoriteTeam,
  email: email // 기존 이메일 값을 그대로 포함
  };

  try {
    const response = await fetch(API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', 
      body: JSON.stringify(updatedProfile),
    });

  if (!response.ok) {
    if (response.status === 401) {
      showCustomAlert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
      navigateToLogin();
      return;
    }
    throw new Error(`Failed to save profile: ${response.statusText}`);
  }
 	 
 	 // 🚨 수정된 부분: PUT 응답도 ApiResponse 구조를 따름
 	 const apiResponse = await response.json();
    if (apiResponse.isSuccess) {
      // ⭐ 1. 핵심: 새로운 JWT 토큰 처리 ⭐
          const newToken = apiResponse.data.token;
          if (newToken) {
            // 백엔드에서 받은 새 토큰을 localStorage의 기존 토큰과 교체
            localStorage.setItem('authToken', newToken); 
            console.log('새로운 JWT 토큰으로 교체 완료. 권한이 즉시 적용됩니다.');
          }
            
          // ⭐ 2. 상태 업데이트: 업데이트된 프로필 정보로 UI 상태를 갱신
          const updatedProfileData = apiResponse.data;
          setName(updatedProfileData.name);
          setSavedFavoriteTeam(editingFavoriteTeam);
          setProfileImage(updatedProfileData.profileImageUrl || 'https://placehold.co/100x100/374151/ffffff?text=User');


          // 3. 성공 알림
          showCustomAlert(apiResponse.message || '프로필이 성공적으로 저장되었습니다!');
          return; 
        } else {
          // isSuccess가 false인 경우 또는 data 구조가 예상과 다른 경우
          throw new Error(apiResponse.message || '프로필 저장에 실패했습니다.');
        }
      } catch (err) {
        // err가 Error 객체이고, 메시지에 '프로필 수정 성공'이 포함되어 있다면 성공으로 간주
        const isSuccessMessageError = err instanceof Error && err.message.includes('프로필 수정 성공');

        if (isSuccessMessageError) {
          // DB에 저장된 상태이므로, 성공으로 간주하고 오류 메시지를 띄우지 않습니다.
          // console.log('프로필 저장 성공 (에러 처리 필터링됨)'); 
          setSavedFavoriteTeam(editingFavoriteTeam);
          return; 
        }
        
        // 실제 오류(통신 오류, HTTP 4xx/5xx 등)만 처리
        console.error('프로필 저장 오류:', err); 
        setError('프로필 저장 중 오류가 발생했습니다. 다시 시도해 주세요.'); 

    } finally {
        setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <Navbar 
        currentPage="mypage" 
      />

      {/* Page Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <h1 style={{ color: '#2d5f4f' }}>마이페이지</h1>
          <p className="text-gray-600 mt-2">회원 정보를 수정하고 응원구단을 설정하세요</p>
        </div>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
          {/* Profile Image */}
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
            <div className="relative">
              <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md"
                style={{ borderColor: '#2d5f4f' }}
              >
                <Camera className="w-5 h-5" style={{ color: '#2d5f4f' }} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
            <div>
              <h2 style={{ color: '#2d5f4f' }}>{name}</h2>
              <p className="text-gray-600 mt-1">{email}</p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700">
                이름 *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
                placeholder="이름을 입력하세요"
              />
            </div>

            {/* Nickname */}
            {/* <div className="space-y-2">
              <Label htmlFor="nickname" className="text-gray-700">
                닉네임 *
              </Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full"
                placeholder="닉네임을 입력하세요"
              />
            </div> */}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">
                이메일 *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="이메일을 입력하세요"
              />
            </div>

            {/* Favorite Team */}
            <div className="space-y-2">
              <Label htmlFor="team" className="text-gray-700">
                응원구단 *
              </Label>
              <Select value={editingFavoriteTeam} onValueChange={setEditingFavoriteTeam}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="응원하는 팀을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(TEAM_DATA).map(teamId => (
                    <SelectItem key={teamId} value={teamId}>
                      <div className="flex items-center gap-2">
                        {teamId !== '없음' && (
                          <div className="w-6 h-6">
                            <TeamLogo team={teamId} size="sm" />
                          </div>
                        )}
                        {teamId === '없음' && (
                          <div 
                            className="w-6 h-6 rounded-full" 
                            style={{ backgroundColor: TEAM_DATA[teamId]? TEAM_DATA[teamId].color  : TEAM_DATA['없음'].color }}
                          />
                        )}
                        {TEAM_DATA[teamId].name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-500">
                  응원구단은 응원게시판에서 사용됩니다
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setShowTeamTest(true)}
                  className="text-sm flex items-center h-auto py-1 px-2 hover:bg-green-50"
                  style={{ color: '#2d5f4f' }}
                >
                  구단 테스트 해보기
                </Button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <Button
              onClick={handleSave}
              className="w-full text-white py-6 rounded-full flex items-center justify-center gap-2"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              <Save className="w-5 h-5" />
              저장하기
            </Button>
          </div>
        </div>

        {/* Additional Info Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border-2"
          style={{ borderColor: '#2d5f4f' }}
        >
          <h3 className="mb-4" style={{ color: '#2d5f4f' }}>회원 정보</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <span>가입일</span>
              <span className="text-gray-900">{formatDate(createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>응원구단</span>
              <div className="flex items-center gap-2">
                {savedFavoriteTeam !== '없음' && (
                  <div className="w-6 h-6">
                    <TeamLogo team={savedFavoriteTeam} size="sm" />
                  </div>
                )}
                {savedFavoriteTeam === '없음' && (
                  <div 
                    className="w-6 h-6 rounded-full" 
                    style={{ backgroundColor: TEAM_DATA[savedFavoriteTeam].color }}
                  />
                )}
                <span className="text-gray-900">{TEAM_DATA[savedFavoriteTeam].name}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>작성한 게시글</span>
              <span className="text-gray-900">12개</span>
            </div>
            <div className="flex items-center justify-between">
              <span>다이어리</span>
              <span className="text-gray-900">8개</span>
            </div>
          </div>
        </div>
      </div>

      {/* ChatBot */}
      <ChatBot />

      {/* Team Recommendation Test */}
      <TeamRecommendationTest
        isOpen={showTeamTest}
        onClose={() => setShowTeamTest(false)}
        onSelectTeam={(team) => {
          setSavedFavoriteTeam(team);
          setShowTeamTest(false);
        }}
      />
    </div>
  );
}
