import type { ComponentType, ReactNode, SVGProps } from 'react';

import { cn } from '../lib/utils';
import type { CheckIn, Party } from '../types/mate';
import { mateSectionCardClass, mateSubtlePanelClass } from '../utils/mateFlowUi';
import {
  MateArrowRightCircleIcon,
  MateCheckCircleIcon,
  MateUsersIcon,
} from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';

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
        <Icon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
      </div>
      <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">{title}</p>
      <p className="mt-2 max-w-sm text-[16px] leading-6 text-gray-500 dark:text-gray-300">{description}</p>
    </div>
  );
}

function MatePill({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[16px] font-semibold ${className}`}>
      {children}
    </span>
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
          <p className="text-[16px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
            Arrival Roster
          </p>
          <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">체크인 현황</h2>
          <p className="mt-2 text-[16px] text-gray-600 dark:text-gray-300">
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
              <p className="text-[16px] text-gray-500 dark:text-gray-300">
                {hostCheckedIn ? '도착 인증 완료' : '아직 도착 확인 전'}
              </p>
            </div>
          </div>
          <MatePill
            className={cn(
              'border text-[16px] font-semibold',
              hostCheckedIn
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                : 'border-gray-200 bg-white text-gray-600 dark:border-border dark:bg-card/60 dark:text-gray-300',
            )}
          >
            {hostCheckedIn ? '체크인 완료' : '대기 중'}
          </MatePill>
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
                <p className="text-[16px] text-gray-500 dark:text-gray-300">
                  {isCheckedIn ? '도착 인증 완료' : '아직 도착 확인 전'}
                </p>
              </div>
            </div>
            <MatePill
              className={cn(
                'border text-[16px] font-semibold',
                isCheckedIn
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'
                  : 'border-gray-200 bg-white text-gray-600 dark:border-border dark:bg-card/60 dark:text-gray-300',
              )}
            >
              {isCheckedIn ? '체크인 완료' : '대기 중'}
            </MatePill>
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
                <p className="text-[16px] text-gray-500 dark:text-gray-300">
                  {new Date(checkIn.checkedInAt).toLocaleString('ko-KR')} 체크인
                </p>
              </div>
            </div>
            <MatePill className="border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300">
              체크인 완료
            </MatePill>
          </div>
        ))}

        {remainingCount > 0 ? (
          <div className={`${mateSubtlePanelClass} px-4 py-4`}>
            <p className="font-semibold text-gray-900 dark:text-white">대기 중인 참여자 {remainingCount}명</p>
            <p className="mt-1 text-[16px] text-gray-500 dark:text-gray-300">
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
