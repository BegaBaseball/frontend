import QrCodeSvg from './common/QrCodeSvg';

import { Button } from './ui/plain-button';
import PlainDialog from './ui/plain-dialog';

interface MateDetailQrPanelProps {
  open: boolean;
  qrCodeValue: string;
  isQrLoading: boolean;
  qrSessionExpiresAt: string | null;
  qrSessionError: string | null;
  manualCode: string | null;
  onClose: () => void;
  onOpenCheckInPage: () => void;
}

export default function MateDetailQrPanel({
  open,
  qrCodeValue,
  isQrLoading,
  qrSessionExpiresAt,
  qrSessionError,
  manualCode,
  onClose,
  onOpenCheckInPage,
}: MateDetailQrPanelProps) {
  return (
    <PlainDialog
      open={open}
      onClose={onClose}
      title="체크인 QR"
      className="sm:max-w-md"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
          <Button className="bg-primary text-white" onClick={onOpenCheckInPage}>
            체크인 페이지 열기
          </Button>
        </>
      )}
    >
      <div className="flex flex-col items-center gap-4 py-2" data-testid="mate-qr-panel">
        <div className="w-48 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-border/70 dark:bg-secondary/80 dark:shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
          <QrCodeSvg
            value={qrCodeValue}
            size={160}
            style={{ width: '100%', maxWidth: 160, height: 'auto' }}
            fgColor="#1a1a1a"
            bgColor="#ffffff"
            level="Q"
          />
        </div>
        <p className="text-body text-center text-gray-500 dark:text-white/60">
          체크인 QR은 열려 있는 동안만 갱신됩니다.
        </p>
        {isQrLoading ? (
          <p className="text-body text-gray-500 dark:text-white/60">체크인 QR을 새로 불러오는 중입니다.</p>
        ) : null}
        {qrSessionExpiresAt ? (
          <p className="text-body text-gray-500 dark:text-white/60">
            유효: {new Date(qrSessionExpiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        ) : null}
        {manualCode ? (
          <div className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 px-4 py-3 text-center">
            <p className="text-body font-semibold text-gray-900 dark:text-white">수동 체크인 코드</p>
            <p className="mt-2 text-2xl font-black tracking-[0.4em] text-primary">{manualCode}</p>
            <p className="mt-2 text-body text-gray-500 dark:text-white/60">
              세션이 끊겨도 체크인 페이지에서 이 코드를 입력하면 계속 진행할 수 있습니다.
            </p>
          </div>
        ) : null}
        {qrSessionError ? (
          <p className="text-body text-center text-red-500">{qrSessionError}</p>
        ) : null}
      </div>
    </PlainDialog>
  );
}
