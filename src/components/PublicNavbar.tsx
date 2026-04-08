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
  const navIconButtonClass = 'relative h-10 w-10 p-2 rounded-full transition-all duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary`;
  const navIconSizeClass = 'h-6 w-6';
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

  return (
    <header
      className={`border-b border-gray-200 dark:border-border sticky top-0 z-[60] transition-colors duration-300 ${shouldRenderMobileMenu ? 'bg-background' : 'bg-background/80 backdrop-blur-md'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 shrink-0 group"
          >
            <img
              src={baseballLogo}
              alt="Baseball"
              className="w-10 h-10 transition-transform duration-300 group-hover:rotate-12"
            />
            <div className="flex flex-col items-start">
              <h1 className="font-black text-xl tracking-widest text-primary dark:text-primary-light leading-none">
                BEGA
              </h1>
              <p className="text-[16px] font-bold text-muted-foreground dark:text-gray-300 tracking-tight">
                BASEBALL GUIDE
              </p>
            </div>
          </button>

          {isDesktop && (
            <nav className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-4 lg:gap-8 xl:gap-12 px-4 whitespace-nowrap">
                {publicNavbarNavItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={location.pathname === `/${item.id}` ? 'page' : undefined}
                    onClick={() => navigate(`/${item.id}`)}
                    onMouseEnter={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    onFocus={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                    onTouchStart={item.id === 'prediction' ? prefetchPredictionPage : undefined}
                      className={`
                      relative px-1 py-1 text-[16px] lg:text-[16px] font-bold transition-all duration-200
                      ${location.pathname === `/${item.id}`
                        ? 'text-primary dark:text-primary-light'
                        : 'text-muted-foreground dark:text-gray-300 hover:text-primary dark:hover:text-primary-light'
                      }
                    `}
                  >
                    {item.label}
                    {location.pathname === `/${item.id}` && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary dark:bg-primary-light" />
                    )}
                  </button>
                ))}
              </div>
            </nav>
          )}

          <div className="flex items-center gap-3 shrink-0">
            {shouldShowTopThemeToggle && (
              <ThemeToggleButton
                className={navIconToggleClass}
                iconClassName={navIconSizeClass}
              />
            )}

            {shouldShowDesktopNotificationButton && (
              <NavbarNotificationControls buttonClassName={navIconToggleClass} />
            )}

            {isDesktop && (
              <Suspense fallback={<div className="h-9 w-28 rounded-full bg-gray-100 dark:bg-secondary animate-pulse" />}>
                <div className="flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
                  <PublicNavbarDesktopAuthControls isAuthBootstrapPending={isAuthBootstrapPending} />
                </div>
              </Suspense>
            )}

            {!isDesktop && (
              <div className="flex items-center gap-2">
                {shouldShowMobileNotificationButton && (
                  <NavbarNotificationControls buttonClassName={navIconToggleClass} />
                )}
                <button
                  type="button"
                  ref={menuToggleButtonRef}
                  className={`${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary hover:scale-110 active:scale-95 ${isMenuOpen
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`}
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                  aria-expanded={isMenuOpen}
                  aria-controls={shouldRenderMobileMenu ? 'mobile-menu-popup' : undefined}
                >
                  {isMenuOpen ? <CloseIcon className="w-7 h-7 stroke-[2.5]" /> : <MenuIcon className="w-7 h-7" />}
                </button>
              </div>
            )}
          </div>
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
