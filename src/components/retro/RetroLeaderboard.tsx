import { lazy, Suspense, useEffect, useState } from 'react';
import LeaderboardRow, { LeaderboardEntry } from './LeaderboardRow';
import NewsTicker, { TickerMessage } from './NewsTicker';
import ViewportDeferred from '../ViewportDeferred';
import type {
  UserLeaderboardStats,
  PowerupInventory as PowerupInventoryState,
} from '../../api/leaderboard';
import { ensureRetroFontsLoaded } from './RetroTheme';

import mascotRight from '../../assets/images/mascot_v3.webp';
const RetroLeaderboardFooterPanels = lazy(() => import('./RetroLeaderboardFooterPanels'));
const RetroLeaderboardRulesOverlay = lazy(() => import('./RetroLeaderboardRulesOverlay'));
const RetroLeaderboardDecorations = lazy(() => import('./RetroLeaderboardDecorations'));

const retroDisplay = "'Press Start 2P', monospace";
const retroText = "'Galmuri11', 'Galmuri9', sans-serif";
const textOutline =
  '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000';

const retroLeaderboardStyles = `
  @keyframes retroLeaderboardFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes retroLeaderboardBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .retro-leaderboard-title-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 30px;
    margin-bottom: 50px;
    z-index: 30;
  }

  .retro-leaderboard-character-frame {
    width: 100px;
    height: 100px;
    border-radius: 9999px;
    border: 4px solid #fff;
    background-color: #87ceeb;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    position: relative;
    overflow: hidden;
    z-index: 30;
    image-rendering: pixelated;
    animation: retroLeaderboardFloat 4s ease-in-out infinite reverse;
  }

  .retro-leaderboard-character-sprite {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transform: scale(1.5);
    image-rendering: pixelated;
    object-position: center 20%;
  }

  .retro-leaderboard-action-button {
    background: #000;
    color: #fff;
    border: 2px solid #fff;
    padding: 12px 24px;
    font-family: ${retroText};
    font-size: 16px;
    cursor: pointer;
    box-shadow: 4px 4px 0 #000;
    transition: transform 0.1s ease, box-shadow 0.1s ease, color 0.1s ease, border-color 0.1s ease;
    border-radius: 4px;
    text-shadow: ${textOutline};
    image-rendering: pixelated;
  }

  .retro-leaderboard-action-button:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #000;
    color: #ffff00;
    border-color: #ffff00;
  }

  .retro-leaderboard-action-button:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #000;
  }

  .retro-leaderboard-loading,
  .retro-leaderboard-empty {
    animation: retroLeaderboardBlink 1.2s infinite;
  }

  @media (max-width: 768px) {
    .retro-leaderboard-title-wrapper {
      flex-direction: column;
      gap: 15px;
      margin-bottom: 30px;
    }

    .retro-leaderboard-title {
      font-size: 36px;
    }

    .retro-leaderboard-stat-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .retro-leaderboard-header {
      grid-template-columns: 50px minmax(0, 1fr) 80px;
      padding: 12px 8px;
    }

    .retro-leaderboard-streak-header {
      display: none;
    }

    .retro-leaderboard-button-group {
      flex-direction: column;
      gap: 12px;
    }
  }
`;

type LeaderboardType = 'season' | 'monthly' | 'weekly';

interface RetroLeaderboardProps {
  leaderboard?: LeaderboardEntry[];
  userStats?: UserLeaderboardStats | null;
  tickerMessages?: TickerMessage[];
  hotStreaks?: LeaderboardEntry[];
  powerups?: PowerupInventoryState;
  activePowerups?: string[];
  isLoading?: boolean;
  currentUserHandle?: string;
  onTypeChange?: (type: LeaderboardType) => void;
  onPageChange?: (page: number) => void;
  onRefresh?: () => void;
  onMyScore?: () => void;
  onPredict?: () => void;
  onUsePowerup?: (type: string) => Promise<void>;
  totalPages?: number;
}

export default function RetroLeaderboard({
  leaderboard,
  userStats,
  tickerMessages = [],
  hotStreaks = [],
  powerups = { MAGIC_BAT: 0, GOLDEN_GLOVE: 0, SCOUTER: 0 },
  activePowerups = [],
  onRefresh,
  onPredict,
  onUsePowerup,
  isLoading = false,
  currentUserHandle,
}: RetroLeaderboardProps) {
  const [showRules, setShowRules] = useState(false);
  const [showDecorations, setShowDecorations] = useState(false);

  const hasPredictionStats = !!(
    userStats &&
    ((userStats.accuracy ?? 0) > 0 ||
      (userStats.currentStreak ?? 0) > 0 ||
      (userStats.totalPredictions ?? 0) > 0 ||
      (userStats.correctPredictions ?? 0) > 0)
  );

  const predictionAccuracy = hasPredictionStats && typeof userStats?.accuracy === 'number'
    ? `${userStats.accuracy.toFixed(1)}%`
    : '-';
  const predictionStreak = hasPredictionStats && typeof userStats?.currentStreak === 'number'
    ? `${userStats.currentStreak}연승`
    : '-';
  const predictionTotal = hasPredictionStats && typeof userStats?.totalPredictions === 'number'
    ? `${userStats.totalPredictions.toLocaleString()}회`
    : '-';
  const predictionCorrect = hasPredictionStats && typeof userStats?.correctPredictions === 'number'
    ? `${userStats.correctPredictions.toLocaleString()}회`
    : '-';

  const displayLeaderboard = leaderboard ?? [];

  useEffect(() => {
    ensureRetroFontsLoaded();

    let frameId: number | null = null;
    let nextFrameId: number | null = null;

    frameId = window.requestAnimationFrame(() => {
      nextFrameId = window.requestAnimationFrame(() => {
        setShowDecorations(true);
        nextFrameId = null;
      });
      frameId = null;
    });

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      if (nextFrameId !== null) {
        window.cancelAnimationFrame(nextFrameId);
      }
    };
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: retroText,
        backgroundColor: '#1a1a2e',
        imageRendering: 'pixelated',
      }}
    >
      <style>{retroLeaderboardStyles}</style>

      {showDecorations && (
        <Suspense fallback={null}>
          <RetroLeaderboardDecorations />
        </Suspense>
      )}

      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '60px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="retro-leaderboard-title-wrapper">
          <h1
            className="retro-leaderboard-title"
            style={{
              fontFamily: retroText,
              fontSize: '52px',
              color: '#fff',
              textAlign: 'center',
              textShadow: '4px 4px 0 #000, -4px -4px 0 #000, 4px -4px 0 #000, -4px 4px 0 #000',
              margin: 0,
              imageRendering: 'pixelated',
              zIndex: 20,
            }}
          >
            야구경기 예측 결과
          </h1>
          <div className="retro-leaderboard-character-frame">
            {showDecorations && (
              <img className="retro-leaderboard-character-sprite" src={mascotRight} alt="Mascot" />
            )}
          </div>
        </div>

        <NewsTicker messages={tickerMessages} />

        <div
          style={{
            width: '90%',
            maxWidth: '800px',
            margin: '0 auto 20px',
            padding: '14px',
            border: '3px solid #00ff00',
            borderRadius: '4px',
            background: 'rgba(0, 0, 0, 0.5)',
            boxShadow: '0 0 14px rgba(0, 255, 0, 0.2)',
            position: 'relative',
          }}
        >
          <div className="retro-leaderboard-stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px' }}>
            {[
              ['적중률', predictionAccuracy],
              ['연승', predictionStreak],
              ['누적 예측', predictionTotal],
              ['적중 횟수', predictionCorrect],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  border: '2px solid #00b800',
                  borderRadius: '4px',
                  background: 'rgba(0, 0, 0, 0.35)',
                  padding: '10px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    color: '#66ff66',
                    fontSize: '11px',
                    fontFamily: retroText,
                    marginBottom: '6px',
                    imageRendering: 'pixelated',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '20px',
                    fontFamily: retroDisplay,
                    color: '#fff',
                    textShadow: '0 0 8px rgba(255, 255, 255, 0.35)',
                    imageRendering: 'pixelated',
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ width: '90%', maxWidth: '800px', position: 'relative' }}>
          <div
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.7)',
              border: '4px solid #fff',
              borderRadius: '8px',
              outline: '4px solid #000',
              boxShadow: '10px 10px 20px rgba(0,0,0,0.5)',
              position: 'relative',
              zIndex: 20,
              padding: '4px',
            }}
          >
            <div
              style={{
                border: '2px solid #fff',
                borderRadius: '6px',
                padding: '10px',
                minHeight: '500px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {showRules && (
                <Suspense fallback={null}>
                  <RetroLeaderboardRulesOverlay onClose={() => setShowRules(false)} />
                </Suspense>
              )}

              <div
                className="retro-leaderboard-header"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px minmax(0, 1fr) 100px 80px',
                  padding: '12px 16px',
                  borderBottom: '2px solid #fff',
                  marginBottom: '20px',
                  gap: '10px',
                }}
              >
                {['RANK', 'PLAYER', 'SCORE'].map((label, index) => (
                  <span
                    key={label}
                    style={{
                      color: '#fff',
                      fontFamily: retroDisplay,
                      fontSize: '14px',
                      letterSpacing: '1px',
                      textShadow: '2px 2px 0 #000',
                      textAlign: index === 2 ? 'right' : 'left',
                      imageRendering: 'pixelated',
                    }}
                  >
                    {label}
                  </span>
                ))}
                <span
                  className="retro-leaderboard-streak-header"
                  style={{
                    color: '#fff',
                    fontFamily: retroDisplay,
                    fontSize: '14px',
                    letterSpacing: '1px',
                    textShadow: '2px 2px 0 #000',
                    textAlign: 'right',
                    imageRendering: 'pixelated',
                  }}
                >
                  STREAK
                </span>
              </div>

              {isLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <div
                    className="retro-leaderboard-loading"
                    style={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      padding: '40px 60px',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '18px',
                      fontFamily: retroText,
                      textShadow: '2px 2px 0 #000',
                      imageRendering: 'pixelated',
                    }}
                  >
                    로딩중...
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                  {displayLeaderboard.map((entry, index) => (
                    <LeaderboardRow
                      key={entry.handle ?? `${entry.userName}-${entry.rank ?? index + 1}`}
                      rank={entry.rank ?? index + 1}
                      entry={entry}
                      isCurrentUser={Boolean(currentUserHandle && entry.handle && entry.handle === currentUserHandle)}
                    />
                  ))}
                  {displayLeaderboard.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                      <div
                        className="retro-leaderboard-empty"
                        style={{
                          background: 'rgba(0, 0, 0, 0.4)',
                          padding: '40px 60px',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '18px',
                          fontFamily: retroText,
                          textShadow: '2px 2px 0 #000',
                          imageRendering: 'pixelated',
                        }}
                      >
                        데이터가 없습니다
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div
              className="retro-leaderboard-button-group"
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '20px',
                marginTop: '20px',
                width: '100%',
                position: 'relative',
                paddingBottom: '10px',
              }}
            >
              <button type="button" className="retro-leaderboard-action-button" onClick={onRefresh}>
                새로고침
              </button>
              <button type="button" className="retro-leaderboard-action-button" onClick={() => setShowRules(true)}>
                규칙 확인
              </button>
              <button type="button" className="retro-leaderboard-action-button" onClick={onPredict}>
                예측하기
              </button>
            </div>

            <div
              style={{
                fontFamily: retroText,
                fontSize: '12px',
                color: '#ccc',
                marginTop: '10px',
                marginBottom: '15px',
                textAlign: 'center',
                textShadow: '1px 1px 0 #000',
                width: '100%',
                imageRendering: 'pixelated',
              }}
            >
              * 모든 점수는 경기 종료 후 30분 이내에 집계됩니다.
            </div>
          </div>
        </div>

        <ViewportDeferred
          fallback={(
            <div
              aria-hidden="true"
              style={{
                width: '90%',
                maxWidth: '800px',
                minHeight: '220px',
                margin: '20px auto 40px',
              }}
            />
          )}
        >
          <Suspense fallback={null}>
            <RetroLeaderboardFooterPanels
              hotStreaks={hotStreaks}
              powerups={powerups}
              activePowerups={activePowerups}
              onUsePowerup={onUsePowerup}
            />
          </Suspense>
        </ViewportDeferred>
      </div>
    </div>
  );
}
