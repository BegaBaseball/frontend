import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Heart, MessageCircle, MoreHorizontal, Repeat2, Trash2 } from 'lucide-react';
import { CheerPost } from '../api/cheerApi';
import ImageGrid from './ImageGrid';
import RollingNumber from './RollingNumber';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
// import { useCheerStore } from '../store/cheerStore'; // Removed
import { useCheerMutations } from '../hooks/useCheerQueries'; // Added
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface CheerCardProps {
    post: CheerPost;
    isHotItem?: boolean; // For Hot Topic Panel styling
}

export default function CheerCard({ post, isHotItem = false }: CheerCardProps) {
    const navigate = useNavigate();
    // const toggleLike = useCheerStore((state) => state.toggleLike); // Removed
    // const deletePost = useCheerStore((state) => state.deletePost); // Removed
    const { toggleLikeMutation, deletePostMutation } = useCheerMutations(); // Added

    const contentText = post.content?.trim() || post.title;
    const shouldShowMore = contentText.length > 120;
    const repostCount = Math.max(0, Math.round(post.views / 10));
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

    const handleDelete = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!confirm('정말 삭제하시겠습니까?')) return;
        deletePostMutation.mutate(post.id);
    };

    const handleCommentClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        setCommentAnimating(true);
        if (commentTimerRef.current) window.clearTimeout(commentTimerRef.current);
        commentTimerRef.current = window.setTimeout(() => {
            setCommentAnimating(false);
        }, 450);
    };

    const handleRepostClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        setRepostAnimating(true);
        if (repostTimerRef.current) window.clearTimeout(repostTimerRef.current);
        repostTimerRef.current = window.setTimeout(() => {
            setRepostAnimating(false);
        }, 450);
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
                <p className="text-sm text-[#0f1419] dark:text-slate-200 tweet-clamp leading-relaxed mb-3">
                    {contentText}
                </p>
                <div className="flex items-center gap-4 text-xs text-[#536471] dark:text-slate-400">
                    <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <RollingNumber value={post.comments} />
                    </span>
                    <span className="flex items-center gap-1">
                        <Heart className={`h-4 w-4 transition-all duration-200 ${
                            post.likedByUser
                                ? 'fill-rose-500 text-rose-500'
                                : 'fill-transparent dark:text-slate-400'
                        }`} />
                        <RollingNumber value={post.likes} />
                    </span>
                </div>
            </div>
        );
    }

    // Main Feed Tweet Style
    return (
        <div
            onClick={() => navigate(`/cheer/${post.id}`)}
            className="group rounded-2xl border border-[#EFF3F4] dark:border-[#232938] bg-white dark:bg-[#151A23] px-4 py-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
        >
            <div className="flex gap-3">
                <div className="relative h-10 w-10 flex-shrink-0">
                    <div className="h-full w-full rounded-full bg-slate-100 dark:bg-slate-700 ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-center text-sm font-semibold text-slate-600 dark:text-slate-300 overflow-hidden">
                        {post.authorProfileImageUrl ? (
                            <img
                                src={post.authorProfileImageUrl}
                                alt={post.author}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            post.author?.slice(0, 1) || '?'
                        )}
                    </div>
                    {post.authorTeamId && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white dark:bg-slate-600 ring-2 ring-white dark:ring-slate-600 overflow-hidden flex items-center justify-center">
                            <TeamLogo team={TEAM_DATA[post.authorTeamId]?.name || post.authorTeamId} size={20} />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-[15px]">
                        <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#0f1419] dark:text-white truncate">{post.author}</span>
                            <span className="text-[#536471] dark:text-slate-400">@{(post.team || 'user').toLowerCase()} · {post.timeAgo}</span>
                            {post.isHot && (
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

                    <p className="mt-0.5 text-[16px] leading-[22px] text-[#0f1419] dark:text-slate-200 tweet-clamp">
                        {contentText}
                    </p>

                    {shouldShowMore && (
                        <span className="mt-1 inline-block text-[13px] text-[#536471] dark:text-slate-400 hover:text-[#0f1419] dark:hover:text-white">
                            더보기
                        </span>
                    )}

                    {post.images?.length ? (
                        <div className="relative">
                            <ImageGrid images={post.images} />
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
                            <RollingNumber value={post.comments} />
                        </button>

                        <button
                            type="button"
                            className="group/repost flex items-center gap-1.5 rounded-full transition-colors hover:text-emerald-500"
                            onClick={handleRepostClick}
                        >
                            <span className="relative rounded-full p-2 transition-colors group-hover/repost:bg-emerald-50 dark:group-hover/repost:bg-emerald-500/20">
                                {repostAnimating && (
                                    <span className="pointer-events-none absolute inset-0 rounded-full bg-emerald-500/20 animate-like-ring" />
                                )}
                                <Repeat2
                                    className={`h-[18px] w-[18px] ${repostAnimating ? 'animate-like-pop' : ''
                                        }`}
                                />
                            </span>
                            <RollingNumber value={repostCount} />
                        </button>

                        <button
                            type="button"
                            className={`group/like flex items-center gap-1.5 rounded-full transition-colors ${post.likedByUser ? 'text-rose-500' : 'hover:text-rose-500'
                                }`}
                            onClick={handleLikeClick}
                        >
                            <span
                                className={`relative rounded-full p-2 transition-all duration-200 ${post.likedByUser ? 'bg-rose-50 dark:bg-rose-500/20' : 'group-hover/like:bg-rose-50 dark:group-hover/like:bg-rose-500/20'
                                    }`}
                            >
                                {likeAnimating && (
                                    <span className="pointer-events-none absolute inset-0 rounded-full bg-rose-500/30 animate-like-ring" />
                                )}
                                <Heart
                                    className={`h-[18px] w-[18px] transition-all duration-200 ${
                                        post.likedByUser
                                            ? 'fill-rose-500 text-rose-500 scale-110'
                                            : 'fill-transparent'
                                    } ${likeAnimating ? 'animate-like-pop' : ''}`}
                                />
                            </span>
                            <RollingNumber value={post.likes} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
