import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useNotificationSocket } from '../hooks/useNotificationSocket';

export default function Layout() {
  // WebSocket 연결 관리
  useNotificationSocket();

  // Navbar는 이제 useLocation 등을 사용하여 현재 페이지를 자체적으로 결정할 수 있습니다.
  // 또는 필요에 따라 currentPage prop을 전달할 수도 있습니다.
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Outlet /> {/* 자식 라우트 컴포넌트가 렌더링될 위치 */}
      </main>
      <Footer />
    </>
  );
}
