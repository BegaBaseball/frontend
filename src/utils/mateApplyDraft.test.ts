import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearMateApplyDraft,
  getMateApplyDraftStorageKey,
  loadMateApplyDraft,
  saveMateApplyDraft,
} from './mateApplyDraft';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

test('MateApply draft는 partyId별로 저장하고 복원한다', () => {
  const sessionStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { sessionStorage: typeof sessionStorage } }).window = {
    sessionStorage,
  } as unknown as Window & { sessionStorage: typeof sessionStorage };

  saveMateApplyDraft('77', {
    message: '함께 응원하고 싶습니다!',
    ticketVerified: true,
    ticketInfo: {
      date: '2026-05-20',
      time: '18:30:00',
      stadium: '잠실야구장',
      homeTeam: 'LG',
      awayTeam: 'KT',
      section: '1루석',
      row: '12',
      seat: '15',
      peopleCount: 2,
      price: 22000,
      reservationNumber: 'R-123456',
      gameId: 1001,
      verificationToken: 'verification-token',
    },
  });

  assert.deepEqual(loadMateApplyDraft('77'), {
    partyId: '77',
    message: '함께 응원하고 싶습니다!',
    ticketVerified: true,
    ticketInfo: {
      date: '2026-05-20',
      time: '18:30:00',
      stadium: '잠실야구장',
      homeTeam: 'LG',
      awayTeam: 'KT',
      section: '1루석',
      row: '12',
      seat: '15',
      peopleCount: 2,
      price: 22000,
      reservationNumber: 'R-123456',
      gameId: 1001,
      verificationToken: 'verification-token',
    },
    updatedAt: loadMateApplyDraft('77')?.updatedAt ?? '',
  });
  assert.equal(loadMateApplyDraft('88'), null);
});

test('MateApply draft는 내용이 비면 해당 partyId key를 정리한다', () => {
  const sessionStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { sessionStorage: typeof sessionStorage } }).window = {
    sessionStorage,
  } as unknown as Window & { sessionStorage: typeof sessionStorage };

  saveMateApplyDraft('91', {
    message: '초안 메시지',
    ticketVerified: false,
    ticketInfo: null,
  });

  assert.equal(typeof sessionStorage.getItem(getMateApplyDraftStorageKey('91')), 'string');

  saveMateApplyDraft('91', {
    message: '',
    ticketVerified: false,
    ticketInfo: null,
  });

  assert.equal(loadMateApplyDraft('91'), null);
});

test('MateApply draft는 잘못된 JSON이나 명시적 삭제를 안전하게 처리한다', () => {
  const sessionStorage = createStorage();
  (globalThis as typeof globalThis & { window?: Window & { sessionStorage: typeof sessionStorage } }).window = {
    sessionStorage,
  } as unknown as Window & { sessionStorage: typeof sessionStorage };

  sessionStorage.setItem(getMateApplyDraftStorageKey('55'), '{broken');
  assert.equal(loadMateApplyDraft('55'), null);

  saveMateApplyDraft('55', {
    message: '다시 저장',
    ticketVerified: false,
    ticketInfo: null,
  });
  clearMateApplyDraft('55');

  assert.equal(loadMateApplyDraft('55'), null);
});
