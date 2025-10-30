import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import SignUp from './components/SignUp';
import Home from './components/Home';
import StadiumGuide from './components/StadiumGuide';
import Diary from './components/Diary';
import Prediction from './components/Prediction';
import Cheer from './components/Cheer';
import CheerWrite from './components/CheerWrite';
import CheerDetail from './components/CheerDetail';
import CheerEdit from './components/CheerEdit';
import Mate from './components/Mate';
import MateCreate from './components/MateCreate';
import MateDetail from './components/MateDetail';
import MateApply from './components/MateApply';
import MateCheckIn from './components/MateCheckIn';
import MateChat from './components/MateChat';
import MateManage from './components/MateManage';
import MyPage from './components/MyPage';
import WelcomeGuide from './components/WelcomeGuide';
import { useNavigationStore } from './store/navigationStore';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';

export default function App() {
  const currentView = useNavigationStore((state) => state.currentView);
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  
  const { email, password, showPassword, setEmail, setPassword, setShowPassword, login } = useAuthStore();
  const { showWelcome, setShowWelcome } = useUIStore();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
    login(email, password);
    setCurrentView('home');
  };

  if (currentView === 'home') {
    return (
      <>
        {showWelcome && <WelcomeGuide />}
        <Home />
      </>
    );
  }

  if (currentView === 'signup') {
    return <SignUp />;
  }

  if (currentView === 'stadium') {
    return <StadiumGuide />;
  }

  if (currentView === 'diary') {
    return <Diary />;
  }

  if (currentView === 'prediction') {
    return <Prediction />;
  }

  if (currentView === 'cheer') {
    return <Cheer />;
  }

  if (currentView === 'cheerWrite') {
    return <CheerWrite />;
  }

  if (currentView === 'cheerDetail') {
    return <CheerDetail />;
  }

  if (currentView === 'cheerEdit') {
    return <CheerEdit />;
  }

  if (currentView === 'mate') {
    return <Mate />;
  }

  if (currentView === 'mateCreate') {
    return <MateCreate />;
  }

  if (currentView === 'mateDetail') {
    return <MateDetail />;
  }

  if (currentView === 'mateApply') {
    return <MateApply />;
  }

  if (currentView === 'mateCheckIn') {
    return <MateCheckIn />;
  }

  if (currentView === 'mateChat') {
    return <MateChat />;
  }

  if (currentView === 'mateManage') {
    return <MateManage />;
  }

  if (currentView === 'mypage') {
    return <MyPage />;
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative shapes - Fixed positioning */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Top right green shape */}
        <div 
          className="fixed rounded-full opacity-90"
          style={{ 
            top: '-80px',
            right: '-160px',
            width: '600px',
            height: '400px',
            background: 'linear-gradient(135deg, #2d5f4f 0%, #3d7f5f 100%)',
            transform: 'rotate(-15deg)'
          }}
        />
        
        {/* Top left green shape */}
        <div 
          className="fixed rounded-full opacity-80"
          style={{ 
            top: '-128px',
            left: '-240px',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(45deg, #2d5f4f 0%, #4a9070 100%)',
            transform: 'rotate(25deg)'
          }}
        />
        
        {/* Bottom left green shape */}
        <div 
          className="fixed rounded-full opacity-85"
          style={{ 
            bottom: '-160px',
            left: '-160px',
            width: '550px',
            height: '450px',
            background: 'linear-gradient(90deg, #2d5f4f 0%, #3d7f5f 100%)',
            transform: 'rotate(-20deg)'
          }}
        />
        
        {/* Bottom right green shape */}
        <div 
          className="fixed rounded-full opacity-75"
          style={{ 
            bottom: '-128px',
            right: '-192px',
            width: '500px',
            height: '500px',
            background: 'linear-gradient(180deg, #3d7f5f 0%, #2d5f4f 100%)',
            transform: 'rotate(15deg)'
          }}
        />
      </div>

      {/* Grass decorations at bottom */}
      <img 
        src={grassDecor} 
        alt="" 
        className="fixed bottom-0 left-0 w-full h-32 object-cover object-top z-10 pointer-events-none"
      />

      {/* Login Card */}
      <div className="w-full max-w-5xl relative z-20">
        <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            {/* Left - Character */}
            <div className="p-12 flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#2d5f4f' }}>
              {/* Grass decoration at bottom of left panel */}
              <img 
                src={grassDecor} 
                alt="" 
                className="absolute bottom-0 left-0 w-full h-24 object-cover object-top opacity-40"
              />
              
              <div className="relative z-10 text-center">
                <img 
                  src={begaCharacter} 
                  alt="BEGA Character" 
                  className="w-72 h-auto mb-8 drop-shadow-2xl"
                />
                <h1 className="text-white mb-2 text-6xl tracking-wider" style={{ fontWeight: 900 }}>BEGA</h1>
                <p className="text-green-100 text-xl">BASEBALL GUIDE</p>
              </div>
            </div>

            {/* Right - Login Form */}
            <div className="p-12 bg-white">
              <h2 className="text-center mb-8">SIGN IN</h2>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f]"
                    style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                    placeholder="이메일을 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-gray-700">
                    <Lock className="w-4 h-4" style={{ color: '#2d5f4f' }} />
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-gray-50 border-gray-200 focus:ring-[#2d5f4f] pr-10"
                      style={{ '--tw-ring-color': '#2d5f4f' } as React.CSSProperties}
                      placeholder="비밀번호를 입력하세요"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input type="checkbox" className="rounded border-gray-300" />
                      저장
                    </label>
                    <a href="#" className="text-sm text-red-500 hover:text-red-600">
                      비밀번호를 잊으셨나요?
                    </a>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-white py-6 rounded-full hover:opacity-90"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  로그인
                </Button>

                <p className="text-center text-sm text-gray-600">
                  계정이 없으신가요?{' '}
                  <button 
                    type="button"
                    onClick={() => setCurrentView('signup')}
                    className="hover:underline" 
                    style={{ color: '#2d5f4f' }}
                  >
                    회원가입
                  </button>
                </p>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-sm text-gray-500">또는</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <Button
                  type="button"
                  className="w-full py-6 rounded-full flex items-center justify-center gap-3"
                  style={{ backgroundColor: '#FEE500', color: '#000000' }}
                  onClick={() => console.log('Kakao login clicked')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3C5.589 3 2 5.792 2 9.22c0 2.155 1.396 4.046 3.505 5.146-.15.554-.976 3.505-1.122 4.045-.174.646.237.637.501.463.21-.138 3.429-2.282 3.996-2.657.373.053.754.08 1.12.08 4.411 0 8-2.792 8-6.22C18 5.793 14.411 3 10 3z" fill="currentColor"/>
                  </svg>
                  카카오로 로그인
                </Button>

                <Button
                  type="button"
                  className="w-full py-6 rounded-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  onClick={() => console.log('Google login clicked')}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 1 1 3.42-9.25l2.58-2.58A8.76 8.76 0 1 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#4285F4"/>
                    <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 0 1-5.14-4.24l-2.99 2.31A8.76 8.76 0 0 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#34A853"/>
                    <path d="M5.14 10.02a5.26 5.26 0 0 1 0-3.36L2.15 4.35a8.76 8.76 0 0 0 0 7.98l2.99-2.31z" fill="#FBBC05"/>
                    <path d="M10.13 4.96c1.39 0 2.63.48 3.61 1.42l2.71-2.71A8.76 8.76 0 0 0 2.15 4.35l2.99 2.31a5.26 5.26 0 0 1 5.14-1.7z" fill="#EA4335"/>
                  </svg>
                  Google로 로그인
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
