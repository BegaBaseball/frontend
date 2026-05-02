import React, { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheerPost } from '../api/cheerApi';
import ImageGrid from './ImageGrid';
import RollingNumber from './RollingNumber';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import EmbeddedPost from './EmbeddedPost';
import {
    BookmarkIcon,
    EditIcon,
    HeartIcon,
    MessageCircleIcon,
    MoreHorizontalIcon,
    RepeatIcon,
    TrashIcon,
} from './icons/CheerIcons';
import { useCheerMutations } from '../hooks/useCheerQueries';
import { ProfileAvatar } from './ui/ProfileAvatar';
import PlainMenu from './ui/plain-menu';
import { resolveCheerLikeDisplayCount } from '../utils/cheerLikeState';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';

const LazyCheerCardInteractionsRuntime = lazy(() => import('./CheerCardInteractionsRuntime'));

const normalizeContent = (text: string): string =>
    text.replace(/\n{3,}/g, '\n\n').trim();

interface CheerCardProps {
    post: CheerPost;
    isHotItem?: boolean; // For Hot Topic Panel styling
}

function CheerCardComponent({ post, isHotItem = false }: CheerCardProps) {
    const navigate = useNavigate();
    const { deletePostMutation } = useCheerMutations();
    const { confirm } = useConfirmDialog();
    const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
    const [shouldLoadInteractions, setShouldLoadInteractions] = useState(false);
    const [pendingInteraction, setPendingInteraction] = useState<'like' | 'bookmark' | 'comment' | 'repost' | null>(null);

    const contentText = post.content?.trim() || '';
    const resolveProfileImage = (imageUrl?: string) => {
        if (!imageUrl) return null;
        if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
        return imageUrl;
    };

    const [isExpanded, setIsExpanded] = useState(false);
    const normalizedContent = useMemo(() => normalizeContent(contentText), [contentText]);
    const MAX_LENGTH = 192;
    const shouldShowMore = normalizedContent.length > MAX_LENGTH;
    const displayContent = useMemo(
        () => (!isExpanded && shouldShowMore ? normalizedContent.slice(0, MAX_LENGTH) + '...' : normalizedContent),
        [normalizedContent, isExpanded, shouldShowMore],
    );

    const statsSource = (post.repostType === 'SIMPLE' && post.originalPost)
        ? post.originalPost
        : post;
    const commentCount = statsSource.commentCount ?? 0;
    const likeCount = resolveCheerLikeDisplayCount(post);
    const repostCount = statsSource.repostCount ?? post.repostCount ?? 0;
    const bookmarkCount = post.bookmarkCount ?? 0;
    const isRepost = Boolean(post.repostType);
    const avatarSource = isRepost && post.originalPost ? post.originalPost : post;
    const avatarProfileImage = resolveProfileImage(avatarSource.authorProfileImageUrl);
    const avatarAuthor = avatarSource.author || '프로필';
    const likeActive = Boolean(post.liked);
    const bookmarkActive = Boolean(post.bookmarked);
    const repostButtonActive = Boolean(post.repostedByMe);

    const handleEdit = (event: React.MouseEvent) => {
        event.stopPropagation();
        navigate(`/cheer/edit/${post.id}`);
    };

    const handleDelete = async (event: React.MouseEvent) => {
        event.stopPropagation();
        const confirmed = await confirm({ title: '게시글 삭제', description: '정말 삭제하시겠습니까?', confirmLabel: '삭제', variant: 'destructive' });
        if (!confirmed) return;
        setIsOwnerMenuOpen(false);
        deletePostMutation.mutate(post.id);
    };

    const preloadInteractions = useCallback(() => {
        void import('./CheerCardInteractionsRuntime');
    }, []);

    const openInteractions = useCallback((interaction: 'like' | 'bookmark' | 'comment' | 'repost') => {
        preloadInteractions();
        setPendingInteraction(interaction);
        setShouldLoadInteractions(true);
    }, [preloadInteractions]);

    // Hot Topic List Item Style
    if (isHotItem) {
        return (
            <div
                onClick={() => navigate(`/cheer/${post.id}`)}
                className="px-2 py-3 transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-secondary rounded-lg dark:bg-card dark:border dark:border-border"
            >
                <div className="flex items-center justify-between mb-2 text-[16px] font-semibold text-[#536471] dark:text-gray-300">
                    <span className="font-bold">{post.team}</span>
                    <span>{post.timeAgo}</span>
                </div>
                <div className="text-[16px] font-bold text-[#0f1419] dark:text-gray-100 leading-relaxed mb-3">
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
                        className="mb-3 inline-flex min-h-11 items-center rounded-full pr-3 text-[16px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                        aria-expanded={isExpanded}
                    >
                        {isExpanded ? '접기' : '더보기'}
                    </button>
                )}
                <div className="flex items-center gap-4 text-[16px] font-semibold text-[#536471] dark:text-gray-300">
                    <span className="flex items-center gap-1">
                        <MessageCircleIcon className="h-4 w-4" />
                        <RollingNumber value={commentCount} />
                    </span>
                    <span className="flex items-center gap-1">
                        <HeartIcon className={`h-4 w-4 transition-all duration-200 ${likeActive
                            ? 'fill-rose-500 text-rose-500'
                            : 'fill-transparent dark:text-gray-300'
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
            className="group rounded-2xl border border-border/70 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#cbd5e1] hover:shadow-lg dark:border-border dark:bg-card dark:hover:border-[#64748b]"
            data-testid="cheer-post-card"
        >
            {/* 리포스트 표시 */}
            {post.repostType && (
                <div className="flex items-center gap-1.5 text-[16px] font-semibold text-gray-500 dark:text-gray-300 mb-2 ml-14">
                    <RepeatIcon className="w-3.5 h-3.5" />
                    <span>
                        {(post.authorHandle === post.originalPost?.authorHandle || post.author === post.originalPost?.author)
                            ? '다시 언급함' // Self-Repost
                            : post.repostType === 'SIMPLE' ? `${post.author}님이 리포스트함` : '인용 리포스트'}
                    </span>
                </div>
            )}

            {post.shareMode?.startsWith('EXTERNAL_') && post.sourceInfo?.url && (
                <div className="mb-2 ml-14 text-[16px] font-semibold text-sky-600 dark:text-sky-300 truncate">
                    출처: {post.sourceInfo.url}
                </div>
            )}

            <div
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target?.closest?.('[data-skip-cheer-card-nav]')) {
                        return;
                    }
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
                <div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center">
                    <div
                        className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full"
                        onClick={(e) => {
                            e.stopPropagation();
                            const targetHandle = isRepost
                                ? avatarSource.authorHandle
                                : post.authorHandle;
                            if (targetHandle) {
                                const normalizedHandle = targetHandle.startsWith('@') ? targetHandle : `@${targetHandle}`;
                                navigate(`/profile/${normalizedHandle}`);
                            }
                        }}
                    >
                        <ProfileAvatar
                            src={avatarProfileImage || undefined}
                            alt={avatarAuthor}
                            fallbackName={avatarAuthor}
                            width={40}
                            height={40}
                            showRing
                            ringVariant="cheerFeed"
                        />
                    </div>
                    {/* Team Logo: Use Original's team if Simple Repost */}
                    {((post.repostType === 'SIMPLE' && post.originalPost && post.originalPost.teamId) || post.authorTeamId) && (
                        <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white p-0.5 dark:bg-secondary flex items-center justify-center">
                            <TeamLogo
                                team={(
                                    (post.repostType === 'SIMPLE' && post.originalPost)
                                        ? (TEAM_DATA[post.originalPost.teamId as keyof typeof TEAM_DATA]?.name || post.originalPost.teamId)
                                        : (TEAM_DATA[post.authorTeamId as keyof typeof TEAM_DATA]?.name || post.authorTeamId)
                                )}
                                size={20}
                            />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 text-[16px] font-semibold">
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
                            <span className="text-[16px] font-bold text-[#536471] dark:text-gray-300 truncate">
                                {(post.repostType === 'SIMPLE' && post.originalPost)
                                    ? (post.originalPost.authorHandle || '')
                                    : (post.authorHandle || `@${(post.team || 'user').toLowerCase()}`)}
                                · {post.timeAgo}
                            </span>
                            {((post.repostType === 'SIMPLE' && post.originalPost && post.isHot) || (!post.repostType && post.isHot)) && (
                                <span className="text-[16px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/50 px-2 py-0.5 rounded-full">
                                    HOT
                                </span>
                            )}
                        </div>
                        {post.isOwner && (
                            <PlainMenu
                                open={isOwnerMenuOpen}
                                onOpenChange={setIsOwnerMenuOpen}
                                align="end"
                                panelClassName="w-40 p-1"
                                trigger={(
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setIsOwnerMenuOpen((prev) => !prev);
                                        }}
                                        className="flex h-11 w-11 items-center justify-center rounded-full text-[#64748B] transition-colors hover:bg-slate-100 hover:text-[#0f1419] dark:text-gray-300 dark:hover:bg-secondary dark:hover:text-white"
                                        aria-label="게시글 옵션"
                                        aria-expanded={isOwnerMenuOpen}
                                        aria-haspopup="menu"
                                    >
                                        <MoreHorizontalIcon className="h-5 w-5" />
                                    </button>
                                )}
                            >
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(event) => {
                                        setIsOwnerMenuOpen(false);
                                        handleEdit(event);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-[16px] font-bold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-secondary"
                                >
                                    <EditIcon className="mr-2 h-4 w-4" />
                                    수정하기
                                </button>
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={(event) => {
                                        setIsOwnerMenuOpen(false);
                                        void handleDelete(event);
                                    }}
                                    className="flex w-full items-center rounded-lg px-3 py-2 text-[16px] font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    <TrashIcon className="mr-2 h-4 w-4" />
                                    삭제하기
                                </button>
                            </PlainMenu>
                        )}
                    </div>

                    {/* Title Display Removed */}
                    <div
                        className="mt-1 text-[16px] font-bold leading-7 text-[#0f1419] dark:text-gray-100 transition-all duration-300"
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
                            className="mt-0.5 inline-flex min-h-11 items-center rounded-full pr-3 text-[16px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                            aria-expanded={isExpanded}
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
                                    ? "border-2 border-gray-300 dark:border-gray-600 rounded-xl"
                                    : ""
                                }
                            />
                        </div>
                    )}

                    {/* 이미지 표시 (Simple Repost면 원본 이미지) */}
                    {((post.repostType === 'SIMPLE' && post.originalPost && post.originalPost.imageUrls?.length) || (post.imageUrls?.length && post.repostType !== 'SIMPLE')) ? (
                        <div className="relative mt-2">
                            <ImageGrid images={(post.repostType === 'SIMPLE' && post.originalPost) ? post.originalPost.imageUrls : post.imageUrls!} />
                            {post.imageUploadFailed && (
                                    <span className="absolute right-3 top-3 rounded-full bg-red-600/90 px-2 py-1 text-[16px] font-bold text-white">
                                        업로드 실패
                                    </span>
                            )}
                        </div>
                    ) : null}

                    <div
                        className="mt-1.5"
                        onPointerEnter={preloadInteractions}
                        onFocusCapture={preloadInteractions}
                        onTouchStart={preloadInteractions}
                    >
                        {shouldLoadInteractions ? (
                            <Suspense
                                fallback={(
                                    <div className="mt-1.5 flex max-w-[420px] items-center justify-between text-[16px] font-semibold text-[#536471] dark:text-gray-300">
                                        <button type="button" className="group/comment flex min-h-11 min-w-11 items-center gap-1.5 rounded-full" aria-label={`댓글 ${commentCount}개`}>
                                            <span className="relative flex h-11 w-11 items-center justify-center rounded-full">
                                                <RepeatIcon className="h-5 w-5 opacity-0" />
                                            </span>
                                            <RollingNumber value={commentCount} />
                                        </button>
                                        <button type="button" className="group/repost flex min-h-11 min-w-11 items-center gap-1.5 rounded-full" aria-label={`리포스트 (현재 ${repostCount}회)`}>
                                            <span className="relative flex h-11 w-11 items-center justify-center rounded-full">
                                                <RepeatIcon className="h-5 w-5 opacity-0" />
                                            </span>
                                            <RollingNumber value={repostCount} />
                                        </button>
                                        <button type="button" className="group/like flex min-h-11 min-w-11 items-center gap-1.5 rounded-full" aria-label={`좋아요 (현재 ${likeCount}개)`}>
                                            <span className="relative flex h-11 w-11 items-center justify-center rounded-full">
                                                <RepeatIcon className="h-5 w-5 opacity-0" />
                                            </span>
                                            <RollingNumber value={likeCount} />
                                        </button>
                                        <button type="button" className="group/bookmark flex min-h-11 min-w-11 items-center gap-1.5 rounded-full" aria-label={`북마크 (현재 ${bookmarkCount}개)`}>
                                            <span className="relative flex h-11 w-11 items-center justify-center rounded-full">
                                                <RepeatIcon className="h-5 w-5 opacity-0" />
                                            </span>
                                            <RollingNumber value={bookmarkCount} />
                                        </button>
                                    </div>
                                )}
                            >
                                <LazyCheerCardInteractionsRuntime
                                    post={post}
                                    initialInteractionIntent={pendingInteraction}
                                    onInitialInteractionHandled={() => setPendingInteraction(null)}
                                />
                            </Suspense>
                        ) : (
                            <div className="mt-1.5 flex max-w-[420px] items-center justify-between text-[16px] font-semibold text-[#536471] dark:text-gray-300">
                                <button
                                    type="button"
                                    className="group/comment flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors hover:text-sky-500"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openInteractions('comment');
                                    }}
                                    aria-label={`댓글 ${commentCount}개`}
                                >
                                    <span className="relative flex h-11 w-11 items-center justify-center rounded-full transition-colors group-hover/comment:bg-sky-50 dark:group-hover/comment:bg-sky-500/20">
                                        <MessageCircleIcon className="h-5 w-5" />
                                    </span>
                                    <RollingNumber value={commentCount} />
                                </button>
                                <button
                                    type="button"
                                    className="group/repost flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors hover:text-emerald-500"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openInteractions('repost');
                                    }}
                                    aria-label={`리포스트 (현재 ${repostCount}회)`}
                                    aria-pressed={repostButtonActive}
                                >
                                    <span
                                        className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${repostButtonActive ? 'bg-emerald-50 dark:bg-emerald-500/20' : 'group-hover/repost:bg-emerald-50 dark:group-hover/repost:bg-emerald-500/20'}`}
                                    >
                                        <RepeatIcon
                                            className={`h-5 w-5 transition-all duration-200 ${repostButtonActive ? 'text-emerald-500 scale-110' : ''}`}
                                        />
                                    </span>
                                    <RollingNumber value={repostCount} />
                                </button>
                                <button
                                    type="button"
                                    className={`group/like flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors ${likeActive ? 'text-rose-500' : 'hover:text-rose-500'}`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openInteractions('like');
                                    }}
                                    aria-label={likeActive ? `좋아요 취소 (현재 ${likeCount}개)` : `좋아요 (현재 ${likeCount}개)`}
                                    aria-pressed={likeActive}
                                >
                                    <span
                                        className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${likeActive ? 'bg-rose-50 dark:bg-rose-500/20' : 'group-hover/like:bg-rose-50 dark:group-hover/like:bg-rose-500/20'}`}
                                    >
                                        <HeartIcon
                                            className={`h-5 w-5 transition-all duration-200 ${likeActive ? 'fill-rose-500 text-rose-500 scale-110' : 'fill-transparent'}`}
                                        />
                                    </span>
                                    <RollingNumber value={likeCount} />
                                </button>
                                <button
                                    type="button"
                                    className={`group/bookmark flex min-h-11 min-w-11 items-center gap-1.5 rounded-full transition-colors ${bookmarkActive ? 'text-yellow-500' : 'hover:text-yellow-500'}`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openInteractions('bookmark');
                                    }}
                                    aria-label={bookmarkActive ? '북마크 취소' : '북마크'}
                                    aria-pressed={bookmarkActive}
                                >
                                    <span
                                        className={`relative flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 ${bookmarkActive ? 'bg-yellow-50 dark:bg-yellow-500/20' : 'group-hover/bookmark:bg-yellow-50 dark:group-hover/bookmark:bg-yellow-500/20'}`}
                                    >
                                        <BookmarkIcon
                                            className={`h-5 w-5 transition-all duration-200 ${bookmarkActive ? 'fill-yellow-500 text-yellow-500 scale-110' : 'fill-transparent'}`}
                                        />
                                    </span>
                                    <RollingNumber value={bookmarkCount} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// React.memo to prevent unnecessary re-renders when other posts change
const CheerCard = React.memo(CheerCardComponent);
export default CheerCard;
