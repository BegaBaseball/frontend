import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';


export default function Footer() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  return (
    <footer className="bg-gray-900 text-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-row items-center gap-3 mb-4">
          <img
            src={baseballLogo}
            alt="baseball"
            className="w-8 h-8"
          />
          <div className="flex items-baseline gap-2">
            <h3 className="tracking-wider text-lg" style={{ fontWeight: 900 }}>
              BEGA
            </h3>
            <p className="text-[10px] text-gray-400 uppercase">BASEBALL GUIDE</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="mb-2 text-sm font-bold">서비스</h4>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>
                <Link to="/home" className="hover:text-white">
                  홈
                </Link>
              </li>
              <li>
                <Link to="/cheer" className="hover:text-white">
                  응원석
                </Link>
              </li>
              <li>
                <Link to="/stadium" className="hover:text-white">
                  구장가이드
                </Link>
              </li>
              <li>
                <Link to="/prediction" className="hover:text-white">
                  전력분석실
                </Link>
              </li>
              <li>
                <Link to="/mate" className="hover:text-white">
                  같이가요
                </Link>
              </li>
              <li>
                <button
                  onClick={() => navigate(user?.handle ? `/profile/${user.handle.startsWith('@') ? user.handle : `@${user.handle}`}` : '/mypage')}
                  className="hover:text-white text-left"
                >
                  프로필
                </button>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-bold">정보</h4>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>
                <Link to="/notice" className="hover:text-white">
                  공지사항
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white">
                  이용약관
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-2 text-sm font-bold">고객센터</h4>
            <ul className="space-y-1 text-xs text-gray-400">
              <li>이메일: baseballguide251021@gmail.com</li>
              <li>운영시간: 평일 09:00-18:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-4 text-center text-gray-500 text-[10px]">
          <p>© 2025 BEGA (BASEBALL GUIDE). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
