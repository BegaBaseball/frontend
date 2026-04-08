import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Camera,
  Lock,
  Settings,
  Ban,
  UserRound,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import '../common/autofill-input.css';
import { useProfileEdit } from '../../hooks/useProfileEdit';
import { FRANCHISE_TEAM_IDS } from '../../constants/teams';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { ProfileSection } from '../../types/profile';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import VerificationRequiredDialog from '../VerificationRequiredDialog';
import PlainDialog from '../ui/plain-dialog';

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

const LazyAccountSettingsSection = lazy(() => import('./AccountSettingsSection'));
const LazyBlockedUsersSection = lazy(() => import('./BlockedUsersSection'));
const LazyProfileEditProfileRuntime = lazy(() => import('./ProfileEditProfileRuntime'));

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
  const selectableTeamIds = useMemo<string[]>(() => ['없음', ...FRANCHISE_TEAM_IDS], []);

  useEffect(() => {
    if (isDesktop) {
      setShowMobileMenu(false);
      return;
    }

    setShowMobileMenu(activeSection === 'profile');
  }, [activeSection, isDesktop]);

  const sectionClassForButton = (section: ProfileSection) =>
    activeSection === section
      ? 'bg-primary text-primary-foreground'
      : 'bg-card text-foreground';

  const handleSectionChange = (section: ProfileSection) => {
    if (!onSectionChange || section === activeSection || isLoading) {
      return;
    }

    if (activeSection === 'profile' && hasChanges) {
      setPendingSection(section);
      handleCancelRequest();
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

  const renderMobileMenu = () => (
    <div className="space-y-5 md:hidden">
      <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-5">
        <ProfileAvatar
          src={profileImage}
          alt={name}
          fallbackName={name}
          className="w-16 h-16"
        />
        <div>
          <h3 className="font-semibold text-lg text-primary">{name}</h3>
          <p className="text-[16px] text-muted-foreground">{email}</p>
        </div>
      </div>

      <div className="space-y-3">
        {sectionList.map((section) => (
          <Button
            key={section.key}
            variant="outline"
            className="h-auto min-h-[72px] w-full justify-between rounded-xl px-4 py-3.5 text-left"
            onClick={() => handleSectionChange(section.key)}
            disabled={isLoading}
          >
            <span className="flex min-w-0 flex-1 flex-col items-start gap-1 pr-3">
              <span className="text-[16px] font-semibold leading-none">{section.label}</span>
              <span className="text-left text-[16px] leading-relaxed whitespace-normal text-muted-foreground">
                {section.description}
              </span>
            </span>
            <span className="text-base text-muted-foreground">›</span>
          </Button>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (isProfileSection) {
      return (
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-[16px] text-muted-foreground">프로필 편집 화면을 불러오는 중입니다...</div>}>
          <LazyProfileEditProfileRuntime
            name={name}
            setName={setName}
            email={email}
            bio={bio}
            setBio={setBio}
            userRole={userRole}
            editingFavoriteTeam={editingFavoriteTeam}
            setEditingFavoriteTeam={setEditingFavoriteTeam}
            selectableTeamIds={selectableTeamIds}
            isDesktop={isDesktop}
            isLoading={isLoading}
            fieldErrors={fieldErrors}
            nicknameCheckState={nicknameCheckState}
            nicknameCheckMessage={nicknameCheckMessage}
            saveAttempted={saveAttempted}
            hasValidationErrors={hasValidationErrors}
            hasChanges={hasChanges}
            canSubmit={hasChanges}
            lastSavedAt={lastSavedAt}
            saveMessage={saveMessage}
            showTeamTest={showTeamTest}
            setShowTeamTest={setShowTeamTest}
            handleSave={handleSave}
            handleCancelRequest={handleCancelRequest}
            handleTeamSelect={handleTeamSelect}
          />
        </Suspense>
      );
    }

    if (activeSection === 'accountSettings') {
      return (
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-[16px] text-muted-foreground">계정 설정을 불러오는 중입니다...</div>}>
          <LazyAccountSettingsSection userProvider={userProvider} hasPassword={hasPassword} />
        </Suspense>
      );
    }

    return (
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-[16px] text-muted-foreground">차단 목록을 불러오는 중입니다...</div>}>
        <LazyBlockedUsersSection />
      </Suspense>
    );
  };

  return (
    <>
      <div className="bg-card rounded-2xl shadow-lg border-2 border-border p-4 md:p-8 mb-6">
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
            <div className="md:col-span-4 lg:col-span-3 md:border-r md:border-border md:pr-6">
              <div className="md:sticky md:top-8 md:space-y-2">
                <div className="md:space-y-6">
                  <div className="hidden md:flex md:flex-col md:items-center p-4 md:p-6 bg-card rounded-xl border border-border">
                    <div className="relative">
                      <ProfileAvatar
                        src={profileImage}
                        alt={name}
                        fallbackName={name}
                        className="w-28 h-28"
                      />
                      <label
                        className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-card border-2 border-primary dark:border-primary flex items-center justify-center cursor-pointer hover:bg-secondary dark:hover:bg-primary/10 shadow-md transition-colors"
                      >
                        <Camera className="w-5 h-5 text-primary" />
                        <input
                          data-testid="profile-image-upload-input"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isLoading}
                        />
                      </label>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-primary">{name}</h3>
                    <p className="text-[16px] text-muted-foreground">{email}</p>
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

      <PlainDialog
        open={showDiscardDialog}
        onClose={handleSectionDialogClose}
        title={pendingSection ? '변경사항을 버리고 이동하시겠습니까?' : '변경사항을 버리시겠습니까?'}
        description={pendingSection
          ? '저장하지 않은 변경사항이 있습니다. 이동하려면 변경사항이 사라집니다.'
          : '저장하지 않은 변경사항이 있습니다. 나가시겠습니까?'}
        className="max-w-md"
        footer={(
          <>
            <Button variant="outline" onClick={handleSectionDialogClose}>
              계속 수정
            </Button>
            <Button
              onClick={handleTabDiscardConfirm}
              className="bg-primary text-primary-foreground hover:bg-primary-dark"
            >
              나가기
            </Button>
          </>
        )}
      >
          <p className="text-[16px] text-muted-foreground">
            저장하지 않은 변경사항은 되돌릴 수 없습니다.
          </p>
      </PlainDialog>

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
