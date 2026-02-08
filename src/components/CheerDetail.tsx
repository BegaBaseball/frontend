import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import {
    ArrowLeft,
    Heart,
    MessageSquare,
    Repeat2,
    Share2,
    MoreVertical,
    Trash2,
    Edit2,
    Bookmark,
    Flag
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
import * as cheatApi from '../api/cheerApi';
import { CommentItem } from './cheer/CommentItem';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useCheerPost, useCheerMutations } from '../hooks/useCheerQueries';
import UserProfileModal from './profile/UserProfileModal';
import ReportModal from './ReportModal';
import QuoteRepostEditor from './QuoteRepostEditor';

export default function CheerDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { confirm } = useConfirmDialog();

    const parsedPostId = postId ? parseInt(postId) : 0;
    const { data: selectedPost, isLoading: loading, error } = useCheerPost(parsedPostId);
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
    const [isRepostPopoverOpen, setIsRepostPopoverOpen] = useState(false);
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);

    // Profile Modal State
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    // Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [viewingUserId, setViewingUserId] = useState<number | null>(null);

    useEffect(() => {
        if (parsedPostId) {
            loadComments(parsedPostId);
        }
    }, [parsedPostId]);

    // Redirect Simple Reposts to Original Post
    useEffect(() => {
        if (selectedPost?.repostType === 'SIMPLE' && selectedPost.originalPost) {
            navigate(`/cheer/${selectedPost.originalPost.id}`, { replace: true });
        }
    }, [selectedPost, navigate]);

    useEffect(() => {
        if (selectedPost) {
            setCommentCount(selectedPost.comments ?? 0);
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
            console.error(e);
            setCommentsError('댓글을 불러오지 못했습니다.');
        } finally {
            setCommentsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!selectedPost) return;
        const deleteConfirmed = await confirm({ title: '게시글 삭제', description: '정말 삭제하시겠습니까?', confirmLabel: '삭제', variant: 'destructive' });
        if (!deleteConfirmed) return;
        try {
            await deletePostMutation.mutateAsync(selectedPost.id);
            navigate('/cheer');
        } catch (e) {
            toast.error('삭제 실패');
        }
    };

    const toggleLike = (id: number) => {
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
            return;
        }
        toggleLikeMutation.mutate(id);
    };

    const toggleBookmark = (id: number) => {
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
            return;
        }
        toggleBookmarkMutation.mutate(id);
    };

    const handleDisplayEdit = () => {
        if (selectedPost) {
            navigate(`/cheer/edit/${selectedPost.id}`);
        }
    };

    const handleSimpleRepost = () => {
        if (!selectedPost) return;
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
            return;
        }
        setIsRepostPopoverOpen(false);
        repostMutation.mutate(selectedPost.id);
    };

    const handleQuoteRepost = () => {
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
            return;
        }
        setIsRepostPopoverOpen(false);
        setIsQuoteEditorOpen(true);
    };

    const handleCancelRepost = () => {
        if (!selectedPost) return;
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
            return;
        }
        setIsRepostPopoverOpen(false);
        cancelRepostMutation.mutate(selectedPost.id);
    };

    const handleCommentSubmit = async () => {
        if (!selectedPost || !commentText.trim()) return;
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
            return;
        }

        const trimmed = commentText.trim();
        const optimisticId = Date.now() * -1;
        const optimisticComment = {
            id: optimisticId,
            author: user.name || user.email || '나',
            content: trimmed,
            timeAgo: '방금 전',
            likes: 0,
            likeCount: 0,
            likedByMe: false,
            authorProfileImageUrl: user.profileImageUrl,
            isPending: true,
        };

        setCommentText('');
        setComments((prev) => [optimisticComment, ...prev]);
        setCommentCount((prev) => prev + 1);
        setSendingComment(true);

        try {
            const created = await cheatApi.createComment(selectedPost.id, trimmed);
            if (created?.id) {
                setComments((prev) =>
                    prev.map((comment) =>
                        comment.id === optimisticId ? { ...created, isPending: false } : comment
                    )
                );
            } else {
                await loadComments(selectedPost.id);
            }
            // Recalculate comments by reloading or rely on local state
        } catch (e) {
            setComments((prev) => prev.filter((comment) => comment.id !== optimisticId));
            setCommentCount((prev) => Math.max(0, prev - 1));
            toast.error('댓글 작성 실패');
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
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
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
            toast.error('좋아요 처리 실패');
        }
    };

    const handleReplyToggle = (commentId: number) => {
        if (!user) {
            toast.error('로그인이 필요한 서비스입니다.');
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
        const filterComments = (list: any[], targetId: number): any[] => {
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
            toast.error('댓글 삭제 실패');
        }
    };

    if (loading && !selectedPost) {
        return (
            <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
                <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between">
                    <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800" />
                    <div className="h-4 w-40 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="w-9" />
                </div>
                <div className="max-w-3xl mx-auto p-5 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800" />
                        <div className="space-y-2">
                            <div className="h-3 w-24 rounded bg-gray-100 dark:bg-gray-800" />
                            <div className="h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="h-5 w-2/3 rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-4 w-full rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-4 w-4/6 rounded bg-gray-100 dark:bg-gray-800" />
                    </div>
                    <div className="h-40 rounded-2xl bg-gray-100 dark:bg-gray-800" />
                </div>
            </div>
        );
    }

    if (error || !selectedPost) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500 mb-4">{(error as Error)?.message || '게시글을 찾을 수 없습니다.'}</p>
                <Button onClick={() => navigate('/cheer')}>목록으로 돌아가기</Button>
            </div>
        );
    }

    const repostCount = selectedPost.repostCount ?? 0;
    const repostActive = selectedPost.repostedByMe || (selectedPost.repostType && selectedPost.isOwner);

    return (
        <div className="min-h-screen bg-[#f7f9f9] dark:bg-[#0E1117] pb-24 sm:pb-20">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="font-bold truncate max-w-[200px]">게시글</div>
                <div className="w-9" /> {/* Spacer */}
            </div>

            <div className="mx-auto w-full max-w-[880px] px-4 sm:px-6 lg:px-8">
                <article className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#151A23] shadow-sm">
                    <div className="px-4 sm:px-6 lg:px-8 py-6">
                        {/* Post Meta */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="relative h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => {
                                        if (selectedPost.authorHandle) {
                                            navigate(`/profile/${selectedPost.authorHandle}`);
                                        }
                                    }}
                                >
                                    <div className="h-full w-full rounded-full bg-slate-100 dark:bg-slate-700 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300 overflow-hidden">
                                        {selectedPost.authorProfileImageUrl ? (
                                            <img
                                                src={selectedPost.authorProfileImageUrl}
                                                alt={selectedPost.author}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <img
                                                src={baseballLogo}
                                                alt="BEGA"
                                                className="h-6 w-6"
                                            />
                                        )}
                                    </div>
                                    {selectedPost.authorTeamId && (
                                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white ring-2 ring-white dark:ring-slate-700 overflow-hidden flex items-center justify-center">
                                            <TeamLogo
                                                team={TEAM_DATA[selectedPost.authorTeamId]?.name || selectedPost.authorTeamId}
                                                size={18}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div
                                    className="cursor-pointer hover:underline"
                                    onClick={() => {
                                        if (selectedPost.authorHandle) {
                                            navigate(`/profile/${selectedPost.authorHandle}`);
                                        }
                                    }}
                                >
                                    <div className="text-[15px] sm:text-[16px] font-bold text-gray-900 dark:text-gray-100">
                                        {selectedPost.author}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{selectedPost.timeAgo}</span>
                                        <span>·</span>
                                        <span>조회 {selectedPost.views}</span>
                                    </div>
                                </div>
                            </div>

                            {selectedPost.isOwner && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button className="p-2 text-gray-400 hover:text-gray-600">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={handleDisplayEdit}>
                                            <Edit2 className="w-4 h-4 mr-2" />
                                            수정하기
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            삭제하기
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}

                            {/* Report Button for non-owners */}
                            {!selectedPost.isOwner && user && (
                                <button
                                    onClick={() => setIsReportModalOpen(true)}
                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    title="신고하기"
                                >
                                    <Flag className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Post Title Removed */}

                        {/* Post Content */}
                        <div className="mt-4 text-[15px] sm:text-[16px] text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-6 sm:leading-7 min-h-[100px]">
                            {selectedPost.content}
                        </div>

                        {/* Images */}
                        {selectedPost.images && selectedPost.images.length > 0 && (
                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {selectedPost.images.map((img, idx) => (
                                    <div key={idx} className="overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
                                        <img
                                            src={img}
                                            alt={`uploaded-${idx}`}
                                            className="h-full w-full object-cover aspect-[4/3]"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-wrap items-center gap-2 sm:gap-4 py-4 border-t border-b border-gray-100 dark:border-gray-800 text-sm">
                            <button
                                onClick={() => toggleLike(selectedPost.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                                    selectedPost.likedByUser
                                        ? "bg-red-50 dark:bg-red-900/20 text-red-500"
                                        : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                )}
                            >
                                <Heart className={cn("w-5 h-5", selectedPost.likedByUser && "fill-current")} />
                                <span className="font-semibold">{selectedPost.likes}</span>
                            </button>

                            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                <MessageSquare className="w-5 h-5" />
                                <span className="font-semibold">{commentCount}</span>
                            </button>
                            <Popover
                                open={isRepostPopoverOpen}
                                onOpenChange={(open: boolean) => {
                                    if (open && !user) {
                                        toast.error('로그인이 필요한 서비스입니다.');
                                        return;
                                    }
                                    setIsRepostPopoverOpen(open);
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                                            repostActive
                                                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600"
                                                : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                        )}
                                        aria-label={repostActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                                        aria-pressed={repostActive}
                                    >
                                        <Repeat2 className="w-5 h-5" />
                                        <span className="font-semibold">{repostCount}</span>
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-48 p-0"
                                    align="start"
                                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                >
                                    <div className="flex flex-col py-1">
                                        {(selectedPost.repostType && selectedPost.isOwner) ? (
                                            <button
                                                onClick={handleCancelRepost}
                                                className="flex items-center gap-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                                                <div>
                                                    <span className="block text-sm font-medium text-red-600 dark:text-red-400">
                                                        리포스트 삭제
                                                    </span>
                                                </div>
                                            </button>
                                        ) : (selectedPost.repostType && !selectedPost.isOwner) ? (
                                            <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                                리포스트할 수 없습니다
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={handleSimpleRepost}
                                                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-center justify-center w-5 h-5">
                                                        {selectedPost.repostedByMe ? (
                                                            <div className="relative">
                                                                <Repeat2 className="w-4 h-4 text-emerald-500" />
                                                                <div className="absolute top-0 right-0 w-2 h-0.5 bg-red-500 rotate-45 transform origin-center" />
                                                            </div>
                                                        ) : (
                                                            <Repeat2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className={`block text-sm font-medium ${selectedPost.repostedByMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                            {selectedPost.repostedByMe ? '리포스트 취소' : '리포스트'}
                                                        </span>
                                                    </div>
                                                </button>
                                                <button
                                                    onClick={handleQuoteRepost}
                                                    className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <div className="flex items-center justify-center w-5 h-5">
                                                        <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                                                            인용하기
                                                        </span>
                                                    </div>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <button
                                onClick={() => toggleBookmark(selectedPost.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full transition-colors sm:ml-auto",
                                    selectedPost.isBookmarked
                                        ? "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600"
                                        : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                                )}
                            >
                                <Bookmark className={cn("w-5 h-5", selectedPost.isBookmarked && "fill-current")} />
                            </button>
                        </div>
                    </div>
                </article>

                {/* Comment Section */}
                <section className="mt-6 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#151A23] shadow-sm">
                    <div className="px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-[15px] sm:text-[16px]">댓글 {commentCount}개</h3>
                        </div>

                        {/* Comment Input */}
                        {user ? (
                            <div className="flex flex-col sm:flex-row gap-3 mb-8">
                                <Textarea
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="댓글을 남겨주세요."
                                    disabled={sendingComment}
                                    className="min-h-[88px] sm:min-h-[96px] bg-gray-50 dark:bg-gray-900 resize-none"
                                />
                                <Button
                                    onClick={handleCommentSubmit}
                                    disabled={!commentText.trim() || sendingComment}
                                    className="h-11 sm:h-auto bg-[#2d5f4f] text-white sm:w-auto"
                                >
                                    등록
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 mb-8 p-6 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    댓글을 작성하려면 로그인이 필요합니다.
                                </p>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="bg-[#2d5f4f] text-white hover:bg-[#234a3d]"
                                >
                                    로그인하기
                                </Button>
                            </div>
                        )}

                        {/* Comment List */}
                        {commentsError ? (
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-600 dark:text-gray-300">
                                <p>{commentsError}</p>
                                <Button
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => parsedPostId && loadComments(parsedPostId)}
                                    disabled={!parsedPostId}
                                >
                                    다시 시도
                                </Button>
                            </div>
                        ) : commentsLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex gap-4 animate-pulse">
                                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
                                            <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                                            <div className="h-4 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : comments.length === 0 ? (
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                                아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {comments.map((comment) => (
                                    <CommentItem
                                        key={comment.id}
                                        comment={comment}
                                        canInteract={Boolean(user)}
                                        canLike={Boolean(user)}
                                        repliesEnabled={false}
                                        repliesComingSoon={true}
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
                                        userEmail={user?.email}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
                <UserProfileModal
                    userId={viewingUserId}
                    isOpen={isProfileModalOpen}
                    onClose={() => setIsProfileModalOpen(false)}
                />
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
