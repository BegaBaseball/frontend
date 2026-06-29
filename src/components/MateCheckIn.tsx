import { lazy, Suspense, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import LoadingSpinner from './LoadingSpinner';
import { MateAlertCircleIcon, MateChevronLeftIcon } from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
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
  const [manualCode, setManualCode] = useState('');
  const [manualCodeError, setManualCodeError] = useState<string | null>(null);
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
              <MateAlertCircleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-700 dark:text-red-300">
                {resolvedError}
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/mate')}
              >
                <MateChevronLeftIcon className="mr-2 h-4 w-4" />
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
    const trimmedManualCode = manualCode.trim();
    if (!qrSessionId && !/^\d{4}$/.test(trimmedManualCode)) {
      setManualCodeError('수동 체크인 코드를 4자리 숫자로 입력해주세요.');
      return;
    }

    setManualCodeError(null);
    setIsChecking(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const createdCheckIn = await createCheckIn({
        partyId: party.id,
        location: party.stadium,
        ...(qrSessionId ? { qrSessionId } : {}),
        ...(!qrSessionId ? { manualCode: trimmedManualCode } : {}),
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
          <MateChevronLeftIcon className="mr-2 h-4 w-4" />
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
          <Card className={`mb-6 p-5 sm:p-6 ${mateSectionCardClass}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
                  Check-In Credential
                </p>
                <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                  {qrSessionId ? 'QR 세션이 연결된 체크인' : '수동 체크인 코드 입력'}
                </h2>
                <p className="mt-2 text-body leading-6 text-gray-600 dark:text-white">
                  {qrSessionId
                    ? '현재는 QR 세션으로 체크인할 수 있습니다. 세션이 만료되면 아래 수동 코드로도 진행할 수 있습니다.'
                    : '직접 진입한 화면입니다. 호스트가 보여준 4자리 수동 체크인 코드를 입력한 뒤 체크인을 진행하세요.'}
                </p>
              </div>
              <div className="w-full max-w-sm">
                <label htmlFor="manualCode" className="mb-2 block text-body font-semibold text-gray-900 dark:text-white">
                  수동 체크인 코드
                </label>
                <Input
                  id="manualCode"
                  inputMode="numeric"
                  maxLength={4}
                  value={manualCode}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, '').slice(0, 4);
                    setManualCode(nextValue);
                    if (manualCodeError) {
                      setManualCodeError(null);
                    }
                  }}
                  placeholder="예: 0427"
                  className="text-base tracking-[0.35em]"
                />
                {manualCodeError ? (
                  <p className="mt-2 text-body text-red-600 dark:text-red-400">{manualCodeError}</p>
                ) : (
                  <p className="mt-2 text-body text-gray-500 dark:text-white">
                    {qrSessionId ? '수동 코드는 QR 세션 장애 시 백업 수단입니다.' : 'QR 세션 없이도 수동 코드만으로 체크인할 수 있습니다.'}
                  </p>
                )}
              </div>
            </div>
          </Card>
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
