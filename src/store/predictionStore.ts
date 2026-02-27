import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTeamColorByAnyKey } from '../constants/teams';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  color: string;
}

const initialTeams: Team[] = [
  { id: 'samsung', name: '삼성 라이온즈', shortName: '삼성', color: getTeamColorByAnyKey('samsung') },
  { id: 'lg', name: 'LG 트윈스', shortName: 'LG', color: getTeamColorByAnyKey('lg') },
  { id: 'doosan', name: '두산 베어스', shortName: '두산', color: getTeamColorByAnyKey('doosan') },
  { id: 'kt', name: 'KT 위즈', shortName: 'KT', color: getTeamColorByAnyKey('kt') },
  { id: 'ssg', name: 'SSG 랜더스', shortName: 'SSG', color: getTeamColorByAnyKey('ssg') },
  { id: 'kiwoom', name: '키움 히어로즈', shortName: '키움', color: getTeamColorByAnyKey('kiwoom') },
  { id: 'hanwha', name: '한화 이글스', shortName: '한화', color: getTeamColorByAnyKey('hanwha') },
  { id: 'nc', name: 'NC 다이노스', shortName: 'NC', color: getTeamColorByAnyKey('nc') },
  { id: 'lotte', name: '롯데 자이언츠', shortName: '롯데', color: getTeamColorByAnyKey('lotte') },
  { id: 'kia', name: '기아 타이거즈', shortName: '기아', color: getTeamColorByAnyKey('kia') }
];

interface PredictionState {
  // 순위 예측 관련
  rankings: (Team | null)[];
  availableTeams: Team[];
  allTeams: Team[];
  isPredictionSaved: boolean;

  // 순위 예측 함수들
  addTeamToRanking: (team: Team) => void;
  removeTeamFromRanking: (index: number) => void;
  moveTeam: (fromIndex: number, toIndex: number) => void;
  resetRankings: () => void;
  completePrediction: () => void;
  setIsPredictionSaved: (saved: boolean) => void;
  setRankings: (rankings: (Team | null)[]) => void;
}

export const usePredictionStore = create<PredictionState>()(
  persist(
    (set, get) => ({
      // 순위 예측 초기 상태
      rankings: Array(10).fill(null),
      availableTeams: [...initialTeams],
      allTeams: [...initialTeams],
      isPredictionSaved: false,

      setRankings: (newRankings: (Team | null)[]) => {
        const usedTeamIds = newRankings.filter(team => team !== null).map(team => team!.id);
        const newAvailableTeams = initialTeams.filter(team => !usedTeamIds.includes(team.id));
        set({
          rankings: newRankings,
          availableTeams: newAvailableTeams
        });
      },

      // 순위 예측 함수들
      addTeamToRanking: (team) => {
        const { rankings, availableTeams } = get();
        let firstEmptyIndex = -1;
        for (let i = 0; i < rankings.length; i++) {
          if (rankings[i] === null) {
            firstEmptyIndex = i;
            break;
          }
        }
        if (firstEmptyIndex === -1) return;

        const newRankings = [...rankings];
        newRankings[firstEmptyIndex] = team;
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
        rankings: state.rankings,
        isPredictionSaved: state.isPredictionSaved,
      }),
    }
  )
);
