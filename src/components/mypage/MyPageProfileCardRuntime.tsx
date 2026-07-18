import { useQuery } from '@tanstack/react-query';

import { getMyFollowCounts } from '../../api/followApi';
import {
  MyPageBarChartIcon,
  MyPageCoinsIcon,
  MyPageEditIcon,
  MyPageTicketIcon,
  MyPageUserPlusIcon,
  MyPageUsersIcon,
} from './MyPageFlowIcons';
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

type ProfileIdentityProps = {
  profileImage: string | null;
  name: string;
  normalizedHandle: string;
  email: string;
  savedFavoriteTeam: string;
  cheerPoints: number;
};

type FollowStatsProps = {
  followerCount: number;
  followingCount: number;
  onOpenFollowers: () => void;
  onOpenFollowing: () => void;
};

type ActionButtonsProps = {
  isStatsView: boolean;
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

const secondaryActionButtonClass =
  'h-10 min-w-0 shrink-0 gap-1.5 px-3 text-body font-semibold bg-card border-2 border-border text-primary hover:bg-muted';
const primaryActionButtonClass =
  'h-10 min-w-0 shrink-0 gap-1.5 px-3 text-body font-semibold text-primary-foreground bg-primary hover:bg-primary';

function LoadingProfileCard() {
  return (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,_1fr)_auto] lg:items-start">
      <div className="flex min-w-0 items-start gap-3 md:gap-4">
        <Skeleton className="h-20 w-20 flex-shrink-0 rounded-full md:h-24 md:w-24" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <Skeleton className="h-7 w-36 max-w-full" />
          <Skeleton className="h-4 w-24 max-w-full" />
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
      </div>
      <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[440px] lg:items-end">
        <div className="flex items-center gap-4 md:gap-5">
          <div className="space-y-1 text-center">
            <Skeleton className="mx-auto h-6 w-10" />
            <Skeleton className="mx-auto h-4 w-16" />
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="space-y-1 text-center">
            <Skeleton className="mx-auto h-6 w-10" />
            <Skeleton className="mx-auto h-4 w-16" />
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto lg:flex-nowrap lg:justify-end">
          <Skeleton className="order-1 col-span-2 h-10 rounded-md lg:order-4 lg:col-span-1 lg:w-28" />
          <Skeleton className="order-2 h-10 rounded-md lg:order-1 lg:w-28" />
          <Skeleton className="order-3 h-10 rounded-md lg:order-2 lg:w-32" />
          <Skeleton className="order-4 col-span-2 h-10 rounded-md lg:order-3 lg:col-span-1 lg:w-28" />
        </div>
      </div>
    </div>
  );
}

function ProfileIdentity({
  profileImage,
  name,
  normalizedHandle,
  email,
  savedFavoriteTeam,
  cheerPoints,
}: ProfileIdentityProps) {
  return (
    <div className="flex min-w-0 items-start gap-3 md:gap-4">
      <div className="relative flex-shrink-0">
        <ProfileAvatar
          src={profileImage}
          alt={name}
          fallbackName={name}
          className="h-20 w-20 md:h-24 md:w-24"
        />
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="mb-1 flex min-w-0 flex-wrap items-center gap-2 md:gap-3">
          <h2 className="min-w-0 max-w-full break-words text-xl font-bold text-primary md:text-2xl">
            {name}
          </h2>
          {savedFavoriteTeam !== '없음' && (
            <div className="h-5 w-5 flex-shrink-0 md:h-6 md:w-6" data-testid="mypage-favorite-team-logo">
              <TeamLogo team={savedFavoriteTeam} size="sm" />
            </div>
          )}
        </div>
        {normalizedHandle && (
            <p className="max-w-full truncate text-body font-semibold text-muted-foreground">
            {normalizedHandle}
          </p>
        )}
          <p className="max-w-full break-all text-body font-semibold text-muted-foreground">
          {email}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-body font-semibold"
            style={{
              borderColor: 'var(--mp-gold-border)',
              backgroundColor: 'var(--mp-gold-soft)',
              color: 'var(--mp-gold)',
            }}
          >
            <MyPageCoinsIcon className="h-3.5 w-3.5" />
            {cheerPoints.toLocaleString()} P
          </span>
        </div>
      </div>
    </div>
  );
}

function FollowStats({
  followerCount,
  followingCount,
  onOpenFollowers,
  onOpenFollowing,
}: FollowStatsProps) {
  return (
    <div className="flex items-center gap-4 md:gap-5 lg:justify-end">
      <button
        type="button"
        className="group min-w-[72px] cursor-pointer text-center"
        onClick={onOpenFollowers}
      >
        <span className="block text-lg font-bold text-foreground transition-colors group-hover:text-primary">
          {formatCount(followerCount)}
        </span>
        <span className="flex items-center justify-center gap-1 whitespace-nowrap text-body font-semibold text-muted-foreground transition-colors group-hover:text-primary">
          <MyPageUsersIcon className="h-3.5 w-3.5" />
          팔로워
        </span>
      </button>
      <div className="h-8 w-px bg-border" />
      <button
        type="button"
        className="group min-w-[72px] cursor-pointer text-center"
        onClick={onOpenFollowing}
      >
        <span className="block text-lg font-bold text-foreground transition-colors group-hover:text-primary">
          {formatCount(followingCount)}
        </span>
          <span className="flex items-center justify-center gap-1 whitespace-nowrap text-body font-semibold text-muted-foreground transition-colors group-hover:text-primary">
          <MyPageUserPlusIcon className="h-3.5 w-3.5" />
          팔로잉
        </span>
      </button>
    </div>
  );
}

function ActionButtons({
  isStatsView,
  onOpenMateHistory,
  onToggleStats,
  onOpenTicketUploadModal,
  onOpenEditProfile,
}: ActionButtonsProps) {
  return (
    <div className="grid w-full grid-cols-2 gap-2 2xl:flex 2xl:flex-wrap 2xl:justify-end">
      <Button
        onClick={onOpenEditProfile}
        className={`${primaryActionButtonClass} order-1 col-span-2 2xl:order-4 2xl:col-span-1`}
      >
        <MyPageEditIcon className="h-4 w-4 flex-shrink-0" />
        <span className="min-w-0 truncate">내 정보 수정</span>
      </Button>
      <Button
        onClick={onOpenMateHistory}
        className={`${secondaryActionButtonClass} order-2 2xl:order-1`}
      >
        <MyPageUsersIcon className="h-4 w-4 flex-shrink-0" />
        <span className="min-w-0 truncate">메이트 내역</span>
      </Button>
      <Button
        onClick={onToggleStats}
        data-testid="mypage-toggle-stats"
        className={`${secondaryActionButtonClass} order-3 2xl:order-2 2xl:w-32`}
      >
        <MyPageBarChartIcon className="h-4 w-4 flex-shrink-0" />
        <span className="min-w-0 truncate">{isStatsView ? '다이어리 보기' : '통계 보기'}</span>
      </Button>
      <Button
        onClick={onOpenTicketUploadModal}
        className={`${secondaryActionButtonClass} order-4 col-span-2 2xl:order-3 2xl:col-span-1`}
      >
        <MyPageTicketIcon className="h-4 w-4 flex-shrink-0" />
        <span className="min-w-0 truncate">티켓 등록</span>
      </Button>
    </div>
  );
}

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
  const { data: followCounts } = useQuery({
    queryKey: ['followCounts', 'me', currentUserId ?? 0],
    queryFn: () => getMyFollowCounts(),
    enabled: Boolean(currentUserId),
    retry: false,
  });

  const normalizedHandle = handle ? (handle.startsWith('@') ? handle : `@${handle}`) : '';

  return (
    <Card className="mb-5 gap-2 p-4 md:p-5">
      {isProfileLoading ? (
        <LoadingProfileCard />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-[minmax(0,_1fr)_minmax(0,_560px)] 2xl:items-start">
          <ProfileIdentity
            profileImage={profileImage}
            name={name}
            normalizedHandle={normalizedHandle}
            email={email}
            savedFavoriteTeam={savedFavoriteTeam}
            cheerPoints={cheerPoints}
          />
          <div className="flex w-full min-w-0 flex-col gap-3 2xl:items-end">
            <FollowStats
              followerCount={followCounts?.followerCount || 0}
              followingCount={followCounts?.followingCount || 0}
              onOpenFollowers={onOpenFollowers}
              onOpenFollowing={onOpenFollowing}
            />
            <ActionButtons
              isStatsView={isStatsView}
              onOpenMateHistory={onOpenMateHistory}
              onToggleStats={onToggleStats}
              onOpenTicketUploadModal={onOpenTicketUploadModal}
              onOpenEditProfile={onOpenEditProfile}
            />
          </div>
        </div>
      )}
    </Card>
  );
}
