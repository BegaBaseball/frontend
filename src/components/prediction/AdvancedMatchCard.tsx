import { useState, useEffect, Fragment, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { LayoutGroup, motion } from 'framer-motion';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { TrendingUp } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import { Game, VoteTeam, GameDetail, GameInningScore, GameSummary } from '../../types/prediction';
import { TEAM_COLORS, GAME_TIME } from '../../constants/prediction';
import { getFullTeamName } from '../../utils/prediction';

interface AdvancedMatchCardProps {
  game: Game;
  gameDetail?: GameDetail | null;
  gameDetailLoading?: boolean;
  userVote: 'home' | 'away' | null;
  votePercentages: { homePercentage: number; awayPercentage: number; totalVotes: number };
  isVoteOpen: boolean;
  statusLabel: string;
  isClosed: boolean;
  onVote: (team: VoteTeam) => void;
}

const popIn = keyframes`
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
`;

const DetailWrapper = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const MetaBadge = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const TeamLogoBox = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const ScoreBox = styled.div<{ $visible: boolean }>`
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transform: ${(props) => (props.$visible ? 'scale(1)' : 'scale(0.8)')};
  animation: ${(props) =>
    props.$visible
      ? css`${popIn} 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.3s backwards`
      : 'none'};
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
  will-change: transform, opacity;
`;

const TimelineItem = styled.div`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const TimelineCard = styled(motion.div)`
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const EventBadge = styled.span`
  display: inline-flex;
  align-items: center;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease;
`;

const GaugeContainer = styled.div`
  margin: 20px 0;
  padding: 0 10px;
`;

const GaugeHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
`;

const TeamInfo = styled.div<{ $color: string; $align: 'left' | 'right' }>`
  text-align: ${(props) => props.$align};

  .name {
    font-size: 0.85rem;
    font-weight: 700;
    color: #9ca3af;
    margin-bottom: 2px;
  }

  .count {
    font-size: 1.2rem;
    font-weight: 800;
    color: ${(props) => props.$color};
  }

  .percent {
    font-size: 0.9rem;
    opacity: 0.7;
    margin-left: 4px;
  }
`;

const ProgressBarWrapper = styled.div`
  height: 16px;
  background: #2a2d35;
  border-radius: 20px;
  display: flex;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
`;

const GaugeBar = styled(motion.div) <{ color: string }>`
  height: 100%;
  background: ${(props) => props.color};
  position: relative;
`;

const CenterSlash = styled(motion.div)`
  position: absolute;
  top: 0;
  transform: translateX(-50%) skewX(-20deg);
  width: 4px;
  height: 100%;
  background: white;
  z-index: 2;
  box-shadow: 0 0 10px rgba(255,255,255,0.5);
`;

export default function AdvancedMatchCard({
  game,
  gameDetail,
  gameDetailLoading = false,
  userVote,
  votePercentages,
  isVoteOpen,
  statusLabel,
  isClosed,
  onVote,
}: AdvancedMatchCardProps) {
  const { homePercentage, awayPercentage, totalVotes } = votePercentages;
  const hasVoteResults = totalVotes > 0;

  // 애니메이션을 위한 상태 관리
  const [inningPage, setInningPage] = useState(0);
  const [countedScores, setCountedScores] = useState({ away: 0, home: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const scoreBoxRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    setInningPage(0);
    setIsVisible(false);
    setCountedScores({ away: 0, home: 0 });
  }, [game.gameId]);

  useEffect(() => {
    const node = scoreBoxRef.current;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    if (!node) return;

    const rect = node.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 0;
    const isInView = rect.top < viewportHeight * 0.9 && rect.bottom > 0;

    if (isInView) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
          observerRef.current = null;
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -30% 0px' }
    );

    observerRef.current = observer;
    observer.observe(node);

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [game.gameId]);


  const formatTime = (value?: string | null) => {
    if (!value) return null;
    return value.length >= 5 ? value.slice(0, 5) : value;
  };

  const stadiumLabel = gameDetail?.stadiumName || gameDetail?.stadium || game.stadium;
  const startTimeLabel = gameDetail?.startTime || null;
  const homePitcherName = gameDetail?.homePitcher || game.homePitcher?.name || '미정';
  const awayPitcherName = gameDetail?.awayPitcher || game.awayPitcher?.name || '미정';
  const attendanceLabel = gameDetail?.attendance != null
    ? `${gameDetail.attendance.toLocaleString()}명`
    : null;
  const weatherLabel = gameDetail?.weather?.trim() || null;
  const gameTimeLabel = gameDetail?.gameTimeMinutes != null
    ? `${Math.floor(gameDetail.gameTimeMinutes / 60)}시간 ${gameDetail.gameTimeMinutes % 60}분`
    : null;

  const rawInningScores = gameDetail?.inningScores || [];
  const inningRows = rawInningScores.reduce(
    (acc: Record<number, { home?: number | null; away?: number | null; extra?: boolean | null }>, score: GameInningScore) => {
      const key = score.inning;
      if (!acc[key]) {
        acc[key] = { home: null, away: null, extra: score.isExtra ?? false };
      }
      const side = score.teamSide?.toLowerCase();
      if (side === 'home') {
        acc[key].home = score.runs ?? 0;
      } else if (side === 'away') {
        acc[key].away = score.runs ?? 0;
      }
      acc[key].extra = acc[key].extra || score.isExtra;
      return acc;
    },
    {}
  );

  const inningKeys = Object.keys(inningRows)
    .map(Number)
    .sort((a, b) => a - b);
  const regularInnings = inningKeys.filter((inning) => inning <= 9);
  const extraInnings = inningKeys.filter((inning) => inning > 9);
  const regularInningCols = regularInnings.length
    ? regularInnings
    : Array.from({ length: 9 }, (_, index) => index + 1);
  const extraInningCols = extraInnings.length
    ? extraInnings
    : Array.from({ length: 6 }, (_, index) => index + 10);
  const extraInningScores = rawInningScores.filter(
    (score) => score.isExtra && (score.runs ?? 0) > 0
  );
  const hasExtraInnings = extraInningScores.length > 0;

  const awayColor = TEAM_COLORS[game.awayTeam];
  const homeColor = TEAM_COLORS[game.homeTeam];
  const awayTeamName = getFullTeamName(game.awayTeam);
  const homeTeamName = getFullTeamName(game.homeTeam);
  const matchDateValue = gameDetail?.gameDate || game.gameDate;
  const matchDateLabel = matchDateValue ? matchDateValue.replace(/-/g, '.') : '';
  const formattedStartTime = formatTime(startTimeLabel) || GAME_TIME;
  const matchMetaLabel = [matchDateLabel, stadiumLabel, formattedStartTime]
    .filter(Boolean)
    .join(' | ');
  const awayScoreValue = gameDetail?.awayScore ?? game.awayScore ?? 0;
  const homeScoreValue = gameDetail?.homeScore ?? game.homeScore ?? 0;
  const lastInning = hasExtraInnings
    ? Math.max(...extraInningScores.map((score) => score.inning))
    : 9;
  const matchStatusLabel = isClosed && lastInning
    ? `경기 종료 (${lastInning}회)`
    : statusLabel;

  const cheeringTotal = totalVotes;
  const awayVotes = cheeringTotal === 0
    ? 0
    : Math.round((awayPercentage / 100) * cheeringTotal);
  const homeVotes = cheeringTotal === 0
    ? 0
    : Math.max(0, cheeringTotal - awayVotes);
  const awayPercent = cheeringTotal === 0 ? 50 : (awayVotes / cheeringTotal) * 100;
  const homePercent = cheeringTotal === 0 ? 50 : (homeVotes / cheeringTotal) * 100;



  useEffect(() => {
    if (!isVisible) return;
    const duration = 1500;
    const startAway = 0;
    const startHome = 0;
    let frameId = 0;
    const startTime = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const nextAway = Math.round(startAway + (awayScoreValue - startAway) * progress);
      const nextHome = Math.round(startHome + (homeScoreValue - startHome) * progress);
      setCountedScores({ away: nextAway, home: nextHome });
      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      }
    };

    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [awayScoreValue, homeScoreValue, game.gameId, isVisible]);

  const handleInningDragEnd = (_event: unknown, info: { offset: { x: number } }) => {
    if (!hasExtraInnings) return;
    if (info.offset.x < -50 && inningPage === 0) {
      setInningPage(1);
    }
    if (info.offset.x > 50 && inningPage === 1) {
      setInningPage(0);
    }
  };

  const summaryGroups = (gameDetail?.summary || []).reduce(
    (acc: Record<string, GameSummary[]>, item) => {
      const key = item.type || '기타';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    },
    {}
  );

  const summaryGroupDefs = [
    { key: 'batting', title: '타격', types: ['결승타', '홈런', '2루타', '3루타', '병살타'] },
    { key: 'running', title: '주루', types: ['도루', '도루자', '주루사', '견제사'] },
    { key: 'pitching', title: '투구/실책', types: ['폭투', '포일', '보크', '실책'] },
    { key: 'etc', title: '기타', types: ['심판', '기타'] },
  ];

  const summaryTypeSet = new Set(summaryGroupDefs.flatMap((group) => group.types));
  const extraSummaryTypes = Object.keys(summaryGroups)
    .filter((type) => !summaryTypeSet.has(type));

  const groupedSummary = summaryGroupDefs
    .map((group) => {
      const types = group.key === 'etc'
        ? [...group.types, ...extraSummaryTypes]
        : group.types;

      const entries = types.flatMap((type) => {
        const items = summaryGroups[type] || [];
        const trimmed = type === '심판' ? items.slice(0, 1) : items;
        return trimmed.map((item) => ({ ...item, type }));
      });

      return { title: group.title, entries };
    })
    .filter((group) => group.entries.length > 0);

  const extractInning = (detail?: string | null) => {
    if (!detail) return Number.POSITIVE_INFINITY;
    const match = detail.match(/(\d+)\s*회/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  };

  const timelineEntries = groupedSummary
    .flatMap((group) => group.entries.map((item) => ({ ...item, groupTitle: group.title })))
    .map((item, index) => ({
      ...item,
      _index: index,
      _inning: extractInning(item.detail),
    }))
    .sort((a, b) => (a._inning - b._inning) || (a._index - b._index));

  return (
    <Card className="overflow-hidden border-0 shadow-lg bg-white dark:bg-gray-800 transition-colors duration-300 mb-6">
      <div className="p-4 md:p-6">
        {/* 투표 버튼 영역 */}

        {/* 투표 버튼 영역 */}
        {isVoteOpen && (
          <div className="flex gap-2 md:gap-3 mt-4 md:mt-6">
            <Button
              onClick={() => onVote('away')}
              aria-pressed={userVote === 'away'}
              aria-label={`${getFullTeamName(game.awayTeam)} 승리 예측`}
              className="flex-1 py-4 md:py-6 min-h-[48px] text-white text-base md:text-lg rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md relative overflow-hidden"
              style={{
                backgroundColor: TEAM_COLORS[game.awayTeam],
                fontWeight: 700,
                opacity: userVote === 'away' ? 1 : userVote === 'home' ? 0.4 : 1,
                transform: userVote === 'away' ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <span className="truncate px-2">{getFullTeamName(game.awayTeam)}</span>
              {userVote === 'away' && (
                <span className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1 rounded-full">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                </span>
              )}
            </Button>
            <Button
              onClick={() => onVote('home')}
              aria-pressed={userVote === 'home'}
              aria-label={`${getFullTeamName(game.homeTeam)} 승리 예측`}
              data-testid="vote-home-btn"
              className="flex-1 py-4 md:py-6 min-h-[48px] text-white text-base md:text-lg rounded-xl hover:opacity-90 transition-all active:scale-95 shadow-md relative overflow-hidden"
              style={{
                backgroundColor: TEAM_COLORS[game.homeTeam],
                fontWeight: 700,
                opacity: userVote === 'home' ? 1 : userVote === 'away' ? 0.4 : 1,
                transform: userVote === 'home' ? 'scale(1.02)' : 'scale(1)'
              }}
            >
              <span className="truncate px-2">{getFullTeamName(game.homeTeam)}</span>
              {userVote === 'home' && (
                <span className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/20 p-1 rounded-full">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                </span>
              )}
            </Button>
          </div>
        )}

        <DetailWrapper className="mt-4 md:mt-6 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/80 shadow-lg">
          <div
            className="relative overflow-hidden rounded-t-2xl px-4 pt-12 pb-10 text-white"
            style={{
              background: `linear-gradient(110deg, ${awayColor} 50%, ${homeColor} 50%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 2px, transparent 2px, transparent 8px)',
              }}
            />
            <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rotate-[20deg] bg-white/30" />
            <div className="relative flex justify-center">
              <MetaBadge className="absolute top-0 rounded-full bg-black/30 px-3 py-1 text-[10px] font-semibold backdrop-blur">
                {matchMetaLabel || '경기 정보'}
              </MetaBadge>
            </div>
            <div className="relative mt-10 flex items-end justify-between gap-3">
              <div className="flex w-[30%] flex-col items-center text-center">
                <TeamLogoBox className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-xl font-black shadow-lg ring-4 ring-white/20">
                  <TeamLogo team={game.awayTeam} size={36} className="h-8 w-8" />
                </TeamLogoBox>
                <div className="mt-2 text-sm font-semibold">{awayTeamName}</div>
                <div className="text-[10px] text-white/80">AWAY</div>
              </div>
              <ScoreBox
                ref={scoreBoxRef}
                $visible={isVisible}
                className="relative -mb-2 w-[40%] rounded-xl bg-white dark:bg-gray-900 px-3 py-3 text-center text-gray-800 dark:text-gray-100 shadow-2xl"
              >
                <div className="flex items-center justify-center gap-2 text-3xl font-extrabold">
                  <span style={{ color: awayColor }}>{countedScores.away}</span>
                  <span className="text-gray-300 dark:text-gray-600">:</span>
                  <span style={{ color: homeColor }}>{countedScores.home}</span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">{matchStatusLabel}</div>
              </ScoreBox>
              <div className="flex w-[30%] flex-col items-center text-center">
                <TeamLogoBox className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-xl font-black shadow-lg ring-4 ring-white/20">
                  <TeamLogo team={game.homeTeam} size={36} className="h-8 w-8" />
                </TeamLogoBox>
                <div className="mt-2 text-sm font-semibold">{homeTeamName}</div>
                <div className="text-[10px] text-white/80">HOME</div>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-4 py-6">
            {gameDetailLoading && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">경기 정보를 불러오는 중입니다...</div>
            )}

            {!gameDetailLoading && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                  스코어보드
                  {hasExtraInnings && (
                    <span className="ml-auto text-xs text-gray-400">
                      {inningPage === 0 ? '연장이닝 보기 →' : '← 정규이닝 보기'}
                    </span>
                  )}
                </div>
                <div className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/60">
                  {hasExtraInnings ? (
                    <div className="overflow-hidden">
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleInningDragEnd}
                        animate={{ x: inningPage === 0 ? '0%' : '-100%' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="flex"
                      >
                        {[regularInningCols, extraInningCols].map((cols, index) => (
                          <div key={index} className="min-w-full px-3 py-3">
                            <table className="w-full border-collapse text-center text-[13px]">
                              <thead className="bg-gray-50 dark:bg-gray-800 text-[12px] text-gray-500 dark:text-gray-300">
                                <tr>
                                  <th className="px-2 py-2 text-left">팀</th>
                                  {cols.map((inning) => (
                                    <th key={inning} className="px-2 py-2">{inning}</th>
                                  ))}
                                  <th className="px-2 py-2 text-red-600">R</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-700 dark:text-gray-200">
                                <tr>
                                  <td className="px-2 py-2 text-left font-semibold" style={{ color: awayColor }}>
                                    {awayTeamName}
                                  </td>
                                  {cols.map((inning) => (
                                    <td key={`away-${inning}`} className="px-2 py-2">
                                      {inningRows[inning]?.away ?? '-'}
                                    </td>
                                  ))}
                                  <td className="px-2 py-2 font-semibold text-red-600">
                                    {awayScoreValue}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="px-2 py-2 text-left font-semibold" style={{ color: homeColor }}>
                                    {homeTeamName}
                                  </td>
                                  {cols.map((inning) => (
                                    <td key={`home-${inning}`} className="px-2 py-2">
                                      {inningRows[inning]?.home ?? '-'}
                                    </td>
                                  ))}
                                  <td className="px-2 py-2 font-semibold text-red-600">
                                    {homeScoreValue}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </motion.div>
                      <div className="mt-3 flex justify-center gap-2">
                        {[0, 1].map((page) => (
                          <span
                            key={page}
                            className={`h-2 w-2 rounded-full ${inningPage === page ? 'bg-gray-800' : 'bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="px-3 py-3">
                      <table className="w-full border-collapse text-center text-[13px]">
                        <thead className="bg-gray-50 dark:bg-gray-800 text-[12px] text-gray-500 dark:text-gray-300">
                          <tr>
                            <th className="px-2 py-2 text-left">팀</th>
                            {regularInningCols.map((inning) => (
                              <th key={inning} className="px-2 py-2">{inning}</th>
                            ))}
                            <th className="px-2 py-2 text-red-600">R</th>
                          </tr>
                        </thead>
                        <tbody className="text-gray-700 dark:text-gray-200">
                          <tr>
                            <td className="px-2 py-2 text-left font-semibold" style={{ color: awayColor }}>
                              {awayTeamName}
                            </td>
                            {regularInningCols.map((inning) => (
                              <td key={`away-${inning}`} className="px-2 py-2">
                                {inningRows[inning]?.away ?? '-'}
                              </td>
                            ))}
                            <td className="px-2 py-2 font-semibold text-red-600">{awayScoreValue}</td>
                          </tr>
                          <tr>
                            <td className="px-2 py-2 text-left font-semibold" style={{ color: homeColor }}>
                              {homeTeamName}
                            </td>
                            {regularInningCols.map((inning) => (
                              <td key={`home-${inning}`} className="px-2 py-2">
                                {inningRows[inning]?.home ?? '-'}
                              </td>
                            ))}
                            <td className="px-2 py-2 font-semibold text-red-600">{homeScoreValue}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            )}

            {!gameDetailLoading && (
              <section>
                <GaugeContainer>
                  <GaugeHeader>
                    <TeamInfo $color={awayColor} $align="left">
                      <div className="name">{awayTeamName} 응원</div>
                      <div className="count">
                        {awayVotes.toLocaleString()}
                        <span className="percent">({awayPercent.toFixed(1)}%)</span>
                      </div>
                    </TeamInfo>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      style={{ fontSize: '1.2rem', paddingBottom: '5px' }}
                      aria-hidden
                    >
                      🔥
                    </motion.div>
                    <TeamInfo $color={homeColor} $align="right">
                      <div className="name">{homeTeamName} 응원</div>
                      <div className="count">
                        <span className="percent" style={{ marginRight: '4px' }}>({homePercent.toFixed(1)}%)</span>
                        {homeVotes.toLocaleString()}
                      </div>
                    </TeamInfo>
                  </GaugeHeader>
                  <ProgressBarWrapper>
                    <GaugeBar
                      color={awayColor}
                      initial={{ width: '50%' }}
                      animate={{ width: `${awayPercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                    <CenterSlash
                      initial={{ left: '50%' }}
                      animate={{ left: `${awayPercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                    <GaugeBar
                      color={homeColor}
                      initial={{ width: '50%' }}
                      animate={{ width: `${homePercent}%` }}
                      transition={{ type: 'spring', stiffness: 50, damping: 20 }}
                    />
                  </ProgressBarWrapper>
                  <div className="mt-2 text-center text-[12px] text-gray-500 dark:text-gray-400">
                    실시간 팬 응원 참여수: {cheeringTotal.toLocaleString()}명
                  </div>
                </GaugeContainer>
              </section>
            )}

            {!gameDetailLoading && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                  선발 투수
                </div>
                <div className="flex items-center rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 px-4 py-4 shadow-sm">
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold" style={{ color: awayColor }}>
                      {awayTeamName}
                    </p>
                    <p className="mt-1 text-[15px] font-bold text-gray-900 dark:text-gray-100">{awayPitcherName}</p>
                  </div>
                  <div className="px-3 text-xs font-semibold text-gray-400">VS</div>
                  <div className="flex-1 text-center">
                    <p className="text-xs font-semibold" style={{ color: homeColor }}>
                      {homeTeamName}
                    </p>
                    <p className="mt-1 text-[15px] font-bold text-gray-900 dark:text-gray-100">{homePitcherName}</p>
                  </div>
                </div>
              </section>
            )}

            {!gameDetailLoading && (attendanceLabel || weatherLabel || gameTimeLabel) && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                  경기 환경
                </div>
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/60 px-4 py-3 text-[13px]">
                  <div>
                    <p className="text-[12px] text-gray-400 dark:text-gray-500">관중</p>
                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{attendanceLabel || '정보 없음'}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-gray-400 dark:text-gray-500">날씨</p>
                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{weatherLabel || '정보 없음'}</p>
                  </div>
                  <div>
                    <p className="text-[12px] text-gray-400 dark:text-gray-500">경기시간</p>
                    <p className="mt-1 font-semibold text-gray-800 dark:text-gray-100">{gameTimeLabel || '정보 없음'}</p>
                  </div>
                </div>
              </section>
            )}

            {!gameDetailLoading && timelineEntries.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                  <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-gray-100" />
                  경기 주요 기록
                </div>
                <LayoutGroup>
                  <div className="relative">
                    <span className="absolute left-3 top-1 bottom-1 w-px bg-gray-200 dark:bg-gray-700 z-0" />
                    <div className="space-y-4">
                      {timelineEntries.map((item, index) => {
                        const isHighlight = item.type === '결승타';
                        const badgeColor = isHighlight ? awayColor : homeColor;
                        return (
                          <TimelineItem key={`${item.type}-${index}`} className="relative">
                            <TimelineCard
                              layout
                              className="ml-6 rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/70 px-3 py-2 shadow-sm"
                            >
                              <span
                                className="absolute left-3 top-3 h-2.5 w-2.5 -translate-x-1/2 rounded-full border z-10"
                                style={{
                                  backgroundColor: isHighlight ? badgeColor : '#ffffff',
                                  borderColor: badgeColor,
                                  boxShadow: isHighlight ? `0 0 0 6px ${badgeColor}22` : 'none',
                                }}
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <EventBadge style={{ backgroundColor: badgeColor }}>
                                  {item.type}
                                </EventBadge>
                                <p className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">
                                  {item.playerName || '기록'}
                                </p>
                              </div>
                              {item.detail && (
                                <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                                  {item.detail}
                                </p>
                              )}
                            </TimelineCard>
                          </TimelineItem>
                        );
                      })}
                    </div>
                  </div>
                </LayoutGroup>
              </section>
            )}

            {!gameDetailLoading && Object.keys(inningRows).length === 0 && timelineEntries.length === 0 && (
              <div className="text-center text-xs text-gray-500 dark:text-gray-400">표시할 경기 상세 정보가 없습니다.</div>
            )}

            {!gameDetailLoading && summaryGroups['심판']?.length > 0 && (
              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 text-center text-[11px] text-gray-500 dark:text-gray-400">
                심판: {summaryGroups['심판'][0]?.playerName || summaryGroups['심판'][0]?.detail || '정보 없음'}
              </div>
            )}
          </div>
        </DetailWrapper>
      </div>
    </Card>
  );
}
