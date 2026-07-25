import { useNavigate } from 'react-router-dom';

import { BEGA_LOGO_ASSET, TEAM_ASSETS } from './landingAssets';
import { TEAM_LABELS, TEAM_ORDER } from './landingShowcaseData';

interface HeroStat {
  readonly value: number;
  readonly label: string;
  readonly accent?: boolean;
}

const HERO_STATS: readonly HeroStat[] = [
  { value: 10, label: '구단' },
  { value: 720, label: '시즌 경기', accent: true },
  { value: 9, label: '구장 가이드' },
];

export default function LandingHero() {
  const navigate = useNavigate();

  return (
    <section className="landing-hero" data-testid="landing-hero">
      <div
        className="landing-hero-watermark"
        data-parallax="0.12"
        data-parallax-center
        aria-hidden="true"
      >
        720
      </div>

      <div className="landing-hero-inner">
        <div className="landing-hero-brand">
          <img src={BEGA_LOGO_ASSET} alt="BEGA" width={29} height={30} />
          <span>BASEBALL GUIDE</span>
        </div>

        <h1>
          10개 구단<br />
          <strong>720경기</strong>의 시즌,<br />
          앱 하나로.
        </h1>

        <p className="landing-hero-copy">
          점수 · 예측 · 응원 · 메이트 · 구장 · 일기 —<br />
          야구팬의 하루가 전부 BEGA 안에 있습니다.
        </p>

        <button
          type="button"
          data-testid="landing-home-cta"
          className="landing-home-cta"
          onClick={() => navigate('/home')}
        >
          홈으로 이동
        </button>

        <dl className="landing-hero-stats">
          {HERO_STATS.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd className={stat.accent ? 'landing-hero-stat-accent' : undefined}>
                <span data-count={stat.value}>{stat.value}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="landing-team-row" data-testid="landing-team-row">
          {TEAM_ORDER.map((team) => (
            <img
              key={team}
              src={TEAM_ASSETS[team]}
              alt={TEAM_LABELS[team]}
              width={32}
              height={32}
            />
          ))}
        </div>

        <div className="landing-scroll-indicator" aria-hidden="true">
          <span>SCROLL</span>
          <i />
        </div>
      </div>
    </section>
  );
}
