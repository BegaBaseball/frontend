import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  CloseIcon,
  LineChartIcon,
  LogOutIcon,
  MapIcon,
  MegaphoneIcon,
  MenuIcon,
  ShieldAlertIcon,
  UsersIcon,
} from './icons/PublicShellIcons';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { useTheme } from '../hooks/useTheme';
import ThemeToggleButton from './ThemeToggleButton';
import NavbarNotificationControls from './NavbarNotificationControls';

import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useScrollStage } from '../hooks/useScrollStage';
import { cn } from '../lib/utils';

const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';
const MOBILE_MENU_TRANSITION_MS = 280;

type NavbarProps = {
  authenticatedShell?: boolean;
};

export default function Navbar({ authenticatedShell = true }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = (resolvedTheme || theme) === 'dark';

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { isLoggedIn } = useAuthSession();
  const { userHandle, userName, userRole } = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isAdmin = isAdminRole(userRole);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { isMounted: isMobileMenuMounted, isVisible: isMobileMenuVisible } = useAnimatedPresence(
    !isDesktop && isMenuOpen,
    MOBILE_MENU_TRANSITION_MS,
  );
  const shouldShowMobileMenuThemeToggle = !isDesktop && isMobileMenuMounted;
  const shouldShowTopThemeToggle = isDesktop;
  const shouldShowDesktopNotificationButton = authenticatedShell && isDesktop;
  const shouldShowMobileNotificationButton = authenticatedShell && !isDesktop && !shouldShowMobileMenuThemeToggle;
  const scrollStage = useScrollStage();
  const navIconButtonClass = 'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-2 transition-colors duration-200 focus:outline-none';
  const menuToggleButtonClass = 'relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 transition-colors duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus-visible:ring-2 focus-visible:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8`;
  const navIconSizeClass = 'h-5 w-5';
  const userProfilePath = userHandle
    ? `/mypage/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}`
    : '/mypage';
  const prefetchPredictionPage = () => {
    void import('./Prediction');
  };

  // 안 읽은 채팅 메시지 수
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);
  const refreshChatUnreadRef = useRef<(() => void) | null>(null);

  useBodyScrollLock(shouldShowMobileMenuThemeToggle);

  useEffect(() => {
    if (!authenticatedShell || !isLoggedIn) {
      setChatUnreadCount(0);
      refreshChatUnreadRef.current = null;
      return;
    }

    let cancelled = false;
    const refreshChatUnread = async () => {
      try {
        const { getChatUnreadCounts } = await import('../api/mate');
        if (cancelled) {
          return;
        }
        const count = await getChatUnreadCounts();
        if (!cancelled) {
          setChatUnreadCount(count);
        }
      } catch (error) {
        // 백그라운드 폴링이므로 에러 무시
      }
    };

    refreshChatUnreadRef.current = () => {
      void refreshChatUnread();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshChatUnread();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    void refreshChatUnread();

    return () => {
      cancelled = true;
      refreshChatUnreadRef.current = null;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [authenticatedShell, isLoggedIn]);

  // 경로 변경 시(채팅 뷰 진입/이탈 등) 즉각 unread 카운트 갱신
  useEffect(() => {
    refreshChatUnreadRef.current?.();
  }, [location.pathname]);

  useEffect(() => {
    if (!authenticatedShell) {
      return;
    }

    const handleChatUnreadUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      const count = customEvent.detail?.count;
      if (typeof count === 'number' && Number.isFinite(count)) {
        setChatUnreadCount(Math.max(0, count));
      }
    };

    window.addEventListener(CHAT_UNREAD_UPDATED_EVENT, handleChatUnreadUpdated as EventListener);
    return () => {
      window.removeEventListener(CHAT_UNREAD_UPDATED_EVENT, handleChatUnreadUpdated as EventListener);
    };
  }, [authenticatedShell]);
  
  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isDesktop, isMenuOpen]);

  useEffect(() => {
    if (!shouldShowMobileMenuThemeToggle) {
      const returnFocusElement = preMenuFocusRef.current;
      if (returnFocusElement) {
        returnFocusElement.focus();
      }
      return;
    }

    preMenuFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const frameId = window.requestAnimationFrame(() => {
      const focusTarget = menuPopupRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus();
    });

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleEsc);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [shouldShowMobileMenuThemeToggle]);

  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const handleMobileNav = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const navItems = [
    { id: 'cheer', label: '응원석', icon: MegaphoneIcon },
    { id: 'stadium', label: '구장가이드', icon: MapIcon },
    { id: 'prediction', label: '전력분석실', icon: LineChartIcon },
    { id: 'mate', label: '같이가요', icon: UsersIcon }
  ];

  const capsuleMaxW =
    scrollStage === 0 ? 'md:max-w-[980px]' :
    scrollStage === 1 ? 'md:max-w-[760px]' :
    'md:max-w-[560px]';

  const capsuleGlass = shouldShowMobileMenuThemeToggle
    ? 'bg-background border-gray-200/80 dark:border-gray-800'
    : 'bg-white/72 dark:bg-black backdrop-blur-xl border-white/80 dark:border-white/12 shadow-[0_1px_2px_rgba(15,23,42,.04),0_20px_50px_-20px_rgba(15,67,56,.35)] dark:shadow-[0_1px_2px_rgba(0,0,0,.5),0_0_0_1px_rgba(255,255,255,0.06),0_20px_50px_-20px_rgba(15,120,85,0.18)]';

  return (
    <header className="sticky top-0 z-[60] px-3 py-2 md:px-4 md:py-1.5">
      {/* Glass capsule */}
      <div
        className={cn(
          'flex h-12 md:h-[52px] items-center gap-2 md:gap-[14px] rounded-full border px-3 md:px-[14px] transition-all duration-[350ms] ease-[cubic-bezier(.16,1,.3,1)] md:mx-auto',
          capsuleMaxW,
          capsuleGlass,
        )}
      >
        {/* 1. 로고 */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex items-center gap-2 shrink-0 group"
        >
          <img
            src={baseballLogo}
            alt="Baseball"
            className="w-8 h-8 md:w-9 md:h-9 transition-transform duration-300 group-hover:rotate-12"
          />
          <div className="flex flex-col items-start leading-none">
            <h1 className="font-black text-[17px] tracking-widest text-primary dark:text-primary-light leading-none">
              BEGA
            </h1>
            <p className={cn(
              'text-[10px] font-bold text-muted-foreground dark:text-gray-400 tracking-tight transition-all duration-300',
              scrollStage >= 1 ? 'hidden' : 'hidden md:block',
            )}>
              BASEBALL GUIDE
            </p>
          </div>
        </button>

        {/* 2. 데스크톱 세그먼트 네비게이션 */}
        {isDesktop && (
          <nav className="flex flex-1 items-center justify-center" aria-label="주 메뉴">
            <div className="flex items-center gap-0.5 rounded-full bg-black/[.04] dark:bg-white/[.06] p-1">
              {navItems.map((item) => {
                const isActive = location.pathname === `/${item.id}`;
                return (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigate(`/${item.id}`)}
                    onMouseEnter={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    onFocus={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    onTouchStart={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    className={cn(
                      'relative h-9 rounded-full px-3.5 font-bold text-[14px] transition-colors duration-150 whitespace-nowrap',
                      isActive
                        ? 'bg-white text-primary shadow-sm dark:bg-primary/70 dark:text-white'
                        : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-100',
                    )}
                  >
                    {item.label}
                    {item.id === 'mate' && chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* 3. 우측 컨트롤 */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {shouldShowTopThemeToggle && (
            <ThemeToggleButton className={navIconToggleClass} iconClassName={navIconSizeClass} />
          )}

          {shouldShowDesktopNotificationButton && (
            <NavbarNotificationControls buttonClassName={navIconToggleClass} />
          )}

          {isDesktop && (
            <div className="flex items-center gap-1.5 ml-1">
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(userProfilePath)}
                    className="group relative overflow-hidden flex items-center justify-center h-8 px-3 rounded-full border border-primary/50 dark:border-primary-light/50 text-primary dark:text-primary-light font-bold text-[14px] transition-all duration-300 hover:bg-primary hover:border-primary hover:text-white"
                  >
                    <span className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out group-hover:-translate-y-full group-hover:opacity-0">
                      {scrollStage >= 2 ? (userName?.charAt(0) || '?') : `${userName || '회원'} 님`}
                    </span>
                    <span className="absolute inset-0 flex items-center justify-center translate-y-full opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-0 group-hover:opacity-100 text-white">
                      마이페이지
                    </span>
                  </button>
                  {isAdmin && (
                    <Button
                      type="button"
                      onClick={() => navigate('/admin')}
                      variant="outline"
                      className="rounded-full h-8 px-2.5 text-[13px] flex items-center gap-1 text-red-600 border-red-500/80 dark:text-red-400 dark:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                      <ShieldAlertIcon className="w-3.5 h-3.5" />
                      {scrollStage < 2 && '관리자'}
                    </Button>
                  )}
                  <Button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-full h-8 px-2.5 text-[13px] flex items-center gap-1 text-primary dark:text-primary-light border-primary/50 dark:border-primary-light/50"
                    variant="outline"
                  >
                    <LogOutIcon className="w-3.5 h-3.5" />
                    {scrollStage < 2 && '로그아웃'}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                  className="rounded-full h-8 px-4 text-[14px] text-white bg-primary-dark hover:bg-primary"
                >
                  로그인
                </Button>
              )}
            </div>
          )}

          {/* 모바일: 알림 + 햄버거 */}
          {!isDesktop && (
            <>
              {shouldShowMobileNotificationButton && (
                <NavbarNotificationControls buttonClassName={navIconToggleClass} />
              )}
              <button
                type="button"
                ref={menuToggleButtonRef}
                className={cn(
                  menuToggleButtonClass,
                  'focus-visible:ring-2 focus-visible:ring-primary/50',
                  isMenuOpen
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white',
                )}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={isMenuOpen}
                aria-controls={shouldShowMobileMenuThemeToggle ? 'mobile-menu-popup' : undefined}
              >
                {isMenuOpen ? <CloseIcon className="w-6 h-6 stroke-[2.5]" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 6. 모바일 풀스크린 메뉴 */}
      {shouldShowMobileMenuThemeToggle && (
        <div className={`mobile-menu-layer ${isMobileMenuVisible ? 'is-open' : ''}`}>
          <div
            className="mobile-menu-backdrop"
            onClick={() => setIsMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobile-menu-shell">
            <div
              ref={menuPopupRef}
              id="mobile-menu-popup"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              tabIndex={-1}
              className="mobile-menu-popup bg-white dark:bg-background"
            >
              {/* 네비게이션 섹션 */}
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
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === `/${item.id}`;
                    return (
                        <button
                        type="button"
                          key={item.id}
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
                        <span className="flex items-center gap-2">
                          {item.label}
                          {item.id === 'mate' && chatUnreadCount > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[16px] font-bold leading-none text-white bg-red-500 rounded-full">
                              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-current" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 사용자 영역 */}
              <div className="px-6 pb-6" data-mobile-menu-section="account">
                <p className="text-[16px] font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-3 px-4">
                  계정
                </p>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    {/* 프로필 카드 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate(userProfilePath);
                      }}
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

                    {/* 관리자 버튼 - ADMIN 태그 스타일 */}
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

                    {/* 로그아웃 버튼 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        handleLogout();
                      }}
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
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(buildLoginPath(getCurrentRelativeUrl()));
                    }}
                    className="w-full py-6 text-base font-semibold text-white rounded-xl bg-primary-dark hover:bg-primary"
                  >
                    로그인
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
