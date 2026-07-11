import type { ComponentType, SVGProps } from 'react';

import { cn } from '../lib/utils';
import type { CheckIn, Party } from '../types/mate';
import { mateSectionCardClass, mateSubtlePanelClass } from '../utils/mateFlowUi';
import {
  MateArrowRightCircleIcon,
  MateCheckCircleIcon,
  MateUsersIcon,
} from './icons/MateFlowIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StatusBadge } from './ui/status-badge';

type MateIconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: MateIconComponent;
  title: string;
  description: string;
}) {
  return (
    <div className={`${mateSubtlePanelClass} flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center`}>
      <div className="rounded-full bg-gray-100 p-4 dark:bg-secondary/80">
        <Icon className="h-8 w-8 text-gray-400 dark:text-white" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-body leading-6 text-gray-500 dark:text-white">{description}</p>
    </div>
  );
}

interface MateCheckInRosterRuntimeProps {
  party: Party;
  isHost: boolean;
  isCheckedIn: boolean;
  hostCheckedIn: boolean;
  otherCheckIns: CheckIn[];
  remainingCount: number;
  hasAnyCheckIn: boolean;
  onNavigateToChat: () => void;
}

export default function MateCheckInRosterRuntime({
  party,
  isHost,
  isCheckedIn,
  hostCheckedIn,
  otherCheckIns,
  remainingCount,
  hasAnyCheckIn,
  onNavigateToChat,
}: MateCheckInRosterRuntimeProps) {
  return (
    <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
            Arrival Roster
          </p>
          <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">체크인 현황</h2>
          <p className="mt-2 text-body text-gray-600 dark:text-white">
            이름이 확인된 참여자와 호스트의 도착 상태를 먼저 보여주고, 남은 인원은 수량으로 표시합니다.
          </p>
        </div>
        <Button
          variant="outline"
          className="w-full border-primary text-primary hover:bg-primary/10 sm:w-fit"
          onClick={onNavigateToChat}
        >
          <MateArrowRightCircleIcon className="mr-2 h-4 w-4" />
          채팅으로 이동
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        <div
          className={cn(
            'flex items-center justify-between rounded-2xl border px-4 py-4',
            hostCheckedIn
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25'
              : 'border-gray-200 bg-white/80 dark:border-border/70 dark:bg-card/70',
          )}
        >
            <div className="flex items-center gap-3">
              {hostCheckedIn ? (
                <MateCheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{party.hostName} (호스트)</p>
              <p className="text-body text-gray-500 dark:text-white">
                {hostCheckedIn ? '도착 인증 완료' : '아직 도착 확인 전'}
              </p>
            </div>
          </div>
          <StatusBadge
            label={hostCheckedIn ? '체크인 완료' : '대기 중'}
            tone={hostCheckedIn ? 'success' : 'neutral'}
            marker={hostCheckedIn ? 'check' : 'dot'}
            size="md"
          />
        </div>

        {!isHost ? (
          <div
            className={cn(
              'flex items-center justify-between rounded-2xl border px-4 py-4',
              isCheckedIn
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25'
                : 'border-gray-200 bg-white/80 dark:border-border/70 dark:bg-card/70',
            )}
          >
            <div className="flex items-center gap-3">
              {isCheckedIn ? (
                <MateCheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
              )}
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">나 (본인)</p>
                <p className="text-body text-gray-500 dark:text-white">
                  {isCheckedIn ? '도착 인증 완료' : '아직 도착 확인 전'}
                </p>
              </div>
            </div>
            <StatusBadge
              label={isCheckedIn ? '체크인 완료' : '대기 중'}
              tone={isCheckedIn ? 'success' : 'neutral'}
              marker={isCheckedIn ? 'check' : 'dot'}
              size="md"
            />
          </div>
        ) : null}

        {otherCheckIns.map((checkIn) => (
          <div
            key={checkIn.id}
            className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 dark:border-emerald-900/60 dark:bg-emerald-950/25"
          >
            <div className="flex items-center gap-3">
              <MateCheckCircleIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{checkIn.userName}</p>
                <p className="text-body text-gray-500 dark:text-white">
                  {new Date(checkIn.checkedInAt).toLocaleString('ko-KR')} 체크인
                </p>
              </div>
            </div>
            <StatusBadge label="체크인 완료" tone="success" marker="check" size="md" />
          </div>
        ))}

        {remainingCount > 0 ? (
          <div className={`${mateSubtlePanelClass} px-4 py-4`}>
            <p className="font-semibold text-gray-900 dark:text-white">대기 중인 참여자 {remainingCount}명</p>
            <p className="mt-1 text-body text-gray-500 dark:text-white">
              이름이 아직 확인되지 않은 참여자는 도착 후 체크인 기록으로 반영됩니다.
            </p>
          </div>
        ) : null}

        {!hasAnyCheckIn ? (
          <EmptyState
            icon={MateUsersIcon}
            title="아직 체크인 기록이 없습니다"
            description="첫 체크인이 시작되면 이 영역에 참여자 상태가 순서대로 표시됩니다."
          />
        ) : null}
      </div>
    </Card>
  );
}
