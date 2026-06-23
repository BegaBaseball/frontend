import { Button } from './ui/plain-button';
import PlainDialog from './ui/plain-dialog';
import { Input } from './ui/input';
import type { CancelReasonType } from '../types/mate';

type CancelReasonOption = {
  value: CancelReasonType;
  label: string;
  description: string;
};

interface MateDetailActionDialogsProps {
  showCancelDialog: boolean;
  showSaleDialog: boolean;
  isCancelling: boolean;
  isConvertingToSale: boolean;
  cancelReasonOptions: CancelReasonOption[];
  selectedCancelReason: CancelReasonType;
  cancelMemo: string;
  salePrice: string;
  salePriceError: string;
  onCloseCancelDialog: () => void;
  onExecuteCancelApplication: () => void;
  onSelectCancelReason: (reason: CancelReasonType) => void;
  onChangeCancelMemo: (value: string) => void;
  onCloseSaleDialog: () => void;
  onConfirmSale: () => void;
  onChangeSalePrice: (value: string) => void;
}

export default function MateDetailActionDialogs({
  showCancelDialog,
  showSaleDialog,
  isCancelling,
  isConvertingToSale,
  cancelReasonOptions,
  selectedCancelReason,
  cancelMemo,
  salePrice,
  salePriceError,
  onCloseCancelDialog,
  onExecuteCancelApplication,
  onSelectCancelReason,
  onChangeCancelMemo,
  onCloseSaleDialog,
  onConfirmSale,
  onChangeSalePrice,
}: MateDetailActionDialogsProps) {
  return (
    <>
      <PlainDialog
        open={showCancelDialog}
        onClose={onCloseCancelDialog}
        title="취소 사유 선택"
        className="sm:max-w-lg"
        footer={(
          <>
            <Button
              variant="outline"
              disabled={isCancelling}
              onClick={onCloseCancelDialog}
            >
              뒤로가기
            </Button>
            <Button
              disabled={isCancelling}
              className="bg-primary text-white"
              onClick={onExecuteCancelApplication}
            >
              {isCancelling ? '취소 처리 중...' : '취소하기'}
            </Button>
          </>
        )}
      >
        <div className="py-2">
          <p className="mb-3 text-[16px] text-gray-600 dark:text-white">
            직거래 파티는 취소 시 플랫폼 결제/환불이 적용되지 않습니다.
          </p>
          <div className="space-y-2">
            {cancelReasonOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSelectCancelReason(option.value)}
                className={`w-full rounded-lg border px-3 py-2 text-left transition ${selectedCancelReason === option.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-gray-200 bg-white text-gray-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white'
                  }`}
                disabled={isCancelling}
              >
                <p className="font-semibold">{option.label}</p>
                <p className="text-[16px] text-gray-500 dark:text-white">{option.description}</p>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-[16px] font-semibold text-gray-700 dark:text-white">
              추가 메모 (선택)
            </label>
            <Input
              value={cancelMemo}
              onChange={(event) => onChangeCancelMemo(event.target.value)}
              placeholder="선택 사유를 더 자세히 입력하세요."
              disabled={isCancelling}
            />
          </div>
        </div>
      </PlainDialog>

      <PlainDialog
        open={showSaleDialog}
        onClose={onCloseSaleDialog}
        title="티켓 판매 전환"
        className="sm:max-w-md"
        footer={(
          <>
            <Button
              variant="outline"
              disabled={isConvertingToSale}
              onClick={onCloseSaleDialog}
            >
              취소
            </Button>
            <Button
              disabled={isConvertingToSale}
              className="bg-primary text-white"
              onClick={onConfirmSale}
            >
              {isConvertingToSale ? '전환 중...' : '확인'}
            </Button>
          </>
        )}
      >
        <div className="py-2">
          <label className="mb-1 block text-[16px] font-semibold text-gray-700 dark:text-white">
            판매 가격 (원)
          </label>
          <Input
            type="number"
            min={100}
            step={1}
            placeholder="예: 15000"
            value={salePrice}
            onChange={(event) => onChangeSalePrice(event.target.value)}
            className="mt-1"
          />
          {salePriceError && (
            <p className="mt-1 text-[16px] text-red-500">{salePriceError}</p>
          )}
        </div>
      </PlainDialog>
    </>
  );
}
