import { useInfiniteQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Loader2, User, X } from 'lucide-react';
import { getFollowers, getFollowing } from '../../api/followApi';
import FollowButton from './FollowButton';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: number;
    type: 'followers' | 'following';
    title: string;
}

export default function UserListModal({ isOpen, onClose, userId, type, title }: UserListModalProps) {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['userList', userId, type],
        queryFn: ({ pageParam = 0 }) => {
            if (type === 'followers') {
                return getFollowers(userId, pageParam);
            } else {
                return getFollowing(userId, pageParam);
            }
        },
        getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
        initialPageParam: 0,
        enabled: isOpen && !!userId,
    });

    // Infinite scroll handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const users = data?.pages.flatMap((page) => page.content) || [];

    const handleUserClick = (handle: string) => {
        onClose();
        navigate(`/profile/${handle}`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent hideCloseButton={true} className="sm:max-w-md max-h-[80vh] flex flex-col p-0 gap-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <DialogHeader className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-row items-center justify-between space-y-0">
                    <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white">
                        {title}
                    </DialogTitle>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </DialogHeader>

                <div
                    className="overflow-y-auto flex-1 p-0 custom-scrollbar"
                    onScroll={handleScroll}
                >
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#2d5f4f]" />
                        </div>
                    ) : users.length > 0 ? (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                            {users.map((user) => (
                                <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <div
                                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 mr-4"
                                        onClick={() => handleUserClick(user.handle)}
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

                                    {/* 본인이 아닐 경우에만 팔로우 버튼 표시 */}
                                    {String(currentUser?.id) !== String(user.id) && (
                                        <FollowButton
                                            userId={user.id}
                                            initialFollowing={user.isFollowedByMe}
                                            size="sm"
                                            showNotifyOption={false}
                                            className="shrink-0"
                                        />
                                    )}
                                </div>
                            ))}

                            {isFetchingNextPage && (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-3">
                                <User className="h-6 w-6 text-gray-400" />
                            </div>
                            <p className="text-gray-900 dark:text-gray-100 font-medium mb-1">
                                {type === 'followers' ? '아직 팔로워가 없습니다.' : '아직 팔로잉하는 유저가 없습니다.'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {type === 'followers'
                                    ? '게시글을 작성하고 소통하여 팔로워를 늘려보세요!'
                                    : '관심 있는 유저를 찾아보세요!'}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
