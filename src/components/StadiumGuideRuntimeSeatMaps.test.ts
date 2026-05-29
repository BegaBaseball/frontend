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
    requiredFiles: [
      'src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.png',
      'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.png',
    ],
  },
  {
    presetId: 'daejeon',
    folder: 'daejeon',
    componentName: 'DaejeonSeatMap',
    dataFile: 'daejeonSeatData.ts',
    badgeLabel: '대전 한화생명볼파크 공식 좌석도',
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
    requiredFiles: [
      'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.png',
      'src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png',
    ],
  },
  {
    presetId: 'suwon',
    folder: 'suwon',
    componentName: 'SuwonSeatMap',
    dataFile: 'suwonSeatData.ts',
    badgeLabel: '수원 kt 위즈 파크 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp'],
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
    .map((probe) => ({ id: probe.id, point: [...probe.point] as [number, number], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));
  const browserQaProbes = SUWON_BROWSER_QA_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point] as [number, number], note: probe.note }))
    .sort((a, b) => probeKey(a.id, a.point).localeCompare(probeKey(b.id, b.point)));
  const hitTestProbes = SUWON_HIT_TEST_PROBES
    .map((probe) => ({ id: probe.id, point: [...probe.point] as [number, number], note: probe.note }))
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
  assert.equal(resolveStadiumSeatMapEntry('DAEJEON', '대전 한화생명볼파크')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('HANWHA', '한화생명 이글스파크')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('HH', '이글스파크')?.id, 'daejeon');
  assert.equal(resolveStadiumSeatMapEntry('HH', '한화')?.id, 'daejeon');
});

test('대전 좌석도는 canonical registry, 구역 찾기, 공식 메타 상세 패널 계약을 제공한다', () => {
  const registryEntry = STADIUM_SEAT_MAP_ENTRIES.find((entry) => entry.id === 'daejeon');
  const registrySource = readProjectFile('src/components/stadiumSeatMapRegistry.tsx');
  const daejeonSource = readProjectFile('src/components/daejeon/DaejeonSeatMap.tsx');
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

  assert.ok(dataSource.includes("imagePath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp'"), 'Suwon active image path should pin the @2x official WebP');
  assert.ok(dataSource.includes("requiredAssetPath: 'src/assets/stadiums/kt/suwon-kt-seatmap-official-2026@2x.webp'"), 'Suwon required asset path should pin the @2x official WebP');
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
    import('./stadiumSeatMapRegistry'),
    import('./stadiumSeatMap/SeatMapRuntimeShell'),
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

test('인천 전용 guide/quick-action 계약은 표준 좌석도 슬롯에서 유지한다', () => {
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
    'getIncheonGuideMatches',
    'SeatMapSectionFinder',
    'mobileSecondaryPanel',
    'desktopSecondaryPanel',
    'setPendingDraft',
    "stadium: 'INCHEON'",
    "team: 'SSG'",
  ].forEach((requiredToken) => {
    assert.ok(incheonSource.includes(requiredToken), `IncheonSeatMap should include ${requiredToken}`);
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
    'IncheonGuideMatch',
    'getIncheonGuideMatches',
    'getIncheonDecisionTags',
  ].forEach((requiredToken) => {
    assert.ok(incheonDataSource.includes(requiredToken), `incheonSeatData should include ${requiredToken}`);
  });

  [
    'SeatMapFilterBar',
    'SeatMapLegend',
    'SeatMapAttribution',
    'SeatMapDetailPanel',
    'SeatMapBottomSheet',
    'fullscreenDialogTestId="incheon-seatmap-fullscreen"',
  ].forEach((requiredToken) => {
    assert.ok(incheonSource.includes(requiredToken), `IncheonSeatMap should keep standard UX token ${requiredToken}`);
  });

  assert.equal(incheonSource.includes('IncheonUploadFlowModal'), false, 'IncheonSeatMap should remove the demo upload modal');
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
  const secondaryPanelPresetIds = new Set(['incheon', 'daegu', 'daejeon', 'gocheok', 'sajik']);

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
  const gocheokFacilityGuideSource = readProjectFile('src/components/gocheok/GocheokFacilityGuide.tsx');
  const incheonSource = readProjectFile('src/components/incheon/IncheonSeatMap.tsx');

  assert.ok(daeguSource.includes('data-testid="daegu-section-finder"'), 'Daegu finder should remain the documented secondary panel exception');
  assert.ok(daejeonSource.includes('data-testid="daejeon-section-finder"'), 'Daejeon finder should remain the documented secondary panel exception');
  assert.ok(sajikSource.includes('data-testid="sajik-first-visit-guide"'), 'Sajik first-visit guide should remain the documented secondary panel exception');
  assert.ok(gocheokSource.includes('SeatMapSectionFinder'), 'Gocheok should use the shared section finder');
  assert.ok(gocheokSource.includes('testIdPrefix="gocheok"'), 'Gocheok section finder should keep its test id prefix');
  assert.ok(gocheokSource.includes('mobileSecondaryPanel='), 'Gocheok should expose finder below the map on mobile');
  assert.ok(gocheokSource.includes('desktopSecondaryPanel='), 'Gocheok should expose finder above the side panel on desktop');
  assert.ok(gocheokSource.includes('getGocheokVisitHint'), 'Gocheok details should derive visit checks from static data');
  assert.ok(gocheokSource.includes('renderVisitCheckMeta'), 'Gocheok details should render the visit check meta area');
  assert.ok(gocheokSource.includes('data-testid="gocheok-visit-check"'), 'Gocheok visit check test id should stay stable');
  assert.ok(gocheokSource.includes('activeFacilityTab'), 'Gocheok should hold the controlled facility tab state');
  assert.ok(gocheokSource.includes('activeTab={activeFacilityTab}'), 'Gocheok should pass the selected facility tab to the guide');
  assert.ok(gocheokSource.includes('onTabChange={setActiveFacilityTab}'), 'Gocheok should let the guide update the selected facility tab');
  assert.ok(gocheokSource.includes('GocheokFacilityGuide'), 'Gocheok facility mode should remain the documented auxiliary guide exception');
  assert.ok(gocheokSource.includes('isAuxiliaryGuideActive={!isSeatMapMode}'), 'Gocheok facility mode should use the shared auxiliary guide flag');
  assert.ok(gocheokFacilityGuideSource.includes('activeTab: controlledActiveTab'), 'Gocheok facility guide should support a controlled tab prop');
  assert.ok(gocheokFacilityGuideSource.includes('onTabChange'), 'Gocheok facility guide should notify parent tab changes');
  assert.ok(gocheokFacilityGuideSource.includes('data-testid="gocheok-operator-data-required"'), 'Gocheok facility guide should surface operator data pending status');
  assert.ok(incheonSource.includes('data-testid="incheon-first-visit-guide"'), 'Incheon first-visit guide should remain the documented secondary panel exception');
  assert.ok(incheonSource.includes('testIdPrefix="incheon"'), 'Incheon section finder should keep its test id prefix');
  assert.ok(incheonSource.includes('mobileSecondaryPanel={secondaryPanel}'), 'Incheon should expose guide and finder below the map on mobile');
  assert.ok(incheonSource.includes('desktopSecondaryPanel={secondaryPanel}'), 'Incheon should expose guide and finder above the side panel on desktop');
});

test('고척 직관 UX Cypress spec은 기존 stadium-seatmap 회귀 파일에서 검증한다', () => {
  const stadiumSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap.cy.ts');

  [
    'Stadium SeatMap — Gocheok Visit UX',
    'getGocheokPlaces',
    'gocheok-block-search',
    'gocheok-section-finder-item-gocheok-d04',
    'gocheok-section-finder-item-gocheok-430',
    'gocheok-visit-check',
    'gocheok-facility-guide-open',
    'gocheok-facility-tab-overview',
    'gocheok-facility-tab-entrances',
    'gocheok-operator-data-status',
    'gocheok-seatmap-svg',
  ].forEach((requiredText) => {
    assert.ok(stadiumSeatmapSpec.includes(requiredText), `Stadium seatmap Cypress spec should include ${requiredText}`);
  });
});

test('인천 직관 UX Cypress spec은 기존 stadium-seatmap 회귀 파일에서 검증한다', () => {
  const stadiumSeatmapSpec = readProjectFile('cypress/e2e/stadium-seatmap.cy.ts');

  [
    'Stadium SeatMap — Incheon First Visit UX',
    'selectIncheonBlock',
    'incheon-first-visit-guide',
    'incheon-section-finder',
    'incheon-seatmap-detail-panel',
    'incheon-block-search',
    'incheon-section-finder-item-incheon-101b',
    'incheon-guide-search',
    'incheon-guide-result-incheon-101b',
    'incheon-guide-result-incheon-accessible-9b',
    '다이어리에서 시야 사진 공유하기',
    'diary-draft-storage',
    'pendingLoginRedirect',
  ].forEach((requiredText) => {
    assert.ok(stadiumSeatmapSpec.includes(requiredText), `Stadium seatmap Cypress spec should include ${requiredText}`);
  });
});

test('대구 좌석도 release lock 문서는 classified row 계약을 고정한다', () => {
  const releaseLockSource = readProjectFile('docs/daegu-seatmap-release-lock.md');

  [
    '# 대구 삼성라이온즈파크 좌석도 release lock',
    'PASS_RELEASE_177',
    '1707x2048',
    'DAEGU_SAMSUNG_LIONS_PARK_2026_MANUAL_POLYGON_V1',
    '8da44a063ff56ddc6d956d3cf7525787bc2414512d7807170d4bf6c3fcedf3e0',
    'LOCKED_VERIFIED',
    '174',
    'classifiedReleaseRows',
    '3',
    'releaseInventoryLocked',
    '177',
    'normalSelectableSeats',
    '171',
    'reviewOnlySeats',
    '0',
    'officialUnconfirmedSeats',
    '2',
    'MR-10',
    'M-10',
    '12',
    'OFFICIAL_INDEPENDENT_COMPONENT_UNCONFIRMED',
    'WAYFINDING_MARKER',
    'not selectable',
    'operatorDecision=APPROVED',
    'correctedPath',
    'correctedLabelX/Y',
    'reviewer',
    'reviewedAt',
    'MYSEATCHECK_REFERENCE_2026',
    'docs/daegu-seatmap-myseatcheck-reference-intake.md',
    'canonical 좌표를 대체하지 않는다',
    'npm run qa:stadium:daegu:release-lock',
    'npm run stadium:daegu:canonical-retrace-batch -- SKY_UPPER_01_10',
    'npm run stadium:daegu:render-safety-audit',
    'npm run qa:stadium:daegu:full',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `Daegu release lock should include ${requiredText}`);
  });
});

test('standard shell PR scope guard는 clean expected 파일을 blocker로 보지 않는다', () => {
  const guardSource = readProjectFile('scripts/stadium-seatmap-standard-shell-pr-scope-guard.mjs');
  const scopeDocSource = readProjectFile('docs/stadium-seatmap-standard-shell-pr-scope.md');

  assert.ok(guardSource.includes('notDirtyExpectedCount'), 'scope guard should report clean expected standard shell files separately');
  assert.ok(
    guardSource.includes('clean expected files are not packaging blockers'),
    'scope guard report should state clean expected files are not packaging blockers',
  );
  assert.equal(
    guardSource.includes('Expected standard shell PR file is not present in dirty inventory.'),
    false,
    'scope guard should not fail just because an expected standard shell file is currently clean',
  );
  assert.ok(
    scopeDocSource.includes('expected files not currently dirty'),
    'scope doc should document the not-dirty expected file behavior',
  );
});

test('구장별 전용 좌석도는 공통 UX 계약을 노출한다', () => {
  const fullscreenControlPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'gocheok', 'changwon', 'sajik', 'suwon']);
  const suppressClickPresetIds = new Set(['jamsil', 'incheon', 'daegu', 'daejeon', 'gocheok', 'sajik', 'suwon']);
  const panCursorSnippets: Record<string, string> = {
    jamsil: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    incheon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    daegu: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    daejeon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    gocheok: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
    changwon: "cursor: canDrag ? (isDragging ? 'grabbing' : 'grab') : 'default'",
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
  assert.ok(gwangjuSource.includes('testId="gwangju-bottom-sheet"'), 'Gwangju should preserve its mobile QA bottom-sheet id');
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
  assert.ok(gwangjuSvgSource.includes('visualPathD = block.imageGeometry.visualD ?? block.imageGeometry.d'), 'Gwangju should render official-image visual overlay separately from clipped hit paths');
  assert.ok(gwangjuSvgSource.includes('data-testid={`gwangju-seat-visual-${block.id}`}'), 'Gwangju visual overlay paths should not be counted as seat hit paths');
  assert.ok(gwangjuSvgSource.includes('data-visual-path={visualPathD}'), 'Gwangju hit paths should retain visual path evidence for selected sweep QA');
  assert.ok(gwangjuSvgSource.includes('<image'), 'Gwangju should render the official PNG inside the same SVG coordinate plane as hit areas');
  assert.ok(gwangjuSvgSource.includes('preserveAspectRatio="none"'), 'Gwangju official PNG should map directly to the 2200x1159 SVG coordinates');
  assert.ok(gwangjuSvgSource.includes('const strokeWidth = isActive ? (isSmallVisual ? 0.75 : 1.5) : 1'), 'Gwangju visual overlay stroke should not inflate small H/I/J/S blocks');
  assert.ok(gwangjuSvgSource.includes('fillOpacity = showHitAreaDebug ? 0.08 : 0;'), 'Gwangju filtered source blocks should not render black dim overlays in normal seatmap mode');
  assert.ok(gwangjuSvgSource.includes('fillOpacity={0}'), 'Gwangju invisible hit paths should not paint black rectangles in normal seatmap mode');
  assert.equal(gwangjuSvgSource.includes("fill = mode === 'dark' ? '#020617' : '#1e293b'"), false, 'Gwangju filtered source blocks should stay invisible instead of painting dark rectangles');
  assert.ok(gwangjuSvgSource.includes("'k5-101'"), 'Gwangju lower infield 101~108 blocks should use the same small visual overlay cap as H/I/J');
  assert.ok(gwangjuSvgSource.includes("'k7-108'"), 'Gwangju lower infield 101~108 blocks should use the same small visual overlay cap as H/I/J');
  assert.ok(gwangjuSvgSource.includes("'k9-116'"), 'Gwangju third-base lower infield 116~125 blocks should use the same small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("'k5-126'"), 'Gwangju restored 126 K5 should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("'k5-127'"), 'Gwangju restored 127 K5 should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes('POLYGON_STROKE_HIDDEN_IDS'), 'Gwangju 121~127 polygon hit areas should hide always-on blue outlines');
  assert.ok(gwangjuSvgSource.includes('const shouldHidePolygonStroke = POLYGON_STROKE_HIDDEN_IDS.has(block.id)'), 'Gwangju polygon stroke hiding should be block-scoped');
  assert.ok(gwangjuSvgSource.includes('shouldHidePolygonStroke\n              ? 0'), 'Gwangju 121~127 blue outlines should stay hidden even while hover/click hit areas remain active');
  assert.ok(gwangjuSvgSource.includes("'third-wheelchair-seats'"), 'Gwangju restored third-base I should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("'party-seats-third'"), 'Gwangju restored third-base J should use the small visual overlay cap');
  assert.ok(gwangjuSvgSource.includes("filter={isActive && !isSmallVisual ? 'url(#gwangju-hit-glow)' : undefined}"), 'Gwangju small H/I/J/S blocks should not render glow filters that inflate selected polygons');
  assert.ok(gwangjuSvgSource.includes('const showLabel = isActive && !isFiltered'), 'Gwangju debug overlay should not duplicate official PNG labels over every block');
  assert.equal(gwangjuSvgSource.includes('strokeWidth={isActive ? 4 : 2}'), false, 'Gwangju should not use thick active strokes that make small polygons look oversized');
  assert.equal(gwangjuSvgSource.includes('object-contain'), false, 'Gwangju should not split the official PNG into a separate object-fit layer');

  const stadiumUxAuditSource = readProjectFile('scripts/stadium-ux-audit.mjs');
  assert.ok(stadiumUxAuditSource.includes("filePrefix: 'gwangju-lower-infield-selected-sweep'"), 'Gwangju browser QA should define lower infield selected sweep evidence');
  assert.ok(stadiumUxAuditSource.includes("filePrefix: 'gwangju-thirdbase-selected-sweep'"), 'Gwangju browser QA should define third-base selected sweep evidence');
  assert.ok(stadiumUxAuditSource.includes('`${sweepGroup.filePrefix}-${suffix}.json`'), 'Gwangju browser QA should persist selected sweep JSON evidence for every sweep group');
  assert.ok(stadiumUxAuditSource.includes('`${sweepGroup.filePrefix}-${suffix}.md`'), 'Gwangju browser QA should persist selected sweep Markdown evidence for every sweep group');
  assert.ok(stadiumUxAuditSource.includes('`${sweepGroup.filePrefix}-${target.id}-${suffix}.png`'), 'Gwangju browser QA should persist per-target selected sweep crops for every sweep group');
  assert.equal(stadiumUxAuditSource.includes('gwangju-seatmap-third-base-independent-audit-overlay.png'), false, 'Gwangju browser QA should not link deleted third-base legacy reference overlays');
  assert.ok(stadiumUxAuditSource.includes('STADIUM_UX_GWANGJU_EXPANDED_EVIDENCE'), 'Gwangju expanded selected sweep evidence should be gated separately from default trace-review');
  assert.ok(stadiumUxAuditSource.includes('STADIUM_UX_GWANGJU_SELECTED_SWEEP_ONLY'), 'Gwangju selected sweep evidence should support a browser evidence-only mode');
  assert.ok(stadiumUxAuditSource.includes('gwangjuThirdBaseSelectedSweepTargets'), 'Gwangju selected sweep should keep default and expanded third-base target sets separate');
  assert.ok(stadiumUxAuditSource.includes('captureGwangjuSelectedSeatmapEvidence'), 'Gwangju selected evidence crops should hide mobile bottom sheets without clearing selection');
  assert.ok(stadiumUxAuditSource.includes('[data-testid="gwangju-bottom-sheet"]'), 'Gwangju selected evidence crops should target the mobile bottom sheet by test id');
  assert.ok(stadiumUxAuditSource.includes("'k5-104'"), 'Gwangju lower infield selected sweep should include 104 near H/I/J');
  assert.ok(stadiumUxAuditSource.includes("'k7-108'"), 'Gwangju lower infield selected sweep should include 108 near J/I/H');
  assert.ok(stadiumUxAuditSource.includes("'k9-116'"), 'Gwangju third-base selected sweep should include 116 near A/B/C/G/H/I/J/L');
  assert.ok(stadiumUxAuditSource.includes("'k7-121'"), 'Gwangju third-base selected sweep should include restored 121');
  assert.ok(stadiumUxAuditSource.includes("'k7-122'"), 'Gwangju third-base selected sweep should include restored 122');
  assert.ok(stadiumUxAuditSource.includes("'k8-123'"), 'Gwangju third-base selected sweep should include restored 123');
  assert.ok(stadiumUxAuditSource.includes("'k5-124'"), 'Gwangju third-base selected sweep should include restored 124');
  assert.ok(stadiumUxAuditSource.includes("'k5-125'"), 'Gwangju third-base selected sweep should include restored 125');
  assert.ok(stadiumUxAuditSource.includes("'k5-126'"), 'Gwangju third-base selected sweep should include restored 126');
  assert.ok(stadiumUxAuditSource.includes("'k5-127'"), 'Gwangju third-base selected sweep should include restored 127');
  assert.ok(stadiumUxAuditSource.includes("'third-surprise-seats'"), 'Gwangju third-base selected sweep should include G');
  assert.ok(stadiumUxAuditSource.includes("'third-family-seats'"), 'Gwangju third-base selected sweep should include H');
  assert.ok(stadiumUxAuditSource.includes("'third-wheelchair-seats'"), 'Gwangju third-base selected sweep should include restored I');
  assert.ok(stadiumUxAuditSource.includes("'party-seats-third'"), 'Gwangju third-base selected sweep should include restored J');
  assert.ok(stadiumUxAuditSource.includes("'sky-picnic-L'"), 'Gwangju third-base selected sweep should include restored L');
  assert.ok(stadiumUxAuditSource.includes("'sky-picnic-s-335'"), 'Gwangju third-base selected sweep should include S-335');
  assert.ok(stadiumUxAuditSource.includes("'five-table-533'"), 'Gwangju third-base selected sweep should include 533');
  assert.ok(stadiumUxAuditSource.includes("'five-table-534'"), 'Gwangju third-base selected sweep should include 534');
  assert.ok(stadiumUxAuditSource.includes("'five-table-535'"), 'Gwangju third-base selected sweep should include 535');
  assert.equal(stadiumUxAuditSource.includes("'skybox-seats'"), false, 'Gwangju third-base selected sweep should not include removed K/skybox');
});

test('창원 trace review 스크립트는 117개 숫자 블록과 특수 선택 구역 검수 산출물을 고정한다', () => {
  const packageSource = readProjectFile('package.json');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const changwonSeatmapOpsSource = readProjectFile('scripts/changwon-seatmap-ops.mjs');
  const manifestSource = changwonSeatmapOpsSource;
  const uxReadinessSource = changwonSeatmapOpsSource;
  const changwonComponentSource = readProjectFile('src/components/changwon/ChangwonSeatMap.tsx');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(packageSource.includes('"stadium:changwon:trace-manifest"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs changwon trace-manifest'));
  assert.ok(packageSource.includes('"stadium:changwon:ux-readiness"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs changwon ux-readiness'));
  assert.ok(packageSource.includes('"qa:stadium:changwon:trace-review"'));
  assert.ok(packageSource.includes('node scripts/stadium-seatmap-ops.mjs changwon trace-review'));
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
  const prScopeGuardSource = readProjectFile('scripts/sajik-seatmap-editor-scope.mjs');
  const prScopeGuardSmokeSource = readProjectFile('scripts/sajik-seatmap-editor-scope.mjs');
  const stage01StagedScopeAuditSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01StagedScopeAuditSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const manifestSource = readProjectFile('scripts/sajik-seatmap-core-qa.mjs');
  const evidenceSource = readProjectFile('scripts/sajik-seatmap-core-qa.mjs');
  const zonePrecisionWorksetsSource = readProjectFile('scripts/sajik-seatmap-zone-precision-worksets.mjs');
  const stage01OperatorPackageSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01OperatorInputAidSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01ReviewBoardSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01NextActionPacketSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetReviewPacketSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetImageAnalysisSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetEntryTemplateReadinessSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetEntryPreflightSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetEntryPreflightSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetApprovalGateSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetApprovalGateSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01AllTargetApprovalReadinessSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01AllTargetApprovalReadinessSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01AllTargetApprovalInputGuideSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01AllTargetApprovalInputGuideSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01OperatorInputIntakeGateSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01OperatorInputIntakeGateSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01PrewriteSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01ApplyReadySource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01PostApplyAuditSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01OperatorStatusSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01ManualPatchPlanSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01RealApprovalReadinessSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01TargetApplyPrecheckSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01131ApplyPathStatusSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01PrewriteSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01ApprovedDryRunSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01AppliedDryRunSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01131LifecycleSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01ReadinessSummarySource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01ReadinessSummarySmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01CompletionGateSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01CompletionGateSmokeSource = readProjectFile('scripts/sajik-seatmap-stage01.mjs');
  const stage01HandoffSource = readProjectFile('docs/sajik-seatmap-stage01-handoff.md');
  const prPackagingInventorySource = readProjectFile('docs/sajik-seatmap-pr-packaging-inventory.md');
  const canonicalPrNotesSource = readProjectFile('docs/sajik-seatmap-canonical-pr-notes.md');
  const canonicalStagingRehearsalSource = readProjectFile('docs/sajik-seatmap-canonical-staging-rehearsal.md');
  const dataTestSource = readProjectFile('src/data/sajikSeatData.test.ts');
  const svgSource = readProjectFile('src/components/sajik/SajikSeatMapSvg.tsx');

  [
    'sajik-lotte-seatmap-official-2026.png',
    '`SAJIK_CANONICAL_2026`',
    '`BUSAN_SAJIK_2026_CANONICAL_OPERATOR_REFERENCE_V1`',
    '`src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`',
    '`src/data/sajikCanonicalSeatMap.ts`',
    'source tab 없이 `SAJIK_CANONICAL_2026` 한 벌만 렌더링한다',
    'active selectable blocks: `78`',
    'operator-only promoted sections: `322`, `323`, `921`',
    'legacy official-only alias blocks: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`',
    'canonical accessibility marker alias이며 `runtimePolygon=false`',
    'official-only 11개 블럭은 operator-reference trace가 생기기 전까지 `ALIAS_ONLY`',
    '`npm run stadium:sajik:block-source-duplication-audit`',
    '`active_polygon_source_per_block=1`',
    '`npm run qa:stadium:sajik:full`',
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
    '`reports/stadium/sajik-seatmap-pixel-components.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-review-board.svg`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-next-action-packet.md`',
    '`reports/stadium/sajik-stage01-operator/targets/131-review-packet.md`',
    '`reports/stadium/sajik-stage01-operator/targets/131-review-packet.svg`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-image-analysis-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-image-analysis-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-template-readiness-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-template-readiness-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`',
    '`reports/stadium/sajik-stage01-operator/targets/131-entry-preflight.json`',
    '`reports/stadium/sajik-stage01-operator/targets/131-entry-preflight.md`',
    '`reports/stadium/sajik-stage01-operator/targets/131-approval-gate.json`',
    '`reports/stadium/sajik-stage01-operator/targets/131-approval-gate.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-preflight-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-entry-preflight-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-approval-gate-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-target-approval-gate-smoke.md`',
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
    '`reports/stadium/sajik-stage01-operator/targets/131-apply-precheck.json`',
    '`reports/stadium/sajik-stage01-operator/targets/131-apply-precheck.md`',
    '`reports/stadium/sajik-stage01-operator/targets/131-apply-path-status.json`',
    '`reports/stadium/sajik-stage01-operator/targets/131-apply-path-status.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-prewrite-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.json`',
    '`reports/stadium/sajik-stage01-operator/dry-run/sajik-seatmap-stage01-approved-dry-run.md`',
    '`reports/stadium/sajik-stage01-operator/applied-dry-run/sajik-seatmap-stage01-applied-dry-run.json`',
    '`reports/stadium/sajik-stage01-operator/applied-dry-run/sajik-seatmap-stage01-applied-dry-run.md`',
    '`reports/stadium/sajik-stage01-operator/target-lifecycle-smoke/sajik-seatmap-stage01-131-lifecycle-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/target-lifecycle-smoke/sajik-seatmap-stage01-131-lifecycle-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-readiness-summary-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.csv`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input-intake-gate-smoke.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-completion-gate.md`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-staged-scope-audit-smoke.json`',
    '`reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-staged-scope-audit-smoke.md`',
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
    'npm run stadium:sajik:stage01-target-apply-precheck',
    'npm run stadium:sajik:stage01-131-apply-path-status',
    'npm run stadium:sajik:stage01-prewrite-smoke',
    'npm run stadium:sajik:stage01-approved-dry-run',
    'npm run stadium:sajik:stage01-applied-dry-run',
    'npm run stadium:sajik:stage01-131-lifecycle-smoke',
    'npm run stadium:sajik:stage01-next-action-packet',
    'npm run stadium:sajik:stage01-target-review-packet',
    'npm run stadium:sajik:stage01-target-image-analysis-smoke',
    'npm run stadium:sajik:stage01-target-entry-template-readiness-smoke',
    'npm run stadium:sajik:stage01-target-entry-preflight',
    'npm run stadium:sajik:stage01-target-entry-preflight-smoke',
    'npm run stadium:sajik:stage01-target-approval-gate',
    'npm run stadium:sajik:stage01-target-approval-gate-smoke',
    'npm run stadium:sajik:stage01-operator-input-intake-gate',
    'npm run stadium:sajik:stage01-operator-input-intake-gate-smoke',
    'npm run stadium:sajik:stage01-131-lifecycle-smoke',
    'npm run stadium:sajik:stage01-readiness-summary',
    'npm run stadium:sajik:stage01-readiness-summary-smoke',
    'npm run stadium:sajik:stage01-completion-gate',
    'npm run stadium:sajik:stage01-completion-gate-smoke',
    'npm run stadium:sajik:stage01-staged-scope-audit-smoke',
    'npm run stadium:sajik:stage01-staged-scope-audit:complete',
    'npm run stadium:sajik:marker-transition-review',
    'node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts',
    'node --import tsx --test --test-name-pattern "사직|Sajik" src/components/StadiumGuideRuntimeSeatMaps.test.ts',
    'npm run qa:stadium:sajik:trace-review',
    'npm run stadium:sajik:pr-scope-guard',
    'npm run stadium:sajik:pr-scope-guard-smoke',
    'npm run build',
    '## Canonical QA Evidence Summary',
    'generated QA report files stay out of the PR payload',
    '`reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`',
    '`output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`',
    'build reports `reports/bundle-guard-report.json` and `reports/dist-assets-report.json` are regenerated evidence and stay unstaged',
    'generated report 원문은 복사하지 않는다',
    'docs/sajik-seatmap-editor-v18-roadmap.md',
    'Editor v1.8 구현은 이번 release lock에 포함하지 않는다.',
    'PR scope guard는 `doesNotRunGitAdd=true`, `safeToRunBulkGitAdd=false` 상태를 유지해야 하며',
    'PR scope guard report는 `stagingManifest`와 `stage01PartialReadinessGate`를 포함해야 하며 `releasePayloadFileCount=17`',
    '`historicalReferenceFileCount=17`',
    'PR scope guard의 `stage01PartialScopeGate`는 `npm run stadium:sajik:stage01-pr-scope-guard`',
    '`executionMode`, `commandExitCode`, `commandExitSummary`',
    '`stage01PartialStagingVerdict=ready-for-partial-stage01-staging`',
    '`partialVerificationAfterStaging`',
    '`fullReleaseVerificationAfterStaging`',
    '`fullReleaseStatus=passed`와 `stage01PartialScopeStatus=passed`를 동시에 표현',
    '`stage01PartialScopeStatus=passed`이면 `--stage01-partial` guard exit code는 `0`',
    '`fullReleaseRun`과 `partialRun` snapshot',
    'next-action packet',
    'target review packet',
    'target image-analysis smoke',
    'target entry template readiness smoke',
    'target entry preflight',
    'target entry preflight smoke',
    'target approval gate',
    'target approval smoke',
    'target apply precheck',
    '`nextOperatorSectionId=131`',
    'PR scope guard report는 `Untracked Included Files` 섹션을 별도로 출력해야 한다.',
    '`manual whole-file review`',
    '`stage01ReadinessAvailable=true`',
    'Stage 01 operator input template은 `packageVersion=SAJIK_STAGE01_OPERATOR_PACKAGE_V1`',
    'Pixel candidate path는 evidence-only이며 operator 승인 없이 `correctedPath`로 복사하면 안 된다.',
    '`Official PNG Image Analysis`',
    '`SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1`',
    '`SAJIK_STAGE01_TARGET_ENTRY_TEMPLATE_READINESS_SMOKE_V1`',
    '`officialImageVerified=true`',
    'PNG 3종 `560x440`',
    '`approvedRequiredFields=7`',
    '`operatorInputRows=16`',
    '`OPERATOR_INPUT_ROW_COUNT_CHANGED`',
    'Stage 01 decision downstream matrix는 `PENDING -> waiting-for-operator`',
    'Stage 01 manual source patch procedure는 `beforeFingerprint` baseline 확인 후',
    'forbidden staging commands',
    '`SAJIK_OFFICIAL_TRACE_REFERENCE`의 `expectedPointCount` 또는 `expectedArea`가 현재 path와 다르다.',
    '모바일 390에서 `723` path 중심 클릭이 zoom control 배경에 가로채인다.',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    '`cases=26/26 operatorPackagePreservationPassed=true preservationStatus=preserved productionDataChanged=false`',
    '`approved-pixel-candidate-copy-note-row` fixture warns `OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW`',
    '`cases=27/27`',
    '`stage01PartialScope=passed`',
    '`stage01PartialExit=0`',
    '`fullReleaseRun.exitCode=0`',
    '`partialRun.exitCode=0`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`',
    '`stage01PartialStagingVerdict=ready-for-partial-stage01-staging`',
    '`partialVerificationAfterStaging`',
    '`fullReleaseVerificationAfterStaging`',
	    '`separate=<runtime>`',
    'clean official PNG/operator-reference/stage01 evidence is tracked in `historicalReferenceFiles`',
    '`releasePayloadFileCount=17`',
    '`historicalReferenceFileCount=17`',
    '`npm run stadium:sajik:stage01-staged-scope-audit-smoke`: PASS, `cases=7/7`, `expectedStage01PartialTargetFileCount=40`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    '`npm run stadium:sajik:stage01-target-image-analysis-smoke`: PASS, `target=131`, `crop=615 433 140 110`, `pngSize=560x440`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    '`npm run stadium:sajik:stage01-target-entry-template-readiness-smoke`: PASS, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `approvedRequiredFields=7`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    '`npm run stadium:sajik:stage01-target-apply-precheck`: PASS, `status=waiting-for-operator target=131 decision=PENDING readyForPrewrite=false manualPatchRequired=false targetApplied=false sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`',
    '`npm run stadium:sajik:stage01-131-apply-path-status`: PASS, `status=waiting-for-operator target=131 decision=PENDING editableFieldsBlank=true readyForPrewrite=false manualPatchRequired=false lifecycleFixtureReady=true officialPngEvidenceReady=true approvalInputChecklistReady=true sourceDataWritePerformed=false writesOperatorInput=false writesProductionData=false`',
    '`npm run stadium:sajik:stage01-completion-gate-smoke`: PASS',
    '`npm run stadium:sajik:stage01-staged-scope-audit:complete`',
    '20 target-approval fixture cases passed, including placeholder reviewer/timestamp blockers and keep-current no-patch prewrite linkage',
    '`approved-pixel-candidate-copy-note-row`',
    '`package-image-priority-drift`',
    '`operator-input-image-priority-drift`',
    '`node --import tsx --test src/data/sajikSeatData.test.ts src/components/sajik/SajikSeatMap.test.ts` (`24/24`)',
    '`SAJIK_CANONICAL_2026`',
    'docs/sajik-seatmap-canonical-pr-notes.md',
    'docs/sajik-seatmap-canonical-staging-rehearsal.md',
    '`src/data/sajikCanonicalSeatMap.ts`',
    'canonical image: `src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp`',
    'runtime blocks: `78` active selectable seat sections',
    'promoted operator-only blocks: `322`, `323`, `921`',
    'legacy official-only alias blocks: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`',
    'wheelchair official pseudo-blocks are marker aliases only',
    '`npm run stadium:sajik:block-source-duplication-audit`: PASS',
    '`npm run qa:stadium:sajik:full`: PASS',
    '`37/37`',
    'QA Evidence Summary:',
    'generated QA report files stay out of the PR payload',
    '`reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`',
    '`output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`',
    'generated report 원문은 복사하지 않는다',
  ].forEach((requiredText) => {
    assert.ok(prPackagingInventorySource.includes(requiredText), `Sajik PR packaging inventory should include ${requiredText}`);
  });
  [
    '`SAJIK_CANONICAL_2026`',
    'active selectable seat sections: `78`',
    'legacy official-only aliases: `935`, `013`, `012`, `011`, `914`, `913`, `912`, `911`, `903`, `902`, `901`',
    'Do not copy official PNG coordinates into runtime as a fallback.',
    'permanent alias-only candidates',
    '`npm run stadium:sajik:block-source-duplication-audit`: PASS',
    '`env VITE_SITE_URL=http://localhost:5176 VITE_API_BASE_URL=http://localhost:8080 npm run build`: PASS',
    '## QA Evidence Summary',
    'generated QA report files stay out of the PR payload',
    '`reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`',
    '`output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`',
    '`reports/bundle-guard-report.json`',
  ].forEach((requiredText) => {
    assert.ok(canonicalPrNotesSource.includes(requiredText), `Sajik canonical PR notes should include ${requiredText}`);
  });
  [
    'canonical payload file count: `17`',
    'historical reference file count: `17`',
    'patch separation: `review-required`',
    'safe bulk staging: `false`',
    '`docs/sajik-seatmap-canonical-staging-rehearsal.md`',
    '`scripts/sajik-seatmap-block-source-duplication-audit.mjs`',
    '`src/data/sajikCanonicalSeatMap.ts`',
    'Do not stage these by default:',
    '`git add .`',
    '`package.json`',
    '`scripts/stadium-seatmap-ops.mjs`',
    '`scripts/stadium-ux-audit.mjs`',
    '## Review Results',
    '`reviewed-ok`',
    '`hunk-only-required`',
    'git add executed: `false`',
    'actual git index changed: `false`',
    'exclude Gwangju/Daegu package scripts',
    'include Sajik canonical overlay verification hunks',
    'Reviewed at: `2026-05-26 KST`',
    'The 17 historical reference files stay available for audit evidence.',
    '`npm run stadium:sajik:pr-scope-guard-smoke`',
    '`reports/stadium/sajik-seatmap-*.csv`',
    '## Post-Staging Status',
    'staged payload files: `17`',
    'shared hunk files staged with Sajik-only hunks: `4`',
    'generated QA report files staged: `false`',
    'remaining mixed-worktree hunks are separate Gwangju/Daegu/Mate/shared workstreams',
    '## QA Evidence Summary',
    '`reports/stadium/sajik-seatmap-block-source-duplication-audit.{json,csv,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard.{json,md}`',
    '`reports/stadium/sajik-seatmap-pr-scope-guard-smoke.{json,md}`',
    '`output/playwright/stadium-ux-sajik-full/stadium-mobile-smoke-summary.md`',
    'generated report 원문은 복사하지 않는다',
  ].forEach((requiredText) => {
    assert.ok(canonicalStagingRehearsalSource.includes(requiredText), `Sajik canonical staging rehearsal should include ${requiredText}`);
  });
  [
    'cases=18/18',
    'cases=13/13',
    '(`23/23`)',
    '포함 파일 수는 39개',
  ].forEach((staleText) => {
    assert.ok(!prPackagingInventorySource.includes(staleText), `Sajik PR packaging inventory should not include stale contract ${staleText}`);
  });

  [
    '"stadium:sajik:pixel-components": "node scripts/stadium-seatmap-ops.mjs sajik pixel-components"',
    '"stadium:sajik:alignment-audit": "node scripts/stadium-seatmap-ops.mjs sajik alignment-audit"',
    '"stadium:sajik:trace-manifest": "node scripts/stadium-seatmap-ops.mjs sajik trace-manifest"',
    '"stadium:sajik:dataset-export": "node --import tsx scripts/sajik-seatmap-export-dataset.mjs"',
    '"stadium:sajik:source-audit": "node scripts/sajik-seatmap-source-audit.mjs"',
    '"stadium:sajik:block-source-duplication-audit": "node scripts/stadium-seatmap-ops.mjs sajik block-source-duplication-audit"',
    '"stadium:sajik:editor-regression": "node scripts/stadium-seatmap-ops.mjs sajik editor-regression"',
    '"stadium:sajik:marker-transition-review": "node scripts/stadium-seatmap-ops.mjs sajik marker-transition-review"',
    '"stadium:sajik:pr-scope-guard": "node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard"',
    '"stadium:sajik:pr-scope-guard-smoke": "node scripts/stadium-seatmap-ops.mjs sajik pr-scope-guard-smoke"',
    '"qa:stadium:sajik:full": "node scripts/stadium-seatmap-ops.mjs sajik full"',
    '"qa:stadium:sajik:release-lock": "node scripts/stadium-seatmap-ops.mjs sajik release-lock"',
    '"qa:stadium:sajik:mobile": "node scripts/stadium-seatmap-ops.mjs sajik mobile"',
    '"stadium:sajik:status": "node scripts/stadium-seatmap-ops.mjs sajik status"',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `package script should include ${requiredText}`);
  });

  [
    '"stadium:sajik:stage01-',
    '"qa:stadium:sajik:stage01-',
    '"stadium:sajik:operator-reference-',
    '"qa:stadium:sajik:operator-reference-',
    '"qa:stadium:sajik:polygon-v2"',
    '"qa:stadium:sajik:trace-review"',
  ].forEach((removedText) => {
    assert.ok(!packageSource.includes(removedText), `package script should not expose historical Sajik command ${removedText}`);
  });

  [
    'stage01PartialReadinessGate',
    'stage01PartialScopeGate',
    'stage01PartialScopeStatus',
    'stage01PartialStagingVerdict',
    'partialVerificationAfterStaging',
    'fullReleaseVerificationAfterStaging',
    'ready-for-partial-stage01-staging',
    'blocked-by-unexpected-files',
    'blocked-by-unexpected-included-files',
    'blocked-by-absent-expected-files',
    'blocked-by-readiness-unavailable',
    'fullReleaseStatus',
    'executionMode',
    'commandExitCode',
    'commandExitSummary',
    'isStage01PartialMode',
    'npm run stadium:sajik:stage01-pr-scope-guard',
    '--stage01-partial',
    'STAGE01_PARTIAL_MISSING_EXPECTED_FILE',
    'No Stage 01 partial scope blockers.',
    'scripts/sajik-seatmap-editor-scope.mjs',
    'stadium:sajik:pr-scope-guard-smoke',    'scripts/sajik-seatmap-stage01.mjs',
    'stage01ReadinessAvailable',
    'npm run qa:stadium:sajik:stage01-readiness',
    'npm run stadium:sajik:stage01-target-review-packet',
    'npm run stadium:sajik:stage01-target-image-analysis-smoke',
    'npm run stadium:sajik:stage01-all-target-review-packets',
    'npm run stadium:sajik:stage01-all-target-image-analysis-smoke',
    'npm run stadium:sajik:stage01-target-entry-template-readiness-smoke',
    'npm run stadium:sajik:stage01-target-entry-preflight',
    'npm run stadium:sajik:stage01-target-entry-preflight-smoke',
    'npm run stadium:sajik:stage01-target-approval-gate',
    'npm run stadium:sajik:stage01-target-approval-gate-smoke',
    'npm run stadium:sajik:stage01-all-target-approval-readiness',
    'npm run stadium:sajik:stage01-all-target-approval-readiness-smoke',
    'npm run stadium:sajik:stage01-all-target-approval-input-guide',
    'npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke',
    'npm run stadium:sajik:stage01-operator-input-intake-gate',
    'npm run stadium:sajik:stage01-operator-input-intake-gate-smoke',
    'npm run stadium:sajik:stage01-target-apply-precheck',
    'npm run stadium:sajik:stage01-131-apply-path-status',
    'npm run stadium:sajik:stage01-readiness-summary',
    'npm run stadium:sajik:stage01-readiness-summary-smoke',
    'npm run stadium:sajik:stage01-completion-gate',
    'npm run stadium:sajik:stage01-completion-gate-smoke',
    'npm run stadium:sajik:stage01-staged-scope-audit-smoke',
    'npm run stadium:sajik:stage01-staged-scope-audit-smoke',
    'doesNotRunPrScopeGuard',
    'doesNotRunEditorRegression',
    'doesNotRunBuild',
    'doesNotReplaceFullReleaseGate',
    'fullReleaseBlockerMeaning',
    'clean historical reference files are not blockers',
    'target image-analysis smoke, all-target official PNG review packets, all-target image-analysis smoke, target entry template readiness smoke, target entry preflight, target entry preflight smoke, target approval gate, target approval smoke, all-target approval readiness, all-target approval readiness smoke, all-target approval input guide, all-target approval input guide smoke, operator input intake gate, intake gate smoke, target apply precheck, 131 apply path status, readiness summary, summary smoke, Stage 01 completion gate, completion gate smoke, and staged scope audit smoke',
    '131 lifecycle smoke',
	    'home-card-ui',
	    'src/components/home/TeamRankRow.tsx',
	    'shared-notification-ui',
	    'src/components/ui/sonner.tsx',
	    'src/shims/sonner.tsx',
	    'prediction-files',
    'mate-files',
    'src/components/MateMobileDateFilter.tsx',
    'shared-styles',
    'assistant-local-config',
    'shared-layout-chatbot-ui',
    'missingExpectedIncludedFileDetails',
    'clean-full-release-payload',
    'absent-from-worktree',
    'Expected for the full Sajik release payload, but not dirty in the current partial Stage 01 worktree.',
    '## Missing Expected Included Files',
    'For partial Stage 01 changes, run npm run qa:stadium:sajik:stage01-readiness',
  ].forEach((requiredText) => {
    assert.ok(prScopeGuardSource.includes(requiredText), `Sajik PR scope guard should include ${requiredText}`);
  });

  [
    'sajik-seatmap-pr-scope-guard.json',
    'sajik-seatmap-pr-scope-guard.md',
    'sajik-seatmap-pr-scope-guard-smoke.json',
    'sajik-seatmap-pr-scope-guard-smoke.md',
    'fullReleaseRun.executionMode must be full-release',
    'partialRun.executionMode must be stage01-partial',
    'fullReleaseRun.exitCode must match commandExitCode',
    'partialRun.exitCode must match commandExitCode',
    'fullReleaseRun command summary must mirror exit code',
    'partialRun command summary must mirror exit code',
    'latest report snapshot must be from stage01-partial executionMode',
    'scope guard report must include commandExitCode',
    'commandExitSummary must preserve full release exit code',
    'commandExitSummary must preserve stage01 partial exit code',
    'stage01PartialStagingVerdict must be ready-for-partial-stage01-staging',
    'partialVerificationAfterStaging must include partial readiness gate',
    'partialVerificationAfterStaging must not include full release gate',
    'fullReleaseVerificationAfterStaging must include full release gate',
    'fullReleaseVerificationAfterStaging must not include partial readiness gate',
    'markdown must include Partial Verification After Staging section',
    'markdown must include Full Release Verification After Staging section',
    'scope_guard_smoke_json',
    'scope_guard_smoke_markdown',
    'fullReleaseRun',
    'partialRun',
    'partial run staging verdict',
    'stage01PartialReadinessGate',
    'stage01PartialScopeGate',
    'stage01PartialScopeStatus',
    'fullReleaseStatus must be passed or blocked',
    'stage01PartialScopeStatus must be passed or blocked',
    'top-level status must match fullReleaseStatus',
    'stage01 partial scope command mismatch',
    'stage01 partial mode argument mismatch',
    'stage01 partial scope pass criteria must require zero missing canonical payload files',
    'stage01 partial scope guard exit must match partial status',
    'passed stage01 partial scope must have zero blockers',
    '## Stage 01 Partial Scope Status',
    'markdown must include Stage 01 Partial Scope Status section',
    'npm run stadium:sajik:stage01-pr-scope-guard',
    'releasePayloadFileCount === 17',
    'expectedIncludedFiles must contain 17 release payload files',
    'historicalReferenceFileCount must be 17',
    'historicalReferenceFiles must contain 17 historical reference files',
    'historical reference file must not be marked as production source',
    'expected included files must exist on disk',
    'scope guard smoke expects zero unexpected dirty files in the Sajik PR inventory',
    'missing expected included file details must mirror missing expected included files',
    'missing expected detail must be part of expectedIncludedFiles',
    'missing expected detail must include existsOnDisk',
    'missing expected detail must include a known classification',
    'missing expected detail must explain full release payload meaning',
    '## Missing Expected Included Files',
    'markdown must include Missing Expected Included Files section',
    '## Historical Reference Files',
    'markdown must include Historical Reference Files section',
    'clean-full-release-payload',
    'untracked included file must be part of expectedIncludedFiles',
    'untracked included file must be represented as a review-required reason',
    'untracked included review rows must mirror untracked included files',
    'untracked included review row must be expected payload',
    'untracked included review row must require manual review',
    'untracked included review row must not be treated as unexpected',
    'untracked included review row must explain whole-file review',
    '### Untracked Included Files',
    'markdown must include Untracked Included Files section',
    'markdown must describe manual whole-file review for untracked included files',
    'UNTRACKED_INCLUDED_FILE:${entry.file}',
    'stage01SummaryScriptFiles',
    'stage01SummaryPackageScripts',    'scripts/sajik-seatmap-stage01.mjs',
    'Stage 01 summary script must exist on disk',
    'package script ${scriptName} must point to ${expectedCommand}',
    'stage01ReadinessAvailable',
    'doesNotRunPrScopeGuard',
    'doesNotRunEditorRegression',
    'doesNotRunBuild',
    'doesNotReplaceFullReleaseGate',
    'npm run qa:stadium:sajik:stage01-readiness',
    'npm run stadium:sajik:stage01-next-action-packet',
    'npm run stadium:sajik:stage01-target-review-packet',
    'npm run stadium:sajik:stage01-target-image-analysis-smoke',
    'npm run stadium:sajik:stage01-all-target-review-packets',
    'npm run stadium:sajik:stage01-all-target-image-analysis-smoke',
    'npm run stadium:sajik:stage01-target-entry-template-readiness-smoke',
    'npm run stadium:sajik:stage01-target-entry-preflight',
    'npm run stadium:sajik:stage01-target-entry-preflight-smoke',
    'npm run stadium:sajik:stage01-target-approval-gate',
    'npm run stadium:sajik:stage01-target-approval-gate-smoke',
    'npm run stadium:sajik:stage01-all-target-approval-readiness',
    'npm run stadium:sajik:stage01-all-target-approval-readiness-smoke',
    'npm run stadium:sajik:stage01-all-target-approval-input-guide',
    'npm run stadium:sajik:stage01-all-target-approval-input-guide-smoke',
    'npm run stadium:sajik:stage01-target-apply-precheck',
    'npm run stadium:sajik:stage01-131-apply-path-status',
    'npm run stadium:sajik:stage01-readiness-summary',
    'npm run stadium:sajik:stage01-readiness-summary-smoke',
    'npm run stadium:sajik:stage01-completion-gate',
    'npm run stadium:sajik:stage01-completion-gate-smoke',
    'npm run qa:stadium:sajik:polygon-v2',
    'status:passed guardStatus=',
    'stage01PartialScope=',
    'stage01PartialExit=',
  ].forEach((requiredText) => {
    assert.ok(prScopeGuardSmokeSource.includes(requiredText), `Sajik PR scope guard smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_STAGED_SCOPE_AUDIT_V1',
    'EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT = 40',
    'SOURCE_INCLUDED_FILE_COUNT_CHANGED',
    'TARGET_FILE_COUNT_CHANGED',
    'stagedScopeAudit.expectedStage01PartialTargetFileCount',
    '--source-report',
    '--staged-entries',
    '--output-dir',
    'fixtureMode',
    'stagingRemediation',
    'operator-manual-index-cleanup',
    'stagedFilesToUnstage',
    'stagedFilesToUnstageWithReasons',
    'OUTSIDE_STAGE01_TARGET',
    'SEPARATE_DIRTY_WORK',
    'UNEXPECTED_DIRTY_FILE',
    'DELETED_STAGE01_TARGET',
    'stagedFilesToKeep',
    'stagedManualHunkReviewFiles',
    'doesNotRunGitCommands',
    'Staging Remediation',
    'git diff',
    '--cached',
    'safeToRunBulkGitAdd=false',
    'git add .',
    'git add -A',
    'git commit -am',
  ].forEach((requiredText) => {
    assert.ok(stage01StagedScopeAuditSource.includes(requiredText), `Sajik Stage 01 staged scope audit should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_STAGED_SCOPE_AUDIT_SMOKE_V1',
    'scripts/sajik-seatmap-stage01.mjs',
    'EXPECTED_STAGE01_PARTIAL_TARGET_FILE_COUNT = 40',
    'sajik-seatmap-stage01-staged-scope-audit-smoke.json',
    'sajik-seatmap-stage01-staged-scope-audit-smoke.md',
    'staged-scope-audit-smoke',
    'partial-target-subset-passes',
    'complete-target-set-passes',
    'complete-mode-missing-target-blocks',
    'outside-file-blocks',
    'separate-work-blocks',
    'deleted-target-blocks',
    'source-count-drift-blocks',
    'STAGED_TARGET_COUNT_INCOMPLETE:39/40',
    'STAGED_FILE_OUTSIDE_STAGE01_TARGETS:src/data/sajikSeatData.ts',
    'STAGED_SEPARATE_DIRTY_WORK:src/data/gwangjuSeatData.ts',
    'STAGED_STAGE01_TARGET_DELETED:scripts/sajik-seatmap-stage01.mjs',
    'SOURCE_INCLUDED_FILE_COUNT_CHANGED:32',
    'REMEDIATION_RUNS_GIT_COMMANDS',
    'REMEDIATION_ACTION_MODE_CHANGED',
    'MISSING_UNSTAGE_FILE',
    'MISSING_UNSTAGE_REASON',
    'UNEXPECTED_UNSTAGE_FILES',
    'expectedUnstageFiles',
    'expectedUnstageReasons',
    'stagedFilesToUnstage',
    'stagedFilesToUnstageWithReasons',
    'OUTSIDE_STAGE01_TARGET',
    'SEPARATE_DIRTY_WORK',
    'DELETED_STAGE01_TARGET',
    '--source-report',
    '--staged-entries',
    '--output-dir',
    'git add',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'cases=${report.passedCases}/${report.totalCases}',
  ].forEach((requiredText) => {
    assert.ok(
      stage01StagedScopeAuditSmokeSource.includes(requiredText),
      `Sajik Stage 01 staged scope audit smoke should include ${requiredText}`,
    );
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
    'sajik-seatmap-pixel-components.json',
    'PIXEL_COMPONENT_TOTAL_BLOCKS',
    'STAGE01_PIXEL_COMPONENT_NOT_READY',
    'imageAnalysisMetadataRegenerated',
    'imageCandidateReferenceOnly',
    'imageAnalysisPriorityOrder',
    'imagePriorityRank',
    'imageRiskLevel',
    'imageRiskReasons',
    'imageComponentArea',
    'imagePathColorCoverageRatio',
    'imageBbox',
    '131 -> 032 -> 135 -> 132 -> 031 -> 133 -> 022 -> 143 -> 134 -> 142 -> 121 -> 124 -> 125 -> 122 -> 021 -> 123',
    'Pixel candidate paths are never copied into correctedPath by this package.',
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
    'CORRECTED_PATH_REUSES_CURRENT_HIT_PATH',
    'CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH',
    'CORRECTED_POINT_COUNT_TOO_HIGH',
    'CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE',
    'CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE',
    'CORRECTED_LABEL_NEAR_BOUNDARY',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'Image-analysis metadata is advisory only',
    'imagePriorityRank',
    'imageRiskLevel',
    'imageRiskReasons',
    'areaRatioVsCurrentHit',
    'boundsMaxAbsDelta',
    'labelBoundaryDistance',
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
    'sajik-seatmap-pixel-components.json',
    'Official PNG Image Analysis',
    'imageAnalysisPriorityRows',
    'candidateReferenceOnly',
    'Pixel component paths are evidence for operator review only',
    'must not be copied into correctedPath',
    'STAGE01_PIXEL_COMPONENT_NOT_READY',
    'SMALL_OFFICIAL_PIXEL_COMPONENT',
    'LOW_PATH_COLOR_COVERAGE',
    'OFFICIAL_COMPONENT_OUTSIDE_PATH_DISTANCE',
    'blue dashed=PNG pixel evidence only',
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
    'SAJIK_STAGE01_NEXT_ACTION_PACKET_V1',
    'SAJIK_STAGE01_OPERATOR_INPUT_AID_V1',
    'SAJIK_STAGE01_REVIEW_BOARD_V1',
    'EXPECTED_STAGE01_ROWS = 16',
    'EXPECTED_PRIORITY_ORDER',
    'sajik-seatmap-stage01-next-action-packet.json',
    'sajik-seatmap-stage01-next-action-packet.csv',
    'sajik-seatmap-stage01-next-action-packet.md',
    'operator-provided official 2026 Sajik PNG coordinates only',
    'pixel candidate path copy without operator approval',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'nextOperatorSectionId',
    'imagePriorityRank',
    'imageRiskLevel',
    'READY_FOR_PREWRITE',
    'FILL_OR_DECIDE',
    'productionWriteAllowed: false',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
  ].forEach((requiredText) => {
    assert.ok(stage01NextActionPacketSource.includes(requiredText), `Sajik Stage 01 next-action packet should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',
    'SAJIK_STAGE01_ALL_TARGET_REVIEW_PACKETS_V1',
    'SAJIK_STAGE01_NEXT_ACTION_PACKET_V1',
    'SAJIK_STAGE01_REVIEW_BOARD_V1',
    'STAGE01_IMAGE_PRIORITY_SECTION_IDS',
    '--all-stage01-targets',
    '--allow-any-stage01-target',
    'all-stage01-official-png-review',
    'stage01_all_target_review_packets_json',
    'sajik-seatmap-stage01-all-target-review-packets.json',
    "DEFAULT_TARGET_SECTION_ID = '131'",
    'OFFICIAL_IMAGE_SHA256',
    'MAP_VERSION',
    'sajik-seatmap-stage01.mjs',
    '131-review-packet.json',
    '131-review-packet.md',
    '131-review-packet.svg',
    '131-official-crop.png',
    '131-official-overlay-crop.png',
    '131-official-edge-crop.png',
    '131-entry-template.json',
    '131-entry-template.csv',
    'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1',
    'TARGET_IMAGE_ANALYSIS_VERSION',
    'writeImageAnalysisArtifacts',
    'officialPngImageAnalysisArtifacts',
    'targetImageAnalysisArtifactsGenerated',
    'sourceImageVerified',
    'Do not infer coordinates from the edge crop alone.',
    'TARGET_DOES_NOT_MATCH_NEXT_OPERATOR_SECTION',
    'targetSectionId',
    'matchesNextOperatorSection',
    'targetSelectionMode',
    'operatorInputChecklist',
    'officialPngEvidence',
    'officialPngReviewRequired',
    'officialPngReviewAssertions',
    'primaryInputSource',
    'alternateInputSource',
    'sourceConflictRule',
    'sourceFieldPolicy',
    'writableSourceFields',
    'lockedSourceFields',
    'approvedEntryExample',
    '<operator traced official PNG path>',
    'allowedCoordinateSource',
    'operator-provided official 2026 Sajik PNG coordinates only',
    'pixel candidate path copy without operator approval',
    'AI coordinate prediction',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'It never modifies reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json',
    'Pixel candidate paths are reference-only and must not be copied into correctedPath without operator approval.',
    'official PNG crop viewBox',
    'Official PNG Image Analysis Artifacts',
    'These images are generated from the locked official PNG and are reference-only operator review aids.',
    'requiredReviewAssertions',
    'cannotAutoApproveReasons',
    'trace from official PNG; do not copy blue path',
    'currentHitPathArea',
    'targetViewport',
    'Required Human Actions',
    'readyForPrewriteCriteria',
    'Run npm run stadium:sajik:stage01-target-approval-gate before prewrite.',
    'REJECTED, NEEDS_RETRACE, and KEEP_CURRENT do not enter patch preview.',
  ].forEach((requiredText) => {
    assert.ok(stage01TargetReviewPacketSource.includes(requiredText), `Sajik Stage 01 target review packet should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_SMOKE_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',
    'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1',
    'SAJIK_STAGE01_ALL_TARGET_REVIEW_PACKETS_V1',
    'EXPECTED_STAGE01_TARGET_SECTION_IDS',
    '--all-stage01-targets',
    'sajik-seatmap-stage01-all-target-image-analysis-smoke.json',
    'sajik-seatmap-stage01-all-target-image-analysis-smoke.md',
    'sajik-seatmap-stage01-all-target-review-packets.json',
    'all-stage01-targets',
    'stage01_all_target_image_analysis_smoke_json',
    'all-target-report-version',
    'all-target-count',
    'all-target-section-order',
    "TARGET_SECTION_ID = '131'",
    "EXPECTED_CROP_VIEWBOX = '615 433 140 110'",
    'EXPECTED_PNG_WIDTH = 560',
    'EXPECTED_PNG_HEIGHT = 440',
    '131-review-packet.json',
    '131-official-crop.png',
    '131-official-overlay-crop.png',
    '131-official-edge-crop.png',
    'officialImageVerified',
    'sourceDataWritePerformed',
    'writesOperatorInput',
    'writesProductionData',
    'stage01_target_image_analysis_smoke_json',
    'stage01_target_image_analysis_smoke_markdown',
    'status:${report.status} target=${report.targetSectionId}',
  ].forEach((requiredText) => {
    assert.ok(
      stage01TargetImageAnalysisSmokeSource.includes(requiredText),
      `Sajik Stage 01 target image-analysis smoke should include ${requiredText}`,
    );
  });

  [
    'SAJIK_STAGE01_TARGET_ENTRY_TEMPLATE_READINESS_SMOKE_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',
    'SAJIK_STAGE01_TARGET_IMAGE_ANALYSIS_V1',
    "TARGET_SECTION_ID = '131'",
    "SOURCE_VIEWPORT = '615 433 140 110'",
    'EXPECTED_PNG_WIDTH = 560',
    'EXPECTED_PNG_HEIGHT = 440',
    '131-review-packet.json',
    '131-entry-template.json',
    '131-official-crop.png',
    '131-official-overlay-crop.png',
    '131-official-edge-crop.png',
    'TARGET_ENTRY_DECISION_NOT_PENDING',
    'APPROVED_REQUIRED_FIELDS',
    'TARGET_ENTRY_EDITABLE_FIELD_NOT_BLANK',
    'TARGET_ENTRY_LOCKED_FIELD_PRESENT',
    'TARGET_ENTRY_IMAGE_ANALYSIS_FORBIDDEN_USE_INCOMPLETE',
    'sourceDataWritePerformed',
    'writesOperatorInput',
    'writesProductionData',
    'stage01_target_entry_template_readiness_smoke_json',
    'status:${report.status} target=${report.targetSectionId}',
  ].forEach((requiredText) => {
    assert.ok(
      stage01TargetEntryTemplateReadinessSmokeSource.includes(requiredText),
      `Sajik Stage 01 target entry template readiness smoke should include ${requiredText}`,
    );
  });

  [
    'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    "DEFAULT_TARGET_SECTION_ID = '131'",
    'OFFICIAL_IMAGE_SHA256',
    'MAP_VERSION',
    'sajik-seatmap-stage01.mjs',
    '131-review-packet.json',
    '131-entry-template.json',
    'sajik-seatmap-stage01-operator-input.json',
    '131-entry-preflight.json',
    '131-entry-preflight.md',
    'TARGET_ENTRY_SOURCE_CONFLICT',
    'TARGET_ENTRY_LOCKED_FIELD_PRESENT',
    'OPERATOR_INPUT_LOCKED_FIELD_PRESENT',
    'PARTIAL_APPROVAL_INPUT_PATH_WITHOUT_LABEL',
    'PARTIAL_APPROVAL_INPUT_LABEL_WITHOUT_PATH',
    'APPROVAL_FIELD_REQUIRED',
    'APPROVAL_FIELD_INVALID_NUMBER',
    'REVIEWED_AT_INVALID_DATE',
    'CORRECTED_PATH_',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'ready-for-approval-gate',
    'waiting-for-operator',
    'selectedSource',
    'selectedDecision',
    'readyForApprovalGate',
    'nextCommand',
    'sourceComparison',
    'exactMatchRequiredWhenMultipleSourcesHaveEditableValues',
    'sourceFingerprintFields',
    'candidateReferenceOnly',
    'targetPreflightOnly',
    'operator-provided official 2026 Sajik PNG coordinates only',
    'pixel candidate path copy without operator approval',
    'AI coordinate prediction',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'This target entry preflight is read-only and never edits src/data/sajikSeatData.ts.',
    'It never modifies reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json.',
    'It blocks partial correctedPath/label input, source conflicts, invalid reviewedAt, locked field input, evidence drift, and malformed correctedPath values.',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
  ].forEach((requiredText) => {
    assert.ok(stage01TargetEntryPreflightSource.includes(requiredText), `Sajik Stage 01 target entry preflight should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_SMOKE_V1',
    'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    "TARGET_SECTION_ID = '131'",
    'OFFICIAL_IMAGE_SHA256',
    'MAP_VERSION',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01-target-entry-preflight-smoke.json',
    'sajik-seatmap-stage01-target-entry-preflight-smoke.md',
    'target-entry-preflight-smoke',
    'pending-no-input',
    'approved-valid-target-entry',
    'approved-missing-label',
    'path-only-pending',
    'label-only-pending',
    'operator-input-vs-target-entry-conflict',
    'invalid-reviewed-at',
    'locked-field-target-entry',
    'evidence-hash-drift',
    'pixel-candidate-copy-note-warning',
    'self-intersection-path',
    'locked-field-operator-input',
    'TARGET_ENTRY_SOURCE_CONFLICT',
    'TARGET_ENTRY_LOCKED_FIELD_PRESENT:visualPath',
    'OPERATOR_INPUT_LOCKED_FIELD_PRESENT:hitPath',
    'PARTIAL_APPROVAL_INPUT_PATH_WITHOUT_LABEL',
    'PARTIAL_APPROVAL_INPUT_LABEL_WITHOUT_PATH',
    'APPROVAL_FIELD_REQUIRED:target-entry-template:correctedLabelX',
    'REVIEWED_AT_INVALID_DATE',
    'TARGET_REVIEW_EVIDENCE_HASH_MISMATCH',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'CORRECTED_PATH_SELF_INTERSECTION',
    'sourceDataWritePerformed',
    'writesOperatorInput',
    'writesProductionData',
    'cases=${report.passedCases}/${report.totalCases}',
  ].forEach((requiredText) => {
    assert.ok(stage01TargetEntryPreflightSmokeSource.includes(requiredText), `Sajik Stage 01 target entry preflight smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1',
    'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',
    'SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    "DEFAULT_TARGET_SECTION_ID = '131'",
    'OFFICIAL_IMAGE_SHA256',
    'MAP_VERSION',
    'sajik-seatmap-stage01.mjs',
    '131-review-packet.json',
    '131-entry-preflight.json',
    '131-entry-template.json',
    'sajik-seatmap-stage01-operator-input.json',
    '131-approval-gate.json',
    '131-approval-gate.md',
    'TARGET_APPROVAL_SOURCE_CONFLICT',
    'target-entry-template',
    'operator-input',
    'targetEntryPreflight',
    'targetEntryPreflightStatus',
    'targetEntryPreflightReadyForApprovalGate',
    'targetEntryPreflightSelectedSource',
    'targetEntryPreflightSelectedDecision',
    'selectedSource',
    'selectedDecision',
    'readyForPrewrite',
    'ready-for-prewrite',
    'waiting-for-operator',
    'sourceComparison',
    'preflightContract',
    'reviewEvidenceContract',
    'approvalFingerprint',
    'exactMatchRequiredWhenMultipleSourcesHaveEditableValues',
    'sourceFingerprintFields',
    'prewriteContract',
    'PREWRITE_COMMAND_CHAIN',
    'TARGET_SOURCE_FILE',
    'src/data/sajikSeatData.ts',
    'TARGET_ENTRY_PREFLIGHT_MISSING',
    'TARGET_ENTRY_PREFLIGHT_STALE',
    'TARGET_ENTRY_PREFLIGHT_SECTION_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_WRITE_FLAGS_NOT_FALSE',
    'TARGET_ENTRY_PREFLIGHT_READY_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_SOURCE_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_DECISION_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_NOT_READY_FOR_APPROVAL_GATE',
    'TARGET_REVIEW_EVIDENCE_VERSION_MISMATCH',
    'TARGET_REVIEW_OFFICIAL_IMAGE_SHA256_MISMATCH',
    'TARGET_REVIEW_PIXEL_COMPONENT_NOT_REFERENCE_ONLY',
    'WRITABLE_SOURCE_FIELDS',
    'LOCKED_SOURCE_FIELDS',
    'manualPatchAllowedOnlyAfter',
    'MANUAL_PATCH_REQUIRED',
    'candidateReferenceOnly',
    'APPROVAL_FIELD_REQUIRED:correctedPath',
    'REQUIRED_KEEP_CURRENT_FIELDS',
    'FORBIDDEN_KEEP_CURRENT_FIELDS',
    'OPERATOR_PLACEHOLDER_NOT_REPLACED',
    'KEEP_CURRENT_FIELD_REQUIRED',
    'KEEP_CURRENT_ROW_HAS_COORDINATE_FIELDS',
    'keepCurrentReviewRequiredFields',
    'keepCurrentForbiddenFields',
    'APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX',
    'CORRECTED_PATH_REUSES_CURRENT_HIT_PATH',
    'CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE',
    'imageCoordinateValidation',
    'correctedPathWithinViewBox',
    'correctedPathSelfIntersectionFree',
    'labelInsideOrWithinTolerance',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'allowedCoordinateSource',
    'operator-provided official 2026 Sajik PNG coordinates only',
    'pixel candidate path copy without operator approval',
    'AI coordinate prediction',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'sourceDataWritePerformed: false',
    'It never modifies reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json',
    'It reads the generated 131 target review packet, target entry preflight, and operator-provided approval input, then emits approval readiness only.',
    'It requires targets/131-entry-preflight.json to be fresh and ready-for-approval-gate before any selected input can become ready-for-prewrite.',
    'Pixel candidate paths are reference-only and must not be copied into correctedPath without operator approval.',
  ].forEach((requiredText) => {
    assert.ok(stage01TargetApprovalGateSource.includes(requiredText), `Sajik Stage 01 target approval gate should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_ALL_TARGET_APPROVAL_READINESS_V1',
    'EXPECTED_STAGE01_TARGET_SECTION_IDS',
    'sajik-seatmap-stage01-all-target-approval-readiness.json',
    'sajik-seatmap-stage01-all-target-approval-readiness.csv',
    'sajik-seatmap-stage01-all-target-approval-readiness.md',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    '--target',
    '--allow-any-stage01-target',
    'readyForApprovalGateCount',
    'readyForPrewriteCount',
    'operatorApprovedCoordinatesRequired',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'stage01_all_target_approval_readiness_json',
    'status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount}',
  ].forEach((requiredText) => {
    assert.ok(stage01AllTargetApprovalReadinessSource.includes(requiredText), `Sajik Stage 01 all-target approval readiness should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_ALL_TARGET_APPROVAL_READINESS_SMOKE_V1',
    'SAJIK_STAGE01_ALL_TARGET_APPROVAL_READINESS_V1',
    'EXPECTED_STAGE01_TARGET_SECTION_IDS',
    'sajik-seatmap-stage01-all-target-approval-readiness.json',
    'sajik-seatmap-stage01-all-target-approval-readiness-smoke.json',
    'sajik-seatmap-stage01-all-target-approval-readiness-smoke.md',
    'NEXT_OPERATOR_SECTION_NOT_ONLY_131',
    'ROW_BLOCKERS_PRESENT',
    'ALLOW_ANY_STAGE01_TARGET_NOT_TRUE_FOR_ALL_ROWS',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'stage01_all_target_approval_readiness_smoke_json',
    'status:${status} targets=${rows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}',
  ].forEach((requiredText) => {
    assert.ok(stage01AllTargetApprovalReadinessSmokeSource.includes(requiredText), `Sajik Stage 01 all-target approval readiness smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_ALL_TARGET_APPROVAL_INPUT_GUIDE_V1',
    'EXPECTED_STAGE01_TARGET_SECTION_IDS',
    'sajik-seatmap-stage01-all-target-review-packets.json',
    'sajik-seatmap-stage01-operator-input.json',
    'sajik-seatmap-stage01-all-target-approval-readiness.json',
    'sajik-seatmap-stage01-all-target-approval-input-guide.json',
    'sajik-seatmap-stage01-all-target-approval-input-guide.csv',
    'sajik-seatmap-stage01-all-target-approval-input-guide.md',
    'approvedRequiredFields',
    'editableFieldsBlank',
    'nextOperatorAction',
    'operatorApprovedCoordinatesRequired',
    'FILL_OR_DECIDE_FROM_OFFICIAL_PNG',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'AI coordinate prediction',
    'web-search-based baseball data',
    'stage01_all_target_approval_input_guide_json',
    'status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount}',
  ].forEach((requiredText) => {
    assert.ok(stage01AllTargetApprovalInputGuideSource.includes(requiredText), `Sajik Stage 01 all-target approval input guide should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_ALL_TARGET_APPROVAL_INPUT_GUIDE_SMOKE_V1',
    'SAJIK_STAGE01_ALL_TARGET_APPROVAL_INPUT_GUIDE_V1',
    'EXPECTED_STAGE01_TARGET_SECTION_IDS',
    'sajik-seatmap-stage01-all-target-approval-input-guide.json',
    'sajik-seatmap-stage01-all-target-approval-input-guide-smoke.json',
    'sajik-seatmap-stage01-all-target-approval-input-guide-smoke.md',
    'GUIDE_STATUS_CHANGED',
    'ROW_INPUT_STATUS_CHANGED',
    'ROW_OPERATOR_DECISION_CHANGED',
    'ROW_NEXT_ACTION_CHANGED',
    'ROW_OFFICIAL_CROP_MISSING',
    'ROW_APPROVED_REQUIRED_FIELDS_CHANGED',
    'ROW_BLOCKERS_PRESENT',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'stage01_all_target_approval_input_guide_smoke_json',
    'status:${status} targets=${rows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}',
  ].forEach((requiredText) => {
    assert.ok(stage01AllTargetApprovalInputGuideSmokeSource.includes(requiredText), `Sajik Stage 01 all-target approval input guide smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_V1',
    'EXPECTED_STAGE01_TARGET_SECTION_IDS',
    'sajik-seatmap-stage01-operator-input.json',
    'sajik-seatmap-stage01-all-target-review-packets.json',
    'sajik-seatmap-stage01-all-target-approval-input-guide.json',
    'sajik-seatmap-stage01-operator-input-intake-gate.json',
    'sajik-seatmap-stage01-operator-input-intake-gate.csv',
    'sajik-seatmap-stage01-operator-input-intake-gate.md',
    'APPROVED_VALID',
    'READY_FOR_PREWRITE',
    'WAITING_FOR_OPERATOR',
    'NO_PATCH_PREVIEW',
    'OPERATOR_INPUT_SOURCE_CONFLICT',
    'CORRECTED_PATH_${issue.code}',
    'operatorApprovedCoordinatesRequired',
    'REQUIRED_KEEP_CURRENT_FIELDS',
    'FORBIDDEN_KEEP_CURRENT_FIELDS',
    'OPERATOR_PLACEHOLDER_NOT_REPLACED',
    'KEEP_CURRENT_FIELD_REQUIRED',
    'KEEP_CURRENT_ROW_HAS_COORDINATE_FIELDS',
    'keepCurrentReviewRequiredFields',
    'keepCurrentForbiddenFields',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'AI coordinate prediction',
    'web-search-based baseball data',
    'stage01_operator_input_intake_gate_json',
    'status:${summary.status} targets=${summary.targetCount}/${summary.expectedTargetCount}',
  ].forEach((requiredText) => {
    assert.ok(stage01OperatorInputIntakeGateSource.includes(requiredText), `Sajik Stage 01 operator input intake gate should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_SMOKE_V1',
    'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_V1',
    'scripts/sajik-seatmap-stage01.mjs',
    'approved-valid',
    'approved-placeholder',
    'keep-current-valid',
    'keep-current-placeholder',
    'approved-invalid',
    'VALID_FIXTURE_STATUS_CHANGED',
    'APPROVED_PLACEHOLDER_BLOCKER_MISSING',
    'KEEP_CURRENT_FIXTURE_131_STATUS_CHANGED',
    'KEEP_CURRENT_PLACEHOLDER_REVIEWED_AT_BLOCKER_MISSING',
    'INVALID_FIXTURE_SELF_INTERSECTION_BLOCKER_MISSING',
    'sajik-seatmap-stage01-operator-input-intake-gate.json',
    'sajik-seatmap-stage01-operator-input-intake-gate-smoke.json',
    'sajik-seatmap-stage01-operator-input-intake-gate-smoke.md',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'stage01_operator_input_intake_gate_smoke_json',
    'status:${status} targets=${defaultRows.length}/${EXPECTED_STAGE01_TARGET_SECTION_IDS.length}',
  ].forEach((requiredText) => {
    assert.ok(stage01OperatorInputIntakeGateSmokeSource.includes(requiredText), `Sajik Stage 01 operator input intake gate smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_TARGET_APPROVAL_GATE_SMOKE_V1',
    'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_EVIDENCE_V1',    'scripts/sajik-seatmap-stage01.mjs',
    'EXPECTED_STAGE01_SECTION_IDS',
    'OFFICIAL_IMAGE_SHA256',
    'MAP_VERSION',
    'pending-no-input',
    'approved-valid-131',
    'approved-placeholder-reviewer',
    'Approval To Prewrite Linkage',
    'ready-for-data-patch',
    'patchPreviewRows',
    'visualPathLocked',
    'EXPECTED_WRITABLE_SOURCE_FIELDS',
    'actualTargetSourceFile',
    'actualWritableSourceFields',
    'actualPatchAllowedFieldsOnly',
    'Allowed Fields Only',
    'productionDataChanged',
    'approved-missing-correctedPath',
    'approved-invalid-label',
    'approved-self-intersection',
    'operator-input-vs-target-entry-conflict',
    'pixel-candidate-copy-note',
    'rejected-no-patch-preview',
    'needs-retrace-no-patch-preview',
    'keep-current-no-patch-preview',
    'keep-current-placeholder-reviewer',
    'target-review-write-flag-drift',
    'target-review-evidence-contract-drift',
    'target-entry-preflight-missing',
    'target-entry-preflight-stale',
    'target-entry-preflight-target-mismatch',
    'target-entry-preflight-source-write-drift',
    'target-entry-preflight-production-write-drift',
    'approved-without-valid-preflight',
    'TARGET_APPROVAL_SOURCE_CONFLICT',
    'TARGET_ENTRY_PREFLIGHT_MISSING',
    'TARGET_ENTRY_PREFLIGHT_STALE',
    'TARGET_ENTRY_PREFLIGHT_SECTION_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_WRITE_FLAGS_NOT_FALSE',
    'TARGET_ENTRY_PREFLIGHT_WRITES_PRODUCTION_DATA',
    'TARGET_ENTRY_PREFLIGHT_READY_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_SOURCE_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_DECISION_MISMATCH',
    'TARGET_ENTRY_PREFLIGHT_NOT_READY_FOR_APPROVAL_GATE',
    'APPROVAL_FIELD_REQUIRED:correctedPath',
    'OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewer',
    'OPERATOR_PLACEHOLDER_NOT_REPLACED:reviewedAt',
    'CORRECTED_PATH_LABEL_OUTSIDE_POLYGON',
    'CORRECTED_PATH_SELF_INTERSECTION',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'TARGET_REVIEW_PACKET_WRITE_FLAGS_NOT_FALSE',
    'TARGET_REVIEW_OFFICIAL_IMAGE_SHA256_MISMATCH',
    'TARGET_REVIEW_PIXEL_COMPONENT_NOT_REFERENCE_ONLY',
    'sourceDataWritePerformed=false',
    'writesOperatorInput=false',
    'writesProductionData=false',
    'cases=${report.passedCases}/${report.totalCases}',
  ].forEach((requiredText) => {
    assert.ok(stage01TargetApprovalGateSmokeSource.includes(requiredText), `Sajik Stage 01 target approval gate smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1',
    'SAJIK_STAGE01_TARGET_APPROVAL_GATE_V1',
    'SAJIK_STAGE01_TARGET_ENTRY_PREFLIGHT_V1',
    'SAJIK_STAGE01_PREWRITE_V1',
    'SAJIK_STAGE01_APPLY_READY_V1',
    'SAJIK_STAGE01_POST_APPLY_AUDIT_V1',
    'SAJIK_STAGE01_OPERATOR_STATUS_V1',
    'SAJIK_STAGE01_MANUAL_PATCH_PLAN_V1',
    'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1',
    "TARGET_SECTION_ID = '131'",
    'TARGET_SOURCE_FILE',
    '131-apply-precheck.json',
    '131-apply-precheck.md',
    'targetApprovalGate.readyForPrewrite=true',
    'MANUAL_PATCH_REQUIRED',
    'APPROVED_NOT_APPLIED',
    'WAIT_FOR_OPERATOR',
    'TARGET_WAITING_FOR_OPERATOR_APPROVAL',
    'TARGET_NOT_APPROVED_HAS_PATCH_PREVIEW',
    'TARGET_APPROVAL_READY_WITHOUT_MANUAL_PATCH_ROW',
    'TARGET_WRITABLE_FRAGMENT_CONTAINS_LOCKED_TOKEN',
    'TARGET_PATCH_PAYLOAD_VISUAL_PATH_CHANGED',
    'allowedCoordinateSource',
    'operator-provided official 2026 Sajik PNG coordinates only',
    'AI coordinate prediction',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'status:${summary.status} target=${TARGET_SECTION_ID}',
  ].forEach((requiredText) => {
    assert.ok(stage01TargetApplyPrecheckSource.includes(requiredText), `Sajik Stage 01 target apply precheck should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_131_APPLY_PATH_STATUS_V1',
    'SAJIK_STAGE01_TARGET_REVIEW_PACKET_V1',
    'SAJIK_STAGE01_OPERATOR_INPUT_INTAKE_GATE_V1',
    'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1',
    'SAJIK_STAGE01_131_LIFECYCLE_SMOKE_V1',
    "TARGET_SECTION_ID = '131'",
    '131-apply-path-status.json',
    '131-apply-path-status.md',
    'TARGET_WAITING_FOR_OPERATOR_APPROVED_COORDINATES',
	    'lifecycleFixtureReady',
	    'officialPngEvidenceReady',
	    'approvalInputChecklistReady',
	    'coordinatePatchReadiness',
	    'officialPngVisualReviewBrief',
	    'currentGeometryApprovalDraft',
	    'keepCurrentDecisionDraft',
	    'SAJIK_STAGE01_131_DECISION_PACKET_V1',
	    'operatorDecisionPacket',
	    'allowedDecisionPaths',
	    'REQUIRED_KEEP_CURRENT_FIELDS',
	    'FORBIDDEN_KEEP_CURRENT_FIELDS',
	    'operatorDecision=KEEP_CURRENT',
	    'KEEP_CURRENT must keep correctedPath/correctedLabelX/correctedLabelY blank',
	    'Choose APPROVED with official PNG corrected geometry or KEEP_CURRENT with reviewer/reviewedAt/operatorNote.',
	    'OPERATOR_APPROVED_COORDINATES_MISSING',
	    'OPERATOR_APPROVED_COORDINATES_REQUIRED',
	    'APPROVED_CURRENT_GEOMETRY_REVIEW_REQUIRED',
	    'KEEP_CURRENT_DECISION_REVIEW_REQUIRED',
	    'APPROVED_NO_GEOMETRY_DELTA_EXPECTED',
	    'officialPngEvidenceBrief',
	    'approvalInputBrief',
	    'REQUIRED_TARGET_REVIEW_EVIDENCE_VERSION',
	    'REQUIRED_REVIEW_ASSERTIONS',
	    'REQUIRED_READY_FOR_PREWRITE_CRITERIA',
	    '131-official-crop.png',
	    '131-official-overlay-crop.png',
	    '131-official-edge-crop.png',
	    '131 is a thin horizontal official PNG block between upper 121 and lower 061.',
	    'Current hitPath is overlaid on the lower 131 thin block; overlay does not approve coordinates by itself.',
	    'keep production source unchanged until operator-approved official PNG coordinates are entered',
	    'Operator approved current production hitPath after official PNG crop/overlay/edge review; no geometry delta expected.',
	    'Operator chose KEEP_CURRENT after official PNG review; no Stage 01 geometry patch.',
	    'target approval gate reports readyForPrewrite=true',
	    'Did not copy pixel candidate overlayPath, browser CSS pixels, resized screenshot coordinates, or external seatmap coordinates.',
	    'editableFieldsBlank',
    'MANUAL_PATCH_REQUIRED',
    'APPROVED_NOT_APPLIED',
    'operator-provided official 2026 Sajik PNG coordinates only',
    'AI coordinate prediction',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
  ].forEach((requiredText) => {
    assert.ok(stage01131ApplyPathStatusSource.includes(requiredText), `Sajik Stage 01 131 apply path status should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_COMPLETION_GATE_V1',
    'SAJIK_STAGE01_READINESS_SUMMARY_V1',
    'SAJIK_STAGE01_REAL_APPROVAL_READINESS_V1',
    'SAJIK_STAGE01_TARGET_APPLY_PRECHECK_V1',
    "TARGET_APPROVAL_SECTION_ID = '131'",
    'EXPECTED_STAGE01_ROWS = 16',
    'sajik-seatmap-stage01-completion-gate.json',
    'sajik-seatmap-stage01-completion-gate.md',
    '--require-complete',
    'readyForStage01Close',
    'PENDING_OPERATOR_ROWS',
    'MANUAL_PATCH_ROWS_NOT_APPLIED',
    'APPROVED_NOT_APPLIED_ROWS',
    'NEEDS_RETRACE_ROWS',
    'stage01-complete',
    'automatic coordinate guessing',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'status:${report.status} pending=${pendingRows}',
  ].forEach((requiredText) => {
    assert.ok(stage01CompletionGateSource.includes(requiredText), `Sajik Stage 01 completion gate should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_COMPLETION_GATE_SMOKE_V1',
    'scripts/sajik-seatmap-stage01.mjs',
    "TARGET_APPROVAL_SECTION_ID = '131'",
    'EXPECTED_STAGE01_ROWS = 16',
    'EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER',
    'sajik-seatmap-stage01-completion-gate-smoke.json',
    'sajik-seatmap-stage01-completion-gate-smoke.md',
    'completion-gate-smoke',
    'pending-waits',
    'pending-require-complete-fails',
    'complete-passes',
    'complete-require-complete-passes',
    'manual-apply-waits',
    'needs-retrace-waits',
    'source-write-tamper-blocks',
    'target-ready-without-manual-patch-blocks',
    'version-mismatch-blocks',
    'PENDING_OPERATOR_ROWS:16',
    'MANUAL_PATCH_ROWS_NOT_APPLIED:1',
    'NEEDS_RETRACE_ROWS:1',
    'READINESS_SUMMARY_SOURCE_DATA_WRITE_PERFORMED_MUST_BE_FALSE',
    'TARGET_APPLY_READY_WITHOUT_MANUAL_PATCH_REQUIREMENT',
    'READINESS_SUMMARY_VERSION_MISMATCH:BAD_VERSION:SAJIK_STAGE01_READINESS_SUMMARY_V1',
    '--require-complete',
    '--stage-dir',
    'automatic coordinate guessing',
    'MANUAL_BASEBALL_DATA_REQUIRED',
    'sourceDataWritePerformed: false',
    'writesOperatorInput: false',
    'writesProductionData: false',
    'cases=${report.passedCases}/${report.totalCases}',
  ].forEach((requiredText) => {
    assert.ok(stage01CompletionGateSmokeSource.includes(requiredText), `Sajik Stage 01 completion gate smoke should include ${requiredText}`);
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
    'REQUIRED_KEEP_CURRENT_FIELDS',
    'FORBIDDEN_KEEP_CURRENT_FIELDS',
    'OPERATOR_PLACEHOLDER_NOT_REPLACED',
    'KEEP_CURRENT_FIELD_REQUIRED',
    'KEEP_CURRENT_ROW_HAS_COORDINATE_FIELDS',
    'APPROVAL_FIELD_INVALID_NUMBER:correctedLabelX',
    'patchReviewRows',
    'Patch Preview Review',
    'sourcePatchContract',
    'sourcePatchContractRows',
    'patchAllowedFieldsOnly',
    'changedSourceFields',
    'unexpectedChangedSourceFields',
    'PATCH_PREVIEW_WRITES_LOCKED_FIELD',
    'targetSourceFile',
    'WRITABLE_SOURCE_FIELDS',
    'LOCKED_SOURCE_FIELDS',
    'Source Patch Contract',
    'visualPathLocked',
    'pointCountDelta',
    'areaDelta',
    'boundsDelta',
    'centroidDelta',
    'labelPointDelta',
    'CORRECTED_PATH_REUSES_CURRENT_HIT_PATH',
    'CORRECTED_PATH_REUSES_CURRENT_VISUAL_PATH',
    'CORRECTED_POINT_COUNT_TOO_HIGH',
    'CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE',
    'CORRECTED_GEOMETRY_BOUNDS_DELTA_TOO_LARGE',
    'CORRECTED_LABEL_NEAR_BOUNDARY',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'areaRatioVsCurrentHit',
    'boundsMaxAbsDelta',
    'labelBoundaryDistance',
    'buildSajikSeatMapSectionPatchPayload',
    'formatSajikSeatMapSectionPatchTsFragment',
    'productionDataChanged: false',
    'sajik-seatmap-stage01-prewrite.patch-preview.ts',
    'REQUIRED_TARGET_APPROVAL_GATE_VERSION',
    "TARGET_APPROVAL_SECTION_ID = '131'",
    'TARGET_APPROVAL_GATE_REQUIRED',
    'TARGET_APPROVAL_GATE_NOT_READY',
    'TARGET_APPROVAL_GATE_SELECTED_ENTRY_MISMATCH',
    'targetApprovalGateContract',
    'targetApprovalGateRequiredRows',
    '--target-approval-gate',
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
    'PARTIAL_APPLY_HITPATH_ONLY',
    'PARTIAL_APPLY_LABEL_ONLY',
    'LEGACY_LABEL_DRIFT',
    'STALE_BEFORE_SNAPSHOT_HIT_PATH',
    'LOCKED_FIELD_MUTATED',
    'blockingReasons',
    'blockedRows',
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
    'beforeFingerprint',
    'approvedFingerprint',
    'lockedFieldFingerprint',
    'sourceBaseline',
    'writableTsFragment',
    'formatWritableSourcePatchTsFragment',
    'LOCKED_SOURCE_FIELD_MUTATED',
    'fragment rule',
    'Writable source fields only',
    'Full context preview',
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
    'POST_APPLY_BLOCKED',
    'blockingReasons',
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
    'partial-hitpath-only-applied',
    'partial-label-only-applied',
    'legacy-label-drift',
    'stale-before-snapshot',
    'locked-field-mutated',
    'approved-large-area-row',
    'approved-excessive-point-count-row',
    'approved-label-near-boundary-row',
    'approved-pixel-candidate-copy-note-row',
    'approved-131-without-approval-gate',
    'approved-131-with-blocked-approval-gate',
    'approved-131-with-mismatched-approval-gate',
    'approved-131-with-ready-approval-gate',
    'TARGET_APPROVAL_GATE_VERSION',
    "TARGET_APPROVAL_SECTION_ID = '131'",
    'TARGET_APPROVAL_GATE_REQUIRED',
    'TARGET_APPROVAL_GATE_NOT_READY',
    'TARGET_APPROVAL_GATE_SELECTED_ENTRY_MISMATCH',
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
    'CORRECTED_GEOMETRY_AREA_DELTA_TOO_LARGE',
    'CORRECTED_POINT_COUNT_TOO_HIGH',
    'CORRECTED_LABEL_NEAR_BOUNDARY',
    'OPERATOR_NOTE_SAYS_PIXEL_CANDIDATE_COPY_REVIEW',
    'PARTIAL_APPLY_HITPATH_ONLY',
    'PARTIAL_APPLY_LABEL_ONLY',
    'LEGACY_LABEL_DRIFT',
    'STALE_BEFORE_SNAPSHOT_HIT_PATH',
    'LOCKED_FIELD_MUTATED:visualPath',
    'inputAidRowWarning',
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
    'SAJIK_STAGE01_APPLIED_DRY_RUN_V1',
    "DRY_RUN_TARGET_SECTION_ID = '021'",
    'STAGE01_APPLIED_DRY_RUN_OPERATOR',
    'ready-for-data-patch',
    'ready-for-manual-apply',
    'postApply=applied',
    'operatorStatusRow=APPLIED',
    'manualPatchRows=0',
    'APPROVED_APPLIED',
    'VERIFY_APPLIED',
    'PATCH_PAYLOAD_HAS_NO_GEOMETRY_DELTA',
    'APPROVED_NO_GEOMETRY_DELTA',
    'sourceDataWritePerformed',
    'sourceDataWritePerformed: false',
    'productionWriteAllowed: false',
    'productionDataChanged: false',
    'realApprovalReadinessContract',
    'sajik-seatmap-stage01-applied-dry-run.json',
    'sajik-seatmap-stage01-applied-dry-run.md',
    'sajik-seatmap-stage01-operator-input.json',
    'sajik-seatmap-stage01-prewrite.json',
    'sajik-seatmap-stage01-apply-ready.json',
    'sajik-seatmap-stage01-post-apply-audit.json',
    'sajik-seatmap-stage01-operator-status.json',
    'sajik-seatmap-stage01-manual-patch-plan.json',
    'sajik-seatmap-stage01-real-approval-readiness.json',
    'src/data/sajikSeatData.ts',
    'must not edit src/data/sajikSeatData.ts',
  ].forEach((requiredText) => {
    assert.ok(stage01AppliedDryRunSource.includes(requiredText), `Sajik Stage 01 applied dry-run should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_131_LIFECYCLE_SMOKE_V1',
    "TARGET_SECTION_ID = '131'",
    'STAGE01_131_LIFECYCLE_OPERATOR',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'sajik-seatmap-stage01.mjs',
    'ready-for-prewrite',
    'ready-for-approval-gate',
    'matched-sources',
    'ready-for-data-patch',
    'ready-for-manual-apply',
    'not-applied',
    'NOT_APPLIED',
    'MANUAL_PATCH_REQUIRED',
    'APPROVED_NOT_APPLIED',
    'APPLY_MANUAL_PATCH',
    'sourcePatchContractRow',
    'patchAllowedFieldsOnly',
    'unexpectedChangedSourceFields',
    'writableTsFragment',
    'LOCKED_FRAGMENT_TOKENS',
    'writableFragmentLockedTokensAbsent',
    'Writable fragment must omit locked source fields.',
    'sourceDataWritePerformed',
    'productionWriteAllowed',
    'productionDataChanged',
    '131-entry-preflight.json',
    'targetEntryPreflightStatus',
    'sajik-seatmap-stage01-131-lifecycle-smoke.json',
    'sajik-seatmap-stage01-131-lifecycle-smoke.md',
    'target-lifecycle-smoke',
    'src/data/sajikSeatData.ts',
    'no source write',
  ].forEach((requiredText) => {
    assert.ok(stage01131LifecycleSmokeSource.includes(requiredText), `Sajik Stage 01 131 lifecycle smoke should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_READINESS_SUMMARY_V1',
    'DEFAULT_MAX_REPORT_AGE_SECONDS',
    'EXPECTED_PREWRITE_SMOKE_CASES = 26',
    'EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES = 12',
    'REQUIRED_OPERATOR_PACKAGE_VERSION',
    'REQUIRED_TARGET_ENTRY_PREFLIGHT_VERSION',
    'REQUIRED_TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION',
    'REQUIRED_TARGET_APPROVAL_GATE_VERSION',
    "TARGET_APPROVAL_SECTION_ID = '131'",
    'EXPECTED_STAGE01_SECTION_IDS',
    '--stage-dir',
    '--max-age-seconds',
    'sajik-seatmap-stage01-readiness-summary.json',
    'sajik-seatmap-stage01-readiness-summary.md',
    'sajik-seatmap-stage01-operator-package.json',
    'sajik-seatmap-stage01-operator-input.json',
    'sajik-seatmap-stage01-review-board.json',
    'sajik-seatmap-stage01-real-approval-readiness.json',
    'sajik-seatmap-stage01-prewrite-smoke.json',
    'sajik-seatmap-stage01-approved-dry-run.json',
    'sajik-seatmap-stage01-applied-dry-run.json',
    'targetEntryPreflight',
    'targets/131-entry-preflight.json',
    'targetEntryPreflightSmoke',
    'sajik-seatmap-stage01-target-entry-preflight-smoke.json',
    'targetApprovalGate',
    'targets/131-approval-gate.json',
    'realApprovalReadiness.status=waiting-for-operator',
    'operatorPackage.imageAnalysisMetadataRegenerated=true',
    'operatorPackage.imageAnalysis.candidateReferenceOnly=true',
    'operatorPackage.imageAnalysis.riskRows=3/7/6',
    'operatorPackage.imageAnalysis.priorityOrder=131/032/135/132/031/133/022/143/134/142/121/124/125/122/021/123',
    'operatorPackage.imageAnalysis.source=reports/stadium/sajik-seatmap-pixel-components.json',
    'operatorInput.packageVersion=SAJIK_STAGE01_OPERATOR_PACKAGE_V1',
    'operatorInput.targetStage=Stage 01 P0',
    'operatorInput.rows=16',
    'operatorInput.imagePriorityRank=1 starts with 131',
    'reviewBoard.imageAnalysis.candidateReferenceOnly=true',
    'reviewBoard.imageAnalysis.stage01RowsWithPixelCandidate=16',
    'reviewBoard.imageAnalysis.riskRows=3/7/6',
    'reviewBoard.imageAnalysis.priorityOrder=131/032/135/132/031/133/022/143/134/142/121/124/125/122/021/123',
    'reviewBoard.imageAnalysis.source=reports/stadium/sajik-seatmap-pixel-components.json',
    'prewriteSmoke.status=passed',
    'approvedDryRun.readinessRow=APPROVED_NOT_APPLIED',
    'appliedDryRun.readinessRow=APPROVED_APPLIED',
    'targetEntryPreflight.status=waiting-for-operator|ready-for-approval-gate',
    'targetEntryPreflight.targetSectionId=131',
    'targetEntryPreflight.sourceDataWritePerformed=false',
    'targetEntryPreflightSmoke.status=passed',
    'targetEntryPreflightSmoke.cases=12/12',
    'targetEntryPreflightSmoke.sourceDataWritePerformed=false',
    'targetApprovalGate.status=waiting-for-operator|ready-for-prewrite',
    'targetApprovalGate.targetSectionId=131',
    'targetApprovalGate.sourceDataWritePerformed=false',
    'sourceDataWritePerformed=false',
    'productionWriteAllowed=false',
    'productionDataChanged=false',
    'EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER',
    'EXPECTED_IMAGE_PIXEL_SOURCE',
    'OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED',
    'OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED',
    'OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED',
    'OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED',
    'OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED',
    'OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED',
    'OPERATOR_INPUT_PIXEL_COMPONENT_SOURCE_CHANGED',
    'PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH',
    'PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH',
    'PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH',
    'REVIEW_BOARD_IMAGE_PRIORITY_CHANGED',
    'REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED',
    'REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED',
    'REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED',
    'TARGET_APPROVAL_GATE_VERSION_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_VERSION_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SECTION_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_STATUS_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SOURCE_DATA_WRITE_PERFORMED',
    'TARGET_ENTRY_PREFLIGHT_WRITES_OPERATOR_INPUT',
    'TARGET_ENTRY_PREFLIGHT_WRITES_PRODUCTION_DATA',
    'TARGET_ENTRY_PREFLIGHT_APPROVED_NOT_READY',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_STATUS_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_CASE_COUNT_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_SOURCE_DATA_WRITE_PERFORMED',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_WRITES_OPERATOR_INPUT',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_WRITES_PRODUCTION_DATA',
    'TARGET_APPROVAL_GATE_SECTION_CHANGED',
    'TARGET_APPROVAL_GATE_STATUS_CHANGED',
    'TARGET_APPROVAL_GATE_SOURCE_DATA_WRITE_PERFORMED',
    'TARGET_APPROVAL_GATE_APPROVED_NOT_READY',
    'packageImageHighRisk=${contract.operatorPackageHighRiskRows}',
    'reviewBoardImageHighRisk=${contract.reviewBoardHighRiskRows}',
    'packageReviewBoardImagePriorityMatched=${contract.packageReviewBoardImagePriorityMatched}',
    'targetEntryPreflight=${contract.targetEntryPreflightStatus}:${contract.targetEntryPreflightDecision}',
    'targetEntryPreflightReady=${contract.targetEntryPreflightReadyForApprovalGate}',
    'targetEntryPreflightSmoke=${contract.targetEntryPreflightSmokeStatus}:${contract.targetEntryPreflightSmokeCases}',
    'targetApprovalGate=${contract.targetApprovalGateStatus}:${contract.targetApprovalGateDecision}',
    'targetApprovalReady=${contract.targetApprovalGateReadyForPrewrite}',
    'OPERATOR_INPUT_ROW_COUNT_CHANGED',
    'OPERATOR_INPUT_SECTION_IDS_CHANGED',
    'OPERATOR_INPUT_APPROVED_COUNT_MISMATCH',
    'REPORT_NOT_FRESH',
    'APPROVED_NOT_APPLIED',
    'APPROVED_APPLIED',
    'approved-no-delta',
    'approved-with-delta',
    'approved-applied-after-manual-patch',
    'operatorInputRows=${contract.operatorInputRows}',
    'status:${summary.status}',
  ].forEach((requiredText) => {
    assert.ok(stage01ReadinessSummarySource.includes(requiredText), `Sajik Stage 01 readiness summary should include ${requiredText}`);
  });

  [
    'SAJIK_STAGE01_READINESS_SUMMARY_SMOKE_V1',
    'EXPECTED_PREWRITE_SMOKE_CASES = 26',
    'EXPECTED_TARGET_ENTRY_PREFLIGHT_SMOKE_CASES = 12',
    'TARGET_ENTRY_PREFLIGHT_VERSION',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_VERSION',
    'TARGET_APPROVAL_GATE_VERSION',
    "TARGET_APPROVAL_SECTION_ID = '131'",
    'REQUIRED_OPERATOR_PACKAGE_VERSION',
    'EXPECTED_STAGE01_SECTION_IDS',
    'sajik-seatmap-stage01-readiness-summary-smoke.json',
    'sajik-seatmap-stage01-readiness-summary-smoke.md',
    'summary-smoke',
    'sajik-seatmap-stage01-operator-package.json',
    'targets/131-entry-preflight.json',
    'sajik-seatmap-stage01-target-entry-preflight-smoke.json',
    'targets/131-approval-gate.json',
    'valid-summary',
    'missing-report',
    'review-board-missing',
    'stale-report',
    'approved-readiness-drift',
    'applied-readiness-drift',
    'source-write-drift',
    'operator-input-drift',
    'image-analysis-priority-drift',
    'image-analysis-risk-count-drift',
    'candidate-reference-drift',
    'pixel-component-source-drift',
    'package-image-priority-drift',
    'package-image-risk-count-drift',
    'package-candidate-reference-drift',
    'package-pixel-component-source-drift',
    'operator-input-image-priority-drift',
    'package-review-board-image-mismatch',
    'target-approval-gate-missing',
    'target-entry-preflight-missing',
    'target-entry-preflight-stale',
    'target-entry-preflight-source-write-drift',
    'target-entry-preflight-status-drift',
    'target-entry-preflight-smoke-failed',
    'target-entry-preflight-target-mismatch',
    'target-approval-source-write-drift',
    'target-approval-status-drift',
    'REPORT_MISSING',
    'REPORT_NOT_FRESH',
    'APPROVED_DRY_RUN_READINESS_ROW_CHANGED',
    'APPLIED_DRY_RUN_READINESS_ROW_CHANGED',
    'SOURCE_DATA_WRITE_PERFORMED',
    'OPERATOR_INPUT_ROW_COUNT_CHANGED',
    'OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED',
    'OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED',
    'OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED',
    'OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED',
    'OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED',
    'OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED',
    'PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH',
    'PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH',
    'PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH',
    'REVIEW_BOARD_IMAGE_PRIORITY_CHANGED',
    'REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED',
    'REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED',
    'REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED',
    'TARGET_APPROVAL_GATE_SOURCE_DATA_WRITE_PERFORMED',
    'TARGET_ENTRY_PREFLIGHT_SOURCE_DATA_WRITE_PERFORMED',
    'TARGET_ENTRY_PREFLIGHT_STATUS_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SECTION_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_STATUS_CHANGED',
    'TARGET_ENTRY_PREFLIGHT_SMOKE_CASE_COUNT_CHANGED',
    'TARGET_APPROVAL_GATE_STATUS_CHANGED',
    'EXPECTED_STAGE01_IMAGE_PRIORITY_ORDER',
    'EXPECTED_IMAGE_PIXEL_SOURCE',
    '--stage-dir',
    '--max-age-seconds',
    'cases=${report.passedCases}/${report.totalCases}',
  ].forEach((requiredText) => {
    assert.ok(stage01ReadinessSummarySmokeSource.includes(requiredText), `Sajik Stage 01 readiness summary smoke should include ${requiredText}`);
  });

  [
    'Sajik Seatmap Stage 01 Handoff',
    'target rows: `021/022/031/032/121/122/123/124/125/131/132/133/134/135/142/143`',
    'smoke status: `passed`, `cases=26/26`',
    'approved dry-run status: `passed`, `target=021`, `manualPatchRows=1`, `readinessRow=APPROVED_NOT_APPLIED`, `sourceDataWritePerformed=false`',
    'applied dry-run status: `passed`, `target=021`, `postApply=applied`, `operatorStatusRow=APPLIED`, `manualPatchRows=0`, `readinessRow=APPROVED_APPLIED`, `sourceDataWritePerformed=false`',
    'target image-analysis smoke status: `passed`, `target=131`, `crop=615 433 140 110`, `pngSize=560x440`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'target entry template readiness smoke status: `passed`, `target=131`, `decision=PENDING`, `editableFieldsBlank=true`, `approvedRequiredFields=7`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'target entry preflight status: `waiting-for-operator`, `target=131`, `source=none`, `decision=PENDING`, `readyForApprovalGate=false`, `blockers=0`, `sourceDataWritePerformed=false`',
    'target entry preflight smoke status: `passed`, `cases=12/12`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'target approval gate smoke status: `passed`, `cases=20/20`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'all-target approval readiness status: `waiting-for-operator`, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'all-target approval readiness smoke status: `passed`, `targets=16/16`, `readyForApprovalGate=0`, `readyForPrewrite=0`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'target apply precheck status: `waiting-for-operator`, `target=131`, `decision=PENDING`, `readyForPrewrite=false`, `manualPatchRequired=false`, `targetApplied=false`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'readiness summary status: `passed`, `operatorInputRows=16`, `operatorInputApproved=0`, `packageImageHighRisk=8`, `reviewBoardImageHighRisk=8`, `packageReviewBoardImagePriorityMatched=true`, `realApprovalReadiness=waiting-for-operator`, `prewriteSmoke=passed`, `approvedDryRun=APPROVED_NOT_APPLIED`, `appliedDryRun=APPROVED_APPLIED`, `targetEntryPreflight=waiting-for-operator:PENDING`, `targetEntryPreflightReady=false`, `targetEntryPreflightSmoke=passed:12/12`, `targetApprovalGate=waiting-for-operator:PENDING`, `targetApprovalReady=false`, `freshReports=true`',
    'readiness summary smoke status: `passed`, `cases=27/27`',
    'completion gate status: `waiting-for-operator`, `pending=16`, `approvedApplied=0`, `manualPatchRows=0`, `next=131`, `readyForStage01Close=false`, `sourceDataWritePerformed=false`',
    'completion gate smoke status: `passed`, `cases=9/9`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
    'staged scope audit smoke status: `passed`, `cases=7/7`, `expectedStage01PartialTargetFileCount=40`, `sourceDataWritePerformed=false`, `writesOperatorInput=false`, `writesProductionData=false`',
	    'operator package preservation: `passed`',
	    'Partial PR Staging Candidate',
	    'included=<runtime>',
	    'separate=<runtime>',
	    'Stage 01 partial pass criteria are `unexpected=0`, `partialBlockers=0`, and `absent-from-worktree=0`',
	    'unexpected=0',
	    'stage01PartialStagingVerdict=ready-for-partial-stage01-staging',    'scripts/sajik-seatmap-stage01.mjs',
	    'reports/stadium/sajik-seatmap-stage01-staged-scope-audit.{json,csv,md}',
	    '40-file Stage 01 target list',
	    '40 Stage 01 partial target files',
	    'stagedScopeAudit.status=passed',
	    'scripts/sajik-seatmap-stage01.mjs',
	    'The npm command refreshes `stage01-target-entry-preflight` first',
	    '131 Official PNG Analysis Artifacts',
	    'reports/stadium/sajik-stage01-operator/targets/131-official-crop.png',
	    'reports/stadium/sajik-stage01-operator/targets/131-official-overlay-crop.png',
	    'reports/stadium/sajik-stage01-operator/targets/131-official-edge-crop.png',
	    'These files are generated from `src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.png`',
	    '131 Operator Input Ready',
	    'The ready input file for section `131` is `reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`',
	    '`operatorDecision=APPROVED`',
	    '`operatorNote` must document that the corrected path came from official PNG manual review.',
	    'Prewrite may produce a production patch preview only after the approval gate reports `ready-for-prewrite`.',
	    'src/components/StadiumGuideRuntimeSeatMaps.test.ts',
	    'Do not use bulk `git add .`',
	    'Operator Input Template Readiness',
    'Decision Downstream Matrix',
    'Manual Source Patch Procedure',
    '`packageVersion` | `SAJIK_STAGE01_OPERATOR_PACKAGE_V1`',
    '`targetStage` | `Stage 01 P0`',
    '`operatorDecision`, `correctedPath`, `correctedLabelX`, `correctedLabelY`, `reviewer`, `reviewedAt`, `operatorNote`',
    'Only `APPROVED` rows can produce a source patch candidate.',
    'verify `beforeFingerprint` still matches the current source baseline before editing',
    'If the baseline does not match, stop and rerun Stage 01 reports.',
    'operator input aid: `waiting-for-operator`, `pending=16`',
    'review board: `waiting-for-operator`, `pending=16`, `ready=0`, `invalid=0`',
    'entry sheet: `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-entry-sheet.csv`',
    'official PNG pixel analysis: `reports/stadium/sajik-seatmap-pixel-components.json`',
    'official PNG image analysis priority: `131/032/133/143/135/134/122/123` high-risk rows first',
    'packageImageHighRisk=8',
    'reviewBoardImageHighRisk=8',
    'packageImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021',
    'reviewBoardImagePriority=131>032>133>143>135>134>122>123>132>031>022>142>121>124>125>021',
    'packageReviewBoardImagePriorityMatched=true',
    'Operator package image-analysis invariants',
    '`imageAnalysisMetadataRegenerated=true`',
    '`imageCandidateReferenceOnly=true`',
    '`HIGH=8`, `MEDIUM=4`, `LOW=4`',
    '`pixelComponents=reports/stadium/sajik-seatmap-pixel-components.json`',
    '`imageAnalysisPriorityOrder=131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`',
    '`candidateReferenceOnly=true`',
    '`stage01RowsWithPixelCandidate=16`',
    '`highRiskRows=6`, `mediumRiskRows=5`, `lowRiskRows=5`',
    '`source=reports/stadium/sajik-seatmap-pixel-components.json`',
    '`priorityOrder=131/032/133/143/135/134/122/123/132/031/022/142/121/124/125/021`',
    'Primary input source is `reports/stadium/sajik-stage01-operator/targets/131-entry-template.json`',
    'Alternate input source is `reports/stadium/sajik-stage01-operator/sajik-seatmap-stage01-operator-input.json`',
    'TARGET_APPROVAL_SOURCE_CONFLICT',
    '"sectionId": "131"',
    '"correctedPath": "<operator traced official PNG path>"',
    'official PNG manual trace',
    '`stage01-target-entry-preflight -> stage01-target-approval-gate -> stage01-operator-input-aid -> stage01-prewrite -> stage01-apply-ready -> stage01-manual-patch-plan -> stage01-target-apply-precheck -> stage01-131-apply-path-status`',
    'Manual source patch is allowed only after the manual patch plan reports `MANUAL_PATCH_REQUIRED`',
    'Writable source fields are `imageGeometry.hitPath`, `imageGeometry.labelPoint`, `imageGeometry.labelX`, and `imageGeometry.labelY`',
    'Locked source fields are `imageGeometry.visualPath`, `imageGeometry.geometryVersion`, `sectionKind`, `markerType`, `mapInteractionStatus`, `traceSource`, `traceMethod`, and `traceVersion`',
    'Pixel candidate paths must not be copied into `correctedPath` without explicit operator approval.',
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
    'Applied Dry-Run Contract',
    'Readiness Summary Contract',
    'Readiness Summary Smoke Contract',
    'Real Approval Readiness Contract',
    'valid-summary',
    'missing-report -> REPORT_MISSING',
    'review-board-missing -> REPORT_MISSING',
    'stale-report -> REPORT_NOT_FRESH',
    'source-write-drift -> SOURCE_DATA_WRITE_PERFORMED',
    'image-analysis-priority-drift -> REVIEW_BOARD_IMAGE_PRIORITY_CHANGED',
    'image-analysis-risk-count-drift -> REVIEW_BOARD_IMAGE_RISK_COUNTS_CHANGED',
    'candidate-reference-drift -> REVIEW_BOARD_IMAGE_REFERENCE_ONLY_DISABLED',
    'pixel-component-source-drift -> REVIEW_BOARD_PIXEL_COMPONENT_SOURCE_CHANGED',
    'package-image-priority-drift -> OPERATOR_PACKAGE_IMAGE_PRIORITY_CHANGED + PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH',
    'package-image-risk-count-drift -> OPERATOR_PACKAGE_IMAGE_RISK_COUNTS_CHANGED + PACKAGE_REVIEW_BOARD_IMAGE_RISK_COUNTS_MISMATCH',
    'package-candidate-reference-drift -> OPERATOR_PACKAGE_IMAGE_REFERENCE_ONLY_DISABLED',
    'package-pixel-component-source-drift -> OPERATOR_PACKAGE_PIXEL_COMPONENT_SOURCE_CHANGED',
    'operator-input-image-priority-drift -> OPERATOR_INPUT_IMAGE_PRIORITY_CHANGED + OPERATOR_INPUT_FIRST_IMAGE_PRIORITY_ROW_CHANGED + PACKAGE_OPERATOR_INPUT_IMAGE_PRIORITY_MISMATCH',
    'package-review-board-image-mismatch -> PACKAGE_REVIEW_BOARD_IMAGE_PRIORITY_MISMATCH',
    'operator-input-drift -> OPERATOR_INPUT_ROW_COUNT_CHANGED',
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
    'npm run stadium:sajik:stage01-target-entry-preflight',
    'npm run stadium:sajik:stage01-target-entry-preflight-smoke',
    'npm run stadium:sajik:stage01-target-apply-precheck',
    'npm run stadium:sajik:stage01-131-apply-path-status',
    'npm run stadium:sajik:stage01-approved-dry-run',
    'npm run stadium:sajik:stage01-applied-dry-run',
    'npm run stadium:sajik:stage01-readiness-summary',
    'npm run stadium:sajik:stage01-readiness-summary-smoke',
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
    'SAJIK_CANONICAL_ACCESSIBILITY_MARKERS',
    'marker.markerInteractionStatus',
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
  const evidenceSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const manifestSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const anchorCropSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const auditSource = fs.readFileSync(
    path.join(projectRoot, 'scripts/stadium-ux-audit.mjs'),
    'utf8',
  );

  assert.ok(packageSource.includes('"stadium:daejeon:evidence"'));
  assert.ok(packageSource.includes('"stadium:daejeon:anchor-crops"'));
  assert.ok(packageSource.includes('"stadium:daejeon:evidence": "node scripts/stadium-seatmap-ops.mjs daejeon evidence"'));
  assert.ok(packageSource.includes('"qa:stadium:daejeon:trace-review"'));
  assert.ok(packageSource.includes('"qa:stadium:daejeon:trace-review": "node scripts/stadium-seatmap-ops.mjs daejeon trace-review"'));
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
  const releaseGateSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const changeGuardSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const operatorHandoffSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const operatorApprovalSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const operatorApprovalTestSource = readProjectFile('scripts/daejeon-seatmap-operator-approval.test.mjs');
  const manifestSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const coverageReportSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const anchorCropSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const anchorCropContractSource = readProjectFile('scripts/daejeon-seatmap-anchor-contract.mjs');
  const blockEvidenceCropSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const visualDiffSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
  const visualBaselineSource = readProjectFile('src/data/daejeonAnchorVisualBaseline.json');
  const geometryDiffSource = readProjectFile('scripts/daejeon-seatmap-ops.mjs');
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
    '"qa:stadium:daejeon:release-lock": "node scripts/stadium-seatmap-ops.mjs daejeon release-lock"',
    '"stadium:daejeon:block-crops": "node scripts/stadium-seatmap-ops.mjs daejeon block-crops"',
    '"stadium:daejeon:visual-diff": "node scripts/stadium-seatmap-ops.mjs daejeon visual-diff"',
    '"stadium:daejeon:visual-baseline": "node scripts/stadium-seatmap-ops.mjs daejeon visual-baseline"',
    '"stadium:daejeon:geometry-diff": "node scripts/stadium-seatmap-ops.mjs daejeon geometry-diff"',
    '"stadium:daejeon:geometry-baseline": "node scripts/stadium-seatmap-ops.mjs daejeon geometry-baseline"',
    '"qa:stadium:daejeon:change-guard": "node scripts/stadium-seatmap-ops.mjs daejeon change-guard"',
    '"test:stadium:daejeon:operator-approval": "node --test scripts/daejeon-seatmap-operator-approval.test.mjs"',
    '"stadium:daejeon:operator-handoff": "node scripts/stadium-seatmap-ops.mjs daejeon operator-handoff"',
    '"stadium:daejeon:operator-approval": "node scripts/stadium-seatmap-ops.mjs daejeon operator-approval"',
    '"stadium:daejeon:operator-approval:status": "node scripts/stadium-seatmap-ops.mjs daejeon operator-approval:status"',
    '"stadium:daejeon:operator-approval:approve": "node scripts/stadium-seatmap-ops.mjs daejeon operator-approval:approve"',
    '"stadium:daejeon:operator-approval:verify": "node scripts/stadium-seatmap-ops.mjs daejeon operator-approval:verify"',
    '"qa:stadium:daejeon:release-approved": "node scripts/stadium-seatmap-ops.mjs daejeon release-approved"',
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
    "import { main } from './daejeon-seatmap-ops.mjs'",
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
  const dispatcherSource = readProjectFile('scripts/stadium-seatmap-ops.mjs');
  const runnerSource = readProjectFile('scripts/run-stadium-isolated-qa.mjs');
  const gwangjuDataSource = readProjectFile('src/data/gwangjuSeatData.ts');
  const coreQaSource = readProjectFile('scripts/gwangju-seatmap-core-qa.mjs');
  const manifestSource = coreQaSource;
  const operatorTemplateOpsSource = readProjectFile('scripts/gwangju-seatmap-operator-template-ops.mjs');
  const operatorTemplateSource = operatorTemplateOpsSource;
  const operatorTemplateValidationSource = operatorTemplateOpsSource;
  const operatorTemplateApplyPlanSource = operatorTemplateOpsSource;
  const operatorHandoffSource = operatorTemplateOpsSource;
  const operatorStatusSource = operatorTemplateOpsSource;
  const releaseStagingOpsSource = readProjectFile('scripts/gwangju-seatmap-release-staging-ops.mjs');
  const releasePackageSource = releaseStagingOpsSource;
  const releaseGateSource = coreQaSource;
  const releaseAuditSource = releaseStagingOpsSource;
  const releaseScopeGuardSource = releaseStagingOpsSource;
  const prStagingPlanSource = releaseStagingOpsSource;
  const targetedStagingSource = releaseStagingOpsSource;
  const stagedScopeAuditSource = releaseStagingOpsSource;
  const operatorIntakeWriteOpsSource = readProjectFile('scripts/gwangju-seatmap-operator-intake-write-ops.mjs');
  const operatorApplySource = operatorIntakeWriteOpsSource;
  const operatorWriteSmokeSource = operatorIntakeWriteOpsSource;
  const operatorWriteGuardSource = operatorIntakeWriteOpsSource;
  const pixelComponentSource = coreQaSource;
  const evidenceWorksetOpsSource = readProjectFile('scripts/gwangju-seatmap-evidence-workset-ops.mjs');
  const artifactScopeAuditSource = readProjectFile('scripts/gwangju-seatmap-artifact-scope-audit.mjs');
  const imageTraceCandidateSource = evidenceWorksetOpsSource;
  const lowMarginCandidateSource = evidenceWorksetOpsSource;
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

  [
    '"qa:stadium:gwangju:mobile"',
    'node scripts/stadium-seatmap-ops.mjs gwangju mobile',
    '"stadium:gwangju:status"',
    'node scripts/stadium-seatmap-ops.mjs gwangju status',
    '"stadium:gwangju:pixel-components"',
    'node scripts/stadium-seatmap-ops.mjs gwangju pixel-components',
    '"stadium:gwangju:trace-manifest"',
    'node scripts/stadium-seatmap-ops.mjs gwangju trace-manifest',
    '"stadium:gwangju:operator-handoff"',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-handoff',
    '"stadium:gwangju:operator-status"',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-status',
    '"qa:stadium:gwangju:release-gate"',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-gate',
    '"qa:stadium:gwangju:release-verify"',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-verify',
  ].forEach((requiredText) => {
    assert.ok(packageSource.includes(requiredText), `Gwangju public package script should include ${requiredText}`);
  });

  [
    "'image-alignment-audit': [",
    "'image-alignment-audit:require-release': [",
    "'block-source-duplication-audit': [",
    "'trace-review': [",
    "'runtime-layer': [",
    "'release-package': [",
    "'release-audit': [",
    "'release-scope-guard': [",
    "'pr-staging-plan': [",
    "'pr-staging-review': [",
    "'targeted-staging': [",
    "'staged-scope-audit': [",
    "'pre-pr-final-gate': [",
    "'commit-readiness': [",
    "'release-verify:preoperator': [",
  ].forEach((requiredText) => {
    assert.ok(dispatcherSource.includes(requiredText), `Gwangju dispatcher should keep internal task ${requiredText}`);
  });

  [
    '"test:stadium:gwangju:seatmaps"',
    '"stadium:gwangju:image-alignment-audit"',
    '"stadium:gwangju:image-alignment-audit:require-release"',
    '"stadium:gwangju:block-source-duplication-audit"',
    '"stadium:gwangju:release-package"',
    '"stadium:gwangju:release-audit"',
    '"stadium:gwangju:release-scope-guard"',
    '"stadium:gwangju:pr-staging-plan"',
    '"stadium:gwangju:pr-staging-review"',
    '"stadium:gwangju:targeted-staging"',
    '"stadium:gwangju:staged-scope-audit"',
    '"stadium:gwangju:pre-pr-final-gate"',
    '"stadium:gwangju:commit-readiness"',
    '"qa:stadium:gwangju:runtime-layer"',
    '"qa:stadium:gwangju:trace-review"',
    '"qa:stadium:gwangju:release-verify:preoperator"',
    '"stadium:gwangju:image-trace-candidates"',
    '"stadium:gwangju:artifact-scope-audit"',
    '"stadium:gwangju:operator-template"',
    '"stadium:gwangju:operator-template:validate"',
    '"stadium:gwangju:operator-template:validate:strict"',
    '"stadium:gwangju:operator-template:apply-plan"',
    '"stadium:gwangju:operator-template:apply-plan:require-ready"',
    '"stadium:gwangju:operator-template:gate"',
    '"stadium:gwangju:precision-editor-dataset"',
    '"stadium:gwangju:precision-editor-patch:validate"',
    '"stadium:gwangju:precision-editor-patch:apply-plan"',
    '"stadium:gwangju:precision-editor-patch:gate"',
    '"stadium:gwangju:precision-editor-patch:write-guard"',
    '"stadium:gwangju:precision-editor-patch:postwrite-gate"',
    '"stadium:gwangju:operator-input-aid"',
    '"stadium:gwangju:operator-input-packet"',
    '"stadium:gwangju:operator-intake"',
    '"stadium:gwangju:operator-apply"',
    '"stadium:gwangju:operator-write-smoke"',
    '"stadium:gwangju:operator-write-guard"',
    '"stadium:gwangju:operator-write-guard:require-ready"',
    '"stadium:gwangju:operator-prewrite-gate"',
    '"stadium:gwangju:operator-apply:write"',
    '"stadium:gwangju:operator-postwrite-gate"',
    '"qa:stadium:gwangju:selected-sweep"',
    '"stadium:gwangju:zone-precision-worksets"',
    '"stadium:gwangju:low-margin-candidates"',
    '"qa:stadium:gwangju:release-verify:postoperator"',
  ].forEach((removedText) => {
    assert.equal(packageSource.includes(removedText), false, `Gwangju public package script should not expose ${removedText}`);
  });
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_DEEP_CHECK: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_DEBUG_CAPTURE: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_EXPANDED_EVIDENCE: '1'"));
  assert.ok(runnerSource.includes("STADIUM_UX_GWANGJU_SELECTED_SWEEP_ONLY: '1'"));
  assert.ok(auditSource.includes('selectedSweepStatus'));
  assert.ok(auditSource.includes('selectedSweepBlockers'));
  assert.ok(auditSource.includes('SELECTED_SWEEP_TARGET_NOT_SELECTED'));
  assert.ok(auditSource.includes('SELECTED_SWEEP_MISSING_VISUAL_PATH'));
  assert.ok(evidenceWorksetOpsSource.includes('FORBIDDEN_RELEASE_ARTIFACT_PATTERNS'));
  assert.ok(evidenceWorksetOpsSource.includes('FORBIDDEN_RELEASE_ARTIFACT'));
  assert.ok(evidenceWorksetOpsSource.includes('gwangju-seatmap-artifact-scope-audit.json'));
  assert.ok(evidenceWorksetOpsSource.includes('ARTIFACT_SCOPE_NOT_PASSED'));
  assert.ok(artifactScopeAuditSource.includes('GWANGJU_ARTIFACT_SCOPE_AUDIT_V1'));
  assert.ok(artifactScopeAuditSource.includes('gwangju-seatmap-artifact-scope-audit.json'));
  assert.ok(artifactScopeAuditSource.includes('_archive/gwangju-legacy-candidates'));
  assert.ok(artifactScopeAuditSource.includes('archive-manifest.json'));
  assert.ok(artifactScopeAuditSource.includes('legacy-third-base-retrace'));
  assert.ok(artifactScopeAuditSource.includes('legacy-third-base-independent-audit'));
  assert.ok(artifactScopeAuditSource.includes('LEGACY_DELETED_BLOCK_ID_IN_ACTIVE_THIRD_BASE_ARTIFACT'));
  assert.equal(evidenceWorksetOpsSource.includes('gwangju-v99-visual-baseline'), false);
  assert.equal(evidenceWorksetOpsSource.includes('VERSIONED_GWANGJU_VISUAL_BASELINE_ARCHIVE_ONLY'), false);
  assert.equal(evidenceWorksetOpsSource.includes('gwangju*-v[0-9]*'), false);
  assert.equal(evidenceWorksetOpsSource.includes('VERSIONED_GWANGJU_ARTIFACT_ARCHIVE_ONLY'), false);
  assert.equal(evidenceWorksetOpsSource.includes('gwangju*visual-hit-split*'), false);
  assert.equal(evidenceWorksetOpsSource.includes('VISUAL_HIT_SPLIT_AUDIT_ARCHIVE_ONLY'), false);
  assert.ok(evidenceWorksetOpsSource.includes('forbiddenReleaseArtifactCount'));
  assert.ok(runnerSource.includes("modeToken === 'EVIDENCE'"));
  assert.ok(runnerSource.includes("mode === 'evidence'"));
  assert.ok(pixelComponentSource.includes('gwangju-seatmap-pixel-components.json'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_IMAGE_TRACE_CANDIDATES_V1'));
  assert.ok(imageTraceCandidateSource.includes('official PNG 2200x1159 only'));
  assert.ok(imageTraceCandidateSource.includes('doesNotModifyDataFile'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_SEATMAP_IMAGE'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_BLOCKS'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_ZONE_PRECISION_WORKSETS'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_OP_COMPONENT_COVERAGE_REFERENCES'));
  assert.ok(imageTraceCandidateSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(imageTraceCandidateSource.includes('REUSES_EXISTING_TRACE_ONLY'));
  assert.ok(imageTraceCandidateSource.includes('candidatePath'));
  assert.ok(imageTraceCandidateSource.includes('officialComponentRecall'));
  assert.ok(imageTraceCandidateSource.includes('componentIoU'));
  assert.ok(imageTraceCandidateSource.includes('CURRENT_PATH_USED_FOR_COMPONENT_OWNERSHIP_HINT'));
  assert.ok(imageTraceCandidateSource.includes('P2_BOUNDARY_WATCH_BLOCK_IDS'));
  assert.ok(imageTraceCandidateSource.includes('P2_MERGED_COMPONENT_REFERENCES'));
  assert.ok(imageTraceCandidateSource.includes('p2-merged-official-components'));
  assert.ok(imageTraceCandidateSource.includes('P2_MERGED_COMPONENT_RECALL_THRESHOLD'));
  assert.ok(imageTraceCandidateSource.includes('P2_MERGED_COMPONENT_IOU_THRESHOLD'));
  assert.ok(imageTraceCandidateSource.includes('P2_PRODUCTION_REVIEWED_CURRENT_PATH_BLOCK_IDS'));
  assert.ok(imageTraceCandidateSource.includes('p2ProductionReviewedCurrentPathRows'));
  assert.ok(imageTraceCandidateSource.includes('P2_COMPONENT_OWNERSHIP_REQUIRES_MANUAL_REVIEW'));
  assert.ok(imageTraceCandidateSource.includes('P2_LABEL_COMPONENT_IS_ROW_STRIPE_ONLY'));
  assert.ok(imageTraceCandidateSource.includes('p2BoundaryWatchRows'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates.json'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates.csv'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates.md'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates-overlay.png'));
  assert.ok(imageTraceCandidateSource.includes('gwangju-seatmap-image-trace-candidates-crops'));
  assert.ok(imageTraceCandidateSource.includes('browser CSS pixels'));
  assert.ok(imageTraceCandidateSource.includes('resized screenshots'));
  assert.ok(imageTraceCandidateSource.includes('external crawling'));
  assert.ok(imageTraceCandidateSource.includes('web-search-based baseball data'));
  assert.ok(imageTraceCandidateSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
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
  assert.ok(operatorTemplateValidationSource.includes('OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP'));
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
  assert.ok(operatorHandoffSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke'));
  assert.ok(operatorHandoffSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready'));
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
  assert.ok(operatorStatusSource.includes('promotionModelWarnings'));
  assert.ok(operatorStatusSource.includes('DERIVED_RANGE_OFFICIAL_BLOCK_OVERLAP_IS_FILTER_ONLY'));
  assert.ok(operatorStatusSource.includes('EXISTING_NUMBERED_BLOCKS_ONLY'));
  assert.ok(operatorStatusSource.includes('STRICT_VALIDATION_NOT_RUN'));
  assert.ok(operatorStatusSource.includes('STRICT_VALIDATION_PENDING_OPERATOR_INPUT'));
  assert.ok(operatorStatusSource.includes('NO_VALID_DATA_DIFF_SECTIONS'));
  assert.ok(operatorStatusSource.includes('OPERATOR_INPUT_PENDING'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write'));
  assert.ok(operatorStatusSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate'));
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
  assert.ok(releasePackageSource.includes('OFFICIAL_DERIVED_MULTI_BLOCK_TRACE'));
  assert.ok(releasePackageSource.includes('doesNotModifyDataFile'));
  assert.ok(releasePackageSource.includes('REUSES_EXISTING_TRACE_ONLY'));
  assert.ok(releasePackageSource.includes('GWANGJU_EXPECTED_TRACE_BLOCK_COUNT'));
  assert.ok(releasePackageSource.includes('GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES'));
  assert.ok(releasePackageSource.includes('MISSING_RELEASE_ARTIFACT'));
  assert.ok(releasePackageSource.includes('OPERATOR_STATUS_NOT_READY'));
  assert.ok(releasePackageSource.includes('BROWSER_QA_STATUS_NOT_PASSED'));
  assert.ok(releasePackageSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releasePackageSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(releasePackageSource.includes('browser CSS pixels'));
  assert.ok(releasePackageSource.includes('web-search-based baseball data'));
  assert.ok(releasePackageSource.includes('officialDerivedAggregateReady'));
  assert.ok(releaseGateSource.includes('GWANGJU_SEATMAP_RELEASE_GATE_V1'));
  assert.ok(releaseGateSource.includes('releaseAcceptance'));
  assert.ok(releaseGateSource.includes("requiredStatus: 'passed'"));
  assert.ok(releaseGateSource.includes('requiredBlockers: 0'));
  assert.ok(releaseGateSource.includes('requiredCompletedSteps: commandPlan.length'));
  assert.ok(releaseGateSource.includes("requiredReleasePackageStatus: 'ready'"));
  assert.ok(releaseGateSource.includes("requiredOperatorStatus: 'ready'"));
  assert.ok(releaseGateSource.includes("requiredBrowserQaStatus: 'passed'"));
  assert.ok(releaseGateSource.includes("requiredRuntimeLayerAuditStatus: 'passed'"));
  assert.ok(releaseGateSource.includes('requiredActiveTraceBlocks: GWANGJU_EXPECTED_TRACE_BLOCK_COUNT'));
  assert.ok(releaseGateSource.includes('completedSteps'));
  assert.ok(releaseGateSource.includes('totalSteps'));
  assert.ok(releaseGateSource.includes("['check', 'expected', 'actual']"));
  assert.ok(releaseGateSource.includes('gwangju-seatmap-release-gate.json'));
  assert.ok(releaseGateSource.includes('gwangju-seatmap-release-gate.md'));
  assert.ok(releaseGateSource.includes("args: ['run', 'stadium:gwangju:operator-status']"));
  assert.ok(releaseGateSource.includes("command: 'node'"));
  assert.ok(releaseGateSource.includes("'--test-name-pattern'"));
  assert.ok(releaseGateSource.includes("'광주|Gwangju'"));
  assert.ok(releaseGateSource.includes("label: 'trace review artifacts'"));
  assert.ok(releaseGateSource.includes("args: ['existing', 'gwangju', 'trace-review', 'artifacts']"));
  assert.ok(releaseGateSource.includes('validateTraceReviewArtifacts'));
  assert.ok(releaseGateSource.includes("args: ['scripts/stadium-seatmap-ops.mjs', 'gwangju', 'release-package']"));
  assert.ok(releaseGateSource.includes("args: ['run', 'build']"));
  assert.ok(releaseGateSource.includes('doesNotModifyDataFile'));
  assert.ok(releaseGateSource.includes('RELEASE_PACKAGE_NOT_READY'));
  assert.ok(releaseGateSource.includes('OPERATOR_STATUS_NOT_READY'));
  assert.ok(releaseGateSource.includes('BROWSER_QA_NOT_PASSED'));
  assert.ok(releaseGateSource.includes('RUNTIME_LAYER_AUDIT_NOT_PASSED'));
  assert.ok(releaseGateSource.includes('RUNTIME_LAYER_PATH_MISMATCHES_PRESENT'));
  assert.ok(releaseGateSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releaseGateSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(releaseGateSource.includes('web-search-based baseball data'));
  assert.ok(releaseGateSource.includes('officialDerivedAggregateReady'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-release-scope-guard.json'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-runtime-layer-audit.json'));
  assert.ok(releaseAuditSource.includes('releaseScopeGuard'));
  assert.ok(releaseAuditSource.includes('runtimeLayerAudit'));
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
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-pr-staging-plan.json'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-targeted-staging.json'));
  assert.ok(releaseAuditSource.includes('gwangju-seatmap-staged-scope-audit.json'));
  assert.ok(releaseAuditSource.includes('prStagingPlan'));
  assert.ok(releaseAuditSource.includes('targetedStaging'));
  assert.ok(releaseAuditSource.includes('stagedScopeAudit'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_STATUS_CHANGED'));
  assert.ok(releaseAuditSource.includes('RUNTIME_LAYER_AUDIT_NOT_PASSED'));
  assert.ok(releaseAuditSource.includes('RUNTIME_LAYER_PATH_MISMATCHES_PRESENT'));
  assert.ok(releaseAuditSource.includes('PR_STAGING_PLAN_GIT_ADD_ENABLED'));
  assert.ok(releaseAuditSource.includes('STALE_PR_STAGING_PLAN_BEFORE_SCOPE_GUARD'));
  assert.ok(releaseAuditSource.includes('STALE_RELEASE_SCOPE_GUARD_BEFORE_HANDOFF'));
  assert.ok(releaseAuditSource.includes("requiredScopeGuardStatus: 'passed'"));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardUnexpectedFiles: 0'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardBlockers: 0'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardIncludedFiles: EXPECTED_RELEASE_PAYLOAD_FILE_COUNT'));
  assert.ok(releaseAuditSource.includes('requiredScopeGuardSeparateDirtyWorkBaselineFiles: SEPARATE_DIRTY_WORK_BASELINE_FILE_COUNT'));
  assert.ok(releaseAuditSource.includes('allowsClassifiedSeparateDirtyWorkExpansion: true'));
  assert.ok(releaseAuditSource.includes("requiredPatchSeparationReadiness: 'ready-or-review-required'"));
  assert.ok(releaseAuditSource.includes("requiredPrStagingPlanStatus: 'ready-or-review-required'"));
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
  assert.ok(releaseAuditSource.includes('releaseCandidateInventory.expectedIncludedFileCount=26'));
  assert.ok(releaseAuditSource.includes('separateWorkInventory.expectedSeparateDirtyWorkCount baseline=74'));
  assert.ok(releaseAuditSource.includes('separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true'));
  assert.ok(releaseAuditSource.includes('PR Packaging Manifest'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.releasePayloadFileCount=26'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.separateDirtyWorkFileCount='));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.unexpectedDirtyFileCount=0'));
  assert.ok(releaseAuditSource.includes('prPackagingManifest.inventoryDriftCount=0'));
  assert.ok(releaseAuditSource.includes('Patch Separation Readiness'));
  assert.ok(releaseAuditSource.includes('patchSeparationReadiness.status=ready-or-review-required'));
  assert.ok(releaseAuditSource.includes('stagedScopeAudit.expectedTargetFileCount=26'));
  assert.ok(releaseAuditSource.includes('STAGED_SCOPE_AUDIT_OUTSIDE_TARGETS_PRESENT'));
  assert.ok(releaseAuditSource.includes('STAGED_SCOPE_AUDIT_SEPARATE_DIRTY_WORK_PRESENT'));
  assert.ok(releaseAuditSource.includes('clean release payload files are not packaging blockers'));
  assert.ok(releaseAuditSource.includes('## Scope Guard'));
  assert.ok(releaseAuditSource.includes('## PR Staging Plan'));
  assert.ok(releaseAuditSource.includes('prStagingPlanSummary'));
  assert.ok(releaseAuditSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(releaseScopeGuardSource.includes('GWANGJU_RELEASE_SCOPE_GUARD_V1'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-release-scope-guard.json'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-release-scope-guard.md'));
  assert.ok(releaseScopeGuardSource.includes('expectedIncludedReleaseFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewedUntrackedIncludedReleaseFiles'));
  assert.ok(releaseScopeGuardSource.includes('expectedSeparateDirtyWorkFiles'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-evidence-workset-ops.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-operator-intake-write-ops.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-release-staging-ops.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-core-qa.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-artifact-scope-audit.mjs'));
  assert.ok(releaseScopeGuardSource.includes('scripts/gwangju-seatmap-block-source-duplication-audit.mjs'));
  assert.ok(releaseScopeGuardSource.includes('src/components/gwangju/GwangjuSeatMapSvg.tsx'));
  assert.ok(releaseScopeGuardSource.includes('src/components/MateResultsRuntime.tsx'));
  assert.ok(releaseScopeGuardSource.includes('src/components/ChatBotFloatingButton.tsx'));
  assert.ok(releaseScopeGuardSource.includes('src/components/ChatBotRuntime.tsx'));
  assert.ok(releaseScopeGuardSource.includes('build-budget-support'));
  assert.ok(releaseScopeGuardSource.includes('non-stadium-frontend-work'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-pr-staging-review.json'));
  assert.ok(releaseScopeGuardSource.includes('gwangju-seatmap-pr-staging-review.md'));
  assert.ok(releaseScopeGuardSource.includes("'pr-staging-review': ["));
  assert.ok(releaseScopeGuardSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review'));
  assert.ok(releaseScopeGuardSource.includes('prPackagingManifest'));
  assert.ok(releaseScopeGuardSource.includes('releasePayloadFileCount'));
  assert.ok(releaseScopeGuardSource.includes('separateDirtyWorkFileCount'));
  assert.ok(releaseScopeGuardSource.includes('unexpectedDirtyFileCount'));
  assert.ok(releaseScopeGuardSource.includes('inventoryDriftCount'));
  assert.ok(releaseScopeGuardSource.includes('patchSeparationReadiness'));
  assert.ok(releaseScopeGuardSource.includes('patchSeparationStatus'));
  assert.ok(releaseScopeGuardSource.includes('mixedStatusFiles'));
  assert.ok(releaseScopeGuardSource.includes('untrackedIncludedFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewedUntrackedIncludedFiles'));
  assert.ok(releaseScopeGuardSource.includes('reviewed expected untracked release files are ready for targeted staging'));
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
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.status=ready-or-review-required'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.doesNotRunGitAdd=true'));
  assert.ok(releaseScopeGuardSource.includes('stagingPlan.releasePayloadFileCount=26'));
  assert.ok(releaseScopeGuardSource.includes('stagedScopeAudit.expectedTargetFileCount=26'));
  assert.ok(releaseScopeGuardSource.includes('Release Candidate Inventory'));
  assert.ok(releaseScopeGuardSource.includes('Expected Included Release Files'));
  assert.ok(releaseScopeGuardSource.includes('Separate Workstream Baseline'));
  assert.ok(releaseScopeGuardSource.includes('git'));
  assert.ok(releaseScopeGuardSource.includes('status'));
  assert.ok(releaseScopeGuardSource.includes('includedRules'));
  assert.ok(releaseScopeGuardSource.includes('separateRules'));
  assert.ok(releaseScopeGuardSource.includes('Gwangju official derived aggregate release package'));
  assert.ok(releaseScopeGuardSource.includes('Daejeon work is explicitly outside the Gwangju release handoff scope'));
  assert.ok(releaseScopeGuardSource.includes('daejeon-files'));
  assert.ok(releaseScopeGuardSource.includes('Separate dirty work that must not be judged by this handoff'));
  assert.ok(releaseScopeGuardSource.includes('UNCLASSIFIED_DIRTY_FILE'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_CANDIDATE_FILE_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_CANDIDATE_FILE_UNEXPECTED'));
  assert.ok(releaseScopeGuardSource.includes('HANDOFF_SCOPE_SNIPPET_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('DISPATCHER_SCOPE_GUARD_TASK_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('RELEASE_LOCK_SCOPE_GUARD_SNIPPET_MISSING'));
  assert.ok(releaseScopeGuardSource.includes('daegu-files'));
  assert.ok(releaseScopeGuardSource.includes('sajik-files'));
  assert.ok(releaseScopeGuardSource.includes('suwon-files'));
  assert.ok(releaseScopeGuardSource.includes('cross-stadium-utilities'));
  assert.ok(releaseScopeGuardSource.includes('src/components/AppRoutes.tsx'));
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
  assert.ok(prStagingPlanSource.includes('reviewedUntrackedReadyFiles'));
  assert.ok(prStagingPlanSource.includes('targeted-git-add-after-whole-file-review'));
  assert.ok(prStagingPlanSource.includes('SEPARATE_FILE_HAS_INDEX_DIFF'));
  assert.ok(prStagingPlanSource.includes('manual-hunk-review-before-staging'));
  assert.ok(prStagingPlanSource.includes('manual-whole-file-review-before-git-add'));
  assert.ok(prStagingPlanSource.includes('RELEASE_PAYLOAD_COUNT_CHANGED'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.status=ready-or-review-required'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.doesNotRunGitAdd=true'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.safeToRunBulkGitAdd=false'));
  assert.ok(prStagingPlanSource.includes("stagingPlan.packageJsonStatus=${packageMixedStatus ?? 'none'}"));
  assert.ok(prStagingPlanSource.includes('stagingPlan.releasePayloadFileCount=26'));
  assert.ok(prStagingPlanSource.includes('stagingReview.status=ready-or-review-required'));
  assert.ok(prStagingPlanSource.includes('stagingReview.doesNotRunGitAdd=true'));
  assert.ok(prStagingPlanSource.includes('stagingReview.safeToRunBulkGitAdd=false'));
  assert.ok(prStagingPlanSource.includes('stagingReview.releasePayloadFileCount=26'));
  assert.ok(prStagingPlanSource.includes('stagingReview.recommendsOnlyIncludedFiles=true'));
  assert.ok(prStagingPlanSource.includes('stagingReview.doesNotRecommendSeparateDirtyWork=true'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.separateDirtyWorkFileCount=${separateDirtyWorkFileCount}'));
  assert.ok(prStagingPlanSource.includes('stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=${classifiedSeparateDirtyWorkExpansionAllowed}'));
  assert.ok(prStagingPlanSource.includes('git add .'));
  assert.ok(prStagingPlanSource.includes('operator-provided official PNG coordinates only'));
  assert.ok(prStagingPlanSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(targetedStagingSource.includes('GWANGJU_TARGETED_STAGING_V1'));
  assert.ok(targetedStagingSource.includes('gwangju-seatmap-targeted-staging.json'));
  assert.ok(targetedStagingSource.includes('gwangju-seatmap-targeted-staging.csv'));
  assert.ok(targetedStagingSource.includes('gwangju-seatmap-targeted-staging.md'));
  assert.ok(targetedStagingSource.includes('doesNotRunGitAdd: true'));
  assert.ok(targetedStagingSource.includes('safeToRunBulkGitAdd: false'));
  assert.ok(targetedStagingSource.includes('recommendsOnlyIncludedFiles: true'));
  assert.ok(targetedStagingSource.includes('doesNotRecommendSeparateDirtyWork: true'));
  assert.ok(targetedStagingSource.includes('explicit-file-list-only'));
  assert.ok(targetedStagingSource.includes('READY_TO_STAGE_COUNT_CHANGED'));
  assert.ok(targetedStagingSource.includes('SEPARATE_DIRTY_WORK_IN_TARGETS'));
  assert.ok(targetedStagingSource.includes('scripts/gwangju-seatmap-core-qa.mjs'));
  assert.ok(targetedStagingSource.includes('scripts/gwangju-seatmap-operator-template-ops.mjs'));
  assert.ok(targetedStagingSource.includes('git add .'));
  assert.ok(targetedStagingSource.includes('git add -A'));
  assert.ok(targetedStagingSource.includes('git commit -am'));
  assert.ok(targetedStagingSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
  assert.ok(stagedScopeAuditSource.includes('GWANGJU_STAGED_SCOPE_AUDIT_V1'));
  assert.ok(stagedScopeAuditSource.includes('gwangju-seatmap-staged-scope-audit.json'));
  assert.ok(stagedScopeAuditSource.includes('gwangju-seatmap-staged-scope-audit.csv'));
  assert.ok(stagedScopeAuditSource.includes('gwangju-seatmap-staged-scope-audit.md'));
  assert.ok(stagedScopeAuditSource.includes('git diff'));
  assert.ok(stagedScopeAuditSource.includes('--cached'));
  assert.ok(stagedScopeAuditSource.includes('--require-complete'));
  assert.ok(stagedScopeAuditSource.includes('requireComplete'));
  assert.ok(stagedScopeAuditSource.includes('doesNotRunGitAdd: true'));
  assert.ok(stagedScopeAuditSource.includes('safeToRunBulkGitAdd: false'));
  assert.ok(stagedScopeAuditSource.includes('acceptsOnlyTargetedStagingFiles: true'));
  assert.ok(stagedScopeAuditSource.includes('blocksSeparateDirtyWork: true'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_FILE_OUTSIDE_TARGETS'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_SEPARATE_DIRTY_WORK'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_TARGET_DELETED'));
  assert.ok(stagedScopeAuditSource.includes('STAGED_TARGET_FILE_MISSING'));
  assert.ok(stagedScopeAuditSource.includes('missingStagedTargetFileCount'));
  assert.ok(stagedScopeAuditSource.includes('stagedScopeAudit.requireComplete'));
  assert.ok(stagedScopeAuditSource.includes('readyForCommit'));
  assert.ok(stagedScopeAuditSource.includes('git add .'));
  assert.ok(stagedScopeAuditSource.includes('git add -A'));
  assert.ok(stagedScopeAuditSource.includes('git commit -am'));
  assert.ok(stagedScopeAuditSource.includes('MANUAL_BASEBALL_DATA_REQUIRED'));
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
  assert.ok(operatorApplySource.includes('OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP'));
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
  assert.ok(operatorWriteSmokeSource.includes('scripts/gwangju-seatmap-operator-intake-write-ops.mjs'));
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
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-smoke'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-write-guard:require-ready'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write'));
  assert.ok(operatorRunbookSource.includes('node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate'));
  assert.ok(operatorRunbookSource.includes('docs/gwangju-seatmap-release-handoff.md'));
  assert.ok(operatorRunbookSource.includes('현재 release-ready 상태와 K7/AWAY 공식 derived aggregate filter 계약'));
  assert.ok(operatorRunbookSource.includes('synthetic K7/AWAY 입력'));
  assert.ok(operatorRunbookSource.includes('production 야구 데이터가 아니며'));
  [
    'release mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    'release gate: `npm run qa:stadium:gwangju:release-gate`',
    'coordinate system: `2200x1159`',
    'active block count: `113`',
    'aggregate hit-area mode: `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE,REUSES_EXISTING_TRACE_ONLY`',
    'K7/AWAY aggregate hit-areas are enabled within the current `113` active block release through official numbered-block aggregate geometry.',
    'release gate status: `passed`',
    'release gate blockers: `0`',
    'release gate steps: `5/5`',
    'release package status: `ready`',
    'operator status: `ready`',
    'browser QA status: `passed`',
    'runtime layer audit status: `passed`',
    'active trace blocks: `113`',
    'runtime layer audit: `node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer`',
    'commit readiness gate: `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness`',
    'missing baseball data contract: `MANUAL_BASEBALL_DATA_REQUIRED`',
    '`K7석`: `107~111`, `118~122`',
    '`원정응원석`: `107~110`',
    '`홈 응원석`: `118~122`',
    '`111`: `K7` category, `fanRole: NEUTRAL`',
    '`home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    '`away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    '`K7석`, `원정응원석` aggregate hit-areas use `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`.',
    '`SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.',
    'operator-provided official PNG coordinates only',
    'browser CSS pixels',
    'resized screenshots',
    'external crawling',
    'web-search-based baseball data',
    'third-party copied seatmap images',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-prewrite-gate',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-apply:write',
    'node scripts/stadium-seatmap-ops.mjs gwangju operator-postwrite-gate',
    'K7/AWAY official derived aggregate filter hit-areas',
  ].forEach((requiredText) => {
    assert.ok(releaseHandoffSource.includes(requiredText), `Gwangju release handoff should include ${requiredText}`);
  });
  assert.ok(auditSource.includes('verifyGwangjuOverlayClicks'));
  assert.ok(auditSource.includes('readGwangjuTraceManifestBlocks'));
  assert.ok(auditSource.includes('expectedLabelTargetCount'));
  assert.ok(auditSource.includes("['home-k7-seats', 'away-cheering-seats'].includes(entry.id)"));
  assert.ok(auditSource.includes('Gwangju runtime layer must render release-ready manifest paths only'));
  assert.ok(auditSource.includes('runtimeLayerAudit'));
  assert.ok(auditSource.includes('pathMismatchCount'));
  assert.ok(auditSource.includes('forbiddenRenderedIds'));
  assert.ok(auditSource.includes('Gwangju label coordinate top-hit failures'));
  assert.ok(auditSource.includes('markerClickPoints'));
  assert.ok(auditSource.includes('Gwangju K7/AWAY sections must be official-traced before becoming clickable'));
  assert.ok(auditSource.includes('Gwangju marker-only point should not select a seat block'));
  assert.ok(auditSource.includes('rect.width > 0 && rect.height > 0'));
  assert.ok(auditSource.includes('selected=${JSON.stringify(selectedAfterMarkerClick)}'));
  assert.ok(auditSource.includes('Gwangju marker-only point should not open seat details'));
  assert.ok(auditSource.includes('clickGwangjuFilter'));
  assert.ok(auditSource.includes('Gwangju infield filter should keep infield seat blocks interactive.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should expose the K7 aggregate hit-area.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should replace away source K7 blocks with the aggregate hit-area.'));
  assert.ok(auditSource.includes('Gwangju K7 filter should replace home source K7 blocks with the aggregate hit-area.'));
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
    '`gwangju-precision-v1`',
    '`manual-polygon-v113`',
    '`GWANGJU_PRECISION_V1`',
    '`activeBlocks=113`',
    '`GWANGJU_BASE_TRACE_BLOCK_COUNT === 111`',
    '`GWANGJU_EXPECTED_TRACE_BLOCK_COUNT === 113`',
    '`officialImageTracedBlocks=113`',
    '`directOfficialTraceBlocks=113`',
    '`manualReviewedBlocks=113`',
    '`pixelAlignedBlocks=113`',
    '`fullRetracedBlocks=113`',
    '`blocksChangedFromPreviousTrace=113`',
    '`totalRetracePointDelta=7222`',
    '`overlapWarnings=0`',
    '`minimumPixelCoverageRatio=1.0000`',
    '`componentCoverageWarnings=0`',
    '`minimumOfficialComponentRecall=1.0000`',
    '`minimumComponentIoU=0.9255`',
    '`repeatedNumberedBlockMinimumPixelCoverageRatio=1.0000`',
    '`GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE === true`',
    '`GWANGJU_SEATMAP_COORDINATES_READY === true`',
    '`operatorRequiredSections=-`',
    '`K7석`: `107`, `108`, `109`, `110`, `111`, `118`, `119`, `120`, `121`, `122`',
    '`원정응원석`: `107`, `108`, `109`, `110`',
    '`홈 응원석`: `118`, `119`, `120`, `121`, `122`',
    '`111`: `K7` 카테고리지만 `fanRole: NEUTRAL`',
    '`내야석`: K7 `107~111`, `118~122` 전체를 포함한다.',
    '`K7석`: `home-k7-seats` aggregate hit-area를 노출하고 source 번호 블럭 hit-area는 해당 필터에서 숨긴다.',
    '`응원석`: `fanRole: HOME/AWAY`인 K7 `107~110`, `118~122`만 포함한다.',
    '`홈 응원석`: K7 `118~122`만 포함한다.',
    '`원정응원석`: `away-cheering-seats` aggregate hit-area를 노출하고 source `107~110` 번호 블럭 hit-area는 해당 필터에서 숨긴다.',
    '`GWANGJU_DERIVED_OPERATOR_BLOCK_RANGES`',
    '`derived-k7-seats`: `filterGroupId=k7`, `displayBlocks=107~111, 118~122`, `aggregateHitArea=OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`derived-away-cheering-seats`: `filterGroupId=away-cheering`, `displayBlocks=107~110`, `fanRoles=AWAY`, `aggregateHitArea=OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`derived-home-cheering-seats`: `filterGroupId=home-cheering`, `displayBlocks=118~122`, `fanRoles=HOME`, `aggregateHitArea=REUSES_EXISTING_TRACE_ONLY`',
    '`operatorPolygonStatus`는 `OFFICIAL_DERIVED_READY`',
    'K7/AWAY derived range는 UX 표시/필터 계약과 filter 전용 aggregate hit-area를 함께 제공한다.',
    '현재 release 기준은 active 113개이다.',
    '`home-k7-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    '`away-cheering-seats`: `READY`, `OFFICIAL_IMAGE_TRACED`, `PIXEL_ALIGNED`, `manualReviewed: true`',
    'K7/AWAY aggregate hit-area는 공식 PNG `2200x1159` 기준 검수 완료 번호 블럭 subpath만 합성한다.',
    'active block 기준은 `111`에서 `113`으로 전환되어 있다.',
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
    '`reports/stadium/gwangju-seatmap-runtime-layer-audit.md`',
    '`reports/stadium/gwangju-seatmap-runtime-layer-audit.json`',
    '`reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    '`reports/stadium/gwangju-seatmap-release-scope-guard.json`',
    'PR packaging manifest: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    'Targeted staging report: `reports/stadium/gwangju-seatmap-targeted-staging.md`',
    'Targeted staging report JSON: `reports/stadium/gwangju-seatmap-targeted-staging.json`',
    'Staged scope audit: `reports/stadium/gwangju-seatmap-staged-scope-audit.md`',
    'Staged scope audit JSON: `reports/stadium/gwangju-seatmap-staged-scope-audit.json`',
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
    'node scripts/stadium-seatmap-ops.mjs gwangju trace-review',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-package',
    'npm run qa:stadium:gwangju:release-gate',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard',
    'node scripts/stadium-seatmap-ops.mjs gwangju targeted-staging',
    'node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness',
    'npm run build',
    '`pending=0`',
    '`validDataDiff=2`',
    '`blockers=0`',
    '광주 계약 PASS',
    '`status=ready`',
    '`derivedRanges=3`',
    '`status=passed`',
    '`steps=5/5`',
    '`included=26`',
    '`separate=<runtime>`',
    '`unexpected=0`',
    '`inventoryDrift=0`',
    '`scopeGuardStatus=passed`',
    '`scopeGuardIncludedFiles=26`',
    '`scopeGuardSeparateDirtyWorkFiles=<runtime>`',
    '`scopeGuardSeparateDirtyWorkBaselineFiles=74`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`scopeGuardUnexpectedFiles=0`',
    '`scopeGuardBlockers=0`',
    '`releasePackageStatus=ready`',
    '`operatorStatus=ready`',
    '`browserQaStatus=passed`',
    '`runtimeLayerAuditStatus=passed`',
    '`activeTraceBlocks=113`',
    'current K7/AWAY aggregate release is already active at `activeBlocks=113`',
    'preoperator 통과 + official derived aggregate release + scope guard 통과',
    'release-gate -> targeted-staging -> staged-scope-audit -> release-audit',
    '`commit-readiness`는 `targeted-staging -> staged-scope-audit --require-complete -> release-audit` 순서이다.',
    'release scope guard가 광주 release package와 Daegu/Daejeon/Sajik/Suwon 분리 범위를 구분하지 못하거나 알 수 없는 dirty file을 감지한다.',
    'PR packaging manifest가 광주 release 후보 26개, separate dirty work baseline 74개, runtime classified separate dirty work, unexpected 0, blockers 0 기준을 한 문서로 고정하지 못한다.',
    'release scope guard의 release candidate inventory가 `expectedIncludedFileCount=26`, `actualIncludedFileCount=26`, `missingExpectedIncludedFiles=[]`, `extraIncludedFiles=[]` 상태를 잃는다.',
    'release scope guard의 separate work inventory가 `expectedSeparateDirtyWorkCount baseline=74`, `classifiedSeparateDirtyWorkExpansionAllowed=true` 상태를 잃거나 classified separate dirty work를 blocker로 처리한다.',
    'release scope guard의 `prPackagingManifest.releasePayloadFileCount=26`, `separateDirtyWorkFileCount=<runtime>`, `unexpectedDirtyFileCount=0`, `inventoryDriftCount=0` 상태를 잃는다.',
    'release scope guard의 `patchSeparationReadiness.status=ready-or-review-required` 상태를 잃거나 clean release payload files are not packaging blockers 계약을 숨긴다.',
    'patch separation readiness가 release payload files have unreviewed mixed or untracked diffs 상태에서만 review-required가 됨을 문서화하지 않는다.',
    'PR staging plan이 `stagingPlan.status=ready-or-review-required`, `stagingPlan.doesNotRunGitAdd=true`, `stagingPlan.safeToRunBulkGitAdd=false`, `stagingPlan.releasePayloadFileCount=26`, `stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true` 계약을 잃는다.',
    'PR staging review가 `stagingReview.status=ready-or-review-required`, `stagingReview.doesNotRunGitAdd=true`, `stagingReview.safeToRunBulkGitAdd=false`, `stagingReview.releasePayloadFileCount=26`, `stagingReview.recommendsOnlyIncludedFiles=true`, `stagingReview.doesNotRecommendSeparateDirtyWork=true` 계약을 잃는다.',
    'targeted staging report가 `targetedStaging.status=ready`, `targetedStaging.doesNotRunGitAdd=true`, `targetedStaging.safeToRunBulkGitAdd=false`, `targetedStaging.targetFileCount=26`, `targetedStaging.reviewedUntrackedSatisfiedFileCount=5` 계약을 잃는다.',
    'targeted staging report가 separate dirty work를 staging 대상으로 추천하거나 `git add .`, `git add -A`, `git commit -am`을 허용한다.',
    'staged scope audit가 `stagedScopeAudit.status=ready`, `stagedScopeAudit.doesNotRunGitAdd=true`, `stagedScopeAudit.safeToRunBulkGitAdd=false`, `stagedScopeAudit.expectedTargetFileCount=26`, `stagedScopeAudit.stagedOutsideTargetFileCount=0`, `stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0` 계약을 잃는다.',
    'staged scope audit가 targeted staging 파일 외 staged 파일이나 separate dirty work staged 파일을 허용한다.',
    'commit-readiness가 `--require-complete` strict mode를 잃거나, 명시적 26-file staging 전 `STAGED_TARGET_FILE_MISSING`으로 실패하지 않는다.',
    'commit-readiness가 모든 targeted file staged 이후 `stagedScopeAudit.requireComplete=true`, `stagedScopeAudit.missingStagedTargetFileCount=0`, `readyForCommit=true` 계약을 고정하지 못한다.',
    '`prPackagingManifest.releasePayloadFileCount=26`',
    '`prPackagingManifest.separateDirtyWorkFileCount=<runtime>`',
    '`prPackagingManifest.unexpectedDirtyFileCount=0`',
    '`prPackagingManifest.inventoryDriftCount=0`',
    '`patchSeparationReadiness.status=ready-or-review-required`',
    'clean release payload files are not packaging blockers',
    'node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'stagingReview.status=ready-or-review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=26',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
    '## 남은 작업',
    '`activeBlocks=113`',
    '`operatorStatus=ready`',
    '`OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`',
    '공식 derived aggregate filter',
    '실제 클릭 대상이 필요한 non-overlap operator target',
  ].forEach((requiredText) => {
    assert.ok(releaseLockSource.includes(requiredText), `release lock should include ${requiredText}`);
  });

  [
    "export const GWANGJU_OPERATOR_BLOCK_RANGE_REUSES_EXISTING_TRACE = true",
    "export const GWANGJU_PREVIOUS_TRACE_VERSION = 'manual-polygon-v113'",
    "export const GWANGJU_FULL_RETRACE_VERSION = 'gwangju-precision-v1'",
    "export const GWANGJU_FULL_RETRACE_GENERATION: GwangjuTraceGeneration = 'GWANGJU_PRECISION_V1'",
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
    "{ id: 'k7', label: 'K7석', cats: ['K7'],",
    "{ id: 'cheering', label: '응원석', cats: ['K7', 'AWAY'], fanRoles: ['HOME', 'AWAY'],",
    "{ id: 'home-cheering', label: '홈 응원석', cats: ['K7'], fanRoles: ['HOME'],",
    "{ id: 'away-cheering', label: '원정응원석', cats: ['AWAY'], fanRoles: ['AWAY'],",
    "status: 'READY'",
    'matchesGwangjuCategoryGroup',
  ].forEach((requiredText) => {
    assert.ok(dataSource.includes(requiredText), `Gwangju data should include ${requiredText}`);
  });

  [
    '광주 K7/원정응원석 운영자 블럭 범위는 공식 번호 블럭 기반 aggregate hit-area에 연결한다',
    '광주 K7/AWAY derived range는 기존 traced block과 aggregate hit-area를 서비스 필터에 연결한다',
    '광주 K7/AWAY는 공식 번호 블럭 aggregate로 active 113개 상태를 유지한다',
    '광주 응원석 필터는 K7 번호 블럭을 fanRole 기준으로 분리한다',
    'GWANGJU_BASE_TRACE_BLOCK_COUNT, 111',
    'GWANGJU_IMAGE_GEOMETRY_DRAFTS[block.id]',
    "assert.deepEqual(k7Blocks, [...GWANGJU_K7_OFFICIAL_BLOCKS, 'K7석'].sort())",
    "assert.equal(k7Range?.filterGroupId, 'k7')",
    "assert.equal(k7Range?.displayBlocks, '107~111, 118~122')",
    "getGwangjuDerivedOperatorRangesForBlock('k7-107')",
    "assert.equal(k7Range?.aggregateHitArea, 'OFFICIAL_DERIVED_MULTI_BLOCK_TRACE')",
    "assert.equal(blocksByOfficialBlock.get('111')?.fanRole, 'NEUTRAL')",
    "assert.equal(GWANGJU_BLOCKS.filter((block) => block.category === 'AWAY').length, 1)",
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
    'gwangju-browser-coordinate-audit',
    '101-108-h-i-j-browser-coordinate-crop',
    'svgViewBox',
    'svgScreenRect',
    'preserveAspectRatio',
    'first-wheelchair-seats',
    'party-seats-first',
  ].forEach((requiredText) => {
    assert.ok(auditSource.includes(requiredText), `Gwangju browser coordinate audit should include ${requiredText}`);
  });

  [
    '`K7석`: `107~111`, `118~122`',
    '`원정응원석`: `107~110`',
    '`홈 응원석`: `118~122`',
    '선택된 파생 필터는 `displayBlocks` 요약을 표시한다',
    '현재 production data는 이 공식 번호 블럭 polygon을 multi-subpath aggregate로 묶어 `home-k7-seats`, `away-cheering-seats` filter 전용 hit-area를 제공하므로 active block 수는 `113`이다.',
    '현재 최종 trace 기준은 기본 111개 + 공식 derived aggregate 2개, 총 active 113개이다.',
    '공식 PNG 검수 번호 블럭 polygon을 합성한 `OFFICIAL_DERIVED_MULTI_BLOCK_TRACE` 상태다.',
    '`OPERATOR_SECTION_OFFICIAL_BLOCK_OVERLAP`',
    'non-overlap 구역만 별도 operator target',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-package',
    'npm run qa:stadium:gwangju:release-gate',
    'reports/stadium/gwangju-seatmap-release-package.json',
    'reports/stadium/gwangju-seatmap-release-gate.json',
    'docs/gwangju-seatmap-release-handoff.md',
    'gwangju-browser-coordinate-audit',
    'gwangju-browser-101-108-h-i-j-browser-coordinate-crop',
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
    '`OFFICIAL_DERIVED_MULTI_BLOCK_TRACE`',
    '`OFFICIAL_DERIVED_READY`',
    '`MANUAL_BASEBALL_DATA_REQUIRED`',
    '`SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.',
    '`status=passed`',
    '`blockers=0`',
    '`steps=5/5`',
    '`operatorStatus=ready`',
    '`browserQaStatus=passed`',
    '`runtimeLayerAuditStatus=passed`',
    '`activeTraceBlocks=113`',
    'runtime layer audit: `node scripts/stadium-seatmap-ops.mjs gwangju runtime-layer`',
    'runtime layer audit status: `passed`',
    'release scope guard: `node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard`',
    'release scope guard status: `passed`',
    'release scope guard included release files: `26`',
    'release scope guard dirty files: runtime classified count',
    'release scope guard dirty included release files: runtime classified count',
    'release scope guard separate dirty work files: runtime classified count',
    'release scope guard separate dirty work baseline files: `74`',
    'classified separate dirty work expansion allowed: `true`',
    'release scope guard unexpected files: `0`',
    'release scope guard blockers: `0`',
    'release scope guard inventory drift: `0`',
    'patch separation readiness: `ready` or `review-required`',
    'patch separation mixed status: `none` unless release payload files have unreviewed mixed or untracked diffs',
    'PR staging plan status: `ready` or `review-required`',
    'PR staging plan does not run git add: `true`',
    'PR staging plan bulk git add allowed: `false`',
    'staged scope audit require complete: `false`',
    'staged scope audit missing staged target files: `<dirty-target-count>` before explicit staging',
    'commit readiness before explicit staging: `blocked expected`',
    'commit readiness after explicit 26-file staging: must pass with `stagedScopeAudit.requireComplete=true` and `stagedScopeAudit.missingStagedTargetFileCount=0`',
    '`release-verify` runs `release-gate -> targeted-staging -> staged-scope-audit -> release-audit`.',
    '`releaseScopeGuardStatus=passed`',
    '`releaseScopeGuardIncludedFiles=26`',
    '`releaseScopeGuardDirtyFiles=runtime`',
    '`releaseScopeGuardDirtyIncludedFiles=runtime`',
    '`releaseScopeGuardSeparateDirtyWorkFiles=runtime`',
    '`releaseScopeGuardSeparateDirtyWorkBaselineFiles=74`',
    '`classifiedSeparateDirtyWorkExpansionAllowed=true`',
    '`releaseScopeGuardUnexpectedFiles=0`',
    '`releaseScopeGuardBlockers=0`',
    '`releaseScopeGuardInventoryDrift=0`',
    '`patchSeparationReadiness=ready-or-review-required`',
    '`patchSeparationPackageStatus=none-or-mixed`',
    '`stagingPlanStatus=ready-or-review-required`',
    '`stagingPlanDoesNotRunGitAdd=true`',
    '`stagingPlanSafeToRunBulkGitAdd=false`',
    '`stagedScopeAuditRequireComplete=false`',
    '`stagedScopeAuditMissingTargetFiles=<dirty-target-count>-before-staging`',
    'gwangju-seatmap-release-scope-guard.json',
    'gwangju-seatmap-release-scope-guard.md',
    'gwangju-seatmap-runtime-layer-audit.json',
    'gwangju-seatmap-runtime-layer-audit.csv',
    'gwangju-seatmap-runtime-layer-audit.md',
    'gwangju-seatmap-pr-staging-plan.json',
    'gwangju-seatmap-pr-staging-plan.md',
    'gwangju-seatmap-pr-staging-review.json',
    'gwangju-seatmap-pr-staging-review.md',
    'gwangju-seatmap-targeted-staging.json',
    'gwangju-seatmap-targeted-staging.csv',
    'gwangju-seatmap-targeted-staging.md',
    'gwangju-seatmap-staged-scope-audit.json',
    'gwangju-seatmap-staged-scope-audit.csv',
    'gwangju-seatmap-staged-scope-audit.md',
    'node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-plan',
    'node scripts/stadium-seatmap-ops.mjs gwangju pr-staging-review',
    'node scripts/stadium-seatmap-ops.mjs gwangju targeted-staging',
    'node scripts/stadium-seatmap-ops.mjs gwangju staged-scope-audit',
    'node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness',
    'node scripts/stadium-seatmap-ops.mjs gwangju release-scope-guard',
    'Release Candidate Inventory',
    'PR Packaging Manifest',
    'PR packaging manifest source of truth: `reports/stadium/gwangju-seatmap-release-scope-guard.md`',
    'Release PR scope: Gwangju official derived aggregate release package and build verification reports.',
    'Excluded PR scope: Daegu work, Daejeon work, Sajik work, Suwon work, and cross-stadium utilities.',
    'Included release candidate files: `26`',
    'Separate dirty work files: runtime classified count',
    'Separate dirty work baseline files: `74`',
    'Classified separate dirty work expansion allowed: `true`',
    'Inventory drift: `0`',
    'releaseCandidateInventory.expectedIncludedFileCount=26',
    'separateWorkInventory.expectedSeparateDirtyWorkCount baseline=74',
    'actualSeparateDirtyWorkCount=<runtime>',
    'separateWorkInventory.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'prPackagingManifest.releasePayloadFileCount=26',
    'prPackagingManifest.separateDirtyWorkFileCount=<runtime>',
    'prPackagingManifest.unexpectedDirtyFileCount=0',
    'prPackagingManifest.inventoryDriftCount=0',
    'Patch Separation Readiness',
    'patchSeparationReadiness.status=ready-or-review-required',
    'patchSeparationReadiness only becomes `review-required` when release payload files have unreviewed mixed or untracked diffs.',
    'reviewed expected untracked release files are ready for targeted staging.',
    'clean release payload files are not packaging blockers',
    'PR Staging Plan',
    'stagingPlan.status=ready-or-review-required',
    'stagingPlan.doesNotRunGitAdd=true',
    'stagingPlan.safeToRunBulkGitAdd=false',
    'stagingPlan.releasePayloadFileCount=26',
    'stagingPlan.classifiedSeparateDirtyWorkExpansionAllowed=true',
    'stagingReview.status=ready-or-review-required',
    'stagingReview.doesNotRunGitAdd=true',
    'stagingReview.safeToRunBulkGitAdd=false',
    'stagingReview.releasePayloadFileCount=26',
    'stagingReview.recommendsOnlyIncludedFiles=true',
    'stagingReview.doesNotRecommendSeparateDirtyWork=true',
    'Targeted Staging Report',
    'targetedStaging.status=ready',
    'targetedStaging.doesNotRunGitAdd=true',
    'targetedStaging.safeToRunBulkGitAdd=false',
    'targetedStaging.recommendsOnlyIncludedFiles=true',
    'targetedStaging.doesNotRecommendSeparateDirtyWork=true',
    'targetedStaging.targetFileCount=26',
    'targetedStaging.reviewedUntrackedSatisfiedFileCount=5',
    'Staged Scope Audit',
    'stagedScopeAudit.status=ready',
    'stagedScopeAudit.requireComplete=false',
    'stagedScopeAudit.doesNotRunGitAdd=true',
    'stagedScopeAudit.safeToRunBulkGitAdd=false',
    'stagedScopeAudit.acceptsOnlyTargetedStagingFiles=true',
    'stagedScopeAudit.blocksSeparateDirtyWork=true',
    'stagedScopeAudit.expectedTargetFileCount=26',
    'stagedScopeAudit.missingStagedTargetFileCount=<dirty-target-count> before explicit staging',
    'stagedScopeAudit.stagedOutsideTargetFileCount=0',
    'stagedScopeAudit.stagedSeparateDirtyWorkFileCount=0',
    'strict commit-readiness mode: `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness`',
    'strict commit-readiness adds `--require-complete` and blocks with `STAGED_TARGET_FILE_MISSING` until all dirty targeted release files are staged.',
    'Run `node scripts/stadium-seatmap-ops.mjs gwangju pre-pr-final-gate` before staging. Run `node scripts/stadium-seatmap-ops.mjs gwangju commit-readiness` only after explicit `git add -- <26 target files>`.',
    'explicit-file-list-only',
    'Review focus files: `package.json`, `src/components/StadiumGuideRuntimeSeatMaps.test.ts`, `src/components/ChatBotFloatingButton.tsx`, `src/components/ChatBotRuntime.tsx`, `src/components/MateResultsRuntime.tsx`, `reports/bundle-guard-report.json`, `reports/dist-assets-report.json`.',
    'RELEASE_CANDIDATE_FILE_MISSING',
    'CLASSIFIED_SEPARATE_DIRTY_WORK_ADDED',
    'Gwangju release package',
    'Separate dirty work that must not be judged by this handoff',
    'Daejeon files',
    'Sajik files',
    'Suwon files',
    'Daegu files',
    'src/components/AppRoutes.tsx',
    'src/utils/seatMapPolygonValidator.ts',
    'K7/AWAY aggregate hit-areas are enabled within the current `113` active block release through official numbered-block aggregate geometry.',
    '`SPECIAL_BLOCKS` includes K7/AWAY aggregate block definitions.',
    '`GWANGJU_IMAGE_GEOMETRY_DRAFTS` includes `home-k7-seats` and `away-cheering-seats` geometry generated from official traced source blocks.',
    'Do not replace the current `113` active block aggregate release with new operator geometry unless',
    'future independent operator polygon inputs that share `officialBlocks` must be split into non-overlapping targets first',
  ].forEach((requiredText) => {
    assert.ok(releaseHandoffSource.includes(requiredText), `Gwangju handoff should include ${requiredText}`);
  });

  [
    'Gwangju cheering filter should hide neutral K7 block 111.',
    'Gwangju K7 filter should expose the K7 aggregate hit-area.',
    'Gwangju K7 filter should replace away source K7 blocks with the aggregate hit-area.',
    'Gwangju K7 filter should replace home source K7 blocks with the aggregate hit-area.',
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
