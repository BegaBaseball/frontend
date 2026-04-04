import { LogOut, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { Button } from './ui/button';

interface PublicNavbarDesktopAuthControlsProps {
  isAuthBootstrapPending?: boolean;
}

export default function PublicNavbarDesktopAuthControls({
  isAuthBootstrapPending = false,
}: PublicNavbarDesktopAuthControlsProps) {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuthSession();
  const { userHandle, userName, userRole } = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isAdmin = isAdminRole(userRole);
  const userProfilePath = userHandle
    ? `/mypage/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}`
    : '/mypage';

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
        className="rounded-full px-3 md:px-4 lg:px-6 text-xs md:text-sm text-white bg-primary-dark/80 hover:bg-primary-dark/80 cursor-wait"
      >
        로그인 확인 중...
      </Button>
    );
  }

  if (!isLoggedIn) {
    return (
      <Button
        type="button"
        onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
        className="rounded-full px-3 md:px-4 lg:px-6 text-xs md:text-sm text-white bg-primary-dark hover:bg-primary"
      >
        로그인
      </Button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(userProfilePath)}
        className="group relative overflow-hidden flex items-center justify-center w-[115px] h-9 rounded-full border border-primary dark:border-primary-light text-primary dark:text-primary-light font-bold text-xs transition-all duration-300 hover:bg-primary hover:text-primary-foreground dark:hover:text-white"
      >
        <span className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out group-hover:-translate-y-full group-hover:opacity-0 group-hover:text-white">
          {userName || '회원'} 님
        </span>

        <span className="absolute inset-0 flex items-center justify-center translate-y-full opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-0 group-hover:opacity-100 group-hover:text-white">
          마이페이지
        </span>
      </button>
      {isAdmin && (
        <Button
          type="button"
          onClick={() => navigate('/admin')}
          variant="outline"
          className="rounded-full px-2 md:px-3 lg:px-4 text-xs md:text-sm flex items-center gap-1 text-red-600 border-red-500/80 dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          <ShieldAlert className="w-4 h-4" />
          관리자
        </Button>
      )}
      <Button
        type="button"
        onClick={handleLogout}
        className="rounded-full px-2 md:px-3 lg:px-4 text-xs md:text-sm flex items-center gap-1 text-primary dark:text-primary-light border-primary dark:border-primary-light"
        variant="outline"
      >
        <LogOut className="w-4 h-4" />
        로그아웃
      </Button>
    </>
  );
}
