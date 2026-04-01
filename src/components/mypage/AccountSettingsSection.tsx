import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Laptop, Smartphone, ShieldAlert, Unlink, Link, Eye, EyeOff, AlertTriangle, Trash2, Clock3, Fingerprint } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import PlainDialog from '../ui/plain-dialog';
import {
  getConnectedProviders,
  getDeviceSessions,
  unlinkProvider,
  deleteAccount,
  deleteDeviceSession,
  deleteOtherDeviceSessions,
  getSecurityEvents,
  getTrustedDevices,
  deleteTrustedDevice,
} from '../../api/profile';
import { getSocialLoginUrl, getLinkToken } from '../../api/auth';
import { useAuthAccessActions } from '../../store/authStore';
import { useAuthRedirectState } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { ACCOUNT_SETTINGS_REDIRECT_PATH } from '../../utils/authFlow';
import { type DeviceSessionItem, type SecurityEventItem, type TrustedDeviceItem } from '../../types/profile';
import { useMutation, useQuery } from '@tanstack/react-query';
import VerificationRequiredDialog from '../VerificationRequiredDialog';

interface AccountSettingsSectionProps {
  userProvider?: string;
  hasPassword?: boolean;
}

const DELETE_CONFIRM_TEXT = '정말로 삭제하시겠습니까?';
const LAST_METHOD_TOOLTIP = '현재 로그인 중인 유일한 수단이라 해제할 수 없습니다.';
const deletePasswordInputClass = 'auth-autofill-input pr-10';

type ProviderKey = 'google' | 'kakao' | 'naver';

interface ProviderMeta {
  key: ProviderKey;
  label: string;
  icon: ReactElement;
  connectedClass: string;
  disconnectedClass: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    key: 'google',
    label: 'Google',
    icon: (
      <div className="w-4 h-4 rounded-full overflow-hidden bg-card shadow">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </div>
    ),
    connectedClass:
      'from-blue-50 to-card border-blue-200 text-blue-700 dark:from-blue-950/40 dark:to-card dark:border-blue-800 dark:text-blue-300',
    disconnectedClass:
      'from-muted/60 to-card border-border text-muted-foreground dark:from-card/70 dark:border-border',
  },
  {
    key: 'kakao',
    label: 'Kakao',
    icon: (
      <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-black">
        k
      </div>
    ),
    connectedClass:
      'from-amber-50 to-card border-amber-200 text-amber-700 dark:from-amber-950/40 dark:to-card dark:border-amber-800 dark:text-amber-300',
    disconnectedClass:
      'from-muted/60 to-card border-border text-muted-foreground dark:from-card/70 dark:border-border',
  },
  {
    key: 'naver',
    label: 'Naver',
    icon: (
      <div className="w-4 h-4 rounded-full bg-[#03C75A] text-white flex items-center justify-center text-[10px] font-extrabold italic">
        N
      </div>
    ),
    connectedClass:
      'from-green-50 to-card border-green-200 text-green-700 dark:from-green-950/40 dark:to-card dark:border-green-800 dark:text-green-300',
    disconnectedClass:
      'from-muted/60 to-card border-border text-muted-foreground dark:from-card/70 dark:border-border',
  },
];

const getSessionIcon = (deviceType?: string) => {
  switch ((deviceType || 'desktop').toLowerCase()) {
    case 'mobile':
      return <Smartphone className="w-5 h-5" />;
    case 'tablet':
      return <Smartphone className="w-5 h-5" />;
    default:
      return <Laptop className="w-5 h-5" />;
  }
};

export default function AccountSettingsSection({ userProvider, hasPassword = true }: AccountSettingsSectionProps) {
  const navigate = useNavigate();
  const { logout } = useAuthAccessActions();
  const { setPendingLoginRedirect } = useAuthRedirectState();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState('');
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [securityDialogMode, setSecurityDialogMode] = useState<'unlink' | 'delete' | null>(null);
  const [showAdvancedSettingsDialog, setShowAdvancedSettingsDialog] = useState(false);
  const [pendingUnlinkProvider, setPendingUnlinkProvider] = useState<ProviderKey | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const isLocalUser = !userProvider || userProvider.toLowerCase() === 'local';
  const isDeleteConfirmMatched = deleteConfirmText === DELETE_CONFIRM_TEXT;

  const { data: connectedProviders = [], isLoading: isProvidersLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['connectedProviders'],
    queryFn: getConnectedProviders,
  });

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
    data: trustedDevices = [],
    isLoading: isTrustedDevicesLoading,
    refetch: refetchTrustedDevices,
  } = useQuery<TrustedDeviceItem[]>({
    queryKey: ['trustedDevices'],
    queryFn: getTrustedDevices,
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
    [deviceSessions]
  );
  const hasOtherDeviceSessions = useMemo(() => sortedDeviceSessions.some((session) => !session.isCurrent), [sortedDeviceSessions]);
  const otherDeviceSessionCount = useMemo(
    () => sortedDeviceSessions.filter((session) => !session.isCurrent).length,
    [sortedDeviceSessions]
  );

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(isLocalUser ? password : undefined),
    onSuccess: (data) => {
      const recoveryUntil = data?.scheduledFor ? formatSessionTime(data.scheduledFor) : '';
      toast.success(
        recoveryUntil
          ? `탈퇴 예약이 완료되었습니다. ${recoveryUntil}까지 이메일 링크로 예약을 취소할 수 있습니다.`
          : '탈퇴 예약이 완료되었습니다.'
      );
      logout();
      navigate('/');
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, '탈퇴 예약에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => deleteDeviceSession(sessionId),
    onSuccess: (message) => {
      toast.success(message);
      refetchDeviceSessions();
      refetchSecurityEvents();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, '기기 로그아웃에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  const deleteOtherSessionsMutation = useMutation({
    mutationFn: () => deleteOtherDeviceSessions(),
    onSuccess: (message) => {
      toast.success(message);
      refetchDeviceSessions();
      refetchSecurityEvents();
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('현재 세션을 확인하지 못해')) {
        toast.error('다른 기기 로그아웃을 완료하지 못했습니다.', {
          description: '보안을 위해 작업을 중단했습니다. 다시 로그인한 뒤 다시 시도해주세요.',
        });
        return;
      }
      toast.error(getApiErrorMessage(error, '다른 기기 로그아웃에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: string) => unlinkProvider(provider),
    onSuccess: () => {
      toast.success('계정 연동이 해제되었습니다.');
      refetchProviders();
      refetchSecurityEvents();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, '연동 해제에 실패했습니다. 다시 시도해주세요.'));
    },
    onSettled: () => {
      setPendingUnlinkProvider(null);
      setShowSecurityDialog(false);
      setSecurityDialogMode(null);
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
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, '신뢰 기기 해제에 실패했습니다. 다시 시도해주세요.'));
    },
  });

  const hasLinkedProvider = (provider: ProviderKey) =>
    connectedProviders.some((item) => item.provider.toLowerCase() === provider);

  const getConnectedEmail = (provider: ProviderKey) => {
    const found = connectedProviders.find((item) => item.provider.toLowerCase() === provider);
    return found?.email || '';
  };

  const linkedCount = connectedProviders.length;
  const isLastLoginMethod = (provider: ProviderKey, isConnected: boolean) => {
    if (!isConnected) {
      return false;
    }
    return !hasPassword && linkedCount <= 1;
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

  const handleLinkAccount = async (provider: ProviderKey) => {
    setIsLinking(true);
    try {
      const { linkToken } = await getLinkToken();
      setPendingLoginRedirect(ACCOUNT_SETTINGS_REDIRECT_PATH);
      const targetUrl = getSocialLoginUrl(provider, { mode: 'link', linkToken });
      window.location.href = targetUrl;
    } catch (error: unknown) {
      setIsLinking(false);
      toast.error(getApiErrorMessage(error, '연동 토큰 발급에 실패했습니다. 다시 로그인해주세요.'));
    }
  };

  const handleUnlinkRequest = (provider: ProviderKey, isConnected: boolean) => {
    if (!isConnected || isProvidersLoading || unlinkMutation.isPending) {
      return;
    }

    if (isLastLoginMethod(provider, isConnected)) {
      return;
    }

    setPendingUnlinkProvider(provider);
    setSecurityDialogMode('unlink');
    setShowSecurityDialog(true);
  };

  const handleSecurityConfirm = async () => {
    if (securityDialogMode === 'delete') {
      setShowSecurityDialog(false);
      setSecurityDialogMode(null);
      setShowAdvancedSettingsDialog(true);
      return;
    }

    if (!pendingUnlinkProvider || securityDialogMode !== 'unlink') {
      return;
    }

    if (isLastLoginMethod(pendingUnlinkProvider, true)) {
      toast.error(LAST_METHOD_TOOLTIP);
      setShowSecurityDialog(false);
      setPendingUnlinkProvider(null);
      return;
    }

    unlinkMutation.mutate(pendingUnlinkProvider);
  };

  const handleUnlinkDialogClose = () => {
    setShowSecurityDialog(false);
    setSecurityDialogMode(null);
    setPendingUnlinkProvider(null);
  };

  const handleAdvancedSectionRequest = () => {
    setSecurityDialogMode('delete');
    setShowSecurityDialog(true);
  };

  const handleOpenDeleteDialog = () => {
    setShowAdvancedSettingsDialog(false);
    setShowDeleteDialog(true);
  };

  const handleDeleteOtherSessions = () => {
    deleteOtherSessionsMutation.mutate();
  };

  const handleTrustedDeviceRemove = (deviceId: number) => {
    removeTrustedDeviceMutation.mutate(deviceId);
  };

  const renderSecurityMeta = (event: SecurityEventItem) => {
    const parts = [event.deviceLabel, event.browser, event.os].filter(Boolean);
    const summary = parts.join(' · ');
    if (!summary && !event.ip) {
      return null;
    }

    return [summary, event.ip ? `IP: ${event.ip}` : null].filter(Boolean).join(' · ');
  };

  const renderProviderCard = (provider: ProviderMeta) => {
    const isConnected = hasLinkedProvider(provider.key);
    const connectedEmail = getConnectedEmail(provider.key);
    const disabled = isLastLoginMethod(provider.key, isConnected);
    const isButtonDisabled = unlinkMutation.isPending || isProvidersLoading || (!isConnected ? isLinking : disabled);
    const helperTextId = `${provider.key}-provider-helper`;
    const button = (
      <Button
        variant="outline"
        size="sm"
        disabled={isButtonDisabled}
        onClick={() => {
          if (isConnected) {
            handleUnlinkRequest(provider.key, isConnected);
            return;
          }
          handleLinkAccount(provider.key);
        }}
        className="h-9 px-3"
        aria-describedby={disabled && isConnected ? helperTextId : undefined}
      >
        {isConnected ? (
          disabled ? (
            <>
              <ShieldAlert className="w-4 h-4 mr-2" />
              현재 로그인 방식
            </>
          ) : (
            <>
              <Unlink className="w-4 h-4 mr-2" />
              연동 해제
            </>
          )
        ) : (
          <>
            <Link className="w-4 h-4 mr-2" />
            {isLinking ? '연동 중...' : '연동하기'}
          </>
        )}
      </Button>
    );

    return (
      <div
        key={provider.key}
        className={`rounded-xl border px-4 py-3 bg-gradient-to-br ${isConnected ? provider.connectedClass : provider.disconnectedClass}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className={isConnected ? '' : 'grayscale opacity-70'}>{provider.icon}</span>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{provider.label}</p>
              <p className={`text-xs ${isConnected ? 'text-emerald-600 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                {isConnected ? '연동됨' : '연동되지 않음'}
              </p>
              {isConnected && connectedEmail && (
                <p className="text-xs text-muted-foreground truncate mt-1">{connectedEmail}</p>
              )}
              {!isConnected && (
                <p className="text-xs text-muted-foreground mt-1">
                  3초 만에 연결하고 로그인 편하게 하기
                </p>
              )}
              {disabled && isConnected && (
                <p
                  id={helperTextId}
                  className="mt-2 text-xs text-amber-700 dark:text-amber-300"
                >
                  {LAST_METHOD_TOOLTIP}
                </p>
              )}
            </div>
          </div>
          {button}
        </div>
      </div>
    );
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

  useEffect(() => {
    if (!showDeleteDialog) {
      setPassword('');
      setDeleteConfirmText('');
      setShowPassword(false);
      setError('');
    }
  }, [showDeleteDialog]);

  const handleDeleteDialogClose = () => {
    if (deleteMutation.isPending) {
      return;
    }
    setShowDeleteDialog(false);
  };

  return (
      <div className="bg-card rounded-2xl shadow-lg border-2 border-border p-8 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-primary">계정 설정</h2>
      </div>

      <section className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">로그인 연동 관리</h3>
        <div className="space-y-3">{PROVIDERS.map(renderProviderCard)}</div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">현재 기기</h3>
        {isSessionLoading ? (
          <p className="text-sm text-muted-foreground">기기 정보를 불러오는 중입니다.</p>
        ) : isSessionError ? (
          <p className="text-sm text-red-500 dark:text-red-400">
            기기 정보를 불러오지 못했습니다. 다시 시도해 주세요.
            {sessionError instanceof Error ? ` (${sessionError.message})` : ''}
          </p>
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
                        <p className="text-sm font-semibold text-foreground">
                          {session.deviceLabel || session.deviceType || '알 수 없음'}
                        </p>
                        {session.isCurrent ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                            현재 기기
                          </span>
                        ) : null}
                        {!session.isCurrent && session.isRevoked ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                            만료 추정
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {[session.browser || '브라우저', session.os || 'OS'].filter(Boolean).join(' · ')}
                      </p>

                      <div className="mt-3 grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                        <div className="rounded-md bg-muted/40 px-2.5 py-2">
                          <p className="font-medium text-foreground/90">최근 활동</p>
                          <p className="mt-1">{formatSessionTime(session.lastActiveAt || session.lastSeenAt)}</p>
                        </div>
                        <div className="rounded-md bg-muted/40 px-2.5 py-2">
                          <p className="font-medium text-foreground/90">네트워크</p>
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
            <p className="text-sm text-muted-foreground">
              기기 정보가 없습니다.
            </p>
        )}
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">최근 보안 활동</h3>
        {isSecurityEventsLoading ? (
          <p className="text-sm text-muted-foreground">최근 보안 활동을 불러오는 중입니다.</p>
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
                      <Clock3 className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-semibold leading-5 text-foreground">{event.message}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatSessionTime(event.occurredAt)}
                        </span>
                      </div>
                      {meta && (
                        <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 보안 활동 기록이 없습니다. 새 기기 로그인, 계정 연동 변경, 세션 정리 내역이 여기에 표시됩니다.
          </p>
        )}
      </section>

      <section className="border-t border-border pt-6">
        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/80 via-card to-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium">고급 설정</p>
                <p className="text-sm text-muted-foreground mt-1">
                  자주 쓰지 않는 보안 작업만 따로 모아두었습니다. 보안 확인 후 팝업에서 열립니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {['신뢰 기기 관리', '다른 기기 로그아웃', '탈퇴 예약'].map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground"
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
              className="flex-shrink-0"
              disabled={showSecurityDialog}
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              보안 확인 후 열기
            </Button>
          </div>
        </div>
      </section>

      <PlainDialog
        open={showAdvancedSettingsDialog}
        onClose={() => setShowAdvancedSettingsDialog(false)}
        title="고급 설정"
        description="평소에는 자주 쓰지 않지만, 계정 보호나 정리가 필요할 때 사용하는 기능입니다. 일부 작업은 현재 로그인 상태와 다른 기기에 영향을 줄 수 있습니다."
        className="sm:max-w-2xl"
        footer={(
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setShowAdvancedSettingsDialog(false)}>
            닫기
          </Button>
        )}
      >
          <div className="space-y-4 pt-1">
            <div className="rounded-xl border border-border bg-card/80 p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">보안 정리</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {hasOtherDeviceSessions ? `${otherDeviceSessionCount}대 정리 가능` : '추가 정리 없음'}
                </span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                현재 사용 중인 기기를 제외한 나머지 로그인 세션을 정리합니다. 공용 기기나 더 이상 쓰지 않는 기기에서 로그인한 적이 있다면 사용하세요.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteOtherSessions}
                disabled={deleteOtherSessionsMutation.isPending || !hasOtherDeviceSessions}
                className="w-full"
              >
                {deleteOtherSessionsMutation.isPending ? '세션 정리 중...' : '다른 기기에서 로그아웃'}
              </Button>
              {!hasOtherDeviceSessions && (
                <p className="mt-2 text-[11px] text-muted-foreground">지금은 정리할 다른 기기 세션이 없습니다.</p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card/80 p-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">신뢰 기기 관리</p>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
                  {trustedDevices.length}대 등록됨
                </span>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                로그인 성공 시 자동 등록된 기기 목록입니다. 해제해도 현재 로그인 세션은 유지되며, 다음 로그인부터 새 기기로 다시 감지됩니다.
              </p>
              {isTrustedDevicesLoading ? (
                <p className="text-xs text-muted-foreground">신뢰 기기 정보를 불러오는 중입니다.</p>
              ) : trustedDevices.length > 0 ? (
                <div className="space-y-2">
                  {trustedDevices.map((device) => (
                    <div
                      key={device.id}
                      className="rounded-lg border border-border bg-background/80 px-3 py-3"
                    >
                      <div className="space-y-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{device.deviceLabel}</p>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              신뢰 중
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[device.browser, device.os].filter(Boolean).join(' · ')}
                          </p>
                        </div>

                        <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
                          <div className="rounded-md bg-muted/40 px-2.5 py-2">
                            <p className="font-medium text-foreground/90">최근 확인</p>
                            <p className="mt-1">{formatSessionTime(device.lastSeenAt)}</p>
                          </div>
                          <div className="rounded-md bg-muted/40 px-2.5 py-2">
                            <p className="font-medium text-foreground/90">기기 정보</p>
                            <p className="mt-1">{[device.browser, device.os].filter(Boolean).join(' · ') || '정보 없음'}</p>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTrustedDeviceRemove(device.id)}
                          disabled={removeTrustedDeviceMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          이 기기 신뢰 해제
                        </Button>
                        {device.lastIp && (
                          <p className="text-[11px] text-muted-foreground/80">마지막 IP: {device.lastIp}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">등록된 신뢰 기기가 없습니다.</p>
              )}
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/80 p-5 dark:border-red-800 dark:bg-red-900/20">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-red-700 dark:text-red-300" />
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">탈퇴 예약</p>
                </div>
                <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                  7일 유예
                </span>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-red-200 bg-white/70 px-2.5 py-1 text-[11px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                  즉시 로그아웃
                </span>
                <span className="rounded-full border border-red-200 bg-white/70 px-2.5 py-1 text-[11px] text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                  이메일 링크로 취소 가능
                </span>
              </div>
              <p className="mb-4 text-xs text-red-600 dark:text-red-400">
                정말 필요한 경우에만 진행하세요. 예약 즉시 로그아웃되며, 7일 동안은 이메일 복구 링크로 취소할 수 있습니다. 유예 기간이 지나면 최종 삭제 절차가 진행됩니다.
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleOpenDeleteDialog}
                className="w-full"
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                탈퇴 예약
              </Button>
            </div>

          </div>
      </PlainDialog>

      <PlainDialog
        open={showDeleteDialog}
        onClose={handleDeleteDialogClose}
        title={(
          <span className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            탈퇴 예약 확인
          </span>
        )}
        className="sm:max-w-lg"
        hideCloseButton={deleteMutation.isPending}
        footer={(
          <>
            <Button variant="outline" onClick={handleDeleteDialogClose} disabled={deleteMutation.isPending}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || !isDeleteConfirmMatched}
            >
              {deleteMutation.isPending ? '예약 중...' : '탈퇴 예약'}
            </Button>
          </>
        )}
      >
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>탈퇴 예약을 진행하면 즉시 로그아웃되며, 7일 후 최종 삭제 절차가 진행됩니다.</p>
            <ul className="list-disc list-inside space-y-1">
              <li>유예 기간 동안 로그인과 토큰 재발급이 차단됩니다.</li>
              <li>이메일로 전달된 복구 링크로 7일 안에 예약을 취소할 수 있습니다.</li>
              <li>유예 기간이 지나면 기존과 동일한 데이터 정리 절차가 시작됩니다.</li>
            </ul>
            <p>본인이 직접 요청한 경우에만 아래 확인을 진행해 주세요.</p>
          </div>

          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLocalUser && (
            <div className="my-4 space-y-2">
              <label htmlFor="deletePassword" className="text-sm font-medium text-foreground">
                비밀번호 확인
              </label>
              <div className="relative">
                <Input
                  id="deletePassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className={deletePasswordInputClass}
                  disabled={deleteMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="my-2 space-y-2">
            <label htmlFor="deleteConfirmText" className="text-sm font-medium text-foreground">
              확인 문구 입력
            </label>
            <Input
              id="deleteConfirmText"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_TEXT}
              className="font-medium"
              disabled={deleteMutation.isPending}
            />
            <p className="text-xs text-muted-foreground">위 문구를 정확히 입력하면 탈퇴 예약이 진행됩니다.</p>
          </div>
      </PlainDialog>

      <VerificationRequiredDialog
        isOpen={showSecurityDialog}
        onClose={handleUnlinkDialogClose}
        mode="security"
        title={securityDialogMode === 'delete' ? '고급 설정 진입' : '연동 해제'}
        description={(
          <>
            {securityDialogMode === 'delete' ? (
              <>
                탈퇴 예약과 같은 고급 설정은 본인 확인 후에만 열 수 있습니다.<br />
                확인 후에만 고급 설정 내용을 볼 수 있습니다.
              </>
            ) : (
              <>
                로그인 수단을 변경하기 전에 본인 확인이 필요합니다.<br />
                계속 진행하면 연동이 해제됩니다.
              </>
            )}
          </>
        )}
        confirmLabel={securityDialogMode === 'delete' ? '고급 설정 진입' : '연동 해제 진행'}
        onConfirm={handleSecurityConfirm}
      />
    </div>
  );
}
