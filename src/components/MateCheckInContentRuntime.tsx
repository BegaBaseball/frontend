import { lazy, Suspense, useMemo } from 'react';

import type { CheckIn, Party } from '../types/mate';
import { hasSameMateUserIdentity } from '../utils/mate';
import { mateSectionCardClass } from '../utils/mateFlowUi';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';

const MateCheckInOverviewRuntime = lazy(() => import('./MateCheckInOverviewRuntime'));
const MateCheckInRosterRuntime = lazy(() => import('./MateCheckInRosterRuntime'));
const MateCheckInActionRuntime = lazy(() => import('./MateCheckInActionRuntime'));
const MateCheckInStatusRuntime = lazy(() => import('./MateCheckInStatusRuntime'));

interface MateCheckInContentRuntimeProps {
  party: Party;
  isHost: boolean;
  isCheckedIn: boolean;
  isChecking: boolean;
  qrSessionId?: string;
  isPartyRevalidating: boolean;
  statusLoadError: string | null;
  hostCheckedIn: boolean;
  allCheckedIn: boolean;
  checkedInCount: number;
  totalParticipants: number;
  remainingCount: number;
  progressValue: number;
  currentUserHandle?: string | null;
  myCheckIn?: CheckIn;
  checkInStatus: CheckIn[];
  onRetryStatus: () => void;
  onCheckIn: () => void;
  onComplete: () => void;
  onNavigateToChat: () => void;
}

export default function MateCheckInContentRuntime({
  party,
  isHost,
  isCheckedIn,
  isChecking,
  qrSessionId,
  isPartyRevalidating,
  statusLoadError,
  hostCheckedIn,
  allCheckedIn,
  checkedInCount,
  totalParticipants,
  remainingCount,
  progressValue,
  currentUserHandle,
  myCheckIn,
  checkInStatus,
  onRetryStatus,
  onCheckIn,
  onComplete,
  onNavigateToChat,
}: MateCheckInContentRuntimeProps) {
  const sessionLabel = qrSessionId ? 'QR 세션 진입' : '일반 진입';
  const otherCheckIns = useMemo(
    () => checkInStatus.filter((checkIn) => !hasSameMateUserIdentity(
      { handle: checkIn.userHandle },
      { handle: currentUserHandle },
    ) && !hasSameMateUserIdentity(
      { handle: checkIn.userHandle },
      { handle: party.hostHandle },
    )),
    [checkInStatus, currentUserHandle, party.hostHandle],
  );

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Suspense fallback={(
            <div className="space-y-3">
              <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
                <div className="space-y-4">
                  <div>
                    <p className="text-body font-semibold text-gray-800 dark:text-white">체크인 정보를 준비하고 있습니다.</p>
                    <p className="mt-1 text-caption text-gray-500 dark:text-white">경기와 참여자 상태를 확인 중입니다.</p>
                  </div>
                  <div className="space-y-4 animate-pulse">
                    <div className="h-8 w-32 rounded bg-muted" />
                    <div className="h-24 rounded-2xl bg-muted/70" />
                  </div>
                </div>
              </Card>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted/70" />
                ))}
              </div>
            </div>
          )}>
            <MateCheckInOverviewRuntime
              party={party}
              isHost={isHost}
              isCheckedIn={isCheckedIn}
              qrSessionId={qrSessionId}
              allCheckedIn={allCheckedIn}
              checkedInCount={checkedInCount}
              totalParticipants={totalParticipants}
              remainingCount={remainingCount}
              myCheckIn={myCheckIn}
            />
          </Suspense>

          {isPartyRevalidating && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
              <AlertDescription className="text-body text-blue-700 dark:text-blue-300">
                최신 파티 정보를 다시 확인하고 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {qrSessionId && (
            <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/20">
              <AlertDescription className="text-body text-sky-800 dark:text-sky-200">
                QR 코드로 체크인 링크가 연결되었습니다. 세션 정보는 이번 체크인 인증에만 사용됩니다.
              </AlertDescription>
            </Alert>
          )}

          {statusLoadError && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-body text-amber-800 dark:text-amber-200">
                <span>{statusLoadError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
                  onClick={onRetryStatus}
                >
                  다시 시도
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Suspense
            fallback={(
              <div className="space-y-6">
                <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
                  <div className="space-y-4">
                    <p className="text-body font-semibold text-gray-800 dark:text-white">내 체크인 상태 확인 중</p>
                    <div className="space-y-4 animate-pulse">
                      <div className="h-6 w-40 rounded bg-muted" />
                      <div className="h-24 rounded-2xl bg-muted/70" />
                    </div>
                  </div>
                </Card>
                <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
                  <div className="space-y-4">
                    <p className="text-body font-semibold text-gray-800 dark:text-white">진행률을 불러오고 있습니다.</p>
                    <div className="space-y-4 animate-pulse">
                      <div className="h-6 w-40 rounded bg-muted" />
                      <div className="h-20 rounded-2xl bg-muted/70" />
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="h-20 rounded-2xl bg-muted/70" />
                        <div className="h-20 rounded-2xl bg-muted/70" />
                        <div className="h-20 rounded-2xl bg-muted/70" />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          >
            <MateCheckInStatusRuntime
              isCheckedIn={isCheckedIn}
              isChecking={isChecking}
              allCheckedIn={allCheckedIn}
              checkedInCount={checkedInCount}
              totalParticipants={totalParticipants}
              remainingCount={remainingCount}
              progressValue={progressValue}
              sessionLabel={sessionLabel}
              myCheckIn={myCheckIn}
              onCheckIn={onCheckIn}
              onComplete={onComplete}
            />
          </Suspense>

          <Suspense
            fallback={(
              <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
                <div className="space-y-4">
                  <p className="text-body font-semibold text-gray-800 dark:text-white">참여자 명단을 불러오고 있습니다.</p>
                  <div className="space-y-4 animate-pulse">
                    <div className="h-6 w-36 rounded bg-muted" />
                    <div className="h-24 rounded-2xl bg-muted/70" />
                    <div className="h-24 rounded-2xl bg-muted/70" />
                    <div className="h-24 rounded-2xl bg-muted/70" />
                  </div>
                </div>
              </Card>
            )}
          >
            <MateCheckInRosterRuntime
              party={party}
              isHost={isHost}
              isCheckedIn={isCheckedIn}
              hostCheckedIn={hostCheckedIn}
              otherCheckIns={otherCheckIns}
              remainingCount={remainingCount}
              hasAnyCheckIn={checkInStatus.length > 0}
              onNavigateToChat={onNavigateToChat}
            />
          </Suspense>
        </div>

        <div className="space-y-4">
          <Suspense fallback={null}>
            <MateCheckInActionRuntime
              isCheckedIn={isCheckedIn}
              isChecking={isChecking}
              allCheckedIn={allCheckedIn}
              isHost={isHost}
              checkedInCount={checkedInCount}
              totalParticipants={totalParticipants}
              onCheckIn={onCheckIn}
              onComplete={onComplete}
              onNavigateToChat={onNavigateToChat}
            />
          </Suspense>
        </div>
      </div>
    </>
  );
}
