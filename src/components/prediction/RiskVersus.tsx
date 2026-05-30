import { type SVGProps } from 'react';
import { CoachRiskItem } from '../../api/coach';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import TeamLogo from '../TeamLogo';
import {
    riskImpactTo,
    riskInning,
    riskSevColor,
    shortTeamName,
    useIsDark,
} from './coachRiskHelpers';

function PitchIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 7c2 3 6 7 9 9M16 7c-2 3-6 7-9 9" />
        </svg>
    );
}

function WindIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M3 8h10a3 3 0 100-6" />
            <path d="M3 14h14a3 3 0 110 6" />
            <path d="M3 11h7" />
        </svg>
    );
}

function BrainIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
            <path d="M9 4a3 3 0 00-3 3v1a3 3 0 00-2 3v1a3 3 0 002 3v1a3 3 0 003 3" />
            <path d="M15 4a3 3 0 013 3v1a3 3 0 012 3v1a3 3 0 01-2 3v1a3 3 0 01-3 3" />
            <path d="M9 4a3 3 0 016 0M9 20a3 3 0 006 0" />
        </svg>
    );
}

function RiskIcon({ level, ...props }: SVGProps<SVGSVGElement> & { level: 0 | 1 | 2 }) {
    if (level === 0) return <PitchIcon {...props} />;
    if (level === 1) return <WindIcon {...props} />;
    return <BrainIcon {...props} />;
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

    const homeName = shortTeamName(homeTeamId) || '홈팀';
    const awayName = shortTeamName(awayTeamId) || '원정팀';

    const bg           = isDark ? '#1c1f28' : '#fff';
    const border       = isDark ? '#2d3748' : '#e5e7eb';
    const headerBg     = isDark ? '#111827' : '#fafafa';
    const headerBorder = isDark ? '#1f2937' : '#eef2f0';
    const rowBorder    = isDark ? '#1f2937' : '#f1f5f9';
    const textColor    = isDark ? '#e5e7eb' : '#0f1419';
    const subColor     = isDark ? '#6b7280' : '#475569';
    const headerText   = isDark ? '#6b7280' : '#64748b';

    return (
        <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 16, overflow: 'hidden' }}>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                background: headerBg,
                padding: isNarrow ? '8px 14px' : '10px 18px',
                fontSize: isNarrow ? 10 : 11,
                fontWeight: 800,
                color: headerText,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                borderBottom: `1px solid ${headerBorder}`,
            }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {homeTeamId && (
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
                            <TeamLogo teamId={homeTeamId} size={13} className="!rounded-none !bg-transparent p-0" />
                        </span>
                    )}
                    {homeName}에 불리
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end' }}>
                    {awayName}에 불리
                    {awayTeamId && (
                        <span style={{ display: 'inline-flex', verticalAlign: 'middle', flexShrink: 0 }}>
                            <TeamLogo teamId={awayTeamId} size={13} className="!rounded-none !bg-transparent p-0" />
                        </span>
                    )}
                </span>
            </div>

            {/* 리스크 행 */}
            {risks.map((r, idx) => {
                const impactTo  = riskImpactTo(r.level, isPositive);
                const isHome    = impactTo === 'home';
                const isAway    = impactTo === 'away';
                const isBoth    = impactTo === 'both';
                const sevColor  = riskSevColor(r.level);
                const pillText  = isHome ? `${homeName} 불리` : isAway ? `${awayName} 불리` : '양 팀 변수';
                const pillColor = isHome ? '#b91c1c' : isAway ? '#047857' : '#854d0e';
                const pillBg    = isHome
                    ? (isDark ? 'rgba(220,38,38,0.15)' : '#fef2f2')
                    : isAway
                        ? (isDark ? 'rgba(5,150,105,0.15)' : '#ecfdf5')
                        : (isDark ? 'rgba(133,77,14,0.15)' : '#fffbeb');

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
                                    background: isDark ? 'rgba(254,202,202,0.3)' : '#fecaca',
                                    transform: 'translateY(-1.5px)',
                                }} />
                            )}
                            {isAway && (
                                <div style={{
                                    width: '50%',
                                    marginLeft: 'auto',
                                    background: isDark ? 'rgba(167,243,208,0.3)' : '#a7f3d0',
                                    transform: 'translateY(-1.5px)',
                                }} />
                            )}
                            {isBoth && (
                                <div style={{
                                    width: '100%',
                                    background: isDark ? 'rgba(253,230,138,0.2)' : '#fde68a',
                                    transform: 'translateY(-1.5px)',
                                }} />
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: isNarrow ? 8 : 12,
                            marginBottom: 6,
                            flexWrap: isNarrow ? 'wrap' : 'nowrap',
                        }}>
                            <span style={{
                                width: 26,
                                height: 26,
                                borderRadius: 8,
                                flexShrink: 0,
                                background: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                                color: sevColor,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <RiskIcon level={r.level} width="13" height="13" />
                            </span>
                            <span style={{ fontSize: 14, fontWeight: 800, color: textColor }}>
                                {r.area}
                            </span>
                            <span style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: subColor,
                                fontFamily: 'ui-monospace, monospace',
                            }}>
                                · {riskInning(r.level)}
                            </span>
                            <span style={{
                                marginLeft: 'auto',
                                fontSize: isNarrow ? 11 : 12,
                                fontWeight: 800,
                                color: pillColor,
                                padding: '3px 8px',
                                borderRadius: 999,
                                background: pillBg,
                                whiteSpace: 'nowrap',
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
                        }}>
                            {r.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
