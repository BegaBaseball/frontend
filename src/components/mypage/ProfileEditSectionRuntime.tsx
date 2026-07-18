import { lazy, Suspense, useMemo, useState } from 'react';
import {
  ProfileEditSectionBanIcon as MyPageBanIcon,
  ProfileEditSectionCameraIcon as MyPageCameraIcon,
  ProfileEditSectionLockIcon as MyPageLockIcon,
  ProfileEditSectionSettingsIcon as MyPageSettingsIcon,
  ProfileEditSectionUserRoundIcon as MyPageUserRoundIcon,
} from './ProfileEditSectionIcons';
import { Button } from '../ui/button';
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
  const [pendingPasswordAction, setPendingPasswordAction] = useState(false);
  const [pendingSection, setPendingSection] = useState<ProfileSection | null>(null);
  const {
    profileImage,
    name,
    setName,
    email,
    editingFavoriteTeam,
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

  const handleChangePassword = () => {
    setPendingPasswordAction(false);
    onChangePassword?.();
  };

  const renderSectionIcon = (section: ProfileSection) => {
    if (section === 'accountSettings') {
      return <MyPageSettingsIcon className="w-4 h-4" />;
    }
    if (section === 'blockedUsers') {
      return <MyPageBanIcon className="w-4 h-4" />;
    }
    return <MyPageUserRoundIcon className="w-4 h-4" />;
  };

  const renderProfileSummary = () => (
    <div className="mypage-profile-summary">
      <div className="relative shrink-0">
        <ProfileAvatar
          src={profileImage}
          alt={name}
          fallbackName={name}
          className="w-16 h-16 md:w-20 md:h-20"
        />
        <label
          className="mypage-profile-avatar-upload"
          aria-label="프로필 이미지 변경"
        >
          <MyPageCameraIcon className="w-4 h-4" />
          <input
            data-testid="profile-image-upload-input"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="sr-only"
            disabled={isLoading}
          />
        </label>
      </div>
      <div className="min-w-0">
        <h3 className="truncate text-lg font-semibold text-primary">{name}</h3>
        <p className="truncate text-body text-muted-foreground">{email}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    if (isProfileSection) {
      return (
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-body text-muted-foreground">프로필 편집 화면을 불러오는 중입니다...</div>}>
          <LazyProfileEditProfileRuntime
            name={name}
            setName={setName}
            email={email}
            bio={bio}
            setBio={setBio}
            userRole={userRole}
            editingFavoriteTeam={editingFavoriteTeam}
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
        <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-body text-muted-foreground">계정 설정을 불러오는 중입니다...</div>}>
          <LazyAccountSettingsSection userProvider={userProvider} hasPassword={hasPassword} />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<div className="rounded-xl border border-border bg-card p-6 text-body text-muted-foreground">차단 목록을 불러오는 중입니다...</div>}>
        <LazyBlockedUsersSection />
      </Suspense>
    );
  };

  return (
    <>
      <section data-screen-label="설정" className="mypage-card-screen mb-6">
        <div className="mypage-profile-header-panel">
          <div>
            <h2 className="text-xl font-bold text-primary">설정</h2>
            <p className="text-body text-muted-foreground">{sectionTitle}</p>
          </div>
          {isProfileSection && renderProfileSummary()}
        </div>

        <div className="mypage-settings-tabs-bar">
          <div className="mypage-settings-tabs-list" role="tablist" aria-label="설정 메뉴">
            {sectionList.map((section) => (
              <button
                key={section.key}
                type="button"
                role="tab"
                aria-selected={activeSection === section.key}
                className={`mypage-settings-tab ${activeSection === section.key ? 'is-active' : ''}`}
                title={section.description}
                onClick={() => handleSectionChange(section.key)}
                disabled={isLoading}
              >
                {renderSectionIcon(section.key)}
                <span>{section.label}</span>
              </button>
            ))}
          </div>
          {(!userProvider || userProvider === 'LOCAL') && onChangePassword && hasPassword && (
            <Button
              variant="outline"
              onClick={() => setPendingPasswordAction(true)}
              className="mypage-settings-password-button"
              disabled={isLoading}
            >
              <MyPageLockIcon className="w-4 h-4" />
              비밀번호 변경
            </Button>
          )}
        </div>

        <div key={activeSection} className="mypage-settings-content-transition">
          {renderContent()}
        </div>
      </section>

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
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              나가기
            </Button>
          </>
        )}
      >
        <p className="text-body text-muted-foreground">
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
