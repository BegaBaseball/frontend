import { lazy, Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
} from 'lucide-react';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import LoadingSpinner from './LoadingSpinner';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import {
  appendMatePartyCheckInQueryData,
  getMatePartyCheckInsQueryOptions,
  updateMatePartyCollectionQueryData,
  useMatePartyFromRoute,
} from '../hooks/mateCheckInRoute';
import { useAuthProfileSnapshot, useAuthSession } from '../store/authStore';
import { createCheckIn } from '../api/mate';
import { getApiErrorMessage } from '../utils/errorUtils';
import {
  matePageShellClass,
  mateSectionCardClass,
} from '../utils/mateFlowUi';
import { hasSameMateUserIdentity, isPartyHostedByUser } from '../utils/mate';

const MateCheckInContentRuntime = lazy(() => import('./MateCheckInContentRuntime'));

export default function MateCheckIn() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const {
    party,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const {
    userHandle: currentUserHandle,
  } = useAuthProfileSnapshot();
  const { isAuthLoading, userId: currentUserId } = useAuthSession();
  const queryClient = useQueryClient();

  const [isChecking, setIsChecking] = useState(false);
  const qrSessionId = searchParams.get('sessionId')?.trim() || undefined;

  const checkInsQuery = useQuery({
    ...(party?.id != null
      ? getMatePartyCheckInsQueryOptions(party.id)
      : getMatePartyCheckInsQueryOptions('unknown')),
    enabled: Boolean(party?.id),
  });
  const checkInStatus = checkInsQuery.data ?? [];
  const statusLoadError = checkInsQuery.error
    ? '체크인 현황을 다시 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
    : null;

  if (isAuthLoading || (isPartyLoading && !party)) {
    return <LoadingSpinner text="파티 정보를 불러오는 중입니다..." />;
  }

  if (partyError || !party) {
    const resolvedError = partyError || '파티 정보를 찾을 수 없습니다.';
    return (
      <div className={matePageShellClass}>
        <img
          src={grassDecor}
          alt=""
          className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <Card className={`p-6 ${mateSectionCardClass}`}>
            <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/25">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {resolvedError}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/mate')}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                목록으로
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentUserId) {
    return null;
  }

  const isHost = isPartyHostedByUser(party, { id: currentUserId, handle: currentUserHandle });
  const myCheckIn = checkInStatus.find((checkIn) => hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: currentUserHandle },
  ));
  const isCheckedIn = Boolean(myCheckIn);
  const hostCheckedIn = checkInStatus.some((checkIn) => hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: party.hostHandle },
  ));
  const totalParticipants = Math.max(party.currentParticipants, 1);
  const checkedInCount = checkInStatus.length;
  const remainingCount = Math.max(totalParticipants - checkedInCount, 0);
  const allCheckedIn = checkedInCount >= totalParticipants;
  const progressValue = Math.min(100, Math.round((checkedInCount / totalParticipants) * 100));

  const handleCheckIn = async () => {
    setIsChecking(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const createdCheckIn = await createCheckIn({
        partyId: party.id,
        location: party.stadium,
        ...(qrSessionId ? { qrSessionId } : {}),
      });
      const nextCheckIns = appendMatePartyCheckInQueryData(queryClient, party.id, createdCheckIn);
      if (nextCheckIns.length >= party.currentParticipants) {
        updateMatePartyCollectionQueryData(queryClient, party.id, (currentParty) => ({
          ...currentParty,
          status: 'CHECKED_IN',
        }));
      }
      toast.success('체크인이 완료되었습니다!');
    } catch (error) {
      console.error('체크인 중 오류:', error);
      toast.error(getApiErrorMessage(error, '체크인 중 오류가 발생했습니다.'));
    } finally {
      setIsChecking(false);
    }
  };

  const handleComplete = () => {
    toast.success('경기 관람이 완료되었습니다!');
    navigate('/mate');
  };

  return (
    <div className={`${matePageShellClass} pb-40 lg:pb-10`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(22,163,74,0.10),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_48%)]" />
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={() => navigate(`/mate/${id}`)}
          className="mb-3 -ml-2 sm:mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          뒤로
        </Button>

        <Suspense
          fallback={(
            <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
              <div className="space-y-4 animate-pulse">
                <div className="h-6 w-40 rounded bg-muted" />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 rounded-2xl bg-muted/70" />
                  ))}
                </div>
                <div className="h-48 rounded-3xl bg-muted/70" />
              </div>
            </Card>
          )}
        >
          <MateCheckInContentRuntime
            party={party}
            isHost={isHost}
            isCheckedIn={isCheckedIn}
            isChecking={isChecking}
            qrSessionId={qrSessionId}
            isPartyRevalidating={isPartyRevalidating}
            statusLoadError={statusLoadError}
            hostCheckedIn={hostCheckedIn}
            allCheckedIn={allCheckedIn}
            checkedInCount={checkedInCount}
            totalParticipants={totalParticipants}
            remainingCount={remainingCount}
            progressValue={progressValue}
            currentUserHandle={currentUserHandle}
            myCheckIn={myCheckIn}
            checkInStatus={checkInStatus}
            onRetryStatus={() => {
              void checkInsQuery.refetch();
            }}
            onCheckIn={handleCheckIn}
            onComplete={handleComplete}
            onNavigateToChat={() => navigate(`/mate/${id}/chat`)}
          />
        </Suspense>
      </div>
    </div>
  );
}
