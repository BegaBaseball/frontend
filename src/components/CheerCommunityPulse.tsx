import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { fetchHotPosts } from '../api/cheerApi';
import { fetchLeaderboard } from '../api/leaderboardPublic';
import { extractPopularCheerTags } from '../utils/cheerCommunityPulse';

export default function CheerCommunityPulse() {
  const navigate = useNavigate();
  const hotPostsQuery = useQuery({
    queryKey: ['cheer-hot', 'HYBRID'],
    queryFn: () => fetchHotPosts({ page: 0, size: 5, algorithm: 'HYBRID' }),
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  const weeklyLeaderboardQuery = useQuery({
    queryKey: ['leaderboard', 'weekly', 0, 3],
    queryFn: () => fetchLeaderboard('weekly', 0, 3),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  const popularTags = extractPopularCheerTags(hotPostsQuery.data?.content ?? []);
  const weeklyLeaders = weeklyLeaderboardQuery.data?.content ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-body font-black text-slate-900 dark:text-white">인기 피드 태그</h2>
            <p className="mt-1 text-caption font-semibold text-slate-500 dark:text-slate-300">현재 인기 피드 5개 기준</p>
          </div>
          <span className="text-lg font-black text-slate-300 dark:text-slate-600">#</span>
        </div>
        {hotPostsQuery.isLoading ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3].map((item) => <span key={item} className="h-8 w-20 animate-pulse rounded-full bg-slate-100 dark:bg-secondary" />)}
          </div>
        ) : popularTags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularTags.map((item) => (
              <button
                key={item.tag}
                type="button"
                className="min-h-9 rounded-full bg-slate-100 px-3 text-caption font-black text-slate-700 hover:bg-slate-200 dark:bg-secondary dark:text-white dark:hover:bg-slate-700"
                onClick={() => navigate(`/cheer?q=${encodeURIComponent(`#${item.tag}`)}`)}
              >
                #{item.tag} <span className="ml-1 text-slate-400 dark:text-slate-300">{item.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-caption font-semibold text-slate-500 dark:text-slate-300">
            {hotPostsQuery.isError ? '인기 피드 태그를 불러오지 못했습니다.' : '집계된 해시태그가 아직 없습니다.'}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card">
        <div>
          <h2 className="text-body font-black text-slate-900 dark:text-white">주간 포인트 리더</h2>
          <p className="mt-1 text-caption font-semibold text-slate-500 dark:text-slate-300">내부 리더보드 주간 집계 기준</p>
        </div>
        {weeklyLeaderboardQuery.isLoading ? (
          <div className="mt-3 space-y-2">
            {[1, 2, 3].map((item) => <div key={item} className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-secondary" />)}
          </div>
        ) : weeklyLeaders.length > 0 ? (
          <ol className="mt-3 space-y-2">
            {weeklyLeaders.map((leader) => (
              <li key={`${leader.rank}-${leader.handle || leader.userName}`}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-slate-50 dark:hover:bg-secondary"
                  onClick={() => navigate(leader.handle ? `/profile/${leader.handle.startsWith('@') ? leader.handle : `@${leader.handle}`}` : '/leaderboard')}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-caption font-black text-slate-700 dark:bg-secondary dark:text-white">
                    {leader.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body font-black text-slate-900 dark:text-white">{leader.userName}</span>
                  <span className="shrink-0 text-caption font-black tabular-nums text-slate-500 dark:text-slate-300">{leader.score.toLocaleString()} P</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-caption font-semibold text-slate-500 dark:text-slate-300">
            {weeklyLeaderboardQuery.isError ? '주간 리더보드를 불러오지 못했습니다.' : '이번 주 집계 데이터가 아직 없습니다.'}
          </p>
        )}
      </section>
    </div>
  );
}
