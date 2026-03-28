import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef } from 'react';
import {
  isAdminRole,
  useAuthAccessActions,
  useAuthDialogState,
  useAuthProfileActions,
  useAuthProfileSnapshot,
  useAuthRedirectState,
  useAuthSession,
  useAuthStore,
} from './store/authStore';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import { ErrorModalProvider } from './components/contexts/ErrorModalContext';
import { ConfirmDialogProvider } from './components/contexts/ConfirmDialogContext';
import GlobalErrorDialog from './components/GlobalErrorDialog';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/common/ErrorBoundary';
import { installGlobalErrorListeners, setClientErrorReporterUserContext } from './utils/clientErrorReporter';
import { hasPersistedAuthBootstrapHint, resolveAuthBootstrapMode } from './utils/authBootstrap';
import { buildLoginPath } from './utils/loginRedirect';

// DEV-only chaos hook: ErrorBoundary를 테스트하기 위한 의도적 렌더링 에러
// import.meta.env.DEV 조건으로 프로덕션 번들에 포함되지 않음
function ChaosRenderError() {
  if (new URLSearchParams(window.location.search).get('chaos') === 'render-error') {
    throw new Error('chaos-test-render-error');
  }
  return null;
}

// 페이지 컴포넌트를 lazy loading
const Home = lazy(() => import('./components/Home'));
const OffSeasonHome = lazy(() => import('./components/OffSeasonHome'));
const OffSeasonList = lazy(() => import('./components/OffSeasonList'));
const Login = lazy(() => import('./components/Login'));
const SignUp = lazy(() => import('./components/SignUp'));
const PasswordReset = lazy(() => import('./components/PasswordReset'));
const PasswordResetConfirm = lazy(() => import('./components/PasswordResetConfirm'));
const AccountDeletionRecovery = lazy(() => import('./components/AccountDeletionRecovery'));
const LoginRequiredDialog = lazy(() =>
  import('./components/LoginRequiredDialog').then((module) => ({
    default: module.LoginRequiredDialog,
  }))
);
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
const NotFound = lazy(() => import('./components/NotFound'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));

const PREDICTION_GAME_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const isLoadTraceEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('traceLoad') === '1';
};

const traceLoadEvent = (label: string) => {
  if (!isLoadTraceEnabled()) {
    return;
  }

  const now = performance.now().toFixed(2);
  performance.mark(`load-order:${label}`);
  console.info(`[load-order][${now}ms] ${label}`);
};

const isAuthTraceEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  return import.meta.env.DEV || new URLSearchParams(window.location.search).get('traceAuth') === '1';
};

const traceAuthEvent = (label: string) => {
  if (!isAuthTraceEnabled()) {
    return;
  }

  const now = performance.now().toFixed(2);
  console.debug(`[auth-trace][${now}ms] ${label}`);
};

const describeAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
};

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

const AuthBootstrap = () => {
  const location = useLocation();
  const bootstrapPendingRef = useRef(true);
  const { fetchProfileAndAuthenticate } = useAuthProfileActions();
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const authBootstrapMode = resolveAuthBootstrapMode(location.pathname, {
    isLoggedIn,
    hasPersistedAuthHint: hasPersistedAuthBootstrapHint(),
  });

  useEffect(() => {
    traceAuthEvent(
      `AuthBootstrap: pathname=${location.pathname}, mode=${authBootstrapMode}, isLoggedIn=${isLoggedIn}, isAuthLoading=${isAuthLoading}`,
    );

    if (authBootstrapMode === 'skip' || authBootstrapMode === 'public-home') {
      traceAuthEvent(`AuthBootstrap: path ${location.pathname} is ${authBootstrapMode}, skipping auto bootstrap`);
      if (!isLoggedIn && isAuthLoading) {
        useAuthStore.setState({ isAuthLoading: false });
      }
      return;
    }

    if (!bootstrapPendingRef.current) {
      return;
    }

    const runBootstrap = () => {
      if (!bootstrapPendingRef.current) {
        return;
      }
      bootstrapPendingRef.current = false;
      traceAuthEvent(`AuthBootstrap: fetching profile for ${location.pathname}`);
      void fetchProfileAndAuthenticate()
        .then((isAuthenticated) => {
          traceAuthEvent(`AuthBootstrap: fetchProfileAndAuthenticate resolved isAuthenticated=${isAuthenticated}`);
        })
        .catch((error) => {
          traceAuthEvent(`AuthBootstrap: fetchProfileAndAuthenticate failed: ${describeAuthError(error)}`);
        });
    };

    if (authBootstrapMode === 'defer') {
      traceAuthEvent(`AuthBootstrap: defer scheduling for ${location.pathname}`);
      if (!isLoggedIn && isAuthLoading) {
        useAuthStore.setState({ isAuthLoading: false });
      }

      let timeoutId: ReturnType<typeof globalThis.setTimeout> | undefined;
      let idleId: number | undefined;

      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(runBootstrap, { timeout: 1500 });
      } else {
        timeoutId = globalThis.setTimeout(runBootstrap, 800);
      }

      return () => {
        traceAuthEvent(`AuthBootstrap: defer cleanup for ${location.pathname}`);
        if (idleId !== undefined && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleId);
        }
        if (timeoutId !== undefined) {
          globalThis.clearTimeout(timeoutId);
        }
      };
    }

    traceAuthEvent(`AuthBootstrap: immediate bootstrap for ${location.pathname}`);
    runBootstrap();
  }, [authBootstrapMode, fetchProfileAndAuthenticate, isAuthLoading, isLoggedIn]);

  return null;
};

function ProtectedRoute() {
  const { isLoggedIn, isAuthLoading } = useAuthSession();
  const { requireLogin } = useAuthAccessActions();
  const location = useLocation();

  useEffect(() => {
    traceAuthEvent(`ProtectedRoute: pathname=${location.pathname}, isAuthLoading=${isAuthLoading}, isLoggedIn=${isLoggedIn}`);

    if (!isAuthLoading && !isLoggedIn) {
      traceAuthEvent(`ProtectedRoute: requireLogin triggered for ${location.pathname}`);
      requireLogin(`${location.pathname}${location.search}${location.hash}`);
    }
  }, [isAuthLoading, isLoggedIn, location.hash, location.pathname, location.search, requireLogin]);

  if (isAuthLoading) {
    traceAuthEvent(`ProtectedRoute: show loading for ${location.pathname}`);
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
  const { isLoggedIn } = useAuthSession();
  const { userRole } = useAuthProfileSnapshot();
  const isAdmin = isAdminRole(userRole);
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to={buildLoginPath(`${location.pathname}${location.search}${location.hash}`)} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function RootEntryRoute() {
  const { isLoggedIn, isAuthLoading } = useAuthSession();

  useEffect(() => {
    if (isAuthLoading) {
      traceLoadEvent('RootEntryRoute:authLoading');
      return;
    }

    if (isLoggedIn) {
      traceLoadEvent('RootEntryRoute:redirectHome');
      return;
    }

    traceLoadEvent('RootEntryRoute:landing');
  }, [isAuthLoading, isLoggedIn]);

  if (isAuthLoading) {
    return (
      <LoadingSpinner
        variant="app"
        message="첫 화면을 준비하고 있습니다."
        subMessage="사용자 상태를 확인하는 중입니다."
        minDurationMs={120}
      />
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/home" replace />;
  }

  return <Landing />;
}

export default function App() {
  const { userId } = useAuthProfileSnapshot();
  const { isLoggedIn } = useAuthSession();
  const { logout, requireLogin } = useAuthAccessActions();
  const { showLoginRequiredDialog, setShowLoginRequiredDialog } = useAuthDialogState();
  const { pendingLoginRedirect, clearPendingLoginRedirect } = useAuthRedirectState();

  useEffect(() => {
    traceLoadEvent('App mount');

    return () => {
      traceLoadEvent('App unmount');
    };
  }, []);

  useEffect(() => {
    setClientErrorReporterUserContext({ userId });
  }, [userId]);

  useEffect(() => installGlobalErrorListeners(), []);

  useEffect(() => {
    const handleSessionExpired = () => {
      traceAuthEvent('auth-session-expired event received');
      logout(true);
      requireLogin();
      // Optional: Show a toast or dialog saying "Session expired"
    };

    window.addEventListener('auth-session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth-session-expired', handleSessionExpired);
  }, [logout, requireLogin]);

  useEffect(() => {
    const handleInvalidAuthor = (event: Event) => {
      const customEvent = event as CustomEvent;
      const detail = customEvent.detail as { responseCode?: string } | undefined;
      if (detail?.responseCode === 'INVALID_AUTHOR') {
        traceAuthEvent('global-api-error INVALID_AUTHOR received');
        requireLogin();
      }
    };

    window.addEventListener('global-api-error', handleInvalidAuthor);
    return () => window.removeEventListener('global-api-error', handleInvalidAuthor);
  }, [requireLogin]);

  useEffect(() => {
    if (isLoggedIn && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!showLoginRequiredDialog || typeof document === 'undefined') {
      return;
    }

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }
  }, [showLoginRequiredDialog]);

  return (
    <ErrorBoundary>
      {import.meta.env.DEV && <ChaosRenderError />}
      <ErrorModalProvider>
        <ConfirmDialogProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AuthBootstrap />
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
                <Route path="/account/deletion/recovery" element={<AccountDeletionRecovery />} />
                <Route path="/oauth/callback" element={<OAuthCallback />} />

                {/* Landing & ServiceInfo - Layout 없이 독립 페이지 */}
                <Route path="/" element={<RootEntryRoute />} />
                {/* Layout 포함 라우트 */}
                <Route element={<Layout authenticated={false} />}>
                  {/* 홈과 몇몇 페이지는 로그인 없이도 접근 가능 */}
                  <Route path="/home" element={<Home />} />
                  <Route path="/prediction" element={<Prediction />} />
                  <Route path="/offseason" element={<OffSeasonHome selectedDate={new Date()} />} />
                  <Route path="/offseason/list" element={<OffSeasonList />} />
                  <Route path="/cheer" element={<Cheer />} />
                  <Route path="/cheer/write" element={<Cheer openComposerOnMount />} />
                  <Route path="/cheer/:postId" element={<CheerDetail />} />
                  <Route path="/profile/:handle" element={<UserProfile />} />
                  <Route path="/predictions/ranking/share/:shareId/:seasonYear" element={<RankingPredictionShare />} />
                  <Route path="/notice" element={<NoticePage />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/leaderboard" element={<LeaderboardPage />} />
                  <Route path="/stadium" element={<StadiumGuide />} />
                </Route>

                <Route element={<Layout authenticated={true} />}>
                  {/* 로그인 필요한 라우트 */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/mate/:id" element={<MateDetail />} />
                    <Route path="/mate" element={<Mate />} />
                    <Route path="/cheer/bookmarks" element={<CheerBookmarks />} />
                    <Route path="/cheer/edit/:postId" element={<CheerEdit />} />
                    <Route path="/mate/create" element={<MateCreate />} />
                    <Route path="/mate/:id/apply" element={<MateApply />} />
                    <Route path="/mate/:id/checkin" element={<MateCheckIn />} />
                    <Route path="/mate/:id/chat" element={<MateChat />} />
                    <Route path="/mate/:id/manage" element={<MateManage />} />
                    <Route path="/mypage" element={<MyPage />} />
                    <Route path="/mypage/:handle" element={<MyPage />} />
                  </Route>

                  {/* 관리자 전용 라우트 */}
                  <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPage />} />
                  </Route>
                </Route>

                {/* Test Route */}
              {import.meta.env.DEV && <Route path="/test/error" element={<TestError />} />}

                {/* 404 처리 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            <GlobalErrorDialog />
            {showLoginRequiredDialog && (
              <Suspense fallback={null}>
                <LoginRequiredDialog
                  open={showLoginRequiredDialog}
                  onOpenChange={(open) => {
                    if (!open) {
                      clearPendingLoginRedirect();
                    }
                    setShowLoginRequiredDialog(open);
                  }}
                  onCancel={clearPendingLoginRedirect}
                  redirectPath={pendingLoginRedirect}
                />
              </Suspense>
            )}
          </BrowserRouter>
        </ConfirmDialogProvider>
      </ErrorModalProvider>
    </ErrorBoundary>
  );
}
