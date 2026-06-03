import assert from 'node:assert/strict';
import test from 'node:test';

import { EVIDENCE_SOURCE_LABELS, evidenceSourceLabel } from './coachEvidenceLabels';

test('evidence source labels map known codes to Korean labels', () => {
    assert.equal(evidenceSourceLabel('home_pitcher'), '홈 선발');
    assert.equal(evidenceSourceLabel('away_lineup'), '원정 라인업');
    assert.equal(evidenceSourceLabel('game_summary'), '경기 요약');
});

test('evidence source labels fall back to the raw code for unknown sources', () => {
    assert.equal(evidenceSourceLabel('something_new'), 'something_new');
    assert.equal(evidenceSourceLabel(''), '');
});

test('evidence source label map covers the documented backend codes', () => {
    for (const code of [
        'home_pitcher',
        'away_pitcher',
        'home_lineup',
        'away_lineup',
        'game_summary',
        'game_metadata',
        'series_context',
        'player_form_signals',
        'matchup_history',
        'clutch_moments',
    ]) {
        assert.ok(EVIDENCE_SOURCE_LABELS[code], `missing label for ${code}`);
    }
});
