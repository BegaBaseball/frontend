import type { LinkedContent } from '../../api/cheerApi';
import {
  MANUAL_BASEBALL_DATA_REQUIRED_CODE,
  MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE,
} from '../../utils/manualBaseballDataContract';

interface CheerLinkedContentCardProps {
  linkedContent: LinkedContent;
  variant: 'compact' | 'detail';
}

const formatPrice = (value?: number) => (
  typeof value === 'number' ? `${value.toLocaleString('ko-KR')}원` : null
);

const formatGameTime = (gameTime?: { hour?: number; minute?: number }) => {
  if (gameTime?.hour == null || gameTime.minute == null) return null;
  return `${String(gameTime.hour).padStart(2, '0')}:${String(gameTime.minute).padStart(2, '0')}`;
};

export default function CheerLinkedContentCard({
  linkedContent,
  variant,
}: CheerLinkedContentCardProps) {
  const paddingClass = variant === 'detail' ? 'p-4 sm:p-5' : 'p-3';

  if (
    !linkedContent.available
    && linkedContent.unavailableReason === MANUAL_BASEBALL_DATA_REQUIRED_CODE
  ) {
    return (
      <section
        className={`mt-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/70 dark:border-amber-700/70 dark:bg-amber-950/30 ${paddingClass}`}
        aria-label={`${linkedContent.kind === 'CHECKIN' ? '직관 인증' : '동행 모집'} 운영자 데이터 필요`}
        data-testid="cheer-linked-unavailable"
        data-error-code={MANUAL_BASEBALL_DATA_REQUIRED_CODE}
      >
        <p className="text-body font-bold text-amber-900 dark:text-amber-200">
          운영자 제공 내부 야구 데이터가 필요합니다.
        </p>
        <p className="mt-1 text-body font-semibold text-amber-800 dark:text-amber-300">
          {MANUAL_BASEBALL_DATA_REQUIRED_MESSAGE}
        </p>
        <p className="mt-2 inline-flex rounded-md border border-amber-300 bg-white/70 px-2 py-1 font-mono text-xs font-black text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/50 dark:text-amber-200">
          {MANUAL_BASEBALL_DATA_REQUIRED_CODE}
        </p>
      </section>
    );
  }

  if (!linkedContent.available) {
    return (
      <section
        className={`mt-3 rounded-xl border border-dashed border-[var(--cheer-line-10)] bg-[var(--cheer-sub-card)] ${paddingClass}`}
        aria-label={`${linkedContent.kind === 'CHECKIN' ? '직관 인증' : '동행 모집'} 원본 없음`}
        data-testid="cheer-linked-unavailable"
      >
        <p className="text-body font-bold text-slate-700 dark:text-white">원본을 확인할 수 없음</p>
        <p className="mt-1 text-body font-semibold text-slate-500 dark:text-slate-300">
          연결된 원본 정보가 삭제되었거나 현재 제공되지 않습니다.
        </p>
      </section>
    );
  }

  if (linkedContent.kind === 'CHECKIN') {
    const { checkin } = linkedContent;
    return (
      <section
        className={`mt-3 rounded-xl border border-[var(--cheer-line-10)] bg-[var(--cheer-sub-card)] ${paddingClass}`}
        aria-label="직관 인증 정보"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-body font-bold text-emerald-700 dark:text-emerald-200">직관 인증</span>
          <span className="rounded-full bg-[var(--cheer-chip-bg)] px-2 py-1 text-body font-bold text-emerald-700 dark:text-emerald-200">
            {checkin.verified ? '인증 완료' : '인증 정보'}
          </span>
        </div>
        {(checkin.homeTeam || checkin.awayTeam) && (
          <p className="mt-2 text-body font-bold text-slate-900 dark:text-white">
            {checkin.homeTeam || '홈팀'} <span className="text-slate-400">vs</span> {checkin.awayTeam || '원정팀'}
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-body font-semibold text-slate-600 dark:text-slate-300">
          {checkin.gameDate && <span>{checkin.gameDate}</span>}
          {checkin.stadium && <span>{checkin.stadium}</span>}
          {checkin.cheeringTeam && <span>응원팀 {checkin.cheeringTeam}</span>}
        </div>
      </section>
    );
  }

  const { recruitment } = linkedContent;
  const gameTime = formatGameTime(recruitment.gameTime);
  const isRecruiting = recruitment.recruiting === true && recruitment.status === 'PENDING';
  const prices = [
    ['참가비', formatPrice(recruitment.price)],
    ['티켓', formatPrice(recruitment.ticketPrice)],
    ['예약금', formatPrice(recruitment.reservationDepositAmount)],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <section
      className={`mt-3 rounded-xl border border-[var(--cheer-line-10)] bg-[var(--cheer-sub-card)] ${paddingClass}`}
      aria-label="동행 모집 정보"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body font-bold text-violet-700 dark:text-violet-200">동행 모집</span>
        <span className="rounded-full bg-[var(--cheer-chip-bg)] px-2 py-1 text-body font-bold text-violet-700 dark:text-violet-200">
          {isRecruiting ? '모집 중' : '모집 마감'}
        </span>
      </div>
      {(recruitment.homeTeam || recruitment.awayTeam) && (
        <p className="mt-2 text-body font-bold text-slate-900 dark:text-white">
          {recruitment.homeTeam || '홈팀'} <span className="text-slate-400">vs</span> {recruitment.awayTeam || '원정팀'}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-body font-semibold text-slate-600 dark:text-slate-300">
        {recruitment.gameDate && <span>{recruitment.gameDate}</span>}
        {gameTime && <span>{gameTime}</span>}
        {recruitment.stadium && <span>{recruitment.stadium}</span>}
        {recruitment.section && <span>{recruitment.section}</span>}
        {(recruitment.currentParticipants != null || recruitment.maxParticipants != null) && (
          <span>{recruitment.currentParticipants ?? 0}/{recruitment.maxParticipants ?? '-'}</span>
        )}
        {recruitment.status && <span>{recruitment.status}</span>}
      </div>
      {recruitment.description && (
        <p className={`mt-2 text-body font-semibold text-slate-700 dark:text-slate-200 ${variant === 'compact' ? 'line-clamp-2' : ''}`}>
          {recruitment.description}
        </p>
      )}
      {prices.length > 0 && (
        <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-body font-semibold text-slate-600 dark:text-slate-300">
          {prices.map(([label, value]) => (
            <div key={label} className="flex gap-1">
              <dt>{label}</dt>
              <dd className="font-bold text-slate-800 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {recruitment.partyId != null && (
        <a
          href={`/mate/${recruitment.partyId}`}
          data-testid="cheer-linked-party-link"
          data-skip-cheer-card-nav
          className="mt-3 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-4 text-body font-bold text-white transition-colors hover:bg-violet-700"
        >
          파티 보기
        </a>
      )}
    </section>
  );
}
