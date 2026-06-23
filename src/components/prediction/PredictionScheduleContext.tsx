import { createContext, useContext, type ReactNode } from 'react';

import type { usePredictionSchedule } from '../../hooks/usePredictionSchedule';
import type { usePredictionUserVotes } from '../../hooks/usePredictionUserVotes';

export type PredictionScheduleRuntimeState = ReturnType<typeof usePredictionSchedule>;
export type PredictionUserVotesRuntimeState = ReturnType<typeof usePredictionUserVotes>;

const PredictionScheduleContext = createContext<PredictionScheduleRuntimeState | null>(null);
const PredictionUserVotesContext = createContext<PredictionUserVotesRuntimeState | null>(null);

type PredictionScheduleProviderProps = {
  schedule: PredictionScheduleRuntimeState;
  children: ReactNode;
};

type PredictionUserVotesProviderProps = {
  userVotes: PredictionUserVotesRuntimeState;
  children: ReactNode;
};

export function PredictionScheduleProvider({
  schedule,
  children,
}: PredictionScheduleProviderProps) {
  return (
    <PredictionScheduleContext.Provider value={schedule}>
      {children}
    </PredictionScheduleContext.Provider>
  );
}

export function PredictionUserVotesProvider({
  userVotes,
  children,
}: PredictionUserVotesProviderProps) {
  return (
    <PredictionUserVotesContext.Provider value={userVotes}>
      {children}
    </PredictionUserVotesContext.Provider>
  );
}

export const usePredictionScheduleRuntimeState = () => useContext(PredictionScheduleContext);
export const usePredictionUserVotesRuntimeState = () => useContext(PredictionUserVotesContext);
