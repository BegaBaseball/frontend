import { useState } from 'react';

import { Button } from './ui/plain-button';
import {
  MateDetailParticipationBlock,
  MateDetailPriceBox,
  MateDetailQrHint,
  MateDetailReferenceCard,
  buildMateDetailViewModel,
} from './MateDetailReferenceBlocks';
import { MateClockIcon, MateShareIcon } from './MateIcons';
import { mateMobileBarClass } from '../utils/mateFlowUi';
import type { Party } from '../types/mate';

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
  party: Party;
  actionContext: MateDetailActionContext;
  actionButtons: MateDetailActionButton[];
  isAwaitingApproval: boolean;
  primaryMobileAction: MateDetailActionButton | null;
  canAccessCheckIn: boolean;
  onOpenQrPanel: () => void;
  onShare: () => void;
  onBrowsePartyList: () => void;
}

const getMobileActionClass = (actionKey: string) => {
  if (actionKey === 'checkin') return 'border-[#5b21b6] text-[#5b21b6] hover:bg-[#5b21b6]/10 dark:border-violet-400/70 dark:text-violet-300 dark:hover:bg-violet-950/30';
  if (actionKey === 'sale') return 'border-orange-400 text-orange-600 hover:bg-orange-50 dark:border-orange-400/70 dark:text-orange-300 dark:hover:bg-orange-950/30';
  if (actionKey === 'cancel') return 'border-red-200 text-red-500 hover:bg-red-50 dark:border-red-400/50 dark:text-red-300 dark:hover:bg-red-950/30';
  if (actionKey === 'back') return 'border-primary text-primary hover:bg-primary/10 dark:border-emerald-400/60 dark:text-emerald-300 dark:hover:bg-emerald-950/30';
  return 'bg-primary text-white';
};

const formatAmount = (value: number) => `${value.toLocaleString()}원`;

export default function MateDetailActionSection({
  party,
  actionContext,
  actionButtons,
  isAwaitingApproval,
  primaryMobileAction,
  canAccessCheckIn,
  onOpenQrPanel,
  onShare,
  onBrowsePartyList,
}: MateDetailActionSectionProps) {
  const [showSheet, setShowSheet] = useState(false);
  const view = buildMateDetailViewModel(party);
  const applyLabel = view.remainingSeats === 1 ? '마지막 자리 신청하기' : '메이트 신청하기';
  const compactAmountLabel = view.reservationDepositAmount > 0
    ? `예약금 ${formatAmount(view.reservationDepositAmount)}`
    : '승인 후 직거래 조율';

  const getActionLabel = (action: MateDetailActionButton) => {
    if (action.key === 'apply') return applyLabel;
    return action.label;
  };

  const renderActionButtons = () => (
    <div className="space-y-2">
      {isAwaitingApproval && (
        <div className="flex items-start gap-3 rounded-[13px] border border-amber-100 bg-amber-50 p-4 text-[13px] text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200" data-testid="mate-pending-status">
          <MateClockIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-black">신청이 접수되었습니다.</p>
            <p className="mt-1 leading-[1.45]">호스트 승인 전까지는 자유롭게 취소할 수 있고, 승인되면 채팅방 입장 버튼이 열립니다.</p>
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
          {getActionLabel(action)}
        </Button>
      )) : (
        <div className="rounded-[13px] border border-gray-200 bg-gray-50 p-4 text-[13px] text-gray-600 dark:border-border dark:bg-secondary/70 dark:text-white">
          현재 바로 실행할 수 있는 액션은 없습니다. 상태 변화를 기다리거나 목록으로 돌아가세요.
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside data-testid="mate-desktop-action-rail" className="hidden flex-col gap-3.5 lg:sticky lg:top-24 lg:flex lg:max-h-[calc(100dvh_-_7rem)] lg:overflow-y-auto lg:pr-1">
        <MateDetailReferenceCard className="p-5 shadow-[0_8px_24px_rgba(15,23,42,0.07)]">
          <MateDetailParticipationBlock party={party} />
          <div className="my-3.5">
            <MateDetailPriceBox party={party} />
          </div>
          {renderActionButtons()}
          <Button variant="outline" className="mt-2 h-auto w-full rounded-[13px] border-gray-200 bg-white px-3 py-3 text-[14px] font-bold text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10" onClick={onBrowsePartyList}>
            비슷한 파티 보기
          </Button>
          <p className="m-0 mt-3 text-center text-[12px] leading-[1.5] text-gray-400 dark:text-white">승인 전 결제 없음 · 채팅에서 장소 조율</p>
        </MateDetailReferenceCard>
        <MateDetailQrHint canAccessCheckIn={canAccessCheckIn} onOpenQrPanel={onOpenQrPanel} />
        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-[11px] border border-gray-200 bg-white p-3 text-[13px] font-bold text-gray-600 dark:border-border dark:bg-card dark:text-white"
          onClick={onShare}
        >
          <MateShareIcon className="h-4 w-4" /> 친구에게 공유
        </button>
      </aside>

      {primaryMobileAction && (
        <div data-testid="mate-mobile-action-bar" className={`${mateMobileBarClass} pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] lg:hidden`}>
          <div className="mx-auto max-w-3xl">
            <button
              type="button"
              onClick={() => setShowSheet(true)}
              className="mb-2 flex w-full items-center justify-between gap-3 bg-transparent px-0.5 pb-1 text-left"
            >
              <span className="inline-flex min-w-0 flex-1 items-center gap-1.5 text-[12px] font-bold text-gray-900 dark:text-white sm:gap-2 sm:text-[13px]">
                <span className="min-w-0 truncate text-primary">{compactAmountLabel}</span>
                <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-gray-300 dark:bg-white/30" />
                <span className="shrink-0 text-red-600">{view.remainingSeats}자리 남음</span>
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-gray-500 dark:text-white">자세히</span>
            </button>
            <Button
              onClick={() => setShowSheet(true)}
              disabled={primaryMobileAction.disabled}
              variant={primaryMobileAction.key === 'manage' || primaryMobileAction.key === 'apply' || primaryMobileAction.key === 'chat' ? 'default' : (primaryMobileAction.variant ?? 'outline')}
              className={`h-auto w-full rounded-[13px] px-4 py-[15px] text-[16px] font-black ${primaryMobileAction.disabled ? 'bg-gray-300 text-gray-500 dark:bg-secondary/80 dark:text-white' : getMobileActionClass(primaryMobileAction.key)}`}
            >
              {getActionLabel(primaryMobileAction)}
            </Button>
          </div>
        </div>
      )}

      {showSheet && (
        <div className="fixed inset-0 z-[90] flex items-end bg-slate-900/45 dark:bg-black/70 lg:hidden" onClick={() => setShowSheet(false)}>
          <div className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full overflow-y-auto rounded-t-[20px] bg-white px-[18px] pb-[calc(1.25rem_+_env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-18px_44px_rgba(15,23,42,0.18)] dark:bg-[#000000] dark:shadow-[0_-18px_44px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-white/20" />
            <h3 className="m-0 text-[18px] font-black text-gray-900 dark:text-white">{actionContext.eyebrow}</h3>
            <p className="mb-4 mt-1 text-[13px] text-gray-500 dark:text-white">{party.section}</p>
            <div className="mb-3.5"><MateDetailParticipationBlock party={party} /></div>
            <div className="mb-4"><MateDetailPriceBox party={party} /></div>
            {renderActionButtons()}
            <p className="m-0 mt-3 text-center text-[12px] text-gray-400 dark:text-white">승인 전 결제 없음 · 채팅에서 장소 조율</p>
          </div>
        </div>
      )}
    </>
  );
}
