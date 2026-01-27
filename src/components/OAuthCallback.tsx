// src/components/OAuthCallback.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { consumeOAuth2State } from '../api/auth';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const fetchProfileAndAuthenticate = useAuthStore((state) => state.fetchProfileAndAuthenticate);
  const [error, setError] = useState(false);

  useEffect(() => {
    const state = searchParams.get('state');

    if (!state) {
      navigate('/login', { replace: true });
      return;
    }

    (async () => {
      try {
        const data = await consumeOAuth2State(state);
        const { email, name, role, profileImageUrl, favoriteTeam, handle } = data;

        if (email && name) {
          login(
            email,
            name,
            profileImageUrl || undefined,
            role || undefined,
            favoriteTeam || undefined,
            undefined,
            undefined,
            handle || undefined
          );

          setTimeout(() => {
            fetchProfileAndAuthenticate();
            const redirectPath = handle
              ? `/mypage/${handle.startsWith('@') ? handle : `@${handle}`}`
              : '/home';
            navigate(redirectPath, { replace: true });
          }, 100);
        } else {
          navigate('/login', { replace: true });
        }
      } catch {
        setError(true);
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    })();
  }, [searchParams, login, navigate, fetchProfileAndAuthenticate]);

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">
            로그인 처리에 실패했습니다.
          </p>
          <p className="text-gray-500 text-sm">
            로그인 페이지로 이동합니다...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2d5f4f] mx-auto mb-4"></div>
        <p style={{ color: '#2d5f4f', fontWeight: 700 }}>
          로그인 처리 중...
        </p>
      </div>
    </div>
  );
}
