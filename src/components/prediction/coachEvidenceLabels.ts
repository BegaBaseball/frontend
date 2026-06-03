/**
 * 코치 분석 `used_evidence` 소스 코드 → 한글 라벨 매핑.
 * 백엔드(coach.py)가 SSE meta payload로 보내는 근거 소스 코드를 사용자에게 보여줄
 * 짧은 한글 라벨로 변환한다. 미지정 코드는 코드 원문을 그대로 반환(graceful fallback).
 */
export const EVIDENCE_SOURCE_LABELS: Record<string, string> = {
    home_pitcher: '홈 선발',
    away_pitcher: '원정 선발',
    home_lineup: '홈 라인업',
    away_lineup: '원정 라인업',
    game_summary: '경기 요약',
    game_metadata: '경기 메타데이터',
    series_context: '시리즈 전황',
    player_form_signals: '선수 폼 신호',
    matchup_history: '상대 전적',
    clutch_moments: '승부처 기록',
};

export function evidenceSourceLabel(code: string): string {
    return EVIDENCE_SOURCE_LABELS[code] ?? code;
}
