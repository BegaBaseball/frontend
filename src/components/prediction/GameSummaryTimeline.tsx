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
      <div className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
        <span className="h-2 w-2 rounded-full bg-gray-900 dark:bg-foreground" />
        경기 주요 기록
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1 bottom-1 w-px bg-gray-200 dark:bg-border z-0" />
        <div className="space-y-4">
          {timelineEntries.map((item, index) => {
            const isHighlight = item.type === '결승타';
            const badgeColor = isHighlight ? awayColor : homeColor;
            return (
              <div key={`${item.type}-${index}`} className="relative">
                <div
                  className="ml-6 rounded-lg border border-gray-100 dark:border-border bg-white dark:bg-secondary/40 px-3 py-2 shadow-sm"
                  style={{ transition: 'background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease' }}
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
                    <span
                      className="inline-flex items-center rounded px-2 py-0.5 text-body font-bold text-white"
                      style={{
                        backgroundColor: badgeColor,
                        transition: 'background-color 300ms ease, color 300ms ease, border-color 300ms ease, box-shadow 300ms ease',
                      }}
                    >
                      {item.type}
                    </span>
                    <p className="text-body font-bold text-gray-900 dark:text-white">
                      {item.playerName || '기록'}
                    </p>
                  </div>
                  {item.detail && (
                    <p className="mt-1 text-body text-gray-500 dark:text-white">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
