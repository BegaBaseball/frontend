import { Clock } from 'lucide-react';

import { Button } from './ui/plain-button';
import { Card } from './ui/card';
import { mateMobileBarClass } from '../utils/mateFlowUi';

export interface MateDetailActionContext {
  eyebrow: string;
  title: string;
  detail: string;
}

export interface MateDetailActionButton {
  key: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

interface MateDetailActionSectionProps {
  actionContext: MateDetailActionContext;
  actionButtons: MateDetailActionButton[];
  isAwaitingApproval: boolean;
  sectionCardClass: string;
  insetPanelClass: string;
  primaryMobileAction: MateDetailActionButton | null;
  secondaryMobileAction: MateDetailActionButton | null;
}

const getMobileActionClass = (actionKey: string) => {
  if (actionKey === 'checkin') return 'border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10';
  if (actionKey === 'sale') return 'border-orange-400 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/30';
  if (actionKey === 'cancel') return 'border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30';
  if (actionKey === 'back') return 'border-primary text-primary hover:bg-primary/10';
  return 'bg-primary text-white';
};

export default function MateDetailActionSection({
  actionContext,
  actionButtons,
  isAwaitingApproval,
  sectionCardClass,
  insetPanelClass,
  primaryMobileAction,
  secondaryMobileAction,
}: MateDetailActionSectionProps) {
  return (
    <>
      <div className="space-y-4">
        <Card className={`sticky top-6 p-5 ${sectionCardClass}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {actionContext.eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-black text-gray-900 dark:text-white">
            {actionContext.title}
          </h3>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {actionContext.detail}
          </p>

          <div className="mt-4 space-y-2">
            {isAwaitingApproval && (
              <div
                data-testid="mate-pending-status"
                className={`${insetPanelClass} flex items-start gap-3 p-4 text-sm text-gray-600 dark:text-gray-300`}
              >
                <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-400/15 dark:text-amber-200">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    신청이 접수되었습니다.
                  </p>
                  <p className="mt-1">
                    호스트 승인 전까지는 자유롭게 취소할 수 있고, 승인되면 채팅방 입장 버튼이 열립니다.
                  </p>
                </div>
              </div>
            )}
            {actionButtons.length > 0 ? actionButtons.map((action) => (
              <Button
                key={action.key}
                onClick={action.onClick}
                disabled={action.disabled}
                variant={action.variant}
                className={action.className}
              >
                {action.label}
              </Button>
            )) : (
              <div className={`${insetPanelClass} p-4 text-sm text-gray-600 dark:text-gray-300`}>
                현재 바로 실행할 수 있는 액션은 없습니다. 상태 변화를 기다리거나 목록으로 돌아가세요.
              </div>
            )}
          </div>
        </Card>
      </div>

      {primaryMobileAction && (
        <div data-testid="mate-mobile-action-bar" className={`${mateMobileBarClass} lg:hidden`}>
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <div className="min-w-0 flex-[1_1_100%] sm:flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
                {actionContext.eyebrow}
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
                {actionButtons[0]?.disabled ? actionButtons[0].label : actionContext.title}
              </p>
            </div>
            {secondaryMobileAction && (
              <Button
                onClick={secondaryMobileAction.onClick}
                disabled={secondaryMobileAction.disabled}
                variant={secondaryMobileAction.variant ?? 'outline'}
                className={`flex-1 sm:flex-none sm:min-w-[104px] ${getMobileActionClass(secondaryMobileAction.key)}`}
              >
                {secondaryMobileAction.label}
              </Button>
            )}
            <Button
              onClick={primaryMobileAction.onClick}
              disabled={primaryMobileAction.disabled}
              variant={primaryMobileAction.key === 'manage' || primaryMobileAction.key === 'apply' || primaryMobileAction.key === 'chat' ? 'default' : (primaryMobileAction.variant ?? 'outline')}
              className={`flex-1 sm:flex-none sm:min-w-[124px] ${primaryMobileAction.disabled ? 'bg-gray-300 text-gray-500 dark:bg-secondary/80 dark:text-gray-400' : getMobileActionClass(primaryMobileAction.key)}`}
            >
              {primaryMobileAction.label}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
