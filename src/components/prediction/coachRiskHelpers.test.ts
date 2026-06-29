import assert from 'node:assert/strict';
import test from 'node:test';

import {
    riskImpactTo,
    riskInning,
    riskSevColor,
    resolveRiskImpactText,
    resolveRiskImpactTo,
    resolveRiskAreaLabel,
    resolveRiskInningLabel,
    resolveRiskInningPosition,
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

test('coach risk helpers map structured risk areas to reader-facing Korean labels', () => {
    assert.equal(resolveRiskAreaLabel('overall'), '종합 리스크');
    assert.equal(resolveRiskAreaLabel('lineup'), '라인업 변수');
    assert.equal(resolveRiskAreaLabel('offense'), '득점 연결');
    assert.equal(resolveRiskAreaLabel('bullpen'), '불펜 운영');
    assert.equal(resolveRiskAreaLabel('form'), '최근 흐름');
    assert.equal(resolveRiskAreaLabel('선발 매치업'), '선발 매치업');
});

test('coach risk helpers prefer structured inning and impact fields when present', () => {
    const structuredRisk = {
        area: '불펜 운영',
        level: 1 as const,
        description: '7회 이후 운영 변수',
        inning_label: '7~8회',
        inning_start: 7,
        inning_end: 8,
        impact: '-4%p',
        impact_to: 'away' as const,
    };

    assert.equal(resolveRiskInningLabel(structuredRisk), '7~8회');
    assert.equal(resolveRiskInningPosition(structuredRisk, 5), 7.5);
    assert.equal(resolveRiskImpactTo(structuredRisk, true), 'away');
    assert.equal(resolveRiskImpactText(structuredRisk, true), '-4%p');
});

test('coach risk helpers keep level-based fallback for legacy risks', () => {
    const legacyRisk = {
        area: '선발 매치업',
        level: 0 as const,
        description: '선발 변수',
    };

    assert.equal(resolveRiskInningLabel(legacyRisk), '1~5회');
    assert.equal(resolveRiskInningPosition(legacyRisk, 2), 2);
    assert.equal(resolveRiskImpactTo(legacyRisk, true), 'away');
    assert.equal(resolveRiskImpactText(legacyRisk, true), '−낮음');
});
