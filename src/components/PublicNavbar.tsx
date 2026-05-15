import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { useAuthBootstrapUiState } from '../hooks/useAuthBootstrapUiState';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import ThemeToggleButton from './ThemeToggleButton';
import NavbarNotificationControls from './NavbarNotificationControls';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { publicNavbarNavItems } from './publicNavbarNavItems';
import { CloseIcon, MenuIcon } from './icons/PublicShellIcons';
import { useScrollStage } from '../hooks/useScrollStage';
import { cn } from '../lib/utils';

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
  const scrollStage = useScrollStage();
  const navIconButtonClass = 'relative h-9 w-9 p-2 rounded-full transition-all duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8`;
  const navIconSizeClass = 'h-5 w-5';
  const prefetchPredictionPage = () => {
    void import('./Prediction');
  };

  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);

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

  const capsuleMaxW =
    scrollStage === 0 ? 'md:max-w-[980px]' :
    scrollStage === 1 ? 'md:max-w-[760px]' :
    'md:max-w-[560px]';

  const capsuleGlass = shouldRenderMobileMenu
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
        {/* Logo */}
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

        {/* Desktop segmented nav */}
        {isDesktop && (
          <nav className="flex flex-1 items-center justify-center" aria-label="주 메뉴">
            <div className="flex items-center gap-0.5 rounded-full bg-black/[.04] dark:bg-white/[.06] p-1">
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
                      'relative h-9 rounded-full px-3.5 font-bold text-[14px] transition-colors duration-150 whitespace-nowrap',
                      isActive
                        ? 'bg-white text-primary shadow-sm dark:bg-primary/70 dark:text-white'
                        : 'text-muted-foreground hover:text-foreground dark:text-gray-400 dark:hover:text-gray-100',
                    )}
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

          {isDesktop && (
            <Suspense fallback={<div className="h-8 w-24 rounded-full bg-gray-100 dark:bg-secondary animate-pulse ml-1" />}>
              <div className="flex items-center gap-1.5 ml-1">
                <PublicNavbarDesktopAuthControls isAuthBootstrapPending={isAuthBootstrapPending} />
              </div>
            </Suspense>
          )}

          {!isDesktop && (
            <>
              {shouldShowMobileNotificationButton && (
                <NavbarNotificationControls buttonClassName={navIconToggleClass} />
              )}
              <button
                type="button"
                ref={menuToggleButtonRef}
                className={cn(
                  navIconButtonClass,
                  'focus:ring-2 focus:ring-primary/50',
                  isMenuOpen
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/8',
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
  );
}
