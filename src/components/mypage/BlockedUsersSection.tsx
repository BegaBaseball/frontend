import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getBlockedUsers } from '../../api/blockApi';
import { Loader2, Ban, User } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import BlockButton from '../profile/BlockButton';

export default function BlockedUsersSection() {
    const queryClient = useQueryClient();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['blockedUsers'],
        queryFn: ({ pageParam = 0 }) => getBlockedUsers(pageParam),
        getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
        initialPageParam: 0,
    });

    const users = data?.pages.flatMap((page) => page.content) || [];

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const handleBlockChange = () => {
        queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-gray-700 p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
                <Ban className="w-6 h-6 text-red-500" />
                <h2 className="text-xl font-bold text-red-500">차단 관리</h2>
            </div>

            <div className="mb-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    차단한 사용자는 내 게시글을 볼 수 없으며, 나에게 메시지를 보낼 수 없습니다.
                </p>
            </div>

            <div
                className="max-h-[400px] overflow-y-auto custom-scrollbar border border-gray-200 dark:border-gray-700 rounded-lg"
                onScroll={handleScroll}
            >
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                    </div>
                ) : users.length > 0 ? (
                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <div
                                    className="flex items-center gap-3 flex-1 min-w-0 mr-4"
                                >
                                    <Avatar className="h-10 w-10 border border-gray-200 dark:border-gray-700">
                                        <AvatarImage src={user.profileImageUrl || ''} />
                                        <AvatarFallback className="bg-gray-100 text-gray-400">
                                            <User className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col truncate">
                                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                            {user.name}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {user.handle}
                                        </span>
                                    </div>
                                </div>

                                <BlockButton
                                    userId={user.id}
                                    userName={user.name}
                                    initialBlocked={true}
                                    size="sm"
                                    variant="destructive"
                                    onBlockChange={handleBlockChange}
                                />
                            </div>
                        ))}

                        {isFetchingNextPage && (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                            <Ban className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                            차단한 사용자가 없습니다.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
