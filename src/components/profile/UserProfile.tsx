import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { fetchPublicUserProfileByHandle } from '../../api/profilePublic';
import { fetchUserPostsByHandle } from '../../api/cheerPublic';
import { getPublicFollowCounts, type FollowCountResponse, type FollowToggleResponse } from '../../api/followPublic';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Button } from '../ui/button';
import {
    ArrowLeftIcon,
    DiamondIcon,
    MessageCircleIcon,
    PenSquareIcon,
    SpinnerIcon,
    TrophyIcon,
    UserIcon,
    UsersIcon,
    XCircleIcon,
} from '../icons/PublicShellIcons';
import { Skeleton } from '../ui/skeleton';
import { getTeamKoreanName } from '../../utils/teamNames';
import { getTeamTheme } from '../../utils/teamColors';
import { useAuthProfileSnapshot, useAuthSession } from '../../store/authStore';

const FollowButton = lazy(() => import('./FollowButton'));
const UserListModal = lazy(() => import('./UserListModal'));
const UserProfilePostsSection = lazy(() => import('./UserProfilePostsSection'));

function ProfileBadge({
    className = '',
    style,
    children,
}: {
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-body font-semibold ${className}`}
            style={style}
        >
            {children}
        </span>
    );
}

export default function UserProfile() {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isLoggedIn } = useAuthSession();
    const { userHandle: currentUserHandle } = useAuthProfileSnapshot();
    const postsSectionRef = useRef<HTMLDivElement | null>(null);

    const [userListModalType, setUserListModalType] = useState<'followers' | 'following' | null>(null);

    // URL에 @가 없는 경우 붙여줌 (UX)
    const normalizedHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : undefined;

    const {
        data: profile,
        isLoading: isProfileLoading,
        error: profileError,
    } = useQuery({
        queryKey: ['publicProfile', normalizedHandle],
        queryFn: () => fetchPublicUserProfileByHandle(normalizedHandle!),
        enabled: !!normalizedHandle,
        retry: 0,
    });

    // 팔로워/팔로잉 카운트 조회
    const { data: followCounts } = useQuery({
        queryKey: ['followCounts', profile?.handle],
        queryFn: () => getPublicFollowCounts(profile!.handle),
        enabled: !!profile?.handle,
    });

    const {
        data: postsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isPostsLoading,
        isError: isPostsError,
        refetch: refetchPosts,
    } = useInfiniteQuery({
        queryKey: ['userPosts', normalizedHandle],
        queryFn: ({ pageParam = 0 }) => fetchUserPostsByHandle(normalizedHandle!, pageParam),
        getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
        enabled: !!profile?.handle, // Only fetch posts if user exists
        initialPageParam: 0,
    });

    // 팀 테마 색상 계산
    const theme = getTeamTheme(profile?.favoriteTeam);

    const handleFollowChange = (response: FollowToggleResponse) => {
        if (!profile?.handle) return;
        queryClient.setQueryData<FollowCountResponse>(['followCounts', profile.handle], (prev) => ({
            followerCount: response.followerCount,
            followingCount: response.followingCount,
            isFollowedByMe: response.following,
            notifyNewPosts: response.notifyNewPosts,
            blockedByMe: prev?.blockedByMe ?? false,
            blockingMe: prev?.blockingMe ?? false,
        }));
    };

    // Infinite scroll handler
    useEffect(() => {
        const handleScroll = () => {
            if (
                window.innerHeight + document.documentElement.scrollTop >=
                document.documentElement.offsetHeight - 500 &&
                hasNextPage &&
                !isFetchingNextPage
            ) {
                fetchNextPage();
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    // 숫자 포맷 (1000 -> 1k)
    const formatCount = (count: number): string => {
        if (count >= 1000) {
            return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
        }
        return count.toString();
    };

    const scrollToPostsSection = () => {
        postsSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };
    const userListModalTitle = userListModalType === 'followers' ? '팔로워' : '팔로잉';

    if (isProfileLoading) {
        return (
            <div className="max-w-2xl mx-auto pb-8">
                <div className="flex items-center px-4 py-4">
                    <Skeleton className="h-5 w-16" />
                </div>
                {/* 프로필 카드 스켈레톤 */}
                <div className="bg-white dark:bg-card shadow-sm border border-gray-100 dark:border-border overflow-hidden">
                    {/* 배너 */}
                    <Skeleton className="h-[150px] w-full" />
                    {/* 아바타 */}
                    <div className="px-6 -mt-[50px] relative z-10">
                        <div className="w-20 h-20 sm:w-[100px] sm:h-[100px] rounded-full p-1 bg-white dark:bg-border shadow-sm">
                            <Skeleton className="h-full w-full rounded-full" />
                        </div>
                    </div>
                    {/* 이름 & 핸들 */}
                    <div className="px-6 pt-4 pb-6 space-y-3">
                        <Skeleton className="h-8 w-40" />
                        <Skeleton className="h-4 w-28" />
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                    </div>
                    {/* 통계 행 */}
                    <div className="flex items-center justify-around py-4 border-y border-gray-100 dark:border-border">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="text-center space-y-1">
                                <Skeleton className="h-6 w-12 mx-auto" />
                                <Skeleton className="h-4 w-14 mx-auto" />
                            </div>
                        ))}
                    </div>
                    {/* 바이오 */}
                    <div className="px-6 py-6">
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                </div>
                {/* 게시글 섹션 스켈레톤 */}
                <div className="mt-6 px-4 space-y-4">
                    <Skeleton className="h-7 w-36" />
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-xl p-4 space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-1 flex-1">
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-3 w-16" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-4/5" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (profileError || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <XCircleIcon className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    사용자를 찾을 수 없습니다.
                </h2>
                <p className="text-gray-500 text-center mb-6">
                    존재하지 않거나 삭제된 사용자일 수 있습니다.
                </p>
                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="flex items-center text-primary font-semibold hover:underline"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    뒤로 가기
                </button>
            </div>
        );
    }

    // 중복 게시글 제거
    const allPosts = postsData?.pages.flatMap((page) => page.content) || [];
    const uniquePosts = allPosts.filter(
        (post, index, self) => index === self.findIndex((p) => p.id === post.id)
    );
    const totalPosts = postsData?.pages[0]?.totalElements || 0;

    const isOwnProfile = isLoggedIn && Boolean(currentUserHandle) && profile?.handle
        ? currentUserHandle === profile.handle
        : false;
    const isBlockedRelationship = Boolean(followCounts?.blockedByMe || followCounts?.blockingMe);
    const canMessageUser = Boolean(followCounts?.isFollowedByMe && !isBlockedRelationship);
    const messagePath = profile.handle
        ? `/messages/${encodeURIComponent(profile.handle.replace(/^@/, ''))}`
        : null;
    const messageDisabledReason = !followCounts
        ? '메시지 가능 여부를 확인하고 있습니다.'
        : isBlockedRelationship
            ? '차단 관계인 사용자에게는 메시지를 보낼 수 없습니다.'
            : canMessageUser
                ? null
                : '팔로우한 사용자에게만 메시지를 보낼 수 있습니다.';

    return (
        <div className="max-w-2xl mx-auto pb-8">
            {/* Back Button */}
            <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-200 px-4 py-4 transition-colors"
            >
                <ArrowLeftIcon className="w-5 h-5 mr-1" />
                <span>뒤로</span>
            </button>

            {/* Profile Card */}
            <div className="bg-white dark:bg-card shadow-sm border border-gray-100 dark:border-border overflow-hidden">
                {/* Banner */}
                <div className="h-[150px] relative" style={{ background: theme.gradient }}>
                    {/* Optional: subtle pattern or team logo watermark */}
                </div>

                {/* Avatar - overlapping banner */}
                <div className="px-6 -mt-[50px] relative z-10">
                    <ProfileAvatar
                        src={profile.profileImageUrl ?? undefined}
                        alt={profile.name}
                        fallbackName={profile.name}
                        width={96}
                        height={96}
                        showRing
                        ringClassName="p-1 bg-white/95 dark:bg-border shadow-sm"
                        className="shadow-xl"
                    />
                </div>

                {/* Profile Info */}
                <div className="px-6 pt-4 pb-6">
                    {/* Name & Handle */}
                    <div className="mb-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {profile.name}
                        </h1>
                        <p className="text-gray-500 dark:text-white">{profile.handle}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {/* Points Badge */}
                        <ProfileBadge
                            className="px-3 py-1 border-0"
                            style={{
                                backgroundColor: theme.softBg,
                                color: theme.accent,
                            }}
                        >
                            <DiamondIcon className="w-3.5 h-3.5 mr-1" />
                            {profile.cheerPoints?.toLocaleString() || 0} P
                        </ProfileBadge>

                        {/* Team Badge */}
                        {profile.favoriteTeam && profile.favoriteTeam !== '없음' && (
                            <ProfileBadge
                                className="px-3 py-1 border-0"
                                style={{
                                    backgroundColor: theme.primary,
                                    color: theme.contrastText,
                                }}
                            >
                                <TrophyIcon className="w-3.5 h-3.5 mr-1" />
                                {getTeamKoreanName(profile.favoriteTeam)}
                            </ProfileBadge>
                        )}
                    </div>

                </div>

                {/* Statistics Row */}
                <div className="flex items-center justify-around py-4 border-y border-gray-100 dark:border-border">
                    <div className="text-center">
                        <span className="font-bold text-lg text-gray-900 dark:text-white block">
                            {formatCount(totalPosts)}
                        </span>
                        <span className="text-body text-gray-500 dark:text-white flex items-center justify-center gap-1">
                            <PenSquareIcon className="w-3.5 h-3.5" />
                            게시글
                        </span>
                    </div>
                    <button
                        type="button"
                        className="text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-colors cursor-pointer"
                        onClick={() => setUserListModalType('followers')}
                    >
                        <span className="font-bold text-lg text-gray-900 dark:text-white block">
                            {formatCount(followCounts?.followerCount || 0)}
                        </span>
                        <span className="text-body text-gray-500 dark:text-white flex items-center justify-center gap-1">
                            <UsersIcon className="w-3.5 h-3.5" />
                            팔로워
                        </span>
                    </button>
                    <button
                        type="button"
                        className="text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-colors cursor-pointer"
                        onClick={() => setUserListModalType('following')}
                    >
                        <span className="font-bold text-lg text-gray-900 dark:text-white block">
                            {formatCount(followCounts?.followingCount || 0)}
                        </span>
                        <span className="text-body text-gray-500 dark:text-white flex items-center justify-center gap-1">
                            <UserIcon className="w-3.5 h-3.5" />
                            팔로잉
                        </span>
                    </button>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && isLoggedIn && (
                    <div className="mt-4 px-6 mb-6 space-y-2">
                        <div className="flex gap-3">
                            <Suspense
                                fallback={
                                    <div className="h-10 flex-1 rounded-md border border-gray-200 bg-gray-50 dark:border-border dark:bg-secondary/50" />
                                }
                            >
                                <FollowButton
                                    handle={profile.handle}
                                    initialFollowing={followCounts?.isFollowedByMe ?? false}
                                    initialNotify={followCounts?.notifyNewPosts ?? false}
                                    initialBlocked={followCounts?.blockedByMe ?? false}
                                    initialBlocking={followCounts?.blockingMe ?? false}
                                    onFollowChange={handleFollowChange}
                                    size="default"
                                    showNotifyOption={true}
                                    className="flex-1"
                                    style={{
                                        backgroundColor: theme.primary,
                                        color: theme.contrastText,
                                    }}
                                />
                            </Suspense>
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={scrollToPostsSection}
                            >
                                <PenSquareIcon className="w-4 h-4 mr-2" />
                                작성글 보기
                            </Button>
                        </div>
                        <Button
                            variant={canMessageUser ? 'default' : 'outline'}
                            disabled={!canMessageUser}
                            onClick={() => {
                                if (canMessageUser && messagePath) {
                                    navigate(messagePath);
                                }
                            }}
                            className="w-full"
                            style={canMessageUser ? {
                                backgroundColor: theme.primary,
                                color: theme.contrastText,
                            } : undefined}
                        >
                            <MessageCircleIcon className="w-4 h-4 mr-2" />
                            메시지 보내기
                        </Button>
                        {messageDisabledReason ? (
                            <p className="text-body text-gray-500 dark:text-white flex items-center gap-1.5">
                                <MessageCircleIcon className="w-3.5 h-3.5" />
                                {messageDisabledReason}
                            </p>
                        ) : null}
                    </div>
                )}

                {/* Bio Section */}
                <div className="px-6 mb-6">
                    <div className="p-4 bg-gray-50 dark:bg-secondary/30 rounded-xl relative">
                        <span className="absolute top-2.5 left-3 text-lg leading-none text-gray-300 dark:text-white">
                            "
                        </span>
                        <div className="pl-6">
                            {profile.bio ? (
                                <p className="text-gray-600 dark:text-white whitespace-pre-wrap leading-relaxed">
                                    {profile.bio}
                                </p>
                            ) : (
                                <p className="text-gray-400 dark:text-white italic text-body">
                                    아직 자기소개가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Posts Section */}
            <div ref={postsSectionRef} className="mt-6 px-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <PenSquareIcon className="w-5 h-5" style={{ color: theme.accent }} />
                        작성한 게시글
                    </h2>
                    <span className="text-body text-gray-500 dark:text-white">
                        {totalPosts}개의 글
                    </span>
                </div>

                <Suspense fallback={null}>
                    <UserProfilePostsSection
                        primaryColor={theme.primary}
                        uniquePosts={uniquePosts}
                        isPostsLoading={isPostsLoading}
                        isPostsError={isPostsError}
                        hasNextPage={Boolean(hasNextPage)}
                        isFetchingNextPage={isFetchingNextPage}
                        onRetryPosts={() => {
                            void refetchPosts();
                        }}
                    />
                </Suspense>
            </div>

            {/* User List Modal */}
            {profile && userListModalType ? (
                <Suspense fallback={null}>
                    <UserListModal
                        isOpen
                        onClose={() => setUserListModalType(null)}
                        userHandle={profile.handle}
                        type={userListModalType}
                        title={userListModalTitle}
                    />
                </Suspense>
            ) : null}
        </div>
    );
}
