import { useState, useMemo, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RetroContainer,
  FlickerText,
  RetroDivider,
  crtScanlines,
  DotMatrixText,
  PixelEmptyState,
  animations,
  fonts,
  crispText,
  textOutline,
} from './RetroTheme';
import LeaderboardRow, { LeaderboardEntry } from './LeaderboardRow';
import UserStatsPanel, { UserStats } from './UserStatsPanel';
import NewsTicker, { TickerMessage } from './NewsTicker';
import PowerUpInventory from './PowerUpInventory';
import ComboAnimation from './ComboAnimation';

const glowPulse = keyframes`
  0%, 100% { text-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff; }
  50% { text-shadow: 0 0 20px #00ffff, 0 0 40px #00ffff, 0 0 60px #00ffff; }
`;

const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(180deg, #050510 0%, #0a0a1e 50%, #050510 100%);
  padding: 20px;
  position: relative;

  ${crtScanlines}

  @media (max-width: 640px) {
    padding: 10px;
  }
`;

const LeaderboardFrame = styled(RetroContainer)`
  max-width: 900px;
  margin: 0 auto;
  border: 4px solid #4a4a6a;
  box-shadow:
    0 0 30px rgba(0, 255, 255, 0.1),
    inset 0 0 60px rgba(0, 0, 0, 0.5);
`;

// 야구공 회전 애니메이션
const spinBall = keyframes`
  0% { transform: translateY(-50%) rotate(0deg); }
  100% { transform: translateY(-50%) rotate(360deg); }
`;

// 배트 스윙 애니메이션
const swingBat = keyframes`
  0%, 100% { transform: translateY(-50%) rotate(-15deg); }
  50% { transform: translateY(-50%) rotate(15deg); }
`;

const Header = styled.div`
  background: linear-gradient(180deg, #1a0a2a 0%, #0a0a1a 100%);
  padding: 24px;
  text-align: center;
  border-bottom: 3px solid #ff00ff;
  position: relative;

  h1 {
    font-family: ${fonts.retroDisplay};
    font-size: 28px;
    color: #00ffff;
    margin-bottom: 12px;
    animation: ${glowPulse} 3s infinite;
    letter-spacing: 4px;
    ${crispText}

    @media (max-width: 640px) {
      font-size: 18px;
    }
  }

  .subtitle-wrapper {
    display: inline-block;
    position: relative;
    padding: 8px 20px;
    background:
      repeating-linear-gradient(
        0deg,
        transparent 0px,
        transparent 2px,
        rgba(255, 0, 255, 0.1) 2px,
        rgba(255, 0, 255, 0.1) 4px
      ),
      repeating-linear-gradient(
        90deg,
        transparent 0px,
        transparent 2px,
        rgba(255, 0, 255, 0.1) 2px,
        rgba(255, 0, 255, 0.1) 4px
      ),
      linear-gradient(180deg, rgba(26, 10, 42, 0.8) 0%, rgba(10, 10, 26, 0.8) 100%);
    border: 2px solid rgba(255, 0, 255, 0.5);
    border-radius: 4px;
  }

  .subtitle {
    font-family: ${fonts.retroDisplay};
    font-size: 11px;
    color: #ff00ff;
    letter-spacing: 2px;
    text-shadow: 0 0 8px rgba(255, 0, 255, 0.5);
    ${crispText}
  }

  /* Decorative baseball icons */
  &::before,
  &::after {
    position: absolute;
    top: 50%;
    font-size: 20px;
  }

  &::before {
    content: '⚾';
    left: 20px;
    animation: ${spinBall} 3s linear infinite;
    filter: drop-shadow(0 0 6px rgba(255, 102, 0, 0.6));
  }

  &::after {
    content: '🏏';
    right: 20px;
    animation: ${swingBat} 2s ease-in-out infinite;
    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.6));
  }
`;

const TabContainer = styled.div<{ $glitching?: boolean }>`
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 2px solid #2a2a4a;

  ${props => props.$glitching && css`
    animation: ${animations.glitch} 0.3s ease-out;
  `}

  @media (max-width: 480px) {
    gap: 4px;
    padding: 12px 8px;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  font-family: ${fonts.retroText};
  font-size: 13px;
  padding: 12px 24px;
  background: ${props => props.$active
    ? 'linear-gradient(180deg, #ff00ff 0%, #aa00aa 100%)'
    : 'transparent'
  };
  border: 2px solid ${props => props.$active ? '#ff66ff' : '#4a4a6a'};
  color: ${props => props.$active ? '#fff' : '#6a6a8a'};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  ${crispText}
  ${textOutline}

  ${props => props.$active && `
    box-shadow: 0 0 15px rgba(255, 0, 255, 0.3);
  `}

  &:hover {
    color: #fff;
    border-color: ${props => props.$active ? '#ff66ff' : '#8a8aaa'};
  }

  @media (max-width: 480px) {
    font-size: 11px;
    padding: 10px 16px;
  }
`;

const HotStreaksSection = styled.div`
  background: linear-gradient(90deg, rgba(255,102,0,0.15) 0%, rgba(255,0,0,0.1) 100%);
  padding: 16px;
  border-bottom: 2px solid #ff6600;

  h2 {
    font-family: ${fonts.retroDisplay};
    font-size: 11px;
    color: #ff6600;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    ${crispText}
  }
`;

const HotStreaksList = styled.div`
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.3);
  }

  &::-webkit-scrollbar-thumb {
    background: #ff6600;
    border-radius: 2px;
  }
`;

const HotStreakItem = styled.div`
  flex-shrink: 0;
  text-align: center;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid #ff6600;
  border-radius: 4px;

  .streak {
    font-family: ${fonts.retroDisplay};
    font-size: 20px;
    color: #ff6600;
    text-shadow: 0 0 10px rgba(255, 102, 0, 0.5);
    ${crispText}
  }

  .name {
    font-family: ${fonts.retroText};
    font-size: 11px;
    color: #ffaa66;
    margin-top: 4px;
    ${crispText}
    ${textOutline}
  }
`;

const LeaderboardList = styled.div`
  padding: 16px;
  min-height: 400px;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 120px 100px 80px;
  padding: 12px 16px;
  margin-bottom: 12px;
  border-bottom: 2px solid #3a3a5a;

  span {
    font-family: ${fonts.retroDisplay};
    font-size: 9px;
    color: #6a6a8a;
    text-transform: uppercase;
    ${crispText}
  }

  @media (max-width: 640px) {
    grid-template-columns: 50px 1fr 80px;

    span:nth-child(4),
    span:nth-child(5) {
      display: none;
    }
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-top: 2px solid #2a2a4a;
  background: rgba(0, 0, 0, 0.2);
`;

const PageButton = styled.button<{ $active?: boolean }>`
  font-family: ${fonts.retroDisplay};
  font-size: 10px;
  padding: 10px 18px;
  background: ${props => props.$active
    ? 'linear-gradient(180deg, #00ccff 0%, #0088cc 100%)'
    : 'rgba(30, 30, 50, 0.8)'
  };
  border: 2px solid ${props => props.$active ? '#00ccff' : '#4a4a6a'};
  color: #fff;
  cursor: pointer;
  transition: all 0.2s ease;
  ${crispText}

  &:hover:not(:disabled) {
    background: ${props => props.$active
      ? 'linear-gradient(180deg, #00ccff 0%, #0088cc 100%)'
      : 'rgba(50, 50, 80, 0.9)'
    };
    border-color: #6a6a8a;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// 타석에서 기다리는 애니메이션
const batterWait = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(-5deg); }
  75% { transform: translateY(-3px) rotate(5deg); }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  position: relative;

  .batter-box {
    position: relative;
    display: inline-block;
    margin-bottom: 24px;
  }

  .batter {
    font-size: 64px;
    display: block;
    animation: ${batterWait} 2s ease-in-out infinite;
    image-rendering: pixelated;
  }

  .ball-incoming {
    position: absolute;
    right: -40px;
    top: 20%;
    font-size: 24px;
    animation: ${keyframes`
      0% { transform: translateX(30px) scale(0.5); opacity: 0; }
      50% { transform: translateX(0) scale(1); opacity: 1; }
      100% { transform: translateX(-60px) scale(1.2); opacity: 0; }
    `} 2s ease-in-out infinite;
  }

  .title {
    font-family: ${fonts.retroDisplay};
    font-size: 14px;
    color: #00ffff;
    margin-bottom: 12px;
    ${crispText}
  }

  .message {
    font-family: ${fonts.retroText};
    font-size: 13px;
    color: #8a8aaa;
    line-height: 1.8;
    letter-spacing: -0.3px;
    ${textOutline}
  }
`;

const LoadingState = styled.div`
  text-align: center;
  padding: 60px 20px;

  .spinner {
    font-size: 32px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .text {
    font-family: ${fonts.retroDisplay};
    font-size: 10px;
    color: #00ffff;
    margin-top: 16px;
    ${crispText}
  }
`;

// Demo data for development
const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { userId: 1, userName: 'PIXEL_KING', handle: 'pixelking', level: 99, score: 9999999, streak: 15, rankChange: 0 },
  { userId: 2, userName: 'RETRO_BOY', handle: 'retroboy', level: 85, score: 8500120, streak: 8, rankChange: 2 },
  { userId: 3, userName: 'BIT_HUNTER', handle: 'bithunter', level: 72, score: 7200000, streak: 5, rankChange: -1 },
  { userId: 4, userName: 'PLAYER_004', handle: 'player004', level: 61, score: 6100550, streak: 3, rankChange: 1 },
  { userId: 5, userName: 'PLAYER_005', handle: 'player005', level: 59, score: 5900000, streak: 0, rankChange: -2 },
  { userId: 6, userName: 'GAMER_PRO', handle: 'gamerpro', level: 45, score: 4500000, streak: 2, rankChange: 0 },
  { userId: 7, userName: 'ARCADE_FAN', handle: 'arcadefan', level: 38, score: 3800000, streak: 0, rankChange: 3 },
  { userId: 8, userName: 'NEON_RIDER', handle: 'neonrider', level: 32, score: 3200000, streak: 1, rankChange: -1 },
  { userId: 9, userName: 'CYBER_PUNK', handle: 'cyberpunk', level: 28, score: 2800000, streak: 0, rankChange: 0 },
  { userId: 10, userName: 'VAPORWAVE', handle: 'vaporwave', level: 25, score: 2500000, streak: 4, rankChange: 5 },
];

const DEMO_USER_STATS: UserStats = {
  userId: 999,
  userName: 'YOU',
  rank: 215,
  totalScore: 1250000,
  seasonScore: 850000,
  level: 42,
  currentStreak: 5,
  maxStreak: 12,
  experiencePoints: 168100,
  nextLevelExp: 176400,
  accuracy: 67.5,
};

const DEMO_TICKER: TickerMessage[] = [
  { id: '1', text: 'PIXEL_KING이 15연승 달성!', type: 'fire' },
  { id: '2', text: 'RETRO_BOY +850 PTS 획득', type: 'streak' },
  { id: '3', text: 'VAPORWAVE 5계단 상승!', type: 'levelup' },
  { id: '4', text: 'BIT_HUNTER PERFECT DAY 달성!', type: 'perfect' },
  { id: '5', text: 'ARCADE_FAN UPSET 예측 성공!', type: 'upset' },
];

type LeaderboardType = 'season' | 'monthly' | 'weekly';

interface RetroLeaderboardProps {
  // For integration with real API
  leaderboard?: LeaderboardEntry[];
  userStats?: UserStats | null;
  tickerMessages?: TickerMessage[];
  hotStreaks?: LeaderboardEntry[];
  powerups?: Record<string, number>;
  activePowerups?: string[];
  isLoading?: boolean;
  currentUserId?: number;
  onTypeChange?: (type: LeaderboardType) => void;
  onPageChange?: (page: number) => void;
  onUsePowerup?: (type: string) => Promise<void>;
  totalPages?: number;
}

export default function RetroLeaderboard({
  leaderboard,
  userStats,
  tickerMessages,
  hotStreaks,
  powerups = {},
  activePowerups = [],
  isLoading = false,
  currentUserId,
  onTypeChange,
  onPageChange,
  onUsePowerup,
  totalPages = 5,
}: RetroLeaderboardProps) {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('season');
  const [currentPage, setCurrentPage] = useState(0);
  const [isGlitching, setIsGlitching] = useState(false);

  // Use demo data if no real data provided
  const displayLeaderboard = leaderboard ?? DEMO_LEADERBOARD;
  const displayUserStats = userStats ?? DEMO_USER_STATS;
  const displayTicker = tickerMessages ?? DEMO_TICKER;
  const displayHotStreaks = hotStreaks ?? DEMO_LEADERBOARD.filter(e => e.streak >= 3).slice(0, 5);

  const handleTypeChange = useCallback((type: LeaderboardType) => {
    // 글리치 효과 트리거
    setIsGlitching(true);
    setTimeout(() => setIsGlitching(false), 300);

    setLeaderboardType(type);
    setCurrentPage(0);
    onTypeChange?.(type);
  }, [onTypeChange]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    onPageChange?.(page);
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <PageContainer>
      <ComboAnimation />

      <LeaderboardFrame>
        {/* News Ticker */}
        <NewsTicker messages={displayTicker} />

        {/* Header */}
        <Header>
          <h1>
            <FlickerText $active>LEADERBOARD</FlickerText>
          </h1>
          <div className="subtitle-wrapper">
            <div className="subtitle">KBO PREDICTION RANKING</div>
          </div>
        </Header>

        {/* Tab Navigation */}
        <TabContainer $glitching={isGlitching}>
          {(['season', 'monthly', 'weekly'] as const).map(type => (
            <TabButton
              key={type}
              $active={leaderboardType === type}
              onClick={() => handleTypeChange(type)}
            >
              {type === 'season' ? '시즌' : type === 'monthly' ? '월간' : '주간'}
            </TabButton>
          ))}
        </TabContainer>

        {/* Hot Streaks */}
        {displayHotStreaks.length > 0 && (
          <HotStreaksSection>
            <h2>
              <span>🔥</span>
              HOT STREAKS
              <span>🔥</span>
            </h2>
            <HotStreaksList>
              {displayHotStreaks.map(user => (
                <HotStreakItem key={user.userId}>
                  <div className="streak">{user.streak}</div>
                  <div className="name">{user.userName}</div>
                </HotStreakItem>
              ))}
            </HotStreaksList>
          </HotStreaksSection>
        )}

        {/* Leaderboard List */}
        <LeaderboardList>
          <TableHeader>
            <span>RANK</span>
            <span>PLAYER</span>
            <span>SCORE</span>
            <span>LEVEL</span>
            <span>STREAK</span>
          </TableHeader>

          {isLoading ? (
            <LoadingState>
              <div className="spinner">⚾</div>
              <div className="text">LOADING...</div>
            </LoadingState>
          ) : displayLeaderboard.length === 0 ? (
            <EmptyState>
              <div className="batter-box">
                <span className="batter">🧑‍🦱</span>
                <span className="ball-incoming">⚾</span>
              </div>
              <div className="title">WAITING FOR PLAYERS...</div>
              <div className="message">
                아직 랭킹 데이터가 없습니다.<br />
                예측에 참여해서 첫 번째 랭커가 되어보세요!
              </div>
            </EmptyState>
          ) : (
            <AnimatePresence mode="popLayout">
              {displayLeaderboard.map((entry, index) => (
                <LeaderboardRow
                  key={entry.userId}
                  rank={currentPage * 10 + index + 1}
                  entry={entry}
                  isCurrentUser={entry.userId === currentUserId}
                />
              ))}
            </AnimatePresence>
          )}
        </LeaderboardList>

        {/* Pagination */}
        <Pagination>
          <PageButton
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
          >
            ◀ PREV
          </PageButton>

          {pageNumbers.map(page => (
            <PageButton
              key={page}
              $active={currentPage === page}
              onClick={() => handlePageChange(page)}
            >
              {page + 1}
            </PageButton>
          ))}

          <PageButton
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
          >
            NEXT ▶
          </PageButton>
        </Pagination>

        {/* User Stats - 리더보드 아래에 배치 */}
        {displayUserStats && (
          <UserStatsPanel stats={displayUserStats} />
        )}

        <RetroDivider />

        {/* Power-ups */}
        <PowerUpInventory
          powerups={powerups}
          activePowerups={activePowerups}
          onUsePowerup={onUsePowerup}
        />
      </LeaderboardFrame>
    </PageContainer>
  );
}
