import { type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { LogOutIcon, ShieldAlertIcon } from './icons/PublicShellIcons';
import { Button } from './ui/button';

interface PublicNavbarDesktopAuthControlsProps {
  isAuthBootstrapPending?: boolean;
  compactProgress?: number;
}

export default function PublicNavbarDesktopAuthControls({
  isAuthBootstrapPending = false,
  compactProgress = 0,
}: PublicNavbarDesktopAuthControlsProps) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { userHandle, userName, userRole } = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isAdmin = isAdminRole(userRole);
  const userProfilePath = userHandle
    ? `/mypage/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}`
    : '/mypage';
  const collapseProgress = Math.min(1, Math.max(0, compactProgress));
  const expandedProgress = 1 - collapseProgress;
  const isCompact = collapseProgress > 0.92;

  const authButtonStyle = (expandedWidth: number): CSSProperties => ({
    width: `${36 + ((expandedWidth - 36) * expandedProgress)}px`,
    paddingLeft: `${16 * expandedProgress}px`,
    paddingRight: `${16 * expandedProgress}px`,
    fontSize: `${14 + (2 * expandedProgress)}px`,
  });

  const labelStyle = (maxWidth: number): CSSProperties => ({
    maxWidth: `${maxWidth * expandedProgress}px`,
    opacity: expandedProgress,
  });

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  if (isAuthBootstrapPending) {
    return (
      <Button
        type="button"
        disabled
        aria-busy="true"
        className="rounded-full h-8 overflow-hidden text-white bg-primary-dark/80 hover:bg-primary-dark/80 cursor-wait transition-[width,padding,font-size] duration-150 ease-out"
        style={authButtonStyle(148)}
      >
        <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out" style={labelStyle(112)}>
          로그인 확인 중...
        </span>
        {isCompact && <span>...</span>}
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button
        type="button"
        onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
        className="rounded-full h-8 overflow-hidden text-white bg-primary-dark hover:bg-primary transition-[width,padding,font-size] duration-150 ease-out"
        style={{
          width: `${68 + (22 * expandedProgress)}px`,
          paddingLeft: `${12 + (4 * expandedProgress)}px`,
          paddingRight: `${12 + (4 * expandedProgress)}px`,
          fontSize: `${14 + (2 * expandedProgress)}px`,
        }}
      >
        <span className="whitespace-nowrap">로그인</span>
      </Button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(userProfilePath)}
        aria-label="마이페이지로 이동"
        className="group relative overflow-hidden flex items-center justify-center h-9 rounded-full border border-primary dark:border-primary-light text-primary dark:text-primary-light font-bold transition-[width,font-size,background-color,color] duration-150 ease-out hover:bg-primary hover:text-primary-foreground dark:hover:text-white"
        style={{
          width: `${36 + (79 * expandedProgress)}px`,
          fontSize: `${14 + (2 * expandedProgress)}px`,
        }}
      >
        <span
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-150 ease-out"
          style={{ opacity: collapseProgress }}
        >
          {userName?.charAt(0) || '?'}
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center overflow-hidden whitespace-nowrap transition-[opacity,transform] duration-150 ease-out group-hover:-translate-y-full group-hover:opacity-0 group-hover:text-white"
          style={{ opacity: expandedProgress }}
        >
          {userName || '회원'} 님
        </span>
        <span
          className="absolute inset-0 flex items-center justify-center translate-y-full overflow-hidden whitespace-nowrap opacity-0 transition-[opacity,transform] duration-150 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:text-white"
          style={{ pointerEvents: isCompact ? 'none' : undefined }}
        >
          마이페이지
        </span>
      </button>
      {isAdmin && (
        <Button
          type="button"
          onClick={() => navigate('/admin')}
          variant="outline"
          aria-label="관리자 페이지로 이동"
          className="rounded-full h-9 flex items-center gap-1 overflow-hidden text-red-600 border-red-500/80 transition-[width,padding,font-size] duration-150 ease-out dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          style={authButtonStyle(82)}
        >
          <ShieldAlertIcon className="w-4 h-4 shrink-0" />
          <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out" style={labelStyle(42)}>
            관리자
          </span>
        </Button>
      )}
      <Button
        type="button"
        onClick={handleLogout}
        aria-label="로그아웃"
        className="rounded-full h-9 flex items-center gap-1 overflow-hidden text-primary dark:text-primary-light border-primary dark:border-primary-light transition-[width,padding,font-size] duration-150 ease-out"
        style={authButtonStyle(124)}
        variant="outline"
      >
        <LogOutIcon className="w-4 h-4 shrink-0" />
        <span className="overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-150 ease-out" style={labelStyle(72)}>
          로그아웃
        </span>
      </Button>
    </>
  );
}
