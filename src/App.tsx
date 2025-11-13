import { useEffect } from 'react';
import { useNavigationStore } from './store/navigationStore';
import { useUIStore } from './store/uiStore';

// Components
import Login from './components/Login';
import SignUp from './components/SignUp';
import PasswordReset from './components/PasswordReset';
import PasswordResetConfirm from './components/PasswordResetConfirm';
import Home from './components/Home';
import StadiumGuide from './components/StadiumGuide';
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
import AdminPage from './components/AdminPage';

export default function App() {
  const currentView = useNavigationStore((state) => state.currentView);
  const setCurrentView = useNavigationStore((state) => state.setCurrentView);
  const { showWelcome } = useUIStore();

  // URL 파라미터 처리
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path === '/password-reset/confirm') {
      const token = params.get('token');
      if (token) {
        setCurrentView('passwordResetConfirm', { token });
      } else {
        alert('유효하지 않은 링크입니다.');
      }
      return;
    }

    if (path === '/password-reset') {
      setCurrentView('passwordReset');
    }
  }, [setCurrentView]);

  // 뷰 라우팅
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <>
            {showWelcome && <WelcomeGuide />}
            <Home />
          </>
        );
      case 'login':
        return <Login />;
      case 'signup':
        return <SignUp />;
      case 'passwordReset':
        return <PasswordReset />;
      case 'passwordResetConfirm':
        return <PasswordResetConfirm />;
      case 'stadium':
        return <StadiumGuide />;
      case 'prediction':
        return <Prediction />;
      case 'cheer':
        return <Cheer />;
      case 'cheerWrite':
        return <CheerWrite />;
      case 'cheerDetail':
        return <CheerDetail />;
      case 'cheerEdit':
        return <CheerEdit />;
      case 'mate':
        return <Mate />;
      case 'mateCreate':
        return <MateCreate />;
      case 'mateDetail':
        return <MateDetail />;
      case 'mateApply':
        return <MateApply />;
      case 'mateCheckIn':
        return <MateCheckIn />;
      case 'mateChat':
        return <MateChat />;
      case 'mateManage':
        return <MateManage />;
      case 'mypage':
        return <MyPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <Login />;
    }
  };

  return renderView();
}