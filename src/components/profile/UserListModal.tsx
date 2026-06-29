import { lazy, Suspense, useEffect, useId, useMemo, type UIEvent } from 'react';
import { createPortal } from 'react-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getMyFollowers, getMyFollowing } from '../../api/followApi';
import { getPublicFollowers, getPublicFollowing } from '../../api/followPublic';
import { useAuthProfileSnapshot } from '../../store/authStore';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Button } from '../ui/button';
import {
    ProfileAlertCircleIcon,
    ProfileCloseIcon,
    ProfileLoaderIcon,
    ProfileUserIcon,
} from './ProfileIcons';

const FollowButton = lazy(() => import('./FollowButton'));

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    userHandle: string;
    type: 'followers' | 'following';
    title: string;
    useCurrentUser?: boolean;
}

export default function UserListModal({ isOpen, onClose, userHandle, type, title, useCurrentUser = false }: UserListModalProps) {
    const navigate = useNavigate();
    const { userHandle: currentUserHandle } = useAuthProfileSnapshot();
    const titleId = useId();

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch,
    } = useInfiniteQuery({
        queryKey: ['userList', useCurrentUser ? 'me' : userHandle, type],
        queryFn: ({ pageParam = 0 }) => {
            if (useCurrentUser) {
                if (type === 'followers') {
                    return getMyFollowers(pageParam);
                }

                return getMyFollowing(pageParam);
            }

            if (type === 'followers') {
                return getPublicFollowers(userHandle, pageParam);
            }

            return getPublicFollowing(userHandle, pageParam);
        },
        getNextPageParam: (lastPage) => (lastPage.last ? undefined : lastPage.number + 1),
        initialPageParam: 0,
        enabled: isOpen && (useCurrentUser || !!userHandle),
        retry: false,
    });

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const handleScroll = (event: UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = event.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight * 1.5 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    const users = useMemo(
        () => data?.pages.flatMap((page) => page.content) || [],
        [data],
    );

    const handleUserClick = (handle: string) => {
        onClose();
        navigate(`/profile/${handle}`);
    };

    if (!isOpen || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <div className="fixed inset-0 z-[80]">
            <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onClose} />
            <div className="absolute inset-0 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    onClick={(event) => event.stopPropagation()}
                    className="flex max-h-[80vh] w-full flex-col gap-0 rounded-xl border border-gray-200 bg-white p-0 shadow-dialog ring-1 ring-black/5 dark:border-border dark:bg-card sm:max-w-md"
                >
                    <div className="flex items-center justify-between border-b border-gray-100 p-4 dark:border-border">
                        <h2 id={titleId} className="text-lg font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 min-h-11 p-0 text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                        >
                            <ProfileCloseIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="custom-scrollbar flex-1 overflow-y-auto p-0" onScroll={handleScroll}>
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <ProfileLoaderIcon className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : isError ? (
                            <div className="flex flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
                                <ProfileAlertCircleIcon className="mb-3 h-8 w-8 text-red-500" />
                                <p className="mb-3 font-semibold text-gray-900 dark:text-white">
                                    목록을 불러오지 못했습니다.
                                </p>
                                <Button variant="outline" onClick={() => refetch()}>
                                    다시 시도
                                </Button>
                            </div>
                        ) : users.length > 0 ? (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {users.map((user) => (
                                    <div
                                        key={user.handle}
                                        className="flex items-center justify-between p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/30"
                                    >
                                        <div
                                            className="mr-4 flex min-w-0 flex-1 cursor-pointer items-center gap-3"
                                            onClick={() => handleUserClick(user.handle)}
                                        >
                                            <ProfileAvatar
                                                src={user.profileImageUrl ?? undefined}
                                                alt={user.name}
                                                fallbackName={user.name}
                                                width={40}
                                                height={40}
                                                showRing
                                                ringClassName="p-0.5 bg-gray-200/70 dark:bg-white/10"
                                            />
                                            <div className="flex flex-col truncate">
                                                <span className="truncate text-body font-bold text-gray-900 dark:text-white">
                                                    {user.name}
                                                </span>
                                                <span className="truncate text-body text-gray-500 dark:text-white">
                                                    {user.handle}
                                                </span>
                                            </div>
                                        </div>

                                        {currentUserHandle !== user.handle && (
                                            <Suspense
                                                fallback={
                                                    <div className="h-8 w-[72px] shrink-0 rounded-md border border-gray-200 bg-gray-50 dark:border-border dark:bg-secondary/50" />
                                                }
                                            >
                                                <FollowButton
                                                    handle={user.handle}
                                                    initialFollowing={user.isFollowedByMe}
                                                    size="sm"
                                                    showNotifyOption={false}
                                                    className="shrink-0"
                                                />
                                            </Suspense>
                                        )}
                                    </div>
                                ))}

                                {isFetchingNextPage && (
                                    <div className="flex justify-center p-4">
                                        <ProfileLoaderIcon className="h-6 w-6 animate-spin text-gray-400" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center px-4 py-8 text-center sm:py-10">
                                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-card">
                                    <ProfileUserIcon className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="mb-1 font-semibold text-gray-900 dark:text-white">
                                    {type === 'followers' ? '아직 팔로워가 없습니다.' : '아직 팔로잉하는 유저가 없습니다.'}
                                </p>
                                <p className="text-body text-gray-500 dark:text-white">
                                    {type === 'followers'
                                        ? '게시글을 작성하고 소통하여 팔로워를 늘려보세요!'
                                        : '관심 있는 유저를 찾아보세요!'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
