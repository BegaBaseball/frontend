import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialPartyFormData,
  isMateCreateDraftEmpty,
  readMateCreateDraft,
  serializeMateCreateDraft,
} from './mateCreateDraft';

test('mate create draft는 기존 zustand persist 구조를 복원한다', () => {
  const restored = readMateCreateDraft(JSON.stringify({
    state: {
      createStep: 4,
      formData: {
        gameDate: '2026-05-20',
        gameTime: '18:30',
        homeTeam: 'lg',
        awayTeam: 'kt',
        stadium: '잠실야구장',
        section: '',
        cheeringSide: 'HOME',
        seatCategory: '일반/시야',
        seatDetail: '305블록 12열 15번',
        maxParticipants: 2,
        ticketPrice: 22000,
        description: '세션 만료 후에도 이어서 작성할 소개글입니다.',
        reservationNumber: 'R-123456',
        ticketFile: null,
      },
    },
    version: 0,
  }));

  assert.equal(restored.createStep, 4);
  assert.equal(restored.formData.description, '세션 만료 후에도 이어서 작성할 소개글입니다.');
  assert.equal(restored.formData.ticketFile, null);
  assert.equal(restored.formData.cheeringSide, 'HOME');
});

test('mate create draft serialize 결과는 ticketFile 없이 저장된다', () => {
  const serialized = serializeMateCreateDraft(3, {
    ...createInitialPartyFormData(),
    gameDate: '2026-05-20',
    ticketFile: new File(['ticket'], 'ticket.png', { type: 'image/png' }),
  });
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.state.createStep, 3);
  assert.equal(parsed.state.formData.ticketFile, null);
  assert.equal(parsed.state.formData.gameDate, '2026-05-20');
});

test('mate create draft empty 판별은 초기값에서만 true를 반환한다', () => {
  const initial = createInitialPartyFormData();

  assert.equal(isMateCreateDraftEmpty(1, initial), true);
  assert.equal(
    isMateCreateDraftEmpty(4, initial),
    false,
  );
  assert.equal(
    isMateCreateDraftEmpty(1, {
      ...initial,
      description: '초안',
    }),
    false,
  );
});
