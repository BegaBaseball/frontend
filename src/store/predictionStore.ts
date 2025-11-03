import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Game {
  id: number;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamColor: string;
  awayTeamColor: string;
  stadium: string;
  homeScore?: number;
  awayScore?: number;
  status: 'upcoming' | 'live' | 'finished';
}

export interface Prediction {
  gameId: number;
  predictedWinner: string;
  predictedScore?: {
    home: number;
    away: number;
  };
  timestamp: string;
}

export interface PredictionStats {
  total: number;
  correct: number;
  wrong: number;
  accuracy: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

const initialTeams: Team[] = [
  { id: 'samsung', name: '삼성 라이온즈', shortName: '삼성', color: '#074CA1' },
  { id: 'lg', name: 'LG 트윈스', shortName: 'LG', color: '#C30452' },
  { id: 'doosan', name: '두산 베어스', shortName: '두산', color: '#131230' },
  { id: 'kt', name: 'KT 위즈', shortName: 'KT', color: '#000000' },
  { id: 'ssg', name: 'SSG 랜더스', shortName: 'SSG', color: '#CE0E2D' },
  { id: 'kiwoom', name: '키움 히어로즈', shortName: '키움', color: '#570514' },
  { id: 'hanwha', name: '한화 이글스', shortName: '한화', color: '#FF6600' },
  { id: 'nc', name: 'NC 다이노스', shortName: 'NC', color: '#315288' },
  { id: 'lotte', name: '롯데 자이언츠', shortName: '롯데', color: '#041E42' },
  { id: 'kia', name: '기아 타이거즈', shortName: '기아', color: '#EA0029' }
];

interface PredictionState {
  // 경기 예측 관련
  games: Game[];
  predictions: Prediction[];
  stats: PredictionStats;
  selectedTab: 'today' | 'upcoming' | 'finished';
  
  // 순위 예측 관련
  rankings: (Team | null)[];
  availableTeams: Team[];
  isPredictionSaved: boolean;
  
  // 경기 예측 함수들
  setGames: (games: Game[]) => void;
  setSelectedTab: (tab: 'today' | 'upcoming' | 'finished') => void;
  addPrediction: (prediction: Prediction) => void;
  updatePrediction: (gameId: number, prediction: Partial<Prediction>) => void;
  calculateStats: () => void;
  
  // 순위 예측 함수들
  addTeamToRanking: (team: Team) => void;
  removeTeamFromRanking: (index: number) => void;
  moveTeam: (fromIndex: number, toIndex: number) => void;
  resetRankings: () => void;
  completePrediction: () => void;
  setIsPredictionSaved: (saved: boolean) => void;
}

export const usePredictionStore = create<PredictionState>()(
  persist(
    (set, get) => ({
      // 경기 예측 초기 상태
      games: [],
      predictions: [],
      stats: {
        total: 0,
        correct: 0,
        wrong: 0,
        accuracy: 0,
      },
      selectedTab: 'today',
      
      // 순위 예측 초기 상태
      rankings: Array(10).fill(null),
      availableTeams: [...initialTeams],
      isPredictionSaved: false,
      
      // 경기 예측 함수들
      setGames: (games) => set({ games }),
      setSelectedTab: (tab) => set({ selectedTab: tab }),
      addPrediction: (prediction) =>
        set((state) => ({
          predictions: [...state.predictions.filter((p) => p.gameId !== prediction.gameId), prediction],
        })),
      updatePrediction: (gameId, prediction) =>
        set((state) => ({
          predictions: state.predictions.map((p) =>
            p.gameId === gameId ? { ...p, ...prediction } : p
          ),
        })),
      calculateStats: () => {
        const { games, predictions } = get();
        const finishedGames = games.filter((g) => g.status === 'finished');
        const finishedPredictions = predictions.filter((p) =>
          finishedGames.some((g) => g.id === p.gameId)
        );
        
        let correct = 0;
        finishedPredictions.forEach((pred) => {
          const game = finishedGames.find((g) => g.id === pred.gameId);
          if (game && game.homeScore !== undefined && game.awayScore !== undefined) {
            const actualWinner =
              game.homeScore > game.awayScore
                ? game.homeTeam
                : game.awayScore > game.homeScore
                ? game.awayTeam
                : 'draw';
            if (pred.predictedWinner === actualWinner) {
              correct++;
            }
          }
        });
        
        set({
          stats: {
            total: finishedPredictions.length,
            correct,
            wrong: finishedPredictions.length - correct,
            accuracy: finishedPredictions.length > 0 ? (correct / finishedPredictions.length) * 100 : 0,
          },
        });
      },
      
      // 순위 예측 함수들
      addTeamToRanking: (team) => {
        const { rankings, availableTeams } = get();
        // 뒤에서부터 빈 자리 찾기 (10위부터 채우기)
        let lastEmptyIndex = -1;
        for (let i = rankings.length - 1; i >= 0; i--) {
          if (rankings[i] === null) {
            lastEmptyIndex = i;
            break;
          }
        }
        if (lastEmptyIndex === -1) return;
        
        const newRankings = [...rankings];
        newRankings[lastEmptyIndex] = team;
        
        const newAvailableTeams = availableTeams.filter(t => t.id !== team.id);
        
        set({ rankings: newRankings, availableTeams: newAvailableTeams });
      },
      
      removeTeamFromRanking: (index) => {
        const { rankings, availableTeams } = get();
        const team = rankings[index];
        if (!team) return;
        
        const newRankings = [...rankings];
        newRankings[index] = null;
        
        const newAvailableTeams = [...availableTeams, team];
        
        set({ rankings: newRankings, availableTeams: newAvailableTeams });
      },
      
      moveTeam: (fromIndex, toIndex) => {
        const { rankings } = get();
        const newRankings = [...rankings];
        const [movedTeam] = newRankings.splice(fromIndex, 1);
        newRankings.splice(toIndex, 0, movedTeam);
        set({ rankings: newRankings });
      },
      
      resetRankings: () => {
        set({
          rankings: Array(10).fill(null),
          availableTeams: [...initialTeams],
          isPredictionSaved: false,
        });
      },
      
      completePrediction: () => {
        set({ isPredictionSaved: true });
      },
      
      setIsPredictionSaved: (saved) => {
        set({ isPredictionSaved: saved });
      },
    }),
    {
      name: 'prediction-storage',
      partialize: (state) => ({
        predictions: state.predictions,
        stats: state.stats,
        rankings: state.rankings,
        isPredictionSaved: state.isPredictionSaved,
      }),
    }
  )
);
