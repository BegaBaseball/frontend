import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Loader2, User, Trophy, Quote, Users } from 'lucide-react';
import { PublicUserProfile } from '../../types/profile';
import { fetchPublicUserProfile } from '../../api/profile';
import { getTeamKoreanName } from '../../utils/teamNames';
import { getFollowCounts, FollowCountResponse } from '../../api/followApi';
import FollowButton from './FollowButton';
import BlockButton from './BlockButton';
import { useAuthStore } from '../../store/authStore';

interface UserProfileModalProps {
    userId: number | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
    const { user: currentUser } = useAuthStore();
    const [profile, setProfile] = useState<PublicUserProfile | null>(null);
    const [followCounts, setFollowCounts] = useState<FollowCountResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            loadProfile(userId);
            loadFollowCounts(userId);
        } else {
            setProfile(null);
            setFollowCounts(null);
            setError(null);
        }
    }, [isOpen, userId]);

    const loadProfile = async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchPublicUserProfile(id);
            setProfile(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || '프로필을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadFollowCounts = async (id: number) => {
        try {
            const data = await getFollowCounts(id);
            setFollowCounts(data);
        } catch (err) {
            console.error('Failed to load follow counts:', err);
        }
    };

    const handleFollowChange = (response: any) => {
        setFollowCounts((prev) => prev ? {
            ...prev,
            followerCount: response.followerCount,
            followingCount: response.followingCount,
            isFollowedByMe: response.following,
            notifyNewPosts: response.notifyNewPosts,
        } : null);
    };

    const getTeamColor = (teamName: string | null) => {
        // You might want to share this logic with other components or import it
        return teamName ? '#2d5f4f' : '#888';
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-bold dark:text-white">사용자 프로필</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-[#2d5f4f]" />
                            <p className="mt-2 text-sm text-gray-500">프로필 불러오는 중...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-red-500">
                            <p>{error}</p>
                        </div>
                    ) : profile ? (
                        <>
                            {/* Profile Image */}
                            <div className="relative">
                                <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
                                    <AvatarImage src={profile.profileImageUrl || ''} className="object-cover" />
                                    <AvatarFallback className="bg-gray-100 text-gray-400">
                                        <User className="w-12 h-12" />
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            {/* Name & Team */}
                            <div className="text-center space-y-2">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.name}</h3>
                                {profile.favoriteTeam ? (
                                    <Badge variant="secondary" className="px-3 py-1 bg-gray-100 text-gray-700 hover:bg-gray-200">
                                        <Trophy className="w-3 h-3 mr-1 text-[#2d5f4f]" />
                                        {getTeamKoreanName(profile.favoriteTeam)}
                                    </Badge>
                                ) : (
                                    <span className="text-sm text-gray-500">응원팀 없음</span>
                                )}
                            </div>

                            {/* Follower/Following Counts */}
                            {followCounts && (
                                <div className="flex items-center justify-center gap-6 text-sm">
                                    <div className="flex items-center gap-1">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span className="font-semibold text-gray-900 dark:text-white">{followCounts.followerCount}</span>
                                        <span className="text-gray-500">팔로워</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-900 dark:text-white">{followCounts.followingCount}</span>
                                        <span className="text-gray-500">팔로잉</span>
                                    </div>
                                </div>
                            )}

                            {/* Follow & Block Buttons */}
                            {currentUser && userId && currentUser.id !== userId && (
                                <div className="flex items-center gap-2">
                                    <FollowButton
                                        userId={userId}
                                        initialFollowing={followCounts?.isFollowedByMe ?? false}
                                        initialNotify={followCounts?.notifyNewPosts ?? false}
                                        onFollowChange={handleFollowChange}
                                    />
                                    <BlockButton
                                        userId={userId}
                                        userName={profile.name}
                                        size="sm"
                                    />
                                </div>
                            )}

                            {/* Bio Section */}
                            <div className="w-full bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 relative mt-4">
                                <Quote className="absolute top-4 left-4 w-4 h-4 text-gray-300 dark:text-gray-500" />
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
                        </>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}
