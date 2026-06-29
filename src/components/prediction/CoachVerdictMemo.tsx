import { type SVGProps } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { parseHighlight, useIsDark } from './coachRiskHelpers';
import { getCoachTokens } from './coachStyleTokens';

function PenIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d="M16 4l4 4-11 11H5v-4L16 4z" />
            <path d="M14 6l4 4" />
        </svg>
    );
}

interface CoachVerdictMemoProps {
    verdict: string;
    isReviewMode: boolean;
    isFallback?: boolean;
}

export default function CoachVerdictMemo({
    verdict,
    isReviewMode,
    isFallback = false,
}: CoachVerdictMemoProps) {
    const isDark   = useIsDark();
    const isNarrow = useMediaQuery('(max-width: 640px)');

    const text = verdict?.trim();
    if (!text) return null;

    const t = getCoachTokens(isDark);
    const paperBg      = t.paperBg;
    const paperBorder  = t.paperBorder;
    const ruleColor    = t.ruleColor;
    const accentColor  = t.paperAccent;
    const textColor    = t.paperText;
    const dashedBorder = t.dashedBorder;

    return (
        <div
            role="note"
            aria-label={isReviewMode ? '코치 리뷰 노트' : 'AI 코치 분석 메모'}
            style={{
                background: paperBg,
                border: `1px solid ${paperBorder}`,
                borderRadius: 4,
                boxShadow: t.paperShadow,
                padding: isNarrow ? '18px 16px' : '20px 24px 22px',
                position: 'relative',
                backgroundImage: `repeating-linear-gradient(
                    to bottom,
                    transparent 0,
                    transparent 23px,
                    ${ruleColor} 23px,
                    ${ruleColor} 24px
                )`,
                backgroundPosition: '0 36px',
            }}
        >
            {/* 테이프 */}
            <div
                aria-hidden="true"
                style={{
                    position: 'absolute',
                    // 레퍼런스 VerdictA 테이프 치수/위치 정렬(64×14 @ left:20)
                    left: 20,
                    top: -8,
                    width: 64,
                    height: 14,
                    background: t.tapeBg,
                    transform: 'rotate(-2deg)',
                    borderRadius: 1,
                }}
            />

            {/* 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <PenIcon style={{ width: 13, height: 13, color: accentColor, flexShrink: 0 }} />
                <span style={{
                    fontSize: 11.5,
                    fontWeight: 800,
                    color: accentColor,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                }}>
                    {isReviewMode ? '코치 리뷰 노트' : 'AI 코치 메모'}
                </span>
            </div>

            {/* 본문 */}
            <p style={{
                margin: 0,
                fontSize: isNarrow ? 14.5 : 15.5,
                // 레퍼런스 VerdictA 본문 행간 정렬(1.55) — 종전 1.6 드리프트
                lineHeight: 1.55,
                fontWeight: 600,
                color: textColor,
                letterSpacing: 0,
            }}>
                {parseHighlight(text)}
            </p>

            {/* 서명 */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px dashed ${dashedBorder}`,
            }}>
                <span style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: accentColor,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}>
                    {isFallback
                        ? '- BEGA AI 분석 (구체적 판단은 상세 리포트 참고)'
                        : '- BEGA 코치 분석'}
                </span>
            </div>
        </div>
    );
}
