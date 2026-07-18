import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBookmarks } from '../api/cheerApi';
import CheerCard from './CheerCard';
import { BookmarkIcon, HomeIcon, LineChartIcon, MegaphoneIcon, UserIcon } from './icons/CheerFlowIcons';
import { PenSquareIcon } from './icons/CheerShellIcons';
import { cn } from '../lib/utils';
import { useAuthProfileSnapshot } from '../store/authStore';
import { DEFAULT_BRAND_COLOR, getReadableAccent, normalizeHexColor } from '../utils/teamColors';
import CheerMobileBottomNav from './CheerMobileBottomNav';

export default function CheerBookmarks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userHandle, userFavoriteTeamColor } = useAuthProfileSnapshot();
  const userProfilePath = userHandle ? `/profile/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}` : '/mypage';
  const teamAccent = getReadableAccent(normalizeHexColor(userFavoriteTeamColor || DEFAULT_BRAND_COLOR));

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cheer-bookmarks'],
    queryFn: () => fetchBookmarks(0, 20),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const bookmarkedPosts = data?.content ?? [];
  const handleWriteClick = () => navigate('/cheer/write');

  const navItems = [
    { id: 'home', label: '홈', icon: HomeIcon, path: '/home' },
    { id: 'team', label: '응원석', icon: MegaphoneIcon, path: '/cheer' },
    { id: 'live', label: '전력분석실', icon: LineChartIcon, path: '/prediction' },
    { id: 'profile', label: '프로필', icon: UserIcon, path: userProfilePath },
    { id: 'bookmarks', label: '북마크', icon: BookmarkIcon, path: '/cheer/bookmarks' },
  ];

  return (
    <div className="min-h-screen bg-[var(--cheer-page-bg)] pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_264px] md:gap-x-4 lg:grid-cols-[68px_1fr_264px] xl:grid-cols-[200px_1fr_270px]">
          <aside className="hidden lg:flex w-[68px] xl:w-[200px] flex-col gap-3 sticky top-6 self-start px-2 xl:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center justify-center xl:justify-start gap-3 h-11 px-2 rounded-full xl:rounded-xl text-18 font-bold transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-secondary dark:text-white'
                      : 'text-[#334155] hover:bg-[#F1F5F9] dark:text-white dark:hover:bg-secondary'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleWriteClick}
              className="mt-4 flex h-[46px] w-[46px] items-center justify-center self-center rounded-full text-18 font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] xl:h-12 xl:w-full xl:justify-start xl:gap-3 xl:self-auto xl:rounded-xl xl:px-4"
              style={{ backgroundColor: teamAccent }}
              aria-label="게시하기"
            >
              <PenSquareIcon className="h-6 w-6" />
              <span className="hidden xl:inline">게시하기</span>
            </button>
          </aside>

          <main className="relative flex w-full flex-col gap-0 bg-[var(--cheer-card-bg)] border-x border-[var(--cheer-line-10)] md:pb-24 lg:pb-0">
            <div className="border-b border-[var(--cheer-line-10)] px-4 py-4">
              <h1 className="text-lg font-bold text-[#0F172A] dark:text-white">북마크</h1>
              <p className="text-body text-slate-500 dark:text-white">저장해둔 게시글을 모아볼 수 있어요.</p>
            </div>

            {isLoading ? (
              <div className="divide-y divide-[var(--cheer-line-10)]">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="px-4 py-4 animate-skeleton-pulse">
                    {/* Header: Avatar + Author info */}
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-[var(--cheer-chip-bg)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-20 rounded bg-[var(--cheer-chip-bg)]" />
                          <div className="h-3 w-12 rounded bg-[var(--cheer-chip-bg)]" />
                        </div>
                        {/* Content lines */}
                        <div className="mt-3 space-y-2">
                          <div className="h-4 w-full rounded bg-[var(--cheer-chip-bg)]" />
                          <div className="h-4 w-4/5 rounded bg-[var(--cheer-chip-bg)]" />
                          <div className="h-4 w-2/3 rounded bg-[var(--cheer-chip-bg)]" />
                        </div>
                        {/* Action buttons */}
                        <div className="mt-4 flex items-center gap-6">
                          <div className="h-4 w-10 rounded bg-[var(--cheer-chip-bg)]" />
                          <div className="h-4 w-10 rounded bg-[var(--cheer-chip-bg)]" />
                          <div className="h-4 w-10 rounded bg-[var(--cheer-chip-bg)]" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
                <p className="text-body text-slate-500 dark:text-white">북마크를 불러오지 못했습니다.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 min-h-11 rounded-full border border-[var(--cheer-line-10)] px-4 py-2 text-body font-bold text-slate-600 hover:bg-slate-50 dark:text-white dark:hover:bg-secondary"
                >
                  다시 시도
                </button>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-[var(--cheer-chip-bg)] flex items-center justify-center mx-auto mb-4">
                  <BookmarkIcon className="h-8 w-8 text-slate-400 dark:text-white" />
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-white mb-1">
                  아직 북마크한 게시글이 없습니다
                </p>
                <p className="text-body text-slate-400 dark:text-white mb-5">
                  응원 게시판에서 마음에 드는 게시글을 북마크해보세요
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/cheer')}
                  className="min-h-11 rounded-full bg-primary px-5 py-2 text-body font-bold text-white transition-opacity hover:opacity-90"
                >
                  응원 게시판으로 이동
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                {bookmarkedPosts.map((post) => (
                  <CheerCard key={post.id} post={post} teamColor={teamAccent} />
                ))}
              </div>
            )}
          </main>

          <aside className="sticky top-6 hidden w-[264px] flex-col gap-4 self-start md:flex xl:w-[270px]">
            <div className="rounded-2xl border border-[var(--cheer-line-10)] p-4 bg-[var(--cheer-sub-card)]">
              <p className="text-base font-bold text-[#0F172A] dark:text-white">북마크 팁</p>
              <p className="mt-2 text-body text-[#64748B] dark:text-white leading-relaxed">
                게시글 상세에서 북마크를 눌러 저장해보세요. 자주 보는 응원글을 빠르게 찾을 수 있어요.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <CheerMobileBottomNav
        activeItem="bookmarks"
        userProfilePath={userProfilePath}
        onWriteClick={handleWriteClick}
        teamAccent={teamAccent}
      />

      {/* 태블릿 세로(768-1023): 우하단 FAB 56px — 이 구간에서만 게시 진입점 노출 */}
      <button
        type="button"
        onClick={handleWriteClick}
        className="fixed bottom-6 right-6 z-40 hidden h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] md:flex lg:hidden"
        style={{ backgroundColor: teamAccent }}
        aria-label="게시하기"
      >
        <PenSquareIcon className="h-6 w-6" />
      </button>
    </div>
  );
}
