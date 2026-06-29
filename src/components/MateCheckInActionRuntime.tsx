import { cn } from '../lib/utils';
import { mateInsetPanelClass, mateMobileBarClass, mateSectionCardClass } from '../utils/mateFlowUi';
import { MateCheckCircleIcon, MateLoaderIcon } from './MateIcons';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface MateCheckInActionRuntimeProps {
  isCheckedIn: boolean;
  isChecking: boolean;
  allCheckedIn: boolean;
  isHost: boolean;
  checkedInCount: number;
  totalParticipants: number;
  onCheckIn: () => void;
  onComplete: () => void;
  onNavigateToChat: () => void;
}

export default function MateCheckInActionRuntime({
  isCheckedIn,
  isChecking,
  allCheckedIn,
  isHost,
  checkedInCount,
  totalParticipants,
  onCheckIn,
  onComplete,
  onNavigateToChat,
}: MateCheckInActionRuntimeProps) {
  const primaryMobileAction = !isCheckedIn
    ? {
      label: isChecking ? '처리 중...' : '체크인하기',
      onClick: onCheckIn,
      disabled: isChecking,
      className: 'bg-primary text-white',
    }
    : allCheckedIn
      ? {
        label: '완료 확인',
        onClick: onComplete,
        disabled: false,
        className: 'bg-primary text-white',
      }
      : null;

  return (
    <>
      <Card className={`hidden p-5 lg:flex lg:sticky lg:top-6 ${mateSectionCardClass}`}>
        <div>
          <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
            Next Action
          </p>
          <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">지금 해야 할 일</h3>
          <p className="mt-2 text-body leading-6 text-gray-600 dark:text-white">
            {!isCheckedIn
              ? '먼저 본인 체크인을 완료하세요. 그 다음 그룹 진행률을 확인하면 됩니다.'
              : allCheckedIn
                ? '전체 체크인이 마무리되었습니다. 완료 확인 후 목록으로 돌아갈 수 있습니다.'
                : isHost
                  ? '다른 참여자의 도착 상태를 확인하고 필요하면 채팅에서 위치를 조율하세요.'
                  : '다른 참여자가 도착할 때까지 채팅에서 위치와 시간을 다시 맞출 수 있습니다.'}
          </p>

          <div className="mt-4 space-y-2">
            {!isCheckedIn ? (
              <Button
                onClick={onCheckIn}
                disabled={isChecking}
                className="w-full bg-primary text-white"
              >
                {isChecking ? (
                  <>
                    <MateLoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <MateCheckCircleIcon className="mr-2 h-4 w-4" />
                    체크인하기
                  </>
                )}
              </Button>
            ) : allCheckedIn ? (
              <Button onClick={onComplete} className="w-full bg-primary text-white">
                완료 확인
              </Button>
            ) : (
              <div className={`${mateInsetPanelClass} p-4 text-body text-gray-600 dark:text-white`}>
                {isHost ? '아직 도착하지 않은 참여자를 기다리는 중입니다.' : '다른 참여자의 체크인 완료를 기다리는 중입니다.'}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full border-primary text-primary hover:bg-primary/10"
              onClick={onNavigateToChat}
            >
              채팅으로 이동
            </Button>
          </div>

          <div className={`${mateInsetPanelClass} mt-4 p-4`}>
            <p className="text-body font-semibold text-gray-900 dark:text-white">체크인 기준</p>
            <ul className="mt-3 space-y-2 text-body text-gray-600 dark:text-white">
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>개인 체크인이 먼저 완료되어야 그룹 진행률이 올라갑니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>QR 세션 진입 여부와 관계없이 기록 기준은 동일합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>전원 체크인 이후에는 완료 확인 단계로 넘어갑니다.</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {primaryMobileAction ? (
        <div className={`${mateMobileBarClass} lg:hidden`}>
          <div className="mx-auto max-w-6xl">
            <div className="min-w-0">
              <p className="text-body font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-white">
                체크인 요약
              </p>
              <p className="mt-1 text-body font-semibold text-gray-900 dark:text-white">
                {checkedInCount}/{totalParticipants}명 체크인 완료
              </p>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={onNavigateToChat}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10 sm:flex-1"
              >
                채팅으로
              </Button>
              <Button
                onClick={primaryMobileAction.onClick}
                disabled={primaryMobileAction.disabled}
                className={cn('w-full sm:flex-1', primaryMobileAction.className)}
              >
                {primaryMobileAction.label}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
