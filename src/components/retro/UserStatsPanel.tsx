import LevelBadge, { getRankTier } from './LevelBadge';
import PixelProgressBar from './PixelProgressBar';
import { ProfileAvatar } from '../ui/ProfileAvatar';

const retroDisplay = "'Press Start 2P', monospace";
const retroText = "'Galmuri11', 'Galmuri9', sans-serif";
const textOutline =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const userStatsPanelStyles = `
  @keyframes retroUserStatsPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  @keyframes retroUserStatsScoreGlow {
    0%, 100% { text-shadow: 0 0 10px currentColor, 0 0 20px currentColor; }
    50% { text-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor; }
  }

  @keyframes retroUserStatsRankShine {
    0% { transform: translateX(-140%); }
    100% { transform: translateX(220%); }
  }

  .retro-user-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
  }

  @media (max-width: 768px) {
    .retro-user-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .retro-user-stats-header {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }

    .retro-user-stats-rank-section {
      text-align: left;
    }

    .retro-user-stats-rank-display {
      justify-content: flex-start;
    }
  }
`;

const resolveProfileImage = (imageUrl?: string) => {
  if (!imageUrl) return null;
  if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
  return imageUrl;
};

const getRankNumberStyle = (rank: number) => {
  if (rank === 1) {
    return {
      color: '#ffd700',
      background: 'linear-gradient(180deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%)',
      border: '3px solid #ffd700',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.4), inset 0 0 15px rgba(255, 215, 0, 0.2)',
      textShadow: '0 0 15px rgba(255, 215, 0, 0.8)',
    };
  }

  if (rank === 2) {
    return {
      color: '#c0c0c0',
      background: 'linear-gradient(180deg, rgba(192, 192, 192, 0.2) 0%, rgba(192, 192, 192, 0.1) 100%)',
      border: '3px solid #c0c0c0',
      boxShadow: '0 0 15px rgba(192, 192, 192, 0.3)',
      textShadow: '0 0 10px rgba(192, 192, 192, 0.6)',
    };
  }

  if (rank === 3) {
    return {
      color: '#cd7f32',
      background: 'linear-gradient(180deg, rgba(205, 127, 50, 0.2) 0%, rgba(205, 127, 50, 0.1) 100%)',
      border: '3px solid #cd7f32',
      boxShadow: '0 0 15px rgba(205, 127, 50, 0.3)',
      textShadow: '0 0 10px rgba(205, 127, 50, 0.6)',
    };
  }

  if (rank <= 10) {
    return {
      color: '#00ffff',
      background: 'rgba(0, 255, 255, 0.1)',
      border: '2px solid #00ffff',
      boxShadow: '0 0 10px rgba(0, 255, 255, 0.2)',
      textShadow: '0 0 8px rgba(0, 255, 255, 0.5)',
    };
  }

  return {
    color: '#00ffff',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '2px solid #4a4a6a',
    textShadow: '0 0 6px rgba(0, 255, 255, 0.3)',
  };
};

const getStreakStyle = (streak: number) => {
  if (streak >= 7) {
    return {
      background: 'linear-gradient(180deg, #ff00ff 0%, #cc00cc 100%)',
      color: '#fff',
      textShadow: '0 0 10px #ff00ff',
    };
  }

  if (streak >= 5) {
    return {
      background: 'linear-gradient(180deg, #ff6600 0%, #cc4400 100%)',
      color: '#fff',
      textShadow: '0 0 6px #ff6600',
    };
  }

  if (streak >= 3) {
    return {
      background: 'linear-gradient(180deg, #ffcc00 0%, #cc9900 100%)',
      color: '#000',
    };
  }

  return {
    background: 'linear-gradient(180deg, #4a4a6a 0%, #2a2a4a 100%)',
    color: '#aaa',
  };
};

const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toLocaleString();
};

export interface UserStats {
  userId: number;
  userName: string;
  profileImageUrl?: string;
  rank: number;
  totalScore: number;
  seasonScore: number;
  level: number;
  currentStreak: number;
  maxStreak: number;
  experiencePoints: number;
  nextLevelExp: number;
  accuracy?: number;
}

interface UserStatsPanelProps {
  stats: UserStats;
}

function calculateNextLevelXP(level: number): number {
  return Math.pow(level, 2) * 100;
}

function calculateCurrentLevelXP(level: number): number {
  return Math.pow(level - 1, 2) * 100;
}

export default function UserStatsPanel({ stats }: UserStatsPanelProps) {
  const currentLevelXP = calculateCurrentLevelXP(stats.level);
  const nextLevelXP = calculateNextLevelXP(stats.level);
  const xpProgress = stats.experiencePoints - currentLevelXP;
  const xpNeeded = nextLevelXP - currentLevelXP;
  const streakStyle = getStreakStyle(stats.currentStreak);
  const rankNumberStyle = getRankNumberStyle(stats.rank);
  const hallOfFame = getRankTier(stats.level) === 'HALL_OF_FAME';
  const statCards = [
    { label: '시즌 점수', value: formatCompactNumber(stats.seasonScore), suffix: 'PTS', highlight: true },
    { label: '총점', value: formatCompactNumber(stats.totalScore), suffix: 'PTS', highlight: false },
    { label: '최고 연승', value: stats.maxStreak.toString(), suffix: '연승', highlight: false },
    {
      label: '적중률',
      value: stats.accuracy !== undefined ? stats.accuracy.toFixed(1) : '-',
      suffix: '%',
      highlight: false,
    },
  ];

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #1a0a2a 0%, #0a0a1a 100%)',
        border: '3px solid #ff00ff',
        borderRadius: '4px',
        padding: '20px',
        margin: '16px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{userStatsPanelStyles}</style>

      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          width: '12px',
          height: '12px',
          borderTop: '2px solid #ff00ff',
          borderLeft: '2px solid #ff00ff',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '6px',
          right: '6px',
          width: '12px',
          height: '12px',
          borderBottom: '2px solid #ff00ff',
          borderRight: '2px solid #ff00ff',
        }}
      />

      <div
        className="retro-user-stats-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '4px',
              background: 'linear-gradient(135deg, #3a3a5a 0%, #2a2a4a 100%)',
              border: '3px solid #ff00ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              boxShadow: '0 0 15px rgba(255, 0, 255, 0.3)',
              overflow: 'hidden',
            }}
          >
            {stats.profileImageUrl ? (
              <ProfileAvatar
                src={resolveProfileImage(stats.profileImageUrl) || undefined}
                alt={stats.userName}
                fallbackName={stats.userName}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              '🧑'
            )}
          </div>

          <div>
            <div
              style={{
                fontFamily: retroDisplay,
                fontSize: '9px',
                color: '#ff00ff',
                marginBottom: '4px',
                imageRendering: 'pixelated',
              }}
            >
              YOUR STATUS
            </div>
            <div
              style={{
                fontFamily: retroText,
                fontSize: '16px',
                color: '#fff',
                marginBottom: '8px',
                letterSpacing: '-0.3px',
                textShadow: textOutline,
                imageRendering: 'pixelated',
              }}
            >
              {stats.userName}
            </div>
            <LevelBadge level={stats.level} />
          </div>
        </div>

        <div className="retro-user-stats-rank-section" style={{ textAlign: 'right' }}>
          <div
            className="retro-user-stats-rank-display"
            style={{
              fontFamily: retroText,
              fontSize: '12px',
              color: '#aaa',
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              textShadow: textOutline,
              imageRendering: 'pixelated',
            }}
          >
            <span>현재 순위</span>
            <div
              style={{
                ...rankNumberStyle,
                fontFamily: retroDisplay,
                fontSize: '24px',
                padding: '8px 16px',
                borderRadius: '4px',
                position: 'relative',
                imageRendering: 'pixelated',
              }}
            >
              {stats.rank === 1 && (
                <span style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', fontSize: '16px' }}>
                  👑
                </span>
              )}
              #{stats.rank}
            </div>
          </div>

          {stats.currentStreak > 0 && (
            <div
              style={{
                ...streakStyle,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontFamily: retroText,
                fontSize: '11px',
                padding: '6px 12px',
                borderRadius: '4px',
                textShadow: textOutline,
                imageRendering: 'pixelated',
                animation: stats.currentStreak >= 7 ? 'retroUserStatsPulse 0.5s infinite' : undefined,
              }}
            >
              {stats.currentStreak >= 5 && '🔥 '}
              {stats.currentStreak}연승 중!
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          height: '2px',
          background: 'linear-gradient(90deg, transparent 0%, #4a4a6a 10%, #6a6a8a 50%, #4a4a6a 90%, transparent 100%)',
          margin: '16px 0',
        }}
      />

      <div className="retro-user-stats-grid">
        {statCards.map(({ label, value, suffix, highlight }) => (
          <div
            key={label}
            style={{
              background: highlight ? 'linear-gradient(180deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 0, 0, 0.4) 100%)' : 'rgba(0, 0, 0, 0.4)',
              border: `2px solid ${highlight ? '#00ff00' : '#3a3a5a'}`,
              borderRadius: '4px',
              padding: '16px 12px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: highlight ? '0 0 15px rgba(0, 255, 0, 0.3), inset 0 0 20px rgba(0, 255, 0, 0.1)' : undefined,
            }}
          >
            {highlight && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, transparent, rgba(0, 255, 0, 0.2), transparent)',
                  animation: 'retroUserStatsRankShine 3s infinite',
                }}
              />
            )}
            <div
              style={{
                fontFamily: retroText,
                fontSize: '11px',
                color: highlight ? '#88ff88' : '#7a7a9a',
                marginBottom: '10px',
                letterSpacing: '-0.3px',
                textShadow: textOutline,
                imageRendering: 'pixelated',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontFamily: retroDisplay,
                fontSize: '20px',
                color: highlight ? '#00ff00' : '#fff',
                textShadow: highlight ? '0 0 15px rgba(0, 255, 0, 0.8)' : '0 0 4px rgba(255, 255, 255, 0.3)',
                animation: highlight ? 'retroUserStatsScoreGlow 2s infinite' : undefined,
                imageRendering: 'pixelated',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {value}
              <span
                style={{
                  fontFamily: retroText,
                  fontSize: '11px',
                  color: highlight ? '#66ff66' : '#888',
                  marginLeft: '4px',
                }}
              >
                {suffix}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontFamily: retroDisplay,
              fontSize: '9px',
              color: '#aaa',
              imageRendering: 'pixelated',
            }}
          >
            EXP: {formatCompactNumber(stats.experiencePoints)}
          </span>
          <span
            style={{
              fontFamily: retroDisplay,
              fontSize: '9px',
              color: '#00ffff',
              imageRendering: 'pixelated',
              animation: 'retroUserStatsPulse 2s infinite',
            }}
          >
            NEXT LV.{(stats.level + 1).toString().padStart(2, '0')} → {formatCompactNumber(nextLevelXP)} EXP
          </span>
        </div>

        <PixelProgressBar
          value={xpProgress}
          max={xpNeeded}
          color={hallOfFame ? '#ffd700' : '#00ffff'}
          size="lg"
        />
      </div>
    </div>
  );
}
