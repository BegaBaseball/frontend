import { useState } from 'react';

import { TEAM_ASSETS } from './landingAssets';
import { TICKER_ITEMS } from './landingShowcaseData';

interface TickerGroupProps {
  ariaHidden?: boolean;
}

function TickerGroup({ ariaHidden = false }: TickerGroupProps) {
  return (
    <div className="landing-ticker-group" aria-hidden={ariaHidden || undefined}>
      {TICKER_ITEMS.map((item) => (
        <span className="landing-ticker-item" key={`${item.firstTeam}-${item.secondTeam}`}>
          <img
            src={TEAM_ASSETS[item.firstTeam]}
            alt=""
            width={20}
            height={20}
          />
          <span>{item.firstLabel}</span>
          <span className="landing-ticker-score">{item.score}</span>
          <span>{item.secondLabel}</span>
          <img
            src={TEAM_ASSETS[item.secondTeam]}
            alt=""
            width={20}
            height={20}
          />
          <span className={`landing-ticker-status landing-ticker-status-${item.tone}`}>
            {item.status}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function LandingTicker() {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <aside data-testid="landing-score-ticker" aria-label="BEGA 기능 예시 스코어">
      <div
        className="landing-ticker-track"
        data-motion-loop
        data-paused={isPaused || undefined}
      >
        <TickerGroup />
        <TickerGroup ariaHidden />
      </div>
      <button
        type="button"
        className="landing-ticker-toggle"
        data-testid="landing-ticker-toggle"
        aria-pressed={isPaused}
        onClick={() => setIsPaused((paused) => !paused)}
      >
        {isPaused ? '티커 재생' : '티커 일시정지'}
      </button>
    </aside>
  );
}
