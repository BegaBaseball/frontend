import assert from 'node:assert/strict';
import test from 'node:test';

import {
    riskImpactTo,
    riskInning,
    riskSevColor,
    shortTeamName,
} from './coachRiskHelpers';

test('coach risk helpers map levels to inning windows and severity colors', () => {
    assert.equal(riskInning(0), '1~5회');
    assert.equal(riskInning(1), '5~7회');
    assert.equal(riskInning(2), '7~9회');
    assert.equal(riskSevColor(0), '#dc2626');
    assert.equal(riskSevColor(1), '#d97706');
    assert.equal(riskSevColor(2), '#059669');
});

test('coach risk helpers resolve impact direction from sentiment and level', () => {
    assert.equal(riskImpactTo(0, true), 'away');
    assert.equal(riskImpactTo(0, false), 'home');
    assert.equal(riskImpactTo(1, true), 'both');
    assert.equal(riskImpactTo(2, false), 'both');
});

test('coach risk helpers shorten known team ids', () => {
    assert.equal(shortTeamName('ssg'), 'SSG');
    assert.equal(shortTeamName('kt'), 'KT');
    assert.equal(shortTeamName('unknown'), 'UNKNOWN');
});
