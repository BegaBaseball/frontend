import { AlertCircle, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchHotPosts } from '../api/cheerApi';
import CheerCard from './CheerCard';

export default function CheerHot() {
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['cheer-hot', 'HYBRID'],
        queryFn: () => fetchHotPosts({ page: 0, size: 5, algorithm: 'HYBRID' }),
        staleTime: 3 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    const hotPosts = data?.content ?? [];

    if (isLoading) {
        return (
            <div className="bg-red-50/50 dark:bg-card rounded-2xl p-5 border border-red-100 dark:border-border">
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400" />
                    <h2 className="text-lg font-bold text-red-500 dark:text-red-400">인기 피드</h2>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map((index) => (
                        <div key={index} className="rounded-lg border border-red-100 dark:border-border p-3 animate-pulse">
                            <div className="h-3 w-16 bg-red-100 dark:bg-secondary rounded" />
                            <div className="mt-2 h-4 w-full bg-red-100 dark:bg-secondary rounded" />
                            <div className="mt-2 h-4 w-5/6 bg-red-100 dark:bg-secondary rounded" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="bg-red-50/50 dark:bg-card rounded-2xl p-5 border border-red-100 dark:border-border">
                <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
                    <h2 className="text-lg font-bold text-red-500 dark:text-red-400">인기 피드</h2>
                </div>
                <p className="text-sm text-[#64748B] dark:text-gray-300">데이터를 불러오지 못했습니다.</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-300">
                    네트워크 상태를 확인하고 다시 시도해 주세요
                </p>
                <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-3 rounded-full border border-red-200 dark:border-border px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-secondary"
                >
                    다시 시도
                </button>
            </div>
        );
    }

    if (!hotPosts.length) {
        return (
            <div className="bg-red-50/50 dark:bg-card rounded-2xl p-5 border border-red-100 dark:border-border">
                <div className="flex items-center gap-2 mb-4">
                    <Flame className="w-5 h-5 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400" />
                    <h2 className="text-lg font-bold text-red-500 dark:text-red-400">인기 피드</h2>
                </div>
                <p className="text-sm text-[#64748B] dark:text-gray-300">지금은 표시할 인기 글이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="bg-red-50/50 dark:bg-card rounded-2xl p-5 border border-red-100 dark:border-border">
            <div className="flex items-center gap-2 mb-4">
                <Flame className="w-5 h-5 text-red-500 fill-red-500 dark:text-red-400 dark:fill-red-400" />
                <h2 className="text-lg font-bold text-red-500 dark:text-red-400">인기 피드</h2>
            </div>

            <div className="space-y-3">
                {hotPosts.map(post => (
                    <CheerCard key={post.id} post={post} isHotItem />
                ))}
            </div>
        </div>
    );
}
