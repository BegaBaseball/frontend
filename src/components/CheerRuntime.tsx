import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthProfileActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { TEAM_DATA } from '../constants/teams';
import { getTeamNameById } from '../api/cheerApi';
import { fetchTeamFranchiseMetadata } from '../api/teamFranchiseApi';
import { useGamesData } from '../api/home';
import { Game as HomeGame } from '../types/home';
import TeamLogo from './TeamLogo';
import {
    BookmarkIcon,
    HomeIcon,
    LineChartIcon,
    MegaphoneIcon,
    PenSquareIcon,
    UserIcon,
} from './icons/PublicShellIcons';
import {
    normalizeHexColor,
    getReadableAccent,
    getContrastText,
    DEFAULT_BRAND_COLOR,
} from '../utils/teamColors';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import CheerMobileBottomNav from './CheerMobileBottomNav';

const LazyCheerComposerRuntime = lazy(() => import('./CheerComposerRuntime'));
const LazyCheerSidebarPanels = lazy(() => import('./CheerSidebarPanels'));
const LazyCheerFeedRuntimeContent = lazy(() => import('./CheerFeedRuntimeContent'));
type FeedTabKey = 'all' | 'popular' | 'following';
type FeedTabConfig = {
    key: FeedTabKey;
    label: string;
    postType?: 'NORMAL' | 'NOTICE';
    requireAuth?: boolean;
    sort?: string;
};

export interface CheerProps {
    openComposerOnMount?: boolean;
}

export default function CheerRuntime({ openComposerOnMount = false }: CheerProps) {
    const navigate = useNavigate();
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
    const today = useMemo(() => new Date(), []);
    const feedTabs = useMemo<FeedTabConfig[]>(
        () => [
            { key: 'all', label: '전체', postType: undefined },
            { key: 'popular', label: '인기', postType: undefined },
            { key: 'following', label: '팔로우', postType: undefined, requireAuth: true },
        ],
        []
    );
    const [activeFeedTab, setActiveFeedTab] = useState<FeedTabKey>(() => {
        const tabParam = searchParams.get('tab');
        return feedTabs.some((tab) => tab.key === tabParam)
            ? (tabParam as FeedTabKey)
            : feedTabs[0].key;
    });
    const [shouldRenderSidebar, setShouldRenderSidebar] = useState(() => (
        typeof window !== 'undefined' ? window.innerWidth >= 1024 : false
    ));
    const hasFetchedProfile = useRef(false);
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
        const tabParam = searchParams.get('tab');
        const nextTab = feedTabs.some((tab) => tab.key === tabParam)
            ? (tabParam as FeedTabKey)
            : feedTabs[0].key;

        setActiveFeedTab((currentTab) => (currentTab === nextTab ? currentTab : nextTab));
    }, [feedTabs, searchParams]);

    useEffect(() => {
        const currentTab = searchParams.get('tab');
        const normalizedCurrentTab = feedTabs.some((tab) => tab.key === currentTab)
            ? currentTab
            : null;
        const expectedTab = activeFeedTab === feedTabs[0].key ? null : activeFeedTab;

        if (normalizedCurrentTab === expectedTab) {
            return;
        }

        const nextSearchParams = new URLSearchParams(searchParams);
        if (expectedTab) {
            nextSearchParams.set('tab', expectedTab);
        } else {
            nextSearchParams.delete('tab');
        }
        setSearchParams(nextSearchParams, { replace: true });
    }, [activeFeedTab, feedTabs, searchParams, setSearchParams]);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia('(min-width: 1024px)');
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

    const buildCheerWritePath = () => {
        const nextSearchParams = new URLSearchParams();
        const currentTab = searchParams.get('tab');

        if (feedTabs.some((tab) => tab.key === currentTab)) {
            nextSearchParams.set('tab', currentTab as FeedTabKey);
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

    const teamColor = normalizeHexColor(authUserFavoriteTeamColor || DEFAULT_BRAND_COLOR);
    const teamAccent = getReadableAccent(teamColor);
    const teamContrastText = getContrastText(teamColor);
    const favoriteTeamId = hasFavoriteTeam ? authUserFavoriteTeam : null;
    const favoriteTeamLabel = favoriteTeamId ? TEAM_DATA[favoriteTeamId]?.name ?? favoriteTeamId : null;
    const favoriteTeamFull = favoriteTeamId ? TEAM_DATA[favoriteTeamId]?.fullName ?? favoriteTeamId : null;
    const { data: todaysGames = [], isLoading: isGamesLoading, isError: isGamesError, refetch: refetchGames } = useGamesData(today);

    const featuredGame = useMemo(() => {
        if (!todaysGames.length) return null;
        const normalized = (value?: string) => value?.toLowerCase().trim();
        const favoriteCandidates = [favoriteTeamId, favoriteTeamLabel, favoriteTeamFull]
            .filter(Boolean)
            .map((value) => normalized(String(value)));
        const matchesFavorite = (game: HomeGame) => {
            if (!favoriteCandidates.length) return false;
            const gameCandidates = [
                normalized(game.homeTeam),
                normalized(game.awayTeam),
                normalized(game.homeTeamFull),
                normalized(game.awayTeamFull),
            ].filter(Boolean) as string[];
            return favoriteCandidates.some((favorite) =>
                gameCandidates.some((candidate) => candidate.includes(favorite!))
            );
        };

        const liveGames = todaysGames.filter((game) => game.gameStatus === 'PLAYING');
        const favoriteGames = favoriteCandidates.length ? todaysGames.filter(matchesFavorite) : [];

        if (favoriteGames.length) {
            const liveFavorite = favoriteGames.find((game) => game.gameStatus === 'PLAYING');
            return liveFavorite ?? favoriteGames[0];
        }
        if (liveGames.length) return liveGames[0];
        return todaysGames[0];
    }, [favoriteTeamFull, favoriteTeamId, favoriteTeamLabel, todaysGames]);
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
            teamMetadata.homeStadium ? `홈구장: ${teamMetadata.homeStadium}` : '',
            teamMetadata.foundedYear ? `창단: ${teamMetadata.foundedYear}` : '',
            teamMetadata.owner ? `구단주: ${teamMetadata.owner}` : '',
            teamMetadata.homepage ? `홈페이지: ${teamMetadata.homepage}` : '',
        ].filter(Boolean);

        return metadataFields.length > 0
            ? metadataFields.join(' · ')
            : '멋진 선택이에요! 함께 응원하며 즐거운 야구 생활을 시작해보세요.';
    }, [teamMetadata]);
    const activeTabConfig = feedTabs.find((item) => item.key === activeFeedTab);
    return (
        <div className="min-h-screen bg-[#f7f9f9] pb-[calc(5.75rem+env(safe-area-inset-bottom))] dark:bg-background lg:pb-0">
            <div className="px-4 sm:px-6 py-6 sm:py-8">
                <div className="mx-auto w-full max-w-[1008px] xl:max-w-[1136px] lg:-translate-x-4">
                    <div className="grid grid-cols-1 gap-0 lg:gap-x-4 lg:grid-cols-[72px_1fr_280px] xl:grid-cols-[200px_1fr_320px]">
                        <aside className="hidden lg:flex w-[72px] xl:w-[200px] flex-col gap-3 sticky top-6 self-start px-2 xl:px-3">
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
                                            'flex items-center justify-center xl:justify-start gap-3 h-10 px-2 rounded-full xl:rounded-xl text-[18px] font-bold transition-colors',
                                            isActive
                                                ? 'bg-slate-100 text-slate-900 dark:bg-secondary dark:text-white'
                                                : 'text-[#334155] hover:bg-[#F1F5F9] dark:text-gray-300 dark:hover:bg-secondary'
                                        )}
                                        style={isActive ? { backgroundColor: `${teamColor}1A` } : undefined}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span className="hidden xl:inline">{item.label}</span>
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                onClick={handleWriteClick}
                                className="mt-4 flex w-full items-center justify-center xl:justify-start gap-3 h-12 px-4 rounded-full xl:rounded-xl text-[18px] font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ backgroundColor: teamAccent }}
                            >
                                <PenSquareIcon className="h-6 w-6" />
                                <span className="hidden xl:inline">게시하기</span>
                            </button>
                        </aside>

                        <main className="flex w-full flex-col gap-0 bg-slate-50/50 dark:bg-card">
                            <nav className="flex items-center border-b border-border/70 dark:border-border px-4 py-3 bg-white/80 dark:bg-card">
                                <div className="flex items-center gap-1 rounded-full bg-slate-100/90 p-1 dark:bg-secondary dark:border dark:border-border">
                                    {feedTabs.map((tab) => {
                                        const isActive = activeFeedTab === tab.key;
                                        return (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setActiveFeedTab(tab.key)}
                                                className={cn(
                                                    'relative px-4 py-2 min-h-11 flex items-center text-[16px] font-bold rounded-full transition-all duration-200',
                                                    isActive
                                                        ? 'text-[#0F172A] dark:text-gray-100'
                                                        : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] dark:text-gray-300 dark:hover:bg-secondary dark:hover:text-white active:scale-[0.98]'
                                                )}
                                                style={isActive ? { color: teamAccent } : undefined}
                                            >
                                                {isActive && (
                                                    <span className="absolute inset-0 rounded-full bg-white dark:bg-card shadow-sm border border-black/5 dark:border-border" />
                                                )}
                                                <span className="relative z-10">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </nav>
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
                                    activeFeedTab={activeFeedTab}
                                    activePostType={activeTabConfig?.postType}
                                    teamColor={teamColor}
                                    teamAccent={teamAccent}
                                    teamContrastText={teamContrastText}
                                    teamLabel={teamLabel}
                                    teamLogoId={teamLogoId}
                                    userDisplayName={userDisplayName}
                                    onRequireLogin={(replace = true) => redirectToLogin(replace)}
                                />
                            </Suspense>
                            <Suspense
                                fallback={(
                                    <section className="mt-4 divide-y divide-border/70 dark:divide-border/70">
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
                                )}
                            >
                                <LazyCheerFeedRuntimeContent
                                    activeFeedTab={activeFeedTab}
                                    activePostType={activeTabConfig?.postType}
                                    activeSort={activeTabConfig?.sort}
                                    isLoggedIn={isLoggedIn}
                                    teamColor={teamColor}
                                    authUserId={authUserId}
                                    onRequireLogin={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                                />
                            </Suspense>
                        </main>

                        {shouldRenderSidebar ? (
                            <aside className="sticky top-6 hidden w-[280px] self-start lg:flex xl:w-[320px]">
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
                                        isGamesLoading={isGamesLoading}
                                        isGamesError={isGamesError}
                                        onRefetchGames={() => {
                                            void refetchGames();
                                        }}
                                        featuredGame={featuredGame}
                                        onGoPrediction={() => navigate('/prediction')}
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

        </div>
    );
}
