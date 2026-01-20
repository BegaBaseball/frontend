import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ArrowUp, Bookmark, Home, ImagePlus, PenSquare, Radio, Smile, UserRound, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { getTeamDescription, TEAM_DATA } from '../constants/teams';
import { createPost as createCheerPost, fetchPosts, getTeamNameById, uploadPostImages } from '../api/cheerApi';
import { useGamesData } from '../api/home';
import { Game as HomeGame } from '../types/home';
import TeamLogo from './TeamLogo';
import CheerCard from './CheerCard';
import CheerHot from './CheerHot';
import EndOfFeed from './EndOfFeed';


const DEFAULT_TEAM_COLOR = '#2d5f4f';

const normalizeHexColor = (color?: string) => {
    if (!color) return DEFAULT_TEAM_COLOR;
    const trimmed = color.trim();
    if (!trimmed.startsWith('#')) return DEFAULT_TEAM_COLOR;
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
        return `#${hex
            .split('')
            .map((char) => char + char)
            .join('')}`.toUpperCase();
    }
    if (hex.length === 6) {
        return `#${hex.toUpperCase()}`;
    }
    return DEFAULT_TEAM_COLOR;
};

const hexToRgb = (hex: string) => {
    const normalized = normalizeHexColor(hex);
    const value = normalized.replace('#', '');
    const r = parseInt(value.slice(0, 2), 16);
    const g = parseInt(value.slice(2, 4), 16);
    const b = parseInt(value.slice(4, 6), 16);
    return { r, g, b };
};

const toRgba = (hex: string, alpha: number) => {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const getLuminance = (hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    const [sr, sg, sb] = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
};

const darkenColor = (hex: string, amount: number) => {
    const { r, g, b } = hexToRgb(hex);
    const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
    return `#${[clamp(r * (1 - amount)), clamp(g * (1 - amount)), clamp(b * (1 - amount))]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
};

const getReadableAccent = (hex: string) => {
    const luminance = getLuminance(hex);
    return luminance > 0.7 ? darkenColor(hex, 0.35) : hex;
};

const getContrastText = (hex: string) => {
    const luminance = getLuminance(hex);
    return luminance > 0.6 ? '#0F172A' : '#FFFFFF';
};


export default function Cheer() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const today = useMemo(() => new Date(), []);
    const feedTabs = useMemo(
        () => [
            { key: 'all', label: '전체', postType: undefined },
            { key: 'popular', label: '인기', postType: undefined, sort: 'views,desc' },
            { key: 'GAME', label: '경기', postType: 'GAME' },
        ],
        []
    );
    const [activeFeedTab, setActiveFeedTab] = useState(feedTabs[0].key);

    const handleWriteClick = () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        navigate('/cheer/write');
    };

    const teamColor = normalizeHexColor(user?.favoriteTeamColor || DEFAULT_TEAM_COLOR);
    const teamAccent = getReadableAccent(teamColor);
    const teamContrastText = getContrastText(teamColor);
    const teamSoftBg = toRgba(teamColor, 0.12);
    const teamSoftBorder = toRgba(teamColor, 0.25);
    const favoriteTeamId = user?.favoriteTeam && user.favoriteTeam !== '없음' ? user.favoriteTeam : null;
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
    const teamId = user?.favoriteTeam && user.favoriteTeam !== '없음' ? user.favoriteTeam : 'all';
    const rawTeamName = teamId !== 'all' ? getTeamNameById(teamId) : 'KBO 리그';
    const teamLabel = TEAM_DATA[teamId]?.name || rawTeamName.split(' ')[0];
    const teamName = TEAM_DATA[teamId]?.fullName || rawTeamName;
    const teamDescription = teamId !== 'all'
        ? getTeamDescription(teamLabel)
        : '모든 팀의 흐름을 한 번에 확인하세요.';
    const activeTabConfig = feedTabs.find((item) => item.key === activeFeedTab);
    const [composerContent, setComposerContent] = useState('');
    const [composerFiles, setComposerFiles] = useState<File[]>([]);
    const [composerPreviews, setComposerPreviews] = useState<{ file: File; url: string }[]>([]);
    const [composerSubmitting, setComposerSubmitting] = useState(false);
    const [composerDragging, setComposerDragging] = useState(false);
    const [newPostCount, setNewPostCount] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const previewsRef = useRef<{ file: File; url: string }[]>([]);

    useEffect(() => {
        previewsRef.current = composerPreviews;
    }, [composerPreviews]);

    useEffect(() => {
        return () => {
            previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, []);

    const addComposerFiles = (files: File[]) => {
        const validFiles = files.filter((file) => file.type.startsWith('image/'));
        const combinedFiles = [...composerFiles, ...validFiles].slice(0, 10);
        const newPreviews = validFiles.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setComposerFiles(combinedFiles);
        setComposerPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
    };

    const handleComposerFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            addComposerFiles(Array.from(event.target.files));
            event.target.value = '';
        }
    };

    const handleComposerRemove = (index: number) => {
        setComposerFiles((prev) => prev.filter((_, i) => i !== index));
        setComposerPreviews((prev) => {
            const target = prev[index];
            if (target) URL.revokeObjectURL(target.url);
            return prev.filter((_, i) => i !== index);
        });
    };

    const handleComposerDragOver = (event: React.DragEvent) => {
        event.preventDefault();
        setComposerDragging(true);
    };

    const handleComposerDragLeave = (event: React.DragEvent) => {
        event.preventDefault();
        setComposerDragging(false);
    };

    const handleComposerDrop = (event: React.DragEvent) => {
        event.preventDefault();
        setComposerDragging(false);
        if (event.dataTransfer.files) {
            addComposerFiles(Array.from(event.dataTransfer.files));
        }
    };

    const createMutation = useMutation({
        mutationFn: async (payload: { content: string; files: File[]; postType?: string }) => {
            if (!user?.favoriteTeam) {
                throw new Error('favoriteTeam-required');
            }
            const derivedTitle = payload.content.split('\n')[0].slice(0, 40) || '응원글';
            const created = await createCheerPost({
                teamId: user.favoriteTeam,
                title: derivedTitle,
                content: payload.content,
                postType: payload.postType ?? 'CHEER',
            });
            let uploadedUrls: string[] = [];
            let uploadFailed = false;
            if (created?.id && payload.files.length > 0) {
                try {
                    uploadedUrls = await uploadPostImages(created.id, payload.files);
                } catch (error) {
                    uploadFailed = true;
                }
            }
            return { created, derivedTitle, uploadedUrls, uploadFailed };
        },
        onMutate: async (payload) => {
            const optimisticId = Date.now() * -1;
            const optimisticPost = {
                id: optimisticId,
                team: user?.favoriteTeam || 'ALL',
                teamColor,
                title: payload.content.split('\n')[0].slice(0, 40) || '응원글',
                content: payload.content,
                author: user?.name || user?.email || '나',
                timeAgo: '방금 전',
                comments: 0,
                likes: 0,
                views: 0,
                isHot: false,
                likedByUser: false,
                isBookmarked: false,
                images: composerPreviews.map((preview) => preview.url),
                imageUploadFailed: false,
                postType: payload.postType ?? 'CHEER',
            };

            const updateCache = (key: (string | undefined)[]) => {
                queryClient.setQueryData(key, (old: any) => {
                    if (!old || !old.pages?.length) return old;
                    const firstPage = old.pages[0];
                    const updatedFirstPage = {
                        ...firstPage,
                        content: [optimisticPost, ...(firstPage.content ?? [])],
                    };
                    return { ...old, pages: [updatedFirstPage, ...old.pages.slice(1)] };
                });
            };

            const activeKey = ['cheer-posts', activeFeedTab];
            const allKey = ['cheer-posts', 'all'];

            const previousActive = queryClient.getQueryData(activeKey);
            const previousAll = queryClient.getQueryData(allKey);

            updateCache(activeKey);
            if (activeFeedTab !== 'all') updateCache(allKey);

            return { previousActive, previousAll, optimisticId };
        },
        onError: (_error, _payload, context) => {
            if (!context) return;
            queryClient.setQueryData(['cheer-posts', activeFeedTab], context.previousActive);
            if (activeFeedTab !== 'all') {
                queryClient.setQueryData(['cheer-posts', 'all'], context.previousAll);
            }
            alert('글 작성에 실패했습니다.');
        },
        onSuccess: (result, _payload, context) => {
            const createdPost = result?.created;
            if (!createdPost || !context) return;
            const uploadedUrls = result?.uploadedUrls ?? [];
            const uploadFailed = Boolean(result?.uploadFailed);
            const replaceOptimistic = (key: (string | undefined)[]) => {
                queryClient.setQueryData(key, (old: any) => {
                    if (!old || !old.pages?.length) return old;
                    const updatedPages = old.pages.map((page: any) => ({
                        ...page,
                        content: (page.content ?? []).map((post: any) =>
                            post.id === context.optimisticId
                                ? {
                                    ...post,
                                    ...createdPost,
                                    images: uploadedUrls.length > 0 ? uploadedUrls : post.images ?? createdPost.images,
                                    imageUploadFailed: uploadFailed,
                                }
                                : post
                        ),
                    }));
                    return { ...old, pages: updatedPages };
                });
            };
            replaceOptimistic(['cheer-posts', activeFeedTab]);
            if (activeFeedTab !== 'all') replaceOptimistic(['cheer-posts', 'all']);
        },
    });

    const handleComposerSubmit = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        if (!user.favoriteTeam || user.favoriteTeam === '없음') {
            alert('마이페이지에서 응원팀을 설정해주세요!');
            return;
        }
        const trimmedContent = composerContent.trim();
        if (!trimmedContent) return;

        setComposerSubmitting(true);
        try {
            await createMutation.mutateAsync({
                content: trimmedContent,
                files: composerFiles,
                postType: activeTabConfig?.postType,
            });
            setComposerContent('');
            setComposerFiles([]);
            composerPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
            setComposerPreviews([]);
        } finally {
            setComposerSubmitting(false);
        }
    };

    const {
        data,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        error: queryError,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['cheer-posts', activeFeedTab],
        queryFn: ({ pageParam = 0 }) =>
            fetchPosts('all', pageParam, 20, activeTabConfig?.postType, activeTabConfig?.sort),
        getNextPageParam: (lastPage) =>
            lastPage.last ? undefined : lastPage.number + 1,
        initialPageParam: 0,
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
    });

    const currentPosts = data?.pages.flatMap((page) => page.content) ?? [];

    // Polling for new posts
    const { data: polledData } = useQuery({
        queryKey: ['cheer-polling', activeFeedTab],
        queryFn: () => fetchPosts('all', 0, 10, activeTabConfig?.postType),
        refetchInterval: 15000,
        enabled: !isLoading && !activeTabConfig?.sort, // Only poll for default sort (createdAt)
    });

    useEffect(() => {
        if (!polledData?.content || !currentPosts.length) return;

        // Find the maximum ID in current posts to handle pinned/notice posts correctly
        const maxCurrentId = Math.max(...currentPosts.map((p) => p.id));

        // Count how many polled posts have ID > maxCurrentId
        const newCount = polledData.content.filter((p: any) => p.id > maxCurrentId).length;

        if (newCount > 0) {
            setNewPostCount(newCount);
        }
    }, [polledData, currentPosts]);

    const handleNewPostsClick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        queryClient.invalidateQueries({ queryKey: ['cheer-posts', activeFeedTab] });
        setNewPostCount(0);
    };





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

    return (
        <div className="min-h-screen bg-[#f7f9f9] dark:bg-[#0E1117]">
            <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
                <div className="grid grid-cols-1 gap-0 lg:grid-cols-[72px_600px_320px] xl:grid-cols-[200px_600px_320px]">
                    <aside className="hidden lg:flex w-[72px] xl:w-[200px] flex-col gap-3 sticky top-6 self-start px-2 xl:px-3">
                        {[
                            { id: 'home', label: 'Home', icon: Home, path: '/home' },
                            { id: 'team', label: 'Team Hub', icon: Users, path: '/cheer' },
                            { id: 'live', label: 'LIVE', icon: Radio, path: '/prediction' },
                            { id: 'profile', label: 'Profile', icon: UserRound, path: '/mypage' },
                            { id: 'bookmarks', label: '북마크', icon: Bookmark, path: '/cheer/bookmarks' },
                        ].map((item) => {
                            const Icon = item.icon;
                            const isActive = item.id === 'team';
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
                                    style={isActive ? { backgroundColor: `${teamColor}1A` } : undefined}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="hidden xl:inline">{item.label}</span>
                                </button>
                            );
                        })}
                    </aside>

                    <main className="flex w-full flex-col gap-0 bg-white dark:bg-[#151A23] border-x border-[#EFF3F4] dark:border-[#232938] lg:w-[600px]">
                        <nav className="flex items-center border-b border-[#EFF3F4] dark:border-[#232938] px-4 py-3 bg-white/80 dark:bg-[#151A23]">
                            <div className="flex items-center gap-1 rounded-full bg-slate-100/90 p-1 dark:bg-slate-800/80">
                                {feedTabs.map((tab) => {
                                    const isActive = activeFeedTab === tab.key;
                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            onClick={() => setActiveFeedTab(tab.key)}
                                            className={cn(
                                                'relative px-4 py-2 text-[14px] font-semibold rounded-full transition-all duration-200',
                                                isActive
                                                    ? 'bg-white text-[#0F172A] shadow-sm ring-1 ring-black/5 dark:bg-slate-700 dark:text-white dark:ring-white/10'
                                                    : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-slate-700/60 dark:hover:text-white'
                                            )}
                                            style={isActive ? {
                                                color: teamAccent,
                                                boxShadow: `0 4px 12px ${toRgba(teamAccent, 0.15)}`
                                            } : undefined}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </nav>

                        {newPostCount > 0 && (
                            <button
                                onClick={handleNewPostsClick}
                                className="sticky top-0 z-20 w-full backdrop-blur-sm py-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b"
                                style={{
                                    backgroundColor: teamSoftBg,
                                    borderColor: teamSoftBorder,
                                    color: teamAccent,
                                }}
                            >
                                <ArrowUp className="w-4 h-4" />
                                새 글 {newPostCount}개 보기
                            </button>
                        )}

                        <div className="mx-4 mt-4">

                        </div>

                        <section
                            className={cn(
                                'relative mx-4 mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-4 transition-all duration-200',
                                'bg-white/95 dark:bg-[#151A23] shadow-[0_8px_20px_rgba(15,23,42,0.08)]',
                                composerDragging && 'bg-sky-50/50 dark:bg-sky-900/30 border-2 border-dashed border-sky-300 dark:border-sky-500'
                            )}
                            onDragOver={handleComposerDragOver}
                            onDragLeave={handleComposerDragLeave}
                            onDrop={handleComposerDrop}
                        >
                            {composerDragging && (
                                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-sky-50/30 dark:bg-sky-900/30 backdrop-blur-sm rounded-lg">
                                    <ImagePlus className="h-8 w-8 text-sky-500 dark:text-sky-400" />
                                    <span className="text-sm font-semibold text-sky-700 dark:text-sky-300">이미지를 놓으세요</span>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center overflow-hidden">
                                    {user?.favoriteTeam && user.favoriteTeam !== '없음' ? (
                                        <TeamLogo team={teamLabel} size={40} />
                                    ) : user?.profileImageUrl ? (
                                        <img
                                            src={user.profileImageUrl}
                                            alt={user?.name || '프로필'}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                            {user?.name?.slice(0, 1) || '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        placeholder="지금 우리 팀에게 응원을 남겨주세요!"
                                        className="w-full resize-none border-none bg-transparent text-[16px] text-[#0f1419] dark:text-white placeholder:text-[#536471] dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
                                        rows={2}
                                        value={composerContent}
                                        onChange={(event) => setComposerContent(event.target.value)}
                                    />
                                    <div className="mt-2 flex items-center justify-between border-t border-[#EFF3F4] dark:border-[#232938] pt-2">
                                        <div className="flex items-center gap-2 text-[#536471] dark:text-slate-500">
                                            <button
                                                type="button"
                                                className="rounded-full p-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
                                                onClick={() => fileInputRef.current?.click()}
                                                aria-label="이미지 첨부"
                                            >
                                                <ImagePlus className="h-4 w-4" />
                                            </button>
                                            <Smile className="h-4 w-4" />
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                onChange={handleComposerFileSelect}
                                                disabled={composerSubmitting}
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleComposerSubmit}
                                            className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-60"
                                            style={{ backgroundColor: teamColor, color: teamContrastText }}
                                            disabled={composerSubmitting || !composerContent.trim()}
                                        >
                                            {composerSubmitting ? '등록 중...' : '게시하기'}
                                        </button>
                                    </div>
                                    {composerPreviews.length > 0 && (
                                        <div className="mt-3 grid grid-cols-3 gap-2">
                                            {composerPreviews.map((preview, index) => (
                                                <div
                                                    key={preview.url}
                                                    className="relative h-20 overflow-hidden rounded-lg ring-1 ring-black/10 dark:ring-white/10"
                                                >
                                                    <img
                                                        src={preview.url}
                                                        alt={preview.file.name}
                                                        className="h-full w-full object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white"
                                                        onClick={() => handleComposerRemove(index)}
                                                    >
                                                        X
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section>
                            {isLoading && currentPosts.length === 0 ? (
                                <div className="divide-y divide-[#EFF3F4] dark:divide-[#232938]">
                                    {[1, 2, 3].map((index) => (
                                        <div key={index} className="px-4 py-4 animate-pulse">
                                            <div className="flex gap-3">
                                                {/* Profile skeleton */}
                                                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />

                                                <div className="flex-1 space-y-3">
                                                    {/* Author and time skeleton */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                                                    </div>

                                                    {/* Content skeleton - multiple lines with varying widths */}
                                                    <div className="space-y-2">
                                                        <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-4 w-4/6 bg-slate-200 dark:bg-slate-700 rounded" />
                                                    </div>

                                                    {/* Stats skeleton */}
                                                    <div className="flex gap-4 pt-2">
                                                        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                                                        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : queryError ? (
                                <div className="py-16 px-6 flex flex-col items-center justify-center gap-4">
                                    <div className="flex flex-col items-center gap-3">
                                        <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" />
                                        <div className="text-center">
                                            <p className="text-[16px] font-semibold text-red-500 dark:text-red-400">
                                                게시글을 불러오는데 실패했습니다
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                네트워크 연결을 확인해주세요
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => queryClient.invalidateQueries({ queryKey: ['cheer-posts', activeFeedTab] })}
                                        className="rounded-full bg-slate-100 dark:bg-slate-700 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        다시 시도
                                    </button>
                                </div>
                            ) : currentPosts.length === 0 ? (
                                <div className="border-b border-[#EFF3F4] dark:border-[#232938] px-6 py-12 text-center">
                                    <p className="text-[#64748B] dark:text-slate-400">아직 작성된 응원글이 없습니다.</p>
                                    <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">첫 번째 응원글을 남겨보세요!</p>
                                </div>
                            ) : (
                                <div className="px-4 py-4 space-y-3">
                                    {currentPosts.map((post) => (
                                        <CheerCard key={post.id} post={post} />
                                    ))}
                                </div>
                            )}
                            <div ref={sentinelRef} className="flex min-h-[120px] items-center justify-center">
                                {queryError && currentPosts.length > 0 ? (
                                    <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <span>추가 게시글을 불러오지 못했습니다.</span>
                                        <button
                                            type="button"
                                            onClick={() => fetchNextPage()}
                                            className="rounded-full border border-slate-200 dark:border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                        >
                                            다시 시도
                                        </button>
                                    </div>
                                ) : isFetchingNextPage ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#2d5f4f] border-t-transparent" />
                                        불러오는 중...
                                    </div>
                                ) : null}
                                {!hasNextPage && currentPosts.length > 0 && !isFetchingNextPage && (
                                    <EndOfFeed />
                                )}
                            </div>
                        </section>
                    </main>

                    <aside className="hidden lg:flex w-[320px] flex-col gap-4 sticky top-6 self-start lg:ml-4">
                        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#232938] p-4 bg-white dark:bg-[#151A23]">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                                    <TeamLogo team={teamLabel} size={48} />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-[#0F172A] dark:text-white">팀 정보 요약</p>
                                    <p className="text-xs text-[#64748B] dark:text-slate-400">{teamName}</p>
                                </div>
                            </div>
                            <p className="mt-3 text-sm text-[#64748B] dark:text-slate-400 leading-relaxed">{teamDescription}</p>
                        </div>

                        <div className="rounded-2xl border border-[#E5E7EB] dark:border-[#232938] p-4 bg-white dark:bg-[#151A23]">
                            <p className="text-sm font-semibold text-[#0F172A] dark:text-white">오늘 경기</p>
                            {isGamesLoading ? (
                                <div className="mt-3 space-y-3">
                                    <div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800" />
                                    <div className="h-12 rounded bg-slate-100 dark:bg-slate-800" />
                                    <div className="h-9 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                                </div>
                            ) : isGamesError ? (
                                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3 text-sm text-[#64748B] dark:text-slate-400">
                                    경기 정보를 불러오지 못했습니다.
                                    <button
                                        type="button"
                                        onClick={() => refetchGames()}
                                        className="mt-3 w-full rounded-full border border-slate-200 dark:border-slate-600 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                                    >
                                        다시 시도
                                    </button>
                                </div>
                            ) : featuredGame ? (
                                <div className="mt-3 space-y-3">
                                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                        <span>{featuredGame.stadium}</span>
                                        <span>{featuredGame.time}</span>
                                    </div>
                                    <div className="rounded-xl border border-slate-100 dark:border-slate-700 px-3 py-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <TeamLogo team={featuredGame.awayTeam} size={28} />
                                                <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                                                    {featuredGame.awayTeam}
                                                </span>
                                            </div>
                                            <span className="text-xs text-slate-400">vs</span>
                                            <div className="flex items-center gap-2">
                                                <TeamLogo team={featuredGame.homeTeam} size={28} />
                                                <span className="text-sm font-semibold text-[#0F172A] dark:text-white">
                                                    {featuredGame.homeTeam}
                                                </span>
                                            </div>
                                        </div>
                                        {(featuredGame.gameStatus === 'PLAYING' || featuredGame.gameStatus === 'COMPLETED') &&
                                            featuredGame.homeScore !== undefined &&
                                            featuredGame.awayScore !== undefined && (
                                                <div className="mt-3 flex items-center justify-center gap-6 text-lg font-bold text-[#0F172A] dark:text-white">
                                                    <span>{featuredGame.awayScore}</span>
                                                    <span className="text-xs text-slate-400">:</span>
                                                    <span>{featuredGame.homeScore}</span>
                                                </div>
                                            )}
                                        <div className="mt-3 flex items-center justify-center">
                                            <span
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-xs font-semibold',
                                                    featuredGame.gameStatus === 'PLAYING'
                                                        ? 'bg-red-50 text-red-600 dark:bg-red-900/40 dark:text-red-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                                                )}
                                            >
                                                {featuredGame.gameStatus === 'PLAYING' ? 'LIVE' : featuredGame.gameStatusKr || '예정'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full rounded-full border border-slate-200 dark:border-slate-600 py-2 text-sm font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
                                        onClick={() => navigate('/prediction')}
                                    >
                                        경기 상세 보기
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 px-3 py-3 text-sm text-[#64748B] dark:text-slate-400">
                                    오늘 예정된 경기가 없습니다.
                                </div>
                            )}
                        </div>

                        <CheerHot />

                    </aside>
                </div>
            </div>

            <button
                type="button"
                onClick={handleWriteClick}
                className="fixed bottom-8 right-8 h-12 w-12 rounded-full text-white shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-transform hover:scale-105 lg:hidden"
                style={{ backgroundColor: teamColor }}
                aria-label="글쓰기"
            >
                <PenSquare className="mx-auto h-5 w-5" />
            </button>
        </div>
    );
}
