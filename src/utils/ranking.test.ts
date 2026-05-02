import assert from 'node:assert/strict';
import test from 'node:test';

import { extractTeamIds, restoreTeamsFromIds } from './ranking';
import type { Team } from '../types/ranking';

const allTeams: Team[] = [
  { id: 'samsung', name: '삼성 라이온즈', shortName: '삼성', color: '#074CA1' },
  { id: 'lg', name: 'LG 트윈스', shortName: 'LG', color: '#C30452' },
  { id: 'doosan', name: '두산 베어스', shortName: '두산', color: '#131230' },
  { id: 'kia', name: '기아 타이거즈', shortName: '기아', color: '#EA0029' },
];

test('extractTeamIds는 ranking payload를 canonical team code로 변환한다', () => {
  const result = extractTeamIds([
    allTeams[0],
    allTeams[1],
    allTeams[2],
    allTeams[3],
  ]);

  assert.deepEqual(result, ['SS', 'LG', 'DB', 'KIA']);
});

test('restoreTeamsFromIds는 canonical team code도 기존 팀 객체로 복원한다', () => {
  const restored = restoreTeamsFromIds(['SS', 'KIA', 'LG'], allTeams);

  assert.equal(restored[0]?.id, 'samsung');
  assert.equal(restored[1]?.id, 'kia');
  assert.equal(restored[2]?.id, 'lg');
});
