import { Card } from './ui/card';
import type { Party } from '../types/mate';

interface MateDetailOverviewSectionProps {
  party: Party;
  summaryTradeLabel: string;
  summaryAmountLabel: string;
  summaryAmount: number;
  summaryPolicyText: string;
  sectionCardClass: string;
  insetPanelClass: string;
}

export default function MateDetailOverviewSection({
  party,
  summaryTradeLabel,
  summaryAmountLabel,
  summaryAmount,
  summaryPolicyText,
  sectionCardClass,
  insetPanelClass,
}: MateDetailOverviewSectionProps) {
  return (
    <Card className={`mb-6 p-4 ${sectionCardClass}`}>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        <div className={`${insetPanelClass} p-3`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">거래 방식</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryTradeLabel}</p>
        </div>
        <div className={`${insetPanelClass} p-3`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">티켓 인증</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{party.ticketVerified ? '인증 완료' : '확인 전'}</p>
        </div>
        <div className={`${insetPanelClass} p-3`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">{summaryAmountLabel}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryAmount.toLocaleString()}원</p>
        </div>
        <div className={`${insetPanelClass} col-span-2 p-3 md:col-span-1`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">취소 규칙</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{summaryPolicyText}</p>
        </div>
        <div className={`${insetPanelClass} p-3`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">참여 현황</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{party.currentParticipants}/{party.maxParticipants}명</p>
        </div>
      </div>
    </Card>
  );
}
