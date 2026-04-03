import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';

interface AdminDeletePlaceDialogContentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function AdminDeletePlaceDialogContent({
  open,
  onOpenChange,
  onConfirm,
}: AdminDeletePlaceDialogContentProps) {
  return (
    <PlainDialog
      open={open}
      onClose={() => onOpenChange(false)}
      title="장소를 삭제하시겠습니까?"
      description="이 작업은 되돌릴 수 없습니다. 해당 장소 정보가 영구적으로 삭제됩니다."
      className="sm:max-w-md border-slate-800 bg-slate-900 text-slate-100"
      footer={(
        <>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-gradient-to-r from-red-500 to-red-600 text-white border-0 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/25"
          >
            삭제
          </Button>
        </>
      )}
    >
      <div className="text-sm text-slate-400">선택한 장소 정보가 완전히 제거됩니다.</div>
    </PlainDialog>
  );
}
