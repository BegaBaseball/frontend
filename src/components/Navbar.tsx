import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import React, { useEffect, useState } from 'react'; 
import { Button } from './ui/button';
import { Bell, LogOut, ShieldAlert, Menu, X } from 'lucide-react'; 
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore'; 
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const LOGOUT_API_URL = `${API_BASE_URL}/auth/logout`;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isNotificationOpen = useUIStore((state) => state.isNotificationOpen);
  const setIsNotificationOpen = useUIStore((state) => state.setIsNotificationOpen);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  // 페이지 이동 시 모바일 메뉴 닫기
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // 화면 크기 감지
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { 
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      navigate('/');
      if (!response.ok) console.error('Server logout failed');
      // else alert('로그아웃 되었습니다.');
    } catch (error) {
      logout();
      navigate('/');
    }
  };
  
  const navItems = [
    { id: 'cheer', label: '응원' },
    { id: 'stadium', label: '구장' },
    { id: 'prediction', label: '예측' },
    { id: 'mate', label: '메이트' }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* 1. 로고 */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 shrink-0"
          >
            <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
            <div>
              <h1 className="tracking-wider text-xl" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
              <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
            </div>
          </button>

          {/* 2. 데스크톱 네비게이션 (중요: md:flex) */}
          {/* 모바일(hidden) -> md 이상(flex): 상단 메뉴가 보임 */}
          <nav className="hidden md:flex flex-1 justify-center items-center gap-2 md:gap-3 lg:gap-6 xl:gap-8 flex-wrap">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.id}`)}
                className={`${location.pathname === `/${item.id}` ? 'hover:opacity-70' : 'text-gray-700 hover:opacity-70'} whitespace-nowrap px-2 flex-shrink-0`}
                style={location.pathname === `/${item.id}` ? { color: '#2d5f4f', fontWeight: 700 } : {}}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* 3. 우측 아이콘 및 메뉴 영역 */}
          <div className="flex items-center gap-3 shrink-0">
            
            {/* 알림 버튼 (항상 보임) */}
            <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <PopoverTrigger asChild>
                <button className="text-gray-600 hover:text-gray-900 relative p-1">
                  <Bell className="w-6 h-6" />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-6 bg-gray-900 border-gray-800" align="end">
                <p className="text-white text-center">내용 없음</p>
              </PopoverContent>
            </Popover>

            {/* 4. 데스크톱 유저 버튼들 (중요: md:flex) */}
            {/* 모바일(hidden) -> md 이상(flex): 로그인/내정보 버튼 보임 */}
            <div className="hidden md:flex items-center gap-1 md:gap-2 lg:gap-3 xl:gap-4">
              {isLoggedIn ? (
                <>
                  <span 
                    className="font-bold text-xs md:text-sm py-1 px-2 md:px-3 rounded-full"
                    style={{ color: '#2d5f4f', backgroundColor: '#e0f2f1' }}
                  >
                    {user?.name || '회원'} 님 
                  </span>
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
                    onClick={() => navigate('/mypage')}
                    variant="outline"
                    className="rounded-full px-3 md:px-4 lg:px-6 border-2 bg-white hover:bg-gray-50 text-xs md:text-sm"
                    style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                  >
                    내 정보
                  </Button>
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

            {/* 5. 햄버거 버튼 (중요: 768px 이상에서 숨김) */}
            <button 
              className="hamburger-menu-btn p-1 text-gray-600 hover:text-gray-900 focus:outline-none"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* 6. 모바일 팝업 메뉴 (중요: md:hidden) */}
      {/* 드롭다운 메뉴 (오버레이 없이) */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-16 right-4 z-50">
            <div className="bg-white rounded-lg shadow-2xl mobile-menu-popup max-h-[85vh] overflow-hidden">
              {/* 팝업 헤더 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200" style={{ backgroundColor: '#2d5f4f' }}>
                <h2 className="text-white font-bold text-lg">BEGA 메뉴</h2>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="px-6 pt-4 pb-6 space-y-2 flex flex-col overflow-y-auto max-h-[70vh]">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(`/${item.id}`)}
                className={`block w-full text-left py-3 px-2 text-base font-medium rounded-md ${
                  location.pathname === `/${item.id}` 
                    ? 'bg-green-50 text-[#2d5f4f]' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                style={location.pathname === `/${item.id}` ? { color: '#2d5f4f', fontWeight: 700 } : {}}
              >
                {item.label}
              </button>
            ))}

            <div className="border-t border-gray-100 my-2 pt-2 space-y-2">
              {isLoggedIn ? (
                <>
                  <div className="flex items-center justify-center px-2 py-2">
                    <span 
                      className="font-bold text-sm py-1 px-3 rounded-full"
                      style={{ color: '#2d5f4f', backgroundColor: '#e0f2f1' }}
                    >
                      {user?.name || '회원'} 님
                    </span>
                  </div>
                  {isAdmin && (
                    <Button onClick={() => navigate('/admin')} variant="outline" className="w-full justify-start" style={{ color: '#d32f2f', borderColor: '#d32f2f' }}>
                      <ShieldAlert className="w-4 h-4 mr-2" /> 관리자
                    </Button>
                  )}
                  <Button onClick={() => navigate('/mypage')} variant="outline" className="w-full justify-start" style={{ color: '#2d5f4f', borderColor: '#2d5f4f' }}>
                    내 정보
                  </Button>
                  <Button onClick={handleLogout} className="w-full justify-start" variant="ghost" style={{ color: '#d32f2f' }}>
                    <LogOut className="w-4 h-4 mr-2" /> 로그아웃
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate('/login')} className="w-full" style={{ backgroundColor: '#2d5f4f' }}>
                  로그인
                </Button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}