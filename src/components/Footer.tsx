import { Link } from 'react-router-dom';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

const footerLinkClass = 'inline-flex min-h-11 min-w-11 items-center py-2 hover:text-primary dark:hover:text-white';

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 text-zinc-900 dark:text-white border-t border-zinc-200 dark:border-gray-800 pt-8 pb-[var(--mobile-footer-safe-bottom)] lg:py-8">
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
            <p className="text-[16px] text-gray-400 uppercase">BASEBALL GUIDE</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div>
            <h4 className="mb-2 text-base font-bold">서비스</h4>
            <ul className="space-y-1 text-[16px] text-zinc-600 dark:text-white">
              <li>
                <Link to="/home" className={footerLinkClass}>
                  홈
                </Link>
              </li>
              <li>
                <Link to="/cheer" className={footerLinkClass}>
                  응원석
                </Link>
              </li>
              <li>
                <Link to="/stadium" className={footerLinkClass}>
                  구장가이드
                </Link>
              </li>
              <li>
                <Link to="/prediction" className={footerLinkClass}>
                  전력분석실
                </Link>
              </li>
              <li>
                <Link to="/mate" className={footerLinkClass}>
                  같이가요
                </Link>
              </li>
              <li>
                <Link to="/mypage" className={footerLinkClass}>
                  프로필
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-2 text-base font-bold">정보</h4>
            <ul className="space-y-1 text-[16px] text-zinc-600 dark:text-white">
              <li>
                <Link to="/notice" className={footerLinkClass}>
                  공지사항
                </Link>
              </li>
              <li>
                <Link to="/terms" className={footerLinkClass}>
                  이용약관
                </Link>
              </li>
              <li>
                <Link to="/privacy" className={footerLinkClass}>
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h4 className="mb-2 text-base font-bold">고객센터</h4>
            <ul className="space-y-1 text-[16px] text-zinc-600 dark:text-white">
              <li>
                이메일:{' '}
                <a
                  href="mailto:baseballguide251021@gmail.com"
                  className="inline-flex min-h-11 items-center py-2 hover:text-primary dark:hover:text-white underline-offset-2 hover:underline"
                >
                  baseballguide251021@gmail.com
                </a>
              </li>
              <li>운영시간: 평일 09:00-18:00</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-200 dark:border-gray-800 pt-4 text-center text-zinc-500 dark:text-white text-[16px]">
          <p>© 2025 BEGA (BASEBALL GUIDE). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
