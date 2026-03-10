import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from './ui/button';
import AuthLayout from './auth/AuthLayout';
import {
  getAccountDeletionRecoveryInfo,
  requestAccountDeletionRecovery,
} from '../api/profile';

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
      } catch (error) {
        if (!cancelled) {
          setError(error instanceof Error ? error.message : '계정 복구 정보를 확인하지 못했습니다.');
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
    } catch (error) {
      setError(error instanceof Error ? error.message : '계정 복구에 실패했습니다.');
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <AuthLayout>
      <button
        onClick={() => navigate('/login')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>로그인 화면으로</span>
      </button>

      {isRecovered ? (
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-emerald-600">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <h2 className="mb-4">계정 복구 완료</h2>
          <p className="text-gray-600 mb-8">
            탈퇴 예약이 취소되었습니다.<br />
            이제 기존 계정으로 다시 로그인할 수 있습니다.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full text-white py-6 rounded-full hover:opacity-90 bg-primary"
          >
            로그인하기
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-center mb-4">탈퇴 예약 취소</h2>
          <p className="text-center text-gray-600 mb-8">
            메일로 받은 링크를 통해 들어오셨다면 아래에서 탈퇴 예약을 취소하고 계정을 다시 사용할 수 있습니다.
          </p>

          {isLoading ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 text-center">
              복구 가능 여부를 확인하고 있습니다.
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 text-center">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-semibold mb-2">최종 삭제 예정 시각</p>
                <p>{formatSchedule(scheduledFor)}</p>
                <p className="mt-2 text-xs text-gray-500">이 시각 전까지 예약을 취소할 수 있으며, 취소가 끝나면 다시 로그인할 수 있습니다.</p>
              </div>

              <Button
                onClick={handleRecover}
                className="w-full text-white py-6 rounded-full hover:opacity-90 bg-primary"
                disabled={isRecovering}
              >
                {isRecovering ? '탈퇴 예약 취소 중...' : '탈퇴 예약 취소하기'}
              </Button>
            </div>
          )}
        </>
      )}
    </AuthLayout>
  );
}
