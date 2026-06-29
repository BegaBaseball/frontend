import { mateInsetPanelClass, mateSectionCardClass } from '../utils/mateFlowUi';
import type { CheckIn } from '../types/mate';
import { MateCheckCircleIcon, MateLoaderIcon, MateMapPinIcon } from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { StatusBadge } from './ui/status-badge';

function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-secondary/80 ${className}`} aria-hidden="true">
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

interface MateCheckInStatusRuntimeProps {
  isCheckedIn: boolean;
  isChecking: boolean;
  allCheckedIn: boolean;
  checkedInCount: number;
  totalParticipants: number;
  remainingCount: number;
  progressValue: number;
  sessionLabel: string;
  myCheckIn?: CheckIn;
  onCheckIn: () => void;
  onComplete: () => void;
}

export default function MateCheckInStatusRuntime({
  isCheckedIn,
  isChecking,
  allCheckedIn,
  checkedInCount,
  totalParticipants,
  remainingCount,
  progressValue,
  sessionLabel,
  myCheckIn,
  onCheckIn,
  onComplete,
}: MateCheckInStatusRuntimeProps) {
  return (
    <>
      {!isCheckedIn ? (
        <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
                Personal Check-In
              </p>
              <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">도착 인증이 아직 필요합니다</h2>
              <p className="mt-2 text-body leading-6 text-gray-600 dark:text-white">
                경기장에 도착했다면 아래 버튼으로 체크인을 완료하세요. 기록은 노쇼 판단과 분쟁 처리 기준으로 사용됩니다.
              </p>
              <ul className="mt-4 space-y-2 text-body text-gray-600 dark:text-white">
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>경기장 근처에서만 체크인이 가능합니다.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>체크인 기록은 노쇼 판정 및 분쟁 처리에 사용됩니다.</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>체크인하지 않으면 노쇼로 처리될 수 있습니다.</span>
                </li>
              </ul>
            </div>

            <div className={`${mateInsetPanelClass} min-w-full p-5 text-center sm:min-w-[280px] lg:max-w-[320px]`}>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/25">
                <MateMapPinIcon className="h-10 w-10 text-primary" />
              </div>
              <p className="mt-4 text-lg font-bold text-gray-900 dark:text-white">체크인 준비 완료</p>
              <p className="mt-2 text-body text-gray-600 dark:text-white">
                경기장에 도착하셨다면 지금 바로 체크인을 진행하세요.
              </p>
              <Button
                onClick={onCheckIn}
                disabled={isChecking}
                className="mt-5 w-full bg-primary text-white"
                size="lg"
              >
                {isChecking ? (
                  <>
                    <MateLoaderIcon className="mr-2 h-5 w-5 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <MateCheckCircleIcon className="mr-2 h-5 w-5" />
                    체크인하기
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
                Personal Status
              </p>
              <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">체크인 완료</h2>
              <p className="mt-2 text-body leading-6 text-gray-600 dark:text-white">
                체크인 시간이 기록되었습니다. 이제 다른 참여자의 도착 상태 또는 최종 완료 단계를 확인하면 됩니다.
              </p>
              <div className={`${mateInsetPanelClass} mt-4 p-4 text-body text-gray-600 dark:text-white`}>
                체크인 시간: {myCheckIn ? new Date(myCheckIn.checkedInAt).toLocaleString('ko-KR') : '-'}
              </div>
            </div>

            <div className={`${mateInsetPanelClass} min-w-full p-5 text-center sm:min-w-[280px] lg:max-w-[320px]`}>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/25">
                <MateCheckCircleIcon className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-lg font-bold text-green-700 dark:text-green-300">도착 인증 완료</p>
              <p className="mt-2 text-body text-gray-600 dark:text-white">
                {allCheckedIn
                  ? '모든 참여자가 체크인을 완료했습니다.'
                  : '다른 참여자의 도착 상태를 계속 확인할 수 있습니다.'}
              </p>
              {allCheckedIn && (
                <Button
                  onClick={onComplete}
                  variant="outline"
                  className="mt-5 w-full border-primary text-primary hover:bg-primary/10"
                >
                  완료 확인
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <Card className={`p-5 sm:p-6 ${mateSectionCardClass}`} data-testid="checkin-progress-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
              Group Progress
            </p>
            <h2 className="mt-2 text-xl font-black text-gray-900 dark:text-white">전체 체크인 진행률</h2>
            <p className="mt-2 text-body text-gray-600 dark:text-white">
              개인 체크인과 별개로 전체 인원이 얼마나 도착했는지 보여줍니다.
            </p>
          </div>
          <StatusBadge
            label={allCheckedIn ? '전원 도착 완료' : `${remainingCount}명 대기 중`}
            tone={allCheckedIn ? 'success' : 'warning'}
            marker={allCheckedIn ? 'check' : 'dot'}
            size="md"
          />
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between text-body text-gray-600 dark:text-white">
            <span>진행률</span>
            <span className="font-semibold text-gray-900 dark:text-white">{progressValue}%</span>
          </div>
          <ProgressBar value={progressValue} className="h-3" />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={`${mateInsetPanelClass} p-4`}>
              <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">완료</p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{checkedInCount}명</p>
            </div>
            <div className={`${mateInsetPanelClass} p-4`}>
              <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">대기</p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{remainingCount}명</p>
            </div>
            <div className={`${mateInsetPanelClass} p-4`}>
              <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">진입 방식</p>
              <p className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{sessionLabel}</p>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
