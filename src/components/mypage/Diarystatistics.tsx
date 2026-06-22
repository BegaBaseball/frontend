import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import type { OpponentStats } from '../../types/diary';
import LoadingSpinner from '../LoadingSpinner';
import BadgeShowcase from './BadgeShowcase';

type DiaryStatisticsProps = {
  cheerPoints?: number;
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

const getRecordValue = (record: Record<string, number> | undefined, key: string | number): number => {
  if (!record) {
    return 0;
  }
  return record[String(key)] ?? 0;
};

export default function DiaryStatistics({ cheerPoints = 0 }: DiaryStatisticsProps) {
  const { statistics, emojiStats, isLoading } = useDiaryStatistics();

  const opponentRows = Object.entries(statistics.opponentWinRates || {})
    .sort((a, b) => b[1].winRate - a[1].winRate)
    .slice(0, 6);
  const activeEmojiStats = emojiStats.filter((item) => item.count > 0);
  const earnedBadges = statistics.earnedBadges || [];
  const monthlyVisitCounts = statistics.monthlyVisitCounts || {};
  const monthRows = SEASON_MONTHS.map((month) => ({
    month,
    count: getRecordValue(monthlyVisitCounts, month),
  }));
  const maxMonthlyCount = Math.max(1, ...monthRows.map((row) => row.count));
  const stadiumRows = Object.entries(statistics.stadiumVisitCounts || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const goalProgress = Math.min(100, Math.round((statistics.totalCount / SEASON_GOAL) * 100));
  const homeVisitCount = statistics.homeVisitCount ?? 0;
  const awayVisitCount = statistics.awayVisitCount ?? 0;

  if (isLoading) {
    return (
      <LoadingSpinner size="lg" text="통계를 불러오는 중..." fullScreen={false} />
    );
  }

  return (
    <section data-screen-label="나의 기록">
      <div className="mypage-season-head">
        <div>
          <h1>나의 기록</h1>
          <p>2026 시즌 직관 데이터 분석</p>
        </div>
      </div>

      <div className="mypage-season-stat-grid">
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">직관</div>
          <div className="mypage-season-stat-value">{statistics.totalCount}<small className="text-sm text-[#FFFFFF]">회</small></div>
          <div className="mypage-season-stat-sub">시즌 목표 {SEASON_GOAL}회의 {goalProgress}%</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">직관 승률</div>
          <div className="mypage-season-stat-value">{statistics.winRate.toFixed(0)}<small className="text-sm text-[#FFFFFF]">%</small></div>
          <div className="mypage-season-stat-sub">{statistics.totalWins}승 {statistics.totalDraws}무 {statistics.totalLosses}패</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">홈 / 원정</div>
          <div className="mypage-season-stat-value">{homeVisitCount} <small className="text-sm text-[#FFFFFF]">/</small> {awayVisitCount}</div>
          <div className="mypage-season-stat-sub">{statistics.mostVisitedStadium || '최다 구장 집계 전'}</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">응원 포인트</div>
          <div className="mypage-season-stat-value">{cheerPoints.toLocaleString()}<small className="text-sm text-[#FFFFFF]">P</small></div>
          <div className="mypage-season-stat-sub">응원 활동 누적 포인트</div>
        </div>
      </div>

      <div className="mypage-season-panel">
        <div className="mypage-season-panel-title">월별 직관 횟수</div>
        <div className="mypage-season-bars" data-testid="mypage-monthly-visit-bars">
          {monthRows.map(({ month, count }) => (
            <div className="mypage-season-bar-col" key={month}>
              <span className="mypage-season-bar-value">{count > 0 ? count : '-'}</span>
              <span
                className={`mypage-season-bar ${count === maxMonthlyCount && count > 0 ? 'is-hot' : ''}`}
                style={{ height: `${Math.max(3, Math.round((count / maxMonthlyCount) * 100))}%` }}
              />
              <span className="mypage-season-bar-label">{month}월</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mypage-season-panel">
        <div className="mypage-season-panel-title">상대팀별 전적</div>
        {opponentRows.length === 0 ? (
          <p className="text-sm text-[#FFFFFF]">상대팀 전적 데이터가 아직 없습니다.</p>
        ) : (
          opponentRows.map(([opponent, record]) => (
            <div key={opponent} className="mypage-season-vs-row">
              <span className="mypage-season-vs-name">{opponent}</span>
              <span className="mypage-season-vs-track">
                <span
                  className="block h-full rounded-full bg-[#63b39b]"
                  style={{ width: `${Math.max(4, record.winRate)}%` }}
                />
              </span>
              <b className="mypage-season-vs-record">{formatOpponentRecord(record)}</b>
            </div>
          ))
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="mypage-season-panel">
          <div className="mypage-season-panel-title">구장 방문</div>
          {stadiumRows.length === 0 ? (
            <p className="text-sm text-[#FFFFFF]">구장 방문 데이터가 아직 없습니다.</p>
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
            <p className="text-sm text-[#FFFFFF]">기분 분석 데이터가 아직 없습니다.</p>
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
