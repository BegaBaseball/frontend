import { CSSProperties, forwardRef, useEffect } from 'react';
import { ProfileAvatar } from '../ui/ProfileAvatar';

const STYLE_ID = 'retro-leaderboard-row-styles';
const retroDisplay = "'Press Start 2P', monospace";
const textOutline =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const leaderboardRowStyles = `
  @keyframes retroLeaderboardRankUpGlow {
    0%, 100% { color: #00ff00; }
    50% { color: #ccffcc; text-shadow: ${textOutline}, 0 0 10px #00ff00; }
  }

  @keyframes retroLeaderboardRankDownGlow {
    0%, 100% { color: #ff4444; }
    50% { color: #ffcccc; text-shadow: ${textOutline}, 0 0 10px #ff4444; }
  }

  @keyframes retroLeaderboardGoldShine {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }

  .retro-leaderboard-row {
    display: grid;
    grid-template-columns: 60px minmax(0, 1fr) 100px 80px;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    color: #ffffff;
    transition: background 0.2s ease, transform 0.2s ease;
  }

  .retro-leaderboard-row:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .retro-leaderboard-rank-cell,
  .retro-leaderboard-score-cell,
  .retro-leaderboard-streak-cell,
  .retro-leaderboard-name {
    font-family: ${retroDisplay};
    text-shadow: ${textOutline};
    image-rendering: pixelated;
  }

  .retro-leaderboard-rank-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 20px;
  }

  .retro-leaderboard-crown {
    display: inline-block;
    font-size: 16px;
    margin-right: -4px;
    animation: retroLeaderboardGoldShine 2s infinite;
  }

  .retro-leaderboard-user-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  .retro-leaderboard-avatar {
    width: 32px;
    height: 32px;
    border: 2px solid #fff;
    background: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    overflow: hidden;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
    flex-shrink: 0;
  }

  .retro-leaderboard-user-info {
    min-width: 0;
    flex: 1;
  }

  .retro-leaderboard-name {
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: 1px;
  }

  .retro-leaderboard-score-cell,
  .retro-leaderboard-streak-cell {
    font-size: 16px;
    letter-spacing: 1px;
  }

  .retro-leaderboard-score-cell {
    text-align: right;
  }

  .retro-leaderboard-streak-cell {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 640px) {
    .retro-leaderboard-row {
      grid-template-columns: 50px minmax(0, 1fr) 80px;
      gap: 8px;
      padding: 8px 4px;
    }

    .retro-leaderboard-score-cell {
      font-size: 14px;
    }

    .retro-leaderboard-streak-cell {
      display: none;
    }
  }
`;

const ensureLeaderboardRowStyles = () => {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) {
    return;
  }

  const styleTag = document.createElement('style');
  styleTag.id = STYLE_ID;
  styleTag.textContent = leaderboardRowStyles;
  document.head.appendChild(styleTag);
};

const resolveProfileImage = (imageUrl?: string) => {
  if (!imageUrl) return null;
  if (imageUrl.includes('/assets/') || imageUrl.includes('/src/assets/')) return null;
  return imageUrl;
};

const getRankColor = (rank: number) => {
  if (rank === 1) return '#ffd700';
  if (rank === 2) return '#c0c0c0';
  if (rank === 3) return '#cd7f32';
  return '#ffffff';
};

const getRankAnimation = (rankChange?: number) => {
  if (typeof rankChange !== 'number' || rankChange === 0) {
    return undefined;
  }

  if (rankChange > 0) {
    return 'retroLeaderboardRankUpGlow 2s ease-out';
  }

  return 'retroLeaderboardRankDownGlow 2s ease-out';
};

export interface LeaderboardEntry {
  rank?: number;
  handle?: string | null;
  userName: string;
  profileImageUrl?: string;
  level: number;
  score: number;
  streak: number;
  rankChange?: number;
}

interface LeaderboardRowProps {
  rank: number;
  entry: LeaderboardEntry;
  isCurrentUser?: boolean;
}

const LeaderboardRow = forwardRef<HTMLDivElement, LeaderboardRowProps>(({
  rank,
  entry,
  isCurrentUser = false,
}, ref) => {
  useEffect(() => {
    ensureLeaderboardRowStyles();
  }, []);

  const rowStyle: CSSProperties = {
    color: getRankColor(rank),
    borderBottom: '2px solid transparent',
    textShadow: rank <= 3 ? '2px 2px 0 #000' : undefined,
    animation: getRankAnimation(entry.rankChange),
    background: isCurrentUser ? 'rgba(255, 255, 255, 0.1)' : undefined,
    border: isCurrentUser ? '2px solid #ff00ff' : undefined,
  };

  return (
    <div ref={ref} className="retro-leaderboard-row" style={rowStyle}>
      <div className="retro-leaderboard-rank-cell">
        {rank === 1 && <span className="retro-leaderboard-crown">👑</span>}
        <span>{rank}.</span>
      </div>

      <div className="retro-leaderboard-user-cell">
        <div className="retro-leaderboard-avatar">
          {resolveProfileImage(entry.profileImageUrl) ? (
            <ProfileAvatar
              src={resolveProfileImage(entry.profileImageUrl) || undefined}
              alt={entry.userName}
              fallbackName={entry.userName}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            '😐'
          )}
        </div>
        <div className="retro-leaderboard-user-info">
          <div className="retro-leaderboard-name">{entry.userName}</div>
        </div>
      </div>

      <div className="retro-leaderboard-score-cell">{entry.score.toLocaleString()}</div>

      <div className="retro-leaderboard-streak-cell">{entry.streak}</div>
    </div>
  );
});

LeaderboardRow.displayName = 'LeaderboardRow';

export default LeaderboardRow;
