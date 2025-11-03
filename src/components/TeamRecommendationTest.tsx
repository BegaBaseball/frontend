import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TeamLogo from './TeamLogo';
import baseballLogo from 'figma:asset/d8ca714d95aedcc16fe63c80cbc299c6e3858c70.png';

interface TeamRecommendationTestProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTeam: (team: string) => void;
}

type Answer = {
  label: string;
  teams: { [key: string]: number };
};

type Question = {
  id: number;
  question: string;
  description?: string;
  answers: Answer[];
};

const questions: Question[] = [
  {
    id: 1,
    question: '고향은 어디인가요?',
    description: '지역 기반으로 연고지를 살펴볼게요',
    answers: [
      { label: '서울', teams: { 'LG': 1, '두산': 1, '키움': 1 } },
      { label: '인천', teams: { 'SSG': 2 } },
      { label: '경기도', teams: { 'KT': 1, 'SSG': 1, '키움': 1 } },
      { label: '충청도', teams: { '한화': 2 } },
      { label: '전라도', teams: { '기아': 2 } },
      { label: '경상도', teams: { '삼성': 1, '롯데': 1, 'NC': 1 } },
    ],
  },
  {
    id: 2,
    question: '야구를 보러 간다면 가장 가까운 구장이 어디인가요?',
    description: '실제로 방문하기 편한 곳도 중요하죠',
    answers: [
      { label: '잠실', teams: { 'LG': 1, '두산': 1 } },
      { label: '고척', teams: { '키움': 2 } },
      { label: '수원', teams: { 'KT': 2 } },
      { label: '대전', teams: { '한화': 2 } },
      { label: '광주', teams: { '기아': 2 } },
      { label: '대구', teams: { '삼성': 2 } },
      { label: '사직', teams: { '롯데': 2 } },
      { label: '창원', teams: { 'NC': 2 } },
      { label: '인천', teams: { 'SSG': 2 } },
    ],
  },
  {
    id: 3,
    question: '가장 먼저 떠오르는 "한국야구하면 생각나는 팀"은?',
    description: '첫 인상도 중요한 인연의 시작이에요',
    answers: [
      { label: '두산', teams: { '두산': 2 } },
      { label: 'LG', teams: { 'LG': 2 } },
      { label: 'SSG', teams: { 'SSG': 2 } },
      { label: 'KT', teams: { 'KT': 2 } },
      { label: 'NC', teams: { 'NC': 2 } },
      { label: '삼성', teams: { '삼성': 2 } },
      { label: '한화', teams: { '한화': 2 } },
      { label: 'KIA', teams: { '기아': 2 } },
      { label: '롯데', teams: { '롯데': 2 } },
    ],
  },
  {
    id: 4,
    question: '당신이 좋아하는 경기 스타일은?',
    description: '야구는 다양한 매력이 있죠',
    answers: [
      { label: '홈런이 팡팡 터지는 타격전', teams: { '두산': 1, '기아': 1, 'SSG': 1 } },
      { label: '투수전처럼 팽팽한 경기', teams: { 'LG': 1, '삼성': 1, 'KT': 1 } },
      { label: '수비 플레이가 깔끔한 경기', teams: { '삼성': 1, 'NC': 1, 'LG': 1 } },
      { label: '빠른 주루와 작전야구', teams: { '키움': 1, '한화': 1, 'KT': 1 } },
    ],
  },
  {
    id: 5,
    question: '다음 기업(브랜드) 중 가장 친숙하거나 긍정적인 이미지를 가진 곳은?',
    description: '모기업에 대한 이미지도 팀 선호도에 영향을 줄 수 있어요',
    answers: [
      { label: '삼성 (Samsung)', teams: { '삼성': 2 } },
      { label: 'LG', teams: { 'LG': 2 } },
      { label: '롯데 (Lotte)', teams: { '롯데': 2 } },
      { label: 'KIA (기아자동차)', teams: { '기아': 2 } },
      { label: '한화 (Hanwha)', teams: { '한화': 2 } },
      { label: 'KT (케이티)', teams: { 'KT': 2 } },
      { label: '신세계 / 이마트 (SSG)', teams: { 'SSG': 2 } },
      { label: 'NC소프트 (NCSOFT)', teams: { 'NC': 2 } },
      { label: '두산 (Doosan)', teams: { '두산': 2 } },
      { label: '키움증권 (Kiwoom)', teams: { '키움': 2 } },
    ],
  },
  {
    id: 6,
    question: '특히 끌리는 선수 스타일은?',
    description: '어떤 선수를 좋아하시나요?',
    answers: [
      { label: '베테랑 리더형', teams: { '두산': 1, 'LG': 1, '삼성': 1 } },
      { label: '루키나 젊은 선수', teams: { 'NC': 1, 'SSG': 1, 'KT': 1 } },
      { label: '장타자', teams: { '기아': 1, '두산': 1, 'SSG': 1 } },
      { label: '철벽 수비형', teams: { '삼성': 1, 'LG': 1, 'NC': 1 } },
      { label: '마운드 장악형 투수', teams: { 'KT': 1, '삼성': 1, 'LG': 1 } },
    ],
  },
  {
    id: 7,
    question: '내가 선호하는 팀 이미지에 가까운 것은?',
    description: '마지막 질문이에요!',
    answers: [
      { label: '전통 강호, 명문팀', teams: { '삼성': 2, 'LG': 2, '두산': 1 } },
      { label: '젊고 도전적인 신흥 강자', teams: { 'SSG': 2, 'NC': 2, 'KT': 1 } },
      { label: '꾸준한 중위권 실속형', teams: { 'LG': 1, 'KT': 1, 'NC': 1 } },
      { label: '약팀이지만 팬심 강한 팀', teams: { '한화': 2, '롯데': 2 } },
      { label: '개성 있고 실험적인 팀', teams: { '키움': 2, 'NC': 1 } },
    ],
  },
];

export default function TeamRecommendationTest({
  isOpen,
  onClose,
  onSelectTeam,
}: TeamRecommendationTestProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [teamScores, setTeamScores] = useState<{ [key: string]: number }>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [recommendedTeam, setRecommendedTeam] = useState<string>('');
  const [direction, setDirection] = useState(0);

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
      if (currentQuestion < questions.length - 1) {
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

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setDirection(-1);
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(null);
    }
  };

  const handleReset = () => {
    setCurrentQuestion(0);
    setTeamScores({});
    setSelectedAnswer(null);
    setShowResult(false);
    setRecommendedTeam('');
    setDirection(0);
  };

  const handleAcceptRecommendation = () => {
    onSelectTeam(recommendedTeam);
    onClose();
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] flex flex-col">
        <DialogTitle className="sr-only">
          응원구단 추천 테스트
        </DialogTitle>
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
                    {currentQuestion + 1}번째 질문 / 총 {questions.length}문항
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

            {/* Question and Answers Container - Takes remaining space */}
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
                  <div className="mb-3 p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border-2 flex-shrink-0"
                    style={{ borderColor: '#2d5f4f' }}
                  >
                    <h4 className="mb-1" style={{ color: '#2d5f4f' }}>
                      {questions[currentQuestion].question}
                    </h4>
                    {questions[currentQuestion].description && (
                      <p className="text-sm text-gray-600">
                        {questions[currentQuestion].description}
                      </p>
                    )}
                  </div>

                  {/* Answers - Scrollable if needed */}
                  <div className="flex-1 overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-2">
                      {questions[currentQuestion].answers.map((answer, index) => (
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
                            selectedAnswer === index
                              ? { borderColor: '#2d5f4f' }
                              : {}
                          }
                        >
                          <div className="flex items-center gap-2">
                            {/* Option Letter */}
                            <div 
                              className={`
                                w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all flex-shrink-0
                                ${selectedAnswer === index 
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
                            
                            <span className="flex-1 text-sm text-gray-900">{answer.label}</span>
                            
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
                disabled={currentQuestion === 0}
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
                <div className="inline-block mb-2 px-4 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 border-2"
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
                <div className="flex justify-center mb-3 p-4 bg-white rounded-3xl shadow-xl border-4 inline-block"
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
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 mb-4 text-left border-2"
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
                          ${team === recommendedTeam 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 shadow-lg' 
                            : 'bg-white border-gray-200'
                          }
                        `}
                        style={
                          team === recommendedTeam
                            ? { borderColor: '#2d5f4f' }
                            : {}
                        }
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
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="text-gray-500 py-2"
                >
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

function getTeamDescription(team: string): string {
  const descriptions: { [key: string]: string } = {
    'LG': 'LG 트윈스는 잠실을 홈으로 하는 전통의 강호입니다. 꾸준한 전력과 뛰어난 투수진으로 팬들에게 사랑받고 있어요.',
    '두산': '두산 베어스는 잠실의 또 다른 주인공! 화려한 타선과 승부욕 강한 경기로 많은 우승을 차지한 명문구단입니다.',
    'SSG': 'SSG 랜더스는 인천을 연고로 하는 젊고 역동적인 팀입니다. 2022년 우승을 차지하며 강팀으로 떠올랐어요.',
    'KT': 'KT 위즈는 수원을 홈으로 하는 창단 10년차 팀으로, 젊은 선수들과 함께 성장하는 재미가 있습니다.',
    '키움': '키움 히어로즈는 고척을 연고로 하며, 역동적이고 창의적인 야구로 팬들에게 즐거움을 선사합니다.',
    'NC': 'NC 다이노스는 창원을 홈으로 하는 야구팀으로, 젊은 에너지와 도전정신이 넘치는 팀입니다.',
    '삼성': '삼성 라이온즈는 대구를 연고로 하는 KBO 최다 우승팀! 전통과 자부심이 살아있는 명문구단입니다.',
    '롯데': '롯데 자이언츠는 부산을 대표하는 팀으로, 열정적인 팬들의 응원이 가득한 사직구장의 주인공입니다.',
    '기아': 'KIA 타이거즈는 광주를 홈으로 하는 우승 경험이 풍부한 전통의 강호입니다. 강력한 타선이 특징이에요.',
    '한화': '한화 이글스는 대전을 연고로 하며, 끈기 있는 경기력과 팬들의 뜨거운 사랑으로 힘내는 팀입니다.',
  };
  return descriptions[team] || '멋진 선택이에요! 함께 응원하며 즐거운 야구 생활을 시작해보세요.';
}
