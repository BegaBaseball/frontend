import { useEffect, useMemo, useState } from 'react';
import { Laptop, Smartphone, ShieldAlert, Unlink, Link, Eye, EyeOff, AlertTriangle, Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  getConnectedProviders,
  getDeviceSessions,
  unlinkProvider,
  deleteAccount,
  deleteDeviceSession,
  deleteOtherDeviceSessions,
} from '../../api/profile';
import { getSocialLoginUrl, getLinkToken } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { type DeviceSessionItem } from '../../types/profile';
import { useMutation, useQuery } from '@tanstack/react-query';
import VerificationRequiredDialog from '../VerificationRequiredDialog';

interface AccountSettingsSectionProps {
  userProvider?: string;
  hasPassword?: boolean;
}

const DELETE_CONFIRM_TEXT = '정말로 삭제하시겠습니까?';
const LAST_METHOD_TOOLTIP = '최소 1개의 로그인 수단이 필요하여 해제할 수 없습니다.';

type ProviderKey = 'google' | 'kakao' | 'naver';

interface ProviderMeta {
  key: ProviderKey;
  label: string;
  icon: JSX.Element;
  connectedClass: string;
  disconnectedClass: string;
}

const PROVIDERS: ProviderMeta[] = [
  {
    key: 'google',
    label: 'Google',
    icon: (
      <div className="w-4 h-4 rounded-full overflow-hidden bg-white shadow">
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </div>
    ),
    connectedClass: 'from-blue-50 to-white border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300',
    disconnectedClass: 'from-gray-50 to-gray-100 border-gray-300 text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 dark:text-gray-400',
  },
  {
    key: 'kakao',
    label: 'Kakao',
    icon: (
      <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-xs font-bold text-black">
        k
      </div>
    ),
    connectedClass: 'from-amber-50 to-white border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-300',
    disconnectedClass: 'from-gray-50 to-gray-100 border-gray-300 text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 dark:text-gray-400',
  },
  {
    key: 'naver',
    label: 'Naver',
    icon: (
      <div className="w-4 h-4 rounded-full bg-[#03C75A] text-white flex items-center justify-center text-[10px] font-extrabold italic">
        N
      </div>
    ),
    connectedClass: 'from-green-50 to-white border-green-200 text-green-700 dark:border-green-800 dark:text-green-300',
    disconnectedClass: 'from-gray-50 to-gray-100 border-gray-300 text-gray-500 dark:from-gray-800 dark:to-gray-900 dark:border-gray-700 dark:text-gray-400',
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
  const { logout, user } = useAuthStore();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState('');
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [pendingUnlinkProvider, setPendingUnlinkProvider] = useState<ProviderKey | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const isLocalUser = !userProvider || userProvider.toLowerCase() === 'local';
  const isDeleteConfirmMatched = deleteConfirmText === DELETE_CONFIRM_TEXT;

  const { data: connectedProviders = [], isLoading: isProvidersLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['connectedProviders'],
    queryFn: getConnectedProviders,
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

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(isLocalUser ? password : undefined),
    onSuccess: () => {
      toast.success('계정이 성공적으로 삭제되었습니다.');
      logout();
      navigate('/');
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => deleteDeviceSession(sessionId),
    onSuccess: (message) => {
      toast.success(message);
      refetchDeviceSessions();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteOtherSessionsMutation = useMutation({
    mutationFn: () => deleteOtherDeviceSessions(),
    onSuccess: (message) => {
      toast.success(message);
      refetchDeviceSessions();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: string) => unlinkProvider(provider),
    onSuccess: () => {
      toast.success('계정 연동이 해제되었습니다.');
      refetchProviders();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      setPendingUnlinkProvider(null);
      setShowSecurityDialog(false);
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
    setShowSecurityDialog(true);
  };

  const handleUnlinkConfirm = async () => {
    if (!pendingUnlinkProvider) {
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
    setPendingUnlinkProvider(null);
  };

  const renderProviderCard = (provider: ProviderMeta) => {
    const isConnected = hasLinkedProvider(provider.key);
    const connectedEmail = getConnectedEmail(provider.key);
    const disabled = isLastLoginMethod(provider.key, isConnected);
    const isButtonDisabled = unlinkMutation.isPending || isProvidersLoading || (!isConnected ? isLinking : disabled);
    const button = (
      <Button
        variant={isConnected ? 'outline' : 'outline'}
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
      >
        {isConnected ? (
          <>
            <Unlink className="w-4 h-4 mr-2" />
            연동 해제
          </>
        ) : (
          <>
            <Link className="w-4 h-4 mr-2" />
            {isLinking ? '연동 중...' : '연동하기'}
          </>
        )}
      </Button>
    );

    const actionButton = disabled && isConnected ? (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">{button}</span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{LAST_METHOD_TOOLTIP}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : (
      button
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
              <p className={`text-xs ${isConnected ? 'text-emerald-600 dark:text-emerald-300' : 'text-gray-600 dark:text-gray-300'}`}>
                {isConnected ? '연동됨' : '연동되지 않음'}
              </p>
              {isConnected && connectedEmail && (
                <p className="text-xs text-gray-500 dark:text-gray-300 truncate mt-1">{connectedEmail}</p>
              )}
              {!isConnected && (
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                  3초 만에 연결하고 로그인 편하게 하기
                </p>
              )}
            </div>
          </div>
          {actionButton}
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

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-lg border-2 border-gray-100 dark:border-border p-8 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-primary">계정 설정</h2>
      </div>

      <section className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">로그인 연동 관리</h3>
        <div className="space-y-3">{PROVIDERS.map(renderProviderCard)}</div>
      </section>

      <section className="mb-8">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">현재 기기</h3>
        {isSessionLoading ? (
          <p className="text-sm text-gray-500 dark:text-gray-300">기기 정보를 불러오는 중입니다.</p>
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
                className="flex items-start justify-between gap-3 rounded-lg border border-gray-200 dark:border-border p-3 bg-gray-50 dark:bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center">
                    {getSessionIcon(session.deviceType)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {session.deviceLabel || session.deviceType || '알 수 없음'}
                      {session.isCurrent ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-900/30">
                          현재 기기
                          <span className="ml-1">/ Active Now</span>
                        </span>
                      ) : null}
                      {!session.isCurrent && session.isRevoked ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/30">
                          만료 추정
                        </span>
                      ) : null}
                    </p>
                <p className="text-xs text-gray-500 dark:text-gray-300 truncate">
                      {session.browser || '브라우저'}, {session.os || 'OS'} · 최근 활동: {formatSessionTime(session.lastActiveAt || session.lastSeenAt)}
                    </p>
                    {session.ip && (
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">IP: {session.ip}</p>
                    )}
                  </div>
                </div>
                {!session.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    disabled={deleteSessionMutation.isPending}
                    onClick={() => deleteSessionMutation.mutate(session.id)}
                  >
                    세션 종료
                  </Button>
                )}
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
          <p className="text-sm text-gray-500 dark:text-gray-300">
            기기 정보가 없습니다.
          </p>
        )}
      </section>

      <section className="border-t border-gray-200 dark:border-border pt-6">
        <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          위험 구역
        </h3>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">계정 삭제</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                계정을 삭제하면 모든 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="flex-shrink-0"
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              계정 삭제
            </Button>
          </div>
        </div>
      </section>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {DELETE_CONFIRM_TEXT}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>이 작업은 되돌릴 수 없습니다. 계정을 삭제하면 다음 데이터가 모두 삭제됩니다.</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>프로필 정보</li>
                <li>작성한 게시글 및 댓글</li>
                <li>직관 일기</li>
                <li>메이트 신청 내역</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {error && (
            <Alert variant="destructive" className="my-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>오류</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isLocalUser && (
            <div className="my-4 space-y-2">
              <Label htmlFor="deletePassword">비밀번호 확인</Label>
              <div className="relative">
                <Input
                  id="deletePassword"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호를 입력하세요"
                  className="pr-10"
                  disabled={deleteMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <div className="my-2 space-y-2">
            <Label htmlFor="deleteConfirmText">2차 확인</Label>
            <Input
              id="deleteConfirmText"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_CONFIRM_TEXT}
              className="font-medium"
              disabled={deleteMutation.isPending}
            />
            <p className="text-xs text-gray-500 dark:text-gray-300">위 문구를 정확히 입력해 주세요.</p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending || !isDeleteConfirmMatched}
            >
              {deleteMutation.isPending ? '삭제 중...' : '계정 삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VerificationRequiredDialog
        isOpen={showSecurityDialog}
        onClose={handleUnlinkDialogClose}
        mode="security"
        title="연동 해제"
        description={(
          <>
            로그인 수단을 변경하기 전에 본인 확인이 필요합니다.<br />
            계속 진행하면 연동이 해제됩니다.
          </>
        )}
        confirmLabel="연동 해제 진행"
        onConfirm={handleUnlinkConfirm}
      />
    </div>
  );
}
