const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatTimeAgo(isoString: string | null | undefined): string {
  if (!isoString) {
    return '';
  }

  const value = Date.parse(isoString);
  if (Number.isNaN(value)) {
    return isoString;
  }

  const diff = Date.now() - value;
  if (diff < MINUTE) {
    return '방금 전';
  }
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return `${minutes}분 전`;
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR);
    return `${hours}시간 전`;
  }
  if (diff < WEEK) {
    const days = Math.floor(diff / DAY);
    return `${days}일 전`;
  }

  const date = new Date(value);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
