import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import './NavigationMenu.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ThemeToggleButton from './ThemeToggleButton';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { publicNavbarNavItems } from './publicNavbarNavItems';
import { CloseIcon, MenuIcon } from './icons/PublicShellIcons';

const PublicNavbarDesktopAuthControls = lazy(() => import('./PublicNavbarDesktopAuthControls'));
const PublicNavbarMenuPanel = lazy(() => import('./PublicNavbarMenuPanel'));

export default function PublicNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const shouldRenderMobileMenu = !isDesktop && isMenuOpen;
  const shouldShowTopThemeToggle = !shouldRenderMobileMenu;
  const navIconButtonClass = 'relative h-10 w-10 p-2 rounded-full transition-all duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary`;
  const navIconSizeClass = 'h-6 w-6';
  const prefetchPredictionPage = () => {
    void import('./Prediction');
  };

  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isDesktop, isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      const returnFocusElement = preMenuFocusRef.current;
      if (returnFocusElement) {
        returnFocusElement.focus();
      }
      return;
    }

    preMenuFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const menuElement = menuPopupRef.current;
      const menuButtonElement = menuToggleButtonRef.current;

      if (menuElement && !menuElement.contains(target) &&
        menuButtonElement && !menuButtonElement.contains(target)) {
        setIsMenuOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [isMenuOpen]);

  return (
    <header
      className={`border-b border-gray-200 dark:border-border sticky top-0 z-[60] transition-colors duration-300 ${isMenuOpen ? 'bg-background' : 'bg-background/80 backdrop-blur-md'
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
              <p className="text-[10px] font-bold text-muted-foreground dark:text-gray-300 tracking-tight">
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
                      relative px-1 py-1 text-sm lg:text-base font-bold transition-all duration-200
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

            {isDesktop && (
              <Suspense fallback={<div className="h-9 w-28 rounded-full bg-gray-100 dark:bg-secondary animate-pulse" />}>
                <div className="flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
                  <PublicNavbarDesktopAuthControls />
                </div>
              </Suspense>
            )}

            {!isDesktop && (
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
            )}
          </div>
        </div>
      </div>

      {shouldRenderMobileMenu && (
        <div
          ref={menuPopupRef}
          id="mobile-menu-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          tabIndex={-1}
          className="mobile-menu-popup fixed top-16 left-0 right-0 bottom-0 z-50 overflow-y-auto bg-white dark:bg-background"
        >
          <Suspense fallback={<div className="px-6 py-6"><div className="h-28 rounded-2xl bg-gray-100 dark:bg-secondary animate-pulse" /></div>}>
            <PublicNavbarMenuPanel
              onClose={() => setIsMenuOpen(false)}
              prefetchPredictionPage={prefetchPredictionPage}
            />
          </Suspense>
        </div>
      )}
    </header>
  );
}
