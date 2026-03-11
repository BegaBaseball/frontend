import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRightCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  Clock,
  Loader2,
  LucideIcon,
  MapPin,
  QrCode,
  Users,
} from 'lucide-react';
import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.png';
import LoadingSpinner from './LoadingSpinner';
import TeamLogo from './TeamLogo';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { useMatePartyFromRoute } from '../hooks/useMatePartyFromRoute';
import { useAuthProfileSnapshot } from '../store/authStore';
import { CheckIn } from '../types/mate';
import { cn } from '../lib/utils';
import { api } from '../utils/api';
import { getApiErrorMessage } from '../utils/errorUtils';
import {
  getPartyFlowLabel,
  getPartyStatusMeta,
  mateHeroCardClass,
  mateInsetPanelClass,
  mateMobileBarClass,
  matePageShellClass,
  mateSectionCardClass,
  mateSubtlePanelClass,
} from '../utils/mateFlowUi';
import { formatGameDate, hasSameMateUserIdentity, isPartyHostedByUser } from '../utils/mate';

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
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            {label}
          </p>
          <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-300">{detail}</p>
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
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500 dark:text-gray-300">{description}</p>
    </div>
  );
}

export default function MateCheckIn() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const {
    party: selectedParty,
    isLoading: isPartyLoading,
    isRevalidating: isPartyRevalidating,
    error: partyError,
  } = useMatePartyFromRoute(id);
  const {
    userId: authUserId,
    userHandle: authUserHandle,
  } = useAuthProfileSnapshot();

  const [isChecking, setIsChecking] = useState(false);
  const [checkInStatus, setCheckInStatus] = useState<CheckIn[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserHandle, setCurrentUserHandle] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [userLoadError, setUserLoadError] = useState<string | null>(null);
  const [userRetryCount, setUserRetryCount] = useState(0);
  const [statusLoadError, setStatusLoadError] = useState<string | null>(null);
  const [statusRetryCount, setStatusRetryCount] = useState(0);
  const qrSessionId = searchParams.get('sessionId')?.trim() || undefined;

  useEffect(() => {
    let isMounted = true;

    const fetchUser = async () => {
      setIsLoadingUser(true);
      setUserLoadError(null);

      if (authUserId && authUserId > 0) {
        if (isMounted) {
          setCurrentUserId(authUserId);
          setCurrentUserHandle(authUserHandle);
          setIsLoadingUser(false);
        }
        return;
      }

      try {
        const userData = await api.getCurrentUser();
        const profileId = Number(userData?.data?.id);
        if (Number.isFinite(profileId) && profileId > 0) {
          if (isMounted) {
            setCurrentUserId(profileId);
            setCurrentUserHandle(userData?.data?.handle ?? null);
          }
          return;
        }
        throw new Error('사용자 ID를 확인할 수 없습니다.');
      } catch (error) {
        console.error('사용자 정보 가져오기 실패:', error);
        if (isMounted) {
          setCurrentUserId(null);
          setCurrentUserHandle(null);
          setUserLoadError(getApiErrorMessage(error, '사용자 정보를 확인하지 못했습니다. 다시 시도해주세요.'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingUser(false);
        }
      }
    };

    void fetchUser();

    return () => {
      isMounted = false;
    };
  }, [authUserHandle, authUserId, userRetryCount]);

  useEffect(() => {
    if (!selectedParty) {
      return;
    }

    let isMounted = true;

    const fetchCheckInStatus = async () => {
      try {
        setStatusLoadError(null);
        const data = await api.getCheckInsByParty(selectedParty.id);
        if (isMounted) {
          setCheckInStatus(data);
        }
      } catch (error) {
        console.error('체크인 현황 불러오기 실패:', error);
        if (isMounted) {
          setStatusLoadError('체크인 현황을 다시 확인하지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      }
    };

    void fetchCheckInStatus();
    const interval = setInterval(() => {
      void fetchCheckInStatus();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [selectedParty, statusRetryCount]);

  if ((isPartyLoading && !selectedParty) || isLoadingUser) {
    return <LoadingSpinner text="파티 정보를 불러오는 중입니다..." />;
  }

  if (partyError || !selectedParty || !currentUserId) {
    const resolvedError = partyError || userLoadError || '파티 정보를 찾을 수 없습니다.';
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
              {userLoadError && (
                <Button
                  variant="outline"
                  onClick={() => setUserRetryCount((count) => count + 1)}
                >
                  다시 시도
                </Button>
              )}
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

  const isHost = isPartyHostedByUser(selectedParty, { id: currentUserId, handle: currentUserHandle });
  const myCheckIn = checkInStatus.find((checkIn) => hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: currentUserHandle },
  ));
  const isCheckedIn = Boolean(myCheckIn);
  const hostCheckedIn = checkInStatus.some((checkIn) => hasSameMateUserIdentity(
    { handle: checkIn.userHandle },
    { handle: selectedParty.hostHandle },
  ));
  const totalParticipants = Math.max(selectedParty.currentParticipants, 1);
  const checkedInCount = checkInStatus.length;
  const remainingCount = Math.max(totalParticipants - checkedInCount, 0);
  const allCheckedIn = checkedInCount >= totalParticipants;
  const progressValue = Math.min(100, Math.round((checkedInCount / totalParticipants) * 100));
  const statusMeta = getPartyStatusMeta(selectedParty.status);
  const flowLabel = getPartyFlowLabel(selectedParty.status);
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
  const safeShieldIcon = CheckCircle;
  const safeTicketIcon = QrCode;
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
      icon: isCheckedIn ? safeShieldIcon : Clock,
      label: '내 상태',
      value: isCheckedIn ? '체크인 완료' : '아직 미완료',
      detail: isCheckedIn && myCheckIn
        ? `${new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR')} 기록`
        : '경기장 근처에서만 체크인이 가능합니다.',
    },
    {
      icon: qrSessionId ? QrCode : safeTicketIcon,
      label: '진입 방식',
      value: sessionLabel,
      detail: qrSessionId ? '상세페이지 QR 링크를 통해 연결되었습니다.' : '직접 진입한 체크인 화면입니다.',
    },
  ];

  const handleCheckIn = async () => {
    setIsChecking(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await api.createCheckIn({
        partyId: selectedParty.id,
        location: selectedParty.stadium,
        ...(qrSessionId ? { qrSessionId } : {}),
      });

      const data = await api.getCheckInsByParty(selectedParty.id);
      setCheckInStatus(data);
      setStatusLoadError(null);
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

  const primaryMobileAction = !isCheckedIn
    ? {
      label: isChecking ? '처리 중...' : '체크인하기',
      onClick: handleCheckIn,
      disabled: isChecking,
      className: 'bg-primary text-white',
    }
    : allCheckedIn
      ? {
        label: '완료 확인',
        onClick: handleComplete,
        disabled: false,
        className: 'bg-primary text-white',
      }
      : null;
  const secondaryMobileAction = {
    label: '채팅으로',
    onClick: () => navigate(`/mate/${id}/chat`),
  };

  return (
    <div className={`${matePageShellClass} pb-32 lg:pb-10`}>
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
          className="mb-4"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          뒤로
        </Button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className={`p-0 ${mateHeroCardClass}`}>
              <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-6 py-6 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(10,15,20,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10">
                      <TeamLogo teamId={selectedParty.teamId} size="md" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80 dark:text-emerald-300">
                        Arrival Status
                      </p>
                      <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
                        체크인
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                        경기장 도착 상태와 전체 진행률을 한 화면에서 확인합니다. 개인 인증과 그룹 진행 상황을 분리해서 보여줍니다.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge className={cn('border text-xs font-semibold', statusMeta.className)}>
                          {statusMeta.label}
                        </Badge>
                        <Badge className="border border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                          {roleLabel}
                        </Badge>
                        <Badge className="border border-gray-200 bg-white/90 text-gray-700 dark:border-border dark:bg-card/70 dark:text-gray-200">
                          {flowLabel}
                        </Badge>
                        {qrSessionId && (
                          <Badge className="border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300">
                            <span className="flex items-center gap-1">
                              <QrCode className="h-3.5 w-3.5" />
                              QR 세션
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`${mateInsetPanelClass} min-w-full p-4 sm:min-w-[280px] lg:max-w-[320px]`}>
                    <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-start gap-3">
                        <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">일정</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {formatGameDate(selectedParty.gameDate)} {selectedParty.gameTime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">경기장 / 좌석</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">{selectedParty.stadium}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">{selectedParty.section}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <Users className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">참여 인원</p>
                          <p className="mt-1 font-medium text-gray-900 dark:text-white">
                            {checkedInCount}/{totalParticipants}명 체크인
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
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
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-sm">
                  최신 파티 정보를 다시 확인하고 있습니다.
                </AlertDescription>
              </Alert>
            )}

            {qrSessionId && (
              <Alert className="border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/20">
                <AlertDescription className="text-sky-800 dark:text-sky-200 text-sm">
                  QR 코드로 체크인 링크가 연결되었습니다. 세션 정보는 이번 체크인 인증에만 사용됩니다.
                </AlertDescription>
              </Alert>
            )}

            {statusLoadError && (
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
                <AlertDescription className="flex flex-wrap items-center justify-between gap-2 text-amber-800 dark:text-amber-200 text-sm">
                  <span>{statusLoadError}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-900 dark:text-amber-200 dark:hover:bg-amber-950/40"
                    onClick={() => setStatusRetryCount((count) => count + 1)}
                  >
                    다시 시도
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {!isCheckedIn ? (
              <Card className={`p-6 ${mateSectionCardClass}`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      Personal Check-In
                    </p>
                    <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">도착 인증이 아직 필요합니다</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      경기장에 도착했다면 아래 버튼으로 체크인을 완료하세요. 기록은 노쇼 판단과 분쟁 처리 기준으로 사용됩니다.
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      경기장에 도착하셨다면 지금 바로 체크인을 진행하세요.
                    </p>
                    <Button
                      onClick={handleCheckIn}
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
              <Card className={`p-6 ${mateSectionCardClass}`}>
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                      Personal Status
                    </p>
                    <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">체크인 완료</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                      체크인 시간이 기록되었습니다. 이제 다른 참여자의 도착 상태 또는 최종 완료 단계를 확인하면 됩니다.
                    </p>
                    <div className={`${mateInsetPanelClass} mt-4 p-4 text-sm text-gray-600 dark:text-gray-300`}>
                      체크인 시간: {myCheckIn ? new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR') : '-'}
                    </div>
                  </div>

                  <div className={`${mateInsetPanelClass} min-w-full p-5 text-center sm:min-w-[280px] lg:max-w-[320px]`}>
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/25">
                      <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="mt-4 text-lg font-bold text-green-700 dark:text-green-300">도착 인증 완료</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {allCheckedIn
                        ? '모든 참여자가 체크인을 완료했습니다.'
                        : '다른 참여자의 도착 상태를 계속 확인할 수 있습니다.'}
                    </p>
                    {allCheckedIn && (
                      <Button
                        onClick={handleComplete}
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

            <Card className={`p-6 ${mateSectionCardClass}`} data-testid="checkin-progress-card">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    Group Progress
                  </p>
                  <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">전체 체크인 진행률</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    개인 체크인과 별개로 전체 인원이 얼마나 도착했는지 보여줍니다.
                  </p>
                </div>
                <Badge className={cn(
                  'border text-xs font-semibold',
                  allCheckedIn
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300',
                )}>
                  {allCheckedIn ? '전원 도착 완료' : `${remainingCount}명 대기 중`}
                </Badge>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                  <span>진행률</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{progressValue}%</span>
                </div>
                <Progress value={progressValue} className="h-3" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className={`${mateInsetPanelClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">완료</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{checkedInCount}명</p>
                  </div>
                  <div className={`${mateInsetPanelClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">대기</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{remainingCount}명</p>
                  </div>
                  <div className={`${mateInsetPanelClass} p-4`}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">진입 방식</p>
                    <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{sessionLabel}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className={`p-6 ${mateSectionCardClass}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                    Arrival Roster
                  </p>
                  <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">체크인 현황</h2>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                    이름이 확인된 참여자와 호스트의 도착 상태를 먼저 보여주고, 남은 인원은 수량으로 표시합니다.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-fit border-primary text-primary hover:bg-primary/10"
                  onClick={() => navigate(`/mate/${id}/chat`)}
                >
                  <ArrowRightCircle className="mr-2 h-4 w-4" />
                  채팅으로 이동
                </Button>
              </div>

              <div className="mt-6 space-y-3">
                <div className={cn(
                  'flex items-center justify-between rounded-2xl border px-4 py-4',
                  hostCheckedIn
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25'
                    : 'border-gray-200 bg-white/80 dark:border-border/70 dark:bg-card/70',
                )}>
                  <div className="flex items-center gap-3">
                    {hostCheckedIn ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedParty.hostName} (호스트)</p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {hostCheckedIn ? '도착 인증 완료' : '아직 도착 확인 전'}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn(
                    'border text-xs font-semibold',
                    hostCheckedIn
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                      : 'border-gray-200 bg-white text-gray-600 dark:border-border dark:bg-card/60 dark:text-gray-300',
                  )}>
                    {hostCheckedIn ? '체크인 완료' : '대기 중'}
                  </Badge>
                </div>

                {!isHost && (
                  <div className={cn(
                    'flex items-center justify-between rounded-2xl border px-4 py-4',
                    isCheckedIn
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25'
                      : 'border-gray-200 bg-white/80 dark:border-border/70 dark:bg-card/70',
                  )}>
                    <div className="flex items-center gap-3">
                      {isCheckedIn ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">나 (본인)</p>
                        <p className="text-xs text-gray-500 dark:text-gray-300">
                          {isCheckedIn ? '도착 인증 완료' : '아직 도착 확인 전'}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn(
                      'border text-xs font-semibold',
                      isCheckedIn
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                        : 'border-gray-200 bg-white text-gray-600 dark:border-border dark:bg-card/60 dark:text-gray-300',
                    )}>
                      {isCheckedIn ? '체크인 완료' : '대기 중'}
                    </Badge>
                  </div>
                )}

                {checkInStatus
                  .filter((checkIn) => !hasSameMateUserIdentity(
                    { handle: checkIn.userHandle },
                    { handle: currentUserHandle },
                  ) && !hasSameMateUserIdentity(
                    { handle: checkIn.userHandle },
                    { handle: selectedParty.hostHandle },
                  ))
                  .map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/25"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{checkIn.userName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-300">
                            {new Date(checkIn.checkedInAt).toLocaleString('ko-KR')} 체크인
                          </p>
                        </div>
                      </div>
                      <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
                        체크인 완료
                      </Badge>
                    </div>
                  ))}

                {remainingCount > 0 && (
                  <div className={`${mateSubtlePanelClass} px-4 py-4`}>
                    <p className="font-medium text-gray-900 dark:text-white">대기 중인 참여자 {remainingCount}명</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-300">
                      이름이 아직 확인되지 않은 참여자는 도착 후 체크인 기록으로 반영됩니다.
                    </p>
                  </div>
                )}

                {checkInStatus.length === 0 && (
                  <EmptyState
                    icon={Users}
                    title="아직 체크인 기록이 없습니다"
                    description="첫 체크인이 시작되면 이 영역에 참여자 상태가 순서대로 표시됩니다."
                  />
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className={`hidden p-5 lg:flex lg:sticky lg:top-6 ${mateSectionCardClass}`}>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  Next Action
                </p>
                <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 해야 할 일</h3>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
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
                      onClick={handleCheckIn}
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
                    <Button onClick={handleComplete} className="w-full bg-primary text-white">
                      완료 확인
                    </Button>
                  ) : (
                    <div className={`${mateInsetPanelClass} p-4 text-sm text-gray-600 dark:text-gray-300`}>
                      {isHost ? '아직 도착하지 않은 참여자를 기다리는 중입니다.' : '다른 참여자의 체크인 완료를 기다리는 중입니다.'}
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary/10"
                    onClick={() => navigate(`/mate/${id}/chat`)}
                  >
                    채팅으로 이동
                  </Button>
                </div>

                <div className={`${mateInsetPanelClass} mt-4 p-4`}>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">체크인 기준</p>
                  <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
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
          <div
            className={`${mateMobileBarClass} lg:hidden`}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
          >
            <div className="mx-auto flex max-w-6xl items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                  체크인 요약
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {checkedInCount}/{totalParticipants}명 체크인 완료
                </p>
              </div>
              <Button
                onClick={secondaryMobileAction.onClick}
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
              >
                {secondaryMobileAction.label}
              </Button>
              <Button
                onClick={primaryMobileAction.onClick}
                disabled={primaryMobileAction.disabled}
                className={primaryMobileAction.className}
              >
                {primaryMobileAction.label}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
