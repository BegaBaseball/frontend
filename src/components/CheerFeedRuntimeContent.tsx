import { useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowUp } from 'lucide-react';

import { fetchHotPosts, fetchPostChanges, fetchPosts, fetchFollowingPosts, type CheerPost } from '../api/cheerApi';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { resolveLatestVisiblePostId } from '../utils/cheerPolling';
import AdSlot from './ads/AdSlot';
import EndOfFeed from './EndOfFeed';
import ErrorBoundary from './common/ErrorBoundary';
import CheerCard from './CheerCard';

type FeedTabKey = 'all' | 'popular' | 'following';

interface CheerFeedRuntimeContentProps {
    activeFeedTab: FeedTabKey;
    activePostType?: 'NORMAL' | 'NOTICE';
    activeSort?: string;
    isLoggedIn: boolean;
    teamColor: string;
    authUserId: number | null;
    onRequireLogin: () => void;
}

export default function CheerFeedRuntimeContent({
    activeFeedTab,
    activePostType,
    activeSort,
    isLoggedIn,
    teamColor,
    authUserId,
    onRequireLogin,
}: CheerFeedRuntimeContentProps) {
    const queryClient = useQueryClient();
    const [newPostCount, setNewPostCount] = useState(0);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const retryCount = useRef(0);

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        error: queryError,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['cheer-posts', activeFeedTab],
        queryFn: ({ pageParam = 0 }) => {
            if (activeFeedTab === 'following') {
                return fetchFollowingPosts({
                    page: pageParam as number,
                    size: 20,
                });
            }
            if (activeFeedTab === 'popular') {
                return fetchHotPosts({
                    page: pageParam as number,
                    size: 20,
                    algorithm: 'HYBRID',
                });
            }
            return fetchPosts({
                page: pageParam as number,
                size: 20,
                postType: activePostType,
                sort: activeSort,
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage || !lastPage.content || lastPage.content.length === 0) {
                return undefined;
            }
            if (lastPage.last) return undefined;
            return allPages.length;
        },
        initialPageParam: 0,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        enabled: activeFeedTab !== 'following' || isLoggedIn,
    });

    const currentPosts = useMemo(() => {
        if (!data?.pages) return [];
        const flattened = data.pages.flatMap((page) => page?.content ?? []);
        const seen = new Set<number>();
        return flattened.filter((post) => {
            if (!post || !post.id) return false;
            if (seen.has(post.id)) return false;
            seen.add(post.id);
            return true;
        });
    }, [data]);

    const latestVisiblePostId = useMemo(
        () => resolveLatestVisiblePostId(currentPosts),
        [currentPosts]
    );

    const { data: polledChanges } = useQuery({
        queryKey: ['cheer-polling-changes', activeFeedTab, latestVisiblePostId],
        queryFn: () => fetchPostChanges({ sinceId: latestVisiblePostId }),
        refetchInterval: 15000,
        enabled: !isLoading && activeFeedTab === 'all' && latestVisiblePostId !== null,
    });

    useEffect(() => {
        if (!polledChanges) return;
        if (polledChanges.newCount > 0) {
            setNewPostCount(polledChanges.newCount);
        }
    }, [polledChanges]);

    useEffect(() => {
        try {
            if (!isFetchingNextPage && hasNextPage && data?.pages) {
                const lastPage = data.pages[data.pages.length - 1];

                if (lastPage?.content?.length > 0) {
                    const lastPageIds = new Set(
                        (lastPage.content as CheerPost[])
                            .filter((post) => post && typeof post.id === 'number')
                            .map((post) => post.id)
                    );

                    const previousPagesContent = data.pages.slice(0, -1).flatMap((page) => page.content ?? []);
                    const previousIds = new Set(
                        (previousPagesContent as CheerPost[])
                            .filter((post) => post && typeof post.id === 'number')
                            .map((post) => post.id)
                    );

                    const newUniqueItems = [...lastPageIds].filter((id) => !previousIds.has(id)).length;

                    if (newUniqueItems === 0 && retryCount.current < 5) {
                        retryCount.current += 1;
                        fetchNextPage();
                    } else if (newUniqueItems > 0) {
                        retryCount.current = 0;
                    }
                }
            }
        } catch (error) {
            console.error('Smart Retry Logic Error:', error);
        }
    }, [data, fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        if (!sentinelRef.current) return;
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                if (!entry?.isIntersecting) return;
                if (isFetchingNextPage || !hasNextPage) return;
                fetchNextPage();
            },
            { rootMargin: '200px' }
        );

        observerRef.current.observe(sentinelRef.current);

        return () => {
            observerRef.current?.disconnect();
        };
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    const handleNewPostsClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        queryClient.invalidateQueries({ queryKey: ['cheer-posts', activeFeedTab] });
        setNewPostCount(0);
    };

    return (
        <>
            {newPostCount > 0 && (
                <button
                    type="button"
                    onClick={handleNewPostsClick}
                    className="sticky top-12 z-20 w-full backdrop-blur-sm min-h-11 text-[16px] font-bold transition-colors flex items-center justify-center gap-2 border-b"
                    style={{
                        backgroundColor: `${teamColor}1A`,
                        borderColor: `${teamColor}40`,
                        color: teamColor,
                    }}
                >
                    <ArrowUp className="w-4 h-4" />
                    새 글 {newPostCount}개 보기
                </button>
            )}

            <section className="mt-4">
                {isLoading && currentPosts.length === 0 ? (
                    <div className="divide-y divide-border/70 dark:divide-border/70">
                        {[1, 2, 3].map((index) => (
                            <div key={index} className="px-4 py-4 animate-pulse">
                                <div className="flex gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-secondary flex-shrink-0" />
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-24 bg-slate-200 dark:bg-secondary rounded" />
                                            <div className="h-3 w-16 bg-slate-200 dark:bg-secondary rounded" />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-4 w-full bg-slate-200 dark:bg-secondary rounded" />
                                            <div className="h-4 w-5/6 bg-slate-200 dark:bg-secondary rounded" />
                                            <div className="h-4 w-4/6 bg-slate-200 dark:bg-secondary rounded" />
                                        </div>
                                        <div className="flex gap-4 pt-2">
                                            <div className="h-4 w-12 bg-slate-200 dark:bg-secondary rounded" />
                                            <div className="h-4 w-12 bg-slate-200 dark:bg-secondary rounded" />
                                            <div className="h-4 w-12 bg-slate-200 dark:bg-secondary rounded" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : queryError ? (
                    <div className="py-8 sm:py-10 px-4 sm:px-6 flex flex-col items-center justify-center gap-4">
                        <div className="flex flex-col items-center gap-3">
                            <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
                            <div className="text-center">
                                <p className="text-[16px] font-bold text-red-500 dark:text-red-400">
                                    데이터를 불러오지 못했습니다
                                </p>
                                <p className="mt-1 text-[16px] font-bold text-slate-500 dark:text-gray-300">
                                    네트워크 상태를 확인하고 다시 시도해 주세요
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['cheer-posts', activeFeedTab] })}
                            className="rounded-full bg-slate-100 dark:bg-secondary px-6 py-2.5 text-[16px] font-bold text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-secondary transition-colors"
                        >
                            다시 시도
                        </button>
                    </div>
                ) : activeFeedTab === 'following' && !isLoggedIn ? (
                    <div className="border-b border-border/70 dark:border-border px-4 sm:px-6 py-8 sm:py-10 text-center">
                        <p className="text-[#64748B] font-bold dark:text-gray-300">로그인이 필요합니다</p>
                        <p className="mt-1 text-[16px] font-bold text-slate-400 dark:text-gray-300">팔로우한 유저의 글을 보려면 로그인해주세요.</p>
                        <button
                            type="button"
                            onClick={onRequireLogin}
                            className="mt-4 rounded-full px-6 py-2 text-[16px] font-bold text-white"
                            style={{ backgroundColor: teamColor }}
                        >
                            로그인하기
                        </button>
                    </div>
                ) : currentPosts.length === 0 ? (
                    <div className="border-b border-border/70 dark:border-border px-4 sm:px-6 py-8 sm:py-10 text-center">
                        {activeFeedTab === 'following' ? (
                            <>
                                <p className="text-[#64748B] font-bold dark:text-gray-300">팔로우한 유저가 없습니다</p>
                                <p className="mt-1 text-[16px] font-bold text-slate-400 dark:text-gray-300">다른 유저를 팔로우하면 여기에 글이 표시됩니다!</p>
                            </>
                        ) : (
                            <>
                                <p className="text-[#64748B] font-bold dark:text-gray-300">아직 작성된 응원글이 없습니다.</p>
                                <p className="mt-1 text-[16px] font-bold text-slate-400 dark:text-gray-300">첫 번째 응원글을 남겨보세요!</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="px-4 py-4 space-y-4">
                        {currentPosts.flatMap((post, index) => [
                            <ErrorBoundary
                                key={post.id}
                                fallback={(
                                <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[16px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                                        일부 게시글을 표시하는 중 오류가 발생했습니다. 다음 게시글부터 계속 볼 수 있습니다.
                                    </article>
                                )}
                            >
                                <CheerCard post={post} />
                            </ErrorBoundary>,
                            index === 3 ? (
                                <AdSlot
                                    key="cheer-feed-1"
                                    slotId="cheer_feed_1"
                                    pageType="cheer_feed"
                                    listIndex={4}
                                    creativeType="native_card"
                                    loggedIn={Boolean(authUserId)}
                                    userId={authUserId ? String(authUserId) : null}
                                    minHeight={156}
                                />
                            ) : null,
                        ])}
                    </div>
                )}
                <div ref={sentinelRef} className="flex min-h-[120px] items-center justify-center">
                    {queryError && currentPosts.length > 0 ? (
                        <div className="flex flex-col items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
                                <span className="font-bold">데이터를 불러오지 못했습니다.</span>
                            <p className="text-[16px] font-bold text-slate-400 dark:text-slate-300">
                                네트워크 상태를 확인하고 다시 시도해 주세요
                            </p>
                            <button
                                type="button"
                                onClick={() => fetchNextPage()}
                                className="rounded-full border border-slate-200 dark:border-border px-4 py-1.5 text-[16px] font-bold text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-secondary"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : isFetchingNextPage ? (
                        <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="font-bold">불러오는 중...</span>
                        </div>
                    ) : null}
                    {!hasNextPage && currentPosts.length > 0 && !isFetchingNextPage && (
                        <EndOfFeed />
                    )}
                </div>
            </section>
        </>
    );
}
