import { useQuery } from '@tanstack/react-query';
import { BarChart3, Coins, Edit, Ticket, UserPlus, Users } from 'lucide-react';

import { getMyFollowCounts } from '../../api/followApi';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import TeamLogo from '../TeamLogo';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { Skeleton } from '../ui/skeleton';

type MyPageProfileCardRuntimeProps = {
  isProfileLoading: boolean;
  currentUserId: number | null;
  profileImage: string | null;
  name: string;
  handle: string;
  email: string;
  savedFavoriteTeam: string;
  cheerPoints: number;
  isStatsView: boolean;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
  onOpenMateHistory: () => void;
  onToggleStats: () => void;
  onOpenTicketUploadModal: () => void;
  onOpenEditProfile: () => void;
};

const formatCount = (count: number): string => {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return count.toString();
};

export default function MyPageProfileCardRuntime({
  isProfileLoading,
  currentUserId,
  profileImage,
  name,
  handle,
  email,
  savedFavoriteTeam,
  cheerPoints,
  isStatsView,
  onOpenFollowers,
  onOpenFollowing,
  onOpenMateHistory,
  onToggleStats,
  onOpenTicketUploadModal,
  onOpenEditProfile,
}: MyPageProfileCardRuntimeProps) {
  const isDesktop = useMediaQuery('(min-width: 966px)');

  const { data: followCounts } = useQuery({
    queryKey: ['followCounts', 'me', currentUserId ?? 0],
    queryFn: () => getMyFollowCounts(),
    enabled: Boolean(currentUserId),
    retry: false,
  });

  const normalizedHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : '';

  return (
    <Card className="p-2.5 md:p-4 mb-5 gap-2 dark:bg-card dark:border-border">
      {isProfileLoading ? (
        <div className={`${isDesktop ? 'flex items-start justify-between' : 'space-y-4'}`}>
          <div className="flex items-center gap-3 md:gap-4">
            <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full flex-shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-7 w-36" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <div className={`flex items-center gap-4 ${isDesktop ? 'mr-auto ml-12' : 'mt-3'}`}>
            <div className="text-center space-y-1">
              <Skeleton className="h-6 w-10 mx-auto" />
              <Skeleton className="h-4 w-14 mx-auto" />
            </div>
            <div className="h-8 w-px bg-gray-200 dark:bg-border" />
            <div className="text-center space-y-1">
              <Skeleton className="h-6 w-10 mx-auto" />
              <Skeleton className="h-4 w-14 mx-auto" />
            </div>
          </div>
          <div className={`${isDesktop ? 'flex items-center gap-2' : 'grid grid-cols-2 gap-2'}`}>
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
      ) : isDesktop ? (
        <div className="grid gap-3">
          <div className="grid w-full grid-cols-[minmax(0,_1fr)_auto] items-start gap-4">
            <div className="flex items-end gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <ProfileAvatar
                  src={profileImage}
                  alt={name}
                  fallbackName={name}
                  className="w-20 h-20 md:w-24 md:h-24"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-1">
                  <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-primary-light">
                    {name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {savedFavoriteTeam !== '없음' && (
                      <div className="w-5 h-5 md:w-6 md:h-6" data-testid="mypage-favorite-team-logo">
                        <TeamLogo team={savedFavoriteTeam} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[16px] md:text-[16px] font-semibold text-gray-600 dark:text-gray-300 mb-0.5">
                    {normalizedHandle}
                </p>
                <p className="text-[16px] md:text-[16px] font-semibold text-gray-500 dark:text-gray-300 mb-1">{email}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-[16px] font-semibold text-yellow-700 dark:text-yellow-400">
                    <Coins className="w-3.5 h-3.5 fill-yellow-500 text-yellow-600 dark:text-yellow-400" />
                    {cheerPoints.toLocaleString()} P
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-nowrap items-center justify-start gap-2.5 row-start-2">
              <button
                type="button"
                className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
                onClick={onOpenFollowers}
              >
                <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                  {formatCount(followCounts?.followerCount || 0)}
                </span>
                <span className="text-[16px] font-semibold text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                  <Users className="w-3.5 h-3.5" />
                  팔로워
                </span>
              </button>
              <div className="h-8 w-px bg-gray-200 dark:bg-border mx-1.5" />
              <button
                type="button"
                className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
                onClick={onOpenFollowing}
              >
                <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                  {formatCount(followCounts?.followingCount || 0)}
                </span>
                <span className="text-[16px] font-semibold text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                  <UserPlus className="w-3.5 h-3.5" />
                  팔로잉
                </span>
              </button>
            </div>
            <div className="col-start-2 row-start-2 flex flex-nowrap items-center justify-end justify-self-end gap-1.5">
              <Button
                onClick={onOpenMateHistory}
                className="h-9 px-2.5 gap-1 text-[16px] font-semibold flex items-center justify-center whitespace-nowrap bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary"
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>메이트 내역</span>
              </Button>
              <Button
                onClick={onToggleStats}
                data-testid="mypage-toggle-stats"
                className="h-9 px-2.5 gap-1 text-[16px] font-semibold flex items-center justify-center whitespace-nowrap bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary w-32"
              >
                <BarChart3 className="w-4 h-4 flex-shrink-0" />
                <span>{isStatsView ? '다이어리 보기' : '통계 보기'}</span>
              </Button>
              <Button
                onClick={onOpenTicketUploadModal}
                className="h-9 px-2.5 gap-1 text-[16px] font-semibold flex items-center justify-center whitespace-nowrap bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary"
              >
                <Ticket className="w-4 h-4 flex-shrink-0" />
                <span>티켓 등록</span>
              </Button>
              <Button
                onClick={onOpenEditProfile}
                className="h-9 px-2.5 gap-1 text-[16px] font-semibold flex items-center justify-center whitespace-nowrap text-white bg-primary-dark hover:bg-primary"
              >
                <Edit className="w-4 h-4 flex-shrink-0" />
                <span>내 정보 수정</span>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="relative flex-shrink-0">
                <ProfileAvatar
                  src={profileImage}
                  alt={name}
                  fallbackName={name}
                  className="w-20 h-20 md:w-24 md:h-24"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 md:gap-3 mb-1">
                  <h2 className="text-xl md:text-2xl font-bold text-primary dark:text-primary-light">
                    {name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {savedFavoriteTeam !== '없음' && (
                      <div className="w-5 h-5 md:w-6 md:h-6" data-testid="mypage-favorite-team-logo">
                        <TeamLogo team={savedFavoriteTeam} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[16px] md:text-[16px] font-semibold text-gray-600 dark:text-gray-300 mb-0.5">
                    {normalizedHandle}
                </p>
                <p className="text-[16px] md:text-[16px] font-semibold text-gray-500 dark:text-gray-300 mb-1">{email}</p>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 text-[16px] font-semibold text-yellow-700 dark:text-yellow-400">
                    <Coins className="w-3.5 h-3.5 fill-yellow-500 text-yellow-600 dark:text-yellow-400" />
                    {cheerPoints.toLocaleString()} P
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3 justify-start">
            <button
              type="button"
              className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
              onClick={onOpenFollowers}
            >
              <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                {formatCount(followCounts?.followerCount || 0)}
              </span>
              <span className="text-[16px] font-semibold text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                <Users className="w-3.5 h-3.5" />
                팔로워
              </span>
            </button>
            <div className="h-8 w-px bg-gray-200 dark:bg-border" />
            <button
              type="button"
              className="text-center group cursor-pointer whitespace-nowrap flex-shrink-0"
              onClick={onOpenFollowing}
            >
              <span className="font-bold text-lg text-gray-900 dark:text-white block group-hover:text-primary transition-colors">
                {formatCount(followCounts?.followingCount || 0)}
              </span>
              <span className="text-[16px] font-semibold text-gray-500 dark:text-gray-300 flex items-center gap-1 whitespace-nowrap group-hover:text-primary transition-colors">
                <UserPlus className="w-3.5 h-3.5" />
                팔로잉
              </span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={onOpenMateHistory}
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 px-3 whitespace-nowrap text-[16px] font-semibold"
            >
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="text-[16px] md:text-[16px] font-semibold">메이트 내역</span>
            </Button>
            <Button
              onClick={onToggleStats}
              data-testid="mypage-toggle-stats"
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 px-3 whitespace-nowrap text-[16px] font-semibold"
            >
              <BarChart3 className="w-4 h-4 flex-shrink-0" />
              <span className="text-[16px] md:text-[16px] font-semibold">{isStatsView ? '다이어리 보기' : '통계 보기'}</span>
            </Button>
            <Button
              onClick={onOpenEditProfile}
              className="flex items-center justify-center gap-1.5 text-white bg-primary-dark hover:bg-primary h-10 px-3 whitespace-nowrap col-span-2 text-[16px]"
            >
              <Edit className="w-4 h-4 flex-shrink-0" />
              <span className="text-[16px] md:text-[16px] font-semibold">내 정보 수정</span>
            </Button>
            <Button
              onClick={onOpenTicketUploadModal}
              className="flex items-center justify-center gap-1.5 bg-white dark:bg-card border-2 border-primary dark:border-primary-light text-primary dark:text-primary-light hover:bg-gray-50 dark:hover:bg-secondary h-10 px-3 whitespace-nowrap col-span-2 text-[16px] font-semibold"
            >
              <Ticket className="w-4 h-4 flex-shrink-0" />
              <span className="text-[16px] md:text-[16px] font-semibold">티켓 등록</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
