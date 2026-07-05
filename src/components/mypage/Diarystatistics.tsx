import { useMemo, useState, type CSSProperties } from 'react';

import { EMOJI_STATS } from '../../constants/diary';
import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import type { DiaryEntry, OpponentStats } from '../../types/diary';
import BadgeShowcase from './BadgeShowcase';
import {
  MyPageBarChartIcon,
  MyPageMapPinIcon,
  MyPageSparklesIcon,
} from './MyPageIcons';
import MyPageSeasonEmptyState from './MyPageSeasonEmptyState';

type DiaryStatisticsProps = {
  cheerPoints?: number;
  onOpenDiaryEditor?: () => void;
};

const formatOpponentRecord = (stats: OpponentStats): string => {
  const parts = [
    stats.wins > 0 ? `${stats.wins}승` : '',
    stats.draws > 0 ? `${stats.draws}무` : '',
    stats.losses > 0 ? `${stats.losses}패` : '',
  ].filter(Boolean);
  return `${parts.join(' ') || '기록 없음'} · ${stats.winRate.toFixed(0)}%`;
};

const SEASON_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10];
const SEASON_GOAL = 20;
const SKELETON_ITEMS = [0, 1, 2, 3] as const;
const STATS_SCOPE_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'home', label: '홈' },
  { value: 'away', label: '원정' },
] as const;

type StatsScope = (typeof STATS_SCOPE_OPTIONS)[number]['value'];

const getRecordValue = (record: Record<string, number> | undefined, key: string | number): number => {
  if (!record) {
    return 0;
  }
  return record[String(key)] ?? 0;
};

const getLatestSeasonYear = (entries: DiaryEntry[]): number => {
  const latestDate = entries.reduce((latest, entry) => (
    /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date > latest ? entry.date : latest
  ), '');

  return latestDate ? Number(latestDate.slice(0, 4)) : new Date().getFullYear();
};

function DiaryStatisticsSkeleton() {
  return (
    <section className="mypage-season-section mypage-season-loading-shell" aria-busy="true" aria-label="나의 기록 로딩">
      <span className="mypage-season-loading-caption">
        <span className="mypage-season-loading-spinner" aria-hidden="true" />
        통계를 불러오는 중...
      </span>
      <div className="mypage-season-head">
        <div>
          <span className="mypage-season-skeleton mypage-season-skeleton-title" />
          <span className="mypage-season-skeleton mypage-season-skeleton-subtitle" />
        </div>
      </div>
      <div className="mypage-season-skeleton-grid">
        {SKELETON_ITEMS.map((item) => (
          <span key={item} className="mypage-season-skeleton mypage-season-skeleton-card" />
        ))}
      </div>
      <div className="mypage-season-donut-row">
        <span className="mypage-season-skeleton mypage-season-skeleton-panel" />
        <span className="mypage-season-skeleton mypage-season-skeleton-panel" />
      </div>
      <span className="mypage-season-skeleton mypage-season-skeleton-panel is-tall" />
    </section>
  );
}

export default function DiaryStatistics({ cheerPoints = 0, onOpenDiaryEditor }: DiaryStatisticsProps) {
  const { statistics, emojiStats, diaryEntries, isLoading } = useDiaryStatistics();
  const [statsScope, setStatsScope] = useState<StatsScope>('all');
  const scopedStats = statistics.scopedStatistics?.[statsScope];
  const scopedStatsAvailable = Boolean(statistics.scopedStatistics);
  const displayStats = {
    totalCount: scopedStats?.totalCount ?? statistics.totalCount,
    totalWins: scopedStats?.totalWins ?? statistics.totalWins,
    totalDraws: scopedStats?.totalDraws ?? statistics.totalDraws,
    totalLosses: scopedStats?.totalLosses ?? statistics.totalLosses,
    winRate: scopedStats?.winRate ?? statistics.winRate,
    mostVisitedStadium: scopedStats?.mostVisitedStadium ?? statistics.mostVisitedStadium,
    monthlyVisitCounts: scopedStats?.monthlyVisitCounts ?? statistics.monthlyVisitCounts ?? {},
    stadiumVisitCounts: scopedStats?.stadiumVisitCounts ?? statistics.stadiumVisitCounts ?? {},
    homeVisitCount: scopedStats?.homeVisitCount ?? statistics.homeVisitCount ?? 0,
    awayVisitCount: scopedStats?.awayVisitCount ?? statistics.awayVisitCount ?? 0,
    opponentWinRates: scopedStats?.opponentWinRates ?? statistics.opponentWinRates ?? {},
    emojiCounts: scopedStats?.emojiCounts ?? statistics.emojiCounts,
  };

  const opponentRows = Object.entries(displayStats.opponentWinRates || {})
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 6);
  const activeEmojiStats = useMemo(() => {
    if (statsScope === 'all' || !displayStats.emojiCounts) {
      return emojiStats.filter((item) => item.count > 0);
    }

    return EMOJI_STATS.map((item) => ({
      name: item.name,
      emoji: item.emoji,
      count: displayStats.emojiCounts?.[item.name] || 0,
    })).filter((item) => item.count > 0);
  }, [displayStats.emojiCounts, emojiStats, statsScope]);
  const earnedBadges = statistics.earnedBadges || [];
  const monthlyVisitCounts = displayStats.monthlyVisitCounts || {};
  const monthRows = SEASON_MONTHS.map((month) => ({
    month,
    count: getRecordValue(monthlyVisitCounts, month),
  }));
  const seasonYear = getLatestSeasonYear(diaryEntries);
  const monthlyVisitSummary = monthRows
    .map(({ month, count }) => `${month}월 ${count}회`)
    .join(', ');
  const maxMonthlyCount = Math.max(1, ...monthRows.map((row) => row.count));
  const stadiumRows = Object.entries(displayStats.stadiumVisitCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const goalProgress = Math.min(100, Math.round((displayStats.totalCount / SEASON_GOAL) * 100));
  const goalRemaining = Math.max(0, SEASON_GOAL - displayStats.totalCount);
  const scopeTransitionKey = `stats-${statsScope}`;
  const homeVisitCount = displayStats.homeVisitCount ?? 0;
  const awayVisitCount = displayStats.awayVisitCount ?? 0;
  const decisionTotal = displayStats.totalWins + displayStats.totalDraws + displayStats.totalLosses;
  const winPercent = decisionTotal > 0 ? Math.round((displayStats.totalWins / decisionTotal) * 100) : 0;
  const drawPercent = decisionTotal > 0 ? Math.round((displayStats.totalDraws / decisionTotal) * 100) : 0;
  const drawEndPercent = Math.min(100, winPercent + drawPercent);
  const winDistributionStyle: CSSProperties = {
    background: decisionTotal > 0
      ? `conic-gradient(var(--mp-win) 0 ${winPercent}%, var(--mp-draw) ${winPercent}% ${drawEndPercent}%, var(--mp-lose) ${drawEndPercent}% 100%)`
      : 'var(--mp-surface-hi)',
  };
  const goalRingStyle: CSSProperties = {
    background: `conic-gradient(var(--mp-accent) 0 ${goalProgress}%, var(--mp-surface-hi) ${goalProgress}% 100%)`,
  };
  const emptyTitle =
    statsScope === 'home'
      ? '홈 직관 기록이 아직 없어요'
      : statsScope === 'away'
        ? '원정 직관 기록이 아직 없어요'
        : '아직 분석할 기록이 없어요';
  const emptyDescription =
    statsScope === 'all'
      ? '직관을 기록하면 승률, 월별 추이, 상대팀 전적이 쌓여요.'
      : '해당 범위의 직관 기록을 남기면 이곳에 분석 데이터가 채워져요.';

  if (isLoading) {
    return <DiaryStatisticsSkeleton />;
  }

  if (displayStats.totalCount === 0) {
    return (
      <section className="mypage-season-section" data-screen-label="나의 기록">
        <div className="mypage-season-head">
          <div>
            <h1>나의 기록</h1>
            <p>{seasonYear} 시즌 직관 데이터 분석</p>
          </div>
        </div>

        <div className="mypage-season-filters mypage-season-stat-scope">
          <div className="mypage-season-seg" role="tablist" aria-label="통계 범위">
            {STATS_SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={statsScope === option.value}
                className={statsScope === option.value ? 'is-active' : ''}
                onClick={() => setStatsScope(option.value)}
                disabled={!scopedStatsAvailable && option.value !== 'all'}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <MyPageSeasonEmptyState
          icon={<MyPageBarChartIcon />}
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={onOpenDiaryEditor ? '직관 기록하기' : undefined}
          onAction={onOpenDiaryEditor}
        />
      </section>
    );
  }

  return (
    <section className="mypage-season-section" data-screen-label="나의 기록">
      <div className="mypage-season-head">
        <div>
          <h1>나의 기록</h1>
          <p>{seasonYear} 시즌 직관 데이터 분석</p>
        </div>
      </div>

      <div className="mypage-season-filters mypage-season-stat-scope">
        <div className="mypage-season-seg" role="tablist" aria-label="통계 범위">
          {STATS_SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={statsScope === option.value}
              className={statsScope === option.value ? 'is-active' : ''}
              onClick={() => setStatsScope(option.value)}
              disabled={!scopedStatsAvailable && option.value !== 'all'}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div key={`${scopeTransitionKey}-summary`} className="mypage-season-stat-grid mypage-season-scope-transition">
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">직관</div>
          <div className="mypage-season-stat-value">
            {displayStats.totalCount}
            <small className="text-sm text-foreground">회</small>
          </div>
          <div className="mypage-season-stat-sub">시즌 목표 {SEASON_GOAL}회의 {goalProgress}%</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">직관 승률</div>
          <div className="mypage-season-stat-value">
            {displayStats.winRate.toFixed(0)}
            <small className="text-sm text-foreground">%</small>
          </div>
          <div className="mypage-season-stat-sub">{displayStats.totalWins}승 {displayStats.totalDraws}무 {displayStats.totalLosses}패</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">홈 / 원정</div>
          <div className="mypage-season-stat-value">
            {homeVisitCount}
            <small className="text-sm text-foreground">/</small>
            {awayVisitCount}
          </div>
          <div className="mypage-season-stat-sub">{displayStats.mostVisitedStadium || '최다 구장 집계 전'}</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">응원 포인트</div>
          <div className="mypage-season-stat-value">
            {cheerPoints.toLocaleString()}
            <small className="text-sm text-foreground">P</small>
          </div>
          <div className="mypage-season-stat-sub">응원 활동 누적 포인트</div>
        </div>
      </div>

      <div key={`${scopeTransitionKey}-donuts`} className="mypage-season-donut-row mypage-season-scope-transition">
        <div className="mypage-season-panel mypage-season-donut-panel">
          <div
            className="mypage-season-donut"
            role="img"
            style={winDistributionStyle}
            aria-label={`직관 결과 ${displayStats.totalWins}승 ${displayStats.totalDraws}무 ${displayStats.totalLosses}패`}
          >
            <span className="mypage-season-donut-center">
              <span className="mypage-season-donut-value">{displayStats.winRate.toFixed(0)}%</span>
              <span className="mypage-season-donut-label">승률</span>
            </span>
          </div>
          <div className="mypage-season-donut-copy">
            <strong>승/무/패 분포</strong>
            <p>
              {decisionTotal > 0
                ? `${displayStats.totalWins}승 ${displayStats.totalDraws}무 ${displayStats.totalLosses}패 기록을 기준으로 계산했어요.`
                : '직관 결과를 기록하면 승/무/패 분포가 표시돼요.'}
            </p>
            <div className="mypage-season-donut-legend" aria-hidden="true">
              <span><i className="is-win" />승 {displayStats.totalWins}</span>
              <span><i className="is-draw" />무 {displayStats.totalDraws}</span>
              <span><i className="is-lose" />패 {displayStats.totalLosses}</span>
            </div>
          </div>
        </div>

        <div className="mypage-season-panel mypage-season-donut-panel">
          <div
            className="mypage-season-donut"
            role="img"
            style={goalRingStyle}
            aria-label={`시즌 목표 ${SEASON_GOAL}회 중 ${displayStats.totalCount}회 기록`}
          >
            <span className="mypage-season-donut-center">
              <span className="mypage-season-donut-value">{goalProgress}%</span>
              <span className="mypage-season-donut-label">목표</span>
            </span>
          </div>
          <div className="mypage-season-donut-copy">
            <strong>시즌 목표 {SEASON_GOAL}회</strong>
            <p>
              {goalRemaining > 0
                ? `${goalRemaining}회 더 기록하면 목표를 달성해요.`
                : '이번 시즌 직관 목표를 달성했어요.'}
            </p>
            <div className="mypage-season-donut-legend" aria-hidden="true">
              <span><i />현재 {displayStats.totalCount}회</span>
              <span><i className="is-draw" />남은 목표 {goalRemaining}회</span>
            </div>
          </div>
        </div>
      </div>

      <div key={`${scopeTransitionKey}-months`} className="mypage-season-panel mypage-season-scope-transition">
        <div className="mypage-season-panel-title">월별 직관 횟수</div>
        <div
          className="mypage-season-bars"
          role="img"
          aria-label={`${seasonYear} 시즌 월별 직관 횟수: ${monthlyVisitSummary}`}
          data-testid="mypage-monthly-visit-bars"
        >
          {monthRows.map(({ month, count }, index) => (
            <div className="mypage-season-bar-col" key={month}>
              <span className="mypage-season-bar-value">{count > 0 ? count : '-'}</span>
              <span
                className={`mypage-season-bar ${count === maxMonthlyCount && count > 0 ? 'is-hot' : ''}`}
                aria-hidden="true"
                style={{
                  height: `${Math.max(3, Math.round((count / maxMonthlyCount) * 100))}%`,
                  '--mp-bar-index': index,
                } as CSSProperties}
              />
              <span className="mypage-season-bar-label">{month}월</span>
            </div>
          ))}
        </div>
      </div>

      <div key={`${scopeTransitionKey}-opponents`} className="mypage-season-panel mypage-season-scope-transition">
        <div className="mypage-season-panel-title">상대팀별 전적</div>
        {opponentRows.length === 0 ? (
          <MyPageSeasonEmptyState
            className="is-compact"
            icon={<MyPageBarChartIcon />}
            title="상대팀 전적 데이터가 아직 없습니다"
            description="응원 구단이 포함된 직관 기록을 남기면 상대팀별 전적이 표시돼요."
          />
        ) : (
          opponentRows.map(([opponent, record]) => (
            <div key={opponent} className="mypage-season-vs-row">
              <span className="mypage-season-vs-name">{opponent}</span>
              <span className="mypage-season-vs-track" aria-hidden="true">
                <span
                  className="block h-full rounded-full"
                  style={{
                    backgroundColor: 'var(--mp-win-bg)',
                    width: `${record.winRate > 0 ? Math.max(4, record.winRate) : 0}%`,
                  }}
                />
              </span>
              <b className="mypage-season-vs-record">{formatOpponentRecord(record)}</b>
            </div>
          ))
        )}
      </div>

      <div key={`${scopeTransitionKey}-details`} className="grid gap-4 lg:grid-cols-2 mypage-season-scope-transition">
        <div className="mypage-season-panel">
          <div className="mypage-season-panel-title">구장 방문</div>
          {stadiumRows.length === 0 ? (
            <MyPageSeasonEmptyState
              className="is-compact"
              icon={<MyPageMapPinIcon />}
              title="구장 방문 데이터가 아직 없습니다"
              description="직관 기록을 남기면 자주 찾은 구장이 집계돼요."
            />
          ) : (
            stadiumRows.map(([stadium, count], index) => (
              <div key={stadium} className="mypage-season-list-row">
                <span className={`mypage-season-dot2 ${index > 0 ? 'is-dim' : ''}`} />
                <span>{stadium}</span>
                <b>{count}회</b>
              </div>
            ))
          )}
        </div>

        <div className="mypage-season-panel">
          <div className="mypage-season-panel-title">직관 기분</div>
          {activeEmojiStats.length === 0 ? (
            <MyPageSeasonEmptyState
              className="is-compact"
              icon={<MyPageSparklesIcon />}
              title="기분 분석 데이터가 아직 없습니다"
              description="일지에 기분을 남기면 시즌 감정 흐름이 표시돼요."
            />
          ) : (
            activeEmojiStats.map((item) => (
              <div key={item.name} className="mypage-season-list-row">
                <span>{item.emoji} {item.name}</span>
                <b>{item.count}회</b>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4">
        <BadgeShowcase earnedBadges={earnedBadges} />
      </div>
    </section>
  );
}
