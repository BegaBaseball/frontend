import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuthStore } from './store/authStore';
import LoadingSpinner from './components/LoadingSpinner';
import Layout from './components/Layout';

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

// 🔥 인증이 필요한 라우트를 보호하는 컴포넌트
function ProtectedRoute() {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
}

// 🔥 관리자 전용 라우트 - Selector 패턴으로 수정
function AdminRoute() {
  // 🔥 각각 따로 구독 (객체를 반환하지 않음)
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

import ChatBot from './components/ChatBot';

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* 공개 라우트 - 로그인 필요 없음 */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/password/reset" element={<PasswordReset />} />
          <Route path="/password/reset/confirm" element={<PasswordResetConfirm />} />
          
          {/* Layout 포함 라우트 */}
          <Route element={<Layout />}>
            {/* 홈과 몇몇 페이지는 로그인 없이도 접근 가능 */}
            <Route path="/" element={<Home />} />
            <Route path="/stadium" element={<StadiumGuide />} />
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/cheer" element={<Cheer />} />
            <Route path="/cheer/detail/:postId" element={<CheerDetail />} />
            <Route path="/mate" element={<Mate />} />
            <Route path="/mate/:id" element={<MateDetail />} />
            {/* 로그인 필요한 라우트 */}
            <Route element={<ProtectedRoute />}>
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
      </Suspense>
      <ChatBot />
    </BrowserRouter>
  );
}