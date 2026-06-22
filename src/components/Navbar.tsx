import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  CloseIcon,
  LineChartIcon,
  LogOutIcon,
  MapIcon,
  MegaphoneIcon,
  MenuIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
  UsersIcon,
} from './icons/PublicShellIcons';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { useTheme } from '../hooks/useTheme';
import ThemeToggleButton from './ThemeToggleButton';
import NavbarNotificationControls from './NavbarNotificationControls';
import PublicNavbarDesktopAuthControls from './PublicNavbarDesktopAuthControls';

import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { CHAT_UNREAD_QUERY_KEY, getChatUnreadQueryOptions } from '../hooks/chatUnreadQueryOptions';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useScrollMetrics } from '../hooks/useScrollStage';
import { cn } from '../lib/utils';
import { ProfileAvatar } from './ui/ProfileAvatar';

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
  const { userHandle, userName, userProfileImageUrl, userRole } = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isAdmin = isAdminRole(userRole);
  const displayName = userName?.trim() || '회원';
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { isMounted: isMobileMenuMounted, isVisible: isMobileMenuVisible } = useAnimatedPresence(
    !isDesktop && isMenuOpen,
    MOBILE_MENU_TRANSITION_MS,
  );
  const shouldShowMobileMenuThemeToggle = !isDesktop && isMobileMenuMounted;
  const shouldShowTopThemeToggle = isDesktop;
  const shouldShowDesktopNotificationButton = authenticatedShell && isDesktop;
  const shouldShowMobileNotificationButton = authenticatedShell && !isDesktop && !shouldShowMobileMenuThemeToggle;
  const shouldDeferMobileBottomTabbar =
    location.pathname === '/cheer'
    || location.pathname === '/cheer/write'
    || location.pathname === '/cheer/bookmarks';
  const {
    shrinkProgress,
    compactProgress,
    fastCompactProgress,
  } = useScrollMetrics();
  const desktopChromeProgress = isLoggedIn ? fastCompactProgress : compactProgress;
  const logoSubtitleProgress = Math.min(1, shrinkProgress * 1.6);
  const navIconButtonClass = 'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-2 transition-colors duration-200 focus:outline-none';
  const menuToggleButtonClass = 'relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-0 transition-colors duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus-visible:ring-2 focus-visible:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8`;
  const navIconSizeClass = 'h-5 w-5';
  const userProfilePath = userHandle
    ? `/mypage/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}`
    : '/mypage';
  const prefetchPredictionPage = () => {
    void import('./Prediction');
  };

  // 안 읽은 채팅 메시지 수
  const queryClient = useQueryClient();
  const shouldFetchChatUnread = authenticatedShell && isLoggedIn;
  const {
    data: chatUnreadQueryData,
    refetch: refetchChatUnread,
  } = useQuery(getChatUnreadQueryOptions(shouldFetchChatUnread));
  const chatUnreadCount = shouldFetchChatUnread ? (chatUnreadQueryData ?? 0) : 0;

  const { data: dmRoomsData } = useQuery({
    queryKey: ['dm', 'inbox'],
    queryFn: async () => { const { fetchMyDmRooms } = await import('../api/dm'); return fetchMyDmRooms(); },
    staleTime: 30_000,
    enabled: authenticatedShell && isLoggedIn,
  });
  const dmUnreadCount = dmRoomsData?.filter((r) => r.hasUnread).length ?? 0;

  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);

  useBodyScrollLock(shouldShowMobileMenuThemeToggle);

  useEffect(() => {
    if (!shouldFetchChatUnread) {
      queryClient.setQueryData(CHAT_UNREAD_QUERY_KEY, 0);
      return;
    }

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refetchChatUnread();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient, refetchChatUnread, shouldFetchChatUnread]);

  // 경로 변경 시(채팅 뷰 진입/이탈 등) 즉각 unread 카운트 갱신
  useEffect(() => {
    if (shouldFetchChatUnread) {
      void refetchChatUnread();
    }
  }, [location.pathname, refetchChatUnread, shouldFetchChatUnread]);

  useEffect(() => {
    if (!authenticatedShell) {
      return;
    }

    const handleChatUnreadUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ count?: number }>;
      const count = customEvent.detail?.count;
      if (typeof count === 'number' && Number.isFinite(count)) {
        queryClient.setQueryData(CHAT_UNREAD_QUERY_KEY, Math.max(0, count));
      }
    };

    window.addEventListener(CHAT_UNREAD_UPDATED_EVENT, handleChatUnreadUpdated as EventListener);
    return () => {
      window.removeEventListener(CHAT_UNREAD_UPDATED_EVENT, handleChatUnreadUpdated as EventListener);
    };
  }, [authenticatedShell, queryClient]);
  
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

  const capsuleStyle = {
    '--navbar-capsule-width': `${980 - (220 * shrinkProgress)}px`,
    '--navbar-capsule-height': `${60 - (14 * shrinkProgress)}px`,
    '--navbar-capsule-px': `${14 - (4 * shrinkProgress)}px`,
  } as CSSProperties;

  const navSegmentStyle: CSSProperties = {
    padding: `${4 - (2 * desktopChromeProgress)}px`,
  };

  const navItemStyle: CSSProperties = {
    height: `${36 - (4 * desktopChromeProgress)}px`,
    paddingLeft: `${14 - (4 * desktopChromeProgress)}px`,
    paddingRight: `${14 - (4 * desktopChromeProgress)}px`,
    fontSize: `${14 - desktopChromeProgress}px`,
  };

  const capsuleGlass = shouldShowMobileMenuThemeToggle
    ? 'bg-background border-gray-200/80 dark:border-gray-800'
    : 'bg-white/72 dark:bg-[rgba(0,0,0,.66)] backdrop-blur-xl border-white/80 dark:border-white/8 shadow-[0_1px_2px_rgba(15,23,42,.04),0_20px_50px_-20px_rgba(15,67,56,.35)] dark:shadow-[0_1px_2px_rgba(0,0,0,.5),0_0_0_1px_rgba(255,255,255,0.04),0_20px_50px_-20px_rgba(0,0,0,.65)]';

  return (
    <>
    <header className="sticky top-0 z-[60] px-3 py-2 md:px-4 md:py-1.5 relative overflow-x-clip">
      {/* Backdrop tint — visible only at stage 0 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-150 ease-out"
        style={{
          opacity: 1 - shrinkProgress,
          backgroundColor: isDarkMode ? '#050505' : '#f7faf8',
        }}
      />
      {/* Glass capsule */}
      <div
        className={cn(
          'relative flex h-12 items-center gap-2 md:gap-[14px] rounded-full border px-3 transition-[width,height,padding,background-color,border-color,box-shadow] duration-150 ease-out md:left-1/2 md:h-[var(--navbar-capsule-height)] md:w-[var(--navbar-capsule-width)] md:max-w-[calc(100vw-2rem)] md:-translate-x-1/2 md:px-[var(--navbar-capsule-px)]',
          capsuleGlass,
        )}
        style={capsuleStyle}
      >
        {/* 1. 로고 */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex min-h-11 items-center gap-2 shrink-0 group rounded-full px-1"
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
            <p
              className="hidden overflow-hidden text-[10px] font-bold text-muted-foreground dark:text-white tracking-tight transition-[opacity,max-height,transform] duration-150 ease-out md:block"
              style={{
                maxHeight: `${10 * (1 - logoSubtitleProgress)}px`,
                opacity: 1 - logoSubtitleProgress,
                transform: `translateY(${-2 * logoSubtitleProgress}px)`,
              }}
            >
              BASEBALL GUIDE
            </p>
          </div>
        </button>

        {/* 2. 데스크톱 세그먼트 네비게이션 */}
        {isDesktop && (
          <nav className="flex flex-1 items-center justify-center" aria-label="주 메뉴">
            <div
              className="flex items-center gap-0.5 rounded-full bg-black/[.04] dark:bg-white/[.06] transition-[padding] duration-150 ease-out"
              style={navSegmentStyle}
            >
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
                      'relative rounded-full font-bold transition-[height,padding,font-size,background-color,color,box-shadow] duration-150 ease-out whitespace-nowrap',
                      isActive
                        ? 'bg-white text-primary shadow-sm dark:bg-primary/70 dark:text-white'
                        : 'text-muted-foreground hover:text-foreground dark:text-white dark:hover:text-gray-100',
                    )}
                    style={navItemStyle}
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

          {authenticatedShell && isLoggedIn && isDesktop && (
            <button
              type="button"
              aria-label="메시지 함"
              onClick={() => navigate('/messages')}
              className={`${navIconToggleClass} relative`}
              data-testid="navbar-dm-icon"
            >
              <MessageSquareIcon className={navIconSizeClass} />
              {dmUnreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                  {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
                </span>
              )}
            </button>
          )}

          {isDesktop && (
            <div className="flex items-center gap-1.5 ml-1">
              <PublicNavbarDesktopAuthControls compactProgress={desktopChromeProgress} />
            </div>
          )}

          {/* 모바일: 알림 + DM + 햄버거 */}
          {!isDesktop && (
            <>
              {shouldShowMobileNotificationButton && (
                <NavbarNotificationControls buttonClassName={navIconToggleClass} />
              )}
              {authenticatedShell && isLoggedIn && !shouldShowMobileMenuThemeToggle && (
                <button
                  type="button"
                  aria-label="메시지 함"
                  onClick={() => navigate('/messages')}
                  className={`${navIconToggleClass} relative`}
                  data-testid="navbar-dm-icon"
                >
                  <MessageSquareIcon className={navIconSizeClass} />
                  {dmUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                      {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
                    </span>
                  )}
                </button>
              )}
              <button
                type="button"
                ref={menuToggleButtonRef}
                className={cn(
                  menuToggleButtonClass,
                  'focus-visible:ring-2 focus-visible:ring-primary/50',
                  isMenuOpen
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white',
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
                    className="text-[16px] font-semibold text-gray-400 dark:text-white uppercase tracking-wider"
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
                <p className="text-[16px] font-semibold text-gray-400 dark:text-white uppercase tracking-wider mb-3 px-4">
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
                      <ProfileAvatar
                        src={userProfileImageUrl}
                        alt={`${displayName} 프로필`}
                        fallbackName={displayName}
                        width={48}
                        height={48}
                        showRing
                        ringClassName="bg-primary/15 p-px dark:bg-white/10"
                      />
                      <div className="flex-1 text-left">
                        <p className={`font-bold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {displayName} 님
                        </p>
                        <p className="text-[16px] text-gray-500 dark:text-white">
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

    {!shouldShowMobileMenuThemeToggle && !shouldDeferMobileBottomTabbar && (
      <nav
        data-testid="auth-mobile-bottom-nav"
        className="md:hidden fixed inset-x-3.5 z-50"
        style={{
          bottom: 'calc(var(--mobile-chrome-bottom-offset) + env(safe-area-inset-bottom))',
        }}
        aria-label="하단 탭바"
      >
        <div className="grid h-[var(--mobile-chrome-height)] grid-cols-4 gap-0.5 rounded-3xl border border-white/90 bg-white/85 p-1.5 shadow-[0_18px_40px_-16px_rgba(15,67,56,.32)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-[hsl(var(--surface-raised)/0.85)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === `/${item.id}`;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigate(`/${item.id}`)}
                onMouseEnter={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                onTouchStart={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                className={cn(
                  'relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-[18px] transition-colors duration-150',
                  isActive
                    ? 'bg-primary text-white dark:bg-primary/80'
                    : 'text-muted-foreground hover:text-foreground dark:text-white',
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10.5px] font-bold leading-none">{item.label}</span>
                {item.id === 'mate' && chatUnreadCount > 0 && (
                  <span className="absolute top-1 right-2 inline-flex min-w-[14px] h-3.5 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold leading-none text-white">
                    {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    )}
    </>
  );
}
