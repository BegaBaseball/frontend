import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchBookmarks } from '../api/cheerApi';
import CheerCard from './CheerCard';
import { BookmarkIcon, HomeIcon, LineChartIcon, MegaphoneIcon, UserIcon } from './icons/PublicShellIcons';
import { cn } from '../lib/utils';
import { useAuthProfileSnapshot } from '../store/authStore';
import CheerMobileBottomNav from './CheerMobileBottomNav';

export default function CheerBookmarks() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userHandle } = useAuthProfileSnapshot();
  const userProfilePath = userHandle ? `/profile/${userHandle.startsWith('@') ? userHandle : `@${userHandle}`}` : '/mypage';

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
    <div className="min-h-screen bg-[#f7f9f9] pb-[calc(5.75rem+env(safe-area-inset-bottom))] dark:bg-background lg:pb-0">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[72px_1fr_320px] xl:grid-cols-[200px_1fr_320px]">
          <aside className="hidden lg:flex w-[72px] xl:w-[200px] flex-col gap-3 sticky top-6 self-start px-2 xl:px-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'flex items-center justify-center xl:justify-start gap-3 h-10 px-2 rounded-full xl:rounded-xl text-[18px] font-bold transition-colors',
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
          </aside>

          <main className="flex w-full flex-col gap-0 bg-white dark:bg-card border-x border-[#EFF3F4] dark:border-border">
            <div className="border-b border-[#EFF3F4] dark:border-border px-4 py-4">
              <h1 className="text-lg font-bold text-[#0F172A] dark:text-white">북마크</h1>
              <p className="text-[16px] text-slate-500 dark:text-white">저장해둔 게시글을 모아볼 수 있어요.</p>
            </div>

            {isLoading ? (
              <div className="divide-y divide-[#EFF3F4] dark:divide-[#232938]">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="px-4 py-4 animate-pulse">
                    {/* Header: Avatar + Author info */}
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-secondary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-20 rounded bg-slate-200 dark:bg-secondary" />
                          <div className="h-3 w-12 rounded bg-slate-100 dark:bg-secondary" />
                        </div>
                        {/* Content lines */}
                        <div className="mt-3 space-y-2">
                          <div className="h-4 w-full rounded bg-slate-200 dark:bg-secondary" />
                          <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-secondary" />
                          <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-secondary" />
                        </div>
                        {/* Action buttons */}
                        <div className="mt-4 flex items-center gap-6">
                          <div className="h-4 w-10 rounded bg-slate-100 dark:bg-secondary" />
                          <div className="h-4 w-10 rounded bg-slate-100 dark:bg-secondary" />
                          <div className="h-4 w-10 rounded bg-slate-100 dark:bg-secondary" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isError ? (
              <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
                <p className="text-[16px] text-slate-500 dark:text-white">북마크를 불러오지 못했습니다.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 min-h-11 rounded-full border border-slate-200 px-4 py-2 text-[16px] font-bold text-slate-600 hover:bg-slate-50 dark:border-border dark:text-white dark:hover:bg-secondary"
                >
                  다시 시도
                </button>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="px-4 sm:px-6 py-8 sm:py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center mx-auto mb-4">
                  <BookmarkIcon className="h-8 w-8 text-slate-400 dark:text-white" />
                </div>
                <p className="text-base font-bold text-slate-700 dark:text-white mb-1">
                  아직 북마크한 게시글이 없습니다
                </p>
                <p className="text-[16px] text-slate-400 dark:text-white mb-5">
                  응원 게시판에서 마음에 드는 게시글을 북마크해보세요
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/cheer')}
                  className="min-h-11 rounded-full bg-primary px-5 py-2 text-[16px] font-bold text-white transition-opacity hover:opacity-90"
                >
                  응원 게시판으로 이동
                </button>
              </div>
            ) : (
              <div className="px-4 py-4 space-y-3">
                {bookmarkedPosts.map((post) => (
                  <CheerCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </main>

          <aside className="hidden lg:flex w-[320px] flex-col gap-4 sticky top-6 self-start lg:ml-4">
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-border p-4 bg-white dark:bg-card">
              <p className="text-base font-bold text-[#0F172A] dark:text-white">북마크 팁</p>
              <p className="mt-2 text-[16px] text-[#64748B] dark:text-white leading-relaxed">
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
      />
    </div>
  );
}
