import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { fetchPublicUserProfileByHandle } from '../../api/profile';
import { fetchUserPostsByHandle } from '../../api/cheerApi';
import { getFollowCounts } from '../../api/followApi';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Loader2,
    User,
    Trophy,
    Quote,
    ArrowLeft,
    AlertCircle,
    Award,
    FileText,
    Users,
    UserPlus,
    MessageCircle,
} from 'lucide-react';
import { getTeamKoreanName } from '../../utils/teamNames';
import { getTeamTheme } from '../../utils/teamColors';
import CheerCard from '../CheerCard';
import EndOfFeed from '../EndOfFeed';
import FollowButton from './FollowButton';
import { useAuthStore } from '../../store/authStore';
import UserListModal from './UserListModal';

export default function UserProfile() {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.user);

    const [userListModal, setUserListModal] = useState<{
        isOpen: boolean;
        type: 'followers' | 'following';
        title: string;
    }>({
        isOpen: false,
        type: 'followers',
        title: '',
    });

    // URL에 @가 없는 경우 붙여줌 (UX)
    const normalizedHandle = handle?.startsWith('@') ? handle : `@${handle}`;

    const {
        data: profile,
        isLoading: isProfileLoading,
        error: profileError,
    } = useQuery({
        queryKey: ['publicProfile', normalizedHandle],
        queryFn: () => fetchPublicUserProfileByHandle(normalizedHandle),
        enabled: !!normalizedHandle,
        retry: 0,
    });

    // 팔로워/팔로잉 카운트 조회
    const { data: followCounts } = useQuery({
        queryKey: ['followCounts', profile?.id],
        queryFn: () => getFollowCounts(profile!.id),
        enabled: !!profile?.id,
    });

    const {
        data: postsData,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading: isPostsLoading,
    } = useInfiniteQuery({
        queryKey: ['userPosts', normalizedHandle],
        queryFn: ({ pageParam = 0 }) => fetchUserPostsByHandle(normalizedHandle, pageParam),
        getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
        enabled: !!profile?.id, // Only fetch posts if user exists
        initialPageParam: 0,
    });

    // 팀 테마 색상 계산
    const theme = useMemo(() => getTeamTheme(profile?.favoriteTeam), [profile?.favoriteTeam]);

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

    if (isProfileLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-[#2d5f4f]" />
                <p className="mt-4 text-gray-500">프로필을 불러오는 중...</p>
            </div>
        );
    }

    if (profileError || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    사용자를 찾을 수 없습니다.
                </h2>
                <p className="text-gray-500 text-center mb-6">
                    존재하지 않거나 삭제된 사용자일 수 있습니다.
                </p>
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-[#2d5f4f] font-medium hover:underline"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
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

    const isOwnProfile = currentUser && profile && Number(currentUser.id) === Number(profile.id);

    return (
        <div className="max-w-2xl mx-auto pb-8">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-4 py-4 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span>뒤로</span>
            </button>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                {/* Banner */}
                <div className="h-[150px] relative" style={{ background: theme.gradient }}>
                    {/* Optional: subtle pattern or team logo watermark */}
                </div>

                {/* Avatar - overlapping banner */}
                <div className="px-6 -mt-[50px] relative z-10">
                    <Avatar className="w-[100px] h-[100px] border-4 border-white dark:border-gray-800 shadow-xl">
                        <AvatarImage src={profile.profileImageUrl || ''} className="object-cover" />
                        <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-400">
                            <User className="w-12 h-12" />
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Profile Info */}
                <div className="px-6 pt-4 pb-6">
                    {/* Name & Handle */}
                    <div className="mb-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {profile.name}
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">{profile.handle}</p>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {/* Points Badge */}
                        <Badge
                            className="px-3 py-1 border-0"
                            style={{
                                backgroundColor: theme.softBg,
                                color: theme.accent,
                            }}
                        >
                            <Award className="w-3.5 h-3.5 mr-1" />
                            {profile.cheerPoints?.toLocaleString() || 0} P
                        </Badge>

                        {/* Team Badge */}
                        {profile.favoriteTeam && profile.favoriteTeam !== '없음' && (
                            <Badge
                                className="px-3 py-1 border-0"
                                style={{
                                    backgroundColor: theme.primary,
                                    color: theme.contrastText,
                                }}
                            >
                                <Trophy className="w-3.5 h-3.5 mr-1" />
                                {getTeamKoreanName(profile.favoriteTeam)}
                            </Badge>
                        )}
                    </div>

                </div>

                {/* Statistics Row */}
                <div className="flex items-center justify-around py-4 border-y border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <span className="font-bold text-lg text-gray-900 dark:text-white block">
                            {formatCount(totalPosts)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            게시글
                        </span>
                    </div>
                    <button
                        className="text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-colors cursor-pointer"
                        onClick={() => setUserListModal({ isOpen: true, type: 'followers', title: '팔로워' })}
                    >
                        <span className="font-bold text-lg text-gray-900 dark:text-white block">
                            {formatCount(followCounts?.followerCount || 0)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            팔로워
                        </span>
                    </button>
                    <button
                        className="text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded-lg transition-colors cursor-pointer"
                        onClick={() => setUserListModal({ isOpen: true, type: 'following', title: '팔로잉' })}
                    >
                        <span className="font-bold text-lg text-gray-900 dark:text-white block">
                            {formatCount(followCounts?.followingCount || 0)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                            <UserPlus className="w-3.5 h-3.5" />
                            팔로잉
                        </span>
                    </button>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && currentUser && (
                    <div className="flex gap-3 mt-4 px-6 mb-6">
                        <FollowButton
                            userId={profile.id}
                            size="default"
                            showNotifyOption={true}
                            className="flex-1"
                            style={{
                                backgroundColor: theme.primary,
                                color: theme.contrastText,
                            }}
                        />
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                // TODO: 메시지 기능 구현 시 연결
                            }}
                        >
                            <MessageCircle className="w-4 h-4 mr-2" />
                            메시지
                        </Button>
                    </div>
                )}

                {/* Bio Section */}
                <div className="px-6 mb-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl relative">
                        <Quote className="absolute top-3 left-3 w-4 h-4 text-gray-300 dark:text-gray-600" />
                        <div className="pl-6">
                            {profile.bio ? (
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {profile.bio}
                                </p>
                            ) : (
                                <p className="text-gray-400 dark:text-gray-500 italic text-sm">
                                    아직 자기소개가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Posts Section */}
            <div className="mt-6 px-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5" style={{ color: theme.accent }} />
                        작성한 게시글
                    </h2>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {totalPosts}개의 글
                    </span>
                </div>

                {isPostsLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.primary }} />
                    </div>
                ) : uniquePosts.length > 0 ? (
                    <div className="space-y-4">
                        {uniquePosts.map((post) => (
                            <CheerCard key={post.id} post={post} />
                        ))}
                        {isFetchingNextPage && (
                            <div className="flex justify-center py-4">
                                <Loader2
                                    className="h-6 w-6 animate-spin"
                                    style={{ color: theme.primary }}
                                />
                            </div>
                        )}
                        {!hasNextPage && uniquePosts.length > 0 && <EndOfFeed />}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                        <p className="text-gray-400 dark:text-gray-500">
                            아직 작성한 게시글이 없습니다.
                        </p>
                    </div>
                )}
            </div>

            {/* User List Modal */}
            {profile && (
                <UserListModal
                    isOpen={userListModal.isOpen}
                    onClose={() => setUserListModal(prev => ({ ...prev, isOpen: false }))}
                    userId={profile.id}
                    type={userListModal.type}
                    title={userListModal.title}
                />
            )}
        </div>
    );
}
