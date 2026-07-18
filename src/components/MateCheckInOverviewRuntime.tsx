import { type ComponentType, type ReactNode, type SVGProps } from 'react';

import type { CheckIn, Party } from '../types/mate';
import { formatGameDate, getMatePartyDisplayTeamId } from '../utils/mate';
import {
  getPartyFlowLabel,
  mateHeroCardClass,
  mateInsetPanelClass,
  mateMetaLabelClass,
  mateSummaryGridClass,
} from '../utils/mateFlowUi';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { getMateStatusBadgeMeta } from '../utils/statusBadgeMeta';
import {
  MateCalendarIcon,
  MateCheckCircleIcon,
  MateClockIcon,
  MateMapPinIcon,
  MateQrCodeIcon,
  MateUsersIcon,
} from './icons/MateFlowIcons';
import TeamLogo from './TeamLogo';
import { Card } from './ui/card';
import { StatusBadge } from './ui/status-badge';

type MateIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type SummaryItemProps = {
  icon: MateIconComponent;
  label: string;
  value: string;
  detail: string;
};

interface MateCheckInOverviewRuntimeProps {
  party: Party;
  isHost: boolean;
  isCheckedIn: boolean;
  qrSessionId?: string;
  allCheckedIn: boolean;
  checkedInCount: number;
  totalParticipants: number;
  remainingCount: number;
  myCheckIn?: CheckIn;
}

function SummaryItem({ icon: Icon, label, value, detail }: SummaryItemProps) {
  return (
    <div className={`${mateInsetPanelClass} p-4`}>
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-2.5 shadow-sm dark:border-border/70 dark:bg-card/80">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className={mateMetaLabelClass}>
            {label}
          </p>
          <p className="mt-2 text-base font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="mt-1 text-body text-gray-500 dark:text-white">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function MatePill({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-body font-semibold ${className}`}>
      {children}
    </span>
  );
}

export default function MateCheckInOverviewRuntime({
  party,
  isHost,
  isCheckedIn,
  qrSessionId,
  allCheckedIn,
  checkedInCount,
  totalParticipants,
  remainingCount,
  myCheckIn,
}: MateCheckInOverviewRuntimeProps) {
  const statusMeta = getMateStatusBadgeMeta(party.status);
  const flowLabel = getPartyFlowLabel(party.status);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const roleLabel = isHost ? '호스트 모드' : '참여자 모드';
  const sessionLabel = qrSessionId ? 'QR 세션 진입' : '일반 진입';
  const currentStateLabel = allCheckedIn
    ? '전원 도착 완료'
    : isCheckedIn
      ? '내 체크인 완료'
      : '도착 확인 필요';
  const currentStateDetail = allCheckedIn
    ? '모든 참여자의 도착 기록이 확정되었습니다.'
    : isCheckedIn
      ? '다른 참여자의 도착 상태를 기다리는 중입니다.'
      : '경기장 도착 후 체크인을 진행해주세요.';
  const summaryItems = [
    {
      icon: MateCheckCircleIcon,
      label: '현재 상태',
      value: currentStateLabel,
      detail: currentStateDetail,
    },
    {
      icon: MateUsersIcon,
      label: '진행률',
      value: `${checkedInCount}/${totalParticipants}명`,
      detail: remainingCount > 0 ? `아직 ${remainingCount}명 도착 대기 중` : '전원 체크인 완료',
    },
    {
      icon: isCheckedIn ? MateCheckCircleIcon : MateClockIcon,
      label: '내 상태',
      value: isCheckedIn ? '체크인 완료' : '아직 미완료',
      detail: isCheckedIn && myCheckIn
        ? `${new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR')} 기록`
        : '경기장 근처에서만 체크인이 가능합니다.',
    },
    {
      icon: MateQrCodeIcon,
      label: '진입 방식',
      value: sessionLabel,
      detail: qrSessionId ? '상세페이지 QR 링크를 통해 연결되었습니다.' : '직접 진입한 체크인 화면입니다.',
    },
  ];

  return (
    <>
      <Card className={`status-badge-hover-scope p-0 ${mateHeroCardClass}`}>
        <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-5 py-5 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(0,0,0,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-8 sm:py-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 gap-3 sm:gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10 sm:h-16 sm:w-16">
                <TeamLogo teamId={getMatePartyDisplayTeamId(party)} size="md" />
              </div>
              <div className="min-w-0">
                <p className="text-13 font-semibold text-primary/80 dark:text-emerald-300">
                  Arrival Status
                </p>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                  체크인
                </h1>
                <p className="mt-3 max-w-2xl text-body leading-6 text-gray-600 dark:text-white">
                  경기장 도착 상태와 전체 진행률을 한 화면에서 확인합니다. 개인 인증과 그룹 진행 상황을 분리해서 보여줍니다.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge {...statusMeta} size="md" />
                  <MatePill className="border border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                    {roleLabel}
                  </MatePill>
                  <MatePill className="border border-gray-200 bg-white/90 text-gray-700 dark:border-border dark:bg-card/70 dark:text-white">
                    {flowLabel}
                  </MatePill>
                  {qrSessionId && (
                    <MatePill className="border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300">
                      <span className="flex items-center gap-1">
                        <MateQrCodeIcon className="h-3.5 w-3.5" />
                        QR 세션
                      </span>
                    </MatePill>
                  )}
                </div>
              </div>
            </div>

            <div className={`${mateInsetPanelClass} min-w-full p-4 sm:min-w-[280px] lg:max-w-[320px]`}>
              <div className="grid gap-3 text-body text-gray-600 dark:text-white">
                <div className="flex items-start gap-3">
                  <MateCalendarIcon className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className={mateMetaLabelClass}>일정</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {formatGameDate(party.gameDate)} {party.gameTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MateMapPinIcon className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className={mateMetaLabelClass}>경기장 / 좌석</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{stadiumDisplayName}</p>
                    <p className="text-body text-gray-500 dark:text-white">{party.section}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MateUsersIcon className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className={mateMetaLabelClass}>참여 인원</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                      {checkedInCount}/{totalParticipants}명 체크인
                    </p>
                    <p className="text-body text-gray-500 dark:text-white">
                      {remainingCount > 0 ? `${remainingCount}명 도착 대기` : '전원 도착 완료'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className={mateSummaryGridClass} data-testid="checkin-summary-strip">
        {summaryItems.map((item) => (
          <SummaryItem key={item.label} {...item} />
        ))}
      </div>
    </>
  );
}
