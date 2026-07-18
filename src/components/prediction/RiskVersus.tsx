import type { SVGProps } from 'react';

import { CoachRiskItem } from '../../api/coach';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import TeamLogo from '../TeamLogo';
import {
    PredictionBaseballOutlineIcon,
    PredictionBrainIcon,
    PredictionWindIcon,
} from './PredictionShellIcons';
import {
    resolveRiskAreaLabel,
    resolveRiskImpactTo,
    resolveRiskInningLabel,
    riskSevColor,
    shortTeamName,
    useIsDark,
} from './coachRiskHelpers';
import { getCoachTokens, IMPACT } from './coachStyleTokens';

function RiskIcon({ level, ...props }: SVGProps<SVGSVGElement> & { level: 0 | 1 | 2 }) {
    const Icon = level === 0 ? PredictionBaseballOutlineIcon : level === 1 ? PredictionWindIcon : PredictionBrainIcon;
    return <Icon aria-hidden="true" {...props} />;
}

interface RiskVersusProps {
    risks: CoachRiskItem[];
    isPositive: boolean;
    homeTeamId?: string;
    awayTeamId?: string;
}

export default function RiskVersus({
    risks,
    isPositive,
    homeTeamId,
    awayTeamId,
}: RiskVersusProps) {
    const isDark   = useIsDark();
    const isNarrow = useMediaQuery('(max-width: 640px)');

    if (!risks || risks.length === 0) return null;

    const homeName = shortTeamName(homeTeamId) || '홈팀';
    const awayName = shortTeamName(awayTeamId) || '원정팀';

    const t = getCoachTokens(isDark);
    const bg           = t.cardBg;
    const border       = t.cardBorder;
    const headerBg     = t.headerBg;
    const headerBorder = t.headerBorder;
    const rowBorder    = t.rowBorder;
    const textColor    = t.textColor;
    const subColor     = t.subColorStrong;
    const headerText   = t.headerText;

    return (
        <div
            data-testid="coach-risk-versus"
            style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden', minWidth: 0 }}
        >

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                background: headerBg,
                padding: isNarrow ? '8px 14px' : '10px 18px',
                fontSize: isNarrow ? 10 : 11,
                fontWeight: 800,
                color: headerText,
                textTransform: 'uppercase',
                letterSpacing: 0,
                borderBottom: `1px solid ${headerBorder}`,
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    {homeTeamId && (
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
                            <TeamLogo teamId={homeTeamId} size={13} className="!rounded-none !bg-transparent p-0" />
                        </span>
                    )}
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'keep-all' }}>
                        {homeName}에 불리
                    </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', minWidth: 0, textAlign: 'right' }}>
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere', wordBreak: 'keep-all' }}>
                        {awayName}에 불리
                    </span>
                    {awayTeamId && (
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
                            <TeamLogo teamId={awayTeamId} size={13} className="!rounded-none !bg-transparent p-0" />
                        </span>
                    )}
                </span>
            </div>

            {/* 리스크 행 */}
            {risks.map((r, idx) => {
                const impactTo  = resolveRiskImpactTo(r, isPositive);
                const isHome    = impactTo === 'home';
                const isAway    = impactTo === 'away';
                const isBoth    = impactTo === 'both';
                const sevColor  = riskSevColor(r.level);
                const areaLabel = resolveRiskAreaLabel(r.area);
                const pillText  = r.impact
                    ? `${isHome ? homeName : isAway ? awayName : '양 팀'} ${r.impact}`
                    : isHome ? `${homeName} 불리` : isAway ? `${awayName} 불리` : '양 팀 변수';
                const pillColor = isHome ? IMPACT.home : isAway ? IMPACT.away : IMPACT.bothPill;
                const pillBg    = isHome ? t.pillBgHome : isAway ? t.pillBgAway : t.pillBgBoth;

                return (
                    <div
                        key={`e-${idx}`}
                        style={{
                            padding: isNarrow ? '12px 14px' : '14px 18px',
                            borderTop: `1px solid ${rowBorder}`,
                            position: 'relative',
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            left: isNarrow ? 14 : 18,
                            right: isNarrow ? 14 : 18,
                            top: 0,
                            height: 3,
                            display: 'flex',
                        }}>
                            {isHome && (
                                <div style={{
                                    width: '50%',
                                    background: t.accentHome,
                                    transform: 'translateY(-1.5px)',
                                }} />
                            )}
                            {isAway && (
                                <div style={{
                                    width: '50%',
                                    marginLeft: 'auto',
                                    background: t.accentAway,
                                    transform: 'translateY(-1.5px)',
                                }} />
                            )}
                            {isBoth && (
                                <div style={{
                                    width: '100%',
                                    background: t.accentBoth,
                                    transform: 'translateY(-1.5px)',
                                }} />
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isNarrow ? 8 : 12,
                            marginBottom: 6,
                            flexWrap: 'wrap',
                            minWidth: 0,
                        }}>
                            <span style={{
                                width: 26,
                                height: 26,
                                borderRadius: 8,
                                flexShrink: 0,
                                background: t.iconChipBg,
                                color: sevColor,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <RiskIcon level={r.level} width="13" height="13" />
                            </span>
                            <span style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: textColor,
                                minWidth: 0,
                                overflowWrap: 'anywhere',
                                wordBreak: 'keep-all',
                            }}>
                                {areaLabel}
                            </span>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: subColor,
                                flexShrink: 0,
                            }}>
                                · {resolveRiskInningLabel(r)}
                            </span>
                            <span style={{
                                marginLeft: isNarrow ? 0 : 'auto',
                                fontSize: isNarrow ? 11 : 12,
                                fontWeight: 800,
                                color: pillColor,
                                padding: '3px 8px',
                                borderRadius: 999,
                                background: pillBg,
                                maxWidth: '100%',
                                whiteSpace: 'normal',
                                overflowWrap: 'anywhere',
                                wordBreak: 'keep-all',
                                textAlign: isNarrow ? 'left' : 'right',
                                lineHeight: 1.3,
                            }}>
                                {pillText}
                            </span>
                        </div>

                        <p style={{
                            margin: 0,
                            fontSize: 13,
                            color: subColor,
                            fontWeight: 600,
                            lineHeight: 1.5,
                            paddingLeft: isNarrow ? 34 : 38,
                            overflowWrap: 'anywhere',
                            wordBreak: 'keep-all',
                        }}>
                            {r.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
