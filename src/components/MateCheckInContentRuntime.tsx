import { lazy, Suspense, type ReactNode } from 'react';
import {
  Calendar,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  Users,
  type LucideIcon,
} from 'lucide-react';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { cn } from '../lib/utils';
import {
  getPartyFlowLabel,
  getPartyStatusMeta,
  mateHeroCardClass,
  mateInsetPanelClass,
  mateMobileBarClass,
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';
import { formatGameDate, hasSameMateUserIdentity } from '../utils/mate';
import type { CheckIn, Party } from '../types/mate';

type SummaryItemProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
};

function SummaryItem({ icon: Icon, label, value, detail }: SummaryItemProps) {
  return (
    <div className={`${mateInsetPanelClass} p-4`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-sm dark:border-border/70 dark:bg-card/80">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-[16px] text-gray-500 dark:text-gray-300">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className={`${mateSubtlePanelClass} flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center`}>
      <div className="rounded-full bg-gray-100 p-4 dark:bg-secondary/80">
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-[16px] leading-6 text-gray-500 dark:text-gray-300">{description}</p>
    </div>
  );
}

function MatePill({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[16px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-secondary/80 ${className}`} aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

const MateCheckInRosterRuntime = lazy(() => import('./MateCheckInRosterRuntime'));

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
  const statusMeta = getPartyStatusMeta(party.status);
  const flowLabel = getPartyFlowLabel(party.status);
  const roleLabel = isHost ? '호스트 모드' : '참여자 모드';
  const sessionLabel = qrSessionId ? 'QR 세션 진입' : '일반 진입';
  const currentStateLabel = allCheckedIn
    ? '전원 도착 완료'
    : isCheckedIn
      ? '내 체크인 완료'
      : '도착 확인 필요';
  const currentStateDetail = allCheckedIn
    ? '모든 참여자의 도착 기록이 확정되었습니다.'
    : isCheckedIn
      ? '다른 참여자의 도착 상태를 기다리는 중입니다.'
      : '경기장 도착 후 체크인을 진행해주세요.';
  const summaryItems = [
    {
      icon: CheckCircle,
      label: '현재 상태',
      value: currentStateLabel,
      detail: currentStateDetail,
    },
    {
      icon: Users,
      label: '진행률',
      value: `${checkedInCount}/${totalParticipants}명`,
      detail: remainingCount > 0 ? `아직 ${remainingCount}명 도착 대기 중` : '전원 체크인 완료',
    },
    {
      icon: isCheckedIn ? CheckCircle : Clock,
      label: '내 상태',
      value: isCheckedIn ? '체크인 완료' : '아직 미완료',
      detail: isCheckedIn && myCheckIn
        ? `${new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR')} 기록`
        : '경기장 근처에서만 체크인이 가능합니다.',
    },
    {
      icon: QrCode,
      label: '진입 방식',
      value: sessionLabel,
      detail: qrSessionId ? '상세페이지 QR 링크를 통해 연결되었습니다.' : '직접 진입한 체크인 화면입니다.',
    },
  ];
  const otherCheckIns = checkInStatus.filter((checkIn) => !hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: currentUserHandle },
  ) && !hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: party.hostHandle },
  ));
  const primaryMobileAction = !isCheckedIn
    ? {
      label: isChecking ? '처리 중...' : '체크인하기',
      onClick: onCheckIn,
      disabled: isChecking,
      className: 'bg-primary text-white',
    }
    : allCheckedIn
      ? {
        label: '완료 확인',
        onClick: onComplete,
        disabled: false,
        className: 'bg-primary text-white',
      }
      : null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className={`p-0 ${mateHeroCardClass}`}>
            <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-5 py-5 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(10,15,20,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-8 sm:py-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10 sm:h-16 sm:w-16">
                    <TeamLogo teamId={party.teamId} size="md" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold uppercase tracking-[0.2em] text-primary/80 dark:text-emerald-300">
                      Arrival Status
                    </p>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                      체크인
                    </h1>
                    <p className="mt-3 max-w-2xl text-[16px] leading-6 text-gray-600 dark:text-gray-300">
                      경기장 도착 상태와 전체 진행률을 한 화면에서 확인합니다. 개인 인증과 그룹 진행 상황을 분리해서 보여줍니다.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MatePill className={cn('border text-[16px] font-semibold', statusMeta.className)}>
                        {statusMeta.label}
                      </MatePill>
                      <MatePill className="border border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                        {roleLabel}
                      </MatePill>
                      <MatePill className="border border-gray-200 bg-white/90 text-gray-700 dark:border-border dark:bg-card/70 dark:text-gray-200">
                        {flowLabel}
                      </MatePill>
                      {qrSessionId && (
                        <MatePill className="border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300">
                          <span className="flex items-center gap-1">
                            <QrCode className="h-3.5 w-3.5" />
                            QR 세션
                          </span>
                        </MatePill>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`${mateInsetPanelClass} min-w-full p-4 sm:min-w-[280px] lg:max-w-[320px]`}>
                  <div className="grid gap-3 text-[16px] text-gray-600 dark:text-gray-300">
                    <div className="flex items-start gap-3">
                      <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">일정</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {formatGameDate(party.gameDate)} {party.gameTime}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">경기장 / 좌석</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">{party.stadium}</p>
                        <p className="text-[16px] text-gray-500 dark:text-gray-300">{party.section}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">참여 인원</p>
                        <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                          {checkedInCount}/{totalParticipants}명 체크인
                        </p>
                        <p className="text-[16px] text-gray-500 dark:text-gray-300">
                          {remainingCount > 0 ? `${remainingCount}명 도착 대기` : '전원 도착 완료'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="checkin-summary-strip">
            {summaryItems.map((item) => (
              <SummaryItem key={item.label} {...item} />
            ))}
          </div>

          {isPartyRevalidating && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
              <AlertDescription className="text-[16px] text-blue-700 dark:text-blue-300">
                최신 파티 정보를 다시 확인하고 있습니다.
              </AlertDescription>
            </Alert>
          )}

          {qrSessionId && (
            <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/20">
              <AlertDescription className="text-[16px] text-sky-800 dark:text-sky-200">
                QR 코드로 체크인 링크가 연결되었습니다. 세션 정보는 이번 체크인 인증에만 사용됩니다.
              </AlertDescription>
            </Alert>
          )}

          {statusLoadError && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-[16px] text-amber-800 dark:text-amber-200">
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

          {!isCheckedIn ? (
            <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    Personal Check-In
                  </p>
                  <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">도착 인증이 아직 필요합니다</h2>
                  <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
                    경기장에 도착했다면 아래 버튼으로 체크인을 완료하세요. 기록은 노쇼 판단과 분쟁 처리 기준으로 사용됩니다.
                  </p>
                  <ul className="mt-4 space-y-2 text-[16px] text-gray-600 dark:text-gray-300">
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>경기장 근처에서만 체크인이 가능합니다.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>체크인 기록은 노쇼 판정 및 분쟁 처리에 사용됩니다.</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>체크인하지 않으면 노쇼로 처리될 수 있습니다.</span>
                    </li>
                  </ul>
                </div>

                <div className={`${mateInsetPanelClass} min-w-full p-5 text-center sm:min-w-[280px] lg:max-w-[320px]`}>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/25">
                    <MapPin className="h-10 w-10 text-primary" />
                  </div>
                  <p className="mt-4 text-lg font-bold text-gray-900 dark:text-white">체크인 준비 완료</p>
                  <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
                    경기장에 도착하셨다면 지금 바로 체크인을 진행하세요.
                  </p>
                  <Button
                    onClick={onCheckIn}
                    disabled={isChecking}
                    className="mt-5 w-full bg-primary text-white"
                    size="lg"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-5 w-5" />
                        체크인하기
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    Personal Status
                  </p>
                  <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">체크인 완료</h2>
                  <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
                    체크인 시간이 기록되었습니다. 이제 다른 참여자의 도착 상태 또는 최종 완료 단계를 확인하면 됩니다.
                  </p>
                  <div className={`${mateInsetPanelClass} mt-4 p-4 text-[16px] text-gray-600 dark:text-gray-300`}>
                    체크인 시간: {myCheckIn ? new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR') : '-'}
                  </div>
                </div>

                <div className={`${mateInsetPanelClass} min-w-full p-5 text-center sm:min-w-[280px] lg:max-w-[320px]`}>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/25">
                    <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="mt-4 text-lg font-bold text-green-700 dark:text-green-300">도착 인증 완료</p>
                  <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
                    {allCheckedIn
                      ? '모든 참여자가 체크인을 완료했습니다.'
                      : '다른 참여자의 도착 상태를 계속 확인할 수 있습니다.'}
                  </p>
                  {allCheckedIn && (
                    <Button
                      onClick={onComplete}
                      variant="outline"
                      className="mt-5 w-full border-primary text-primary hover:bg-primary/10"
                    >
                      완료 확인
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`} data-testid="checkin-progress-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  Group Progress
                </p>
                <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">전체 체크인 진행률</h2>
                <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
                  개인 체크인과 별개로 전체 인원이 얼마나 도착했는지 보여줍니다.
                </p>
              </div>
              <MatePill
                className={cn(
                  'border text-[16px] font-semibold',
                  allCheckedIn
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
                )}
              >
                {allCheckedIn ? '전원 도착 완료' : `${remainingCount}명 대기 중`}
              </MatePill>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between text-[16px] text-gray-600 dark:text-gray-300">
                <span>진행률</span>
                <span className="font-semibold text-gray-900 dark:text-white">{progressValue}%</span>
              </div>
              <ProgressBar value={progressValue} className="h-3" />
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={`${mateInsetPanelClass} p-4`}>
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">완료</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{checkedInCount}명</p>
                </div>
                <div className={`${mateInsetPanelClass} p-4`}>
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">대기</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{remainingCount}명</p>
                </div>
                <div className={`${mateInsetPanelClass} p-4`}>
                  <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">진입 방식</p>
                  <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{sessionLabel}</p>
                </div>
              </div>
            </div>
          </Card>

          <Suspense
            fallback={(
              <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
                <div className="space-y-4 animate-pulse">
                  <div className="h-6 w-36 rounded bg-muted" />
                  <div className="h-24 rounded-2xl bg-muted/70" />
                  <div className="h-24 rounded-2xl bg-muted/70" />
                  <div className="h-24 rounded-2xl bg-muted/70" />
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
          <Card className={`hidden p-5 lg:flex lg:sticky lg:top-6 ${mateSectionCardClass}`}>
            <div>
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                Next Action
              </p>
              <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 해야 할 일</h3>
              <p className="mt-2 text-[16px] leading-6 text-gray-600 dark:text-gray-300">
                {!isCheckedIn
                  ? '먼저 본인 체크인을 완료하세요. 그 다음 그룹 진행률을 확인하면 됩니다.'
                  : allCheckedIn
                    ? '전체 체크인이 마무리되었습니다. 완료 확인 후 목록으로 돌아갈 수 있습니다.'
                    : isHost
                      ? '다른 참여자의 도착 상태를 확인하고 필요하면 채팅에서 위치를 조율하세요.'
                      : '다른 참여자가 도착할 때까지 채팅에서 위치와 시간을 다시 맞출 수 있습니다.'}
              </p>

              <div className="mt-4 space-y-2">
                {!isCheckedIn ? (
                  <Button
                    onClick={onCheckIn}
                    disabled={isChecking}
                    className="w-full bg-primary text-white"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        처리 중...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        체크인하기
                      </>
                    )}
                  </Button>
                ) : allCheckedIn ? (
                  <Button onClick={onComplete} className="w-full bg-primary text-white">
                    완료 확인
                  </Button>
                ) : (
                  <div className={`${mateInsetPanelClass} p-4 text-[16px] text-gray-600 dark:text-gray-300`}>
                    {isHost ? '아직 도착하지 않은 참여자를 기다리는 중입니다.' : '다른 참여자의 체크인 완료를 기다리는 중입니다.'}
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full border-primary text-primary hover:bg-primary/10"
                  onClick={onNavigateToChat}
                >
                  채팅으로 이동
                </Button>
              </div>

              <div className={`${mateInsetPanelClass} mt-4 p-4`}>
                <p className="text-[16px] font-semibold text-gray-900 dark:text-white">체크인 기준</p>
                <ul className="mt-3 space-y-2 text-[16px] text-gray-600 dark:text-gray-300">
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>개인 체크인이 먼저 완료되어야 그룹 진행률이 올라갑니다.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>QR 세션 진입 여부와 관계없이 기록 기준은 동일합니다.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>전원 체크인 이후에는 완료 확인 단계로 넘어갑니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {primaryMobileAction && (
        <div className={`${mateMobileBarClass} lg:hidden`}>
          <div className="mx-auto max-w-6xl">
            <div className="min-w-0">
              <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                체크인 요약
              </p>
              <p className="mt-1 text-[16px] font-semibold text-gray-900 dark:text-white">
                {checkedInCount}/{totalParticipants}명 체크인 완료
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={onNavigateToChat}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10 sm:flex-1"
              >
                채팅으로
              </Button>
              <Button
                onClick={primaryMobileAction.onClick}
                disabled={primaryMobileAction.disabled}
                className={cn('w-full sm:flex-1', primaryMobileAction.className)}
              >
                {primaryMobileAction.label}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
