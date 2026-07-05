import { lazy, Suspense, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { getMyFollowCounts } from '../../api/followApi';
import { getFullTeamName, TEAM_DATA } from '../../constants/teams';
import type { ViewMode } from '../../types/profile';
import TeamLogo from '../TeamLogo';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import {
  MyPageBarChartIcon,
  MyPageCoinsIcon,
  MyPageEditIcon,
  MyPageFlameIcon,
  MyPageHomeIcon,
  MyPageSettingsIcon,
  MyPageUsersIcon,
} from './MyPageIcons';

const MyPageSidebarMoreRuntime = lazy(() => import('./MyPageSidebarMoreRuntime'));

type MyPageSidebarRuntimeProps = {
  currentUserId: number | null;
  profileImage: string | null;
  name: string;
  handle: string;
  savedFavoriteTeam: string;
  cheerPoints: number;
  viewMode: ViewMode;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onSetViewMode: (mode: ViewMode, options?: { date?: string | null }) => void;
};

const formatCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return count.toString();
};

const normalizeHandle = (handle: string): string => {
  if (!handle) {
    return '';
  }
  return handle.startsWith('@') ? handle : `@${handle}`;
};

const formatTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const isLogView = (viewMode: ViewMode) => viewMode === 'diary' || viewMode === 'diaryEditor';

const isSettingsView = (viewMode: ViewMode) =>
  viewMode === 'settings'
  || viewMode === 'editProfile'
  || viewMode === 'accountSettings'
  || viewMode === 'blockedUsers'
  || viewMode === 'changePassword';

export default function MyPageSidebarRuntime({
  currentUserId,
  profileImage,
  name,
  handle,
  savedFavoriteTeam,
  cheerPoints,
  viewMode,
  onOpenFollowers,
  onOpenFollowing,
  onSetViewMode,
}: MyPageSidebarRuntimeProps) {
  const { data: followCounts } = useQuery({
    queryKey: ['followCounts', 'me', currentUserId ?? 0],
    queryFn: () => getMyFollowCounts(),
    enabled: Boolean(currentUserId),
    retry: false,
  });

  const normalizedHandle = normalizeHandle(handle);
  const hasFavoriteTeam = savedFavoriteTeam !== '없음';
  const favoriteTeamLabel = hasFavoriteTeam ? getFullTeamName(savedFavoriteTeam) : '응원팀 미설정';
  const favoriteTeamColor = hasFavoriteTeam ? TEAM_DATA[savedFavoriteTeam]?.color : undefined;
  const favoriteTeamStyle = favoriteTeamColor
    ? ({ '--mp-team-color': favoriteTeamColor } as CSSProperties)
    : undefined;

  return (
    <aside className="mypage-season-side" data-screen-label="마이페이지 사이드바" data-testid="mypage-season-sidebar">
      <section className="mypage-season-id" aria-label="내 프로필 요약">
        <ProfileAvatar
          src={profileImage}
          alt={name}
          fallbackName={name}
          width={64}
          height={64}
          showRing
          ringClassName="bg-card p-px"
        />
        <div className="mypage-season-id-copy">
          <div className="mypage-season-name">{name}</div>
          {normalizedHandle && <div className="mypage-season-handle">{normalizedHandle}</div>}
          <span className={`mypage-season-chip ${hasFavoriteTeam ? 'mypage-season-chip--team' : ''}`} style={favoriteTeamStyle}>
            {hasFavoriteTeam ? (
              <span className="h-5 w-5 flex-shrink-0" data-testid="mypage-favorite-team-logo">
                <TeamLogo team={savedFavoriteTeam} size="sm" />
              </span>
            ) : (
              <i className="mypage-season-team-dot" />
            )}
            <span className="min-w-0 truncate">{favoriteTeamLabel}</span>
          </span>
        </div>
        <div className="mypage-season-counters">
          <button type="button" className="mypage-season-counter" onClick={onOpenFollowers}>
            <b>{formatCount(followCounts?.followerCount || 0)}</b> 팔로워
          </button>
          <button type="button" className="mypage-season-counter" onClick={onOpenFollowing}>
            <b>{formatCount(followCounts?.followingCount || 0)}</b> 팔로잉
          </button>
          <span className="mypage-season-counter--points">
            <MyPageCoinsIcon className="mr-1 inline h-3.5 w-3.5" />
            {cheerPoints.toLocaleString()} P
          </span>
        </div>
      </section>

      <nav className="mypage-season-nav" aria-label="마이페이지 메뉴">
        <Link to="/home" data-testid="mypage-home-nav">
          <MyPageHomeIcon />
          <span>홈</span>
        </Link>
        <button
          type="button"
          className={isLogView(viewMode) ? 'is-active' : undefined}
          onClick={() => onSetViewMode('diary')}
        >
          <MyPageEditIcon />
          <span>시즌 로그</span>
        </button>
        <button
          type="button"
          data-testid="mypage-toggle-stats"
          className={viewMode === 'stats' ? 'is-active' : undefined}
          onClick={() => onSetViewMode('stats')}
        >
          <MyPageBarChartIcon />
          <span>나의 기록</span>
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
          className={isSettingsView(viewMode) ? 'is-active' : undefined}
          onClick={() => onSetViewMode('editProfile')}
        >
          <MyPageSettingsIcon />
          <span>설정</span>
        </button>
      </nav>

      <button
        type="button"
        className="mypage-season-sidebar-card text-left"
        data-testid="mypage-season-sidebar-record-cta"
        onClick={() => onSetViewMode('diaryEditor', { date: formatTodayString() })}
      >
        <strong>오늘의 기록</strong>
        <span>직관 기록 남기기</span>
        <small>티켓이나 경기 기억을 다이어리에 저장해요</small>
      </button>

      <Suspense fallback={null}>
        <MyPageSidebarMoreRuntime viewMode={viewMode} onSetViewMode={onSetViewMode} />
      </Suspense>
    </aside>
  );
}
