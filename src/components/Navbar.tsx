import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Bell, LogOut, ShieldAlert, Menu, X, Moon, Sun, MessageSquare, Map, Trophy, Users, Megaphone, LineChart } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import NotificationPanel from './NotificationPanel';
import { motion } from 'framer-motion';

import { useMediaQuery } from '../hooks/useMediaQuery';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const LOGOUT_API_URL = `${API_BASE_URL}/auth/logout`;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

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
    { id: 'cheer', label: '응원석', icon: Megaphone },
    { id: 'stadium', label: '구장가이드', icon: Map },
    { id: 'prediction', label: '전력분석실', icon: LineChart },
    { id: 'mate', label: '같이가요', icon: Users }
  ];

  return (
    <header
      className={`border-b border-gray-200 dark:border-gray-700 sticky top-0 z-[60] transition-colors duration-300 ${isMenuOpen ? 'bg-background' : 'bg-background/80 backdrop-blur-md'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* 1. 로고: 브랜드 컬러 일관성 유지 및 계층 구조 적용 */}
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-3 shrink-0 group"
          >
            <img
              src={baseballLogo}
              alt="Baseball"
              className="w-10 h-10 transition-transform duration-300 group-hover:rotate-12"
            />
            <div className="flex flex-col items-start">
              <h1 className="font-black text-xl tracking-widest text-primary dark:text-[#4ade80] leading-none">
                BEGA
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground tracking-tight">
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
                    key={item.id}
                    onClick={() => navigate(`/${item.id}`)}
                    className={`
                      relative px-1 py-1 text-sm lg:text-base font-bold transition-all duration-200
                      ${location.pathname === `/${item.id}`
                        ? 'text-primary dark:text-[#4ade80]'
                        : 'text-muted-foreground hover:text-primary dark:hover:text-[#4ade80]'
                      }
                    `}
                  >
                    {item.label}
                    {/* 선택된 메뉴 아래에 작은 점 표시 */}
                    {location.pathname === `/${item.id}` && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary dark:bg-[#4ade80]" />
                    )}
                  </button>
                ))}
              </div>
            </nav>
          )}

          {/* 3. 우측 아이콘 및 메뉴 영역 */}
          <div className="flex items-center gap-3 shrink-0">

            {/* 테마 토글 버튼 - 모바일 메뉴 열렸을 때 숨김 */}
            {!(isMenuOpen && !isDesktop) && (
              <button
                onClick={toggleTheme}
                className="p-1 transition-colors text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
              </button>
            )}

            {/* 알림 버튼 - 모바일 메뉴 열렸을 때 숨김 */}
            {!(isMenuOpen && !isDesktop) && (
              <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="relative p-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <motion.div
                      animate={unreadCount > 0 ? {
                        rotate: [0, -15, 12, -10, 5, 0],
                      } : { rotate: 0 }}
                      transition={{
                        duration: 1.5,
                        repeat: unreadCount > 0 ? Infinity : 0,
                        repeatDelay: 3,
                        ease: "easeInOut"
                      }}
                    >
                      <Bell className={`w-6 h-6 ${unreadCount > 0 ? 'text-primary dark:text-[#4ade80]' : ''}`} />
                    </motion.div>

                    {/* 개선된 알림 배지 */}
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4">
                        {/* 1. 핑(Ping) 애니메이션: 새 알림이 있음을 생동감 있게 표현 */}
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>

                        {/* 2. 실제 배지: 배경색과 분리되는 테두리(ring) 추가 */}
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 ring-2 ring-background items-center justify-center">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        </span>
                      </span>
                    )}
                  </button>
                </PopoverTrigger>

                <PopoverContent
                  className="w-auto p-0 border-none shadow-none bg-transparent"
                  align="end"
                  sideOffset={8}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0.2 }}
                    className="
                      w-[calc(100vw-32px)] mr-4 
                      sm:w-96 sm:mr-0
                      overflow-hidden rounded-xl
                      bg-white dark:bg-gray-800 
                      border border-gray-200 dark:border-gray-700 
                      shadow-xl
                    "
                  >
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                      <h3 className="font-bold text-sm text-primary dark:text-[#4ade80]">
                        알림
                      </h3>
                      {unreadCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {unreadCount}개의 읽지 않은 알림
                        </span>
                      )}
                    </div>
                    {/* 최대 높이 제한 및 스크롤 추가 */}
                    <div className="max-h-[60vh] overflow-y-auto">
                      <NotificationPanel />
                    </div>
                  </motion.div>
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
                      onClick={() => navigate(user?.handle ? `/mypage/${user.handle.startsWith('@') ? user.handle : `@${user.handle}`}` : '/mypage')}
                      className="group relative overflow-hidden flex items-center justify-center w-[115px] h-9 rounded-full border border-primary text-primary dark:border-[#4ade80] dark:text-[#4ade80] font-bold text-xs transition-all duration-300 hover:bg-primary hover:text-white dark:hover:bg-[#4ade80] dark:hover:text-[#064e3b]"
                    >                                                      {/* 1. 닉네임: 평소 중앙, 호버 시 위로 사라짐 */}
                      <span className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out group-hover:-translate-y-full group-hover:opacity-0">
                        {user?.name || '회원'} 님
                      </span>

                      {/* 2. 프로필: 평소 아래, 호버 시 중앙으로 올라옴 */}
                      <span className="absolute inset-0 flex items-center justify-center translate-y-full opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-0 group-hover:opacity-100">
                        마이페이지
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
                    className="rounded-full px-3 md:px-4 lg:px-6 text-xs md:text-sm text-white"
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
                className={`p-2 focus:outline-none transition-all duration-200 ease-in-out hover:scale-110 active:scale-95 ${isMenuOpen
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                  }`}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={isMenuOpen}
              >
                {isMenuOpen ? <X className="w-7 h-7 stroke-[2.5]" /> : <Menu className="w-7 h-7" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 6. 모바일 풀스크린 메뉴 */}
      {isMenuOpen && !isDesktop && (
        <div
          className="mobile-menu-container fixed top-16 left-0 right-0 bottom-0 z-50 overflow-y-auto"
          style={{ backgroundColor: theme === 'dark' ? '#111827' : 'white' }}
        >
          {/* 네비게이션 섹션 */}
          <div className="px-6 py-6">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-4">
              메뉴
            </p>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === `/${item.id}`;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/${item.id}`)}
                    className={`flex items-center gap-4 w-full text-left py-4 px-4 text-lg font-semibold rounded-xl transition-all duration-200 ${isActive
                      ? theme === 'dark'
                        ? 'bg-[#4ade80]/10 text-[#4ade80]'
                        : 'bg-[#2d5f4f]/10 text-[#2d5f4f]'
                      : theme === 'dark'
                        ? 'text-gray-200 hover:bg-gray-800'
                        : 'text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? '' : 'text-gray-400'}`} />
                    <span>{item.label}</span>
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
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-4">
              계정
            </p>
            {isLoggedIn ? (
              <div className="space-y-2">
                {/* 프로필 카드 */}
                <button
                  onClick={() => navigate(user?.handle ? `/mypage/${user.handle.startsWith('@') ? user.handle : `@${user.handle}`}` : '/mypage')}
                  className={`flex items-center gap-4 w-full py-4 px-4 rounded-xl transition-all duration-200 ${theme === 'dark'
                    ? 'bg-gray-800 hover:bg-gray-700'
                    : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  aria-label="프로필로 이동"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${theme === 'dark' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'bg-[#2d5f4f]/10 text-[#2d5f4f]'
                    }`}>
                    {user?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold text-base ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {user?.name || '회원'} 님
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      내 프로필 보기 →
                    </p>
                  </div>
                </button>

                {/* 관리자 버튼 - ADMIN 태그 스타일 */}
                {isAdmin && (
                  <button
                    onClick={() => navigate('/admin')}
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
                  onClick={handleLogout}
                  className="flex items-center justify-center gap-2 w-full py-4 px-4 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-semibold"
                  aria-label="로그아웃"
                >
                  <LogOut className="w-5 h-5" />
                  <span>로그아웃</span>
                </button>
              </div>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="w-full py-6 text-base font-semibold text-white rounded-xl"
                style={{ backgroundColor: '#2d5f4f' }}
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