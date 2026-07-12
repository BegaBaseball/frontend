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
      'src/assets/stadiums/lg/jamsil-lg-seatmap-default-2026.webp',
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
    badgeLabel: '대구 삼성 라이온즈파크 공식 좌석도',
    requiredFiles: [
      'src/assets/stadiums/samsung/daegu-samsung-seatmap-official-2026.webp',
      'src/assets/stadiums/samsung/daegu-operator-reference-rapak-2025-enhanced-transparent.webp',
    ],
  },
  {
    presetId: 'daejeon',
    folder: 'daejeon',
    componentName: 'DaejeonSeatMap',
    dataFile: 'daejeonSeatData.ts',
    badgeLabel: '대전 한화생명볼파크 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/hanwha/daejeon-hanwha-life-eagles-park-seatmap-official-2026.webp'],
  },
  {
    presetId: 'gocheok',
    folder: 'gocheok',
    componentName: 'GocheokSeatMap',
    dataFile: 'gocheokSeatData.ts',
    badgeLabel: '고척 키움 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.webp'],
  },
  {
    presetId: 'gwangju',
    folder: 'gwangju',
    componentName: 'GwangjuSeatMap',
    dataFile: 'gwangjuSeatData.ts',
    badgeLabel: '광주 KIA 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/kia/gwangju-kia-seatmap-official-2026.webp'],
  },
  {
    presetId: 'changwon',
    folder: 'changwon',
    componentName: 'ChangwonSeatMap',
    dataFile: 'changwonSeatData.ts',
    badgeLabel: '창원 NC 공식 좌석도',
    requiredFiles: ['src/assets/stadiums/nc/changwon-nc-seatmap-official-2026.webp'],
  },
  {
    presetId: 'sajik',
    folder: 'sajik',
    componentName: 'SajikSeatMap',
    dataFile: 'sajikSeatData.ts',
    badgeLabel: '사직 롯데 공식 좌석도',
    requiredFiles: [
      'src/assets/stadiums/lotte/sajik-seatmap-operator-reference-2026.webp',
      'src/assets/stadiums/lotte/sajik-lotte-seatmap-official-2026.webp',
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

const STADIUM_TEAM_FALLBACK_CASES = [
  { stadiumId: '??', stadiumName: null, stadiumTeam: 'LG/두산', expectedPresetId: 'jamsil' },
  { stadiumId: '??', stadiumName: '서울잠실야구장', stadiumTeam: 'LG 트윈스', expectedPresetId: 'jamsil' },
  { stadiumId: '??', stadiumName: null, stadiumTeam: 'LG두산', expectedPresetId: 'jamsil' },
  { stadiumId: '??', stadiumName: '잠실 야구장', stadiumTeam: '두산 베어스', expectedPresetId: 'jamsil' },
  { stadiumId: 'JAMSIL', stadiumName: '서울 잠실', stadiumTeam: 'Doosan Bears', expectedPresetId: 'jamsil' },
] as const;

const OPERATIONAL_STADIUM_SEAT_MAP_ENTRIES = [
  { stadiumId: 'JAMSIL', stadiumName: '서울 · 잠실야구장', stadiumTeam: 'LG/두산', expectedPresetId: 'jamsil' },
  { stadiumId: 'INCHEON', stadiumName: '인천 · SSG랜더스필드', stadiumTeam: 'SSG', expectedPresetId: 'incheon' },
  { stadiumId: 'DAEGU', stadiumName: '대구 · 삼성 라이온즈파크', stadiumTeam: '삼성', expectedPresetId: 'daegu' },
  { stadiumId: 'DAEJEON', stadiumName: '대전 · 한화생명볼파크', stadiumTeam: '한화', expectedPresetId: 'daejeon' },
  { stadiumId: 'GOCHEOK', stadiumName: '서울 · 고척스카이돔', stadiumTeam: '키움', expectedPresetId: 'gocheok' },
  { stadiumId: 'GWANGJU', stadiumName: '광주 · KIA 챔피언스필드', stadiumTeam: 'KIA', expectedPresetId: 'gwangju' },
  { stadiumId: 'CHANGWON', stadiumName: '창원 · NC파크', stadiumTeam: 'NC', expectedPresetId: 'changwon' },
  { stadiumId: 'SAJIK', stadiumName: '부산 · 사직야구장', stadiumTeam: '롯데', expectedPresetId: 'sajik' },
  { stadiumId: 'SUWON', stadiumName: '수원 · KT위즈파크', stadiumTeam: 'KT', expectedPresetId: 'suwon' },
] as const;

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

export {
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
};
