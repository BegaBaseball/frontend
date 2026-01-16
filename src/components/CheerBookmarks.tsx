import { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bookmark, Home, Radio, UserRound, Users } from 'lucide-react';
import { fetchPosts } from '../api/cheerApi';
import CheerCard from './CheerCard';
import { cn } from '../lib/utils';

export default function CheerBookmarks() {
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['cheer-bookmarks'],
    queryFn: () => fetchPosts('all', 0, 50),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const bookmarkedPosts = useMemo(
    () => (data?.content ?? []).filter((post) => post.isBookmarked),
    [data]
  );

  const navItems = [
    { id: 'home', label: 'Home', icon: Home, path: '/home' },
    { id: 'team', label: 'Team Hub', icon: Users, path: '/cheer' },
    { id: 'live', label: 'LIVE', icon: Radio, path: '/prediction' },
    { id: 'profile', label: 'Profile', icon: UserRound, path: '/mypage' },
    { id: 'bookmarks', label: '북마크', icon: Bookmark, path: '/cheer/bookmarks' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f9f9] dark:bg-[#0E1117]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <div className="grid grid-cols-1 gap-0 lg:grid-cols-[72px_600px_320px] xl:grid-cols-[200px_600px_320px]">
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
                    'flex items-center justify-center xl:justify-start gap-3 h-10 px-2 rounded-full xl:rounded-xl text-[18px] font-semibold transition-colors',
                    isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                      : 'text-[#334155] hover:bg-[#F1F5F9] dark:text-slate-400 dark:hover:bg-slate-800'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="hidden xl:inline">{item.label}</span>
                </button>
              );
            })}
          </aside>

          <main className="flex w-full flex-col gap-0 bg-white dark:bg-[#151A23] border-x border-[#EFF3F4] dark:border-[#232938] lg:w-[600px]">
            <div className="border-b border-[#EFF3F4] dark:border-[#232938] px-4 py-4">
              <h1 className="text-lg font-bold text-[#0F172A] dark:text-white">북마크</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">저장해둔 게시글을 모아볼 수 있어요.</p>
            </div>

            {isLoading ? (
              <div className="px-4 py-6 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">북마크를 불러오지 못했습니다.</p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="mt-3 rounded-full border border-slate-200 dark:border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  다시 시도
                </button>
              </div>
            ) : bookmarkedPosts.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500 dark:text-slate-400">
                아직 저장한 게시글이 없습니다.
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
            <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#232938] p-4 bg-white dark:bg-[#151A23]">
              <p className="text-sm font-semibold text-[#0F172A] dark:text-white">북마크 팁</p>
              <p className="mt-2 text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">
                게시글 상세에서 북마크를 눌러 저장해보세요. 자주 보는 응원글을 빠르게 찾을 수 있어요.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
