import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { KBO_STADIUMS } from '../utils/stadiumData';
import { resolveStadiumSeatMapPresetMeta } from './ui/stadiumSeatMapModel';

interface StadiumSeatMapRuntimeContract {
  presetId: string;
  folder: string;
  componentName: string;
  dataFile: string;
  badgeLabel: string;
  requiredFiles: string[];
}

const STADIUM_SEATMAP_CONTRACTS: StadiumSeatMapRuntimeContract[] = [
  {
    presetId: 'jamsil',
    folder: 'jamsil',
    componentName: 'JamsilSeatMap',
    dataFile: 'jamsilSeatData.ts',
    badgeLabel: '잠실 블록 단위 안내도',
    requiredFiles: [
      'src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.png',
      'src/assets/stadiums/doosan/jamsil-doosan-stadium-overview.png',
    ],
  },
  {
    presetId: 'incheon',
    folder: 'incheon',
    componentName: 'IncheonSeatMap',
    dataFile: 'incheonSeatData.ts',
    badgeLabel: '인천 SSG 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp'],
  },
  {
    presetId: 'daegu',
    folder: 'daegu',
    componentName: 'DaeguSeatMap',
    dataFile: 'daeguSeatData.ts',
    badgeLabel: '대구 삼성 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png'],
  },
  {
    presetId: 'daejeon',
    folder: 'daejeon',
    componentName: 'DaejeonSeatMap',
    dataFile: 'daejeonSeatData.ts',
    badgeLabel: '대전 한화 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png'],
  },
  {
    presetId: 'gocheok',
    folder: 'gocheok',
    componentName: 'GocheokSeatMap',
    dataFile: 'gocheokSeatData.ts',
    badgeLabel: '고척 키움 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png'],
  },
  {
    presetId: 'gwangju',
    folder: 'gwangju',
    componentName: 'GwangjuSeatMap',
    dataFile: 'gwangjuSeatData.ts',
    badgeLabel: '광주 KIA 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.png'],
  },
  {
    presetId: 'changwon',
    folder: 'changwon',
    componentName: 'ChangwonSeatMap',
    dataFile: 'changwonSeatData.ts',
    badgeLabel: '창원 NC 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.png'],
  },
  {
    presetId: 'sajik',
    folder: 'sajik',
    componentName: 'SajikSeatMap',
    dataFile: 'sajikSeatData.ts',
    badgeLabel: '사직 롯데 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png'],
  },
  {
    presetId: 'suwon',
    folder: 'suwon',
    componentName: 'SuwonSeatMap',
    dataFile: 'suwonSeatData.ts',
    badgeLabel: '수원 kt 위즈 파크 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.jpg'],
  },
];

const projectRoot = process.cwd();

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

test('구장 설정 데이터의 전용 좌석도 preset은 파일 계약과 일치한다', () => {
  const configuredPresetIds = Object.values(KBO_STADIUMS)
    .map((stadium) => resolveStadiumSeatMapPresetMeta(stadium.id, stadium.name))
    .filter((meta) => !meta.isDefault)
    .map((meta) => meta.id);
  const contractPresetIds = STADIUM_SEATMAP_CONTRACTS.map((contract) => contract.presetId);

  assert.deepEqual(uniqueSorted(contractPresetIds), uniqueSorted(configuredPresetIds));
});

test('구장별 전용 좌석도 파일과 공식 asset은 런타임 계약에 맞게 존재한다', () => {
  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentBasePath = `src/components/${contract.folder}/${contract.componentName}`;
    [
      `${componentBasePath}.tsx`,
      `${componentBasePath}Svg.tsx`,
      `src/components/${contract.folder}/${contract.componentName.replace('SeatMap', 'BottomSheet')}.tsx`,
      `src/data/${contract.dataFile}`,
      `src/data/${contract.dataFile.replace('.ts', '.test.ts')}`,
      ...contract.requiredFiles,
    ].forEach((relativePath) => {
      assert.ok(fs.existsSync(path.join(projectRoot, relativePath)), `${relativePath} should exist`);
    });
  });
});

test('StadiumGuideRuntime은 모든 전용 구장 좌석도를 lazy-load하고 공식 라벨로 분기한다', () => {
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    assert.match(
      runtimeSource,
      new RegExp(`const ${contract.componentName} = lazy\\(\\(\\) => import\\('\\./${contract.folder}/${contract.componentName}'\\)\\);`),
      `${contract.componentName} should be lazy-loaded`,
    );
    assert.ok(runtimeSource.includes(`seatMapPresetMeta.id === '${contract.presetId}'`), `${contract.presetId} preset branch should exist`);
    assert.ok(runtimeSource.includes(contract.badgeLabel), `${contract.badgeLabel} badge label should exist`);
    assert.ok(runtimeSource.includes(`<${contract.componentName} />`), `${contract.componentName} should be rendered`);
  });
});

test('구장별 전용 좌석도는 시야/preview 연결 계약을 유지한다', () => {
  const expectedStadiumKeys: Record<string, string> = {
    incheon: 'INCHEON',
    daegu: 'DAEGU',
    daejeon: 'DAEJEON',
    gocheok: 'GOCHEOK',
    gwangju: 'GWANGJU',
    changwon: 'CHANGWON',
    sajik: 'SAJIK',
    suwon: 'SUWON',
  };

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const source = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    if (contract.presetId === 'jamsil') {
      assert.ok(source.includes('SeatMapHoverPreview'), `${contract.componentName} should render SeatMapHoverPreview`);
      return;
    }

    assert.ok(source.includes('SeatViewGallery'), `${contract.componentName} should render SeatViewGallery`);
    assert.ok(
      source.includes(`stadium="${expectedStadiumKeys[contract.presetId]}"`),
      `${contract.componentName} should use ${expectedStadiumKeys[contract.presetId]} SeatViewGallery key`,
    );
  });
});

test('사직 좌석도 release lock 문서는 v2 polygon 검수 계약을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const releaseLockSource = readProjectFile('docs/sajik-seatmap-release-lock.md');
  const manifestSource = readProjectFile('scripts/sajik-seatmap-review-manifest.mjs');
  const evidenceSource = readProjectFile('scripts/sajik-seatmap-evidence-crops.mjs');
  const dataTestSource = readProjectFile('src/data/sajikSeatData.test.ts');
  const svgSource = readProjectFile('src/components/sajik/SajikSeatMapSvg.tsx');

  [
    'sajik-lotte-seatmap-official-2026.png',
    '공식 이미지 좌표계: `960x640`',
    '`SAJIK_BLOCKS.length === 89`',
    '`totalBlocks=89`',
    '`p0Blocks=39`',
    '`p1Blocks=16`',
    '`p2Blocks=34`',
    '`officialImageTraced=89`',
    '`needsOperatorReview=0`',
    '`directOfficialTrace=89`',
    '`officialPngManualPolygon=89`',
    '`manualPolygonV2=89`',
    '`manualReviewed=89`',
    '`unreviewedBlocks=0`',
    '`pixelAligned=87`',
    '`manualReviewRequired=2`',
    '`mapSelectable=87`',
    '`aliasOnlyOfficialPngBlockNotVisible=2`',
    '`officialPngBlockNotVisible=2`',
    '`alignmentLockedVerified=87`',
    '`alignmentFailures=0`',
    '`thinOutsideFailures=0`',
    '`refinedPolygons=83`',
    '`OFFICIAL_PNG_MANUAL_POLYGON`',
    '`manual-polygon-v2`',
    '`PATH_TRACED_FROM_OFFICIAL_IMAGE`',
    '`PIXEL_ALIGNED`',
    '`OFFICIAL_PNG_BLOCK_NOT_VISIBLE`',
    '예외 블럭: `011`, `903`',
    '`SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`',
    '`SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`',
    '`SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`',
    '`011`, `903`은 SVG hit-area로 렌더링하지 않으며 지도 클릭/hover/popup 대상에서 제외한다.',
    '브라우저 label-coordinate QA는 `MAP_SELECTABLE` 87개만 렌더링/클릭 대상으로 검증하고',
    '`reports/stadium/sajik-seatmap-trace-review.json`',
    '`reports/stadium/sajik-seatmap-evidence-contact-sheet.png`',
    '`reports/stadium/sajik-seatmap-alignment-audit.json`',
    '`reports/stadium/sajik-seatmap-advisory-playwright-review.md`',
    '모든 운영 polygon은 `M/L/Z` 단일 폐합 path여야 한다.',
    '`MAP_SELECTABLE` 블럭의 label 좌표 클릭은 렌더 순서상 자기 block을 최상위 hit-area로 가져야 한다.',
    '`OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 예외 블럭은 클릭 정합 release gate와 SVG hit-area 렌더링에서 제외하되',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    'npm run stadium:sajik:alignment-audit',
    'npm run stadium:sajik:evidence',
    'node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'npm run qa:stadium:sajik:trace-review',
    'npm run build',
    '`SAJIK_OFFICIAL_TRACE_REFERENCE`의 `expectedPointCount` 또는 `expectedArea`가 현재 path와 다르다.',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    '"stadium:sajik:evidence": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && npm run stadium:sajik:trace-manifest && node --import tsx scripts/sajik-seatmap-evidence-crops.mjs"',
    '"stadium:sajik:advisory-playwright": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs"',
    '"qa:stadium:sajik:trace-review": "npm run stadium:sajik:evidence && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs && npm run qa:stadium:sajik:mobile && npm run stadium:sajik:alignment-audit"',
    'node scripts/stadium-ux-audit.mjs',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    'alignmentLockedVerified',
    'officialPngBlockNotVisible',
    'manualPolygonV2',
    'mapSelectable',
    'aliasOnlyOfficialPngBlockNotVisible',
    'refinedPolygons',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `Sajik manifest should include ${requiredText}`);
  });

  [
    'sajik-seatmap-evidence-contact-sheet.png',
    'sajik-seatmap-evidence-${tier.toLowerCase()}.png',
    'tierOrder = [',
    'OFFICIAL_PNG_MANUAL_POLYGON',
    'manual-polygon-v2',
    'aliasOnlyOfficialPngBlockNotVisible',
  ].forEach((requiredText) => {
    assert.ok(evidenceSource.includes(requiredText), `Sajik evidence script should include ${requiredText}`);
  });

  [
    '사직 polygon은 단일 폐합 path이고 자기 교차가 없다',
    '사직 label 좌표 클릭은 최상위 polygon hit target과 일치한다',
    '사직 polygon 정밀화는 단순 사각형 전체 fallback으로 회귀하지 않는다',
    'SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS',
    'expectedArea',
    'SAJIK_TRACE_AREA_TOLERANCE_PX2',
  ].forEach((requiredText) => {
    assert.ok(dataTestSource.includes(requiredText), `Sajik data test should include ${requiredText}`);
  });

  [
    'data-trace-method',
    'data-pixel-alignment-status',
    'data-map-interaction-status',
    'data-manual-reviewed',
  ].forEach((requiredText) => {
    assert.ok(svgSource.includes(requiredText), `Sajik SVG should expose ${requiredText}`);
  });
});
