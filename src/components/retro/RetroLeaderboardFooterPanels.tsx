import PowerUpInventory from './PowerUpInventory';
import type {
  PowerupInventory as PowerupInventoryState,
} from '../../api/leaderboard';
import type { LeaderboardEntry } from './LeaderboardRow';

interface RetroLeaderboardFooterPanelsProps {
  hotStreaks: LeaderboardEntry[];
  powerups: PowerupInventoryState;
  activePowerups: string[];
  onUsePowerup?: (type: string) => Promise<void>;
}

export default function RetroLeaderboardFooterPanels({
  hotStreaks,
  powerups,
  activePowerups,
  onUsePowerup,
}: RetroLeaderboardFooterPanelsProps) {
  return (
    <>
      {hotStreaks.length > 0 && (
        <div style={{ width: '90%', maxWidth: '800px', margin: '20px auto 0' }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '3px solid #ff6600',
              borderRadius: '8px',
              padding: '16px 20px',
              boxShadow: '0 0 14px rgba(255, 102, 0, 0.2)',
            }}
          >
            <div
              style={{
                fontFamily: "'Galmuri11', 'Galmuri9', sans-serif",
                fontSize: '11px',
                color: '#ff6600',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                imageRendering: 'pixelated',
              }}
            >
              🔥 연승 중인 플레이어
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {hotStreaks.map((entry) => (
                <div
                  key={entry.handle ?? entry.userName}
                  style={{
                    background: 'rgba(255, 102, 0, 0.1)',
                    border: '2px solid #ff6600',
                    borderRadius: '6px',
                    padding: '8px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>🔥</span>
                  <span style={{ fontFamily: "'Galmuri11', 'Galmuri9', sans-serif", fontSize: '12px', color: '#fff' }}>
                    {entry.userName}
                  </span>
                  <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '14px', color: '#ff6600' }}>
                    {entry.streak}연승
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ width: '90%', maxWidth: '800px', margin: '20px auto 40px' }}>
        <PowerUpInventory
          powerups={powerups as unknown as Record<string, number>}
          activePowerups={activePowerups}
          onUsePowerup={onUsePowerup}
        />
      </div>
    </>
  );
}
