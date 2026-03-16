import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Bell, LogOut, ShieldAlert, Menu, X, Map, Users, Megaphone, LineChart } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { isAdminRole, useAuthAccessActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { getChatUnreadCounts } from '../api/mate';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { useTheme } from '../hooks/useTheme';
import ThemeToggleButton from './ThemeToggleButton';

import { useMediaQuery } from '../hooks/useMediaQuery';

const CHAT_UNREAD_UPDATED_EVENT = 'chat-unread-updated';
const NotificationPanel = lazy(() => import('./NotificationPanel'));

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, resolvedTheme } = useTheme();
  const isDarkMode = (resolvedTheme || theme) === 'dark';

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isNotificationOpen = useUIStore((state) => state.isNotificationOpen);
  const setIsNotificationOpen = useUIStore((state) => state.setIsNotificationOpen);
  const { isLoggedIn } = useAuthSession();
  const { userHandle, userName, userRole } = useAuthProfileSnapshot();
  const { logout } = useAuthAccessActions();
  const isAdmin = isAdminRole(userRole);
  const notifications = useNotificationStore((state) => state.notifications);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const shouldShowMobileMenuThemeToggle = !isDesktop && isMenuOpen;
  const shouldShowTopThemeToggle = !shouldShowMobileMenuThemeToggle;
  const shouldHideNotificationInMenuOverlay = shouldShowMobileMenuThemeToggle;
  const navIconButtonClass = 'relative h-10 w-10 p-2 rounded-full transition-all duration-200 focus:outline-none';
  const navIconToggleClass = `${navIconButtonClass} focus:ring-2 focus:ring-primary/50 text-gray-600 hover:text-gray-900 dark:text-gray-200 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-secondary`;
  const navIconSizeClass = 'h-6 w-6';
  const userProfilePath = userHandle
    ? `/mypage/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}`
    : '/mypage';
  const unreadCount = notifications.reduce((count, notification) => (!notification.isRead ? count + 1 : count), 0);
  const prefetchPredictionPage = useCallback(() => {
    void import('./Prediction');
  }, []);

  // 안 읽은 채팅 메시지 수 (폴링 - 탭 비활성 시 중지)
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const menuToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPopupRef = useRef<HTMLDivElement | null>(null);
  const preMenuFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      setChatUnreadCount(0);
      return;
    }

    const checkChatUnread = async () => {
      try {
        const count = await getChatUnreadCounts();
        setChatUnreadCount(count);
      } catch (error) {
        // 백그라운드 폴링이므로 에러 무시
      }
    };

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      void checkChatUnread();
      interval = setInterval(() => {
        if (!document.hidden) void checkChatUnread();
      }, 30000);
    };

    const handleVisibilityChange = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
      if (!document.hidden) startPolling();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (!document.hidden) startPolling();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) clearInterval(interval);
    };
  }, [isLoggedIn, location.pathname]); // 경로 변경 시(채팅 뷰 진입/이탈 등) 즉각 업데이트

  useEffect(() => {
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
  }, []);


  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isDesktop && isMenuOpen) {
      setIsMenuOpen(false);
    }
  }, [isDesktop, isMenuOpen]);

  // 메뉴 외부 클릭 시 닫기
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

    requestAnimationFrame(() => {
      const focusTarget = menuPopupRef.current?.querySelector<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      focusTarget?.focus();
    });

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

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    if ('requestIdleCallback' in window) {
      const idleId = (window as any).requestIdleCallback(() => {
        prefetchPredictionPage();
      }, { timeout: 1500 });

      return () => (window as any).cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(() => {
      prefetchPredictionPage();
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [isLoggedIn, prefetchPredictionPage]);


  const handleLogout = () => {
    logout();
    navigate('/home');
  };

  const handleMobileNav = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const navItems = [
    { id: 'cheer', label: '응원석', icon: Megaphone },
    { id: 'stadium', label: '구장가이드', icon: Map },
    { id: 'prediction', label: '전력분석실', icon: LineChart },
    { id: 'mate', label: '같이가요', icon: Users }
  ];

  return (
    <header
      className={`border-b border-gray-200 dark:border-border sticky top-0 z-[60] transition-colors duration-300 ${isMenuOpen ? 'bg-background' : 'bg-background/80 backdrop-blur-md'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* 1. 로고: 브랜드 컬러 일관성 유지 및 계층 구조 적용 */}
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

          {/* 2. 데스크톱 네비게이션: 줄바꿈 방지 및 유동적 간격 */}
          {isDesktop && (
            <nav className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-4 lg:gap-8 xl:gap-12 px-4 whitespace-nowrap">
                {navItems.map((item) => (
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
                    {/* 선택된 메뉴 아래에 작은 점 표시 */}
                    {location.pathname === `/${item.id}` && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary dark:bg-primary-light" />
                    )}
                    {/* 채팅 안 읽은 수 배지 */}
                    {item.id === 'mate' && chatUnreadCount > 0 && (
                      <span className="absolute -top-2 -right-5 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                        {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* 3. 우측 아이콘 및 메뉴 영역 */}
          <div className="flex items-center gap-3 shrink-0">
            {shouldShowTopThemeToggle && (
                <ThemeToggleButton
                    className={navIconToggleClass}
                    iconClassName={navIconSizeClass}
                />
            )}


            {/* 알림 버튼 - 모바일 메뉴 열렸을 때 숨김 */}
            {!shouldHideNotificationInMenuOverlay && (
              <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={navIconToggleClass}
                    aria-label={`알림${unreadCount > 0 ? ` (읽지 않은 알림 ${unreadCount}개)` : ''}`}
                    aria-expanded={isNotificationOpen}
                    aria-haspopup="menu"
                    aria-controls="global-notification-popover"
                  >
                    <span
                      className={unreadCount > 0 ? 'inline-flex animate-pulse' : 'inline-flex'}
                    >
                      <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-primary dark:text-primary-light' : ''}`} />
                    </span>

                    {/* 개선된 알림 배지 */}
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                        {/* 1. 핑(Ping) 애니메이션: 새 알림이 있음을 생동감 있게 표현 */}
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>

                        {/* 2. 실제 배지: 배경색과 분리되는 테두리(ring) 추가 */}
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-background items-center justify-center">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        </span>
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  id="global-notification-popover"
                  className="w-auto p-0 border-none shadow-none bg-transparent"
                  align="end"
                  sideOffset={8}
                >
                  <div
                    className="
                      w-[calc(100vw-32px)] mr-4 
                      sm:w-96 sm:mr-0
                      overflow-hidden rounded-xl
                      bg-white dark:bg-card 
                      border border-gray-200 dark:border-border 
                      shadow-xl
                      animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200
                    "
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-border bg-gray-50/50 dark:bg-secondary/70 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-primary dark:text-primary-light">
                        알림
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground dark:text-gray-300">
                          {unreadCount}개의 읽지 않은 알림
                        </span>
                      )}
                    </div>
                    {/* 최대 높이 제한 및 스크롤 추가 */}
                    <div className="max-h-[60vh] overflow-y-auto">
                      <Suspense
                        fallback={
                          <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
                            알림을 불러오는 중...
                          </div>
                        }
                      >
                        <NotificationPanel />
                      </Suspense>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* 4. 데스크톱 유저 버튼들 (중요: md:flex) */}
            {/* 모바일(hidden) -> md 이상(flex): 로그인/내정보 버튼 보임 */}
            {isDesktop && (
              <div className="flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
                {isLoggedIn ? (
                  <>
                    <button
                    type="button"
                      onClick={() => navigate(userProfilePath)}
                      className="group relative overflow-hidden flex items-center justify-center w-[115px] h-9 rounded-full border border-primary dark:border-primary-light text-primary dark:text-primary-light font-bold text-xs transition-all duration-300 hover:bg-primary hover:text-primary-foreground dark:hover:text-white"
                    >                                                      {/* 1. 닉네임: 평소 중앙, 호버 시 위로 사라짐 */}
                      <span className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out group-hover:-translate-y-full group-hover:opacity-0 group-hover:text-white">
                        {userName || '회원'} 님
                      </span>

                      {/* 2. 프로필: 평소 아래, 호버 시 중앙으로 올라옴 */}
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
                ) : (
                  <Button
                    type="button"
                    onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                    className="rounded-full px-3 md:px-4 lg:px-6 text-xs md:text-sm text-white bg-primary-dark hover:bg-primary"
                  >
                    로그인
                  </Button>
                )}
              </div>
            )}

            {/* 5. 햄버거 버튼 (중요: 768px 이상에서 숨김) */}
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
                aria-controls={shouldShowMobileMenuThemeToggle ? 'mobile-menu-popup' : undefined}
              >
                {isMenuOpen ? <X className="w-7 h-7 stroke-[2.5]" /> : <Menu className="w-7 h-7" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. 모바일 풀스크린 메뉴 */}
      {shouldShowMobileMenuThemeToggle && (
        <div
          ref={menuPopupRef}
          id="mobile-menu-popup"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-menu-title"
          tabIndex={-1}
          className="mobile-menu-popup fixed top-16 left-0 right-0 bottom-0 z-50 overflow-y-auto bg-white dark:bg-background"
        >
          {/* 네비게이션 섹션 */}
          <div className="px-6 py-6">
            <div className="mb-4 flex items-center justify-between gap-2 px-4">
              <p
                id="mobile-menu-title"
                className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider"
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
                        <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white bg-red-500 rounded-full">
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
          <div className="px-6 pb-6">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-300 uppercase tracking-wider mb-3 px-4">
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
                    <p className="text-sm text-gray-500 dark:text-gray-300">
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
                      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-400">관리자</span>
                    <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
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
                  <LogOut className="w-5 h-5" />
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
      )}
    </header>
  );
}
