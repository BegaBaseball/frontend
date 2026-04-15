import { lazy, Suspense, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPublicFollowCounts, type FollowCountResponse, type FollowToggleResponse } from '../../api/followPublic';
import { fetchPublicUserProfileByHandle } from '../../api/profilePublic';
import type { PublicUserProfile } from '../../types/profile';
import { getTeamKoreanName } from '../../utils/teamNames';
import { useAuthStore } from '../../store/authStore';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Button } from '../ui/plain-button';
import {
    ProfileCloseIcon,
    ProfileLoaderIcon,
    ProfileQuoteIcon,
    ProfileTrophyIcon,
    ProfileUsersIcon,
} from './ProfileIcons';

const FollowButton = lazy(() => import('./FollowButton'));
const BlockButton = lazy(() => import('./BlockButton'));

interface UserProfileModalProps {
    handle: string | null;
    isOpen: boolean;
    onClose: () => void;
}

const TECHNICAL_ERROR_PATTERNS = [
    /request failed with status code \d+/i,
    /^network error$/i,
    /^api error:/i,
    /timeout of \d+ms exceeded/i,
    /failed to fetch/i,
];

const resolveProfileModalErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === 'object' && error !== null) {
        const response = 'response' in error
            ? (error as { response?: { data?: { message?: string; error?: string } | null } }).response
            : null;
        const serverMessage = typeof response?.data?.message === 'string'
            ? response.data.message.trim()
            : typeof response?.data?.error === 'string'
                ? response.data.error.trim()
                : '';

        if (serverMessage && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(serverMessage))) {
            return serverMessage;
        }
    }

    if (error instanceof Error) {
        const message = error.message.trim();
        if (message && !TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
            return message;
        }
    }

    return fallback;
};

export default function UserProfileModal({ handle, isOpen, onClose }: UserProfileModalProps) {
    const currentUserHandle = useAuthStore((state) => state.user?.handle);
    const [profile, setProfile] = useState<PublicUserProfile | null>(null);
    const [followCounts, setFollowCounts] = useState<FollowCountResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const titleId = useId();

    useEffect(() => {
        if (isOpen && handle) {
            loadProfileByHandle(handle);
            loadFollowCountsByHandle(handle);
            return;
        }

        setProfile(null);
        setFollowCounts(null);
        setError(null);
        setIsLoading(false);
    }, [handle, isOpen]);

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

    const loadProfileByHandle = async (profileHandle: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchPublicUserProfileByHandle(profileHandle);
            setProfile(data);
        } catch (err: unknown) {
            console.error('Failed to load public user profile:', err);
            setError(resolveProfileModalErrorMessage(err, '프로필을 불러오는데 실패했습니다.'));
        } finally {
            setIsLoading(false);
        }
    };

    const loadFollowCountsByHandle = async (profileHandle: string) => {
        try {
            const data = await getPublicFollowCounts(profileHandle);
            setFollowCounts(data);
        } catch (err) {
            console.error('Failed to load follow counts:', err);
        }
    };

    const handleFollowChange = (response: FollowToggleResponse) => {
        setFollowCounts((prev) => prev ? {
            ...prev,
            followerCount: response.followerCount,
            followingCount: response.followingCount,
            isFollowedByMe: response.following,
            notifyNewPosts: response.notifyNewPosts,
        } : null);
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
                    className="w-full rounded-xl border bg-white shadow-[0_28px_80px_-30px_rgba(15,23,42,0.40)] ring-1 ring-black/5 dark:border-border dark:bg-card sm:max-w-md"
                >
                    <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-border">
                        <h2 id={titleId} className="text-xl font-bold dark:text-white">
                            사용자 프로필
                        </h2>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 p-0 text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                        >
                            <ProfileCloseIcon className="h-5 w-5" />
                        </Button>
                    </div>

                    <div className="flex flex-col items-center justify-center space-y-6 p-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center py-8">
                                <ProfileLoaderIcon className="h-8 w-8 animate-spin text-primary" />
                                <p className="mt-2 text-[16px] text-gray-500">프로필 불러오는 중...</p>
                            </div>
                        ) : error ? (
                            <div className="py-8 text-center text-red-500">
                                <p>{error}</p>
                            </div>
                        ) : profile ? (
                            <>
                                <div className="relative">
                                    <ProfileAvatar
                                        src={profile.profileImageUrl ?? undefined}
                                        alt={profile.name}
                                        fallbackName={profile.name}
                                        width={96}
                                        height={96}
                                        showRing
                                        ringClassName="bg-white/95 p-1 shadow-lg dark:bg-border"
                                    />
                                </div>

                                <div className="space-y-2 text-center">
                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.name}</h3>
                                    {profile.favoriteTeam ? (
                                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-[16px] text-gray-700 dark:bg-secondary dark:text-gray-200">
                                            <ProfileTrophyIcon className="mr-1 h-3 w-3 text-primary" />
                                            {getTeamKoreanName(profile.favoriteTeam)}
                                        </span>
                                    ) : (
                                        <span className="text-[16px] text-gray-500">응원팀 없음</span>
                                    )}
                                </div>

                                {followCounts && (
                                    <div className="flex items-center justify-center gap-6 text-[16px]">
                                        <div className="flex items-center gap-1">
                                            <ProfileUsersIcon className="h-4 w-4 text-gray-400" />
                                            <span className="font-semibold text-gray-900 dark:text-white">{followCounts.followerCount}</span>
                                            <span className="text-gray-500">팔로워</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="font-semibold text-gray-900 dark:text-white">{followCounts.followingCount}</span>
                                            <span className="text-gray-500">팔로잉</span>
                                        </div>
                                    </div>
                                )}

                                {currentUserHandle && profile.handle && currentUserHandle !== profile.handle && (
                                    <Suspense
                                        fallback={
                                            <div className="flex items-center gap-2">
                                                <div className="h-9 w-24 rounded-md border border-gray-200 bg-gray-50 dark:border-border dark:bg-secondary/50" />
                                                <div className="h-9 w-20 rounded-md border border-gray-200 bg-gray-50 dark:border-border dark:bg-secondary/50" />
                                            </div>
                                        }
                                    >
                                        <div className="flex items-center gap-2">
                                            <FollowButton
                                                handle={profile.handle}
                                                initialFollowing={followCounts?.isFollowedByMe ?? false}
                                                initialNotify={followCounts?.notifyNewPosts ?? false}
                                                initialBlocked={followCounts?.blockedByMe ?? false}
                                                initialBlocking={followCounts?.blockingMe ?? false}
                                                onFollowChange={handleFollowChange}
                                            />
                                            <BlockButton
                                                handle={profile.handle}
                                                userName={profile.name}
                                                initialBlocked={followCounts?.blockedByMe ?? false}
                                                size="sm"
                                            />
                                        </div>
                                    </Suspense>
                                )}

                                <div className="relative mt-4 w-full rounded-xl bg-gray-50 p-5 dark:bg-secondary/70">
                                    <ProfileQuoteIcon className="absolute left-4 top-4 h-4 w-4 text-gray-300 dark:text-gray-300" />
                                    <div className="px-4 text-center">
                                        {profile.bio ? (
                                            <p className="whitespace-pre-wrap leading-relaxed text-gray-600 dark:text-gray-300">
                                                {profile.bio}
                                            </p>
                                        ) : (
                                            <p className="text-[16px] italic text-gray-400">
                                                아직 자기소개가 없습니다.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
