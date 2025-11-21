// components/MyPage/MateHistoryCard.tsx
import { Card } from '../ui/card';
import TeamLogo from '../TeamLogo';
import { MateParty } from '../../types/mate';
import { getStatusLabel, getStatusStyle } from '../../utils/mate';

interface MateHistoryCardProps {
  party: MateParty;
}

export default function MateHistoryCard({ party }: MateHistoryCardProps) {
  const statusStyle = getStatusStyle(party.status);
  const statusLabel = getStatusLabel(party.status);

  return (
    <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow">
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
        </div>
      </div>
    </Card>
  );
}