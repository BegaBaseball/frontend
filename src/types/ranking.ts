// types/ranking.ts (기존 파일에 추가)
export interface Team {
  id: string;
  name: string;
  shortName: string;
  fullName: string;
  color: string;
  description: string;
}

export interface SeasonResponse {
  seasonYear: number;
}

export interface SavedPredictionResponse {
  id: number;
  userId: number;
  seasonYear: number;
  teamIdsInOrder: string[];
  createdAt: string;
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
  onMove: (dragIndex: number, hoverIndex: number) => void;
}