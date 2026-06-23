import { lazy, Suspense, useMemo, useState } from 'react';

import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import type { DiaryEntry, WinningType } from '../../types/diary';
import { formatDateString } from '../../utils/diary';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import LoadingSpinner from '../LoadingSpinner';
import { MyPageTicketIcon } from './MyPageIcons';

const MyPageSeasonTimelineRuntime = lazy(() => import('./MyPageSeasonTimelineRuntime'));

type MyPageSeasonLogRuntimeProps = {
  profileImage: string | null;
  name: string;
  onOpenDiaryEditor: (date?: string) => void;
  onOpenTicketUploadModal: () => void;
};

type HeatmapCell = {
  id: string;
  dateString: string | null;
  dayLabel: string;
  entry?: DiaryEntry;
  hidden?: boolean;
};

type HeatmapMonthLabel = {
  month: number;
  label: string;
  startColumn: number;
  span: number;
};

const RESULT_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'win', label: '승' },
  { key: 'draw', label: '무' },
  { key: 'lose', label: '패' },
] as const;
const OPPONENT_FILTERS = ['LG', '두산', '삼성', '한화', 'NC', '롯데', 'SSG', 'KT', '키움'];

type ResultFilter = (typeof RESULT_FILTERS)[number]['key'];

const parseEntryDate = (dateString: string): Date => new Date(`${dateString}T12:00:00`);

const getEntryYear = (entry: DiaryEntry): number => parseEntryDate(entry.date).getFullYear();

const getLatestSeasonYear = (entries: DiaryEntry[]): number => {
  const latestEntry = [...entries]
    .filter((entry) => /^\d{4}-\d{2}-\d{2}$/.test(entry.date))
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  return latestEntry ? getEntryYear(latestEntry) : new Date().getFullYear();
};

const getWinningShortLabel = (winningName: WinningType): string => {
  if (winningName === 'WIN') return '승';
  if (winningName === 'DRAW') return '무';
  if (winningName === 'LOSE') return '패';
  return '기록';
};

const getEntryTone = (entry?: DiaryEntry): 'empty' | 'scheduled' | 'win' | 'draw' | 'lose' | 'record' => {
  if (!entry) return 'empty';
  if (entry.type === 'scheduled') return 'scheduled';
  if (entry.winningName === 'WIN') return 'win';
  if (entry.winningName === 'DRAW') return 'draw';
  if (entry.winningName === 'LOSE') return 'lose';
  return 'record';
};

const getHeatLevelClass = (entry?: DiaryEntry): string => {
  const tone = getEntryTone(entry);
  if (tone === 'scheduled') return 'mypage-season-cell--scheduled';
  if (tone === 'win') return 'mypage-season-cell--l3';
  if (tone === 'draw' || tone === 'record') return 'mypage-season-cell--l2';
  if (tone === 'lose') return 'mypage-season-cell--l1';
  return '';
};

const getEntryStatusLabel = (entry: DiaryEntry): string => {
  if (entry.type === 'scheduled') return '직관 예정';
  return getWinningShortLabel(entry.winningName);
};

const buildHeatmap = (year: number, entries: DiaryEntry[]) => {
  const entriesByDate = new Map(entries.map((entry) => [entry.date, entry]));
  const cells: HeatmapCell[] = [];
  const monthColumns = new Map<number, number>();
  const startDate = new Date(year, 2, 1, 12, 0, 0);
  const endDate = new Date(year, 9, 31, 12, 0, 0);
  const leadingBlanks = startDate.getDay();
  let slotIndex = 0;

  for (let i = 0; i < leadingBlanks; i += 1) {
    cells.push({
      id: `blank-${i}`,
      dateString: null,
      dayLabel: '',
      hidden: true,
    });
    slotIndex += 1;
  }

  for (let cursor = new Date(startDate); cursor <= endDate; cursor.setDate(cursor.getDate() + 1)) {
    const dateString = formatDateString(cursor);
    const column = Math.floor(slotIndex / 7);
    const month = cursor.getMonth();

    if (!monthColumns.has(month)) {
      monthColumns.set(month, column);
    }

    cells.push({
      id: dateString,
      dateString,
      dayLabel: `${month + 1}월 ${cursor.getDate()}일`,
      entry: entriesByDate.get(dateString),
    });
    slotIndex += 1;
  }

  const totalColumns = Math.max(1, Math.ceil(slotIndex / 7));
  const orderedMonthColumns = Array.from(monthColumns.entries()).sort((a, b) => a[1] - b[1]);
  const monthLabels: HeatmapMonthLabel[] = orderedMonthColumns.map(([month, startColumn], index) => {
    const nextStartColumn = orderedMonthColumns[index + 1]?.[1] ?? totalColumns;
    return {
      month,
      label: `${month + 1}월`,
      startColumn: startColumn + 1,
      span: Math.max(1, nextStartColumn - startColumn),
    };
  });

  return { cells, monthLabels, totalColumns };
};

export default function MyPageSeasonLogRuntime({
  profileImage,
  name,
  onOpenDiaryEditor,
  onOpenTicketUploadModal,
}: MyPageSeasonLogRuntimeProps) {
  const { statistics, diaryEntries, isLoading } = useDiaryStatistics();
  const [flashingEntryId, setFlashingEntryId] = useState<number | null>(null);
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [opponentFilter, setOpponentFilter] = useState('all');

  const seasonYear = useMemo(() => getLatestSeasonYear(diaryEntries), [diaryEntries]);
  const seasonEntries = useMemo(
    () => diaryEntries.filter((entry) => getEntryYear(entry) === seasonYear),
    [diaryEntries, seasonYear],
  );
  const filteredSeasonEntries = useMemo(
    () => seasonEntries.filter((entry) => {
      const resultMatches =
        resultFilter === 'all'
        || (resultFilter === 'win' && entry.winningName === 'WIN')
        || (resultFilter === 'draw' && entry.winningName === 'DRAW')
        || (resultFilter === 'lose' && entry.winningName === 'LOSE');
      const opponentMatches =
        opponentFilter === 'all'
        || (entry.team || '').toLowerCase().includes(opponentFilter.toLowerCase());

      return resultMatches && opponentMatches;
    }),
    [opponentFilter, resultFilter, seasonEntries],
  );
  const heatmap = useMemo(() => buildHeatmap(seasonYear, seasonEntries), [seasonEntries, seasonYear]);

  const monthCounts = useMemo(() => {
    const counts = new Map<number, number>();
    seasonEntries.forEach((entry) => {
      const month = parseEntryDate(entry.date).getMonth() + 1;
      counts.set(month, (counts.get(month) || 0) + 1);
    });
    return counts;
  }, [seasonEntries]);

  const maxMonth = Array.from(monthCounts.entries()).sort((a, b) => b[1] - a[1])[0];
  const scheduledCount = seasonEntries.filter((entry) => entry.type === 'scheduled').length;
  const totalCount = statistics.totalCount || seasonEntries.filter((entry) => entry.type === 'attended').length;
  const winCount = statistics.totalWins || seasonEntries.filter((entry) => entry.winningName === 'WIN').length;
  const drawCount = statistics.totalDraws || seasonEntries.filter((entry) => entry.winningName === 'DRAW').length;
  const lossCount = statistics.totalLosses || seasonEntries.filter((entry) => entry.winningName === 'LOSE').length;
  const winRate = statistics.winRate || (totalCount > 0 ? Math.round((winCount / totalCount) * 100) : 0);

  const handleHeatCellClick = (entry: DiaryEntry) => {
    const target = document.getElementById(`mypage-log-entry-${entry.id}`);
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFlashingEntryId(entry.id);
    window.setTimeout(() => setFlashingEntryId((current) => (current === entry.id ? null : current)), 1600);
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="시즌 로그를 불러오는 중..." fullScreen={false} />;
  }

  return (
    <section className="mypage-season-section" data-screen-label="시즌 로그">
      <div className="mypage-season-head">
        <div>
          <h1>{seasonYear} 시즌 로그</h1>
          <p>
            직관 기록 <b>{totalCount}</b>회 · <b>{winCount}</b>승 <b>{drawCount}</b>무 <b>{lossCount}</b>패 · 승률 <b>{winRate.toFixed(0)}%</b>
          </p>
        </div>
        <button type="button" className="mypage-season-cta" onClick={onOpenTicketUploadModal}>
          <MyPageTicketIcon />
          티켓 등록
        </button>
      </div>

      <div className="mypage-season-panel" data-screen-label="시즌 히트맵" data-testid="mypage-season-heatmap">
        <div className="mypage-season-heat-head">
          <span className="mypage-season-heat-title">{seasonYear} 시즌 직관 히트맵</span>
          <span className="mypage-season-heat-sub">3월~10월 KBO 시즌 · 셀을 클릭하면 해당 기록으로 이동해요</span>
        </div>
        <div className="mypage-season-heat-scroll">
          <div
            className="mypage-season-heat-months"
            style={{ gridTemplateColumns: `repeat(${heatmap.totalColumns}, minmax(13px, 1fr))` }}
            aria-hidden="true"
          >
            {heatmap.monthLabels.map((month) => (
              <span
                key={month.month}
                style={{ gridColumn: `${month.startColumn} / span ${month.span}` }}
              >
                {month.label}
              </span>
            ))}
          </div>
          <div className="mypage-season-heat-body">
            <div className="mypage-season-heat-dows" aria-hidden="true">
              <span />
              <span>월</span>
              <span />
              <span>수</span>
              <span />
              <span>금</span>
              <span />
            </div>
            <div
              className="mypage-season-heat-grid"
              style={{ gridTemplateColumns: `repeat(${heatmap.totalColumns}, minmax(13px, 1fr))` }}
            >
              {heatmap.cells.map((cell) => {
                const className = `mypage-season-cell ${getHeatLevelClass(cell.entry)}`.trim();
                if (!cell.entry) {
                  return (
                    <span
                      key={cell.id}
                      className={className}
                      style={cell.hidden ? { visibility: 'hidden' } : undefined}
                      aria-hidden="true"
                    />
                  );
                }

                return (
                  <button
                    key={cell.id}
                    type="button"
                    className={className}
                    data-testid="mypage-season-heatmap-cell"
                    title={`${cell.dayLabel} · ${cell.entry.team || '직관 기록'} · ${getEntryStatusLabel(cell.entry)}`}
                    aria-label={`${cell.dayLabel} ${cell.entry.team || '직관 기록'}로 이동`}
                    onClick={() => handleHeatCellClick(cell.entry!)}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="mypage-season-heat-foot">
          <span className="mypage-season-legend">
            적게
            <i style={{ background: 'var(--mp-surface-hi)' }} />
            <i style={{ background: 'rgba(99, 179, 155, 0.35)' }} />
            <i style={{ background: 'rgba(99, 179, 155, 0.65)' }} />
            <i style={{ background: 'var(--mp-accent)' }} />
            많이
          </span>
          <span className="mypage-season-legend">
            <i style={{ background: 'rgba(232, 182, 76, 0.65)' }} />
            예정
          </span>
          <div className="mypage-season-kpis">
            {maxMonth && <span>{maxMonth[0]}월 <b>{maxMonth[1]}</b>회로 최다</span>}
            <span>예정 <b>{scheduledCount}</b>회</span>
          </div>
        </div>
      </div>

      <div className="mypage-season-composer">
        <ProfileAvatar
          src={profileImage}
          alt={name}
          fallbackName={name}
          width={30}
          height={30}
        />
        <span className="mypage-season-composer-copy">오늘의 직관, 기록해두면 시즌이 끝나도 남아요</span>
        <button
          type="button"
          className="mypage-season-cta"
          data-testid="mypage-season-write-cta"
          onClick={() => onOpenDiaryEditor(formatDateString(new Date()))}
        >
          기록 남기기
        </button>
      </div>

      <div className="mypage-season-filters" data-screen-label="기록 필터">
        <div className="mypage-season-seg" aria-label="결과 필터">
          {RESULT_FILTERS.map((filter) => (
            <button
              type="button"
              key={filter.key}
              className={resultFilter === filter.key ? 'is-active' : undefined}
              onClick={() => setResultFilter(filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <select
          className="mypage-season-select"
          aria-label="상대팀 필터"
          value={opponentFilter}
          onChange={(event) => setOpponentFilter(event.target.value)}
        >
          <option value="all">상대팀 전체</option>
          {OPPONENT_FILTERS.map((opponent) => (
            <option key={opponent} value={opponent}>{opponent}</option>
          ))}
        </select>
        <span className="mypage-season-filter-count">기록 {filteredSeasonEntries.length}개</span>
      </div>

      <Suspense fallback={<div className="mypage-season-empty">기록 목록을 불러오는 중...</div>}>
        <MyPageSeasonTimelineRuntime
          entries={filteredSeasonEntries}
          flashingEntryId={flashingEntryId}
          onOpenDiaryEditor={onOpenDiaryEditor}
        />
      </Suspense>
    </section>
  );
}
