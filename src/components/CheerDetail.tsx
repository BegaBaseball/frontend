import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, Variants } from 'framer-motion';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
    ArrowLeft,
    Bookmark,
    Clock3,
    Edit2,
    ExternalLink,
    Eye,
    Flag,
    Flame,
    Heart,
    Megaphone,
    MessageSquare,
    MoreVertical,
    Quote,
    Repeat2,
    Trash2,
    Undo2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from './ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from './ui/popover';
import { cn } from '../lib/utils';
import { ProfileAvatar } from './ui/ProfileAvatar';
import * as cheatApi from '../api/cheerApi';
import { Comment } from '../api/cheerApi';
import { CommentItem } from './cheer/CommentItem';
import AdSlot from './ads/AdSlot';
import EmbeddedPost from './EmbeddedPost';
import ImageGrid from './ImageGrid';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import { formatTimeAgo } from '../utils/time';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useCheerPost, useCheerMutations } from '../hooks/useCheerQueries';
import ReportModal from './ReportModal';
import QuoteRepostEditor from './QuoteRepostEditor';
import {
    getRepostPolicyDecision,
} from '../utils/repostPolicy';
import {
    getReadableAccent,
    hexToRgb,
    normalizeHexColor,
    toRgba,
} from '../utils/teamColors';
import { buildLoginPath, getCurrentRelativeUrl } from '../utils/loginRedirect';
import { getDuplicateCommentErrorMessage, parseError } from '../utils/errorUtils';

const detailDateFormatter = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
});
const commentListVariants: Variants = {
    hidden: { opacity: 0.95 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04,
            delayChildren: 0.02,
        },
    },
};
const commentItemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
    },
};
const detailMotion = {
    articleEnter: {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
    },
    shortEnter: {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
    },
};
const actionButtonTransition = { type: 'spring' as const, stiffness: 360, damping: 22 };

const blendHexColors = (baseHex: string, mixHex: string, mixWeight: number) => {
    const base = hexToRgb(normalizeHexColor(baseHex));
    const mix = hexToRgb(normalizeHexColor(mixHex));
    const weight = Math.max(0, Math.min(1, mixWeight));
    const blend = (baseChannel: number, mixChannel: number) =>
        Math.round(baseChannel * (1 - weight) + mixChannel * weight);

    return `#${[blend(base.r, mix.r), blend(base.g, mix.g), blend(base.b, mix.b)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase();
};

const createMutedTeamAccent = (teamHex: string) => {
    const normalized = normalizeHexColor(teamHex);
    const slateMixed = blendHexColors(normalized, '#475569', 0.45);
    return getReadableAccent(slateMixed);
};

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
    const areCommentRepliesAvailable = false;
    const { isLoggedIn } = useAuthSession();
    const authUserDisplayName = authUserName || authUserEmail || '나';
    const { confirm } = useConfirmDialog();

    const parsedPostId = postId ? parseInt(postId) : 0;
    const {
        data: selectedPost,
        isLoading: loading,
        error,
        refetch: refetchPost,
    } = useCheerPost(parsedPostId, { retry: false });
    const { toggleLikeMutation, toggleBookmarkMutation, deletePostMutation, deleteCommentMutation, repostMutation, cancelRepostMutation } = useCheerMutations();

    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<(cheatApi.Comment & { isPending?: boolean })[]>([]);
    const [commentCount, setCommentCount] = useState(0);
    const [sendingComment, setSendingComment] = useState(false);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentsError, setCommentsError] = useState<string | null>(null);
    const [activeReplyId, setActiveReplyId] = useState<number | null>(null);
    const [replyDraft, setReplyDraft] = useState('');
    const [isReplyPending, setIsReplyPending] = useState(false);
    const [commentLikeAnimating, setCommentLikeAnimating] = useState<Record<number, boolean>>({});
    const commentLikeTimersRef = useRef<Record<number, number>>({});
    const commentsSectionRef = useRef<HTMLDivElement | null>(null);
    const [isRepostPopoverOpen, setIsRepostPopoverOpen] = useState(false);
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);

    // Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    const resolvedPostId = useMemo(() => {
        if (!selectedPost) return parsedPostId;
        if (selectedPost.repostType === 'SIMPLE' && selectedPost.originalPost?.id) {
            return selectedPost.originalPost.id;
        }
        return selectedPost.id;
    }, [selectedPost, parsedPostId]);

    const { data: interactionPost } = useCheerPost(resolvedPostId);
    const interactionTargetPost = interactionPost ?? selectedPost;
    const interactionLikeCount = interactionTargetPost?.likeCount ?? 0;
    const interactionLikedByMe = Boolean(interactionTargetPost?.liked);
    const interactionRepostCount = interactionTargetPost?.repostCount ?? 0;
    const interactionRepostedByMe = Boolean(interactionTargetPost?.repostedByMe);
    const interactionBookmarked = Boolean(interactionTargetPost?.bookmarked);
    const interactionBookmarkCount = interactionTargetPost?.bookmarkCount ?? selectedPost?.bookmarkCount ?? 0;

    useEffect(() => {
        if (resolvedPostId) {
            loadComments(resolvedPostId);
        }
    }, [resolvedPostId]);

    useEffect(() => {
        if (selectedPost) {
            setCommentCount(selectedPost.commentCount ?? 0);
        }
    }, [selectedPost]);

    useEffect(() => {
        return () => {
            Object.values(commentLikeTimersRef.current).forEach((timerId) => {
                window.clearTimeout(timerId);
            });
        };
    }, []);

    const loadComments = async (postId: number) => {
        setCommentsLoading(true);
        setCommentsError(null);
        try {
            const data = await cheatApi.fetchComments(postId);
            setComments(data.content);
            if (typeof data.totalElements === 'number') {
                setCommentCount(data.totalElements);
            } else {
                setCommentCount(data.content?.length ?? 0);
            }
        } catch (e) {
            console.error('댓글 목록 로드 실패:', e);
            setCommentsError('댓글을 불러오지 못했습니다.');
        } finally {
            setCommentsLoading(false);
        }
    };

    const redirectToLogin = () => {
        navigate(buildLoginPath(getCurrentRelativeUrl()));
    };

    const handleDelete = async () => {
        if (!selectedPost) return;
        const deleteConfirmed = await confirm({ title: '게시글 삭제', description: '정말 삭제하시겠습니까?', confirmLabel: '삭제', variant: 'destructive' });
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
        if (!resolvedPostId) {
            toast.error('게시글 정보를 불러오지 못했습니다.');
            return;
        }
        toggleLikeMutation.mutate(resolvedPostId);
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
        setIsRepostPopoverOpen(false);
        const targetPostId = selectedPost.repostType === 'SIMPLE' && selectedPost.originalPost?.id
            ? selectedPost.originalPost.id
            : selectedPost.id;
        repostMutation.mutate(targetPostId);
    };

    const handleQuoteRepost = () => {
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        setIsRepostPopoverOpen(false);
        setIsQuoteEditorOpen(true);
    };

    const handleCancelRepost = () => {
        if (!selectedPost) return;
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        setIsRepostPopoverOpen(false);
        cancelRepostMutation.mutate(selectedPost.id);
    };

    const handleCommentSubmit = async () => {
        if (!selectedPost || !commentText.trim()) return;
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        const trimmed = commentText.trim();
        const draft = commentText;
        const optimisticId = Date.now() * -1;
        const targetPostId = resolvedPostId ?? selectedPost.id;
        const optimisticComment = {
            id: optimisticId,
            author: authUserDisplayName,
            content: trimmed,
            timeAgo: '방금 전',
            likes: 0,
            likeCount: 0,
            likedByMe: false,
            authorProfileImageUrl: authUserProfileImageUrl ?? undefined,
            isPending: true,
        };

        setCommentText('');
        setComments((prev) => [optimisticComment, ...prev]);
        setCommentCount((prev) => prev + 1);
        setSendingComment(true);

        try {
            const created = await cheatApi.createComment(targetPostId, trimmed);
            if (created?.id) {
                setComments((prev) =>
                    prev.map((comment) =>
                        comment.id === optimisticId ? { ...created, isPending: false } : comment
                    )
                );
            } else {
                await loadComments(targetPostId);
            }
            // Recalculate comments by reloading or rely on local state
        } catch (e) {
            setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
            setCommentCount((prev) => Math.max(0, prev - 1));
            setCommentText(draft);
            const parsed = parseError(e);
            toast.error(getDuplicateCommentErrorMessage(e, parsed.message || '댓글 작성 실패'));
        } finally {
            setSendingComment(false);
        }
    };

    const updateCommentLikes = (
        list: (cheatApi.Comment & { isPending?: boolean })[],
        targetId: number
    ): (cheatApi.Comment & { isPending?: boolean })[] => {
        return list.map((comment) => {
            if (comment.id === targetId) {
                const isLiked = Boolean(comment.likedByMe);
                const currentCount = comment.likeCount ?? comment.likes ?? 0;
                return {
                    ...comment,
                    likedByMe: !isLiked,
                    likeCount: currentCount + (isLiked ? -1 : 1),
                };
            }
            if (comment.replies && comment.replies.length > 0) {
                return {
                    ...comment,
                    replies: updateCommentLikes(comment.replies, targetId),
                };
            }
            return comment;
        });
    };

    const handleCommentLike = async (commentId: number) => {
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }

        // Optimistic update
        setComments((prev) => updateCommentLikes(prev, commentId));
        setCommentLikeAnimating((prev) => ({ ...prev, [commentId]: true }));

        if (commentLikeTimersRef.current[commentId]) {
            window.clearTimeout(commentLikeTimersRef.current[commentId]);
        }
        commentLikeTimersRef.current[commentId] = window.setTimeout(() => {
            setCommentLikeAnimating((prev) => ({ ...prev, [commentId]: false }));
        }, 450);

        try {
            await cheatApi.toggleCommentLike(commentId);
        } catch (e) {
            console.error('Comment like failed', e);
            // Rollback
            setComments((prev) => updateCommentLikes(prev, commentId));
            toast.error(parseError(e).message || '좋아요 처리 실패');
        }
    };

    const handleReplyToggle = (commentId: number) => {
        if (!isLoggedIn) {
            redirectToLogin();
            return;
        }
        setActiveReplyId((prev) => (prev === commentId ? null : commentId));
        setReplyDraft('');
    };

    const handleReplyChange = (commentId: number, value: string) => {
        if (activeReplyId === commentId) {
            setReplyDraft(value);
        }
    };

    const handleReplyCancel = () => {
        setActiveReplyId(null);
        setReplyDraft('');
    };

    const handleReplySubmit = async (commentId: number) => {
        if (!commentId || commentId !== activeReplyId) return;
        if (!replyDraft.trim()) return;
        setIsReplyPending(true);
        try {
            toast.info('답글 기능은 준비 중입니다.');
            handleReplyCancel();
        } finally {
            setIsReplyPending(false);
        }
    };

    const handleCommentDelete = async (commentId: number) => {
        const commentDeleteConfirmed = await confirm({ title: '댓글 삭제', description: '댓글을 삭제하시겠습니까?', confirmLabel: '삭제', variant: 'destructive' });
        if (!commentDeleteConfirmed) return;

        // Optimistic update: filter out the deleted comment locally
        const previousComments = [...comments];

        // Helper to remove comment from nested structure
        const filterComments = (list: Comment[], targetId: number): Comment[] => {
            return list.filter(c => c.id !== targetId).map(c => ({
                ...c,
                replies: c.replies ? filterComments(c.replies, targetId) : []
            }));
        };

        setComments(prev => filterComments(prev, commentId));
        setCommentCount(prev => Math.max(0, prev - 1));

        try {
            await deleteCommentMutation.mutateAsync(commentId);
        } catch (e) {
            console.error('Comment deletion failed', e);
            // Rollback
            setComments(previousComments);
            setCommentCount(previousComments.length); // Approximate, or more precise if needed
            toast.error(parseError(e).message || '댓글 삭제 실패');
        }
    };

    const scrollToComments = () => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const resolveProfileImage = (imageUrl?: string) => {
        if (!imageUrl) return baseballLogo;
        if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return DEFAULT_PROFILE_IMAGE;
        return imageUrl;
    };

    const navigateToProfile = (handle?: string) => {
        if (!handle) return;
        navigate(`/profile/${handle}`);
    };

    if (loading && !selectedPost) {
        return (
            <div className="min-h-screen bg-white dark:bg-background pb-20">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-background/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-card" />
                    <div className="h-4 w-40 rounded bg-gray-100 dark:bg-card" />
                    <div className="w-9" />
                </div>
                <div className="max-w-3xl mx-auto p-5 space-y-6">
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
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
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

    const repostCount = interactionRepostCount;
    const isRepost = Boolean(selectedPost.repostType);
    const isSimpleRepost = selectedPost.repostType === 'SIMPLE' && Boolean(selectedPost.originalPost);
    const isQuoteRepost = selectedPost.repostType === 'QUOTE' && Boolean(selectedPost.originalPost);
    const repostTargetAuthorHandle = isRepost ? selectedPost.originalPost?.authorHandle : selectedPost.authorHandle;
    const repostPolicy = getRepostPolicyDecision({
        isPostOwner: selectedPost.isOwner,
        isRepostTarget: isRepost,
        targetAuthorHandle: repostTargetAuthorHandle,
        currentUserId: authUserId,
        currentUserHandle: authUserHandle,
    });
    const canSimpleRepost = repostPolicy.canSimpleRepost;
    const canQuoteRepost = repostPolicy.canQuoteRepost;
    const repostUnavailableMessage = repostPolicy.repostSimpleUnavailableMessage;
    const canCancelRepost = isRepost && selectedPost.isOwner;
    const repostButtonActive = canCancelRepost ? true : interactionRepostedByMe;
    const originalEmbeddedPost = selectedPost.originalPost
        ? { ...selectedPost.originalPost, deleted: selectedPost.originalDeleted || selectedPost.originalPost.deleted }
        : null;
    const displayAuthor = isSimpleRepost && selectedPost.originalPost ? selectedPost.originalPost.author : selectedPost.author;
    const displayAuthorHandle = isSimpleRepost && selectedPost.originalPost ? selectedPost.originalPost.authorHandle : selectedPost.authorHandle;
    const displayAuthorHandleLabel = displayAuthorHandle
        ? displayAuthorHandle.startsWith('@') ? displayAuthorHandle : `@${displayAuthorHandle}`
        : '@fan';
    const displayAuthorProfileImageUrl = isSimpleRepost && selectedPost.originalPost
        ? selectedPost.originalPost.authorProfileImageUrl
        : selectedPost.authorProfileImageUrl;
    const displayAuthorTeamId = isSimpleRepost && selectedPost.originalPost
        ? selectedPost.originalPost.teamId
        : (selectedPost.authorTeamId || selectedPost.teamId);
    const displayContent = isSimpleRepost && selectedPost.originalPost && !selectedPost.originalDeleted
        ? selectedPost.originalPost.content
        : selectedPost.content;
    const displayImageUrls = isSimpleRepost && selectedPost.originalPost && !selectedPost.originalDeleted
        ? selectedPost.originalPost.imageUrls
        : (selectedPost.imageUrls ?? []);
    const displayCreatedAt = isSimpleRepost && selectedPost.originalPost
        ? selectedPost.originalPost.createdAt
        : selectedPost.createdAt;
    const displayTimeAgo = isSimpleRepost && selectedPost.originalPost
        ? formatTimeAgo(selectedPost.originalPost.createdAt)
        : selectedPost.timeAgo;
    const displayTeamId = displayAuthorTeamId || selectedPost.teamId;
    const displayTeamInfo = displayTeamId ? TEAM_DATA[displayTeamId] : undefined;
    const detailTheme = normalizeHexColor(selectedPost.teamColor || displayTeamInfo?.color);
    const detailAccent = createMutedTeamAccent(detailTheme);
    const teamName = displayTeamInfo?.fullName || selectedPost.team || '응원석';
    const primaryBorderStyle = { borderColor: toRgba(detailAccent, 0.16) };
    const softBadgeStyle = {
        borderColor: toRgba(detailAccent, 0.14),
        backgroundColor: toRgba(detailAccent, 0.08),
        color: detailAccent,
    };
    const surfaceTintStyle = { backgroundColor: toRgba(detailAccent, 0.045) };
    const createdAtLabel = detailDateFormatter.format(new Date(displayCreatedAt));
    const repostedAtLabel = isRepost ? detailDateFormatter.format(new Date(selectedPost.createdAt)) : null;

    return (
        <div className="min-h-screen bg-slate-50 pb-24 sm:pb-20 dark:bg-background">
            <div className="mx-auto w-full max-w-[980px] px-4 sm:px-6 lg:px-8">
                <motion.article
                    initial={detailMotion.articleEnter.initial}
                    animate={detailMotion.articleEnter.animate}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="relative mt-4 overflow-hidden rounded-[24px] border bg-white shadow-[0_20px_60px_-44px_rgba(15,23,42,0.42)] dark:bg-slate-950"
                    style={primaryBorderStyle}
                >
                    <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: detailAccent }} />

                    <div className="relative px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
                        <motion.div
                            initial={detailMotion.shortEnter.initial}
                            animate={detailMotion.shortEnter.animate}
                            transition={{ duration: 0.3, delay: 0.02, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col gap-4"
                        >
                            <motion.div
                                initial={detailMotion.shortEnter.initial}
                                animate={detailMotion.shortEnter.animate}
                                transition={{ duration: 0.26, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
                                className="flex items-start justify-between gap-4"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => navigate(-1)}
                                            className="rounded-full p-1.5 -ml-2 text-slate-700 transition-colors hover:bg-black/5 sm:p-2 dark:text-slate-200 dark:hover:bg-white/10"
                                            aria-label="이전으로"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm sm:px-2.5 sm:py-1 sm:text-[11px]" style={softBadgeStyle}>
                                            <Megaphone className="h-3 w-3" />
                                            {teamName}
                                        </span>
                                        {selectedPost.postType === 'NOTICE' && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white sm:px-2.5 sm:py-1 sm:text-[11px] dark:border-white/10 dark:bg-white dark:text-slate-950">
                                                공지
                                            </span>
                                        )}
                                        {selectedPost.isHot && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 sm:px-2.5 sm:py-1 sm:text-[11px] dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                                                <Flame className="h-3 w-3" />
                                                HOT
                                            </span>
                                        )}
                                        {isSimpleRepost && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:px-2.5 sm:py-1 sm:text-[11px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                                <Repeat2 className="h-3 w-3" />
                                                <span className="max-sm:hidden">리포스트</span>
                                                <span className="sm:hidden">리포</span>
                                            </span>
                                        )}
                                        {isQuoteRepost && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 sm:px-2.5 sm:py-1 sm:text-[11px] dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300">
                                                <Quote className="h-3 w-3" />
                                                <span className="max-sm:hidden">인용 응원</span>
                                                <span className="sm:hidden">인용</span>
                                            </span>
                                        )}
                                        {selectedPost.shareMode?.startsWith('EXTERNAL_') && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 sm:px-2.5 sm:py-1 sm:text-[11px] dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                                                <ExternalLink className="h-3 w-3" />
                                                <span className="max-sm:hidden">외부 출처</span>
                                                <span className="sm:hidden">외부</span>
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2.5 flex items-start gap-2.5 sm:mt-3 sm:gap-3">
                                        <div
                                            className="relative h-9 w-9 flex-shrink-0 cursor-pointer rounded-full transition-transform hover:scale-[1.02] sm:h-10 sm:w-10"
                                            onClick={() => navigateToProfile(displayAuthorHandle)}
                                        >
                                            <ProfileAvatar
                                                src={resolveProfileImage(displayAuthorProfileImageUrl) || undefined}
                                                alt={displayAuthor}
                                                fallbackName={displayAuthor}
                                                width={48}
                                                height={48}
                                                showRing
                                                ringClassName="p-px bg-black/5 dark:bg-white/10"
                                                className="!h-full !w-full object-cover block image-render-quality"
                                            />
                                            {displayAuthorTeamId && (
                                                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white p-0.5 shadow-sm dark:bg-slate-800">
                                                    <TeamLogo
                                                        team={TEAM_DATA[displayAuthorTeamId]?.name || displayAuthorTeamId}
                                                        size={18}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            {isRepost && (
                                                <p className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    {isSimpleRepost
                                                        ? `${selectedPost.author}님이 ${selectedPost.timeAgo}에 다시 응원한 글`
                                                        : `${selectedPost.author}님의 인용 응원글`}
                                                </p>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => navigateToProfile(displayAuthorHandle)}
                                                className="truncate text-left text-[15px] font-bold text-slate-950 transition-colors hover:underline dark:text-slate-50 sm:text-[18px]"
                                            >
                                                {displayAuthor}
                                            </button>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-[12px]">
                                                <span>{displayAuthorHandleLabel}</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock3 className="h-3 w-3" />
                                                    {displayTimeAgo}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Eye className="h-3 w-3" />
                                                    조회 {selectedPost.views.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    {selectedPost.isOwner ? (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700 sm:p-2 dark:hover:bg-white/10 dark:hover:text-slate-100"
                                                    aria-label="게시물 메뉴"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={handleDisplayEdit}>
                                                    <Edit2 className="mr-2 h-4 w-4" />
                                                    수정하기
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    삭제하기
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    ) : isLoggedIn ? (
                                        <button
                                            type="button"
                                            onClick={() => setIsReportModalOpen(true)}
                                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:p-2 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                            title="신고하기"
                                            aria-label="신고하기"
                                        >
                                            <Flag className="w-5 h-5" />
                                        </button>
                                    ) : null}
                                </div>
                            </motion.div>

                            <AnimatePresence>
                                {isRepost && originalEmbeddedPost && (
                                    <motion.div
                                        key="repost-context"
                                        initial={{ opacity: 0, y: -4, height: 0 }}
                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                        exit={{ opacity: 0, y: -4, height: 0 }}
                                        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                        className="rounded-[20px] border p-3.5 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
                                        style={{
                                            ...primaryBorderStyle,
                                            ...surfaceTintStyle,
                                        }}
                                    >
                                        <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: detailAccent }}>
                                            {isQuoteRepost ? <Quote className="h-3.5 w-3.5" /> : <Repeat2 className="h-3.5 w-3.5" />}
                                            <span>
                                                {isSimpleRepost
                                                    ? '원본 글의 반응과 댓글이 그대로 연결됩니다.'
                                                    : '인용된 원문을 함께 확인할 수 있습니다.'}
                                            </span>
                                        </div>
                                        {isQuoteRepost ? (
                                            <EmbeddedPost
                                                post={originalEmbeddedPost}
                                                className="mt-4 bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
                                            />
                                        ) : null}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_196px]">
                                <div className="min-w-0">
                                    <div
                                        className="rounded-[22px] border bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-5"
                                        style={primaryBorderStyle}
                                    >
                                        {isSimpleRepost && selectedPost.originalDeleted && originalEmbeddedPost ? (
                                            <EmbeddedPost
                                                post={originalEmbeddedPost}
                                                className="mt-0 bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
                                            />
                                        ) : (
                                            <>
                                                <div className="whitespace-pre-wrap break-words text-[15px] leading-6 text-slate-900 dark:text-slate-100 sm:text-[16px] sm:leading-7">
                                                    {displayContent}
                                                </div>

                                                {selectedPost.shareMode?.startsWith('EXTERNAL_') && selectedPost.sourceInfo?.url && (
                                                    <a
                                                        href={selectedPost.sourceInfo.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-4 flex items-start justify-between gap-3 rounded-[18px] border border-sky-200 bg-sky-50/80 px-3.5 py-3 text-left text-sky-800 transition-colors hover:bg-sky-100 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/15"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">출처</p>
                                                            <p className="mt-1 truncate text-sm font-medium">{selectedPost.sourceInfo.url}</p>
                                                            <p className="mt-1 text-xs text-sky-700/80 dark:text-sky-200/80">
                                                                {selectedPost.sourceInfo.author || '작성자 미상'}
                                                                {selectedPost.sourceInfo.license ? ` · ${selectedPost.sourceInfo.license}` : ''}
                                                            </p>
                                                        </div>
                                                        <ExternalLink className="mt-0.5 h-4 w-4 flex-shrink-0" />
                                                    </a>
                                                )}

                                                {displayImageUrls.length > 0 && (
                                                    <div className="mt-4">
                                                        <ImageGrid images={displayImageUrls} />
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="mt-4 grid grid-cols-4 gap-1.5">
                                            <motion.button
                                                type="button"
                                                whileHover={{ y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={actionButtonTransition}
                                                onClick={toggleLike}
                                                aria-label={`좋아요 ${interactionLikeCount.toLocaleString()}`}
                                                className={cn(
                                                    'flex h-9 items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all sm:h-10 sm:gap-1',
                                                    interactionLikedByMe
                                                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-950'
                                                )}
                                            >
                                                <Heart className={cn('h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4', interactionLikedByMe && 'fill-current')} />
                                                <span className="text-[11px] font-bold leading-none sm:text-[13px]">{interactionLikeCount.toLocaleString()}</span>
                                            </motion.button>

                                            <motion.button
                                                type="button"
                                                whileHover={{ y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={actionButtonTransition}
                                                onClick={scrollToComments}
                                                aria-label={`댓글 ${commentCount.toLocaleString()}`}
                                                className="flex h-9 items-center justify-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 text-center text-slate-700 transition-all hover:border-sky-200 hover:bg-sky-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-sky-500/20 dark:hover:bg-sky-500/10 sm:h-10 sm:gap-1"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                                                <span className="text-[11px] font-bold leading-none sm:text-[13px]">{commentCount.toLocaleString()}</span>
                                            </motion.button>

                                            <Popover
                                                open={isRepostPopoverOpen}
                                                onOpenChange={(open: boolean) => {
                                                    if (open && !isLoggedIn) {
                                                        redirectToLogin();
                                                        return;
                                                    }
                                                    setIsRepostPopoverOpen(open);
                                                }}
                                            >
                                                <PopoverTrigger asChild>
                                                    <motion.button
                                                        type="button"
                                                        whileHover={{ y: -1 }}
                                                        whileTap={{ scale: 0.98 }}
                                                        transition={actionButtonTransition}
                                                        className={cn(
                                                            'flex h-9 items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all sm:h-10 sm:gap-1',
                                                            repostButtonActive
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/10'
                                                        )}
                                                        aria-label={repostButtonActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                                                        aria-pressed={repostButtonActive}
                                                    >
                                                        <Repeat2 className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                                                        <span className="text-[11px] font-bold leading-none sm:text-[13px]">{repostCount.toLocaleString()}</span>
                                                    </motion.button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-56 p-0"
                                                    align="start"
                                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                                >
                                                    <div className="flex flex-col py-1">
                                                        {canCancelRepost ? (
                                                            <button
                                                                type="button"
                                                                onClick={handleCancelRepost}
                                                                aria-label="리포스트 삭제"
                                                                className="flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            >
                                                                <Undo2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                                <div>
                                                                    <span className="block text-sm font-medium text-red-600 dark:text-red-400">
                                                                        리포스트 삭제
                                                                    </span>
                                                                    <span className="text-[11px] text-red-500/80 dark:text-red-400/80">
                                                                        내 프로필에서 제거됩니다
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ) : canSimpleRepost || canQuoteRepost ? (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleSimpleRepost}
                                                                    aria-label="리포스트"
                                                                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                >
                                                                    <div className="flex items-center justify-center w-5 h-5">
                                                                        {interactionRepostedByMe ? (
                                                                            <Undo2 className="w-4 h-4 text-emerald-500" />
                                                                        ) : (
                                                                            <Repeat2 className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <span className={`block text-sm font-medium ${interactionRepostedByMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                                            {interactionRepostedByMe ? '리포스트 취소' : '리포스트'}
                                                                        </span>
                                                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                            원문 반응을 함께 가져옵니다
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            {canQuoteRepost ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={handleQuoteRepost}
                                                                    aria-label="인용하기"
                                                                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                                >
                                                                    <div className="flex items-center justify-center w-5 h-5">
                                                                        <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                                                                    </div>
                                                                    <div>
                                                                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                                                            인용하기
                                                                        </span>
                                                                        <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                                                            내 응원을 덧붙여 공유합니다
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            ) : null}
                                                            </>
                                                        ) : (
                                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                                                {repostUnavailableMessage}
                                                            </div>
                                                        )}
                                                    </div>
                                                </PopoverContent>
                                            </Popover>

                                            <motion.button
                                                type="button"
                                                whileHover={{ y: -1 }}
                                                whileTap={{ scale: 0.98 }}
                                                transition={actionButtonTransition}
                                                onClick={toggleBookmark}
                                                aria-label={`북마크 ${interactionBookmarkCount.toLocaleString()}`}
                                                className={cn(
                                                    'flex h-9 items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all sm:h-10 sm:gap-1',
                                                    interactionBookmarked
                                                        ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/10'
                                                )}
                                            >
                                                <Bookmark className={cn('h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4', interactionBookmarked && 'fill-current')} />
                                                <span className="text-[11px] font-bold leading-none sm:text-[13px]">
                                                    {interactionBookmarkCount.toLocaleString()}
                                                </span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                <aside>
                                    <div
                                        className="rounded-[18px] border bg-white/85 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80"
                                        style={primaryBorderStyle}
                                    >
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em]" style={{ color: detailAccent }}>
                                            응원 현황
                                        </p>
                                        <div
                                            className="mt-2.5 rounded-[14px] border px-2.5 py-2"
                                            style={{
                                                ...primaryBorderStyle,
                                                ...surfaceTintStyle,
                                            }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="inline-flex h-6 w-6 items-center justify-center rounded-full"
                                                    style={{ backgroundColor: toRgba(detailAccent, 0.12), color: detailAccent }}
                                                >
                                                    <Megaphone className="h-3.5 w-3.5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">응원 구단</p>
                                                    <p className="truncate text-[13px] font-semibold text-slate-900 dark:text-slate-100">{teamName}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center justify-between rounded-[14px] bg-slate-50 px-2.5 py-2 dark:bg-slate-950/70">
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">원문 작성</span>
                                                <span className="max-w-[108px] text-right text-[12px] font-semibold text-slate-800 dark:text-slate-100">{createdAtLabel}</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-[14px] bg-slate-50 px-2.5 py-2 dark:bg-slate-950/70">
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">조회수</span>
                                                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{selectedPost.views.toLocaleString()}회</span>
                                            </div>
                                            <div className="flex items-center justify-between rounded-[14px] bg-slate-50 px-2.5 py-2 dark:bg-slate-950/70">
                                                <span className="text-[11px] text-slate-500 dark:text-slate-400">대화 수</span>
                                                <span className="text-[12px] font-semibold text-slate-800 dark:text-slate-100">{commentCount.toLocaleString()}개</span>
                                            </div>
                                            {repostedAtLabel && (
                                                <div className="flex items-center justify-between rounded-[14px] bg-slate-50 px-2.5 py-2 dark:bg-slate-950/70">
                                                    <span className="text-[11px] text-slate-500 dark:text-slate-400">공유 시각</span>
                                                    <span className="max-w-[108px] text-right text-[12px] font-semibold text-slate-800 dark:text-slate-100">{repostedAtLabel}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </aside>
                            </div>
                        </motion.div>

                        <motion.div
                            ref={commentsSectionRef}
                            initial={detailMotion.shortEnter.initial}
                            animate={detailMotion.shortEnter.animate}
                            transition={{ duration: 0.26, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                            className="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10"
                        >
                            <div className="mb-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: detailAccent }}>
                                        댓글
                                    </p>
                                    <h3 className="mt-1.5 text-base font-bold text-slate-900 dark:text-slate-100 sm:text-lg">댓글 {commentCount}개</h3>
                                    <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 sm:text-[13px]">
                                        응원은 댓글에서 더 뜨거워집니다.
                                    </p>
                                    {!areCommentRepliesAvailable && (
                                        <div
                                            data-testid="cheer-reply-status"
                                            className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-600 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300"
                                        >
                                            <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                                            <span>답글 기능은 준비 중입니다. 지금은 댓글과 좋아요로 응원에 참여할 수 있습니다.</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isLoggedIn ? (
                                <div
                                    className="mb-4 rounded-[20px] border bg-white/85 p-3 shadow-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-3.5"
                                    style={primaryBorderStyle}
                                >
                                    <div className="flex gap-3">
                                        <ProfileAvatar
                                            src={authUserProfileImageUrl ? resolveProfileImage(authUserProfileImageUrl) : undefined}
                                            alt={authUserDisplayName}
                                            fallbackName={authUserDisplayName}
                                            width={40}
                                            height={40}
                                            showRing
                                            ringClassName="p-px bg-black/5 dark:bg-white/10"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <Textarea
                                                value={commentText}
                                                onChange={(e) => setCommentText(e.target.value)}
                                                placeholder="오늘의 응원 한마디를 남겨보세요."
                                                disabled={sendingComment}
                                                aria-label="댓글 입력"
                                                className="min-h-[64px] rounded-[16px] border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-sm leading-5 dark:border-white/10 dark:bg-slate-950/70"
                                            />
                                            <div className="mt-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    서로를 존중하는 응원 문화를 지켜주세요.
                                                </p>
                                                <Button
                                                    onClick={handleCommentSubmit}
                                                    disabled={!commentText.trim() || sendingComment}
                                                    aria-label="댓글 등록"
                                                    className="h-8 rounded-full px-4 text-[12px] text-white sm:h-9 sm:text-[13px]"
                                                    style={{ backgroundColor: detailAccent }}
                                                >
                                                    등록
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="mb-4 rounded-[20px] border p-4 text-center shadow-sm dark:border-white/10 dark:bg-slate-900/80"
                                    style={{
                                        ...primaryBorderStyle,
                                        ...surfaceTintStyle,
                                    }}
                                >
                                    <p className="text-sm text-slate-600 dark:text-slate-300">
                                        댓글, 좋아요, 답글 참여는 로그인 후 이용할 수 있습니다.
                                    </p>
                                    <Button
                                        onClick={redirectToLogin}
                                        className="mt-4 h-9 rounded-full px-4 text-[13px] text-white"
                                        style={{ backgroundColor: detailAccent }}
                                    >
                                        로그인하고 참여하기
                                    </Button>
                                </div>
                            )}

                            {commentsError ? (
                                <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">
                                    <p>{commentsError}</p>
                                    <Button
                                        variant="outline"
                                        className="mt-3 rounded-full"
                                        onClick={() => resolvedPostId && loadComments(resolvedPostId)}
                                        disabled={!resolvedPostId}
                                    >
                                        다시 시도
                                    </Button>
                                </div>
                            ) : commentsLoading ? (
                                <div aria-busy="true" aria-label="댓글 불러오는 중" className="space-y-2">
                                    {[1, 2, 3].map((item) => (
                                        <div
                                            key={item}
                                            className="flex gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-3 animate-pulse dark:border-white/10 dark:bg-slate-900/70"
                                        >
                                            <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <div className="flex-1 space-y-2">
                                                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                                                <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                                                <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : comments.length === 0 ? (
                                <>
                                    <AdSlot
                                        slotId="cheer_detail_1"
                                        pageType="cheer_detail"
                                        contentId={resolvedPostId ? String(resolvedPostId) : null}
                                        listIndex={3}
                                        creativeType="native_card"
                                        loggedIn={isLoggedIn}
                                        userId={authUserId ? String(authUserId) : null}
                                        wave="ads_wave2"
                                        minHeight={152}
                                        className="mb-4"
                                    />
                                    <div
                                        className="rounded-[18px] border p-3 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-400"
                                        style={{
                                            ...primaryBorderStyle,
                                            ...surfaceTintStyle,
                                        }}
                                    >
                                        아직 댓글이 없습니다. 첫 댓글로 응원의 흐름을 시작해보세요.
                                    </div>
                                </>
                            ) : (
                                <>
                                    {comments.length < 3 ? (
                                        <AdSlot
                                            slotId="cheer_detail_1"
                                            pageType="cheer_detail"
                                            contentId={resolvedPostId ? String(resolvedPostId) : null}
                                            listIndex={3}
                                            creativeType="native_card"
                                            loggedIn={isLoggedIn}
                                            userId={authUserId ? String(authUserId) : null}
                                            wave="ads_wave2"
                                            minHeight={152}
                                            className="mb-4"
                                        />
                                    ) : null}
                                    <motion.div
                                        role="list"
                                        aria-label="댓글 목록"
                                        className="space-y-2"
                                        variants={commentListVariants}
                                        initial="hidden"
                                        animate="show"
                                    >
                                        {comments.flatMap((comment, index) => [
                                            <motion.div
                                                key={comment.id}
                                                variants={commentItemVariants}
                                                layout
                                                role="listitem"
                                                className="rounded-[18px] border border-slate-200 bg-white/85 px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-slate-900/80"
                                            >
                                                <CommentItem
                                                    comment={comment}
                                                    canInteract={isLoggedIn}
                                                    canLike={isLoggedIn}
                                                    repliesEnabled={areCommentRepliesAvailable}
                                                    repliesComingSoon={!areCommentRepliesAvailable}
                                                    activeReplyId={activeReplyId}
                                                    replyDraft={replyDraft}
                                                    isReplyPending={isReplyPending}
                                                    isCommentLikePending={false}
                                                    commentLikeAnimating={commentLikeAnimating}
                                                    onCommentLike={handleCommentLike}
                                                    onReplyToggle={handleReplyToggle}
                                                    onReplyChange={handleReplyChange}
                                                    onReplySubmit={handleReplySubmit}
                                                    onReplyCancel={handleReplyCancel}
                                                    onDelete={handleCommentDelete}
                                                    userHandle={authUserHandle}
                                                />
                                            </motion.div>,
                                            index === 2 ? (
                                                <AdSlot
                                                    key="cheer-detail-1"
                                                    slotId="cheer_detail_1"
                                                    pageType="cheer_detail"
                                                    contentId={resolvedPostId ? String(resolvedPostId) : null}
                                                    listIndex={3}
                                                    creativeType="native_card"
                                                    loggedIn={isLoggedIn}
                                                    userId={authUserId ? String(authUserId) : null}
                                                    wave="ads_wave2"
                                                    minHeight={152}
                                                />
                                            ) : null,
                                        ])}
                                    </motion.div>
                                </>
                            )}
                        </motion.div>
                    </div>
                </motion.article>
                <ReportModal
                    postId={parsedPostId}
                    isOpen={isReportModalOpen}
                    onClose={() => setIsReportModalOpen(false)}
                />
                <QuoteRepostEditor
                    isOpen={isQuoteEditorOpen}
                    onClose={() => setIsQuoteEditorOpen(false)}
                    post={selectedPost}
                />
            </div>
        </div>
    );
}
