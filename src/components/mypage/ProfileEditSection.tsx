import { Camera, Save, User, AlertCircle } from 'lucide-react'; 
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'; 
import TeamLogo from '../TeamLogo';
import TeamRecommendationTest from '../TeamRecommendationTest';
import { useProfileEdit } from '../../hooks/useProfileEdit';
import { TEAM_DATA } from '../../constants/teams';

interface ProfileEditSectionProps {
  profileImage: string;
  name: string;
  email: string;
  userRole?: string;
  savedFavoriteTeam: string;
  onCancel: () => void;
  onSave: () => void;
}

export default function ProfileEditSection({
  profileImage: initialProfileImage,
  name: initialName,
  email: initialEmail,
  savedFavoriteTeam: initialFavoriteTeam,
  userRole,
  onCancel,
  onSave,
}: ProfileEditSectionProps) {
  const {
    profileImage,
    name,
    setName,
    nameError, // ✅ 이미 받아오고 있음
    email,
    setEmail,
    editingFavoriteTeam,
    setEditingFavoriteTeam,
    showTeamTest,
    setShowTeamTest,
    isLoading,
    handleImageUpload,
    handleSave,
    handleTeamSelect,
  } = useProfileEdit({
    initialProfileImage,
    initialName,
    initialEmail,
    initialFavoriteTeam,
    onSave,
  });

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ color: '#2d5f4f' }}>내 정보 수정</h2>
        </div>

        {/* ✅ 에러 Alert 추가 */}
        {nameError && (
          <Alert variant="destructive" className="mb-6 animate-in fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>입력 오류</AlertTitle>
            <AlertDescription>{nameError}</AlertDescription>
          </Alert>
        )}

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
            <label
              className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center cursor-pointer hover:bg-gray-50 shadow-md"
              style={{ borderColor: '#2d5f4f' }}
            >
              <Camera className="w-5 h-5" style={{ color: '#2d5f4f' }} />
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isLoading}
              />
            </label>
          </div>
          <div>
            <h3 style={{ color: '#2d5f4f' }}>{name}</h3>
            <p className="text-gray-600 mt-1">{email}</p>
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {/* Name - ✅ 수정된 부분 */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-700">
              이름 *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full ${nameError ? 'border-red-500' : ''}`} // ✅ 에러 시 빨간 테두리
              placeholder="이름을 입력하세요"
              maxLength={21} // ✅ 최대 21자 (20자 + 1)
              disabled={isLoading}
            />
            {/* ✅ 글자 수 표시 추가 */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">닉네임은 20자 이하로 입력해주세요</p>
              <p className={`text-xs ${name.length > 20 ? 'text-red-500' : 'text-gray-500'}`}>
                {name.length}/20
              </p>
            </div>
          </div>

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
              disabled={isLoading}
            />
          </div>

          {/* Favorite Team (ROLE_USER only) */}
          {userRole === 'ROLE_USER' && (
            <div className="space-y-2">
              <Label htmlFor="team" className="text-gray-700">
                응원구단 *
              </Label>
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
                  {Object.keys(TEAM_DATA).map((teamId) => (
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
                            style={{
                              backgroundColor:
                                TEAM_DATA[teamId]?.color || TEAM_DATA['없음'].color,
                            }}
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
                  disabled={isLoading}
                >
                  구단 테스트 해보기
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 text-white flex items-center justify-center gap-2"
            style={{ backgroundColor: '#2d5f4f' }}
            disabled={isLoading}
          >
            <Save className="w-5 h-5" />
            {isLoading ? '저장 중...' : '저장하기'}
          </Button>
        </div>
      </div>

      {/* Team Test Modal */}
      {showTeamTest && (
        <TeamRecommendationTest
          isOpen={showTeamTest}
          onClose={() => setShowTeamTest(false)}
          onSelectTeam={handleTeamSelect}
        />
      )}
    </>
  );
}