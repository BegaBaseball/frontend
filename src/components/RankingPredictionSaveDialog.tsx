import { Button } from './ui/button';
import PlainDialog from './ui/plain-dialog';

interface RankingPredictionSaveDialogProps {
  open: boolean;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function RankingPredictionSaveDialog({
  open,
  isSaving,
  onClose,
  onConfirm,
}: RankingPredictionSaveDialogProps) {
  return (
    <PlainDialog
      open={open}
      onClose={onClose}
      contentTestId="ranking-save-dialog"
      title={<span className="text-primary">순위 확정</span>}
      description={(
        <>
          한번 저장하면 순위 변경이 불가능합니다.<br />
          이대로 순위를 확정하시겠습니까?
        </>
      )}
      className="dark:bg-card dark:border-border"
      footer={(
        <>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={onClose}
            data-testid="ranking-save-dialog-cancel"
            className="text-gray-700 dark:text-white border border-border/60 dark:border-border/80 bg-background dark:bg-card hover:bg-gray-100 dark:hover:bg-primary/10"
          >
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            data-testid="ranking-save-dialog-confirm"
            className="text-white bg-primary-dark hover:bg-primary"
          >
            {isSaving ? '저장 중...' : '확인'}
          </Button>
        </>
      )}
    >
      <div />
    </PlainDialog>
  );
}
