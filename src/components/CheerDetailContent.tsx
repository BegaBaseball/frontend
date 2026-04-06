import { Suspense, lazy, useState } from 'react';
import {
    ArrowLeft,
    Bookmark,
    ChevronDown,
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
    Undo2,
} from 'lucide-react';
import type { CheerPost } from '../api/cheerApi';
import { TEAM_DATA } from '../constants/teams';
import { cn } from '../lib/utils';
import {
    getReadableAccent,
    hexToRgb,
    normalizeHexColor,
    toRgba,
} from '../utils/teamColors';
import { formatTimeAgo } from '../utils/time';
import { getRepostPolicyDecision } from '../utils/repostPolicy';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import type { ConfirmOptions } from './contexts/confirmDialogCore';
import EmbeddedPost from './EmbeddedPost';
import ImageGrid from './ImageGrid';
import TeamLogo from './TeamLogo';
import PlainMenu from './ui/plain-menu';
import { ProfileAvatar } from './ui/ProfileAvatar';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

const LazyReportModal = lazy(() => import('./ReportModal'));
const LazyQuoteRepostEditor = lazy(() => import('./QuoteRepostEditor'));
const LazyCheerDetailCommentsPanel = lazy(() => import('./CheerDetailCommentsPanel'));
const LazyCheerDetailStatsBody = lazy(() => import('./CheerDetailStatsBody'));

const detailDateFormatter = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'long',
    timeStyle: 'short',
});

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

interface CheerDetailContentProps {
    parsedPostId: number;
    resolvedPostId: number;
    selectedPost: CheerPost;
    authUserId?: number | null;
    authUserHandle?: string | null;
    authUserDisplayName: string;
    authUserProfileImageUrl?: string | null;
    areCommentRepliesAvailable: boolean;
    commentCount: number;
    hasMountedQuoteEditor: boolean;
    hasMountedReportModal: boolean;
    interactionBookmarked: boolean;
    interactionBookmarkCount: number;
    interactionLikeCount: number;
    interactionLikedByMe: boolean;
    interactionRepostCount: number;
    interactionRepostedByMe: boolean;
    isLoggedIn: boolean;
    isOwnerMenuOpen: boolean;
    isQuoteEditorOpen: boolean;
    isReportModalOpen: boolean;
    isRepostMenuOpen: boolean;
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    onCommentCountChange: (count: number) => void;
    onDeleteRequested: () => void;
    onDisplayEdit: () => void;
    onGoBack: () => void;
    onNavigateToProfile: (handle?: string | null) => void;
    onOwnerMenuOpenChange: (open: boolean) => void;
    onQuoteEditorOpenChange: (open: boolean) => void;
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

export default function CheerDetailContent({
    parsedPostId,
    resolvedPostId,
    selectedPost,
    authUserId,
    authUserHandle,
    authUserDisplayName,
    authUserProfileImageUrl,
    areCommentRepliesAvailable,
    commentCount,
    hasMountedQuoteEditor,
    hasMountedReportModal,
    interactionBookmarked,
    interactionBookmarkCount,
    interactionLikeCount,
    interactionLikedByMe,
    interactionRepostCount,
    interactionRepostedByMe,
    isLoggedIn,
    isOwnerMenuOpen,
    isQuoteEditorOpen,
    isReportModalOpen,
    isRepostMenuOpen,
    confirm,
    onCommentCountChange,
    onDeleteRequested,
    onDisplayEdit,
    onGoBack,
    onNavigateToProfile,
    onOwnerMenuOpenChange,
    onQuoteEditorOpenChange,
    onQuoteRepost,
    onRedirectToLogin,
    onReportModalOpenChange,
    onRepostMenuOpenChange,
    onSimpleRepost,
    onToggleBookmark,
    onToggleLike,
    onCancelRepost,
}: CheerDetailContentProps) {
    const repostCount = interactionRepostCount;
    const [isStatsOpen, setIsStatsOpen] = useState(false);
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

    const scrollToComments = () => {
        document.getElementById('cheer-comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const toggleStats = () => {
        setIsStatsOpen((prev) => !prev);
    };

    return (
        <>
            <article
                className="relative mt-4 overflow-hidden rounded-[24px] border bg-white shadow-[0_20px_60px_-44px_rgba(15,23,42,0.42)] dark:bg-slate-950"
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
                                    <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm sm:px-2 sm:py-0.5 sm:text-[10px] dark:border-white/10" style={softBadgeStyle}>
                                        <Megaphone className="h-3 w-3" />
                                        {teamName}
                                    </span>
                                    {selectedPost.postType === 'NOTICE' && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-900/10 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white sm:px-2 sm:py-0.5 sm:text-[10px] dark:border-white/10 dark:bg-white dark:text-slate-950">
                                            공지
                                        </span>
                                    )}
                                    {selectedPost.isHot && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600 sm:px-2 sm:py-0.5 sm:text-[10px] dark:border-orange-500/30 dark:bg-orange-500/15 dark:text-orange-300">
                                            <Flame className="h-3 w-3" />
                                            HOT
                                        </span>
                                    )}
                                    {isSimpleRepost && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 sm:px-2 sm:py-0.5 sm:text-[10px] dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                                            <Repeat2 className="h-3 w-3" />
                                            <span className="max-sm:hidden">리포스트</span>
                                            <span className="sm:hidden">리포</span>
                                        </span>
                                    )}
                                    {isQuoteRepost && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-600 sm:px-2 sm:py-0.5 sm:text-[10px] dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300">
                                            <Quote className="h-3 w-3" />
                                            <span className="max-sm:hidden">인용 응원</span>
                                            <span className="sm:hidden">인용</span>
                                        </span>
                                    )}
                                    {selectedPost.shareMode?.startsWith('EXTERNAL_') && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 sm:px-2 sm:py-0.5 sm:text-[10px] dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
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
                                        <p className="mb-1 text-[15px] font-semibold text-slate-500 dark:text-slate-400">
                                                {isSimpleRepost ? `${selectedPost.author}님 리포스트` : `${selectedPost.author}님 인용`}
                                            </p>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => onNavigateToProfile(displayAuthorHandle)}
                                            className="truncate text-left text-[15px] font-bold text-slate-950 transition-colors hover:underline dark:text-slate-50 sm:text-[16px]"
                                        >
                                            {displayAuthor}
                                        </button>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] text-slate-500 dark:text-slate-400">
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
                                            className="flex w-full items-center rounded-lg px-3 py-2 text-[15px] font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-secondary"
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
                                            className="flex w-full items-center rounded-lg px-3 py-2 text-[15px] font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
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

                                    {isRepost && originalEmbeddedPost && (
                                        <div
                                            className="rounded-[20px] border p-3.5 backdrop-blur-sm transition-colors dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
                                            style={{
                                                ...primaryBorderStyle,
                                    ...surfaceTintStyle,
                                }}
                            >
                                                <div className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: detailAccent }}>
                                                {isQuoteRepost ? <Quote className="h-3.5 w-3.5" /> : <Repeat2 className="h-3.5 w-3.5" />}
                                                <span>
                                                    {isSimpleRepost
                                                        ? '원글 반응/댓글과 함께 보입니다.'
                                                        : '인용 원문을 함께 볼 수 있어요.'}
                                                </span>
                                            </div>
                                {isQuoteRepost ? (
                                    <EmbeddedPost
                                        post={originalEmbeddedPost}
                                        className="mt-4 bg-white/80 hover:bg-white dark:bg-slate-900/80 dark:hover:bg-slate-900"
                                    />
                                ) : null}
                            </div>
                        )}

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
                                    <div className="whitespace-pre-wrap break-words text-[15px] leading-6 font-medium text-slate-900 dark:text-slate-100 sm:text-[16px] sm:leading-7">
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
                                                    <p className="text-[15px] font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-300">출처</p>
                                                        <p className="mt-1 truncate text-[15px] font-medium">{selectedPost.sourceInfo.url}</p>
                                                        <p className="mt-1 text-[15px] text-sky-700/80 dark:text-sky-200/80">
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

                                    <div className="mt-3 grid grid-cols-4 gap-1 sm:mt-4 sm:gap-1.5 lg:gap-2.5">
                                        <button
                                            type="button"
                                            onClick={onToggleLike}
                                            aria-label={`좋아요 ${interactionLikeCount.toLocaleString()}`}
                                            className={cn(
                                                'flex h-10 w-full items-center justify-center gap-0.5 rounded-full border px-1.5 text-center whitespace-nowrap transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:h-10 sm:gap-1',
                                                interactionLikedByMe
                                                    ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-950'
                                            )}
                                        >
                                            <Heart className={cn('h-6 w-6 flex-shrink-0', interactionLikedByMe && 'fill-current')} />
                                            <span className="whitespace-nowrap text-[15px] font-bold leading-none sm:text-[16px]">{interactionLikeCount.toLocaleString()}</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={scrollToComments}
                                            aria-label={`댓글 ${commentCount.toLocaleString()}`}
                                            className="flex h-10 w-full items-center justify-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 text-center text-slate-700 whitespace-nowrap transition-all duration-150 hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 active:scale-[0.98] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-sky-500/20 dark:hover:bg-sky-500/10 sm:h-10 sm:gap-1"
                                        >
                                            <MessageSquare className="h-6 w-6 flex-shrink-0" />
                                            <span className="whitespace-nowrap text-[15px] font-bold leading-none sm:text-[16px]">{commentCount.toLocaleString()}</span>
                                        </button>

                                        <PlainMenu
                                            open={isRepostMenuOpen}
                                            onOpenChange={(open) => {
                                                if (open && !isLoggedIn) {
                                                    onRedirectToLogin();
                                                    return;
                                                }
                                                onRepostMenuOpenChange(open);
                                            }}
                                            align="start"
                                            panelClassName="w-52 overflow-hidden p-0 sm:w-56"
                                            trigger={(
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isRepostMenuOpen && !isLoggedIn) {
                                                            onRedirectToLogin();
                                                            return;
                                                        }
                                                        onRepostMenuOpenChange(!isRepostMenuOpen);
                                                    }}
                                                    className={cn(
                                                    'flex h-10 w-full items-center justify-center gap-0.5 whitespace-nowrap rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:h-10 sm:gap-1',
                                                    repostButtonActive
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/10'
                                                    )}
                                                    aria-label={repostButtonActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                                                    aria-pressed={repostButtonActive}
                                                    aria-expanded={isRepostMenuOpen}
                                                    aria-haspopup="menu"
                                                >
                                                    <Repeat2 className="h-6 w-6 flex-shrink-0" />
                                            <span className="whitespace-nowrap text-[15px] font-bold leading-none sm:text-[16px]">{repostCount.toLocaleString()}</span>
                                                </button>
                                            )}
                                        >
                                            <div className="flex flex-col py-1">
                                                {canCancelRepost ? (
                                                    <button
                                                        type="button"
                                                        role="menuitem"
                                                        onClick={onCancelRepost}
                                                        aria-label="리포스트 삭제"
                                                        className="flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Undo2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                                                        <div>
                                                            <span className="block text-[15px] font-semibold text-red-600 dark:text-red-400">
                                                                리포스트 삭제
                                                            </span>
                                                            <span className="text-[15px] text-red-500/80 dark:text-red-400/80">프로필에서 제외</span>
                                                        </div>
                                                    </button>
                                                ) : canSimpleRepost || canQuoteRepost ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            role="menuitem"
                                                            onClick={onSimpleRepost}
                                                            aria-label="리포스트"
                                                            className="flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                                        >
                                                            <div className="flex h-5 w-5 items-center justify-center">
                                                                {interactionRepostedByMe ? (
                                                                    <Undo2 className="h-4 w-4 text-emerald-500" />
                                                                ) : (
                                                                    <Repeat2 className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <span className="block text-[15px] font-semibold text-gray-700 dark:text-gray-200">
                                                                    {interactionRepostedByMe ? '리포스트 취소' : '리포스트'}
                                                                </span>
                                                            </div>
                                                        </button>
                                                        {canQuoteRepost ? (
                                                            <button
                                                                type="button"
                                                                role="menuitem"
                                                                onClick={onQuoteRepost}
                                                                aria-label="인용하기"
                                                                className="flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                                                            >
                                                                <div className="flex h-5 w-5 items-center justify-center">
                                                                    <Edit2 className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                                                </div>
                                                                <div>
                                                                <span className="block text-[15px] font-semibold text-gray-700 dark:text-gray-200">인용 응원</span>
                                                                </div>
                                                            </button>
                                                        ) : null}
                                                    </>
                                                ) : (
                                                <div className="px-3.5 py-2.5 text-center text-[15px] text-gray-400">
                                                    {repostUnavailableMessage}
                                                </div>
                                                )}
                                            </div>
                                        </PlainMenu>

                                        <button
                                            type="button"
                                            onClick={onToggleBookmark}
                                            aria-label={`북마크 ${interactionBookmarkCount.toLocaleString()}`}
                                            className={cn(
                                                'flex h-10 w-full items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:h-10 sm:gap-1',
                                                interactionBookmarked
                                                    ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
                                                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/10'
                                            )}
                                        >
                                            <Bookmark className={cn('h-6 w-6 flex-shrink-0', interactionBookmarked && 'fill-current')} />
                                            <span className="whitespace-nowrap text-[15px] font-bold leading-none sm:text-[16px]">
                                                {interactionBookmarkCount.toLocaleString()}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <aside>
                                <div
                                    className="rounded-[16px] border bg-white/85 p-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80"
                                    style={primaryBorderStyle}
                                >
                                    <button
                                        type="button"
                                        onClick={toggleStats}
                                        className="flex w-full items-center justify-between rounded-md py-0.5 text-left"
                                        aria-label="응원 현황 토글"
                                        aria-expanded={isStatsOpen}
                                        aria-controls="cheer-detail-stats"
                                    >
                                    <div className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: detailAccent }}>
                                            <Megaphone className="h-3.5 w-3.5" />
                                            <span>응원 현황</span>
                                        </div>
                                        <ChevronDown className={cn(
                                            'h-3.5 w-3.5 text-slate-500 transition-transform duration-200 lg:hidden',
                                            isStatsOpen && 'rotate-180'
                                        )} />
                                    </button>
                                    <div
                                        id="cheer-detail-stats"
                                        className={cn(
                                            'mt-2 space-y-1.5 lg:block',
                                            isStatsOpen ? 'block' : 'hidden'
                                        )}
                                    >
                                        <Suspense
                                            fallback={(
                                                <>
                                                    {[1, 2, 3].map((item) => (
                                                        <div
                                                            key={item}
                                                            className="h-[44px] animate-pulse rounded-[12px] bg-slate-100 dark:bg-slate-800/80"
                                                        />
                                                    ))}
                                                </>
                                            )}
                                        >
                                            <LazyCheerDetailStatsBody
                                                commentCount={commentCount}
                                                createdAtLabel={createdAtLabel}
                                                repostedAtLabel={repostedAtLabel}
                                                teamName={teamName}
                                                views={selectedPost.views}
                                            />
                                        </Suspense>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>

                    <Suspense
                        fallback={(
                            <div
                                id="cheer-comments-section"
                                className="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10"
                            >
                                <div aria-busy="true" aria-label="댓글 불러오는 중" className="space-y-2">
                                    {[1, 2].map((item) => (
                                        <div
                                            key={item}
                                            className="flex animate-pulse gap-2.5 rounded-[16px] border border-slate-200 bg-white/80 p-2.5 dark:border-white/10 dark:bg-slate-900/70"
                                        >
                                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                                            <div className="flex-1 space-y-1.5">
                                                <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                                                <div className="h-3.5 w-full rounded bg-slate-200 dark:bg-slate-800" />
                                                <div className="h-3.5 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    >
                        <LazyCheerDetailCommentsPanel
                            resolvedPostId={resolvedPostId}
                            commentCount={commentCount}
                            onCommentCountChange={onCommentCountChange}
                            isLoggedIn={isLoggedIn}
                            authUserId={authUserId != null ? String(authUserId) : null}
                            authUserHandle={authUserHandle}
                            authUserDisplayName={authUserDisplayName}
                            authUserProfileImageUrl={authUserProfileImageUrl}
                            areCommentRepliesAvailable={areCommentRepliesAvailable}
                            detailAccent={detailAccent}
                            primaryBorderStyle={primaryBorderStyle}
                            surfaceTintStyle={surfaceTintStyle}
                            onRedirectToLogin={onRedirectToLogin}
                            confirm={confirm}
                        />
                    </Suspense>
                </div>
            </article>
            {hasMountedReportModal ? (
                <Suspense
                    fallback={isReportModalOpen ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[15px] font-semibold text-white">
                            신고 창을 불러오는 중...
                        </div>
                    ) : null}
                >
                    <LazyReportModal
                        postId={parsedPostId}
                        isOpen={isReportModalOpen}
                        onClose={() => onReportModalOpenChange(false)}
                    />
                </Suspense>
            ) : null}
            {hasMountedQuoteEditor ? (
                <Suspense
                    fallback={isQuoteEditorOpen ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[15px] font-semibold text-white">
                            인용 작성기를 불러오는 중...
                        </div>
                    ) : null}
                >
                    <LazyQuoteRepostEditor
                        isOpen={isQuoteEditorOpen}
                        onClose={() => onQuoteEditorOpenChange(false)}
                        post={selectedPost}
                    />
                </Suspense>
            ) : null}
        </>
    );
}
