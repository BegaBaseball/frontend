import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { toast } from 'sonner';
import {
    toggleFollowByHandle,
    updateFollowNotifyByHandle,
    FollowToggleResponse,
} from '../../api/followApi';
import { useAuthProfileSnapshot } from '../../store/authStore';
import { Button } from '../ui/button';
import {
    ProfileBellIcon,
    ProfileBellOffIcon,
    ProfileLoaderIcon,
    ProfileUserMinusIcon,
    ProfileUserPlusIcon,
} from './ProfileIcons';

interface FollowButtonProps {
    handle: string;
    initialFollowing?: boolean;
    initialNotify?: boolean;
    initialBlocked?: boolean;
    initialBlocking?: boolean;
    onFollowChange?: (response: FollowToggleResponse) => void;
    size?: 'sm' | 'default' | 'lg';
    showNotifyOption?: boolean;
    className?: string;
    style?: CSSProperties;
}

export default function FollowButton({
    handle,
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
    const { userHandle: currentUserHandle } = useAuthProfileSnapshot();
    const [isFollowing, setIsFollowing] = useState(initialFollowing);
    const [notifyNewPosts, setNotifyNewPosts] = useState(initialNotify);
    const [isLoading, setIsLoading] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setIsFollowing(initialFollowing);
    }, [initialFollowing]);

    useEffect(() => {
        setNotifyNewPosts(initialNotify);
    }, [initialNotify]);

    useEffect(() => {
        if (!isMenuOpen) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isMenuOpen]);

    if (currentUserHandle && currentUserHandle === handle) {
        return null;
    }

    if (initialBlocked || initialBlocking) {
        return null;
    }

    const handleToggleFollow = useCallback(async () => {
        if (isLoading) {
            return;
        }

        setIsLoading(true);
        setIsMenuOpen(false);
        try {
            const response = await toggleFollowByHandle(handle);
            setIsFollowing(response.following);
            setNotifyNewPosts(response.notifyNewPosts);
            onFollowChange?.(response);
        } catch (error) {
            console.error('Failed to toggle follow:', error);
            toast.error('팔로우 처리에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [handle, isLoading, onFollowChange]);

    const handleToggleNotify = useCallback(async () => {
        if (isLoading || !isFollowing) {
            return;
        }

        setIsLoading(true);
        setIsMenuOpen(false);
        try {
            const response = await updateFollowNotifyByHandle(handle, !notifyNewPosts);
            setNotifyNewPosts(response.notifyNewPosts);
            onFollowChange?.(response);
        } catch (error) {
            console.error('Failed to toggle notify:', error);
            toast.error('알림 설정 변경에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    }, [handle, isLoading, isFollowing, notifyNewPosts, onFollowChange]);

    const buttonSize = size === 'sm' ? 'h-8 px-3 text-[16px]' : size === 'lg' ? 'h-11 px-6' : 'h-9 px-4';

    if (!isFollowing) {
        return (
            <Button
                onClick={handleToggleFollow}
                disabled={isLoading}
                className={`${buttonSize} bg-primary text-white hover:bg-primary-hover ${className || ''}`}
                style={style}
            >
                {isLoading ? (
                    <ProfileLoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <ProfileUserPlusIcon className="mr-1 h-4 w-4" />
                        팔로우
                    </>
                )}
            </Button>
        );
    }

    if (!showNotifyOption) {
        return (
            <Button
                onClick={handleToggleFollow}
                variant="outline"
                disabled={isLoading}
                className={`${buttonSize} border-primary text-primary hover:bg-primary/10 ${className || ''}`}
                style={style}
            >
                {isLoading ? (
                    <ProfileLoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <ProfileUserMinusIcon className="mr-1 h-4 w-4" />
                        팔로잉
                    </>
                )}
            </Button>
        );
    }

    return (
        <div ref={menuRef} className={`relative inline-flex ${className || ''}`} style={style}>
            <Button
                variant="outline"
                disabled={isLoading}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`${buttonSize} border-primary text-primary hover:bg-primary/10`}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
            >
                {isLoading ? (
                    <ProfileLoaderIcon className="h-4 w-4 animate-spin" />
                ) : (
                    <>
                        <ProfileUserMinusIcon className="mr-1 h-4 w-4" />
                        팔로잉
                    </>
                )}
            </Button>

            {isMenuOpen && (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-[90] mt-2 w-48 rounded-md border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-border dark:bg-card"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleToggleNotify}
                        className="flex w-full items-center rounded-sm px-3 py-2 text-[16px] text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-secondary"
                    >
                        {notifyNewPosts ? (
                            <>
                                <ProfileBellOffIcon className="mr-2 h-4 w-4" />
                                알림 끄기
                            </>
                        ) : (
                            <>
                                <ProfileBellIcon className="mr-2 h-4 w-4" />
                                새 글 알림 받기
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={handleToggleFollow}
                        className="flex w-full items-center rounded-sm px-3 py-2 text-[16px] text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                    >
                        <ProfileUserMinusIcon className="mr-2 h-4 w-4" />
                        언팔로우
                    </button>
                </div>
            )}
        </div>
    );
}
