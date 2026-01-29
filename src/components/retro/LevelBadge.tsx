import styled, { css, keyframes } from 'styled-components';

type RankTier = 'ROOKIE' | 'MINOR_LEAGUER' | 'MAJOR_LEAGUER' | 'HALL_OF_FAME';

const rankThemes: Record<RankTier, {
  bg: string;
  border: string;
  color: string;
  icon: string;
  glow?: string;
}> = {
  ROOKIE: {
    bg: 'linear-gradient(180deg, #2a4a2a 0%, #1a3a1a 100%)',
    border: '#4a8a4a',
    color: '#8fc98f',
    icon: '⚾',
  },
  MINOR_LEAGUER: {
    bg: 'linear-gradient(180deg, #2a2a4a 0%, #1a1a3a 100%)',
    border: '#4a4a8a',
    color: '#8f8fc9',
    icon: '⭐',
  },
  MAJOR_LEAGUER: {
    bg: 'linear-gradient(180deg, #4a2a2a 0%, #3a1a1a 100%)',
    border: '#8a4a4a',
    color: '#c98f8f',
    icon: '🔥',
  },
  HALL_OF_FAME: {
    bg: 'linear-gradient(180deg, #4a4a2a 0%, #3a3a1a 100%)',
    border: '#ffd700',
    color: '#ffd700',
    icon: '👑',
    glow: 'rgba(255,215,0,0.3)',
  },
};

const shine = keyframes`
  0% { background-position: -100px; }
  40%, 100% { background-position: 200px; }
`;

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
`;

const Badge = styled.div<{ $rank: RankTier }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: ${props => rankThemes[props.$rank].bg};
  border: 2px solid ${props => rankThemes[props.$rank].border};
  border-radius: 4px;
  font-family: 'Press Start 2P', monospace;
  position: relative;
  overflow: hidden;

  ${props => props.$rank === 'HALL_OF_FAME' && css`
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        90deg,
        transparent 0%,
        transparent 40%,
        rgba(255,215,0,0.3) 50%,
        transparent 60%,
        transparent 100%
      );
      background-size: 200px 100%;
      animation: ${shine} 3s infinite linear;
    }
    box-shadow:
      0 0 10px rgba(255,215,0,0.3),
      0 0 20px rgba(255,215,0,0.2);
  `}

  .icon {
    font-size: 16px;
    ${props => props.$rank === 'HALL_OF_FAME' && css`
      animation: ${float} 2s ease-in-out infinite;
    `}
  }

  .level {
    font-size: 12px;
    color: ${props => rankThemes[props.$rank].color};
    position: relative;
    z-index: 1;
  }

  .title {
    font-size: 7px;
    color: ${props => rankThemes[props.$rank].color};
    opacity: 0.8;
    position: relative;
    z-index: 1;
    letter-spacing: 0.5px;
  }
`;

const CompactBadge = styled.div<{ $rank: RankTier }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${props => rankThemes[props.$rank].bg};
  border: 2px solid ${props => rankThemes[props.$rank].border};
  border-radius: 3px;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: ${props => rankThemes[props.$rank].color};

  ${props => props.$rank === 'HALL_OF_FAME' && css`
    box-shadow: 0 0 6px rgba(255,215,0,0.3);
  `}
`;

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

  if (compact) {
    return (
      <CompactBadge $rank={rank} className={className}>
        <span>{theme.icon}</span>
        <span>LV.{formattedLevel}</span>
      </CompactBadge>
    );
  }

  return (
    <Badge $rank={rank} className={className}>
      <span className="icon">{theme.icon}</span>
      <div className="flex flex-col">
        <span className="level">LV.{formattedLevel}</span>
        {showTitle && (
          <span className="title">{getRankTitleKo(rank)}</span>
        )}
      </div>
    </Badge>
  );
}
