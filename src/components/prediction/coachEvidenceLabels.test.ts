import assert from 'node:assert/strict';
import test from 'node:test';

import {
    EVIDENCE_SOURCE_LABELS,
    getEvidenceSourceGroups,
    evidenceSourceLabel,
    resolveCoachEvidenceCount,
} from './coachEvidenceLabels';

test('evidence source labels map known codes to Korean labels', () => {
    assert.equal(evidenceSourceLabel('home_pitcher'), '홈 선발');
    assert.equal(evidenceSourceLabel('away_lineup'), '원정 라인업');
    assert.equal(evidenceSourceLabel('game_summary'), '경기 요약');
});

test('evidence source labels fall back to readable fallback for unknown sources', () => {
    assert.equal(evidenceSourceLabel('something_new'), 'Something New');
    assert.equal(evidenceSourceLabel(''), '');
});

test('evidence source label map covers the documented backend codes', () => {
    for (const code of [
        'home_pitcher',
        'away_pitcher',
        'home_lineup',
        'away_lineup',
        'game',
        'kbo_seasons',
        'game_summary',
        'game_metadata',
        'series_context',
        'player_form_signals',
        'head_to_head',
        'matchup_history',
        'game_clutch_moments',
        'team_summary',
        'team_advanced_metrics',
        'team_player_form_signals',
        'team_recent_form',
        'opponent_team_summary',
        'opponent_team_advanced_metrics',
        'opponent_player_form_signals',
        'opponent_recent_form',
        'series_history',
    ]) {
        assert.ok(EVIDENCE_SOURCE_LABELS[code], `missing label for ${code}`);
    }
});

test('grouped evidence sources dedupe and sort by predefined order', () => {
    const grouped = getEvidenceSourceGroups([
        'home_lineup',
        'home_lineup',
        'away_lineup',
        'game_summary',
        'team_summary',
        'game',
    ]);

    assert.equal(grouped[0].title, '경기 데이터');
    assert.equal(grouped[1].title, '선수 구성');
    assert.equal(grouped[2].title, '팀 전력');

    const totalItems = grouped.reduce((acc, current) => acc + current.items.length, 0);
    assert.equal(totalItems, 5);
    assert.ok(new Set(grouped.flatMap((group) => group.items.map((item) => item.code))).size === 5);
});

test('coach evidence count prefers supported fact count and falls back to unique evidence sources', () => {
    assert.equal(resolveCoachEvidenceCount({
        supportedFactCount: 14,
        usedEvidence: ['game', 'game_summary'],
    }), 14);
    assert.equal(resolveCoachEvidenceCount({
        supportedFactCount: 0,
        usedEvidence: ['game', 'game', 'game_summary', '', 'team_recent_form'],
    }), 3);
    assert.equal(resolveCoachEvidenceCount({
        usedEvidence: undefined,
    }), 0);
});
