export interface Team {
  id: string;
  name: string;
  shortName: string;
}

export interface RankingPredictionResponse {
  seasonYear: number;
  teamIdsInOrder: string[];
  createdAt: string;
}

export interface CurrentSeasonResponse {
  seasonYear: number;
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