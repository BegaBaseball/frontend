export interface TeamScore {
  [key: string]: number;
}

export interface Answer {
  label: string;
  teams: TeamScore;
}

export interface Question {
  id: number;
  question: string;
  description?: string;
  answers: Answer[];
}

export interface TeamRecommendationTestProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: string) => void;
}