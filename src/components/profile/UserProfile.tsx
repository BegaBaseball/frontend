import { useParams } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchPublicUserProfileByHandle } from '../../api/profile';
import { fetchUserPostsByHandle } from '../../api/cheerApi';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Loader2, User, Trophy, Quote, ArrowLeft } from 'lucide-react';
import { getTeamKoreanName } from '../../utils/teamNames';
import CheerCard from '../CheerCard';
import EndOfFeed from '../EndOfFeed';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function UserProfile() {
    const { handle } = useParams<{ handle: string }>();
    const navigate = useNavigate();

    // URL에 @가 없는 경우 붙여줌 (UX)
    const normalizedHandle = handle?.startsWith('@') ? handle : `@${handle}`;

    const { data: profile, isLoading: isProfileLoading, error: profileError } = useQuery({
        queryKey: ['publicProfile', normalizedHandle],
        queryFn: () => fetchPublicUserProfileByHandle(normalizedHandle),
        enabled: !!normalizedHandle,
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
        enabled: !!normalizedHandle,
        initialPageParam: 0,
    });

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
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">사용자를 찾을 수 없습니다.</h2>
                <p className="text-gray-500 text-center mb-6">존재하지 않거나 삭제된 사용자일 수 있습니다.</p>
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

    const allPosts = postsData?.pages.flatMap((page) => page.content) || [];

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            {/* Header / Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
            >
                <ArrowLeft className="w-5 h-5 mr-1" />
                <span>뒤로</span>
            </button>

            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8">
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                        <Avatar className="w-28 h-28 border-4 border-white dark:border-gray-700 shadow-xl">
                            <AvatarImage src={profile.profileImageUrl || ''} className="object-cover" />
                            <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-400">
                                <User className="w-14 h-14" />
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="text-center space-y-3">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                                {profile.name}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                {profile.handle}
                            </p>
                            <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full w-fit mx-auto mt-1 border border-amber-100 dark:border-amber-800">
                                <Trophy className="w-3.5 h-3.5 fill-amber-500" />
                                <span>{profile.cheerPoints?.toLocaleString() || 0} P</span>
                            </div>
                        </div>

                        {profile.favoriteTeam ? (
                            <Badge variant="secondary" className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                <Trophy className="w-4 h-4 mr-2 text-[#2d5f4f]" />
                                {getTeamKoreanName(profile.favoriteTeam)}
                            </Badge>
                        ) : (
                            <span className="text-sm text-gray-500">응원팀 없음</span>
                        )}
                    </div>

                    {/* Bio */}
                    <div className="w-full bg-gray-50 dark:bg-gray-700/30 rounded-2xl p-6 relative max-w-lg">
                        <Quote className="absolute top-4 left-4 w-5 h-5 text-gray-200 dark:text-gray-600" />
                        <div className="px-4 text-center">
                            {profile.bio ? (
                                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                    {profile.bio}
                                </p>
                            ) : (
                                <p className="text-gray-400 italic text-sm">
                                    아직 자기소개가 없습니다.
                                </p>
                            )}
                        </div>
                    </div>
                </div>


                {/* Posts Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">작성한 게시글</h2>
                        <span className="text-sm text-gray-500">{postsData?.pages[0]?.totalElements || 0}개의 글</span>
                    </div>

                    {isPostsLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-[#2d5f4f]" />
                        </div>
                    ) : allPosts.length > 0 ? (
                        <div className="space-y-4">
                            {allPosts.map((post) => (
                                <CheerCard key={post.id} post={post} />
                            ))}
                            {isFetchingNextPage && (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-[#2d5f4f]" />
                                </div>
                            )}
                            {!hasNextPage && allPosts.length > 0 && <EndOfFeed />}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <p className="text-gray-400">아직 작성한 게시글이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div >
        </div>
    );
}

// Missing component placeholder - you need to import or create it
function AlertCircle({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    );
}
