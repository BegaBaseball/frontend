import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchHotPosts, fetchPostChanges, fetchPosts, fetchFollowingPosts } from '../api/cheerApi';
import type { CheerPost } from '../api/cheerApi';
import { getCheerPostsFeedQueryKey } from '../hooks/cheerQueryKeys';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { resolveLatestVisiblePostId } from '../utils/cheerPolling';
import AdSlot from './ads/AdSlot';
import EndOfFeed from './EndOfFeed';
import ErrorBoundary from './common/ErrorBoundary';
import { ArrowUpIcon } from './icons/PublicShellIcons';
import CheerCard from './CheerCard';
import {
    CheerFeedEmptyState,
    CheerFeedErrorState,
    CheerFeedLoadingSkeleton,
    CheerFeedLoginRequiredState,
} from './CheerFeedStates';

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

    const cheerPostsQueryKey = useMemo(
        () => getCheerPostsFeedQueryKey(activeFeedTab, activePostType, activeSort),
        [activeFeedTab, activePostType, activeSort]
    );

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        error: queryError,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: cheerPostsQueryKey,
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
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
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

    const handleNewPostsClick = useCallback(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        queryClient.invalidateQueries({ queryKey: cheerPostsQueryKey, exact: true });
        setNewPostCount(0);
    }, [cheerPostsQueryKey, queryClient]);

    const handleRetryClick = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: cheerPostsQueryKey, exact: true });
    }, [cheerPostsQueryKey, queryClient]);

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
                    <CheerFeedLoadingSkeleton />
                ) : queryError ? (
                    <CheerFeedErrorState onRetry={handleRetryClick} />
                ) : activeFeedTab === 'following' && !isLoggedIn ? (
                    <CheerFeedLoginRequiredState teamColor={teamColor} onRequireLogin={onRequireLogin} />
                ) : currentPosts.length === 0 ? (
                    <CheerFeedEmptyState
                        feedTab={activeFeedTab}
                        teamColor={teamColor}
                        onWriteClick={onWriteClick}
                    />
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
                <div ref={sentinelRef} className="relative flex min-h-[calc(120px+var(--mobile-content-safe-bottom))] items-center justify-center lg:min-h-[120px]">
                    {showNextPageError ? (
                        <div className="flex flex-col items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-white">
                            <span className="font-bold">데이터를 불러오지 못했습니다.</span>
                            <p className="text-[16px] font-bold text-slate-400 dark:text-white">
                                네트워크 상태를 확인하고 다시 시도해 주세요
                            </p>
                            <button
                                type="button"
                                onClick={requestNextPage}
                                className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-[16px] font-bold text-slate-600 hover:bg-slate-50 dark:border-border dark:text-white dark:hover:bg-secondary"
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
                        <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-500 dark:text-white">
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
