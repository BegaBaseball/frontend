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
  userProvider?: string;
  savedFavoriteTeam: string;
  initialBio?: string | null; // Added initialBio
  onCancel: () => void;
  onSave: () => void;
  onChangePassword?: () => void;
  onAccountSettings?: () => void;
  onBlockedUsers?: () => void;
}

export default function ProfileEditSection({
  profileImage: initialProfileImage,
  name: initialName,
  email: initialEmail,
  savedFavoriteTeam: initialFavoriteTeam,
  initialBio,
  userRole,
  userProvider,
  onCancel,
  onSave,
  onChangePassword,
  onAccountSettings,
  onBlockedUsers,
}: ProfileEditSectionProps) {
  const {
    profileImage,
    name,
    setName,
    nameError,
    email,
    setEmail,
    editingFavoriteTeam,
    setEditingFavoriteTeam,
    bio,
    setBio,
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
    initialBio,
    onSave,
  });

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-gray-700 p-6 md:p-8 mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2d5f4f] dark:text-emerald-400">내 정보 수정</h2>
        </div>

        {/* ✅ 에러 Alert */}
        {nameError && (
          <Alert variant="destructive" className="mb-6 animate-in fade-in">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>입력 오류</AlertTitle>
            <AlertDescription>{nameError}</AlertDescription>
          </Alert>
        )}

        {/* 2-Column Layout for Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">

          {/* Left Column - Profile Image & Quick Actions */}
          <div className="md:col-span-4 lg:col-span-3 md:border-r md:border-gray-200 md:dark:border-gray-700 md:pr-6">
            <div className="md:sticky md:top-8 space-y-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-16 h-16 text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                  </div>
                  <label
                    className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white dark:bg-gray-700 border-2 border-[#2d5f4f] dark:border-emerald-500 flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 shadow-md transition-colors"
                  >
                    <Camera className="w-5 h-5 text-[#2d5f4f] dark:text-emerald-400" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-[#2d5f4f] dark:text-emerald-400">{name}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{email}</p>
              </div>

              {/* Quick Actions - Desktop Only */}
              <div className="hidden md:block space-y-3">
                {/* Password Change Button (LOCAL users only) */}
                {(!userProvider || userProvider === 'LOCAL') && onChangePassword && (
                  <Button
                    variant="outline"
                    onClick={onChangePassword}
                    className="w-full flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    🔐 비밀번호 변경
                  </Button>
                )}

                {/* Account Settings Button */}
                {onAccountSettings && (
                  <Button
                    variant="ghost"
                    onClick={onAccountSettings}
                    className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    disabled={isLoading}
                  >
                    ⚙️ 계정 설정
                  </Button>

                )}

                {/* Blocked Users Button */}
                {onBlockedUsers && (
                  <Button
                    variant="ghost"
                    onClick={onBlockedUsers}
                    className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    disabled={isLoading}
                  >
                    🚫 차단 관리
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Form Fields */}
          <div className="md:col-span-8 lg:col-span-9 md:pl-2">
            <div className="space-y-6 p-6 md:p-0 bg-gray-50/50 dark:bg-transparent md:bg-transparent rounded-xl md:rounded-none">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                  이름 *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full ${nameError ? 'border-red-500' : ''}`}
                  placeholder="이름을 입력하세요"
                  maxLength={21}
                  disabled={isLoading}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">닉네임은 20자 이하로 입력해주세요</p>
                  <p className={`text-xs ${name.length > 20 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {name.length}/20
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
                  이메일 *
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  placeholder="이메일을 입력하세요"
                  disabled={true}
                  readOnly
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">
                  자기소개
                </Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="자기소개를 입력하세요 (500자 이내)"
                  maxLength={500}
                  disabled={isLoading}
                />
                <div className="flex justify-end">
                  <p className={`text-xs ${bio.length > 500 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {bio.length}/500
                  </p>
                </div>
              </div>

              {/* Favorite Team (ROLE_USER only) */}
              {userRole === 'ROLE_USER' && (
                <div className="space-y-2">
                  <Label htmlFor="team" className="text-gray-700 dark:text-gray-300">
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
                              <div className="w-6 h-6 rounded-full bg-gray-400" />
                            )}
                            {TEAM_DATA[teamId].name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">응원구단은 응원석에서 사용됩니다</p>
                    <Button
                      variant="ghost"
                      onClick={() => setShowTeamTest(true)}
                      className="text-sm flex items-center h-auto py-1 px-2 text-[#2d5f4f] dark:text-emerald-400 hover:bg-green-50 dark:hover:bg-emerald-900/20"
                      disabled={isLoading}
                    >
                      구단 테스트 해보기
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile Only - Quick Actions */}
              <div className="md:hidden space-y-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                {/* Password Change Button (LOCAL users only) */}
                {(!userProvider || userProvider === 'LOCAL') && onChangePassword && (
                  <Button
                    variant="outline"
                    onClick={onChangePassword}
                    className="w-full flex items-center justify-center gap-2"
                    disabled={isLoading}
                  >
                    🔐 비밀번호 변경
                  </Button>
                )}

                {/* Account Settings Button */}
                {onAccountSettings && (
                  <Button
                    variant="ghost"
                    onClick={onAccountSettings}
                    className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    disabled={isLoading}
                  >
                    ⚙️ 계정 설정
                  </Button>

                )}

                {/* Blocked Users Button */}
                {onBlockedUsers && (
                  <Button
                    variant="ghost"
                    onClick={onBlockedUsers}
                    className="w-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    disabled={isLoading}
                  >
                    🚫 차단 관리
                  </Button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
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
          </div>
        </div>
      </div>

      {/* Team Test Modal */}
      {
        showTeamTest && (
          <TeamRecommendationTest
            isOpen={showTeamTest}
            onClose={() => setShowTeamTest(false)}
            onSelectTeam={handleTeamSelect}
          />
        )
      }
    </>
  );
}