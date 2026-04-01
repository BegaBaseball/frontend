import { useState } from 'react';
import { Button } from '../ui/button';
import PlainDialog from '../ui/plain-dialog';
import type { PredRecoveryAction, PredictionRunEvent, PredictionErrorCode } from '../../types/predictionFlow';

type PredictionErrorOverlayProps = {
  isOpen: boolean;
  title?: string;
  message?: string;
  errorCode?: PredictionErrorCode;
  copyKey?: PredictionRunEvent['copyKey'];
  actionPriorityOrder: PredRecoveryAction[];
  onAction: (action: PredRecoveryAction) => void | Promise<void>;
  onClose: () => void;
};

type PredictionCopyKey = NonNullable<PredictionRunEvent['copyKey']>;
type RecoveryActionLabel = Record<PredRecoveryAction, string>;
type RecoveryActionList = PredRecoveryAction[];

const ACTION_LABELS: RecoveryActionLabel = {
  RETRY: '다시 시도',
  FALLBACK_SIMPLE: '간단 모드로 전환',
  GO_LIST: '예측으로 돌아가기',
  GO_BACK: '뒤로가기',
};

const COPY_TEXT: Record<PredictionCopyKey, string> = {
  list_load_success: '경기 목록을 불러왔습니다.',
  list_load_empty: '현재 표시할 경기가 없습니다.',
  list_load_error: '네트워크 상태를 확인해 주세요.',
  network_error_message: '현재 네트워크 상태를 확인해 주세요.',
  empty_list_message: '현재 표시할 항목이 없습니다.',
  auth_expired_message: '로그인 세션이 만료되었습니다.',
  detail_validate_success: '현재 입력값은 정상입니다.',
  detail_validate_fail: '입력값을 확인해 주세요.',
  run_started: '요청을 처리 중입니다.',
  run_timeout: '요청이 지연되고 있습니다.',
  run_complete: '요청이 처리되었습니다.',
  run_retry_started: '다시 시도 후 진행해 주세요.',
  result_partial: '일부 데이터가 누락되었습니다.',
  result_render_fail: '결과 렌더링에 실패했습니다.',
  render_fallback_message: '결과 렌더링에 실패했습니다. 텍스트 보기로 전환해 주세요.',
  result_share_done: '공유가 완료되었습니다.',
  validation_hint: '입력 조건을 다시 확인해 주세요.',
  timeout_hint: '응답이 지연되고 있습니다. 잠시 후 재시도하세요.',
};

const DEFAULT_TITLE = '예측 처리 중 오류가 발생했습니다.';
const MIN_RECOVERY_ACTION_COUNT = 2;
const MAX_RECOVERY_ACTION_COUNT = 3;
const ACTION_FALLBACK_ORDER: RecoveryActionList = ['RETRY', 'FALLBACK_SIMPLE', 'GO_LIST', 'GO_BACK'];

const getDefaultActionOrder = (errorCode?: PredictionErrorCode): RecoveryActionList => {
  if (errorCode === 'AUTH_EXPIRED') {
    return ['GO_LIST', 'GO_BACK'];
  }
  if (errorCode === 'VALIDATION') {
    return ['RETRY', 'GO_BACK'];
  }
  if (errorCode === 'PARTIAL_DATA') {
    return ['FALLBACK_SIMPLE', 'GO_LIST'];
  }
  return ['RETRY', 'GO_LIST'];
};

const normalizeRecoveryActions = (
  priorityOrder: RecoveryActionList,
  errorCode?: PredictionErrorCode
) => {
  const uniqueActions = [...new Set(priorityOrder.length > 0 ? priorityOrder : getDefaultActionOrder(errorCode))];
  const normalized = [...uniqueActions];

  for (const action of ACTION_FALLBACK_ORDER) {
    if (normalized.length >= MIN_RECOVERY_ACTION_COUNT) {
      break;
    }
    if (!normalized.includes(action)) {
      normalized.push(action);
    }
  }

  return normalized.slice(0, MAX_RECOVERY_ACTION_COUNT);
};

export default function PredictionErrorOverlay({
  isOpen,
  title,
  message,
  errorCode,
  copyKey,
  actionPriorityOrder,
  onAction,
  onClose,
}: PredictionErrorOverlayProps) {
  const [isBusy, setIsBusy] = useState(false);

  const displayedMessage = message || (copyKey ? COPY_TEXT[copyKey] : undefined) || `오류가 발생했습니다. (${errorCode ?? 'UNKNOWN'})`;

  const actions: PredRecoveryAction[] = normalizeRecoveryActions(actionPriorityOrder, errorCode);

  const handleAction = async (action: PredRecoveryAction) => {
    if (isBusy) {
      return;
    }
    try {
      setIsBusy(true);
      await onAction(action);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <PlainDialog
      open={isOpen}
      onClose={onClose}
      title={title || DEFAULT_TITLE}
      description={displayedMessage}
      className="max-w-md"
      footer={(
        <>
          <Button type="button" variant="outline" onClick={onClose}>닫기</Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {actions.slice(0, 3).map((action) => {
              if (action === 'RETRY') {
                return (
                  <Button
                    key={action}
                    className="w-full sm:w-auto"
                    onClick={() => handleAction(action)}
                    disabled={isBusy}
                  >
                    {ACTION_LABELS[action]}
                  </Button>
                );
              }

              return (
                <Button
                  key={action}
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => handleAction(action)}
                  disabled={isBusy}
                >
                  {ACTION_LABELS[action]}
                </Button>
              );
            })}
          </div>
        </>
      )}
    >
      <div />
    </PlainDialog>
  );
}
