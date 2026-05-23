// types/ranking.ts
// Import and re-export Team from predictionStore to avoid type duplication
import type { Team } from '../store/predictionStore';
export type { Team };

export interface SeasonResponse {
  seasonYear: number;
}

export interface SavedPredictionResponse {
  id: number;
  shareId: string | null;
  seasonYear: number;
  teamIdsInOrder: string[];
  teamDetails?: Array<{
    teamId: string;
    teamName: string;
    currentRank: number | null;
    lastSeasonRank: number | null;
  }>;
  createdAt: string;
}

export interface RankingPredictionInitResponse {
  seasonYear: number;
  saved: SavedPredictionResponse | null;
}

export interface SaveRankingRequest {
  seasonYear: number;
  teamIdsInOrder: string[];
}

export interface RankingItemProps {
  team: Team | null;
  index: number;
  alreadySaved: boolean;
  onRemove: (index: number) => void;
  onMoveTeamToIndex: (teamId: string, hoverIndex: number) => void;
  onMoveTeamByStep: (teamId: string, direction: -1 | 1) => void;
  draggedTeamId?: string | null;
  lastMovedTeamId?: string | null;
  onDragTeamChange?: (teamId: string | null) => void;
}
