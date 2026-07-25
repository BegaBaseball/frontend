import { type CSSProperties, useMemo } from 'react';
import { HomeSecondaryTrophyIcon } from './home/HomeSecondaryIcons';
import type { AchievementDto } from '../types/diary';

interface AchievementCelebrationOverlayProps {
  achievement: AchievementDto | null;
  onClose: () => void;
}

const overlayCss = `
  @keyframes achievement-cel-fade-in { from { opacity: 0; } to { opacity: 1; } }
  @keyframes achievement-cel-pop {
    0% { transform: scale(0.7); opacity: 0; }
    70% { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  @keyframes achievement-cel-burst {
    0% { transform: translate(0, 0) scale(1); opacity: 1; }
    100% { transform: translate(var(--achievement-cel-tx), var(--achievement-cel-ty)) scale(0); opacity: 0; }
  }
`;

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(15, 23, 22, 0.55)',
  animation: 'achievement-cel-fade-in 0.2s ease-out',
};

const cardStyle: CSSProperties = {
  position: 'relative',
  width: 'min(320px, calc(100vw - 48px))',
  padding: '32px 24px 24px',
  borderRadius: 20,
  background: '#ffffff',
  textAlign: 'center',
  animation: 'achievement-cel-pop 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
};

const PARTICLE_COUNT = 10;

export default function AchievementCelebrationOverlay({
  achievement,
  onClose,
}: AchievementCelebrationOverlayProps) {
  const particles = useMemo(() => {
    if (!achievement) {
      return [];
    }
    return Array.from({ length: PARTICLE_COUNT }, (_, index) => {
      const angle = (index / PARTICLE_COUNT) * Math.PI * 2;
      const radius = 70 + Math.random() * 40;
      return {
        tx: Math.cos(angle) * radius,
        ty: Math.sin(angle) * radius,
        delay: Math.random() * 0.15,
      };
    });
  }, [achievement]);

  if (!achievement) {
    return null;
  }

  return (
    <>
      <style>{overlayCss}</style>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="배지 획득"
        style={overlayStyle}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div style={cardStyle}>
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#e8f5f0]">
            {particles.map((particle, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="absolute h-1.5 w-1.5 rounded-full bg-[#2d5f4f]"
                style={{
                  '--achievement-cel-tx': `${particle.tx}px`,
                  '--achievement-cel-ty': `${particle.ty}px`,
                  animation: `achievement-cel-burst 0.7s ${particle.delay}s ease-out forwards`,
                } as CSSProperties}
              />
            ))}
            <HomeSecondaryTrophyIcon className="h-9 w-9 text-[#2d5f4f]" />
          </div>

          <span className="inline-block rounded-full bg-[#173b34] px-3 py-1 text-11 font-black tracking-wide text-white">
            배지 획득
          </span>

          <h2 className="mt-3 text-lg font-black text-slate-950">
            {achievement.name}
          </h2>
          {achievement.description ? (
            <p className="mt-1.5 text-body font-semibold text-slate-500">
              {achievement.description}
            </p>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-[#2d5f4f] py-2.5 text-14 font-bold text-white transition-colors hover:bg-[#2f6c5c]"
          >
            확인
          </button>
        </div>
      </div>
    </>
  );
}
