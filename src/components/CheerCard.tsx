import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Heart, MessageCircle, MoreHorizontal, Repeat2, Trash2 } from 'lucide-react';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { CheerPost } from '../api/cheerApi';
import ImageGrid from './ImageGrid';
import RollingNumber from './RollingNumber';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import CommentModal from './CommentModal';
// import RepostModal from './RepostModal'; // Removed
import QuoteRepostEditor from './QuoteRepostEditor';
import EmbeddedPost from './EmbeddedPost';
import { useCheerMutations } from '../hooks/useCheerQueries';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from './ui/popover';

interface CheerCardProps {
    post: CheerPost;
    isHotItem?: boolean; // For Hot Topic Panel styling
}

function CheerCardComponent({ post, isHotItem = false }: CheerCardProps) {
    const navigate = useNavigate();
    // const toggleLike = useCheerStore((state) => state.toggleLike); // Removed
    // const deletePost = useCheerStore((state) => state.deletePost); // Removed
    const { toggleLikeMutation, deletePostMutation, repostMutation, cancelRepostMutation } = useCheerMutations();
    const { confirm } = useConfirmDialog();
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    // const [isRepostModalOpen, setIsRepostModalOpen] = useState(false); // Removed for Popover
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false); // New state for manually closing popover if needed

    const contentText = post.content?.trim() || '';

    // Use a ref-like derived value OR helper function defined inside the component
    const normalizeContent = (text: string) => {
        return text.replace(/\n{3,}/g, '\n\n').trim();
    };

    const [isExpanded, setIsExpanded] = useState(false);
    const normalizedContent = normalizeContent(contentText);
    const MAX_LENGTH = 250;
    const shouldShowMore = normalizedContent.length > MAX_LENGTH;
    const displayContent = !isExpanded && shouldShowMore
        ? normalizedContent.slice(0, MAX_LENGTH) + '...'
        : normalizedContent;

    const statsSource = (post.repostType === 'SIMPLE' && post.originalPost)
        ? post.originalPost
        : post;
    const commentCount = statsSource.commentCount ?? post.comments;
    const likeCount = statsSource.likeCount ?? post.likes;
    const repostCount = statsSource.repostCount ?? post.repostCount;
    const repostActive = post.repostedByMe || (post.repostType && post.isOwner);

    const [likeAnimating, setLikeAnimating] = useState(false);
    const [commentAnimating, setCommentAnimating] = useState(false);
    const [repostAnimating, setRepostAnimating] = useState(false);
    const likeTimerRef = useRef<number | null>(null);
    const commentTimerRef = useRef<number | null>(null);
    const repostTimerRef = useRef<number | null>(null);

    useEffect(() => {
        return () => {
            if (likeTimerRef.current) window.clearTimeout(likeTimerRef.current);
            if (commentTimerRef.current) window.clearTimeout(commentTimerRef.current);
            if (repostTimerRef.current) window.clearTimeout(repostTimerRef.current);
        };
    }, []);

    const handleLikeClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        setLikeAnimating(true);
        // toggleLike(post.id);
        toggleLikeMutation.mutate(post.id); // Updated
        if (likeTimerRef.current) window.clearTimeout(likeTimerRef.current);
        likeTimerRef.current = window.setTimeout(() => {
            setLikeAnimating(false);
        }, 450);
    };

    const handleEdit = (event: React.MouseEvent) => {
        event.stopPropagation();
        navigate(`/cheer/edit/${post.id}`);
    };

    const handleDelete = async (event: React.MouseEvent) => {
        event.stopPropagation();
        const confirmed = await confirm({ title: '게시글 삭제', description: '정말 삭제하시겠습니까?', confirmLabel: '삭제', variant: 'destructive' });
        if (!confirmed) return;
        deletePostMutation.mutate(post.id);
    };

    const handleCommentClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        setCommentAnimating(true);
        setIsCommentModalOpen(true);
        if (commentTimerRef.current) window.clearTimeout(commentTimerRef.current);
        commentTimerRef.current = window.setTimeout(() => {
            setCommentAnimating(false);
        }, 450);
    };

    // Popover handles open state automatically, but we might want manual control if needed
    // const handleRepostClick = ... (replaced by PopoverTrigger)

    const handleSimpleRepost = () => {
        setRepostAnimating(true);
        repostMutation.mutate(post.id);
        setIsPopoverOpen(false); // Close popover
        if (repostTimerRef.current) window.clearTimeout(repostTimerRef.current);
        repostTimerRef.current = window.setTimeout(() => {
            setRepostAnimating(false);
        }, 450);
    };

    const handleQuoteRepost = () => {
        setIsPopoverOpen(false); // Close popover
        setIsQuoteEditorOpen(true);
    };

    const handleCancelRepost = () => {
        setIsPopoverOpen(false);
        cancelRepostMutation.mutate(post.id);
    };

    // Hot Topic List Item Style
    if (isHotItem) {
        return (
            <div
                onClick={() => navigate(`/cheer/${post.id}`)}
                className="px-2 py-3 transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1F2533] rounded-lg dark:bg-[#1A1F2B] dark:border-l-2 dark:border-l-red-500"
            >
                <div className="flex items-center justify-between mb-2 text-xs text-[#536471] dark:text-slate-400">
                    <span className="font-semibold">{post.team}</span>
                    <span>{post.timeAgo}</span>
                </div>
                <div className="text-sm text-[#0f1419] dark:text-slate-200 leading-relaxed mb-3">
                    {displayContent.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                            {line}
                            <br />
                        </React.Fragment>
                    ))}
                </div>
                {shouldShowMore && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(!isExpanded);
                        }}
                        className="mb-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        {isExpanded ? '접기' : '더보기'}
                    </button>
                )}
                <div className="flex items-center gap-4 text-xs text-[#536471] dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <RollingNumber value={commentCount} />
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart className={`h-4 w-4 transition-all duration-200 ${post.likedByUser
                            ? 'fill-rose-500 text-rose-500'
                            : 'fill-transparent dark:text-slate-400'
                            }`} />
                        <RollingNumber value={likeCount} />
                    </span>
                </div>
            </div>
        );
    }

    // Main Feed Tweet Style
    return (
        <div
            className="group rounded-2xl border border-[#EFF3F4] dark:border-[#232938] bg-white dark:bg-[#151A23] px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
            {/* 리포스트 표시 */}
            {post.repostType && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2 ml-12">
                    <Repeat2 className="w-3.5 h-3.5" />
                    <span>
                        {(post.authorHandle === post.originalPost?.authorHandle || post.author === post.originalPost?.author)
                            ? '다시 언급함' // Self-Repost
                            : post.repostType === 'SIMPLE' ? `${post.author}님이 리포스트함` : '인용 리포스트'}
                    </span>
                </div>
            )}

            <div
                onClick={(e) => {
                    e.stopPropagation(); // prevent double nav if needed, but usually redundant if div is the trigger
                    // Navigate to Original Post if Simple Repost
                    if (post.repostType === 'SIMPLE' && post.originalPost) {
                        navigate(`/cheer/${post.originalPost.id}`);
                    } else {
                        navigate(`/cheer/${post.id}`);
                    }
                }}
                className="flex gap-3"
            >

                <div className="relative h-10 w-10 flex-shrink-0">
                    <div
                        className="h-full w-full rounded-full bg-slate-100 dark:bg-slate-700 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            const targetHandle = (post.repostType === 'SIMPLE' && post.originalPost)
                                ? post.originalPost.authorHandle
                                : post.authorHandle;
                            if (targetHandle) {
                                const normalizedHandle = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
                                navigate(`/profile/${normalizedHandle}`);
                            }
                        }}
                    >
                        {(post.repostType === 'SIMPLE' && post.originalPost) ? (
                            post.originalPost.authorProfileImageUrl ? (
                                <img
                                    src={post.originalPost.authorProfileImageUrl}
                                    alt={post.originalPost.author}
                                    className="h-full w-full object-cover image-render-quality"
                                />
                            ) : (
                                post.originalPost.author?.slice(0, 1) || '?'
                            )
                        ) : (
                            post.authorProfileImageUrl ? (
                                <img
                                    src={post.authorProfileImageUrl}
                                    alt={post.author}
                                    className="h-full w-full object-cover image-render-quality"
                                />
                            ) : (
                                post.author?.slice(0, 1) || '?'
                            )
                        )}
                    </div>
                    {/* Team Logo: Use Original's team if Simple Repost */}
                    {((post.repostType === 'SIMPLE' && post.originalPost && post.originalPost.teamId) || post.authorTeamId) && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-slate-600 ring-2 ring-white dark:ring-slate-600 overflow-hidden flex items-center justify-center">
                            <TeamLogo
                                team={((post.repostType === 'SIMPLE' && post.originalPost) ? (TEAM_DATA[post.originalPost.teamId as keyof typeof TEAM_DATA]?.name || post.originalPost.teamId) : (TEAM_DATA[post.authorTeamId as keyof typeof TEAM_DATA]?.name || post.authorTeamId))}
                                size={20}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-[15px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span
                                className="font-bold text-[#0f1419] dark:text-white truncate cursor-pointer hover:underline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const targetHandle = (post.repostType === 'SIMPLE' && post.originalPost)
                                        ? post.originalPost.authorHandle
                                        : post.authorHandle;
                                    if (targetHandle) {
                                        const normalizedHandle = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
                                        navigate(`/profile/${normalizedHandle}`);
                                    }
                                }}
                            >
                                {(post.repostType === 'SIMPLE' && post.originalPost) ? post.originalPost.author : post.author}
                            </span>
                            <span className="text-[#536471] dark:text-slate-400 truncate">
                                {(post.repostType === 'SIMPLE' && post.originalPost)
                                    ? (post.originalPost.authorHandle || '')
                                    : (post.authorHandle || `@${(post.team || 'user').toLowerCase()}`)}
                                · {post.timeAgo}
                            </span>
                            {((post.repostType === 'SIMPLE' && post.originalPost && post.isHot) || (!post.repostType && post.isHot)) && (
                                <span className="text-[11px] font-semibold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/50 px-2 py-0.5 rounded-full">
                                    HOT
                                </span>
                            )}
                        </div>
                        {post.isOwner && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={(event) => event.stopPropagation()}
                                        className="rounded-full p-1 text-[#64748B] dark:text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-[#0f1419] dark:hover:text-white"
                                        aria-label="게시글 옵션"
                                    >
                                        <MoreHorizontal className="h-4 w-4" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="dark:bg-slate-800 dark:border-slate-700">
                                    <DropdownMenuItem onClick={handleEdit} className="dark:hover:bg-slate-700 dark:text-slate-200">
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        수정하기
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-500 focus:text-red-500 dark:hover:bg-slate-700">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        삭제하기
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Title Display Removed */}
                    <div
                        className="mt-0.5 text-[16px] leading-[22px] text-[#0f1419] dark:text-slate-200 transition-all duration-300"
                    >
                        {(post.repostType === 'SIMPLE' && post.originalPost)
                            ? (post.originalPost.content ? post.originalPost.content.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            )) : '')
                            : displayContent.split('\n').map((line, i) => (
                                <React.Fragment key={i}>
                                    {line}
                                    <br />
                                </React.Fragment>
                            ))
                        }
                    </div>

                    {shouldShowMore && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsExpanded(!isExpanded);
                            }}
                            className="mt-2 text-[13px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            {isExpanded ? '접기' : '더보기'}
                        </button>
                    )}

                    {/* 원본 게시글 임베드 (리포스트인 경우 - Quote만 표시, Simple은 본문으로 통합됨) */}
                    {(post.originalPost && post.repostType !== 'SIMPLE') && (
                        <div className="relative">
                            <EmbeddedPost
                                post={post.originalDeleted ? { ...post.originalPost, deleted: true } : post.originalPost}
                                className={(post.authorHandle === post.originalPost.authorHandle || post.author === post.originalPost.author)
                                    ? "ring-2 ring-gray-300 dark:ring-gray-600 rounded-xl"
                                    : ""
                                }
                            />
                        </div>
                    )}

                    {/* 이미지 표시 (Simple Repost면 원본 이미지) */}
                    {((post.repostType === 'SIMPLE' && post.originalPost && post.originalPost.imageUrls?.length) || (post.images?.length && post.repostType !== 'SIMPLE')) ? (
                        <div className="relative">
                            <ImageGrid images={(post.repostType === 'SIMPLE' && post.originalPost) ? post.originalPost.imageUrls : post.images!} />
                            {post.imageUploadFailed && (
                                <span className="absolute right-3 top-3 rounded-full bg-red-600/90 px-2 py-1 text-xs font-semibold text-white">
                                    업로드 실패
                                </span>
                            )}
                        </div>
                    ) : null}

                    <div className="mt-3 flex items-center justify-between max-w-[420px] text-[13px] text-[#536471] dark:text-slate-400">
                        <button
                            type="button"
                            className="group/comment flex items-center gap-1.5 rounded-full transition-colors hover:text-sky-500"
                            onClick={handleCommentClick}
                            aria-label={`댓글 ${commentCount}개`}
                        >
                            <span className="relative rounded-full p-2 transition-colors group-hover/comment:bg-sky-50 dark:group-hover/comment:bg-sky-500/20">
                                {commentAnimating && (
                                    <span className="pointer-events-none absolute inset-0 rounded-full bg-sky-500/20 animate-like-ring" />
                                )}
                                <MessageCircle
                                    className={`h-[18px] w-[18px] ${commentAnimating ? 'animate-like-pop' : ''
                                        }`}
                                />
                            </span>
                            <RollingNumber value={commentCount} />
                        </button>

                        <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={`group/repost flex items-center gap-1.5 rounded-full transition-colors ${repostActive ? 'text-emerald-500' : 'hover:text-emerald-500'
                                        }`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // PopoverTrigger handles spacing, but stopPropagation is good practice if wrapped
                                    }}
                                    aria-label={repostActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                                    aria-pressed={repostActive}
                                >
                                    <span
                                        className={`relative rounded-full p-2 transition-all duration-200 ${repostActive ? 'bg-emerald-50 dark:bg-emerald-500/20' : 'group-hover/repost:bg-emerald-50 dark:group-hover/repost:bg-emerald-500/20'
                                            }`}
                                    >
                                        {repostAnimating && (
                                            <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/30 animate-like-ring" />
                                        )}
                                        <Repeat2
                                            className={`h-[18px] w-[18px] transition-all duration-200 ${repostActive
                                                ? 'text-emerald-500 scale-110'
                                                : ''
                                                } ${repostAnimating ? 'animate-like-pop' : ''}`}
                                        />
                                    </span>
                                    <RollingNumber value={repostCount} />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-48 p-0"
                                align="start"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()} // Prevent card click
                            >
                                <div className="flex flex-col py-1">
                                    {(!!post.repostType && post.isOwner) ? (
                                        // Owner of a repost -> Cancel Option
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
                                    ) : (post.repostType && !post.isOwner) ? (
                                        // Someone else's repost -> Cannot repost
                                        <div className="px-4 py-3 text-sm text-gray-400 text-center">
                                            리포스트할 수 없습니다
                                        </div>
                                    ) : (
                                        // Standard Options
                                        <>
                                            <button
                                                onClick={handleSimpleRepost}
                                                className="flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                            >
                                                <div className={`flex items-center justify-center w-5 h-5`}>
                                                    {post.repostedByMe ? (
                                                        <div className="relative">
                                                            <Repeat2 className="w-4 h-4 text-emerald-500" />
                                                            <div className="absolute top-0 right-0 w-2 h-0.5 bg-red-500 rotate-45 transform origin-center" />
                                                            {/* ^ Crude visual for "Undo" or just use Undo2 icon if available */}
                                                        </div>
                                                    ) : (
                                                        <Repeat2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <span className={`block text-sm font-medium ${post.repostedByMe ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                                        {post.repostedByMe ? '리포스트 취소' : '리포스트'}
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
                            type="button"
                            className={`group/like flex items-center gap-1.5 rounded-full transition-colors ${post.likedByUser ? 'text-rose-500' : 'hover:text-rose-500'
                                }`}
                            onClick={handleLikeClick}
                            aria-label={post.likedByUser ? `좋아요 취소 (현재 ${likeCount}개)` : `좋아요 (현재 ${likeCount}개)`}
                            aria-pressed={post.likedByUser}
                        >
                            <span
                                className={`relative rounded-full p-2 transition-all duration-200 ${post.likedByUser ? 'bg-rose-50 dark:bg-rose-500/20' : 'group-hover/like:bg-rose-50 dark:group-hover/like:bg-rose-500/20'
                                    }`}
                            >
                                {likeAnimating && (
                                    <span className="pointer-events-none absolute inset-0 rounded-full bg-rose-500/30 animate-like-ring" />
                                )}
                                <Heart
                                    className={`h-[18px] w-[18px] transition-all duration-200 ${post.likedByUser
                                        ? 'fill-rose-500 text-rose-500 scale-110'
                                        : 'fill-transparent'
                                        } ${likeAnimating ? 'animate-like-pop' : ''}`}
                                />
                            </span>
                            <RollingNumber value={likeCount} />
                        </button>
                    </div>
                </div>

                {/* Portal Bubbling 방지를 위한 래퍼 */}
                <div onClick={(e) => e.stopPropagation()}>
                    <CommentModal
                        isOpen={isCommentModalOpen}
                        onClose={() => setIsCommentModalOpen(false)}
                        post={post}
                    />

                    <QuoteRepostEditor
                        isOpen={isQuoteEditorOpen}
                        onClose={() => setIsQuoteEditorOpen(false)}
                        post={post}
                    />
                </div>
            </div>
        </div>
    );
}

// React.memo to prevent unnecessary re-renders when other posts change
const CheerCard = React.memo(CheerCardComponent);
export default CheerCard;
