import { useEffect, useState } from 'react';
import {
  Camera,
  Save,
  AlertCircle,
  Lock,
  Settings,
  Ban,
  UserRound,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '../ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../ui/sheet';
import TeamLogo from '../TeamLogo';
import TeamRecommendationTest from '../TeamRecommendationTest';
import { useProfileEdit } from '../../hooks/useProfileEdit';
import { TEAM_DATA } from '../../constants/teams';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { ProfileSection, NicknameCheckState } from '../../types/profile';
import AccountSettingsSection from './AccountSettingsSection';
import BlockedUsersSection from './BlockedUsersSection';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import VerificationRequiredDialog from '../VerificationRequiredDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface ProfileEditSectionProps {
  profileImage: string | null;
  name: string;
  email: string;
  userRole?: string;
  userProvider?: string;
  savedFavoriteTeam: string;
  initialBio?: string | null;
  onCancel: () => void;
  onSave: () => void;
  activeSection?: ProfileSection;
  onSectionChange?: (section: ProfileSection) => void;
  onChangePassword?: () => void;
  hasPassword?: boolean;
}

const sectionList: Array<{
  key: ProfileSection;
  label: string;
  description: string;
}> = [
  { key: 'profile', label: '내 정보 수정', description: '프로필 정보 및 응원구단을 관리합니다.' },
  { key: 'accountSettings', label: '계정 설정', description: '연동 계정, 로그인 수단을 관리합니다.' },
  { key: 'blockedUsers', label: '차단 관리', description: '차단한 사용자를 확인하고 해제합니다.' },
];

const getNicknameClassName = (state: NicknameCheckState): string => {
  switch (state) {
    case 'available':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'taken':
      return 'text-red-500 dark:text-red-400';
    case 'error':
      return 'text-orange-500 dark:text-orange-400';
    default:
      return 'text-gray-500 dark:text-gray-300';
  }
};

const getTeamLabel = (teamId: string): string => {
  return TEAM_DATA[teamId]?.name || '응원하는 팀을 선택하세요';
};

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
  activeSection = 'profile',
  onSectionChange,
  onChangePassword,
  hasPassword = true,
}: ProfileEditSectionProps) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [showMobileMenu, setShowMobileMenu] = useState(true);
  const [showTeamSheet, setShowTeamSheet] = useState(false);
  const [pendingPasswordAction, setPendingPasswordAction] = useState(false);
  const [pendingSection, setPendingSection] = useState<ProfileSection | null>(null);
  const {
    profileImage,
    name,
    setName,
    email,
    editingFavoriteTeam,
    setEditingFavoriteTeam,
    bio,
    setBio,
    showTeamTest,
    setShowTeamTest,
    fieldErrors,
    hasChanges,
    hasValidationErrors,
    saveAttempted,
    lastSavedAt,
    saveMessage,
    showDiscardDialog,
    isLoading,
    nicknameCheckState,
    nicknameCheckMessage,
    handleImageUpload,
    handleSave,
    handleTeamSelect,
    handleCancelRequest,
    handleConfirmDiscard,
    handleCloseDiscardDialog,
  } = useProfileEdit({
    initialProfileImage,
    initialName,
    initialEmail,
    initialFavoriteTeam,
    initialBio,
    onCancel,
    onSave,
  });

  const sectionTitle =
    activeSection === 'accountSettings'
      ? '계정 설정'
      : activeSection === 'blockedUsers'
        ? '차단 관리'
        : '내 정보 수정';

  const isProfileSection = activeSection === 'profile';
  const isNameChecking = nicknameCheckState === 'checking';
  const isNameBlocked = nicknameCheckState === 'taken' || nicknameCheckState === 'error';
  const hasFieldErrors = Boolean(fieldErrors.name || fieldErrors.bio || isNameBlocked);
  const canSubmit = hasChanges && !isLoading && !isNameChecking && !isNameBlocked && !hasFieldErrors;

  useEffect(() => {
    if (isDesktop) {
      setShowMobileMenu(false);
      return;
    }

    setShowMobileMenu(activeSection === 'profile');
  }, [activeSection, isDesktop]);

  const sectionClassForButton = (section: ProfileSection) =>
    activeSection === section ? 'bg-primary text-white' : 'bg-white text-gray-900 dark:bg-card dark:text-gray-100';

  const handleSectionChange = (section: ProfileSection) => {
    if (!onSectionChange || section === activeSection || isLoading) {
      return;
    }

    if (activeSection === 'profile' && hasChanges) {
      setPendingSection(section);
      setShowDiscardDialog(true);
      return;
    }

    setPendingSection(null);
    onSectionChange(section);
    if (!isDesktop) {
      setShowMobileMenu(false);
    }
  };

  const handleTabDiscardConfirm = () => {
    if (pendingSection) {
      const nextSection = pendingSection;
      setPendingSection(null);
      handleConfirmDiscard(() => onSectionChange?.(nextSection));
      return;
    }

    handleConfirmDiscard();
  };

  const handleSectionDialogClose = () => {
    setPendingSection(null);
    handleCloseDiscardDialog();
  };

  const handleSectionBack = () => {
    if (isLoading) return;
    onSectionChange?.('profile');
    setShowMobileMenu(true);
  };

  const handleChangePassword = () => {
    setPendingPasswordAction(false);
    onChangePassword?.();
  };

  const renderNameStatus = () => {
    if (!name || name.length <= 1 || nicknameCheckState === 'idle') {
      if (fieldErrors.name) {
        return (
          <p className="text-xs text-red-500 dark:text-red-400">
            {fieldErrors.name}
          </p>
        );
      }
      return null;
    }

    if (nicknameCheckState === 'checking') {
      return <p className="text-xs text-gray-500 dark:text-gray-300">{nicknameCheckMessage}</p>;
    }

    if (fieldErrors.name) {
      return <p className="text-xs text-red-500 dark:text-red-400">{fieldErrors.name}</p>;
    }

    if (nicknameCheckMessage) {
      const colorClass = getNicknameClassName(nicknameCheckState);
      return (
        <p className={`text-xs font-medium ${colorClass}`}>
          {nicknameCheckMessage}
        </p>
      );
    }

    return null;
  };

  const renderMobileMenu = () => (
    <div className="md:hidden space-y-4">
      <div className="flex items-start gap-4 p-5 bg-gray-50 dark:bg-card rounded-xl border border-gray-200 dark:border-border">
        <ProfileAvatar
          src={profileImage}
          alt={name}
          fallbackName={name}
          className="w-16 h-16"
        />
        <div>
          <h3 className="font-semibold text-lg text-primary">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-300">{email}</p>
        </div>
      </div>

      <div className="space-y-2">
        {sectionList.map((section) => (
          <Button
            key={section.key}
            variant="outline"
            className="w-full justify-between"
            onClick={() => handleSectionChange(section.key)}
            disabled={isLoading}
          >
            <span className="flex flex-col items-start">
              <span>{section.label}</span>
              <span className="text-xs text-gray-500 text-left">{section.description}</span>
            </span>
            <span className="text-sm">›</span>
          </Button>
        ))}
      </div>
    </div>
  );

  const renderProfileSection = () => (
    <div className="space-y-6 p-1 md:p-0">
      {saveAttempted && hasValidationErrors && (
        <Alert variant="destructive" className="animate-in fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>입력값을 확인해주세요</AlertTitle>
          <AlertDescription>필드 아래 오류 메시지를 수정한 뒤 저장해 주세요.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-2 p-4">
          <Label htmlFor="name" className="text-sm text-gray-500 dark:text-gray-300">
            이름
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`w-full border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:ring-primary/40 ${fieldErrors.name ? 'border-red-500 dark:border-red-400' : ''}`}
            placeholder="이름을 입력하세요"
            maxLength={21}
            disabled={isLoading}
            aria-invalid={!!fieldErrors.name}
            aria-describedby="name-error"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-300">닉네임은 2~20자</p>
            <p className={`text-xs ${name.length > 20 ? 'text-red-500' : 'text-gray-500 dark:text-gray-300'}`}>
              {name.length}/20
            </p>
          </div>
          <div id="name-error" className="min-h-[18px]">
            {renderNameStatus()}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <Label htmlFor="email" className="text-sm text-gray-500 dark:text-gray-300">
            이메일
          </Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="email"
                type="email"
                value={email}
                className="w-full border-gray-200 dark:border-border bg-gray-100 dark:bg-card text-gray-700 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:ring-primary/40 disabled:opacity-100 pr-9"
                placeholder="이메일을 입력하세요"
                disabled
                readOnly
              />
              <Lock className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-300 whitespace-nowrap">
              수정 불가
            </span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">이메일은 본인 확인에 사용되므로 변경할 수 없습니다.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <Label htmlFor="bio" className="text-sm text-gray-500 dark:text-gray-300">
            자기소개
          </Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={`flex min-h-[90px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-primary/40 ${fieldErrors.bio ? 'border-red-500 dark:border-red-400' : ''}`}
            placeholder="자기소개를 입력하세요 (500자 이내)"
            maxLength={500}
            disabled={isLoading}
            aria-invalid={!!fieldErrors.bio}
            aria-describedby={fieldErrors.bio ? 'bio-error' : undefined}
          />
          <div className="flex justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-300">자기소개는 중요 정보입니다.</p>
            <p className={`text-xs ${bio.length > 500 ? 'text-red-500' : 'text-gray-500 dark:text-gray-300'}`}>
              {bio.length}/500
            </p>
          </div>
          {fieldErrors.bio && (
            <p id="bio-error" className="text-xs text-red-500 dark:text-red-400">
              {fieldErrors.bio}
            </p>
          )}
        </CardContent>
      </Card>

      {userRole === 'ROLE_USER' && (
        <Card>
          <CardContent className="space-y-3 p-4">
            <Label htmlFor="team" className="text-sm text-gray-500 dark:text-gray-300">
              응원구단
            </Label>

            {isDesktop ? (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <Select value={editingFavoriteTeam} onValueChange={setEditingFavoriteTeam}>
                    <SelectTrigger className="w-full border-gray-200 dark:border-border bg-white dark:bg-card text-gray-900 dark:text-gray-100 focus-visible:ring-primary/40">
                      <div className="flex items-center gap-2">
                        {editingFavoriteTeam !== '없음' && (
                          <div className="w-6 h-6">
                            <TeamLogo team={editingFavoriteTeam} size="sm" />
                          </div>
                        )}
                        <span>{getTeamLabel(editingFavoriteTeam)}</span>
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

                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          onClick={() => setShowTeamTest(true)}
                          className="h-10 px-3 text-xs flex items-center justify-center text-primary border-primary/30 hover:bg-primary/10 dark:hover:bg-primary/20"
                          title="구단 테스트를 실행해 나에게 맞는 응원스타일을 확인해 보세요."
                          disabled={isLoading}
                        >
                          <Sparkles className="w-4 h-4 mr-1.5" />
                          구단 테스트 해보기
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>구단 테스트로 나에게 맞는 응원스타일을 확인해 보세요.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-300">응원구단은 응원석에서 사용됩니다</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md border border-gray-200 dark:border-border px-3 py-2 min-h-[40px] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {editingFavoriteTeam !== '없음' && (
                      <div className="w-5 h-5">
                        <TeamLogo team={editingFavoriteTeam} size="sm" />
                      </div>
                    )}
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {getTeamLabel(editingFavoriteTeam)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="h-8 text-sm"
                      onClick={() => setShowTeamSheet(true)}
                      disabled={isLoading}
                    >
                      변경
                    </Button>
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            onClick={() => setShowTeamTest(true)}
                            className="h-8 px-2 text-xs"
                            title="구단 테스트를 실행해 나에게 맞는 응원스타일을 확인해 보세요."
                            disabled={isLoading}
                          >
                        <Sparkles className="w-4 h-4 mr-1.5" />
                          구단 테스트 해보기
                        </Button>
                      </TooltipTrigger>
                        <TooltipContent>
                          <p>구단 테스트로 나에게 맞는 응원스타일을 확인해 보세요.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  앱처럼 빠르게 열어서 응원구단을 선택할 수 있습니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="sticky bottom-0 z-10 p-2 -mx-1 md:mx-0 bg-gray-50 dark:bg-card rounded-xl border border-gray-200 dark:border-border">
        <div className="p-3 rounded-lg space-y-2">
          <p className={`text-sm font-semibold ${hasChanges ? 'text-primary dark:text-primary-light' : 'text-gray-600 dark:text-gray-300'}`}>
            {hasChanges ? '저장되지 않은 변경사항이 있습니다.' : '변경사항 없음'}
          </p>
          <p className="text-xs leading-5 text-gray-500 dark:text-gray-300">
            {lastSavedAt ? `마지막 저장: ${lastSavedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}` : '아직 저장 기록이 없습니다.'}
            {lastSavedAt && saveMessage ? ` · ${saveMessage}` : ''}
          </p>
          <div className="flex w-full gap-2 sm:flex-row flex-col">
            <Button variant="outline" onClick={handleCancelRequest} disabled={isLoading} className="w-full sm:flex-1">
              취소
            </Button>
            <Button
              onClick={handleSave}
              className={`w-full sm:flex-1 text-white bg-primary flex items-center justify-center gap-2 ${!canSubmit && 'opacity-70'}`}
              disabled={isLoading || !canSubmit}
            >
              <Save className="w-5 h-5" />
              {isLoading ? '저장 중...' : '저장하기'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isProfileSection) {
      return renderProfileSection();
    }

    if (activeSection === 'accountSettings') {
      return <AccountSettingsSection userProvider={userProvider} hasPassword={hasPassword} />;
    }

    return <BlockedUsersSection />;
  };

  return (
    <>
      <div className="bg-white dark:bg-card rounded-2xl shadow-lg border-2 border-gray-100 dark:border-border p-4 md:p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">{sectionTitle}</h2>
          {!isDesktop && activeSection !== 'profile' && (
            <Button variant="ghost" className="h-9 px-3" onClick={handleSectionBack} disabled={isLoading}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              설정 목록
            </Button>
          )}
        </div>

        {!isDesktop ? (
          showMobileMenu ? (
            renderMobileMenu()
          ) : (
            <div>
              {renderContent()}
            </div>
          )
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            <div className="md:col-span-4 lg:col-span-3 md:border-r md:border-gray-200 md:dark:border-border md:pr-6">
              <div className="md:sticky md:top-8 md:space-y-2">
                <div className="md:space-y-6">
                  <div className="hidden md:flex md:flex-col md:items-center p-4 md:p-6 bg-gray-50 dark:bg-card rounded-xl border border-gray-200 dark:border-border">
                    <div className="relative">
                      <ProfileAvatar
                        src={profileImage}
                        alt={name}
                        fallbackName={name}
                        className="w-28 h-28"
                      />
                      <label
                        className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white dark:bg-card border-2 border-primary dark:border-primary flex items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-primary/10 shadow-md transition-colors"
                      >
                        <Camera className="w-5 h-5 text-primary" />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </label>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-primary">{name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{email}</p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Button
                      variant={activeSection === 'profile' ? 'default' : 'ghost'}
                      onClick={() => handleSectionChange('profile')}
                      className={`w-full justify-start gap-2 ${sectionClassForButton('profile')}`}
                      disabled={isLoading}
                    >
                      <UserRound className="w-4 h-4" />
                      <span>내 정보 수정</span>
                    </Button>
                    <Button
                      variant={activeSection === 'accountSettings' ? 'default' : 'ghost'}
                      onClick={() => handleSectionChange('accountSettings')}
                      className={`w-full justify-start gap-2 ${sectionClassForButton('accountSettings')}`}
                      disabled={isLoading}
                    >
                      <Settings className="w-4 h-4" />
                      <span>계정 설정</span>
                    </Button>
                    <Button
                      variant={activeSection === 'blockedUsers' ? 'default' : 'ghost'}
                      onClick={() => handleSectionChange('blockedUsers')}
                      className={`w-full justify-start gap-2 ${sectionClassForButton('blockedUsers')}`}
                      disabled={isLoading}
                    >
                      <Ban className="w-4 h-4" />
                      <span>차단 관리</span>
                    </Button>
                    {(!userProvider || userProvider === 'LOCAL') && onChangePassword && hasPassword && (
                      <Button
                        variant="outline"
                        onClick={() => setPendingPasswordAction(true)}
                        className="w-full justify-center gap-2"
                        disabled={isLoading}
                      >
                        <Lock className="w-4 h-4" />
                        비밀번호 변경
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:col-span-8 lg:col-span-9 md:pl-2">{renderContent()}</div>
          </div>
        )}
      </div>

      {showTeamSheet && (
        <Sheet open={showTeamSheet} onOpenChange={setShowTeamSheet}>
          <SheetContent side="bottom" className="h-[70vh]">
            <SheetHeader>
              <SheetTitle>응원구단 선택</SheetTitle>
              <SheetDescription>원하는 응원구단을 선택하면 즉시 반영됩니다.</SheetDescription>
            </SheetHeader>
            <div className="space-y-2 mt-4 overflow-y-auto pb-2">
              {Object.keys(TEAM_DATA).map((teamId) => (
                <Button
                  key={teamId}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    handleTeamSelect(teamId);
                    setShowTeamSheet(false);
                  }}
                  disabled={isLoading}
                >
                  <span className="flex items-center gap-2">
                    {teamId !== '없음' && (
                      <div className="w-6 h-6">
                        <TeamLogo team={teamId} size="sm" />
                      </div>
                    )}
                    {teamId === '없음' && <div className="w-6 h-6 rounded-full bg-gray-400" />}
                    <span>{TEAM_DATA[teamId].name}</span>
                  </span>
                  <CheckCircle2 className={`w-4 h-4 ${editingFavoriteTeam === teamId ? 'text-primary' : 'text-transparent'}`} />
                </Button>
              ))}
            </div>
            <SheetFooter>
              <Button variant="outline" className="w-full" onClick={() => setShowTeamSheet(false)}>
                닫기
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <AlertDialog open={showDiscardDialog} onOpenChange={(open) => !open && handleSectionDialogClose()}>
        <AlertDialogContent className="dark:bg-card dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingSection ? '변경사항을 버리고 이동하시겠습니까?' : '변경사항을 버리시겠습니까?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-300">
              {pendingSection
                ? '저장하지 않은 변경사항이 있습니다. 이동하려면 변경사항이 사라집니다.'
                : '저장하지 않은 변경사항이 있습니다. 나가시겠습니까?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:bg-card dark:text-gray-100 dark:hover:bg-primary/10">
              계속 수정
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTabDiscardConfirm}
              className="bg-primary text-white hover:bg-primary-dark"
            >
              나가기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showTeamTest && (
        <TeamRecommendationTest
          isOpen={showTeamTest}
          onClose={() => setShowTeamTest(false)}
          onSelectTeam={handleTeamSelect}
        />
      )}

      <VerificationRequiredDialog
        isOpen={pendingPasswordAction}
        onClose={() => setPendingPasswordAction(false)}
        mode="security"
        title="비밀번호 변경"
        description="비밀번호 변경은 민감한 작업입니다. 본인 확인을 위해 보안 모드로 이동합니다."
        confirmLabel="안전하게 진행"
        onConfirm={handleChangePassword}
      />
    </>
  );
}
