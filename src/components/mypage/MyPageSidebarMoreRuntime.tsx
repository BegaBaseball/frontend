import type { ViewMode } from '../../types/profile';
import {
  MyPageBarChartIcon,
  MyPageBellIcon,
  MyPageCrownIcon,
  MyPageSearchIcon,
} from './MyPageIcons';

type MyPageSidebarMoreRuntimeProps = {
  onSetViewMode: (mode: ViewMode, options?: { date?: string | null }) => void;
};

export default function MyPageSidebarMoreRuntime({ onSetViewMode }: MyPageSidebarMoreRuntimeProps) {
  return (
    <>
      <div className="mypage-season-nav-label">더보기</div>
      <nav
        className="mypage-season-nav-sub"
        aria-label="마이페이지 더보기"
        data-testid="mypage-season-sidebar-more"
      >
        <a href="/stadium">
          <MyPageSearchIcon />
          <span>검색</span>
        </a>
        <a href="/notice">
          <MyPageBellIcon />
          <span>알림</span>
        </a>
        <button type="button" onClick={() => onSetViewMode('stats')}>
          <MyPageCrownIcon />
          <span>배지 도감</span>
        </button>
        <button type="button" onClick={() => onSetViewMode('stats')}>
          <MyPageBarChartIcon />
          <span>시즌 통계</span>
        </button>
      </nav>
    </>
  );
}
