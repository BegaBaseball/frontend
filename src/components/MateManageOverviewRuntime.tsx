import { lazy, Suspense, type ComponentType, type ReactNode, type SVGProps } from 'react';

import grassDecor from '../assets/3aa01761d11828a81213baa8e622fec91540199d.webp';
import TeamLogo from './TeamLogo';
import {
  MateCalendarIcon,
  MateCheckCircleIcon,
  MateChevronLeftIcon,
  MateClockIcon,
  MateMapPinIcon,
  MateTicketIcon,
  MateUsersIcon,
  MateWalletIcon,
} from './MateIcons';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StatusBadge } from './ui/status-badge';
import type {
  MateManageContentRuntimeProps,
} from './MateManageContentRuntime';
import { type Application, type Party } from '../types/mate';
import { cn } from '../lib/utils';
import {
  getBadgeMeta,
  getPartyFlowLabel,
  mateHeroCardClass,
  mateInsetPanelClass,
  mateMetaLabelClass,
  matePageShellClass,
  mateSectionCardClass,
  mateSummaryGridClass,
} from '../utils/mateFlowUi';
import { formatGameDate, getMatePartyDisplayTeamId } from '../utils/mate';
import { formatStadiumDisplayName } from '../utils/stadiumDisplay';
import { getMateStatusBadgeMeta } from '../utils/statusBadgeMeta';

const LazyMateManageContentRuntime = lazy(() => import('./MateManageContentRuntime'));
type MateIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

type MateManageOverviewRuntimeProps = {
  party: Party;
  approvedApplications: Application[];
  pendingApplications: Application[];
  isPartyRevalidating: boolean;
  applicationActionError: string;
  contentProps: MateManageContentRuntimeProps;
  onNavigateBack: () => void;
};

type SummaryItemProps = {
  icon: MateIconComponent;
  label: string;
  value: string;
  detail: string;
};

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

function InlineBadge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-body font-semibold', className)}>
      {children}
    </span>
  );
}

export default function MateManageOverviewRuntime({
  party,
  approvedApplications,
  pendingApplications,
  isPartyRevalidating,
  applicationActionError,
  contentProps,
  onNavigateBack,
}: MateManageOverviewRuntimeProps) {
  const statusMeta = getMateStatusBadgeMeta(party.status);
  const hostBadgeMeta = getBadgeMeta(party.hostBadge);
  const flowLabel = getPartyFlowLabel(party.status);
  const stadiumDisplayName = formatStadiumDisplayName(party.stadium);
  const responseSummary = pendingApplications.length > 0 ? `${pendingApplications.length}건` : '없음';
  const summaryItems = [
    {
      icon: MateWalletIcon,
      label: '거래 방식',
      value: flowLabel,
      detail: '승인 후 채팅으로 전달을 조율합니다.',
    },
    {
      icon: MateTicketIcon,
      label: '티켓 상태',
      value: party.ticketVerified ? '호스트 인증 완료' : '티켓 인증 전',
      detail: party.ticketVerified ? '상세페이지와 동일한 신뢰 배지가 노출됩니다.' : '참여자에게 인증 배지가 아직 보이지 않습니다.',
    },
    {
      icon: MateCheckCircleIcon,
      label: '승인 완료',
      value: `${approvedApplications.length}명`,
      detail: approvedApplications.length > 0 ? '채팅방과 체크인 흐름을 바로 열 수 있습니다.' : '아직 확정된 참여자가 없습니다.',
    },
    {
      icon: MateClockIcon,
      label: '응답 필요',
      value: responseSummary,
      detail: pendingApplications.length > 0 ? '빠른 승인/거절이 전환율에 직접 영향을 줍니다.' : '새 신청이 들어오면 여기서 바로 대응합니다.',
    },
  ] satisfies ReadonlyArray<SummaryItemProps>;
  const mateManageContentFallback = (
    <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
      <p className="text-body text-gray-500 dark:text-white">관리 패널을 준비하고 있습니다.</p>
    </Card>
  );

  return (
    <div className={`${matePageShellClass} pb-40 lg:pb-10`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.10),_transparent_55%)] dark:bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),_transparent_48%)]" />
      <img
        src={grassDecor}
        alt=""
        className="fixed bottom-0 left-0 h-24 w-full object-cover object-top opacity-30 pointer-events-none"
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Button
          variant="ghost"
          onClick={onNavigateBack}
          className="mb-3 -ml-2 sm:mb-4"
        >
          <MateChevronLeftIcon className="mr-2 h-4 w-4" />
          뒤로
        </Button>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className={`status-badge-hover-scope p-0 ${mateHeroCardClass}`}>
              <div className="border-b border-gray-200/70 bg-[linear-gradient(135deg,_rgba(22,163,74,0.12),_rgba(255,255,255,0.92)_55%,_rgba(22,163,74,0.04))] px-6 py-6 dark:border-border/70 dark:bg-[linear-gradient(135deg,_rgba(16,185,129,0.18),_rgba(0,0,0,0.94)_58%,_rgba(16,185,129,0.08))] sm:px-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3 sm:gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl border border-white/70 bg-white/90 shadow-lg dark:border-white/10 dark:bg-white/10 sm:h-16 sm:w-16">
                      <TeamLogo teamId={getMatePartyDisplayTeamId(party)} size="md" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-13 font-semibold text-primary/80 dark:text-emerald-300">
                        Host Control
                      </p>
                      <h1 className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white sm:text-3xl">
                        파티 관리
                      </h1>
                      <p className="mt-3 max-w-2xl text-body leading-6 text-gray-600 dark:text-white">
                        신청 검토, 승인 결정, 채팅 연결, 체크인 준비까지 한 흐름으로 정리합니다.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <StatusBadge {...statusMeta} size="md" />
                        <InlineBadge className="border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15 dark:text-emerald-300">
                          {flowLabel}
                        </InlineBadge>
                        {party.ticketVerified && (
                          <InlineBadge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
                            <span className="flex items-center gap-1">
                              <MateTicketIcon className="h-3.5 w-3.5" />
                              티켓 인증
                            </span>
                          </InlineBadge>
                        )}
                        {hostBadgeMeta && (
                          <InlineBadge className={cn(hostBadgeMeta.className)}>
                            {hostBadgeMeta.label}
                          </InlineBadge>
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
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {stadiumDisplayName}
                          </p>
                          <p className="text-body text-gray-500 dark:text-white">{party.section}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <MateUsersIcon className="mt-0.5 h-4 w-4 text-primary" />
                        <div>
                          <p className={mateMetaLabelClass}>참여 현황</p>
                          <p className="mt-1 font-semibold text-gray-900 dark:text-white">
                            {party.currentParticipants}/{party.maxParticipants}명
                          </p>
                          <p className="text-body text-gray-500 dark:text-white">승인 {approvedApplications.length}명, 대기 {pendingApplications.length}건</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className={mateSummaryGridClass} data-testid="manage-summary-strip">
              {summaryItems.map((item) => (
                <SummaryItem key={item.label} {...item} />
              ))}
            </div>

            {isPartyRevalidating && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
                <AlertDescription className="text-blue-700 dark:text-blue-300 text-body">
                  최신 파티 정보를 다시 확인하고 있습니다.
                </AlertDescription>
              </Alert>
            )}

            {applicationActionError && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
                <AlertDescription className="text-red-700 dark:text-red-300">
                  {applicationActionError}
                </AlertDescription>
              </Alert>
            )}

            <Suspense fallback={mateManageContentFallback}>
              <LazyMateManageContentRuntime {...contentProps} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
