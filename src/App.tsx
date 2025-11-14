import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout'; // Layout import

// 페이지 컴포넌트를 lazy loading
const Home = lazy(() => import('./components/Home'));
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

// 인증이 필요한 라우트를 보호하는 컴포넌트
function ProtectedRoute() { // children prop 제거
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />; // Outlet 렌더링
}

// 관리자 전용 라우트
function AdminRoute() { // children prop 제거
  const { isLoggedIn, isAdmin } = useAuthStore((state) => ({
    isLoggedIn: state.isLoggedIn,
    isAdmin: state.isAdmin,
  }));
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <Outlet />; // Outlet 렌더링
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* 공개 라우트 */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/password/reset" element={<PasswordReset />} />
          <Route path="/password/reset/confirm" element={<PasswordResetConfirm />} />
          
          {/* 보호된 라우트 (Layout 포함) */}
          <Route element={<Layout />}>
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
              <Route path="/stadium" element={<StadiumGuide />} />
              <Route path="/prediction" element={<Prediction />} />
              <Route path="/cheer" element={<Cheer />} />
              <Route path="/cheer/write" element={<CheerWrite />} />
              <Route path="/cheer/detail/:postId" element={<CheerDetail />} />
              <Route path="/cheer/edit/:postId" element={<CheerEdit />} />
              <Route path="/mate" element={<Mate />} />
              <Route path="/mate/create" element={<MateCreate />} />
              <Route path="/mate/detail/:partyId" element={<MateDetail />} />
              <Route path="/mate/apply/:partyId" element={<MateApply />} />
              <Route path="/mate/check-in/:partyId" element={<MateCheckIn />} />
              <Route path="/mate/chat/:partyId" element={<MateChat />} />
              <Route path="/mate/manage" element={<MateManage />} />
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
      </Suspense>
    </BrowserRouter>
  );
}