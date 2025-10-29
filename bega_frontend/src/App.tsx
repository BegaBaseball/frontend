import begaCharacter from 'figma:asset/27f7b8ac0aacea2470847e809062c7bbf0e4163f.png';
import grassDecor from 'figma:asset/3aa01761d11828a81213baa8e622fec91540199d.png';
import { useState , useCallback } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams, NavigateFunction } from 'react-router-dom';
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
import MyPage from './components/MyPage';
import { ViewName } from './types';

const createNavigationHandler = (navigate: NavigateFunction) => (view: ViewName, postId?: string) => {
  switch (view) {
    case 'home':
      navigate('/');
      break;
    case 'login':
      navigate('/login');
      break;
    case 'signup':
      navigate('/signup');
      break;
    case 'stadium':
      navigate('/stadium');
      break;
    case 'diary':
      navigate('/diary');
      break;
    case 'prediction':
      navigate('/prediction');
      break;
    case 'cheer':
      navigate('/posts');
      break;
    case 'cheerWrite':
      navigate('/posts/new');
      break;
    case 'cheerDetail':
      navigate(`/posts/${postId ?? '1'}`);
      break;
    case 'cheerEdit':
      navigate(`/posts/${postId ?? '1'}/edit`);
      break;
    case 'mypage':
      navigate('/mypage');
      break;
  }
};

// 각 페이지 컴포넌트들
function HomePage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <Home onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function CheerPage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <Cheer onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function CheerWritePage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <CheerWrite onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function CheerDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const handleNavigate = createNavigationHandler(navigate);
  return <CheerDetail onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} postId={id} />;
}

function CheerEditPage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <CheerEdit onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function StadiumPage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <StadiumGuide onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function DiaryPage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <Diary onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function PredictionPage() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <Prediction onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

function MyPageComponent() {
  const navigate = useNavigate();
  const handleNavigate = createNavigationHandler(navigate);
  return <MyPage onNavigateToLogin={() => navigate('/login')} onNavigate={handleNavigate} />;
}

// 로그인 페이지 컴포넌트
function LoginPage() {
  const navigate = useNavigate();
const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');



    const handleLogin = useCallback(async (e) => { // e는 React.FormEvent 타입으로 사용 가능
        // 폼 제출 기본 동작 방지
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
        }
        
        setError('');
        setIsLoading(true);

        // TODO: 실제 환경에서는 이 URL을 환경 변수로 설정해야 합니다.
        const backendUrl = 'http://localhost:8080/api/auth/login'; 

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // HttpOnly 쿠키를 포함하여 서버에 전송하도록 설정 (인증에 필수)
                credentials: 'include',
                // --- 요청 본문: UserDto에 정의된 email, password 필드만 사용 ---
                body: JSON.stringify({ email, password }),
                // -----------------------------------------------------------------
            });

            // HTTP 상태 코드가 2xx가 아닌 경우 에러 처리
            if (!response.ok) {
                let errorMessage = '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.';
                
                try {
                    // 응답 본문에서 에러 메시지 추출 시도
                    const errorData = await response.json();
                    // 서버 응답 구조에 따라 필드명 (message, error 등)을 조정해야 합니다.
                    errorMessage = errorData.message || errorData.error || errorMessage;
                } catch (jsonError) {
                    // 응답이 JSON 형식이 아닐 경우
                    if (response.status === 401) {
                        errorMessage = '인증 정보가 올바르지 않습니다.';
                    } else {
                        errorMessage = `서버 오류: ${response.status} (${response.statusText})`;
                    }
                }
                
                // 에러를 던져 catch 블록으로 이동
                throw new Error(errorMessage);
            }

            // 성공 시 처리 (JWT 토큰은 HttpOnly 쿠키에 의해 브라우저에 자동 저장됨)
            const data = await response.json();
            
            // 1. JWT Token Handling: HttpOnly 쿠키를 사용하므로 클라이언트 측 토큰 저장 로직 제거
            // const token = data.accessToken; // 토큰 필드는 이제 무시
            // if (token) { localStorage.setItem('authToken', token); } ... (제거)

            // 2. User Info Handling
            // 서버 응답의 'username' 필드만 사용합니다.
            const userDisplayName = data.name || data.email; 
            
            if (userDisplayName) {
                // setUsername(userDisplayName); // 상태 업데이트
                console.log('로그인 응답에 사용자 이름(또는 이메일) 포함:', userDisplayName);
                // localStorage.removeItem('username'); // 로컬 스토리지 저장 로직 제거
            } else {
                console.warn('경고: 로그인 응답에 username 필드가 포함되어 있지 않습니다.');
            }

            // 3. UI Update 및 리다이렉션
            const finalDisplayName = userDisplayName || '사용자'; 
            setIsLoggedIn(true); // 로그인 성공 처리 (UI 상태만 업데이트)
            console.log('로그인 성공! ' + finalDisplayName + '님 환영합니다. 메인 페이지로 이동합니다.'); 

            // React Router를 사용하여 메인 페이지로 이동하며 사용자 정보를 state로 전달
            navigate('/', {
                state: { userDisplayName: finalDisplayName },
                replace: true // 뒤로가기 방지
            });


        } catch (err) {
            // API 호출 또는 응답 처리 중 발생한 모든 에러 처리
            setError((err as Error).message || '네트워크 오류로 로그인에 실패했습니다.');
            console.error('Login Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [email, password, navigate]); // navigate를 dependency에 추가

    // --- 로그아웃 로직 (선택 사항) ---
    const handleLogout = useCallback(() => {
        // HttpOnly 쿠키를 사용하더라도 클라이언트 측에서 상태 초기화 및 잔여 로컬 저장소 정리
        localStorage.removeItem('authToken'); 
        localStorage.removeItem('username');
        setIsLoggedIn(false);
        setEmail('');
        setPassword('');
        setError('');
        console.log('로그아웃 되었습니다.');
    }, []);


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
                      Remember me
                    </label>
                    <a href="#" className="text-sm text-red-500 hover:text-red-600">
                      Forgot Password?
                    </a>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full text-white py-6 rounded-full hover:opacity-90"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  LOGIN
                </Button>

                <p className="text-center text-sm text-gray-600">
                  계정이 없으신가요?{' '}
                  <button 
                    type="button"
                    onClick={() => navigate('/signup')}
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
                
                {/* 🚨 수정: <Button> 대신 <a> 태그 사용 */}
                <a
                  href="http://localhost:8080/oauth2/authorization/kakao"
                  // Button 컴포넌트의 스타일 클래스를 그대로 적용하여 UI 유지
                  className="w-full py-6 rounded-full flex items-center justify-center gap-3 text-sm font-medium ring-offset-background transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#FEE500', color: '#000000' }}
                  // onClick 이벤트는 제거합니다. 브라우저가 직접 URL로 이동해야 합니다.
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3C5.589 3 2 5.792 2 9.22c0 2.155 1.396 4.046 3.505 5.146-.15.554-.976 3.505-1.122 4.045-.174.646.237.637.501.463.21-.138 3.429-2.282 3.996-2.657.373.053.754.08 1.12.08 4.411 0 8-2.792 8-6.22C18 5.793 14.411 3 10 3z" fill="currentColor"/>
                  </svg>
                  카카오로 로그인
                </a>

                {/* 🚨 수정: <Button> 대신 <a> 태그 사용 */}
                <a
                  href="http://localhost:8080/oauth2/authorization/google"
                  // Button 컴포넌트의 스타일 클래스를 그대로 적용하여 UI 유지
                  className="w-full py-6 rounded-full flex items-center justify-center gap-3 text-sm font-medium ring-offset-background transition-colors bg-white border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:opacity-90"
                  // onClick 이벤트 제거
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 1 1 3.42-9.25l2.58-2.58A8.76 8.76 0 1 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#4285F4"/>
                    <path d="M18.17 8.36h-8.04v3.45h4.62c-.39 2.11-2.26 3.45-4.62 3.45a5.26 5.26 0 0 1-5.14-4.24l-2.99 2.31A8.76 8.76 0 0 0 10.13 18.7c4.35 0 8.23-3.02 8.04-10.34z" fill="#34A853"/>
                    <path d="M5.14 10.02a5.26 5.26 0 0 1 0-3.36L2.15 4.35a8.76 8.76 0 0 0 0 7.98l2.99-2.31z" fill="#FBBC05"/>
                    <path d="M10.13 4.96c1.39 0 2.63.48 3.61 1.42l2.71-2.71A8.76 8.76 0 0 0 2.15 4.35l2.99 2.31a5.26 5.26 0 0 1 5.14-1.7z" fill="#EA4335"/>
                  </svg>
                  Google로 로그인
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignUpPage() {
  const navigate = useNavigate();
  return <SignUp onBackToLogin={() => navigate('/login')} />;
}

// 메인 App 컴포넌트
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/stadium" element={<StadiumPage />} />
        <Route path="/diary" element={<DiaryPage />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/posts" element={<CheerPage />} />
        <Route path="/posts/new" element={<CheerWritePage />} />
        <Route path="/posts/:id" element={<CheerDetailPage />} />
        <Route path="/posts/:id/edit" element={<CheerEditPage />} />
        <Route path="/mypage" element={<MyPageComponent />} />
      </Routes>
    </BrowserRouter>
  );
}