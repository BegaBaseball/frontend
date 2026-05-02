import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchHotPosts, fetchPostChanges, fetchPosts, fetchFollowingPosts } from '../api/cheerApi';
import type { CheerPost } from '../api/cheerApi';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { resolveLatestVisiblePostId } from '../utils/cheerPolling';
import AdSlot from './ads/AdSlot';
import EndOfFeed from './EndOfFeed';
import ErrorBoundary from './common/ErrorBoundary';
import { AlertCircleIcon } from './icons/PublicFeatureIcons';
import { ArrowUpIcon } from './icons/PublicShellIcons';
import CheerCard from './CheerCard';

type FeedTabKey = 'all' | 'popular' | 'following';
type FeedItem = { type: 'post'; post: CheerPost } | { type: 'ad' };
const NEXT_PAGE_LOADER_MIN_MS = 350;

interface CheerFeedRuntimeContentProps {
    activeFeedTab: FeedTabKey;
    activePostType?: 'NORMAL' | 'NOTICE';
    activeSort?: string;
    isLoggedIn: boolean;
    teamColor: string;
    authUserId: number | null;
    onRequireLogin: () => void;
    onWriteClick: () => void;
}

export default function CheerFeedRuntimeContent({
    activeFeedTab,
    activePostType,
    activeSort,
    isLoggedIn,
    teamColor,
    authUserId,
    onRequireLogin,
    onWriteClick,
}: CheerFeedRuntimeContentProps) {
    const queryClient = useQueryClient();
    const [newPostCount, setNewPostCount] = useState(0);
    const [showNextPageLoader, setShowNextPageLoader] = useState(false);
    const [isSentinelIntersecting, setIsSentinelIntersecting] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    const newPostBannerStyle = useMemo(() => ({
        backgroundColor: `${teamColor}1A`,
        borderColor: `${teamColor}40`,
        color: teamColor,
    }), [teamColor]);

    const solidButtonStyle = useMemo(() => ({
        backgroundColor: teamColor,
    }), [teamColor]);

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
            if (!lastPage) {
                return undefined;
            }
            if (lastPage.last) return undefined;
            if (typeof lastPage.number === 'number') {
                return lastPage.number + 1;
            }
            return allPages.length;
        },
        initialPageParam: 0,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        enabled: activeFeedTab !== 'following' || isLoggedIn,
    });
    const hasNextPageRef = useRef(false);
    const isFetchingNextPageRef = useRef(false);
    const nextPageRequestInFlightRef = useRef(false);
    const fetchNextPageRef = useRef<typeof fetchNextPage | null>(null);
    const isNextPageRequestActive = isFetchingNextPage || nextPageRequestInFlightRef.current;

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
    const showNextPageError = Boolean(queryError && currentPosts.length > 0 && !showNextPageLoader);

    const feedItems = useMemo<FeedItem[]>(() => {
        const items: FeedItem[] = [];
        for (let i = 0; i < currentPosts.length; i++) {
            const post = currentPosts[i];
            if (post) items.push({ type: 'post', post });
            if (i === 3) items.push({ type: 'ad' });
        }
        return items;
    }, [currentPosts]);

    const virtualizer = useWindowVirtualizer({
        count: feedItems.length,
        estimateSize: () => 180,
        overscan: 5,
        scrollMargin: listRef.current?.offsetTop ?? 0,
    });

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
        hasNextPageRef.current = Boolean(hasNextPage);
        isFetchingNextPageRef.current = isFetchingNextPage || nextPageRequestInFlightRef.current;
        fetchNextPageRef.current = fetchNextPage;
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        let hideLoaderTimer: ReturnType<typeof setTimeout> | undefined;

        if (isNextPageRequestActive) {
            setShowNextPageLoader(true);
            return undefined;
        }

        if (showNextPageLoader) {
            hideLoaderTimer = setTimeout(() => {
                setShowNextPageLoader(false);
            }, NEXT_PAGE_LOADER_MIN_MS);
        }

        return () => {
            if (hideLoaderTimer) {
                clearTimeout(hideLoaderTimer);
            }
        };
    }, [isNextPageRequestActive, showNextPageLoader]);

    const requestNextPage = useCallback(() => {
        if (isFetchingNextPageRef.current || !hasNextPageRef.current || !fetchNextPageRef.current) {
            return;
        }

        nextPageRequestInFlightRef.current = true;
        isFetchingNextPageRef.current = true;
        setShowNextPageLoader(true);
        void fetchNextPageRef.current()
            .catch((error) => {
                console.error('Cheer feed pagination error:', error);
            })
            .finally(() => {
                nextPageRequestInFlightRef.current = false;
                isFetchingNextPageRef.current = false;
            });
    }, []);

    useEffect(() => {
        if (!sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0];
                const nextIsIntersecting = Boolean(entry?.isIntersecting);
                setIsSentinelIntersecting((current) => (
                    current === nextIsIntersecting ? current : nextIsIntersecting
                ));
                if (nextIsIntersecting) {
                    requestNextPage();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(sentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, [requestNextPage]);

    useEffect(() => {
        if (!isSentinelIntersecting || isNextPageRequestActive || !hasNextPage) {
            return;
        }

        requestNextPage();
    }, [hasNextPage, isNextPageRequestActive, isSentinelIntersecting, requestNextPage]);

    const handleNewPostsClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        queryClient.invalidateQueries({ queryKey: ['cheer-posts', activeFeedTab] });
        setNewPostCount(0);
    };

    return (
        <>
            <div className="contents" data-testid="cheer-new-post-banner-slot">
                {newPostCount > 0 && (
                    <button
                        type="button"
                        onClick={handleNewPostsClick}
                        className="sticky top-12 z-20 w-full backdrop-blur-sm min-h-11 text-[16px] font-bold transition-colors flex items-center justify-center gap-2 border-b"
                        style={newPostBannerStyle}
                    >
                        <ArrowUpIcon className="w-4 h-4" />
                        새 글 {newPostCount}개 보기
                    </button>
                )}
            </div>

            <section className="mt-3" data-testid="cheer-feed-section">
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
                            <AlertCircleIcon className="h-12 w-12 text-red-500 dark:text-red-400" />
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
                            className="min-h-11 rounded-full bg-slate-100 px-6 py-2.5 text-[16px] font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-secondary dark:text-gray-200 dark:hover:bg-secondary"
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
                            className="mt-4 min-h-11 rounded-full px-6 py-2 text-[16px] font-bold text-white"
                            style={solidButtonStyle}
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
                                <button
                                    type="button"
                                    onClick={onWriteClick}
                                    className="mt-4 min-h-11 rounded-full px-6 py-2 text-[16px] font-bold text-white shadow-sm transition-transform active:scale-[0.98]"
                                    style={solidButtonStyle}
                                >
                                    첫 글 작성하기
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div
                        ref={listRef}
                        className="relative"
                        style={{ height: `${virtualizer.getTotalSize()}px` }}
                    >
                        {virtualizer.getVirtualItems().map((virtualItem) => {
                            const item = feedItems[virtualItem.index];
                            if (!item) return null;
                            return (
                                <div
                                    key={virtualItem.key}
                                    data-index={virtualItem.index}
                                    ref={virtualizer.measureElement}
                                    className="absolute inset-x-0 top-0 px-4 pb-4"
                                    style={{
                                        transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                                    }}
                                >
                                    {item.type === 'ad' ? (
                                        <AdSlot
                                            slotId="cheer_feed_1"
                                            pageType="cheer_feed"
                                            listIndex={4}
                                            creativeType="native_card"
                                            loggedIn={Boolean(authUserId)}
                                            userId={authUserId ? String(authUserId) : null}
                                            minHeight={156}
                                        />
                                    ) : (
                                        <ErrorBoundary
                                            fallback={(
                                                <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-[16px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                                                    일부 게시글을 표시하는 중 오류가 발생했습니다. 다음 게시글부터 계속 볼 수 있습니다.
                                                </article>
                                            )}
                                        >
                                            <CheerCard post={item.post} />
                                        </ErrorBoundary>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                <div ref={sentinelRef} className="relative flex min-h-[120px] items-center justify-center">
                    {showNextPageError ? (
                        <div className="flex flex-col items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
                            <span className="font-bold">데이터를 불러오지 못했습니다.</span>
                            <p className="text-[16px] font-bold text-slate-400 dark:text-slate-300">
                                네트워크 상태를 확인하고 다시 시도해 주세요
                            </p>
                            <button
                                type="button"
                                onClick={requestNextPage}
                                className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-[16px] font-bold text-slate-600 hover:bg-slate-50 dark:border-border dark:text-gray-200 dark:hover:bg-secondary"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : null}
                    <div
                        aria-hidden={!showNextPageLoader}
                        aria-live={showNextPageLoader ? 'polite' : 'off'}
                        data-testid="cheer-feed-next-loader"
                        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${showNextPageLoader ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                    >
                        <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-gray-300">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="font-bold">불러오는 중...</span>
                        </div>
                    </div>
                    {!hasNextPage && currentPosts.length > 0 && !showNextPageLoader && !showNextPageError && (
                        <EndOfFeed />
                    )}
                </div>
            </section>
        </>
    );
}
