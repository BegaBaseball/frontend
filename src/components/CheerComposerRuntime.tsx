import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useMutation, useQueryClient, InfiniteData } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { PageResponse, CheerPost, ShareMode } from '../api/cheerApi';
import { parseError } from '../utils/errorUtils';
import { useAuthProfileActions } from '../store/authStore';
import AutosizeTextarea from './ui/autosize-textarea';
import { ImagePlusIcon, SmileIcon } from './icons/CheerIcons';
import { ProfileAvatar } from './ui/ProfileAvatar';
import TeamLogo from './TeamLogo';
import type { CheerWritePayload } from './CheerWriteModal';

const LazyCheerWriteModal = lazy(() => import('./CheerWriteModal'));

type CheerInfiniteData = InfiniteData<PageResponse<CheerPost>>;
type CheerPostType = CheerPost['postType'];

interface CheerComposerRuntimeProps {
    openComposerOnMount: boolean;
    isAuthLoading: boolean;
    isLoggedIn: boolean;
    hasFavoriteTeam: boolean;
    authUserEmail?: string | null;
    authUserHandle?: string | null;
    authUserName?: string | null;
    authUserFavoriteTeam?: string | null;
    authUserProfileImageUrl?: string | null;
    activeFeedTab: 'all' | 'popular' | 'following';
    activePostType?: CheerPostType;
    teamColor: string;
    teamAccent: string;
    teamContrastText: string;
    teamLabel: string;
    teamLogoId?: string;
    userDisplayName: string;
    onRequireLogin: (replace?: boolean) => void;
}

const resolveProfileImage = (imageUrl?: string | null) => {
    if (!imageUrl) return null;
    if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
    return imageUrl;
};

export default function CheerComposerRuntime({
    openComposerOnMount,
    isAuthLoading,
    isLoggedIn,
    hasFavoriteTeam,
    authUserEmail,
    authUserHandle,
    authUserName,
    authUserFavoriteTeam,
    authUserProfileImageUrl,
    activeFeedTab,
    activePostType,
    teamColor,
    teamAccent,
    teamContrastText,
    teamLabel,
    teamLogoId,
    userDisplayName,
    onRequireLogin,
}: CheerComposerRuntimeProps) {
    const queryClient = useQueryClient();
    const { reset: resetAuthState } = useAuthProfileActions();
    const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
    const [hasMountedWriteModal, setHasMountedWriteModal] = useState(false);
    const [composerContent, setComposerContent] = useState('');
    const [composerFiles, setComposerFiles] = useState<File[]>([]);
    const [composerPreviews, setComposerPreviews] = useState<{ file: File; url: string }[]>([]);
    const [composerSubmitting, setComposerSubmitting] = useState(false);
    const [composerDragging, setComposerDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const previewsRef = useRef<{ file: File; url: string }[]>([]);
    const didOpenComposerFromRoute = useRef(false);
    const didNotifyLoginRequiredFromWriteRoute = useRef(false);

    useEffect(() => {
        previewsRef.current = composerPreviews;
    }, [composerPreviews]);

    useEffect(() => {
        if (isWriteModalOpen) {
            setHasMountedWriteModal(true);
        }
    }, [isWriteModalOpen]);

    useEffect(() => {
        if (!openComposerOnMount) return;
        if (didOpenComposerFromRoute.current) return;
        if (isAuthLoading) return;

        if (!isLoggedIn) {
            if (!didNotifyLoginRequiredFromWriteRoute.current) {
                didNotifyLoginRequiredFromWriteRoute.current = true;
                toast.error('로그인이 필요한 서비스입니다.');
                onRequireLogin(true);
            }
            return;
        }

        didOpenComposerFromRoute.current = true;
        setIsWriteModalOpen(true);
    }, [isAuthLoading, isLoggedIn, onRequireLogin, openComposerOnMount]);

    useEffect(() => {
        return () => {
            previewsRef.current.forEach((preview) => URL.revokeObjectURL(preview.url));
        };
    }, []);

    const addComposerFiles = (files: File[]) => {
        const MAX_SIZE = 5 * 1024 * 1024;
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

    const handleComposerFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
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

    const handleComposerDragOver = (event: DragEvent) => {
        event.preventDefault();
        setComposerDragging(true);
    };

    const handleComposerDragLeave = (event: DragEvent) => {
        event.preventDefault();
        setComposerDragging(false);
    };

    const handleComposerDrop = (event: DragEvent) => {
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
            if (!hasFavoriteTeam || !authUserFavoriteTeam) {
                throw new Error('favoriteTeam-required');
            }
            const { submitCheerPost } = await import('../utils/cheerSubmit');
            return submitCheerPost({
                teamId: authUserFavoriteTeam,
                content: payload.content,
                files: payload.files,
                postType: payload.postType,
                shareMode: payload.shareMode,
                sourceUrl: payload.sourceUrl,
                sourceTitle: payload.sourceTitle,
                sourceAuthor: payload.sourceAuthor,
                sourceLicense: payload.sourceLicense,
                sourceLicenseUrl: payload.sourceLicenseUrl,
                sourceChangedNote: payload.sourceChangedNote,
                sourceSnapshotType: payload.sourceSnapshotType,
            });
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

    const handleCreateSubmitFailure = (error: unknown) => {
        const parsedError = parseError(error);
        if (parsedError.type === 'AUTH' || parsedError.responseCode === 'INVALID_AUTHOR') {
            resetAuthState();
            onRequireLogin(true);
            return;
        }

        if (error instanceof Error && error.message === 'IMAGE_UPLOAD_FAILED') {
            return;
        }

        toast.error(parsedError.message || '게시글 등록에 실패했습니다.');
    };

    const handleComposerSubmit = async () => {
        if (!isLoggedIn) {
            onRequireLogin(false);
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
                postType: activePostType,
            });
            setComposerContent('');
            setComposerFiles([]);
            composerPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
            setComposerPreviews([]);
        } catch (error) {
            handleCreateSubmitFailure(error);
        } finally {
            setComposerSubmitting(false);
        }
    };

    return (
        <>
            <section
                className={`relative mx-4 mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all duration-200 dark:border-border dark:bg-card ${composerDragging ? 'border-2 border-dashed border-sky-300 bg-sky-50/50 dark:border-sky-500 dark:bg-sky-900/30' : ''}`}
                onDragOver={handleComposerDragOver}
                onDragLeave={handleComposerDragLeave}
                onDrop={handleComposerDrop}
            >
                {composerDragging && (
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-lg bg-sky-50/30 backdrop-blur-sm dark:bg-sky-900/30">
                        <ImagePlusIcon className="h-8 w-8 text-sky-500 dark:text-sky-400" />
                        <span className="text-[16px] font-bold text-sky-700 dark:text-sky-300">이미지를 놓으세요</span>
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
                                ringVariant="cheerFeed"
                            />
                        ) : hasFavoriteTeam ? (
                            <span
                                data-testid="profile-avatar-frame"
                                className="inline-flex h-10 w-10 items-center justify-center"
                            >
                                <TeamLogo
                                    teamId={teamLogoId}
                                    team={teamLabel}
                                    size="full"
                                    className="avatar-edge-smooth h-full w-full border border-slate-200 dark:border-slate-700"
                                />
                            </span>
                        ) : (
                            <ProfileAvatar
                                alt={authUserName || '프로필'}
                                fallbackName={authUserName || '프로필'}
                                width={40}
                                height={40}
                                showRing
                                ringVariant="cheerFeed"
                            />
                        )}
                    </div>
                    <div className="flex-1">
                        <AutosizeTextarea
                            placeholder="지금 우리 팀에게 응원을 남겨주세요!"
                            className="w-full resize-none border-none bg-transparent text-[16px] text-[#0f1419] placeholder:text-[#536471] focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-slate-500"
                            minRows={2}
                            maxRows={10}
                            value={composerContent}
                            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setComposerContent(event.target.value)}
                        />
                        <div className="mt-2 flex items-center justify-between gap-3 border-t border-border/70 pt-2 dark:border-border">
                            <div className="flex min-w-0 items-center gap-2 text-[#536471] dark:text-gray-300">
                                <button
                                    type="button"
                                    className={`group relative flex h-11 w-11 items-center justify-center rounded-full transition-colors ${composerFiles.length >= 10
                                        ? 'cursor-not-allowed opacity-50'
                                        : 'hover:bg-slate-100 dark:hover:bg-secondary'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                    aria-label="이미지 첨부"
                                    disabled={composerFiles.length >= 10}
                                >
                                    <ImagePlusIcon className="h-5 w-5" />
                                    <span className="absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[16px] text-white shadow-lg group-hover:block dark:bg-secondary">
                                        최대 10장, 각 5MB 이하
                                    </span>
                                </button>
                                {composerFiles.length >= 10 ? (
                                    <span className="text-[16px] font-bold text-amber-500 dark:text-amber-400">10장 제한</span>
                                ) : composerFiles.length > 0 ? (
                                    <span className="text-[16px] font-bold text-slate-400">{composerFiles.length}/10</span>
                                ) : null}
                                <SmileIcon className="h-5 w-5" />
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
                            <button
                                type="button"
                                data-testid="write-post-btn"
                                onClick={handleComposerSubmit}
                                className="min-h-11 shrink-0 rounded-full px-5 py-2 text-[16px] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
                                style={{ backgroundColor: teamColor, color: teamContrastText }}
                                disabled={composerSubmitting || !composerContent.trim()}
                            >
                                {composerSubmitting ? '등록 중...' : '게시하기'}
                            </button>
                        </div>
                        {composerPreviews.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                                            className="absolute right-1 top-1 flex h-11 min-h-11 w-11 items-center justify-center rounded-full bg-black/60 text-[16px] font-bold text-white"
                                            onClick={() => handleComposerRemove(index)}
                                            aria-label="첨부 이미지 제거"
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

            {hasMountedWriteModal ? (
                <Suspense
                    fallback={isWriteModalOpen ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-bold text-white">
                            작성 모달을 불러오는 중...
                        </div>
                    ) : null}
                >
                    <LazyCheerWriteModal
                        isOpen={isWriteModalOpen}
                        onClose={() => setIsWriteModalOpen(false)}
                        onSubmit={async (payload: CheerWritePayload) => {
                            try {
                                await createMutation.mutateAsync({
                                    content: payload.content,
                                    files: payload.files,
                                    postType: activePostType,
                                    shareMode: payload.shareMode,
                                    sourceUrl: payload.sourceUrl,
                                    sourceTitle: payload.sourceTitle,
                                    sourceAuthor: payload.sourceAuthor,
                                    sourceLicense: payload.sourceLicense,
                                    sourceLicenseUrl: payload.sourceLicenseUrl,
                                    sourceChangedNote: payload.sourceChangedNote,
                                    sourceSnapshotType: payload.sourceSnapshotType,
                                });
                            } catch (error) {
                                handleCreateSubmitFailure(error);
                            }
                        }}
                        teamColor={teamColor}
                        teamAccent={teamAccent}
                        teamContrastText={teamContrastText}
                        teamLabel={teamLabel}
                        teamId={teamLogoId}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
