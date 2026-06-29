import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';

import type { ViewMode } from '../../types/profile';
import LoadingSpinner from '../LoadingSpinner';

const DiaryStatistics = lazy(() => import('./Diarystatistics'));
const BadgesSection = lazy(() => import('./BadgesSection'));
const ProfileEditSection = lazy(() => import('./ProfileEditSection'));
const PasswordChangeSection = lazy(() => import('./PasswordChangeSection'));
const DiaryViewSection = lazy(() => import('./Diaryform'));
const MateHistorySection = lazy(() => import('./MateHistorySection'));
const MyCheerPostsSection = lazy(() => import('./MyCheerPostsSection'));
const AlertsSection = lazy(() => import('./AlertsSection'));
const MyPageSeasonLogRuntime = lazy(() => import('./MyPageSeasonLogRuntime'));
const MyPageSettingsHomeRuntime = lazy(() => import('./MyPageSettingsHomeRuntime'));

type MyPageViewRuntimeProps = {
  viewMode: ViewMode;
  profileImage: string | null;
  name: string;
  email: string;
  savedFavoriteTeam: string;
  cheerPoints: number;
  userRole?: string;
  userProvider?: string;
  initialBio?: string | null;
  hasPassword?: boolean;
  selectedDiaryDate?: string | null;
  onSetViewMode: (mode: ViewMode, options?: { date?: string | null }) => void;
  onProfileUpdated: () => void;
  onOpenTicketUploadModal: () => void;
};

const sectionFallback = (
  <LoadingSpinner size="lg" text="페이지를 불러오는 중..." fullScreen={false} />
);

const renderSection = (children: ReactNode) => (
  <Suspense fallback={sectionFallback}>
    {children}
  </Suspense>
);

export default function MyPageViewRuntime({
  viewMode,
  profileImage,
  name,
  email,
  savedFavoriteTeam,
  cheerPoints,
  userRole,
  userProvider,
  initialBio,
  hasPassword,
  selectedDiaryDate,
  onSetViewMode,
  onProfileUpdated,
  onOpenTicketUploadModal,
}: MyPageViewRuntimeProps) {
  if (viewMode === 'diary') {
    return renderSection(
      <MyPageSeasonLogRuntime
        profileImage={profileImage}
        name={name}
        onOpenDiaryEditor={(date) => onSetViewMode('diaryEditor', { date })}
        onOpenTicketUploadModal={onOpenTicketUploadModal}
      />
    );
  }

  if (viewMode === 'diaryEditor') {
    return renderSection(
      <DiaryViewSection
        initialDate={selectedDiaryDate ?? undefined}
        onBackToLog={() => onSetViewMode('diary')}
      />
    );
  }

  if (viewMode === 'editProfile' || viewMode === 'accountSettings' || viewMode === 'blockedUsers') {
    return renderSection(
      <ProfileEditSection
        profileImage={profileImage}
        name={name}
        email={email}
        savedFavoriteTeam={savedFavoriteTeam}
        userRole={userRole}
        userProvider={userProvider}
        initialBio={initialBio}
        hasPassword={hasPassword}
        activeSection={
          viewMode === 'accountSettings'
            ? 'accountSettings'
            : viewMode === 'blockedUsers'
              ? 'blockedUsers'
              : 'profile'
        }
        onSectionChange={(section) => {
          if (section === 'profile') {
            onSetViewMode('editProfile');
          } else {
            onSetViewMode(section);
          }
        }}
        onCancel={() => onSetViewMode('settings')}
        onSave={onProfileUpdated}
        onChangePassword={() => onSetViewMode('changePassword')}
      />
    );
  }

  if (viewMode === 'changePassword') {
    return renderSection(
      <PasswordChangeSection
        onCancel={() => onSetViewMode('editProfile')}
        onSuccess={() => onSetViewMode('diary')}
        hasPassword={hasPassword}
      />
    );
  }

  if (viewMode === 'settings') {
    return renderSection(
      <MyPageSettingsHomeRuntime
        email={email}
        savedFavoriteTeam={savedFavoriteTeam}
        userProvider={userProvider}
        hasPassword={hasPassword}
        onSetViewMode={onSetViewMode}
      />
    );
  }

  if (viewMode === 'stats') {
    return renderSection(<DiaryStatistics cheerPoints={cheerPoints} />);
  }

  if (viewMode === 'badges') {
    return renderSection(<BadgesSection />);
  }

  if (viewMode === 'alerts') {
    return renderSection(<AlertsSection />);
  }

  if (viewMode === 'mateHistory') {
    return renderSection(<MateHistorySection />);
  }

  if (viewMode === 'cheerPosts') {
    return renderSection(<MyCheerPostsSection />);
  }

  return null;
}
