import { useRef } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { RotateCcw, Award, X, GripVertical } from 'lucide-react';
import TeamLogo from './TeamLogo';
import { toast } from 'sonner@2.0.3';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { usePredictionStore, Team } from '../store/predictionStore';
import podiumImage from 'figma:asset/4b5cf234f729d37970ba7ab9c5a1134fcd8e70b6.png';
import firstPlaceImage from 'figma:asset/f552d9266ac817e0c86b657dead0069395c6da11.png';

export default function RankingPrediction() {
  const rankings = usePredictionStore((state) => state.rankings);
  const availableTeams = usePredictionStore((state) => state.availableTeams);
  const isPredictionSaved = usePredictionStore((state) => state.isPredictionSaved);
  
  const addTeamToRanking = usePredictionStore((state) => state.addTeamToRanking);
  const removeTeamFromRanking = usePredictionStore((state) => state.removeTeamFromRanking);
  const moveTeam = usePredictionStore((state) => state.moveTeam);
  const resetRankings = usePredictionStore((state) => state.resetRankings);
  const completePrediction = usePredictionStore((state) => state.completePrediction);

  // 팀 선택 영역에서 팀 클릭 시
  const handleTeamClick = (team: Team) => {
    addTeamToRanking(team);
  };

  // 순위에서 팀 제거
  const handleRemoveTeam = (index: number) => {
    removeTeamFromRanking(index);
  };

  const handleCompletePrediction = () => {
    if (isComplete) {
      completePrediction();
      toast.success('순위 예측이 완료되었습니다!');
    }
  };

  const handleSave = () => {
    toast.success('예측이 저장되었습니다!');
    // 여기에 실제 저장 로직 추가
  };

  const handleShare = () => {
    toast.success('공유 기능이 준비 중입니다!');
    // 여기에 실제 공유 로직 추가
  };

  const isComplete = rankings.every(team => team !== null);

  // 순위 아이템 컴포넌트
  const RankingItem = ({ team, index }: { team: Team | null; index: number }) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ isDragging }, drag] = useDrag({
      type: 'TEAM',
      item: { index },
      canDrag: team !== null,
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    });

    const [, drop] = useDrop({
      accept: 'TEAM',
      hover: (item: { index: number }) => {
        if (!ref.current) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;
        
        moveTeam(dragIndex, hoverIndex);
        item.index = hoverIndex;
      },
    });

    drag(drop(ref));

    const backgroundColor = index < 5 ? '#2d5f4f' : '#9ca3af';

    return (
      <div
        ref={ref}
        className={`border-2 rounded-xl p-3 transition-all ${
          team 
            ? 'border-transparent bg-white shadow-sm cursor-move' 
            : 'border-dashed border-gray-300 bg-gray-50'
        } ${isDragging ? 'opacity-50' : 'opacity-100'}`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor, fontWeight: 900, fontSize: '1.1rem' }}
          >
            {index + 1}
          </div>

          {team ? (
            <div className="flex items-center gap-3 flex-1">
              <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <TeamLogo team={team.shortName} size={40} />
              <span style={{ fontWeight: 700 }} className="flex-1">{team.name}</span>
              <Button
                onClick={() => handleRemoveTeam(index)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50"
              >
                <X className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 text-center text-gray-400 text-sm">
              팀을 선택하세요
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <DndProvider backend={require('react-dnd-html5-backend').HTML5Backend}>
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Rankings Area - 왼쪽 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 style={{ color: '#2d5f4f' }}>예상 순위</h2>
            <Button
              onClick={resetRankings}
              className="flex items-center gap-2 border-2"
              variant="outline"
              style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </Button>
          </div>

          <div className="space-y-2">
            {rankings.map((team, index) => (
              <RankingItem key={index} team={team} index={index} />
            ))}
          </div>
        </div>

        {/* Team Selection Area - 오른쪽 (3~9위 정도 위치) */}
        <div style={{ marginTop: '140px' }}>
          <h2 className="mb-4" style={{ color: '#2d5f4f' }}>
            팀 선택
            <span className="text-sm text-gray-500 ml-2">
              ({availableTeams.length}/10)
            </span>
          </h2>

          <div className="rounded-xl border-2 bg-white overflow-hidden" style={{ borderColor: '#2d5f4f' }}>
            {availableTeams.length > 0 ? (
              <div className="divide-y">
                {availableTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamClick(team)}
                    className="w-full p-2 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <TeamLogo team={team.shortName} size={32} />
                      <span style={{ fontWeight: 600 }}>{team.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4 text-gray-400">
                {/* 1위 월계관 */}
                <div className="mb-4 mx-auto" style={{ width: '60px' }}>
                  <img src={firstPlaceImage} alt="First Place" className="w-full h-auto object-contain" />
                </div>
                
                {/* 1위 텍스트 */}
                <p className="mb-4" style={{ color: '#2d5f4f', fontWeight: 900, fontSize: '1.5rem' }}>
                  1위
                </p>
                
                {/* 1위 팀 로고 */}
                {rankings[0] && (
                  <div className="mb-6 flex justify-center">
                    <TeamLogo team={rankings[0].shortName} size={140} />
                  </div>
                )}
                
                <p className="text-sm mb-4">모든 팀이 배치되었습니다!</p>
                
                {!isPredictionSaved ? (
                  <Button
                    onClick={handleCompletePrediction}
                    className="w-full text-white"
                    style={{ backgroundColor: '#2d5f4f' }}
                  >
                    예측 완료
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleSave}
                      className="w-full text-white"
                      style={{ backgroundColor: '#2d5f4f' }}
                    >
                      저장하기
                    </Button>
                    <Button
                      onClick={handleShare}
                      variant="outline"
                      className="w-full border-2"
                      style={{ borderColor: '#2d5f4f', color: '#2d5f4f' }}
                    >
                      공유하기
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
