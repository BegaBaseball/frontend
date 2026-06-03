// components/MyPage/MateHistoryCard.tsx
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/card';
import TeamLogo from '../TeamLogo';
import { seedMatePartyQueryData } from '../../hooks/mateList';
import { MateParty } from '../../types/mate';
import { buildMateRouteLocationState, formatGameDate, getMatePartyDisplayTeamId, getStatusLabel, getStatusStyle } from '../../utils/mate';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';

interface MateHistoryCardProps {
  party: MateParty;
}

export default function MateHistoryCard({ party }: MateHistoryCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { dotColor, isLive } = getStatusStyle(party.status);
  const statusLabel = getStatusLabel(party.status);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);

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
        <TeamLogo teamId={getMatePartyDisplayTeamId(party)} size="lg" />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-primary" style={{ fontWeight: 700 }}>
              {stadiumDisplayName}
            </h3>
            <span
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,95,79,.16)] px-[11px] py-[6px] text-[13px] font-bold text-[#1f3d35] whitespace-nowrap [font-variant-numeric:tabular-nums] dark:text-[#a3d4c4] dark:border-white/10"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,.55) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, #f1f8f4 0%, #e6f0eb 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.75), inset 0 -1px 0 rgba(45,95,79,.06), 0 1px 1.5px rgba(15,40,33,.04)',
              }}
            >
              <span
                className="relative shrink-0 rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  flexShrink: 0,
                  background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 55%), radial-gradient(circle at 50% 60%, ${dotColor} 0%, color-mix(in oklab, ${dotColor} 78%, #000) 100%)`,
                  boxShadow: `0 0 0 2.5px color-mix(in oklab, ${dotColor} 16%, transparent), inset 0 -1px 0 color-mix(in oklab, ${dotColor} 60%, #000), inset 0 1px 0 rgba(255,255,255,.55)`,
                }}
              >
                {isLive && (
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: -1,
                      borderRadius: '50%',
                      border: `1.5px solid ${dotColor}`,
                      opacity: 0.6,
                      animation: 'livering 2s cubic-bezier(.16,1,.3,1) infinite',
                    }}
                  />
                )}
              </span>
              {statusLabel}
            </span>
          </div>

          <div className="space-y-1 text-[16px] text-muted-foreground">
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
              <p className="text-[16px] text-green-700">
                경기 관람 완료 · 직거래 일정 종료
              </p>
            </div>
          )}

          {party.status === 'CHECKED_IN' && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-[16px] text-blue-700">
                체크인 완료 · 경기 관람 완료
              </p>
            </div>
          )}
          {/* 상세보기 힌트 추가 */}
          <div className="mt-3 pt-3 border-t">
            <span className="text-[16px] text-primary">
              상세보기 →
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
