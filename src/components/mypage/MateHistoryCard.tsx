// components/MyPage/MateHistoryCard.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import TeamLogo from '../TeamLogo';
import { StatusBadge } from '../ui/status-badge';
import { seedMatePartyQueryData } from '../../hooks/mateList';
import { MateParty } from '../../types/mate';
import { buildMateRouteLocationState, formatGameDate, getMatePartyDisplayTeamId } from '../../utils/mate';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import { getMateStatusBadgeMeta } from '../../utils/statusBadgeMeta';

interface MateHistoryCardProps {
  party: MateParty;
}

export default function MateHistoryCard({ party }: MateHistoryCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const statusMeta = getMateStatusBadgeMeta(party.status);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);

  const handleClick = () => {
    seedMatePartyQueryData(queryClient, party);
    navigate(`/mate/${party.id}`, {
      state: buildMateRouteLocationState(party),
    });
  };

  return (
    <button
      type="button"
      className="mypage-season-mate-card status-badge-hover-scope"
      data-testid="mypage-mate-card"
      onClick={handleClick}
    >
      <div className="mypage-season-mate-logo">
        <TeamLogo teamId={getMatePartyDisplayTeamId(party)} size="lg" />
      </div>

      <div className="mypage-season-mate-body">
        <div className="mypage-season-mate-top">
          <h3>{stadiumDisplayName}</h3>
          <StatusBadge {...statusMeta} size="md" />
        </div>

        <div className="mypage-season-mate-meta">
          <span>날짜 {formatGameDate(party.gameDate)} {party.gameTime.substring(0, 5)}</span>
          <span>좌석 {party.section}</span>
          <span>인원 {party.currentParticipants}/{party.maxParticipants}명</span>
        </div>

        {party.status === 'COMPLETED' && (
          <div className="mypage-season-mate-note is-completed">
            경기 관람 완료 · 직거래 일정 종료
          </div>
        )}

        {party.status === 'CHECKED_IN' && (
          <div className="mypage-season-mate-note is-checked-in">
            체크인 완료 · 경기 관람 완료
          </div>
        )}
        <span className="mypage-season-mate-link">상세보기</span>
      </div>
    </button>
  );
}
