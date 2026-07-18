import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
} from '../../utils/manualBaseballDataContract';

export const BASEBALL_DATA_SYNC_PENDING_CODE = 'BASEBALL_DATA_SYNC_PENDING';

interface BaseballScheduleErrorPresentation {
  message: string;
  codeToken: string | null;
}

export const getBaseballScheduleErrorPresentation = (
  responseCode?: string | null,
): BaseballScheduleErrorPresentation => {
  if (responseCode === MANUAL_BASEBALL_DATA_REQUIRED_CODE) {
    return {
      message: MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
      codeToken: MANUAL_BASEBALL_DATA_REQUIRED_CODE,
    };
  }

  if (responseCode === BASEBALL_DATA_SYNC_PENDING_CODE) {
    return {
      message: '야구 데이터 동기화가 진행 중입니다.',
      codeToken: null,
    };
  }

  return {
    message: '라이브 경기 정보를 불러오지 못했습니다.',
    codeToken: null,
  };
};
