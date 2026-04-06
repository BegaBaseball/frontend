import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCheerPost, useCheerMutations } from '../hooks/useCheerQueries';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { parseError } from '../utils/errorUtils';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { resolveCheerLikeActionPostId, resolveCheerLikeDisplayCount } from '../utils/cheerLikeState';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { Button } from './ui/button';

const LazyCheerDetailContent = lazy(() => import('./CheerDetailContent'));

export default function CheerDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const {
        userId: authUserId,
        userEmail: authUserEmail,
        userName: authUserName,
        userHandle: authUserHandle,
        userProfileImageUrl: authUserProfileImageUrl,
    } = useAuthProfileSnapshot();
    const { isLoggedIn } = useAuthSession();
    const { confirm } = useConfirmDialog();
    const authUserDisplayName = authUserName || authUserEmail || '나';
    const areCommentRepliesAvailable = false;

    const parsedPostId = postId ? parseInt(postId, 10) : 0;
    const {
        data: selectedPost,
        isLoading: loading,
        error,
        refetch: refetchPost,
    } = useCheerPost(parsedPostId, { retry: false });
    const {
        toggleLikeMutation,
        toggleBookmarkMutation,
        deletePostMutation,
        repostMutation,
        cancelRepostMutation,
    } = useCheerMutations();

    const [commentCount, setCommentCount] = useState(0);
    const [isRepostMenuOpen, setIsRepostMenuOpen] = useState(false);
    const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
    const [hasMountedQuoteEditor, setHasMountedQuoteEditor] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [hasMountedReportModal, setHasMountedReportModal] = useState(false);

    const resolvedPostId = useMemo(() => {
        if (!selectedPost) return parsedPostId;
        if (selectedPost.repostType === 'SIMPLE' && selectedPost.originalPost?.id) {
            return selectedPost.originalPost.id;
        }
        return selectedPost.id;
    }, [parsedPostId, selectedPost]);

    const likeTargetPostId = useMemo(() => {
        if (!selectedPost) return parsedPostId;
        return resolveCheerLikeActionPostId(selectedPost);
    }, [parsedPostId, selectedPost]);

    const shouldLoadSeparateLikeTarget = Boolean(
        selectedPost && likeTargetPostId && likeTargetPostId !== selectedPost.id
    );

    const { data: likeInteractionPost } = useCheerPost(likeTargetPostId, {
        enabled: shouldLoadSeparateLikeTarget,
    });
    const { data: interactionPost } = useCheerPost(resolvedPostId);

    const interactionTargetPost = interactionPost ?? selectedPost;
    const interactionLikeTargetPost = likeInteractionPost ?? selectedPost;
    const interactionLikeCount = interactionLikeTargetPost
        ? resolveCheerLikeDisplayCount(interactionLikeTargetPost)
        : 0;
    const interactionLikedByMe = Boolean(interactionLikeTargetPost?.liked);
    const interactionRepostCount = interactionTargetPost?.repostCount ?? 0;
    const interactionRepostedByMe = Boolean(interactionTargetPost?.repostedByMe);
    const interactionBookmarked = Boolean(interactionTargetPost?.bookmarked);
    const interactionBookmarkCount = interactionTargetPost?.bookmarkCount ?? selectedPost?.bookmarkCount ?? 0;

    useEffect(() => {
        if (selectedPost) {
            setCommentCount(selectedPost.commentCount ?? 0);
        }
    }, [selectedPost]);

    useEffect(() => {
        if (isQuoteEditorOpen) {
            setHasMountedQuoteEditor(true);
        }
    }, [isQuoteEditorOpen]);

    useEffect(() => {
        if (isReportModalOpen) {
            setHasMountedReportModal(true);
        }
    }, [isReportModalOpen]);

    const redirectToLogin = () => {
        navigate(buildLoginPath(getCurrentRelativeUrl()));
    };

    const handleDelete = async () => {
        if (!selectedPost) return;
        const deleteConfirmed = await confirm({
            title: '게시글 삭제',
            description: '정말 삭제하시겠습니까?',
            confirmLabel: '삭제',
            variant: 'destructive',
        });
        if (!deleteConfirmed) return;
        try {
            await deletePostMutation.mutateAsync(selectedPost.id);
            navigate('/cheer');
        } catch (e) {
            const parsed = parseError(e);
            toast.error(parsed.message || '삭제 실패');
        }
    };

    const toggleLike = () => {
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        if (!likeTargetPostId) {
            toast.error('게시글 정보를 불러오지 못했습니다.');
            return;
        }
        toggleLikeMutation.mutate(likeTargetPostId);
    };

    const toggleBookmark = () => {
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        if (!resolvedPostId) {
            toast.error('게시글 정보를 불러오지 못했습니다.');
            return;
        }
        toggleBookmarkMutation.mutate(resolvedPostId);
    };

    const handleDisplayEdit = () => {
        if (selectedPost) {
            navigate(`/cheer/edit/${selectedPost.id}`);
        }
    };

    const handleSimpleRepost = () => {
        if (!selectedPost) return;
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        setIsRepostMenuOpen(false);
        const targetPostId =
            selectedPost.repostType === 'SIMPLE' && selectedPost.originalPost?.id
                ? selectedPost.originalPost.id
                : selectedPost.id;
        repostMutation.mutate(targetPostId);
    };

    const handleQuoteRepost = () => {
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        setIsRepostMenuOpen(false);
        setIsQuoteEditorOpen(true);
    };

    const handleCancelRepost = () => {
        if (!selectedPost) return;
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        setIsRepostMenuOpen(false);
        cancelRepostMutation.mutate(selectedPost.id);
    };

    const navigateToProfile = (handle?: string | null) => {
        if (!handle) return;
        navigate(`/profile/${handle}`);
    };

    if (loading && !selectedPost) {
        return (
            <div className="min-h-screen bg-white pb-20 dark:bg-background">
                <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white/80 px-4 backdrop-blur-md dark:bg-background/80">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-card" />
                    <div className="h-4 w-40 rounded bg-gray-100 dark:bg-card" />
                    <div className="w-9" />
                </div>
                <div className="mx-auto max-w-3xl space-y-6 p-5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-card" />
                        <div className="space-y-2">
                            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-card" />
                            <div className="h-3 w-32 rounded bg-gray-100 dark:bg-card" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-5 w-2/3 rounded bg-gray-100 dark:bg-card" />
                        <div className="h-4 w-full rounded bg-gray-100 dark:bg-card" />
                        <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-card" />
                        <div className="h-4 w-4/6 rounded bg-gray-100 dark:bg-card" />
                    </div>
                    <div className="h-40 rounded-2xl bg-gray-100 dark:bg-card" />
                </div>
            </div>
        );
    }

    if (error || !selectedPost) {
        const detailErrorMessage = error instanceof Error
            ? error.message
            : '게시글을 불러오지 못했습니다.';

        return (
            <div className="min-h-screen bg-slate-50 px-4 py-12 dark:bg-background">
                <div className="mx-auto flex max-w-xl justify-center">
                    <div className="w-full rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm dark:border-white/10 dark:bg-slate-950">
                        <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            게시글을 불러오지 못했습니다.
                        </p>
                        <p className="mt-2 text-[15px] text-slate-600 dark:text-slate-300">
                            {detailErrorMessage}
                        </p>
                        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                            <Button onClick={() => void refetchPost()}>
                                다시 시도
                            </Button>
                            <Button variant="outline" onClick={() => navigate('/cheer')}>
                                목록으로 돌아가기
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-24 dark:bg-background sm:pb-20">
            <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 lg:px-8">
                <Suspense
                    fallback={(
                        <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950">
                            <div className="mb-4 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800" />
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-40 rounded bg-slate-100 dark:bg-slate-800" />
                                        <div className="h-3 w-56 rounded bg-slate-100 dark:bg-slate-800" />
                                    </div>
                                </div>
                                <div className="h-32 rounded-[22px] bg-slate-100 dark:bg-slate-800" />
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_196px]">
                                    <div className="h-64 rounded-[22px] bg-slate-100 dark:bg-slate-800" />
                                    <div className="h-40 rounded-[18px] bg-slate-100 dark:bg-slate-800" />
                                </div>
                            </div>
                        </div>
                    )}
                >
                    <LazyCheerDetailContent
                        parsedPostId={parsedPostId}
                        resolvedPostId={resolvedPostId}
                        selectedPost={selectedPost}
                        authUserId={authUserId}
                        authUserHandle={authUserHandle}
                        authUserDisplayName={authUserDisplayName}
                        authUserProfileImageUrl={authUserProfileImageUrl}
                        areCommentRepliesAvailable={areCommentRepliesAvailable}
                        commentCount={commentCount}
                        hasMountedQuoteEditor={hasMountedQuoteEditor}
                        hasMountedReportModal={hasMountedReportModal}
                        interactionBookmarked={interactionBookmarked}
                        interactionBookmarkCount={interactionBookmarkCount}
                        interactionLikeCount={interactionLikeCount}
                        interactionLikedByMe={interactionLikedByMe}
                        interactionRepostCount={interactionRepostCount}
                        interactionRepostedByMe={interactionRepostedByMe}
                        isLoggedIn={isLoggedIn}
                        isOwnerMenuOpen={isOwnerMenuOpen}
                        isQuoteEditorOpen={isQuoteEditorOpen}
                        isReportModalOpen={isReportModalOpen}
                        isRepostMenuOpen={isRepostMenuOpen}
                        confirm={confirm}
                        onCommentCountChange={setCommentCount}
                        onDeleteRequested={() => {
                            void handleDelete();
                        }}
                        onDisplayEdit={handleDisplayEdit}
                        onGoBack={() => navigate(-1)}
                        onNavigateToProfile={navigateToProfile}
                        onOwnerMenuOpenChange={setIsOwnerMenuOpen}
                        onQuoteEditorOpenChange={setIsQuoteEditorOpen}
                        onQuoteRepost={handleQuoteRepost}
                        onRedirectToLogin={redirectToLogin}
                        onReportModalOpenChange={setIsReportModalOpen}
                        onRepostMenuOpenChange={setIsRepostMenuOpen}
                        onSimpleRepost={handleSimpleRepost}
                        onToggleBookmark={toggleBookmark}
                        onToggleLike={toggleLike}
                        onCancelRepost={handleCancelRepost}
                    />
                </Suspense>
            </div>
        </div>
    );
}
