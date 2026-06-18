import { isManualBaseballDataRequiredCode, MANUAL_BASEBALL_DATA_REQUIRED_CODE } from './errorUtils';

export const PREDICTION_MANUAL_GAME_SUMMARY_TITLE = '경기 주요 기록 입력이 필요합니다.';
export const PREDICTION_MANUAL_GAME_SUMMARY_MESSAGE = '완료 경기의 주요 기록/요약 데이터가 없어 임의로 채우지 않습니다. 운영자가 game_summary 데이터를 입력하면 경기 요약과 상세 분석을 다시 확인할 수 있습니다.';
export const PREDICTION_MANUAL_SCOREBOARD_MESSAGE = '최종 스코어만 표시 중입니다. 이닝별 스코어와 주요 기록은 수동 데이터 입력 후 갱신됩니다.';
export const PREDICTION_MANUAL_LIVE_SCORE_MESSAGE = '실시간 점수/이닝 데이터가 준비되지 않아 현재 표시 중인 스코어보드를 유지합니다. game_inning_scores 또는 game_events 데이터가 입력되면 다음 polling 주기에 갱신됩니다.';
export const PREDICTION_MANUAL_LIVE_RELAY_MESSAGE = '문자중계 데이터만 준비 대기 중입니다. score/inning polling은 계속 진행됩니다.';
export const PREDICTION_MANUAL_COACH_MESSAGE = '경기 주요 기록이 없어 AI 코치 리뷰와 상세 분석을 생성하지 않습니다.';
export const PREDICTION_MANUAL_TIMELINE_MESSAGE = '경기 주요 기록이 입력되지 않아 임의로 채우지 않습니다. 운영자가 game_summary 데이터를 입력하면 주요 기록 타임라인을 다시 확인할 수 있습니다.';

export interface PredictionManualDataUiState {
  code: string;
  summaryTitle: string;
  summaryMessage: string;
  scoreboardMessage: string;
  liveScoreMessage: string;
  liveRelayMessage: string;
  coachMessage: string;
  timelineMessage: string;
}

export const getPredictionManualDataUiState = (
  errorCode?: string | null,
): PredictionManualDataUiState | null => {
  if (!isManualBaseballDataRequiredCode(errorCode)) {
    return null;
  }

  return {
    code: MANUAL_BASEBALL_DATA_REQUIRED_CODE,
    summaryTitle: PREDICTION_MANUAL_GAME_SUMMARY_TITLE,
    summaryMessage: PREDICTION_MANUAL_GAME_SUMMARY_MESSAGE,
    scoreboardMessage: PREDICTION_MANUAL_SCOREBOARD_MESSAGE,
    liveScoreMessage: PREDICTION_MANUAL_LIVE_SCORE_MESSAGE,
    liveRelayMessage: PREDICTION_MANUAL_LIVE_RELAY_MESSAGE,
    coachMessage: PREDICTION_MANUAL_COACH_MESSAGE,
    timelineMessage: PREDICTION_MANUAL_TIMELINE_MESSAGE,
  };
};
