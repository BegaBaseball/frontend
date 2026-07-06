import { Link } from 'react-router-dom';

import type { ViewMode } from '../../types/profile';
import {
  MyPageBarChartIcon,
  MyPageBellIcon,
  MyPageCrownIcon,
  MyPageEditIcon,
  MyPageFlameIcon,
  MyPageSearchIcon,
  MyPageUsersIcon,
} from './MyPageIcons';

type MyPageSidebarMoreRuntimeProps = {
  viewMode: ViewMode;
  todayDate: string;
  onSetViewMode: (mode: ViewMode, options?: { date?: string | null }) => void;
};

export default function MyPageSidebarMoreRuntime({
  viewMode,
  todayDate,
  onSetViewMode,
}: MyPageSidebarMoreRuntimeProps) {
  return (
    <>
      <div className="mypage-season-nav-label">더보기</div>
      <nav
        className="mypage-season-nav-sub"
        aria-label="마이페이지 더보기"
        data-testid="mypage-season-sidebar-more"
      >
        <button
          type="button"
          className={viewMode === 'diaryEditor' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('diaryEditor', { date: todayDate })}
        >
          <MyPageEditIcon />
          <span>오늘 기록</span>
        </button>
        <button
          type="button"
          data-testid="mypage-mate-history-nav"
          className={viewMode === 'mateHistory' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('mateHistory')}
        >
          <MyPageUsersIcon />
          <span>메이트 내역</span>
        </button>
        <button
          type="button"
          data-testid="mypage-cheer-posts-nav"
          className={viewMode === 'cheerPosts' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('cheerPosts')}
        >
          <MyPageFlameIcon />
          <span>응원석 글</span>
        </button>
        <Link to="/stadium">
          <MyPageSearchIcon />
          <span>구장 검색</span>
        </Link>
        <button
          type="button"
          className={viewMode === 'alerts' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('alerts')}
        >
          <MyPageBellIcon />
          <span>알림</span>
        </button>
        <button
          type="button"
          className={viewMode === 'badges' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('badges')}
        >
          <MyPageCrownIcon />
          <span>배지 도감</span>
        </button>
        <button
          type="button"
          className={viewMode === 'stats' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('stats')}
        >
          <MyPageBarChartIcon />
          <span>시즌 통계</span>
        </button>
      </nav>
    </>
  );
}
