import { useState } from 'react';
import { Answer, TeamScore } from '../types/teamTest';
import { TEAM_TEST_QUESTIONS } from '../constants/teamTestQuestions';
import { TEAM_NAME_TO_ID } from '../constants/teams';

export const useTeamTest = (onSelectTeam: (team: string) => void, onClose: () => void) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [teamScores, setTeamScores] = useState<TeamScore>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [recommendedTeam, setRecommendedTeam] = useState<string>('');
  const [direction, setDirection] = useState(0);

  const progress = ((currentQuestion + 1) / TEAM_TEST_QUESTIONS.length) * 100;
  const currentQuestionData = TEAM_TEST_QUESTIONS[currentQuestion];

  // ========== Answer Handler ==========
  const handleAnswer = (answer: Answer, index: number) => {
    setSelectedAnswer(index);

    // Update scores
    const newScores = { ...teamScores };
    Object.entries(answer.teams).forEach(([team, score]) => {
      newScores[team] = (newScores[team] || 0) + score;
    });
    setTeamScores(newScores);

    // Move to next question after a short delay
    setTimeout(() => {
      if (currentQuestion < TEAM_TEST_QUESTIONS.length - 1) {
        setDirection(1);
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        // Calculate result
        const topTeam = Object.entries(newScores).reduce((a, b) =>
          a[1] > b[1] ? a : b
        )[0];
        setRecommendedTeam(topTeam);
        setShowResult(true);
      }
    }, 500);
  };

  // ========== Previous Handler ==========
  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setDirection(-1);
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
    }
  };

  // ========== Reset Handler ==========
  const handleReset = () => {
    setCurrentQuestion(0);
    setTeamScores({});
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