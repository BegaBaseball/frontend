import React, { useState } from 'react';
import { Camera, Save, User } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import TeamLogo from '../TeamLogo';
import TeamRecommendationTest from '../TeamRecommendationTest';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const TEAM_DATA: { [key: string]: { name: string, color: string } } = {
  '없음': { name: '없음', color: '#9ca3af' },
  'LG': { name: 'LG 트윈스', color: '#C30452' },
  'OB': { name: '두산 베어스', color: '#131230' },
  'SK': { name: 'SSG 랜더스', color: '#CE0E2D' },
  'KT': { name: 'KT 위즈', color: '#000000' },
  'WO': { name: '키움 히어로즈', color: '#570514' },
  'NC': { name: 'NC 다이노스', color: '#315288' },
  'SS': { name: '삼성 라이온즈', color: '#074CA1' },
  'LT': { name: '롯데 자이언츠', color: '#041E42' },
  'HT': { name: '기아 타이거즈', color: '#EA0029' },
  'HH': { name: '한화 이글스', color: '#FF6600' },
};

interface ProfileEditSectionProps {
  profileImage: string;
  name: string;
  email: string;
  userRole?: string;
  savedFavoriteTeam: string;
  onCancel: () => void;
  onSave: (data: {
    name: string;
    email: string;
    favoriteTeam: string;
    profileImageFile: File | null;
  }) => void;
}

export default function ProfileEditSection({
  profileImage: initialProfileImage,
  name: initialName,
  email: initialEmail,
  savedFavoriteTeam: initialFavoriteTeam,
  userRole,
  onCancel,
  onSave
}: ProfileEditSectionProps) {
  const [profileImage, setProfileImage] = useState(initialProfileImage);
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [editingFavoriteTeam, setEditingFavoriteTeam] = useState(initialFavoriteTeam);
  const [newProfileImageFile, setNewProfileImageFile] = useState<File | null>(null);
  const [showTeamTest, setShowTeamTest] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSizeMB = 5;
    if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`파일 크기가 ${maxSizeMB}MB를 초과합니다.`);
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        alert('JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.');
        return;
    }

    try {
        if (profileImage.startsWith('blob:')) {
            URL.revokeObjectURL(profileImage);
        }
        const imageUrl = URL.createObjectURL(file);
        setProfileImage(imageUrl);
        
        setNewProfileImageFile(file);
        
        alert('이미지가 선택되었습니다. 저장 버튼을 눌러주세요.');
    } catch (error) {
        console.error('이미지 미리보기 오류:', error);
        alert('이미지 처리 중 오류가 발생했습니다.');
    }
  };

  const handleSaveClick = async () => {
    setLoading(true);

    if (!name.trim()) {
        alert('이름(닉네임)은 필수로 입력해야 합니다.');
        setLoading(false);
        return;
    }

    let finalImageUrl: string | undefined = undefined;

    if (newProfileImageFile) {
        try {
            const { uploadProfileImage } = await import('../../api/profile');
            const uploadResult = await uploadProfileImage(newProfileImageFile);
            finalImageUrl = uploadResult.publicUrl;
        } catch (uploadError) {
            console.error('이미지 업로드 오류:', uploadError);
            alert(uploadError instanceof Error ? uploadError.message : '이미지 업로드에 실패했습니다.');
            setLoading(false);
            return;
        }
    }

    const updatedProfile: {
        name: string;
        favoriteTeam: string | null;
        email: string;
        profileImageUrl?: string;
    } = {
        name: name.trim(),
        favoriteTeam: editingFavoriteTeam === '없음' ? null : editingFavoriteTeam,
        email: email,
    };

    if (finalImageUrl) {
        updatedProfile.profileImageUrl = finalImageUrl;
    } else if (newProfileImageFile === null && profileImage !== 'https://placehold.co/100x100/374151/ffffff?text=User') {
        // 이미지를 변경하지 않았으나 기존 URL이 있다면 유지
        updatedProfile.profileImageUrl = profileImage;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/mypage`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(updatedProfile),
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert('인증 정보가 만료되었습니다. 다시 로그인해주세요.');
                setLoading(false);
                return;
            }
            throw new Error(`Failed to save profile: ${response.statusText}`);
        }

        const apiResponse = await response.json();
        
        if (apiResponse.success) {
            const newToken = apiResponse.data.token;
            if (newToken) {
                localStorage.setItem('authToken', newToken);
            }

            // 이미지 URL 업데이트
            if (profileImage.startsWith('blob:')) {
                URL.revokeObjectURL(profileImage); // 기존 blob URL 해제
            }
            
            let updatedImageUrl = profileImage;
            if (finalImageUrl) {
                updatedImageUrl = finalImageUrl;
            } else if (apiResponse.data.profileImageUrl) {
                updatedImageUrl = apiResponse.data.profileImageUrl;
            }
            
            setNewProfileImageFile(null);

            alert('변경사항이 적용되었습니다.');
            
            onSave({
                name: name.trim(),
                email: email,
                favoriteTeam: editingFavoriteTeam,
                profileImageFile: null // 이미 업로드 완료
            });
            
            return;
        } else {
            alert(apiResponse.message || '프로필 저장에 실패했습니다.');
            return;
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.';
        console.error('프로필 저장 오류:', err);
        alert(`프로필 저장 중 오류 발생: ${errorMessage}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ color: '#2d5f4f' }}>내 정보 수정</h2>
        </div>

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
            <label 
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md"
              style={{ borderColor: '#2d5f4f' }}
            >
              <Camera className="w-5 h-5" style={{ color: '#2d5f4f' }} />
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
          </div>
          <div>
            <h3 style={{ color: '#2d5f4f' }}>{name}</h3>
            <p className="text-gray-600 mt-1">{email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700">이름 *</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full" 
              placeholder="이름을 입력하세요" 
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-700">이메일 *</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full" 
              placeholder="이메일을 입력하세요" 
            />
          </div>

          {/* 🔥 ROLE_USER일 때만 응원구단 섹션 표시 */}
          {userRole === 'ROLE_USER' && (
            <div className="space-y-2">
              <Label htmlFor="team" className="text-gray-700">응원구단 *</Label>
              <Select value={editingFavoriteTeam} onValueChange={setEditingFavoriteTeam}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    {editingFavoriteTeam !== '없음' && (
                      <div className="w-6 h-6">
                        <TeamLogo team={editingFavoriteTeam} size="sm" />
                      </div>
                    )}
                    <span>{TEAM_DATA[editingFavoriteTeam]?.name || '응원하는 팀을 선택하세요'}</span>
                  </div>
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
                            style={{ backgroundColor: TEAM_DATA[teamId]?.color || TEAM_DATA['없음'].color }} 
                          />
                        )}
                        {TEAM_DATA[teamId].name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between mt-2">
                <p className="text-sm text-gray-500">응원구단은 응원게시판에서 사용됩니다</p>
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
          )}
        </div>

        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            취소
          </Button>
          <Button 
            onClick={handleSaveClick} 
            className="flex-1 text-white flex items-center justify-center gap-2" 
            style={{ backgroundColor: '#2d5f4f' }}
          >
            <Save className="w-5 h-5" />
            저장하기
          </Button>
        </div>
      </div>

      {showTeamTest && (
        <TeamRecommendationTest 
          isOpen={showTeamTest}
          onClose={() => setShowTeamTest(false)}
          onSelectTeam={(teamId) => {
            setEditingFavoriteTeam(teamId);
            setShowTeamTest(false);
          }}
        />
      )}
    </>
  );
}