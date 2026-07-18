import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { KBO_STADIUMS } from '../utils/stadiumData';
import {
  resolveStadiumSeatMapEntry,
  STADIUM_SEAT_MAP_ENTRIES,
} from './stadiumSeatMapRegistry';
import { DAEGU_CANONICAL_BLOCKS } from '../data/daeguCanonicalSeatMap';
import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_HIT_TEST_PROBES,
} from '../data/suwonSeatData';
import {
  filterAndRankDaeguSeatMapBlocks,
  rankDaeguSeatMapSearchResult,
} from './daegu/daeguSeatMapSearch';
import {
  OPERATIONAL_STADIUM_SEAT_MAP_ENTRIES,
  STADIUM_SEATMAP_CONTRACTS,
  STADIUM_TEAM_FALLBACK_CASES,
  diffSet,
  formatProbeDiffByBlock,
  projectRoot,
  probeKey,
  readImageDimensions,
  readProjectFile,
  snapshotSuwonProbeKeySets,
  snapshotSuwonSeatFixture,
  splitProbeKeysByBlock,
  suwonFixtureSignature,
  uniqueSorted,
} from './StadiumGuideRuntimeSeatMaps.support';

test('구장 설정 데이터의 전용 좌석도 preset은 파일 계약과 일치한다', () => {
  const configuredPresetIds = Object.values(KBO_STADIUMS)
    .map((stadium) => {
      const entry = resolveStadiumSeatMapEntry(stadium.id, stadium.name);
      assert.ok(entry, `${stadium.name} should resolve to an official seat map entry`);
      return entry.id;
    });
  const contractPresetIds = STADIUM_SEATMAP_CONTRACTS.map((contract) => contract.presetId);

  assert.deepEqual(uniqueSorted(contractPresetIds), uniqueSorted(configuredPresetIds));
});

test('좌석도 registry는 전용 구장 컴포넌트와 공식 라벨을 한 곳에서 관리한다', () => {
  const registrySource = readProjectFile('src/components/stadiumSeatMapRegistry.tsx');
  const registryPresetIds = STADIUM_SEAT_MAP_ENTRIES.map((entry) => entry.id);

  assert.deepEqual(uniqueSorted(registryPresetIds), uniqueSorted(STADIUM_SEATMAP_CONTRACTS.map((contract) => contract.presetId)));

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const entry = STADIUM_SEAT_MAP_ENTRIES.find((candidate) => candidate.id === contract.presetId);

    assert.ok(entry, `${contract.presetId} registry entry should exist`);
    assert.equal(entry.folder, contract.folder);
    assert.equal(entry.componentName, contract.componentName);
    assert.equal(entry.badgeLabel, contract.badgeLabel);
    assert.match(
      registrySource,
      new RegExp(`import\\('\\./${contract.folder}/${contract.componentName}'\\)`),
      `${contract.componentName} should be lazy-loaded by registry`,
    );
  });
});
test('좌석도 registry는 등록되지 않은 구장에 fake fallback을 반환하지 않는다', () => {
  assert.equal(resolveStadiumSeatMapEntry('UNKNOWN', '테스트구장'), null);
  assert.equal(resolveStadiumSeatMapEntry(null, null), null);
});

test('좌석도 registry는 운영 DB와 UI 별칭을 모두 매칭한다', () => {
  assert.equal(resolveStadiumSeatMapEntry('NCPARK', '창원 NC 파크')?.id, 'changwon');
  assert.equal(resolveStadiumSeatMapEntry('NC', 'NC 다이노스')?.id, 'changwon');
  assert.equal(resolveStadiumSeatMapEntry('BUSAN', '부산 사직야구장')?.id, 'sajik');
  assert.equal(resolveStadiumSeatMapEntry('KTWIZ', '수원 kt wiz 파크')?.id, 'suwon');
  assert.equal(resolveStadiumSeatMapEntry('DAEGU', '대구 삼성 라이온즈파크')?.id, 'daegu');
  assert.equal(resolveStadiumSeatMapEntry('SS', '대구삼성라이온즈파크')?.id, 'daegu');
  assert.equal(resolveStadiumSeatMapEntry('SAMSUNG', '대구 삼성 라이온즈 파크')?.id, 'daegu');
  assert.equal(resolveStadiumSeatMapEntry('SS', '라팍')?.id, 'daegu');
  assert.equal(resolveStadiumSeatMapEntry('SS', '삼성')?.id, 'daegu');
  assert.equal(resolveStadiumSeatMapEntry('SS', '라이온즈')?.id, 'daegu');
  assert.equal(resolveStadiumSeatMapEntry('DAEJEON', '대전 한화생명볼파크')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('HANWHA', '한화생명 이글스파크')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('HH', '이글스파크')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('HH', '한화')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('ssg', '인천SSG랜더스필드')?.id, 'incheon');
  assert.equal(resolveStadiumSeatMapEntry('kt wiz', '수원 kt wiz 파크')?.id, 'suwon');
  assert.equal(resolveStadiumSeatMapEntry('한화', '한화생명')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('lg', '서울잠실야구장')?.id, 'jamsil');
});

test('좌석도 registry는 팀명 기반 폴백으로도 매칭된다', () => {
  assert.equal(resolveStadiumSeatMapEntry('UNKNOWN', '없는구장', 'KT 위즈')?.id, 'suwon');
  assert.equal(resolveStadiumSeatMapEntry(null, null, '키움')?.id, 'gocheok');
  assert.equal(resolveStadiumSeatMapEntry('??', null, 'NC 다이노스')?.id, 'changwon');
  STADIUM_TEAM_FALLBACK_CASES.forEach((caseItem) => {
    const { stadiumId, stadiumName, stadiumTeam, expectedPresetId } = caseItem;
    const entry = resolveStadiumSeatMapEntry(stadiumId, stadiumName, stadiumTeam);
    assert.equal(entry?.id, expectedPresetId);
  });
});

test('운영 구장 샘플(9개)은 팀 변형 표기까지 포함해 매칭이 유지된다', () => {
  OPERATIONAL_STADIUM_SEAT_MAP_ENTRIES.forEach((stadium) => {
    const entry = resolveStadiumSeatMapEntry(stadium.stadiumId, stadium.stadiumName, stadium.stadiumTeam);
    assert.equal(entry?.id, stadium.expectedPresetId, `${stadium.stadiumName} should map to ${stadium.expectedPresetId}`);
  });
});

test('좌석도 registry는 stadiumDisplay 표기 기반 정체성으로도 복구 매칭한다', () => {
  assert.equal(resolveStadiumSeatMapEntry('Jamsil', '잠실야구장')?.id, 'jamsil');
  assert.equal(resolveStadiumSeatMapEntry('고척', '고척스카이돔')?.id, 'gocheok');
  assert.equal(resolveStadiumSeatMapEntry('KT WIZ', '수원')?.id, 'suwon');
  assert.equal(resolveStadiumSeatMapEntry('광주KIA', '광주-KIA 챔피언스필드')?.id, 'gwangju');
});

test('대구 좌석도는 canonical 표시명, alias, 검색 랭킹, 상세 메타 계약을 제공한다', () => {
  const registryEntry = STADIUM_SEAT_MAP_ENTRIES.find((entry) => entry.id === 'daegu');
  const registrySource = readProjectFile('src/components/stadiumSeatMapRegistry.tsx');
  const daeguSource = readProjectFile('src/components/daegu/DaeguSeatMap.tsx');
  const daeguSvgSource = readProjectFile('src/components/daegu/DaeguSeatMapSvg.tsx');
  const cypressSource = readProjectFile('cypress/e2e/stadium-seatmap-shared.cy.ts');

  assert.ok(registryEntry, 'Daegu registry entry should exist');
  assert.equal(registryEntry.label, '대구 삼성 라이온즈파크 공식 좌석도');
  assert.equal(registryEntry.badgeLabel, '대구 삼성 라이온즈파크 공식 좌석도');
  ['라팍', '라이온즈파크', '삼성라이온즈파크', '대구삼성라이온즈파크', '대구 삼성 라이온즈파크', '대구 삼성 라이온즈 파크'].forEach((matcher) => {
    assert.ok(registryEntry.matchers.includes(matcher), `Daegu matcher should include ${matcher}`);
    assert.ok(registrySource.includes(`'${matcher}'`), `Daegu registry source should keep ${matcher}`);
  });

  [
    'title="대구 삼성 라이온즈파크"',
    'fullscreenTitle="대구 삼성 라이온즈파크"',
    'function DaeguExtraMeta',
    'data-testid="daegu-section-finder-empty"',
    '검색어와 선택한 필터에 맞는 구역이 없습니다',
    '필터: {activeFilterLabel}',
    'data-testid="daegu-seatmap-extra-meta"',
    'data-testid="daegu-seatmap-canonical-decision-status"',
    'data-testid="daegu-seatmap-trace-status"',
    'data-testid="daegu-seatmap-trace-method"',
    'data-testid="daegu-seatmap-source-confidence"',
    'data-testid="daegu-seatmap-coordinate-source"',
    'data-testid="daegu-seatmap-accessibility-note"',
    'extraMeta={(section, accent) => <DaeguExtraMeta section={section} accent={accent} />}',
  ].forEach((token) => {
    assert.ok(daeguSource.includes(token), `Daegu source should include ${token}`);
  });

  assert.ok(daeguSvgSource.includes('aria-label="대구 삼성 라이온즈파크 canonical 좌석도 구역 선택"'));
  assert.ok(cypressSource.includes('대구 삼성 라이온즈파크'));
  assert.ok(cypressSource.includes('Stadium SeatMap — Daegu Search / Detail UX'));
});

test('대구 구역 찾기 검색 랭킹은 정확 블록과 alias 우선순위를 유지한다', () => {
  const rankedOneOne = filterAndRankDaeguSeatMapBlocks([...DAEGU_CANONICAL_BLOCKS], '1-1');
  const rankedS20 = filterAndRankDaeguSeatMapBlocks([...DAEGU_CANONICAL_BLOCKS], 'S20');
  const rankedBlue = filterAndRankDaeguSeatMapBlocks([...DAEGU_CANONICAL_BLOCKS], '블루존');
  const rankedRapak = filterAndRankDaeguSeatMapBlocks([...DAEGU_CANONICAL_BLOCKS], '라팍');

  assert.equal(rankedOneOne[0]?.block, '1-1');
  assert.equal(rankedS20[0]?.block, 'S-20');
  assert.equal(rankedBlue[0]?.category, 'BLUE');
  assert.ok(rankedRapak.length > 0, 'Daegu global alias should keep searchable canonical blocks');
  assert.equal(
    rankDaeguSeatMapSearchResult(rankedOneOne[0], '1-1')
      < rankDaeguSeatMapSearchResult(rankedOneOne.find((block) => block.block === '1-10')!, '1-1'),
    true,
    'exact block code should outrank partial block matches',
  );
});

test('대전 좌석도는 canonical registry, 구역 찾기, 공식 메타 상세 패널 계약을 제공한다', () => {
  const registryEntry = STADIUM_SEAT_MAP_ENTRIES.find((entry) => entry.id === 'daejeon');
  const registrySource = readProjectFile('src/components/stadiumSeatMapRegistry.tsx');
  const daejeonSource = readProjectFile('src/components/daejeon/DaejeonSeatMap.tsx');
  const daejeonSvgSource = readProjectFile('src/components/daejeon/DaejeonSeatMapSvg.tsx');
  const daejeonDataSource = readProjectFile('src/data/daejeonSeatData.ts');

  assert.ok(registryEntry, 'Daejeon registry entry should exist');
  assert.equal(registryEntry.label, '대전 한화생명볼파크 공식 좌석도');
  assert.equal(registryEntry.badgeLabel, '대전 한화생명볼파크 공식 좌석도');
  ['볼파크', '한화생명볼파크', '한화생명 이글스파크', '이글스파크'].forEach((matcher) => {
    assert.ok(registryEntry.matchers.includes(matcher), `Daejeon matcher should include ${matcher}`);
    assert.ok(registrySource.includes(`'${matcher}'`), `Daejeon registry source should keep ${matcher}`);
  });

  [
    'data-testid="daejeon-block-search"',
    'data-testid="daejeon-section-finder-empty"',
    'data-testid={`daejeon-section-finder-item-${block.id}`}',
    'data-block-code={block.blockCode}',
    'data-official-section={block.officialSectionName}',
    '검색어와 선택한 필터에 맞는 구역이 없습니다',
    '검색어: {searchTerm.trim()}',
  ].forEach((token) => {
    assert.ok(daejeonSource.includes(token), `Daejeon finder contract should include ${token}`);
  });

  [
    'function DaejeonExtraMeta',
    'data-testid="daejeon-seatmap-extra-meta"',
    'data-testid="daejeon-seatmap-coverage-status"',
    'data-testid="daejeon-seatmap-trace-status"',
    'data-testid="daejeon-seatmap-accessibility-note"',
    '<InfoTile label="공식 섹션"',
    '<InfoTile label="정확 블록"',
    '<InfoTile label="부모 구역"',
    '<InfoTile label="source confidence"',
    'extraMeta={(section, accent) => <DaejeonExtraMeta section={section} accent={accent} />}',
  ].forEach((token) => {
    assert.ok(daejeonSource.includes(token), `Daejeon detail metadata contract should include ${token}`);
  });

  [
    'data-testid="daejeon-seatmap-official-image"',
    'setImageLoaded(true);',
    'image.onerror = () => {',
    'pointerEvents="none"',
  ].forEach((token) => {
    assert.ok(daejeonSvgSource.includes(token), `Daejeon official image visibility contract should include ${token}`);
  });

  [
    "{ id: 'table', label: '테이블석'",
    "{ id: 'sky', label: '스카이박스'",
    '`대전 한화생명볼파크 ${name}`',
    '`한화생명 이글스파크 ${name}`',
    '`대전 한화생명 이글스파크 ${name}`',
    '`대전 한화생명볼파크 ${block}`',
    '`한화생명 이글스파크 ${block}`',
    '`대전 한화생명 이글스파크 ${block}`',
    '`이글스파크 ${block}`',
  ].forEach((token) => {
    assert.ok(daejeonDataSource.includes(token), `Daejeon data contract should include ${token}`);
  });
});

test('구장별 전용 좌석도 파일과 공식 asset은 런타임 계약에 맞게 존재한다', () => {
  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentBasePath = `src/components/${contract.folder}/${contract.componentName}`;
    [
      `${componentBasePath}.tsx`,
      `${componentBasePath}Svg.tsx`,
      'src/components/stadiumSeatMap/SeatMapBottomSheet.tsx',
      `src/data/${contract.dataFile}`,
      `src/data/${contract.dataFile.replace('.ts', '.test.ts')}`,
      ...contract.requiredFiles,
    ].forEach((relativePath) => {
      assert.ok(fs.existsSync(path.join(projectRoot, relativePath)), `${relativePath} should exist`);
    });
  });
});

test('인천 좌석도 WebP 파일은 기존 좌표계 크기를 유지한다', () => {
  const sourceWebp = 'src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp';
  const renderedWebp = 'src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp';
  const dataSource = readProjectFile('src/data/incheonSeatData.ts');
  const svgSource = readProjectFile('src/components/incheon/IncheonSeatMapSvg.tsx');

  assert.deepEqual(readImageDimensions(sourceWebp), { width: 3360, height: 5328 });
  assert.deepEqual(readImageDimensions(renderedWebp), { width: 3360, height: 5328 });
  assert.ok(dataSource.includes('3360'), 'Incheon data should preserve source image width');
  assert.ok(dataSource.includes('5328'), 'Incheon data should preserve source image height');
  assert.ok(svgSource.includes('incheon-ssg-seatmap-official-2026.webp'), 'runtime should render the optimized WebP asset');
});

test('수원 좌석도 계약은 draft PNG가 아니라 @2x 공식 WebP를 기준으로 유지한다', () => {
  const dataSource = readProjectFile('src/data/suwonSeatData.ts');
  const svgSource = readProjectFile('src/components/suwon/SuwonSeatMapSvg.tsx');

  assert.ok(dataSource.includes("imagePath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp'"), 'Suwon active image path should pin the @2x official WebP');
  assert.ok(dataSource.includes("requiredAssetPath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp'"), 'Suwon required asset path should pin the @2x official WebP');
  assert.ok(!dataSource.includes('draftAssetFileName'), 'Suwon draft PNG metadata should be removed');
  assert.ok(!svgSource.includes('.png'), 'Suwon SVG should not render PNG seatmap assets');
});

test('잠실 좌표 path QA는 registry의 template shell flag만으로 제외되지 않는다', () => {
  const entry = STADIUM_SEAT_MAP_ENTRIES.find((candidate) => candidate.id === 'jamsil');
  const dataSource = readProjectFile('src/data/jamsilSeatData.ts');
  const svgSource = readProjectFile('src/components/jamsil/JamsilSeatMapSvg.tsx');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(entry, 'Jamsil registry entry should exist');
  assert.equal(entry.usesCoordinateGeometry, false, 'Jamsil keeps the template-shell registry flag');
  assert.equal(entry.isNonCoordinateMap, true, 'Jamsil keeps the non-coordinate registry flag');
  assert.ok(dataSource.includes('imageGeometry'), 'Jamsil data should still carry image-space geometry');
  assert.ok(svgSource.includes('JAMSIL_BLOCKS'), 'Jamsil SVG should render from block geometry data');
  assert.ok(svgSource.includes('imageGeometry'), 'Jamsil SVG should use image-space geometry');
  assert.ok(auditSource.includes('verifyJamsilOverlayClicks'), 'Jamsil deep QA should keep coordinate click coverage');
  assert.ok(auditSource.includes('verifyJamsilFullOverlayClicks'), 'Jamsil full QA should keep coordinate click coverage');
});

test('잠실 좌석도 package alias는 responsive QA를 dispatcher 내부 task로만 노출한다', () => {
  const packageSource = readProjectFile('package.json');
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const jamsilOpsSource = readProjectFile('scripts/jamsil-seatmap-ops.mjs');
  const releaseLockSource = readProjectFile('docs/jamsil-seatmap-release-lock.md');

  [
    '"qa:stadium:jamsil:mobile": "node scripts/qa-presets.mjs stadium jamsil mobile"',
    '"qa:stadium:jamsil:full": "node scripts/qa-presets.mjs stadium jamsil full"',
    '"qa:stadium:jamsil:release-lock": "node scripts/qa-presets.mjs stadium jamsil release-gate"',
    '"stadium:jamsil:status": "node scripts/qa-presets.mjs stadium jamsil status"',
    '"stadium:jamsil:food-candidate-validate": "node scripts/qa-presets.mjs stadium jamsil food-candidate-validate"',
    '"stadium:jamsil:food-candidate-review-workset": "node scripts/qa-presets.mjs stadium jamsil food-candidate-review-workset"',
    '"stadium:jamsil:food-candidate-transfer": "node scripts/qa-presets.mjs stadium jamsil food-candidate-transfer"',
    '"stadium:jamsil:food-candidate-apply-plan": "node scripts/qa-presets.mjs stadium jamsil food-candidate-apply-plan"',
    '"stadium:jamsil:operator-intake": "node scripts/qa-presets.mjs stadium jamsil operator-intake"',
    '"stadium:jamsil:operator-validate": "node scripts/qa-presets.mjs stadium jamsil operator-validate"',
    '"stadium:jamsil:operator-apply-plan": "node scripts/qa-presets.mjs stadium jamsil operator-apply-plan"',
    '"stadium:jamsil:operator-handoff": "node scripts/qa-presets.mjs stadium jamsil operator-handoff"',
    '"stadium:jamsil:operator-approval": "node scripts/qa-presets.mjs stadium jamsil operator-approval"',
    '"stadium:jamsil:operator-approval:status": "node scripts/qa-presets.mjs stadium jamsil operator-approval:status"',
    '"stadium:jamsil:operator-approval:approve": "node scripts/qa-presets.mjs stadium jamsil operator-approval:approve"',
    '"stadium:jamsil:operator-approval:verify": "node scripts/qa-presets.mjs stadium jamsil operator-approval:verify"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  assert.equal(packageSource.includes('"qa:stadium:jamsil:responsive"'), false, 'package script should not expose responsive QA');

  [
    'publicTasks: [',
    "'food-candidate-apply-plan'",
    "'food-candidate-review-workset'",
    "'food-candidate-validate'",
    "'food-candidate-transfer'",
    "'operator-intake'",
    "'operator-validate'",
    "'operator-apply-plan'",
    "'operator-handoff'",
    "'operator-approval'",
    "'operator-approval:status'",
    "'operator-approval:approve'",
    "'operator-approval:verify'",
    "'food-candidate-apply-plan': [",
    "'food-candidate-review-workset': [",
    "'food-candidate-validate': [",
    "'food-candidate-transfer': [",
    "'operator-intake': [",
    "'operator-approval': [",
    "'operator-approval:status': [",
    "'operator-approval:approve': [",
    "'operator-approval:verify': [",
    "responsive: [",
    "args: ['scripts/run-stadium-isolated-qa.mjs', 'JAMSIL:RESPONSIVE']",
    'responsive QA remains dispatcher-internal',
    'responsive QA stays available through the integrated dispatcher',
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `dispatcher should include ${requiredText}`);
  });

  assert.ok(releaseLockSource.includes('node scripts/stadium-seatmap-ops.mjs jamsil responsive'), 'release lock should document internal responsive task');
  assert.equal(releaseLockSource.includes('npm run qa:stadium:jamsil:responsive'), false, 'release lock should not document removed responsive alias');
  [
    'src/data/jamsilOperatorVisitGuide.ts',
    'docs/stadium/operator-visit-guide-policy.md',
    'node --import tsx --test --test-concurrency=1 src/data/jamsilOperatorVisitGuideSeatData.test.ts',
    'jamsil-food-candidate-review-validation.json',
    'jamsil-food-candidate-review-workset.json',
    'jamsil-food-candidate-intake-transfer.csv',
    'jamsil-food-candidate-apply-plan.ts-fragment',
    'jamsil-operator-visit-guide-handoff.md',
    'jamsil-operator-visit-guide-approval.json',
    'jamsil-operator-entrance',
    'jamsil-operator-facilities',
    'jamsil-operator-notice',
    'jamsil-operator-updated-at',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `Jamsil release lock should include ${requiredText}`);
  });

  [
    'package full script',
    'package food candidate apply plan script',
    'package food candidate review workset script',
    'package food candidate validate script',
    'package food candidate transfer script',
    'package operator intake script',
    'package operator approval script',
    'package operator approval status script',
    'package operator approval approve script',
    'package operator approval verify script',
    'package responsive script removed',
    'dispatcher responsive task',
    'dispatcher food candidate apply plan task',
    'dispatcher food candidate review workset task',
    'dispatcher food candidate validate task',
    'dispatcher food candidate transfer task',
    'dispatcher operator approval task',
    'dispatcher operator approval status task',
    'dispatcher operator approval approve task',
    'dispatcher operator approval verify task',
    'release lock document includes internal responsive task',
    'release lock document includes food candidate validate command',
    'release lock document includes food candidate review workset command',
    'release lock document includes food candidate transfer command',
    'release lock document includes food candidate apply plan command',
    'release lock document includes operator approval command',
  ].forEach((requiredText) => {
    assert.ok(jamsilOpsSource.includes(requiredText), `Jamsil release gate should check ${requiredText}`);
  });
});
