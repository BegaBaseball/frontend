import { Suspense, lazy } from 'react';
import type { CSSProperties } from 'react';
import {
    ArrowLeft,
    Clock3,
    Edit2,
    ExternalLink,
    Eye,
    Flag,
    Flame,
    Megaphone,
    MoreVertical,
    Quote,
    Repeat2,
    Trash2,
} from 'lucide-react';
import type { CheerPost } from '../api/cheerApi';
import { TEAM_DATA } from '../constants/teams';
import { formatTimeAgo } from '../utils/time';
import { getRepostPolicyDecision } from '../utils/repostPolicy';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import ImageGrid from './ImageGrid';
import TeamLogo from './TeamLogo';
import PlainMenu from './ui/plain-menu';
import { ProfileAvatar } from './ui/ProfileAvatar';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

const LazyCheerDetailActionBarRuntime = lazy(() => import('./CheerDetailActionBarRuntime'));
const LazyCheerDetailEmbeddedPostRuntime = lazy(() => import('./CheerDetailEmbeddedPostRuntime'));
const LazyCheerDetailStatsAsideRuntime = lazy(() => import('./CheerDetailStatsAsideRuntime'));

const detailDateFormatter = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
});

interface CheerDetailArticleRuntimeProps {
    selectedPost: CheerPost;
    authUserId?: number | null;
    authUserHandle?: string | null;
    isLoggedIn: boolean;
    isOwnerMenuOpen: boolean;
    isRepostMenuOpen: boolean;
    interactionBookmarked: boolean;
    interactionBookmarkCount: number;
    interactionLikeCount: number;
    interactionLikedByMe: boolean;
    interactionRepostCount: number;
    interactionRepostedByMe: boolean;
    commentCount: number;
    detailAccent: string;
    teamName: string;
    primaryBorderStyle: CSSProperties;
    softBadgeStyle: CSSProperties;
    surfaceTintStyle: CSSProperties;
    onDeleteRequested: () => void;
    onDisplayEdit: () => void;
    onGoBack: () => void;
    onNavigateToProfile: (handle?: string | null) => void;
    onOwnerMenuOpenChange: (open: boolean) => void;
    onQuoteRepost: () => void;
    onRedirectToLogin: () => void;
    onReportModalOpenChange: (open: boolean) => void;
    onRepostMenuOpenChange: (open: boolean) => void;
    onSimpleRepost: () => void;
    onToggleBookmark: () => void;
    onToggleLike: () => void;
    onCancelRepost: () => void;
}

const resolveProfileImage = (imageUrl?: string) => {
    if (!imageUrl) return baseballLogo;
    if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return DEFAULT_PROFILE_IMAGE;
    return imageUrl;
};

export default function CheerDetailArticleRuntime({
    selectedPost,
    authUserId,
    authUserHandle,
    isLoggedIn,
    isOwnerMenuOpen,
    isRepostMenuOpen,
    interactionBookmarked,
    interactionBookmarkCount,
    interactionLikeCount,
    interactionLikedByMe,
    interactionRepostCount,
    interactionRepostedByMe,
    commentCount,
    detailAccent,
    teamName,
    primaryBorderStyle,
    softBadgeStyle,
    surfaceTintStyle,
    onDeleteRequested,
    onDisplayEdit,
    onGoBack,
    onNavigateToProfile,
    onOwnerMenuOpenChange,
    onQuoteRepost,
    onRedirectToLogin,
    onReportModalOpenChange,
    onRepostMenuOpenChange,
    onSimpleRepost,
    onToggleBookmark,
    onToggleLike,
    onCancelRepost,
}: CheerDetailArticleRuntimeProps) {
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
    const createdAtLabel = detailDateFormatter.format(new Date(displayCreatedAt));
    const repostedAtLabel = isRepost ? detailDateFormatter.format(new Date(selectedPost.createdAt)) : null;
    const embeddedPostFallback = (
        <div
            className="rounded-[20px] border p-3.5 backdrop-blur-sm transition-colors dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
            style={{
                ...primaryBorderStyle,
                ...surfaceTintStyle,
            }}
            aria-busy="true"
            aria-label="원문 불러오는 중"
        >
            <div className="space-y-3 animate-pulse">
                <div className="h-4 w-40 rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-900/70">
                    <div className="h-3 w-24 rounded bg-slate-200/80 dark:bg-slate-800/80" />
                    <div className="mt-3 h-3.5 w-full rounded bg-slate-200/80 dark:bg-slate-800/80" />
                    <div className="mt-2 h-3.5 w-5/6 rounded bg-slate-200/80 dark:bg-slate-800/80" />
                </div>
            </div>
        </div>
    );
    const embeddedPostInlineFallback = (
        <div
            className="rounded-xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-slate-900/70"
            aria-busy="true"
            aria-label="원문 불러오는 중"
        >
            <div className="space-y-3 animate-pulse">
                <div className="h-3 w-24 rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="h-3.5 w-full rounded bg-slate-200/80 dark:bg-slate-800/80" />
                <div className="h-3.5 w-5/6 rounded bg-slate-200/80 dark:bg-slate-800/80" />
            </div>
        </div>
    );
    const actionBarFallback = (
        <div className="mt-3 grid grid-cols-4 gap-1 sm:mt-4 sm:gap-1.5 lg:gap-2.5" aria-busy="true" aria-label="상호작용 불러오는 중">
            {[1, 2, 3, 4].map((item) => (
                <div
                    key={item}
                    className="h-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800/80"
                />
            ))}
        </div>
    );
    const statsAsideFallback = (
        <aside>
            <div
                className="rounded-[16px] border bg-white/85 p-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80"
                style={primaryBorderStyle}
                aria-busy="true"
                aria-label="응원 현황 불러오는 중"
            >
                <div className="animate-pulse space-y-2">
                    <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800/80" />
                    {[1, 2, 3].map((item) => (
                        <div
                            key={item}
                            className="h-[44px] rounded-[12px] bg-slate-200 dark:bg-slate-800/80"
                        />
                    ))}
                </div>
            </div>
        </aside>
    );

    const scrollToComments = () => {
        document.getElementById('cheer-comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <article
            className="relative mt-4 overflow-hidden rounded-[24px] border bg-white font-sans shadow-[0_20px_60px_-44px_rgba(15,23,42,0.42)] dark:bg-slate-950"
            style={primaryBorderStyle}
        >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: detailAccent }} />

            <div className="relative px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
                <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={onGoBack}
                                    className="rounded-full p-1.5 -ml-2 text-slate-700 transition-colors hover:bg-black/5 sm:p-2 dark:text-slate-200 dark:hover:bg-white/10"
                                    aria-label="이전으로"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[15px] font-bold backdrop-blur-sm sm:px-2 sm:py-0.5 sm:text-[15px] dark:border-white/10" style={softBadgeStyle}>
                                    <Megaphone className="h-3 w-3" />
                                    {teamName}
                                </span>
                                {selectedPost.postType === 'NOTICE' && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900 px-2 py-0.5 text-[15px] font-bold text-white sm:px-2 sm:py-0.5 sm:text-[15px] dark:border-white/10 dark:bg-white dark:text-slate-950">
                                        공지
                                    </span>
                                )}
                                {selectedPost.isHot && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[15px] font-bold text-orange-600 sm:px-2 sm:py-0.5 sm:text-[15px] dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                                        <Flame className="h-3 w-3" />
                                        HOT
                                    </span>
                                )}
                                {isSimpleRepost && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[15px] font-bold text-emerald-600 sm:px-2 sm:py-0.5 sm:text-[15px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                        <Repeat2 className="h-3 w-3" />
                                        <span className="max-sm:hidden">리포스트</span>
                                        <span className="sm:hidden">리포</span>
                                    </span>
                                )}
                                {isQuoteRepost && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[15px] font-bold text-violet-600 sm:px-2 sm:py-0.5 sm:text-[15px] dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300">
                                        <Quote className="h-3 w-3" />
                                        <span className="max-sm:hidden">인용 응원</span>
                                        <span className="sm:hidden">인용</span>
                                    </span>
                                )}
                                {selectedPost.shareMode?.startsWith('EXTERNAL_') && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[15px] font-bold text-sky-700 sm:px-2 sm:py-0.5 sm:text-[15px] dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                                        <ExternalLink className="h-3 w-3" />
                                        <span className="max-sm:hidden">외부 출처</span>
                                        <span className="sm:hidden">외부</span>
                                    </span>
                                )}
                            </div>

                            <div className="mt-2.5 flex items-start gap-2.5 sm:mt-3 sm:gap-3">
                                <div
                                    className="relative h-12 w-12 flex-shrink-0 cursor-pointer rounded-full transition-transform hover:scale-[1.02]"
                                    onClick={() => onNavigateToProfile(displayAuthorHandle)}
                                >
                                    <ProfileAvatar
                                        src={resolveProfileImage(displayAuthorProfileImageUrl) || undefined}
                                        alt={displayAuthor}
                                        fallbackName={displayAuthor}
                                        width={48}
                                        height={48}
                                        showRing
                                        ringVariant="cheer"
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
                                        <p className="mb-1 text-[16px] font-bold text-slate-500 dark:text-slate-400">
                                            {isSimpleRepost ? `${selectedPost.author}님 리포스트` : `${selectedPost.author}님 인용`}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => onNavigateToProfile(displayAuthorHandle)}
                                        className="truncate text-left text-[16px] font-bold text-slate-950 transition-colors hover:underline dark:text-slate-50 sm:text-[16px]"
                                    >
                                        {displayAuthor}
                                    </button>
                                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[16px] font-bold text-slate-500 dark:text-slate-400">
                                        <span>{displayAuthorHandleLabel}</span>
                                        <span className="mx-0.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-500" />
                                        <span className="flex items-center gap-1">
                                            <Clock3 className="h-3 w-3" />
                                            {displayTimeAgo}
                                        </span>
                                        <span className="mx-0.5 h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-500" />
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
                                <PlainMenu
                                    open={isOwnerMenuOpen}
                                    onOpenChange={onOwnerMenuOpenChange}
                                    align="end"
                                    panelClassName="w-40 p-1"
                                    trigger={(
                                        <button
                                            type="button"
                                            onClick={() => onOwnerMenuOpenChange(!isOwnerMenuOpen)}
                                            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700 sm:p-2 dark:hover:bg-white/10 dark:hover:text-slate-100"
                                            aria-label="게시물 메뉴"
                                            aria-expanded={isOwnerMenuOpen}
                                            aria-haspopup="menu"
                                        >
                                            <MoreVertical className="h-5 w-5" />
                                        </button>
                                    )}
                                >
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            onOwnerMenuOpenChange(false);
                                            onDisplayEdit();
                                        }}
                                        className="flex w-full items-center rounded-lg px-3 py-2 text-[16px] font-bold text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-secondary"
                                    >
                                        <Edit2 className="mr-2 h-4 w-4" />
                                        수정하기
                                    </button>
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => {
                                            onOwnerMenuOpenChange(false);
                                            onDeleteRequested();
                                        }}
                                        className="flex w-full items-center rounded-lg px-3 py-2 text-[16px] font-bold text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        삭제하기
                                    </button>
                                </PlainMenu>
                            ) : isLoggedIn ? (
                                <button
                                    type="button"
                                    onClick={() => onReportModalOpenChange(true)}
                                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 sm:p-2 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                                    title="신고하기"
                                    aria-label="신고하기"
                                >
                                    <Flag className="h-5 w-5" />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    {originalEmbeddedPost ? (
                        <Suspense fallback={embeddedPostFallback}>
                            <LazyCheerDetailEmbeddedPostRuntime
                                detailAccent={detailAccent}
                                isQuoteRepost={isQuoteRepost}
                                isSimpleRepost={isSimpleRepost}
                                originalEmbeddedPost={originalEmbeddedPost}
                                primaryBorderStyle={primaryBorderStyle}
                                surfaceTintStyle={surfaceTintStyle}
                                variant="repost-banner"
                            />
                        </Suspense>
                    ) : null}

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_196px]">
                        <div className="min-w-0">
                            <div
                                className="rounded-[22px] border bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-5"
                                style={primaryBorderStyle}
                            >
                                {isSimpleRepost && selectedPost.originalDeleted && originalEmbeddedPost ? (
                                    <Suspense fallback={embeddedPostInlineFallback}>
                                        <LazyCheerDetailEmbeddedPostRuntime
                                            detailAccent={detailAccent}
                                            isQuoteRepost={isQuoteRepost}
                                            isSimpleRepost={isSimpleRepost}
                                            originalEmbeddedPost={originalEmbeddedPost}
                                            primaryBorderStyle={primaryBorderStyle}
                                            surfaceTintStyle={surfaceTintStyle}
                                            variant="simple-deleted"
                                        />
                                    </Suspense>
                                ) : (
                                    <>
                                        <div className="whitespace-pre-wrap break-words text-[16px] leading-6 font-bold text-slate-900 dark:text-slate-100 sm:text-[16px] sm:leading-7">
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
                                                    <p className="text-[16px] font-bold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">출처</p>
                                                    <p className="mt-1 truncate text-[16px] font-bold">{selectedPost.sourceInfo.url}</p>
                                                    <p className="mt-1 text-[16px] font-bold text-sky-700/80 dark:text-sky-200/80">
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

                                <Suspense fallback={actionBarFallback}>
                                    <LazyCheerDetailActionBarRuntime
                                        canCancelRepost={canCancelRepost}
                                        canQuoteRepost={canQuoteRepost}
                                        canSimpleRepost={canSimpleRepost}
                                        commentCount={commentCount}
                                        interactionBookmarked={interactionBookmarked}
                                        interactionBookmarkCount={interactionBookmarkCount}
                                        interactionLikeCount={interactionLikeCount}
                                        interactionLikedByMe={interactionLikedByMe}
                                        interactionRepostedByMe={interactionRepostedByMe}
                                        isLoggedIn={isLoggedIn}
                                        isRepostMenuOpen={isRepostMenuOpen}
                                        repostButtonActive={repostButtonActive}
                                        repostCount={repostCount}
                                        repostUnavailableMessage={repostUnavailableMessage}
                                        onCancelRepost={onCancelRepost}
                                        onQuoteRepost={onQuoteRepost}
                                        onRedirectToLogin={onRedirectToLogin}
                                        onRepostMenuOpenChange={onRepostMenuOpenChange}
                                        onScrollToComments={scrollToComments}
                                        onSimpleRepost={onSimpleRepost}
                                        onToggleBookmark={onToggleBookmark}
                                        onToggleLike={onToggleLike}
                                    />
                                </Suspense>
                            </div>
                        </div>

                        <Suspense fallback={statsAsideFallback}>
                            <LazyCheerDetailStatsAsideRuntime
                                commentCount={commentCount}
                                createdAtLabel={createdAtLabel}
                                detailAccent={detailAccent}
                                primaryBorderStyle={primaryBorderStyle}
                                repostedAtLabel={repostedAtLabel}
                                teamName={teamName}
                                views={selectedPost.views}
                            />
                        </Suspense>
                    </div>
                </div>
            </div>
        </article>
    );
}
