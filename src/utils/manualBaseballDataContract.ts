export const MANUAL_BASEBALL_DATA_REQUIRED_CODE = 'MANUAL_BASEBALL_DATA_REQUIRED';
export const MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE = '야구 데이터 준비가 필요합니다. 운영자가 데이터를 제공하면 다시 확인할 수 있습니다.';

const MANUAL_BASEBALL_DATA_REQUIRED_VISIBLE_TOKEN = new RegExp(
  `\\s*(?:[·:]\\s*)?${MANUAL_BASEBALL_DATA_REQUIRED_CODE}\\b`,
  'g',
);

export function formatManualBaseballDataDisplayValue(value: string): string {
  const displayValue = value
    .replace(MANUAL_BASEBALL_DATA_REQUIRED_VISIBLE_TOKEN, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return displayValue || MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE;
}
