import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, '..');
const defaultOutDir = path.join(frontendRoot, 'reports/stadium');
const imagePath = path.join(
  frontendRoot,
  'src/assets/stadiums/kiwoom/gocheok-kiwoom-seatmap-official-2026.png',
);

const argValue = (name, fallback) => {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
};

const outDir = path.resolve(frontendRoot, argValue('--out-dir', defaultOutDir));
const reportPath = path.join(outDir, 'gocheok-seatmap-pixel-components.json');

const colorRanges = [
  {
    name: 'TABLE',
    label: '테이블석',
    minArea: 300,
    test: (r, g, b) => r < 105 && g < 125 && b > 30 && b > r + 10 && b > g - 25,
  },
  {
    name: 'DIAMOND',
    label: '다이아몬드석',
    minArea: 80,
    test: (r, g, b) => r >= 150 && r <= 255 && g >= 35 && g <= 155 && b >= 80 && b <= 215,
  },
  {
    name: 'SKY_BLUE',
    label: '스카이블루석',
    minArea: 80,
    test: (r, g, b) => r >= 0 && r <= 125 && g >= 105 && g <= 230 && b >= 115 && b <= 255 && b > r + 35 && g > r + 35,
  },
  {
    name: 'BURGUNDY',
    label: '버건디석',
    minArea: 50,
    test: (r, g, b) => r >= 65 && r <= 225 && g <= 125 && b <= 160 && r > g + 15 && r > b + 10,
  },
  {
    name: 'GOLD',
    label: '골드 내야석',
    minArea: 140,
    test: (r, g, b) => r >= 185 && g >= 105 && g <= 210 && b <= 105,
  },
  {
    name: 'OUTFIELD',
    label: '외야 지정석',
    minArea: 50,
    test: (r, g, b) => r >= 55 && r <= 235 && g >= 85 && g <= 245 && b <= 185 && g > b + 5 && r + b < 385,
  },
];

function paethPredictor(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}

async function decodePng(filePath) {
  const buffer = await fs.readFile(filePath);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') {
    throw new Error(`Not a PNG file: ${filePath}`);
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;

    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
  }

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bitDepth !== 8 || channels === 0 || interlace !== 0) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}`);
  }

  const stride = width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const decoded = Buffer.alloc(width * height * channels);
  let sourceOffset = 0;
  let previous = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + stride));
    sourceOffset += stride;

    for (let index = 0; index < stride; index += 1) {
      const left = index >= channels ? row[index - channels] : 0;
      const up = previous[index];
      const upLeft = index >= channels ? previous[index - channels] : 0;
      if (filter === 1) row[index] = (row[index] + left) & 0xff;
      else if (filter === 2) row[index] = (row[index] + up) & 0xff;
      else if (filter === 3) row[index] = (row[index] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) row[index] = (row[index] + paethPredictor(left, up, upLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`Unsupported PNG row filter: ${filter}`);
    }

    row.copy(decoded, y * stride);
    previous = row;
  }

  return { width, height, channels, data: decoded };
}

function convexHull(points) {
  const sorted = [...new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values()]
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length <= 1) return sorted;

  const cross = (origin, a, b) => (
    (a[0] - origin[0]) * (b[1] - origin[1])
    - (a[1] - origin[1]) * (b[0] - origin[0])
  );
  const lower = [];
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop();
    }
    lower.push(point);
  }

  const upper = [];
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const point = sorted[index];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop();
    }
    upper.push(point);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function connectedComponents(mask, width, height, minArea) {
  const seen = new Uint8Array(width * height);
  const components = [];
  const queue = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || seen[start]) continue;

    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    const boundaryPoints = [];
    queue.length = 0;
    queue.push(start);
    seen[start] = 1;

    while (queue.length > 0) {
      const current = queue.pop();
      const x = current % width;
      const y = Math.floor(current / width);
      area += 1;
      sumX += x;
      sumY += y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);

      const neighbors = [
        x > 0 ? current - 1 : -1,
        x < width - 1 ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y < height - 1 ? current + width : -1,
      ];
      if (neighbors.some((next) => next < 0 || !mask[next])) {
        boundaryPoints.push([x, y]);
      }
      for (const next of neighbors) {
        if (next < 0 || seen[next] || !mask[next]) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }

    if (area >= minArea) {
      components.push({
        area,
        bbox: { minX, minY, maxX, maxY },
        center: {
          x: Number((sumX / area).toFixed(1)),
          y: Number((sumY / area).toFixed(1)),
        },
        hull: convexHull(boundaryPoints),
      });
    }
  }

  components.sort((a, b) => b.area - a.area);
  return components;
}

const image = await decodePng(imagePath);
const report = {
  generatedAt: new Date().toISOString(),
  image: {
    source: path.relative(frontendRoot, imagePath),
    width: image.width,
    height: image.height,
  },
  ranges: {},
};

for (const range of colorRanges) {
  const mask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < image.width * image.height; index += 1) {
    const offset = index * image.channels;
    const r = image.data[offset];
    const g = image.data[offset + 1];
    const b = image.data[offset + 2];
    const a = image.channels === 4 ? image.data[offset + 3] : 255;
    if (a > 200 && range.test(r, g, b)) {
      mask[index] = 1;
    }
  }

  report.ranges[range.name] = {
    label: range.label,
    minArea: range.minArea,
    components: connectedComponents(mask, image.width, image.height, range.minArea).slice(0, 120),
  };
}

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(`pixel_components:${reportPath}`);
