import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TeamLogo from './TeamLogo';
import baseballLogo from '../assets/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';
import { TeamRecommendationTestProps } from '../types/teamTest';
import { useTeamTest } from '../hooks/useTeamTest';
import { getTeamDescription } from '../constants/teams';

export default function TeamRecommendationTest({
  isOpen,
  onClose,
  onSelectTeam,
}: TeamRecommendationTestProps) {
  const {
    currentQuestion,
    teamScores,
    selectedAnswer,
    showResult,
    recommendedTeam,
    direction,
    progress,
    currentQuestionData,
    totalQuestions,
    canGoPrevious,
    handleAnswer,
    handlePrevious,
    handleReset,
    handleAcceptRecommendation,
  } = useTeamTest(onSelectTeam, onClose);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogTitle className="sr-only">응원구단 추천 테스트</DialogTitle>
        <DialogDescription className="sr-only">
          7개의 질문에 답하여 당신에게 맞는 KBO 구단을 찾아보세요
        </DialogDescription>

        {!showResult ? (
          <div className="flex flex-col h-full py-3">
            {/* Header with Baseball Logo */}
            <div className="mb-3 flex-shrink-0">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 flex-shrink-0">
                  <img src={baseballLogo} alt="Baseball" className="w-full h-full" />
                </div>
                <div className="flex-1">
                  <h3 style={{ color: '#2d5f4f' }}>나와 딱 맞는 팀 찾기</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentQuestion + 1}번째 질문 / 총 {totalQuestions}문항
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="relative">
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: '#2d5f4f' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>

            {/* Question and Answers Container */}
            <div className="flex-1 flex flex-col min-h-0 mb-3">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentQuestion}
                  custom={direction}
                  initial={{ opacity: 0, x: direction > 0 ? 50 : -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction > 0 ? -50 : 50 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col h-full"
                >
                  {/* Question Card */}
                  <div
                    className="mb-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 flex-shrink-0"
                    style={{ borderColor: '#2d5f4f' }}
                  >
                    <h4 className="mb-1" style={{ color: '#2d5f4f' }}>
                      {currentQuestionData.question}
                    </h4>
                    {currentQuestionData.description && (
                      <p className="text-sm text-gray-600">
                        {currentQuestionData.description}
                      </p>
                    )}
                  </div>

                  {/* Answers - Scrollable if needed */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-2">
                      {currentQuestionData.answers.map((answer, index) => (
                        <motion.button
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleAnswer(answer, index)}
                          className={`
                            p-3 rounded-lg border-2 text-left transition-all
                            ${
                              selectedAnswer === index
                                ? 'bg-green-50 shadow-lg'
                                : 'border-gray-200 bg-white hover:bg-green-50/50 hover:shadow-md'
                            }
                          `}
                          style={
                            selectedAnswer === index ? { borderColor: '#2d5f4f' } : {}
                          }
                        >
                          <div className="flex items-center gap-2">
                            {/* Option Letter */}
                            <div
                              className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all flex-shrink-0
                                ${
                                  selectedAnswer === index
                                    ? 'text-white shadow-lg'
                                    : 'bg-gray-100 text-gray-600'
                                }
                              `}
                              style={
                                selectedAnswer === index
                                  ? { backgroundColor: '#2d5f4f' }
                                  : {}
                              }
                            >
                              {String.fromCharCode(65 + index)}
                            </div>

                            <span className="flex-1 text-sm text-gray-900">
                              {answer.label}
                            </span>

                            {selectedAnswer === index && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: '#2d5f4f' }}
                              >
                                <ChevronRight className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation - Fixed at bottom */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 flex-shrink-0">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={!canGoPrevious}
                className="flex items-center gap-2 rounded-full px-4 py-2"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-gray-500 rounded-full px-4 py-2"
              >
                나중에 할게요
              </Button>
            </div>
          </div>
        ) : (
          // Result Screen
          <div className="py-3 overflow-y-auto max-h-[calc(80vh-3rem)]">
            <div className="text-center">
              {/* Baseball Character */}
              <div className="flex justify-center mb-3">
                <div className="w-20 h-20">
                  <img src={baseballLogo} alt="Baseball" className="w-full h-full" />
                </div>
              </div>

              {/* Result Text */}
              <div className="mb-3">
                <div
                  className="inline-block mb-2 px-4 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 border-2"
                  style={{ borderColor: '#2d5f4f' }}
                >
                  <span className="text-sm" style={{ color: '#2d5f4f' }}>
                    테스트 완료!
                  </span>
                </div>
                <h3 className="mb-3" style={{ color: '#2d5f4f' }}>
                  당신에게 추천하는 팀은
                </h3>
              </div>

              {/* Team Logo and Name */}
              <div className="mb-4">
                <div
                  className="flex justify-center mb-3 p-4 bg-white rounded-3xl shadow-xl border-4 inline-block"
                  style={{ borderColor: '#2d5f4f' }}
                >
                  <div className="w-20 h-20">
                    <TeamLogo team={recommendedTeam} size="lg" />
                  </div>
                </div>

                <h2 className="mb-2" style={{ color: '#2d5f4f' }}>
                  {recommendedTeam}
                </h2>
              </div>

              {/* Team Description */}
              <div
                className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 text-left border-2"
                style={{ borderColor: '#2d5f4f' }}
              >
                <p className="text-sm text-gray-700 leading-relaxed">
                  {getTeamDescription(recommendedTeam)}
                </p>
              </div>

              {/* Scores Summary */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">팀별 점수</p>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto px-1">
                  {Object.entries(teamScores)
                    .sort((a, b) => b[1] - a[1])
                    .map(([team, score]) => (
                      <div
                        key={team}
                        className={`
                          flex items-center justify-between p-2.5 rounded-lg transition-all border-2
                          ${
                            team === recommendedTeam
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 shadow-lg'
                              : 'bg-white border-gray-200'
                          }
                        `}
                        style={team === recommendedTeam ? { borderColor: '#2d5f4f' } : {}}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 flex-shrink-0">
                            <TeamLogo team={team} size="sm" />
                          </div>
                          <span className="text-sm">{team}</span>
                        </div>
                        <span
                          className="text-sm"
                          style={
                            team === recommendedTeam
                              ? { color: '#2d5f4f' }
                              : { color: '#6b7280' }
                          }
                        >
                          {score}점
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleAcceptRecommendation}
                  className="w-full py-4 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
                  style={{ backgroundColor: '#2d5f4f' }}
                >
                  {recommendedTeam} 팬으로 시작하기
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="w-full py-4 rounded-full border-2"
                  style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                >
                  다시 테스트하기
                </Button>
                <Button variant="ghost" onClick={onClose} className="text-gray-500 py-2">
                  나중에 선택하기
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}