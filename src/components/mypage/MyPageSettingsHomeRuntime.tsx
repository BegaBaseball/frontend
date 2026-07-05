import type { ReactNode } from 'react';

import type { ViewMode } from '../../types/profile';
import { useAuthAccessActions } from '../../store/authStore';
import {
  MyPageBanIcon,
  MyPageChevronRightIcon,
  MyPageLockIcon,
  MyPageShieldAlertIcon,
  MyPageTrashIcon,
  MyPageUserRoundIcon,
} from './MyPageIcons';

type MyPageSettingsHomeRuntimeProps = {
  email: string;
  savedFavoriteTeam: string;
  userProvider?: string;
  hasPassword?: boolean;
  onSetViewMode: (mode: ViewMode) => void;
};

type SettingRowProps = {
  title: string;
  description?: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
};

function SettingRow({ title, description, icon, danger = false, onClick }: SettingRowProps) {
  return (
    <button
      type="button"
      className={`mypage-card-setting-row ${danger ? 'is-danger' : ''}`}
      onClick={onClick}
    >
      <span className="mypage-card-setting-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="mypage-card-setting-copy">
        <span className="mypage-card-setting-name">
          {title}
        </span>
        {description && <span className="mypage-card-setting-desc">{description}</span>}
      </span>
      <MyPageChevronRightIcon className="mypage-card-setting-chevron" />
    </button>
  );
}

export default function MyPageSettingsHomeRuntime({
  email,
  savedFavoriteTeam,
  userProvider,
  hasPassword = true,
  onSetViewMode,
}: MyPageSettingsHomeRuntimeProps) {
  const { logout } = useAuthAccessActions();
  const canChangePassword = (!userProvider || userProvider === 'LOCAL') && hasPassword;

  return (
    <section className="mypage-card-screen" data-screen-label="설정">
      <div>
        <div>
          <h1 className="mypage-card-screen-title">설정</h1>
          <p className="mypage-card-screen-copy">계정과 마이페이지 기능을 관리해요</p>
        </div>
      </div>

      <div className="mypage-card-panel">
        <div className="mypage-card-section-label">계정</div>
        <div className="mypage-card-setting-list">
          <SettingRow
            title="프로필 정보"
            description={`닉네임, 소개, 응원팀을 수정해요 · ${savedFavoriteTeam || '없음'}`}
            icon={<MyPageUserRoundIcon className="h-4 w-4" />}
            onClick={() => onSetViewMode('editProfile')}
          />
          <SettingRow
            title="계정 설정"
            description={`${email} · 소셜 연동과 보안 활동`}
            icon={<MyPageShieldAlertIcon className="h-4 w-4" />}
            onClick={() => onSetViewMode('accountSettings')}
          />
          {canChangePassword && (
            <SettingRow
              title="비밀번호 변경"
              description="보안 확인 후 비밀번호를 변경해요"
              icon={<MyPageLockIcon className="h-4 w-4" />}
              onClick={() => onSetViewMode('changePassword')}
            />
          )}
          <SettingRow
            title="차단한 사용자"
            description="차단 목록을 확인하고 해제해요"
            icon={<MyPageBanIcon className="h-4 w-4" />}
            onClick={() => onSetViewMode('blockedUsers')}
          />
        </div>
      </div>

      <div className="mypage-card-panel">
        <SettingRow
          title="로그아웃"
          description="현재 기기에서 로그아웃합니다"
          icon={<MyPageTrashIcon className="h-4 w-4" />}
          danger
          onClick={() => logout()}
        />
      </div>
    </section>
  );
}
