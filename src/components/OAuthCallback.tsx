// src/components/OAuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const fetchProfileAndAuthenticate = useAuthStore((state) => state.fetchProfileAndAuthenticate);

  useEffect(() => {
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const role = searchParams.get('role');
    const profileImageUrl = searchParams.get('profileImageUrl');
    const favoriteTeam = searchParams.get('favoriteTeam');
    const handle = searchParams.get('handle');

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
        const redirectPath = handle ? `/mypage/${handle.startsWith('@') ? handle : `@${handle}`}` : '/home';
        navigate(redirectPath, { replace: true });
      }, 100);
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, login, navigate]);

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
