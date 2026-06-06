import { lazy, Suspense } from 'react';

import PlainDialog from './ui/plain-dialog';

const MateDetailRuntime = lazy(() => import('./MateDetailRuntime'));

interface MatePartyDetailDrawerProps {
  partyId: string;
  onClose: () => void;
}

/**
 * 데스크톱(xl+) 전용 우측 슬라이드오버 드로어.
 * 목록을 유지한 채 `MateDetailRuntime`을 패널 모드로 렌더한다.
 * focus-trap·ESC·body scroll-lock·overlay 클릭 닫기는 PlainDialog(placement="right")에서 상속.
 */
export default function MatePartyDetailDrawer({ partyId, onClose }: MatePartyDetailDrawerProps) {
  return (
    <PlainDialog
      open
      onClose={onClose}
      placement="right"
      hideHeader
      ariaLabel="메이트 파티 상세"
      contentTestId="mate-detail-drawer"
    >
      <Suspense
        fallback={(
          <div className="px-6 py-10 text-center text-[16px] text-gray-500 dark:text-gray-300">
            메이트 상세를 준비하고 있습니다.
          </div>
        )}
      >
        <MateDetailRuntime id={partyId} variant="panel" onClose={onClose} />
      </Suspense>
    </PlainDialog>
  );
}
