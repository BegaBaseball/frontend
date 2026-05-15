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
import {
  SUWON_ALIGNMENT_PROBES,
  SUWON_BROWSER_QA_PROBES,
  SUWON_BLOCKS,
  SUWON_HIT_TEST_PROBES,
} from '../data/suwonSeatData';

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

function probeKey(id: string, point: [number, number]): string {
  return `${id}:${point[0]},${point[1]}`;
}

function snapshotSuwonSeatFixture() {
  const blocks = SUWON_BLOCKS
    .map((block) => ({
      ...block,
      officialBlocks: [...block.officialBlocks],
      seatViewSections: [...block.seatViewSections],
      imageGeometry: { ...block.imageGeometry },
      hitGeometry: { ...block.hitGeometry },
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((block) => ({
      ...block,
      imageGeometry: { ...block.imageGeometry, shortLabel: block.imageGeometry.shortLabel },
      hitGeometry: { ...block.hitGeometry, shortLabel: block.hitGeometry.shortLabel },
    }));

  const alignmentProbes = SUWON_ALIGNMENT_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));
  const browserQaProbes = SUWON_BROWSER_QA_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));
  const hitTestProbes = SUWON_HIT_TEST_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));

  return JSON.stringify({
    blocks,
    alignmentProbes,
    browserQaProbes,
    hitTestProbes,
  });
}

function suwonFixtureSignature() {
  return createHash('sha256').update(snapshotSuwonSeatFixture()).digest('hex');
}

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function readImageDimensions(relativePath: string): { width: number; height: number } {
  const imagePath = path.join(projectRoot, relativePath);
  const buffer = fs.readFileSync(imagePath);

  if (relativePath.endsWith('.png')) {
    assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${relativePath} should be a PNG file`);
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (relativePath.endsWith('.webp')) {
    assert.equal(buffer.toString('ascii', 0, 4), 'RIFF', `${relativePath} should be a RIFF file`);
    assert.equal(buffer.toString('ascii', 8, 12), 'WEBP', `${relativePath} should be a WebP file`);

    for (let offset = 12; offset + 8 <= buffer.length;) {
      const chunkType = buffer.toString('ascii', offset, offset + 4);
      const chunkSize = buffer.readUInt32LE(offset + 4);
      const payloadOffset = offset + 8;

      if (chunkType === 'VP8X') {
        return {
          width: readUInt24LE(buffer, payloadOffset + 4) + 1,
          height: readUInt24LE(buffer, payloadOffset + 7) + 1,
        };
      }

      if (chunkType === 'VP8L') {
        const bits = buffer.readUInt32LE(payloadOffset + 1);
        return {
          width: (bits & 0x3fff) + 1,
          height: ((bits >> 14) & 0x3fff) + 1,
        };
      }

      if (chunkType === 'VP8 ') {
        return {
          width: buffer.readUInt16LE(payloadOffset + 6) & 0x3fff,
          height: buffer.readUInt16LE(payloadOffset + 8) & 0x3fff,
        };
      }

      offset += 8 + chunkSize + (chunkSize % 2);
    }
  }

  throw new Error(`Unsupported image format for ${relativePath}`);
}

function uniqueSorted(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).sort();
}

function diffSet(a: Set<string>, b: Set<string>): { missing: string[]; extra: string[] } {
  const missing = Array.from(a).filter((value) => !b.has(value)).sort();
  const extra = Array.from(b).filter((value) => !a.has(value)).sort();
  return { missing, extra };
}

function splitProbeKeysByBlock(probeKeys: Set<string>): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  probeKeys.forEach((key) => {
    const [id, point] = key.split(':', 2);
    const points = grouped.get(id) ?? [];
    points.push(point);
    grouped.set(id, points);
  });

  grouped.forEach((points) => {
    points.sort();
  });

  return grouped;
}

function formatProbeDiffByBlock(diffByBlock: Map<string, string[]>): string {
  return Array.from(diffByBlock.entries())
    .map(([id, points]) => `${id}:[${points.join(', ')}]`)
    .sort((a, b) => a.localeCompare(b))
    .join('; ');
}

function snapshotSuwonProbeKeySets() {
  return {
    blockIds: new Set(SUWON_BLOCKS.map((block) => block.id)),
    alignmentProbeKeys: new Set(SUWON_ALIGNMENT_PROBES.map((probe) => probeKey(probe.id, probe.point))),
    browserQaProbeKeys: new Set(SUWON_BROWSER_QA_PROBES.map((probe) => probeKey(probe.id, probe.point))),
    hitTestProbeKeys: new Set(SUWON_HIT_TEST_PROBES.map((probe) => probeKey(probe.id, probe.point))),
  };
}

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

test('인천 좌석도 PNG 기준 파일과 렌더링 WebP는 같은 좌표계 크기를 유지한다', () => {
  const sourcePng = 'src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.png';
  const renderedWebp = 'src/assets/stadiums/ssg/incheon-ssg-seatmap-official-2026.webp';
  const dataSource = readProjectFile('src/data/incheonSeatData.ts');
  const svgSource = readProjectFile('src/components/incheon/IncheonSeatMapSvg.tsx');

  assert.deepEqual(readImageDimensions(sourcePng), { width: 3360, height: 5328 });
  assert.deepEqual(readImageDimensions(renderedWebp), { width: 3360, height: 5328 });
  assert.ok(dataSource.includes('3360'), 'Incheon data should preserve source image width');
  assert.ok(dataSource.includes('5328'), 'Incheon data should preserve source image height');
  assert.ok(svgSource.includes('incheon-ssg-seatmap-official-2026.webp'), 'runtime should render the optimized WebP asset');
});

test('수원 좌석도 계약은 draft PNG가 아니라 @2x 공식 JPG를 기준으로 유지한다', () => {
  const dataSource = readProjectFile('src/data/suwonSeatData.ts');
  const svgSource = readProjectFile('src/components/suwon/SuwonSeatMapSvg.tsx');

  assert.ok(dataSource.includes("imagePath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.jpg'"), 'Suwon active image path should pin the @2x official JPG');
  assert.ok(dataSource.includes("requiredAssetPath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.jpg'"), 'Suwon required asset path should pin the @2x official JPG');
  assert.ok(dataSource.includes("draftAssetFileName: 'suwon-kt-seatmap-official-2026.png'"), 'Suwon draft PNG should remain metadata-only');
  assert.ok(!svgSource.includes('suwon-kt-seatmap-official-2026.png'), 'Suwon SVG should not render the draft PNG');
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

test('Stadium QA runner는 stale summary를 정리하고 실패한 target을 다음 포트에서 재시도한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');

  assert.ok(fs.existsSync(path.join(projectRoot, 'scripts/stadium-ux-audit.mjs')), 'tracked stadium UX audit script should exist inside the frontend repo');
  assert.ok(runnerSource.includes("path.join(frontendRoot, 'scripts/stadium-ux-audit.mjs')"), 'runner should execute the tracked audit script');
  assert.ok(packageSource.includes('node scripts/stadium-ux-audit.mjs'), 'attached QA scripts should execute the tracked audit script');
  assert.ok(runnerSource.includes('clearSummaryFiles(outputDir)'), 'runner should clear stale summary files before a target starts');
  assert.ok(runnerSource.includes('stadium-mobile-smoke-summary.json'), 'runner should clear stale JSON summaries');
  assert.ok(runnerSource.includes('failed on port=${port}; retrying once on next available port'), 'runner should retry failed targets');
  assert.ok(runnerSource.includes('port = await resolveTargetPort(port + 1)'), 'runner retry should move to the next available port');
});

test('StadiumGuideRuntime은 registry, 중립 스켈레톤, 수동 데이터 상태로 좌석도 패널을 렌더링한다', () => {
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');
  const runtimeShellSource = readProjectFile('src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx');

  assert.ok(runtimeSource.includes('resolveStadiumSeatMapEntry'), 'runtime should resolve seat maps through registry');
  assert.ok(runtimeSource.includes('SeatMapRuntimeShell'), 'runtime should delegate to shared runtime shell');
  assert.ok(runtimeSource.includes('usesCoordinateGeometry'), 'runtime should branch on coordinate geometry exclusion metadata');
  assert.ok(runtimeSource.includes('shellResetKey'), 'runtime should preserve shell-aware reset key contract for runtime shell errors');
  assert.ok(runtimeSource.includes('seatMapEntry.shellTemplate'), 'runtime should pass shell template metadata to runtime shell');
  assert.ok(runtimeSource.includes('StadiumSeatMapManualRequired'), 'runtime should show manual-data-required state when no entry resolves');
  assert.ok(runtimeSource.includes('<SeatMapComponent />'), 'runtime should render the resolved registry component');
  assert.ok(runtimeSource.includes('w-full max-w-none text-sm leading-relaxed'), 'runtime hero description should use the full hero card width');
  assert.ok(!runtimeSource.includes('max-w-xl text-sm leading-relaxed'), 'runtime hero description should not be constrained to half-width on desktop');
  assert.ok(runtimeShellSource.includes('StadiumSeatMapLoadingSkeleton'), 'shared runtime shell should provide neutral loading skeleton');
  assert.ok(runtimeShellSource.includes('StadiumSeatMapErrorBoundary'), 'shared runtime shell should isolate seat map render/import errors');
  assert.ok(runtimeShellSource.includes('StadiumSeatMapErrorFallback'), 'shared runtime shell should provide retry fallback');
  assert.ok(!runtimeShellSource.includes('window.location.reload'), 'shared runtime shell should not force reload on unknown template');
  assert.ok(!runtimeSource.includes("from './ui/StadiumSeatMap'"), 'runtime should not import the removed common SVG seat map');
  assert.ok(!runtimeSource.includes('resolveStadiumSeatMapPresetMeta'), 'runtime should not use removed preset meta resolver');
});

test('좌석도 registry는 좌표 기반 QA 메타데이터와 표준 shell 계약을 유지한다', () => {
  const registrySource = readProjectFile('src/components/stadiumSeatMapRegistry.tsx');
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');
  const runtimeShellSource = readProjectFile('src/components/stadiumSeatMap/SeatMapRuntimeShell.tsx');
  const templateSource = readProjectFile('src/components/stadiumSeatMap/SeatMapTemplateShell.tsx');
  const coordinateTemplates = STADIUM_SEAT_MAP_ENTRIES.filter((entry) => entry.usesCoordinateGeometry);
  const nonCoordinateTemplateEntries = STADIUM_SEAT_MAP_ENTRIES.filter((entry) => entry.isNonCoordinateMap);
  const nonCoordinateGeometryEntries = STADIUM_SEAT_MAP_ENTRIES.filter((entry) => !entry.usesCoordinateGeometry);

  assert.ok(coordinateTemplates.length > 0, 'there should be at least one coordinate geometry based seat map');
  assert.ok(registrySource.includes("export type StadiumSeatMapShellTemplate = 'standard'"), 'registry should keep the single standard shell type');
  assert.ok(runtimeSource.includes('seatMapEntry.usesCoordinateGeometry'), 'runtime should keep QA/audit coordinate metadata wired');
  assert.ok(runtimeSource.includes('seatMapEntry.shellTemplate'), 'runtime should keep shell template metadata wired');

  STADIUM_SEAT_MAP_ENTRIES.forEach((entry) => {
    assert.equal(entry.shellTemplate, 'standard', `${entry.id} should use the standard seat map shell`);
  });

  coordinateTemplates.forEach((entry) => {
    assert.equal(entry.isNonCoordinateMap, false, `${entry.id} coordinate map should not be flagged as non-coordinate`);
  });

  nonCoordinateGeometryEntries.forEach((entry) => {
    assert.equal(entry.isNonCoordinateMap, true, `${entry.id} should keep non-coordinate QA metadata`);
  });

  nonCoordinateTemplateEntries.forEach((entry) => {
    assert.equal(entry.usesCoordinateGeometry, false, `${entry.id} should keep coordinate QA exclusion metadata`);
  });

  [registrySource, runtimeSource, runtimeShellSource, templateSource].forEach((source) => {
    assert.equal(source.includes('jamsil-template'), false, 'standard shell production code should not reintroduce jamsil-template naming');
    assert.equal(source.includes('legacy'), false, 'standard shell production code should not reintroduce legacy shell naming');
    assert.equal(source.includes('isDoosanGuideActive'), false, 'shared shell production code should not use Doosan-specific naming');
  });
});

test('Suwon runtime contract 임포트는 좌표 fixture를 변경하지 않는다', async () => {
  const baseline = suwonFixtureSignature();
  const baselineProbeKeys = snapshotSuwonProbeKeySets();
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');

  await Promise.all([
    import('./stadiumSeatMapRegistry.tsx'),
    import('./stadiumSeatMap/SeatMapRuntimeShell.tsx'),
  ]);

  const afterProbeKeys = snapshotSuwonProbeKeySets();

  assert.ok(runtimeSource.includes('SeatMapRuntimeShell'), 'runtime source should keep the seat map shell contract');
  assert.ok(runtimeSource.includes('resolveStadiumSeatMapEntry'), 'runtime source should keep registry resolution');

  assert.equal(suwonFixtureSignature(), baseline, 'runtime contract imports should not mutate Suwon fixture data');

  const blockIdDiff = diffSet(baselineProbeKeys.blockIds, afterProbeKeys.blockIds);
  assert.equal(blockIdDiff.missing.length, 0, `Suwon block ids should not be missing after runtime imports: ${blockIdDiff.missing.join(', ')}`);
  assert.equal(blockIdDiff.extra.length, 0, `Unexpected Suwon block ids introduced after runtime imports: ${blockIdDiff.extra.join(', ')}`);

  const alignmentDiff = diffSet(baselineProbeKeys.alignmentProbeKeys, afterProbeKeys.alignmentProbeKeys);
  const browserQaDiff = diffSet(baselineProbeKeys.browserQaProbeKeys, afterProbeKeys.browserQaProbeKeys);
  const hitTestDiff = diffSet(baselineProbeKeys.hitTestProbeKeys, afterProbeKeys.hitTestProbeKeys);

  assert.equal(
    alignmentDiff.missing.length,
    0,
    `Suwon alignment probe key missing after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(alignmentDiff.missing)))}`,
  );
  assert.equal(
    alignmentDiff.extra.length,
    0,
    `Unexpected Suwon alignment probe keys after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(alignmentDiff.extra)))}`,
  );

  assert.equal(
    browserQaDiff.missing.length,
    0,
    `Suwon browser QA probe key missing after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(browserQaDiff.missing)))}`,
  );
  assert.equal(
    browserQaDiff.extra.length,
    0,
    `Unexpected Suwon browser QA probe keys after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(browserQaDiff.extra)))}`,
  );

  assert.equal(
    hitTestDiff.missing.length,
    0,
    `Suwon hit test probe key missing after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(hitTestDiff.missing)))}`,
  );
  assert.equal(
    hitTestDiff.extra.length,
    0,
    `Unexpected Suwon hit test probe keys after runtime imports: ${formatProbeDiffByBlock(splitProbeKeysByBlock(new Set(hitTestDiff.extra)))}`,
  );
});

test('인천 전용 guide/quick-action 계약은 표준 좌석도에서 제거된 상태를 유지한다', () => {
  const runtimeSource = readProjectFile('src/components/StadiumGuideRuntime.tsx');
  const incheonSource = readProjectFile('src/components/incheon/IncheonSeatMap.tsx');
  const incheonSvgSource = readProjectFile('src/components/incheon/IncheonSeatMapSvg.tsx');
  const incheonDataSource = readProjectFile('src/data/incheonSeatData.ts');

  assert.equal(fs.existsSync(path.join(projectRoot, 'src/data/incheonVisitGuide.ts')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/data/incheonVisitGuide.test.ts')), false);

  [
    'IncheonVisitQuickActions',
    'isIncheonStadium',
    'INCHEON_VISIT_QUICK_ACTIONS',
    'incheon-visit-quick-actions',
  ].forEach((removedToken) => {
    assert.equal(runtimeSource.includes(removedToken), false, `runtime should not include ${removedToken}`);
  });

  [
    'IncheonFirstVisitGuide',
    'incheon-first-visit-guide',
    'incheon-guide-',
    'guideMatchedBlockIds',
    'getIncheonGuideMatches',
    'mobileSecondaryPanel',
    'desktopSecondaryPanel',
  ].forEach((removedToken) => {
    assert.equal(incheonSource.includes(removedToken), false, `IncheonSeatMap should not include ${removedToken}`);
  });

  [
    'guideMatchedBlockIds',
    'guideActive',
    'data-guide-match',
  ].forEach((removedToken) => {
    assert.equal(incheonSvgSource.includes(removedToken), false, `IncheonSeatMapSvg should not include ${removedToken}`);
  });

  [
    'IncheonGuideIntent',
    'IncheonBlockMatch',
    'getIncheonGuideMatches',
    'getIncheonGuideSearch',
  ].forEach((removedToken) => {
    assert.equal(incheonDataSource.includes(removedToken), false, `incheonSeatData should not include ${removedToken}`);
  });

  [
    'SeatMapFilterBar',
    'SeatMapLegend',
    'SeatMapAttribution',
    'SeatMapDetailPanel',
    'SeatMapBottomSheet',
    'IncheonUploadFlowModal',
    'fullscreenDialogTestId="incheon-seatmap-fullscreen"',
  ].forEach((requiredToken) => {
    assert.ok(incheonSource.includes(requiredToken), `IncheonSeatMap should keep standard UX token ${requiredToken}`);
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
    const detailPanelSource = readProjectFile('src/components/stadiumSeatMap/SeatMapDetailPanel.tsx');
    if (contract.presetId === 'jamsil') {
      assert.ok(source.includes('SeatMapHoverPreview'), `${contract.componentName} should render SeatMapHoverPreview`);
      return;
    }

    assert.ok(
      source.includes('SeatViewGallery') || source.includes('SeatMapDetailPanel'),
      `${contract.componentName} should render SeatViewGallery directly or through the shared detail panel`,
    );
    assert.ok(
      source.includes(`stadium="${expectedStadiumKeys[contract.presetId]}"`)
        || source.includes(`stadiumKey="${expectedStadiumKeys[contract.presetId]}"`)
        || detailPanelSource.includes('stadium={stadiumKey}'),
      `${contract.componentName} should use ${expectedStadiumKeys[contract.presetId]} SeatViewGallery key`,
    );
  });
});

test('좌석도 공통 UI 컴포넌트는 잠실 기준 UX 계약을 제공한다', () => {
  const filterSource = readProjectFile('src/components/stadiumSeatMap/SeatMapFilterBar.tsx');
  const legendSource = readProjectFile('src/components/stadiumSeatMap/SeatMapLegend.tsx');
  const attributionSource = readProjectFile('src/components/stadiumSeatMap/SeatMapAttribution.tsx');
  const detailSource = readProjectFile('src/components/stadiumSeatMap/SeatMapDetailPanel.tsx');
  const bottomSheetSource = readProjectFile('src/components/stadiumSeatMap/SeatMapBottomSheet.tsx');
  const hookSource = readProjectFile('src/components/stadiumSeatMap/useSeatMapSelectionState.ts');
  const typeSource = readProjectFile('src/components/stadiumSeatMap/seatMapCommonTypes.ts');
  const templateSource = readProjectFile('src/components/stadiumSeatMap/SeatMapTemplateShell.tsx');
  const jamsilSource = readProjectFile('src/components/jamsil/JamsilSeatMap.tsx');
  const suwonSource = readProjectFile('src/components/suwon/SuwonSeatMap.tsx');

  assert.ok(typeSource.includes('SeatMapCategoryMeta'));
  assert.ok(typeSource.includes('SeatMapFilterGroup'));
  assert.ok(typeSource.includes('SeatMapSectionAdapter'));
  assert.ok(typeSource.includes('SeatMapCommonCopy'));
  assert.ok(typeSource.includes('SeatMapSourceInfo'));
  assert.ok(typeSource.includes('blockLabel?: string'), 'shared copy should allow stadium-specific block label copy');
  assert.ok(filterSource.includes('aria-pressed'), 'shared filter should expose pressed state');
  assert.ok(filterSource.includes('getGroupState'), 'shared filter should support stadium-specific disabled/data attributes');
  assert.ok(legendSource.includes('categoryIds'), 'shared legend should render category ids from stadium data');
  assert.ok(attributionSource.includes('좌석 배치 기준:'), 'shared attribution should render source caption copy');
  assert.ok(attributionSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'), 'shared attribution should preserve manual data contract');
  assert.ok(detailSource.includes('SeatViewGallery'), 'shared detail panel should own the common gallery block');
  assert.ok(detailSource.includes('copy?.blockLabel'), 'shared detail panel should honor custom block label copy');
  assert.ok(detailSource.includes('extraMeta'), 'shared detail panel should expose stadium-specific metadata slot');
  assert.ok(bottomSheetSource.includes("type Snap = 'peek' | 'half' | 'full'"), 'shared bottom sheet should preserve mobile snap behavior');
  assert.ok(bottomSheetSource.includes('testId?: string'), 'shared bottom sheet should preserve stadium QA ids when needed');
  assert.ok(bottomSheetSource.includes('data-testid={testId}'), 'shared bottom sheet should render the provided QA id');
  assert.ok(bottomSheetSource.includes('extraMeta'), 'shared bottom sheet should expose stadium-specific metadata slot');
  assert.ok(hookSource.includes('filterCats'), 'shared selection hook should derive filter categories');
  assert.ok(hookSource.includes('setSelected(null)'), 'shared selection hook should clear invalid selected sections');
  assert.ok(templateSource.includes('isAuxiliaryGuideActive'), 'template shell should use a generic auxiliary guide flag');
  assert.ok(templateSource.includes('mobileSecondaryPanel'), 'template shell should expose a mobile secondary panel slot');
  assert.ok(templateSource.includes('desktopSecondaryPanel'), 'template shell should expose a desktop secondary panel slot');
  assert.ok(!templateSource.includes('isDoosanGuideActive'), 'template shell should not expose Doosan-specific naming');
  const jamsilDedicatedBottomSheetName = 'Jamsil' + 'BottomSheet';
  const jamsilDedicatedSidePanelName = 'Jamsil' + 'SidePanelV2';
  assert.ok(jamsilSource.includes('SeatMapBottomSheet'), 'Jamsil should wire the shared mobile bottom sheet');
  assert.ok(jamsilSource.includes('SeatMapDetailPanel'), 'Jamsil should wire the shared desktop detail panel');
  assert.ok(!jamsilSource.includes(jamsilDedicatedBottomSheetName), 'Jamsil should not keep a dedicated mobile bottom sheet');
  assert.ok(!jamsilSource.includes(jamsilDedicatedSidePanelName), 'Jamsil should not keep a dedicated desktop detail panel');
  assert.ok(jamsilSource.includes('JamsilUploadFlowModal'), 'Jamsil should keep the upload CTA modal');
  assert.ok(jamsilSource.includes('isAuxiliaryGuideActive={isDoosanGuideActive}'), 'Jamsil should keep Doosan guide as an auxiliary guide extension');
  const suwonDedicatedBottomSheetName = 'Suwon' + 'BottomSheet';
  assert.ok(suwonSource.includes('SeatMapBottomSheet'), 'Suwon should wire the shared mobile bottom sheet');
  assert.ok(!suwonSource.includes(suwonDedicatedBottomSheetName), 'Suwon should not keep a dedicated mobile bottom sheet');
  assert.ok(suwonSource.includes('SuwonUploadFlowModal'), 'Suwon should wire the upload CTA modal');
});

test('구장별 전용 모바일 바텀시트 파일은 재도입하지 않는다', () => {
  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const bottomSheetName = contract.componentName.replace('SeatMap', 'BottomSheet');
    const bottomSheetPath = `src/components/${contract.folder}/${bottomSheetName}.tsx`;

    assert.equal(
      fs.existsSync(path.join(projectRoot, bottomSheetPath)),
      false,
      `${bottomSheetPath} should stay removed`,
    );

    assert.ok(componentSource.includes('SeatMapBottomSheet'), `${contract.componentName} should use the shared bottom sheet`);
    assert.equal(componentSource.includes(bottomSheetName), false, `${contract.componentName} should not reference ${bottomSheetName}`);
  });
});

test('구장별 secondary panel 예외는 allowlist로만 유지한다', () => {
  const secondaryPanelPresetIds = new Set(['daegu', 'daejeon', 'sajik']);

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const usesSecondaryPanel = componentSource.includes('mobileSecondaryPanel=')
      || componentSource.includes('desktopSecondaryPanel=');

    assert.equal(
      usesSecondaryPanel,
      secondaryPanelPresetIds.has(contract.presetId),
      `${contract.componentName} secondary panel usage should match the allowlist`,
    );
  });

  const daeguSource = readProjectFile('src/components/daegu/DaeguSeatMap.tsx');
  const daejeonSource = readProjectFile('src/components/daejeon/DaejeonSeatMap.tsx');
  const sajikSource = readProjectFile('src/components/sajik/SajikSeatMap.tsx');
  const gocheokSource = readProjectFile('src/components/gocheok/GocheokSeatMap.tsx');
  const incheonSource = readProjectFile('src/components/incheon/IncheonSeatMap.tsx');

  assert.ok(daeguSource.includes('data-testid="daegu-section-finder"'), 'Daegu finder should remain the documented secondary panel exception');
  assert.ok(daejeonSource.includes('data-testid="daejeon-section-finder"'), 'Daejeon finder should remain the documented secondary panel exception');
  assert.ok(sajikSource.includes('data-testid="sajik-first-visit-guide"'), 'Sajik first-visit guide should remain the documented secondary panel exception');
  assert.ok(gocheokSource.includes('GocheokFacilityGuide'), 'Gocheok facility mode should remain the documented auxiliary guide exception');
  assert.ok(gocheokSource.includes('isAuxiliaryGuideActive={!isSeatMapMode}'), 'Gocheok facility mode should use the shared auxiliary guide flag');
  assert.equal(incheonSource.includes('mobileSecondaryPanel='), false, 'Incheon should not use mobile secondary guide slots');
  assert.equal(incheonSource.includes('desktopSecondaryPanel='), false, 'Incheon should not use desktop secondary guide slots');
});

test('구장별 전용 좌석도는 공통 UX 계약을 노출한다', () => {
  const fullscreenControlPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'gocheok', 'changwon', 'sajik', 'suwon']);
  const suppressClickPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'daejeon', 'gocheok', 'sajik', 'suwon']);
  const panCursorSnippets: Record<string, string> = {
    jamsil: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    incheon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    daegu: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    daejeon: "cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'",
    gocheok: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    sajik: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    suwon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
  };

  STADIUM_SEATMAP_CONTRACTS.forEach((contract) => {
    const componentSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}.tsx`);
    const svgSource = readProjectFile(`src/components/${contract.folder}/${contract.componentName}Svg.tsx`);
    const sharedFilterSource = readProjectFile('src/components/stadiumSeatMap/SeatMapFilterBar.tsx');
    const sharedAttributionSource = readProjectFile('src/components/stadiumSeatMap/SeatMapAttribution.tsx');
    const combinedSource = `${componentSource}\n${svgSource}`;
    const zoomPrefix = `${contract.presetId}-seatmap`;
    const zoomInIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-zoom-in"`);
    const zoomResetIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-zoom-reset"`);
    const zoomOutIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-zoom-out"`);

    assert.ok(
      componentSource.includes('aria-pressed') || componentSource.includes('SeatMapFilterBar'),
      `${contract.componentName} filter controls should expose aria-pressed`,
    );
    assert.ok(sharedFilterSource.includes('aria-pressed'), 'shared filter controls should expose aria-pressed');
    assert.ok(
      componentSource.includes('좌석 배치 기준:') || componentSource.includes('SeatMapAttribution'),
      `${contract.componentName} should render the source caption below the map`,
    );
    assert.ok(sharedAttributionSource.includes('좌석 배치 기준:'), 'shared attribution should provide the source caption copy');
    assert.ok(zoomInIndex >= 0, `${contract.componentName} should expose zoom-in test id`);
    assert.ok(zoomResetIndex > zoomInIndex, `${contract.componentName} should order zoom reset after zoom-in`);
    assert.ok(zoomOutIndex > zoomResetIndex, `${contract.componentName} should order zoom-out after zoom reset`);

    if (suppressClickPresetIds.has(contract.presetId)) {
      assert.ok(combinedSource.includes('suppressClickRef'), `${contract.componentName} should suppress accidental clicks after zoom gestures`);
    }

    if (panCursorSnippets[contract.presetId]) {
      assert.ok(
        combinedSource.includes(panCursorSnippets[contract.presetId]),
        `${contract.componentName} should use grab/grabbing only when panning is available`,
      );
    } else {
      assert.ok(
        combinedSource.includes("cursor: isInteractive ? 'pointer' : 'default'")
          || combinedSource.includes("cursor: isFiltered ? 'default' : 'pointer'"),
        `${contract.componentName} should expose pointer/default hit target cursors`,
      );
    }

    if (fullscreenControlPresetIds.has(contract.presetId)) {
      const fullscreenIndex = combinedSource.indexOf(`data-testid="${zoomPrefix}-fullscreen-open"`);
      assert.ok(fullscreenIndex > zoomOutIndex, `${contract.componentName} should order fullscreen after zoom-out`);
    }

    const bottomSheetName = contract.componentName.replace('SeatMap', 'BottomSheet');
    assert.ok(
      new RegExp(`selected\\s*&&\\s*\\(\\s*<SeatMapBottomSheet`).test(componentSource),
      `${contract.componentName} should render the shared mobile bottom sheet only after a selected section exists`,
    );
    assert.equal(componentSource.includes(bottomSheetName), false, `${contract.componentName} should not reference ${bottomSheetName}`);
  });

  const daejeonSource = readProjectFile('src/components/daejeon/DaejeonSeatMap.tsx');
  const gwangjuSource = readProjectFile('src/components/gwangju/GwangjuSeatMap.tsx');
  const changwonSource = readProjectFile('src/components/changwon/ChangwonSeatMap.tsx');

  assert.ok(daejeonSource.includes("copy={{ blockLabel: '정확 블록' }}"), 'Daejeon should preserve exact-block detail copy through shared panels');
  assert.ok(gwangjuSource.includes('extraMeta={renderDerivedRangeMeta}'), 'Gwangju should preserve derived range badges in the shared mobile sheet');
  assert.ok(gwangjuSource.includes('extraMeta={renderDesktopDerivedRangeMeta}'), 'Gwangju should preserve derived range badges in the shared detail panel');
  assert.ok(changwonSource.includes('testId="changwon-bottom-sheet"'), 'Changwon should preserve its mobile QA bottom-sheet id');
  assert.ok(changwonSource.includes('changwon-selected-status-mobile'), 'Changwon should preserve its mobile release-lock status badge');
});

test('검수 중인 전용 좌석도는 block label 좌표 QA 식별자를 제공한다', () => {
  const incheonSvgSource = readProjectFile('src/components/incheon/IncheonSeatMapSvg.tsx');
  const gocheokSvgSource = readProjectFile('src/components/gocheok/GocheokSeatMapSvg.tsx');
  const changwonSvgSource = readProjectFile('src/components/changwon/ChangwonSeatMapSvg.tsx');
  const gwangjuSvgSource = readProjectFile('src/components/gwangju/GwangjuSeatMapSvg.tsx');

  assert.ok(incheonSvgSource.includes('data-testid={`incheon-seat-block-${block.id}`}'));
  assert.ok(incheonSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(incheonSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));
  assert.equal(incheonSvgSource.includes('data-guide-match'), false);
  assert.equal(incheonSvgSource.includes('guideMatchedBlockIds'), false);
  assert.ok(incheonSvgSource.includes('aria-pressed={isActive}'));

  assert.ok(gocheokSvgSource.includes('data-testid={`gocheok-seat-block-${block.id}`}'));
  assert.ok(gocheokSvgSource.includes('data-testid="gocheok-seatmap-hit-area"'));
  assert.ok(gocheokSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(gocheokSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));

  assert.ok(changwonSvgSource.includes('data-testid={`changwon-seat-block-${block.id}`}'));
  assert.ok(changwonSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(changwonSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));
  assert.ok(changwonSvgSource.includes("vectorEffect={usesExpandedHitArea ? undefined : 'non-scaling-stroke'}"));

  assert.ok(gwangjuSvgSource.includes('data-testid={`gwangju-seat-block-${block.id}`}'));
  assert.ok(gwangjuSvgSource.includes('data-label-x={block.imageGeometry.labelX}'));
  assert.ok(gwangjuSvgSource.includes('data-label-y={block.imageGeometry.labelY}'));
  assert.ok(gwangjuSvgSource.includes('data-trace-status={block.imageGeometry.traceStatus}'));
  assert.ok(gwangjuSvgSource.includes('data-pixel-alignment-status={block.imageGeometry.pixelAlignmentStatus}'));
});

test('창원 trace review 스크립트는 117개 숫자 블록과 특수 선택 구역 검수 산출물을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const manifestSource = readProjectFile('scripts/changwon-seatmap-review-manifest.mjs');
  const uxReadinessSource = readProjectFile('scripts/changwon-seatmap-ux-readiness.mjs');
  const changwonComponentSource = readProjectFile('src/components/changwon/ChangwonSeatMap.tsx');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(packageSource.includes('"stadium:changwon:trace-manifest"'));
  assert.ok(packageSource.includes('node --import tsx scripts/changwon-seatmap-review-manifest.mjs'));
  assert.ok(packageSource.includes('"stadium:changwon:ux-readiness"'));
  assert.ok(packageSource.includes('node --import tsx scripts/changwon-seatmap-ux-readiness.mjs'));
  assert.ok(packageSource.includes('"qa:stadium:changwon:trace-review"'));
  assert.ok(packageSource.includes('npm run stadium:changwon:trace-manifest && npm run stadium:changwon:ux-readiness && npm run qa:stadium:changwon:mobile'));
  assert.ok(runnerSource.includes("'CHANGWON'"));
  assert.ok(runnerSource.includes("STADIUM_UX_CHANGWON_DEEP_CHECK: '1'"));

  assert.ok(manifestSource.includes('CHANGWON_EXPECTED_VISIBLE_BLOCKS'));
  assert.ok(manifestSource.includes('CHANGWON_EXPECTED_SELECTABLE_AREAS'));
  assert.ok(manifestSource.includes('CHANGWON_SPECIAL_SELECTABLE_AREAS'));
  assert.ok(manifestSource.includes('CHANGWON_OFFICIAL_TRACE_REFERENCE'));
  assert.ok(manifestSource.includes('CHANGWON_IMAGE_GEOMETRY'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review.json'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review.csv'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review.md'));
  assert.ok(manifestSource.includes('changwon-seatmap-visual-approval.json'));
  assert.ok(manifestSource.includes('changwon-seatmap-visual-approval.md'));
  assert.ok(manifestSource.includes('STACK_OVERLAY_APPROVAL_NOTES'));
  assert.ok(manifestSource.includes('PENDING_HUMAN_SIGNOFF'));
  assert.ok(manifestSource.includes('VISUAL_APPROVAL_DECISION_OPTIONS'));
  assert.ok(manifestSource.includes('VISUAL_SIGNOFF_DECISIONS'));
  assert.ok(manifestSource.includes('VISUAL_SIGNOFF_REVIEW_BATCH'));
  assert.ok(manifestSource.includes('VISUAL_SIGNOFF_REVIEWER'));
  assert.ok(manifestSource.includes('STACK_OVERLAY'));
  assert.ok(manifestSource.includes('LOW_COVERAGE_BLOCK'));
  assert.ok(manifestSource.includes('reviewItemType'));
  assert.ok(manifestSource.includes('humanSignoffStatus'));
  assert.ok(manifestSource.includes('humanSignoffNote'));
  assert.ok(manifestSource.includes('confirmedHumanSignoff'));
  assert.ok(manifestSource.includes('needsTraceAdjustmentHumanSignoff'));
  assert.ok(manifestSource.includes('decisionOptions'));
  assert.ok(manifestSource.includes('stackOverlayReviewItems'));
  assert.ok(manifestSource.includes('lowCoverageReviewItems'));
  assert.ok(manifestSource.includes('pendingHumanSignoff'));
  assert.ok(manifestSource.includes('automatedNeedsTraceAdjustment'));
  assert.ok(manifestSource.includes('SPECIAL_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('P0_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('P1_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('P2_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('SPECIAL_STACK_CLEAN_OVERLAY_TARGETS'));
  assert.ok(manifestSource.includes('CLEAN_OVERLAY_REVIEW_NOTES'));
  assert.ok(manifestSource.includes('CLEAN_OVERLAY_VISUAL_REVIEW_STATUS'));
  assert.ok(manifestSource.includes('specialCleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('p0CleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('p1CleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('p2CleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('specialStackCleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('cleanOverlayReviewed'));
  assert.ok(manifestSource.includes('cleanOverlayPendingReview'));
  assert.ok(manifestSource.includes('visualReviewStatus'));
  assert.ok(manifestSource.includes('manualReviewNote'));
  assert.ok(manifestSource.includes('changwon-seatmap-trace-review-${slug}-clean-overlay.png'));
  assert.ok(manifestSource.includes('special-first-base-stack'));
  assert.ok(manifestSource.includes('special-third-base-stack'));
  assert.ok(manifestSource.includes('special-outfield-stack'));
  assert.ok(manifestSource.includes('traceMethod'));
  assert.ok(manifestSource.includes('traceSource'));
  assert.ok(manifestSource.includes('traceVersion'));
  assert.ok(manifestSource.includes('manualReviewed'));
  assert.ok(manifestSource.includes('pixelAlignmentStatus'));
  assert.ok(manifestSource.includes('foreignLabelAnchors'));
  assert.ok(manifestSource.includes('overlapWarnings'));
  assert.ok(manifestSource.includes('hitStrokeWidth'));
  assert.ok(manifestSource.includes('topHitOwner'));
  assert.ok(manifestSource.includes('expandedHitAreaIntercepts'));
  assert.ok(manifestSource.includes('renderedHitStatus'));
  assert.ok(manifestSource.includes('visualAlignmentStatus'));
  assert.ok(manifestSource.includes('visualReviewNote'));
  assert.ok(manifestSource.includes('lowCoverageReviewTarget'));
  assert.ok(manifestSource.includes('LOW_COVERAGE_REVIEW_THRESHOLD'));
  assert.ok(manifestSource.includes('LOW_COVERAGE_VISUAL_REVIEW_NOTES'));
  assert.ok(manifestSource.includes('hitProbes'));
  assert.ok(manifestSource.includes('representativeProbeMismatches'));
  assert.ok(manifestSource.includes('lowCoverageReviewTargets'));
  assert.ok(manifestSource.includes('lowCoverageApprovedExceptionTargets'));
  assert.ok(manifestSource.includes('PASS_WITH_APPROVED_EXCEPTION'));
  assert.ok(manifestSource.includes('releaseClassification'));
  assert.ok(manifestSource.includes('releaseClassificationReason'));
  assert.ok(manifestSource.includes('needsTraceAdjustment'));
  assert.ok(manifestSource.includes('topHitMismatches'));
  assert.ok(manifestSource.includes('expandedHitAreaInterceptWarnings'));
  assert.ok(manifestSource.includes('topRenderedHitBlockAt'));
  assert.ok(manifestSource.includes('representativePointForPolygon'));
  assert.ok(manifestSource.includes('pixelCoverageRatio'));
  assert.ok(manifestSource.includes('generatedScaledTrace'));
  assert.ok(uxReadinessSource.includes('changwon-seatmap-ux-readiness.json'));
  assert.ok(uxReadinessSource.includes('changwon-seatmap-ux-readiness.md'));
  assert.ok(uxReadinessSource.includes('searchableSelectableAreas'));
  assert.ok(uxReadinessSource.includes('specialSelectableAreas'));
  assert.ok(uxReadinessSource.includes('filterCounts'));
  assert.ok(uxReadinessSource.includes('lowCoverageApprovedExceptions'));
  assert.ok(uxReadinessSource.includes('CHANGWON_LOW_COVERAGE_APPROVED_EXCEPTION_BLOCKS'));
  assert.ok(uxReadinessSource.includes('searchChangwonSeatMapBlocks'));
  assert.ok(uxReadinessSource.includes('requiredReleaseLockZeroFields'));
  assert.ok(changwonComponentSource.includes('searchChangwonSeatMapBlocks'));
  assert.ok(changwonComponentSource.includes('changwon-search-results'));
  assert.ok(changwonComponentSource.includes('changwon-search-result-count'));
  assert.ok(changwonComponentSource.includes('changwon-search-empty'));
  assert.ok(changwonComponentSource.includes('getChangwonSearchMatchLabels'));
  assert.ok(changwonComponentSource.includes('매칭:'));
  assert.ok(changwonComponentSource.includes('changwon-filter-visible-count'));
  assert.ok(changwonComponentSource.includes('changwon-selected-status'));
  assert.ok(changwonComponentSource.includes('changwon-seatmap-fullscreen-open'));
  assert.ok(changwonComponentSource.includes('testId="changwon-bottom-sheet"'));
  assert.ok(changwonComponentSource.includes('changwon-selected-status-mobile'));
  assert.ok(auditSource.includes('Changwon debug anchor count should be 123'));
  assert.ok(auditSource.includes('p0-121-128'));
  assert.ok(auditSource.includes('special-first-base'));
  assert.ok(auditSource.includes('special-third-base'));
  assert.ok(auditSource.includes('special-outfield'));
  assert.ok(auditSource.includes('assertChangwonTopHitTargets'));
  assert.ok(auditSource.includes('assertChangwonRepresentativeHitTargets'));
  assert.ok(auditSource.includes('assertChangwonTextSearchResultSelects'));
  assert.ok(auditSource.includes('assertChangwonEmptySearchKeepsSelection'));
  assert.ok(auditSource.includes('visibleChangwonTestId'));
  assert.ok(auditSource.includes('clickChangwonZoomControl'));
  assert.ok(auditSource.includes('[data-testid="${testId}"]:visible'));
  assert.ok(auditSource.includes('Changwon representative hit mismatch'));
  assert.ok(auditSource.includes('Changwon top-hit mismatch'));
  assert.ok(auditSource.includes('changwon-seatmap-fullscreen-open'));
  assert.ok(auditSource.includes('changwon-seatmap-fullscreen-close'));
  assert.ok(auditSource.includes('changwon-search-empty'));
  assert.ok(auditSource.includes('changwon-bottom-sheet'));
  ['1루 바베큐석', '3루 라운드 테이블석', '1루 라운드 테이블석', '1루 테이블석', '외야 카운터석', '외야 가족석'].forEach((block) => {
    assert.ok(auditSource.includes(block), `${block} should be part of Changwon special QA`);
  });
  ['101', '108', '112', '114', '121', '122', '125', '128', '138', '301', '309'].forEach((block) => {
    assert.ok(manifestSource.includes(`'${block}'`), `${block} should be part of Changwon P0 review tier`);
  });
  ['101', '108', '121', '138', '201', '210', '301', '315', '401', '408', '420', '429', '431', '433'].forEach((block) => {
    assert.ok(auditSource.includes(`'${block}'`), `${block} should be part of Changwon adjacent top-hit QA`);
  });
  ['121 원정 응원석', '122 원정 응원석', '123 원정 응원석', '124 원정 응원석', '125 3루 내야석', '126 바베큐석', '127 바베큐석', '128 불펜 가족석'].forEach((detail) => {
    assert.ok(auditSource.includes(detail), `${detail} should be part of Changwon P0 click QA`);
  });
});

test('창원 좌석도 release lock 문서는 최종 검수 계약을 고정한다', () => {
  const releaseLockSource = readProjectFile('docs/changwon-seatmap-release-lock.md');

  [
    'changwon-nc-seatmap-official-2026.png',
    'CHANGWON_IMAGE_GEOMETRY',
    'CHANGWON_OFFICIAL_TRACE_REFERENCE',
    'CHANGWON_BLOCKS',
    'OFFICIAL_PNG_MANUAL_POLYGON',
    'manual-polygon-v2',
    'scripts/stadium-ux-audit.mjs',
    'totalBlocks=123',
    'searchableSelectableAreas=123',
    'confirmedHumanSignoff=11',
    'pendingHumanSignoff=0',
    'traceAdjustmentCandidates=[]',
    'generatedScaledTrace=0',
    'topHitMismatches=0',
    'expandedHitAreaInterceptWarnings=0',
    'representativeProbeMismatches=0',
    'foreignLabelAnchors=0',
    'overlapWarnings=0',
    'docs/changwon-seatmap-release-candidate.md',
    'npm run stadium:changwon:trace-manifest',
    'npm run stadium:changwon:ux-readiness',
    'node --import tsx --test src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'npm run qa:stadium:changwon:trace-review',
    'npm run test:stadium:seatmaps',
    '`npm run test:stadium:seatmaps`: PASS, 219 tests',
    'npm run build',
    'targeted polygon adjustment',
    'NEEDS_TRACE_ADJUSTMENT',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });
});

test('창원 좌석도 release candidate 문서는 UX+QA 고정 상태와 targeted adjustment 절차를 설명한다', () => {
  const releaseCandidateSource = readProjectFile('docs/changwon-seatmap-release-candidate.md');

  [
    '창원 NC파크 좌석도 release candidate',
    '2026-05-11 KST',
    'changwon-nc-seatmap-official-2026.png',
    'CHANGWON_IMAGE_GEOMETRY',
    'CHANGWON_OFFICIAL_TRACE_REFERENCE',
    'CHANGWON_BLOCKS',
    '1b3e4d22d446ba5eede5102aa746f992851d2a5083671db3c541b06c0e96ee3b',
    'totalBlocks',
    '123',
    'searchableSelectableAreas',
    'specialSelectableAreas',
    'lowCoverageApprovedExceptions',
    'PASS_WITH_APPROVED_EXCEPTION',
    '125',
    '바베큐',
    '응원석',
    '휠체어',
    '검색 결과 없음',
    'reports/stadium/changwon-seatmap-ux-readiness.json',
    'npm run stadium:changwon:trace-manifest',
    'npm run stadium:changwon:ux-readiness',
    'npm run qa:stadium:changwon:trace-review',
    'npm run test:stadium:seatmaps',
    'npm run build',
    'targeted polygon adjustment',
    'NEEDS_TRACE_ADJUSTMENT',
    '외부 야구 데이터 수집',
  ].forEach((requiredText) => {
    assert.ok(releaseCandidateSource.includes(requiredText), `release candidate should include ${requiredText}`);
  });
});

test('사직 좌석도 release lock 문서는 v2 polygon 검수 계약을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const releaseLockSource = readProjectFile('docs/sajik-seatmap-release-lock.md');
  const manifestSource = readProjectFile('scripts/sajik-seatmap-review-manifest.mjs');
  const evidenceSource = readProjectFile('scripts/sajik-seatmap-evidence-crops.mjs');
  const zonePrecisionWorksetsSource = readProjectFile('scripts/sajik-seatmap-zone-precision-worksets.mjs');
  const stage01OperatorPackageSource = readProjectFile('scripts/sajik-seatmap-stage01-operator-package.mjs');
  const stage01OperatorInputAidSource = readProjectFile('scripts/sajik-seatmap-stage01-operator-input-aid.mjs');
  const stage01ReviewBoardSource = readProjectFile('scripts/sajik-seatmap-stage01-review-board.mjs');
  const stage01PrewriteSource = readProjectFile('scripts/sajik-seatmap-stage01-prewrite.mjs');
  const stage01ApplyReadySource = readProjectFile('scripts/sajik-seatmap-stage01-apply-ready.mjs');
  const stage01PostApplyAuditSource = readProjectFile('scripts/sajik-seatmap-stage01-post-apply-audit.mjs');
  const stage01OperatorStatusSource = readProjectFile('scripts/sajik-seatmap-stage01-operator-status.mjs');
  const stage01ManualPatchPlanSource = readProjectFile('scripts/sajik-seatmap-stage01-manual-patch-plan.mjs');
  const stage01RealApprovalReadinessSource = readProjectFile('scripts/sajik-seatmap-stage01-real-approval-readiness.mjs');
  const stage01PrewriteSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01-prewrite-smoke.mjs');
  const stage01ApprovedDryRunSource = readProjectFile('scripts/sajik-seatmap-stage01-approved-dry-run.mjs');
  const stage01HandoffSource = readProjectFile('docs/sajik-seatmap-stage01-handoff.md');
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
    '`seatSectionRenderedPaths=84`',
    '`accessibilityMarkersRendered=3`',
    '`aliasOnlyRendered=0`',
    '`aliasOnlyOfficialPngBlockNotVisible=2`',
    '`officialPngBlockNotVisible=2`',
    '`alignmentLockedVerified=87`',
    '`alignmentFailures=0`',
    '`thinOutsideFailures=0`',
    '`refinedPolygons=83`',
    '`labelTopHitFailures=0`',
    '`selfIntersections=0`',
    '`singleClosedPathViolations=0`',
    '`mobileZoomControlInterceptFailures=0`',
    '`OFFICIAL_PNG_MANUAL_POLYGON`',
    '`manual-polygon-v2`',
    '`PATH_TRACED_FROM_OFFICIAL_IMAGE`',
    '`PIXEL_ALIGNED`',
    '`OFFICIAL_PNG_BLOCK_NOT_VISIBLE`',
    '예외 블럭: `011`, `903`',
    '`SAJIK_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`',
    '`SAJIK_PIXEL_ALIGNMENT_REVIEW_REQUIRED_BLOCKS`',
    '`SAJIK_ALIAS_ONLY_OFFICIAL_PNG_BLOCK_NOT_VISIBLE_BLOCKS`',
    '브라우저 label-coordinate QA는 `84 seat paths + 3 accessibility markers = 87` selectable target을 검증',
    '`311/321`',
    '`112/121`',
    '`132/142`',
    '`914/922`',
    '`723`은 모바일 390 viewport에서 zoom control 배경이 path 중심 클릭을 가로채지 않아야 한다.',
    'wrapper만 `pointer-events-none`, 버튼은 `pointer-events-auto`',
    '`reports/stadium/sajik-seatmap-trace-review.json`',
    '`reports/stadium/sajik-seatmap-trace-review.csv`',
    '`reports/stadium/sajik-seatmap-trace-review.md`',
    '`reports/stadium/sajik-seatmap-evidence-crops.json`',
    '`reports/stadium/sajik-seatmap-evidence-crops.md`',
    '`reports/stadium/sajik-seatmap-evidence-contact-sheet.png`',
    '`reports/stadium/sajik-seatmap-evidence-p0.png`',
    '`reports/stadium/sajik-seatmap-evidence-p1.png`',
    '`reports/stadium/sajik-seatmap-evidence-p2.png`',
    '`reports/stadium/sajik-seatmap-alignment-audit.json`',
    '`reports/stadium/sajik-seatmap-alignment-audit.md`',
    '`reports/stadium/sajik-seatmap-hitpath-candidate-review.json`',
    '`reports/stadium/sajik-seatmap-hitpath-candidate-review.md`',
    '`reports/stadium/sajik-seatmap-zone-precision-worksets.json`',
    '`reports/stadium/sajik-seatmap-zone-precision-worksets.md`',
    '`reports/stadium/sajik-seatmap-zone-precision-worksets.svg`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-package.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-checklist.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-aid.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.svg`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite.patch-preview.ts`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-apply-ready.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-post-apply-audit.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-status.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-manual-patch-plan.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.json`',
    '`reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.md`',
    '`docs/sajik-seatmap-stage01-handoff.md`',
    '`reports/stadium/sajik-seatmap-marker-transition-review.json`',
    '`reports/stadium/sajik-seatmap-marker-transition-review.md`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard.json`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard.md`',
    '`reports/stadium/sajik-seatmap-evidence-p0-thin-first-base.png`',
    '`reports/stadium/sajik-seatmap-evidence-p0-143-boundary-lock.png`',
    '`reports/stadium/sajik-seatmap-evidence-p0-132-142-143-seams.png`',
    '`reports/stadium/sajik-seatmap-evidence-p0-123-133-143-seams.png`',
    '`reports/stadium/sajik-seatmap-evidence-p0-central-lower-011-review.png`',
    '`reports/stadium/sajik-seatmap-evidence-p0-011-alias-only-no-hit-area.png`',
    '`reports/stadium/sajik-seatmap-evidence-p1-retraced-everytime.png`',
    '`reports/stadium/sajik-seatmap-advisory-playwright-review.md`',
    '`../output/playwright/stadium-ux-sajik-validate/stadium-mobile-smoke-summary.md`',
    '`../output/playwright/stadium-ux-sajik-validate/mobile-390.png`',
    '`../output/playwright/stadium-ux-sajik-validate/desktop-1440.png`',
    '모든 운영 polygon은 `M/L/Z` 단일 폐합 path여야 한다.',
    'self-intersection은 허용하지 않는다.',
    '`MAP_SELECTABLE` 블럭의 label 좌표 클릭은 렌더 순서상 자기 block을 최상위 hit-area로 가져야 한다.',
    '`132/142/143`, `123/133/143` 주변 polygon은 서로 vertex intrusion, edge crossing, edge overlap을 만들면 안 된다.',
    '`OFFICIAL_PNG_BLOCK_NOT_VISIBLE` 예외 블럭은 클릭 정합 release gate와 SVG hit-area 렌더링에서 제외하되',
    '일반 seat path layer는 `sectionKind=SEAT_SECTION` 84개만 `<path>`로 렌더링한다.',
    '접근성 marker layer는 `sectionKind=ACCESSIBILITY_MARKER` 3개를 실제 polygon `<path>` hit-area로 렌더링한다.',
    'runtime renderer는 `imageGeometry.d` fallback을 사용하지 않는다.',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    'npm run stadium:sajik:alignment-audit',
    'npm run stadium:sajik:evidence',
    'npm run stadium:sajik:hitpath-review',
    'npm run stadium:sajik:zone-precision-worksets',
    'npm run stadium:sajik:stage01-operator-input-aid',
    'npm run stadium:sajik:stage01-review-board',
    'npm run stadium:sajik:stage01-prewrite',
    'npm run stadium:sajik:stage01-apply-ready',
    'npm run stadium:sajik:stage01-post-apply-audit',
    'npm run stadium:sajik:stage01-operator-status',
    'npm run stadium:sajik:stage01-manual-patch-plan',
    'npm run stadium:sajik:stage01-real-approval-readiness',
    'npm run stadium:sajik:stage01-prewrite-smoke',
    'npm run stadium:sajik:stage01-approved-dry-run',
    'npm run stadium:sajik:marker-transition-review',
    'node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts',
    'node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'npm run qa:stadium:sajik:trace-review',
    'npm run stadium:sajik:pr-scope-guard',
    'npm run build',
    'docs/sajik-seatmap-editor-v18-roadmap.md',
    'Editor v1.8 구현은 이번 release lock에 포함하지 않는다.',
    'PR scope guard는 `doesNotRunGitAdd=true`, `safeToRunBulkGitAdd=false` 상태를 유지해야 하며',
    'PR scope guard report는 `stagingManifest`를 포함해야 하며 `releasePayloadFileCount=37`',
    'forbidden staging commands',
    '`SAJIK_OFFICIAL_TRACE_REFERENCE`의 `expectedPointCount` 또는 `expectedArea`가 현재 path와 다르다.',
    '모바일 390에서 `723` path 중심 클릭이 zoom control 배경에 가로채인다.',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    '"stadium:sajik:evidence": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && npm run stadium:sajik:trace-manifest && node --import tsx scripts/sajik-seatmap-evidence-crops.mjs"',
    '"stadium:sajik:advisory-playwright": "npm run stadium:sajik:pixel-components && node --import tsx scripts/sajik-seatmap-alignment-audit.mjs --allow-failures && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs"',
    '"stadium:sajik:hitpath-review": "node --import tsx scripts/sajik-seatmap-hitpath-candidate-review.mjs"',
    '"stadium:sajik:zone-precision-worksets": "npm run stadium:sajik:hitpath-review && node --import tsx scripts/sajik-seatmap-zone-precision-worksets.mjs"',
    '"stadium:sajik:stage01-operator-package": "npm run stadium:sajik:zone-precision-worksets && node --import tsx scripts/sajik-seatmap-stage01-operator-package.mjs"',
    '"stadium:sajik:stage01-operator-input-aid": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-operator-input-aid.mjs"',
    '"stadium:sajik:stage01-review-board": "npm run stadium:sajik:stage01-operator-input-aid && node --import tsx scripts/sajik-seatmap-stage01-review-board.mjs"',
    '"stadium:sajik:stage01-prewrite": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-prewrite.mjs"',
    '"stadium:sajik:stage01-apply-ready": "npm run stadium:sajik:stage01-prewrite && node --import tsx scripts/sajik-seatmap-stage01-apply-ready.mjs"',
    '"stadium:sajik:stage01-post-apply-audit": "npm run stadium:sajik:stage01-apply-ready && node --import tsx scripts/sajik-seatmap-stage01-post-apply-audit.mjs"',
    '"stadium:sajik:stage01-operator-status": "npm run stadium:sajik:stage01-post-apply-audit && node --import tsx scripts/sajik-seatmap-stage01-operator-status.mjs"',
    '"stadium:sajik:stage01-manual-patch-plan": "npm run stadium:sajik:stage01-operator-status && node --import tsx scripts/sajik-seatmap-stage01-manual-patch-plan.mjs"',
    '"stadium:sajik:stage01-real-approval-readiness": "npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-manual-patch-plan && node --import tsx scripts/sajik-seatmap-stage01-real-approval-readiness.mjs"',
    '"stadium:sajik:stage01-prewrite-smoke": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-prewrite-smoke.mjs"',
    '"stadium:sajik:stage01-approved-dry-run": "npm run stadium:sajik:stage01-operator-package && node --import tsx scripts/sajik-seatmap-stage01-approved-dry-run.mjs"',
    '"stadium:sajik:marker-transition-review": "node --import tsx scripts/sajik-seatmap-marker-transition-review.mjs"',
    '"stadium:sajik:pr-scope-guard": "node scripts/sajik-seatmap-pr-scope-guard.mjs"',
    '"qa:stadium:sajik:trace-review": "npm run stadium:sajik:evidence && node --import tsx scripts/sajik-seatmap-advisory-playwright-review.mjs && npm run qa:stadium:sajik:mobile && npm run stadium:sajik:alignment-audit"',
    '"qa:stadium:sajik:polygon-v2": "npm run stadium:sajik:dataset-export -- --check && npm run stadium:sajik:alignment-audit && npm run stadium:sajik:evidence && npm run stadium:sajik:hitpath-review && npm run stadium:sajik:zone-precision-worksets && npm run stadium:sajik:stage01-operator-input-aid && npm run stadium:sajik:stage01-review-board && npm run stadium:sajik:stage01-prewrite && npm run stadium:sajik:stage01-apply-ready && npm run stadium:sajik:stage01-post-apply-audit && npm run stadium:sajik:stage01-operator-status && npm run stadium:sajik:stage01-manual-patch-plan && npm run stadium:sajik:stage01-real-approval-readiness && npm run stadium:sajik:stage01-prewrite-smoke && npm run stadium:sajik:stage01-approved-dry-run && npm run stadium:sajik:marker-transition-review && node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts && node --import tsx --test --test-name-pattern \\"사직|Sajik\\" src/components/StadiumGuideRuntimeSeatMaps.test.ts && npm run stadium:sajik:editor-regression && npm run stadium:sajik:pr-scope-guard && npm run build"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    'expectedPointCount',
    'expectedArea',
    'officialPngManualPolygon',
    'manualPolygonV2',
    'mapSelectable',
    'aliasOnlyOfficialPngBlockNotVisible',
    'refinedPolygons',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `Sajik manifest should include ${requiredText}`);
  });

  [
    'SAJIK_ZONE_PRECISION_WORKSETS_V1',
    'P0-A',
    'P0-B',
    'P0-C',
    'P1-A',
    'P1-B',
    'P2-A',
    'ZONE_HOME_PLATE_SMALL',
    'ZONE_FIRST_BASE_THIN_121_125',
    'ZONE_FIRST_BASE_THIN_131_143',
    'ZONE_CENTRAL_TABLE_ADJACENT',
    'ZONE_CENTRAL_UPPER_ADJACENT',
    'ZONE_CENTRAL_DEFERRED',
    'ZONE_OUTFIELD_GUARD',
    '723',
    '914',
    '922',
    'productionWriteAllowed: false',
  ].forEach((requiredText) => {
    assert.ok(zonePrecisionWorksetsSource.includes(requiredText), `Sajik zone precision worksets should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    'Stage 01 P0',
    'P0-A',
    'P0-B',
    'P0-C',
    'EXPECTED_STAGE01_ROWS = 16',
    'correctedPath',
    'correctedLabelX',
    'correctedLabelY',
    'productionWriteAllowed: false',
    'existingOperatorInput',
    'preservationStatus',
    'decisionOptions',
    'KEEP_CURRENT',
    'existingEditableRows',
    'preservedEditableRows',
    'ignoredExistingEditableRows',
    'OPERATOR_INPUT_PRESERVATION_FAILED',
    'OPERATOR_INPUT_OUTSIDE_STAGE01',
    'DUPLICATE_EXISTING_OPERATOR_INPUT',
    'sajik-seatmap-stage01-operator-input.json',
  ].forEach((requiredText) => {
    assert.ok(stage01OperatorPackageSource.includes(requiredText), `Sajik Stage 01 package should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    'EXPECTED_STAGE01_ROWS = 16',
    'READY_FOR_PREWRITE',
    'REJECTED',
    'NEEDS_RETRACE',
    'KEEP_CURRENT',
    'INVALID',
    'keepCurrentRows',
    'nextAction',
    'nextActionContract',
    'FILL_OR_DECIDE',
    'RUN_PREWRITE',
    'FIX_OPERATOR_INPUT',
    'NO_PATCH_PREVIEW',
    'decisionOptions',
    'decisions-recorded',
    'ready-for-prewrite',
    'APPROVAL_FIELD_REQUIRED',
    'REVIEWED_AT_INVALID_DATE',
    'CORRECTED_PATH_',
    'DECISION_NOTE_RECOMMENDED',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
    'sajik-seatmap-stage01-operator-input-aid.json',
    'sajik-seatmap-stage01-operator-input-aid.csv',
    'sajik-seatmap-stage01-operator-input-aid.md',
    'External baseball data, web search, crawling',
  ].forEach((requiredText) => {
    assert.ok(stage01OperatorInputAidSource.includes(requiredText), `Sajik Stage 01 operator input aid should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_REVIEW_BOARD_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1',
    'EXPECTED_STAGE01_ROWS = 16',
    'sajik-seatmap-stage01-review-board.json',
    'sajik-seatmap-stage01-review-board.csv',
    'sajik-seatmap-stage01-review-board.md',
    'sajik-seatmap-stage01-entry-sheet.csv',
    'sajik-seatmap-stage01-entry-sheet.md',
    'sajik-seatmap-stage01-review-board.svg',
    'FILL_OR_DECIDE',
    'RUN_PREWRITE',
    'FIX_OPERATOR_INPUT',
    'NO_PATCH_PREVIEW',
    'KEEP_CURRENT',
    'operatorDecisionOptions',
    'approvedRequiredFields',
    'keepCurrentRule',
    'patchPreviewEligible',
    'Invalid Rows First',
    'Example approved entry',
    'Example keep-current entry',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'does not infer coordinates',
    'IMAGE_HREF',
    'currentVisualPath',
    'currentLabelPoint',
    'editableFieldsPresent',
  ].forEach((requiredText) => {
    assert.ok(stage01ReviewBoardSource.includes(requiredText), `Sajik Stage 01 review board should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_PREWRITE_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    'EXPECTED_STAGE01_ROWS = 16',
    'ready-for-data-patch',
    'waiting-for-operator',
    'correctedPath',
    'topHitIssuesFor',
    'operatorInputSchema',
    'KEEP_CURRENT',
    'APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX',
    'patchReviewRows',
    'Patch Preview Review',
    'visualPathLocked',
    'pointCountDelta',
    'areaDelta',
    'boundsDelta',
    'labelPointDelta',
    'buildSajikSeatMapSectionPatchPayload',
    'formatSajikSeatMapSectionPatchTsFragment',
    'productionDataChanged: false',
    'sajik-seatmap-stage01-prewrite.patch-preview.ts',
  ].forEach((requiredText) => {
    assert.ok(stage01PrewriteSource.includes(requiredText), `Sajik Stage 01 prewrite should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_APPLY_READY_V1',
    'SAJIK_STAGE01_PREWRITE_V1',
    'ready-for-manual-apply',
    'waiting-for-operator',
    'MANUAL_DATA_PATCH_REVIEW_ONLY',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
    'VISUAL_PATH_CHANGED',
    'PATCH_PAYLOAD_INVALID',
    'diffSummary',
    'pointCountBefore',
    'areaBefore',
    'boundsDelta',
    'labelPointDelta',
    'sajik-seatmap-stage01-apply-ready.json',
  ].forEach((requiredText) => {
    assert.ok(stage01ApplyReadySource.includes(requiredText), `Sajik Stage 01 apply-ready should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_POST_APPLY_AUDIT_V1',
    'SAJIK_STAGE01_PREWRITE_V1',
    'not-applied',
    '--require-applied',
    'CURRENT_HIT_PATH_NOT_APPLIED',
    'CURRENT_LABEL_POINT_NOT_APPLIED',
    'CURRENT_LABEL_X_NOT_APPLIED',
    'CURRENT_LABEL_Y_NOT_APPLIED',
    'readOnly: true',
    'sourceDataWritePerformed: false',
    'sajik-seatmap-stage01-post-apply-audit.json',
    'sajik-seatmap-stage01-post-apply-audit.md',
  ].forEach((requiredText) => {
    assert.ok(stage01PostApplyAuditSource.includes(requiredText), `Sajik Stage 01 post-apply audit should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_OPERATOR_STATUS_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    'SAJIK_STAGE01_PREWRITE_V1',
    'SAJIK_STAGE01_APPLY_READY_V1',
    'SAJIK_STAGE01_POST_APPLY_AUDIT_V1',
    'PENDING',
    'REJECTED',
    'NEEDS_RETRACE',
    'KEEP_CURRENT',
    'INVALID',
    'APPLIED',
    'NOT_APPLIED',
    'ready-for-manual-apply',
    'manualPatchChecklist',
    'MANUAL_PATCH_REQUIRED',
    'sajik-seatmap-stage01-operator-status.json',
    'sajik-seatmap-stage01-operator-status.csv',
    'sajik-seatmap-stage01-operator-status.md',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
  ].forEach((requiredText) => {
    assert.ok(stage01OperatorStatusSource.includes(requiredText), `Sajik Stage 01 operator status should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1',
    'SAJIK_STAGE01_OPERATOR_STATUS_V1',
    'SAJIK_STAGE01_PREWRITE_V1',
    'ready-for-manual-apply',
    'waiting-for-operator',
    'MANUAL_PATCH_REQUIRED',
    '--require-ready',
    'REQUIRE_READY_NOT_SATISFIED',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
    'targetSourceFile',
    'src/data/sajikSeatData.ts',
    'WRITABLE_SOURCE_FIELDS',
    'LOCKED_SOURCE_FIELDS',
    'Source Edit Contract',
    'sourceEditChecklist',
    'writableSourceFields',
    'lockedSourceFields',
    'formatSajikSeatMapSectionPatchTsFragment',
    'diffSummary',
    'visualPathLocked',
    'hitPathChanged',
    'labelPointChanged',
    'sajik-seatmap-stage01-manual-patch-plan.json',
    'sajik-seatmap-stage01-manual-patch-plan.csv',
    'sajik-seatmap-stage01-manual-patch-plan.md',
  ].forEach((requiredText) => {
    assert.ok(stage01ManualPatchPlanSource.includes(requiredText), `Sajik Stage 01 manual patch plan should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1',
    'APPROVED_READY',
    'APPROVED_NOT_APPLIED',
    'APPROVED_APPLIED',
    'APPROVED_BLOCKED',
    'SECTION_KIND_NOT_WRITABLE',
    'VISUAL_PATH_CHANGED_WITHOUT_APPROVAL',
    'APPROVED_NO_GEOMETRY_DELTA',
    'WRITABLE_SOURCE_FIELDS',
    'LOCKED_SOURCE_FIELDS',
    'sourceDataWritePerformed',
    'productionWriteAllowed',
    'productionDataChanged',
    'sajik-seatmap-stage01-real-approval-readiness.json',
    'sajik-seatmap-stage01-real-approval-readiness.csv',
    'sajik-seatmap-stage01-real-approval-readiness.md',
    'targetSourceFile',
    'src/data/sajikSeatData.ts',
    'read-only readiness gate; manual review patch only',
  ].forEach((requiredText) => {
    assert.ok(
      stage01RealApprovalReadinessSource.includes(requiredText),
      `Sajik Stage 01 real approval readiness should include ${requiredText}`,
    );
  });

  [
    'SAJIK_STAGE01_PREWRITE_SMOKE_V1',
    'approved-no-delta',
    'approved-with-delta',
    'approved-applied-after-manual-patch',
    'pending-only',
    'invalid-approved-row',
    'invalid-path-row',
    'invalid-label-row',
    'unknown-section-row',
    'forbidden-alias-marker-row',
    'decision-rows',
    'mixed-approved-decision-pending',
    'operator-input-preservation',
    'operatorPackagePreservationPassed',
    'preservationStatus',
    'existingEditableRows',
    'ignoredExistingEditableRows',
    'inputAidStatus',
    'inputAidReadyRows',
    'inputAidAction',
    'inputAidNextActionIncludes',
    'inputAidRejectedRows',
    'inputAidNeedsRetraceRows',
    'inputAidKeepCurrentRows',
    'inputAidInvalidRows',
    'READY_FOR_PREWRITE',
    'decisions-recorded',
    'ready-for-data-patch',
    'ready-for-manual-apply',
    'APPROVED_NO_GEOMETRY_DELTA',
    'rowWarningAbsent',
    'APPROVAL_FIELD_REQUIRED:reviewer',
    'MIN_POINT_COUNT_REQUIRED',
    'LABEL_OUTSIDE_POLYGON',
    'SECTION_NOT_FOUND',
    'SECTION_KIND_NOT_WRITABLE',
    'NEEDS_RETRACE',
    'KEEP_CURRENT',
    'postApplyStatus',
    'operatorStatus',
    'operatorRowStatus',
    'manualPatchPlanStatus',
    'manualPatchPlanRows',
    'manualPatchPlanAction',
    'realApprovalReadinessStatus',
    'realApprovalReadinessApprovedNotAppliedRows',
    'realApprovalReadinessApprovedAppliedRows',
    'realApprovalReadinessApprovedBlockedRows',
    'MANUAL_PATCH_REQUIRED',
    'APPLIED',
    'applied',
    'NOT_APPLIED',
    'not-applied',
    'APPROVED_NOT_APPLIED',
    'APPROVED_APPLIED',
    'APPROVED_BLOCKED',
    'APPLY_MANUAL_PATCH',
    'VERIFY_APPLIED',
    'tampered-visual-path-readiness',
    'tampered-target-source-readiness',
    'VISUAL_PATH_CHANGED_WITHOUT_APPROVAL',
    'TARGET_SOURCE_FILE_MISMATCH',
    'sourceDataWritePerformed',
    'productionDataChanged: false',
    'sajik-seatmap-stage01-operator-input-aid.json',
    'sajik-seatmap-stage01-apply-ready.json',
    'sajik-seatmap-stage01-post-apply-audit.json',
    'sajik-seatmap-stage01-operator-status.json',
    'sajik-seatmap-stage01-manual-patch-plan.json',
    'sajik-seatmap-stage01-real-approval-readiness.json',
    'sajik-seatmap-stage01-prewrite-smoke.json',
  ].forEach((requiredText) => {
    assert.ok(stage01PrewriteSmokeSource.includes(requiredText), `Sajik Stage 01 smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_APPROVED_DRY_RUN_V1',
    "DRY_RUN_TARGET_SECTION_ID = '021'",
    'STAGE01_DRY_RUN_OPERATOR',
    'ready-for-data-patch',
    'ready-for-manual-apply',
    'not-applied',
    'MANUAL_PATCH_REQUIRED',
    'APPROVED_NOT_APPLIED',
    'APPLY_MANUAL_PATCH',
    'NOT_APPLIED',
    'writableSourceFields',
    'lockedSourceFields',
    'visualPathLocked',
    'sourceDataWritePerformed',
    'productionWriteAllowed',
    'productionDataChanged',
    'realApprovalReadinessStatus',
    'realApprovalReadinessContract',
    'approvedNotAppliedRows',
    'readinessRow',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
    'productionDataChanged: false',
    'sajik-seatmap-stage01-approved-dry-run.json',
    'sajik-seatmap-stage01-approved-dry-run.md',
    'sajik-seatmap-stage01-operator-input.json',
    'sajik-seatmap-stage01-prewrite.json',
    'sajik-seatmap-stage01-apply-ready.json',
    'sajik-seatmap-stage01-post-apply-audit.json',
    'sajik-seatmap-stage01-operator-status.json',
    'sajik-seatmap-stage01-manual-patch-plan.json',
    'sajik-seatmap-stage01-real-approval-readiness.json',
    'src/data/sajikSeatData.ts',
    "sectionId: '021'",
    'must not edit src/data/sajikSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(stage01ApprovedDryRunSource.includes(requiredText), `Sajik Stage 01 approved dry-run should include ${requiredText}`);
  });

  [
    'Sajik Seatmap Stage 01 Handoff',
    'target rows: `021/022/031/032/121/122/123/124/125/131/132/133/134/135/142/143`',
    'smoke status: `passed`, `cases=13/13`',
    'approved dry-run status: `passed`, `target=021`, `manualPatchRows=1`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`',
    'operator package preservation: `passed`',
    'operator input aid: `waiting-for-operator`, `pending=16`',
    'review board: `waiting-for-operator`, `pending=16`, `ready=0`, `invalid=0`',
    'entry sheet: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`',
    'real approval readiness: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-real-approval-readiness.md`',
    'preservationStatus',
    'ignoredExistingEditableRows',
    'Example approved row',
    'Example rejected row',
    'Example retrace request row',
    'Example keep-current row',
    'operatorDecisionOptions',
    'approvedRequiredFields',
    'patchPreviewEligible',
    'Source Edit Contract',
    'writable source fields',
    'locked source fields',
    '`FILL_OR_DECIDE`',
    '`RUN_PREWRITE`',
    '`FIX_OPERATOR_INPUT`',
    '`NO_PATCH_PREVIEW`',
    'post-apply audit status: `waiting-for-operator`',
    'operator status board: `waiting-for-operator`, `pending=16`',
    'manual patch plan: `waiting-for-operator`, `manualPatchRows=0`',
    'real approval readiness status: `waiting-for-operator`, `approved=0`, `manualPatchRows=0`, `sourceDataWritePerformed=false`',
    '`operatorDecision=APPROVED`',
    '`correctedPath`',
    '`correctedLabelX`',
    '`correctedLabelY`',
    '`operator input aid` is read-only',
    '`ready-for-manual-apply`',
    '`post-apply audit` is read-only',
    '`operator status board` is read-only',
    '`manual patch plan` is read-only',
    'Approved Dry-Run Contract',
    'Real Approval Readiness Contract',
    'APPROVED_READY',
    'APPROVED_NOT_APPLIED',
    'APPROVED_APPLIED',
    'APPROVED_BLOCKED',
    'ready-for-data-patch',
    'MANUAL_PATCH_REQUIRED',
    '`productionWriteAllowed=false`',
    '`productionDataChanged=false`',
    'npm run stadium:sajik:stage01-post-apply-audit -- --require-applied',
    'npm run stadium:sajik:stage01-operator-input-aid',
    'npm run stadium:sajik:stage01-review-board',
    'npm run stadium:sajik:stage01-operator-status',
    'npm run stadium:sajik:stage01-manual-patch-plan',
    'npm run stadium:sajik:stage01-real-approval-readiness',
    'npm run stadium:sajik:stage01-approved-dry-run',
    'apply `imageGeometry.hitPath`',
    'update legacy-compatible `labelX` and `labelY`',
    'keep `imageGeometry.visualPath` unchanged',
    'Stage 02 Entry Conditions',
    'No automatic write to `src/data/sajikSeatData.ts`',
  ].forEach((requiredText) => {
    assert.ok(stage01HandoffSource.includes(requiredText), `Sajik Stage 01 handoff should include ${requiredText}`);
  });

  [
    'sajik-seatmap-evidence-contact-sheet.png',
    'sajik-seatmap-evidence-${tier.toLowerCase()}.png',
    'tierOrder = [',
    'OFFICIAL_PNG_MANUAL_POLYGON',
    'manual-polygon-v2',
    'aliasOnlyOfficialPngBlockNotVisible',
    'p0-143-boundary-lock',
    'p0-132-142-143-seams',
    'p0-123-133-143-seams',
    'p0-011-alias-only-no-hit-area',
    'rendersMapHitArea',
  ].forEach((requiredText) => {
    assert.ok(evidenceSource.includes(requiredText), `Sajik evidence script should include ${requiredText}`);
  });

  [
    '사직 polygon은 단일 폐합 path이고 자기 교차가 없다',
    '사직 label 좌표 클릭은 최상위 polygon hit target과 일치한다',
    '사직 P0 143 주변 경계는 인접 블럭 polygon을 침범하지 않는다',
    '사직 polygon 정밀화는 단순 사각형 전체 fallback으로 회귀하지 않는다',
    'SAJIK_THIN_ALIGNMENT_STRICT_BLOCKS',
    'expectedArea',
    'SAJIK_TRACE_AREA_TOLERANCE_PX2',
  ].forEach((requiredText) => {
    assert.ok(dataTestSource.includes(requiredText), `Sajik data test should include ${requiredText}`);
  });

  [
    'pointer-events-none absolute right-3 top-3',
    'pointer-events-auto flex h-7 w-7',
    'pointer-events-auto min-h-7 min-w-10',
    'data-map-interaction-status',
    "block.sectionKind === 'SEAT_SECTION'",
    "block.sectionKind === 'ACCESSIBILITY_MARKER'",
    'data-testid="sajik-seat-section-layer"',
    'data-testid="sajik-accessibility-markers-layer"',
    'sajik-accessibility-marker-',
  ].forEach((requiredText) => {
    assert.ok(svgSource.includes(requiredText), `Sajik SVG should keep zoom control hit-through contract ${requiredText}`);
  });
  assert.doesNotMatch(svgSource, /\?\? block\.imageGeometry\.d/);
});

test('Stadium QA runner는 generic smoke 포트 충돌 회피와 실패 진단을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');

  assert.ok(packageSource.includes('"qa:stadium:mobile": "node scripts/run-stadium-isolated-qa.mjs ALL"'));
  assert.ok(packageSource.includes('"qa:stadium:mobile:smoke": "node scripts/run-stadium-isolated-qa.mjs JAMSIL:SMOKE"'));
  assert.ok(packageSource.includes('"qa:stadium:mobile:attached"'));
  assert.ok(packageSource.includes('"qa:stadium:mobile:smoke:attached"'));
  assert.ok(runnerSource.includes("modeToken === 'SMOKE'"));
  assert.ok(runnerSource.includes('SMOKE_VIEWPORTS'));
  assert.ok(runnerSource.includes('portListenerDiagnostics'));
  assert.ok(runnerSource.includes('auditChildPid='));
  assert.ok(runnerSource.includes('classifyQaFailure'));
  assert.ok(runnerSource.includes('failureCategory='));
  assert.ok(runnerSource.includes("'hmr-reload'"));
  assert.ok(runnerSource.includes("'coordinate'"));
  assert.ok(runnerSource.includes("'server'"));
  assert.ok(runnerSource.includes('Output dir:'));
  assert.ok(runnerSource.includes('Summary path:'));
  assert.ok(runnerSource.includes('Post-run listener PID(s):'));
});

test('대전 trace review QA는 P2 retired alias 제거 계약과 145개 traced 기준을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const evidenceSource = readProjectFile('scripts/daejeon-seatmap-evidence-crops.mjs');
  const manifestSource = readProjectFile('scripts/daejeon-seatmap-review-manifest.mjs');
  const anchorCropSource = readProjectFile('scripts/daejeon-anchor-review-crops.mjs');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(packageSource.includes('"stadium:daejeon:evidence"'));
  assert.ok(packageSource.includes('"stadium:daejeon:anchor-crops"'));
  assert.ok(packageSource.includes('npm run stadium:daejeon:trace-manifest && node --import tsx scripts/daejeon-seatmap-evidence-crops.mjs && npm run stadium:daejeon:anchor-crops'));
  assert.ok(packageSource.includes('"qa:stadium:daejeon:trace-review"'));
  assert.ok(packageSource.includes('STADIUM_UX_DAEJEON_DEBUG_CAPTURE=1 npm run qa:stadium:daejeon:mobile'));
  assert.ok(evidenceSource.includes('clearGeneratedCropImages'));
  assert.ok(evidenceSource.includes('DAEJEON_P2_DEDUPLICATED_ALIASES'));
  assert.ok(evidenceSource.includes('Retired alias has no operational geometry'));
  assert.ok(manifestSource.includes('anchorReviewCrops'));
  assert.ok(manifestSource.includes('special-400-accessible-first'));
  assert.ok(manifestSource.includes('special-425-426-third-accessible'));
  assert.ok(anchorCropSource.includes('daejeon-anchor-review-crops.json'));
  assert.ok(anchorCropSource.includes('special-accessible-outfield-third'));
  assert.ok(auditSource.includes('verifyDaejeonRetiredP2BlocksRemoved'));
  assert.ok(auditSource.includes('Daejeon official-traced label coordinate click target count should be 145'));
  assert.ok(auditSource.includes('outfield-reserved-third-423-330__424'));
  assert.ok(auditSource.includes('Daejeon image/path transform layer contract failed at ${label}'));
  assert.ok(auditSource.includes("assertDaejeonTransformLayerContract(1.34, 'manual-zoom-1.35')"));
  assert.ok(auditSource.includes('Daejeon visible highlight path should use imageGeometry.d'));
  assert.ok(auditSource.includes("selectPoint: { x: 143, y: 663 }"));
  assert.ok(auditSource.includes("selectPoint: { x: 109, y: 589 }"));
  [
    'innings-vip-400__400',
    'splash-jacuzzi-425__425',
    'splash-caravan-426__426',
    'central-accessible__center',
    'first-infield-accessible__first-infield',
    'third-infield-accessible__third-infield',
    'outfield-accessible-third__left-outfield',
    'outfield-accessible-first__right-outfield',
  ].forEach((id) => {
    assert.ok(auditSource.includes(id), `${id} should remain in Daejeon special/accessibility QA`);
  });
  [
    'outfield-reserved-first-301-404__301',
    'outfield-reserved-first-301-404__404',
    'outfield-reserved-third-423-330__327',
    'outfield-reserved-third-423-330__423',
  ].forEach((id) => {
    assert.ok(auditSource.includes(id), `${id} should remain in retired P2 removal QA`);
  });
});

test('대전 좌석도 release lock 문서는 최종 검수 계약을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const releaseLockSource = readProjectFile('docs/daejeon-seatmap-release-lock.md');
  const releaseGateSource = readProjectFile('scripts/daejeon-seatmap-release-gate.mjs');
  const changeGuardSource = readProjectFile('scripts/daejeon-seatmap-change-guard.mjs');
  const operatorHandoffSource = readProjectFile('scripts/daejeon-seatmap-operator-handoff.mjs');
  const operatorApprovalSource = readProjectFile('scripts/daejeon-seatmap-operator-approval.mjs');
  const operatorApprovalTestSource = readProjectFile('scripts/daejeon-seatmap-operator-approval.test.mjs');
  const manifestSource = readProjectFile('scripts/daejeon-seatmap-review-manifest.mjs');
  const coverageReportSource = readProjectFile('scripts/daejeon-seatmap-coverage-report.mjs');
  const anchorCropSource = readProjectFile('scripts/daejeon-anchor-review-crops.mjs');
  const anchorCropContractSource = readProjectFile('scripts/daejeon-seatmap-anchor-contract.mjs');
  const blockEvidenceCropSource = readProjectFile('scripts/daejeon-block-evidence-crops.mjs');
  const visualDiffSource = readProjectFile('scripts/daejeon-anchor-visual-diff.mjs');
  const visualBaselineSource = readProjectFile('src/data/daejeonAnchorVisualBaseline.json');
  const geometryDiffSource = readProjectFile('scripts/daejeon-seatmap-geometry-diff.mjs');
  const geometryBaselineSource = readProjectFile('src/data/daejeonGeometryBaseline.json');

  [
    '공식 이미지 좌표계: `920x1060`',
    '`DAEJEON_BLOCKS.length === 145`',
    '`officialImageTraced=145`',
    '`needsOperatorReview=0`',
    '`DAEJEON_TRACE_REVIEW_QUEUE.length === 0`',
    '`labelTopHitFailures=0`',
    '`DAEJEON_COORDINATE_CHANGE_IMPACT_V1`',
    '`missingImpact=0`',
    '`DAEJEON_ANCHOR_VISUAL_BASELINE_V1`',
    '`changedCropCount=0`',
    '`metadataMismatchCount=0`',
    '`DAEJEON_GEOMETRY_BASELINE_V1`',
    '`changedBlockCount=0`',
    '`missingBlockCount=0`',
    '`extraBlockCount=0`',
    "`sourceConfidence='OFFICIAL'`",
    "`traceMethod='PATH_TRACED_FROM_OFFICIAL_IMAGE'`",
    "`traceStatus='OFFICIAL_IMAGE_TRACED'`",
    '`special-425-426-third-accessible`',
    '`outfield-reserved-first-301-404__301`',
    '`outfield-reserved-third-423-330__423`',
    '`reports/stadium/daejeon-seatmap-trace-review.md`',
    '`reports/stadium/daejeon-seatmap-p2-evidence-crops.md`',
    '`../output/playwright/daejeon-anchor-review/daejeon-anchor-review-crops.md`',
    '`src/data/daejeonAnchorVisualBaseline.json`',
    '`reports/stadium/daejeon-seatmap-visual-diff.md`',
    '`src/data/daejeonGeometryBaseline.json`',
    '`reports/stadium/daejeon-seatmap-geometry-diff.md`',
    '`reports/stadium/daejeon-seatmap-block-evidence-crops.md`',
    '`../output/playwright/stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md`',
    '`reports/stadium/daejeon-seatmap-release-gate.md`',
    '표시용 highlight/stroke는 `imageGeometry.d`만 사용한다.',
    '클릭/터치 hit path는 `hitAreaD ?? imageGeometry.d`만 사용한다.',
    '외부 야구 데이터 수집, 웹 검색, 크롤링, 핫링크 좌석도 복사는 사용하지 않는다.',
    'npm run qa:stadium:daejeon:release-lock',
    'npm run qa:stadium:daejeon:change-guard',
    'npm run test:stadium:daejeon:operator-approval',
    'npm run stadium:daejeon:operator-handoff',
    'npm run stadium:daejeon:operator-approval',
    'npm run stadium:daejeon:operator-approval:status',
    'npm run stadium:daejeon:operator-approval:approve -- --approved-by "operator-name" --notes "검수 완료"',
    'npm run stadium:daejeon:operator-approval:verify',
    'npm run qa:stadium:daejeon:release-approved',
    '`reports/stadium/daejeon-seatmap-operator-handoff.md`',
    '`reports/stadium/daejeon-seatmap-operator-handoff.json`',
    '`reports/stadium/daejeon-seatmap-operator-approval.json`',
    '`PENDING_OPERATOR_APPROVAL`',
    '`APPROVED`',
    '`STALE_APPROVAL`',
    '`--require-approved`',
    '`--approved-by`',
    '`--notes`',
    '임시 디렉터리 fixture',
    '운영 approval JSON을 수정하지 않는다',
    'release gate 리포트의 `operatorApproval` 섹션',
    'release-lock does not require operator approval',
    'JSON을 직접 편집하지 않고',
    '마지막 release gate 이후 변경됐는지 mtime으로 확인한다',
    '운영자는 trace manifest, P2 evidence, anchor crops, 브라우저 QA summary를 한 문서에서 확인하고 승인/반려 체크리스트를 처리한다.',
    'coordinate impact missingImpact=0',
    'anchor crop count: `28`',
    'anchor visual baseline: `expectedCropCount=28`',
    'anchor visual diff: `baselineCropCount=28`, `currentCropCount=28`, `changedCropCount=0`, `metadataMismatchCount=0`',
    '`first-104-106-detail`',
    '`third-116-121-detail`',
    'visual diff changedCropCount=0',
    'geometry diff changedBlockCount=0',
    'npm run stadium:daejeon:block-crops -- --codes 104,105',
    '파란 overlay는 visible `imageGeometry.d`, 빨간 dashed overlay는 click-only `hitAreaD`',
    '`PENDING_OPERATOR_APPROVAL`을 배포 승인으로 인정하지 않는다.',
    '승인된 handoff/release gate hash가 현재 산출물과 다르면 `STALE_APPROVAL`로 실패하고 운영 릴리즈를 차단한다.',
    '데이터 테스트, evidence 생성, anchor visual diff, geometry diff, coverage report, 브라우저 trace-review QA, production build',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    '"qa:stadium:daejeon:release-lock": "node --import tsx scripts/daejeon-seatmap-release-gate.mjs"',
    '"stadium:daejeon:block-crops": "node --import tsx scripts/daejeon-block-evidence-crops.mjs"',
    '"stadium:daejeon:visual-diff": "node --import tsx scripts/daejeon-anchor-visual-diff.mjs"',
    '"stadium:daejeon:visual-baseline": "npm run stadium:daejeon:anchor-crops && node --import tsx scripts/daejeon-anchor-visual-diff.mjs --write-baseline"',
    '"stadium:daejeon:geometry-diff": "node --import tsx scripts/daejeon-seatmap-geometry-diff.mjs"',
    '"stadium:daejeon:geometry-baseline": "node --import tsx scripts/daejeon-seatmap-geometry-diff.mjs --write-baseline"',
    '"qa:stadium:daejeon:change-guard": "node scripts/daejeon-seatmap-change-guard.mjs"',
    '"test:stadium:daejeon:operator-approval": "node --test scripts/daejeon-seatmap-operator-approval.test.mjs"',
    '"stadium:daejeon:operator-handoff": "npm run qa:stadium:daejeon:change-guard && node scripts/daejeon-seatmap-operator-handoff.mjs"',
    '"stadium:daejeon:operator-approval": "npm run stadium:daejeon:operator-handoff && node scripts/daejeon-seatmap-operator-approval.mjs"',
    '"stadium:daejeon:operator-approval:status": "node scripts/daejeon-seatmap-operator-approval.mjs --status"',
    '"stadium:daejeon:operator-approval:approve": "npm run qa:stadium:daejeon:change-guard && node scripts/daejeon-seatmap-operator-approval.mjs --approve"',
    '"stadium:daejeon:operator-approval:verify": "node scripts/daejeon-seatmap-operator-approval.mjs --require-approved"',
    '"qa:stadium:daejeon:release-approved": "npm run qa:stadium:daejeon:change-guard && npm run stadium:daejeon:operator-approval:verify"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    'EXPECTED_BLOCKS = 145',
    'EXPECTED_TRACED = 145',
    'EXPECTED_REVIEW = 0',
    'EXPECTED_P2_ALIASES = 11',
    'EXPECTED_ANCHOR_CROPS = 28',
    "'src/data/daejeonSeatData.test.ts'",
    "'src/components/StadiumGuideRuntimeSeatMaps.test.ts'",
    "'npm'",
    "'stadium:daejeon:visual-diff'",
    "'stadium:daejeon:geometry-diff'",
    "'qa:stadium:daejeon:trace-review'",
    "'build'",
    'daejeon-seatmap-release-gate.json',
    'daejeon-seatmap-release-gate.md',
    'readOperatorApprovalSummary',
    'operatorApproval',
    'MISSING_APPROVAL',
    'UNKNOWN_APPROVAL_STATUS',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'hashMatchesReleaseGate',
    'deferred-to-release-approved',
    'release-lock does not require operator approval',
    'npm run qa:stadium:daejeon:release-approved',
    'overflowFailureCount === 0',
    'labelTopHitFailureCount === 0',
    "traceMethod !== 'PATH_TRACED_FROM_OFFICIAL_IMAGE'",
    'missingAnchorCropReviewMetadata',
    'DAEJEON_ANCHOR_CROP_REVIEW_V2',
    'reviewMetadataComplete',
    'priorityCounts',
    'reviewPriority',
    'riskTags',
    'p0AnchorCrops.length === 4',
    'p0RegressionTestIds',
    'p1RegressionTestIds',
    'p1RegressionWarningCropIds',
    'p2RegressionTestIds',
    'p2ManualOnlyCropIds',
    'p2RegressionWarningCropIds',
    'coordinateChangeImpactSummary',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'DAEJEON_ANCHOR_VISUAL_BASELINE_V1',
    'visualDiffSummary',
    'visualDiff',
    'geometryDiffSummary',
    'geometryDiff',
    'changedCropCount === 0',
    'changedBlockCount === 0',
    'DAEJEON_GEOMETRY_BASELINE_V1',
    'metadataMismatchCount === 0',
    'missingImpact',
    'manifest and coverage coordinate impact counts must match',
    'jsonEqual',
    'P0 anchor crops missing data regression tests',
  ].forEach((requiredText) => {
    assert.ok(releaseGateSource.includes(requiredText), `release gate should include ${requiredText}`);
  });

  [
    'WATCH_FILES',
    'WATCH_DIRECTORIES',
    "'src/data/daejeonSeatData.ts'",
    "'src/data/daejeonAnchorVisualBaseline.json'",
    "'src/data/daejeonGeometryBaseline.json'",
    "'src/components/stadium/daejeon'",
    "'src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.png'",
    "'docs/daejeon-seatmap-release-lock.md'",
    "relativePath.startsWith('scripts/')",
    "path.basename(relativePath).startsWith('daejeon-')",
    'releaseGatePath',
    'validateFreshness',
    'stat.mtimeMs > generatedAtMs + staleToleranceMs',
    'status:passed',
    'expected?.totalBlocks === EXPECTED_BLOCKS',
    'expected?.officialImageTraced === EXPECTED_TRACED',
    'expected?.needsOperatorReview === EXPECTED_REVIEW',
    'precisionAudit?.labelTopHitFailureCount === 0',
    'coordinateChangeImpact',
    'coordinateChangeImpactSummary',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'DAEJEON_ANCHOR_VISUAL_BASELINE_V1',
    'visualDiff',
    'changedCropCount === 0',
    'geometryDiff',
    'changedBlockCount === 0',
    'DAEJEON_GEOMETRY_BASELINE_V1',
    'metadataMismatchCount === 0',
    'overflowFailureCount === 0',
    'Re-run `npm run qa:stadium:daejeon:release-lock`',
  ].forEach((requiredText) => {
    assert.ok(changeGuardSource.includes(requiredText), `change guard should include ${requiredText}`);
  });

  [
    'daejeon-seatmap-operator-handoff.json',
    'daejeon-seatmap-operator-handoff.md',
    'releaseGatePath',
    'validateReleaseGate',
    'validateArtifacts',
    'approvalChecklist',
    'lockedDecisions',
    'keyAnchorCropIds',
    'traceManifest',
    'p2Evidence',
    'anchorCrops',
    'visualDiff',
    'geometryDiff',
    'browserQa',
    'labelTopHitFailureCount',
    'overflowFailureCount',
    'P2 Retired Alias Policy',
    'Operator Review Steps',
    'Approval Checklist',
    'Operator Approval',
    'approvedHandoffHash',
    'approvedReleaseGateHash',
    'STALE_APPROVAL',
    'operator-approval:status',
    'operator-approval:approve',
    '--approved-by',
    '--notes',
    'qa:stadium:daejeon:release-approved',
    '--require-approved',
    'Locked Decisions',
    'READY_FOR_OPERATOR_REVIEW',
    'special-425-426-third-accessible',
    '?daejeonDebug=1',
    'passCriteria',
    'rejectCriteria',
    'representativeBlocks',
    'reviewPriority',
    'riskTags',
    'regressionTestIds',
    'reviewMode',
    'P0 -> P1 -> P2',
    'P0 crop은 자동 회귀 테스트가 존재해야',
    'P1/P2 자동 후보 crop은 release gate warning 없이 회귀 테스트 ID가 연결되어야',
    'MANUAL_CROP_ONLY',
    'Anchor Crop Regression Coverage',
    'Anchor Visual Diff',
    'visualDiffSummary',
    'changedCropCount=0',
    'Geometry Fingerprint Diff',
    'geometryDiffSummary',
    'changedBlockCount=0',
    'Coordinate Change Impact',
    'coordinateChangeImpactSummary',
    'Anchor Crop Review Criteria',
    'DAEJEON_ANCHOR_CROP_REVIEW_V2',
  ].forEach((requiredText) => {
    assert.ok(operatorHandoffSource.includes(requiredText), `operator handoff should include ${requiredText}`);
  });

  [
    'DAEJEON_ANCHOR_VISUAL_BASELINE_V1',
    'visualDiffContract',
    'baselinePath',
    'daejeonAnchorVisualBaseline.json',
    'daejeon-seatmap-visual-diff.json',
    'daejeon-seatmap-visual-diff.md',
    '--write-baseline',
    'changedCropCount',
    'metadataMismatchCount',
    'P2 MANUAL_CROP_ONLY',
    'baseline 갱신은 운영자 검수 후',
  ].forEach((requiredText) => {
    assert.ok(visualDiffSource.includes(requiredText), `visual diff script should include ${requiredText}`);
  });

  [
    '"contract": "DAEJEON_ANCHOR_VISUAL_BASELINE_V1"',
    '"reviewContractVersion": "DAEJEON_ANCHOR_CROP_REVIEW_V2"',
    '"coordinateChangeImpactContract": "DAEJEON_COORDINATE_CHANGE_IMPACT_V1"',
    '"expectedCropCount": 28',
    '"id": "first-101-109"',
    '"id": "third-121-124"',
    '"sha256"',
  ].forEach((requiredText) => {
    assert.ok(visualBaselineSource.includes(requiredText), `visual baseline should include ${requiredText}`);
  });

  [
    'DAEJEON_GEOMETRY_BASELINE_V1',
    'geometryDiffContract',
    'baselinePath',
    'daejeonGeometryBaseline.json',
    'daejeon-seatmap-geometry-diff.json',
    'daejeon-seatmap-geometry-diff.md',
    '--write-baseline',
    'changedBlockCount',
    'changedFields',
    'imageGeometry.d',
    'hitAreaD',
    'labelX',
    'labelY',
    'anchorCropIds',
    'regressionTestIds',
    'baseline 갱신은 운영자 검수 후',
  ].forEach((requiredText) => {
    assert.ok(geometryDiffSource.includes(requiredText), `geometry diff script should include ${requiredText}`);
  });

  [
    '"contract": "DAEJEON_GEOMETRY_BASELINE_V1"',
    '"coordinateChangeImpactContract": "DAEJEON_COORDINATE_CHANGE_IMPACT_V1"',
    '"expectedBlockCount": 145',
    '"id": "first-infield-b-101-108__104"',
    '"fingerprint"',
    '"imageGeometry"',
    '"hitAreaD"',
  ].forEach((requiredText) => {
    assert.ok(geometryBaselineSource.includes(requiredText), `geometry baseline should include ${requiredText}`);
  });

  [
    'coordinateChangeImpact',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'anchorCropIds',
    'regressionTestIds',
    'reviewPriority',
    'reviewMode',
    'riskTags',
    'manualOnlyReasons',
    'missingImpactBlockIds',
    'tracedWithoutRegressionBlockIds',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `Daejeon manifest should include coordinate impact contract ${requiredText}`);
  });

  [
    'daejeon-seatmap-anchor-contract.mjs',
    'buildCoordinateChangeImpact',
    'coordinateChangeImpactContract',
  ].forEach((requiredText) => {
    assert.ok(coverageReportSource.includes(requiredText), `Daejeon coverage report should use shared impact contract ${requiredText}`);
  });

  [
    'DAEJEON_ANCHOR_CROP_REVIEW_V2',
    'DAEJEON_COORDINATE_CHANGE_IMPACT_V1',
    'anchorReviewCropDefinitions',
    'buildAnchorReviewCrops',
    'buildAnchorImpactByBlockId',
    'coordinateImpactForBlock',
    'buildCoordinateChangeImpact',
    'coordinateChangeImpactContract',
    'passCriteria',
    'rejectCriteria',
    'representativeBlocks',
    'p0ReviewCropIds',
    'p1ReviewCropIds',
    'riskTagsByCropId',
    'regressionTestIdsByCropId',
    'P0_FIRST_101_109_SEQUENCE_DRIFT_REGRESSION',
    'P0_THIRD_121_124_SPLIT_COLOR_REGRESSION',
    'P0_THIRD_120_122_BOUNDARY_REGRESSION',
    'P0_THIRD_113_117_DRIFT_REGRESSION',
    'P1_HOME_100_STACK_REGRESSION',
    'P1_FIRST_109_112_SEQUENCE_REGRESSION',
    'P1_CASS_200_SPECIAL_CELL_REGRESSION',
    'P1_THIRD_113_120_SEQUENCE_REGRESSION',
    'P1_FIRST_201_212_SMALL_BLOCK_REGRESSION',
    'P1_FIRST_4F_301_413_SEQUENCE_REGRESSION',
    'P1_THIRD_4F_414_330_SEQUENCE_REGRESSION',
    'P1_OUTFIELD_500_509_SEQUENCE_REGRESSION',
    'P2_FIRST_107_110_DETAIL_REGRESSION',
    'P2_THIRD_119_121_DETAIL_REGRESSION',
    'P2_THIRD_115_117_DETAIL_REGRESSION',
    'P2_THIRD_113_114_DETAIL_REGRESSION',
    'P2_THIRD_213_225_SEQUENCE_REGRESSION',
    'P2_THIRD_221_225_DETAIL_REGRESSION',
    'P2_THIRD_213_219_DETAIL_REGRESSION',
    'P2_SPECIAL_400_ACCESSIBLE_FIRST_REGRESSION',
    'P2_SPECIAL_425_426_THIRD_ACCESSIBLE_REGRESSION',
    'P2_SPECIAL_ACCESSIBLE_CENTER_REGRESSION',
    'P2_SPECIAL_ACCESSIBLE_OUTFIELD_THIRD_REGRESSION',
    'p2ManualOnlyCropIds',
    'MANUAL_CROP_ONLY',
    'defaultPassCriteria',
    'defaultRejectCriteria',
    'cropCriteriaByGroup',
    '104 단일 셀, 105-109',
    '121 split-color',
    'required review order',
  ].forEach((requiredText) => {
    assert.ok(
      `${anchorCropSource}\n${anchorCropContractSource}`.includes(requiredText),
      `anchor crop contract should include ${requiredText}`,
    );
  });

  [
    'DAEJEON_BLOCK_EVIDENCE_CROP_V1',
    'defaultBlockCodes',
    'daejeon-seatmap-block-evidence-crops.json',
    'daejeon-seatmap-block-evidence-crops.md',
    'output/playwright',
    'daejeon-block-review',
    '--blocks',
    '--codes',
    '--all',
    'imageGeometry.d',
    'hitAreaD',
    'blue=imageGeometry.d',
    'red=hitAreaD',
    'anchorCropIds',
    'regressionTestIds',
    'reviewPriority',
    'reviewMode',
    'DAEJEON_SEATMAP_IMAGE.imageWidth',
    'DAEJEON_SEATMAP_IMAGE.imageHeight',
  ].forEach((requiredText) => {
    assert.ok(blockEvidenceCropSource.includes(requiredText), `block evidence crop script should include ${requiredText}`);
  });

  [
    'daejeon-seatmap-operator-approval.json',
    'handoffJsonPath',
    'handoffMarkdownPath',
    'releaseGateJsonPath',
    'sha256File',
    'export const main',
    'rootDir = defaultFrontendRoot',
    'stdout = console.log',
    'now = () => new Date().toISOString()',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'STALE_APPROVAL',
    'approvedAt',
    'approvedBy',
    'approvedHandoffHash',
    'approvedHandoffMarkdownHash',
    'approvedReleaseGateHash',
    'handoffGeneratedAt',
    'releaseGateGeneratedAt',
    'getOptionValue',
    'approveRequested',
    'statusRequested',
    'requireApproved',
    '--approve',
    '--status',
    '--approved-by',
    '--notes',
    '--require-approved',
    'writeApprovedApproval',
    'printApprovalStatus',
    'hashMatches',
    'operator approval file must exist before --approve',
    '--approve requires --approved-by',
    'APPROVED operator approval required; approval file is missing',
    'APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL',
    'STALE_APPROVAL: operator approval hash does not match current handoff/release gate artifacts',
    'operator handoff must be READY_FOR_OPERATOR_REVIEW',
    'release gate must be passed',
  ].forEach((requiredText) => {
    assert.ok(operatorApprovalSource.includes(requiredText), `operator approval should include ${requiredText}`);
  });

  [
    "import { main } from './daejeon-seatmap-operator-approval.mjs'",
    'mkdtemp',
    'daejeon-operator-approval-',
    'reports/stadium',
    'runApproval',
    'rootDir',
    'stdout: (line) => lines.push(line)',
    'PENDING_OPERATOR_APPROVAL',
    'APPROVED',
    'STALE_APPROVAL',
    '--status',
    '--approve',
    '--approved-by',
    '--notes',
    '--require-approved',
    'status mode does not mutate the approval file',
    'passes require-approved verification',
    'APPROVED operator approval required; current status is PENDING_OPERATOR_APPROVAL',
    '--approve requires --approved-by',
    'STALE_APPROVAL: operator approval hash does not match current handoff\\/release gate artifacts',
  ].forEach((requiredText) => {
    assert.ok(operatorApprovalTestSource.includes(requiredText), `operator approval test should include ${requiredText}`);
  });

  [
    'releaseLockDocumentPath',
    'releaseGateReportPath',
    'browserQaSummaryPath',
    'docs/daejeon-seatmap-release-lock.md',
    'daejeon-seatmap-release-gate.md',
    'stadium-ux-daejeon-validate/stadium-mobile-smoke-summary.md',
    'npm run qa:stadium:daejeon:release-lock',
  ].forEach((requiredText) => {
    assert.ok(manifestSource.includes(requiredText), `manifest should include release lock contract ${requiredText}`);
  });
});

test('광주 trace review 스크립트는 M/N 마커 비선택 클릭 검사를 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const gwangjuDataSource = readProjectFile('src/data/gwangjuSeatData.ts');
  const manifestSource = readProjectFile('scripts/gwangju-seatmap-review-manifest.mjs');
  const operatorTemplateSource = readProjectFile('scripts/gwangju-seatmap-operator-template.mjs');
  const operatorTemplateValidationSource = readProjectFile('scripts/gwangju-seatmap-operator-template-validate.mjs');
  const operatorTemplateApplyPlanSource = readProjectFile('scripts/gwangju-seatmap-operator-template-apply-plan.mjs');
  const operatorHandoffSource = readProjectFile('scripts/gwangju-seatmap-operator-handoff.mjs');
  const operatorStatusSource = readProjectFile('scripts/gwangju-seatmap-operator-status.mjs');
  const releasePackageSource = readProjectFile('scripts/gwangju-seatmap-release-package.mjs');
  const releaseGateSource = readProjectFile('scripts/gwangju-seatmap-release-gate.mjs');
  const releaseAuditSource = readProjectFile('scripts/gwangju-seatmap-release-audit.mjs');
  const releaseScopeGuardSource = readProjectFile('scripts/gwangju-seatmap-release-scope-guard.mjs');
  const prStagingPlanSource = readProjectFile('scripts/gwangju-seatmap-pr-staging-plan.mjs');
  const operatorApplySource = readProjectFile('scripts/gwangju-seatmap-operator-apply.mjs');
  const operatorWriteSmokeSource = readProjectFile('scripts/gwangju-seatmap-operator-write-smoke.mjs');
  const operatorWriteGuardSource = readProjectFile('scripts/gwangju-seatmap-operator-write-guard.mjs');
  const pixelComponentSource = readProjectFile('scripts/gwangju-seatmap-pixel-components.mjs');
  const lowMarginCandidateSource = readProjectFile('scripts/gwangju-seatmap-low-margin-candidates.mjs');
  const operatorRunbookSource = readProjectFile('docs/gwangju-seatmap-operator-runbook.md');
  const releaseHandoffSource = readProjectFile('docs/gwangju-seatmap-release-handoff.md');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );
  const requiredMarkerClickLabels = [
    'M/EV marker near 527/528',
    'M/EV marker near 518/519',
    'M/EV marker near 508/509',
    'N/5F table marker near 535',
    'N/5F table marker near 524',
    'N/5F table marker near 512/513',
    'N/5F table marker near 501/502',
  ];

  assert.ok(packageSource.includes('"stadium:gwangju:pixel-components"'));
  assert.ok(packageSource.includes('"stadium:gwangju:trace-manifest"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:pixel-components && node --import tsx scripts/gwangju-seatmap-review-manifest.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-template"'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-template:validate"'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-template:validate:strict"'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-template:apply-plan"'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-template:apply-plan:require-ready"'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-template:gate"'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-handoff"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:trace-manifest && npm run stadium:gwangju:operator-template:gate && node --import tsx scripts/gwangju-seatmap-operator-handoff.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-status"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-operator-status.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:release-package"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:operator-status && node --import tsx scripts/gwangju-seatmap-release-package.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:release-scope-guard"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-release-scope-guard.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:pr-staging-plan"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:release-scope-guard && node --import tsx scripts/gwangju-seatmap-pr-staging-plan.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:pr-staging-review"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:pr-staging-plan && node --import tsx scripts/gwangju-seatmap-pr-staging-plan.mjs --review'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-apply"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-operator-apply.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-write-smoke"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-operator-write-smoke.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-write-guard"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-operator-write-guard.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-write-guard:require-ready"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-operator-write-guard.mjs --require-ready'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-prewrite-gate"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:operator-status && npm run stadium:gwangju:operator-write-smoke && npm run stadium:gwangju:operator-write-guard:require-ready'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-apply:write"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:operator-prewrite-gate && node --import tsx scripts/gwangju-seatmap-operator-apply.mjs --write --require-ready'));
  assert.ok(packageSource.includes('"stadium:gwangju:operator-postwrite-gate"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:operator-handoff && npm run stadium:gwangju:operator-status && npm run test:stadium:seatmaps && npm run qa:stadium:gwangju:trace-review && npm run build'));
  assert.ok(packageSource.includes('"qa:stadium:gwangju:trace-review"'));
  assert.ok(packageSource.includes('STADIUM_UX_GWANGJU_DEBUG_CAPTURE=1 npm run qa:stadium:gwangju:mobile'));
  assert.ok(packageSource.includes('"stadium:gwangju:zone-precision-worksets"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:trace-manifest && node --import tsx scripts/gwangju-seatmap-zone-precision-worksets.mjs'));
  assert.ok(packageSource.includes('"stadium:gwangju:low-margin-candidates"'));
  assert.ok(packageSource.includes('npm run stadium:gwangju:trace-manifest && node --import tsx scripts/gwangju-seatmap-low-margin-candidates.mjs'));
  assert.ok(packageSource.includes('"qa:stadium:gwangju:release-gate"'));
  assert.ok(packageSource.includes('node --import tsx scripts/gwangju-seatmap-release-gate.mjs'));
  assert.ok(packageSource.includes('"qa:stadium:gwangju:release-verify:preoperator"'));
  assert.ok(packageSource.includes('npm run qa:stadium:gwangju:release-gate && npm run stadium:gwangju:pr-staging-plan && npm run stadium:gwangju:release-audit'));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_DEEP_CHECK: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_DEBUG_CAPTURE: '1'"));
  assert.ok(pixelComponentSource.includes('gwangju-seatmap-pixel-components.json'));
  assert.ok(lowMarginCandidateSource.includes('GWANGJU_LOW_MARGIN_CANDIDATES_V1'));
  assert.ok(lowMarginCandidateSource.includes('gwangju-seatmap-low-margin-candidates.json'));
  assert.ok(lowMarginCandidateSource.includes('gwangju-seatmap-low-margin-candidates.csv'));
  assert.ok(lowMarginCandidateSource.includes('gwangju-seatmap-low-margin-candidates.md'));
  assert.ok(lowMarginCandidateSource.includes('NUMBERED_PIXEL_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('SPECIAL_PIXEL_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('COMPONENT_RECALL_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('COMPONENT_IOU_REVIEW_TARGET'));
  assert.ok(lowMarginCandidateSource.includes('P1_P2_BOUNDARY_WATCH'));
  assert.ok(lowMarginCandidateSource.includes('doesNotModifyDataFile'));
  assert.ok(lowMarginCandidateSource.includes('official PNG 2200x1159 only'));
  assert.ok(manifestSource.includes('GWANGJU_OFFICIAL_TRACE_REFERENCE'));
  assert.ok(manifestSource.includes('GWANGJU_TRACE_REVIEW_SUMMARY'));
  assert.ok(manifestSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(manifestSource.includes('GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE'));
  assert.ok(manifestSource.includes('baseTraceBlocks'));
  assert.ok(manifestSource.includes('derivedOperatorBlockRanges'));
  assert.ok(manifestSource.includes('derivedRangeDisplayBlocks'));
  assert.ok(manifestSource.includes('traceStatus'));
  assert.ok(manifestSource.includes('traceSource'));
  assert.ok(manifestSource.includes('traceVersion'));
  assert.ok(manifestSource.includes('previousTraceVersion'));
  assert.ok(manifestSource.includes('traceGeneration'));
  assert.ok(manifestSource.includes('fullRetracedBlocks'));
  assert.ok(manifestSource.includes('blocksChangedFromPreviousTrace'));
  assert.ok(manifestSource.includes('totalRetracePointDelta'));
  assert.ok(manifestSource.includes('previousAnchorDeltaPx'));
  assert.ok(manifestSource.includes('previousBoundsDeltaPx'));
  assert.ok(manifestSource.includes('previousPixelCoverageDelta'));
  assert.ok(manifestSource.includes('pathChangedFromPreviousTrace'));
  assert.ok(manifestSource.includes('manualReviewed'));
  assert.ok(manifestSource.includes('pixelAlignmentStatus'));
  assert.ok(manifestSource.includes('expectedBounds'));
  assert.ok(manifestSource.includes('pixelCoverageRatio'));
  assert.ok(manifestSource.includes('officialComponentRecall'));
  assert.ok(manifestSource.includes('componentIoU'));
  assert.ok(manifestSource.includes('componentCoverageWarnings'));
  assert.ok(manifestSource.includes('overlapWarnings'));
  assert.ok(manifestSource.includes('cleanOverlayArtifacts'));
  assert.ok(manifestSource.includes('GWANGJU_ZONE_PRECISION_WORKSETS'));
  assert.ok(manifestSource.includes('zonePrecisionWorksets'));
  assert.ok(manifestSource.includes('zonePrecisionWarnings'));
  assert.ok(manifestSource.includes('zoneOverlayArtifacts'));
  assert.ok(manifestSource.includes('gwangju-seatmap-trace-review-overlay.png'));
  assert.ok(manifestSource.includes('gwangju-seatmap-trace-review-clean-crops'));
  assert.ok(manifestSource.includes('gwangju-seatmap-trace-review-zone-crops'));
  assert.ok(gwangjuDataSource.includes("'reviewer', 'reviewedAt'"));
  assert.ok(operatorTemplateSource.includes('GWANGJU_OPERATOR_SECTION_REQUIREMENTS'));
  assert.ok(operatorTemplateSource.includes('GWANGJU_PENDING_OPERATOR_SECTIONS'));
  assert.ok(operatorTemplateSource.includes('gwangju-seatmap-operator-template.json'));
  assert.ok(operatorTemplateSource.includes('gwangju-seatmap-operator-template.md'));
  assert.ok(operatorTemplateSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1'));
  assert.ok(operatorTemplateSource.includes('preservedOperatorInputSections'));
  assert.ok(operatorTemplateSource.includes('Regenerating this template preserves operatorInput values by section id.'));
  assert.ok(operatorTemplateSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(operatorTemplateSource.includes('browser CSS pixels'));
  assert.ok(operatorTemplateSource.includes('external crawling'));
  assert.ok(operatorTemplateSource.includes('operatorInput'));
  assert.ok(operatorTemplateSource.includes('officialBlocks'));
  assert.ok(operatorTemplateSource.includes('level'));
  assert.ok(operatorTemplateSource.includes('points'));
  assert.ok(operatorTemplateSource.includes('labelX'));
  assert.ok(operatorTemplateSource.includes('labelY'));
  assert.ok(operatorTemplateValidationSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1'));
  assert.ok(operatorTemplateValidationSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_V1'));
  assert.ok(operatorTemplateValidationSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorTemplateValidationSource.includes('LEVEL_REQUIRED_OR_INVALID'));
  assert.ok(operatorTemplateValidationSource.includes("VALID_LEVELS = new Set(['1F', '2F', '3F', '4F', '5F', 'OUTFIELD'])"));
  assert.ok(operatorTemplateValidationSource.includes('--strict'));
  assert.ok(operatorTemplateValidationSource.includes('LABEL_OUTSIDE_POLYGON'));
  assert.ok(operatorTemplateValidationSource.includes('POLYGON_SELF_INTERSECTION'));
  assert.ok(operatorTemplateValidationSource.includes('This validator does not modify gwangjuSeatData.ts'));
  assert.ok(operatorTemplateValidationSource.includes('gwangju-seatmap-operator-template-validation.json'));
  assert.ok(operatorTemplateValidationSource.includes('gwangju-seatmap-operator-template-validation.csv'));
  assert.ok(operatorTemplateValidationSource.includes('gwangju-seatmap-operator-template-validation.md'));
  assert.ok(operatorTemplateApplyPlanSource.includes('GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1'));
  assert.ok(operatorTemplateApplyPlanSource.includes('GWANGJU_OPERATOR_POLYGON_TEMPLATE_VALIDATION_V1'));
  assert.ok(operatorTemplateApplyPlanSource.includes('VALIDATION_INPUT_SHA256_MISMATCH'));
  assert.ok(operatorTemplateApplyPlanSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorTemplateApplyPlanSource.includes('doesNotModifyDataFile'));
  assert.ok(operatorTemplateApplyPlanSource.includes('blockGeometry('));
  assert.ok(operatorTemplateApplyPlanSource.includes('gwangju-seatmap-operator-template-apply-plan.json'));
  assert.ok(operatorTemplateApplyPlanSource.includes('gwangju-seatmap-operator-template-apply-plan.csv'));
  assert.ok(operatorTemplateApplyPlanSource.includes('gwangju-seatmap-operator-template-apply-plan.md'));
  assert.ok(operatorHandoffSource.includes('GWANGJU_OPERATOR_HANDOFF_V1'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-operator-handoff.json'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-operator-handoff.csv'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-operator-handoff.md'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-trace-review-overlay.png'));
  assert.ok(operatorHandoffSource.includes('gwangju-seatmap-trace-review-clean-crops'));
  assert.ok(operatorHandoffSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorHandoffSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(operatorHandoffSource.includes('npm run stadium:gwangju:operator-status'));
  assert.ok(operatorHandoffSource.includes('npm run stadium:gwangju:operator-write-smoke'));
  assert.ok(operatorHandoffSource.includes('npm run stadium:gwangju:operator-write-guard:require-ready'));
  assert.ok(operatorHandoffSource.includes('validate:strict'));
  assert.ok(operatorHandoffSource.includes('apply-plan:require-ready'));
  assert.ok(operatorStatusSource.includes('GWANGJU_OPERATOR_STATUS_V1'));
  assert.ok(operatorStatusSource.includes('gwangju-seatmap-operator-status.json'));
  assert.ok(operatorStatusSource.includes('gwangju-seatmap-operator-status.csv'));
  assert.ok(operatorStatusSource.includes('gwangju-seatmap-operator-status.md'));
  assert.ok(operatorStatusSource.includes('doesNotModifyDataFile'));
  assert.ok(operatorStatusSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(operatorStatusSource.includes('GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE'));
  assert.ok(operatorStatusSource.includes('baseTraceBlocks'));
  assert.ok(operatorStatusSource.includes('derivedRanges'));
  assert.ok(operatorStatusSource.includes('derivedRangeDisplayBlocks'));
  assert.ok(operatorStatusSource.includes('EXISTING_NUMBERED_BLOCKS_ONLY'));
  assert.ok(operatorStatusSource.includes('STRICT_VALIDATION_NOT_RUN'));
  assert.ok(operatorStatusSource.includes('STRICT_VALIDATION_PENDING_OPERATOR_INPUT'));
  assert.ok(operatorStatusSource.includes('NO_VALID_DATA_DIFF_SECTIONS'));
  assert.ok(operatorStatusSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorStatusSource.includes('npm run stadium:gwangju:operator-write-smoke'));
  assert.ok(operatorStatusSource.includes('npm run stadium:gwangju:operator-write-guard'));
  assert.ok(operatorStatusSource.includes('npm run stadium:gwangju:operator-apply'));
  assert.ok(operatorStatusSource.includes('npm run stadium:gwangju:operator-apply:write'));
  assert.ok(operatorStatusSource.includes('npm run stadium:gwangju:operator-postwrite-gate'));
  assert.ok(operatorStatusSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorStatusSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(operatorStatusSource.includes('browser CSS pixels'));
  assert.ok(operatorStatusSource.includes('resized screenshots'));
  assert.ok(operatorStatusSource.includes('external crawling'));
  assert.ok(operatorStatusSource.includes('web-search-based baseball data'));
  assert.ok(operatorStatusSource.includes('third-party copied seatmap images'));
  assert.ok(releasePackageSource.includes('GWANGJU_DERIVED_RANGE_RELEASE_PACKAGE_V1'));
  assert.ok(releasePackageSource.includes('gwangju-seatmap-release-package.json'));
  assert.ok(releasePackageSource.includes('gwangju-seatmap-release-package.md'));
  assert.ok(releasePackageSource.includes('releaseHandoff'));
  assert.ok(releasePackageSource.includes('docs/gwangju-seatmap-release-handoff.md'));
  assert.ok(releasePackageSource.includes('DERIVED_RANGE_FILTER_AND_BADGE_ONLY'));
  assert.ok(releasePackageSource.includes('doesNotModifyDataFile'));
  assert.ok(releasePackageSource.includes('REUSES_EXISTING_TRACE_ONLY'));
  assert.ok(releasePackageSource.includes('GWANGJU_EXPECTED_TRACE_BLOCK_COUNT'));
  assert.ok(releasePackageSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(releasePackageSource.includes('MISSING_RELEASE_ARTIFACT'));
  assert.ok(releasePackageSource.includes('OPERATOR_STATUS_NOT_PENDING'));
  assert.ok(releasePackageSource.includes('BROWSER_QA_STATUS_NOT_PASSED'));
  assert.ok(releasePackageSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releasePackageSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(releasePackageSource.includes('browser CSS pixels'));
  assert.ok(releasePackageSource.includes('web-search-based baseball data'));
  assert.ok(releasePackageSource.includes('좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다.'));
  assert.ok(releaseGateSource.includes('GWANGJU_SEATMAP_RELEASE_GATE_V1'));
  assert.ok(releaseGateSource.includes('releaseAcceptance'));
  assert.ok(releaseGateSource.includes("requiredStatus: 'passed'"));
  assert.ok(releaseGateSource.includes('requiredBlockers: 0'));
  assert.ok(releaseGateSource.includes('requiredCompletedSteps: commandPlan.length'));
  assert.ok(releaseGateSource.includes("requiredReleasePackageStatus: 'ready'"));
  assert.ok(releaseGateSource.includes("requiredOperatorStatus: 'pending'"));
  assert.ok(releaseGateSource.includes("requiredBrowserQaStatus: 'passed'"));
  assert.ok(releaseGateSource.includes('requiredActiveTraceBlocks: 111'));
  assert.ok(releaseGateSource.includes('completedSteps'));
  assert.ok(releaseGateSource.includes('totalSteps'));
  assert.ok(releaseGateSource.includes("['check', 'expected', 'actual']"));
  assert.ok(releaseGateSource.includes('gwangju-seatmap-release-gate.json'));
  assert.ok(releaseGateSource.includes('gwangju-seatmap-release-gate.md'));
  assert.ok(releaseGateSource.includes("args: ['run', 'stadium:gwangju:operator-status']"));
  assert.ok(releaseGateSource.includes("args: ['run', 'test:stadium:seatmaps']"));
  assert.ok(releaseGateSource.includes("args: ['run', 'qa:stadium:gwangju:trace-review']"));
  assert.ok(releaseGateSource.includes("args: ['run', 'stadium:gwangju:release-package']"));
  assert.ok(releaseGateSource.includes("args: ['run', 'build']"));
  assert.ok(releaseGateSource.includes('doesNotModifyDataFile'));
  assert.ok(releaseGateSource.includes('RELEASE_PACKAGE_NOT_READY'));
  assert.ok(releaseGateSource.includes('OPERATOR_STATUS_NOT_PENDING'));
  assert.ok(releaseGateSource.includes('BROWSER_QA_NOT_PASSED'));
  assert.ok(releaseGateSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releaseGateSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(releaseGateSource.includes('web-search-based baseball data'));
  assert.ok(releaseGateSource.includes('좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다.'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-release-scope-guard.json'));
  assert.ok(releaseAuditSource.includes('releaseScopeGuard'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_NOT_PASSED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_BLOCKERS_PRESENT'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_UNEXPECTED_FILES_PRESENT'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_INCLUDED_FILE_COUNT_CHANGED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_INCLUDED_FILES_MISSING'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_EXTRA_INCLUDED_FILES'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_SEPARATE_DIRTY_WORK_BASELINE_CHANGED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_SEPARATE_EXPANSION_DISABLED'));
  assert.ok(releaseAuditSource.includes('classified additional separate dirty work files'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_PATCH_SEPARATION_STATUS_CHANGED'));
  assert.ok(releaseAuditSource.includes('RELEASE_SCOPE_GUARD_PACKAGE_MIXED_STATUS_MISSING'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-pr-staging-plan.json'));
  assert.ok(releaseAuditSource.includes('prStagingPlan'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_STATUS_CHANGED'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_GIT_ADD_ENABLED'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_PACKAGE_MIXED_STATUS_MISSING'));
  assert.ok(releaseAuditSource.includes('STALE_PR_STAGING_PLAN_BEFORE_SCOPE_GUARD'));
  assert.ok(releaseAuditSource.includes('STALE_RELEASE_SCOPE_GUARD_BEFORE_HANDOFF'));
  assert.ok(releaseAuditSource.includes("requiredScopeGuardStatus: 'passed'"));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardUnexpectedFiles: 0'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardBlockers: 0'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardIncludedFiles: EXPECTED_RELEASE_PAYLOAD_FILE_COUNT'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardSeparateDirtyWorkBaselineFiles: SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT'));
  assert.ok(releaseAuditSource.includes('allowsClassifiedSeparateDirtyWorkExpansion: true'));
  assert.ok(releaseAuditSource.includes("requiredPatchSeparationReadiness: 'review-required'"));
  assert.ok(releaseAuditSource.includes("requiredPrStagingPlanStatus: 'review-required'"));
  assert.ok(releaseAuditSource.includes('requiredPrStagingPlanDoesNotRunGitAdd: true'));
  assert.ok(releaseAuditSource.includes('scopeGuardSummary'));
  assert.ok(releaseAuditSource.includes('expectedIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('actualIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('missingExpectedIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('extraIncludedFileCount'));
  assert.ok(releaseAuditSource.includes('expectedSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('actualSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('missingExpectedSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('classifiedSeparateDirtyWorkExpansionAllowed'));
  assert.ok(releaseAuditSource.includes('classifiedAdditionalSeparateDirtyWorkCount'));
  assert.ok(releaseAuditSource.includes('releaseCandidateInventory.expectedIncludedFileCount=19'));
  assert.ok(releaseAuditSource.includes('separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95'));
  assert.ok(releaseAuditSource.includes('separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true'));
  assert.ok(releaseAuditSource.includes('PR Packaging Manifest'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.releasePayloadFileCount=19'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.separateDirtyWorkFileCount='));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.unexpectedDirtyFileCount=0'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.inventoryDriftCount=0'));
  assert.ok(releaseAuditSource.includes('Patch Separation Readiness'));
  assert.ok(releaseAuditSource.includes('patchSeparationReadiness.status=review-required'));
  assert.ok(releaseAuditSource.includes('patchSeparationReadiness.mixedStatusFiles includes `package.json` with status `MM`'));
  assert.ok(releaseAuditSource.includes('## Scope Guard'));
  assert.ok(releaseAuditSource.includes('## PR Staging Plan'));
  assert.ok(releaseAuditSource.includes('prStagingPlanSummary'));
  assert.ok(releaseAuditSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releaseScopeGuardSource.includes('GWANGJU_RELEASE_SCOPE_GUARD_V1'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-release-scope-guard.json'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-release-scope-guard.md'));
  assert.ok(releaseScopeGuardSource.includes('expectedIncludedReleaseFiles'));
  assert.ok(releaseScopeGuardSource.includes('expectedSeparateDirtyWorkFiles'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-pr-staging-plan.mjs'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-pr-staging-review.json'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-pr-staging-review.md'));
  assert.ok(releaseScopeGuardSource.includes('"stadium:gwangju:pr-staging-review"'));
  assert.ok(releaseScopeGuardSource.includes('node --import tsx scripts/gwangju-seatmap-pr-staging-plan.mjs --review'));
  assert.ok(releaseScopeGuardSource.includes('prPackagingManifest'));
  assert.ok(releaseScopeGuardSource.includes('releasePayloadFileCount'));
  assert.ok(releaseScopeGuardSource.includes('separateDirtyWorkFileCount'));
  assert.ok(releaseScopeGuardSource.includes('unexpectedDirtyFileCount'));
  assert.ok(releaseScopeGuardSource.includes('inventoryDriftCount'));
  assert.ok(releaseScopeGuardSource.includes('patchSeparationReadiness'));
  assert.ok(releaseScopeGuardSource.includes('patchSeparationStatus'));
  assert.ok(releaseScopeGuardSource.includes('mixedStatusFiles'));
  assert.ok(releaseScopeGuardSource.includes('untrackedIncludedFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewFocusFiles'));
  assert.ok(releaseScopeGuardSource.includes('MIXED_GIT_STATUS'));
  assert.ok(releaseScopeGuardSource.includes('UNTRACKED_INCLUDED_FILE'));
  assert.ok(releaseScopeGuardSource.includes('releaseCandidateInventory'));
  assert.ok(releaseScopeGuardSource.includes('separateWorkInventory'));
  assert.ok(releaseScopeGuardSource.includes('classifiedSeparateDirtyWorkExpansionAllowed'));
  assert.ok(releaseScopeGuardSource.includes('CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED'));
  assert.ok(releaseScopeGuardSource.includes('PR Packaging Manifest'));
  assert.ok(releaseScopeGuardSource.includes('Patch Separation Readiness'));
  assert.ok(releaseScopeGuardSource.includes('PR staging plan'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.status=review-required'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.doesNotRunGitAdd=true'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.releasePayloadFileCount=19'));
  assert.ok(releaseScopeGuardSource.includes('Release Candidate Inventory'));
  assert.ok(releaseScopeGuardSource.includes('Expected Included Release Files'));
  assert.ok(releaseScopeGuardSource.includes('Separate Workstream Baseline'));
  assert.ok(releaseScopeGuardSource.includes('git'));
  assert.ok(releaseScopeGuardSource.includes('status'));
  assert.ok(releaseScopeGuardSource.includes('includedRules'));
  assert.ok(releaseScopeGuardSource.includes('separateRules'));
  assert.ok(releaseScopeGuardSource.includes('Gwangju pre-operator release package'));
  assert.ok(releaseScopeGuardSource.includes('Daejeon work is explicitly outside the Gwangju release handoff scope'));
  assert.ok(releaseScopeGuardSource.includes('daejeon-files'));
  assert.ok(releaseScopeGuardSource.includes('Separate dirty work that must not be judged by this handoff'));
  assert.ok(releaseScopeGuardSource.includes('UNCLASSIFIED_DIRTY_FILE'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_CANDIDATE_FILE_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_CANDIDATE_FILE_UNEXPECTED'));
  assert.ok(releaseScopeGuardSource.includes('HANDOFF_SCOPE_SNIPPET_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('PACKAGE_SCOPE_GUARD_SCRIPT_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_LOCK_SCOPE_GUARD_SNIPPET_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('daegu-files'));
  assert.ok(releaseScopeGuardSource.includes('sajik-files'));
  assert.ok(releaseScopeGuardSource.includes('suwon-files'));
  assert.ok(releaseScopeGuardSource.includes('cross-stadium-utilities'));
  assert.ok(releaseScopeGuardSource.includes('src/components/AppRoutes.tsx'));
  assert.ok(releaseScopeGuardSource.includes('scripts/daegu-seatmap-p1-operator-readiness.mjs'));
  assert.ok(releaseScopeGuardSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(releaseScopeGuardSource.includes('browser CSS pixels'));
  assert.ok(releaseScopeGuardSource.includes('web-search-based baseball data'));
  assert.ok(releaseScopeGuardSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(prStagingPlanSource.includes('GWANGJU_PR_STAGING_PLAN_V1'));
  assert.ok(prStagingPlanSource.includes('GWANGJU_PR_STAGING_REVIEW_V1'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-plan.json'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-plan.md'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-review.json'));
  assert.ok(prStagingPlanSource.includes('gwangju-seatmap-pr-staging-review.md'));
  assert.ok(prStagingPlanSource.includes('--review'));
  assert.ok(prStagingPlanSource.includes('doesNotRunGitAdd'));
  assert.ok(prStagingPlanSource.includes('safeToRunBulkGitAdd'));
  assert.ok(prStagingPlanSource.includes('git'));
  assert.ok(prStagingPlanSource.includes('diff'));
  assert.ok(prStagingPlanSource.includes('--cached'));
  assert.ok(prStagingPlanSource.includes('manual-hunk-review-required'));
  assert.ok(prStagingPlanSource.includes('untracked-review-required'));
  assert.ok(prStagingPlanSource.includes('generated-report-review-required'));
  assert.ok(prStagingPlanSource.includes('ready-to-stage'));
  assert.ok(prStagingPlanSource.includes('SEPARATE_FILE_HAS_INDEX_DIFF'));
  assert.ok(prStagingPlanSource.includes('manual-hunk-review-before-staging'));
  assert.ok(prStagingPlanSource.includes('manual-whole-file-review-before-git-add'));
  assert.ok(prStagingPlanSource.includes('PACKAGE_JSON_MIXED_STATUS_MISSING'));
  assert.ok(prStagingPlanSource.includes('RELEASE_PAYLOAD_COUNT_CHANGED'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.status=review-required'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.doesNotRunGitAdd=true'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.safeToRunBulkGitAdd=false'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.packageJsonStatus=MM'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.releasePayloadFileCount=19'));
  assert.ok(prStagingPlanSource.includes('stagingReview.status=review-required'));
  assert.ok(prStagingPlanSource.includes('stagingReview.doesNotRunGitAdd=true'));
  assert.ok(prStagingPlanSource.includes('stagingReview.safeToRunBulkGitAdd=false'));
  assert.ok(prStagingPlanSource.includes('stagingReview.releasePayloadFileCount=19'));
  assert.ok(prStagingPlanSource.includes('stagingReview.recommendsOnlyIncludedFiles=true'));
  assert.ok(prStagingPlanSource.includes('stagingReview.doesNotRecommendSeparateDirtyWork=true'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.separateDirtyWorkFileCount=${separateDirtyWorkFileCount}'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=${classifiedSeparateDirtyWorkExpansionAllowed}'));
  assert.ok(prStagingPlanSource.includes('git add .'));
  assert.ok(prStagingPlanSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(prStagingPlanSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_APPLY_V1'));
  assert.ok(operatorApplySource.includes('typescript'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_WRITE_GUARD_V1'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_POLYGON_APPLY_PLAN_V1'));
  assert.ok(operatorApplySource.includes('home-k7-seats'));
  assert.ok(operatorApplySource.includes('away-cheering-seats'));
  assert.ok(operatorApplySource.includes('GWANGJU_IMAGE_GEOMETRY_DRAFTS'));
  assert.ok(operatorApplySource.includes('SPECIAL_BLOCKS'));
  assert.ok(operatorApplySource.includes('GWANGJU_OPERATOR_SECTION_REQUIREMENTS'));
  assert.ok(operatorApplySource.includes('blockGeometry('));
  assert.ok(operatorApplySource.includes('--write'));
  assert.ok(operatorApplySource.includes('--require-ready'));
  assert.ok(operatorApplySource.includes('--allow-synthetic-smoke'));
  assert.ok(operatorApplySource.includes('gwangju-seatmap-operator-apply.json'));
  assert.ok(operatorApplySource.includes('gwangju-seatmap-operator-apply.csv'));
  assert.ok(operatorApplySource.includes('gwangju-seatmap-operator-apply.md'));
  assert.ok(operatorApplySource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorApplySource.includes('operator-provided official PNG coordinates only'));
  assert.ok(operatorWriteSmokeSource.includes('GWANGJU_OPERATOR_WRITE_SMOKE_V1'));
  assert.ok(operatorWriteSmokeSource.includes('gwangju-seatmap-operator-write-smoke.json'));
  assert.ok(operatorWriteSmokeSource.includes('nonProductionSyntheticInput'));
  assert.ok(operatorWriteSmokeSource.includes('Synthetic smoke coordinates are not baseball data'));
  assert.ok(operatorWriteSmokeSource.includes('PRODUCTION_GWANGJU_DATA_CHANGED'));
  assert.ok(operatorWriteSmokeSource.includes('PRODUCTION_OPERATOR_TEMPLATE_CHANGED'));
  assert.ok(operatorWriteSmokeSource.includes('SMOKE_STATUS_NOT_READY'));
  assert.ok(operatorWriteSmokeSource.includes('SMOKE_APPLY_NOT_READY'));
  assert.ok(operatorWriteSmokeSource.includes('SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE'));
  assert.ok(operatorWriteSmokeSource.includes('productionDataUnchanged'));
  assert.ok(operatorWriteSmokeSource.includes('productionTemplateUnchanged'));
  assert.ok(operatorWriteSmokeSource.includes('temporaryDataChanged'));
  assert.ok(operatorWriteSmokeSource.includes('applyWroteTempFile'));
  assert.ok(operatorWriteSmokeSource.includes('gwangjuSeatData.smoke.ts'));
  assert.ok(operatorWriteSmokeSource.includes('scripts/gwangju-seatmap-operator-apply.mjs'));
  assert.ok(operatorWriteSmokeSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(operatorWriteSmokeSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorWriteSmokeSource.includes('browser CSS pixels'));
  assert.ok(operatorWriteSmokeSource.includes('web-search-based baseball data'));
  assert.ok(operatorWriteGuardSource.includes('GWANGJU_OPERATOR_WRITE_GUARD_V1'));
  assert.ok(operatorWriteGuardSource.includes('GWANGJU_OPERATOR_WRITE_SMOKE_V1'));
  assert.ok(operatorWriteGuardSource.includes('GWANGJU_OPERATOR_STATUS_V1'));
  assert.ok(operatorWriteGuardSource.includes('gwangju-seatmap-operator-write-guard.json'));
  assert.ok(operatorWriteGuardSource.includes('--require-ready'));
  assert.ok(operatorWriteGuardSource.includes('STATUS_NOT_READY'));
  assert.ok(operatorWriteGuardSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorWriteGuardSource.includes('NO_VALID_DATA_DIFF_SECTIONS'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_PRODUCTION_DATA_CHANGED'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_PRODUCTION_TEMPLATE_CHANGED'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_TEMPORARY_DATA_NOT_CHANGED'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_APPLY_DID_NOT_WRITE_TEMP_FILE'));
  assert.ok(operatorWriteGuardSource.includes('WRITE_SMOKE_APPLY_NOT_READY'));
  assert.ok(operatorWriteGuardSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorRunbookSource.includes('gwangju-kia-seatmap-official-2026.png'));
  assert.ok(operatorRunbookSource.includes('2200x1159'));
  assert.ok(operatorRunbookSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(operatorRunbookSource.includes('browser CSS pixels'));
  assert.ok(operatorRunbookSource.includes('resized screenshots'));
  assert.ok(operatorRunbookSource.includes('external crawling'));
  assert.ok(operatorRunbookSource.includes('web-search-based baseball data'));
  assert.ok(operatorRunbookSource.includes('third-party copied seatmap images'));
  assert.ok(operatorRunbookSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-status'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-write-smoke'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-write-guard:require-ready'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-prewrite-gate'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-apply'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-apply:write'));
  assert.ok(operatorRunbookSource.includes('npm run stadium:gwangju:operator-postwrite-gate'));
  assert.ok(operatorRunbookSource.includes('docs/gwangju-seatmap-release-handoff.md'));
  assert.ok(operatorRunbookSource.includes('현재 release-ready 상태, K7/AWAY no hit-area 계약'));
  assert.ok(operatorRunbookSource.includes('synthetic K7/AWAY 입력'));
  assert.ok(operatorRunbookSource.includes('production 야구 데이터가 아니며'));
  [
    'release mode: `DERIVED_RANGE_FILTER_AND_BADGE_ONLY`',
    'release gate: `npm run qa:stadium:gwangju:release-gate`',
    'coordinate system: `2200x1159`',
    'active block count: `111`',
    'aggregate hit-area mode: `REUSES_EXISTING_TRACE_ONLY`',
    'independent K7/AWAY active block target `113` is not enabled before operator polygon write.',
    'release gate status: `passed`',
    'release gate blockers: `0`',
    'release gate steps: `5/5`',
    'release package status: `ready`',
    'operator status: `pending`',
    'browser QA status: `passed`',
    'active trace blocks: `111`',
    'missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '`K7석`: `107~111`, `118~122`',
    '`원정응원석`: `107~110`',
    '`홈 응원석`: `118~122`',
    '`111`: `K7` category, `fanRole: NEUTRAL`',
    '`home-k7-seats`: `PENDING_OPERATOR_INPUT`',
    '`away-cheering-seats`: `PENDING_OPERATOR_INPUT`',
    '`OPERATOR_REQUIRED`',
    '`SPECIAL_BLOCKS` must not receive K7/AWAY aggregate block definitions before guarded write.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` must not receive `home-k7-seats` or `away-cheering-seats` geometry before guarded write.',
    'operator-provided official PNG coordinates only',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    'npm run stadium:gwangju:operator-prewrite-gate',
    'npm run stadium:gwangju:operator-apply:write',
    'npm run stadium:gwangju:operator-postwrite-gate',
    'Do not run the `113` active block acceptance path unless',
  ].forEach((requiredText) => {
    assert.ok(releaseHandoffSource.includes(requiredText), `Gwangju release handoff should include ${requiredText}`);
  });
  assert.ok(auditSource.includes('verifyGwangjuOverlayClicks'));
  assert.ok(auditSource.includes('expectedLabelTargetCount'));
  assert.ok(auditSource.includes("target.id === 'home-k7-seats' || target.id === 'away-cheering-seats'"));
  assert.ok(auditSource.includes('Gwangju label coordinate top-hit failures'));
  assert.ok(auditSource.includes('markerClickPoints'));
  assert.ok(auditSource.includes('Gwangju K7/AWAY sections must be official-traced before becoming clickable'));
  assert.ok(auditSource.includes('Gwangju marker-only point should not select a seat block'));
  assert.ok(auditSource.includes('Gwangju marker-only point should not open seat details'));
  assert.ok(auditSource.includes('clickGwangjuFilter'));
  assert.ok(auditSource.includes('Gwangju infield filter should keep infield seat blocks interactive.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should keep neutral K7 block 111 interactive.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should hide non-K7 infield seat hit-areas.'));
  assert.ok(auditSource.includes('Gwangju cheering filter should hide neutral K7 block 111.'));
  assert.ok(auditSource.includes('Gwangju home cheering filter should hide away cheering K7 blocks.'));
  assert.ok(auditSource.includes('Gwangju away cheering filter should hide home cheering K7 blocks.'));
  assert.ok(auditSource.includes('Gwangju outfield/table filter should keep five-table seat blocks interactive.'));
  assert.ok(auditSource.includes('readGwangjuVisibleDerivedRangeBadges'));
  assert.ok(auditSource.includes('Gwangju K7 107 detail should show K7 and away derived badges.'));
  assert.ok(auditSource.includes('Gwangju K7 111 detail should show only K7 derived badge.'));
  assert.ok(auditSource.includes('Gwangju K7 118 detail should show K7 and home cheering derived badges.'));
  assert.ok(auditSource.includes("getByRole('button', { name: '확대'"));
  assert.ok(auditSource.includes("getByRole('button', { name: '원래 크기'"));
  requiredMarkerClickLabels.forEach((label) => {
    assert.ok(auditSource.includes(label), `${label} should be part of Gwangju marker click QA`);
  });
});

test('광주 좌석도 release lock 문서는 K7/AWAY block-range 검수 계약을 고정한다', () => {
  const releaseLockSource = readProjectFile('docs/gwangju-seatmap-release-lock.md');
  const dataSource = readProjectFile('src/data/gwangjuSeatData.ts');
  const dataTestSource = readProjectFile('src/data/gwangjuSeatData.test.ts');
  const componentSource = readProjectFile('src/components/gwangju/GwangjuSeatMap.tsx');
  const runbookSource = readProjectFile('docs/gwangju-seatmap-operator-runbook.md');
  const releaseHandoffSource = readProjectFile('docs/gwangju-seatmap-release-handoff.md');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  [
    'gwangju-kia-seatmap-official-2026.png',
    '공식 이미지 좌표계: `2200x1159`',
    '`GWANGJU_SEATMAP_IMAGE`',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS`',
    '`GWANGJU_OFFICIAL_TRACE_REFERENCE`',
    '`GWANGJU_BLOCKS`',
    '`OFFICIAL_IMAGE_PIXEL_TRACE`',
    '`OFFICIAL_IMAGE_TRACED`',
    '`PIXEL_ALIGNED`',
    '`manual-polygon-v5`',
    '`manual-polygon-v4`',
    '`FULL_ACTIVE_111_RETRACE`',
    '`activeBlocks=111`',
    '`GWANGJU_BASE_TRACE_BLOCK_COUNT === 111`',
    '`GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 111`',
    '`officialImageTracedBlocks=111`',
    '`directOfficialTraceBlocks=111`',
    '`manualReviewedBlocks=111`',
    '`pixelAlignedBlocks=111`',
    '`fullRetracedBlocks=111`',
    '`blocksChangedFromPreviousTrace=111`',
    '`totalRetracePointDelta=1182`',
    '`overlapWarnings=0`',
    '`minimumPixelCoverageRatio=0.9677`',
    '`componentCoverageWarnings=0`',
    '`minimumOfficialComponentRecall=0.9263`',
    '`minimumComponentIoU=0.7692`',
    '`repeatedNumberedBlockMinimumPixelCoverageRatio=1.0000`',
    '`GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true`',
    '`GWANGJU_SEATMAP_COORDINATES_READY === false`',
    '`operatorRequiredSections=K7석, 원정응원석`',
    '`K7석`: `107`, `108`, `109`, `110`, `111`, `118`, `119`, `120`, `121`, `122`',
    '`원정응원석`: `107`, `108`, `109`, `110`',
    '`홈 응원석`: `118`, `119`, `120`, `121`, `122`',
    '`111`: `K7` 카테고리지만 `fanRole: NEUTRAL`',
    '`내야석`: K7 `107~111`, `118~122` 전체를 포함한다.',
    '`K7석`: K7 `107~111`, `118~122`만 포함하며 별도 aggregate polygon이 아니라 기존 번호 블럭 hit-area를 재사용한다.',
    '`응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함한다.',
    '`홈 응원석`: K7 `118~122`만 포함한다.',
    '`원정응원석`: K7 `107~110`만 포함한다.',
    '`GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES`',
    '`derived-k7-seats`: `filterGroupId=k7`, `displayBlocks=107~111, 118~122`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`',
    '`derived-away-cheering-seats`: `filterGroupId=away-cheering`, `displayBlocks=107~110`, `fanRoles=AWAY`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`',
    '`derived-home-cheering-seats`: `filterGroupId=home-cheering`, `displayBlocks=118~122`, `fanRoles=HOME`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`',
    '`operatorPolygonStatus`는 `PENDING_OPERATOR_INPUT`',
    'Derived range는 UX 표시/필터용 계약이며 active block/hit-area는 기존 111개 polygon만 사용한다.',
    '좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다.',
    '`home-k7-seats`: `PENDING_OPERATOR_INPUT`',
    '`away-cheering-seats`: `PENDING_OPERATOR_INPUT`',
    '독립 K7/AWAY aggregate hit-area는 공식 PNG `2200x1159` 기준 운영자 polygon 좌표가 들어오기 전까지 생성하지 않는다.',
    '독립 polygon 승격이 별도로 완료된 경우에만 active block 기준을 `111`에서 `113`으로 전환한다.',
    'O/P 외야 계열은 기존 `pixelCoverageRatio`만으로는 작은 polygon이 공식 색상 영역 내부에 있을 때 통과할 수 있으므로',
    '최소 공식 component recall: `0.78`',
    '최소 component IoU: `0.62`',
    '`outfield-right-seats`는 공식 PNG component `outfield-3` bounds `1184,341,1333,838` 기준으로 하단까지 포함해야 한다.',
    '런타임 SVG는 `GWANGJU_BLOCKS.map`과 `d={block.imageGeometry.d}`만 일반 좌석 `<path>` source로 사용한다.',
    '`GWANGJU_NON_SELECTABLE_MARKER_ZONES`는 좌석 `<path>`가 아니라 차단용 marker layer이며 block detail 선택 대상이 아니다.',
    '`reports/stadium/gwangju-seatmap-trace-review.md`',
    '`reports/stadium/gwangju-seatmap-trace-review-overlay.png`',
    '`reports/stadium/gwangju-seatmap-trace-review-clean-crops/`',
    '`docs/gwangju-seatmap-operator-runbook.md`',
    '`docs/gwangju-seatmap-release-handoff.md`',
    '`reports/stadium/gwangju-seatmap-operator-status.md`',
    '`reports/stadium/gwangju-seatmap-release-package.md`',
    '`reports/stadium/gwangju-seatmap-release-gate.md`',
    '`reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    '`reports/stadium/gwangju-seatmap-release-scope-guard.json`',
    'PR packaging manifest: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    '`../output/playwright/stadium-ux-gwangju-validate/stadium-mobile-smoke-summary.md`',
    '`operator-provided official PNG coordinates only`',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    'npm run stadium:gwangju:operator-status',
    'npm run test:stadium:seatmaps',
    'npm run qa:stadium:gwangju:trace-review',
    'npm run stadium:gwangju:release-package',
    'npm run qa:stadium:gwangju:release-gate',
    'npm run stadium:gwangju:release-scope-guard',
    'npm run build',
    '`status=pending`',
    '`pending=2`',
    '`validDataDiff=0`',
    '`blockers=0`',
    '`256/256`',
    '`status=ready`',
    '`derivedRanges=3`',
    '`status=passed`',
    '`steps=5/5`',
    '`included=19`',
    '`separate=<runtime>`',
    '`unexpected=0`',
    '`inventoryDrift=0`',
    '`scopeGuardStatus=passed`',
    '`scopeGuardIncludedFiles=19`',
    '`scopeGuardSeparateDirtyWorkFiles=<runtime>`',
    '`scopeGuardSeparateDirtyWorkBaselineFiles=95`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`scopeGuardUnexpectedFiles=0`',
    '`scopeGuardBlockers=0`',
    '`releasePackageStatus=ready`',
    '`operatorStatus=pending`',
    '`browserQaStatus=passed`',
    '`activeTraceBlocks=111`',
    '`POST_OPERATOR_POLYGON_NOT_APPLIED`',
    '`actualActiveBlocks=111`',
    '`expectedActiveBlocks=113`',
    'preoperator 통과 + postoperator blocked + scope guard 통과',
    'release-gate -> release-scope-guard -> pr-staging-plan -> release-audit',
    'release scope guard가 광주 release package와 Daegu/Daejeon/Sajik/Suwon 분리 범위를 구분하지 못하거나 알 수 없는 dirty file을 감지한다.',
    'PR packaging manifest가 광주 release 후보 19개, separate dirty work baseline 95개, runtime classified separate dirty work, unexpected 0, blockers 0 기준을 한 문서로 고정하지 못한다.',
    'release scope guard의 release candidate inventory가 `expectedIncludedFileCount=19`, `actualIncludedFileCount=19`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]` 상태를 잃는다.',
    'release scope guard의 separate work inventory가 `expectedSeparateDirtyWorkCount baseline=95`, `classifiedSeparateDirtyWorkExpansionAllowed=true` 상태를 잃거나 classified separate dirty work를 blocker로 처리한다.',
    'release scope guard의 `prPackagingManifest.releasePayloadFileCount=19`, `separateDirtyWorkFileCount=<runtime>`, `unexpectedDirtyFileCount=0`, `inventoryDriftCount=0` 상태를 잃는다.',
    'release scope guard의 `patchSeparationReadiness.status=review-required` 상태를 잃거나 `package.json` with status `MM` review-required 계약을 숨긴다.',
    'patch separation readiness가 release PR staging 전에 review-required 상태임을 문서화하지 않는다.',
    'PR staging plan이 `stagingPlan.status=review-required`, `stagingPlan.doesNotRunGitAdd=true`, `stagingPlan.safeToRunBulkGitAdd=false`, `stagingPlan.packageJsonStatus=MM`, `stagingPlan.releasePayloadFileCount=19`, `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true` 계약을 잃는다.',
    'PR staging review가 `stagingReview.status=review-required`, `stagingReview.doesNotRunGitAdd=true`, `stagingReview.safeToRunBulkGitAdd=false`, `stagingReview.releasePayloadFileCount=19`, `stagingReview.recommendsOnlyIncludedFiles=true`, `stagingReview.doesNotRecommendSeparateDirtyWork=true` 계약을 잃는다.',
    '`prPackagingManifest.releasePayloadFileCount=19`',
    '`prPackagingManifest.separateDirtyWorkFileCount=<runtime>`',
    '`prPackagingManifest.unexpectedDirtyFileCount=0`',
    '`prPackagingManifest.inventoryDriftCount=0`',
    '`patchSeparationReadiness.status=review-required`',
    '`package.json` with status `MM`',
    'npm run stadium:gwangju:pr-staging-review',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'stagingReview.status=review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=19',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    "export const GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE = true",
    "export const GWANGJU_PREVIOUS_TRACE_VERSION = 'manual-polygon-v4'",
    "export const GWANGJU_FULL_RETRACE_VERSION = 'manual-polygon-v5'",
    'export const GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES',
    'export const GWANGJU_ZONE_PRECISION_WORKSETS',
    "'p1-op-outfield-component'",
    "'p5-full-release-reference'",
    "componentIds: ['outfield-3']",
    'GWANGJU_OP_COMPONENT_COVERAGE_MIN_RECALL',
    'GWANGJU_OP_COMPONENT_COVERAGE_MIN_IOU',
    "export const GWANGJU_FULL_RETRACE_GENERATION",
    "export const GWANGJU_BASE_TRACE_BLOCK_COUNT = 111",
    "export const GWANGJU_K7_OFFICIAL_BLOCKS = ['107', '108', '109', '110', '111', '118', '119', '120', '121', '122']",
    "export const GWANGJU_AWAY_CHEERING_OFFICIAL_BLOCKS = ['107', '108', '109', '110']",
    "export const GWANGJU_HOME_CHEERING_OFFICIAL_BLOCKS = ['118', '119', '120', '121', '122']",
    'export const GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES',
    "displayBlocks: '107~111, 118~122'",
    "displayBlocks: '107~110'",
    "displayBlocks: '118~122'",
    'getGwangjuDerivedOperatorRangesForBlock',
    "{ id: 'k7', label: 'K7석', cats: ['K7'] }",
    "{ id: 'cheering', label: '응원석', cats: ['K7'], fanRoles: ['HOME', 'AWAY'] }",
    "{ id: 'home-cheering', label: '홈 응원석', cats: ['K7'], fanRoles: ['HOME'] }",
    "{ id: 'away-cheering', label: '원정응원석', cats: ['K7'], fanRoles: ['AWAY'] }",
    "status: 'PENDING_OPERATOR_INPUT'",
    'matchesGwangjuCategoryGroup',
  ].forEach((requiredText) => {
    assert.ok(dataSource.includes(requiredText), `Gwangju data should include ${requiredText}`);
  });

  [
    '광주 K7/원정응원석 운영자 블럭 범위는 기존 번호 블럭 hit-area에 연결한다',
    '광주 K7/AWAY derived range는 기존 traced block만 서비스 필터에 연결한다',
    '광주 K7/AWAY는 operator polygon 승격 전까지 active 111개와 derived-only 상태를 유지한다',
    '광주 응원석 필터는 K7 번호 블럭을 fanRole 기준으로 분리한다',
    'GWANGJU_BASE_TRACE_BLOCK_COUNT, 111',
    'Object.hasOwn(GWANGJU_IMAGE_GEOMETRY_DRAFTS, id)',
    'assert.deepEqual(k7Blocks, GWANGJU_K7_OFFICIAL_BLOCKS)',
    "assert.equal(k7Range?.filterGroupId, 'k7')",
    "assert.equal(k7Range?.displayBlocks, '107~111, 118~122')",
    "getGwangjuDerivedOperatorRangesForBlock('k7-107')",
    "assert.equal(range.aggregateHitArea, 'REUSES_EXISTING_TRACE_ONLY')",
    "assert.equal(blocksByOfficialBlock.get('111')?.fanRole, 'NEUTRAL')",
    "assert.equal(GWANGJU_BLOCKS.filter((block) => block.category === 'AWAY').length, 0)",
    "assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, cheeringGroup), false)",
    "assert.equal(matchesGwangjuCategoryGroup(blocksByOfficialBlock.get('111')!, groupsById.get('infield')!), true)",
  ].forEach((requiredText) => {
    assert.ok(dataTestSource.includes(requiredText), `Gwangju data tests should include ${requiredText}`);
  });

  [
    'GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES',
    'data-derived-range-id',
    'data-derived-block-ids',
    'data-aggregate-hit-area',
    'data-testid="gwangju-derived-range-summary"',
    'data-testid="gwangju-derived-range-blocks"',
    'data-testid="gwangju-derived-range-neutral-note"',
    'gwangju-section-derived-range-',
  ].forEach((requiredText) => {
    assert.ok(componentSource.includes(requiredText), `Gwangju component should include ${requiredText}`);
  });

  [
    'getGwangjuDerivedOperatorRangesForBlock',
    'extraMeta={renderDerivedRangeMeta}',
    'data-derived-blocks={range.displayBlocks}',
  ].forEach((requiredText) => {
    assert.ok(componentSource.includes(requiredText), `Gwangju shared panel wiring should include ${requiredText}`);
  });

  [
    'K7석`은 `107~111`, `118~122`',
    '`원정응원석`은 `107~110`',
    '`홈 응원석`: `118~122`',
    '선택된 파생 필터는 `displayBlocks` 요약을 표시한다',
    '기존 공식 PNG 번호 블럭 polygon을 재사용하므로 active block 수는 111개를 유지',
    '좌표 승격 전에는 active 113개 기준 테스트를 실행하지 않는다',
    '별도 중첩 hit-area를 만들지 않는다',
    'npm run stadium:gwangju:release-package',
    'npm run qa:stadium:gwangju:release-gate',
    'reports/stadium/gwangju-seatmap-release-package.json',
    'reports/stadium/gwangju-seatmap-release-gate.json',
    'docs/gwangju-seatmap-release-handoff.md',
    'data file을 수정하지 않는다',
    'operator-provided official PNG coordinates only',
    'MANUAL_BASEBALL_DATA_REQUIRED',
  ].forEach((requiredText) => {
    assert.ok(runbookSource.includes(requiredText), `Gwangju runbook should include ${requiredText}`);
  });

  [
    'Release State',
    'Current Acceptance',
    'Change Scope',
    'K7/AWAY Contract',
    'Operator Polygon Status',
    'Source Policy',
    'Handoff Commands',
    '`DERIVED_RANGE_FILTER_AND_BADGE_ONLY`',
    '`REUSES_EXISTING_TRACE_ONLY`',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    '`OPERATOR_REQUIRED`',
    '`PENDING_OPERATOR_INPUT`',
    '`status=passed`',
    '`blockers=0`',
    '`steps=5/5`',
    '`operatorStatus=pending`',
    '`browserQaStatus=passed`',
    '`activeTraceBlocks=111`',
    'release scope guard: `npm run stadium:gwangju:release-scope-guard`',
    'release scope guard status: `passed`',
    'release scope guard included release files: `19`',
    'release scope guard separate dirty work files: runtime classified count',
    'release scope guard separate dirty work baseline files: `95`',
    'classified separate dirty work expansion allowed: `true`',
    'release scope guard unexpected files: `0`',
    'release scope guard blockers: `0`',
    'release scope guard inventory drift: `0`',
    'patch separation readiness: `review-required`',
    'patch separation mixed status: `package.json` with status `MM`',
    'PR staging plan status: `review-required`',
    'PR staging plan does not run git add: `true`',
    'PR staging plan bulk git add allowed: `false`',
    '`release-verify` runs `release-gate -> release-scope-guard -> pr-staging-plan -> release-audit`.',
    '`releaseScopeGuardStatus=passed`',
    '`releaseScopeGuardIncludedFiles=19`',
    '`releaseScopeGuardSeparateDirtyWorkFiles=runtime`',
    '`releaseScopeGuardSeparateDirtyWorkBaselineFiles=95`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`releaseScopeGuardUnexpectedFiles=0`',
    '`releaseScopeGuardBlockers=0`',
    '`releaseScopeGuardInventoryDrift=0`',
    '`patchSeparationReadiness=review-required`',
    '`patchSeparationPackageStatus=MM`',
    '`stagingPlanStatus=review-required`',
    '`stagingPlanDoesNotRunGitAdd=true`',
    '`stagingPlanSafeToRunBulkGitAdd=false`',
    'gwangju-seatmap-release-scope-guard.json',
    'gwangju-seatmap-release-scope-guard.md',
    'gwangju-seatmap-pr-staging-plan.json',
    'gwangju-seatmap-pr-staging-plan.md',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'npm run stadium:gwangju:pr-staging-plan',
    'npm run stadium:gwangju:pr-staging-review',
    'npm run stadium:gwangju:release-scope-guard',
    'Release Candidate Inventory',
    'PR Packaging Manifest',
    'PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    'Release PR scope: Gwangju pre-operator release package and build verification reports.',
    'Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
    'Included release candidate files: `19`',
    'Separate dirty work files: runtime classified count',
    'Separate dirty work baseline files: `95`',
    'Classified separate dirty work expansion allowed: `true`',
    'Inventory drift: `0`',
    'releaseCandidateInventory.expectedIncludedFileCount=19',
    'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=95',
    'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'prPackagingManifest.releasePayloadFileCount=19',
    'prPackagingManifest.separateDirtyWorkFileCount=',
    'prPackagingManifest.unexpectedDirtyFileCount=0',
    'prPackagingManifest.inventoryDriftCount=0',
    'Patch Separation Readiness',
    'patchSeparationReadiness.status=review-required',
    'patchSeparationReadiness.mixedStatusFiles includes `package.json` with status `MM`',
    'patchSeparationReadiness must be reviewed before staging the release PR.',
    'PR Staging Plan',
    'stagingPlan.status=review-required',
    'stagingPlan.doesNotRunGitAdd=true',
    'stagingPlan.safeToRunBulkGitAdd=false',
    'stagingPlan.packageJsonStatus=MM',
    'stagingPlan.releasePayloadFileCount=19',
    'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'stagingReview.status=review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=19',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
    '`package.json` currently has both index and worktree changes',
    'Review focus files: `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`.',
    'RELEASE_CANDIDATE_FILE_MISSING',
    'CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED',
    'Gwangju pre-operator release package',
    'Separate dirty work that must not be judged by this handoff',
    'Daejeon files',
    'Sajik files',
    'Suwon files',
    'Daegu files',
    'scripts/daegu-seatmap-p1-next-action-packet.mjs',
    'scripts/daegu-seatmap-p1-operator-readiness.mjs',
    'scripts/daegu-seatmap-p2-next-action-packet.mjs',
    'src/components/AppRoutes.tsx',
    'src/utils/seatMapPolygonValidator.ts',
    'independent K7/AWAY active block target `113` is not enabled before operator polygon write.',
    '`SPECIAL_BLOCKS` must not receive K7/AWAY aggregate block definitions before guarded write.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` must not receive `home-k7-seats` or `away-cheering-seats` geometry before guarded write.',
    'Do not run the `113` active block acceptance path unless',
  ].forEach((requiredText) => {
    assert.ok(releaseHandoffSource.includes(requiredText), `Gwangju handoff should include ${requiredText}`);
  });

  [
    'Gwangju cheering filter should hide neutral K7 block 111.',
    'Gwangju K7 filter should keep neutral K7 block 111 interactive.',
    'Gwangju K7 filter should hide non-K7 infield seat hit-areas.',
    'Gwangju home cheering filter should hide away cheering K7 blocks.',
    'Gwangju away cheering filter should hide home cheering K7 blocks.',
    'Gwangju K7 derived range summary should display 107~111, 118~122.',
    'Gwangju K7 derived range summary should mark neutral block 111.',
    'Gwangju home cheering derived range summary should display 118~122.',
    'Gwangju away cheering derived range summary should display 107~110.',
    'Gwangju K7 107 detail should show K7 and away derived badges.',
    'Gwangju K7 111 detail should show only K7 derived badge.',
    'Gwangju K7 118 detail should show K7 and home cheering derived badges.',
    'Gwangju K7/AWAY sections must be official-traced before becoming clickable',
  ].forEach((requiredText) => {
    assert.ok(auditSource.includes(requiredText), `Gwangju QA audit should include ${requiredText}`);
  });
});

test('대구 trace review 스크립트는 운영자 승인 패키지 입력 필드를 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const manifestSource = readProjectFile('scripts/daegu-seatmap-review-manifest.mjs');
  const alignmentAuditSource = readProjectFile('scripts/daegu-seatmap-alignment-audit.mjs');
  const operatorHandoffSource = readProjectFile('scripts/daegu-seatmap-operator-handoff.mjs');
  const handoffEvidenceSource = readProjectFile('scripts/daegu-seatmap-handoff-evidence-crops.mjs');
  const p0OperatorPackageSource = readProjectFile('scripts/daegu-seatmap-p0-operator-package.mjs');
  const p0OperatorAuditSource = readProjectFile('scripts/daegu-seatmap-p0-operator-audit.mjs');
  const p0DecisionPacketSource = readProjectFile('scripts/daegu-seatmap-p0-decision-packet.mjs');
  const p0RetraceIntakeSource = readProjectFile('scripts/daegu-seatmap-p0-retrace-intake.mjs');
  const p0OperatorImportSource = readProjectFile('scripts/daegu-seatmap-p0-operator-import.mjs');
  const p0OperatorReadinessSource = readProjectFile('scripts/daegu-seatmap-p0-operator-readiness.mjs');
  const p1OperatorPackageSource = readProjectFile('scripts/daegu-seatmap-p1-operator-package.mjs');
  const p1OperatorAuditSource = readProjectFile('scripts/daegu-seatmap-p1-operator-audit.mjs');
  const p1DecisionPacketSource = readProjectFile('scripts/daegu-seatmap-p1-decision-packet.mjs');
  const p1OperatorImportSource = readProjectFile('scripts/daegu-seatmap-p1-operator-import.mjs');
  const p1OperatorReadinessSource = readProjectFile('scripts/daegu-seatmap-p1-operator-readiness.mjs');
  const p2ReviewPackageSource = readProjectFile('scripts/daegu-seatmap-p2-review-package.mjs');
  const p2StagingAuditSource = readProjectFile('scripts/daegu-seatmap-p2-staging-audit.mjs');
  const p2OperatorPackageSource = readProjectFile('scripts/daegu-seatmap-p2-operator-package.mjs');
  const p2DecisionPacketSource = readProjectFile('scripts/daegu-seatmap-p2-decision-packet.mjs');
  const p2NextActionPacketSource = readProjectFile('scripts/daegu-seatmap-p2-next-action-packet.mjs');
  const p2OperatorHandoffSource = readProjectFile('scripts/daegu-seatmap-p2-operator-handoff.mjs');
  const p2OperatorWorksetsSource = readProjectFile('scripts/daegu-seatmap-p2-operator-worksets.mjs');
  const p2OperatorWorksetPreflightSource = readProjectFile('scripts/daegu-seatmap-p2-operator-workset-preflight.mjs');
  const p2OperatorEntrySheetSource = readProjectFile('scripts/daegu-seatmap-p2-operator-entry-sheet.mjs');
  const p2OperatorTracingPackSource = readProjectFile('scripts/daegu-seatmap-p2-operator-tracing-pack.mjs');
  const p2OperatorPostEntryQaSource = readProjectFile('scripts/daegu-seatmap-p2-operator-post-entry-qa.mjs');
  const p2aOperatorPostEntryQaSource = readProjectFile('scripts/daegu-seatmap-p2a-operator-post-entry-qa.mjs');
  const p2aOperatorInputPacketSource = readProjectFile('scripts/daegu-seatmap-p2a-operator-input-packet.mjs');
  const p2aPrewriteGateSource = readProjectFile('scripts/daegu-seatmap-p2a-prewrite-gate.mjs');
  const p2aReadinessV3Source = readProjectFile('scripts/daegu-seatmap-p2a-readiness-v3.mjs');
  const p2OperatorImportSource = readProjectFile('scripts/daegu-seatmap-p2-operator-import.mjs');
  const p2OperatorReadinessSource = readProjectFile('scripts/daegu-seatmap-p2-operator-readiness.mjs');
  const p3p4OperatorPackageSource = readProjectFile('scripts/daegu-seatmap-p3-p4-operator-package.mjs');
  const p3p4OperatorAuditSource = readProjectFile('scripts/daegu-seatmap-p3-p4-operator-audit.mjs');
  const p3p4DecisionPacketSource = readProjectFile('scripts/daegu-seatmap-p3-p4-decision-packet.mjs');
  const p3p4OperatorImportSource = readProjectFile('scripts/daegu-seatmap-p3-p4-operator-import.mjs');
  const p3p4OperatorReadinessSource = readProjectFile('scripts/daegu-seatmap-p3-p4-operator-readiness.mjs');
  const precisionAuditSource = readProjectFile('scripts/daegu-seatmap-precision-audit.mjs');
  const renderSafetyAuditSource = readProjectFile('scripts/daegu-seatmap-render-safety-audit.mjs');
  const zonePrecisionWorksetsSource = readProjectFile('scripts/daegu-seatmap-zone-precision-worksets.mjs');
  const operatorStateAuditSource = readProjectFile('scripts/daegu-seatmap-operator-state-audit.mjs');
  const retraceWorkQueueSource = readProjectFile('scripts/daegu-seatmap-retrace-work-queue.mjs');
  const nonOverlapPriorityQueueSource = readProjectFile('scripts/daegu-seatmap-non-overlap-priority-queue.mjs');
  const visualIssueQueueSource = readProjectFile('scripts/daegu-seatmap-visual-issue-queue.mjs');
  const visualOffSeatWorksetSource = readProjectFile('scripts/daegu-seatmap-visual-off-seat-workset.mjs');
  const p1PairedBoundaryReviewSource = readProjectFile('scripts/daegu-seatmap-p1-paired-boundary-review.mjs');
  const p1BoundaryInputAidSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-input-aid.mjs');
  const p1NextActionPacketSource = readProjectFile('scripts/daegu-seatmap-p1-next-action-packet.mjs');
  const p1PrecisionWorksetSource = readProjectFile('scripts/daegu-seatmap-p1-precision-workset.mjs');
  const p1BoundaryFirstReadinessSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-readiness.mjs');
  const p1BoundaryFirstPacketSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-packet.mjs');
  const p1BoundaryFirstTemplateGateSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-template-gate.mjs');
  const p1BoundaryFirstSourceCopySource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-source-copy.mjs');
  const p1BoundaryFirstReviewBoardSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-review-board.mjs');
  const p1BoundaryFirstEntrySheetSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-entry-sheet.mjs');
  const p1BoundaryFirstEntryPreflightSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-entry-preflight.mjs');
  const p1BoundaryFirstTracingPackSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-tracing-pack.mjs');
  const p1BoundaryFirstOperatorHandoffSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-operator-handoff.mjs');
  const p1BoundaryFirstPostwriteGateSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-postwrite-gate.mjs');
  const p1BoundaryFirstRegressionSource = readProjectFile('scripts/daegu-seatmap-p1-boundary-first-regression.mjs');
  const p1StageOrderRegressionSource = readProjectFile('scripts/daegu-seatmap-p1-stage-order-regression.mjs');
  const offSeatRetraceIntakeSource = readProjectFile('scripts/daegu-seatmap-off-seat-retrace-intake.mjs');
  const p0p1OffSeatWorksetSource = readProjectFile('scripts/daegu-seatmap-p0-p1-off-seat-workset.mjs');
  const p0OffSeatOperatorInputSource = readProjectFile('scripts/daegu-seatmap-p0-off-seat-operator-input.mjs');
  const p0OffSeatOperatorImportSource = readProjectFile('scripts/daegu-seatmap-p0-off-seat-operator-import.mjs');
  const correctionsTemplateSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-template.mjs');
  const correctionsValidateSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-validate.mjs');
  const correctionsPreviewSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-preview.mjs');
  const correctionsApplySource = readProjectFile('scripts/daegu-seatmap-operator-corrections-apply.mjs');
  const correctionsWriteSmokeSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-write-smoke.mjs');
  const correctionsBatchesSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-batches.mjs');
  const correctionsStatusSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-status.mjs');
  const correctionsWriteGuardSource = readProjectFile('scripts/daegu-seatmap-operator-corrections-write-guard.mjs');
  const correctionsRunbookSource = readProjectFile('docs/daegu-seatmap-operator-corrections-runbook.md');

  assert.ok(packageSource.includes('"stadium:daegu:trace-manifest"'));
  assert.ok(packageSource.includes('"stadium:daegu:alignment-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-handoff"'));
  assert.ok(packageSource.includes('"stadium:daegu:handoff-evidence"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-decision-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-retrace-intake"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-import"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-readiness"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-prewrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-operator-import:write-template"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-decision-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-import"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-readiness"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-prewrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-operator-import:write-template"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-review-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-staging-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-decision-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-import"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-readiness"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-prewrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-import:write-template"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-next-action-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-handoff"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-worksets"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-workset-preflight"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-entry-sheet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-tracing-pack"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2-operator-post-entry-qa"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2a-operator-post-entry-qa"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2a-operator-input-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2a-prewrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p2a-readiness-v3"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-package"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-decision-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-import"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-readiness"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-prewrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p3-p4-operator-import:write-template"'));
  assert.ok(packageSource.includes('"stadium:daegu:precision-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:render-safety-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:zone-precision-worksets"'));
  assert.ok(packageSource.includes('"qa:stadium:daegu:release-lock"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-state-audit"'));
  assert.ok(packageSource.includes('"stadium:daegu:retrace-work-queue"'));
  assert.ok(packageSource.includes('"stadium:daegu:non-overlap-priority-queue"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-issue-queue"'));
  assert.ok(packageSource.includes('"stadium:daegu:visual-off-seat-workset"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-paired-boundary-review"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-input-aid"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-next-action-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-precision-workset"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-readiness"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-packet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-template-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-source-copy"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-source-copy:write-source-input"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-review-board"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-entry-sheet"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-entry-preflight"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-entry-preflight:require-ready"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-tracing-pack"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-operator-handoff"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-postwrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-postwrite-gate:require-written"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-boundary-first-regression"'));
  assert.ok(packageSource.includes('"stadium:daegu:p1-stage-order-regression"'));
  assert.ok(packageSource.includes('"stadium:daegu:off-seat-retrace-intake"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-p1-off-seat-workset"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-off-seat-operator-input"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-off-seat-operator-import"'));
  assert.ok(packageSource.includes('"stadium:daegu:p0-off-seat-operator-import:write-source-input"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-template"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-validate"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-preview"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-apply"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-write-smoke"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-batches"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-status"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-write-guard"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-write"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections-postwrite-gate"'));
  assert.ok(packageSource.includes('"stadium:daegu:operator-corrections"'));
  assert.ok(packageSource.includes('"stadium:daegu:evidence"'));
  assert.ok(packageSource.includes('"qa:stadium:daegu:trace-review"'));
  assert.ok(packageSource.includes('npm run stadium:daegu:trace-manifest && node --import tsx scripts/daegu-seatmap-operator-handoff.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:operator-handoff && node --import tsx scripts/daegu-seatmap-handoff-evidence-crops.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:handoff-evidence && npm run stadium:daegu:operator-corrections && node --import tsx scripts/daegu-seatmap-p0-operator-package.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-operator-audit.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-decision-packet.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-retrace-intake.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-validate.mjs --input reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json --report-dir reports/stadium/daegu-p0-operator --handoff reports/stadium/daegu-seatmap-operator-handoff.json'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-operator-import.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-operator-readiness.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p0-operator-validate && npm run stadium:daegu:p0-operator-import && npm run stadium:daegu:p0-operator-readiness'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-operator-import.mjs --write-template'));
  assert.ok(packageSource.includes('npm run stadium:daegu:handoff-evidence && node --import tsx scripts/daegu-seatmap-p1-operator-package.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-operator-audit.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-decision-packet.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-validate.mjs --input reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-input.json --report-dir reports/stadium/daegu-p1-operator --handoff reports/stadium/daegu-seatmap-operator-handoff.json'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-operator-import.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-operator-readiness.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-readiness && npm run stadium:daegu:p1-operator-validate && npm run stadium:daegu:p1-operator-import && npm run stadium:daegu:p1-operator-readiness'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-operator-import.mjs --write-template'));
  assert.ok(packageSource.includes('npm run stadium:daegu:handoff-evidence && node --import tsx scripts/daegu-seatmap-p2-review-package.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p2-staging-audit.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-review-package && npm run stadium:daegu:p2-staging-audit && node --import tsx scripts/daegu-seatmap-p2-operator-package.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p2-decision-packet.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-validate.mjs --input reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-input.json --report-dir reports/stadium/daegu-p2-operator --handoff reports/stadium/daegu-seatmap-operator-handoff.json'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p2-operator-import.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p2-operator-readiness.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-post-entry-qa && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && npm run stadium:daegu:p2-operator-readiness'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p2-operator-import.mjs --write-template'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-staging-audit && npm run stadium:daegu:p2-decision-packet && node --import tsx scripts/daegu-seatmap-p2-next-action-packet.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-package && npm run stadium:daegu:p2-next-action-packet && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && node --import tsx scripts/daegu-seatmap-p2-operator-handoff.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-handoff && node --import tsx scripts/daegu-seatmap-p2-operator-worksets.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-worksets && node --import tsx scripts/daegu-seatmap-p2-operator-workset-preflight.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-workset-preflight && node --import tsx scripts/daegu-seatmap-p2-operator-entry-sheet.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-entry-sheet && node --import tsx scripts/daegu-seatmap-p2-operator-tracing-pack.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2-operator-tracing-pack && node --import tsx scripts/daegu-seatmap-p2-operator-post-entry-qa.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:operator-corrections-template && npm run stadium:daegu:operator-corrections-validate && npm run stadium:daegu:operator-corrections-batches && npm run stadium:daegu:p2-operator-post-entry-qa && node --import tsx scripts/daegu-seatmap-p2a-operator-post-entry-qa.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2a-operator-post-entry-qa && node --import tsx scripts/daegu-seatmap-p2a-operator-input-packet.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2a-operator-input-packet && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && node --import tsx scripts/daegu-seatmap-p2a-prewrite-gate.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p2a-operator-input-packet && npm run stadium:daegu:p1-operator-package && npm run stadium:daegu:p1-boundary-first-postwrite-gate && npm run stadium:daegu:p2-operator-validate && npm run stadium:daegu:p2-operator-import && node --import tsx scripts/daegu-seatmap-p2-operator-readiness.mjs --allow-waiting-exit-zero && node --import tsx scripts/daegu-seatmap-p2a-prewrite-gate.mjs --allow-waiting-exit-zero && npm run stadium:daegu:render-safety-audit && node --import tsx scripts/daegu-seatmap-p2a-readiness-v3.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:handoff-evidence && node --import tsx scripts/daegu-seatmap-p3-p4-operator-package.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p3-p4-operator-audit.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p3-p4-decision-packet.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-validate.mjs --input reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-input.json --report-dir reports/stadium/daegu-p3-p4-operator --handoff reports/stadium/daegu-seatmap-operator-handoff.json'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p3-p4-operator-import.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p3-p4-operator-readiness.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p3-p4-operator-validate && npm run stadium:daegu:p3-p4-operator-import && npm run stadium:daegu:p3-p4-operator-readiness'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p3-p4-operator-import.mjs --write-template'));
  assert.ok(packageSource.includes('npm run stadium:daegu:alignment-audit && npm run stadium:daegu:handoff-evidence && node --import tsx scripts/daegu-seatmap-precision-audit.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:precision-audit && node --import tsx scripts/daegu-seatmap-render-safety-audit.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:precision-audit -- --require-release'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-state-audit.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-retrace-work-queue.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-non-overlap-priority-queue.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-visual-issue-queue.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:visual-issue-queue && node --import tsx scripts/daegu-seatmap-visual-off-seat-workset.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-paired-boundary-review && node --import tsx scripts/daegu-seatmap-p1-boundary-input-aid.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-input-aid && npm run stadium:daegu:p1-decision-packet && node --import tsx scripts/daegu-seatmap-p1-next-action-packet.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:precision-audit && npm run stadium:daegu:p1-next-action-packet && node --import tsx scripts/daegu-seatmap-p1-precision-workset.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-next-action-packet && npm run stadium:daegu:p1-operator-validate && node --import tsx scripts/daegu-seatmap-p1-boundary-first-readiness.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-readiness && node --import tsx scripts/daegu-seatmap-p1-boundary-first-packet.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-boundary-first-template-gate.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-template-gate && node --import tsx scripts/daegu-seatmap-p1-boundary-first-source-copy.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-entry-preflight:require-ready && npm run stadium:daegu:p1-boundary-first-template-gate && node --import tsx scripts/daegu-seatmap-p1-boundary-first-source-copy.mjs --write-source-input'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-template-gate && node --import tsx scripts/daegu-seatmap-p1-boundary-first-source-copy.mjs --write-source-input'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-packet && npm run stadium:daegu:p1-boundary-first-template-gate && npm run stadium:daegu:p1-boundary-first-source-copy && node --import tsx scripts/daegu-seatmap-p1-boundary-first-review-board.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-review-board && node --import tsx scripts/daegu-seatmap-p1-boundary-first-entry-sheet.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-entry-sheet && node --import tsx scripts/daegu-seatmap-p1-boundary-first-entry-preflight.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-entry-sheet && node --import tsx scripts/daegu-seatmap-p1-boundary-first-entry-preflight.mjs --require-ready'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-entry-preflight && node --import tsx scripts/daegu-seatmap-p1-boundary-first-tracing-pack.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:p1-boundary-first-tracing-pack && npm run stadium:daegu:p1-boundary-first-postwrite-gate && node --import tsx scripts/daegu-seatmap-p1-boundary-first-operator-handoff.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-boundary-first-postwrite-gate.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-boundary-first-postwrite-gate.mjs --require-written'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-boundary-first-regression.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p1-stage-order-regression.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-off-seat-retrace-intake.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-p1-off-seat-workset.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-off-seat-operator-input.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-off-seat-operator-import.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-p0-off-seat-operator-import.mjs --write-source-input'));
  assert.ok(packageSource.includes('npm run stadium:daegu:operator-handoff && node --import tsx scripts/daegu-seatmap-operator-corrections-template.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-validate.mjs --input reports/stadium/daegu-seatmap-operator-corrections-template.json'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-preview.mjs --input reports/stadium/daegu-seatmap-operator-corrections-template.json'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-apply.mjs --input reports/stadium/daegu-seatmap-operator-corrections-template.json'));
  assert.ok(packageSource.includes('npm run stadium:daegu:operator-handoff && node --import tsx scripts/daegu-seatmap-operator-corrections-write-smoke.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-batches.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-status.mjs'));
  assert.ok(packageSource.includes('node --import tsx scripts/daegu-seatmap-operator-corrections-write-guard.mjs'));
  assert.ok(packageSource.includes('npm run stadium:daegu:operator-corrections-validate && npm run stadium:daegu:operator-corrections-preview && npm run stadium:daegu:operator-corrections-apply && npm run stadium:daegu:operator-corrections-write-smoke && npm run stadium:daegu:operator-corrections-batches && npm run stadium:daegu:operator-corrections-status && npm run stadium:daegu:operator-corrections-write-guard && node --import tsx scripts/daegu-seatmap-operator-corrections-apply.mjs --input reports/stadium/daegu-seatmap-operator-corrections-template.json --write'));
  assert.ok(packageSource.includes('npm run stadium:daegu:alignment-audit && npm run stadium:daegu:precision-audit && npm run stadium:daegu:render-safety-audit && npm run stadium:daegu:p1-boundary-first-postwrite-gate && npm run test:stadium:seatmaps && npm run qa:stadium:daegu:full && npm run build'));
  assert.ok(packageSource.includes('npm run stadium:daegu:alignment-audit && npm run stadium:daegu:operator-corrections && npm run stadium:daegu:operator-corrections-apply && npm run stadium:daegu:operator-corrections-write-smoke && npm run stadium:daegu:operator-corrections-batches && npm run stadium:daegu:operator-corrections-status && npm run stadium:daegu:handoff-evidence && npm run qa:stadium:daegu:full'));
  assert.ok(manifestSource.includes('operatorReviewContract'));
  assert.ok(manifestSource.includes('operatorDecisionOptions'));
  assert.ok(manifestSource.includes('operatorReviewInputFields'));
  assert.ok(manifestSource.includes('operatorDecision=APPROVED'));
  assert.ok(manifestSource.includes('nonAutomaticPromotion'));
  assert.ok(manifestSource.includes('correctedPath'));
  assert.ok(manifestSource.includes('correctedLabelX'));
  assert.ok(manifestSource.includes('correctedLabelY'));
  assert.ok(manifestSource.includes('reviewer'));
  assert.ok(manifestSource.includes('reviewedAt'));
  assert.ok(manifestSource.includes('operatorNote'));
  assert.ok(manifestSource.includes('Do not promote automatically'));
  assert.ok(manifestSource.includes('alignmentStandard'));
  assert.ok(manifestSource.includes('alignmentClass'));
  assert.ok(manifestSource.includes('officialFailureReasons'));
  assert.ok(manifestSource.includes('labelTopHitBlock'));
  assert.ok(manifestSource.includes('CANDIDATE_DUPLICATE_CROSS_CATEGORY'));
  assert.ok(alignmentAuditSource.includes('DAEGU_ALIGNMENT_AUDIT_V1'));
  assert.ok(alignmentAuditSource.includes('LOCKED_VERIFIED'));
  assert.ok(alignmentAuditSource.includes('RETRACE_REQUIRED'));
  assert.ok(alignmentAuditSource.includes('OPERATOR_REQUIRED'));
  assert.ok(alignmentAuditSource.includes('labelTopHitOk'));
  assert.ok(alignmentAuditSource.includes('PIXEL_CANDIDATE_DUPLICATE'));
  assert.ok(operatorHandoffSource.includes('DAEGU_OPERATOR_HANDOFF_V1'));
  assert.ok(operatorHandoffSource.includes('daegu-seatmap-operator-handoff.json'));
  assert.ok(operatorHandoffSource.includes('daegu-seatmap-operator-handoff.csv'));
  assert.ok(operatorHandoffSource.includes('daegu-seatmap-operator-handoff.md'));
  assert.ok(operatorHandoffSource.includes('daegu-seatmap-operator-handoff.svg'));
  assert.ok(operatorHandoffSource.includes('queuePriority'));
  assert.ok(operatorHandoffSource.includes('recommendedAction'));
  assert.ok(operatorHandoffSource.includes('duplicateCandidateGroups'));
  assert.ok(operatorHandoffSource.includes('TRACE_SHARED_CANDIDATE_BOUNDARIES'));
  assert.ok(operatorHandoffSource.includes('REQUEST_OPERATOR_CORRECTED_PATH'));
  assert.ok(operatorHandoffSource.includes('NO_ACTION_LOCKED_VERIFIED'));
  assert.ok(operatorHandoffSource.includes('operatorReviewContract'));
  assert.ok(operatorHandoffSource.includes('nonAutomaticPromotion'));
  assert.ok(handoffEvidenceSource.includes('DAEGU_HANDOFF_EVIDENCE_CROPS_V1'));
  assert.ok(handoffEvidenceSource.includes('daegu-seatmap-handoff-evidence-crops.json'));
  assert.ok(handoffEvidenceSource.includes('daegu-seatmap-handoff-evidence-crops.md'));
  assert.ok(handoffEvidenceSource.includes('daegu-handoff-evidence-crops'));
  assert.ok(handoffEvidenceSource.includes('queuePriorities'));
  assert.ok(handoffEvidenceSource.includes('recommendedAction'));
  assert.ok(handoffEvidenceSource.includes('duplicatePeerBlocks'));
  assert.ok(handoffEvidenceSource.includes('TRACE_SHARED_CANDIDATE_BOUNDARIES'));
  assert.ok(handoffEvidenceSource.includes('purple=duplicate peer'));
  assert.ok(p0OperatorPackageSource.includes('DAEGU_P0_OPERATOR_PACKAGE_V1'));
  assert.ok(p0OperatorPackageSource.includes('BATCH_1_P0'));
  assert.ok(p0OperatorPackageSource.includes('EXPECTED_P0_ROWS'));
  assert.ok(p0OperatorPackageSource.includes('OPERATOR_MANUAL_TRACE_REQUIRED'));
  assert.ok(p0OperatorPackageSource.includes('OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY'));
  assert.ok(p0OperatorPackageSource.includes('daegu-seatmap-p0-operator-input.json'));
  assert.ok(p0OperatorPackageSource.includes('daegu-seatmap-p0-operator-input.csv'));
  assert.ok(p0OperatorPackageSource.includes('daegu-seatmap-p0-operator-checklist.md'));
  assert.ok(p0OperatorPackageSource.includes('existingOperatorInput'));
  assert.ok(p0OperatorPackageSource.includes('preservedEditableRows'));
  assert.ok(p0OperatorPackageSource.includes('isGeneratedRetraceNote'));
  assert.ok(p0OperatorPackageSource.includes('hasReviewMarker'));
  assert.ok(p0OperatorPackageSource.includes('hasCorrectedGeometry'));
  assert.ok(p0OperatorPackageSource.includes('Regenerating this package must preserve operator-filled P0 editable fields'));
  assert.ok(p0OperatorPackageSource.includes('noCoordinateInference'));
  assert.ok(p0OperatorPackageSource.includes('noExternalCrawlingOrWebSearch'));
  assert.ok(p0OperatorAuditSource.includes('DAEGU_P0_OPERATOR_AUDIT_V1'));
  assert.ok(p0OperatorAuditSource.includes('daegu-seatmap-p0-operator-audit.json'));
  assert.ok(p0OperatorAuditSource.includes('INPUT_PENDING_ROWS'));
  assert.ok(p0OperatorAuditSource.includes('INPUT_FILLED_PATH_ROWS'));
  assert.ok(p0OperatorAuditSource.includes('INPUT_EVIDENCE_ROWS'));
  assert.ok(p0DecisionPacketSource.includes('DAEGU_P0_DECISION_PACKET_V1'));
  assert.ok(p0DecisionPacketSource.includes('daegu-seatmap-p0-decision-packet.json'));
  assert.ok(p0DecisionPacketSource.includes('daegu-seatmap-p0-decision-packet.csv'));
  assert.ok(p0DecisionPacketSource.includes('daegu-seatmap-p0-decision-packet.md'));
  assert.ok(p0DecisionPacketSource.includes('OPERATOR_MANUAL_TRACE_REQUIRED'));
  assert.ok(p0DecisionPacketSource.includes('OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY'));
  assert.ok(p0DecisionPacketSource.includes('Candidate paths are visual references only'));
  assert.ok(p0DecisionPacketSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p0DecisionPacketSource.includes('requiresOperatorDecision'));
  assert.ok(p0RetraceIntakeSource.includes('DAEGU_P0_RETRACE_INTAKE_V1'));
  assert.ok(p0RetraceIntakeSource.includes('DAEGU_P0_OPERATOR_PACKAGE_V1'));
  assert.ok(p0RetraceIntakeSource.includes('BATCH_1_P0'));
  assert.ok(p0RetraceIntakeSource.includes('expectedRows: 1'));
  assert.ok(p0RetraceIntakeSource.includes('expectedNeedsRetraceRows: 0'));
  assert.ok(p0RetraceIntakeSource.includes('expectedApprovedRows: 1'));
  assert.ok(p0RetraceIntakeSource.includes('daegu-seatmap-p0-operator-input.json'));
  assert.ok(p0RetraceIntakeSource.includes('daegu-seatmap-p0-retrace-intake.json'));
  assert.ok(p0RetraceIntakeSource.includes('daegu-seatmap-p0-retrace-intake.csv'));
  assert.ok(p0RetraceIntakeSource.includes('daegu-seatmap-p0-retrace-intake.md'));
  assert.ok(p0RetraceIntakeSource.includes('NEEDS_RETRACE'));
  assert.ok(p0RetraceIntakeSource.includes('OPERATOR_MANUAL_TRACE_REQUIRED'));
  assert.ok(p0RetraceIntakeSource.includes('OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY'));
  assert.ok(p0RetraceIntakeSource.includes('ROW_DECISION_NOT_NEEDS_RETRACE_OR_APPROVED'));
  assert.ok(p0RetraceIntakeSource.includes('currentPath'));
  assert.ok(p0RetraceIntakeSource.includes('candidatePath'));
  assert.ok(p0RetraceIntakeSource.includes('candidateDuplicateGroup'));
  assert.ok(p0RetraceIntakeSource.includes('componentInsidePathRatio'));
  assert.ok(p0RetraceIntakeSource.includes('pathColorCoverageRatio'));
  assert.ok(p0RetraceIntakeSource.includes('operatorDecision=APPROVED'));
  assert.ok(p0RetraceIntakeSource.includes('correctedPath'));
  assert.ok(p0RetraceIntakeSource.includes('correctedLabelX'));
  assert.ok(p0RetraceIntakeSource.includes('correctedLabelY'));
  assert.ok(p0RetraceIntakeSource.includes('reviewer'));
  assert.ok(p0RetraceIntakeSource.includes('reviewedAt'));
  assert.ok(p0RetraceIntakeSource.includes('Candidate paths remain reference-only'));
  assert.ok(p0RetraceIntakeSource.includes('It never writes the main corrections template.'));
  assert.ok(p0RetraceIntakeSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p0OperatorImportSource.includes('DAEGU_P0_OPERATOR_IMPORT_V1'));
  assert.ok(p0OperatorImportSource.includes('BATCH_1_P0'));
  assert.ok(p0OperatorImportSource.includes('DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1'));
  assert.ok(p0OperatorImportSource.includes('daegu-seatmap-p0-operator-import.json'));
  assert.ok(p0OperatorImportSource.includes('daegu-seatmap-p0-operator-import.md'));
  assert.ok(p0OperatorImportSource.includes('--write-template'));
  assert.ok(p0OperatorImportSource.includes('productionDataChanged: false'));
  assert.ok(p0OperatorImportSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p0OperatorImportSource.includes('INVALID_P0_OPERATOR_DECISION'));
  assert.ok(p0OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P0_DECISION'));
  assert.ok(p0OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P0_ROW'));
  assert.ok(p0OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS'));
  assert.ok(p0OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_DRAFT_ONLY'));
  assert.ok(p0OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_STAGING_ONLY'));
  assert.ok(p0OperatorImportSource.includes('WRITE_TEMPLATE_HAS_DRAFT_MARKERS'));
  assert.ok(p0OperatorImportSource.includes('Do not run npm run stadium:daegu:operator-corrections after write-template'));
  assert.ok(p0OperatorReadinessSource.includes('DAEGU_P0_OPERATOR_READINESS_V1'));
  assert.ok(p0OperatorReadinessSource.includes('daegu-seatmap-p0-operator-readiness.json'));
  assert.ok(p0OperatorReadinessSource.includes('waiting-for-operator'));
  assert.ok(p0OperatorReadinessSource.includes('awaitingOperatorInput'));
  assert.ok(p0OperatorReadinessSource.includes('readyForTemplateImport'));
  assert.ok(p0OperatorReadinessSource.includes('readyForGuardedWriteAfterTemplateImport'));
  assert.ok(p0OperatorReadinessSource.includes('NO_APPROVED_P0_ROWS_TEMPLATE_IMPORT_WILL_BLOCK'));
  assert.ok(p0OperatorReadinessSource.includes('P0_PENDING_ROWS_REMAIN'));
  assert.ok(p0OperatorReadinessSource.includes('P0_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(p0OperatorReadinessSource.includes('This readiness gate is read-only'));
  assert.ok(p0OperatorReadinessSource.includes('Do not run npm run stadium:daegu:operator-corrections after p0-operator-import:write-template'));
  assert.ok(p1OperatorPackageSource.includes('DAEGU_P1_OPERATOR_PACKAGE_V1'));
  assert.ok(p1OperatorPackageSource.includes('BATCH_2_P1'));
  assert.ok(p1OperatorPackageSource.includes('EXPECTED'));
  assert.ok(p1OperatorPackageSource.includes('OPERATOR_MANUAL_TRACE_REQUIRED'));
  assert.ok(p1OperatorPackageSource.includes('OPERATOR_SEPARATE_SHARED_CANDIDATE_BOUNDARY'));
  assert.ok(p1OperatorPackageSource.includes('OPERATOR_CORRECTED_PATH_REQUIRED'));
  assert.ok(p1OperatorPackageSource.includes('daegu-seatmap-p1-operator-input.json'));
  assert.ok(p1OperatorPackageSource.includes('daegu-seatmap-p1-operator-input.csv'));
  assert.ok(p1OperatorPackageSource.includes('daegu-seatmap-p1-operator-checklist.md'));
  assert.ok(p1OperatorPackageSource.includes('existingOperatorInput'));
  assert.ok(p1OperatorPackageSource.includes('preservedEditableRows'));
  assert.ok(p1OperatorPackageSource.includes('isGeneratedRetraceNote'));
  assert.ok(p1OperatorPackageSource.includes('hasReviewMarker'));
  assert.ok(p1OperatorPackageSource.includes('hasCorrectedGeometry'));
  assert.ok(p1OperatorPackageSource.includes('Regenerating this package must preserve operator-filled P1 editable fields'));
  assert.ok(p1OperatorPackageSource.includes('noCoordinateInference'));
  assert.ok(p1OperatorPackageSource.includes('noExternalCrawlingOrWebSearch'));
  assert.ok(p1OperatorAuditSource.includes('DAEGU_P1_OPERATOR_AUDIT_V1'));
  assert.ok(p1OperatorAuditSource.includes('daegu-seatmap-p1-operator-audit.json'));
  assert.ok(p1OperatorAuditSource.includes('INPUT_PENDING_ROWS'));
  assert.ok(p1OperatorAuditSource.includes('INPUT_FILLED_PATH_ROWS'));
  assert.ok(p1OperatorAuditSource.includes('INPUT_EVIDENCE_ROWS'));
  assert.ok(p1DecisionPacketSource.includes('DAEGU_P1_DECISION_PACKET_V1'));
  assert.ok(p1DecisionPacketSource.includes('daegu-seatmap-p1-decision-packet.json'));
  assert.ok(p1DecisionPacketSource.includes('daegu-seatmap-p1-decision-packet.csv'));
  assert.ok(p1DecisionPacketSource.includes('daegu-seatmap-p1-decision-packet.md'));
  assert.ok(p1DecisionPacketSource.includes('manualTraceRequiredRows: 5'));
  assert.ok(p1DecisionPacketSource.includes('sharedCandidateBoundaryRows: 11'));
  assert.ok(p1DecisionPacketSource.includes('correctedPathRequiredRows: 1'));
  assert.ok(p1DecisionPacketSource.includes('P1 write-template remains blocked until P0 is closed.'));
  assert.ok(p1DecisionPacketSource.includes('Candidate paths are visual references only'));
  assert.ok(p1DecisionPacketSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1DecisionPacketSource.includes('requiresOperatorDecision'));
  assert.ok(p1OperatorImportSource.includes('DAEGU_P1_OPERATOR_IMPORT_V1'));
  assert.ok(p1OperatorImportSource.includes('BATCH_2_P1'));
  assert.ok(p1OperatorImportSource.includes('BATCH_1_P0'));
  assert.ok(p1OperatorImportSource.includes('DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1'));
  assert.ok(p1OperatorImportSource.includes('daegu-seatmap-p1-operator-import.json'));
  assert.ok(p1OperatorImportSource.includes('daegu-seatmap-p1-operator-import.md'));
  assert.ok(p1OperatorImportSource.includes('--write-template'));
  assert.ok(p1OperatorImportSource.includes('productionDataChanged: false'));
  assert.ok(p1OperatorImportSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1OperatorImportSource.includes('INVALID_P1_OPERATOR_DECISION'));
  assert.ok(p1OperatorImportSource.includes('DAEGU_P1_NEXT_ACTION_PACKET_V1'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P1_DECISION'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P1_ROW'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_P1_STAGE_ORDER'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS'));
  assert.ok(p1OperatorImportSource.includes('PAIR_BOUNDARY_FIRST'));
  assert.ok(p1OperatorImportSource.includes('SINGLE_CORRECTED_PATH'));
  assert.ok(p1OperatorImportSource.includes('DUPLICATE_CANDIDATE_SPLIT'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_DRAFT_ONLY'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_STAGING_ONLY'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_HAS_DRAFT_MARKERS'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(p1OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(p1OperatorImportSource.includes('Do not run npm run stadium:daegu:operator-corrections after write-template'));
  assert.ok(p1OperatorReadinessSource.includes('DAEGU_P1_OPERATOR_READINESS_V1'));
  assert.ok(p1OperatorReadinessSource.includes('BATCH_2_P1'));
  assert.ok(p1OperatorReadinessSource.includes('BATCH_1_P0'));
  assert.ok(p1OperatorReadinessSource.includes('const BASELINE_EXPECTED_ROWS = 17'));
  assert.ok(p1OperatorReadinessSource.includes('daegu-seatmap-p1-operator-readiness.json'));
  assert.ok(p1OperatorReadinessSource.includes('waiting-for-operator'));
  assert.ok(p1OperatorReadinessSource.includes('awaitingOperatorInput'));
  assert.ok(p1OperatorReadinessSource.includes('readyForTemplateImport'));
  assert.ok(p1OperatorReadinessSource.includes('readyForGuardedWriteAfterTemplateImport'));
  assert.ok(p1OperatorReadinessSource.includes('NO_P1_TEMPLATE_CHANGES_TO_IMPORT'));
  assert.ok(p1OperatorReadinessSource.includes('NO_APPROVED_P1_ROWS_TEMPLATE_IMPORT_WILL_BLOCK'));
  assert.ok(p1OperatorReadinessSource.includes('P1_STAGE_ORDER_APPROVAL_BLOCKED'));
  assert.ok(p1OperatorReadinessSource.includes('firstIncompleteStage'));
  assert.ok(p1OperatorReadinessSource.includes('P1_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(p1OperatorReadinessSource.includes('P1_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(p1OperatorReadinessSource.includes('P1_PENDING_ROWS_REMAIN'));
  assert.ok(p1OperatorReadinessSource.includes('P1_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(p1OperatorReadinessSource.includes('This readiness gate is read-only'));
  assert.ok(p1OperatorReadinessSource.includes('Do not run npm run stadium:daegu:operator-corrections after p1-operator-import:write-template'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('DAEGU_P1_BOUNDARY_FIRST_READINESS_V1'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('daegu-seatmap-p1-boundary-first-readiness.json'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('READY_FOR_OPERATOR'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('MISSING_EVIDENCE'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('MISSING_CONTEXT'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('APPROVED_VALID'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('APPROVED_INVALID'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('canAdvanceToSingleCorrectedPath'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('T1-1'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('T3-2'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('V1'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('V2'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('V3'));
  assert.ok(p1BoundaryFirstReadinessSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1BoundaryFirstPacketSource.includes('DAEGU_P1_BOUNDARY_FIRST_PACKET_V1'));
  assert.ok(p1BoundaryFirstPacketSource.includes('DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1'));
  assert.ok(p1BoundaryFirstPacketSource.includes('daegu-seatmap-p1-boundary-first-packet.json'));
  assert.ok(p1BoundaryFirstPacketSource.includes('daegu-seatmap-p1-boundary-first-overlay.svg'));
  assert.ok(p1BoundaryFirstPacketSource.includes('candidateReferenceOnly'));
  assert.ok(p1BoundaryFirstPacketSource.includes('templateOnly: true'));
  assert.ok(p1BoundaryFirstPacketSource.includes('existingOperatorTemplate'));
  assert.ok(p1BoundaryFirstPacketSource.includes('preservedEditableRows'));
  assert.ok(p1BoundaryFirstPacketSource.includes('hasOperatorFilledEditableFields'));
  assert.ok(p1BoundaryFirstPacketSource.includes('editableSource'));
  assert.ok(p1BoundaryFirstPacketSource.includes('Regenerating this packet must preserve operator-filled editable fields'));
  assert.ok(p1BoundaryFirstPacketSource.includes('productionWriteAllowed: false'));
  assert.ok(p1BoundaryFirstPacketSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1BoundaryFirstPacketSource.includes('writesOperatorDecision: false'));
  assert.ok(p1BoundaryFirstPacketSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('TEMPLATE_HAS_NON_BOUNDARY_ROWS'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('APPROVED_ROW_MISSING_FIELDS'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('CORRECTED_LABEL_OUTSIDE_PATH'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('ready-for-source-copy'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('waiting-for-operator'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('partial-boundary-approval'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('templateSha256'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('sourceInputSha256'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('writesSourceInput: false'));
  assert.ok(p1BoundaryFirstTemplateGateSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('DAEGU_P1_BOUNDARY_FIRST_SOURCE_COPY_V1'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('daegu-seatmap-p1-boundary-first-source-copy.json'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('GATE_TEMPLATE_SHA256_STALE'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('GATE_SOURCE_INPUT_SHA256_STALE'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('WRITE_SOURCE_INPUT_REQUIRES_READY_GATE_AND_FIVE_APPROVALS'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('ready-for-write-source-input'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('source-input-updated'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstSourceCopySource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('DAEGU_P1_BOUNDARY_FIRST_PACKET_V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('DAEGU_P1_BOUNDARY_FIRST_TEMPLATE_GATE_V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('DAEGU_P1_BOUNDARY_FIRST_SOURCE_COPY_V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('DAEGU_P1_BOUNDARY_FIRST_READINESS_V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('daegu-seatmap-p1-boundary-first-review-board.json'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('daegu-seatmap-p1-boundary-first-review-board.svg'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('T1-1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('T3-2'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('V1'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('V2'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('V3'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('candidateReferenceOnly'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('templateEditableSource'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('approvalMissingFields'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('nextOperatorAction'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('correctedLabelX/Y'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('Fill ${missingFields.join'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('productionWriteAllowed: false'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('writesOperatorDecision: false'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('operatorDecision=APPROVED'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('correctedPath'));
  assert.ok(p1BoundaryFirstReviewBoardSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('DAEGU_P1_BOUNDARY_FIRST_OPERATOR_TEMPLATE_V1'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('daegu-seatmap-p1-boundary-first-entry-sheet.json'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('daegu-seatmap-p1-boundary-first-entry-sheet.csv'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('daegu-seatmap-p1-boundary-first-entry-sheet.md'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('waiting-for-operator-entry'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('ready-for-template-gate'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('missingOperatorInputFields'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('editableTarget'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('candidatePath is reference-only and must not be copied into correctedPath'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('productionWriteAllowed: false'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('writesOperatorDecision: false'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstEntrySheetSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('daegu-seatmap-p1-boundary-first-entry-preflight.json'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('daegu-seatmap-p1-boundary-first-entry-preflight.csv'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('daegu-seatmap-p1-boundary-first-entry-preflight.md'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('--require-ready'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('report-only'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('require-ready'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('ENTRY_PREFLIGHT_REQUIRES_OPERATOR_INPUT'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('waiting-for-operator-entry'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('ready-for-template-gate'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('missingOperatorInputFields'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('This preflight is read-only.'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('It never writes operatorDecision or corrected fields into any source input.'));
  assert.ok(p1BoundaryFirstEntryPreflightSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('DAEGU_P1_BOUNDARY_FIRST_TRACING_PACK_V1'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('DAEGU_P1_BOUNDARY_FIRST_REVIEW_BOARD_V1'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('DAEGU_P1_BOUNDARY_FIRST_ENTRY_SHEET_V1'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('daegu-seatmap-p1-boundary-first-tracing-pack.json'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('daegu-seatmap-p1-boundary-first-tracing-pack.csv'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('daegu-seatmap-p1-boundary-first-tracing-pack.md'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('daegu-seatmap-p1-boundary-first-tracing-overview.svg'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('ready-for-operator-tracing'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('official Daegu PNG as the SVG background'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('candidatePath is reference-only and must not be copied into correctedPath'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('editableTarget'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('gridLines'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('target-current'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('target-candidate'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('paired-current'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('productionWriteAllowed: false'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('writesOperatorDecision: false'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstTracingPackSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('DAEGU_P1_BOUNDARY_FIRST_OPERATOR_HANDOFF_V1'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('DAEGU_P1_BOUNDARY_FIRST_TRACING_PACK_V1'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('DAEGU_P1_BOUNDARY_FIRST_ENTRY_PREFLIGHT_V1'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('daegu-seatmap-p1-boundary-first-operator-handoff.json'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('daegu-seatmap-p1-boundary-first-operator-handoff.csv'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('daegu-seatmap-p1-boundary-first-operator-handoff.md'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('ready-for-operator-tracing'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('ready-for-source-copy'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('operator-input-needs-gate-fix'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('postwrite-verified'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('operatorDecision=APPROVED'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('correctedPath'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('correctedLabelX/Y'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('reviewer'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('reviewedAt'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('candidatePath is reference-only and must not be copied into correctedPath'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('writesOperatorDecision: false'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('writesSourceInput: false'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstOperatorHandoffSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('BATCH_2_P1'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('daegu-seatmap-p1-boundary-first-postwrite-gate.json'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('waiting-for-operator'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('postwrite-verified'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('--require-written'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('P1_BOUNDARY_FIRST_REQUIRES_FIVE_APPROVED_SOURCE_ROWS'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('VALIDATION_HAS_NON_BOUNDARY_APPROVED_ROWS'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('APPLY_REPORT_NOT_WRITE_MODE'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('BOUNDARY_ROW_PROMOTED_WITHOUT_SOURCE_APPROVAL'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('NORMAL_SELECTABLE_PREDICATE_FALSE'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('ALIGNMENT_CLASS_NOT_LOCKED_VERIFIED'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('RENDER_SAFETY_NOT_NORMAL_SELECTABLE'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('writesSourceInput: false'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryFirstPostwriteGateSource.includes('This gate is read-only and never modifies source input, corrections template, or src/data/daeguSeatData.ts.'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('DAEGU_P1_BOUNDARY_FIRST_REGRESSION_V1'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('template-preservation'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('P1_BOUNDARY_FIRST_TEMPLATE_PRESERVATION_REGRESSION'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('preservationPreservedEditableRows'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('PRESERVATION_EDITABLE_ROWS_MISMATCH'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('PRESERVATION_T11_PATH_LOST'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('PRESERVATION_NON_EDITED_ROW_NOT_REGENERATED_FROM_SOURCE'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('daegu-p1-boundary-first-regression'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('APPROVED_INVALID'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('APPROVED_ROW_MISSING_FIELDS:correctedPath'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('APPROVED_ROW_MISSING_FIELDS:correctedLabelX correctedLabelY'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('BOUNDARY_FIRST_DUPLICATE_CORRECTED_PATH'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('CORRECTED_LABEL_OUTSIDE_PATH'));
  assert.ok(p1BoundaryFirstRegressionSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p1StageOrderRegressionSource.includes('DAEGU_P1_STAGE_ORDER_REGRESSION_V1'));
  assert.ok(p1StageOrderRegressionSource.includes('daegu-p1-stage-order-regression'));
  assert.ok(p1StageOrderRegressionSource.includes('daegu-outfield-couple-m-m-9'));
  assert.ok(p1StageOrderRegressionSource.includes('WRITE_TEMPLATE_REQUIRES_P1_STAGE_ORDER'));
  assert.ok(p1StageOrderRegressionSource.includes('P1_STAGE_ORDER_APPROVAL_BLOCKED'));
  assert.ok(p1StageOrderRegressionSource.includes('PAIR_BOUNDARY_FIRST'));
  assert.ok(p1StageOrderRegressionSource.includes('SINGLE_CORRECTED_PATH'));
  assert.ok(p1StageOrderRegressionSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p2ReviewPackageSource.includes('DAEGU_P2_REVIEW_PACKAGE_V1'));
  assert.ok(p2ReviewPackageSource.includes('EXPECTED_P2_COUNTS'));
  assert.ok(p2ReviewPackageSource.includes('MANUAL_RETRACE_REQUIRED'));
  assert.ok(p2ReviewPackageSource.includes('LABEL_AND_HIT_AREA_REVIEW'));
  assert.ok(p2ReviewPackageSource.includes('VISUAL_APPROVAL_CANDIDATE'));
  assert.ok(p2ReviewPackageSource.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(p2ReviewPackageSource.includes('DRAFT_VALIDATION_ONLY'));
  assert.ok(p2ReviewPackageSource.includes('--handoff'));
  assert.ok(p2ReviewPackageSource.includes('--allow-draft-markers'));
  assert.ok(p2ReviewPackageSource.includes('daegu-seatmap-p2-review-checklist.md'));
  assert.ok(p2ReviewPackageSource.includes('daegu-seatmap-p2-operator-approval-candidates.json'));
  assert.ok(p2ReviewPackageSource.includes('daegu-seatmap-p2-manual-retrace-template.json'));
  assert.ok(p2ReviewPackageSource.includes('stagingOnly'));
  assert.ok(p2StagingAuditSource.includes('DAEGU_P2_STAGING_AUDIT_V1'));
  assert.ok(p2StagingAuditSource.includes('daegu-seatmap-p2-staging-audit.json'));
  assert.ok(p2StagingAuditSource.includes('APPROVAL_CANDIDATE_ROWS'));
  assert.ok(p2StagingAuditSource.includes('MANUAL_RETRACE_ROWS'));
  assert.ok(p2StagingAuditSource.includes('APPROVAL_CANDIDATE_APPROVED_ROWS'));
  assert.ok(p2StagingAuditSource.includes('MANUAL_RETRACE_FILLED_PATH_ROWS'));
  assert.ok(p2OperatorPackageSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(p2OperatorPackageSource.includes('DAEGU_P2_REVIEW_PACKAGE_V1'));
  assert.ok(p2OperatorPackageSource.includes('BATCH_3_P2'));
  assert.ok(p2OperatorPackageSource.includes('approvalCandidateRows: 3'));
  assert.ok(p2OperatorPackageSource.includes('manualRetraceRows: 33'));
  assert.ok(p2OperatorPackageSource.includes('candidatePath'));
  assert.ok(p2OperatorPackageSource.includes('Candidate paths in this package are references only'));
  assert.ok(p2OperatorPackageSource.includes('daegu-seatmap-p2-operator-input.json'));
  assert.ok(p2OperatorPackageSource.includes('daegu-seatmap-p2-operator-input.csv'));
  assert.ok(p2OperatorPackageSource.includes('daegu-seatmap-p2-operator-checklist.md'));
  assert.ok(p2OperatorPackageSource.includes('existingOperatorInput'));
  assert.ok(p2OperatorPackageSource.includes('preservedEditableRows'));
  assert.ok(p2OperatorPackageSource.includes('Regenerating this package must preserve operator-filled P2 editable fields'));
  assert.ok(p2OperatorPackageSource.includes('noCoordinateInference'));
  assert.ok(p2OperatorPackageSource.includes('noExternalCrawlingOrWebSearch'));
  assert.ok(p2DecisionPacketSource.includes('DAEGU_P2_DECISION_PACKET_V1'));
  assert.ok(p2DecisionPacketSource.includes('daegu-seatmap-p2-decision-packet.json'));
  assert.ok(p2DecisionPacketSource.includes('daegu-seatmap-p2-decision-packet.csv'));
  assert.ok(p2DecisionPacketSource.includes('daegu-seatmap-p2-decision-packet.md'));
  assert.ok(p2DecisionPacketSource.includes('manualTraceRequiredRows: 33'));
  assert.ok(p2DecisionPacketSource.includes('labelAndHitAreaRows: 2'));
  assert.ok(p2DecisionPacketSource.includes('visualApprovalCandidateRows: 1'));
  assert.ok(p2DecisionPacketSource.includes('P2 write-template remains blocked until P0 and P1 are closed.'));
  assert.ok(p2DecisionPacketSource.includes('P2 staging and draft values are not production approvals.'));
  assert.ok(p2DecisionPacketSource.includes('Candidate paths are visual references only'));
  assert.ok(p2DecisionPacketSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p2DecisionPacketSource.includes('requiresOperatorDecision'));
  assert.ok(p2NextActionPacketSource.includes('DAEGU_P2_NEXT_ACTION_PACKET_V1'));
  assert.ok(p2NextActionPacketSource.includes('daegu-seatmap-p2-next-action-packet.json'));
  assert.ok(p2NextActionPacketSource.includes('daegu-seatmap-p2-next-action-packet.csv'));
  assert.ok(p2NextActionPacketSource.includes('daegu-seatmap-p2-next-action-packet.md'));
  assert.ok(p2NextActionPacketSource.includes('LABEL_HIT_AREA_REVIEW_FIRST'));
  assert.ok(p2NextActionPacketSource.includes('VISUAL_APPROVAL_CHECK'));
  assert.ok(p2NextActionPacketSource.includes('MANUAL_RETRACE_BATCH'));
  assert.ok(p2NextActionPacketSource.includes('expectedRows: 36'));
  assert.ok(p2NextActionPacketSource.includes('labelAndHitAreaRows: 2'));
  assert.ok(p2NextActionPacketSource.includes('visualApprovalCandidateRows: 1'));
  assert.ok(p2NextActionPacketSource.includes('manualRetraceRows: 33'));
  assert.ok(p2NextActionPacketSource.includes('approvalCandidateRows: 3'));
  assert.ok(p2NextActionPacketSource.includes('productionWriteAllowed: false'));
  assert.ok(p2NextActionPacketSource.includes('writesOperatorDecision: false'));
  assert.ok(p2NextActionPacketSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2NextActionPacketSource.includes('writesProductionData: false'));
  assert.ok(p2NextActionPacketSource.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(p2NextActionPacketSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p2NextActionPacketSource.includes('P2 staging and draft values are not production approvals.'));
  assert.ok(p2NextActionPacketSource.includes('operatorDecision=APPROVED'));
  assert.ok(p2NextActionPacketSource.includes('correctedPath'));
  assert.ok(p2OperatorHandoffSource.includes('DAEGU_P2_OPERATOR_HANDOFF_V1'));
  assert.ok(p2OperatorHandoffSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(p2OperatorHandoffSource.includes('DAEGU_P2_NEXT_ACTION_PACKET_V1'));
  assert.ok(p2OperatorHandoffSource.includes('DAEGU_P2_OPERATOR_READINESS_V2'));
  assert.ok(p2OperatorHandoffSource.includes('DAEGU_P2_STAGING_AUDIT_V1'));
  assert.ok(p2OperatorHandoffSource.includes('DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1'));
  assert.ok(p2OperatorHandoffSource.includes('daegu-seatmap-p2-operator-handoff.json'));
  assert.ok(p2OperatorHandoffSource.includes('daegu-seatmap-p2-operator-handoff.csv'));
  assert.ok(p2OperatorHandoffSource.includes('daegu-seatmap-p2-operator-handoff.md'));
  assert.ok(p2OperatorHandoffSource.includes('waiting-for-prior-batch-and-operator'));
  assert.ok(p2OperatorHandoffSource.includes('ready-for-template-import'));
  assert.ok(p2OperatorHandoffSource.includes('LABEL_HIT_AREA_REVIEW_FIRST'));
  assert.ok(p2OperatorHandoffSource.includes('VISUAL_APPROVAL_CHECK'));
  assert.ok(p2OperatorHandoffSource.includes('MANUAL_RETRACE_BATCH'));
  assert.ok(p2OperatorHandoffSource.includes('P2 production write remains blocked until P1 boundary-first postwrite is verified.'));
  assert.ok(p2OperatorHandoffSource.includes('writesOperatorDecision: false'));
  assert.ok(p2OperatorHandoffSource.includes('writesSourceInput: false'));
  assert.ok(p2OperatorHandoffSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2OperatorHandoffSource.includes('writesProductionData: false'));
  assert.ok(p2OperatorHandoffSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2OperatorWorksetsSource.includes('DAEGU_P2_OPERATOR_WORKSETS_V1'));
  assert.ok(p2OperatorWorksetsSource.includes('DAEGU_P2_OPERATOR_HANDOFF_V1'));
  assert.ok(p2OperatorWorksetsSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(p2OperatorWorksetsSource.includes('daegu-seatmap-p2-operator-worksets.json'));
  assert.ok(p2OperatorWorksetsSource.includes('daegu-seatmap-p2-operator-worksets.csv'));
  assert.ok(p2OperatorWorksetsSource.includes('daegu-seatmap-p2-operator-worksets.md'));
  assert.ok(p2OperatorWorksetsSource.includes("slug: 'p2-a-label-hit'"));
  assert.ok(p2OperatorWorksetsSource.includes("slug: 'p2-b-visual-approval'"));
  assert.ok(p2OperatorWorksetsSource.includes("slug: 'p2-c-sky-u-manual-retrace'"));
  assert.ok(p2OperatorWorksetsSource.includes("slug: 'p2-d-outfield-manual-retrace'"));
  assert.ok(p2OperatorWorksetsSource.includes('p2aRows: 2'));
  assert.ok(p2OperatorWorksetsSource.includes('p2bRows: 1'));
  assert.ok(p2OperatorWorksetsSource.includes('p2cRows: 5'));
  assert.ok(p2OperatorWorksetsSource.includes('p2dRows: 28'));
  assert.ok(p2OperatorWorksetsSource.includes('candidateReferenceOnly: true'));
  assert.ok(p2OperatorWorksetsSource.includes('minCorrectedPathPoints: 6'));
  assert.ok(p2OperatorWorksetsSource.includes('candidatePath and candidateLabel are reference-only'));
  assert.ok(p2OperatorWorksetsSource.includes('writesOperatorDecision: false'));
  assert.ok(p2OperatorWorksetsSource.includes('writesSourceInput: false'));
  assert.ok(p2OperatorWorksetsSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2OperatorWorksetsSource.includes('writesProductionData: false'));
  assert.ok(p2OperatorWorksetsSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('DAEGU_P2_OPERATOR_WORKSETS_V1'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('daegu-seatmap-p2-operator-workset-preflight.json'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('daegu-seatmap-p2-operator-workset-preflight.csv'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('daegu-seatmap-p2-operator-workset-preflight.md'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('APPROVED_ROW_MISSING_FIELDS'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('CORRECTED_PATH_REUSES_CURRENT_PATH'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('CORRECTED_PATH_REUSES_CANDIDATE_PATH'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('CORRECTED_LABEL_XY_NOT_NUMERIC'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('LABEL_TOP_HIT_REQUIRES_OPERATOR_QA'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('VISUAL_APPROVAL_OPERATOR_NOTE_RECOMMENDED'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('P2_WORKSET_DUPLICATE_ASSIGNMENT'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('P2_WORKSET_UNASSIGNED_ROWS'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('writesOperatorDecision: false'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('writesSourceInput: false'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('writesProductionData: false'));
  assert.ok(p2OperatorWorksetPreflightSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2OperatorEntrySheetSource.includes('DAEGU_P2_OPERATOR_ENTRY_SHEET_V1'));
  assert.ok(p2OperatorEntrySheetSource.includes('DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1'));
  assert.ok(p2OperatorEntrySheetSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-operator-entry-sheet.json'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-operator-entry-sheet.csv'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-operator-entry-sheet.md'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-a-label-hit-entry-sheet'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-b-visual-approval-entry-sheet'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-c-sky-u-manual-retrace-entry-sheet'));
  assert.ok(p2OperatorEntrySheetSource.includes('daegu-seatmap-p2-d-outfield-manual-retrace-entry-sheet'));
  assert.ok(p2OperatorEntrySheetSource.includes('editableTarget'));
  assert.ok(p2OperatorEntrySheetSource.includes('editableFields'));
  assert.ok(p2OperatorEntrySheetSource.includes('operatorDecision'));
  assert.ok(p2OperatorEntrySheetSource.includes('correctedPath'));
  assert.ok(p2OperatorEntrySheetSource.includes('correctedLabelX'));
  assert.ok(p2OperatorEntrySheetSource.includes('correctedLabelY'));
  assert.ok(p2OperatorEntrySheetSource.includes('reviewer'));
  assert.ok(p2OperatorEntrySheetSource.includes('reviewedAt'));
  assert.ok(p2OperatorEntrySheetSource.includes('candidatePath is reference-only'));
  assert.ok(p2OperatorEntrySheetSource.includes('currentPath is reference-only'));
  assert.ok(p2OperatorEntrySheetSource.includes('waiting-for-operator-entry'));
  assert.ok(p2OperatorEntrySheetSource.includes('writesOperatorDecision: false'));
  assert.ok(p2OperatorEntrySheetSource.includes('writesSourceInput: false'));
  assert.ok(p2OperatorEntrySheetSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2OperatorEntrySheetSource.includes('writesProductionData: false'));
  assert.ok(p2OperatorEntrySheetSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2OperatorTracingPackSource.includes('DAEGU_P2_OPERATOR_TRACING_PACK_V1'));
  assert.ok(p2OperatorTracingPackSource.includes('DAEGU_P2_OPERATOR_ENTRY_SHEET_V1'));
  assert.ok(p2OperatorTracingPackSource.includes('DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1'));
  assert.ok(p2OperatorTracingPackSource.includes('DAEGU_SEATMAP_IMAGE'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-operator-tracing-pack.json'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-operator-tracing-pack.csv'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-operator-tracing-pack.md'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-operator-tracing-overview.svg'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-a-label-hit-tracing-overview.svg'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-b-visual-approval-tracing-overview.svg'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-c-sky-u-manual-retrace-tracing-overview.svg'));
  assert.ok(p2OperatorTracingPackSource.includes('daegu-seatmap-p2-d-outfield-manual-retrace-tracing-overview.svg'));
  assert.ok(p2OperatorTracingPackSource.includes('red=currentPath, orange=candidatePath reference-only'));
  assert.ok(p2OperatorTracingPackSource.includes('official Daegu PNG'));
  assert.ok(p2OperatorTracingPackSource.includes('1707x2048'));
  assert.ok(p2OperatorTracingPackSource.includes('editableTarget'));
  assert.ok(p2OperatorTracingPackSource.includes('candidatePath is reference-only and must not be copied into correctedPath'));
  assert.ok(p2OperatorTracingPackSource.includes('currentPath is reference-only and must not be copied into correctedPath'));
  assert.ok(p2OperatorTracingPackSource.includes('writesOperatorDecision: false'));
  assert.ok(p2OperatorTracingPackSource.includes('writesSourceInput: false'));
  assert.ok(p2OperatorTracingPackSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2OperatorTracingPackSource.includes('writesProductionData: false'));
  assert.ok(p2OperatorTracingPackSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_ENTRY_SHEET_V1'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_TRACING_PACK_V1'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_WORKSET_PREFLIGHT_V1'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_HANDOFF_V1'));
  assert.ok(p2OperatorPostEntryQaSource.includes('daegu-seatmap-p2-operator-post-entry-qa.json'));
  assert.ok(p2OperatorPostEntryQaSource.includes('daegu-seatmap-p2-operator-post-entry-qa.csv'));
  assert.ok(p2OperatorPostEntryQaSource.includes('daegu-seatmap-p2-operator-post-entry-qa.md'));
  assert.ok(p2OperatorPostEntryQaSource.includes('waiting-for-operator-entry'));
  assert.ok(p2OperatorPostEntryQaSource.includes('blocked-after-entry'));
  assert.ok(p2OperatorPostEntryQaSource.includes('waiting-for-p1-postwrite'));
  assert.ok(p2OperatorPostEntryQaSource.includes('ready-for-p2-readiness'));
  assert.ok(p2OperatorPostEntryQaSource.includes('APPROVED_ROW_MISSING_FIELDS'));
  assert.ok(p2OperatorPostEntryQaSource.includes('CORRECTED_PATH_REUSES_CURRENT_PATH'));
  assert.ok(p2OperatorPostEntryQaSource.includes('CORRECTED_PATH_REUSES_CANDIDATE_PATH'));
  assert.ok(p2OperatorPostEntryQaSource.includes('CORRECTED_PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(p2OperatorPostEntryQaSource.includes('CORRECTED_LABEL_XY_NOT_NUMERIC'));
  assert.ok(p2OperatorPostEntryQaSource.includes('EVIDENCE_CROP_MISSING'));
  assert.ok(p2OperatorPostEntryQaSource.includes('TRACING_SVG_MISSING'));
  assert.ok(p2OperatorPostEntryQaSource.includes('WORKSET_ASSIGNMENT_MISMATCH'));
  assert.ok(p2OperatorPostEntryQaSource.includes('FILL_REQUIRED_FIELDS'));
  assert.ok(p2OperatorPostEntryQaSource.includes('RETRACE_FROM_OFFICIAL_PNG'));
  assert.ok(p2OperatorPostEntryQaSource.includes('MOVE_LABEL_POINT'));
  assert.ok(p2OperatorPostEntryQaSource.includes('REVIEW_LABEL_TOP_HIT'));
  assert.ok(p2OperatorPostEntryQaSource.includes('DO_NOT_COPY_REFERENCE_PATH'));
  assert.ok(p2OperatorPostEntryQaSource.includes('RUN_WORKSET_PREFLIGHT'));
  assert.ok(p2OperatorPostEntryQaSource.includes('WAIT_FOR_P1_POSTWRITE'));
  assert.ok(p2OperatorPostEntryQaSource.includes('P2 production write waits for P1 boundary-first postwrite verification.'));
  assert.ok(p2OperatorPostEntryQaSource.includes('writesOperatorDecision: false'));
  assert.ok(p2OperatorPostEntryQaSource.includes('writesSourceInput: false'));
  assert.ok(p2OperatorPostEntryQaSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2OperatorPostEntryQaSource.includes('writesProductionData: false'));
  assert.ok(p2OperatorPostEntryQaSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2aOperatorPostEntryQaSource.includes("const TARGET_WORKSET = 'P2-A'"));
  assert.ok(p2aOperatorPostEntryQaSource.includes('const EXPECTED_P2A_ROWS = 2'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('daegu-seatmap-p2a-operator-post-entry-qa.json'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('daegu-seatmap-p2a-operator-post-entry-qa.csv'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('daegu-seatmap-p2a-operator-post-entry-qa.md'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('waiting-for-operator-entry'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('waiting-for-p1-postwrite'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('ready-for-p2-readiness'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('P2A_LABEL_TOP_HIT_OPERATOR_QA_REQUIRED'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('REVIEW_LABEL_TOP_HIT'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('CONTINUE_P2_FULL_READINESS'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('readyForProductionWrite: false'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('writesOperatorDecision: false'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('writesSourceInput: false'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('writesProductionData: false'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2aOperatorPostEntryQaSource.includes('P2-A approval never bypasses the full P2 readiness gate.'));
  assert.ok(p2aOperatorInputPacketSource.includes('DAEGU_P2A_OPERATOR_INPUT_PACKET_V1'));
  assert.ok(p2aOperatorInputPacketSource.includes('DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2aOperatorInputPacketSource.includes('DAEGU_P2_OPERATOR_ENTRY_SHEET_V1'));
  assert.ok(p2aOperatorInputPacketSource.includes('DAEGU_P2_OPERATOR_TRACING_PACK_V1'));
  assert.ok(p2aOperatorInputPacketSource.includes("const TARGET_WORKSET = 'P2-A'"));
  assert.ok(p2aOperatorInputPacketSource.includes('const EXPECTED_P2A_ROWS = 2'));
  assert.ok(p2aOperatorInputPacketSource.includes('daegu-seatmap-p2a-operator-input-packet.json'));
  assert.ok(p2aOperatorInputPacketSource.includes('daegu-seatmap-p2a-operator-input-packet.csv'));
  assert.ok(p2aOperatorInputPacketSource.includes('daegu-seatmap-p2a-operator-input-packet.md'));
  assert.ok(p2aOperatorInputPacketSource.includes('operatorDecision=APPROVED'));
  assert.ok(p2aOperatorInputPacketSource.includes('correctedPath'));
  assert.ok(p2aOperatorInputPacketSource.includes('correctedLabelX'));
  assert.ok(p2aOperatorInputPacketSource.includes('correctedLabelY'));
  assert.ok(p2aOperatorInputPacketSource.includes('reviewer'));
  assert.ok(p2aOperatorInputPacketSource.includes('reviewedAt'));
  assert.ok(p2aOperatorInputPacketSource.includes('operatorNote'));
  assert.ok(p2aOperatorInputPacketSource.includes('CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON'));
  assert.ok(p2aOperatorInputPacketSource.includes('CHECK_LABEL_POINT_SELECTS_SAME_BLOCK'));
  assert.ok(p2aOperatorInputPacketSource.includes('CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK'));
  assert.ok(p2aOperatorInputPacketSource.includes('CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA'));
  assert.ok(p2aOperatorInputPacketSource.includes('CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED'));
  assert.ok(p2aOperatorInputPacketSource.includes('waiting-for-operator-entry'));
  assert.ok(p2aOperatorInputPacketSource.includes('waiting-for-p1-postwrite'));
  assert.ok(p2aOperatorInputPacketSource.includes('ready-for-p2-readiness'));
  assert.ok(p2aOperatorInputPacketSource.includes('productionWriteAllowed: false'));
  assert.ok(p2aOperatorInputPacketSource.includes('writesOperatorDecision: false'));
  assert.ok(p2aOperatorInputPacketSource.includes('writesSourceInput: false'));
  assert.ok(p2aOperatorInputPacketSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2aOperatorInputPacketSource.includes('writesProductionData: false'));
  assert.ok(p2aOperatorInputPacketSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2aOperatorInputPacketSource.includes('currentPath is reference-only and must not be copied into correctedPath.'));
  assert.ok(p2aOperatorInputPacketSource.includes('candidatePath is reference-only and must not be copied into correctedPath.'));
  assert.ok(p2aOperatorInputPacketSource.includes('P2-A approval never bypasses full P2 readiness or the production write guard.'));
  assert.ok(p2aPrewriteGateSource.includes('DAEGU_P2A_PREWRITE_GATE_V1'));
  assert.ok(p2aPrewriteGateSource.includes('DAEGU_P2A_OPERATOR_INPUT_PACKET_V1'));
  assert.ok(p2aPrewriteGateSource.includes('DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2aPrewriteGateSource.includes('DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1'));
  assert.ok(p2aPrewriteGateSource.includes("const TARGET_WORKSET = 'P2-A'"));
  assert.ok(p2aPrewriteGateSource.includes('const EXPECTED_P2A_ROWS = 2'));
  assert.ok(p2aPrewriteGateSource.includes('daegu-seatmap-p2a-prewrite-gate.json'));
  assert.ok(p2aPrewriteGateSource.includes('daegu-seatmap-p2a-prewrite-gate.csv'));
  assert.ok(p2aPrewriteGateSource.includes('daegu-seatmap-p2a-prewrite-gate.md'));
  assert.ok(p2aPrewriteGateSource.includes('daegu-seatmap-p2a-prewrite-preview.svg'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_APPROVED_ROW_MISSING_FIELDS'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_CORRECTED_PATH_REUSES_CURRENT_PATH'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_CORRECTED_PATH_REUSES_CANDIDATE_PATH'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_CORRECTED_LABEL_OUTSIDE_PATH'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_CORRECTED_LABEL_TOP_HIT_MISMATCH'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_CORRECTED_HIT_PATH_CAPTURES_NEIGHBOR_LABEL'));
  assert.ok(p2aPrewriteGateSource.includes('P2A_VALIDATION_ROW_NOT_VALID_FOR_APPROVAL'));
  assert.ok(p2aPrewriteGateSource.includes('CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON'));
  assert.ok(p2aPrewriteGateSource.includes('CHECK_LABEL_POINT_SELECTS_SAME_BLOCK'));
  assert.ok(p2aPrewriteGateSource.includes('CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK'));
  assert.ok(p2aPrewriteGateSource.includes('CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA'));
  assert.ok(p2aPrewriteGateSource.includes('CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED'));
  assert.ok(p2aPrewriteGateSource.includes('waiting-for-operator-entry'));
  assert.ok(p2aPrewriteGateSource.includes('waiting-for-p1-postwrite'));
  assert.ok(p2aPrewriteGateSource.includes('ready-for-p2-readiness'));
  assert.ok(p2aPrewriteGateSource.includes('daegu-seatmap-p1-boundary-first-postwrite-gate.json'));
  assert.ok(p2aPrewriteGateSource.includes('sourceP1PostwriteGateExists'));
  assert.ok(p2aPrewriteGateSource.includes('--allow-waiting-exit-zero'));
  assert.ok(p2aPrewriteGateSource.includes('readyForProductionWrite: false'));
  assert.ok(p2aPrewriteGateSource.includes('writesOperatorDecision: false'));
  assert.ok(p2aPrewriteGateSource.includes('writesSourceInput: false'));
  assert.ok(p2aPrewriteGateSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p2aPrewriteGateSource.includes('writesProductionData: false'));
  assert.ok(p2aPrewriteGateSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p2aPrewriteGateSource.includes('P2-A prewrite readiness never bypasses the full P2 readiness gate or production write guard.'));
  assert.ok(p2aReadinessV3Source.includes('DAEGU_P2A_READINESS_V3'));
  assert.ok(p2aReadinessV3Source.includes('DAEGU_P2A_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2aReadinessV3Source.includes('DAEGU_P2A_OPERATOR_INPUT_PACKET_V1'));
  assert.ok(p2aReadinessV3Source.includes('DAEGU_P2A_PREWRITE_GATE_V1'));
  assert.ok(p2aReadinessV3Source.includes('DAEGU_P2_OPERATOR_READINESS_V2'));
  assert.ok(p2aReadinessV3Source.includes('DAEGU_SEATMAP_RENDER_SAFETY_AUDIT_V1'));
  assert.ok(p2aReadinessV3Source.includes("const TARGET_WORKSET = 'P2-A'"));
  assert.ok(p2aReadinessV3Source.includes('daegu-seatmap-p2a-readiness-v3.json'));
  assert.ok(p2aReadinessV3Source.includes('daegu-seatmap-p2a-readiness-v3.csv'));
  assert.ok(p2aReadinessV3Source.includes('daegu-seatmap-p2a-readiness-v3.md'));
  assert.ok(p2aReadinessV3Source.includes('P2A_WAITING_OPERATOR_ENTRY'));
  assert.ok(p2aReadinessV3Source.includes('P2A_WAITING_P1_POSTWRITE'));
  assert.ok(p2aReadinessV3Source.includes('P2A_WAITING_FULL_P2_READINESS'));
  assert.ok(p2aReadinessV3Source.includes('PASS_UI_CONTAINMENT'));
  assert.ok(p2aReadinessV3Source.includes('P2A_NEVER_ALLOWS_DIRECT_PRODUCTION_WRITE'));
  assert.ok(p2aReadinessV3Source.includes('productionWriteAllowed: false'));
  assert.ok(p2aReadinessV3Source.includes('It never writes source input, corrections template, or src/data/daeguSeatData.ts.'));
  assert.ok(p2OperatorImportSource.includes('DAEGU_P2_OPERATOR_IMPORT_V1'));
  assert.ok(p2OperatorImportSource.includes('BATCH_3_P2'));
  assert.ok(p2OperatorImportSource.includes('BATCH_1_P0'));
  assert.ok(p2OperatorImportSource.includes('BATCH_2_P1'));
  assert.ok(p2OperatorImportSource.includes('DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1'));
  assert.ok(p2OperatorImportSource.includes('daegu-seatmap-p2-operator-import.json'));
  assert.ok(p2OperatorImportSource.includes('daegu-seatmap-p2-operator-import.md'));
  assert.ok(p2OperatorImportSource.includes('--write-template'));
  assert.ok(p2OperatorImportSource.includes('productionDataChanged: false'));
  assert.ok(p2OperatorImportSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p2OperatorImportSource.includes('INVALID_P2_OPERATOR_DECISION'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P2_DECISION'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P2_ROW'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_DRAFT_ONLY'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_STAGING_ONLY'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_HAS_DRAFT_MARKERS'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(p2OperatorImportSource.includes('WRITE_TEMPLATE_P2_INVALID_APPROVED_ROWS'));
  assert.ok(p2OperatorImportSource.includes('Do not run npm run stadium:daegu:operator-corrections after write-template'));
  assert.ok(p2OperatorImportSource.includes('candidate paths are references only'));
  assert.ok(p2OperatorReadinessSource.includes('DAEGU_P2_OPERATOR_READINESS_V2'));
  assert.ok(p2OperatorReadinessSource.includes('DAEGU_P2_OPERATOR_POST_ENTRY_QA_V1'));
  assert.ok(p2OperatorReadinessSource.includes('DAEGU_P1_BOUNDARY_FIRST_POSTWRITE_GATE_V1'));
  assert.ok(p2OperatorReadinessSource.includes('BATCH_3_P2'));
  assert.ok(p2OperatorReadinessSource.includes('BATCH_1_P0'));
  assert.ok(p2OperatorReadinessSource.includes('BATCH_2_P1'));
  assert.ok(p2OperatorReadinessSource.includes('daegu-seatmap-p2-operator-readiness.json'));
  assert.ok(p2OperatorReadinessSource.includes('daegu-seatmap-p2-operator-post-entry-qa.json'));
  assert.ok(p2OperatorReadinessSource.includes('daegu-seatmap-p1-boundary-first-postwrite-gate.json'));
  assert.ok(p2OperatorReadinessSource.includes('waiting-for-operator-entry'));
  assert.ok(p2OperatorReadinessSource.includes('waiting-for-p1-postwrite'));
  assert.ok(p2OperatorReadinessSource.includes('awaitingOperatorInput'));
  assert.ok(p2OperatorReadinessSource.includes('waitingForP1Postwrite'));
  assert.ok(p2OperatorReadinessSource.includes('readyForTemplateImport'));
  assert.ok(p2OperatorReadinessSource.includes('readyForGuardedWriteAfterTemplateImport'));
  assert.ok(p2OperatorReadinessSource.includes('--allow-waiting-exit-zero'));
  assert.ok(p2OperatorReadinessSource.includes('--report-only'));
  assert.ok(p2OperatorReadinessSource.includes('allowWaitingExitZero'));
  assert.ok(p2OperatorReadinessSource.includes('postEntryQaStatus'));
  assert.ok(p2OperatorReadinessSource.includes('p1PostwriteVerified'));
  assert.ok(p2OperatorReadinessSource.includes('P2_WAITING_OPERATOR_ENTRY'));
  assert.ok(p2OperatorReadinessSource.includes('P2_WAITING_FOR_P1_POSTWRITE'));
  assert.ok(p2OperatorReadinessSource.includes('NO_APPROVED_P2_ROWS_TEMPLATE_IMPORT_WILL_BLOCK'));
  assert.ok(p2OperatorReadinessSource.includes('POST_ENTRY_QA_BLOCKED_ROWS'));
  assert.ok(p2OperatorReadinessSource.includes('P2_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(p2OperatorReadinessSource.includes('P2_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(p2OperatorReadinessSource.includes('P2_PENDING_ROWS_REMAIN'));
  assert.ok(p2OperatorReadinessSource.includes('P2_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(p2OperatorReadinessSource.includes('This readiness gate is read-only'));
  assert.ok(p2OperatorReadinessSource.includes('It must be run after npm run stadium:daegu:p2-operator-post-entry-qa.'));
  assert.ok(p2OperatorReadinessSource.includes('candidate paths are references only'));
  assert.ok(p2OperatorReadinessSource.includes('Do not run npm run stadium:daegu:operator-corrections after p2-operator-import:write-template'));
  assert.ok(p3p4OperatorPackageSource.includes('DAEGU_P3_P4_OPERATOR_PACKAGE_V1'));
  assert.ok(p3p4OperatorPackageSource.includes('BATCH_4_P3_P4'));
  assert.ok(p3p4OperatorPackageSource.includes("TARGET_PRIORITIES = ['P3', 'P4']"));
  assert.ok(p3p4OperatorPackageSource.includes('p3Rows: 0'));
  assert.ok(p3p4OperatorPackageSource.includes('p4Rows: 44'));
  assert.ok(p3p4OperatorPackageSource.includes('manualTraceRequiredRows: 22'));
  assert.ok(p3p4OperatorPackageSource.includes('correctedPathRequiredRows: 22'));
  assert.ok(p3p4OperatorPackageSource.includes('labelAndHitAreaRows: 3'));
  assert.ok(p3p4OperatorPackageSource.includes('OPERATOR_MANUAL_TRACE_REQUIRED'));
  assert.ok(p3p4OperatorPackageSource.includes('OPERATOR_CORRECTED_PATH_REQUIRED'));
  assert.ok(p3p4OperatorPackageSource.includes('daegu-seatmap-p3-p4-operator-input.json'));
  assert.ok(p3p4OperatorPackageSource.includes('daegu-seatmap-p3-p4-operator-input.csv'));
  assert.ok(p3p4OperatorPackageSource.includes('daegu-seatmap-p3-p4-operator-checklist.md'));
  assert.ok(p3p4OperatorPackageSource.includes('existingOperatorInput'));
  assert.ok(p3p4OperatorPackageSource.includes('preservedEditableRows'));
  assert.ok(p3p4OperatorPackageSource.includes('isGeneratedRetraceNote'));
  assert.ok(p3p4OperatorPackageSource.includes('hasReviewMarker'));
  assert.ok(p3p4OperatorPackageSource.includes('hasCorrectedGeometry'));
  assert.ok(p3p4OperatorPackageSource.includes('Regenerating this package must preserve operator-filled P3/P4 editable fields'));
  assert.ok(p3p4OperatorPackageSource.includes('noCoordinateInference'));
  assert.ok(p3p4OperatorPackageSource.includes('noExternalCrawlingOrWebSearch'));
  assert.ok(p3p4OperatorAuditSource.includes('DAEGU_P3_P4_OPERATOR_AUDIT_V1'));
  assert.ok(p3p4OperatorAuditSource.includes('daegu-seatmap-p3-p4-operator-audit.json'));
  assert.ok(p3p4OperatorAuditSource.includes('INPUT_PENDING_ROWS'));
  assert.ok(p3p4OperatorAuditSource.includes('INPUT_FILLED_PATH_ROWS'));
  assert.ok(p3p4OperatorAuditSource.includes('INPUT_EVIDENCE_ROWS'));
  assert.ok(p3p4OperatorAuditSource.includes('PACKAGE_P3_ROWS'));
  assert.ok(p3p4OperatorAuditSource.includes('PACKAGE_P4_ROWS'));
  assert.ok(p3p4DecisionPacketSource.includes('DAEGU_P3_P4_DECISION_PACKET_V1'));
  assert.ok(p3p4DecisionPacketSource.includes('daegu-seatmap-p3-p4-decision-packet.json'));
  assert.ok(p3p4DecisionPacketSource.includes('daegu-seatmap-p3-p4-decision-packet.csv'));
  assert.ok(p3p4DecisionPacketSource.includes('daegu-seatmap-p3-p4-decision-packet.md'));
  assert.ok(p3p4DecisionPacketSource.includes('p3Rows: 0'));
  assert.ok(p3p4DecisionPacketSource.includes('p4Rows: 44'));
  assert.ok(p3p4DecisionPacketSource.includes('manualTraceRequiredRows: 22'));
  assert.ok(p3p4DecisionPacketSource.includes('correctedPathRequiredRows: 22'));
  assert.ok(p3p4DecisionPacketSource.includes('labelAndHitAreaRows: 3'));
  assert.ok(p3p4DecisionPacketSource.includes('P3/P4 write-template remains blocked until P0, P1, and P2 are closed.'));
  assert.ok(p3p4DecisionPacketSource.includes('Candidate paths are visual references only'));
  assert.ok(p3p4DecisionPacketSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p3p4DecisionPacketSource.includes('requiresOperatorDecision'));
  assert.ok(p3p4OperatorImportSource.includes('DAEGU_P3_P4_OPERATOR_IMPORT_V1'));
  assert.ok(p3p4OperatorImportSource.includes('BATCH_4_P3_P4'));
  assert.ok(p3p4OperatorImportSource.includes('BATCH_1_P0'));
  assert.ok(p3p4OperatorImportSource.includes('BATCH_2_P1'));
  assert.ok(p3p4OperatorImportSource.includes('BATCH_3_P2'));
  assert.ok(p3p4OperatorImportSource.includes('DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1'));
  assert.ok(p3p4OperatorImportSource.includes('daegu-seatmap-p3-p4-operator-import.json'));
  assert.ok(p3p4OperatorImportSource.includes('daegu-seatmap-p3-p4-operator-import.md'));
  assert.ok(p3p4OperatorImportSource.includes('--write-template'));
  assert.ok(p3p4OperatorImportSource.includes('productionDataChanged: false'));
  assert.ok(p3p4OperatorImportSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(p3p4OperatorImportSource.includes('INVALID_P3_P4_OPERATOR_DECISION'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_P3_P4_DECISION'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P3_P4_ROW'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_DRAFT_ONLY'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_INPUT_STAGING_ONLY'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_HAS_DRAFT_MARKERS'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(p3p4OperatorImportSource.includes('WRITE_TEMPLATE_P3_P4_INVALID_APPROVED_ROWS'));
  assert.ok(p3p4OperatorImportSource.includes('validForApproval=true'));
  assert.ok(p3p4OperatorImportSource.includes('Do not run npm run stadium:daegu:operator-corrections after write-template'));
  assert.ok(p3p4OperatorReadinessSource.includes('DAEGU_P3_P4_OPERATOR_READINESS_V1'));
  assert.ok(p3p4OperatorReadinessSource.includes('BATCH_4_P3_P4'));
  assert.ok(p3p4OperatorReadinessSource.includes('BATCH_1_P0'));
  assert.ok(p3p4OperatorReadinessSource.includes('BATCH_2_P1'));
  assert.ok(p3p4OperatorReadinessSource.includes('BATCH_3_P2'));
  assert.ok(p3p4OperatorReadinessSource.includes('daegu-seatmap-p3-p4-operator-readiness.json'));
  assert.ok(p3p4OperatorReadinessSource.includes('waiting-for-operator'));
  assert.ok(p3p4OperatorReadinessSource.includes('awaitingOperatorInput'));
  assert.ok(p3p4OperatorReadinessSource.includes('readyForTemplateImport'));
  assert.ok(p3p4OperatorReadinessSource.includes('readyForGuardedWriteAfterTemplateImport'));
  assert.ok(p3p4OperatorReadinessSource.includes('NO_APPROVED_P3_P4_ROWS_TEMPLATE_IMPORT_WILL_BLOCK'));
  assert.ok(p3p4OperatorReadinessSource.includes('P3_P4_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(p3p4OperatorReadinessSource.includes('P3_P4_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(p3p4OperatorReadinessSource.includes('P3_P4_PENDING_ROWS_REMAIN'));
  assert.ok(p3p4OperatorReadinessSource.includes('P3_P4_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(p3p4OperatorReadinessSource.includes('This readiness gate is read-only'));
  assert.ok(p3p4OperatorReadinessSource.includes('validForApproval=true'));
  assert.ok(p3p4OperatorReadinessSource.includes('Do not run npm run stadium:daegu:operator-corrections after p3-p4-operator-import:write-template'));
  assert.ok(operatorStateAuditSource.includes('DAEGU_OPERATOR_STATE_AUDIT_V1'));
  assert.ok(operatorStateAuditSource.includes('DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1'));
  assert.ok(operatorStateAuditSource.includes('daegu-seatmap-operator-state-audit.json'));
  assert.ok(operatorStateAuditSource.includes('daegu-seatmap-operator-state-audit.csv'));
  assert.ok(operatorStateAuditSource.includes('daegu-seatmap-operator-state-audit.md'));
  assert.ok(operatorStateAuditSource.includes('BATCH_1_P0'));
  assert.ok(operatorStateAuditSource.includes('BATCH_2_P1'));
  assert.ok(operatorStateAuditSource.includes('BATCH_3_P2'));
  assert.ok(operatorStateAuditSource.includes('BATCH_4_P3_P4'));
  assert.ok(operatorStateAuditSource.includes('DAEGU_P2_OPERATOR_PACKAGE_V1'));
  assert.ok(operatorStateAuditSource.includes('DAEGU_P2_OPERATOR_IMPORT_V1'));
  assert.ok(operatorStateAuditSource.includes('INPUT_PENDING_TEMPLATE_NOT_PENDING'));
  assert.ok(operatorStateAuditSource.includes('INPUT_TEMPLATE_DECISION_MISMATCH'));
  assert.ok(operatorStateAuditSource.includes('IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(operatorStateAuditSource.includes('STALE_WRITE_TEMPLATE_IMPORT_REPORT'));
  assert.ok(operatorStateAuditSource.includes('WRITE_TEMPLATE_IMPORT_HAS_PENDING_INPUT'));
  assert.ok(operatorStateAuditSource.includes('FIRST_OPEN_BATCH_DOES_NOT_MATCH_INPUT_PENDING'));
  assert.ok(operatorStateAuditSource.includes('P0/P1/P2/P3/P4 operator input files are the source of truth before template import.'));
  assert.ok(operatorStateAuditSource.includes('This audit never modifies src/data/daeguSeatData.ts'));
  assert.ok(retraceWorkQueueSource.includes('DAEGU_RETRACE_WORK_QUEUE_V1'));
  assert.ok(retraceWorkQueueSource.includes('INPUT_SPECS'));
  assert.ok(retraceWorkQueueSource.includes('daegu-retrace-work-queue.json'));
  assert.ok(retraceWorkQueueSource.includes('daegu-retrace-work-queue.csv'));
  assert.ok(retraceWorkQueueSource.includes('daegu-retrace-work-queue.md'));
  assert.ok(retraceWorkQueueSource.includes('expectedRows: 97'));
  assert.ok(retraceWorkQueueSource.includes('expectedNeedsRetraceRows: 97'));
  assert.ok(retraceWorkQueueSource.includes('productionWriteAllowed: false'));
  assert.ok(retraceWorkQueueSource.includes('queueRows'));
  assert.ok(retraceWorkQueueSource.includes('currentPath'));
  assert.ok(retraceWorkQueueSource.includes('candidatePath'));
  assert.ok(retraceWorkQueueSource.includes('evidenceCrop'));
  assert.ok(retraceWorkQueueSource.includes('candidateDuplicateGroup'));
  assert.ok(retraceWorkQueueSource.includes('operatorDecision=APPROVED'));
  assert.ok(retraceWorkQueueSource.includes('Candidate paths remain reference-only'));
  assert.ok(retraceWorkQueueSource.includes('It never modifies src/data/daeguSeatData.ts'));
  assert.ok(nonOverlapPriorityQueueSource.includes('DAEGU_NON_OVERLAP_PRIORITY_QUEUE_V1'));
  assert.ok(nonOverlapPriorityQueueSource.includes('INPUT_SPECS'));
  assert.ok(nonOverlapPriorityQueueSource.includes('daegu-non-overlap-priority-queue.json'));
  assert.ok(nonOverlapPriorityQueueSource.includes('daegu-non-overlap-priority-queue.csv'));
  assert.ok(nonOverlapPriorityQueueSource.includes('daegu-non-overlap-priority-queue.md'));
  assert.ok(nonOverlapPriorityQueueSource.includes('expectedRows: 97'));
  assert.ok(nonOverlapPriorityQueueSource.includes('expectedNonOverlapRows: 86'));
  assert.ok(nonOverlapPriorityQueueSource.includes('expectedDuplicateRows: 11'));
  assert.ok(nonOverlapPriorityQueueSource.includes('expectedOffSeatRows: 27'));
  assert.ok(nonOverlapPriorityQueueSource.includes('NO_OVERLAP_OFF_SEAT_RETRACE_FIRST'));
  assert.ok(nonOverlapPriorityQueueSource.includes('NO_OVERLAP_VISUAL_APPROVAL_CANDIDATE'));
  assert.ok(nonOverlapPriorityQueueSource.includes('NO_OVERLAP_MANUAL_RETRACE'));
  assert.ok(nonOverlapPriorityQueueSource.includes('DEFER_DUPLICATE_BOUNDARY'));
  assert.ok(nonOverlapPriorityQueueSource.includes('LOW_COMPONENT_INSIDE_CURRENT_PATH'));
  assert.ok(nonOverlapPriorityQueueSource.includes('LOW_CURRENT_PATH_COLOR_COVERAGE'));
  assert.ok(nonOverlapPriorityQueueSource.includes('candidateDuplicateGroup'));
  assert.ok(nonOverlapPriorityQueueSource.includes('currentPath'));
  assert.ok(nonOverlapPriorityQueueSource.includes('candidatePath'));
  assert.ok(nonOverlapPriorityQueueSource.includes('operatorDecision=APPROVED'));
  assert.ok(nonOverlapPriorityQueueSource.includes('Candidate paths remain reference-only'));
  assert.ok(nonOverlapPriorityQueueSource.includes('It never writes the main corrections template.'));
  assert.ok(nonOverlapPriorityQueueSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(nonOverlapPriorityQueueSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(visualIssueQueueSource.includes('DAEGU_VISUAL_ISSUE_QUEUE_V1'));
  assert.ok(visualIssueQueueSource.includes('INPUT_SPECS'));
  assert.ok(visualIssueQueueSource.includes('daegu-visual-issue-queue.json'));
  assert.ok(visualIssueQueueSource.includes('daegu-visual-issue-queue.csv'));
  assert.ok(visualIssueQueueSource.includes('daegu-visual-issue-queue.md'));
  assert.ok(visualIssueQueueSource.includes('expectedRows: 97'));
  assert.ok(visualIssueQueueSource.includes('expectedVisualSeedRows: 19'));
  assert.ok(visualIssueQueueSource.includes('VISUAL_SEED_OBSERVATIONS'));
  assert.ok(visualIssueQueueSource.includes('Image #1'));
  assert.ok(visualIssueQueueSource.includes('Image #2'));
  assert.ok(visualIssueQueueSource.includes('Image #3'));
  assert.ok(visualIssueQueueSource.includes('LF-9'));
  assert.ok(visualIssueQueueSource.includes('VISUAL_OFF_SEAT_HARD_FAIL'));
  assert.ok(visualIssueQueueSource.includes('OVERSIZED_RECT_MANUAL_RETRACE'));
  assert.ok(visualIssueQueueSource.includes('LABEL_AND_HIT_AREA_REVIEW'));
  assert.ok(visualIssueQueueSource.includes('VISUAL_APPROVAL_CANDIDATE'));
  assert.ok(visualIssueQueueSource.includes('DEFER_DUPLICATE_BOUNDARY'));
  assert.ok(visualIssueQueueSource.includes('visualEvidenceGroup'));
  assert.ok(visualIssueQueueSource.includes('observedIssue'));
  assert.ok(visualIssueQueueSource.includes('operatorAction'));
  assert.ok(visualIssueQueueSource.includes('productionWriteAllowed: false'));
  assert.ok(visualIssueQueueSource.includes('DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH'));
  assert.ok(visualIssueQueueSource.includes('REFERENCE_ONLY_REQUIRES_OPERATOR_VISUAL_APPROVAL'));
  assert.ok(visualIssueQueueSource.includes('Candidate paths remain reference-only'));
  assert.ok(visualIssueQueueSource.includes('It includes the remaining unresolved Daegu operator rows from the source input files; the current locked baseline is 97 rows after prior approved writes.'));
  assert.ok(visualIssueQueueSource.includes('It never writes the main corrections template.'));
  assert.ok(visualIssueQueueSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(visualIssueQueueSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(visualOffSeatWorksetSource.includes('DAEGU_VISUAL_OFF_SEAT_WORKSET_V1'));
  assert.ok(visualOffSeatWorksetSource.includes('DAEGU_VISUAL_ISSUE_QUEUE_V1'));
  assert.ok(visualOffSeatWorksetSource.includes('VISUAL_OFF_SEAT_HARD_FAIL'));
  assert.ok(visualOffSeatWorksetSource.includes('daegu-visual-issue-queue.json'));
  assert.ok(visualOffSeatWorksetSource.includes('daegu-visual-off-seat-workset.json'));
  assert.ok(visualOffSeatWorksetSource.includes('daegu-visual-off-seat-workset.csv'));
  assert.ok(visualOffSeatWorksetSource.includes('daegu-visual-off-seat-workset.md'));
  assert.ok(visualOffSeatWorksetSource.includes('expectedRows: 27'));
  assert.ok(visualOffSeatWorksetSource.includes('expectedVisualSeedRows: 7'));
  assert.ok(visualOffSeatWorksetSource.includes('expectedP0Rows: 0'));
  assert.ok(visualOffSeatWorksetSource.includes('expectedP1Rows: 5'));
  assert.ok(visualOffSeatWorksetSource.includes('expectedP2Rows: 0'));
  assert.ok(visualOffSeatWorksetSource.includes('expectedP3P4Rows: 22'));
  assert.ok(visualOffSeatWorksetSource.includes('productionWriteAllowed: false'));
  assert.ok(visualOffSeatWorksetSource.includes('DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH'));
  assert.ok(visualOffSeatWorksetSource.includes('REFERENCE_ONLY_DO_NOT_COPY_TO_CORRECTED_PATH'));
  assert.ok(visualOffSeatWorksetSource.includes('currentPath must not be copied into correctedPath'));
  assert.ok(visualOffSeatWorksetSource.includes('Candidate paths are reference-only'));
  assert.ok(visualOffSeatWorksetSource.includes('It never writes the main corrections template.'));
  assert.ok(visualOffSeatWorksetSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(visualOffSeatWorksetSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(visualOffSeatWorksetSource.includes('npm run stadium:daegu:p0-operator-prewrite-gate'));
  assert.ok(visualOffSeatWorksetSource.includes('npm run stadium:daegu:p1-operator-prewrite-gate'));
  assert.ok(visualOffSeatWorksetSource.includes('npm run stadium:daegu:p3-p4-operator-prewrite-gate'));
  assert.ok(p1PairedBoundaryReviewSource.includes('DAEGU_P1_PAIRED_BOUNDARY_REVIEW_V1'));
  assert.ok(p1PairedBoundaryReviewSource.includes('DAEGU_VISUAL_OFF_SEAT_WORKSET_V1'));
  assert.ok(p1PairedBoundaryReviewSource.includes('DAEGU_ALIGNMENT_AUDIT_V1'));
  assert.ok(p1PairedBoundaryReviewSource.includes('expectedRows: 5'));
  assert.ok(p1PairedBoundaryReviewSource.includes('expectedPairedRelabelRows: 2'));
  assert.ok(p1PairedBoundaryReviewSource.includes('expectedManualSplitRows: 3'));
  assert.ok(p1PairedBoundaryReviewSource.includes('PAIRED_RELABEL_BOUNDARY_REVIEW'));
  assert.ok(p1PairedBoundaryReviewSource.includes('MANUAL_NON_OVERLAP_SPLIT_REQUIRED'));
  assert.ok(p1PairedBoundaryReviewSource.includes('LOCKED_NEIGHBOR_OWNS_VISIBLE_TABLE_AREA'));
  assert.ok(p1PairedBoundaryReviewSource.includes('CANDIDATE_COMPONENT_COLLIDES_WITH_T3_TABLE_BLOCKS'));
  assert.ok(p1PairedBoundaryReviewSource.includes('Rows in this report must not be approved as single-row corrections.'));
  assert.ok(p1PairedBoundaryReviewSource.includes('It never writes the main corrections template.'));
  assert.ok(p1PairedBoundaryReviewSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p1PairedBoundaryReviewSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p1PairedBoundaryReviewSource.includes('npm run stadium:daegu:p1-operator-prewrite-gate'));
  assert.ok(p1BoundaryInputAidSource.includes('DAEGU_P1_BOUNDARY_INPUT_AID_V1'));
  assert.ok(p1BoundaryInputAidSource.includes('DAEGU_P1_PAIRED_BOUNDARY_REVIEW_V1'));
  assert.ok(p1BoundaryInputAidSource.includes('DAEGU_ALIGNMENT_AUDIT_V1'));
  assert.ok(p1BoundaryInputAidSource.includes('daegu-seatmap-p1-boundary-input-aid.json'));
  assert.ok(p1BoundaryInputAidSource.includes('daegu-seatmap-p1-boundary-input-aid.csv'));
  assert.ok(p1BoundaryInputAidSource.includes('daegu-seatmap-p1-boundary-input-aid.md'));
  assert.ok(p1BoundaryInputAidSource.includes('expectedRows: 5'));
  assert.ok(p1BoundaryInputAidSource.includes('expectedPairedRelabelRows: 2'));
  assert.ok(p1BoundaryInputAidSource.includes('expectedManualSplitRows: 3'));
  assert.ok(p1BoundaryInputAidSource.includes('PAIRED_RELABEL_BOUNDARY_REVIEW'));
  assert.ok(p1BoundaryInputAidSource.includes('MANUAL_NON_OVERLAP_SPLIT_REQUIRED'));
  assert.ok(p1BoundaryInputAidSource.includes('LOCKED_NEIGHBOR_OWNERSHIP_REVIEW'));
  assert.ok(p1BoundaryInputAidSource.includes('SHARED_MANUAL_SPLIT_REVIEW'));
  assert.ok(p1BoundaryInputAidSource.includes('productionWriteAllowed: false'));
  assert.ok(p1BoundaryInputAidSource.includes('writesOperatorDecision: false'));
  assert.ok(p1BoundaryInputAidSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1BoundaryInputAidSource.includes('writesProductionData: false'));
  assert.ok(p1BoundaryInputAidSource.includes('contains no operatorDecision column'));
  assert.ok(p1BoundaryInputAidSource.includes('Rows in this aid must not be approved as isolated single-row corrections.'));
  assert.ok(p1BoundaryInputAidSource.includes('The currentPath must not be copied into correctedPath.'));
  assert.ok(p1BoundaryInputAidSource.includes('Candidate paths are reference-only and must not be copied into correctedPath.'));
  assert.ok(p1BoundaryInputAidSource.includes('It never writes the main corrections template.'));
  assert.ok(p1BoundaryInputAidSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p1BoundaryInputAidSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p1BoundaryInputAidSource.includes('npm run stadium:daegu:p1-operator-prewrite-gate'));
  assert.ok(p1NextActionPacketSource.includes('DAEGU_P1_NEXT_ACTION_PACKET_V1'));
  assert.ok(p1NextActionPacketSource.includes('daegu-seatmap-p1-next-action-packet.json'));
  assert.ok(p1NextActionPacketSource.includes('daegu-seatmap-p1-next-action-packet.csv'));
  assert.ok(p1NextActionPacketSource.includes('daegu-seatmap-p1-next-action-packet.md'));
  assert.ok(p1NextActionPacketSource.includes('PAIR_BOUNDARY_FIRST'));
  assert.ok(p1NextActionPacketSource.includes('SINGLE_CORRECTED_PATH'));
  assert.ok(p1NextActionPacketSource.includes('DUPLICATE_CANDIDATE_SPLIT'));
  assert.ok(p1NextActionPacketSource.includes('expectedRows: 17'));
  assert.ok(p1NextActionPacketSource.includes('boundaryAidRows: 5'));
  assert.ok(p1NextActionPacketSource.includes('singleCorrectedPathRows: 1'));
  assert.ok(p1NextActionPacketSource.includes('sharedCandidateBoundaryRows: 11'));
  assert.ok(p1NextActionPacketSource.includes('productionWriteAllowed: false'));
  assert.ok(p1NextActionPacketSource.includes('writesOperatorDecision: false'));
  assert.ok(p1NextActionPacketSource.includes('writesCorrectionsTemplate: false'));
  assert.ok(p1NextActionPacketSource.includes('writesProductionData: false'));
  assert.ok(p1NextActionPacketSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p1NextActionPacketSource.includes('operatorDecision=APPROVED'));
  assert.ok(p1NextActionPacketSource.includes('correctedPath'));
  assert.ok(p1PrecisionWorksetSource.includes('DAEGU_P1_PRECISION_WORKSET_V1'));
  assert.ok(p1PrecisionWorksetSource.includes('DAEGU_SEATMAP_PRECISION_AUDIT_V1'));
  assert.ok(p1PrecisionWorksetSource.includes('DAEGU_P1_NEXT_ACTION_PACKET_V1'));
  assert.ok(p1PrecisionWorksetSource.includes('daegu-seatmap-p1-precision-workset.json'));
  assert.ok(p1PrecisionWorksetSource.includes('daegu-seatmap-p1-precision-workset.csv'));
  assert.ok(p1PrecisionWorksetSource.includes('daegu-seatmap-p1-precision-workset.md'));
  assert.ok(p1PrecisionWorksetSource.includes('daegu-seatmap-p1-precision-workset.svg'));
  assert.ok(p1PrecisionWorksetSource.includes('boundaryFirstRows: 5'));
  assert.ok(p1PrecisionWorksetSource.includes('singleCorrectedPathRows: 1'));
  assert.ok(p1PrecisionWorksetSource.includes('duplicateSplitRows: 11'));
  assert.ok(p1PrecisionWorksetSource.includes('draftVisualPath'));
  assert.ok(p1PrecisionWorksetSource.includes('draftHitPath'));
  assert.ok(p1PrecisionWorksetSource.includes('draftLabelPoint'));
  assert.ok(p1PrecisionWorksetSource.includes('productionWriteAllowed: false'));
  assert.ok(p1PrecisionWorksetSource.includes('sourceOfTruth: false'));
  assert.ok(p1PrecisionWorksetSource.includes('draftOnly: true'));
  assert.ok(p1PrecisionWorksetSource.includes('operatorDecision=APPROVED'));
  assert.ok(p1PrecisionWorksetSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(offSeatRetraceIntakeSource.includes('DAEGU_OFF_SEAT_RETRACE_INTAKE_V1'));
  assert.ok(offSeatRetraceIntakeSource.includes('INPUT_SPECS'));
  assert.ok(offSeatRetraceIntakeSource.includes('daegu-off-seat-retrace-intake.json'));
  assert.ok(offSeatRetraceIntakeSource.includes('daegu-off-seat-retrace-intake.csv'));
  assert.ok(offSeatRetraceIntakeSource.includes('daegu-off-seat-retrace-intake.md'));
  assert.ok(offSeatRetraceIntakeSource.includes('expectedRows: 27'));
  assert.ok(offSeatRetraceIntakeSource.includes('expectedP0P1Rows: 5'));
  assert.ok(offSeatRetraceIntakeSource.includes('expectedDuplicateRowsIncluded: 0'));
  assert.ok(offSeatRetraceIntakeSource.includes('expectedDuplicateRowsExcluded: 2'));
  assert.ok(offSeatRetraceIntakeSource.includes('P0_P1_OFF_SEAT_FIRST'));
  assert.ok(offSeatRetraceIntakeSource.includes('OFF_SEAT_BACKLOG'));
  assert.ok(offSeatRetraceIntakeSource.includes('LOW_COMPONENT_INSIDE_CURRENT_PATH'));
  assert.ok(offSeatRetraceIntakeSource.includes('LOW_CURRENT_PATH_COLOR_COVERAGE'));
  assert.ok(offSeatRetraceIntakeSource.includes('candidateDuplicateGroup'));
  assert.ok(offSeatRetraceIntakeSource.includes('currentPath'));
  assert.ok(offSeatRetraceIntakeSource.includes('candidatePath'));
  assert.ok(offSeatRetraceIntakeSource.includes('componentInsidePathRatio'));
  assert.ok(offSeatRetraceIntakeSource.includes('pathColorCoverageRatio'));
  assert.ok(offSeatRetraceIntakeSource.includes('operatorDecision=APPROVED'));
  assert.ok(offSeatRetraceIntakeSource.includes('correctedPath'));
  assert.ok(offSeatRetraceIntakeSource.includes('correctedLabelX'));
  assert.ok(offSeatRetraceIntakeSource.includes('correctedLabelY'));
  assert.ok(offSeatRetraceIntakeSource.includes('reviewer'));
  assert.ok(offSeatRetraceIntakeSource.includes('reviewedAt'));
  assert.ok(offSeatRetraceIntakeSource.includes('Rows with candidateDuplicateGroup are excluded from this intake.'));
  assert.ok(offSeatRetraceIntakeSource.includes('Candidate paths remain reference-only'));
  assert.ok(offSeatRetraceIntakeSource.includes('It never writes the main corrections template.'));
  assert.ok(offSeatRetraceIntakeSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(offSeatRetraceIntakeSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p0p1OffSeatWorksetSource.includes('DAEGU_P0_P1_OFF_SEAT_WORKSET_V1'));
  assert.ok(p0p1OffSeatWorksetSource.includes('DAEGU_OFF_SEAT_RETRACE_INTAKE_V1'));
  assert.ok(p0p1OffSeatWorksetSource.includes('daegu-off-seat-retrace-intake.json'));
  assert.ok(p0p1OffSeatWorksetSource.includes('daegu-p0-p1-off-seat-workset.json'));
  assert.ok(p0p1OffSeatWorksetSource.includes('daegu-p0-p1-off-seat-workset.csv'));
  assert.ok(p0p1OffSeatWorksetSource.includes('daegu-p0-p1-off-seat-workset.md'));
  assert.ok(p0p1OffSeatWorksetSource.includes('expectedRows: 5'));
  assert.ok(p0p1OffSeatWorksetSource.includes('expectedP0Rows: 0'));
  assert.ok(p0p1OffSeatWorksetSource.includes('expectedP1Rows: 5'));
  assert.ok(p0p1OffSeatWorksetSource.includes('expectedDuplicateRows: 0'));
  assert.ok(p0p1OffSeatWorksetSource.includes('P0_P1_OFF_SEAT_FIRST'));
  assert.ok(p0p1OffSeatWorksetSource.includes('sourceOffSeatIntake'));
  assert.ok(p0p1OffSeatWorksetSource.includes('currentPath'));
  assert.ok(p0p1OffSeatWorksetSource.includes('candidatePath'));
  assert.ok(p0p1OffSeatWorksetSource.includes('componentInsidePathRatio'));
  assert.ok(p0p1OffSeatWorksetSource.includes('pathColorCoverageRatio'));
  assert.ok(p0p1OffSeatWorksetSource.includes('operatorDecision=APPROVED'));
  assert.ok(p0p1OffSeatWorksetSource.includes('correctedPath'));
  assert.ok(p0p1OffSeatWorksetSource.includes('correctedLabelX'));
  assert.ok(p0p1OffSeatWorksetSource.includes('correctedLabelY'));
  assert.ok(p0p1OffSeatWorksetSource.includes('reviewer'));
  assert.ok(p0p1OffSeatWorksetSource.includes('reviewedAt'));
  assert.ok(p0p1OffSeatWorksetSource.includes('The currentPath is a suspected bad legacy path and must not be reused as the correctedPath.'));
  assert.ok(p0p1OffSeatWorksetSource.includes('Rows with candidateDuplicateGroup are excluded from this workset.'));
  assert.ok(p0p1OffSeatWorksetSource.includes('Candidate paths remain reference-only'));
  assert.ok(p0p1OffSeatWorksetSource.includes('It never writes the main corrections template.'));
  assert.ok(p0p1OffSeatWorksetSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p0p1OffSeatWorksetSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p0p1OffSeatWorksetSource.includes('npm run stadium:daegu:p0-operator-prewrite-gate'));
  assert.ok(p0p1OffSeatWorksetSource.includes('npm run stadium:daegu:p1-operator-prewrite-gate'));
  assert.ok(p0OffSeatOperatorInputSource.includes('DAEGU_P0_OFF_SEAT_OPERATOR_INPUT_V1'));
  assert.ok(p0OffSeatOperatorInputSource.includes('DAEGU_P0_P1_OFF_SEAT_WORKSET_V1'));
  assert.ok(p0OffSeatOperatorInputSource.includes('daegu-p0-p1-off-seat-workset.json'));
  assert.ok(p0OffSeatOperatorInputSource.includes('daegu-p0-off-seat-operator-input.json'));
  assert.ok(p0OffSeatOperatorInputSource.includes('daegu-p0-off-seat-operator-input.csv'));
  assert.ok(p0OffSeatOperatorInputSource.includes('daegu-p0-off-seat-operator-input.md'));
  assert.ok(p0OffSeatOperatorInputSource.includes('expectedRows: 0'));
  assert.ok(p0OffSeatOperatorInputSource.includes('expectedP0Rows: 0'));
  assert.ok(p0OffSeatOperatorInputSource.includes('expectedDuplicateRows: 0'));
  assert.ok(p0OffSeatOperatorInputSource.includes('expectedApprovedRows: 0'));
  assert.ok(p0OffSeatOperatorInputSource.includes('TARGET_BATCH_ID'));
  assert.ok(p0OffSeatOperatorInputSource.includes('BATCH_1_P0'));
  assert.ok(p0OffSeatOperatorInputSource.includes('draftOnly: true'));
  assert.ok(p0OffSeatOperatorInputSource.includes('sourceOfTruth: false'));
  assert.ok(p0OffSeatOperatorInputSource.includes('productionWriteAllowed: false'));
  assert.ok(p0OffSeatOperatorInputSource.includes('copyTargetSourceInput'));
  assert.ok(p0OffSeatOperatorInputSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-input.json'));
  assert.ok(p0OffSeatOperatorInputSource.includes('DO_NOT_COPY_CURRENT_PATH_TO_CORRECTED_PATH'));
  assert.ok(p0OffSeatOperatorInputSource.includes('REFERENCE_ONLY_REQUIRES_OPERATOR_VISUAL_APPROVAL'));
  assert.ok(p0OffSeatOperatorInputSource.includes('APPROVED_MISSING_CORRECTED_PATH'));
  assert.ok(p0OffSeatOperatorInputSource.includes('APPROVED_MISSING_CORRECTED_LABEL'));
  assert.ok(p0OffSeatOperatorInputSource.includes('APPROVED_CORRECTED_PATH_EQUALS_CURRENT_PATH'));
  assert.ok(p0OffSeatOperatorInputSource.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(p0OffSeatOperatorInputSource.includes('operatorDecision=APPROVED'));
  assert.ok(p0OffSeatOperatorInputSource.includes('correctedPath'));
  assert.ok(p0OffSeatOperatorInputSource.includes('correctedLabelX'));
  assert.ok(p0OffSeatOperatorInputSource.includes('correctedLabelY'));
  assert.ok(p0OffSeatOperatorInputSource.includes('reviewer'));
  assert.ok(p0OffSeatOperatorInputSource.includes('reviewedAt'));
  assert.ok(p0OffSeatOperatorInputSource.includes('currentPath'));
  assert.ok(p0OffSeatOperatorInputSource.includes('candidatePath'));
  assert.ok(p0OffSeatOperatorInputSource.includes('This draft helper is not a source of truth.'));
  assert.ok(p0OffSeatOperatorInputSource.includes('The currentPath must not be copied into correctedPath.'));
  assert.ok(p0OffSeatOperatorInputSource.includes('Candidate paths remain reference-only'));
  assert.ok(p0OffSeatOperatorInputSource.includes('It never writes the main corrections template.'));
  assert.ok(p0OffSeatOperatorInputSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p0OffSeatOperatorInputSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p0OffSeatOperatorInputSource.includes('npm run stadium:daegu:p0-operator-prewrite-gate'));
  assert.ok(p0OffSeatOperatorInputSource.includes('npm run stadium:daegu:p0-operator-import:write-template'));
  assert.ok(p0OffSeatOperatorImportSource.includes('DAEGU_P0_OFF_SEAT_OPERATOR_IMPORT_V1'));
  assert.ok(p0OffSeatOperatorImportSource.includes('DAEGU_P0_OFF_SEAT_OPERATOR_INPUT_V1'));
  assert.ok(p0OffSeatOperatorImportSource.includes('DAEGU_P0_OPERATOR_PACKAGE_V1'));
  assert.ok(p0OffSeatOperatorImportSource.includes('daegu-p0-off-seat-operator-import.json'));
  assert.ok(p0OffSeatOperatorImportSource.includes('daegu-p0-off-seat-operator-import.csv'));
  assert.ok(p0OffSeatOperatorImportSource.includes('daegu-p0-off-seat-operator-import.md'));
  assert.ok(p0OffSeatOperatorImportSource.includes('daegu-p0-off-seat-operator-input.json'));
  assert.ok(p0OffSeatOperatorImportSource.includes('daegu-seatmap-p0-operator-input.json'));
  assert.ok(p0OffSeatOperatorImportSource.includes('--write-source-input'));
  assert.ok(p0OffSeatOperatorImportSource.includes('expectedRows: 0'));
  assert.ok(p0OffSeatOperatorImportSource.includes('expectedApprovedRows: 0'));
  assert.ok(p0OffSeatOperatorImportSource.includes('expectedDuplicateRows: 0'));
  assert.ok(p0OffSeatOperatorImportSource.includes('TARGET_BATCH_ID'));
  assert.ok(p0OffSeatOperatorImportSource.includes('BATCH_1_P0'));
  assert.ok(p0OffSeatOperatorImportSource.includes('MIN_OFFICIAL_TRACE_POINTS'));
  assert.ok(p0OffSeatOperatorImportSource.includes('APPROVED_MISSING_CORRECTED_PATH'));
  assert.ok(p0OffSeatOperatorImportSource.includes('APPROVED_MISSING_CORRECTED_LABEL'));
  assert.ok(p0OffSeatOperatorImportSource.includes('APPROVED_MISSING_REVIEWER'));
  assert.ok(p0OffSeatOperatorImportSource.includes('APPROVED_MISSING_REVIEWED_AT'));
  assert.ok(p0OffSeatOperatorImportSource.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(p0OffSeatOperatorImportSource.includes('APPROVED_CORRECTED_PATH_EQUALS_CURRENT_PATH'));
  assert.ok(p0OffSeatOperatorImportSource.includes('APPROVED_CORRECTED_PATH_EQUALS_REFERENCE_CANDIDATE_PATH'));
  assert.ok(p0OffSeatOperatorImportSource.includes('DRAFT_REVIEWER_NOT_ALLOWED_FOR_SOURCE_IMPORT'));
  assert.ok(p0OffSeatOperatorImportSource.includes('DRAFT_REVIEWED_AT_NOT_ALLOWED_FOR_SOURCE_IMPORT'));
  assert.ok(p0OffSeatOperatorImportSource.includes('승인 row가 없으면 source input을 쓰지 않는다.'));
  assert.ok(p0OffSeatOperatorImportSource.includes('It never writes the main corrections template.'));
  assert.ok(p0OffSeatOperatorImportSource.includes('It never modifies src/data/daeguSeatData.ts.'));
  assert.ok(p0OffSeatOperatorImportSource.includes('No external crawling, web search, or coordinate inference is allowed.'));
  assert.ok(p0OffSeatOperatorImportSource.includes('npm run stadium:daegu:p0-operator-prewrite-gate'));
  assert.ok(p0OffSeatOperatorImportSource.includes('npm run stadium:daegu:p0-operator-import:write-template'));
  assert.ok(correctionsTemplateSource.includes('DAEGU_OPERATOR_CORRECTIONS_TEMPLATE_V1'));
  assert.ok(correctionsTemplateSource.includes('daegu-seatmap-operator-corrections-template.json'));
  assert.ok(correctionsTemplateSource.includes('daegu-seatmap-operator-corrections-template.csv'));
  assert.ok(correctionsTemplateSource.includes('operatorDecision=APPROVED'));
  assert.ok(correctionsTemplateSource.includes('correctedPath'));
  assert.ok(correctionsTemplateSource.includes('correctedLabelX'));
  assert.ok(correctionsTemplateSource.includes('correctedLabelY'));
  assert.ok(correctionsTemplateSource.includes('nonAutomaticPromotion'));
  assert.ok(correctionsValidateSource.includes('DAEGU_OPERATOR_CORRECTIONS_VALIDATION_V1'));
  assert.ok(correctionsValidateSource.includes('daegu-seatmap-operator-corrections-validation.json'));
  assert.ok(correctionsValidateSource.includes('--handoff'));
  assert.ok(correctionsValidateSource.includes('--allow-draft-markers'));
  assert.ok(correctionsValidateSource.includes('DRAFT_ONLY_INPUT_NOT_ALLOWED_FOR_APPROVAL'));
  assert.ok(correctionsValidateSource.includes('STAGING_ONLY_INPUT_NOT_ALLOWED_FOR_APPROVAL'));
  assert.ok(correctionsValidateSource.includes('DRAFT_REVIEWER_NOT_ALLOWED_FOR_APPROVAL'));
  assert.ok(correctionsValidateSource.includes('DRAFT_REVIEWED_AT_NOT_ALLOWED_FOR_APPROVAL'));
  assert.ok(correctionsValidateSource.includes('inputSha256'));
  assert.ok(correctionsValidateSource.includes('SINGLE_POLYGON_PATH_REQUIRED'));
  assert.ok(correctionsValidateSource.includes('MIN_OFFICIAL_TRACE_POINTS'));
  assert.ok(correctionsValidateSource.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(correctionsValidateSource.includes('PATH_OUTSIDE_DAEGU_IMAGE_BOUNDS'));
  assert.ok(correctionsValidateSource.includes('CORRECTED_LABEL_OUTSIDE_PATH'));
  assert.ok(correctionsValidateSource.includes('CORRECTED_LABEL_TOP_HIT_MISMATCH'));
  assert.ok(correctionsValidateSource.includes('DUPLICATE_CORRECTED_PATH'));
  assert.ok(correctionsValidateSource.includes('validForApproval'));
  assert.ok(correctionsValidateSource.includes('This validator only accepts operator corrections'));
  assert.ok(correctionsPreviewSource.includes('DAEGU_OPERATOR_CORRECTIONS_PREVIEW_V1'));
  assert.ok(correctionsPreviewSource.includes('daegu-seatmap-operator-corrections-preview.json'));
  assert.ok(correctionsPreviewSource.includes('daegu-seatmap-operator-corrections-preview.svg'));
  assert.ok(correctionsPreviewSource.includes('VALIDATION_INPUT_SHA256_MISMATCH'));
  assert.ok(correctionsPreviewSource.includes('red path: current'));
  assert.ok(correctionsPreviewSource.includes('green path: valid operator corrected path'));
  assert.ok(correctionsPreviewSource.includes('orange path: approved row that did not pass validation'));
  assert.ok(correctionsPreviewSource.includes('write 후에는 `npm run stadium:daegu:alignment-audit`'));
  assert.ok(correctionsApplySource.includes('DAEGU_OPERATOR_CORRECTIONS_APPLY_V1'));
  assert.ok(correctionsApplySource.includes('daegu-seatmap-operator-corrections-apply.json'));
  assert.ok(correctionsApplySource.includes('VALIDATION_INPUT_SHA256_MISMATCH'));
  assert.ok(correctionsApplySource.includes('WRITE_INPUT_MUST_BE_STANDARD_OPERATOR_TEMPLATE'));
  assert.ok(correctionsApplySource.includes('SYNTHETIC_INPUT_MUST_NOT_WRITE_PRODUCTION_DATA'));
  assert.ok(correctionsApplySource.includes('inputIsTemporarySyntheticWrite'));
  assert.ok(correctionsApplySource.includes('WRITE_INPUT_IS_DRAFT_ONLY'));
  assert.ok(correctionsApplySource.includes('WRITE_INPUT_IS_STAGING_ONLY'));
  assert.ok(correctionsApplySource.includes('validForApproval'));
  assert.ok(correctionsApplySource.includes('--write'));
  assert.ok(correctionsApplySource.includes('sourceConfidence'));
  assert.ok(correctionsApplySource.includes('OFFICIAL_IMAGE_TRACED'));
  assert.ok(correctionsApplySource.includes('PATH_TRACED_FROM_OFFICIAL_IMAGE'));
  assert.ok(correctionsApplySource.includes('npm run stadium:daegu:alignment-audit'));
  assert.ok(correctionsWriteSmokeSource.includes('DAEGU_OPERATOR_CORRECTIONS_WRITE_SMOKE_V1'));
  assert.ok(correctionsWriteSmokeSource.includes('daegu-seatmap-operator-corrections-write-smoke.json'));
  assert.ok(correctionsWriteSmokeSource.includes('syntheticSmokeCorrection'));
  assert.ok(correctionsWriteSmokeSource.includes('temporaryDataFile'));
  assert.ok(correctionsWriteSmokeSource.includes('productionDataUnchanged'));
  assert.ok(correctionsWriteSmokeSource.includes('PRODUCTION_DAEGU_DATA_CHANGED'));
  assert.ok(correctionsWriteSmokeSource.includes('--data-file'));
  assert.ok(correctionsWriteSmokeSource.includes('--write'));
  assert.ok(correctionsWriteSmokeSource.includes('Do not copy this to production corrections'));
  assert.ok(correctionsBatchesSource.includes('DAEGU_OPERATOR_CORRECTIONS_BATCHES_V1'));
  assert.ok(correctionsBatchesSource.includes('daegu-seatmap-operator-corrections-batches.json'));
  assert.ok(correctionsBatchesSource.includes('daegu-seatmap-operator-corrections-batches.csv'));
  assert.ok(correctionsBatchesSource.includes('daegu-seatmap-operator-corrections-batches.md'));
  assert.ok(correctionsBatchesSource.includes('BATCH_1_P0'));
  assert.ok(correctionsBatchesSource.includes('BATCH_2_P1'));
  assert.ok(correctionsBatchesSource.includes('BATCH_3_P2'));
  assert.ok(correctionsBatchesSource.includes('BATCH_4_P3_P4'));
  assert.ok(correctionsBatchesSource.includes('expectedRows: 0'));
  assert.ok(correctionsBatchesSource.includes('expectedRows: 17'));
  assert.ok(correctionsBatchesSource.includes('expectedRows: 36'));
  assert.ok(correctionsBatchesSource.includes('expectedRows: 44'));
  assert.ok(correctionsBatchesSource.includes('singleBatchOnly'));
  assert.ok(correctionsBatchesSource.includes('failedRowsStayInSourceBatch'));
  assert.ok(correctionsBatchesSource.includes('failedRowsAreNotCarriedForward'));
  assert.ok(correctionsBatchesSource.includes('APPROVED_ROWS_OUT_OF_PRIORITY_ORDER'));
  assert.ok(correctionsBatchesSource.includes('APPROVED_ROWS_MUST_BE_SINGLE_BATCH'));
  assert.ok(correctionsBatchesSource.includes('BATCH_HAS_PENDING_ROWS'));
  assert.ok(correctionsStatusSource.includes('DAEGU_OPERATOR_CORRECTIONS_STATUS_V1'));
  assert.ok(correctionsStatusSource.includes('BLOCKED_BY_OPERATOR_REVIEW'));
  assert.ok(correctionsStatusSource.includes('READY_FOR_OPERATOR_WRITE'));
  assert.ok(correctionsStatusSource.includes('releaseClassification'));
  assert.ok(correctionsStatusSource.includes('releaseClassificationReason'));
  assert.ok(correctionsStatusSource.includes('daegu-seatmap-operator-corrections-status.json'));
  assert.ok(correctionsStatusSource.includes('daegu-seatmap-operator-corrections-batches.json'));
  assert.ok(correctionsStatusSource.includes('readyForWrite'));
  assert.ok(correctionsStatusSource.includes('NO_READY_OPERATOR_CORRECTIONS_BATCH'));
  assert.ok(correctionsStatusSource.includes('READY_BATCH_APPROVED_ROWS_DO_NOT_MATCH_APPROVED_ROWS'));
  assert.ok(correctionsStatusSource.includes('APPROVED_ROWS_OUT_OF_PRIORITY_ORDER'));
  assert.ok(correctionsStatusSource.includes('NO_APPROVED_OPERATOR_CORRECTIONS'));
  assert.ok(correctionsStatusSource.includes('remainingOperatorRows'));
  assert.ok(correctionsStatusSource.includes('WRITE_SMOKE_PRODUCTION_DATA_CHANGED'));
  assert.ok(correctionsStatusSource.includes('DRY_RUN_APPLY_CHANGED_DATA_FILE'));
  assert.ok(correctionsStatusSource.includes('readyForWrite=true'));
  assert.ok(correctionsStatusSource.includes('npm run stadium:daegu:operator-corrections-write'));
  assert.ok(correctionsStatusSource.includes('postWriteGateCommand'));
  assert.ok(correctionsStatusSource.includes('npm run stadium:daegu:operator-corrections-postwrite-gate'));
  assert.ok(correctionsWriteGuardSource.includes('DAEGU_OPERATOR_CORRECTIONS_WRITE_GUARD_V1'));
  assert.ok(correctionsWriteGuardSource.includes('DAEGU_OPERATOR_CORRECTIONS_STATUS_V1'));
  assert.ok(correctionsWriteGuardSource.includes('daegu-seatmap-operator-corrections-write-guard.json'));
  assert.ok(correctionsWriteGuardSource.includes('READY_FOR_WRITE_NOT_TRUE'));
  assert.ok(correctionsWriteGuardSource.includes('NO_APPROVED_OPERATOR_CORRECTIONS'));
  assert.ok(correctionsWriteGuardSource.includes('NO_VALID_APPROVED_OPERATOR_CORRECTIONS'));
  assert.ok(correctionsWriteGuardSource.includes('NO_READY_OPERATOR_CORRECTIONS_BATCH'));
  assert.ok(correctionsWriteGuardSource.includes('APPROVED_ROWS_MUST_BE_SINGLE_BATCH'));
  assert.ok(correctionsWriteGuardSource.includes('APPROVED_ROWS_OUT_OF_PRIORITY_ORDER'));
  assert.ok(correctionsWriteGuardSource.includes('WRITE_SMOKE_PRODUCTION_DATA_NOT_UNCHANGED'));
  assert.ok(correctionsWriteGuardSource.includes('process.exitCode = 1'));
  assert.ok(correctionsWriteGuardSource.includes('apply --write'));
  assert.ok(precisionAuditSource.includes('DAEGU_SEATMAP_PRECISION_AUDIT_V1'));
  assert.ok(precisionAuditSource.includes('PASS_WORKFLOW'));
  assert.ok(precisionAuditSource.includes('PASS_LOCKED_80'));
  assert.ok(precisionAuditSource.includes('PASS_RELEASE_177'));
  assert.ok(precisionAuditSource.includes('UNRESOLVED_PRECISION_ROWS'));
  assert.ok(precisionAuditSource.includes('FLOATING_OR_OFF_SEAT_REVIEW'));
  assert.ok(precisionAuditSource.includes('OVERSIZED_RECT_MANUAL_RETRACE'));
  assert.ok(precisionAuditSource.includes('SAME_SEAT_MULTI_OWNER'));
  assert.ok(precisionAuditSource.includes('PEER_LABEL_INSIDE_CURRENT_PATH'));
  assert.ok(precisionAuditSource.includes('draftVisualPath'));
  assert.ok(precisionAuditSource.includes('draftHitPath'));
  assert.ok(precisionAuditSource.includes('draftLabelPoint'));
  assert.ok(precisionAuditSource.includes('operatorDecision=APPROVED'));
  assert.ok(precisionAuditSource.includes('--require-release'));
  assert.ok(renderSafetyAuditSource.includes('DAEGU_SEATMAP_RENDER_SAFETY_AUDIT_V1'));
  assert.ok(renderSafetyAuditSource.includes('PASS_UI_CONTAINMENT'));
  assert.ok(renderSafetyAuditSource.includes('PASS_RELEASE_177'));
  assert.ok(renderSafetyAuditSource.includes('EXPECTED_REVIEW_ONLY_SEATS = 97'));
  assert.ok(renderSafetyAuditSource.includes('HIDDEN_FROM_NORMAL_UI'));
  assert.ok(renderSafetyAuditSource.includes('SCREENSHOT_ZONE_RISK'));
  assert.ok(renderSafetyAuditSource.includes('LEGACY_RECTANGLE_REVIEW'));
  assert.ok(renderSafetyAuditSource.includes('markerLayerUsesNonSeatRenderer'));
  assert.ok(renderSafetyAuditSource.includes('markerLayerPointerDisabled'));
  assert.ok(renderSafetyAuditSource.includes('isDaeguNormalSelectableSeat'));
  assert.ok(renderSafetyAuditSource.includes('isDaeguReviewOnlySeat'));
  assert.ok(renderSafetyAuditSource.includes('SOURCE_CONTRACT_MISSING'));
  assert.ok(renderSafetyAuditSource.includes('SCREENSHOT_BLOCK_16_NOT_FLAGGED'));
  assert.ok(zonePrecisionWorksetsSource.includes('DAEGU_ZONE_PRECISION_WORKSETS_V1'));
  assert.ok(zonePrecisionWorksetsSource.includes('ZONE_3F_FIRST_BASE'));
  assert.ok(zonePrecisionWorksetsSource.includes('ZONE_3F_CENTER_THIRD'));
  assert.ok(zonePrecisionWorksetsSource.includes('ZONE_5F_SKY'));
  assert.ok(zonePrecisionWorksetsSource.includes('ZONE_OUTFIELD'));
  assert.ok(zonePrecisionWorksetsSource.includes('STAGE_01_BOUNDARY_FIRST'));
  assert.ok(zonePrecisionWorksetsSource.includes('STAGE_02_DUPLICATE_SHARED'));
  assert.ok(zonePrecisionWorksetsSource.includes('STAGE_03_3F_MANUAL_RETRACE'));
  assert.ok(zonePrecisionWorksetsSource.includes('STAGE_04_5F_SKY'));
  assert.ok(zonePrecisionWorksetsSource.includes('STAGE_05_OUTFIELD'));
  assert.ok(zonePrecisionWorksetsSource.includes('expectedRows: 13'));
  assert.ok(zonePrecisionWorksetsSource.includes('expectedRows: 11'));
  assert.ok(zonePrecisionWorksetsSource.includes('expectedRows: 39'));
  assert.ok(zonePrecisionWorksetsSource.includes('expectedRows: 34'));
  assert.ok(zonePrecisionWorksetsSource.includes('productionWriteAllowed: false'));
  assert.ok(zonePrecisionWorksetsSource.includes('operatorApprovalRequired: true'));
  assert.ok(correctionsRunbookSource.includes('대구 좌석도 operator corrections runbook'));
  assert.ok(correctionsRunbookSource.includes('PASS_WORKFLOW'));
  assert.ok(correctionsRunbookSource.includes('PASS_LOCKED_80'));
  assert.ok(correctionsRunbookSource.includes('PASS_UI_CONTAINMENT'));
  assert.ok(correctionsRunbookSource.includes('PASS_RELEASE_177'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:precision-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:render-safety-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:zone-precision-worksets'));
  assert.ok(correctionsRunbookSource.includes('npm run qa:stadium:daegu:release-lock'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-precision-audit.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-render-safety-audit.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-zone-precision-worksets.md'));
  assert.ok(correctionsRunbookSource.includes('readyForWrite=false'));
  assert.ok(correctionsRunbookSource.includes('NO_APPROVED_OPERATOR_CORRECTIONS'));
  assert.ok(correctionsRunbookSource.includes('BATCH_1_P0'));
  assert.ok(correctionsRunbookSource.includes('BATCH_2_P1'));
  assert.ok(correctionsRunbookSource.includes('BATCH_3_P2'));
  assert.ok(correctionsRunbookSource.includes('BATCH_4_P3_P4'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-operator-corrections-batches.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-operator-state-audit.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-retrace-work-queue.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-non-overlap-priority-queue.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-visual-issue-queue.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-visual-off-seat-workset.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-input-aid.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-precision-workset.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-off-seat-retrace-intake.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-p1-off-seat-workset.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-off-seat-operator-input.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-off-seat-operator-import.md'));
  assert.ok(correctionsRunbookSource.includes('APPROVED_ROWS_OUT_OF_PRIORITY_ORDER'));
  assert.ok(correctionsRunbookSource.includes('BATCH_HAS_PENDING_ROWS'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-package'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-decision-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-retrace-intake'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-validate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-import'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-readiness'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-prewrite-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-operator-import:write-template'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-package.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-checklist.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-decision-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-retrace-intake.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-audit.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p0-operator/daegu-seatmap-p0-operator-readiness.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-p0-operator-import.md'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-package'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-decision-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-next-action-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-precision-workset'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-template-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-source-copy'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-source-copy:write-source-input'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-review-board'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-entry-sheet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-entry-preflight'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-entry-preflight:require-ready'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-tracing-pack'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-operator-handoff'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-postwrite-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-postwrite-gate:require-written'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-validate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-import'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-readiness'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-prewrite-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-operator-import:write-template'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-input-aid'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-package.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-checklist.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-decision-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-next-action-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-precision-workset.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-readiness.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-overlay.svg'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-template.json'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-template-gate.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-source-copy.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-review-board.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-entry-sheet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-entry-preflight.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-tracing-pack/'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-operator-handoff.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-boundary-first-postwrite-gate.md'));
  assert.ok(correctionsRunbookSource.includes('status=postwrite-verified'));
  assert.ok(correctionsRunbookSource.includes('editableSource=existingOperatorTemplate'));
  assert.ok(correctionsRunbookSource.includes('approvalMissingFields'));
  assert.ok(correctionsRunbookSource.includes('nextOperatorAction'));
  assert.ok(correctionsRunbookSource.includes('missingOperatorInputFields'));
  assert.ok(correctionsRunbookSource.includes('editableTarget'));
  assert.ok(correctionsRunbookSource.includes('waiting-for-operator-entry'));
  assert.ok(correctionsRunbookSource.includes('ready-for-template-gate'));
  assert.ok(correctionsRunbookSource.includes('ENTRY_PREFLIGHT_REQUIRES_OPERATOR_INPUT'));
  assert.ok(correctionsRunbookSource.includes('report-only'));
  assert.ok(correctionsRunbookSource.includes('require-ready'));
  assert.ok(correctionsRunbookSource.includes('`source-copy:write-source-input` 명령은 이 require-ready preflight를 먼저 통과'));
  assert.ok(correctionsRunbookSource.includes('red current target, blue paired neighbor, orange candidate reference-only path'));
  assert.ok(correctionsRunbookSource.includes('공식 PNG `1707x2048` 원본을 배경으로 사용'));
  assert.ok(correctionsRunbookSource.includes('좌표 변환을 하지 않는다'));
  assert.ok(correctionsRunbookSource.includes('template-preservation'));
  assert.ok(correctionsRunbookSource.includes('preservedEditableRows'));
  assert.ok(correctionsRunbookSource.includes('templateOnly=true'));
  assert.ok(correctionsRunbookSource.includes('productionWriteAllowed=false'));
  assert.ok(correctionsRunbookSource.includes('status=ready-for-source-copy'));
  assert.ok(correctionsRunbookSource.includes('status=waiting-for-operator'));
  assert.ok(correctionsRunbookSource.includes('status=partial-boundary-approval'));
  assert.ok(correctionsRunbookSource.includes('status=ready-for-write-source-input'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-audit.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-operator/daegu-seatmap-p1-operator-readiness.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-p1-operator-import.md'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-package'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-decision-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-next-action-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-validate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-import'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-readiness'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-prewrite-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-import:write-template'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-handoff'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-worksets'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-workset-preflight'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-entry-sheet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-tracing-pack'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-operator-post-entry-qa'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2a-operator-post-entry-qa'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2a-operator-input-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2a-prewrite-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2a-readiness-v3'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-package.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-checklist.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-decision-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-next-action-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-handoff.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-worksets.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-workset-preflight.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-entry-sheet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-tracing-pack/daegu-seatmap-p2-operator-tracing-pack.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-post-entry-qa.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-operator-post-entry-qa.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-operator-input-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-prewrite-gate.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-prewrite-preview.svg'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2a-readiness-v3.md'));
  assert.ok(correctionsRunbookSource.includes('P2A_LABEL_TOP_HIT_OPERATOR_QA_REQUIRED'));
  assert.ok(correctionsRunbookSource.includes('P2A_APPROVED_ROW_MISSING_FIELDS'));
  assert.ok(correctionsRunbookSource.includes('P2A_CORRECTED_LABEL_OUTSIDE_PATH'));
  assert.ok(correctionsRunbookSource.includes('P2A_CORRECTED_LABEL_TOP_HIT_MISMATCH'));
  assert.ok(correctionsRunbookSource.includes('P2A_CORRECTED_HIT_PATH_CAPTURES_NEIGHBOR_LABEL'));
  assert.ok(correctionsRunbookSource.includes('P2A_VALIDATION_ROW_NOT_VALID_FOR_APPROVAL'));
  assert.ok(correctionsRunbookSource.includes('P2A_WAITING_OPERATOR_ENTRY'));
  assert.ok(correctionsRunbookSource.includes('P2A_WAITING_P1_POSTWRITE'));
  assert.ok(correctionsRunbookSource.includes('P2A_WAITING_FULL_P2_READINESS'));
  assert.ok(correctionsRunbookSource.includes('P2A_NEVER_ALLOWS_DIRECT_PRODUCTION_WRITE'));
  assert.ok(correctionsRunbookSource.includes('CONTINUE_P2_FULL_READINESS'));
  assert.ok(correctionsRunbookSource.includes('CHECK_CORRECTED_LABEL_POINT_INSIDE_POLYGON'));
  assert.ok(correctionsRunbookSource.includes('CHECK_LABEL_POINT_SELECTS_SAME_BLOCK'));
  assert.ok(correctionsRunbookSource.includes('CHECK_HIT_PATH_DOES_NOT_CAPTURE_NEIGHBOR_BLOCK'));
  assert.ok(correctionsRunbookSource.includes('CHECK_PATH_ALIGNED_TO_OFFICIAL_PNG_SEAT_AREA'));
  assert.ok(correctionsRunbookSource.includes('CHECK_CURRENT_AND_CANDIDATE_PATHS_NOT_COPIED'));
  assert.ok(correctionsRunbookSource.includes('status=ready-for-p2-readiness'));
  assert.ok(correctionsRunbookSource.includes('FILL_REQUIRED_FIELDS'));
  assert.ok(correctionsRunbookSource.includes('RETRACE_FROM_OFFICIAL_PNG'));
  assert.ok(correctionsRunbookSource.includes('WAIT_FOR_P1_POSTWRITE'));
  assert.ok(correctionsRunbookSource.includes('red=currentPath, orange=candidatePath reference-only'));
  assert.ok(correctionsRunbookSource.includes('editableTarget'));
  assert.ok(correctionsRunbookSource.includes('CORRECTED_PATH_REUSES_CANDIDATE_PATH'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p2-operator/daegu-seatmap-p2-operator-readiness.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-p2-operator-import.md'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-package'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-decision-packet'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-validate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-import'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-readiness'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-prewrite-gate'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p3-p4-operator-import:write-template'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-package.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-checklist.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-audit.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-decision-packet.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p3-p4-operator/daegu-seatmap-p3-p4-operator-readiness.md'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-seatmap-p3-p4-operator-import.md'));
  assert.ok(correctionsRunbookSource.includes('P3 0건, P4 44건'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P0_ROW'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P1_ROW'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_P1_STAGE_ORDER'));
  assert.ok(correctionsRunbookSource.includes('P1_STAGE_ORDER_APPROVAL_BLOCKED'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-readiness'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-boundary-first-regression'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-boundary-first-regression/'));
  assert.ok(correctionsRunbookSource.includes('APPROVED_VALID'));
  assert.ok(correctionsRunbookSource.includes('APPROVED_INVALID'));
  assert.ok(correctionsRunbookSource.includes('canAdvanceToSingleCorrectedPath=false'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p1-stage-order-regression'));
  assert.ok(correctionsRunbookSource.includes('reports/stadium/daegu-p1-stage-order-regression/'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P2_ROW'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_AT_LEAST_ONE_APPROVED_P3_P4_ROW'));
  assert.ok(correctionsRunbookSource.includes('DRAFT_VALIDATION_ONLY'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P0_PENDING_ROWS'));
  assert.ok(correctionsRunbookSource.includes('P0/P1/P2/P3/P4 operator input 파일을 source of truth로 둔다'));
  assert.ok(correctionsRunbookSource.includes('`No operator corrected path provided;` note만 남은 terminal decision은 stale 산출물'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-state-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:retrace-work-queue'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:non-overlap-priority-queue'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:visual-issue-queue'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:visual-off-seat-workset'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:off-seat-retrace-intake'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-p1-off-seat-workset'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-off-seat-operator-input'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-off-seat-operator-import'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p0-off-seat-operator-import:write-source-input'));
  assert.ok(correctionsRunbookSource.includes('NO_OVERLAP_OFF_SEAT_RETRACE_FIRST'));
  assert.ok(correctionsRunbookSource.includes('시각 오류 우선 queue'));
  assert.ok(correctionsRunbookSource.includes('visual seed는 현재 19건'));
  assert.ok(correctionsRunbookSource.includes('현재 source input에 없는 블록은 observation으로만 남기고 visual seed row에는 포함하지 않는다.'));
  assert.ok(correctionsRunbookSource.includes('VISUAL_OFF_SEAT_HARD_FAIL'));
  assert.ok(correctionsRunbookSource.includes('OVERSIZED_RECT_MANUAL_RETRACE'));
  assert.ok(correctionsRunbookSource.includes('LABEL_AND_HIT_AREA_REVIEW'));
  assert.ok(correctionsRunbookSource.includes('VISUAL_APPROVAL_CANDIDATE'));
  assert.ok(correctionsRunbookSource.includes('DEFER_DUPLICATE_BOUNDARY'));
  assert.ok(correctionsRunbookSource.includes('`PIXEL_CANDIDATE_READY` row도 자동 승격하지 않으며'));
  assert.ok(correctionsRunbookSource.includes('production write 순서는 계속 P0, P1, P2, P3/P4 gate를 따른다.'));
  assert.ok(correctionsRunbookSource.includes('VISUAL_OFF_SEAT_HARD_FAIL 27건 workset'));
  assert.ok(correctionsRunbookSource.includes('현재 기준 분포는 P0 0건, P1 5건, P2 0건, P3/P4 22건이며 visual seed row는 7건이어야 한다.'));
  assert.ok(correctionsRunbookSource.includes('이 workset은 read-only이고 `productionWriteAllowed=false`다.'));
  assert.ok(correctionsRunbookSource.includes('실제 좌석 경계를 최소 6점 이상으로 수동 트레이싱'));
  assert.ok(correctionsRunbookSource.includes('LOW_COMPONENT_INSIDE_CURRENT_PATH'));
  assert.ok(correctionsRunbookSource.includes('LOW_CURRENT_PATH_COLOR_COVERAGE'));
  assert.ok(correctionsRunbookSource.includes('현재 기준 off-seat intake는 27건이며'));
  assert.ok(correctionsRunbookSource.includes('P0/P1 subset은 5건'));
  assert.ok(correctionsRunbookSource.includes('중복 후보 경계가 있는 row는 이 intake에서 제외'));
  assert.ok(correctionsRunbookSource.includes('현재 기준 workset은 P0 0건, P1 5건, 총 5건'));
  assert.ok(correctionsRunbookSource.includes('currentPath`는 오류 확인용'));
  assert.ok(correctionsRunbookSource.includes('candidatePath`는 참고용'));
  assert.ok(correctionsRunbookSource.includes('현재 대상 row는 0건이며 duplicate row는 0건이어야 한다.'));
  assert.ok(correctionsRunbookSource.includes('P0 off-seat draft import'));
  assert.ok(correctionsRunbookSource.includes('기본 모드는 dry-run이며 source input, main corrections template, `src/data/daeguSeatData.ts`를 수정하지 않는다.'));
  assert.ok(correctionsRunbookSource.includes('승인 row가 없으면 source input을 쓰지 않는다.'));
  assert.ok(correctionsRunbookSource.includes('write-source-input 모드도 source P0 input만 수정할 수 있으며 main corrections template과 production data는 수정하지 않는다.'));
  assert.ok(correctionsRunbookSource.includes('`draftOnly=true`, `sourceOfTruth=false`, `productionWriteAllowed=false`'));
  assert.ok(correctionsRunbookSource.includes('`currentPath`는 잘못된 legacy path 확인용'));
  assert.ok(correctionsRunbookSource.includes('source P0 input으로 복사한 뒤에만'));
  assert.ok(correctionsRunbookSource.includes('큐에는 evidence crop, current path, candidate path, operator action, duplicate group/id, failure reason, risk flag가 포함된다.'));
  assert.ok(correctionsRunbookSource.includes('source input row를 `operatorDecision=APPROVED`로 되돌리고'));
  assert.ok(correctionsRunbookSource.includes('INPUT_PENDING_TEMPLATE_NOT_PENDING'));
  assert.ok(correctionsRunbookSource.includes('INPUT_TEMPLATE_DECISION_MISMATCH'));
  assert.ok(correctionsRunbookSource.includes('IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(correctionsRunbookSource.includes('STALE_WRITE_TEMPLATE_IMPORT_REPORT'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_IMPORT_HAS_PENDING_INPUT'));
  assert.ok(correctionsRunbookSource.includes('FIRST_OPEN_BATCH_DOES_NOT_MATCH_INPUT_PENDING'));
  assert.ok(correctionsRunbookSource.includes('P0_PENDING_ROWS_REMAIN'));
  assert.ok(correctionsRunbookSource.includes('P0_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P1_PENDING_ROWS'));
  assert.ok(correctionsRunbookSource.includes('P1_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(correctionsRunbookSource.includes('P1_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(correctionsRunbookSource.includes('P1_PENDING_ROWS_REMAIN'));
  assert.ok(correctionsRunbookSource.includes('P1_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(correctionsRunbookSource.includes('P2_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(correctionsRunbookSource.includes('P2_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(correctionsRunbookSource.includes('P2_PENDING_ROWS_REMAIN'));
  assert.ok(correctionsRunbookSource.includes('P2_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P2_PENDING_ROWS'));
  assert.ok(correctionsRunbookSource.includes('P3_P4_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(correctionsRunbookSource.includes('P3_P4_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(correctionsRunbookSource.includes('P3_P4_PENDING_ROWS_REMAIN'));
  assert.ok(correctionsRunbookSource.includes('P3_P4_IMPORT_REPORT_NOT_DRY_RUN'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_NO_P3_P4_PENDING_ROWS'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_CLOSED'));
  assert.ok(correctionsRunbookSource.includes('WRITE_TEMPLATE_REQUIRES_PRIOR_BATCH_WRITTEN'));
  assert.ok(correctionsRunbookSource.includes('`p0-operator-import:write-template` 이후에는 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다'));
  assert.ok(correctionsRunbookSource.includes('`p1-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다'));
  assert.ok(correctionsRunbookSource.includes('`p2-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다'));
  assert.ok(correctionsRunbookSource.includes('`p3-p4-operator-import:write-template` 이후에도 `npm run stadium:daegu:operator-corrections`를 다시 실행하지 않는다'));
  assert.ok(correctionsRunbookSource.includes('operatorDecision=APPROVED'));
  assert.ok(correctionsRunbookSource.includes('correctedPath'));
  assert.ok(correctionsRunbookSource.includes('correctedLabelX'));
  assert.ok(correctionsRunbookSource.includes('correctedLabelY'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-review-package'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:p2-staging-audit'));
  assert.ok(correctionsRunbookSource.includes('daegu-seatmap-p2-review-checklist.md'));
  assert.ok(correctionsRunbookSource.includes('daegu-seatmap-p2-staging-audit.md'));
  assert.ok(correctionsRunbookSource.includes('--allow-draft-markers'));
  assert.ok(correctionsRunbookSource.includes('DRAFT_VALIDATION_ONLY'));
  assert.ok(correctionsRunbookSource.includes('최소 6개 polygon point'));
  assert.ok(correctionsRunbookSource.includes('PATH_REQUIRES_AT_LEAST_SIX_POINTS'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-corrections-template'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-corrections-batches'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-corrections-status'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-corrections-write-guard'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-corrections-write'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:operator-corrections-postwrite-gate'));
  assert.ok(correctionsRunbookSource.includes('guard가 통과하지 않으면 `apply --write`가 호출되지 않는다'));
  assert.ok(correctionsRunbookSource.includes('npm run stadium:daegu:alignment-audit'));
  assert.ok(correctionsRunbookSource.includes('npm run test:stadium:seatmaps'));
  assert.ok(correctionsRunbookSource.includes('npm run qa:stadium:daegu:full'));
  assert.ok(correctionsRunbookSource.includes('외부 크롤링, 웹 검색, 추정 좌표'));
  assert.ok(correctionsRunbookSource.includes('운영자 승인 없이 어떤 블록도 `OFFICIAL_IMAGE_TRACED`로 승격하지 않는다'));
});

test('잠실 full QA 스크립트는 대표 블록과 전용 플래그를 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );
  const requiredJamsilFullClickLabels = [
    '101 블록 1루 레드석 101',
    '205 블록 1루 오렌지석 205',
    '312 블록 중앙 네이비석 312',
    '405 블록 외야 그린응원석 405',
    '422 블록 외야 그린석 422',
    '중앙 프리미엄석 테라존',
    '1루 익사이팅존 1루 익사이팅존',
    '3루 익사이팅존 3루 익사이팅존',
    '1루 휠체어석 101B / 102B / 109B',
    '3루 휠체어석 114B / 121B / 122B',
  ];

  assert.ok(packageSource.includes('"qa:stadium:jamsil:full"'));
  assert.ok(packageSource.includes('node scripts/run-stadium-isolated-qa.mjs JAMSIL:FULL'));
  assert.ok(packageSource.includes('"qa:stadium:jamsil:responsive"'));
  assert.ok(packageSource.includes('node scripts/run-stadium-isolated-qa.mjs JAMSIL:RESPONSIVE'));
  assert.ok(runnerSource.includes('mobile-360,mobile-390,mobile-430,tablet-768,desktop-1038,desktop-1440'));
  assert.ok(runnerSource.includes("STADIUM_UX_JAMSIL_FULL_CLICK_CHECK: '1'"));
  assert.ok(auditSource.includes('STADIUM_UX_JAMSIL_FULL_CLICK_CHECK'));
  assert.ok(auditSource.includes('verifyJamsilFullOverlayClicks'));
  assert.ok(auditSource.includes('verifyJamsilFilterInteractions'));
  assert.ok(auditSource.includes("'jamsil-filter-infield'"));
  assert.ok(auditSource.includes("'jamsil-filter-premium'"));
  assert.ok(auditSource.includes("'jamsil-filter-accessible'"));
  requiredJamsilFullClickLabels.forEach((label) => {
    assert.ok(auditSource.includes(label), `${label} should be part of Jamsil full QA`);
  });
});

test('주요 full QA 스크립트는 필터 적용 후 대표 블록 클릭 회귀를 고정한다', () => {
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  [
    'verifyIncheonFilterInteractions',
    'verifyGocheokFilterInteractions',
    'verifyDaeguFilterInteractions',
    "'incheon-filter-field'",
    "'incheon-filter-cheer'",
    "'incheon-filter-table'",
    "'incheon-filter-accessible'",
    "'gocheok-filter-infield'",
    "'gocheok-filter-premium'",
    "'gocheok-filter-accessible'",
    "'daegu-filter-cheer'",
    "'daegu-filter-table'",
    "'daegu-filter-outfield'",
    'daegu-review-block-daegu-sky-third-upper-16',
    'Daegu normal seat layer must not render NEEDS_OPERATOR_REVIEW blocks',
    'Daegu marker-only accessible entries must not render in the seat polygon layer',
    'Daegu marker-only layer must not expose seat selection buttons',
  ].forEach((snippet) => {
    assert.ok(auditSource.includes(snippet), `${snippet} should be part of stadium full filter QA`);
  });
});

test('수원 full QA 스크립트는 중첩 회귀 블록과 확대 플로우를 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );
  const requiredSuwonFullClickIds = [
    'suwon-117',
    'suwon-312',
    'suwon-genie',
    'suwon-wheel-1b',
    'suwon-wheel-3b',
    'suwon-109',
    'suwon-432',
  ];

  assert.ok(packageSource.includes('"qa:stadium:suwon:full"'));
  assert.ok(packageSource.includes('node scripts/run-stadium-isolated-qa.mjs SUWON:FULL'));
  assert.ok(packageSource.includes('"qa:stadium:suwon:responsive"'));
  assert.ok(packageSource.includes('node scripts/run-stadium-isolated-qa.mjs SUWON:RESPONSIVE'));
  assert.ok(runnerSource.includes('mobile-360,mobile-390,mobile-430,tablet-768,desktop-1038,desktop-1440'));
  assert.ok(runnerSource.includes("STADIUM_UX_SUWON_FULL_CLICK_CHECK: '1'"));
  assert.ok(auditSource.includes('STADIUM_UX_SUWON_FULL_CLICK_CHECK'));
  assert.ok(auditSource.includes('verifySuwonFullOverlayClicks'));
  assert.ok(auditSource.includes('verifySuwonFilterInteractions'));
  assert.ok(auditSource.includes('Suwon ${filterLabel} filter should keep ${targetId} interactive.'));
  assert.ok(auditSource.includes("filterLabel: '내야석', targetId: 'suwon-genie'"));
  assert.ok(auditSource.includes("filterLabel: '내야석', targetId: 'suwon-312'"));
  assert.ok(auditSource.includes("filterLabel: '휠체어석', targetId: 'suwon-wheel-1b'"));
  assert.ok(auditSource.includes("filterLabel: '휠체어석', targetId: 'suwon-wheel-3b'"));
  assert.ok(auditSource.includes('suwon-seatmap-zoom-in'));
  assert.ok(auditSource.includes('suwon-seatmap-fullscreen-open'));
  requiredSuwonFullClickIds.forEach((id) => {
    assert.ok(auditSource.includes(id), `${id} should be part of Suwon full QA`);
  });
});

test('공통 SVG 좌석도 모델 파일은 제거되어야 한다', () => {
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/components/ui/StadiumSeatMap.tsx')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/components/ui/stadiumSeatMapModel.ts')), false);
  assert.equal(fs.existsSync(path.join(projectRoot, 'src/components/ui/stadiumSeatMapModel.test.ts')), false);
});
