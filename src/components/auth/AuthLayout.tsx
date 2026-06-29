import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import begaCharacter from '../../assets/27f7b8ac0aacea2470847e809062c7bbf0e4163f.webp';
import grassDecor from '../../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import './auth-layout.css';
import '../common/autofill-input.css';
import { OptimizedImage } from '../common/OptimizedImage';
import { HomeIcon } from '../icons/PublicShellIcons';
import { Button } from '../ui/button';
import {
  AuthFormPanel,
  AuthHeroPanel,
  AuthShell,
  AuthStage,
} from '../ui/auth-primitives';

interface AuthLayoutProps {
  children: ReactNode;
  showHomeButton?: boolean;
}

export default function AuthLayout({ children, showHomeButton = false }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <AuthShell data-testid="auth-shell">
      <div className="auth-backdrop" aria-hidden="true">
        <div className="auth-backdrop-orb auth-backdrop-orb-one" />
        <div className="auth-backdrop-orb auth-backdrop-orb-two" />
        <div className="auth-backdrop-orb auth-backdrop-orb-three" />
        <div className="auth-backdrop-orb auth-backdrop-orb-four" />
      </div>

      <img src={grassDecor} alt="" className="auth-ground" />

      <AuthStage data-testid="auth-stage">
        <div className="auth-stage-grid">
          <AuthHeroPanel data-testid="auth-hero-panel">
            <div className="relative z-10 text-center">
              <OptimizedImage
                src={begaCharacter}
                alt="BEGA Character"
                className="mx-auto mb-8 h-auto w-56 drop-shadow-2xl sm:w-64 lg:w-72"
                priority={true}
              />
              <div className="space-y-3">
                <p className="auth-eyebrow mx-auto">KBO Fan Guide</p>
                <div className="space-y-2">
                  <h2 className="text-5xl font-bold tracking-[-0.08em] text-white sm:text-6xl">
                    BEGA
                  </h2>
                  <p className="mx-auto max-w-sm text-body leading-6 text-white/82 sm:text-base">
                    로그인, 가입, 복구 흐름까지 같은 규칙으로 정돈한 야구 팬 전용 인증 경험
                  </p>
                </div>
              </div>
            </div>
          </AuthHeroPanel>

          <AuthFormPanel data-testid="auth-form-panel">
            {showHomeButton ? (
              <Button
                type="button"
                variant="brandOutline"
                size="touch"
                onClick={() => navigate('/home')}
                className="auth-home-button px-3"
                data-testid="auth-home-button"
                aria-label="홈으로 이동"
              >
                <HomeIcon className="h-5 w-5" />
                <span className="sr-only">홈으로 이동</span>
              </Button>
            ) : null}

            <div className="auth-form-flow">
              {children}
            </div>
          </AuthFormPanel>
        </div>
      </AuthStage>
    </AuthShell>
  );
}
