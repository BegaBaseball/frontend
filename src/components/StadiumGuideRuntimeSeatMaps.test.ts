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
