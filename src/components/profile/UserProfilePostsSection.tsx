import { lazy, Suspense } from 'react';
import type { CheerPost } from '../../api/cheerApi';
import EndOfFeed from '../EndOfFeed';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { PenSquareIcon, SpinnerIcon, XCircleIcon } from '../icons/PublicShellIcons';

const CheerCard = lazy(() => import('../CheerCard'));

interface UserProfilePostsSectionProps {
    primaryColor: string;
    uniquePosts: CheerPost[];
    isPostsLoading: boolean;
    isPostsError: boolean;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    onRetryPosts: () => void;
}

export default function UserProfilePostsSection({
    primaryColor,
    uniquePosts,
    isPostsLoading,
    isPostsError,
    hasNextPage,
    isFetchingNextPage,
    onRetryPosts,
}: UserProfilePostsSectionProps) {
    if (isPostsLoading) {
        return (
            <div className="flex justify-center py-8 sm:py-10">
                <SpinnerIcon className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
            </div>
        );
    }

    if (isPostsError) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 py-8 text-center dark:border-border dark:bg-card/50 sm:py-10">
                <XCircleIcon className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <p className="mb-4 text-gray-600 dark:text-white">
                    게시글을 불러오지 못했습니다.
                </p>
                <Button variant="outline" onClick={onRetryPosts}>
                    다시 시도
                </Button>
            </div>
        );
    }

    if (uniquePosts.length === 0) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center dark:border-border dark:bg-card/50 sm:py-14">
                <PenSquareIcon className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-white" />
                <p className="text-gray-400 dark:text-white">
                    아직 작성한 게시글이 없습니다.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <Suspense
                fallback={
                    <div className="space-y-4">
                        {[0, 1].map((index) => (
                            <div
                                key={index}
                                className="rounded-xl border border-gray-200 bg-white p-4 dark:border-border dark:bg-card"
                            >
                                <div className="mb-4 flex items-center gap-3">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-24" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                </div>
                                <Skeleton className="mb-2 h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ))}
                    </div>
                }
            >
                <>
                    {uniquePosts.map((post) => (
                        <CheerCard key={post.id} post={post} />
                    ))}
                </>
            </Suspense>
            {isFetchingNextPage ? (
                <div className="flex justify-center py-4">
                    <SpinnerIcon
                        className="h-6 w-6 animate-spin"
                        style={{ color: primaryColor }}
                    />
                </div>
            ) : null}
            {!hasNextPage ? <EndOfFeed /> : null}
        </div>
    );
}
