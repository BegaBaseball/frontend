import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Bell, LogOut, ShieldAlert, Menu, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme'; 
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore'; 
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore'; 
import NotificationPanel from './NotificationPanel';  
import { useNotificationWebSocket } from '../hooks/useNotificationWebSocket';
import { useMediaQuery } from '../hooks/useMediaQuery';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const LOGOUT_API_URL = `${API_BASE_URL}/auth/logout`; 

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const isNotificationOpen = useUIStore((state) => state.isNotificationOpen);
  const setIsNotificationOpen = useUIStore((state) => state.setIsNotificationOpen);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const setUnreadCount = useNotificationStore((state) => state.setUnreadCount);
  const isDesktop = useMediaQuery('(min-width: 768px)');
  


    // 사용자 ID 가져오기
  useEffect(() => {
    if (!user) {
      setUserId(null);
      return;
    }

    const fetchUserId = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/users/email-to-id?email=${encodeURIComponent(user.email)}`, {
          credentials: 'include',
        });
        const data = await response.json();
        const id = data.data || data;
        setUserId(typeof id === 'number' ? id : parseInt(id));
      } catch (error) {
        console.error('사용자 ID 조회 오류:', error);
      }
    };

    fetchUserId();
  }, [user]);

  // 알림 WebSocket 연결
  useNotificationWebSocket({
    userId,
    enabled: !!userId,
  });

  // 초기 알림 개수만 가져오기 (WebSocket이 실시간으로 업데이트)
  useEffect(() => {
    if (!userId) return;

    const fetchInitialUnreadCount = async () => {
      try {
        const countResponse = await fetch(`${API_BASE_URL}/notifications/user/${userId}/unread-count`, {
          credentials: 'include',
        });
        const count = await countResponse.json();
        setUnreadCount(count);
      } catch (error) {
        console.error('읽지 않은 알림 개수 조회 오류:', error);
      }
    };

    fetchInitialUnreadCount();
  }, [userId, setUnreadCount]);
  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMenuOpen) {
        const target = event.target as HTMLElement;
        const menuElement = document.querySelector('.mobile-menu-popup');
        const hamburgerButton = document.querySelector('.hamburger-menu-btn');
        
        if (menuElement && !menuElement.contains(target) && 
            hamburgerButton && !hamburgerButton.contains(target)) {
          setIsMenuOpen(false);
        }
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  
  const handleLogout = async () => {
    try {
      const response = await fetch(LOGOUT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      logout();
      navigate('/home');
      if (!response.ok) console.error('Server logout failed');
    } catch (error) {
      logout();
      navigate('/');
    }
  };
  
  const navItems = [
    { id: 'cheer', label: '게시판' },
    { id: 'stadium', label: '구장가이드' },
    { id: 'prediction', label: '승리예측' },
    { id: 'mate', label: '같이가요' }
  ];

  return (
    <header
      className="border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 transition-colors duration-300 bg-white dark:bg-gray-900"
      {...(isMenuOpen && !isDesktop ? { style: { backgroundColor: '#2d5f4f' } } : {})}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* 1. 로고 */}
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 shrink-0"
          >
            <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
            <div>
              <h1 className={`tracking-wider text-xl transition-colors font-black ${
                isMenuOpen && !isDesktop
                  ? 'text-white'
                  : 'text-primary dark:text-white'
              }`}>
                BEGA
              </h1>
              <p className={`text-xs transition-colors ${
                isMenuOpen && !isDesktop
                  ? 'text-white'
                  : 'text-primary dark:text-white'
              }`}>
                BASEBALL GUIDE
              </p>
            </div>
          </button>

          {/* 2. 데스크톱 네비게이션 (중요: md:flex) */}
          {/* 모바일(hidden) -> md 이상(flex): 상단 메뉴가 보임 */}
          {isDesktop && (
            <nav className="flex flex-1 justify-center items-center gap-2 md:gap-3 lg:gap-6 xl:gap-8 flex-wrap">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(`/${item.id}`)}
                  className={`${location.pathname === `/${item.id}` ? 'hover:opacity-70' : 'text-gray-700 dark:text-gray-300 hover:opacity-70'} whitespace-nowrap px-2 flex-shrink-0`}
                  style={location.pathname === `/${item.id}` ? { color: '#2d5f4f', fontWeight: 700 } : {}}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          {/* 3. 우측 아이콘 및 메뉴 영역 */}
          <div className="flex items-center gap-3 shrink-0">

            {/* 테마 토글 버튼 */}
            <button
              onClick={toggleTheme}
              className={`p-1 transition-colors ${isMenuOpen && !isDesktop ? 'text-white hover:text-gray-200' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>

            {/* 알림 버튼 (항상 보임) */}
            <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <PopoverTrigger asChild>
                <button className={`relative p-1 transition-colors ${isMenuOpen && !isDesktop ? 'text-white hover:text-gray-200' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}>
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs text-white font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96 p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700" align="end">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                  <h3 className="font-bold" style={{ color: '#2d5f4f' }}>
                    알림
                  </h3>
                </div>
                <NotificationPanel />
              </PopoverContent>
            </Popover>

            {/* 4. 데스크톱 유저 버튼들 (중요: md:flex) */}
            {/* 모바일(hidden) -> md 이상(flex): 로그인/내정보 버튼 보임 */}
            {isDesktop && (
              <div className="flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
                {isLoggedIn ? (
                  <>
                    <button
                      onClick={() => navigate('/mypage')}
                      className="user-profile-button flex items-center justify-center rounded-full transition-all duration-200 font-bold text-xs md:text-sm px-3 md:px-4 lg:px-6 h-9"
                    >
                      <span className="relative inline-block">
                        <span className="user-name">
                          {user?.name || '회원'} 님
                        </span>
                        <span className="mypage-text absolute inset-0 flex items-center justify-center">
                          마이페이지
                        </span>
                      </span>
                    </button>
                    {isAdmin && (
                      <Button
                        onClick={() => navigate('/admin')}
                        variant="outline"
                        className="rounded-full px-2 md:px-3 lg:px-4 text-xs md:text-sm flex items-center gap-1"
                        style={{ color: '#d32f2f', borderColor: '#d32f2f' }}
                      >
                        <ShieldAlert className="w-4 h-4" />
                        관리자
                      </Button>
                    )}
                    <Button
                      onClick={handleLogout}
                      className="rounded-full px-2 md:px-3 lg:px-4 text-xs md:text-sm flex items-center gap-1"
                      variant="outline"
                      style={{ color: '#2d5f4f', borderColor: '#2d5f4f' }}
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => navigate('/login')}
                    className="rounded-full px-3 md:px-4 lg:px-6 text-xs md:text-sm"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    로그인
                  </Button>
                )}
              </div>
            )}

            {/* 5. 햄버거 버튼 (중요: 768px 이상에서 숨김) */}
            {!isDesktop && (
              <button 
                className={`p-1 focus:outline-none transition-all duration-200 ease-in-out hover:scale-110 active:scale-95 ${isMenuOpen ? 'text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. 모바일 풀스크린 메뉴 */}
      {isMenuOpen && !isDesktop && (
        <div 
          className="mobile-menu-container fixed inset-0 z-50 overflow-y-auto pt-16"
          style={{ backgroundColor: theme === 'dark' ? '#111827' : 'white' }}
        >
          {/* 메뉴 컨텐츠 */}
          <div className="px-6 py-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.id}`)}
                className={`block w-full text-left py-4 px-4 text-lg font-semibold rounded-md transition-colors ${
                  theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
                }`}
                style={
                  location.pathname === `/${item.id}` 
                    ? { color: theme === 'dark' ? '#4ade80' : '#2d5f4f', fontWeight: 900 } 
                    : {}
                }
                onMouseEnter={(e) => {
                  if (location.pathname !== `/${item.id}`) {
                    e.currentTarget.style.color = theme === 'dark' ? '#4ade80' : '#568e67';
                  }
                }}
                onMouseLeave={(e) => {
                  if (location.pathname !== `/${item.id}`) {
                    e.currentTarget.style.color = ''; 
                  }
                }}
              >
                {item.label}
              </button>
            ))}

            <div className="border-t border-gray-200 dark:border-gray-700 my-6 pt-6 space-y-3">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => navigate('/mypage')}
                    className={`user-profile-button2 items-center justify-center py-3 w-full rounded-full transition-all duration-200 group font-bold text-base ${
                      theme === 'dark' ? 'text-white border-gray-700' : 'text-gray-900 border-gray-200'
                    }`}
                  >
                    <span className="py-2 px-4 relative">
                      <span className="user-name">
                        {user?.name || '회원'} 님
                      </span>
                      <span className="mypage-text">
                        마이페이지
                      </span>
                    </span>
                  </button>

                  {isAdmin && (
                    <Button 
                      onClick={() => navigate('/admin')} 
                      variant="outline" 
                      className="hover:bg-red-50 dark:hover:bg-red-900/20 w-full justify-start py-6 text-base font-semibold" 
                      style={{ color: '#d32f2f', borderColor: '#d32f2f' }}
                    >
                      <ShieldAlert className="w-5 h-5 mr-2" /> 관리자 페이지
                    </Button>
                  )}
                  <Button 
                    onClick={handleLogout} 
                    className="hover:scale-110 w-full justify-center py-6 text-base font-semibold dark:bg-gray-800 dark:text-white dark:border-gray-600" 
                    variant="ghost" 
                    style={{ color: '#d32f2f', backgroundColor: theme === 'dark' ? undefined : '#ffffff' }}
                  >
                    <LogOut className="w-5 h-5 mr-2" /> 로그아웃
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => navigate('/login')} 
                  className="menu-click-mobile w-full py-6 text-base font-semibold"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  로그인
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}