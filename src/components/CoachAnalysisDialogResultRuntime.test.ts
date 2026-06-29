import assert from 'node:assert/strict';
import test from 'node:test';

import type { CoachAnalyzeResponse } from '../api/coach';
import { getAnalysisData } from './CoachAnalysisDialogResultRuntime';

test('getAnalysisData는 structured scheduled 응답 문장을 브리핑 fallback 문구로 덮어쓰지 않는다', () => {
    const result: CoachAnalyzeResponse = {
        generation_mode: 'evidence_fallback',
        data_quality: 'partial',
        game_status_bucket: 'SCHEDULED',
        structuredData: {
            headline: '한화 이글스 vs SSG 랜더스 예정 경기 분석',
            sentiment: 'neutral',
            key_metrics: [],
            analysis: {
                summary: '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.',
                verdict: '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.',
                strengths: ['한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.'],
                weaknesses: ['SSG 랜더스는 팀 폼 점수 97.4점을 기록하며 최근 흐름이 상승세입니다.'],
                risks: [],
                why_it_matters: [],
                swing_factors: ['발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.'],
                watch_points: ['불펜 투입 시점과 라인업 확정 여부 확인'],
                uncertainty: ['선발과 라인업 확정 전까지는 보수적으로 해석해야 합니다.'],
            },
            detailed_markdown: '## 최근 전력\n- 한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.\n\n## 불펜 상태\n- SSG 랜더스는 불펜 소모가 적어 경기 후반 운영 여력이 남아 있습니다.',
            coach_note: '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.',
        },
    };

    const analysisData = getAnalysisData({
        result,
        isPastGame: false,
        isFutureGame: true,
        gameStatusBucket: 'SCHEDULED',
    });

    assert.ok(analysisData);
    assert.equal(
        analysisData.analysis_summary,
        '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.',
    );
    assert.equal(
        analysisData.verdict,
        '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.',
    );
    assert.deepEqual(analysisData.strengths, [
        '한화 이글스는 팀 폼 점수 90.1점을 기록하며 최근 흐름이 상승세입니다.',
    ]);
    assert.deepEqual(analysisData.weaknesses, [
        'SSG 랜더스는 팀 폼 점수 97.4점을 기록하며 최근 흐름이 상승세입니다.',
    ]);
    assert.equal(
        analysisData.coach_note,
        '발표 선발 한화 이글스 발표 전 / SSG 랜더스 발표 전 뒤 첫 번째 불펜 선택이 가장 큰 변수입니다.',
    );
    assert.match(
        analysisData.detailed_analysis,
        /팀 폼 점수 90\.1점을 기록하며 최근 흐름이 상승세입니다\./,
    );
    assert.match(
        analysisData.detailed_analysis,
        /불펜 소모가 적어 경기 후반 운영 여력이 남아 있습니다\./,
    );
    assert.doesNotMatch(analysisData.analysis_summary, /최근 흐름 근거가 부족합니다/);
    assert.doesNotMatch(analysisData.coach_note, /팀 폼 점수 90\.최근 흐름 근거가 부족합니다/);
});

test('getAnalysisData는 manual detail 응답의 리스크 optional fields를 보존한다', () => {
    const result: CoachAnalyzeResponse = {
        generation_mode: 'evidence_fallback',
        data_quality: 'grounded',
        game_status_bucket: 'SCHEDULED',
        structuredData: {
            headline: '모바일 상세 분석',
            sentiment: 'positive',
            key_metrics: [],
            analysis: {
                summary: '홈팀이 후반 운영에서 근소하게 앞섭니다.',
                verdict: '7회 이후 불펜 운영이 승부처입니다.',
                strengths: ['홈팀은 후반 대타 카드가 남아 있습니다.'],
                weaknesses: ['원정팀은 불펜 소모가 누적되어 있습니다.'],
                risks: [
                    {
                        area: '불펜 운영',
                        level: 1,
                        description: '7회 이후 우완 불펜 매치업이 흔들릴 수 있습니다.',
                        inning_label: '7~8회',
                        inning_start: 7,
                        inning_end: 8,
                        impact: '-4%p',
                        impact_to: 'away',
                    },
                ],
                why_it_matters: ['후반 승률 변동성이 가장 큽니다.'],
                swing_factors: ['7회 첫 불펜 선택'],
                watch_points: ['불펜 워밍업 타이밍'],
                uncertainty: ['라인업 확정 전까지는 보수적으로 봅니다.'],
            },
            detailed_markdown: '## 코치 판단\n- 7회 이후 불펜 운영이 승부처입니다.',
            coach_note: '7회 이후 불펜 운영이 승부처입니다.',
        },
    };

    const analysisData = getAnalysisData({
        result,
        isPastGame: false,
        isFutureGame: true,
        gameStatusBucket: 'SCHEDULED',
    });

    assert.ok(analysisData);
    assert.deepEqual(analysisData.risks[0], {
        area: '불펜 운영',
        level: 1,
        description: '7회 이후 우완 불펜 매치업이 흔들릴 수 있습니다.',
        inning_label: '7~8회',
        inning_start: 7,
        inning_end: 8,
        impact: '-4%p',
        impact_to: 'away',
    });
});

test('getAnalysisData는 수동 야구 데이터 요청 응답에서 분석 본문을 만들지 않는다', () => {
    const result: CoachAnalyzeResponse = {
        data_quality: 'insufficient',
        manual_data_request: {
            scope: 'coach.analyze',
            missingItems: [],
            operatorMessage: '다음 야구 데이터가 필요합니다: 경기 날짜, 시즌/리그 구분',
            blocking: true,
            code: 'MANUAL_BASEBALL_DATA_REQUIRED',
        },
    };

    const analysisData = getAnalysisData({
        result,
        isPastGame: false,
        isFutureGame: false,
        gameStatusBucket: 'UNKNOWN',
    });

    assert.equal(analysisData, null);
});

test('getAnalysisData는 결과 응답에 상태 버킷이 없어도 부모 완료 상태를 보존한다', () => {
    const result: CoachAnalyzeResponse = {
        structuredData: {
            headline: 'KIA 타이거즈 승리 리뷰',
            sentiment: 'positive',
            key_metrics: [],
            analysis: {
                summary: 'KIA 타이거즈가 후반 득점으로 경기를 가져갔습니다.',
                verdict: '완료 경기 기준 리뷰입니다.',
                strengths: ['KIA 타이거즈는 득점권 집중력이 좋았습니다.'],
                weaknesses: ['KT 위즈는 불펜 운영에서 흔들렸습니다.'],
                risks: [],
                why_it_matters: [],
                swing_factors: [],
                watch_points: [],
                uncertainty: [],
            },
            detailed_markdown: '## 경기 리뷰\n- 완료 경기 기준 리뷰입니다.',
            coach_note: '완료 경기 기준 리뷰입니다.',
        },
    };

    const analysisData = getAnalysisData({
        result,
        isPastGame: true,
        isFutureGame: false,
        gameStatusBucket: 'COMPLETED',
    });

    assert.ok(analysisData);
    assert.equal(analysisData.game_status_bucket, 'COMPLETED');
});

test('getAnalysisData는 structured risks가 비어도 약점 근거에서 표시 리스크를 만든다', () => {
    const result: CoachAnalyzeResponse = {
        structuredData: {
            headline: '한화 이글스 vs SSG 랜더스 예정 경기 분석',
            sentiment: 'neutral',
            key_metrics: [],
            analysis: {
                summary: 'SSG 랜더스가 최근 흐름과 득점 연결력에서 앞섭니다.',
                verdict: '한화 이글스는 초반 득점 기회를 만드는 힘을 보강해야 합니다.',
                strengths: ['SSG 랜더스는 최근 득점 흐름이 좋습니다.'],
                weaknesses: ['한화 이글스는 득점 연결력 열세로 초반 득점 기회를 만드는 힘을 보강해야 합니다.'],
                risks: [],
                why_it_matters: ['최근 흐름과 출루·장타 지표가 초중반 주도권에 영향을 줍니다.'],
                swing_factors: ['선발 발표 뒤 첫 불펜 카드가 핵심 변수입니다.'],
                watch_points: ['첫 득점 직후 불펜 반응을 확인할 필요가 있습니다.'],
                uncertainty: ['라인업 미발표라 타순 기반 세부 매치업은 경기 직전까지 달라질 수 있습니다.'],
            },
            detailed_markdown: '## 코치 판단\n- SSG 랜더스가 최근 흐름과 득점 연결력에서 앞섭니다.',
            coach_note: '한화 이글스는 초반 득점 기회를 만드는 힘을 보강해야 합니다.',
        },
    };

    const analysisData = getAnalysisData({
        result,
        isPastGame: false,
        isFutureGame: true,
        gameStatusBucket: 'SCHEDULED',
    });

    assert.ok(analysisData);
    assert.equal(analysisData.risks.length, 2);
    assert.deepEqual(analysisData.risks[0], {
        area: 'overall',
        level: 1,
        description: '한화 이글스는 득점 연결력 열세로 초반 득점 기회를 만드는 힘을 보강해야 합니다.',
    });
    assert.deepEqual(analysisData.risks[1], {
        area: 'lineup',
        level: 1,
        description: '라인업 미발표라 타순 기반 세부 매치업은 경기 직전까지 달라질 수 있습니다.',
    });
});

test('getAnalysisData는 오류 응답에서 분석 본문을 만들지 않는다', () => {
    const result: CoachAnalyzeResponse = {
        error: 'AI 코치 분석 요청 데이터가 너무 큽니다.',
        answer: '### 이전 응답\n오류와 함께 표시되면 안 되는 분석 본문',
        data_quality: 'partial',
    };

    const analysisData = getAnalysisData({
        result,
        isPastGame: false,
        isFutureGame: false,
        gameStatusBucket: 'SCHEDULED',
    });

    assert.equal(analysisData, null);
});
