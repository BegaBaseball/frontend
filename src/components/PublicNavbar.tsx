import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import { type ComponentType, type CSSProperties, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import ThemeToggleButton from './ThemeToggleButton';
import NavbarNotificationControls from './NavbarNotificationControls';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { mergeNavbarCompactProgress, useNavbarViewportCompactProgress } from '../hooks/useNavbarViewportCompactProgress';
import { publicNavbarNavItems, type PublicNavbarNavItemId } from './publicNavbarNavItems';
import {
  NavbarCloseIcon as CloseIcon,
  NavbarLineChartIcon as LineChartIcon,
  NavbarMapIcon as MapIcon,
  NavbarMegaphoneIcon as MegaphoneIcon,
  NavbarMenuIcon as MenuIcon,
  NavbarMessageSquareIcon as MessageSquareIcon,
  NavbarUsersIcon as UsersIcon,
} from './icons/NavbarIcons';
import { useScrollMetrics } from '../hooks/useScrollStage';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../lib/utils';
import { hasPersistedAuthBootstrapHint } from '../utils/authBootstrap';
import { buildNavbarNavPath, isNavbarNavItemActive } from '../utils/navbarNavigation';
import { loadPredictionPage } from './lazyRouteLoaders';

const NAV_ITEM_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  cheer: MegaphoneIcon,
  stadium: MapIcon,
  prediction: LineChartIcon,
  mate: UsersIcon,
};

const PublicNavbarDesktopAuthControls = lazy(() => import('./PublicNavbarDesktopAuthControls'));
const PublicNavbarDmUnreadBadge = lazy(() => import('./PublicNavbarDmUnreadBadge'));
const PublicNavbarMenuPanel = lazy(() => import('./PublicNavbarMenuPanel'));
const MOBILE_MENU_TRANSITION_MS = 280;
const DESKTOP_NAVBAR_GUEST_WIDTH = 980;
const DESKTOP_NAVBAR_GUEST_COMPACT_WIDTH = 760;
const DESKTOP_NAVBAR_AUTH_WIDTH = 1180;
const DESKTOP_NAVBAR_AUTH_COMPACT_WIDTH = 1040;
const NAVBAR_MOTION_EASE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

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
  const viewportFitProgress = useNavbarViewportCompactProgress();
  const scrollChromeProgress = isLoggedIn ? fastCompactProgress : compactProgress;
  const authControlsCompactProgress = mergeNavbarCompactProgress(scrollChromeProgress, viewportFitProgress);
  const strongestCompactProgress = Math.max(scrollChromeProgress, viewportFitProgress);
  const isScrollCenteredLayout = scrollChromeProgress >= 0.75;
  const logoSubtitleProgress = Math.min(1, shrinkProgress * 1.6);
  const isLogoSubtitleCollapsed = logoSubtitleProgress >= 0.98 || viewportFitProgress >= 0.98;
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = (resolvedTheme || theme) === 'dark';
  const navIconButtonClass = 'relative inline-flex h-10 w-10 items-center justify-center rounded-full p-2 transition-all duration-200 focus:outline-none';
  const menuToggleButtonClass = 'relative inline-flex h-11 w-11 items-center justify-center rounded-full p-0 transition-all duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-white dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8`;
  const navIconSizeClass = 'h-5 w-5';

  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);
  const navSegmentRef = useRef<HTMLDivElement | null>(null);
  const navButtonRefs = useRef<Record<PublicNavbarNavItemId, HTMLButtonElement | null>>({
    cheer: null,
    stadium: null,
    prediction: null,
    mate: null,
  });
  const [activePillMetrics, setActivePillMetrics] = useState<ActivePillMetrics>(EMPTY_ACTIVE_PILL_METRICS);
  const activeNavItemId = publicNavbarNavItems.find((item) => isNavbarNavItemActive(item.id, location.pathname))?.id ?? null;
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

  const shouldReserveAuthenticatedChrome = isAuthBootstrapPending || isLoggedIn || hasPersistedAuthBootstrapHint();
  const desktopCapsuleExpandedWidth = shouldReserveAuthenticatedChrome
    ? DESKTOP_NAVBAR_AUTH_WIDTH
    : DESKTOP_NAVBAR_GUEST_WIDTH;
  const desktopCapsuleCompactWidth = shouldReserveAuthenticatedChrome
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

  const capsuleGlass = shouldRenderMobileMenu
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
        {/* Logo */}
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

        {/* Desktop segmented nav */}
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
              {publicNavbarNavItems.map((item) => {
                const isActive = isNavbarNavItemActive(item.id, location.pathname);
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
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Right controls */}
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

          {isLoggedIn && isDesktop && (
            <button
              type="button"
              aria-label="메시지 함"
              onClick={() => navigate('/messages')}
              className={`${navIconToggleClass} relative`}
              data-testid="navbar-dm-icon"
            >
              <MessageSquareIcon className={navIconSizeClass} />
              <Suspense fallback={null}>
                <PublicNavbarDmUnreadBadge />
              </Suspense>
            </button>
          )}

          {isDesktop && (
            <Suspense fallback={<div className="h-8 w-24 rounded-full bg-gray-100 dark:bg-secondary animate-pulse ml-1" />}>
              <div data-testid="navbar-auth-controls" className="flex items-center" style={desktopAuthWrapperStyle}>
                <PublicNavbarDesktopAuthControls
                  isAuthBootstrapPending={isAuthBootstrapPending}
                  compactProgress={authControlsCompactProgress}
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
                  <Suspense fallback={null}>
                    <PublicNavbarDmUnreadBadge />
                  </Suspense>
                </button>
              )}
              <button
                type="button"
                ref={menuToggleButtonRef}
                className={cn(
                  menuToggleButtonClass,
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
        <div className="grid h-[var(--mobile-chrome-height)] grid-cols-4 gap-0.5 rounded-3xl border border-border bg-card p-1.5 shadow-sm dark:border-white/10 dark:bg-[hsl(var(--surface-raised))]">
          {publicNavbarNavItems.map((item) => {
            const Icon = NAV_ITEM_ICONS[item.id];
            const isActive = isNavbarNavItemActive(item.id, location.pathname);
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
