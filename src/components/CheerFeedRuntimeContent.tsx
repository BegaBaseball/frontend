import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchHotPosts, fetchPostChanges, fetchPosts, fetchFollowingPosts, searchPosts } from '../api/cheerApi';
import type { CheerPost } from '../api/cheerApi';
import { getCheerPostsFeedQueryKey } from '../hooks/cheerQueryKeys';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import {
    accumulateCheerPollingCount,
    advanceCheerPollingCursor,
    resolveLatestVisiblePostId,
} from '../utils/cheerPolling';
import { getNextPageParamFromPageResponse } from '../utils/pageResponsePagination';
import EndOfFeed from './EndOfFeed';
import ErrorBoundary from './common/ErrorBoundary';
import { ArrowUpIcon } from './icons/CheerFlowIcons';
import CheerCard from './CheerCard';
import {
    CheerFeedEmptyState,
    CheerFeedErrorState,
    CheerFeedLoadingSkeleton,
    CheerFeedLoginRequiredState,
} from './CheerFeedStates';
import { normalizeCheerSearchQuery } from './cheer/CheerPresentation';

const AdSlot = lazy(() => import('./ads/AdSlot'));

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
    searchQuery?: string;
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
    searchQuery = '',
}: CheerFeedRuntimeContentProps) {
    const queryClient = useQueryClient();
    const [newPostCount, setNewPostCount] = useState(0);
    const [showNextPageLoader, setShowNextPageLoader] = useState(false);
    const [isSentinelIntersecting, setIsSentinelIntersecting] = useState(false);
    const [isNextPageRequestInFlight, setIsNextPageRequestInFlight] = useState(false);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const listRef = useRef<HTMLDivElement | null>(null);

    const newPostBannerStyle = useMemo(() => ({
        backgroundColor: `${teamColor}1A`,
        borderColor: `${teamColor}40`,
        color: teamColor,
    }), [teamColor]);

    const normalizedSearchQuery = useMemo(
        () => normalizeCheerSearchQuery(searchQuery),
        [searchQuery]
    );
    const hasSearchQuery = normalizedSearchQuery.length > 0;
    const isSearchMode = normalizedSearchQuery.length >= 2;
    const cheerPostsQueryKey = useMemo(
        () => hasSearchQuery
            ? ['cheer-posts', 'search', normalizedSearchQuery, activeSort ?? 'default'] as const
            : getCheerPostsFeedQueryKey(activeFeedTab, activePostType, activeSort),
        [activeFeedTab, activePostType, activeSort, hasSearchQuery, normalizedSearchQuery]
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
            if (isSearchMode) {
                return searchPosts({
                    q: normalizedSearchQuery,
                    page: pageParam as number,
                    size: 20,
                    sort: activeSort,
                });
            }
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
        getNextPageParam: getNextPageParamFromPageResponse,
        initialPageParam: 0,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        enabled: hasSearchQuery
            ? isSearchMode
            : activeFeedTab !== 'following' || isLoggedIn,
    });
    const hasNextPageRef = useRef(false);
    const isFetchingNextPageRef = useRef(false);
    const nextPageRequestInFlightRef = useRef(false);
    const fetchNextPageRef = useRef<typeof fetchNextPage | null>(null);
    const isNextPageRequestActive = isFetchingNextPage || isNextPageRequestInFlight;

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
    const shouldShowNextPageLoader = Boolean(hasNextPage && showNextPageLoader);
    const showNextPageError = Boolean(queryError && currentPosts.length > 0 && !shouldShowNextPageLoader);

    const feedItems = useMemo<FeedItem[]>(() => {
        const items: FeedItem[] = [];
        for (let i = 0; i < currentPosts.length; i++) {
            const post = currentPosts[i];
            if (post) items.push({ type: 'post', post });
            if (!hasSearchQuery && i === 3) items.push({ type: 'ad' });
        }
        return items;
    }, [currentPosts, hasSearchQuery]);

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

    const pollingBaselineRef = useRef<number | null>(null);
    const pollingCursorRef = useRef<number | null>(null);
    const lastAppliedPollingCursorRef = useRef<number | null>(null);

    useEffect(() => {
        if (pollingBaselineRef.current !== latestVisiblePostId) {
            pollingBaselineRef.current = latestVisiblePostId;
            pollingCursorRef.current = latestVisiblePostId;
            lastAppliedPollingCursorRef.current = latestVisiblePostId;
        }
        setNewPostCount(0);
    }, [activeFeedTab, activePostType, activeSort, latestVisiblePostId, normalizedSearchQuery]);

    const { data: polledChanges } = useQuery({
        queryKey: ['cheer-polling-changes', activeFeedTab, latestVisiblePostId],
        queryFn: async () => {
            if (pollingBaselineRef.current !== latestVisiblePostId) {
                pollingBaselineRef.current = latestVisiblePostId;
                pollingCursorRef.current = latestVisiblePostId;
                lastAppliedPollingCursorRef.current = latestVisiblePostId;
            }
            const sinceId = pollingCursorRef.current ?? latestVisiblePostId;
            const changes = await fetchPostChanges({ sinceId });
            pollingCursorRef.current = advanceCheerPollingCursor(sinceId, changes.latestId);
            return { changes, sinceId };
        },
        refetchInterval: 15000,
        refetchIntervalInBackground: true,
        refetchOnWindowFocus: false,
        enabled: !hasSearchQuery && !isLoading && activeFeedTab === 'all' && latestVisiblePostId !== null,
    });

    useEffect(() => {
        if (!polledChanges) return;
        const appliedCursor = advanceCheerPollingCursor(
            polledChanges.sinceId,
            polledChanges.changes.latestId
        );
        const lastAppliedCursor = lastAppliedPollingCursorRef.current;
        if (appliedCursor === null || (lastAppliedCursor !== null && appliedCursor <= lastAppliedCursor)) {
            return;
        }
        lastAppliedPollingCursorRef.current = appliedCursor;
        if (polledChanges.changes.newCount > 0) {
            setNewPostCount((currentCount) => accumulateCheerPollingCount(
                currentCount,
                polledChanges.changes.newCount
            ));
        }
    }, [polledChanges]);

    useEffect(() => {
        hasNextPageRef.current = Boolean(hasNextPage);
        isFetchingNextPageRef.current = isFetchingNextPage || nextPageRequestInFlightRef.current;
        fetchNextPageRef.current = fetchNextPage;
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    useEffect(() => {
        let hideLoaderTimer: ReturnType<typeof setTimeout> | undefined;

        if (!hasNextPage) {
            setShowNextPageLoader(false);
            return undefined;
        }

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
    }, [hasNextPage, isNextPageRequestActive, showNextPageLoader]);

    const requestNextPage = useCallback(() => {
        if (isFetchingNextPageRef.current || !hasNextPageRef.current || !fetchNextPageRef.current) {
            return;
        }

        nextPageRequestInFlightRef.current = true;
        isFetchingNextPageRef.current = true;
        setIsNextPageRequestInFlight(true);
        setShowNextPageLoader(true);
        void fetchNextPageRef.current()
            .catch((error) => {
                console.error('Cheer feed pagination error:', error);
            })
            .finally(() => {
                nextPageRequestInFlightRef.current = false;
                isFetchingNextPageRef.current = false;
                setIsNextPageRequestInFlight(false);
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
                        className="sticky top-12 z-20 w-full backdrop-blur-sm min-h-11 text-body font-bold transition-colors flex items-center justify-center gap-2 border-b"
                        style={newPostBannerStyle}
                    >
                        <ArrowUpIcon className="w-4 h-4" />
                        새 글 {newPostCount}개 보기
                    </button>
                )}
            </div>

            <section className="mt-3" data-testid="cheer-feed-section">
                <div className="min-h-[72svh]">
                    {normalizedSearchQuery.length === 1 ? (
                        <div className="mx-4 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center dark:border-border dark:bg-card">
                            <p className="text-body font-black text-slate-900 dark:text-white">검색어를 두 글자 이상 입력해 주세요.</p>
                            <p className="mt-2 text-caption font-semibold text-slate-500 dark:text-slate-300">본문과 해시태그를 검색할 수 있습니다.</p>
                        </div>
                    ) : isLoading && currentPosts.length === 0 ? (
                        <CheerFeedLoadingSkeleton />
                    ) : queryError ? (
                        <CheerFeedErrorState onRetry={handleRetryClick} />
                    ) : !hasSearchQuery && activeFeedTab === 'following' && !isLoggedIn ? (
                        <CheerFeedLoginRequiredState teamColor={teamColor} onRequireLogin={onRequireLogin} />
                    ) : currentPosts.length === 0 ? (
                        isSearchMode ? (
                            <div className="mx-4 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center dark:border-border dark:bg-card">
                                <p className="text-lg font-black text-slate-900 dark:text-white">검색 결과가 없습니다.</p>
                                <p className="mt-2 text-body font-semibold text-slate-500 dark:text-slate-300">다른 본문이나 해시태그로 검색해 보세요.</p>
                            </div>
                        ) : (
                            <CheerFeedEmptyState
                                feedTab={activeFeedTab}
                                teamColor={teamColor}
                                onWriteClick={onWriteClick}
                            />
                        )
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
                                            <Suspense fallback={null}>
                                                <AdSlot
                                                    slotId="cheer_feed_1"
                                                    pageType="cheer_feed"
                                                    listIndex={4}
                                                    creativeType="native_card"
                                                    loggedIn={Boolean(authUserId)}
                                                    userId={authUserId ? String(authUserId) : null}
                                                    minHeight={156}
                                                />
                                            </Suspense>
                                        ) : (
                                            <ErrorBoundary
                                                fallback={(
                                                    <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-body font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
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
                </div>
                <div ref={sentinelRef} className="relative flex min-h-[220px] items-center justify-center">
                    {showNextPageError ? (
                        <div className="flex flex-col items-center gap-2 text-body font-semibold text-slate-500 dark:text-white">
                            <span className="font-bold">데이터를 불러오지 못했습니다.</span>
                            <p className="text-body font-bold text-slate-400 dark:text-white">
                                네트워크 상태를 확인하고 다시 시도해 주세요
                            </p>
                            <button
                                type="button"
                                onClick={requestNextPage}
                                className="min-h-11 rounded-full border border-slate-200 px-4 py-2 text-body font-bold text-slate-600 hover:bg-slate-50 dark:border-border dark:text-white dark:hover:bg-secondary"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : null}
                    <div
                        aria-hidden={!shouldShowNextPageLoader}
                        aria-live={shouldShowNextPageLoader ? 'polite' : 'off'}
                        data-testid="cheer-feed-next-loader"
                        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${shouldShowNextPageLoader ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                    >
                        <div className="flex items-center gap-2 text-body font-semibold text-slate-500 dark:text-white">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <span className="font-bold">불러오는 중...</span>
                        </div>
                    </div>
                    {!hasNextPage && currentPosts.length > 0 && !shouldShowNextPageLoader && !showNextPageError && (
                        <EndOfFeed />
                    )}
                </div>
            </section>
        </>
    );
}
