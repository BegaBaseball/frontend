export type PredictionFlowState = 'LIST' | 'DETAIL_EDIT' | 'RUNNING' | 'RESULT' | 'ERROR';

export type PredictionErrorCode =
  | 'NETWORK'
  | 'AUTH_EXPIRED'
  | 'VALIDATION'
  | 'TIMEOUT'
  | 'SERVER'
  | 'PARTIAL_DATA'
  | 'RENDER_FAIL'
  | 'UNKNOWN';

export type PredictionFlowStage =
  | 'LIST_LOAD'
  | 'LIST_RETRY'
  | 'DETAIL_OPEN'
  | 'INPUT_VALIDATE'
  | 'RUN_PRECHECK'
  | 'RUN_SUBMIT'
  | 'RUN_POLL'
  | 'RUN_TIMEOUT'
  | 'RUN_SUCCESS'
  | 'RESULT_FETCH'
  | 'RESULT_PARTIAL'
  | 'RESULT_SUCCESS'
  | 'RENDER_FAIL'
  | 'RESULT_FALLBACK';

export type PredictionFlowEventName =
  | 'onListLoad'
  | 'onListLoadFail'
  | 'onListRetry'
  | 'onDetailOpen'
  | 'onInputInvalid'
  | 'onInputValid'
  | 'onPredictPress'
  | 'onRunStart'
  | 'onRunProgress'
  | 'onRunTimeout'
  | 'onRunCancel'
  | 'onRunFail'
  | 'onRunSuccess'
  | 'onResultPartial'
  | 'onResultSuccess'
  | 'onResultRenderFail'
  | 'onErrorOverlayRetry'
  | 'onErrorOverlayFallback'
  | 'onErrorOverlayExit';

export type PredictionPlatform = 'mobile' | 'desktop';
export type PredValidationSeverity = 'error' | 'warning' | 'info';

export interface PredictionInputValidation {
  fieldId: string;
  severity: PredValidationSeverity;
  messageCode: string;
}

export interface PredictionErrorState {
  errorCode: PredictionErrorCode;
  recoverable: boolean;
  retryEnabled: boolean;
  keepDraft: boolean;
}

export type PredRecoveryAction = 'RETRY' | 'FALLBACK_SIMPLE' | 'GO_LIST' | 'GO_BACK';

export interface PredictionRecoveryState extends PredictionErrorState {
  actionPriorityOrder: PredRecoveryAction[];
}

export type RunProgressBannerAction = 'bg' | 'foreground';

export type PredRecoveryConfig = PredictionRecoveryState;

export type PredictionToastMessageKey =
  | 'list_load_success'
  | 'list_load_empty'
  | 'list_load_error'
  | 'detail_validate_success'
  | 'detail_validate_fail'
  | 'run_started'
  | 'run_timeout'
  | 'run_complete'
  | 'run_retry_started'
  | 'result_partial'
  | 'result_render_fail'
  | 'result_share_done';

export type PredictionCopyKey =
  | 'empty_list_message'
  | 'list_load_success'
  | 'list_load_empty'
  | 'list_load_error'
  | 'detail_validate_success'
  | 'detail_validate_fail'
  | 'run_started'
  | 'run_timeout'
  | 'run_complete'
  | 'run_retry_started'
  | 'result_partial'
  | 'result_render_fail'
  | 'result_share_done'
  | 'network_error_message'
  | 'auth_expired_message'
  | 'validation_hint'
  | 'timeout_hint'
  | 'render_fallback_message';

export type UnifiedPredictionMessageKey =
  | PredictionToastMessageKey
  | PredictionCopyKey;

export interface PredictionRunEvent {
  eventName: PredictionFlowEventName;
  state: PredictionFlowState;
  timestamp: string;
  platform: PredictionPlatform;
  screenId: string;
  source: 'prediction-page';
  flowId?: string;
  gameId?: string;
  tab?: 'match' | 'ranking';
  predictionTabIndex?: number;
  runProgressBannerAction?: RunProgressBannerAction;
  errorCode?: PredictionErrorCode;
  stage?: PredictionFlowStage;
  elapsedMs?: number;
  keepDraft?: boolean;
  retryable?: boolean;
  recoverable?: boolean;
  recoveryAction?: PredRecoveryAction;
  validation?: PredictionInputValidation[];
  meta?: Record<string, unknown>;
  toastKey?: PredictionToastMessageKey;
  copyKey?: UnifiedPredictionMessageKey;
  errorState?: PredictionErrorState;
  recoveryState?: PredictionRecoveryState;
  retryConfig?: PredictionRecoveryState;
}
