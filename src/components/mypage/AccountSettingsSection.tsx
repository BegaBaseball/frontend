import { lazy, Suspense, useState, type ReactElement } from 'react';
import { Button } from '../ui/button';
import '../common/autofill-input.css';
import {
  getConnectedProviders,
  unlinkProvider,
} from '../../api/profile';
import { getSocialLoginUrl } from '../../api/authPublic';
import { getLinkToken } from '../../api/authPrivate';
import { useAuthAccessActions, useAuthRedirectState } from '../../store/authStore';
import { toast } from 'sonner';
import { getApiErrorMessage } from '../../utils/errorUtils';
import { ACCOUNT_SETTINGS_REDIRECT_PATH } from '../../utils/authFlow';
import { useMutation, useQuery } from '@tanstack/react-query';
import VerificationRequiredDialog from '../VerificationRequiredDialog';
import ViewportDeferred from '../ViewportDeferred';
import PlainDialog from '../ui/plain-dialog';
import {
  MyPageLinkIcon,
  MyPageShieldAlertIcon,
  MyPageTrashIcon,
  MyPageUnlinkIcon,
} from './MyPageIcons';

interface AccountSettingsSectionProps {
  userProvider?: string;
  hasPassword?: boolean;
}

const LAST_METHOD_TOOLTIP = '현재 로그인 중인 유일한 수단이라 해제할 수 없습니다.';
const LazyAccountSettingsSecurityRuntime = lazy(() => import('./AccountSettingsSecurityRuntime'));

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
      'from-muted/70 to-card border-border text-muted-foreground',
    disconnectedClass:
      'from-muted/60 to-card border-border text-muted-foreground',
  },
  {
    key: 'kakao',
    label: 'Kakao',
    icon: (
      <div
        className="w-4 h-4 rounded-full flex items-center justify-center text-body font-bold"
        style={{
          backgroundColor: 'hsl(var(--status-warning-text))',
          color: 'hsl(var(--foreground))',
        }}
      >
        k
      </div>
    ),
    connectedClass:
      'from-muted/70 to-card border-border text-muted-foreground',
    disconnectedClass:
      'from-muted/60 to-card border-border text-muted-foreground',
  },
  {
    key: 'naver',
    label: 'Naver',
    icon: (
      <div
        className="w-4 h-4 rounded-full text-body font-extrabold italic flex items-center justify-center"
        style={{
          backgroundColor: 'hsl(var(--status-success-text))',
          color: 'hsl(var(--foreground))',
        }}
      >
        N
      </div>
    ),
    connectedClass:
      'from-muted/70 to-card border-border text-muted-foreground',
    disconnectedClass:
      'from-muted/60 to-card border-border text-muted-foreground',
  },
];

export default function AccountSettingsSection({ userProvider, hasPassword = true }: AccountSettingsSectionProps) {
  const { setPendingLoginRedirect } = useAuthRedirectState();
  const { logout } = useAuthAccessActions();

  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [pendingUnlinkProvider, setPendingUnlinkProvider] = useState<ProviderKey | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const { data: connectedProviders = [], isLoading: isProvidersLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['connectedProviders'],
    queryFn: getConnectedProviders,
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: string) => unlinkProvider(provider),
    onSuccess: () => {
      toast.success('계정 연동이 해제되었습니다.');
      refetchProviders();
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, '연동 해제에 실패했습니다. 다시 시도해주세요.'));
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
    setShowSecurityDialog(true);
  };

  const handleSecurityConfirm = async () => {
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
              <MyPageShieldAlertIcon className="w-4 h-4 mr-2" />
              현재 로그인 방식
            </>
          ) : (
            <>
              <MyPageUnlinkIcon className="w-4 h-4 mr-2" />
              연동 해제
            </>
          )
        ) : (
          <>
            <MyPageLinkIcon className="w-4 h-4 mr-2" />
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
              <p className="font-semibold text-body">{provider.label}</p>
              <p className={`text-body ${isConnected ? 'text-foreground' : 'text-muted-foreground'}`}>
                {isConnected ? '연동됨' : '연동되지 않음'}
              </p>
              {isConnected && connectedEmail && (
                <p className="text-body text-muted-foreground truncate mt-1">{connectedEmail}</p>
              )}
              {!isConnected && (
                <p className="text-body text-muted-foreground mt-1">
                  3초 만에 연결하고 로그인 편하게 하기
                </p>
              )}
              {disabled && isConnected && (
                <p
                  id={helperTextId}
                  className="mt-2 text-body text-destructive"
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

  return (
    <div className="mypage-card-panel mypage-account-panel">
      <div className="flex items-center gap-3 mb-6">
        <MyPageShieldAlertIcon className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold text-primary">계정 설정</h2>
      </div>

      <section className="mb-8">
        <h3 className="text-body font-semibold text-muted-foreground mb-4">로그인 연동 관리</h3>
        <div className="space-y-3">{PROVIDERS.map(renderProviderCard)}</div>
      </section>

      <section className="mb-8">
        <h3 className="text-body font-semibold text-muted-foreground mb-4">계정 액션</h3>
        <button
          type="button"
          className="mypage-card-setting-row is-danger"
          data-testid="mypage-account-logout"
          onClick={() => setShowLogoutDialog(true)}
        >
          <span className="mypage-card-setting-icon" aria-hidden="true">
            <MyPageTrashIcon className="h-4 w-4" />
          </span>
          <span className="mypage-card-setting-copy">
            <span className="mypage-card-setting-name">로그아웃</span>
            <span className="mypage-card-setting-desc">현재 기기에서 계정을 로그아웃합니다</span>
          </span>
        </button>
      </section>

      <ViewportDeferred
        fallback={(
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card/70 px-4 py-6 text-body text-muted-foreground">
              기기 및 보안 활동을 불러오는 중입니다.
            </div>
          </div>
        )}
        rootMargin="220px 0px 300px 0px"
      >
        <Suspense fallback={null}>
          <LazyAccountSettingsSecurityRuntime userProvider={userProvider} />
        </Suspense>
      </ViewportDeferred>

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
        onConfirm={handleSecurityConfirm}
      />

      <PlainDialog
        open={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        title="로그아웃"
        description="현재 기기에서 계정을 로그아웃할까요?"
        className="max-w-md"
        footer={(
          <>
            <Button variant="outline" onClick={() => setShowLogoutDialog(false)}>
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLogoutDialog(false);
                logout();
              }}
            >
              로그아웃
            </Button>
          </>
        )}
      >
        <p className="text-body text-muted-foreground">
          저장되지 않은 작업이 있다면 먼저 마무리한 뒤 진행해주세요.
        </p>
      </PlainDialog>
    </div>
  );
}
