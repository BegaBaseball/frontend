import { CheckCircleIcon, XCircleIcon } from '../icons/PublicShellIcons';
import { AuthStatusPanel } from '../ui/auth-primitives';

interface SignUpStatusPanelProps {
  error?: string | null;
  isSuccess: boolean;
}

export default function SignUpStatusPanel({ error, isSuccess }: SignUpStatusPanelProps) {
  if (isSuccess) {
    return (
      <AuthStatusPanel tone="success" role="status">
        <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">회원가입 성공!</p>
          <p className="text-[16px]">환영합니다! 잠시 후 로그인 화면으로 이동합니다...</p>
        </div>
      </AuthStatusPanel>
    );
  }

  if (!error) {
    return null;
  }

  return (
    <AuthStatusPanel tone="error" role="alert">
      <XCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="space-y-1">
        <p className="font-semibold">회원가입 실패</p>
        <p className="text-[16px]">{error}</p>
      </div>
    </AuthStatusPanel>
  );
}
