import { useMemo, useState } from 'react';
import { Answer, TeamScore } from '../types/teamTest';
import { TEAM_TEST_QUESTIONS } from '../constants/teamTestQuestions';
import { FRANCHISE_TEAM_IDS, TEAM_NAME_TO_ID } from '../constants/teams';

const TEAM_TIE_BREAK_RANK = FRANCHISE_TEAM_IDS.reduce<Record<string, number>>((acc, teamId, index) => {
  acc[teamId] = index;
  return acc;
}, {});

const normalizeTeamKey = (team: string): string | null => {
  const trimmed = team.trim();
  if (!trimmed) {
    return null;
  }

  return TEAM_NAME_TO_ID[trimmed] || TEAM_NAME_TO_ID[trimmed.toUpperCase()] || null;
};

const calculateTeamScores = (questionScores: Array<TeamScore | null>): TeamScore => {
  return questionScores.reduce<TeamScore>((acc, teamScore) => {
    if (!teamScore) {
      return acc;
    }

    Object.entries(teamScore).forEach(([team, score]) => {
      acc[team] = (acc[team] || 0) + score;
    });

    return acc;
  }, {});
};

const getTieBreakRank = (team: string): number => TEAM_TIE_BREAK_RANK[team] ?? Number.MAX_SAFE_INTEGER;

const getTopTeamFromScores = (scores: TeamScore): string => {
  const entries = Object.entries(scores);

  if (entries.length === 0) {
    return '';
  }

  return entries.reduce((best, current) => {
    if (best[1] > current[1]) {
      return best;
    }

    if (best[1] < current[1]) {
      return current;
    }

    const bestRank = getTieBreakRank(best[0]);
    const currentRank = getTieBreakRank(current[0]);

    if (bestRank !== currentRank) {
      return currentRank < bestRank ? current : best;
    }

    return current[0] < best[0] ? current : best;
  })[0];
};

export const useTeamTest = (onSelectTeam: (team: string) => void, onClose: () => void) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [questionTeamScores, setQuestionTeamScores] = useState<Array<TeamScore | null>>(
    () => Array(TEAM_TEST_QUESTIONS.length).fill(null),
  );
  const [currentQuestionSelections, setCurrentQuestionSelections] = useState<Array<number | null>>(
    () => Array(TEAM_TEST_QUESTIONS.length).fill(null),
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [recommendedTeam, setRecommendedTeam] = useState<string>('');
  const [direction, setDirection] = useState(0);

  const progress = ((currentQuestion + 1) / TEAM_TEST_QUESTIONS.length) * 100;
  const currentQuestionData = TEAM_TEST_QUESTIONS[currentQuestion];

  const teamScores = useMemo(() => calculateTeamScores(questionTeamScores), [questionTeamScores]);

  // ========== Answer Handler ==========
  const handleAnswer = (answer: Answer, index: number) => {
    if (selectedAnswer !== null) {
      return;
    }

    setSelectedAnswer(index);

    const normalizedAnswerScores: TeamScore = {};
    Object.entries(answer.teams).forEach(([team, score]) => {
      const normalizedTeam = normalizeTeamKey(team);
      if (!normalizedTeam) {
        return;
      }

      normalizedAnswerScores[normalizedTeam] = (normalizedAnswerScores[normalizedTeam] || 0) + score;
    });

    const nextQuestionScores = [...questionTeamScores];
    nextQuestionScores[currentQuestion] =
      Object.keys(normalizedAnswerScores).length > 0 ? normalizedAnswerScores : null;

    const nextSelections = [...currentQuestionSelections];
    nextSelections[currentQuestion] = index;

    setQuestionTeamScores(nextQuestionScores);
    setCurrentQuestionSelections(nextSelections);

    const nextScores = calculateTeamScores(nextQuestionScores);

    // Move to next question after a short delay
    setTimeout(() => {
      if (currentQuestion < TEAM_TEST_QUESTIONS.length - 1) {
        setDirection(1);
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        const topTeam = getTopTeamFromScores(nextScores);
        setRecommendedTeam(topTeam);
        setShowResult(true);
      }
    }, 500);
  };

  // ========== Previous Handler ==========
  const handlePrevious = () => {
    if (selectedAnswer !== null) {
      return;
    }

    if (currentQuestion > 0) {
      const previousQuestion = currentQuestion - 1;

      setDirection(-1);
      setCurrentQuestion(previousQuestion);
      setSelectedAnswer(currentQuestionSelections[previousQuestion]);
    }
  };

  // ========== Reset Handler ==========
  const handleReset = () => {
    setCurrentQuestion(0);
    setQuestionTeamScores(Array(TEAM_TEST_QUESTIONS.length).fill(null));
    setCurrentQuestionSelections(Array(TEAM_TEST_QUESTIONS.length).fill(null));
    setSelectedAnswer(null);
    setShowResult(false);
    setRecommendedTeam('');
    setDirection(0);
  };

  // ========== Accept Recommendation ==========
  const handleAcceptRecommendation = () => {
    const mappedTeamId = TEAM_NAME_TO_ID[recommendedTeam] || recommendedTeam;
    onSelectTeam(mappedTeamId);
    onClose();
  };

  return {
    // State
    currentQuestion,
    teamScores,
    selectedAnswer,
    showResult,
    recommendedTeam,
    direction,

    // Computed
    progress,
    currentQuestionData,
    totalQuestions: TEAM_TEST_QUESTIONS.length,
    canGoPrevious: currentQuestion > 0,

    // Handlers
    handleAnswer,
    handlePrevious,
    handleReset,
    handleAcceptRecommendation,
  };
};
