import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import { type ComponentType, type CSSProperties, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import ThemeToggleButton from './ThemeToggleButton';
import NavbarNotificationControls from './NavbarNotificationControls';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { publicNavbarNavItems } from './publicNavbarNavItems';
import { CloseIcon, LineChartIcon, MapIcon, MegaphoneIcon, MenuIcon, MessageSquareIcon, UsersIcon } from './icons/PublicShellIcons';
import { useScrollMetrics } from '../hooks/useScrollStage';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';
import { loadPredictionPage } from './lazyRouteLoaders';

const NAV_ITEM_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  cheer: MegaphoneIcon,
  stadium: MapIcon,
  prediction: LineChartIcon,
  mate: UsersIcon,
};

const PublicNavbarDesktopAuthControls = lazy(() => import('./PublicNavbarDesktopAuthControls'));
const PublicNavbarMenuPanel = lazy(() => import('./PublicNavbarMenuPanel'));
const MOBILE_MENU_TRANSITION_MS = 280;

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthBootstrapPending, isLoggedIn } = useAuthBootstrapUiState();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { isMounted: isMobileMenuMounted, isVisible: isMobileMenuVisible } = useAnimatedPresence(
    !isDesktop && isMenuOpen,
    MOBILE_MENU_TRANSITION_MS,
  );
  const shouldRenderMobileMenu = !isDesktop && isMobileMenuMounted;
  const shouldShowTopThemeToggle = isDesktop;
  const shouldShowDesktopNotificationButton = isLoggedIn && isDesktop;
  const shouldShowMobileNotificationButton = isLoggedIn && !isDesktop && !shouldRenderMobileMenu;
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
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = (resolvedTheme || theme) === 'dark';
  const navIconButtonClass = 'relative inline-flex h-11 w-11 items-center justify-center rounded-full p-2 transition-all duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8`;
  const navIconSizeClass = 'h-5 w-5';

  const { data: dmRoomsData } = useQuery({
    queryKey: ['dm', 'inbox'],
    queryFn: async () => { const { fetchMyDmRooms } = await import('../api/dm'); return fetchMyDmRooms(); },
    staleTime: 30_000,
    enabled: isLoggedIn,
  });
  const dmUnreadCount = dmRoomsData?.filter((r) => r.hasUnread).length ?? 0;
  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);
  const predictionPrefetchedRef = useRef(false);

  const prefetchPredictionPage = useCallback(() => {
    if (predictionPrefetchedRef.current) {
      return;
    }

    predictionPrefetchedRef.current = true;
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };
    const load = () => {
      void loadPredictionPage();
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleWindow.requestIdleCallback(load, { timeout: 1200 });
      return;
    }

    window.setTimeout(load, 300);
  }, []);

  useBodyScrollLock(shouldRenderMobileMenu);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isDesktop, isMenuOpen]);

  useEffect(() => {
    if (!shouldRenderMobileMenu) {
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
  }, [shouldRenderMobileMenu]);

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

  const capsuleGlass = shouldRenderMobileMenu
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
        {/* Logo */}
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

        {/* Desktop segmented nav */}
        {isDesktop && (
          <nav className="flex flex-1 items-center justify-center" aria-label="주 메뉴">
            <div
              className="flex items-center gap-0.5 rounded-full bg-black/[.04] dark:bg-white/[.06] transition-[padding] duration-150 ease-out"
              style={navSegmentStyle}
            >
              {publicNavbarNavItems.map((item) => {
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
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          {shouldShowTopThemeToggle && (
            <ThemeToggleButton className={navIconToggleClass} iconClassName={navIconSizeClass} />
          )}

          {shouldShowDesktopNotificationButton && (
            <NavbarNotificationControls buttonClassName={navIconToggleClass} />
          )}

          {isLoggedIn && isDesktop && (
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
            <Suspense fallback={<div className="h-8 w-24 rounded-full bg-gray-100 dark:bg-secondary animate-pulse ml-1" />}>
              <div className="flex items-center gap-1.5 ml-1">
                <PublicNavbarDesktopAuthControls
                  isAuthBootstrapPending={isAuthBootstrapPending}
                  compactProgress={desktopChromeProgress}
                />
              </div>
            </Suspense>
          )}

          {!isDesktop && (
            <>
              {shouldShowMobileNotificationButton && (
                <NavbarNotificationControls buttonClassName={navIconToggleClass} />
              )}
              {isLoggedIn && !shouldRenderMobileMenu && (
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
                  navIconButtonClass,
                  'focus:ring-2 focus:ring-primary/50',
                  isMenuOpen
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8',
                )}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={isMenuOpen}
                aria-controls={shouldRenderMobileMenu ? 'mobile-menu-popup' : undefined}
              >
                {isMenuOpen ? <CloseIcon className="w-6 h-6 stroke-[2.5]" /> : <MenuIcon className="w-6 h-6" />}
              </button>
            </>
          )}
        </div>
      </div>

      {shouldRenderMobileMenu && (
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
              <Suspense fallback={<div className="px-6 py-6"><div className="h-28 rounded-2xl bg-gray-100 dark:bg-secondary animate-pulse" /></div>}>
                <PublicNavbarMenuPanel
                  isAuthBootstrapPending={isAuthBootstrapPending}
                  onClose={() => setIsMenuOpen(false)}
                  prefetchPredictionPage={prefetchPredictionPage}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </header>

    {!shouldRenderMobileMenu && !shouldDeferMobileBottomTabbar && (
      <nav
        data-testid="public-mobile-bottom-nav"
        className="md:hidden fixed inset-x-3.5 z-50"
        style={{
          bottom: 'calc(var(--mobile-chrome-bottom-offset) + env(safe-area-inset-bottom))',
        }}
        aria-label="하단 탭바"
      >
        <div className="grid h-[var(--mobile-chrome-height)] grid-cols-4 gap-0.5 rounded-3xl border border-white/90 bg-white/85 p-1.5 shadow-[0_18px_40px_-16px_rgba(15,67,56,.32)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-[hsl(var(--surface-raised)/0.85)]">
          {publicNavbarNavItems.map((item) => {
            const Icon = NAV_ITEM_ICONS[item.id];
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
                {Icon && <Icon className="w-5 h-5 shrink-0" />}
                <span className="text-[10.5px] font-bold leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    )}
    </>
  );
}
