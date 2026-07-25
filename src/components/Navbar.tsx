import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { type CSSProperties, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  NavbarCloseIcon as CloseIcon,
  NavbarLineChartIcon as LineChartIcon,
  NavbarLogOutIcon as LogOutIcon,
  NavbarMapIcon as MapIcon,
  NavbarMegaphoneIcon as MegaphoneIcon,
  NavbarMenuIcon as MenuIcon,
  NavbarMessageSquareIcon as MessageSquareIcon,
  NavbarShieldAlertIcon as ShieldAlertIcon,
  NavbarUsersIcon as UsersIcon,
} from './icons/NavbarIcons';
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
import { mergeNavbarCompactProgress, useNavbarViewportCompactProgress } from '../hooks/useNavbarViewportCompactProgress';
import { useScrollMetrics } from '../hooks/useScrollStage';
import { cn } from '../lib/utils';
import { buildNavbarNavPath, isNavbarNavItemActive } from '../utils/navbarNavigation';
import { ProfileAvatar } from './ui/ProfileAvatar';

const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';
const MOBILE_MENU_TRANSITION_MS = 280;
const DESKTOP_NAVBAR_GUEST_WIDTH = 980;
const DESKTOP_NAVBAR_GUEST_COMPACT_WIDTH = 760;
const DESKTOP_NAVBAR_AUTH_WIDTH = 1180;
const DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH = 1040;
const NAVBAR_MOTION_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const NAVBAR_NAV_ITEMS = [
  { id: 'cheer', label: '응원석', icon: MegaphoneIcon },
  { id: 'stadium', label: '구장가이드', icon: MapIcon },
  { id: 'prediction', label: '전력분석실', icon: LineChartIcon },
  { id: 'mate', label: '같이가요', icon: UsersIcon },
] as const;

type NavbarNavItemId = typeof NAVBAR_NAV_ITEMS[number]['id'];

type ActivePillMetrics = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
};

const EMPTY_ACTIVE_PILL_METRICS: ActivePillMetrics = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  opacity: 0,
};

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
  const { userName, userProfileImageUrl, userRole } = useAuthProfileSnapshot();
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
  const viewportFitProgress = useNavbarViewportCompactProgress();
  const scrollChromeProgress = isLoggedIn ? fastCompactProgress : compactProgress;
  const authControlsCompactProgress = mergeNavbarCompactProgress(scrollChromeProgress, viewportFitProgress);
  const strongestCompactProgress = Math.max(scrollChromeProgress, viewportFitProgress);
  const isScrollCenteredLayout = scrollChromeProgress >= 0.75;
  const logoSubtitleProgress = Math.min(1, shrinkProgress * 1.6);
  const isLogoSubtitleCollapsed = logoSubtitleProgress >= 0.98 || viewportFitProgress >= 0.98;
  const navIconButtonClass = 'relative inline-flex h-10 w-10 shrink-0 transform-gpu items-center justify-center rounded-full p-2 transition-all duration-[220ms] ease-out motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5 motion-reduce:transform-none focus:outline-none';
  const menuToggleButtonClass = 'relative inline-flex h-11 w-11 shrink-0 transform-gpu items-center justify-center rounded-full p-0 transition-all duration-[220ms] ease-out motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5 motion-reduce:transform-none focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus-visible:ring-2 focus-visible:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8`;
  const navIconSizeClass = 'h-5 w-5';
  const navItems = NAVBAR_NAV_ITEMS;
  const isNavItemActive = (id: NavbarNavItemId) => {
    return isNavbarNavItemActive(id, location.pathname);
  };
  const activeNavItemId = navItems.find((item) => isNavItemActive(item.id))?.id ?? null;
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
  const navSegmentRef = useRef<HTMLDivElement | null>(null);
  const navButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [activePillMetrics, setActivePillMetrics] = useState<ActivePillMetrics>(EMPTY_ACTIVE_PILL_METRICS);

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

  useEffect(() => {
    if (!isDesktop || !activeNavItemId) {
      setActivePillMetrics(EMPTY_ACTIVE_PILL_METRICS);
      return;
    }

    const segment = navSegmentRef.current;
    const activeButton = navButtonRefs.current[activeNavItemId];
    if (!segment || !activeButton) {
      setActivePillMetrics(EMPTY_ACTIVE_PILL_METRICS);
      return;
    }

    let frameId = 0;
    const updateActivePill = () => {
      const segmentRect = segment.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const nextMetrics: ActivePillMetrics = {
        left: buttonRect.left - segmentRect.left,
        top: buttonRect.top - segmentRect.top,
        width: buttonRect.width,
        height: buttonRect.height,
        opacity: 1,
      };

      setActivePillMetrics((prev) => {
        const isSame =
          Math.abs(prev.left - nextMetrics.left) < 0.25
          && Math.abs(prev.top - nextMetrics.top) < 0.25
          && Math.abs(prev.width - nextMetrics.width) < 0.25
          && Math.abs(prev.height - nextMetrics.height) < 0.25
          && prev.opacity === nextMetrics.opacity;

        return isSame ? prev : nextMetrics;
      });
    };
    const scheduleActivePillUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(updateActivePill);
    };

    scheduleActivePillUpdate();
    window.addEventListener('resize', scheduleActivePillUpdate);
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(scheduleActivePillUpdate);
    resizeObserver?.observe(segment);
    resizeObserver?.observe(activeButton);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', scheduleActivePillUpdate);
      resizeObserver?.disconnect();
    };
  }, [
    activeNavItemId,
    isDesktop,
    isScrollCenteredLayout,
    scrollChromeProgress,
    viewportFitProgress,
  ]);

  const desktopCapsuleExpandedWidth = isLoggedIn
    ? DESKTOP_NAVBAR_AUTH_WIDTH
    : DESKTOP_NAVBAR_GUEST_WIDTH;
  const desktopCapsuleCompactWidth = isLoggedIn
    ? DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH
    : DESKTOP_NAVBAR_GUEST_COMPACT_WIDTH;

  const capsuleStyle = {
    '--navbar-capsule-width': `${desktopCapsuleExpandedWidth - ((desktopCapsuleExpandedWidth - desktopCapsuleCompactWidth) * shrinkProgress)}px`,
    '--navbar-capsule-height': `${64 - (8 * shrinkProgress)}px`,
    '--navbar-capsule-px': `${18 - (6 * shrinkProgress) - (6 * viewportFitProgress)}px`,
    '--navbar-capsule-gap': `${14 - (4 * scrollChromeProgress) - (6 * viewportFitProgress)}px`,
    '--navbar-motion-ease': NAVBAR_MOTION_EASE,
    gridTemplateColumns: isScrollCenteredLayout
      ? 'minmax(0, 1fr) auto minmax(0, 1fr)'
      : 'auto minmax(0, 1fr) auto',
  } as CSSProperties;

  const navSegmentStyle: CSSProperties = {
    padding: `${5 - (3 * strongestCompactProgress)}px`,
  };

  const navItemStyle: CSSProperties = {
    height: `${40 - (6 * scrollChromeProgress) - (4 * viewportFitProgress)}px`,
    paddingLeft: `${16 - (10 * viewportFitProgress)}px`,
    paddingRight: `${16 - (10 * viewportFitProgress)}px`,
    fontSize: `${16 - (2 * viewportFitProgress)}px`,
  };

  const logoSubtitleStyle: CSSProperties = {
    lineHeight: '17px',
    maxHeight: isLogoSubtitleCollapsed ? '0px' : '17px',
    opacity: isLogoSubtitleCollapsed ? 0 : 1,
    transform: isLogoSubtitleCollapsed ? 'translateY(-2px)' : 'translateY(0)',
  };

  const rightControlsStyle: CSSProperties = {
    gap: `${Math.max(4, 8 - (2 * scrollChromeProgress) - (4 * viewportFitProgress))}px`,
  };

  const desktopAuthWrapperStyle: CSSProperties = {
    gap: `${Math.max(4, 8 - (2 * scrollChromeProgress) - (4 * viewportFitProgress))}px`,
    marginLeft: `${4 * (1 - strongestCompactProgress)}px`,
  };

  const activeNavPillStyle: CSSProperties = {
    left: `${activePillMetrics.left}px`,
    top: `${activePillMetrics.top}px`,
    width: `${activePillMetrics.width}px`,
    height: `${activePillMetrics.height}px`,
    opacity: activePillMetrics.opacity,
  };

  const capsuleGlass = shouldShowMobileMenuThemeToggle
    ? 'bg-background border-gray-200/80 dark:border-gray-800'
    : 'bg-white/72 dark:bg-black/65 backdrop-blur-xl border-white/80 dark:border-white/8 shadow-navbar-capsule dark:shadow-navbar-capsule-dark';

  return (
    <>
    <header className="sticky top-0 z-[60] px-3 py-2 md:px-4 md:py-1.5 relative overflow-x-clip">
      {/* Backdrop tint — visible only at stage 0 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-opacity duration-[220ms] ease-out"
        style={{
          opacity: 1 - shrinkProgress,
          backgroundColor: isDarkMode ? '#050505' : '#f7faf8',
        }}
      />
      {/* Glass capsule */}
      <div
        data-testid="navbar-capsule"
        className={cn(
          'relative flex h-12 items-center justify-between gap-2 rounded-full border px-3 transition-all duration-[240ms] ease-[var(--navbar-motion-ease)] md:left-1/2 md:grid md:h-[var(--navbar-capsule-height)] md:w-[var(--navbar-capsule-width)] md:max-w-[calc(100vw-1rem)] md:grid-cols-navbar-capsule md:items-center md:gap-[var(--navbar-capsule-gap)] md:-translate-x-1/2 md:px-[var(--navbar-capsule-px)]',
          capsuleGlass,
        )}
        style={capsuleStyle}
      >
        {/* 1. 로고 */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="flex min-h-11 items-center gap-2 shrink-0 group rounded-full px-1 md:justify-self-start"
        >
          <img
            src={baseballLogo}
            alt="Baseball"
            className="w-8 h-8 md:w-9 md:h-9 transition-transform duration-300 group-hover:rotate-12"
          />
          <div className="flex flex-col items-start leading-none">
            <h1 className="font-black text-17 tracking-widest text-primary dark:text-primary-light leading-none">
              BEGA
            </h1>
            <p
              className="hidden overflow-hidden text-10 font-bold text-muted-foreground dark:text-white tracking-tight transition-all duration-150 ease-out md:block"
              style={logoSubtitleStyle}
            >
              BASEBALL GUIDE
            </p>
          </div>
        </button>

        {/* 2. 데스크톱 세그먼트 네비게이션 */}
        {isDesktop && (
          <nav className="flex min-w-0 items-center justify-center md:justify-self-center" aria-label="주 메뉴">
            <div
              ref={navSegmentRef}
              className="relative flex items-center gap-0.5 overflow-hidden rounded-full bg-black/[.035] dark:bg-white/[.045] transition-all duration-[240ms] ease-[var(--navbar-motion-ease)]"
              style={navSegmentStyle}
            >
              {activeNavItemId && (
                <span
                  aria-hidden="true"
                  data-testid="navbar-active-pill"
                  className="pointer-events-none absolute z-0 rounded-full bg-white shadow-navbar-pill transition-all duration-[260ms] ease-[var(--navbar-motion-ease)] dark:bg-primary/70 dark:shadow-navbar-pill-dark motion-reduce:transition-opacity"
                  style={activeNavPillStyle}
                />
              )}
              {navItems.map((item) => {
                const isActive = isNavItemActive(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    ref={(node) => {
                      navButtonRefs.current[item.id] = node;
                    }}
                    data-nav-id={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => navigate(buildNavbarNavPath(item.id))}
                    onMouseEnter={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    onFocus={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    onTouchStart={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    className={cn(
                      'relative z-10 transform-gpu rounded-full font-bold transition-all duration-[220ms] ease-out whitespace-nowrap motion-safe:hover:-translate-y-0.5 motion-safe:focus-visible:-translate-y-0.5 motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45',
                      isActive
                        ? 'text-primary dark:text-white'
                        : 'text-muted-foreground hover:text-foreground hover:shadow-navbar-pill-hover dark:text-white dark:hover:text-gray-100',
                    )}
                    style={navItemStyle}
                  >
                    {item.label}
                    {item.id === 'mate' && chatUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-10 font-bold leading-none text-white">
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
        <div
          data-testid="navbar-right-controls"
          className="flex min-w-0 items-center justify-self-end"
          style={rightControlsStyle}
        >
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
                <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-10 font-bold leading-none text-white">
                  {dmUnreadCount > 99 ? '99+' : dmUnreadCount}
                </span>
              )}
            </button>
          )}

          {isDesktop && (
            <div data-testid="navbar-auth-controls" className="flex items-center" style={desktopAuthWrapperStyle}>
              <PublicNavbarDesktopAuthControls compactProgress={authControlsCompactProgress} />
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
                    <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-[16px] h-4 items-center justify-center rounded-full bg-red-600 px-1 text-10 font-bold leading-none text-white">
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
                    className="text-body font-semibold text-gray-400 dark:text-white uppercase tracking-wider"
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
                          onClick={() => handleMobileNav(buildNavbarNavPath(item.id))}
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
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-body font-bold leading-none text-white bg-red-500 rounded-full">
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
                <p className="text-body font-semibold text-gray-400 dark:text-white uppercase tracking-wider mb-3 px-4">
                  계정
                </p>
                {isLoggedIn ? (
                  <div className="space-y-2">
                    {/* 프로필 카드 */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate('/mypage');
                      }}
                      className={`flex items-center gap-4 w-full py-4 px-4 rounded-xl transition-all duration-200 ${isDarkMode
                        ? 'bg-card hover:bg-secondary'
                        : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      aria-label="마이페이지로 이동"
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
                        <p className="text-body text-gray-500 dark:text-white">
                          마이페이지 보기 →
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
                    <span className="ml-auto px-2 py-0.5 text-body font-bold rounded bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
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
        <div className="grid h-[var(--mobile-chrome-height)] grid-cols-4 gap-0.5 rounded-3xl border border-border bg-card p-1.5 shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface-raised))]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === `/${item.id}`;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigate(buildNavbarNavPath(item.id))}
                onMouseEnter={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                onTouchStart={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                className={cn(
                  'relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-18 transition-colors duration-150',
                  isActive
                    ? 'bg-primary text-white dark:bg-primary/80'
                    : 'text-muted-foreground hover:text-foreground dark:text-white',
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10.5px] font-bold leading-none">{item.label}</span>
                {item.id === 'mate' && chatUnreadCount > 0 && (
                  <span className="absolute top-1 right-2 inline-flex min-w-[14px] h-3.5 items-center justify-center rounded-full bg-red-600 px-1 text-9 font-bold leading-none text-white">
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
