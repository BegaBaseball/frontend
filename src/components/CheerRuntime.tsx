import { lazy, memo, Suspense, startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthProfileActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useCheerRecentSearchStore } from '../store/cheerRecentSearchStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { TEAM_DATA } from '../constants/teams';
import { fetchHotPosts, getTeamNameById } from '../api/cheerApi';
import { fetchTeamFranchiseMetadata } from '../api/teamFranchiseApi';
import TeamLogo from './TeamLogo';
import {
    BookmarkIcon,
    HomeIcon,
    LineChartIcon,
    MegaphoneIcon,
    PenSquareIcon,
    SearchIcon,
    UserIcon,
    XIcon,
} from './icons/CheerShellIcons';
import {
    normalizeHexColor,
    getReadableAccent,
    getDarkModeAccentText,
    DEFAULT_BRAND_COLOR,
} from '../utils/teamColors';
import { useTheme } from '../hooks/useTheme';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { scheduleAfterNextPaint } from '../utils/afterNextPaint';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { useDebounce } from '../hooks/useDebounce';
import CheerMobileBottomNav from './CheerMobileBottomNav';
import {
    getAccessibleCheerTextColor,
    normalizeCheerSearchQuery,
    resolveCheerContentFeedTab,
    resolveCheerSurface,
    resolveCheerTabFromParam,
    type CheerTabKey,
} from './cheer/CheerPresentation';

const LazyCheerComposerRuntime = lazy(() => import('./CheerComposerRuntime'));
const LazyCheerSidebarPanels = lazy(() => import('./CheerSidebarPanels'));
const LazyCheerFeedRuntimeContent = lazy(() => import('./CheerFeedRuntimeContent'));
const LazyCheerLivePanel = lazy(() => import('./CheerLivePanel'));
type FeedTabConfig = {
    key: CheerTabKey;
    label: string;
    postType?: 'NORMAL' | 'NOTICE';
    requireAuth?: boolean;
    sort?: string;
};

type CheerFeedTabsProps = {
    tabs: FeedTabConfig[];
    activeTab: CheerTabKey;
    activeAccentText: string;
    onTabChange: (tab: CheerTabKey) => void;
};

const CheerFeedTabs = memo(function CheerFeedTabs({
    tabs,
    activeTab,
    activeAccentText,
    onTabChange,
}: CheerFeedTabsProps) {
    const [selectedTab, setSelectedTab] = useState<CheerTabKey>(activeTab);

    useEffect(() => {
        setSelectedTab(activeTab);
    }, [activeTab]);

    return (
        <nav className="flex items-center border-b border-border/70 bg-white/80 px-4 py-1 dark:border-border dark:bg-card">
            <div className="flex items-center gap-0.5 rounded-full bg-[var(--cheer-panel-bg)] p-0.5">
                {tabs.map((tab) => {
                    const isActive = selectedTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => {
                                setSelectedTab(tab.key);
                                onTabChange(tab.key);
                            }}
                            className={cn(
                                'relative flex min-h-11 items-center rounded-full px-3 py-0 text-caption font-bold transition-all duration-200 sm:px-3.5 sm:text-15',
                                isActive
                                    ? 'bg-[var(--cheer-seg-on)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                                    : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] dark:text-white dark:hover:bg-secondary dark:hover:text-white active:scale-[0.98]'
                            )}
                            style={isActive ? { color: activeAccentText } : undefined}
                        >
                            <span className="relative z-10 inline-flex items-center gap-1.5">
                                {tab.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
});

const CheerFeedRuntimeFallback = () => (
    <section className="mt-4 min-h-[88svh] divide-y divide-border/70 dark:divide-border/70">
        <div className="px-4 pb-1 pt-3">
            <p className="text-18 font-bold leading-snug tracking-normal text-slate-600 dark:text-white">
                응원글을 불러오는 중입니다.
            </p>
        </div>
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
    </section>
);

export interface CheerProps {
    openComposerOnMount?: boolean;
}

export default function CheerRuntime({ openComposerOnMount = false }: CheerProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const {
        userId: authUserId,
        userEmail: authUserEmail,
        userHandle: authUserHandle,
        userName: authUserName,
        userFavoriteTeam: authUserFavoriteTeam,
        userFavoriteTeamColor: authUserFavoriteTeamColor,
        userProfileImageUrl: authUserProfileImageUrl,
    } = useAuthProfileSnapshot();
    const { isLoggedIn, isAuthLoading } = useAuthSession();
    const { fetchProfileAndAuthenticate } = useAuthProfileActions();
    const feedTabs = useMemo<FeedTabConfig[]>(
        () => [
            { key: 'all', label: '전체', postType: undefined },
            { key: 'popular', label: '인기', postType: undefined },
            { key: 'following', label: '팔로우', postType: undefined, requireAuth: true },
            { key: 'live', label: '라이브', postType: undefined },
        ],
        []
    );
    const [contentFeedTab, setContentFeedTab] = useState<CheerTabKey>(() => (
        resolveCheerTabFromParam(searchParams.get('tab'))
    ));
    const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [shouldRenderFeedRuntime, setShouldRenderFeedRuntime] = useState(false);
    const {
        recentSearches,
        addRecentSearch,
        removeRecentSearch,
        clearRecentSearches,
    } = useCheerRecentSearchStore();
    const normalizedSearchQuery = useMemo(
        () => normalizeCheerSearchQuery(searchQuery),
        [searchQuery]
    );
    const debouncedSearchQuery = useDebounce(normalizedSearchQuery, 250);
    const [shouldRenderSidebar, setShouldRenderSidebar] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth >= 768 : false
    ));
    const hasFetchedProfile = useRef(false);
    const pendingFeedTabTransitionRef = useRef<(() => void) | null>(null);
    const committedUrlSearchQueryRef = useRef(normalizeCheerSearchQuery(searchParams.get('q') || ''));
    const hasFavoriteTeam = Boolean(authUserFavoriteTeam && authUserFavoriteTeam !== '없음');
    const userDisplayName = authUserName || authUserEmail || '나';
    const userProfilePath = authUserHandle
        ? `/profile/${authUserHandle.startsWith('@') ? authUserHandle : `@${authUserHandle}`}`
        : '/mypage';
    const redirectToLogin = (replace = true) => {
        toast.error('로그인이 필요한 서비스입니다.');
        navigate(buildLoginPath(getCurrentRelativeUrl()), replace ? { replace: true } : undefined);
    };

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isLoggedIn) return;
        if (hasFavoriteTeam) return;
        if (hasFetchedProfile.current) return;

        hasFetchedProfile.current = true;
        fetchProfileAndAuthenticate();
    }, [fetchProfileAndAuthenticate, hasFavoriteTeam, isAuthLoading, isLoggedIn]);

    useEffect(() => {
        const nextTab = resolveCheerTabFromParam(searchParams.get('tab'));

        pendingFeedTabTransitionRef.current?.();
        pendingFeedTabTransitionRef.current = null;
        setContentFeedTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
    }, [feedTabs, searchParams]);

    useEffect(() => {
        return () => {
            pendingFeedTabTransitionRef.current?.();
        };
    }, []);

    useEffect(() => {
        const urlQuery = normalizeCheerSearchQuery(searchParams.get('q') || '');
        if (urlQuery === committedUrlSearchQueryRef.current) return;
        committedUrlSearchQueryRef.current = urlQuery;
        setSearchQuery(urlQuery);
    }, [searchParams]);

    useEffect(() => {
        const committedQuery = debouncedSearchQuery.length >= 2 ? debouncedSearchQuery : '';
        setSearchParams((currentParams) => {
            const nextSearchParams = new URLSearchParams(currentParams);
            if (committedQuery) {
                nextSearchParams.set('q', committedQuery);
            } else {
                nextSearchParams.delete('q');
            }

            if (nextSearchParams.toString() === currentParams.toString()) return currentParams;
            committedUrlSearchQueryRef.current = committedQuery;
            return nextSearchParams;
        }, { replace: true });
    }, [debouncedSearchQuery, setSearchParams]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia('(min-width: 768px)');
        const syncSidebarVisibility = () => {
            setShouldRenderSidebar(mediaQuery.matches);
        };

        syncSidebarVisibility();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', syncSidebarVisibility);
            return () => mediaQuery.removeEventListener('change', syncSidebarVisibility);
        }

        mediaQuery.addListener(syncSidebarVisibility);
        return () => mediaQuery.removeListener(syncSidebarVisibility);
    }, []);

    useEffect(() => {
        if (!shouldRenderSidebar) {
            return;
        }

        void queryClient.prefetchQuery({
            queryKey: ['cheer-hot', 'HYBRID'],
            queryFn: () => fetchHotPosts({ page: 0, size: 5, algorithm: 'HYBRID' }),
            staleTime: 3 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        });
    }, [queryClient, shouldRenderSidebar]);

    const buildCheerWritePath = () => {
        const nextSearchParams = new URLSearchParams();
        const currentTab = resolveCheerTabFromParam(searchParams.get('tab'));

        if (currentTab === 'popular' || currentTab === 'following') {
            nextSearchParams.set('tab', currentTab);
        }

        const nextSearch = nextSearchParams.toString();
        return `/cheer/write${nextSearch ? `?${nextSearch}` : ''}`;
    };

    const handleWriteClick = () => {
        if (!isLoggedIn) {
            toast.error('로그인이 필요한 서비스입니다.');
            navigate(buildLoginPath(buildCheerWritePath()));
            return;
        }
        navigate(buildCheerWritePath());
    };

    const handleFeedTabChange = (nextTab: CheerTabKey) => {
        pendingFeedTabTransitionRef.current?.();
        pendingFeedTabTransitionRef.current = scheduleAfterNextPaint(() => {
            pendingFeedTabTransitionRef.current = null;
            startTransition(() => {
                setContentFeedTab(nextTab);
                setSearchParams((currentParams) => {
                    const nextSearchParams = new URLSearchParams(currentParams);
                    if (nextTab === feedTabs[0].key) {
                        nextSearchParams.delete('tab');
                    } else {
                        nextSearchParams.set('tab', nextTab);
                    }
                    if (normalizedSearchQuery.length >= 2) {
                        nextSearchParams.set('q', normalizedSearchQuery);
                    } else {
                        nextSearchParams.delete('q');
                    }
                    committedUrlSearchQueryRef.current = normalizedSearchQuery.length >= 2
                        ? normalizedSearchQuery
                        : '';
                    return nextSearchParams;
                }, { replace: true });
            });
        });
    };

    const { resolvedTheme } = useTheme();
    const teamColor = normalizeHexColor(authUserFavoriteTeamColor || DEFAULT_BRAND_COLOR);
    const teamAccent = getReadableAccent(teamColor);
    const teamContrastText = getAccessibleCheerTextColor(teamAccent);
    const tabActiveAccentText = resolvedTheme === 'dark'
        ? getDarkModeAccentText(teamColor)
        : teamAccent;
    const favoriteTeamId = hasFavoriteTeam ? authUserFavoriteTeam ?? null : null;
    const favoriteTeamLabel = favoriteTeamId ? TEAM_DATA[favoriteTeamId]?.name ?? favoriteTeamId : null;
    const favoriteTeamFull = favoriteTeamId ? TEAM_DATA[favoriteTeamId]?.fullName ?? favoriteTeamId : null;
    const teamId = favoriteTeamId ?? 'all';
    const teamLogoId = favoriteTeamId ?? undefined;
    const rawTeamName = favoriteTeamId ? getTeamNameById(favoriteTeamId) : 'KBO 리그';
    const teamLabel = favoriteTeamId
        ? (TEAM_DATA[favoriteTeamId]?.name || rawTeamName.split(' ')[0])
        : 'KBO';
    const teamName = favoriteTeamId
        ? (TEAM_DATA[favoriteTeamId]?.fullName || rawTeamName)
        : rawTeamName;
    const {
        data: teamMetadata,
        isLoading: isTeamMetadataLoading,
        isError: isTeamMetadataError,
        refetch: refetchTeamMetadata,
    } = useQuery({
        queryKey: ['cheer-team-metadata', teamId],
        queryFn: () => fetchTeamFranchiseMetadata(favoriteTeamId!),
        enabled: Boolean(favoriteTeamId),
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });
    const teamDescription = useMemo(() => {
        if (!teamMetadata) return '멋진 선택이에요! 함께 응원하며 즐거운 야구 생활을 시작해보세요.';
        if (teamMetadata.summary) return teamMetadata.summary;
        if (teamMetadata.description) return teamMetadata.description;

        const metadataFields = [
            teamMetadata.homeStadium ? `홈구장: ${formatStadiumDisplayName(teamMetadata.homeStadium)}` : '',
            teamMetadata.foundedYear ? `창단: ${teamMetadata.foundedYear}` : '',
            teamMetadata.owner ? `구단주: ${teamMetadata.owner}` : '',
            teamMetadata.homepage ? `홈페이지: ${teamMetadata.homepage}` : '',
        ].filter(Boolean);

        return metadataFields.length > 0
            ? metadataFields.join(' · ')
            : '멋진 선택이에요! 함께 응원하며 즐거운 야구 생활을 시작해보세요.';
    }, [teamMetadata]);
    const activeContentFeedTab = resolveCheerContentFeedTab(contentFeedTab);
    const activeTabConfig = feedTabs.find((item) => item.key === activeContentFeedTab);
    const activeSurface = resolveCheerSurface(contentFeedTab, normalizedSearchQuery);
    const isSearchSettling = activeSurface === 'search' && debouncedSearchQuery !== normalizedSearchQuery;

    useEffect(() => {
        if (activeSurface === 'live' || shouldRenderFeedRuntime) {
            return undefined;
        }

        return scheduleAfterNextPaint(() => {
            startTransition(() => setShouldRenderFeedRuntime(true));
        });
    }, [activeSurface, shouldRenderFeedRuntime]);

    return (
        <div className="min-h-screen bg-[#f7f9f9] pb-[var(--mobile-content-safe-bottom)] dark:bg-background md:pb-0">
            <div className="px-4 pt-0 pb-6 sm:px-6 sm:pt-0 sm:pb-8">
                <div className="mx-auto w-full max-w-[1008px] xl:max-w-[1136px] lg:-translate-x-4">
                    <div className="grid grid-cols-1 gap-0 md:grid-cols-[1fr_264px] md:gap-x-4 lg:grid-cols-[68px_1fr_264px] xl:grid-cols-[200px_1fr_270px]">
                        <aside className="hidden lg:flex w-[68px] xl:w-[200px] flex-col gap-3 sticky top-24 self-start px-2 xl:px-3">
                            {[
                                { id: 'home', label: '홈', icon: HomeIcon, path: '/home' },
                                { id: 'team', label: '응원석', icon: MegaphoneIcon, path: '/cheer' },
                                { id: 'live', label: '전력분석실', icon: LineChartIcon, path: '/prediction' },
                                { id: 'profile', label: '프로필', icon: UserIcon, path: userProfilePath },
                                { id: 'bookmarks', label: '북마크', icon: BookmarkIcon, path: '/cheer/bookmarks' },
                            ].map((item) => {
                                const Icon = item.icon;
                                const isActive = item.id === 'team';
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
                                        style={isActive ? { backgroundColor: `${teamColor}1A` } : undefined}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="hidden xl:inline">{item.label}</span>
                                    </button>
                                );
                            })}

                            {/* 태블릿 가로(1024-1279): 원형 46px 버튼. 데스크탑(≥1280): 팀 액센트 채움 버튼 */}
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

                        <main className="relative flex w-full flex-col gap-0 bg-slate-50/50 dark:bg-card md:pb-24 lg:pb-0">
                            <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-border dark:bg-card">
                                <div
                                    className="relative"
                                    onFocus={() => setIsSearchFocused(true)}
                                    onBlur={(event) => {
                                        if (!event.currentTarget.contains(event.relatedTarget)) {
                                            setIsSearchFocused(false);
                                        }
                                    }}
                                >
                                    <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(event) => setSearchQuery(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && normalizedSearchQuery.length >= 2) {
                                                addRecentSearch(normalizedSearchQuery);
                                            }
                                            if (event.key === 'Escape') {
                                                setIsSearchFocused(false);
                                                event.currentTarget.blur();
                                            }
                                        }}
                                        aria-label="응원글 검색"
                                        placeholder="응원글, 해시태그 검색"
                                        className="min-h-11 w-full rounded-full border border-transparent bg-[var(--cheer-panel-bg)] py-2 pl-11 pr-11 text-body font-semibold text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:bg-[var(--cheer-card-bg)] focus:ring-2 focus:ring-slate-200 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-slate-500 dark:focus:ring-slate-700"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            aria-label="검색어 지우기"
                                            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 active:scale-[0.98] dark:text-white dark:hover:bg-slate-700"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                    {isSearchFocused && !searchQuery && recentSearches.length > 0 ? (
                                        <div
                                            className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-40 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-border dark:bg-card"
                                            data-testid="cheer-recent-searches"
                                        >
                                            <div className="flex items-center justify-between px-1 pb-2">
                                                <p className="text-caption font-black text-slate-700 dark:text-white">최근 검색</p>
                                                <button
                                                    type="button"
                                                    className="min-h-9 rounded-full px-3 text-caption font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-secondary"
                                                    onClick={clearRecentSearches}
                                                >
                                                    전체 삭제
                                                </button>
                                            </div>
                                            <ul className="space-y-1">
                                                {recentSearches.map((term) => (
                                                    <li key={term} className="flex items-center gap-1">
                                                        <button
                                                            type="button"
                                                            className="min-h-10 min-w-0 flex-1 truncate rounded-xl px-3 text-left text-body font-bold text-slate-700 hover:bg-slate-100 dark:text-white dark:hover:bg-secondary"
                                                            onClick={() => setSearchQuery(term)}
                                                        >
                                                            {term}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-label={`${term} 최근 검색 삭제`}
                                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-secondary dark:hover:text-white"
                                                            onClick={() => removeRecentSearch(term)}
                                                        >
                                                            <XIcon className="h-4 w-4" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}
                                </div>
                            </header>
                            <CheerFeedTabs
                                tabs={feedTabs}
                                activeTab={contentFeedTab}
                                activeAccentText={tabActiveAccentText}
                                onTabChange={handleFeedTabChange}
                            />
                            {activeSurface === 'feed' && (
                              <Suspense
                                fallback={(
                                    <section className="relative mx-4 mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-border dark:bg-card">
                                        <div className="flex animate-pulse gap-3">
                                            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 dark:bg-secondary" />
                                            <div className="flex-1 space-y-3">
                                                <div className="h-5 w-full rounded bg-slate-200 dark:bg-secondary" />
                                                <div className="h-5 w-5/6 rounded bg-slate-200 dark:bg-secondary" />
                                                <div className="flex items-center justify-between border-t border-border/70 pt-2 dark:border-border">
                                                    <div className="flex gap-2">
                                                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-secondary" />
                                                        <div className="h-6 w-6 rounded-full bg-slate-200 dark:bg-secondary" />
                                                    </div>
                                                    <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-secondary" />
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            >
                                <LazyCheerComposerRuntime
                                    openComposerOnMount={openComposerOnMount}
                                    isAuthLoading={isAuthLoading}
                                    isLoggedIn={isLoggedIn}
                                    hasFavoriteTeam={hasFavoriteTeam}
                                    authUserEmail={authUserEmail}
                                    authUserHandle={authUserHandle}
                                    authUserName={authUserName}
                                    authUserFavoriteTeam={authUserFavoriteTeam}
                                    authUserProfileImageUrl={authUserProfileImageUrl}
                                    activeFeedTab={activeContentFeedTab}
                                    activePostType={activeTabConfig?.postType}
                                    activeSort={activeTabConfig?.sort}
                                    teamColor={teamColor}
                                    teamAccent={teamAccent}
                                    teamContrastText={teamContrastText}
                                    teamLabel={teamLabel}
                                    teamLogoId={teamLogoId}
                                    userDisplayName={userDisplayName}
                                    onRequireLogin={(replace = true) => redirectToLogin(replace)}
                                />
                              </Suspense>
                            )}
                            {activeSurface === 'live' ? (
                                <Suspense
                                    fallback={(
                                        <section className="mx-4 mt-4 animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card">
                                            <div className="h-5 w-32 rounded bg-slate-200 dark:bg-secondary" />
                                            <div className="mt-5 h-24 rounded-xl bg-slate-100 dark:bg-secondary" />
                                        </section>
                                    )}
                                >
                                    <LazyCheerLivePanel
                                        favoriteTeamId={favoriteTeamId}
                                        favoriteTeamLabel={favoriteTeamLabel}
                                        favoriteTeamFull={favoriteTeamFull}
                                        teamAccent={teamAccent}
                                        onGoPrediction={() => navigate('/prediction')}
                                    />
                                </Suspense>
                            ) : isSearchSettling ? (
                                <section className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-8 dark:border-border dark:bg-card">
                                    <div className="space-y-3 animate-pulse">
                                        <div className="h-4 w-36 rounded bg-slate-200 dark:bg-secondary" />
                                        <div className="h-16 rounded-xl bg-slate-100 dark:bg-secondary" />
                                        <div className="h-16 rounded-xl bg-slate-100 dark:bg-secondary" />
                                    </div>
                                </section>
                            ) : shouldRenderFeedRuntime ? (
                              <Suspense
                                fallback={<CheerFeedRuntimeFallback />}
                            >
                                <LazyCheerFeedRuntimeContent
                                    activeFeedTab={activeContentFeedTab}
                                    activePostType={activeTabConfig?.postType}
                                    activeSort={activeTabConfig?.sort}
                                    isLoggedIn={isLoggedIn}
                                    teamColor={teamColor}
                                    authUserId={authUserId}
                                    onRequireLogin={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                                    onWriteClick={handleWriteClick}
                                    searchQuery={activeSurface === 'search' ? debouncedSearchQuery : ''}
                                />
                              </Suspense>
                            ) : (<CheerFeedRuntimeFallback />)}
                        </main>

                        {shouldRenderSidebar ? (
                            <aside className="sticky top-24 hidden w-[264px] self-start md:flex xl:w-[270px]">
                                <Suspense
                                    fallback={(
                                        <div className="flex w-full flex-col gap-4">
                                            <div className="rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card">
                                                <div className="space-y-3">
                                                    <div className="h-5 w-28 rounded bg-slate-100 dark:bg-secondary" />
                                                    <div className="h-14 rounded bg-slate-100 dark:bg-secondary" />
                                                    <div className="h-20 rounded bg-slate-100 dark:bg-secondary" />
                                                </div>
                                            </div>
                                            <div className="rounded-2xl border border-border/70 bg-white p-4 dark:border-border dark:bg-card">
                                                <div className="space-y-3">
                                                    <div className="h-5 w-20 rounded bg-slate-100 dark:bg-secondary" />
                                                    <div className="h-24 rounded bg-slate-100 dark:bg-secondary" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                >
                                    <LazyCheerSidebarPanels
                                        teamLogoId={teamLogoId}
                                        teamLabel={teamLabel}
                                        teamName={teamName}
                                        teamId={teamId}
                                        isTeamMetadataLoading={isTeamMetadataLoading}
                                        isTeamMetadataError={isTeamMetadataError}
                                        onRefetchTeamMetadata={() => {
                                            void refetchTeamMetadata();
                                        }}
                                        teamDescription={teamDescription}
                                        favoriteTeamId={favoriteTeamId}
                                        favoriteTeamLabel={favoriteTeamLabel}
                                        favoriteTeamFull={favoriteTeamFull}
                                        onGoPrediction={() => navigate('/prediction')}
                                        teamAccent={teamAccent}
                                    />
                                </Suspense>
                            </aside>
                        ) : null}
                    </div>
                </div>
            </div>

            <CheerMobileBottomNav
                activeItem="team"
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
