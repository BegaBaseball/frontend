import type { DiaryEntry, WinningType } from '../../types/diary';
import { getEmojiByName, getFullImageUrl } from '../../utils/diary';
import { formatStadiumDisplayName } from '../../utils/stadiumDisplay';
import {
  MyPageEditIcon,
  MyPageTicketIcon,
} from './MyPageIcons';
import MyPageSeasonEmptyState from './MyPageSeasonEmptyState';

type MyPageSeasonTimelineRuntimeProps = {
  entries: DiaryEntry[];
  flashingEntryId: number | null;
  onOpenDiaryEditor: (date?: string) => void;
};

const ENGLISH_MONTHS = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const parseEntryDate = (dateString: string): Date => new Date(`${dateString}T12:00:00`);

const getWinningShortLabel = (winningName: WinningType): string => {
  if (winningName === 'WIN') return '승';
  if (winningName === 'DRAW') return '무';
  if (winningName === 'LOSE') return '패';
  return '기록';
};

const getEntryTone = (entry: DiaryEntry): 'scheduled' | 'win' | 'draw' | 'lose' | 'record' => {
  if (entry.type === 'scheduled') return 'scheduled';
  if (entry.winningName === 'WIN') return 'win';
  if (entry.winningName === 'DRAW') return 'draw';
  if (entry.winningName === 'LOSE') return 'lose';
  return 'record';
};

const getChipClass = (entry: DiaryEntry): string => {
  const tone = getEntryTone(entry);
  if (tone === 'win') return 'mypage-season-chip--win';
  if (tone === 'lose') return 'mypage-season-chip--lose';
  if (tone === 'draw') return 'mypage-season-chip--draw';
  if (tone === 'scheduled') return 'mypage-season-chip--scheduled';
  return '';
};

const getEntryStatusLabel = (entry: DiaryEntry): string => {
  if (entry.type === 'scheduled') return '직관 예정';
  return getWinningShortLabel(entry.winningName);
};

const getEntryMeta = (entry: DiaryEntry): string => {
  const seatText = [entry.section, entry.block, entry.seatRow, entry.seatNumber]
    .filter(Boolean)
    .join(' ');
  return [entry.stadium ? formatStadiumDisplayName(entry.stadium) : '', seatText]
    .filter(Boolean)
    .join(' · ');
};

const getEntryPhotos = (entry: DiaryEntry): string[] => {
  if (entry.photos?.length) {
    return entry.photos;
  }
  return entry.photoStoragePaths || [];
};

const groupEntriesByMonth = (entries: DiaryEntry[]) => {
  const groups = new Map<string, DiaryEntry[]>();
  entries.forEach((entry) => {
    const date = parseEntryDate(entry.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = groups.get(key) || [];
    existing.push(entry);
    groups.set(key, existing);
  });

  return Array.from(groups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, groupedEntries]) => {
      const [year, month] = key.split('-').map(Number);
      return {
        key,
        label: `${ENGLISH_MONTHS[month - 1]} · ${month}월`,
        entries: groupedEntries.sort((a, b) => b.date.localeCompare(a.date)),
        year,
        month,
      };
    });
};

export default function MyPageSeasonTimelineRuntime({
  entries,
  flashingEntryId,
  onOpenDiaryEditor,
}: MyPageSeasonTimelineRuntimeProps) {
  const monthGroups = groupEntriesByMonth(entries);

  if (monthGroups.length === 0) {
    return (
      <MyPageSeasonEmptyState
        icon={<MyPageTicketIcon />}
        title="조건에 맞는 직관 기록이 없습니다"
        description="필터를 바꾸거나 새 기록을 남기면 시즌 타임라인이 다시 채워져요."
        actionLabel="새 기록 남기기"
        onAction={() => onOpenDiaryEditor()}
      />
    );
  }

  return (
    <>
      {monthGroups.map((group) => (
        <section key={group.key} aria-label={`${group.year}년 ${group.month}월 기록`}>
          <div className="mypage-season-month">{group.label}</div>
          {group.entries.map((entry, index) => {
            const entryDate = parseEntryDate(entry.date);
            const meta = getEntryMeta(entry);
            const photos = getEntryPhotos(entry);
            const isLastInGroup = index === group.entries.length - 1;
            const entryTone = getEntryTone(entry);

            return (
              <article
                key={entry.id}
                id={`mypage-log-entry-${entry.id}`}
                className={`mypage-season-entry ${flashingEntryId === entry.id ? 'is-flash' : ''}`}
                tabIndex={-1}
                aria-label={`${entry.date} ${entry.team || '직관 기록'} ${getEntryStatusLabel(entry)}`}
              >
                <div className="mypage-season-rail" aria-hidden="true">
                  <span className="mypage-season-rail-date">{entryDate.getDate()}</span>
                  <span className="mypage-season-rail-weekday">{KOREAN_WEEKDAYS[entryDate.getDay()]}</span>
                  <span className={`mypage-season-dot mypage-season-dot--${entryTone}`} />
                  {!isLastInGroup && <span className="mypage-season-rail-line" />}
                </div>
                <div className={`mypage-season-entry-card mypage-season-ticket-card mypage-season-ticket-card--${entryTone}`}>
                  <div className={`mypage-season-ticket-cover ${photos.length === 0 ? 'is-graphic' : ''}`}>
                    {photos.length > 0 ? (
                      <>
                        <img
                          src={getFullImageUrl(photos[0])}
                          alt={`${entry.team || '직관'} 대표 사진`}
                          width={720}
                          height={320}
                          loading="lazy"
                          decoding="async"
                        />
                        {photos.length > 1 && <span className="mypage-season-photo-count">사진 {photos.length}</span>}
                      </>
                    ) : (
                      <div className="mypage-season-ticket-placeholder">
                        <span className="mypage-season-ticket-placeholder-icon">
                          <MyPageTicketIcon />
                        </span>
                        <strong>{entry.type === 'scheduled' ? '직관 예정' : '경기 기록'}</strong>
                        <small>사진을 추가하면 커버로 표시돼요</small>
                      </div>
                    )}
                    <span className={`mypage-season-ticket-ribbon mypage-season-chip ${getChipClass(entry)}`.trim()}>
                      {getEntryStatusLabel(entry)}
                    </span>
                  </div>
                  <div className="mypage-season-entry-top">
                    <span className="mypage-season-match">
                      <img src={getEmojiByName(entry.emojiName)} alt={entry.emojiName || '감정'} />
                      <span>{entry.team || '경기 정보 미입력'}</span>
                    </span>
                    <span className={`mypage-season-chip mypage-season-entry-status ${getChipClass(entry)}`.trim()}>
                      {getEntryStatusLabel(entry)}
                    </span>
                  </div>
                  {meta && <div className="mypage-season-meta">{meta}</div>}
                  {entry.memo && <div className="mypage-season-memo" data-testid="diary-memo">{entry.memo}</div>}
                  {photos.length > 0 && (
                    <div className="mypage-season-thumbs" aria-label="직관 사진">
                      {photos.slice(0, 3).map((photo, photoIndex) => (
                        <div className="mypage-season-thumb" key={`${entry.id}-${photo}`}>
                          <img
                            src={getFullImageUrl(photo)}
                            alt={`${entry.team || '직관'} 사진 ${photoIndex + 1}`}
                            width={160}
                            height={120}
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mypage-season-entry-actions">
                    <button
                      type="button"
                      className="mypage-season-ghost-button"
                      aria-label={`${entry.date} 직관 기록 수정`}
                      onClick={() => onOpenDiaryEditor(entry.date)}
                    >
                      <MyPageEditIcon className="h-4 w-4" />
                      수정
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ))}
    </>
  );
}
