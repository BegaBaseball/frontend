// components/MyPage/MateHistoryCard.tsx
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import TeamLogo from '../TeamLogo';
import { MateParty } from '../../types/mate';
import { getStatusLabel, getStatusStyle } from '../../utils/mate';
import { useMateStore } from '../../store/mateStore';

interface MateHistoryCardProps {
  party: MateParty;
}

export default function MateHistoryCard({ party }: MateHistoryCardProps) {
  const navigate = useNavigate();
  const setSelectedParty = useMateStore((state) => state.setSelectedParty);

  const statusStyle = getStatusStyle(party.status);
  const statusLabel = getStatusLabel(party.status);

  // 클릭 핸들러 추가
  const handleClick = () => {
    setSelectedParty(party as any);
    localStorage.setItem('selectedParty', JSON.stringify(party));
    navigate(`/mate/${party.id}`);
  };

  return (
    <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
      <div className="flex items-start gap-4">
        <TeamLogo teamId={party.teamId} size="lg" />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 style={{ color: '#2d5f4f', fontWeight: 700 }}>
              {party.stadium}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-1 text-sm text-gray-600">
            <p>
              날짜: {party.gameDate} {party.gameTime}
            </p>
            <p>좌석: {party.section}</p>
            <p>
              참여 인원: {party.currentParticipants}/{party.maxParticipants}명
            </p>
          </div>

          {party.status === 'COMPLETED' && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                경기 관람 완료 · 보증금 환불 완료
              </p>
            </div>
          )}

          {party.status === 'CHECKED_IN' && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                체크인 완료 · 경기 관람 완료
              </p>
            </div>
          )}
          {/* 상세보기 힌트 추가 */}
          <div className="mt-3 pt-3 border-t">
            <span className="text-sm" style={{ color: '#2d5f4f' }}>
              상세보기 →
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}