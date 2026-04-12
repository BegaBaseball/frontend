import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import {
  LineChartIcon,
  LogOutIcon,
  MapIcon,
  MegaphoneIcon,
  ShieldAlertIcon,
  UsersIcon,
} from './icons/PublicShellIcons';
import ThemeToggleButton from './ThemeToggleButton';
import { Button } from './ui/button';
import { publicNavbarNavItems, type PublicNavbarNavItemId } from './publicNavbarNavItems';

const navIconToggleClass = 'relative h-10 w-10 p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary';
const navIconSizeClass = 'h-6 w-6';

const navItemIconMap: Record<PublicNavbarNavItemId, typeof MegaphoneIcon> = {
  cheer: MegaphoneIcon,
  stadium: MapIcon,
  prediction: LineChartIcon,
  mate: UsersIcon,
};

interface PublicNavbarMenuPanelProps {
  isAuthBootstrapPending?: boolean;
  onClose: () => void;
  prefetchPredictionPage: () => void;
}

export default function PublicNavbarMenuPanel({
  isAuthBootstrapPending = false,
  onClose,
  prefetchPredictionPage,
}: PublicNavbarMenuPanelProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = (resolvedTheme || theme) === 'dark';
  const { isLoggedIn } = useAuthSession();
  const { userHandle, userName, userRole } = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isAdmin = isAdminRole(userRole);
  const userProfilePath = userHandle
    ? `/mypage/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}`
    : '/mypage';

  const handleMobileNav = (path: string) => {
    onClose();
    navigate(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/home');
  };

  return (
    <>
      <div className="px-6 py-6" data-mobile-menu-section="nav">
        <div className="mb-4 flex items-center justify-between gap-2 px-4">
          <p
            id="mobile-menu-title"
            className="text-[16px] font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider"
          >
            메뉴
          </p>
          <ThemeToggleButton
            className={navIconToggleClass}
            iconClassName={navIconSizeClass}
          />
        </div>
        <div className="space-y-1">
          {publicNavbarNavItems.map((item, index) => {
            const Icon = navItemIconMap[item.id];
            const isActive = location.pathname === `/${item.id}`;
            return (
              <button
                type="button"
                key={item.id}
                autoFocus={index === 0}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleMobileNav(`/${item.id}`)}
                onMouseEnter={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                onFocus={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                onTouchStart={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                className={`flex items-center gap-4 w-full text-left py-4 px-4 text-lg font-semibold rounded-xl transition-all duration-200 ${isActive
                  ? 'bg-primary/15 text-primary dark:text-primary-light'
                  : isDarkMode
                    ? 'text-gray-100 hover:bg-secondary'
                    : 'text-gray-700 hover:bg-gray-100'
                  }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? '' : 'text-gray-400'}`} />
                <span className="flex items-center gap-2">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-current" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-6" data-mobile-menu-section="account">
        <p className="text-[16px] font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-3 px-4">
          계정
        </p>
        {isLoggedIn ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => handleMobileNav(userProfilePath)}
              className={`flex items-center gap-4 w-full py-4 px-4 rounded-xl transition-all duration-200 ${isDarkMode
                ? 'bg-card hover:bg-secondary'
                : 'bg-gray-50 hover:bg-gray-100'
                }`}
              aria-label="프로필로 이동"
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-primary/10 text-primary">
                {userName?.charAt(0) || '?'}
              </div>
              <div className="flex-1 text-left">
                <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {userName || '회원'} 님
                </p>
                <p className="text-[16px] text-gray-500 dark:text-gray-300">
                  내 프로필 보기 →
                </p>
              </div>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => handleMobileNav('/admin')}
                className="flex items-center gap-3 w-full py-4 px-4 rounded-xl transition-all duration-200 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                aria-label="관리자 페이지로 이동"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <ShieldAlertIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="font-semibold text-amber-700 dark:text-amber-400">관리자</span>
                <span className="ml-auto px-2 py-0.5 text-[16px] font-bold rounded bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                  ADMIN
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 w-full py-4 px-4 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-semibold"
              aria-label="로그아웃"
            >
              <LogOutIcon className="w-5 h-5" />
              <span>로그아웃</span>
            </button>
          </div>
        ) : (
          <Button
            type="button"
            disabled={isAuthBootstrapPending}
            aria-busy={isAuthBootstrapPending}
            onClick={() => {
              if (isAuthBootstrapPending) {
                return;
              }
              onClose();
              navigate(buildLoginPath(getCurrentRelativeUrl()));
            }}
            className="w-full py-6 text-base font-semibold text-white rounded-xl bg-primary-dark hover:bg-primary"
          >
            {isAuthBootstrapPending ? '로그인 확인 중...' : '로그인'}
          </Button>
        )}
      </div>
    </>
  );
}
