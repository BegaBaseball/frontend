import assert from 'node:assert/strict';
import test from 'node:test';

import { extractPopularCheerTags } from './cheerCommunityPulse';

test('인기 피드 태그는 게시글별 중복을 제거하고 실제 등장 횟수로 정렬한다', () => {
  const tags = extractPopularCheerTags([
    { content: '#직관인증 오늘도 #승리요정 #직관인증' },
    { content: '#승리요정 함께 #끝내기' },
    { content: '#승리요정 #직관인증' },
  ]);

  assert.deepEqual(tags, [
    { tag: '승리요정', count: 3 },
    { tag: '직관인증', count: 2 },
    { tag: '끝내기', count: 1 },
  ]);
});

test('인기 피드 태그는 해시태그가 없으면 빈 배열을 반환하고 개수 제한을 지킨다', () => {
  assert.deepEqual(extractPopularCheerTags([{ content: '해시태그 없는 글' }]), []);
  assert.equal(extractPopularCheerTags([{ content: '#하나 #둘 #셋' }], 2).length, 2);
});
