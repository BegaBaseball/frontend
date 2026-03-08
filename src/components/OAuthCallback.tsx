// src/components/OAuthCallback.tsx
import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { consumeOAuth2State } from '../api/auth';
import LoadingSpinner from './LoadingSpinner';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fetchProfileAndAuthenticate = useAuthStore((state) => state.fetchProfileAndAuthenticate);
  const [error, setError] = useState(false);

  const hasCalled = useRef(false);

  useEffect(() => {
    const state = searchParams.get('state');

    if (!state) {
      navigate('/login', { replace: true });
      return;
    }

    if (hasCalled.current) return;
    hasCalled.current = true;

    (async () => {
      try {
        const data = await consumeOAuth2State(state);
        const { email, name, handle } = data;

        if (email && name) {
          await fetchProfileAndAuthenticate();
          const { isLoggedIn, user } = useAuthStore.getState();

          if (!isLoggedIn || !user) {
            throw new Error('로그인 상태 동기화 실패');
          }

          const normalizedHandle = (handle || user.handle || '').trim();
          const redirectPath = normalizedHandle
            ? `/mypage/${normalizedHandle.startsWith('@') ? normalizedHandle : `@${normalizedHandle}`}`
            : '/mypage';
          navigate(redirectPath, { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch {
        setError(true);
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    })();
  }, [searchParams, navigate, fetchProfileAndAuthenticate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <p className="font-semibold mb-2 text-red-600 dark:text-red-400">
            로그인 처리에 실패했습니다.
          </p>
          <p className="text-muted-foreground text-sm">
            로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <LoadingSpinner text="로그인 처리 중..." />
  );
}
