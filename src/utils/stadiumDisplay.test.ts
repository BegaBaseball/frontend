import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatStadiumDisplayName,
  getStadiumDisplayName,
  resolveStadiumDisplayConfig,
  STADIUM_DISPLAY_CONFIGS,
} from './stadiumDisplay';

test('getStadiumDisplayName: stadiumId 기준 canonical 표시명을 반환한다', () => {
  assert.equal(getStadiumDisplayName({ stadiumId: 'JAMSIL', stadiumName: '잠실야구장' }), '서울 · 잠실야구장');
  assert.equal(getStadiumDisplayName({ stadiumId: 'GOCHEOK', stadiumName: '고척 스카이돔' }), '서울 · 고척스카이돔');
  assert.equal(getStadiumDisplayName({ stadiumId: 'INCHEON', stadiumName: '인천 SSG 랜더스필드' }), '인천 · SSG랜더스필드');
  assert.equal(getStadiumDisplayName({ stadiumId: 'SUWON', stadiumName: '수원 kt wiz 파크' }), '수원 · KT위즈파크');
  assert.equal(getStadiumDisplayName({ stadiumId: 'DAEJEON', stadiumName: '대전 한화생명볼파크' }), '대전 · 한화생명볼파크');
  assert.equal(getStadiumDisplayName({ stadiumId: 'GWANGJU', stadiumName: '광주-KIA 챔피언스필드' }), '광주 · KIA 챔피언스필드');
  assert.equal(getStadiumDisplayName({ stadiumId: 'DAEGU', stadiumName: '대구 삼성 라이온즈파크' }), '대구 · 삼성 라이온즈파크');
  assert.equal(getStadiumDisplayName({ stadiumId: 'CHANGWON', stadiumName: '창원 NC 파크' }), '창원 · NC파크');
  assert.equal(getStadiumDisplayName({ stadiumId: 'SAJIK', stadiumName: '부산 사직야구장' }), '부산 · 사직야구장');
});

test('getStadiumDisplayName: 알 수 없는 구장은 API 이름을 그대로 유지한다', () => {
  assert.equal(getStadiumDisplayName({ stadiumId: 'UNKNOWN', stadiumName: '테스트구장' }), '테스트구장');
  assert.equal(getStadiumDisplayName(null), '');
});

test('resolveStadiumDisplayConfig: 기존 alias 입력을 canonical 구장으로 해석한다', () => {
  assert.equal(resolveStadiumDisplayConfig('서울잠실야구장')?.stadiumId, 'JAMSIL');
  assert.equal(resolveStadiumDisplayConfig('인천 SSG 랜더스필드')?.stadiumId, 'INCHEON');
  assert.equal(resolveStadiumDisplayConfig('수원 kt wiz 파크')?.displayName, STADIUM_DISPLAY_CONFIGS.SUWON.displayName);
  assert.equal(resolveStadiumDisplayConfig('광주-기아 챔피언스 필드')?.displayName, STADIUM_DISPLAY_CONFIGS.GWANGJU.displayName);
  assert.equal(resolveStadiumDisplayConfig('창원 NC 파크')?.displayName, STADIUM_DISPLAY_CONFIGS.CHANGWON.displayName);
  assert.equal(resolveStadiumDisplayConfig('부산 사직야구장')?.displayName, STADIUM_DISPLAY_CONFIGS.SAJIK.displayName);
});

test('formatStadiumDisplayName: string alias를 canonical 표시명으로 변환한다', () => {
  assert.equal(formatStadiumDisplayName('잠실야구장'), '서울 · 잠실야구장');
  assert.equal(formatStadiumDisplayName('고척스카이돔'), '서울 · 고척스카이돔');
  assert.equal(formatStadiumDisplayName('대전 한화생명볼파크'), '대전 · 한화생명볼파크');
  assert.equal(formatStadiumDisplayName('창원'), '창원 · NC파크');
});

test('formatStadiumDisplayName: 알 수 없거나 애매한 값은 원문을 유지한다', () => {
  assert.equal(formatStadiumDisplayName('테스트구장'), '테스트구장');
  assert.equal(formatStadiumDisplayName('서울'), '서울');
  assert.equal(formatStadiumDisplayName(null), '');
});
