import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSeatMapGeometry,
  resolveStadiumLayout,
  resolveStadiumSeatMapPreset,
  resolveStadiumSeatMapPresetMeta,
} from './stadiumSeatMapModel';
import { KBO_STADIUMS } from '../../utils/stadiumData';

const homeSideCases = [
  { stadiumId: 'JAMSIL', stadiumName: '잠실야구장', expectedSide: 'left', expectedLabel: '잠실 블록 단위 안내도' },
  { stadiumId: 'INCHEON', stadiumName: '인천SSG랜더스필드', expectedSide: 'right', expectedLabel: '랜더스필드형 안내도 (개략)' },
  { stadiumId: 'DAEGU', stadiumName: '대구삼성라이온즈파크', expectedSide: 'left', expectedLabel: '라이온즈파크형 안내도 (개략)' },
  { stadiumId: 'GWANGJU', stadiumName: '광주기아챔피언스필드', expectedSide: 'left', expectedLabel: '챔피언스필드형 안내도 (개략)' },
  { stadiumId: 'SUWON', stadiumName: '수원KT위즈파크', expectedSide: 'right', expectedLabel: '위즈파크형 안내도 (개략)' },
  { stadiumId: 'KTWIZ', stadiumName: '수원 kt wiz 파크', expectedSide: 'right', expectedLabel: '위즈파크형 안내도 (개략)' },
  { stadiumId: 'CHANGWON', stadiumName: '창원NC파크', expectedSide: 'right', expectedLabel: 'NC파크형 안내도 (개략)' },
];

function sectionById(stadiumId: string, stadiumName: string, sectionId: string) {
  const preset = resolveStadiumSeatMapPreset(stadiumId, stadiumName);
  const geometry = createSeatMapGeometry(preset);
  const section = geometry.sections.find((candidate) => candidate.id === sectionId);

  assert.ok(section, `${sectionId} section should exist`);
  return section;
}

test('구장별 홈 응원석 방향은 내부 좌석 데이터 기준을 따른다', () => {
  homeSideCases.forEach(({ stadiumId, stadiumName, expectedSide, expectedLabel }) => {
    const meta = resolveStadiumSeatMapPresetMeta(stadiumId, stadiumName);
    const section = sectionById(stadiumId, stadiumName, 'home-cheering');
    const actualSide = section.labelX > 400 ? 'right' : 'left';

    assert.equal(meta.label, expectedLabel);
    assert.equal(actualSide, expectedSide, `${stadiumName} home cheering side`);
  });
});

test('구장별 시야 사진 alias는 실제 좌석명과 블록 키워드를 포함한다', () => {
  const incheonHome = sectionById('INCHEON', '인천SSG랜더스필드', 'home-cheering');
  const daeguHome = sectionById('DAEGU', '대구삼성라이온즈파크', 'home-cheering');
  const gwangjuHome = sectionById('GWANGJU', '광주기아챔피언스필드', 'home-cheering');
  const changwonHome = sectionById('CHANGWON', '창원NC파크', 'home-cheering');
  const incheonAway = sectionById('INCHEON', '인천SSG랜더스필드', 'away-cheering');
  const daeguAway = sectionById('DAEGU', '대구삼성라이온즈파크', 'away-cheering');
  const gwangjuAway = sectionById('GWANGJU', '광주기아챔피언스필드', 'away-cheering');

  assert.ok(incheonHome.seatViewSections.includes('으쓱이존'));
  assert.ok(daeguHome.seatViewSections.includes('블루존'));
  assert.ok(gwangjuHome.seatViewSections.includes('K7석'));
  assert.ok(changwonHome.seatViewSections.includes('105'));
  assert.ok(changwonHome.seatViewSections.includes('108'));
  assert.ok(incheonAway.seatViewSections.includes('3루 원정'));
  assert.ok(daeguAway.seatViewSections.includes('1루 원정'));
  assert.ok(gwangjuAway.seatViewSections.includes('1루 원정'));
});

test('창원 NC파크 preset은 운영 DB와 UI 별칭을 모두 매칭한다', () => {
  const canonical = resolveStadiumSeatMapPresetMeta('CHANGWON', '창원NC파크');
  const ncPark = resolveStadiumSeatMapPresetMeta('NCPARK', '창원 NC 파크');
  const dinos = resolveStadiumSeatMapPresetMeta('NC', 'NC 다이노스');
  const changwon = resolveStadiumSeatMapPresetMeta('창원', '');
  const compactName = resolveStadiumSeatMapPresetMeta('', '창원NC파크');
  const dinosKorean = resolveStadiumSeatMapPresetMeta('다이노스', '');

  assert.equal(canonical.id, 'changwon');
  assert.equal(ncPark.id, 'changwon');
  assert.equal(dinos.id, 'changwon');
  assert.equal(changwon.id, 'changwon');
  assert.equal(compactName.id, 'changwon');
  assert.equal(dinosKorean.id, 'changwon');
  assert.equal(ncPark.label, 'NC파크형 안내도 (개략)');
  assert.equal(canonical.isFallback, true);
});

test('사직 preset은 운영 DB와 롯데/부산 별칭을 모두 매칭한다', () => {
  const canonical = resolveStadiumSeatMapPresetMeta('SAJIK', '사직야구장');
  const busan = resolveStadiumSeatMapPresetMeta('BUSAN', '부산 사직야구장');
  const lotte = resolveStadiumSeatMapPresetMeta('LOTTE', '롯데 자이언츠');

  assert.equal(canonical.id, 'sajik');
  assert.equal(busan.id, 'sajik');
  assert.equal(lotte.id, 'sajik');
  assert.equal(canonical.label, '사직형 안내도 (개략)');
});

test('잠실 좌석도는 계산식 프리셋 대신 path 기반 layout 데이터를 사용한다', () => {
  const layout = resolveStadiumLayout('JAMSIL', '잠실야구장');
  const premium = layout.sections.find((section) => section.id === 'jamsil-premium-center');
  const orange = layout.sections.find((section) => section.id === 'jamsil-home-cheering');
  const away = layout.sections.find((section) => section.id === 'jamsil-away-cheering');
  const red = layout.sections.find((section) => section.id === 'jamsil-red-third');
  const blue = layout.sections.find((section) => section.id === 'jamsil-blue-third');
  const outfield = layout.sections.find((section) => section.id === 'jamsil-outfield-left');
  const exciting = layout.sections.find((section) => section.id === 'jamsil-exciting-third');

  assert.equal(layout.id, 'jamsil');
  assert.equal(layout.isFallback, false);
  assert.equal(layout.label, '잠실 블록 단위 안내도');
  assert.ok(layout.sections.length > 8);
  assert.equal(premium?.viewKey, 'jamsil-premium-home-plate');
  assert.equal(orange?.category, 'CHEERING');
  assert.equal(orange?.side, 'THIRD_BASE');
  assert.equal(orange?.fanRole, 'HOME');
  assert.equal(away?.side, 'FIRST_BASE');
  assert.equal(away?.fanRole, 'AWAY');
  assert.equal(red?.labelMode, 'always');
  assert.equal(blue?.labelMode, 'always');
  assert.ok((outfield?.labelX ?? 0) < (red?.labelX ?? 0));
  assert.equal(exciting?.labelMode, 'activeOnly');
  assert.equal(premium?.hitPath, premium?.d);
  assert.ok(layout.notice.includes('fallback'));
});

test('대구 좌석도 공통 모델은 전용 공식 이미지 컴포넌트 로딩 전 fallback으로 유지된다', () => {
  const layout = resolveStadiumLayout('DAEGU', '대구삼성라이온즈파크');

  assert.equal(layout.id, 'daegu');
  assert.equal(layout.isFallback, true);
  assert.equal(layout.label, '라이온즈파크형 안내도 (개략)');
});

test('구장 설정 데이터 기준 모든 구장 선택이 좌석도 매핑에 일관된다', () => {
  const entries = Object.values(KBO_STADIUMS);

  assert.ok(entries.length > 0);

  entries.forEach((stadium) => {
    const metaById = resolveStadiumSeatMapPresetMeta(stadium.id, '');
    const metaByName = resolveStadiumSeatMapPresetMeta('', stadium.name);
    const metaByBoth = resolveStadiumSeatMapPresetMeta(stadium.id, stadium.name);
    const layoutByBoth = resolveStadiumLayout(stadium.id, stadium.name);

    assert.equal(metaById.id, metaByBoth.id, `${stadium.name} ID/병합 입력 매핑 불일치`);
    assert.equal(metaByName.id, metaByBoth.id, `${stadium.name} 이름/병합 입력 매핑 불일치`);
    assert.notEqual(metaByBoth.id, 'default', `${stadium.name} 좌석도 기본값 매핑`);
    assert.equal(metaByBoth.id, layoutByBoth.presetId, `${stadium.name} 프리셋 메타와 레이아웃 매핑 불일치`);
    assert.ok(metaByBoth.label.includes('안내도'), `${stadium.name} 좌석도 라벨 누락`);
    assert.ok(layoutByBoth.sections.length > 0, `${stadium.name} 좌석도 섹션 없음`);
  });
});
