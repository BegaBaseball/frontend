import { type SVGProps } from 'react';
import { CoachRiskItem } from '../../api/coach';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
    resolveRiskImpactText,
    resolveRiskImpactTo,
    resolveRiskInningLabel,
    resolveRiskInningPosition,
    riskSevColor,
    useIsDark,
} from './coachRiskHelpers';
import { getCoachTokens, IMPACT } from './coachStyleTokens';

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

interface RiskTimelineProps {
    risks: CoachRiskItem[];
    isPositive: boolean;
}

export default function RiskTimeline({ risks, isPositive }: RiskTimelineProps) {
    const isDark   = useIsDark();
    const isNarrow = useMediaQuery('(max-width: 640px)');

    if (!risks || risks.length === 0) return null;

    const innings = isNarrow
        ? [1, 3, 5, 7, 9]
        : [1, 2, 3, 4, 5, 6, 7, 8, 9];

    // level별 출현 순서로 x 좌표 배분
    const levelCount = [0, 0, 0];
    const dots = risks.map((risk) => {
        const offset = levelCount[risk.level]++;
        const x = risk.level === 0
            ? 2 + offset
            : risk.level === 1
                ? 5 + offset
                : 7 + offset;
        return { risk, x: resolveRiskInningPosition(risk, Math.min(x, 9)) };
    });

    // 색상 토큰
    const t = getCoachTokens(isDark);
    const bg          = t.cardBg;
    const border      = t.cardBorder;
    const axisColor   = t.axisColor;
    const tickColor   = t.tickColor;
    const tickLabel   = t.tickLabel;
    const rowBorder   = t.rowBorder;
    const textColor   = t.textColor;
    const subColor    = t.subColor;
    const headerColor = t.headerColor;

    return (
        <div style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 16,
            padding: isNarrow ? '16px 14px 6px' : '18px 22px 8px',
        }}>
            {/* 범례 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: headerColor,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                }}>
                    리스크 회차 분포
                </span>
                <span style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    gap: isNarrow ? 8 : 12,
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: subColor,
                }}>
                    {([
                        [riskSevColor(0), '높음'],
                        [riskSevColor(1), '중간'],
                        [riskSevColor(2), '낮음'],
                    ] as const).map(([c, l]) => (
                        <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 7, height: 7, borderRadius: 999, background: c, display: 'inline-block' }} />
                            {l}
                        </span>
                    ))}
                </span>
            </div>

            {/* 9회 축 */}
            <div style={{ position: 'relative', height: 60, margin: isNarrow ? '0 6px' : '0 12px' }}>
                {/* 축선 */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: 30, height: 2, background: axisColor }} />

                {/* 눈금 */}
                {innings.map((n) => (
                    <div
                        key={n}
                        style={{
                            position: 'absolute',
                            left: `${((n - 1) / 8) * 100}%`,
                            top: 26,
                            transform: 'translateX(-50%)',
                        }}
                    >
                        <div style={{ width: 1, height: 10, background: tickColor, margin: '0 auto' }} />
                        <div style={{ fontSize: 10.5, color: tickLabel, fontWeight: 700, textAlign: 'center', marginTop: 4 }}>
                            {n}회
                        </div>
                    </div>
                ))}

                {/* 도트 */}
                {dots.map(({ risk, x }, i) => {
                    const color = riskSevColor(risk.level);
                    return (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                left: `${((x - 1) / 8) * 100}%`,
                                top: 16,
                                transform: 'translateX(-50%)',
                            }}
                        >
                            <div style={{
                                width: 14,
                                height: 14,
                                borderRadius: 999,
                                background: color,
                                border: `3px solid ${bg}`,
                                boxShadow: `0 0 0 1px ${color}`,
                                margin: '0 auto',
                            }} />
                            {/* 모바일에서는 도트 위 라벨 숨김 (리스트와 중복 방지) */}
                            {!isNarrow && (
                                <div style={{
                                    fontSize: 10.5,
                                    fontWeight: 800,
                                    color: textColor,
                                    whiteSpace: 'nowrap',
                                    position: 'absolute',
                                    top: -22,
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                }}>
                                    {risk.area}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 리스트 */}
            <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column' }}>
                {risks.map((r, idx) => {
                    const color       = riskSevColor(r.level);
                    const impactTo    = resolveRiskImpactTo(r, isPositive);
                    const impactColor = impactTo === 'home' ? IMPACT.home : impactTo === 'away' ? IMPACT.away : IMPACT.bothText;
                    const impactText  = resolveRiskImpactText(r, isPositive);

                    return (
                        <div
                            key={`d-${idx}`}
                            style={{
                                display: 'grid',
                                // 모바일: 아이콘 | 텍스트 | impact
                                // 데스크탑: 아이콘 | 회차(70px) | 텍스트 | impact
                                gridTemplateColumns: isNarrow
                                    ? '22px 1fr auto'
                                    : '24px 70px 1fr auto',
                                gap: isNarrow ? 10 : 12,
                                padding: '10px 0',
                                borderTop: `1px solid ${rowBorder}`,
                                alignItems: 'center',
                            }}
                        >
                            {/* 아이콘 */}
                            <span style={{
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                flexShrink: 0,
                                background: t.iconChipBg,
                                color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <RiskIcon level={r.level} width="12" height="12" />
                            </span>

                            {!isNarrow && (
                                <span style={{
                                    fontSize: 11.5,
                                    color: subColor,
                                    fontWeight: 800,
                                    fontFamily: 'ui-monospace, monospace',
                                }}>
                                    {resolveRiskInningLabel(r)}
                                </span>
                            )}

                            <span style={{
                                fontSize: isNarrow ? 12.5 : 13.5,
                                fontWeight: 700,
                                color: textColor,
                                lineHeight: 1.45,
                                minWidth: 0,
                            }}>
                                {/* 모바일: 회차를 본문 앞에 인라인 */}
                                {isNarrow && (
                                    <span style={{
                                        fontSize: 10.5,
                                        color: subColor,
                                        fontWeight: 800,
                                        fontFamily: 'ui-monospace, monospace',
                                        marginRight: 6,
                                    }}>
                                        {resolveRiskInningLabel(r)}
                                    </span>
                                )}
                                <strong style={{ fontWeight: 800 }}>{r.area}</strong>
                                <span style={{ color: subColor, fontWeight: 600 }}> · {r.description}</span>
                            </span>

                            <span style={{
                                fontSize: 12,
                                fontWeight: 800,
                                color: impactColor,
                                whiteSpace: 'nowrap',
                                fontFamily: 'ui-monospace, monospace',
                            }}>
                                {impactText}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
