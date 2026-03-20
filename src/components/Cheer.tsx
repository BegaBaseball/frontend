import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { parseError } from '../utils/errorUtils';
import TextareaAutosize from 'react-textarea-autosize';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthProfileActions, useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { AlertCircle, ArrowUp, Bookmark, Home, ImagePlus, PenSquare, Smile, UserRound, Megaphone, LineChart } from 'lucide-react';
import { cn } from '../lib/utils';
import { TEAM_DATA } from '../constants/teams';
import { createPost as createCheerPost, deletePost as deleteCheerPost, fetchHotPosts, fetchPostChanges, fetchPosts, fetchFollowingPosts, getTeamNameById, uploadPostImages, PageResponse, CheerPost, ShareMode } from '../api/cheerApi';
import { fetchTeamFranchiseMetadata } from '../api/teamFranchiseApi';
import { useGamesData } from '../api/home';
import { Game as HomeGame } from '../types/home';
import { motion } from 'framer-motion';
import TeamLogo from './TeamLogo';
import CheerCard from './CheerCard';
import CheerBattleBanner from './CheerBattleBanner';
import CheerHot from './CheerHot';
import CheerWriteModal, { CheerWritePayload } from './CheerWriteModal';
import AdSlot from './ads/AdSlot';
import EndOfFeed from './EndOfFeed';
import ErrorBoundary from './common/ErrorBoundary';
import { ProfileAvatar } from './ui/ProfileAvatar';
import {
    normalizeHexColor,
    toRgba,
    getReadableAccent,
    getContrastText,
    DEFAULT_BRAND_COLOR,
} from '../utils/teamColors';
import { compressImages } from '../utils/imageCompression';
import { resolveLatestVisiblePostId } from '../utils/cheerPolling';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';

type CheerInfiniteData = InfiniteData<PageResponse<CheerPost>>;
type FeedTabKey = 'all' | 'popular' | 'following';
type CheerPostType = CheerPost['postType'];
type FeedTabConfig = {
    key: FeedTabKey;
    label: string;
    postType?: 'NORMAL' | 'NOTICE';
    requireAuth?: boolean;
    sort?: string;
};

interface CheerProps {
    openComposerOnMount?: boolean;
}

export default function Cheer({ openComposerOnMount = false }: CheerProps) {
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
    const queryClient = useQueryClient();
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
    const hasFetchedProfile = useRef(false);
    const didOpenComposerFromRoute = useRef(false);
    const didNotifyLoginRequiredFromWriteRoute = useRef(false);
    const hasFavoriteTeam = authUserFavoriteTeam && authUserFavoriteTeam !== '없음';
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
        if (!openComposerOnMount) return;
        if (didOpenComposerFromRoute.current) return;
        if (isAuthLoading) return;

        if (!isLoggedIn) {
            if (!didNotifyLoginRequiredFromWriteRoute.current) {
                didNotifyLoginRequiredFromWriteRoute.current = true;
                toast.error('로그인이 필요한 서비스입니다.');
                navigate(buildLoginPath(getCurrentRelativeUrl()), { replace: true });
            }
            return;
        }

        didOpenComposerFromRoute.current = true;
        setIsWriteModalOpen(true);
    }, [isAuthLoading, isLoggedIn, navigate, openComposerOnMount]);

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
    const teamSoftBg = toRgba(teamColor, 0.12);
    const teamSoftBorder = toRgba(teamColor, 0.25);
    const resolveProfileImage = (imageUrl?: string) => {
        if (!imageUrl) return null;
        if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
        return imageUrl;
    };
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
    const teamId = hasFavoriteTeam ? authUserFavoriteTeam : 'all';
    const teamLogoId = teamId !== 'all' ? teamId : undefined;
    const rawTeamName = teamId !== 'all' ? getTeamNameById(teamId) : 'KBO 리그';
    const teamLabel = TEAM_DATA[teamId]?.name || rawTeamName.split(' ')[0];
    const teamName = TEAM_DATA[teamId]?.fullName || rawTeamName;
    const {
        data: teamMetadata,
        isLoading: isTeamMetadataLoading,
        isError: isTeamMetadataError,
        refetch: refetchTeamMetadata,
    } = useQuery({
        queryKey: ['cheer-team-metadata', teamId],
        queryFn: () => fetchTeamFranchiseMetadata(teamId),
        enabled: teamId !== 'all',
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
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
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
    const retryCount = useRef(0); // For infinite scroll smart retry

    useEffect(() => {
        previewsRef.current = composerPreviews;
    }, [composerPreviews]);

    useEffect(() => {
        return () => {
            previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, []);

    const addComposerFiles = (files: File[]) => {
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB
        const validFiles: File[] = [];
        let skippedCount = 0;

        files.forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            if (file.size > MAX_SIZE) {
                skippedCount++;
                return;
            }
            validFiles.push(file);
        });

        if (skippedCount > 0) {
            toast.warning(`이미지 크기는 5MB 이하여야 합니다. (${skippedCount}개 파일 제외됨)`);
        }

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
        mutationFn: async (payload: {
            content: string;
            files: File[];
            postType?: CheerPostType;
            shareMode?: ShareMode;
            sourceUrl?: string;
            sourceTitle?: string;
            sourceAuthor?: string;
            sourceLicense?: string;
            sourceLicenseUrl?: string;
            sourceChangedNote?: string;
            sourceSnapshotType?: string;
        }) => {
            if (!hasFavoriteTeam) {
                throw new Error('favoriteTeam-required');
            }
            const created = await createCheerPost({
                teamId: authUserFavoriteTeam,
                content: payload.content,
                postType: payload.postType ?? 'NORMAL',
                shareMode: payload.shareMode,
                sourceUrl: payload.sourceUrl,
                sourceTitle: payload.sourceTitle,
                sourceAuthor: payload.sourceAuthor,
                sourceLicense: payload.sourceLicense,
                sourceLicenseUrl: payload.sourceLicenseUrl,
                sourceChangedNote: payload.sourceChangedNote,
                sourceSnapshotType: payload.sourceSnapshotType,
            }, { skipAuthSessionHandling: true });
            let uploadedUrls: string[] = [];
            let uploadFailed = false;
            if (created?.id && payload.files.length > 0) {
                let filesToUpload = payload.files;
                try {
                    filesToUpload = await compressImages(payload.files, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        initialQuality: 0.82,
                        useWebWorker: true,
                    });
                } catch (compressionError) {
                    console.warn('이미지 선압축에 실패하여 원본 업로드를 진행합니다.', compressionError);
                    filesToUpload = payload.files;
                }

                try {
                    uploadedUrls = await uploadPostImages(created.id, filesToUpload, { skipAuthSessionHandling: true });
                } catch (error) {
                    // 이미지 업로드 실패 시 게시글 삭제 (Atomic 처럼 동작하게)
                    console.error('Image upload failed, deleting post...', error);
                    try {
                        await deleteCheerPost(created.id);
                    } catch (deleteError) {
                        console.error('Failed to delete post after image upload failure', deleteError);
                    }

                    const parsedError = parseError(error);
                    if (parsedError.type === 'AUTH' || parsedError.responseCode === 'INVALID_AUTHOR') {
                        throw error;
                    }

                    // 글로벌 에러 다이얼로그 호출 (파싱된 에러 사용)
                    window.dispatchEvent(new CustomEvent('global-api-error', {
                        detail: {
                            ...parsedError,
                            message: `이미지 업로드 실패: ${parsedError.message}`
                        }
                    }));

                    throw new Error('IMAGE_UPLOAD_FAILED');
                }
            }
            return { created, uploadedUrls, uploadFailed: false };
        },
        onMutate: async (payload) => {
            const optimisticId = Date.now() * -1;
            const optimisticPost: CheerPost = {
                id: optimisticId,
                teamId: authUserFavoriteTeam || 'ALL',
                team: authUserFavoriteTeam || 'ALL',
                teamColor,
                content: payload.content,
                author: userDisplayName,
                authorHandle: authUserHandle || '',
                authorProfileImageUrl: authUserProfileImageUrl ?? undefined,
                authorTeamId: authUserFavoriteTeam || undefined,
                timeAgo: '방금 전',
                likeCount: 0,
                commentCount: 0,
                bookmarkCount: 0,
                repostCount: 0,
                views: 0,
                isHot: false,
                liked: false,
                bookmarked: false,
                imageUrls: composerPreviews.map((preview) => preview.url),
                imageUploadFailed: false,
                postType: payload.postType ?? 'NORMAL',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isOwner: true,
                repostedByMe: false,
                originalDeleted: false,
                shareMode: payload.shareMode,
                sourceInfo: payload.sourceUrl
                    ? {
                        url: payload.sourceUrl,
                        title: payload.sourceTitle,
                        author: payload.sourceAuthor,
                        license: payload.sourceLicense,
                        licenseUrl: payload.sourceLicenseUrl,
                        changedNote: payload.sourceChangedNote,
                        snapshotType: payload.sourceSnapshotType,
                    }
                    : undefined,
            };

            const updateCache = (key: (string | undefined)[]) => {
                queryClient.setQueryData<CheerInfiniteData>(key, (old) => {
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
            const parsedError = parseError(_error);
            if (parsedError.type === 'AUTH' || parsedError.responseCode === 'INVALID_AUTHOR') {
                redirectToLogin(true);
            } else if (_error instanceof Error && _error.message === 'IMAGE_UPLOAD_FAILED') {
                return;
            } else {
                toast.error(parsedError.message || '게시글 등록에 실패했습니다.');
            }

        },
        onSuccess: (result, _payload, context) => {
            const createdPost = result?.created;
            if (!createdPost || !context) return;
            const uploadedUrls = result?.uploadedUrls ?? [];
            const uploadFailed = Boolean(result?.uploadFailed);
            const replaceOptimistic = (key: (string | undefined)[]) => {
                queryClient.setQueryData<CheerInfiniteData>(key, (old) => {
                    if (!old || !old.pages?.length) return old;
                    const updatedPages = old.pages.map((page) => ({
                        ...page,
                        content: (page.content ?? []).map((post) =>
                            post.id === context.optimisticId
                                ? {
                                    ...post,
                                    ...createdPost,
                                    authorProfileImageUrl: createdPost.authorProfileImageUrl ?? post.authorProfileImageUrl,
                                    imageUrls: uploadedUrls.length > 0 ? uploadedUrls : post.imageUrls ?? createdPost.imageUrls,
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
        if (!isLoggedIn) {
            redirectToLogin(false);
            return;
        }
        if (!hasFavoriteTeam) {
            toast.warning('마이페이지에서 응원팀을 설정해주세요!');
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
        } catch (error) {
            // 에러는 mutation의 onError 또는 내부 catch에서 이미 처리됨
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
        queryFn: ({ pageParam = 0 }) => {
            // 팔로우 탭: 팔로우한 유저의 게시글만 조회
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
                postType: activeTabConfig?.postType,
                sort: activeTabConfig?.sort
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            // Fallback logic if 'last' or 'number' is missing (which seems to be the case based on logs)
            // If content is empty or less than page size (20), we assume it's the last page.
            // RELAXED: Only stop if strictly empty, to handle backend filtering or irregular page sizes.
            if (!lastPage || !lastPage.content || lastPage.content.length === 0) {
                return undefined;
            }
            // If explicit 'last' exists, use it
            if (lastPage.last) return undefined;

            // Otherwise, infer next page number from allPages length
            // allPages[0] is page 0, so length is the next page index.
            // e.g. allPages has 1 item (page 0), next is 1.
            return allPages.length;
        },
        initialPageParam: 0,
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        // 팔로우 탭은 로그인 필수
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

    // Polling for new posts
    const { data: polledChanges } = useQuery({
        queryKey: ['cheer-polling-changes', activeFeedTab, latestVisiblePostId],
        queryFn: () => fetchPostChanges({
            sinceId: latestVisiblePostId,
        }),
        refetchInterval: 15000,
        enabled: !isLoading && activeFeedTab === 'all' && latestVisiblePostId !== null,
    });

    useEffect(() => {
        if (!polledChanges) return;
        if (polledChanges.newCount > 0) {
            setNewPostCount(polledChanges.newCount);
        }
    }, [polledChanges]);

    // Smart Retry for Infinite Scroll (Fix for Duplicate/Offset Loop)
    useEffect(() => {
        try {
            if (!isFetchingNextPage && hasNextPage && data?.pages) {
                const lastPage = data.pages[data.pages.length - 1];

                // If the last page has content, check if it contributed any *new* unique items.
                if (lastPage?.content?.length > 0) {
                    // Safe mapping with null checks
                    const lastPageIds = new Set(
                        (lastPage.content as CheerPost[])
                            .filter(p => p && typeof p.id === 'number')
                            .map(p => p.id)
                    );

                    const previousPagesContent = data.pages.slice(0, -1).flatMap(p => p.content ?? []);
                    const previousIds = new Set(
                        (previousPagesContent as CheerPost[])
                            .filter(p => p && typeof p.id === 'number')
                            .map(p => p.id)
                    );

                    // Count how many items in the LAST page are valid (not in previous pages)
                    const newUniqueItems = [...lastPageIds].filter(id => !previousIds.has(id)).length;

                    if (newUniqueItems === 0 && retryCount.current < 5) {
                        // Last page was ALL duplicates. Fetch next immediately to break the loop.
                        retryCount.current += 1;
                        fetchNextPage();
                    } else if (newUniqueItems > 0) {
                        // We found some new content! Reset retry count.
                        retryCount.current = 0;
                    }
                }
            }
        } catch (error) {
            console.error("Smart Retry Logic Error:", error);
        }
    }, [data, isFetchingNextPage, hasNextPage, fetchNextPage]);


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
        <div className="min-h-screen bg-[#f7f9f9] dark:bg-background">
            <div className="px-4 sm:px-6 py-6 sm:py-8">
                <div className="mx-auto w-full max-w-[1008px] xl:max-w-[1136px] lg:-translate-x-4">
                    <div className="grid grid-cols-1 gap-0 lg:gap-x-4 lg:grid-cols-[72px_1fr_280px] xl:grid-cols-[200px_1fr_320px]">
                        <aside className="hidden lg:flex w-[72px] xl:w-[200px] flex-col gap-3 sticky top-6 self-start px-2 xl:px-3">
                            {[
                                { id: 'home', label: '홈', icon: Home, path: '/home' },
                                { id: 'team', label: '응원석', icon: Megaphone, path: '/cheer' },
                                { id: 'live', label: '전력분석실', icon: LineChart, path: '/prediction' },
                                { id: 'profile', label: '프로필', icon: UserRound, path: userProfilePath },
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
                                <PenSquare className="h-6 w-6" />
                                <span className="hidden xl:inline">게시하기</span>
                            </button>
                        </aside>

                        <main className="flex w-full flex-col gap-0 bg-slate-50/50 dark:bg-card">
                            <nav className="flex items-center border-b border-border/70 dark:border-border px-4 py-3 bg-white/80 dark:bg-card">
                                <div className="flex items-center gap-1 rounded-full bg-slate-100/90 p-1 dark:bg-secondary dark:border dark:border-border">
                                    {feedTabs.map((tab) => {
                                        const isActive = activeFeedTab === tab.key;
                                        return (
                                            <motion.button
                                                key={tab.key}
                                                type="button"
                                                onClick={() => setActiveFeedTab(tab.key)}
                                                whileHover={{ y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                                className={cn(
                                                    'relative px-4 py-2 min-h-11 flex items-center text-[14px] font-semibold rounded-full transition-all duration-200',
                                                    isActive
                                                        ? 'text-[#0F172A] dark:text-gray-100'
                                                        : 'text-[#64748B] hover:bg-white/70 hover:text-[#0F172A] dark:text-gray-300 dark:hover:bg-secondary dark:hover:text-white'
                                                )}
                                                style={isActive ? { color: teamAccent } : undefined}
                                            >
                                                {isActive && (
                                                    <motion.span
                                                        layoutId="cheer-feed-tab-indicator"
                                                        className="absolute inset-0 rounded-full bg-white dark:bg-card shadow-sm border border-black/5 dark:border-border"
                                                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                                                    />
                                                )}
                                                <span className="relative z-10">{tab.label}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </nav>

                            {newPostCount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleNewPostsClick}
                                    className="sticky top-12 z-20 w-full backdrop-blur-sm min-h-11 text-sm font-semibold transition-colors flex items-center justify-center gap-2 border-b"
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

                            {/* CheerBattle Banner - only shown when a valid game with gameId exists */}
                            {featuredGame?.gameId &&
                                featuredGame.gameStatus !== 'OFFSEASON' &&
                                featuredGame.homeTeam &&
                                featuredGame.awayTeam && (
                                    <ErrorBoundary
                                        fallback={(
                                            <div className="mx-4 mt-4 mb-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                                                실시간 응원 배틀을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
                                            </div>
                                        )}
                                    >
                                        <CheerBattleBanner
                                            gameId={featuredGame.gameId}
                                            homeTeamId={featuredGame.homeTeam}
                                            awayTeamId={featuredGame.awayTeam}
                                        />
                                    </ErrorBoundary>
                                )}

                            <section
                                className={cn(
                                    'relative mx-4 mt-4 rounded-2xl border border-slate-200 dark:border-border px-4 py-4 transition-all duration-200',
                                    'bg-white dark:bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
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
                                    <div className="h-10 w-10 shrink-0">
                                        {authUserProfileImageUrl ? (
                                            <ProfileAvatar
                                                src={resolveProfileImage(authUserProfileImageUrl) || undefined}
                                                alt={authUserName || '프로필'}
                                                fallbackName={authUserName || '프로필'}
                                                width={40}
                                                height={40}
                                                showRing
                                                ringClassName="p-px bg-black/5 dark:bg-white/10"
                                            />
                                        ) : hasFavoriteTeam ? (
                                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 p-px overflow-hidden">
                                                <div className="h-full w-full rounded-full bg-slate-100 dark:bg-secondary flex items-center justify-center overflow-hidden">
                                                    <TeamLogo teamId={teamLogoId} team={teamLabel} size={40} />
                                                </div>
                                            </span>
                                        ) : (
                                            <ProfileAvatar
                                                alt={authUserName || '프로필'}
                                                fallbackName={authUserName || '프로필'}
                                                width={40}
                                                height={40}
                                                showRing
                                                ringClassName="p-px bg-black/5 dark:bg-white/10"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <TextareaAutosize
                                            placeholder="지금 우리 팀에게 응원을 남겨주세요!"
                                            className="w-full resize-none border-none bg-transparent text-[16px] text-[#0f1419] dark:text-white placeholder:text-[#536471] dark:placeholder:text-slate-500 focus:outline-none focus:ring-0"
                                            minRows={2}
                                            maxRows={10}
                                            value={composerContent}
                                            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setComposerContent(event.target.value)}
                                        />
                                        <div className="mt-2 flex items-center justify-between border-t border-border/70 dark:border-border pt-2">
                                            <div className="flex items-center gap-2 text-[#536471] dark:text-gray-300">
                                                <button
                                                    type="button"
                                                    className={`group relative rounded-full p-1 transition-colors ${composerFiles.length >= 10
                                                        ? 'opacity-50 cursor-not-allowed'
                                                        : 'hover:bg-slate-100 dark:hover:bg-secondary'
                                                        }`}
                                                    onClick={() => fileInputRef.current?.click()}
                                                    aria-label="이미지 첨부"
                                                    disabled={composerFiles.length >= 10}
                                                >
                                                    <ImagePlus className="h-4 w-4" />
                                                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded bg-slate-800 dark:bg-secondary px-2 py-1 text-xs text-white shadow-lg">
                                                        최대 10장, 각 5MB 이하
                                                    </span>
                                                </button>
                                                {composerFiles.length >= 10 ? (
                                                    <span className="text-xs text-amber-500 dark:text-amber-400 font-medium">10장 제한</span>
                                                ) : composerFiles.length > 0 ? (
                                                    <span className="text-xs text-slate-400">{composerFiles.length}/10</span>
                                                ) : null}
                                                <Smile className="h-4 w-4" />
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleComposerFileSelect}
                                                    disabled={composerSubmitting || composerFiles.length >= 10}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {!composerContent.trim() && (
                                                    <span className="text-xs text-slate-400 dark:text-gray-300">내용을 입력해 주세요</span>
                                                )}
                                                <button
                                                    type="button"
                                                    data-testid="write-post-btn"
                                                    onClick={handleComposerSubmit}
                                                    className="rounded-full px-4 py-1.5 text-sm font-bold disabled:opacity-60"
                                                    style={{ backgroundColor: teamColor, color: teamContrastText }}
                                                    disabled={composerSubmitting || !composerContent.trim()}
                                                >
                                                    {composerSubmitting ? '등록 중...' : '게시하기'}
                                                </button>
                                            </div>
                                        </div>
                                        {composerPreviews.length > 0 && (
                                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {composerPreviews.map((preview, index) => (
                                                    <div
                                                        key={preview.url}
                                                        className="relative h-20 overflow-hidden rounded-lg border border-black/10 dark:border-white/10"
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

                            <section className="mt-4">
                                {isLoading && currentPosts.length === 0 ? (
                                    <div className="divide-y divide-border/70 dark:divide-border/70">
                                        {[1, 2, 3].map((index) => (
                                            <div key={index} className="px-4 py-4 animate-pulse">
                                                <div className="flex gap-3">
                                                    {/* Profile skeleton */}
                                                    <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-secondary flex-shrink-0" />

                                                    <div className="flex-1 space-y-3">
                                                        {/* Author and time skeleton */}
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-4 w-24 bg-slate-200 dark:bg-secondary rounded" />
                                                            <div className="h-3 w-16 bg-slate-200 dark:bg-secondary rounded" />
                                                        </div>

                                                        {/* Content skeleton - multiple lines with varying widths */}
                                                        <div className="space-y-2">
                                                            <div className="h-4 w-full bg-slate-200 dark:bg-secondary rounded" />
                                                            <div className="h-4 w-5/6 bg-slate-200 dark:bg-secondary rounded" />
                                                            <div className="h-4 w-4/6 bg-slate-200 dark:bg-secondary rounded" />
                                                        </div>

                                                        {/* Stats skeleton */}
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
                                                <p className="text-[16px] font-semibold text-red-500 dark:text-red-400">
                                                    데이터를 불러오지 못했습니다
                                                </p>
                                                <p className="mt-1 text-sm text-slate-500 dark:text-gray-300">
                                                    네트워크 상태를 확인하고 다시 시도해 주세요
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => queryClient.invalidateQueries({ queryKey: ['cheer-posts', activeFeedTab] })}
                                            className="rounded-full bg-slate-100 dark:bg-secondary px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-secondary transition-colors"
                                        >
                                            다시 시도
                                        </button>
                                    </div>
                                ) : activeFeedTab === 'following' && !isLoggedIn ? (
                                    <div className="border-b border-border/70 dark:border-border px-4 sm:px-6 py-8 sm:py-10 text-center">
                                        <p className="text-[#64748B] dark:text-gray-300">로그인이 필요합니다</p>
                                        <p className="mt-1 text-sm text-slate-400 dark:text-gray-300">팔로우한 유저의 글을 보려면 로그인해주세요.</p>
                                        <button
                                            type="button"
                                            onClick={() => navigate(buildLoginPath(getCurrentRelativeUrl()))}
                                            className="mt-4 rounded-full px-6 py-2 text-sm font-semibold text-white"
                                            style={{ backgroundColor: teamColor }}
                                        >
                                            로그인하기
                                        </button>
                                    </div>
                                ) : currentPosts.length === 0 ? (
                                    <div className="border-b border-border/70 dark:border-border px-4 sm:px-6 py-8 sm:py-10 text-center">
                                        {activeFeedTab === 'following' ? (
                                            <>
                                                <p className="text-[#64748B] dark:text-gray-300">팔로우한 유저가 없습니다</p>
                                                <p className="mt-1 text-sm text-slate-400 dark:text-gray-300">다른 유저를 팔로우하면 여기에 글이 표시됩니다!</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[#64748B] dark:text-gray-300">아직 작성된 응원글이 없습니다.</p>
                                                <p className="mt-1 text-sm text-slate-400 dark:text-gray-300">첫 번째 응원글을 남겨보세요!</p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="px-4 py-4 space-y-4">
                                        {currentPosts.flatMap((post, index) => [
                                            <ErrorBoundary
                                                key={post.id}
                                                fallback={(
                                                    <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
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
                                        <div className="flex flex-col items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
                                            <span>데이터를 불러오지 못했습니다.</span>
                                            <p className="text-xs text-slate-400 dark:text-slate-300">
                                                네트워크 상태를 확인하고 다시 시도해 주세요
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => fetchNextPage()}
                                                className="rounded-full border border-slate-200 dark:border-border px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-secondary"
                                            >
                                                다시 시도
                                            </button>
                                        </div>
                                    ) : isFetchingNextPage ? (
                                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-300">
                                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                            불러오는 중...
                                        </div>
                                    ) : null}
                                    {!hasNextPage && currentPosts.length > 0 && !isFetchingNextPage && (
                                        <EndOfFeed />
                                    )}
                                </div>
                            </section>
                        </main>

                        <aside className="hidden lg:flex w-[280px] xl:w-[320px] flex-col gap-4 sticky top-6 self-start">
                            <div className="rounded-2xl border border-border/70 dark:border-border p-4 bg-white dark:bg-card">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-full bg-slate-50 dark:bg-secondary flex items-center justify-center">
                                        <TeamLogo teamId={teamLogoId} team={teamLabel} size={48} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-[#0F172A] dark:text-white">팀 정보 요약</p>
                                        <p className="text-xs text-[#64748B] dark:text-gray-300">{teamName}</p>
                                    </div>
                                </div>
                                {teamId === 'all' ? (
                                    <p className="mt-3 text-sm text-[#64748B] dark:text-gray-300 leading-relaxed">모든 팀의 흐름을 한 번에 확인하세요.</p>
                                ) : isTeamMetadataLoading ? (
                                    <div className="mt-3 space-y-2">
                                        <div className="h-4 w-full rounded bg-slate-100 dark:bg-secondary" />
                                        <div className="h-4 w-4/5 rounded bg-slate-100 dark:bg-secondary" />
                                        <div className="h-4 w-3/5 rounded bg-slate-100 dark:bg-secondary" />
                                    </div>
                                ) : isTeamMetadataError ? (
                                    <div className="mt-3 rounded-xl bg-red-50 dark:bg-secondary/70 px-3 py-3 text-sm text-[#64748B] dark:text-gray-300">
                                        <p>팀 요약 정보를 불러오지 못했습니다.</p>
                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                                            네트워크 상태를 확인하고 다시 시도해 주세요
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => refetchTeamMetadata()}
                                            className="mt-3 w-full rounded-full border border-red-200 dark:border-border px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-secondary"
                                        >
                                            다시 시도
                                        </button>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-[#64748B] dark:text-gray-300 leading-relaxed">{teamDescription}</p>
                                )}
                            </div>

                            <div className="rounded-2xl border border-border/70 dark:border-border p-4 bg-white dark:bg-card">
                                <p className="text-sm font-semibold text-[#0F172A] dark:text-white">오늘 경기</p>
                                {isGamesLoading ? (
                                    <div className="mt-3 space-y-3">
                                        <div className="h-4 w-32 rounded bg-slate-100 dark:bg-secondary" />
                                        <div className="h-12 rounded bg-slate-100 dark:bg-secondary" />
                                        <div className="h-9 w-full rounded-full bg-slate-100 dark:bg-secondary" />
                                    </div>
                                ) : isGamesError ? (
                                    <div className="mt-3 rounded-xl bg-slate-50 dark:bg-secondary/70 px-3 py-3 text-sm text-[#64748B] dark:text-gray-300">
                                        경기 정보를 불러오지 못했습니다.
                                        <button
                                            type="button"
                                            onClick={() => refetchGames()}
                                            className="mt-3 w-full rounded-full border border-slate-200 dark:border-border py-2 text-xs font-semibold text-slate-600 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-secondary"
                                        >
                                            다시 시도
                                        </button>
                                    </div>
                                ) : featuredGame ? (
                                    <div className="mt-3 space-y-3">
                                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-300">
                                            <span>{featuredGame.stadium}</span>
                                            <span>{featuredGame.time}</span>
                                        </div>
                                        <div className="rounded-xl border border-slate-100 dark:border-border px-3 py-3">
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
                                                            : 'bg-slate-100 text-slate-600 dark:bg-secondary dark:text-gray-200'
                                                    )}
                                                >
                                                    {featuredGame.gameStatus === 'PLAYING' ? 'LIVE' : featuredGame.gameStatusKr || '예정'}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            className="w-full rounded-full border border-slate-200 dark:border-border py-2 text-sm font-semibold text-[#0F172A] dark:text-white hover:bg-slate-50 dark:hover:bg-secondary"
                                            onClick={() => navigate('/prediction')}
                                        >
                                            경기 상세 보기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="mt-3 rounded-xl bg-slate-50 dark:bg-secondary/70 px-3 py-3 text-sm text-[#64748B] dark:text-gray-300">
                                        오늘 예정된 경기가 없습니다.
                                    </div>
                                )}
                            </div>

                            <CheerHot />

                        </aside>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-card border-t border-border/70 dark:border-border z-40 safe-area-bottom">
                <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
                    {[
                        { id: 'home', label: '홈', icon: Home, path: '/home' },
                        { id: 'team', label: '응원석', icon: Megaphone, path: '/cheer' },
                        { id: 'live', label: '전력분석실', icon: LineChart, path: '/prediction' },
                        { id: 'profile', label: '프로필', icon: UserRound, path: userProfilePath },
                    ].map((item) => {
                        const Icon = item.icon;
                        const isActive = item.id === 'team';
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => navigate(item.path)}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors',
                                    isActive
                                        ? 'text-primary'
                                        : 'text-gray-400 dark:text-gray-300'
                                )}
                                style={isActive ? { color: teamAccent } : undefined}
                            >
                                <Icon className="h-5 w-5" />
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            {/* FAB Write Button - adjusted for mobile nav */}
            <button
                type="button"
                onClick={handleWriteClick}
                className="fixed bottom-20 right-4 h-12 w-12 rounded-full text-white shadow-[0_8px_24px_rgba(0,0,0,0.15)] transition-transform hover:scale-105 lg:hidden lg:bottom-8 lg:right-8"
                style={{ backgroundColor: teamColor }}
                aria-label="글쓰기"
            >
                <PenSquare className="mx-auto h-5 w-5" />
            </button>

            <CheerWriteModal
                isOpen={isWriteModalOpen}
                onClose={() => setIsWriteModalOpen(false)}
                onSubmit={async (payload: CheerWritePayload) => {
                    await createMutation.mutateAsync({
                        content: payload.content,
                        files: payload.files,
                        postType: activeTabConfig?.postType,
                        shareMode: payload.shareMode,
                        sourceUrl: payload.sourceUrl,
                        sourceTitle: payload.sourceTitle,
                        sourceAuthor: payload.sourceAuthor,
                        sourceLicense: payload.sourceLicense,
                        sourceLicenseUrl: payload.sourceLicenseUrl,
                        sourceChangedNote: payload.sourceChangedNote,
                        sourceSnapshotType: payload.sourceSnapshotType,
                    });
                }}
                teamColor={teamColor}
                teamAccent={teamAccent}
                teamContrastText={teamContrastText}
                teamLabel={teamLabel}
                teamId={teamLogoId}
            />
        </div>
    );
}
