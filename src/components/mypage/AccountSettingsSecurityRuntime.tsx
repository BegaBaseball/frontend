import { useMutation, useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  deleteAccount,
  deleteDeviceSession,
  deleteOtherDeviceSessions,
  deleteTrustedDevice,
  getDeviceSessions,
  getSecurityEvents,
  getTrustedDevices,
} from '../../api/profile';
import { type DeviceSessionItem, type SecurityEventItem } from '../../types/profile';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { useAuthAccessActions } from '../../store/authStore';
import VerificationRequiredDialog from '../VerificationRequiredDialog';
import { Button } from '../ui/button';
import MyPageSeasonEmptyState from './MyPageSeasonEmptyState';
import {
  MyPageClockIcon,
  MyPageLaptopIcon,
  MyPageShieldAlertIcon,
  MyPageSmartphoneIcon,
} from './MyPageFlowIcons';

interface AccountSettingsSecurityRuntimeProps {
  userProvider?: string;
}

const DELETE_CONFIRM_TEXT = '삭제하겠습니다';
const deletePasswordInputClass = 'auth-autofill-input pr-10';
const LazyAccountSettingsAdvancedRuntime = lazy(() => import('./AccountSettingsAdvancedRuntime'));

const getSessionIcon = (deviceType?: string) => {
  switch ((deviceType || 'desktop').toLowerCase()) {
    case 'mobile':
      return <MyPageSmartphoneIcon className="w-5 h-5" />;
    case 'tablet':
      return <MyPageSmartphoneIcon className="w-5 h-5" />;
    default:
      return <MyPageLaptopIcon className="w-5 h-5" />;
  }
};

export default function AccountSettingsSecurityRuntime({
  userProvider,
}: AccountSettingsSecurityRuntimeProps) {
  const navigate = useNavigate();
  const { logout } = useAuthAccessActions();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAdvancedSecurityDialog, setShowAdvancedSecurityDialog] = useState(false);
  const [showAdvancedSettingsDialog, setShowAdvancedSettingsDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState('');

  const isLocalUser = !userProvider || userProvider.toLowerCase() === 'local';
  const isDeleteConfirmMatched = deleteConfirmText === DELETE_CONFIRM_TEXT;

  const {
    data: securityEvents = [],
    isLoading: isSecurityEventsLoading,
    refetch: refetchSecurityEvents,
  } = useQuery<SecurityEventItem[]>({
    queryKey: ['accountSecurityEvents'],
    queryFn: getSecurityEvents,
    staleTime: 60_000,
  });

  const {
    data: deviceSessions = [],
    isLoading: isSessionLoading,
    isError: isSessionError,
    error: sessionError,
    refetch: refetchDeviceSessions,
  } = useQuery<DeviceSessionItem[]>({
    queryKey: ['accountSessions'],
    queryFn: getDeviceSessions,
    staleTime: 60_000,
  });

  const {
    data: trustedDevices = [],
    isLoading: isTrustedDevicesLoading,
    refetch: refetchTrustedDevices,
  } = useQuery({
    queryKey: ['trustedDevices'],
    queryFn: getTrustedDevices,
    staleTime: 60_000,
    enabled: showAdvancedSettingsDialog || showDeleteDialog,
  });

  const sortedDeviceSessions = useMemo(
    () =>
      [...deviceSessions].sort((left, right) => {
        const leftIsCurrent = left.isCurrent ? 1 : 0;
        const rightIsCurrent = right.isCurrent ? 1 : 0;
        if (leftIsCurrent !== rightIsCurrent) {
          return rightIsCurrent - leftIsCurrent;
        }

        const leftTime = left.lastActiveAt ? new Date(left.lastActiveAt).getTime() : 0;
        const rightTime = right.lastActiveAt ? new Date(right.lastActiveAt).getTime() : 0;
        return rightTime - leftTime;
      }),
    [deviceSessions],
  );
  const hasOtherDeviceSessions = useMemo(
    () => sortedDeviceSessions.some((session) => !session.isCurrent),
    [sortedDeviceSessions],
  );
  const otherDeviceSessionCount = useMemo(
    () => sortedDeviceSessions.filter((session) => !session.isCurrent).length,
    [sortedDeviceSessions],
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(isLocalUser ? password : undefined),
    onSuccess: (data) => {
      const recoveryUntil = data?.scheduledFor ? formatSessionTime(data.scheduledFor) : '';
      toast.success(
        recoveryUntil
          ? `탈퇴 예약이 완료되었습니다. ${recoveryUntil}까지 이메일 링크로 예약을 취소할 수 있습니다.`
          : '탈퇴 예약이 완료되었습니다.',
      );
      logout();
      navigate('/');
    },
    onError: (mutationError: unknown) => {
      toast.error(getApiErrorMessage(mutationError, '탈퇴 예약에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => deleteDeviceSession(sessionId),
    onSuccess: (message) => {
      toast.success(message);
      refetchDeviceSessions();
      refetchSecurityEvents();
    },
    onError: (mutationError: unknown) => {
      toast.error(getApiErrorMessage(mutationError, '기기 로그아웃에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  const deleteOtherSessionsMutation = useMutation({
    mutationFn: () => deleteOtherDeviceSessions(),
    onSuccess: (message) => {
      toast.success(message);
      refetchDeviceSessions();
      refetchSecurityEvents();
    },
    onError: (mutationError: unknown) => {
      const errorMessage = mutationError instanceof Error ? mutationError.message : '';
      if (errorMessage.includes('현재 세션을 확인하지 못해')) {
        toast.error('다른 기기 로그아웃을 완료하지 못했습니다.', {
          description: '보안을 위해 작업을 중단했습니다. 다시 로그인한 뒤 다시 시도해주세요.',
        });
        return;
      }
      toast.error(
        getApiErrorMessage(mutationError, '다른 기기 로그아웃에 실패했습니다. 다시 시도해주세요.'),
      );
    },
  });

  const removeTrustedDeviceMutation = useMutation({
    mutationFn: (deviceId: number) => deleteTrustedDevice(deviceId),
    onSuccess: () => {
      toast.success('신뢰 기기가 해제되었습니다.', {
        description: '현재 로그인 세션은 유지되고, 다음 로그인부터 새 기기로 다시 감지됩니다.',
      });
      refetchTrustedDevices();
      refetchSecurityEvents();
    },
    onError: (mutationError: unknown) => {
      toast.error(getApiErrorMessage(mutationError, '신뢰 기기 해제에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  useEffect(() => {
    if (!showDeleteDialog) {
      setPassword('');
      setDeleteConfirmText('');
      setShowPassword(false);
      setError('');
    }
  }, [showDeleteDialog]);

  const renderSecurityMeta = (event: SecurityEventItem) => {
    const parts = [event.deviceLabel, event.browser, event.os].filter(Boolean);
    const summary = parts.join(' · ');
    if (!summary && !event.ip) {
      return null;
    }

    return [summary, event.ip ? `IP: ${event.ip}` : null].filter(Boolean).join(' · ');
  };

  const formatSessionTime = (value?: string) => {
    if (!value) {
      return '시간 정보 없음';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAdvancedSectionRequest = () => {
    setShowAdvancedSecurityDialog(true);
  };

  const handleAdvancedSecurityConfirm = () => {
    setShowAdvancedSecurityDialog(false);
    setShowAdvancedSettingsDialog(true);
  };

  const handleDeleteDialogClose = () => {
    if (deleteMutation.isPending) {
      return;
    }
    setShowDeleteDialog(false);
  };

  const handleOpenDeleteDialog = () => {
    setShowAdvancedSettingsDialog(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setError('');

    if (isLocalUser && !password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    if (!isDeleteConfirmMatched) {
      setError('확인 문구를 정확히 입력해 주세요.');
      return;
    }

    await deleteMutation.mutateAsync();
  };

  return (
    <>
      <section className="mb-8">
        <h3 className="mb-4 text-body font-semibold text-muted-foreground">현재 기기</h3>
        {isSessionLoading ? (
          <p className="text-body text-muted-foreground">기기 정보를 불러오는 중입니다.</p>
        ) : isSessionError ? (
          <MyPageSeasonEmptyState
            className="mypage-season-empty--flush"
            tone="danger"
            icon={<MyPageShieldAlertIcon className="h-5 w-5" />}
            title="기기 정보를 불러오지 못했습니다."
            description={(
              <>
                다시 시도해 주세요.
                {sessionError instanceof Error ? ` (${sessionError.message})` : ''}
              </>
            )}
          />
        ) : sortedDeviceSessions.length > 0 ? (
          <div className="space-y-3">
            {sortedDeviceSessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-border bg-card/70 px-4 py-3"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50 text-foreground">
                      {getSessionIcon(session.deviceType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-body font-semibold text-foreground">
                          {session.deviceLabel || session.deviceType || '알 수 없음'}
                        </p>
                        {session.isCurrent ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-body font-semibold"
                            style={{
                              backgroundColor: 'var(--mp-win-bg)',
                              color: 'var(--mp-win)',
                            }}
                          >
                            현재 기기
                          </span>
                        ) : null}
                        {!session.isCurrent && session.isRevoked ? (
                          <span
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-body font-semibold"
                            style={{
                              backgroundColor: 'var(--mp-draw-bg)',
                              color: 'var(--mp-draw)',
                            }}
                          >
                            만료 추정
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-body text-muted-foreground">
                        {[session.browser || '브라우저', session.os || 'OS'].filter(Boolean).join(' · ')}
                      </p>

                      <div className="mt-3 grid gap-2 text-body text-muted-foreground sm:grid-cols-2">
                        <div className="rounded-md bg-muted/40 px-2.5 py-2">
                          <p className="font-semibold text-foreground/90">최근 활동</p>
                          <p className="mt-1">
                            {formatSessionTime(session.lastActiveAt || session.lastSeenAt)}
                          </p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2.5 py-2">
                          <p className="font-semibold text-foreground/90">네트워크</p>
                          <p className="mt-1">{session.ip || 'IP 정보 없음'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full shrink-0 sm:w-auto"
                      disabled={deleteSessionMutation.isPending}
                      onClick={() => deleteSessionMutation.mutate(session.id)}
                    >
                      세션 종료
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {sortedDeviceSessions.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={deleteOtherSessionsMutation.isPending}
                onClick={() => deleteOtherSessionsMutation.mutate()}
              >
                {deleteOtherSessionsMutation.isPending ? '세션 정리 중...' : '다른 기기에서 로그아웃'}
              </Button>
            )}
          </div>
        ) : (
          <MyPageSeasonEmptyState
            className="mypage-season-empty--flush"
            icon={<MyPageLaptopIcon className="h-5 w-5" />}
            title="기기 정보가 없습니다."
            description="로그인 세션이 확인되면 현재 기기와 다른 기기 목록이 여기에 표시됩니다."
          />
        )}
      </section>

      <section className="mb-8">
        <h3 className="mb-4 text-body font-semibold text-muted-foreground">최근 보안 활동</h3>
        {isSecurityEventsLoading ? (
          <p className="text-body text-muted-foreground">최근 보안 활동을 불러오는 중입니다.</p>
        ) : securityEvents.length > 0 ? (
          <div className="space-y-3">
            {securityEvents.map((event) => {
              const meta = renderSecurityMeta(event);
              return (
                <div
                  key={event.id}
                  className="rounded-xl border border-border bg-card/70 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/50 text-foreground">
                      <MyPageClockIcon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-body font-semibold leading-5 text-foreground">
                          {event.message}
                        </p>
                        <span className="shrink-0 text-body text-muted-foreground">
                          {formatSessionTime(event.occurredAt)}
                        </span>
                      </div>
                      {meta && (
                        <p className="mt-1 text-body text-muted-foreground">{meta}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <MyPageSeasonEmptyState
            className="mypage-season-empty--flush"
            icon={<MyPageClockIcon className="h-5 w-5" />}
            title="아직 보안 활동 기록이 없습니다."
            description="새 기기 로그인, 계정 연동 변경, 세션 정리 내역이 여기에 표시됩니다."
          />
        )}
      </section>

      <section className="border-t border-border pt-6">
        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/80 via-card to-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="space-y-1.5">
                <p className="font-semibold">고급 설정</p>
                <p className="text-body leading-relaxed text-muted-foreground">
                  자주 쓰지 않는 보안 작업만 따로 모아두었습니다. 보안 확인 후 팝업에서 열립니다.
                </p>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {['신뢰 기기 관리', '다른 기기 로그아웃', '탈퇴 예약'].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-body text-muted-foreground"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAdvancedSectionRequest}
              className="w-full sm:w-auto sm:flex-shrink-0"
              disabled={showAdvancedSecurityDialog}
            >
              <MyPageShieldAlertIcon className="mr-2 h-4 w-4" />
              보안 확인 후 열기
            </Button>
          </div>
        </div>
      </section>

      {(showAdvancedSettingsDialog || showDeleteDialog) && (
        <Suspense fallback={null}>
          <LazyAccountSettingsAdvancedRuntime
            showAdvancedSettingsDialog={showAdvancedSettingsDialog}
            showDeleteDialog={showDeleteDialog}
            onAdvancedDialogClose={() => setShowAdvancedSettingsDialog(false)}
            onDeleteDialogClose={handleDeleteDialogClose}
            onDeleteOtherSessions={() => deleteOtherSessionsMutation.mutate()}
            onTrustedDeviceRemove={(deviceId) => removeTrustedDeviceMutation.mutate(deviceId)}
            onOpenDeleteDialog={handleOpenDeleteDialog}
            onDeleteConfirm={handleDeleteConfirm}
            isDeleteOtherSessionsPending={deleteOtherSessionsMutation.isPending}
            hasOtherDeviceSessions={hasOtherDeviceSessions}
            otherDeviceSessionCount={otherDeviceSessionCount}
            trustedDevices={trustedDevices}
            isTrustedDevicesLoading={isTrustedDevicesLoading}
            isRemoveTrustedDevicePending={removeTrustedDeviceMutation.isPending}
            isDeletePending={deleteMutation.isPending}
            isLocalUser={isLocalUser}
            password={password}
            onPasswordChange={setPassword}
            showPassword={showPassword}
            onToggleShowPassword={() => setShowPassword((prev) => !prev)}
            deleteConfirmText={deleteConfirmText}
            onDeleteConfirmTextChange={setDeleteConfirmText}
            deleteConfirmTextPlaceholder={DELETE_CONFIRM_TEXT}
            isDeleteConfirmMatched={isDeleteConfirmMatched}
            deletePasswordInputClass={deletePasswordInputClass}
            error={error}
            formatSessionTime={formatSessionTime}
          />
        </Suspense>
      )}

      <VerificationRequiredDialog
        isOpen={showAdvancedSecurityDialog}
        onClose={() => setShowAdvancedSecurityDialog(false)}
        mode="security"
        title="고급 설정 진입"
        description={(
          <>
            탈퇴 예약과 같은 고급 설정은 본인 확인 후에만 열 수 있습니다.<br />
            확인 후에만 고급 설정 내용을 볼 수 있습니다.
          </>
        )}
        confirmLabel="고급 설정 진입"
        onConfirm={handleAdvancedSecurityConfirm}
      />
    </>
  );
}
