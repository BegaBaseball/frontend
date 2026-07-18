import {
  LandingCalendarIcon,
  LandingMapPinIcon,
  LandingUsersIcon,
} from '../../icons/LandingIcons';
import { TEAM_ASSETS } from '../landingAssets';
import { LANDING_MATE_DATA } from '../landingShowcaseData';

const MATE_DETAIL_ICONS = [LandingCalendarIcon, LandingUsersIcon, LandingMapPinIcon];

export default function LandingMateVignette() {
  return (
    <div className="landing-mate-vignette">
      <article className="landing-vignette-card landing-mate-card">
        <header>
          <div className="landing-mate-matchup">
            <img src={TEAM_ASSETS[LANDING_MATE_DATA.team]} alt="" width={24} height={24} />
            <h3>{LANDING_MATE_DATA.matchup}</h3>
          </div>
          <span className="landing-mate-status">{LANDING_MATE_DATA.status}</span>
        </header>
        <ul className="landing-mate-details">
          {LANDING_MATE_DATA.details.map((detail, index) => {
            const Icon = MATE_DETAIL_ICONS[index];
            return (
              <li key={detail}>
                {Icon && <Icon size={14} stroke="#64748b" aria-hidden="true" />}
                {detail}
              </li>
            );
          })}
        </ul>
      </article>

      <ol className="landing-mate-steps" aria-label="같이가요 진행 순서">
        {LANDING_MATE_DATA.steps.map((step, index) => (
          <li className={index === LANDING_MATE_DATA.steps.length - 1 ? 'landing-mate-step-current' : undefined} key={step}>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="landing-mate-deposit">{LANDING_MATE_DATA.depositCopy}</p>
    </div>
  );
}
