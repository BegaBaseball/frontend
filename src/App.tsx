import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import ChatBot from './components/ChatBot';
import { LoginRequiredDialog } from './components/LoginRequiredDialog';
import { ErrorModalProvider } from './components/contexts/ErrorModalContext';
import GlobalErrorDialog from './components/GlobalErrorDialog';

// 페이지 컴포넌트를 lazy loading
const Home = lazy(() => import('./components/Home'));
const OffSeasonHome = lazy(() => import('./components/OffSeasonHome'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const PasswordReset = lazy(() => import('./components/PasswordReset'));
const PasswordResetConfirm = lazy(() => import('./components/PasswordResetConfirm'));
const StadiumGuide = lazy(() => import('./components/StadiumGuide'));
const Prediction = lazy(() => import('./components/Prediction'));
const Cheer = lazy(() => import('./components/Cheer'));
const CheerWrite = lazy(() => import('./components/CheerWrite'));
const CheerDetail = lazy(() => import('./components/CheerDetail'));
const CheerEdit = lazy(() => import('./components/CheerEdit'));
const Mate = lazy(() => import('./components/Mate'));
const MateCreate = lazy(() => import('./components/MateCreate'));
const MateDetail = lazy(() => import('./components/MateDetail'));
const MateApply = lazy(() => import('./components/MateApply'));
const MateCheckIn = lazy(() => import('./components/MateCheckIn'));
const MateChat = lazy(() => import('./components/MateChat'));
const MateManage = lazy(() => import('./components/MateManage'));
const MyPage = lazy(() => import('./components/MyPage'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const RankingPredictionShare = lazy(() => import('./components/RankingPredictionShare'));
const Landing = lazy(() => import('./components/Landing'));
const NoticePage = lazy(() => import('./components/NoticePage'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const OAuthCallback = lazy(() => import('./components/OAuthCallback')); 

function ProtectedRoute() {
  const { isLoggedIn, showLoginRequiredDialog, setShowLoginRequiredDialog } = useAuthStore();
  
  useEffect(() => {
    if (!isLoggedIn) {
      setShowLoginRequiredDialog(true);
    }
  }, [isLoggedIn, setShowLoginRequiredDialog]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-white">
        <LoginRequiredDialog
          open={showLoginRequiredDialog}
          onOpenChange={setShowLoginRequiredDialog}
        />
      </div>
    );
  }
  
  return <Outlet />;
}

function AdminRoute() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const isAdmin = useAuthStore((state) => state.isAdmin);
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />;
}

export default function App() {
  const fetchProfileAndAuthenticate = useAuthStore((state) => state.fetchProfileAndAuthenticate);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);

  useEffect(() => {
    fetchProfileAndAuthenticate();
  }, [fetchProfileAndAuthenticate]);

  useEffect(() => {
    if (isLoggedIn && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const KAKAO_KEY = import.meta.env.VITE_KAKAO_API_KEY;

    if (window.Kakao && KAKAO_KEY) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_KEY);
      }
    }
  }, []);

  return (
    <ErrorModalProvider>
      <BrowserRouter>
        {/* <Suspense fallback={<LoadingSpinner />}> */}
          <Routes>
            {/* 공개 라우트 - 로그인 필요 없음 */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/password/reset" element={<PasswordReset />} />
            <Route path="/password/reset/confirm" element={<PasswordResetConfirm />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />

            {/* Landing & ServiceInfo - Layout 없이 독립 페이지 */}
            <Route path="/" element={<Landing />} />
            {/* Layout 포함 라우트 */}
            <Route element={<Layout />}>
              {/* 홈과 몇몇 페이지는 로그인 없이도 접근 가능 */}
              <Route path="/home" element={<Home />} />
              <Route path="/offseason" element={<OffSeasonHome selectedDate={new Date()}/>} />
              <Route path="/cheer" element={<Cheer />} />
              <Route path="/cheer/detail/:postId" element={<CheerDetail />} />
              <Route path="/predictions/ranking/share/:userId/:seasonYear" element={<RankingPredictionShare />} />
              <Route path="/notice" element={<NoticePage />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              {/* 로그인 필요한 라우트 */}
              <Route element={<ProtectedRoute />}>
                <Route path="/mate/:id" element={<MateDetail />} />
                <Route path="/mate" element={<Mate />} />
                <Route path="/prediction" element={<Prediction />} />
                <Route path="/stadium" element={<StadiumGuide />} />
                <Route path="/cheer/write" element={<CheerWrite />} />
                <Route path="/cheer/edit/:postId" element={<CheerEdit />} />
                <Route path="/mate/create" element={<MateCreate />} />
                <Route path="/mate/:id/apply" element={<MateApply />} />  
                <Route path="/mate/:id/checkin" element={<MateCheckIn />} /> 
                <Route path="/mate/:id/chat" element={<MateChat />} />  
                <Route path="/mate/:id/manage" element={<MateManage />} /> 
                <Route path="/mypage" element={<MyPage />} />
              </Route>
              
              {/* 관리자 전용 라우트 */}
              <Route element={<AdminRoute />}>
                <Route path="/admin" element={<AdminPage />} />
              </Route>
            </Route>
            
            {/* 404 처리 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        {/* </Suspense> */}
        <ChatBot />
        <GlobalErrorDialog />
      </BrowserRouter>
    </ErrorModalProvider>
  );
}