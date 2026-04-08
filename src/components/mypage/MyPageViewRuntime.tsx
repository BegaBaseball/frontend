import { lazy, Suspense } from 'react';

import type { ViewMode } from '../../types/profile';
import LoadingSpinner from '../LoadingSpinner';

const DiaryStatistics = lazy(() => import('./Diarystatistics'));
const ProfileEditSection = lazy(() => import('./ProfileEditSection'));
const PasswordChangeSection = lazy(() => import('./PasswordChangeSection'));
const DiaryViewSection = lazy(() => import('./Diaryform'));
const MateHistorySection = lazy(() => import('./MateHistorySection'));

type MyPageViewRuntimeProps = {
  viewMode: ViewMode;
  profileImage: string | null;
  name: string;
  email: string;
  savedFavoriteTeam: string;
  userRole?: string;
  userProvider?: string;
  initialBio?: string | null;
  hasPassword?: boolean;
  onSetViewMode: (mode: ViewMode) => void;
  onProfileUpdated: () => void;
};

const sectionFallback = (
  <LoadingSpinner size="lg" text="페이지를 불러오는 중..." fullScreen={false} />
);

export default function MyPageViewRuntime({
  viewMode,
  profileImage,
  name,
  email,
  savedFavoriteTeam,
  userRole,
  userProvider,
  initialBio,
  hasPassword,
  onSetViewMode,
  onProfileUpdated,
}: MyPageViewRuntimeProps) {
  if (viewMode === 'editProfile' || viewMode === 'accountSettings' || viewMode === 'blockedUsers') {
    return (
      <Suspense fallback={sectionFallback}>
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
          onCancel={() => onSetViewMode('diary')}
          onSave={onProfileUpdated}
          onChangePassword={() => onSetViewMode('changePassword')}
        />
      </Suspense>
    );
  }

  if (viewMode === 'changePassword') {
    return (
      <Suspense fallback={sectionFallback}>
        <PasswordChangeSection
          onCancel={() => onSetViewMode('editProfile')}
          onSuccess={() => onSetViewMode('diary')}
          hasPassword={hasPassword}
        />
      </Suspense>
    );
  }

  if (viewMode === 'diary') {
    return (
      <Suspense fallback={sectionFallback}>
        <DiaryViewSection />
      </Suspense>
    );
  }

  if (viewMode === 'stats') {
    return (
      <Suspense fallback={<LoadingSpinner size="lg" text="통계를 불러오는 중..." fullScreen={false} />}>
        <DiaryStatistics />
      </Suspense>
    );
  }

  if (viewMode === 'mateHistory') {
    return (
      <Suspense fallback={sectionFallback}>
        <MateHistorySection />
      </Suspense>
    );
  }

  return null;
}
