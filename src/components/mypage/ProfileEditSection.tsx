import { lazy, Suspense } from 'react';
import type { ProfileSection } from '../../types/profile';

const ProfileEditSectionRuntime = lazy(() => import('./ProfileEditSectionRuntime'));

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

const profileEditSectionFallback = (
  <div className="rounded-2xl border-2 border-border bg-card p-6 text-center text-[16px] text-muted-foreground shadow-lg">
    프로필 설정을 불러오는 중입니다.
  </div>
);

export default function ProfileEditSection(props: ProfileEditSectionProps) {
  return (
    <Suspense fallback={profileEditSectionFallback}>
      <ProfileEditSectionRuntime {...props} />
    </Suspense>
  );
}
