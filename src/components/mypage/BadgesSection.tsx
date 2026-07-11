import { useDiaryStatistics } from '../../hooks/useDiaryStatistics';
import LoadingSpinner from '../LoadingSpinner';
import BadgeShowcase from './BadgeShowcase';
import {
  MyPageCrownIcon,
  MyPageMapPinIcon,
  MyPageSparklesIcon,
  MyPageTicketIcon,
} from './MyPageFlowIcons';

const BADGE_TOTAL = 5;

export default function BadgesSection() {
  const { statistics, isLoading } = useDiaryStatistics();
  const earnedBadges = statistics.earnedBadges || [];
  const stadiumCount = Object.keys(statistics.stadiumVisitCounts || {}).length;
  const earnedCount = earnedBadges.length;
  const progress = Math.round((earnedCount / BADGE_TOTAL) * 100);

  if (isLoading) {
    return <LoadingSpinner size="lg" text="배지 도감을 불러오는 중..." fullScreen={false} />;
  }

  return (
    <section data-screen-label="배지 도감" data-testid="mypage-badge-catalog">
      <div className="mypage-season-head">
        <div>
          <h1>배지 도감</h1>
          <p>
            직관 기록 기반으로 획득한 배지를 확인해요 · {earnedCount}/{BADGE_TOTAL}
          </p>
        </div>
      </div>

      <div className="mypage-season-stat-grid">
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">획득률</div>
          <div className="mypage-season-stat-value">
            {progress}
            <small className="text-sm text-foreground">%</small>
          </div>
          <div className="mypage-season-stat-sub">전체 배지 {BADGE_TOTAL}개 중 {earnedCount}개</div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">직관 기록</div>
          <div className="mypage-season-stat-value">
            {statistics.totalCount}
            <small className="text-sm text-foreground">회</small>
          </div>
          <div className="mypage-season-stat-sub">
            <MyPageTicketIcon className="mr-1 inline h-3.5 w-3.5" />
            첫 직관, 불꽃 응원단, 레전드 기준
          </div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">방문 구장</div>
          <div className="mypage-season-stat-value">
            {stadiumCount}
            <small className="text-sm text-foreground">곳</small>
          </div>
          <div className="mypage-season-stat-sub">
            <MyPageMapPinIcon className="mr-1 inline h-3.5 w-3.5" />
            구장 마스터 기준 3곳
          </div>
        </div>
        <div className="mypage-season-stat-card">
          <div className="mypage-season-stat-label">직관 승률</div>
          <div className="mypage-season-stat-value">
            {statistics.winRate.toFixed(0)}
            <small className="text-sm text-foreground">%</small>
          </div>
          <div className="mypage-season-stat-sub">
            <MyPageSparklesIcon className="mr-1 inline h-3.5 w-3.5" />
            승리요정 기준 10경기 이상 60%
          </div>
        </div>
      </div>

      <BadgeShowcase earnedBadges={earnedBadges} />

      <div className="mypage-season-panel">
        <div className="mypage-season-panel-title">다음 목표</div>
        <div className="mypage-season-list-row">
          <span className="inline-flex items-center gap-2">
            <MyPageCrownIcon className="h-4 w-4" />
            아직 잠긴 배지는 시즌 로그를 쌓으면 자동으로 열립니다.
          </span>
          <b>{BADGE_TOTAL - earnedCount}개 남음</b>
        </div>
      </div>
    </section>
  );
}
