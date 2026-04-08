import { Suspense, lazy } from 'react';
import type { CheerPost } from '../api/cheerApi';
import { TEAM_DATA } from '../constants/teams';
import {
    getReadableAccent,
    hexToRgb,
    normalizeHexColor,
    toRgba,
} from '../utils/teamColors';
import type { ConfirmOptions } from './contexts/confirmDialogCore';
import ViewportDeferred from './ViewportDeferred';

const LazyCheerDetailArticleRuntime = lazy(() => import('./CheerDetailArticleRuntime'));
const LazyReportModal = lazy(() => import('./ReportModal'));
const LazyQuoteRepostEditor = lazy(() => import('./QuoteRepostEditor'));
const LazyCheerDetailCommentsPanel = lazy(() => import('./CheerDetailCommentsPanel'));

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
    const isSimpleRepost = selectedPost.repostType === 'SIMPLE' && Boolean(selectedPost.originalPost);
    const displayAuthorTeamId = isSimpleRepost && selectedPost.originalPost
        ? selectedPost.originalPost.teamId
        : (selectedPost.authorTeamId || selectedPost.teamId);
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
    const shouldDeferCommentsPanel = isLoggedIn;
    const commentsFallback = (
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
    );
    const articleFallback = (
        <article
            className="relative mt-4 overflow-hidden rounded-[24px] border bg-white font-sans shadow-[0_20px_60px_-44px_rgba(15,23,42,0.42)] dark:bg-slate-950"
            style={primaryBorderStyle}
            aria-busy="true"
            aria-label="응원 상세 불러오는 중"
        >
            <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: detailAccent }} />
            <div className="relative space-y-4 px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
                <div className="flex animate-pulse items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                            <div className="h-7 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                            <div className="h-7 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
                            <div className="min-w-0 flex-1 space-y-2">
                                <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                                <div className="h-3 w-48 rounded bg-slate-200 dark:bg-slate-800" />
                            </div>
                        </div>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_196px]">
                    <div className="rounded-[22px] border bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80 sm:p-5" style={primaryBorderStyle}>
                        <div className="animate-pulse space-y-3">
                            <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="h-4 w-4/5 rounded bg-slate-200 dark:bg-slate-800" />
                            <div className="mt-4 grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((item) => (
                                    <div key={item} className="h-10 rounded-full bg-slate-200 dark:bg-slate-800" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="rounded-[16px] border bg-white/85 p-2.5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80" style={primaryBorderStyle}>
                        <div className="animate-pulse space-y-2">
                            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-[44px] rounded-[12px] bg-slate-200 dark:bg-slate-800" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </article>
    );

    return (
        <>
            <Suspense fallback={articleFallback}>
                <LazyCheerDetailArticleRuntime
                    selectedPost={selectedPost}
                    authUserId={authUserId}
                    authUserHandle={authUserHandle}
                    isLoggedIn={isLoggedIn}
                    isOwnerMenuOpen={isOwnerMenuOpen}
                    isRepostMenuOpen={isRepostMenuOpen}
                    interactionBookmarked={interactionBookmarked}
                    interactionBookmarkCount={interactionBookmarkCount}
                    interactionLikeCount={interactionLikeCount}
                    interactionLikedByMe={interactionLikedByMe}
                    interactionRepostCount={interactionRepostCount}
                    interactionRepostedByMe={interactionRepostedByMe}
                    commentCount={commentCount}
                    detailAccent={detailAccent}
                    teamName={teamName}
                    primaryBorderStyle={primaryBorderStyle}
                    softBadgeStyle={softBadgeStyle}
                    surfaceTintStyle={surfaceTintStyle}
                    onDeleteRequested={onDeleteRequested}
                    onDisplayEdit={onDisplayEdit}
                    onGoBack={onGoBack}
                    onNavigateToProfile={onNavigateToProfile}
                    onOwnerMenuOpenChange={onOwnerMenuOpenChange}
                    onQuoteRepost={onQuoteRepost}
                    onRedirectToLogin={onRedirectToLogin}
                    onReportModalOpenChange={onReportModalOpenChange}
                    onRepostMenuOpenChange={onRepostMenuOpenChange}
                    onSimpleRepost={onSimpleRepost}
                    onToggleBookmark={onToggleBookmark}
                    onToggleLike={onToggleLike}
                    onCancelRepost={onCancelRepost}
                />
            </Suspense>
            {shouldDeferCommentsPanel ? (
                <ViewportDeferred fallback={commentsFallback} rootMargin="240px 0px 320px 0px">
                    <Suspense fallback={commentsFallback}>
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
                </ViewportDeferred>
            ) : (
                <Suspense fallback={commentsFallback}>
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
            )}
            {hasMountedReportModal ? (
                <Suspense
                    fallback={isReportModalOpen ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-semibold text-white">
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
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-[16px] font-semibold text-white">
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
