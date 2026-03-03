import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import { KAKAO_API_KEY } from './utils/constants';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { LoginRequiredDialog } from './components/LoginRequiredDialog';
import { ErrorModalProvider } from './components/contexts/ErrorModalContext';
import { ConfirmDialogProvider } from './components/contexts/ConfirmDialogContext';
import GlobalErrorDialog from './components/GlobalErrorDialog';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import chatBotIcon from './assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

// 페이지 컴포넌트를 lazy loading
const Home = lazy(() => import('./components/Home'));
const OffSeasonHome = lazy(() => import('./components/OffSeasonHome'));
const OffSeasonList = lazy(() => import('./components/OffSeasonList'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const PasswordReset = lazy(() => import('./components/PasswordReset'));
const PasswordResetConfirm = lazy(() => import('./components/PasswordResetConfirm'));
const StadiumGuide = lazy(() => import('./components/StadiumGuide'));
const Prediction = lazy(() => import('./components/Prediction'));
const Cheer = lazy(() => import('./components/Cheer'));
const CheerBookmarks = lazy(() => import('./components/CheerBookmarks'));
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
const UserProfile = lazy(() => import('./components/profile/UserProfile'));
const AdminPage = lazy(() => import('./components/AdminPage'));
const RankingPredictionShare = lazy(() => import('./components/RankingPredictionShare'));
const Landing = lazy(() => import('./components/Landing'));
const NoticePage = lazy(() => import('./components/NoticePage'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const OAuthCallback = lazy(() => import('./components/OAuthCallback'));
const TestError = lazy(() => import('./components/TestError')); // Test Purpose Only
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const ChatBot = lazy(() => import('./components/ChatBot'));
const PaymentSuccess = lazy(() => import('./components/PaymentSuccess'));
const PaymentFail = lazy(() => import('./components/PaymentFail'));

const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const isValidPredictionDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const PredictionQueryGuard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== '/prediction' && location.pathname !== '/prediction/') {
      return;
    }

    const search = location.search ?? '';
    const next = new URLSearchParams(search);
    let changed = false;
    const rawGameId = (next.get('gameId') || '').trim();
    if (rawGameId && !PREDICTION_GAME_ID_PATTERN.test(rawGameId)) {
      next.delete('gameId');
      changed = true;
    } else if (rawGameId && rawGameId !== next.get('gameId')) {
      next.set('gameId', rawGameId);
      changed = true;
    }

    const rawDate = (next.get('date') || '').trim();
    if (rawDate && !isValidPredictionDate(rawDate)) {
      next.delete('date');
      changed = true;
    } else if (rawDate && rawDate !== next.get('date')) {
      next.set('date', rawDate);
      changed = true;
    }

    if (!changed) {
      return;
    }

    const nextSearch = next.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate]);

  return null;
};

function ProtectedRoute() {
  const { isLoggedIn, isAuthLoading, setShowLoginRequiredDialog } = useAuthStore();

  useEffect(() => {
    if (!isAuthLoading && !isLoggedIn) {
      setShowLoginRequiredDialog(true);
    }
  }, [isAuthLoading, isLoggedIn, setShowLoginRequiredDialog]);

  if (isAuthLoading) {
    return (
      <LoadingSpinner
        variant="auth"
        message="인증 상태를 확인하고 있습니다."
        subMessage="잠시만 기다려주세요."
        minDurationMs={250}
        className="transition-colors duration-200"
      />
    );
  }

  if (!isLoggedIn) {
    return <div className="min-h-screen bg-background transition-colors duration-200" />;
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
  const [isChatBotRequested, setIsChatBotRequested] = useState(false);

  useEffect(() => {
    fetchProfileAndAuthenticate();
  }, [fetchProfileAndAuthenticate]);

  useEffect(() => {
    const handleSessionExpired = () => {
      useAuthStore.getState().logout(true);
      useAuthStore.getState().setShowLoginRequiredDialog(true);
      // Optional: Show a toast or dialog saying "Session expired"
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth-session-expired', handleSessionExpired);
  }, []);

  useEffect(() => {
    const handleInvalidAuthor = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail as { responseCode?: string } | undefined;
      if (detail?.responseCode === 'INVALID_AUTHOR') {
        useAuthStore.getState().setShowLoginRequiredDialog(true);
      }
    };

    window.addEventListener('global-api-error', handleInvalidAuthor);
    return () => window.removeEventListener('global-api-error', handleInvalidAuthor);
  }, []);

  useEffect(() => {
    if (isLoggedIn && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (window.Kakao && KAKAO_API_KEY) {
      if (!window.Kakao.isInitialized()) {
        window.Kakao.init(KAKAO_API_KEY);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
        <ErrorModalProvider>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <ScrollToTop />
            <PredictionQueryGuard />
            <Suspense
              fallback={
                <LoadingSpinner
                  variant="app"
                  message="화면을 준비하고 있습니다..."
                  subMessage="잠시만 기다려주세요."
                  minDurationMs={250}
                />
              }
            >
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
                  <Route path="/offseason" element={<OffSeasonHome selectedDate={new Date()} />} />
                  <Route path="/offseason/list" element={<OffSeasonList />} />
                  <Route path="/cheer" element={<Cheer />} />
                  <Route path="/cheer/write" element={<Cheer openComposerOnMount />} />
                  <Route path="/cheer/:postId" element={<CheerDetail />} />
                  <Route path="/profile/:handle" element={<UserProfile />} />
                  <Route path="/predictions/ranking/share/:userId/:seasonYear" element={<RankingPredictionShare />} />
                  <Route path="/notice" element={<NoticePage />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/stadium" element={<StadiumGuide />} />
                  {/* 로그인 필요한 라우트 */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/mate/:id" element={<MateDetail />} />
                    <Route path="/mate" element={<Mate />} />
                    <Route path="/prediction" element={<Prediction />} />
                    <Route path="/cheer/bookmarks" element={<CheerBookmarks />} />
                    <Route path="/cheer/edit/:postId" element={<CheerEdit />} />
                    <Route path="/mate/create" element={<MateCreate />} />
                    <Route path="/mate/:id/apply" element={<MateApply />} />
                    <Route path="/mate/:id/checkin" element={<MateCheckIn />} />
                    <Route path="/mate/:id/chat" element={<MateChat />} />
                    <Route path="/mate/:id/manage" element={<MateManage />} />
                    <Route path="/mypage" element={<MyPage />} />
                    <Route path="/mypage/:handle" element={<MyPage />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/fail" element={<PaymentFail />} />
                  </Route>

                  {/* 관리자 전용 라우트 */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>
                </Route>

                {/* Test Route */}
                <Route path="/test/error" element={<TestError />} />

                {/* 404 처리 */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            {isChatBotRequested ? (
              <Suspense fallback={null}>
                <ChatBot
                  autoOpen
                  onClosed={() => setIsChatBotRequested(false)}
                />
              </Suspense>
            ) : (
              <button
                type="button"
                onClick={() => setIsChatBotRequested(true)}
                className="fixed z-[9999] h-11 w-11
                           sm:h-14 sm:w-14 sm:min-h-[56px] sm:min-w-[56px]
                           md:h-16 md:w-16
                           rounded-full bg-primary text-white shadow-lg
                           border-none
                           inline-flex items-center justify-center overflow-hidden transition-all duration-200
                           focus:outline-none focus-visible:outline-none focus:ring-0
                           active:bg-primary active:text-white
                           touch-action-manipulation
                           bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))]
                           md:bottom-[calc(1.25rem+env(safe-area-inset-bottom))] md:right-[calc(1.25rem+env(safe-area-inset-right))]"
                aria-label="챗봇 열기"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <img
                  src={chatBotIcon}
                  alt=""
                  className="pointer-events-none block h-8 w-8 sm:h-10 sm:w-10 md:h-11 md:w-11 object-cover object-center"
                  aria-hidden="true"
                  loading="eager"
                  decoding="async"
                />
              </button>
            )}
            <GlobalErrorDialog />
            <LoginRequiredDialog
              open={useAuthStore((state) => state.showLoginRequiredDialog)}
              onOpenChange={useAuthStore((state) => state.setShowLoginRequiredDialog)}
            />
          </BrowserRouter>
        </ConfirmDialogProvider>
      </ErrorModalProvider>
    </ErrorBoundary>
  );
}
