type RankTier = 'ROOKIE' | 'MINOR_LEAGUER' | 'MAJOR_LEAGUER' | 'HALL_OF_FAME';

const retroDisplay = "'Press Start 2P', monospace";
const retroText = "'Galmuri11', 'Galmuri9', sans-serif";
const textOutline =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const levelBadgeStyles = `
  @keyframes retroLevelBadgeShine {
    0% { transform: translateX(-140%); }
    100% { transform: translateX(220%); }
  }

  @keyframes retroLevelBadgeFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }
`;

const rankThemes: Record<RankTier, {
  background: string;
  border: string;
  color: string;
  icon: string;
  glow?: string;
}> = {
  ROOKIE: {
    background: 'linear-gradient(180deg, #2a4a2a 0%, #1a3a1a 100%)',
    border: '#4a8a4a',
    color: '#8fc98f',
    icon: '⚾',
  },
  MINOR_LEAGUER: {
    background: 'linear-gradient(180deg, #2a2a4a 0%, #1a1a3a 100%)',
    border: '#4a4a8a',
    color: '#8f8fc9',
    icon: '⭐',
  },
  MAJOR_LEAGUER: {
    background: 'linear-gradient(180deg, #4a2a2a 0%, #3a1a1a 100%)',
    border: '#8a4a4a',
    color: '#c98f8f',
    icon: '🔥',
  },
  HALL_OF_FAME: {
    background: 'linear-gradient(180deg, #4a4a2a 0%, #3a3a1a 100%)',
    border: '#ffd700',
    color: '#ffd700',
    icon: '👑',
    glow: 'rgba(255, 215, 0, 0.3)',
  },
};

interface LevelBadgeProps {
  level: number;
  compact?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function getRankTier(level: number): RankTier {
  if (level <= 10) return 'ROOKIE';
  if (level <= 30) return 'MINOR_LEAGUER';
  if (level <= 60) return 'MAJOR_LEAGUER';
  return 'HALL_OF_FAME';
}

export function getRankTitleKo(rank: RankTier): string {
  switch (rank) {
    case 'ROOKIE': return '루키';
    case 'MINOR_LEAGUER': return '마이너리거';
    case 'MAJOR_LEAGUER': return '메이저리거';
    case 'HALL_OF_FAME': return '명예의 전당';
  }
}

export default function LevelBadge({
  level,
  compact = false,
  showTitle = true,
  className,
}: LevelBadgeProps) {
  const rank = getRankTier(level);
  const theme = rankThemes[rank];
  const formattedLevel = level.toString().padStart(2, '0');
  const hallOfFame = rank === 'HALL_OF_FAME';

  if (compact) {
    return (
      <div
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          background: theme.background,
          border: `2px solid ${theme.border}`,
          borderRadius: '3px',
          fontFamily: retroDisplay,
          fontSize: '8px',
          color: theme.color,
          imageRendering: 'pixelated',
          boxShadow: hallOfFame ? '0 0 6px rgba(255,215,0,0.3)' : undefined,
        }}
      >
        <span>{theme.icon}</span>
        <span>LV.{formattedLevel}</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        background: theme.background,
        border: `2px solid ${theme.border}`,
        borderRadius: '4px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: hallOfFame
          ? '0 0 10px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.2)'
          : undefined,
      }}
    >
      <style>{levelBadgeStyles}</style>
      {hallOfFame && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,215,0,0.3) 50%, transparent 60%, transparent 100%)',
            pointerEvents: 'none',
            animation: 'retroLevelBadgeShine 3s linear infinite',
          }}
        />
      )}
      <span
        style={{
          fontSize: '16px',
          position: 'relative',
          zIndex: 1,
          animation: hallOfFame ? 'retroLevelBadgeFloat 2s ease-in-out infinite' : undefined,
        }}
      >
        {theme.icon}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
        <span
          style={{
            fontFamily: retroDisplay,
            fontSize: '11px',
            color: theme.color,
            imageRendering: 'pixelated',
          }}
        >
          LV.{formattedLevel}
        </span>
        {showTitle && (
          <span
            style={{
              fontFamily: retroText,
              fontSize: '9px',
              color: theme.color,
              opacity: 0.9,
              letterSpacing: '-0.3px',
              textShadow: textOutline,
              imageRendering: 'pixelated',
            }}
          >
            {getRankTitleKo(rank)}
          </span>
        )}
      </div>
    </div>
  );
}
