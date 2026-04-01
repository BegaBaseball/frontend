import { useCallback } from 'react';
import type { ComponentProps } from 'react';
import RetroLeaderboard from './RetroLeaderboard';
import { usePowerups, useUserLeaderboardStats } from '../../hooks/useLeaderboardPrivate';

type AuthenticatedRetroLeaderboardProps = Omit<
  ComponentProps<typeof RetroLeaderboard>,
  'userStats' | 'powerups' | 'activePowerups' | 'onUsePowerup'
>;

export default function AuthenticatedRetroLeaderboard(
  props: AuthenticatedRetroLeaderboardProps,
) {
  const { stats: myRank } = useUserLeaderboardStats();
  const {
    powerups,
    activePowerups,
    usePowerup,
  } = usePowerups();

  const handleUsePowerup = useCallback(async (powerupType: string) => {
    await usePowerup(powerupType);
  }, [usePowerup]);

  return (
    <RetroLeaderboard
      {...props}
      userStats={myRank}
      powerups={powerups}
      activePowerups={activePowerups}
      onUsePowerup={handleUsePowerup}
    />
  );
}
