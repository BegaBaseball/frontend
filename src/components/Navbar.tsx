import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import React, { useEffect } from 'react'; 
import { Button } from './ui/button';
import { Bell, User, LogOut, ShieldAlert } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { ViewType } from '../store/navigationStore';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore'; 
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const LOGOUT_API_URL = '/api/auth/logout'; 

interface NavbarProps {
  currentPage: 'home' | 'cheer' | 'stadium' | 'prediction' | 'mate' | 'mypage';
}

export default function Navbar({ currentPage }: NavbarProps) {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { isNotificationOpen, setIsNotificationOpen } = useUIStore();
  const { isLoggedIn, user, logout, fetchProfileAndAuthenticate, isAdmin } = useAuthStore();

   // 컴포넌트 마운트 시 인증 상태를 확인 (쿠키 존재 여부)
  useEffect(() => {
    fetchProfileAndAuthenticate();
}, [fetchProfileAndAuthenticate]);

 const handleLogout = async () => {
    try {
      const response = await fetch(LOGOUT_API_URL, {
        method: 'POST', // POST 또는 DELETE를 사용 (GET은 권장되지 않음)
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키를 요청에 포함
      });

      // 백엔드가 쿠키를 삭제하거나 만료시켰다고 가정
      if (response.ok) {
        // 프론트엔드 상태 초기화
        logout();
        alert('로그아웃 되었습니다.');
        setCurrentView('home'); // 홈 화면으로 리디렉션
      } else {
        // 서버에서 쿠키 삭제 실패 (400, 500 등)
        console.error('Logout failed on server:', response.status);
        alert('로그아웃 처리 중 문제가 발생했습니다. (서버 오류)');
        // 강제로 상태는 초기화
        logout();
        setCurrentView('home');
      }
    } catch (error) {
      console.error('Logout network error:', error);
      alert('네트워크 오류로 로그아웃 처리에 실패했습니다. (클라이언트 측 강제 로그아웃)');
      logout();
      setCurrentView('home');
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
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => setCurrentView('home')} className="flex items-center gap-3">
            <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
            <div>
              <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
              <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
            </div>
          </button>

          {/* Navigation - Centered */}
          <nav className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewType)}
                className={currentPage === item.id ? 'hover:opacity-70' : 'text-gray-700 hover:opacity-70'}
                style={currentPage === item.id ? { color: '#2d5f4f', fontWeight: 700 } : {}}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
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
              // 닉네임과 로그아웃 버튼 표시
              <div className="flex items-center gap-4">
                {/* ⬇️ 관리자(Admin)일 경우에만 이 버튼이 보이도록 추가 */}
              {isAdmin && (
                <Button
                  onClick={() => setCurrentView('admin')}
                  variant="outline"
                  className="rounded-full px-4 text-sm flex items-center gap-1"
                  style={{ color: '#d32f2f', borderColor: '#d32f2f' }} // 관리자 버튼 (빨간색)
                >
                  <ShieldAlert className="w-4 h-4" />
                  관리자
                </Button>
              )}
              <Button
                  onClick={() => setCurrentView('mypage')}
                  variant="outline"
                  className="rounded-full px-6 border-2 bg-white hover:bg-gray-50"
                  style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                >
                  내 정보
                </Button>
              
                
                <span 
                  className="font-bold cursor-pointer text-sm py-1 px-3 rounded-full"
                  style={{ color: '#2d5f4f', backgroundColor: '#e0f2f1' }}
                 // onClick={() => setCurrentView('mypage')}
                >
                  {user?.name || '회원'} 님 
                </span>
                <Button
                  onClick={handleLogout} // 로그아웃 함수
                  className="rounded-full px-4 text-sm flex items-center gap-1"
                  variant="outline"
                  style={{ color: '#2d5f4f', borderColor: '#2d5f4f' }}
                >
                  <LogOut className="w-4 h-4" />
                  로그아웃
                </Button>
              </div>
            ) : (
              // 로그인 버튼 표시
              <Button
                onClick={() => setCurrentView('login')}
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
