import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { Button } from './ui/button';
import { Bell, User } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';
import { ViewType } from '../store/navigationStore';

interface NavbarProps {
  currentPage: 'home' | 'cheer' | 'stadium' | 'prediction' | 'diary' | 'mate' | 'mypage';
}

export default function Navbar({ currentPage }: NavbarProps) {
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  
  const navItems = [
    { id: 'home', label: '홈' },
    { id: 'cheer', label: '응원' },
    { id: 'stadium', label: '구장' },
    { id: 'prediction', label: '예측' },
    { id: 'mate', label: '메이트' },
    { id: 'diary', label: '다이어리' }
  ];

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={() => setCurrentView('home')} className="flex items-center gap-3">
            <img src={baseballLogo} alt="Baseball" className="w-10 h-10" />
            <div>
              <h1 className="tracking-wider" style={{ fontWeight: 900, color: '#2d5f4f' }}>BEGA</h1>
              <p className="text-xs" style={{ color: '#2d5f4f' }}>BASEBALL GUIDE</p>
            </div>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
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
            <button className="text-gray-600 hover:text-gray-900 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={() => setCurrentView('mypage')}
              className="text-gray-600 hover:text-gray-900"
            >
              <User className="w-5 h-5" />
            </button>
            <Button
              onClick={() => setCurrentView('login')}
              className="rounded-full px-6"
              style={{ backgroundColor: '#2d5f4f' }}
            >
              로그인
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
