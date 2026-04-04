import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { useConfirmDialog } from './contexts/ConfirmDialogContext';
import { Button } from './ui/button';
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
import { cn } from '../lib/utils';
import { ProfileAvatar } from './ui/ProfileAvatar';
import * as cheatApi from '../api/cheerApi';
import EmbeddedPost from './EmbeddedPost';
import ImageGrid from './ImageGrid';
import TeamLogo from './TeamLogo';
import { TEAM_DATA } from '../constants/teams';
import { formatTimeAgo } from '../utils/time';
import { DEFAULT_PROFILE_IMAGE } from '../utils/constants';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { useCheerPost, useCheerMutations } from '../hooks/useCheerQueries';
import PlainMenu from './ui/plain-menu';
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
import { parseError } from '../utils/errorUtils';

const LazyReportModal = lazy(() => import('./ReportModal'));
const LazyQuoteRepostEditor = lazy(() => import('./QuoteRepostEditor'));
const LazyCheerDetailCommentsPanel = lazy(() => import('./CheerDetailCommentsPanel'));

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
    const { toggleLikeMutation, toggleBookmarkMutation, deletePostMutation, repostMutation, cancelRepostMutation } = useCheerMutations();

    const [commentCount, setCommentCount] = useState(0);
    const [isRepostMenuOpen, setIsRepostMenuOpen] = useState(false);
    const [isOwnerMenuOpen, setIsOwnerMenuOpen] = useState(false);
    const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false);
    const [hasMountedQuoteEditor, setHasMountedQuoteEditor] = useState(false);

    // Report Modal State
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [hasMountedReportModal, setHasMountedReportModal] = useState(false);

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
        setIsRepostMenuOpen(false);
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

    const scrollToComments = () => {
        document.getElementById('cheer-comments-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
                <article
                    className="relative mt-4 overflow-hidden rounded-[24px] border bg-white shadow-[0_20px_60px_-44px_rgba(15,23,42,0.42)] dark:bg-slate-950"
                    style={primaryBorderStyle}
                >
                    <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: detailAccent }} />

                    <div className="relative px-4 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-start justify-between gap-4">
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
                                        <PlainMenu
                                            open={isOwnerMenuOpen}
                                            onOpenChange={setIsOwnerMenuOpen}
                                            align="end"
                                            panelClassName="w-40 p-1"
                                            trigger={(
                                                <button
                                                    type="button"
                                                    onClick={() => setIsOwnerMenuOpen((prev) => !prev)}
                                                    className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-700 sm:p-2 dark:hover:bg-white/10 dark:hover:text-slate-100"
                                                    aria-label="게시물 메뉴"
                                                    aria-expanded={isOwnerMenuOpen}
                                                    aria-haspopup="menu"
                                                >
                                                    <MoreVertical className="w-5 h-5" />
                                                </button>
                                            )}
                                        >
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    setIsOwnerMenuOpen(false);
                                                    handleDisplayEdit();
                                                }}
                                                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-secondary"
                                            >
                                                <Edit2 className="mr-2 h-4 w-4" />
                                                수정하기
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => {
                                                    setIsOwnerMenuOpen(false);
                                                    void handleDelete();
                                                }}
                                                className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                삭제하기
                                            </button>
                                        </PlainMenu>
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
                            </div>

                            {isRepost && originalEmbeddedPost && (
                                <div
                                    className="rounded-[20px] border p-3.5 backdrop-blur-sm transition-colors dark:border-white/10 dark:bg-white/[0.03] sm:p-4"
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
                                            <button
                                                type="button"
                                                onClick={toggleLike}
                                                aria-label={`좋아요 ${interactionLikeCount.toLocaleString()}`}
                                                className={cn(
                                                    'flex h-9 items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:h-10 sm:gap-1',
                                                    interactionLikedByMe
                                                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-300'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:bg-slate-950'
                                                )}
                                            >
                                                <Heart className={cn('h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4', interactionLikedByMe && 'fill-current')} />
                                                <span className="text-[11px] font-bold leading-none sm:text-[13px]">{interactionLikeCount.toLocaleString()}</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={scrollToComments}
                                                aria-label={`댓글 ${commentCount.toLocaleString()}`}
                                                className="flex h-9 items-center justify-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 text-center text-slate-700 transition-all duration-150 hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 active:scale-[0.98] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-sky-500/20 dark:hover:bg-sky-500/10 sm:h-10 sm:gap-1"
                                            >
                                                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                                                <span className="text-[11px] font-bold leading-none sm:text-[13px]">{commentCount.toLocaleString()}</span>
                                            </button>

                                            <PlainMenu
                                                open={isRepostMenuOpen}
                                                onOpenChange={(open) => {
                                                    if (open && !isLoggedIn) {
                                                        redirectToLogin();
                                                        return;
                                                    }
                                                    setIsRepostMenuOpen(open);
                                                }}
                                                align="start"
                                                panelClassName="w-56 overflow-hidden p-0"
                                                trigger={(
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (!isRepostMenuOpen && !isLoggedIn) {
                                                                redirectToLogin();
                                                                return;
                                                            }
                                                            setIsRepostMenuOpen((prev) => !prev);
                                                        }}
                                                        className={cn(
                                                            'flex h-9 items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:h-10 sm:gap-1',
                                                            repostButtonActive
                                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300'
                                                                : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-emerald-500/20 dark:hover:bg-emerald-500/10'
                                                        )}
                                                        aria-label={repostButtonActive ? `리포스트 취소 (현재 ${repostCount}회)` : `리포스트 (현재 ${repostCount}회)`}
                                                        aria-pressed={repostButtonActive}
                                                        aria-expanded={isRepostMenuOpen}
                                                        aria-haspopup="menu"
                                                    >
                                                        <Repeat2 className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                                                        <span className="text-[11px] font-bold leading-none sm:text-[13px]">{repostCount.toLocaleString()}</span>
                                                    </button>
                                                )}
                                            >
                                                    <div className="flex flex-col py-1">
                                                        {canCancelRepost ? (
                                                            <button
                                                                type="button"
                                                                role="menuitem"
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
                                                                    role="menuitem"
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
                                                                    role="menuitem"
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
                                            </PlainMenu>

                                            <button
                                                type="button"
                                                onClick={toggleBookmark}
                                                aria-label={`북마크 ${interactionBookmarkCount.toLocaleString()}`}
                                                className={cn(
                                                    'flex h-9 items-center justify-center gap-0.5 rounded-full border px-1.5 text-center transition-all duration-150 hover:-translate-y-px active:scale-[0.98] sm:h-10 sm:gap-1',
                                                    interactionBookmarked
                                                        ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300'
                                                        : 'border-slate-200 bg-white text-slate-700 hover:border-amber-200 hover:bg-amber-50 dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-amber-500/20 dark:hover:bg-amber-500/10'
                                                )}
                                            >
                                                <Bookmark className={cn('h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4', interactionBookmarked && 'fill-current')} />
                                                <span className="text-[11px] font-bold leading-none sm:text-[13px]">
                                                    {interactionBookmarkCount.toLocaleString()}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <aside>
                                    <div
                                        className="rounded-[18px] border bg-white/85 p-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/80"
                                        style={primaryBorderStyle}
                                    >
                                        <div className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: detailAccent }}>
                                            응원 현황
                                        </div>
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
                        </div>

                        <Suspense
                            fallback={(
                                <div
                                    id="cheer-comments-section"
                                    className="mt-4 border-t border-slate-200/70 pt-4 dark:border-white/10"
                                >
                                    <div aria-busy="true" aria-label="댓글 불러오는 중" className="space-y-2">
                                        {[1, 2, 3].map((item) => (
                                            <div
                                                key={item}
                                                className="flex animate-pulse gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-3 dark:border-white/10 dark:bg-slate-900/70"
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
                                </div>
                            )}
                        >
                            <LazyCheerDetailCommentsPanel
                                resolvedPostId={resolvedPostId}
                                commentCount={commentCount}
                                onCommentCountChange={setCommentCount}
                                isLoggedIn={isLoggedIn}
                                authUserId={authUserId != null ? String(authUserId) : null}
                                authUserHandle={authUserHandle}
                                authUserDisplayName={authUserDisplayName}
                                authUserProfileImageUrl={authUserProfileImageUrl}
                                areCommentRepliesAvailable={areCommentRepliesAvailable}
                                detailAccent={detailAccent}
                                primaryBorderStyle={primaryBorderStyle}
                                surfaceTintStyle={surfaceTintStyle}
                                onRedirectToLogin={redirectToLogin}
                                confirm={confirm}
                            />
                        </Suspense>
                    </div>
                </article>
                {hasMountedReportModal ? (
                    <Suspense
                        fallback={isReportModalOpen ? (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-sm font-semibold text-white">
                                신고 창을 불러오는 중...
                            </div>
                        ) : null}
                    >
                        <LazyReportModal
                            postId={parsedPostId}
                            isOpen={isReportModalOpen}
                            onClose={() => setIsReportModalOpen(false)}
                        />
                    </Suspense>
                ) : null}
                {hasMountedQuoteEditor ? (
                    <Suspense
                        fallback={isQuoteEditorOpen ? (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 text-sm font-semibold text-white">
                                인용 작성기를 불러오는 중...
                            </div>
                        ) : null}
                    >
                        <LazyQuoteRepostEditor
                            isOpen={isQuoteEditorOpen}
                            onClose={() => setIsQuoteEditorOpen(false)}
                            post={selectedPost}
                        />
                    </Suspense>
                ) : null}
            </div>
        </div>
    );
}
