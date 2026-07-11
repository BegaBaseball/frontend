import { Suspense, lazy, useEffect, useRef, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { CheerPost } from '../api/cheerApi';
import { useCheerMutations } from '../hooks/useCheerQueries';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { getRepostPolicyDecision } from '../utils/repostPolicy';
import { resolveCheerLikeActionPostId, resolveCheerLikeDisplayCount } from '../utils/cheerLikeState';
import RollingNumber from './RollingNumber';
import {
    CheerCardBookmarkIcon as BookmarkIcon,
    CheerCardHeartIcon as HeartIcon,
    CheerCardMessageCircleIcon as MessageCircleIcon,
    CheerCardQuoteIcon as QuoteIcon,
    CheerCardRepeatIcon as RepeatIcon,
    CheerCardUndoIcon as UndoIcon,
} from './icons/CheerCardIcons';
import PlainMenu from './ui/plain-menu';

const LazyCommentModal = lazy(() => import('./CommentModal'));
const LazyQuoteRepostEditor = lazy(() => import('./QuoteRepostEditor'));

export type CheerCardInteractionIntent = 'like' | 'bookmark' | 'comment' | 'repost';

interface CheerCardInteractionsRuntimeProps {
    post: CheerPost;
    initialInteractionIntent?: CheerCardInteractionIntent | null;
    onInitialInteractionHandled: () => void;
}

export default function CheerCardInteractionsRuntime({
    post,
    initialInteractionIntent,
    onInitialInteractionHandled,
}: CheerCardInteractionsRuntimeProps) {
    const navigate = useNavigate();
    const { toggleLikeMutation, toggleBookmarkMutation, repostMutation, cancelRepostMutation } = useCheerMutations();
    const {
        userId: currentUserId,
        userHandle: currentUserHandle,
    } = useAuthProfileSnapshot();
    const { isLoggedIn } = useAuthSession();
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
    const [isRepostMenuOpen, setIsRepostMenuOpen] = useState(false);
    const [hasMountedCommentModal, setHasMountedCommentModal] = useState(false);
    const [hasMountedQuoteEditor, setHasMountedQuoteEditor] = useState(false);
    const [likeAnimating, setLikeAnimating] = useState(false);
    const [commentAnimating, setCommentAnimating] = useState(false);
    const [repostAnimating, setRepostAnimating] = useState(false);
    const likeTimerRef = useRef<number | null>(null);
    const commentTimerRef = useRef<number | null>(null);
    const repostTimerRef = useRef<number | null>(null);

    const statsSource = (post.repostType === 'SIMPLE' && post.originalPost)
        ? post.originalPost
        : post;
    const actionPostId = resolveCheerLikeActionPostId(post);
    const commentCount = statsSource.commentCount ?? 0;
    const likeCount = resolveCheerLikeDisplayCount(post);
    const repostCount = statsSource.repostCount ?? post.repostCount ?? 0;
    const bookmarkCount = post.bookmarkCount ?? 0;
    const isRepost = Boolean(post.repostType);
    const repostTargetAuthorHandle = isRepost ? post.originalPost?.authorHandle : post.authorHandle;
    const repostPolicy = getRepostPolicyDecision({
        isPostOwner: post.isOwner,
        isRepostTarget: isRepost,
        targetAuthorHandle: repostTargetAuthorHandle,
        currentUserId,
        currentUserHandle,
    });
    const canSimpleRepost = repostPolicy.canSimpleRepost;
    const canQuoteRepost = repostPolicy.canQuoteRepost;
    const canCancelRepost = isRepost && post.isOwner;
    const repostUnavailableMessage = repostPolicy.repostSimpleUnavailableMessage;
    const quoteUnavailableMessage = repostPolicy.repostQuoteUnavailableMessage;
    const repostButtonActive = canCancelRepost ? true : post.repostedByMe;
    const likeActive = Boolean(post.liked);
    const bookmarkActive = Boolean(post.bookmarked);

    useEffect(() => {
        return () => {
            if (likeTimerRef.current) window.clearTimeout(likeTimerRef.current);
            if (commentTimerRef.current) window.clearTimeout(commentTimerRef.current);
            if (repostTimerRef.current) window.clearTimeout(repostTimerRef.current);
        };
    }, []);

    useEffect(() => {
        if (isCommentModalOpen) {
            setHasMountedCommentModal(true);
        }
    }, [isCommentModalOpen]);

    useEffect(() => {
        if (isQuoteEditorOpen) {
            setHasMountedQuoteEditor(true);
        }
    }, [isQuoteEditorOpen]);

    useEffect(() => {
        if (!initialInteractionIntent) return;

        switch (initialInteractionIntent) {
            case 'like':
                void handleLikeClick();
                break;
            case 'bookmark':
                void handleBookmarkClick();
                break;
            case 'comment':
                void handleCommentClick();
                break;
            case 'repost':
                void handleRepostMenuIntent();
                break;
            default:
                break;
        }

        onInitialInteractionHandled();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialInteractionIntent]);

    const redirectToLogin = () => {
        navigate(buildLoginPath(getCurrentRelativeUrl()));
    };

    const handleLikeClick = async (event?: MouseEvent) => {
        event?.stopPropagation();
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        setLikeAnimating(true);
        toggleLikeMutation.mutate(actionPostId);
        if (likeTimerRef.current) window.clearTimeout(likeTimerRef.current);
        likeTimerRef.current = window.setTimeout(() => {
            setLikeAnimating(false);
        }, 450);
    };

    const handleBookmarkClick = async (event?: MouseEvent) => {
        event?.stopPropagation();
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        toggleBookmarkMutation.mutate(actionPostId);
    };

    const handleCommentClick = async (event?: MouseEvent) => {
        event?.stopPropagation();
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        setCommentAnimating(true);
        setIsCommentModalOpen(true);
        if (commentTimerRef.current) window.clearTimeout(commentTimerRef.current);
        commentTimerRef.current = window.setTimeout(() => {
            setCommentAnimating(false);
        }, 450);
    };

    const handleSimpleRepost = (event?: MouseEvent) => {
        event?.stopPropagation();
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        if (!canSimpleRepost) {
            toast.error(repostUnavailableMessage);
            return;
        }

        setRepostAnimating(true);
        repostMutation.mutate(actionPostId);
        setIsRepostMenuOpen(false);
        if (repostTimerRef.current) window.clearTimeout(repostTimerRef.current);
        repostTimerRef.current = window.setTimeout(() => {
            setRepostAnimating(false);
        }, 450);
    };

    const handleQuoteRepost = (event?: MouseEvent) => {
        event?.stopPropagation();
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        if (!canQuoteRepost) {
            toast.error(quoteUnavailableMessage);
            return;
        }

        setIsRepostMenuOpen(false);
        setIsQuoteEditorOpen(true);
    };

    const handleCancelRepost = (event?: MouseEvent) => {
        event?.stopPropagation();
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        setIsRepostMenuOpen(false);
        cancelRepostMutation.mutate(post.id);
    };

    const handleRepostMenuIntent = () => {
        setIsRepostMenuOpen(true);
    };

    return (
        <div className="mt-1.5 flex max-w-[420px] items-center justify-between text-body font-semibold text-[#536471] dark:text-white">
            <button
                type="button"
                className="group/comment flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors hover:text-sky-500"
                onClick={handleCommentClick}
                aria-label={`댓글 ${commentCount}개`}
            >
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors group-hover/comment:bg-sky-50 dark:group-hover/comment:bg-sky-500/20">
                    {commentAnimating && (
                        <span className="pointer-events-none absolute inset-0 rounded-full bg-sky-500/20 animate-like-ring" />
                    )}
                    <MessageCircleIcon
                        className={`h-5 w-5 ${commentAnimating ? 'animate-like-pop' : ''}`}
                    />
                </span>
                <RollingNumber value={commentCount} />
            </button>

            <PlainMenu
                open={isRepostMenuOpen}
                onOpenChange={setIsRepostMenuOpen}
                align="start"
                panelClassName="w-48 overflow-hidden p-0"
                trigger={(
                    <button
                        type="button"
                        className={`group/repost flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors ${repostButtonActive ? 'text-emerald-500' : 'hover:text-emerald-500'}`}
                        onClick={(event) => {
                            event.stopPropagation();
                            setIsRepostMenuOpen((prev) => !prev);
                        }}
                        aria-label={repostButtonActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                        aria-pressed={repostButtonActive}
                        aria-expanded={isRepostMenuOpen}
                        aria-haspopup="menu"
                    >
                        <span
                            className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${repostButtonActive ? 'bg-emerald-50 dark:bg-emerald-500/20' : 'group-hover/repost:bg-emerald-50 dark:group-hover/repost:bg-emerald-500/20'}`}
                        >
                            {repostAnimating && (
                                <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/30 animate-like-ring" />
                            )}
                            <RepeatIcon
                                className={`h-5 w-5 transition-all duration-200 ${repostButtonActive
                                    ? 'text-emerald-500 scale-110'
                                    : ''
                                    } ${repostAnimating ? 'animate-like-pop' : ''}`}
                            />
                        </span>
                        <RollingNumber value={repostCount} />
                    </button>
                )}
            >
                <div className="flex flex-col py-1">
                    {canCancelRepost ? (
                        <button
                            type="button"
                            role="menuitem"
                            onClick={handleCancelRepost}
                            className="flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            <div className="flex items-center justify-center w-5 h-5">
                                <UndoIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <span className="block text-body font-bold text-red-600 dark:text-red-400">
                                    리포스트 삭제
                                </span>
                                <span className="text-body font-bold text-red-500/80 dark:text-red-400/80">
                                    내 프로필에서 제거됩니다
                                </span>
                            </div>
                        </button>
                    ) : !canSimpleRepost && !canQuoteRepost ? (
                        <div className="px-4 py-3 text-center">
                            <p className="text-body font-bold text-gray-500 dark:text-white">
                                {repostUnavailableMessage}
                            </p>
                        </div>
                    ) : (
                        <>
                            {canSimpleRepost ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleSimpleRepost}
                                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center justify-center w-5 h-5">
                                        {post.repostedByMe ? (
                                            <UndoIcon className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <RepeatIcon className="w-4 h-4 text-gray-500 dark:text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <span className={`block text-body font-bold ${post.repostedByMe
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-gray-700 dark:text-white'}`}
                                        >
                                            {post.repostedByMe ? '리포스트 취소' : '리포스트'}
                                        </span>
                                    </div>
                                </button>
                            ) : null}
                            {canQuoteRepost ? (
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleQuoteRepost}
                                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <div className="flex items-center justify-center w-5 h-5">
                                        <QuoteIcon className="w-4 h-4 text-gray-500 dark:text-white" />
                                    </div>
                                    <div>
                                        <span className="block text-body font-bold text-gray-700 dark:text-white">
                                            인용하기
                                        </span>
                                    </div>
                                </button>
                            ) : isRepost ? (
                                <div className="px-4 py-3 text-center">
                                    <p className="text-body font-bold text-gray-500 dark:text-white">
                                        {repostUnavailableMessage}
                                    </p>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </PlainMenu>

            <button
                type="button"
                className={`group/like flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors ${likeActive ? 'text-rose-500' : 'hover:text-rose-500'}`}
                onClick={handleLikeClick}
                aria-label={likeActive ? `좋아요 취소 (현재 ${likeCount}개)` : `좋아요 (현재 ${likeCount}개)`}
                aria-pressed={likeActive}
            >
                <span
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${likeActive ? 'bg-rose-50 dark:bg-rose-500/20' : 'group-hover/like:bg-rose-50 dark:group-hover/like:bg-rose-500/20'}`}
                >
                    {likeAnimating && (
                        <span className="pointer-events-none absolute inset-0 rounded-full bg-rose-500/30 animate-like-ring" />
                    )}
                    <HeartIcon
                        className={`h-5 w-5 transition-all duration-200 ${likeActive
                            ? 'fill-rose-500 text-rose-500 scale-110'
                            : 'fill-transparent'
                            } ${likeAnimating ? 'animate-like-pop' : ''}`}
                    />
                </span>
                <RollingNumber value={likeCount} />
            </button>

            <button
                type="button"
                className={`group/bookmark flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors ${bookmarkActive ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                onClick={handleBookmarkClick}
                aria-label={bookmarkActive ? '북마크 취소' : '북마크'}
                aria-pressed={bookmarkActive}
            >
                <span
                    className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${bookmarkActive ? 'bg-yellow-50 dark:bg-yellow-500/20' : 'group-hover/bookmark:bg-yellow-50 dark:group-hover/bookmark:bg-yellow-500/20'}`}
                >
                    <BookmarkIcon
                        className={`h-5 w-5 transition-all duration-200 ${bookmarkActive
                            ? 'fill-yellow-500 text-yellow-500 scale-110'
                            : 'fill-transparent'
                            }`}
                    />
                </span>
                <RollingNumber value={bookmarkCount} />
            </button>

            <div onClick={(e) => e.stopPropagation()}>
                {hasMountedCommentModal && (
                    <Suspense
                        fallback={isCommentModalOpen ? (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-body font-bold text-white">
                                댓글 모달을 불러오는 중...
                            </div>
                        ) : null}
                    >
                        <LazyCommentModal
                            isOpen={isCommentModalOpen}
                            onClose={() => setIsCommentModalOpen(false)}
                            post={post}
                            targetPostId={actionPostId}
                        />
                    </Suspense>
                )}

                {hasMountedQuoteEditor && (
                    <Suspense
                        fallback={isQuoteEditorOpen ? (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-body font-bold text-white">
                                인용 작성기를 불러오는 중...
                            </div>
                        ) : null}
                    >
                        <LazyQuoteRepostEditor
                            isOpen={isQuoteEditorOpen}
                            onClose={() => setIsQuoteEditorOpen(false)}
                            post={post}
                        />
                    </Suspense>
                )}
            </div>
        </div>
    );
}
