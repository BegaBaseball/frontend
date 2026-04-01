// components/MyPage/MateHistoryCard.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import TeamLogo from '../TeamLogo';
import { seedMatePartyQueryData } from '../../hooks/mateList';
import { MateParty } from '../../types/mate';
import { buildMateRouteLocationState, formatGameDate, getStatusLabel, getStatusStyle } from '../../utils/mate';

interface MateHistoryCardProps {
  party: MateParty;
}

export default function MateHistoryCard({ party }: MateHistoryCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const statusStyle = getStatusStyle(party.status);
  const statusLabel = getStatusLabel(party.status);

  // 클릭 핸들러 추가
  const handleClick = () => {
    seedMatePartyQueryData(queryClient, party);
    navigate(`/mate/${party.id}`, {
      state: buildMateRouteLocationState(party),
    });
  };

  return (
    <Card className="p-6 cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
      <div className="flex items-start gap-4">
        <TeamLogo teamId={party.teamId} size="lg" />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-primary" style={{ fontWeight: 700 }}>
              {party.stadium}
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-sm ${statusStyle.bg} ${statusStyle.text}`}
            >
              {statusLabel}
            </span>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>
              날짜: {formatGameDate(party.gameDate)} {party.gameTime.substring(0, 5)}
            </p>
            <p>좌석: {party.section}</p>
            <p>
              참여 인원: {party.currentParticipants}/{party.maxParticipants}명
            </p>
          </div>

          {party.status === 'COMPLETED' && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                경기 관람 완료 · 직거래 일정 종료
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
            <span className="text-sm text-primary">
              상세보기 →
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
