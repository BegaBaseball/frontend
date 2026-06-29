import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  getAccountDeletionRecoveryInfo,
  requestAccountDeletionRecovery,
} from '../api/accountDeletionRecoveryPublic';
import { buildLoginPath, getStoredLoginRedirect } from '../utils/loginRedirect';
import AuthLayout from './auth/AuthLayout';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldAlertIcon,
} from './icons/PublicShellIcons';
import {
  AuthActionGroup,
  AuthHeader,
  AuthStatusPanel,
} from './ui/auth-primitives';
import { Button } from './ui/button';

const ACCOUNT_SETTINGS_REDIRECT_PATH = '/mypage?view=accountSettings';

const formatSchedule = (value?: string) => {
  if (!value) {
    return '삭제 예정 시각 정보를 확인할 수 없습니다.';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AccountDeletionRecovery() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const redirectPath = searchParams.get('redirect') || getStoredLoginRedirect() || ACCOUNT_SETTINGS_REDIRECT_PATH;
  const loginPath = buildLoginPath(redirectPath);
  const [scheduledFor, setScheduledFor] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadRecoveryInfo = async () => {
      if (!token) {
        setError('유효하지 않거나 만료된 복구 링크입니다.');
        setIsLoading(false);
        return;
      }

      try {
        const info = await getAccountDeletionRecoveryInfo(token);
        if (!cancelled) {
          setScheduledFor(info.scheduledFor);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '계정 복구 정보를 확인하지 못했습니다.');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRecoveryInfo();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleRecover = async () => {
    if (!token) {
      setError('유효하지 않거나 만료된 복구 링크입니다.');
      return;
    }

    setIsRecovering(true);
    setError('');

    try {
      await requestAccountDeletionRecovery(token);
      setIsRecovered(true);
    } catch (recoverError) {
      setError(recoverError instanceof Error ? recoverError.message : '계정 복구에 실패했습니다.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <AuthLayout>
      <button
        type="button"
        onClick={() => navigate(loginPath)}
        className="auth-back-link"
        data-testid="account-recovery-back-link"
      >
        <ArrowLeftIcon className="h-5 w-5" />
        <span>로그인 화면으로</span>
      </button>

      {isRecovered ? (
        <>
          <AuthHeader
            eyebrow="Recovery Complete"
            title="계정 복구 완료"
            description="탈퇴 예약이 취소되었습니다. 이제 기존 계정으로 다시 로그인할 수 있습니다."
            data-testid="account-recovery-header"
          />

          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary text-white">
              <CheckCircleIcon className="h-10 w-10" />
            </div>

            <AuthActionGroup>
              <Button
                type="button"
                variant="brand"
                size="touchLg"
                className="w-full"
                onClick={() => navigate(loginPath)}
                data-testid="account-recovery-login"
              >
                로그인하기
              </Button>
            </AuthActionGroup>
          </div>
        </>
      ) : (
        <>
          <AuthHeader
            eyebrow="Recovery Link"
            title="탈퇴 예약 취소"
            description="메일로 받은 링크를 통해 들어오셨다면 아래에서 탈퇴 예약을 취소하고 계정을 다시 사용할 수 있습니다."
            data-testid="account-recovery-header"
          />

          <div className="space-y-6" data-testid="account-recovery-panel">
            <div className="flex items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldAlertIcon className="h-7 w-7" />
              </div>
            </div>

            {isLoading ? (
              <AuthStatusPanel tone="default" data-testid="account-recovery-status-panel" role="status">
                <p className="text-body font-semibold">복구 가능 여부를 확인하고 있습니다.</p>
              </AuthStatusPanel>
            ) : error ? (
              <AuthStatusPanel tone="error" data-testid="account-recovery-status-panel" role="alert">
                <p className="text-body font-semibold">{error}</p>
              </AuthStatusPanel>
            ) : (
              <>
                <AuthStatusPanel tone="default" role="status">
                  <div className="space-y-2 text-body">
                    <p className="font-semibold text-foreground">최종 삭제 예정 시각</p>
                    <p>{formatSchedule(scheduledFor)}</p>
                    <p className="auth-helper-text">이 시각 전까지 예약을 취소할 수 있으며, 취소가 끝나면 다시 로그인할 수 있습니다.</p>
                  </div>
                </AuthStatusPanel>

                <AuthActionGroup>
                  <Button
                    type="button"
                    variant="brand"
                    size="touchLg"
                    className="w-full"
                    onClick={handleRecover}
                    disabled={isRecovering}
                    data-testid="account-recovery-submit"
                  >
                    {isRecovering ? '탈퇴 예약 취소 중...' : '탈퇴 예약 취소하기'}
                  </Button>
                </AuthActionGroup>
              </>
            )}
          </div>
        </>
      )}
    </AuthLayout>
  );
}
