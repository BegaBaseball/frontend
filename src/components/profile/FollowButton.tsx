import { useState, useCallback } from 'react';
import { Button } from '../ui/button';
import { Bell, BellOff, UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { toggleFollow, updateFollowNotify, FollowToggleResponse } from '../../api/followApi';
import { useAuthStore } from '../../store/authStore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';

interface FollowButtonProps {
    userId: number;
    initialFollowing?: boolean;
    initialNotify?: boolean;
    initialBlocked?: boolean;
    initialBlocking?: boolean;
    onFollowChange?: (response: FollowToggleResponse) => void;
    size?: 'sm' | 'default' | 'lg';
    showNotifyOption?: boolean;
    className?: string; // Added
    style?: React.CSSProperties; // Added
}

export default function FollowButton({
    userId,
    initialFollowing = false,
    initialNotify = false,
    initialBlocked = false,
    initialBlocking = false,
    onFollowChange,
    size = 'default',
    showNotifyOption = true,
    className,
    style,
}: FollowButtonProps) {
    const { user } = useAuthStore();
    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [notifyNewPosts, setNotifyNewPosts] = useState(initialNotify);
    const [isLoading, setIsLoading] = useState(false);

    // Don't show follow button for own profile or if blocked
    if (user && userId && Number(user.id) === Number(userId)) {
        return null;
    }

    if (initialBlocked || initialBlocking) {
        return null; // 차단 관계가 있으면 팔로우 버튼 숨김
    }

    const handleToggleFollow = useCallback(async () => {
        if (isLoading) return;

        setIsLoading(true);
        try {
            const response = await toggleFollow(userId);
            setIsFollowing(response.following);
            setNotifyNewPosts(response.notifyNewPosts);
            onFollowChange?.(response);
        } catch (error) {
            console.error('Failed to toggle follow:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, isLoading, onFollowChange]);

    const handleToggleNotify = useCallback(async () => {
        if (isLoading || !isFollowing) return;

        setIsLoading(true);
        try {
            const response = await updateFollowNotify(userId, !notifyNewPosts);
            setNotifyNewPosts(response.notifyNewPosts);
            onFollowChange?.(response);
        } catch (error) {
            console.error('Failed to toggle notify:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId, isLoading, isFollowing, notifyNewPosts, onFollowChange]);

    const buttonSize = size === 'sm' ? 'h-8 px-3 text-xs' : size === 'lg' ? 'h-11 px-6' : 'h-9 px-4';

    if (!isFollowing) {
        return (
            <Button
                onClick={handleToggleFollow}
                disabled={isLoading}
                className={`${buttonSize} bg-[#2d5f4f] hover:bg-[#234a3d] text-white ${className || ''}`}
                style={style}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        팔로우
                    </>
                )}
            </Button>
        );
    }

    // Following state - show dropdown with options
    if (showNotifyOption) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={isLoading}
                        className={`${buttonSize} border-[#2d5f4f] text-[#2d5f4f] hover:bg-[#2d5f4f]/10`}
                    >
                        {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <UserMinus className="h-4 w-4 mr-1" />
                                팔로잉
                            </>
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleToggleNotify} className="cursor-pointer">
                        {notifyNewPosts ? (
                            <>
                                <BellOff className="h-4 w-4 mr-2" />
                                알림 끄기
                            </>
                        ) : (
                            <>
                                <Bell className="h-4 w-4 mr-2" />
                                새 글 알림 받기
                            </>
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={handleToggleFollow}
                        className="cursor-pointer text-red-600 focus:text-red-600"
                    >
                        <UserMinus className="h-4 w-4 mr-2" />
                        언팔로우
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    // Simple unfollow button without dropdown
    return (
        <Button
            onClick={handleToggleFollow}
            variant="outline"
            disabled={isLoading}
            className={`${buttonSize} border-[#2d5f4f] text-[#2d5f4f] hover:bg-[#2d5f4f]/10`}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <>
                    <UserMinus className="h-4 w-4 mr-1" />
                    팔로잉
                </>
            )}
        </Button>
    );
}
