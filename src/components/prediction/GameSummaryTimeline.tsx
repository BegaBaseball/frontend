import styled from 'styled-components';
import { LayoutGroup, motion } from 'framer-motion';

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

interface TimelineEntry {
  type: string;
  playerName?: string;
  detail?: string;
  groupTitle: string;
  _index: number;
  _inning: number;
}

interface GameSummaryTimelineProps {
  timelineEntries: TimelineEntry[];
  awayColor: string;
  homeColor: string;
}

export function GameSummaryTimeline({
  timelineEntries,
  awayColor,
  homeColor,
}: GameSummaryTimelineProps) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
        <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
        경기 주요 기록
      </div>
      <LayoutGroup>
        <div className="relative">
          <span className="absolute left-3 top-1 bottom-1 w-px bg-gray-200 dark:bg-border z-0" />
          <div className="space-y-4">
            {timelineEntries.map((item, index) => {
              const isHighlight = item.type === '결승타';
              const badgeColor = isHighlight ? awayColor : homeColor;
              return (
                <TimelineItem key={`${item.type}-${index}`} className="relative">
                  <TimelineCard
                    layout
                    className="ml-6 rounded-lg border border-gray-100 dark:border-border bg-white dark:bg-secondary/40 px-3 py-2 shadow-sm"
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
                      <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-300">
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
  );
}
