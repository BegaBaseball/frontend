import assert from 'node:assert/strict';
import test from 'node:test';

import { getMovementSummary } from './offseasonListUtils';
import type { OffseasonMovement } from './offseasonListTypes';

const createMovement = (overrides: Partial<OffseasonMovement> = {}): OffseasonMovement => ({
    id: 1,
    date: '2026-03-01',
    section: 'FA',
    team: 'LG',
    player: '홍길동',
    summary: null,
    remarks: '',
    isBigEvent: false,
    estimatedAmount: 0,
    ...overrides,
});

test('요약이 있으면 공백을 정리한 뒤 우선 노출한다', () => {
    const movement = createMovement({
        summary: '  4년 총액 50억에 잔류  ',
        remarks: '비고 텍스트',
    });

    assert.equal(getMovementSummary(movement), '4년 총액 50억에 잔류');
});

test('요약이 없으면 remarks를 대체 문구로 사용한다', () => {
    const movement = createMovement({
        summary: '   ',
        remarks: '  보장 20억, 옵션 5억  ',
    });

    assert.equal(getMovementSummary(movement), '보장 20억, 옵션 5억');
});

test('요약과 remarks가 모두 비면 empty-state 문구를 반환한다', () => {
    const movement = createMovement({
        summary: null,
        remarks: '   ',
    });

    assert.equal(getMovementSummary(movement), '세부 내용이 아직 등록되지 않았습니다.');
});
