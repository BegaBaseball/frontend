import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#2d5f4f' }}
          >
            <span className="text-white text-xl font-bold">⚾</span>
          </div>
          <div>
            <h3 className="tracking-wider" style={{ fontWeight: 900 }}>
              BEGA
            </h3>
            <p className="text-xs text-gray-400">BASEBALL GUIDE</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <h4 className="mb-4">서비스</h4>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link to="/" className="hover:text-white">
                  홈
                </Link>
              </li>
              <li>
                <Link to="/cheer" className="hover:text-white">
                  응원게시판
                </Link>
              </li>
              <li>
                <Link to="/stadium" className="hover:text-white">
                  구장가이드
                </Link>
              </li>
              <li>
                <Link to="/prediction" className="hover:text-white">
                  승부예측
                </Link>
              </li>
              <li>
                <Link to="/mypage" className="hover:text-white">
                  직관다이어리
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4">정보</h4>
            <ul className="space-y-2 text-gray-400">
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
          <div>
            <h4 className="mb-4">고객센터</h4>
            <ul className="space-y-2 text-gray-400">
              <li>이메일: support@bega.com</li>
              <li>운영시간: 평일 09:00-18:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
          <p>© 2025 BEGA (BASEBALL GUIDE). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
