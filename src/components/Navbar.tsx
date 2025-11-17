import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import React, { useEffect } from 'react'; 
import { Button } from './ui/button';
import { Bell, LogOut, ShieldAlert } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore'; 
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useNavigate, useLocation } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const LOGOUT_API_URL = `${API_BASE_URL}/auth/logout`;

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isNotificationOpen = useUIStore((state) => state.isNotificationOpen);
  const setIsNotificationOpen = useUIStore((state) => state.setIsNotificationOpen);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const fetchProfileAndAuthenticate = useAuthStore((state) => state.fetchProfileAndAuthenticate);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  useEffect(() => {
    if (!isLoggedIn) {
      fetchProfileAndAuthenticate();
    }
  }, [isLoggedIn, fetchProfileAndAuthenticate]);

  const handleLogout = async () => {
    try {
      const response = await fetch(LOGOUT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        logout();
        alert('로그아웃 되었습니다.');
        navigate('/');
      } else {
        console.error('Logout failed on server:', response.status);
        alert('로그아웃 처리 중 문제가 발생했습니다. (서버 오류)');
        logout();
        navigate('/');
      }
    } catch (error) {
      console.error('Logout network error:', error);
      alert('네트워크 오류로 로그아웃 처리에 실패했습니다. (클라이언트 측 강제 로그아웃)');
      logout();
      navigate('/');
    }
  };
  
  const navItems = [
    { id: 'home', label: '홈' },
    { id: 'cheer', label: '응원' },
    { id: 'stadium', label: '구장' },
    { id: 'prediction', label: '예측' },
    { id: 'mate', label: '메이트' }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4 lg:gap-6">
          {/* Logo */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 shrink-0"
          >
            <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
            <div>
              <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
              <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
            </div>
          </button>

          {/* Navigation - Centered */}
          <nav className="hidden md:flex flex-1 justify-center items-center gap-4 lg:gap-8 flex-wrap">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id === 'home' ? '/' : `/${item.id}`)}
                className={`${location.pathname === (item.id === 'home' ? '/' : `/${item.id}`) ? 'hover:opacity-70' : 'text-gray-700 hover:opacity-70'} whitespace-nowrap px-2 flex-shrink-0`}
                style={location.pathname === (item.id === 'home' ? '/' : `/${item.id}`) ? { color: '#2d5f4f', fontWeight: 700 } : {}}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
              <PopoverTrigger asChild>
                <button className="text-gray-600 hover:text-gray-900 relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-80 p-6 bg-gray-900 border-gray-800"
                align="end"
              >
                <p className="text-white text-center">내용 없음</p>
              </PopoverContent>
            </Popover>

            {/* 로그인 상태에 따른 버튼 조건부 렌더링 */}
            {isLoggedIn ? (
              <div className="flex items-center gap-4">
                {isAdmin && (
                  <Button
                    onClick={() => navigate('/admin')}
                    variant="outline"
                    className="rounded-full px-4 text-sm flex items-center gap-1"
                    style={{ color: '#d32f2f', borderColor: '#d32f2f' }}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    관리자
                  </Button>
                )}
                
                {/* 내 정보 버튼 */}
                <Button
                  onClick={() => navigate('/mypage')}
                  variant="outline"
                  className="rounded-full px-6 border-2 bg-white hover:bg-gray-50"
                  style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                >
                  내 정보
                </Button>
                
                {/* 사용자 이름 */}
                <span 
                  className="font-bold text-sm py-1 px-3 rounded-full"
                  style={{ color: '#2d5f4f', backgroundColor: '#e0f2f1' }}
                >
                  {user?.name || '회원'} 님 
                </span>
                
                {/* 로그아웃 버튼 */}
                <Button
                  onClick={handleLogout}
                  className="rounded-full px-4 text-sm flex items-center gap-1"
                  variant="outline"
                  style={{ color: '#2d5f4f', borderColor: '#2d5f4f' }}
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => navigate('/login')}
                className="rounded-full px-6"
                style={{ backgroundColor: '#2d5f4f' }}
              >
                로그인
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}