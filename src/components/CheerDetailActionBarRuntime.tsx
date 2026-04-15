import { cn } from '../lib/utils';
import { RotateCcwIcon } from './icons/PublicFeatureIcons';
import {
    BookmarkIcon,
    HeartIcon,
    MessageSquareIcon,
    PenSquareIcon,
    RepeatIcon,
} from './icons/PublicShellIcons';
import PlainMenu from './ui/plain-menu';

interface CheerDetailActionBarRuntimeProps {
    canCancelRepost: boolean;
    canQuoteRepost: boolean;
    canSimpleRepost: boolean;
    commentCount: number;
    interactionBookmarked: boolean;
    interactionBookmarkCount: number;
    interactionLikeCount: number;
    interactionLikedByMe: boolean;
    interactionRepostedByMe: boolean;
    isLoggedIn: boolean;
    isRepostMenuOpen: boolean;
    repostButtonActive: boolean;
    repostCount: number;
    repostUnavailableMessage: string;
    onCancelRepost: () => void;
    onQuoteRepost: () => void;
    onRedirectToLogin: () => void;
    onRepostMenuOpenChange: (open: boolean) => void;
    onScrollToComments: () => void;
    onSimpleRepost: () => void;
    onToggleBookmark: () => void;
    onToggleLike: () => void;
}

export default function CheerDetailActionBarRuntime({
    canCancelRepost,
    canQuoteRepost,
    canSimpleRepost,
    commentCount,
    interactionBookmarked,
    interactionBookmarkCount,
    interactionLikeCount,
    interactionLikedByMe,
    interactionRepostedByMe,
    isLoggedIn,
    isRepostMenuOpen,
    repostButtonActive,
    repostCount,
    repostUnavailableMessage,
    onCancelRepost,
    onQuoteRepost,
    onRedirectToLogin,
    onRepostMenuOpenChange,
    onScrollToComments,
    onSimpleRepost,
    onToggleBookmark,
    onToggleLike,
}: CheerDetailActionBarRuntimeProps) {
    return (
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
                <HeartIcon className={cn('h-8 w-8 flex-shrink-0', interactionLikedByMe && 'fill-current')} />
                <span className="whitespace-nowrap text-[16px] font-bold leading-none sm:text-[16px]">
                    {interactionLikeCount.toLocaleString()}
                </span>
            </button>

            <button
                type="button"
                onClick={onScrollToComments}
                aria-label={`댓글 ${commentCount.toLocaleString()}`}
                className="flex h-10 w-full items-center justify-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 text-center text-slate-700 whitespace-nowrap transition-all duration-150 hover:-translate-y-px hover:border-sky-200 hover:bg-sky-50 active:scale-[0.98] dark:border-white/10 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-sky-500/20 dark:hover:bg-sky-500/10 sm:h-10 sm:gap-1"
            >
                <MessageSquareIcon className="h-8 w-8 flex-shrink-0" />
                <span className="whitespace-nowrap text-[16px] font-bold leading-none sm:text-[16px]">
                    {commentCount.toLocaleString()}
                </span>
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
                        <RepeatIcon className="h-8 w-8 flex-shrink-0" />
                        <span className="whitespace-nowrap text-[16px] font-bold leading-none sm:text-[16px]">
                            {repostCount.toLocaleString()}
                        </span>
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
                            <RotateCcwIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                            <div>
                                <span className="block text-[16px] font-bold text-red-600 dark:text-red-400">
                                    리포스트 삭제
                                </span>
                                <span className="text-[16px] font-bold text-red-500/80 dark:text-red-400/80">
                                    프로필에서 제외
                                </span>
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
                                        <RotateCcwIcon className="h-4 w-4 text-emerald-500" />
                                    ) : (
                                        <RepeatIcon className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                    )}
                                </div>
                                <div>
                                        <span className="block text-[16px] font-bold text-gray-700 dark:text-gray-200">
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
                                        <PenSquareIcon className="h-4 w-4 text-gray-500 dark:text-gray-300" />
                                    </div>
                                    <div>
                                        <span className="block text-[16px] font-bold text-gray-700 dark:text-gray-200">
                                            인용 응원
                                        </span>
                                    </div>
                                </button>
                            ) : null}
                        </>
                    ) : (
                        <div className="px-3.5 py-2.5 text-center text-[16px] text-gray-400">
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
                <BookmarkIcon className={cn('h-8 w-8 flex-shrink-0', interactionBookmarked && 'fill-current')} />
                <span className="whitespace-nowrap text-[16px] font-bold leading-none sm:text-[16px]">
                    {interactionBookmarkCount.toLocaleString()}
                </span>
            </button>
        </div>
    );
}
